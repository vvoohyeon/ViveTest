'use client';

import {SpeedInsights} from '@vercel/speed-insights/next';

import {useTelemetryConsentSource} from '@/features/landing/telemetry/consent-source';

export function VercelSpeedInsightsGate() {
  const consentSnapshot = useTelemetryConsentSource();

  // Analytics와 동일하게 same-tab consent 변경을 즉시 반영한다.
  if (!consentSnapshot.synced || consentSnapshot.consentState !== 'OPTED_IN') {
    return null;
  }

  return <SpeedInsights />;
}
