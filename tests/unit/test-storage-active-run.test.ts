import {JSDOM} from 'jsdom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {asVariantId} from '../../src/features/test/domain';
import {getActiveRun, saveActiveRun, testVariantKey} from '../../src/features/test/storage';

function installDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/en/test/qmbti'
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

describe('test storage active run', () => {
  beforeEach(() => {
    installDom();
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
  });

  afterEach(() => {
    vi.useRealTimers();
    uninstallDom();
  });

  it('assertion:B5-active-run-timeout-boundary-unit returns null and volatilizes after 30 minutes', () => {
    const variantId = asVariantId('qmbti');
    saveActiveRun(variantId, {
      variantId,
      startedAtMs: Date.now(),
      lastAnsweredAtMs: Date.now()
    });

    vi.advanceTimersByTime(30 * 60 * 1000);

    expect(getActiveRun(variantId)).toBeNull();
    expect(window.localStorage.getItem(testVariantKey.activeRun(variantId))).toBeNull();
  });

  it('keeps the active run valid at 29 minutes 59 seconds', () => {
    const variantId = asVariantId('qmbti');
    const run = {
      variantId,
      startedAtMs: Date.now(),
      lastAnsweredAtMs: Date.now()
    };

    saveActiveRun(variantId, run);
    vi.advanceTimersByTime(29 * 60 * 1000 + 59 * 1000);

    expect(getActiveRun(variantId)).toEqual(run);
  });

  it('returns the same valid active run that was saved', () => {
    const variantId = asVariantId('qmbti');
    const run = {
      variantId,
      startedAtMs: 900_000,
      lastAnsweredAtMs: 950_000
    };

    saveActiveRun(variantId, run);

    expect(getActiveRun(variantId)).toEqual(run);
  });

  it('does not remove another variant active run when one variant times out', () => {
    const qmbti = asVariantId('qmbti');
    const egtt = asVariantId('egtt');
    saveActiveRun(qmbti, {
      variantId: qmbti,
      startedAtMs: Date.now(),
      lastAnsweredAtMs: Date.now()
    });

    vi.advanceTimersByTime(1000);

    const egttRun = {
      variantId: egtt,
      startedAtMs: Date.now(),
      lastAnsweredAtMs: Date.now()
    };
    saveActiveRun(egtt, egttRun);

    vi.advanceTimersByTime(30 * 60 * 1000 - 1000);

    expect(getActiveRun(qmbti)).toBeNull();
    expect(getActiveRun(egtt)).toEqual(egttRun);
  });
});
