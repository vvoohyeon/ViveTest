import {describe, expect, it} from 'vitest';

import {
  DESKTOP_COLLAPSE_DELAY_MS,
  DESKTOP_EXPAND_DELAY_MS,
  isEnterableHandoffCandidate,
  nextHoverIntentToken,
  resolveDesktopTransformOriginX
} from '../../src/features/landing/grid/hover-intent';

describe('landing hover intent helpers', () => {
  it('keeps desktop hover timing constants deterministic', () => {
    expect(DESKTOP_EXPAND_DELAY_MS).toBe(160);
    expect(DESKTOP_COLLAPSE_DELAY_MS).toBe(140);
  });

  it('builds monotonic hover intent tokens', () => {
    expect(nextHoverIntentToken(4, 'qmbti', 'expand')).toEqual({
      token: 5,
      cardVariant: 'qmbti',
      action: 'expand'
    });
  });

  it('assertion:B13-handoff-enterable-only allows handoff only between different enterable cards', () => {
    expect(
      isEnterableHandoffCandidate({
        previousExpandedCardVariant: 'qmbti',
        nextCardVariant: 'rhythm-b',
        enterable: true
      })
    ).toBe(true);

    expect(
      isEnterableHandoffCandidate({
        previousExpandedCardVariant: 'qmbti',
        nextCardVariant: 'qmbti',
        enterable: true
      })
    ).toBe(false);

    expect(
      isEnterableHandoffCandidate({
        previousExpandedCardVariant: 'qmbti',
        nextCardVariant: 'creativity-profile',
        enterable: false
      })
    ).toBe(false);
  });

  it('uses deterministic row-edge transform origins', () => {
    expect(resolveDesktopTransformOriginX({cardOffset: 0, rowCardCount: 3})).toBe('0%');
    expect(resolveDesktopTransformOriginX({cardOffset: 1, rowCardCount: 3})).toBe('50%');
    expect(resolveDesktopTransformOriginX({cardOffset: 2, rowCardCount: 3})).toBe('100%');
    expect(resolveDesktopTransformOriginX({cardOffset: 0, rowCardCount: 1})).toBe('0%');
  });
});
