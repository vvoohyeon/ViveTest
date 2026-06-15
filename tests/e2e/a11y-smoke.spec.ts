import {expect, test, type Page} from '@playwright/test';

import {locales} from '../../src/config/site';
import {resolveLandingCatalog} from '../../src/features/variant-registry';
import {expectPageToBeAxeClean} from './helpers/axe';
import {seedTelemetryConsent} from './helpers/consent';
import {
  buildLocalizedBlogDetailRoute,
  buildLocalizedBlogIndexRoute,
  buildLocalizedPrimaryTestRoute,
  PRIMARY_AVAILABLE_TEST_VARIANT,
  SECONDARY_BLOG_VARIANT
} from './helpers/landing-fixture';

const TRANSITION_OVERLAY_READY_DELAY_MS = 900;

async function delayDestinationReadyRaf(page: Page, delayMs = 180) {
  await page.addInitScript((timeoutMs) => {
    const nativeRequestAnimationFrame = window.requestAnimationFrame.bind(window);
    const nativeCancelAnimationFrame = window.cancelAnimationFrame.bind(window);
    const scheduledFrames = new Map<number, number>();
    let syntheticHandle = 1_000;

    window.requestAnimationFrame = (callback: FrameRequestCallback) => {
      const handle = syntheticHandle;
      syntheticHandle += 1;
      const timeoutHandle = window.setTimeout(() => {
        scheduledFrames.delete(handle);
        nativeRequestAnimationFrame(callback);
      }, timeoutMs);
      scheduledFrames.set(handle, timeoutHandle);
      return handle;
    };

    window.cancelAnimationFrame = (handle: number) => {
      const timeoutHandle = scheduledFrames.get(handle);
      if (timeoutHandle !== undefined) {
        window.clearTimeout(timeoutHandle);
        scheduledFrames.delete(handle);
        return;
      }

      nativeCancelAnimationFrame(handle);
    };
  }, delayMs);
}

async function focusDesktopSettingsByKeyboard(page: Page) {
  await page.locator('body').click({position: {x: 1, y: 1}});
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('landing-grid-card-trigger').first()).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByTestId('gnb-settings-trigger')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByTestId('gnb-settings-panel')).toBeVisible();
}

async function focusDesktopDestinationSettingsByKeyboard(page: Page) {
  await page.locator('body').click({position: {x: 1, y: 1}});
  await page.keyboard.press('Tab');
  await expect(page.locator('.gnb-desktop .gnb-ci-link')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('.gnb-desktop .gnb-desktop-links a').nth(0)).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('.gnb-desktop .gnb-desktop-links a').nth(1)).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('gnb-settings-trigger')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByTestId('gnb-settings-panel')).toBeVisible();
}

async function focusMobileMenuByKeyboard(page: Page) {
  await page.locator('body').click({position: {x: 1, y: 1}});
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('landing-grid-card-trigger').first()).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByTestId('gnb-mobile-menu-trigger')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('gnb-mobile-menu-panel')).toBeVisible();
}

async function installHoverCapability(page: Page, matches: boolean) {
  await page.addInitScript((hoverMatches) => {
    const originalMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query: string) => {
      if (query === '(hover: hover) and (pointer: fine)') {
        return {
          media: query,
          matches: hoverMatches,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
          addListener: () => {},
          removeListener: () => {}
        } as MediaQueryList;
      }

      return originalMatchMedia(query);
    };
  }, matches);
}

async function expectSourceGnbOverlay(page: Page, destinationContext: 'blog' | 'test' | 'history') {
  const overlay = page.getByTestId('landing-transition-source-gnb');
  await expect(overlay).toBeVisible();
  await expect(overlay.locator('.gnb-shell')).toHaveAttribute('data-gnb-context', 'landing');
  await expect(page.locator('.page-shell > .gnb-shell')).toHaveAttribute('data-gnb-context', destinationContext);
}

async function tabUntilCardFocused(page: Page, cardVariant: string): Promise<void> {
  for (let attempts = 0; attempts < 50; attempts += 1) {
    await page.keyboard.press('Tab');
    const activeCardVariant = await page.evaluate(() => {
      const activeElement = document.activeElement;
      if (!(activeElement instanceof HTMLElement)) {
        return null;
      }

      return activeElement.closest('[data-testid="landing-grid-card"]')?.getAttribute('data-card-variant') ?? null;
    });

    if (activeCardVariant === cardVariant) {
      return;
    }
  }

  throw new Error(`Failed to focus card via Tab within budget: ${cardVariant}`);
}

test.describe('Canonical accessibility smoke', () => {
  test.beforeEach(async ({page}) => {
    await seedTelemetryConsent(page, 'OPTED_IN');
  });

  test('@smoke assertion:B5-axe-canonical landing canonical states remain axe-clean', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');
    await expectPageToBeAxeClean(page);
  });

  test('@smoke assertion:W11-keyboard LI-01 Test Enter and Space remain idempotent non-entry commands', async ({
    page
  }) => {
    await installHoverCapability(page, false);
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const card = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    const trigger = card.getByTestId('landing-grid-card-trigger');
    const initialUrl = page.url();

    await trigger.focus();
    await expect(card).toHaveAttribute('data-card-state', 'expanded');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    await page.keyboard.press('Enter');

    await expect(trigger).toBeFocused();
    await expect(card).toHaveAttribute('data-card-state', 'expanded');
    await expect(page).toHaveURL(initialUrl);
    await expect(page.getByTestId('landing-transition-source-gnb')).toHaveCount(0);
    await expect(card.locator('[data-slot="answerChoiceA"]:focus')).toHaveCount(0);
    await expect(card.locator('[data-slot="answerChoiceB"]:focus')).toHaveCount(0);
    expect(
      await page.evaluate(() =>
        Object.keys(window.sessionStorage).filter((key) => key.startsWith('vivetest-landing-ingress:'))
      )
    ).toEqual([]);
  });

  test('@smoke assertion:W11-keyboard LI-02 Escape is a no-op for Blog and unavailable cards', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const shell = page.getByTestId('landing-grid-shell');
    const blogCard = page.locator('[data-card-variant="ops-handbook"]');
    const blogTrigger = blogCard.getByTestId('landing-grid-card-trigger');
    await blogTrigger.focus();
    const blogState = await shell.getAttribute('data-interaction-expanded-card-variant');
    await page.keyboard.press('Escape');
    await expect(blogTrigger).toBeFocused();
    await expect(blogCard).not.toHaveAttribute('data-card-state', 'expanded');
    await expect(shell).toHaveAttribute('data-interaction-expanded-card-variant', blogState ?? '');

    const unavailableCard = page.locator('[data-card-variant="creativity-profile"]');
    const unavailableTrigger = unavailableCard.getByTestId('landing-grid-card-trigger');
    const status = unavailableCard.locator('[data-slot="comingSoonTag"]');
    await unavailableTrigger.focus();
    await page.keyboard.press('Escape');
    await expect(unavailableTrigger).toBeFocused();
    await expect(unavailableTrigger).toHaveAttribute('aria-disabled', 'true');
    await expect(unavailableTrigger).toHaveAttribute('tabindex', '-1');
    await expect(status).toBeVisible();
  });

  test('@smoke assertion:W11-keyboard LI-03 Test accessible name is byte-stable across disclosure in all 12 locales', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});

    for (const locale of locales) {
      const catalog = resolveLandingCatalog(locale);
      const testCard = catalog.find((card) => card.variant === PRIMARY_AVAILABLE_TEST_VARIANT);
      const blogCard = catalog.find((card) => card.variant === 'ops-handbook');
      const unavailableCard = catalog.find((card) => card.variant === 'creativity-profile');
      if (!testCard || !blogCard || !unavailableCard) {
        throw new Error(`Missing Wave 11 catalog fixtures for ${locale}`);
      }

      await page.goto(`/${locale}`);
      const testRoot = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
      const testTrigger = testRoot.getByTestId('landing-grid-card-trigger');
      const stage = testRoot.locator('[data-slot="desktopStage"]');

      await testRoot.evaluate((element) => {
        const trigger = element.querySelector<HTMLElement>('[data-testid="landing-grid-card-trigger"]');
        const stageElement = element.querySelector<HTMLElement>('[data-slot="desktopStage"]');
        if (!trigger || !stageElement) {
          throw new Error('Missing Test trigger or desktop stage');
        }
        const state = window as Window & {
          __w11NameLog?: Array<{
            phase: string;
            label: string | null;
            expanded: string | null;
            stageHidden: string | null;
          }>;
          __w11NameObserver?: MutationObserver;
        };
        const log = () => {
          state.__w11NameLog ??= [];
          state.__w11NameLog.push({
            phase: element.getAttribute('data-desktop-shell-phase') ?? '',
            label: trigger.getAttribute('aria-label'),
            expanded: trigger.getAttribute('aria-expanded'),
            stageHidden: stageElement.getAttribute('aria-hidden')
          });
        };
        log();
        const observer = new MutationObserver(log);
        observer.observe(element, {
          attributes: true,
          subtree: true,
          attributeFilter: ['data-desktop-shell-phase', 'aria-label', 'aria-expanded', 'aria-hidden']
        });
        state.__w11NameObserver = observer;
      });

      await expect(testTrigger).toHaveAccessibleName(testCard.title);
      await expect(testTrigger).toHaveAttribute('aria-expanded', 'false');
      await expect(stage).toHaveAttribute('aria-hidden', 'true');
      await testTrigger.focus();
      await expect(testRoot).toHaveAttribute('data-desktop-shell-phase', 'steady');
      await expect(testTrigger).toHaveAccessibleName(testCard.title);
      await expect(testTrigger).toHaveAttribute('aria-expanded', 'true');
      await expect(stage).not.toHaveAttribute('aria-hidden', 'true');
      await page.keyboard.press('Escape');
      await expect(testRoot).toHaveAttribute('data-desktop-shell-phase', 'idle');
      await expect(testTrigger).toHaveAccessibleName(testCard.title);
      await expect(testTrigger).toHaveAttribute('aria-expanded', 'false');
      await expect(stage).toHaveAttribute('aria-hidden', 'true');

      const nameLog = await page.evaluate(() => {
        const state = window as Window & {
          __w11NameLog?: Array<{
            phase: string;
            label: string | null;
            expanded: string | null;
            stageHidden: string | null;
          }>;
          __w11NameObserver?: MutationObserver;
        };
        state.__w11NameObserver?.disconnect();
        return state.__w11NameLog ?? [];
      });
      expect(new Set(nameLog.map((entry) => entry.label))).toEqual(new Set([testCard.title]));
      for (const entry of nameLog) {
        const logicallyExpanded = ['opening', 'steady', 'handoff-target'].includes(entry.phase);
        expect(entry.expanded).toBe(logicallyExpanded ? 'true' : 'false');
        expect(entry.stageHidden).toBe(logicallyExpanded ? null : 'true');
      }

      const blogTrigger = page
        .locator('[data-card-variant="ops-handbook"]')
        .getByTestId('landing-grid-card-trigger');
      await expect(blogTrigger).toHaveAccessibleName(blogCard.title);
      await expect(blogTrigger).not.toHaveAttribute('aria-expanded');
      await expect(blogTrigger).not.toHaveAttribute('aria-controls');

      const unavailableRoot = page.locator('[data-card-variant="creativity-profile"]');
      const unavailableTrigger = unavailableRoot.getByTestId('landing-grid-card-trigger');
      const status = unavailableRoot.locator('[data-slot="comingSoonTag"]');
      await expect(unavailableTrigger).toHaveAccessibleName(unavailableCard.title);
      await expect(unavailableTrigger).toHaveAccessibleDescription((await status.textContent()) ?? '');
      await expect(unavailableTrigger).toHaveAttribute('aria-disabled', 'true');
      await expect(unavailableTrigger).toHaveAttribute('tabindex', '-1');
      await expect(unavailableRoot).not.toHaveAttribute('aria-disabled');
      await expect(unavailableRoot.locator('[data-slot="tags"]')).not.toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="landing-grid-shell"] [aria-live]')).toHaveCount(0);
    }
  });

  test('@smoke assertion:W11-keyboard LI-03 expanded question and choices are AT-exposed and axe-clean', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const card = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    const trigger = card.getByTestId('landing-grid-card-trigger');
    await expectPageToBeAxeClean(page);
    await trigger.focus();
    await expect(card).toHaveAttribute('data-desktop-shell-phase', 'steady');

    for (const slot of ['previewQuestion', 'answerChoiceA', 'answerChoiceB']) {
      const locator = card.locator(`[data-slot="${slot}"]`);
      await expect(locator).toBeVisible();
      expect(
        await locator.evaluate((element) =>
          Boolean(element.closest('[aria-hidden="true"], [inert]'))
        )
      ).toBe(false);
    }
    await expectPageToBeAxeClean(page);
  });

  test('@smoke unavailable card is removed from the keyboard tab order yet stays AT-perceivable', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');
    await page.locator('body').click({position: {x: 1, y: 1}});

    // D1/BQ-26: the unavailable card is skipped by Tab in every state. Sweep the grid and confirm
    // focus never lands on the unavailable trigger, while the first enterable card stays reachable.
    const focusedVariants = new Set<string>();
    for (let attempts = 0; attempts < 18; attempts += 1) {
      await page.keyboard.press('Tab');
      const variant = await page.evaluate(() => {
        const active = document.activeElement;
        if (!(active instanceof HTMLElement)) {
          return null;
        }
        return active.closest('[data-testid="landing-grid-card"]')?.getAttribute('data-card-variant') ?? null;
      });
      if (variant) {
        focusedVariants.add(variant);
      }
    }

    expect(focusedVariants.has(PRIMARY_AVAILABLE_TEST_VARIANT)).toBe(true);
    expect(focusedVariants.has('creativity-profile')).toBe(false);

    // The trigger stays a semantic <button aria-disabled> removed from the tab order — kept in the
    // a11y/reading tree (not native `disabled`), so AT can still perceive it as "coming soon".
    const unavailableTrigger = page
      .locator('[data-card-variant="creativity-profile"]')
      .getByTestId('landing-grid-card-trigger');
    await expect(unavailableTrigger).toHaveJSProperty('tagName', 'BUTTON');
    await expect(unavailableTrigger).toHaveAttribute('aria-disabled', 'true');
    await expect(unavailableTrigger).toHaveAttribute('tabindex', '-1');

    // Focus remains valid/readable when reached programmatically (not a keyboard path).
    await unavailableTrigger.focus();
    await expectPageToBeAxeClean(page);
  });

  test('@smoke assertion:B7-axe-canonical gnb canonical open states remain axe-clean', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');
    await focusDesktopSettingsByKeyboard(page);
    await expectPageToBeAxeClean(page);

    for (const route of [buildLocalizedBlogIndexRoute('en'), buildLocalizedBlogDetailRoute('en', SECONDARY_BLOG_VARIANT), '/en/history']) {
      await page.setViewportSize({width: 1440, height: 980});
      await page.goto(route);
      await focusDesktopDestinationSettingsByKeyboard(page);
      await expectPageToBeAxeClean(page);
    }

    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/en');
    await focusMobileMenuByKeyboard(page);
    await expectPageToBeAxeClean(page);
  });

  test('@smoke assertion:B5-axe-canonical mobile expanded and destination shells remain axe-clean', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/en');
    await page.locator('body').click({position: {x: 1, y: 1}});
    await tabUntilCardFocused(page, PRIMARY_AVAILABLE_TEST_VARIANT);
    await page.keyboard.press('Space');
    await expect(page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`)).toHaveAttribute(
      'data-mobile-phase',
      'OPEN'
    );
    await expectPageToBeAxeClean(page);

    for (const route of [buildLocalizedBlogIndexRoute('en'), buildLocalizedBlogDetailRoute('en', SECONDARY_BLOG_VARIANT), '/en/history', buildLocalizedPrimaryTestRoute('en')]) {
      await page.goto(route);
      await expectPageToBeAxeClean(page);
    }
  });

  test('@smoke assertion:B5-axe-canonical transition overlay representative state remains axe-clean', async ({page}) => {
    await delayDestinationReadyRaf(page, TRANSITION_OVERLAY_READY_DELAY_MS);
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en');

    const blogCard = page.locator('[data-card-variant="build-metrics"]');
    await blogCard.getByTestId('landing-grid-card-trigger').click();

    await expect(page).toHaveURL(new RegExp(`/en/blog/${SECONDARY_BLOG_VARIANT}$`, 'u'));
    await expectSourceGnbOverlay(page, 'blog');
    await expect(page).toHaveTitle(/Build Metrics That Actually Matter/u);
    await expectPageToBeAxeClean(page);
  });

  test('@smoke blog card trigger is a semantic link with native keyboard activation', async ({page}) => {
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en');

    const blogCard = page.locator('[data-card-variant="build-metrics"]');
    const trigger = blogCard.getByTestId('landing-grid-card-trigger');

    await expect(trigger).toHaveAttribute('href', buildLocalizedBlogDetailRoute('en', SECONDARY_BLOG_VARIANT));
    await trigger.focus();
    await expect(trigger).toBeFocused();

    await page.keyboard.press('Space');
    await expect(page).toHaveURL(/\/en$/u);
    await expect(blogCard).not.toHaveAttribute('data-card-state', 'expanded');

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`/en/blog/${SECONDARY_BLOG_VARIANT}$`, 'u'));
  });

  test('@smoke hidden tag suffix stays out of the tree while CTA and coming-soon status keep priority', async ({
    page
  }) => {
    await page.setViewportSize({width: 900, height: 980});
    await page.goto('/id');
    await page.getByTestId('landing-grid-container').evaluate((element) => {
      (element as HTMLElement).style.width = '540px';
    });

    const testCard = page.locator('[data-card-variant="rhythm-b"]');
    const publicTags = testCard.locator('[data-slot="tags"]');
    const probe = testCard.locator('[data-slot="tagMeasurementProbe"]');
    await expect
      .poll(async () => Number(await publicTags.getAttribute('data-visible-tag-count')))
      .toBeLessThan(Number(await publicTags.getAttribute('data-tag-count')));
    const visibleCount = Number(await publicTags.getAttribute('data-visible-tag-count'));
    await expect(publicTags.locator('.landing-grid-card-tag-item')).toHaveCount(visibleCount);
    await expect(probe).toHaveAttribute('aria-hidden', 'true');
    await expect(probe).toHaveAttribute('inert', '');
    await expect(probe.locator('[data-inline-probe-tag]')).toHaveCount(3);

    const blogCard = page.locator(`[data-card-variant="${SECONDARY_BLOG_VARIANT}"]`);
    const readMore = blogCard.locator('[data-slot="blogReadMore"]');
    await blogCard.getByTestId('landing-grid-card-trigger').hover();
    await expect(readMore).toHaveCSS('visibility', 'visible');
    await expect(readMore).toHaveAttribute('aria-hidden', 'true');
    await expect(readMore.locator('a, button, [tabindex]')).toHaveCount(0);

    const unavailableCard = page.locator('[data-card-variant="creativity-profile"]');
    const comingSoon = unavailableCard.locator('[data-slot="comingSoonTag"]');
    await expect(comingSoon).toHaveCount(1);
    await expect(comingSoon).toHaveText(/.+/u);
    await expect(comingSoon).not.toHaveAttribute('aria-hidden', 'true');
    await expectPageToBeAxeClean(page);
  });

  test('@smoke assertion:B5-axe-canonical KR representative landing states remain axe-clean', async ({page}) => {
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/kr');
    await expectPageToBeAxeClean(page);

    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/kr');
    await page.locator('body').click({position: {x: 1, y: 1}});
    await tabUntilCardFocused(page, PRIMARY_AVAILABLE_TEST_VARIANT);
    await page.keyboard.press('Space');
    await expect(page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`)).toHaveAttribute(
      'data-mobile-phase',
      'OPEN'
    );
    await expectPageToBeAxeClean(page);
  });
});
