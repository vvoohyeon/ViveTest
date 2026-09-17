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
      pathname: '/blog/[variant]';
      params: {
        variant: string;
      };
    }
  | {
      pathname: '/history';
      params?: undefined;
    }
  | {
      pathname: '/result/[variant]/[type]';
      params: {
        variant: string;
        type: string;
      };
    }
  | {
      pathname: '/test/[variant]';
      params: {
        variant: string;
      };
    }
  | {
      pathname: '/test/error';
      params?: undefined;
    };

type LandingRoute = {pathname: '/'; params?: undefined};
type BlogRoute = {pathname: '/blog'; params?: undefined};
type BlogArticleRoute = {
  pathname: '/blog/[variant]';
  params: {
    variant: string;
  };
};
type HistoryRoute = {pathname: '/history'; params?: undefined};
/**
 * 결과 화면의 주소 — `req-test.md` §5.1.
 *
 * 그 절의 `/result/{variant}/{type}` 은 **locale-free 표기**이고 실제 URL 은
 * `/{locale}/result/...` 다. payload 는 경로가 아니라 키 없는 query string 이 나르므로 이
 * 타입에 들어오지 않는다 — 여기 있는 것은 경로가 소유하는 두 조각뿐이다.
 */
type ResultRoute = {
  pathname: '/result/[variant]/[type]';
  params: {
    variant: string;
    type: string;
  };
};
type QuestionRoute = {
  pathname: '/test/[variant]';
  params: {
    variant: string;
  };
};
type TestErrorRoute = {pathname: '/test/error'; params?: undefined};

export const RouteBuilder = {
  landing(): LandingRoute {
    return {pathname: '/'};
  },
  blog(): BlogRoute {
    return {pathname: '/blog'};
  },
  blogArticle(variant: string): BlogArticleRoute {
    return {
      pathname: '/blog/[variant]',
      params: {variant}
    };
  },
  history(): HistoryRoute {
    return {pathname: '/history'};
  },
  result(variant: string, type: string): ResultRoute {
    return {
      pathname: '/result/[variant]/[type]',
      params: {variant, type}
    };
  },
  question(variant: string): QuestionRoute {
    return {
      pathname: '/test/[variant]',
      params: {variant}
    };
  },
  testError(): TestErrorRoute {
    return {pathname: '/test/error'};
  }
};

export function buildLocaleFreePath(route: LocaleFreeRoute): string {
  if (route.pathname === '/blog/[variant]') {
    return `/blog/${route.params.variant}`;
  }

  if (route.pathname === '/result/[variant]/[type]') {
    return `/result/${route.params.variant}/${route.params.type}`;
  }

  if (route.pathname === '/test/[variant]') {
    return `/test/${route.params.variant}`;
  }

  return route.pathname;
}
