export type {
  CardState,
  HoverLockState,
  InteractionMode,
  PageState,
  TransitionCorrelation,
  TransitionTerminalResult
} from '@/features/landing/model/state-types';
export {cardStates, interactionModes, pageStates, transitionTerminalResults} from '@/features/landing/model/state-types';
export {
  ACTIVE_RAMP_UP_MS,
  ALLOWED_PAGE_TRANSITIONS,
  PAGE_STATE_PRIORITY,
  initialLandingInteractionState,
  isAllowedPageTransition,
  isCardKeyboardAriaDisabled,
  isCardPointerInteractionBlocked,
  reduceLandingInteractionState,
  resolveCardStateForVariant,
  resolveCardTabIndex
} from '@/features/landing/model/interaction-state';
export type {LandingInteractionEvent, LandingInteractionState} from '@/features/landing/model/interaction-state';
