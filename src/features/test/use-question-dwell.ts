import {useCallback, useRef} from 'react';

import type {ResolvedQuestion} from '@/features/test/question-bank';

interface UseQuestionDwellResult {
  getCurrentDwellMs: () => number;
  settleDwell: (question: ResolvedQuestion | null) => number;
  resetDwellForQuestion: () => void;
  accumulatedDwellMs: () => number;
}

export function useQuestionDwell(): UseQuestionDwellResult {
  const dwellStartRef = useRef<number | null>(null);
  const dwellByQuestionRef = useRef<Record<string, number>>({});

  const getCurrentDwellMs = useCallback(
    () => (dwellStartRef.current !== null ? Math.max(0, Date.now() - dwellStartRef.current) : 0),
    []
  );

  const settleDwell = useCallback((question: ResolvedQuestion | null) => {
    if (!question || dwellStartRef.current === null) {
      return 0;
    }

    const delta = Math.max(0, Date.now() - dwellStartRef.current);
    dwellByQuestionRef.current[question.id] = (dwellByQuestionRef.current[question.id] ?? 0) + delta;
    dwellStartRef.current = Date.now();

    return delta;
  }, []);

  const resetDwellForQuestion = useCallback(() => {
    dwellStartRef.current = Date.now();
  }, []);

  const accumulatedDwellMs = useCallback(
    () => Object.values(dwellByQuestionRef.current).reduce((sum, value) => sum + value, 0),
    []
  );

  return {
    getCurrentDwellMs,
    settleDwell,
    resetDwellForQuestion,
    accumulatedDwellMs
  };
}
