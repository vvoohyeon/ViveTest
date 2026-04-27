import type {NextRequest} from 'next/server';
import {NextResponse} from 'next/server';

import {localeCookieName} from '@/config/site';
import {getRequestLocaleHeaderValueFromPathname, REQUEST_LOCALE_HEADER_NAME} from '@/i18n/request-locale-header';
import {resolveProxyDecision} from '@/i18n/proxy-policy';

export default function proxy(request: NextRequest) {
  const decision = resolveProxyDecision({
    pathname: request.nextUrl.pathname,
    cookieLocale: request.cookies.get(localeCookieName)?.value,
    acceptLanguage: request.headers.get('accept-language')
  });

  if (decision.action === 'next') {
    const localeHeaderValue = getRequestLocaleHeaderValueFromPathname(request.nextUrl.pathname);

    if (localeHeaderValue) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set(REQUEST_LOCALE_HEADER_NAME, localeHeaderValue);
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
  matcher: ['/((?!_next|api|_vercel|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)']
};
