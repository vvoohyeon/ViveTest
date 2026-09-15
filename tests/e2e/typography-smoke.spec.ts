import {expect, test, type Page} from '@playwright/test';

/**
 * 타이포의 뷰포트 축을 **양방향으로** 고정한다.
 *
 * 한쪽만 재면 축이 있는지 알 수 없다 — 모바일 값만 단언하면 데스크톱도 같은 값이 된 회귀를
 * 통과시키고, 데스크톱만 단언하면 축이 통째로 사라져도 초록이다. 그래서 같은 역할을 두 폭에서
 * 재고 **다르다는 것**까지 함께 본다.
 */
const ROLE_PROBES = [
  {role: 'cardTitle', selector: '[data-slot="cardTitle"]', mobile: 18, desktop: 20},
  {role: 'cardSubtitle', selector: '[data-card-variant] p', mobile: 16, desktop: 15}
] as const;

async function fontSizeOf(page: Page, selector: string): Promise<number> {
  return page.evaluate((css) => {
    const element = document.querySelector(css);
    if (!(element instanceof HTMLElement)) {
      throw new Error(`프로브가 원소를 찾지 못했다: ${css}`);
    }

    return Math.round(Number.parseFloat(getComputedStyle(element).fontSize) * 100) / 100;
  }, selector);
}

test.describe('Typography viewport axis', () => {
  test('@smoke assertion:TY-01 tokenized roles take a different step on the phone', async ({browser}) => {
    for (const probe of ROLE_PROBES) {
      const measured: Record<string, number> = {};
      for (const [label, width] of [['mobile', 390], ['desktop', 1280]] as const) {
        const context = await browser.newContext({viewport: {width, height: 844}});
        const page = await context.newPage();
        await page.goto('/en');
        await page.evaluate(async () => {
          await document.fonts.ready;
        });
        measured[label] = await fontSizeOf(page, probe.selector);
        await context.close();
      }

      expect(measured.mobile, `${probe.role} @390`).toBe(probe.mobile);
      expect(measured.desktop, `${probe.role} @1280`).toBe(probe.desktop);
      expect(measured.mobile, `${probe.role}: 축이 없다 — 두 폭이 같은 값이다`).not.toBe(measured.desktop);
    }
  });

  test('@smoke assertion:TY-02 the phone carries no tokenized prose below 15px', async ({browser}) => {
    const context = await browser.newContext({viewport: {width: 390, height: 844}});
    const page = await context.newPage();
    await page.goto('/en');
    // **`document.fonts.ready` 는 렌더 장벽이 아니다.** 카탈로그는 하이드레이션 뒤에 그려지는데
    // 폰트 약속은 그보다 먼저 풀리므로, 그것만 기다리면 census 가 GNB 몇 줄만 보고 끝난다
    // (실측: 6 개 대 47 개). 종전에는 번들 도착이 우연히 빨라 통과하고 있었고, `motion` 제거로
    // 그 우연이 사라지자 드러났다. 피사체가 실제로 그려진 것을 먼저 확인한다.
    await expect(page.locator('[data-testid="landing-grid-card"]').first()).toBeVisible();
    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    const census = await page.evaluate(() => {
      const undersized: string[] = [];
      let visible = 0;
      for (const element of document.querySelectorAll('body *')) {
        if (!(element instanceof HTMLElement)) continue;
        const ownText = [...element.childNodes]
          .filter((node) => node.nodeType === 3)
          .map((node) => (node.textContent ?? '').trim())
          .join('');
        if (ownText.length === 0) continue;
        const style = getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
        const rect = element.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;

        visible += 1;
        const size = Math.round(Number.parseFloat(style.fontSize) * 100) / 100;
        // 바닥은 15px 이다 — 모바일 열이 `--body-sm` 을 14 → 15 로 올렸고 `--button` 은 15 다.
        // 13px 이하는 보조 정보(태그·메타·캡션)이고 밀도와 함께 판정한다(단위 7 소관).
        // 14.08px 은 토큰이 없는 GNB pill 이고 단위 10 소관이다.
        if (size >= 15 || size <= 13 || size === 14.08) continue;
        undersized.push(`${element.tagName}.${String(element.className).split(' ')[0]} ${size}px`);
      }

      return {visible, undersized};
    });

    expect(census.visible, '전제: 텍스트를 하나도 못 찾으면 아래 단언이 공허하다').toBeGreaterThan(20);
    // 14px 대로 남은 토큰 역할이 있으면 모바일 열이 그 자리를 놓쳤다는 뜻이다 — 열을 통째로
    // 지우면 `--body-sm` 이 14px 로 떨어져 여기가 붉는다.
    expect(census.undersized).toEqual([]);
    await context.close();
  });
});
