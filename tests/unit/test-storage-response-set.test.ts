import {JSDOM} from 'jsdom';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {asVariantId} from '../../src/features/test/domain';
import {readResponseSet, testVariantKey, writeResponseSet} from '../../src/features/test/storage';

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
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: dom.window.localStorage
  });
}

function uninstallDom() {
  // @ts-expect-error test cleanup
  delete globalThis.window;
  // @ts-expect-error test cleanup
  delete globalThis.document;
  // @ts-expect-error test cleanup
  delete globalThis.localStorage;
}

describe('test storage response set', () => {
  beforeEach(() => {
    installDom();
  });

  afterEach(() => {
    uninstallDom();
  });

  it('round-trips canonical response entries with semantic values', () => {
    const variantId = asVariantId('qmbti');

    writeResponseSet(variantId, {'1': 'A', '2': 'B', '3': 'M'});

    expect(readResponseSet(variantId)).toEqual({'1': 'A', '2': 'B', '3': 'M'});
  });

  it('returns null when the response key is missing', () => {
    expect(readResponseSet(asVariantId('qmbti'))).toBeNull();
  });

  it('returns null and removes the target key for malformed JSON', () => {
    const variantId = asVariantId('qmbti');
    const key = testVariantKey.responseSet(variantId);
    window.localStorage.setItem(key, '{broken');

    expect(readResponseSet(variantId)).toBeNull();
    expect(window.localStorage.getItem(key)).toBeNull();
  });

  it('returns null and removes the target key for non-object JSON payloads', () => {
    const variantId = asVariantId('qmbti');
    const key = testVariantKey.responseSet(variantId);

    for (const payload of [JSON.stringify(['A']), JSON.stringify('A'), JSON.stringify(1)]) {
      window.localStorage.setItem(key, payload);

      expect(readResponseSet(variantId)).toBeNull();
      expect(window.localStorage.getItem(key)).toBeNull();
    }
  });

  it('filters non-canonical keys and keeps only positive integer string keys', () => {
    const variantId = asVariantId('qmbti');
    window.localStorage.setItem(
      testVariantKey.responseSet(variantId),
      JSON.stringify({
        '0': 'A',
        '1': 'A',
        '01': 'A',
        '-1': 'B',
        q1: 'B'
      })
    );

    expect(readResponseSet(variantId)).toEqual({'1': 'A'});
  });

  it('filters non-string values and returns null when no valid entries remain', () => {
    const variantId = asVariantId('qmbti');
    const key = testVariantKey.responseSet(variantId);

    window.localStorage.setItem(
      key,
      JSON.stringify({
        '1': 'A',
        '2': 'C',
        '3': null,
        '4': 'B'
      })
    );

    expect(readResponseSet(variantId)).toEqual({'1': 'A', '2': 'C', '4': 'B'});

    window.localStorage.setItem(key, JSON.stringify({'1': null, q1: 'A'}));

    expect(readResponseSet(variantId)).toBeNull();
  });

  it('does not affect another variant response key when cleaning up a corrupt target key', () => {
    const qmbti = asVariantId('qmbti');
    const egtt = asVariantId('egtt');
    const qmbtiKey = testVariantKey.responseSet(qmbti);
    const egttKey = testVariantKey.responseSet(egtt);
    window.localStorage.setItem(qmbtiKey, '{broken');
    window.localStorage.setItem(egttKey, JSON.stringify({'1': 'B'}));

    expect(readResponseSet(qmbti)).toBeNull();

    expect(window.localStorage.getItem(qmbtiKey)).toBeNull();
    expect(window.localStorage.getItem(egttKey)).toBe(JSON.stringify({'1': 'B'}));
    expect(readResponseSet(egtt)).toEqual({'1': 'B'});
  });
});
