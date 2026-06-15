import type {
  FocusEvent as ReactFocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  RefObject
} from 'react';
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
  resolveKeyboardFocusDisposition,
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
import {
  focusCardByVariant,
  hasOpenHigherPriorityOverlay,
  isCardFocusExit,
  queueFocusCardByVariant
} from '@/features/landing/grid/interaction-dom';

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

function isModifiedBlogActivation(event: ReactMouseEvent<HTMLElement>): boolean {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
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
  const expandableCardVariantSet = useMemo(
    () =>
      new Set(
        cards
          .filter((card) => card.type === 'test' && isEnterableCard(card))
          .map((card) => card.variant)
      ),
    [cards]
  );
  const isCardEnterableByVariant = useCallback(
    (cardVariant: string) => enterableCardVariantSet.has(cardVariant),
    [enterableCardVariantSet]
  );
  const isCardExpandableByVariant = useCallback(
    (cardVariant: string) => expandableCardVariantSet.has(cardVariant),
    [expandableCardVariantSet]
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
  const {
    clearHoverTimer,
    cancelPendingHoverIntent,
    recordPointerInput,
    resolveHoverHandlers
  } = useHoverIntentController({
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

  const closeDesktopCard = useCallback(
    (input: {
      sourceCardVariant: string;
      reason: 'collapse' | 'handoff';
      focusDisposition: 'return-trigger' | 'preserve-destination';
      nowMs: number;
    }) => {
      if (isMobileViewport) {
        return;
      }

      const sourceOwnsInteraction =
        interactionState.focusedCardVariant === input.sourceCardVariant ||
        interactionState.expandedCardVariant === input.sourceCardVariant;
      if (!sourceOwnsInteraction) {
        return;
      }

      cancelPendingHoverIntent();
      if (input.focusDisposition === 'return-trigger') {
        focusCardByVariant(shellRef.current, input.sourceCardVariant);
      }
      setDesktopTransitionReason(input.reason);
      setTransitionSourceCardVariant(null);
      dispatchInteraction({
        type: 'CARD_COLLAPSE',
        nowMs: input.nowMs,
        interactionMode,
        cardVariant: input.sourceCardVariant
      });
      if (input.focusDisposition === 'return-trigger') {
        queueFocusCardByVariant(shellRef.current, input.sourceCardVariant);
      }
    },
    [
      cancelPendingHoverIntent,
      interactionMode,
      interactionState.expandedCardVariant,
      interactionState.focusedCardVariant,
      isMobileViewport,
      setDesktopTransitionReason,
      shellRef
    ]
  );

  const focusCardFromKeyboard = useCallback(
    (input: {
      cardVariant: string;
      cardEnterable: boolean;
      cardExpandable: boolean;
      nowMs: number;
    }) => {
      cancelPendingHoverIntent();
      const disposition = resolveKeyboardFocusDisposition({
        isMobileViewport,
        cardEnterable: input.cardEnterable,
        cardExpandable: input.cardExpandable
      });

      if (disposition === 'preserve-mobile') {
        dispatchInteraction({
          type: 'CARD_FOCUS',
          nowMs: input.nowMs,
          interactionMode,
          cardVariant: input.cardVariant,
          available: input.cardEnterable
        });
        return;
      }

      if (
        disposition === 'expand' &&
        interactionState.focusedCardVariant === input.cardVariant &&
        interactionState.expandedCardVariant === input.cardVariant
      ) {
        return;
      }

      if (
        disposition === 'focus-only' &&
        interactionState.focusedCardVariant === input.cardVariant &&
        interactionState.expandedCardVariant === null
      ) {
        return;
      }

      const previousExpandedCardVariant = interactionState.expandedCardVariant;
      if (previousExpandedCardVariant && previousExpandedCardVariant !== input.cardVariant) {
        closeDesktopCard({
          sourceCardVariant: previousExpandedCardVariant,
          reason: disposition === 'expand' ? 'handoff' : 'collapse',
          focusDisposition: 'preserve-destination',
          nowMs: input.nowMs,
        });
      } else if (disposition === 'expand') {
        setDesktopTransitionReason('expand');
      }

      dispatchInteraction(
        disposition === 'expand'
          ? {
              type: 'CARD_EXPAND',
              nowMs: input.nowMs,
              interactionMode,
              cardVariant: input.cardVariant,
              available: input.cardEnterable
            }
          : {
              type: 'CARD_FOCUS',
              nowMs: input.nowMs,
              interactionMode,
              cardVariant: input.cardVariant,
              available: false
            }
      );
    },
    [
      cancelPendingHoverIntent,
      closeDesktopCard,
      interactionMode,
      interactionState.expandedCardVariant,
      interactionState.focusedCardVariant,
      isMobileViewport,
      setDesktopTransitionReason
    ]
  );

  const handleCardKeyDown = useCallback(
    (card: LandingCard, event: ReactKeyboardEvent<HTMLElement>) => {
      if (
        isMobileViewport ||
        card.type !== 'test' ||
        !isEnterableCard(card) ||
        event.key !== 'Escape' ||
        event.defaultPrevented ||
        hasOpenHigherPriorityOverlay(event.currentTarget.ownerDocument)
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      closeDesktopCard({
        sourceCardVariant: card.variant,
        reason: 'collapse',
        focusDisposition: 'return-trigger',
        nowMs: event.timeStamp
      });
    },
    [closeDesktopCard, isMobileViewport]
  );

  const handleCardBlur = useCallback(
    (card: LandingCard, event: ReactFocusEvent<HTMLElement>) => {
      if (isMobileViewport || card.type !== 'test' || !isEnterableCard(card)) {
        return;
      }

      const ownerDocument = event.currentTarget.ownerDocument;
      if (event.relatedTarget === null && !ownerDocument.hasFocus()) {
        return;
      }

      if (!isCardFocusExit(event.currentTarget, event.relatedTarget)) {
        return;
      }

      closeDesktopCard({
        sourceCardVariant: card.variant,
        reason: 'collapse',
        focusDisposition: 'preserve-destination',
        nowMs: event.timeStamp
      });
    },
    [closeDesktopCard, isMobileViewport]
  );

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
    isCardExpandableByVariant,
    focusCardFromKeyboard,
    mobileLifecycleState,
    beginMobileOpen,
    beginMobileKeyboardHandoff,
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

      if (card.type === 'blog') {
        if (isModifiedBlogActivation(event)) {
          return;
        }

        const shouldBeginTransition = onPrimaryCtaSelect?.(card) !== false;
        if (shouldBeginTransition) {
          beginTransition(card.variant);
        }
        event.preventDefault();
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
      beginTransition,
      cardByVariant,
      desktopTransitionReasonRef,
      dispatchInteraction,
      interactionMode,
      interactionState.pageState,
      isMobileViewport,
      mobileLifecycleState.cardVariant,
      mobileLifecycleState.phase,
      onPrimaryCtaSelect
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
      tabIndex: isTransitioning || mobileInteractionLocked ? -1 : resolveCardTabIndex(interactionState, card.variant, cardEnterable),
      mobilePhase,
      mobileTransientMode,
      mobileRestoreReady: resolvedRestoreReady,
      mobileSnapshot,
      onCardKeyDown: (event) => handleCardKeyDown(card, event),
      onCardBlur: (event) => handleCardBlur(card, event),
      onFocus: keyboardHandlers.onFocus,
      onKeyDown: keyboardHandlers.onKeyDown,
      onClick: handleCardClick,
      onMouseEnter: hoverHandlers.onMouseEnter,
      onMouseLeave: hoverHandlers.onMouseLeave,
      onExpandedBodyKeyDown: keyboardHandlers.onExpandedBodyKeyDown,
      onAnswerChoiceSelect: handleAnswerChoiceSelect,
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
