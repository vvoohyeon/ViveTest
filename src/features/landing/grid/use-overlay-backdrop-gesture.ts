import type {PointerEvent as ReactPointerEvent} from 'react';
import {useCallback, useEffect, useRef, useState} from 'react';

import {CORE_MOTION_DURATION_MS} from '@/features/landing/grid/hover-intent';

const OUTSIDE_SCROLL_THRESHOLD_PX = 10;

/**
 * backdrop 의 등장·소멸 지속. **카드의 모션과 같은 값이다** — 스크림과 카드는 한 전이의 두
 * 면이므로 따로 끝나면 둘로 읽힌다.
 *
 * 종전에는 등장이 `0ms`(마운트 즉시 `opacity: 1`)였고 소멸만 `180ms` 였다. 제자리 오버레이
 * 쪽은 더 나빴다 — `expandedCardVariant` 가 `null` 이 되는 즉시 언마운트돼, 카드가 아직
 * 280ms 를 접는 동안 **어둠만 먼저 사라졌다**(실측 2026-09-16, 900×1200 터치: 첫 변이에서
 * backdrop `gone`, 카드는 `closing` 으로 277ms 더 움직임).
 */
export const BACKDROP_MOTION_DURATION_MS = CORE_MOTION_DURATION_MS;

/**
 * **이 훅은 제자리 오버레이의 것이다.** 폰의 확장은 바텀시트로 바뀌었고(명세 규칙 3) 시트는
 * 자기 스크림·스와이프·잠금을 프리미티브에서 갖는다. 남은 소비자는 hover 가 없는 태블릿의
 * 제자리 오버레이 하나이며, 거기서 backdrop 은 형태가 아니라 **닫기 경로의 대체재**다 —
 * 포인터 이탈이 존재하지 않는 기기에서 「빈 곳 탭」이 그 자리를 대신한다(명세 §2-11).
 */
interface OutsideGesture {
  active: boolean;
  startX: number;
  startY: number;
  closeOnPointerUp: boolean;
}

export interface OverlayBackdropBindings {
  active: boolean;
  /**
   * `EXITING` 은 제자리 오버레이가 사라지는 동안의 **장식**이므로 입력을 통과시킨다 — 닫은 뒤
   * 280ms 동안 화면이 굳어 있으면 그것이 고치려던 결함과 같은 종류가 된다.
   */
  state: 'HIDDEN' | 'OPEN' | 'EXITING';
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
}

interface UseOverlayBackdropGestureInput {
  /**
   * **닫는 법은 입력이 정한다**(명세 규칙 3). hover 가 없으면 포인터 이탈이라는 닫기 경로가
   * 존재하지 않으므로 backdrop 과 「빈 곳 탭」이 그 자리를 대신한다.
   */
  usesTouchCloseAffordance: boolean;
  /** 폭 축이 제자리 오버레이를 그리고 있는가 — 폰(시트)에서는 거짓이다. */
  rendersInPlaceOverlay: boolean;
  expandedCardVariant: string | null;
  collapseOverlay: () => void;
}

export function shouldCancelOutsideCloseAsScroll(
  input: OutsideGesture,
  event: ReactPointerEvent<HTMLDivElement>
): boolean {
  return (
    Math.abs(event.clientX - input.startX) > OUTSIDE_SCROLL_THRESHOLD_PX ||
    Math.abs(event.clientY - input.startY) > OUTSIDE_SCROLL_THRESHOLD_PX
  );
}

export function useOverlayBackdropGesture({
  usesTouchCloseAffordance,
  rendersInPlaceOverlay,
  expandedCardVariant,
  collapseOverlay
}: UseOverlayBackdropGestureInput): OverlayBackdropBindings {
  const overlayActive = usesTouchCloseAffordance && rendersInPlaceOverlay && expandedCardVariant !== null;
  // 제자리 오버레이에는 CLOSING 위상이 없다 — 확장 카드가 사라지는 순간 `expandedCardVariant`
  // 가 곧바로 `null` 이 된다. 그래서 소멸을 여기서 붙든다: 카드가 접히는 동안 어둠이 함께
  // 옅어지고, 그 뒤에 언마운트한다.
  //
  // **판정은 effect 가 아니라 렌더 중에 한다.** effect 로 하면 `overlayActive` 가 거짓이 된
  // 커밋에서 backdrop 이 한 번 **언마운트**되고, effect 가 도는 다음 커밋에서 다시 마운트된다
  // — 그 재마운트가 등장 애니메이션을 처음부터 다시 걸어 소멸 구간의 불투명도가 오히려
  // **올라갔다**(실측 2026-09-16: 0.00 → 0.98 로 상승 후 사라짐). 렌더 중 상태 조정은 React 가
  // 커밋 전에 다시 렌더하므로 DOM 이 중간 상태를 보지 않는다.
  const [previousOverlayActive, setPreviousOverlayActive] = useState(overlayActive);
  const [overlayExiting, setOverlayExiting] = useState(false);

  if (overlayActive !== previousOverlayActive) {
    setPreviousOverlayActive(overlayActive);
    // 열릴 때는 붙들 것이 없고, 닫힐 때만 소멸을 연다. 소멸 중에 다시 열리면 같은 원소가
    // 현재 불투명도에서 1 로 되돌아간다 — 재마운트가 없으므로 전이가 끊기지 않는다.
    setOverlayExiting(!overlayActive);
  }

  useEffect(() => {
    if (!overlayExiting) {
      return undefined;
    }

    const exitTimer = window.setTimeout(() => setOverlayExiting(false), BACKDROP_MOTION_DURATION_MS);

    return () => {
      window.clearTimeout(exitTimer);
    };
  }, [overlayExiting]);

  const backdropActive = overlayActive || overlayExiting;
  const outsideGestureRef = useRef<OutsideGesture>({
    active: false,
    startX: 0,
    startY: 0,
    closeOnPointerUp: false
  });

  const resetOutsideGesture = useCallback(() => {
    outsideGestureRef.current.active = false;
    outsideGestureRef.current.closeOnPointerUp = false;
  }, []);

  return {
    active: backdropActive,
    state: overlayActive ? 'OPEN' : overlayExiting ? 'EXITING' : 'HIDDEN',
    onPointerDown: (event) => {
      if (!backdropActive || overlayExiting) {
        return;
      }

      outsideGestureRef.current = {
        active: true,
        startX: event.clientX,
        startY: event.clientY,
        closeOnPointerUp: true
      };
    },
    onPointerMove: (event) => {
      if (!outsideGestureRef.current.active) {
        return;
      }

      if (shouldCancelOutsideCloseAsScroll(outsideGestureRef.current, event)) {
        resetOutsideGesture();
      }
    },
    onPointerUp: () => {
      const shouldClose = outsideGestureRef.current.active && outsideGestureRef.current.closeOnPointerUp;
      resetOutsideGesture();
      if (shouldClose) {
        collapseOverlay();
      }
    },
    onPointerCancel: resetOutsideGesture
  };
}
