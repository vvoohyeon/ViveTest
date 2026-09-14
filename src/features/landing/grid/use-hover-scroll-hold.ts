import type {RefObject} from 'react';
import {useCallback, useEffect, useRef} from 'react';

import {resolveCardBoundaryElement} from '@/features/landing/grid/interaction-dom';
import type {LandingCardInteractionMode} from '@/features/landing/grid/landing-card-contract';

// BQ-39 R1 스크롤 hold 전체 — 「스크롤은 확장을 닫지 않는다」를 성립시키는 상태와 해제 조건 셋.
//
// 이 컷이 성립하는 근거는 경계가 이미 테스트로 그어져 있다는 것이다:
// `tests/unit/landing-interaction-controller-handlers.test.ts` 의 `describe('scroll hold (BQ-39 R1)')`
// 8 케이스가 정확히 이 파일의 표면만 흔든다. 개념 경계를 파일 경계로 승격시켰을 뿐이다.
//
// 남은 hover 로직(`resolveHoverHandlers` · `recordPointerInput`)은 여기로 오지 않는다 —
// 그쪽은 전부 `interactionMode !== 'hover'` 가드 뒤에 있고, 그 가드가 곧 옮겨질 선이다.

export interface HoverScrollHoldInput {
  shellRef: RefObject<HTMLElement | null>;
  interactionMode: LandingCardInteractionMode;
  expandedCardVariant: string | null;
  collapseCard: (cardVariant: string, nowMs: number) => void;
}

export interface HoverScrollHold {
  /** hold 중인 카드. ref 를 그대로 내보내지 않는 것은 읽기 외의 쓰임을 막기 위해서다. */
  scrollHeldCardVariant: () => string | null;
  beginScrollHold: (cardVariant: string) => void;
  releaseScrollHold: () => void;
}

export function useHoverScrollHold({
  shellRef,
  interactionMode,
  expandedCardVariant,
  collapseCard
}: HoverScrollHoldInput): HoverScrollHold {
  const scrollHeldCardVariantRef = useRef<string | null>(null);
  const detachScrollHoldListenerRef = useRef<(() => void) | null>(null);

  const releaseScrollHold = useCallback(() => {
    scrollHeldCardVariantRef.current = null;
    if (detachScrollHoldListenerRef.current) {
      detachScrollHoldListenerRef.current();
      detachScrollHoldListenerRef.current = null;
    }
  }, []);

  /**
   * hold 를 걸고, 그동안만 존재하는 passive `scroll` 리스너를 단다.
   *
   * 해제 조건 ⑵: 카드가 뷰포트를 **완전히** 벗어나면 hold 를 풀고 그 시점 판정으로 collapse
   * 한다. 「조금 스크롤해 읽는다」와 「지나쳐 버렸다」를 가시성으로 가르는 자리이며, 이것이
   * 없으면 확장 본문의 답변 버튼·CTA 가 화면 밖 탭 스톱으로 남고 grid plan freeze 도 풀리지
   * 않는다. 교차 판정은 `IntersectionObserver` 가 아니라 rect 로 한다 — 저장소에 런타임
   * 선례가 없고 jsdom 이 그것을 제공하지 않는 반면, rect 교차는 바로 위
   * `isPointerInsideCardBoundary` 가 이미 쓰는 방식이다.
   */
  const beginScrollHold = useCallback(
    (cardVariant: string) => {
      releaseScrollHold();
      scrollHeldCardVariantRef.current = cardVariant;

      const handleScroll = (event: Event) => {
        if (scrollHeldCardVariantRef.current !== cardVariant) {
          return;
        }

        const boundaryElement = resolveCardBoundaryElement(shellRef.current, cardVariant);
        if (!boundaryElement) {
          return;
        }

        const rect = boundaryElement.getBoundingClientRect();
        const intersectsViewport =
          rect.bottom > 0 &&
          rect.right > 0 &&
          rect.top < window.innerHeight &&
          rect.left < window.innerWidth;
        if (intersectsViewport) {
          return;
        }

        releaseScrollHold();
        collapseCard(cardVariant, event.timeStamp);
      };

      const scrollListenerOptions: AddEventListenerOptions = {passive: true};
      window.addEventListener('scroll', handleScroll, scrollListenerOptions);
      detachScrollHoldListenerRef.current = () => {
        window.removeEventListener('scroll', handleScroll, scrollListenerOptions);
      };
    },
    [collapseCard, releaseScrollHold, shellRef]
  );

  /**
   * 해제 조건 ⑶ — 카드가 다른 이유로 접히거나(Escape · handoff · 전환 시작) hover 모드를
   * 벗어나면 hold 가 남아 다음 `pointermove` 에서 엉뚱한 카드를 닫는 일이 없어야 한다.
   */
  useEffect(() => {
    const scrollHeldCardVariant = scrollHeldCardVariantRef.current;
    if (scrollHeldCardVariant === null) {
      return;
    }

    if (interactionMode !== 'hover' || expandedCardVariant !== scrollHeldCardVariant) {
      releaseScrollHold();
    }
  }, [interactionMode, releaseScrollHold, expandedCardVariant]);

  useEffect(() => releaseScrollHold, [releaseScrollHold]);

  const scrollHeldCardVariant = useCallback(() => scrollHeldCardVariantRef.current, []);

  return {scrollHeldCardVariant, beginScrollHold, releaseScrollHold};
}
