import {useEffect, useRef} from 'react';

import type {TestInstructionAction} from '@/features/test/entry-policy';
import type {TestRunPhase} from '@/features/test/test-run-reducer';

interface UseAutoCommitInput {
  runtimeReady: boolean;
  redirecting: boolean;
  entryCommitted: boolean;
  runPhase: TestRunPhase;
  instructionSeen: boolean;
  canAutoCommitAfterInstructionSeen: boolean;
  qualifierItemsCount: number;
  executeInstructionAction: (action: TestInstructionAction) => void;
}

export function useAutoCommit({
  runtimeReady,
  redirecting,
  entryCommitted,
  runPhase,
  instructionSeen,
  canAutoCommitAfterInstructionSeen,
  qualifierItemsCount,
  executeInstructionAction
}: UseAutoCommitInput): void {
  const autoCommitScheduledRef = useRef(false);

  useEffect(() => {
    if (
      !runtimeReady ||
      redirecting ||
      entryCommitted ||
      runPhase !== 'instruction' ||
      !instructionSeen ||
      !canAutoCommitAfterInstructionSeen ||
      qualifierItemsCount > 0 ||
      autoCommitScheduledRef.current
    ) {
      return;
    }

    autoCommitScheduledRef.current = true;
    queueMicrotask(() => {
      executeInstructionAction('start');
    });
  }, [
    canAutoCommitAfterInstructionSeen,
    entryCommitted,
    executeInstructionAction,
    instructionSeen,
    qualifierItemsCount,
    redirecting,
    runPhase,
    runtimeReady
  ]);
}
