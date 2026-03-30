export const DESKTOP_EXPAND_DELAY_MS = 160;
export const DESKTOP_COLLAPSE_DELAY_MS = 140;
export const CORE_MOTION_DURATION_MS = 280;
export const CORE_MOTION_REVEAL_DELAYS_MS = [40, 100, 160] as const;

export type HoverIntentAction = 'expand' | 'collapse' | 'handoff';

export interface HoverIntentToken {
  token: number;
  cardId: string;
  action: HoverIntentAction;
}

export function nextHoverIntentToken(previousToken: number, cardId: string, action: HoverIntentAction): HoverIntentToken {
  return {
    token: previousToken + 1,
    cardId,
    action
  };
}

export function isEnterableHandoffCandidate(input: {
  previousExpandedCardId: string | null;
  nextCardId: string;
  enterable: boolean;
}): boolean {
  if (!input.enterable) {
    return false;
  }

  if (!input.previousExpandedCardId) {
    return false;
  }

  return input.previousExpandedCardId !== input.nextCardId;
}

export function resolveDesktopTransformOriginX(input: {
  cardOffset: number;
  rowCardCount: number;
}): '0%' | '50%' | '100%' {
  if (input.rowCardCount <= 1 || input.cardOffset === 0) {
    return '0%';
  }

  if (input.cardOffset === input.rowCardCount - 1) {
    return '100%';
  }

  return '50%';
}
