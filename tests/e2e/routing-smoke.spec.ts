import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';

import {expect, test} from '@playwright/test';

import {localeOptions, locales, resolveHtmlLang} from '../../src/config/site';
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

  test('@smoke segment-local domain errors resolve to segment not-found', async ({page}) => {
    const response = await page.goto('/en/test/INVALID!');
    expect(response?.status()).toBe(404);
    await expect(page.getByTestId('segment-not-found').getByRole('heading', {name: 'That page is not here'})).toBeVisible();
    await expect(page.getByTestId('global-not-found')).toHaveCount(0);
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
    await expect(page.getByTestId('test-error-recovery')).toContainText(
      '이 테스트에 진입할 수 없습니다 (variant: debug-sample)'
    );
    await expect(page.getByTestId('test-shell-card')).toHaveCount(0);
    await page.waitForTimeout(100);
    expect(telemetryRequests).toEqual([]);

    await page.goto('/en/test/error');
    await expect(page.getByTestId('test-error-recovery')).toContainText('이 테스트에 진입할 수 없습니다');
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
    await page.goto('/en');
    await expect(page.locator('html')).toHaveAttribute('lang', resolveHtmlLang('en'));

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

    // ⑷ manifest 가 실재하고 파싱된다.
    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifestHref).toBeTruthy();
    const manifestResponse = await request.get(manifestHref!);
    expect(manifestResponse.ok()).toBe(true);
    const manifestBody = (await manifestResponse.json()) as {name?: string; start_url?: string};
    expect(manifestBody.name).toBeTruthy();
    expect(manifestBody.start_url).toBeTruthy();

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
    expect(applied.content).toBe('#fbfaf7');

    // OS 는 다크인데 사용자가 라이트를 골랐던 상태 — 종전이라면 크롬만 다크로 남았다.
    await page.emulateMedia({colorScheme: 'dark'});
    await page.evaluate(() => window.localStorage.setItem('vivetest-theme', 'light'));
    await page.reload();

    const overridden = await readThemeColor();
    expect(overridden.theme, 'OS 다크에서도 저장된 라이트 선택이 이긴다').toBe('light');
    expect(overridden.content, 'OS 가 아니라 해석된 테마를 따라야 한다').toBe('#fbfaf7');
  });
});
