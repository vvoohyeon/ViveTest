import {expect, test} from '@playwright/test';

import {clearTelemetryConsent, TELEMETRY_CONSENT_STORAGE_KEY} from './helpers/consent';
import {buildLocalizedPrimaryTestRoute} from './helpers/landing-fixture';

test.describe('Consent banner smoke', () => {
  test('@smoke deep-link first visit shows consent strip and accepts immediately', async ({page}) => {
    await clearTelemetryConsent(page);
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto(buildLocalizedPrimaryTestRoute('en'));

    const banner = page.getByTestId('telemetry-consent-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(
      'We use cookies and similar technologies to help the service work properly and to understand how it is used.'
    );
    await expect(page.getByTestId('test-instruction-overlay')).toBeVisible();

    await page.getByTestId('telemetry-consent-accept').click();
    await expect(banner).toBeHidden();
    await expect
      .poll(() => page.evaluate((key) => window.localStorage.getItem(key), TELEMETRY_CONSENT_STORAGE_KEY))
      .toBe('OPTED_IN');
  });

  test('@smoke deep-link first visit shows localized consent strip and denies immediately', async ({page}) => {
    await clearTelemetryConsent(page);
    await page.setViewportSize({width: 390, height: 844});
    await page.goto(buildLocalizedPrimaryTestRoute('kr'));

    const banner = page.getByTestId('telemetry-consent-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(
      '서비스가 원활하게 작동하고 이용 현황을 이해하기 위해 쿠키 및 유사 기술을 사용합니다.'
    );
    await expect(page.getByTestId('telemetry-consent-preferences')).toHaveText('설정');

    const messageBox = await page.locator('.telemetry-consent-banner-message').boundingBox();
    const actionsBox = await page.locator('.telemetry-consent-banner-actions').boundingBox();
    expect(messageBox).not.toBeNull();
    expect(actionsBox).not.toBeNull();
    expect((actionsBox?.y ?? 0) - (messageBox?.y ?? 0)).toBeGreaterThan((messageBox?.height ?? 0) / 2);

    await page.getByTestId('telemetry-consent-deny').click();
    await expect(banner).toBeHidden();
    await expect
      .poll(() => page.evaluate((key) => window.localStorage.getItem(key), TELEMETRY_CONSENT_STORAGE_KEY))
      .toBe('OPTED_OUT');
  });
});
