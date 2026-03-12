'use client';

import {Analytics} from '@vercel/analytics/next';
import {useTelemetryConsentSource} from '@/features/landing/telemetry/consent-source';

export function VercelAnalyticsGate() {
  const consentSnapshot = useTelemetryConsentSource();

  // same-tab 상태 변경도 즉시 반영되도록 메모리 consent source를 직접 구독한다.
  if (!consentSnapshot.synced || consentSnapshot.consentState !== 'OPTED_IN') {
    return null;
  }

  return <Analytics />;
}
