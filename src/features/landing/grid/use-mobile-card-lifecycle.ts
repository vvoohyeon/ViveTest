import type {Dispatch, RefObject} from 'react';
import {useCallback, useEffect, useRef} from 'react';

import type {LandingCardInteractionMode} from '@/features/landing/grid/landing-grid-card';
import {MOBILE_EXPANDED_DURATION_MS, type LandingMobileLifecycleEvent, type LandingMobileLifecycleState} from '@/features/landing/grid/mobile-lifecycle';
import {captureMobileSnapshot, isMobileSnapshotRestoreSettled} from '@/features/landing/grid/mobile-card-lifecycle-dom';
import {type MobileBackdropBindings, useMobileBackdropGesture} from '@/features/landing/grid/use-mobile-backdrop-gesture';
import {useMobileRestorePolling} from '@/features/landing/grid/use-mobile-restore-polling';
import {useMobileScrollLock} from '@/features/landing/grid/use-mobile-scroll-lock';
import {type MobileTransientShellState, useMobileTransientShell} from '@/features/landing/grid/use-mobile-transient-shell';
import {queueFocusCardByVariant} from '@/features/landing/grid/interaction-dom';
import type {LandingInteractionEvent, LandingInteractionState} from '@/features/landing/model/interaction-state';

type LandingInteractionDispatch = Dispatch<LandingInteractionEvent>;
type LandingMobileLifecycleDispatch = Dispatch<LandingMobileLifecycleEvent>;

export type {MobileBackdropBindings} from '@/features/landing/grid/use-mobile-backdrop-gesture';

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
  const mobileOpenTimerRef = useRef<number | null>(null);
  const mobileCloseTimerRef = useRef<number | null>(null);
  const {
    mobileRestoreReadyVariant,
    clearMobileRestoreReadyTimer,
    resetMobileRestoreReadyVariant,
    markMobileRestoreReady,
    settleMobileCloseAfterRestore
  } = useMobileRestorePolling({
    shellRef,
    dispatchMobileLifecycle,
    isRestoreSettled: isMobileSnapshotRestoreSettled
  });
  const {
    mobileTransientShellState,
    clearMobileTransientShellTimer,
    resetMobileTransientShell,
    startMobileTransientShell
  } = useMobileTransientShell();

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

  const clearMobileTimers = useCallback(() => {
    clearMobileOpenTimer();
    clearMobileCloseTimer();
    clearMobileRestoreReadyTimer();
    clearMobileTransientShellTimer();
  }, [clearMobileCloseTimer, clearMobileOpenTimer, clearMobileRestoreReadyTimer, clearMobileTransientShellTimer]);

  const resetMobileRuntime = useCallback(() => {
    clearHoverTimer();
    clearMobileTimers();
    resetMobileRestoreReadyVariant();
    resetMobileTransientShell();
    dispatchMobileLifecycle({type: 'RESET'});
  }, [clearHoverTimer, clearMobileTimers, dispatchMobileLifecycle, resetMobileRestoreReadyVariant, resetMobileTransientShell]);

  const beginMobileOpen = useCallback((cardVariant: string, syncInteraction = true) => {
    const snapshot = captureMobileSnapshot(shellRef.current, cardVariant);
    clearMobileOpenTimer();
    clearMobileCloseTimer();
    clearMobileRestoreReadyTimer();
    resetMobileRestoreReadyVariant();
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
    clearMobileCloseTimer, clearMobileOpenTimer, clearMobileRestoreReadyTimer, dispatchInteraction,
    dispatchMobileLifecycle, interactionMode, resetMobileRestoreReadyVariant, shellRef, startMobileTransientShell
  ]);

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
    clearMobileOpenTimer, dispatchInteraction, dispatchMobileLifecycle, interactionMode,
    mobileLifecycleState.cardVariant, mobileLifecycleState.phase, mobileLifecycleState.snapshot, shellRef,
    startMobileTransientShell
  ]);

  const beginMobileKeyboardHandoff = useCallback(
    (sourceVariant: string, nextCardVariant: string | null, nowMs: number) => {
      clearMobileTimers();
      resetMobileRestoreReadyVariant();
      resetMobileTransientShell();

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
      clearMobileTimers, dispatchInteraction, dispatchMobileLifecycle, interactionMode,
      resetMobileRestoreReadyVariant, resetMobileTransientShell, shellRef
    ]
  );

  useMobileScrollLock(mobileLifecycleState.phase);

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
  }, [dispatchInteraction, interactionMode, isMobileViewport, mobileLifecycleState.phase, resetMobileRuntime]);

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

      markMobileRestoreReady(cardVariant);
    }, MOBILE_EXPANDED_DURATION_MS);

    return () => {
      clearMobileCloseTimer();
      cancelRestore?.();
    };
  }, [
    clearMobileCloseTimer, dispatchInteraction, interactionMode, interactionState.expandedCardVariant,
    markMobileRestoreReady, mobileLifecycleState.cardVariant, mobileLifecycleState.phase,
    mobileLifecycleState.snapshot, settleMobileCloseAfterRestore
  ]);

  const mobileBackdropBindings = useMobileBackdropGesture({
    isMobileViewport,
    phase: mobileLifecycleState.phase,
    beginMobileClose,
    dispatchMobileLifecycle
  });

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
