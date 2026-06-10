import type {MutableRefObject, RefObject} from 'react';
import {useEffect, useLayoutEffect, useReducer, useRef, useState} from 'react';

import type {LandingCard} from '@/features/variant-registry';
import type {LandingCardSpacingContract} from '@/features/landing/grid/landing-grid-card';
import {
  captureRestingFloor,
  clearRestingFloor,
  emptyRestingFloorMap,
  freezeBaselineRows,
  initialLandingBaselineState,
  releaseBaselineRows,
  type BaselineSnapshot,
  type LandingBaselineState,
  type RestingFloorMap
} from '@/features/landing/grid/baseline-manager';
import type {
  LandingGridColumnMode,
  LandingGridPlan
} from '@/features/landing/grid/layout-plan';
import type {LandingMobileExpandedPhase} from '@/features/landing/grid/mobile-lifecycle';
import {
  buildRowCompensationModel,
  deriveNaturalHeightFromGeometry,
  LANDING_CARD_BASE_GAP_PX
} from '@/features/landing/grid/spacing-plan';

export const LANDING_GRID_PLAN_CHANGED_EVENT = 'landing:grid-plan-changed';

// allow closing animation frame to settle before releasing frozen rows
const BASELINE_RELEASE_DELAY_MS = 32;

type CardSpacingMap = Record<string, LandingCardSpacingContract>;
let landingDocumentFontsReadyPromise: Promise<FontFaceSet> | null = null;

export function getLandingDocumentFontsReady(): Promise<FontFaceSet> | null {
  if (typeof document === 'undefined' || !document.fonts) {
    return null;
  }

  landingDocumentFontsReadyPromise ??= document.fonts.ready;
  return landingDocumentFontsReadyPromise;
}

interface UseGridGeometryControllerInput {
  cards: LandingCard[];
  shellRef: RefObject<HTMLElement | null>;
  previousPlanKeyRef: MutableRefObject<string | null>;
  previousColumnModeRef: MutableRefObject<LandingGridColumnMode | null>;
  plan: LandingGridPlan;
  viewportWidth: number;
  mobileLifecyclePhase: LandingMobileExpandedPhase;
  activeVisualCardVariant: string | null;
  collapseExpandedCard: () => void;
}

interface UseGridGeometryControllerOutput {
  spacingModel: CardSpacingMap;
  baselineState: LandingBaselineState;
  restingFloorMap: RestingFloorMap;
}

type BaselineAction =
  | {type: 'FREEZE'; activeCardVariant: string; snapshots: readonly BaselineSnapshot[]}
  | {type: 'RELEASE'};

function baselineReducer(state: LandingBaselineState, action: BaselineAction): LandingBaselineState {
  switch (action.type) {
    case 'FREEZE':
      if (state.phase === 'BASELINE_READY') {
        return freezeBaselineRows({
          state,
          activeCardVariant: action.activeCardVariant,
          snapshots: action.snapshots
        });
      }
      if (state.activeCardVariant === action.activeCardVariant) return state;
      return {...state, activeCardVariant: action.activeCardVariant};
    case 'RELEASE':
      return releaseBaselineRows();
    default:
      return state;
  }
}

function captureBaselineSnapshots(shellElement: HTMLElement, rowIndexes: readonly number[]): BaselineSnapshot[] {
  return rowIndexes.flatMap((rowIndex) => {
    const rowElement = shellElement.querySelector<HTMLElement>(`[data-row-index="${rowIndex}"]`);
    if (!rowElement) {
      return [];
    }

    const rect = rowElement.getBoundingClientRect();
    return [
      {
        rowId: `row-${rowIndex}`,
        top: rect.top,
        bottom: rect.bottom,
        height: rect.height
      }
    ];
  });
}

function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= 0.5;
}

function isSameSpacingModel(a: CardSpacingMap, b: CardSpacingMap): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) {
    return false;
  }

  for (const key of aKeys) {
    const left = a[key];
    const right = b[key];

    if (!right) {
      return false;
    }

    if (
      !nearlyEqual(left.baseGapPx, right.baseGapPx) ||
      !nearlyEqual(left.compGapPx, right.compGapPx) ||
      left.needsComp !== right.needsComp ||
      !nearlyEqual(left.naturalHeightPx, right.naturalHeightPx) ||
      !nearlyEqual(left.rowMaxNaturalHeightPx, right.rowMaxNaturalHeightPx)
    ) {
      return false;
    }
  }

  return true;
}

function serializePlanKey(plan: LandingGridPlan): string {
  return [
    plan.tier,
    plan.columnMode,
    plan.row1Columns,
    plan.rowNColumns,
    plan.rows.map((row) => `${row.columns}-${row.cardCount}`).join('|')
  ].join(':');
}

function roundMeasurement(value: number): number {
  return Math.round(Number.isFinite(value) ? value : 0);
}

export function useGridGeometryController(input: UseGridGeometryControllerInput): UseGridGeometryControllerOutput {
  const {
    cards,
    shellRef,
    previousPlanKeyRef,
    previousColumnModeRef,
    plan,
    viewportWidth,
    mobileLifecyclePhase,
    activeVisualCardVariant,
    collapseExpandedCard
  } = input;
  const [spacingModel, setSpacingModel] = useState<CardSpacingMap>({});
  const [baselineState, dispatchBaseline] = useReducer(baselineReducer, initialLandingBaselineState);
  const [restingFloorMap, setRestingFloorMap] = useState<RestingFloorMap>(emptyRestingFloorMap);
  const baselineReleaseTimerRef = useRef<number>(0);

  useLayoutEffect(() => {
    const measurementSuspended =
      mobileLifecyclePhase !== 'NORMAL' ||
      (plan.tier !== 'mobile' && (activeVisualCardVariant !== null || baselineState.phase !== 'BASELINE_READY'));
    if (measurementSuspended) {
      return;
    }

    let frame = 0;
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    const measure = () => {
      if (cancelled) {
        return;
      }

      const shell = shellRef.current;
      if (!shell) {
        return;
      }

      setSpacingModel((previous) => {
        const nextSpacingModel: CardSpacingMap = {...previous};

        for (const row of plan.rows) {
          const rowCards = cards.slice(row.startIndex, row.endIndex);
          if (rowCards.length === 0) {
            continue;
          }

          const rowElement = shell.querySelector<HTMLElement>(`[data-row-index="${row.rowIndex}"]`);
          if (!rowElement) {
            continue;
          }

          const cardElementByVariant = new Map<string, HTMLElement>();
          for (const element of rowElement.querySelectorAll<HTMLElement>('[data-testid="landing-grid-card"]')) {
            const cardVariant = element.dataset.cardVariant;
            if (cardVariant) {
              cardElementByVariant.set(cardVariant, element);
            }
          }

          const rowMeasurements = rowCards.map((card) => {
            const cardElement = cardElementByVariant.get(card.variant);
            const cardContentElement = cardElement?.querySelector<HTMLElement>('.landing-grid-card-content');
            const tagsElement = cardContentElement?.querySelector<HTMLElement>('[data-slot="tags"]');
            if (!cardElement || !cardContentElement || !tagsElement) {
              return null;
            }

            const contentRect = cardContentElement.getBoundingClientRect();
            const tagsRect = tagsElement.getBoundingClientRect();
            const measurement = deriveNaturalHeightFromGeometry({
              cardVariant: card.variant,
              contentTop: contentRect.top,
              tagsBottom: tagsRect.bottom,
              appliedCompGap: Number.parseFloat(cardElement.dataset.compGap ?? '0') || 0
            });
            return {
              ...measurement,
              naturalHeight: roundMeasurement(measurement.naturalHeight)
            };
          });

          if (rowMeasurements.some((measurement) => measurement === null)) {
            continue;
          }

          const completeMeasurements = rowMeasurements.filter(
            (measurement): measurement is {cardVariant: string; naturalHeight: number} => measurement !== null
          );
          for (const decision of buildRowCompensationModel(completeMeasurements)) {
            nextSpacingModel[decision.cardVariant] = {
              baseGapPx: LANDING_CARD_BASE_GAP_PX,
              compGapPx: roundMeasurement(decision.compGap),
              needsComp: decision.needsComp,
              naturalHeightPx: roundMeasurement(decision.naturalHeight),
              rowMaxNaturalHeightPx: roundMeasurement(decision.rowMaxNaturalHeight)
            };
          }
        }

        for (const card of cards) {
          nextSpacingModel[card.variant] ??= {
            baseGapPx: LANDING_CARD_BASE_GAP_PX,
            compGapPx: 0,
            needsComp: false,
            naturalHeightPx: 0,
            rowMaxNaturalHeightPx: 0
          };
        }

        return isSameSpacingModel(previous, nextSpacingModel) ? previous : nextSpacingModel;
      });
    };

    const scheduleMeasure = () => {
      if (cancelled || frame !== 0) {
        return;
      }

      frame = window.requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };

    scheduleMeasure();

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(scheduleMeasure);
      const shell = shellRef.current;
      if (shell) {
        for (const cardElement of shell.querySelectorAll<HTMLElement>('[data-testid="landing-grid-card"]')) {
          resizeObserver.observe(cardElement);
          const contentElement = cardElement.querySelector<HTMLElement>('.landing-grid-card-content');
          if (contentElement) {
            resizeObserver.observe(contentElement);
          }
        }
      }
    }

    window.addEventListener('resize', scheduleMeasure, {passive: true});
    const fontSet = typeof document !== 'undefined' ? document.fonts : undefined;
    const handleFontsLoaded = () => {
      scheduleMeasure();
    };
    fontSet?.addEventListener?.('loadingdone', handleFontsLoaded);
    void getLandingDocumentFontsReady()?.then(scheduleMeasure);

    return () => {
      cancelled = true;
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
      resizeObserver?.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
      fontSet?.removeEventListener?.('loadingdone', handleFontsLoaded);
    };
  }, [
    activeVisualCardVariant,
    baselineState.phase,
    cards,
    mobileLifecyclePhase,
    plan,
    shellRef,
    viewportWidth // viewportWidth is intentionally listed as a deps re-trigger signal even though it is not read in the effect body.
  ]);

  // Expanded height floor (BQ-24): capture the active card's resting outer height in explicit
  // pixels. The placeholder stays in-flow at the stretched row-max height during expansion, so
  // its offsetHeight is the floor. Measured in a layout effect (before first paint) so the
  // expanded body never paints shorter than the resting cell. This is intentionally separate
  // from the freeze/release effect below; it must not alter the BASELINE_READY/FROZEN order.
  useLayoutEffect(() => {
    if (plan.tier === 'mobile' || !activeVisualCardVariant) {
      setRestingFloorMap((previous) => (previous === emptyRestingFloorMap ? previous : clearRestingFloor()));
      return;
    }

    const shell = shellRef.current;
    if (!shell) {
      return;
    }

    const activeCardElement = shell.querySelector<HTMLElement>(
      `[data-testid="landing-grid-card"][data-card-variant="${activeVisualCardVariant}"]`
    );
    if (!activeCardElement) {
      return;
    }

    const restingOuterPx = activeCardElement.offsetHeight;
    setRestingFloorMap((previous) => captureRestingFloor(previous, activeVisualCardVariant, restingOuterPx));
  }, [activeVisualCardVariant, plan.tier, shellRef]);

  useEffect(() => {
    let frameId = 0;
    const clearTimer = () => {
      if (baselineReleaseTimerRef.current !== 0) {
        window.clearTimeout(baselineReleaseTimerRef.current);
        baselineReleaseTimerRef.current = 0;
      }
    };
    const dispatchViaRaf = (action: BaselineAction) => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        dispatchBaseline(action);
      });
    };
    const cleanup = () => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
      clearTimer();
    };

    if (plan.tier === 'mobile') {
      clearTimer();
      dispatchViaRaf({type: 'RELEASE'});
      return cleanup;
    }

    if (activeVisualCardVariant) {
      clearTimer();
      const shell = shellRef.current;
      if (!shell) {
        return cleanup;
      }

      const snapshots = captureBaselineSnapshots(
        shell,
        plan.rows.map((row) => row.rowIndex)
      );
      dispatchViaRaf({
        type: 'FREEZE',
        activeCardVariant: activeVisualCardVariant,
        snapshots
      });
      return cleanup;
    }

    if (baselineReleaseTimerRef.current === 0) {
      baselineReleaseTimerRef.current = window.setTimeout(() => {
        baselineReleaseTimerRef.current = 0;
        dispatchBaseline({type: 'RELEASE'});
      }, BASELINE_RELEASE_DELAY_MS);
    }

    return cleanup;
  }, [activeVisualCardVariant, plan.rows, plan.tier, shellRef]);

  useEffect(() => {
    const nextPlanKey = serializePlanKey(plan);

    if (
      previousPlanKeyRef.current &&
      previousPlanKeyRef.current !== nextPlanKey &&
      typeof window !== 'undefined'
    ) {
      if (plan.tier !== 'mobile' && activeVisualCardVariant) {
        collapseExpandedCard();
      }

      window.dispatchEvent(
        new CustomEvent(LANDING_GRID_PLAN_CHANGED_EVENT, {
          detail: {
            previousPlanKey: previousPlanKeyRef.current,
            nextPlanKey,
            previousColumnMode: previousColumnModeRef.current,
            nextColumnMode: plan.columnMode
          }
        })
      );
    }

    previousPlanKeyRef.current = nextPlanKey;
    previousColumnModeRef.current = plan.columnMode;
  }, [
    activeVisualCardVariant,
    collapseExpandedCard,
    plan,
    previousColumnModeRef,
    previousPlanKeyRef
  ]);

  return {
    spacingModel,
    baselineState,
    restingFloorMap
  };
}
