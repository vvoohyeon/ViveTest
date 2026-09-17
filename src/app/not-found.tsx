import Link from 'next/link';

import {RecoverySurface, recoveryActionClassName} from '@/features/ui/recovery-surface';
import {RouteBuilder} from '@/lib/routes/route-builder';

// **오늘 이 파일에 도달하는 요청은 없다. 그래도 지우지 않는다 — 아래가 그 이유다.**
//
// `not-found` 와 `global-not-found` 는 한쪽이 다른 쪽을 대체하는 관계가 아니다. 앞의 것은
// 세그먼트 안에서 `notFound()` 가 던져졌을 때의 경계이고, 뒤의 것은 **어디에도 맞지 않는 주소**를
// 라우팅 층에서 받는다. 그래서 `experimental.globalNotFound` 가 켜져 있어도 이 파일의 자리는
// 남아 있다.
//
// 도달하지 못하는 이유는 대체됐기 때문이 아니라 **조건이 성립할 수 없기 때문**이다. `src/app`
// 안의 `notFound()` 여덟 자리는 전부 `!isLocale(locale)` 하나를 조건으로 갖는데,
// `[locale]/layout.tsx` 의 `dynamicParams = false` 가 모르는 locale 을 페이지 함수가 돌기 전에
// 라우팅 층에서 404 로 끊는다. 실측(2026-09-17, 프리뷰 빌드): `/zz` · `/zz/blog` · `/zz/history` ·
// `/zz/test/qmbti` · `/zz/test/error` · `/zz/result/qmbti/a` · `/en/no-such-route` ·
// `/no-such-root-route` 여덟 주소가 전부 404 + `global-not-found` 이고, 모르는 variant 두 개는
// 404 가 아니라 307 로 복구 경로에 간다(`req-test.md` §6.1).
//
// 지우지 않는 이유는 셋이다. ⑴ 계약이 이 경로를 세그먼트 404 표면으로 지목한다 —
// `req-landing.md` · `project-analysis.md` · `AGENTS.md` §1 — 그리고
// `tests/unit/contract-citations.test.ts` 가 그 인용을 검사하므로 파일을 지우면 붉어진다(실측).
// ⑵ `docs/plans/` 의 살아 있는 항목 둘이 이 파일을 대상으로 한다 —
// `2026-09-11-mobile-refactor-analysis.md` 의 #7 `segment-404-has-no-server-rendered-body` 와
// 같은 묶음 scorecard 의 #4(시각 baseline 픽셀 0 장). 지우면 열린 작업의 대상이 사라진다.
// ⑶ 앞으로 `[locale]` 밖에 세그먼트가 생기면 그때는 이것이 유일한 경계다.
//
// **다만 지금 도달하더라도 서버에서는 그려지지 않는다.** 가드 하나를 강제로 성립시켜 재 보면
// (2026-09-17) 응답은 404 `<html id="__next_error__">` 이고 `<body>` 의 보이는 글자는 **0 자**다 —
// 아래 마크업은 하이드레이션 뒤에야 나타난다. 그것이 #7 이 고치려는 결함이고 이 파일의 결함이
// 아니므로, 여기서는 고치지 않고 적어만 둔다(L51 도 같은 것을 말한다).
//
// **#7 은 그 처방이 아니라 우회로 닫혔고, 이제 두 검사가 그 우회를 유지한다**(2026-09-17).
// `[locale]` 안에 `not-found.tsx` 를 두는 처방은 2026-09-16 에 실측으로 기각됐다 — 어디에 두든
// 본문은 비어 나간다. 대신 도달 가능한 404 를 `[locale]` 밖으로 옮겼고, 그 상태가 유지되는지를
// ⑴ `tests/unit/segment-404-unreachability.test.ts` 가 **조건으로** 묻고(모든 `notFound()` 가
// `!isLocale(<param>)` 뒤에 있고 `dynamicParams = false` 가 그 조건을 성립 불가로 만드는가)
// ⑵ `assertion:NF-01` 이 **스크립트를 끈 채로** 잰다(도달 가능한 404 네 갈래가 서버에서 제목과
// 탈출 링크를 내는가). 종전에 #7 이 지목한 게이트 맹점 — 세그먼트 404 검사가 JS 켜진 페이지에서
// 하이드레이션 뒤만 본다 — 이 그 둘째가 메운 자리다.
//
// 이 라우트는 `PageShell` 밖에서 렌더되므로 GNB 도 동의 배너도 없고 돌아갈 길은 이 링크 하나뿐이다
// — 그래서 링크가 실제 버튼 무게를 받는다. 카피는 README 의 voice 규칙(무엇이 일어났는지 한 줄 ·
// 행동 하나 · 사과도 오류 코드도 없이)을 따른 영어다. 로케일 레이아웃 밖이라 번역되지 않는다.
export default function NotFound() {
  return (
    <RecoverySurface
      testId="segment-not-found"
      title="That page is not here"
      body="This address is valid, but nothing lives at it any more."
      actions={
        <Link className={recoveryActionClassName} href={{pathname: RouteBuilder.landing().pathname}}>
          Return home
        </Link>
      }
    />
  );
}
