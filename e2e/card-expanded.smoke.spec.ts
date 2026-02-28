import {expect, test} from '@playwright/test';
import {expectBodyScrollLock} from './helpers';

test.describe('Card interaction and mobile expanded smoke @smoke', () => {
  test('mobile full-bleed expanded keeps in-flow position and allows inner scroll', async ({page}) => {
    await page.setViewportSize({width: 390, height: 260});
    await page.goto('/en');
    const candidates = [
      'Speed vs Depth: Choosing the Right Tempo',
      'Feedback Patterns That Keep Momentum',
      'Vibe Core Compass'
    ];
    let scrollContainerConfigured = false;

    for (const title of candidates) {
      const card = page.locator('article').filter({hasText: title}).first();
      await card.scrollIntoViewIfNeeded();
      await expect(card).toBeVisible();
      const beforeScrollY = await page.evaluate(() => window.scrollY);

      await card.click();

      const expandedCard = page.locator('[role="button"][aria-expanded="true"]').first();
      await expect(expandedCard).toBeVisible();

      const expandedBox = await expandedCard.boundingBox();
      expect(expandedBox).not.toBeNull();
      const afterScrollY = await page.evaluate(() => window.scrollY);

      if (expandedBox) {
        expect(Math.abs(afterScrollY - beforeScrollY)).toBeLessThan(3);
        expect(Math.floor(expandedBox.width)).toBeGreaterThanOrEqual(388);
      }

      const expandedBody = expandedCard.locator('[aria-hidden="false"]').first();
      await expect(expandedBody).toBeVisible();
      await page.waitForTimeout(260);

      const innerScrollState = await expandedBody.evaluate((node) => {
        const element = node as HTMLElement;
        const style = window.getComputedStyle(element);
        return {
          scrollHeight: element.scrollHeight,
          clientHeight: element.clientHeight,
          overflowY: style.overflowY,
          transitionTimingFunction: style.transitionTimingFunction
        };
      });

      await expectBodyScrollLock(page, true);
      expect(['auto', 'scroll']).toContain(innerScrollState.overflowY);
      expect(innerScrollState.transitionTimingFunction).toContain('ease-in-out');
      scrollContainerConfigured = true;

      if (innerScrollState.scrollHeight > innerScrollState.clientHeight + 1) {
        const scrolledTop = await expandedBody.evaluate((node) => {
          const element = node as HTMLElement;
          element.scrollTop = element.scrollHeight;
          return element.scrollTop;
        });

        expect(scrolledTop).toBeGreaterThan(0);
      }

      await page.getByRole('button', {name: 'Close', exact: true}).click();
      await page.waitForTimeout(260);
      await expect(page.locator('[role="button"][aria-expanded="true"]')).toHaveCount(0);
    }

    expect(scrollContainerConfigured).toBeTruthy();
    await expectBodyScrollLock(page, false);
  });

  test('desktop hover-capable mode expands on hover', async ({page}) => {
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en?__e2e_mode=hover');

    const testCard = page.locator('article').filter({hasText: 'Vibe Core Compass'}).first();
    const belowRowCard = page.locator('article').filter({hasText: 'Speed vs Depth: Choosing the Right Tempo'}).first();
    await expect(testCard).toBeVisible();
    await expect(belowRowCard).toBeVisible();

    const beforeBelowTop = await belowRowCard.evaluate((node) => (node as HTMLElement).offsetTop);
    await testCard.hover();
    await page.waitForTimeout(320);

    const shellTransition = await testCard.locator('[role="button"]').first().evaluate((node) => {
      const style = window.getComputedStyle(node as HTMLElement);
      return {
        duration: style.transitionDuration,
        timing: style.transitionTimingFunction
      };
    });
    const afterBelowTop = await belowRowCard.evaluate((node) => (node as HTMLElement).offsetTop);

    expect(shellTransition.duration.includes('0.28s') || shellTransition.duration.includes('280ms')).toBeTruthy();
    expect(shellTransition.timing).toContain('ease-in-out');
    expect(afterBelowTop - beforeBelowTop).toBe(0);

    await expect(
      page.getByRole('button', {name: 'Find one person and start a direct conversation.', exact: true})
    ).toBeVisible();
  });

  test('desktop non-hover fallback uses tap expansion', async ({page}) => {
    await page.setViewportSize({width: 1024, height: 900});
    await page.goto('/en?__e2e_mode=tap');

    const testCard = page.locator('article').filter({hasText: 'Vibe Core Compass'}).first();
    await expect(testCard).toBeVisible();

    await testCard.click();
    await expect(
      page.getByRole('button', {name: 'Find one person and start a direct conversation.', exact: true})
    ).toBeVisible();
  });

  test('desktop hover handoff expands only the last hovered card (1024/1280)', async ({page}) => {
    for (const width of [1024, 1280]) {
      await page.setViewportSize({width, height: 900});
      await page.goto('/en?__e2e_mode=hover');

      const firstHoverCard = page.locator('article').filter({hasText: 'Story Wave Navigator'}).first();
      const lastHoverCard = page
        .locator('article')
        .filter({hasText: 'Speed vs Depth: Choosing the Right Tempo'})
        .first();

      await firstHoverCard.scrollIntoViewIfNeeded();
      await lastHoverCard.scrollIntoViewIfNeeded();
      await expect(firstHoverCard).toBeVisible();
      await expect(lastHoverCard).toBeVisible();

      await firstHoverCard.hover();
      await page.waitForTimeout(30);
      await lastHoverCard.hover();
      await page.waitForTimeout(340);

      await expect(page.locator('[role="button"][aria-expanded="true"]')).toHaveCount(1);
      await expect(firstHoverCard.locator('[role="button"][aria-expanded="true"]')).toHaveCount(0);
      await expect(lastHoverCard.locator('[role="button"][aria-expanded="true"]')).toHaveCount(1);
    }
  });
});
