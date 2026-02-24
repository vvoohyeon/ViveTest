import type {Route} from 'next';

export const appRoutes = {
  landing: '/' as Route,
  blog: '/blog' as Route,
  history: '/history' as Route
};

export type SupportedLocale = 'en' | 'kr';

export function buildTestQuestionRoute(variant: string): Route {
  return `/test/${variant}/question` as Route;
}

export function buildBlogRouteWithSource(source: string): {
  pathname: Route;
  query: Record<string, string>;
} {
  return {
    pathname: appRoutes.blog,
    query: {source}
  };
}

export function hasDuplicateLocaleSegment(pathname: string): boolean {
  return /\/(en|kr)\/\1(\/|$)/.test(pathname);
}

export function withLocalePrefix(locale: SupportedLocale, pathname: string): string {
  if (pathname === '/') {
    return `/${locale}`;
  }

  return `/${locale}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}
