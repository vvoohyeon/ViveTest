import type {TestVariantId} from '@/features/test/types';

const TEST_STORAGE_PREFIX = 'vivetest-test:';
const INSTRUCTION_SEEN_KEY_SEGMENT = 'instruction-seen';

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

export function buildVariantScopedTestStorageKey(variant: TestVariantId, segment: string): string {
  return `${TEST_STORAGE_PREFIX}${variant}:${segment}`;
}

export function buildInstructionSeenStorageKey(variant: TestVariantId): string {
  return buildVariantScopedTestStorageKey(variant, INSTRUCTION_SEEN_KEY_SEGMENT);
}

export function markInstructionSeen(variant: TestVariantId): void {
  const storage = getSessionStorage();
  storage?.setItem(buildInstructionSeenStorageKey(variant), 'true');
}

export function hasSeenInstruction(variant: TestVariantId): boolean {
  const storage = getSessionStorage();
  return storage?.getItem(buildInstructionSeenStorageKey(variant)) === 'true';
}
