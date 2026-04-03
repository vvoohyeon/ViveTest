import type {CardState, PageState} from '@/features/landing/model/state-types';

export const ACTIVE_RAMP_UP_MS = 140;
export const PAGE_STATE_PRIORITY: Record<PageState, number> = {
  INACTIVE: 5,
  REDUCED_MOTION: 4,
  TRANSITIONING: 3,
  SENSOR_DENIED: 2,
  ACTIVE: 1
};

export const ALLOWED_PAGE_TRANSITIONS: Record<PageState, ReadonlySet<PageState>> = {
  ACTIVE: new Set(['INACTIVE', 'REDUCED_MOTION', 'SENSOR_DENIED', 'TRANSITIONING']),
  INACTIVE: new Set(['ACTIVE']),
  REDUCED_MOTION: new Set(['ACTIVE', 'INACTIVE', 'SENSOR_DENIED', 'TRANSITIONING']),
  SENSOR_DENIED: new Set(['ACTIVE', 'INACTIVE', 'REDUCED_MOTION', 'TRANSITIONING']),
  TRANSITIONING: new Set(['ACTIVE', 'INACTIVE', 'REDUCED_MOTION', 'SENSOR_DENIED'])
};

export interface LandingInteractionState {
  pageState: PageState;
  activeRampUntilMs: number | null;
  focusedCardVariant: string | null;
  expandedCardVariant: string | null;
  hoverLock: {
    enabled: boolean;
    cardVariant: string | null;
    keyboardMode: boolean;
  };
}

export type LandingInteractionEvent =
  | {type: 'PAGE_HIDDEN'; nowMs: number}
  | {type: 'PAGE_VISIBLE'; nowMs: number}
  | {type: 'PAGE_TRANSITION_START'; nowMs: number}
  | {type: 'PAGE_TRANSITION_END'; nowMs: number}
  | {type: 'REDUCED_MOTION_ENABLE'; nowMs: number}
  | {type: 'REDUCED_MOTION_DISABLE'; nowMs: number}
  | {type: 'SENSOR_DENIED'; nowMs: number}
  | {type: 'SENSOR_ALLOWED'; nowMs: number}
  | {type: 'MODE_SYNC'; interactionMode: 'hover' | 'tap'}
  | {type: 'KEYBOARD_MODE_ENTER'}
  | {type: 'KEYBOARD_MODE_EXIT'}
  | {
      type: 'CARD_FOCUS';
      nowMs: number;
      interactionMode: 'hover' | 'tap';
      cardVariant: string;
      available: boolean;
    }
  | {
      type: 'CARD_ACTIVATE';
      nowMs: number;
      interactionMode: 'hover' | 'tap';
      cardVariant: string;
      available: boolean;
    }
  | {
      type: 'CARD_EXPAND';
      nowMs: number;
      interactionMode: 'hover' | 'tap';
      cardVariant: string;
      available: boolean;
    }
  | {
      type: 'CARD_COLLAPSE';
      nowMs: number;
      interactionMode: 'hover' | 'tap';
      cardVariant: string | null;
    }
  | {
      type: 'CARD_HOVER_ENTER';
      nowMs: number;
      interactionMode: 'hover' | 'tap';
      cardVariant: string;
      available: boolean;
    }
  | {
      type: 'CARD_HOVER_LEAVE';
      nowMs: number;
      interactionMode: 'hover' | 'tap';
      cardVariant: string;
    }
  | {type: 'ESCAPE'; nowMs: number};

export const initialLandingInteractionState: LandingInteractionState = {
  pageState: 'ACTIVE',
  activeRampUntilMs: null,
  focusedCardVariant: null,
  expandedCardVariant: null,
  hoverLock: {
    enabled: false,
    cardVariant: null,
    keyboardMode: false
  }
};

const INTERACTION_BLOCKING_PAGE_STATES: ReadonlySet<PageState> = new Set(['INACTIVE', 'TRANSITIONING']);

function clearInteractionForPageState(state: LandingInteractionState): LandingInteractionState {
  return {
    ...state,
    focusedCardVariant: null,
    expandedCardVariant: null,
    hoverLock: {
      enabled: false,
      cardVariant: null,
      keyboardMode: false
    }
  };
}

export function isAllowedPageTransition(from: PageState, to: PageState): boolean {
  if (from === to) {
    return true;
  }

  return ALLOWED_PAGE_TRANSITIONS[from].has(to);
}

function transitionPageState(
  state: LandingInteractionState,
  nextPageState: PageState,
  nowMs: number,
  force = false
): LandingInteractionState {
  if (state.pageState === nextPageState) {
    return state;
  }

  if (!isAllowedPageTransition(state.pageState, nextPageState)) {
    return state;
  }

  if (!force && nextPageState !== 'ACTIVE') {
    const currentPriority = PAGE_STATE_PRIORITY[state.pageState] ?? 0;
    const nextPriority = PAGE_STATE_PRIORITY[nextPageState] ?? 0;
    if (currentPriority > nextPriority) {
      return state;
    }
  }

  const baseState =
    nextPageState === 'ACTIVE'
      ? {
          ...state,
          pageState: 'ACTIVE' as const,
          activeRampUntilMs: nowMs + ACTIVE_RAMP_UP_MS,
          hoverLock: {
            ...state.hoverLock,
            enabled: false,
            cardVariant: null
          }
        }
      : {
          ...state,
          pageState: nextPageState,
          activeRampUntilMs: null
        };

  if (nextPageState === 'INACTIVE' || nextPageState === 'TRANSITIONING') {
    return clearInteractionForPageState(baseState);
  }

  return {
    ...baseState,
    hoverLock: {
      ...baseState.hoverLock,
      enabled: false,
      cardVariant: null
    }
  };
}

function settleRampIfNeeded(state: LandingInteractionState, nowMs: number): LandingInteractionState {
  if (state.activeRampUntilMs === null || nowMs < state.activeRampUntilMs) {
    return state;
  }

  return {
    ...state,
    activeRampUntilMs: null
  };
}

function isInteractionBlocked(state: LandingInteractionState): boolean {
  if (INTERACTION_BLOCKING_PAGE_STATES.has(state.pageState)) {
    return true;
  }

  return state.activeRampUntilMs !== null;
}

function enableHoverLock(state: LandingInteractionState, cardVariant: string): LandingInteractionState {
  return {
    ...state,
    hoverLock: {
      enabled: true,
      cardVariant,
      keyboardMode: state.hoverLock.keyboardMode
    }
  };
}

function clearHoverLock(state: LandingInteractionState): LandingInteractionState {
  return {
    ...state,
    hoverLock: {
      enabled: false,
      cardVariant: null,
      keyboardMode: state.hoverLock.keyboardMode
    }
  };
}

export function reduceLandingInteractionState(
  currentState: LandingInteractionState,
  event: LandingInteractionEvent
): LandingInteractionState {
  const settledState =
    'nowMs' in event ? settleRampIfNeeded(currentState, event.nowMs) : currentState;

  switch (event.type) {
    case 'PAGE_HIDDEN':
      return transitionPageState(settledState, 'INACTIVE', event.nowMs);
    case 'PAGE_VISIBLE':
      return transitionPageState(settledState, 'ACTIVE', event.nowMs, true);
    case 'PAGE_TRANSITION_START':
      return transitionPageState(settledState, 'TRANSITIONING', event.nowMs, true);
    case 'PAGE_TRANSITION_END':
      return transitionPageState(settledState, 'ACTIVE', event.nowMs, true);
    case 'REDUCED_MOTION_ENABLE':
      return transitionPageState(settledState, 'REDUCED_MOTION', event.nowMs);
    case 'REDUCED_MOTION_DISABLE':
      return transitionPageState(settledState, 'ACTIVE', event.nowMs, true);
    case 'SENSOR_DENIED':
      return transitionPageState(settledState, 'SENSOR_DENIED', event.nowMs);
    case 'SENSOR_ALLOWED':
      return transitionPageState(settledState, 'ACTIVE', event.nowMs, true);
    case 'MODE_SYNC':
      if (event.interactionMode === 'hover') {
        return settledState;
      }

      return {
        ...settledState,
        hoverLock: {
          enabled: false,
          cardVariant: null,
          keyboardMode: settledState.hoverLock.keyboardMode
        }
      };
    case 'KEYBOARD_MODE_ENTER':
      return {
        ...settledState,
        hoverLock: {
          ...settledState.hoverLock,
          keyboardMode: true
        }
      };
    case 'KEYBOARD_MODE_EXIT':
      if (!settledState.hoverLock.keyboardMode) {
        return settledState;
      }

      return {
        ...settledState,
        hoverLock: {
          ...settledState.hoverLock,
          keyboardMode: false
        }
      };
    case 'CARD_FOCUS': {
      if (isInteractionBlocked(settledState)) {
        return settledState;
      }

      const nextExpandedCardVariant =
        event.interactionMode === 'hover'
          ? event.available
            ? event.cardVariant
            : null
          : settledState.expandedCardVariant;
      const focusedState: LandingInteractionState = {
        ...settledState,
        focusedCardVariant: event.cardVariant,
        expandedCardVariant: nextExpandedCardVariant
      };

      if (event.interactionMode !== 'hover') {
        return clearHoverLock(focusedState);
      }

      if (!event.available) {
        return clearHoverLock(focusedState);
      }

      return enableHoverLock(focusedState, event.cardVariant);
    }
    case 'CARD_ACTIVATE': {
      if (isInteractionBlocked(settledState) || !event.available) {
        return settledState;
      }

      const nextExpandedCardVariant = settledState.expandedCardVariant === event.cardVariant ? null : event.cardVariant;
      const activatedState: LandingInteractionState = {
        ...settledState,
        focusedCardVariant: event.cardVariant,
        expandedCardVariant: nextExpandedCardVariant
      };

      if (event.interactionMode !== 'hover') {
        return clearHoverLock(activatedState);
      }

      if (!nextExpandedCardVariant) {
        return clearHoverLock(activatedState);
      }

      return enableHoverLock(activatedState, nextExpandedCardVariant);
    }
    case 'CARD_EXPAND': {
      if (isInteractionBlocked(settledState) || !event.available) {
        return settledState;
      }

      const expandedState: LandingInteractionState = {
        ...settledState,
        focusedCardVariant: event.cardVariant,
        expandedCardVariant: event.cardVariant
      };

      if (event.interactionMode !== 'hover') {
        return clearHoverLock(expandedState);
      }

      return enableHoverLock(expandedState, event.cardVariant);
    }
    case 'CARD_COLLAPSE': {
      if (isInteractionBlocked(settledState)) {
        return settledState;
      }

      const nextCardVariant = event.cardVariant;
      const shouldCollapseCurrent =
        nextCardVariant === null || settledState.expandedCardVariant === nextCardVariant || settledState.focusedCardVariant === nextCardVariant;

      if (!shouldCollapseCurrent) {
        return settledState;
      }

      return clearHoverLock({
        ...settledState,
        focusedCardVariant: settledState.focusedCardVariant === nextCardVariant || nextCardVariant === null ? null : settledState.focusedCardVariant,
        expandedCardVariant: settledState.expandedCardVariant === nextCardVariant || nextCardVariant === null ? null : settledState.expandedCardVariant
      });
    }
    case 'CARD_HOVER_ENTER': {
      if (event.interactionMode !== 'hover' || isInteractionBlocked(settledState)) {
        return settledState;
      }

      if (event.available) {
        return {
          ...enableHoverLock(
            {
              ...settledState,
              focusedCardVariant: event.cardVariant,
              expandedCardVariant: event.cardVariant
            },
            event.cardVariant
          ),
          hoverLock: {
            enabled: true,
            cardVariant: event.cardVariant,
            keyboardMode: false
          }
        };
      }

      return {
        ...enableHoverLock(settledState, event.cardVariant),
        hoverLock: {
          enabled: true,
          cardVariant: event.cardVariant,
          keyboardMode: false
        }
      };
    }
    case 'CARD_HOVER_LEAVE': {
      if (
        event.interactionMode !== 'hover' ||
        isInteractionBlocked(settledState) ||
        settledState.hoverLock.cardVariant !== event.cardVariant ||
        settledState.hoverLock.keyboardMode
      ) {
        return settledState;
      }

      return clearHoverLock({
        ...settledState,
        expandedCardVariant: settledState.expandedCardVariant === event.cardVariant ? null : settledState.expandedCardVariant,
        focusedCardVariant: settledState.focusedCardVariant === event.cardVariant ? null : settledState.focusedCardVariant
      });
    }
    case 'ESCAPE':
      if (isInteractionBlocked(settledState)) {
        return settledState;
      }

      return clearHoverLock({
        ...settledState,
        focusedCardVariant: null,
        expandedCardVariant: null
      });
    default:
      return settledState;
  }
}

export function resolveCardStateForVariant(
  state: LandingInteractionState,
  cardVariant: string
): CardState {
  if (state.pageState === 'INACTIVE' || state.pageState === 'TRANSITIONING') {
    return 'NORMAL';
  }

  if (state.expandedCardVariant === cardVariant) {
    return 'EXPANDED';
  }

  if (state.focusedCardVariant === cardVariant) {
    return 'FOCUSED';
  }

  return 'NORMAL';
}

export function isCardPointerInteractionBlocked(
  state: LandingInteractionState,
  cardVariant: string
): boolean {
  if (!state.hoverLock.enabled || state.hoverLock.cardVariant === cardVariant) {
    return false;
  }

  return state.hoverLock.keyboardMode;
}

export function isCardKeyboardAriaDisabled(
  state: LandingInteractionState,
  cardVariant: string
): boolean {
  if (!state.hoverLock.enabled || !state.hoverLock.keyboardMode) {
    return false;
  }

  return state.hoverLock.cardVariant !== cardVariant;
}

export function resolveCardTabIndex(
  state: LandingInteractionState,
  cardVariant: string
): number {
  if (!state.hoverLock.enabled) {
    return 0;
  }

  if (state.hoverLock.cardVariant === cardVariant) {
    return 0;
  }

  return state.hoverLock.keyboardMode ? 0 : -1;
}
