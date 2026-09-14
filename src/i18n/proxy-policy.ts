import {
  hasDuplicateLocalePrefix,
  parseLocalePrefix,
  resolveLocaleFromCookieOrHeader,
  withLocalePrefix
} from '@/i18n/locale-resolution';
import {resolveLocaleAlias, type AppLocale} from '@/config/site';

const globalUnmatchedPath = '/_not-found';

const allowlistPattern = [/^\/blog\/?$/u, /^\/blog\/[^/]+\/?$/u, /^\/history\/?$/u, /^\/test\/[^/]+\/?$/u] as const;

function isLocaleLessAllowlistedPath(pathname: string): boolean {
  return allowlistPattern.some((pattern) => pattern.test(pathname));
}

function isAppOwnedPath(pathname: string): boolean {
  return pathname === '/' || isLocaleLessAllowlistedPath(pathname) || parseLocalePrefix(pathname) !== null;
}

/**
 * 첫 세그먼트가 locale 별칭이면 canonical 로 바꾼 경로를 돌려준다.
 *
 * canonical 자신은 `resolveLocaleAlias` 가 `null` 을 돌려주므로 여기서도 `null` 이 된다 —
 * 그러지 않으면 `/kr` 이 `/kr` 로 무한 redirect 한다.
 */
function resolveLocaleAliasRedirect(pathname: string): string | null {
  const [, firstSegment = '', ...rest] = pathname.split('/');

  if (firstSegment.length === 0) {
    return null;
  }

  const canonical = resolveLocaleAlias(firstSegment);

  if (canonical === null) {
    return null;
  }

  return ['', canonical, ...rest].join('/');
}

export type ProxyDecision =
  | {
      action: 'next';
      locale?: AppLocale;
    }
  | {
      action: 'redirect';
      pathname: string;
    }
  | {
      action: 'rewrite';
      pathname: string;
    };

export function resolveProxyDecision(input: {
  pathname: string;
  cookieLocale?: string | null;
  acceptLanguage?: string | null;
}): ProxyDecision {
  if (hasDuplicateLocalePrefix(input.pathname)) {
    return {
      action: 'rewrite',
      pathname: globalUnmatchedPath
    };
  }

  // 별칭 판정은 소유 판정 **앞**에 온다 — `/ko` 는 앱 소유 경로가 아니라서 여기를 지나면
  // 404 로 떨어진다. 그것이 종전의 결함이었다.
  const aliasRedirect = resolveLocaleAliasRedirect(input.pathname);

  if (aliasRedirect !== null) {
    return {
      action: 'redirect',
      pathname: aliasRedirect
    };
  }

  if (!isAppOwnedPath(input.pathname)) {
    return {
      action: 'rewrite',
      pathname: globalUnmatchedPath
    };
  }

  const localePrefix = parseLocalePrefix(input.pathname);

  if (localePrefix) {
    return {action: 'next', locale: localePrefix};
  }

  const locale = resolveLocaleFromCookieOrHeader({
    cookieLocale: input.cookieLocale,
    acceptLanguage: input.acceptLanguage
  });

  if (input.pathname === '/') {
    return {
      action: 'redirect',
      pathname: withLocalePrefix('/', locale)
    };
  }

  if (isLocaleLessAllowlistedPath(input.pathname)) {
    return {
      action: 'redirect',
      pathname: withLocalePrefix(input.pathname, locale)
    };
  }

  /* unreachable */ return {action: 'next'};
}
