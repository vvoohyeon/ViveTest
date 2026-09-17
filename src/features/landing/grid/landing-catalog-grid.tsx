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
import {BACKDROP_MOTION_DURATION_MS} from '@/features/landing/grid/use-overlay-backdrop-gesture';
import {LandingCardSheet} from '@/features/landing/grid/landing-card-sheet';
import {useLandingInteractionController} from '@/features/landing/grid/use-landing-interaction-controller';
import {useGridGeometryController} from '@/features/landing/grid/use-grid-geometry-controller';
import {useLandingTransition} from '@/features/transition/use-landing-transition';
import gridStyles from '@/features/landing/grid/landing-catalog-grid.module.css';

const INITIAL_VIEWPORT_WIDTH = 1280;
const INITIAL_GRID_INLINE_SIZE = CONTAINER_MAX_WIDTH - TABLET_DESKTOP_SIDE_PADDING * 2;
// 모션은 `landing-catalog-grid.module.css` 의 `.backdrop` 이 갖는다 — 등장·소멸이 대칭이어야
// 하고, 그 대칭은 상태 셋(`OPENING`/`CLOSING`/`EXITING`)에 걸쳐 있어 유틸리티 한 줄로 적히지
// 않는다.
const LANDING_GRID_OVERLAY_BACKDROP_CLASSNAME =
  'landing-grid-mobile-backdrop fixed inset-0 z-10 bg-[var(--overlay-scrim-medium)] touch-pan-y';

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
    overlayBackdropBindings,
    activeVisualCardVariant,
    setMobileLifecycleState,
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
  const {spacingModel, baselineState, restingFloorMap} = useGridGeometryController({
    cards,
    shellRef,
    previousPlanKeyRef,
    previousColumnModeRef,
    plan,
    viewportWidth,
    mobileLifecyclePhase: mobileLifecycleState.phase,
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

  // 시트가 여는 카드. 확장은 test 카드에서만 일어나므로 타입까지 여기서 좁힌다 — 시트가
  // 다시 판정하면 두 곳이 같은 조건을 각자 갖게 된다.
  const sheetCardCandidate = interactionState.expandedCardVariant
    ? cards.find((card) => card.variant === interactionState.expandedCardVariant)
    : undefined;
  const sheetCard =
    sheetCardCandidate && sheetCardCandidate.type === 'test' ? sheetCardCandidate : null;
  const sheetBindings = sheetCard ? resolveCardInteractionBindings(sheetCard) : null;

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

  // The container ships `data-measured="false"` in the SSR HTML — a constant, so the
  // initial render stays deterministic (§11.1) — and the first layout pass flips it.
  // The flip is written straight to the DOM rather than held in React state: the
  // attribute is an external system this effect synchronises, and routing it through
  // `setState` would cost a cascading render on every landing mount for a value that
  // never changes again.
  useLayoutEffect(() => {
    containerRef.current?.setAttribute('data-measured', 'true');
  }, []);

  return (
    <section
      ref={shellRef}
      className={`landing-grid-shell relative pb-5 ${gridStyles.shell}`}
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
      data-interaction-expanded-card-variant={interactionState.expandedCardVariant ?? ''}
      data-active-visual-card-variant={activeVisualCardVariant ?? ''}
      data-mobile-phase={mobileLifecycleState.phase}
      data-baseline-phase={baselineState.phase}
      data-baseline-active-card-variant={baselineState.activeCardVariant ?? ''}
      data-baseline-frozen-rows={[...baselineState.snapshots.keys()].join(',')}
    >
      {overlayBackdropBindings.active ? (
        <div
          className={`${LANDING_GRID_OVERLAY_BACKDROP_CLASSNAME} ${gridStyles.backdrop}`}
          data-testid="landing-grid-mobile-backdrop"
          data-state={overlayBackdropBindings.state}
          style={{'--landing-backdrop-motion-ms': `${BACKDROP_MOTION_DURATION_MS}ms`} as CSSProperties}
          onPointerDown={overlayBackdropBindings.onPointerDown}
          onPointerMove={overlayBackdropBindings.onPointerMove}
          onPointerUp={overlayBackdropBindings.onPointerUp}
          onPointerCancel={overlayBackdropBindings.onPointerCancel}
        />
      ) : null}
      {/* 폰의 확장은 흐름 밖의 시트 **하나**다 — 카드마다 표면을 두지 않는다. 열려 있는 카드가
          누구인지는 상호작용 상태가 알고, 위상은 시트가 여기로 알린다. */}
      {plan.tier === 'mobile' ? (
        <LandingCardSheet
          card={sheetCard}
          locale={locale}
          copy={cardCopy}
          open={sheetCard !== null}
          reducedMotion={prefersReducedMotion}
          onCloseRequest={collapseExpandedCard}
          onStateChange={setMobileLifecycleState}
          onExpandedBodyKeyDown={sheetBindings?.onExpandedBodyKeyDown}
          onAnswerChoiceSelect={sheetBindings?.onAnswerChoiceSelect}
        />
      ) : null}
      <div
        ref={containerRef}
        className={`landing-grid-container relative grid gap-[15px] md:gap-5 xl:gap-6 ${gridStyles.container}`}
        data-measured="false"
        data-testid="landing-grid-container"
      >
        {plan.rows.map((row) => {
          const rowSnapshot = baselineState.snapshots.get(`row-${row.rowIndex}`);

          return (
            <div
              key={row.rowIndex}
              className="landing-grid-row grid items-stretch gap-[15px] md:gap-5 xl:gap-6 [grid-template-columns:repeat(var(--landing-grid-columns),minmax(0,1fr))]"
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
                    desktopMotionRole={interactionBindings.desktopMotionRole}
                    desktopShellPhase={interactionBindings.desktopShellPhase}
                    reducedMotion={prefersReducedMotion}
                    desktopTransformOriginX={resolveDesktopTransformOriginX({
                      cardOffset: offset,
                      rowCardCount: row.cardCount
                    })}
                    spacing={spacingModel[card.variant]}
                    expandedRestingFloorPx={restingFloorMap.get(card.variant)}
                    sequence={sequence}
                    copy={cardCopy}
                    hoverLockEnabled={interactionBindings.hoverLockEnabled}
                    keyboardMode={interactionBindings.keyboardMode}
                    interactionBlocked={interactionBindings.interactionBlocked}
                    keyboardModeBlocked={interactionBindings.keyboardModeBlocked}
                    ariaDisabled={interactionBindings.ariaDisabled}
                    tabIndex={interactionBindings.tabIndex}
                    onCardKeyDown={interactionBindings.onCardKeyDown}
                    onCardBlur={interactionBindings.onCardBlur}
                    onFocus={interactionBindings.onFocus}
                    onKeyDown={interactionBindings.onKeyDown}
                    onClick={interactionBindings.onClick}
                    onMouseEnter={interactionBindings.onMouseEnter}
                    onMouseLeave={interactionBindings.onMouseLeave}
                    onExpandedBodyKeyDown={interactionBindings.onExpandedBodyKeyDown}
                    onAnswerChoiceSelect={interactionBindings.onAnswerChoiceSelect}
                    onOverlayClose={interactionBindings.onOverlayClose}
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
