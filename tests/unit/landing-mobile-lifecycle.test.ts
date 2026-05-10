/**
 * @vitest-environment jsdom
 */

import {act, cleanup, renderHook} from '@testing-library/react';
import {createRef} from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {
  initialLandingMobileLifecycleState,
  MOBILE_EXPANDED_DURATION_MS,
  reduceLandingMobileLifecycleState,
  type LandingMobileSnapshot
} from '../../src/features/landing/grid/mobile-lifecycle';
import {useMobileCardLifecycle} from '../../src/features/landing/grid/use-mobile-card-lifecycle';
import {useMobileRestorePolling} from '../../src/features/landing/grid/use-mobile-restore-polling';

type RafCallback = FrameRequestCallback;

let rafCallbacks: Map<number, RafCallback>;
let nextRafId: number;

function createMobileSnapshot(): LandingMobileSnapshot {
  return {
    cardHeightPx: 200,
    anchorTopPx: 32,
    cardLeftPx: 16,
    cardWidthPx: 358,
    titleTopPx: 32
  };
}

function installRafStubs() {
  rafCallbacks = new Map();
  nextRafId = 1;
  vi.stubGlobal('requestAnimationFrame', (callback: RafCallback) => {
    const id = nextRafId;
    nextRafId += 1;
    rafCallbacks.set(id, callback);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    rafCallbacks.delete(id);
  });
}

function flushNextRaf() {
  const [id, callback] = rafCallbacks.entries().next().value ?? [];
  if (id === undefined || callback === undefined) {
    return false;
  }
  rafCallbacks.delete(id);
  callback(window.performance.now());
  return true;
}

beforeEach(() => {
  vi.useFakeTimers();
  installRafStubs();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('landing mobile lifecycle reducer', () => {
  it('uses the fixed mobile duration contract', () => {
    expect(MOBILE_EXPANDED_DURATION_MS).toBe(280);
  });

  it('queues close during OPENING and settles back to NORMAL after close', () => {
    const opening = reduceLandingMobileLifecycleState(initialLandingMobileLifecycleState, {
      type: 'OPEN_START',
      cardVariant: 'qmbti',
      snapshot: {
        cardHeightPx: 200,
        anchorTopPx: 32,
        cardLeftPx: 16,
        cardWidthPx: 358,
        titleTopPx: 32
      }
    });
    const queued = reduceLandingMobileLifecycleState(opening, {type: 'QUEUE_CLOSE'});
    const closing = reduceLandingMobileLifecycleState(queued, {type: 'OPEN_SETTLED'});
    const restoreReady = reduceLandingMobileLifecycleState(closing, {type: 'RESTORE_READY'});
    const normal = reduceLandingMobileLifecycleState(restoreReady, {type: 'CLOSE_SETTLED'});

    expect(opening.phase).toBe('OPENING');
    expect(opening.snapshotWriteCount).toBe(1);
    expect(queued.queuedClose).toBe(true);
    expect(closing.phase).toBe('CLOSING');
    expect(restoreReady.restoreReady).toBe(true);
    expect(normal).toEqual(initialLandingMobileLifecycleState);
  });

  it('ignores close-start when not OPEN', () => {
    expect(
      reduceLandingMobileLifecycleState(initialLandingMobileLifecycleState, {
        type: 'CLOSE_START'
      })
    ).toEqual(initialLandingMobileLifecycleState);
  });

  it('does not rewrite the pre-open snapshot during the same mobile sequence', () => {
    const snapshot = {
      cardHeightPx: 200,
      anchorTopPx: 32,
      cardLeftPx: 16,
      cardWidthPx: 358,
      titleTopPx: 32
    };
    const opening = reduceLandingMobileLifecycleState(initialLandingMobileLifecycleState, {
      type: 'OPEN_START',
      cardVariant: 'qmbti',
      snapshot
    });
    const restarted = reduceLandingMobileLifecycleState(opening, {
      type: 'OPEN_START',
      cardVariant: 'qmbti',
      snapshot: {
        cardHeightPx: 420,
        anchorTopPx: 72,
        cardLeftPx: 0,
        cardWidthPx: 390,
        titleTopPx: 88
      }
    });

    expect(restarted.snapshot).toEqual(snapshot);
    expect(restarted.snapshotWriteCount).toBe(1);
  });

  it('does not allow NORMAL terminal before restore-ready', () => {
    const closing = reduceLandingMobileLifecycleState(
      {
        phase: 'CLOSING',
        cardVariant: 'qmbti',
        queuedClose: false,
        snapshot: {
          cardHeightPx: 200,
          anchorTopPx: 32,
          cardLeftPx: 16,
          cardWidthPx: 358,
          titleTopPx: 32
        },
        snapshotWriteCount: 1,
        restoreReady: false
      },
      {type: 'CLOSE_SETTLED'}
    );

    expect(closing.phase).toBe('CLOSING');
  });

  it('exposes the controller-owned mobile card lifecycle hook entrypoint', () => {
    expect(typeof useMobileCardLifecycle).toBe('function');
  });
});

describe('useMobileRestorePolling - predicate injection', () => {
  it('settled predicate returning true ends polling immediately', () => {
    const shellElement = document.createElement('section');
    const shellRef = createRef<HTMLElement | null>();
    shellRef.current = shellElement;
    const dispatchMobileLifecycle = vi.fn();
    const isRestoreSettled = vi.fn(() => true);
    const snapshot = createMobileSnapshot();
    const {result} = renderHook(() =>
      useMobileRestorePolling({
        shellRef,
        dispatchMobileLifecycle,
        isRestoreSettled
      })
    );

    act(() => {
      result.current.settleMobileCloseAfterRestore('qmbti', snapshot);
    });
    act(() => {
      expect(flushNextRaf()).toBe(true);
    });

    expect(isRestoreSettled).toHaveBeenCalledOnce();
    expect(isRestoreSettled).toHaveBeenCalledWith(shellElement, 'qmbti', snapshot);
    expect(result.current.mobileRestoreReadyVariant).toBe('qmbti');
    expect(rafCallbacks.size).toBe(1);
  });

  it('settled predicate returning false for N attempts ends at max attempts', () => {
    const shellElement = document.createElement('section');
    const shellRef = createRef<HTMLElement | null>();
    shellRef.current = shellElement;
    const dispatchMobileLifecycle = vi.fn();
    const isRestoreSettled = vi.fn(() => false);
    const snapshot = createMobileSnapshot();
    const expectedAttemptCount = 30;
    const {result} = renderHook(() =>
      useMobileRestorePolling({
        shellRef,
        dispatchMobileLifecycle,
        isRestoreSettled
      })
    );

    act(() => {
      result.current.settleMobileCloseAfterRestore('qmbti', snapshot);
    });
    for (let attempt = 0; attempt < expectedAttemptCount; attempt += 1) {
      act(() => {
        expect(flushNextRaf()).toBe(true);
      });
    }

    expect(isRestoreSettled).toHaveBeenCalledTimes(expectedAttemptCount);
    expect(result.current.mobileRestoreReadyVariant).toBe('qmbti');
    expect(rafCallbacks.size).toBe(1);
  });

  it('cleanup cancels pending RAF', () => {
    const shellElement = document.createElement('section');
    const shellRef = createRef<HTMLElement | null>();
    shellRef.current = shellElement;
    const dispatchMobileLifecycle = vi.fn();
    const isRestoreSettled = vi.fn(() => true);
    const snapshot = createMobileSnapshot();
    const {result} = renderHook(() =>
      useMobileRestorePolling({
        shellRef,
        dispatchMobileLifecycle,
        isRestoreSettled
      })
    );
    let cancelRestore: (() => void) | undefined;

    act(() => {
      cancelRestore = result.current.settleMobileCloseAfterRestore('qmbti', snapshot);
    });
    act(() => {
      cancelRestore?.();
    });
    act(() => {
      expect(flushNextRaf()).toBe(false);
    });

    expect(isRestoreSettled).not.toHaveBeenCalled();
  });
});
