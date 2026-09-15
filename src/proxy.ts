import type {NextRequest} from 'next/server';
import {NextResponse} from 'next/server';

import {localeCookieName} from '@/config/site';
import {resolveProxyDecision} from '@/i18n/proxy-policy';

export default function proxy(request: NextRequest) {
  const decision = resolveProxyDecision({
    pathname: request.nextUrl.pathname,
    cookieLocale: request.cookies.get(localeCookieName)?.value,
    acceptLanguage: request.headers.get('accept-language')
  });

  if (decision.action === 'next') {
    if (decision.locale) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('X-NEXT-INTL-LOCALE', decision.locale);
      return NextResponse.next({
        request: {
          headers: requestHeaders
        }
      });
    }

    return NextResponse.next();
  }

  if (decision.action === 'redirect') {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = decision.pathname;
    return NextResponse.redirect(redirectUrl);
  }

  if (decision.action === 'rewrite') {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = decision.pathname;
    rewriteUrl.search = '';
    return NextResponse.rewrite(rewriteUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Next는 matcher를 정적 리터럴로만 인식하므로 bypass 경계도 여기서 함께 고정한다.
  //
  // `apple-icon` 은 Next 가 `src/app/apple-icon.tsx` 로 만드는 **점 없는** 라우트라 아래의
  // `.*\..*` 배제에 걸리지 않는다. 그대로 두면 locale 해석기가 앱 소유 경로가 아니라고 보고
  // `/_not-found` 로 rewrite 해 iOS 홈 화면 아이콘이 404 가 된다(실측 2026-09-16). 같은
  // 성질의 루트 자산인 `favicon.ico`·`robots.txt`·`sitemap.xml` 과 같은 칸이다 — locale 을
  // 갖지 않고 기계가 읽는다. OG 그림은 `[locale]/opengraph-image` 라 locale 접두가 있고
  // 이 배제가 필요 없다.
  matcher: ['/((?!_next|api|_vercel|_not-found|favicon.ico|robots.txt|sitemap.xml|apple-icon|.*\\..*).*)']
};
