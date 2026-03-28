import {describe, expect, it} from 'vitest';

import {asVariantId, validateVariant} from '../../src/features/test/domain';

describe('test domain variant validation', () => {
  const registeredVariants = [asVariantId('qmbti'), asVariantId('egtt'), asVariantId('archived-variant')];
  const availableVariants = [asVariantId('qmbti'), asVariantId('egtt')];

  it('returns MISSING when variant input is absent', () => {
    expect(validateVariant(undefined, registeredVariants, availableVariants)).toEqual({
      ok: false,
      reason: 'MISSING'
    });
    expect(validateVariant('   ', registeredVariants, availableVariants)).toEqual({
      ok: false,
      reason: 'MISSING'
    });
  });

  it('returns the canonical VariantId for a registered and available variant', () => {
    expect(validateVariant('qmbti', registeredVariants, availableVariants)).toEqual({
      ok: true,
      value: registeredVariants[0]
    });
  });

  it('returns UNKNOWN when the variant is not registered', () => {
    expect(validateVariant('unknown-variant', registeredVariants, availableVariants)).toEqual({
      ok: false,
      reason: 'UNKNOWN'
    });
  });

  it('returns UNAVAILABLE when the variant is registered but not available', () => {
    expect(validateVariant('archived-variant', registeredVariants, availableVariants)).toEqual({
      ok: false,
      reason: 'UNAVAILABLE'
    });
  });
});

