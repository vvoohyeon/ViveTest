import type {
  Dispatch,
  FocusEvent as ReactFocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  RefObject
} from 'react';
import {useCallback} from 'react';

import type {LandingCard} from '@/features/variant-registry';
import type {LandingCardInteractionMode} from '@/features/landing/grid/landing-grid-card';
import type {LandingMobileLifecycleState} from '@/features/landing/grid/mobile-lifecycle';
import {
  focusCardByVariant,
  getCardRootElement,
  getExpandedFocusableElements,
  queueFocusCardByVariant,
  resolveAdjacentEnterableCardVariant
} from '@/features/landing/grid/interaction-dom';
import type {
  LandingInteractionEvent,
  LandingInteractionState
} from '@/features/landing/model/interaction-state';

type LandingInteractionDispatch = Dispatch<LandingInteractionEvent>;
type TransitionIntent = 'expand' | 'collapse' | 'handoff';

export interface FocusCardFromKeyboardInput {
  cardVariant: string;
  cardEnterable: boolean;
  cardExpandable: boolean;
  nowMs: number;
}

interface UseCardKeyboardHandlerInput {
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
  onFocusTransitionIntent: (intent: TransitionIntent) => void;
}

interface UseCardKeyboardHandlerOutput {
  resolveKeyboardHandlers: (
    card: LandingCard,
    input: {cardEnterable: boolean; keyboardActivationBlocked: boolean}
  ) => {
    onFocus: (event: ReactFocusEvent<HTMLElement>) => void;
    onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
    onExpandedBodyKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
  };
}

export function useCardKeyboardHandler({
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
  onFocusTransitionIntent
}: UseCardKeyboardHandlerInput): UseCardKeyboardHandlerOutput {
  const queueCardHandoff = useCallback(
    (targetCardVariant: string | null, nowMs: number): boolean => {
      if (!targetCardVariant) {
        return false;
      }

      const targetCardEnterable = isCardEnterableByVariant(targetCardVariant);
      focusCardFromKeyboard({
        cardVariant: targetCardVariant,
        cardEnterable: targetCardEnterable,
        cardExpandable: isCardExpandableByVariant(targetCardVariant),
        nowMs,
      });
      queueFocusCardByVariant(shellRef.current, targetCardVariant);
      return true;
    },
    [
      focusCardFromKeyboard,
      isCardExpandableByVariant,
      isCardEnterableByVariant,
      shellRef
    ]
  );

  const resolveKeyboardHandlers = useCallback(
    (card: LandingCard, input: {cardEnterable: boolean; keyboardActivationBlocked: boolean}) => {
      const {cardEnterable, keyboardActivationBlocked} = input;

      const handleExpandedBodyKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
        if (event.key !== 'Tab' || !cardEnterable) {
          return;
        }

        const target = event.target instanceof HTMLElement ? event.target : null;
        if (!target) {
          return;
        }

        const cardElement = getCardRootElement(event.currentTarget) ?? event.currentTarget;
        const focusables = getExpandedFocusableElements(cardElement);
        const focusIndex = focusables.findIndex((candidate) => candidate === target);
        if (focusIndex < 0) {
          return;
        }

        if (event.shiftKey) {
          if (focusIndex > 0) {
            event.preventDefault();
            focusables[focusIndex - 1]?.focus();
            return;
          }

          if (isMobileViewport) {
            event.preventDefault();
            beginMobileKeyboardHandoff(
              card.variant,
              resolveAdjacentEnterableCardVariant(cardVariants, card.variant, -1, isCardEnterableByVariant) ?? card.variant,
              event.timeStamp
            );
            return;
          }

          onFocusTransitionIntent('handoff');
          if (focusCardByVariant(shellRef.current, card.variant)) {
            event.preventDefault();
          }

          return;
        }

        if (focusIndex < focusables.length - 1) {
          event.preventDefault();
          focusables[focusIndex + 1]?.focus();
          return;
        }

        const nextCardVariant = resolveAdjacentEnterableCardVariant(cardVariants, card.variant, 1, isCardEnterableByVariant);
        if (isMobileViewport) {
          event.preventDefault();
          beginMobileKeyboardHandoff(card.variant, nextCardVariant, event.timeStamp);
          return;
        }

        if (queueCardHandoff(nextCardVariant, event.timeStamp)) {
          event.preventDefault();
        }
      };

      return {
        onFocus: (event: ReactFocusEvent<HTMLElement>) => {
          focusCardFromKeyboard({
            cardVariant: card.variant,
            cardEnterable,
            cardExpandable: card.type === 'test' && cardEnterable,
            nowMs: event.timeStamp,
          });
        },
        onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => {
          if (event.key === 'Tab') {
            if (!cardEnterable) {
              return;
            }

            const cardElement = getCardRootElement(event.currentTarget) ?? event.currentTarget;
            const isExpanded = state.expandedCardVariant === card.variant;
            const focusables = getExpandedFocusableElements(cardElement);
            const firstFocusable = focusables[0] ?? null;
            const lastFocusable = focusables[focusables.length - 1] ?? null;
            const target = event.target instanceof HTMLElement ? event.target : null;

            if (!event.shiftKey && isExpanded && target === event.currentTarget && firstFocusable) {
              event.preventDefault();
              firstFocusable.focus();
              return;
            }

            if (!event.shiftKey && lastFocusable && target === lastFocusable) {
              const nextCardVariant = resolveAdjacentEnterableCardVariant(cardVariants, card.variant, 1, isCardEnterableByVariant);
              if (queueCardHandoff(nextCardVariant, event.timeStamp)) {
                event.preventDefault();
              }

              return;
            }

            if (event.shiftKey && firstFocusable && target === firstFocusable) {
              if (isMobileViewport) {
                event.preventDefault();
                beginMobileKeyboardHandoff(
                  card.variant,
                  resolveAdjacentEnterableCardVariant(cardVariants, card.variant, -1, isCardEnterableByVariant) ?? card.variant,
                  event.timeStamp
                );
                return;
              }

              const previousCardVariant = resolveAdjacentEnterableCardVariant(cardVariants, card.variant, -1, isCardEnterableByVariant);
              if (queueCardHandoff(previousCardVariant, event.timeStamp)) {
                event.preventDefault();
              }

              return;
            }

            if (event.shiftKey && target === event.currentTarget) {
              const previousCardVariant = resolveAdjacentEnterableCardVariant(cardVariants, card.variant, -1, isCardEnterableByVariant);
              if (isMobileViewport) {
                if (previousCardVariant) {
                  event.preventDefault();
                  beginMobileKeyboardHandoff(card.variant, previousCardVariant, event.timeStamp);
                  return;
                }

                // 이전 카드가 없다 — 여기서 `preventDefault` 를 걸고 GNB DOM 을 직접 뒤지는
                // 대신, 닫기만 하고 **브라우저가 문서 순서대로** 뒤로 보내게 둔다. skip link
                // 도입으로 탭 순서가 언제나 문서 순서이므로 그 이동이 곧 GNB 다.
                beginMobileKeyboardHandoff(card.variant, null, event.timeStamp);
                return;
              }

              if (queueCardHandoff(previousCardVariant, event.timeStamp)) {
                event.preventDefault();
                return;
              }

              // 닫기만 하고 포커스 이동은 브라우저에 맡긴다(위와 같은 이유).
              onFocusTransitionIntent('collapse');
              dispatch({
                type: 'CARD_COLLAPSE',
                nowMs: event.timeStamp,
                interactionMode,
                cardVariant: card.variant
              });
            }

            return;
          }

          if ((event.key === 'Enter' || event.key === ' ') && keyboardActivationBlocked) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }

          if (card.type === 'blog' && (event.key === 'Enter' || event.key === ' ')) {
            return;
          }

          if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) {
            event.preventDefault();

            if (!cardEnterable) {
              return;
            }

            if (isMobileViewport) {
              if (mobileLifecycleState.phase === 'NORMAL' && mobileLifecycleState.cardVariant !== card.variant) {
                beginMobileOpen(card.variant);
              }

              return;
            }

            onFocusTransitionIntent('expand');
            dispatch({
              type: 'CARD_EXPAND',
              nowMs: event.timeStamp,
              interactionMode,
              cardVariant: card.variant,
              available: cardEnterable
            });
          }
        },
        onExpandedBodyKeyDown: handleExpandedBodyKeyDown
      };
    },
    [
      beginMobileKeyboardHandoff,
      beginMobileOpen,
      cardVariants,
      dispatch,
      focusCardFromKeyboard,
      interactionMode,
      isCardEnterableByVariant,
      isMobileViewport,
      mobileLifecycleState.cardVariant,
      mobileLifecycleState.phase,
      onFocusTransitionIntent,
      queueCardHandoff,
          shellRef,
      state.expandedCardVariant
    ]
  );

  return {resolveKeyboardHandlers};
}
