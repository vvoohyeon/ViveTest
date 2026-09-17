import {expect, type Locator, type Page, test} from '@playwright/test';

import {seedTelemetryConsent} from './helpers/consent';
import {
  PRIMARY_AVAILABLE_TEST_VARIANT,
  PRIMARY_BLOG_VARIANT,
  buildLocalizedPrimaryTestRoute
} from './helpers/landing-fixture';
import {setHoverCapableViewport, setTouchViewport} from './helpers/touch-context';

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

    // `--canvas` 는 `var(--warm-50)` 을 가리키는 참조라 `getPropertyValue` 로는 계산된 색이
    // 나오지 않는다. 임시 원소에 얹어 되읽어야 body 의 계산값과 같은 형식으로 비교된다.
    const tokenProbe = document.createElement('div');
    tokenProbe.style.backgroundColor = 'var(--canvas)';
    document.body.appendChild(tokenProbe);
    const canvasToken = getComputedStyle(tokenProbe).backgroundColor;
    tokenProbe.remove();

    return {
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
      rootClientWidth: document.documentElement.clientWidth,
      bodyClientWidth: document.body.clientWidth,
      bodyBackgroundColor: bodyStyle.backgroundColor,
      bodyBackgroundImage: bodyStyle.backgroundImage,
      canvasToken
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

const SCROLL_HOLD_VIEWPORT = {width: 1280, height: 720} as const;
const SCROLL_HOLD_WHEEL_DELTA_PX = 180;
const SCROLL_HOLD_SETTLE_MS = 420;
const SCROLL_HOLD_CARD_ANCHOR_TOP_PX = 460;
const SCROLL_HOLD_POINTER_INSET_PX = 40;
const SCROLL_HOLD_VIEWPORT_INSET_PX = 8;

/**
 * 확장했을 때 뷰포트 아래로 넘어가는 카드를 고른다. 그 상태가 곧 「더 보려면 스크롤해야
 * 한다」이며 BQ-39 의 전제다 — 넘지 않는다면 이 검사는 아무것도 재현하지 못하므로 단언으로
 * 붙들어 조용히 초록이 되지 않게 한다.
 */
/**
 * BQ-39 의 전제 기하를 구성한다: 확장 본문이 뷰포트 아래로 넘어가고, 포인터는 그 본문의
 * **아래쪽 가장자리 근처**에 놓인다. 그 상태에서만 휠 한 번이 카드를 포인터 밑에서 빼내
 * `mouseout` 을 만든다 — 실측한 결함 조건이 바로 이것이다. 전제가 하나라도 무너지면 이
 * 검사는 아무것도 재현하지 못하므로 전부 단언으로 붙들어 조용히 초록이 되지 않게 한다.
 */
async function expandCardAcrossTheFold(page: Page): Promise<Locator> {
  await page.setViewportSize({width: SCROLL_HOLD_VIEWPORT.width, height: SCROLL_HOLD_VIEWPORT.height});
  await page.goto('/en');
  await waitForLandingInteractionRamp(page);

  const target = await page.evaluate(
    ([selector, anchorTop]) => {
      const cards = Array.from(document.querySelectorAll<HTMLElement>(selector));
      const last = cards.at(-1);
      if (!last) {
        return null;
      }

      const documentTop = last.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, Math.max(0, documentTop - anchorTop));
      return last.dataset.cardVariant ?? null;
    },
    [AVAILABLE_TEST_CARD_SELECTOR, SCROLL_HOLD_CARD_ANCHOR_TOP_PX] as const
  );
  expect(target).not.toBeNull();

  const card = page.locator(`[data-testid="landing-grid-card"][data-card-variant="${target}"]`);
  await expandLandingCardViaTrigger(page, card);
  await expect(card).toHaveAttribute('data-desktop-shell-phase', 'steady');

  const geometry = await card.evaluate((element) => {
    const body = element.querySelector('[data-slot="expandedBody"]');
    if (!body) {
      throw new Error('Expected an expanded body to measure the interaction boundary.');
    }

    const rect = body.getBoundingClientRect();
    return {
      top: rect.top,
      bottom: rect.bottom,
      centerX: rect.left + rect.width / 2,
      viewportHeight: window.innerHeight,
      scrollRoom: document.documentElement.scrollHeight - window.innerHeight - window.scrollY
    };
  });

  // 확장 본문이 뷰포트 아래로 넘어간다 — 「더 보려면 스크롤해야 하는」 상태.
  expect(geometry.bottom).toBeGreaterThan(geometry.viewportHeight);
  // 굴릴 여지가 실제로 있다.
  expect(geometry.scrollRoom).toBeGreaterThanOrEqual(SCROLL_HOLD_WHEEL_DELTA_PX);

  const pointerY = Math.min(
    geometry.bottom - SCROLL_HOLD_POINTER_INSET_PX,
    geometry.viewportHeight - SCROLL_HOLD_VIEWPORT_INSET_PX
  );
  // 포인터는 경계 **안**에 있고, 휠 180px 이면 카드가 그 밑에서 빠져나간다.
  expect(pointerY).toBeGreaterThan(geometry.top);
  expect(geometry.bottom - pointerY).toBeLessThan(SCROLL_HOLD_WHEEL_DELTA_PX);

  await page.mouse.move(geometry.centerX, pointerY);
  await page.waitForTimeout(SCROLL_HOLD_SETTLE_MS);
  await expect(card).toHaveAttribute('data-card-state', 'expanded');
  await expect(card).toHaveAttribute('data-desktop-shell-phase', 'steady');

  return card;
}

async function beginDesktopShellPhaseLog(page: Page, card: Locator) {
  await card.evaluate((element) => {
    const state = window as Window & {
      __bq39PhaseLog?: {phases: string[]; observer: MutationObserver};
    };
    state.__bq39PhaseLog?.observer.disconnect();

    const phases: string[] = [element.getAttribute('data-desktop-shell-phase') ?? ''];
    const observer = new MutationObserver(() => {
      phases.push(element.getAttribute('data-desktop-shell-phase') ?? '');
    });
    observer.observe(element, {attributes: true, attributeFilter: ['data-desktop-shell-phase']});
    state.__bq39PhaseLog = {phases, observer};
  });
}

async function readDesktopShellPhaseLog(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const state = window as Window & {
      __bq39PhaseLog?: {phases: string[]; observer: MutationObserver};
    };
    return state.__bq39PhaseLog?.phases ?? [];
  });
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
    // 4 단계 theme cut 이 teal/blue radial wash 두 겹을 걷어냈다(`src/app/app-body-class.ts`).
    // 바닥은 이제 `--canvas` 한 겹이며, 검사의 이름이 말하는 「body-owned background」가 그것이다.
    expect(metrics.bodyBackgroundColor).toBe(metrics.canvasToken);
    expect(metrics.bodyBackgroundImage).toBe('none');
  });

  test('@smoke capability gate keeps tap on mobile and hover on desktop-capable environments', async ({page}) => {
    await setTouchViewport(page, {width: 390, height: 844});
    await page.goto('/en');
    await expect(page.getByTestId('landing-grid-card').first()).toHaveAttribute('data-interaction-mode', 'tap');

    await setHoverCapableViewport(page, {width: 1440, height: 980});
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

    // 제자리 오버레이의 **마지막 탭 스톱은 시각적으로 숨긴 닫기**다(명세 규칙 3) — 보조기술은
    // 「빈 곳」을 탭할 수 없으므로 그 자리가 필요하다. 다음 카드로 가는 길은 한 걸음 늘었다.
    await page.keyboard.press('Tab');
    await expect(firstCard.locator('[data-slot="overlayHiddenClose"]:focus')).toHaveCount(1);

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

    // 마지막 탭 스톱은 시각적으로 숨긴 닫기다(명세 규칙 3).
    await page.keyboard.press('Tab');
    await expect(
      page.locator('[data-card-variant="energy-check"] [data-slot="overlayHiddenClose"]:focus')
    ).toHaveCount(1);

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

    // req-landing §7.6 개정: 탭 순서는 문서 순서다. 종전 주석이 인용한 「첫 forward Tab 이 첫
    // enterable 카드로 진입」·「그 카드에서 Shift+Tab 이 마지막 GNB control 로 복귀」는 skip
    // link 로 교체되면서 계약이 아니게 됐다. **이 케이스가 재는 것은 그것이 아니라** unavailable
    // 카드를 건너뛰는 것과, 도달한 카드가 dwell 없이 확장되는 것(§7.6-a)이다.
    const firstCard = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    const firstCardTrigger = firstCard.getByTestId('landing-grid-card-trigger');

    for (let attempt = 0; attempt < 40; attempt += 1) {
      await page.keyboard.press('Tab');
      if (await firstCardTrigger.evaluate((element) => element === document.activeElement).catch(() => false)) {
        break;
      }
    }

    await expect(firstCardTrigger).toBeFocused();
    await expect(firstCard).toHaveAttribute('data-card-state', 'expanded');

    // 역방향은 문서 순서 그대로 GNB 의 마지막 컨트롤로 돌아간다 — 특별 처리가 아니라 기본 동작이다.
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

  test('@smoke expanded keyboard focus boundary follows the visible overlay shell', async ({page}) => {
    // **이 검사는 기하로 잰다 — 픽셀이 아니라.**
    //
    // 종전에는 카드 상자를 그대로 스크린샷으로 비교했다. 그 상자는 **내용이 크기를 정하므로**
    // 폰트 메트릭이 조금 다른 기계에서 398×293 대 395×292 로 갈렸고, 그래서 두 기계 중 한쪽은
    // 언제나 붉었다(나머지 169 장은 뷰포트라는 고정 크기 영역을 찍어 기계와 무관하다). 상시
    // 붉음은 진짜 회귀를 가린다.
    //
    // 이 검사가 실제로 주장하는 것은 **포커스 경계가 접힌 카드가 아니라 보이는 오버레이 셸을
    // 따른다**는 것이고, 그것은 두 사각형의 좌표로 정확히 잴 수 있다. 픽셀은 그 주장보다 넓은
    // 것을 재고 있었고, 그 초과분이 기계 종속의 원인이었다.
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    await page.locator('body').click({position: {x: 1, y: 1}});
    await tabUntilCardFocused(page, PRIMARY_AVAILABLE_TEST_VARIANT);

    const firstCard = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    await expect(firstCard).toHaveAttribute('data-card-state', 'expanded');
    await expect(firstCard).toHaveAttribute('data-desktop-motion-role', 'steady');
    await expect(firstCard.getByTestId('landing-grid-card-trigger')).toBeFocused();

    const focus = await firstCard.evaluate((root) => {
      const surface = root.querySelector('[data-slot="expandedSurface"]');
      if (!(surface instanceof HTMLElement)) {
        return null;
      }

      const readOutline = (element: HTMLElement) => {
        const style = window.getComputedStyle(element);
        return {
          style: style.outlineStyle,
          width: style.outlineWidth,
          color: style.outlineColor
        };
      };

      const rootRect = root.getBoundingClientRect();
      const surfaceRect = surface.getBoundingClientRect();
      const focusRingToken = window
        .getComputedStyle(root)
        .getPropertyValue('--normal-focus-ring')
        .trim();
      const probe = document.createElement('span');
      probe.style.color = focusRingToken;
      document.body.appendChild(probe);
      const resolvedFocusRing = window.getComputedStyle(probe).color;
      probe.remove();

      return {
        surfaceOutline: readOutline(surface),
        rootOutline: readOutline(root as HTMLElement),
        resolvedFocusRing,
        rootWidth: Math.round(rootRect.width),
        surfaceWidth: Math.round(surfaceRect.width),
        // 확장 셸은 접힌 카드보다 **가로로** 넓다(실측 434 대 395 — `--landing-card-shell-inline-scale`).
        // 높이는 같으므로 세로로 재면 두 상자를 구분하지 못한다.
        surfaceIsWiderThanRoot: surfaceRect.width > rootRect.width + 1
      };
    });

    expect(focus, '확장 오버레이 셸을 찾지 못하면 아래 단언이 공허해진다').not.toBeNull();

    // ⑴ 포커스 링은 **오버레이 셸**이 진다.
    expect(focus?.surfaceOutline.style).toBe('solid');
    expect(focus?.surfaceOutline.width).toBe('2px');
    expect(focus?.surfaceOutline.color).toBe(focus?.resolvedFocusRing);

    // ⑵ 접힌 카드의 root 는 링을 지지 않는다 — 두 링이 동시에 그려지면 경계가 둘이 된다.
    expect(focus?.rootOutline.style).toBe('none');

    // ⑶ 그 경계는 접힌 상자가 아니라 **보이는 오버레이**의 것이다. 확장 셸은 접힌 카드보다
    //    가로로 넓으므로, 둘이 같다면 링이 엉뚱한 상자를 따르고 있다는 뜻이다.
    expect(focus?.surfaceIsWiderThanRoot).toBe(true);
  });

  test('@smoke assertion:B5-mobile-keyboard-handoff mobile keyboard CTA traversal collapses the previous expanded card before focusing the next trigger', async ({
    page
  }) => {
    await setTouchViewport(page, {width: 390, height: 844});
    await page.goto('/en');

    await page.locator('body').click({position: {x: 1, y: 1}});
    await tabUntilCardFocused(page, PRIMARY_AVAILABLE_TEST_VARIANT);

    const firstCard = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    const secondCard = page.locator('[data-card-variant="rhythm-b"]');
    const secondTrigger = secondCard.getByTestId('landing-grid-card-trigger');

    await page.keyboard.press('Space');
    await expect(firstCard).toHaveAttribute('data-mobile-phase', 'OPEN');
    await expect(firstCard).toHaveAttribute('data-card-state', 'expanded');

    // 확장 표면이 시트로 옮겨 가면서 탭 순서도 시트 안에서 돈다 — 포커스는 열릴 때 시트
    // 컨테이너로 들어오고(첫 컨트롤이 아니다), 그 다음 Tab 이 헤더의 닫기에 닿는다.
    const sheet = page.getByTestId('landing-card-sheet');
    await page.keyboard.press('Tab');
    await expect(sheet.locator('[data-slot="mobileClose"]:focus')).toHaveCount(1);

    await page.keyboard.press('Tab');
    await expect(sheet.locator('[data-slot="answerChoiceA"]:focus')).toHaveCount(1);

    await page.keyboard.press('Tab');
    await expect(sheet.locator('[data-slot="answerChoiceB"]:focus')
    ).toHaveCount(1);

    // **여기서 Tab 은 더 이상 다음 카드로 가지 않는다.** 시트가 모달이고 그 아래 층은 배너까지
    // `inert` 이므로(설계 명세 규칙 1) Tab 은 시트 안에서 순환한다(§3-4). 다음 카드로 가는 길은
    // 사라진 것이 아니라 한 걸음 늘었다: 닫으면 포커스가 트리거로 돌아오고, 거기서 Tab 이다.
    await page.keyboard.press('Tab');
    await expect(sheet.locator('[data-slot="sheetHiddenClose"]:focus')).toHaveCount(1);
    await page.keyboard.press('Tab');
    await expect(sheet.locator('[data-slot="mobileClose"]:focus')).toHaveCount(1);

    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
    await expect(firstCard).toHaveAttribute('data-mobile-phase', 'NORMAL');
    // 닫히면 포커스가 트리거로 돌아오므로 카드는 `normal` 이 아니라 `focused` 다(명세 §3-4).
    await expect(firstCard.getByTestId('landing-grid-card-trigger')).toBeFocused();
    await expect(firstCard).toHaveAttribute('data-card-state', 'focused');

    await page.keyboard.press('Tab');
    await expect(secondTrigger).toBeFocused();
    await expect(secondCard).toHaveAttribute('data-card-state', 'focused');

    await page.keyboard.press('Space');
    await expect(secondCard).toHaveAttribute('data-mobile-phase', 'OPEN');
    await expect(secondCard).toHaveAttribute('data-card-state', 'expanded');
  });

  // 시트가 바닥에 붙어 있으므로 마지막 줄과 화면 아래 모서리 사이에 여백이 필요하다 —
  // iOS 의 홈 인디케이터가 그 자리에 있다. 종전에 그 여백은 **액션 행**에 있었고, 액션 행이
  // 없는 시트가 정확히 하나 있다: 카드 시트다(A/B 탭이 곧 진입이라 CTA 가 없다). 실측으로
  // 그 시트의 스크롤 본문 바닥과 시트 바닥의 간격이 **0px** 이었다.
  //
  // 그래서 **두 시트를 같은 조건으로** 묻는다 — 프리미티브가 하나이므로 한쪽만 재면 다음에
  // 여백이 다시 자식으로 내려가도 초록이다. `env(safe-area-inset-bottom)` 은 이 렌더러에서
  // 0 이므로 실제로 비교되는 것은 `max()` 의 다른 쪽인 24px 이다.
  test('@smoke assertion:SF-01 both sheets keep the safe-area floor below their last visible row', async ({
    page
  }) => {
    const SHEET_FLOOR_PX = 24;

    const measureFloor = () =>
      page.evaluate(() => {
        const sheet = document.querySelector<HTMLElement>('[class*="__sheet"]');

        if (!sheet) {
          throw new Error('Expected a bottom-sheet primitive on screen.');
        }

        const sheetBottom = sheet.getBoundingClientRect().bottom;
        let lowest: {bottom: number; label: string} | null = null;

        for (const element of sheet.querySelectorAll<HTMLElement>('*')) {
          const style = getComputedStyle(element);
          // 시각적으로 숨은 것은 바닥을 다투지 않는다 — 닫기 버튼의 접근성 사본이 그렇다.
          if (style.visibility === 'hidden' || style.display === 'none' || style.clipPath.startsWith('inset(50%')) {
            continue;
          }

          const rect = element.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) {
            continue;
          }

          if (!lowest || rect.bottom > lowest.bottom) {
            lowest = {bottom: rect.bottom, label: `${element.tagName}.${(element.getAttribute('class') ?? '').slice(0, 24)}`};
          }
        }

        if (!lowest) {
          throw new Error('Expected visible content inside the sheet.');
        }

        return {
          paddingBottom: Number.parseFloat(getComputedStyle(sheet).paddingBottom),
          floor: Math.round(sheetBottom - lowest.bottom),
          lowest: lowest.label
        };
      });

    await setTouchViewport(page, {width: 390, height: 844});
    await seedTelemetryConsent(page, 'OPTED_IN');

    await page.goto('/en');
    const card = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    await card.getByTestId('landing-grid-card-trigger').click();
    await expect(page.getByTestId('landing-card-sheet')).toBeVisible();
    await expect(card).toHaveAttribute('data-mobile-phase', 'OPEN');

    const cardSheet = await measureFloor();
    expect(cardSheet.paddingBottom, `card sheet padding-bottom (${cardSheet.lowest})`).toBeGreaterThanOrEqual(
      SHEET_FLOOR_PX
    );
    expect(cardSheet.floor, `card sheet floor below ${cardSheet.lowest}`).toBeGreaterThanOrEqual(SHEET_FLOOR_PX);

    await page.goto(buildLocalizedPrimaryTestRoute('en'));
    await expect(page.getByTestId('test-instruction-overlay')).toBeVisible();

    const instructionSheet = await measureFloor();
    expect(
      instructionSheet.paddingBottom,
      `instruction sheet padding-bottom (${instructionSheet.lowest})`
    ).toBeGreaterThanOrEqual(SHEET_FLOOR_PX);
    expect(
      instructionSheet.floor,
      `instruction sheet floor below ${instructionSheet.lowest}`
    ).toBeGreaterThanOrEqual(SHEET_FLOOR_PX);
  });

  test('@smoke Mobile two-line subtitle keeps the card height unchanged through the sheet lifecycle under normal and reduced-motion', async ({
    page
  }) => {
    const rootMinimums: string[] = [];

    for (const reducedMotion of [false, true]) {
      await page.emulateMedia({reducedMotion: reducedMotion ? 'reduce' : 'no-preference'});
      await setTouchViewport(page, {width: 390, height: 844});
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
      expect(preOpen.lineClamp).toBe('2');
      // `rhythm-b` 의 부제는 390px 에서 자연 3 줄이라 clamp 가 실제로 문다 — 두 줄 상자다.
      expect(Math.abs(preOpen.subtitleHeight - preOpen.lineHeight * 2)).toBeLessThanOrEqual(1);
      expect(preOpen.triggerHeight).toBeGreaterThanOrEqual(44);
      expect(Math.abs(preOpen.triggerTopDelta)).toBeLessThanOrEqual(1);
      expect(Math.abs(preOpen.triggerBottomDelta)).toBeLessThanOrEqual(1);

      // 확장이 시트가 되면서 스냅샷 계약이 폐지됐다(§8.5 재작성). 재는 성질은 같다 —
      // **카드의 높이는 확장 내내 변하지 않는다.** 종전에는 그것을 스냅샷과 대조해 확인했고,
      // 이제는 카드를 직접 재면 된다: 시트가 흐름 밖이라 밀 것이 없다.
      await card.getByTestId('landing-grid-card-trigger').click();
      await expect(card).toHaveAttribute('data-mobile-phase', /OPENING|OPEN/u);
      const openingHeight = await card.evaluate((element) => element.getBoundingClientRect().height);
      expect(Math.abs(openingHeight - preOpen.cardHeight)).toBeLessThanOrEqual(2);

      const sheet = page.getByTestId('landing-card-sheet');
      await expect(card).toHaveAttribute('data-mobile-phase', 'OPEN');
      const answerChoiceHeight = await sheet
        .locator('[data-slot="answerChoiceA"]')
        .evaluate((element) => element.getBoundingClientRect().height);
      expect(answerChoiceHeight).toBeGreaterThanOrEqual(44);

      await sheet.locator('[data-slot="mobileClose"]').click();
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

    await setTouchViewport(page, {width: 390, height: 844});
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

    await page.getByTestId('landing-card-sheet').locator('[data-slot="mobileClose"]').click();
    await expect(mobileCard).toHaveAttribute('data-mobile-phase', /CLOSING|NORMAL/);
    await expectNonCompGapZero();
    await expect(mobileCard).toHaveAttribute('data-mobile-phase', 'NORMAL');
    await expect(mobileCard).toHaveAttribute('data-natural-height', settledNaturalHeight ?? '');

    await setHoverCapableViewport(page, {width: 1440, height: 980});
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
    /**
     * 단계 노출을 **전부** 쓸어 잰다. 종전에는 `answerChoices` 한 자리만 봤는데, stagger 는
     * 자리마다 따로 적히므로(`40/100/160ms`) 한 자리만 보면 나머지가 조용히 남는다.
     * `animationName` 만으로도 부족하다 — 지연은 `animation-delay` 라는 별도 longhand 이고
     * `animation` shorthand 가 그것을 되돌린다는 사실 자체가 검사 대상이다.
     */
    const motionStages = await firstCard.locator('[data-motion-slot]').evaluateAll((elements) =>
      elements.map((element) => {
        const stageStyle = getComputedStyle(element);

        return {
          slot: element.getAttribute('data-motion-slot'),
          animationName: stageStyle.animationName,
          animationDelay: stageStyle.animationDelay,
          transform: stageStyle.transform
        };
      })
    );

    expect(['opening', 'steady']).toContain(desktopMotionRole);
    expect(
      expandedShellAnimation === 'none' || expandedShellAnimation.includes('landing-card-shell-reduced-open')
    ).toBe(true);
    expect(expandedShellTransform).toBe('none');

    // 전제 단언: 잴 자리가 실제로 있어야 이 검사가 무언가를 재현한다.
    expect(motionStages.length).toBeGreaterThan(0);
    for (const stage of motionStages) {
      expect(stage.animationName, `motion slot ${stage.slot} still animates`).toBe('none');
      expect(stage.animationDelay, `motion slot ${stage.slot} still staggers`).toBe('0s');
      expect(stage.transform, `motion slot ${stage.slot} still moves`).toBe('none');
    }

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

  /**
   * BQ-39 (R1) — 스크롤은 확장을 닫지 않는다.
   *
   * 1280×720 에서 아래 행 카드를 확장하면 카드가 뷰포트를 넘고, 그 아랫부분을 읽으려는 휠
   * 조작이 카드를 포인터 밑에서 빼낸다. 수정 전에는 그 `mouseout` 이 경계 이탈로 판정돼
   * 180px 만에 `closing → idle` 로 닫혔다 — 포인터는 1px 도 움직이지 않았는데.
   *
   * 이 두 검사는 시점 경쟁이 아니라 **입력 종류**(휠이냐 실제 포인터 이동이냐)로 갈리므로
   * 결정론적이다.
   */
  test('@smoke assertion:BQ-39-scroll-hold wheel scrolling keeps a below-the-fold expanded card open without a pointer move', async ({
    page
  }) => {
    const card = await expandCardAcrossTheFold(page);

    await beginDesktopShellPhaseLog(page, card);
    await page.mouse.wheel(0, SCROLL_HOLD_WHEEL_DELTA_PX);
    await page.waitForTimeout(SCROLL_HOLD_SETTLE_MS);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    // 휠만 굴리는 동안 카드는 한 번도 닫힘 경로에 들어가지 않는다.
    expect(normalizeAdjacent(await readDesktopShellPhaseLog(page))).toEqual(['steady']);
    await expect(card).toHaveAttribute('data-card-state', 'expanded');
    await expect(card).toHaveAttribute('data-desktop-shell-phase', 'steady');
  });

  test('@smoke assertion:BQ-39-scroll-hold a real pointer move after the wheel scroll still closes the held card', async ({
    page
  }) => {
    const card = await expandCardAcrossTheFold(page);

    await page.mouse.wheel(0, SCROLL_HOLD_WHEEL_DELTA_PX);
    await page.waitForTimeout(SCROLL_HOLD_SETTLE_MS);
    await expect(card).toHaveAttribute('data-card-state', 'expanded');

    // 사용자가 실제로 얻는 것은 「스크롤해 읽고 나서 치우면 정상적으로 닫힌다」이다.
    await beginDesktopShellPhaseLog(page, card);
    await page.mouse.move(8, 8);
    await expect(card).toHaveAttribute('data-card-state', 'normal');
    await expect(card).toHaveAttribute('data-desktop-shell-phase', 'idle');

    const phases = normalizeAdjacent(await readDesktopShellPhaseLog(page));
    expect(phases[0]).toBe('steady');
    expect(phases).toContain('closing');
    expect(phases.at(-1)).toBe('idle');
    expect(phases).not.toContain('handoff-source');
  });

  /**
   * BQ-39 (R1) — 스크롤은 `mouseout` 만 위조하지 않는다. 같은 프레임에 **다른 카드의
   * `mouseover`** 도 위조하고, 그 카드가 unavailable/blog 면 `onMouseEnter` 가 유예 없이 즉시
   * 닫는다 — 유예 기반 hold 로는 닿지 않는 경로다. 실측(chromium): 포인터가 `218,431` 에 고정된
   * 채 `scrollY` 가 `0 → 372` 로 뛰자 `mouseout(qmbti → creativity-profile)` 과
   * `mouseover(creativity-profile ← qmbti)` 가 좌표 변화 없이 같은 시각에 났다.
   *
   * 여기서는 포인터를 고정한 채 **프로그램적으로** 스크롤해 그 조건을 결정론적으로 만든다.
   */
  test('@smoke assertion:BQ-39-scroll-hold scrolling another card under a stationary pointer never collapses the expanded card', async ({
    page
  }) => {
    await page.setViewportSize({width: SCROLL_HOLD_VIEWPORT.width, height: SCROLL_HOLD_VIEWPORT.height});
    await page.goto('/en');
    await waitForLandingInteractionRamp(page);

    const card = getPrimaryAvailableTestCard(page);
    const trigger = card.getByTestId('landing-grid-card-trigger');
    const box = await trigger.boundingBox();
    expect(box).not.toBeNull();
    const pointer = {x: box!.x + box!.width / 2, y: box!.y + box!.height / 2};

    await page.mouse.move(pointer.x, pointer.y);
    await expect(card).toHaveAttribute('data-card-state', 'expanded');
    await expect(card).toHaveAttribute('data-desktop-shell-phase', 'steady');
    const expandedVariant = await card.getAttribute('data-card-variant');

    // 포인터를 1px 도 움직이지 않고, 다른 카드가 그 좌표 밑으로 오도록 스크롤량을 계산한다.
    const plan = await page.evaluate(
      ([point, selfVariant]) => {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="landing-grid-card"]'));
        for (const element of cards) {
          const variant = element.dataset.cardVariant ?? '';
          if (variant === selfVariant) {
            continue;
          }

          const rect = element.getBoundingClientRect();
          if (point.x < rect.left || point.x > rect.right) {
            continue;
          }

          const docTop = rect.top + window.scrollY;
          const docBottom = rect.bottom + window.scrollY;
          const scrollY = Math.round(Math.min(Math.max(docTop - point.y + 20, 0), Math.max(docBottom - point.y - 20, 0)));
          if (scrollY <= 0 || scrollY > maxScroll) {
            continue;
          }

          return {variant, scrollY, maxScroll};
        }

        return null;
      },
      [pointer, expandedVariant] as const
    );
    expect(plan).not.toBeNull();

    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), plan!.scrollY);
    await page.waitForTimeout(SCROLL_HOLD_SETTLE_MS);

    // 전제: 고정된 좌표 밑에 이제 **다른 카드**가 있다.
    const variantUnderPointer = await page.evaluate(
      (point) =>
        (document.elementFromPoint(point.x, point.y) as HTMLElement | null)
          ?.closest('[data-card-variant]')
          ?.getAttribute('data-card-variant') ?? null,
      pointer
    );
    expect(variantUnderPointer).toBe(plan!.variant);

    // 그래도 확장 카드는 열린 채다 — 포인터가 움직이지 않았기 때문이다.
    await expect(card).toHaveAttribute('data-card-state', 'expanded');
    await expect(card).toHaveAttribute('data-desktop-shell-phase', 'steady');
  });
  test('@smoke assertion:TT-02 hover-less tablet keeps the in-place overlay but gains a backdrop and outside-tap close', async ({
    page
  }) => {
    // 분석 §2-5 의 두 번째 행이 이 케이스다 — 900×1200 터치는 `tap` 모드로 정확히 판정되면서도
    // 「닫기 어포던스가 하나도 없는 데스크톱 오버레이」를 받았다. 열리기는 하는데 닫을 수단이
    // 없었다.
    //
    // **형태는 그대로 두는 것이 맞다**(명세 규칙 3 · §2-11) — 다 열 레이아웃의 확장은 제자리
    // 오버레이이고 위치를 옮기지 않는다. 입력이 정하는 것은 **닫는 법** 하나다.
    await setTouchViewport(page, {width: 900, height: 1200});
    await page.goto('/en');

    const card = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    await card.getByTestId('landing-grid-card-trigger').click();
    await expect(card).toHaveAttribute('data-card-state', 'expanded');

    // ⑴ 형태는 제자리 오버레이 그대로다 — 시트로 바뀌지 않는다.
    await expect(card).toHaveAttribute('data-expanded-layer', 'desktop-overlay');

    // ⑵ hover 가 없으므로 dim backdrop 이 깔린다.
    const backdrop = page.getByTestId('landing-grid-mobile-backdrop');
    await expect(backdrop).toBeVisible();

    // ⑶ 빈 곳 탭이 닫기다. 좌표는 GNB 아래로 잡는다 — GNB 는 backdrop 보다 위 층이라
    // 최상단 띠에서는 backdrop 이 top element 가 아니다(명세 규칙 1 의 층 순서는 step 3 소관).
    await backdrop.click({position: {x: 5, y: 300}});
    await expect(card).not.toHaveAttribute('data-card-state', 'expanded');
  });

  // 아래 둘은 한 결정의 두 면이다(BQ-44). 회전은 확장을 닫지 않고, 다 열 레이아웃 사이의 폭
  // 변경은 여전히 닫는다 — 강제 종료의 이유가 **얼어 있는 row baseline** 이고 폰의 시트는
  // 아무것도 얼리지 않기 때문이다. 둘을 함께 두는 것이 요점이다: 위만 있으면 「닫기를 없앴다」와
  // 구별되지 않는다.

  test('@smoke assertion:TT-03 rotating a phone both ways keeps the expanded card alive across the axis change', async ({
    page
  }) => {
    // 폰을 눕히면 폭 844 라 **제자리 오버레이**로, 다시 세우면 **시트**로 형태가 바뀐다. 형태가
    // 바뀌는 것은 규칙 3 대로이고, **확장 자체는 살아남아야 한다**(명세 §2-11).
    //
    // 두 방향의 원인이 서로 달랐다. 눕히기는 폭 변경 강제 닫기가 지웠고 — 그 규칙의 이유는
    // 제자리 오버레이가 row 기하를 얼린다는 것인데 시트는 얼리지 않으므로 이유가 닿지 않는
    // 자리였다(BQ-44). 세우기는 시트가 언마운트되며 부른 `history.back()` 의 `popstate` 가
    // **비동기로 뒤늦게** 도착해, 그 사이 다시 마운트된 시트를 닫았다. 이 검사는 둘 다 잡는다.
    await setTouchViewport(page, {width: 390, height: 844});
    await page.goto('/en');

    const card = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    await card.getByTestId('landing-grid-card-trigger').click();
    await expect(card).toHaveAttribute('data-card-state', 'expanded');
    await expect(card).toHaveAttribute('data-expanded-layer', 'mobile-sheet');

    // 세로 → 가로: 형태가 제자리 오버레이로 바뀌되 확장은 살아남는다.
    await page.setViewportSize({width: 844, height: 390});
    await expect(card).toHaveAttribute('data-expanded-layer', 'desktop-overlay');
    await expect(card).toHaveAttribute('data-card-state', 'expanded');

    // 가로 → 세로: 시트로 되돌아오고, 뒤늦게 도착하는 popstate 가 그것을 닫으면 안 된다.
    await page.setViewportSize({width: 390, height: 844});
    await expect(card).toHaveAttribute('data-expanded-layer', 'mobile-sheet');
    await expect(card).toHaveAttribute('data-card-state', 'expanded');
    await page.waitForTimeout(400);
    await expect(card).toHaveAttribute('data-card-state', 'expanded');
    await expect(page).toHaveURL(/\/en$/u);
  });

  test('@smoke assertion:TT-06 resizing a desktop window across a column change still force-closes the expanded card', async ({
    page
  }) => {
    // 회전 보존이 강제 닫기를 **없앤 것이 아니다.** 얼어 있는 기하 위에서 재측정하지 않는다는
    // 원래 이유는 그대로이고, 그 이유가 실제로 닿는 자리 — 다 열 레이아웃 → 다 열 레이아웃 —
    // 에서는 여전히 닫는다(`req-landing.md` §6.2, BQ-44).
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const card = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    await card.getByTestId('landing-grid-card-trigger').hover();
    await expect(card).toHaveAttribute('data-card-state', 'expanded');

    await page.setViewportSize({width: 900, height: 980});
    await expect(card).toHaveAttribute('data-card-state', 'normal');
  });

  test('@smoke assertion:TT-04 landscape phone overlay stays inside the viewport and scrolls its own body', async ({
    page
  }) => {
    // 844×390 에서 본문(제목 · 두 줄 질문 · 답변 둘 · 메타)은 가용 높이를 넘칠 수 있고, 배경이
    // 잠겨 있어 스크롤로도 볼 수 없다. **살아남기만 하고 잘려 있으면 통과가 아니다**(명세 §2-11).
    await setTouchViewport(page, {width: 844, height: 390});
    await page.goto('/en');

    const card = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    await card.getByTestId('landing-grid-card-trigger').click();
    await expect(card).toHaveAttribute('data-expanded-layer', 'desktop-overlay');

    const overlay = card.locator('[data-slot="expandedBody"]');
    const geometry = await overlay.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return {
        top: rect.top,
        bottom: rect.bottom,
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
        overflowY: style.overflowY,
        overscrollBehavior: style.overscrollBehaviorY,
        viewportHeight: window.innerHeight
      };
    });

    // 오버레이는 뷰포트를 넘지 않는다.
    expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight + 1);
    // 넘치는 본문은 오버레이 **안에서** 스크롤한다.
    expect(geometry.overflowY).toBe('auto');
    expect(geometry.overscrollBehavior).toBe('contain');

    if (geometry.scrollHeight > geometry.clientHeight + 1) {
      const scrolled = await overlay.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
        return element.scrollTop;
      });
      expect(scrolled).toBeGreaterThan(0);
    }
  });

  test('@smoke assertion:BD-01 backdrop fades in and out with the card, and stops capturing input while it leaves', async ({
    page
  }) => {
    // 스크림과 카드는 한 전이의 두 면이다. 종전에는 등장이 마운트 즉시 불투명(0ms)이었고,
    // 제자리 오버레이에서는 소멸조차 없어 **어둠만 먼저 사라졌다** — 카드가 아직 280ms 를
    // 접는 동안이다(실측 2026-09-16). 어느 게이트도 이것을 보지 않았다: baseline 은 정지
    // 화면이고 다른 단언은 전부 최종 상태만 본다.
    await setTouchViewport(page, {width: 900, height: 1200});
    await page.goto('/en');

    const card = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    const backdrop = page.getByTestId('landing-grid-mobile-backdrop');

    // 표본은 **페이지 안에서** rAF 로 모은다. 왕복으로 재면 부하가 높을 때 표본이 성기고,
    // 성긴 표본은 「전이가 없다」와 구별되지 않는다.
    const installSampler = () =>
      page.evaluate(() => {
        const samples: Array<{opacity: number; state: string; pointerEvents: string}> = [];
        (window as unknown as {__backdropSamples: typeof samples}).__backdropSamples = samples;
        let frames = 0;
        const tick = () => {
          const element = document.querySelector('[data-testid="landing-grid-mobile-backdrop"]');
          if (element instanceof HTMLElement) {
            const style = window.getComputedStyle(element);
            samples.push({
              opacity: Number(style.opacity),
              state: element.dataset.state ?? '',
              pointerEvents: style.pointerEvents
            });
          }
          frames += 1;
          if (frames < 40) {
            window.requestAnimationFrame(tick);
          }
        };
        window.requestAnimationFrame(tick);
      });

    const readSamples = () =>
      page.evaluate(() => (window as unknown as {__backdropSamples: Array<{opacity: number; state: string; pointerEvents: string}>}).__backdropSamples);

    // ⑴ 등장 — 마운트 즉시 불투명이 아니라 옅은 데서 올라온다.
    await installSampler();
    await card.getByTestId('landing-grid-card-trigger').click();
    await expect(card).toHaveAttribute('data-card-state', 'expanded');
    await page.waitForTimeout(700);

    const enterSamples = await readSamples();
    expect(enterSamples.length, '등장 표본이 비었다 — 프로브가 backdrop 을 잡지 못했다').toBeGreaterThan(4);
    expect(enterSamples[0].opacity, '마운트 즉시 불투명하면 등장이 0ms 라는 뜻이다').toBeLessThan(0.5);
    expect(enterSamples[enterSamples.length - 1].opacity, '등장이 끝나면 완전히 어두워야 한다').toBeGreaterThan(0.95);

    // ⑵ 소멸 — 어둠이 카드보다 먼저 사라지지 않고, **옅어지는 방향**으로 움직인다.
    await installSampler();
    await backdrop.click({position: {x: 5, y: 300}});
    await page.waitForTimeout(700);

    const exitSamples = await readSamples();
    expect(exitSamples.length, '소멸 표본이 비었다 — backdrop 이 즉시 언마운트됐다는 뜻이다').toBeGreaterThan(4);
    expect(exitSamples[0].opacity, '소멸은 완전히 어두운 데서 시작해야 한다').toBeGreaterThan(0.9);
    expect(exitSamples[exitSamples.length - 1].opacity, '소멸이 끝나면 투명해야 한다').toBeLessThan(0.1);

    // 방향이 이 단언의 요점이다. 상태를 effect 에서 바꾸면 한 커밋 동안 언마운트됐다가 다시
    // 마운트되고, 그 재마운트가 등장 애니메이션을 다시 걸어 **불투명도가 오히려 올라간다**.
    // 처음 구현이 정확히 그랬고 최종 상태만 보는 단언으로는 잡히지 않았다.
    const rising = exitSamples.filter((sample, index) => index > 0 && sample.opacity > exitSamples[index - 1].opacity + 0.02);
    expect(rising, `소멸 중 불투명도가 올라간 구간: ${JSON.stringify(rising)}`).toEqual([]);

    // ⑶ 사라지는 동안 입력을 삼키지 않는다 — 닫은 직후 화면이 굳어 있으면 안 된다.
    const exitingSamples = exitSamples.filter((sample) => sample.state === 'EXITING');
    expect(exitingSamples.length, '소멸 상태가 한 표본도 없다').toBeGreaterThan(0);
    expect(
      exitingSamples.every((sample) => sample.pointerEvents === 'none'),
      '사라지는 backdrop 이 입력을 삼킨다'
    ).toBe(true);

    await expect(backdrop).toHaveCount(0);
    await expect(card).not.toHaveAttribute('data-card-state', 'expanded');
  });

  test('@smoke assertion:TT-02 hover-capable desktop keeps pointer-leave close and gets no backdrop', async ({
    page
  }) => {
    // 대조군 — 입력 축이 실제로 가르고 있는지 확인한다. 같은 폭대에서 hover 가 있으면
    // backdrop 은 깔리지 않고 현행 포인터 이탈 닫기가 유지된다(명세 규칙 3).
    await setHoverCapableViewport(page, {width: 1280, height: 900});
    await page.goto('/en');

    const card = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    await card.getByTestId('landing-grid-card-trigger').hover();
    await expect(card).toHaveAttribute('data-card-state', 'expanded');
    await expect(page.getByTestId('landing-grid-mobile-backdrop')).toHaveCount(0);
  });
});
