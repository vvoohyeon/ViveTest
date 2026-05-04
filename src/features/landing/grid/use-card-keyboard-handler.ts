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
  resolveAdjacentCardVariant
} from '@/features/landing/grid/interaction-dom';
import type {
  LandingInteractionEvent,
  LandingInteractionState
} from '@/features/landing/model/interaction-state';

type LandingInteractionDispatch = Dispatch<LandingInteractionEvent>;
type TransitionIntent = 'expand' | 'collapse' | 'handoff';

interface UseCardKeyboardHandlerInput {
  state: LandingInteractionState;
  dispatch: LandingInteractionDispatch;
  interactionMode: LandingCardInteractionMode;
  isMobileViewport: boolean;
  shellRef: RefObject<HTMLElement | null>;
  cardVariants: readonly string[];
  mobileLifecycleState: LandingMobileLifecycleState;
  beginMobileOpen: (cardVariant: string, syncInteraction?: boolean) => void;
  beginMobileKeyboardHandoff: (sourceVariant: string, nextCardVariant: string | null, nowMs: number) => void;
  collapseExpandedCard: () => void;
  queueLandingReverseGnbTargetFocus: () => void;
  onFocusTransitionIntent: (intent: TransitionIntent) => void;
}

interface UseCardKeyboardHandlerOutput {
  resolveKeyboardHandlers: (
    card: LandingCard,
    input: {cardEnterable: boolean; keyboardAriaDisabled: boolean}
  ) => {
    onFocus: (event: ReactFocusEvent<HTMLElement>) => void;
    onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
    onExpandedBodyKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
  };
}

function resolveOnFocusTransitionIntent(
  expandedVariant: string | null,
  thisVariant: string,
  cardEnterable: boolean
): TransitionIntent {
  if (expandedVariant && expandedVariant !== thisVariant) {
    return cardEnterable ? 'handoff' : 'collapse';
  }

  return 'expand';
}

export function useCardKeyboardHandler({
  state,
  dispatch,
  interactionMode,
  isMobileViewport,
  shellRef,
  cardVariants,
  mobileLifecycleState,
  beginMobileOpen,
  beginMobileKeyboardHandoff,
  collapseExpandedCard,
  queueLandingReverseGnbTargetFocus,
  onFocusTransitionIntent
}: UseCardKeyboardHandlerInput): UseCardKeyboardHandlerOutput {
  const resolveKeyboardHandlers = useCallback(
    (card: LandingCard, input: {cardEnterable: boolean; keyboardAriaDisabled: boolean}) => {
      const {cardEnterable, keyboardAriaDisabled} = input;

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
              resolveAdjacentCardVariant(cardVariants, card.variant, -1) ?? card.variant,
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

        const nextCardVariant = resolveAdjacentCardVariant(cardVariants, card.variant, 1);
        if (isMobileViewport) {
          event.preventDefault();
          beginMobileKeyboardHandoff(card.variant, nextCardVariant, event.timeStamp);
          return;
        }

        onFocusTransitionIntent('handoff');
        if (focusCardByVariant(shellRef.current, nextCardVariant)) {
          event.preventDefault();
        }
      };

      return {
        onFocus: (event: ReactFocusEvent<HTMLElement>) => {
          onFocusTransitionIntent(
            resolveOnFocusTransitionIntent(
              state.expandedCardVariant,
              card.variant,
              cardEnterable
            )
          );
          dispatch({
            type: 'CARD_FOCUS',
            nowMs: event.timeStamp,
            interactionMode,
            cardVariant: card.variant,
            available: cardEnterable
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
              const nextCardVariant = resolveAdjacentCardVariant(cardVariants, card.variant, 1);
              onFocusTransitionIntent('handoff');
              if (focusCardByVariant(shellRef.current, nextCardVariant)) {
                event.preventDefault();
              }

              return;
            }

            if (event.shiftKey && firstFocusable && target === firstFocusable) {
              if (isMobileViewport) {
                event.preventDefault();
                beginMobileKeyboardHandoff(
                  card.variant,
                  resolveAdjacentCardVariant(cardVariants, card.variant, -1) ?? card.variant,
                  event.timeStamp
                );
                return;
              }

              const previousCardVariant = resolveAdjacentCardVariant(cardVariants, card.variant, -1);
              onFocusTransitionIntent('handoff');
              if (focusCardByVariant(shellRef.current, previousCardVariant)) {
                event.preventDefault();
              }

              return;
            }

            if (event.shiftKey && target === event.currentTarget) {
              const previousCardVariant = resolveAdjacentCardVariant(cardVariants, card.variant, -1);
              if (isMobileViewport) {
                event.preventDefault();
                if (previousCardVariant) {
                  beginMobileKeyboardHandoff(card.variant, previousCardVariant, event.timeStamp);
                  return;
                }

                beginMobileKeyboardHandoff(card.variant, null, event.timeStamp);
                queueLandingReverseGnbTargetFocus();
                return;
              }

              onFocusTransitionIntent('handoff');

              if (focusCardByVariant(shellRef.current, previousCardVariant)) {
                event.preventDefault();
                return;
              }

              onFocusTransitionIntent('collapse');
              dispatch({
                type: 'CARD_COLLAPSE',
                nowMs: event.timeStamp,
                interactionMode,
                cardVariant: card.variant
              });
              queueLandingReverseGnbTargetFocus();
              event.preventDefault();
            }

            return;
          }

          if ((event.key === 'Enter' || event.key === ' ') && keyboardAriaDisabled) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }

          if (event.key === 'Escape') {
            event.preventDefault();
            collapseExpandedCard();
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
      collapseExpandedCard,
      dispatch,
      interactionMode,
      isMobileViewport,
      mobileLifecycleState.cardVariant,
      mobileLifecycleState.phase,
      onFocusTransitionIntent,
      queueLandingReverseGnbTargetFocus,
      shellRef,
      state.expandedCardVariant
    ]
  );

  return {resolveKeyboardHandlers};
}
