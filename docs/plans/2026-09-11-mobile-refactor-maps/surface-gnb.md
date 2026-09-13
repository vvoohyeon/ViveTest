# surface-gnb — GNB · 설정 레이어 · 에러/404 · page-shell · consent-banner 지도

분석 대상 clone: `/Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis` (읽기 전용, HEAD = `7616211` 착수 마커, 그 부모가 `a5aec95`). 아래 모든 `file:line` 은 이 clone 기준이며 저장소 상대경로로 적는다.

읽은 파일: `src/features/gnb/**`(19 파일 전부) · `src/features/landing/shell/page-shell.tsx` · `.../consent-banner.tsx` · `.../telemetry-consent-banner.tsx` · `src/app/not-found.tsx` · `src/app/global-not-found.tsx` · `src/app/[locale]/test/error/page.tsx` · `src/app/layout.tsx` · `src/app/[locale]/layout.tsx` · `src/app/app-body-class.ts` · `src/features/ui/button-class-names.ts` · `src/features/transition/transition-gnb-overlay.tsx` · `public/theme-bootstrap.js` · `src/app/globals.css`(토큰 구간) · `tests/e2e/gnb-smoke.spec.ts` · `tests/e2e/a11y-smoke.spec.ts`(발췌) · `docs/req-landing.md` §5.5/§6.1/§6.4/§9.1/§10.2 · `docs/req-test.md` §6.1 · `docs/design/design.md` §4.10/§5.7/§6.6/§6.8/§7.6.

판정 근거 표기: **[C]** 저장소 계약(req-*.md / design.md) · **[W]** WCAG 2.2 성공기준 · **[P]** 플랫폼 관용 패턴(iOS HIG / Material 3 / 모바일 웹 관행) · **[S]** 코드 구조·내부 일관성 · **[측]** 코드에서 계산한 값 · **[미]** 미확인.

---

## 1. GNB 렌더 매트릭스 — 컨텍스트 × 뷰포트

GNB 는 데스크톱 행과 모바일 행을 **둘 다 DOM 에 렌더하고 CSS 로 하나만 보인다** — `gnbDesktopInnerClassName` 이 `hidden h-16 md:flex`(site-gnb.tsx:40), `gnbMobileInnerClassName` 이 `flex h-14 md:hidden`(site-gnb.tsx:41). 경계는 Tailwind `md` = 768px 하나뿐이고, 입력 방식(hover/pointer)은 이 경계에 전혀 관여하지 않는다.

| 컨텍스트 | 모바일 행(<768px) leading / trailing | 데스크톱 행(≥768px) leading / center / trailing |
|:---|:---|:---|
| `landing` | CI 링크 `ViveTest`(:373) / 햄버거 `Menu`(:391) | CI 링크(:264) / History·Blog 링크(:276,:287) / 설정 트리거(:310) |
| `blog` · `history` | Back 버튼(:377) / 햄버거(:391) | CI 링크 / History·Blog 링크 / 설정 트리거 |
| `test` | Back 버튼(:377, `handleTestBack`) / 타이머 `<p>00:00`(:411) | Back 버튼(:254) / 타이머 `<p>00:00`(:271) / **null**(:302) |

`mobileMenuEnabled = context !== 'test'`(site-gnb.tsx:134) 가 test 컨텍스트에서 햄버거를 없애고 그 자리에 타이머를 넣는다. 계약 일치: req-landing.md:242-243 이 Mobile Test 를 Back+Timer 로만 고정하고 햄버거·설정·언어·테마를 금지한다 **[C]**.

높이는 계약과 일치한다 — req-landing.md:218 이 Desktop/Tablet `64`, Mobile `56` 을 못박고 코드는 `h-16`(64px) / `h-14`(56px) 다 **[C][측]**.

---

## 2. 모바일 메뉴의 정체 — 우측 드로어(right-hand drawer). 시트도 전체화면도 아니다

**구조.** `mobileMenuState !== 'closed'` 일 때만 레이어가 마운트된다(site-gnb.tsx:419). 레이어 = `fixed inset-0 z-[1200]`(:80), 그 안에 backdrop `absolute inset-0`(:81-82)와 패널 `absolute right-0 top-0`(:86-87)이 형제로 놓인다. 패널은 `role="dialog" aria-modal="true" aria-label={t('menu')}`(:433-435).

**기하 [측].** 폭 `w-[min(87vw,340px)]` → 390px 뷰포트에서 `min(339.3, 340) = 339.3px`(:87). 높이 `h-screen max-h-screen` + `[height:100dvh] [max-height:100dvh]` — **같은 속성을 named 유틸리티와 arbitrary 유틸리티가 각각 정의**하므로 승자가 Tailwind emit 순서에 달렸다(저장소 자신의 L10 함정, `button-class-names.ts:16-17` 이 같은 함정을 문서화한다) **[S]**; 어느 쪽이 이기는지는 **[미]**. 안쪽 여백 `px-4 pt-4 pb-[calc(32px+env(safe-area-inset-bottom,0px))]`. 테두리는 `border-l border-[var(--border-strong)]` 하나뿐이고 **모서리 반경이 없다**.

**내용 순서.** head(`min-h-10`, 라벨 `Menu` 만, :440-442) → nav 3 링크 Home/History/Blog(:443-466) → `mt-auto` 로 바닥에 붙는 설정 블록(:467-478, `SettingsControls scope="mobile"`).

**여는 수단.** 햄버거 탭 단 하나(:399-405). `mobileMenuState === 'closed'` 면 `setMobileMenuOpen()`, 아니면 `requestMobileMenuClose('button')`. 스와이프 열기 없음(제스처 리스너 0개).

**닫는 수단 3가지.** ① 같은 트리거 재탭 — 단, 패널이 트리거를 덮고 있다(§5 참조). ② backdrop `pointerdown`(:425 → use-gnb-mobile-menu.ts:90-105). ③ `Escape`(site-gnb.tsx:216-236). 패널 안에 닫기 버튼은 **없다** — site-gnb.tsx:88-95 주석이 그 부재를 명시적 보류로 적고 있다.

**애니메이션 [측].** 열 때 애니메이션이 **없다** — 패널은 `[transform:translateX(0)] opacity-100` 인 채로 마운트되고 `data-state=opening` 같은 진입 상태가 존재하지 않는다(types.ts:5 의 상태 집합은 `closed|open|closing` 3개). 닫을 때만 `data-[state=closing]:translate-x-[12px] data-[state=closing]:opacity-0` 가 `[transition:transform_180ms_ease,opacity_180ms_ease]` 로 재생된다(:87). backdrop 도 마찬가지로 닫힘만 `opacity_180ms`(:82). 즉 **비대칭이며, 12px 이동은 339px 폭 드로어의 슬라이드가 아니라 미세 페이드에 가깝다** — 어디서 나타났는지를 말해 주지 않는다 **[P: iOS HIG/M3 의 드로어는 폭 전체를 가로질러 들어오고 나간다]**.

`prefers-reduced-motion` 은 `motion-reduce:[transition:opacity_180ms_ease] motion-reduce:data-[state=closing]:translate-x-0`(:87) 로 이동만 제거한다 **[W 2.3.3 충족]**.

**닫힘 타이밍 [측].** `MOBILE_MENU_CLOSE_DURATION_MS = 180`(behavior.ts:4). `requestMobileMenuClose` 가 상태를 `closing` 으로 바꾸고 180ms 뒤 `completeMobileMenuClose()` 가 `closed` 로 내리며 트리거에 포커스를 돌려준다(use-gnb-mobile-menu.ts:52-72). 닫히는 동안 추가 입력은 `mobileMenuState !== 'open'` 가드로 무시된다(:60) — req-landing.md:239 계약과 일치 **[C]**.

**backdrop pointerdown 즉시 닫힘의 문제.** req-landing.md:237 이 "패널 외부 입력은 `pointer down` 시점에 닫힘을 시작해야 한다"를 **요구**하고, :238 이 스크롤 제스처면 취소하라고 한다. 코드는 그대로다 — `pointerdown` 에서 즉시 `requestMobileMenuClose('outside')`, `pointermove` 가 10px(`MOBILE_MENU_SCROLL_CANCEL_THRESHOLD_PX`, behavior.ts:6)를 넘으면 `cancelMobileMenuCloseFromScroll()` 로 되돌린다(use-gnb-mobile-menu.ts:107-126). **그러나 취소 창은 180ms 뿐이고 취소 조건은 이동뿐이다** — 180ms 를 넘겨 시작한 드래그, 또는 손가락을 떼기만 하는 동작으로는 되돌릴 수 없다. **[W 2.5.2 Pointer Cancellation]** 은 down-event 로 기능을 실행하려면 abort/undo 가 가능하거나 up-event 가 되돌려야 한다고 요구하므로, 현행은 미달 가능성이 높다. **이것은 구현 결함이 아니라 계약 조항(:237) 자체가 표준과 충돌하는 자리다** — 사용자 결정 1(계약 개정 전면 허용)이 적용될 1순위 조항.

---

## 3. 설정 레이어(테마·언어) — 모바일에서 어떻게 열리는가

**모바일(<768px): 레이어가 없다.** 테마·언어 컨트롤은 드로어 바닥에 인라인으로 놓인다(`SettingsControls scope="mobile"`, site-gnb.tsx:468). 즉 모바일에서 설정에 닿는 유일한 경로는 **햄버거 → 드로어 스크롤 하단**이고, 계약(req-landing.md:241,248)과 design.md:264 가 그렇게 규정한다 **[C]**. blog/history 모바일도 같다. **test 컨텍스트에서는 테마·언어에 닿을 길이 아예 없다**(:302 데스크톱 trailing null, :410-414 모바일 타이머) — 계약(:243)이 그렇게 요구한다 **[C]**.

**태블릿·데스크톱(≥768px): 앵커 팝오버.** `gnbSettingsPanelClassName`(:74-75)은 `absolute z-[1] top-[-12px] right-[-15px]`, 폭 `min(324+15, 100vw-24+15)`, `role="dialog"` 이되 `aria-modal` 은 없고 `hidden={!settingsOpen}`(:335).

**여는 경로가 뷰포트 폭에 갈린다 [S].** `hoverOpenEnabled = viewportWidth >= 1024 && hoverCapable`(behavior.ts:8-13, site-gnb.tsx:135-138). 그 값이 `false` 면 트리거의 `onFocus` 가 `openSettingsImmediate()` 를 호출한다(site-gnb.tsx:319-323). 그런데 `onClick` 은 항상 `toggleSettingsOpen`(:324)이다.

> **결함 후보 G-01 (높음).** 포인터 클릭·탭의 이벤트 순서는 `pointerdown → focus → pointerup → click` 이다. `hoverOpenEnabled === false` 인 모든 환경 — ① 768~1023px 의 마우스 데스크톱, ② 모든 폭의 터치 태블릿 — 에서 **첫 탭/클릭은 `onFocus` 로 열고 곧바로 `onClick` 이 닫는다**. 두 번째 탭에서야 열린다(이미 포커스가 있으므로 focus 가 재발화하지 않는다). 근거: site-gnb.tsx:319-324 의 두 핸들러 + behavior.ts:12 의 1024px 하한 **[S]**. E2E 는 이 경로를 덮지 않는다 — `gnb-smoke.spec.ts:347-378` 의 non-hover 테스트가 `trigger.focus()` 를 직접 호출하고 클릭하지 않으며, 설정 관련 테스트의 뷰포트는 1280/1440/1600 뿐이다(:210,:238,:254,:367,:401,:434,:466,:571,:598,:644,:695,:715) **[S]**. 실제 브라우저 재현은 **[미]** — 판정하려면 900px 폭에서 트리거를 클릭하는 단일 Playwright 검사 하나면 된다.

**닫는 경로.** `Escape`(site-gnb.tsx:227-229), 바깥 `pointerdown`(use-gnb-desktop-settings.ts:78-98), `blurCapture` + rAF 1프레임(:63-76), hover 이탈 시 140ms 유예(`DESKTOP_SETTINGS_HOVER_CLOSE_DELAY_MS`, behavior.ts:3 — 계약 :227 의 100~180ms 범위 안) **[C]**.

**라벨 결함 G-02 (중).** 설정 블록에 보이는 라벨은 하나뿐이고 그것이 **테마 행에** 붙어 있다 — `settingsThemeHeadingClassName` 안의 `{labels.theme}`(settings-controls.tsx:127-135), 값은 `gnb.theme` = `"Language ⋅ Theme"`(en) / `"언어 ⋅ 테마"`(kr). 로케일 행(:168-190)에는 보이는 라벨도 `aria-label` 도 없다. 즉 **한 라벨이 두 행을 대표하면서 한 행에만 붙어 있다** — 스크린리더에서 12개 로케일 칩 그룹은 이름 없는 버튼 묶음이 된다 **[S][W 1.3.1 관련]**.

---

## 4. GNB 터치 타깃 전수 — 클래스에서 계산

토큰: `--tap-min: 44px`(globals.css:201) · `--shell-gutter: 16px` (<768) / `20px` (≥768) / `24px` (≥900) (globals.css:323,328,334) · `--gnb-settings-trigger-size: var(--tap-min)`(site-gnb.tsx:66).

| # | 컨트롤 | file:line | 크기 결정 클래스 | 계산 높이 × 폭 | 44px | 24px |
|:--|:---|:---|:---|:---|:---:|:---:|
| 1 | CI 브랜드 링크 (mobile landing) | site-gnb.tsx:373 / 클래스 :45 | `text-base font-bold` — **min-height 없음, padding 없음** | **24 × ~70**(flex item 이라 blockify → line-box 1.5rem) | ✕ | ○(경계값) |
| 2 | CI 브랜드 링크 (desktop) | :264 / :45 | 동일 | **24 × ~70** | ✕ | ○ |
| 3 | Back 버튼 (mobile blog/history/test) | :377 / :63-64,:76 | `min-h-[var(--tap-min)] px-3 py-[7px]` | 44 × ~52 (`뒤로`) ~55 (`Back`) | ○ | ○ |
| 4 | Back 버튼 (desktop test) | :254 / :76 | 동일 | 44 × ~55 | ○ | ○ |
| 5 | 햄버거 `Menu`/`Close` | :391 / :63-64,:77 | 동일 | 44 × ~62 (`Menu`) ~94 (`Schließen`) | ○ | ○ |
| 6 | 설정 트리거 (≥768px 만) | :310 / :67-68 | `h/w-[var(--gnb-settings-trigger-size)] !p-0` | 44 × 44 | ○ | ○ |
| 7 | 데스크톱 nav 링크 History/Blog | :276,:287 / :49-50 | `py-2 text-[0.96rem]` — **min-height 없음** | **39.04 × ~55**(8+8+0.96rem×1.5) | ✕ | ○ |
| 8 | 드로어 nav 링크 3개 | :454 / :100-101 | `min-h-[var(--tap-min)] -mx-3 px-3` | 44 × ~331 (390px 기준) | ○ | ○ |
| 9 | 테마 칩 ×2 (mobile scope) | settings-controls.tsx:144 / :116 | `min-h/min-w-[var(--tap-min)] p-0` | 44 × 44 ※충돌 주의 | ○ | ○ |
| 10 | 테마 칩 ×2 (desktop scope) | :144 / :115 | `min-h/min-w-[var(--gnb-settings-trigger-size)] p-0` | 44 × 44 ※충돌 주의 | ○ | ○ |
| 11 | **로케일 칩 ×12 (desktop scope)** | :174 / :118→:29 | `chipBaseClassName` 만 → `min-h-8 px-[10px] py-[5px] text-[0.8rem]` | **32 × ~40~72** | ✕ | ○ |
| 12 | 로케일 칩 ×12 (mobile scope) | :174 / :118 | `min-h-[var(--tap-min)] px-[14px]` | 44 × ~78 (`English`) | ○ | ○ |
| 13 | consent 수락/거부 | consent-banner.tsx:249,:257 / button-class-names.ts:60 | `min-h-[46px] px-4 py-3` | 46 × ~95 | ○ | ○ |
| 14 | consent `Preferences` | consent-banner.tsx:265 / button-class-names.ts:109 | `min-h-[var(--tap-min)] px-3 py-[10px]` | 44 × ~100 | ○ | ○ |
| 15 | 404 `Return home` | not-found.tsx:38 / button-class-names.ts:117,60 | `min-h-[46px] px-4 py-3` | 46 × ~130 | ○ | ○ |

**44px 미달 4건: #1 #2(24px) · #7(39px) · #11(32px).** 넷 다 **[W 2.5.8 AA 24px 하한은 통과]**하고 **[W 2.5.5 AAA 44px]** 과 **[C design.md:112]** 에 미달한다. design.md:112 의 44px 목록은 "choices, Read more, close button, hamburger" 만 열거하므로 #1·#2·#7·#11 은 **문면상 계약 위반은 아니다** — 즉 이것은 「계약이 이들을 언급하지 않아 방치된 자리」이고, 사용자 결정 1 아래 계약이 먼저 고쳐져야 할 곳이다.

**#11 이 가장 무겁다.** 데스크톱 설정 레이어의 로케일 칩 12개가 32px 이고, settings-controls.tsx:20-24 주석이 그 32px 을 **의도**로 적고 있다("44 each 면 grid 가 wall 이 된다"). 그런데 사용자 결정 2(hover 없는 기기는 768px 이상에서도 터치 생명주기)를 적용하면 **터치 태블릿이 바로 이 32px 칩을 만지게 된다** — 현행 코드에서 `scope` 는 뷰포트 폭(`md`)으로만 갈리고 입력 방식은 보지 않기 때문이다(site-gnb.tsx:338 vs :468). 결정 2 는 이 주석의 전제를 무효화한다.

**#9 #10 의 속성 충돌 [S][미].** `chipBaseClassName` 이 `min-h-8`(32px, settings-controls.tsx:29)을 갖고 scope 클래스가 `min-h-[var(--tap-min)]`(:116) / `min-h-[var(--gnb-settings-trigger-size)]`(:115)를 덧붙인다 — 같은 속성 두 유틸리티, 동일 명시도, 승자는 Tailwind emit 순서. 저장소가 이미 같은 함정을 세 번 기록했다(button-class-names.ts:16-17,:50-53, settings-controls.tsx:33-37). **E2E·단위 어디에도 칩의 계산 높이를 고정하는 단언이 없다** — `gnb-smoke.spec.ts` 의 `boundingBox` 사용 4곳(:157-160)은 hover gap 검증용이고 크기 하한을 보지 않는다. axe 는 `new AxeBuilder({page}).analyze()`(tests/e2e/helpers/axe.ts:21)로 태그 지정 없이 돌지만 **axe 기본 룰셋은 2.5.8 의 24px 만 보고 44px 은 어떤 룰로도 보지 않는다** — 즉 44px 하한은 현재 게이트에 구조적으로 보이지 않는다.

---

## 5. 모달 4요소 — 포커스 트랩 · Escape · 스크롤 잠금 · backdrop

| 요소 | 있는가 | 근거 |
|:---|:---|:---|
| backdrop | **있다** | site-gnb.tsx:421-429, 클래스 :81-82, `absolute inset-0 bg-[var(--overlay-scrim-strong)]` |
| Escape | **있다** | site-gnb.tsx:216-236 — document `keydown`, 드로어 우선, 그 다음 설정 레이어 |
| body 스크롤 잠금 | **있다** | use-gnb-mobile-menu.ts:132-147 — `body.style.overflow='hidden'` + `body.style.touchAction='none'`, cleanup 으로 원복 |
| **포커스 트랩** | **없다** | 아래 |

**포커스 트랩 부재 G-03 (높음) [S][W 2.4.3].** 드로어는 `aria-modal="true"`(site-gnb.tsx:434)를 선언하지만 트랩이 없다. Tab 라우팅은 `routeKeyboardWithinGnb`(use-gnb-tab-routing.ts:35-64)가 하는데 `nextIndex` 가 범위를 벗어나면 **랩하지 않고 `preventDefault` 도 하지 않는다**(:52-56, :58-63의 landing 카드 경로는 `isLandingContext` 전용). 따라서 드로어 마지막 로케일 칩에서 Tab 을 누르면 브라우저 기본 동작으로 **드로어 뒤 페이지 콘텐츠로 포커스가 빠져나간다**. 반대로 첫 타깃(햄버거 트리거, use-gnb-keyboard-targets.ts:72-73)에서 Shift+Tab 도 빠져나간다. 배경에 `inert` 도 `aria-hidden` 도 걸리지 않는다(repo 전체에서 `inert` 는 transition-gnb-overlay.tsx:28 한 곳뿐). `aria-modal=true` 는 스크린리더에게 나머지를 숨기라고 지시하므로, **SR 사용자에게는 없는 콘텐츠를 눈 뜬 키보드 사용자가 탭으로 돌아다니게 된다.**

E2E 가 이것을 못 잡는 이유가 명확하다 — `gnb-smoke.spec.ts:829-877` 의 키보드 매트릭스는 마지막 로케일 칩까지 Tab 한 뒤 **곧바로 Escape 를 누르고 끝난다**(:869-876). 마지막 칩에서 한 번 더 Tab 했을 때의 행선지는 어떤 단언도 갖고 있지 않다 **[S]**.

**내부 비일관 G-04 (중) [S].** 같은 제품의 다른 모달 — `src/features/test/instruction-overlay.tsx` — 는 `role="dialog" aria-modal="true"`(:151-152) 에 **진짜 트랩**(:113-140, first↔last 랩)과 **열릴 때 다이얼로그로 포커스 이동**(:99)을 모두 갖는다. a11y-smoke.spec.ts:679 가 그것을 "focus-trapped" 로 고정하고 있다. 두 모달이 같은 제품에서 반대 구현을 갖는다.

**열 때 포커스가 이동하지 않는다 G-05 (높음) [W 2.4.11 Focus Not Obscured (Minimum), AA].** 드로어가 열려도 포커스는 햄버거 트리거에 그대로 남는다(열기 경로 site-gnb.tsx:399-402 에 `focus()` 호출이 없다). 그런데 **패널이 그 트리거를 완전히 덮는다** — 레이어 z-1200 > 헤더 z-1100, 패널은 `right-0 top-0`, 폭 339.3px, 높이 100dvh 이고 트리거는 우측 `--shell-gutter`=16px 안쪽의 44px 높이 pill 이므로 x∈[약 304, 374] ⊂ 패널 x∈[50.7, 390], y∈[6, 50] ⊂ 패널 y∈[0, 844] **[측]**. site-gnb.tsx:88-95 주석이 `elementFromPoint` 실측으로 같은 사실을 이미 적어 두었다. 게다가 그 트리거는 드로어 열림 상태의 키보드 순서 **첫 번째 타깃**으로 명시적으로 포함된다(use-gnb-keyboard-targets.ts:71-74). 즉 **완전히 가려진 요소가 포커스 순서의 첫 칸**이다 — 2.4.11 위반의 교과서적 형태.

같은 부재가 낳는 두 번째 문제: **드로어에 보이는 닫기 어포던스가 하나도 없다.** 사용자가 쓸 수 있는 것은 backdrop 탭(pointerdown 즉시 닫힘, §2 의 2.5.2 문제)과 물리 Back(안드로이드) 뿐이다. design.md:112 는 "the close button" 을 44px 목록에 넣고 req-landing.md:695 는 "Mobile hamburger/desktop settings/back/**X 버튼**은 `aria-label` 필수" 라고 X 버튼의 존재를 전제한다 — **계약이 전제하는 컨트롤이 구현에 없다** **[C]**.

**스크롤 잠금의 부작용 G-06 (중) [S][P].** `document.body.style.touchAction = 'none'`(use-gnb-mobile-menu.ts:141)은 body 한 원소가 아니라 **그 아래 모든 터치 제스처에 걸린다** — touch-action 은 터치가 시작된 원소부터 조상 체인의 값을 교집합하기 때문이다. 드로어 패널은 body 의 자손이므로(page-shell 이 아니라 SiteGnb 의 fragment 안, site-gnb.tsx:419), 패널의 `overflow-y-auto`·`[-webkit-overflow-scrolling:touch]`(:87)는 **터치로 스크롤되지 않는다**. 드로어 내용 높이 추정 ≈ 16(pt) + 40(head) + 20(gap) + 140(nav 3×44 + 2×4) + 20(gap) + 44(테마 행) + 12 + 약 148(12칩 3줄) + 32(pb) ≈ **472px** **[측, 칩 줄바꿈 수는 추정]**. 세로 844px 에서는 넘치지 않지만 **가로 모드(dvh 390) · 작은 기기 · 브라우저 폰트 확대(WCAG 1.4.4) 에서는 넘치고, 넘치면 손으로 닿을 수 없다.** 실기기 확인 **[미]**.

또한 `overflow:hidden` 방식의 잠금은 **iOS Safari 에서 스크롤 위치를 보존하지 않는 고전적 실패 모드**이며(`position:fixed` + top 오프셋 복원이 관용 해법) **[P]**, 여기에는 그 처리가 없다. 실기기 확인 **[미]**.

**scrim 값 [측].** `--overlay-scrim-strong` = light 에서 `color-mix(in srgb, var(--warm-900) 60%, transparent)` = `rgba(30,26,22,0.60)`(globals.css:286, warm-900=`#1e1a16` :109), dark 에서 `var(--overlay-scrim)` = `rgba(5,4,3,0.72)`(:414,:405). design.md:192 의 intent 는 `rgba(30,26,22,0.48)`("mobile sheet + menu scrim"). **realized 0.60 vs intent 0.48 — 등재되지 않은 R/I 갈림**(AGENTS.md §3-1 기준으로 등재 대상) **[C]**. globals.css:278-286 주석이 D-05 를 언급하지만 현행 값의 등재는 아니다.

**패널 반경 [측].** design.md:272(§6.8 Menu panel)는 `--radius-xl`(=24px, globals.css:192)을 요구하는데 드로어 패널은 반경 유틸리티가 **하나도 없다**(site-gnb.tsx:87). 등재되지 않은 또 하나의 R/I 갈림 **[C]**.

---

## 6. consent-banner — 모바일에서 무엇을 가리는가

**위치 [측].** `fixed inset-x-0 bottom-[max(16px,env(safe-area-inset-bottom))] z-[1075] flex justify-center px-4`(consent-banner.tsx:21). z 순서는 **1075 < GNB 1100 < 드로어 레이어 1200 < transition 오버레이 1300** — 배너는 GNB 를 가리지 않고, 드로어가 배너를 덮는다.

**폭·높이 [측].** 390px 에서 폭 = 390 − 32 = **358px**. `max-[719px]` 분기에서 `flex-wrap`, 메시지 `basis-full`, 액션 `basis-full`, `p-[14px] gap-[14px]`(:241,:245,:248). 높이 = 14 + 메시지 + 14 + 액션행 + 14. 메시지는 `[font:var(--body-sm)]` = `400 14px/1.55`(globals.css:208) → 줄당 21.7px, 내용 폭 330px, en 메시지 201자 → **약 5줄 ≈ 109px**; de 225자 → 5~6줄. 액션행은 46px 버튼 3개가 `flex-wrap gap-2` 로 330px 안에 들어가야 하는데 `Accept all`+`Deny`+`Preferences` 의 합이 330px 을 넘으므로 **2줄로 접힐 가능성이 높다**(→ +54px). 결과 **배너 높이 약 190~250px, 하단 오프셋 포함 약 210~270px** — 844px 뷰포트의 **25~32%** **[측, 추정. 실측 필요 — 기존 실측치는 1280×720 에서 80px 이고(consent-banner.tsx:14-16 주석) 모바일 값은 재지 않았다]**.

**하단 콘텐츠 가림: 문서 흐름은 가리지 않는다.** 같은 컴포넌트가 실측 높이만큼의 spacer 를 렌더한다(:236, 높이 = 배너 높이 + 뷰포트-레이어 하단 간격, :116-120). spacer 는 `<main>` **뒤** 형제로 들어가므로(page-shell.tsx:22-25) 문서가 그만큼 길어지고 마지막 콘텐츠는 배너 위로 밀린다. SSR 추정 120px(:18)에서 마운트 후 실측으로 교체된다.

**대신 가리는 것은 뷰포트 고정 요소다.** 확장된 모바일 카드처럼 `data-consent-banner-avoid` 표식을 단 원소와 겹치는 동안 배너가 `invisible opacity-0` 로 비켜선다(:36-39, :142-232, rAF 루프). 이 프로토콜은 **랜딩 카드 전용**이고, 드로어·에러 화면·404 는 표식을 달지 않는다 — 다만 드로어는 z 로 배너를 덮으므로 문제가 되지 않는다.

**safe-area 처리 [측].** 하단은 `max(16px, env(safe-area-inset-bottom))` 로 정확히 다룬다. **좌우는 `px-4` 뿐이고 `env(safe-area-inset-left/right)` 가 repo 전체에 한 번도 없다** — repo 의 `safe-area` 참조는 정확히 2곳(site-gnb.tsx:87 의 bottom, consent-banner.tsx:21 의 bottom)뿐이고 **top/left/right 는 0곳**이다. 가로 모드 노치 기기에서 배너와 GNB 가 노치 아래로 들어갈 수 있다 **[P]**; 실기기 확인 **[미]**.

**결함 G-07 (중) — 아무 일도 하지 않는 버튼.** `Preferences` 의 핸들러가 `() => {}` 다(telemetry-consent-banner.tsx:32). `title` 은 "Preferences panel coming soon"(messages `consent.preferencesTitle`). **44px 짜리 포커스 가능한 컨트롤이 화면 하단에서 아무 응답도 주지 않는다** **[S][W 3.2.x 관련 · 상태 피드백 부재]**.

**결함 G-08 (낮음) — 네 번째 브레이크포인트.** 배너만 `max-[719px]` 를 쓴다(:241,:245,:248). 저장소의 선언된 계층은 767 / 768 / 900 / 1024 (req-landing.md:185, globals.css:326,332) 이고 719 는 어디에도 없다 **[S][C]**.

---

## 7. 404 · 에러 표면 — 모바일에서 그리는 것과 복귀 수단

| 표면 | 파일 | 셸 | 그리는 것 | 복귀 수단 | 로케일 | 테마 |
|:---|:---|:---|:---|:---|:---|:---|
| Segment 404 | `src/app/not-found.tsx` | root layout **안**, PageShell **밖** | `min-h-screen` 가운데 패널(:11-13) + 44px 경고 아이콘(:15) + h1 "That page is not here" + 본문 1줄 + CTA | **`Return home` 링크 1개**(:38, 46px) | **영어 고정** — 파일 주석 :10 이 "로케일 레이아웃 밖이라 번역되지 않는다(내용 결함)" 로 적음 | 정상(root layout 의 theme-bootstrap 적용) |
| Global 404 | `src/app/global-not-found.tsx` | 자체 `<html>/<body>` | 동일 구성, 본문만 다름(:52) | **`Return home` 링크 1개**(:53) | 영어 고정 | **항상 light** — theme-bootstrap 이 실리지 않는다(:11-16 주석이 실측으로 명시) |
| Test 에러 | `src/app/[locale]/test/error/page.tsx` | **PageShell `context="test"`**(:38-43) | 패널 + 44px X 아이콘(:46) + h1 하나. **그 외 아무것도 없다**(:44-56) | **페이지 안에 0개.** GNB 의 Back 버튼뿐 | **12 로케일 전부에 하드코딩 한국어** `이 테스트에 진입할 수 없습니다`(:30-31), raw variant id 가 그 안에 삽입 | 정상 |

**GNB 도 여기서는 최소다.** test 에러 페이지는 `context="test"` 이므로 모바일에서 **Back + `00:00` 타이머**만 보인다(site-gnb.tsx:377,:411). **에러 화면에 러닝 타이머 자리표시자가 떠 있다** — 의미상 틀린 요소이고, 동시에 테마·언어에 닿을 방법이 없다 **[S]**. `showDefaultConsentBanner={false}`(error/page.tsx:42)라 동의 배너도 없다.

**결함 G-09 (높음) — 계약이 요구한 복구 경로가 구현에 없다 [C].** req-test.md:317 "에러 복구 페이지는 사용자가 다른 테스트를 선택할 수 있는 복구 경로를 제공해야 한다", :848-856 은 미완료 카드 최대 2개 + 0개일 때 "랜딩 페이지로 돌아가기 CTA" 를 규정한다. 현행 페이지는 **카드 0개, CTA 0개**다. req-test.md:841-846 의 "현재 에러 복구 페이지 계약"(crash 금지 · session 미생성 · 메시지 고정)만 충족하는 **의도된 stub** 이며, :848 이하가 "Phase 4 확장 계약" 으로 분리돼 있다. routing-smoke.spec.ts:118-127 은 문자열만 검사한다.

**결함 G-10 (중) — 404 두 장의 카피가 번역되지 않는다 [C][S].** 두 파일 모두 주석에서 이를 내용 결함으로 인정하고 열어 두었다(not-found.tsx:10, global-not-found.tsx:17). 12 로케일 제품에서 404 만 영어다.

**결함 G-11 (중) — global 404 는 항상 라이트다 [측].** 자체 `<html>` 이 `theme-bootstrap.js` 를 싣지 않아 `data-theme` 이 붙지 않는다(global-not-found.tsx:37-38 vs layout.tsx:23-25). 다크 모드 사용자가 흰 화면을 맞는다. req-landing.md:1120-1127(EX-001)이 global-not-found 의 버전 종속 운용을 예외로 등재하고 있으나 **테마 누락은 그 예외에 적히지 않았다**.

**모바일 레이아웃 자체는 문제없다 [측].** 세 표면 다 `grid place-items-center` + `max-w-[520px]`/`max-w-[460px]` + `px-4 py-6` 라서 320px 리플로(**[W 1.4.10]**)에 여유가 있다. test 에러 제목만 `[word-break:keep-all] [overflow-wrap:anywhere]`(error/page.tsx:16)로 긴 variant id 의 가로 넘침을 막는다.

---

## 8. 스크롤 반응 · page-shell 여백

**GNB 는 sticky 이고 hide-on-scroll 이 아니다 [측].** `sticky top-0 z-[1100]`(site-gnb.tsx:38). 스크롤에 반응하는 것은 단 하나 — `useGnbCapability` 가 `scrollY > 4` 를 `elevated` 로 계산하고(use-gnb-capability.ts:34-45), 그 값이 `data-elevated` 로 나가(:360) `data-[elevated=true]:border-[var(--hairline)]` 로 **하단 hairline 을 켠다**(:38, 180ms border-color 전이). 높이 축소·숨김·투명도 변화 없음. req-landing.md:220 은 "shadow 를 적용하고, shadow 가 없으면 1px divider" 를 허용하므로 계약 일치 **[C]**, design.md:269 도 같은 형태를 요구한다.

**배경은 `--gnb-surface` = `color-mix(in srgb, var(--canvas) 88%, transparent)`(globals.css:266) + `blur(12px)`** (site-gnb.tsx:38). 12% 투명이라 뒤 콘텐츠가 비치고, **blur 백드롭은 모바일 GPU 에서 상시 합성 비용을 낸다** — 스크롤 프레임 예산 관점의 후보 **[P]**, 실측 **[미]**.

**`pt-20` / `md:pt-[88px]` 은 무엇을 위한 여백인가 [측] — 고정 바 보정이 아니다.** `<header>` 는 `sticky` 이므로 **문서 흐름에서 자기 높이를 그대로 차지한다**. `<main>` 은 그 형제로 뒤따르므로(page-shell.tsx:21-24) 이미 56px(모바일) / 64px(데스크톱) 아래에서 시작한다. `pt-20`(80px) / `md:pt-[88px]`(88px) 은 **그 위에 더 얹는 순수 상단 여백**이다. 결과 뷰포트 상단 기준 본문 시작점 = **136px(모바일) / 152px(데스크톱)**, 바 바로 아래 공백 = 양쪽 다 **정확히 24px 이 아니라 80px / 88px**.

> **결함 G-12 (중) — 같은 「바 아래 공간」을 세 값이 따로 적는다 [S].** ① `page-shell.tsx:22` = `pt-20`(80) / `md:pt-[88px]`(88). ② `landing-grid-card.tsx:285,292,296` = `max-h-[calc(100dvh-116px)]` — 116 이라는 네 번째 값. ③ `instruction-overlay.tsx:26` = `max-[767px]:pt-[88px]` — **모바일 분기에 데스크톱 값 88 을 쓴다**(모바일 바는 56px, 모바일 셸은 80px). 공유 토큰이 없고, `--shell-gutter` 가 좌우 여백에서 같은 문제를 겪고 토큰으로 고친 바로 그 실패 형태다(globals.css:306-322 이 실측과 함께 기록: "두 표면은 4px 어긋난 채 렌더됐다"). 세로 여백은 아직 고쳐지지 않았다.

**결함 G-13 (낮음~중) — transition 중 GNB 가 둘이 된다 [S].** `page-shell.tsx:20` 이 `TransitionGnbOverlay` 를 `SiteGnb` **앞에** 렌더하고, 그 오버레이는 pending transition 동안 **두 번째 완전한 `SiteGnb` 인스턴스**를 `fixed z-[1300] aria-hidden inert` 로 띄운다(transition-gnb-overlay.tsx:14,:23-31). 그 두 번째 인스턴스도 자기 document 리스너(Escape site-gnb.tsx:232, Tab 라우팅 use-gnb-tab-routing.ts:108, scroll use-gnb-capability.ts:40)를 전부 등록한다. 그리고 `getOrderedKeyboardTargets` 는 `document.querySelector('.gnb-desktop')`(use-gnb-keyboard-targets.ts:32-33)로 **DOM 첫 번째**를 잡는데 그것이 오버레이 쪽이고, 필터인 `isVisibleFocusableElement`(interaction-dom.ts:92-110)는 `hidden`·`aria-hidden`·`display:none`·`visibility:hidden` 만 보고 **`inert` 를 보지 않는다**. 즉 transition 이 진행되는 동안 실제 GNB 의 키보드 타깃 계산이 inert 오버레이를 가리킨다.

---

## 9. 결함 요약 — 심각도 순

| ID | 결함 | 근거 종류 | file:line | 확신 |
|:---|:---|:---|:---|:---|
| G-05 | 열린 드로어가 포커스 순서 첫 타깃(햄버거)을 완전히 덮는다 · 보이는 닫기 컨트롤 0개 | [W 2.4.11 AA] [C req-landing:695, design:112] | site-gnb.tsx:80-95,:391,:419-442 · use-gnb-keyboard-targets.ts:71-74 | 확정 |
| G-03 | `aria-modal="true"` 인데 포커스 트랩 없음 · 배경 inert 없음 · 탭이 뒤로 빠져나간다 | [W 2.4.3] [S] | use-gnb-tab-routing.ts:51-63 · site-gnb.tsx:434 | 확정 |
| G-09 | test 에러 페이지에 계약이 요구한 복구 경로가 0개 | [C req-test:317,848-856] | app/[locale]/test/error/page.tsx:44-56 | 확정 |
| G-01 | `hoverOpenEnabled=false` 구간(768~1023 마우스 · 모든 터치 태블릿)에서 설정 트리거 첫 탭이 열고 바로 닫는다 | [S] | site-gnb.tsx:319-324 · behavior.ts:12 | 코드 경로 확정 / 브라우저 재현 [미] |
| G-06 | `body{touch-action:none}` 이 드로어 자체의 터치 스크롤까지 막는다 · 잠금이 스크롤 위치를 보존하지 않는다 | [S] [P iOS] | use-gnb-mobile-menu.ts:140-141 · site-gnb.tsx:87 | 구조 확정 / 실기기 [미] |
| — | backdrop `pointerdown` 즉시 닫힘 — 취소 창 180ms·이동 전용 | [W 2.5.2] [C req-landing:237 이 요구] | use-gnb-mobile-menu.ts:90-126 · behavior.ts:4,6 | 확정(계약 개정 대상) |
| — | 44px 미달 4건: CI 링크 24px ×2 · 데스크톱 nav 링크 39px · 데스크톱 로케일 칩 32px | [W 2.5.5 AAA] [C design:112 목록 밖] | 표 §4 #1,#2,#7,#11 | 계산 확정 / 실측 [미] |
| G-04 | 같은 제품의 두 모달이 반대 구현(instruction-overlay 는 트랩 + 포커스 이동 있음) | [S] | instruction-overlay.tsx:99,113-140 vs site-gnb.tsx:419-442 | 확정 |
| G-12 | 「바 아래 공간」을 80 / 88 / 116 세 값이 따로 적고, 모바일 오버레이가 데스크톱 값을 쓴다 | [S] | page-shell.tsx:22 · landing-grid-card.tsx:285 · instruction-overlay.tsx:26 | 확정 |
| G-11 | global 404 가 theme-bootstrap 없이 항상 라이트 | [S] [C EX-001 범위 밖] | global-not-found.tsx:37-38 vs layout.tsx:25 | 확정(파일 주석이 실측) |
| G-10 | 404 두 장이 12 로케일 제품에서 영어 고정 | [C] [S] | not-found.tsx:10,36-40 · global-not-found.tsx:17,51-55 | 확정 |
| G-07 | consent `Preferences` 가 no-op 핸들러 | [S] | telemetry-consent-banner.tsx:32 | 확정 |
| G-02 | 설정 블록의 유일한 라벨 `Language ⋅ Theme` 이 테마 행에만 붙고 로케일 행은 무명 | [S] [W 1.3.1] | settings-controls.tsx:127-135,:168-190 | 확정 |
| G-13 | transition 중 두 번째 SiteGnb 가 실제 GNB 의 키보드 타깃 계산을 가로챈다(inert 미필터) | [S] | transition-gnb-overlay.tsx:23-31 · use-gnb-keyboard-targets.ts:32-33 · interaction-dom.ts:96-109 | 확정 |
| G-08 | 배너만 쓰는 네 번째 브레이크포인트 719 | [S] [C req-landing:185] | consent-banner.tsx:241,245,248 | 확정 |
| — | 드로어 열림 애니메이션 부재 · 닫힘만 12px/180ms | [P] [S] | site-gnb.tsx:82,87 · types.ts:5 | 확정 |
| — | 등재 안 된 R/I 갈림 2건: scrim 0.60 vs intent 0.48 · 패널 반경 없음 vs `--radius-xl` | [C AGENTS §3-1] | globals.css:286 vs design.md:192 · site-gnb.tsx:87 vs design.md:272 | 확정 |
| — | `env(safe-area-inset-top/left/right)` 가 repo 전체에 0건 | [P] | 전수 grep 결과 2건 모두 bottom | 부재는 확정 / 영향 [미] |

---

## 10. 리팩터가 건드리게 되는 계약 조항 (사용자 결정 1·2·5 와 직접 충돌)

| 조항 | 내용 | 충돌 |
|:---|:---|:---|
| req-landing.md:237 | 패널 외부 입력은 `pointer down` 시점에 닫힘을 **시작해야 한다** | [W 2.5.2] |
| req-landing.md:185 | Breakpoints Mobile 0~767 / Tablet 768~1023 / Desktop ≥1024 — **폭 기준** | 결정 2(입력 방식 기준) |
| req-landing.md:224 | 설정 레이어 기본 열기 hover(≥1024), 그 밖은 focus/click fallback **허용** | 결정 2 · G-01 |
| req-landing.md:241 | Mobile 최하단 설정 컨트롤은 언어/테마 2개만 | 결정 5(바텀시트·전용 화면 도입 시) |
| req-landing.md:695 | Mobile hamburger / desktop settings / back / **X 버튼** aria-label 필수 | X 버튼이 구현에 없음 |
| design.md:112 | 44×44 대상 목록이 choices / Read more / close button / hamburger **4종뿐** | §4 의 44px 미달 4건이 목록 밖 |
| design.md:192 | `--overlay-scrim: rgba(30,26,22,0.48)` "mobile sheet + menu scrim" | realized 0.60 |
| design.md:272 | 메뉴 패널 `--radius-xl` | realized 반경 없음 |
| req-test.md:848-856 | 에러 복구 카드 최대 2개 + 전체 완료 시 랜딩 CTA | 미구현(Phase 4 로 분리) |

---

## 11. 미확인 — 다음 단계가 재야 할 것

1. G-01 의 실제 브라우저 재현: 900×1200 과 900px 마우스 데스크톱에서 `gnb-settings-trigger` **클릭**(focus 직접 호출 아님) 후 패널 가시성. 현행 E2E 는 이 조합을 한 번도 돌리지 않는다.
2. `min-h-8` vs `min-h-[var(--tap-min)]` / `h-screen` vs `[height:100dvh]` 의 Tailwind v4 emit 순서 승자 — 계산 스타일 1회 측정으로 결정된다.
3. 드로어 실제 콘텐츠 높이와 로케일별 칩 줄 수(12 로케일 × 390px), 그리고 가로 모드(dvh≈390)에서의 넘침 여부.
4. consent 배너의 모바일 실측 높이(390px, 12 로케일) — 기존 실측은 1280×720 의 80px 뿐이고 모바일 값은 재인 적이 없다.
5. iOS Safari 에서 `body{overflow:hidden;touch-action:none}` 잠금의 스크롤 위치 보존 여부와 드로어 내부 팬 가능 여부.
6. 가로 모드 노치 기기에서 GNB·배너의 좌우 safe-area 침범 실측.
7. `backdrop-filter: blur(12px)` 의 모바일 스크롤 프레임 비용.
8. `not-found.tsx` / `global-not-found.tsx` 가 Next 기본 viewport meta 를 받는지 — `global-not-found` 는 자체 `<html>` 을 렌더하므로 확인 필요.
9. 드로어에서 마지막 로케일 칩 다음 Tab 의 실제 행선지(G-03 의 육안 확인) — 코드상 페이지 본문으로 빠지는 것이 확실하나 단언이 없다.
