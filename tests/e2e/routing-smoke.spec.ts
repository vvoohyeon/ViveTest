import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';

import {expect, test} from '@playwright/test';

import {THEME_GROUND_COLOR} from '../../src/app/theme-ground-color';
import {localeOptions, locales, resolveHtmlLang, type AppLocale} from '../../src/config/site';
import {
  buildLocalizedBlogDetailRoute,
  buildLocalizedBlogIndexRoute,
  NON_ENTERABLE_BLOG_VARIANT,
  PRIMARY_AVAILABLE_TEST_VARIANT,
  PRIMARY_BLOG_VARIANT,
  SECONDARY_BLOG_VARIANT
} from './helpers/landing-fixture';

const PREVIEW_LOG_PATH = path.join(process.cwd(), '.next/qa/preview-smoke.log');
const PREVIEW_404_ALLOWLIST = /Error: Internal: NoFallbackError(?:\n\s+at .+)+/gu;
const isPreviewServerMode = process.env.PLAYWRIGHT_SERVER_MODE === 'preview';
const SUPPORTED_LOCALE_PATTERN = `(?:${locales.join('|')})`;
const DUPLICATE_LOCALE_PATTERN = new RegExp(`^/${SUPPORTED_LOCALE_PATTERN}/${SUPPORTED_LOCALE_PATTERN}(/|$)`, 'u');

function hasHydrationWarning(text: string): boolean {
  return /hydration|did not match|server html|client html|hydrating/u.test(text);
}

function readPreviewLog(): string {
  if (!existsSync(PREVIEW_LOG_PATH)) {
    return '';
  }

  return readFileSync(PREVIEW_LOG_PATH, 'utf8');
}

function readPreviewLogDelta(before: string): string {
  const after = readPreviewLog();
  return after.startsWith(before) ? after.slice(before.length) : after;
}

function collectUnexpectedPreviewErrors(log: string): string[] {
  return log
    .replace(PREVIEW_404_ALLOWLIST, '')
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(
      (line) =>
        /^(Error:|TypeError:|ReferenceError:|Unhandled|⨯|error - )/u.test(line) &&
        !/^Error: Internal: NoFallbackError$/u.test(line)
    );
}

test.describe('Phase 1 routing smoke', () => {
  test('@smoke assertion:B2-locale-prefix root + allowlist redirect keeps single locale prefix', async ({page}) => {
    await page.goto('/');
    await expect(page).toHaveURL(new RegExp(`/${SUPPORTED_LOCALE_PATTERN}$`, 'u'));
    expect(new URL(page.url()).pathname).not.toMatch(DUPLICATE_LOCALE_PATTERN);

    await page.goto('/blog');
    await expect(page).toHaveURL(new RegExp(`/${SUPPORTED_LOCALE_PATTERN}/blog$`, 'u'));
    expect(new URL(page.url()).pathname).not.toMatch(DUPLICATE_LOCALE_PATTERN);

    await page.goto(`/blog/${PRIMARY_BLOG_VARIANT}`);
    await expect(page).toHaveURL(new RegExp(`/${SUPPORTED_LOCALE_PATTERN}/blog/${PRIMARY_BLOG_VARIANT}$`, 'u'));
    expect(new URL(page.url()).pathname).not.toMatch(DUPLICATE_LOCALE_PATTERN);

    await page.goto('/history');
    await expect(page).toHaveURL(new RegExp(`/${SUPPORTED_LOCALE_PATTERN}/history$`, 'u'));
    expect(new URL(page.url()).pathname).not.toMatch(DUPLICATE_LOCALE_PATTERN);

    await page.goto(`/test/${PRIMARY_AVAILABLE_TEST_VARIANT}`);
    await expect(page).toHaveURL(new RegExp(`/${SUPPORTED_LOCALE_PATTERN}/test/${PRIMARY_AVAILABLE_TEST_VARIANT}$`, 'u'));
    expect(new URL(page.url()).pathname).not.toMatch(DUPLICATE_LOCALE_PATTERN);
  });

  test('@smoke non-allowlisted paths outside the route contract use global 404 while duplicate locale paths stay global 404', async ({
    page
  }) => {
    const previewLogBefore = readPreviewLog();
    const unmatchedResponse = await page.goto('/foo');
    expect(unmatchedResponse?.status()).toBe(404);
    await expect(page.getByTestId('global-not-found').getByRole('heading', {name: 'That page is not here'})).toBeVisible();
    await expect(page).toHaveTitle(/Page not found/u);

    const duplicateLocaleResponse = await page.goto('/ja/ja/blog');
    expect(duplicateLocaleResponse?.status()).toBe(404);
    await expect(page.getByTestId('global-not-found').getByRole('heading', {name: 'That page is not here'})).toBeVisible();

    if (isPreviewServerMode) {
      await page.waitForTimeout(100);
      expect(collectUnexpectedPreviewErrors(readPreviewLogDelta(previewLogBefore))).toEqual([]);
    }
  });

  // 종전에는 이 케이스가 404 + `segment-not-found` 였다. 그 404 는 **상태 코드만 있었다** —
  // `[locale]` 안에서 해결되는 404 는 `<body>` 가 빈 Next 오류 문서로 나가므로, 스크립트를 돌리기
  // 전에는 글자가 하나도 없었다(실측 2026-09-16). `req-test.md` §6.1 이 애초에 invalid variant 를
  // 404 가 아니라 **에러 복구 페이지**로 정해 두었고, 형제 라우트(blog 상세)가 이미 그렇게 한다.
  test('@smoke segment-local domain errors resolve to the recovery page, not an empty 404 document', async ({page}) => {
    await page.goto('/en/test/INVALID!');

    await expect(page).toHaveURL(/\/en\/test\/error\?variant=/u);
    await expect(page.getByTestId('test-error-recovery')).toBeVisible();
    await expect(page.getByTestId('global-not-found')).toHaveCount(0);
    // 모르는 **경로**는 여전히 404 다 — 그쪽은 프록시가 `[locale]` 밖에서 처리한다.
    expect((await page.goto('/en/no-such-route'))?.status()).toBe(404);
  });

  test('@smoke assertion:B30-runtime-lazy-validation-error-route lazy validation failure redirects to the test error recovery stub without mounting runtime', async ({
    page
  }) => {
    const telemetryRequests: string[] = [];
    await page.route('**/api/telemetry', async (route) => {
      telemetryRequests.push(route.request().postData() ?? '');
      await route.fulfill({status: 204, body: ''});
    });
    await page.addInitScript(() => {
      window.localStorage.setItem('vivetest-telemetry-consent', 'OPTED_IN');
      window.sessionStorage.setItem('vivetest-test-instruction-seen:debug-sample', 'true');
    });

    // debug-sample은 validateVariantDataIntegrity() 실패를 검증하기 위한 의도적 오류 fixture다.
    await page.goto('/en/test/debug-sample');

    await expect(page).toHaveURL(/\/en\/test\/error\?variant=debug-sample$/u);
    // 식별자는 **쿼리에 남고 화면에는 오지 않는다**(명세 §2-8) — 읽는 사람에게 `debug-sample` 은
    // 아무 뜻이 없고, 보여 준다고 돌아갈 길이 생기지도 않는다. 문구는 읽는 사람의 언어를 따른다.
    await expect(page.getByTestId('test-error-recovery')).toContainText('We could not open that test');
    await expect(page.getByTestId('test-error-recovery')).not.toContainText('debug-sample');
    await expect(page.getByTestId('test-shell-card')).toHaveCount(0);
    await page.waitForTimeout(100);
    expect(telemetryRequests).toEqual([]);

    await page.goto('/en/test/error');
    await expect(page.getByTestId('test-error-recovery')).toContainText('We could not open that test');
    await expect(page.getByTestId('test-error-recovery')).not.toContainText('variant:');
  });

  test('@smoke localized SSR responses emit locale-specific html lang and client locale navigation preserves it', async ({
    page,
    request
  }) => {
    const localizedResponses = [
      {pathname: '/en', locale: 'en'},
      {pathname: '/kr', locale: 'kr'},
      {pathname: '/zs', locale: 'zs'},
      {pathname: '/zt/blog', locale: 'zt'},
      {pathname: `/zt/blog/${PRIMARY_BLOG_VARIANT}`, locale: 'zt'},
      {pathname: '/ja', locale: 'ja'},
      {pathname: '/ru/blog', locale: 'ru'},
      {pathname: `/ru/blog/${PRIMARY_BLOG_VARIANT}`, locale: 'ru'}
    ] as const;

    for (const {pathname, locale} of localizedResponses) {
      const response = await request.get(pathname);
      expect(response.ok()).toBe(true);

      const html = await response.text();
      // `lang` 은 제품 코드가 아니라 **표시용 BCP 47 태그**다(`kr`→`ko` · `zs`→`zh-Hans` ·
      // `zt`→`zh-Hant`). URL 세그먼트의 정본은 여전히 제품 코드이며 위의 `pathname` 이 그것을
      // 쓰고 있다 — 이 단언이 둘을 구분한다.
      expect(html).toMatch(new RegExp(`<html[^>]*lang="${resolveHtmlLang(locale)}"`, 'u'));
    }

    await page.setViewportSize({width: 1280, height: 900});

    // 서버가 낸 태그가 **하이드레이션 뒤에도** 남아야 한다. `en` 하나만 보면 이 단언은
    // 공허하다 — 코드와 태그가 갈리는 셋(`kr`·`zs`·`zt`)에서만 되돌아감이 드러난다.
    for (const locale of ['kr', 'zs', 'zt', 'en'] as const) {
      await page.goto(`/${locale}`);
      await expect(page.locator('html'), locale).toHaveAttribute('lang', resolveHtmlLang(locale));
    }

    await page.goto('/en');

    await page.getByTestId('gnb-settings-trigger').hover();
    await expect(page.getByTestId('gnb-settings-panel')).toBeVisible();
    await page
      .getByTestId('desktop-gnb-locale-controls')
      .getByRole('button', {name: localeOptions.find(({code}) => code === 'ru')?.label ?? 'Русский'})
      .click();

    await expect(page).toHaveURL(/\/ru$/u);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  });

  test('@smoke assertion:B1-hydration hydration warnings remain zero on core localized routes', async ({page}) => {
    const hydrationWarnings: string[] = [];
    const previewLogBefore = readPreviewLog();
    page.on('console', (message) => {
      const text = message.text();
      if (hasHydrationWarning(text)) {
        hydrationWarnings.push(text);
      }
    });

    await page.goto('/en');
    await page.goto('/en/blog');
    await page.goto(`/en/blog/${PRIMARY_BLOG_VARIANT}`);
    await page.goto('/en/history');
    await page.waitForTimeout(100);

    expect(hydrationWarnings).toEqual([]);

    if (isPreviewServerMode) {
      expect(existsSync(PREVIEW_LOG_PATH)).toBe(true);
      expect(
        readPreviewLogDelta(previewLogBefore)
          .split(/\r?\n/u)
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .filter(hasHydrationWarning)
      ).toEqual([]);
    }
  });

  test('@smoke blog index direct entry stays list-only while detail direct entry resolves by route variant', async ({page}) => {
    await page.goto(buildLocalizedBlogIndexRoute('en'));
    await expect(page.getByTestId('blog-shell-card')).toBeVisible();
    await expect(page.getByTestId('blog-selected-article')).toHaveCount(0);
    await expect(page.locator('.blog-article-list-item')).toHaveCount(3);

    await page.goto(buildLocalizedBlogDetailRoute('en', SECONDARY_BLOG_VARIANT));
    await expect(page).toHaveURL(new RegExp(`/en/blog/${SECONDARY_BLOG_VARIANT}$`, 'u'));
    await expect(page.getByTestId('blog-selected-article')).toContainText('Build Metrics That Actually Matter');

    await page.reload();
    await expect(page).toHaveURL(new RegExp(`/en/blog/${SECONDARY_BLOG_VARIANT}$`, 'u'));
    await expect(page.getByTestId('blog-selected-article')).toContainText('Build Metrics That Actually Matter');
  });

  test('@smoke blog detail list navigation and landing whole-card navigation stay aligned to the route variant', async ({page}) => {
    await page.goto(buildLocalizedBlogDetailRoute('en', SECONDARY_BLOG_VARIANT));
    await page.locator('.blog-article-list-item').first().getByRole('link').click();
    await expect(page).toHaveURL(new RegExp(`/en/blog/${PRIMARY_BLOG_VARIANT}$`, 'u'));
    await expect(page.getByTestId('blog-selected-article')).toContainText('Operational Handbook for Stable Releases');

    await page.goto('/en');
    const blogCard = page.locator(`[data-card-variant="${SECONDARY_BLOG_VARIANT}"]`);
    await blogCard.getByTestId('landing-grid-card-trigger').click();

    await expect(page).toHaveURL(new RegExp(`/en/blog/${SECONDARY_BLOG_VARIANT}$`, 'u'));
    await expect(page.getByTestId('blog-selected-article')).toContainText('Build Metrics That Actually Matter');
  });

  test('@smoke blog detail invalid and non-enterable variants redirect to blog index', async ({page}) => {
    await page.goto(buildLocalizedBlogDetailRoute('en', 'missing-variant'));
    await expect(page).toHaveURL(/\/en\/blog$/u);
    await expect(page.getByTestId('blog-selected-article')).toHaveCount(0);

    await page.goto(buildLocalizedBlogDetailRoute('en', NON_ENTERABLE_BLOG_VARIANT));
    await expect(page).toHaveURL(/\/en\/blog$/u);
    await expect(page.getByTestId('blog-selected-article')).toHaveCount(0);
  });
  test('@smoke assertion:MB-01 mobile head contract — theme-color follows the resolved theme, manifest and static OG exist, safe-area is opened', async ({
    page,
    request
  }) => {
    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/en');

    // ⑴ `viewport-fit=cover` 가 없으면 `env(safe-area-inset-*)` 는 **항상 0** 이다. 저장소에
    // 그 함수를 쓰는 자리가 둘 있는데 지금까지 한 번도 0 이 아닌 적이 없었다.
    const viewportContent = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewportContent ?? '').toContain('viewport-fit=cover');

    // ⑵ description 이 자리표시자가 아니다.
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description ?? '').not.toContain('placeholder');
    expect((description ?? '').length).toBeGreaterThan(20);

    // ⑶ 정적 OG — 결과 공유 링크의 미리보기가 비어 있지 않아야 한다.
    for (const property of ['og:title', 'og:description', 'og:type', 'og:site_name']) {
      await expect(page.locator(`meta[property="${property}"]`), property).toHaveCount(1);
    }

    // ⑶-a **그림이 실제로 받아진다.** 태그만 보는 단언은 URL 이 404 여도 초록이다 — 그리고
    //     그것이 실제로 일어났다: 생성된 이미지 라우트는 점이 없어 `src/proxy.ts` 의 matcher 에
    //     걸렸고, `/apple-icon` 이 `/_not-found` 로 rewrite 돼 홈 화면 아이콘이 사라졌다
    //     (실측 2026-09-16). 미리보기와 아이콘은 제품 화면 밖에 있어 어느 baseline 도 보지 않는다.
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(ogImage, 'og:image 가 없으면 공유 미리보기가 빈 채로 나간다').toBeTruthy();
    expect(ogImage ?? '', 'og:image 는 절대 URL 이어야 한다 — 크롤러에는 문서 문맥이 없다').toMatch(/^https?:\/\//u);
    const ogImageResponse = await request.get(ogImage!);
    expect(ogImageResponse.ok(), `og:image 가 ${ogImageResponse.status()} 로 응답한다`).toBe(true);
    expect(ogImageResponse.headers()['content-type']).toContain('image/');

    const appleIconHref = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
    expect(appleIconHref, 'apple-touch-icon 이 없으면 iOS 홈 화면이 스크린샷을 쓴다').toBeTruthy();
    const appleIconResponse = await request.get(appleIconHref!);
    expect(appleIconResponse.ok(), `apple-touch-icon 이 ${appleIconResponse.status()} 로 응답한다`).toBe(true);

    // ⑷ manifest 가 실재하고 파싱되며, 그 안의 아이콘이 받아진다.
    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifestHref).toBeTruthy();
    const manifestResponse = await request.get(manifestHref!);
    expect(manifestResponse.ok()).toBe(true);
    const manifestBody = (await manifestResponse.json()) as {
      name?: string;
      start_url?: string;
      icons?: Array<{src: string; purpose?: string}>;
    };
    expect(manifestBody.name).toBeTruthy();
    expect(manifestBody.start_url).toBeTruthy();
    expect(manifestBody.icons?.length ?? 0, 'icons 가 없으면 「홈 화면에 추가」가 글자 아이콘이 된다').toBeGreaterThan(0);
    // Android 적응형 아이콘은 `maskable` 을 따로 고른다 — 없으면 흰 바탕에 축소된 아이콘이 박힌다.
    expect(
      (manifestBody.icons ?? []).some((icon) => (icon.purpose ?? '').includes('maskable')),
      'maskable 용도의 아이콘이 없다'
    ).toBe(true);
    for (const icon of manifestBody.icons ?? []) {
      const iconResponse = await request.get(icon.src);
      expect(iconResponse.ok(), `manifest 아이콘 ${icon.src} 이 ${iconResponse.status()} 로 응답한다`).toBe(true);
    }

    // ⑸ `theme-color` 는 **해석된 테마**를 따라간다 — OS 가 아니라.
    //    이것이 이 케이스의 핵심이다: `media` 두 값만 두면 OS-다크에서 라이트를 고른 사용자의
    //    크롬이 다크로 남아 페이지와 어긋난다.
    const readThemeColor = () =>
      page.evaluate(() => {
        const meta = document.querySelector('meta[name="theme-color"]');
        return {
          content: meta?.getAttribute('content') ?? null,
          media: meta?.getAttribute('media') ?? null,
          theme: document.documentElement.dataset.theme ?? null
        };
      });

    const applied = await readThemeColor();
    expect(applied.media, 'media 가 남아 있으면 OS 를 따라가 해석된 테마와 어긋난다').toBeNull();
    expect(applied.theme).toBe('light');
    expect(applied.content).toBe(THEME_GROUND_COLOR.light);

    // OS 는 다크인데 사용자가 라이트를 골랐던 상태 — 종전이라면 크롬만 다크로 남았다.
    await page.emulateMedia({colorScheme: 'dark'});
    await page.evaluate(() => window.localStorage.setItem('vivetest-theme', 'light'));
    await page.reload();

    const overridden = await readThemeColor();
    expect(overridden.theme, 'OS 다크에서도 저장된 라이트 선택이 이긴다').toBe('light');
    expect(overridden.content, 'OS 가 아니라 해석된 테마를 따라야 한다').toBe(THEME_GROUND_COLOR.light);

    // 그리고 반대 방향 — 저장된 다크. 종전에는 두 테마 중 **light 값 하나만** 단언했다.
    //
    // **이 단언이 보는 것의 경계를 적어 둔다.** 이것은 해석된 다크가 **하이드레이션 뒤**
    // `content` 에 도달하는 것을 본다. 부트스트랩 경로는 보지 못한다 — 그 파일만 요청 차단해도
    // 이 케이스는 초록이다(실측 2026-09-16, preview: `data-theme=dark` · `media` 제거 ·
    // `#141110`). `use-theme-preference` 가 같은 meta 를 다시 쓰기 때문이고, 그래서 두 경로 중
    // 하나만 깨면 여기가 침묵한다. 그래서 경로를 갈라 증인을 세웠다 — 부트스트랩 자신의 동작은
    // `tests/unit/theme-bootstrap-behavior.test.ts` 가, 그 리터럴 값은
    // `tests/unit/theme-color-parity.test.ts` 가 본다.
    //
    // **여기서도 저기서도 볼 수 없는 것은 타이밍이다.** App Router 의 `beforeInteractive` 는
    // 스크립트를 `self.__next_s` 큐에 넣고 **Next 런타임 청크가** 실행한다 — 청크를 전부 막으면
    // 큐에 `/theme-bootstrap.js` 가 미실행으로 남고 `data-theme` 이 SSR 기본값에 머문다(실측
    // 2026-09-16). 즉 「첫 페인트 전」이라는 상태가 존재하지 않으므로 청크를 막아 그 경로만
    // 읽는 증인은 만들 수 없다. 그 타이밍 결함은 점수표 `theme-bootstrap-never-runs-before-paint`
    // 이고 `docs/plans/2026-09-11-mobile-refactor-step3-surfaces.md` §4 가 소유한다.
    await page.emulateMedia({colorScheme: 'light'});
    await page.evaluate(() => window.localStorage.setItem('vivetest-theme', 'dark'));
    await page.reload();

    const darkApplied = await readThemeColor();
    expect(darkApplied.theme, 'OS 라이트에서도 저장된 다크 선택이 이긴다').toBe('dark');
    expect(darkApplied.media, 'media 를 걷어내지 않으면 다크에서도 OS 를 따른다').toBeNull();
    expect(darkApplied.content, '다크 지면 색도 해석된 테마를 따라야 한다').toBe(THEME_GROUND_COLOR.dark);
  });

  test('@smoke assertion:SH-01 every locale ships its own description and the full hreflang set', async ({page}) => {
    test.setTimeout(90_000);

    // 화면의 모든 문구는 12 locale 로 번역돼 있었는데 **문서 바깥으로 나가는 문장만** 영어
    // 한 벌이었다 — 한국어 페이지를 공유하면 미리보기 문장이 영어였고 검색 발췌도 그랬다.
    // 그림은 locale 을 갖지 않는다(`[locale]/opengraph-image.tsx` 가 이유를 적는다). 사람이
    // 미리보기에서 읽는 것은 문장이므로 그 문장이 locale 을 갖는 것이 요점이다.
    const seen = new Map<AppLocale, string>();

    for (const locale of locales) {
      await page.goto(`/${locale}`);

      const description = await page.locator('meta[name="description"]').getAttribute('content');
      const ogDescription = await page.locator('meta[property="og:description"]').getAttribute('content');

      expect(description, `${locale}: description 이 없다`).toBeTruthy();
      expect(description, `${locale}: description 이 자리표시자다`).not.toContain('placeholder');
      expect(ogDescription, `${locale}: og:description 이 description 과 다르다`).toBe(description);

      seen.set(locale, description!);

      // `og:locale` 은 표시용 태그를 따른다 — `<html lang>` 과 같은 사실의 다른 표면이다.
      await expect(page.locator('meta[property="og:locale"]'), `${locale}: og:locale`).toHaveAttribute(
        'content',
        resolveHtmlLang(locale)
      );

      // hreflang 은 12 개가 모두 있어야 한다. 하나라도 빠지면 그 언어판은 다른 언어판의
      // 중복으로 읽힌다.
      const alternates = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((links) =>
        links.map((link) => link.getAttribute('hreflang'))
      );
      expect(new Set(alternates).size, `${locale}: hreflang 개수`).toBe(locales.length);
    }

    // 12 개가 서로 다른 문장이어야 한다 — 하나라도 같으면 그 locale 은 번역되지 않은 것이다.
    expect(new Set(seen.values()).size, `locale 별 문장이 겹친다: ${JSON.stringify([...seen])}`).toBe(locales.length);
  });
});

/**
 * **사용자가 실제로 닿는 404 는 스크립트 없이도 글자를 낸다.**
 *
 * 이 파일의 다른 404 검사는 전부 JS 가 켜진 페이지에서 `getByTestId` 를 기다린다 —
 * 즉 하이드레이션 **뒤**만 본다. 그래서 「상태 코드만 맞고 본문이 빈 문서」와 「서버가
 * 본문을 낸 문서」를 구조적으로 구분하지 못한다. 단위 10 이 도달 가능한 404 를
 * `[locale]` 밖으로 옮겨 그 결함을 해소했지만, **옮겼다는 사실 자체를 재는 검사가
 * 없었다** — 여기가 그 자리다.
 *
 * 조건은 셋이고 마지막이 핵심이다. 상태가 404 이고, 탈출 링크가 보이고, 문서가
 * `id="__next_error__"` 가 **아니다**. 셋째가 L51 이 말하는 빈 오류 문서의 표식이다 —
 * 그것이면 앞의 둘은 하이드레이션이 끝난 뒤에야 참이 되고, JS 가 실패하면 영영 거짓이다.
 */
test.describe('Reachable 404 surfaces render without scripts', () => {
  // 도달 가능한 404 의 **모양**을 적는다. 주소 하나가 아니라 프록시가 404 를 내는 네 갈래다.
  const REACHABLE_404_SHAPES = [
    {label: 'unknown root path', path: '/foo'},
    {label: 'unknown path under a known locale', path: '/en/no-such-route'},
    {label: 'unknown locale', path: '/zz'},
    {label: 'duplicate locale prefix', path: '/ja/ja/blog'}
  ] as const;

  for (const shape of REACHABLE_404_SHAPES) {
    test(`@smoke assertion:NF-01 ${shape.label} serves its body from the server`, async ({browser}) => {
      const context = await browser.newContext({javaScriptEnabled: false});
      const page = await context.newPage();

      try {
        const response = await page.goto(shape.path);
        expect(response?.status(), `${shape.path} 가 404 가 아니다`).toBe(404);

        const html = await page.content();
        expect(
          html,
          `${shape.path} 가 빈 Next 오류 문서로 나갔다 — 상태 코드만 있고 본문이 없다(L51)`
        ).not.toContain('id="__next_error__"');

        // 스크립트가 없으므로 이 셋이 보인다는 것은 **서버가 그렸다**는 뜻이다.
        await expect(page.getByTestId('global-not-found')).toBeVisible();
        await expect(page.getByRole('heading', {name: 'That page is not here'})).toBeVisible();
        await expect(
          page.getByRole('link', {name: 'Return home'}),
          '탈출 링크가 없다 — JS 가 실패하면 나갈 길이 0 이다'
        ).toBeVisible();
      } finally {
        await context.close();
      }
    });
  }
});
