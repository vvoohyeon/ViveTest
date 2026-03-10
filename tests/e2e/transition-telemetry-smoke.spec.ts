import {expect, test} from '@playwright/test';

const TELEMETRY_CONSENT_STORAGE_KEY = 'vibetest-telemetry-consent';
const TRANSITION_OVERLAY_READY_DELAY_MS = 180;

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

test.describe('Phase 10/11 transition + telemetry smoke', () => {
  test('@smoke assertion:B6-transition-ingress assertion:B15-transition-correlation assertion:B18-final-submit-payload landing test transition keeps source GNB until destination-ready and records ingress, attempt_start, and final_submit payload completeness', async ({
    page
  }) => {
    const events: Array<Record<string, unknown>> = [];

    await delayDestinationReadyRaf(page);
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
    await expectSourceGnbOverlay(page, 'test');
    await expect(page.getByTestId('landing-transition-source-gnb')).toContainText('VibeTest');
    await expect(page.getByTestId('landing-transition-source-gnb')).toBeHidden({timeout: 1500});
    await expect(page.getByTestId('test-instruction-overlay')).toBeVisible();
    await expect(page.getByTestId('test-progress')).toHaveText('Question 2 of 4');
    await expect
      .poll(() => page.evaluate(() => window.sessionStorage.getItem('vibetest-landing-ingress:rhythm-a')))
      .not.toBeNull();

    await page.reload();
    await expect(page).toHaveURL(/\/en\/test\/rhythm-a\/question$/u);
    await expect(page.getByTestId('test-instruction-overlay')).toBeVisible();
    await expect(page.getByTestId('test-progress')).toHaveText('Question 2 of 4');

    await page.getByTestId('test-start-button').click();
    await expect(page.getByTestId('test-progress')).toHaveText('Question 2 of 4');
    await expect
      .poll(() => page.evaluate(() => window.sessionStorage.getItem('vibetest-landing-ingress:rhythm-a')))
      .toBeNull();

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

  test('@smoke assertion:B6-transition-ingress test route re-entry without ingress falls back to Q1 after start consumes ingress', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const testCard = page.locator('[data-card-id="test-rhythm-a"]');
    await testCard.getByTestId('landing-grid-card-trigger').click();
    await testCard.locator('[data-slot="answerChoiceA"]').click();

    await expect(page).toHaveURL(/\/en\/test\/rhythm-a\/question$/u);
    await expect(page.getByTestId('test-instruction-overlay')).toBeVisible();
    await expect(page.getByTestId('test-progress')).toHaveText('Question 2 of 4');

    await page.getByTestId('test-start-button').click();
    await expect
      .poll(() => page.evaluate(() => window.sessionStorage.getItem('vibetest-landing-ingress:rhythm-a')))
      .toBeNull();

    await page.goto('/en');
    await page.goto('/en/test/rhythm-a/question');
    await expect(page.getByTestId('test-instruction-overlay')).toBeHidden();
    await expect(page.getByTestId('test-progress')).toHaveText('Question 1 of 4');
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

  test('@smoke assertion:B15-transition-correlation assertion:B17-return-restore blog transition keeps source GNB until destination-ready and landing return restores scroll once', async ({
    page
  }) => {
    await delayDestinationReadyRaf(page);
    await page.setViewportSize({width: 1440, height: 720});
    await page.goto('/en');

    const blogCard = page.locator('[data-card-id="blog-build-metrics"]');
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
    await blogCard.getByTestId('landing-grid-card-trigger').click();
    const scrollBefore = await page.evaluate(() => window.scrollY);
    expect(Math.abs(scrollBefore - preparedScrollY)).toBeLessThanOrEqual(1);
    expect(Math.abs(sourceCardRestoreCandidate - scrollBefore)).toBeGreaterThan(40);
    await blogCard.locator('[data-slot="primaryCTA"]').click();

    await expect(page).toHaveURL(/\/en\/blog$/u);
    await expectSourceGnbOverlay(page, 'blog');
    await expect(page.getByTestId('landing-transition-source-gnb')).toBeHidden({timeout: 1500});
    await expect(page.getByTestId('blog-selected-article')).toContainText('Build Metrics That Actually Matter');
    const savedReturnScroll = await page.evaluate(() =>
      Number(window.sessionStorage.getItem('vibetest-landing-return-scroll-y') ?? '0')
    );
    await expect
      .poll(() => page.evaluate(() => window.sessionStorage.getItem('vibetest-landing-return-scroll-y')))
      .not.toBeNull();

    await page.getByRole('link', {name: 'VibeTest'}).first().click();
    await expect(page).toHaveURL(/\/en$/u);
    await expect
      .poll(() => page.evaluate(() => window.sessionStorage.getItem('vibetest-landing-return-scroll-y')))
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
    expect(restoredScroll).toBeGreaterThanOrEqual(scrollBefore);
    expect(Math.abs(restoredScroll - expectedRestoredScroll)).toBeLessThanOrEqual(2);
    const restoredSourceAnchor = await page.locator('[data-card-id="blog-build-metrics"]').evaluate((element) =>
      Math.max(0, Math.round(element.getBoundingClientRect().top + window.scrollY - 96))
    );
    expect(Math.abs(restoredSourceAnchor - expectedRestoredScroll)).toBeGreaterThan(40);
  });

  test('@smoke assertion:B14-mobile-baseline mobile expanded lifecycle keeps transition-window anchor, title baseline, unlock timing, and restore gating stable', async ({
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
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');
    const afterOpen = await card.boundingBox();
    const afterOpenTitleTop = await card
      .locator('[data-slot="cardTitle"]')
      .evaluate((element) => element.getBoundingClientRect().top);
    expect(Math.abs((afterOpen?.y ?? 0) - (before?.y ?? 0))).toBeLessThanOrEqual(1);
    expect(Math.abs(afterOpenTitleTop - beforeTitleTop)).toBeLessThanOrEqual(1);
    const activeCardElementAtPoint = await card.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const target = document.elementFromPoint(rect.left + rect.width / 2, rect.top + 32);
      return target?.closest('[data-testid="landing-grid-card"]')?.getAttribute('data-card-id') ?? null;
    });
    expect(activeCardElementAtPoint).toBe('test-rhythm-a');

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
    await expect(card).toHaveAttribute('data-card-state', 'normal');
    await expect(card).toHaveAttribute('data-mobile-phase', 'CLOSING');
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    await expect(trigger).toHaveAttribute('data-trigger-state', 'collapsed');
    await expect
      .poll(() => shell.getAttribute('data-mobile-restore-ready-card-id'))
      .toBe('test-rhythm-a');
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');
  });

  test('@smoke assertion:B14-mobile-open-continuity mobile open keeps the root footprint stable while the transient shell morphs into the expanded surface', async ({
    page
  }) => {
    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/en');

    const card = page.locator('[data-card-id="test-rhythm-a"]');
    const before = await card.boundingBox();
    const beforeTitleTop = await card
      .locator('[data-slot="cardTitle"]')
      .evaluate((element) => element.getBoundingClientRect().top);

    expect(before).not.toBeNull();
    await card.getByTestId('landing-grid-card-trigger').click();

    await expect(card).toHaveAttribute('data-mobile-transient-mode', 'OPENING');
    await expect(card).toHaveAttribute('data-expanded-layer', 'mobile-opening-shell');
    await expect(card.locator('[data-slot="mobileTransientShell"]')).toHaveAttribute('data-state', 'OPENING');

    const duringOpen = await card.boundingBox();
    expect(Math.abs((duringOpen?.width ?? 0) - (before?.width ?? 0))).toBeLessThanOrEqual(2);
    expect(Math.abs((duringOpen?.height ?? 0) - (before?.height ?? 0))).toBeLessThanOrEqual(2);

    const zOrder = await page.evaluate(() => {
      const transient = document.querySelector<HTMLElement>('[data-slot="mobileTransientShell"]');
      const backdrop = document.querySelector<HTMLElement>('[data-testid="landing-grid-mobile-backdrop"]');
      return {
        transient: transient ? Number.parseInt(getComputedStyle(transient).zIndex || '0', 10) : 0,
        backdrop: backdrop ? Number.parseInt(getComputedStyle(backdrop).zIndex || '0', 10) : 0
      };
    });
    expect(zOrder.transient).toBeGreaterThan(zOrder.backdrop);

    await expect(card).toHaveAttribute('data-mobile-phase', 'OPEN');
    await expect(card).toHaveAttribute('data-expanded-layer', 'mobile-in-flow');

    const afterOpenTitleTop = await card
      .locator('[data-slot="cardTitle"]')
      .evaluate((element) => element.getBoundingClientRect().top);
    expect(Math.abs(afterOpenTitleTop - beforeTitleTop)).toBeLessThanOrEqual(1);
  });

  test('@smoke assertion:B14-mobile-close-perception assertion:B14-mobile-close-choreography assertion:B14-mobile-title-continuity mobile close immediately restores the root footprint while keeping the active closing shell above the backdrop', async ({
    page
  }) => {
    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/en');

    const card = page.locator('[data-card-id="test-rhythm-a"]');
    const before = await card.boundingBox();

    expect(before).not.toBeNull();
    await card.getByTestId('landing-grid-card-trigger').click();
    await expect(card).toHaveAttribute('data-mobile-phase', 'OPEN');
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');

    const userScrolledY = await page.evaluate(() => {
      window.scrollBy(0, 220);
      return Math.round(window.scrollY);
    });
    expect(userScrolledY).toBeGreaterThan(0);
    await expect
      .poll(() => page.evaluate(() => Math.round(window.scrollY)))
      .toBeGreaterThanOrEqual(userScrolledY - 1);

    const backdrop = page.getByTestId('landing-grid-mobile-backdrop');
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

    await expect(card).toHaveAttribute('data-card-state', 'normal');
    await expect(card).toHaveAttribute('data-mobile-phase', 'CLOSING');
    await expect(card).toHaveAttribute('data-expanded-layer', 'mobile-closing-shell');
    await expect(card).toHaveAttribute('data-mobile-transient-mode', 'CLOSING');
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden');

    const afterClose = await card.boundingBox();
    expect(Math.abs((afterClose?.width ?? 0) - (before?.width ?? 0))).toBeLessThanOrEqual(2);
    expect(Math.abs((afterClose?.height ?? 0) - (before?.height ?? 0))).toBeLessThanOrEqual(2);

    await page.waitForTimeout(140);

    const rootTitleOpacity = await card
      .locator('.landing-grid-card-content > [data-slot="cardTitle"]')
      .evaluate((element) => Number.parseFloat(getComputedStyle(element).opacity));
    const transientTitleOpacity = await card
      .locator('[data-slot="mobileTransientShell"] [data-slot="cardTitleTransient"]')
      .evaluate((element) => Number.parseFloat(getComputedStyle(element).opacity));

    expect(rootTitleOpacity).toBe(0);
    expect(transientTitleOpacity).toBeGreaterThanOrEqual(0.95);

    const closingPreviewAnimation = await card
      .locator('[data-slot="mobileTransientShell"] [data-motion-slot="preview"]')
      .evaluate((element) => getComputedStyle(element).animationName);
    expect(closingPreviewAnimation).toContain('landing-card-detail-quiet-exit');

    const zOrder = await page.evaluate(() => {
      const transient = document.querySelector<HTMLElement>('[data-slot="mobileTransientShell"]');
      const backdrop = document.querySelector<HTMLElement>('[data-testid="landing-grid-mobile-backdrop"]');
      return {
        transient: transient ? Number.parseInt(getComputedStyle(transient).zIndex || '0', 10) : 0,
        backdrop: backdrop ? Number.parseInt(getComputedStyle(backdrop).zIndex || '0', 10) : 0
      };
    });
    expect(zOrder.transient).toBeGreaterThan(zOrder.backdrop);

    await expect(backdrop).toHaveAttribute('data-state', 'CLOSING');
    await expect(card).toHaveAttribute('data-mobile-phase', 'NORMAL');
    await expect(card).toHaveAttribute('data-mobile-transient-mode', 'NONE');
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');
    await expect
      .poll(() => page.evaluate(() => Math.round(window.scrollY)))
      .toBeGreaterThanOrEqual(userScrolledY - 1);
    await expect(card.locator('.landing-grid-card-content > [data-slot="cardTitle"]')).toHaveCSS('opacity', '1');
  });

  test('@smoke assertion:B14-mobile-reduced-motion mobile reduced-motion / V1 low-spec fallback keeps continuity markers while simplifying slot motion', async ({
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
    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/en');

    const shell = page.getByTestId('landing-grid-shell');
    const card = page.locator('[data-card-id="test-rhythm-a"]');
    const trigger = card.getByTestId('landing-grid-card-trigger');

    await expect(shell).toHaveAttribute('data-page-state', 'REDUCED_MOTION');
    const motionToken = await card.evaluate((element) =>
      getComputedStyle(element).getPropertyValue('--landing-card-motion-ms').trim()
    );
    const normalizedMotionMs = motionToken.endsWith('ms') ? parseFloat(motionToken) : parseFloat(motionToken) * 1000;
    expect(normalizedMotionMs).toBe(180);

    await trigger.click();
    await expect(card).toHaveAttribute('data-expanded-layer', 'mobile-opening-shell');

    const openingShellAnimation = await card
      .locator('[data-slot="mobileTransientShell"]')
      .evaluate((element) => getComputedStyle(element).animationName);
    expect(openingShellAnimation).toContain('landing-card-shell-reduced-open');

    const openingPreviewAnimation = await card
      .locator('[data-slot="mobileTransientShell"] [data-motion-slot="preview"]')
      .evaluate((element) => getComputedStyle(element).animationName);
    expect(openingPreviewAnimation).toContain('landing-card-shell-reduced-open');

    await expect(card).toHaveAttribute('data-mobile-phase', 'OPEN');
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');

    const backdrop = page.getByTestId('landing-grid-mobile-backdrop');
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

    await expect(card).toHaveAttribute('data-expanded-layer', 'mobile-closing-shell');
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden');

    const closingShellAnimation = await card
      .locator('[data-slot="mobileTransientShell"]')
      .evaluate((element) => getComputedStyle(element).animationName);
    expect(closingShellAnimation).toContain('landing-card-shell-reduced-close');

    const closingPreviewAnimation = await card
      .locator('[data-slot="mobileTransientShell"] [data-motion-slot="preview"]')
      .evaluate((element) => getComputedStyle(element).animationName);
    expect(closingPreviewAnimation).toContain('landing-card-shell-reduced-open');

    const reducedMotionTransientTitleOpacity = await card
      .locator('[data-slot="mobileTransientShell"] [data-slot="cardTitleTransient"]')
      .evaluate((element) => Number.parseFloat(getComputedStyle(element).opacity));
    expect(reducedMotionTransientTitleOpacity).toBeGreaterThanOrEqual(0.95);

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
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

  test('@smoke mobile expanded header remains sticky during internal scroll', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/en');

    const card = page.locator('[data-card-id="blog-ops-handbook"]');
    await card.getByTestId('landing-grid-card-trigger').click();

    const expandedBody = card.locator('[data-slot="expandedBody"]');
    const header = card.locator('[data-slot="mobileHeader"]');
    const headerTopBefore = await header.evaluate((element) => element.getBoundingClientRect().top);

    await expandedBody.evaluate((element) => {
      element.scrollTop = 120;
      element.dispatchEvent(new Event('scroll'));
    });

    const headerTopAfter = await header.evaluate((element) => element.getBoundingClientRect().top);
    expect(Math.abs(headerTopAfter - headerTopBefore)).toBeLessThanOrEqual(1);
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

    await page.goto('/en/history');
    await expectSourceGnbOverlay(page, 'history');

    await expect
      .poll(() => events.find((event) => event.event_type === 'transition_fail')?.result_reason ?? null)
      .toBe('DESTINATION_TIMEOUT');
    await expect(page.getByTestId('landing-transition-source-gnb')).toHaveCount(0);
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
    await expect(page.getByTestId('landing-transition-source-gnb')).toHaveCount(0);
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
