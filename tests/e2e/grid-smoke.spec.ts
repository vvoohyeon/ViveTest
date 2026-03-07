import {expect, test} from '@playwright/test';

test.describe('Phase 4 grid smoke', () => {
  test('@smoke assertion:B12-underfilled-last-row desktop wide row rules and underfilled final row contract', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const shell = page.getByTestId('landing-grid-shell');
    await expect(shell).toHaveAttribute('data-grid-tier', 'desktop');
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
    await expect(row2).toHaveAttribute('data-card-count', '2');
    await expect(row2).toHaveAttribute('data-underfilled', 'true');

    const row0Cards = row0.getByTestId('landing-grid-card');
    const row1Cards = row1.getByTestId('landing-grid-card');
    const row2Cards = row2.getByTestId('landing-grid-card');

    await expect(row0Cards).toHaveCount(3);
    await expect(row1Cards).toHaveCount(4);
    await expect(row2Cards).toHaveCount(2);

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
    await expect(shell).toHaveAttribute('data-row1-columns', '2');
    await expect(shell).toHaveAttribute('data-rown-columns', '2');

    await expect(page.getByTestId('landing-grid-row-0')).toHaveAttribute('data-card-count', '2');
    await expect(page.getByTestId('landing-grid-row-1')).toHaveAttribute('data-card-count', '2');
  });

  test('@smoke tablet wide uses hero=2 and main=3', async ({page}) => {
    await page.setViewportSize({width: 1023, height: 980});
    await page.goto('/en');

    const shell = page.getByTestId('landing-grid-shell');
    await expect(shell).toHaveAttribute('data-grid-tier', 'tablet');
    await expect(shell).toHaveAttribute('data-row1-columns', '2');
    await expect(shell).toHaveAttribute('data-rown-columns', '3');

    await expect(page.getByTestId('landing-grid-row-0')).toHaveAttribute('data-card-count', '2');
    await expect(page.getByTestId('landing-grid-row-1')).toHaveAttribute('data-card-count', '3');
  });

  test('@smoke tablet narrow uses hero=2 and main=2', async ({page}) => {
    await page.setViewportSize({width: 900, height: 980});
    await page.goto('/en');

    const shell = page.getByTestId('landing-grid-shell');
    await expect(shell).toHaveAttribute('data-grid-tier', 'tablet');
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
    await expect(shell).toHaveAttribute('data-row1-columns', '1');
    await expect(shell).toHaveAttribute('data-rown-columns', '1');

    await expect(page.getByTestId('landing-grid-row-0')).toHaveAttribute('data-columns', '1');
    await expect(page.getByTestId('landing-grid-row-1')).toHaveAttribute('data-columns', '1');
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

    const shortCard = page.locator('[data-card-id="test-rhythm-a"]');
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

  test('@smoke assertion:B10-spacing-model base-gap and comp-gap follow row-local compensation rule for row1 and row2+', async ({page}) => {
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

    const emptyTagsCard = page.locator('[data-card-id="test-debug-sample"]');
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
    const sourceCard = page.locator('[data-card-id="test-rhythm-a"]');
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

  test('@smoke assertion:B13-hover-collapse desktop hover-out collapse stays independent and handoff remains available-only', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const firstCard = page.locator('[data-card-id="test-rhythm-a"]');
    const secondCard = page.locator('[data-card-id="test-rhythm-b"]');
    const unavailableCard = page.locator('[data-card-id="test-coming-soon-1"]');

    await firstCard.hover();
    await expect(firstCard).toHaveAttribute('data-card-state', 'expanded');

    await page.mouse.move(8, 8);
    await expect(firstCard).toHaveAttribute('data-card-state', 'normal');

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
    await expect(secondCard).toHaveAttribute('data-desktop-motion-role', 'handoff-target');
    await expect(secondCard).toHaveAttribute('data-card-state', 'expanded');
  });
});
