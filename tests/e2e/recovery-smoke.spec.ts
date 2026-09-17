import {expect, test, type Page} from '@playwright/test';

import {seedTelemetryConsent} from './helpers/consent';

/**
 * 막다른 곳에서 앞으로 가는 길 — 명세 §2-8 · `req-test.md` §6.1.
 *
 * step 3 의 blocker 셋 중 둘을 여기서 고정한다. ⑴ **저장소가 막힌 브라우저에서도 회차가
 * 돌아간다** — Safari 의 「모든 쿠키 차단」은 `setItem` 이 던지고, 그 한 줄이 던지면 시작 버튼을
 * 눌러도 시트가 영원히 닫히지 않았다. ⑵ **모르는 variant 가 빈 화면으로 떨어지지 않는다** —
 * `[locale]` 안에서 해결되는 404 는 `<body>` 가 빈 Next 오류 문서로 나가므로, 그 자리에서
 * §6.1 이 정한 복구 페이지로 보낸다.
 */

async function blockStorageWrites(page: Page): Promise<void> {
  // 읽기는 되고 **쓰기가 던진다** — Safari 「모든 쿠키 차단」의 모양이다. 접근 자체가 던지는
  // 모양은 모든 모듈이 이미 감싸고 있었고, 새지 않는 것은 이쪽이었다.
  await page.addInitScript(() => {
    const reject = () => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    };
    Storage.prototype.setItem = reject;
    Storage.prototype.removeItem = reject;
  });
}

test.describe('Recovery surfaces', () => {
  test('@smoke assertion:BL-01 a run still works when every storage write throws', async ({page}) => {
    await seedTelemetryConsent(page, 'OPTED_IN');
    await blockStorageWrites(page);

    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(String(error).split('\n')[0]));

    await page.goto('/en/test/qmbti');
    await expect(page.getByTestId('test-instruction-overlay')).toBeVisible();
    await page.getByTestId('test-start-button').click();

    // 시트가 닫히는 것이 이 검사의 핵심이다 — 종전에는 저장 한 줄이 던지면서 그 뒤의 상태
    // 전이가 통째로 사라졌고, 화면은 멀쩡한데 아무 일도 일어나지 않았다.
    await expect(page.getByTestId('test-instruction-overlay')).toHaveCount(0);
    await expect(page.getByTestId('test-question-number')).toHaveText('Q1');

    await page.getByTestId('test-choice-a').click();
    await expect(page.getByTestId('test-question-number')).toHaveText('Q2');

    expect(pageErrors).toEqual([]);
  });

  test('@smoke assertion:BL-01 an unknown variant lands on a readable recovery page, not an empty document', async ({
    page
  }) => {
    await page.goto('/en/test/UNKNOWN');

    await expect(page).toHaveURL(/\/en\/test\/error\?variant=UNKNOWN$/u);
    const panel = page.getByTestId('test-error-recovery');
    await expect(panel).toBeVisible();

    const rendered = await page.evaluate(() => ({
      // 서버가 내보낸 본문이 있어야 한다 — 종전에는 상태 코드만 404 이고 `<body>` 가 비어 있었다.
      bodyText: (document.body.innerText || '').trim().length,
      // 앞으로 가는 경로를 최소 하나(명세 §2-8).
      actions: document.querySelectorAll('[data-testid="test-error-recovery"] a').length
    }));

    expect(rendered.bodyText).toBeGreaterThan(20);
    expect(rendered.actions).toBeGreaterThanOrEqual(1);
    // variant 식별자는 쿼리에 남고 화면에는 오지 않는다(명세 §2-8).
    await expect(panel).not.toContainText('UNKNOWN');
    await expect(panel).not.toContainText('variant');
  });

  test('@smoke assertion:BL-01 the recovery copy follows the reader — 하드코딩된 한 언어가 아니다', async ({page}) => {
    await page.goto('/kr/test/error');
    await expect(page.getByTestId('test-error-recovery')).toContainText('이 테스트를 열 수 없습니다');

    await page.goto('/ja/test/error');
    await expect(page.getByTestId('test-error-recovery')).toContainText('このテストを開けませんでした');
  });

  test('@smoke assertion:BL-01 an unknown path still answers 404 with a body that says so', async ({page}) => {
    // 모르는 **경로**는 복구 페이지로 보내지 않는다 — 그것은 404 가 맞고, 프록시가 `[locale]`
    // 밖에서 처리하므로 본문이 서버에서 나온다.
    const response = await page.goto('/en/no-such-route');

    expect(response?.status()).toBe(404);
    await expect(page.getByTestId('global-not-found')).toBeVisible();
    expect((await page.evaluate(() => document.body.innerText)).trim().length).toBeGreaterThan(20);
  });
});
