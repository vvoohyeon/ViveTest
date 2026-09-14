# gates-reverse.md — 계약 ↔ 검사 양방향 맵

읽은 것: `/Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis` (HEAD=a5aec95 기준 clone, 착수 마커 커밋 `7616211`). `tests/unit/*.test.ts` 85 개 · `tests/e2e/*.spec.ts` 10 개 · `scripts/qa/*.mjs` 17 개(체커 13 + 공유 모듈 3 + 러너 1) 를 전수로 열었다. 저장소는 수정하지 않았다.

## 0. 개체수와 게이트 구조 — 어느 검사가 언제 도는가

| 사실 | 값 | 근거 |
|:---|:---|:---|
| unit 스펙 파일 | 85 | `tests/unit/*.test.ts` |
| unit `it()` 블록 | 572 | 정적 카운트 |
| e2e 스펙 파일 | 10 | `tests/e2e/*.spec.ts` |
| e2e `test()` 선언(정적) | 168 | theme-matrix 의 2 개는 루프이므로 실제 인스턴스는 아래 |
| theme-matrix 인스턴스 | smoke 164 + gate 116 = 280 | `tests/e2e/theme-matrix-smoke.spec.ts:353`, `:374` |
| qa 체커 | 13 | `scripts/qa/run-all.mjs:4-18` |
| blocker 추적 항목 | 67 (blocker 1..30) | `docs/blocker-traceability.json` |
| 추적 PNG baseline | theme-matrix 164 + safari 5 | `tests/e2e/theme-matrix-smoke.spec.ts-snapshots/` · `tests/e2e/safari-hover-ghosting.spec.ts-snapshots/` |

`scripts/qa/run-all.mjs:4-18` 의 13 개 이름을 순서 그대로: `check-phase1-contracts.mjs` · `check-phase4-grid-contracts.mjs` · `check-phase5-card-contracts.mjs` · `check-phase6-spacing-contracts.mjs` · `check-phase7-state-contracts.mjs` · `check-phase8-accessibility-contracts.mjs` · `check-phase9-performance-contracts.mjs` · `check-phase10-transition-contracts.mjs` · `check-phase11-telemetry-contracts.mjs` · `check-variant-registry-contracts.mjs` · `check-variant-only-contracts.mjs` · `check-blocker-traceability.mjs` · `check-design-token-parity.mjs`.

**게이트 계층이 셋이고 각각 다른 것을 본다.** Default Done gate(`lint` → `typecheck` → `npm test` → `build`)는 **vitest 85 개만** 돌린다 — e2e 도 `qa:rules` 도 포함하지 않는다(`package.json` scripts, `AGENTS.md` §5). `qa:rules`(13 체커)는 `qa:static` 안에만 있고 `qa:static` 은 `qa:gate:once` 안에만 있다. `test:e2e:gate` 는 `--grep @gate` 이고 `@gate` 태그를 가진 것은 **theme-matrix gate 116 개와 safari-hover-ghosting 6 개, 합 122 개뿐**이다(`grep -rn "@gate" tests/e2e/`). 나머지 e2e 300여 개는 `@smoke` 로만 태그돼 있어 `test:e2e:smoke` 나 직접 실행에서만 돈다.

**그래서 모바일 리팩터의 붉음은 세 파도로 온다.** 1 파도는 `npm test`(vitest) — 여기가 가장 조밀하고 가장 먼저 온다. 2 파도는 `qa:rules` — **테스트 제목 문자열을 정규식으로 검사하므로 제목을 한 글자만 바꿔도 붉어진다**. 3 파도는 `test:e2e:gate` 의 시각 baseline 122 개 — 이것은 픽셀이 바뀌면 전부 붉어지고, 되살리는 유일한 길은 사용자 승인이 필요한 `qa:visual:full` 이다(`AGENTS.md` §4 Hard stops).

**gate baseline 의 모바일 몫은 40 장이다.** `buildGateThemeMatrixCases`(`tests/e2e/theme-matrix-smoke.spec.ts:104-113`)가 `stateCanonical === true` 인 뷰포트만 고르고, 그것은 `desktop-wide`·`tablet-wide`·`mobile` 셋이다(`tests/e2e/theme-matrix-manifest.json` viewports). layout 4 케이스 × mobile 1 + `mobile-*` state 6 케이스 × mobile 1 = 10 슬롯 × 2 locale × 2 theme = 40. smoke 전체(164)에서는 `-mobile-chromium-darwin.png` 로 끝나는 것이 40 장이다(실측 `ls | grep -c`).

## 1. 표 A — 계약 조항 → 그것을 지키는 검사

「조항」은 그 계약이 실제로 적힌 자리를 뜻한다. 산문 조항 번호가 없는 것은 계약이 **상수나 CSS 선언 자체**인 경우이며, 그때는 그 자리를 적었다.

| # | 계약 조항 / 불변식 | 정본 위치 | 이 조항을 지키는 검사 (file:line) | 종류 |
|:--|:---|:---|:---|:---|
| A-01 | 모바일 tier 경계 = 767/768 | `src/features/landing/grid/layout-plan.ts:1` | `tests/unit/landing-grid-plan.test.ts:57-63` (tier 경계 4점) · `tests/unit/shared-shell-gutter.test.ts:58-65` (globals.css 미디어 쿼리와 대조) · `scripts/qa/check-phase7-state-contracts.mjs:73` (`viewportWidth < 768` 리터럴) | 인터랙션 |
| A-02 | tap/hover 모드 결정 = 폭 우선, 그다음 hover capability | `src/features/landing/grid/use-landing-interaction-controller.ts:71-77` | `scripts/qa/check-phase7-state-contracts.mjs:73,77` · `tests/e2e/state-smoke.spec.ts:377` (capability gate) · `tests/unit/landing-interaction-controller-handlers.test.ts:32` (matchMedia 스텁) | 인터랙션 |
| A-03 | 모바일 키보드 포커스는 확장하지 않는다(`preserve-mobile`) | `resolveKeyboardFocusDisposition` | `tests/unit/landing-interaction-state.test.ts:22-51` · `tests/e2e/state-smoke.spec.ts:1003` (B5-mobile-keyboard-handoff) · `scripts/qa/check-phase7-state-contracts.mjs:163` | 인터랙션 |
| A-04 | 모바일 확장 생명주기 고정 duration 280ms | `src/features/landing/grid/mobile-lifecycle.ts:1` | `tests/unit/landing-mobile-lifecycle.test.ts:73` · `tests/e2e/transition-telemetry-smoke.spec.ts:534` (B14-mobile-baseline) | 인터랙션 |
| A-05 | OPENING 중 close 는 큐잉되고 한 번만 처리된다 | `mobile-lifecycle` 리듀서 | `tests/unit/landing-mobile-lifecycle.test.ts:77,102` · `tests/e2e/transition-telemetry-smoke.spec.ts:840` (B14-mobile-queue-close) · `scripts/qa/check-phase10-transition-contracts.mjs:127-133` | 인터랙션 |
| A-06 | 모바일 확장 중 body scroll lock, 종료 시 원상복구 | `use-mobile-scroll-lock` | `tests/unit/landing-mobile-scroll-lock.test.ts:56,63,85` · `scripts/qa/check-phase10-transition-contracts.mjs:143-148` (`document.body.style.overflow` 문자열 단언 존재 요구) | 인터랙션 |
| A-07 | 모바일 바깥 탭으로 닫히고, 스크롤로 변하면 취소된다 | `use-mobile-backdrop-gesture` | `tests/unit/landing-mobile-backdrop-gesture.test.ts:97-142` | 인터랙션 |
| A-08 | 모바일 확장 헤더는 내부 스크롤 중 sticky | 미확인 — 산문 조항 위치를 찾지 못했다 | `tests/e2e/transition-telemetry-smoke.spec.ts:881` 단 하나 | 인터랙션 |
| A-09 | 모바일 blog 탭은 확장 없이 즉시 이동 | req-landing(§ 미확인) | `tests/unit/landing-interaction-controller-handlers.test.ts:772` · `tests/e2e/transition-telemetry-smoke.spec.ts:901,914` | 인터랙션 |
| A-10 | 모바일 Normal 카드는 title/subtitle 을 clamp 하지 않는다 | `landing-grid-card.tsx` clamp 분기 | `tests/unit/landing-card-contract.test.ts:632-664` · `scripts/qa/check-phase5-card-contracts.mjs:133` (정규식이 분기 **문자열 자체**를 요구) · `tests/e2e/grid-smoke.spec.ts:487,1005,1196` | 시각 |
| A-11 | 카드 타이포 줄바꿈 규칙은 전역 1 개이며 mobile tier 스코프로 되살리지 않는다 (D-06 / `design.md` §4.3) | `landing-grid-card.module.css` | `tests/unit/landing-card-contract.test.ts:344-358` (**부정 단언**) | 시각 |
| A-12 | 공유 셸 좌우 여백 = 16 / 20 / 24px, 경계 768 / 900, 토큰 1 개 | `src/app/globals.css:326` + `layout-plan.ts:4-7` | `tests/unit/shared-shell-gutter.test.ts:55-99` (배열 정확 일치 + 경쟁 유틸리티 금지) · `tests/e2e/gnb-smoke.spec.ts:269-346` | 시각 |
| A-13 | 랜딩 그리드 열 규칙의 정본은 measured inline-size 이며 **viewport 미디어 쿼리로 대체하지 않는다** (§6.2) | `landing-catalog-grid.module.css` | `tests/unit/landing-grid-first-paint.test.ts:28-32` (**`@media (min\|max)-width` 존재 자체를 금지**) | 인터랙션 |
| A-14 | 초기 렌더 경로에 비결정 API 분기 금지 (§11.1) | `landing-catalog-grid.tsx` | `tests/unit/landing-grid-first-paint.test.ts:34-42` · `scripts/qa/check-phase1-contracts.mjs:70-92` · `scripts/qa/check-phase9-performance-contracts.mjs:41-47` | 성능 |
| A-15 | 확장 스케일 Desktop 1.10 / Tablet 1.04 + 안전 clamp | `layout-plan.ts:10-11` | `scripts/qa/check-phase4-grid-contracts.mjs:39-47,60-62` · `tests/unit/landing-grid-plan.test.ts:154` · `scripts/qa/check-phase9-performance-contracts.mjs:71-89` | 시각 |
| A-16 | GNB 데스크톱 설정 hover-open = 폭 ≥1024 **그리고** hoverCapable | `src/features/gnb/behavior.ts:1-12` | `tests/unit/gnb-behavior.test.ts:12-32` · `tests/e2e/gnb-smoke.spec.ts:347` · `scripts/qa/check-phase9-performance-contracts.mjs:201` | 인터랙션 |
| A-17 | 모바일 메뉴 open→closing→closed 타이머·scroll lock·포커스 복원 | `use-gnb-mobile-menu` | `tests/unit/gnb-mobile-menu.test.ts:26-200` · `tests/e2e/gnb-smoke.spec.ts:791` (B7-mobile-overlay), `:899`, `:932` | 인터랙션 |
| A-18 | 랜딩은 카드 우선 진입, GNB tabindex 는 -1 로 미룬다 | `use-landing-gnb-entry-mode` | `tests/unit/gnb-landing-entry-mode.test.ts:47-160` · `tests/unit/gnb-tab-routing.test.ts:165-270` · `tests/e2e/gnb-smoke.spec.ts:641,829` (B3/B7-gnb-keyboard-matrix) | 인터랙션 |
| A-19 | GNB 설정 라벨은 「언어 ⋅ 테마」 하나로 통합, `language` 키 부재 | `src/messages/*.json` | `tests/unit/gnb-message-labels.test.ts:17-52` (12 locale 문자열 정확 일치) | 카피 |
| A-20 | unavailable 카드는 tab order 밖 · `coming soon` 은 AT 에 남는다 (req-landing §9.2 / §14.4) | `landing-grid-card.tsx` | `tests/unit/landing-card-contract.test.ts:401-457` · `tests/unit/landing-interaction-state.test.ts:139` · `tests/e2e/a11y-smoke.spec.ts:421,619` | 인터랙션 |
| A-21 | 카드 primary trigger 는 semantic `<button>`, `role="button"` 금지 | `landing-grid-card.tsx` | `scripts/qa/check-phase8-accessibility-contracts.mjs:25-39` · `tests/unit/landing-card-contract.test.ts:257` · `tests/e2e/a11y-smoke.spec.ts:564` | 인터랙션 |
| A-22 | Blog 카드는 Expanded 없이 whole-card `<Link>` 로 이동 | `landing-grid-card.tsx` | `scripts/qa/check-phase5-card-contracts.mjs:117-123` · `tests/unit/landing-card-contract.test.ts:458` · `tests/e2e/grid-smoke.spec.ts:877,950` | 인터랙션 |
| A-23 | 태그 chip 은 borderless, `--normal-tag-bg` 는 light `:root` 사슬로 `#ece8df` 에 도달 | `landing-grid-card.module.css` + `globals.css` | `scripts/qa/check-phase5-card-contracts.mjs:18-21,155-184` · `tests/e2e/grid-smoke.spec.ts:665` (BQ-30) | 시각 |
| A-24 | 행 지역 보정(base_gap + comp_gap) — auto spacer / space-between / flex filler / 의사요소 금지 (Blocker #10·#11) | `spacing-plan.ts` + card CSS | `scripts/qa/check-phase6-spacing-contracts.mjs:74-102` · `tests/unit/landing-spacing-plan.test.ts:10-146` · `tests/e2e/grid-smoke.spec.ts:1623` (B10/B11) · `tests/e2e/state-smoke.spec.ts:1115` | 시각 |
| A-25 | 단일 요청 진입 `src/proxy.ts`, `src/middleware.ts` 재도입 금지 | `AGENTS.md` §3 | `scripts/qa/check-phase1-contracts.mjs:22-24` · `tests/unit/contract-citations.test.ts:97` (**부정 방향 검사**) · `tests/unit/proxy-policy.test.ts` | 동작 |
| A-26 | 모든 실 page 는 `src/app/[locale]/**` 아래 | `AGENTS.md` §1 | `scripts/qa/check-phase1-contracts.mjs:26-32` | 동작 |
| A-27 | locale prefix 는 정확히 하나, 중복 prefix 는 global 404 | req-landing §5 | `tests/unit/proxy-policy.test.ts:51` · `tests/unit/localized-path.test.ts:7` · `scripts/qa/check-phase1-contracts.mjs:36-51` · `tests/e2e/routing-smoke.spec.ts:53,75` (B2) | 동작 |
| A-28 | telemetry 이벤트 6 종·금지 필드·`final_responses` 완전성 | req-landing §12 | `scripts/qa/check-phase11-telemetry-contracts.mjs:135-163` · `tests/unit/landing-telemetry-validation.test.ts` · `tests/unit/telemetry-route.test.ts` · `tests/unit/telemetry-question-answered.test.ts` · `tests/e2e/transition-telemetry-smoke.spec.ts:150` (B18) | 동작 |
| A-29 | transition 은 내부 signal 채널만 쓴다(`transition_*` 네트워크 금지) | req-landing §8 | `scripts/qa/check-phase10-transition-contracts.mjs:37-39` · `scripts/qa/check-phase11-telemetry-contracts.mjs:146-148` · `tests/unit/landing-transition-runtime.test.ts:63` | 동작 |
| A-30 | theme-matrix 는 6 뷰포트 × 2 locale × 2 theme 폐쇄이며 baseline 집합이 **정확히** 일치한다 | `tests/e2e/theme-matrix-manifest.json` | `scripts/qa/check-phase11-telemetry-contracts.mjs:197-365` (누락·유령 양방향) · `tests/e2e/helpers/local-snapshot.ts:21-44` (없는 baseline 은 생성 아니라 실패) | 시각 |
| A-31 | `docs/design/ds/**` 는 런타임이 소비하지 않는 문서 계층 | `AGENTS.md` §2 | `tests/unit/design-ds-boundary.test.ts:51-72` | 하네스 |
| A-32 | `globals.css` `@mirror-*` 구간은 `ds/colors_and_type.css` 의 사본이며 값까지 같다 | `AGENTS.md` §1 theme cut | `tests/unit/design-tokens-dark-parity.test.ts:148-201` | 시각 |
| A-33 | globals.css 가 선언한 토큰은 전부 소비자를 갖고, 참조된 토큰은 전부 선언돼 있다 | 같은 파일 | `tests/unit/design-tokens-dark-parity.test.ts:218-243` (양방향) | 시각 |
| A-34 | `design.md` §5 토큰값과 `ds/colors_and_type.css` 의 이탈은 등재된 것만 유효 (BQ-38) | `docs/decision-register.md` `<!-- ds-parity-allowlist -->` | `scripts/qa/check-design-token-parity.mjs:186-219` (미등재 이탈 **및** 낡은 등재 양쪽 실패) | 시각 |
| A-35 | 문서 생명주기는 물리 위치로만 표현, 색인 파일 금지 | `AGENTS.md` §7-1 | `tests/unit/docs-lifecycle.test.ts:60-115` | 하네스 |
| A-36 | 계약 문서의 백틱 인용(경로·§번호·npm script·git ref)이 실재한다 | `AGENTS.md` §9 | `tests/unit/contract-citations.test.ts:158-265` | 하네스 |
| A-37 | `qa:rules` 등록부 == 체커 파일 집합, `AGENTS.md` §5 의 개수, `project-rules.md` 의 blocker 요약 수치 | `run-all.mjs` + 산문 | `tests/unit/qa-registry.test.ts:34-88` | 하네스 |
| A-38 | §14.2 release-blocking 항목 ↔ 추적 원장 양방향 폐쇄 | `docs/req-landing.md` §14.2 | `scripts/qa/check-blocker-traceability.mjs:17-150` | 하네스 |
| A-39 | 함정 원장 형식·번호 연속·바이트 상한·목차 금지 | `docs/LESSONS_LEARNED.md` 머리말 | `tests/unit/lessons-ledger.test.ts:29-70` | 하네스 |
| A-40 | BQ 번호 연속·중복 없음·인용된 번호는 원장에 있다 | `docs/decision-register.md` | `tests/unit/decision-register.test.ts:50-85` | 하네스 |
| A-41 | 문서·소스 어디에도 자리표시자 든 Tailwind 임의값 후보를 두지 않는다 | 없음 — 이 테스트가 곧 계약 | `tests/unit/tailwind-candidate-hygiene.test.ts:23-64` (추적분 + 미추적 작업 트리 전체, `.md` 포함) | 하네스 |
| A-42 | Safari hover-out ghosting 5 상태가 baseline 과 동일 | `tests/e2e/safari-hover-ghosting.spec.ts` | 같은 파일 6 케이스 + `scripts/qa/check-phase11-telemetry-contracts.mjs:367-388` (스텀 이름·개수 정확 일치) | 시각 |
| A-43 | 변경 없는 조항인데 **검사가 없다** | — | 아래 §4 「가드 공백」 참조 | — |

## 2. 표 B — 검사 → 그것이 고정하는 조항

「붉어짐」 판정 기준: **yes** = 결정 1~7 중 어느 하나를 실행하면 거의 확실히 붉어진다 · **조건부** = 특정 결정(경로 신설·IA 변경·토큰 변경 등)을 건드릴 때만 · **no** = 모바일 계약 개정과 무관한 순수 도메인/데이터 계약.

### 2-1. `scripts/qa/` — 13 체커 (전부 문자열·정규식 검사이며, 대상 파일의 **철자**를 본다)

| 체커 | 고정하는 조항 | 종류 | 붉어짐 | 함께 고칠 것 |
|:---|:---|:---|:---:|:---|
| `check-phase1-contracts.mjs` | 필수 파일 5, `middleware.ts` 부재, 모든 page 가 `[locale]/` 아래, `as Route\|never` 캐스트 금지, 중복 locale 리터럴 금지, `useSearchParams`+Suspense, `src/app`·`src/i18n`·`src/lib/routes`·`proxy.ts` 에서 `Date.now`/`Math.random`/`localStorage`/`sessionStorage`/`window` 금지 | 동작 | **조건부** | 결정 5 로 모바일 전용 라우트를 만들면 `[locale]/` 아래에 두어야 하고, 그 페이지에서 `window` 를 읽으면 즉시 붉어진다 |
| `check-phase4-grid-contracts.mjs` | layout-plan 의 1.10/1.04 리터럴, `landing-grid-plan.test.ts` 안에 `desktop wide`·`mobile` 등 **제목 문자열** 존재, grid-smoke 안에 7 개 제목 문자열 존재(`underfilled`·`threshold sweeps`·`title clamp and expanded title continuity`·active-width 블록의 anchor start/center/end) | 인터랙션 | **yes** | 표 C-1 |
| `check-phase5-card-contracts.mjs` | 카드 슬롯 마커, `isMobileViewport ? 'overflow-visible text-clip' : 'overflow-hidden text-ellipsis line-clamp-2'` **분기 문자열 그대로**, tag-chip borderless, `--normal-tag-bg`→`#ece8df` 사슬, `--tag-min-width`=56px, unit/e2e 제목 6 개 | 시각 | **yes** | 표 C-1 |
| `check-phase6-spacing-contracts.mjs` | `buildRowCompensationModel`·`deriveNaturalHeightFromGeometry` 존재, `scrollHeight` 금지, ResizeObserver/RAF/`document.fonts.ready`, auto spacer·space-between·flex filler·`::before/::after` 금지, unit/e2e 제목 6 개 | 시각 | **yes** | 표 C-1 |
| `check-phase7-state-contracts.mjs` | 파일 13 개 존재, 리듀서 상수·전이표, **`viewportWidth < 768`** 과 **`hoverCapability ? 'hover' : 'tap'`** 리터럴, `matchMedia('(hover: hover) and (pointer: fine)')` 리터럴, pointermove/mousedown 추적, wheel 리스너 금지, state-smoke 에 `capability gate`·`keyboard sequential override`·`assertion:B5-mobile-keyboard-handoff` 존재 | 인터랙션 | **yes** | 결정 2 가 정확히 이 두 리터럴을 바꾼다. 체커 73·77 행을 새 판정 함수 이름으로 고치고, `state-smoke` 제목을 유지하거나 체커를 함께 고친다 |
| `check-phase8-accessibility-contracts.mjs` | semantic trigger·`role="button"` 금지·`data-testid` 마커, GNB aria-label 키 3 종, `:has(:focus-visible)` CSS 존재, `@axe-core/playwright` 의존성, a11y/gnb smoke 의 assertion id 4 개 | 인터랙션 | **조건부** | GNB 트리거 구조를 바꾸면 45-51 행, 카드 트리거를 바꾸면 25-39 행 |
| `check-phase9-performance-contracts.mjs` | 로더의 `next/dynamic`·`ssr:false` 금지, `INITIAL_VIEWPORT_WIDTH` SSR 중립 초기화, cursor 정책 3 상수, reduced-motion 경로, `useLayoutEffect` 사전 페인트 동기화, theme bootstrap, reduced-motion 키프레임 이름 2 개, `playwright.config.ts` 의 preview 모드 문자열, `package.json` 의 `test:e2e:smoke` **명령 문자열 그대로** | 성능 | **yes** | `INITIAL_VIEWPORT_WIDTH` 초기화(41-47)와 reduced-motion 셀렉터(150-155)가 모바일 렌더 경로 재설계와 정면으로 겹친다 |
| `check-phase10-transition-contracts.mjs` | transition runtime 함수 6 개, `trackTransitionStart` 금지, run reducer action 6 종, blog destination 의 route-truth 완료, transition smoke 의 **`assertion:B14-mobile-*` 5 개**, `document.body.style.overflow` 단언 존재, card CSS 의 `landing-card-mobile-open-shell`·`landing-card-detail-quiet-exit` 키프레임과 `.root.mobileTransientOpening` 류 4 개 셀렉터 | 인터랙션 | **yes** | 모바일 확장 choreography 를 바꾸면 152-166 행의 키프레임·클래스 이름을 함께 고쳐야 한다. 이름을 유지하면 통과하지만 그것은 **가드가 아무것도 보지 않는다**는 뜻이므로, 이름과 함께 단언 내용을 옮겨야 한다 |
| `check-phase11-telemetry-contracts.mjs` | consent 상태기계, correlation id, track* 6 종, validation 금지 필드, answer lock, **theme-matrix manifest 폐쇄 전수**(locale=en/kr 정확 일치, theme=light/dark 정확 일치, 뷰포트 키 6 개 존재, 케이스별 viewportKeys 배열 정확 일치, settleRecipe 화이트리스트 9 종), **baseline 파일 집합 정확 일치(누락·유령 양방향)**, safari 스냅샷 5 스텀 | 시각·동작 | **yes** | 표 C-2. 뷰포트를 하나라도 더하거나 빼면 manifest·closure·baseline·체커가 한 커밋에서 같이 움직여야 한다 |
| `check-variant-registry-contracts.mjs` | legacy 식별자 5 종 전역 금지(`src`·`tests`·`scripts`·`docs` 전수), `summary` 토큰 비-docs 전역 금지, fixture/generated 직접 import 금지, `data-card-attribute` 노출, 등록부 레이어 8 규칙 | 동작 | **no** | 단 새 문서·코드에 `summary` 라는 단어를 쓰면 붉어진다(비-docs 경로 한정) |
| `check-variant-only-contracts.mjs` | blog 경로 정본(`/blog/[variant]`), `cardThumbnail` 슬롯 이름, `resolveVariantMediaSource(card.variant, hasAssetMedia)` 호출 형태, **`docs/req-landing.md` 가 `` `subtitle` ``·`4줄`·`재사용` 을 문자로 포함**, `docs/project-analysis.md` 가 `/[locale]/blog/[variant]` 포함 | 동작 | **yes** | 결정 1·6 으로 `req-landing.md` 를 다시 쓰면 109-122 행이 요구하는 문자열이 사라진다. **요구사항 문서를 분리할 때 이 다섯 문자열의 새 거처를 정하고 체커 경로를 함께 바꿔야 한다** |
| `check-blocker-traceability.mjs` | `req-landing.md` §14.2 항목 번호 ↔ `blocker-traceability.json` 양방향 폐쇄, kind 3 종, assertionId 가 선언한 표면(test/it 호출 안 · qa 스크립트의 문자열 리터럴 · docs)에 실제로 박혀 있는가 | 하네스 | **yes** | 표 C-3. §14.2 를 손대는 순간 등록부와 67 개 앵커가 같이 움직인다 |
| `check-design-token-parity.mjs` | `design.md` §5 fence ↔ `ds/colors_and_type.css` light `:root` 값 대조 + allowlist 양방향, `design.md` §5.11 ↔ §8 모션 토큰 두 사본 일치, `ds/README.md` *Visual foundations* 의 hex 금지·수치 리터럴 마커·토큰 이름 실재 | 시각 | **조건부** | 모바일 모션 토큰을 바꾸면 §5.11 과 §8 을 **같이** 고쳐야 하고, 새 이탈은 쓰기 **전에** decision-register 에 등재해야 한다 |

### 2-2. `tests/e2e/` — 10 스펙

| 스펙 | 케이스 수 | 고정하는 조항 | 종류 | 붉어짐 | 함께 고칠 것 |
|:---|:--:|:---|:---|:---:|:---|
| `grid-smoke.spec.ts` | 34 | 열 규칙 6 뷰포트(1440·1180·1024·1023·900·390), threshold sweep, 모바일 full subtitle × 12 locale, W12-mobile 3 폭(360·390·767) 계산값, tag tail ellipsis × 12 locale, active-width zero-overflow, base/comp gap, 첫 페인트 1 회 | 인터랙션·시각 | **yes** | 390 을 쓰는 6 케이스 + `W12_MOBILE_VIEWPORTS`(`:16`) 3 폭 루프 3 케이스. `check-phase4`·`check-phase5`·`check-phase6` 가 이 파일의 제목 문자열 13 개를 참조한다 |
| `state-smoke.spec.ts` | 26 | capability gate, 키보드 순차 오버라이드, Escape 우선순위, **B5-mobile-keyboard-handoff**(`:1003`), Mobile full subtitle 높이 스냅샷(`:1044`), 모바일·데스크톱 생명주기 non-comp gap 0(`:1115`), reduced-motion 축소, cursor 정책, BQ-39 scroll hold 3 건 | 인터랙션 | **yes** | 390 을 쓰는 4 케이스. `check-phase6:136`·`check-phase7:159,163`·`check-phase8:73`·`check-phase9:190,194` 가 제목을 참조한다. 스냅샷 1 장(`expanded-focus-shell`) 보유 |
| `gnb-smoke.spec.ts` | 24 | 데스크톱 설정 open/close/outside/hover-fallback, gutter 계단 전수(`:269`), 테마 전환 blur, **B3/B7 키보드 매트릭스**, 모바일 오버레이 close-start·unlock timing(`:791`), 모바일 outside-close 스크롤 취소(`:899`), 모바일 back 이력 폴백 | 인터랙션 | **yes** | 390 을 쓰는 10 케이스. `check-phase8:87`·`check-phase9:201` 가 assertion id 를 참조한다 |
| `transition-telemetry-smoke.spec.ts` | 19 | ingress·correlation·final_submit payload, **B14-mobile-* 7 건**(baseline·open-continuity·close-perception·close-choreography·title-continuity·queue-close·reduced-motion), 모바일 sticky 헤더(`:881`), 모바일 blog 탭 직행(`:901`)·스크롤 제스처 비이동(`:914`), 타임아웃·롤백·취소 | 인터랙션·동작 | **yes** | 390 을 쓰는 8 케이스. `check-phase10:111-149` 가 assertion id 6 개와 `document.body.style.overflow` 문자열을 참조한다. `:585`·`:658` 에 `test.fixme` 두 건이 있다 |
| `a11y-smoke.spec.ts` | 17 | axe 정본 5 지점(랜딩·GNB·모바일 확장·transition overlay·KR), W11-keyboard LI-01~04, **W12-mobile 3 폭 루프**(`:619`), unavailable 카드 tab-order 제외 + AT 유지, blog trigger semantic link, instruction overlay 모달 | 인터랙션 | **yes** | 390 을 쓰는 3 케이스 + `W12_MOBILE_VIEWPORTS`(`:17`) 루프. `check-phase8:80` 가 `assertion:B5-axe-canonical`·`assertion:B7-axe-canonical` 를 참조 |
| `consent-smoke.spec.ts` | 17 | 배너 flex/max-width 1280/basis 520, **배너가 확장 카드를 가리지 않는다**(`:248`), spacer 가 실측 높이만큼만 예약(`:280`, 480px 재측정 포함), B20~B23 instruction 계약, EGTT qualifier 경로 | 인터랙션·동작 | **조건부** | 유일한 좁은 폭이 480px 하나이고 390 은 쓰지 않는다. sticky CTA·바텀시트를 도입하면 `:229` 의 데스크톱 형상 단언과 `:280` 의 spacer 계약이 모바일 표면과 충돌한다 |
| `routing-smoke.spec.ts` | 9 | locale prefix 단일(B2), 비허용 경로 global 404, segment not-found, lazy validation 오류 경로(B30), SSR `html lang`, **hydration 경고 0**(B1), blog index/detail 진입 | 동작 | **조건부** | 결정 5 로 경로를 추가하면 `:75` 의 「비허용 경로는 global 404」가 새 경로를 404 로 판정한다. `check-phase9:158-167` 가 `assertion:B1-hydration`·`PREVIEW_LOG_PATH` 를 참조 |
| `qualifier-overlay.spec.ts` | 14 | instruction↔qualifier 이동, 선택·commit, resume 검증, reentry 4 건 | 동작 | **조건부** | 전부 1280px 에서만 돈다 — **모바일 커버리지 0**. 결정 5 의 스텝 분할이 여기를 통째로 다시 쓰게 만든다 |
| `theme-matrix-smoke.spec.ts` | 2 (→ 280) | 6 뷰포트 × 2 locale × 2 theme 시각 baseline. gate 는 `stateCanonical` 3 뷰포트만(116) | 시각 | **yes** | 표 C-2. manifest·closure·baseline 164 장·`check-phase11` 이 한 덩어리다 |
| `safari-hover-ghosting.spec.ts` | 6 | webkit 전용 1440px hover-out ghosting 5 스냅샷 + 설정 패널 top seam. `fullyParallel:false` | 시각 | **no** | 데스크톱 hover 전용이라 모바일 계약과 직접 겹치지 않는다. 단 카드 셸 구조를 바꾸면 픽셀이 움직인다 |

### 2-3. `tests/unit/` — 85 스펙 (전수)

| 스펙 | 고정하는 조항 | 종류 | 붉어짐 | 함께 고칠 것 |
|:---|:---|:---|:---:|:---|
| `blog-server-model.test.ts` | blog index list-only, detail 은 route variant 로만 해석 | 동작 | 조건부 | blog 전용 상세 화면·경로를 도입하면 |
| `contract-citations.test.ts` | 계약 4 문서의 백틱 경로 실재, 재도입 금지 경로 부재, 면제·축약 등재 생존, `문서.md §N` 절 실재, `가이드.md §Anchor` 실재, npm script 실재, §4 git ref 해석 | 하네스 | **yes** | 결정 6 으로 `req-landing.md` 를 둘로 쪼개면 AGENTS.md·CLAUDE.md·project-rules·verification-commands 의 인용이 전부 새 파일을 가리켜야 한다 |
| `cross-sheet-integrity.test.ts` | Landing/Questions/Results 3-source 정합, blog variant 제외 책임 | 동작 | no | — |
| `decision-register.test.ts` | BQ 번호 중복·연속·정렬, 인용된 번호 실재, 변경 이력 절 존재 | 하네스 | **yes** | 계약 개정은 새 BQ 를 낳는다 — 번호를 끝에 연속으로 붙이고 인용을 맞춘다 |
| `design-ds-boundary.test.ts` | 런타임(`src`·`public`)이 `docs/design/ds/` 를 import/url 로 참조하지 않음, AGENTS.md 가 그 문장을 실제로 포함 | 하네스 | 조건부 | AGENTS.md §2 의 「런타임이 소비하지 않는 문서 계층」 문구를 건드리면 `:71` 이 붉어진다 |
| `design-tokens-dark-parity.test.ts` | 표본 caption AA, 두 다크 블록 선언 집합 동일, 선호도 블록의 `:not([data-theme='light'])` 좁힘, 다크 이름 ⊆ light 이름, **`@mirror-*` 구간이 `ds/colors_and_type.css` 와 값까지 일치**, 미러 하한(light>60·dark>30), **선언된 토큰은 전부 소비자를 갖는다**, **참조된 토큰은 전부 선언돼 있다** | 시각 | **yes** | 모바일용 토큰을 새로 만들면 `ds/colors_and_type.css`(Ask-First·push 표면) 를 먼저 고치고 미러에 베껴야 하고, 구 컴포넌트를 지우면 그것이 읽던 토큰이 **고아**가 되어 `:218` 이 붉어진다 |
| `docs-lifecycle.test.ts` | 4 생명주기 디렉터리 존재, 폐기 색인 부활 금지, 한 문서명이 두 상태 동시 주장 금지, 살아 있는 문서의 md/json/css/ts/mjs/html 링크 실재 | 하네스 | **yes** | 계획서 신설·이관·요구사항 문서 분리가 전부 여기를 지난다 |
| `gnb-back-navigation.test.ts` | `history.back` vs `router.push` 조건, test back 폴백 타임아웃, sessionStorage 부재 폴백, pathname 추적 | 동작 | 조건부 | 스와이프 뒤로가기·모바일 전용 상세 화면을 도입하면 |
| `gnb-behavior.test.ts` | **hover-open = 폭 ≥1024 AND hoverCapable**, 스크롤 취소 임계 10px + override, `shouldUseHistoryBack` referrer | 인터랙션 | **yes** | 결정 2 가 이 함수의 입력 의미를 바꾼다. `src/features/gnb/behavior.ts:1-12` 와 함께 |
| `gnb-desktop-settings.test.ts` | 즉시 open/close, hover 진입·140ms 지연 종료·재진입 취소, hoverOpenEnabled=false no-op, 바깥 pointerdown 종료, 닫힘 상태엔 리스너 미등록 | 인터랙션 | 조건부 | 터치 태블릿이 이 경로를 쓰게 되면 `hoverOpenEnabled:false` 분기가 주 경로가 된다 |
| `gnb-keyboard-dom.test.ts` | inert 서브트리·`aria-disabled`·hidden 건너뛰기, document 부재 안전 | 동작 | no | — |
| `gnb-keyboard-targets.test.ts` | desktop closed/open·mobile closed/open 각각의 tab 대상 순서, hidden 컨테이너 폴백, 비활성 칩 제외, aria-hidden 패널 제외 | 인터랙션 | **yes** | GNB IA 를 바꾸면 이 4 상태 매트릭스가 전부 바뀐다 |
| `gnb-landing-entry-mode.test.ts` | 랜딩 card-first + `mobileLandingTabIndex = -1`, focusin/pointerdown 전환, 설정·메뉴 열림 시 지연 해제 | 인터랙션 | **yes** | 모바일 GNB 를 바텀시트로 바꾸면 `:79`·`:149` 가 새 패널을 모른다 |
| `gnb-message-labels.test.ts` | 12 locale `gnb.theme` 문자열 정확 일치 + `language` 키 부재 | 카피 | 조건부 | 설정 IA 를 분리하면 12 locale 메시지와 이 표가 같이 움직인다 |
| `gnb-mobile-menu.test.ts` | closed→open→closing→closed 타이머, 이중 close 방지, 즉시 닫기, **body scroll lock 3 단계**, 스크롤로 인한 close 취소, 트리거 포커스 복원 | 인터랙션 | **yes** | 바텀시트·전용 화면 전환 시 전 항목 |
| `gnb-tab-routing.test.ts` | Tab 수정자 무시, 순서 내 이동, 랜딩 overflow → 첫 카드 + 설정 닫기, destination 은 native focus-out, document capture 1 회 등록 | 인터랙션 | 조건부 | 랜딩 진입 순서를 바꾸면 `:165`·`:238`·`:252` |
| `gnb-theme-transition.test.ts` | blur circle 기본 2500ms + override 허용 | 시각 | no | — |
| `instruction-overlay.test.ts` | D-1~D-5 엔트리/qualifier/reentry 렌더, **M-1~M-6 모달 다이얼로그 계약**(`role="dialog"`·`aria-modal`·labelledby/describedby·열릴 때 포커스·Esc 의미·Tab 양방향 랩·닫힐 때 opener 복귀) | 인터랙션 | **yes** | 결정 5 로 instruction 을 바텀시트/전용 스텝 화면으로 바꾸면 M-1~M-6 이 통째로 재정의 대상이다. `tests/unit/overlay-connector.test.ts` · `tests/e2e/a11y-smoke.spec.ts:679,714` 와 한 덩어리 |
| `landing-baseline-manager.test.ts` | 활성 카드 row snapshot freeze/release, resting floor 맵의 비유한값 무시·sub-pixel 동일 참조·공유 empty 초기화 | 인터랙션 | 조건부 | 데스크톱 확장 기하 전용 — 모바일 확장을 별도 표면으로 빼면 이 모델의 적용 범위 문장이 바뀐다 |
| `landing-card-contract.test.ts` | Normal 슬롯 순서, 썸네일 폴백, Test Expanded 슬롯 3 메타, closing/cleanup 셸 마운트 유지, trigger 소유 disclosure 시맨틱, 확장 focus ring 스코프, **Wave 12 모바일 타이포 + mobile tier 스코프 재등장 금지(부정 단언)**, unavailable 강제 normal, semantic disabled + full opacity, Blog whole-card link, Read more blog 전용, 숨은 tag suffix 언마운트, 데스크톱 확장 타이틀 연속성, **모바일 settled/transient 확장 타이틀 동일 타이포**, **clamp matrix(desktop/tablet `line-clamp-1`·`line-clamp-2`, mobile 없음)**, root minimum 독립 | 인터랙션·시각 | **yes** | **가장 촘촘한 단일 지점**. `check-phase5`(4 개 제목 참조) · `check-phase9`(cursor 3 상수) · `landing-grid-card.tsx`(1308줄) · `landing-grid-card.module.css` 가 같이 움직인다 |
| `landing-card-thumbnails.test.ts` | 카탈로그 비어 있지 않음, 모든 variant 가 자기 그림, 10 장 상이, **모든 자산 16:6 네이티브**, 폴백 상이, sage 단일 계열 | 시각 | 조건부 | 모바일 카드 비율을 바꾸면 16:6 단언(`:44`)이 자산 교체를 요구한다 |
| `landing-data-contract.test.ts` | fixture 최소 개수·다양성, 작성 순서 seq→type→variant→attribute, seq 정렬·런타임 제거, seq 무결성 실패, hero 메타 제거, Q1 preview 리졸버 경계, KR blog 통합 메타, debug/hidden 숨김, OPTED_OUT 즉시 필터, variant 조회, instruction 고유성, legacy CTA 무시 | 동작 | 조건부 | `:379` 가 `viewportTier:'mobile'`·`mobilePhase:'OPEN'` 로 카드를 렌더한다 — 그 prop 이름이 바뀌면 |
| `landing-desktop-shell-phase.test.ts` | 셸 위상 → 논리적 disclosure, 동일 카드 hover-out collapse 가 closing/cleanup 까지 유지, handoff source close-stage 건너뛰기, `resolveDesktopMotionRole` 이 **`isMobileViewport:true` 면 `idle`**(`:168`) | 인터랙션 | **yes** | 결정 2 로 `isMobileViewport` 의 의미가 바뀌면 이 함수의 입력 계약이 바뀐다 |
| `landing-grid-first-paint.test.ts` | 컨테이너 쿼리 임계 == `DESKTOP_WIDE_MIN_GRID_INLINE_SIZE`(1160), `container-type: inline-size` 존재, **`@media (min\|max)-width` 존재 금지**(`:31`), `data-measured="false"` SSR 리터럴 + 레이아웃 패스 `setAttribute`, 초기 렌더 슬라이스에 `window.` 금지 | 인터랙션·성능 | **yes** | 모바일 전용 스타일을 `landing-catalog-grid.module.css` 에 미디어 쿼리로 넣는 순간 붉어진다 — **컨테이너 쿼리로 쓰거나 다른 파일로 가야 한다** |
| `landing-grid-plan.test.ts` | wide/medium/two-column 행 규칙, **tier 경계 767·768·1023·1024**, inline-size 경계 1040·1160, tablet 비승격, tablet 4 폭 동일, hero/main 은 행 인덱스만, **mobile 1 열**, **Desktop 1.10 / Tablet 1.04**, geometry hook 엔트리 | 인터랙션 | **yes** | `layout-plan.ts` 상수와 `check-phase4:49-62` 가 함께 움직인다 |
| `landing-hover-intent.test.ts` | hover 타이밍 상수 결정론, 단조 intent 토큰, **handoff 는 서로 다른 enterable 카드 사이에만**(B13), row-edge transform origin, hook 엔트리 | 인터랙션 | 조건부 | 데스크톱 hover 전용 — 터치 태블릿이 hover 경로를 잃으면 적용 범위 문장이 바뀐다 |
| `landing-interaction-controller-handlers.test.ts` | 26 케이스: 키보드 즉시 확장, 큐 취소, leave 유실 복구, handoff 멱등, Blog focus-only, Enter/Space 비진입 멱등, Escape 단일 close + 포커스 복원, 상위 dialog 양보, 진짜 focus exit 만 닫기, window blur 보존, **Mobile 에서 card-root close 핸들러 무시**(`:562`), handoff 후 target 유지, 핸들러 신원 안정, 최신 카드 객체 전달, 수정키·중클릭 통과, **모바일 blog 탭 직행**(`:772`), **X 버튼 close**(`:796`), BQ-39 scroll hold 8 케이스(**Tap Mode 는 scroll hold 없음** `:1219`) | 인터랙션 | **yes** | 738 줄 컨트롤러의 40 개 분기가 여기에 걸려 있다. `check-phase7` 과 한 덩어리 |
| `landing-interaction-dom.test.ts` | 카드 루트·확장 focusable·인접 variant 해석, **ENTERABLE 인접만**(D1/BQ-26), variant 로 trigger 포커스, **`data-card-viewport-tier="mobile"` 으로 모바일 카드 판정**(`:34,:99`), 확장 body 를 카드 경계로, 내부 이동 vs 진짜 exit, 열린 dialog 탐지, 이중 RAF 큐 | 인터랙션 | **yes** | `data-card-viewport-tier` 속성이 결정 2 로 의미를 바꾸거나 사라지면 |
| `landing-interaction-state.test.ts` | **`isMobileViewport` 별 키보드 포커스 분류(`preserve-mobile`)**, CARD_EXPAND 멱등, INACTIVE 차단, ACTIVE ramp-up, HOVER_LOCK 키보드 모드 분리, unavailable tab-order 제외, hover-lock 붕괴, 포인터 입력 시 키보드 모드 종료, 비대상 포인터 도달성, 상태 우선순위, **금지 전이 no-op**, reduced-motion/sensor-denied 적합성, TRANSITIONING 즉시 승격, 결정론, 확장 override | 인터랙션 | **yes** | `interaction-state.ts`(504줄) 전이표와 `check-phase7:136-149` 가 함께 |
| `landing-message-labels.test.ts` | 12 locale `coming soon` 문자열 정확 일치(대소문자 규칙 포함) | 카피 | no | — |
| `landing-mobile-backdrop-gesture.test.ts` | 모바일 활성 위상 밖에서 no-op(`isMobileViewport:false` 포함), OPEN 바깥 pointerdown+up 으로 1 회 close, 이동이 임계 초과 시 취소, OPENING 은 큐잉 후 취소 가능 | 인터랙션 | **yes** | 결정 2·5 로 backdrop/바텀시트 제스처를 재설계하면 통째로 |
| `landing-mobile-lifecycle.test.ts` | **고정 duration 280ms**, OPENING 중 close 큐 → NORMAL 정착, OPEN 아닐 때 close-start 무시, pre-open snapshot 불변, restore-ready 전 NORMAL 금지, hook 엔트리, restore polling 술어 주입 3 케이스, transient shell 타이머 통합 3 케이스 | 인터랙션 | **yes** | 모바일 확장 생명주기 재설계의 핵심 단언. `check-phase10` 과 `transition-telemetry-smoke` B14-* 7 건이 같은 계약을 본다 |
| `landing-mobile-scroll-lock.test.ts` | 모바일 전이 위상에서만 lock, 생명주기 전반 body style 복원, lock 중 언마운트 복원 | 인터랙션 | **yes** | 주소창 높이 변동·pull-to-refresh 대응을 넣으면 여기가 첫 충돌 지점 |
| `landing-runtime.test.ts` | 재진입 시 저장된 return scroll 즉시 소비, 저장값만으로 restore top 해석 + page max 클램프 | 동작 | 조건부 | 스크롤 복원 정책을 바꾸면 |
| `landing-spacing-plan.test.ts` | geometry 로 natural height 유도 + 적용 comp gap 중화, 음수 좌표 허용, **짧은 카드에만 comp gap**, 동일 높이 0, 행 인덱스 무관, 정규화 반복 안정, tag tail 오른쪽-우선 숨김·확장 시 복귀, 상태 우선 prefix 유지 | 시각 | 조건부 | 모바일 카드 레이아웃을 바꾸면 `check-phase6:104-116` 제목 3 개와 함께 |
| `landing-telemetry-runtime.test.ts` | UNKNOWN 큐 flush/폐기, 저장 동기화, 결측=UNKNOWN·무효=OPTED_OUT, 난수원 부재 시 전송 차단 | 동작 | no | — |
| `landing-telemetry-validation.test.ts` | final_submit canonical index 키, UI id 키 거부, card_answered ingress 전용, 금지 raw-text 필드, legacy transition 필드 거부, post-attempt `session_id` null 거부 | 동작 | 조건부 | 결정 5 가 telemetry 계약을 개정 범위에 넣었다 |
| `landing-transition-runtime.test.ts` | 취소 경로에서 내부 start=1·terminal=1 + pending 정리, 중복 locale 대상은 부작용 없이 null | 동작 | 조건부 | 모바일 전용 경로를 transition 대상에 넣으면 |
| `landing-transition-store.test.ts` | pending 저장·return scroll 독립 소비, return scroll 키 원자적 삭제, **B16 rollback: 이벤트 1+1 이며 body style 불변** | 동작 | 조건부 | body style 불변 단언이 모바일 scroll lock 재설계와 인접하다 |
| `lessons-ledger.test.ts` | 항목 ≥1, 번호 1 부터 연속·중복 없음, 제목 형식, 「무엇이 일어났나」·「검사」 절, 바이트 상한, 목차 금지 | 하네스 | **yes** | `AGENTS.md` §9 의 등재 의무가 이 리팩터에서 여러 건 발생한다 |
| `locale-config.test.ts` | 12 locale 순서 고정, 네이티브 라벨, 코드 인식 | 동작 | no | — |
| `locale-resolution.test.ts` | cookie 우선, accept-language 매핑·폴백, prefix·중복 탐지, prefix 부여 | 동작 | no | — |
| `localized-path.test.ts` | locale-free route 객체에 prefix 1 회 주입 | 동작 | 조건부 | 새 경로 추가 시 |
| `overlay-connector.test.ts` | E-1~E-5 오버레이 연결(비표시, primary, qualifier 선택, reentry 취소 라벨, back) | 인터랙션 | 조건부 | instruction 을 바텀시트/스텝 화면으로 바꾸면 |
| `proxy-policy.test.ts` | 루트 cookie 우선 리다이렉트, allowlist locale-less 경로, **중복 prefix·비앱 경로 → global not-found**, 이미 지역화된 경로 통과 | 동작 | **조건부** | 결정 5 로 모바일 전용 경로를 만들면 allowlist 와 이 4 케이스를 함께 고쳐야 한다 |
| `qa-registry.test.ts` | **run-all 등록부 == `check-*.mjs` 파일 집합**, **`AGENTS.md` §5 의 「N contract checks」 == 실제 개수**, **`project-rules.md` 의 blocker 요약 문장(건수·범위·kind 분포) == 실제**, kind 3 종 | 하네스 | **yes** | 체커를 더하거나 빼면 `AGENTS.md` §5 산문과 `project-rules.md` 요약 문장을 같은 커밋에서 고쳐야 한다 |
| `qualifier-chip.test.ts` | D-1~D-5 라벨·클릭·aria·Enter·Space | 인터랙션 | 조건부 | 터치 타깃 44px 하한을 적용하면 칩 형상이 바뀐다 |
| `qualifier-overlay-model.test.ts` | EGTT qualifier 필드 ↔ profile question 결합, 빈 배열, 결측 생략, 인덱스 정렬, answerB 초과 토큰 | 동작 | no | — |
| `qualifier-resume-validator.test.ts` | 재개 시 qualifier 유효성 5 케이스 | 동작 | no | — |
| `question-source-parser.test.ts` | `q.*`→profile·숫자→scoring·미지 패턴 오류, canonical index 1-based, 첫 scoring row | 동작 | no | — |
| `registry-serializer.test.ts` | `@generated` 헤더, TS 파싱 가능, 결정론적 동일 문자열(키 순서 무관), 현행 데이터 구조 동등 | 동작 | no | — |
| `request-locale-header.test.ts` | 헤더 이름, 결측·무효 폴백, 서버 헤더 백에서 해석 | 동작 | no | — |
| `route-builder.test.ts` | landing/blog/history locale-free route 객체와 경로 | 동작 | **조건부** | 결정 5 로 경로가 늘면 여기 + `localized-path` + `check-variant-only:77-82` |
| `schema-registry.test.ts` | variant→logic type, 4축 MBTI·1축 EGTT 형상, 미등록 null, 등록 variant 전수 커버 | 동작 | no | — |
| `shared-shell-gutter.test.ts` | **`--shell-gutter` 선언 3 개가 `[base 16, min-width:768 → 20, min-width:900 → 24]` 와 배열 정확 일치**, page-shell·site-gnb 가 그 유틸리티를 사용, **경쟁하는 `px-*` 유틸리티 금지** | 시각 | **yes** | 모바일 여백을 바꾸거나 4 번째 단계를 만들면 `toEqual` 이 즉시 붉어진다. `globals.css`(Ask-First)·`layout-plan.ts`·`page-shell.tsx`·`site-gnb.tsx` 가 한 덩어리 |
| `sheets-loader.test.ts` | GoogleAuth readonly scope, Landing flat locale 컬럼 → source card union, 빈 시트, 오류 전파 | 동작 | no | — |
| `sheets-row-normalizer.test.ts` | locale suffix 파싱, LocalizedText 재조합, 결측 locale 키 미생성, 공백-only 결측 처리 | 동작 | no | — |
| `sync-orchestration.test.ts` | env 결측·variant 불일치 시 exit(1) 무변경, 동일 시 무작업, 상이 시 전체 쓰기 + git, push 실패 복구 | 동작 | no | — |
| `tailwind-candidate-hygiene.test.ts` | **작업 트리 전체(`git ls-files --cached --others`, `.md` 포함)에 자리표시자 든 임의값 유틸리티 후보 부재** | 하네스 | **yes** | 계획서·설계 문서에 임의값 유틸리티 예시를 **리터럴로** 적으면 그 줄이 Tailwind 후보가 돼 붉어진다(모양은 가드의 머리말이 조립해 보여 준다) — dev 서버 500 을 막는 유일한 가드다 |
| `telemetry-consent-banner.test.ts` | UNKNOWN 시 en/kr/ja 배너 렌더, accept/deny 후 즉시 숨김, 이미 결정된 상태에서 미표시 | 동작 | 조건부 | 모바일 배너를 sticky/바텀시트로 바꾸면 `consent-smoke` 와 함께 |
| `telemetry-question-answered.test.ts` | question_answered/result_viewed 검증 7 건 + 런타임 매핑 4 건 | 동작 | 조건부 | telemetry 개정 시 |
| `telemetry-route.test.ts` | `/api/telemetry` 400 4 종 · 204 1 종 (B18 서버측) | 동작 | 조건부 | telemetry 개정 시 |
| `test-domain-derivation.test.ts` | 축 일치 판정 5 건, B11 파생 정확성 4 건, scoreStats·토큰 길이 | 동작 | no | — |
| `test-domain-question-model.test.ts` | B7 문항 모델 무결성 3 건, B12 홀수 규칙 3 건, Phase 1 경계 | 동작 | no | — |
| `test-domain-type-segment.test.ts` | B27 type segment 파싱·qualifier 검증 4 건 | 동작 | no | — |
| `test-domain-variant-validation.test.ts` | MISSING·canonical·UNKNOWN·UNAVAILABLE 5 케이스 | 동작 | no | — |
| `test-entry-orchestrator-qualifier.test.ts` | qualifier wizard 진행·초안·최종 dispatch·뒤로·초안 보존·항목 없을 때 직행 | 동작 | 조건부 | 결정 5 의 스텝 분할이 이 마법사 모델을 다시 정의한다 |
| `test-entry-orchestrator-reentry.test.ts` | reentry 진입·시드·취소 무영향·확정 시 scoring 초기화·저장 | 동작 | 조건부 | 같음 |
| `test-entry-policy.test.ts` | consent × ingress 4 조합의 instruction/CTA 매트릭스, 액션 효과 독립 | 동작 | 조건부 | 모바일 instruction IA 를 바꾸면 카피 결정과 함께 |
| `test-lazy-validation.test.ts` | enterable fixture 전수 통과, 1 회 검증 후 캐시, 실패 격리, 캐시 해제 | 동작 | no | — |
| `test-question-bootstrap.test.ts` | 21 케이스: ingress Q2, profile Q1, active-run 재개 인덱스, 희소 응답, 진행률, qualifier 정규화 | 동작 | no | — |
| `test-question-runtime-utils.test.ts` | `isProfileQuestion` 3 건 | 동작 | no | — |
| `test-result-panel.test.ts` | 마운트 시 `result_viewed` 1 회 | 동작 | no | — |
| `test-run-reducer.test.ts` | 20 케이스: booting→instruction/active, commit, redirect, 답 기록, submit 차단·허용, 이전 이동 tail 초기화, submit 후 무시, qualifier merge, RESET_SCORING_ANSWERS | 동작 | 조건부 | 스텝 분할로 문항 진행 모델을 바꾸면 |
| `test-storage-active-run.test.ts` | **30 분 경계**(B5) 앞뒤, 저장 왕복, variant 격리 | 동작 | no | — |
| `test-storage-response-set.test.ts` | canonical 왕복, 결측 null, 손상 JSON 정리, 비객체 정리, 비-canonical 키 필터, variant 격리 | 동작 | no | — |
| `test-storage-state-flags.test.ts` | 5 플래그 독립 읽기·쓰기·일괄 정리·variant 격리 | 동작 | no | — |
| `test-storage-volatility.test.ts` | B6 3 트리거 동일 삭제, variant 격리, legacy 세션 키, **B17 잔여 0** | 동작 | no | — |
| `use-answer-handler.test.ts` | submitted·lock 시 무시, 비최종 문항만 `trackQuestionAnswered`, lock 콜백 경유 이동, stale closure 가드 | 동작·인터랙션 | 조건부 | 답변 칩 터치 타깃·자동 진행 타이밍을 바꾸면 |
| `use-test-entry-orchestrator.test.ts` | auto-commit 1 회·Strict Mode 멱등, 정책 거부, redirect·keep_current_preference, start 의 consent 기록, 미준비·redirecting 무시 | 동작 | no | — |
| `use-test-run-controller.test.ts` | 18 케이스: 부트스트랩 분기, `attempt_start`/`final_submit` 각 1 회, 응답 세트 영속화, tail reset, pending transition 소비, ingress 1 회 소비 | 동작 | no | — |
| `variant-question-bank.test.ts` | qmbti 8·egtt 4 문항, canonical index, pole 보존, preview Q1 · locale 폴백 | 동작 | no | — |
| `variant-registry-runtime-integrity.test.ts` | generated == fixture builder 산출, cross-sheet 강등 규칙, B30 wiring 2 건, blog 제외, 캐시 동일 객체 | 동작 | no | — |
| `vercel-analytics-gate.test.ts` | consent 결측/UNKNOWN/OPTED_OUT 미렌더, OPTED_IN 렌더 | 동작 | no | — |
| `vercel-speed-insights-gate.test.ts` | 같음 | 동작 | no | — |

## 3. 표 C — 모바일 계약 개정 시 붉어질 검사 (집중 목록)

**yes 로 판정한 것만 모았다.** 「함께 고칠 것」은 같은 커밋 안에서 동시에 움직여야 하는 것이고, 하나라도 빠지면 게이트가 붉거나 — 더 나쁘게 — **가드가 아무것도 보지 않는 채로 초록이 된다**.

### C-1 · 1 파도 (`npm test`, Default Done gate) — 22 파일

| # | 파일 | 붉어지는 직접 원인 | 같은 커밋에서 함께 고칠 것 |
|:--|:---|:---|:---|
| 1 | `tests/unit/landing-grid-plan.test.ts` | tier 경계 767/768 단언(`:57-63`), mobile 1 열(`:140`) | `src/features/landing/grid/layout-plan.ts:1-11` · `scripts/qa/check-phase4-grid-contracts.mjs:49-62`(제목 문자열) |
| 2 | `tests/unit/landing-interaction-state.test.ts` | `isMobileViewport` → `preserve-mobile` 분류(`:22-51`), unavailable tab-order(`:139`) | `src/features/landing/model/interaction-state.ts`(504줄) · `scripts/qa/check-phase7-state-contracts.mjs:136-149` |
| 3 | `tests/unit/landing-interaction-controller-handlers.test.ts` | Mobile 분기 4 건(`:562`·`:772`·`:796`·`:1219`), matchMedia 스텁(`:32`) | `use-landing-interaction-controller.ts`(738줄, 모바일 분기 40개) · `check-phase7:73,77` |
| 4 | `tests/unit/landing-interaction-dom.test.ts` | `data-card-viewport-tier="mobile"` 로 모바일 카드 판정(`:34,:99`) | `interaction-dom.ts` · `landing-grid-card.tsx` 의 속성 방출 |
| 5 | `tests/unit/landing-desktop-shell-phase.test.ts` | `isMobileViewport:true → 'idle'`(`:168`) | `desktop-shell-phase.ts` · `use-desktop-motion-controller.ts` |
| 6 | `tests/unit/landing-mobile-lifecycle.test.ts` | 280ms 고정 duration, 큐 close, transient shell 타이머 | `mobile-lifecycle.ts:1` · `use-mobile-card-lifecycle.ts` · `check-phase10:127-133` |
| 7 | `tests/unit/landing-mobile-scroll-lock.test.ts` | 전이 위상 한정 lock + body style 복원 | `use-mobile-scroll-lock.ts` · `check-phase10:143-148` |
| 8 | `tests/unit/landing-mobile-backdrop-gesture.test.ts` | `isMobileViewport` 인자·OPEN/OPENING 분기 | `use-mobile-backdrop-gesture.ts` |
| 9 | `tests/unit/landing-card-contract.test.ts` | clamp matrix(`:632-664`), mobile tier 스코프 **부정 단언**(`:356`), 모바일 확장 타이틀(`:595`) | `landing-grid-card.tsx`(1308줄) · `landing-grid-card.module.css` · `check-phase5:133,194-210` |
| 10 | `tests/unit/landing-grid-first-paint.test.ts` | **`@media (min\|max)-width` 존재 금지**(`:31`), 초기 렌더 `window.` 금지(`:41`) | `landing-catalog-grid.module.css` — 모바일 스타일은 컨테이너 쿼리로 쓰거나 다른 파일로 뺀다 |
| 11 | `tests/unit/shared-shell-gutter.test.ts` | 3 선언 배열 `toEqual`(`:58-65`), 경쟁 `px-*` 금지(`:73-99`) | `src/app/globals.css:326`(Ask-First) · `layout-plan.ts:4-7` · `page-shell.tsx` · `site-gnb.tsx` |
| 12 | `tests/unit/gnb-behavior.test.ts` | hover-open 폭+capability 결합(`:12-32`) | `src/features/gnb/behavior.ts:1-12` |
| 13 | `tests/unit/gnb-mobile-menu.test.ts` | 3 단계 상태기계 + scroll lock + 포커스 복원 | `use-gnb-mobile-menu.ts` · `gnb-smoke.spec.ts:791,899,932` |
| 14 | `tests/unit/gnb-keyboard-targets.test.ts` | mobile closed/open 대상 순서(`:116,:137`) | `use-gnb-keyboard-targets.ts` · `check-phase8:87` |
| 15 | `tests/unit/gnb-landing-entry-mode.test.ts` | `mobileLandingTabIndex=-1`, 모바일 패널 focusin(`:79`) | `use-landing-gnb-entry-mode.ts` |
| 16 | `tests/unit/instruction-overlay.test.ts` | M-1~M-6 모달 계약 | `instruction-overlay.tsx`(**`max-[767px]:` 무가드 리터럴 있음 — §4 참조**) · `overlay-connector.test.ts` · `a11y-smoke.spec.ts:679,714` |
| 17 | `tests/unit/design-tokens-dark-parity.test.ts` | 미러 값 일치(`:165`), **고아 토큰 금지**(`:218`), 미선언 참조 금지(`:236`) | `docs/design/ds/colors_and_type.css`(**Ask-First·저장소 밖 push 표면**) → `globals.css` 미러 순서로 |
| 18 | `tests/unit/contract-citations.test.ts` | 계약 4 문서의 백틱 경로·§번호·script·ref 실재 | 결정 6 의 문서 분리와 동시에 `AGENTS.md`·`.claude/CLAUDE.md`·`project-rules.md`·`verification-commands.md` |
| 19 | `tests/unit/docs-lifecycle.test.ts` | 살아 있는 문서 링크 실재, 이름 중복 금지 | 계획서 신설·이관을 같은 커밋에서 |
| 20 | `tests/unit/qa-registry.test.ts` | 등록부 == 파일 집합, `AGENTS.md` §5 개수, `project-rules.md` blocker 요약 | 체커 추가·삭제 시 두 산문을 함께 |
| 21 | `tests/unit/decision-register.test.ts` · `tests/unit/lessons-ledger.test.ts` | BQ 연속·인용, 원장 형식·번호 | 새 BQ 를 끝 번호로, 함정 등재는 착지 전에 |
| 22 | `tests/unit/tailwind-candidate-hygiene.test.ts` | 작업 트리 전체의 자리표시자 임의값 후보 | 계획서·설계 문서에 `…` 든 유틸리티 예시를 쓰지 않는다 |

### C-2 · 2·3 파도 (`qa:rules` · `test:e2e:gate`)

| # | 검사 | 붉어지는 직접 원인 | 같은 커밋에서 함께 고칠 것 |
|:--|:---|:---|:---|
| 23 | `check-phase4-grid-contracts.mjs` | e2e 제목 7 개 · unit 제목 6 개를 정규식으로 요구 | 제목을 바꾸면 체커도 — **제목만 유지하고 내용을 바꾸면 가드가 침묵한다** |
| 24 | `check-phase5-card-contracts.mjs` | `isMobileViewport ? 'overflow-visible text-clip' : …` **분기 철자**(`:133`) | 분기를 없애거나 이름을 바꾸면 체커 133 행을 새 불변식으로 다시 쓴다 |
| 25 | `check-phase6-spacing-contracts.mjs` | grid/state smoke 제목 5 개, spacer 패턴 금지 4 종 | 모바일 카드 레이아웃을 flex 로 바꾸면 `:95` 의 filler-flex 금지와 충돌한다 |
| 26 | `check-phase7-state-contracts.mjs` | **`viewportWidth < 768`**(`:73`) · **`hoverCapability ? 'hover' : 'tap'`**(`:73`) · `matchMedia('(hover: hover) and (pointer: fine)')`(`:77`) | 결정 2 의 직접 타깃. 새 판정 함수명으로 세 정규식을 다시 쓴다 |
| 27 | `check-phase9-performance-contracts.mjs` | `INITIAL_VIEWPORT_WIDTH` SSR 초기화(`:41`), reduced-motion transient-shell 셀렉터(`:150-155`), `package.json`·`playwright.config.ts` 명령 문자열 | 모바일 렌더 경로를 바꾸면 41-47 행, choreography 를 바꾸면 136-156 행 |
| 28 | `check-phase10-transition-contracts.mjs` | `assertion:B14-mobile-*` 5 개 존재 요구(`:122-133`), `document.body.style.overflow` 단언 존재 요구(`:143-148`), 모바일 키프레임·클래스 6 개(`:152-166`) | `transition-telemetry-smoke.spec.ts` · `landing-grid-card.module.css` |
| 29 | `check-phase11-telemetry-contracts.mjs` | manifest 폐쇄 전수 + **baseline 파일 집합 정확 일치(누락·유령 양방향)** | `theme-matrix-manifest.json`(Ask-First) → 체커 → `qa:visual:full`(**사용자 승인 필수**) → `theme-matrix-baseline-provenance.md` |
| 30 | `check-variant-only-contracts.mjs` | **`docs/req-landing.md` 안의 `` `subtitle` ``·`4줄`·`재사용` 문자열 존재 요구**(`:119-121`) | 결정 6 의 문서 분리 시 이 세 문자열의 새 거처를 정하고 체커 경로를 바꾼다 |
| 31 | `check-blocker-traceability.mjs` | §14.2 항목 번호 ↔ 등록부 67 항목 양방향 폐쇄, assertionId 가 `test(`/`it(` 호출 200자 이내에 박혀 있을 것 | `docs/req-landing.md` §14.2 · `docs/blocker-traceability.json` · 해당 스펙의 제목 · `qa-registry.test.ts` 가 보는 `project-rules.md` 요약 문장 |
| 32 | `check-phase1-contracts.mjs` | 새 모바일 라우트가 `[locale]/` 밖이거나 `window` 를 읽으면 | 새 페이지 위치와 SSR 안전성 |
| 33 | `theme-matrix-smoke.spec.ts` | **gate 116 장 · smoke 164 장 전부**. 모바일 몫은 gate 40 · smoke 40 | manifest → 체커 → `qa:visual:full` → provenance. `local-snapshot.ts:21-44` 때문에 **없는 baseline 은 생성되지 않고 계속 붉게 남는다** |
| 34 | `grid-smoke.spec.ts` | 390 사용 6 케이스 + `W12_MOBILE_VIEWPORTS`(360·390·767) 3 케이스 | `check-phase4`·`check-phase5`·`check-phase6` 의 제목 참조 13 곳 |
| 35 | `state-smoke.spec.ts` | 390 사용 4 케이스, `expanded-focus-shell` 스냅샷 1 장 | `check-phase6:136`·`check-phase7:159,163`·`check-phase8:73`·`check-phase9:190,194` |
| 36 | `gnb-smoke.spec.ts` | 390 사용 10 케이스, gutter 계단 전수(`:269`) | `shared-shell-gutter.test.ts` 와 같은 계약을 e2e 쪽에서 본다 — 둘이 함께 움직인다 |
| 37 | `transition-telemetry-smoke.spec.ts` | 390 사용 8 케이스, B14-mobile-* 7 건 | `check-phase10:111-149` |
| 38 | `a11y-smoke.spec.ts` | 390 사용 3 케이스 + W12-mobile 3 폭 루프(`:619`) | `check-phase8:80` · axe 결과는 터치 타깃 24px 하한(WCAG 2.5.8)을 **보지 않는다**(§4) |

### C-3 · 「붉어지지 않아서 더 위험한 것」

**`check-phase*` 계열은 제목 문자열의 **존재**만 본다.** `readNamedTestBlock`(`check-phase4:6-14`)과 나머지 12 체커의 모든 검사가 `read(file)` 후 정규식 `test()` 다. 그래서 모바일 계약을 바꾸면서 **제목을 그대로 두고 단언 내용만 비우면 13 체커가 전부 초록으로 남는다.** 계약 개정 시에는 제목을 새 계약에 맞게 **의도적으로 바꾸고**, 그 변경에 맞춰 체커의 정규식을 고치는 것이 유일하게 안전한 순서다 — 제목을 유지하는 쪽이 편해 보이지만 그 편함이 정확히 가드의 침묵이다.

## 4. 가드 공백 — 개정 전에 알아야 할 무가드 지점

**⑴ 767/768 은 다섯 곳에 따로 적혀 있고 그중 둘은 아무 가드도 없다.** `layout-plan.ts:1`(`MOBILE_MAX_VIEWPORT_WIDTH = 767`)과 `globals.css:326`(`@media (min-width: 768px)`)은 `shared-shell-gutter.test.ts:60` 이 묶는다. `use-landing-interaction-controller.ts:72`(`viewportWidth < 768`)는 `check-phase7:73` 이 리터럴로 묶는다. 그러나 **`src/features/gnb/behavior.ts:1` 의 `MOBILE_BREAKPOINT_MAX = 767` 은 `src/features/gnb/index.ts:9` 에서 재수출될 뿐 소비자가 하나도 없는 죽은 상수**이고, **`src/features/test/instruction-overlay.tsx:26` 의 `max-[767px]:` Tailwind 임의 variant 는 어떤 가드도 보지 않는다**. 결정 2 를 실행할 때 이 둘은 조용히 뒤처진다.

**⑵ 모든 모바일 e2e 는 폭만 바꾸고 입력 **능력**은 데스크톱 그대로다.** `hasTouch` · `isMobile` · `(pointer: coarse)` · `navigator.maxTouchPoints` 를 쓰는 테스트가 **저장소 전체에 0 건**이다(실측 grep). 터치 흉내는 두 스펙의 25 개 `dispatchEvent(..., {pointerType:'touch'})` 호출뿐이고(`gnb-smoke` 9 · `transition-telemetry-smoke` 16), 그것은 **합성 DOM 이벤트라 미디어 특성을 바꾸지 않는다**. hover capability 를 조작하는 곳은 `matchMedia('(hover: hover) and (pointer: fine)')` 를 스텁하는 4 스펙뿐이다(`gnb-smoke:351` · `state-smoke:107` · `a11y-smoke:177` · `grid-smoke:1985`). 현재 390px 테스트가 tap 모드에 도달하는 것은 **폭 게이트 덕분이지 입력 방식 덕분이 아니다.** 결정 2 로 `isMobileViewport` 를 입력 방식 기준으로 바꾸면, hover 가능한 Playwright chromium 의 390px 뷰포트는 **hover 경로로 떨어진다** — 즉 위 C-1·C-2 의 모바일 e2e 31 케이스가 「계약을 어겨서」가 아니라 「테스트가 터치를 흉내 내지 않아서」 붉어진다. 개정과 같은 커밋에서 **모든 모바일 e2e 에 터치 컨텍스트(`hasTouch`/`isMobile` 또는 `(pointer: coarse)` 스텁)를 부여**해야 하고, 그렇게 하지 않으면 붉음의 원인을 가려낼 수 없다.

**⑶ 터치 타깃 크기를 보는 검사가 하나도 없다.** `@axe-core/playwright` 는 `target-size`(WCAG 2.5.8) 를 기본 규칙 집합에서 돌리지 않고, 저장소 어디에도 `min-h-11`/44px/24px 하한을 단언하는 테스트가 없다(실측 grep: `touch-action` 0 건, 타깃 크기 단언 0 건). 사전 실측이 찾은 `testChipClassName` 의 `min-h-8`(32px) 은 **어떤 게이트도 보지 않는다** — 고쳐도 아무 검사가 반응하지 않고, 안 고쳐도 아무 검사가 발화하지 않는다.

**⑷ `qualifier-overlay.spec.ts` 14 케이스는 전부 1280px 에서만 돈다.** 모바일 qualifier 경로에 대한 e2e 커버리지가 0 이다.

**⑸ A-08(모바일 확장 헤더 sticky)의 산문 조항 위치를 찾지 못했다 — 미확인.** `transition-telemetry-smoke.spec.ts:881` 단 하나가 그 행동을 고정하고 있고, 그 테스트에는 assertion id 도 § 인용도 없다. 이 계약이 어느 문서의 무슨 조항인지는 req-landing 전문을 읽어야 확정된다.

**⑹ B14 모바일 타이틀 연속성 가드 둘이 「어긋나면 스스로 꺼지도록」 적혀 있다.** `transition-telemetry-smoke.spec.ts:585-588` 과 `:658-661` 의 `test.fixme(Math.abs(afterOpenTitleTop - beforeTitleTop) > 1, 'Wave-13: B14 title-continuity recalibration pending mobile expanded layout')` 는 **조건부 fixme** 라서, 타이틀이 1px 넘게 움직이는 순간 실패가 아니라 **skip** 이 된다. 즉 이 두 케이스는 잡으려던 바로 그 조건에서 침묵한다. 그 조건은 이미 성립해 있을 가능성이 높다 — 주석이 BQ-08 로 Normal 타이틀이 약 62px 내려갔다고 적는다(`:582`). **모바일 확장 형상을 재설계하는 이번 작업이 그 TODO(Wave-13) 의 수신인이므로, 두 가드를 조건부 fixme 에서 실단언으로 되돌리는 것이 개정 범위에 들어온다.**
