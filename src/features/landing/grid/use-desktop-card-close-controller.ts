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
// 모바일에는 명시적 닫기·blur 경로가 없다 — 셋은 `isMobileViewport` 에서 즉시 돌아선다.
//
// **Escape 는 예외이며 그것이 의도다.** 키보드는 폭에도 입력 방식에도 속하지 않는 셋째 축이다
// — 외장 키보드를 붙인 터치 기기는 hover 가 없어도 키보드가 있고, 거기서 확장한 카드를 닫을
// 길이 있어야 한다(WCAG 2.1.1 Keyboard · 2.1.2 No Keyboard Trap). 그래서 `handleCardKeyDown`
// 만은 뷰포트로 돌아서지 않고 **생명주기로 갈라진다** — 모바일이면 `beginMobileClose`,
// 아니면 `closeDesktopCard`.

export interface DesktopCardCloseControllerInput {
  interactionMode: LandingCardInteractionMode;
  isMobileViewport: boolean;
  shellRef: RefObject<HTMLElement | null>;
  /** 모바일 생명주기의 닫기. Escape 가 전 표면 규칙이 되면서 이 컨트롤러가 소비한다. */
  beginMobileClose: () => void;
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
  beginMobileClose,
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

      // 뷰포트가 아니라 **생명주기**로 가른다. 어느 쪽이든 Escape 는 닫는다.
      if (isMobileViewport) {
        beginMobileClose();
        return;
      }

      closeDesktopCard({
        sourceCardVariant: card.variant,
        reason: 'collapse',
        focusDisposition: 'return-trigger',
        nowMs: event.timeStamp
      });
    },
    [beginMobileClose, closeDesktopCard, isMobileViewport]
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
