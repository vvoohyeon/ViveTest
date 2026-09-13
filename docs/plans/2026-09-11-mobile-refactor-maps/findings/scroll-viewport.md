# 렌즈: scroll-viewport — 스크롤 깊이 · 뷰포트 단위 · safe-area · 주소창 높이 변동

**측정 대상:** `/Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis` (세션 전용 clone, `7616211` = 지시된 `a5aec95` 위의 empty marker commit). 읽기 전용 — `git status --porcelain` 빈 출력으로 저장소 무변경 확인. 쓰기는 scratchpad 안에서만 했다.

**방법 세 가지.** ⑴ 소스 전수 읽기와 grep. ⑵ **Tailwind v4.1.0 컴파일 프로브** — `node_modules/tailwindcss/dist/lib.mjs` 의 `compile()` 을 직접 호출해 `min-h-screen`/`h-screen` 이 실제로 무엇을 emit 하는지와, 같은 원소에 올라탄 경쟁 유틸리티의 **emit 순서 승자**를 확정했다(프로브: `scratchpad/tw-vh-probe.mjs` · `scratchpad/tw-drawer-probe.mjs`). ⑶ **추적 중인 baseline PNG 40 장의 픽셀 실측** — 모바일 baseline 은 `page.locator('.page-shell')` 의 원소 스크린샷이므로(`tests/e2e/theme-matrix-smoke.spec.ts:197`) 그 높이가 곧 셸의 렌더 높이다. 색·좌표는 PIL 로 직접 읽었다.

**브라우저를 띄우지 않았고 실기기도 쓰지 않았다.** clone 에 `.next/` 를 만들지 않기 위해 빌드·dev 서버 모두 돌리지 않았다. 아래에서 실기기 거동에 의존하는 판정은 전부 「미확인」으로 표시했다.

---

## 0. 표면별 스크롤 비용 — 추정이 아니라 실측이다

baseline PNG 의 높이는 `.page-shell` 의 실제 렌더 높이다(390×844 뷰포트, consent 는 `OPTED_IN` 으로 심어져 배너와 spacer 가 둘 다 없는 상태 — `theme-matrix-smoke.spec.ts:171`).

| 표면 | `.page-shell` 높이 @390 | 화면 수(÷844) | 출처 |
|:---|---:|---:|:---|
| landing (en) | 2,958 | 3.50 | `theme-layout-landing-normal-en-*-mobile.png` |
| landing (kr) | 2,856 | 3.38 | `theme-layout-landing-normal-kr-*-mobile.png` |
| landing (en) + 동의 배너 | **3,173** | **3.76** | 과제 실측치. baseline 과의 차 = **+215px** |
| landing (en), 카드 확장 | 2,988 | 3.54 | `theme-state-mobile-landing-test-expanded-en-*.png` (normal 대비 **+30px**) |
| blog 색인 | 844 | 1.00 | baseline |
| history | 844 | 1.00 | baseline |
| test instruction | 844 | 1.00 | baseline |
| test question | 844 | 1.00 | baseline |
| test result | 844 | 1.00 | baseline |
| blog 상세 | — | **미측정** | baseline 0 장 (§F14) |
| /test/error · /404 · global 404 | — | **미측정** | baseline 0 장 |

이 표에서 읽어야 할 것은 두 가지다. 첫째, **랜딩만 길고 나머지는 전부 정확히 844 = 한 화면이다.** 844 는 우연이 아니라 `min-h-screen`(=`100vh`)이 내용보다 짧은 문서를 정확히 한 화면으로 밀어 올린 값이다 — 즉 비-랜딩 표면들의 진짜 내용 높이는 844 **미만**이고, baseline 은 그 값을 알려 주지 않는다. 둘째, **동의 배너가 랜딩에 215px(0.25 화면)을 더하는데 164 장 어느 baseline 도 그 상태를 고정하지 않는다.**

카드 확장이 문서에 더하는 것은 30px 뿐이다. 픽셀 실측으로 확장 카드의 세로 범위는 `y 315–599`, 즉 **285px** 이다(접힌 카드 255px + 30). 이 수는 §F7 에서 `calc(100dvh - 116px)` 상한(844 기준 728px)이 **오늘은 443px 의 여유를 두고 한 번도 걸리지 않는다**는 판정의 근거다.

---

## 1. 뷰포트 단위 전수 — 그리고 그중 무엇이 죽어 있는가

Tailwind v4.1.0 컴파일 프로브 결과: `min-h-screen → min-height:100vh` · `h-screen → height:100vh` · `max-h-screen → max-height:100vh`. **v4 는 `screen` 을 `dvh` 로 매핑하지 않는다**(별도로 `h-dvh`/`min-h-dvh` 가 있다). 따라서 아래 `screen` 계열 5 곳은 전부 `100vh` = iOS 의 **large viewport**(주소창 접힌 상태의 높이)다.

| # | 위치 | 선언 | 실효 |
|---:|:---|:---|:---|
| 1 | `src/app/app-body-class.ts:19` | `min-h-screen` | `min-height:100vh` |
| 2 | `src/features/landing/shell/page-shell.tsx:19` | `min-h-screen` | `min-height:100vh` |
| 3 | `src/app/not-found.tsx:11` | `grid min-h-screen place-items-center` | `min-height:100vh` |
| 4 | `src/app/global-not-found.tsx:18` | `grid min-h-screen place-items-center` | `min-height:100vh` |
| 5 | `src/features/gnb/site-gnb.tsx:87` | `h-screen max-h-screen` **+** `[height:100dvh] [max-height:100dvh]` | **`100vh` 가 이긴다** (§F1) |

`100dvh` 는 4 곳에 적혀 있다 — `site-gnb.tsx:87`(2 선언, **죽었다**) · `landing-grid-card.tsx:285 · 292 · 296`(`max-h-[calc(100dvh-116px)]`). 즉 **제품에서 실제로 동적 뷰포트를 따라가는 선언은 랜딩 확장 카드의 세 줄뿐이고, 그 셋은 오늘 한 번도 걸리지 않는다**(§F7). `100vw` 는 6 곳 — `landing-grid-card.tsx:1042`(`w-screen`) · `:292` · `landing-grid-card.module.css:394 · 536 · 544`.

`svh`/`lvh` 는 저장소 전체에서 0 건이다.

---

## 2. sticky · fixed 전수

**sticky 는 2 곳뿐이다.** `site-gnb.tsx:38` (`sticky top-0 z-[1100]`, 모바일 `h-14`=56px / 데스크톱 `h-16`=64px) 과 `landing-grid-card.tsx:287` (확장 카드 헤더, `sticky top-0 z-[4]`). 후자는 **자기 카드의 `overflow-auto` 스크롤포트 안에서** sticky 다(`:285`) — 뷰포트가 아니다. 그래서 페이지를 스크롤하면 카드와 함께 헤더가, 그 안의 닫기 X 와 함께 화면 밖으로 나간다(§F6).

**fixed 는 6 곳이다.** `site-gnb.tsx:80`(드로어 레이어) · `landing-catalog-grid.tsx:31`(모바일 backdrop) · `landing-grid-card.tsx:292`(transient shell) · `consent-banner.tsx:21`(배너 레이어) · `instruction-overlay.tsx:145`(지시 다이얼로그) · `transition-gnb-overlay.tsx:14`(전환 유령 GNB). 이 중 **전면을 덮으면서 스크롤포트를 갖지 않는 것이 `instruction-overlay.tsx:145` 하나**다(§F5).

### 검증하고 기각한 가설 — 기록으로 남긴다

`landing-catalog-grid.module.css:26-29` 가 `.shell` 에 `container-type: inline-size` 를 걸고, 그것은 2026-09-11 커밋 `21e1de4`(모바일 하이드레이션 CLS)에서 들어왔다. 모바일 backdrop(2026-03-07, `1676796`)과 transient shell(2026-03-08, `ab5f4ba`)은 그보다 **6 개월 앞선다**. CSS Containment 규범상 layout containment 는 `position:fixed` 자손의 containing block 을 만들므로, 나중에 들어온 containment 가 앞서 있던 두 `fixed` 원소를 조용히 재부모화했을 것이라고 가설을 세웠다 — 그리고 그 가설은 **틀렸다.**

기각 근거는 `theme-state-mobile-landing-test-expanded-en-light-mobile` 픽셀 실측이다. 이 baseline 은 containment 커밋 **이후**에 찍혔다(`git merge-base --is-ancestor 21e1de4 <baseline commit>` = true, 15fd2fd). scrim 은 `x 0–389 · y 0–843`, 즉 **전체 폭 × 정확히 한 뷰포트**를 덮는다. 셸에 갇혔다면 `x 16–373` 이어야 한다. 게다가 GNB 영역(`y 0–56`)이 `(238,237,234)` 로 렌더되는데 이는 `0.88·(251,250,247) + 0.12·(145,142,140)` 과 정확히 일치한다 — `--gnb-surface = color-mix(in srgb, var(--canvas) 88%, transparent)`(`globals.css:266`) 뒤로 scrim 이 비친다는 뜻이고, GNB 는 `.shell` 바깥 원소이므로 scrim 은 뷰포트 기준이다. scrim 색 `(145,142,140)` 자체도 `#1e1a16` @48% over `#fbfaf7` 와 정확히 일치해 `--overlay-scrim-medium` 임이 확인된다.

**그러므로 containment 재부모화는 결함이 아니다.** 이 문단을 남기는 이유는 다음 세션이 같은 규범 조항을 읽고 같은 가설을 다시 세울 것이기 때문이다. 이미 기각됐다.

---

## 3. 결함

### F1 (blocker) — GNB 모바일 드로어는 `100dvh` 가 아니라 `100vh` 다. dvh 선언 두 줄은 emit 순서에 져서 죽어 있다

`site-gnb.tsx:87` 은 같은 문자열에 `h-screen max-h-screen` 과 `[height:100dvh] [max-height:100dvh]` 를 **둘 다** 싣는다. 명시도가 같으므로(둘 다 단일 클래스) 승자는 emit 순서가 정한다. 그 정확한 문자열을 Tailwind 4.1.0 에 넣어 컴파일한 결과 `@layer utilities` 안의 순서는 `[height:100dvh]` → `.h-screen`, `[max-height:100dvh]` → `.max-h-screen` 이다. **뒤에 오는 `.h-screen` / `.max-h-screen` 이 이긴다 → 패널은 `height: 100vh` 다.** 저장소는 이 함정을 이미 네 번 기록했다(`button-class-names.ts:16-17,48-50` · `settings-controls.tsx:24-28` · `globals.css:314-321,418-426`) — 여기서 다시 걸렸다.

iOS Safari 에서 `100vh` = large viewport(주소창 접힌 높이)이고 실제 가시 영역은 small viewport 다. 드로어 레이어(`site-gnb.tsx:80` `fixed inset-0`)는 UA 가 가시 영역에 맞춰 주지만, 그 안의 패널은 `height:100vh` 로 **명시적으로** 더 크게 잡힌다. 그리고 설정 블록은 `mt-auto` 로 패널 **바닥에 고정**돼 있다(`site-gnb.tsx:104` `gnb-mobile-settings mt-auto grid gap-3`).

baseline 픽셀 실측(en·kr 동일): 패널 `x 51–389 · y 0–843`(`w-[min(87vw,340px)]` = 339.3 ✓). 내용 밴드는 상단 그룹 `y 31–39`(MENU 라벨) · `91–103` · `138–154` · `187–202`(nav 3 개), 하단 그룹 `y 552–603`(테마 행) · `612–655` · `664–707` · `716–759` · **`768–811`(로케일 칩 4 번째 줄)**, 그 아래 32px 이 `pb-[calc(32px+env(TOKEN))]` 다.

따라서 large−small 델타가 **33px 을 넘는 순간 마지막 로케일 칩 줄이 잘리기 시작하고, 77px 을 넘으면 통째로 사라진다.** iPhone Safari 의 접히는 툴바 높이는 통상 그 범위를 넘는다(정확한 값 **미확인** — 실기기 필요).

그리고 **복구 경로가 없다.** ⑴ 패널의 `overflow-y-auto` 는 내용 높이 == 컨테이너 높이라 `scrollHeight == clientHeight` → 스크롤할 것이 없다. ⑵ 설령 있어도 `document.body.style.touchAction = 'none'`(`use-gnb-mobile-menu.ts:141`)이 조상 체인 교집합으로 자손 전부의 터치 팬을 막는다(§F2). ⑶ 패널 안에 닫기 버튼이 없고(`site-gnb.tsx:88-95` 가 그 보류를 명시), 햄버거는 패널이 덮는다(z 1200 > 1100). 남는 것은 왼쪽 51px 폭의 backdrop 스트립 탭뿐이다.

**결과: iOS Safari 에서 12 로케일 전환기의 마지막 줄에 손이 닿지 않는다.** 언어 선택은 기능이지 장식이 아니다.

**왜 게이트가 못 잡나:** Chromium 데스크톱에는 접히는 툴바가 없어 `vh == dvh` 다. `theme-state-mobile-*-menu-open` 12 장은 전부 초록으로 남는다.

**고침:** `site-gnb.tsx:87` 에서 `h-screen max-h-screen` 두 유틸리티를 **삭제**한다(이미 있는 dvh 쌍이 살아난다). 더 낫게는 `h-dvh max-h-dvh` 로 바꿔 경쟁 자체를 없앤다. 그리고 설정 블록을 `mt-auto` 고정에서 풀어 패널을 진짜 스크롤 영역으로 만든다.

### F2 (blocker) — 스크롤 잠금 두 벌이 `body{overflow:hidden; touch-action:none}` 이다. `touch-action` 은 정작 스크롤돼야 할 오버레이의 팬을 막고, 스크롤 위치는 저장도 복원도 되지 않는다

`use-mobile-scroll-lock.ts:17-25` 와 `use-gnb-mobile-menu.ts:137-147` 은 본문이 같다 — `body.style.overflow='hidden'` + `body.style.touchAction='none'`, cleanup 으로 원복. **둘 다 `window.scrollY` 를 읽지도 되돌리지도 않는다.**

`touch-action` 은 터치가 시작된 원소부터 조상 체인의 값을 교집합해 결정된다. `body` 에 `none` 을 걸면 body 의 모든 자손이 터치 팬을 잃는다. 잃는 대상이 정확히 이것들이다 — 드로어 패널의 `overflow-y-auto`(`site-gnb.tsx:87`), 랜딩 확장 카드 본문의 `overflow-auto`(`landing-grid-card.tsx:285`), 그리고 모바일 backdrop 의 `touch-pan-y`(`landing-catalog-grid.tsx:31`)까지. **스크롤을 막으려고 건 값이 스크롤돼야 하는 곳을 같이 막는다.**

iOS 의 body scroll lock 함정(`position:fixed; top:-scrollY` 로 잠그고 해제 시 `window.scrollTo(0, N)` 로 되돌리는 관용 패턴)은 **전혀 적용돼 있지 않다.** 저장소 전체에서 잠금 중 스크롤 위치를 보존하는 코드는 0 건이다. 랜딩 카드의 잠금은 `OPENING`/`CLOSING` 각 280ms 뿐이라 창이 짧지만, 드로어는 사용자가 닫을 때까지 무한정이다.

**고침:** 공용 `useBodyScrollLock` 하나로 합치고 ⑴ `window.scrollY` 를 기록 ⑵ `position:fixed; top:-Npx; left:0; right:0` (또는 `overflow:hidden` + `html{overscroll-behavior:none}`) ⑶ 해제 시 `window.scrollTo(0,N)` ⑷ **`body` 에 `touch-action` 을 절대 쓰지 않는다** — 대신 스크롤돼야 하는 오버레이에 `overscroll-behavior: contain` 을 건다.

### F3 (major) — `viewport-fit=cover` 가 없다. 따라서 `env(safe-area-inset-*)` 두 곳은 항상 0 이고, 지금까지 한 번도 동작한 적이 없다

`src/` 전체에 `export const viewport` 가 **0 건**이다(grep). Next 의 기본값은 `{width:'device-width', initialScale:1}` 이고 `viewportFit` 이 없다(`node_modules/next/dist/lib/metadata/default-metadata.js:23-30`), 그리고 Next 는 `viewport.viewportFit` 이 설정됐을 때만 `viewport-fit=` 을 emit 한다(`node_modules/next/dist/lib/metadata/metadata.js:237-238`). 즉 렌더되는 meta 는 `width=device-width, initial-scale=1` 이고 `viewport-fit` 은 UA 기본인 `auto` 다. **`viewport-fit=auto` 에서 iOS 는 `env(safe-area-inset-*)` 를 전부 0 으로 해석한다.**

저장소의 `env()` 참조는 정확히 2 곳이고 둘 다 bottom 이다 — `site-gnb.tsx:87` `pb-[calc(32px+env(safe-area-inset-bottom,0px))]` → 항상 32px, `consent-banner.tsx:21` `bottom-[max(16px,env(safe-area-inset-bottom))]` → 항상 16px. `top`/`left`/`right` 는 **0 건**이다.

`consent-banner.tsx:113-114` 의 주석은 「safe-area 가 있는 기기에서도 그대로 따라간다」고 적는다. meta 가 그 문장을 거짓으로 만든다. 이것이 이번 리팩터에서 위험한 이유는 **결정 5 가 바텀시트·sticky CTA 를 명시적으로 허용하기 때문**이다 — 바닥에 무엇을 붙이는 순간 홈 인디케이터 보정이 필요한데, 코드는 이미 보정하는 것처럼 생겼고 실제로는 하지 않는다.

`viewport-fit=auto` 자체는 지금 아무것도 가리지 않는다(UA 가 safe area 안에 레이아웃한다). 그래서 blocker 가 아니라 major 다. 다만 세로 노치·가로 모드에서 화면 끝까지 쓸 수 없고, 무엇보다 **보호하는 척하는 죽은 코드**가 남는다.

**고침:** `src/app/layout.tsx` 에 `export const viewport: Viewport = {width:'device-width', initialScale:1, viewportFit:'cover'}` 를 추가한다. 그 다음 실제 inset 을 넣는다 — `--shell-gutter` 에 `env(safe-area-inset-left/right)`, GNB 에 `env(safe-area-inset-top)`, `page-shell` 의 `pb-*` 와 바닥 고정 표면에 `env(safe-area-inset-bottom)`. 렌더된 meta 에 `viewport-fit=cover` 가 있는지 검사하는 단언을 함께 넣는다(현재 meta 를 검사하는 테스트는 0 건이다).

`src/app/global-not-found.tsx:37` 은 루트 레이아웃을 거치지 않고 제 `<html>` 을 직접 렌더한다(`<head>` 없음). 이 라우트가 Next 의 기본 viewport meta 를 실제로 받는지는 **미확인**이다 — 받지 못하면 iOS 가 980px 데스크톱 폭으로 렌더해 글자가 핀치 줌 없이는 읽히지 않는다. 빌드 없이는 판정할 수 없어 열어 둔다.

### F4 (major) — `min-h-screen`(=100vh)이 네 곳에 있어, 내용이 한 화면보다 짧은 표면이 iOS 에서 「보여 줄 것 없는 스크롤」을 갖고 404 두 장은 광학 중심에서 내려앉는다

`app-body-class.ts:19` · `page-shell.tsx:19` · `not-found.tsx:11` · `global-not-found.tsx:18` 넷 다 `min-h-screen` = `min-height:100vh`(컴파일 프로브로 확정).

§0 표가 보여 주듯 blog 색인·history·test instruction·test question·test result 다섯 표면의 `.page-shell` 은 **정확히 844** 다. 844 는 뷰포트 높이와 같으므로, 이 다섯은 내용이 한 화면보다 짧고 `min-h-screen` 이 정확히 한 화면으로 밀어 올린 것이다. iOS 에서 `100vh` = large viewport > 가시 영역이므로 **다섯 표면 모두 툴바 높이만큼 스크롤되고 그 스크롤에는 아무것도 없다.**

404 두 장은 `grid min-h-screen place-items-center` 라 패널을 **large viewport 기준으로** 가운데 정렬한다. 주소창이 보이는 동안 패널은 광학 중심보다 (large−small)/2 만큼 내려간다.

**고침:** 네 곳 전부 `min-h-screen` → `min-h-dvh`. 「최소한 이만큼은 반드시 보인다」를 원하는 자리라면 `100svh` 를 쓴다. Chromium 게이트에서는 `vh == dvh` 라 **baseline 이 한 장도 움직이지 않는다.**

### F5 (major) — 지시 다이얼로그는 스크롤포트 없는 전면 fixed 레이어다. 뷰포트보다 긴 지시문에는 손이 닿지 않는다

`instruction-overlay.tsx:145` 는 `fixed inset-0 z-[1050] grid place-items-center p-6 max-[767px]:p-0` 이고 `overflow-*` 도 `overscroll-behavior` 도 `max-height` 도 없다. 카드(`:26`)는 `max-[767px]:min-h-full ... max-[767px]:pt-[88px]` — `min-height` 이므로 내용이 길면 **컨테이너를 넘어 자란다**. 그런데 컨테이너가 `position: fixed` 라 문서 스크롤로는 그 아래에 닿을 수 없다.

지시문 길이는 제품이 정하지 않는다 — `req-test.md:115` 가 `instruction_*` 컬럼의 정본을 Sheets 에 둔다. 현재 fixture 는 한국어 40~50 자(`source-fixture.ts:29-32`)라 재현되지 않고, 그래서 baseline(390×844, 내용 235px)도 초록이다. 재현 조건은 셋이다 — 긴 실데이터 지시문, 가로 모드(가시 높이 390 에 `pt-[88px]` 이 그대로), 200% 글자 확대(WCAG 1.4.4).

같은 앱의 GNB 드로어는 같은 전면 레이어인데 `overflow-y-auto` · `overscroll-contain` · 높이 상한을 전부 갖는다(`site-gnb.tsx:87`). **두 전면 레이어가 정반대로 구현돼 있다.**

**고침:** 오버레이에 `overflow-y:auto; overscroll-behavior:contain` 을, 카드에 `max-height:100dvh` 를 준다(또는 카드 자체를 스크롤포트로 만든다). F3 이 착지하면 바닥에 `env(safe-area-inset-bottom)` 을 더한다. 긴 지시문 fixture 로 320×568 또는 가로 모드 E2E 케이스를 추가한다.

### F6 (major) — 랜딩 OPEN 은 scrim 이 뷰포트 고정인데 페이지 스크롤이 풀려 있어, 스크롤하면 카드도 유일한 가시 닫기 컨트롤도 화면 밖으로 나간 채 전면이 어두운 화면만 남는다

픽셀 실측: scrim 은 `x 0–389 · y 0–843`, 즉 **정확히 한 뷰포트**를 덮고 GNB 뒤까지 들어간다. 확장 카드는 `y 315–599`(285px)이고 문서 흐름에 있다(`landing-grid-card.tsx:1042` `rounded-none w-screen min-h-0 mx-[calc(50%-50vw)]`, `data-expanded-layer="mobile-in-flow"`).

스크롤 잠금은 `OPENING`/`CLOSING` 에만 걸린다(`use-mobile-scroll-lock.ts:5-7`) — 계약이 그렇게 요구한다(`req-landing.md:640-641`). 그래서 OPEN 상태에서 사용자가 스크롤하면 **카드는 움직이고 scrim 은 안 움직인다.** 3.5 화면짜리 랜딩에서 한 화면만 내려가면 카드는 위로 사라지고, 화면 전체가 scrim 으로 덮인 채 흐릿한 카드들만 보인다.

닫기 X 는 카드 헤더 안에 있고(`landing-grid-card.tsx:1237-1245`) 그 헤더는 `sticky top-0` 인데 **sticky 문맥이 뷰포트가 아니라 카드 자신의 `overflow-auto` 스크롤포트**다(`:287` + `:285`). 카드가 화면 밖으로 나가면 X 도 같이 나간다. 남는 닫기 경로는 backdrop 탭 하나이고, 계약은 그 둘만 허용한다(`req-landing.md:632`). 즉 기능적으로는 복구되지만 **상태가 고장 난 것으로 읽힌다.**

**고침:** 둘 중 하나를 고른다. ⑴ OPEN 전체 구간으로 잠금을 확장해(`shouldLockMobilePageScroll` 에 `'OPEN'` 추가) 정직한 모달로 만들고 `req-landing.md:640-641` 을 함께 개정한다. ⑵ scrim + in-flow 확장을 버리고 자기 스크롤포트와 `overscroll-behavior: contain` 을 갖는 바텀시트로 교체하고, 헤더를 시트 상단에 고정한다. 결정 5 아래에서는 ⑵ 가 낫다 — 복원할 기하 자체가 사라진다.

### F7 (major) — `calc(100dvh - 116px)` 의 116 은 출처 없는 매직 넘버이고 세 곳에 복제돼 있다. 그리고 in-flow 원소의 max-height 에 `dvh` 를 쓴 것은 주소창이 움직일 때마다 문서를 reflow 시킨다

`landing-grid-card.tsx:285 · 292 · 296`. `grep -rn '116' src/` 는 이 세 줄만 낸다 — 토큰도 상수도 주석도 없다. `docs/req-landing.md`·`docs/design/design.md` 에도 대응 조항이 없다. git 으로 추적하면 Tailwind 이전 `globals.css`(`7ed26b1`)에 이미 주석 없이 있었다. 모바일 GNB 는 56px 이므로 나머지 60 이 설명되지 않는다.

같은 「바 아래 공간」을 저장소는 **네 개의 리터럴**로 적는다 — `page-shell.tsx:22` 의 `pt-20`(80) 과 `md:pt-[88px]`(88), `instruction-overlay.tsx:26` 의 `max-[767px]:pt-[88px]`(모바일 분기에 **데스크톱 값 88**, 모바일 바는 56), 그리고 여기 116. 넷 중 어느 것도 다른 것에서 유도되지 않는다. 가로 방향에서는 같은 실패가 이미 일어났고 `--shell-gutter` 토큰으로 고쳐졌으며, 그 실패의 실측 기록이 `globals.css:306-322` 에 남아 있다(「두 표면은 4px 어긋난 채 렌더됐다」). **세로는 아직 고쳐지지 않았다.**

`dvh` 쪽은 오늘 잠복이다 — 확장 카드 실측 285px 대 상한 728px(844 기준)로 443px 여유가 있다. 걸리는 조건은 둘이다. 가로 모드(가시 높이 390 → 상한 274px < 285px, **지금 걸린다**)와 200% 글자 확대. 걸리는 순간 in-flow 원소의 높이가 `dvh` 를 따라가므로 **주소창 애니메이션마다 그 아래 카드 전부가 움직인다.**

**고침:** `--shell-bar-offset` 같은 세로 토큰을 하나 만들어 `calc(<GNB 높이> + <main 상단 패딩>)` 로 한 번 정의하고 116·80·88·88 을 전부 그것으로 바꾼다(`--shell-gutter` 와 같은 패턴, 같은 이유). 상한은 `max-height: calc(100svh - var(--shell-bar-offset))` 로 바꿔 툴바 애니메이션을 따라가지 않게 한다 — `svh` 는 고정된 작은 뷰포트다. 시트 재설계(F6 ⑵)가 들어오면 상한 자체가 사라진다.

### F8 (major) — `scroll-padding-top`/`scroll-margin-top` 이 저장소 전체에 0 건인데 GNB 는 56/64px sticky 다 — WCAG 2.4.11 Focus Not Obscured (Minimum, AA)

`grep -rn "scroll-margin|scroll-padding|scroll-mt|scroll-pt" src/ public/` → **0 건**. GNB 는 `sticky top-0 z-[1100]`(`site-gnb.tsx:38`), 모바일 `h-14`=56px · 데스크톱 `h-16`=64px(`:40-41`). 바는 투명하지 않다 — `--gnb-surface` 는 canvas 88% 이고 `backdrop-filter: blur(12px)` 가 걸려 있다.

3.5 화면짜리 랜딩에서 Tab 으로 카드를 훑으면 브라우저는 포커스 원소를 뷰포트 가장자리에 맞춰 스크롤하는데, 그 가장자리가 바 아래다. 스크린리더의 스와이프 이동도 같다.

**고침:** `globals.css` 의 `@layer base` 에 한 줄 — `html { scroll-padding-top: calc(var(--shell-bar-offset) + 8px) }`. F7 이 만드는 토큰을 그대로 쓴다. axe 에는 2.4.11 규칙이 없으므로(`tests/e2e/helpers/axe.ts`) Tab 뒤 포커스 원소의 `rect.top ≥ GNB rect.bottom` 을 검사하는 전용 단언을 더한다.

### F9 (major) — `overscroll-behavior` 가 6 개 오버레이/스크롤 표면 중 2 곳에만 있고 문서에는 없다. pull-to-refresh 가 진행 중인 테스트 회차 위에서도 살아 있다

`grep -rn overscroll src/` → 정확히 2 건, `site-gnb.tsx:87`(드로어 패널)과 `landing-grid-card.tsx:285`(확장 카드 본문). **없는 곳:** `instruction-overlay.tsx:145`(테스트 진입을 막는 전면 모달) · `landing-catalog-grid.tsx:31`(모바일 backdrop) · `site-gnb.tsx:80`(드로어 레이어) · `page-shell.tsx:19` 와 `app-body-class.ts:19`(문서 — `globals.css` 와 `app-body-class.ts` 에 `overflow`·`overscroll` 선언이 각각 0 건).

Android Chrome 에서 스크롤 최상단 과다 당김은 pull-to-refresh 를 띄운다. 테스트 라우트에서 그것은 진행 중인 회차의 새로고침이다. `useBeforeUnloadGuard`(`use-before-unload-guard.ts`)는 그것을 막는 게 아니라 네이티브 확인창으로 바꿀 뿐이고, iOS Safari 는 그 프롬프트를 무시하는 경우가 많다.

**고침:** `globals.css` `@layer base` 에 `html { overscroll-behavior-y: contain }`, 그리고 `instruction-overlay.tsx:145` 와 이번 리팩터가 만들 모든 시트에 `overscroll-behavior: contain`.

### F10 (major) — 랜딩 스크롤 복원은 문서가 아직 자라는 중에 한 번 쏘고 마는 clamp 다

`landing-runtime.tsx:52-64` 는 `[pathname]` 하나에 걸린 `useEffect` 로, `document.documentElement.scrollHeight - window.innerHeight` 로 clamp 한 뒤 pending 레코드를 즉시 null 로 만든다. 재시도가 없다.

그 뒤에 도착하는 높이 증가가 최소 두 가지다. ⑴ 동의 배너 spacer 는 `SSR_BANNER_SPACER_ESTIMATE_PX = 120`(`consent-banner.tsx:18`)으로 시작해 passive effect 에서 실측으로 교체된다(`:101, :117-120`). 모바일에서는 배너가 세로로 접히므로(`:241 max-[719px]:flex-wrap`) 실측값이 훨씬 크다 — §0 에서 잰 차가 **215px** 이다. ⑵ Pretendard Variable 은 1.96MB 에 `font-display: swap` 이고 preload 가 없다(`globals.css:31-37` + 22-29 주석) — 폰트가 바뀌면 텍스트 높이가 바뀐다.

따라서 테스트·블로그에서 랜딩으로 돌아올 때 복원은 최대 그 증가분만큼 **짧게 착지한다.** 랜딩 하단에서 떠났을수록 오차가 크다.

**고침:** clamp 하고 버리는 대신 도달할 때까지 다시 적용한다 — `.page-shell` 의 ResizeObserver 또는 짧은 rAF 루프(저장소가 이미 `use-mobile-restore-polling.ts` 에서 쓰는 패턴)와 `document.fonts.ready` 에 다시 건다. 또는 배너 높이를 브레이크포인트별 실측 상수로 예약해 첫 페인트부터 문서 높이를 고정한다.

**게이트 공백:** baseline 164 장은 전부 `OPTED_IN` 으로 심어져 배너가 한 번도 렌더되지 않는다(`theme-matrix-smoke.spec.ts:171`). 모바일에서 화면 아래를 가장 크게 먹는 단일 요소가 시각 회귀망 밖에 있다.

### F11 (major) — E2E 전체에서 390px 보다 좁은 뷰포트가 없다. WCAG 1.4.10 Reflow(320px)는 전혀 검증되지 않고, `overflow-x` 백스톱도 없다

`tests/e2e/**` 의 모든 `width: N, height: M` 을 셌다 — 최소 폭은 **390**(30 회)이고 예외는 consent-smoke 의 480×800 하나뿐이다. 매니페스트 뷰포트는 390/900/1023/1024/1180/1440. **가로 모드(폭>높이인 모바일) 0 건, 높이 700 미만 0 건.**

`globals.css` 와 `app-body-class.ts` 에 `overflow` 선언이 0 건이므로 문서에 `overflow-x: hidden|clip` 백스톱이 없다. 한 원소만 넘쳐도 페이지가 가로로 스크롤된다.

**현재 320px 를 깨는 고정 폭은 찾지 못했다.** `w-[520px]`·`w-[460px]`·`w-[1280px]`·`w-[760px]`·`w-[132px]` 은 전부 `max-w-*`(+`w-full`)이거나 `flex-wrap` 안에 있고(`test-result-panel.tsx:33` `flex flex-wrap`), 그리드는 `minmax(0,1fr)`(`landing-catalog-grid.tsx:221`), 긴 단어는 필요한 자리에 `overflow-wrap:anywhere` 가 있다. `w-[min(87vw,340px)]` 는 320px 에서 278.4px 다. 즉 **오늘은 통과할 가능성이 높으나 측정된 적이 없고 보호되지도 않는다.**

위험은 결정 2 가 켠다. 모바일 생명주기의 `100vw` 계열 — `landing-grid-card.tsx:1042`(`w-screen mx-[calc(50%-50vw)]`) · `:292` · `landing-grid-card.module.css:394 · 536 · 544` — 에서 `100vw` 는 고전적 스크롤바 폭을 포함한다. `calc(50% - 50vw)` 로 가운데를 맞추면 오른쪽으로 약 스크롤바폭/2(15px 스크롤바에서 7~8px) 만큼 넘친다. 폰에서는 오버레이 스크롤바라 무해하지만, **결정 2 가 hover 없는 고전 스크롤바 기기(Windows·ChromeOS 터치 랩톱)를 모바일 생명주기로 보내는 순간 살아난다.**

**고침:** 매니페스트에 320×568 케이스를 추가하거나 전용 reflow 스펙을 만들어 모든 라우트에서 `document.documentElement.scrollWidth <= clientWidth` 를 단언한다. `w-screen`/`100vw` 를 이미 선언된 `landing-grid` 컨테이너 기준 `100cqi` 로, 또는 `width:100%; margin-inline: calc(50% - 50cqi/2)` 로 바꾼다. 백스톱으로 `html { overflow-x: clip }` 을 둔다.

**비용 경고:** 매니페스트는 Ask-First 이고(`AGENTS.md` §4), `scripts/qa/check-phase11-telemetry-contracts.mjs:353-365` 가 매니페스트와 디스크를 양방향 정확 일치로 강제하므로 케이스 추가는 PNG 생성과 같은 커밋에서 움직여야 하며 `qa:visual:full` 은 사람 승인이 필요하다.

### F12 (minor) — `window.visualViewport` 를 한 번도 쓰지 않는다

`grep -rn visualViewport src/` → 0 건. 모든 뷰포트 읽기가 레이아웃 뷰포트 기준이다 — `use-gnb-capability.ts:20` · `landing-catalog-grid.tsx:125` · `consent-banner.tsx:118` · `landing-runtime.tsx:56` · `theme-transition.ts:103-107`.

오늘은 대체로 무해하다. `src/` 전체에 `<input>`·`<textarea>`·`<select>`·`contentEditable` 이 **0 건**이라 소프트 키보드가 뜰 일이 없다. 다만 핀치 줌(WCAG 1.4.4)은 visual viewport 만 바꾸므로 `consent-banner.tsx:118` 의 `window.innerHeight - layer.bottom` 계산이 그것을 보지 못한다. 그리고 결정 5 의 IA 가 텍스트 입력을 하나라도 도입하는 순간 살아난다.

**고침:** 바닥 고정 표면이나 입력이 들어올 때 `visualViewport` 의 `resize`/`scroll` 을 구독해 바닥 오프셋을 `visualViewport.height` 로 구동하고, F3 의 meta 에 `interactive-widget=resizes-content` 를 함께 선언한다.

### F13 (minor) — 드로어의 `-webkit-overflow-scrolling: touch` 는 현대 iOS 에서 no-op 이다

`site-gnb.tsx:87` 의 `[-webkit-overflow-scrolling:touch]`. iOS 13 이후 WebKit 에서 제거됐다. 지우는 것 자체는 사소하지만, 이것을 여기 남겨 두는 이유는 **같은 파일의 한 문자열 안에서 모바일 대응처럼 보이는 선언 셋이 모두 죽어 있기 때문**이다 — `[height:100dvh]`/`[max-height:100dvh]`(F1, emit 순서에 패배), `env(safe-area-inset-bottom)`(F3, meta 부재로 0), 그리고 이 줄. 리팩터는 이 셋을 한 번에 걷어야 한다.

### F14 (minor) — 유일한 장문 읽기 표면의 스크롤 비용이 어떤 방법으로도 측정된 적이 없다

`/{locale}/blog/{variant}` 는 매니페스트의 `layoutCases`·`stateCases` 어디에도 없어 **전 뷰포트에서 baseline 0 장**이다. 이 표면에 닿는 모바일 E2E 는 390×844 axe 1 회(`a11y-smoke.spec.ts`)와 GNB 키보드 순회(`gnb-smoke.spec.ts`)뿐이며 둘 다 문서 높이를 재지 않는다.

그런데 이 표면이 제품에서 가장 긴 문서를 만드는 자리다 — `--body` 16px/1.6 을 `max-w-[760px]` 칼럼에 흘린다(`blog-destination-client.tsx:29 · :36`). 게다가 블로그 본문은 en·kr 만 실존하고 10 개 locale 이 영어로 폴백되므로(i18n 지도), 번역이 들어온 뒤의 실제 깊이는 지금 아무도 모른다.

**고침:** 매니페스트에 blog-article layout 케이스를 추가한다(모바일 포함 6 뷰포트 × 2 locale × 2 theme = 24 장, 또는 모바일만이면 4 장). §F11 의 매니페스트 비용 경고가 그대로 적용된다.

---

## 4. 미확인 — 다음 세션이 먼저 재현해야 할 것

- **iOS Safari 의 large−small viewport 델타 실측값.** F1 의 「마지막 로케일 칩 줄이 잘린다」는 델타 > 33px 을 전제한다. 통상 그 범위를 넘지만 이 세션에서 재지 않았다. 실기기 또는 `window.innerHeight` vs `100vh` 를 동시에 읽는 페이지 한 장이면 끝난다.
- **`h-screen` 이 `[height:100dvh]` 를 이긴다는 컴파일 프로브 결과의 브라우저 확인.** 프로브는 Tailwind 4.1.0 의 emit 순서를 확정했지만 실제 `getComputedStyle(panel).height` 를 읽지는 않았다. 한 번의 계산 스타일 측정으로 닫힌다.
- **`global-not-found.tsx` 가 Next 기본 viewport meta 를 실제로 받는지.** 자체 `<html>` 을 렌더하고 `<head>` 가 없다. 받지 못하면 iOS 가 980px 데스크톱 폭으로 렌더한다 — blocker 급이지만 빌드 없이는 판정 불가라 F3 안에 열어 두었다.
- **`body{overflow:hidden}` 해제 시 iOS 가 스크롤 위치를 보존하는지.** 보존 코드가 없다는 것은 확정(F2), 실제 손실 여부는 실기기 필요.
- **가로 모드에서 확장 카드 상한 `calc(100dvh-116px)` 이 실제로 걸리는지.** 계산상 274px < 285px 로 걸린다(F7). 렌더로 확인하지 않았다.
- **pull-to-refresh 가 테스트 회차를 실제로 날리는지, `beforeunload` 가 모바일에서 뜨는지**(F9). 선언 부재는 확정, 실기기 거동은 미측정.
- **320px 실제 렌더**(F11). 소스에서 깨는 고정 폭을 찾지 못했다는 것까지가 이 세션의 결론이고, 렌더로 확인하지 않았다.
- **`public/56T-ToDo.html`.** `public/` 아래에 제품과 무관한 HTML 한 장이 있고 `env(safe-area-inset-top/bottom)` 을 여러 곳에서 쓴다 — 저장소에서 safe-area 를 제대로 다루는 유일한 파일이다. 공개 경로로 서빙되지만 제품 표면이 아니라 이 렌즈에서는 다루지 않았다. 별도 보고 대상이다.
