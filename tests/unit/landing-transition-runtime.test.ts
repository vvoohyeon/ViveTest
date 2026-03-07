import {JSDOM} from 'jsdom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {resetTelemetryRuntimeForTests, syncTelemetryConsent} from '../../src/features/landing/telemetry/runtime';
import {
  beginLandingTransition,
  terminatePendingLandingTransition
} from '../../src/features/landing/transition/runtime';
import {readPendingLandingTransition} from '../../src/features/landing/transition/store';

const TELEMETRY_CONSENT_STORAGE_KEY = 'vibetest-telemetry-consent';

function installDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/en'
  });

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: dom.window
  });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: dom.window.document
  });
}

function uninstallDom() {
  // @ts-expect-error test cleanup
  delete globalThis.window;
  // @ts-expect-error test cleanup
  delete globalThis.document;
}

describe('landing transition runtime', () => {
  beforeEach(() => {
    installDom();
    resetTelemetryRuntimeForTests();
    window.localStorage.setItem(TELEMETRY_CONSENT_STORAGE_KEY, 'OPTED_IN');
    syncTelemetryConsent();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input, init) => ({
        ok: true,
        status: 204,
        body: init?.body ?? null
      }))
    );
  });

  afterEach(() => {
    resetTelemetryRuntimeForTests();
    vi.unstubAllGlobals();
    uninstallDom();
  });

  it('emits start=1 and terminal=1 for cancel paths and clears pending state', () => {
    const pending = beginLandingTransition({
      locale: 'en',
      route: '/en',
      sourceCardId: 'test-rhythm-a',
      targetType: 'blog',
      targetRoute: '/en/blog',
      blogArticleId: 'build-metrics'
    });

    expect(pending?.transitionId).toBeTruthy();
    expect(readPendingLandingTransition()?.transitionId).toBe(pending?.transitionId);

    const terminal = terminatePendingLandingTransition({
      locale: 'en',
      route: '/en',
      eventType: 'transition_cancel',
      resultReason: 'USER_CANCEL'
    });

    expect(terminal?.transitionId).toBe(pending?.transitionId);
    expect(readPendingLandingTransition()).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);

    const [startCall, terminalCall] = vi.mocked(fetch).mock.calls;
    const startPayload = JSON.parse(String(startCall?.[1]?.body ?? '{}'));
    const terminalPayload = JSON.parse(String(terminalCall?.[1]?.body ?? '{}'));

    expect(startPayload.event_type).toBe('transition_start');
    expect(terminalPayload.event_type).toBe('transition_cancel');
    expect(terminalPayload.transition_id).toBe(startPayload.transition_id);
    expect(terminalPayload.result_reason).toBe('USER_CANCEL');

    const secondTerminal = terminatePendingLandingTransition({
      locale: 'en',
      route: '/en',
      eventType: 'transition_cancel',
      resultReason: 'USER_CANCEL'
    });
    expect(secondTerminal).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('fails duplicate-locale target routes immediately without leaking pending transition state', () => {
    const pending = beginLandingTransition({
      locale: 'en',
      route: '/en',
      sourceCardId: 'blog-build-metrics',
      targetType: 'blog',
      targetRoute: '/en/en/blog',
      blogArticleId: 'build-metrics'
    });

    expect(pending).toBeNull();
    expect(readPendingLandingTransition()).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);

    const [, failCall] = vi.mocked(fetch).mock.calls;
    const failPayload = JSON.parse(String(failCall?.[1]?.body ?? '{}'));
    expect(failPayload.event_type).toBe('transition_fail');
    expect(failPayload.result_reason).toBe('DUPLICATE_LOCALE');
  });
});
