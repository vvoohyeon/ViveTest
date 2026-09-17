import type {Metadata} from 'next';
import Link from 'next/link';

import {APP_BODY_CLASSNAME} from '@/app/app-body-class';
import {defaultLocale} from '@/config/site';
import {RecoverySurface, recoveryActionClassName} from '@/features/ui/recovery-surface';
import {RouteBuilder} from '@/lib/routes/route-builder';

import './globals.css';

// 이 라우트는 루트 레이아웃을 거치지 않고 제 `<html>`/`<body>` 를 직접 렌더한다. 그래서
// **스타일시트를 스스로 실어야 한다** — 종전에 그것이 없어 `document.styleSheets.length === 0`
// 이었고 이 파일이 적어 온 모든 Tailwind 클래스가 한 번도 적용된 적이 없었다(실측). 테마
// 부트스트랩도 없어 항상 라이트로 그려지며, 그것은 라우팅/부트스트랩 문제라 열린 채로 둔다.
// 카피는 영어다 — 이 라우트는 locale 을 모른다.

// `global-not-found` 는 레이아웃을 거치지 않으므로 문서 제목도 여기서 낸다(Next 는 404 에 noindex 를 붙인다).
export const metadata: Metadata = {
  title: 'Page not found · ViveTest'
};

export default function GlobalNotFound() {
  return (
    <html lang={defaultLocale}>
      <body className={APP_BODY_CLASSNAME}>
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
