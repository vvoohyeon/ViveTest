import {JSDOM} from 'jsdom';
import {afterEach, describe, expect, it} from 'vitest';

import {SESSION_STORAGE_KEYS, variantSessionKeys} from '../../src/features/landing/storage/storage-keys';
import {
  clearLandingReturnScroll,
  clearPendingLandingTransition,
  consumeLandingIngress,
  consumeLandingReturnScrollY,
  consumeLandingReturnVariant,
  LANDING_TRANSITION_CLEANUP_EVENT,
  LANDING_TRANSITION_STORE_EVENT,
  readLandingIngress,
  readLandingReturnVariant,
  readLandingReturnScrollY,
  readPendingLandingTransition,
  rollbackLandingTransition,
  saveLandingReturnScrollY,
  writeLandingIngress,
  writePendingLandingTransition
} from '../../src/features/transition/store';

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

  it('persists pending transitions and consumes return scroll values independently', () => {
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
    expect(readLandingReturnScrollY()).toBeNull();
    expect(readLandingReturnVariant()).toBe('build-metrics');

    saveLandingReturnScrollY(512, 'qmbti');
    expect(consumeLandingReturnVariant()).toBe('qmbti');
    expect(readLandingReturnScrollY()).toBe(512);
    expect(readLandingReturnVariant()).toBeNull();

    clearLandingReturnScroll();
    clearPendingLandingTransition();
  });

  it('clears return scroll keys atomically', () => {
    installDom();
    const storeEvents: Array<Record<string, unknown>> = [];
    window.addEventListener(LANDING_TRANSITION_STORE_EVENT, ((event: Event) => {
      if (event instanceof window.CustomEvent) {
        storeEvents.push(event.detail as Record<string, unknown>);
      }
    }) as EventListener);

    saveLandingReturnScrollY(128.4, 'qmbti');
    expect(readLandingReturnScrollY()).toBe(128);
    expect(readLandingReturnVariant()).toBe('qmbti');

    clearLandingReturnScroll();

    expect(readLandingReturnScrollY()).toBeNull();
    expect(readLandingReturnVariant()).toBeNull();
    expect(storeEvents.at(-1)).toEqual({
      keys: [
        SESSION_STORAGE_KEYS.LANDING_RETURN_SCROLL_Y,
        SESSION_STORAGE_KEYS.LANDING_RETURN_VARIANT
      ],
      sourceVariant: null
    });
  });

  it('assertion:B16-rollback-cleanup dispatches one pending store event and one cleanup event without mutating body styles', () => {
    installDom();
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    const storeEvents: Array<Record<string, unknown>> = [];
    const cleanupEvents: Array<Record<string, unknown>> = [];
    window.addEventListener(LANDING_TRANSITION_STORE_EVENT, ((event: Event) => {
      if (event instanceof window.CustomEvent) {
        storeEvents.push(event.detail as Record<string, unknown>);
      }
    }) as EventListener);
    window.addEventListener(LANDING_TRANSITION_CLEANUP_EVENT, ((event: Event) => {
      if (event instanceof window.CustomEvent) {
        cleanupEvents.push(event.detail as Record<string, unknown>);
      }
    }) as EventListener);

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
    storeEvents.length = 0;
    cleanupEvents.length = 0;

    rollbackLandingTransition({variant: 'qmbti'});

    expect(storeEvents).toEqual([
      {
        key: SESSION_STORAGE_KEYS.LANDING_PENDING_TRANSITION,
        transitionId: null
      }
    ]);
    expect(cleanupEvents).toEqual([{variant: 'qmbti'}]);
    expect(storeEvents.length + cleanupEvents.length).toBe(2);
    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEYS.LANDING_PENDING_TRANSITION)).toBeNull();
    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEYS.LANDING_RETURN_SCROLL_Y)).toBeNull();
    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEYS.LANDING_RETURN_VARIANT)).toBeNull();
    expect(window.sessionStorage.getItem(variantSessionKeys.landingIngress('qmbti'))).toBeNull();
    expect(readPendingLandingTransition()).toBeNull();
    expect(readLandingIngress('qmbti')).toBeNull();
    expect(consumeLandingIngress('qmbti')).toBeNull();
    expect(readLandingReturnScrollY()).toBeNull();
    expect(readLandingReturnVariant()).toBeNull();
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.touchAction).toBe('none');
  });
});
