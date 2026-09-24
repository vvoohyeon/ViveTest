import {expect, test, type Page} from '@playwright/test';

import {
  buildLocalizedBlogDetailRoute,
  PRIMARY_AVAILABLE_TEST_VARIANT,
  PRIMARY_AVAILABLE_TEST_INGRESS_STORAGE_KEY,
  SECONDARY_BLOG_VARIANT,
  PRIMARY_OPT_OUT_TEST_INGRESS_STORAGE_KEY,
  PRIMARY_OPT_OUT_TEST_VARIANT,
  TEST_VARIANT_INSTRUCTION_FIXTURES_EN,
  buildLocalizedPrimaryOptOutTestRoute,
  buildLocalizedPrimaryTestRoute
} from './helpers/landing-fixture';
import {setTouchViewport} from './helpers/touch-context';

const TELEMETRY_CONSENT_STORAGE_KEY = 'vivetest-telemetry-consent';
const LANDING_TRANSITION_SIGNAL_EVENT = 'landing:transition-signal';
const LANDING_TRANSITION_SIGNAL_STORAGE_KEY = 'vivetest-test-transition-signals';
const TRANSITION_OVERLAY_READY_DELAY_MS = 180;
const PRIMARY_AVAILABLE_TEST_ROUTE_EN = buildLocalizedPrimaryTestRoute('en');
const PRIMARY_OPT_OUT_TEST_ROUTE_EN = buildLocalizedPrimaryOptOutTestRoute('en');

function getInstructionFixture(variant: string) {
  const fixture = TEST_VARIANT_INSTRUCTION_FIXTURES_EN.find((candidate) => candidate.variant === variant);
  if (!fixture) {
    throw new Error(`Missing test instruction fixture for variant: ${variant}`);
  }

  return fixture;
}

function collectForbiddenKeys(value: unknown, trail = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([key, nestedValue]) => {
    const nextTrail = trail ? `${trail}.${key}` : key;
    const matches = /^(question_text|answer_text|free_input|free_text|email|ip|fingerprint|transition_id|result_reason|final_q1_response)$/iu.test(key)
      ? [nextTrail]
      : [];
    return [...matches, ...collectForbiddenKeys(nestedValue, nextTrail)];
  });
}

async function delayDestinationReadyRaf(page: import('@playwright/test').Page, delayMs = TRANSITION_OVERLAY_READY_DELAY_MS) {
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

async function expectSourceGnbOverlay(page: import('@playwright/test').Page, destinationContext: 'blog' | 'test' | 'history') {
  const overlay = page.getByTestId('landing-transition-source-gnb');
  await expect(overlay).toBeVisible();
  await expect(overlay.locator('.gnb-shell')).toHaveAttribute('data-gnb-context', 'landing');
  await expect(page.locator('.page-shell > .gnb-shell')).toHaveAttribute('data-gnb-context', destinationContext);
}

async function installTransitionSignalCollector(page: import('@playwright/test').Page) {
  await page.addInitScript(([eventName, storageKey]) => {
    const signalStore = (() => {
      try {
        const stored = window.sessionStorage.getItem(storageKey);
        if (!stored) {
          return [] as Array<Record<string, unknown>>;
        }

        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? (parsed as Array<Record<string, unknown>>) : [];
      } catch {
        return [] as Array<Record<string, unknown>>;
      }
    })();
    const signalWindow = window as unknown as Window & {
      __landingTransitionSignals?: Array<Record<string, unknown>>;
    };
    signalWindow.__landingTransitionSignals = signalStore;
    const persistSignals = () => {
      window.sessionStorage.setItem(storageKey, JSON.stringify(signalStore));
    };

    persistSignals();

    window.addEventListener(eventName, (event) => {
      if (event instanceof CustomEvent && event.detail && typeof event.detail === 'object') {
        signalStore.push(event.detail as Record<string, unknown>);
        persistSignals();
      }
    });
  }, [LANDING_TRANSITION_SIGNAL_EVENT, LANDING_TRANSITION_SIGNAL_STORAGE_KEY] as const);
}

async function readTransitionSignals(page: import('@playwright/test').Page) {
  return page.evaluate(
    () =>
      (() => {
        try {
          const stored = window.sessionStorage.getItem('vivetest-test-transition-signals');
          if (!stored) {
            return [] as Array<Record<string, unknown>>;
          }

          const parsed = JSON.parse(stored);
          return Array.isArray(parsed) ? (parsed as Array<Record<string, unknown>>) : [];
        } catch {
          return [] as Array<Record<string, unknown>>;
        }
      })()
  );
}

async function answerTestQuestion(page: Page, choice: 'A' | 'B', shouldAdvance: boolean) {
  const questionNumber = page.getByTestId('test-question-number');
  const previousQuestionNumber = await questionNumber.textContent();
  await page.getByTestId(choice === 'A' ? 'test-choice-a' : 'test-choice-b').click();

  if (shouldAdvance) {
    await expect(questionNumber).not.toHaveText(previousQuestionNumber ?? '', {timeout: 800});
    return;
  }

  await expect(page.getByTestId('test-submit-button')).toBeEnabled();
}

test.describe('Phase 10/11 transition + telemetry smoke', () => {
  test('@smoke assertion:B6-transition-ingress assertion:B15-transition-correlation assertion:B18-final-submit-payload assertion:B18-post-attempt-session-id-e2e assertion:B28-cross-phase-event-integrity-ingress landing test transition keeps source GNB until destination-ready and records card_answered, attempt_start, final_submit, and internal transition signals', async ({
    page
  }) => {
    const events: Array<Record<string, unknown>> = [];

    await delayDestinationReadyRaf(page);
    await installTransitionSignalCollector(page);
    await page.addInitScript((storageKey) => {
      window.localStorage.setItem(storageKey, 'OPTED_IN');
    }, TELEMETRY_CONSENT_STORAGE_KEY);
    await page.route('**/api/telemetry', async (route) => {
      const payload = route.request().postDataJSON();
      if (payload && typeof payload === 'object') {
        events.push(payload as Record<string, unknown>);
      }
      await route.fulfill({status: 204, body: ''});
    });

    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const testCard = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    await testCard.getByTestId('landing-grid-card-trigger').click();
    await testCard.locator('[data-slot="answerChoiceA"]').click();

    await expect(page).toHaveURL(new RegExp(`${PRIMARY_AVAILABLE_TEST_ROUTE_EN}$`, 'u'));
    await expect(page.getByTestId('test-instruction-overlay')).toBeVisible();
    await expect(page.getByTestId('test-progress')).toHaveText('13%');
    await expect
      .poll(async () => (await readTransitionSignals(page)).filter((signal) => signal.signal === 'transition_complete').length)
      .toBe(1);
    await expect
      .poll(() => page.evaluate((key) => window.sessionStorage.getItem(key), PRIMARY_AVAILABLE_TEST_INGRESS_STORAGE_KEY))
      .not.toBeNull();

    await page.reload();
    await expect(page).toHaveURL(new RegExp(`${PRIMARY_AVAILABLE_TEST_ROUTE_EN}$`, 'u'));
    await expect(page.getByTestId('test-instruction-overlay')).toBeVisible();
    await expect(page.getByTestId('test-progress')).toHaveText('13%');

    await page.getByTestId('test-start-button').click();
    await expect(page.getByTestId('test-progress')).toHaveText('13%');
    await expect
      .poll(() => page.evaluate((key) => window.sessionStorage.getItem(key), PRIMARY_AVAILABLE_TEST_INGRESS_STORAGE_KEY))
      .toBeNull();

    const choices = ['A', 'B', 'A', 'B', 'A', 'B', 'A'] as const;
    for (const [choiceIndex, choice] of choices.entries()) {
      await answerTestQuestion(page, choice, choiceIndex < choices.length - 1);
    }
    await page.getByTestId('test-submit-button').click();

    // 장벽을 도착 화면으로 바꾼다 — 제출은 이제 결과 주소로 이동하고(명세 §2-6), 인계 패널은
    // 그 이동의 중간 상태라 한 프레임만 머문다. 중간 상태를 장벽으로 쓰면 경주가 된다.
    await expect(page).toHaveURL(/\/en\/result\//u);
    await expect(page.getByTestId('result-screen')).toBeVisible();
    await expect
      .poll(() =>
        events.filter((event) =>
          ['card_answered', 'attempt_start', 'final_submit'].includes(String(event.event_type ?? ''))
        ).length
      )
      .toBe(3);

    const cardAnswered = events.find((event) => event.event_type === 'card_answered');
    const attemptStart = events.find((event) => event.event_type === 'attempt_start');
    const finalSubmit = events.find((event) => event.event_type === 'final_submit');
    const transitionSignals = await readTransitionSignals(page);
    const transitionStart = transitionSignals.find((signal) => signal.signal === 'transition_start');
    const transitionComplete = transitionSignals.find((signal) => signal.signal === 'transition_complete');

    expect(events.filter((event) => event.event_type === 'card_answered')).toHaveLength(1);
    expect(events.filter((event) => event.event_type === 'attempt_start')).toHaveLength(1);
    expect(events.filter((event) => event.event_type === 'final_submit')).toHaveLength(1);
    expect(events.filter((event) => String(event.event_type ?? '').startsWith('transition_'))).toHaveLength(0);
    expect(transitionSignals.filter((signal) => signal.signal === 'transition_start')).toHaveLength(1);
    expect(transitionSignals.filter((signal) => signal.signal === 'transition_complete')).toHaveLength(1);

    expect(cardAnswered?.source_variant).toBe(PRIMARY_AVAILABLE_TEST_VARIANT);
    expect(cardAnswered?.target_route).toBe(PRIMARY_AVAILABLE_TEST_ROUTE_EN);
    expect(cardAnswered?.landing_ingress_flag).toBe(true);
    expect(transitionStart?.sourceVariant).toBe(PRIMARY_AVAILABLE_TEST_VARIANT);
    expect(transitionStart?.targetRoute).toBe(PRIMARY_AVAILABLE_TEST_ROUTE_EN);
    expect(transitionComplete?.transitionId).toBe(transitionStart?.transitionId);
    expect(attemptStart?.landing_ingress_flag).toBe(true);
    expect(attemptStart?.question_index_1based).toBe(2);
    expect(attemptStart?.session_id).toEqual(expect.any(String));
    expect(finalSubmit?.landing_ingress_flag).toBe(true);
    expect(finalSubmit?.question_index_1based).toBe(8);
    expect(finalSubmit?.session_id).toBe(attemptStart?.session_id);
    expect(finalSubmit?.final_responses).toEqual({
      '1': 'A',
      '2': 'A',
      '3': 'B',
      '4': 'A',
      '5': 'B',
      '6': 'A',
      '7': 'B',
      '8': 'A'
    });
    expect(finalSubmit).not.toHaveProperty('final_q1_response');
    expect(finalSubmit).not.toHaveProperty('transition_id');
    expect(finalSubmit).not.toHaveProperty('result_reason');
    expect(collectForbiddenKeys(finalSubmit)).toEqual([]);

    await expect
      .poll(() =>
        page.evaluate(() =>
          Object.keys(window.sessionStorage).filter((key) => key.startsWith('vivetest-landing-ingress:')).length
        )
      )
      .toBe(0);
  });

  test('@smoke assertion:B28-cross-phase-event-integrity-direct direct /test entry emits attempt_start(question_index_1based=1) without card_answered or internal transition_start', async ({
    page
  }) => {
    const events: Array<Record<string, unknown>> = [];

    await installTransitionSignalCollector(page);
    await page.addInitScript((storageKey) => {
      window.localStorage.setItem(storageKey, 'OPTED_IN');
    }, TELEMETRY_CONSENT_STORAGE_KEY);
    await page.route('**/api/telemetry', async (route) => {
      const payload = route.request().postDataJSON();
      if (payload && typeof payload === 'object') {
        events.push(payload as Record<string, unknown>);
      }
      await route.fulfill({status: 204, body: ''});
    });

    await page.setViewportSize({width: 1440, height: 980});
    await page.goto(PRIMARY_AVAILABLE_TEST_ROUTE_EN);
    await expect(page.getByTestId('test-instruction-overlay')).toBeVisible();
    await expect(page.getByTestId('test-progress')).toHaveText('0%');

    await page.getByTestId('test-start-button').click();

    await expect
      .poll(() => events.filter((event) => event.event_type === 'attempt_start').length)
      .toBe(1);

    const attemptStart = events.find((event) => event.event_type === 'attempt_start');
    const transitionSignals = await readTransitionSignals(page);

    expect(events.filter((event) => event.event_type === 'card_answered')).toHaveLength(0);
    expect(events.filter((event) => String(event.event_type ?? '').startsWith('transition_'))).toHaveLength(0);
    expect(transitionSignals.filter((signal) => signal.signal === 'transition_start')).toHaveLength(0);
    expect(attemptStart?.question_index_1based).toBe(1);
    expect(attemptStart?.landing_ingress_flag).toBe(false);
  });

  test('@smoke assertion:B6-transition-ingress landing opt_out transition keeps the plain instruction contract and continues from Q2 for OPTED_OUT consent', async ({
    page
  }) => {
    const optOutInstruction = getInstructionFixture(PRIMARY_OPT_OUT_TEST_VARIANT).instruction;

    await delayDestinationReadyRaf(page, 600);
    await page.addInitScript((storageKey) => {
      window.localStorage.setItem(storageKey, 'OPTED_OUT');
    }, TELEMETRY_CONSENT_STORAGE_KEY);
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const testCard = page.locator(`[data-card-variant="${PRIMARY_OPT_OUT_TEST_VARIANT}"]`);
    await testCard.getByTestId('landing-grid-card-trigger').click();
    await testCard.locator('[data-slot="answerChoiceA"]').click();

    await expect(page).toHaveURL(new RegExp(`${PRIMARY_OPT_OUT_TEST_ROUTE_EN}$`, 'u'));
    await expectSourceGnbOverlay(page, 'test');
    await expect(page.getByTestId('landing-transition-source-gnb')).toContainText('ViveTest');
    await expect(page.getByTestId('landing-transition-source-gnb')).toBeHidden({timeout: 1500});
    await expect(page.getByTestId('test-instruction-overlay')).toBeVisible();
    await expect(page.getByTestId('test-instruction-body')).toHaveText(optOutInstruction);
    await expect(page.getByTestId('test-instruction-divider')).toHaveCount(0);
    await expect(page.getByTestId('test-instruction-note')).toHaveCount(0);
    await expect(page.getByTestId('test-start-button')).toBeVisible();
    await expect(page.getByTestId('test-progress')).toHaveText('25%');
    await expect
      .poll(() => page.evaluate((key) => window.sessionStorage.getItem(key), PRIMARY_OPT_OUT_TEST_INGRESS_STORAGE_KEY))
      .not.toBeNull();

    await page.reload();
    await expect(page).toHaveURL(new RegExp(`${PRIMARY_OPT_OUT_TEST_ROUTE_EN}$`, 'u'));
    await expect(page.getByTestId('test-instruction-overlay')).toBeVisible();
    await expect(page.getByTestId('test-instruction-body')).toHaveText(optOutInstruction);
    await expect(page.getByTestId('test-progress')).toHaveText('25%');
    await expect
      .poll(() => page.evaluate((key) => window.sessionStorage.getItem(key), PRIMARY_OPT_OUT_TEST_INGRESS_STORAGE_KEY))
      .not.toBeNull();

    await page.getByTestId('test-start-button').click();
    await expect(page.getByTestId('test-progress')).toHaveText('25%');
    await expect
      .poll(() => page.evaluate((key) => window.sessionStorage.getItem(key), PRIMARY_OPT_OUT_TEST_INGRESS_STORAGE_KEY))
      .toBeNull();
  });

  test('@smoke assertion:B6-transition-ingress test route re-entry without ingress resumes active run after start consumes ingress', async ({
    page
  }) => {
    await page.addInitScript((storageKey) => {
      window.localStorage.setItem(storageKey, 'OPTED_IN');
    }, TELEMETRY_CONSENT_STORAGE_KEY);
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const testCard = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    await testCard.getByTestId('landing-grid-card-trigger').click();
    await testCard.locator('[data-slot="answerChoiceA"]').click();

    await expect(page).toHaveURL(new RegExp(`${PRIMARY_AVAILABLE_TEST_ROUTE_EN}$`, 'u'));
    await expect(page.getByTestId('test-instruction-overlay')).toBeVisible();
    await expect(page.getByTestId('test-progress')).toHaveText('13%');

    await page.getByTestId('test-start-button').click();
    await expect
      .poll(() => page.evaluate((key) => window.sessionStorage.getItem(key), PRIMARY_AVAILABLE_TEST_INGRESS_STORAGE_KEY))
      .toBeNull();

    await page.goto('/en');
    await page.goto(PRIMARY_AVAILABLE_TEST_ROUTE_EN);
    await expect(page.getByTestId('test-instruction-overlay')).toBeHidden();
    await expect(page.getByTestId('test-question-number')).toHaveText('Q2');
    await expect(page.getByTestId('test-progress')).toHaveText('13%');
  });

  test('@smoke assertion:B9-opted-out-no-send missing consent blocks client telemetry network sends', async ({page}) => {
    let requestCount = 0;

    await page.addInitScript((storageKey) => {
      window.localStorage.removeItem(storageKey);
    }, TELEMETRY_CONSENT_STORAGE_KEY);
    await page.route('**/api/telemetry', async (route) => {
      requestCount += 1;
      await route.fulfill({status: 204, body: ''});
    });

    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const blogCard = page.locator('[data-card-variant="ops-handbook"]');
    await blogCard.getByTestId('landing-grid-card-trigger').click();
    await expect(page).toHaveURL(new RegExp(`${buildLocalizedBlogDetailRoute('en', 'ops-handbook')}$`, 'u'));

    await page.waitForTimeout(300);
    expect(requestCount).toBe(0);
  });

  test('@smoke assertion:B15-transition-correlation blog transition keeps source GNB visible until the destination completes its ready handshake', async ({
    page
  }) => {
    await delayDestinationReadyRaf(page, 600);
    await installTransitionSignalCollector(page);
    await page.addInitScript((storageKey) => {
      window.localStorage.setItem(storageKey, 'OPTED_IN');
    }, TELEMETRY_CONSENT_STORAGE_KEY);

    await page.setViewportSize({width: 1440, height: 900});
    await page.goto('/en');

    const blogCard = page.locator('[data-card-variant="build-metrics"]');
    await blogCard.getByTestId('landing-grid-card-trigger').click();

    await expect(page).toHaveURL(new RegExp(`/en/blog/${SECONDARY_BLOG_VARIANT}$`, 'u'));
    await expectSourceGnbOverlay(page, 'blog');
    await expect(page.getByTestId('blog-selected-article')).toContainText('Build Metrics That Actually Matter');
    await expect(page.getByTestId('landing-transition-source-gnb')).toBeHidden({timeout: 1500});

    const transitionSignals = await readTransitionSignals(page);
    expect(transitionSignals.filter((signal) => signal.signal === 'transition_start')).toHaveLength(1);
    expect(transitionSignals.filter((signal) => signal.signal === 'transition_complete')).toHaveLength(1);
  });

  test('@smoke modified blog card activation leaves landing transition state untouched', async ({
    page
  }) => {
    await installTransitionSignalCollector(page);
    await page.setViewportSize({width: 1440, height: 900});
    await page.goto('/en');

    const trigger = page.locator('[data-card-variant="build-metrics"]').getByTestId('landing-grid-card-trigger');
    const popupPromise = page.context().waitForEvent('page', {timeout: 1000}).catch(() => null);
    await trigger.click({modifiers: ['Meta']});
    const popup = await popupPromise;

    if (popup) {
      await popup.close();
    }

    await page.waitForTimeout(150);
    await expect(page).toHaveURL(/\/en$/u);
    await expect
      .poll(() => page.evaluate(() => window.sessionStorage.getItem('vivetest-landing-pending-transition')))
      .toBeNull();
    const transitionSignals = await readTransitionSignals(page);
    expect(transitionSignals.filter((signal) => signal.signal === 'transition_start')).toHaveLength(0);
  });

  test('@smoke assertion:B15-transition-correlation assertion:B17-return-restore blog transition keeps source GNB until destination-ready and landing return restores scroll once', async ({
    page
  }) => {
    const events: Array<Record<string, unknown>> = [];

    await delayDestinationReadyRaf(page);
    await installTransitionSignalCollector(page);
    await page.addInitScript((storageKey) => {
      window.localStorage.setItem(storageKey, 'OPTED_IN');
    }, TELEMETRY_CONSENT_STORAGE_KEY);
    await page.route('**/api/telemetry', async (route) => {
      const payload = route.request().postDataJSON();
      if (payload && typeof payload === 'object') {
        events.push(payload as Record<string, unknown>);
      }
      await route.fulfill({status: 204, body: ''});
    });
    await page.setViewportSize({width: 1440, height: 720});
    await page.goto('/en');

    const blogCard = page.locator('[data-card-variant="build-metrics"]');
    const setupScrollTop = await blogCard.evaluate((element) => {
      const absoluteTop = element.getBoundingClientRect().top + window.scrollY;
      return Math.max(0, Math.round(absoluteTop - window.innerHeight / 2 + 40));
    });
    await page.evaluate((nextY) => {
      window.scrollTo({
        top: nextY,
        left: 0,
        behavior: 'auto'
      });
    }, setupScrollTop);
    const preparedScrollY = await page.evaluate(() => Math.round(window.scrollY));
    expect(preparedScrollY).toBeGreaterThan(0);

    const sourceCardRestoreCandidate = await blogCard.evaluate((element) =>
      Math.max(0, Math.round(element.getBoundingClientRect().top + window.scrollY - 96))
    );
    const scrollBefore = await page.evaluate(() => window.scrollY);
    expect(Math.abs(scrollBefore - preparedScrollY)).toBeLessThanOrEqual(1);
    expect(Math.abs(sourceCardRestoreCandidate - scrollBefore)).toBeGreaterThan(40);
    await blogCard.getByTestId('landing-grid-card-trigger').click();

    await expect(page).toHaveURL(new RegExp(`/en/blog/${SECONDARY_BLOG_VARIANT}$`, 'u'));
    await expect(page.getByTestId('blog-selected-article')).toContainText('Build Metrics That Actually Matter');
    await expect(page.getByTestId('blog-selected-article')).toContainText(
      'A compact field guide to selecting build-time, test-time, and runtime quality indicators that correlate with user outcomes.'
    );
    await expect
      .poll(async () => (await readTransitionSignals(page)).filter((signal) => signal.signal === 'transition_complete').length)
      .toBe(1);
    const transitionSignals = await readTransitionSignals(page);

    expect(events.filter((event) => event.event_type === 'card_answered')).toHaveLength(0);
    expect(transitionSignals.filter((signal) => signal.signal === 'transition_start')).toHaveLength(1);
    expect(transitionSignals.filter((signal) => signal.signal === 'transition_complete')).toHaveLength(1);

    const savedReturnScroll = await page.evaluate(() =>
      Number(window.sessionStorage.getItem('vivetest-landing-return-scroll-y') ?? '0')
    );
    await expect
      .poll(() => page.evaluate(() => window.sessionStorage.getItem('vivetest-landing-return-scroll-y')))
      .not.toBeNull();

    await page.getByRole('link', {name: 'ViveTest'}).first().click();
    await expect(page).toHaveURL(/\/en$/u);
    await expect
      .poll(() => page.evaluate(() => window.sessionStorage.getItem('vivetest-landing-return-scroll-y')))
      .toBeNull();
    const expectedRestoredScroll = await page.evaluate((initialSavedScroll) => {
      const maxScrollTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      return Math.min(initialSavedScroll, maxScrollTop);
    }, savedReturnScroll);

    expect(expectedRestoredScroll).toBeGreaterThan(0);
    await expect
      .poll(() => page.evaluate(() => Math.round(window.scrollY)))
      .toBeGreaterThanOrEqual(Math.max(1, Math.round(expectedRestoredScroll) - 1));

    const restoredScroll = await page.evaluate(() => window.scrollY);
    expect(Math.abs(restoredScroll - scrollBefore)).toBeLessThanOrEqual(2);
    expect(Math.abs(restoredScroll - expectedRestoredScroll)).toBeLessThanOrEqual(2);
    const restoredSourceAnchor = await page.locator('[data-card-variant="build-metrics"]').evaluate((element) =>
      Math.max(0, Math.round(element.getBoundingClientRect().top + window.scrollY - 96))
    );
    expect(Math.abs(restoredSourceAnchor - expectedRestoredScroll)).toBeGreaterThan(40);
  });

  // 폰의 확장은 **바텀시트**다(`req-landing-interaction.md` §8.5, 2026-09-16 재작성). 아래 검사들이
  // 붙들던 in-flow 성질 — y-anchor drift · snapshot 복귀 · queue-close · transient 셸의 모션 —
  // 은 확장이 흐름 안에 있던 사정에서 나온 것이고 그 사정이 없어졌다. 지키려던 둘은 그대로다:
  // **연속성**과 **복귀 정확성**. 아래는 그 둘을 시트의 언어로 다시 잰다.

  test('@smoke assertion:B14-mobile-baseline mobile expanded opens a sheet that locks the page, keeps the card in place, and restores scroll on close', async ({
    page
  }) => {
    await setTouchViewport(page, {width: 390, height: 844});
    await page.goto('/en');
    const shell = page.getByTestId('landing-grid-shell');
    await expect(shell).toHaveAttribute('data-grid-tier', 'mobile');

    const card = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    const trigger = card.getByTestId('landing-grid-card-trigger');
    const sheet = page.getByTestId('landing-card-sheet');
    const before = await card.boundingBox();
    expect(before).not.toBeNull();

    await trigger.click();

    await expect(sheet).toBeVisible();
    await expect(sheet).toHaveAttribute('role', 'dialog');
    await expect(sheet).toHaveAttribute('aria-modal', 'true');
    await expect(card).toHaveAttribute('data-mobile-phase', /OPENING|OPEN/u);
    await expect(card).toHaveAttribute('data-expanded-layer', 'mobile-sheet');
    // 시트는 열려 있는 **동안 내내** 배경을 잠근다 — in-flow 때처럼 정착 후 풀지 않는다.
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    await expect(card).toHaveAttribute('data-mobile-phase', 'OPEN');

    // **아무것도 밀지 않는다.** 복귀 정확성이 절차가 아니라 구조로 성립하는 지점이 여기다.
    const duringOpen = await card.boundingBox();
    expect(Math.abs((duringOpen?.y ?? 0) - (before?.y ?? 0))).toBeLessThanOrEqual(1);
    expect(Math.abs((duringOpen?.height ?? 0) - (before?.height ?? 0))).toBeLessThanOrEqual(1);

    await sheet.locator('[data-slot="mobileClose"]').click();

    await expect(card).toHaveAttribute('data-card-state', 'normal');
    await expect(trigger).toHaveAttribute('data-trigger-state', 'collapsed');
    await expect(sheet).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');

    const afterClose = await card.boundingBox();
    expect(Math.abs((afterClose?.y ?? 0) - (before?.y ?? 0))).toBeLessThanOrEqual(1);
    expect(Math.abs((afterClose?.height ?? 0) - (before?.height ?? 0))).toBeLessThanOrEqual(1);
  });

  test('@smoke assertion:B14-mobile-open-continuity mobile sheet carries the card title and sits above the GNB', async ({
    page
  }) => {
    await setTouchViewport(page, {width: 390, height: 844});
    await page.goto('/en');

    const card = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    // 제목을 **보이는 것을 확인한 뒤에** 읽는다. `innerText` 는 레이아웃에 기대므로 렌더 전에
    // 부르면 빈 문자열이 오고, 그러면 이 검사는 「시트 제목이 빈 문자열과 같은가」를 묻게 된다.
    await expect(card.locator('[data-slot="cardTitle"]')).toBeVisible();
    const cardTitle = await card.locator('[data-slot="cardTitle"]').innerText();

    await card.getByTestId('landing-grid-card-trigger').click();
    const sheet = page.getByTestId('landing-card-sheet');
    await expect(sheet).toBeVisible();

    // 연속성 — 원본 카드와 시트가 같은 것으로 읽힌다.
    await expect(sheet.locator('[data-slot="cardTitle"]')).toHaveText(cardTitle);

    // 층 — 오버레이는 GNB **위**에 있다(설계 명세 규칙 1).
    const layers = await page.evaluate(() => {
      const readZ = (selector: string) => {
        const element = document.querySelector<HTMLElement>(selector);
        return element ? Number.parseInt(getComputedStyle(element).zIndex || '0', 10) : 0;
      };
      return {
        sheetLayer: readZ('[data-slot="sheetLayer"]'),
        gnb: readZ('[data-testid="site-gnb"]')
      };
    });
    expect(layers.sheetLayer).toBeGreaterThan(layers.gnb);
  });

  test('@smoke assertion:B14-mobile-close-perception assertion:B14-mobile-close-choreography assertion:B14-mobile-title-continuity mobile close keeps the sheet drawn while it leaves and preserves the current scroll', async ({
    page
  }) => {
    await setTouchViewport(page, {width: 390, height: 844});
    await page.goto('/en');

    const card = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    const sheet = page.getByTestId('landing-card-sheet');

    const userScrolledY = await page.evaluate(() => {
      window.scrollBy(0, 220);
      return Math.round(window.scrollY);
    });
    expect(userScrolledY).toBeGreaterThan(0);

    await card.getByTestId('landing-grid-card-trigger').click();
    await expect(card).toHaveAttribute('data-mobile-phase', 'OPEN');
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden');

    const titleDuringOpen = await sheet.locator('[data-slot="cardTitle"]').innerText();

    // 스크림 빈 곳 탭으로 닫는다 — 닫기 경로 다섯 중 하나.
    await page.getByTestId('landing-card-sheet-scrim').click({position: {x: 10, y: 10}});

    // **이탈이 보인다.** 닫히는 동안에도 시트는 트리에 남아 있고 제목을 잃지 않는다 —
    // 곧바로 언마운트하면 이탈 모션이 존재할 수 없고, 그 결함은 끝 값만 보는 단언에는
    // 보이지 않는다(L38).
    await expect(sheet).toHaveAttribute('data-state', 'closing');
    await expect(sheet.locator('[data-slot="cardTitle"]')).toHaveText(titleDuringOpen);

    // 사라지는 스크림은 입력을 통과시킨다.
    const scrimPointerEvents = await page
      .getByTestId('landing-card-sheet-scrim')
      .evaluate((element) => getComputedStyle(element).pointerEvents);
    expect(scrimPointerEvents).toBe('none');

    await expect(sheet).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');
    expect(await page.evaluate(() => Math.round(window.scrollY))).toBe(userScrolledY);
  });

  test('@smoke assertion:B14-mobile-reduced-motion mobile sheet drops the translate and keeps the fade under reduced motion', async ({
    page
  }) => {
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
    await setTouchViewport(page, {width: 390, height: 844});
    await page.goto('/en');

    const shell = page.getByTestId('landing-grid-shell');
    const card = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    await expect(shell).toHaveAttribute('data-page-state', 'REDUCED_MOTION');

    await card.getByTestId('landing-grid-card-trigger').click();
    const sheet = page.getByTestId('landing-card-sheet');
    await expect(sheet).toBeVisible();

    // 이동을 버리고 페이드만 남긴다 — 모션을 통째로 없애지 않는다(설계 명세 §3-4).
    const motion = await sheet.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        transform: style.transform,
        transitionProperty: style.transitionProperty
      };
    });
    expect(motion.transform === 'none' || motion.transform === 'matrix(1, 0, 0, 1, 0, 0)').toBe(true);
    expect(motion.transitionProperty).toContain('opacity');

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  // 폐지된 `assertion:B14-mobile-queue-close` 의 자리다. queue-close 는 in-flow 확장이
  // `OPENING` 중의 닫기 입력을 정착 직후 1 회로 미루던 규칙이었고, 위상을 시트가 소유하면서
  // 사라졌다. 증인을 지우기만 하면 blocker 14 의 근거가 하나 줄어들므로, **더 강한 증인**으로
  // 바꾼다 — 닫기 경로 다섯이 각각 실제로 닫는다.
  test('@smoke assertion:B14-mobile-close-paths mobile sheet closes through every declared path', async ({page}) => {
    await setTouchViewport(page, {width: 390, height: 844});
    await page.goto('/en');

    const card = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    const trigger = card.getByTestId('landing-grid-card-trigger');
    const sheet = page.getByTestId('landing-card-sheet');

    // ⑴ 닫기 컨트롤
    await trigger.click();
    await expect(card).toHaveAttribute('data-mobile-phase', 'OPEN');
    await sheet.locator('[data-slot="mobileClose"]').click();
    await expect(sheet).toHaveCount(0);

    // ⑵ backdrop 탭
    await trigger.click();
    await expect(card).toHaveAttribute('data-mobile-phase', 'OPEN');
    await page.getByTestId('landing-card-sheet-scrim').click({position: {x: 10, y: 10}});
    await expect(sheet).toHaveCount(0);

    // ⑶ Escape — 폭과 입력 방식에 무관한 전 표면 규칙(WCAG 2.1.1 · 2.1.2)
    await trigger.click();
    await expect(card).toHaveAttribute('data-mobile-phase', 'OPEN');
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);

    // ⑷ 시스템 뒤로가기 — 오버레이 층 전부가 같은 규칙을 쓴다(설계 명세 규칙 3).
    await trigger.click();
    await expect(card).toHaveAttribute('data-mobile-phase', 'OPEN');
    await page.goBack();
    await expect(sheet).toHaveCount(0);
    await expect(page).toHaveURL(/\/en$/u);

    // ⑸ 스와이프 다운 — 이동량이 시트 높이의 30% 를 넘으면 닫힌다.
    await trigger.click();
    await expect(card).toHaveAttribute('data-mobile-phase', 'OPEN');
    const sheetBox = await sheet.boundingBox();
    const startY = (sheetBox?.y ?? 0) + 8;
    const endY = startY + (sheetBox?.height ?? 0) * 0.5;
    await sheet.dispatchEvent('pointerdown', {pointerType: 'touch', pointerId: 1, clientX: 195, clientY: startY});
    await sheet.dispatchEvent('pointermove', {pointerType: 'touch', pointerId: 1, clientX: 195, clientY: endY});
    await sheet.dispatchEvent('pointerup', {pointerType: 'touch', pointerId: 1, clientX: 195, clientY: endY});
    await expect(sheet).toHaveCount(0);
  });

  test('@smoke mobile sheet header stays pinned while the body scrolls', async ({page}) => {
    await setTouchViewport(page, {width: 390, height: 844});
    await page.goto('/en');

    const card = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    await card.getByTestId('landing-grid-card-trigger').click();

    const sheet = page.getByTestId('landing-card-sheet');
    const header = sheet.locator('[data-slot="sheetHeader"]');
    const body = sheet.locator('[data-slot="sheetBody"]');
    const headerTopBefore = await header.evaluate((element) => element.getBoundingClientRect().top);

    await body.evaluate((element) => {
      element.scrollTop = 120;
      element.dispatchEvent(new Event('scroll'));
    });

    const headerTopAfter = await header.evaluate((element) => element.getBoundingClientRect().top);
    expect(Math.abs(headerTopAfter - headerTopBefore)).toBeLessThanOrEqual(1);
  });

  // 폰에서 테스트에 들어가는 유일한 길이 시트의 A/B 다. 위 검사들은 시트를 열고 닫기만 하고,
  // 진입을 누르는 검사는 전부 1280·1440 이었다 — 그래서 포털로 옮겨진 답 버튼이 카드를 찾지
  // 못해 아무 일도 하지 않는 결함이 붉어지지 않았다.
  test('@smoke assertion:B6-transition-ingress mobile sheet answer enters the test and records card_answered', async ({
    page
  }) => {
    const events: Array<Record<string, unknown>> = [];

    await installTransitionSignalCollector(page);
    await page.addInitScript((storageKey) => {
      window.localStorage.setItem(storageKey, 'OPTED_IN');
    }, TELEMETRY_CONSENT_STORAGE_KEY);
    await page.route('**/api/telemetry', async (route) => {
      const payload = route.request().postDataJSON();
      if (payload && typeof payload === 'object') {
        events.push(payload as Record<string, unknown>);
      }
      await route.fulfill({status: 204, body: ''});
    });

    await setTouchViewport(page, {width: 390, height: 844});
    await page.goto('/en');

    const card = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    await card.getByTestId('landing-grid-card-trigger').click();
    const sheet = page.getByTestId('landing-card-sheet');
    await expect(card).toHaveAttribute('data-mobile-phase', 'OPEN');

    await sheet.locator('[data-slot="answerChoiceA"]').click();

    await expect(page).toHaveURL(new RegExp(`${PRIMARY_AVAILABLE_TEST_ROUTE_EN}$`, 'u'));
    await expect(page.getByTestId('test-instruction-overlay')).toBeVisible();
    await expect(page.getByTestId('test-progress')).toHaveText('13%');
    await expect
      .poll(async () => (await readTransitionSignals(page)).filter((signal) => signal.signal === 'transition_complete').length)
      .toBe(1);
    await expect.poll(() => events.filter((event) => event.event_type === 'card_answered').length).toBe(1);

    const cardAnswered = events.find((event) => event.event_type === 'card_answered');
    expect(cardAnswered?.source_variant).toBe(PRIMARY_AVAILABLE_TEST_VARIANT);
    expect(cardAnswered?.target_route).toBe(PRIMARY_AVAILABLE_TEST_ROUTE_EN);
    expect(cardAnswered?.landing_ingress_flag).toBe(true);
    expect((await readTransitionSignals(page)).filter((signal) => signal.signal === 'transition_start')).toHaveLength(1);
  });

  test('@smoke mobile blog tap navigates directly without entering the expanded lifecycle', async ({
    page
  }) => {
    await setTouchViewport(page, {width: 390, height: 844});
    await page.goto('/en');

    const card = page.locator('[data-card-variant="ops-handbook"]');
    await card.getByTestId('landing-grid-card-trigger').click();

    await expect(page).toHaveURL(new RegExp(`${buildLocalizedBlogDetailRoute('en', 'ops-handbook')}$`, 'u'));
    await expect(page.getByTestId('blog-selected-article')).toContainText('Operational Handbook for Stable Releases');
  });

  test('@smoke mobile scroll gesture starting on a blog card does not navigate', async ({page}) => {
    await setTouchViewport(page, {width: 390, height: 844});
    await page.goto('/en');

    const card = page.locator('[data-card-variant="ops-handbook"]');
    const trigger = card.getByTestId('landing-grid-card-trigger');
    // 기하를 렌더 전에 읽으면 `boundingBox()` 가 `null` 이고, 그 `null` 은 「카드가 없다」와
    // 구별되지 않는다 — 피사체가 보이는 것을 먼저 확인한다.
    await expect(trigger).toBeVisible();
    const box = await trigger.boundingBox();
    if (!box) {
      throw new Error('Expected blog card trigger to have a bounding box');
    }
    const clientX = Math.round(box.x + box.width / 2);
    const clientY = Math.round(box.y + box.height / 2);

    await trigger.dispatchEvent('pointerdown', {
      pointerType: 'touch',
      clientX,
      clientY
    });
    await trigger.dispatchEvent('pointermove', {
      pointerType: 'touch',
      clientX,
      clientY: clientY + 80
    });
    await trigger.dispatchEvent('pointerup', {
      pointerType: 'touch',
      clientX,
      clientY: clientY + 80
    });

    await page.waitForTimeout(150);
    await expect(page).toHaveURL(/\/en$/u);
    await expect(card).toHaveAttribute('data-card-state', 'normal');
    await expect(card).toHaveAttribute('data-mobile-phase', 'NORMAL');
    await expect(card.locator('[data-slot="mobileTransientShell"]')).toHaveCount(0);
  });

  test('@smoke assertion:B16-timeout stale pending transitions fail closed on non-destination routes', async ({page}) => {
    const hydrationWarnings: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' && message.text().includes('Hydration')) {
        hydrationWarnings.push(message.text());
      }
    });

    await installTransitionSignalCollector(page);
    await page.addInitScript(
      (pendingTransition) => {
        window.sessionStorage.setItem('vivetest-landing-pending-transition', JSON.stringify(pendingTransition));
      },
      {
        transitionId: 'transition-timeout-1',
        sourceVariant: PRIMARY_AVAILABLE_TEST_VARIANT,
        targetRoute: PRIMARY_AVAILABLE_TEST_ROUTE_EN,
        targetType: 'test',
        startedAtMs: Date.now(),
        variant: PRIMARY_AVAILABLE_TEST_VARIANT,
        preAnswerChoice: 'A'
      }
    );

    await page.goto('/en/history');
    await expectSourceGnbOverlay(page, 'history');

    await expect
      .poll(async () => (await readTransitionSignals(page)).find((signal) => signal.signal === 'transition_fail')?.resultReason ?? null)
      .toBe('DESTINATION_TIMEOUT');
    await expect(page.getByTestId('landing-transition-source-gnb')).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => window.sessionStorage.getItem('vivetest-landing-pending-transition')))
      .toBeNull();

    // Hydration mismatch is expected for stale-pending-transition scenarios.
    // This assertion documents the known behavior rather than hiding it.
    if (hydrationWarnings.length > 0) {
      expect(hydrationWarnings.every((w) => w.includes('Hydration'))).toBe(true);
    }
  });

  test('@smoke assertion:B16-destination-load-error mismatched destination routes rollback pending transition state', async ({
    page
  }) => {
    const hydrationWarnings: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' && message.text().includes('Hydration')) {
        hydrationWarnings.push(message.text());
      }
    });

    await installTransitionSignalCollector(page);
    await page.addInitScript(
      (pendingTransition) => {
        window.sessionStorage.setItem('vivetest-landing-pending-transition', JSON.stringify(pendingTransition));
      },
      {
        transitionId: 'transition-load-error-1',
        sourceVariant: 'build-metrics',
        targetRoute: buildLocalizedBlogDetailRoute('en', 'build-metrics'),
        targetType: 'blog',
        variant: 'build-metrics',
        startedAtMs: Date.now()
      }
    );

    await page.goto(PRIMARY_AVAILABLE_TEST_ROUTE_EN);

    await expect
      .poll(async () => (await readTransitionSignals(page)).find((signal) => signal.signal === 'transition_fail')?.resultReason ?? null)
      .toBe('DESTINATION_LOAD_ERROR');
    await expect(page.getByTestId('landing-transition-source-gnb')).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => window.sessionStorage.getItem('vivetest-landing-pending-transition')))
      .toBeNull();

    // Hydration mismatch is expected for stale-pending-transition scenarios.
    // This assertion documents the known behavior rather than hiding it.
    if (hydrationWarnings.length > 0) {
      expect(hydrationWarnings.every((w) => w.includes('Hydration'))).toBe(true);
    }
  });

  test('@smoke assertion:B16-user-cancel landing remount cancels stale pending transitions without leaks', async ({page}) => {
    const hydrationWarnings: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' && message.text().includes('Hydration')) {
        hydrationWarnings.push(message.text());
      }
    });

    await installTransitionSignalCollector(page);
    await page.addInitScript(
      (pendingTransition) => {
        window.sessionStorage.setItem('vivetest-landing-pending-transition', JSON.stringify(pendingTransition));
      },
      {
        transitionId: 'transition-user-cancel-1',
        sourceVariant: PRIMARY_AVAILABLE_TEST_VARIANT,
        targetRoute: PRIMARY_AVAILABLE_TEST_ROUTE_EN,
        targetType: 'test',
        startedAtMs: Date.now(),
        variant: PRIMARY_AVAILABLE_TEST_VARIANT,
        preAnswerChoice: 'A'
      }
    );

    await page.goto('/en');

    await expect
      .poll(async () => (await readTransitionSignals(page)).find((signal) => signal.signal === 'transition_cancel')?.resultReason ?? null)
      .toBe('USER_CANCEL');
    await expect
      .poll(() => page.evaluate(() => window.sessionStorage.getItem('vivetest-landing-pending-transition')))
      .toBeNull();
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');

    // Hydration mismatch is expected for stale-pending-transition scenarios.
    // This assertion documents the known behavior rather than hiding it.
    if (hydrationWarnings.length > 0) {
      expect(hydrationWarnings.every((w) => w.includes('Hydration'))).toBe(true);
    }
  });
});
