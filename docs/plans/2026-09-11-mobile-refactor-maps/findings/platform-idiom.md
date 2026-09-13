# 렌즈: platform-idiom — 모바일 웹 관행 부합도

분석 대상: `/Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis` (읽기 전용, `git status --porcelain` 빈 출력으로 무변경 확인). 모든 file:line 은 이 clone 에서 직접 읽은 값이고, Tailwind 컴파일 결과는 clone 의 `node_modules/tailwindcss@4.1.0` 을 직접 실행해 얻었다.

## 0. 이 렌즈가 먼저 확정한 세 가지 사실

**(가) 탭 하이라이트는 이미 꺼져 있다 — 그리고 그 자리를 아무것도 채우지 않았다.** `src/app/globals.css:1` 이 `@import "tailwindcss"` 하나이고, Tailwind v4.1.0 의 preflight 가 `html, :host { -webkit-tap-highlight-color: transparent; }` 를 낸다(clone 의 `node_modules/tailwindcss` 를 `compile()` 로 직접 돌려 확인). 이 속성은 상속되므로 앱 전체에서 iOS 의 기본 회색 번쩍임이 사라진다. 그러므로 이 렌즈의 질문 「탭 하이라이트가 제어되는가」의 답은 「제어된다」이고, 진짜 결함은 그 다음이다 — 브라우저가 주던 유일한 누름 피드백을 제거해 놓고 대체물을 대부분의 컨트롤에 넣지 않았다(§F4).

**(나) `[height:100dvh]` 는 `h-screen` 에 진다 — 저장소가 네 번 기록한 L10 함정의 다섯 번째 사례다.** Tailwind v4.1.0 은 arbitrary property(`[height:100dvh]`)를 named utility(`h-screen`) **앞**에 emit 한다. 후보 배열 순서를 뒤집어도 결과는 같다(결정적). 따라서 `src/features/gnb/site-gnb.tsx:87` 의 GNB 모바일 드로어는 실효 `height: 100vh` · `max-height: 100vh` 이고, 같은 문자열 안의 dvh 선언 두 개는 죽은 코드다. 이 하나가 §F2 의 blocker 를 만든다. 같은 probe 로 `min-h-[var(--tap-min)]` 이 `min-h-8` 을 **이긴다**는 것도 확인했으므로 모바일 칩 44px 은 성립한다(결함 아님 — `surface-gnb` 맵의 미확인 항목 해소).

**(다) 입력 폼이 0개다.** `<input>` · `<textarea>` · `<select>` · `inputMode` · `autoComplete` · `contentEditable` 이 `src/` 전체에서 grep 0건. 따라서 이 렌즈의 질문 「iOS 입력 확대 방지(font-size ≥16px)」는 **오늘 해당 사항 없음**이다. 결함으로 올리지 않는다. 다만 §F17 의 처방(로케일 선택을 목록/시트로)이 검색 입력을 도입한다면 그때 16px 하한이 발생한다.

---

## F1. `viewport-fit=cover` 가 없어 저장소의 safe-area 처리 2건이 iOS 에서 아무것도 하지 않는다

`src/` 전체에 `export const viewport` 도 `generateViewport` 도 없다(grep: metadata export 는 `layout.tsx:13` · `global-not-found.tsx:31` · `blog/[variant]/page.tsx:12` 셋뿐). 그래서 Next 가 기본값 `<meta name="viewport" content="width=device-width, initial-scale=1">` 만 낸다(clone 의 `node_modules/next/dist/bundle-analyzer/__next._head.txt:6` 이 그 기본 산출물을 그대로 담고 있다). `viewport-fit` 이 `auto` 이면 iOS Safari 는 콘텐츠를 safe area 안쪽에 배치하고 `env(safe-area-inset-*)` 를 전부 `0` 으로 해석한다.

그 결과 저장소에 있는 safe-area 참조 2건이 전부 무효다 — `src/features/landing/shell/consent-banner.tsx:21` 의 `bottom-[max(16px,env(safe-area-inset-bottom))]` 은 항상 `16px` 로 계산되고, `src/features/gnb/site-gnb.tsx:87` 의 `pb-[calc(32px+env(safe-area-inset-bottom,0px))]` 은 항상 `32px` 다. `env(safe-area-inset-top|left|right)` 는 `src/` · `public/` 전체에서 **0건**이므로 가로 모드 노치 침범에 대한 처리는 애초에 없다.

`user-scalable=no` 나 `maximum-scale` 이 없는 것은 올바르다(WCAG 1.4.4 통과). 이 항목은 「빠진 선언 하나」가 아니라 「이미 쓴 두 줄이 작동하지 않는다」는 점에서 결함이다.

## F2. GNB 모바일 드로어의 설정 컨트롤이 화면 밖으로 밀려 있고, 스크롤로도 닿을 수 없다 — blocker

세 사실의 합이다. ⑴ `site-gnb.tsx:87` 의 패널은 §0(나)에 의해 실효 `height: 100vh`(= large viewport)다. ⑵ `site-gnb.tsx:104` 의 `gnbMobileSettingsClassName = 'gnb-mobile-settings mt-auto grid gap-3'` 이 설정 블록을 그 100vh 상자의 **바닥**에 고정한다(`site-gnb.tsx:465` 에서 flex column 의 마지막 자식으로 렌더). ⑶ `src/features/gnb/hooks/use-gnb-mobile-menu.ts:140-141` 이 드로어가 열린 동안 `document.body.style.overflow='hidden'` 과 `touchAction='none'` 을 건다.

주소창이 보이는 상태(= 페이지 로드 직후의 기본 상태)에서 가시 높이는 small viewport 이고 100vh 는 large viewport 이므로, 패널 바닥은 가시 영역보다 대략 주소창 높이만큼(iOS Safari 약 60~95px, Chrome Android 약 56px) 아래에 있다. 패널 자신의 `overflow-y-auto` 는 **발동하지 않는다** — 콘텐츠(계산 약 520px)가 상자 높이(100vh)를 넘지 않기 때문이다. 페이지 스크롤은 ⑶ 으로 막혀 있다. 즉 잘린 부분에 닿을 경로가 하나도 없다.

잘리는 것이 무엇인지가 중요하다. 설정 블록은 테마 행(44px) + 로케일 칩 12개다. 칩 라벨은 전부 전체 언어명(`src/config/site.ts` 의 `localeMetadata`: `English` · `한국어` · `简体中文` · `繁體中文` · `日本語` · `Español` · `Français` · `Português` · `Deutsch` · `हिन्दी` · `Indonesia` · `Русский`)이고, 모바일 칩은 `settings-controls.tsx:118` 의 `min-h-[var(--tap-min)] px-[14px]`(44px 높이 · 좌우 14px)다. 패널 내부 폭은 `min(87vw,340px) − px-4×2` = 390px 기준 307px 이므로 칩 행이 3~4줄로 접힌다. 잘리는 60~95px 은 정확히 그 칩 벽의 마지막 1~2줄이다.

이것이 blocker 인 이유는 계약이 그 자리를 명시하기 때문이다 — `docs/req-landing.md:240` 「Mobile Landing: **최하단** 설정 컨트롤은 언어/테마 2개만 허용한다」. 계약이 바닥에 두라고 지정한 컨트롤이 바닥 밖에 있다. 그리고 `docs/req-landing.md:246` 「Mobile Test: 햄버거, 설정 레이어, 언어/테마 컨트롤을 노출하지 않는다」에 따라 테스트 컨텍스트에는 설정 경로가 아예 없으므로, 이 드로어가 모바일에서 언어·테마에 닿는 **유일한** 경로다.

## F3. `overscroll-behavior` 가 문서 레벨에 없어 pull-to-refresh 와 스크롤 체이닝이 열려 있다

`overscroll` 은 `src/` 전체에서 두 곳뿐이다 — `site-gnb.tsx:87`(드로어)과 `landing-grid-card.tsx:285`(모바일 확장 카드 본문). `src/app/globals.css` 에는 `html`/`body` 선택자 자체가 없다(ERE grep 으로 `^html`·`^body`·`overflow`·`overscroll` 전부 0건; 파일 안의 규칙은 `:root` 토큰 블록들과 `@layer base { a { color } }` 뿐).

Chrome Android 는 문서가 스크롤 최상단일 때 아래로 당기면 pull-to-refresh 를 발동한다. 테스트 문항 화면은 **항상** 스크롤 최상단이다 — 390×844 에서 문서가 뷰포트를 넘지 않으므로(`surface-test` 맵의 계산 카드 하단 510px, 아래 310px 공백) 스크롤할 것 자체가 없다. 즉 진행 중인 회차에서 아래로 쓸어내리는 동작이 곧 전체 페이지 리로드다.

답변이 `src/features/test/use-test-run-controller.ts:182` 의 `writeResponseSet` 로 매 응답마다 localStorage 에 저장되므로 **데이터는 잃지 않는다**. 그래서 blocker 가 아니라 major 다. 잃는 것은 회차의 연속성(리로드 · booting 창 · instruction 재평가)과, `use-before-unload-guard.ts:22-27` 때문에 뜨는 「사이트에서 나가시겠습니까」 모달 한 장이다.

iOS Safari 는 기본 브라우저 모드에서 PTR 을 하지 않으므로 이 항목은 Android Chrome 과 홈 화면에 추가된 standalone 모드에 해당한다. standalone 모드 자체가 §F6 때문에 지금은 성립하지 않는다.

## F4. 브라우저가 주던 누름 피드백을 지우고 대체하지 않았다 — 주 동선 전체가 무반응이다

§0(가)로 탭 하이라이트가 전역 투명이다. 그 자리를 채우는 `active:` 유틸리티는 저장소 전체에서 네 곳뿐이다 — `src/features/ui/button-class-names.ts:89`(primary 눌림) · `:97`(lift 복귀) · `:101`(secondary) · `src/features/gnb/site-gnb.tsx:64`(GNB pill). 나머지는 전부 JS 객체 키(`active:` 로 grep 되지만 `use-mobile-backdrop-gesture.ts` 등의 필드명)다.

그리고 `hover:` 는 Tailwind v4 에서 `&:hover { @media (hover: hover) { … } }` 로 emit 된다(같은 probe 로 확인). 터치 기기에서는 이 미디어가 거짓이므로 hover 전용 피드백은 **존재하지 않는다**. 따라서 다음 컨트롤들은 터치에서 누름 피드백이 0이다.

- 랜딩 카드 트리거 — `landing-grid-card.module.css` 전체에 `:active` 가 0건이고 hover 규칙은 `:92` 의 `@media (hover: hover) and (pointer: fine)` 안에 있다. 카드 8장 전부.
- 블로그 목록 행 — `src/features/blog/blog-destination-client.tsx:43-45` 에 `hover:` 둘과 `data-[selected=true]` 뿐, `active:` 0건.
- 테스트 답변 선택지 — `src/features/test/surface-class-names.ts:83` 의 `testAnswerChoiceClassName` 에 `active:` 0건. `data-[selected=true]` 로 바뀌긴 하나 `use-answer-lock.ts:32` 의 150ms 뒤 문항이 교체되므로 피드백이 150ms 만에 사라진다. 한 회차에 8~60번 반복하는 **제품의 주 동작**이다.
- qualifier 칩 — `surface-class-names.ts:93` 의 `testChipClassName`, `active:` 0건.
- GNB 드로어 링크 — `site-gnb.tsx:100-101` 의 `gnbMobileLinkClassName`, `hover:bg-…` 뿐.
- 설정 칩(테마·로케일) — `settings-controls.tsx:29`·`:48-49`, hover 전용.

햅틱 대체도 없다 — `navigator.vibrate` 가 `src/` 전체에서 0건이다. 즉 터치 사용자가 「눌렸다」를 아는 유일한 신호는 그 다음 화면이 바뀌는 것뿐이고, 네트워크가 느리면 아무 신호도 없다.

## F5. 인터랙티브 요소의 텍스트 선택·롱프레스 콜아웃이 통제되지 않는다

`select-none` 은 `src/` 전체에서 한 곳, `landing-grid-card.tsx:249` 의 **장식용 meta 구분자**에만 걸려 있다. `-webkit-touch-callout` 은 `src/` · `public/` 전체에서 0건이다(`public/56T-ToDo.html` 은 이 앱과 무관한 정적 파일이다).

구체적으로 문제가 되는 자리는 셋이다. ⑴ `src/features/test/qualifier-chip.tsx:24-32` 는 네이티브 `<button>` 이 아니라 `<div role="button" tabIndex={0}>` 이라 UA 의 폼 컨트롤 기본값을 받지 못한다 — 롱프레스에 텍스트 선택 핸들이 뜬다. ⑵ 랜딩 블로그 카드는 카드 전체가 `<Link>`(= `<a href>`)다(`landing-grid-card.tsx:1170-1186`). iOS 에서 `<a>` 롱프레스는 링크 미리보기 액션 시트를 띄우고, 그 안에 썸네일 `<Image>`(`:426-432`)가 있으므로 「이미지 저장」까지 제안된다. ⑶ 카드 제목·부제와 문항 텍스트는 일반 텍스트라 탭을 조금 끌면 선택이 시작된다.

## F6. 홈 화면 추가·브라우저 크롬 연동이 전무하다 — manifest · theme-color · 앱 아이콘 0건

`public/` 에는 `fonts/` · `landing-card-media/` · `theme-bootstrap.js` · 무관한 `56T-ToDo.html` 뿐이고 manifest 파일이 없다. `src/app/` 에는 `favicon.ico` 하나뿐이며 Next 의 파일 규약 아이콘(`icon.*` · `apple-icon.*` · `manifest.*`)이 없다. `layout.tsx:13-16` 의 metadata 는 `title` 과 `description` 두 필드뿐이고 `themeColor` · `appleWebApp` · `manifest` · `icons` 가 전부 비어 있다.

`themeColor` 부재의 체감 결과가 구체적이다. 이 앱은 다크 테마를 갖고(`public/theme-bootstrap.js:17-19` 가 `prefers-color-scheme` 으로 `data-theme` 를 세운다) 다크 `--canvas` 는 `#141110`(`globals.css:350` → `:110` `--warm-950`), 라이트는 `#fbfaf7`(`:125` → `:100` `--warm-50`)다. `theme-color` 가 없으면 모바일 브라우저의 상·하단 크롬이 페이지 테마를 따라가지 않아 다크 모드에서 밝은 띠가 남는다. 게다가 GNB 는 `site-gnb.tsx:38` 에서 `backdrop-filter: blur(12px)` 에 반투명 `--gnb-surface`(`globals.css:266`, `--canvas` 88%)라 크롬과 바의 경계가 더 드러난다.

## F7. 결과 화면과 블로그 기사에 공유 경로가 없다 — `navigator.share` 0건

`navigator.share` · `canShare` · `clipboard` 가 `src/` 전체에서 grep 0건이다. 결과 패널(`src/features/test/test-result-panel.tsx:90-100`)이 내는 행동은 랜딩 링크와 히스토리 링크 둘뿐이고, 히스토리는 목록 코드 자체가 없는 빈 화면이다(`src/app/[locale]/history/page.tsx:33-51`).

이것이 누락인 근거는 데이터 모델 쪽에 있다. 변종 레지스트리가 `blog.meta.sharedC` 를 들고 있고(`src/features/variant-registry/types.ts:17-19`), fixture 는 실제 값을 채운다(`src/features/variant-registry/source-fixture.ts:35` `engagedC: 15236` 등). 제품이 「공유 수」를 세는 자리를 만들어 두고 공유하는 수단을 두지 않았다. 그리고 `docs/req-test.md:1030-1040` 의 결과 target contract 는 `/result/{variant}/{type}?{base64}` 라는 self-contained URL 을 이미 규정한다 — 그 URL 의 존재 이유가 공유인데 공유 버튼이 계획에 없다.

## F8. GNB 드로어가 pointerdown 에 닫히기 시작하고, 그 취소 경로는 모바일에서 도달 불가능하다

`use-gnb-mobile-menu.ts:89-104` 의 `mobileMenuBackdropPointerDown` 이 곧바로 `requestMobileMenuClose('outside')` 를 호출해 180ms 닫힘 애니메이션을 시작한다(`behavior.ts:4` `MOBILE_MENU_CLOSE_DURATION_MS = 180`). 취소는 `:106-125` 의 pointermove 가 10px 임계를 넘었을 때만 일어나고, 그때 상태를 `closing → open` 으로 **되돌린다** — 즉 사용자는 이미 사라지기 시작한 패널이 돌아오는 것을 본다.

같은 저장소의 카드 backdrop 은 정반대다 — `use-mobile-backdrop-gesture.ts:91-97` 이 `pointerup` 에서 `closeOnPointerUp` 을 평가한다. 두 backdrop 이 같은 10px 임계값(`use-mobile-backdrop-gesture.ts:7` · `behavior.ts:6`)을 쓰면서 확정 시점이 반대다.

그리고 드로어 쪽에서는 그 취소 경로가 사실상 죽어 있다. 드로어가 열린 동안 `use-gnb-mobile-menu.ts:140-141` 이 `body` 에 `touch-action: none` 을 걸므로 backdrop 영역에서 스크롤할 것이 없다 — 「스크롤 제스처로 판정되면 취소」라는 규정이 취소할 스크롤이 없는 상황에 걸려 있다. 계약 자체가 이 모양을 지시한다: `docs/req-landing.md:237` 「패널 외부 영역 입력은 `pointer down` 시점에 닫힘을 시작해야 한다」 · `:238` 「위 입력이 스크롤 제스처로 판정되면 닫힘 시작을 취소해야 한다」. iOS HIG 와 Material 3 는 둘 다 탭 확정을 touch-up 에 두고 손가락을 끌어 빼면 취소되게 한다. WCAG 2.5.2 Pointer Cancellation 은 down-event 실행을 금지하거나 중단/실행취소를 요구하는데, 여기의 중단은 「이미 시작된 시각 변화를 되돌리기」라 요건은 문면상 충족하되 관행과는 어긋난다.

## F9. 시스템 뒤로가기가 어떤 오버레이도 닫지 않는다 — 그리고 드로어는 Android 뒤로가기 제스처 영역에 있다 — blocker

`popstate` 리스너 · `history.pushState` · `history.replaceState` · `history.scrollRestoration` 이 `src/` 전체에서 0건이다(`ia-contracts` 맵의 실측을 이 clone 에서 재확인: History API 사용은 `use-gnb-back-navigation.ts:53,75` 의 `history.back()` 둘뿐).

모바일에서 오버레이를 닫는 첫 번째 동작은 시스템 뒤로가기다. 이 앱에는 그렇게 닫혀야 할 것이 넷 있다 — 랜딩 모바일 확장 카드(`landing-grid-card.tsx:1141` `data-expanded-layer="mobile-in-flow"`), GNB 드로어(`site-gnb.tsx:433-435` `role="dialog" aria-modal="true"`), 데스크톱 설정 팝오버, instruction 다이얼로그(`instruction-overlay.tsx:151-152` `role="dialog" aria-modal="true"`). 넷 다 뒤로가기에 반응하지 않고 **페이지를 떠난다**.

테스트 중이면 그 이탈이 `use-before-unload-guard.ts:22-27` 의 네이티브 확인 모달로 이어진다. 즉 모바일 사용자가 다이얼로그를 닫으려고 한 동작이 「사이트에서 나가시겠습니까」를 띄운다.

가로 제스처 충돌은 드로어에서 구체화된다. 드로어는 `site-gnb.tsx:87` 에서 `absolute right-0` 이고 폭 `min(87vw,340px)` 다. Android 10+ 의 제스처 내비게이션은 **좌·우 양쪽** 가장자리에서 뒤로가기를 받으므로, 우측 가장자리에 붙은 드로어의 가장자리 밴드가 그대로 시스템 뒤로가기 영역이다. `body` 의 `touch-action: none` 은 시스템 제스처를 막지 못한다. 결과: 드로어를 밀어 닫으려는 자연스러운 동작이 페이지 이탈이 된다. iOS 의 좌측 가장자리 스와이프 뒤로가기는 드로어와는 겹치지 않지만, 역시 `history` 항목이 없으므로 랜딩에서 확장 카드를 연 뒤 좌측 스와이프하면 카드가 닫히는 대신 앱을 떠난다.

`docs/req-landing.md:632` 「닫기 경로는 `X 버튼` 또는 `카드 외부(backdrop) 탭`만 허용한다」가 배타적 열거라, 뒤로가기 닫기를 추가하려면 이 조항 개정이 선결이다.

## F10. `100dvh` 를 흐름 안 요소의 `max-height` 로 써서 주소창이 움직이는 동안 카드가 늘었다 줄었다 한다

`landing-grid-card.tsx:285`(모바일 확장 본문) · `:292`(transient shell) · `:296`(transient surface) 세 곳이 `max-h-[calc(100dvh-116px)]` 이다. `dvh` 는 주소창이 접히고 펴지는 동안 **연속으로** 값이 바뀐다. `:285` 의 요소는 `data-expanded-layer="mobile-in-flow"`, 즉 문서 흐름 안에 있고 OPEN settled 에서는 페이지 스크롤이 허용된다(`use-mobile-scroll-lock.ts:5-7` 이 OPENING/CLOSING 에만 잠그고, `docs/req-landing.md:641` 이 그렇게 요구한다). 따라서 사용자가 스크롤해 주소창이 접히는 바로 그 순간 카드의 `max-height` 가 커지고, 되돌아오면 작아진다 — 스크롤 도중 카드 자신이 크기를 바꾸고 내부 스크롤바가 켜졌다 꺼진다.

세로 모드에서는 한계값(844−116 = 728px)이 잘 안 걸려 잠재적이지만, **가로 모드에서는 항상 걸린다** — 뷰포트 높이 390px 기준 `max-height` 가 274px 이고 주소창 변동폭이 그 값의 20% 를 넘는다. 200% 글자 확대에서도 같다.

`116px` 은 출처가 없다. `grep -rn '116' src/` 결과 이 세 줄이 전부이고 토큰·상수·주석·계약 조항 어디에도 근거가 없다. 모바일 GNB 는 56px(`site-gnb.tsx:41` `h-14`)이므로 나머지 60px 이 설명되지 않는다. 그리고 이 상수는 동의 배너를 계산에 넣지 않는다 — 배너는 390px 에서 `consent-banner.tsx:241` 의 `max-[719px]:flex-wrap` 으로 세로 적층돼 훨씬 높아진다.

## F11. `min-height: 100vh` 가 `<body>` 와 `.page-shell` 두 겹으로 걸려 있어 모든 짧은 화면이 내용 없는 스크롤을 만든다

`src/app/app-body-class.ts:19` 의 `APP_BODY_CLASSNAME` 에 `min-h-screen`, `src/features/landing/shell/page-shell.tsx:19` 의 `.page-shell` 에도 `min-h-screen`, 그리고 `src/app/not-found.tsx:11` 과 `src/app/global-not-found.tsx:18` 의 `<main>` 에도 있다. probe 로 `min-h-screen` = `min-height: 100vh` 임을 확인했다(`min-h-dvh` 는 존재하지만 쓰이지 않는다).

모바일에서 `100vh` 는 large viewport(주소창이 접힌 상태의 높이)다. 주소창이 보이는 동안 문서는 가시 높이보다 60~95px 크므로, 내용이 짧은 화면도 그만큼 스크롤된다 — 스크롤해도 빈 바탕만 나온다. 해당 화면은 히스토리 빈 상태(`history/page.tsx:33-51`, 내용은 아이콘 + 제목 + 두 문단), `/test/error`(`test/error/page.tsx:44-56`, 아이콘 + h1 하나), 404 두 장, 블로그 상세, 그리고 §0(다) 의 계산상 뷰포트의 44% 만 쓰는 테스트 문항 화면이다.

## F12. instruction 전면 시트에 스크롤 컨테이너도 배경 잠금도 없다 — blocker

`instruction-overlay.tsx:145` 의 레이어는 `fixed inset-0 z-[1050] grid place-items-center p-6 max-[767px]:p-0` 이고, `overflow` 선언이 없다. 카드는 `:26` 에서 모바일일 때 `min-h-full w-full content-start rounded-none border-0 pt-[88px]` 이다. `overscroll-contain` 도 없다. 그리고 이 오버레이가 열려 있는 동안 배경 페이지를 잠그는 코드가 어디에도 없다 — `src/features/test/**` 전체에 `body.style.overflow` · `touchAction` 조작이 0건이다(scroll lock 구현은 `use-mobile-scroll-lock.ts` 와 `use-gnb-mobile-menu.ts` 둘뿐이고 둘 다 랜딩·GNB 소관).

내용이 뷰포트를 넘으면 `place-items-center` 가 그것을 세로 중앙에 두므로 위아래가 **동시에** 잘리고, `position: fixed` + overflow 없음이라 도달할 방법이 없다. 그런데 instruction 본문 길이의 정본은 Sheets 의 `instruction_*` 컬럼이고(`docs/req-test.md:115`) 상한 규정이 없다. 현재 fixture 는 한국어 40~50자(`source-fixture.ts:29-32`)라 재현되지 않지만, 이 화면은 길이를 저장소가 통제하지 않는 유일한 전면 레이어다.

같은 앱의 GNB 드로어는 같은 문제를 정반대로 다룬다 — `site-gnb.tsx:87` 이 `overflow-y-auto` · `overscroll-contain` · `[-webkit-overflow-scrolling:touch]` · safe-area 하단 패딩을 전부 갖는다. 두 전면 레이어가 상반된 구현이다.

부수로 상수 하나가 틀렸다. `:26` 의 모바일 분기가 `max-[767px]:pt-[88px]` 인데 88 은 **데스크톱** 값이다 — `page-shell.tsx:22` 가 모바일 `pt-20`(80px) · 데스크톱 `md:pt-[88px]` 이고 모바일 GNB 실높이는 56px(`site-gnb.tsx:41`)이다. 모바일 분기에 데스크톱 상수가 복사돼 32px 을 과다 예약한다.

## F13. instruction 시트의 유일한 CTA 가 전면 시트의 상단 우측에 있다

`:26` 의 `content-start` 로 콘텐츠가 위에서부터 쌓이고, 액션 행(`:20` `instructionActionRowClassName = 'flex flex-wrap items-center gap-2'` + `:180`/`:227` 의 `justify-end`)이 본문 바로 다음에 온다. 390×844 에서 시트 콘텐츠 높이는 약 235px 이므로 CTA 는 화면 위쪽 1/4 안, 우측 정렬로 놓이고 아래로 약 600px(72%)이 빈 화면이다.

iOS HIG 의 시트와 Material 3 의 full-screen dialog 는 둘 다 주 행동을 하단 고정 영역에 둔다(엄지 도달 영역). 이 시트는 데스크톱 다이얼로그(중앙 정렬 · 우하단 버튼 행)를 전면으로 늘린 형태 그대로다.

i18n 압력이 이를 악화시킨다 — `i18n-pressure` 맵의 계산으로 `acceptAllAndStart + keepCurrentPreference` 조합이 모바일 가용 350px 을 넘는 로케일이 8개(en 370 · es 442 · fr 489 · de 480 · hi 473 · id 447 · ru 447 · pt 409)이고, `flex-wrap + justify-end` 라 접히면 두 버튼이 **우측 정렬로 세로 적층**된다.

## F14. 테스트 문항 화면에 하단 고정 액션 바가 없다

`test-question-client.tsx:53` 의 `testNavRowClassName = 'test-nav-row flex flex-wrap items-center justify-between gap-2'` 는 일반 흐름 안의 행이고, `src/` 전체에서 `sticky` 는 두 곳뿐이다 — `site-gnb.tsx:38`(GNB)과 `landing-grid-card.tsx:287`(확장 카드 내부 헤더). 즉 테스트 표면에는 sticky 가 하나도 없다.

`src/features/test/**` 의 뷰포트 분기는 `instruction-overlay.tsx:26`(6개)·`:145`(1개)의 `max-[767px]:` 7개가 전부다 — `test-question-client.tsx`(425줄)와 `surface-class-names.ts`(114줄)는 0개다. 결과로 진행률 표시도 스크롤과 함께 사라지고(`:254-279` 의 header 는 sticky 아님), 「이전」과 「제출」은 콘텐츠 끝에 매달린다. 모바일 설문·퀴즈의 표준은 진행률 상단 고정 + 액션 하단 고정이다.

`submit` 은 마지막 문항에서만 렌더되고(`:404-419` 의 `isLastQuestion` 분기) 「다음」은 계약상 존재하지 않으므로(`docs/req-test.md:679` 「다음 문항 이동은 응답 확정 직후 자동 진행으로 처리한다」), 하단 바에 놓을 것은 「이전」·진행 상태·(마지막에서만) 「제출」이다.

## F15. 문항 전환이 가로 슬라이드인데 가로 스와이프는 구현돼 있지 않다

`test-question-client.tsx:202` 가 `answerGridInitialX = prefersReducedMotion ? 0 : slideDirection === 'forward' ? 18 : -18`, `:356` 이 `initial={{x: answerGridInitialX}} animate={{x: 0}}` 로 180ms 가로 슬라이드를 낸다. 그런데 `src/features/test/**` 에 터치 이벤트 리스너도 `touch-action` 선언도 0건이다 — 가로로 미끄러지는 화면을 보고 좌우로 쓸어 보는 동작에 아무 반응이 없다.

**가로 오버플로는 발생하지 않는다 — 이 점은 확인했다.** 390px 기준 `<main>` 의 `px-[var(--shell-gutter)]`(16px, `globals.css:323`)과 패널의 `p-5`(20px, `surface-class-names.ts:41`)로 우측 여유가 36px 이고 이동량은 18px 이므로 문서의 가로 스크롤 영역이 늘지 않는다. 문제는 오버플로가 아니라 **없는 제스처를 광고하는 모션**이다.

## F16. 테마 칩이 탭할 때마다 자리를 바꾼다

`settings-controls.tsx:94-97` 의 `orderedThemeOptions` 가 `resolvedTheme === 'light' ? ['dark','light'] : ['light','dark']` 다 — 현재 테마가 **뒤**로 간다. 그리고 `:159` 의 `disabled={isCurrentTheme}` 로 현재 테마 칩은 비활성이다.

모바일에서의 결과: 44×44 칩 두 개가 `gap-2`(8px)로 붙어 있고, 앞자리 칩을 누르면 테마가 바뀌면서 두 칩이 자리를 맞바꾼다. 손가락 아래 있던 것이 방금 누른 것에서 방금 버린 것으로 바뀐다. 실수로 두 번 누르면 테마가 두 번 뒤집혀 원위치로 돌아오고, 그동안 2500ms 짜리 전환(§F17)이 두 번 돈다. 컨트롤이 활성화 직후 이동하는 것은 iOS HIG 와 Material 3 가 모두 금지하는 형태이고, 이 자리의 표준 패턴은 순서가 고정되고 선택 표시만 움직이는 **세그먼티드 컨트롤**이다.

## F17. 테마 전환이 2,500ms 동안 전면 마스크를 애니메이션한다

`src/features/gnb/hooks/theme-transition.ts:4` 의 `durationMs: 2500`. `docs/design/design.md` 의 최장 모션 토큰은 `--dur-expand` 260ms 이므로 9.6배이고, `docs/req-landing.md` · `design.md` · `docs/decision-register.md` 어디에도 이 값의 조항이 없다(저장소에서 `2500` 은 이 구현, 그것을 고정하는 `tests/unit/gnb-theme-transition.test.ts`, 현상을 서술한 `docs/project-analysis.md:275` 셋뿐).

모바일에서 비싼 것은 길이만이 아니라 무엇을 애니메이션하는가다. `:118-131` 이 `::view-transition-new(root)`/`old(root)` 에 SVG data-URI 마스크를 걸고 `mask-size` 와 `mask-position` 을 2,500ms 동안 움직이며 `will-change: mask-size, mask-position` 를 선언한다. 전면 스냅샷 두 장을 매 프레임 마스크와 함께 재래스터화하는 경로이고, 그동안 화면에는 뷰 트랜지션 스냅샷이 덮여 있어 페이지가 멈춘 것처럼 보인다. `:107-108` 이 `finalMaskSize = max(viewportSize*4, maxRadius*2.5)` 로 뷰포트의 네 배가 넘는 마스크를 만든다.

`:33-42` 의 `isReducedMotionPreferred` 로 reduced-motion 에서는 즉시 적용되므로 그 분기는 올바르다. 문제는 기본 경로다.

## F18. 로케일 선택이 340px 드로어 안의 12칩 벽이다

`settings-controls.tsx:19` 의 `chipRowClassName = 'gnb-chip-row flex flex-wrap gap-2'` 에 `localeOptions` 12개가 그대로 들어간다(`:169-190`). 라벨이 전체 언어명이라(§F2) 307px 폭에서 3~4줄로 접히고, 모바일 칩은 44px 높이다. 현재 항목은 `disabled` 이므로(`:184`) 「무엇이 선택돼 있는지」는 색으로만 읽힌다.

모바일 웹 관행은 12지선다에 칩 벽을 쓰지 않는다 — 현재 항목에 체크 표시가 붙은 목록(바텀시트 또는 전용 화면)이거나, 네이티브 피커를 여는 단일 행이다. 이 형태는 F2 의 잘림을 만드는 직접 원인이기도 하다(칩 벽이 3~4줄이라 설정 블록이 200~256px 이다).

## F19. 텔레메트리가 `keepalive` 도 beacon 도 없이 `fetch` 로 나가고 큐는 메모리에만 있다

`src/features/telemetry/runtime.ts:100-107` 의 `sendTelemetryEvent` 가 `fetch(TELEMETRY_ENDPOINT, {method:'POST', headers, body})` 이고 `keepalive` 가 없다. `navigator.sendBeacon` 은 `src/` 전체에서 0건이다. 큐는 `:42,:48` 의 `runtimeState.queue: TelemetryEvent[]` 로 메모리에만 있고 persist 되지 않는다.

`pagehide` · `pageshow` · `freeze` · `resume` 리스너가 `src/` 전체에서 0건이다(`visibilitychange` 는 `use-landing-interaction-controller.ts:265` 한 곳뿐이고 hover 정리용이다). 모바일 OS 는 백그라운드로 간 탭을 적극적으로 freeze/terminate 하므로, 화면 전환 직후에 발화하는 이벤트들 — `final_submit`(`use-test-run-controller.ts:250`) · `result_viewed`(`test-result-panel.tsx:64`, 패널 mount) — 이 전송 도중 끊기면 그대로 사라진다. 데스크톱에서는 잘 드러나지 않고 모바일에서만 드러나는 종류의 손실이다.

## F20. 모바일 확장 카드의 닫기 버튼이 페이지 스크롤에 따라 화면을 떠난다

`landing-grid-card.tsx:287` 의 헤더는 `sticky top-0` 인데, 그 sticky 의 기준 스크롤포트는 **카드 자신의** `overflow-auto` 상자(`:285`)다. 그런데 `:285` 의 `max-h` 는 `calc(100dvh-116px)` ≈ 728px(390×844)이고 확장 카드 콘텐츠는 대개 그보다 짧으므로 내부 스크롤이 발생하지 않는다. OPEN settled 에서 페이지 스크롤은 허용되므로(`docs/req-landing.md:641`), 사용자가 스크롤하면 카드 전체가 위로 올라가고 헤더의 X 버튼도 함께 화면을 떠난다.

계약은 그러면 안 된다고 적는다 — `docs/req-landing.md:630` 「X 버튼은 … 헤더 우측 끝에 sticky 고정. OPENING 시작 시점부터 CLOSING 종료 직전까지 **시각 노출 유지**」. 이것을 지킨다고 주장하는 유일한 게이트는 `tests/e2e/transition-telemetry-smoke.spec.ts:881-899` 인데, 그 테스트는 `expandedBody.evaluate(el => { el.scrollTop = 120 })` 로 **내부** 스크롤을 강제한다. 본문이 넘치지 않으면 `scrollTop` 은 0 에 머물고 헤더 top 도 변하지 않으므로 단언이 자동으로 통과한다 — 내용이 짧을 때 이 게이트는 항진명제다.

backdrop 탭이라는 두 번째 닫기 경로가 남아 있어 blocker 는 아니다.

## F21. 모달처럼 보이는 scrim 아래에서 페이지가 그대로 스크롤된다

`landing-catalog-grid.tsx:30-31` 의 backdrop 은 `fixed inset-0 z-10 bg-[var(--overlay-scrim-medium)] touch-pan-y` 다. `touch-pan-y` 가 세로 팬을 허용하고, OPEN settled 에서 스크롤 잠금이 풀려 있으므로(`use-mobile-scroll-lock.ts:5-7`), 화면 전체를 덮은 어두운 막 위에서 손가락을 세로로 움직이면 뒤 페이지가 따라 움직인다.

모바일 웹·네이티브 공통 관행에서 scrim 은 「이 아래는 막혔다」는 신호다. 여기서는 막히지 않았고, 동시에 `role="dialog"` 도 `aria-modal` 도 포커스 트랩도 없다(`src/features/landing/**` 전체에 `role="dialog"`·`aria-live` 0건). 결과는 모달도 인라인 확장도 아닌 중간 형태다. 계약이 이 형태를 직접 지시하므로(`docs/req-landing.md:641` 「OPEN settled 에서는 unlock 을 유지한다」) 구현 결함이 아니라 계약 결정의 결과이며, 사용자 결정 1·5 아래에서 다시 판정할 자리다.

## F22. `design.md` §10 이 스와이프 닫기를 금지하고 있어 바텀시트 IA 로 가는 길이 문서에서 막혀 있다

`docs/design/design.md:428` 의 Never Reintroduce 목록에 「Swipe-down close as authorized mobile expanded behavior」가, `:427` 에 「`min-height: 100%` as the expanded-overlay height invariant」가 있다.

바텀시트는 iOS 와 Android 양쪽에서 아래로 끌어 닫는 것이 **플랫폼 기본 제스처**다. `surface-landing` 맵이 권고하는 선택지 B(바텀시트 상세)를 채택하면 이 조항과 정면으로 부딪힌다. WCAG 2.5.7 Dragging Movements 는 드래그에 대한 비드래그 대안을 요구하는데 X 버튼이 이미 그 대안이므로 규범적 장애물은 없다 — 남은 것은 문서 조항뿐이다.

이 항목은 결함이라기보다 **개정하지 않으면 IA 재설계가 시작되지 않는 선결 조항**이다.

## F23. 탭 타깃에 `touch-action: manipulation` 이 없다

`touch-action` 선언은 제품 전체에서 하나(`landing-catalog-grid.tsx:31` 의 `touch-pan-y`, 모바일 backdrop)뿐이고, JS 로 `body` 에 `touchAction='none'` 을 거는 두 곳(`use-gnb-mobile-menu.ts:141` · `use-mobile-scroll-lock.ts:20`)이 있다. 개별 컨트롤에는 0건이다.

`width=device-width` 뷰포트 덕에 300ms 탭 지연은 이미 없지만, 인접한 44px 타깃 두 개를 빠르게 두 번 누르면 더블탭 확대가 발동한다. 테마 칩 두 개가 8px 간격으로 붙은 자리(§F16)와 답변 A/B 두 개가 `gap-2` 로 붙은 자리(`test-question-client.tsx:52` `testAnswerGridClassName`)가 정확히 그 조건이다.

## F24. 전환 중 유령 GNB 가 `fixed` 인데 진짜 GNB 는 `sticky` 다

`transition-gnb-overlay.tsx:14` 의 `TRANSITION_GNB_OVERLAY_CLASSNAME` 은 `pointer-events-none fixed inset-x-0 top-0 z-[1300]` 이고, 그 안에 완전한 두 번째 `SiteGnb` 를 렌더한다(`:30`). 진짜 GNB 는 `site-gnb.tsx:38` 에서 `sticky top-0 z-[1100]` 이다.

두 바가 같은 자리에 겹쳐 보이는 동안(`src/features/transition/constants.ts:1` `LANDING_TRANSITION_TIMEOUT_MS = 1600`, 최대 1.6초) 하나는 뷰포트 고정, 다른 하나는 흐름 안 sticky 다. 모바일 브라우저의 주소창 애니메이션과 관성 스크롤 중에 두 방식은 서로 다른 시점에 갱신되므로 겹침이 어긋나면 바가 둘로 보인다. 렌더로 재현하지 않았다 — 구조상 두 좌표계를 쓴다는 것까지만 확정이다.

## F25. `next/image` 가 `unoptimized` 라 반응형 이미지 파이프라인이 꺼져 있다

`landing-grid-card.tsx:426-432` 가 `<Image fill sizes="100vw" unoptimized />` 다. `unoptimized` 는 srcset 생성을 끄므로 `sizes="100vw"` 는 아무 일도 하지 않는다.

오늘 비용은 0이다 — `public/landing-card-media/*/thumbnail.svg` 가 391바이트 SVG 다(`qmbti/thumbnail.svg` 실측). 그러나 실제 사진이 들어오는 순간 모바일은 원본 한 장을 그대로 받게 되고, 슬롯은 `:223` 의 `aspect-[16/6]` 에 카드 폭 358px(390px 뷰포트)이라 필요 픽셀과 전송 픽셀이 크게 벌어진다. 이 리팩터가 그 결정을 내릴 마지막 지점이다.

## F26. 어떤 라우트에도 `loading.tsx` · `error.tsx` 가 없다

`src/app/**` 전체에 `loading.tsx` · `error.tsx` · `template.tsx` 가 0건이다. 모바일 네트워크에서 라우트 전환은 수백 ms~수 초가 걸리는데 그동안 화면에 아무 변화가 없다.

유일한 전환 피드백은 §F24 의 유령 GNB 이고, 그것은 랜딩→테스트/블로그 경로에만 붙는다(`transition-gnb-overlay.tsx:19` 가 `context === 'landing'` 이면 렌더하지 않는다). 히스토리 진입, 블로그 목록→상세, 드로어에서의 이동에는 아무 신호가 없다.

## F27. 동의 배너의 SSR spacer 가 데스크톱에서 잰 값이고, 실측 경로가 `window.innerHeight` 에 의존한다

`consent-banner.tsx:18` 의 `SSR_BANNER_SPACER_ESTIMATE_PX = 120` 은 바로 위 주석(`:15-16`)이 밝히듯 **1280×720 chromium** 에서 잰 배너 80px + 하단 16px 기준이다. 그런데 390px 에서는 `:241` 의 `max-[719px]:flex-wrap max-[719px]:justify-start` 로 메시지와 액션 셋이 세로로 접혀 배너가 훨씬 높아진다(`i18n-pressure` 맵의 문자 수 기반 계산 190~250px). 즉 모바일 첫 페인트에서 70~130px 의 레이아웃 시프트가 예약돼 있다 — 배너가 가장 낮은 단 하나의 폭에서 잰 값을 가장 높아지는 폭에 쓴다.

`:117-119` 의 실측도 모바일에서 위태롭다. `bottomGapPx = window.innerHeight − layerElement.getBoundingClientRect().bottom` 인데, 레이어는 `position: fixed`(`:21`)다. 모바일 브라우저에서 fixed 요소의 포함 블록과 `window.innerHeight` 가 가리키는 뷰포트는 엔진·상태에 따라 어긋날 수 있고, 저장소는 `visualViewport` API 를 어디에서도 쓰지 않는다(`src/` 전체 grep 0건). 어긋나면 spacer 가 주소창 높이만큼 과다 예약된다.

처방은 두 뷰포트 좌표계를 섞지 않는 것이다 — 오프셋을 레이어의 `padding-bottom` 으로 옮기고 **레이어 자신의 높이**를 spacer 로 쓰면 `window.innerHeight` 가 식에서 사라진다.

---

## 훑은 표면과 훑지 못한 표면

훑은 것: landing(`landing-catalog-grid.tsx` · `landing-grid-card.tsx` · `landing-grid-card.module.css` · `use-mobile-scroll-lock.ts` · `use-mobile-backdrop-gesture.ts` · `page-shell.tsx` · `consent-banner.tsx`) · test(`test-question-client.tsx` · `instruction-overlay.tsx` · `surface-class-names.ts` · `qualifier-chip.tsx` · `test-result-panel.tsx` · `use-before-unload-guard.ts` · storage) · blog(`blog-destination-client.tsx`) · history(`history/page.tsx`) · gnb(`site-gnb.tsx` · `use-gnb-mobile-menu.ts` · `components/settings-controls.tsx` · `hooks/theme-transition.ts`) · settings(드로어·데스크톱 팝오버 양쪽) · error(`test/error/page.tsx`) · 404(`not-found.tsx`) · global(`global-not-found.tsx` · `layout.tsx` · `app-body-class.ts` · `globals.css` · `theme-bootstrap.js` · `next.config.ts` · `telemetry/runtime.ts`).

렌더로 확인하지 않은 것(전부 소스·컴파일 산출물에서 유도했다): 실제 기기에서의 주소창 변동폭, iOS 에서 `position:fixed` 포함 블록과 `window.innerHeight` 의 실제 차이, Android 우측 가장자리 뒤로가기 제스처와 드로어의 실제 충돌, 2,500ms 테마 전환의 프레임 비용, F24 의 두 바 어긋남, F12 의 오버플로 실발현(현재 fixture 로는 재현되지 않는다).

읽지 않은 것: `src/app/api/telemetry`(UI 표면 아님), `docs/design/ds/**` 의 preview 25장, `tests/e2e/**` 전수(F20 의 `transition-telemetry-smoke.spec.ts:881-899` 와 theme-matrix 매니페스트·baseline 목록만 확인했다).

게이트는 하나도 실행하지 않았다 — 읽기 전용 과제다. `npm test` · `npm run qa:rules` · `test:e2e:*` 의 현재 pass/fail 은 이 clone 에서 확인되지 않았다.
