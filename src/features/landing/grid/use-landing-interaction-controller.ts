import type {
  FocusEvent as ReactFocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  RefObject
} from 'react';
import {useCallback, useEffect, useMemo, useReducer, useRef, useState} from 'react';

import type {LandingCard} from '@/features/landing/data';
import type {
  LandingCardMobilePhase,
  LandingCardDesktopMotionRole,
  LandingCardViewportTier,
  LandingCardVisualState,
  LandingMobileSnapshotView
} from '@/features/landing/grid/landing-grid-card';
import {
  CORE_MOTION_DURATION_MS,
  DESKTOP_COLLAPSE_DELAY_MS,
  DESKTOP_EXPAND_DELAY_MS,
  isAvailableHandoffCandidate,
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

export interface LandingCardInteractionBindings {
  state: LandingCardVisualState;
  desktopMotionRole: LandingCardDesktopMotionRole;
  tabIndex: number;
  ariaDisabled: boolean;
  interactionBlocked: boolean;
  hoverLockEnabled: boolean;
  keyboardMode: boolean;
  mobilePhase: LandingCardMobilePhase;
  mobileRestoreReady: boolean;
  mobileSnapshot: LandingMobileSnapshotView | null;
  onFocus: (event: ReactFocusEvent<HTMLElement>) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
  onClick: (event: ReactMouseEvent<HTMLElement>) => void;
  onMouseEnter: (event: ReactMouseEvent<HTMLElement>) => void;
  onMouseLeave: (event: ReactMouseEvent<HTMLElement>) => void;
  onAnswerChoiceSelect: (choice: 'A' | 'B', event: ReactMouseEvent<HTMLButtonElement>) => void;
  onPrimaryCtaClick: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
  onMobileClose: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}

interface OutsideGesture {
  active: boolean;
  startX: number;
  startY: number;
}

interface MobileBackdropBindings {
  active: boolean;
  state: LandingCardMobilePhase | 'HIDDEN';
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
}

interface DesktopMotionState {
  openingCardId: string | null;
  closingCardId: string | null;
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

function isMobileCardElement(element: HTMLElement): boolean {
  const cardElement = getCardRootElement(element) ?? element;
  if (typeof window !== 'undefined') {
    return window.innerWidth < 768;
  }

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
    titleTopPx: titleRect?.top ?? cardRect?.top ?? 0
  };
}

function shouldCancelOutsideCloseAsScroll(input: OutsideGesture, event: ReactPointerEvent<HTMLDivElement>): boolean {
  return (
    Math.abs(event.clientX - input.startX) > MOBILE_OUTSIDE_SCROLL_THRESHOLD_PX ||
    Math.abs(event.clientY - input.startY) > MOBILE_OUTSIDE_SCROLL_THRESHOLD_PX
  );
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
    handoffSourceCardId: null,
    handoffTargetCardId: null
  });
  const [mobileRestoreReadyCardId, setMobileRestoreReadyCardId] = useState<string | null>(null);

  const interactionMode = useMemo(
    () => resolveInteractionMode(viewportWidth, hoverCapability),
    [hoverCapability, viewportWidth]
  );
  const cardIds = useMemo(() => cards.map((card) => card.id), [cards]);
  const isMobileViewport =
    typeof window !== 'undefined' ? window.innerWidth < 768 : viewportTier === 'mobile';

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
    startY: 0
  });
  const mobileOpenTimerRef = useRef<number | null>(null);
  const mobileCloseTimerRef = useRef<number | null>(null);
  const mobileRestoreReadyTimerRef = useRef<number | null>(null);
  const desktopMotionTimerRef = useRef<number | null>(null);
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

  const clearDesktopMotionTimer = useCallback(() => {
    if (desktopMotionTimerRef.current !== null) {
      window.clearTimeout(desktopMotionTimerRef.current);
      desktopMotionTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
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

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (mobileLifecycleState.phase === 'NORMAL') {
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
  }, [mobileLifecycleState.phase]);

  useEffect(() => {
    if (!isMobileViewport && mobileLifecycleState.phase !== 'NORMAL') {
      clearMobileOpenTimer();
      clearMobileCloseTimer();
      dispatchMobileLifecycle({type: 'RESET'});
      dispatchInteraction({
        type: 'CARD_COLLAPSE',
        nowMs: window.performance.now(),
        interactionMode,
        cardId: null
      });
    }
  }, [clearMobileCloseTimer, clearMobileOpenTimer, interactionMode, isMobileViewport, mobileLifecycleState.phase]);

  useEffect(() => {
    return () => {
      clearHoverTimer();
      clearMobileOpenTimer();
      clearMobileCloseTimer();
      clearMobileRestoreReadyTimer();
      clearDesktopMotionTimer();
    };
  }, [clearDesktopMotionTimer, clearHoverTimer, clearMobileCloseTimer, clearMobileOpenTimer, clearMobileRestoreReadyTimer]);

  useEffect(() => {
    let frame = 0;
    const scheduleDesktopMotionState = (
      updater: DesktopMotionState | ((current: DesktopMotionState) => DesktopMotionState)
    ) => {
      frame = window.requestAnimationFrame(() => {
        setDesktopMotionState(updater);
      });
    };

    if (isMobileViewport) {
      previousExpandedCardIdRef.current = null;
      clearDesktopMotionTimer();
      scheduleDesktopMotionState({
        openingCardId: null,
        closingCardId: null,
        handoffSourceCardId: null,
        handoffTargetCardId: null
      });
      return () => {
        if (frame !== 0) {
          window.cancelAnimationFrame(frame);
        }
      };
    }

    const previousExpandedCardId = previousExpandedCardIdRef.current;
    const nextExpandedCardId = interactionState.expandedCardId;

    if (previousExpandedCardId === nextExpandedCardId) {
      return;
    }

    clearDesktopMotionTimer();

    if (previousExpandedCardId && nextExpandedCardId && previousExpandedCardId !== nextExpandedCardId) {
      scheduleDesktopMotionState({
        openingCardId: nextExpandedCardId,
        closingCardId: null,
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
      scheduleDesktopMotionState({
        openingCardId: nextExpandedCardId,
        closingCardId: null,
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
      scheduleDesktopMotionState({
        openingCardId: null,
        closingCardId: previousExpandedCardId,
        handoffSourceCardId: null,
        handoffTargetCardId: null
      });
      desktopMotionTimerRef.current = window.setTimeout(() => {
        setDesktopMotionState((current) => ({
          ...current,
          closingCardId: current.closingCardId === previousExpandedCardId ? null : current.closingCardId
        }));
      }, CORE_MOTION_DURATION_MS);
    } else {
      scheduleDesktopMotionState({
        openingCardId: null,
        closingCardId: null,
        handoffSourceCardId: null,
        handoffTargetCardId: null
      });
    }

    previousExpandedCardIdRef.current = nextExpandedCardId;
    return () => {
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [clearDesktopMotionTimer, interactionState.expandedCardId, isMobileViewport]);

  const collapseExpandedCard = useCallback(() => {
    clearHoverTimer();
    clearMobileOpenTimer();
    clearMobileCloseTimer();
    clearMobileRestoreReadyTimer();
    pointerWithinCardIdRef.current = null;
    desktopTransitionReasonRef.current = 'collapse';
    setMobileRestoreReadyCardId(null);
    setTransitionSourceCardId(null);
    dispatchMobileLifecycle({type: 'RESET'});
    dispatchInteraction({
      type: 'CARD_COLLAPSE',
      nowMs: typeof window !== 'undefined' ? window.performance.now() : 0,
      interactionMode,
      cardId: null
    });
  }, [clearHoverTimer, clearMobileCloseTimer, clearMobileOpenTimer, clearMobileRestoreReadyTimer, interactionMode]);

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
    pointerWithinCardIdRef.current = null;
    setMobileRestoreReadyCardId(null);
    setTransitionSourceCardId(cardId);
    dispatchInteraction({
      type: 'PAGE_TRANSITION_START',
      nowMs: typeof window !== 'undefined' ? window.performance.now() : 0
    });
  }, [clearHoverTimer, clearMobileCloseTimer, clearMobileOpenTimer, clearMobileRestoreReadyTimer]);

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
  }, [clearMobileCloseTimer, clearMobileOpenTimer, clearMobileRestoreReadyTimer, interactionMode, shellRef]);

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
        const anchorSettled = Math.abs((cardRect?.top ?? 0) - snapshot.anchorTopPx) <= 1;
        const titleSettled = Math.abs((titleRect?.top ?? cardRect?.top ?? 0) - snapshot.titleTopPx) <= 1;

        attempts += 1;
        if ((heightSettled && anchorSettled && titleSettled) || attempts >= 30) {
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
    dispatchMobileLifecycle({type: 'CLOSE_START'});
  }

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

    mobileCloseTimerRef.current = window.setTimeout(() => {
      mobileCloseTimerRef.current = null;
      dispatchInteraction({
        type: 'CARD_COLLAPSE',
        nowMs: typeof window !== 'undefined' ? window.performance.now() : 0,
        interactionMode,
        cardId: cardId ?? null
      });

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
    mobileLifecycleState.cardId,
    mobileLifecycleState.phase,
    mobileLifecycleState.snapshot,
    clearMobileRestoreReadyTimer,
    settleMobileCloseAfterRestore
  ]);

  const resolveCardInteractionBindings = (card: LandingCard): LandingCardInteractionBindings => {
    const pointerBlocked = isCardPointerInteractionBlocked(interactionState, card.id);
    const keyboardAriaDisabled = isCardKeyboardAriaDisabled(interactionState, card.id) || card.availability !== 'available';
    const cardState = resolveCardStateForId(interactionState, card.id);
    const transitionExpanded =
      interactionState.pageState === 'TRANSITIONING' &&
      transitionSourceCardId === card.id &&
      card.availability === 'available';
    const mobileOwnsCard = mobileLifecycleState.cardId === card.id;
    const mobilePhase: LandingCardMobilePhase = mobileOwnsCard ? mobileLifecycleState.phase : 'NORMAL';
    const mobileExpandedVisible =
      isMobileViewport &&
      mobileOwnsCard &&
      mobileLifecycleState.phase !== 'NORMAL' &&
      card.availability === 'available';
    const desktopClosingVisible =
      !isMobileViewport && desktopMotionState.closingCardId === card.id && card.availability === 'available';
    const desktopMotionRole: LandingCardDesktopMotionRole =
      desktopMotionState.handoffSourceCardId === card.id
        ? 'handoff-source'
        : desktopMotionState.handoffTargetCardId === card.id
          ? 'handoff-target'
          : desktopMotionState.openingCardId === card.id
            ? 'opening'
            : desktopMotionState.closingCardId === card.id
              ? 'closing'
              : !isMobileViewport &&
                  (transitionExpanded || (cardState === 'EXPANDED' && card.availability === 'available'))
                ? 'steady'
                : 'idle';
    const mobileInteractionLocked =
      isMobileViewport && mobileLifecycleState.phase !== 'NORMAL' && mobileLifecycleState.cardId !== card.id;
    const visualState: LandingCardVisualState =
      transitionExpanded ||
      mobileExpandedVisible ||
      desktopClosingVisible ||
      (cardState === 'EXPANDED' && card.availability === 'available')
        ? 'expanded'
        : cardState === 'FOCUSED'
          ? 'focused'
          : 'normal';
    const mobileSnapshot =
      mobileOwnsCard && mobileLifecycleState.snapshot
        ? {
            cardHeightPx: mobileLifecycleState.snapshot.cardHeightPx,
            anchorTopPx: mobileLifecycleState.snapshot.anchorTopPx,
            titleTopPx: mobileLifecycleState.snapshot.titleTopPx,
            snapshotWriteCount: mobileLifecycleState.snapshotWriteCount,
            restoreReady: mobileLifecycleState.restoreReady
          }
        : null;

    return {
      state: visualState,
      desktopMotionRole,
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
      mobileRestoreReady:
        mobileRestoreReadyCardId === card.id || (mobileOwnsCard && mobileLifecycleState.restoreReady),
      mobileSnapshot,
      onFocus: (event) => {
        desktopTransitionReasonRef.current =
          interactionState.expandedCardId && interactionState.expandedCardId !== card.id && card.availability === 'available'
            ? 'handoff'
            : 'expand';
        dispatchInteraction({
          type: 'CARD_FOCUS',
          nowMs: event.timeStamp,
          interactionMode,
          cardId: card.id,
          available: card.availability === 'available'
        });
      },
      onKeyDown: (event) => {
        if (event.key === 'Tab') {
          dispatchInteraction({type: 'KEYBOARD_MODE_ENTER'});

          if (card.availability !== 'available') {
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
            const previousCardId = resolveAdjacentCardId(cardIds, card.id, -1);
            desktopTransitionReasonRef.current = 'handoff';
            if (focusCardById(shellRef.current, previousCardId)) {
              event.preventDefault();
            }
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

          if (card.availability !== 'available') {
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
            available: true
          });
        }
      },
      onClick: (event) => {
        if (keyboardAriaDisabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        if (card.availability !== 'available') {
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
          available: true
        });
      },
      onMouseEnter: (event) => {
        if (interactionMode !== 'hover' || isMobileViewport) {
          return;
        }

        pointerWithinCardIdRef.current = card.id;
        const handoff = isAvailableHandoffCandidate({
          previousExpandedCardId: interactionState.expandedCardId,
          nextCardId: card.id,
          available: card.availability === 'available'
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
            available: true
          });
          return;
        }

        if (card.availability !== 'available') {
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
              available: true
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

        if (card.availability !== 'available') {
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
        startY: event.clientY
      };
      beginMobileClose();
    },
    onPointerMove: (event) => {
      if (!outsideGestureRef.current.active) {
        return;
      }

      if (shouldCancelOutsideCloseAsScroll(outsideGestureRef.current, event)) {
        outsideGestureRef.current.active = false;
        if (mobileLifecycleState.phase === 'OPENING') {
          dispatchMobileLifecycle({type: 'QUEUE_CLOSE_CANCEL'});
        }
      }
    },
    onPointerUp: () => {
      outsideGestureRef.current.active = false;
    },
    onPointerCancel: () => {
      outsideGestureRef.current.active = false;
    }
  };

  const activeVisualCardId = isMobileViewport
    ? mobileLifecycleState.cardId
    : transitionSourceCardId ?? interactionState.expandedCardId ?? desktopMotionState.closingCardId;

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
