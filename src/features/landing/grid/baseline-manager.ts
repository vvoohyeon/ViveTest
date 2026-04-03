export type BaselinePhase = 'BASELINE_READY' | 'BASELINE_FROZEN' | 'BASELINE_RESTORE_PENDING';

export interface BaselineSnapshot {
  rowId: string;
  top: number;
  bottom: number;
  height: number;
}

export interface LandingBaselineState {
  phase: BaselinePhase;
  activeCardVariant: string | null;
  frozenRows: readonly string[];
  snapshots: ReadonlyMap<string, BaselineSnapshot>;
}

export const initialLandingBaselineState: LandingBaselineState = {
  phase: 'BASELINE_READY',
  activeCardVariant: null,
  frozenRows: [],
  snapshots: new Map()
};

export function freezeBaselineRows(input: {
  state: LandingBaselineState;
  activeCardVariant: string;
  snapshots: readonly BaselineSnapshot[];
}): LandingBaselineState {
  const snapshotMap = new Map<string, BaselineSnapshot>();
  for (const snapshot of input.snapshots) {
    snapshotMap.set(snapshot.rowId, snapshot);
  }

  return {
    phase: 'BASELINE_FROZEN',
    activeCardVariant: input.activeCardVariant,
    frozenRows: input.snapshots.map((snapshot) => snapshot.rowId),
    snapshots: snapshotMap
  };
}

export function markBaselineRestorePending(state: LandingBaselineState): LandingBaselineState {
  if (state.phase !== 'BASELINE_FROZEN') {
    return state;
  }

  return {
    ...state,
    phase: 'BASELINE_RESTORE_PENDING'
  };
}

export function releaseBaselineRows(): LandingBaselineState {
  return initialLandingBaselineState;
}
