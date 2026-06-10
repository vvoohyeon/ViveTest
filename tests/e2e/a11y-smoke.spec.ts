import {expect, test, type Page} from '@playwright/test';

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
