import {JSDOM} from 'jsdom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {
  getTelemetryRuntimeQueueLengthForTests,
  resetTelemetryRuntimeForTests,
  setTelemetryConsentState,
  syncTelemetryConsent,
  trackLandingView
} from '../../src/features/landing/telemetry/runtime';

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

describe('landing telemetry runtime', () => {
  beforeEach(() => {
    installDom();
    resetTelemetryRuntimeForTests();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 204
      }))
    );
  });

  afterEach(() => {
    resetTelemetryRuntimeForTests();
    vi.unstubAllGlobals();
    uninstallDom();
  });

  it('flushes UNKNOWN-queued events when same-tab consent switches to OPTED_IN', async () => {
    trackLandingView({
      locale: 'en',
      route: '/en'
    });

    expect(getTelemetryRuntimeQueueLengthForTests()).toBe(1);
    const snapshot = setTelemetryConsentState('OPTED_IN');
    await Promise.resolve();

    expect(snapshot.consentState).toBe('OPTED_IN');
    expect(snapshot.sessionId).not.toBeNull();
    expect(getTelemetryRuntimeQueueLengthForTests()).toBe(0);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('discards UNKNOWN-queued events when same-tab consent switches to OPTED_OUT', () => {
    trackLandingView({
      locale: 'en',
      route: '/en'
    });

    expect(getTelemetryRuntimeQueueLengthForTests()).toBe(1);
    const snapshot = setTelemetryConsentState('OPTED_OUT');

    expect(snapshot.consentState).toBe('OPTED_OUT');
    expect(snapshot.sessionId).toBeNull();
    expect(getTelemetryRuntimeQueueLengthForTests()).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('can still resync consent state from persisted storage', () => {
    window.localStorage.setItem(TELEMETRY_CONSENT_STORAGE_KEY, 'OPTED_OUT');

    const snapshot = syncTelemetryConsent();

    expect(snapshot.consentState).toBe('OPTED_OUT');
    expect(snapshot.synced).toBe(true);
  });

  it('treats missing persisted consent as UNKNOWN while keeping network sends blocked', () => {
    window.localStorage.removeItem(TELEMETRY_CONSENT_STORAGE_KEY);

    const snapshot = syncTelemetryConsent();
    trackLandingView({
      locale: 'en',
      route: '/en'
    });

    expect(snapshot.consentState).toBe('UNKNOWN');
    expect(snapshot.sessionId).toBeNull();
    expect(getTelemetryRuntimeQueueLengthForTests()).toBe(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('treats invalid persisted consent as OPTED_OUT for safety', () => {
    window.localStorage.setItem(TELEMETRY_CONSENT_STORAGE_KEY, 'maybe-later');

    const snapshot = syncTelemetryConsent();

    expect(snapshot.consentState).toBe('OPTED_OUT');
    expect(snapshot.synced).toBe(true);
    expect(snapshot.sessionId).toBeNull();
  });

  it('blocks network sends when random sources are unavailable even after OPTED_IN sync', () => {
    const originalCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {}
    });

    try {
      window.localStorage.setItem(TELEMETRY_CONSENT_STORAGE_KEY, 'OPTED_IN');

      const snapshot = syncTelemetryConsent();
      trackLandingView({
        locale: 'en',
        route: '/en'
      });

      expect(snapshot.consentState).toBe('OPTED_IN');
      expect(snapshot.sessionId).toBeNull();
      expect(getTelemetryRuntimeQueueLengthForTests()).toBe(1);
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        value: originalCrypto
      });
    }
  });
});
