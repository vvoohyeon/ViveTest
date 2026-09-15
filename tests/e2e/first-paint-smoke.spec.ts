import {expect, test, type Page} from '@playwright/test';

import {locales} from '../../src/config/site';

const PHONE = {width: 390, height: 844} as const;

/** 조각 하나가 8~44 KB 다. 라틴 계열은 넷~여섯, 한중일은 열둘~열여섯을 받는다(실측 2026-09-16). */
const SLICE_BYTE_BUDGET = {
  latin: 200_000,
  cjk: 420_000
} as const;

const CJK_LOCALES = new Set(['kr', 'ja', 'zs', 'zt']);

/**
 * 업스트림 조각이 놓친 651 개 코드포인트(라틴 확장 일부 + 키릴 전체)를 본문에 쓰는 locale 들.
 * 이들만 전체 face 를 backstop 으로 받는다 — 그 임시 상태의 경계가 정확히 이 목록이고,
 * 부족분 조각이 생기면 이 집합은 **빈 집합**이 된다(BQ-47).
 */
const BACKSTOP_LOCALES = new Set(['de', 'es', 'pt', 'ru']);

async function readFontUsage(page: Page) {
  return page.evaluate(() => {
    const fonts = performance.getEntriesByType('resource').filter((entry) => entry.name.includes('.woff2'));
    const preloaded = [...document.querySelectorAll('link[rel="preload"][as="font"]')].map(
      (link) => (link as HTMLLinkElement).href
    );

    return {
      requested: fonts.map((entry) => entry.name),
      bytes: fonts.reduce((sum, entry) => sum + ((entry as PerformanceResourceTiming).transferSize || 0), 0),
      sliceBytes: fonts
        .filter((entry) => entry.name.includes('/fonts/pretendard/'))
        .reduce((sum, entry) => sum + ((entry as PerformanceResourceTiming).transferSize || 0), 0),
      preloaded,
      fullFaceRequested: fonts.some((entry) => /\/fonts\/PretendardVariable\.woff2$/u.test(entry.name))
    };
  });
}

test.describe('First paint — font, theme, LCP', () => {
  test('@smoke assertion:FP-01 each locale pulls only the slices it renders, and nothing is preloaded', async ({
    browser
  }) => {
    test.setTimeout(180_000);

    for (const locale of locales) {
      const context = await browser.newContext({viewport: PHONE});
      const page = await context.newPage();
      await page.goto(`/${locale}`);
      await page.waitForLoadState('networkidle');

      const usage = await readFontUsage(page);

      // **폰트를 preload 하지 않는다.** 조각이 작아졌으니 preload 해도 되겠다는 판단을
      // 실측이 기각했다(2026-09-16, HTTP/2 · Slow 4G): preload 한 116 KB 가 렌더를 막는
      // CSS 와 같은 우선순위로 회선을 나눠 써 CSS 완료가 650 ms, LCP 가 966 ms 밀렸다.
      // `fetchPriority="low"` 로도 회복되지 않았다. `font-display: swap` 이라 어떤 텍스트도
      // 폰트를 기다리지 않으므로 당길 이유가 없다.
      expect(usage.preloaded, `${locale}: 폰트를 preload 한다`).toEqual([]);

      // backstop 은 자기 목록 안에서만 당겨져야 한다. 목록 밖에서 2 MB 가 당겨지면 조각
      // 분할이 그 locale 에서 통째로 무위가 되고, 그것은 예산이 아니라 회귀다.
      expect(usage.fullFaceRequested, `${locale}: 전체 face 를 받았다`).toBe(BACKSTOP_LOCALES.has(locale));

      // 예산은 **조각에만** 건다. backstop 의 2 MB 를 예산에 녹이면 그 수가 예산이 아니게 되고,
      // 부족분 조각이 들어오는 날 아무것도 붉어지지 않는다.
      const budget = CJK_LOCALES.has(locale) ? SLICE_BYTE_BUDGET.cjk : SLICE_BYTE_BUDGET.latin;
      expect(usage.sliceBytes, `${locale}: 조각 전송 예산`).toBeLessThanOrEqual(budget);

      // 조각이 하나도 안 오면 위의 예산은 저절로 통과한다 — 그 침묵을 여기서 막는다.
      expect(usage.sliceBytes, `${locale}: 조각을 하나도 받지 않았다`).toBeGreaterThan(0);

      await context.close();
    }
  });

  test('@smoke assertion:FP-02 the full face is only a backstop — no locale pulls it for ordinary text', async ({
    browser
  }) => {
    // 전체 face 는 업스트림 조각이 놓친 651 개 코드포인트(라틴 확장 일부 + 키릴)만 받친다.
    // 그 범위 밖 문자로 이것이 당겨지면 조각 분할이 통째로 무위가 된다.
    for (const locale of ['en', 'kr', 'ja', 'id', 'fr', 'zs', 'zt']) {
      const context = await browser.newContext({viewport: PHONE});
      const page = await context.newPage();
      await page.goto(`/${locale}`);
      await page.waitForLoadState('networkidle');

      const usage = await readFontUsage(page);
      expect(usage.fullFaceRequested, `${locale}: 전체 face 를 받았다`).toBe(false);
      await context.close();
    }
  });

  test('@smoke assertion:TB-01 the theme bootstrap resolves without the framework runtime', async ({browser}) => {
    // 종전 결함의 정확한 모양: `beforeInteractive` 가 스크립트를 `self.__next_s` 큐에 넣고
    // **Next 런타임 청크가** 그것을 실행했다. 그래서 청크를 막으면 테마가 SSR 기본값에 머물렀고,
    // 다크 사용자는 첫 페인트에서 라이트 화면을 봤다(Fast 4G 1,343ms · Slow 4G 5,483ms).
    const context = await browser.newContext({viewport: PHONE, colorScheme: 'dark'});
    const page = await context.newPage();
    await page.route('**/_next/static/chunks/**', (route) => route.abort());
    await page.goto('/en', {waitUntil: 'commit'});

    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset.theme), {timeout: 5_000})
      .toBe('dark');

    const themeColors = await page.evaluate(() =>
      [...document.querySelectorAll('meta[name="theme-color"]')].map((meta) => ({
        media: meta.getAttribute('media'),
        content: meta.getAttribute('content')
      }))
    );
    expect(themeColors.every((meta) => meta.media === null)).toBe(true);
    await context.close();
  });

  test('@smoke assertion:LCP-01 only the first card thumbnail is eager and preloaded', async ({browser}) => {
    const context = await browser.newContext({viewport: PHONE});
    const page = await context.newPage();
    await page.goto('/en');
    await page.waitForLoadState('domcontentloaded');

    const thumbnails = await page.evaluate(() =>
      [...document.querySelectorAll('img.landing-grid-card-thumbnail')].map((img) => ({
        loading: (img as HTMLImageElement).getAttribute('loading'),
        fetchPriority: (img as HTMLImageElement).getAttribute('fetchpriority'),
        src: (img as HTMLImageElement).getAttribute('src')
      }))
    );

    expect(thumbnails.length).toBeGreaterThan(1);
    // 행동을 지는 것은 **`loading` 의 부재와 head 의 preload 링크**다. 이 Next 판본은 이미지에
    // `fetchpriority` 를 내보내지 않으므로 그 철자를 단언하면 제품이 멀쩡한데 붉어진다(L21).
    expect(thumbnails[0].loading, '첫 카드가 lazy 면 preload 스캐너가 건너뛴다').not.toBe('lazy');
    for (const [index, thumbnail] of thumbnails.slice(1).entries()) {
      expect(thumbnail.loading, `뒤 카드 ${index + 1} 은 lazy 로 남는다`).toBe('lazy');
    }

    const preloadedImages = await page.evaluate(() =>
      [...document.querySelectorAll('link[rel="preload"][as="image"]')].map((link) => (link as HTMLLinkElement).href)
    );
    expect(preloadedImages, '이미지 preload 는 첫 카드 하나뿐이다').toHaveLength(1);
    expect(preloadedImages[0]).toContain(thumbnails[0].src ?? 'MISSING');
    await context.close();
  });
});
