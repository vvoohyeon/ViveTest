import type {VariantId} from '@/features/test/domain';

// NOTE: instructionSeen is not managed by this key file. Its key is
// defined in src/features/landing/storage/storage-keys.ts
// (variantSessionKeys.instructionSeen) and its read/write helpers live
// in src/features/transition/store.ts. This cross-namespace split is a
// known ADR-B legacy exception. See Additional Finding A.4 in
// docs/reports/2026-05-17-refactoring-candidates.md.
export const STATE_FLAG_NAMES = [
  'derivation_in_progress',
  'derivation_computed',
  'min_loading_duration_elapsed',
  'result_entry_committed',
  'result_persisted'
] as const;

export type FlagName = (typeof STATE_FLAG_NAMES)[number];

export const testVariantKey = {
  flag: (variantId: VariantId, flagName: FlagName) => `test:${variantId}:flag:${flagName}` as const,
  activeRun: (variantId: VariantId) => `test:${variantId}:activeRun` as const,
  responseSet: (variantId: VariantId) => `test:${variantId}:responses` as const
} as const;
