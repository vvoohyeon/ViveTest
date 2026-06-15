import {expect, type Locator, type Page, test} from '@playwright/test';

import {seedTelemetryConsent} from './helpers/consent';
import {
  PRIMARY_AVAILABLE_TEST_VARIANT,
  PRIMARY_BLOG_VARIANT,
  buildLocalizedPrimaryTestRoute
} from './helpers/landing-fixture';
import {expectLocatorToMatchLocalSnapshot} from './helpers/local-snapshot';

const THEME_STORAGE_KEY = 'vivetest-theme';
const AVAILABLE_TEST_CARD_SELECTOR =
  '[data-testid="landing-grid-card"][data-card-availability="available"][data-card-content-type="test"]';
const HOVER_OUT_SAMPLE_TIMES_MS = [0, 16, 32, 64, 100, 140, 180, 240, 320] as const;
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

async function readFocusOnlySideEffects(page: Page) {
  return page.evaluate(() => ({
    url: window.location.href,
    transitionOverlayCount: document.querySelectorAll('[data-testid="landing-transition-source-gnb"]').length,
    transitionStorage: Object.fromEntries(
      Object.entries(window.sessionStorage).filter(
        ([key]) =>
          key === 'vivetest-landing-pending-transition' ||
          key.startsWith('vivetest-landing-ingress:')
      )
    )
  }));
}

function normalizeAdjacent(values: string[]): string[] {
  return values.filter((value, index) => index === 0 || value !== values[index - 1]);
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

async function readDocumentCanvasMetrics(page: Page) {
  return page.evaluate(() => {
    const bodyStyle = getComputedStyle(document.body);

    return {
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
      rootClientWidth: document.documentElement.clientWidth,
      bodyClientWidth: document.body.clientWidth,
      bodyBackgroundColor: bodyStyle.backgroundColor,
      bodyBackgroundImage: bodyStyle.backgroundImage
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

async function expandLandingCardViaTrigger(page: Page, card: Locator) {
  const trigger = card.getByTestId('landing-grid-card-trigger');
  await movePointerToCenter(page, trigger);
  await expect(card).toHaveAttribute('data-card-state', 'expanded');
}

test.describe('Phase 7 state + capability smoke', () => {
  test.beforeEach(async ({page}) => {
    await seedTelemetryConsent(page, 'OPTED_IN');
  });

  test('@smoke root canvas keeps body-owned background without reserving a right-edge gutter', async ({
    page
  }) => {
    await page.setViewportSize({width: 1600, height: 700});
    await page.goto('/en');

    const metrics = await readDocumentCanvasMetrics(page);

    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
    expect(metrics.rootClientWidth).toBe(metrics.bodyClientWidth);
    expect(metrics.bodyBackgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(metrics.bodyBackgroundImage).not.toBe('none');
  });

  test('@smoke capability gate keeps tap on mobile and hover on desktop-capable environments', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/en');
    await expect(page.getByTestId('landing-grid-card').first()).toHaveAttribute('data-interaction-mode', 'tap');

    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');
    await expect(page.getByTestId('landing-grid-card').first()).toHaveAttribute('data-interaction-mode', 'hover');
  });

  test('@smoke assertion:W11-keyboard LI-01 Desktop hover-none and Tablet Test focus expand immediately', async ({
    page
  }) => {
    await installHoverCapability(page, false);

    for (const viewport of [
      {width: 1440, height: 980},
      {width: 900, height: 980}
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/en');

      const card = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
      const focusExpandElapsedMs = await card.getByTestId('landing-grid-card-trigger').evaluate((trigger) => {
        const cardRoot = trigger.closest('[data-testid="landing-grid-card"]');
        if (!(cardRoot instanceof HTMLElement)) {
          throw new Error('Missing card root');
        }

        return new Promise<number | null>((resolve) => {
          const startedAt = performance.now();
          const observer = new MutationObserver(() => {
            if (cardRoot.dataset.cardState === 'expanded') {
              observer.disconnect();
              resolve(performance.now() - startedAt);
            }
          });
          observer.observe(cardRoot, {attributes: true, attributeFilter: ['data-card-state']});
          (trigger as HTMLElement).focus();

          if (cardRoot.dataset.cardState === 'expanded') {
            observer.disconnect();
            resolve(performance.now() - startedAt);
            return;
          }

          window.setTimeout(() => {
            observer.disconnect();
            resolve(null);
          }, 120);
        });
      });

      expect(focusExpandElapsedMs).not.toBeNull();
      expect(focusExpandElapsedMs ?? 120).toBeLessThan(120);
      await expect(card).toHaveAttribute('data-interaction-mode', 'tap');
      await expect(card).toHaveAttribute('data-card-state', 'expanded');
    }
  });

  test('@smoke assertion:W11-keyboard LI-01 keyboard focus cancels stale pointer intent and keeps Blog out of expansion ownership', async ({
    page
  }) => {
    let telemetryRequestCount = 0;
    await page.route('**/api/telemetry', async (route) => {
      telemetryRequestCount += 1;
      await route.fulfill({status: 204});
    });
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const shell = page.getByTestId('landing-grid-shell');
    const firstCard = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    const secondCard = page.locator('[data-card-variant="rhythm-b"]');
    const blogCard = page.locator(`[data-card-variant="${PRIMARY_BLOG_VARIANT}"]`);
    const before = await readFocusOnlySideEffects(page);
    const telemetryBefore = telemetryRequestCount;

    await firstCard.getByTestId('landing-grid-card-trigger').hover();
    await secondCard.getByTestId('landing-grid-card-trigger').focus();
    await page.waitForTimeout(220);

    await expect(secondCard).toHaveAttribute('data-card-state', 'expanded');
    await expect(firstCard).toHaveAttribute('data-card-state', 'normal');
    await expect(shell).toHaveAttribute('data-interaction-expanded-card-variant', 'rhythm-b');
    await expect(shell).toHaveAttribute('data-active-visual-card-variant', 'rhythm-b');

    await blogCard.getByTestId('landing-grid-card-trigger').focus();
    await expect(blogCard.getByTestId('landing-grid-card-trigger')).toBeFocused();
    await expect(blogCard).not.toHaveAttribute('data-card-state', 'expanded');
    await expect(shell).not.toHaveAttribute('data-interaction-expanded-card-variant', PRIMARY_BLOG_VARIANT);
    await expect(shell).not.toHaveAttribute('data-active-visual-card-variant', PRIMARY_BLOG_VARIANT);
    await expect(blogCard).toHaveAttribute('data-desktop-motion-role', 'idle');
    await expect(shell).not.toHaveAttribute('data-baseline-active-card-variant', PRIMARY_BLOG_VARIANT);

    await firstCard.getByTestId('landing-grid-card-trigger').focus();
    await expect(firstCard).toHaveAttribute('data-card-state', 'expanded');
    await expect(shell).toHaveAttribute(
      'data-interaction-expanded-card-variant',
      PRIMARY_AVAILABLE_TEST_VARIANT
    );

    const after = await readFocusOnlySideEffects(page);
    expect(after).toEqual(before);
    expect(telemetryRequestCount).toBe(telemetryBefore);
  });

  test('@smoke assertion:W11-keyboard LI-02 Escape from trigger and choices closes once and restores a safe trigger focus', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});

    for (const source of ['trigger', 'choice-a', 'choice-b'] as const) {
      await page.goto('/en');
      const shell = page.getByTestId('landing-grid-shell');
      const card = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
      const trigger = card.getByTestId('landing-grid-card-trigger');
      await trigger.focus();
      await expect(card).toHaveAttribute('data-desktop-shell-phase', 'steady');

      if (source !== 'trigger') {
        await page.keyboard.press('Tab');
        await expect(card.locator('[data-slot="answerChoiceA"]')).toBeFocused();
      }
      if (source === 'choice-b') {
        await page.keyboard.press('Tab');
        await expect(card.locator('[data-slot="answerChoiceB"]')).toBeFocused();
      }

      await shell.evaluate((element, cardVariant) => {
        const cardRoot = element.querySelector<HTMLElement>(`[data-card-variant="${cardVariant}"]`);
        if (!cardRoot) {
          throw new Error('Missing observed card');
        }
        const state = window as Window & {
          __w11EscapeLog?: {
            phases: string[];
            baselinePhases: string[];
            hiddenOrInertFocus: string[];
            observer: MutationObserver;
          };
        };
        const phases = [cardRoot.dataset.desktopShellPhase ?? ''];
        const baselinePhases = [(element as HTMLElement).dataset.baselinePhase ?? ''];
        const hiddenOrInertFocus: string[] = [];
        const observer = new MutationObserver(() => {
          phases.push(cardRoot.dataset.desktopShellPhase ?? '');
          baselinePhases.push((element as HTMLElement).dataset.baselinePhase ?? '');
          const active = document.activeElement;
          if (
            active instanceof HTMLElement &&
            active.closest('[aria-hidden="true"], [inert]')
          ) {
            hiddenOrInertFocus.push(active.outerHTML);
          }
        });
        observer.observe(element, {
          attributes: true,
          subtree: true,
          attributeFilter: ['data-desktop-shell-phase', 'data-baseline-phase', 'aria-hidden', 'inert', 'tabindex']
        });
        state.__w11EscapeLog = {phases, baselinePhases, hiddenOrInertFocus, observer};
      }, PRIMARY_AVAILABLE_TEST_VARIANT);

      const before = await readFocusOnlySideEffects(page);
      await page.keyboard.press('Escape');
      await expect(trigger).toBeFocused();
      await expect(card).toHaveAttribute('data-desktop-shell-phase', 'idle');
      await expect(shell).toHaveAttribute('data-baseline-phase', 'BASELINE_READY');

      const log = await page.evaluate(() => {
        const state = window as Window & {
          __w11EscapeLog?: {
            phases: string[];
            baselinePhases: string[];
            hiddenOrInertFocus: string[];
            observer: MutationObserver;
          };
        };
        const value = state.__w11EscapeLog;
        value?.observer.disconnect();
        return value
          ? {
              phases: value.phases,
              baselinePhases: value.baselinePhases,
              hiddenOrInertFocus: value.hiddenOrInertFocus
            }
          : null;
      });

      expect(normalizeAdjacent(log?.phases ?? [])).toEqual([
        'steady',
        'closing',
        'cleanup-pending',
        'idle'
      ]);
      expect(normalizeAdjacent(log?.baselinePhases ?? [])).toEqual([
        'BASELINE_FROZEN',
        'BASELINE_READY'
      ]);
      expect(log?.hiddenOrInertFocus).toEqual([]);
      expect(log?.phases).not.toContain('handoff-source');
      expect(await readFocusOnlySideEffects(page)).toEqual(before);

      await page.keyboard.press('Tab');
      await expect(card.locator('[data-slot="answerChoiceA"]:focus')).toHaveCount(0);
      await expect(card.locator('[data-slot="answerChoiceB"]:focus')).toHaveCount(0);
    }
  });

  test('@smoke assertion:W11-keyboard LI-02 true focus-out closes without stealing GNB Blog or document destination focus', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const testCard = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    const trigger = testCard.getByTestId('landing-grid-card-trigger');
    const blogTrigger = page
      .locator(`[data-card-variant="${PRIMARY_BLOG_VARIANT}"]`)
      .getByTestId('landing-grid-card-trigger');

    await trigger.focus();
    await expect(testCard).toHaveAttribute('data-desktop-shell-phase', 'steady');
    await page.keyboard.press('Tab');
    await expect(testCard.locator('[data-slot="answerChoiceA"]')).toBeFocused();
    await expect(testCard).toHaveAttribute('data-desktop-shell-phase', 'steady');
    await page.keyboard.press('Tab');
    await expect(testCard.locator('[data-slot="answerChoiceB"]')).toBeFocused();
    await expect(testCard).toHaveAttribute('data-desktop-shell-phase', 'steady');
    await page.keyboard.press('Shift+Tab');
    await expect(testCard.locator('[data-slot="answerChoiceA"]')).toBeFocused();
    await expect(testCard).toHaveAttribute('data-desktop-shell-phase', 'steady');

    await page.locator('body').dispatchEvent('mousedown', {
      button: 0,
      clientX: 1,
      clientY: 1
    });
    await blogTrigger.focus();
    await expect(blogTrigger).toBeFocused();
    await expect(testCard).toHaveAttribute('data-desktop-shell-phase', 'idle');

    await trigger.focus();
    await expect(testCard).toHaveAttribute('data-desktop-shell-phase', 'steady');
    const settingsTrigger = page.getByTestId('gnb-settings-trigger');
    await settingsTrigger.focus();
    await expect(settingsTrigger).toBeFocused();
    await expect(testCard).toHaveAttribute('data-desktop-shell-phase', 'idle');

    await page.evaluate(() => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.testid = 'w11-document-focus-target';
      button.textContent = 'Document focus target';
      document.body.append(button);
    });
    const documentTarget = page.getByTestId('w11-document-focus-target');
    await trigger.focus();
    await expect(testCard).toHaveAttribute('data-desktop-shell-phase', 'steady');
    await documentTarget.focus();
    await expect(documentTarget).toBeFocused();
    await expect(testCard).toHaveAttribute('data-desktop-shell-phase', 'idle');
  });

  test('@smoke assertion:W11-keyboard LI-02 open settings consumes first Escape and card consumes second', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const card = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    const trigger = card.getByTestId('landing-grid-card-trigger');
    const settingsTrigger = page.getByTestId('gnb-settings-trigger');
    const settingsPanel = page.getByTestId('gnb-settings-panel');

    await trigger.focus();
    await expect(card).toHaveAttribute('data-desktop-shell-phase', 'steady');
    await settingsTrigger.hover();
    await expect(settingsPanel).toBeVisible();
    await expect(trigger).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(settingsPanel).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(card).toHaveAttribute('data-desktop-shell-phase', 'steady');

    await page.keyboard.press('Escape');
    await expect(card).toHaveAttribute('data-desktop-shell-phase', 'idle');
    await expect(trigger).toBeFocused();
  });

  test('@smoke assertion:W11-keyboard LI-04 expanded focus ring follows the surface without horizontal overflow', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});

    for (const reducedMotion of [false, true]) {
      await page.emulateMedia({reducedMotion: reducedMotion ? 'reduce' : 'no-preference'});
      await page.goto('/en');

      const card = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
      const trigger = card.getByTestId('landing-grid-card-trigger');
      const surface = card.locator('[data-slot="expandedSurface"]');

      await trigger.focus();
      await expect(card).toHaveAttribute('data-desktop-shell-phase', 'steady');
      await page.keyboard.press('Tab');
      await expect(card.locator('[data-slot="answerChoiceA"]')).toBeFocused();

      const metrics = await surface.evaluate((element) => {
        const surfaceElement = element as HTMLElement;
        const cardElement = surfaceElement.closest<HTMLElement>('[data-testid="landing-grid-card"]');
        const stageElement = cardElement?.querySelector<HTMLElement>('[data-slot="desktopStage"]');
        const shellElement = document.querySelector<HTMLElement>('[data-testid="landing-grid-shell"]');
        const containerElement = document.querySelector<HTMLElement>('[data-testid="landing-grid-container"]');

        if (!cardElement || !stageElement || !shellElement || !containerElement) {
          throw new Error('Expected expanded card geometry targets.');
        }

        const style = getComputedStyle(surfaceElement);
        const surfaceRect = surfaceElement.getBoundingClientRect();
        const stageRect = stageElement.getBoundingClientRect();
        const outlineExtent = Number.parseFloat(style.outlineWidth) + Number.parseFloat(style.outlineOffset);
        const overflowTargets = {
          stage: stageElement,
          surface: surfaceElement,
          grid: shellElement,
          container: containerElement,
          document: document.documentElement
        };

        return {
          outlineWidth: style.outlineWidth,
          outlineStyle: style.outlineStyle,
          outlineColor: style.outlineColor,
          outlineOffset: style.outlineOffset,
          outlineInsideStage:
            surfaceRect.left - outlineExtent >= stageRect.left &&
            surfaceRect.right + outlineExtent <= stageRect.right &&
            surfaceRect.top - outlineExtent >= stageRect.top &&
            surfaceRect.bottom + outlineExtent <= stageRect.bottom,
          horizontalOverflow: Object.fromEntries(
            Object.entries(overflowTargets).map(([name, target]) => [
              name,
              `${Math.max(0, target.scrollWidth - target.clientWidth)}px`
            ])
          )
        };
      });

      expect(metrics).toEqual({
        outlineWidth: '2px',
        outlineStyle: 'solid',
        outlineColor: 'rgb(92, 142, 120)',
        outlineOffset: '2px',
        outlineInsideStage: true,
        horizontalOverflow: {
          stage: '0px',
          surface: '0px',
          grid: '0px',
          container: '0px',
          document: '0px'
        }
      });
    }
  });

  test('@smoke assertion:B5-keyboard-sequential keyboard sequential override expands focused card and moves through internal controls before next card', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    await page.locator('body').click({position: {x: 1, y: 1}});
    await tabUntilCardFocused(page, PRIMARY_AVAILABLE_TEST_VARIANT);

    const firstCard = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    const secondCard = page.locator('[data-card-variant="rhythm-b"]');
    const firstTrigger = firstCard.getByTestId('landing-grid-card-trigger');
    const secondTrigger = secondCard.getByTestId('landing-grid-card-trigger');

    await expect(firstCard).toHaveAttribute('data-card-state', 'expanded');
    await expect(secondCard).toHaveAttribute('data-hover-lock-blocked', 'true');
    await expect(secondCard).toHaveAttribute('inert', '');

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

  test('@smoke assertion:B5-keyboard-mode pointermove and wheel preserve keyboard mode while mousedown exits it', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    await page.locator('body').click({position: {x: 1, y: 1}});
    await tabUntilCardFocused(page, PRIMARY_AVAILABLE_TEST_VARIANT);

    const firstCard = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    const cardBox = await firstCard.boundingBox();
    expect(cardBox).not.toBeNull();
    await expect(firstCard).toHaveAttribute('data-keyboard-mode', 'true');

    await page.mouse.move((cardBox?.x ?? 0) + 8, (cardBox?.y ?? 0) + 8);
    await expect(firstCard).toHaveAttribute('data-keyboard-mode', 'true');

    await page.mouse.wheel(0, 120);
    await expect(firstCard).toHaveAttribute('data-keyboard-mode', 'true');

    await page.locator('body').dispatchEvent('mousedown', {
      button: 0,
      clientX: 1,
      clientY: 1
    });
    await expect(firstCard).toHaveAttribute('data-keyboard-mode', 'false');
  });

  test('@smoke assertion:B5-keyboard-sequential keyboard handoff skips the unavailable card in both directions while collapsing the prior card', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    await page.locator('body').click({position: {x: 1, y: 1}});

    const sourceCard = page.locator('[data-card-variant="energy-check"]');
    const sourceTrigger = sourceCard.getByTestId('landing-grid-card-trigger');
    const unavailableCard = page.locator('[data-card-variant="creativity-profile"]');
    const unavailableTrigger = unavailableCard.getByTestId('landing-grid-card-trigger');
    const nextEnterableCard = page.locator('[data-card-variant="egtt"]');
    const nextEnterableTrigger = nextEnterableCard.getByTestId('landing-grid-card-trigger');

    // Position keyboard focus on the enterable card immediately before the unavailable one
    // (energy-check → creativity-profile → egtt). Direct focus avoids the multi-handoff
    // settle race in the older Tab-sweep helper; the skip itself is exercised by real Tab below.
    await sourceTrigger.focus();
    await expect(sourceCard).toHaveAttribute('data-card-state', 'expanded');

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-card-variant="energy-check"] [data-slot="answerChoiceA"]:focus')).toHaveCount(1);

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-card-variant="energy-check"] [data-slot="answerChoiceB"]:focus')).toHaveCount(1);

    // Forward (D1/BQ-26): Tab out of the last choice SKIPS the unavailable card and lands on the
    // next enterable card (egtt); the prior card collapses (collapse-prior intact).
    await page.keyboard.press('Tab');
    await expect(nextEnterableTrigger).toBeFocused();
    await expect(unavailableTrigger).not.toBeFocused();
    await expect(unavailableCard).not.toHaveAttribute('data-card-state', 'focused');
    await expect(sourceCard).toHaveAttribute('data-card-state', 'normal');
    await expect(nextEnterableCard).toHaveAttribute('data-card-state', 'expanded');

    // Reverse: Shift+Tab from the next enterable trigger also skips the unavailable card and
    // returns focus to the source card, which re-expands.
    await page.keyboard.press('Shift+Tab');
    await expect(sourceTrigger).toBeFocused();
    await expect(unavailableTrigger).not.toBeFocused();
    await expect(sourceCard).toHaveAttribute('data-card-state', 'expanded');
    await expect(nextEnterableCard).toHaveAttribute('data-card-state', 'normal');
  });

  test('@smoke assertion:B5-keyboard-sequential neutral landing keyboard edges are preserved alongside the unavailable skip', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    // req-landing §7.6: first forward Tab enters the FIRST enterable card (not the unavailable one),
    // and Shift+Tab from that first card returns to the last GNB control. The unavailable-skip
    // helper must not alter this GNB-return branch.
    await page.locator('body').click({position: {x: 1, y: 1}});
    await page.keyboard.press('Tab');
    const firstCard = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    await expect(firstCard.getByTestId('landing-grid-card-trigger')).toBeFocused();
    await expect(firstCard).toHaveAttribute('data-card-state', 'expanded');

    await page.keyboard.press('Shift+Tab');
    await expect(page.getByTestId('gnb-settings-trigger')).toBeFocused();
  });

  test('@smoke desktop short expanded overlay keeps the root shell transparent while the surface settles content-fit', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const firstCard = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
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

  test('@smoke desktop title split and resting floor stay stable through opening handoff closing and cleanup', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');
    await waitForLandingInteractionRamp(page);

    const firstCard = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    const secondCard = page.locator('[data-card-variant="rhythm-b"]');

    for (const card of [firstCard, secondCard]) {
      await card.evaluate((element) => {
        const state = window as Window & {
          __wave10ScaleLifecycleSamples?: Array<{variant: string; phase: string; title: string; floor: string}>;
          __wave10ScaleLifecycleObservers?: MutationObserver[];
        };
        state.__wave10ScaleLifecycleSamples ??= [];
        state.__wave10ScaleLifecycleObservers ??= [];
        const observer = new MutationObserver(() => {
          state.__wave10ScaleLifecycleSamples?.push({
            variant: element.getAttribute('data-card-variant') ?? '',
            phase: element.getAttribute('data-desktop-shell-phase') ?? '',
            title: element.querySelector('[data-slot="cardTitleExpanded"]')?.textContent ?? '',
            floor: element.querySelector<HTMLElement>('[data-slot="expandedBody"]')?.style.minHeight ?? ''
          });
        });
        observer.observe(element, {attributes: true, attributeFilter: ['data-desktop-shell-phase']});
        state.__wave10ScaleLifecycleObservers.push(observer);
      });
    }

    await firstCard.hover();
    await expect(firstCard).toHaveAttribute('data-desktop-shell-phase', 'steady');
    await expect(firstCard).toHaveAttribute('data-expanded-resting-floor', /[1-9]\d*(?:\.\d+)?/u);
    const firstBaseline = await firstCard.evaluate((element) => ({
      title: element.querySelector('[data-slot="cardTitleExpanded"]')?.textContent ?? '',
      floor: element.querySelector<HTMLElement>('[data-slot="expandedBody"]')?.style.minHeight ?? ''
    }));

    await secondCard.hover();
    await expect(firstCard).toHaveAttribute('data-desktop-shell-phase', 'handoff-source');
    await expect(secondCard).toHaveAttribute('data-desktop-shell-phase', 'handoff-target');
    await expect(secondCard).toHaveAttribute('data-desktop-shell-phase', 'steady');
    await expect(secondCard).toHaveAttribute('data-expanded-resting-floor', /[1-9]\d*(?:\.\d+)?/u);
    const secondBaseline = await secondCard.evaluate((element) => ({
      title: element.querySelector('[data-slot="cardTitleExpanded"]')?.textContent ?? '',
      floor: element.querySelector<HTMLElement>('[data-slot="expandedBody"]')?.style.minHeight ?? ''
    }));

    await page.mouse.move(1, 1);
    await expect(secondCard).toHaveAttribute('data-desktop-shell-phase', 'idle');

    const samples = await page.evaluate(
      () =>
        (window as Window & {
          __wave10ScaleLifecycleSamples?: Array<{variant: string; phase: string; title: string; floor: string}>;
        }).__wave10ScaleLifecycleSamples ?? []
    );
    const baselines = new Map([
      [PRIMARY_AVAILABLE_TEST_VARIANT, firstBaseline],
      ['rhythm-b', secondBaseline]
    ]);
    for (const sample of samples.filter((entry) => entry.title.length > 0)) {
      expect(sample.title).toBe(baselines.get(sample.variant)?.title);
      expect(sample.floor).toBe(baselines.get(sample.variant)?.floor);
    }
    const phases = new Set(samples.map((sample) => sample.phase));
    for (const phase of ['opening', 'steady', 'handoff-source', 'handoff-target', 'closing', 'cleanup-pending', 'idle']) {
      expect(phases.has(phase)).toBe(true);
    }
    await page.evaluate(() => {
      const observers = (
        window as Window & {
          __wave10ScaleLifecycleObservers?: MutationObserver[];
        }
      ).__wave10ScaleLifecycleObservers;
      observers?.forEach((observer) => observer.disconnect());
    });
  });

  test('@smoke expanded keyboard focus boundary follows the visible overlay shell', async ({page}, testInfo) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    await page.locator('body').click({position: {x: 1, y: 1}});
    await tabUntilCardFocused(page, PRIMARY_AVAILABLE_TEST_VARIANT);

    const firstCard = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    await expect(firstCard).toHaveAttribute('data-card-state', 'expanded');
    await expect(firstCard).toHaveAttribute('data-desktop-motion-role', 'steady');
    await expect(firstCard.getByTestId('landing-grid-card-trigger')).toBeFocused();
    await expectLocatorToMatchLocalSnapshot(firstCard, 'expanded-focus-shell.png', testInfo);
  });

  test('@smoke assertion:B5-mobile-keyboard-handoff mobile keyboard CTA traversal collapses the previous expanded card before focusing the next trigger', async ({
    page
  }) => {
    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/en');

    await page.locator('body').click({position: {x: 1, y: 1}});
    await tabUntilCardFocused(page, PRIMARY_AVAILABLE_TEST_VARIANT);

    const firstCard = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    const secondCard = page.locator('[data-card-variant="rhythm-b"]');
    const secondTrigger = secondCard.getByTestId('landing-grid-card-trigger');

    await page.keyboard.press('Space');
    await expect(firstCard).toHaveAttribute('data-mobile-phase', 'OPEN');
    await expect(firstCard).toHaveAttribute('data-card-state', 'expanded');

    await page.keyboard.press('Tab');
    await expect(firstCard.locator('[data-slot="mobileClose"]:focus')).toHaveCount(1);

    await page.keyboard.press('Tab');
    await expect(
      page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"] [data-slot="answerChoiceA"]:focus`)
    ).toHaveCount(1);

    await page.keyboard.press('Tab');
    await expect(
      page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"] [data-slot="answerChoiceB"]:focus`)
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

  test('@smoke Mobile full subtitle pre-open height matches OPENING CLOSING snapshot and final NORMAL restore under normal and reduced-motion', async ({
    page
  }) => {
    const rootMinimums: string[] = [];

    for (const reducedMotion of [false, true]) {
      await page.emulateMedia({reducedMotion: reducedMotion ? 'reduce' : 'no-preference'});
      await page.setViewportSize({width: 390, height: 844});
      await page.goto('/en');

      const card = page.locator('[data-card-variant="rhythm-b"]');
      await expect(card).toHaveAttribute('data-mobile-phase', 'NORMAL');
      await expect(card).toHaveAttribute('data-natural-height', /[1-9]\d*(?:\.\d+)?/);

      const preOpen = await card.evaluate((element) => {
        const subtitle = element.querySelector<HTMLElement>('[data-slot="cardSubtitle"]');
        if (!subtitle) {
          throw new Error('Expected Mobile Normal subtitle before opening.');
        }

        const style = getComputedStyle(subtitle);
        const rootRect = element.getBoundingClientRect();
        const trigger = element.querySelector<HTMLElement>('[data-slot="primaryTrigger"]');
        const triggerRect = trigger?.getBoundingClientRect();
        return {
          cardHeight: rootRect.height,
          rootMinHeight: getComputedStyle(element).minHeight,
          subtitleHeight: subtitle.getBoundingClientRect().height,
          lineHeight: Number.parseFloat(style.lineHeight),
          lineClamp: style.getPropertyValue('-webkit-line-clamp').trim(),
          triggerHeight: triggerRect?.height ?? 0,
          triggerTopDelta: (triggerRect?.top ?? 0) - rootRect.top,
          triggerBottomDelta: (triggerRect?.bottom ?? 0) - rootRect.bottom
        };
      });

      rootMinimums.push(preOpen.rootMinHeight);
      expect(preOpen.lineClamp).toBe('none');
      expect(preOpen.subtitleHeight).toBeGreaterThan(preOpen.lineHeight * 2);
      expect(preOpen.triggerHeight).toBeGreaterThanOrEqual(44);
      expect(Math.abs(preOpen.triggerTopDelta)).toBeLessThanOrEqual(1);
      expect(Math.abs(preOpen.triggerBottomDelta)).toBeLessThanOrEqual(1);

      await card.getByTestId('landing-grid-card-trigger').click();
      await expect(card).toHaveAttribute('data-mobile-phase', 'OPENING');
      const openingSnapshotHeight = Number(await card.getAttribute('data-mobile-snapshot-height'));
      expect(Math.abs(openingSnapshotHeight - preOpen.cardHeight)).toBeLessThanOrEqual(1);
      const openingHeight = await card.evaluate((element) => element.getBoundingClientRect().height);
      expect(Math.abs(openingHeight - preOpen.cardHeight)).toBeLessThanOrEqual(2);

      await expect(card).toHaveAttribute('data-mobile-phase', 'OPEN');
      const answerChoiceHeight = await card
        .locator('[data-slot="answerChoiceA"]')
        .evaluate((element) => element.getBoundingClientRect().height);
      expect(answerChoiceHeight).toBeGreaterThanOrEqual(44);

      await card.locator('[data-slot="mobileClose"]').click();
      await expect(card).toHaveAttribute('data-mobile-phase', 'CLOSING');
      const closingHeight = await card.evaluate((element) => element.getBoundingClientRect().height);
      expect(Math.abs(closingHeight - preOpen.cardHeight)).toBeLessThanOrEqual(2);
      await expect(card).toHaveAttribute('data-mobile-phase', 'NORMAL');

      const restoredHeight = await card.evaluate((element) => element.getBoundingClientRect().height);
      expect(Math.abs(restoredHeight - preOpen.cardHeight)).toBeLessThanOrEqual(1);
    }

    for (const minHeight of rootMinimums) {
      expect(['auto', '0px']).toContain(minHeight);
    }
  });

  test('@smoke transition frames keep non-comp gap at zero through mobile and desktop lifecycle states', async ({
    page
  }) => {
    const expectNonCompGapZero = async () => {
      await expect
        .poll(async () =>
          page.locator('[data-testid="landing-grid-card"][data-needs-comp="false"]').evaluateAll((cards) =>
            cards.every((card) => Number(card.getAttribute('data-comp-gap') ?? '0') === 0)
          )
        )
        .toBe(true);
    };

    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/en');

    const mobileCard = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    await expect(mobileCard).toHaveAttribute('data-natural-height', /[1-9]\d*(?:\.\d+)?/);
    const settledNaturalHeight = await mobileCard.getAttribute('data-natural-height');

    await mobileCard.getByTestId('landing-grid-card-trigger').click();
    await expect(mobileCard).toHaveAttribute('data-mobile-phase', /OPENING|OPEN/);
    await expectNonCompGapZero();
    await expect(mobileCard).toHaveAttribute('data-mobile-phase', 'OPEN');
    await expect(mobileCard).toHaveAttribute('data-natural-height', settledNaturalHeight ?? '');
    await expectNonCompGapZero();

    await mobileCard.locator('[data-slot="mobileClose"]').click();
    await expect(mobileCard).toHaveAttribute('data-mobile-phase', /CLOSING|NORMAL/);
    await expectNonCompGapZero();
    await expect(mobileCard).toHaveAttribute('data-mobile-phase', 'NORMAL');
    await expect(mobileCard).toHaveAttribute('data-natural-height', settledNaturalHeight ?? '');

    await page.setViewportSize({width: 1440, height: 980});
    await page.reload();

    const firstCard = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    const secondCard = page.locator('[data-card-variant="rhythm-b"]');
    await expect(firstCard).toHaveAttribute('data-interaction-mode', 'hover');
    await expect(firstCard).toHaveAttribute('data-natural-height', /[1-9]\d*/);
    await waitForLandingInteractionRamp(page);

    await page.mouse.move(1, 1);
    await firstCard.getByTestId('landing-grid-card-trigger').hover();
    await expect(firstCard).toHaveAttribute('data-desktop-motion-role', /opening|steady/);
    await expectNonCompGapZero();
    await expect(firstCard).toHaveAttribute('data-desktop-motion-role', 'steady');
    await expectNonCompGapZero();

    await secondCard.hover();
    await expect(firstCard).toHaveAttribute('data-desktop-shell-phase', 'handoff-source');
    await expect(secondCard).toHaveAttribute('data-desktop-shell-phase', 'handoff-target');
    await expectNonCompGapZero();

    await page.mouse.move(1, 1);
    await expect(secondCard).toHaveAttribute('data-desktop-motion-role', /closing|idle/);
    await expectNonCompGapZero();
    await expect(secondCard).toHaveAttribute('data-desktop-shell-phase', 'idle');
    await expectNonCompGapZero();
  });

  test('@smoke reduced-motion / low-spec fallback shrinks desktop motion and rapid interactions stay error-free', async ({page}) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    const isIgnorableConsoleError = (text: string) =>
      text === 'Failed to load resource: the server responded with a status of 404 (Not Found)';
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });
    page.on('console', (message) => {
      if (message.type() === 'error' && !isIgnorableConsoleError(message.text())) {
        consoleErrors.push(message.text());
      }
    });

    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const shell = page.getByTestId('landing-grid-shell');
    const firstCard = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    const secondCard = page.locator('[data-card-variant="rhythm-b"]');
    const lowerRowCard = page.locator('[data-card-variant="egtt"]');
    const unavailableCard = page.locator('[data-card-variant="creativity-profile"]');

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
    const firstCard = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);

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

    const availableTestCard = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    const availableBlogCard = page.locator('[data-card-variant="ops-handbook"]');
    const unavailableCard = page.locator('[data-card-variant="creativity-profile"]');

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
    await expect(availableBlogCard).toHaveAttribute('data-card-state', 'normal');
    const blogTriggerCursor = await availableBlogCard
      .getByTestId('landing-grid-card-trigger')
      .evaluate((element) => getComputedStyle(element).cursor);
    expect(blogTriggerCursor).toBe('pointer');
    await expect(availableBlogCard.locator('[data-slot="primaryCTA"]')).toHaveCount(0);
  });

  test('@smoke hovering from an expanded test card to a blog card collapses test without expanding blog', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const testCard = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    const blogCard = page.locator(`[data-card-variant="${PRIMARY_BLOG_VARIANT}"]`);

    await movePointerToCenter(page, testCard.getByTestId('landing-grid-card-trigger'));
    await expect(testCard).toHaveAttribute('data-card-state', 'expanded');
    await expect(testCard).toHaveAttribute('data-desktop-motion-role', 'steady');

    await movePointerToCenter(page, blogCard.getByTestId('landing-grid-card-trigger'));
    // The test card must run the standard close motion (req-landing §8.3), not a 0ms snap —
    // hovering onto a non-expanding blog card is a plain collapse, never a handoff source.
    await expect(testCard).toHaveAttribute('data-desktop-motion-role', 'closing');
    await expect(testCard).toHaveAttribute('data-card-state', 'normal');
    await expect(blogCard).toHaveAttribute('data-card-state', 'normal');
    await expect(blogCard).toHaveAttribute('data-desktop-motion-role', 'idle');
    await expect(blogCard.locator('[data-slot="expandedShell"]')).toHaveCount(0);
    await expect(blogCard.locator('[data-slot="expandedBody"]')).toHaveCount(0);
    await expect(blogCard.locator('[data-slot="primaryCTA"]')).toHaveCount(0);
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
      await expandLandingCardViaTrigger(page, testCard);
      await expect(testCard).toHaveAttribute('data-desktop-motion-role', 'steady');

      const hoverExitTarget = testCard.locator('[data-slot="cardTitleExpanded"]');
      await movePointerToCenter(page, hoverExitTarget);
      const answerChoice = testCard.locator('[data-slot="answerChoiceA"]');
      // Let any expand-time hover on the choice settle back to rest before sampling the baseline
      // (the choice skin transitions border/background over 140ms).
      await page.waitForTimeout(180);
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
      // Wave 5 skin: the choice hover affordance is a border + continuous background change only;
      // the box-shadow handoff was removed, so hover keeps box-shadow 'none' rather than changing it.
      expect(afterHover.boxShadow).toBe(beforeHover.boxShadow);
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
      expect(settledHoverOut?.backgroundAlpha).toBeGreaterThan(0);
      expect(settledHoverOut?.borderColor).not.toBe('transparent');
    });
  }
});
