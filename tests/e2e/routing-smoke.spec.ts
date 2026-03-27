import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';

import {expect, test} from '@playwright/test';

import {localeOptions, locales} from '../../src/config/site';
import {PRIMARY_AVAILABLE_TEST_VARIANT} from './helpers/landing-fixture';

const PREVIEW_LOG_PATH = path.join(process.cwd(), '.next/qa/preview-smoke.log');
const PREVIEW_404_ALLOWLIST = /Error: Internal: NoFallbackError(?:\n\s+at .+)+/gu;
const isPreviewServerMode = process.env.PLAYWRIGHT_SERVER_MODE === 'preview';
const SUPPORTED_LOCALE_PATTERN = `(?:${locales.join('|')})`;
const DUPLICATE_LOCALE_PATTERN = new RegExp(`^/${SUPPORTED_LOCALE_PATTERN}/${SUPPORTED_LOCALE_PATTERN}(/|$)`, 'u');

function hasHydrationWarning(text: string): boolean {
  return /hydration|did not match|server html|client html|hydrating/u.test(text);
}

function readPreviewLog(): string {
  if (!existsSync(PREVIEW_LOG_PATH)) {
    return '';
  }

  return readFileSync(PREVIEW_LOG_PATH, 'utf8');
}

function readPreviewLogDelta(before: string): string {
  const after = readPreviewLog();
  return after.startsWith(before) ? after.slice(before.length) : after;
}

function collectUnexpectedPreviewErrors(log: string): string[] {
  return log
    .replace(PREVIEW_404_ALLOWLIST, '')
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(
      (line) =>
        /^(Error:|TypeError:|ReferenceError:|Unhandled|⨯|error - )/u.test(line) &&
        !/^Error: Internal: NoFallbackError$/u.test(line)
    );
}

test.describe('Phase 1 routing smoke', () => {
  test('@smoke assertion:B2-locale-prefix root + allowlist redirect keeps single locale prefix', async ({page}) => {
    await page.goto('/');
    await expect(page).toHaveURL(new RegExp(`/${SUPPORTED_LOCALE_PATTERN}$`, 'u'));
    expect(new URL(page.url()).pathname).not.toMatch(DUPLICATE_LOCALE_PATTERN);

    await page.goto('/blog');
    await expect(page).toHaveURL(new RegExp(`/${SUPPORTED_LOCALE_PATTERN}/blog$`, 'u'));
    expect(new URL(page.url()).pathname).not.toMatch(DUPLICATE_LOCALE_PATTERN);

    await page.goto('/history');
    await expect(page).toHaveURL(new RegExp(`/${SUPPORTED_LOCALE_PATTERN}/history$`, 'u'));
    expect(new URL(page.url()).pathname).not.toMatch(DUPLICATE_LOCALE_PATTERN);

    await page.goto(`/test/${PRIMARY_AVAILABLE_TEST_VARIANT}`);
    await expect(page).toHaveURL(new RegExp(`/${SUPPORTED_LOCALE_PATTERN}/test/${PRIMARY_AVAILABLE_TEST_VARIANT}$`, 'u'));
    expect(new URL(page.url()).pathname).not.toMatch(DUPLICATE_LOCALE_PATTERN);
  });

  test('@smoke non-allowlisted paths outside the route contract fall through to segment 404 while duplicate locale paths stay global 404', async ({
    page
  }) => {
    const previewLogBefore = readPreviewLog();
    const unmatchedResponse = await page.goto('/foo');
    expect(unmatchedResponse?.status()).toBe(404);
    await expect(page.getByRole('heading', {name: 'Segment Not Found'})).toBeVisible();

    const duplicateLocaleResponse = await page.goto('/ja/ja/blog');
    expect(duplicateLocaleResponse?.status()).toBe(404);
    await expect(page.getByRole('heading', {name: 'Global Not Found'})).toBeVisible();

    if (isPreviewServerMode) {
      await page.waitForTimeout(100);
      expect(collectUnexpectedPreviewErrors(readPreviewLogDelta(previewLogBefore))).toEqual([]);
    }
  });

  test('@smoke segment-local domain errors resolve to segment not-found', async ({page}) => {
    const response = await page.goto('/en/test/INVALID!');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', {name: 'Segment Not Found'})).toBeVisible();
  });

  test('@smoke localized SSR responses emit locale-specific html lang and client locale navigation preserves it', async ({
    page,
    request
  }) => {
    const localizedResponses = [
      {pathname: '/en', locale: 'en'},
      {pathname: '/kr', locale: 'kr'},
      {pathname: '/zs', locale: 'zs'},
      {pathname: '/zt/blog', locale: 'zt'},
      {pathname: '/ja', locale: 'ja'},
      {pathname: '/ru/blog', locale: 'ru'}
    ] as const;

    for (const {pathname, locale} of localizedResponses) {
      const response = await request.get(pathname);
      expect(response.ok()).toBe(true);

      const html = await response.text();
      expect(html).toMatch(new RegExp(`<html[^>]*lang="${locale}"`, 'u'));
    }

    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    await page.getByTestId('gnb-settings-trigger').hover();
    await expect(page.getByTestId('gnb-settings-panel')).toBeVisible();
    await page
      .getByTestId('desktop-gnb-locale-controls')
      .getByRole('button', {name: localeOptions.find(({code}) => code === 'ru')?.label ?? 'Русский'})
      .click();

    await expect(page).toHaveURL(/\/ru$/u);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  });

  test('@smoke assertion:B1-hydration hydration warnings remain zero on core localized routes', async ({page}) => {
    const hydrationWarnings: string[] = [];
    const previewLogBefore = readPreviewLog();
    page.on('console', (message) => {
      const text = message.text();
      if (hasHydrationWarning(text)) {
        hydrationWarnings.push(text);
      }
    });

    await page.goto('/en');
    await page.goto('/en/blog');
    await page.goto('/en/history');
    await page.waitForTimeout(100);

    expect(hydrationWarnings).toEqual([]);

    if (isPreviewServerMode) {
      expect(existsSync(PREVIEW_LOG_PATH)).toBe(true);
      expect(
        readPreviewLogDelta(previewLogBefore)
          .split(/\r?\n/u)
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .filter(hasHydrationWarning)
      ).toEqual([]);
    }
  });
});
