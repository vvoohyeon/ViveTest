import type {
  Dispatch,
  PointerEvent as ReactPointerEvent,
  RefObject
} from 'react';
import {useCallback, useEffect, useRef, useState} from 'react';

import type {
  LandingCardInteractionMode,
  LandingCardMobilePhase,
  LandingCardMobileTransientMode
} from '@/features/landing/grid/landing-grid-card';
import {
  MOBILE_EXPANDED_DURATION_MS,
  type LandingMobileLifecycleEvent,
  type LandingMobileLifecycleState
} from '@/features/landing/grid/mobile-lifecycle';
import {queueFocusCardByVariant} from '@/features/landing/grid/interaction-dom';
import type {
  LandingInteractionEvent,
  LandingInteractionState
} from '@/features/landing/model/interaction-state';

const MOBILE_OUTSIDE_SCROLL_THRESHOLD_PX = 10;
const MOBILE_RESTORE_READY_MARKER_MS = 400;

type LandingInteractionDispatch = Dispatch<LandingInteractionEvent>;
type LandingMobileLifecycleDispatch = Dispatch<LandingMobileLifecycleEvent>;

interface OutsideGesture {
  active: boolean;
  startX: number;
  startY: number;
  closeOnPointerUp: boolean;
}

export interface MobileBackdropBindings {
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

interface UseMobileCardLifecycleInput {
  interactionMode: LandingCardInteractionMode;
  interactionState: LandingInteractionState;
  dispatchInteraction: LandingInteractionDispatch;
  mobileLifecycleState: LandingMobileLifecycleState;
  dispatchMobileLifecycle: LandingMobileLifecycleDispatch;
  isMobileViewport: boolean;
  shellRef: RefObject<HTMLElement | null>;
  clearHoverTimer: () => void;
}

interface UseMobileCardLifecycleOutput {
  mobileRestoreReadyVariant: string | null;
  mobileTransientShellState: MobileTransientShellState;
  mobileBackdropBindings: MobileBackdropBindings;
  clearMobileTimers: () => void;
  resetMobileRuntime: () => void;
  beginMobileOpen: (cardVariant: string, syncInteraction?: boolean) => void;
  beginMobileClose: () => void;
  beginMobileKeyboardHandoff: (sourceVariant: string, nextCardVariant: string | null, nowMs: number) => void;
}

const initialMobileTransientShellState: MobileTransientShellState = {
  mode: 'NONE',
  cardVariant: null,
  snapshot: null
};

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

  const cardElement = shellElement.querySelector<HTMLElement>(
    `[data-testid="landing-grid-card"][data-card-variant="${cardVariant}"]`
  );
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

export function useMobileCardLifecycle({
  interactionMode,
  interactionState,
  dispatchInteraction,
  mobileLifecycleState,
  dispatchMobileLifecycle,
  isMobileViewport,
  shellRef,
  clearHoverTimer
}: UseMobileCardLifecycleInput): UseMobileCardLifecycleOutput {
  const [mobileRestoreReadyVariant, setMobileRestoreReadyCardVariant] = useState<string | null>(null);
  const [mobileTransientShellState, setMobileTransientShellState] = useState<MobileTransientShellState>(
    initialMobileTransientShellState
  );
  const mobileOpenTimerRef = useRef<number | null>(null);
  const mobileCloseTimerRef = useRef<number | null>(null);
  const mobileRestoreReadyTimerRef = useRef<number | null>(null);
  const mobileTransientShellTimerRef = useRef<number | null>(null);
  const outsideGestureRef = useRef<OutsideGesture>({
    active: false,
    startX: 0,
    startY: 0,
    closeOnPointerUp: false
  });

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

  const clearMobileTimers = useCallback(() => {
    clearMobileOpenTimer();
    clearMobileCloseTimer();
    clearMobileRestoreReadyTimer();
    clearMobileTransientShellTimer();
  }, [
    clearMobileCloseTimer,
    clearMobileOpenTimer,
    clearMobileRestoreReadyTimer,
    clearMobileTransientShellTimer
  ]);

  const resetMobileRuntime = useCallback(() => {
    clearHoverTimer();
    clearMobileTimers();
    setMobileRestoreReadyCardVariant(null);
    setMobileTransientShellState(initialMobileTransientShellState);
    outsideGestureRef.current = {
      active: false,
      startX: 0,
      startY: 0,
      closeOnPointerUp: false
    };
    dispatchMobileLifecycle({type: 'RESET'});
  }, [clearHoverTimer, clearMobileTimers, dispatchMobileLifecycle]);

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
    dispatchInteraction,
    dispatchMobileLifecycle,
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
    [clearMobileRestoreReadyTimer, dispatchMobileLifecycle, shellRef]
  );

  const beginMobileClose = useCallback(() => {
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
  }, [
    clearMobileOpenTimer,
    dispatchInteraction,
    dispatchMobileLifecycle,
    interactionMode,
    mobileLifecycleState.cardVariant,
    mobileLifecycleState.phase,
    mobileLifecycleState.snapshot,
    shellRef,
    startMobileTransientShell
  ]);

  const beginMobileKeyboardHandoff = useCallback(
    (sourceVariant: string, nextCardVariant: string | null, nowMs: number) => {
      clearMobileTimers();
      setMobileRestoreReadyCardVariant(null);
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
    [clearMobileTimers, dispatchInteraction, dispatchMobileLifecycle, interactionMode, shellRef]
  );

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

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isMobileViewport && mobileLifecycleState.phase !== 'NORMAL') {
      resetMobileRuntime();
      dispatchInteraction({
        type: 'CARD_COLLAPSE',
        nowMs: window.performance.now(),
        interactionMode,
        cardVariant: null
      });
    }
  }, [
    dispatchInteraction,
    interactionMode,
    isMobileViewport,
    mobileLifecycleState.phase,
    resetMobileRuntime
  ]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    return () => {
      clearMobileTimers();
    };
  }, [clearMobileTimers]);

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
    clearMobileRestoreReadyTimer,
    dispatchInteraction,
    dispatchMobileLifecycle,
    interactionMode,
    interactionState.expandedCardVariant,
    mobileLifecycleState.cardVariant,
    mobileLifecycleState.phase,
    mobileLifecycleState.snapshot,
    settleMobileCloseAfterRestore
  ]);

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

  return {
    mobileRestoreReadyVariant,
    mobileTransientShellState,
    mobileBackdropBindings,
    clearMobileTimers,
    resetMobileRuntime,
    beginMobileOpen,
    beginMobileClose,
    beginMobileKeyboardHandoff
  };
}
