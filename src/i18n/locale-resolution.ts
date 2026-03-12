import {defaultLocale, isLocale, locales, type AppLocale} from '@/config/site';

const allowlistPattern = [/^\/blog\/?$/u, /^\/history\/?$/u, /^\/test\/[^/]+\/question\/?$/u] as const;
export const globalUnmatchedPath = '/_not-found';

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

// 프록시는 앱이 실제로 책임지는 경로에만 개입하고, 그 외 경로는 플랫폼/프레임워크 기본 처리에 맡긴다.
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
