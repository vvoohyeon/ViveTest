import {expect, test} from '@playwright/test';

const TELEMETRY_CONSENT_STORAGE_KEY = 'vibetest-telemetry-consent';

function collectForbiddenKeys(value: unknown, trail = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([key, nestedValue]) => {
    const nextTrail = trail ? `${trail}.${key}` : key;
    const matches = /^(question_text|answer_text|free_input|free_text|email|ip|fingerprint)$/iu.test(key)
      ? [nextTrail]
      : [];
    return [...matches, ...collectForbiddenKeys(nestedValue, nextTrail)];
  });
}

test.describe('Phase 10/11 transition + telemetry smoke', () => {
  test('@smoke assertion:B6-transition-ingress assertion:B15-transition-correlation assertion:B18-final-submit-payload landing test transition records ingress, attempt_start, and final_submit payload completeness', async ({
    page
  }) => {
    const events: Array<Record<string, unknown>> = [];

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

    const testCard = page.locator('[data-card-id="test-rhythm-a"]');
    await testCard.getByTestId('landing-grid-card-trigger').click();
    await testCard.locator('[data-slot="answerChoiceA"]').click();

    await expect(page).toHaveURL(/\/en\/test\/rhythm-a\/question$/u);
    await expect(page.getByTestId('test-instruction-overlay')).toBeVisible();
    await expect(page.getByTestId('test-progress')).toHaveText('Question 2 of 4');

    await page.getByTestId('test-start-button').click();
    await expect(page.getByTestId('test-progress')).toHaveText('Question 2 of 4');

    await page.getByTestId('test-choice-a').click();
    await page.getByTestId('test-next-button').click();
    await page.getByTestId('test-choice-b').click();
    await page.getByTestId('test-next-button').click();
    await page.getByTestId('test-choice-a').click();
    await page.getByTestId('test-submit-button').click();

    await expect(page.getByTestId('test-result-panel')).toBeVisible();
    await expect
      .poll(() => events.filter((event) => event.event_type !== 'landing_view').length)
      .toBeGreaterThanOrEqual(4);

    const transitionStart = events.find((event) => event.event_type === 'transition_start');
    const transitionComplete = events.find((event) => event.event_type === 'transition_complete');
    const attemptStart = events.find((event) => event.event_type === 'attempt_start');
    const finalSubmit = events.find((event) => event.event_type === 'final_submit');

    expect(events.filter((event) => event.event_type === 'transition_start')).toHaveLength(1);
    expect(events.filter((event) => event.event_type === 'transition_complete')).toHaveLength(1);
    expect(events.filter((event) => event.event_type === 'attempt_start')).toHaveLength(1);
    expect(events.filter((event) => event.event_type === 'final_submit')).toHaveLength(1);

    expect(transitionStart?.source_card_id).toBe('test-rhythm-a');
    expect(transitionStart?.target_route).toBe('/en/test/rhythm-a/question');
    expect(transitionComplete?.transition_id).toBe(transitionStart?.transition_id);
    expect(attemptStart?.landing_ingress_flag).toBe(true);
    expect(attemptStart?.question_index_1based).toBe(2);
    expect(finalSubmit?.landing_ingress_flag).toBe(true);
    expect(finalSubmit?.question_index_1based).toBe(4);
    expect(finalSubmit?.final_q1_response).toBe('A');
    expect(finalSubmit?.final_responses).toEqual({
      q1: 'A',
      q2: 'A',
      q3: 'B',
      q4: 'A'
    });
    expect(collectForbiddenKeys(finalSubmit)).toEqual([]);

    await expect
      .poll(() =>
        page.evaluate(() =>
          Object.keys(window.sessionStorage).filter((key) => key.startsWith('vibetest-landing-ingress:')).length
        )
      )
      .toBe(0);
  });

  test('@smoke assertion:B9-opted-out-no-send default opted-out policy blocks client telemetry network sends', async ({page}) => {
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

    const blogCard = page.locator('[data-card-id="blog-ops-handbook"]');
    await blogCard.getByTestId('landing-grid-card-trigger').click();
    await blogCard.locator('[data-slot="primaryCTA"]').click();
    await expect(page).toHaveURL(/\/en\/blog$/u);

    await page.waitForTimeout(300);
    expect(requestCount).toBe(0);
  });

  test('@smoke assertion:B17-return-restore blog transition selects requested article and landing return restores scroll once', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const blogCard = page.locator('[data-card-id="blog-build-metrics"]');
    await blogCard.getByTestId('landing-grid-card-trigger').click();
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await blogCard.locator('[data-slot="primaryCTA"]').click();

    await expect(page).toHaveURL(/\/en\/blog$/u);
    await expect(page.getByTestId('blog-selected-article')).toContainText('Build Metrics That Actually Matter');
    const savedReturnScroll = await page.evaluate(() =>
      Number(window.sessionStorage.getItem('vibetest-landing-return-scroll-y') ?? '0')
    );
    await expect
      .poll(() => page.evaluate(() => window.sessionStorage.getItem('vibetest-landing-return-scroll-y')))
      .not.toBeNull();

    await page.getByRole('link', {name: 'VibeTest'}).first().click();
    await expect(page).toHaveURL(/\/en$/u);
    const expectedRestoredScroll = await page.evaluate((initialSavedScroll) => {
      const maxScrollTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      return Math.min(initialSavedScroll, maxScrollTop);
    }, savedReturnScroll);

    expect(expectedRestoredScroll).toBeGreaterThan(0);
    await expect
      .poll(() => page.evaluate(() => Math.round(window.scrollY)))
      .toBeGreaterThanOrEqual(Math.max(1, Math.round(expectedRestoredScroll) - 1));

    const restoredScroll = await page.evaluate(() => window.scrollY);
    expect(restoredScroll).toBeGreaterThanOrEqual(scrollBefore);
    expect(Math.abs(restoredScroll - expectedRestoredScroll)).toBeLessThanOrEqual(2);
    await expect
      .poll(() => page.evaluate(() => window.sessionStorage.getItem('vibetest-landing-return-scroll-y')))
      .toBeNull();
  });

  test('@smoke assertion:B14-mobile-baseline mobile expanded lifecycle keeps anchor, title baseline, and restore gating stable', async ({
    page
  }) => {
    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/en');
    const shell = page.getByTestId('landing-grid-shell');
    await expect(shell).toHaveAttribute('data-grid-tier', 'mobile');

    const card = page.locator('[data-card-id="test-rhythm-a"]');
    const trigger = card.getByTestId('landing-grid-card-trigger');
    const before = await card.boundingBox();
    const beforeTitleTop = await card
      .locator('[data-slot="cardTitle"]')
      .evaluate((element) => element.getBoundingClientRect().top);

    expect(before).not.toBeNull();
    await card.getByTestId('landing-grid-card-trigger').click();

    await expect(page.getByTestId('landing-grid-mobile-backdrop')).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    await expect(card).toHaveAttribute('data-mobile-phase', /OPENING|OPEN/u);
    await expect(card).toHaveAttribute('data-mobile-snapshot-writes', '1');

    const backdrop = page.getByTestId('landing-grid-mobile-backdrop');
    await backdrop.dispatchEvent('pointerdown', {
      pointerType: 'touch',
      clientX: 16,
      clientY: 16
    });
    await backdrop.dispatchEvent('pointermove', {
      pointerType: 'touch',
      clientX: 16,
      clientY: 44
    });
    await backdrop.dispatchEvent('pointerup', {
      pointerType: 'touch',
      clientX: 16,
      clientY: 44
    });

    await expect(card).toHaveAttribute('data-mobile-phase', /OPENING|OPEN/u);
    await expect(card).toHaveAttribute('data-mobile-phase', 'OPEN');
    const afterOpen = await card.boundingBox();
    const afterOpenTitleTop = await card
      .locator('[data-slot="cardTitle"]')
      .evaluate((element) => element.getBoundingClientRect().top);
    expect(Math.abs((afterOpen?.y ?? 0) - (before?.y ?? 0))).toBeLessThanOrEqual(1);
    expect(Math.abs(afterOpenTitleTop - beforeTitleTop)).toBeLessThanOrEqual(1);

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
    await expect
      .poll(() => shell.getAttribute('data-mobile-restore-ready-card-id'))
      .toBe('test-rhythm-a');
    await expect(card).toHaveAttribute('data-card-state', 'normal');
    await expect(trigger).toHaveAttribute('data-trigger-state', 'collapsed');
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');
  });

  test('@smoke assertion:B14-mobile-queue-close mobile queue-close is processed once and closing ignores further open-close inputs', async ({
    page
  }) => {
    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/en');

    const firstCard = page.locator('[data-card-id="test-rhythm-a"]');
    const secondCard = page.locator('[data-card-id="test-rhythm-b"]');
    await firstCard.getByTestId('landing-grid-card-trigger').click();

    const backdrop = page.getByTestId('landing-grid-mobile-backdrop');
    await backdrop.dispatchEvent('pointerdown', {
      pointerType: 'touch',
      clientX: 16,
      clientY: 16
    });
    await backdrop.dispatchEvent('pointerup', {
      pointerType: 'touch',
      clientX: 16,
      clientY: 16
    });

    await expect(firstCard).toHaveAttribute('data-mobile-snapshot-writes', '1');
    await expect(firstCard).toHaveAttribute('data-mobile-phase', /OPENING|CLOSING/u);

    await secondCard.getByTestId('landing-grid-card-trigger').click();
    await backdrop.dispatchEvent('pointerdown', {
      pointerType: 'touch',
      clientX: 20,
      clientY: 20
    });
    await backdrop.dispatchEvent('pointerup', {
      pointerType: 'touch',
      clientX: 20,
      clientY: 20
    });

    await expect(firstCard).toHaveAttribute('data-card-state', 'normal');
    await expect(secondCard).toHaveAttribute('data-card-state', 'normal');
  });

  test('@smoke assertion:B16-timeout stale pending transitions fail closed on non-destination routes', async ({page}) => {
    const events: Array<Record<string, unknown>> = [];

    await page.addInitScript(
      ([consentKey, pendingTransition]) => {
        window.localStorage.setItem(consentKey, 'OPTED_IN');
        window.sessionStorage.setItem('vibetest-landing-pending-transition', JSON.stringify(pendingTransition));
      },
      [
        TELEMETRY_CONSENT_STORAGE_KEY,
        {
          transitionId: 'transition-timeout-1',
          eventId: 'event-timeout-1',
          sourceCardId: 'test-rhythm-a',
          targetRoute: '/en/test/rhythm-a/question',
          targetType: 'test',
          startedAtMs: Date.now() - 5000,
          variant: 'rhythm-a',
          preAnswerChoice: 'A'
        }
      ] as const
    );
    await page.route('**/api/telemetry', async (route) => {
      const payload = route.request().postDataJSON();
      if (payload && typeof payload === 'object') {
        events.push(payload as Record<string, unknown>);
      }
      await route.fulfill({status: 204, body: ''});
    });

    await page.goto('/en/history');

    await expect
      .poll(() => events.find((event) => event.event_type === 'transition_fail')?.result_reason ?? null)
      .toBe('DESTINATION_TIMEOUT');
    await expect
      .poll(() => page.evaluate(() => window.sessionStorage.getItem('vibetest-landing-pending-transition')))
      .toBeNull();
  });

  test('@smoke assertion:B16-destination-load-error mismatched destination routes rollback pending transition state', async ({
    page
  }) => {
    const events: Array<Record<string, unknown>> = [];

    await page.addInitScript(
      ([consentKey, pendingTransition]) => {
        window.localStorage.setItem(consentKey, 'OPTED_IN');
        window.sessionStorage.setItem('vibetest-landing-pending-transition', JSON.stringify(pendingTransition));
      },
      [
        TELEMETRY_CONSENT_STORAGE_KEY,
        {
          transitionId: 'transition-load-error-1',
          eventId: 'event-load-error-1',
          sourceCardId: 'blog-build-metrics',
          targetRoute: '/en/blog',
          targetType: 'blog',
          startedAtMs: Date.now(),
          blogArticleId: 'build-metrics'
        }
      ] as const
    );
    await page.route('**/api/telemetry', async (route) => {
      const payload = route.request().postDataJSON();
      if (payload && typeof payload === 'object') {
        events.push(payload as Record<string, unknown>);
      }
      await route.fulfill({status: 204, body: ''});
    });

    await page.goto('/en/test/rhythm-a/question');

    await expect
      .poll(() => events.find((event) => event.event_type === 'transition_fail')?.result_reason ?? null)
      .toBe('DESTINATION_LOAD_ERROR');
    await expect
      .poll(() => page.evaluate(() => window.sessionStorage.getItem('vibetest-landing-pending-transition')))
      .toBeNull();
  });

  test('@smoke assertion:B16-user-cancel landing remount cancels stale pending transitions without leaks', async ({page}) => {
    const events: Array<Record<string, unknown>> = [];

    await page.addInitScript(
      ([consentKey, pendingTransition]) => {
        window.localStorage.setItem(consentKey, 'OPTED_IN');
        window.sessionStorage.setItem('vibetest-landing-pending-transition', JSON.stringify(pendingTransition));
      },
      [
        TELEMETRY_CONSENT_STORAGE_KEY,
        {
          transitionId: 'transition-user-cancel-1',
          eventId: 'event-user-cancel-1',
          sourceCardId: 'test-rhythm-a',
          targetRoute: '/en/test/rhythm-a/question',
          targetType: 'test',
          startedAtMs: Date.now(),
          variant: 'rhythm-a',
          preAnswerChoice: 'A'
        }
      ] as const
    );
    await page.route('**/api/telemetry', async (route) => {
      const payload = route.request().postDataJSON();
      if (payload && typeof payload === 'object') {
        events.push(payload as Record<string, unknown>);
      }
      await route.fulfill({status: 204, body: ''});
    });

    await page.goto('/en');

    await expect
      .poll(() => events.find((event) => event.event_type === 'transition_cancel')?.result_reason ?? null)
      .toBe('USER_CANCEL');
    await expect
      .poll(() => page.evaluate(() => window.sessionStorage.getItem('vibetest-landing-pending-transition')))
      .toBeNull();
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');
  });
});
