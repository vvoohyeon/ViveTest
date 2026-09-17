import {expect, test} from '@playwright/test';

import {encodeResultPayload, type ScoreStats} from '../../src/features/test/domain';
import {completeRunFromLanding} from './helpers/test-run';

/**
 * 결과 화면의 주소 — `req-test.md` §5.1 · §5.2 · §6.3.
 *
 * **이 스펙이 고정하는 것은 「모인다」와 「반쯤 그리지 않는다」 둘이다.** §6.3 은 실패 열 갈래를
 * 열거하고 전부 에러 렌더링으로 보내며 부분 렌더링을 금지한다. 갈래마다 URL 을 하나씩 만들어
 * ⑴ 에러 패널이 있고 ⑵ 결과 내용이 **0 개**이며 ⑶ 밟은 갈래가 의도한 그 갈래인지까지 본다.
 *
 * ⑶ 이 없으면 이 검사는 연극이 된다 — 열 갈래가 같은 패널을 그리므로, 잘못 만든 URL 이 엉뚱한
 * 갈래로 떨어져도 초록이다(L20). ⑵ 는 그 자체로는 「원래 아무것도 없었다」와 구별되지 않으므로
 * 유효한 URL 이 같은 선택자로 **0 이 아닌 것**을 내는 케이스를 짝으로 둔다.
 */

const MBTI_SCORE_STATS: ScoreStats = {
  EI: {poleA: 'E', poleB: 'I', counts: {E: 4, I: 5}, dominant: 'I'},
  SN: {poleA: 'S', poleB: 'N', counts: {S: 8, N: 9}, dominant: 'N'},
  TF: {poleA: 'T', poleB: 'F', counts: {T: 6, F: 11}, dominant: 'F'},
  JP: {poleA: 'J', poleB: 'P', counts: {J: 10, P: 7}, dominant: 'J'}
};

const EGTT_SCORE_STATS: ScoreStats = {
  ET: {poleA: 'E', poleB: 'T', counts: {E: 5, T: 2}, dominant: 'E'}
};

const OWN_PAYLOAD = encodeResultPayload({scoreStats: MBTI_SCORE_STATS, shared: false});
const SHARED_PAYLOAD = encodeResultPayload({scoreStats: MBTI_SCORE_STATS, shared: true});
const EGTT_PAYLOAD = encodeResultPayload({scoreStats: EGTT_SCORE_STATS, shared: false});

function urlSafeBase64(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64').replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

const VALID_URL = `/en/result/qmbti/INFJ?${OWN_PAYLOAD}`;

const FAILURE_URLS: ReadonlyArray<{reason: string; url: string}> = [
  // 세그먼트가 공백뿐인 주소다 — 경로는 비어 있을 수 없으므로 이것이 「누락」이 닿는 모양이다.
  {reason: 'VARIANT_MISSING', url: `/en/result/%20/INFJ?${OWN_PAYLOAD}`},
  {reason: 'TYPE_MISSING', url: `/en/result/qmbti/%20?${OWN_PAYLOAD}`},
  // 블로그 variant 라 scoring schema 가 없다.
  {reason: 'SCHEMA_NOT_FOUND', url: `/en/result/ops-handbook/INFJ?${OWN_PAYLOAD}`},
  {reason: 'PAYLOAD_QUERY_MISSING', url: '/en/result/qmbti/INFJ'},
  // `.` 은 base64 알파벳 밖이라 디코딩에서 걸린다.
  {reason: 'BASE64_DECODE_FAILED', url: '/en/result/qmbti/INFJ?zz.zz'},
  {reason: 'JSON_PARSE_FAILED', url: `/en/result/qmbti/INFJ?${urlSafeBase64('not json at all')}`},
  {reason: 'MISSING_SCORE_STATS', url: `/en/result/qmbti/INFJ?${urlSafeBase64(JSON.stringify({shared: false}))}`},
  {
    reason: 'SCORE_STATS_SCHEMA_MISMATCH',
    url: `/en/result/qmbti/INFJ?${urlSafeBase64(JSON.stringify({scoreStats: EGTT_SCORE_STATS, shared: false}))}`
  },
  {
    reason: 'INVALID_SHARED',
    url: `/en/result/qmbti/INFJ?${urlSafeBase64(JSON.stringify({scoreStats: MBTI_SCORE_STATS, shared: 'yes'}))}`
  },
  {reason: 'LENGTH_MISMATCH', url: `/en/result/qmbti/INF?${OWN_PAYLOAD}`},
  {reason: 'INVALID_QUALIFIER_VALUE', url: `/en/result/egtt/EX?${EGTT_PAYLOAD}`}
];

test.describe('Result URL', () => {
  test('@smoke assertion:RS-01 every invalid result URL renders the error surface and zero result content', async ({
    page
  }) => {
    for (const {reason, url} of FAILURE_URLS) {
      const response = await page.goto(url);

      // 에러 **렌더링**이지 에러 응답이 아니다 — §6.3 은 랜딩 CTA 를 가진 화면을 요구한다.
      expect(response?.status(), `${reason} status`).toBe(200);

      const errorPanel = page.locator('[data-testid="result-error"]');
      await expect(errorPanel, `${reason} 패널`).toBeVisible();
      await expect(errorPanel, `${reason} 갈래`).toHaveAttribute('data-result-failure', reason);

      const rendered = await page.evaluate(() => ({
        sections: document.querySelectorAll('[data-result-section]').length,
        screens: document.querySelectorAll('[data-testid="result-screen"]').length,
        derivedTypes: document.querySelectorAll('[data-result-derived-type]').length
      }));

      expect(rendered, `${reason} 부분 렌더링`).toEqual({sections: 0, screens: 0, derivedTypes: 0});

      const landingCta = errorPanel.getByRole('link');
      await expect(landingCta, `${reason} 랜딩 CTA`).toHaveCount(1);
      await expect(landingCta, `${reason} 랜딩 CTA 목적지`).toHaveAttribute('href', '/en');
    }
  });

  test('@smoke assertion:RS-02 a valid result URL renders the content the invalid ones must not', async ({page}) => {
    await page.goto(VALID_URL);

    const screen = page.locator('[data-testid="result-screen"]');
    await expect(screen).toBeVisible();
    await expect(page.locator('[data-testid="result-error"]')).toHaveCount(0);

    const rendered = await page.evaluate(() => ({
      sections: document.querySelectorAll('[data-result-section]').length,
      derivedType: document.querySelector('[data-result-derived-type]')?.getAttribute('data-result-derived-type'),
      pageContext: document.querySelector('.page-shell')?.getAttribute('data-page-context'),
      // 진행률·타이머는 test 문맥의 것이다 — 결과 화면이 그것을 이어받지 않는 것이 명세 §2-6 이다.
      testTimers: document.querySelectorAll('[data-testid="gnb-test-timer"]').length
    }));

    expect(rendered).toEqual({sections: 1, derivedType: 'INFJ', pageContext: 'result', testTimers: 0});
  });

  test('@smoke assertion:RS-02 the shared payload changes the CTA wording and nothing else', async ({page}) => {
    // §5.2 케이스 1 대 2. 케이스 3(로컬에 같은 회차가 있다)은 history 가 생긴 뒤에 갈린다(AR-006).
    await page.goto(VALID_URL);
    const own = {
      audience: await page.locator('[data-testid="result-screen"]').getAttribute('data-result-audience'),
      cta: await page.locator('[data-testid="result-screen"] a').first().innerText()
    };

    await page.goto(`/en/result/qmbti/INFJ?${SHARED_PAYLOAD}`);
    const shared = {
      audience: await page.locator('[data-testid="result-screen"]').getAttribute('data-result-audience'),
      cta: await page.locator('[data-testid="result-screen"] a').first().innerText()
    };

    expect(own.audience).toBe('own');
    expect(shared.audience).toBe('shared');
    expect(shared.cta).not.toBe(own.cta);
  });

  test('@smoke assertion:RS-03 a locale-less shared link resolves instead of 404', async ({page}) => {
    // 이 표면의 쓰임이 공유다 — 옮겨 붙이다 접두가 떨어진 주소가 읽는 사람의 언어로 열려야 한다.
    const response = await page.goto(`/result/qmbti/INFJ?${OWN_PAYLOAD}`);

    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toMatch(/^\/[a-z-]+\/result\/qmbti\/INFJ$/u);
    await expect(page.locator('[data-testid="result-screen"]')).toBeVisible();
  });
});

test.describe('Result URL handoff', () => {
  test('@smoke assertion:RS-04 a finished run replaces the test entry with its result address', async ({page}) => {
    await completeRunFromLanding(page);

    // ⑴ 도착한 곳이 주소다 — 경로에 파생 타입이, 키 없는 query 에 payload 가 들어 있다.
    await expect(page).toHaveURL(/\/en\/result\/qmbti\/[A-Z]{4}\?[A-Za-z0-9_-]+$/u);
    const screen = page.getByTestId('result-screen');
    await expect(screen).toBeVisible();
    await expect(screen).toHaveAttribute('data-result-audience', 'own');

    // ⑵ GNB 문맥이 바뀌었다 — 진행률도 타이머도 결과 화면을 따라오지 않는다(명세 §2-6).
    const context = await page.evaluate(() => ({
      page: document.querySelector('.page-shell')?.getAttribute('data-page-context'),
      timers: document.querySelectorAll('[data-testid="gnb-test-timer"]').length,
      progress: document.querySelectorAll('[data-testid="test-progress"]').length
    }));
    expect(context).toEqual({page: 'result', timers: 0, progress: 0});

    // ⑶ 새로고침으로 복원된다 — 주소가 self-contained 라는 말의 실측이다.
    const addressed = page.url();
    await page.reload();
    expect(page.url()).toBe(addressed);
    await expect(page.getByTestId('result-screen')).toBeVisible();
  });

  test('@smoke assertion:RS-04 browser back from the result lands before the test, not on a re-bootstrapped run', async ({
    page
  }) => {
    await completeRunFromLanding(page);
    await expect(page.getByTestId('result-screen')).toBeVisible();

    await page.goBack();

    // `replace` 가 `/test/{variant}` 항목을 대체했으므로 뒤로가기 한 번이 **테스트에 들어오기
    // 전 페이지**다. `push` 였다면 여기가 완료된 회차의 테스트 페이지이고, `instructionSeen` 이
    // 지워진 뒤라 instruction 부터 다시 시작한다.
    await expect(page).toHaveURL(/\/en$/u);
    await expect(page.getByTestId('landing-grid-shell')).toBeVisible();

    const leftovers = await page.evaluate(() => ({
      questionPanels: document.querySelectorAll('[data-testid="test-question-panel"]').length,
      instructionSheets: document.querySelectorAll('[data-testid="test-instruction-overlay"]').length
    }));
    expect(leftovers).toEqual({questionPanels: 0, instructionSheets: 0});
  });
});
