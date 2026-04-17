'use client';

import {
  type CSSProperties,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import {useLocale, useTranslations} from 'next-intl';

import {defaultLocale, isLocale} from '@/config/site';
import type {LandingCard} from '@/features/variant-registry';
import {type LandingCardSpacingContract, LandingGridCard} from '@/features/landing/grid/landing-grid-card';
import {
  freezeBaselineRows,
  initialLandingBaselineState,
  markBaselineRestorePending,
  releaseBaselineRows,
  type LandingBaselineState
} from '@/features/landing/grid/baseline-manager';
import {
  buildLandingGridPlan,
  CONTAINER_MAX_WIDTH,
  resolveLandingViewportTier,
  TABLET_DESKTOP_SIDE_PADDING,
  type LandingGridColumnMode
} from '@/features/landing/grid/layout-plan';
import {
  buildRowCompensationModel,
  deriveNaturalHeightFromGeometry,
  LANDING_CARD_BASE_GAP_PX
} from '@/features/landing/grid/spacing-plan';
import {resolveDesktopTransformOriginX} from '@/features/landing/grid/hover-intent';
import {useLandingInteractionController} from '@/features/landing/grid/use-landing-interaction-controller';
import {useLandingTransition} from '@/features/landing/transition/use-landing-transition';

const INITIAL_VIEWPORT_WIDTH = 1280;
const INITIAL_GRID_INLINE_SIZE = CONTAINER_MAX_WIDTH - TABLET_DESKTOP_SIDE_PADDING * 2;
const LANDING_GRID_MOBILE_BACKDROP_CLASSNAME =
  'landing-grid-mobile-backdrop fixed inset-0 z-10 bg-[var(--overlay-scrim-medium)] touch-pan-y [transition:opacity_180ms_ease] data-[state=CLOSING]:opacity-0';

export const LANDING_GRID_PLAN_CHANGED_EVENT = 'landing:grid-plan-changed';

interface LandingCatalogGridProps {
  cards: LandingCard[];
  assetBackedVariants: ReadonlyArray<string>;
}

type CardSpacingMap = Record<string, LandingCardSpacingContract>;

function captureBaselineSnapshots(shellElement: HTMLElement, rowIndexes: readonly number[]) {
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

function measureGridInlineSize(containerElement: HTMLDivElement | null): number {
  return Math.max(0, Math.floor(containerElement?.clientWidth ?? 0));
}

export function LandingCatalogGrid({cards, assetBackedVariants}: LandingCatalogGridProps) {
  const previousPlanKeyRef = useRef<string | null>(null);
  const previousColumnModeRef = useRef<LandingGridColumnMode | null>(null);
  const shellRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const baselineReleaseTimerRef = useRef<number | null>(null);
  const localeFromContext = useLocale();
  const t = useTranslations('landing');
  const locale = isLocale(localeFromContext) ? localeFromContext : defaultLocale;

  const [viewportWidth, setViewportWidth] = useState<number>(INITIAL_VIEWPORT_WIDTH);
  const [gridInlineSize, setGridInlineSize] = useState<number>(INITIAL_GRID_INLINE_SIZE);
  const [spacingModel, setSpacingModel] = useState<CardSpacingMap>({});
  const [baselineState, setBaselineState] = useState(initialLandingBaselineState);
  const viewportTier = useMemo(() => resolveLandingViewportTier(viewportWidth), [viewportWidth]);
  const plan = useMemo(
    () =>
      buildLandingGridPlan({
        viewportTier,
        gridInlineSize,
        cardCount: cards.length
      }),
    [cards.length, gridInlineSize, viewportTier]
  );
  const assetBackedVariantSet = useMemo(() => new Set(assetBackedVariants), [assetBackedVariants]);
  const {beginBlogTransition, beginTestTransition} = useLandingTransition({locale});
  const {
    interactionMode,
    interactionState,
    prefersReducedMotion,
    mobileLifecycleState,
    mobileBackdropBindings,
    activeVisualCardVariant,
    mobileRestoreReadyVariant,
    resolveCardInteractionBindings,
    collapseExpandedCard
  } = useLandingInteractionController({
    cards,
    viewportWidth,
    viewportTier: plan.tier,
    shellRef,
    onAnswerChoiceSelect: (card, choice) => {
      if (card.type !== 'test') {
        return false;
      }

      return beginTestTransition(card, choice);
    },
    onPrimaryCtaSelect: (card) => {
      if (card.type !== 'blog') {
        return false;
      }

      return beginBlogTransition(card);
    }
  });
  const cardCopy = {
    comingSoon: t('comingSoon'),
    close: t('close'),
    closeExpandedAria: t('closeExpandedAria'),
    metaEstimated: t('metaEstimated'),
    metaShares: t('metaShares'),
    metaAttempts: t('metaAttempts'),
    metaReadTime: t('metaReadTime'),
    metaViews: t('metaViews'),
    readMore: t('readMore')
  };

  useLayoutEffect(() => {
    let frame = 0;
    let resizeObserver: ResizeObserver | null = null;

    const syncLayoutMetrics = () => {
      const nextViewportWidth = window.innerWidth;
      const nextGridInlineSize = measureGridInlineSize(containerRef.current);
      setViewportWidth((previous) => (previous === nextViewportWidth ? previous : nextViewportWidth));
      setGridInlineSize((previous) =>
        previous === nextGridInlineSize || nextGridInlineSize === 0 ? previous : nextGridInlineSize
      );
    };

    const scheduleSync = () => {
      if (frame !== 0) {
        return;
      }

      frame = window.requestAnimationFrame(() => {
        frame = 0;
        syncLayoutMetrics();
      });
    };

    syncLayoutMetrics();

    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        scheduleSync();
      });
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', scheduleSync, {passive: true});

    return () => {
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
      resizeObserver?.disconnect();
      window.removeEventListener('resize', scheduleSync);
    };
  }, []);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (plan.tier !== 'mobile' && activeVisualCardVariant) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const shell = shellRef.current;
      if (!shell) {
        return;
      }

      const nextSpacingModel: CardSpacingMap = {};

      for (const row of plan.rows) {
        const rowCards = cards.slice(row.startIndex, row.endIndex);
        if (rowCards.length === 0) {
          continue;
        }

        const rowElement = shell.querySelector<HTMLElement>(`[data-row-index="${row.rowIndex}"]`);
        if (!rowElement) {
          continue;
        }

        const cardElements = Array.from(rowElement.querySelectorAll<HTMLElement>('[data-testid="landing-grid-card"]'));
        const cardElementByVariant = new Map<string, HTMLElement>();
        for (const element of cardElements) {
          const cardVariant = element.dataset.cardVariant;
          if (cardVariant) {
            cardElementByVariant.set(cardVariant, element);
          }
        }

        const rowMeasurements = rowCards
          .map((card) => {
            const cardElement = cardElementByVariant.get(card.variant);
            if (!cardElement) {
              return null;
            }

            const cardContentElement = cardElement.querySelector<HTMLElement>('.landing-grid-card-content');
            if (!cardContentElement) {
              return null;
            }

            const tagsElement = cardContentElement.querySelector<HTMLElement>('[data-slot="tags"]');
            if (!tagsElement) {
              return null;
            }

            const appliedCompGap = Number.parseFloat(cardElement.dataset.compGap ?? '0') || 0;
            const contentRect = cardContentElement.getBoundingClientRect();
            const tagsRect = tagsElement.getBoundingClientRect();

            return deriveNaturalHeightFromGeometry({
              cardVariant: card.variant,
              contentTop: contentRect.top,
              tagsBottom: tagsRect.bottom,
              appliedCompGap
            });
          })
          .filter((measurement): measurement is {cardVariant: string; naturalHeight: number} => measurement !== null);

        const rowCompensation = buildRowCompensationModel(rowMeasurements);
        for (const decision of rowCompensation) {
          nextSpacingModel[decision.cardVariant] = {
            baseGapPx: LANDING_CARD_BASE_GAP_PX,
            compGapPx: decision.compGap,
            needsComp: decision.needsComp,
            naturalHeightPx: decision.naturalHeight,
            rowMaxNaturalHeightPx: decision.rowMaxNaturalHeight
          };
        }
      }

      for (const card of cards) {
        if (nextSpacingModel[card.variant]) {
          continue;
        }

        nextSpacingModel[card.variant] = {
          baseGapPx: LANDING_CARD_BASE_GAP_PX,
          compGapPx: 0,
          needsComp: false,
          naturalHeightPx: 0,
          rowMaxNaturalHeightPx: 0
        };
      }

      setSpacingModel((previous) => (isSameSpacingModel(previous, nextSpacingModel) ? previous : nextSpacingModel));
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [activeVisualCardVariant, cards, plan, viewportWidth]);

  useEffect(() => {
    const clearBaselineReleaseTimer = () => {
      if (baselineReleaseTimerRef.current !== null) {
        window.clearTimeout(baselineReleaseTimerRef.current);
        baselineReleaseTimerRef.current = null;
      }
    };
    let frame = 0;
    const scheduleBaselineState = (updater: LandingBaselineState | ((previous: LandingBaselineState) => LandingBaselineState)) => {
      frame = window.requestAnimationFrame(() => {
        setBaselineState(updater);
      });
    };
    const cleanup = () => {
      clearBaselineReleaseTimer();
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
    };

    if (typeof window === 'undefined') {
      return;
    }

    if (plan.tier === 'mobile') {
      clearBaselineReleaseTimer();
      scheduleBaselineState((previous) => (previous.phase === 'BASELINE_READY' ? previous : releaseBaselineRows()));
      return cleanup;
    }

    if (activeVisualCardVariant) {
      clearBaselineReleaseTimer();
      const shell = shellRef.current;
      if (!shell) {
        return;
      }

      const snapshots = captureBaselineSnapshots(
        shell,
        plan.rows.map((row) => row.rowIndex)
      );
      scheduleBaselineState((previous) =>
        previous.phase === 'BASELINE_READY'
          ? freezeBaselineRows({
              state: previous,
              activeCardVariant: activeVisualCardVariant,
              snapshots
            })
          : previous.activeCardVariant === activeVisualCardVariant
            ? previous
            : {
                ...previous,
                activeCardVariant: activeVisualCardVariant
              }
      );
      return cleanup;
    }

    if (baselineState.phase === 'BASELINE_READY') {
      clearBaselineReleaseTimer();
      return;
    }

    if (baselineState.phase === 'BASELINE_FROZEN') {
      scheduleBaselineState((previous) => markBaselineRestorePending(previous));
    }

    if (baselineReleaseTimerRef.current === null) {
      baselineReleaseTimerRef.current = window.setTimeout(() => {
        baselineReleaseTimerRef.current = null;
        setBaselineState(releaseBaselineRows());
      }, 32);
    }

    return cleanup;
  }, [activeVisualCardVariant, baselineState.phase, plan.rows, plan.tier]);

  useEffect(
    () => () => {
      if (baselineReleaseTimerRef.current !== null) {
        window.clearTimeout(baselineReleaseTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    const nextPlanKey = `${plan.tier}:${plan.columnMode}:${plan.row1Columns}:${plan.rowNColumns}:${plan.rows
      .map((row) => `${row.columns}-${row.cardCount}`)
      .join('|')}`;

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
  }, [activeVisualCardVariant, collapseExpandedCard, plan]);

  return (
    <section
      ref={shellRef}
      className="landing-grid-shell relative pb-5"
      aria-label="Landing Catalog Grid"
      data-testid="landing-grid-shell"
      data-grid-tier={plan.tier}
      data-grid-column-mode={plan.columnMode}
      data-grid-inline-size={plan.gridInlineSize}
      data-row1-columns={plan.row1Columns}
      data-rown-columns={plan.rowNColumns}
      data-page-state={interactionState.pageState}
      data-active-ramp={interactionState.activeRampUntilMs !== null ? 'true' : 'false'}
      data-hover-lock-enabled={interactionState.hoverLock.enabled ? 'true' : 'false'}
      data-hover-lock-card-variant={interactionState.hoverLock.cardVariant ?? ''}
      data-keyboard-mode={interactionState.hoverLock.keyboardMode ? 'true' : 'false'}
      data-mobile-phase={mobileLifecycleState.phase}
      data-mobile-restore-ready-card-variant={mobileRestoreReadyVariant ?? ''}
      data-baseline-phase={baselineState.phase}
      data-baseline-active-card-variant={baselineState.activeCardVariant ?? ''}
      data-baseline-frozen-rows={baselineState.frozenRows.join(',')}
    >
      {mobileBackdropBindings.active ? (
        <div
          className={LANDING_GRID_MOBILE_BACKDROP_CLASSNAME}
          data-testid="landing-grid-mobile-backdrop"
          data-state={mobileBackdropBindings.state}
          onPointerDown={mobileBackdropBindings.onPointerDown}
          onPointerMove={mobileBackdropBindings.onPointerMove}
          onPointerUp={mobileBackdropBindings.onPointerUp}
          onPointerCancel={mobileBackdropBindings.onPointerCancel}
        />
      ) : null}
      <div
        ref={containerRef}
        className="landing-grid-container relative grid gap-[15px] md:gap-4"
        data-testid="landing-grid-container"
      >
        {plan.rows.map((row) => {
          const rowSnapshot = baselineState.snapshots.get(`row-${row.rowIndex}`);

          return (
            <div
              key={row.rowIndex}
              className="landing-grid-row grid items-stretch gap-[15px] md:gap-4 [grid-template-columns:repeat(var(--landing-grid-columns),minmax(0,1fr))]"
              data-testid={`landing-grid-row-${row.rowIndex}`}
              data-row-index={row.rowIndex}
              data-row-role={row.role}
              data-columns={row.columns}
              data-card-count={row.cardCount}
              data-underfilled={row.isUnderfilled ? 'true' : 'false'}
              data-baseline-top={rowSnapshot?.top}
              data-baseline-bottom={rowSnapshot?.bottom}
              data-baseline-height={rowSnapshot?.height}
              style={{'--landing-grid-columns': String(row.columns)} as CSSProperties}
            >
              {cards.slice(row.startIndex, row.endIndex).map((card, offset) => {
                const sequence = row.startIndex + offset;
                const interactionBindings = resolveCardInteractionBindings(card);

                return (
                  <LandingGridCard
                    key={card.variant}
                    card={card}
                    hasAssetMedia={assetBackedVariantSet.has(card.variant)}
                    state={interactionBindings.state}
                    locale={locale}
                    interactionMode={interactionMode}
                    viewportTier={plan.tier}
                    mobilePhase={interactionBindings.mobilePhase}
                    mobileTransientMode={interactionBindings.mobileTransientMode}
                    mobileRestoreReady={interactionBindings.mobileRestoreReady}
                    desktopMotionRole={interactionBindings.desktopMotionRole}
                    desktopShellPhase={interactionBindings.desktopShellPhase}
                    desktopShellInlineScale={row.expandedShellInlineScale}
                    reducedMotion={prefersReducedMotion}
                    mobileSnapshot={interactionBindings.mobileSnapshot}
                    desktopTransformOriginX={resolveDesktopTransformOriginX({
                      cardOffset: offset,
                      rowCardCount: row.cardCount
                    })}
                    spacing={spacingModel[card.variant]}
                    sequence={sequence}
                    copy={cardCopy}
                    hoverLockEnabled={interactionBindings.hoverLockEnabled}
                    keyboardMode={interactionBindings.keyboardMode}
                    interactionBlocked={interactionBindings.interactionBlocked}
                    ariaDisabled={interactionBindings.ariaDisabled}
                    tabIndex={interactionBindings.tabIndex}
                    onFocus={interactionBindings.onFocus}
                    onKeyDown={interactionBindings.onKeyDown}
                    onClick={interactionBindings.onClick}
                    onMouseEnter={interactionBindings.onMouseEnter}
                    onMouseLeave={interactionBindings.onMouseLeave}
                    onExpandedBodyKeyDown={interactionBindings.onExpandedBodyKeyDown}
                    onAnswerChoiceSelect={interactionBindings.onAnswerChoiceSelect}
                    onPrimaryCtaClick={interactionBindings.onPrimaryCtaClick}
                    onMobileClose={interactionBindings.onMobileClose}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}
