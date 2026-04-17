import {describe, expect, it} from 'vitest';

import {
  buildLandingGridPlan,
  DESKTOP_LOWER_ROW_SHELL_INLINE_SCALE,
  DESKTOP_MEDIUM_MIN_GRID_INLINE_SIZE,
  DESKTOP_WIDE_MIN_GRID_INLINE_SIZE,
  MOBILE_MAX_VIEWPORT_WIDTH,
  resolveLandingGridColumns,
  resolveLandingRowExpandedShellInlineScale,
  resolveLandingViewportTier
} from '@/features/landing/grid/layout-plan';

describe('landing grid layout plan', () => {
  it('applies desktop wide row rules with underfilled final row', () => {
    const plan = buildLandingGridPlan({
      viewportTier: 'desktop',
      gridInlineSize: DESKTOP_WIDE_MIN_GRID_INLINE_SIZE,
      cardCount: 9
    });

    expect(plan.tier).toBe('desktop');
    expect(plan.columnMode).toBe('desktop-wide');
    expect(plan.row1Columns).toBe(3);
    expect(plan.rowNColumns).toBe(4);
    expect(plan.rows.map((row) => row.cardCount)).toEqual([3, 4, 2]);
    expect(plan.rows.at(-1)?.columns).toBe(4);
    expect(plan.rows.at(-1)?.isUnderfilled).toBe(true);
    expect(plan.rows[0]?.expandedShellInlineScale).toBe(1);
    expect(plan.rows[1]?.expandedShellInlineScale).toBe(DESKTOP_LOWER_ROW_SHELL_INLINE_SCALE);
  });

  it('applies desktop medium row rules', () => {
    const plan = buildLandingGridPlan({
      viewportTier: 'desktop',
      gridInlineSize: DESKTOP_MEDIUM_MIN_GRID_INLINE_SIZE,
      cardCount: 9
    });

    expect(plan.columnMode).toBe('desktop-medium');
    expect(plan.row1Columns).toBe(2);
    expect(plan.rowNColumns).toBe(3);
    expect(plan.rows.map((row) => row.cardCount)).toEqual([2, 3, 3, 1]);
    expect(plan.rows[0]?.expandedShellInlineScale).toBe(1);
    expect(plan.rows[1]?.expandedShellInlineScale).toBe(DESKTOP_LOWER_ROW_SHELL_INLINE_SCALE);
  });

  it('applies two-column row rules below the medium threshold on desktop', () => {
    const plan = buildLandingGridPlan({
      viewportTier: 'desktop',
      gridInlineSize: DESKTOP_MEDIUM_MIN_GRID_INLINE_SIZE - 1,
      cardCount: 5
    });

    expect(plan.columnMode).toBe('two-column');
    expect(plan.row1Columns).toBe(2);
    expect(plan.rowNColumns).toBe(2);
    expect(plan.rows.map((row) => row.cardCount)).toEqual([2, 2, 1]);
    expect(plan.rows.every((row) => row.expandedShellInlineScale === 1)).toBe(true);
  });

  it('resolves viewport tiers at mobile, tablet, and desktop boundaries', () => {
    expect(resolveLandingViewportTier(MOBILE_MAX_VIEWPORT_WIDTH)).toBe('mobile');
    expect(resolveLandingViewportTier(MOBILE_MAX_VIEWPORT_WIDTH + 1)).toBe('tablet');
    expect(resolveLandingViewportTier(1023)).toBe('tablet');
    expect(resolveLandingViewportTier(1024)).toBe('desktop');
  });

  it('switches from two-column to medium at the 1040 measured inline-size boundary', () => {
    const compactColumns = resolveLandingGridColumns({
      tier: 'desktop',
      gridInlineSize: DESKTOP_MEDIUM_MIN_GRID_INLINE_SIZE - 1
    });
    const mediumColumns = resolveLandingGridColumns({
      tier: 'desktop',
      gridInlineSize: DESKTOP_MEDIUM_MIN_GRID_INLINE_SIZE
    });

    expect(compactColumns.columnMode).toBe('two-column');
    expect(compactColumns.rowNColumns).toBe(2);
    expect(mediumColumns.columnMode).toBe('desktop-medium');
    expect(mediumColumns.rowNColumns).toBe(3);
  });

  it('switches from medium to wide at the 1160 measured inline-size boundary', () => {
    const mediumColumns = resolveLandingGridColumns({
      tier: 'desktop',
      gridInlineSize: DESKTOP_WIDE_MIN_GRID_INLINE_SIZE - 1
    });
    const wideColumns = resolveLandingGridColumns({
      tier: 'desktop',
      gridInlineSize: DESKTOP_WIDE_MIN_GRID_INLINE_SIZE
    });

    expect(mediumColumns.columnMode).toBe('desktop-medium');
    expect(mediumColumns.rowNColumns).toBe(3);
    expect(wideColumns.columnMode).toBe('desktop-wide');
    expect(wideColumns.rowNColumns).toBe(4);
  });

  it('does not promote tablet back to 3 columns at the same measured inline size', () => {
    const desktopColumns = resolveLandingGridColumns({
      tier: 'desktop',
      gridInlineSize: 975
    });
    const tabletColumns = resolveLandingGridColumns({
      tier: 'tablet',
      gridInlineSize: 975
    });

    expect(desktopColumns.columnMode).toBe('two-column');
    expect(desktopColumns.rowNColumns).toBe(2);
    expect(tabletColumns.columnMode).toBe('two-column');
    expect(tabletColumns.rowNColumns).toBe(2);
  });

  it('keeps tablet widths equivalent to 1023, 948, 900, and 899 in two-column mode', () => {
    const inlineSizes = [975, 900, 852, 859];

    for (const gridInlineSize of inlineSizes) {
      const plan = buildLandingGridPlan({
        viewportTier: 'tablet',
        gridInlineSize,
        cardCount: 8
      });

      expect(plan.columnMode).toBe('two-column');
      expect(plan.row1Columns).toBe(2);
      expect(plan.rowNColumns).toBe(2);
      expect(plan.rows[0]?.role).toBe('hero');
      expect(plan.rows[1]?.role).toBe('main');
    }
  });

  it('keeps hero/main row role based on row index only', () => {
    const plan = buildLandingGridPlan({
      viewportTier: 'tablet',
      gridInlineSize: 975,
      cardCount: 5
    });

    expect(plan.rows.map((row) => row.role)).toEqual(['hero', 'main', 'main']);
  });

  it('applies one-column mobile rows', () => {
    const plan = buildLandingGridPlan({
      viewportTier: 'mobile',
      gridInlineSize: 358,
      cardCount: 4
    });

    expect(plan.tier).toBe('mobile');
    expect(plan.columnMode).toBe('mobile');
    expect(plan.row1Columns).toBe(1);
    expect(plan.rowNColumns).toBe(1);
    expect(plan.rows.map((row) => row.cardCount)).toEqual([1, 1, 1, 1]);
    expect(plan.rows.every((row) => row.expandedShellInlineScale === 1)).toBe(true);
  });

  it('resolves lower-row shell inline scale from column mode and row index', () => {
    expect(resolveLandingRowExpandedShellInlineScale({columnMode: 'desktop-wide', rowIndex: 0})).toBe(1);
    expect(resolveLandingRowExpandedShellInlineScale({columnMode: 'desktop-wide', rowIndex: 1})).toBe(
      DESKTOP_LOWER_ROW_SHELL_INLINE_SCALE
    );
    expect(resolveLandingRowExpandedShellInlineScale({columnMode: 'desktop-medium', rowIndex: 2})).toBe(
      DESKTOP_LOWER_ROW_SHELL_INLINE_SCALE
    );
    expect(resolveLandingRowExpandedShellInlineScale({columnMode: 'two-column', rowIndex: 1})).toBe(1);
    expect(resolveLandingRowExpandedShellInlineScale({columnMode: 'mobile', rowIndex: 3})).toBe(1);
  });
});
