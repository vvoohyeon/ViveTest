import {expect, test, type Browser, type Page} from '@playwright/test';

const THEME_STORAGE_KEY = 'vibetest-theme';

async function setTheme(page: import('@playwright/test').Page, theme: 'light' | 'dark') {
  await page.addInitScript(
    ([storageKey, nextTheme]) => {
      window.localStorage.setItem(storageKey, nextTheme);
    },
    [THEME_STORAGE_KEY, theme] as const
  );
}

async function openThemedPage(browser: Browser, theme: 'light' | 'dark'): Promise<Page> {
  const page = await browser.newPage({
    viewport: {width: 1280, height: 900}
  });
  await setTheme(page, theme);
  return page;
}

test.describe('Phase 11 theme matrix smoke', () => {
  test('@smoke assertion:B8-theme-matrix theme matrix captures landing normal and expanded states in light and dark modes', async ({
    page,
    browser
  }) => {
    await page.setViewportSize({width: 1280, height: 900});

    await setTheme(page, 'light');
    await page.goto('/en');
    await expect(page.locator('.page-shell')).toHaveScreenshot('theme-landing-light.png');

    const lightExpandedLanding = await openThemedPage(browser, 'light');
    await lightExpandedLanding.goto('http://127.0.0.1:4173/en');
    await lightExpandedLanding.locator('[data-card-id="test-rhythm-a"]').getByTestId('landing-grid-card-trigger').click();
    await expect(lightExpandedLanding.locator('.page-shell')).toHaveScreenshot('theme-landing-light-expanded.png');

    const darkLanding = await openThemedPage(browser, 'dark');
    await darkLanding.goto('http://127.0.0.1:4173/en');
    await expect(darkLanding.locator('.page-shell')).toHaveScreenshot('theme-landing-dark.png');
    const landingCard = darkLanding.locator('[data-card-id="test-rhythm-a"]');
    await landingCard.getByTestId('landing-grid-card-trigger').click();
    await expect(darkLanding.locator('.page-shell')).toHaveScreenshot('theme-landing-dark-expanded.png');

    const lightBlog = await openThemedPage(browser, 'light');
    await lightBlog.goto('http://127.0.0.1:4173/en/blog');
    await expect(lightBlog.locator('.page-shell')).toHaveScreenshot('theme-blog-light.png');

    const darkBlog = await openThemedPage(browser, 'dark');
    await darkBlog.goto('http://127.0.0.1:4173/en/blog');
    await expect(darkBlog.locator('.page-shell')).toHaveScreenshot('theme-blog-dark.png');

    const lightHistory = await openThemedPage(browser, 'light');
    await lightHistory.goto('http://127.0.0.1:4173/en/history');
    await expect(lightHistory.locator('.page-shell')).toHaveScreenshot('theme-history-light.png');

    const darkHistory = await openThemedPage(browser, 'dark');
    await darkHistory.goto('http://127.0.0.1:4173/en/history');
    await expect(darkHistory.locator('.page-shell')).toHaveScreenshot('theme-history-dark.png');

    const lightTest = await openThemedPage(browser, 'light');
    await lightTest.goto('http://127.0.0.1:4173/en/test/rhythm-a/question');
    await expect(lightTest.locator('.page-shell')).toHaveScreenshot('theme-test-light.png');

    const darkTest = await openThemedPage(browser, 'dark');
    await darkTest.goto('http://127.0.0.1:4173/en/test/rhythm-a/question');
    await expect(darkTest.locator('.page-shell')).toHaveScreenshot('theme-test-dark.png');

    await lightExpandedLanding.close();
    await darkLanding.close();
    await lightBlog.close();
    await darkBlog.close();
    await lightHistory.close();
    await darkHistory.close();
    await lightTest.close();
    await darkTest.close();
  });
});
