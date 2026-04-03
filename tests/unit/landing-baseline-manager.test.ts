import {describe, expect, it} from 'vitest';

import {
  freezeBaselineRows,
  initialLandingBaselineState,
  markBaselineRestorePending,
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
    expect(frozen.frozenRows).toEqual(['row-0']);
    expect(frozen.snapshots.get('row-0')?.height).toBe(200);
  });

  it('marks frozen baselines as restore-pending and releases them back to ready', () => {
    const frozen = freezeBaselineRows({
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
    const restorePending = markBaselineRestorePending(frozen);

    expect(restorePending.phase).toBe('BASELINE_RESTORE_PENDING');
    expect(releaseBaselineRows()).toEqual(initialLandingBaselineState);
  });
});
