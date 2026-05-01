import {JSDOM} from 'jsdom';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {variantSessionKeys} from '../../src/features/landing/storage/storage-keys';
import {asVariantId, type VariantId} from '../../src/features/test/domain';
import {
  saveActiveRun,
  setFlag,
  STATE_FLAG_NAMES,
  testVariantKey,
  volatilizeRunData,
  type VolatilityTrigger
} from '../../src/features/test/storage';

const VOLATILITY_TRIGGERS: VolatilityTrigger[] = ['result_entry_committed', 'inactivity', 'restart'];

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

function cleanupKeys(variantId: VariantId) {
  return [
    testVariantKey.activeRun(variantId),
    testVariantKey.responseSet(variantId),
    ...STATE_FLAG_NAMES.map((flagName) => testVariantKey.flag(variantId, flagName))
  ];
}

function seedRunContinuationData(variantId: VariantId) {
  saveActiveRun(variantId, {
    variantId,
    startedAtMs: 1,
    lastAnsweredAtMs: 2
  });
  window.localStorage.setItem(testVariantKey.responseSet(variantId), JSON.stringify({q1: 'A'}));
  for (const flagName of STATE_FLAG_NAMES) {
    setFlag(variantId, flagName, true);
  }
  window.sessionStorage.setItem(variantSessionKeys.instructionSeen(variantId), 'true');
}

function expectRunContinuationDataDeleted(variantId: VariantId) {
  for (const key of cleanupKeys(variantId)) {
    expect(window.localStorage.getItem(key)).toBeNull();
  }
  expect(window.sessionStorage.getItem(variantSessionKeys.instructionSeen(variantId))).toBeNull();
}

function expectRunContinuationDataPreserved(variantId: VariantId) {
  for (const key of cleanupKeys(variantId)) {
    expect(window.localStorage.getItem(key)).not.toBeNull();
  }
  expect(window.sessionStorage.getItem(variantSessionKeys.instructionSeen(variantId))).toBe('true');
}

describe('test storage volatility', () => {
  beforeEach(() => {
    installDom();
  });

  afterEach(() => {
    uninstallDom();
  });

  it('assertion:B6-volatility-trigger-cleanup-unit deletes the same run-continuation data for all three triggers', () => {
    const variantId = asVariantId('qmbti');

    for (const trigger of VOLATILITY_TRIGGERS) {
      window.localStorage.clear();
      window.sessionStorage.clear();
      seedRunContinuationData(variantId);

      volatilizeRunData(variantId, trigger);

      expectRunContinuationDataDeleted(variantId);
    }
  });

  it('keeps another variant run-continuation data intact', () => {
    const qmbti = asVariantId('qmbti');
    const egtt = asVariantId('egtt');

    seedRunContinuationData(qmbti);
    seedRunContinuationData(egtt);

    volatilizeRunData(qmbti, 'restart');

    expectRunContinuationDataDeleted(qmbti);
    expectRunContinuationDataPreserved(egtt);
  });

  it('deletes the legacy instructionSeen session key through variantSessionKeys', () => {
    const variantId = asVariantId('qmbti');
    const legacyInstructionKey = variantSessionKeys.instructionSeen(variantId);

    window.sessionStorage.setItem(legacyInstructionKey, 'true');

    volatilizeRunData(variantId, 'result_entry_committed');

    expect(window.sessionStorage.getItem(legacyInstructionKey)).toBeNull();
  });

  it('assertion:B17-cleanup-set-zero-residue-unit leaves zero Phase 3 cleanup-set residue for the target variant', () => {
    const variantId = asVariantId('qmbti');

    seedRunContinuationData(variantId);

    volatilizeRunData(variantId, 'inactivity');

    expect(cleanupKeys(variantId).filter((key) => window.localStorage.getItem(key) !== null)).toEqual([]);
    expect(window.sessionStorage.getItem(variantSessionKeys.instructionSeen(variantId))).toBeNull();
  });

  // Variant-switch cleanup is Phase 4 owned and is intentionally not modeled as a volatilizeRunData() trigger.
});
