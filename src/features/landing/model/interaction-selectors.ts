import type {CardState} from '@/features/landing/model/state-types';
import type {LandingInteractionState} from '@/features/landing/model/interaction-state';

// 상태 → 카드 한 장의 표현을 파생하는 셀렉터들. 리듀서와 한 파일에 살 이유가 없다 —
// 의존 방향이 반대다. 리듀서의 소비자는 컨트롤러 하나인데, 이 넷은 컨트롤러·카드 계약·
// 모델 배럴이 함께 읽는다. 같은 파일에 두면 그 셋이 리듀서 전체에 의존하게 된다.

export type LandingCardVisualState = 'normal' | 'expanded' | 'focused';

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

export function resolveVisualState(input: {
  cardEnterable: boolean;
  cardState: CardState;
  desktopCleanupPending: boolean;
  desktopClosingVisible: boolean;
  transitionExpanded: boolean;
}): LandingCardVisualState {
  const {
    cardEnterable,
    cardState,
    desktopCleanupPending,
    desktopClosingVisible,
    transitionExpanded
  } = input;

  if (
    transitionExpanded ||
    desktopClosingVisible ||
    desktopCleanupPending ||
    (cardState === 'EXPANDED' && cardEnterable)
  ) {
    return 'expanded';
  }

  return cardState === 'FOCUSED' ? 'focused' : 'normal';
}

export function isKeyboardModeBlocked(
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
  cardVariant: string,
  enterable: boolean
): number {
  // D1/BQ-26: unavailable(non-enterable) 카드는 모든 상태에서 tab order에서 제외한다.
  if (!enterable) {
    return -1;
  }

  if (!state.hoverLock.enabled) {
    return 0;
  }

  if (state.hoverLock.cardVariant === cardVariant) {
    return 0;
  }

  return state.hoverLock.keyboardMode ? 0 : -1;
}
