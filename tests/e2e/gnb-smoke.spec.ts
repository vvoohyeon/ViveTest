import {expect, test} from '@playwright/test';

import {seedTelemetryConsent} from './helpers/consent';

test.describe('Phase 3 gnb shell smoke', () => {
  test.beforeEach(async ({page}) => {
    await seedTelemetryConsent(page, 'OPTED_OUT');
  });

  test('@smoke assertion:B3-desktop-settings desktop settings open-close and gap contract', async ({page}) => {
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en');

    const trigger = page.getByTestId('gnb-settings-trigger');
    const panel = page.getByTestId('gnb-settings-panel');

    await trigger.hover();
    await expect(panel).toBeVisible({timeout: 200});

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

  test('@smoke desktop settings shows the resolved system theme on first open', async ({page}) => {
    await page.addInitScript(() => {
      const originalMatchMedia = window.matchMedia.bind(window);
      window.localStorage.removeItem('vibetest-theme');
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

    await page.getByTestId('gnb-settings-trigger').hover();
    await expect(page.getByTestId('gnb-settings-panel')).toBeVisible();
    await expect(page.locator('[data-testid="desktop-gnb-theme-controls"] .gnb-chip').nth(0)).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    await expect(page.locator('[data-testid="desktop-gnb-theme-controls"] .gnb-chip').nth(1)).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  test('@smoke desktop settings restores the stored manual theme without a blank selected state', async ({page}) => {
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en');
    await page.evaluate(() => {
      window.localStorage.setItem('vibetest-theme', 'dark');
    });
    await page.reload();

    await expect
      .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme')))
      .toBe('dark');

    await page.getByTestId('gnb-settings-trigger').hover();
    await expect(page.getByTestId('gnb-settings-panel')).toBeVisible();
    await expect(page.locator('[data-testid="desktop-gnb-theme-controls"] .gnb-chip').nth(0)).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    await expect(page.locator('[data-testid="desktop-gnb-theme-controls"] .gnb-chip').nth(1)).toHaveAttribute(
      'aria-pressed',
      'true'
    );
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
    const krButton = page.getByTestId('desktop-gnb-locale-controls').getByRole('button', {name: 'KR'});
    const lightButton = page.getByTestId('desktop-gnb-theme-controls').getByRole('button', {name: 'Light'});
    const darkButton = page.getByTestId('desktop-gnb-theme-controls').getByRole('button', {name: 'Dark'});
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

    await page.keyboard.press('Tab');
    await expect(krButton).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(lightButton).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(darkButton).toBeFocused();
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
    const krButton = page.getByTestId('desktop-gnb-locale-controls').getByRole('button', {name: 'KR'});
    const lightButton = page.getByTestId('desktop-gnb-theme-controls').getByRole('button', {name: 'Light'});
    const darkButton = page.getByTestId('desktop-gnb-theme-controls').getByRole('button', {name: 'Dark'});
    const sink = page.getByTestId('destination-focus-sink');

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(settingsTrigger).toBeFocused();

    await page.keyboard.press('Space');
    await expect(panel).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(krButton).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(lightButton).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(darkButton).toBeFocused();
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
    const krButton = page.getByTestId('mobile-gnb-locale-controls').getByRole('button', {name: 'KR'});

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
    await page.keyboard.press('Tab');
    await expect(krButton).toBeFocused();

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
    await page.goto('/en/test/rhythm-a');

    await page.getByTestId('gnb-mobile-test-back').click();
    await expect(page).toHaveURL(/\/en\/blog$/u);
  });

  test('@smoke mobile test back falls back to localized landing', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/en/test/rhythm-a');

    await page.getByTestId('gnb-mobile-test-back').click();
    await expect(page).toHaveURL(/\/en$/u);
  });

  test('@smoke assertion:B7-gnb-keyboard-matrix mobile test context exposes only keyboard-activatable back control', async ({
    page
  }) => {
    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/en/blog');
    await page.goto('/en/test/rhythm-a');
    await page.locator('body').click({position: {x: 1, y: 1}});

    await expect(page.getByTestId('gnb-mobile-menu-trigger')).toHaveCount(0);

    const back = page.getByTestId('gnb-mobile-test-back');
    await page.keyboard.press('Tab');
    await expect(back).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/en\/blog$/u);
  });
});
