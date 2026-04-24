import type {MutableRefObject} from 'react';
import {useCallback, useLayoutEffect, useRef, useState} from 'react';

import {CORE_MOTION_DURATION_MS} from '@/features/landing/grid/hover-intent';

export type DesktopTransitionReason = 'expand' | 'collapse' | 'handoff';

export interface DesktopMotionState {
  openingCardVariant: string | null;
  closingCardVariant: string | null;
  cleanupPendingCardVariant: string | null;
  handoffSourceCardVariant: string | null;
  handoffTargetCardVariant: string | null;
}

interface UseDesktopMotionControllerInput {
  expandedCardVariant: string | null;
  isMobileViewport: boolean;
}

interface UseDesktopMotionControllerOutput {
  desktopMotionState: DesktopMotionState;
  desktopTransitionReasonRef: MutableRefObject<DesktopTransitionReason>;
  setDesktopTransitionReason: (reason: DesktopTransitionReason) => void;
  clearDesktopMotionRuntime: () => void;
  beginDesktopCleanupPending: (cardVariant: string) => void;
}

const initialDesktopMotionState: DesktopMotionState = {
  openingCardVariant: null,
  closingCardVariant: null,
  cleanupPendingCardVariant: null,
  handoffSourceCardVariant: null,
  handoffTargetCardVariant: null
};

export function useDesktopMotionController({
  expandedCardVariant,
  isMobileViewport
}: UseDesktopMotionControllerInput): UseDesktopMotionControllerOutput {
  const [desktopMotionState, setDesktopMotionState] = useState<DesktopMotionState>(initialDesktopMotionState);
  const desktopMotionTimerRef = useRef<number | null>(null);
  const desktopCleanupFrameRef = useRef<number | null>(null);
  const desktopCleanupFrameNestedRef = useRef<number | null>(null);
  const previousExpandedCardVariantRef = useRef<string | null>(null);
  const desktopTransitionReasonRef = useRef<DesktopTransitionReason>('expand');

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

  const clearDesktopMotionRuntime = useCallback(() => {
    clearDesktopMotionTimer();
    clearDesktopCleanupFrames();
  }, [clearDesktopCleanupFrames, clearDesktopMotionTimer]);

  const setDesktopTransitionReason = useCallback((reason: DesktopTransitionReason) => {
    desktopTransitionReasonRef.current = reason;
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
        handoffSourceCardVariant:
          current.handoffSourceCardVariant === cardVariant ? null : current.handoffSourceCardVariant,
        handoffTargetCardVariant:
          current.handoffTargetCardVariant === cardVariant ? null : current.handoffTargetCardVariant
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

  // Desktop closing/opening markers must land before paint or the trigger briefly flashes back in.
  /* eslint-disable react-hooks/set-state-in-effect */
  useLayoutEffect(() => {
    if (isMobileViewport) {
      previousExpandedCardVariantRef.current = null;
      clearDesktopMotionRuntime();
      setDesktopMotionState(initialDesktopMotionState);
      return;
    }

    const previousExpandedCardVariant = previousExpandedCardVariantRef.current;
    const nextExpandedCardVariant = expandedCardVariant;

    if (previousExpandedCardVariant === nextExpandedCardVariant) {
      return;
    }

    clearDesktopMotionRuntime();

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
      setDesktopMotionState(initialDesktopMotionState);
    }

    previousExpandedCardVariantRef.current = nextExpandedCardVariant;
  }, [
    beginDesktopCleanupPending,
    clearDesktopMotionRuntime,
    expandedCardVariant,
    isMobileViewport
  ]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return {
    desktopMotionState,
    desktopTransitionReasonRef,
    setDesktopTransitionReason,
    clearDesktopMotionRuntime,
    beginDesktopCleanupPending
  };
}
