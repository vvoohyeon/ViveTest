import {describe, expect, it} from 'vitest';

import {
  hasDuplicateLocalePrefix,
  isAppOwnedPath,
  isBypassPath,
  isLocaleLessAllowlistedPath,
  parseLocalePrefix,
  resolveLocaleFromCookieOrHeader,
  withLocalePrefix
} from '../../src/i18n/locale-resolution';

describe('locale resolution helpers', () => {
  it('prefers cookie locale over accept-language', () => {
    expect(
      resolveLocaleFromCookieOrHeader({
        cookieLocale: 'kr',
        acceptLanguage: 'en-US,en;q=0.8'
      })
    ).toBe('kr');
  });

  it('maps accept-language to supported locales and falls back to default', () => {
    expect(
      resolveLocaleFromCookieOrHeader({
        acceptLanguage: 'ko-KR,ko;q=0.9,en-US;q=0.8'
      })
    ).toBe('kr');

    expect(
      resolveLocaleFromCookieOrHeader({
        acceptLanguage: 'fr-FR,fr;q=0.9,de;q=0.8'
      })
    ).toBe('en');
  });

  it('detects locale prefixes and duplicates correctly', () => {
    expect(parseLocalePrefix('/en/blog')).toBe('en');
    expect(parseLocalePrefix('/kr')).toBe('kr');
    expect(parseLocalePrefix('/blog')).toBeNull();
    expect(hasDuplicateLocalePrefix('/en/en/blog')).toBe(true);
    expect(hasDuplicateLocalePrefix('/en/blog')).toBe(false);
  });

  it('handles allowlisted locale-less paths and bypass paths', () => {
    expect(isLocaleLessAllowlistedPath('/blog')).toBe(true);
    expect(isLocaleLessAllowlistedPath('/history')).toBe(true);
    expect(isLocaleLessAllowlistedPath('/test/alpha/question')).toBe(true);
    expect(isLocaleLessAllowlistedPath('/foo')).toBe(false);

    expect(isAppOwnedPath('/')).toBe(true);
    expect(isAppOwnedPath('/en/blog')).toBe(true);
    expect(isAppOwnedPath('/test/alpha/question')).toBe(true);
    expect(isAppOwnedPath('/foo')).toBe(false);
    expect(isAppOwnedPath('/va-123/view')).toBe(false);

    expect(isBypassPath('/_next/static/chunk.js')).toBe(true);
    expect(isBypassPath('/api/hello')).toBe(true);
    expect(isBypassPath('/favicon.ico')).toBe(true);
    expect(isBypassPath('/blog')).toBe(false);
  });

  it('prefixes locale to locale-free paths', () => {
    expect(withLocalePrefix('/', 'en')).toBe('/en');
    expect(withLocalePrefix('/blog', 'kr')).toBe('/kr/blog');
  });
});
