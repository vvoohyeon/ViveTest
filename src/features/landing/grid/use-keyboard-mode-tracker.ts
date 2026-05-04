import type {Dispatch, RefObject} from 'react';
import {useEffect} from 'react';

import {
  focusCardByVariant,
  isDocumentLevelFocusTarget
} from '@/features/landing/grid/interaction-dom';
import type {LandingInteractionEvent} from '@/features/landing/model/interaction-state';

interface UseKeyboardModeTrackerInput {
  dispatch: Dispatch<LandingInteractionEvent>;
  shellRef: RefObject<HTMLElement | null>;
  firstEnterableCardVariant: string | null;
}

export function useKeyboardModeTracker({
  dispatch,
  shellRef,
  firstEnterableCardVariant
}: UseKeyboardModeTrackerInput): void {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const passiveListenerOptions: AddEventListenerOptions = {passive: true};

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        dispatch({type: 'KEYBOARD_MODE_ENTER'});

        if (
          !event.shiftKey &&
          isDocumentLevelFocusTarget(event.target) &&
          focusCardByVariant(shellRef.current, firstEnterableCardVariant)
        ) {
          event.preventDefault();
        }

        return;
      }

      if (event.key === 'Escape') {
        dispatch({
          type: 'ESCAPE',
          nowMs: event.timeStamp
        });
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
  }, [dispatch, firstEnterableCardVariant, shellRef]);
}
