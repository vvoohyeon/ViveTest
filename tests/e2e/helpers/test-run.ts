import {expect, type Page} from '@playwright/test';

import {seedTelemetryConsent} from './consent';
import {PRIMARY_AVAILABLE_TEST_VARIANT} from './landing-fixture';

/**
 * 랜딩에서 들어가 회차를 끝낸다 — 히스토리가 `[랜딩, 테스트]` 가 되는 **제품의 길**이다.
 *
 * 곧바로 `goto` 로 테스트에 들어가면 뒤로 갈 곳이 없어 뒤로가기 단언이 공허해지고, 회차가
 * 랜딩을 거쳐 시작됐다는 사실도 사라진다. 두 스펙(결과 주소 · 회차 이력)이 같은 길을 쓰므로
 * 사본을 두지 않고 여기 한 벌만 둔다.
 */
export async function completeRunFromLanding(page: Page): Promise<void> {
  await seedTelemetryConsent(page, 'OPTED_IN');
  await page.setViewportSize({width: 1440, height: 980});
  await page.goto('/en');

  const card = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
  await card.getByTestId('landing-grid-card-trigger').click();
  await card.locator('[data-slot="answerChoiceA"]').click();

  await expect(page.getByTestId('test-instruction-overlay')).toBeVisible();
  await page.getByTestId('test-start-button').click();
  await expect(page.getByTestId('test-choice-a')).toBeVisible();

  const submit = page.getByTestId('test-submit-button');
  for (let step = 0; step < 20; step += 1) {
    if ((await submit.count()) > 0 && (await submit.isEnabled({timeout: 0}))) {
      break;
    }
    const number = page.getByTestId('test-question-number');
    const previous = await number.textContent();
    await page.getByTestId('test-choice-a').click();
    await page.waitForFunction(
      (prev) => {
        const current = document.querySelector('[data-testid="test-question-number"]')?.textContent;
        const button = document.querySelector('[data-testid="test-submit-button"]');
        return current !== prev || (button instanceof HTMLButtonElement && !button.disabled);
      },
      previous ?? '',
      {timeout: 2000}
    );
  }

  await expect(submit).toBeEnabled();
  await submit.click();
}
