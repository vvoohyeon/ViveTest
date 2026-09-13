# surface-landing — 랜딩 표면 구조·IA 지도

읽은 저장소: `/Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis` (HEAD = 착수 마커 커밋, 부모 `a5aec95`). 모든 인용은 이 클론의 `file:line` 이다. 이 문서는 **읽기 전용 분석**이며 저장소 파일을 수정하지 않았다.

근거 종류 표기: **[코드]** 소스에서 직접 읽음 · **[계약]** `docs/**` 조항 · **[규범]** WCAG/플랫폼 관용 패턴 · **[추론]** 사양으로부터의 연역(실측 아님) · **[기주어짐]** 과제 프롬프트가 이미 실측으로 제공한 값.

---

## 1. 컴포넌트 트리 (서버/클라이언트 경계 포함)

경계 판정 기준은 파일 첫 줄의 `'use client'` 지시자다. 지시자가 없고 클라이언트 파일에서 import 되지 않는 컴포넌트는 서버 컴포넌트로 남는다.

```text
app/[locale]/layout.tsx                                   [서버]  src/app/[locale]/layout.tsx:17
├── NextIntlClientProvider                                [경계]  :33   (messagesByLocale 전체를 클라이언트로 직렬화)
├── LocaleHtmlLangSync                                    [클라]  src/i18n/locale-html-lang-sync.tsx:1
├── TransitionRuntimeMonitor                              [클라]  src/features/transition/transition-runtime-monitor.tsx:1
└── <div data-locale>                                     :36
    └── app/[locale]/page.tsx  LandingPage                [서버]  src/app/[locale]/page.tsx:11  (async, getTranslations + loadLandingCardMediaAssetVariants)
        └── PageShell                                     [서버]  src/features/landing/shell/page-shell.tsx:17  ('use client' 없음)
            ├── TransitionGnbOverlay                      [클라]  src/features/transition/transition-gnb-overlay.tsx:1   (context==='landing' 이면 null — :19)
            ├── SiteGnb                                   [클라]  src/features/gnb/site-gnb.tsx:1  (484줄)
            │   ├── 데스크톱 바  h-16, md:flex            :40, :364
            │   ├── 모바일 바    h-14, md:hidden          :41, :370
            │   └── 모바일 드로어 role=dialog aria-modal  :430-439  (w = min(87vw,340px) — :87)
            ├── <main class="page-shell-main ... pt-20 pb-6 md:pt-[88px] md:pb-8">  :22
            │   ├── LandingRuntime                        [클라]  src/features/landing/landing-runtime.tsx:1  (렌더 산출물 null — :90)
            │   ├── <section class="landing-hero">        [서버]  src/app/[locale]/page.tsx:28-31  (h1 + p)
            │   └── LandingCatalogGridLoader              [클라]  src/features/landing/grid/landing-catalog-grid-loader.tsx:1
            │       └── LandingCatalogGrid                [클라]  src/features/landing/grid/landing-catalog-grid.tsx:1  (286줄)
            │           ├── 모바일 backdrop (조건부)      :198-208  (fixed inset-0 z-10 touch-pan-y — :30-31)
            │           └── .landing-grid-container       :209-214
            │               └── row × N                   :215-232  (data-row-index / data-columns)
            │                   └── LandingGridCard × M   [클라]  src/features/landing/grid/landing-grid-card.tsx:926  (1308줄)
            │                       ├── trigger: <Link> (blog) | <button> (그 외)  :1170-1207
            │                       ├── DesktopExpandedShell   (비모바일 + test + enterable)  :1209-1223
            │                       ├── 모바일 expandedBody    (mobilePhase==='OPEN')          :1225-1255
            │                       └── 모바일 transient shell (OPENING|CLOSING, fixed)        :1257-1290
            └── TelemetryConsentBanner                    [클라]  src/features/landing/shell/telemetry-consent-banner.tsx:1
                └── ConsentBanner                         [클라]  src/features/landing/shell/consent-banner.tsx:1  (279줄, fixed bottom z-1075 — :21)
```

서버 컴포넌트는 실질적으로 셋뿐이다 — 라우트 layout, 라우트 page, `PageShell`. 랜딩의 시각·상호작용 전부가 클라이언트 경계 아래에 있고, 카탈로그 데이터조차 서버에서 내려오지 않는다: `LandingCatalogGridLoader` 가 클라이언트에서 `resolveLandingCatalog(locale, {consentState})` 를 호출한다(`landing-catalog-grid-loader.tsx:17-23`). 서버에서 오는 것은 asset 존재 목록(`loadLandingCardMediaAssetVariants`, `src/features/landing/media/manifest.server.ts:9`)과 hero 문구뿐이다.

클라이언트 경계 아래의 훅 파일들(`use-*.ts`)은 대부분 `'use client'` 지시자가 없다 — 예: `use-landing-interaction-controller.ts:1`, `use-grid-geometry-controller.ts:1`. 클라이언트 컴포넌트에서만 import 되므로 동작하지만, 파일 단독으로는 경계가 읽히지 않는다. **[코드]**

---

## 2. 카탈로그 구성 — 랜딩에 실제로 놓이는 카드

fixture 소스는 10장이고(`src/features/variant-registry/source-fixture.ts`), 빌더가 `seq` 오름차순으로 정렬한다(`src/features/variant-registry/builder.ts:260-261`). end-user 관객에서 `hide`·`debug` 는 제외된다(`src/features/variant-registry/attribute.ts:52-54`).

| # | variant | type | attribute | 진입 가능 | 확장 가능 | 비고 |
|---|:---|:---|:---|:---:|:---:|:---|
| 1 | `qmbti` | test | available | ✅ | ✅ | 유일하게 자체 썸네일 asset 보유(그 외는 fallback SVG — `landing-grid-card.tsx:167-194`) |
| 2 | `rhythm-b` | test | available | ✅ | ✅ | |
| 3 | `energy-check` | test | opt_out | ✅ | ✅ | consent 거부 시에도 남는 유일한 진입 가능 카드 |
| 4 | `creativity-profile` | test | unavailable | ❌ | ❌ | `coming soon` 칩, `tabIndex=-1` (`interaction-state.ts:490-493`) |
| 5 | `egtt` | test | available | ✅ | ✅ | |
| 6 | `ops-handbook` | blog | available | ✅ | ❌ | 카드 전체가 `<Link>` |
| 7 | `build-metrics` | blog | available | ✅ | ❌ | |
| 8 | `release-gate` | blog | available | ✅ | ❌ | |

제외: `debug-sample`(debug), `burnout-risk`(hide). 총 **8장 = test 5 + blog 3**, 진입 가능 7장, 확장 가능(test×enterable) 4장. **[코드]**

**consent 상태가 카탈로그 크기를 바꾼다.** `OPTED_OUT` 이면 `available` 카드가 전부 사라져(`attribute.ts:56-58`) 랜딩에는 `energy-check` 와 `creativity-profile` **2장만** 남고, 그중 진입 가능한 것은 1장이다. 이것은 버그가 아니라 계약이다 — `docs/req-landing.md:1029` 「Disagree All 선택 시 카탈로그에는 opt_out 카드와 unavailable 카드만 남는다」. **[계약]** 모바일 IA 재설계에서 **비어 보이는 랜딩(2장)** 은 반드시 별도 레이아웃 케이스로 다뤄야 한다 — 현재 그 상태를 위한 빈-상태 카피도, 설명도 없다. **[코드: 해당 분기 부재]**

첫 방문(`UNKNOWN`) 에는 하단 고정 consent 배너가 떠 있고(`telemetry-consent-banner.tsx:12`), 그 높이만큼 문서 끝에 spacer 가 추가된다(`consent-banner.tsx:236`). 배너의 세 번째 버튼 `preferences` 의 핸들러는 빈 함수다 — `onPreferencesAction={() => {}}` (`telemetry-consent-banner.tsx:32`). **눌러도 아무 일도 일어나지 않는 가시 컨트롤**이며, 배너 3버튼 중 1개가 그것이다. **[코드]**

---

## 3. IA — 랜딩 도착에서 테스트 시작까지

「테스트 시작」의 정의는 `beginTestTransition` 호출 = `/{locale}/test/{variant}` 로 `router.push` (`src/features/transition/use-landing-transition.ts:21-41`). 계약상 진입점은 Expanded 의 `answerChoiceA/B` 뿐이다(`docs/req-landing.md:269` §6.5, `:671` §8.6). **[계약]**

| 경로 | 확정 입력(클릭/탭) | 포인터 이동 | 스크롤 | 근거 |
|:---|:---:|:---:|:---:|:---|
| 데스크톱 hover (≥1024, hover 가능) | **1** (답변 A/B) | 1 (카드 위 160ms 체류) | 0 | `hover-intent.ts:1` `DESKTOP_EXPAND_DELAY_MS=160`; 1440px 문서 1.31화면 **[기주어짐]** |
| 데스크톱 클릭 (hover 없이 trigger 클릭) | **2** (카드 → 답변) | 0 | 0 | `use-landing-interaction-controller.ts:585-592` |
| 태블릿 hover 가능 (768~1023) | 1 | 1 | 0 | 데스크톱과 동일 경로; 확장 스케일만 1.04 (`layout-plan.ts:11`) |
| **터치 태블릿 (768~1023, hover 없음)** | **2** | 0 | 0 | `resolveInteractionMode` 는 `tap` 인데(`use-landing-interaction-controller.ts:71-77`) `viewportTier` 는 `tablet` 이라 **데스크톱 오버레이 경로**를 탄다(`landing-grid-card.tsx:970, 974-976`) |
| 모바일 (≤767) | **2** (카드 → 답변) | 0 | 0 | `use-landing-interaction-controller.ts:578-583` → `beginMobileOpen`; 첫 카드 top 315px + 높이 255px < 844 **[기주어짐 + 추론]** |
| 키보드 데스크톱 | **3키** (Tab → Tab → Enter) | — | 0 | 첫 Tab 이 첫 enterable 카드로 점프(`use-keyboard-mode-tracker.ts:32-39`), focus 가 곧 expand(`interaction-state.ts:99-108`) |
| 키보드 모바일 | **5키** (Tab → Enter → Tab → Tab → Enter) | — | 0 | 모바일 focus 는 `preserve-mobile` 이라 확장하지 않고(`interaction-state.ts:104-106`) Enter 로 연다(`use-card-keyboard-handler.ts:272-277`); 확장 후 첫 focusable 은 닫기 X 다(`landing-grid-card.tsx:1232-1245` 헤더가 본문보다 앞) |

**「테스트 하나를 시작한다」만 놓고 보면 모바일은 이미 2탭이고, 그게 문제가 아니다.** 문제는 **선택**이다: 8장을 전부 훑으려면 390px 에서 3.76화면을 스크롤해야 하고(**[기주어짐]**), 1열이라 한 화면에 온전히 보이는 카드는 사실상 1~2장이다(카드 358×255 + 행 간격 15px — `landing-catalog-grid.tsx:211`). 데스크톱은 같은 8장을 1.31화면에 담는다. **모바일과 데스크톱의 실제 격차는 시작 비용이 아니라 탐색 비용이며, 배수는 약 2.9배다.** **[기주어짐 + 산술]**

두 번째 격차는 **비교 불가능성**이다. 데스크톱에서는 포인터를 옮기는 것만으로 카드 A→B 확장이 handoff 로 이어져(`use-desktop-motion-controller.ts:141-158`) 두 테스트의 프리뷰 질문을 연속으로 훑을 수 있다. 모바일에서는 카드 하나를 열고(280ms) 닫고(280ms + 복원 폴링) 다음 카드를 열어야 하며, 그 사이 페이지 스크롤 위치와 문서 높이가 두 번 바뀐다. **[코드: `use-mobile-card-lifecycle.ts:121-124, 248-258`]**

GNB 쪽 IA: 모바일에서 History·Blog·설정(테마·언어)에 닿으려면 햄버거 1탭 → 드로어 → 항목 1탭 = **2탭**이고, 데스크톱은 링크 1클릭(History/Blog) 또는 hover(설정)다. 드로어에는 닫기 버튼이 없다 — 코드 주석이 그 사실과 이유를 명시한다(`site-gnb.tsx:88-95`): 패널(z-1200)이 햄버거(z-1100)를 덮으므로 열린 동안 **보이는 닫기 어포던스가 0개**이고, 닫기는 backdrop 탭 또는 Escape 뿐이다. **[코드]**

---

## 4. 카드 상태 집합 전체와 모바일 도달 경로

랜딩 카드의 상태는 **한 축이 아니라 여섯 축의 곱**이다. 다음이 전부다.

| 축 | 값 | 정의 위치 |
|:---|:---|:---|
| 시각 상태 `LandingCardVisualState` | `normal` · `focused` · `expanded` | `src/features/landing/model/interaction-state.ts:3`, 해석 `:447-472` |
| 논리 카드 상태 `CardState` | `NORMAL` · `FOCUSED` · `EXPANDED` | `src/features/landing/model/state-types.ts:11` |
| 페이지 상태 `PageState` | `ACTIVE` · `INACTIVE` · `REDUCED_MOTION` · `SENSOR_DENIED` · `TRANSITIONING` | `state-types.ts:1-7`, 전이표 `interaction-state.ts:14-20` |
| 모바일 phase | `NORMAL` · `OPENING` · `OPEN` · `CLOSING` | `src/features/landing/grid/mobile-lifecycle.ts:3` |
| 모바일 transient mode | `NONE` · `OPENING` · `CLOSING` | `landing-grid-card.tsx:51` |
| 데스크톱 shell phase | `idle` · `opening` · `steady` · `closing` · `cleanup-pending` · `handoff-target` · `handoff-source` (7) | `src/features/landing/grid/desktop-shell-phase.ts:12-19` |
| 데스크톱 motion role | `idle` · `opening` · `steady` · `closing` · `handoff-target` · `handoff-source` (6) | `desktop-shell-phase.ts:4-10` |

여기에 **카드 종류별 렌더 분기**가 겹친다: blog(카드 전체 `<Link>` + `Read more` 어포던스, 확장 없음 — `landing-grid-card.tsx:969, 1170-1185`), unavailable(`coming soon` 칩, `aria-describedby`, tab order 제외 — `:1195-1197`, `interaction-state.ts:490-493`), test available/opt_out(확장 가능). 그리고 DOM 에 찍히는 `data-expanded-layer` 가 실제 레이어 5종을 요약한다: `desktop-overlay` · `mobile-opening-shell` · `mobile-in-flow` · `mobile-closing-shell` · `none` (`landing-grid-card.tsx:1135-1145`).

**모바일에서 각 상태에 어떻게 도달하는가:**

| 상태 | 모바일 도달 경로 | 도달 가능? |
|:---|:---|:---:|
| `normal` | 기본 | ✅ |
| `focused` | 키보드 Tab 만. `resolveKeyboardFocusDisposition` 이 모바일에서 `preserve-mobile` 을 반환해 확장 없이 `CARD_FOCUS` 만 디스패치한다(`interaction-state.ts:104-106`) | ✅ (키보드 전용) |
| `expanded` | 카드 탭 → `beginMobileOpen` (`use-landing-interaction-controller.ts:578-583`), 또는 trigger 포커스 상태에서 Enter/Space (`use-card-keyboard-handler.ts:272-277`) | ✅ |
| hover 스킨(blog 테두리·그림자) | `@media (hover: hover) and (pointer: fine)` 로 막혀 있다(`landing-grid-card.module.css:92-97`) | ❌ |
| `Read more` 어포던스 | tap 모드에서는 **항상 노출**된다(`landing-grid-card.tsx:465, 511`) — hover 모드의 fade-in 과 다른 정적 표시 | ✅ (상시) |
| 데스크톱 shell phase 7종 | `!isMobileViewport` 게이트(`desktop-shell-phase.ts:70`)로 전부 `idle` 고정 | ❌ |
| `cleanup-pending` / `handoff-*` | 위와 동일 | ❌ |
| unavailable 확장 | `isUnavailablePresentation` 이 `expanded` 를 `normal` 로 강등(`landing-grid-card.tsx:969`) | ❌ (설계대로) |

즉 **모바일이 실제로 쓰는 상태는 `normal` / `focused`(키보드) / `expanded` 셋뿐인데, 카드 컴포넌트는 6축 전부를 한 파일(1308줄)에서 분기한다.** `isMobileViewport` 계열 분기 71개 중 31개가 이 파일에 있다(**[기주어짐]**; 본 세션 재측정: `landing-grid-card.tsx` 31 · `use-landing-interaction-controller.ts` 22 · `use-hover-intent-controller.ts` 9 · `use-card-keyboard-handler.ts` 8 · `use-mobile-card-lifecycle.ts` 7 · `use-mobile-backdrop-gesture.ts` 5 · `desktop-shell-phase.ts` 5 · 나머지 4개 파일 각 4 이하 — 합 101, 측정 방식이 프롬프트의 71과 다르므로 **두 수를 섞지 말 것**).

---

## 5. 모바일에서 카드 확장이 레이아웃에 하는 일 — CSS·코드로 확정

**결론: 제자리(in-flow) 확장이며, 같은 열의 뒤 카드들을 아래로 밀어낸다. 오버레이가 아니다. 단, 열리고 닫히는 280ms 동안만 별도의 `position: fixed` 껍데기가 그 위를 덮는다.**

근거는 네 줄이다. ⑴ `OPEN` 상태의 카드 루트는 그리드 셀 안에 남은 채 `w-screen mx-[calc(50%-50vw)] rounded-none` 으로 **풀블리드로 넓어지기만** 한다(`landing-grid-card.tsx:1042`). ⑵ 접힌 얼굴은 언마운트되고 컨텐츠 박스가 `[height:0] [min-height:0] overflow-hidden` 으로 0이 된다(`:1064`, `:1068`). ⑶ 확장 본문이 같은 루트의 형제로 추가되며 최대 높이는 `calc(100dvh-116px)` 이다(`:285`, 렌더 `:1225-1255`). ⑷ DOM 이 스스로 그렇게 선언한다 — `data-expanded-layer="mobile-in-flow"` (`:1141`). 모바일 tier 는 항상 1열이므로(`layout-plan.ts:81-87`) 한 행에 카드가 1장이고, 따라서 **행 높이의 변화가 곧 뒤 카드 전체의 이동**이다. **[코드]**

레이어 순서는 계약이 정한 `GNB > Expanded 카드 > backdrop > 기타 카드` 를 따른다(`docs/req-landing.md:644`). 코드에서 backdrop 은 `z-10`(`landing-catalog-grid.tsx:31`), 확장 카드 루트는 `z-20`(`landing-grid-card.tsx:1041`), transient shell 은 `z-21`(`:292`), GNB 는 `z-[1100]`(`site-gnb.tsx:38`)이다. backdrop 과 카드의 z 는 그리드 shell 의 스태킹 컨텍스트 안에서만 비교되고(`.shell` 이 `container-type: inline-size` 를 갖는다 — `landing-catalog-grid.module.css:26-29`), GNB 는 그 바깥의 sticky 헤더다. **[코드 + 추론: `container-type` 이 layout containment 를 통해 스태킹 컨텍스트를 만든다는 사양 근거이며, 실측하지 않았다]**

**전이 구간의 기계는 이렇다.** 탭 → `captureMobileSnapshot` 이 카드의 rect 와 타이틀 top 을 기록하고(`mobile-card-lifecycle-dom.ts:3-28`), `OPENING` 으로 들어가 `position: fixed` transient shell 이 스냅샷 좌표에서 `left:0; width:100vw; border-radius:0` 으로 280ms 동안 자란다(`landing-grid-card.module.css:527-539`, duration `mobile-lifecycle.ts:1`). 그동안 **in-flow 카드의 높이는 그대로**이고, 접힌 슬롯들이 120ms 에 걸쳐 opacity 0 으로 빠진다(`module.css:307-312`). 280ms 타이머가 끝나면 `OPEN_SETTLED` 가 나면서(`use-mobile-card-lifecycle.ts:121-124`) transient shell 이 사라지고 in-flow 본문이 등장한다 — **즉 레이아웃 상의 높이 점프는 애니메이션이 아니라 이 한 프레임에서 일어나고, 그 순간을 fixed 껍데기가 가린다.** 닫을 때는 역순이며, 복원이 스냅샷 높이·타이틀 오프셋과 1px 이내로 일치할 때까지 최대 30프레임 rAF 폴링을 돈다(`use-mobile-restore-polling.ts:9-10, 79-101`). **[코드]**

계약 §8.5 는 「content-fit 높이 전이는 monotonic」·「런타임 실측(`from px -> to px -> auto`) 또는 동등 정확도」를 요구하는데(`docs/req-landing.md:638-639`), 구현은 그 대신 **높이 전이를 하지 않고 fixed 껍데기로 가리는** 방식을 택했다. 결과는 계약이 검사하는 값(y-anchor drift 0, 복귀 오차 0)을 만족하지만, 조항이 서술하는 메커니즘과는 다르다. **리팩터에서 §8.5 를 다시 쓸 때 이 괴리가 첫 번째 정리 대상이다.** **[계약 vs 코드]**

**모달처럼 보이지만 모달이 아니다.** scrim(`--overlay-scrim-medium`)이 전면을 덮지만(`landing-catalog-grid.tsx:30-31`), ⑴ 페이지 스크롤 락은 `OPENING`/`CLOSING` 에만 걸리고 `OPEN` 에서는 풀린다(`use-mobile-scroll-lock.ts:5-7` — 계약 `req-landing.md:640-641` 이 그렇게 요구한다), ⑵ backdrop 에 `touch-pan-y` 가 붙어 세로 패닝을 허용한다(`landing-catalog-grid.tsx:31`), ⑶ `role="dialog"`·`aria-modal`·포커스 트랩·`aria-live` 가 랜딩 전체에 **하나도 없다**(`src/features/landing/**` grep 결과 0건; GNB 드로어에만 있다 — `site-gnb.tsx:433-434`), ⑷ GNB 는 scrim 위에 남아 계속 조작 가능하다. 즉 **시각적으로는 모달, 의미론적으로는 인라인 확장, 조작상으로는 그 중간**이다. **[코드]** 스크린리더 사용자에게는 카드가 확장됐다는 사실이 어디에서도 announce 되지 않으며, 모바일 trigger 에는 `aria-expanded` 조차 붙지 않는다 — `!isMobileViewport` 조건으로 undefined 다(`landing-grid-card.tsx:1198-1200`). **[코드 + 규범: WCAG 4.1.2 Name/Role/Value]**

**닫기 경로는 둘뿐이다** — 헤더의 X 버튼(`landing-grid-card.tsx:1236-1245`, 44×44 보장 — `:278-279` `min-h/min-w: var(--tap-min)`, `globals.css:201` `--tap-min: 44px`) 과 backdrop 탭(`use-mobile-backdrop-gesture.ts:91-97`). 계약이 그 둘만 허용한다(`req-landing.md:632`). 스와이프 다운 닫기, Escape(모바일), 뒤로가기 제스처 흡수는 전부 없다. **[코드 + 계약]** backdrop 은 10px 이상 이동하면 스크롤로 재분류해 닫기를 취소한다(`use-mobile-backdrop-gesture.ts:7, 84-89`).

확장 본문은 `max-h-[calc(100dvh-116px)] overflow-auto overscroll-contain` 으로 **중첩 스크롤러**가 된다(`landing-grid-card.tsx:285`). 그 `116px` 은 코드 세 곳에 리터럴로 반복되고(`:285`, `:292`, `:296`) **문서·토큰·테스트 어디에도 유래가 없다** — `docs/req-landing.md`·`docs/design/design.md` grep 0건, `globals.css` grep 0건. 모바일 GNB 높이가 56px 이므로(`site-gnb.tsx:41`) 60px 의 출처가 설명되지 않는다. **[코드: 미해명 상수]**

---

## 6. 네 모듈 — `layout-plan` · `spacing-plan` · `use-grid-geometry-controller` · `use-card-inline-geometry`

| 모듈 | 줄 | 성격 | 계산하는 것 |
|:---|--:|:---|:---|
| `grid/layout-plan.ts` | 182 | **순수** (DOM 없음) | 뷰포트 폭 → tier(`:63-73`), 측정된 grid inline-size → columnMode·row1/rowN 컬럼 수(`:75-110`), 카드 수 → rows 배열(`:143-181`). 별개로 확장 스케일 결정(`resolveLandingExpandedScale` — `:112-141`) |
| `grid/spacing-plan.ts` | 145 | **순수** (DOM 없음) | 같은 행 카드들의 자연 높이 차 → 태그 행을 바닥에 맞추는 `compGap`(`:117-145`), 태그 칩의 가시 개수와 말줄임 여부(`:60-102`) |
| `grid/use-grid-geometry-controller.ts` | 446 | **측정 — 그리드(행) 스코프** | 행별로 카드 content top / tags bottom 을 실측해 `spacing-plan` 에 먹이고 `spacingModel` 을 만든다(`:191-264`). 추가로 확장 중 행 기하 freeze/release(`:348-405`), 확장 높이 바닥값 resting floor(`:326-346`), plan 변경 이벤트 방송(`:407-439`) |
| `grid/use-card-inline-geometry.ts` | 337 | **측정 — 카드 1장 스코프** | ⑴ 숨은 태그 프로브 실측 → `spacing-plan.resolveVisibleTagPrefix` 호출(`:181-337`), ⑵ 카드 폭과 `--landing-card-stage-shadow-bleed-x` 실측 → `layout-plan.resolveLandingExpandedScale` 호출(`:87-179`) |

**왜 넷인가 — 두 축의 곱이다.** 세로축은 *순수 결정 vs DOM 측정* 이고, 이 분리는 `req-landing.md` §11.1(초기 렌더 경로에서 `window` 읽기 금지 — `docs/req-landing.md:739`)과 단위 테스트 가능성이 강제한다. 가로축은 *측정의 스코프* 다: 행 단위 기하는 shell 하나가 모든 카드를 `ResizeObserver` 로 구독해야 하고(`use-grid-geometry-controller.ts:280-292`), 카드 단위 기하는 카드 자신의 수명에 묶여야 한다(`use-card-inline-geometry.ts:245-276`). 두 스코프가 한 훅에 들어가면 카드 한 장의 폰트 로드가 그리드 전체 재측정을 유발한다. **[코드 + 추론]**

그 대가로 **같은 규율이 두 번 구현돼 있다**: 72ms settle 디바운스가 `use-card-inline-geometry.ts:14` 와 `use-grid-geometry-controller.ts:31`(값은 32ms, 목적 다름)에 각각, `document.fonts.ready` 게이트가 `use-grid-geometry-controller.ts:36-43`(공유 프로미스 제공자)과 `use-card-inline-geometry.ts:150-154, 257-261`(소비)에, `ResizeObserver + window resize + fonts loadingdone` 삼중 구독이 두 파일에 각각 있다.

**모바일에서 이 넷의 순효과는 거의 0이다 — 이것이 이 절의 핵심 발견이다.**

- `layout-plan` 은 tier 가 mobile 이면 컬럼 계산을 건너뛰고 `{columnMode:'mobile', row1:1, rowN:1}` 을 즉시 반환한다(`layout-plan.ts:81-87`). 1160/1040 임계도, 첫 행 예외도 모바일에는 없다.
- `resolveLandingExpandedScale` 은 모바일에서 `desiredFinalScale = 1` 이다(`layout-plan.ts:126-130`). 확장 스케일이 없다. 그런데 `useCardExpandedScale` 은 모바일에서도 `ResizeObserver` 를 달고 매 카드마다 폭과 bleed 를 실측한다(`use-card-inline-geometry.ts:143-167`), 그 결과로 쓰이는 `--landing-card-shell-inline-scale` 은 모바일에서 소비자가 없다(소비처 `.expandedShellFrame` 은 데스크톱 stage 안에만 존재 — `landing-grid-card.module.css:278-281`).
- `use-grid-geometry-controller` 의 resting floor 와 baseline freeze 는 **모바일 tier 에서 아예 비활성**이다(`:326-329` 즉시 clear, `:372-376` 즉시 RELEASE). 그리고 모바일 phase 가 `NORMAL` 이 아니면 spacing 측정 자체가 중단된다(`:169-176`).
- `spacing-plan` 의 `compGap` 은 모바일에서 **항상 0** 이다 — 1열이므로 행에 카드가 1장이고, `rowMaxNaturalHeight === naturalHeight` 라 delta 가 0.5px epsilon 을 넘지 못한다(`spacing-plan.ts:129-143`). **[코드 + 연역]**

모바일에서 살아남는 유일한 산출물은 `use-card-inline-geometry` 의 **태그 프리픽스 결정**이다. 나머지는 "1열, 스케일 1, compGap 0, floor 없음" 이라는 상수를 얻기 위해 카드마다 `ResizeObserver` 2개(카드 루트 + content, 그리고 태그 행) 와 rAF 스케줄러를 돌린다. 카드 8장 기준 관찰자 수는 최소 8(card) + 8(content) + 8(tag row) + 8(card root for scale) = **32개** 다. **[코드 + 산술; 실측 프로파일링은 하지 않았다]**

---

## 7. 리팩터 착수에 영향을 주는 구조적 관찰

각 항목에 근거 종류를 붙인다. 「더 나아 보인다」는 넣지 않았다.

1. **모바일 확장에 `role="dialog"`/`aria-modal`/포커스 관리가 없다.** scrim 을 깔고 배경을 비활성화(`interactionBlocked` → `pointer-events: none` — `landing-grid-card.tsx:1166`)하면서도 스크린리더에는 모달임을 알리지 않고, 열 때 포커스를 옮기지도 않는다. 열린 뒤 첫 Tab 이 X 로 간다(`use-card-keyboard-handler.ts` + `interaction-dom.ts:5-14`). **[규범: WCAG 4.1.2 · 2.4.3 Focus Order]** **[코드]**
2. **모바일 trigger 에 `aria-expanded` 가 없다.** `!isMobileViewport` 조건이 걸려 있다(`landing-grid-card.tsx:1198-1200`). 확장 가능한 버튼이 확장 상태를 노출하지 않는다. **[규범: WCAG 4.1.2]**
3. **`OPEN` 상태의 trigger 는 높이 0의 포커스 가능 요소로 남는다.** `[min-height:0] [padding:0]` + 컨텐츠 `height:0`(`landing-grid-card.tsx:1058, 1064`)이라 화면 폭 × 0px 박스가 탭 순서 안에 있다. 포커스 링이 그려질 면적이 없다. **[규범: WCAG 2.4.7 · 2.4.11 Focus Not Obscured]** **[코드]**
4. **닫기 제스처가 스와이프를 지원하지 않는다.** 바텀시트/풀스크린 시트의 플랫폼 관용은 아래로 끌어 닫기이고, 현재는 X 또는 backdrop 탭뿐이다(`use-mobile-backdrop-gesture.ts:91-97`). 다만 어떤 닫기도 드래그를 **요구**하지는 않으므로 2.5.7 위반은 아니다. **[규범: iOS HIG / Material 3 sheet · WCAG 2.5.7 은 통과]**
5. **scrim 이 있는데 배경이 스크롤된다.** `OPEN` 에서 스크롤 락이 풀리고(`use-mobile-scroll-lock.ts:5-7`) backdrop 이 `touch-pan-y` 를 허용한다(`landing-catalog-grid.tsx:31`). 계약이 명시적으로 그렇게 요구하지만(`req-landing.md:640-641`), 「덮개 + 스크롤되는 배경」은 모달/비모달 어느 쪽으로도 읽히지 않는 중간 상태다. **[계약 vs 규범 충돌]**
6. **랜딩 그리드에 `touch-action` 선언이 backdrop 한 곳(`touch-pan-y`)뿐이고 터치 이벤트 리스너는 0개다.** 탭 판정을 pointer 이벤트로만 하며(`use-mobile-backdrop-gesture.ts`), 카드 자체의 탭은 `onClick` 이다. 300ms 지연·더블탭 줌 억제·스크롤 중 오탭 방지가 카드 쪽에는 없다. **[기주어짐 + 코드 확인]**
7. **`116px` 매직 넘버가 세 곳에 복제돼 있고 출처가 없다.** (§5 참조) **[코드]**
8. **consent 거부 시 랜딩이 2장으로 줄어드는데 그 상태의 레이아웃·카피가 설계되지 않았다.** **[코드 + 계약]**
9. **배너의 `preferences` 버튼이 no-op 이다.** (`telemetry-consent-banner.tsx:32`) **[코드]**
10. **GNB 드로어에 보이는 닫기 컨트롤이 없다.** 코드 주석이 이를 알려진 미해결 사항으로 기록하며 「behavior outranks the visual」 로 연기했다(`site-gnb.tsx:88-95`). **[코드 주석 = 저장소 자체 진술]**
11. **모바일 lifecycle reducer 의 `CLOSE_SETTLED` 가 `RESET` 으로 의도적 fall-through 한다** — `break` 없이 다음 case 로 떨어진다(`mobile-lifecycle.ts:130-135`). 동작은 의도대로이나 의도가 문법으로 표시돼 있지 않다. **[코드]**
12. **모바일 4대 파일이 저장소 규칙(~500줄)을 넘긴다.** `landing-grid-card.tsx` 1308 · `use-landing-interaction-controller.ts` 738 · `use-hover-intent-controller.ts` 527 · `interaction-state.ts` 504 (`AGENTS.md` §3 File size discipline). **[기주어짐 + 재확인]**
13. **시각 baseline 현황(재측정):** 추적 중 스냅샷 **170장** = theme-matrix 164 + safari-ghosting 5 + state-smoke 1. 파일명이 `-mobile-` 뷰포트 접미사를 갖는 것은 **40장**이고, 그중 랜딩 관련은 **12장**이다(`theme-layout-landing-normal-*` 4 + `theme-state-mobile-landing-menu-open-*` 4 + `theme-state-mobile-landing-test-expanded-*` 4). 프롬프트의 「모바일 44장」과 4장 차이가 나며, 계수 방식 차이로 보이나 확정하지 못했다(§9 미확인). **[코드/파일 시스템]**

---

## 8. IA 재설계 여지 — 선택지와 추천

「모바일에서 이 표면을 다르게 구성한다면」에 대한 선택지다. 각 항목에 **건드리는 계약**과 **건드리는 파일**을 붙였다. 모든 선택지는 §8.6(테스트 진입은 Expanded 의 A/B 에서만)을 유지한다고 가정한다 — 그 조항을 깨면 텔레메트리·transition 계약까지 연쇄한다.

### 선택지 A — 현행 유지 + 정리 (in-flow full-bleed 확장을 지키고 결함만 제거)
- **하는 일:** `role="dialog"` 대신 `aria-expanded` + `aria-controls` 를 모바일 trigger 에 부여, 높이 0 trigger 제거, `116px` 을 토큰화, scrim 을 없애거나(비모달임을 명시) 락을 `OPEN` 까지 확장(모달임을 명시) 중 택일.
- **계약:** `req-landing.md` §8.5 일부(레이어·dim 조항), §9.1.
- **파일:** `landing-grid-card.tsx`, `landing-catalog-grid.tsx`, `use-mobile-scroll-lock.ts`.
- **남는 문제:** 탐색 비용(3.76화면)과 스냅샷/복원 기계 전체가 그대로다. 「마지막 기회」라는 전제와 맞지 않는다.

### 선택지 B — 바텀시트 상세 (모바일 확장을 시트로 교체)
- **하는 일:** 카드 탭 → 카드 자리는 그대로 두고 하단에서 시트가 올라온다. `role="dialog" aria-modal="true"`, 포커스 트랩, 열 때 시트 제목으로 포커스 이동, 닫기 = X(44×44) + backdrop + 스와이프 다운 + Escape. `OPEN` 동안 배경 스크롤 락.
- **계약:** `req-landing.md` §8.5 **전면 재작성**(in-flow·y-anchor·snapshot 복귀·scroll unlock 조항이 전부 무의미해진다), §9.1 포커스 계약 추가, §13.8 Return Restoration 재검토, `design.md` §7 application 레이어에 sheet 패턴 추가.
- **삭제 가능 파일:** `use-mobile-restore-polling.ts`(120줄), `mobile-card-lifecycle-dom.ts`(48), `use-mobile-transient-shell.ts`(57), `use-mobile-backdrop-gesture.ts`(100, 시트 제스처로 대체), `mobile-lifecycle.ts` 대폭 축소(139), `use-mobile-card-lifecycle.ts` 대폭 축소(287). `landing-grid-card.module.css` 의 transient/mobile 키프레임 구간(`:302-420`, `:527-563`) 제거.
- **수정 파일:** `landing-grid-card.tsx`(모바일 분기 31개 대부분 제거 — 카드는 순수 프레젠테이션으로 남는다), `landing-catalog-grid.tsx`(backdrop → 시트 포털), `use-landing-interaction-controller.ts`(모바일 분기 22개 축소), `use-card-keyboard-handler.ts`.
- **재생성 필요 baseline:** `theme-state-mobile-landing-test-expanded-{en,kr}-{light,dark}-mobile-chromium-darwin.png` 4장.
- **재작성 E2E:** `tests/e2e/state-smoke.spec.ts:1003-1146`(모바일 lifecycle 블록), `tests/e2e/grid-smoke.spec.ts:815-870`(모바일 Normal/Expanded 타이틀).

### 선택지 C — 전용 상세 라우트 (`/{locale}/preview/{variant}` 또는 기존 instruction 단계로 직행)
- **하는 일:** 카드 탭 → 페이지 이동. 확장 개념을 모바일에서 삭제.
- **계약:** §5(라우팅) 신규 route 추가, §6.5/§8.6(진입 trigger 위치), §12 telemetry 이벤트 대상 route, `project-analysis.md §4`.
- **파일:** `src/app/[locale]/**` 신규 라우트, `route-builder.ts`, `localized-path.ts`(둘 다 Ask-First), `transition/runtime.ts`, `variant-registry` resolver 는 그대로.
- **대가:** 입력 수는 2탭 그대로이나 **페이지 로드가 하나 늘고**, 프리뷰 질문 하나 보려고 뒤로가기를 쓰게 돼 탐색 비용이 오히려 는다. 랜딩의 「훑어보고 고른다」가 사라진다.

### 선택지 D — 리스트 밀도 재설계 (카드를 세로 리스트 아이템으로)
- **하는 일:** 썸네일을 16:6 풀폭에서 좌측 64~72px 썸네일로, 카드 높이 255px → 약 96~120px 로. 8장이 1.3~1.8화면에 들어온다.
- **계약:** §6.5 슬롯 **순서** 계약(`cardThumbnail → cardTitle → cardSubtitle → tags`) 은 유지 가능하나 배치가 세로에서 가로로 바뀐다, §6.6 클램프 계약(모바일은 현재 truncate 금지 — `landing-grid-card.tsx:408` `isMobileViewport ? 'block overflow-visible text-clip'`), `design.md` §6 카드 시스템 전면.
- **파일:** `landing-grid-card.tsx` 프레젠테이션 전부, `landing-grid-card.module.css`, `use-card-inline-geometry.ts`(태그 가용폭이 줄어 프리픽스 결정이 더 자주 발화), 12개 locale 전부의 시각 회귀.
- **대가:** 시각 정체성(카드)이 가장 크게 바뀐다. `docs/design/ds/catalog-components.css` 의 카드 시스템과 정면으로 부딪힌다.

### 선택지 E — 세그먼트 필터 / 캐러셀 (test·blog 분리, 가로 스와이프)
- **하는 일:** 상단에 `테스트 | 읽을거리` 세그먼트, 각 세그먼트 안에서 세로 리스트 또는 가로 캐러셀.
- **계약:** §6.2 그리드 구성(단일 연속 grid 전제)이 깨진다, §6.5, telemetry 의 카드 노출 이벤트 정의.
- **파일:** `layout-plan.ts`(rows 개념 자체가 세그먼트로 바뀐다), `landing-catalog-grid.tsx`, 신규 필터 상태.
- **대가:** 가로 캐러셀은 스크린리더·키보드에서 비용이 크고(WCAG 2.1.1), 카드 8장 규모에서는 필터가 과하다. consent 거부 시 2장 상태에서는 세그먼트 하나가 비어 버린다.

### 추천 — **선택지 B (바텀시트 상세)**

**이유 1 — 삭제되는 복잡도가 가장 크고, 그 복잡도는 전부 in-flow 확장이 만든 것이다.** 스냅샷 캡처·복원 rAF 폴링·transient fixed 껍데기·baseline freeze·resting floor 는 모두 「카드가 제 자리에서 커졌다 줄어드는데 그 자리를 픽셀 오차 없이 되돌려야 한다」는 요구에서 파생됐다(`mobile-card-lifecycle-dom.ts`, `use-mobile-restore-polling.ts`, `baseline-manager.ts:43-72`, `req-landing.md:634`). 시트는 카드 기하를 건드리지 않으므로 **복원할 기하가 없고**, 그 기계 전체가 요구사항 자체와 함께 사라진다. 약 500줄의 모바일 전용 런타임과 §8.5 의 13개 검증 항목 중 다수가 소거된다. **[코드 근거로 셀 수 있는 감축]**

**이유 2 — §7 의 결함 1·2·3·4·5 가 한 번에 닫힌다.** 시트는 `role="dialog" aria-modal` 과 포커스 트랩이 기본값인 패턴이고(WCAG 4.1.2·2.4.3), 열린 동안 배경 락이 자연스러우며, 닫기 어포던스가 X·backdrop·스와이프·Escape 로 넷이 되고, 높이 0 trigger 문제가 성립하지 않는다(카드는 접힌 상태 그대로 남는다). 개별 패치 5건 대신 패턴 교체 1건이다. **[규범]**

**이유 3 — 데스크톱 계약을 건드리지 않는다.** 시트는 `isMobileViewport` 분기 아래에만 산다. 데스크톱 오버레이 확장(§8.2·§8.4), hover-lock(§7.5), 키보드 순차 확장(§7.6)은 그대로 유지되므로, 리팩터의 폭발 반경이 모바일로 제한된다. 결정 2(터치 태블릿을 입력 방식으로 가른다)를 적용하면 터치 태블릿이 시트 쪽으로 넘어오고, 그 순간 프롬프트가 실측한 **터치 태블릿의 「닫을 방법 없음」이 별도 수정 없이 해소된다** — 시트에는 X 가 있기 때문이다. **[코드 + 기주어짐]**

**이유 4 — 시작 비용을 늘리지 않는다.** 탭 수는 2탭 그대로다(카드 → 시트의 A/B). 선택지 C 는 여기에 페이지 로드를 더한다.

**추천에 포함되지 않는 것:** 탐색 비용(3.76화면)은 **확장 모델과 직교하는 축**이므로 B 가 해결하지 못한다. 그것은 카드 밀도의 문제이며 선택지 D 의 축소판(썸네일 비율을 16:6 에서 낮추고 subtitle 클램프를 모바일에도 도입)으로 따로 다뤄야 한다. 다만 `landing-grid-card.tsx:379, 408` 이 모바일에서 클램프를 **의도적으로 끈** 것이므로(§6.6 계약과 12 locale E2E 가 그 값을 붙들고 있다 — `tests/e2e/grid-smoke.spec.ts:487, 1196`), 밀도 변경은 계약 개정과 12 locale 재검증을 동반하는 별도 단위로 계획해야 한다. **두 축을 한 단위로 묶지 말 것.**

---

## 9. 미확인 (확인하지 못했거나 판단이 갈리는 지점)

1. **baseline 모바일 장수 40 vs 44.** 본 세션 계수는 `git ls-files 'tests/e2e/*-snapshots/*' | grep -c -- "-mobile-"` = 40, 전체 추적 170(theme-matrix 164 + safari 5 + state-smoke 1). 프롬프트의 「164 중 모바일 44」와 4장 어긋난다. 계수 기준(뷰포트 접미사 vs 파일명 포함)의 차이로 보이나 확정하지 못했다.
2. **`calc(100dvh-116px)` 의 116px 유래.** 코드 3곳 리터럴, 문서·토큰·테스트 어디에도 없음. 56(모바일 GNB) + 60(?) 으로 분해되는지 확인 불가.
3. **backdrop 이 GNB 를 덮지 않는다는 판정은 추론이다.** `container-type: inline-size` 가 스태킹 컨텍스트를 만든다는 사양에 기댄 연역이며, 실제 렌더에서 `elementFromPoint` 로 확인하지 않았다.
4. **모바일 `OPENING → OPEN` 경계의 실제 레이아웃 점프 폭**(확장 본문 높이 − 접힌 카드 높이)을 실측하지 않았다. 코드상 그 프레임에 발생한다는 것만 확정했다.
5. **`interactionMode='tap'` + `viewportTier='tablet'` 조합에서 `pointer-events` 경로의 실제 동작.** 프롬프트가 실측(재탭 닫기 불가, 답변 버튼이 가로챔)을 제공했고, 코드상 `landing-grid-card.tsx:1059` 의 `showDesktopExpandedShell && 'pointer-events-none'` 이 그 원인으로 보이나 본 세션에서 브라우저로 재현하지 않았다.
6. **`qa:rules` / `test:e2e:gate` 의 현재 통과 여부**를 실행하지 않았다(읽기 전용 과제 범위 밖).
7. **`use-hover-intent-controller.ts` 의 340~527행**은 읽지 않았다. 데스크톱 hover 경로 전용이고 모바일 분기 9개는 앞부분에서 확인했으나, 뒷부분에 모바일에 영향을 주는 분기가 있는지는 미확인이다.
8. **`docs/design/design.md` 의 모바일 관련 조항**을 이번 과제에서 읽지 않았다(§7 application 레이어가 시트/확장을 어떻게 규정하는지 미확인). 선택지 B 를 계획으로 옮기기 전에 반드시 대조해야 한다.
9. **성능 예산**(모바일에서 카드 8장 × ResizeObserver 32개 + rAF 루프의 실제 비용)은 산술로 개수만 셌고 프로파일링하지 않았다.
