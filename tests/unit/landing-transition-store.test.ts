import {JSDOM} from 'jsdom';
import {afterEach, describe, expect, it} from 'vitest';

import {
  clearLandingReturnScroll,
  clearPendingLandingTransition,
  consumeLandingIngress,
  consumeLandingReturnScrollY,
  readLandingIngress,
  readLandingReturnVariant,
  readLandingReturnScrollY,
  readPendingLandingTransition,
  rollbackLandingTransition,
  saveLandingReturnScrollY,
  writeLandingIngress,
  writePendingLandingTransition
} from '../../src/features/landing/transition/store';

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

describe('landing transition store', () => {
  afterEach(() => {
    uninstallDom();
  });

  it('persists pending transitions and consumes return scroll exactly once', () => {
    installDom();
    writePendingLandingTransition({
      transitionId: 'transition-1',
      sourceVariant: 'qmbti',
      targetRoute: '/en/test/qmbti',
      targetType: 'test',
      startedAtMs: 1,
      variant: 'qmbti',
      preAnswerChoice: 'A'
    });

    expect(readPendingLandingTransition()?.transitionId).toBe('transition-1');

    saveLandingReturnScrollY(742.8, 'build-metrics');
    expect(readLandingReturnScrollY()).toBe(742);
    expect(readLandingReturnVariant()).toBe('build-metrics');
    expect(consumeLandingReturnScrollY()).toBe(742);
    expect(consumeLandingReturnScrollY()).toBeNull();
    expect(readLandingReturnVariant()).toBeNull();
    clearPendingLandingTransition();
  });

  it('clears return scroll keys atomically', () => {
    installDom();

    saveLandingReturnScrollY(128.4, 'qmbti');
    expect(readLandingReturnScrollY()).toBe(128);
    expect(readLandingReturnVariant()).toBe('qmbti');

    clearLandingReturnScroll();

    expect(readLandingReturnScrollY()).toBeNull();
    expect(readLandingReturnVariant()).toBeNull();
  });

  it('assertion:B16-rollback-cleanup rolls back pending transition, ingress flag, and body lock state without leaks', () => {
    installDom();
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    writePendingLandingTransition({
      transitionId: 'transition-1',
      sourceVariant: 'qmbti',
      targetRoute: '/en/test/qmbti',
      targetType: 'test',
      startedAtMs: 1,
      variant: 'qmbti',
      preAnswerChoice: 'A'
    });
    writeLandingIngress({
      variant: 'qmbti',
      preAnswerChoice: 'A',
      createdAtMs: 1,
      landingIngressFlag: true
    });
    saveLandingReturnScrollY(256, 'qmbti');

    expect(readLandingIngress('qmbti')?.preAnswerChoice).toBe('A');

    rollbackLandingTransition({variant: 'qmbti'});

    expect(readPendingLandingTransition()).toBeNull();
    expect(readLandingIngress('qmbti')).toBeNull();
    expect(consumeLandingIngress('qmbti')).toBeNull();
    expect(readLandingReturnScrollY()).toBeNull();
    expect(readLandingReturnVariant()).toBeNull();
    expect(document.body.style.overflow).toBe('');
    expect(document.body.style.touchAction).toBe('');
  });
});
