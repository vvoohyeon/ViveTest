export const appRoutes = {
  landing: '/',
  blog: '/blog',
  history: '/history'
};

export type AppRoute = (typeof appRoutes)[keyof typeof appRoutes];
export type LocalePrefix = 'en' | 'kr';
export type TestQuestionRoute = `/test/${string}/question`;

export function buildTestQuestionRoute(variant: string): TestQuestionRoute {
  return `/test/${variant}/question`;
}

export function buildBlogRouteWithSource(source: string): {
  pathname: typeof appRoutes.blog;
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

export function hasLocalePrefix(pathname: string): boolean {
  return /^\/(en|kr)(\/|$)/.test(pathname);
}
