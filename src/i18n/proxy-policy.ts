import {
  hasDuplicateLocalePrefix,
  parseLocalePrefix,
  resolveLocaleFromCookieOrHeader,
  withLocalePrefix
} from '@/i18n/locale-resolution';
import {type AppLocale} from '@/config/site';

const globalUnmatchedPath = '/_not-found';

const allowlistPattern = [/^\/blog\/?$/u, /^\/blog\/[^/]+\/?$/u, /^\/history\/?$/u, /^\/test\/[^/]+\/?$/u] as const;

function isLocaleLessAllowlistedPath(pathname: string): boolean {
  return allowlistPattern.some((pattern) => pattern.test(pathname));
}

function isAppOwnedPath(pathname: string): boolean {
  return pathname === '/' || isLocaleLessAllowlistedPath(pathname) || parseLocalePrefix(pathname) !== null;
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
