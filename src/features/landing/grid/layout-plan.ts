/**
 * 제자리 오버레이가 뷰포트에서 비워 두는 세로 여백. GNB 데스크톱 띠 64px + 24px 이다
 * (설계 명세 규칙 3 — 「공간에는 높이도 들어간다」).
 *
 * **이 상한은 선택이 아니다.** 가로로 눕힌 폰(844×390)이 폭 축상 제자리 오버레이로 들어오는데,
 * 그 뷰포트에서 본문(제목 · 두 줄 질문 · 답변 둘 · 메타)은 가용 높이를 넘칠 수 있고 배경이
 * 잠겨 있어 스크롤로도 볼 수 없다. 넘치면 오버레이 **안에서** 스크롤한다.
 */
export const LANDING_OVERLAY_VIEWPORT_INSET_PX = 88;

export const MOBILE_MAX_VIEWPORT_WIDTH = 767;
export const TABLET_MAX_VIEWPORT_WIDTH = 1023;
export const CONTAINER_MAX_WIDTH = 1280;
export const MOBILE_SIDE_PADDING = 16;
export const NARROW_TABLET_SIDE_PADDING = 20;
export const TABLET_DESKTOP_SIDE_PADDING = 24;
export const NARROW_PADDING_MAX_VIEWPORT_WIDTH = 899;
export const DESKTOP_MEDIUM_MIN_GRID_INLINE_SIZE = 1040;
export const DESKTOP_WIDE_MIN_GRID_INLINE_SIZE = 1160;
export const DESKTOP_EXPANDED_DESIRED_FINAL_SCALE = 1.1;
export const TABLET_EXPANDED_DESIRED_FINAL_SCALE = 1.04;

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

export interface LandingExpandedScaleDecision {
  baseShellScale: number;
  desiredFinalScale: number;
  maxSurfaceScale: number;
  resolvedFinalScale: number;
  frameInlineScale: number;
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

export function resolveLandingExpandedScale(input: {
  viewportTier: LandingGridTier;
  reducedMotion: boolean;
  normalRootWidthPx: number;
  availableStageOutsetPx: number;
}): LandingExpandedScaleDecision {
  const roundScale = (value: number) => Math.round(value * 10_000_000_000) / 10_000_000_000;
  const rootWidth = Number.isFinite(input.normalRootWidthPx) ? Math.max(0, input.normalRootWidthPx) : 0;
  const stageOutset = Number.isFinite(input.availableStageOutsetPx)
    ? Math.max(0, input.availableStageOutsetPx)
    : 0;
  const baseShellScale = input.reducedMotion ? 1 : 1.04;
  const desiredFinalScale = input.reducedMotion
    ? 1
    : input.viewportTier === 'desktop'
      ? DESKTOP_EXPANDED_DESIRED_FINAL_SCALE
      : input.viewportTier === 'tablet'
        ? TABLET_EXPANDED_DESIRED_FINAL_SCALE
        : 1;
  const maxSurfaceScale = rootWidth > 0 ? 1 + stageOutset / rootWidth : 1;
  const resolvedFinalScale = Math.min(desiredFinalScale, maxSurfaceScale);

  return {
    baseShellScale,
    desiredFinalScale,
    maxSurfaceScale: roundScale(maxSurfaceScale),
    resolvedFinalScale: roundScale(resolvedFinalScale),
    frameInlineScale: roundScale(resolvedFinalScale / baseShellScale)
  };
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
      isUnderfilled: rowCardCount < targetColumns
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
