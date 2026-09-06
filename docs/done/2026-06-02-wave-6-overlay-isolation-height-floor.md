# Wave 6 — Desktop expanded overlay sibling isolation 보강 + Expanded height floor

> **Status: IMPLEMENTED + VERIFIED.** Unit A/B were resumed from saved state; Unit C/D completed on 2026-06-02.
> Implementation prompt(2026-06-02) 기반. BQ-19 Analysis gate 통과 + Logic Improvement **W6-LI-01/02/03/04 approved**, W6-LI-05 no-change.
> 본 문서는 `AGENTS.md §7`(필수 + rebuild 필드) + High-Risk 영향 차원을 모두 포함한다.

---

## 1. Metadata (AGENTS §7 + rebuild 필드)

| Field | Value |
|---|---|
| Plan date | 2026-06-02 |
| Wave | **Wave 6** (Desktop expanded overlay sibling isolation + height floor). `wave-roadmap.md` Wave 6 Include 범위 |
| Task mode | **Implementation** |
| Workspace | confirmed active local `main` (repo root) — `git worktree list`로 확인 완료 |
| Logic Improvement | **W6-LI-01, W6-LI-02, W6-LI-03, W6-LI-04 approved**; W6-LI-05(behavior layers) = no change, 보존 |
| Initiative 귀속 | BQ-17(geometry isolation → Wave 6 defer 귀결), BQ-24(height floor 기제) |
| Prerequisites | Wave 4–5 완료 ✅; RC W1–W5 Unit 5 핸드오프(`docs/plans/2026-06-02-expanded-height-floor.md`) 검토 완료 ✅; BQ-19 Analysis gate cleared ✅ |

### Reference-only (수정 금지)
- `legacy/reference` worktree (`/Users/b-m-2022001/Local/vivetest-legacy-reference`, `d3305b7`) — 비교/증거용 read-only.
- `vivetest-checkpoints/*` (w01-02 … w15-17) — verification/rollback anchor only.
- `superseded/**`, `docs/archive/**` — 역사적 참조.
- `.claude/worktrees/elegant-poincare-f720d3` (prunable) — 무관.

---

## 2. SSOT 근거 (재확인 완료)

- **`docs/design/design.md §7.3`** (Expanded test card): "the expanded card must be **at least the resting card height**. The realized mechanism measures the resting card's height in **explicit pixels** and applies it as a floor; surplus height is absorbed **only** between the last choice and the meta row (**a single flex spacer**). The card grows downward when content overflows. **Do not** express this invariant as `min-height: 100%`." Blog: 동일 floor 기제, spacer는 subtitle block ↔ meta+CTA group 사이. "floor/spacer affects **only** the expanded card's own height; it must not change any same-row card's track height."
- **`design.md §10`**: "`min-height: 100%` as the expanded-overlay height invariant" = Never Reintroduce.
- **`req-landing.md §6.7(3)` Expanded Geometry Isolation**: fixed height 금지, content-fit(하단 잔여 0), same-row non-target top/bottom/outer height 오차 `0px`, **row 1 규칙은 row 2+에도 동일 적용**, 종료 직후 잔류 변화 `0px`(row 2+ 포함).
- **`req-landing.md §6.7(4)` Baseline Freeze/Release**: `BASELINE_READY → BASELINE_FROZEN → BASELINE_READY` 순서 불변; 종료 직후 release는 별도 DOM phase가 아니라 timer lock(현 구현 32ms).
- **`req-landing.md §6.7(5)`**: 가독성 해치는 clipping 금지(spacer는 overflow 유발 안 함).
- **`req-landing.md §8.4`** Shell scale: reduced-motion 제외 전 경로 콘텐츠 scale `1.04` 고정. row 1+ width-only `1.10x`는 **외곽 가로폭만**(vertical 무간섭) → floor 계산에서 제외. reduced-motion = scale 1(`module.css` `@media (prefers-reduced-motion)` → `--landing-card-shell-scale: 1`).
- **Decision Register**: BQ-24(floor 기제 = explicit-px 측정 + 단일 flex spacer, `min-height:100%`/CSS-only flex floor 금지, B4 `surfaceMinHeight==='0px'` 보존), BQ-17(geometry isolation Wave 6 귀속), BQ-07(baseline 재생성·`qa:visual:full` 금지), BQ-25(화살표 광학 = Wave 16 이후, 본 wave 제외), BQ-04(전역 토큰 = Wave 16 제외).

---

## 3. 확정 사실 (분석 + 코드 실측 종합 — 추측 금지)

1. **Desktop overlay surface는 content-driven.** `landing-grid-card.module.css:59-64`가 `.expandedShellFrame/.expandedShell/.expandedSurface`에 `min-height:0; height:auto`를 적용 → base의 `min-h-full` 무효화. 따라서 surface 높이 = `expandedBody` 높이. → **floor를 shell/surface가 아니라 `expandedBody`에 주입하면 B4 `shell/surfaceMinHeight==='0px'` 보존 + surface가 floor만큼 성장.**
2. **floor 기준 = active card placeholder(in-flow root)의 `offsetHeight`.** Expanded 시 root(`[data-testid="landing-grid-card"]`)는 in-flow 유지(trigger `[min-height:100%]` + content `h-full` + expandedTitleOnly title + invisible `NormalCardGhostBody`)하므로 그 높이 = `landing-grid-row`의 `items-stretch`로 stretched된 cell 높이 = **row-max outer height**. 확장 카드 자신의 natural height가 아니다.
   - 실측 대상: B4-short-expanded가 expand하는 `qmbti`(`PRIMARY_AVAILABLE_TEST_VARIANT`)는 row 0의 **짧은** 카드이며 same-row `rhythm-b`(tall)가 row-max를 정의 → qmbti placeholder offsetHeight = rhythm-b가 만든 stretched cell. qmbti가 row-max를 정의하지 않으므로 자신의 content 전환과 무관하게 측정값 안정.
3. **Shell scale 보정.** expanded shell은 `scale(1.04)`(steady)로 변환됨. 시각 floor를 만족하려면 layout floor(=`expandedBody` min-height) = `restingOuterHeight / shellScale`. steady 1.04, reduced-motion 1. → 시각 surface 높이 = layoutFloor × scale = restingOuterHeight = `beforeRootHeight`.
4. **meta bottom-aligned.** 잉여 높이는 단일 `flex:1` spacer에만. content가 floor 초과 시 spacer는 min-height(14px)로 접히고 카드가 아래로 성장(content-fit, 하단 잔여 0).
5. **Shared body 오염 위험.** `ExpandedTestBody`/`ExpandedBlogBody`는 desktop overlay(`DesktopExpandedShell`)뿐 아니라 mobile expanded(L1140)·mobile transient(L1174)에도 사용됨. floor/spacer는 **desktop overlay 경로로만** 한정해야 함(mobile은 full-bleed, §6.7(3) floor 비적용).
6. **floor 첫 paint 적용.** 측정·적용이 한 프레임 늦으면 opening 중 짧은 카드 flash. 따라서 floor는 baseline freeze(`useEffect`+rAF, 순서 보존 대상)와 **별개로**, `activeVisualCardVariant` 전이 시 **`useLayoutEffect`(첫 paint 전 동기 re-render)** 에서 측정·반영.

---

## 4. 변경 대상 파일 (모두 명시)

| # | File | 변경 | High-Risk |
|---|---|---|---|
| 1 | `tests/e2e/grid-smoke.spec.ts` | W6-LI-04: floor green 단언 + lower-row handoff 격리 + 종료 잔류 strict 보강 (먼저 failing으로 추가) | — |
| 2 | `src/features/landing/grid/baseline-manager.ts` | W6-LI-02: row snapshot과 **분리된** resting-floor map 타입 + pure capture/clear helper | **High-Risk(§4)** |
| 3 | `src/features/landing/grid/use-grid-geometry-controller.ts` | W6-LI-01: `useLayoutEffect`로 active card root `offsetHeight` 측정 → floor map state (freeze/release 순서 무변경) | **High-Risk(§4)** |
| 4 | `src/features/landing/grid/landing-catalog-grid.tsx` | floor map → 활성 카드 `expandedRestingFloorPx` prop 전달 | — |
| 5 | `src/features/landing/grid/landing-grid-card.tsx` | W6-LI-03: prop 수신 → `floorPx = restingFloorPx / resolvedShellScale`; `DesktopExpandedShell`/`ExpandedTestBody`/`ExpandedBlogBody`에 desktop-overlay 한정 flex column + min-height(px) floor + 단일 spacer | — |
| 6 | `src/features/landing/grid/landing-grid-card.module.css` *(필요 시)* | desktop overlay 전용 spacer/flex helper (전역·scoped 토큰 무변경) | Ask-First? No(scoped module) |
| 7 | `tests/unit/landing-baseline-manager.test.ts` | W6-LI-02 floor map helper 단위 단언 추가(기존 freeze/release 단언 유지) | — |

**High-Risk 절차(AGENTS §4)**: #2, #3은 High-Risk Area. 아래 §8 영향 차원 명시 + §9 Playwright E2E 회귀 적용.

> 파일 추가 없음(모두 기존 파일 수정). 신규 `scripts/qa/*` 없음. 500/30-line 규칙 위반 없음(예상).

---

## 5. 구현 단위 (분석 권장 순서, 한 번에 하나씩 검증)

### Unit A — DONE — failing geometry 단언 추가 (W6-LI-04, 파일 #1) — TDD 선행
- **B4-short-expanded(`grid-smoke.spec.ts:918`)**: 기존 `shellMinHeight==='0px'` + `surfaceMinHeight==='0px'` **유지**. 신규:
  - `beforeRootHeight` = expand 직전 `sourceCard.boundingBox().height` 캡처.
  - expand·steady 후 `expandedSurface.getBoundingClientRect().height >= beforeRootHeight - 0.5` 추가.
  - Unit C 후 focused B4와 full `grid-smoke`에서 green 확인.
- **B4-geometry-active-frame(`:891`)**: 현재 row 0 단일 sibling(rhythm-b)만 검사. 신규: **lower-row(row 2+) steady 및 handoff 중** non-target 카드 y/height/bottom Δ `<=1px` 추가(§6.7(3) "row 1 규칙 row 2+ 동일 적용"). 종료 직후 non-target 잔류 변화 `<=1px` strict 회귀(현 release poll만 존재 → 보강).
- subpixel flake 방지: strict 0px 대신 surface `>= root-0.5`, non-target은 기존 `<=1px` tolerance 정합.

### Unit B — DONE + VERIFIED — floor 측정 (W6-LI-01 #3 + W6-LI-02 #2)
- **#2 baseline-manager.ts**: `BaselineSnapshot`(row top/bottom/height)과 **분리된** `RestingFloorMap = ReadonlyMap<string, number>` 타입 + pure helper `captureRestingFloor(map, variant, px)` / `clearRestingFloor()` 추가. `freezeBaselineRows`/`releaseBaselineRows` 시그니처·반환·`LandingBaselineState` freeze/release 순서는 **무변경**(B11-baseline-freeze 단언 보존).
- **#3 use-grid-geometry-controller.ts**: 신규 `useLayoutEffect`(deps: `activeVisualCardVariant`, `plan.tier`, `shellRef`):
  - desktop tier + `activeVisualCardVariant` 존재 시: `shellRef.current.querySelector('[data-testid="landing-grid-card"][data-card-variant="<active>"]')`의 `offsetHeight`(= stretched cell outer = row-max)를 explicit px로 측정.
  - `captureRestingFloor`로 floor map state(별도 `useState`) 동기 갱신 → 첫 paint 전 re-render(flash 차단).
  - `activeVisualCardVariant`가 null(collapse)이면 `clearRestingFloor()`로 stale 방지. 매 expansion fresh 측정으로 stale 자체 차단.
  - **freeze/release `useEffect`(L251-308)는 손대지 않음** → §6.7(4) `READY→FROZEN→READY` + 32ms lock 순서 보존.
  - 출력에 `restingFloorMap` 추가(`spacingModel`, `baselineState`와 병렬).
- **shell scale 보정 위치 = card 측**(§7 Decision 1 참조): controller는 raw outer px만 운반, `/shellScale`는 card가 자신의 `resolvedShellScale`로 수행(모션-불가지 controller 유지).

### Unit C — DONE + VERIFIED — floor + spacer 적용 (W6-LI-03 #5, #6)
- **landing-catalog-grid.tsx(#4)**: `restingFloorMap[card.variant]`를 활성 카드에 `expandedRestingFloorPx` prop으로 전달(`spacing={spacingModel[...]}` 패턴과 동일).
- **landing-grid-card.tsx(#5)**:
  - `LandingGridCardProps`에 `expandedRestingFloorPx?: number` 추가. `floorPx = expandedRestingFloorPx ? expandedRestingFloorPx / resolvedShellScale : undefined`.
  - `DesktopExpandedShell`에 `floorPx` 전달. **`expandedBody`(data-slot=expandedBody, desktop 경로 전용 렌더)** 에만 `style={{minHeight: floorPx px}}` + flex column. **shell/surface min-height 무변경**(B4 보존).
  - body 경로 한정 플래그: `ExpandedCardBody`/`ExpandedTestBody`/`ExpandedBlogBody`에 `layoutMode: 'flow' | 'desktop-overlay-floor'`(default `'flow'`) 추가. `DesktopExpandedShell`만 `'desktop-overlay-floor'` 전달. mobile expanded(L1140)·transient(L1174)는 default `'flow'` → **오염 없음**.
  - desktop-overlay-floor 모드에서만:
    - body 컨테이너 = flex column, `flex-1`(floor된 expandedBody 잔여 높이 흡수).
    - **단일 `flex:1` spacer(`min-height:14px`, aria-hidden, motion 슬롯 아님)**: Test = `answerChoices ↔ ExpandedMetaRow` 사이; Blog = `subtitle ↔ (meta+CTA)` 사이(spacer가 후속 meta·CTA를 함께 하단 정착).
    - 비-spacer 리듬(현 10px)은 유지하되 flex `gap`이 spacer 양옆에서 이중 계상되지 않도록 spacer 구간만 gap 비적용(§9 gate 4 시각 확인). spacer 외 flex/auto-margin 금지(§6.7(2) 정합).
- **module.css(#6, 필요 시)**: desktop overlay 전용 spacer/flex util이 Tailwind arbitrary로 부족할 때만 scoped class 추가. 전역(`globals.css`)·`--normal-*`/`--expanded-*` 토큰값 무변경.
- **Actual outcome**: `landing-grid-card.module.css` 수정은 불필요했다. Tailwind class-only로 desktop overlay floor body/spacer를 구현했다. Mobile expanded/transient는 `layoutMode='flow'` default로 기존 grid flow 유지.

### Unit D — DONE + VERIFIED — functional 재검증 단언 (파일 #1, #7)
- B10/B11(`:710`): Normal `data-comp-gap`/`data-natural-height`/`data-base-gap` 불변 회귀(floor가 normal 보정 미간섭) 확인 — 기존 단언으로 충분, 회귀만 확인.
- title-continuity(`:446`): `line1Height <= lineHeight + 2` 유지(title이 floor spacer로 이동 안 함) 확인.
- baseline-manager unit(#7): floor helper capture/clear 단언 추가, freeze/release 기존 단언 유지.
- Actual verification: Basic Gates, full `grid-smoke`, functional-only `state-smoke`, and `git diff --check` passed. Full `state-smoke` still has the two BQ-07-deferred screenshot mismatches (`expanded-focus-shell.png`, `overlay-focus-shell.png`); baselines were not regenerated.

---

## 6. 영향 평가 (AGENTS §7 필수 항목)

- **Shared components (shell/GNB)**: 무영향. PageShell/GNB/`globals.css` 미변경. 변경은 `landing/grid/**` 한정.
- **Localization**: 무영향. meta 라벨/메시지 키 미변경(spacer는 콘텐츠 아님).
- **a11y**: tabIndex/aria/data-slot/focus order 무변경. spacer는 `aria-hidden`·비-interactive·non-focusable. reduced-motion floor 보정(scale 1) 정확. clipping 미발생(§6.7(5)).
- **State contracts**: baseline freeze/release 상태모델(`READY→FROZEN→READY`, 32ms lock) **무변경**. floor map은 분리 state(stale 방지). resolver/transition/telemetry/storage/routing/test-entry/answer-choice behavior 전부 보존(W6-LI-05 no-change).
- **Core user flow**: hover/tap expand, handoff, keyboard, mobile lifecycle behavior 무변경. floor/spacer는 expanded 카드 내부 높이만 변경.

---

## 7. Confirmed Implementation Decisions

1. **Shell-scale 보정 위치**: controller가 raw outer px만 저장하고 `/shellScale`는 **card에서** 수행(card는 이미 `resolvedShellScale = reducedMotion ? 1 : 1.04` 보유 → controller에 `reducedMotion` 결합 회피, 모션-불가지 controller 유지). *Prompt Step 2 문구("controller에서 보정")와 미세 차이.* → **권장: card 측 보정.** (대안: controller에 `reducedMotion` 입력 추가 후 controller에서 나눔.)
2. **Floor map 저장 위치**: `LandingBaselineState`에 끼워 넣지 않고 controller의 **별도 `useState`** + baseline-manager의 **pure helper/타입**으로 분리. 이유: freeze/release reducer(rAF dispatch)와 동기 floor 측정(layout effect)의 경합·순서 훼손 위험 제거 + §6.7(4) 순서 100% 보존. W6-LI-02 "row snapshot과 분리"를 가장 안전하게 충족. (대안: `LandingBaselineState`에 `restingFloorByCardVariant` 필드 추가 — freeze 타이밍이 post-paint라 flash 위험 → 비권장.)
3. **spacer 접힘 하한 14px의 flex-gap 처리**: spacer 양옆 gap 이중 계상 방지를 위해 spacer 구간 gap 비적용. 정확한 collapsed 간격은 §9 gate 4 시각 확인으로 확정.

> 위 3건은 모두 사용자 승인 후 권장안으로 구현했다. 제품/UX 결정 변경은 없다.

---

## 8. High-Risk 영향 차원 (AGENTS §4 — 명시 필수)

`use-grid-geometry-controller.ts`, `baseline-manager.ts` 변경의 위험 차원:

- **Performance**: floor 측정은 `offsetHeight` 동기 read(forced reflow) — expansion/handoff당 1회. 비용 미미. spacing remeasure 경로(expanded 중 early-return)는 무변경.
- **Responsiveness**: floor는 expansion·handoff·plan-change(강제 collapse 후 재측정) 시 fresh. width 변경 시 활성 expanded 강제 종료(기존 동작) 후 재측정 — 순서 무변경.
- **Design system consistency**: design.md §7.3 explicit-px floor + 단일 spacer 정합. `min-height:100%` 미사용(§10).
- **Usability**: 첫 paint 전 floor 적용으로 opening flash 제거; meta 하단 정착으로 짧은 콘텐츠 카드(qmbti/energy-check) ≥ same-row max.
- **a11y**: §6 참조(무변경).

→ 회귀 커버리지: §9 Playwright E2E(grid-smoke B4 family/B10/B11/title-continuity, state-smoke functional) + baseline-manager unit.

---

## 9. 검증 게이트 (순서대로 — wave scope 내)

1. **Basic Gates(AGENTS §5, 순서)**: `npm run lint` → `npm run typecheck` → `npm test` → `npm run build`. 0 error.
2. **grid-smoke**(`npx playwright test tests/e2e/grid-smoke.spec.ts`):
   - 신규 floor 단언 green: `expandedSurface height >= beforeRootHeight - 0.5`.
   - B4 보존: `shellMinHeight==='0px'`, `surfaceMinHeight==='0px'`.
   - lower-row(row 2+) steady/handoff non-target Δ `<=1px`; 종료 직후 잔류 Δ `<=1px`.
   - B10/B11 normal `comp-gap`/`natural-height`/`base-gap` 불변; title-continuity `line1Height <= lineHeight+2` 유지.
   - 기존 통과 수 + 신규 단언 모두 green.
3. **state-smoke functional**(`npx playwright test tests/e2e/state-smoke.spec.ts`): `shell/surfaceMinHeight==='0px'` 유지 + `expandedBody` floor 새 계약만 추가. **deferred screenshot 2건(`expanded-focus-shell.png`, `overlay-focus-shell.png`) = BQ-07 — 재생성 금지, functional만 회귀 기준.**
4. **시각 확인(스크린샷 요청 가능)**: 짧은 카드(qmbti, energy-check) expanded가 same-row max 높이 정렬(현 -45.64/-17.25px 위반 해소), meta 하단 정렬, choices↔meta 잉여 여백; 긴 콘텐츠(c5 등)는 spacer 접히고 아래 성장(하단 잔여 0). spacer collapsed 간격 확인.
5. **reduced-motion**: scale 1 경로 floor 보정 확인(`prefers-reduced-motion: reduce`에서 surface ≥ root).
6. **`git diff --check`** clean.
7. **baseline-manager unit**(`npm test -- tests/unit/landing-baseline-manager.test.ts`): floor helper + 기존 freeze/release green.

**제외(금지)**: `qa:visual:full`, baseline 재생성, 신규 `scripts/qa/*`(BQ-07).

### Actual Verification Result (2026-06-02)

- `npm run lint` ✅
- `npm run typecheck` ✅
- `npm test` ✅ 73 files / 483 tests
- `npm run build` ✅
- `npx playwright test tests/e2e/grid-smoke.spec.ts` ✅ 18 tests
- `npx playwright test tests/e2e/state-smoke.spec.ts --grep-invert "expanded keyboard focus boundary|B5-overlay-focus"` ✅ 13 functional tests
- `npx playwright test tests/e2e/state-smoke.spec.ts` ⚠️ 13 functional tests passed; 2 screenshot baseline mismatches only (`expanded-focus-shell.png`, `overlay-focus-shell.png`). BQ-07 preserved: no baseline regeneration.
- `git diff --check` ✅

---

## 10. 보존 계약 (변경 금지 — wave Exclude + 프롬프트)

- **Behavior**: resolver/transition/telemetry/storage/routing/test-entry/answer-choice 전부(W6-LI-05 no-change). data-slot 명, tabIndex/aria, motion 슬롯(spacer는 motion 슬롯 아님).
- **프롬프트 1–4 결과**: 17px inset, 20px/600 title, 인라인 meta, choice 첫 줄 정렬, 16/6 thumbnail, abstract placeholder.
- **§6.7(3)** same-row non-target 0px isolation, row track sizing 무영향.
- **§6.7(4)** baseline freeze/release(`READY→FROZEN→READY`, 32ms lock) 순서.
- **§6.7(5)** clipping 금지.
- **§8.4** shell scale(steady 1.04, row1+ width-only 1.10x, transform-origin) 무변경.
- **design.md §7.3/§10** `min-height:100%` floor 금지(CSS-only min-height floor 절대 금지, Unit 5 caveat).
- **B4** `surfaceMinHeight==='0px'`(content-fit 의도 계약).
- **B10/B11** normal spacing 모델, **title-continuity(+2px)**.
- **globals.css 전역 토큰(Wave 16/BQ-04)**, scoped `--normal-*`/`--expanded-*` 토큰값.
- **B14** mobile title-continuity `test.fixme`(Wave 13).
- **BQ-07** visual-regression baseline 재생성·`qa:visual:full` 금지.
- **BQ-25** 화살표 글리프 광학 미처리(Wave 16 이후).
- **Mobile expanded·Blog direct navigation** = Wave 13/7, 본 wave 제외.

---

## 11. 핵심 위험 & 완화

| 위험 | 완화 |
|---|---|
| floor 측정이 한 프레임 늦어 opening flash (Code §4) | baseline freeze와 별개의 `useLayoutEffect`(첫 paint 전 동기 re-render)에서 측정·적용 |
| mobile shared body 오염 (W6-LI-03 risk) | `layoutMode` 플래그로 desktop overlay 경로에만 spacer/floor 한정 |
| subpixel flake (W6-LI-04 risk) | surface `>= root-0.5`, non-target `<=1px` tolerance |
| floor가 freeze 순서 훼손 | freeze/release `useEffect` 무변경; floor는 분리 state·layout effect |
| active 카드가 row-max 정의 시 자기 content 전환으로 측정 오차 | B4 대상 qmbti는 short(rhythm-b가 row-max) → 안정. 일반 case도 ghost body가 full content 재현(편차 ≤ topGap 8px, surface≥root-0.5 tolerance 내) |

---

## 12. STATE.md / 후속

- `.planning/STATE.md`를 완료 상태로 갱신했다.
- 신규 시각 결정은 없었다. 본 wave는 `design.md §7.3`의 기존 explicit-px floor 기제를 구현한 것이므로 `design.md` 갱신은 불필요하다.
