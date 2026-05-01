import type {VariantId} from '@/features/test/domain';

import {variantSessionKeys} from '@/features/landing/storage/storage-keys';
import {STATE_FLAG_NAMES, testVariantKey} from '@/features/test/storage/test-storage-keys';

export type VolatilityTrigger = 'result_entry_committed' | 'inactivity' | 'restart';

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function volatilizeRunData(variantId: VariantId, trigger: VolatilityTrigger): void {
  try {
    const localStorage = getLocalStorage();
    if (localStorage) {
      localStorage.removeItem(testVariantKey.activeRun(variantId));
      localStorage.removeItem(testVariantKey.responseSet(variantId));
      for (const flagName of STATE_FLAG_NAMES) {
        localStorage.removeItem(testVariantKey.flag(variantId, flagName));
      }
    }

    getSessionStorage()?.removeItem(variantSessionKeys.instructionSeen(variantId));
  } catch (error) {
    console.error('Failed to volatilize test run data', {trigger, error});
  }
}
