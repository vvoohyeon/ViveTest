import type {Dispatch, RefObject} from 'react';
import {useCallback} from 'react';

import type {LandingCardInteractionMode} from '@/features/landing/grid/landing-grid-card';
import {queueFocusCardByVariant} from '@/features/landing/grid/interaction-dom';
import type {LandingInteractionEvent} from '@/features/landing/model/interaction-state';

type LandingInteractionDispatch = Dispatch<LandingInteractionEvent>;

// 폰의 확장이 시트가 되면서 이 훅에 남는 것은 **의도를 상호작용 상태로 옮기는 일** 하나다.
// 시트가 자기 위상과 시간을 갖고, 스크롤 잠금은 프리미티브가 걸며, 스크림과 제스처도 거기 있다.
//
// 사라진 것들은 전부 in-flow 확장에만 있던 사정에서 나온 것이었다 — 스냅샷 채취(카드가 그
// 자리에서 커지므로 좌표를 적어 둬야 했다) · 복귀 폴링(닫은 뒤 그 좌표로 돌아왔는지 확인해야
// 했다) · transient 셸 둘(흐름 안에서는 모션 전용 표면을 따로 띄워야 했다) · 열림/닫힘 타이머
// (위상 전이를 손으로 셌다). 시트는 흐름 밖에 있어서 넷 중 어느 것도 필요로 하지 않는다.

interface UseMobileCardLifecycleInput {
  interactionMode: LandingCardInteractionMode;
  dispatchInteraction: LandingInteractionDispatch;
  shellRef: RefObject<HTMLElement | null>;
  clearHoverTimer: () => void;
}

interface UseMobileCardLifecycleOutput {
  beginMobileOpen: (cardVariant: string, syncInteraction?: boolean) => void;
  beginMobileClose: (cardVariant?: string | null) => void;
  beginMobileKeyboardHandoff: (sourceVariant: string, nextCardVariant: string | null, nowMs: number) => void;
}

function nowMs(): number {
  return typeof window !== 'undefined' ? window.performance.now() : 0;
}

export function useMobileCardLifecycle({
  interactionMode,
  dispatchInteraction,
  shellRef,
  clearHoverTimer
}: UseMobileCardLifecycleInput): UseMobileCardLifecycleOutput {
  const beginMobileOpen = useCallback(
    (cardVariant: string, syncInteraction = true) => {
      clearHoverTimer();
      if (!syncInteraction) {
        return;
      }

      dispatchInteraction({
        type: 'CARD_EXPAND',
        nowMs: nowMs(),
        interactionMode,
        cardVariant,
        available: true
      });
    },
    [clearHoverTimer, dispatchInteraction, interactionMode]
  );

  const beginMobileClose = useCallback(
    (cardVariant: string | null = null) => {
      dispatchInteraction({
        type: 'CARD_COLLAPSE',
        nowMs: nowMs(),
        interactionMode,
        cardVariant
      });
    },
    [dispatchInteraction, interactionMode]
  );

  const beginMobileKeyboardHandoff = useCallback(
    (sourceVariant: string, nextCardVariant: string | null, handoffNowMs: number) => {
      clearHoverTimer();
      dispatchInteraction({
        type: 'CARD_COLLAPSE',
        nowMs: handoffNowMs,
        interactionMode,
        cardVariant: sourceVariant
      });

      if (nextCardVariant) {
        queueFocusCardByVariant(shellRef.current, nextCardVariant);
      }
    },
    [clearHoverTimer, dispatchInteraction, interactionMode, shellRef]
  );

  return {
    beginMobileOpen,
    beginMobileClose,
    beginMobileKeyboardHandoff
  };
}
