'use client';

import {usePathname} from 'next/navigation';
import {useEffect} from 'react';

import {LANDING_TRANSITION_TIMEOUT_MS} from '@/features/transition/constants';
import {terminatePendingLandingTransition} from '@/features/transition/runtime';
import {usePendingLandingTransition} from '@/features/transition/use-pending-landing-transition';

export function TransitionRuntimeMonitor() {
  const pathname = usePathname();
  const pendingTransition = usePendingLandingTransition();

  useEffect(() => {
    if (!pendingTransition) {
      return;
    }

    const elapsedMs = Math.max(0, Date.now() - pendingTransition.startedAtMs);
    const timeoutMs = Math.max(0, LANDING_TRANSITION_TIMEOUT_MS - elapsedMs);
    const timer = window.setTimeout(() => {
      terminatePendingLandingTransition({
        signal: 'transition_fail',
        resultReason: 'DESTINATION_TIMEOUT'
      });
    }, timeoutMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [pathname, pendingTransition]);

  return null;
}
