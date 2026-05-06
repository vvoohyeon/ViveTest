import {defaultLocale, isLocale, type AppLocale} from '@/config/site';

export const REQUEST_LOCALE_HEADER_NAME = 'X-NEXT-INTL-LOCALE';

export function resolveRequestLocaleHeaderValue(value: string | null | undefined): AppLocale {
  if (value && isLocale(value)) {
    return value;
  }

  return defaultLocale;
}

export function resolveRequestLocaleFromHeaderBag(headers: Pick<Headers, 'get'>): AppLocale {
  return resolveRequestLocaleHeaderValue(headers.get(REQUEST_LOCALE_HEADER_NAME));
}
