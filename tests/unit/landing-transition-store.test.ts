import {JSDOM} from 'jsdom';
import {afterEach, describe, expect, it} from 'vitest';

import {
  clearLandingReturnScroll,
  clearPendingLandingTransition,
  consumeLandingIngress,
  consumeLandingReturnScrollY,
  readLandingIngress,
  readLandingReturnCardId,
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
      eventId: 'event-1',
      sourceCardId: 'test-rhythm-a',
      targetRoute: '/en/test/rhythm-a/question',
      targetType: 'test',
      startedAtMs: 1,
      variant: 'rhythm-a',
      preAnswerChoice: 'A'
    });

    expect(readPendingLandingTransition()?.transitionId).toBe('transition-1');

    saveLandingReturnScrollY(742.8, 'blog-build-metrics');
    expect(readLandingReturnScrollY()).toBe(742);
    expect(readLandingReturnCardId()).toBe('blog-build-metrics');
    expect(consumeLandingReturnScrollY()).toBe(742);
    expect(consumeLandingReturnScrollY()).toBeNull();
    expect(readLandingReturnCardId()).toBeNull();
    clearPendingLandingTransition();
  });

  it('clears return scroll keys atomically', () => {
    installDom();

    saveLandingReturnScrollY(128.4, 'test-rhythm-a');
    expect(readLandingReturnScrollY()).toBe(128);
    expect(readLandingReturnCardId()).toBe('test-rhythm-a');

    clearLandingReturnScroll();

    expect(readLandingReturnScrollY()).toBeNull();
    expect(readLandingReturnCardId()).toBeNull();
  });

  it('assertion:B16-rollback-cleanup rolls back pending transition, ingress flag, and body lock state without leaks', () => {
    installDom();
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    writePendingLandingTransition({
      transitionId: 'transition-1',
      eventId: 'event-1',
      sourceCardId: 'test-rhythm-a',
      targetRoute: '/en/test/rhythm-a/question',
      targetType: 'test',
      startedAtMs: 1,
      variant: 'rhythm-a',
      preAnswerChoice: 'A'
    });
    writeLandingIngress({
      variant: 'rhythm-a',
      preAnswerChoice: 'A',
      transitionId: 'transition-1',
      createdAtMs: 1,
      landingIngressFlag: true
    });
    saveLandingReturnScrollY(256, 'test-rhythm-a');

    expect(readLandingIngress('rhythm-a')?.preAnswerChoice).toBe('A');

    rollbackLandingTransition({variant: 'rhythm-a'});

    expect(readPendingLandingTransition()).toBeNull();
    expect(readLandingIngress('rhythm-a')).toBeNull();
    expect(consumeLandingIngress('rhythm-a')).toBeNull();
    expect(readLandingReturnScrollY()).toBeNull();
    expect(readLandingReturnCardId()).toBeNull();
    expect(document.body.style.overflow).toBe('');
    expect(document.body.style.touchAction).toBe('');
  });
});
