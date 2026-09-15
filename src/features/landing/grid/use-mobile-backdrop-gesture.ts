import type {Dispatch, PointerEvent as ReactPointerEvent} from 'react';
import {useCallback, useEffect, useRef, useState} from 'react';

import type {LandingCardMobilePhase} from '@/features/landing/grid/landing-grid-card';
import {CORE_MOTION_DURATION_MS} from '@/features/landing/grid/hover-intent';
import type {LandingMobileLifecycleEvent} from '@/features/landing/grid/mobile-lifecycle';

const MOBILE_OUTSIDE_SCROLL_THRESHOLD_PX = 10;

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

interface OutsideGesture {
  active: boolean;
  startX: number;
  startY: number;
  closeOnPointerUp: boolean;
}

export interface MobileBackdropBindings {
  active: boolean;
  /**
   * `CLOSING` 은 모바일 생명주기의 위상이고 입력을 계속 삼킨다(§8.5 「CLOSING 중 추가
   * open/close 입력은 무시한다」). `EXITING` 은 제자리 오버레이가 사라지는 동안의 **장식**
   * 이므로 입력을 통과시킨다 — 닫은 뒤 280ms 동안 화면이 굳어 있으면 그것이 고치려던 결함과
   * 같은 종류가 된다.
   */
  state: LandingCardMobilePhase | 'HIDDEN' | 'EXITING';
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
}

interface UseMobileBackdropGestureInput {
  isMobileViewport: boolean;
  phase: LandingCardMobilePhase;
  beginMobileClose: () => void;
  dispatchMobileLifecycle: Dispatch<LandingMobileLifecycleEvent>;
  /**
   * **닫는 법은 입력이 정한다**(명세 규칙 3). hover 가 없으면 포인터 이탈이라는 닫기 경로가
   * 존재하지 않으므로 backdrop 과 「빈 곳 탭」이 그 자리를 대신한다.
   *
   * 형태는 여기서 정하지 않는다 — 제자리 오버레이냐 시트냐는 폭이 정하고(명세 §2-11), 이
   * 훅은 어느 형태 위에도 같은 닫기 어포던스를 얹는다.
   */
  usesTouchCloseAffordance: boolean;
  /** 폭 축이 제자리 오버레이를 그리고 있는 동안의 확장 카드. 모바일 생명주기와 배타적이다. */
  desktopOverlayExpandedCardVariant: string | null;
  /** 제자리 오버레이의 닫기 — 모바일 생명주기의 `beginMobileClose` 와 짝이다. */
  collapseDesktopOverlay: () => void;
}

export function shouldCancelOutsideCloseAsScroll(
  input: OutsideGesture,
  event: ReactPointerEvent<HTMLDivElement>
): boolean {
  return (
    Math.abs(event.clientX - input.startX) > MOBILE_OUTSIDE_SCROLL_THRESHOLD_PX ||
    Math.abs(event.clientY - input.startY) > MOBILE_OUTSIDE_SCROLL_THRESHOLD_PX
  );
}

export function useMobileBackdropGesture({
  isMobileViewport,
  phase,
  beginMobileClose,
  dispatchMobileLifecycle,
  usesTouchCloseAffordance,
  desktopOverlayExpandedCardVariant,
  collapseDesktopOverlay
}: UseMobileBackdropGestureInput): MobileBackdropBindings {
  // 모바일 생명주기가 도는 동안(폭이 좁을 때)과, 제자리 오버레이가 hover 없는 기기에서 열려
  // 있는 동안 — 둘 다 backdrop 이 필요하다. 전자는 형태의 일부이고 후자는 **닫기 경로의
  // 대체재**다. 두 경우는 배타적이므로 한 backdrop 이 둘을 겸한다.
  const mobileLifecycleActive = isMobileViewport && phase !== 'NORMAL';
  const touchOverlayActive =
    usesTouchCloseAffordance && !isMobileViewport && desktopOverlayExpandedCardVariant !== null;
  // 제자리 오버레이에는 CLOSING 위상이 없다 — 확장 카드가 사라지는 순간 `expandedCardVariant`
  // 가 곧바로 `null` 이 된다. 그래서 소멸을 여기서 붙든다: 카드가 접히는 동안 어둠이 함께
  // 옅어지고, 그 뒤에 언마운트한다.
  //
  // **판정은 effect 가 아니라 렌더 중에 한다.** effect 로 하면 `touchOverlayActive` 가 거짓이
  // 된 커밋에서 backdrop 이 한 번 **언마운트**되고, effect 가 도는 다음 커밋에서 다시 마운트된다
  // — 그 재마운트가 등장 애니메이션을 처음부터 다시 걸어 소멸 구간의 불투명도가 오히려
  // **올라갔다**(실측 2026-09-16: 0.00 → 0.98 로 상승 후 사라짐). 렌더 중 상태 조정은 React 가
  // 커밋 전에 다시 렌더하므로 DOM 이 중간 상태를 보지 않는다.
  const [previousTouchOverlayActive, setPreviousTouchOverlayActive] = useState(touchOverlayActive);
  const [touchOverlayExiting, setTouchOverlayExiting] = useState(false);

  if (touchOverlayActive !== previousTouchOverlayActive) {
    setPreviousTouchOverlayActive(touchOverlayActive);
    // 열릴 때는 붙들 것이 없고, 닫힐 때만 소멸을 연다. 소멸 중에 다시 열리면 같은 원소가
    // 현재 불투명도에서 1 로 되돌아간다 — 재마운트가 없으므로 전이가 끊기지 않는다.
    setTouchOverlayExiting(!touchOverlayActive);
  }

  useEffect(() => {
    if (!touchOverlayExiting) {
      return undefined;
    }

    const exitTimer = window.setTimeout(() => setTouchOverlayExiting(false), BACKDROP_MOTION_DURATION_MS);

    return () => {
      window.clearTimeout(exitTimer);
    };
  }, [touchOverlayExiting]);

  const backdropActive = mobileLifecycleActive || touchOverlayActive || touchOverlayExiting;
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
    state: mobileLifecycleActive ? phase : touchOverlayActive ? 'OPEN' : touchOverlayExiting ? 'EXITING' : 'HIDDEN',
    onPointerDown: (event) => {
      if (!backdropActive || touchOverlayExiting) {
        return;
      }

      outsideGestureRef.current = {
        active: true,
        startX: event.clientX,
        startY: event.clientY,
        // 제자리 오버레이에는 OPENING/OPEN 위상이 따로 없다 — 열려 있으면 곧 닫을 수 있다.
        closeOnPointerUp: touchOverlayActive || phase === 'OPEN'
      };

      if (mobileLifecycleActive && phase === 'OPENING') {
        beginMobileClose();
      }
    },
    onPointerMove: (event) => {
      if (!outsideGestureRef.current.active) {
        return;
      }

      if (shouldCancelOutsideCloseAsScroll(outsideGestureRef.current, event)) {
        resetOutsideGesture();
        if (mobileLifecycleActive && phase === 'OPENING') {
          dispatchMobileLifecycle({type: 'QUEUE_CLOSE_CANCEL'});
        }
      }
    },
    onPointerUp: () => {
      const shouldClose = outsideGestureRef.current.active && outsideGestureRef.current.closeOnPointerUp;
      resetOutsideGesture();
      if (!shouldClose) {
        return;
      }

      if (touchOverlayActive) {
        collapseDesktopOverlay();
        return;
      }

      beginMobileClose();
    },
    onPointerCancel: resetOutsideGesture
  };
}
