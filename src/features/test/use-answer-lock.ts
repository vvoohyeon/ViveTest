'use client';

import {useCallback, useEffect, useRef, useState} from 'react';

interface UseAnswerLockParams {
  currentQuestionIndex: number;
}

interface UseAnswerLockResult {
  isAnswerLocked: boolean;
  lockAnswer: (onAdvance: () => void, delayMs?: number) => void;
  unlockAnswer: () => void;
  clearTimer: () => void;
}

export function useAnswerLock({currentQuestionIndex}: UseAnswerLockParams): UseAnswerLockResult {
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const [isAnswerLocked, setIsAnswerLocked] = useState(false);

  const clearTimer = useCallback(() => {
    if (autoAdvanceTimerRef.current !== null) {
      window.clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  }, []);

  const unlockAnswer = useCallback(() => {
    setIsAnswerLocked(false);
  }, []);

  const lockAnswer = useCallback(
    (onAdvance: () => void, delayMs = 150) => {
      setIsAnswerLocked(true);
      clearTimer();

      autoAdvanceTimerRef.current = window.setTimeout(() => {
        autoAdvanceTimerRef.current = null;
        setIsAnswerLocked(false);
        onAdvance();
      }, delayMs);
    },
    [clearTimer]
  );

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  useEffect(() => {
    clearTimer();
  }, [clearTimer, currentQuestionIndex]);

  return {isAnswerLocked, lockAnswer, unlockAnswer, clearTimer};
}
