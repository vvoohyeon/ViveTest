import type {VariantId} from '@/features/test/domain';

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
