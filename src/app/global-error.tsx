'use client';

import {APP_BODY_CLASSNAME} from '@/app/app-body-class';
import {defaultLocale, resolveHtmlLang} from '@/config/site';
import {
  buttonFormBaseClassName,
  buttonPrimaryClassName,
  buttonPrimaryLiftClassName
} from '@/features/ui/button-class-names';
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
 * 테마도 마찬가지로 부트스트랩이 돌지 않았으므로 라이트로 그려진다.
 */
export default function GlobalError({error, reset}: {error: Error & {digest?: string}; reset: () => void}) {
  // 화면에는 코드를 두지 않는다(voice 규칙). 운영자가 볼 자리는 콘솔이다 — 그리고 여기까지
  // 왔다면 그 콘솔이 무슨 일이 있었는지 아는 유일한 곳이다.
  console.error('Root layout render failed', {digest: error.digest, message: error.message});

  return (
    <html lang={resolveHtmlLang(defaultLocale)} data-theme="light">
      <body className={APP_BODY_CLASSNAME}>
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
