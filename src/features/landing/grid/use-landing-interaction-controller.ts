import type {MouseEvent as ReactMouseEvent, RefObject} from 'react';
import {useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useState} from 'react';

import {isEnterableCard, type LandingCard} from '@/features/variant-registry';
import {
  resolveDesktopMotionRole,
  resolveDesktopShellPhase
} from '@/features/landing/grid/desktop-shell-phase';
import type {
  LandingCardMobilePhase,
  LandingCardMobileTransientMode,
  LandingCardViewportTier
} from '@/features/landing/grid/landing-grid-card';
import {
  initialLandingMobileLifecycleState,
  reduceLandingMobileLifecycleState,
  type LandingMobileLifecycleState
} from '@/features/landing/grid/mobile-lifecycle';
import type {LandingCardInteractionBindings} from '@/features/landing/grid/landing-card-interaction-bindings';
import {
  initialLandingInteractionState,
  isKeyboardModeBlocked,
  reduceLandingInteractionState,
  resolveCardStateForVariant,
  resolveCardTabIndex,
  resolveVisualState,
  type LandingInteractionState
} from '@/features/landing/model/interaction-state';
import {LANDING_TRANSITION_CLEANUP_EVENT} from '@/features/transition/store';
import {useDesktopMotionController} from '@/features/landing/grid/use-desktop-motion-controller';
import {useHoverIntentController} from '@/features/landing/grid/use-hover-intent-controller';
import {
  useMobileCardLifecycle,
  type MobileBackdropBindings
} from '@/features/landing/grid/use-mobile-card-lifecycle';
import {useKeyboardHandoff} from '@/features/landing/grid/use-keyboard-handoff';

interface UseLandingInteractionControllerInput {
  cards: LandingCard[];
  viewportWidth: number;
  viewportTier: LandingCardViewportTier;
  shellRef: RefObject<HTMLElement | null>;
  onAnswerChoiceSelect?: (card: LandingCard, choice: 'A' | 'B') => boolean | void;
  onPrimaryCtaSelect?: (card: LandingCard) => boolean | void;
}

interface UseLandingInteractionControllerResult {
  interactionMode: 'hover' | 'tap';
  interactionState: LandingInteractionState;
  prefersReducedMotion: boolean;
  mobileLifecycleState: LandingMobileLifecycleState;
  mobileBackdropBindings: MobileBackdropBindings;
  activeVisualCardVariant: string | null;
  mobileRestoreReadyVariant: string | null;
  resolveCardInteractionBindings: (card: LandingCard) => LandingCardInteractionBindings;
  collapseExpandedCard: () => void;
}

export function resolveInteractionMode(viewportWidth: number, hoverCapability: boolean): 'hover' | 'tap' {
  if (viewportWidth < 768) {
    return 'tap';
  }

  return hoverCapability ? 'hover' : 'tap';
}

function resolveInteractionCard(
  target: EventTarget | null,
  cardByVariant: ReadonlyMap<string, LandingCard>
): LandingCard | null {
  if (!(target instanceof Element)) {
    return null;
  }

  const root = target.closest('[data-card-variant]');
  if (!(root instanceof HTMLElement)) {
    return null;
  }

  const variant = root.dataset.cardVariant;
  if (!variant) {
    return null;
  }

  return cardByVariant.get(variant) ?? null;
}

export function useLandingInteractionController({
  cards,
  viewportWidth,
  viewportTier,
  shellRef,
  onAnswerChoiceSelect,
  onPrimaryCtaSelect
}: UseLandingInteractionControllerInput): UseLandingInteractionControllerResult {
  const [hoverCapability, setHoverCapability] = useState<boolean>(false);
  const [interactionState, dispatchInteraction] = useReducer(
    reduceLandingInteractionState,
    initialLandingInteractionState
  );
  const [mobileLifecycleState, dispatchMobileLifecycle] = useReducer(
    reduceLandingMobileLifecycleState,
    initialLandingMobileLifecycleState
  );
  const [transitionSourceCardVariant, setTransitionSourceCardVariant] = useState<string | null>(null);

  const interactionMode = useMemo(
    () => resolveInteractionMode(viewportWidth, hoverCapability),
    [hoverCapability, viewportWidth]
  );
  const cardVariants = useMemo(() => cards.map((card) => card.variant), [cards]);
  const cardByVariant = useMemo<ReadonlyMap<string, LandingCard>>(
    () => new Map(cards.map((card) => [card.variant, card])),
    [cards]
  );
  const firstEnterableCardVariant = useMemo(
    () => cards.find((card) => isEnterableCard(card))?.variant ?? null,
    [cards]
  );
  const enterableCardVariantSet = useMemo(
    () => new Set(cards.filter((card) => isEnterableCard(card)).map((card) => card.variant)),
    [cards]
  );
  const isCardEnterableByVariant = useCallback(
    (cardVariant: string) => enterableCardVariantSet.has(cardVariant),
    [enterableCardVariantSet]
  );
  const isMobileViewport = viewportTier === 'mobile';
  const prefersReducedMotion = interactionState.pageState === 'REDUCED_MOTION';

  const {
    desktopMotionState,
    desktopTransitionReasonRef,
    setDesktopTransitionReason,
    clearDesktopMotionRuntime
  } = useDesktopMotionController({
    expandedCardVariant: interactionState.expandedCardVariant,
    isMobileViewport
  });
  const {clearHoverTimer, recordPointerInput, resolveHoverHandlers} = useHoverIntentController({
    state: interactionState,
    dispatch: dispatchInteraction,
    interactionMode,
    isMobileViewport,
    shellRef,
    setDesktopTransitionReason
  });
  const {
    mobileRestoreReadyVariant,
    mobileTransientShellState,
    mobileBackdropBindings,
    clearMobileTimers,
    resetMobileRuntime,
    beginMobileOpen,
    beginMobileClose,
    beginMobileKeyboardHandoff
  } = useMobileCardLifecycle({
    interactionMode,
    interactionState,
    dispatchInteraction,
    mobileLifecycleState,
    dispatchMobileLifecycle,
    isMobileViewport,
    shellRef,
    clearHoverTimer
  });

  useLayoutEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const query = window.matchMedia('(hover: hover) and (pointer: fine)');

    const syncHoverCapability = () => {
      setHoverCapability(query.matches);
    };

    syncHoverCapability();
    query.addEventListener('change', syncHoverCapability);

    return () => {
      query.removeEventListener('change', syncHoverCapability);
    };
  }, []);

  useLayoutEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const query = window.matchMedia('(prefers-reduced-motion: reduce)');

    const syncReducedMotion = (nowMs: number) => {
      dispatchInteraction({
        type: query.matches ? 'REDUCED_MOTION_ENABLE' : 'REDUCED_MOTION_DISABLE',
        nowMs
      });
    };

    syncReducedMotion(window.performance.now());

    const handleReducedMotionChange = (event: MediaQueryListEvent) => {
      dispatchInteraction({
        type: event.matches ? 'REDUCED_MOTION_ENABLE' : 'REDUCED_MOTION_DISABLE',
        nowMs: event.timeStamp
      });
    };

    query.addEventListener('change', handleReducedMotionChange);
    return () => {
      query.removeEventListener('change', handleReducedMotionChange);
    };
  }, []);

  useEffect(() => {
    dispatchInteraction({
      type: 'MODE_SYNC',
      interactionMode
    });
  }, [interactionMode]);

  useEffect(() => {
    const handleVisibilityChange = (event: Event) => {
      dispatchInteraction({
        type: document.hidden ? 'PAGE_HIDDEN' : 'PAGE_VISIBLE',
        nowMs: event.timeStamp
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    return () => {
      clearHoverTimer();
      clearMobileTimers();
      clearDesktopMotionRuntime();
    };
  }, [
    clearDesktopMotionRuntime,
    clearHoverTimer,
    clearMobileTimers
  ]);

  const collapseExpandedCard = useCallback(() => {
    clearHoverTimer();
    resetMobileRuntime();
    setDesktopTransitionReason('collapse');
    setTransitionSourceCardVariant(null);
    dispatchInteraction({
      type: 'CARD_COLLAPSE',
      nowMs: window.performance.now(),
      interactionMode,
      cardVariant: null
    });
  }, [
    clearHoverTimer,
    interactionMode,
    resetMobileRuntime,
    setDesktopTransitionReason
  ]);

  useEffect(() => {
    const handleTransitionCleanup = () => {
      collapseExpandedCard();
    };

    window.addEventListener(LANDING_TRANSITION_CLEANUP_EVENT, handleTransitionCleanup);
    return () => {
      window.removeEventListener(LANDING_TRANSITION_CLEANUP_EVENT, handleTransitionCleanup);
    };
  }, [collapseExpandedCard]);

  const beginTransition = useCallback((cardVariant: string) => {
    clearHoverTimer();
    resetMobileRuntime();
    setTransitionSourceCardVariant(cardVariant);
    dispatchInteraction({
      type: 'PAGE_TRANSITION_START',
      nowMs: window.performance.now()
    });
  }, [clearHoverTimer, resetMobileRuntime]);

  const {resolveKeyboardHandlers} = useKeyboardHandoff({
    state: interactionState,
    dispatch: dispatchInteraction,
    interactionMode,
    isMobileViewport,
    shellRef,
    cardVariants,
    firstEnterableCardVariant,
    isCardEnterableByVariant,
    mobileLifecycleState,
    beginMobileOpen,
    beginMobileKeyboardHandoff,
    collapseExpandedCard,
    setDesktopTransitionReason
  });

  useEffect(() => {
    const passiveListenerOptions: AddEventListenerOptions = {passive: true};

    const handlePointerMove = (event: PointerEvent) => {
      recordPointerInput(event);
    };

    const handleMouseDown = (event: MouseEvent) => {
      recordPointerInput(event);
    };

    window.addEventListener('pointermove', handlePointerMove, passiveListenerOptions);
    window.addEventListener('mousedown', handleMouseDown, passiveListenerOptions);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove, passiveListenerOptions);
      window.removeEventListener('mousedown', handleMouseDown, passiveListenerOptions);
    };
  }, [recordPointerInput]);

  const handleMobileClose = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      beginMobileClose();
    },
    [beginMobileClose]
  );

  const handleCardClick = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      const card = resolveInteractionCard(event.currentTarget, cardByVariant);
      if (!card) {
        return;
      }

      const cardEnterable = isEnterableCard(card);
      const isTransitioning = interactionState.pageState === 'TRANSITIONING';
      const mobileInteractionLocked =
        isMobileViewport &&
        mobileLifecycleState.phase !== 'NORMAL' &&
        (mobileLifecycleState.cardVariant !== card.variant || mobileLifecycleState.phase !== 'OPEN');
      const activationBlocked = isTransitioning || !cardEnterable || mobileInteractionLocked;

      if (activationBlocked) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (isMobileViewport) {
        if (mobileLifecycleState.phase === 'NORMAL' && mobileLifecycleState.cardVariant !== card.variant) {
          beginMobileOpen(card.variant);
        }
        return;
      }

      desktopTransitionReasonRef.current = 'expand';
      dispatchInteraction({
        type: 'CARD_EXPAND',
        nowMs: event.timeStamp,
        interactionMode,
        cardVariant: card.variant,
        available: cardEnterable
      });
    },
    [
      beginMobileOpen,
      cardByVariant,
      desktopTransitionReasonRef,
      dispatchInteraction,
      interactionMode,
      interactionState.pageState,
      isMobileViewport,
      mobileLifecycleState.cardVariant,
      mobileLifecycleState.phase
    ]
  );

  const handleAnswerChoiceSelect = useCallback(
    (choice: 'A' | 'B', event: ReactMouseEvent<HTMLButtonElement>) => {
      const card = resolveInteractionCard(event.currentTarget, cardByVariant);
      if (!card || card.type !== 'test') {
        return;
      }

      const shouldBeginTransition = onAnswerChoiceSelect?.(card, choice) !== false;
      if (shouldBeginTransition) {
        beginTransition(card.variant);
      }
      event.preventDefault();
    },
    [beginTransition, cardByVariant, onAnswerChoiceSelect]
  );

  const handlePrimaryCtaClick = useCallback(
    (event: ReactMouseEvent<HTMLAnchorElement>) => {
      const card = resolveInteractionCard(event.currentTarget, cardByVariant);
      if (!card || card.type !== 'blog') {
        return;
      }

      const shouldBeginTransition = onPrimaryCtaSelect?.(card) !== false;
      if (shouldBeginTransition) {
        beginTransition(card.variant);
      }
      event.preventDefault();
    },
    [beginTransition, cardByVariant, onPrimaryCtaSelect]
  );

  const resolveCardInteractionBindings = (card: LandingCard): LandingCardInteractionBindings => {
    const isTransitioning = interactionState.pageState === 'TRANSITIONING';
    const cardEnterable = isEnterableCard(card);
    const keyboardModeBlocked = isKeyboardModeBlocked(interactionState, card.variant);
    const cardState = resolveCardStateForVariant(interactionState, card.variant);
    const transitionExpanded =
      isTransitioning &&
      transitionSourceCardVariant === card.variant &&
      cardEnterable;
    const mobileOwnsCard = mobileLifecycleState.cardVariant === card.variant;
    const mobilePhase: LandingCardMobilePhase = mobileOwnsCard ? mobileLifecycleState.phase : 'NORMAL';
    const mobileTransientMode: LandingCardMobileTransientMode =
      mobileTransientShellState.cardVariant === card.variant ? mobileTransientShellState.mode : 'NONE';
    const desktopClosingVisible =
      !isMobileViewport && desktopMotionState.closingCardVariant === card.variant && cardEnterable;
    const desktopCleanupPending =
      !isMobileViewport && desktopMotionState.cleanupPendingCardVariant === card.variant && cardEnterable;
    const desktopMotionRole = resolveDesktopMotionRole({
      cardEnterable,
      cardState,
      cardVariant: card.variant,
      desktopMotionState,
      isMobileViewport,
      transitionExpanded
    });
    const desktopShellPhase = resolveDesktopShellPhase({
      available: cardEnterable,
      isMobileViewport,
      motionRole: desktopMotionRole,
      visuallyExpanded: transitionExpanded || (cardState === 'EXPANDED' && cardEnterable),
      cleanupPending: desktopCleanupPending
    });
    const mobileInteractionLocked =
      isMobileViewport &&
      mobileLifecycleState.phase !== 'NORMAL' &&
      (mobileLifecycleState.cardVariant !== card.variant || mobileLifecycleState.phase !== 'OPEN');
    const visualState = resolveVisualState({
      cardEnterable,
      cardState,
      desktopCleanupPending,
      desktopClosingVisible,
      transitionExpanded
    });
    const mobileSnapshotSource =
      mobileTransientShellState.cardVariant === card.variant && mobileTransientShellState.snapshot
        ? mobileTransientShellState.snapshot
        : mobileOwnsCard
          ? mobileLifecycleState.snapshot
          : null;
    const resolvedRestoreReady =
      mobileRestoreReadyVariant === card.variant || (mobileOwnsCard && mobileLifecycleState.restoreReady);
    const mobileSnapshot = mobileSnapshotSource
      ? {
          cardHeightPx: mobileSnapshotSource.cardHeightPx,
          anchorTopPx: mobileSnapshotSource.anchorTopPx,
          cardLeftPx: mobileSnapshotSource.cardLeftPx,
          cardWidthPx: mobileSnapshotSource.cardWidthPx,
          titleTopPx: mobileSnapshotSource.titleTopPx,
          restoreReady: resolvedRestoreReady
        }
      : null;
    const hoverHandlers = resolveHoverHandlers(card);
    const activationBlocked = isTransitioning || !cardEnterable || mobileInteractionLocked;
    const keyboardHandlers = resolveKeyboardHandlers(card, {
      cardEnterable,
      keyboardActivationBlocked: activationBlocked
    });

    return {
      state: visualState,
      desktopMotionRole,
      desktopShellPhase,
      hoverLockEnabled: interactionState.hoverLock.enabled,
      keyboardMode: interactionState.hoverLock.keyboardMode,
      keyboardModeBlocked,
      interactionBlocked: isTransitioning ? true : mobileInteractionLocked,
      ariaDisabled: isTransitioning ? true : !cardEnterable || mobileInteractionLocked,
      tabIndex: isTransitioning || mobileInteractionLocked ? -1 : resolveCardTabIndex(interactionState, card.variant),
      mobilePhase,
      mobileTransientMode,
      mobileRestoreReady: resolvedRestoreReady,
      mobileSnapshot,
      onFocus: keyboardHandlers.onFocus,
      onKeyDown: keyboardHandlers.onKeyDown,
      onClick: handleCardClick,
      onMouseEnter: hoverHandlers.onMouseEnter,
      onMouseLeave: hoverHandlers.onMouseLeave,
      onExpandedBodyKeyDown: keyboardHandlers.onExpandedBodyKeyDown,
      onAnswerChoiceSelect: handleAnswerChoiceSelect,
      onPrimaryCtaClick: handlePrimaryCtaClick,
      onMobileClose: handleMobileClose
    };
  };

  const activeVisualCardVariant = isMobileViewport
    ? mobileLifecycleState.cardVariant ?? mobileTransientShellState.cardVariant
    : transitionSourceCardVariant ??
      interactionState.expandedCardVariant ??
      desktopMotionState.closingCardVariant ??
      desktopMotionState.cleanupPendingCardVariant;

  return {
    interactionMode,
    interactionState,
    prefersReducedMotion,
    mobileLifecycleState,
    mobileBackdropBindings,
    activeVisualCardVariant,
    mobileRestoreReadyVariant,
    resolveCardInteractionBindings,
    collapseExpandedCard
  };
}
