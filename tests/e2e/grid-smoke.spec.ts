import {expect, test, type Locator, type Page} from '@playwright/test';

import {locales} from '../../src/config/site';
import {
  DESKTOP_MEDIUM_MIN_GRID_INLINE_SIZE,
  DESKTOP_WIDE_MIN_GRID_INLINE_SIZE,
  MOBILE_MAX_VIEWPORT_WIDTH,
  NARROW_TABLET_SIDE_PADDING,
  type LandingGridColumnMode
} from '../../src/features/landing/grid/layout-plan';
import {resolveLandingCatalog} from '../../src/features/variant-registry';
import {seedTelemetryConsent} from './helpers/consent';
import {PRIMARY_AVAILABLE_TEST_VARIANT, PRIMARY_BLOG_VARIANT, PRIMARY_OPT_OUT_TEST_VARIANT} from './helpers/landing-fixture';

const W12_MOBILE_VIEWPORTS = [360, 390, MOBILE_MAX_VIEWPORT_WIDTH] as const;

const COLUMN_MODE_ORDER: Record<LandingGridColumnMode, number> = {
  'desktop-wide': 0,
  'desktop-medium': 1,
  'two-column': 2,
  mobile: 3
};

interface GridSweepSample {
  viewportWidth: number;
  clientWidth: number;
  gridInlineSize: number;
  columnMode: LandingGridColumnMode;
  hasScrollbar: boolean;
}

function createDescendingViewportSweep(center: number, radius: number): number[] {
  return Array.from({length: radius * 2 + 1}, (_, index) => center + radius - index);
}

function expectAllowedModes(samples: readonly GridSweepSample[], allowedModes: readonly LandingGridColumnMode[]) {
  const modeSet = new Set(samples.map((sample) => sample.columnMode));

  expect(modeSet.size).toBeGreaterThan(0);
  for (const mode of modeSet) {
    expect(allowedModes).toContain(mode);
  }
}

function expectBoundaryCoverage(
  samples: readonly GridSweepSample[],
  boundaryModes: readonly [LandingGridColumnMode, LandingGridColumnMode]
) {
  const modeSet = new Set(samples.map((sample) => sample.columnMode));

  expect(modeSet.has(boundaryModes[0])).toBe(true);
  expect(modeSet.has(boundaryModes[1])).toBe(true);
}

function expectOnlyMode(samples: readonly GridSweepSample[], mode: LandingGridColumnMode) {
  expect(new Set(samples.map((sample) => sample.columnMode))).toEqual(new Set([mode]));
}

function expectMonotonicGridSweep(samples: readonly GridSweepSample[]) {
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];

    expect(current.viewportWidth).toBeLessThan(previous.viewportWidth);
    expect(current.clientWidth).toBeLessThanOrEqual(previous.clientWidth);
    expect(COLUMN_MODE_ORDER[current.columnMode]).toBeGreaterThanOrEqual(COLUMN_MODE_ORDER[previous.columnMode]);
  }
}

async function sampleGridSweepState(
  page: Page,
  viewportWidth: number,
  viewportHeight: number
): Promise<GridSweepSample> {
  await page.setViewportSize({width: viewportWidth, height: viewportHeight});

  const shell = page.getByTestId('landing-grid-shell');
  await expect(shell).toHaveAttribute('data-grid-column-mode', /.+/);
  await expect(shell).toHaveAttribute('data-grid-inline-size', /\d+/);
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const shellElement = document.querySelector<HTMLElement>('[data-testid="landing-grid-shell"]');
        const containerElement = document.querySelector<HTMLElement>('[data-testid="landing-grid-container"]');
        const plannedInlineSize = Number.parseInt(shellElement?.dataset.gridInlineSize ?? '0', 10);
        const measuredInlineSize = Math.floor(containerElement?.clientWidth ?? 0);

        if (!shellElement || !containerElement || Number.isNaN(plannedInlineSize)) {
          return -1;
        }

        return plannedInlineSize - measuredInlineSize;
      })
    )
    .toBe(0);

  return page.evaluate(() => {
    const shellElement = document.querySelector<HTMLElement>('[data-testid="landing-grid-shell"]');
    const containerElement = document.querySelector<HTMLElement>('[data-testid="landing-grid-container"]');
    const rootElement = document.documentElement;
    const inlineSize = Number.parseInt(shellElement?.dataset.gridInlineSize ?? '0', 10);
    const columnMode = shellElement?.dataset.gridColumnMode;

    if (!shellElement || !containerElement || Number.isNaN(inlineSize) || !columnMode) {
      throw new Error('Expected landing grid shell debug attributes to be present');
    }

    return {
      viewportWidth: window.innerWidth,
      clientWidth: rootElement.clientWidth,
      gridInlineSize: inlineSize,
      columnMode: columnMode as LandingGridColumnMode,
      hasScrollbar: rootElement.scrollHeight > window.innerHeight
    };
  });
}

async function readDesktopExpandedOverlayMetrics(card: Locator) {
  return card.evaluate((element) => {
    const shell = element.querySelector<HTMLElement>('[data-slot="expandedShell"]');
    const surface = element.querySelector<HTMLElement>('[data-slot="expandedSurface"]');
    if (!shell || !surface) {
      throw new Error('Expected expanded shell and surface to be present for overlay metrics.');
    }

    const parseBackgroundAlpha = (value: string): number => {
      if (value === 'transparent') {
        return 0;
      }

      const rgbaMatch = value.match(/rgba?\((.*)\)/u);
      if (rgbaMatch) {
        const parts = rgbaMatch[1].split(',');
        if (parts.length === 4) {
          return Number.parseFloat(parts[3]);
        }

        return 1;
      }

      const slashMatch = value.match(/\/\s*([0-9.]+)\s*\)$/u);
      if (slashMatch) {
        return Number.parseFloat(slashMatch[1]);
      }

      return 1;
    };

    const rootRect = element.getBoundingClientRect();
    const surfaceRect = surface.getBoundingClientRect();
    const rootStyle = getComputedStyle(element);
    const shellStyle = getComputedStyle(shell);
    const surfaceStyle = getComputedStyle(surface);

    return {
      rootHeight: rootRect.height,
      rootBottom: rootRect.bottom,
      rootBackgroundAlpha: parseBackgroundAlpha(rootStyle.backgroundColor),
      shellMinHeight: shellStyle.minHeight,
      surfaceHeight: surfaceRect.height,
      surfaceBottom: surfaceRect.bottom,
      surfaceBackgroundAlpha: parseBackgroundAlpha(surfaceStyle.backgroundColor),
      surfaceMinHeight: surfaceStyle.minHeight
    };
  });
}

async function hoverDesktopExpandedCard(card: Locator) {
  await card.getByTestId('landing-grid-card-trigger').hover();
  await expect(card).toHaveAttribute('data-card-state', 'expanded');
  await expect(card).toHaveAttribute('data-desktop-motion-role', 'steady');
}

async function collapseDesktopExpandedCard(page: Page, card: Locator) {
  await page.mouse.move(1, 1);
  await expect(card).toHaveAttribute('data-card-state', 'normal');
}

async function readOpacity(locator: Locator): Promise<number> {
  return locator.evaluate((element) => Number.parseFloat(getComputedStyle(element).getPropertyValue('opacity')));
}

async function readBlogCardSkin(card: Locator) {
  return card.evaluate((element) => {
    const style = getComputedStyle(element);

    return {
      borderTopColor: style.borderTopColor,
      boxShadow: style.boxShadow,
      transitionDuration: style.transitionDuration,
      transitionProperty: style.transitionProperty
    };
  });
}

async function expectDesktopClosingSnapshot(card: Locator) {
  await expect
    .poll(() =>
      card.evaluate((element) => ({
        cardState: element.getAttribute('data-card-state'),
        motionRole: element.getAttribute('data-desktop-motion-role'),
        shellPhase: element.getAttribute('data-desktop-shell-phase'),
        thumbnailCount: element.querySelectorAll('[data-slot="cardThumbnail"]').length,
        expandedLayerCount: element.querySelectorAll('[data-slot="expandedLayer"]').length
      }))
    )
    .toEqual({
      cardState: 'expanded',
      motionRole: 'closing',
      shellPhase: 'closing',
      thumbnailCount: 0,
      expandedLayerCount: 1
    });
}

async function readExpandedWidthContract(card: Locator) {
  return card.evaluate((element) => {
    const stage = element.querySelector<HTMLElement>('[data-slot="desktopStage"]');
    const surface = element.querySelector<HTMLElement>('[data-slot="expandedSurface"]');
    const title = element.querySelector<HTMLElement>('[data-slot="cardTitleExpanded"]');
    const line1 = title?.querySelector<HTMLElement>('[data-title-layer="line1"]');
    const overflow = title?.querySelector<HTMLElement>('[data-title-layer="overflow"]');
    const detailBlock =
      element.querySelector<HTMLElement>('[data-slot="meta"]') ??
      element.querySelector<HTMLElement>('[data-slot="answerChoices"]');

    if (!stage || !surface || !title || !line1 || !overflow || !detailBlock) {
      throw new Error('Expected expanded width-contract nodes to be present.');
    }

    const rootRect = element.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    const surfaceRect = surface.getBoundingClientRect();
    const titleRect = title.getBoundingClientRect();
    const detailRect = detailBlock.getBoundingClientRect();

    return {
      originX: getComputedStyle(element).getPropertyValue('--landing-card-origin-x').trim(),
      shellScale: Number.parseFloat(getComputedStyle(element).getPropertyValue('--landing-card-shell-scale').trim()),
      shellInlineScale: Number.parseFloat(
        getComputedStyle(element).getPropertyValue('--landing-card-shell-inline-scale').trim()
      ),
      desiredScale: Number(element.getAttribute('data-expanded-desired-scale') ?? '0'),
      maxScale: Number(element.getAttribute('data-expanded-max-scale') ?? '0'),
      resolvedScale: Number(element.getAttribute('data-expanded-resolved-scale') ?? '0'),
      frameScale: Number(element.getAttribute('data-expanded-frame-scale') ?? '0'),
      rootWidth: rootRect.width,
      surfaceWidth: surfaceRect.width,
      stageLeft: stageRect.left,
      stageRight: stageRect.right,
      surfaceLeft: surfaceRect.left,
      surfaceRight: surfaceRect.right,
      expandLeft: rootRect.left - surfaceRect.left,
      expandRight: surfaceRect.right - rootRect.right,
      titleLeftInset: titleRect.left - surfaceRect.left,
      titleRightInset: surfaceRect.right - titleRect.right,
      detailLeftInset: detailRect.left - surfaceRect.left,
      detailRightInset: surfaceRect.right - detailRect.right,
      line1Text: line1.textContent ?? '',
      overflowText: overflow.textContent ?? '',
      titleText: title.textContent ?? ''
    };
  });
}

test.describe('Phase 4 grid smoke', () => {
  test.beforeEach(async ({page}) => {
    await seedTelemetryConsent(page, 'OPTED_IN');
  });

  test('@smoke assertion:B12-underfilled-last-row desktop wide row rules and underfilled final row contract', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const shell = page.getByTestId('landing-grid-shell');
    await expect(shell).toHaveAttribute('data-grid-tier', 'desktop');
    await expect(shell).toHaveAttribute('data-grid-column-mode', 'desktop-wide');
    await expect(shell).toHaveAttribute('data-row1-columns', '3');
    await expect(shell).toHaveAttribute('data-rown-columns', '4');

    const row0 = page.getByTestId('landing-grid-row-0');
    const row1 = page.getByTestId('landing-grid-row-1');
    const row2 = page.getByTestId('landing-grid-row-2');

    await expect(row0).toHaveAttribute('data-row-role', 'hero');
    await expect(row0).toHaveAttribute('data-columns', '3');
    await expect(row0).toHaveAttribute('data-card-count', '3');

    await expect(row1).toHaveAttribute('data-row-role', 'main');
    await expect(row1).toHaveAttribute('data-columns', '4');
    await expect(row1).toHaveAttribute('data-card-count', '4');

    await expect(row2).toHaveAttribute('data-columns', '4');
    await expect(row2).toHaveAttribute('data-card-count', '1');
    await expect(row2).toHaveAttribute('data-underfilled', 'true');

    const row0Cards = row0.getByTestId('landing-grid-card');
    const row1Cards = row1.getByTestId('landing-grid-card');
    const row2Cards = row2.getByTestId('landing-grid-card');

    await expect(row0Cards).toHaveCount(3);
    await expect(row1Cards).toHaveCount(4);
    await expect(row2Cards).toHaveCount(1);

    const visibleVariantOrder = await page.getByTestId('landing-grid-card').evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('data-card-variant') ?? '')
    );
    expect(visibleVariantOrder).toEqual([
      'qmbti',
      'rhythm-b',
      'energy-check',
      'creativity-profile',
      'egtt',
      'ops-handbook',
      'build-metrics',
      'release-gate'
    ]);

    await expect(row0Cards.nth(2)).toHaveAttribute('data-card-seq', '2');
    await expect(row1Cards.first()).toHaveAttribute('data-card-seq', '3');

    const row1FirstBox = await row1Cards.first().boundingBox();
    const row2FirstBox = await row2Cards.first().boundingBox();
    const row2Box = await row2.boundingBox();

    expect(row1FirstBox).not.toBeNull();
    expect(row2FirstBox).not.toBeNull();
    expect(row2Box).not.toBeNull();

    const widthDelta = Math.abs((row1FirstBox?.width ?? 0) - (row2FirstBox?.width ?? 0));
    expect(widthDelta).toBeLessThanOrEqual(1);

    const leftAlignmentDelta = Math.abs((row2FirstBox?.x ?? 0) - (row2Box?.x ?? 0));
    expect(leftAlignmentDelta).toBeLessThanOrEqual(1);
  });

  test('@smoke desktop medium uses row1=2 and row2+=3', async ({page}) => {
    await page.setViewportSize({width: 1180, height: 980});
    await page.goto('/en');

    const shell = page.getByTestId('landing-grid-shell');
    await expect(shell).toHaveAttribute('data-grid-tier', 'desktop');
    await expect(shell).toHaveAttribute('data-grid-column-mode', 'desktop-medium');
    await expect(shell).toHaveAttribute('data-row1-columns', '2');
    await expect(shell).toHaveAttribute('data-rown-columns', '3');

    await expect(page.getByTestId('landing-grid-row-0')).toHaveAttribute('data-card-count', '2');
    await expect(page.getByTestId('landing-grid-row-1')).toHaveAttribute('data-card-count', '3');
  });

  test('@smoke desktop narrow is reachable and keeps row1=2 row2+=2', async ({page}) => {
    await page.setViewportSize({width: 1024, height: 980});
    await page.goto('/en');

    const shell = page.getByTestId('landing-grid-shell');
    await expect(shell).toHaveAttribute('data-grid-tier', 'desktop');
    await expect(shell).toHaveAttribute('data-grid-column-mode', 'two-column');
    await expect(shell).toHaveAttribute('data-row1-columns', '2');
    await expect(shell).toHaveAttribute('data-rown-columns', '2');

    await expect(page.getByTestId('landing-grid-row-0')).toHaveAttribute('data-card-count', '2');
    await expect(page.getByTestId('landing-grid-row-1')).toHaveAttribute('data-card-count', '2');
  });

  test('@smoke tablet top range stays in two-column mode', async ({page}) => {
    await page.setViewportSize({width: 1023, height: 980});
    await page.goto('/en');

    const shell = page.getByTestId('landing-grid-shell');
    await expect(shell).toHaveAttribute('data-grid-tier', 'tablet');
    await expect(shell).toHaveAttribute('data-grid-column-mode', 'two-column');
    await expect(shell).toHaveAttribute('data-row1-columns', '2');
    await expect(shell).toHaveAttribute('data-rown-columns', '2');

    await expect(page.getByTestId('landing-grid-row-0')).toHaveAttribute('data-card-count', '2');
    await expect(page.getByTestId('landing-grid-row-1')).toHaveAttribute('data-card-count', '2');
  });

  test('@smoke tablet lower range also stays in two-column mode', async ({page}) => {
    await page.setViewportSize({width: 900, height: 980});
    await page.goto('/en');

    const shell = page.getByTestId('landing-grid-shell');
    await expect(shell).toHaveAttribute('data-grid-tier', 'tablet');
    await expect(shell).toHaveAttribute('data-grid-column-mode', 'two-column');
    await expect(shell).toHaveAttribute('data-row1-columns', '2');
    await expect(shell).toHaveAttribute('data-rown-columns', '2');

    await expect(page.getByTestId('landing-grid-row-0')).toHaveAttribute('data-card-count', '2');
    await expect(page.getByTestId('landing-grid-row-1')).toHaveAttribute('data-card-count', '2');
  });

  test('@smoke mobile keeps one-column rows', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/en');

    const shell = page.getByTestId('landing-grid-shell');
    await expect(shell).toHaveAttribute('data-grid-tier', 'mobile');
    await expect(shell).toHaveAttribute('data-grid-column-mode', 'mobile');
    await expect(shell).toHaveAttribute('data-row1-columns', '1');
    await expect(shell).toHaveAttribute('data-rown-columns', '1');

    await expect(page.getByTestId('landing-grid-row-0')).toHaveAttribute('data-columns', '1');
    await expect(page.getByTestId('landing-grid-row-1')).toHaveAttribute('data-columns', '1');
  });

  test('@smoke threshold sweeps stay monotonic and keep tablet region two-column', async ({page}) => {
    await page.goto('/en');

    const desktopWideBoundaryViewport = DESKTOP_WIDE_MIN_GRID_INLINE_SIZE + NARROW_TABLET_SIDE_PADDING * 2;
    const desktopMediumBoundaryViewport = DESKTOP_MEDIUM_MIN_GRID_INLINE_SIZE + NARROW_TABLET_SIDE_PADDING * 2;

    const wideSamples: GridSweepSample[] = [];
    for (const viewportWidth of createDescendingViewportSweep(desktopWideBoundaryViewport, 6)) {
      wideSamples.push(await sampleGridSweepState(page, viewportWidth, 980));
    }

    expectAllowedModes(wideSamples, ['desktop-wide', 'desktop-medium']);
    expectBoundaryCoverage(wideSamples, ['desktop-wide', 'desktop-medium']);
    expectMonotonicGridSweep(wideSamples);

    const mediumTwoColumnSamples: GridSweepSample[] = [];
    for (const viewportWidth of createDescendingViewportSweep(desktopMediumBoundaryViewport, 6)) {
      mediumTwoColumnSamples.push(await sampleGridSweepState(page, viewportWidth, 980));
    }

    expectAllowedModes(mediumTwoColumnSamples, ['desktop-medium', 'two-column']);
    expectBoundaryCoverage(mediumTwoColumnSamples, ['desktop-medium', 'two-column']);
    expectMonotonicGridSweep(mediumTwoColumnSamples);

    const tabletTopSamples: GridSweepSample[] = [];
    for (const viewportWidth of createDescendingViewportSweep(1023, 4)) {
      tabletTopSamples.push(await sampleGridSweepState(page, viewportWidth, 980));
    }

    expectOnlyMode(tabletTopSamples, 'two-column');
    expectMonotonicGridSweep(tabletTopSamples);

    const formerTabletBounceSamples: GridSweepSample[] = [];
    for (const viewportWidth of createDescendingViewportSweep(946, 5)) {
      formerTabletBounceSamples.push(await sampleGridSweepState(page, viewportWidth, 980));
    }

    expectOnlyMode(formerTabletBounceSamples, 'two-column');
    expectMonotonicGridSweep(formerTabletBounceSamples);

    const mobileSamples: GridSweepSample[] = [];
    for (const viewportWidth of createDescendingViewportSweep(MOBILE_MAX_VIEWPORT_WIDTH, 4)) {
      mobileSamples.push(await sampleGridSweepState(page, viewportWidth, 980));
    }

    expectAllowedModes(mobileSamples, ['two-column', 'mobile']);
    expectBoundaryCoverage(mobileSamples, ['two-column', 'mobile']);
    expectMonotonicGridSweep(mobileSamples);
  });

  test('@smoke content type label is removed and subtitle clamp is consistent across rows', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    await expect(page.locator('.landing-grid-card-kicker')).toHaveCount(0);

    const heroSubtitle = page.locator('[data-row-index="0"] .landing-grid-card-subtitle').first();
    const mainSubtitle = page.locator('[data-row-index="1"] .landing-grid-card-subtitle').first();

    const heroClamp = await heroSubtitle.evaluate((element) =>
      getComputedStyle(element).getPropertyValue('-webkit-line-clamp').trim()
    );
    const mainClamp = await mainSubtitle.evaluate((element) =>
      getComputedStyle(element).getPropertyValue('-webkit-line-clamp').trim()
    );

    expect(heroClamp).toBe('2');
    expect(mainClamp).toBe('2');
  });

  test('@smoke mobile full subtitle preserves tag-row geometry across all 12 locales', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});

    for (const locale of locales) {
      await page.goto(`/${locale}`);

      const card = page.locator('[data-card-variant="ops-handbook"]');
      await expect(card).toHaveAttribute('data-card-viewport-tier', 'mobile');
      await expect(card).toHaveAttribute('data-natural-height', /[1-9]\d*(?:\.\d+)?/);

      const metrics = await card.evaluate((element) => {
        const row = element.closest<HTMLElement>('[data-testid^="landing-grid-row-"]');
        const subtitle = element.querySelector<HTMLElement>('[data-slot="cardSubtitle"]');
        const tags = element.querySelector<HTMLElement>('[data-slot="tags"]');

        if (!row || !subtitle || !tags) {
          throw new Error('Expected Mobile row, subtitle, and tags anchors.');
        }

        const subtitleStyle = getComputedStyle(subtitle);
        const subtitleRect = subtitle.getBoundingClientRect();
        const tagsRect = tags.getBoundingClientRect();
        const lineHeight = Number.parseFloat(subtitleStyle.lineHeight);

        return {
          columnCount: Number(row.getAttribute('data-columns') ?? '0'),
          cardCount: Number(row.getAttribute('data-card-count') ?? '0'),
          lineClamp: subtitleStyle.getPropertyValue('-webkit-line-clamp').trim(),
          textOverflow: subtitleStyle.textOverflow,
          overflow: subtitleStyle.overflow,
          clientHeight: subtitle.clientHeight,
          scrollHeight: subtitle.scrollHeight,
          lineHeight,
          gap: tagsRect.top - subtitleRect.bottom,
          baseGap: Number(element.getAttribute('data-base-gap') ?? '0'),
          compGap: Number(element.getAttribute('data-comp-gap') ?? '0'),
          needsComp: element.getAttribute('data-needs-comp')
        };
      });

      expect(metrics.columnCount).toBe(1);
      expect(metrics.cardCount).toBe(1);
      expect(metrics.lineClamp).toBe('none');
      expect(metrics.textOverflow).toBe('clip');
      expect(metrics.overflow).toBe('visible');
      expect(metrics.clientHeight).toBeGreaterThan(metrics.lineHeight * 2);
      expect(Math.abs(metrics.scrollHeight - metrics.clientHeight)).toBeLessThanOrEqual(1);
      expect(metrics.gap).toBeGreaterThan(0);
      expect(metrics.baseGap).toBeGreaterThan(0);
      expect(Math.abs(metrics.gap - metrics.baseGap)).toBeLessThanOrEqual(1);
      expect(metrics.compGap).toBe(0);
      expect(metrics.needsComp).toBe('false');
    }
  });

  test('@smoke title clamp and expanded title continuity keep the first line stable on desktop and tablet with borderless tags', async ({
    page
  }) => {
    const scenarios = [
      {viewport: {width: 1440, height: 980}, columnMode: 'desktop-wide' as const},
      {viewport: {width: 1023, height: 980}, columnMode: 'two-column' as const}
    ];

    for (const scenario of scenarios) {
      await page.setViewportSize(scenario.viewport);
      await page.goto('/en');

      await expect(page.getByTestId('landing-grid-shell')).toHaveAttribute('data-grid-column-mode', scenario.columnMode);

      const card = page.locator('[data-card-variant="rhythm-b"]');
      const normalTitle = card.locator('.landing-grid-card-content > [data-slot="cardTitle"]');
      const normalClamp = await normalTitle.evaluate((element) =>
        getComputedStyle(element).getPropertyValue('-webkit-line-clamp').trim()
      );
      const normalFullText = (await normalTitle.textContent()) ?? '';
      const tagBorderWidth = await card
        .locator('.landing-grid-card-tag-chip')
        .first()
        .evaluate((element) => getComputedStyle(element).borderWidth);

      expect(normalClamp).toBe('1');
      expect(tagBorderWidth).toBe('0px');

      await hoverDesktopExpandedCard(card);

      const expandedTitle = await card.evaluate((element) => {
        const expandedTitleElement = element.querySelector<HTMLElement>('[data-slot="cardTitleExpanded"]');
        const line1 = expandedTitleElement?.querySelector<HTMLElement>('[data-title-layer="line1"]');
        const overflow = expandedTitleElement?.querySelector<HTMLElement>('[data-title-layer="overflow"]');

        if (!expandedTitleElement || !line1 || !overflow) {
          throw new Error('Expected expanded title continuity markers to be present.');
        }

        return {
          fullText: expandedTitleElement.textContent ?? '',
          line1Text: line1.textContent ?? '',
          overflowText: overflow.textContent ?? '',
          line1Height: line1.getBoundingClientRect().height,
          line1LineHeight: Number.parseFloat(getComputedStyle(line1).lineHeight)
        };
      });

      expect(expandedTitle.fullText).toBe(normalFullText);
      expect(`${expandedTitle.line1Text}${expandedTitle.overflowText}`).toBe(normalFullText);
      expect(expandedTitle.line1Text.length).toBeGreaterThan(0);
      expect(expandedTitle.overflowText.length).toBeGreaterThan(0);
      // Single-line guard: line1 must not wrap (a 2-line wrap would be ~2× lineHeight). The 2px
      // headroom absorbs sub-pixel glyph-box overshoot at the 20px/1.3 card title (design §5.1).
      expect(expandedTitle.line1Height).toBeLessThanOrEqual(expandedTitle.line1LineHeight + 2);

      await collapseDesktopExpandedCard(page, card);
    }
  });

  test('@smoke visual reconciliation R1 normal surface, type, shared tags, and unavailable casing use exact values', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const availableCard = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    const unavailableCard = page.locator('[data-card-variant="creativity-profile"]');
    const normalMetrics = await availableCard.evaluate((element) => {
      const title = element.querySelector<HTMLElement>('[data-slot="cardTitle"]');
      const subtitle = element.querySelector<HTMLElement>('[data-slot="cardSubtitle"]');
      const tag = element.querySelector<HTMLElement>('.landing-grid-card-tag-chip');

      if (!title || !subtitle || !tag) {
        throw new Error('Expected Normal title, subtitle, and tag.');
      }

      const rootStyle = getComputedStyle(element);
      const titleStyle = getComputedStyle(title);
      const subtitleStyle = getComputedStyle(subtitle);
      const tagStyle = getComputedStyle(tag);

      return {
        backgroundColor: rootStyle.backgroundColor,
        borderTopColor: rootStyle.borderTopColor,
        titleFontSize: titleStyle.fontSize,
        titleFontWeight: titleStyle.fontWeight,
        titleLetterSpacing: titleStyle.letterSpacing,
        titleLineHeight: titleStyle.lineHeight,
        subtitleColor: subtitleStyle.color,
        subtitleFontSize: subtitleStyle.fontSize,
        subtitleFontWeight: subtitleStyle.fontWeight,
        subtitleLineClamp: subtitleStyle.getPropertyValue('-webkit-line-clamp').trim(),
        subtitleLineHeight: subtitleStyle.lineHeight,
        tagBackgroundColor: tagStyle.backgroundColor,
        tagBorderWidth: tagStyle.borderWidth
      };
    });

    expect(normalMetrics).toEqual({
      backgroundColor: 'rgb(255, 255, 255)',
      borderTopColor: 'rgb(230, 226, 216)',
      titleFontSize: '20px',
      titleFontWeight: '600',
      titleLetterSpacing: '-0.2px',
      titleLineHeight: '26px',
      subtitleColor: 'rgb(74, 74, 85)',
      subtitleFontSize: '15px',
      subtitleFontWeight: '400',
      subtitleLineClamp: '2',
      subtitleLineHeight: '21.75px',
      tagBackgroundColor: 'rgb(236, 232, 223)',
      tagBorderWidth: '0px'
    });

    const unavailableTag = unavailableCard.locator('[data-slot="comingSoonTag"]');
    await expect(unavailableTag).toHaveText('coming soon');
    await expect(unavailableTag).toHaveCSS('background-color', 'rgb(230, 226, 216)');
    await expect(unavailableTag).toHaveCSS('border-width', '0px');
    await expect(unavailableCard).toHaveCSS('border-top-color', 'rgb(230, 226, 216)');
  });

  test('@smoke BQ-30 tag visuals stay borderless with available and unavailable fills', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const cases = [
      {
        card: page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`),
        expectedBackground: 'rgb(236, 232, 223)'
      },
      {
        card: page.locator('[data-card-variant="ops-handbook"]'),
        expectedBackground: 'rgb(236, 232, 223)'
      },
      {
        card: page.locator('[data-card-variant="creativity-profile"]'),
        expectedBackground: 'rgb(230, 226, 216)'
      }
    ];

    for (const {card, expectedBackground} of cases) {
      const tag = card.locator('.landing-grid-card-tag-chip').first();
      await expect(tag).toBeVisible();

      const metrics = await tag.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          backgroundColor: style.backgroundColor,
          borderWidth: style.borderWidth,
          borderRadius: style.borderRadius,
          paddingLeft: style.paddingLeft,
          paddingRight: style.paddingRight,
          whiteSpace: style.whiteSpace,
          textTransform: style.textTransform,
          childElementCount: element.childElementCount
        };
      });

      expect.soft(metrics.backgroundColor).toBe(expectedBackground);
      expect.soft(metrics.borderWidth).toBe('0px');
      expect.soft(metrics.borderRadius).toBe('5px');
      expect.soft(metrics.paddingLeft).toBe('9px');
      expect.soft(metrics.paddingRight).toBe('9px');
      expect.soft(metrics.whiteSpace).toBe('nowrap');
      expect.soft(metrics.textTransform).toBe('none');
      expect.soft(metrics.childElementCount).toBe(0);
    }
  });

  test('@smoke visual reconciliation R1 expanded sub-surfaces preserve context, choices, and duration-item emphasis', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const card = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    const normalTitleText = (await card.locator('[data-slot="cardTitle"]').textContent()) ?? '';
    await hoverDesktopExpandedCard(card);

    const expandedMetrics = await card.evaluate((element) => {
      const shadow = element.querySelector<HTMLElement>('[data-slot="expandedShadowPlate"]');
      const surface = element.querySelector<HTMLElement>('[data-slot="expandedSurface"]');
      const context = element.querySelector<HTMLElement>('[data-slot="cardTitleExpanded"]');
      const question = element.querySelector<HTMLElement>('[data-slot="previewQuestion"]');
      const choice = element.querySelector<HTMLElement>('[data-slot="answerChoiceA"]');
      const choiceText = choice?.querySelector<HTMLElement>('.landing-grid-card-answer-choice-text');
      const metaItems = Array.from(element.querySelectorAll<HTMLElement>('.landing-grid-card-meta-item'));

      if (!shadow || !surface || !context || !question || !choice || !choiceText || metaItems.length !== 3) {
        throw new Error('Expected all R1 expanded validation anchors.');
      }

      const shadowStyle = getComputedStyle(shadow);
      const surfaceStyle = getComputedStyle(surface);
      const contextStyle = getComputedStyle(context);
      const questionStyle = getComputedStyle(question);
      const choiceStyle = getComputedStyle(choice);
      const choiceTextStyle = getComputedStyle(choiceText);

      return {
        choice: {
          alignItems: choiceStyle.alignItems,
          lineClamp: choiceTextStyle.getPropertyValue('-webkit-line-clamp').trim(),
          overflowWrap: choiceTextStyle.overflowWrap,
          textOverflow: choiceTextStyle.textOverflow,
          whiteSpace: choiceTextStyle.whiteSpace
        },
        context: {
          color: contextStyle.color,
          fontSize: contextStyle.fontSize,
          fontWeight: contextStyle.fontWeight,
          lineHeight: contextStyle.lineHeight,
          text: context.textContent ?? ''
        },
        meta: metaItems.map((item) => {
          const style = getComputedStyle(item);
          return {
            color: style.color,
            fontWeight: style.fontWeight,
            tagName: item.tagName.toLowerCase(),
            text: item.textContent?.trim() ?? ''
          };
        }),
        question: {
          fontSize: questionStyle.fontSize,
          fontWeight: questionStyle.fontWeight,
          lineHeight: questionStyle.lineHeight
        },
        shadow: shadowStyle.boxShadow,
        surface: {
          backgroundColor: surfaceStyle.backgroundColor,
          boxShadow: surfaceStyle.boxShadow
        }
      };
    });

    expect(expandedMetrics.surface).toEqual({
      backgroundColor: 'rgb(255, 255, 255)',
      boxShadow: 'rgb(92, 142, 120) 0px 0px 0px 1px'
    });
    expect(expandedMetrics.shadow).toContain('rgba(26, 26, 31, 0.08) 0px 12px 32px 0px');
    expect(expandedMetrics.shadow).toContain('rgb(214, 209, 196) 0px 0px 0px 1px');
    expect(expandedMetrics.context).toEqual({
      color: 'rgb(117, 117, 128)',
      fontSize: '14px',
      fontWeight: '500',
      lineHeight: '19.6px',
      text: normalTitleText
    });
    expect(expandedMetrics.meta[0]?.tagName).toBe('strong');
    expect(expandedMetrics.meta[0]?.fontWeight).toBe('600');
    expect(expandedMetrics.meta[0]?.color).toBe('rgb(74, 74, 85)');
    expect(expandedMetrics.meta[1]?.tagName).toBe('span');
    expect(expandedMetrics.meta[1]?.fontWeight).toBe('500');
    expect(expandedMetrics.meta[1]?.color).toBe('rgb(117, 117, 128)');
    expect(expandedMetrics.meta[2]?.tagName).toBe('span');
    expect(expandedMetrics.meta[2]?.fontWeight).toBe('500');
    expect(expandedMetrics.meta[2]?.color).toBe('rgb(117, 117, 128)');
    expect(expandedMetrics.meta[2]?.text.toLowerCase()).toContain('completed');
    expect(expandedMetrics.question).toEqual({fontSize: '21px', fontWeight: '600', lineHeight: '27.3px'});
    expect(expandedMetrics.choice).toEqual({
      alignItems: 'flex-start',
      lineClamp: 'none',
      overflowWrap: 'anywhere',
      textOverflow: 'clip',
      whiteSpace: 'normal'
    });
  });

  test('@smoke visual reconciliation R1 mobile Normal and Expanded titles keep full text with muted expanded context type', async ({
    page
  }) => {
    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/en');

    const card = page.locator('[data-card-variant="rhythm-b"]');
    const normalTitle = card.locator('[data-slot="cardTitle"]');
    await expect(card).toHaveAttribute('data-interaction-mode', 'tap');
    await expect(card).toHaveAttribute('data-mobile-phase', 'NORMAL');
    await expect(normalTitle).toBeVisible();
    const fullText = (await normalTitle.textContent()) ?? '';
    const normalStyle = await normalTitle.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        lineClamp: style.getPropertyValue('-webkit-line-clamp').trim(),
        overflow: style.overflow,
        textOverflow: style.textOverflow,
        whiteSpace: style.whiteSpace
      };
    });

    expect(fullText.length).toBeGreaterThan(0);
    expect(normalStyle).toEqual({
      lineClamp: 'none',
      overflow: 'visible',
      textOverflow: 'clip',
      whiteSpace: 'normal'
    });

    await card.getByTestId('landing-grid-card-trigger').click();
    await expect(card).toHaveAttribute('data-mobile-phase', 'OPEN');

    const expandedTitle = card.locator('[data-slot="cardTitle"]');
    await expect(expandedTitle).toHaveText(fullText);
    const expandedStyle = await expandedTitle.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        color: style.color,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineClamp: style.getPropertyValue('-webkit-line-clamp').trim(),
        lineHeight: style.lineHeight,
        overflow: style.overflow,
        textOverflow: style.textOverflow,
        whiteSpace: style.whiteSpace
      };
    });

    expect(expandedStyle).toEqual({
      color: 'rgb(117, 117, 128)',
      fontSize: '14px',
      fontWeight: '500',
      lineClamp: 'none',
      lineHeight: '19.6px',
      overflow: 'visible',
      textOverflow: 'clip',
      whiteSpace: 'normal'
    });
  });

  test('@smoke blog hover keeps the card normal without rendering Expanded slots on desktop and tablet', async ({
    page
  }) => {
    const scenarios = [
      {viewport: {width: 1440, height: 980}, columnMode: 'desktop-wide' as const},
      {viewport: {width: 1023, height: 980}, columnMode: 'two-column' as const}
    ];

    for (const scenario of scenarios) {
      await page.setViewportSize(scenario.viewport);
      await page.goto('/en');

      await expect(page.getByTestId('landing-grid-shell')).toHaveAttribute('data-grid-column-mode', scenario.columnMode);

      const card = page.locator(`[data-card-variant="${PRIMARY_BLOG_VARIANT}"]`);
      await card.getByTestId('landing-grid-card-trigger').hover();

      await expect(card).toHaveAttribute('data-card-state', 'normal');
      await expect(card).toHaveAttribute('data-desktop-motion-role', 'idle');
      await expect(card.locator('[data-slot="expandedShell"]')).toHaveCount(0);
      await expect(card.locator('[data-slot="expandedBody"]')).toHaveCount(0);
      await expect(card.locator('[data-slot="cardSubtitleExpanded"]')).toHaveCount(0);
      await expect(card.locator('[data-slot="primaryCTA"]')).toHaveCount(0);
    }
  });

  test('@smoke blog Read more affordance reveals on desktop hover and focus without adding CTA slots', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const card = page.locator(`[data-card-variant="${PRIMARY_BLOG_VARIANT}"]`);
    const trigger = card.getByTestId('landing-grid-card-trigger');
    const readMore = card.locator('[data-slot="blogReadMore"]');

    await expect(card).toHaveAttribute('data-interaction-mode', 'hover');
    await expect(readMore).toHaveCount(1);
    await expect(readMore).toHaveAttribute('aria-hidden', 'true');
    await expect(readMore).not.toHaveAttribute('tabindex', /.+/);
    await expect(card.locator('[data-slot="primaryCTA"]')).toHaveCount(0);
    await expect(readMore.locator('[data-slot="blogReadMoreLabel"]')).toHaveText('Read more');
    await expect(readMore.locator('[data-slot="blogReadMoreArrow"]')).toHaveText('→');
    await expect(readMore.locator('a, button, [tabindex]')).toHaveCount(0);
    await expect(readMore).toHaveCSS('column-gap', '6px');

    await page.mouse.move(0, 0);
    await page.waitForTimeout(180);
    const restingSkin = await readBlogCardSkin(card);
    expect(restingSkin.borderTopColor).toBe('rgb(230, 226, 216)');
    expect(restingSkin.boxShadow).toContain('rgba(26, 26, 31, 0.04)');
    expect(restingSkin.transitionProperty).toBe('border-color, box-shadow');
    expect(restingSkin.transitionDuration).toBe('0.14s, 0.14s');
    expect(await readOpacity(readMore)).toBeLessThanOrEqual(0.05);
    await expect(readMore).toHaveCSS('visibility', 'hidden');

    await trigger.hover();
    await page.waitForTimeout(180);
    const hoverSkin = await readBlogCardSkin(card);
    expect(hoverSkin.borderTopColor).toBe('rgb(92, 142, 120)');
    expect(hoverSkin.boxShadow).toBe('rgba(92, 142, 120, 0.22) 0px 4px 14px 0px');
    expect(hoverSkin.boxShadow).not.toContain('0px 0px 0px 1px');
    expect(await readOpacity(readMore)).toBeGreaterThanOrEqual(0.95);
    await expect(readMore).toHaveCSS('visibility', 'visible');
    await expect(card).toHaveAttribute('data-card-state', 'normal');
    await expect(card.locator('[data-slot="expandedShell"]')).toHaveCount(0);

    await page.mouse.move(0, 0);
    await trigger.focus();
    await page.waitForTimeout(180);
    expect(await readOpacity(readMore)).toBeGreaterThanOrEqual(0.95);
    await expect(card.locator('[data-slot="expandedBody"]')).toHaveCount(0);
  });

  test('@smoke blog Read more affordance stays visible in mobile tap mode and whole card still navigates', async ({
    page
  }) => {
    await page.setViewportSize({width: MOBILE_MAX_VIEWPORT_WIDTH, height: 844});
    await page.goto('/en');

    const card = page.locator(`[data-card-variant="${PRIMARY_BLOG_VARIANT}"]`);
    const readMore = card.locator('[data-slot="blogReadMore"]');

    await expect(page.getByTestId('landing-grid-shell')).toHaveAttribute('data-grid-tier', 'mobile');
    await expect(card).toHaveAttribute('data-interaction-mode', 'tap');
    await expect(readMore).toHaveCount(1);
    expect(await readOpacity(readMore)).toBeGreaterThanOrEqual(0.95);

    await card.getByTestId('landing-grid-card-trigger').click();
    await expect(page).toHaveURL(`/en/blog/${PRIMARY_BLOG_VARIANT}`);
  });

  test('@smoke localized Blog Read more labels stay single-line on narrow mobile cards', async ({page}) => {
    const longestReadMoreLocales = ['id', 'ru', 'fr', 'de'] as const;

    await page.setViewportSize({width: MOBILE_MAX_VIEWPORT_WIDTH, height: 844});

    for (const locale of longestReadMoreLocales) {
      await page.goto(`/${locale}`);

      const card = page.locator(`[data-card-variant="${PRIMARY_BLOG_VARIANT}"]`);
      const readMore = card.locator('[data-slot="blogReadMore"]');
      await expect(card).toHaveAttribute('data-interaction-mode', 'tap');
      await expect(readMore).toHaveCount(1);
      await expect(readMore).toBeVisible();

      const metrics = await readMore.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const cardRect = element.closest('[data-card-variant]')?.getBoundingClientRect();
        const style = getComputedStyle(element);
        const fontSize = Number.parseFloat(style.fontSize);
        const lineHeight = style.lineHeight === 'normal' ? fontSize * 1.35 : Number.parseFloat(style.lineHeight);

        return {
          cardRight: cardRect?.right ?? 0,
          height: rect.height,
          lineHeight,
          right: rect.right,
          whiteSpace: style.whiteSpace
        };
      });

      expect(metrics.whiteSpace).toBe('nowrap');
      expect(metrics.height).toBeGreaterThan(0);
      expect(metrics.height).toBeLessThanOrEqual(metrics.lineHeight + 2);
      expect(metrics.right).toBeLessThanOrEqual(metrics.cardRight);
    }
  });

  test('@smoke assertion:W12-mobile computed Normal visuals stay scoped at 360 390 and 767', async ({
    page
  }) => {
    test.setTimeout(75_000);

    for (const viewportWidth of W12_MOBILE_VIEWPORTS) {
      await page.setViewportSize({width: viewportWidth, height: 844});
      await page.goto('/en');

      const shell = page.getByTestId('landing-grid-shell');
      const testCard = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
      const blogCard = page.locator(`[data-card-variant="${PRIMARY_BLOG_VARIANT}"]`);
      const unavailableCard = page.locator('[data-card-variant="creativity-profile"]');

      await expect(shell).toHaveAttribute('data-grid-tier', 'mobile');
      await expect(shell).toHaveAttribute('data-grid-column-mode', 'mobile');
      await expect(testCard).toHaveAttribute('data-card-viewport-tier', 'mobile');
      await expect(testCard).toHaveAttribute('data-base-gap', '8');
      await expect(testCard).toHaveAttribute('data-comp-gap', '0');

      const normalMetrics = await testCard.evaluate((element) => {
        const trigger = element.querySelector<HTMLElement>('[data-slot="primaryTrigger"]');
        const title = element.querySelector<HTMLElement>('[data-slot="cardTitle"]');
        const subtitle = element.querySelector<HTMLElement>('[data-slot="cardSubtitle"]');
        const tags = element.querySelector<HTMLElement>('[data-slot="tags"]');
        const tag = element.querySelector<HTMLElement>('.landing-grid-card-tag-chip');
        const container = document.querySelector<HTMLElement>('[data-testid="landing-grid-container"]');

        if (!trigger || !title || !subtitle || !tags || !tag || !container) {
          throw new Error('Expected W12 Normal visual anchors.');
        }

        const rootStyle = getComputedStyle(element);
        const triggerStyle = getComputedStyle(trigger);
        const titleStyle = getComputedStyle(title);
        const subtitleStyle = getComputedStyle(subtitle);
        const tagStyle = getComputedStyle(tag);
        const subtitleRect = subtitle.getBoundingClientRect();
        const tagsRect = tags.getBoundingClientRect();

        return {
          borderRadius: rootStyle.borderRadius,
          borderTopColor: rootStyle.borderTopColor,
          borderTopWidth: rootStyle.borderTopWidth,
          boxShadow: rootStyle.boxShadow,
          triggerPaddingTop: triggerStyle.paddingTop,
          triggerPaddingRight: triggerStyle.paddingRight,
          titleFontSize: titleStyle.fontSize,
          titleFontWeight: titleStyle.fontWeight,
          titleLineHeight: titleStyle.lineHeight,
          titleOverflowWrap: titleStyle.overflowWrap,
          titleTextOverflow: titleStyle.textOverflow,
          titleWebkitLineClamp: titleStyle.getPropertyValue('-webkit-line-clamp').trim(),
          titleWordBreak: titleStyle.wordBreak,
          subtitleFontSize: subtitleStyle.fontSize,
          subtitleFontWeight: subtitleStyle.fontWeight,
          subtitleLineHeight: subtitleStyle.lineHeight,
          subtitleOverflow: subtitleStyle.overflow,
          subtitleOverflowWrap: subtitleStyle.overflowWrap,
          subtitleTextOverflow: subtitleStyle.textOverflow,
          subtitleWebkitLineClamp: subtitleStyle.getPropertyValue('-webkit-line-clamp').trim(),
          subtitleWordBreak: subtitleStyle.wordBreak,
          baseGapAttr: element.getAttribute('data-base-gap'),
          baseGapVar: rootStyle.getPropertyValue('--landing-card-base-gap').trim(),
          actualGap: tagsRect.top - subtitleRect.bottom,
          tagBackgroundColor: tagStyle.backgroundColor,
          tagBorderRadius: tagStyle.borderRadius,
          tagBorderWidth: tagStyle.borderWidth,
          tagFontSize: tagStyle.fontSize,
          tagFontWeight: tagStyle.fontWeight,
          tagLineHeight: tagStyle.lineHeight,
          tagPaddingLeft: tagStyle.paddingLeft,
          tagPaddingRight: tagStyle.paddingRight,
          tagWhiteSpace: tagStyle.whiteSpace,
          containerOverflow: container.scrollWidth - container.clientWidth,
          documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
        };
      });

      expect(normalMetrics).toMatchObject({
        borderRadius: '16px',
        borderTopColor: 'rgb(230, 226, 216)',
        borderTopWidth: '1px',
        triggerPaddingTop: '16px',
        triggerPaddingRight: '16px',
        titleFontSize: '20px',
        titleFontWeight: '600',
        titleLineHeight: '26px',
        titleOverflowWrap: 'anywhere',
        titleTextOverflow: 'clip',
        titleWebkitLineClamp: 'none',
        titleWordBreak: 'keep-all',
        subtitleFontSize: '15px',
        subtitleFontWeight: '400',
        subtitleLineHeight: '21.75px',
        subtitleOverflow: 'visible',
        subtitleOverflowWrap: 'anywhere',
        subtitleTextOverflow: 'clip',
        subtitleWebkitLineClamp: 'none',
        subtitleWordBreak: 'keep-all',
        baseGapAttr: '8',
        baseGapVar: '8px',
        tagBackgroundColor: 'rgb(236, 232, 223)',
        tagBorderRadius: '5px',
        tagBorderWidth: '0px',
        tagFontSize: '13px',
        tagFontWeight: '500',
        tagLineHeight: '17.55px',
        tagPaddingLeft: '9px',
        tagPaddingRight: '9px',
        tagWhiteSpace: 'nowrap',
        containerOverflow: 0,
        documentOverflow: 0
      });
      expect(normalMetrics.boxShadow).not.toBe('none');
      expect(Math.abs(normalMetrics.actualGap - 8)).toBeLessThanOrEqual(1);

      const blogMetrics = await blogCard.locator('[data-slot="blogReadMore"]').evaluate((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const cardRect = element.closest('[data-card-variant]')?.getBoundingClientRect();

        return {
          ariaHidden: element.getAttribute('aria-hidden'),
          childControlCount: element.querySelectorAll('a, button, [tabindex]').length,
          color: style.color,
          columnGap: style.columnGap,
          height: rect.height,
          right: rect.right,
          cardRight: cardRect?.right ?? 0,
          textDecorationLine: style.textDecorationLine,
          whiteSpace: style.whiteSpace
        };
      });

      expect(blogMetrics).toMatchObject({
        ariaHidden: 'true',
        childControlCount: 0,
        color: 'rgb(107, 107, 118)',
        columnGap: '6px',
        textDecorationLine: 'none',
        whiteSpace: 'nowrap'
      });
      expect(blogMetrics.height).toBeGreaterThan(0);
      expect(blogMetrics.right).toBeLessThanOrEqual(blogMetrics.cardRight);

      const unavailableMetrics = await unavailableCard.evaluate((element) => {
        const trigger = element.querySelector<HTMLElement>('[data-slot="primaryTrigger"]');
        const thumbnail = element.querySelector<HTMLElement>('[data-slot="cardThumbnail"]');
        const title = element.querySelector<HTMLElement>('[data-slot="cardTitle"]');
        const subtitle = element.querySelector<HTMLElement>('[data-slot="cardSubtitle"]');
        const status = element.querySelector<HTMLElement>('[data-slot="comingSoonTag"]');

        if (!trigger || !thumbnail || !title || !subtitle || !status) {
          throw new Error('Expected W12 unavailable anchors.');
        }

        const rootStyle = getComputedStyle(element);
        const thumbnailStyle = getComputedStyle(thumbnail);
        const titleStyle = getComputedStyle(title);
        const subtitleStyle = getComputedStyle(subtitle);
        const statusStyle = getComputedStyle(status);

        return {
          triggerAriaDisabled: trigger.getAttribute('aria-disabled'),
          triggerTabIndex: trigger.getAttribute('tabindex'),
          rootBackgroundColor: rootStyle.backgroundColor,
          thumbnailOpacity: thumbnailStyle.opacity,
          titleOpacity: titleStyle.opacity,
          subtitleOpacity: subtitleStyle.opacity,
          statusBackgroundColor: statusStyle.backgroundColor,
          statusBorderWidth: statusStyle.borderWidth,
          statusText: status.textContent
        };
      });

      expect(unavailableMetrics).toEqual({
        triggerAriaDisabled: 'true',
        triggerTabIndex: '-1',
        rootBackgroundColor: 'rgb(244, 241, 234)',
        thumbnailOpacity: '0.72',
        titleOpacity: '1',
        subtitleOpacity: '1',
        statusBackgroundColor: 'rgb(230, 226, 216)',
        statusBorderWidth: '0px',
        statusText: 'coming soon'
      });
    }
  });

  test('@smoke assertion:W12-mobile all locales keep full mobile text and contained rows', async ({
    page
  }) => {
    test.setTimeout(120_000);

    for (const viewportWidth of W12_MOBILE_VIEWPORTS) {
      await page.setViewportSize({width: viewportWidth, height: 844});

      for (const locale of locales) {
        const catalog = resolveLandingCatalog(locale);
        const titleStressCard = catalog.find((card) => card.variant === 'rhythm-b');
        const blogCard = catalog.find((card) => card.variant === PRIMARY_BLOG_VARIANT);
        const unavailableCard = catalog.find((card) => card.variant === 'creativity-profile');

        if (!titleStressCard || !blogCard || !unavailableCard) {
          throw new Error(`Expected W12 catalog fixtures for ${locale}`);
        }

        await page.goto(`/${locale}`);
        await expect(page.getByTestId('landing-grid-shell')).toHaveAttribute('data-grid-tier', 'mobile');

        for (const card of [titleStressCard, blogCard, unavailableCard]) {
          const root = page.locator(`[data-card-variant="${card.variant}"]`);
          const title = root.locator('[data-slot="cardTitle"]');
          const subtitle = root.locator('[data-slot="cardSubtitle"]');
          await expect(root).toHaveAttribute('data-card-viewport-tier', 'mobile');
          await expect(title).toHaveText(card.title);
          await expect(subtitle).toHaveText(card.subtitle);

          const textMetrics = await root.evaluate((element) => {
            const titleElement = element.querySelector<HTMLElement>('[data-slot="cardTitle"]');
            const subtitleElement = element.querySelector<HTMLElement>('[data-slot="cardSubtitle"]');
            const tagsElement = element.querySelector<HTMLElement>('[data-slot="tags"]');
            if (!titleElement || !subtitleElement || !tagsElement) {
              throw new Error('Expected W12 mobile text anchors.');
            }
            const titleStyle = getComputedStyle(titleElement);
            const subtitleStyle = getComputedStyle(subtitleElement);
            const cardRect = element.getBoundingClientRect();
            const titleRect = titleElement.getBoundingClientRect();
            const subtitleRect = subtitleElement.getBoundingClientRect();
            const tagsRect = tagsElement.getBoundingClientRect();
            return {
              titleClamp: titleStyle.getPropertyValue('-webkit-line-clamp').trim(),
              subtitleClamp: subtitleStyle.getPropertyValue('-webkit-line-clamp').trim(),
              titleScrollDelta: titleElement.scrollWidth - titleElement.clientWidth,
              subtitleScrollDelta: subtitleElement.scrollWidth - subtitleElement.clientWidth,
              titleLeft: titleRect.left,
              titleRight: titleRect.right,
              subtitleLeft: subtitleRect.left,
              subtitleRight: subtitleRect.right,
              tagsRight: tagsRect.right,
              cardLeft: cardRect.left,
              cardRight: cardRect.right
            };
          });

          expect(textMetrics.titleClamp).toBe('none');
          expect(textMetrics.subtitleClamp).toBe('none');
          expect(textMetrics.titleScrollDelta).toBeLessThanOrEqual(1);
          expect(textMetrics.subtitleScrollDelta).toBeLessThanOrEqual(1);
          expect(textMetrics.titleLeft).toBeGreaterThanOrEqual(textMetrics.cardLeft);
          expect(textMetrics.subtitleLeft).toBeGreaterThanOrEqual(textMetrics.cardLeft);
          expect(textMetrics.titleRight).toBeLessThanOrEqual(textMetrics.cardRight + 1);
          expect(textMetrics.subtitleRight).toBeLessThanOrEqual(textMetrics.cardRight + 1);
          expect(textMetrics.tagsRight).toBeLessThanOrEqual(textMetrics.cardRight + 1);
        }

        const blogRoot = page.locator(`[data-card-variant="${PRIMARY_BLOG_VARIANT}"]`);
        const blogTags = blogRoot.locator('[data-slot="tags"]');
        const readMore = blogRoot.locator('[data-slot="blogReadMore"]');
        await expect
          .poll(async () => Number(await blogTags.getAttribute('data-visible-tag-count')))
          .toBeGreaterThanOrEqual(1);
        const visibleBlogTags = await blogTags.locator('.landing-grid-card-tag-chip').allTextContents();
        expect(visibleBlogTags).toEqual(blogCard.tags.slice(0, visibleBlogTags.length));
        await expect(readMore).toBeVisible();
        await expect(readMore).toHaveAttribute('aria-hidden', 'true');

        const unavailableRoot = page.locator('[data-card-variant="creativity-profile"]');
        await expect(unavailableRoot.locator('[data-slot="comingSoonTag"]')).toBeVisible();
        await expect(unavailableRoot.locator('[data-slot="comingSoonTag"]')).not.toHaveAttribute('aria-hidden', 'true');

        const overflow = await page.evaluate(() => {
          const container = document.querySelector<HTMLElement>('[data-testid="landing-grid-container"]');
          return {
            container: container ? container.scrollWidth - container.clientWidth : 0,
            document: document.documentElement.scrollWidth - document.documentElement.clientWidth
          };
        });
        expect(overflow).toEqual({container: 0, document: 0});
      }
    }
  });

  test('@smoke assertion:W12-mobile Desktop and Tablet tag prefix identity survives tag line-height change', async ({
    page
  }) => {
    for (const viewportWidth of [1440, 900] as const) {
      await page.setViewportSize({width: viewportWidth, height: 980});
      await page.goto('/id');

      const expectedTier = viewportWidth === 1440 ? 'desktop' : 'tablet';
      const container = page.getByTestId('landing-grid-container');
      await expect(page.getByTestId('landing-grid-shell')).toHaveAttribute('data-grid-tier', expectedTier);
      await container.evaluate((element) => {
        (element as HTMLElement).style.width = '540px';
      });
      await page.waitForTimeout(280);

      const card = page.locator('[data-card-variant="rhythm-b"]');
      const tags = card.locator('[data-slot="tags"]');
      await expect(card).toHaveAttribute('data-card-viewport-tier', expectedTier);
      await expect(card).toHaveAttribute('data-base-gap', '8');
      await expect(tags).toHaveAttribute('data-visible-tag-count', /[1-3]/u);

      const readPrefix = async () => ({
        count: Number(await tags.getAttribute('data-visible-tag-count')),
        labels: await tags.locator('.landing-grid-card-tag-chip').allTextContents()
      });
      const productionPrefix = await readPrefix();
      const productionLineHeight = await tags
        .locator('.landing-grid-card-tag-chip')
        .first()
        .evaluate((element) => getComputedStyle(element).lineHeight);
      expect(productionLineHeight).toBe('17.55px');

      await page.addStyleTag({
        content: `[data-testid="landing-grid-card"] .landing-grid-card-tag-chip { line-height: 1.2 !important; }`
      });
      await page.waitForTimeout(120);
      const overridePrefix = await readPrefix();
      const overrideLineHeight = await tags
        .locator('.landing-grid-card-tag-chip')
        .first()
        .evaluate((element) => getComputedStyle(element).lineHeight);
      expect(overrideLineHeight).toBe('15.6px');
      expect(overridePrefix).toEqual(productionPrefix);

      await page.locator('style').last().evaluate((element) => element.remove());
      await page.waitForTimeout(120);
      const restoredPrefix = await readPrefix();
      expect(restoredPrefix).toEqual(productionPrefix);
    }
  });

  test('@smoke tag tail ellipsis hides right-first and reappears on widen across all 12 locales', async ({
    page
  }) => {
    await page.setViewportSize({width: 900, height: 980});

    for (const locale of locales) {
      await page.goto(`/${locale}`);

      const container = page.getByTestId('landing-grid-container');
      const testCard = page.locator('[data-card-variant="rhythm-b"]');
      const tags = testCard.locator('[data-slot="tags"]');

      await expect(tags).toHaveAttribute('data-visible-tag-count', /[1-3]/u);
      const widePrefix = await tags.locator('.landing-grid-card-tag-chip').allTextContents();

      await testCard.evaluate((element) => {
        const tagsElement = element.querySelector('[data-slot="tags"]');
        if (!tagsElement) {
          throw new Error('Expected public tags list');
        }

        const changes: string[] = [];
        const observer = new MutationObserver(() => {
          changes.push(tagsElement.getAttribute('data-visible-tag-count') ?? '');
        });
        observer.observe(tagsElement, {attributes: true, attributeFilter: ['data-visible-tag-count']});
        Object.assign(window, {
          __wave10VisibleTagChanges: changes,
          __wave10VisibleTagObserver: observer
        });
      });

      await container.evaluate((element) => {
        const htmlElement = element as HTMLElement;
        htmlElement.style.width = `${htmlElement.getBoundingClientRect().width}px`;
        htmlElement.style.transition = 'width 160ms linear';
        requestAnimationFrame(() => {
          htmlElement.style.width = '540px';
        });
      });
      await page.waitForTimeout(280);

      const narrowPrefix = await tags.locator('.landing-grid-card-tag-chip').allTextContents();
      expect(narrowPrefix.length).toBeLessThan(widePrefix.length);
      expect(narrowPrefix).toEqual(widePrefix.slice(0, narrowPrefix.length));
      const shrinkChanges = await page.evaluate(
        () => (window as Window & {__wave10VisibleTagChanges?: string[]}).__wave10VisibleTagChanges ?? []
      );
      expect(shrinkChanges.length).toBeLessThanOrEqual(1);

      await page.evaluate(() => {
        const state = window as Window & {
          __wave10VisibleTagChanges?: string[];
        };
        if (state.__wave10VisibleTagChanges) {
          state.__wave10VisibleTagChanges.length = 0;
        }
      });
      await container.evaluate((element) => {
        (element as HTMLElement).style.width = '';
      });
      await page.waitForTimeout(280);

      const restoredPrefix = await tags.locator('.landing-grid-card-tag-chip').allTextContents();
      expect(restoredPrefix).toEqual(widePrefix);
      const widenChanges = await page.evaluate(
        () => (window as Window & {__wave10VisibleTagChanges?: string[]}).__wave10VisibleTagChanges ?? []
      );
      expect(widenChanges.length).toBeLessThanOrEqual(1);
      await page.evaluate(() => {
        const state = window as Window & {
          __wave10VisibleTagObserver?: MutationObserver;
        };
        state.__wave10VisibleTagObserver?.disconnect();
      });
    }

    await page.goto('/id');
    const container = page.getByTestId('landing-grid-container');
    await container.evaluate((element) => {
      (element as HTMLElement).style.width = '540px';
    });

    const blogCard = page.locator(`[data-card-variant="${PRIMARY_BLOG_VARIANT}"]`);
    const blogTags = blogCard.locator('[data-slot="tags"]');
    const readMore = blogCard.locator('[data-slot="blogReadMore"]');
    const blogTagRow = blogCard.locator('.landing-grid-card-tag-row');
    await expect(blogCard).toHaveAttribute('data-card-viewport-tier', 'tablet');
    await expect(blogCard).toHaveAttribute('data-interaction-mode', 'hover');
    const restCount = Number(await blogTags.getAttribute('data-visible-tag-count'));
    const restPrefix = await blogTags.locator('.landing-grid-card-tag-chip').allTextContents();

    await blogCard.getByTestId('landing-grid-card-trigger').hover();
    await expect(readMore).toHaveCSS('visibility', 'visible');
    await expect
      .poll(async () => Number(await blogTags.getAttribute('data-visible-tag-count')))
      .toBeLessThan(restCount);
    const hoverPrefix = await blogTags.locator('.landing-grid-card-tag-chip').allTextContents();
    expect(hoverPrefix).toEqual(restPrefix.slice(0, hoverPrefix.length));
    const [tagRowBox, readMoreBox] = await Promise.all([blogTagRow.boundingBox(), readMore.boundingBox()]);
    expect(tagRowBox).not.toBeNull();
    expect(readMoreBox).not.toBeNull();
    expect(
      Math.abs(
        (tagRowBox?.x ?? 0) +
          (tagRowBox?.width ?? 0) -
          ((readMoreBox?.x ?? 0) + (readMoreBox?.width ?? 0))
      )
    ).toBeLessThanOrEqual(1);

    await container.evaluate((element) => {
      (element as HTMLElement).style.width = '';
    });
    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/en');
    await expect(page.getByTestId('landing-grid-shell')).toHaveAttribute('data-grid-tier', 'mobile');
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const landingContainer = document.querySelector<HTMLElement>('[data-testid="landing-grid-container"]');
          if (!landingContainer) {
            throw new Error('Expected landing grid container.');
          }

          return {
            document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            container: landingContainer.scrollWidth - landingContainer.clientWidth
          };
        })
      )
      .toEqual({document: 0, container: 0});
  });

  test('@smoke assertion:B4-inline-size subtitle overflow does not contaminate card or sibling slot inline sizes', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const shortCard = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    const longCard = page.locator('[data-card-variant="rhythm-b"]');
    await expect(shortCard).toHaveCount(1);
    await expect(longCard).toHaveCount(1);

    const widthMetrics = await Promise.all(
      [shortCard, longCard].map(async (cardLocator) => {
        const cardWidth = await cardLocator.evaluate((element) => element.getBoundingClientRect().width);
        const thumbnailWidth = await cardLocator
          .locator('[data-slot="cardThumbnail"]')
          .evaluate((element) => element.getBoundingClientRect().width);
        const tagsWidth = await cardLocator
          .locator('[data-slot="tags"]')
          .evaluate((element) => element.getBoundingClientRect().width);

        return {cardWidth, thumbnailWidth, tagsWidth};
      })
    );

    const [shortMetrics, longMetrics] = widthMetrics;
    expect(Math.abs(shortMetrics.cardWidth - longMetrics.cardWidth)).toBeLessThanOrEqual(1);
    expect(Math.abs(shortMetrics.thumbnailWidth - longMetrics.thumbnailWidth)).toBeLessThanOrEqual(1);
    expect(Math.abs(shortMetrics.tagsWidth - longMetrics.tagsWidth)).toBeLessThanOrEqual(1);

    const row0 = page.getByTestId('landing-grid-row-0');
    const rowClientWidth = await row0.evaluate((element) => element.clientWidth);
    const rowScrollWidth = await row0.evaluate((element) => element.scrollWidth);
    expect(Math.abs(rowClientWidth - rowScrollWidth)).toBeLessThanOrEqual(1);
  });

  test('@smoke active expanded width and zero horizontal overflow cover edge and center cards across all column modes', async ({
    page
  }) => {
    const scenarios = [
      {
        viewport: {width: 1440, height: 980},
        columnMode: 'desktop-wide' as const,
        desiredScale: 1.1,
        cards: [
          {variant: 'qmbti', anchor: 'start' as const},
          {variant: 'rhythm-b', anchor: 'center' as const},
          {variant: 'energy-check', anchor: 'end' as const},
          {variant: 'egtt', anchor: 'center' as const}
        ]
      },
      {
        viewport: {width: 1180, height: 980},
        columnMode: 'desktop-medium' as const,
        desiredScale: 1.1,
        cards: [
          {variant: 'qmbti', anchor: 'start' as const},
          {variant: 'rhythm-b', anchor: 'end' as const},
          {variant: 'egtt', anchor: 'end' as const}
        ]
      },
      {
        viewport: {width: 1024, height: 980},
        columnMode: 'two-column' as const,
        desiredScale: 1.1,
        cards: [
          {variant: 'qmbti', anchor: 'start' as const},
          {variant: 'rhythm-b', anchor: 'end' as const},
          {variant: 'egtt', anchor: 'start' as const}
        ]
      },
      {
        viewport: {width: 1023, height: 980},
        columnMode: 'two-column' as const,
        desiredScale: 1.04,
        cards: [
          {variant: 'qmbti', anchor: 'start' as const},
          {variant: 'rhythm-b', anchor: 'end' as const}
        ]
      }
    ];

    for (const scenario of scenarios) {
      await page.setViewportSize(scenario.viewport);
      await page.goto('/en');

      const shell = page.getByTestId('landing-grid-shell');
      await expect(shell).toHaveAttribute('data-grid-column-mode', scenario.columnMode);

      const measurements: Array<
        Awaited<ReturnType<typeof readExpandedWidthContract>> & {
          variant: string;
          anchor: 'start' | 'center' | 'end';
        }
      > = [];

      for (const cardSpec of scenario.cards) {
        const card = page.locator(`[data-card-variant="${cardSpec.variant}"]`);
        await hoverDesktopExpandedCard(card);
        const measurement = await readExpandedWidthContract(card);
        measurements.push({...measurement, ...cardSpec});
        await collapseDesktopExpandedCard(page, card);
      }

      for (const measurement of measurements) {
        const widthRatio = measurement.surfaceWidth / measurement.rootWidth;
        expect(measurement.originX).toBe(
          measurement.anchor === 'start' ? '0%' : measurement.anchor === 'end' ? '100%' : '50%'
        );
        expect(measurement.desiredScale).toBe(scenario.desiredScale);
        expect(measurement.resolvedScale).toBeLessThanOrEqual(measurement.desiredScale);
        expect(measurement.resolvedScale).toBeLessThanOrEqual(measurement.maxScale);
        expect(Math.abs(widthRatio - measurement.resolvedScale)).toBeLessThanOrEqual(0.02);
        expect(Math.abs(measurement.shellScale - 1.04)).toBeLessThanOrEqual(0.001);
        expect(Math.abs(measurement.shellInlineScale - measurement.frameScale)).toBeLessThanOrEqual(0.001);

        switch (measurement.anchor) {
          case 'start':
            expect(Math.abs(measurement.expandLeft)).toBeLessThanOrEqual(1.5);
            expect(measurement.expandRight).toBeGreaterThan(2);
            break;
          case 'center':
            expect(measurement.expandLeft).toBeGreaterThan(2);
            expect(measurement.expandRight).toBeGreaterThan(2);
            expect(Math.abs(measurement.expandLeft - measurement.expandRight)).toBeLessThanOrEqual(1);
            break;
          case 'end':
            expect(measurement.expandLeft).toBeGreaterThan(2);
            expect(Math.abs(measurement.expandRight)).toBeLessThanOrEqual(1.5);
            break;
        }
        expect(measurement.titleLeftInset).toBeGreaterThan(0);
        expect(measurement.titleRightInset).toBeGreaterThan(0);
        expect(measurement.detailLeftInset).toBeGreaterThan(0);
        expect(measurement.detailRightInset).toBeGreaterThan(0);
        expect(measurement.line1Text.length).toBeGreaterThan(0);
        expect(measurement.stageLeft).toBeLessThanOrEqual(measurement.surfaceLeft);
        expect(measurement.stageRight).toBeGreaterThanOrEqual(measurement.surfaceRight);
      }

      for (const locator of [
        page.getByTestId('landing-grid-container'),
        page.getByTestId('landing-grid-shell'),
        page.locator('html')
      ]) {
        expect(await locator.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
      }
    }
  });

  test('@smoke assertion:B10-spacing-model assertion:B11-row-consistency base-gap and comp-gap follow row-local compensation rule for row1 and row2+', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    await expect(page.getByTestId('landing-grid-card').first()).toBeVisible();

    const rows = page.locator('[data-testid^="landing-grid-row-"]');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(1);

    for (let rowIndex = 0; rowIndex < Math.min(2, rowCount); rowIndex += 1) {
      const rowCards = rows.nth(rowIndex).locator('[data-testid="landing-grid-card"]');
      const rowCardCount = await rowCards.count();
      expect(rowCardCount).toBeGreaterThan(0);
      const rowMetrics = await rowCards.evaluateAll((cardElements) =>
        cardElements.map((cardElement) => {
          const content = cardElement.querySelector('.landing-grid-card-content');
          const subtitle = cardElement.querySelector('[data-slot="cardSubtitle"]');
          const tags = cardElement.querySelector('[data-slot="tags"]');
          if (!content || !subtitle || !tags) {
            return null;
          }

          const cardRect = cardElement.getBoundingClientRect();
          const contentRect = content.getBoundingClientRect();
          const subtitleRect = subtitle.getBoundingClientRect();
          const tagsRect = tags.getBoundingClientRect();

          return {
            id: cardElement.getAttribute('data-card-variant') ?? '',
            cardBottom: cardRect.bottom,
            contentTop: contentRect.top,
            contentBottom: contentRect.bottom,
            subtitleBottom: subtitleRect.bottom,
            tagsTop: tagsRect.top,
            tagsBottom: tagsRect.bottom,
            baseGapAttr: Number.parseFloat(cardElement.getAttribute('data-base-gap') ?? '0') || 0,
            compGapAttr: Number.parseFloat(cardElement.getAttribute('data-comp-gap') ?? '0') || 0,
            needsCompAttr: cardElement.getAttribute('data-needs-comp') === 'true'
          };
        })
      );

      const settledMetrics = rowMetrics.filter((metric): metric is NonNullable<(typeof rowMetrics)[number]> => metric !== null);
      expect(settledMetrics).toHaveLength(rowCardCount);

      const rowBottom = settledMetrics[0]?.cardBottom ?? 0;
      const rowBaseGapFromGeometry = Math.min(...settledMetrics.map((metric) => metric.tagsTop - metric.subtitleBottom));
      expect(rowBaseGapFromGeometry).toBeGreaterThan(0);

      const derivedMetrics = settledMetrics.map((metric) => {
        const compFromGeometry = Math.max(0, metric.tagsTop - metric.subtitleBottom - rowBaseGapFromGeometry);
        const naturalFromGeometry = Math.max(0, metric.tagsBottom - metric.contentTop - compFromGeometry);
        return {
          ...metric,
          compFromGeometry,
          naturalFromGeometry
        };
      });

      for (const metric of derivedMetrics) {
        expect(Math.abs(metric.cardBottom - rowBottom)).toBeLessThanOrEqual(1);
        expect(Math.abs(metric.contentBottom - metric.tagsBottom)).toBeLessThanOrEqual(0.5);
        expect(Math.abs(metric.baseGapAttr - rowBaseGapFromGeometry)).toBeLessThanOrEqual(1);
        expect(Math.abs(metric.compGapAttr - metric.compFromGeometry)).toBeLessThanOrEqual(1);
        expect(metric.compFromGeometry).toBeGreaterThanOrEqual(0);
      }

      const rowMaxNaturalFromGeometry = Math.max(...derivedMetrics.map((metric) => metric.naturalFromGeometry));

      for (const metric of derivedMetrics) {
        const delta = rowMaxNaturalFromGeometry - metric.naturalFromGeometry;

        if (delta > 0.5) {
          expect(metric.compFromGeometry).toBeGreaterThan(0);
          expect(metric.needsCompAttr).toBe(true);
        } else {
          expect(Math.abs(metric.compFromGeometry)).toBeLessThanOrEqual(0.05);
          expect(metric.needsCompAttr).toBe(false);
        }
      }
    }
  });

  test('@smoke font-ready and resize remeasure preserve settled compensation', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const targetCard = page.locator('[data-card-variant="rhythm-b"]');
    await expect(targetCard).toHaveAttribute('data-natural-height', /[1-9]\d*(?:\.\d+)?/);
    const initialNaturalHeight = Number(await targetCard.getAttribute('data-natural-height'));

    await targetCard.locator('[data-slot="cardSubtitle"]').evaluate((element) => {
      const subtitle = element as HTMLElement;
      subtitle.style.fontSize = '32px';
      subtitle.style.lineHeight = '1.5';
      subtitle.style.setProperty('-webkit-line-clamp', 'unset');
      subtitle.style.overflow = 'visible';
      void document.fonts.ready.then(() => {
        document.fonts.dispatchEvent(new Event('loadingdone'));
      });
    });

    await expect
      .poll(async () => Number(await targetCard.getAttribute('data-natural-height')))
      .toBeGreaterThan(initialNaturalHeight + 10);

    for (const width of [1180, 1440]) {
      await page.setViewportSize({width, height: 980});
      await expect(page.getByTestId('landing-grid-shell')).toHaveAttribute('data-grid-inline-size', /\d+/);
      await expect
        .poll(async () =>
          page.locator('[data-testid="landing-grid-card"]').evaluateAll((cards) =>
            cards.every((card) => {
              const naturalHeight = Number(card.getAttribute('data-natural-height') ?? '0');
              const compGap = Number(card.getAttribute('data-comp-gap') ?? '0');
              const needsComp = card.getAttribute('data-needs-comp') === 'true';
              return naturalHeight > 0 && (needsComp || compGap === 0);
            })
          )
        )
        .toBe(true);
    }

    const rows = page.locator('[data-testid^="landing-grid-row-"]');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(2);
    await expect(rows.last()).toHaveAttribute('data-underfilled', 'true');

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const decisions = await rows
        .nth(rowIndex)
        .locator('[data-testid="landing-grid-card"]')
        .evaluateAll((cards) =>
          cards.map((card) => ({
            naturalHeight: Number(card.getAttribute('data-natural-height') ?? '0'),
            rowMax: Number(card.getAttribute('data-row-natural-max') ?? '0'),
            needsComp: card.getAttribute('data-needs-comp') === 'true',
            compGap: Number(card.getAttribute('data-comp-gap') ?? '0')
          }))
        );

      for (const decision of decisions) {
        expect(decision.naturalHeight).toBeGreaterThan(0);
        expect(decision.rowMax).toBeGreaterThanOrEqual(decision.naturalHeight);
        if (!decision.needsComp) {
          expect(decision.compGap).toBe(0);
        }
      }
    }
  });

  test('@smoke normal card slot order and unavailable coming-soon tag contract', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    await expect(page.locator('[data-card-variant="debug-sample"]')).toHaveCount(0);

    const assetBackedCard = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    const emptyTagsCard = page.locator('[data-card-variant="build-metrics"]');
    await expect(emptyTagsCard).toHaveAttribute('data-card-state', 'normal');

    const orderedSlots = await assetBackedCard.evaluate((element) => {
      const content = element.querySelector('.landing-grid-card-content');
      if (!content) {
        return [];
      }

      return Array.from(content.children)
        .map((slotElement) => slotElement.getAttribute('data-slot'))
        .filter((value): value is string => value !== null);
    });

    expect(orderedSlots).toEqual(['cardThumbnail', 'cardTitle', 'cardSubtitle', 'tags']);
    await expect(assetBackedCard.locator('[data-slot="blogReadMore"]')).toHaveCount(0);
    await expect(emptyTagsCard.locator('[data-slot="tags"] .landing-grid-card-tag-item')).toHaveCount(0);
    await expect(emptyTagsCard.locator('[data-slot="blogReadMore"]')).toHaveCount(1);

    const minHeight = await emptyTagsCard
      .locator('[data-slot="tags"]')
      .evaluate((element) => getComputedStyle(element).getPropertyValue('min-height').trim());
    expect(minHeight).toBe('28px');

    const thumbnailRatio = await emptyTagsCard
      .locator('[data-slot="cardThumbnail"]')
      .evaluate((element) => element.clientWidth / Math.max(1, element.clientHeight));
    expect(thumbnailRatio).toBeGreaterThan(2.4);
    expect(thumbnailRatio).toBeLessThan(2.9);

    const assetThumbnailSrc = await assetBackedCard.locator('.landing-grid-card-thumbnail').getAttribute('src');
    const fallbackThumbnailSrc = await emptyTagsCard.locator('.landing-grid-card-thumbnail').getAttribute('src');
    expect(assetThumbnailSrc).toContain(`/landing-card-media/${PRIMARY_AVAILABLE_TEST_VARIANT}/thumbnail.svg`);
    expect(fallbackThumbnailSrc).toMatch(/^data:image\/svg\+xml,/u);

    const unavailableCard = page.locator('[data-card-variant="creativity-profile"]');
    await expect(unavailableCard).toHaveAttribute('data-card-availability', 'unavailable');
    await expect(unavailableCard).toHaveAttribute('data-interaction-mode', 'hover');

    // D2/BQ-26: the top-right overlay pill is gone; a standard coming-soon tag sits in the tags row
    // and is always visible (no hover gating).
    await expect(unavailableCard.locator('[data-slot="unavailableOverlay"]')).toHaveCount(0);
    const comingSoonTag = unavailableCard.locator('[data-slot="comingSoonTag"]');
    await expect(comingSoonTag).toHaveCount(1);
    await expect(comingSoonTag).toHaveText('coming soon');
    await expect(unavailableCard.locator('[data-slot="tags"]')).toContainText('coming soon');

    await page.mouse.move(0, 0);
    await page.waitForTimeout(180);
    const restingTagOpacity = parseFloat(
      await comingSoonTag.evaluate((element) => getComputedStyle(element).getPropertyValue('opacity').trim())
    );
    expect(restingTagOpacity).toBeGreaterThanOrEqual(0.95);

    // design.md §7.5/§10: title and subtitle keep full opacity (the dim is on the thumbnail only).
    const titleOpacity = parseFloat(
      await unavailableCard.locator('[data-slot="cardTitle"]').evaluate((element) => getComputedStyle(element).opacity)
    );
    const subtitleOpacity = parseFloat(
      await unavailableCard.locator('[data-slot="cardSubtitle"]').evaluate((element) => getComputedStyle(element).opacity)
    );
    expect(titleOpacity).toBe(1);
    expect(subtitleOpacity).toBe(1);
    await expect(unavailableCard.locator('[data-slot="cardTitle"]')).toBeVisible();
  });

  test('@smoke root minimum removal preserves Normal row stretch and desktop placeholder cleanup geometry', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const normalCards = [
      page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`),
      page.locator('[data-card-variant="ops-handbook"]'),
      page.locator('[data-card-variant="creativity-profile"]')
    ];
    const rootMinimums: string[] = [];

    for (const card of normalCards) {
      const metrics = await card.evaluate((element) => {
        const row = element.closest<HTMLElement>('[data-testid^="landing-grid-row-"]');
        const trigger = element.querySelector<HTMLElement>('[data-slot="primaryTrigger"]');
        if (!row || !trigger) {
          throw new Error('Expected Normal row and primary trigger.');
        }

        const rootRect = element.getBoundingClientRect();
        const rowRect = row.getBoundingClientRect();
        const triggerRect = trigger.getBoundingClientRect();
        return {
          minHeight: getComputedStyle(element).minHeight,
          rootHeight: rootRect.height,
          rowHeight: rowRect.height,
          triggerHeight: triggerRect.height,
          triggerTopDelta: triggerRect.top - rootRect.top,
          triggerBottomDelta: triggerRect.bottom - rootRect.bottom
        };
      });

      rootMinimums.push(metrics.minHeight);
      expect(Math.abs(metrics.rootHeight - metrics.rowHeight)).toBeLessThanOrEqual(1);
      expect(metrics.triggerHeight).toBeGreaterThanOrEqual(44);
      expect(Math.abs(metrics.triggerTopDelta)).toBeLessThanOrEqual(1);
      expect(Math.abs(metrics.triggerBottomDelta)).toBeLessThanOrEqual(1);
    }

    const sourceCard = normalCards[0];
    const siblingCard = page.locator('[data-card-variant="rhythm-b"]');
    const before = await Promise.all([sourceCard.boundingBox(), siblingCard.boundingBox()]);
    expect(before[0]).not.toBeNull();
    expect(before[1]).not.toBeNull();

    await sourceCard.evaluate((element) => {
      const sibling = element.parentElement?.querySelector<HTMLElement>('[data-card-variant="rhythm-b"]');
      const samples: Array<{
        phase: string;
        sourceHeight: number;
        siblingTop: number;
        siblingHeight: number;
      }> = [];
      const observer = new MutationObserver(() => {
        const phase = element.getAttribute('data-desktop-shell-phase') ?? '';
        if (phase !== 'cleanup-pending' || !sibling) {
          return;
        }

        const sourceRect = element.getBoundingClientRect();
        const siblingRect = sibling.getBoundingClientRect();
        samples.push({
          phase,
          sourceHeight: sourceRect.height,
          siblingTop: siblingRect.top,
          siblingHeight: siblingRect.height
        });
      });
      observer.observe(element, {attributes: true, attributeFilter: ['data-desktop-shell-phase']});
      Object.assign(window, {
        __wave10RootMinimumCleanupSamples: samples,
        __wave10RootMinimumCleanupObserver: observer
      });
    });

    await hoverDesktopExpandedCard(sourceCard);
    const active = await Promise.all([sourceCard.boundingBox(), siblingCard.boundingBox()]);
    expect(Math.abs((active[0]?.height ?? 0) - (before[0]?.height ?? 0))).toBeLessThanOrEqual(1);
    expect(Math.abs((active[1]?.y ?? 0) - (before[1]?.y ?? 0))).toBeLessThanOrEqual(1);
    expect(Math.abs((active[1]?.height ?? 0) - (before[1]?.height ?? 0))).toBeLessThanOrEqual(1);

    await page.mouse.move(1, 1);
    await expect(sourceCard).toHaveAttribute('data-desktop-shell-phase', 'idle');

    const cleanupSamples = await page.evaluate(
      () =>
        (
          window as Window & {
            __wave10RootMinimumCleanupSamples?: Array<{
              phase: string;
              sourceHeight: number;
              siblingTop: number;
              siblingHeight: number;
            }>;
            __wave10RootMinimumCleanupObserver?: MutationObserver;
          }
        ).__wave10RootMinimumCleanupSamples ?? []
    );
    expect(cleanupSamples).not.toHaveLength(0);
    for (const sample of cleanupSamples) {
      expect(sample.phase).toBe('cleanup-pending');
      expect(Math.abs(sample.sourceHeight - (before[0]?.height ?? 0))).toBeLessThanOrEqual(1);
      expect(Math.abs(sample.siblingTop - (before[1]?.y ?? 0))).toBeLessThanOrEqual(1);
      expect(Math.abs(sample.siblingHeight - (before[1]?.height ?? 0))).toBeLessThanOrEqual(1);
    }
    await page.evaluate(() => {
      (
        window as Window & {
          __wave10RootMinimumCleanupObserver?: MutationObserver;
        }
      ).__wave10RootMinimumCleanupObserver?.disconnect();
    });

    const restored = await Promise.all([sourceCard.boundingBox(), siblingCard.boundingBox()]);
    expect(Math.abs((restored[0]?.height ?? 0) - (before[0]?.height ?? 0))).toBeLessThanOrEqual(1);
    expect(Math.abs((restored[1]?.y ?? 0) - (before[1]?.y ?? 0))).toBeLessThanOrEqual(1);
    expect(Math.abs((restored[1]?.height ?? 0) - (before[1]?.height ?? 0))).toBeLessThanOrEqual(1);

    for (const minHeight of rootMinimums) {
      expect(['auto', '0px']).toContain(minHeight);
    }
  });

  test('@smoke unavailable coming-soon tag is always visible in tap mode', async ({page}) => {
    await page.addInitScript(() => {
      const originalMatchMedia = window.matchMedia.bind(window);
      window.matchMedia = (query: string) => {
        if (query === '(hover: hover) and (pointer: fine)') {
          return {
            media: query,
            matches: false,
            onchange: null,
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
            addListener: () => {},
            removeListener: () => {}
          } as MediaQueryList;
        }

        return originalMatchMedia(query);
      };
    });

    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/en');

    const unavailableCard = page.locator('[data-card-variant="creativity-profile"]');
    await expect(unavailableCard).toHaveAttribute('data-interaction-mode', 'tap');
    await expect(unavailableCard.locator('[data-slot="unavailableOverlay"]')).toHaveCount(0);
    const comingSoonTag = unavailableCard.locator('[data-slot="comingSoonTag"]');
    await expect(comingSoonTag).toHaveCount(1);
    await expect(comingSoonTag).toHaveText('coming soon');
    await expect
      .poll(async () =>
        parseFloat(await comingSoonTag.evaluate((element) => getComputedStyle(element).getPropertyValue('opacity').trim()))
      )
      .toBeGreaterThanOrEqual(0.95);
  });

  test('@smoke assertion:B4-geometry-active-frame desktop expanded overlay keeps same-row non-target metrics frozen', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const shell = page.getByTestId('landing-grid-shell');
    const sourceCard = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    const siblingCard = page.locator('[data-card-variant="rhythm-b"]');
    const before = await siblingCard.boundingBox();

    expect(before).not.toBeNull();
    await sourceCard.hover();
    await expect(sourceCard).toHaveAttribute('data-card-state', 'expanded');
    await expect(shell).toHaveAttribute('data-baseline-phase', 'BASELINE_FROZEN');

    const after = await siblingCard.boundingBox();
    expect(after).not.toBeNull();
    expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThanOrEqual(1);
    expect(Math.abs((after?.height ?? 0) - (before?.height ?? 0))).toBeLessThanOrEqual(1);
    expect(Math.abs((after?.y ?? 0) + (after?.height ?? 0) - ((before?.y ?? 0) + (before?.height ?? 0)))).toBeLessThanOrEqual(1);

    await page.mouse.move(0, 0);
    await expect(sourceCard).toHaveAttribute('data-card-state', 'normal');
    await expect.poll(() => shell.getAttribute('data-baseline-phase')).toBe('BASELINE_READY');

    // §6.7(3): same-row non-target isolation that holds for row 0 must hold identically for
    // lower rows. Blog cards no longer expand in Wave 7, so the lower-row handoff leg is
    // limited to the remaining expandable test card and a normal-state sibling.
    const lowerTarget = page.locator('[data-card-variant="egtt"]');
    const lowerSibling = page.locator('[data-card-variant="build-metrics"]');
    const lowerBefore = await lowerSibling.boundingBox();
    expect(lowerBefore).not.toBeNull();

    await lowerTarget.hover();
    await expect(lowerTarget).toHaveAttribute('data-card-state', 'expanded');
    await expect(lowerTarget).toHaveAttribute('data-desktop-motion-role', 'steady');
    await expect(shell).toHaveAttribute('data-baseline-phase', 'BASELINE_FROZEN');

    const lowerSteady = await lowerSibling.boundingBox();
    expect(lowerSteady).not.toBeNull();
    expect(Math.abs((lowerSteady?.y ?? 0) - (lowerBefore?.y ?? 0))).toBeLessThanOrEqual(1);
    expect(Math.abs((lowerSteady?.height ?? 0) - (lowerBefore?.height ?? 0))).toBeLessThanOrEqual(1);
    expect(
      Math.abs((lowerSteady?.y ?? 0) + (lowerSteady?.height ?? 0) - ((lowerBefore?.y ?? 0) + (lowerBefore?.height ?? 0)))
    ).toBeLessThanOrEqual(1);

    await page.mouse.move(0, 0);
    await expect(lowerTarget).toHaveAttribute('data-card-state', 'normal');
    await expect.poll(() => shell.getAttribute('data-baseline-phase')).toBe('BASELINE_READY');

    const lowerAfter = await lowerSibling.boundingBox();
    expect(lowerAfter).not.toBeNull();
    expect(Math.abs((lowerAfter?.y ?? 0) - (lowerBefore?.y ?? 0))).toBeLessThanOrEqual(1);
    expect(Math.abs((lowerAfter?.height ?? 0) - (lowerBefore?.height ?? 0))).toBeLessThanOrEqual(1);
  });

  test('@smoke assertion:B4-short-expanded desktop short expanded overlay stays content-fit without leaking the in-flow shell', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const sourceCard = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    const siblingCard = page.locator('[data-card-variant="rhythm-b"]');
    const beforeSibling = await siblingCard.boundingBox();
    // Resting (row-max stretched) outer height of the in-flow placeholder, captured before expand.
    const beforeSourceRoot = await sourceCard.boundingBox();

    expect(beforeSibling).not.toBeNull();
    expect(beforeSourceRoot).not.toBeNull();
    await sourceCard.hover();
    await expect(sourceCard).toHaveAttribute('data-card-state', 'expanded');
    await expect(sourceCard).toHaveAttribute('data-desktop-motion-role', 'steady');
    await sourceCard.locator('[data-slot="cardTitleExpanded"]').hover();

    const overlayMetrics = await readDesktopExpandedOverlayMetrics(sourceCard);
    const afterSibling = await siblingCard.boundingBox();

    expect(overlayMetrics.rootBackgroundAlpha).toBeLessThanOrEqual(0.05);
    expect(overlayMetrics.surfaceBackgroundAlpha).toBeGreaterThan(0.9);
    expect(overlayMetrics.shellMinHeight).toBe('0px');
    expect(overlayMetrics.surfaceMinHeight).toBe('0px');
    // Wave 6 BQ-24 height floor: the short card's expanded surface must reach at least the
    // resting cell (row-max) height. Floor lives on expandedBody (px), never as shell/surface
    // min-height (asserted 0px above) and never as min-height:100% (design §7.3/§10).
    expect(overlayMetrics.surfaceHeight).toBeGreaterThanOrEqual((beforeSourceRoot?.height ?? 0) - 0.5);
    expect(afterSibling).not.toBeNull();
    expect(Math.abs((afterSibling?.y ?? 0) - (beforeSibling?.y ?? 0))).toBeLessThanOrEqual(1);
    expect(Math.abs((afterSibling?.height ?? 0) - (beforeSibling?.height ?? 0))).toBeLessThanOrEqual(1);
    expect(
      Math.abs((afterSibling?.y ?? 0) + (afterSibling?.height ?? 0) - ((beforeSibling?.y ?? 0) + (beforeSibling?.height ?? 0)))
    ).toBeLessThanOrEqual(1);
  });

  test('@smoke assertion:B13-hover-collapse desktop hover-out collapse stays independent and handoff remains enterable-only', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const firstCard = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    const secondCard = page.locator('[data-card-variant="rhythm-b"]');
    const optOutCard = page.locator(`[data-card-variant="${PRIMARY_OPT_OUT_TEST_VARIANT}"]`);
    const unavailableCard = page.locator('[data-card-variant="creativity-profile"]');

    await expect(firstCard).toHaveCount(1);
    await expect(optOutCard).toHaveCount(1);
    await expect(optOutCard).toHaveAttribute('data-card-attribute', 'opt_out');

    await firstCard.hover();
    await expect(firstCard).toHaveAttribute('data-card-state', 'expanded');
    const expandedRadius = await firstCard
      .locator('[data-slot="expandedSurface"]')
      .evaluate((element) => getComputedStyle(element).getPropertyValue('border-radius').trim());
    const collapsedRadius = await firstCard.evaluate((element) => getComputedStyle(element).getPropertyValue('border-radius').trim());
    expect(expandedRadius).toBe(collapsedRadius);

    await unavailableCard.hover();
    await expect(unavailableCard).toHaveAttribute('data-card-state', 'normal');
    await expect(firstCard).toHaveAttribute('data-card-state', 'normal');

    await firstCard.hover();
    await expect(firstCard).toHaveAttribute('data-card-state', 'expanded');
    await expect(firstCard).toHaveAttribute('data-desktop-shell-phase', 'steady');

    await page.mouse.move(8, 8);
    await expectDesktopClosingSnapshot(firstCard);
    await expect(firstCard).toHaveAttribute('data-card-state', 'normal');
    await expect(firstCard).toHaveAttribute('data-desktop-shell-phase', 'idle');
    await expect(firstCard.locator('[data-slot="cardThumbnail"]')).toHaveCount(1);
    await expect(firstCard.locator('[data-slot="expandedLayer"]')).toHaveCount(0);

    await unavailableCard.hover();
    await expect(unavailableCard).toHaveAttribute('data-card-state', 'normal');
    await expect
      .poll(async () =>
        parseFloat(
          await unavailableCard
            .locator('[data-slot="comingSoonTag"]')
            .evaluate((element) => getComputedStyle(element).getPropertyValue('opacity').trim())
        )
      )
      .toBeGreaterThanOrEqual(0.95);

    await firstCard.hover();
    await expect(firstCard).toHaveAttribute('data-card-state', 'expanded');
    await secondCard.hover();
    await expect(firstCard).toHaveAttribute('data-desktop-motion-role', 'handoff-source');
    await expect(firstCard).toHaveAttribute('data-desktop-shell-phase', 'handoff-source');
    await expect(secondCard).toHaveAttribute('data-desktop-motion-role', 'handoff-target');
    await expect(secondCard).toHaveAttribute('data-desktop-shell-phase', 'handoff-target');
    await expect(secondCard).toHaveAttribute('data-card-state', 'expanded');

    await optOutCard.hover();
    await expect(secondCard).toHaveAttribute('data-desktop-motion-role', 'handoff-source');
    await expect(secondCard).toHaveAttribute('data-desktop-shell-phase', 'handoff-source');
    await expect(optOutCard).toHaveAttribute('data-desktop-motion-role', 'handoff-target');
    await expect(optOutCard).toHaveAttribute('data-desktop-shell-phase', 'handoff-target');
    await expect(optOutCard).toHaveAttribute('data-card-state', 'expanded');

    await firstCard.hover();
    await expect(optOutCard).toHaveAttribute('data-desktop-motion-role', 'handoff-source');
    await expect(optOutCard).toHaveAttribute('data-desktop-shell-phase', 'handoff-source');
    await expect(firstCard).toHaveAttribute('data-desktop-motion-role', 'handoff-target');
    await expect(firstCard).toHaveAttribute('data-desktop-shell-phase', 'handoff-target');
    await expect(firstCard).toHaveAttribute('data-card-state', 'expanded');
  });
});
