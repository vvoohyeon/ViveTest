import {expect, test, type Locator, type Page} from '@playwright/test';

import {localeOptions, type AppLocale} from '../../src/config/site';
import {seedTelemetryConsent} from './helpers/consent';
import {PRIMARY_AVAILABLE_TEST_CARD_ID, buildLocalizedPrimaryTestRoute} from './helpers/landing-fixture';

const THEME_STORAGE_KEY = 'vivetest-theme';
const DESKTOP_SETTINGS_PANEL_EXTRA_TOP_PX = 12;
const DESKTOP_SETTINGS_PANEL_EXTRA_RIGHT_PX = 15;
const DESKTOP_SETTINGS_GEOMETRY_TOLERANCE_PX = 0.5;
const EN_COMBINED_SETTINGS_LABEL = 'Language⋅Theme';
const HOVER_STYLE_SETTLE_MS = 180;

async function installViewTransitionStub(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(Document.prototype, 'startViewTransition', {
      configurable: true,
      writable: true,
      value: function (update: () => void) {
        update();
        return {
          ready: Promise.resolve()
        };
      }
    });
  });
}

async function readInteractiveSurfaceStyles(locator: Locator) {
  return locator.evaluate((element) => {
    const styles = getComputedStyle(element);
    const normalizeColor = (value: string) => {
      const probe = document.createElement('span');
      probe.style.color = value;
      document.body.appendChild(probe);
      const resolved = getComputedStyle(probe).color;
      probe.remove();
      return resolved;
    };
    const borderTopColor = normalizeColor(styles.borderTopColor);
    const boxShadow = styles.boxShadow;

    return {
      backgroundColor: normalizeColor(styles.backgroundColor),
      borderColor: normalizeColor(styles.borderColor),
      borderTopColor,
      color: normalizeColor(styles.color),
      boxShadowPresent: boxShadow !== 'none',
      boxShadowInset: boxShadow.includes('inset'),
      hasVisibleBorder: borderTopColor !== 'transparent' && borderTopColor !== 'rgba(0, 0, 0, 0)'
    };
  });
}

function getLocaleLabel(locale: AppLocale): string {
  return localeOptions.find(({code}) => code === locale)?.label ?? locale;
}

function getAlternateLocaleLabels(locale: AppLocale): string[] {
  return localeOptions.filter(({code}) => code !== locale).map(({label}) => label);
}

async function expectLocalePickerState(page: Page, scope: 'desktop' | 'mobile', locale: AppLocale) {
  const localeControls = page.getByTestId(`${scope}-gnb-locale-controls`);
  const currentLocaleLabel = getLocaleLabel(locale);

  await expect(localeControls.getByRole('button')).toHaveCount(localeOptions.length);

  for (const {code, label} of localeOptions) {
    const button = localeControls.getByRole('button', {name: label});

    await expect(button).toBeVisible();

    if (code === locale) {
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(button).toBeDisabled();
      await expect(button).toHaveText(currentLocaleLabel);
    } else {
      await expect(button).toHaveAttribute('aria-pressed', 'false');
      await expect(button).toBeEnabled();
    }
  }
}

async function expectCombinedSettingsLabel(page: Page, scope: 'desktop' | 'mobile', expectedLabel: string) {
  await expect(page.getByTestId(`${scope}-gnb-theme-controls`).locator('.gnb-settings-label')).toHaveText(expectedLabel);
  await expect(page.getByTestId(`${scope}-gnb-locale-controls`).locator('.gnb-settings-label')).toHaveCount(0);
}

function getThemeControls(page: Page, scope: 'desktop' | 'mobile') {
  const controls = page.getByTestId(`${scope}-gnb-theme-controls`);

  return {
    controls,
    lightButton: page.getByTestId(`${scope}-gnb-theme-light`),
    darkButton: page.getByTestId(`${scope}-gnb-theme-dark`),
    alternateButton: controls.locator('button:not([disabled])'),
    currentButton: controls.locator('button[disabled]')
  };
}

async function expectThemeButtonsState(
  page: Page,
  scope: 'desktop' | 'mobile',
  resolvedTheme: 'light' | 'dark'
) {
  const {controls, lightButton, darkButton, alternateButton, currentButton} = getThemeControls(page, scope);
  const alternateTheme = resolvedTheme === 'light' ? 'dark' : 'light';

  await expect(controls.locator('button').nth(0)).toHaveAttribute('data-theme-option', alternateTheme);
  await expect(controls.locator('button').nth(1)).toHaveAttribute('data-theme-option', resolvedTheme);
  await expect(alternateButton).toHaveAttribute('data-theme-option', alternateTheme);
  await expect(currentButton).toHaveAttribute('data-theme-option', resolvedTheme);
  await expect(alternateButton).toBeEnabled();
  await expect(currentButton).toBeDisabled();
  await expect(lightButton).toHaveAttribute('aria-pressed', resolvedTheme === 'light' ? 'true' : 'false');
  await expect(darkButton).toHaveAttribute('aria-pressed', resolvedTheme === 'dark' ? 'true' : 'false');
}

async function expectDesktopCurrentThemeButtonAlignment(page: Page) {
  const trigger = page.getByTestId('gnb-settings-trigger');
  const panel = page.getByTestId('gnb-settings-panel');
  const {alternateButton, currentButton} = getThemeControls(page, 'desktop');

  const [triggerBox, panelBox, currentButtonBox, alternateButtonBox] = await Promise.all([
    trigger.boundingBox(),
    panel.boundingBox(),
    currentButton.boundingBox(),
    alternateButton.boundingBox()
  ]);

  expect(triggerBox).not.toBeNull();
  expect(panelBox).not.toBeNull();
  expect(currentButtonBox).not.toBeNull();
  expect(alternateButtonBox).not.toBeNull();

  expect(Math.abs((currentButtonBox?.x ?? 0) - (triggerBox?.x ?? 0))).toBeLessThanOrEqual(
    DESKTOP_SETTINGS_GEOMETRY_TOLERANCE_PX
  );
  expect(Math.abs((currentButtonBox?.y ?? 0) - (triggerBox?.y ?? 0))).toBeLessThanOrEqual(
    DESKTOP_SETTINGS_GEOMETRY_TOLERANCE_PX
  );
  expect(Math.abs((currentButtonBox?.width ?? 0) - (triggerBox?.width ?? 0))).toBeLessThanOrEqual(
    DESKTOP_SETTINGS_GEOMETRY_TOLERANCE_PX
  );
  expect(Math.abs((currentButtonBox?.height ?? 0) - (triggerBox?.height ?? 0))).toBeLessThanOrEqual(
    DESKTOP_SETTINGS_GEOMETRY_TOLERANCE_PX
  );
  expect(
    Math.abs((currentButtonBox?.y ?? 0) - (panelBox?.y ?? 0) - DESKTOP_SETTINGS_PANEL_EXTRA_TOP_PX)
  ).toBeLessThanOrEqual(DESKTOP_SETTINGS_GEOMETRY_TOLERANCE_PX);
  expect(
    Math.abs(
      (panelBox?.x ?? 0) +
        (panelBox?.width ?? 0) -
        ((currentButtonBox?.x ?? 0) + (currentButtonBox?.width ?? 0) + DESKTOP_SETTINGS_PANEL_EXTRA_RIGHT_PX)
    )
  ).toBeLessThanOrEqual(DESKTOP_SETTINGS_GEOMETRY_TOLERANCE_PX);
  expect((alternateButtonBox?.x ?? 0) + (alternateButtonBox?.width ?? 0)).toBeLessThan(
    (currentButtonBox?.x ?? 0) + DESKTOP_SETTINGS_GEOMETRY_TOLERANCE_PX
  );
}

async function seedManualTheme(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript(
    ([storageKey, nextTheme]) => {
      window.localStorage.setItem(storageKey, nextTheme);
    },
    [THEME_STORAGE_KEY, theme] as const
  );
}

test.describe('Phase 3 gnb shell smoke', () => {
  test.beforeEach(async ({page}) => {
    await seedTelemetryConsent(page, 'OPTED_OUT');
  });

  test('@smoke assertion:B3-desktop-settings desktop settings open-close and overlay contract', async ({page}) => {
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en');

    const trigger = page.getByTestId('gnb-settings-trigger');
    const panel = page.getByTestId('gnb-settings-panel');

    await trigger.hover();
    await expect(panel).toBeVisible({timeout: 200});
    await expectCombinedSettingsLabel(page, 'desktop', EN_COMBINED_SETTINGS_LABEL);
    await expectLocalePickerState(page, 'desktop', 'en');
    await expectDesktopCurrentThemeButtonAlignment(page);

    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();

    await trigger.click();
    await expect(panel).toBeVisible();

    await page.evaluate(() => {
      const triggerEl = document.querySelector('[data-testid="gnb-settings-trigger"]');
      if (triggerEl instanceof HTMLElement) {
        triggerEl.blur();
      }
    });
    await expect(panel).toBeHidden({timeout: 150});
  });

  test('@smoke desktop settings close on outside click', async ({page}) => {
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en');

    const trigger = page.getByTestId('gnb-settings-trigger');
    const panel = page.getByTestId('gnb-settings-panel');

    await trigger.hover();
    await expect(panel).toBeVisible();

    await page.locator('.page-shell-main').click();
    await expect(panel).toBeHidden();
  });

  test('@smoke desktop fallback open works without hover capability', async ({page}) => {
    await page.addInitScript(() => {
      const originalMatchMedia = window.matchMedia.bind(window);
      window.matchMedia = (query: string) => {
        if (query === '(hover: hover) and (pointer: fine)') {
          return {
            matches: false,
            media: query,
            onchange: null,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
            addListener: () => undefined,
            removeListener: () => undefined,
            dispatchEvent: () => true
          } as MediaQueryList;
        }
        return originalMatchMedia(query);
      };
    });

    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en');

    const trigger = page.getByTestId('gnb-settings-trigger');
    const panel = page.getByTestId('gnb-settings-panel');

    await trigger.hover();
    await expect(panel).toBeHidden();

    await trigger.focus();
    await expect(panel).toBeVisible();
  });

  test('@smoke desktop settings shows the resolved system theme on first open', async ({page}) => {
    await page.addInitScript(() => {
      const originalMatchMedia = window.matchMedia.bind(window);
      window.localStorage.removeItem('vivetest-theme');
      window.matchMedia = (query: string) => {
        if (query === '(prefers-color-scheme: dark)') {
          return {
            matches: true,
            media: query,
            onchange: null,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
            addListener: () => undefined,
            removeListener: () => undefined,
            dispatchEvent: () => true
          } as MediaQueryList;
        }
        return originalMatchMedia(query);
      };
    });

    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en');

    await expect
      .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme')))
      .toBe('dark');
    await expect(page.getByTestId('gnb-settings-trigger')).toHaveAttribute('data-current-theme', 'dark');

    await page.getByTestId('gnb-settings-trigger').hover();
    await expect(page.getByTestId('gnb-settings-panel')).toBeVisible();
    await expectThemeButtonsState(page, 'desktop', 'dark');
    await expectDesktopCurrentThemeButtonAlignment(page);
  });

  test('@smoke desktop settings restores the stored manual theme without a blank selected state', async ({page}) => {
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en');
    await page.evaluate(() => {
      window.localStorage.setItem('vivetest-theme', 'dark');
    });
    await page.reload();

    await expect
      .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme')))
      .toBe('dark');
    await expect(page.getByTestId('gnb-settings-trigger')).toHaveAttribute('data-current-theme', 'dark');

    await page.getByTestId('gnb-settings-trigger').hover();
    await expect(page.getByTestId('gnb-settings-panel')).toBeVisible();
    await expectThemeButtonsState(page, 'desktop', 'dark');
    await expectDesktopCurrentThemeButtonAlignment(page);
  });

  test('@smoke desktop theme switch applies blur transition styles and cleans them up', async ({page}) => {
    await installViewTransitionStub(page);
    await seedManualTheme(page, 'light');
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en');

    const trigger = page.getByTestId('gnb-settings-trigger');
    const panel = page.getByTestId('gnb-settings-panel');

    await trigger.hover();
    await expect(panel).toBeVisible();
    await expectThemeButtonsState(page, 'desktop', 'light');

    const {darkButton} = getThemeControls(page, 'desktop');

    await darkButton.click();
    await expect(panel).toBeHidden();

    await expect
      .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme')))
      .toBe('dark');
    await expect.poll(() => page.evaluate(() => window.localStorage.getItem('vivetest-theme'))).toBe('dark');
    await expect(page.getByTestId('gnb-settings-trigger')).toHaveAttribute('data-current-theme', 'dark');
    await expect(page.locator('#theme-switch-style')).toHaveCount(1);

    await trigger.hover();
    await expect(panel).toBeVisible();
    await expectThemeButtonsState(page, 'desktop', 'dark');

    await expect(page.locator('#theme-switch-style')).toHaveCount(0, {timeout: 3000});
  });

  test('@smoke desktop settings reuses the landing answer hover affordance for selectable locale and theme chips', async ({
    page
  }) => {
    await page.setViewportSize({width: 1280, height: 900});

    const landingAnswerHoverStylesByTheme = {} as Record<'light' | 'dark', Awaited<ReturnType<typeof readInteractiveSurfaceStyles>>>;
    const themePreviewRestStylesByTheme = {
      light: {
        backgroundColor: 'rgb(255, 255, 255)',
        color: 'rgb(22, 26, 32)'
      },
      dark: {
        backgroundColor: 'rgb(18, 24, 33)',
        color: 'rgb(239, 242, 248)'
      }
    } as const;

    for (const theme of ['light', 'dark'] as const) {
      await seedManualTheme(page, theme);
      await page.goto('/en');

      const testCard = page.locator(`[data-card-id="${PRIMARY_AVAILABLE_TEST_CARD_ID}"]`);
      await testCard.getByTestId('landing-grid-card-trigger').click();

      const answerChoice = testCard.locator('.landing-grid-card-answer-choice').first();
      await expect(answerChoice).toBeVisible();
      await answerChoice.hover();
      await page.waitForTimeout(HOVER_STYLE_SETTLE_MS);
      landingAnswerHoverStylesByTheme[theme] = await readInteractiveSurfaceStyles(answerChoice);
    }

    for (const theme of ['light', 'dark'] as const) {
      await seedManualTheme(page, theme);
      await page.goto('/en');
      await page.mouse.move(32, 220);
      await expect(page.getByTestId('gnb-settings-panel')).toBeHidden();

      await page.getByTestId('gnb-settings-trigger').click();
      await expect(page.getByTestId('gnb-settings-panel')).toBeVisible();

      const localeControls = page.getByTestId('desktop-gnb-locale-controls');
      const selectableLocaleChip = localeControls.locator('button:not([disabled])').first();
      const selectedLocaleChip = localeControls.locator('button[disabled]');
      const {alternateButton, currentButton} = getThemeControls(page, 'desktop');
      const expectedLocaleHoverStyles = landingAnswerHoverStylesByTheme[theme];
      const alternateTheme = theme === 'light' ? 'dark' : 'light';
      const expectedThemeHoverStyles = landingAnswerHoverStylesByTheme[alternateTheme];

      const [selectedLocaleBeforeHover, currentThemeBeforeHover, alternateThemeBeforeHover] = await Promise.all([
        readInteractiveSurfaceStyles(selectedLocaleChip),
        readInteractiveSurfaceStyles(currentButton),
        readInteractiveSurfaceStyles(alternateButton)
      ]);

      expect.soft(selectedLocaleBeforeHover.hasVisibleBorder).toBe(false);
      expect.soft(currentThemeBeforeHover.hasVisibleBorder).toBe(false);
      expect.soft(selectedLocaleBeforeHover.boxShadowPresent).toBe(false);
      expect.soft(currentThemeBeforeHover.boxShadowPresent).toBe(false);
      await expect(alternateButton).toHaveAttribute('data-chip-surface', `theme-preview-${alternateTheme}`);
      expect.soft(alternateThemeBeforeHover.backgroundColor).toBe(
        themePreviewRestStylesByTheme[alternateTheme].backgroundColor
      );
      expect.soft(alternateThemeBeforeHover.color).toBe(themePreviewRestStylesByTheme[alternateTheme].color);

      await selectableLocaleChip.hover();
      await page.waitForTimeout(HOVER_STYLE_SETTLE_MS);
      expect.soft(await readInteractiveSurfaceStyles(selectableLocaleChip)).toEqual(expectedLocaleHoverStyles);

      await alternateButton.hover();
      await page.waitForTimeout(HOVER_STYLE_SETTLE_MS);
      expect.soft(await readInteractiveSurfaceStyles(alternateButton)).toEqual(expectedThemeHoverStyles);

      await selectedLocaleChip.hover();
      await page.waitForTimeout(HOVER_STYLE_SETTLE_MS);
      expect.soft(await readInteractiveSurfaceStyles(selectedLocaleChip)).toEqual(selectedLocaleBeforeHover);

      await currentButton.hover();
      await page.waitForTimeout(HOVER_STYLE_SETTLE_MS);
      expect.soft(await readInteractiveSurfaceStyles(currentButton)).toEqual(currentThemeBeforeHover);
    }
  });

  test('@smoke reduced-motion theme switch falls back without injecting transition styles', async ({page}) => {
    await installViewTransitionStub(page);
    await seedManualTheme(page, 'light');
    await page.addInitScript(() => {
      const originalMatchMedia = window.matchMedia.bind(window);
      window.matchMedia = (query: string) => {
        if (query === '(prefers-reduced-motion: reduce)') {
          return {
            matches: true,
            media: query,
            onchange: null,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
            addListener: () => undefined,
            removeListener: () => undefined,
            dispatchEvent: () => true
          } as MediaQueryList;
        }

        return originalMatchMedia(query);
      };
    });

    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en');
    const panel = page.getByTestId('gnb-settings-panel');

    await page.getByTestId('gnb-settings-trigger').hover();
    await expect(panel).toBeVisible();

    await getThemeControls(page, 'desktop').darkButton.click();
    await expect(panel).toBeHidden();

    await expect
      .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme')))
      .toBe('dark');
    await expectThemeButtonsState(page, 'desktop', 'dark');
    await expect(page.locator('#theme-switch-style')).toHaveCount(0);
  });

  test('@smoke unsupported theme transition falls back without injecting transition styles', async ({page}) => {
    await seedManualTheme(page, 'light');
    await page.addInitScript(() => {
      Object.defineProperty(Document.prototype, 'startViewTransition', {
        configurable: true,
        writable: true,
        value: undefined
      });
    });

    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en');
    const panel = page.getByTestId('gnb-settings-panel');

    await page.getByTestId('gnb-settings-trigger').hover();
    await expect(panel).toBeVisible();

    await getThemeControls(page, 'desktop').darkButton.click();
    await expect(panel).toBeHidden();

    await expect
      .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme')))
      .toBe('dark');
    await expectThemeButtonsState(page, 'desktop', 'dark');
    await expect(page.locator('#theme-switch-style')).toHaveCount(0);
  });

  test('@smoke mobile theme switch keeps the menu open while applying the next theme', async ({page}) => {
    await installViewTransitionStub(page);
    await seedManualTheme(page, 'light');
    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/en');

    const trigger = page.getByTestId('gnb-mobile-menu-trigger');
    const panel = page.getByTestId('gnb-mobile-menu-panel');

    await trigger.click();
    await expect(panel).toBeVisible();
    await expectCombinedSettingsLabel(page, 'mobile', EN_COMBINED_SETTINGS_LABEL);
    await expectThemeButtonsState(page, 'mobile', 'light');

    await getThemeControls(page, 'mobile').darkButton.click();

    await expect(panel).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme')))
      .toBe('dark');
    await expect(page.locator('#theme-switch-style')).toHaveCount(1);
    await expectThemeButtonsState(page, 'mobile', 'dark');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#theme-switch-style')).toHaveCount(0, {timeout: 3000});
  });

  test('@smoke assertion:B3-gnb-keyboard-matrix desktop landing enters cards first, reverse-enters GNB, and closes settings on focus-out', async ({
    page
  }) => {
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en');
    await page.locator('body').click({position: {x: 1, y: 1}});

    const home = page.locator('.gnb-desktop .gnb-ci-link');
    const history = page.locator('.gnb-desktop .gnb-desktop-links a').nth(0);
    const blog = page.locator('.gnb-desktop .gnb-desktop-links a').nth(1);
    const settingsTrigger = page.getByTestId('gnb-settings-trigger');
    const panel = page.getByTestId('gnb-settings-panel');
    const localeControls = page.getByTestId('desktop-gnb-locale-controls');
    const {alternateButton, currentButton} = getThemeControls(page, 'desktop');
    const firstCardTrigger = page.getByTestId('landing-grid-card-trigger').first();

    await page.keyboard.press('Tab');
    await expect(firstCardTrigger).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(settingsTrigger).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(blog).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(history).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(home).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(history).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(blog).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(settingsTrigger).toBeFocused();

    await page.keyboard.press('Space');
    await expect(panel).toBeVisible();
    await expect(currentButton).toBeDisabled();

    await page.keyboard.press('Tab');
    await expect(alternateButton).toBeFocused();

    for (const label of getAlternateLocaleLabels('en')) {
      await page.keyboard.press('Tab');
      await expect(localeControls.getByRole('button', {name: label})).toBeFocused();
    }
    await page.keyboard.press('Tab');
    await expect(firstCardTrigger).toBeFocused();
    await expect(panel).toBeHidden({timeout: 150});
  });

  test('@smoke assertion:B3-gnb-keyboard-matrix desktop closed settings panel stays out of the tab order', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');
    await page.locator('body').click({position: {x: 1, y: 1}});

    const settingsTrigger = page.getByTestId('gnb-settings-trigger');
    const firstCardTrigger = page.getByTestId('landing-grid-card-trigger').first();
    const panel = page.getByTestId('gnb-settings-panel');

    await page.keyboard.press('Tab');
    await expect(firstCardTrigger).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(settingsTrigger).toBeFocused();
    await expect(panel).toBeHidden();
    await page.keyboard.press('Tab');
    await expect(firstCardTrigger).toBeFocused();
  });

  test('@smoke assertion:B3-gnb-keyboard-matrix desktop blog/history contexts keep default GNB order and focus-out close', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});

    for (const route of ['/en/blog', '/en/history']) {
      await page.goto(route);
      await page.locator('body').click({position: {x: 1, y: 1}});

      const home = page.locator('.gnb-desktop .gnb-ci-link');
      const history = page.locator('.gnb-desktop .gnb-desktop-links a').nth(0);
      const blog = page.locator('.gnb-desktop .gnb-desktop-links a').nth(1);
      const settingsTrigger = page.getByTestId('gnb-settings-trigger');
      const panel = page.getByTestId('gnb-settings-panel');

      await page.keyboard.press('Tab');
      await expect(home).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(history).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(blog).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(settingsTrigger).toBeFocused();
      await expect(panel).toBeHidden();
      await page.keyboard.press('Shift+Tab');
      await expect(blog).toBeFocused();
    }

    await page.goto('/en/blog');
    await page.evaluate(() => {
      const sink = document.createElement('button');
      sink.type = 'button';
      sink.textContent = 'Destination focus sink';
      sink.setAttribute('data-testid', 'destination-focus-sink');
      document.querySelector('.page-shell-main')?.appendChild(sink);
    });
    await page.locator('body').click({position: {x: 1, y: 1}});

    const settingsTrigger = page.getByTestId('gnb-settings-trigger');
    const panel = page.getByTestId('gnb-settings-panel');
    const localeControls = page.getByTestId('desktop-gnb-locale-controls');
    const {alternateButton, currentButton} = getThemeControls(page, 'desktop');
    const sink = page.getByTestId('destination-focus-sink');

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(settingsTrigger).toBeFocused();

    await page.keyboard.press('Space');
    await expect(panel).toBeVisible();
    await expectLocalePickerState(page, 'desktop', 'en');
    await expect(currentButton).toBeDisabled();

    await page.keyboard.press('Tab');
    await expect(alternateButton).toBeFocused();

    for (const label of getAlternateLocaleLabels('en')) {
      await page.keyboard.press('Tab');
      await expect(localeControls.getByRole('button', {name: label})).toBeFocused();
    }
    await page.keyboard.press('Tab');
    await expect(sink).toBeFocused();
    await expect(panel).toBeHidden({timeout: 150});
  });

  test('@smoke assertion:B7-mobile-overlay mobile overlay close-start and unlock timing', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/en');

    const trigger = page.getByTestId('gnb-mobile-menu-trigger');
    await trigger.click();
    await expect(page.getByTestId('gnb-mobile-menu-panel')).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .toBe('hidden');

    const backdrop = page.getByTestId('gnb-mobile-backdrop');
    await backdrop.dispatchEvent('pointerdown', {
      pointerType: 'touch',
      clientX: 12,
      clientY: 12
    });
    await backdrop.dispatchEvent('pointerup', {
      pointerType: 'touch',
      clientX: 12,
      clientY: 12
    });

    await expect(page.getByTestId('gnb-mobile-menu-panel')).toBeHidden({timeout: 1000});
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .toBe('');

    await expect
      .poll(() =>
        page.evaluate(() => {
          const active = document.activeElement;
          return active?.getAttribute('data-testid') ?? '';
        })
      )
      .toBe('gnb-mobile-menu-trigger');
  });

  test('@smoke assertion:B7-gnb-keyboard-matrix mobile landing enters cards first, reverse-enters menu, and restores focus on escape close', async ({
    page
  }) => {
    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/en');
    await page.locator('body').click({position: {x: 1, y: 1}});

    const home = page.locator('.gnb-mobile .gnb-ci-link');
    const trigger = page.getByTestId('gnb-mobile-menu-trigger');
    const panel = page.getByTestId('gnb-mobile-menu-panel');
    const panelHome = panel.getByRole('link', {name: 'Home'});
    const panelHistory = panel.getByRole('link', {name: 'History'});
    const panelBlog = panel.getByRole('link', {name: 'Blog'});
    const localeControls = page.getByTestId('mobile-gnb-locale-controls');
    const {alternateButton, currentButton} = getThemeControls(page, 'mobile');

    await page.keyboard.press('Tab');
    await expect(page.getByTestId('landing-grid-card-trigger').first()).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(trigger).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(home).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(trigger).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(panel).toBeVisible();

    await page.keyboard.press('Tab');
    await expect(panelHome).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(panelHistory).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(panelBlog).toBeFocused();
    await expectLocalePickerState(page, 'mobile', 'en');
    await expect(currentButton).toBeDisabled();

    await page.keyboard.press('Tab');
    await expect(alternateButton).toBeFocused();

    for (const label of getAlternateLocaleLabels('en')) {
      await page.keyboard.press('Tab');
      await expect(localeControls.getByRole('button', {name: label})).toBeFocused();
    }

    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden({timeout: 1000});
    await expect(trigger).toBeFocused();
  });

  test('@smoke assertion:B7-gnb-keyboard-matrix mobile closed menu panel stays out of the tab order', async ({
    page
  }) => {
    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/en');
    await page.locator('body').click({position: {x: 1, y: 1}});

    const trigger = page.getByTestId('gnb-mobile-menu-trigger');
    const firstCardTrigger = page.getByTestId('landing-grid-card-trigger').first();
    const panel = page.getByTestId('gnb-mobile-menu-panel');

    await page.keyboard.press('Tab');
    await expect(firstCardTrigger).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(trigger).toBeFocused();
    await expect(panel).toBeHidden();
    await page.keyboard.press('Tab');
    await expect(firstCardTrigger).toBeFocused();
  });

  test('@smoke mobile outside-close cancels when gesture becomes scroll', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/en');

    const trigger = page.getByTestId('gnb-mobile-menu-trigger');
    await trigger.click();

    const layer = page.getByTestId('gnb-mobile-layer');
    const panel = page.getByTestId('gnb-mobile-menu-panel');
    const backdrop = page.getByTestId('gnb-mobile-backdrop');

    await backdrop.dispatchEvent('pointerdown', {
      pointerType: 'touch',
      clientX: 16,
      clientY: 16
    });
    await expect(layer).toHaveAttribute('data-state', 'closing');

    await backdrop.dispatchEvent('pointermove', {
      pointerType: 'touch',
      clientX: 16,
      clientY: 42
    });
    await backdrop.dispatchEvent('pointerup', {
      pointerType: 'touch',
      clientX: 16,
      clientY: 42
    });

    await expect(layer).toHaveAttribute('data-state', 'open');
    await expect(panel).toBeVisible();
  });

  test('@smoke mobile ignores extra close input while already closing', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/en');

    const trigger = page.getByTestId('gnb-mobile-menu-trigger');
    await trigger.click();

    const layer = page.getByTestId('gnb-mobile-layer');
    const panel = page.getByTestId('gnb-mobile-menu-panel');
    const backdrop = page.getByTestId('gnb-mobile-backdrop');

    await backdrop.dispatchEvent('pointerdown', {
      pointerType: 'touch',
      clientX: 18,
      clientY: 18
    });
    await backdrop.dispatchEvent('pointerup', {
      pointerType: 'touch',
      clientX: 18,
      clientY: 18
    });
    await expect(layer).toHaveAttribute('data-state', 'closing');

    await backdrop.dispatchEvent('pointerdown', {
      pointerType: 'touch',
      clientX: 18,
      clientY: 18
    });
    await backdrop.dispatchEvent('pointerup', {
      pointerType: 'touch',
      clientX: 18,
      clientY: 18
    });
    await expect(layer).toHaveAttribute('data-state', 'closing');

    await expect(panel).toBeHidden({timeout: 1000});
  });

  test('@smoke assertion:B7-gnb-keyboard-matrix mobile blog/history contexts keep back then menu traversal and keyboard close restore', async ({
    page
  }) => {
    await page.setViewportSize({width: 390, height: 844});

    for (const route of ['/en/blog', '/en/history']) {
      await page.goto(route);
      await page.locator('body').click({position: {x: 1, y: 1}});

      const back = page.getByTestId('gnb-mobile-back');
      const trigger = page.getByTestId('gnb-mobile-menu-trigger');
      const panel = page.getByTestId('gnb-mobile-menu-panel');
      const panelHome = panel.getByRole('link', {name: 'Home'});

      await page.keyboard.press('Tab');
      await expect(back).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(trigger).toBeFocused();

      await page.keyboard.press('Enter');
      await expect(panel).toBeVisible();
      await page.keyboard.press('Tab');
      await expect(panelHome).toBeFocused();

      await page.keyboard.press('Escape');
      await expect(panel).toBeHidden({timeout: 1000});
      await expect(trigger).toBeFocused();
    }
  });

  test('@smoke mobile test back uses history before fallback', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/en/blog');
    await page.goto(buildLocalizedPrimaryTestRoute('en'));

    await page.getByTestId('gnb-mobile-test-back').click();
    await expect(page).toHaveURL(/\/en\/blog$/u);
  });

  test('@smoke mobile test back falls back to localized landing', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await page.goto(buildLocalizedPrimaryTestRoute('en'));

    await page.getByTestId('gnb-mobile-test-back').click();
    await expect(page).toHaveURL(/\/en$/u);
  });

  test('@smoke assertion:B7-gnb-keyboard-matrix mobile test context exposes only keyboard-activatable back control', async ({
    page
  }) => {
    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/en/blog');
    await page.goto(buildLocalizedPrimaryTestRoute('en'));
    await page.locator('body').click({position: {x: 1, y: 1}});

    await expect(page.getByTestId('gnb-mobile-menu-trigger')).toHaveCount(0);

    const back = page.getByTestId('gnb-mobile-test-back');
    await page.keyboard.press('Tab');
    await expect(back).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/en\/blog$/u);
  });
});
