'use client';

import {useEffect, useState} from 'react';

/**
 * @future-move R-06
 * Keep this hook with the GNB behavior extraction group until the follow-up
 * ownership move is explicitly approved.
 */
export function useGnbKeyboardModeTracker(): {isKeyboardMode: boolean} {
  // TODO: wire after §7.5 compliance review — wheel listener must be removed first
  const [isKeyboardMode, setIsKeyboardMode] = useState(false);

  useEffect(() => {
    const passiveListenerOptions: AddEventListenerOptions = {passive: true};

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        setIsKeyboardMode(true);
      }
    };

    const handlePointerInput = () => {
      setIsKeyboardMode(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointermove', handlePointerInput, passiveListenerOptions);
    document.addEventListener('mousedown', handlePointerInput, passiveListenerOptions);
    document.addEventListener('wheel', handlePointerInput, passiveListenerOptions);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointermove', handlePointerInput, passiveListenerOptions);
      document.removeEventListener('mousedown', handlePointerInput, passiveListenerOptions);
      document.removeEventListener('wheel', handlePointerInput, passiveListenerOptions);
    };
  }, []);

  return {isKeyboardMode};
}
