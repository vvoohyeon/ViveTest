'use client';

import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useRef
} from 'react';


interface UseGnbTabRoutingInput {
  getOrderedKeyboardTargets: () => HTMLElement[];
  isLandingContext: boolean;
  settingsOpen: boolean;
  closeSettingsImmediate: () => void;
  focusFirstLandingCardTrigger: () => boolean;
  /**
   * 순회를 목록 안에서 닫는다 — 모달 층(GNB 드로어)이 열린 동안만 참이다.
   *
   * `aria-modal="true"` 는 **주장**이고 이것이 그 주장을 사실로 만든다. 실측(2026-09-16):
   * 트랩 없이 드로어를 연 채 Tab 을 22 회 누르면 17 번째부터 여섯 번이 드로어 뒤의 랜딩
   * 카드로 나갔다 — 보이지도 않는 곳으로 포커스가 사라진다.
   */
  trapFocus: boolean;
}

interface UseGnbTabRoutingOutput {
  handleGnbKeyDownCapture: (event: ReactKeyboardEvent<HTMLElement>) => void;
}

type GnbTabRoutableEvent = Pick<
  KeyboardEvent,
  'key' | 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey' | 'preventDefault'
>;

function shouldIgnoreKeyboardEvent(event: GnbTabRoutableEvent) {
  return event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey;
}

function routeKeyboardWithinGnb(event: GnbTabRoutableEvent, input: UseGnbTabRoutingInput) {
  if (shouldIgnoreKeyboardEvent(event)) {
    return;
  }

  const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const targets = input.getOrderedKeyboardTargets();
  if (targets.length === 0 || !activeElement) {
    return;
  }

  const currentIndex = targets.indexOf(activeElement);
  if (currentIndex === -1) {
    return;
  }

  const nextIndex = currentIndex + (event.shiftKey ? -1 : 1);

  if (input.trapFocus) {
    event.preventDefault();
    targets[(nextIndex + targets.length) % targets.length]?.focus();
    return;
  }

  if (nextIndex >= 0 && nextIndex < targets.length) {
    event.preventDefault();
    targets[nextIndex]?.focus();
    return;
  }

  if (!event.shiftKey && input.isLandingContext && input.focusFirstLandingCardTrigger()) {
    if (input.settingsOpen) {
      input.closeSettingsImmediate();
    }
    event.preventDefault();
  }
}

export function useGnbTabRouting(input: UseGnbTabRoutingInput): UseGnbTabRoutingOutput {
  const inputRef = useRef(input);

  useEffect(() => {
    inputRef.current = input;
  });

  // 문서 수준의 첫 `Tab` 가로채기는 **제거됐다.** 그 핸들러는 body 에서 `Tab` 이 눌리면
  // `preventDefault` 하고 GNB 의 첫 대상으로 포커스를 밀어 넣었다 — 탭 순서를 코드가 소유하던
  // 자리다. skip link 가 문서 순서상 첫 탭 스톱이 되면서 그 가로채기는 **틀린 동작**이 된다:
  // 사용자가 기대하는 첫 탭 스톱(본문 건너뛰기)을 빼앗기 때문이다. 이제 첫 `Tab` 은 브라우저가
  // 문서 순서대로 처리하고, GNB 내부 순회만 아래 capture 핸들러가 맡는다.


  const handleGnbKeyDownCapture = useCallback((event: ReactKeyboardEvent<HTMLElement>) => {
    routeKeyboardWithinGnb(event, inputRef.current);
  }, []);

  return {handleGnbKeyDownCapture};
}
