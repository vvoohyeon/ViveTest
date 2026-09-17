import {expect, test, type Page} from '@playwright/test';

import {seedTelemetryConsent} from './helpers/consent';
import {buildLocalizedPrimaryTestRoute} from './helpers/landing-fixture';
import {setTouchViewport} from './helpers/touch-context';

/**
 * 응답 보존과 「이전 응답」 표식 (`req-test.md` §3.9 · §4.3 · §4.4).
 *
 * 단위 검사는 리듀서·컨트롤러·순수 함수를 각각 본다. 여기서 보는 것은 **셋이 이어져 화면에
 * 닿는지**다 — 되돌아간 문항이 unselected 인 채 표식만 갖는지, 그 표식이 라벨을 밀지 않는지,
 * 고친 뒤 원래 있던 자리로 돌아오는지. 그 셋은 단위 검사가 구조적으로 볼 수 없다.
 */

const PREVIOUS_BUTTON = /^Previous$/u;

async function enterRuntime(page: Page): Promise<void> {
  await seedTelemetryConsent(page, 'OPTED_IN');
  await setTouchViewport(page, {width: 390, height: 844});
  await page.goto(buildLocalizedPrimaryTestRoute('en'));

  // **`count()` 로 관문을 판정하지 않는다.** 렌더 전에는 0 이 나오고, 그 0 은 「관문이 없다」와
  // 구별되지 않는다 — 통과하지 않은 채 문항을 누르러 가면 모달 스크림이 클릭을 삼켜 30 초
  // 타임아웃이 된다. 알려진 동의 + 직접 진입은 반드시 instruction 을 거치므로 그것을 기다린다.
  const sheet = page.getByTestId('test-instruction-overlay');
  await expect(sheet).toBeVisible();
  await page.getByTestId('test-start-button').click();
  await expect(sheet).toHaveCount(0);

  await expect(page.getByTestId('test-choice-a')).toBeVisible();
}

async function goPrevious(page: Page): Promise<void> {
  await page.locator('button').filter({hasText: PREVIOUS_BUTTON}).first().click();
}

/**
 * 답변 격자는 문항이 바뀔 때 가로로 미끄러진다(180ms). 문항 번호가 바뀌는 시점은 그 모션의
 * **시작**이라, 거기서 기하를 재면 이동 중인 좌표를 읽는다 — 정렬 단언이 그것 때문에 붉어졌다.
 * 변환이 항등으로 돌아온 뒤에 잰다.
 */
async function waitForAnswerGridSettled(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const grid = document.querySelector('.test-answer-grid');
    if (!grid) {
      return false;
    }
    const transform = window.getComputedStyle(grid).transform;
    return transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)';
  });
}

/**
 * 라벨의 **상자 전체**를 잰다 — 시작 좌표만으로는 부족하다. 마크 슬롯은 라벨 **뒤**에
 * 있으므로 슬롯이 넓어져도 라벨의 `x` 는 그대로이고 **폭**이 줄어든다(고장 주입으로 확인:
 * 슬롯을 14px → 24px 로 키웠더니 `x` 단언만으로는 통과했다). 줄어든 폭은 긴 라벨에서 줄바꿈을
 * 바꾸므로 그것이 곧 정렬 붕괴다.
 */
async function labelBox(page: Page, testId: string): Promise<{x: number; width: number}> {
  const box = await page.getByTestId(testId).locator('span').first().boundingBox();
  if (!box) {
    throw new Error(`${testId} label has no box`);
  }
  return {x: Math.round(box.x * 100) / 100, width: Math.round(box.width * 100) / 100};
}

test.describe('Question flow answer retention', () => {
  test('@smoke assertion:AR-01 previous navigation keeps every answer and marks the earlier choice without selecting it', async ({
    page
  }) => {
    await enterRuntime(page);

    const choiceA = page.getByTestId('test-choice-a');
    const choiceB = page.getByTestId('test-choice-b');

    // 깨끗한 문항에는 표식이 없다.
    await expect(choiceA).toHaveAttribute('data-previous-answer', 'false');
    await expect(choiceB).toHaveAttribute('data-previous-answer', 'false');
    await waitForAnswerGridSettled(page);
    const cleanLabel = await labelBox(page, 'test-choice-a');

    await choiceA.click();
    await expect(page.getByTestId('test-question-number')).toHaveText('Q2');
    await choiceB.click();
    await expect(page.getByTestId('test-question-number')).toHaveText('Q3');

    await goPrevious(page);
    await expect(page.getByTestId('test-question-number')).toHaveText('Q2');

    // ⑴ 두 선택지 모두 unselected 이고, 과거 고른 쪽에만 표식이 붙는다.
    await expect(choiceA).toHaveAttribute('data-selected', 'false');
    await expect(choiceB).toHaveAttribute('data-selected', 'false');
    await expect(choiceB).toHaveAttribute('data-previous-answer', 'true');
    await expect(choiceA).toHaveAttribute('data-previous-answer', 'false');

    // ⑵ 표식은 보조기술에 **텍스트 대안**으로 간다. 선택 상태로 주장하지 않는다.
    await expect(choiceB).toContainText('Your previous choice');
    await expect(choiceB).not.toHaveAttribute('aria-checked', /.*/u);
    await expect(choiceB).not.toHaveAttribute('aria-pressed', /.*/u);

    // ⑶ 표식이 붙어도 라벨은 한 픽셀도 움직이지 않는다 — 마크 슬롯이 늘 같은 크기다.
    await waitForAnswerGridSettled(page);
    expect(await labelBox(page, 'test-choice-b')).toEqual(cleanLabel);
    expect(await labelBox(page, 'test-choice-a')).toEqual(cleanLabel);

    // ⑷ 한 문항 더 거슬러 올라가도 지나는 문항마다 표식이 보인다.
    await goPrevious(page);
    await expect(page.getByTestId('test-question-number')).toHaveText('Q1');
    await expect(choiceA).toHaveAttribute('data-previous-answer', 'true');
    await expect(choiceA).toHaveAttribute('data-selected', 'false');
  });

  test('@smoke assertion:AR-02 changing an earlier answer keeps the rest and returns to where the user was', async ({
    page
  }) => {
    await enterRuntime(page);

    const choiceA = page.getByTestId('test-choice-a');
    const submit = page.getByTestId('test-submit-button');

    // 끝까지 답해 제출이 열린 상태를 만든다.
    for (let step = 0; step < 20; step += 1) {
      if ((await submit.count()) > 0 && (await submit.isEnabled())) {
        break;
      }
      await choiceA.click();
      await expect(choiceA).toBeEnabled();
    }
    await expect(submit).toBeEnabled();

    const lastQuestion = await page.getByTestId('test-question-number').textContent();

    // 마지막 문항은 예외다 — 표식이 아니라 **선택된 상태**로 남는다(§4.4). CTA 가 켜져 있는데
    // 아무것도 선택돼 보이지 않는 화면을 만들지 않기 위해서다.
    await expect(choiceA).toHaveAttribute('data-selected', 'true');
    await expect(choiceA).toHaveAttribute('data-previous-answer', 'false');

    await goPrevious(page);
    await goPrevious(page);
    await expect(page.getByTestId('test-question-number')).not.toHaveText(lastQuestion ?? '');

    // 되돌아온 문항에서 **다른 쪽**으로 바꾼다 — 종전 계약이 뒤쪽 응답을 전부 지우던 자리다.
    await page.getByTestId('test-choice-b').click();

    // ⑴ 원래 있던 자리(마지막 문항)로 돌아온다.
    await expect(page.getByTestId('test-question-number')).toHaveText(lastQuestion ?? '');

    // ⑵ 뒤쪽 응답이 살아 있다 — 제출이 여전히 열려 있는 것이 그 증거다.
    await expect(submit).toBeEnabled();
  });
});
