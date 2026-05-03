'use client';

import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';

import {
  MOBILE_MENU_CLOSE_DURATION_MS,
  shouldCancelOutsideCloseAsScroll
} from '@/features/landing/gnb/behavior';
import type {MobileMenuState} from '@/features/landing/gnb/types';

/**
 * @future-move R-06
 * Keep this hook with the GNB behavior extraction group until the follow-up
 * ownership move is explicitly approved.
 */
type CloseReason = 'button' | 'outside' | 'escape';

type OutsideGesture = {
  active: boolean;
  startX: number;
  startY: number;
};

export function useGnbMobileMenu() {
  const [mobileMenuState, setMobileMenuState] = useState<MobileMenuState>('closed');
  const mobileMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const mobileMenuCloseTimerRef = useRef<number | null>(null);
  const mobileMenuCloseReasonRef = useRef<CloseReason | null>(null);
  const outsideGestureRef = useRef<OutsideGesture>({
    active: false,
    startX: 0,
    startY: 0
  });

  const clearMobileMenuCloseTimer = useCallback(() => {
    if (mobileMenuCloseTimerRef.current !== null) {
      window.clearTimeout(mobileMenuCloseTimerRef.current);
      mobileMenuCloseTimerRef.current = null;
    }
  }, []);

  const setMobileMenuOpen = useCallback(() => {
    setMobileMenuState('open');
  }, []);

  const completeMobileMenuClose = useCallback(() => {
    mobileMenuCloseReasonRef.current = null;
    setMobileMenuState('closed');
    mobileMenuTriggerRef.current?.focus();
  }, []);

  const requestMobileMenuClose = useCallback(
    (reason: CloseReason) => {
      if (mobileMenuState !== 'open') {
        return;
      }

      mobileMenuCloseReasonRef.current = reason;
      setMobileMenuState('closing');
      clearMobileMenuCloseTimer();
      mobileMenuCloseTimerRef.current = window.setTimeout(() => {
        completeMobileMenuClose();
      }, MOBILE_MENU_CLOSE_DURATION_MS);
    },
    [clearMobileMenuCloseTimer, completeMobileMenuClose, mobileMenuState]
  );

  const closeMobileMenuImmediate = useCallback(() => {
    clearMobileMenuCloseTimer();
    mobileMenuCloseReasonRef.current = null;
    setMobileMenuState('closed');
  }, [clearMobileMenuCloseTimer]);

  const cancelMobileMenuCloseFromScroll = useCallback(() => {
    if (mobileMenuState !== 'closing' || mobileMenuCloseReasonRef.current !== 'outside') {
      return;
    }

    clearMobileMenuCloseTimer();
    mobileMenuCloseReasonRef.current = null;
    setMobileMenuState('open');
  }, [clearMobileMenuCloseTimer, mobileMenuState]);

  const mobileMenuBackdropPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (mobileMenuState !== 'open') {
        return;
      }

      outsideGestureRef.current = {
        active: true,
        startX: event.clientX,
        startY: event.clientY
      };

      requestMobileMenuClose('outside');
    },
    [mobileMenuState, requestMobileMenuClose]
  );

  const mobileMenuBackdropPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!outsideGestureRef.current.active) {
        return;
      }

      if (
        shouldCancelOutsideCloseAsScroll({
          startX: outsideGestureRef.current.startX,
          startY: outsideGestureRef.current.startY,
          endX: event.clientX,
          endY: event.clientY
        })
      ) {
        outsideGestureRef.current.active = false;
        cancelMobileMenuCloseFromScroll();
      }
    },
    [cancelMobileMenuCloseFromScroll]
  );

  const mobileMenuBackdropPointerEnd = useCallback(() => {
    outsideGestureRef.current.active = false;
  }, []);

  useEffect(() => {
    if (mobileMenuState === 'closed') {
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
  }, [mobileMenuState]);

  return {
    mobileMenuState,
    mobileMenuTriggerRef,
    setMobileMenuOpen,
    requestMobileMenuClose,
    closeMobileMenuImmediate,
    clearMobileMenuCloseTimer,
    mobileMenuBackdropPointerDown,
    mobileMenuBackdropPointerMove,
    mobileMenuBackdropPointerEnd
  };
}
