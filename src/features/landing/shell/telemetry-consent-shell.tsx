'use client';

import {useTranslations} from 'next-intl';
import {useState} from 'react';

import {setTelemetryConsentState} from '@/features/landing/telemetry/consent-source';

export type TelemetryConsentShellMode = 'banner' | 'gate';

interface TelemetryConsentShellProps {
  instanceId: string;
  mode: TelemetryConsentShellMode;
}

export function TelemetryConsentShell({instanceId, mode}: TelemetryConsentShellProps) {
  const t = useTranslations('consent');
  const [denyConfirmationOpen, setDenyConfirmationOpen] = useState(false);

  const isGateMode = mode === 'gate';
  const regionLabel = isGateMode ? t('gateRegionLabel') : t('regionLabel');
  const title = isGateMode ? t('gateTitle') : null;
  const message =
    isGateMode && denyConfirmationOpen ? t('gateConfirmMessage') : isGateMode ? t('gateMessage') : t('message');

  return (
    <div
      className={`telemetry-consent-shell-layer telemetry-consent-shell-layer-${mode}`}
      data-testid="telemetry-consent-shell-layer"
      data-consent-mode={mode}
      data-consent-shell-instance={instanceId}
    >
      {isGateMode ? <div className="telemetry-consent-gate-backdrop" aria-hidden="true" /> : null}
      <section
        className={`telemetry-consent-banner telemetry-consent-banner-${mode}`}
        aria-label={regionLabel}
        data-testid="telemetry-consent-banner"
        data-consent-mode={mode}
        data-consent-shell-instance={instanceId}
      >
        {title ? <h2 className="telemetry-consent-banner-title">{title}</h2> : null}
        <p className="telemetry-consent-banner-message">{message}</p>
        <div className="telemetry-consent-banner-actions">
          {isGateMode && denyConfirmationOpen ? (
            <>
              <button
                type="button"
                className="telemetry-consent-banner-button telemetry-consent-banner-button-neutral"
                data-testid="telemetry-consent-deny-cancel"
                onClick={() => {
                  setDenyConfirmationOpen(false);
                }}
              >
                {t('gateKeepTesting')}
              </button>
              <button
                type="button"
                className="telemetry-consent-banner-button telemetry-consent-banner-button-neutral"
                data-testid="telemetry-consent-deny-confirm"
                onClick={() => {
                  setTelemetryConsentState('OPTED_OUT');
                }}
              >
                {t('gateConfirmDisagree')}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="telemetry-consent-banner-button telemetry-consent-banner-button-accent"
                data-testid="telemetry-consent-accept"
                onClick={() => {
                  setTelemetryConsentState('OPTED_IN');
                }}
              >
                {t('accept')}
              </button>
              <button
                type="button"
                className="telemetry-consent-banner-button telemetry-consent-banner-button-neutral"
                data-testid="telemetry-consent-deny"
                onClick={() => {
                  if (isGateMode) {
                    setDenyConfirmationOpen(true);
                    return;
                  }

                  setTelemetryConsentState('OPTED_OUT');
                }}
              >
                {t('deny')}
              </button>
              {!isGateMode ? (
                <button
                  type="button"
                  className="telemetry-consent-banner-link"
                  data-testid="telemetry-consent-preferences"
                  title={t('preferencesTitle')}
                  onClick={() => {}}
                >
                  {t('preferences')}
                </button>
              ) : null}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
