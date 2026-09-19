'use client';

import {APP_BODY_CLASSNAME} from '@/app/app-body-class';
import {defaultLocale, resolveHtmlLang} from '@/config/site';
import {
  buttonFormBaseClassName,
  buttonPrimaryClassName,
  buttonPrimaryLiftClassName
} from '@/features/ui/button-class-names';
import {THEME_BOOTSTRAP_SOURCE} from '@/features/gnb/theme-bootstrap-source';
import {RecoverySurface} from '@/features/ui/recovery-surface';

import './globals.css';

/**
 * 루트 레이아웃까지 무너졌을 때의 마지막 그물.
 *
 * 이 파일은 제 `<html>`/`<body>` 를 직접 렌더한다 — 레이아웃을 거치지 않으므로 **스타일시트도
 * 스스로 실어야 한다.** `global-not-found.tsx` 가 같은 자리에서 그것을 놓쳐 모든 Tailwind
 * 클래스가 한 번도 적용되지 않은 적이 있다(실측: `document.styleSheets.length === 0`). 그래서
 * 위의 import 가 주석보다 먼저 온다.
 *
 * 번역하지 않는다. `NextIntlClientProvider` 는 `[locale]` 레이아웃 안에 있고, 여기 도달했다는
 * 것은 그 레이아웃이 서지 못했다는 뜻이다 — 없는 것을 부르는 대신 영어 한 벌로 말한다.
 * **테마는 다르다 — 부트스트랩을 이 파일이 직접 싣는다**(2026-09-19). 번역은 없는 provider 를
 * 부를 수 없어 포기하는 것이지만, 테마 부트스트랩은 저장소 한 줄과 OS 질의뿐이라 레이아웃이
 * 무너져도 돈다. 크래시 화면이 하필 가장 당황스러운 순간에 라이트로 번쩍일 이유가 없다.
 *
 * (그 한 줄의 철자를 여기 적지 않는다 — `check-phase1-contracts.mjs` 가 `src/app` 안의 저장소
 * API 철자를 금지하고, 부트스트랩 원문이 경계 **밖**에 사는 이유가 그것이다. 주석도 같은 훑기에
 * 걸린다.)
 */
export default function GlobalError({error, reset}: {error: Error & {digest?: string}; reset: () => void}) {
  // 화면에는 코드를 두지 않는다(voice 규칙). 운영자가 볼 자리는 콘솔이다 — 그리고 여기까지
  // 왔다면 그 콘솔이 무슨 일이 있었는지 아는 유일한 곳이다.
  console.error('Root layout render failed', {digest: error.digest, message: error.message});

  return (
    <html lang={resolveHtmlLang(defaultLocale)} data-theme="light" suppressHydrationWarning>
      <body className={APP_BODY_CLASSNAME}>
        {/* 루트 레이아웃을 거치지 않는 문서라 테마 부트스트랩을 **스스로** 싣는다. 없으면 다크
            사용자가 라이트 화면을 보고, 하필 오류·404 라 가장 당황스러운 순간에 그렇게 된다.
            레이아웃과 같은 인라인 동기 스크립트여야 첫 페인트 전에 돈다(별도 요청이면 실측
            Fast 4G 1,343ms · Slow 4G 5,483ms 동안 어긋난 화면이 보인다). */}
        <script dangerouslySetInnerHTML={{__html: THEME_BOOTSTRAP_SOURCE}} />
        <RecoverySurface
          testId="global-error-boundary"
          title="This screen did not render"
          body="Something broke while drawing this page. Trying again usually works."
          actions={
            <button
              type="button"
              className={`${buttonFormBaseClassName} ${buttonPrimaryClassName} ${buttonPrimaryLiftClassName}`}
              onClick={reset}
              data-testid="global-error-retry"
            >
              Try again
            </button>
          }
        />
      </body>
    </html>
  );
}
