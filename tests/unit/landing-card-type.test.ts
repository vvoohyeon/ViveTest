import {describe, expect, it} from 'vitest';

import {
  isCatalogVisibleCard,
  isEnterableCard,
  isUnavailablePresentation
} from '../../src/features/landing/data';

describe('landing card type helpers', () => {
  it('treats available and opt_out cards as enterable', () => {
    expect(isEnterableCard({cardType: 'available'})).toBe(true);
    expect(isEnterableCard({cardType: 'opt_out'})).toBe(true);
    expect(isEnterableCard({cardType: 'unavailable'})).toBe(false);
  });

  it('keeps unavailable presentation isolated to unavailable cards', () => {
    expect(isUnavailablePresentation({cardType: 'unavailable', availability: 'unavailable'})).toBe(true);
    expect(isUnavailablePresentation({cardType: 'opt_out', availability: 'available'})).toBe(false);
  });

  it('applies the consent visibility matrix with debug/hide guards', () => {
    expect(isCatalogVisibleCard({cardType: 'available'}, 'UNKNOWN', 'end-user', 'non-production')).toBe(true);
    expect(isCatalogVisibleCard({cardType: 'available'}, 'OPTED_OUT', 'end-user', 'non-production')).toBe(false);
    expect(isCatalogVisibleCard({cardType: 'opt_out'}, 'OPTED_OUT', 'end-user', 'non-production')).toBe(true);
    expect(isCatalogVisibleCard({cardType: 'unavailable'}, 'OPTED_OUT', 'end-user', 'non-production')).toBe(true);
    expect(isCatalogVisibleCard({cardType: 'hide'}, 'OPTED_IN', 'qa', 'non-production')).toBe(false);
    expect(isCatalogVisibleCard({cardType: 'debug'}, 'OPTED_IN', 'end-user', 'non-production')).toBe(false);
    expect(isCatalogVisibleCard({cardType: 'debug'}, 'OPTED_IN', 'qa', 'non-production')).toBe(true);
    expect(isCatalogVisibleCard({cardType: 'debug'}, 'OPTED_IN', 'qa', 'production')).toBe(false);
  });
});
