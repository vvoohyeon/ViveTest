'use client';

import {useEffect, useRef} from 'react';

// 규칙 3 — 시스템 뒤로가기는 오버레이 층 **전부**를 닫는다. 층이 열릴 때 history 항목 하나를
// 넣고, 다른 경로로 닫힐 때 그 항목을 거둔다; 뒤로가기 자체로 닫힌 경우에는 거두지 않는다.
// 시트만 뒤로가기에 답하고 드로어는 페이지를 떠나게 두면 같은 기기에서 같은 제스처가 두 뜻이
// 된다. 예외는 instruction 시트 하나이고 이유는 명세 §2-3 에 있다 — 그 시트는 `enabled=false`
// 로 이 훅을 끈다.

const STATE_KEY = '__viveOverlayLayer';

/**
 * 우리가 스스로 부른 `history.back()` 이 만들어 낸 `popstate` 의 수.
 *
 * **이 카운터가 없으면 층이 사라지는 것만으로 다른 층이 닫힌다.** `history.back()` 은 비동기라
 * 그 `popstate` 가 도착하기 전에 층이 다시 마운트될 수 있고(폰을 눕혔다 다시 세우면 시트가
 * 언마운트됐다 다시 마운트된다), 그때 뒤늦게 도착한 이벤트를 새 인스턴스가 「사용자가 뒤로
 * 갔다」로 읽어 방금 살아난 것을 닫는다. 모듈 전역인 것은 그 경주가 **인스턴스를 가로지르기**
 * 때문이다 — 되돌린 쪽과 이벤트를 받는 쪽이 서로 다른 인스턴스다.
 */
let programmaticPopCount = 0;

interface OverlayHistoryState {
  [STATE_KEY]?: string;
}

function currentLayerId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const state = window.history.state as OverlayHistoryState | null;
  return state?.[STATE_KEY] ?? null;
}

/** 검사 전용 — 모듈 전역 카운터를 테스트 사이에 되돌린다. */
export function resetOverlayHistoryEntryForTest(): void {
  programmaticPopCount = 0;
}

export function useOverlayHistoryEntry({
  layerId,
  open,
  enabled = true,
  onPopClose
}: {
  layerId: string;
  open: boolean;
  enabled?: boolean;
  onPopClose: () => void;
}): void {
  // 최신 콜백을 ref 로 들고 있어야 아래 effect 가 콜백 정체성 때문에 재실행되지 않는다 —
  // 재실행은 곧 항목을 한 번 더 넣는 것이고, 그러면 뒤로가기 두 번이 필요해진다. 쓰기는
  // 렌더가 아니라 effect 에서 한다.
  const onPopCloseRef = useRef(onPopClose);
  useEffect(() => {
    onPopCloseRef.current = onPopClose;
  }, [onPopClose]);

  useEffect(() => {
    if (!enabled || !open || typeof window === 'undefined') {
      return;
    }

    let closedByPop = false;
    const previousState = window.history.state as OverlayHistoryState | null;
    window.history.pushState({...previousState, [STATE_KEY]: layerId}, '');

    const handlePopState = () => {
      if (programmaticPopCount > 0) {
        // 우리가 되돌린 것이다 — 사용자의 뒤로가기가 아니므로 닫기로 읽지 않는다.
        programmaticPopCount -= 1;
        return;
      }
      if (currentLayerId() === layerId) {
        return;
      }
      closedByPop = true;
      onPopCloseRef.current();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (closedByPop) {
        // 뒤로가기가 이미 항목을 거뒀다 — 여기서 또 back() 하면 앞 페이지로 나간다.
        return;
      }
      if (currentLayerId() === layerId) {
        programmaticPopCount += 1;
        window.history.back();
      }
    };
  }, [enabled, layerId, open]);
}
