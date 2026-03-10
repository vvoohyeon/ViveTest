import {JSDOM} from 'jsdom';
import {afterEach, describe, expect, it} from 'vitest';

import {
  consumePendingReturnScrollRestore,
  resolveLandingReturnScrollTop
} from '../../src/features/landing/landing-runtime';
import {readLandingReturnScrollY, saveLandingReturnScrollY} from '../../src/features/landing/transition/store';

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

describe('landing runtime return restoration helpers', () => {
  afterEach(() => {
    uninstallDom();
  });

  it('consumes saved return scroll immediately on landing re-entry', () => {
    installDom();
    saveLandingReturnScrollY(512.7, 'blog-build-metrics');

    const pendingRestore = consumePendingReturnScrollRestore('/en');

    expect(pendingRestore).toEqual({
      pathname: '/en',
      scrollY: 512
    });
    expect(readLandingReturnScrollY()).toBeNull();
    expect(consumePendingReturnScrollRestore('/en')).toBeNull();
  });

  it('resolves restore top from saved scroll only and clamps to page max scroll', () => {
    expect(resolveLandingReturnScrollTop(420, 300)).toBe(300);
    expect(resolveLandingReturnScrollTop(180, 300)).toBe(180);
    expect(resolveLandingReturnScrollTop(-15, 300)).toBe(0);
  });
});
