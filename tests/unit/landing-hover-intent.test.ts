import {describe, expect, it} from 'vitest';

import {
  DESKTOP_COLLAPSE_DELAY_MS,
  DESKTOP_EXPAND_DELAY_MS,
  isAvailableHandoffCandidate,
  nextHoverIntentToken,
  resolveDesktopTransformOriginX
} from '../../src/features/landing/grid/hover-intent';

describe('landing hover intent helpers', () => {
  it('keeps desktop hover timing constants deterministic', () => {
    expect(DESKTOP_EXPAND_DELAY_MS).toBe(160);
    expect(DESKTOP_COLLAPSE_DELAY_MS).toBe(140);
  });

  it('builds monotonic hover intent tokens', () => {
    expect(nextHoverIntentToken(4, 'test-rhythm-a', 'expand')).toEqual({
      token: 5,
      cardId: 'test-rhythm-a',
      action: 'expand'
    });
  });

  it('assertion:B13-handoff-available-only allows handoff only between different available cards', () => {
    expect(
      isAvailableHandoffCandidate({
        previousExpandedCardId: 'test-rhythm-a',
        nextCardId: 'test-rhythm-b',
        available: true
      })
    ).toBe(true);

    expect(
      isAvailableHandoffCandidate({
        previousExpandedCardId: 'test-rhythm-a',
        nextCardId: 'test-rhythm-a',
        available: true
      })
    ).toBe(false);

    expect(
      isAvailableHandoffCandidate({
        previousExpandedCardId: 'test-rhythm-a',
        nextCardId: 'test-coming-soon-1',
        available: false
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
