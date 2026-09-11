import {expect, test, type Browser, type Page, type TestInfo, type ViewportSize} from '@playwright/test';

import {seedTelemetryConsent} from './helpers/consent';
import {PRIMARY_AVAILABLE_TEST_VARIANT, SECONDARY_BLOG_VARIANT} from './helpers/landing-fixture';
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
  gate?: boolean;
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

function buildGateThemeMatrixCases(manifest: ThemeMatrixManifest): ThemeMatrixCase[] {
  const caseTemplates = [...manifest.layoutCases, ...manifest.stateCases].filter((template) => template.gate === true);
  const cases: ThemeMatrixCase[] = [];

  for (const template of caseTemplates) {
    const locales = template.localeKeys ?? manifest.locales;
    const themes = template.themeKeys ?? manifest.themes;
    const viewportKeys = template.viewportKeys.filter(
      (viewportKey) => manifest.viewports[viewportKey].stateCanonical === true
    );

    for (const locale of locales) {
      for (const theme of themes) {
        for (const viewportKey of viewportKeys) {
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

/**
 * 폰트가 실제로 도착한 뒤에 찍는다.
 *
 * Pretendard 는 `font-display: swap` 이고 preload 하지 않는다(`globals.css` 의 TYPEFACE 절 —
 * 전체 face 가 1.96 MB 라 본문이 폰트를 기다리면 안 된다). 그래서 스크린샷 시점이 swap 보다
 * 빠르면 같은 화면이 fallback 으로 찍히고, 한국어는 줄바꿈 위치까지 달라진다 — provenance 가
 * 2026-05-17 에 기록한 `theme-layout-test-instruction-kr-*` 6 장의 「환경 표류」가 이것이었고,
 * 재생성 직후 재실행에서도 같은 두 장이 다시 어긋났다(실측 2026-09-11: 2,342px · 706px).
 * `document.fonts.ready` 를 기다리면 그 경주가 사라진다 — baseline 이 스스로를 재현하지
 * 못하면 그 baseline 은 회귀를 판정할 수 없다.
 */
async function waitForWebFonts(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
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
  await waitForWebFonts(page);

  if (input.settle) {
    await input.settle(page);
  }

  // BQ-07 의 생성 이연은 2026-09-11 에 풀렸다 — 이 매트릭스의 baseline 은 전부 추적된다.
  // 따라서 `allowMissingBaseline` 을 넘기지 않는다: 없는 baseline 은 생성-후-통과가 아니라
  // 실패여야 한다(L11).
  await expectLocatorToMatchLocalSnapshot(page.locator('.page-shell'), input.screenshotName, input.testInfo);
  await page.close();
}

/**
 * 데스크톱 랜딩 카드의 hover 상태로 정착시킨다 — 클릭은 확장이 아니라 **진입**이다.
 *
 * 종전 이 함수는 트리거를 실제로 클릭했다. 트리거는 blog 카드에서 `<Link>`, test 카드에서
 * `onClick` 이 전이를 여는 `<button>` 이므로 클릭은 라우팅을 일으킨다. 그래서
 * `landing-test-expanded` · `landing-blog-expanded` 두 state 케이스는 **도달 자체가 불가능**했고
 * (실측: 카드가 `normal` 인 채로 남았다가 문서에서 사라진다), 그 상태로 `--update` 를 쳤다면
 * 랜딩 확장 카드의 baseline 자리에 **블로그 상세 페이지**가 들어앉았을 것이다.
 *
 * 두 카드 종류의 hover 상태는 같지 않다. 데스크톱/태블릿에서 확장 셸은 **test 카드만** 갖는다
 * (`landing-grid-card.tsx` 의 `DesktopExpandedShell` 이 `isTestCard` 로 막혀 있다). blog 카드의
 * hover 처리는 read-more 노출과 태그 절삭이고 `data-card-state` 는 `normal` 로 남는다 — 실측으로
 * 확인했다. 그래서 종착 단언이 종류별로 갈린다. 케이스 이름(`landing-blog-expanded`)은 모바일
 * 대응 케이스와 짝을 이루므로 그대로 둔다.
 */
async function settleLandingCardHover(page: Page, cardVariant: string) {
  const card = page.locator(`[data-card-variant="${cardVariant}"]`);
  await card.getByTestId('landing-grid-card-trigger').hover();

  if ((await card.getAttribute('data-card-content-type')) === 'blog') {
    await expect(card.locator('[data-slot="blogReadMore"]')).toHaveCSS('visibility', 'visible');
    await expect(card).toHaveAttribute('data-card-state', 'normal');
  } else {
    await expect(card).toHaveAttribute('data-card-state', 'expanded');
    await expect(card).toHaveAttribute('data-desktop-motion-role', 'steady');
  }

  await page.waitForTimeout(REPRESENTATIVE_SETTLE_WAIT_MS);
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
  await expect(page.getByTestId('test-question-number')).toHaveText(/^Q\d+$/u);
  await expect(page.getByTestId('test-prev-button')).toBeHidden();
  await page.waitForTimeout(REPRESENTATIVE_SETTLE_WAIT_MS);
}

async function answerCurrentQuestion(page: Page, choice: 'A' | 'B') {
  const questionNumber = page.getByTestId('test-question-number');
  const previousQuestionNumber = await questionNumber.textContent();
  const target = choice === 'A' ? 'test-choice-a' : 'test-choice-b';
  await page.getByTestId(target).click();

  await page.waitForFunction(
    (previousText) => {
      const currentQuestionNumber = document.querySelector('[data-testid="test-question-number"]')?.textContent;
      const submitButton = document.querySelector('[data-testid="test-submit-button"]');
      const submitEnabled = submitButton instanceof HTMLButtonElement && !submitButton.disabled;
      return currentQuestionNumber !== previousText || submitEnabled;
    },
    previousQuestionNumber ?? '',
    {timeout: 800}
  );
}

async function completeTestAttempt(page: Page) {
  await startTestAttempt(page);

  for (let index = 0; index < 12; index += 1) {
    const choice = index % 2 === 0 ? 'A' : 'B';
    await answerCurrentQuestion(page, choice);
    const submitButton = page.getByTestId('test-submit-button');
    if ((await submitButton.count()) > 0 && (await submitButton.isEnabled({timeout: 0}))) {
      await submitButton.click();
      break;
    }
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
      await settleLandingCardHover(page, PRIMARY_AVAILABLE_TEST_VARIANT);
      return;
    case 'landing-blog-expanded':
      await settleLandingCardHover(page, SECONDARY_BLOG_VARIANT);
      return;
    case 'desktop-settings-open':
      await openDesktopSettings(page);
      return;
    case 'test-question':
      await startTestAttempt(page);
      return;
    case 'test-result':
      await completeTestAttempt(page);
      return;
    case 'mobile-landing-test-expanded':
      await openMobileExpandedCard(page, PRIMARY_AVAILABLE_TEST_VARIANT);
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
const themeMatrixGateCases = buildGateThemeMatrixCases(themeMatrixManifest);

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

test.describe('Phase 11 theme matrix gate', () => {
  for (const matrixCase of themeMatrixGateCases) {
    test(`@gate @smoke assertion:B8-theme-matrix ${matrixCase.suite} ${matrixCase.id} ${matrixCase.locale} ${matrixCase.theme} ${matrixCase.viewportKey}`, async ({
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
