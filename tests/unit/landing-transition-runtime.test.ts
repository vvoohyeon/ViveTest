import {JSDOM} from 'jsdom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {resetTelemetryRuntimeForTests, syncTelemetryConsent} from '../../src/features/landing/telemetry/runtime';
import {
  beginLandingTransition,
  terminatePendingLandingTransition
} from '../../src/features/landing/transition/runtime';
import {LANDING_TRANSITION_SIGNAL_EVENT} from '../../src/features/landing/transition/signals';
import {readLandingIngress, readPendingLandingTransition} from '../../src/features/landing/transition/store';

const TELEMETRY_CONSENT_STORAGE_KEY = 'vivetest-telemetry-consent';

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

  it('emits internal start=1 and terminal=1 for cancel paths and clears pending state', () => {
    const signals: Array<Record<string, unknown>> = [];
    window.addEventListener(LANDING_TRANSITION_SIGNAL_EVENT, ((event: Event) => {
      if (event instanceof window.CustomEvent) {
        signals.push(event.detail as Record<string, unknown>);
      }
    }) as EventListener);

    const pending = beginLandingTransition({
      locale: 'en',
      route: '/en',
      sourceCardId: 'blog-build-metrics',
      targetType: 'blog',
      targetRoute: '/en/blog',
      blogArticleId: 'build-metrics'
    });

    expect(pending?.transitionId).toBeTruthy();
    expect(readPendingLandingTransition()?.transitionId).toBe(pending?.transitionId);

    const terminal = terminatePendingLandingTransition({
      signal: 'transition_cancel',
      resultReason: 'USER_CANCEL'
    });

    expect(terminal?.transitionId).toBe(pending?.transitionId);
    expect(readPendingLandingTransition()).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    expect(signals.map((signal) => signal.signal)).toEqual(['transition_start', 'transition_cancel']);
    expect(signals[0]?.sourceCardId).toBe('blog-build-metrics');
    expect(signals[1]?.transitionId).toBe(signals[0]?.transitionId);
    expect(signals[1]?.resultReason).toBe('USER_CANCEL');

    const secondTerminal = terminatePendingLandingTransition({
      signal: 'transition_cancel',
      resultReason: 'USER_CANCEL'
    });
    expect(secondTerminal).toBeNull();
    expect(signals).toHaveLength(2);
  });

  it('keeps card_answered public telemetry while duplicate-locale test ingress fails closed internally', () => {
    const signals: Array<Record<string, unknown>> = [];
    window.addEventListener(LANDING_TRANSITION_SIGNAL_EVENT, ((event: Event) => {
      if (event instanceof window.CustomEvent) {
        signals.push(event.detail as Record<string, unknown>);
      }
    }) as EventListener);

    const pending = beginLandingTransition({
      locale: 'en',
      route: '/en',
      sourceCardId: 'test-rhythm-a',
      targetType: 'test',
      targetRoute: '/en/en/test/rhythm-a',
      variant: 'rhythm-a',
      preAnswerChoice: 'A'
    });

    expect(pending).toBeNull();
    expect(readPendingLandingTransition()).toBeNull();
    expect(readLandingIngress('rhythm-a')).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(signals.map((signal) => signal.signal)).toEqual(['transition_start', 'transition_fail']);
    expect(signals[1]?.resultReason).toBe('DUPLICATE_LOCALE');

    const [cardAnsweredCall] = vi.mocked(fetch).mock.calls;
    const cardAnsweredPayload = JSON.parse(String(cardAnsweredCall?.[1]?.body ?? '{}'));
    expect(cardAnsweredPayload.event_type).toBe('card_answered');
    expect(cardAnsweredPayload.source_card_id).toBe('test-rhythm-a');
    expect(cardAnsweredPayload.target_route).toBe('/en/en/test/rhythm-a');
    expect(cardAnsweredPayload.landing_ingress_flag).toBe(true);
  });
});
