import type {VariantId, VariantValidationResult} from '@/features/test/domain/types';

function hasVariantInput(input: unknown): input is string {
  return typeof input === 'string' && input.trim().length > 0;
}

export function validateVariant(
  input: unknown,
  registeredVariants: VariantId[],
  availableVariants: VariantId[]
): VariantValidationResult {
  if (!hasVariantInput(input)) {
    return {ok: false, reason: 'MISSING'};
  }

  const candidate = input.trim();
  const registeredVariant = registeredVariants.find((variant) => variant === candidate);

  if (!registeredVariant) {
    return {ok: false, reason: 'UNKNOWN'};
  }

  if (!availableVariants.some((variant) => variant === registeredVariant)) {
    return {ok: false, reason: 'UNAVAILABLE'};
  }

  return {ok: true, value: registeredVariant};
}
