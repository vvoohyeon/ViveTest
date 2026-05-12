import type {VariantId} from '@/features/test/domain';
import {testVariantKey} from '@/features/test/storage/test-storage-keys';

export function writeResponseSet(
  variantId: string,
  responses: Record<string, 'A' | 'B'>
): void {
  localStorage.setItem(
    testVariantKey.responseSet(variantId as VariantId),
    JSON.stringify(responses)
  );
}
