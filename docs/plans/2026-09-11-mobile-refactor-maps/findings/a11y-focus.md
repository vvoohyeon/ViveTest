# a11y-focus — WCAG 2.2 전수 점검 (모바일 맥락)

대상 clone: `/Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis` (읽기 전용, HEAD `7616211` 착수 마커, 부모 `a5aec95`). 저장소 파일은 수정하지 않았고 `git status --porcelain` 은 비어 있다. 모든 `file:line` 은 이 체크아웃 기준이다.

근거 종류 표기: **[W]** WCAG 2.2 성공기준(번호로 지목) · **[C]** 저장소 계약(`req-*.md` / `design.md`) · **[P]** 플랫폼 관용(iOS HIG · Material 3 · WAI-ARIA APG) · **[S]** 코드 구조·내부 비일관 · **[측]** 이 세션이 토큰/클래스에서 계산한 값 · **[미]** 미확인.

---

## 0. 이 세션이 직접 잰 것

대비비는 `src/app/globals.css` 의 토큰 값을 WCAG 상대휘도 공식에 직접 넣어 계산했다. 스크립트는 `/private/tmp/claude-501/-Users-woohyeon-Local-ViveTest/91a75431-b18f-466b-8d47-1b306568872a/scratchpad/analysis/contrast.py` 에 있고, 아래 표의 모든 수치는 그 출력이다. 렌더 픽셀을 재지 않았으므로 `color-mix` 가 들어간 값(`--gnb-surface`)과 `opacity` 합성값은 사양대로의 산술 합성이며 브라우저 실측이 아니다.

| 대상 | 값 | 요구 | 판정 |
|:---|---:|---:|:---|
| `--fg-disabled`(warm-400) on `--surface-sunken`(warm-100) — 비활성 버튼 라벨, light | **1.96:1** | 4.5 | 1.4.3 은 비활성 컨트롤을 면제한다 → 규범 위반 아님, 가독 실패 |
| 같은 쌍, dark(warm-700 on warm-975) | **2.26:1** | 4.5 | 동일 |
| 현재 선택 로케일 칩 `@opacity .7`: `--accent-fg` on `--sage-muted` over `--surface-raised`, light | **3.11:1** | 4.5 | `disabled` 라서 면제 — 면제되는 것이 문제다(§3-3) |
| 같은 칩, dark | **4.21:1** | 4.5 | 동일 |
| 같은 칩의 **바탕 대 드로어 지면**, light | **1.11:1** | 3.0 | 「현재 선택」을 말하는 유일한 시각 신호가 사실상 보이지 않는다 |
| 모바일 확장 카드 면(`--canvas-elevated`) 대 scrim 처리된 페이지, **dark** | **1.16:1** | 3.0 | 테두리·그림자 둘 다 없음(§2-6) |
| 같은 쌍, light | 3.26:1 | 3.0 | 통과(간신히) |
| GNB 드로어 패널 대 scrim 처리된 페이지, dark | 1.49:1 | 3.0 | 패널의 `--border-strong` 테두리가 4.73:1 로 경계를 대신한다(코드 주석의 실측과 일치) |
| `--muted-aa` on `--canvas` / `--canvas-elevated` / `--surface-soft` | 4.86 / 5.08 / **4.50**:1 | 4.5 | 전부 통과. `--surface-soft`(coming-soon 카드 지면)에서 정확히 경계값 |
| coming-soon 태그 `--tag-fg` on `--tag-bg-unavailable` | 6.76:1 (light) / 5.74:1 (dark) | 4.5 | 통과 |
| unavailable 카드 제목 `--ink` on `--surface-soft` | 15.33:1 | 4.5 | 통과 — §9.3:718 의 「full opacity 유지」가 지켜지고 있다 |
| 포커스 링 `--focus-ring` on `--surface-soft` (§9.3:719 가 이름으로 지목한 자리) | 3.33:1 (light) / 7.58:1 (dark) | 3.0 | **통과** — 조항은 임계가 없지만 실현값은 만족한다 |
| `--hairline` 카드 테두리 on `--canvas-elevated` | 1.29:1 (light) / 1.98:1 (dark) | 3.0 | 카드는 내용으로 식별되므로 1.4.11 단정 불가, 스캔 가능성 문제 |

그리고 게이트 쪽에서 하나를 실측했다. `@axe-core/playwright` 가 쓰는 axe-core **4.11.1 에서 `target-size` 룰은 `enabled: false`** 다(`node_modules/axe-core/axe.js`, `id: 'target-size'` 블록). `tests/e2e/helpers/axe.ts:21` 은 `new AxeBuilder({page}).analyze()` 를 태그·룰 지정 없이 부르므로 기본 룰셋을 쓰고, 따라서 **이 저장소의 axe 실행은 WCAG 2.5.8(24px)을 한 번도 검사하지 않는다.** 기본 비활성 룰 전체는 `aria-roledescription` · `audio-caption` · `color-contrast-enhanced` · `duplicate-id-active` · `duplicate-id` · `identical-links-same-purpose` · `meta-refresh-no-exceptions` · `target-size` 다. 선행 맵 두 편(`contract-landing-2` §Q4 · `surface-blog-history` §2)이 「target-size 가 기본 룰셋에 포함돼 있음을 `axe.getRules()` 로 확인했다」고 적었는데, `getRules()` 는 비활성 룰도 함께 반환하므로 그 확인은 활성 여부를 말하지 않는다 — **두 맵의 그 문장은 정정 대상이다.**

같은 종류의 게이트 맹점이 하나 더 있다. axe-core 는 `aria-hidden-focus` 규칙에 `focusable-modal-open` 체크를 갖고 있어(같은 파일에 그 체크 id 가 실재한다) **열린 모달이 감지되면 통과시킨다.** 그래서 §4-3 의 「`aria-hidden` 서브트리 안에 활성 버튼이 남아 있다」가 `tests/e2e/a11y-smoke.spec.ts:693`·`:729` 의 axe 실행에서 초록으로 나온다. 선행 맵이 「미확인」으로 남긴 메커니즘이 이것이다.

---

## 1. 전 표면에 걸친 것

### 1-1. 라이브 리전이 저장소 전체에 0개다

`grep -rn "aria-live|role=\"status\"|role=\"alert\"|aria-atomic|sr-only|visually-hidden" src/` 의 결과가 **빈 출력**이다. 시각적으로 숨긴 텍스트를 만드는 유틸리티도 없다. 즉 이 제품에는 동적 상태 변화를 AT 에 알릴 수단이 구조적으로 존재하지 않는다 — 카드 확장, 문항 자동 전진, 제출 후 결과 표시, 테마 전환, 로케일 전환, 전환 실패, 동의 저장 어느 것도 알려지지 않는다. **[W 4.1.3 Status Messages (AA)]**

### 1-2. sticky GNB 아래로 포커스가 들어가고, 그것을 막는 선언이 없다

`<header>` 가 `sticky top-0 z-[1100]`(`src/features/gnb/site-gnb.tsx:38`)이고 모바일 높이 56px · 데스크톱 64px 이다(`:40-41`). 그런데 `scroll-margin` · `scroll-padding` · `scroll-mt` · `scroll-pt` 가 `src/` 와 `public/` 전체에 **0건**이다(전수 grep). Shift+Tab 으로 뒤로 이동하면 브라우저는 대상 요소를 뷰포트 **위쪽 가장자리**에 붙이므로, 56px 바 아래 47.75px 답변 행이나 44px pill 은 **완전히 가려진다.** **[W 2.4.11 Focus Not Obscured (Minimum), AA]** 같은 결함이 모바일 확장 카드 내부에도 있다 — `landing-grid-card.tsx:287` 의 헤더가 `sticky top-0 z-[4]` 이고 그 스크롤 컨테이너(`:285` `max-h-[calc(100dvh-116px)] overflow-auto`)에도 `scroll-padding-top` 이 없다.

### 1-3. 랜드마크 4개의 접근 가능한 이름이 영어 리터럴이다

12 로케일 제품에서 다음 넷이 하드코딩 영어다 — `aria-label="Primary"`(`site-gnb.tsx:275`) · `aria-label="Mobile Primary"`(`:443`) · `aria-label="Landing Hero"`(`src/app/[locale]/page.tsx:28`) · `aria-label="Landing Catalog Grid"`(`src/features/landing/grid/landing-catalog-grid.tsx:178`). 뒤의 셋은 사용자 언어가 아닐 뿐 아니라 **구현 용어**다("Mobile Primary" 는 사용자에게 아무 의미가 없고, "Landing Catalog Grid" 는 내부 컴포넌트 이름이다). 랜드마크 이름은 스크린리더의 로터/랜드마크 목록에서 탐색 단위의 이름으로 그대로 읽힌다. **[W 1.3.1] [W 3.1.2 인접]**

### 1-4. `<html lang>` 에 유효하지 않은 언어 태그가 나가고, 10개 로케일은 영어 콘텐츠에 표시가 없다

`src/app/layout.tsx:23` 이 `lang={locale}` 로, `src/i18n/locale-html-lang-sync.tsx:10` 이 `document.documentElement.lang = locale` 로 제품 locale 코드를 그대로 쏜다. 코드 목록은 `src/config/site.ts:1-38` 이고 그중 **`kr` · `zs` · `zt` 는 BCP 47 에 존재하지 않는다**(한국어는 `ko`, 간체는 `zh-Hans`, 번체는 `zh-Hant`). **[W 3.1.1 Language of Page, Level A]** 그리고 블로그 본문·카드 텍스트는 `en`·`kr` 두 로케일만 실존하고 나머지 10개는 영어로 폴백되는데(`src/features/variant-registry/localization.ts:42-45`) 그 영어 조각에 `lang="en"` 이 붙지 않는다. **[W 3.1.2 Language of Parts, AA]** 게이트는 이것을 볼 수 없다 — `tests/e2e/a11y-smoke.spec.ts` 의 axe 실행이 전부 `/en` 라우트에서만 돈다(`:519` · `:532` · `:544`).

같은 종류로, 언어 선택기의 12개 칩이 각각 자기 언어의 문자열(`한국어` · `简体中文` · `हिन्दी` …)을 렌더하면서 `lang` 속성을 갖지 않는다(`src/features/gnb/components/settings-controls.tsx:168-190`). 언어 선택 목록은 각 항목에 그 언어를 표시해야 한다는 것이 3.1.2 의 표준 적용례다.

### 1-5. 터치 타깃 하한을 보는 검사가 게이트에 없다

§0 에서 확인한 대로 axe 의 `target-size` 는 기본 비활성이고, `boundingBox` 로 크기 하한을 단언하는 E2E·단위 검사도 없다. 현재 24px 미만은 없지만(계산상 최소가 GNB CI 링크 24px), **44px 미달 5건**이 게이트 밖에서 방치돼 있다 — CI 브랜드 링크 24px(`site-gnb.tsx:45`, min-height·padding 없음) · 데스크톱 nav 링크 39.04px(`:49-50` `py-2 text-[0.96rem]`) · 데스크톱 로케일 칩 32px(`settings-controls.tsx:29` `min-h-8`) · qualifier 재진입 칩 32px(`src/features/test/surface-class-names.ts:93` `min-h-8`) · `docs/design/ds/preview/secondary-surfaces.html:42,46` 의 히스토리 행 버튼 36px(아직 제품에 없는 명세). `design.md:112` 의 44px 목록이 「choices · Read more · close button · hamburger」 넷만 열거하므로 이 다섯은 **문면상 계약 위반조차 아니다** — 계약이 언급하지 않아 방치된 자리다.

### 1-6. 가로 모드 잠금은 없다 (1.3.4 통과)

`screen.orientation.lock` 호출도 `@media (orientation: …)` 도 `src/`·`public/` 전체에 0건이다. **[W 1.3.4 Orientation — 위반 없음]** 뷰포트 메타도 Next 기본(`width=device-width, initial-scale=1`)이고 `maximum-scale`·`user-scalable=no` 선언이 없으므로 **[W 1.4.4 Resize text]** 의 확대 차단도 없다.

---

## 2. 랜딩 — 카드 확장

### 2-1. 모바일 확장은 AT 에 아무 일도 일어나지 않은 것으로 보인다

`aria-expanded` 는 `!isMobileViewport && !isUnavailable` 일 때만 붙는다(`landing-grid-card.tsx:1198-1200`). 그래서 모바일에서 카드를 열면 트리거의 상태가 바뀌지 않고, `aria-controls` 도 없고, `role="dialog"`/`aria-modal` 도 없고(`src/features/landing/**` 전수 grep 0건), 열 때 포커스가 이동하지도 않는다. scrim 이 전면을 덮고(`landing-catalog-grid.tsx:198-208`) 다른 카드가 `pointer-events:none` 이 되는(`landing-grid-card.tsx:1166`) 동안, 스크린리더 사용자에게는 **어떤 변화도 통지되지 않는다.** **[W 4.1.2 Name Role Value]** 이 결함의 출처는 구현이 아니라 계약이다 — `docs/req-landing.md:705` 가 `aria-expanded` 의 소유자를 「Desktop/Tablet available Test trigger」로 못박는다. 사용자 결정 2 를 적용해 터치 태블릿이 모바일 생명주기로 넘어오면, 지금 `aria-expanded` 를 갖고 있던 그 기기가 **속성을 잃는다.**

### 2-2. 계약이 카드 내용 대부분을 접근성 트리에서 지운다

available test 카드의 1차 트리거는 `<button aria-label={card.title}>`(`landing-grid-card.tsx:1187-1205`)이고, 카드의 썸네일·제목 `<h2>`·부제·태그 `<ul>` 이 **전부 그 버튼 안에** 있다(`:1069-1093` → `NormalCardFace`). ARIA 1.2 는 `role="button"` 에 **Children Presentational: True** 를 명시하므로 버튼의 자손은 접근성 트리에서 제거되고, 여기에 `aria-label` 이 이름을 저자 지정으로 덮으므로 **부제와 태그는 어떤 경로로도 읽히지 않는다.** 시각 사용자가 카드에서 얻는 정보 넷 중 둘이 AT 에 존재하지 않는다. **[W 1.3.1 Info and Relationships]** unavailable 카드만 예외다 — `aria-labelledby`/`aria-describedby` 로 제목과 coming-soon 태그를 각각 참조하므로(`:1196-1197`) 상태는 전달된다. 이것도 계약이 원인이다: `req-landing.md:704` 가 「available Test trigger 의 accessible name 은 `card.title` 단일값으로 고정」을 요구한다.

같은 이유로 **카드 제목이 제목(heading)으로도 노출되지 않는다.** 랜딩에는 `<h1>`(hero, `app/[locale]/page.tsx:29`) 하나뿐이고 카드 제목 8개는 전부 버튼 안의 `<h2>`(`landing-grid-card.tsx:401`)라 presentational 이다. 390px 에서 3.76 화면을 스크롤해야 하는 목록에서 **제목 단위 탐색이 불가능하다.**

### 2-3. OPEN 상태의 트리거는 높이 0의 죽은 포커스 정거장이다

카드가 열리면 트리거는 `[min-height:0] [padding:0]`(`landing-grid-card.tsx:1058`)이 되고 그 내용은 `[height:0] [min-height:0] overflow-hidden`(`:1064`)이 되지만 **DOM 에 남고 `tabIndex` 도 살아 있다**(자기 카드이므로 `mobileInteractionLocked` 가 false → `use-landing-interaction-controller.ts:697-699` 가 `tabIndex: 0`, `ariaDisabled: false`). 그 상태에서 활성화하면 아무 일도 일어나지 않는다 — 클릭 경로는 `mobileLifecycleState.phase === 'NORMAL'` 을 요구하고(`use-landing-interaction-controller.ts:578-583`), Enter/Space 경로도 같다(`use-card-keyboard-handler.ts:272-277`). 결과: **카드 제목을 이름으로 갖고, 면적이 0이며, 눌러도 아무 반응이 없는 컨트롤이 탭 순서 안에 있다.** **[W 2.4.7 Focus Visible]** **[W 4.1.2]** **[P 3.2.4 인접 — 같은 이름의 컨트롤이 상태에 따라 동작하기도 하고 안 하기도 한다]**

### 2-4. 포커스 링이 뷰포트 밖에 그려진다

카드의 포커스 표시는 트리거가 아니라 루트가 갖는다 — 트리거는 `focus:outline-none`(`landing-grid-card.tsx:215`)으로 자기 링을 끄고, `.root:not(.desktopOverlayLayer):has(:focus-visible)` 이 `outline: 2px solid var(--normal-focus-ring); outline-offset: 2px` 를 건다(`landing-grid-card.module.css:81-84`). 그런데 모바일 OPEN 상태의 루트는 `w-screen mx-[calc(50%-50vw)]`(`:1042`) 이므로 폭이 정확히 100vw 다. `outline-offset: 2px` 는 링을 요소 바깥 2px 에 그리므로 **세로 링 두 줄이 x = −2px 과 x = 뷰포트폭+2px 에 놓인다 — 화면 밖이다.** 남는 것은 위·아래 가로 줄뿐이고, 그마저 `:has(:focus-visible)` 이라 **닫기 X · 답변 A · 답변 B · 0높이 트리거 중 무엇이 포커스돼 있어도 똑같이 그려진다** — 어느 컨트롤이 포커스인지 말하지 못한다. **[W 2.4.7]** **[측: 기하는 클래스에서 유도했고 브라우저 실측이 아니다]**

### 2-5. 닫기 X 버튼만 디자인 시스템의 포커스 링을 쓰지 않는다

`LANDING_GRID_CARD_MOBILE_CLOSE_BASE_CLASSNAME`(`landing-grid-card.tsx:278-279`)에 `focusRingClassName` 도 `focus-visible:` 선언도 없다. 저장소의 다른 모든 컨트롤 — GNB pill(`site-gnb.tsx:64`) · 칩(`settings-controls.tsx:29`) · 답변 행(`surface-class-names.ts:83`, `landing-grid-card.tsx:235`) · 블로그 목록 행(`blog-destination-client.tsx:45`) · 버튼 어휘 전부(`button-class-names.ts:68,75,118`) — 는 같은 링을 쓴다. Tailwind v4 preflight 는 outline 을 리셋하지 않으므로(`node_modules/tailwindcss/preflight.css` 에 `:-moz-focusring{outline:auto}` 외에 outline 선언 없음) UA 기본 링이 남아 **2.4.7 위반은 아니다.** 그러나 §2-4 의 화면 밖 루트 링과 겹쳐서, 확장 카드에서 유일하게 확실히 보여야 하는 컨트롤이 시스템 밖 표현을 받는다. **[S]**

### 2-6. 다크에서 확장 카드와 페이지 사이에 경계가 없다

모바일 OPEN 의 시각 클래스는 `[background:var(--expanded-card-surface)] [box-shadow:none]`(`landing-grid-card.tsx:1021-1022`)이고 **테두리 선언이 없다** — `--expanded-card-border`(`landing-grid-card.module.css:72`)를 소비하는 곳은 데스크톱 `expandedSurface`(`landing-grid-card.tsx:276`) 하나뿐이다. 다크에서 카드 면은 `--canvas-elevated` = warm-900 이고 그 주변은 `--overlay-scrim-medium` = `rgba(5,4,3,0.72)` 가 덮인 warm-950 이다. **측정: 1.16:1.** 같은 문제를 저장소는 다른 두 표면에서 이미 진단하고 고쳤다 — GNB 드로어는 `--border-strong` 테두리를 갖고 코드 주석이 「scrim 은 near-black 페이지를 1.04:1 밖에 어둡게 못 하므로 패널의 경계가 가르는 일을 한다(4.73:1)」고 적었으며(`site-gnb.tsx:83-85`, 내 재계산도 4.73:1), instruction 다이얼로그도 같은 이유로 `--border-strong` 를 얻었다(`surface-class-names.ts:20-23,43-45`). 모바일 확장 카드만 그 수정을 받지 못했다. **[W 1.4.11 Non-text Contrast]** **[S]**

### 2-7. scrim 뒤의 카드 7장이 접근성 트리에 그대로 남는다

카드가 열리면 나머지 카드는 `ariaDisabled: true` · `tabIndex: -1` · `pointerEvents: 'none'` 을 받는다(`use-landing-interaction-controller.ts:697-699`, `landing-grid-card.tsx:1166`). **`inert` 는 걸리지 않는다** — `inert={keyboardModeBlocked}`(`:1146`)이고 `isKeyboardModeBlocked` 는 `hoverLock.enabled && keyboardMode` 를 요구하는데(`interaction-state.ts:474-482`), tap 모드의 `MODE_SYNC` 가 `hoverLock.enabled` 를 끈다(`:253-265`). 즉 모바일에서 `inert` 는 **결코 참이 되지 않는다.** 결과: 전면 scrim 이 깔린 상태에서 스크린리더 스와이프로 뒤 카드 7장을 계속 읽을 수 있고, 그것들은 「사용 불가(dimmed)」로 읽힌다 — 실제로는 사용 불가가 아니라 가려진 것이다. **[W 1.3.1]** **[W 4.1.2]**

### 2-8. 모바일에서 Escape 가 아무 일도 하지 않는다

`handleCardKeyDown` 은 `isMobileViewport` 면 즉시 반환한다(`use-landing-interaction-controller.ts:429-438`). GNB 의 document Escape 핸들러도 드로어와 설정 패널만 본다(`site-gnb.tsx:216-236`). 그래서 모바일 확장 카드가 열린 상태의 Escape 는 전역에서 no-op 다. 이것은 계약이 요구한 것이다 — `req-landing.md:582`(「Mobile card-root Escape/blur 는 … mobile state 를 변경하면 안 된다」)와 `:632`(「닫기 경로는 X 버튼 또는 backdrop 탭만」). 같은 제품의 다른 세 오버레이(instruction 다이얼로그 · GNB 드로어 · 설정 패널)는 전부 Escape 로 닫힌다. **[W 3.2.4 Consistent Identification 인접]** **[P WAI-ARIA APG dialog]** 사용자 결정 2 로 블루투스 키보드가 달린 태블릿이 모바일 생명주기에 들어오면 이 no-op 이 그 기기의 표준 닫기 키를 삼킨다.

### 2-9. 카탈로그 8장이 집합으로 표현되지 않는다

그리드는 `<section aria-label="Landing Catalog Grid">` 안의 `<div class="landing-grid-row">` 들이고(`landing-catalog-grid.tsx:176-232`) 목록 시맨틱이 없다. 태그는 `<ul>/<li>` 로 올바르게 쓰면서(`landing-grid-card.tsx:469-498`) 카드 집합 자체는 아니다. 스크린리더 사용자는 「몇 개 중 몇 번째」를 얻지 못한다 — 1열 · 3.76 화면인 모바일에서 그 손실이 가장 크다. **[W 1.3.1]**

---

## 3. GNB · 설정 레이어

### 3-1. 드로어가 열리면 포커스가 완전히 가려진 요소에 남는다

`setMobileMenuOpen`(`src/features/gnb/hooks/use-gnb-mobile-menu.ts:49-51`)에 `focus()` 호출이 없다 — 포커스는 햄버거 트리거에 그대로 남는다. 그런데 레이어가 `fixed inset-0 z-[1200]`(`site-gnb.tsx:80`)이고 패널이 `absolute right-0 top-0 w-[min(87vw,340px)] [height:100dvh]`(`:87`)이며 헤더는 z-1100 이다(`:38`). 390px 에서 패널은 x ∈ [50.7, 390] 을 덮고 햄버거는 `--shell-gutter`=16px 안쪽의 44px pill 이므로 x ∈ 약 [312, 374] · y ∈ [6, 50] — **완전히 패널 아래다.** 저장소 자신이 그 사실을 `elementFromPoint` 로 이미 측정해 주석에 적어 두었다(`site-gnb.tsx:88-95`: 「the panel sits above the bar (z 1200 over 1100) and covers the hamburger … measured with elementFromPoint at the hamburger's centre, which returns the panel」). 게다가 그 트리거는 드로어 열림 상태 키보드 순서의 **첫 번째 타깃으로 명시 포함된다**(`src/features/gnb/hooks/use-gnb-keyboard-targets.ts:71-74`). **완전히 가려진 요소가 포커스 순서의 첫 칸** — **[W 2.4.11 Focus Not Obscured (Minimum), AA]** 의 교과서적 형태다.

### 3-2. `aria-modal="true"` 인데 포커스가 갇히지 않는다

패널은 `role="dialog" aria-modal="true"`(`site-gnb.tsx:433-435)를 선언한다. 그러나 Tab 라우팅(`use-gnb-tab-routing.ts:35-63`)은 `nextIndex` 가 범위를 벗어나면 **랩도 `preventDefault` 도 하지 않는다**(`:51-63`; 랩이 있는 것은 landing 전진 경로 하나뿐). 배경에 `inert` 도 `aria-hidden` 도 걸리지 않는다(`inert` 는 저장소 전체에서 `transition-gnb-overlay.tsx:28` 한 곳뿐). 그래서 마지막 로케일 칩에서 Tab 하면 브라우저 기본 동작으로 **드로어 뒤 페이지 콘텐츠**로 나가고, Shift+Tab 도 첫 타깃에서 나간다. `aria-modal="true"` 는 AT 에 「나머지는 없다」고 말하므로, **SR 사용자에게 존재하지 않는 콘텐츠를 눈 뜬 키보드 사용자가 탭으로 돌아다니게 된다.** **[W 2.4.3 Focus Order]** **[W 4.1.2 — 선언한 상태가 사실이 아니다]** 같은 제품의 instruction 다이얼로그는 진짜 트랩(`src/features/test/instruction-overlay.tsx:113-139`)과 열 때 포커스 이동(`:99`)을 둘 다 갖는다 — 두 모달이 정반대로 구현돼 있다. **[S]**

### 3-3. 드로어에 보이는 닫기 컨트롤이 0개다

패널 안에 닫기 버튼이 없고(`site-gnb.tsx:437-478` 전체), §3-1 대로 트리거는 패널 아래에 있다. 남는 닫기 경로는 backdrop `pointerdown`(`:425` → `use-gnb-mobile-menu.ts:90-105`)과 Escape 뿐인데 모바일에 Escape 키는 없다. 계약은 X 버튼의 **존재를 전제한다** — `req-landing.md:695` 「Mobile hamburger/desktop settings/back/**X 버튼**은 `aria-label` 필수」, `design.md:112` 가 44×44 목록에 「the close button」을 넣는다. 즉 **계약이 전제하는 컨트롤이 구현에 없다.** **[C]** 저장소는 그 부재를 알고 있고 이유를 적어 두었다(`site-gnb.tsx:88-95`: 닫기 버튼을 넣으면 드로어의 탭 순서가 바뀌고 두 개의 @smoke 키보드 매트릭스 검사가 그것을 고정하고 있어 「behavior outranks the visual」로 연기했다). **검사가 결함의 수정을 막고 있는 자리다.**

그리고 유일하게 남은 그 backdrop 경로가 `pointerdown` 즉시 닫힘이다. 취소 창은 180ms(`behavior.ts:4`) 안의 10px 이동(`:6`)뿐이므로, 눌렀다가 마음을 바꾸거나 손가락을 그대로 떼는 입력으로는 되돌릴 수 없다. **[W 2.5.2 Pointer Cancellation]** 이것도 계약이 요구한 것이다 — `req-landing.md:237` 「패널 외부 입력은 `pointer down` 시점에 닫힘을 시작해야 한다」.

### 3-4. 「현재 선택」을 `disabled` 로 표현해 키보드·SR 에서 도달 불가로 만든다

테마 칩과 로케일 칩 둘 다 현재 값에 `disabled={isCurrentTheme}` / `disabled={isCurrentLocale}` 를 건다(`settings-controls.tsx:158,182`), 동시에 `aria-pressed={isCurrentTheme}` / `aria-pressed={isCurrentLocale}`(`:152,181`)도 건다. 결과 셋: ⑴ **현재 선택 항목만 탭 순서에서 빠진다** — 키보드 사용자는 12개 중 11개만 순회하고 자기가 지금 무엇을 쓰고 있는지 칩에서 확인할 길이 없다. ⑵ `aria-pressed="true"` 는 토글 가능함을 뜻하는데 같은 요소가 `disabled` 라 **선언이 서로 모순한다.** ⑶ `disabled:opacity-70`(`:29`)이 걸려 현재 선택이 **가장 흐리게** 보인다 — 측정 3.11:1(light) / 4.21:1(dark), 그리고 그 「선택됨」을 말하는 `--sage-muted` 바탕은 드로어 지면 대비 **1.11:1** 로 사실상 보이지 않는다. **[W 4.1.2]** **[W 1.3.1]** 그리고 이 셋 전부가 **WCAG 의 「비활성 컨트롤」 면제 아래로 들어가 어떤 자동 검사도 잡을 수 없다** — `disabled` 를 선택 표시로 쓴 결정이 규범의 사각지대를 만든 것이다. 올바른 형태는 `disabled` 를 떼고 `aria-pressed`(이미 있다) 또는 `aria-current` 로 현재를 말하며, 현재 값 클릭은 no-op 으로 두는 것이다.

### 3-5. 로케일 행에 접근 가능한 이름이 없다

설정 블록에 보이는 라벨은 하나뿐이고 그것이 **테마 행에** 붙어 있다 — `settingsThemeHeadingClassName` 안의 `{labels.theme}`(`settings-controls.tsx:127-135`), 값은 `gnb.theme` = `"Language ⋅ Theme"`(en) / `"언어 ⋅ 테마"`(kr)다. 로케일 행(`:168-190`)에는 보이는 라벨도 `aria-label` 도 `role="group"` 도 없다. 즉 **한 라벨이 두 행을 대표하면서 한 행에만 붙어 있고**, 12개 로케일 칩은 스크린리더에서 이름 없는 버튼 묶음이 된다. **[W 1.3.1]**

### 3-6. 설정 패널은 `role="dialog"` 인데 포커스를 받지도 돌려주지도 않는다

패널은 `role="dialog" aria-label={t('settings')}`(`site-gnb.tsx:331-332`)이되 `aria-modal` 이 없고, 열릴 때 포커스가 들어가지 않으며(열기 경로는 hover 또는 `onFocus`/`onClick`, `:319-324`), **닫힐 때 포커스를 트리거로 돌려주지 않는다** — Escape 핸들러는 `closeSettingsImmediate()` 만 부른다(`:227-229`). 패널은 `hidden={!settingsOpen}`(`:335`)이므로 칩에 포커스가 있는 상태에서 Escape 를 누르면 포커스된 요소가 렌더에서 사라지고 **포커스가 `<body>` 로 떨어진다.** 드로어(`use-gnb-mobile-menu.ts:55`)와 instruction 다이얼로그(`instruction-overlay.tsx:84-95`)는 둘 다 복귀를 구현한다 — 세 번째 비일관이다. **[W 2.4.3]** **[S]**

여기에 더해, hover 가 없는 기기에서 **첫 탭이 열고 곧바로 닫는다.** `hoverOpenEnabled = viewportWidth >= 1024 && hoverCapable`(`behavior.ts:8-13`)이 false 면 트리거의 `onFocus` 가 `openSettingsImmediate()` 를 호출하는데(`site-gnb.tsx:319-323`) `onClick` 은 항상 `toggleSettingsOpen`(`:324`)이다. 포인터 입력의 순서는 `pointerdown → focus → pointerup → click` 이므로 768~1023px 마우스 데스크톱과 **모든 터치 태블릿**에서 첫 탭은 열고 닫는다. 사용자 결정 2 는 이 구간을 넓힌다. E2E 는 이 조합을 한 번도 돌리지 않는다 — 설정 관련 테스트의 뷰포트가 1280/1440/1600 뿐이고 non-hover 케이스는 `trigger.focus()` 를 직접 호출한다(`tests/e2e/gnb-smoke.spec.ts:347-378`). **[S]** **[미 — 브라우저 재현 안 함]**

---

## 4. 테스트 플로우

### 4-1. 문항이 바뀔 때마다 포커스가 `<body>` 로 떨어진다

답변 그리드가 `<motion.div key={currentQuestionIndex}>`(`src/features/test/test-question-client.tsx:353-359`)다. React 는 `key` 가 바뀌면 서브트리를 언마운트하고 다시 마운트하므로, **방금 활성화한 답변 버튼이 DOM 에서 사라지고 포커스는 문서로 돌아간다.** 답변은 150ms 후 자동 전진이 계약이므로(`req-test.md:677-678`, `src/features/test/use-answer-lock.ts:32`) 이 일이 **문항마다 한 번씩** 일어난다. 키보드·스위치·스크린리더 사용자는 한 문항 답할 때마다 GNB 부터 다시 Tab 해 내려와야 한다. 제출도 같다 — `submitted ? <ResultConnector/> : <>…</>`(`:281-290`)이므로 제출 버튼이 언마운트되고 결과 패널로 포커스가 이동하지 않으며 알림도 없다(§1-1). **[W 2.4.3 Focus Order]** **[W 4.1.3 Status Messages]** `src/features/test/**` 에 `focus()` 호출은 `instruction-overlay.tsx` 안에만 있고 `scrollIntoView`/`scrollTo` 는 0건이다.

### 4-2. GNB 가 모달 위에 있고, 거기서 회차를 버릴 수 있다

레이어 순서는 transition 오버레이 1300 > GNB 드로어 1200 > **GNB 셸 1100** > 동의 배너 1075 > **instruction 오버레이 1050** 이다(`site-gnb.tsx:38`, `instruction-overlay.tsx:145`). `page-shell`·`body`·`html` 어디에도 스태킹 컨텍스트를 만드는 속성이 없다(`page-shell.tsx:19`, `src/app/app-body-class.ts`, `layout.tsx:22-33`). 그래서 `aria-modal="true"` 다이얼로그가 열린 채 **GNB 의 `뒤로` 버튼이 포인터로 도달 가능**하고, 그 버튼은 `window.history.back()`(`src/features/gnb/hooks/use-gnb-back-navigation.ts:53`)이며 `useBeforeUnloadGuard` 는 문서 언로드에만 걸리므로(`use-before-unload-guard.ts:22-27`) **진행 중인 회차가 확인 없이 버려진다.** `instruction-overlay.tsx:26` 의 `max-[767px]:pt-[88px]` 가 바로 그 GNB 를 피해 내용을 밀어 내린 흔적이다. **[W 4.1.2]** **[W 2.4.11 — 모바일에서 다이얼로그 상단 88px 이 바 아래에 있다]** **[P WAI-ARIA APG]**

### 4-3. 다이얼로그의 포커스 트랩이 문서 레벨 핸들러 하나로 무효화된다

트랩은 다이얼로그 요소의 React `onKeyDown` 이다(`instruction-overlay.tsx:151-157` → `:102-139`). 즉 **포커스가 다이얼로그 안에 있을 때만** 동작한다. 그런데 GNB 는 `document` 에 capture 단계 `keydown` 리스너를 항상 걸어 두고, `activeElement` 가 `body`/`documentElement`/`null` 이면 Tab 을 가로채 **GNB 의 첫 타깃으로 포커스를 보낸다**(`use-gnb-tab-routing.ts:73-111`, 특히 `:85-89`·`:104-105`). 사용자가 scrim(포커스 불가 `<div>`, `:145`)을 탭하면 포커스는 body 로 떨어지고, 그 다음 Tab 한 번이 **모달 밖 GNB 로 포커스를 옮긴다.** 트랩이 다시 개입할 방법은 없다. **[W 2.4.3]** **[S]**

### 4-4. 모달이 페이지의 절반만 숨기고, 그 절반 안에 활성 버튼이 남는다

오버레이가 열릴 때 `aria-hidden="true"` 가 붙는 것은 `test-question-panel` **하나뿐**이다(`test-question-client.tsx:334`). 같은 `<section>` 안의 `<header>` — `<h1>` 카드 제목(`:255`)과 `role="progressbar"`(`:271`) — 는 `aria-hidden` 도 `inert` 도 아니다. 그리고 `aria-hidden` 서브트리 안에 **비활성화되지 않은 `<button>` 둘**(답변 A/B, `disabled={isAnswerLocked}` = false)과 qualifier 재진입 칩이 남는다. `inert` 를 쓰지 않으므로 포인터 도달도 막히지 않고, ≥768px 에서는 다이얼로그가 화면 일부만 덮으므로 실제로 누를 면적이 있다. **[W 1.3.1]** **[W 4.1.2]** §0 에서 확인한 대로 axe 는 `focusable-modal-open` 체크 때문에 이 상태를 통과시킨다.

### 4-5. qualifier 칩이 `role="button"` 이고, 보이는 라벨이 이름에 없다

`src/features/test/qualifier-chip.tsx:24-32` 가 `<div role="button" tabIndex={0} aria-label={ariaLabel}>` 이다. 계약이 이것을 명시적으로 금지한다 — `req-landing.md:711` 「`role="button"` 대체 구현은 금지하며, 불가피한 경우 Section 15 Exception Registry 등록 후에만 허용」, 그리고 §15 에 a11y 예외 항목은 0건이다. **[C]** 가드는 이것을 볼 수 없다 — `scripts/qa/check-phase8-accessibility-contracts.mjs:33-35` 의 `role="button"` 금지 검사가 `landing.grid.gridCard` 한 파일만 읽는다. **[S]** 더해 `aria-label` 은 `test.qualifierChipAriaLabel` = `"Change qualifier answers"` / `"사전 질문 답변 변경"` 인데 칩의 보이는 텍스트는 선택한 값(예: `Male` / `남성`, `test-question-client.tsx:230-239`)이다. **접근 가능한 이름이 보이는 라벨을 포함하지 않는다** — **[W 2.5.3 Label in Name, Level A]** 음성 제어 사용자가 화면에 보이는 말로 이 컨트롤을 부를 수 없다.

### 4-6. `/test/error` 는 복구 경로가 0개이고, 12 로케일 전부에 한국어가 나간다

`src/app/[locale]/test/error/page.tsx:44-56` 이 렌더하는 것은 `aria-hidden` X 아이콘 하나와 `<h1>` 하나뿐이다 — **CTA·링크가 0개.** 계약은 미완료 카드 최대 2장과 0장일 때의 랜딩 CTA 를 요구한다(`docs/req-test.md:317`, `:848-856`). **[C]** 제목 문자열은 `'이 테스트에 진입할 수 없습니다'` 하드코딩이고 raw variant id 가 그 안에 삽입된다(`:29-31`) — `<html lang="de">` 아래 한국어가 나가므로 **[W 3.1.2]**, 그리고 페이지 안에 나갈 길이 없어 남는 것은 GNB 의 `뒤로` 뿐이다. 그 GNB 는 `context="test"` 라 모바일에서 **`뒤로` + `00:00` 타이머 자리표시자**만 그린다(`site-gnb.tsx:410-414`) — 에러 화면에서 진행 중 타이머를 읽어 주는 것은 의미상 틀린 정보다. **[S]**

---

## 5. 블로그 · 히스토리 · 404

### 5-1. 블로그 상세의 `<h1>` 이 12px 짜리 영역 라벨이다

`src/features/blog/blog-destination-client.tsx:112` 의 삼항이 `article` 이 있으면 `<h1>` 에 `blogKickerClassName`(`:32`, `[font:var(--overline)]` = 600 12px/1.4)을 준다. 그 결과 문서의 유일한 `<h1>` 은 `"Selected article"` 이고, 시각적으로 가장 큰 30px 텍스트인 기사 제목은 `<h2>`(`:115`)다. **DOM 위계와 시각 위계가 반대**이고, 형제 `<h2>` 둘이 30px(`blogArticleTitleClassName`)와 20px(`blogSectionTitleClassName`)로 갈린다. axe 는 못 잡는다 — `heading-order` 는 레벨 건너뛰기만, `page-has-heading-one` 은 존재만 본다(둘 다 `best-practice` 태그). **[W 1.3.1]** **[W 2.4.6 Headings and Labels, AA]**

### 5-2. 히스토리 빈 상태에 행동이 0개이고 디버그 문자열이 본문에 있다

`src/app/[locale]/history/page.tsx:46-48` 이 `<h1>{t('title')}</h1>` · `<p>{t('body')}</p>` · **`<p>{`Locale: ${locale}`}</p>`** 셋을 렌더한다. 세 번째는 파일 주석이 스스로 「페이지 본문에 남아 있는 디버그 문자열이며 내용 결함으로 보고할 대상」이라고 적은 것이다(`:10-11`). 그리고 빈 상태에 **행동이 없다** — `history.goHome`·`history.open`·`history.delete`·`history.clearAll` 네 키가 12 로케일 전부에 번역돼 있는데 소비자가 0이다. 저장소 자신의 보이스 규칙은 `docs/design/ds/README.md:66` 에서 「Empty states are one line of guidance + one action」이다. **[C]** **[S]** 결과 화면의 `goHistory` CTA(`test-result-panel.tsx:95-99`)가 이 막다른 길로 사용자를 보낸다.

### 5-3. 404 두 장이 로케일 `lang` 아래에서 영어만 렌더한다

`src/app/not-found.tsx` 는 루트 레이아웃 **안**이므로 `<html lang={요청 locale}>` 아래에서 렌더되는데 카피는 영어 고정이다(`:36-38`) — 파일 주석이 그것을 인정한다(`:10`). `/de/없는경로` 는 `lang="de"` 문서에 영어 본문이 나가고 `lang` 표시가 없다. **[W 3.1.2]** `src/app/global-not-found.tsx:37` 은 자체 `<html lang={defaultLocale}>` = `"en"` 이라 태그 자체는 유효하다.

---

## 6. 게이트가 구조적으로 보지 못하는 것 — 요약

| 결함 | 왜 안 잡히는가 |
|:---|:---|
| 44px 터치 타깃 미달 5건 | axe `target-size` 가 **기본 비활성**(`enabled: false`), 크기 하한을 보는 단언 0건 |
| `aria-hidden` 안의 활성 버튼(§4-4) | axe `aria-hidden-focus` 의 `focusable-modal-open` 체크가 모달 열림을 통과로 본다 |
| 현재 선택 칩의 대비·도달 불가(§3-4) | `disabled` 라서 1.4.3·1.4.11·2.4.7 의 「비활성 컨트롤」 면제로 들어간다 |
| 드로어 Tab 탈출(§3-2) | `gnb-smoke.spec.ts:829-877` 의 키보드 매트릭스가 마지막 칩까지 Tab 한 뒤 곧바로 Escape 를 누르고 끝난다 — 한 번 더 Tab 했을 때의 행선지에 단언이 없다 |
| `role="button"` 대체(§4-5) | `check-phase8-accessibility-contracts.mjs:33-35` 가 `landing-grid-card.tsx` 한 파일만 읽는다 |
| `lang` 무효 태그·부분 언어(§1-4) | axe 실행이 전부 `/en` 라우트에서만 돈다 |
| 포커스 링 가림(§1-2) | 대응 axe 룰 없음(2.4.11 은 자동 검출 불가), 계약에도 조항 없음 |
| 라이브 리전 부재(§1-1) | 부재를 검출하는 룰은 존재하지 않는다 |

그리고 이 게이트들은 **평시에 돌지도 않는다.** Default Done gate(`lint`/`typecheck`/`test`/`build`)는 vitest 만 돌리고, `qa:rules` 는 release-level 이며, `test:e2e:gate` 는 `@gate` 태그(theme-matrix 시각 baseline + safari ghosting)만 돈다 — `a11y-smoke.spec.ts` 는 `@smoke` 전용이라 `npm run test:e2e` / `test:e2e:smoke` 를 따로 부를 때만 실행된다.

---

## 7. 계약 쪽 결론 — §9 를 다시 쓸 때 무엇이 바뀌어야 하는가

`docs/req-landing.md` §9(`683–726`)는 조항 28개 중 **모바일을 문면에 적은 것이 0개**이고, 뷰포트·입력 방식에 걸린 조항도 0개다. 그래서 이 절은 모바일에 대해 틀린 말을 하는 것이 아니라 **아무 말도 하지 않으며**, 그 공백이 §2-1(모바일 `aria-expanded` 없음) · §2-8(모바일 Escape no-op) · §3-3(존재하지 않는 X 버튼) 을 만든다. 구체적으로 개정이 필요한 조항은 다음과 같다.

- **`:705`** — `aria-expanded` 소유자를 「Desktop/Tablet available Test trigger」로 한정한 것을 **모든 확장 가능 트리거**로 넓힌다. 사용자 결정 2 를 적용하면 이 한 줄이 터치 태블릿에서 속성을 **잃게** 만든다.
- **`:704`** — accessible name 을 `card.title` 단일값으로 고정한 조항이 §2-2 의 정보 손실 원인이다. 「이름은 제목 한 값 · 부제와 태그는 `aria-describedby` 로 노출」 형태로 다시 쓴다.
- **`:695`** — 「X 버튼은 `aria-label` 필수」가 존재하지 않는 컨트롤을 전제한다. 「전면을 덮는 모든 레이어는 보이는 닫기 컨트롤을 44×44 로 갖는다」를 요구 조항으로 신설한다.
- **`:688`** — 「focus ring 은 명확히 보여야 한다」에 임계가 없어 자동 게이트가 될 수 없다. 「비텍스트 대비 3:1(WCAG 1.4.11) · 링이 뷰포트 밖이나 sticky 요소 아래로 나가지 않을 것(2.4.11)」로 측정 가능하게 바꾼다. `:719` 의 `--surface-soft` 위 조항은 실현값이 이미 3.33:1 로 만족하므로 임계만 적으면 그대로 게이트가 된다.
- **`:694`** — 「카드 내부 focus trap 금지」가 지금 어떤 단언도 갖지 않는다(`tests/e2e/**` 의 "trap" 일치는 instruction overlay 가 *trap 이어야 한다*는 반대 단언 1건뿐). 결정 5 로 바텀시트를 도입하면 이 조항은 **반대로 뒤집혀야** 한다 — 시트는 트랩이 필수다.
- **`:237`**(§6.4) · **`:632`**(§8.5) · **`:582`**(§8.3) — 각각 pointerdown 즉시 닫힘(2.5.2 충돌) · 닫기 경로를 X/backdrop 둘로 한정(Escape·스와이프 배제) · 모바일 Escape no-op 강제. 셋 다 결정 1 아래에서 개정 1순위다.
- **§10 Responsive Requirements(`730–733`)가 조항 0개인 빈 절**이다. 320px Reflow(1.4.10) · 200% 확대(1.4.4) · 터치 타깃 하한(2.5.8) · 입력 방식 축 — 반응형 절이 마땅히 가져야 할 측정 가능한 요구가 문서 어디에도 없다. 결정 2·6 이 등재될 자리가 여기다.

---

## 8. 훑지 못한 것 / 미확인

- **브라우저 렌더를 한 번도 하지 않았다.** 모든 기하·대비는 토큰과 클래스 문자열에서의 계산이다. 특히 §2-4(포커스 링이 화면 밖) · §3-1(패널이 트리거를 덮는 사각형) · §1-2(sticky 바 아래 가림)는 구조에서 유도한 결론이고 `elementFromPoint`/스크린샷으로 재현하지 않았다 — 다만 §3-1 은 저장소 자신의 주석이 같은 실측을 이미 적어 두었다.
- **드로어 스크롤 잠금의 실제 거동은 미확인이다.** `document.body.style.touchAction = 'none'`(`use-gnb-mobile-menu.ts:141`)이 패널 자신의 `overflow-y-auto` 터치 팬까지 막는지는 사양상 갈린다 — `touch-action` 은 터치 시작 요소부터 **제스처를 구현하는 요소(= 가장 가까운 스크롤 컨테이너)까지** 교집합하므로, 패널이 실제로 오버플로해 스크롤 컨테이너가 되면 body 의 `none` 이 포함되지 않을 수 있다. 선행 맵이 「막힌다」고 단정했으나 **이 세션은 확정하지 못했다.** 200% 확대·가로 모드에서 드로어가 넘치는지와 함께 1회 측정으로 결정된다.
- `body{overflow:hidden}` 방식 잠금의 iOS Safari 스크롤 위치 보존 여부 — 미측정.
- 12개 로케일 중 `en`·`kr` 외 10개의 실제 렌더를 보지 못했다. axe 도 그 10개를 돌지 않으므로 §1-4 의 3.1.2 영향 범위는 코드에서 유도한 것이다.
- `npm test` · `qa:rules` · `test:e2e` 를 **실행하지 않았다**(읽기 전용 과제). 게이트의 현재 pass/fail 은 확인하지 않았고, §6 의 「무엇이 안 잡히는가」는 룰 정의와 스펙 소스를 읽어 판정한 것이다.
- 훑은 표면: landing · test(문항·instruction·qualifier·result·error) · blog(색인·상세) · history · gnb(바·드로어·설정) · 404(segment·global) · consent 배너 · page-shell. **훑지 못한 표면은 없다.** 다만 `/result` 라우트는 저장소에 존재하지 않으므로(구현 전) 점검 대상이 아니었고, transition 오버레이(`transition-gnb-overlay.tsx`)는 `aria-hidden` + `inert` 로 올바르게 처리돼 있어 결함을 내지 않았다 — 단 `isVisibleFocusableElement`(`interaction-dom.ts:92-110`)가 `inert` 를 보지 않아 키보드 타깃 계산이 그 오버레이를 가리킬 수 있다는 것은 signature-interactions 맵의 지적과 같고, 이 렌즈에서 재확인만 했다.
