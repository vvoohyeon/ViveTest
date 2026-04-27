import {expect, test, type Page} from '@playwright/test';

import {
  clearTelemetryConsent,
  seedTelemetryConsent,
  TELEMETRY_CONSENT_STORAGE_KEY
} from './helpers/consent';
import {
  buildLocalizedTestRoute,
  buildLocalizedPrimaryOptOutTestRoute,
  buildLocalizedPrimaryTestRoute,
  PRIMARY_AVAILABLE_TEST_VARIANT,
  PRIMARY_OPT_OUT_TEST_VARIANT,
  TEST_VARIANT_INSTRUCTION_FIXTURES_EN
} from './helpers/landing-fixture';

const UNKNOWN_AVAILABLE_NOTE =
  'For a better experience, please agree to the terms to proceed with the test.';
const UNKNOWN_OPT_OUT_NOTE =
  'For a better experience, please agree to the terms before proceeding with the test. You can still continue without agreeing.';
const OPTED_OUT_AVAILABLE_WARNING =
  "This test is only available to users who have agreed. We're sorry, but if you keep your current preference, you will not be able to take this test.";

function getInstructionFixture(variant: string) {
  const fixture = TEST_VARIANT_INSTRUCTION_FIXTURES_EN.find((candidate) => candidate.variant === variant);
  if (!fixture) {
    throw new Error(`Missing test instruction fixture for variant: ${variant}`);
  }

  return fixture;
}

const AVAILABLE_INSTRUCTION_EN = getInstructionFixture(PRIMARY_AVAILABLE_TEST_VARIANT).instruction;
const OPT_OUT_INSTRUCTION_EN = getInstructionFixture(PRIMARY_OPT_OUT_TEST_VARIANT).instruction;

async function readConsent(page: Page) {
  return page.evaluate((key) => window.localStorage.getItem(key), TELEMETRY_CONSENT_STORAGE_KEY);
}

async function readInstructionSeen(page: Page, variant: string) {
  return page.evaluate((key) => window.sessionStorage.getItem(key), `vivetest-test-instruction-seen:${variant}`);
}

async function beginLandingTestIngress(page: Page, cardVariant: string) {
  const card = page.locator(`[data-card-variant="${cardVariant}"]`);
  await card.getByTestId('landing-grid-card-trigger').click();
  await card.locator('[data-slot="answerChoiceA"]').click();
}

async function expectNoLegacyInstructionUi(page: Page) {
  await expect(page.getByTestId('test-local-consent-banner')).toHaveCount(0);
  await expect(page.getByTestId('test-instruction-dialog')).toHaveCount(0);
  await expect(page.getByTestId('test-dialog-close-button')).toHaveCount(0);
  await expect(page.getByTestId('test-dialog-confirm-button')).toHaveCount(0);
}

async function readConsentBannerLayoutMetrics(page: Page) {
  return page.evaluate(() => {
    const banner = document.querySelector<HTMLElement>('[data-testid="telemetry-consent-banner"]');
    const message = document.querySelector<HTMLElement>('.telemetry-consent-banner-message');
    const actions = document.querySelector<HTMLElement>('.telemetry-consent-banner-actions');

    if (!banner || !message || !actions) {
      throw new Error('Expected telemetry consent banner landmarks to be present.');
    }

    const bannerStyle = getComputedStyle(banner);
    const messageStyle = getComputedStyle(message);
    const actionsStyle = getComputedStyle(actions);
    const bannerRect = banner.getBoundingClientRect();

    return {
      banner: {
        display: bannerStyle.display,
        maxWidth: bannerStyle.maxWidth,
        flexWrap: bannerStyle.flexWrap,
        width: bannerRect.width
      },
      message: {
        flexBasis: messageStyle.flexBasis
      },
      actions: {
        display: actionsStyle.display,
        justifyContent: actionsStyle.justifyContent
      }
    };
  });
}

test.describe('Instruction consent contract smoke', () => {
  test('@smoke landing unknown consent keeps the desktop consent banner flex and max-width contract', async ({page}) => {
    await clearTelemetryConsent(page);
    await page.setViewportSize({width: 1600, height: 1000});
    await page.goto('/en');

    await expect(page.getByTestId('telemetry-consent-banner')).toBeVisible();

    const metrics = await readConsentBannerLayoutMetrics(page);

    expect(metrics.banner.display).toBe('flex');
    expect(metrics.banner.maxWidth).toBe('1280px');
    expect(metrics.banner.flexWrap).toBe('nowrap');
    expect(metrics.banner.width).toBeCloseTo(1280, 0);
    expect(metrics.message.flexBasis).toBe('520px');
    expect(metrics.actions.display).toBe('flex');
    expect(metrics.actions.justifyContent).toBe('flex-end');
  });

  test('@smoke assertion:B20-instruction-contract-display landing UNKNOWN available shows variant instruction with divider/note and Deny and Abandon returns home without instructionSeen', async ({
    page
  }) => {
    await clearTelemetryConsent(page);
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    await beginLandingTestIngress(page, PRIMARY_AVAILABLE_TEST_VARIANT);
    await expect(page.getByTestId('test-instruction-overlay')).toBeVisible();
    await expect(page.getByTestId('test-instruction-body')).toHaveText(AVAILABLE_INSTRUCTION_EN);
    await expect(page.getByTestId('test-instruction-divider')).toBeVisible();
    await expect(page.getByTestId('test-instruction-note')).toHaveText(UNKNOWN_AVAILABLE_NOTE);
    await expect(page.getByTestId('test-accept-all-and-start-button')).toHaveText('Accept all and start');
    await expect(page.getByTestId('test-deny-and-abandon-button')).toHaveText('Deny and abandon');
    await expectNoLegacyInstructionUi(page);

    await page.getByTestId('test-deny-and-abandon-button').click();
    await expect(page).toHaveURL(/\/en$/u);
    await expect.poll(() => readConsent(page)).toBe('OPTED_OUT');
    await expect.poll(() => readInstructionSeen(page, PRIMARY_AVAILABLE_TEST_VARIANT)).toBeNull();
    await expect(page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`)).toHaveCount(0);
    await expect(page.locator(`[data-card-variant="${PRIMARY_OPT_OUT_TEST_VARIANT}"]`)).toHaveCount(1);
  });

  test('@smoke assertion:B22-secondary-cta-contract landing UNKNOWN opt_out shows variant instruction with divider/note and Deny and Start continues from Q2', async ({
    page
  }) => {
    await clearTelemetryConsent(page);
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    await beginLandingTestIngress(page, PRIMARY_OPT_OUT_TEST_VARIANT);
    await expect(page.getByTestId('test-instruction-body')).toHaveText(OPT_OUT_INSTRUCTION_EN);
    await expect(page.getByTestId('test-instruction-divider')).toBeVisible();
    await expect(page.getByTestId('test-instruction-note')).toHaveText(UNKNOWN_OPT_OUT_NOTE);
    await expect(page.getByTestId('test-deny-and-start-button')).toHaveText('Deny and start');
    await expectNoLegacyInstructionUi(page);

    await page.getByTestId('test-deny-and-start-button').click();
    await expect.poll(() => readConsent(page)).toBe('OPTED_OUT');
    await expect.poll(() => readInstructionSeen(page, PRIMARY_OPT_OUT_TEST_VARIANT)).toBe('true');
    await expect(page.getByTestId('test-instruction-overlay')).toBeHidden();
    await expect(page.getByTestId('test-progress')).toHaveText('25%');
  });

  test('@smoke assertion:B21-accept-all-and-start-contract deep-link UNKNOWN available uses note-based CTA contract and Accept All and Start begins at Q1', async ({
    page
  }) => {
    await clearTelemetryConsent(page);
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto(buildLocalizedPrimaryTestRoute('en'));

    await expect(page.getByTestId('test-instruction-body')).toHaveText(AVAILABLE_INSTRUCTION_EN);
    await expect(page.getByTestId('test-instruction-divider')).toBeVisible();
    await expect(page.getByTestId('test-instruction-note')).toHaveText(UNKNOWN_AVAILABLE_NOTE);
    await expect(page.getByTestId('test-accept-all-and-start-button')).toBeVisible();
    await expect(page.getByTestId('test-deny-and-abandon-button')).toBeVisible();
    await expectNoLegacyInstructionUi(page);

    await page.getByTestId('test-accept-all-and-start-button').click();
    await expect.poll(() => readConsent(page)).toBe('OPTED_IN');
    await expect.poll(() => readInstructionSeen(page, PRIMARY_AVAILABLE_TEST_VARIANT)).toBe('true');
    await expect(page.getByTestId('test-instruction-overlay')).toBeHidden();
    await expect(page.getByTestId('test-progress')).toHaveText('0%');
  });

  test('@smoke deep-link UNKNOWN available Deny and Abandon returns home without leaving legacy UI behind', async ({
    page
  }) => {
    await clearTelemetryConsent(page);
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto(buildLocalizedPrimaryTestRoute('en'));

    await page.getByTestId('test-deny-and-abandon-button').click();
    await expect(page).toHaveURL(/\/en$/u);
    await expect.poll(() => readConsent(page)).toBe('OPTED_OUT');
    await expect.poll(() => readInstructionSeen(page, PRIMARY_AVAILABLE_TEST_VARIANT)).toBeNull();
    await expect(page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`)).toHaveCount(0);
    await expectNoLegacyInstructionUi(page);
  });

  test('@smoke deep-link UNKNOWN opt_out uses variant instruction and Deny and Start begins at Q1', async ({page}) => {
    await clearTelemetryConsent(page);
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto(buildLocalizedPrimaryOptOutTestRoute('en'));

    await expect(page.getByTestId('test-instruction-body')).toHaveText(OPT_OUT_INSTRUCTION_EN);
    await expect(page.getByTestId('test-instruction-divider')).toBeVisible();
    await expect(page.getByTestId('test-instruction-note')).toHaveText(UNKNOWN_OPT_OUT_NOTE);
    await expect(page.getByTestId('test-deny-and-start-button')).toBeVisible();
    await expectNoLegacyInstructionUi(page);

    await page.getByTestId('test-deny-and-start-button').click();
    await expect.poll(() => readConsent(page)).toBe('OPTED_OUT');
    await expect.poll(() => readInstructionSeen(page, PRIMARY_OPT_OUT_TEST_VARIANT)).toBe('true');
    await expect(page.getByTestId('test-instruction-overlay')).toBeHidden();
    await expect(page.getByTestId('test-progress')).toHaveText('0%');
  });

  test('@smoke assertion:B23-opted-out-available-warning-contract direct available OPTED_OUT replaces the old redirect contract with warning copy and Keep Current Preference', async ({
    page
  }) => {
    await seedTelemetryConsent(page, 'OPTED_OUT');
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto(buildLocalizedPrimaryTestRoute('en'));

    await expect(page.getByTestId('test-instruction-body')).toHaveText(AVAILABLE_INSTRUCTION_EN);
    await expect(page.getByTestId('test-instruction-divider')).toBeVisible();
    await expect(page.getByTestId('test-instruction-note')).toHaveText(OPTED_OUT_AVAILABLE_WARNING);
    await expect(page.getByTestId('test-keep-current-preference-button')).toHaveText('Keep current preference');
    await expectNoLegacyInstructionUi(page);

    await page.getByTestId('test-keep-current-preference-button').click();
    await expect(page).toHaveURL(/\/en$/u);
    await expect.poll(() => readConsent(page)).toBe('OPTED_OUT');
    await expect.poll(() => readInstructionSeen(page, PRIMARY_AVAILABLE_TEST_VARIANT)).toBeNull();
  });

  test('@smoke direct available OPTED_OUT can still accept all and start from Q1', async ({page}) => {
    await seedTelemetryConsent(page, 'OPTED_OUT');
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto(buildLocalizedPrimaryTestRoute('en'));

    await page.getByTestId('test-accept-all-and-start-button').click();
    await expect.poll(() => readConsent(page)).toBe('OPTED_IN');
    await expect.poll(() => readInstructionSeen(page, PRIMARY_AVAILABLE_TEST_VARIANT)).toBe('true');
    await expect(page.getByTestId('test-progress')).toHaveText('0%');
    await expectNoLegacyInstructionUi(page);
  });

  test('@smoke direct opt_out OPTED_OUT keeps plain instruction and Start begins at Q1', async ({page}) => {
    await seedTelemetryConsent(page, 'OPTED_OUT');
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto(buildLocalizedPrimaryOptOutTestRoute('en'));

    await expect(page.getByTestId('test-instruction-body')).toHaveText(OPT_OUT_INSTRUCTION_EN);
    await expect(page.getByTestId('test-instruction-divider')).toHaveCount(0);
    await expect(page.getByTestId('test-instruction-note')).toHaveCount(0);
    await expect(page.getByTestId('test-start-button')).toBeVisible();
    await expect(page.getByTestId('test-accept-all-and-start-button')).toHaveCount(0);
    await expect(page.getByTestId('test-deny-and-start-button')).toHaveCount(0);
    await expect(page.getByTestId('test-deny-and-abandon-button')).toHaveCount(0);
    await expect(page.getByTestId('test-keep-current-preference-button')).toHaveCount(0);
    await expectNoLegacyInstructionUi(page);

    await page.getByTestId('test-start-button').click();
    await expect.poll(() => readConsent(page)).toBe('OPTED_OUT');
    await expect.poll(() => readInstructionSeen(page, PRIMARY_OPT_OUT_TEST_VARIANT)).toBe('true');
    await expect(page.getByTestId('test-instruction-overlay')).toBeHidden();
    await expect(page.getByTestId('test-progress')).toHaveText('0%');
  });

  for (const fixture of TEST_VARIANT_INSTRUCTION_FIXTURES_EN) {
    test(`@smoke known-consent direct ${fixture.attribute} ${fixture.variant} shows the resolved instruction with Start only`, async ({
      page
    }) => {
      await seedTelemetryConsent(page, 'OPTED_IN');
      await page.setViewportSize({width: 1280, height: 900});
      await page.goto(buildLocalizedTestRoute('en', fixture.variant));

      await expect(page.getByTestId('test-instruction-body')).toHaveText(fixture.instruction);
      await expect(page.getByTestId('test-instruction-divider')).toHaveCount(0);
      await expect(page.getByTestId('test-instruction-note')).toHaveCount(0);
      await expect(page.getByTestId('test-start-button')).toBeVisible();
      await expect(page.getByTestId('test-accept-all-and-start-button')).toHaveCount(0);
      await expect(page.getByTestId('test-deny-and-start-button')).toHaveCount(0);
      await expect(page.getByTestId('test-deny-and-abandon-button')).toHaveCount(0);
      await expect(page.getByTestId('test-keep-current-preference-button')).toHaveCount(0);
      await expectNoLegacyInstructionUi(page);
    });
  }
});
