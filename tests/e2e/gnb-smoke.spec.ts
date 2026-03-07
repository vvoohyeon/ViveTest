import {expect, test} from '@playwright/test';

test.describe('Phase 3 gnb shell smoke', () => {
  test('@smoke assertion:B3-desktop-settings desktop settings open-close and gap contract', async ({page}) => {
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en');

    const trigger = page.getByTestId('gnb-settings-trigger');
    const panel = page.getByTestId('gnb-settings-panel');

    await trigger.hover();
    await expect(panel).toBeVisible();

    const triggerBox = await trigger.boundingBox();
    const panelBox = await panel.boundingBox();
    expect(triggerBox).not.toBeNull();
    expect(panelBox).not.toBeNull();

    const hoverGap = Math.abs((panelBox?.y ?? 0) - ((triggerBox?.y ?? 0) + (triggerBox?.height ?? 0)));
    expect(hoverGap).toBeLessThanOrEqual(1);

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

  test('@smoke mobile test back uses history before fallback', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/en/blog');
    await page.goto('/en/test/rhythm-a/question');

    await page.getByTestId('gnb-mobile-test-back').click();
    await expect(page).toHaveURL(/\/en\/blog$/u);
  });

  test('@smoke mobile test back falls back to localized landing', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/en/test/rhythm-a/question');

    await page.getByTestId('gnb-mobile-test-back').click();
    await expect(page).toHaveURL(/\/en$/u);
  });
});
