import {expect, type Page, test} from '@playwright/test';

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

test.describe('Phase 7 state + capability smoke', () => {
  test('@smoke capability gate keeps tap on mobile and hover on desktop-capable environments', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/en');
    await expect(page.getByTestId('landing-grid-card').first()).toHaveAttribute('data-interaction-mode', 'tap');

    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');
    await expect(page.getByTestId('landing-grid-card').first()).toHaveAttribute('data-interaction-mode', 'hover');
  });

  test('@smoke assertion:B5-keyboard-sequential keyboard sequential override expands focused card and moves through internal controls before next card', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    await page.locator('body').click({position: {x: 1, y: 1}});
    await tabUntilCardFocused(page, 'test-rhythm-a');

    const firstCard = page.locator('[data-card-id="test-rhythm-a"]');
    const secondCard = page.locator('[data-card-id="test-rhythm-b"]');
    const firstTrigger = firstCard.getByTestId('landing-grid-card-trigger');
    const secondTrigger = secondCard.getByTestId('landing-grid-card-trigger');

    await expect(firstCard).toHaveAttribute('data-card-state', 'expanded');
    await expect(secondCard).toHaveAttribute('data-hover-lock-blocked', 'true');
    await expect(secondCard).toHaveAttribute('aria-disabled', 'true');

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-slot="answerChoiceA"]:focus')).toHaveCount(1);

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-slot="answerChoiceB"]:focus')).toHaveCount(1);

    await page.keyboard.press('Tab');
    await expect(secondTrigger).toBeFocused();
    await expect(firstCard).toHaveAttribute('data-card-state', 'normal');
    await expect(secondCard).toHaveAttribute('data-card-state', 'expanded');

    await page.keyboard.press('Shift+Tab');
    await expect(firstTrigger).toBeFocused();
    await expect(firstCard).toHaveAttribute('data-card-state', 'expanded');
    await expect(secondCard).toHaveAttribute('data-card-state', 'normal');
  });

  test('@smoke assertion:B5-keyboard-sequential unavailable keyboard target collapses the previous expanded card after internal CTA traversal completes', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    await page.locator('body').click({position: {x: 1, y: 1}});
    await tabUntilCardFocused(page, 'test-energy-check');

    const sourceCard = page.locator('[data-card-id="test-energy-check"]');
    const unavailableCard = page.locator('[data-card-id="test-coming-soon-1"]');
    const unavailableTrigger = unavailableCard.getByTestId('landing-grid-card-trigger');

    await expect(sourceCard).toHaveAttribute('data-card-state', 'expanded');

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-card-id="test-energy-check"] [data-slot="answerChoiceA"]:focus')).toHaveCount(1);

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-card-id="test-energy-check"] [data-slot="answerChoiceB"]:focus')).toHaveCount(1);

    await page.keyboard.press('Tab');
    await expect(unavailableTrigger).toBeFocused();
    await expect(unavailableCard).toHaveAttribute('data-card-state', 'focused');
    await expect(sourceCard).toHaveAttribute('data-card-state', 'normal');
  });

  test('@smoke expanded keyboard focus boundary follows the visible overlay shell', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    await page.locator('body').click({position: {x: 1, y: 1}});
    await tabUntilCardFocused(page, 'test-rhythm-a');

    const firstCard = page.locator('[data-card-id="test-rhythm-a"]');
    await expect(firstCard).toHaveAttribute('data-card-state', 'expanded');
    await expect(firstCard).toHaveAttribute('data-desktop-motion-role', 'steady');
    await expect(firstCard.getByTestId('landing-grid-card-trigger')).toBeFocused();
    await expect(firstCard).toHaveScreenshot('expanded-focus-shell.png');
  });

  test('@smoke assertion:B5-overlay-focus shell-aligned focus remains readable above unavailable overlay', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const unavailableCard = page.locator('[data-card-id="test-coming-soon-1"]');
    await unavailableCard.getByTestId('landing-grid-card-trigger').focus();
    await expect(unavailableCard).toHaveScreenshot('overlay-focus-shell.png');
  });

  test('@smoke reduced-motion shrinks desktop motion and rapid interactions stay error-free', async ({page}) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const shell = page.getByTestId('landing-grid-shell');
    const firstCard = page.locator('[data-card-id="test-rhythm-a"]');
    const secondCard = page.locator('[data-card-id="test-rhythm-b"]');
    const unavailableCard = page.locator('[data-card-id="test-coming-soon-1"]');

    await expect(shell).toHaveAttribute('data-page-state', 'REDUCED_MOTION');

    const motionToken = await firstCard.evaluate((element) =>
      getComputedStyle(element).getPropertyValue('--landing-card-motion-ms').trim()
    );
    const shellScale = await firstCard.evaluate((element) =>
      getComputedStyle(element).getPropertyValue('--landing-card-shell-scale').trim()
    );
    const normalizedMotionMs = motionToken.endsWith('ms') ? parseFloat(motionToken) : parseFloat(motionToken) * 1000;
    expect(normalizedMotionMs).toBe(180);
    expect(shellScale).toBe('1');

    await firstCard.hover();
    await secondCard.hover();
    await unavailableCard.hover();
    await page.mouse.move(1, 1);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
