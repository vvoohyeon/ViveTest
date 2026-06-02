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

// Wave 6 (BQ-24) expanded height floor. The resting floor is the active card's stretched
// (row-max) outer height in explicit pixels. It is tracked SEPARATELY from the row snapshots
// above so the floor lifecycle never entangles the freeze/release state model, and is
// re-measured fresh per expansion so a stale floor is never reused.
export type RestingFloorMap = ReadonlyMap<string, number>;

export const emptyRestingFloorMap: RestingFloorMap = new Map();

export function captureRestingFloor(
  map: RestingFloorMap,
  cardVariant: string,
  restingOuterPx: number
): RestingFloorMap {
  if (!Number.isFinite(restingOuterPx) || restingOuterPx <= 0) {
    return map;
  }

  const existing = map.get(cardVariant);
  if (existing !== undefined && Math.abs(existing - restingOuterPx) <= 0.5) {
    return map;
  }

  const next = new Map(map);
  next.set(cardVariant, restingOuterPx);
  return next;
}

export function clearRestingFloor(): RestingFloorMap {
  return emptyRestingFloorMap;
}
