import {JSDOM} from 'jsdom';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {asVariantId} from '../../src/features/test/domain';
import {clearAllFlags, getFlag, setFlag, STATE_FLAG_NAMES, testVariantKey} from '../../src/features/test/storage';

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

describe('test storage state flags', () => {
  beforeEach(() => {
    installDom();
  });

  afterEach(() => {
    uninstallDom();
  });

  it('reads and writes each of the five flags independently', () => {
    const variantId = asVariantId('qmbti');

    for (const flagName of STATE_FLAG_NAMES) {
      expect(getFlag(variantId, flagName)).toBe(false);
    }

    setFlag(variantId, 'derivation_in_progress', true);
    setFlag(variantId, 'result_persisted', true);

    expect(getFlag(variantId, 'derivation_in_progress')).toBe(true);
    expect(getFlag(variantId, 'derivation_computed')).toBe(false);
    expect(getFlag(variantId, 'min_loading_duration_elapsed')).toBe(false);
    expect(getFlag(variantId, 'result_entry_committed')).toBe(false);
    expect(getFlag(variantId, 'result_persisted')).toBe(true);

    setFlag(variantId, 'derivation_in_progress', false);

    expect(getFlag(variantId, 'derivation_in_progress')).toBe(false);
    expect(window.localStorage.getItem(testVariantKey.flag(variantId, 'derivation_in_progress'))).toBeNull();
  });

  it('clears all five flags for a variant', () => {
    const variantId = asVariantId('qmbti');

    for (const flagName of STATE_FLAG_NAMES) {
      setFlag(variantId, flagName, true);
    }

    clearAllFlags(variantId);

    for (const flagName of STATE_FLAG_NAMES) {
      expect(getFlag(variantId, flagName)).toBe(false);
    }
  });

  it('does not clear another variant flags', () => {
    const qmbti = asVariantId('qmbti');
    const egtt = asVariantId('egtt');

    setFlag(qmbti, 'result_entry_committed', true);
    setFlag(egtt, 'result_entry_committed', true);
    setFlag(egtt, 'result_persisted', true);

    clearAllFlags(qmbti);

    expect(getFlag(qmbti, 'result_entry_committed')).toBe(false);
    expect(getFlag(egtt, 'result_entry_committed')).toBe(true);
    expect(getFlag(egtt, 'result_persisted')).toBe(true);
  });
});
