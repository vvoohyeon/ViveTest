import {describe, expect, it} from 'vitest';

import {
  captureRestingFloor,
  clearRestingFloor,
  emptyRestingFloorMap,
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

describe('landing resting floor map', () => {
  it('assertion:BQ24-floor captures the active card resting outer height separately from row snapshots', () => {
    const captured = captureRestingFloor(emptyRestingFloorMap, 'qmbti', 312);

    expect(captured.get('qmbti')).toBe(312);
    expect([...captured.keys()]).toEqual(['qmbti']);
  });

  it('ignores non-finite or non-positive measurements and keeps the prior map reference', () => {
    const seeded = captureRestingFloor(emptyRestingFloorMap, 'qmbti', 312);

    expect(captureRestingFloor(seeded, 'qmbti', 0)).toBe(seeded);
    expect(captureRestingFloor(seeded, 'qmbti', Number.NaN)).toBe(seeded);
  });

  it('returns the same reference when the new measurement is within sub-pixel tolerance', () => {
    const seeded = captureRestingFloor(emptyRestingFloorMap, 'qmbti', 312);

    expect(captureRestingFloor(seeded, 'qmbti', 312.3)).toBe(seeded);
    expect(captureRestingFloor(seeded, 'qmbti', 320).get('qmbti')).toBe(320);
  });

  it('clears to the shared empty map so a stale floor is never reused', () => {
    expect(clearRestingFloor()).toBe(emptyRestingFloorMap);
    expect(clearRestingFloor().size).toBe(0);
  });
});
