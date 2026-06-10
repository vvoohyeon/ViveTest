'use client';

import {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject} from 'react';

import {getLandingDocumentFontsReady} from '@/features/landing/grid/use-grid-geometry-controller';

import {
  resolveLandingExpandedScale,
  type LandingExpandedScaleDecision,
  type LandingGridTier
} from './layout-plan';
import {resolveVisibleTagPrefix, type TagFitDecision} from './spacing-plan';

const SETTLED_RESIZE_DELAY_MS = 72;

interface InlineMeasurements {
  rowWidth: number;
  tagGap: number;
  rowGap: number;
  intrinsicWidths: number[];
  ctaIntrinsicWidth: number;
}

interface UseCardInlineGeometryInput {
  rowRef: RefObject<HTMLElement | null>;
  probeRef: RefObject<HTMLDivElement | null>;
  tagCount: number;
  requiredVisiblePrefixCount: number;
  ctaVisibility: 'never' | 'always' | 'hover-focus';
}

interface CardInlineGeometry {
  decision: TagFitDecision;
}

interface UseCardExpandedScaleInput {
  rootRef: RefObject<HTMLDivElement | null>;
  viewportTier: LandingGridTier;
  transformOriginX: '0%' | '50%' | '100%';
  reducedMotion: boolean;
}

const EMPTY_DECISION: TagFitDecision = {
  visibleCount: 0,
  tailIndex: null,
  tailMayEllipsize: false
};

function roundMeasurement(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function measurementsEqual(left: InlineMeasurements | null, right: InlineMeasurements): boolean {
  if (
    left === null ||
    left.rowWidth !== right.rowWidth ||
    left.tagGap !== right.tagGap ||
    left.rowGap !== right.rowGap ||
    left.ctaIntrinsicWidth !== right.ctaIntrinsicWidth ||
    left.intrinsicWidths.length !== right.intrinsicWidths.length
  ) {
    return false;
  }

  return left.intrinsicWidths.every((width, index) => width === right.intrinsicWidths[index]);
}

function readContentBoxWidth(element: HTMLElement): number {
  const style = getComputedStyle(element);
  return roundMeasurement(
    element.getBoundingClientRect().width -
      Number.parseFloat(style.paddingLeft || '0') -
      Number.parseFloat(style.paddingRight || '0')
  );
}

function scaleDecisionsEqual(left: LandingExpandedScaleDecision, right: LandingExpandedScaleDecision): boolean {
  return (
    left.baseShellScale === right.baseShellScale &&
    left.desiredFinalScale === right.desiredFinalScale &&
    left.maxSurfaceScale === right.maxSurfaceScale &&
    left.resolvedFinalScale === right.resolvedFinalScale &&
    left.frameInlineScale === right.frameInlineScale
  );
}

export function useCardExpandedScale({
  rootRef,
  viewportTier,
  transformOriginX,
  reducedMotion
}: UseCardExpandedScaleInput): LandingExpandedScaleDecision {
  const [decision, setDecision] = useState(() =>
    resolveLandingExpandedScale({
      viewportTier,
      reducedMotion,
      normalRootWidthPx: 0,
      availableStageOutsetPx: 0
    })
  );
  const frameRef = useRef(0);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const measure = useCallback(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const rootWidth = roundMeasurement(root.getBoundingClientRect().width);
    const stageBleed = roundMeasurement(
      Number.parseFloat(getComputedStyle(root).getPropertyValue('--landing-card-stage-shadow-bleed-x'))
    );
    const availableStageOutsetPx = transformOriginX === '50%' ? stageBleed * 2 : stageBleed;
    const nextDecision = resolveLandingExpandedScale({
      viewportTier,
      reducedMotion,
      normalRootWidthPx: rootWidth,
      availableStageOutsetPx
    });
    setDecision((current) => (scaleDecisionsEqual(current, nextDecision) ? current : nextDecision));
  }, [reducedMotion, rootRef, transformOriginX, viewportTier]);

  const scheduleImmediateMeasure = useCallback(() => {
    if (frameRef.current !== 0) {
      cancelAnimationFrame(frameRef.current);
    }
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      measure();
    });
  }, [measure]);

  const scheduleSettledMeasure = useCallback(() => {
    if (settleTimerRef.current !== null) {
      clearTimeout(settleTimerRef.current);
    }
    settleTimerRef.current = setTimeout(scheduleImmediateMeasure, SETTLED_RESIZE_DELAY_MS);
  }, [scheduleImmediateMeasure]);

  useLayoutEffect(scheduleImmediateMeasure, [scheduleImmediateMeasure]);

  useEffect(() => {
    const root = rootRef.current;
    let disposed = false;
    const resizeObserver =
      root && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleSettledMeasure) : null;
    resizeObserver?.observe(root as Element);
    window.addEventListener('resize', scheduleSettledMeasure, {passive: true});
    void getLandingDocumentFontsReady()?.then(() => {
      if (!disposed) {
        scheduleSettledMeasure();
      }
    });

    return () => {
      disposed = true;
      if (frameRef.current !== 0) {
        cancelAnimationFrame(frameRef.current);
      }
      if (settleTimerRef.current !== null) {
        clearTimeout(settleTimerRef.current);
      }
      resizeObserver?.disconnect();
      window.removeEventListener('resize', scheduleSettledMeasure);
    };
  }, [rootRef, scheduleSettledMeasure]);

  if (reducedMotion) {
    return resolveLandingExpandedScale({
      viewportTier,
      reducedMotion: true,
      normalRootWidthPx: 0,
      availableStageOutsetPx: 0
    });
  }

  return decision;
}

export function useCardInlineGeometry({
  rowRef,
  probeRef,
  tagCount,
  requiredVisiblePrefixCount,
  ctaVisibility
}: UseCardInlineGeometryInput): CardInlineGeometry {
  const [measurements, setMeasurements] = useState<InlineMeasurements | null>(null);
  const [hoverCtaVisible, setHoverCtaVisible] = useState(false);
  const frameRef = useRef(0);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const measurementsRef = useRef<InlineMeasurements | null>(null);

  const measure = useCallback(() => {
    const row = rowRef.current;
    const probe = probeRef.current;
    if (!row || !probe) {
      return;
    }

    const tagList = row.matches('[data-slot="tags"]') ? row : row.querySelector<HTMLElement>('[data-slot="tags"]');
    const ctaProbe = probe.querySelector<HTMLElement>('[data-slot="blogReadMoreProbe"]');
    const nextMeasurements: InlineMeasurements = {
      rowWidth: readContentBoxWidth(row),
      tagGap: roundMeasurement(Number.parseFloat(tagList ? getComputedStyle(tagList).columnGap : '0')),
      rowGap: roundMeasurement(Number.parseFloat(getComputedStyle(row).columnGap)),
      intrinsicWidths: Array.from(probe.querySelectorAll<HTMLElement>('[data-inline-probe-tag]')).map((element) =>
        roundMeasurement(element.getBoundingClientRect().width)
      ),
      ctaIntrinsicWidth: roundMeasurement(ctaProbe?.getBoundingClientRect().width ?? 0)
    };

    if (measurementsEqual(measurementsRef.current, nextMeasurements)) {
      return;
    }

    measurementsRef.current = nextMeasurements;
    setMeasurements(nextMeasurements);
  }, [probeRef, rowRef]);

  const scheduleImmediateMeasure = useCallback(() => {
    if (frameRef.current !== 0) {
      cancelAnimationFrame(frameRef.current);
    }
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      measure();
    });
  }, [measure]);

  const scheduleSettledMeasure = useCallback(() => {
    if (settleTimerRef.current !== null) {
      clearTimeout(settleTimerRef.current);
    }
    settleTimerRef.current = setTimeout(() => {
      settleTimerRef.current = null;
      scheduleImmediateMeasure();
    }, SETTLED_RESIZE_DELAY_MS);
  }, [scheduleImmediateMeasure]);

  useLayoutEffect(() => {
    scheduleImmediateMeasure();
  }, [scheduleImmediateMeasure, tagCount]);

  useEffect(() => {
    const row = rowRef.current;
    let resizeObserver: ResizeObserver | null = null;
    let disposed = false;
    const fonts = document.fonts;
    const handleFontsLoadingDone = () => scheduleSettledMeasure();

    if (row && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(scheduleSettledMeasure);
      resizeObserver.observe(row);
    }
    window.addEventListener('resize', scheduleSettledMeasure, {passive: true});
    void getLandingDocumentFontsReady()?.then(() => {
      if (!disposed) {
        scheduleSettledMeasure();
      }
    });
    fonts?.addEventListener?.('loadingdone', handleFontsLoadingDone);

    return () => {
      disposed = true;
      if (frameRef.current !== 0) {
        cancelAnimationFrame(frameRef.current);
      }
      if (settleTimerRef.current !== null) {
        clearTimeout(settleTimerRef.current);
      }
      resizeObserver?.disconnect();
      window.removeEventListener('resize', scheduleSettledMeasure);
      fonts?.removeEventListener?.('loadingdone', handleFontsLoadingDone);
    };
  }, [rowRef, scheduleSettledMeasure]);

  useEffect(() => {
    if (ctaVisibility !== 'hover-focus') {
      return;
    }

    const root = rowRef.current?.closest<HTMLElement>('[data-testid="landing-grid-card"]');
    if (!root) {
      return;
    }

    const show = () => setHoverCtaVisible(true);
    const hide = (event: FocusEvent | PointerEvent) => {
      if (event.type === 'focusout' && event.relatedTarget instanceof Node && root.contains(event.relatedTarget)) {
        return;
      }
      if (root.matches(':hover') || root.contains(document.activeElement)) {
        return;
      }
      setHoverCtaVisible(false);
    };
    root.addEventListener('pointerenter', show);
    root.addEventListener('pointerleave', hide);
    root.addEventListener('focusin', show);
    root.addEventListener('focusout', hide);

    return () => {
      root.removeEventListener('pointerenter', show);
      root.removeEventListener('pointerleave', hide);
      root.removeEventListener('focusin', show);
      root.removeEventListener('focusout', hide);
    };
  }, [ctaVisibility, rowRef]);

  const ctaVisible = ctaVisibility === 'always' || (ctaVisibility === 'hover-focus' && hoverCtaVisible);
  const decision = useMemo(() => {
    if (!measurements) {
      return requiredVisiblePrefixCount > 0
        ? {
            visibleCount: Math.min(tagCount, requiredVisiblePrefixCount),
            tailIndex: 0,
            tailMayEllipsize: true
          }
        : EMPTY_DECISION;
    }

    const reservedCtaWidth = ctaVisible
      ? measurements.ctaIntrinsicWidth + (measurements.ctaIntrinsicWidth > 0 ? measurements.rowGap : 0)
      : 0;
    return resolveVisibleTagPrefix({
      availableWidth: roundMeasurement(measurements.rowWidth - reservedCtaWidth),
      intrinsicWidths: measurements.intrinsicWidths,
      gap: measurements.tagGap,
      requiredVisiblePrefixCount
    });
  }, [ctaVisible, measurements, requiredVisiblePrefixCount, tagCount]);

  return {
    decision
  };
}
