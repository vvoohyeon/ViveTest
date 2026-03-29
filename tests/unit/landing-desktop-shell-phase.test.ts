import {describe, expect, it} from 'vitest';

import {
  resolveDesktopShellPhase,
  shouldRenderDesktopStageShell
} from '../../src/features/landing/grid/desktop-shell-phase';

describe('landing desktop shell phase', () => {
  it('keeps same-card hover-out collapse in closing and cleanup-pending phases until cleanup finishes', () => {
    const closing = resolveDesktopShellPhase({
      enterable: true,
      isMobileViewport: false,
      motionRole: 'closing',
      visuallyExpanded: true,
      cleanupPending: false
    });

    const cleanupPending = resolveDesktopShellPhase({
      enterable: true,
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
      enterable: true,
      isMobileViewport: false,
      motionRole: 'handoff-source',
      visuallyExpanded: false,
      cleanupPending: false
    });

    const handoffTarget = resolveDesktopShellPhase({
      enterable: true,
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
});
