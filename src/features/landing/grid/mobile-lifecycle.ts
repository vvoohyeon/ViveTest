export const MOBILE_EXPANDED_DURATION_MS = 280;

export type LandingMobileExpandedPhase = 'NORMAL' | 'OPENING' | 'OPEN' | 'CLOSING';

export interface LandingMobileSnapshot {
  cardHeightPx: number;
  anchorTopPx: number;
  titleTopPx: number;
}

export interface LandingMobileLifecycleState {
  phase: LandingMobileExpandedPhase;
  cardId: string | null;
  queuedClose: boolean;
  snapshot: LandingMobileSnapshot | null;
  snapshotWriteCount: number;
  restoreReady: boolean;
}

export type LandingMobileLifecycleEvent =
  | {type: 'OPEN_START'; cardId: string; snapshot: LandingMobileSnapshot}
  | {type: 'OPEN_SETTLED'}
  | {type: 'QUEUE_CLOSE'}
  | {type: 'QUEUE_CLOSE_CANCEL'}
  | {type: 'CLOSE_START'}
  | {type: 'RESTORE_READY'}
  | {type: 'CLOSE_SETTLED'}
  | {type: 'RESET'};

export const initialLandingMobileLifecycleState: LandingMobileLifecycleState = {
  phase: 'NORMAL',
  cardId: null,
  queuedClose: false,
  snapshot: null,
  snapshotWriteCount: 0,
  restoreReady: false
};

export function reduceLandingMobileLifecycleState(
  state: LandingMobileLifecycleState,
  event: LandingMobileLifecycleEvent
): LandingMobileLifecycleState {
  switch (event.type) {
    case 'OPEN_START':
      if (state.phase === 'CLOSING') {
        return state;
      }

      if (state.phase !== 'NORMAL' && state.cardId === event.cardId && state.snapshot) {
        return {
          ...state,
          phase: 'OPENING',
          queuedClose: false,
          restoreReady: false
        };
      }

      return {
        phase: 'OPENING',
        cardId: event.cardId,
        queuedClose: false,
        snapshot: event.snapshot,
        snapshotWriteCount: 1,
        restoreReady: false
      };
    case 'OPEN_SETTLED':
      if (state.phase !== 'OPENING') {
        return state;
      }

      if (state.queuedClose) {
        return {
          ...state,
          phase: 'CLOSING',
          restoreReady: false
        };
      }

      return {
        ...state,
        phase: 'OPEN'
      };
    case 'QUEUE_CLOSE':
      if (state.phase === 'OPENING') {
        return {
          ...state,
          queuedClose: true
        };
      }

      if (state.phase !== 'OPEN') {
        return state;
      }

      return {
        ...state,
        phase: 'CLOSING',
        restoreReady: false
      };
    case 'QUEUE_CLOSE_CANCEL':
      if (state.phase !== 'OPENING' || !state.queuedClose) {
        return state;
      }

      return {
        ...state,
        queuedClose: false
      };
    case 'CLOSE_START':
      if (state.phase !== 'OPEN') {
        return state;
      }

      return {
        ...state,
        phase: 'CLOSING',
        restoreReady: false
      };
    case 'RESTORE_READY':
      if (state.phase !== 'CLOSING') {
        return state;
      }

      return {
        ...state,
        restoreReady: true
      };
    case 'CLOSE_SETTLED':
      if (state.phase !== 'CLOSING' || !state.restoreReady) {
        return state;
      }
    case 'RESET':
      return initialLandingMobileLifecycleState;
    default:
      return state;
  }
}
