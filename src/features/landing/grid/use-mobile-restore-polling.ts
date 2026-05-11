import type {Dispatch, RefObject} from 'react';
import {useCallback, useEffect, useRef, useState} from 'react';

import type {
  LandingMobileLifecycleEvent,
  LandingMobileSnapshot
} from '@/features/landing/grid/mobile-lifecycle';

const MOBILE_RESTORE_READY_MARKER_MS = 400;
const MOBILE_RESTORE_POLLING_MAX_ATTEMPTS = 30;

interface UseMobileRestorePollingInput {
  shellRef: RefObject<HTMLElement | null>;
  dispatchMobileLifecycle: Dispatch<LandingMobileLifecycleEvent>;
  isRestoreSettled: (
    shellElement: HTMLElement | null,
    cardVariant: string,
    snapshot: LandingMobileSnapshot
  ) => boolean;
}

interface UseMobileRestorePollingOutput {
  mobileRestoreReadyVariant: string | null;
  clearMobileRestoreReadyTimer: () => void;
  resetMobileRestoreReadyVariant: () => void;
  markMobileRestoreReady: (cardVariant: string | null) => void;
  settleMobileCloseAfterRestore: (cardVariant: string, snapshot: LandingMobileSnapshot) => () => void;
}

export function useMobileRestorePolling({
  shellRef,
  dispatchMobileLifecycle,
  isRestoreSettled
}: UseMobileRestorePollingInput): UseMobileRestorePollingOutput {
  const [mobileRestoreReadyVariant, setMobileRestoreReadyVariant] = useState<string | null>(null);
  const mobileRestoreReadyTimerRef = useRef<number | null>(null);
  const restoreFrameRef = useRef<number | null>(null);

  const clearMobileRestoreReadyTimer = useCallback(() => {
    if (mobileRestoreReadyTimerRef.current !== null) {
      window.clearTimeout(mobileRestoreReadyTimerRef.current);
      mobileRestoreReadyTimerRef.current = null;
    }
  }, []);

  const clearRestoreFrame = useCallback(() => {
    if (restoreFrameRef.current !== null) {
      window.cancelAnimationFrame(restoreFrameRef.current);
      restoreFrameRef.current = null;
    }
  }, []);

  const resetMobileRestoreReadyVariant = useCallback(() => {
    setMobileRestoreReadyVariant(null);
  }, []);

  const markMobileRestoreReady = useCallback(
    (cardVariant: string | null) => {
      clearMobileRestoreReadyTimer();
      clearRestoreFrame();

      if (cardVariant) {
        setMobileRestoreReadyVariant(cardVariant);
        mobileRestoreReadyTimerRef.current = window.setTimeout(() => {
          mobileRestoreReadyTimerRef.current = null;
          setMobileRestoreReadyVariant((current) => (current === cardVariant ? null : current));
        }, MOBILE_RESTORE_READY_MARKER_MS);
      }

      dispatchMobileLifecycle({type: 'RESTORE_READY'});
      restoreFrameRef.current = window.requestAnimationFrame(() => {
        restoreFrameRef.current = null;
        dispatchMobileLifecycle({type: 'CLOSE_SETTLED'});
      });
    },
    [clearMobileRestoreReadyTimer, clearRestoreFrame, dispatchMobileLifecycle]
  );

  const settleMobileCloseAfterRestore = useCallback(
    (cardVariant: string, snapshot: LandingMobileSnapshot) => {
      let attempts = 0;

      clearRestoreFrame();

      const finishRestore = () => {
        restoreFrameRef.current = null;
        attempts += 1;
        if (
          isRestoreSettled(shellRef.current, cardVariant, snapshot) ||
          attempts >= MOBILE_RESTORE_POLLING_MAX_ATTEMPTS
        ) {
          markMobileRestoreReady(cardVariant);
          return;
        }

        restoreFrameRef.current = window.requestAnimationFrame(finishRestore);
      };

      restoreFrameRef.current = window.requestAnimationFrame(finishRestore);

      return clearRestoreFrame;
    },
    [clearRestoreFrame, isRestoreSettled, markMobileRestoreReady, shellRef]
  );

  useEffect(() => {
    return () => {
      clearMobileRestoreReadyTimer();
      clearRestoreFrame();
    };
  }, [clearMobileRestoreReadyTimer, clearRestoreFrame]);

  return {
    mobileRestoreReadyVariant,
    clearMobileRestoreReadyTimer,
    resetMobileRestoreReadyVariant,
    markMobileRestoreReady,
    settleMobileCloseAfterRestore
  };
}
