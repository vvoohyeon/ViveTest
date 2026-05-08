import {describe, expect, it} from 'vitest';

import {
  resolveDesktopMotionRole,
  resolveDesktopShellPhase,
  shouldRenderDesktopStageShell
} from '../../src/features/landing/grid/desktop-shell-phase';
import {useDesktopMotionController} from '../../src/features/landing/grid/use-desktop-motion-controller';

const idleDesktopMotionState = {
  openingCardVariant: null,
  closingCardVariant: null,
  cleanupPendingCardVariant: null,
  handoffSourceCardVariant: null,
  handoffTargetCardVariant: null
};

describe('landing desktop shell phase', () => {
  it('keeps same-card hover-out collapse in closing and cleanup-pending phases until cleanup finishes', () => {
    const closing = resolveDesktopShellPhase({
      available: true,
      isMobileViewport: false,
      motionRole: 'closing',
      visuallyExpanded: true,
      cleanupPending: false
    });

    const cleanupPending = resolveDesktopShellPhase({
      available: true,
      isMobileViewport: false,
      motionRole: 'idle',
      visuallyExpanded: false,
      cleanupPending: true
    });

    expect(closing).toBe('closing');
    expect(shouldRenderDesktopStageShell(closing)).toBe(true);
    expect(cleanupPending).toBe('cleanup-pending');
    expect(shouldRenderDesktopStageShell(cleanupPending)).toBe(true);
  });

  it('skips close-stage rendering for handoff source while preserving handoff target shell', () => {
    const handoffSource = resolveDesktopShellPhase({
      available: true,
      isMobileViewport: false,
      motionRole: 'handoff-source',
      visuallyExpanded: false,
      cleanupPending: false
    });

    const handoffTarget = resolveDesktopShellPhase({
      available: true,
      isMobileViewport: false,
      motionRole: 'handoff-target',
      visuallyExpanded: true,
      cleanupPending: false
    });

    expect(handoffSource).toBe('handoff-source');
    expect(shouldRenderDesktopStageShell(handoffSource)).toBe(false);
    expect(handoffTarget).toBe('handoff-target');
    expect(shouldRenderDesktopStageShell(handoffTarget)).toBe(true);
  });

  it('exposes the controller-owned desktop motion hook entrypoint', () => {
    expect(typeof useDesktopMotionController).toBe('function');
  });

  it('resolves desktop motion role priority without changing shell phase semantics', () => {
    expect(
      resolveDesktopMotionRole({
        cardEnterable: true,
        cardState: 'NORMAL',
        cardVariant: 'qmbti',
        desktopMotionState: {
          ...idleDesktopMotionState,
          handoffSourceCardVariant: 'qmbti',
          handoffTargetCardVariant: 'rhythm-b',
          openingCardVariant: 'qmbti'
        },
        isMobileViewport: false,
        transitionExpanded: false
      })
    ).toBe('handoff-source');

    expect(
      resolveDesktopMotionRole({
        cardEnterable: true,
        cardState: 'NORMAL',
        cardVariant: 'rhythm-b',
        desktopMotionState: {
          ...idleDesktopMotionState,
          handoffTargetCardVariant: 'rhythm-b',
          openingCardVariant: 'rhythm-b'
        },
        isMobileViewport: false,
        transitionExpanded: false
      })
    ).toBe('handoff-target');

    expect(
      resolveDesktopMotionRole({
        cardEnterable: true,
        cardState: 'NORMAL',
        cardVariant: 'qmbti',
        desktopMotionState: {
          ...idleDesktopMotionState,
          openingCardVariant: 'qmbti'
        },
        isMobileViewport: false,
        transitionExpanded: false
      })
    ).toBe('opening');

    expect(
      resolveDesktopMotionRole({
        cardEnterable: true,
        cardState: 'NORMAL',
        cardVariant: 'qmbti',
        desktopMotionState: {
          ...idleDesktopMotionState,
          closingCardVariant: 'qmbti'
        },
        isMobileViewport: false,
        transitionExpanded: false
      })
    ).toBe('closing');

    expect(
      resolveDesktopMotionRole({
        cardEnterable: true,
        cardState: 'NORMAL',
        cardVariant: 'qmbti',
        desktopMotionState: idleDesktopMotionState,
        isMobileViewport: false,
        transitionExpanded: true
      })
    ).toBe('steady');

    expect(
      resolveDesktopMotionRole({
        cardEnterable: true,
        cardState: 'EXPANDED',
        cardVariant: 'qmbti',
        desktopMotionState: idleDesktopMotionState,
        isMobileViewport: false,
        transitionExpanded: false
      })
    ).toBe('steady');

    expect(
      resolveDesktopMotionRole({
        cardEnterable: true,
        cardState: 'EXPANDED',
        cardVariant: 'qmbti',
        desktopMotionState: idleDesktopMotionState,
        isMobileViewport: true,
        transitionExpanded: false
      })
    ).toBe('idle');

    expect(
      resolveDesktopMotionRole({
        cardEnterable: false,
        cardState: 'EXPANDED',
        cardVariant: 'qmbti',
        desktopMotionState: idleDesktopMotionState,
        isMobileViewport: false,
        transitionExpanded: false
      })
    ).toBe('idle');
  });
});
