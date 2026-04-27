'use client';

import {
  type CSSProperties,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import {useLocale, useTranslations} from 'next-intl';

import {defaultLocale, isLocale} from '@/config/site';
import type {LandingCard} from '@/features/variant-registry';
import {LandingGridCard} from '@/features/landing/grid/landing-grid-card';
import {
  buildLandingGridPlan,
  CONTAINER_MAX_WIDTH,
  resolveLandingViewportTier,
  TABLET_DESKTOP_SIDE_PADDING,
  type LandingGridColumnMode
} from '@/features/landing/grid/layout-plan';
import {resolveDesktopTransformOriginX} from '@/features/landing/grid/hover-intent';
import {useLandingInteractionController} from '@/features/landing/grid/use-landing-interaction-controller';
import {useGridGeometryController} from '@/features/landing/grid/use-grid-geometry-controller';
import {useLandingTransition} from '@/features/landing/transition/use-landing-transition';

const INITIAL_VIEWPORT_WIDTH = 1280;
const INITIAL_GRID_INLINE_SIZE = CONTAINER_MAX_WIDTH - TABLET_DESKTOP_SIDE_PADDING * 2;
const LANDING_GRID_MOBILE_BACKDROP_CLASSNAME =
  'landing-grid-mobile-backdrop fixed inset-0 z-10 bg-[var(--overlay-scrim-medium)] touch-pan-y [transition:opacity_180ms_ease] data-[state=CLOSING]:opacity-0';

export {LANDING_GRID_PLAN_CHANGED_EVENT} from '@/features/landing/grid/use-grid-geometry-controller';

interface LandingCatalogGridProps {
  cards: LandingCard[];
  assetBackedVariants: ReadonlyArray<string>;
}

function measureGridInlineSize(containerElement: HTMLDivElement | null): number {
  return Math.max(0, Math.floor(containerElement?.clientWidth ?? 0));
}

export function LandingCatalogGrid({cards, assetBackedVariants}: LandingCatalogGridProps) {
  const previousPlanKeyRef = useRef<string | null>(null);
  const previousColumnModeRef = useRef<LandingGridColumnMode | null>(null);
  const shellRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const localeFromContext = useLocale();
  const t = useTranslations('landing');
  const locale = isLocale(localeFromContext) ? localeFromContext : defaultLocale;

  const [viewportWidth, setViewportWidth] = useState<number>(INITIAL_VIEWPORT_WIDTH);
  const [gridInlineSize, setGridInlineSize] = useState<number>(INITIAL_GRID_INLINE_SIZE);
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
  const {spacingModel, baselineState} = useGridGeometryController({
    cards,
    shellRef,
    containerRef,
    previousPlanKeyRef,
    previousColumnModeRef,
    plan,
    viewportWidth,
    activeVisualCardVariant,
    collapseExpandedCard
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
