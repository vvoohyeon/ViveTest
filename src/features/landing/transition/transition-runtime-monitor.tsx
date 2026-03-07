'use client';

import {usePathname} from 'next/navigation';
import {useEffect} from 'react';

import type {AppLocale} from '@/config/site';
import {syncTelemetryConsent} from '@/features/landing/telemetry/runtime';
import {terminatePendingLandingTransition} from '@/features/landing/transition/runtime';
import {usePendingLandingTransition} from '@/features/landing/transition/use-pending-landing-transition';

export const LANDING_TRANSITION_TIMEOUT_MS = 1600;

interface TransitionRuntimeMonitorProps {
  locale: AppLocale;
}

export function TransitionRuntimeMonitor({locale}: TransitionRuntimeMonitorProps) {
  const pathname = usePathname();
  const pendingTransition = usePendingLandingTransition();

  useEffect(() => {
    if (!pendingTransition) {
      return;
    }

    const elapsedMs = Math.max(0, Date.now() - pendingTransition.startedAtMs);
    const timeoutMs = Math.max(0, LANDING_TRANSITION_TIMEOUT_MS - elapsedMs);
    const timer = window.setTimeout(() => {
      syncTelemetryConsent();
      terminatePendingLandingTransition({
        locale,
        route: pathname,
        eventType: 'transition_fail',
        resultReason: 'DESTINATION_TIMEOUT'
      });
    }, timeoutMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [locale, pathname, pendingTransition]);

  return null;
}
