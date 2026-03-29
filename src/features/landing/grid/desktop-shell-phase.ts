export type LandingCardDesktopMotionRole =
  | 'idle'
  | 'opening'
  | 'steady'
  | 'closing'
  | 'handoff-target'
  | 'handoff-source';

export type LandingCardDesktopShellPhase =
  | 'idle'
  | 'opening'
  | 'steady'
  | 'closing'
  | 'cleanup-pending'
  | 'handoff-target'
  | 'handoff-source';

export interface DesktopShellPhaseInput {
  enterable: boolean;
  isMobileViewport: boolean;
  motionRole: LandingCardDesktopMotionRole;
  visuallyExpanded: boolean;
  cleanupPending: boolean;
}

export function resolveDesktopShellPhase(input: DesktopShellPhaseInput): LandingCardDesktopShellPhase {
  if (input.isMobileViewport || !input.enterable) {
    return 'idle';
  }

  if (input.cleanupPending) {
    return 'cleanup-pending';
  }

  switch (input.motionRole) {
    case 'opening':
      return 'opening';
    case 'steady':
      return 'steady';
    case 'closing':
      return 'closing';
    case 'handoff-target':
      return 'handoff-target';
    case 'handoff-source':
      return 'handoff-source';
    case 'idle':
    default:
      return input.visuallyExpanded ? 'steady' : 'idle';
  }
}

export function shouldRenderDesktopStageShell(phase: LandingCardDesktopShellPhase): boolean {
  switch (phase) {
    case 'opening':
    case 'steady':
    case 'closing':
    case 'cleanup-pending':
    case 'handoff-target':
      return true;
    case 'idle':
    case 'handoff-source':
    default:
      return false;
  }
}
