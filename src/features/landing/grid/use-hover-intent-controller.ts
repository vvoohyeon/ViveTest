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
import {useHoverScrollHold} from '@/features/landing/grid/use-hover-scroll-hold';

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
  cancelPendingHoverIntent: () => void;
  recordPointerInput: (event: PointerEvent | MouseEvent | WheelEvent) => void;
  isPointerInsideCardBoundary: (cardVariant: string) => boolean;
  resolveHoverHandlers: (card: LandingCard) => {
    onMouseEnter: ReactMouseEventHandler;
    onMouseLeave: ReactMouseEventHandler;
  };
}

type ReactMouseEventHandler = (event: ReactMouseEvent<HTMLElement>) => void;

/**
 * 「포인터가 움직이지 않았다」를 판정하는 허용 오차. `MouseEvent.clientX` 는 정수로 반올림돼
 * 오고 `PointerEvent.clientX` 는 소수를 갖기 때문에, 같은 위치라도 두 값은 1px 미만으로
 * 어긋난다(실측: 기록 `218.66` · 경계 이벤트 `218`). 그보다 큰 차이는 실제 이동이다.
 */
const POINTER_STATIONARY_TOLERANCE_PX = 1;

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
  /**
   * `pointermove` **에서만** 증가한다. `recordPointerInput` 은 window `pointermove` 와
   * `mousedown` 둘 다에 물려 있으므로(`use-landing-interaction-controller.ts`) 함수 진입에서
   * 세면 클릭이 「포인터가 움직였다」로 계산돼, 스크롤 hold 중에 들어온 클릭 한 번이 이동 없이
   * collapse 를 성립시킨다. 그래서 이벤트 종류를 보고 올린다.
   */
  const pointerMoveSeqRef = useRef(0);
  const collapseCard = useCallback(
    (cardVariant: string, nowMs: number) => {
      setDesktopTransitionReason('collapse');
      dispatch({
        type: 'CARD_COLLAPSE',
        nowMs: typeof window !== 'undefined' ? window.performance.now() : nowMs,
        interactionMode,
        cardVariant
      });
    },
    [dispatch, interactionMode, setDesktopTransitionReason]
  );

  const {scrollHeldCardVariant, beginScrollHold, releaseScrollHold} = useHoverScrollHold({
    shellRef,
    interactionMode,
    isMobileViewport,
    expandedCardVariant: state.expandedCardVariant,
    collapseCard
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
    releaseScrollHold();
  }, [clearHoverTimerOnly, releaseScrollHold]);

  const cancelPendingHoverIntent = useCallback(() => {
    clearHoverTimerOnly();
    hoverIntentTokenRef.current += 1;
    pointerWithinCardVariantRef.current = null;
    releaseScrollHold();
  }, [clearHoverTimerOnly, releaseScrollHold]);

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

  /**
   * 이 경계 이벤트를 **스크롤이 위조했는가.**
   *
   * 스크롤은 `mouseout` 만 위조하지 않는다 — 같은 프레임에 다른 카드의 `mouseover` 도
   * 위조하고, 그쪽은 `onMouseEnter` 가 유예 없이 즉시 collapse 하므로 유예 기반 hold 로는
   * 닿지 않는다. 실측(2026-09-10, chromium): 포인터가 `218,431` 에 고정된 채 `scrollY` 가
   * `0 → 372` 로 뛰자 `mouseout(qmbti → creativity-profile)` 과 그 짝 `mouseover` 가 **좌표
   * 변화 없이** 같은 시각에 났고, unavailable 카드의 진입이 확장 카드를 즉시 닫았다.
   *
   * 판별은 좌표로 한다. 실측한 순서가 `mouseout → mouseover → pointermove` 이므로 정상
   * 경로에서는 `onMouseEnter` 시점의 기록이 아직 **이전** 위치이고 이벤트가 실어 온 새 좌표와
   * 크게 어긋난다. 반대로 스크롤이 위조한 진입은 좌표가 그대로다. 기록이 없으면(첫 상호작용)
   * 판정하지 않는다 — 모르는 것을 위조로 읽지 않는다.
   */
  const isPointerStationaryBoundaryEvent = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    const location = pointerLocationRef.current;
    if (!location.valid) {
      return false;
    }

    return (
      Math.abs(event.clientX - location.x) <= POINTER_STATIONARY_TOLERANCE_PX &&
      Math.abs(event.clientY - location.y) <= POINTER_STATIONARY_TOLERANCE_PX
    );
  }, []);

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

  /**
   * collapse 예약. `onMouseLeave` 와 아래의 유실 복구가 **같은** 것을 쓴다.
   *
   * `scrollHoldEligible` 은 **`mouseout` 이 실어 온 이탈에만** 참이다. 스크롤이 위조할 수 있는
   * 신호가 그것뿐이기 때문이다 — `pointermove` 에서 시작한 예약은 그 자체로 「포인터가
   * 움직였다」는 답이므로 hold 대상이 아니며, 유실 leave 복구(`L15`)가 정확히 그 경우다.
   */
  const scheduleCollapseForCard = useCallback(
    (cardVariant: string, nowMs: number, options: {scrollHoldEligible: boolean} = {scrollHoldEligible: false}) => {
      const leavePointerMoveSeq = pointerMoveSeqRef.current;

      scheduleHoverIntent({
        cardVariant,
        delayMs: DESKTOP_COLLAPSE_DELAY_MS,
        action: 'collapse',
        run: () => {
          if (pointerWithinCardVariantRef.current !== null || isPointerInsideCardBoundary(cardVariant)) {
            return;
          }

          // 예약과 실행 사이에 `pointermove` 가 한 번도 없었다면 포인터는 움직이지 않았고,
          // 경계를 바꾼 것은 스크롤이다. 스크롤한다는 것은 「더 보겠다」이므로 닫지 않고
          // 붙들어 둔 뒤 다음 실제 포인터 이동에서 재판정한다. 정상 경로에서는 `pointermove`
          // 가 같은 프레임(<16ms) 안에 도착하고 유예는 `DESKTOP_COLLAPSE_DELAY_MS` 이므로,
          // 이 가드는 스크롤 경로에서만 발화한다.
          if (options.scrollHoldEligible && pointerMoveSeqRef.current === leavePointerMoveSeq) {
            beginScrollHold(cardVariant);
            return;
          }

          collapseCard(cardVariant, nowMs);
        }
      });
    },
    [beginScrollHold, collapseCard, isPointerInsideCardBoundary, scheduleHoverIntent]
  );

  /**
   * 포인터 위치와 「지금 어느 카드 안인가」를 기록한다. window `pointermove`/`mousedown` 에
   * 물려 있다(`use-landing-interaction-controller.ts`).
   *
   * **유실된 leave 를 여기서 되돌린다.** 카드를 떠나는 신호는 원래 카드 루트의 React
   * `onMouseLeave` 로만 들어오고, 그것은 브라우저의 `mouseout` 에 실린다. 포인터가 올라앉은
   * 노드가 그 사이 DOM 에서 제거되면 — 카드가 확장하며 접힌 상태의 썸네일을 unmount 하는 것이
   * 바로 그 경우다 — Chromium 은 그 노드로 `mouseout` 을 보낼 수 없고, 카드 루트까지 올라오는
   * 전파 경로가 통째로 사라진다. 그러면 collapse 가 **예약조차 되지 않아** 카드가 hover 에
   * 갇히고, 다른 카드를 건드릴 때까지 닫히지 않는다.
   *
   * 이 자리가 안전한 것은 이벤트 순서 때문이다. 실측 순서는
   * `pointerout → pointerover → mouseout → mouseover → pointermove` 이므로, 정상 경로에서는
   * `pointermove` 가 오기 전에 `onMouseLeave` 가 이미 실행돼 아래 `previousCardVariant` 가
   * `null` 이다. 즉 여기서 카드 이름이 남아 있는 경우는 leave 가 유실됐을 때뿐이며, 이중
   * 예약은 구조적으로 일어나지 않는다.
   */
  const recordPointerInput = useCallback(
    (event: PointerEvent | MouseEvent | WheelEvent) => {
      if (event.type === 'pointermove') {
        pointerMoveSeqRef.current += 1;
      }

      if ('clientX' in event && 'clientY' in event) {
        pointerLocationRef.current = {
          x: event.clientX,
          y: event.clientY,
          valid: true
        };
      }

      const previousCardVariant = pointerWithinCardVariantRef.current;
      const target = event.target instanceof HTMLElement ? getCardRootElement(event.target) : null;
      const nextCardVariant = target?.dataset.cardVariant ?? null;
      pointerWithinCardVariantRef.current = nextCardVariant;

      if (interactionMode !== 'hover' || isMobileViewport) {
        return;
      }

      // 스크롤 hold 재판정. 해제 조건 ⑴ — 경계 안이면 계속 열어 두고, 밖이면 평소의 유예로
      // collapse 를 예약한다. 카드 소유권이 이미 다른 카드로 넘어갔으면(handoff 등) 여기서는
      // 아무것도 하지 않는다: handoff 가 우선이며 두 경로가 각각 collapse 를 예약해 이중
      // 전이를 만들면 안 된다.
      const heldCardVariant = scrollHeldCardVariant();
      if (heldCardVariant !== null && event.type === 'pointermove') {
        releaseScrollHold();

        if (
          state.expandedCardVariant === heldCardVariant &&
          !state.hoverLock.keyboardMode &&
          nextCardVariant !== heldCardVariant &&
          !isPointerInsideCardBoundary(heldCardVariant)
        ) {
          scheduleCollapseForCard(heldCardVariant, event.timeStamp);
        }

        return;
      }

      if (previousCardVariant === null || previousCardVariant === nextCardVariant) {
        return;
      }

      if (state.expandedCardVariant !== previousCardVariant || state.hoverLock.keyboardMode) {
        return;
      }

      scheduleCollapseForCard(previousCardVariant, event.timeStamp);
    },
    [
      interactionMode,
      isMobileViewport,
      isPointerInsideCardBoundary,
      releaseScrollHold,
      scheduleCollapseForCard,
      scrollHeldCardVariant,
      state.expandedCardVariant,
      state.hoverLock.keyboardMode
    ]
  );

  const resolveHoverHandlers = useCallback(
    (card: LandingCard) => {
      const cardEnterable = isEnterableCard(card);

      return {
        onMouseEnter: (event: ReactMouseEvent<HTMLElement>) => {
          if (interactionMode !== 'hover' || isMobileViewport) {
            return;
          }

          // 스크롤이 위조한 진입은 hover 소유권을 바꾸지 않는다 — 유지 중인 카드를 닫지도,
          // 밀려 들어온 카드를 열지도 않는다. 포인터가 실제로 움직일 때 다시 판정한다.
          if (isPointerStationaryBoundaryEvent(event)) {
            return;
          }

          // 카드 진입은 hold 재판정보다 우선한다. 실측한 이벤트 순서상 `mouseover` 가
          // `pointermove` 보다 먼저 오므로, 여기서 먼저 지우면 handoff 가 정리한 카드를
          // 재판정이 다시 닫는 이중 전이가 생기지 않는다.
          releaseScrollHold();

          if (card.type === 'blog') {
            // Blog never expands, so hovering onto it is a plain collapse of any prior
            // test card — not a handoff. 'collapse' keeps the standard close motion
            // (req-landing §8.3 forbids the 0ms exit outside a real handoff source).
            pointerWithinCardVariantRef.current = null;
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

          if (card.type === 'blog') {
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

          scheduleCollapseForCard(card.variant, event.timeStamp, {scrollHoldEligible: true});
        }
      };
    },
    [
      clearHoverTimer,
      dispatch,
      interactionMode,
      isMobileViewport,
      isPointerStationaryBoundaryEvent,
      releaseScrollHold,
      scheduleCollapseForCard,
      scheduleHoverIntent,
      setDesktopTransitionReason,
      state.expandedCardVariant
    ]
  );

  return {
    clearHoverTimer,
    cancelPendingHoverIntent,
    recordPointerInput,
    isPointerInsideCardBoundary,
    resolveHoverHandlers
  };
}
