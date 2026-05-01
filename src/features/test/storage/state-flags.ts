import type {VariantId} from '@/features/test/domain';

import {STATE_FLAG_NAMES, testVariantKey, type FlagName} from '@/features/test/storage/test-storage-keys';

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

export function getFlag(variantId: VariantId, flagName: FlagName): boolean {
  const storage = getLocalStorage();
  return storage?.getItem(testVariantKey.flag(variantId, flagName)) === 'true';
}

export function setFlag(variantId: VariantId, flagName: FlagName, value: boolean): void {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  const key = testVariantKey.flag(variantId, flagName);
  if (value) {
    storage.setItem(key, 'true');
    return;
  }

  storage.removeItem(key);
}

export function clearAllFlags(variantId: VariantId): void {
  for (const flagName of STATE_FLAG_NAMES) {
    setFlag(variantId, flagName, false);
  }
}
