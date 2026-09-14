import type {Dispatch} from 'react';
import {useEffect} from 'react';

import type {LandingInteractionEvent} from '@/features/landing/model/interaction-state';

interface UseKeyboardModeTrackerInput {
  dispatch: Dispatch<LandingInteractionEvent>;
}

export function useKeyboardModeTracker({dispatch}: UseKeyboardModeTrackerInput): void {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const passiveListenerOptions: AddEventListenerOptions = {passive: true};

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        // 키보드 모드 진입만 기록하고 **포커스는 옮기지 않는다.**
        //
        // 종전에는 여기서 문서 수준의 첫 `Tab` 을 가로채 첫 available 카드로 밀어 넣었다.
        // 그것이 GNB 쪽의 `tabIndex` 강등과 짝을 이뤄 「첫 `Tab` 이 GNB 를 건너뛴다」를
        // 만들던 두 기구 중 하나다. skip link 가 문서 순서상 첫 탭 스톱이 되면서 이 가로채기는
        // 사용자가 기대하는 첫 탭 스톱을 빼앗는 동작이 된다 — 탭 순서는 브라우저가 소유한다.
        dispatch({type: 'KEYBOARD_MODE_ENTER'});
        return;
      }
    };

    const handleGlobalMouseDown = () => {
      dispatch({type: 'KEYBOARD_MODE_EXIT'});
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    window.addEventListener('mousedown', handleGlobalMouseDown, passiveListenerOptions);

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
      window.removeEventListener('mousedown', handleGlobalMouseDown, passiveListenerOptions);
    };
  }, [dispatch]);
}
