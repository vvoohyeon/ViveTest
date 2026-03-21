import type {Page} from '@playwright/test';

export const TELEMETRY_CONSENT_STORAGE_KEY = 'vivetest-telemetry-consent';

export async function seedTelemetryConsent(page: Page, consentState: 'OPTED_IN' | 'OPTED_OUT') {
  await page.addInitScript(
    ([storageKey, nextConsentState]) => {
      window.localStorage.setItem(storageKey, nextConsentState);
    },
    [TELEMETRY_CONSENT_STORAGE_KEY, consentState] as const
  );
}

export async function clearTelemetryConsent(page: Page) {
  await page.addInitScript((storageKey) => {
    window.localStorage.removeItem(storageKey);
  }, TELEMETRY_CONSENT_STORAGE_KEY);
}
