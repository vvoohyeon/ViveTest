export type LocaleFreeRoute =
  | {
      pathname: '/';
      params?: undefined;
    }
  | {
      pathname: '/blog';
      params?: undefined;
    }
  | {
      pathname: '/history';
      params?: undefined;
    }
  | {
      pathname: '/test/[variant]/question';
      params: {
        variant: string;
      };
    };

type LandingRoute = {pathname: '/'; params?: undefined};
type BlogRoute = {pathname: '/blog'; params?: undefined};
type HistoryRoute = {pathname: '/history'; params?: undefined};
type QuestionRoute = {
  pathname: '/test/[variant]/question';
  params: {
    variant: string;
  };
};

export const RouteBuilder = {
  landing(): LandingRoute {
    return {pathname: '/'};
  },
  blog(): BlogRoute {
    return {pathname: '/blog'};
  },
  history(): HistoryRoute {
    return {pathname: '/history'};
  },
  question(variant: string): QuestionRoute {
    return {
      pathname: '/test/[variant]/question',
      params: {variant}
    };
  }
};

export function buildLocaleFreePath(route: LocaleFreeRoute): string {
  if (route.pathname === '/test/[variant]/question') {
    return `/test/${route.params.variant}/question`;
  }

  return route.pathname;
}
