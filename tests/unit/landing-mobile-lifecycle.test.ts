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
  type LandingMobileLifecycleState,
  type LandingMobileSnapshot
} from '../../src/features/landing/grid/mobile-lifecycle';
import {useMobileCardLifecycle} from '../../src/features/landing/grid/use-mobile-card-lifecycle';
import {useMobileRestorePolling} from '../../src/features/landing/grid/use-mobile-restore-polling';
import {useMobileTransientShell} from '../../src/features/landing/grid/use-mobile-transient-shell';
import type {LandingCardInteractionMode} from '../../src/features/landing/grid/landing-grid-card';
import type {LandingInteractionState} from '../../src/features/landing/model/interaction-state';

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

describe('transient shell timer consolidation', () => {
  function buildLifecycleProps(
    mobileLifecycleState: LandingMobileLifecycleState,
    shellRef: ReturnType<typeof createRef<HTMLElement | null>>
  ) {
    return {
      interactionMode: 'tap' as LandingCardInteractionMode,
      interactionState: {
        pageState: 'ACTIVE',
        activeRampUntilMs: null,
        focusedCardVariant: null,
        expandedCardVariant: mobileLifecycleState.cardVariant,
        hoverLock: {enabled: false, cardVariant: null, keyboardMode: false}
      } as LandingInteractionState,
      dispatchInteraction: vi.fn(),
      mobileLifecycleState,
      dispatchMobileLifecycle: vi.fn(),
      isMobileViewport: true,
      shellRef,
      clearHoverTimer: vi.fn()
    };
  }

  it('transient shell teardown occurs after the orchestrator close lifecycle timer', () => {
    const shellEl = document.createElement('section');
    const cardEl = document.createElement('div');
    cardEl.setAttribute('data-testid', 'landing-grid-card');
    cardEl.setAttribute('data-card-variant', 'qmbti');
    shellEl.appendChild(cardEl);
    const shellRef = createRef<HTMLElement | null>();
    shellRef.current = shellEl;

    const snapshot = createMobileSnapshot();
    const openState: LandingMobileLifecycleState = {
      phase: 'OPEN',
      cardVariant: 'qmbti',
      snapshot,
      queuedClose: false,
      snapshotWriteCount: 1,
      restoreReady: false
    };

    const {result, rerender} = renderHook(
      (props: ReturnType<typeof buildLifecycleProps>) => useMobileCardLifecycle(props),
      {initialProps: buildLifecycleProps(openState, shellRef)}
    );

    act(() => {
      result.current.beginMobileClose();
    });

    const closingState: LandingMobileLifecycleState = {
      ...openState,
      phase: 'CLOSING'
    };
    rerender(buildLifecycleProps(closingState, shellRef));

    expect(result.current.mobileTransientShellState.mode).not.toBe('NONE');

    act(() => {
      vi.advanceTimersByTime(MOBILE_EXPANDED_DURATION_MS - 1);
    });
    expect(result.current.mobileTransientShellState.mode).not.toBe('NONE');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    act(() => {
      flushNextRaf();
    });

    expect(result.current.mobileTransientShellState.mode).toBe('NONE');
  });

  it('manual resetMobileRuntime clears transient shell synchronously without timers', () => {
    const shellEl = document.createElement('section');
    const shellRef = createRef<HTMLElement | null>();
    shellRef.current = shellEl;

    const {result} = renderHook(() =>
      useMobileCardLifecycle(buildLifecycleProps(initialLandingMobileLifecycleState, shellRef))
    );

    act(() => {
      result.current.beginMobileOpen('qmbti', false);
    });
    expect(result.current.mobileTransientShellState.mode).not.toBe('NONE');

    act(() => {
      result.current.resetMobileRuntime();
    });
    expect(result.current.mobileTransientShellState.mode).toBe('NONE');
  });

  it('clearMobileTransientShellTimer is not part of the hook output type', () => {
    type Output = ReturnType<typeof useMobileTransientShell>;
    type HasTimer = 'clearMobileTransientShellTimer' extends keyof Output ? true : false;
    const check: HasTimer = false;
    expect(check).toBe(false);
  });
});
