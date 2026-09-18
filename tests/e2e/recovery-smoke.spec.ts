import {expect, test, type Page} from '@playwright/test';

import {resolveLandingCatalog} from '../../src/features/variant-registry';

import {seedTelemetryConsent} from './helpers/consent';
import {seedRunHistory} from './helpers/test-run';

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

/**
 * 복구 카드 — `req-test.md` §6.1 「Phase 4 확장 계약」의 자동 검증 다섯 중 화면 쪽.
 *
 * 순수 판정(제외·상한·순서)은 `tests/unit/test-recovery-cards.test.ts` 가 렌더 없이 잰다. 여기서
 * 재는 것은 **저장소를 읽은 뒤 실제로 몇 장이 서는가**와, 전체 완료에서 랜딩 CTA 가 남는가다.
 *
 * 기대 목록을 이 파일에 손으로 적지 않는다 — 카탈로그가 바뀌면 그 목록이 조용히 거짓이 된다.
 * 대신 카탈로그를 **참고 데이터로** 읽어 seed 를 만들고, 화면에는 계약이 말하는 **성질**을
 * 묻는다: 두 장인가 · 완료한 것이 빠졌는가 · 순서가 선언 순서인가 · 전부 완료면 0 장인가.
 */
test.describe('Test error recovery cards', () => {
  /**
   * 카탈로그 선언 순서의 진입 가능한 테스트 variant.
   *
   * **`isEnterableCard` 를 쓰지 않는다.** 제품이 그 술어로 고르는데 기대값도 같은 술어로 만들면,
   * 술어가 틀려도 양쪽이 같이 틀려 이 검사는 초록으로 남는다 — 실제로 처음에는
   * `attribute === 'available'` 로 적어 `opt_out` 카드를 떨어뜨리고 있었고, 그때 기대값도 같은
   * 식이었으면 아무 검사도 붉지 않았을 것이다. 그래서 여기서는 **금지된 것을 뺀다**는 계약의
   * 말로 적는다 — 출시 예정(`unavailable`)은 아무 데도 보내지 않으므로 복구 카드가 될 수 없다.
   */
  const ENTERABLE_TEST_VARIANTS = resolveLandingCatalog('en')
    .filter((card) => card.type === 'test' && card.availability !== 'unavailable')
    .map((card) => card.variant);

  async function seedCompletedRuns(page: Page, variantIds: readonly string[]): Promise<void> {
    await seedRunHistory(
      page,
      variantIds.map((variantId, index) => ({
        variantId,
        startedAtMs: 1_000 + index,
        completedAtMs: 2_000 + index
      }))
    );
  }

  const cardHrefs = (page: Page) =>
    page.getByTestId('test-error-recovery-card').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('href') ?? '')
    );

  test('@smoke assertion:RC-01 a fresh device gets two cards, in catalog declaration order', async ({page}) => {
    expect(ENTERABLE_TEST_VARIANTS.length, '진입 가능한 테스트가 셋 미만이면 이 검사가 공허하다').toBeGreaterThan(2);

    await page.goto('/en/test/error?variant=nope');

    await expect(page.getByTestId('test-error-recovery-cards')).toBeVisible();
    await expect(page.getByTestId('test-error-recovery-card')).toHaveCount(2);
    expect(await cardHrefs(page)).toEqual(
      ENTERABLE_TEST_VARIANTS.slice(0, 2).map((variantId) => `/en/test/${variantId}`)
    );
  });

  test('@smoke assertion:RC-01 completed tests drop out and the next ones move up', async ({page}) => {
    await seedCompletedRuns(page, [ENTERABLE_TEST_VARIANTS[0]]);
    await page.goto('/en/test/error?variant=nope');

    await expect(page.getByTestId('test-error-recovery-card')).toHaveCount(2);
    expect(await cardHrefs(page)).toEqual(
      ENTERABLE_TEST_VARIANTS.slice(1, 3).map((variantId) => `/en/test/${variantId}`)
    );
  });

  test('@smoke assertion:RC-01 one remaining test shows exactly one card', async ({page}) => {
    await seedCompletedRuns(page, ENTERABLE_TEST_VARIANTS.slice(0, -1));
    await page.goto('/en/test/error?variant=nope');

    await expect(page.getByTestId('test-error-recovery-card')).toHaveCount(1);
    expect(await cardHrefs(page)).toEqual([`/en/test/${ENTERABLE_TEST_VARIANTS.at(-1)}`]);
  });

  test('@smoke assertion:RC-01 with everything completed the section disappears and the landing CTA remains', async ({
    page
  }) => {
    await seedCompletedRuns(page, ENTERABLE_TEST_VARIANTS);
    await page.goto('/en/test/error?variant=nope');

    await expect(page.getByTestId('test-error-recovery')).toBeVisible();
    await expect(page.getByTestId('test-error-recovery-cards')).toHaveCount(0);
    // 계약 엣지 2 — 카드가 0 개여도 앞으로 가는 경로는 남는다(§2-8).
    await expect(page.getByTestId('test-error-recovery').getByRole('link')).toHaveCount(1);
    await expect(page.getByTestId('test-error-recovery').getByRole('link')).toHaveAttribute('href', '/en');
  });

  test('@smoke assertion:RC-01 an in-progress run is not treated as completed — it is what a recovery card is for', async ({
    page
  }) => {
    await seedRunHistory(page, [
      {variantId: ENTERABLE_TEST_VARIANTS[0], startedAtMs: 1_000, completedAtMs: null}
    ]);
    await page.goto('/en/test/error?variant=nope');

    expect(await cardHrefs(page)).toEqual(
      ENTERABLE_TEST_VARIANTS.slice(0, 2).map((variantId) => `/en/test/${variantId}`)
    );
  });
});
