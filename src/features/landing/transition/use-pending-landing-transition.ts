'use client';

import {useEffect, useState} from 'react';

import {
  LANDING_TRANSITION_STORE_EVENT,
  readPendingLandingTransition,
  type PendingLandingTransition
} from '@/features/landing/transition/store';

export function usePendingLandingTransition(): PendingLandingTransition | null {
  const [pendingTransition, setPendingTransition] = useState<PendingLandingTransition | null>(
    readPendingLandingTransition
  );

  useEffect(() => {
    const syncPendingTransition = () => {
      setPendingTransition(readPendingLandingTransition());
    };

    syncPendingTransition();
    window.addEventListener(LANDING_TRANSITION_STORE_EVENT, syncPendingTransition);
    return () => {
      window.removeEventListener(LANDING_TRANSITION_STORE_EVENT, syncPendingTransition);
    };
  }, []);

  return pendingTransition;
}
