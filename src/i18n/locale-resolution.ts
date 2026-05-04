import {defaultLocale, isLocale, locales, type AppLocale} from '@/config/site';

function matchesLocaleFamily(token: string, family: string): boolean {
  return token === family || token.startsWith(`${family}-`);
}

// BCP 47 primary language subtag -> AppLocale.
// zh is handled by normalizeZhLocale because script/region subtags decide zs vs zt.
const LOCALE_FAMILY_MAP: Record<string, AppLocale> = {
  ko: 'kr',
  en: 'en',
  ja: 'ja',
  es: 'es',
  fr: 'fr',
  pt: 'pt',
  de: 'de',
  hi: 'hi',
  id: 'id',
  ru: 'ru'
};

function normalizeZhLocale(lowered: string): AppLocale | null {
  if (!lowered.startsWith('zh')) {
    return null;
  }

  if (
    lowered === 'zh-hant' ||
    lowered === 'zh-tw' ||
    lowered === 'zh-hk' ||
    lowered === 'zh-mo' ||
    lowered.startsWith('zh-hant-') ||
    lowered.startsWith('zh-tw-') ||
    lowered.startsWith('zh-hk-') ||
    lowered.startsWith('zh-mo-')
  ) {
    return 'zt';
  }

  if (
    lowered === 'zh' ||
    lowered === 'zh-hans' ||
    lowered === 'zh-cn' ||
    lowered === 'zh-sg' ||
    lowered.startsWith('zh-hans-') ||
    lowered.startsWith('zh-cn-') ||
    lowered.startsWith('zh-sg-') ||
    lowered.startsWith('zh-')
  ) {
    return 'zs';
  }

  return null;
}

function normalizeLocaleToken(token: string): AppLocale | null {
  const lowered = token.toLowerCase();

  if (isLocale(lowered)) {
    return lowered;
  }

  const zhResult = normalizeZhLocale(lowered);
  if (zhResult) {
    return zhResult;
  }

  for (const [family, locale] of Object.entries(LOCALE_FAMILY_MAP)) {
    if (matchesLocaleFamily(lowered, family)) {
      return locale;
    }
  }

  return null;
}

export function resolveLocaleFromCookieOrHeader(params: {
  cookieLocale?: string | null;
  acceptLanguage?: string | null;
}): AppLocale {
  const cookieResolved = params.cookieLocale ? normalizeLocaleToken(params.cookieLocale) : null;

  if (cookieResolved) {
    return cookieResolved;
  }

  const header = params.acceptLanguage ?? '';
  const candidates = header
    .split(',')
    .map((raw) => {
      const [languagePart, qualityPart] = raw.trim().split(';');
      const qualityToken = qualityPart?.trim().startsWith('q=') ? Number(qualityPart.slice(2)) : 1;

      return {
        language: languagePart.trim(),
        quality: Number.isFinite(qualityToken) ? qualityToken : 0
      };
    })
    .filter((candidate) => candidate.language.length > 0)
    .sort((a, b) => b.quality - a.quality);

  for (const candidate of candidates) {
    const normalized = normalizeLocaleToken(candidate.language);
    if (normalized) {
      return normalized;
    }
  }

  return defaultLocale;
}

export function parseLocalePrefix(pathname: string): AppLocale | null {
  const [first] = pathname.replace(/^\/+|\/+$/gu, '').split('/');
  if (!first) {
    return null;
  }

  return isLocale(first) ? first : null;
}

export function hasDuplicateLocalePrefix(pathname: string): boolean {
  const segments = pathname.replace(/^\/+|\/+$/gu, '').split('/');

  if (segments.length < 2) {
    return false;
  }

  return isLocale(segments[0]) && isLocale(segments[1]);
}

export function withLocalePrefix(pathname: string, locale: AppLocale): string {
  const normalizedPath = pathname === '/' ? '' : pathname;
  return `/${locale}${normalizedPath}`;
}

export {defaultLocale, locales};
