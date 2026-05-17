'use client';

import {useEffect} from 'react';

import {completePendingLandingTransition} from '@/features/transition/runtime';

interface UseLandingTransitionCompletionParams {
  runtimeReady: boolean;
  pendingTransitionId: string | null;
  clearPendingTransitionId: () => void;
}

export function useLandingTransitionCompletion({
  runtimeReady,
  pendingTransitionId,
  clearPendingTransitionId
}: UseLandingTransitionCompletionParams): void {
  useEffect(() => {
    if (!runtimeReady || pendingTransitionId === null) {
      return;
    }

    const expectedTransitionId = pendingTransitionId;
    const frame = window.requestAnimationFrame(() => {
      const completed = completePendingLandingTransition({targetType: 'test'});
      if (completed?.transitionId === expectedTransitionId) {
        clearPendingTransitionId();
      }
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [runtimeReady, pendingTransitionId, clearPendingTransitionId]);
}
