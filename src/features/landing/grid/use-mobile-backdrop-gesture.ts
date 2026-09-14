import type {Dispatch, PointerEvent as ReactPointerEvent} from 'react';
import {useCallback, useRef} from 'react';

import type {LandingCardMobilePhase} from '@/features/landing/grid/landing-grid-card';
import type {LandingMobileLifecycleEvent} from '@/features/landing/grid/mobile-lifecycle';

const MOBILE_OUTSIDE_SCROLL_THRESHOLD_PX = 10;

interface OutsideGesture {
  active: boolean;
  startX: number;
  startY: number;
  closeOnPointerUp: boolean;
}

export interface MobileBackdropBindings {
  active: boolean;
  state: LandingCardMobilePhase | 'HIDDEN';
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
  const backdropActive = mobileLifecycleActive || touchOverlayActive;
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
    state: mobileLifecycleActive ? phase : touchOverlayActive ? 'OPEN' : 'HIDDEN',
    onPointerDown: (event) => {
      if (!backdropActive) {
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
