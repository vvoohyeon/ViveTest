import {expect, test, type Browser, type Page, type ViewportSize} from '@playwright/test';

const THEME_STORAGE_KEY = 'vibetest-theme';
const PREVIEW_HOST = 'http://127.0.0.1:4173';
const DESKTOP_VIEWPORT: ViewportSize = {width: 1280, height: 900};
const MOBILE_VIEWPORT: ViewportSize = {width: 390, height: 844};

async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript(
    ([storageKey, nextTheme]) => {
      window.localStorage.setItem(storageKey, nextTheme);
    },
    [THEME_STORAGE_KEY, theme] as const
  );
}

async function openThemedPage(
  browser: Browser,
  theme: 'light' | 'dark',
  viewport: ViewportSize = DESKTOP_VIEWPORT
): Promise<Page> {
  const page = await browser.newPage({viewport});
  await setTheme(page, theme);
  return page;
}

async function captureRepresentativeState(input: {
  browser: Browser;
  theme: 'light' | 'dark';
  route: string;
  screenshotName: string;
  viewport?: ViewportSize;
  settle?: (page: Page) => Promise<void>;
}) {
  const page = await openThemedPage(input.browser, input.theme, input.viewport);
  await page.goto(`${PREVIEW_HOST}${input.route}`);
  await expect(page.locator('.page-shell')).toBeVisible();

  if (input.settle) {
    await input.settle(page);
  }

  await expect(page.locator('.page-shell')).toHaveScreenshot(input.screenshotName);
  await page.close();
}

async function expandLandingCard(page: Page, cardId: string) {
  const card = page.locator(`[data-card-id="${cardId}"]`);
  await card.getByTestId('landing-grid-card-trigger').click();
  await expect(card).toHaveAttribute('data-card-state', 'expanded');
  await expect(card).toHaveAttribute('data-desktop-motion-role', 'steady');
  const cardBox = await card.boundingBox();
  if (cardBox) {
    await page.mouse.move(cardBox.x + 28, cardBox.y + 28);
  }
  await expect(card).toHaveAttribute('data-card-state', 'expanded');
  await expect(card).toHaveAttribute('data-desktop-motion-role', 'steady');
}

async function openDesktopSettings(page: Page) {
  await page.getByTestId('gnb-settings-trigger').hover();
  await expect(page.getByTestId('gnb-settings-panel')).toBeVisible();
  await expect(page.getByTestId('desktop-gnb-theme-controls')).toBeVisible();
}

async function startTestAttempt(page: Page) {
  await expect(page.getByTestId('test-instruction-overlay')).toBeVisible();
  await page.getByTestId('test-start-button').click();
  await expect(page.getByTestId('test-instruction-overlay')).toBeHidden();
  await expect(page.getByTestId('test-question-panel')).toBeVisible();
}

async function answerCurrentQuestion(page: Page, choice: 'A' | 'B') {
  const target = choice === 'A' ? 'test-choice-a' : 'test-choice-b';
  await page.getByTestId(target).click();
  await expect(page.getByTestId(target)).toHaveAttribute('data-selected', 'true');
}

async function completeTestAttempt(page: Page) {
  await startTestAttempt(page);

  for (const choice of ['A', 'B', 'A', 'B'] as const) {
    await answerCurrentQuestion(page, choice);
    const submitButton = page.getByTestId('test-submit-button');
    if (await submitButton.isVisible()) {
      await submitButton.click();
      break;
    }

    await page.getByTestId('test-next-button').click();
  }

  await expect(page.getByTestId('test-result-panel')).toBeVisible();
}

async function openMobileExpandedCard(page: Page, cardId: string) {
  const card = page.locator(`[data-card-id="${cardId}"]`);
  await card.getByTestId('landing-grid-card-trigger').click();
  await expect(card).toHaveAttribute('data-mobile-phase', 'OPEN');
  await expect(card.locator('[data-slot="expandedBody"]')).toBeVisible();
}

test.describe('Phase 11 theme matrix smoke', () => {
  test('@smoke assertion:B8-theme-matrix theme matrix captures representative landing, CTA, destination, and mobile states in light and dark modes', async ({
    browser
  }) => {
    for (const theme of ['light', 'dark'] as const) {
      await captureRepresentativeState({
        browser,
        theme,
        route: '/en',
        screenshotName: `theme-landing-${theme}.png`
      });

      await captureRepresentativeState({
        browser,
        theme,
        route: '/en',
        screenshotName: `theme-landing-${theme}-expanded.png`,
        settle: async (page) => {
          await expandLandingCard(page, 'test-rhythm-a');
        }
      });

      await captureRepresentativeState({
        browser,
        theme,
        route: '/en',
        screenshotName: `theme-landing-${theme}-blog-expanded.png`,
        settle: async (page) => {
          await expandLandingCard(page, 'blog-build-metrics');
        }
      });

      await captureRepresentativeState({
        browser,
        theme,
        route: '/en/blog',
        screenshotName: `theme-blog-${theme}.png`
      });

      await captureRepresentativeState({
        browser,
        theme,
        route: '/en/blog',
        screenshotName: `theme-blog-${theme}-settings.png`,
        settle: openDesktopSettings
      });

      await captureRepresentativeState({
        browser,
        theme,
        route: '/en/history',
        screenshotName: `theme-history-${theme}.png`
      });

      await captureRepresentativeState({
        browser,
        theme,
        route: '/en/test/rhythm-a/question',
        screenshotName: `theme-test-${theme}.png`
      });

      await captureRepresentativeState({
        browser,
        theme,
        route: '/en/test/rhythm-a/question',
        screenshotName: `theme-test-${theme}-question.png`,
        settle: async (page) => {
          await startTestAttempt(page);
          await answerCurrentQuestion(page, 'A');
        }
      });

      await captureRepresentativeState({
        browser,
        theme,
        route: '/en/test/rhythm-a/question',
        screenshotName: `theme-test-${theme}-result.png`,
        settle: completeTestAttempt
      });
    }

    await captureRepresentativeState({
      browser,
      theme: 'dark',
      route: '/en',
      viewport: MOBILE_VIEWPORT,
      screenshotName: 'theme-landing-mobile-dark-blog-expanded.png',
      settle: async (page) => {
        await openMobileExpandedCard(page, 'blog-build-metrics');
      }
    });
  });

  test('@smoke assertion:B8-theme-matrix theme matrix captures KR representative landing states in light and dark modes', async ({
    browser
  }) => {
    for (const theme of ['light', 'dark'] as const) {
      await captureRepresentativeState({
        browser,
        theme,
        route: '/kr',
        screenshotName: `theme-landing-kr-${theme}.png`
      });
    }
  });
});
