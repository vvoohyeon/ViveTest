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

/**
 * 우리가 넣은 history 항목 하나를 거두고, 그 사실을 **그 `popstate` 를 듣는 모든 리스너가**
 * 볼 수 있게 표시한다.
 *
 * 감소를 두 가지 방식으로 하면 안 된다는 것을 이 세션이 둘 다 밟았다.
 *
 * **층의 핸들러가 줄이면 샌다** — cleanup 은 자기 리스너를 떼고 나서 `back()` 을 부르므로 그
 * 이벤트를 받을 층이 하나도 없을 수 있고, 그러면 카운터가 0 으로 돌아오지 못해 **다음 진짜
 * 뒤로가기를 삼킨다.**
 *
 * **이 자리에서 즉시 줄여도 틀린다** — 층이 `back()` **뒤에** 다시 마운트되면 그 층의 핸들러가
 * 이 리스너보다 나중에 등록되고, 그때는 카운터가 이미 0 이라 사용자의 뒤로가기로 읽힌다.
 * 그래서 감소를 **다음 매크로태스크로 미룬다**: 등록 순서와 무관해진다.
 */
function popOwnHistoryEntry(): void {
  programmaticPopCount += 1;

  window.addEventListener(
    'popstate',
    () => {
      window.setTimeout(() => {
        programmaticPopCount = Math.max(0, programmaticPopCount - 1);
      }, 0);
    },
    {once: true}
  );

  // 부르기 직전에 우리 항목이 맨 위임을 확인했으므로 `popstate` 는 반드시 온다.
  window.history.back();
}

/**
 * 우리가 넣은 항목을 **되돌리지 않고** 버린다 — 층을 닫는 동시에 페이지를 떠날 때 쓴다.
 *
 * 그 둘은 동시에 일어나면 경주한다. 실측(2026-09-16): 설정 레이어에서 언어 칩을 누르면
 * `router.push('/ru')` 와 cleanup 의 `history.back()` 이 함께 날아가 주소가 `/ru` 에 잠깐 닿았다
 * 되돌아와 **`/en` 에 그대로 멈췄다** — 누르면 아무 일도 일어나지 않는 칩이 된다.
 *
 * 항목 자체는 남기고 **표시만 걷는다**: 그 항목의 주소는 층을 열기 전과 같으므로, 새 주소에서
 * 뒤로가기를 한 번 누르면 원래 자리로 돌아간다 — 층이 없었을 때와 같다.
 */
export function discardOverlayHistoryEntry(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const state = window.history.state as OverlayHistoryState | null;

  if (!state?.[STATE_KEY]) {
    return;
  }

  const {[STATE_KEY]: discardedLayerId, ...remaining} = state;
  void discardedLayerId;
  window.history.replaceState(remaining, '');
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
        // 카운터를 줄이는 것은 `popOwnHistoryEntry` 이지 여기가 아니다.
        return;
      }
      if (currentLayerId() === layerId) {
        return;
      }
      closedByPop = true;
      onPopCloseRef.current();
    };

    // **이동이 시작되면 항목을 버린다.** 층이 닫히는 것과 페이지를 떠나는 것이 한 동작에
    // 겹치면 cleanup 의 `history.back()` 이 방금 시작된 이동을 **취소한다**. 실측(2026-09-16):
    // 데스크톱 설정 레이어를 열어 둔 채 GNB 의 `History` 를 누르면 **8 회 중 8 회** 주소가
    // 그대로였다 — 바깥을 누른 것이 레이어를 닫고, 그 닫힘이 링크의 이동을 지운다.
    //
    // 그래서 링크 클릭을 capture 로 보고 그 자리에서 **표시만 걷는다**. 항목 자체는 남고, 이동은
    // 그 위에 쌓인다 — 새 주소에서 뒤로가기를 한 번 누르면 층을 열기 전과 같은 주소로 돌아간다.
    // 버튼으로 이동하는 경로(예: 언어 칩의 `router.push`)는 그 호출부가
    // `discardOverlayHistoryEntry()` 를 직접 부른다 — 클릭만으로는 이동인지 알 수 없기 때문이다.
    // **이동은 `click` 보다 먼저 정해진다.** 층을 닫는 바깥 규칙은 `pointerdown` 에서 돌고(그것이
    // 명세가 정한 바다), 그러면 cleanup 의 `history.back()` 이 그 뒤에 오는 링크 클릭보다 먼저
    // 날아간다. 그래서 `click` 을 듣는 것으로는 늦는다 — 실측로 확인했다(`click` capture 만 둘었을
    // 때 8 회 중 8 회 이동이 죽었다). 그래서 **링크 위의 `pointerdown`** 을 이동의 신호로 쓴다.
    //
    // 오판은 값싸다. 링크를 누르고 끌어 빠져 이동하지 않으면 같은 주소의 항목 하나가 남아 뒤로가기
    // 한 번이 헛돈다. 놀아두면 층이 열린 동안 **링크가 아예 듣지 않는다.**
    const handleNavigationStart = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Element) || event.button !== 0) {
        return;
      }

      if (target.closest('a[href]') !== null) {
        discardOverlayHistoryEntry();
      }
    };

    window.addEventListener('popstate', handlePopState);
    document.addEventListener('pointerdown', handleNavigationStart, true);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('pointerdown', handleNavigationStart, true);
      if (closedByPop) {
        // 뒤로가기가 이미 항목을 거뒀다 — 여기서 또 back() 하면 앞 페이지로 나간다.
        return;
      }
      if (currentLayerId() === layerId) {
        popOwnHistoryEntry();
      }
    };
  }, [enabled, layerId, open]);
}
