import type {
  FocusEvent as ReactFocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent
} from 'react';

import type {
  LandingCardDesktopMotionRole,
  LandingCardDesktopShellPhase
} from '@/features/landing/grid/desktop-shell-phase';
import type {
  LandingCardMobilePhase,
  LandingCardMobileTransientMode,
  LandingCardVisualState,
  LandingMobileSnapshotView
} from '@/features/landing/grid/landing-grid-card';

export interface LandingCardInteractionBindings {
  state: LandingCardVisualState;
  desktopMotionRole: LandingCardDesktopMotionRole;
  desktopShellPhase: LandingCardDesktopShellPhase;
  tabIndex: number;
  ariaDisabled: boolean;
  interactionBlocked: boolean;
  keyboardModeBlocked: boolean;
  hoverLockEnabled: boolean;
  keyboardMode: boolean;
  mobilePhase: LandingCardMobilePhase;
  mobileTransientMode: LandingCardMobileTransientMode;
  mobileRestoreReady: boolean;
  mobileSnapshot: LandingMobileSnapshotView | null;
  onFocus: (event: ReactFocusEvent<HTMLElement>) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
  onClick: (event: ReactMouseEvent<HTMLElement>) => void;
  onMouseEnter: (event: ReactMouseEvent<HTMLElement>) => void;
  onMouseLeave: (event: ReactMouseEvent<HTMLElement>) => void;
  onExpandedBodyKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
  onAnswerChoiceSelect: (choice: 'A' | 'B', event: ReactMouseEvent<HTMLButtonElement>) => void;
  onMobileClose: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}
