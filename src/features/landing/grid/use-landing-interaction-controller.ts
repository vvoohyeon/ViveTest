import type {
  MouseEvent as ReactMouseEvent,
  RefObject
} from 'react';
import {useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState} from 'react';

import {isEnterableCard, type LandingCard} from '@/features/variant-registry';
import {
  resolveDesktopMotionRole,
  resolveDesktopShellPhase
} from '@/features/landing/grid/desktop-shell-phase';
import type {
  LandingCardMobilePhase,
  LandingCardViewportTier
} from '@/features/landing/grid/landing-grid-card';
import {
  initialLandingMobileLifecycleState,
  type LandingMobileLifecycleState
} from '@/features/landing/grid/mobile-lifecycle';
import type {LandingCardInteractionBindings} from '@/features/landing/grid/landing-card-interaction-bindings';
import {
  initialLandingInteractionState,
  reduceLandingInteractionState,
  type LandingInteractionState
} from '@/features/landing/model/interaction-state';
import {
  isKeyboardModeBlocked,
  resolveCardStateForVariant,
  resolveCardTabIndex,
  resolveVisualState
} from '@/features/landing/model/interaction-selectors';
import {LANDING_TRANSITION_CLEANUP_EVENT} from '@/features/transition/store';
import {useDesktopMotionController} from '@/features/landing/grid/use-desktop-motion-controller';
import {subscribeToInputProfile} from '@/features/landing/grid/input-profile';
import {useDesktopCardCloseController} from '@/features/landing/grid/use-desktop-card-close-controller';
import {useHoverIntentController} from '@/features/landing/grid/use-hover-intent-controller';
import {useMobileCardLifecycle} from '@/features/landing/grid/use-mobile-card-lifecycle';
import {
  useOverlayBackdropGesture,
  type OverlayBackdropBindings
} from '@/features/landing/grid/use-overlay-backdrop-gesture';
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
  overlayBackdropBindings: OverlayBackdropBindings;
  activeVisualCardVariant: string | null;
  /** 시트가 자기 위상을 여기로 알린다 — `data-mobile-phase` 의 값이 거기서 온다. */
  setMobileLifecycleState: (state: LandingMobileLifecycleState) => void;
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
  // 위상의 정본은 시트다 — 시트가 자기 전이를 세고 여기로 알린다. 두 곳이 같은 전이를 각자
  // 세면 반드시 어긋나므로, 여기서는 받아 적기만 한다.
  const [mobileLifecycleState, setMobileLifecycleState] = useState<LandingMobileLifecycleState>(
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

  const collapseDesktopOverlayRef = useRef<() => void>(() => {});
  const collapseDesktopOverlayStable = useCallback(() => {
    collapseDesktopOverlayRef.current();
  }, []);

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
    shellRef,
    setDesktopTransitionReason
  });
  const {beginMobileOpen, beginMobileClose, beginMobileKeyboardHandoff} = useMobileCardLifecycle({
    interactionMode,
    dispatchInteraction,
    shellRef,
    clearHoverTimer
  });
  const overlayBackdropBindings = useOverlayBackdropGesture({
    // 닫는 법만 입력이 정한다(명세 규칙 3) — 형태는 폭이 갖는다.
    usesTouchCloseAffordance: interactionMode !== 'hover',
    rendersInPlaceOverlay: !isMobileViewport,
    expandedCardVariant: interactionState.expandedCardVariant,
    // `collapseExpandedCard` 는 훅 사슬상 아래에 정의된다. 순서를 뒤집는 대신 ref 를 통해
    // 안정 콜백으로 넘긴다 — 값은 매 렌더마다 갱신되고 신원은 바뀌지 않는다.
    collapseOverlay: collapseDesktopOverlayStable
  });

  // 입력 축의 정의처는 `input-profile.ts` 한 곳이다 — 질의 문자열을 여기 다시 적지 않는다.
  useLayoutEffect(() => subscribeToInputProfile(setHoverCapability), []);

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
      clearDesktopMotionRuntime();
    };
  }, [clearDesktopMotionRuntime, clearHoverTimer]);

  const collapseExpandedCard = useCallback(() => {
    clearHoverTimer();
    setDesktopTransitionReason('collapse');
    setTransitionSourceCardVariant(null);
    dispatchInteraction({
      type: 'CARD_COLLAPSE',
      nowMs: window.performance.now(),
      interactionMode,
      cardVariant: null
    });
  }, [clearHoverTimer, interactionMode, setDesktopTransitionReason]);

  // backdrop 의 「빈 곳 탭」이 부를 수 있도록 최신 구현을 ref 에 둔다(위의 안정 콜백이 읽는다).
  // 렌더 중 ref 쓰기는 금지이므로 effect 로 미룬다 — 첫 페인트 전에 탭이 도달할 수는 없다.
  useEffect(() => {
    collapseDesktopOverlayRef.current = collapseExpandedCard;
  }, [collapseExpandedCard]);

  const {focusCardFromKeyboard, handleCardKeyDown, handleCardBlur} =
    useDesktopCardCloseController({
      interactionMode,
      isMobileViewport,
      shellRef,
      beginMobileClose,
      focusedCardVariant: interactionState.focusedCardVariant,
      expandedCardVariant: interactionState.expandedCardVariant,
      dispatchInteraction,
      cancelPendingHoverIntent,
      setDesktopTransitionReason,
      setTransitionSourceCardVariant
    });

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
    setTransitionSourceCardVariant(cardVariant);
    dispatchInteraction({
      type: 'PAGE_TRANSITION_START',
      nowMs: window.performance.now()
    });
  }, [clearHoverTimer]);

  const {resolveKeyboardHandlers} = useKeyboardHandoff({
    state: interactionState,
    dispatch: dispatchInteraction,
    interactionMode,
    isMobileViewport,
    shellRef,
    cardVariants,
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
      onCardKeyDown: (event) => handleCardKeyDown(card, event),
      onCardBlur: (event) => handleCardBlur(card, event),
      onFocus: keyboardHandlers.onFocus,
      onKeyDown: keyboardHandlers.onKeyDown,
      onClick: handleCardClick,
      onMouseEnter: hoverHandlers.onMouseEnter,
      onMouseLeave: hoverHandlers.onMouseLeave,
      onExpandedBodyKeyDown: keyboardHandlers.onExpandedBodyKeyDown,
      onAnswerChoiceSelect: handleAnswerChoiceSelect,
      onOverlayClose: collapseDesktopOverlayStable
    };
  };

  const activeVisualCardVariant = isMobileViewport
    ? mobileLifecycleState.cardVariant
    : transitionSourceCardVariant ??
      interactionState.expandedCardVariant ??
      desktopMotionState.closingCardVariant ??
      desktopMotionState.cleanupPendingCardVariant;

  return {
    interactionMode,
    interactionState,
    prefersReducedMotion,
    mobileLifecycleState,
    overlayBackdropBindings,
    activeVisualCardVariant,
    setMobileLifecycleState,
    resolveCardInteractionBindings,
    collapseExpandedCard
  };
}
