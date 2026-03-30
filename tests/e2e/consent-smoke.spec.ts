import {expect, test, type Page} from '@playwright/test';

import {
  clearTelemetryConsent,
  seedTelemetryConsent,
  TELEMETRY_CONSENT_STORAGE_KEY
} from './helpers/consent';
import {
  buildLocalizedPrimaryOptOutTestRoute,
  buildLocalizedPrimaryTestRoute,
  PRIMARY_AVAILABLE_TEST_CARD_ID,
  PRIMARY_AVAILABLE_TEST_VARIANT,
  PRIMARY_OPT_OUT_TEST_CARD_ID,
  PRIMARY_OPT_OUT_TEST_VARIANT
} from './helpers/landing-fixture';

const AVAILABLE_INSTRUCTION_EN =
  'Instruction dummy: QMBTI opens with a quick personality rhythm check before you move into the main questions.';
const OPT_OUT_INSTRUCTION_EN =
  'Instruction dummy: Energy Check maps where your daily load leaks and asks you to follow the strongest drain signal.';
const UNKNOWN_AVAILABLE_NOTE =
  'For a better experience, please agree to the terms to proceed with the test.';
const UNKNOWN_OPT_OUT_NOTE =
  'For a better experience, please agree to the terms before proceeding with the test. You can still continue without agreeing.';
const OPTED_OUT_AVAILABLE_WARNING =
  "This test is only available to users who have agreed. We're sorry, but if you keep your current preference, you will not be able to take this test.";

async function readConsent(page: Page) {
  return page.evaluate((key) => window.localStorage.getItem(key), TELEMETRY_CONSENT_STORAGE_KEY);
}

async function readInstructionSeen(page: Page, variant: string) {
  return page.evaluate((key) => window.sessionStorage.getItem(key), `vivetest-test-instruction-seen:${variant}`);
}

async function beginLandingTestIngress(page: Page, cardId: string) {
  const card = page.locator(`[data-card-id="${cardId}"]`);
  await card.getByTestId('landing-grid-card-trigger').click();
  await card.locator('[data-slot="answerChoiceA"]').click();
}

async function expectNoLegacyInstructionUi(page: Page) {
  await expect(page.getByTestId('test-local-consent-banner')).toHaveCount(0);
  await expect(page.getByTestId('test-instruction-dialog')).toHaveCount(0);
  await expect(page.getByTestId('test-dialog-close-button')).toHaveCount(0);
  await expect(page.getByTestId('test-dialog-confirm-button')).toHaveCount(0);
}

test.describe('Instruction consent contract smoke', () => {
  test('@smoke assertion:B20-instruction-contract-display landing UNKNOWN available shows variant instruction with divider/note and Deny and Abandon returns home without instructionSeen', async ({
    page
  }) => {
    await clearTelemetryConsent(page);
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    await beginLandingTestIngress(page, PRIMARY_AVAILABLE_TEST_CARD_ID);
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
    await expect(page.locator(`[data-card-id="${PRIMARY_AVAILABLE_TEST_CARD_ID}"]`)).toHaveCount(0);
    await expect(page.locator(`[data-card-id="${PRIMARY_OPT_OUT_TEST_CARD_ID}"]`)).toHaveCount(1);
  });

  test('@smoke assertion:B22-secondary-cta-contract landing UNKNOWN opt_out shows variant instruction with divider/note and Deny and Start continues from Q2', async ({
    page
  }) => {
    await clearTelemetryConsent(page);
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    await beginLandingTestIngress(page, PRIMARY_OPT_OUT_TEST_CARD_ID);
    await expect(page.getByTestId('test-instruction-body')).toHaveText(OPT_OUT_INSTRUCTION_EN);
    await expect(page.getByTestId('test-instruction-divider')).toBeVisible();
    await expect(page.getByTestId('test-instruction-note')).toHaveText(UNKNOWN_OPT_OUT_NOTE);
    await expect(page.getByTestId('test-deny-and-start-button')).toHaveText('Deny and start');
    await expectNoLegacyInstructionUi(page);

    await page.getByTestId('test-deny-and-start-button').click();
    await expect.poll(() => readConsent(page)).toBe('OPTED_OUT');
    await expect.poll(() => readInstructionSeen(page, PRIMARY_OPT_OUT_TEST_VARIANT)).toBe('true');
    await expect(page.getByTestId('test-instruction-overlay')).toBeHidden();
    await expect(page.getByTestId('test-progress')).toHaveText('Question 2 of 4');
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
    await expect(page.getByTestId('test-progress')).toHaveText('Question 1 of 4');
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
    await expect(page.locator(`[data-card-id="${PRIMARY_AVAILABLE_TEST_CARD_ID}"]`)).toHaveCount(0);
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
    await expect(page.getByTestId('test-progress')).toHaveText('Question 1 of 4');
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
    await expect(page.getByTestId('test-progress')).toHaveText('Question 1 of 4');
    await expectNoLegacyInstructionUi(page);
  });

  test('@smoke known-consent test routes show only the variant instruction and Start CTA', async ({page}) => {
    await seedTelemetryConsent(page, 'OPTED_IN');
    await page.setViewportSize({width: 1280, height: 900});

    await page.goto(buildLocalizedPrimaryTestRoute('en'));
    await expect(page.getByTestId('test-instruction-body')).toHaveText(AVAILABLE_INSTRUCTION_EN);
    await expect(page.getByTestId('test-instruction-divider')).toHaveCount(0);
    await expect(page.getByTestId('test-instruction-note')).toHaveCount(0);
    await expect(page.getByTestId('test-start-button')).toBeVisible();
    await expect(page.getByTestId('test-accept-all-and-start-button')).toHaveCount(0);
    await expectNoLegacyInstructionUi(page);

    await seedTelemetryConsent(page, 'OPTED_OUT');
    await page.goto(buildLocalizedPrimaryOptOutTestRoute('en'));
    await expect(page.getByTestId('test-instruction-body')).toHaveText(OPT_OUT_INSTRUCTION_EN);
    await expect(page.getByTestId('test-instruction-divider')).toHaveCount(0);
    await expect(page.getByTestId('test-instruction-note')).toHaveCount(0);
    await expect(page.getByTestId('test-start-button')).toBeVisible();
    await expect(page.getByTestId('test-deny-and-start-button')).toHaveCount(0);
    await expectNoLegacyInstructionUi(page);
  });
});
