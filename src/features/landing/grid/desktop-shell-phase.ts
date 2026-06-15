import type {DesktopMotionState} from '@/features/landing/grid/use-desktop-motion-controller';
import type {CardState} from '@/features/landing/model/state-types';

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
  available: boolean;
  isMobileViewport: boolean;
  motionRole: LandingCardDesktopMotionRole;
  visuallyExpanded: boolean;
  cleanupPending: boolean;
}

export function resolveDesktopMotionRole(input: {
  cardEnterable: boolean;
  cardState: CardState;
  cardVariant: string;
  desktopMotionState: DesktopMotionState;
  isMobileViewport: boolean;
  transitionExpanded: boolean;
}): LandingCardDesktopMotionRole {
  const {
    cardEnterable,
    cardState,
    cardVariant,
    desktopMotionState,
    isMobileViewport,
    transitionExpanded
  } = input;

  if (desktopMotionState.handoffSourceCardVariant === cardVariant) {
    return 'handoff-source';
  }

  if (desktopMotionState.handoffTargetCardVariant === cardVariant) {
    return 'handoff-target';
  }

  if (desktopMotionState.openingCardVariant === cardVariant) {
    return 'opening';
  }

  if (desktopMotionState.closingCardVariant === cardVariant) {
    return 'closing';
  }

  if (!isMobileViewport && (transitionExpanded || (cardState === 'EXPANDED' && cardEnterable))) {
    return 'steady';
  }

  return 'idle';
}

export function resolveDesktopShellPhase(input: DesktopShellPhaseInput): LandingCardDesktopShellPhase {
  if (input.isMobileViewport || !input.available) {
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

export function isDesktopShellLogicallyInteractive(phase: LandingCardDesktopShellPhase): boolean {
  switch (phase) {
    case 'opening':
    case 'steady':
    case 'handoff-target':
      return true;
    case 'idle':
    case 'closing':
    case 'cleanup-pending':
    case 'handoff-source':
    default:
      return false;
  }
}
