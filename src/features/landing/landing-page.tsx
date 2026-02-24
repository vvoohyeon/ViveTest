'use client';

import {useLocale, useTranslations} from 'next-intl';
import {useRouter} from '@/i18n/navigation';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {CatalogCardView} from '@/features/landing/components/catalog-card';
import {SiteHeader} from '@/features/landing/components/site-header';
import {
  getCatalogCards,
  getCatalogLayoutConfig,
  splitHeroAndMainCards
} from '@/features/landing/data/landing-adapter';
import {
  clearPendingTransition,
  getOrCreateSessionId,
  getPendingTransition,
  rollbackPreAnswer,
  savePreAnswer,
  setLandingIngressFlag,
  setPendingTransition
} from '@/features/landing/session-state';
import {useContainerWidth} from '@/features/landing/hooks/use-container-width';
import {useInteractionMode} from '@/features/landing/hooks/use-interaction-mode';
import {usePageState} from '@/features/landing/hooks/use-page-state';
import {useTelemetry} from '@/features/telemetry/telemetry-provider';
import type {CatalogCard} from '@/features/landing/types';
import {lockBodyScroll, unlockBodyScroll} from '@/lib/body-lock';
import {
  buildBlogRouteWithSource,
  buildTestQuestionRoute,
  hasDuplicateLocaleSegment,
  withLocalePrefix,
  type SupportedLocale
} from '@/lib/route-builder';
import styles from './landing-page.module.css';

const ROUTE_TIMEOUT_MS = 4500;
const TRANSITION_PUSH_DELAY_MS = 180;
const MOBILE_CLOSE_UNLOCK_MS = 240;

function getOrigin(index: number, columns: number): '0%' | '50%' | '100%' {
  if (columns <= 1) {
    return '50%';
  }

  const columnIndex = index % columns;

  if (columnIndex === 0) {
    return '0%';
  }

  if (columnIndex === columns - 1) {
    return '100%';
  }

  return '50%';
}

function createTransitionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.floor(Math.random() * 100_000)}`;
}

export function LandingPage() {
  const t = useTranslations('landing');
  const locale = useLocale() as SupportedLocale;
  const router = useRouter();
  const {emit} = useTelemetry();

  const cards = useMemo(() => getCatalogCards(), []);
  const capability = useInteractionMode();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const containerWidth = useContainerWidth(containerRef);
  const layout = useMemo(() => getCatalogLayoutConfig(containerWidth || capability.width), [capability.width, containerWidth]);
  const {heroCards, mainCards} = useMemo(
    () => splitHeroAndMainCards(cards, layout.heroCount),
    [cards, layout.heroCount]
  );

  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [unavailableOverlayCardId, setUnavailableOverlayCardId] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [mobileClosing, setMobileClosing] = useState(false);
  const routeTimeoutRef = useRef<number | null>(null);

  const cardElementsRef = useRef<Record<string, HTMLElement | null>>({});
  const [normalHeights, setNormalHeights] = useState<Record<string, number>>({});

  const pageState = usePageState(transitioning);

  const hoverLockTargetId =
    capability.mode === 'HOVER_MODE' && capability.width >= 768
      ? expandedCardId ?? unavailableOverlayCardId
      : null;

  const lockOthers = Boolean(hoverLockTargetId);

  useEffect(() => {
    getOrCreateSessionId();
    emit('landing_view');
  }, [emit]);

  useEffect(() => {
    const stalePending = getPendingTransition();

    if (!stalePending) {
      return;
    }

    if (Date.now() - stalePending.startedAt < 350) {
      return;
    }

    emit('transition_cancel', {
      transitionId: stalePending.transitionId,
      reason: 'stale_on_landing_return'
    });

    if (stalePending.type === 'test' && stalePending.variant) {
      rollbackPreAnswer(stalePending.variant, stalePending.transitionId);
    }

    clearPendingTransition();
  }, [emit]);

  useEffect(() => {
    if (capability.width >= 768 || !expandedCardId) {
      return;
    }

    lockBodyScroll();

    return () => {
      unlockBodyScroll();
    };
  }, [capability.width, expandedCardId]);

  useEffect(() => {
    if (capability.width < 768) {
      setUnavailableOverlayCardId(null);
    }
  }, [capability.width]);

  useEffect(() => {
    if (capability.width < 768 || expandedCardId) {
      return;
    }

    const nextHeights: Record<string, number> = {};

    const measure = () => {
      cards.forEach((card) => {
        const element = cardElementsRef.current[card.id];
        if (!element) {
          return;
        }

        nextHeights[card.id] = Math.ceil(element.getBoundingClientRect().height);
      });

      setNormalHeights(nextHeights);
    };

    const raf = window.requestAnimationFrame(measure);

    return () => window.cancelAnimationFrame(raf);
  }, [cards, capability.width, expandedCardId, layout.heroColumns, layout.mainColumns]);

  useEffect(() => {
    return () => {
      if (routeTimeoutRef.current) {
        window.clearTimeout(routeTimeoutRef.current);
      }
      unlockBodyScroll({force: true});
    };
  }, []);

  const closeExpandedMobileCard = useCallback(() => {
    if (capability.width >= 768 || !expandedCardId) {
      setExpandedCardId(null);
      return;
    }

    setMobileClosing(true);

    window.setTimeout(() => {
      setExpandedCardId(null);
      setMobileClosing(false);
      unlockBodyScroll();
    }, MOBILE_CLOSE_UNLOCK_MS);
  }, [capability.width, expandedCardId]);

  const onExpandCard = useCallback(
    (cardId: string) => {
      if (transitioning || pageState === 'INACTIVE') {
        return;
      }

      setUnavailableOverlayCardId(null);
      setExpandedCardId(cardId);
    },
    [pageState, transitioning]
  );

  const onCollapseCard = useCallback(
    (cardId: string) => {
      if (expandedCardId !== cardId) {
        return;
      }

      if (capability.width < 768) {
        closeExpandedMobileCard();
        return;
      }

      setExpandedCardId(null);
    },
    [capability.width, closeExpandedMobileCard, expandedCardId]
  );

  const onUnavailableActiveChange = useCallback(
    (cardId: string, active: boolean) => {
      if (capability.mode !== 'HOVER_MODE' || capability.width < 768) {
        return;
      }

      if (active) {
        setExpandedCardId(null);
        setUnavailableOverlayCardId(cardId);
        return;
      }

      setUnavailableOverlayCardId((prev) => (prev === cardId ? null : prev));
    },
    [capability.mode, capability.width]
  );

  const failTransition = useCallback(
    (params: {transitionId: string; reason: 'locale_duplicate' | 'route_entry_timeout' | 'navigation_error'; variant?: string}) => {
      if (routeTimeoutRef.current) {
        window.clearTimeout(routeTimeoutRef.current);
        routeTimeoutRef.current = null;
      }

      emit('transition_fail', {
        transitionId: params.transitionId,
        reason: params.reason
      });

      if (params.variant) {
        rollbackPreAnswer(params.variant, params.transitionId);
      }

      clearPendingTransition();
      setTransitioning(false);
      unlockBodyScroll({force: true});
    },
    [emit]
  );

  const beginTransition = useCallback(
    (target: {
      type: 'test' | 'blog';
      cardId: string;
      variant?: string;
      answer?: 'A' | 'B';
    }) => {
      if (transitioning || pageState === 'INACTIVE') {
        return;
      }

      const transitionId = createTransitionId();

      let pathname = '/';
      const href =
        target.type === 'test'
          ? buildTestQuestionRoute(target.variant ?? '')
          : buildBlogRouteWithSource(target.cardId);

      if (typeof href === 'string') {
        pathname = href;
      } else {
        pathname = href.pathname;
      }

      const prefixed = withLocalePrefix(locale, pathname);

      if (hasDuplicateLocaleSegment(prefixed)) {
        failTransition({
          transitionId,
          reason: 'locale_duplicate',
          variant: target.variant
        });
        return;
      }

      if (target.type === 'test' && target.variant && target.answer) {
        savePreAnswer({
          variant: target.variant,
          answer: target.answer,
          transitionId
        });
        setLandingIngressFlag(target.variant);
      }

      setPendingTransition({
        transitionId,
        startedAt: Date.now(),
        type: target.type,
        cardId: target.cardId,
        variant: target.variant,
        answer: target.answer,
        path: pathname
      });

      emit('transition_start', {
        transitionId,
        targetType: target.type,
        cardId: target.cardId
      });

      setTransitioning(true);
      lockBodyScroll();

      if (routeTimeoutRef.current) {
        window.clearTimeout(routeTimeoutRef.current);
      }

      routeTimeoutRef.current = window.setTimeout(() => {
        const pending = getPendingTransition();
        if (!pending || pending.transitionId !== transitionId) {
          return;
        }

        failTransition({
          transitionId,
          reason: 'route_entry_timeout',
          variant: target.variant
        });
      }, ROUTE_TIMEOUT_MS);

      window.setTimeout(() => {
        try {
          router.push(href as never);
        } catch {
          failTransition({
            transitionId,
            reason: 'navigation_error',
            variant: target.variant
          });
        }
      }, TRANSITION_PUSH_DELAY_MS);
    },
    [emit, failTransition, locale, pageState, router, transitioning]
  );

  const onTriggerTestChoice = useCallback(
    (card: Extract<CatalogCard, {type: 'test'}>, answer: 'A' | 'B') => {
      beginTransition({
        type: 'test',
        cardId: card.id,
        variant: card.variant,
        answer
      });
    },
    [beginTransition]
  );

  const onTriggerBlogReadMore = useCallback(
    (card: Extract<CatalogCard, {type: 'blog'}>) => {
      beginTransition({
        type: 'blog',
        cardId: card.id
      });
    },
    [beginTransition]
  );

  const renderCard = (card: CatalogCard, index: number, columns: number) => {
    const isUnavailable = card.availability === 'unavailable';
    const isExpanded = !isUnavailable && expandedCardId === card.id;

    const tapModeOverlayVisible = capability.mode === 'TAP_MODE' || capability.width < 768;
    const showUnavailableOverlay = isUnavailable
      ? tapModeOverlayVisible
        ? true
        : unavailableOverlayCardId === card.id
      : false;

    const shouldDisableByHoverLock =
      lockOthers &&
      capability.mode === 'HOVER_MODE' &&
      capability.width >= 768 &&
      hoverLockTargetId !== card.id;

    return (
      <CatalogCardView
        key={card.id}
        card={card}
        isExpanded={isExpanded}
        shouldDisableByHoverLock={shouldDisableByHoverLock}
        showUnavailableOverlay={showUnavailableOverlay}
        interactionMode={capability.mode}
        pageState={pageState}
        isMobile={capability.width < 768}
        transformOriginX={getOrigin(index, columns)}
        holdNormalHeightPx={
          capability.width >= 768 && expandedCardId && card.id !== expandedCardId
            ? normalHeights[card.id]
            : undefined
        }
        onExpand={onExpandCard}
        onCollapse={onCollapseCard}
        onUnavailableActiveChange={onUnavailableActiveChange}
        onTriggerTestChoice={onTriggerTestChoice}
        onTriggerBlogReadMore={onTriggerBlogReadMore}
        onRegisterElement={(cardId, element) => {
          cardElementsRef.current[cardId] = element;
        }}
      />
    );
  };

  return (
    <div className={styles.page}>
      <SiteHeader context="landing" capability={capability} disableInteractions={transitioning} />

      <main className={styles.container} ref={containerRef}>
        <div className={styles.content}>
          <section className={styles.heroInfo} aria-label="Hero">
            <h1 className={styles.heroTitle} data-display>
              {t('title')}
            </h1>
            <p className={styles.heroSubtitle}>{t('subtitle')}</p>
          </section>

          {heroCards.length > 0 ? (
            <section
              className={styles.grid}
              style={{
                gridTemplateColumns: `repeat(${layout.heroColumns}, minmax(0, 1fr))`,
                gap: `${layout.gridGap}px`
              }}
              aria-label="Hero cards"
            >
              {heroCards.map((card, index) => renderCard(card, index, layout.heroColumns))}
            </section>
          ) : null}

          <section
            className={styles.grid}
            style={{
              gridTemplateColumns: `repeat(${layout.mainColumns}, minmax(0, 1fr))`,
              gap: `${layout.gridGap}px`
            }}
            aria-label="Main cards"
          >
            {mainCards.map((card, index) => renderCard(card, index, layout.mainColumns))}
          </section>
        </div>
      </main>

      {capability.width < 768 && (expandedCardId || mobileClosing) ? (
        <button
          type="button"
          className={styles.mobileBackdrop}
          onClick={closeExpandedMobileCard}
          aria-label="Close expanded card"
        />
      ) : null}

      {transitioning ? <div className={styles.transitionOverlay} aria-hidden /> : null}
    </div>
  );
}
