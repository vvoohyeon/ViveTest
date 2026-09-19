import {expect, test, type Page} from '@playwright/test';

import {testVariantKey} from '../../src/features/test/storage/test-storage-keys';
import {expectPageToBeAxeClean} from './helpers/axe';
import {seedTelemetryConsent} from './helpers/consent';
import {buildLocalizedTestRoute} from './helpers/landing-fixture';
import {setTouchViewport} from './helpers/touch-context';

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

async function commitEgttEntryWithChoice(
  page: Page,
  choiceTestId: 'test-qualifier-choice-m' | 'test-qualifier-choice-f'
) {
  await openEgttInstruction(page);
  await advanceToQualifierStep(page);
  await page.getByTestId(choiceTestId).click();
  await page.getByTestId('test-qualifier-continue-button').click();
  await expect(page.getByTestId('test-question-panel')).toBeVisible();
}

test.describe('qualifier overlay — reentry', () => {
  test('chip is visible with the committed qualifier label', async ({page}) => {
    await commitEgttEntryWithChoice(page, 'test-qualifier-choice-m');

    const chip = page.getByTestId('test-qualifier-chip');
    await expect(chip).toBeVisible();
    await expect(chip).toContainText('Male');
    await expectPageToBeAxeClean(page);
  });

  test('chip click reopens the overlay in reentry mode', async ({page}) => {
    await commitEgttEntryWithChoice(page, 'test-qualifier-choice-m');

    await page.getByTestId('test-qualifier-chip').click();

    await expect(page.getByTestId('test-qualifier-step')).toBeVisible();
    await expect(page.getByTestId('test-qualifier-reentry-cancel-button')).toBeVisible();
    await expect(page.getByTestId('test-qualifier-reentry-cancel-button')).toHaveText('Cancel');
    await expect(page.getByTestId('test-qualifier-back-button')).toHaveCount(0);
    await expect(page.getByTestId('test-qualifier-continue-button')).toHaveText('Change and restart');
    await expectPageToBeAxeClean(page);
  });

  test('reentry cancel closes the overlay and keeps answers', async ({page}) => {
    await commitEgttEntryWithChoice(page, 'test-qualifier-choice-m');

    await page.getByTestId('test-qualifier-chip').click();
    await page.getByTestId('test-qualifier-reentry-cancel-button').click();

    await expect(page.getByTestId('test-qualifier-step')).toHaveCount(0);
    await expect(page.getByTestId('test-question-panel')).toBeVisible();
    await expect(page.getByTestId('test-qualifier-chip')).toContainText('Male');
    await expect
      .poll(() => readStorageItem(page, 'local', responseSetStorageKey(EGTT_VARIANT)))
      .toBe(JSON.stringify({'1': 'M'}));
  });

  test('reentry confirm changes qualifier, clears scoring, restarts at first scoring question', async ({page}) => {
    await commitEgttEntryWithChoice(page, 'test-qualifier-choice-m');

    await page.getByTestId('test-qualifier-chip').click();
    await page.getByTestId('test-qualifier-choice-f').click();
    await page.getByTestId('test-qualifier-continue-button').click();

    await expect(page.getByTestId('test-question-panel')).toBeVisible();
    await expect(page.getByTestId('test-instruction-overlay')).toHaveCount(0);
    await expect(page.getByTestId('test-question-number')).toHaveText('Q1');
    await expect(page.getByTestId('test-question-panel')).toContainText(EGTT_FIRST_SCORING_QUESTION);
    await expect(page.getByTestId('test-progress')).toHaveText('0%');
    await expect(page.getByTestId('test-qualifier-chip')).toContainText('Female');
    await expect
      .poll(() => readStorageItem(page, 'local', responseSetStorageKey(EGTT_VARIANT)))
      .toBe(JSON.stringify({'1': 'F'}));
  });

  test('entry-mode qualifier flow stays unchanged (D3/D4 regression guard)', async ({page}) => {
    await openEgttInstruction(page);
    await expect(page.getByTestId('test-instruction-overlay')).toBeVisible();

    await advanceToQualifierStep(page);

    await expect(page.getByTestId('test-qualifier-back-button')).toBeVisible();
    await expect(page.getByTestId('test-qualifier-back-button')).toHaveText('Back');
    await expect(page.getByTestId('test-qualifier-reentry-cancel-button')).toHaveCount(0);

    await page.getByTestId('test-qualifier-choice-m').click();
    await page.getByTestId('test-qualifier-continue-button').click();

    await expect(page.getByTestId('test-question-panel')).toBeVisible();
    await expect(page.getByTestId('test-question-number')).toHaveText('Q1');
    await expect(page.getByTestId('test-question-panel')).not.toContainText(EGTT_QUALIFIER_QUESTION);
  });
});

// 위 14 케이스는 전부 1280px 이고 **중앙 다이얼로그**를 본다. 폰에서는 같은 흐름이 모달
// 바텀시트로 그려지므로(명세 §2-3) 그 형태를 따로 고정한다 — 행동은 같은 것을 재확인하는 것이
// 아니라, 형태가 모달의 셋을 지키는지와 흐름이 시트 안에서 이어지는지를 본다.
test.describe('qualifier overlay — 폰의 모달 바텀시트', () => {
  async function openEgttInstructionOnPhone(page: Page) {
    await seedTelemetryConsent(page, 'OPTED_IN');
    await setTouchViewport(page, {width: 390, height: 844});
    await page.goto(buildLocalizedTestRoute('en', EGTT_VARIANT));
    await expect(page.getByTestId('test-instruction-overlay')).toBeVisible();
  }

  test('@smoke instruction 은 시트로 그려지고 모달의 셋을 지킨다', async ({page}) => {
    await openEgttInstructionOnPhone(page);

    const sheet = page.getByTestId('test-instruction-overlay');
    await expect(sheet).toHaveAttribute('data-slot', 'sheet');
    await expect(sheet).toHaveAttribute('aria-modal', 'true');

    // grabber 도 숨은 닫기도 없다 — 둘 다 「닫을 수 있다」는 약속이다.
    await expect(page.locator('[data-slot="sheetGrabber"]')).toHaveCount(0);
    await expect(page.locator('[data-slot="sheetHiddenClose"]')).toHaveCount(0);

    // backdrop 탭은 닫지 않는다.
    await page.locator('[data-slot="sheetScrim"]').click({position: {x: 10, y: 10}});
    await expect(sheet).toBeVisible();

    // Esc 도 instruction step 에서는 아무것도 하지 않는다(BQ-41).
    await page.keyboard.press('Escape');
    await expect(sheet).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${buildLocalizedTestRoute('en', EGTT_VARIANT)}$`, 'u'));
  });

  test('@smoke 액션 행은 하단에 고정되고 본문만 스크롤한다', async ({page}) => {
    await openEgttInstructionOnPhone(page);

    const geometry = await page.evaluate(() => {
      const body = document.querySelector('[data-slot="sheetBody"]');
      const actions = document.querySelector('[data-slot="sheetActionRow"]');
      if (!(body instanceof HTMLElement) || !(actions instanceof HTMLElement)) {
        return null;
      }
      return {
        bodyOverflowY: getComputedStyle(body).overflowY,
        bodyBottom: body.getBoundingClientRect().bottom,
        actionsTop: actions.getBoundingClientRect().top,
        actionsBottom: actions.getBoundingClientRect().bottom,
        viewportHeight: window.innerHeight
      };
    });

    expect(geometry).not.toBeNull();
    expect(geometry?.bodyOverflowY).toBe('auto');
    // 액션 행은 본문 **아래**에 있고 뷰포트를 넘지 않는다.
    expect(geometry?.actionsTop ?? 0).toBeGreaterThanOrEqual((geometry?.bodyBottom ?? 0) - 1);
    expect(geometry?.actionsBottom ?? 0).toBeLessThanOrEqual((geometry?.viewportHeight ?? 0) + 1);
  });

  test('@smoke qualifier 단계는 같은 시트 안에서 내용만 바뀐다', async ({page}) => {
    await openEgttInstructionOnPhone(page);

    const sheet = page.getByTestId('test-instruction-overlay');
    await page.getByTestId('test-start-button').click();

    await expect(page.getByTestId('test-qualifier-step')).toBeVisible();
    // 시트는 내려가지 않는다 — 같은 원소가 그대로 열려 있다.
    await expect(sheet).toHaveAttribute('data-state', 'open');
    await expect(sheet.getByTestId('test-qualifier-step')).toBeVisible();

    await page.getByTestId('test-qualifier-choice-m').click();
    await page.getByTestId('test-qualifier-continue-button').click();

    await expect(page.getByTestId('test-instruction-overlay')).toHaveCount(0);
    await expect(page.getByTestId('test-question-panel')).toBeVisible();
  });
});

/**
 * qualifier 선택은 **보조기술에도 보인다** — 점수표 `answer-choice-selection-not-exposed`.
 *
 * 종전에는 선택 상태가 `data-selected` 하나뿐이었고, 그것은 CSS 와 E2E 만 읽는다. 스크린리더
 * 사용자는 무엇을 골랐는지 들을 수 없었고, 고른 것을 다시 눌러 확인할 수도 없었다.
 *
 * **채점 문항의 규칙을 여기 가져오지 않는다.** `req-test.md` §4.3 은 「이전 응답」 표식에
 * `aria-checked`·`aria-pressed` 를 금하는데, 그 이유는 그 화면에서는 **선택이 곧 진행이라
 * 선택된 상태로 머무는 문항이 존재할 수 없기** 때문이다. qualifier step 은 반대다 — 고른 뒤
 * [Continue] 를 누를 때까지 머무르므로 여기서 노출해야 하는 것은 표식이 아니라 **선택**이다.
 *
 * 구조는 GNB 테마 컨트롤과 같은 것을 쓴다(`radiogroup` + `radio`). 「둘 중 하나」라는 사실을
 * 보조기술에 전하는 구조가 그것 하나이고, 저장소에 이미 그 선례가 있다.
 */
test.describe('qualifier overlay — selection reaches the accessibility tree', () => {
  test('@smoke assertion:QA-01 the choices are a radiogroup named by the question', async ({page}) => {
    await openEgttInstruction(page);
    await advanceToQualifierStep(page);

    const group = page.getByTestId('test-qualifier-step').getByRole('radiogroup');
    await expect(group).toHaveCount(1);
    // 이름은 질문이다 — 다이얼로그의 `aria-labelledby` 와 같은 제목을 가리킨다(§3.6).
    await expect(group).toHaveAccessibleName(EGTT_QUALIFIER_QUESTION);
    await expect(group.getByRole('radio')).toHaveCount(2);
  });

  test('@smoke assertion:QA-01 aria-checked follows the choice, and switching moves it', async ({page}) => {
    await openEgttInstruction(page);
    await advanceToQualifierStep(page);

    const male = page.getByTestId('test-qualifier-choice-m');
    const female = page.getByTestId('test-qualifier-choice-f');

    // 아직 고르지 않았다 — 둘 다 `false` 이고 「이름 없는 상태」가 아니다.
    await expect(male).toHaveAttribute('aria-checked', 'false');
    await expect(female).toHaveAttribute('aria-checked', 'false');

    await male.click();
    await expect(male).toHaveAttribute('aria-checked', 'true');
    await expect(female).toHaveAttribute('aria-checked', 'false');

    await female.click();
    await expect(male).toHaveAttribute('aria-checked', 'false');
    await expect(female).toHaveAttribute('aria-checked', 'true');
  });

  test('@smoke assertion:QA-01 both choices stay reachable by Tab — the selected one is not removed from the order', async ({
    page
  }) => {
    await openEgttInstruction(page);
    await advanceToQualifierStep(page);
    await page.getByTestId('test-qualifier-choice-m').click();

    // roving tabindex 를 걸지 않는 것은 의도다(GNB 테마 컨트롤과 같은 판단) — 이 묶음은
    // 포커스 트랩 안의 주 컨트롤이고, 로빙을 걸면 고른 쪽 하나만 탭으로 닿는다.
    for (const testId of ['test-qualifier-choice-m', 'test-qualifier-choice-f']) {
      await expect(page.getByTestId(testId)).not.toHaveAttribute('tabindex', '-1');
    }
  });
});
