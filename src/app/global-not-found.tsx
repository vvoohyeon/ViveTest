import type {Metadata} from 'next';
import Link from 'next/link';

import {APP_BODY_CLASSNAME} from '@/app/app-body-class';
import {defaultLocale, resolveHtmlLang} from '@/config/site';
import {THEME_BOOTSTRAP_SOURCE} from '@/features/gnb/theme-bootstrap-source';
import {RecoverySurface, recoveryActionClassName} from '@/features/ui/recovery-surface';
import {RouteBuilder} from '@/lib/routes/route-builder';

import './globals.css';

// 이 라우트는 루트 레이아웃을 거치지 않고 제 `<html>`/`<body>` 를 직접 렌더한다. 그래서
// **스타일시트를 스스로 실어야 한다** — 종전에 그것이 없어 `document.styleSheets.length === 0`
// 이었고 이 파일이 적어 온 모든 Tailwind 클래스가 한 번도 적용된 적이 없었다(실측). 테마
// 부트스트랩은 이제 이 파일이 직접 싣는다(2026-09-19) — 종전에는 없어서 다크 사용자가 잘못된
// 주소를 열면 화면 전체가 라이트였다. 실측으로도 확인됐다: 부트스트랩이 없을 때 이 문서의
// light·dark 전체 스크린샷 해시가 **같았다**. 카피는 영어다 — 이 라우트는 locale 을 모른다.

// `global-not-found` 는 레이아웃을 거치지 않으므로 문서 제목도 여기서 낸다(Next 는 404 에 noindex 를 붙인다).
export const metadata: Metadata = {
  title: 'Page not found · ViveTest'
};

export default function GlobalNotFound() {
  return (
    <html data-theme="light" lang={resolveHtmlLang(defaultLocale)} suppressHydrationWarning>
      <body className={APP_BODY_CLASSNAME}>
        {/* 루트 레이아웃을 거치지 않는 문서라 테마 부트스트랩을 **스스로** 싣는다. 없으면 다크
            사용자가 라이트 화면을 보고, 하필 오류·404 라 가장 당황스러운 순간에 그렇게 된다.
            레이아웃과 같은 인라인 동기 스크립트여야 첫 페인트 전에 돈다(별도 요청이면 실측
            Fast 4G 1,343ms · Slow 4G 5,483ms 동안 어긋난 화면이 보인다). */}
        <script dangerouslySetInnerHTML={{__html: THEME_BOOTSTRAP_SOURCE}} />
        <RecoverySurface
          testId="global-not-found"
          title="That page is not here"
          body="The address may have changed, or the test may have been retired."
          actions={
            <Link className={recoveryActionClassName} href={{pathname: RouteBuilder.landing().pathname}}>
              Return home
            </Link>
          }
        />
      </body>
    </html>
  );
}
