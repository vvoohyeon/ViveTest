'use client';

import {useTranslations} from 'next-intl';

import {ConsentBanner} from '@/features/landing/shell/consent-banner';
import {setTelemetryConsentState, useTelemetryConsentSource} from '@/features/landing/telemetry/consent-source';

export function TelemetryConsentBanner() {
  const t = useTranslations('consent');
  const consentSnapshot = useTelemetryConsentSource();

  const isVisible = consentSnapshot.synced && consentSnapshot.consentState === 'UNKNOWN';

  if (!isVisible) {
    return null;
  }

  return (
    <ConsentBanner
      regionLabel={t('regionLabel')}
      message={t('message')}
      primaryLabel={t('accept')}
      secondaryLabel={t('deny')}
      preferencesLabel={t('preferences')}
      preferencesTitle={t('preferencesTitle')}
      onPrimaryAction={() => {
        setTelemetryConsentState('OPTED_IN');
      }}
      onSecondaryAction={() => {
        setTelemetryConsentState('OPTED_OUT');
      }}
      onPreferencesAction={() => {}}
    />
  );
}
