import type {
  Dispatch,
  MouseEvent as ReactMouseEvent,
  RefObject
} from 'react';
import {useCallback, useRef} from 'react';

import {isEnterableCard, type LandingCard} from '@/features/variant-registry';
import {
  DESKTOP_COLLAPSE_DELAY_MS,
  DESKTOP_EXPAND_DELAY_MS,
  isEnterableHandoffCandidate,
  nextHoverIntentToken,
  type HoverIntentAction
} from '@/features/landing/grid/hover-intent';
import {
  getCardRootElement,
  resolveCardBoundaryElement
} from '@/features/landing/grid/interaction-dom';
import type {LandingCardInteractionMode} from '@/features/landing/grid/landing-grid-card';
import type {
  LandingInteractionEvent,
  LandingInteractionState
} from '@/features/landing/model/interaction-state';
import type {DesktopTransitionReason} from '@/features/landing/grid/use-desktop-motion-controller';

type LandingInteractionDispatch = Dispatch<LandingInteractionEvent>;

interface PointerLocation {
  x: number;
  y: number;
  valid: boolean;
}

interface UseHoverIntentControllerInput {
  state: LandingInteractionState;
  dispatch: LandingInteractionDispatch;
  interactionMode: LandingCardInteractionMode;
  isMobileViewport: boolean;
  shellRef: RefObject<HTMLElement | null>;
  setDesktopTransitionReason: (reason: DesktopTransitionReason) => void;
}

interface UseHoverIntentControllerOutput {
  clearHoverTimer: () => void;
  recordPointerInput: (event: PointerEvent | MouseEvent | WheelEvent) => void;
  isPointerInsideCardBoundary: (cardVariant: string) => boolean;
  resolveHoverHandlers: (card: LandingCard) => {
    onMouseEnter: ReactMouseEventHandler;
    onMouseLeave: ReactMouseEventHandler;
  };
}

type ReactMouseEventHandler = (event: ReactMouseEvent<HTMLElement>) => void;

export function useHoverIntentController({
  state,
  dispatch,
  interactionMode,
  isMobileViewport,
  shellRef,
  setDesktopTransitionReason
}: UseHoverIntentControllerInput): UseHoverIntentControllerOutput {
  const hoverTimerRef = useRef<number | null>(null);
  const hoverIntentTokenRef = useRef(0);
  const pointerWithinCardVariantRef = useRef<string | null>(null);
  const pointerLocationRef = useRef<PointerLocation>({
    x: 0,
    y: 0,
    valid: false
  });

  const clearHoverTimerOnly = useCallback(() => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  const clearHoverTimer = useCallback(() => {
    clearHoverTimerOnly();
    pointerWithinCardVariantRef.current = null;
  }, [clearHoverTimerOnly]);

  const recordPointerInput = useCallback((event: PointerEvent | MouseEvent | WheelEvent) => {
    if ('clientX' in event && 'clientY' in event) {
      pointerLocationRef.current = {
        x: event.clientX,
        y: event.clientY,
        valid: true
      };
    }

    const target = event.target instanceof HTMLElement ? getCardRootElement(event.target) : null;
    pointerWithinCardVariantRef.current = target?.dataset.cardVariant ?? null;
  }, []);

  const isPointerInsideCardBoundary = useCallback(
    (cardVariant: string) => {
      if (!pointerLocationRef.current.valid) {
        return false;
      }

      const boundaryElement = resolveCardBoundaryElement(shellRef.current, cardVariant);
      if (!boundaryElement) {
        return false;
      }

      const {x, y} = pointerLocationRef.current;
      const rect = boundaryElement.getBoundingClientRect();
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    },
    [shellRef]
  );

  const scheduleHoverIntent = useCallback(
    (input: {
      cardVariant: string;
      delayMs: number;
      action: HoverIntentAction;
      run: () => void;
    }) => {
      clearHoverTimerOnly();
      const nextToken = nextHoverIntentToken(hoverIntentTokenRef.current, input.cardVariant, input.action);
      hoverIntentTokenRef.current = nextToken.token;

      hoverTimerRef.current = window.setTimeout(() => {
        if (hoverIntentTokenRef.current !== nextToken.token) {
          return;
        }

        input.run();
      }, input.delayMs);
    },
    [clearHoverTimerOnly]
  );

  const resolveHoverHandlers = useCallback(
    (card: LandingCard) => {
      const cardEnterable = isEnterableCard(card);

      return {
        onMouseEnter: (event: ReactMouseEvent<HTMLElement>) => {
          if (interactionMode !== 'hover' || isMobileViewport) {
            return;
          }

          pointerWithinCardVariantRef.current = cardEnterable ? card.variant : null;
          const handoff = isEnterableHandoffCandidate({
            previousExpandedCardVariant: state.expandedCardVariant,
            nextCardVariant: card.variant,
            enterable: cardEnterable
          });

          if (handoff) {
            setDesktopTransitionReason('handoff');
            dispatch({
              type: 'CARD_COLLAPSE',
              nowMs: event.timeStamp,
              interactionMode,
              cardVariant: state.expandedCardVariant
            });
            dispatch({
              type: 'CARD_EXPAND',
              nowMs: event.timeStamp,
              interactionMode,
              cardVariant: card.variant,
              available: cardEnterable
            });
            return;
          }

          if (!cardEnterable) {
            clearHoverTimer();
            if (state.expandedCardVariant) {
              setDesktopTransitionReason('collapse');
              dispatch({
                type: 'CARD_COLLAPSE',
                nowMs: event.timeStamp,
                interactionMode,
                cardVariant: state.expandedCardVariant
              });
            }
            return;
          }

          scheduleHoverIntent({
            cardVariant: card.variant,
            delayMs: DESKTOP_EXPAND_DELAY_MS,
            action: 'expand',
            run: () => {
              if (pointerWithinCardVariantRef.current !== card.variant) {
                return;
              }

              setDesktopTransitionReason('expand');
              dispatch({
                type: 'CARD_EXPAND',
                nowMs: typeof window !== 'undefined' ? window.performance.now() : event.timeStamp,
                interactionMode,
                cardVariant: card.variant,
                available: cardEnterable
              });
            }
          });
        },
        onMouseLeave: (event: ReactMouseEvent<HTMLElement>) => {
          if (interactionMode !== 'hover' || isMobileViewport) {
            return;
          }

          const relatedTarget = event.relatedTarget;
          if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) {
            return;
          }

          pointerWithinCardVariantRef.current = null;

          if (!cardEnterable) {
            return;
          }

          scheduleHoverIntent({
            cardVariant: card.variant,
            delayMs: DESKTOP_COLLAPSE_DELAY_MS,
            action: 'collapse',
            run: () => {
              if (pointerWithinCardVariantRef.current !== null || isPointerInsideCardBoundary(card.variant)) {
                return;
              }

              setDesktopTransitionReason('collapse');
              dispatch({
                type: 'CARD_COLLAPSE',
                nowMs: typeof window !== 'undefined' ? window.performance.now() : event.timeStamp,
                interactionMode,
                cardVariant: card.variant
              });
            }
          });
        }
      };
    },
    [
      clearHoverTimer,
      dispatch,
      interactionMode,
      isMobileViewport,
      isPointerInsideCardBoundary,
      scheduleHoverIntent,
      setDesktopTransitionReason,
      state.expandedCardVariant
    ]
  );

  return {
    clearHoverTimer,
    recordPointerInput,
    isPointerInsideCardBoundary,
    resolveHoverHandlers
  };
}
