# feedback-state — 로딩 · 빈 상태 · 에러 · disabled · 낙관적 업데이트 · 진행 표시 · 터치 피드백

분석 대상 clone: `/Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis` (읽기 전용, HEAD `7616211` 착수 마커, 부모 `a5aec95`). 아래 모든 `file:line` 은 이 clone 기준 저장소 상대경로다. 저장소는 수정하지 않았다 — `git status --porcelain` 빈 출력으로 확인.

근거 표기: **[규범]** WCAG 2.2 / iOS HIG / Material 3 · **[패턴]** 모바일 웹 관용 · **[계약]** `docs/**` 조항 · **[구조]** 코드 내부 모순 · **[측]** 이 세션에서 계산·컴파일·파싱한 값 · **[미]** 미확인.

---

## 0. 이 렌즈가 먼저 재야 했던 것 — 세 개의 실측

### 0-1. `hover:` 는 터치 기기에서 아예 컴파일 대상이 아니다 (컴파일로 확인)

저장소의 Tailwind 4.1.0 을 직접 호출해 variant 출력을 받았다(`node --input-type=module` 로 `tailwindcss` 의 `compile()` 을 repo 루트에서 실행).

```
.hover\:bg-red-500   { &:hover { @media (hover: hover) { … } } }
.focus-visible\:bg-red-500 { &:focus-visible { … } }
.active\:bg-red-500  { &:active { … } }
.dark\:bg-red-500    { @media (prefers-color-scheme: dark) { … } }
```

즉 **`hover:` 유틸리티는 `@media (hover: hover)` 안에 들어가므로 진짜 터치 기기에서는 한 번도 적용되지 않고, `active:` 는 미디어 조건 없이 `&:active` 로 나가므로 터치에서 발화한다.** 이 저장소의 상태 어휘는 압도적으로 `hover:` 에 실려 있으므로, 이 한 줄이 「모바일에 눌림 피드백이 있는가」라는 질문을 「`active:` 가 몇 개인가」로 환원한다.

### 0-2. `active:` 는 저장소 전체에 선언 지점 4개다 (전수 grep)

`grep -rn "\bactive:" src/ public/` 에서 Tailwind 눌림 variant 인 것만 추리면 정확히 넷이다.

| # | file:line | 상수 | 실제 도달하는 컨트롤 |
|---:|:---|:---|:---|
| 1 | `src/features/ui/button-class-names.ts:89` | `buttonPrimaryPressedClassName` | 테스트 primary(시작·다음·제출·결과 CTA) · 동의 배너 `Accept all` |
| 2 | `src/features/ui/button-class-names.ts:97` | `buttonPrimaryLiftClassName` | 테스트 primary 만 |
| 3 | `src/features/ui/button-class-names.ts:101` | `buttonSecondaryClassName` | 테스트 secondary(이전·뒤로·취소) · 동의 배너 `Deny` · 결과 secondary CTA |
| 4 | `src/features/gnb/site-gnb.tsx:63-64` | `gnbInteractiveButtonBaseClassName` | GNB pill 3종(Back · 햄버거 · 설정 트리거) |

`src/features/landing/grid/landing-grid-card.tsx` 의 `active:` grep 히트 5건(`:642 :651 :660 :679 :708`)은 전부 `interactive:` prop 타입 선언이며 **눌림 variant 는 0개**다.

### 0-3. UA 기본 탭 하이라이트도 선언된 적이 없다

`-webkit-tap-highlight-color` 는 `src/` 전체에서 0건이다(유일한 히트 `public/56T-ToDo.html:37` 은 제품 코드가 아닌 578KB 짜리 무관 정적 파일). 따라서 눌림 피드백이 없는 컨트롤의 마지막 방어선은 브라우저 기본값이고, 그 값은 iOS Safari 와 Android Chrome 이 서로 다르며 요소 종류(`<div role="button">` 대 `<button>`)에 따라 나타나지 않기도 한다 — 제품이 통제하지 않는 값이다. **[패턴]**

---

## 1. `:active` / `:focus-visible` 전수 census

계산 규칙: 클래스 문자열을 상수 정의에서 그대로 읽고, 조립 사슬(`${…}`)을 끝까지 따라간다.

| 표면 | 컨트롤 | 클래스 정의 | `:active` | `:focus-visible` |
|:---|:---|:---|:---:|:---:|
| landing | **카드 트리거**(카드 전체, 모바일 최대 타깃) | `landing-grid-card.tsx:214-215` | ✕ | ✕(`focus:outline-none` + 루트 `:has()` 링) |
| landing | **확장 카드 답변 A/B**(테스트 진입점) | `landing-grid-card.tsx:234` | ✕ | ○(자체 outline) |
| landing | **모바일 닫기 X** | `landing-grid-card.tsx:278-281` | ✕ | ✕(자체 링 없음 — 루트 링만) |
| landing | 동의 배너 `Accept all` / `Deny` | `consent-banner.tsx:52,60` | ○ | ○ |
| landing | 동의 배너 `Preferences` | `consent-banner.tsx:65` → `button-class-names.ts:108` | ✕ | ○ |
| gnb | Back · 햄버거 · 설정 트리거 pill | `site-gnb.tsx:63-64` | ○ | ○ |
| gnb | **드로어 nav 링크 ×3**(모바일 유일 내비) | `site-gnb.tsx:100-101` | ✕ | ✕(UA 기본) |
| gnb | 데스크톱 nav 링크 ×2 | `site-gnb.tsx:49-50` | ✕ | ✕(UA 기본) |
| gnb | CI 브랜드 링크 | `site-gnb.tsx:45` | ✕ | ✕(UA 기본) |
| settings | 테마 칩 ×2 · 로케일 칩 ×12 | `settings-controls.tsx:28-29` | ✕ | ○ |
| test | **답변 A/B** | `surface-class-names.ts:82-83` | ✕ | ○ |
| test | qualifier 선택지 | 같은 클래스(`instruction-overlay.tsx:168`) | ✕ | ○ |
| test | qualifier 재진입 칩(`<div role="button">`) | `surface-class-names.ts:92-93` · `qualifier-chip.tsx:24-32` | ✕ | ○ |
| test | 이전 · 제출 · 오버레이 primary/secondary | `surface-class-names.ts:59,61` | ○ | ○ |
| test | 오버레이 quiet(`거부하고 시작`·`취소`) | `surface-class-names.ts:63` → `button-class-names.ts:108` | ✕ | ○ |
| test | 결과 CTA ×2 | `test-result-panel.tsx:34-35` | ○ | ○ |
| blog | **기사 목록 행**(이 표면의 유일한 인터랙션) | `blog-destination-client.tsx:44-45` | ✕ | ○(자체 outline) |
| 404 ×2 | `Return home` 링크 | `button-class-names.ts:117` | ✕(주석 `:114` 이 의도로 명시) | ○ |

**표면별 집계.** 랜딩 고유 컨트롤 3종 중 눌림 0/3 · 블로그 1종 중 0/1 · 모바일 드로어 17종(링크 3 + 칩 14) 중 0/17 · 테스트 9종 중 4/9. 눌림을 가진 컨트롤은 전부 「버튼처럼 생긴 버튼」이고, **모바일에서 실제로 많이 눌리는 것(카드·답변 행·목록 행·드로어 링크·칩)은 전부 없는 쪽**이다.

**`:focus-visible` 은 5개 메커니즘으로 덮여 있다** — `focusRingClassName`(`button-class-names.ts:34-35`) · 확장 답변 자체 링(`landing-grid-card.tsx:234`) · 카드 루트 `:has(:focus-visible)`(`landing-grid-card.module.css:81`) · 데스크톱 오버레이 레이어(`same:211,215`) · 블로그 행 자체 링(`blog-destination-client.tsx:45`). 빈 곳은 GNB 의 링크 3계열뿐이고 그것들은 UA 기본 링으로 떨어진다(Tailwind v4 preflight 는 `outline` 을 지우지 않는다 — `node_modules/tailwindcss/preflight.css` 에서 `outline` 은 `:-moz-focusring { outline: auto }` 한 줄뿐).

---

## 2. 비동기 지점 전수 — 각각에 로딩 피드백이 있는가

`src/` 에서 네트워크·라우팅·지연이 개입하는 지점을 전수로 찾았다(`fetch` 1건 · `router.push/replace` · `setTimeout` 지연 · rAF 폴링 · hydration 경계).

| # | 비동기 지점 | file:line | 지속 | 로딩 피드백 |
|---:|:---|:---|:---|:---|
| 1 | 랜딩 → 테스트/블로그 `router.push` | `use-landing-transition.ts:39,62` | 제품 자신의 예산 **1600ms**(`transition/constants.ts:1`) | **없음.** 출발지는 §13.3 계약대로 시작 프레임에서 얼어붙고(`req-landing.md:867`) 전 카드가 `pointerEvents:'none'`(`landing-grid-card.tsx:1166`) |
| 2 | 로케일 변경 `router.push` | `site-gnb.tsx:203-212` | 전체 라우트 전환 | **없음.** 드로어가 먼저 즉시 닫히고(`:210`) 화면은 옛 언어 그대로 |
| 3 | 테스트 부팅(`booting`) | `test-question-client.tsx:154` | hydration + consent sync | **없음.** 오버레이가 숨겨지고 **문항 패널이 그대로 렌더된다**(§4-1) |
| 4 | `redirecting`(거부하고 중단) | `use-test-entry-orchestrator.ts:208-214` · `test-run-reducer.ts:154` | `router.replace` 완료까지 | **없음.** 같은 규칙으로 오버레이가 사라지고 시험지가 드러난다 |
| 5 | 답변 자동 진행 잠금 150ms | `use-answer-lock.ts:32` | 150ms | `disabled` 만(`test-question-client.tsx:364,377`), 시각 처리는 `disabled:cursor-default` 뿐 |
| 6 | 테마 전환 view-transition | `hooks/theme-transition.ts:3-9` | **2500ms** | 마스크 확장 자체가 피드백. 다만 그 사이 탭한 칩은 `disabled` 로 **70% 로 어두워진다**(§5) |
| 7 | 모바일 카드 열기/닫기 | `use-mobile-card-lifecycle.ts` | 280ms + rAF 복원 폴링 | 모션 자체가 피드백 — 이 렌즈에서 유일하게 문제없는 지점 |
| 8 | 텔레메트리 POST | `telemetry/runtime.ts:100-107` | — | 의도적 fire-and-forget(주석 `:105`). 사용자 피드백 대상 아님 — 결함 아님 |
| 9 | 동의 배너 spacer 실측 | `consent-banner.tsx:18,236` | rAF | SSR 추정 120px → 마운트 후 실측 교체(레이아웃 시프트, 다른 렌즈 소관) |

**스켈레톤·스피너·`Suspense`·`loading.tsx` 는 저장소 전체에 0건이다**(`grep -rni 'skeleton|shimmer|spinner' src/` = 0 · `grep -rn 'Suspense' src/` = 0 · `find src/app -name 'loading.tsx'` = 0). **`error.tsx` / `global-error.tsx` 도 0건이다.**

---

## 3. 빈 상태 · 에러 상태 현황

| 표면 | 상태 | 구현 | 행동 | 판정 |
|:---|:---|:---|:---:|:---|
| history | 항상 빈 상태(목록 코드 0줄) | `history/page.tsx:33-51` | **0개** | 결함 F-08 |
| history | 디버그 문자열 `Locale: en` 이 본문 세 번째 줄 | `history/page.tsx:48` | — | 결함 F-08 |
| blog 색인/상세 | 기사 0건 | `blog-destination-client.tsx:140-144` | 0개 | 결함 F-19(하드코딩 영문 `No article available.`) |
| blog 상세 | 죽은 링크 | `blog/[variant]/page.tsx:42-45` | 침묵 redirect | 결함 F-15 |
| landing | consent 거부로 카드 8→2 | `attribute.ts:56-58` · `landing-catalog-grid-loader.tsx:17-23` | 0개, 설명 0줄 | 결함 F-09 |
| test/error | 진입 차단 | `test/error/page.tsx:44-56` | **0개** | 결함 F-04 |
| 404(segment) | — | `not-found.tsx:38` | 1개 | 양호(영문 고정은 i18n 렌즈) |
| 404(global) | — | `global-not-found.tsx:53` | 1개 | 양호 |
| 모든 표면 | 클라이언트 예외 | — | 경계 0개 | 결함 F-05 |

**빈 상태와 에러 상태가 시각적으로 구별되지 않는다.** `history/page.tsx:15-16` · `test/error/page.tsx:13-14` · `not-found.tsx:15-16` 세 파일이 **같은 클래스 문자열**(`grid h-11 w-11 place-items-center rounded-full bg-[var(--accent-subtle)] text-[var(--accent-fg)]`)을 각자 적고 있다. 「이력이 비었다」와 「이 테스트에 진입할 수 없다」가 같은 44px 세이지 원으로 나온다.

---

## 4. 결함 상세

### F-01 (blocker) 탭에서 목적지 페인트까지 피드백이 0이다 — 계약이 그것을 요구한다

랜딩에서 테스트를 시작하는 입력은 확장 카드의 답변 A/B 탭이고(`req-landing.md:269`), 그 핸들러는 `handleAnswerChoiceSelect`(`use-landing-interaction-controller.ts:609-623`) → `beginTestTransition` → `router.push`(`use-landing-transition.ts:39`) 다. 블로그 카드는 `handleCardClick`(`:567-577`) → 같은 경로. 이 순간부터 목적지가 그려질 때까지 사용자에게 일어나는 일은 다음 셋이 전부다 — ⑴ `pageState = 'TRANSITIONING'`, ⑵ 모든 카드가 `pointerEvents: 'none'`(`landing-grid-card.tsx:1166`) · `aria-disabled` · `tabIndex=-1`(`use-landing-interaction-controller.ts:700-702`), ⑶ 출발 카드는 시작 프레임 상태로 고정.

**셋 다 「사라지는 것」이지 「생기는 것」이 아니다.** 탭한 답변 버튼은 `:active` 도 `data-selected` 도 없으므로(§1) 눌렸다는 표시조차 남기지 않고, `data-page-state`(`landing-catalog-grid.tsx:185`)는 어떤 CSS 규칙도 읽지 않는 QA 앵커다(`landing-*.module.css` 전수 확인). `TransitionGnbOverlay` 는 `context === 'landing'` 이면 `null` 을 반환하므로(`transition-gnb-overlay.tsx:19-21`) 출발지에서는 그마저 없다.

이 창의 길이는 제품 자신이 적어 뒀다 — `LANDING_TRANSITION_TIMEOUT_MS = 1600`(`transition/constants.ts:1`), 계약 문장은 `req-landing.md:879`. 즉 **설계가 최대 1.6초의 무피드백 대기를 상정하고 있다.** 그리고 그 1600ms 가 만료되면 `terminatePendingLandingTransition` 이 내부 신호만 쏘고(`transition/runtime.ts:97-110`) UI 는 아무것도 하지 않는다 — 실패도 침묵이다.

**개정해야 하는 것은 구현이 아니라 조항이다.** `req-landing.md:867` 「시작 프레임의 카드 시각 상태를 고정한다」와 `:868` 「전환 중 상태 되돌림을 금지한다」가 pending 표시를 문면으로 봉쇄한다. 이 둘은 **되돌림(rollback)을 막으려는 규칙인데 「추가」까지 함께 막고 있다** — 조항을 「시작 프레임의 카드 **콘텐츠·기하**를 고정한다. pending 표시의 추가는 되돌림이 아니다」로 가르면 계약 의도를 유지한 채 열린다.

처방: ⑴ 탭한 답변 버튼에 즉시 `data-pending="true"` 로 눌림+선택 표식을 남기고, ⑵ `pageState==='TRANSITIONING'` 동안 GNB 하단 hairline 자리에 2px 진행 인디케이터를 띄우고(이미 `data-elevated` 전이가 있는 자리라 새 레이어가 필요 없다), ⑶ 1600ms 만료 시 「이동하지 못했습니다 · 다시 시도」를 렌더한다(현재는 텔레메트리만).

### F-02 (blocker) 모바일에 눌림 피드백이 없다 — 어휘는 이미 있는데 안 쓰였다

§0-1~§0-3 과 §1 의 census 가 근거다. 요지 셋: ⑴ `hover:` 는 터치에서 컴파일 조건상 절대 발화하지 않는다(컴파일 확인), ⑵ `active:` 는 선언 지점 4개뿐이고 랜딩 카드 트리거·양쪽 답변 행·드로어 링크·14개 칩·블로그 행·모바일 닫기 X 는 전부 밖이다, ⑶ `-webkit-tap-highlight-color` 가 0건이라 남는 것은 통제되지 않는 UA 기본값이다.

**설계 정의 계층에도 같은 구멍이 있다 — 이것은 구현 누락이 아니라 명세 누락이다.** `docs/design/ds/catalog-components.css` 의 `.vt-choice`(`:505-546`)와 `.vt-choice--answer`(`:587-607`)는 hover · focus-visible · is-selected 를 정의하지만 `:active` / `.is-pressed` 를 **정의하지 않는다**. 같은 파일에서 `.vt-cta`(`:652-653`)와 `app-components.css` 의 `.vt-btn--primary`(`:138`) · `.vt-btn--secondary`(`:158`)는 갖고 있다. 즉 「결정 버튼은 눌림이 있고, 한 회차에 열두 번 누르는 선택 행은 없다」는 배분이 명세 단계에서 이미 뒤집혀 있다. `docs/design/design.md` §4.10(`:111-115`)의 접근성 목록도 포커스만 말하고 눌림을 한 번도 언급하지 않는다.

처방: `docs/design/ds/catalog-components.css` 에 `.vt-choice:active / .is-pressed` 를 신설하고(값은 이미 있는 `--sage-muted` 채움 + `--sage` 모서리를 한 단 깊게, 혹은 `--accent-solid-pressed` 계열과 대칭이 되는 단계) `design.md` §4.10 에 「모든 인터랙티브 컨트롤은 `:active` 상태를 갖는다 — 터치에는 hover 가 없다」를 불변식으로 추가한다. 런타임에서는 `button-class-names.ts` 에 `pressedSurfaceClassName` 조각 하나를 만들어 `LANDING_GRID_CARD_TRIGGER_BASE_CLASSNAME`(`:215`) · `LANDING_GRID_CARD_ANSWER_CHOICE_CLASSNAME`(`:234`) · `LANDING_GRID_CARD_MOBILE_CLOSE_CLASSNAME`(`:280`) · `testAnswerChoiceClassName`(`surface-class-names.ts:83`) · `testChipClassName`(`:93`) · `buttonQuietClassName`(`button-class-names.ts:109`) · `gnbMobileLinkClassName`(`site-gnb.tsx:100-101`) · `gnbDesktopLinkClassName`(`:49-50`) · `gnbBrandLinkClassName`(`:45`) · `chipBaseClassName`(`settings-controls.tsx:29`) · `blogArticleLinkClassName`(`blog-destination-client.tsx:45`) 에 얹는다. 그리고 `globals.css` 의 base 레이어에 `-webkit-tap-highlight-color: transparent` 를 한 줄 선언해 UA 기본값과 제품 눌림이 겹쳐 두 번 깜빡이는 것을 막는다.

시각 baseline 영향은 **0** 이다 — 눌림은 정지 상태가 아니라 캡처되지 않는다.

### F-03 (major) unavailable 카드를 탭하면 문자 그대로 아무 일도 일어나지 않는다

`handleCardClick`(`use-landing-interaction-controller.ts:557-562`)이 `activationBlocked` 일 때 `event.preventDefault(); event.stopPropagation(); return;` 로 끝난다. `creativity-profile` 은 `attribute: unavailable` 이므로 `isEnterableCard` 가 false → 항상 이 경로다. 그 카드에는 §1 대로 `:active` 도 없고, `tabIndex=-1`(`interaction-state.ts:490-493`)이라 포커스 링도 뜨지 않으며, 토스트·스낵바·설명 패널은 저장소에 존재하지 않는다.

**남는 것은 「상시 라벨」뿐이다** — `coming soon` 태그 칩(`landing-grid-card.tsx:1077` → `:230` 의 tag-chip), `--unavailable-surface` 배경과 0.72 로 흐려진 썸네일(`landing-grid-card.module.css:108-118`). 데스크톱에서는 커서가 `cursor-default` 로 바뀌어(`landing-grid-card.tsx:215` 의 `aria-[disabled=true]:cursor-default`) 누르기 **전에** 신호가 오지만, **터치에는 커서가 없으므로 그 신호가 통째로 사라진다.** 결과: 모바일 사용자는 카드를 누르고 아무 반응도 받지 못하며, 그것은 「준비 중」이 아니라 「앱이 멈췄다」로 읽힌다. **[패턴: iOS HIG·Material 3 은 비활성 컨트롤에 대해 커서가 아니라 **시각 무게**로 사전 신호를 주고, 그것으로 부족하면 탭에 설명을 붙인다]**

계약이 이 모양을 요구한다 — `docs/design/design.md:115` 「Unavailable cards are removed from the tab order; **they are visually inert** but not styled like a broken disabled button」과 `docs/req-landing.md:858` 「unavailable Test 카드는 Expanded/CTA/전환을 허용하지 않는다」. 전자의 "visually inert" 가 터치에서 「무반응」이 되는 지점이다.

처방: design.md §4.10/§7.5 에 「터치 입력에서 차단된 컨트롤은 탭에 대해 비파괴적 설명 응답을 준다」를 추가하고, 카드 탭 시 `coming soon` 칩을 1회 강조(140ms `--dur-fast` 안의 배경 한 단, 모션 금지 목록 위반 아님)하거나 카드 하단에 상시 한 줄(`준비 중입니다 — 공개되면 알려드릴게요` 류)을 두어 **탭 전에도 탭 후에도 읽히는 신호**로 만든다. 전자는 `--dur-fast` 하나로 끝나고 baseline 을 바꾸지 않으며, 후자는 `landing-normal` 6뷰포트 × 4 = 24장을 재생성한다.

### F-04 (blocker) `/test/error` 는 복구 수단이 0개인 막다른 길이며, 같은 문서가 이미 그것을 금지하고 있다

`src/app/[locale]/test/error/page.tsx:44-56` 이 렌더하는 것은 44px X 아이콘(`aria-hidden`)과 `<h1>` 하나다. **링크 0개 · 버튼 0개.** 그리고 `context="test"` 이므로 GNB 는 Back pill 과 동작하지 않는 `00:00` 플레이스홀더 타이머만 그린다(`site-gnb.tsx:377,411`) — 에러 화면에 러닝 타이머가 떠 있고, 테마·언어에도 닿을 수 없다.

**문서 내부 모순이다.** `docs/req-test.md:317` 은 「에러 복구 페이지는 사용자가 다른 테스트를 선택할 수 있는 복구 경로를 제공해야 한다」로 단정하고 `:310` 이 Recoverable UI Error 를 「retry / 다른 테스트 선택 / 홈 복귀 등 복구 경로를 제공해야 하는 오류 상태」로 정의하는데, 같은 문서 §6.1 의 「현재 에러 복구 페이지 계약」(`:841-846`)은 crash 금지 · session 미생성 · 고정 메시지 셋만 요구하고 복구 경로를 빼 두었다(복구 카드는 `:848-857` 의 Phase 4 로 분리). 즉 **§3.2 가 필수라고 적은 것을 §6.1 이 선택으로 내렸고, 구현은 §6.1 을 따랐다.**

처방: §6.1 의 현재 계약에 「랜딩으로 돌아가기 CTA 는 Phase 와 무관하게 항상 존재한다」한 줄을 넣고, `test/error/page.tsx` 에 `linkButtonPrimaryClassName`(`button-class-names.ts:117`, 404 두 장이 이미 쓰는 완성형) 으로 랜딩 CTA 를 놓는다. 카드 2장(Phase 4)은 그대로 미뤄도 된다. **게이트 영향 0** — `routing-smoke.spec.ts:118-127` 은 `toContainText` 부분일치와 `not.toContainText('variant:')` 뿐이라 CTA 추가로 붉어지지 않고, theme-matrix 매니페스트에 `/test/error` 케이스가 없어(전수 확인: layoutCase 4 + stateCase 13 중 0건) baseline 도 0장이다.

### F-05 (blocker) 에러 경계가 저장소 전체에 0개다

`find src/app -type f` 결과에 `error.tsx` · `global-error.tsx` 가 없다. React `ErrorBoundary` 구현도 `src/` 전체에 0건이다. 따라서 클라이언트 컴포넌트 어디에서든 예외가 나면 Next 의 내장 폴백으로 떨어지고, 그 화면은 **영어 고정 · 브랜드 없음 · 로케일 없음 · 복구 CTA 없음**이다. 모바일에서는 그것이 화면 전체다.

이 저장소에서 그 경로가 이론적이지 않은 이유가 F-06 이다.

### F-06 (blocker) 답변 저장이 유일하게 가드 없는 storage 쓰기이고, 실패하면 테스트가 조용히 멈춘다

`src/features/test/storage/response-set.ts:41-49` 의 `writeResponseSet` 은 전역 `localStorage.setItem` 을 **직접** 호출한다. 같은 파일의 읽기(`:51-77`)는 `getLocalStorage()` 가드(`:7-17`)를 쓰고, `active-run.ts:74-80` · `state-flags.ts:22-30` · `instruction-seen.ts:17-19` · `volatility.ts:32-46` 도 전부 가드를 쓴다. **전수 grep 결과 가드 밖의 storage 접근은 이 한 줄뿐이다.**

호출 순서가 문제를 키운다. `updateAnswer`(`use-test-run-controller.ts:169-183`)는 `dispatchRunAction`(`:176`) 다음에 `writeResponseSet`(`:181`) 을 부르고, 그 `updateAnswer` 는 `handleAnswerChoice` 의 **첫 문장**(`use-answer-handler.ts:68`)이다. 저장이 throw 하면 `:70-80`(텔레메트리)과 `:87-93`(`lockAnswer` → 자동 진행 예약)이 **한 줄도 실행되지 않는다.** 자동 진행은 계약이 요구하는 유일한 전진 수단이고(`req-test.md:677-678`, `NAVIGATE_NEXT` 액션 자체가 리듀서에 없다), 「이전」말고는 다음 문항으로 갈 방법이 없다. 결과: **사용자는 답을 눌렀고 화면은 멈춘 채 다시 눌러도 같은 자리다 — 그리고 F-05 때문에 에러 화면조차 안 뜬다.**

발동 조건은 흔하다 — iOS Safari 의 「모든 쿠키 차단」/사이트 데이터 차단에서 `window.localStorage` **접근 자체**가 SecurityError 를 던지고, 저장 공간이 찬 기기에서는 `setItem` 이 QuotaExceededError 를 던진다. **[미]** 실기기 재현은 하지 않았다 — 확정한 것은 코드 경로다.

처방: ⑴ `writeResponseSet` 을 나머지와 같은 `getLocalStorage()` 가드 + `try/catch` 로 맞추고, ⑵ 모든 `setItem` 을 `try/catch` 로 감싸 QuotaExceededError 를 잡고, ⑶ **실패를 삼키지 말고** 호출자에 `boolean` 을 돌려 `handleAnswerChoice` 가 「이 기기에는 진행 상황을 저장할 수 없습니다 — 계속하면 새로고침 시 처음부터 시작합니다」를 한 번 띄운 뒤 **자동 진행은 그대로 수행**하게 한다(저장 실패가 진행을 막을 이유가 없다). ⑷ `error.tsx` 를 `[locale]` 세그먼트에 두어 남은 예외를 로케일·브랜드가 있는 화면으로 받는다.

### F-07 (major) `booting` 과 `redirecting` 이 로딩 상태를 그리지 않고 「보여서는 안 되는 것」을 그린다

`resolveInstructionVisible`(`test-question-client.tsx:80-93`)의 `:84` 가 `isBooting || entryCommitted || redirecting` 이면 오버레이를 숨긴다. 계약도 그 숨김을 요구한다(`req-test.md:399`). **그러나 그 동안 무엇을 보여야 하는지는 계약에도 구현에도 없다** — `:332-336` 의 문항 패널이 조건 없이 렌더되고 `aria-hidden` 도 붙지 않는다.

두 경로에서 구체적 피해가 다르다.

1. **부팅**(`isBooting = !runtimeReady || !consentSnapshot.synced`, `:154`). SSR 초기 상태가 `phase:'booting'`(`test-run-reducer.ts:54`) + `synced:false`(`consent-source.ts:20-23`)이므로 **SSR HTML 과 첫 페인트가 오버레이 없는 문항 화면**이다. `egtt` 에서는 `skipForwardPastProfile` 이 runtime active 일 때만 걸리므로(`use-test-run-controller.ts:157-161`) 그 화면이 `questions[0]` = profile 문항 `나의 성별은`(`fixtures/questions/egtt.ts:6-15`)을 그린다 — `req-test.md:675`·`:429` 가 「profile 문항은 runtime question panel 에 표시되지 않는다」로 금지한 바로 그 화면이다. 지속 시간 **[미]**(hydration 시간 측정 안 함).
2. **거부하고 중단**(`REDIRECT_HOME` → `phase:'redirecting'`, `use-test-entry-orchestrator.ts:208-214` · `test-run-reducer.ts:154`). 사용자가 「진입하지 않겠다」를 누른 순간 다이얼로그가 사라지고 **거부한 시험지가 드러난 채** `router.replace` 가 끝나기를 기다린다.

처방: `resolveInstructionVisible` 을 3값(`'overlay' | 'pending' | 'runtime'`)으로 바꾸고 `booting`·`redirecting` 을 `'pending'` 으로 보낸다. `'pending'` 은 문항 패널 대신 카드 골격(제목 + 진행 트랙 + 선택지 2행 자리)만 그리는 스켈레톤이며, 같은 기하를 쓰므로 hydration 시 레이아웃 시프트가 0 이다. `req-test.md:399` 에 「booting/redirecting 동안 runtime question content 를 렌더하면 안 된다」를 추가한다.

### F-08 (major) 히스토리 빈 상태에 행동이 없고, 라벨은 이미 12 로케일 번역돼 있으며, 디버그 문자열이 본문에 남아 있다

`src/app/[locale]/history/page.tsx:33-51` 이 전부다 — 시계 아이콘 + `t('title')` + `t('body')` + `` {`Locale: ${locale}`} ``(`:48`). 링크도 버튼도 0개다.

세 가지가 동시에 어긋난다.

- **행동 0개.** 저장소 자신의 보이스 규칙이 `docs/design/ds/README.md:66` 「Empty states are one line of guidance + one action」이고, 설계 표본은 `Browse tests` 버튼을 그린다(`docs/design/ds/preview/secondary-surfaces.html:33`). 그리고 **라벨은 이미 있다** — `history.goHome`(`Go home`) · `history.open` · `history.delete` · `history.clearAll` 네 키가 12 로케일 전부에 존재하고 소비자가 0이다(`src/messages/en.json` 확인 + `history/page.tsx:46-47` 이 `title`/`body` 만 읽는다).
- **카피가 상태가 아니라 정책을 말한다.** 제품은 `Local Result History` / `Each completed run is stored as an independent entry (newest first, max 50).`, 설계 표본은 `No results yet` / `Finish a test and it is kept here on this device — newest first, up to fifty.`(`preview:31-32`). 전자는 **빈 상태로 읽히지 않는다** — 제목이 페이지 이름이고 본문이 저장 정책이다.
- **디버그 문자열.** `Locale: en` 이 세 번째 문단으로 프로덕션에 나간다. 파일 주석(`:10-11`)이 그것을 「보고 대상」으로 남겨 뒀다 — 이 문서가 그 보고다.

**퍼널이 이 막다른 길로 향한다.** `test-result-panel.tsx:94-99` 가 결과 화면에 `이력 보기` CTA 를 놓는데, 이력 저장 모듈은 존재하지 않는다(`grep -rn "resultHistory|HISTORY" src/` 무매치). 방금 테스트를 끝낸 사용자가 그 버튼을 누르면 「완료된 회차는 항목으로 저장됩니다」라고 적힌 빈 화면에 도착한다.

처방: `history.goHome` 키를 실제로 소비해 `linkButtonPrimaryClassName` 으로 랜딩 CTA 를 놓고, `history.title`/`history.body` 를 표본의 문장으로 12 로케일 교체하고, `:48` 을 삭제한다. 게이트: `history-default` baseline 24장(모바일 4 포함) 재생성 — 승인 필요.

### F-09 (major) 동의 거부 사용자의 랜딩이 8장에서 2장으로 접히고 아무 설명도 없다

`LandingCatalogGridLoader`(`landing-catalog-grid-loader.tsx:17-23`)가 클라이언트에서 `resolveLandingCatalog(locale, {consentState})` 를 부르고, consent 초기값은 `{consentState:'UNKNOWN', synced:false}`(`consent-source.ts:20-23`)다. 즉 **SSR·첫 페인트는 UNKNOWN → 8장**, hydration 후 `OPTED_OUT` 이면 `available` 카드가 전부 사라져(`attribute.ts:56-58`) **2장**만 남는다(그중 진입 가능은 `energy-check` 1장).

계약은 필터링만 규정한다 — `req-landing.md:1029` 「Disagree All 선택 시 카탈로그에는 opt_out 카드와 unavailable 카드만 남는다」, `:1030` 「consent 상태 변경은 카탈로그 필터링에 즉시 반영되어야 한다」. **줄어든 이유를 알릴 의무는 어디에도 없다.** `landing` 네임스페이스 메시지 11개 어디에도 그 상태의 카피가 없다(전수 확인).

사용자가 보는 것: 카드가 8장 그려졌다가 6장이 사라지고, 원인을 알 길이 없다. 모바일에서는 1열이라 문서 높이가 약 3,173px 에서 1/4 이하로 줄어 스크롤 위치까지 튄다. **[패턴: 필터가 목록을 줄이면 「무엇이 왜 숨겨졌는가 + 해제 경로」를 같은 자리에 두는 것이 목록 UI 의 기본]**

처방: `req-landing.md` §13 에 「`OPTED_OUT` 카탈로그는 숨겨진 항목 수와 해제 경로를 그리드 상단에 1줄로 고지한다」를 추가하고, 그리드 위에 `n개 테스트는 분석 동의가 필요합니다 · 동의 변경` 한 줄을 놓는다(그 링크는 F-16 이 만드는 preferences 표면으로 간다). 첫 페인트-후-축소 자체는 `req-landing.md:741-742`(초기 렌더 window 분기 금지)와 얽혀 있어 제거 대상이 아니다.

### F-10 (major) 「지금 선택된 것」을 `disabled` 로 표현해서, 선택 표시가 화면에서 가장 흐린 요소가 된다

`settings-controls.tsx` 가 현재 테마 칩(`:158` `disabled={isCurrentTheme}`)과 현재 로케일 칩(`:182` `disabled={isCurrentLocale}`)에 `disabled` 를 건다. `chipBaseClassName`(`:28-29`)에 `disabled:opacity-70` 이 들어 있으므로 **선택된 칩만 70% 불투명도로 렌더된다.**

측정(이 세션에서 sRGB 상대휘도로 계산, 값은 `globals.css` 에서 읽음):

| 대상 | 100% | `opacity:.7` 합성 후 | 기준 |
|:---|---:|---:|:---|
| 로케일 칩 라벨 `--accent-fg` on `--sage-muted` (light) | 6.11:1 | **3.11:1** | WCAG 1.4.3 AA 4.5:1 |
| 같은 것 (dark) | 6.78:1 | **4.21:1** | 4.5:1 |
| 테마 스와치 선택 링 `--accent` on `--surface-raised` (light) | 3.75:1 | **2.37:1** | WCAG 1.4.11 3:1 |
| 같은 것 (dark) | 5.16:1 | 3.32:1 | 3:1 |

테마 스와치에서 링은 **유일한** 선택 신호다 — `settings-controls.tsx:38-45` 주석이 그 이유를 적는다(스와치의 내용이 곧 색이라 채움 교체로 선택을 표현할 수 없다). 그 유일한 신호가 light 에서 2.37:1 이다.

**게이트가 구조적으로 못 본다.** axe-core 4.11.1 의 `color-contrast` 매처는 `axe.js:27478` 에서 `if (is_disabled_default(virtualNode) || _isInert(virtualNode)) { return false; }` 로 **disabled 요소를 아예 검사 대상에서 뺀다**(소스 직접 확인). `a11y-smoke.spec.ts` 가 그 룰을 돌리고 있어도 이 칩들은 영원히 통과한다.

WCAG 1.4.3 의 「inactive user interface component」예외를 들 수 있지만 그것이 바로 결함의 진술이다 — **이 칩은 비활성 컨트롤이 아니라 토글 그룹의 현재 값이고, `aria-pressed={true}`(`:152`,`:181`)로 스스로 그렇게 선언한다.** `disabled` 는 그 요소를 탭 순서에서도 빼므로, 키보드/AT 사용자는 「지금 여기」를 말하는 항목에 착지할 수 없다. 모바일에서 설정에 닿는 유일한 경로가 이 드로어다(`site-gnb.tsx:468`).

처방: `disabled` 를 걷고 `aria-pressed` 만 남긴 뒤 `onClick` 을 현재 값이면 no-op 으로 만든다(로케일 쪽은 이미 `:184-185` 에서 그렇게 하고 있다). 선택 표현은 `chipSelectedStateClassName`(`:35-36`)/`chipSwatchSelectedStateClassName`(`:47-48`)만으로 충분하고 `disabled:opacity-70` 은 진짜 비활성에만 남는다. **게이트**: `gnb-smoke.spec.ts:128-129`(`button:not([disabled])` / `button[disabled]` 로 현재/대체 칩을 고른다)와 `:494-495` 가 같은 셀렉터를 쓰므로 둘을 `[aria-pressed="true"]`/`[aria-pressed="false"]` 로 바꿔야 한다. theme-matrix `*-settings-open` 12장 재생성.

### F-11 (major) 진행 표시가 「남은 양」을 말하지 않는다 — 트랙이 1.22:1 이고 분모가 화면에 없다

진행 표시는 세 요소다 — `진행률` 라벨(`test-question-client.tsx:258`) · 퍼센트 텍스트(`:259-261`) · 6px 트랙+채움(`:263-277`). ARIA 는 완비돼 있다(`role="progressbar"` + `aria-valuemin/max/now/valuetext`, `:263-272`).

문제는 둘이다.

1. **트랙이 카드 바탕에서 보이지 않는다.** 트랙 `--surface-strong`(light `--warm-150` `#ece8df`)이 카드 `--canvas-elevated`(`#ffffff`) 위에 있어 **1.22:1**, dark 는 `--warm-700` `#504a43` on `--warm-900` `#1e1a16` 로 **1.98:1** 이다(계산). 채움 대 트랙은 light 3.07:1 · dark 3.35:1 로 1.4.11 을 통과하지만, **통과하는 것은 「칠해진 부분」이고 실패하는 것은 「전체 길이」다.** 38% 지점에서 사용자가 보는 것은 떠 있는 짧은 초록 선이고, 그 선이 무엇의 38% 인지 보여 주는 그릇이 안 보인다. WCAG 1.4.11 의 대상은 「콘텐츠 이해에 필요한 그래픽 객체의 부분」이며 트랙의 범위가 그 부분이다.
2. **분모가 화면 어디에도 없다.** 보이는 숫자는 퍼센트(`test.progressValue` = `"{percent}%"`)와 `Q{n}` overline(`:347-351`)뿐이고 총 문항 수는 렌더되지 않는다. 그리고 `req-test.md:683` 이 「문항 번호 텍스트(예: `Question N of M`)는 표시하지 않는다」로 **명시적으로 금지**한다. 데스크톱에서는 짧은 플로우라 덜 아프지만, 모바일은 한 화면에 한 문항이라 「얼마나 남았나」가 유일한 방향 감각이다.

처방: 트랙을 `--hairline-strong`(`#d6d1c4`, 대 `#ffffff` 1.52:1)로 올리는 것으로는 부족하므로 트랙에 1px `--border-strong` 테두리를 주거나 트랙 색을 3:1 을 넘는 단계로 올린다. 그리고 `req-test.md:683` 을 「진행 상태는 프로그레스 바와 퍼센트로 표시하며, scoring 총량을 함께 표시할 수 있다. canonical index 를 노출하는 `Question N of M` 형식은 금지한다」로 가른다 — 금지의 진짜 의도는 **canonical index 유출 방지**(`:684` 가 그렇게 적는다)이지 총량 은닉이 아니다. 그 뒤 `진행률 · 3/8` 같은 형태로 분모를 노출한다. 게이트: `test-question` 4 + `mobile-test-question` 4 baseline.

### F-12 (major) 상태 변화를 알리는 live region 이 저장소 전체에 0개다

전수 grep: `aria-live` 0 · `role="status"` 0 · `role="alert"` 0 · `aria-busy` 0 · `aria-atomic` 0.

그 결과 다음이 전부 보조기술에 무음이다 — 답변 확정 후 150ms 뒤의 **자동 문항 전환**(`use-answer-lock.ts:36-40`, 포커스 이동도 없고 `src/features/test/**` 에 `scrollIntoView`/`focus()` 는 `instruction-overlay.tsx` 안에만 있다), **tail reset 으로 답변 2개가 사라지는 것**(F-13), **진행률 변화**, **consent 동기화 후 카탈로그 8→2 축소**(F-09), **전환 실패**(F-01), **저장 실패**(F-06). `progressbar` 의 `aria-valuenow` 는 값이 바뀌어도 스스로 읽히지 않는다(폴라이트 알림이 아니다).

처방: `PageShell`(`page-shell.tsx:21-25`)에 시각적으로 감춘 `role="status" aria-live="polite"` 컨테이너 하나를 두고, 문항 전환·진행률·카탈로그 필터·전환 실패·저장 실패가 그 하나를 통해 말하게 한다. 새 표면이 아니라 기존 셸의 슬롯 한 칸이므로 baseline 영향 0.

### F-13 (major) 「이전」한 번이 답변 두 개를 예고 없이 지우고, 진행률만 조용히 뒤로 간다

`moveQuestion(-1)`(`use-test-run-controller.ts:186-205`)이 `Number(key) < nextIndex` 로 응답을 거르고(`:199-201`) `writeResponseSet` 으로 즉시 영속화한다. `nextIndex = currentQuestionIndex - 1` 이므로 **현재 문항의 답과 목적지 문항의 답이 함께 지워진다.** 리듀서도 같다(`test-run-reducer.ts:172-183`).

계약이 그 동작을 요구하고 코드 수준까지 못박는다 — `req-test.md:519` 「마지막 문항이 아닌 이전 문항의 응답을 변경하면, **변경 확정 즉시** 그 이후 모든 응답을 리셋한다」. 그러나 **`docs/design/ds/README.md:69` 의 「Confirmation is calm」과 `:68` 의 「Errors are plain and constructive: say what happened and what to do」어느 쪽도 지켜지지 않는다** — 확인 다이얼로그도, 되돌리기도, 사전 경고도, 사후 고지도 없다. 버튼은 46px 로 하단 엄지 영역에 놓이고(`test-question-client.tsx:389-404`) 라벨은 `Previous` 한 단어다.

같은 문서 `req-test.md:550` 이 「시스템은 마지막 사용자의 유효 응답을 임의로 제거하거나 변경하면 안 된다」고 적어 정면으로 부딪힌다 — §3.9 의 tail reset 은 사용자가 촉발하므로 「임의」가 아니라는 해석은 가능하지만, **사용자가 그 결과를 사전에 알 수 없으면 사실상 임의다.**

처방: ⑴ 버튼 라벨을 유지하되 문항 화면에 「이전으로 돌아가면 이 문항의 답이 지워집니다」를 `--caption`/`--muted-aa` 한 줄로 상시 노출(하단 nav 행), ⑵ 실행 후 F-12 의 live region 으로 「답변 2개가 초기화됐습니다」고지, ⑶ `req-test.md:519` 에 「tail reset 은 실행 전 고지 또는 실행 후 알림 중 하나를 반드시 동반한다」를 추가. 확인 다이얼로그는 넣지 않는다 — 한 회차에 여러 번 눌리는 이동 컨트롤에 모달을 붙이면 그 자체가 결함이다.

### F-14 (major) qualifier 재진입의 「변경하고 다시 시작」이 아무것도 바꾸지 않아도 회차 전체를 지운다

`executeReentryCommit`(`use-test-entry-orchestrator.ts:115-126`)이 `resetScoringAnswers(qualifierOnlyResponses)` + `writeResponseSet(variant, qualifierOnlyResponses)` 로 **scoring 응답 전체를 무조건 버린다.** 그런데 재진입 draft 는 기존 값으로 seed 되므로(`use-qualifier-overlay-wizard.ts:67-82`) 사용자가 칩을 열어 보고 **아무것도 바꾸지 않은 채** primary 를 눌러도 같은 결과다.

경고는 버튼 라벨 세 단어가 전부다 — `qualifierRestartConfirm` = `Change and restart` / `변경하고 다시 시작`(`src/messages/en.json`, 전달은 `test-question-client.tsx:318`). qualifier step 분기(`instruction-overlay.tsx:158-205`)에는 본문 `<p>` 슬롯이 아예 없어 **설명을 넣을 자리조차 없다**(instruction 분기 `:205-245` 에만 `descriptionId` 문단이 있다). 취소 경로는 있다(`:182-193`, `test-qualifier-reentry-cancel-button`).

처방: ⑴ qualifier step 분기에 본문 슬롯을 추가하고 재진입 모드일 때 「이 답을 바꾸면 지금까지의 응답 n개가 초기화됩니다」를 렌더, ⑵ draft 가 저장값과 동일하면 primary 를 「그대로 두기」로 바꾸고 `executeReentryCommit` 을 건너뛴다 — 변경이 없으면 파괴할 이유가 없다.

### F-15 (major) 죽은 블로그 링크가 아무 말 없이 목록으로 리다이렉트된다

`src/app/[locale]/blog/[variant]/page.tsx:42-45` 가 `getBlogDetailPageModel` 이 null 이면 `redirect(…blog())` 한다. 메시지도 쿼리 플래그도 남기지 않는다. 공유받은 링크를 연 사용자는 목록에 도착할 뿐 **자기가 열려던 글이 존재하지 않는다는 사실을 알 수 없다** — 잘못된 글을 클릭했다고 생각한다.

`tests/e2e/routing-smoke.spec.ts:226-235` 가 이 침묵을 계약으로 고정한다(`toHaveURL(/\/en\/blog$/)` + `blog-selected-article` count 0). 그러나 카피는 이미 설계 정의에 있다 — `docs/design/ds/preview/secondary-surfaces.html:79-80` 의 `That page is not here` / `The address may have changed, or the test may have been retired.`

처방: `redirect` 를 유지하되 `?unavailable=<variant>` 를 붙이고 색인 상단에 그 한 줄을 렌더한다. 기존 단언 둘은 URL 정규식을 `/\/en\/blog(\?|$)/` 로 완화하면 그대로 통과한다. 새 문자열 2개는 12 로케일 번역 대상이다.

### F-16 (major) 동의 배너의 `Preferences` 는 아무것도 하지 않는 44px 컨트롤이고, 설명은 터치가 볼 수 없는 곳에 있다

`telemetry-consent-banner.tsx:32` 이 `onPreferencesAction={() => {}}` 를 넘긴다. 배너는 그것을 세 번째 버튼으로 렌더하고(`consent-banner.tsx:265-273`) `disabled` 를 붙이지 않으므로 탭 순서에 있고 44px 이며 다른 두 버튼과 같은 무게로 보인다. 유일한 설명은 `title={preferencesTitle}` = `Preferences panel coming soon` / `설정 패널은 곧 제공될 예정입니다` — **`title` 툴팁은 hover 로만 뜨므로 터치 기기에서는 존재하지 않는다.** **[패턴: `title` 은 터치 대체 경로가 없는 것이 HTML 의 알려진 한계이고, 그래서 접근성 가이드가 `title` 을 유일한 설명 수단으로 쓰지 말라고 한다]**

모바일에서 이 배너는 390px 뷰포트에서 `max-[719px]` 분기로 2단 적층되며(`consent-banner.tsx:241,245,248`) 화면 하단의 큰 덩어리를 차지한다. 그 안의 세 버튼 중 하나가 무응답이다.

처방: 셋 중 하나 — ⑴ preferences 표면을 만들고 연결(F-09 의 「동의 변경」 경로와 같은 목적지), ⑵ 만들 때까지 버튼을 렌더하지 않는다, ⑶ `disabled` + 배너 안 본문 한 줄로 이유를 **보이게** 적는다. `title` 을 유지하는 선택지는 없다. `tests/unit/telemetry-consent-banner.test.ts:144,159,174` 가 라벨 텍스트를 고정하므로 ⑵ 를 고르면 그 셋을 고쳐야 한다.

### F-17 (major) 런타임에 상태 색 토큰이 하나도 없어서, 에러 화면과 빈 화면이 같은 초록 원으로 나온다

`docs/design/ds/colors_and_type.css:198-210` 이 `--success` · `--warning` · `--danger` · `--info` 12개를 정의하고 바로 위 `:198` 이 `/* Semantic states. [not realized by the catalog] */` 라고 적는다. `src/app/globals.css` 전수 grep 결과 `danger|warning|success|info` 토큰은 **0개**다 — 미러 구간(`:94-227`, `:345-407`) 안팎 어디에도 없다.

그래서 `not-found.tsx:15-16` · `test/error/page.tsx:13-14` · `history/page.tsx:15-16` 세 파일이 각자 **바이트 단위로 같은 문자열**(`grid h-11 w-11 place-items-center rounded-full bg-[var(--accent-subtle)] text-[var(--accent-fg)]`)을 적는다. 「이력이 비었습니다」와 「이 테스트에 진입할 수 없습니다」가 같은 브랜드 세이지 원 안의 아이콘으로만 갈린다 — 아이콘 하나(시계 대 X 대 경고 삼각형)가 상태 구분의 전부다. **[규범: WCAG 1.4.1 은 색만으로 정보를 전달하지 말라고 하지, 상태를 색으로 구분하지 **말라**고 하지는 않는다. 여기서는 그 반대 — 아이콘만 남고 색 축이 통째로 비어 있다]** **[패턴: iOS HIG·Material 3 모두 에러/경고/성공을 색 역할로 분리한다]**

처방: `colors_and_type.css` 의 `--danger*` 3개(light·dark)를 `globals.css` 미러 구간으로 옮기고 세 표면의 mark 클래스를 역할별로 가른다(에러 = danger, 빈 상태 = accent). **게이트**: `tests/unit/design-tokens-dark-parity.test.ts` 가 세 방향을 동시에 건다 — `:165` 미러 값 일치(설계 정의에 이미 있으므로 통과), `:218` 「선언된 토큰은 전부 소비자를 갖는다」(소비처를 같은 커밋에 만들어야 한다), `:236` 역방향. 즉 토큰만 먼저 미러하고 소비를 미루면 `npm test` 가 붉어진다 — 한 커밋에 함께 간다. `docs/design/ds/**` 는 Ask-First 이자 저장소 밖 push 표면이다.

### F-18 (major) 로케일을 바꾸면 드로어가 먼저 사라지고 화면은 옛 언어 그대로 남는다

`handleLocaleChange`(`site-gnb.tsx:203-214`)가 `closeSettingsImmediate()` → `closeMobileMenuImmediate()` → `router.push(...)` 순서다. 모바일에서 로케일 칩은 드로어 바닥에만 있으므로(`:468`), 사용자가 보는 것은 **드로어가 즉시 닫히고 페이지는 바뀌지 않는 상태**다. 언어가 실제로 바뀌는 것은 새 라우트가 페인트된 뒤이고, 그 사이 아무 표시도 없다(F-01 과 같은 공백이지만 여기서는 전환 오버레이조차 없다 — pending transition 은 랜딩 카드 경로 전용이다).

즉 「탭 → 유일한 어포던스가 사라짐 → 결과 없음」의 순서라, 탭이 실패한 것처럼 읽힌다.

처방: 닫기를 라우트 변경 **후**로 미루거나(드로어를 `closing` 상태로 두고 `pathname` 변화에 닫는다), 닫되 GNB 에 F-01 과 같은 pending 인디케이터를 띄운다. 후자가 F-01 과 한 메커니즘을 공유하므로 비용이 낮다.

### F-19 (minor) 블로그 빈 상태가 하드코딩 영문 한 문장이고 행동이 없다

`blog-destination-client.tsx:140-144` 가 `<p>No article available.</p>` 를 렌더한다. `blog` 네임스페이스에는 `selected`·`allArticles` 두 키뿐이라 이 문자열은 **12 로케일 전부에 영어로 나간다.** 행동도 0개다(`README.md:66` 위반). 현재 픽스처 3건이 모두 `available` 이라 도달 불가라 severity 를 낮췄지만, 카탈로그가 Sheets 로 넘어가면 즉시 도달 가능해진다.

### F-20 (minor) GNB 링크 3계열이 제품 포커스 링을 받지 않는다

`gnbBrandLinkClassName`(`site-gnb.tsx:45`) · `gnbDesktopLinkClassName`(`:49-50`) · `gnbMobileLinkClassName`(`:100-101`) 셋 다 `focusRingClassName` 을 조립하지 않는다. `globals.css` 의 `@layer base`(`:427-431`)는 `a { color }` 한 줄뿐이고 Tailwind v4 preflight 도 outline 을 지우지 않으므로 **UA 기본 링으로 떨어진다.** `docs/design/design.md:112` 는 「Focus is strong and always visible — a sage ring with a canvas offset on `:focus-visible`」를 요구한다. 모바일 드로어의 링크 3개가 그 셋에 포함되고, 그것이 모바일의 유일한 내비게이션이다.

### F-21 (minor) 모바일 확장 카드의 닫기 X 는 자기 포커스 링이 없고, 대신 화면 폭 카드 전체에 테두리가 그려진다

`LANDING_GRID_CARD_MOBILE_CLOSE_CLASSNAME`(`landing-grid-card.tsx:280-281`)에 `focus-visible:` 선언이 없다. 링은 카드 루트 규칙이 그린다 — `.root:not(.desktopOverlayLayer):has(:focus-visible) { outline: 2px solid … }`(`landing-grid-card.module.css:81-84`). 모바일 확장 상태에서 루트는 `w-screen`(`landing-grid-card.tsx:1042`)이므로 **닫기 버튼에 포커스가 가면 화면 폭 카드 전체에 2px 테두리가 그려진다** — 어느 컨트롤이 포커스를 가졌는지 알려 주지 않는다. 같은 카드 안의 답변 A/B 는 자체 링(`:234`)을 갖고 있어 루트 링과 이중으로 그려진다. **[규범: WCAG 2.4.11 Focus Not Obscured 는 가림만 보지만, 2.4.13 Focus Appearance(AAA)와 APG 는 지시자가 해당 컴포넌트를 감싸기를 요구한다]** 사용자 결정 2(hover 없는 태블릿을 모바일 생명주기로)가 적용되면 블루투스 키보드 태블릿이 이 경로에 들어온다.

### F-22 (minor) 마지막 문항의 제출 버튼이 이유 없이 비활성으로 나타나고, 활성화되는 순간을 아무도 알리지 않는다

자동 진행은 「다음 미응답 scoring 문항」으로 가므로(`use-answer-handler.ts:87-93` · `req-test.md:677`), 마지막 문항에 도착하는 **정상 경로**에서 `allAnswered`(`use-test-run-controller.ts:165`)는 아직 false 다. 따라서 `<button disabled={!started || !allAnswered}>`(`test-question-client.tsx:413`)가 비활성 상태로 처음 등장한다 — 그 자리에 이유 텍스트가 없다. 사용자가 답하면 활성화되지만 포커스 이동도 live region 도 없어(F-12) **화면 아래쪽의 회색 버튼이 초록으로 바뀐 것을 스스로 눈치채야 한다.** 마지막 문항은 자동 진행이 꺼지는 유일한 문항이라(`use-answer-handler.ts:82-85`) 이 지점에서 플로우의 리듬이 예고 없이 끊긴다.

처방: 마지막 문항에서는 답변 확정 시 제출 버튼으로 포커스를 옮기고 live region 으로 「마지막 문항입니다 · 제출할 수 있습니다」를 알린다.

---

## 5. 결함이 아니라고 판정한 것 (찾았으나 올리지 않음)

- **텔레메트리 전송 실패의 무피드백**(`telemetry/runtime.ts:100-107`). 의도적 fire-and-forget 이고 주석이 그렇게 적는다. 사용자가 알아야 할 상태가 아니다.
- **답변 잠금 150ms 동안의 무처리**. `disabled` 만 걸리고 시각 변화가 없는 것은 옳다 — 150ms 동안 흐려졌다 돌아오면 그것이 깜빡임이다. 계약값이기도 하다(`req-test.md:678`).
- **`prefers-reduced-motion` 처리**. 문항 슬라이드(`test-question-client.tsx:358` `duration:0`), 진행 채움(`:67` `motion-reduce:transition-none`), 카드 모션(`landing-grid-card.module.css:576-581`) 모두 존중된다. WCAG 2.3.3 통과.
- **`role="progressbar"` 의 ARIA 완비**(`test-question-client.tsx:263-272`). 값·라벨·valuetext 가 모두 있다 — 이 저장소에서 접근성이 가장 잘 된 자리다.
- **폼 검증 피드백 부재**. `<input>`/`<textarea>`/`<select>`/`<form>` 이 `src/` 전체에 0건이다. 검증할 것이 없다.
- **낙관적 업데이트 실패의 롤백 부재**. 서버 왕복이 텔레메트리 하나뿐이라 「낙관적 업데이트」자체가 존재하지 않는다. 그 자리를 대신하는 것이 localStorage 쓰기이고, 그것의 실패 처리가 F-06 이다.

---

## 6. 이 렌즈가 훑지 못한 것

- **실기기 재현 0건.** F-06 의 storage 차단, F-02 의 UA 탭 하이라이트 실제 모양, F-07 의 부팅 플래시 지속 시간은 전부 코드 경로와 계산으로만 확정했다. 브라우저를 띄우지 않았다.
- **theme view-transition 중 입력 가능 여부 [미].** `theme-transition.ts` 의 2500ms 동안 문서가 실제로 응답하는지(스펙상 `::view-transition` 은 `pointer-events:none` 이지만 스냅샷 아래 DOM 의 실제 거동)를 측정하지 않았다. 그래서 「2500ms 무응답」을 결함으로 올리지 않았다.
- **`aria-hidden` 서브트리 안의 활성 버튼을 axe 가 통과시키는 메커니즘 [미]**(`test-question-client.tsx:334` 이 패널에만 `aria-hidden` 을 걸고 그 안에 비활성화되지 않은 답변 버튼 2개가 남는다). 이것은 이 렌즈가 아니라 a11y/모달 렌즈 소관으로 넘긴다.
- **다른 렌즈로 넘기는 발견 — `viewport-fit=cover` 가 없다.** `src/` 전체에 `export const viewport` 도 `viewportFit` 도 0건이고, Next 기본 viewport meta 는 `width=device-width, initial-scale=1` 뿐이다. 따라서 저장소의 `env(safe-area-inset-bottom)` 선언 2건(`consent-banner.tsx:21` · `site-gnb.tsx:87`)은 노치 기기에서 **항상 0px 로 해석된다** — 두 선언 모두 죽은 코드다. 피드백 렌즈 밖이라 결함으로 올리지 않지만 잃지 않도록 여기 남긴다.
- **`public/56T-ToDo.html`**(578KB, `<html lang="ko">`)이 제품과 무관한 채 `/56T-ToDo.html` 로 서빙된다. 아이러니하게도 이 저장소에서 `-webkit-tap-highlight-color`(`:37`)와 전역 `:focus-visible`(`:366`)과 `viewport-fit=cover`(`:5`)를 갖춘 유일한 파일이다. 범위 밖.
- **게이트를 실행하지 않았다.** `npm test` · `qa:rules` · `test:e2e:*` 는 읽기 전용 과제라 돌리지 않았다. 각 결함의 `gates` 는 소스·매니페스트·스펙을 읽어 유도한 목록이며 실행으로 확인한 값이 아니다.
