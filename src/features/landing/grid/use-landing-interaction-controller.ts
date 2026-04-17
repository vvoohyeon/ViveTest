import type {
  FocusEvent as ReactFocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  RefObject
} from 'react';
import {useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState} from 'react';

import {isEnterableCard, type LandingCard} from '@/features/variant-registry';
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
  resolveCardStateForVariant,
  resolveCardTabIndex,
  type LandingInteractionState
} from '@/features/landing/model/interaction-state';
import {LANDING_TRANSITION_CLEANUP_EVENT} from '@/features/landing/transition/store';

const MOBILE_OUTSIDE_SCROLL_THRESHOLD_PX = 10;
const MOBILE_RESTORE_READY_MARKER_MS = 400;

const initialMobileTransientShellState: MobileTransientShellState = {
  mode: 'NONE',
  cardVariant: null,
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
  cardVariant: string | null;
  snapshot: LandingMobileLifecycleState['snapshot'];
}

interface DesktopMotionState {
  openingCardVariant: string | null;
  closingCardVariant: string | null;
  cleanupPendingCardVariant: string | null;
  handoffSourceCardVariant: string | null;
  handoffTargetCardVariant: string | null;
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
  prefersReducedMotion: boolean;
  mobileLifecycleState: LandingMobileLifecycleState;
  mobileBackdropBindings: MobileBackdropBindings;
  activeVisualCardVariant: string | null;
  mobileRestoreReadyVariant: string | null;
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

function resolveAdjacentCardVariant(cardVariants: readonly string[], currentCardVariant: string, step: 1 | -1): string | null {
  const index = cardVariants.indexOf(currentCardVariant);
  if (index < 0) {
    return null;
  }

  const nextIndex = index + step;
  if (nextIndex < 0 || nextIndex >= cardVariants.length) {
    return null;
  }

  return cardVariants[nextIndex] ?? null;
}

function focusCardByVariant(shellElement: HTMLElement | null, cardVariant: string | null): boolean {
  if (!shellElement || !cardVariant) {
    return false;
  }

  const selector = `[data-testid="landing-grid-card"][data-card-variant="${cardVariant}"] [data-testid="landing-grid-card-trigger"]`;
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

function queueFocusCardByVariant(shellElement: HTMLElement | null, cardVariant: string | null) {
  if (typeof window === 'undefined' || !cardVariant) {
    return;
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      focusCardByVariant(shellElement, cardVariant);
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

function captureMobileSnapshot(shellElement: HTMLElement | null, cardVariant: string) {
  if (!shellElement) {
    return {
      cardHeightPx: 0,
      anchorTopPx: 0,
      cardLeftPx: 0,
      cardWidthPx: 0,
      titleTopPx: 0
    };
  }

  const cardElement = shellElement.querySelector<HTMLElement>(`[data-testid="landing-grid-card"][data-card-variant="${cardVariant}"]`);
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

function resolveCardBoundaryElement(shellElement: HTMLElement | null, cardVariant: string): HTMLElement | null {
  if (!shellElement) {
    return null;
  }

  const cardElement = shellElement.querySelector<HTMLElement>(`[data-testid="landing-grid-card"][data-card-variant="${cardVariant}"]`);
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
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);
  const [interactionState, dispatchInteraction] = useReducer(
    reduceLandingInteractionState,
    initialLandingInteractionState
  );
  const [mobileLifecycleState, dispatchMobileLifecycle] = useReducer(
    reduceLandingMobileLifecycleState,
    initialLandingMobileLifecycleState
  );
  const [transitionSourceVariant, setTransitionSourceCardVariant] = useState<string | null>(null);
  const [desktopMotionState, setDesktopMotionState] = useState<DesktopMotionState>({
    openingCardVariant: null,
    closingCardVariant: null,
    cleanupPendingCardVariant: null,
    handoffSourceCardVariant: null,
    handoffTargetCardVariant: null
  });
  const [mobileRestoreReadyVariant, setMobileRestoreReadyCardVariant] = useState<string | null>(null);
  const [mobileTransientShellState, setMobileTransientShellState] = useState<MobileTransientShellState>(
    initialMobileTransientShellState
  );

  const interactionMode = useMemo(
    () => resolveInteractionMode(viewportWidth, hoverCapability),
    [hoverCapability, viewportWidth]
  );
  const cardVariants = useMemo(() => cards.map((card) => card.variant), [cards]);
  const firstEnterableCardVariant = useMemo(
    () => cards.find((card) => isEnterableCard(card))?.variant ?? null,
    [cards]
  );
  const isMobileViewport = viewportTier === 'mobile';

  const hoverTimerRef = useRef<number | null>(null);
  const hoverIntentTokenRef = useRef(0);
  const pointerWithinCardVariantRef = useRef<string | null>(null);
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
  const previousExpandedCardVariantRef = useRef<string | null>(null);
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
    (cardVariant: string) => {
      if (typeof window === 'undefined') {
        return;
      }

      clearDesktopCleanupFrames();
      setDesktopMotionState((current) => ({
        ...current,
        openingCardVariant: current.openingCardVariant === cardVariant ? null : current.openingCardVariant,
        closingCardVariant: current.closingCardVariant === cardVariant ? null : current.closingCardVariant,
        cleanupPendingCardVariant: cardVariant,
        handoffSourceCardVariant: current.handoffSourceCardVariant === cardVariant ? null : current.handoffSourceCardVariant,
        handoffTargetCardVariant: current.handoffTargetCardVariant === cardVariant ? null : current.handoffTargetCardVariant
      }));

      desktopCleanupFrameRef.current = window.requestAnimationFrame(() => {
        desktopCleanupFrameRef.current = null;
        desktopCleanupFrameNestedRef.current = window.requestAnimationFrame(() => {
          desktopCleanupFrameNestedRef.current = null;
          setDesktopMotionState((current) =>
            current.cleanupPendingCardVariant === cardVariant
              ? {
                  ...current,
                  cleanupPendingCardVariant: null
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
      setPrefersReducedMotion(query.matches);
      dispatchInteraction({
        type: query.matches ? 'REDUCED_MOTION_ENABLE' : 'REDUCED_MOTION_DISABLE',
        nowMs
      });
    };

    syncReducedMotion(window.performance.now());

    const handleReducedMotionChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
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

        if (!event.shiftKey && isDocumentLevelFocusTarget(event.target) && focusCardByVariant(shellRef.current, firstEnterableCardVariant)) {
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
      pointerWithinCardVariantRef.current = target?.dataset.cardVariant ?? null;
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
  }, [firstEnterableCardVariant, shellRef]);

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
        cardVariant: null
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
      previousExpandedCardVariantRef.current = null;
      clearDesktopMotionTimer();
      clearDesktopCleanupFrames();
      setDesktopMotionState({
        openingCardVariant: null,
        closingCardVariant: null,
        cleanupPendingCardVariant: null,
        handoffSourceCardVariant: null,
        handoffTargetCardVariant: null
      });
      return;
    }

    const previousExpandedCardVariant = previousExpandedCardVariantRef.current;
    const nextExpandedCardVariant = interactionState.expandedCardVariant;

    if (previousExpandedCardVariant === nextExpandedCardVariant) {
      return;
    }

    clearDesktopMotionTimer();
    clearDesktopCleanupFrames();

    if (previousExpandedCardVariant && nextExpandedCardVariant && previousExpandedCardVariant !== nextExpandedCardVariant) {
      setDesktopMotionState({
        openingCardVariant: nextExpandedCardVariant,
        closingCardVariant: null,
        cleanupPendingCardVariant: null,
        handoffSourceCardVariant: previousExpandedCardVariant,
        handoffTargetCardVariant: nextExpandedCardVariant
      });
      desktopMotionTimerRef.current = window.setTimeout(() => {
        setDesktopMotionState((current) => ({
          ...current,
          openingCardVariant: current.openingCardVariant === nextExpandedCardVariant ? null : current.openingCardVariant,
          handoffSourceCardVariant:
            current.handoffSourceCardVariant === previousExpandedCardVariant ? null : current.handoffSourceCardVariant,
          handoffTargetCardVariant:
            current.handoffTargetCardVariant === nextExpandedCardVariant ? null : current.handoffTargetCardVariant
        }));
      }, CORE_MOTION_DURATION_MS);
    } else if (nextExpandedCardVariant) {
      setDesktopMotionState({
        openingCardVariant: nextExpandedCardVariant,
        closingCardVariant: null,
        cleanupPendingCardVariant: null,
        handoffSourceCardVariant: null,
        handoffTargetCardVariant: null
      });
      desktopMotionTimerRef.current = window.setTimeout(() => {
        setDesktopMotionState((current) => ({
          ...current,
          openingCardVariant: current.openingCardVariant === nextExpandedCardVariant ? null : current.openingCardVariant
        }));
      }, CORE_MOTION_DURATION_MS);
    } else if (previousExpandedCardVariant && desktopTransitionReasonRef.current === 'collapse') {
      setDesktopMotionState({
        openingCardVariant: null,
        closingCardVariant: previousExpandedCardVariant,
        cleanupPendingCardVariant: null,
        handoffSourceCardVariant: null,
        handoffTargetCardVariant: null
      });
      desktopMotionTimerRef.current = window.setTimeout(() => {
        beginDesktopCleanupPending(previousExpandedCardVariant);
      }, CORE_MOTION_DURATION_MS);
    } else {
      setDesktopMotionState({
        openingCardVariant: null,
        closingCardVariant: null,
        cleanupPendingCardVariant: null,
        handoffSourceCardVariant: null,
        handoffTargetCardVariant: null
      });
    }

    previousExpandedCardVariantRef.current = nextExpandedCardVariant;
  }, [
    beginDesktopCleanupPending,
    clearDesktopCleanupFrames,
    clearDesktopMotionTimer,
    interactionState.expandedCardVariant,
    isMobileViewport
  ]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const collapseExpandedCard = useCallback(() => {
    clearHoverTimer();
    clearMobileOpenTimer();
    clearMobileCloseTimer();
    clearMobileRestoreReadyTimer();
    clearMobileTransientShellTimer();
    pointerWithinCardVariantRef.current = null;
    desktopTransitionReasonRef.current = 'collapse';
    setMobileRestoreReadyCardVariant(null);
    setTransitionSourceCardVariant(null);
    setMobileTransientShellState(initialMobileTransientShellState);
    dispatchMobileLifecycle({type: 'RESET'});
    dispatchInteraction({
      type: 'CARD_COLLAPSE',
      nowMs: typeof window !== 'undefined' ? window.performance.now() : 0,
      interactionMode,
      cardVariant: null
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

  const beginTransition = useCallback((cardVariant: string) => {
    clearHoverTimer();
    clearMobileOpenTimer();
    clearMobileCloseTimer();
    clearMobileRestoreReadyTimer();
    clearMobileTransientShellTimer();
    pointerWithinCardVariantRef.current = null;
    setMobileRestoreReadyCardVariant(null);
    setTransitionSourceCardVariant(cardVariant);
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
      cardVariant: string,
      snapshot: NonNullable<LandingMobileLifecycleState['snapshot']>
    ) => {
      clearMobileTransientShellTimer();
      setMobileTransientShellState({
        mode,
        cardVariant,
        snapshot
      });
      mobileTransientShellTimerRef.current = window.setTimeout(() => {
        mobileTransientShellTimerRef.current = null;
        setMobileTransientShellState((current) =>
          current.mode === mode && current.cardVariant === cardVariant
            ? initialMobileTransientShellState
            : current
        );
      }, MOBILE_EXPANDED_DURATION_MS);
    },
    [clearMobileTransientShellTimer]
  );

  const scheduleHoverIntent = (input: {
    cardVariant: string;
    delayMs: number;
    action: HoverIntentAction;
    run: () => void;
  }) => {
    clearHoverTimer();
    const nextToken = nextHoverIntentToken(hoverIntentTokenRef.current, input.cardVariant, input.action);
    hoverIntentTokenRef.current = nextToken.token;

    hoverTimerRef.current = window.setTimeout(() => {
      if (hoverIntentTokenRef.current !== nextToken.token) {
        return;
      }

      input.run();
    }, input.delayMs);
  };

  const isPointerInsideCardBoundary = useCallback(
    (cardVariant: string) => {
      if (!pointerLocationRef.current.valid) {
        return false;
      }

      const boundaryElement = resolveCardBoundaryElement(shellRef.current, cardVariant);
      if (!boundaryElement) {
        return false;
      }

      const {x, y} = pointerLocationRef.current;
      const rect = boundaryElement.getBoundingClientRect();
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    },
    [shellRef]
  );

  const beginMobileOpen = useCallback((cardVariant: string, syncInteraction = true) => {
    const snapshot = captureMobileSnapshot(shellRef.current, cardVariant);
    clearMobileOpenTimer();
    clearMobileCloseTimer();
    clearMobileRestoreReadyTimer();
    setMobileRestoreReadyCardVariant(null);
    startMobileTransientShell('OPENING', cardVariant, snapshot);

    dispatchMobileLifecycle({
      type: 'OPEN_START',
      cardVariant,
      snapshot
    });
    if (syncInteraction) {
      dispatchInteraction({
        type: 'CARD_EXPAND',
        nowMs: typeof window !== 'undefined' ? window.performance.now() : 0,
        interactionMode,
        cardVariant,
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
    (cardVariant: string, snapshot: NonNullable<LandingMobileLifecycleState['snapshot']>) => {
      let frame = 0;
      let attempts = 0;

      const finishRestore = () => {
        const cardElement = shellRef.current?.querySelector<HTMLElement>(
          `[data-testid="landing-grid-card"][data-card-variant="${cardVariant}"]`
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
        setMobileRestoreReadyCardVariant(cardVariant);
        mobileRestoreReadyTimerRef.current = window.setTimeout(() => {
          mobileRestoreReadyTimerRef.current = null;
          setMobileRestoreReadyCardVariant((current) => (current === cardVariant ? null : current));
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
    if (mobileLifecycleState.cardVariant && mobileLifecycleState.snapshot) {
      const closingSnapshot = captureMobileSnapshot(shellRef.current, mobileLifecycleState.cardVariant);
      startMobileTransientShell('CLOSING', mobileLifecycleState.cardVariant, closingSnapshot);
    }
    dispatchInteraction({
      type: 'CARD_COLLAPSE',
      nowMs: typeof window !== 'undefined' ? window.performance.now() : 0,
      interactionMode,
      cardVariant: mobileLifecycleState.cardVariant
    });
    dispatchMobileLifecycle({type: 'CLOSE_START'});
  }

  const beginMobileKeyboardHandoff = useCallback(
    (sourceVariant: string, nextCardVariant: string | null, nowMs: number) => {
      clearMobileOpenTimer();
      clearMobileCloseTimer();
      clearMobileRestoreReadyTimer();
      setMobileRestoreReadyCardVariant(null);
      clearMobileTransientShellTimer();
      setMobileTransientShellState(initialMobileTransientShellState);

      dispatchMobileLifecycle({type: 'RESET'});

      if (!nextCardVariant) {
        dispatchInteraction({
          type: 'CARD_COLLAPSE',
          nowMs,
          interactionMode,
          cardVariant: sourceVariant
        });
        return;
      }

      dispatchInteraction({
        type: 'CARD_COLLAPSE',
        nowMs,
        interactionMode,
        cardVariant: sourceVariant
      });
      queueFocusCardByVariant(shellRef.current, nextCardVariant);
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
      interactionState.expandedCardVariant === null ||
      mobileLifecycleState.phase !== 'NORMAL'
    ) {
      return;
    }

    const cardVariant = interactionState.expandedCardVariant;
    const frame = window.requestAnimationFrame(() => {
      beginMobileOpen(cardVariant, false);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [beginMobileOpen, interactionState.expandedCardVariant, isMobileViewport, mobileLifecycleState.phase]);

  useEffect(() => {
    if (mobileLifecycleState.phase !== 'CLOSING' || mobileCloseTimerRef.current !== null) {
      return;
    }

    const cardVariant = mobileLifecycleState.cardVariant;
    const snapshot = mobileLifecycleState.snapshot;
    let cancelRestore: (() => void) | undefined;

    if (cardVariant && interactionState.expandedCardVariant === cardVariant) {
      dispatchInteraction({
        type: 'CARD_COLLAPSE',
        nowMs: typeof window !== 'undefined' ? window.performance.now() : 0,
        interactionMode,
        cardVariant
      });
    }

    mobileCloseTimerRef.current = window.setTimeout(() => {
      mobileCloseTimerRef.current = null;
      if (cardVariant && snapshot) {
        cancelRestore = settleMobileCloseAfterRestore(cardVariant, snapshot);
        return;
      }

      clearMobileRestoreReadyTimer();
      if (cardVariant) {
        setMobileRestoreReadyCardVariant(cardVariant);
        mobileRestoreReadyTimerRef.current = window.setTimeout(() => {
          mobileRestoreReadyTimerRef.current = null;
          setMobileRestoreReadyCardVariant((current) => (current === cardVariant ? null : current));
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
    interactionState.expandedCardVariant,
    mobileLifecycleState.cardVariant,
    mobileLifecycleState.phase,
    mobileLifecycleState.snapshot,
    clearMobileRestoreReadyTimer,
    settleMobileCloseAfterRestore
  ]);

  const resolveCardInteractionBindings = (card: LandingCard): LandingCardInteractionBindings => {
    const cardEnterable = isEnterableCard(card);
    const pointerBlocked = isCardPointerInteractionBlocked(interactionState, card.variant);
    const keyboardAriaDisabled = isCardKeyboardAriaDisabled(interactionState, card.variant) || !cardEnterable;
    const cardState = resolveCardStateForVariant(interactionState, card.variant);
    const transitionExpanded =
      interactionState.pageState === 'TRANSITIONING' &&
      transitionSourceVariant === card.variant &&
      cardEnterable;
    const mobileOwnsCard = mobileLifecycleState.cardVariant === card.variant;
    const mobilePhase: LandingCardMobilePhase = mobileOwnsCard ? mobileLifecycleState.phase : 'NORMAL';
    const mobileTransientMode: LandingCardMobileTransientMode =
      mobileTransientShellState.cardVariant === card.variant ? mobileTransientShellState.mode : 'NONE';
    const desktopClosingVisible =
      !isMobileViewport && desktopMotionState.closingCardVariant === card.variant && cardEnterable;
    const desktopCleanupPending =
      !isMobileViewport && desktopMotionState.cleanupPendingCardVariant === card.variant && cardEnterable;
    const desktopMotionRole: LandingCardDesktopMotionRole =
      desktopMotionState.handoffSourceCardVariant === card.variant
        ? 'handoff-source'
        : desktopMotionState.handoffTargetCardVariant === card.variant
          ? 'handoff-target'
          : desktopMotionState.openingCardVariant === card.variant
            ? 'opening'
            : desktopMotionState.closingCardVariant === card.variant
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
      (mobileLifecycleState.cardVariant !== card.variant || mobileLifecycleState.phase !== 'OPEN');
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
      mobileTransientShellState.cardVariant === card.variant && mobileTransientShellState.snapshot
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
          restoreReady: mobileRestoreReadyVariant === card.variant || (mobileOwnsCard && mobileLifecycleState.restoreReady)
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
          beginMobileKeyboardHandoff(card.variant, resolveAdjacentCardVariant(cardVariants, card.variant, -1) ?? card.variant, event.timeStamp);
          return;
        }

        if (focusCardByVariant(shellRef.current, card.variant)) {
          event.preventDefault();
        }
        return;
      }

      if (focusIndex < focusables.length - 1) {
        event.preventDefault();
        focusables[focusIndex + 1]?.focus();
        return;
      }

      const nextCardVariant = resolveAdjacentCardVariant(cardVariants, card.variant, 1);
      if (isMobileViewport) {
        event.preventDefault();
        beginMobileKeyboardHandoff(card.variant, nextCardVariant, event.timeStamp);
        return;
      }

      desktopTransitionReasonRef.current = 'handoff';
      if (focusCardByVariant(shellRef.current, nextCardVariant)) {
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
          : resolveCardTabIndex(interactionState, card.variant),
      mobilePhase,
      mobileTransientMode,
      mobileRestoreReady:
        mobileRestoreReadyVariant === card.variant || (mobileOwnsCard && mobileLifecycleState.restoreReady),
      mobileSnapshot,
      onFocus: (event) => {
        desktopTransitionReasonRef.current =
          interactionState.expandedCardVariant && interactionState.expandedCardVariant !== card.variant && cardEnterable
            ? 'handoff'
            : interactionState.expandedCardVariant && interactionState.expandedCardVariant !== card.variant
              ? 'collapse'
              : 'expand';
        dispatchInteraction({
          type: 'CARD_FOCUS',
          nowMs: event.timeStamp,
          interactionMode,
          cardVariant: card.variant,
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
          const isExpanded = interactionState.expandedCardVariant === card.variant;
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
            const nextCardVariant = resolveAdjacentCardVariant(cardVariants, card.variant, 1);
            desktopTransitionReasonRef.current = 'handoff';
            if (focusCardByVariant(shellRef.current, nextCardVariant)) {
              event.preventDefault();
            }
            return;
          }

          if (event.shiftKey && firstFocusable && target === firstFocusable) {
            if (isMobileViewport) {
              event.preventDefault();
              beginMobileKeyboardHandoff(card.variant, resolveAdjacentCardVariant(cardVariants, card.variant, -1) ?? card.variant, event.timeStamp);
              return;
            }

            const previousCardVariant = resolveAdjacentCardVariant(cardVariants, card.variant, -1);
            desktopTransitionReasonRef.current = 'handoff';
            if (focusCardByVariant(shellRef.current, previousCardVariant)) {
              event.preventDefault();
            }
            return;
          }

          if (event.shiftKey && target === event.currentTarget) {
            const previousCardVariant = resolveAdjacentCardVariant(cardVariants, card.variant, -1);
            if (isMobileViewport) {
              event.preventDefault();
              if (previousCardVariant) {
                beginMobileKeyboardHandoff(card.variant, previousCardVariant, event.timeStamp);
                return;
              }

              beginMobileKeyboardHandoff(card.variant, null, event.timeStamp);
              queueLandingReverseGnbTargetFocus();
              return;
            }

            desktopTransitionReasonRef.current = 'handoff';

            if (focusCardByVariant(shellRef.current, previousCardVariant)) {
              event.preventDefault();
              return;
            }

            desktopTransitionReasonRef.current = 'collapse';
            dispatchInteraction({
              type: 'CARD_COLLAPSE',
              nowMs: event.timeStamp,
              interactionMode,
              cardVariant: card.variant
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
      onMouseEnter: (event) => {
        if (interactionMode !== 'hover' || isMobileViewport) {
          return;
        }

        pointerWithinCardVariantRef.current = cardEnterable ? card.variant : null;
        const handoff = isEnterableHandoffCandidate({
          previousExpandedCardVariant: interactionState.expandedCardVariant,
          nextCardVariant: card.variant,
          enterable: cardEnterable
        });

        if (handoff) {
          desktopTransitionReasonRef.current = 'handoff';
          dispatchInteraction({
            type: 'CARD_COLLAPSE',
            nowMs: event.timeStamp,
            interactionMode,
            cardVariant: interactionState.expandedCardVariant
          });
          dispatchInteraction({
            type: 'CARD_EXPAND',
            nowMs: event.timeStamp,
            interactionMode,
            cardVariant: card.variant,
            available: cardEnterable
          });
          return;
        }

        if (!cardEnterable) {
          clearHoverTimer();
          if (interactionState.expandedCardVariant) {
            desktopTransitionReasonRef.current = 'collapse';
            dispatchInteraction({
              type: 'CARD_COLLAPSE',
              nowMs: event.timeStamp,
              interactionMode,
              cardVariant: interactionState.expandedCardVariant
            });
          }
          return;
        }

        scheduleHoverIntent({
          cardVariant: card.variant,
          delayMs: DESKTOP_EXPAND_DELAY_MS,
          action: 'expand',
          run: () => {
            if (pointerWithinCardVariantRef.current !== card.variant) {
              return;
            }

            desktopTransitionReasonRef.current = 'expand';
            dispatchInteraction({
              type: 'CARD_EXPAND',
              nowMs: typeof window !== 'undefined' ? window.performance.now() : event.timeStamp,
              interactionMode,
              cardVariant: card.variant,
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

        pointerWithinCardVariantRef.current = null;

        if (!cardEnterable) {
          return;
        }

        scheduleHoverIntent({
          cardVariant: card.variant,
          delayMs: DESKTOP_COLLAPSE_DELAY_MS,
          action: 'collapse',
          run: () => {
            if (pointerWithinCardVariantRef.current !== null || isPointerInsideCardBoundary(card.variant)) {
              return;
            }

            desktopTransitionReasonRef.current = 'collapse';
            dispatchInteraction({
              type: 'CARD_COLLAPSE',
              nowMs: typeof window !== 'undefined' ? window.performance.now() : event.timeStamp,
              interactionMode,
              cardVariant: card.variant
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
          beginTransition(card.variant);
        }
        event.preventDefault();
      },
      onPrimaryCtaClick: (event) => {
        if (card.type !== 'blog') {
          return;
        }

        const shouldBeginTransition = onPrimaryCtaSelect?.(card) !== false;
        if (shouldBeginTransition) {
          beginTransition(card.variant);
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

  const activeVisualCardVariant = isMobileViewport
    ? mobileLifecycleState.cardVariant ?? mobileTransientShellState.cardVariant
    : transitionSourceVariant ??
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
