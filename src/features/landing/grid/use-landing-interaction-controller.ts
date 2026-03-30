import type {
  FocusEvent as ReactFocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  RefObject
} from 'react';
import {useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState} from 'react';

import {isEnterableCard, type LandingCard} from '@/features/landing/data';
import {
  resolveDesktopShellPhase,
  type LandingCardDesktopMotionRole,
  type LandingCardDesktopShellPhase
} from '@/features/landing/grid/desktop-shell-phase';
import type {
  LandingCardMobilePhase,
  LandingCardMobileTransientMode,
  LandingCardViewportTier,
  LandingCardVisualState,
  LandingMobileSnapshotView
} from '@/features/landing/grid/landing-grid-card';
import {
  CORE_MOTION_DURATION_MS,
  DESKTOP_COLLAPSE_DELAY_MS,
  DESKTOP_EXPAND_DELAY_MS,
  isEnterableHandoffCandidate,
  nextHoverIntentToken,
  type HoverIntentAction
} from '@/features/landing/grid/hover-intent';
import {
  initialLandingMobileLifecycleState,
  MOBILE_EXPANDED_DURATION_MS,
  reduceLandingMobileLifecycleState,
  type LandingMobileLifecycleState
} from '@/features/landing/grid/mobile-lifecycle';
import {
  initialLandingInteractionState,
  isCardKeyboardAriaDisabled,
  isCardPointerInteractionBlocked,
  reduceLandingInteractionState,
  resolveCardStateForId,
  resolveCardTabIndex,
  type LandingInteractionState
} from '@/features/landing/model/interaction-state';
import {LANDING_TRANSITION_CLEANUP_EVENT} from '@/features/landing/transition/store';

const MOBILE_OUTSIDE_SCROLL_THRESHOLD_PX = 10;
const MOBILE_RESTORE_READY_MARKER_MS = 400;

const initialMobileTransientShellState: MobileTransientShellState = {
  mode: 'NONE',
  cardId: null,
  snapshot: null
};

export interface LandingCardInteractionBindings {
  state: LandingCardVisualState;
  desktopMotionRole: LandingCardDesktopMotionRole;
  desktopShellPhase: LandingCardDesktopShellPhase;
  tabIndex: number;
  ariaDisabled: boolean;
  interactionBlocked: boolean;
  hoverLockEnabled: boolean;
  keyboardMode: boolean;
  mobilePhase: LandingCardMobilePhase;
  mobileTransientMode: LandingCardMobileTransientMode;
  mobileRestoreReady: boolean;
  mobileSnapshot: LandingMobileSnapshotView | null;
  onFocus: (event: ReactFocusEvent<HTMLElement>) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
  onClick: (event: ReactMouseEvent<HTMLElement>) => void;
  onMouseEnter: (event: ReactMouseEvent<HTMLElement>) => void;
  onMouseLeave: (event: ReactMouseEvent<HTMLElement>) => void;
  onExpandedBodyKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
  onAnswerChoiceSelect: (choice: 'A' | 'B', event: ReactMouseEvent<HTMLButtonElement>) => void;
  onPrimaryCtaClick: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
  onMobileClose: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}

interface OutsideGesture {
  active: boolean;
  startX: number;
  startY: number;
  closeOnPointerUp: boolean;
}

interface MobileBackdropBindings {
  active: boolean;
  state: LandingCardMobilePhase | 'HIDDEN';
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
}

interface MobileTransientShellState {
  mode: LandingCardMobileTransientMode;
  cardId: string | null;
  snapshot: LandingMobileLifecycleState['snapshot'];
}

interface DesktopMotionState {
  openingCardId: string | null;
  closingCardId: string | null;
  cleanupPendingCardId: string | null;
  handoffSourceCardId: string | null;
  handoffTargetCardId: string | null;
}

interface PointerLocation {
  x: number;
  y: number;
  valid: boolean;
}

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
  mobileLifecycleState: LandingMobileLifecycleState;
  mobileBackdropBindings: MobileBackdropBindings;
  activeVisualCardId: string | null;
  mobileRestoreReadyCardId: string | null;
  resolveCardInteractionBindings: (card: LandingCard) => LandingCardInteractionBindings;
  collapseExpandedCard: () => void;
}

function getCardRootElement(element: HTMLElement): HTMLElement | null {
  return element.closest<HTMLElement>('[data-testid="landing-grid-card"]');
}

function getExpandedFocusableElements(cardElement: HTMLElement): HTMLElement[] {
  const expandedBody = cardElement.querySelector<HTMLElement>('[data-slot="expandedBody"]');
  if (!expandedBody) {
    return [];
  }

  return Array.from(
    expandedBody.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')
  ).filter((candidate) => candidate.getAttribute('aria-hidden') !== 'true');
}

function resolveAdjacentCardId(cardIds: readonly string[], currentCardId: string, step: 1 | -1): string | null {
  const index = cardIds.indexOf(currentCardId);
  if (index < 0) {
    return null;
  }

  const nextIndex = index + step;
  if (nextIndex < 0 || nextIndex >= cardIds.length) {
    return null;
  }

  return cardIds[nextIndex] ?? null;
}

function focusCardById(shellElement: HTMLElement | null, cardId: string | null): boolean {
  if (!shellElement || !cardId) {
    return false;
  }

  const selector = `[data-testid="landing-grid-card"][data-card-id="${cardId}"] [data-testid="landing-grid-card-trigger"]`;
  const nextTrigger = shellElement.querySelector<HTMLElement>(selector);
  if (!nextTrigger) {
    return false;
  }

  nextTrigger.focus();
  return true;
}

function isDocumentLevelFocusTarget(target: EventTarget | null): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  return target === document.body || target === document.documentElement;
}

function isVisibleFocusableElement(element: HTMLElement | null): element is HTMLElement {
  if (!element || element.hasAttribute('hidden') || element.getAttribute('aria-hidden') === 'true') {
    return false;
  }

  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

function queueFocusCardById(shellElement: HTMLElement | null, cardId: string | null) {
  if (typeof window === 'undefined' || !cardId) {
    return;
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      focusCardById(shellElement, cardId);
    });
  });
}

function queueFocusCallback(callback: () => void) {
  if (typeof window === 'undefined') {
    return;
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      callback();
    });
  });
}

function isMobileCardElement(element: HTMLElement): boolean {
  const cardElement = getCardRootElement(element) ?? element;
  return cardElement.dataset.cardViewportTier === 'mobile';
}

export function resolveInteractionMode(viewportWidth: number, hoverCapability: boolean): 'hover' | 'tap' {
  if (viewportWidth < 768) {
    return 'tap';
  }

  return hoverCapability ? 'hover' : 'tap';
}

function captureMobileSnapshot(shellElement: HTMLElement | null, cardId: string) {
  if (!shellElement) {
    return {
      cardHeightPx: 0,
      anchorTopPx: 0,
      cardLeftPx: 0,
      cardWidthPx: 0,
      titleTopPx: 0
    };
  }

  const cardElement = shellElement.querySelector<HTMLElement>(`[data-testid="landing-grid-card"][data-card-id="${cardId}"]`);
  const titleElement = cardElement?.querySelector<HTMLElement>('[data-slot="cardTitle"]');

  const cardRect = cardElement?.getBoundingClientRect();
  const titleRect = titleElement?.getBoundingClientRect();

  return {
    cardHeightPx: cardRect?.height ?? 0,
    anchorTopPx: cardRect?.top ?? 0,
    cardLeftPx: cardRect?.left ?? 0,
    cardWidthPx: cardRect?.width ?? 0,
    titleTopPx: titleRect?.top ?? cardRect?.top ?? 0
  };
}

function shouldCancelOutsideCloseAsScroll(input: OutsideGesture, event: ReactPointerEvent<HTMLDivElement>): boolean {
  return (
    Math.abs(event.clientX - input.startX) > MOBILE_OUTSIDE_SCROLL_THRESHOLD_PX ||
    Math.abs(event.clientY - input.startY) > MOBILE_OUTSIDE_SCROLL_THRESHOLD_PX
  );
}

function shouldLockMobilePageScroll(phase: LandingCardMobilePhase): boolean {
  return phase === 'OPENING' || phase === 'CLOSING';
}

function resolveCardBoundaryElement(shellElement: HTMLElement | null, cardId: string): HTMLElement | null {
  if (!shellElement) {
    return null;
  }

  const cardElement = shellElement.querySelector<HTMLElement>(`[data-testid="landing-grid-card"][data-card-id="${cardId}"]`);
  if (!cardElement) {
    return null;
  }

  return (
    cardElement.querySelector<HTMLElement>('[data-slot="expandedBody"]') ??
    cardElement.querySelector<HTMLElement>('[data-testid="landing-grid-card-trigger"]') ??
    cardElement
  );
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
  const [transitionSourceCardId, setTransitionSourceCardId] = useState<string | null>(null);
  const [desktopMotionState, setDesktopMotionState] = useState<DesktopMotionState>({
    openingCardId: null,
    closingCardId: null,
    cleanupPendingCardId: null,
    handoffSourceCardId: null,
    handoffTargetCardId: null
  });
  const [mobileRestoreReadyCardId, setMobileRestoreReadyCardId] = useState<string | null>(null);
  const [mobileTransientShellState, setMobileTransientShellState] = useState<MobileTransientShellState>(
    initialMobileTransientShellState
  );

  const interactionMode = useMemo(
    () => resolveInteractionMode(viewportWidth, hoverCapability),
    [hoverCapability, viewportWidth]
  );
  const cardIds = useMemo(() => cards.map((card) => card.id), [cards]);
  const firstEnterableCardId = useMemo(
    () => cards.find((card) => isEnterableCard(card))?.id ?? null,
    [cards]
  );
  const isMobileViewport = viewportTier === 'mobile';

  const hoverTimerRef = useRef<number | null>(null);
  const hoverIntentTokenRef = useRef(0);
  const pointerWithinCardIdRef = useRef<string | null>(null);
  const pointerLocationRef = useRef<PointerLocation>({
    x: 0,
    y: 0,
    valid: false
  });
  const outsideGestureRef = useRef<OutsideGesture>({
    active: false,
    startX: 0,
    startY: 0,
    closeOnPointerUp: false
  });
  const mobileOpenTimerRef = useRef<number | null>(null);
  const mobileCloseTimerRef = useRef<number | null>(null);
  const mobileRestoreReadyTimerRef = useRef<number | null>(null);
  const mobileTransientShellTimerRef = useRef<number | null>(null);
  const desktopMotionTimerRef = useRef<number | null>(null);
  const desktopCleanupFrameRef = useRef<number | null>(null);
  const desktopCleanupFrameNestedRef = useRef<number | null>(null);
  const previousExpandedCardIdRef = useRef<string | null>(null);
  const desktopTransitionReasonRef = useRef<'expand' | 'collapse' | 'handoff'>('expand');

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  const clearMobileOpenTimer = useCallback(() => {
    if (mobileOpenTimerRef.current !== null) {
      window.clearTimeout(mobileOpenTimerRef.current);
      mobileOpenTimerRef.current = null;
    }
  }, []);

  const clearMobileCloseTimer = useCallback(() => {
    if (mobileCloseTimerRef.current !== null) {
      window.clearTimeout(mobileCloseTimerRef.current);
      mobileCloseTimerRef.current = null;
    }
  }, []);

  const clearMobileRestoreReadyTimer = useCallback(() => {
    if (mobileRestoreReadyTimerRef.current !== null) {
      window.clearTimeout(mobileRestoreReadyTimerRef.current);
      mobileRestoreReadyTimerRef.current = null;
    }
  }, []);

  const clearMobileTransientShellTimer = useCallback(() => {
    if (mobileTransientShellTimerRef.current !== null) {
      window.clearTimeout(mobileTransientShellTimerRef.current);
      mobileTransientShellTimerRef.current = null;
    }
  }, []);

  const clearDesktopMotionTimer = useCallback(() => {
    if (desktopMotionTimerRef.current !== null) {
      window.clearTimeout(desktopMotionTimerRef.current);
      desktopMotionTimerRef.current = null;
    }
  }, []);

  const clearDesktopCleanupFrames = useCallback(() => {
    if (desktopCleanupFrameRef.current !== null) {
      window.cancelAnimationFrame(desktopCleanupFrameRef.current);
      desktopCleanupFrameRef.current = null;
    }

    if (desktopCleanupFrameNestedRef.current !== null) {
      window.cancelAnimationFrame(desktopCleanupFrameNestedRef.current);
      desktopCleanupFrameNestedRef.current = null;
    }
  }, []);

  const beginDesktopCleanupPending = useCallback(
    (cardId: string) => {
      if (typeof window === 'undefined') {
        return;
      }

      clearDesktopCleanupFrames();
      setDesktopMotionState((current) => ({
        ...current,
        openingCardId: current.openingCardId === cardId ? null : current.openingCardId,
        closingCardId: current.closingCardId === cardId ? null : current.closingCardId,
        cleanupPendingCardId: cardId,
        handoffSourceCardId: current.handoffSourceCardId === cardId ? null : current.handoffSourceCardId,
        handoffTargetCardId: current.handoffTargetCardId === cardId ? null : current.handoffTargetCardId
      }));

      desktopCleanupFrameRef.current = window.requestAnimationFrame(() => {
        desktopCleanupFrameRef.current = null;
        desktopCleanupFrameNestedRef.current = window.requestAnimationFrame(() => {
          desktopCleanupFrameNestedRef.current = null;
          setDesktopMotionState((current) =>
            current.cleanupPendingCardId === cardId
              ? {
                  ...current,
                  cleanupPendingCardId: null
                }
              : current
          );
        });
      });
    },
    [clearDesktopCleanupFrames]
  );

  const focusLandingReverseGnbTarget = useCallback((): boolean => {
    if (typeof document === 'undefined') {
      return false;
    }

    const selectors = isMobileViewport
      ? ['[data-testid="gnb-mobile-menu-trigger"]', '.gnb-mobile .gnb-ci-link']
      : ['[data-testid="gnb-settings-trigger"]', '.gnb-desktop-links a:last-of-type', '.gnb-desktop .gnb-ci-link'];

    for (const selector of selectors) {
      const candidate = document.querySelector<HTMLElement>(selector);
      if (!isVisibleFocusableElement(candidate)) {
        continue;
      }

      candidate.focus();
      return true;
    }

    return false;
  }, [isMobileViewport]);

  const queueLandingReverseGnbTargetFocus = useCallback(() => {
    queueFocusCallback(() => {
      focusLandingReverseGnbTarget();
    });
  }, [focusLandingReverseGnbTarget]);

  // Desktop closing/opening markers must land before paint or the trigger briefly flashes back in.
  /* eslint-disable react-hooks/set-state-in-effect */
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
    if (typeof document === 'undefined') {
      return;
    }

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
    if (typeof window === 'undefined') {
      return;
    }

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        dispatchInteraction({
          type: 'KEYBOARD_MODE_ENTER'
        });

        if (!event.shiftKey && isDocumentLevelFocusTarget(event.target) && focusCardById(shellRef.current, firstEnterableCardId)) {
          event.preventDefault();
          return;
        }
      } else if (event.key === 'Escape') {
        dispatchInteraction({
          type: 'ESCAPE',
          nowMs: event.timeStamp
        });
      }
    };

    const handleGlobalPointerEvent = (event: PointerEvent | MouseEvent | WheelEvent) => {
      if ('clientX' in event && 'clientY' in event) {
        pointerLocationRef.current = {
          x: event.clientX,
          y: event.clientY,
          valid: true
        };
      }

      const target = event.target instanceof HTMLElement ? getCardRootElement(event.target) : null;
      pointerWithinCardIdRef.current = target?.dataset.cardId ?? null;
      dispatchInteraction({
        type: 'KEYBOARD_MODE_EXIT'
      });
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    window.addEventListener('pointermove', handleGlobalPointerEvent, {passive: true});
    window.addEventListener('mousedown', handleGlobalPointerEvent, {passive: true});
    window.addEventListener('wheel', handleGlobalPointerEvent, {passive: true});

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
      window.removeEventListener('pointermove', handleGlobalPointerEvent);
      window.removeEventListener('mousedown', handleGlobalPointerEvent);
      window.removeEventListener('wheel', handleGlobalPointerEvent);
    };
  }, [firstEnterableCardId, shellRef]);

  const mobilePageScrollLocked = shouldLockMobilePageScroll(mobileLifecycleState.phase);

  useEffect(() => {
    if (!mobilePageScrollLocked) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [mobilePageScrollLocked]);

  useEffect(() => {
    if (!isMobileViewport && mobileLifecycleState.phase !== 'NORMAL') {
      clearMobileOpenTimer();
      clearMobileCloseTimer();
      clearMobileTransientShellTimer();
      setMobileTransientShellState(initialMobileTransientShellState);
      dispatchMobileLifecycle({type: 'RESET'});
      dispatchInteraction({
        type: 'CARD_COLLAPSE',
        nowMs: window.performance.now(),
        interactionMode,
        cardId: null
      });
    }
  }, [
    clearMobileCloseTimer,
    clearMobileOpenTimer,
    clearMobileTransientShellTimer,
    interactionMode,
    isMobileViewport,
    mobileLifecycleState.phase
  ]);

  useEffect(() => {
    return () => {
      clearHoverTimer();
      clearMobileOpenTimer();
      clearMobileCloseTimer();
      clearMobileRestoreReadyTimer();
      clearMobileTransientShellTimer();
      clearDesktopMotionTimer();
      clearDesktopCleanupFrames();
    };
  }, [
    clearDesktopCleanupFrames,
    clearDesktopMotionTimer,
    clearHoverTimer,
    clearMobileCloseTimer,
    clearMobileOpenTimer,
    clearMobileRestoreReadyTimer,
    clearMobileTransientShellTimer
  ]);

  useLayoutEffect(() => {
    if (isMobileViewport) {
      previousExpandedCardIdRef.current = null;
      clearDesktopMotionTimer();
      clearDesktopCleanupFrames();
      setDesktopMotionState({
        openingCardId: null,
        closingCardId: null,
        cleanupPendingCardId: null,
        handoffSourceCardId: null,
        handoffTargetCardId: null
      });
      return;
    }

    const previousExpandedCardId = previousExpandedCardIdRef.current;
    const nextExpandedCardId = interactionState.expandedCardId;

    if (previousExpandedCardId === nextExpandedCardId) {
      return;
    }

    clearDesktopMotionTimer();
    clearDesktopCleanupFrames();

    if (previousExpandedCardId && nextExpandedCardId && previousExpandedCardId !== nextExpandedCardId) {
      setDesktopMotionState({
        openingCardId: nextExpandedCardId,
        closingCardId: null,
        cleanupPendingCardId: null,
        handoffSourceCardId: previousExpandedCardId,
        handoffTargetCardId: nextExpandedCardId
      });
      desktopMotionTimerRef.current = window.setTimeout(() => {
        setDesktopMotionState((current) => ({
          ...current,
          openingCardId: current.openingCardId === nextExpandedCardId ? null : current.openingCardId,
          handoffSourceCardId:
            current.handoffSourceCardId === previousExpandedCardId ? null : current.handoffSourceCardId,
          handoffTargetCardId:
            current.handoffTargetCardId === nextExpandedCardId ? null : current.handoffTargetCardId
        }));
      }, CORE_MOTION_DURATION_MS);
    } else if (nextExpandedCardId) {
      setDesktopMotionState({
        openingCardId: nextExpandedCardId,
        closingCardId: null,
        cleanupPendingCardId: null,
        handoffSourceCardId: null,
        handoffTargetCardId: null
      });
      desktopMotionTimerRef.current = window.setTimeout(() => {
        setDesktopMotionState((current) => ({
          ...current,
          openingCardId: current.openingCardId === nextExpandedCardId ? null : current.openingCardId
        }));
      }, CORE_MOTION_DURATION_MS);
    } else if (previousExpandedCardId && desktopTransitionReasonRef.current === 'collapse') {
      setDesktopMotionState({
        openingCardId: null,
        closingCardId: previousExpandedCardId,
        cleanupPendingCardId: null,
        handoffSourceCardId: null,
        handoffTargetCardId: null
      });
      desktopMotionTimerRef.current = window.setTimeout(() => {
        beginDesktopCleanupPending(previousExpandedCardId);
      }, CORE_MOTION_DURATION_MS);
    } else {
      setDesktopMotionState({
        openingCardId: null,
        closingCardId: null,
        cleanupPendingCardId: null,
        handoffSourceCardId: null,
        handoffTargetCardId: null
      });
    }

    previousExpandedCardIdRef.current = nextExpandedCardId;
  }, [
    beginDesktopCleanupPending,
    clearDesktopCleanupFrames,
    clearDesktopMotionTimer,
    interactionState.expandedCardId,
    isMobileViewport
  ]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const collapseExpandedCard = useCallback(() => {
    clearHoverTimer();
    clearMobileOpenTimer();
    clearMobileCloseTimer();
    clearMobileRestoreReadyTimer();
    clearMobileTransientShellTimer();
    pointerWithinCardIdRef.current = null;
    desktopTransitionReasonRef.current = 'collapse';
    setMobileRestoreReadyCardId(null);
    setTransitionSourceCardId(null);
    setMobileTransientShellState(initialMobileTransientShellState);
    dispatchMobileLifecycle({type: 'RESET'});
    dispatchInteraction({
      type: 'CARD_COLLAPSE',
      nowMs: typeof window !== 'undefined' ? window.performance.now() : 0,
      interactionMode,
      cardId: null
    });
  }, [
    clearHoverTimer,
    clearMobileCloseTimer,
    clearMobileOpenTimer,
    clearMobileRestoreReadyTimer,
    clearMobileTransientShellTimer,
    interactionMode
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleTransitionCleanup = () => {
      collapseExpandedCard();
    };

    window.addEventListener(LANDING_TRANSITION_CLEANUP_EVENT, handleTransitionCleanup);
    return () => {
      window.removeEventListener(LANDING_TRANSITION_CLEANUP_EVENT, handleTransitionCleanup);
    };
  }, [collapseExpandedCard]);

  const beginTransition = useCallback((cardId: string) => {
    clearHoverTimer();
    clearMobileOpenTimer();
    clearMobileCloseTimer();
    clearMobileRestoreReadyTimer();
    clearMobileTransientShellTimer();
    pointerWithinCardIdRef.current = null;
    setMobileRestoreReadyCardId(null);
    setTransitionSourceCardId(cardId);
    setMobileTransientShellState(initialMobileTransientShellState);
    dispatchInteraction({
      type: 'PAGE_TRANSITION_START',
      nowMs: typeof window !== 'undefined' ? window.performance.now() : 0
    });
  }, [
    clearHoverTimer,
    clearMobileCloseTimer,
    clearMobileOpenTimer,
    clearMobileRestoreReadyTimer,
    clearMobileTransientShellTimer
  ]);

  const startMobileTransientShell = useCallback(
    (
      mode: Exclude<LandingCardMobileTransientMode, 'NONE'>,
      cardId: string,
      snapshot: NonNullable<LandingMobileLifecycleState['snapshot']>
    ) => {
      clearMobileTransientShellTimer();
      setMobileTransientShellState({
        mode,
        cardId,
        snapshot
      });
      mobileTransientShellTimerRef.current = window.setTimeout(() => {
        mobileTransientShellTimerRef.current = null;
        setMobileTransientShellState((current) =>
          current.mode === mode && current.cardId === cardId
            ? initialMobileTransientShellState
            : current
        );
      }, MOBILE_EXPANDED_DURATION_MS);
    },
    [clearMobileTransientShellTimer]
  );

  const scheduleHoverIntent = (input: {
    cardId: string;
    delayMs: number;
    action: HoverIntentAction;
    run: () => void;
  }) => {
    clearHoverTimer();
    const nextToken = nextHoverIntentToken(hoverIntentTokenRef.current, input.cardId, input.action);
    hoverIntentTokenRef.current = nextToken.token;

    hoverTimerRef.current = window.setTimeout(() => {
      if (hoverIntentTokenRef.current !== nextToken.token) {
        return;
      }

      input.run();
    }, input.delayMs);
  };

  const isPointerInsideCardBoundary = useCallback(
    (cardId: string) => {
      if (!pointerLocationRef.current.valid) {
        return false;
      }

      const boundaryElement = resolveCardBoundaryElement(shellRef.current, cardId);
      if (!boundaryElement) {
        return false;
      }

      const {x, y} = pointerLocationRef.current;
      const rect = boundaryElement.getBoundingClientRect();
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    },
    [shellRef]
  );

  const beginMobileOpen = useCallback((cardId: string, syncInteraction = true) => {
    const snapshot = captureMobileSnapshot(shellRef.current, cardId);
    clearMobileOpenTimer();
    clearMobileCloseTimer();
    clearMobileRestoreReadyTimer();
    setMobileRestoreReadyCardId(null);
    startMobileTransientShell('OPENING', cardId, snapshot);

    dispatchMobileLifecycle({
      type: 'OPEN_START',
      cardId,
      snapshot
    });
    if (syncInteraction) {
      dispatchInteraction({
        type: 'CARD_EXPAND',
        nowMs: typeof window !== 'undefined' ? window.performance.now() : 0,
        interactionMode,
        cardId,
        available: true
      });
    }

    mobileOpenTimerRef.current = window.setTimeout(() => {
      dispatchMobileLifecycle({type: 'OPEN_SETTLED'});
    }, MOBILE_EXPANDED_DURATION_MS);
  }, [
    clearMobileCloseTimer,
    clearMobileOpenTimer,
    clearMobileRestoreReadyTimer,
    interactionMode,
    shellRef,
    startMobileTransientShell
  ]);

  const settleMobileCloseAfterRestore = useCallback(
    (cardId: string, snapshot: NonNullable<LandingMobileLifecycleState['snapshot']>) => {
      let frame = 0;
      let attempts = 0;

      const finishRestore = () => {
        const cardElement = shellRef.current?.querySelector<HTMLElement>(
          `[data-testid="landing-grid-card"][data-card-id="${cardId}"]`
        );
        const titleElement = cardElement?.querySelector<HTMLElement>('[data-slot="cardTitle"]');
      const cardRect = cardElement?.getBoundingClientRect();
      const titleRect = titleElement?.getBoundingClientRect();

      const heightSettled = Math.abs((cardRect?.height ?? 0) - snapshot.cardHeightPx) <= 1;
      const snapshotTitleOffset = snapshot.titleTopPx - snapshot.anchorTopPx;
      const currentTitleOffset = (titleRect?.top ?? cardRect?.top ?? 0) - (cardRect?.top ?? 0);
      const titleSettled = Math.abs(currentTitleOffset - snapshotTitleOffset) <= 1;

      attempts += 1;
      if ((heightSettled && titleSettled) || attempts >= 30) {
        clearMobileRestoreReadyTimer();
        setMobileRestoreReadyCardId(cardId);
        mobileRestoreReadyTimerRef.current = window.setTimeout(() => {
          mobileRestoreReadyTimerRef.current = null;
          setMobileRestoreReadyCardId((current) => (current === cardId ? null : current));
          }, MOBILE_RESTORE_READY_MARKER_MS);
          dispatchMobileLifecycle({type: 'RESTORE_READY'});
          frame = window.requestAnimationFrame(() => {
            dispatchMobileLifecycle({type: 'CLOSE_SETTLED'});
          });
          return;
        }

        frame = window.requestAnimationFrame(finishRestore);
      };

      frame = window.requestAnimationFrame(finishRestore);

      return () => {
        if (frame !== 0) {
          window.cancelAnimationFrame(frame);
        }
      };
    },
    [clearMobileRestoreReadyTimer, shellRef]
  );

  function beginMobileClose() {
    if (mobileLifecycleState.phase === 'OPENING') {
      dispatchMobileLifecycle({type: 'QUEUE_CLOSE'});
      return;
    }

    if (mobileLifecycleState.phase !== 'OPEN') {
      return;
    }

    clearMobileOpenTimer();
    if (mobileLifecycleState.cardId && mobileLifecycleState.snapshot) {
      const closingSnapshot = captureMobileSnapshot(shellRef.current, mobileLifecycleState.cardId);
      startMobileTransientShell('CLOSING', mobileLifecycleState.cardId, closingSnapshot);
    }
    dispatchInteraction({
      type: 'CARD_COLLAPSE',
      nowMs: typeof window !== 'undefined' ? window.performance.now() : 0,
      interactionMode,
      cardId: mobileLifecycleState.cardId
    });
    dispatchMobileLifecycle({type: 'CLOSE_START'});
  }

  const beginMobileKeyboardHandoff = useCallback(
    (sourceCardId: string, nextCardId: string | null, nowMs: number) => {
      clearMobileOpenTimer();
      clearMobileCloseTimer();
      clearMobileRestoreReadyTimer();
      setMobileRestoreReadyCardId(null);
      clearMobileTransientShellTimer();
      setMobileTransientShellState(initialMobileTransientShellState);

      dispatchMobileLifecycle({type: 'RESET'});

      if (!nextCardId) {
        dispatchInteraction({
          type: 'CARD_COLLAPSE',
          nowMs,
          interactionMode,
          cardId: sourceCardId
        });
        return;
      }

      dispatchInteraction({
        type: 'CARD_COLLAPSE',
        nowMs,
        interactionMode,
        cardId: sourceCardId
      });
      queueFocusCardById(shellRef.current, nextCardId);
    },
    [
      clearMobileCloseTimer,
      clearMobileOpenTimer,
      clearMobileRestoreReadyTimer,
      clearMobileTransientShellTimer,
      interactionMode,
      shellRef
    ]
  );

  useEffect(() => {
    if (
      !isMobileViewport ||
      interactionState.expandedCardId === null ||
      mobileLifecycleState.phase !== 'NORMAL'
    ) {
      return;
    }

    const cardId = interactionState.expandedCardId;
    const frame = window.requestAnimationFrame(() => {
      beginMobileOpen(cardId, false);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [beginMobileOpen, interactionState.expandedCardId, isMobileViewport, mobileLifecycleState.phase]);

  useEffect(() => {
    if (mobileLifecycleState.phase !== 'CLOSING' || mobileCloseTimerRef.current !== null) {
      return;
    }

    const cardId = mobileLifecycleState.cardId;
    const snapshot = mobileLifecycleState.snapshot;
    let cancelRestore: (() => void) | undefined;

    if (cardId && interactionState.expandedCardId === cardId) {
      dispatchInteraction({
        type: 'CARD_COLLAPSE',
        nowMs: typeof window !== 'undefined' ? window.performance.now() : 0,
        interactionMode,
        cardId
      });
    }

    mobileCloseTimerRef.current = window.setTimeout(() => {
      mobileCloseTimerRef.current = null;
      if (cardId && snapshot) {
        cancelRestore = settleMobileCloseAfterRestore(cardId, snapshot);
        return;
      }

      clearMobileRestoreReadyTimer();
      if (cardId) {
        setMobileRestoreReadyCardId(cardId);
        mobileRestoreReadyTimerRef.current = window.setTimeout(() => {
          mobileRestoreReadyTimerRef.current = null;
          setMobileRestoreReadyCardId((current) => (current === cardId ? null : current));
        }, MOBILE_RESTORE_READY_MARKER_MS);
      }
      dispatchMobileLifecycle({type: 'RESTORE_READY'});
      requestAnimationFrame(() => {
        dispatchMobileLifecycle({type: 'CLOSE_SETTLED'});
      });
    }, MOBILE_EXPANDED_DURATION_MS);

    return () => {
      clearMobileCloseTimer();
      cancelRestore?.();
    };
  }, [
    clearMobileCloseTimer,
    interactionMode,
    interactionState.expandedCardId,
    mobileLifecycleState.cardId,
    mobileLifecycleState.phase,
    mobileLifecycleState.snapshot,
    clearMobileRestoreReadyTimer,
    settleMobileCloseAfterRestore
  ]);

  const resolveCardInteractionBindings = (card: LandingCard): LandingCardInteractionBindings => {
    const cardEnterable = isEnterableCard(card);
    const pointerBlocked = isCardPointerInteractionBlocked(interactionState, card.id);
    const keyboardAriaDisabled = isCardKeyboardAriaDisabled(interactionState, card.id) || !cardEnterable;
    const cardState = resolveCardStateForId(interactionState, card.id);
    const transitionExpanded =
      interactionState.pageState === 'TRANSITIONING' &&
      transitionSourceCardId === card.id &&
      cardEnterable;
    const mobileOwnsCard = mobileLifecycleState.cardId === card.id;
    const mobilePhase: LandingCardMobilePhase = mobileOwnsCard ? mobileLifecycleState.phase : 'NORMAL';
    const mobileTransientMode: LandingCardMobileTransientMode =
      mobileTransientShellState.cardId === card.id ? mobileTransientShellState.mode : 'NONE';
    const desktopClosingVisible =
      !isMobileViewport && desktopMotionState.closingCardId === card.id && cardEnterable;
    const desktopCleanupPending =
      !isMobileViewport && desktopMotionState.cleanupPendingCardId === card.id && cardEnterable;
    const desktopMotionRole: LandingCardDesktopMotionRole =
      desktopMotionState.handoffSourceCardId === card.id
        ? 'handoff-source'
        : desktopMotionState.handoffTargetCardId === card.id
          ? 'handoff-target'
          : desktopMotionState.openingCardId === card.id
            ? 'opening'
            : desktopMotionState.closingCardId === card.id
              ? 'closing'
              : !isMobileViewport && (transitionExpanded || (cardState === 'EXPANDED' && cardEnterable))
                ? 'steady'
                : 'idle';
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
      (mobileLifecycleState.cardId !== card.id || mobileLifecycleState.phase !== 'OPEN');
    const visualState: LandingCardVisualState =
      transitionExpanded ||
      desktopClosingVisible ||
      desktopCleanupPending ||
      (cardState === 'EXPANDED' && cardEnterable)
        ? 'expanded'
        : cardState === 'FOCUSED'
          ? 'focused'
          : 'normal';
    const mobileSnapshotSource =
      mobileTransientShellState.cardId === card.id && mobileTransientShellState.snapshot
        ? mobileTransientShellState.snapshot
        : mobileOwnsCard
          ? mobileLifecycleState.snapshot
          : null;
    const mobileSnapshot = mobileSnapshotSource
      ? {
          cardHeightPx: mobileSnapshotSource.cardHeightPx,
          anchorTopPx: mobileSnapshotSource.anchorTopPx,
          cardLeftPx: mobileSnapshotSource.cardLeftPx,
          cardWidthPx: mobileSnapshotSource.cardWidthPx,
          titleTopPx: mobileSnapshotSource.titleTopPx,
          snapshotWriteCount: mobileLifecycleState.snapshotWriteCount,
          restoreReady: mobileRestoreReadyCardId === card.id || (mobileOwnsCard && mobileLifecycleState.restoreReady)
        }
      : null;
    const handleExpandedBodyKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
      if (event.key !== 'Tab' || !cardEnterable) {
        return;
      }

      dispatchInteraction({type: 'KEYBOARD_MODE_ENTER'});

      const target = event.target instanceof HTMLElement ? event.target : null;
      if (!target) {
        return;
      }

      const cardElement = getCardRootElement(event.currentTarget) ?? event.currentTarget;
      const focusables = getExpandedFocusableElements(cardElement);
      const focusIndex = focusables.findIndex((candidate) => candidate === target);
      if (focusIndex < 0) {
        return;
      }

      if (event.shiftKey) {
        if (focusIndex > 0) {
          event.preventDefault();
          focusables[focusIndex - 1]?.focus();
          return;
        }

        if (isMobileViewport) {
          event.preventDefault();
          beginMobileKeyboardHandoff(card.id, resolveAdjacentCardId(cardIds, card.id, -1) ?? card.id, event.timeStamp);
          return;
        }

        if (focusCardById(shellRef.current, card.id)) {
          event.preventDefault();
        }
        return;
      }

      if (focusIndex < focusables.length - 1) {
        event.preventDefault();
        focusables[focusIndex + 1]?.focus();
        return;
      }

      const nextCardId = resolveAdjacentCardId(cardIds, card.id, 1);
      if (isMobileViewport) {
        event.preventDefault();
        beginMobileKeyboardHandoff(card.id, nextCardId, event.timeStamp);
        return;
      }

      desktopTransitionReasonRef.current = 'handoff';
      if (focusCardById(shellRef.current, nextCardId)) {
        event.preventDefault();
      }
    };

    return {
      state: visualState,
      desktopMotionRole,
      desktopShellPhase,
      hoverLockEnabled: interactionState.hoverLock.enabled,
      keyboardMode: interactionState.hoverLock.keyboardMode,
      interactionBlocked:
        interactionState.pageState === 'TRANSITIONING' ? true : pointerBlocked || mobileInteractionLocked,
      ariaDisabled:
        interactionState.pageState === 'TRANSITIONING'
          ? true
          : keyboardAriaDisabled || mobileInteractionLocked,
      tabIndex:
        interactionState.pageState === 'TRANSITIONING' || mobileInteractionLocked
          ? -1
          : resolveCardTabIndex(interactionState, card.id),
      mobilePhase,
      mobileTransientMode,
      mobileRestoreReady:
        mobileRestoreReadyCardId === card.id || (mobileOwnsCard && mobileLifecycleState.restoreReady),
      mobileSnapshot,
      onFocus: (event) => {
        desktopTransitionReasonRef.current =
          interactionState.expandedCardId && interactionState.expandedCardId !== card.id && cardEnterable
            ? 'handoff'
            : interactionState.expandedCardId && interactionState.expandedCardId !== card.id
              ? 'collapse'
              : 'expand';
        dispatchInteraction({
          type: 'CARD_FOCUS',
          nowMs: event.timeStamp,
          interactionMode,
          cardId: card.id,
          available: cardEnterable
        });
      },
      onKeyDown: (event) => {
        if (event.key === 'Tab') {
          dispatchInteraction({type: 'KEYBOARD_MODE_ENTER'});

          if (!cardEnterable) {
            return;
          }

          const cardElement = getCardRootElement(event.currentTarget) ?? event.currentTarget;
          const isExpanded = interactionState.expandedCardId === card.id;
          const focusables = getExpandedFocusableElements(cardElement);
          const firstFocusable = focusables[0] ?? null;
          const lastFocusable = focusables[focusables.length - 1] ?? null;
          const target = event.target instanceof HTMLElement ? event.target : null;

          if (!event.shiftKey && isExpanded && target === event.currentTarget && firstFocusable) {
            event.preventDefault();
            firstFocusable.focus();
            return;
          }

          if (!event.shiftKey && lastFocusable && target === lastFocusable) {
            const nextCardId = resolveAdjacentCardId(cardIds, card.id, 1);
            desktopTransitionReasonRef.current = 'handoff';
            if (focusCardById(shellRef.current, nextCardId)) {
              event.preventDefault();
            }
            return;
          }

          if (event.shiftKey && firstFocusable && target === firstFocusable) {
            if (isMobileViewport) {
              event.preventDefault();
              beginMobileKeyboardHandoff(card.id, resolveAdjacentCardId(cardIds, card.id, -1) ?? card.id, event.timeStamp);
              return;
            }

            const previousCardId = resolveAdjacentCardId(cardIds, card.id, -1);
            desktopTransitionReasonRef.current = 'handoff';
            if (focusCardById(shellRef.current, previousCardId)) {
              event.preventDefault();
            }
            return;
          }

          if (event.shiftKey && target === event.currentTarget) {
            const previousCardId = resolveAdjacentCardId(cardIds, card.id, -1);
            if (isMobileViewport) {
              event.preventDefault();
              if (previousCardId) {
                beginMobileKeyboardHandoff(card.id, previousCardId, event.timeStamp);
                return;
              }

              beginMobileKeyboardHandoff(card.id, null, event.timeStamp);
              queueLandingReverseGnbTargetFocus();
              return;
            }

            desktopTransitionReasonRef.current = 'handoff';

            if (focusCardById(shellRef.current, previousCardId)) {
              event.preventDefault();
              return;
            }

            desktopTransitionReasonRef.current = 'collapse';
            dispatchInteraction({
              type: 'CARD_COLLAPSE',
              nowMs: event.timeStamp,
              interactionMode,
              cardId: card.id
            });
            queueLandingReverseGnbTargetFocus();
            event.preventDefault();
          }
          return;
        }

        if ((event.key === 'Enter' || event.key === ' ') && keyboardAriaDisabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        if (event.key === 'Escape') {
          event.preventDefault();
          collapseExpandedCard();
          return;
        }

        if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) {
          event.preventDefault();

          if (!cardEnterable) {
            return;
          }

          if (isMobileCardElement(event.currentTarget)) {
            if (mobileLifecycleState.phase === 'NORMAL' && mobileLifecycleState.cardId !== card.id) {
              beginMobileOpen(card.id);
            }
            return;
          }

          desktopTransitionReasonRef.current = 'expand';
          dispatchInteraction({
            type: 'CARD_EXPAND',
            nowMs: event.timeStamp,
            interactionMode,
            cardId: card.id,
            available: cardEnterable
          });
        }
      },
      onClick: (event) => {
        if (keyboardAriaDisabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        if (!cardEnterable) {
          event.preventDefault();
          return;
        }

        if (isMobileCardElement(event.currentTarget)) {
          if (mobileLifecycleState.phase === 'NORMAL' && mobileLifecycleState.cardId !== card.id) {
            beginMobileOpen(card.id);
          }
          return;
        }

        desktopTransitionReasonRef.current = 'expand';
        dispatchInteraction({
          type: 'CARD_EXPAND',
          nowMs: event.timeStamp,
          interactionMode,
          cardId: card.id,
          available: cardEnterable
        });
      },
      onMouseEnter: (event) => {
        if (interactionMode !== 'hover' || isMobileViewport) {
          return;
        }

        pointerWithinCardIdRef.current = cardEnterable ? card.id : null;
        const handoff = isEnterableHandoffCandidate({
          previousExpandedCardId: interactionState.expandedCardId,
          nextCardId: card.id,
          enterable: cardEnterable
        });

        if (handoff) {
          desktopTransitionReasonRef.current = 'handoff';
          dispatchInteraction({
            type: 'CARD_COLLAPSE',
            nowMs: event.timeStamp,
            interactionMode,
            cardId: interactionState.expandedCardId
          });
          dispatchInteraction({
            type: 'CARD_EXPAND',
            nowMs: event.timeStamp,
            interactionMode,
            cardId: card.id,
            available: cardEnterable
          });
          return;
        }

        if (!cardEnterable) {
          clearHoverTimer();
          if (interactionState.expandedCardId) {
            desktopTransitionReasonRef.current = 'collapse';
            dispatchInteraction({
              type: 'CARD_COLLAPSE',
              nowMs: event.timeStamp,
              interactionMode,
              cardId: interactionState.expandedCardId
            });
          }
          return;
        }

        scheduleHoverIntent({
          cardId: card.id,
          delayMs: DESKTOP_EXPAND_DELAY_MS,
          action: 'expand',
          run: () => {
            if (pointerWithinCardIdRef.current !== card.id) {
              return;
            }

            desktopTransitionReasonRef.current = 'expand';
            dispatchInteraction({
              type: 'CARD_EXPAND',
              nowMs: typeof window !== 'undefined' ? window.performance.now() : event.timeStamp,
              interactionMode,
              cardId: card.id,
              available: cardEnterable
            });
          }
        });
      },
      onMouseLeave: (event) => {
        if (interactionMode !== 'hover' || isMobileViewport) {
          return;
        }

        const relatedTarget = event.relatedTarget;
        if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) {
          return;
        }

        pointerWithinCardIdRef.current = null;

        if (!cardEnterable) {
          return;
        }

        scheduleHoverIntent({
          cardId: card.id,
          delayMs: DESKTOP_COLLAPSE_DELAY_MS,
          action: 'collapse',
          run: () => {
            if (pointerWithinCardIdRef.current !== null || isPointerInsideCardBoundary(card.id)) {
              return;
            }

            desktopTransitionReasonRef.current = 'collapse';
            dispatchInteraction({
              type: 'CARD_COLLAPSE',
              nowMs: typeof window !== 'undefined' ? window.performance.now() : event.timeStamp,
              interactionMode,
              cardId: card.id
            });
          }
        });
      },
      onExpandedBodyKeyDown: handleExpandedBodyKeyDown,
      onAnswerChoiceSelect: (choice, event) => {
        if (card.type !== 'test') {
          return;
        }

        const shouldBeginTransition = onAnswerChoiceSelect?.(card, choice) !== false;
        if (shouldBeginTransition) {
          beginTransition(card.id);
        }
        event.preventDefault();
      },
      onPrimaryCtaClick: (event) => {
        if (card.type !== 'blog') {
          return;
        }

        const shouldBeginTransition = onPrimaryCtaSelect?.(card) !== false;
        if (shouldBeginTransition) {
          beginTransition(card.id);
        }
        event.preventDefault();
      },
      onMobileClose: (event) => {
        event.preventDefault();
        beginMobileClose();
      }
    };
  };

  const mobileBackdropBindings: MobileBackdropBindings = {
    active: isMobileViewport && mobileLifecycleState.phase !== 'NORMAL',
    state: isMobileViewport && mobileLifecycleState.phase !== 'NORMAL' ? mobileLifecycleState.phase : 'HIDDEN',
    onPointerDown: (event) => {
      if (!isMobileViewport || mobileLifecycleState.phase === 'NORMAL') {
        return;
      }

      outsideGestureRef.current = {
        active: true,
        startX: event.clientX,
        startY: event.clientY,
        closeOnPointerUp: mobileLifecycleState.phase === 'OPEN'
      };
      if (mobileLifecycleState.phase === 'OPENING') {
        beginMobileClose();
      }
    },
    onPointerMove: (event) => {
      if (!outsideGestureRef.current.active) {
        return;
      }

      if (shouldCancelOutsideCloseAsScroll(outsideGestureRef.current, event)) {
        outsideGestureRef.current.active = false;
        outsideGestureRef.current.closeOnPointerUp = false;
        if (mobileLifecycleState.phase === 'OPENING') {
          dispatchMobileLifecycle({type: 'QUEUE_CLOSE_CANCEL'});
        }
      }
    },
    onPointerUp: () => {
      const shouldClose = outsideGestureRef.current.active && outsideGestureRef.current.closeOnPointerUp;
      outsideGestureRef.current.active = false;
      outsideGestureRef.current.closeOnPointerUp = false;
      if (shouldClose) {
        beginMobileClose();
      }
    },
    onPointerCancel: () => {
      outsideGestureRef.current.active = false;
      outsideGestureRef.current.closeOnPointerUp = false;
    }
  };

  const activeVisualCardId = isMobileViewport
    ? mobileLifecycleState.cardId ?? mobileTransientShellState.cardId
    : transitionSourceCardId ??
      interactionState.expandedCardId ??
      desktopMotionState.closingCardId ??
      desktopMotionState.cleanupPendingCardId;

  return {
    interactionMode,
    interactionState,
    mobileLifecycleState,
    mobileBackdropBindings,
    activeVisualCardId,
    mobileRestoreReadyCardId,
    resolveCardInteractionBindings,
    collapseExpandedCard
  };
}
