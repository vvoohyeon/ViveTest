export type BaselinePhase = 'BASELINE_READY' | 'BASELINE_FROZEN';

export interface BaselineSnapshot {
  rowId: string;
  top: number;
  bottom: number;
  height: number;
}

export interface LandingBaselineState {
  phase: BaselinePhase;
  activeCardVariant: string | null;
  snapshots: ReadonlyMap<string, BaselineSnapshot>;
}

export const initialLandingBaselineState: LandingBaselineState = {
  phase: 'BASELINE_READY',
  activeCardVariant: null,
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
    snapshots: snapshotMap
  };
}

export function releaseBaselineRows(): LandingBaselineState {
  return initialLandingBaselineState;
}
