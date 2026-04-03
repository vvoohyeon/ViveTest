export const LANDING_CARD_BASE_GAP_PX = 8;

const ROW_HEIGHT_EPSILON_PX = 0.5;
const SPACING_PRECISION_SCALE = 10000;

export interface RowNaturalMeasurement {
  cardVariant: string;
  naturalHeight: number;
}

export interface RowNaturalGeometryMeasurement {
  cardVariant: string;
  contentTop: number;
  tagsBottom: number;
  appliedCompGap: number;
}

export interface RowCompensationDecision {
  cardVariant: string;
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

function roundToPrecision(value: number): number {
  return Math.round(value * SPACING_PRECISION_SCALE) / SPACING_PRECISION_SCALE;
}

export function deriveNaturalHeightFromGeometry(measurement: RowNaturalGeometryMeasurement): RowNaturalMeasurement {
  const contentTop = normalizeCoordinate(measurement.contentTop);
  const tagsBottom = normalizeCoordinate(measurement.tagsBottom);
  const appliedCompGap = normalizeHeight(measurement.appliedCompGap);
  const filledHeight = tagsBottom - contentTop;
  const naturalHeight = Math.max(0, filledHeight - appliedCompGap);

  return {
    cardVariant: measurement.cardVariant,
    naturalHeight: roundToPrecision(naturalHeight)
  };
}

export function buildRowCompensationModel(
  rowMeasurements: ReadonlyArray<RowNaturalMeasurement>
): RowCompensationDecision[] {
  if (rowMeasurements.length === 0) {
    return [];
  }

  const normalized = rowMeasurements.map((measurement) => ({
    cardVariant: measurement.cardVariant,
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
      cardVariant: measurement.cardVariant,
      naturalHeight: roundToPrecision(measurement.naturalHeight),
      rowMaxNaturalHeight: roundToPrecision(rowMaxNaturalHeight),
      needsComp,
      compGap: needsComp ? roundToPrecision(delta) : 0
    };
  });
}
