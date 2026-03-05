import type {AppLocale} from '@/config/site';
import {withLocalePrefix} from '@/i18n/locale-resolution';
import {buildLocaleFreePath, type LocaleFreeRoute} from '@/lib/routes/route-builder';

type LocaleFreePathname = LocaleFreeRoute['pathname'];

type LocalizedRoutePathFor<Pathname extends LocaleFreePathname> = Pathname extends '/'
  ? `/${AppLocale}`
  : Pathname extends '/test/[variant]/question'
    ? `/${AppLocale}/test/${string}/question`
    : `/${AppLocale}${Pathname}`;

export type LocalizedRoutePath = LocalizedRoutePathFor<LocaleFreePathname>;

export function buildLocalizedPath<Route extends LocaleFreeRoute>(
  route: Route,
  locale: AppLocale
): LocalizedRoutePathFor<Route['pathname']> {
  return withLocalePrefix(buildLocaleFreePath(route), locale) as LocalizedRoutePathFor<Route['pathname']>;
}
