import {describe, expect, it} from 'vitest';

import {
  REQUEST_LOCALE_HEADER_NAME,
  resolveRequestLocaleFromHeaderBag,
  resolveRequestLocaleHeaderValue
} from '../../src/i18n/request-locale-header';

describe('request locale header contract', () => {
  it('uses the expected request header name', () => {
    expect(REQUEST_LOCALE_HEADER_NAME).toBe('X-NEXT-INTL-LOCALE');
  });

  it('falls back to the default locale for missing or invalid header values', () => {
    expect(resolveRequestLocaleHeaderValue('en')).toBe('en');
    expect(resolveRequestLocaleHeaderValue('kr')).toBe('kr');
    expect(resolveRequestLocaleHeaderValue('zs')).toBe('zs');
    expect(resolveRequestLocaleHeaderValue('zt')).toBe('zt');
    expect(resolveRequestLocaleHeaderValue('ja')).toBe('ja');
    expect(resolveRequestLocaleHeaderValue('ru')).toBe('ru');
    expect(resolveRequestLocaleHeaderValue('ko')).toBe('en');
    expect(resolveRequestLocaleHeaderValue(undefined)).toBe('en');
  });

  it('resolves the locale from a server header bag', () => {
    expect(
      resolveRequestLocaleFromHeaderBag({
        get(name) {
          return name === REQUEST_LOCALE_HEADER_NAME ? 'kr' : null;
        }
      })
    ).toBe('kr');
  });
});
