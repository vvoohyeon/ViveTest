import {expect, test, type Page} from '@playwright/test';

import {expectPageToBeAxeClean} from './helpers/axe';
import {seedTelemetryConsent} from './helpers/consent';
import {PRIMARY_AVAILABLE_TEST_CARD_ID, buildLocalizedPrimaryTestRoute} from './helpers/landing-fixture';

const TRANSITION_OVERLAY_READY_DELAY_MS = 300;

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

async function tabUntilCardFocused(page: Page, cardId: string): Promise<void> {
  for (let attempts = 0; attempts < 50; attempts += 1) {
    await page.keyboard.press('Tab');
    const activeCardId = await page.evaluate(() => {
      const activeElement = document.activeElement;
      if (!(activeElement instanceof HTMLElement)) {
        return null;
      }

      return activeElement.closest('[data-testid="landing-grid-card"]')?.getAttribute('data-card-id') ?? null;
    });

    if (activeCardId === cardId) {
      return;
    }
  }

  throw new Error(`Failed to focus card via Tab within budget: ${cardId}`);
}

test.describe('Canonical accessibility smoke', () => {
  test.beforeEach(async ({page}) => {
    await seedTelemetryConsent(page, 'OPTED_OUT');
  });

  test('@smoke assertion:B5-axe-canonical landing canonical states remain axe-clean', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');
    await expectPageToBeAxeClean(page);

    const unavailableCard = page.locator('[data-card-id="test-coming-soon-1"]');
    await unavailableCard.getByTestId('landing-grid-card-trigger').focus();
    await expectPageToBeAxeClean(page);
  });

  test('@smoke assertion:B7-axe-canonical gnb canonical open states remain axe-clean', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');
    await focusDesktopSettingsByKeyboard(page);
    await expectPageToBeAxeClean(page);

    for (const route of ['/en/blog', '/en/history']) {
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
    await tabUntilCardFocused(page, PRIMARY_AVAILABLE_TEST_CARD_ID);
    await page.keyboard.press('Space');
    await expect(page.locator(`[data-card-id="${PRIMARY_AVAILABLE_TEST_CARD_ID}"]`)).toHaveAttribute(
      'data-mobile-phase',
      'OPEN'
    );
    await expectPageToBeAxeClean(page);

    for (const route of ['/en/blog', '/en/history', buildLocalizedPrimaryTestRoute('en')]) {
      await page.goto(route);
      await expectPageToBeAxeClean(page);
    }
  });

  test('@smoke assertion:B5-axe-canonical transition overlay representative state remains axe-clean', async ({page}) => {
    await delayDestinationReadyRaf(page, TRANSITION_OVERLAY_READY_DELAY_MS);
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en');

    const blogCard = page.locator('[data-card-id="blog-build-metrics"]');
    await blogCard.getByTestId('landing-grid-card-trigger').click();
    await blogCard.locator('[data-slot="primaryCTA"]').click();

    await expect(page).toHaveURL(/\/en\/blog$/u);
    await expect(page.getByTestId('landing-transition-source-gnb')).toBeVisible();
    await expectPageToBeAxeClean(page);
  });

  test('@smoke assertion:B5-axe-canonical KR representative landing states remain axe-clean', async ({page}) => {
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/kr');
    await expectPageToBeAxeClean(page);

    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/kr');
    await page.locator('body').click({position: {x: 1, y: 1}});
    await tabUntilCardFocused(page, PRIMARY_AVAILABLE_TEST_CARD_ID);
    await page.keyboard.press('Space');
    await expect(page.locator(`[data-card-id="${PRIMARY_AVAILABLE_TEST_CARD_ID}"]`)).toHaveAttribute(
      'data-mobile-phase',
      'OPEN'
    );
    await expectPageToBeAxeClean(page);
  });
});
