import {defaultLocale, isLocale, locales, type AppLocale} from '@/config/site';

const allowlistPattern = [/^\/blog\/?$/u, /^\/blog\/[^/]+\/?$/u, /^\/history\/?$/u, /^\/test\/[^/]+\/?$/u] as const;
export const globalUnmatchedPath = '/_not-found';

function matchesLocaleFamily(token: string, family: string): boolean {
  return token === family || token.startsWith(`${family}-`);
}

function normalizeLocaleToken(token: string): AppLocale | null {
  const lowered = token.toLowerCase();

  if (isLocale(lowered)) {
    return lowered;
  }

  if (lowered === 'ko' || lowered.startsWith('ko-')) {
    return 'kr';
  }

  if (lowered === 'en' || lowered.startsWith('en-')) {
    return 'en';
  }

  if (lowered === 'ja' || lowered.startsWith('ja-')) {
    return 'ja';
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

  if (matchesLocaleFamily(lowered, 'es')) {
    return 'es';
  }

  if (matchesLocaleFamily(lowered, 'fr')) {
    return 'fr';
  }

  if (matchesLocaleFamily(lowered, 'pt')) {
    return 'pt';
  }

  if (matchesLocaleFamily(lowered, 'de')) {
    return 'de';
  }

  if (matchesLocaleFamily(lowered, 'hi')) {
    return 'hi';
  }

  if (matchesLocaleFamily(lowered, 'id')) {
    return 'id';
  }

  if (matchesLocaleFamily(lowered, 'ru')) {
    return 'ru';
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
  const segments = pathname.replace(/^\/+|\/+$/gu, '').split('/').filter(Boolean);

  if (segments.length < 2) {
    return false;
  }

  return isLocale(segments[0]) && isLocale(segments[1]);
}

export function isLocaleLessAllowlistedPath(pathname: string): boolean {
  return allowlistPattern.some((pattern) => pattern.test(pathname));
}

// locale-less redirect 허용 목록만 앱 소유 경로로 보고, 그 외 경로는 global unmatched 404로 보낸다.
export function isAppOwnedPath(pathname: string): boolean {
  return pathname === '/' || isLocaleLessAllowlistedPath(pathname) || parseLocalePrefix(pathname) !== null;
}

export function withLocalePrefix(pathname: string, locale: AppLocale): string {
  const normalizedPath = pathname === '/' ? '' : pathname;
  return `/${locale}${normalizedPath}`;
}

export function isBypassPath(pathname: string): boolean {
  if (
    pathname.startsWith('/_next') ||
    pathname === globalUnmatchedPath ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_vercel') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  ) {
    return true;
  }

  return /\.[a-zA-Z0-9]+$/u.test(pathname);
}

export {defaultLocale, locales};
