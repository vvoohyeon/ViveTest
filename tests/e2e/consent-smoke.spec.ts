import {expect, test} from '@playwright/test';

import {clearTelemetryConsent, seedTelemetryConsent, TELEMETRY_CONSENT_STORAGE_KEY} from './helpers/consent';
import {
  buildLocalizedOptOutTestRoute,
  buildLocalizedPrimaryTestRoute,
  PRIMARY_AVAILABLE_TEST_CARD_ID
} from './helpers/landing-fixture';

test.describe('Consent shell smoke', () => {
  test('@smoke landing -> available test keeps the same persistent consent shell instance', async ({page}) => {
    await clearTelemetryConsent(page);
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en');

    const banner = page.getByTestId('telemetry-consent-banner');
    await expect(banner).toHaveAttribute('data-consent-mode', 'banner');
    const instanceId = await banner.getAttribute('data-consent-shell-instance');

    const firstCard = page.locator(`[data-card-id="${PRIMARY_AVAILABLE_TEST_CARD_ID}"]`);
    await firstCard.hover();
    await firstCard.locator('[data-slot="answerChoiceA"]').click();

    await page.waitForURL(buildLocalizedPrimaryTestRoute('en'));
    await expect(page.getByTestId('test-instruction-overlay')).toBeVisible();
    await expect(banner).toHaveAttribute('data-consent-mode', 'gate');
    await expect(banner).toHaveAttribute('data-consent-shell-instance', instanceId ?? '');
  });

  test('@smoke available deep-link + UNKNOWN shows instruction and gate together, then Agree unlocks start', async ({page}) => {
    await clearTelemetryConsent(page);
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto(buildLocalizedPrimaryTestRoute('en'));

    const gate = page.getByTestId('telemetry-consent-banner');
    const startButton = page.getByTestId('test-start-button');

    await expect(gate).toHaveAttribute('data-consent-mode', 'gate');
    await expect(page.getByTestId('test-instruction-overlay')).toBeVisible();
    await expect(startButton).toBeDisabled();

    await page.getByTestId('telemetry-consent-accept').click();

    await expect(page.getByTestId('telemetry-consent-banner')).toHaveCount(0);
    await expect(startButton).toBeEnabled();
    await expect
      .poll(() => page.evaluate((key) => window.localStorage.getItem(key), TELEMETRY_CONSENT_STORAGE_KEY))
      .toBe('OPTED_IN');
  });

  test('@smoke available deep-link + OPTED_OUT shows immediate blocked recovery without gate', async ({page}) => {
    await seedTelemetryConsent(page, 'OPTED_OUT');
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto(buildLocalizedPrimaryTestRoute('en'));

    await expect(page.getByTestId('telemetry-consent-banner')).toHaveCount(0);
    await expect(page.getByTestId('test-consent-blocked-panel')).toBeVisible();
    await expect(page.getByTestId('test-consent-blocked-suggestions')).toBeVisible();
  });

  test('@smoke final Disagree from the gate writes consent only after confirm and lands in blocked recovery', async ({
    page
  }) => {
    await clearTelemetryConsent(page);
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto(buildLocalizedPrimaryTestRoute('en'));

    await page.getByTestId('telemetry-consent-deny').click();
    await expect
      .poll(() => page.evaluate((key) => window.localStorage.getItem(key), TELEMETRY_CONSENT_STORAGE_KEY))
      .toBeNull();

    await page.getByTestId('telemetry-consent-deny-confirm').click();

    await expect(page.getByTestId('telemetry-consent-banner')).toHaveCount(0);
    await expect(page.getByTestId('test-consent-blocked-panel')).toBeVisible();
    await expect
      .poll(() => page.evaluate((key) => window.localStorage.getItem(key), TELEMETRY_CONSENT_STORAGE_KEY))
      .toBe('OPTED_OUT');
  });

  test('@smoke opt_out deep-link never triggers the gate and keeps the banner layout localized', async ({page}) => {
    await clearTelemetryConsent(page);
    await page.setViewportSize({width: 390, height: 844});
    await page.goto(buildLocalizedOptOutTestRoute('kr'));

    const banner = page.getByTestId('telemetry-consent-banner');
    await expect(banner).toHaveAttribute('data-consent-mode', 'banner');
    await expect(banner).toContainText(
      '서비스가 원활하게 작동하고 이용 현황을 이해하기 위해 쿠키 및 유사 기술을 사용합니다.'
    );
    await expect(page.getByTestId('test-start-button')).toBeEnabled();
    await expect(page.getByTestId('telemetry-consent-preferences')).toHaveText('설정');

    const messageBox = await page.locator('.telemetry-consent-banner-message').boundingBox();
    const actionsBox = await page.locator('.telemetry-consent-banner-actions').boundingBox();
    expect(messageBox).not.toBeNull();
    expect(actionsBox).not.toBeNull();
    expect((actionsBox?.y ?? 0) - (messageBox?.y ?? 0)).toBeGreaterThan((messageBox?.height ?? 0) / 2);
  });

  test('@smoke OPTED_OUT landing filters available cards immediately and preserves opt_out + unavailable cards', async ({
    page
  }) => {
    await seedTelemetryConsent(page, 'OPTED_OUT');
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en');

    await expect(page.locator('[data-card-id="test-qmbti"]')).toHaveCount(0);
    await expect(page.locator('[data-card-id="test-energy-check"]')).toHaveCount(1);
    await expect(page.locator('[data-card-id="test-coming-soon-1"]')).toHaveCount(1);
  });
});
