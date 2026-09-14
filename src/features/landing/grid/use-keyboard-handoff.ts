import type {
  Dispatch,
  FocusEvent as ReactFocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  RefObject
} from 'react';

import type {LandingCard} from '@/features/variant-registry';
import type {LandingCardInteractionMode} from '@/features/landing/grid/landing-grid-card';
import type {LandingMobileLifecycleState} from '@/features/landing/grid/mobile-lifecycle';
import type {
  LandingInteractionEvent,
  LandingInteractionState
} from '@/features/landing/model/interaction-state';
import type {DesktopTransitionReason} from '@/features/landing/grid/use-desktop-motion-controller';
import {useKeyboardModeTracker} from '@/features/landing/grid/use-keyboard-mode-tracker';
import {useCardKeyboardHandler} from '@/features/landing/grid/use-card-keyboard-handler';
import type {FocusCardFromKeyboardInput} from '@/features/landing/grid/use-card-keyboard-handler';

type LandingInteractionDispatch = Dispatch<LandingInteractionEvent>;

interface UseKeyboardHandoffInput {
  state: LandingInteractionState;
  dispatch: LandingInteractionDispatch;
  interactionMode: LandingCardInteractionMode;
  isMobileViewport: boolean;
  shellRef: RefObject<HTMLElement | null>;
  cardVariants: readonly string[];
  isCardEnterableByVariant: (cardVariant: string) => boolean;
  isCardExpandableByVariant: (cardVariant: string) => boolean;
  focusCardFromKeyboard: (input: FocusCardFromKeyboardInput) => void;
  mobileLifecycleState: LandingMobileLifecycleState;
  beginMobileOpen: (cardVariant: string, syncInteraction?: boolean) => void;
  beginMobileKeyboardHandoff: (sourceVariant: string, nextCardVariant: string | null, nowMs: number) => void;
  setDesktopTransitionReason: (reason: DesktopTransitionReason) => void;
}

interface UseKeyboardHandoffOutput {
  resolveKeyboardHandlers: (
    card: LandingCard,
    input: {cardEnterable: boolean; keyboardActivationBlocked: boolean}
  ) => {
    onFocus: (event: ReactFocusEvent<HTMLElement>) => void;
    onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
    onExpandedBodyKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
  };
}

export function useKeyboardHandoff({
  state,
  dispatch,
  interactionMode,
  isMobileViewport,
  shellRef,
  cardVariants,
  isCardEnterableByVariant,
  isCardExpandableByVariant,
  focusCardFromKeyboard,
  mobileLifecycleState,
  beginMobileOpen,
  beginMobileKeyboardHandoff,
  setDesktopTransitionReason
}: UseKeyboardHandoffInput): UseKeyboardHandoffOutput {
  useKeyboardModeTracker({dispatch});

  const {resolveKeyboardHandlers} = useCardKeyboardHandler({
    state,
    dispatch,
    interactionMode,
    isMobileViewport,
    shellRef,
    cardVariants,
    isCardEnterableByVariant,
    isCardExpandableByVariant,
    focusCardFromKeyboard,
    mobileLifecycleState,
    beginMobileOpen,
    beginMobileKeyboardHandoff,
    onFocusTransitionIntent: setDesktopTransitionReason
  });

  return {resolveKeyboardHandlers};
}
