import {
  globalUnmatchedPath,
  hasDuplicateLocalePrefix,
  isAppOwnedPath,
  isBypassPath,
  isLocaleLessAllowlistedPath,
  parseLocalePrefix,
  resolveLocaleFromCookieOrHeader,
  withLocalePrefix
} from '@/i18n/locale-resolution';

export type ProxyDecision =
  | {
      action: 'next';
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
  if (isBypassPath(input.pathname)) {
    return {action: 'next'};
  }

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

  if (parseLocalePrefix(input.pathname)) {
    return {action: 'next'};
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

  return {action: 'next'};
}
