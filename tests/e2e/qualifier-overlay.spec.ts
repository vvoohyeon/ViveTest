import {expect, test, type Page} from '@playwright/test';

import {testVariantKey} from '../../src/features/test/storage/test-storage-keys';
import {expectPageToBeAxeClean} from './helpers/axe';
import {seedTelemetryConsent} from './helpers/consent';
import {buildLocalizedTestRoute} from './helpers/landing-fixture';

const EGTT_VARIANT = 'egtt';
const EGTT_QUALIFIER_QUESTION = 'My sexual identity is';
const EGTT_FIRST_SCORING_QUESTION = /interested in making me charming/u;

type StorageVariantId = Parameters<typeof testVariantKey.activeRun>[0];

function asStorageVariantId(variant: string): StorageVariantId {
  return variant as StorageVariantId;
}

function activeRunStorageKey(variant: string) {
  return testVariantKey.activeRun(asStorageVariantId(variant));
}

function responseSetStorageKey(variant: string) {
  return testVariantKey.responseSet(asStorageVariantId(variant));
}

function instructionSeenStorageKey(variant: string) {
  return `vivetest-test-instruction-seen:${variant}`;
}

async function openEgttInstruction(page: Page) {
  await seedTelemetryConsent(page, 'OPTED_IN');
  await page.setViewportSize({width: 1280, height: 900});
  await page.goto(buildLocalizedTestRoute('en', EGTT_VARIANT));
  await expect(page.getByTestId('test-instruction-overlay')).toBeVisible();
}

async function advanceToQualifierStep(page: Page) {
  await page.getByTestId('test-start-button').click();
  await expect(page.getByTestId('test-qualifier-step')).toBeVisible();
}

async function seedEgttActiveRun(
  page: Page,
  responseSet: Record<string, string>,
  options: {instructionSeen?: boolean} = {}
) {
  const activeRunKey = activeRunStorageKey(EGTT_VARIANT);
  const responseSetKey = responseSetStorageKey(EGTT_VARIANT);
  const instructionSeenKey = instructionSeenStorageKey(EGTT_VARIANT);

  await page.addInitScript(
    ({variant, storedResponses, nextActiveRunKey, nextResponseSetKey, nextInstructionSeenKey, markInstructionSeen}) => {
      const now = Date.now();
      window.localStorage.setItem(
        nextActiveRunKey,
        JSON.stringify({variantId: variant, startedAtMs: now - 1000, lastAnsweredAtMs: now - 1000})
      );
      window.localStorage.setItem(nextResponseSetKey, JSON.stringify(storedResponses));

      if (markInstructionSeen) {
        window.sessionStorage.setItem(nextInstructionSeenKey, 'true');
      }
    },
    {
      variant: EGTT_VARIANT,
      storedResponses: responseSet,
      nextActiveRunKey: activeRunKey,
      nextResponseSetKey: responseSetKey,
      nextInstructionSeenKey: instructionSeenKey,
      markInstructionSeen: options.instructionSeen ?? true
    }
  );
}

async function readStorageItem(page: Page, storageType: 'local' | 'session', key: string) {
  return page.evaluate(
    ({nextStorageType, nextKey}) =>
      nextStorageType === 'local' ? window.localStorage.getItem(nextKey) : window.sessionStorage.getItem(nextKey),
    {nextStorageType: storageType, nextKey: key}
  );
}

test.describe('qualifier overlay — instruction to qualifier navigation', () => {
  test('instruction CTA with qualifier variant advances to qualifier step', async ({page}) => {
    await openEgttInstruction(page);

    await advanceToQualifierStep(page);

    await expect(page.getByTestId('test-instruction-overlay')).toBeVisible();
    await expect(page.getByTestId('test-qualifier-step')).toContainText(EGTT_QUALIFIER_QUESTION);
    await expect(page.getByTestId('test-qualifier-choice-m')).toBeVisible();
    await expect(page.getByTestId('test-qualifier-choice-f')).toBeVisible();
    await expect(page.getByTestId('test-qualifier-continue-button')).toBeDisabled();
  });

  test('Back from qualifier step 0 returns to instruction step', async ({page}) => {
    await openEgttInstruction(page);
    await advanceToQualifierStep(page);

    await page.getByTestId('test-qualifier-back-button').click();

    await expect(page.getByTestId('test-qualifier-step')).toHaveCount(0);
    await expect(page.getByTestId('test-instruction-body')).toBeVisible();
    await expect(page.getByTestId('test-start-button')).toBeVisible();
  });

  test('qualifier step content matches EGTT schema', async ({page}) => {
    await openEgttInstruction(page);
    await advanceToQualifierStep(page);

    await expect(page.getByTestId('test-qualifier-step')).toContainText(/\S/u);
    await expect(page.getByTestId('test-qualifier-step')).toContainText(EGTT_QUALIFIER_QUESTION);
    await expect(page.getByTestId('test-qualifier-choice-m')).toHaveText('Male');
    await expect(page.getByTestId('test-qualifier-choice-f')).toHaveText('Female');
    await expect(page.getByTestId('test-qualifier-back-button')).toBeVisible();
    await expect(page.getByTestId('test-qualifier-continue-button')).toBeVisible();
    await expectPageToBeAxeClean(page);
  });
});

test.describe('qualifier overlay — selection and commit', () => {
  test('selecting a choice enables Continue and sets data-selected=true', async ({page}) => {
    await openEgttInstruction(page);
    await advanceToQualifierStep(page);

    await page.getByTestId('test-qualifier-choice-m').click();

    await expect(page.getByTestId('test-qualifier-choice-m')).toHaveAttribute('data-selected', 'true');
    await expect(page.getByTestId('test-qualifier-choice-f')).toHaveAttribute('data-selected', 'false');
    await expect(page.getByTestId('test-qualifier-continue-button')).toBeEnabled();
  });

  test('switching choice updates data-selected correctly', async ({page}) => {
    await openEgttInstruction(page);
    await advanceToQualifierStep(page);

    await page.getByTestId('test-qualifier-choice-m').click();
    await expect(page.getByTestId('test-qualifier-choice-m')).toHaveAttribute('data-selected', 'true');

    await page.getByTestId('test-qualifier-choice-f').click();

    await expect(page.getByTestId('test-qualifier-choice-m')).toHaveAttribute('data-selected', 'false');
    await expect(page.getByTestId('test-qualifier-choice-f')).toHaveAttribute('data-selected', 'true');
    await expect(page.getByTestId('test-qualifier-continue-button')).toBeEnabled();
  });

  test('Continue on qualifier step closes overlay and shows test-question-panel', async ({page}) => {
    await openEgttInstruction(page);
    await advanceToQualifierStep(page);

    await page.getByTestId('test-qualifier-choice-m').click();
    await page.getByTestId('test-qualifier-continue-button').click();

    await expect(page.getByTestId('test-instruction-overlay')).toHaveCount(0);
    await expect(page.getByTestId('test-qualifier-step')).toHaveCount(0);
    await expect(page.getByTestId('test-question-panel')).toBeVisible();
    await expect
      .poll(() => readStorageItem(page, 'local', responseSetStorageKey(EGTT_VARIANT)))
      .toBe(JSON.stringify({'1': 'M'}));
  });

  test('first visible question after commit is a scoring question', async ({page}) => {
    await openEgttInstruction(page);
    await advanceToQualifierStep(page);

    await page.getByTestId('test-qualifier-choice-f').click();
    await page.getByTestId('test-qualifier-continue-button').click();

    await expect(page.getByTestId('test-question-panel')).toBeVisible();
    await expect(page.getByTestId('test-question-number')).toHaveText('Q1');
    await expect(page.getByTestId('test-question-panel')).not.toContainText(EGTT_QUALIFIER_QUESTION);
    await expect(page.getByTestId('test-question-panel')).toContainText(EGTT_FIRST_SCORING_QUESTION);
    await expect(page.getByTestId('test-progress')).toHaveText('0%');
  });
});

test.describe('qualifier overlay — resume validation', () => {
  test('resume with valid qualifier in storage skips overlay entirely', async ({page}) => {
    await seedTelemetryConsent(page, 'OPTED_IN');
    await seedEgttActiveRun(page, {'1': 'M'});
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto(buildLocalizedTestRoute('en', EGTT_VARIANT));

    await expect(page.getByTestId('test-question-panel')).toBeVisible();
    await expect(page.getByTestId('test-instruction-overlay')).toHaveCount(0);
    await expect(page.getByTestId('test-question-number')).toHaveText('Q1');
    await expect(page.getByTestId('test-question-panel')).not.toContainText(EGTT_QUALIFIER_QUESTION);
    await expect(page.getByTestId('test-progress')).toHaveText('0%');
  });

  test('resume with missing qualifier triggers fresh start and shows overlay', async ({page}) => {
    await seedTelemetryConsent(page, 'OPTED_IN');
    await seedEgttActiveRun(page, {'2': 'A'});
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto(buildLocalizedTestRoute('en', EGTT_VARIANT));

    await expect(page.getByTestId('test-instruction-overlay')).toBeVisible();
    await expect
      .poll(() => readStorageItem(page, 'session', instructionSeenStorageKey(EGTT_VARIANT)))
      .toBeNull();
    await expect.poll(() => readStorageItem(page, 'local', activeRunStorageKey(EGTT_VARIANT))).toBeNull();
    await expect.poll(() => readStorageItem(page, 'local', responseSetStorageKey(EGTT_VARIANT))).toBeNull();

    await page.getByTestId('test-start-button').click();
    await expect(page.getByTestId('test-qualifier-step')).toBeVisible();
    await expect(page.getByTestId('test-qualifier-continue-button')).toBeDisabled();
  });
});
