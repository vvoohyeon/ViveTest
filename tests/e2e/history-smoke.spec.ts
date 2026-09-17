import {expect, test, type Page} from '@playwright/test';

import {TEST_RUN_HISTORY_KEY} from '../../src/features/test/storage/test-storage-keys';
import {seedTelemetryConsent} from './helpers/consent';
import {completeRunFromLanding} from './helpers/test-run';

/**
 * 이 기기의 회차 목록 — 명세 §2-7, **목록까지만**.
 *
 * 세 가지를 고정한다. ⑴ 끝낸 회차가 실제로 목록에 나타난다 — 이 표면은 오래도록 「코드가
 * 없어서」 비어 있었으므로, 비어 있음과 없음을 가르는 것이 이 검사의 첫 일이다. ⑵ 빈 상태에
 * 다음 행동이 있고 디버그 문자열이 없다. ⑶ **행은 누를 수 없다** — 탭 동작과 URL 스킴은 다음
 * phase 이고, 연결할 곳이 없는 동안 어포던스를 붙이면 화면이 거짓말을 한다.
 */

async function seedRunHistory(
  page: Page,
  entries: ReadonlyArray<{variantId: string; startedAtMs: number; completedAtMs: number | null}>
): Promise<void> {
  await page.addInitScript(
    ([key, payload]) => {
      window.localStorage.setItem(key, payload);
    },
    [TEST_RUN_HISTORY_KEY, JSON.stringify(entries)] as const
  );
}

test.describe('Run history', () => {
  test('@smoke assertion:HS-01 the empty state offers the next action and carries no debug string', async ({page}) => {
    await page.goto('/en/history');

    await expect(page.getByTestId('history-empty')).toBeVisible();
    await expect(page.getByTestId('history-list')).toHaveCount(0);

    const cta = page.getByTestId('history-empty').getByRole('link');
    await expect(cta).toHaveCount(1);
    await expect(cta).toHaveAttribute('href', '/en');

    // `Locale: en` 은 프로덕션으로 나가던 디버그 문자열이다 — 이 표면에서 다시 자라지 않게 한다.
    await expect(page.locator('main')).not.toContainText('Locale:');
  });

  test('@smoke assertion:HS-01 a finished run shows up as a completed row with its name and time', async ({page}) => {
    await completeRunFromLanding(page);
    await expect(page.getByTestId('result-screen')).toBeVisible();

    await page.goto('/en/history');

    const rows = page.getByTestId('history-entry');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toHaveAttribute('data-run-status', 'completed');
    await expect(rows.first()).toHaveAttribute('data-run-variant', 'qmbti');

    const row = await rows.first().evaluate((element) => ({
      // 이름은 variant id 가 아니라 카탈로그의 제목이다.
      text: element.textContent ?? '',
      // 시각은 기계가 읽을 수 있는 형태로도 나가야 한다.
      dateTime: element.querySelector('time')?.getAttribute('dateTime') ?? '',
      links: element.querySelectorAll('a, button, [role="link"], [role="button"]').length
    }));

    expect(row.text).toContain('10m MBTI test');
    expect(row.text).not.toContain('qmbti');
    expect(Number.isNaN(Date.parse(row.dateTime))).toBe(false);
    // ⑶ — 행은 링크도 버튼도 아니다.
    expect(row.links).toBe(0);
  });

  test('@smoke assertion:HS-01 an unfinished run with no live attempt reads as stopped', async ({page}) => {
    await seedTelemetryConsent(page, 'OPTED_IN');
    await seedRunHistory(page, [
      {variantId: 'qmbti', startedAtMs: 1_700_000_000_000, completedAtMs: 1_700_000_060_000},
      {variantId: 'egtt', startedAtMs: 1_600_000_000_000, completedAtMs: null}
    ]);

    await page.goto('/en/history');

    const rows = page.getByTestId('history-entry');
    await expect(rows).toHaveCount(2);

    // 최신순이다 — 목록의 순서 자체가 `history.body` 가 말하는 약속이다.
    const statuses = await rows.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('data-run-status'))
    );
    expect(statuses).toEqual(['completed', 'abandoned']);
    await expect(rows.nth(1)).toContainText('Stopped');
    await expect(rows.first()).not.toContainText('Stopped');
  });
});
