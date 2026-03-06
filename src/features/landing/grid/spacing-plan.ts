export const LANDING_CARD_BASE_GAP_PX = 8;

const ROW_HEIGHT_EPSILON_PX = 0.5;

export interface RowNaturalMeasurement {
  cardId: string;
  naturalHeight: number;
}

export interface RowNaturalGeometryMeasurement {
  cardId: string;
  contentTop: number;
  tagsBottom: number;
  appliedCompGap: number;
}

export interface RowCompensationDecision {
  cardId: string;
  naturalHeight: number;
  rowMaxNaturalHeight: number;
  needsComp: boolean;
  compGap: number;
}

function normalizeHeight(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, value);
}

function normalizeCoordinate(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return value;
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

export function deriveNaturalHeightFromGeometry(measurement: RowNaturalGeometryMeasurement): RowNaturalMeasurement {
  const contentTop = normalizeCoordinate(measurement.contentTop);
  const tagsBottom = normalizeCoordinate(measurement.tagsBottom);
  const appliedCompGap = normalizeHeight(measurement.appliedCompGap);
  const filledHeight = tagsBottom - contentTop;
  const naturalHeight = Math.max(0, filledHeight - appliedCompGap);

  return {
    cardId: measurement.cardId,
    naturalHeight: roundToTwo(naturalHeight)
  };
}

export function buildRowCompensationModel(
  rowMeasurements: ReadonlyArray<RowNaturalMeasurement>
): RowCompensationDecision[] {
  if (rowMeasurements.length === 0) {
    return [];
  }

  const normalized = rowMeasurements.map((measurement) => ({
    cardId: measurement.cardId,
    naturalHeight: normalizeHeight(measurement.naturalHeight)
  }));

  const rowMaxNaturalHeight = normalized.reduce(
    (maxHeight, measurement) => Math.max(maxHeight, measurement.naturalHeight),
    0
  );

  return normalized.map((measurement) => {
    const delta = rowMaxNaturalHeight - measurement.naturalHeight;
    const needsComp = delta > ROW_HEIGHT_EPSILON_PX;
    return {
      cardId: measurement.cardId,
      naturalHeight: roundToTwo(measurement.naturalHeight),
      rowMaxNaturalHeight: roundToTwo(rowMaxNaturalHeight),
      needsComp,
      compGap: needsComp ? roundToTwo(delta) : 0
    };
  });
}
