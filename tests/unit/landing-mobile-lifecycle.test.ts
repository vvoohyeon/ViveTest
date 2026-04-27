import {describe, expect, it} from 'vitest';

import {
  initialLandingMobileLifecycleState,
  MOBILE_EXPANDED_DURATION_MS,
  reduceLandingMobileLifecycleState
} from '../../src/features/landing/grid/mobile-lifecycle';
import {useMobileCardLifecycle} from '../../src/features/landing/grid/use-mobile-card-lifecycle';

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
