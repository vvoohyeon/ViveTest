import {expect, type Page, test} from '@playwright/test';

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

  test('@smoke assertion:B5-mobile-keyboard-handoff mobile keyboard CTA traversal collapses the previous expanded card before focusing the next trigger', async ({
    page
  }) => {
    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/en');

    await page.locator('body').click({position: {x: 1, y: 1}});
    await tabUntilCardFocused(page, 'test-rhythm-a');

    const firstCard = page.locator('[data-card-id="test-rhythm-a"]');
    const secondCard = page.locator('[data-card-id="test-rhythm-b"]');
    const secondTrigger = secondCard.getByTestId('landing-grid-card-trigger');

    await page.keyboard.press('Space');
    await expect(firstCard).toHaveAttribute('data-mobile-phase', 'OPEN');
    await expect(firstCard).toHaveAttribute('data-card-state', 'expanded');

    await page.keyboard.press('Tab');
    await expect(firstCard.locator('[data-slot="mobileClose"]:focus')).toHaveCount(1);

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-card-id="test-rhythm-a"] [data-slot="answerChoiceA"]:focus')).toHaveCount(1);

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-card-id="test-rhythm-a"] [data-slot="answerChoiceB"]:focus')).toHaveCount(1);

    await page.keyboard.press('Tab');
    await expect(secondTrigger).toBeFocused();
    await expect(firstCard).toHaveAttribute('data-card-state', 'normal');
    await expect(firstCard).toHaveAttribute('data-mobile-phase', 'NORMAL');
    await expect(secondCard).toHaveAttribute('data-card-state', 'focused');

    await page.keyboard.press('Space');
    await expect(secondCard).toHaveAttribute('data-mobile-phase', 'OPEN');
    await expect(secondCard).toHaveAttribute('data-card-state', 'expanded');
  });

  test('@smoke reduced-motion / low-spec fallback shrinks desktop motion and rapid interactions stay error-free', async ({page}) => {
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
    await expect(firstCard).toHaveAttribute('data-card-state', 'expanded');

    const expandedShell = firstCard.locator('[data-slot="expandedBody"]');
    const expandedShellAnimation = await expandedShell.evaluate((element) => getComputedStyle(element).animationName);
    const expandedShellTransform = await expandedShell.evaluate((element) => getComputedStyle(element).transform);
    const answerChoiceAnimation = await firstCard
      .locator('[data-slot="answerChoices"]')
      .evaluate((element) => getComputedStyle(element).animationName);

    expect(expandedShellAnimation).toContain('landing-card-shell-reduced-open');
    expect(expandedShellTransform).toBe('none');
    expect(answerChoiceAnimation).toBe('none');

    await secondCard.hover();
    await unavailableCard.hover();
    await page.mouse.move(1, 1);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('@smoke reduced-motion transition start still enters TRANSITIONING lock before destination navigation settles', async ({
    page
  }) => {
    await delayDestinationReadyRaf(page);
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const shell = page.getByTestId('landing-grid-shell');
    const firstCard = page.locator('[data-card-id="test-rhythm-a"]');
    const secondCard = page.locator('[data-card-id="test-rhythm-b"]');

    await expect(shell).toHaveAttribute('data-page-state', 'REDUCED_MOTION');
    await firstCard.hover();
    await expect(firstCard).toHaveAttribute('data-card-state', 'expanded');

    const navigation = page.waitForURL(/\/en\/test\/rhythm-a\/question$/u);
    await firstCard.locator('[data-slot="answerChoiceA"]').click({noWaitAfter: true});
    await expect(shell).toHaveAttribute('data-page-state', 'TRANSITIONING');
    await expect(secondCard).toHaveAttribute('data-hover-lock-blocked', 'true');
    await navigation;
  });

  test('@smoke landing card and CTA cursor policy stays scoped to available landing interactions', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const availableTestCard = page.locator('[data-card-id="test-rhythm-a"]');
    const availableBlogCard = page.locator('[data-card-id="blog-ops-handbook"]');
    const unavailableCard = page.locator('[data-card-id="test-coming-soon-1"]');

    const availableTriggerCursor = await availableTestCard
      .getByTestId('landing-grid-card-trigger')
      .evaluate((element) => getComputedStyle(element).cursor);
    const unavailableTriggerCursor = await unavailableCard
      .getByTestId('landing-grid-card-trigger')
      .evaluate((element) => getComputedStyle(element).cursor);

    expect(availableTriggerCursor).toBe('pointer');
    expect(unavailableTriggerCursor).toBe('default');

    await availableTestCard.hover();
    await expect(availableTestCard).toHaveAttribute('data-card-state', 'expanded');
    const answerChoiceCursor = await availableTestCard
      .locator('[data-slot="answerChoiceA"]')
      .evaluate((element) => getComputedStyle(element).cursor);
    expect(answerChoiceCursor).toBe('pointer');

    await availableBlogCard.hover();
    await expect(availableBlogCard).toHaveAttribute('data-card-state', 'expanded');
    const primaryCtaCursor = await availableBlogCard
      .locator('[data-slot="primaryCTA"]')
      .evaluate((element) => getComputedStyle(element).cursor);
    expect(primaryCtaCursor).toBe('pointer');
  });
});
