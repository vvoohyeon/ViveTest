import {expect, test, type Browser, type Page, type TestInfo, type ViewportSize} from '@playwright/test';

import {seedTelemetryConsent} from './helpers/consent';
import {PRIMARY_AVAILABLE_TEST_VARIANT} from './helpers/landing-fixture';
import {expectLocatorToMatchLocalSnapshot} from './helpers/local-snapshot';
import rawThemeMatrixManifest from './theme-matrix-manifest.json';

// Theme matrix baselines are captured through helper wrappers that delegate to Playwright `toHaveScreenshot`.

const THEME_STORAGE_KEY = 'vivetest-theme';
const PREVIEW_HOST = 'http://127.0.0.1:4173';
const REPRESENTATIVE_SETTLE_WAIT_MS = 300;

type MatrixLocale = 'en' | 'kr';
type MatrixTheme = 'light' | 'dark';
type MatrixSuite = 'layout' | 'state';
type SettleRecipe =
  | 'landing-normal'
  | 'landing-test-expanded'
  | 'landing-blog-expanded'
  | 'desktop-settings-open'
  | 'test-instruction'
  | 'test-question'
  | 'test-result'
  | 'mobile-landing-test-expanded'
  | 'mobile-landing-blog-expanded'
  | 'mobile-menu-open';
type ViewportTier = 'desktop' | 'tablet' | 'mobile';
type ViewportKey =
  | 'desktop-wide'
  | 'desktop-medium'
  | 'desktop-narrow'
  | 'tablet-wide'
  | 'tablet-narrow'
  | 'mobile';

interface ManifestViewport extends ViewportSize {
  tier: ViewportTier;
  boundary: boolean;
  stateCanonical: boolean;
}

interface ThemeMatrixCaseTemplate {
  id: string;
  suite: MatrixSuite;
  routeTemplate: string;
  settleRecipe: SettleRecipe;
  localeKeys?: MatrixLocale[];
  themeKeys?: MatrixTheme[];
  viewportKeys: ViewportKey[];
}

interface ThemeMatrixManifest {
  locales: MatrixLocale[];
  themes: MatrixTheme[];
  viewports: Record<ViewportKey, ManifestViewport>;
  layoutCases: ThemeMatrixCaseTemplate[];
  stateCases: ThemeMatrixCaseTemplate[];
}

interface ThemeMatrixCase extends ThemeMatrixCaseTemplate {
  locale: MatrixLocale;
  theme: MatrixTheme;
  viewportKey: ViewportKey;
  viewport: ViewportSize;
  route: string;
  screenshotName: string;
}

const themeMatrixManifest = rawThemeMatrixManifest as ThemeMatrixManifest;

function buildThemeMatrixCases(manifest: ThemeMatrixManifest): ThemeMatrixCase[] {
  const caseTemplates = [...manifest.layoutCases, ...manifest.stateCases];
  const cases: ThemeMatrixCase[] = [];

  for (const template of caseTemplates) {
    const locales = template.localeKeys ?? manifest.locales;
    const themes = template.themeKeys ?? manifest.themes;

    for (const locale of locales) {
      for (const theme of themes) {
        for (const viewportKey of template.viewportKeys) {
          const viewport = manifest.viewports[viewportKey];
          cases.push({
            ...template,
            locale,
            theme,
            viewportKey,
            viewport: {
              width: viewport.width,
              height: viewport.height
            },
            route: template.routeTemplate.replace('{locale}', locale),
            screenshotName: `theme-${template.suite}-${template.id}-${locale}-${theme}-${viewportKey}.png`
          });
        }
      }
    }
  }

  return cases;
}

async function setTheme(page: Page, theme: MatrixTheme) {
  await page.addInitScript(
    ([storageKey, nextTheme]) => {
      window.localStorage.setItem(storageKey, nextTheme);
    },
    [THEME_STORAGE_KEY, theme] as const
  );
}

async function openThemedPage(
  browser: Browser,
  theme: MatrixTheme,
  viewport?: ViewportSize
): Promise<Page> {
  const page = await browser.newPage({viewport});
  await seedTelemetryConsent(page, 'OPTED_IN');
  await setTheme(page, theme);
  return page;
}

async function captureRepresentativeState(input: {
  browser: Browser;
  theme: 'light' | 'dark';
  route: string;
  screenshotName: string;
  testInfo: TestInfo;
  viewport?: ViewportSize;
  settle?: (page: Page) => Promise<void>;
}) {
  const page = await openThemedPage(input.browser, input.theme, input.viewport);
  await page.goto(`${PREVIEW_HOST}${input.route}`);
  await expect(page.locator('.page-shell')).toBeVisible();

  if (input.settle) {
    await input.settle(page);
  }

  await expectLocatorToMatchLocalSnapshot(page.locator('.page-shell'), input.screenshotName, input.testInfo);
  await page.close();
}

async function expandLandingCard(page: Page, cardVariant: string) {
  const card = page.locator(`[data-card-variant="${cardVariant}"]`);
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
  const trigger = page.getByTestId('gnb-settings-trigger');
  const panel = page.getByTestId('gnb-settings-panel');

  await trigger.evaluate((element) => {
    if (element instanceof HTMLElement) {
      element.click();
    }
  });

  await expect(panel).toBeVisible();
  await expect(page.getByTestId('desktop-gnb-theme-controls')).toBeVisible();
  await page.waitForTimeout(REPRESENTATIVE_SETTLE_WAIT_MS);
}

async function startTestAttempt(page: Page) {
  await expect(page.getByTestId('test-instruction-overlay')).toBeVisible();
  await page.getByTestId('test-start-button').click();
  await expect(page.getByTestId('test-instruction-overlay')).toBeHidden();
  await expect(page.getByTestId('test-question-panel')).toBeVisible();
  await page.waitForTimeout(REPRESENTATIVE_SETTLE_WAIT_MS);
}

async function answerCurrentQuestion(page: Page, choice: 'A' | 'B') {
  const target = choice === 'A' ? 'test-choice-a' : 'test-choice-b';
  await page.getByTestId(target).click();
  await expect(page.getByTestId(target)).toHaveAttribute('data-selected', 'true');
  await page.waitForTimeout(100);
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
  await page.waitForTimeout(REPRESENTATIVE_SETTLE_WAIT_MS);
}

async function openMobileExpandedCard(page: Page, cardVariant: string) {
  const card = page.locator(`[data-card-variant="${cardVariant}"]`);
  const trigger = card.getByTestId('landing-grid-card-trigger');

  await trigger.scrollIntoViewIfNeeded();
  await trigger.evaluate((element) => {
    if (element instanceof HTMLElement) {
      element.click();
    }
  });
  await expect(card).toHaveAttribute('data-mobile-phase', 'OPEN');
  await expect(card.locator('[data-slot="expandedBody"]')).toBeVisible();
  await page.waitForTimeout(REPRESENTATIVE_SETTLE_WAIT_MS);
}

async function openMobileMenu(page: Page) {
  await page.getByTestId('gnb-mobile-menu-trigger').evaluate((element) => {
    if (element instanceof HTMLElement) {
      element.click();
    }
  });
  await expect(page.getByTestId('gnb-mobile-menu-panel')).toBeVisible();
  await page.waitForTimeout(REPRESENTATIVE_SETTLE_WAIT_MS);
}

async function applySettleRecipe(page: Page, recipe: SettleRecipe) {
  switch (recipe) {
    case 'landing-normal':
    case 'test-instruction':
      return;
    case 'landing-test-expanded':
      await expandLandingCard(page, PRIMARY_AVAILABLE_TEST_VARIANT);
      return;
    case 'landing-blog-expanded':
      await expandLandingCard(page, 'build-metrics');
      return;
    case 'desktop-settings-open':
      await openDesktopSettings(page);
      return;
    case 'test-question':
      await startTestAttempt(page);
      await answerCurrentQuestion(page, 'A');
      return;
    case 'test-result':
      await completeTestAttempt(page);
      return;
    case 'mobile-landing-test-expanded':
      await openMobileExpandedCard(page, PRIMARY_AVAILABLE_TEST_VARIANT);
      return;
    case 'mobile-landing-blog-expanded':
      await openMobileExpandedCard(page, 'build-metrics');
      return;
    case 'mobile-menu-open':
      await openMobileMenu(page);
      return;
    default: {
      const exhaustiveCheck: never = recipe;
      throw new Error(`Unhandled settle recipe: ${exhaustiveCheck}`);
    }
  }
}

const themeMatrixCases = buildThemeMatrixCases(themeMatrixManifest);

test.describe('Phase 11 theme matrix smoke', () => {
  for (const matrixCase of themeMatrixCases) {
    test(`@smoke assertion:B8-theme-matrix ${matrixCase.suite} ${matrixCase.id} ${matrixCase.locale} ${matrixCase.theme} ${matrixCase.viewportKey}`, async ({
      browser
    }, testInfo) => {
      await captureRepresentativeState({
        browser,
        theme: matrixCase.theme,
        route: matrixCase.route,
        viewport: matrixCase.viewport,
        screenshotName: matrixCase.screenshotName,
        testInfo,
        settle: async (page) => {
          await applySettleRecipe(page, matrixCase.settleRecipe);
        }
      });
    });
  }
});
