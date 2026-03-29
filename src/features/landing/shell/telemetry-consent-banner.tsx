'use client';

import {useTelemetryConsentSource} from '@/features/landing/telemetry/consent-source';
import {TelemetryConsentShell} from '@/features/landing/shell/telemetry-consent-shell';

export function TelemetryConsentBanner() {
  const consentSnapshot = useTelemetryConsentSource();

  if (!consentSnapshot.synced || consentSnapshot.consentState !== 'UNKNOWN') {
    return null;
  }

  return <TelemetryConsentShell instanceId="legacy-consent-banner" mode="banner" />;
}
