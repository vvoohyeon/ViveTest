import {expect, test} from '@playwright/test';

function hasHydrationWarning(text: string): boolean {
  return /hydration|did not match|server html|client html|hydrating/u.test(text);
}

test.describe('Phase 1 routing smoke', () => {
  test('@smoke assertion:B2-locale-prefix root + allowlist redirect keeps single locale prefix', async ({page}) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/(en|kr)$/u);
    expect(new URL(page.url()).pathname).not.toMatch(/^\/(en|kr)\/(en|kr)(\/|$)/u);

    await page.goto('/blog');
    await expect(page).toHaveURL(/\/(en|kr)\/blog$/u);
    expect(new URL(page.url()).pathname).not.toMatch(/^\/(en|kr)\/(en|kr)(\/|$)/u);

    await page.goto('/history');
    await expect(page).toHaveURL(/\/(en|kr)\/history$/u);
    expect(new URL(page.url()).pathname).not.toMatch(/^\/(en|kr)\/(en|kr)(\/|$)/u);
  });

  test('@smoke non-allowlisted and duplicate locale paths resolve to global 404', async ({page}) => {
    const unmatchedResponse = await page.goto('/foo');
    expect(unmatchedResponse?.status()).toBe(404);
    await expect(page.getByRole('heading', {name: 'Global Not Found'})).toBeVisible();

    const duplicateLocaleResponse = await page.goto('/en/en/blog');
    expect(duplicateLocaleResponse?.status()).toBe(404);
    await expect(page.getByRole('heading', {name: 'Global Not Found'})).toBeVisible();
  });

  test('@smoke segment-local domain errors resolve to segment not-found', async ({page}) => {
    const response = await page.goto('/en/test/INVALID!/question');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', {name: 'Segment Not Found'})).toBeVisible();
  });

  test('@smoke assertion:B1-hydration hydration warnings remain zero on core localized routes', async ({page}) => {
    const hydrationWarnings: string[] = [];
    page.on('console', (message) => {
      const text = message.text();
      if (hasHydrationWarning(text)) {
        hydrationWarnings.push(text);
      }
    });

    await page.goto('/en');
    await page.goto('/en/blog');
    await page.goto('/en/history');

    expect(hydrationWarnings).toEqual([]);
  });
});
