import {expect, test, type Locator, type Page} from '@playwright/test';

import {
  DESKTOP_MEDIUM_MIN_GRID_INLINE_SIZE,
  DESKTOP_WIDE_MIN_GRID_INLINE_SIZE,
  MOBILE_MAX_VIEWPORT_WIDTH,
  TABLET_DESKTOP_SIDE_PADDING,
  type LandingGridColumnMode
} from '../../src/features/landing/grid/layout-plan';
import {seedTelemetryConsent} from './helpers/consent';
import {PRIMARY_AVAILABLE_TEST_CARD_ID} from './helpers/landing-fixture';

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

async function findMixedScrollbarHeight(
  page: Page,
  widerViewportWidth: number,
  narrowerViewportWidth: number
): Promise<{viewportHeight: number; widerSample: GridSweepSample; narrowerSample: GridSweepSample}> {
  for (let viewportHeight = 1400; viewportHeight >= 980; viewportHeight -= 4) {
    const widerSample = await sampleGridSweepState(page, widerViewportWidth, viewportHeight);
    const narrowerSample = await sampleGridSweepState(page, narrowerViewportWidth, viewportHeight);

    if (!widerSample.hasScrollbar && narrowerSample.hasScrollbar) {
      return {viewportHeight, widerSample, narrowerSample};
    }
  }

  throw new Error('Expected to find a viewport height where medium and two-column modes disagree on scrollbar state');
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

test.describe('Phase 4 grid smoke', () => {
  test.beforeEach(async ({page}) => {
    await seedTelemetryConsent(page, 'OPTED_OUT');
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

    const desktopWideBoundaryViewport = DESKTOP_WIDE_MIN_GRID_INLINE_SIZE + TABLET_DESKTOP_SIDE_PADDING * 2;
    const desktopMediumBoundaryViewport = DESKTOP_MEDIUM_MIN_GRID_INLINE_SIZE + TABLET_DESKTOP_SIDE_PADDING * 2;

    const wideSamples: GridSweepSample[] = [];
    for (const viewportWidth of createDescendingViewportSweep(desktopWideBoundaryViewport, 6)) {
      wideSamples.push(await sampleGridSweepState(page, viewportWidth, 980));
    }

    expectAllowedModes(wideSamples, ['desktop-wide', 'desktop-medium']);
    expectBoundaryCoverage(wideSamples, ['desktop-wide', 'desktop-medium']);
    expectMonotonicGridSweep(wideSamples);

    const chatterScenario = await findMixedScrollbarHeight(
      page,
      desktopMediumBoundaryViewport + 6,
      desktopMediumBoundaryViewport - 6
    );
    expect(chatterScenario.widerSample.hasScrollbar).toBe(false);
    expect(chatterScenario.narrowerSample.hasScrollbar).toBe(true);

    const mediumTwoColumnSamples: GridSweepSample[] = [];
    for (const viewportWidth of createDescendingViewportSweep(desktopMediumBoundaryViewport, 6)) {
      mediumTwoColumnSamples.push(await sampleGridSweepState(page, viewportWidth, chatterScenario.viewportHeight));
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

  test('@smoke card type label is removed and subtitle clamp is consistent across rows', async ({page}) => {
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

  test('@smoke assertion:B4-inline-size subtitle overflow does not contaminate card or sibling slot inline sizes', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const shortCard = page.locator(`[data-card-id="${PRIMARY_AVAILABLE_TEST_CARD_ID}"]`);
    const longCard = page.locator('[data-card-id="test-rhythm-b"]');
    await expect(shortCard).toHaveCount(1);
    await expect(longCard).toHaveCount(1);

    const widthMetrics = await Promise.all(
      [shortCard, longCard].map(async (cardLocator) => {
        const cardWidth = await cardLocator.evaluate((element) => element.getBoundingClientRect().width);
        const thumbnailWidth = await cardLocator
          .locator('[data-slot="thumbnailOrIcon"]')
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
            id: cardElement.getAttribute('data-card-id') ?? '',
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

  test('@smoke normal card slot order and unavailable overlay contract', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    await expect(page.locator('[data-card-id="test-debug-sample"]')).toHaveCount(0);

    const emptyTagsCard = page.locator('[data-card-id="blog-build-metrics"]');
    await expect(emptyTagsCard).toHaveAttribute('data-card-state', 'normal');

    const orderedSlots = await emptyTagsCard.evaluate((element) => {
      const content = element.querySelector('.landing-grid-card-content');
      if (!content) {
        return [];
      }

      return Array.from(content.children)
        .map((slotElement) => slotElement.getAttribute('data-slot'))
        .filter((value): value is string => value !== null);
    });

    expect(orderedSlots).toEqual(['cardTitle', 'thumbnailOrIcon', 'cardSubtitle', 'tags']);
    await expect(emptyTagsCard.locator('[data-slot="tags"] .landing-grid-card-tag-item')).toHaveCount(0);

    const minHeight = await emptyTagsCard
      .locator('[data-slot="tags"]')
      .evaluate((element) => getComputedStyle(element).getPropertyValue('min-height').trim());
    expect(minHeight).toBe('28px');

    const thumbnailRatio = await emptyTagsCard
      .locator('[data-slot="thumbnailOrIcon"]')
      .evaluate((element) => element.clientWidth / Math.max(1, element.clientHeight));
    expect(thumbnailRatio).toBeGreaterThan(5.5);
    expect(thumbnailRatio).toBeLessThan(6.5);

    const unavailableCard = page.locator('[data-card-id="test-coming-soon-1"]');
    await expect(unavailableCard).toHaveAttribute('data-card-availability', 'unavailable');
    await expect(unavailableCard).toHaveAttribute('data-interaction-mode', 'hover');
    await expect(unavailableCard.locator('[data-slot="unavailableOverlay"]')).toHaveCount(1);
    await page.mouse.move(0, 0);
    await page.waitForTimeout(180);
    const overlay = unavailableCard.locator('[data-slot="unavailableOverlay"]');
    const defaultOpacity = parseFloat(
      await overlay.evaluate((element) => getComputedStyle(element).getPropertyValue('opacity').trim())
    );
    expect(defaultOpacity).toBeLessThanOrEqual(0.05);
    await unavailableCard.hover();
    await page.waitForTimeout(180);
    const hoveredOpacity = parseFloat(
      await overlay.evaluate((element) => getComputedStyle(element).getPropertyValue('opacity').trim())
    );
    expect(hoveredOpacity).toBeGreaterThanOrEqual(0.95);
    await expect(unavailableCard.locator('[data-slot="cardTitle"]')).toBeVisible();
  });

  test('@smoke unavailable overlay is always visible in tap mode', async ({page}) => {
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

    const unavailableCard = page.locator('[data-card-id="test-coming-soon-1"]');
    await expect(unavailableCard).toHaveAttribute('data-interaction-mode', 'tap');
    const overlay = unavailableCard.locator('[data-slot="unavailableOverlay"]');
    const opacity = parseFloat(
      await overlay.evaluate((element) => getComputedStyle(element).getPropertyValue('opacity').trim())
    );
    expect(opacity).toBeGreaterThanOrEqual(0.95);
  });

  test('@smoke assertion:B4-geometry-active-frame desktop expanded overlay keeps same-row non-target metrics frozen', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const shell = page.getByTestId('landing-grid-shell');
    const sourceCard = page.locator(`[data-card-id="${PRIMARY_AVAILABLE_TEST_CARD_ID}"]`);
    const siblingCard = page.locator('[data-card-id="test-rhythm-b"]');
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
  });

  test('@smoke assertion:B4-short-expanded desktop short expanded overlay stays content-fit without leaking the in-flow shell', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const sourceCard = page.locator(`[data-card-id="${PRIMARY_AVAILABLE_TEST_CARD_ID}"]`);
    const siblingCard = page.locator('[data-card-id="test-rhythm-b"]');
    const beforeSibling = await siblingCard.boundingBox();

    expect(beforeSibling).not.toBeNull();
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
    expect(afterSibling).not.toBeNull();
    expect(Math.abs((afterSibling?.y ?? 0) - (beforeSibling?.y ?? 0))).toBeLessThanOrEqual(1);
    expect(Math.abs((afterSibling?.height ?? 0) - (beforeSibling?.height ?? 0))).toBeLessThanOrEqual(1);
    expect(
      Math.abs((afterSibling?.y ?? 0) + (afterSibling?.height ?? 0) - ((beforeSibling?.y ?? 0) + (beforeSibling?.height ?? 0)))
    ).toBeLessThanOrEqual(1);
  });

  test('@smoke assertion:B13-hover-collapse desktop hover-out collapse stays independent and handoff remains available-only', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const firstCard = page.locator(`[data-card-id="${PRIMARY_AVAILABLE_TEST_CARD_ID}"]`);
    const secondCard = page.locator('[data-card-id="test-rhythm-b"]');
    const unavailableCard = page.locator('[data-card-id="test-coming-soon-1"]');

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
    await expect(firstCard).toHaveAttribute('data-desktop-motion-role', 'closing');
    await expect(firstCard).toHaveAttribute('data-desktop-shell-phase', 'closing');
    await expect(firstCard.locator('[data-slot="thumbnailOrIcon"]')).toHaveCount(0);
    await expect(firstCard.locator('[data-slot="expandedLayer"]')).toHaveCount(1);
    await expect(firstCard).toHaveAttribute('data-card-state', 'expanded');
    await expect(firstCard).toHaveAttribute('data-card-state', 'normal');
    await expect(firstCard).toHaveAttribute('data-desktop-shell-phase', 'idle');
    await expect(firstCard.locator('[data-slot="thumbnailOrIcon"]')).toHaveCount(1);
    await expect(firstCard.locator('[data-slot="expandedLayer"]')).toHaveCount(0);

    await unavailableCard.hover();
    await expect(unavailableCard).toHaveAttribute('data-card-state', 'normal');
    await expect
      .poll(async () =>
        parseFloat(
          await unavailableCard
            .locator('[data-slot="unavailableOverlay"]')
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
  });
});
