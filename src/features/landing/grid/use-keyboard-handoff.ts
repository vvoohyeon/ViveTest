import type {
  Dispatch,
  FocusEvent as ReactFocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  RefObject
} from 'react';
import {useCallback, useEffect} from 'react';

import type {LandingCard} from '@/features/variant-registry';
import type {LandingCardInteractionMode} from '@/features/landing/grid/landing-grid-card';
import type {LandingMobileLifecycleState} from '@/features/landing/grid/mobile-lifecycle';
import {
  focusCardByVariant,
  getCardRootElement,
  getExpandedFocusableElements,
  isDocumentLevelFocusTarget,
  isVisibleFocusableElement,
  queueFocusCallback,
  resolveAdjacentCardVariant
} from '@/features/landing/grid/interaction-dom';
import type {
  LandingInteractionEvent,
  LandingInteractionState
} from '@/features/landing/model/interaction-state';
import type {DesktopTransitionReason} from '@/features/landing/grid/use-desktop-motion-controller';

type LandingInteractionDispatch = Dispatch<LandingInteractionEvent>;

interface UseKeyboardHandoffInput {
  state: LandingInteractionState;
  dispatch: LandingInteractionDispatch;
  interactionMode: LandingCardInteractionMode;
  isMobileViewport: boolean;
  shellRef: RefObject<HTMLElement | null>;
  cardVariants: readonly string[];
  firstEnterableCardVariant: string | null;
  mobileLifecycleState: LandingMobileLifecycleState;
  beginMobileOpen: (cardVariant: string, syncInteraction?: boolean) => void;
  beginMobileKeyboardHandoff: (sourceVariant: string, nextCardVariant: string | null, nowMs: number) => void;
  collapseExpandedCard: () => void;
  setDesktopTransitionReason: (reason: DesktopTransitionReason) => void;
  recordPointerInput: (event: PointerEvent | MouseEvent | WheelEvent) => void;
}

interface UseKeyboardHandoffOutput {
  resolveKeyboardHandlers: (
    card: LandingCard,
    input: {cardEnterable: boolean; keyboardAriaDisabled: boolean}
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
  firstEnterableCardVariant,
  mobileLifecycleState,
  beginMobileOpen,
  beginMobileKeyboardHandoff,
  collapseExpandedCard,
  setDesktopTransitionReason,
  recordPointerInput
}: UseKeyboardHandoffInput): UseKeyboardHandoffOutput {
  const focusLandingReverseGnbTarget = useCallback((): boolean => {
    if (typeof document === 'undefined') {
      return false;
    }

    const selectors = isMobileViewport
      ? ['[data-testid="gnb-mobile-menu-trigger"]', '.gnb-mobile .gnb-ci-link']
      : ['[data-testid="gnb-settings-trigger"]', '.gnb-desktop-links a:last-of-type', '.gnb-desktop .gnb-ci-link'];

    for (const selector of selectors) {
      const candidate = document.querySelector<HTMLElement>(selector);
      if (!isVisibleFocusableElement(candidate)) {
        continue;
      }

      candidate.focus();
      return true;
    }

    return false;
  }, [isMobileViewport]);

  const queueLandingReverseGnbTargetFocus = useCallback(() => {
    queueFocusCallback(() => {
      focusLandingReverseGnbTarget();
    });
  }, [focusLandingReverseGnbTarget]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        dispatch({
          type: 'KEYBOARD_MODE_ENTER'
        });

        if (!event.shiftKey && isDocumentLevelFocusTarget(event.target) && focusCardByVariant(shellRef.current, firstEnterableCardVariant)) {
          event.preventDefault();
          return;
        }
      } else if (event.key === 'Escape') {
        dispatch({
          type: 'ESCAPE',
          nowMs: event.timeStamp
        });
      }
    };

    const handleGlobalPointerMove = (event: PointerEvent) => {
      recordPointerInput(event);
    };

    const handleGlobalPointerDown = (event: MouseEvent) => {
      recordPointerInput(event);
      dispatch({
        type: 'KEYBOARD_MODE_EXIT'
      });
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    window.addEventListener('pointermove', handleGlobalPointerMove, {passive: true});
    window.addEventListener('mousedown', handleGlobalPointerDown, {passive: true});

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('mousedown', handleGlobalPointerDown);
    };
  }, [dispatch, firstEnterableCardVariant, recordPointerInput, shellRef]);

  const resolveKeyboardHandlers = useCallback(
    (card: LandingCard, input: {cardEnterable: boolean; keyboardAriaDisabled: boolean}) => {
      const {cardEnterable, keyboardAriaDisabled} = input;

      const handleExpandedBodyKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
        if (event.key !== 'Tab' || !cardEnterable) {
          return;
        }

        dispatch({type: 'KEYBOARD_MODE_ENTER'});

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

        setDesktopTransitionReason('handoff');
        if (focusCardByVariant(shellRef.current, nextCardVariant)) {
          event.preventDefault();
        }
      };

      return {
        onFocus: (event: ReactFocusEvent<HTMLElement>) => {
          setDesktopTransitionReason(
            state.expandedCardVariant && state.expandedCardVariant !== card.variant && cardEnterable
              ? 'handoff'
              : state.expandedCardVariant && state.expandedCardVariant !== card.variant
                ? 'collapse'
                : 'expand'
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
            dispatch({type: 'KEYBOARD_MODE_ENTER'});

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
              setDesktopTransitionReason('handoff');
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
              setDesktopTransitionReason('handoff');
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

              setDesktopTransitionReason('handoff');

              if (focusCardByVariant(shellRef.current, previousCardVariant)) {
                event.preventDefault();
                return;
              }

              setDesktopTransitionReason('collapse');
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

            setDesktopTransitionReason('expand');
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
      queueLandingReverseGnbTargetFocus,
      setDesktopTransitionReason,
      shellRef,
      state.expandedCardVariant
    ]
  );

  return {
    resolveKeyboardHandlers
  };
}
