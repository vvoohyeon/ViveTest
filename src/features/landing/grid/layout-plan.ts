export const MOBILE_MAX_VIEWPORT_WIDTH = 767;
export const TABLET_MAX_VIEWPORT_WIDTH = 1023;
export const CONTAINER_MAX_WIDTH = 1280;
export const MOBILE_SIDE_PADDING = 16;
export const NARROW_TABLET_SIDE_PADDING = 20;
export const TABLET_DESKTOP_SIDE_PADDING = 24;
export const NARROW_PADDING_MAX_VIEWPORT_WIDTH = 899;
export const DESKTOP_MEDIUM_MIN_GRID_INLINE_SIZE = 1040;
export const DESKTOP_WIDE_MIN_GRID_INLINE_SIZE = 1160;
export const DESKTOP_LOWER_ROW_SHELL_INLINE_SCALE = 1.0576923077;

export type LandingGridTier = 'mobile' | 'tablet' | 'desktop';
export type LandingGridColumnMode = 'desktop-wide' | 'desktop-medium' | 'two-column' | 'mobile';

export interface LandingGridInput {
  viewportTier: LandingGridTier;
  gridInlineSize: number;
  cardCount: number;
}

export interface LandingGridRowPlan {
  rowIndex: number;
  role: 'hero' | 'main';
  columns: number;
  startIndex: number;
  endIndex: number;
  cardCount: number;
  isUnderfilled: boolean;
  expandedShellInlineScale: number;
}

export interface LandingGridPlan {
  tier: LandingGridTier;
  columnMode: LandingGridColumnMode;
  gridInlineSize: number;
  row1Columns: number;
  rowNColumns: number;
  rows: LandingGridRowPlan[];
}

interface ResolvedColumns {
  columnMode: LandingGridColumnMode;
  row1Columns: number;
  rowNColumns: number;
}

function toNonNegativeInteger(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

export function resolveLandingViewportTier(viewportWidth: number): LandingGridTier {
  if (viewportWidth <= MOBILE_MAX_VIEWPORT_WIDTH) {
    return 'mobile';
  }

  if (viewportWidth <= TABLET_MAX_VIEWPORT_WIDTH) {
    return 'tablet';
  }

  return 'desktop';
}

export function resolveLandingGridColumns(input: {
  tier: LandingGridTier;
  gridInlineSize: number;
}): ResolvedColumns {
  const normalizedGridInlineSize = toNonNegativeInteger(input.gridInlineSize);

  if (input.tier === 'mobile') {
    return {
      columnMode: 'mobile',
      row1Columns: 1,
      rowNColumns: 1
    };
  }

  if (normalizedGridInlineSize >= DESKTOP_WIDE_MIN_GRID_INLINE_SIZE) {
    return {
      columnMode: 'desktop-wide',
      row1Columns: 3,
      rowNColumns: 4
    };
  }

  if (normalizedGridInlineSize >= DESKTOP_MEDIUM_MIN_GRID_INLINE_SIZE) {
    return {
      columnMode: 'desktop-medium',
      row1Columns: 2,
      rowNColumns: 3
    };
  }

  return {
    columnMode: 'two-column',
    row1Columns: 2,
    rowNColumns: 2
  };
}

export function resolveLandingRowExpandedShellInlineScale(input: {
  columnMode: LandingGridColumnMode;
  rowIndex: number;
}): number {
  if (input.rowIndex === 0) {
    return 1;
  }

  switch (input.columnMode) {
    case 'desktop-wide':
    case 'desktop-medium':
      return DESKTOP_LOWER_ROW_SHELL_INLINE_SCALE;
    case 'two-column':
    case 'mobile':
    default:
      return 1;
  }
}

export function buildLandingGridPlan(input: LandingGridInput): LandingGridPlan {
  const cardCount = toNonNegativeInteger(input.cardCount);
  const gridInlineSize = toNonNegativeInteger(input.gridInlineSize);
  const tier = input.viewportTier;
  const {columnMode, row1Columns, rowNColumns} = resolveLandingGridColumns({
    tier,
    gridInlineSize
  });

  const rows: LandingGridRowPlan[] = [];
  let cursor = 0;

  while (cursor < cardCount) {
    const rowIndex = rows.length;
    const targetColumns = rowIndex === 0 ? row1Columns : rowNColumns;
    const remainingCards = cardCount - cursor;
    const rowCardCount = Math.min(targetColumns, remainingCards);

    rows.push({
      rowIndex,
      role: rowIndex === 0 ? 'hero' : 'main',
      columns: targetColumns,
      startIndex: cursor,
      endIndex: cursor + rowCardCount,
      cardCount: rowCardCount,
      isUnderfilled: rowCardCount < targetColumns,
      expandedShellInlineScale: resolveLandingRowExpandedShellInlineScale({
        columnMode,
        rowIndex
      })
    });

    cursor += rowCardCount;
  }

  return {
    tier,
    columnMode,
    gridInlineSize,
    row1Columns,
    rowNColumns,
    rows
  };
}
