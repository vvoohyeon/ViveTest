import type {VariantId} from '@/features/test/domain';

import {STATE_FLAG_NAMES, testVariantKey, type FlagName} from '@/features/test/storage/test-storage-keys';
import {readLocal, removeLocal, writeLocal} from '@/lib/safe-storage';

export function getFlag(variantId: VariantId, flagName: FlagName): boolean {
  return readLocal(testVariantKey.flag(variantId, flagName)) === 'true';
}

export function setFlag(variantId: VariantId, flagName: FlagName, value: boolean): void {
  const key = testVariantKey.flag(variantId, flagName);

  if (value) {
    writeLocal(key, 'true');
    return;
  }

  removeLocal(key);
}

export function clearAllFlags(variantId: VariantId): void {
  for (const flagName of STATE_FLAG_NAMES) {
    setFlag(variantId, flagName, false);
  }
}
