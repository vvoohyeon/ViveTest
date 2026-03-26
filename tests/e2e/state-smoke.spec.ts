import {expect, type Locator, type Page, test} from '@playwright/test';

import {seedTelemetryConsent} from './helpers/consent';
import {PRIMARY_AVAILABLE_TEST_CARD_ID, buildLocalizedPrimaryTestRoute} from './helpers/landing-fixture';

const THEME_STORAGE_KEY = 'vivetest-theme';
const AVAILABLE_TEST_CARD_SELECTOR =
  '[data-testid="landing-grid-card"][data-card-availability="available"][data-card-id^="test-"]';
const HOVER_OUT_SAMPLE_TIMES_MS = [0, 16, 32, 64, 100, 140, 180] as const;
const LANDING_INTERACTION_RAMP_SETTLE_MS = 180;
const TRANSITION_OVERLAY_READY_DELAY_MS = 300;

interface InteractiveMetrics {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  backgroundColor: string;
  backgroundAlpha: number;
  backgroundImage: string;
  borderColor: string;
  boxShadow: string;
  transform: string;
  hovered: boolean;
}

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

async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript(
    ([storageKey, nextTheme]) => {
      window.localStorage.setItem(storageKey, nextTheme);
    },
    [THEME_STORAGE_KEY, theme] as const
  );
}

async function waitForThemeApplied(page: Page, theme: 'light' | 'dark') {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme')))
    .toBe(theme);
}

async function waitForLandingInteractionRamp(page: Page) {
  await page.waitForTimeout(LANDING_INTERACTION_RAMP_SETTLE_MS);
}

function getPrimaryAvailableTestCard(page: Page): Locator {
  return page.locator(AVAILABLE_TEST_CARD_SELECTOR).first();
}

async function movePointerToCenter(page: Page, locator: Locator): Promise<void> {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error('Missing bounding box for pointer move target.');
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
}

async function readInteractiveMetrics(locator: Locator): Promise<InteractiveMetrics> {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const parseBackgroundAlpha = (value: string): number => {
      if (value === 'transparent') {
        return 0;
      }

      const rgbaMatch = value.match(/rgba?\((.*)\)/u);
      if (rgbaMatch) {
        const parts = rgbaMatch[1].split(',');
        if (parts.length === 4) {
          return Number.parseFloat(parts[3]);
        }

        return 1;
      }

      const slashMatch = value.match(/\/\s*([0-9.]+)\s*\)$/u);
      if (slashMatch) {
        return Number.parseFloat(slashMatch[1]);
      }

      return 1;
    };

    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      backgroundColor: style.backgroundColor,
      backgroundAlpha: parseBackgroundAlpha(style.backgroundColor),
      backgroundImage: style.backgroundImage,
      borderColor: style.borderColor,
      boxShadow: style.boxShadow,
      transform: style.transform,
      hovered: element.matches(':hover')
    };
  });
}

async function readHoverOutSamples(
  page: Page,
  interactiveLocator: Locator,
  hoverExitLocator: Locator,
  sampleTimesMs: readonly number[]
): Promise<InteractiveMetrics[]> {
  await movePointerToCenter(page, hoverExitLocator);

  const samples: InteractiveMetrics[] = [];
  let elapsedMs = 0;

  for (const targetMs of sampleTimesMs) {
    await page.waitForTimeout(targetMs - elapsedMs);
    elapsedMs = targetMs;
    samples.push(await readInteractiveMetrics(interactiveLocator));
  }

  return samples;
}

async function expandLandingCardViaTrigger(card: Locator) {
  const trigger = card.getByTestId('landing-grid-card-trigger');

  await expect
    .poll(async () => {
      await trigger.evaluate((element) => {
        if (element instanceof HTMLElement) {
          element.click();
          return;
        }

        element.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });

      return await card.getAttribute('data-card-state');
    })
    .toBe('expanded');
}

test.describe('Phase 7 state + capability smoke', () => {
  test.beforeEach(async ({page}) => {
    await seedTelemetryConsent(page, 'OPTED_OUT');
  });

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
    await tabUntilCardFocused(page, PRIMARY_AVAILABLE_TEST_CARD_ID);

    const firstCard = page.locator(`[data-card-id="${PRIMARY_AVAILABLE_TEST_CARD_ID}"]`);
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

  test('@smoke desktop short expanded overlay keeps the root shell transparent while the surface settles content-fit', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const firstCard = page.locator(`[data-card-id="${PRIMARY_AVAILABLE_TEST_CARD_ID}"]`);
    await movePointerToCenter(page, firstCard.getByTestId('landing-grid-card-trigger'));
    await expect(firstCard).toHaveAttribute('data-card-state', 'expanded');
    await expect(firstCard).toHaveAttribute('data-desktop-motion-role', 'steady');

    await movePointerToCenter(page, firstCard.locator('[data-slot="cardTitleExpanded"]'));

    const rootMetrics = await readInteractiveMetrics(firstCard);
    const surfaceMetrics = await readInteractiveMetrics(firstCard.locator('[data-slot="expandedSurface"]'));
    const overlayStyleMetrics = await firstCard.evaluate((element) => {
      const shell = element.querySelector<HTMLElement>('[data-slot="expandedShell"]');
      const surface = element.querySelector<HTMLElement>('[data-slot="expandedSurface"]');

      if (!shell || !surface) {
        throw new Error('Expected expanded shell and surface to be present.');
      }

      return {
        shellMinHeight: getComputedStyle(shell).minHeight,
        surfaceMinHeight: getComputedStyle(surface).minHeight
      };
    });

    expect(rootMetrics.backgroundAlpha).toBeLessThanOrEqual(0.05);
    expect(rootMetrics.boxShadow).toBe('none');
    expect(surfaceMetrics.backgroundAlpha).toBeGreaterThan(0.9);
    expect(overlayStyleMetrics.shellMinHeight).toBe('0px');
    expect(overlayStyleMetrics.surfaceMinHeight).toBe('0px');
  });

  test('@smoke expanded keyboard focus boundary follows the visible overlay shell', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    await page.locator('body').click({position: {x: 1, y: 1}});
    await tabUntilCardFocused(page, PRIMARY_AVAILABLE_TEST_CARD_ID);

    const firstCard = page.locator(`[data-card-id="${PRIMARY_AVAILABLE_TEST_CARD_ID}"]`);
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
    await tabUntilCardFocused(page, PRIMARY_AVAILABLE_TEST_CARD_ID);

    const firstCard = page.locator(`[data-card-id="${PRIMARY_AVAILABLE_TEST_CARD_ID}"]`);
    const secondCard = page.locator('[data-card-id="test-rhythm-b"]');
    const secondTrigger = secondCard.getByTestId('landing-grid-card-trigger');

    await page.keyboard.press('Space');
    await expect(firstCard).toHaveAttribute('data-mobile-phase', 'OPEN');
    await expect(firstCard).toHaveAttribute('data-card-state', 'expanded');

    await page.keyboard.press('Tab');
    await expect(firstCard.locator('[data-slot="mobileClose"]:focus')).toHaveCount(1);

    await page.keyboard.press('Tab');
    await expect(
      page.locator(`[data-card-id="${PRIMARY_AVAILABLE_TEST_CARD_ID}"] [data-slot="answerChoiceA"]:focus`)
    ).toHaveCount(1);

    await page.keyboard.press('Tab');
    await expect(
      page.locator(`[data-card-id="${PRIMARY_AVAILABLE_TEST_CARD_ID}"] [data-slot="answerChoiceB"]:focus`)
    ).toHaveCount(1);

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
    const firstCard = page.locator(`[data-card-id="${PRIMARY_AVAILABLE_TEST_CARD_ID}"]`);
    const secondCard = page.locator('[data-card-id="test-rhythm-b"]');
    const lowerRowCard = page.locator('[data-card-id="blog-ops-handbook"]');
    const unavailableCard = page.locator('[data-card-id="test-coming-soon-1"]');

    await expect(shell).toHaveAttribute('data-page-state', 'REDUCED_MOTION');

    const motionToken = await firstCard.evaluate((element) =>
      getComputedStyle(element).getPropertyValue('--landing-card-motion-ms').trim()
    );
    const shellScale = await firstCard.evaluate((element) =>
      getComputedStyle(element).getPropertyValue('--landing-card-shell-scale').trim()
    );
    const lowerRowInlineScale = await lowerRowCard.evaluate((element) =>
      getComputedStyle(element).getPropertyValue('--landing-card-shell-inline-scale').trim()
    );
    const normalizedMotionMs = motionToken.endsWith('ms') ? parseFloat(motionToken) : parseFloat(motionToken) * 1000;
    expect(normalizedMotionMs).toBe(180);
    expect(shellScale).toBe('1');
    expect(lowerRowInlineScale).toBe('1');

    await firstCard.hover();
    await expect(firstCard).toHaveAttribute('data-card-state', 'expanded');

    const expandedShell = firstCard.locator('[data-slot="expandedBody"]');
    const desktopMotionRole = await firstCard.getAttribute('data-desktop-motion-role');
    const expandedShellAnimation = await expandedShell.evaluate((element) => getComputedStyle(element).animationName);
    const expandedShellTransform = await expandedShell.evaluate((element) => getComputedStyle(element).transform);
    const answerChoiceAnimation = await firstCard
      .locator('[data-slot="answerChoices"]')
      .evaluate((element) => getComputedStyle(element).animationName);

    expect(['opening', 'steady']).toContain(desktopMotionRole);
    expect(
      expandedShellAnimation === 'none' || expandedShellAnimation.includes('landing-card-shell-reduced-open')
    ).toBe(true);
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
    await delayDestinationReadyRaf(page, TRANSITION_OVERLAY_READY_DELAY_MS);
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const shell = page.getByTestId('landing-grid-shell');
    const firstCard = page.locator(`[data-card-id="${PRIMARY_AVAILABLE_TEST_CARD_ID}"]`);

    await expect(shell).toHaveAttribute('data-page-state', 'REDUCED_MOTION');
    await firstCard.hover();
    await expect(firstCard).toHaveAttribute('data-card-state', 'expanded');

    const navigation = page.waitForURL(new RegExp(`${buildLocalizedPrimaryTestRoute('en')}$`, 'u'));
    await firstCard.locator('[data-slot="answerChoiceA"]').click({noWaitAfter: true});
    await expect(shell).toHaveAttribute('data-page-state', 'TRANSITIONING');
    await navigation;
  });

  test('@smoke landing card and CTA cursor policy stays scoped to available landing interactions', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const availableTestCard = page.locator(`[data-card-id="${PRIMARY_AVAILABLE_TEST_CARD_ID}"]`);
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

  test('@smoke blog Read more hover keeps CTA geometry and adjacent layout stable', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const blogCard = page.locator('[data-card-id="blog-ops-handbook"]');
    await movePointerToCenter(page, blogCard.getByTestId('landing-grid-card-trigger'));
    await expect(blogCard).toHaveAttribute('data-card-state', 'expanded');
    await expect(blogCard).toHaveAttribute('data-desktop-motion-role', 'steady');

    await movePointerToCenter(page, blogCard.locator('[data-slot="cardTitleExpanded"]'));

    const cta = blogCard.locator('[data-slot="primaryCTA"]');
    const meta = blogCard.locator('[data-slot="meta"]');
    const beforeCta = await readInteractiveMetrics(cta);
    const beforeMeta = await readInteractiveMetrics(meta);

    expect(beforeCta.hovered).toBe(false);

    await cta.hover();
    await page.waitForTimeout(180);

    const afterCta = await readInteractiveMetrics(cta);
    const afterMeta = await readInteractiveMetrics(meta);

    expect(afterCta.hovered).toBe(true);
    expect(afterCta.transform).toBe('none');
    expect(afterCta.boxShadow).not.toBe(beforeCta.boxShadow);
    expect(afterCta.backgroundColor).not.toBe(beforeCta.backgroundColor);
    expect(Math.abs(afterCta.x - beforeCta.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(afterCta.y - beforeCta.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(afterCta.width - beforeCta.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(afterCta.height - beforeCta.height)).toBeLessThanOrEqual(1);
    expect(Math.abs(afterMeta.top - beforeMeta.top)).toBeLessThanOrEqual(1);
    expect(Math.abs(afterMeta.height - beforeMeta.height)).toBeLessThanOrEqual(1);
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`@smoke test answer choice hover keeps a continuous fill without a transparent handoff in ${theme} theme`, async ({
      page
    }) => {
      await setTheme(page, theme);
      await page.setViewportSize({width: 1440, height: 980});
      await page.goto('/en');
      await waitForThemeApplied(page, theme);
      await waitForLandingInteractionRamp(page);

      const testCard = getPrimaryAvailableTestCard(page);
      await expandLandingCardViaTrigger(testCard);
      await expect(testCard).toHaveAttribute('data-desktop-motion-role', 'steady');

      const hoverExitTarget = testCard.locator('[data-slot="cardTitleExpanded"]');
      await movePointerToCenter(page, hoverExitTarget);
      const answerChoice = testCard.locator('[data-slot="answerChoiceA"]');
      const beforeHover = await readInteractiveMetrics(answerChoice);

      expect(beforeHover.hovered).toBe(false);
      expect(beforeHover.backgroundImage).toBe('none');
      expect(beforeHover.backgroundAlpha).toBeGreaterThan(0);

      await answerChoice.hover();
      await page.waitForTimeout(180);

      const afterHover = await readInteractiveMetrics(answerChoice);
      const hoverOutSamples = await readHoverOutSamples(
        page,
        answerChoice,
        hoverExitTarget,
        HOVER_OUT_SAMPLE_TIMES_MS
      );
      const settledHoverOut = hoverOutSamples.at(-1);

      expect(afterHover.hovered).toBe(true);
      expect(afterHover.transform).toBe('none');
      expect(afterHover.backgroundImage).toBe('none');
      expect(afterHover.backgroundColor).not.toBe(beforeHover.backgroundColor);
      expect(afterHover.borderColor).not.toBe(beforeHover.borderColor);
      expect(afterHover.boxShadow).not.toBe(beforeHover.boxShadow);
      expect(Math.abs(afterHover.x - beforeHover.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(afterHover.y - beforeHover.y)).toBeLessThanOrEqual(1);
      expect(Math.abs(afterHover.width - beforeHover.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(afterHover.height - beforeHover.height)).toBeLessThanOrEqual(1);

      for (const sample of hoverOutSamples) {
        expect(sample.backgroundImage).toBe('none');
        expect(sample.backgroundAlpha).toBeGreaterThan(0);
      }

      expect(settledHoverOut).toBeDefined();
      expect(settledHoverOut?.hovered).toBe(false);
      expect(settledHoverOut?.backgroundColor).toBe(beforeHover.backgroundColor);
      expect(settledHoverOut?.borderColor).toBe(beforeHover.borderColor);
    });
  }
});
