'use client';

import {useEffect} from 'react';

interface UseBeforeUnloadGuardParams {
  started: boolean;
  submitted: boolean;
}

/**
 * Registers a `beforeunload` prompt while a test attempt is in progress.
 * The native confirmation only fires when the attempt has started and has
 * not yet been submitted, so an accidental reload/close does not silently
 * discard answered questions.
 */
export function useBeforeUnloadGuard({started, submitted}: UseBeforeUnloadGuardParams): void {
  useEffect(() => {
    if (!started || submitted) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [started, submitted]);
}
