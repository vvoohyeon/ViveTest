import {describe, expect, it} from 'vitest';

import {
  hasDuplicateLocalePrefix,
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
        acceptLanguage: 'ja-JP,ja;q=0.9,en-US;q=0.8'
      })
    ).toBe('ja');

    expect(
      resolveLocaleFromCookieOrHeader({
        acceptLanguage: 'zh-CN,zh;q=0.9,en-US;q=0.8'
      })
    ).toBe('zs');

    expect(
      resolveLocaleFromCookieOrHeader({
        acceptLanguage: 'zh-TW,zh;q=0.9,en-US;q=0.8'
      })
    ).toBe('zt');

    expect(
      resolveLocaleFromCookieOrHeader({
        acceptLanguage: 'zh-Hant-HK,zh;q=0.9,en-US;q=0.8'
      })
    ).toBe('zt');

    expect(
      resolveLocaleFromCookieOrHeader({
        acceptLanguage: 'zh-Hans-CN,zh;q=0.9,en-US;q=0.8'
      })
    ).toBe('zs');

    expect(
      resolveLocaleFromCookieOrHeader({
        acceptLanguage: 'zh-HK,zh;q=0.9,en-US;q=0.8'
      })
    ).toBe('zt');

    expect(
      resolveLocaleFromCookieOrHeader({
        acceptLanguage: 'zh-SG,zh;q=0.9,en-US;q=0.8'
      })
    ).toBe('zs');

    expect(
      resolveLocaleFromCookieOrHeader({
        acceptLanguage: 'fr-FR,fr;q=0.9,de;q=0.8'
      })
    ).toBe('fr');

    expect(
      resolveLocaleFromCookieOrHeader({
        acceptLanguage: 'pt-BR,pt;q=0.9,en-US;q=0.8'
      })
    ).toBe('pt');

    expect(
      resolveLocaleFromCookieOrHeader({
        acceptLanguage: 'de-AT,de;q=0.9,en-US;q=0.8'
      })
    ).toBe('de');

    expect(
      resolveLocaleFromCookieOrHeader({
        acceptLanguage: 'id-ID,id;q=0.9,en-US;q=0.8'
      })
    ).toBe('id');

    expect(
      resolveLocaleFromCookieOrHeader({
        acceptLanguage: 'ru-RU,ru;q=0.9,en-US;q=0.8'
      })
    ).toBe('ru');

    expect(
      resolveLocaleFromCookieOrHeader({
        acceptLanguage: 'it-IT,it;q=0.9'
      })
    ).toBe('en');
  });

  it('detects locale prefixes and duplicates correctly', () => {
    expect(parseLocalePrefix('/en/blog')).toBe('en');
    expect(parseLocalePrefix('/kr')).toBe('kr');
    expect(parseLocalePrefix('/zs')).toBe('zs');
    expect(parseLocalePrefix('/zt/blog')).toBe('zt');
    expect(parseLocalePrefix('/zt/blog/ops-handbook')).toBe('zt');
    expect(parseLocalePrefix('/ja/history')).toBe('ja');
    expect(parseLocalePrefix('/ru/history')).toBe('ru');
    expect(parseLocalePrefix('/blog')).toBeNull();
    expect(hasDuplicateLocalePrefix('/en/en/blog')).toBe(true);
    expect(hasDuplicateLocalePrefix('/ja/ja/blog')).toBe(true);
    expect(hasDuplicateLocalePrefix('/zs/zt/blog')).toBe(true);
    expect(hasDuplicateLocalePrefix('/en/blog')).toBe(false);
  });

  it('prefixes locale to locale-free paths', () => {
    expect(withLocalePrefix('/', 'en')).toBe('/en');
    expect(withLocalePrefix('/blog', 'kr')).toBe('/kr/blog');
    expect(withLocalePrefix('/blog/ops-handbook', 'kr')).toBe('/kr/blog/ops-handbook');
    expect(withLocalePrefix('/history', 'ja')).toBe('/ja/history');
    expect(withLocalePrefix('/history', 'ru')).toBe('/ru/history');
  });
});
