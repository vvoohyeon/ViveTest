import {JSDOM} from 'jsdom';
import {afterEach, describe, expect, it} from 'vitest';

import {
  buildInstructionSeenStorageKey,
  buildVariantScopedTestStorageKey,
  hasSeenInstruction,
  markInstructionSeen
} from '../../src/features/test/storage';
import {parseTestVariantId} from '../../src/features/test/types';

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

describe('test storage', () => {
  afterEach(() => {
    uninstallDom();
  });

  it('builds variant-scoped storage keys for test-owned runtime flags', () => {
    const variantId = parseTestVariantId('qmbti');
    expect(variantId).not.toBeNull();
    if (!variantId) {
      return;
    }

    expect(buildVariantScopedTestStorageKey(variantId, 'instruction-seen')).toBe('vivetest-test:qmbti:instruction-seen');
    expect(buildInstructionSeenStorageKey(variantId)).toBe('vivetest-test:qmbti:instruction-seen');
  });

  it('persists instructionSeen in the test namespace only', () => {
    installDom();
    const variantId = parseTestVariantId('qmbti');
    expect(variantId).not.toBeNull();
    if (!variantId) {
      return;
    }

    expect(hasSeenInstruction(variantId)).toBe(false);
    markInstructionSeen(variantId);

    expect(hasSeenInstruction(variantId)).toBe(true);
    expect(window.sessionStorage.getItem('vivetest-test:qmbti:instruction-seen')).toBe('true');
    expect(window.sessionStorage.getItem('vivetest-landing-ingress:qmbti')).toBeNull();
  });
});
