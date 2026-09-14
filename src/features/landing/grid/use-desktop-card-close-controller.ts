import type {
  Dispatch,
  FocusEvent as ReactFocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  RefObject
} from 'react';
import {useCallback} from 'react';

import {isEnterableCard, type LandingCard} from '@/features/variant-registry';
import type {LandingCardInteractionMode} from '@/features/landing/grid/landing-card-contract';
import {
  focusCardByVariant,
  hasOpenHigherPriorityOverlay,
  isCardFocusExit,
  queueFocusCardByVariant
} from '@/features/landing/grid/interaction-dom';
import type {DesktopTransitionReason} from '@/features/landing/grid/use-desktop-motion-controller';
import {
  resolveKeyboardFocusDisposition,
  type LandingInteractionEvent
} from '@/features/landing/model/interaction-state';

// 데스크톱에서 확장을 닫는 경로 전부 — 명시적 닫기, 키보드 포커스 이동이 유발하는 닫기,
// Escape, 그리고 포커스 이탈(blur). 넷이 하나의 파일에 사는 이유는 같은 의존 집합을 공유하는
// 닫힌 군집이기 때문이다: 셋 모두 `closeDesktopCard` 를 호출하고, 밖으로 나가는 간선은
// `useKeyboardHandoff` 가 `focusCardFromKeyboard` 를 받는 것 하나뿐이다.
//
// 모바일에는 해당 경로가 없다 — 넷 모두 `isMobileViewport` 에서 즉시 돌아선다.

export interface DesktopCardCloseControllerInput {
  interactionMode: LandingCardInteractionMode;
  isMobileViewport: boolean;
  shellRef: RefObject<HTMLElement | null>;
  focusedCardVariant: string | null;
  expandedCardVariant: string | null;
  dispatchInteraction: Dispatch<LandingInteractionEvent>;
  cancelPendingHoverIntent: () => void;
  setDesktopTransitionReason: (reason: DesktopTransitionReason) => void;
  setTransitionSourceCardVariant: (cardVariant: string | null) => void;
}

export interface DesktopCardCloseController {
  closeDesktopCard: (input: {
    sourceCardVariant: string;
    reason: 'collapse' | 'handoff';
    focusDisposition: 'return-trigger' | 'preserve-destination';
    nowMs: number;
  }) => void;
  focusCardFromKeyboard: (input: {
    cardVariant: string;
    cardEnterable: boolean;
    cardExpandable: boolean;
    nowMs: number;
  }) => void;
  handleCardKeyDown: (card: LandingCard, event: ReactKeyboardEvent<HTMLElement>) => void;
  handleCardBlur: (card: LandingCard, event: ReactFocusEvent<HTMLElement>) => void;
}

export function useDesktopCardCloseController({
  interactionMode,
  isMobileViewport,
  shellRef,
  focusedCardVariant,
  expandedCardVariant,
  dispatchInteraction,
  cancelPendingHoverIntent,
  setDesktopTransitionReason,
  setTransitionSourceCardVariant
}: DesktopCardCloseControllerInput): DesktopCardCloseController {
  const closeDesktopCard = useCallback(
    (input: {
      sourceCardVariant: string;
      reason: 'collapse' | 'handoff';
      focusDisposition: 'return-trigger' | 'preserve-destination';
      nowMs: number;
    }) => {
      if (isMobileViewport) {
        return;
      }

      const sourceOwnsInteraction =
        focusedCardVariant === input.sourceCardVariant ||
        expandedCardVariant === input.sourceCardVariant;
      if (!sourceOwnsInteraction) {
        return;
      }

      cancelPendingHoverIntent();
      if (input.focusDisposition === 'return-trigger') {
        focusCardByVariant(shellRef.current, input.sourceCardVariant);
      }
      setDesktopTransitionReason(input.reason);
      setTransitionSourceCardVariant(null);
      dispatchInteraction({
        type: 'CARD_COLLAPSE',
        nowMs: input.nowMs,
        interactionMode,
        cardVariant: input.sourceCardVariant
      });
      if (input.focusDisposition === 'return-trigger') {
        queueFocusCardByVariant(shellRef.current, input.sourceCardVariant);
      }
    },
    [
      cancelPendingHoverIntent,
      dispatchInteraction,
      interactionMode,
      expandedCardVariant,
      focusedCardVariant,
      isMobileViewport,
      setDesktopTransitionReason,
      setTransitionSourceCardVariant,
      shellRef
    ]
  );

  const focusCardFromKeyboard = useCallback(
    (input: {
      cardVariant: string;
      cardEnterable: boolean;
      cardExpandable: boolean;
      nowMs: number;
    }) => {
      cancelPendingHoverIntent();
      const disposition = resolveKeyboardFocusDisposition({
        isMobileViewport,
        cardEnterable: input.cardEnterable,
        cardExpandable: input.cardExpandable
      });

      if (disposition === 'preserve-mobile') {
        dispatchInteraction({
          type: 'CARD_FOCUS',
          nowMs: input.nowMs,
          interactionMode,
          cardVariant: input.cardVariant,
          available: input.cardEnterable
        });
        return;
      }

      if (
        disposition === 'expand' &&
        focusedCardVariant === input.cardVariant &&
        expandedCardVariant === input.cardVariant
      ) {
        return;
      }

      if (
        disposition === 'focus-only' &&
        focusedCardVariant === input.cardVariant &&
        expandedCardVariant === null
      ) {
        return;
      }

      const previousExpandedCardVariant = expandedCardVariant;
      if (previousExpandedCardVariant && previousExpandedCardVariant !== input.cardVariant) {
        closeDesktopCard({
          sourceCardVariant: previousExpandedCardVariant,
          reason: disposition === 'expand' ? 'handoff' : 'collapse',
          focusDisposition: 'preserve-destination',
          nowMs: input.nowMs,
        });
      } else if (disposition === 'expand') {
        setDesktopTransitionReason('expand');
      }

      dispatchInteraction(
        disposition === 'expand'
          ? {
              type: 'CARD_EXPAND',
              nowMs: input.nowMs,
              interactionMode,
              cardVariant: input.cardVariant,
              available: input.cardEnterable
            }
          : {
              type: 'CARD_FOCUS',
              nowMs: input.nowMs,
              interactionMode,
              cardVariant: input.cardVariant,
              available: false
            }
      );
    },
    [
      cancelPendingHoverIntent,
      closeDesktopCard,
      dispatchInteraction,
      interactionMode,
      expandedCardVariant,
      focusedCardVariant,
      isMobileViewport,
      setDesktopTransitionReason
    ]
  );

  const handleCardKeyDown = useCallback(
    (card: LandingCard, event: ReactKeyboardEvent<HTMLElement>) => {
      if (
        isMobileViewport ||
        card.type !== 'test' ||
        !isEnterableCard(card) ||
        event.key !== 'Escape' ||
        event.defaultPrevented ||
        hasOpenHigherPriorityOverlay(event.currentTarget.ownerDocument)
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      closeDesktopCard({
        sourceCardVariant: card.variant,
        reason: 'collapse',
        focusDisposition: 'return-trigger',
        nowMs: event.timeStamp
      });
    },
    [closeDesktopCard, isMobileViewport]
  );

  const handleCardBlur = useCallback(
    (card: LandingCard, event: ReactFocusEvent<HTMLElement>) => {
      if (isMobileViewport || card.type !== 'test' || !isEnterableCard(card)) {
        return;
      }

      const ownerDocument = event.currentTarget.ownerDocument;
      if (event.relatedTarget === null && !ownerDocument.hasFocus()) {
        return;
      }

      if (!isCardFocusExit(event.currentTarget, event.relatedTarget)) {
        return;
      }

      closeDesktopCard({
        sourceCardVariant: card.variant,
        reason: 'collapse',
        focusDisposition: 'preserve-destination',
        nowMs: event.timeStamp
      });
    },
    [closeDesktopCard, isMobileViewport]
  );

  return {closeDesktopCard, focusCardFromKeyboard, handleCardKeyDown, handleCardBlur};
}
