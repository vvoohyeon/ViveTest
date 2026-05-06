import {describe, expect, it} from 'vitest';

import {
  freezeBaselineRows,
  initialLandingBaselineState,
  releaseBaselineRows
} from '../../src/features/landing/grid/baseline-manager';

describe('landing baseline manager', () => {
  it('assertion:B11-baseline-freeze freezes row snapshots for the active card', () => {
    const frozen = freezeBaselineRows({
      state: initialLandingBaselineState,
      activeCardVariant: 'qmbti',
      snapshots: [
        {
          rowId: 'row-0',
          top: 10,
          bottom: 210,
          height: 200
        }
      ]
    });

    expect(frozen.phase).toBe('BASELINE_FROZEN');
    expect(frozen.activeCardVariant).toBe('qmbti');
    expect([...frozen.snapshots.keys()]).toEqual(['row-0']);
    expect(frozen.snapshots.get('row-0')?.height).toBe(200);
  });

  it('releases frozen baselines back to ready', () => {
    freezeBaselineRows({
      state: initialLandingBaselineState,
      activeCardVariant: 'qmbti',
      snapshots: [
        {
          rowId: 'row-1',
          top: 20,
          bottom: 240,
          height: 220
        }
      ]
    });

    expect(releaseBaselineRows()).toEqual(initialLandingBaselineState);
  });
});
