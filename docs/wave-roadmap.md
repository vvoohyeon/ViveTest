# Wave Roadmap

Last reconciled: HEAD `55e2808` / `2026-06-27`

## Status Legend

| Status | Meaning |
| --- | --- |
| ✅ 완료 | Implemented and recorded as complete in the current repo. |
| 🔄 진행 | Implementation or validation is in progress. |
| ⬜ 계획 | Planned / not yet implemented in the current repo. |
| ⏸ deferred | Explicitly deferred; do not implement without a separate approved scope. |

## Wave Overview

| Wave | 제목 | 상태 | 핵심 BQ |
| ---: | --- | --- | --- |
| 1 | Landing card render seam isolation + Normal order alignment + motion-ready internal seams | ✅ 완료 | BQ-08, BQ-12, BQ-16, BQ-17 |
| 2 | Normal card structural order verification and Wave 3 readiness | ✅ 완료 | BQ-08, BQ-12 |
| 3 | Normal card visual skin | ✅ 완료 | BQ-04, BQ-07, BQ-21 |
| 4 | Expanded test content contract | ✅ 완료 | BQ-09, BQ-12, BQ-07 |
| 5 | Expanded test visual skin | ✅ 완료 | BQ-09, BQ-16, BQ-25, BQ-07 |
| 6 | Desktop expanded overlay sibling isolation + height floor | ✅ 완료 | BQ-12, BQ-24, BQ-25, BQ-07 |
| 7 | Blog direct navigation behavior | ✅ 완료 | BQ-02, BQ-12, BQ-19, BQ-07 |
| 8 | Blog normal/active visual | ✅ 완료 | BQ-02, BQ-21, BQ-07 |
| 9 | Unavailable behavior and visual | ✅ 완료 | BQ-10, BQ-26, BQ-07 |
| 10 | Landing grid height rhythm | ✅ 완료 | BQ-24, BQ-30, BQ-31, BQ-32 |
| 11 | Landing desktop a11y/keyboard hardening | ✅ 완료 | BQ-12, BQ-21, BQ-24, BQ-26, BQ-33 |
| 12 | Mobile browse card visual | ⬜ 계획 | BQ-19, BQ-31/BQ-32 handoff; no registered Wave-12 BQ in current repo |
| 13 | Mobile expanded shape/position | ⬜ 계획 | BQ-11, BQ-16, Wave 1 B14 deferred title-continuity |
| 14 | Landing-only regression stabilization | ⬜ 계획 | BQ-07, BQ-12, BQ-21 |
| 15 | Desktop GNB visual shell | ⬜ 계획 | BQ-03, BQ-21 |
| 16 | Light-only theme cleanup + scoped visual-token consolidation | ⬜ 계획 | BQ-04, BQ-21, BQ-25, BQ-29, BQ-30 |
| 17 | Mobile menu overlay visual | ⬜ 계획 | BQ-03, BQ-04, BQ-21 |

### Inter-wave completed checkpoints

Wave 번호 체계 밖에서 진행된 정합 작업이며, Wave 번호를 밀지 않는다.

| Checkpoint | Position | Status | 핵심 BQ |
| --- | --- | --- | --- |
| BQ-21 design authority + W1–W5 visual reconciliation | Wave 5 ↔ Wave 6 | ✅ 완료 | BQ-21, BQ-22, BQ-23, BQ-24, BQ-25 |
| Visual Reconciliation R1 + Claude Design SSOT 단일화 | Wave 9 ↔ Wave 10 | ✅ 완료 | BQ-27, BQ-28, BQ-29, BQ-30, BQ-31 |

상세는 Wave Details의 "Inter-wave Reconciliation — BQ-21 design authority and W1–W5 visual reconciliation", "Inter-wave Reconciliation — Visual Reconciliation R1" 항목 참조.

---

## Global Gate — Logic Improvement Analysis (BQ-19)

Every wave follows a mandatory two-step sequence. No implementation prompt may be issued until both steps are complete.

**Step 1 — Analysis Only**

Issue an Analysis-Only Coding Agent task for the wave scope. The report must cover each improvement candidate:

| Field | Content |
| --- | --- |
| Layer | state / hooks / routing / storage / telemetry / i18n |
| Change magnitude | Low / Medium / High |
| Improvement value | Rated against criteria 1-5 (Modern React patterns → a11y logic) |
| Risk / rollback | Breaking contracts, rollback difficulty |
| Wave dependency | Other wave items this affects |

**Step 2 — Approval and Handoff**

Review the report and approve or defer each candidate. Then issue the implementation prompt with one of:

- `Logic Improvement: [candidate IDs] approved — apply per analysis report [date].`
- `Logic Improvement: no candidates approved — preserve existing logic.`

Deferred candidates are logged in the Decision Register.

---

## Wave Details

### Wave 1 — Landing card render seam isolation + Normal order alignment + motion-ready internal seams

- **Status:** ✅ 완료
- **Goal:** `landing-grid-card.tsx` 내부 render branch/slot 책임을 분리하고, Normal face 정보 순서를 Claude Design 기준(`Thumbnail → Title → Subtitle → Tags`)으로 정렬하며, 후속 motion 적용을 위한 internal seam을 준비한다.
- **Include:**
  - `landing-grid-card.tsx` 내부 render branch/slot 책임 분리
  - W1-LI-01 / W1-MR-01: Normal face seam 생성 및 Normal order `Thumbnail → Title → Subtitle → Tags` 반영
  - W1-LI-02 / W1-MR-02: Expanded Test / Blog body branch helper 분리, 단 props/slot/order/handler output 동일성 보존
  - W1-LI-04 / W1-MR-04: Unavailable overlay leaf seam 분리, 단 behavior 변경 금지
  - W1-LI-06 / W1-MR-05: resolver/transition/telemetry/test-route boundary naming/comment-only clarity
  - W1-LI-03 / W1-MR-03: desktop expanded shell seam은 output-identical pure relocation일 때만 조건부 허용
  - QA/data/ARIA/event binding 보존
  - Normal order 변경에 따른 card contract unit test update 허용
- **Exclude:**
  - visual skin, border, shadow, radius, token, thumbnail treatment
  - actual motion, CSS transition 변경, Motion/Framer primitives
  - new public `data-slot` values
  - layout-affecting new wrappers
  - Blog direct navigation / Blog behavior 변경
  - Unavailable no-hover/no-click/no-tap behavior 변경
  - mobile expanded shape/position, mobile lifecycle 변경
  - GNB, PageShell, settings, theme, mobile menu
  - resolver, telemetry, transition, test route 파일 수정
  - result pipeline
  - visual baseline generation or approval
  - W1-LI-05 prop grouping
- **Deferred:**
  - W1-LI-03이 geometry/sibling isolation을 필요로 하면 Wave 6으로 defer하고 stop/report
  - B14 mobile title-continuity 단언은 thumbnail-first Normal order로 인한 Normal title 위치 이동 때문에 `test.fixme(...)` 처리 후 Wave 13으로 이연
- **Prereqs:** Wave 1 Investigation Report, Wave 1 Logic Improvement Analysis, Wave 1 Motion-Ready Seam Investigation 검토 완료; BQ-08 승인; Logic Improvement Analysis gate cleared
- **Risk:** Medium
- **Gates/Validation:** `landing-card-contract.test.ts` 및 `tests/e2e/grid-smoke.spec.ts` Normal slot 순서 단언 갱신; `tests/e2e/transition-telemetry-smoke.spec.ts` B14 mobile title-continuity Wave-13 pending marker 추가; `git diff --check` clean
- **BQ refs:** BQ-08, BQ-12, BQ-16, BQ-17, BQ-19
- **Completion note:** `NormalCardFace`, `NormalCardTitle`, `NormalCardThumbnail`, `NormalCardSubtitle`, `NormalCardTagRow`, `ExpandedTestBody`, `ExpandedBlogBody`, `UnavailableCardStatusOverlay`, `DesktopExpandedShell` seam을 생성했다. Normal visible order는 `cardTitle → cardThumbnail → cardSubtitle → tags`에서 `cardThumbnail → cardTitle → cardSubtitle → tags`로 변경했고, resolver/transition/telemetry/event handler/ARIA/`data-slot` 계약은 보존했다.
- **Handoff:** Wave 2에서 Normal order verification 및 Wave 3 visual skin readiness 확인. Actual motion은 Wave 5/6 candidate로 handoff.

### Wave 2 — Normal card structural order verification and Wave 3 readiness

- **Status:** ✅ 완료
- **Goal:** revised Wave 1에서 반영된 Normal face 구조 순서(`Thumbnail → Title → Subtitle → Tags`)의 회귀 여부를 확인하고, Wave 3 visual skin 적용 전 구조 안정성을 확정한다.
- **Include:**
  - revised Wave 1 결과의 Normal order 검증
  - Wave 1에서 업데이트된 card contract tests / QA anchors 검토
  - Wave 3 visual skin 적용 전에 필요한 Normal face 구조 결함 수정
  - 수정은 Wave 1 Normal order alignment의 fallout에 한정
- **Exclude:**
  - 새로운 visible order 변경
  - visual token, hover skin, border, shadow, radius, thumbnail treatment
  - Blog direct navigation
  - Unavailable behavior
  - actual motion
  - mobile/GNB/theme/result/baseline
- **Deferred:** `docs/design/resources/assets/vive-logo.svg` trailing whitespace는 기능 무영향으로 기록만 남겼다.
- **Prereqs:** Wave 1 완료; Logic Improvement Analysis gate cleared
- **Risk:** Medium
- **Gates/Validation:** card contract unit expanded title-only 소유권 단언 강화; `tests/e2e/grid-smoke.spec.ts`; `tests/e2e/a11y-smoke.spec.ts`; `git diff --check` clean(vive-logo.svg trailing whitespace 제외)
- **BQ refs:** BQ-08, BQ-12, BQ-19
- **Completion note:** `NormalCardFacePresentation = 'collapsed' | 'expandedTitleOnly'` 타입을 추가하고 desktop expanded title-only 렌더를 `NormalCardFace` seam으로 라우팅했다. `data-slot="cardTitle"`, normal-title 클래스, `normalTitleRef`, `NormalCardGhostBody`, public slot 노출 메커니즘은 보존했다. `scripts/qa/check-variant-only-contracts.mjs` anchor는 `includeSlotAttributes`에서 `exposePublicSlot`로 갱신했고, `docs/req-landing.md` Normal order를 동기화했다.
- **Handoff:** Wave 3 visual skin.

### Wave 3 — Normal card visual skin

- **Status:** ✅ 완료
- **Goal:** Normal 카드 시각 스타일을 scoped token으로 적용한다.
- **Include:** resting/hover/focus border, shadow, radius, thumbnail treatment, tags compact style.
- **Exclude:** Expanded, Blog behavior, unavailable no-op, global theme token mutation.
- **Deferred:** baseline 재생성 및 `npm run qa:visual:full`은 BQ-07에 따라 미실행; global token promotion은 Wave 16.
- **Prereqs:** Wave 2 완료; Logic Improvement Analysis gate cleared
- **Risk:** Medium
- **Gates/Validation:** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` green; `tests/e2e/grid-smoke.spec.ts` 18/18; `git diff --check` clean; visual review 및 a11y focus check 완료
- **BQ refs:** BQ-04, BQ-07, BQ-12, BQ-19, BQ-21
- **Completion note:** `src/features/landing/grid/landing-grid-card.module.css`에 scoped `--normal-*` 토큰을 도입해 card border/shadow, focus ring, thumbnail radius, tag background/ink/radius를 적용했다. `landing-grid-card.tsx` render logic 및 public slot은 변경하지 않았고 전역 theme token도 변경하지 않았다.
- **Handoff:** Wave 4 expanded content.

### Wave 4 — Expanded test content contract

- **Status:** ✅ 완료
- **Goal:** Expanded Test 카드 콘텐츠 계약을 정의한다.
- **Include:** thumbnail/subtitle/tags 제거, question prominence, no label, no A/B badge, text + decorative arrow.
- **Exclude:** overlay geometry, sibling isolation, mobile shape, resolver, telemetry, storage, i18n, visual baseline.
- **Deferred:** 기존 `state-smoke` screenshot baseline 2건 발산은 BQ-07 범위 외로 미재생성.
- **Prereqs:** Wave 1 완료; Logic Improvement Analysis gate cleared
- **Risk:** High
- **Gates/Validation:** `tests/unit/landing-card-contract.test.ts` decorative arrow presence/ARIA 단언 추가; `tests/e2e/grid-smoke.spec.ts` 18/18 green; `tests/e2e/state-smoke.spec.ts` 기능 체크 green; `git diff --check` clean
- **BQ refs:** BQ-09, BQ-12, BQ-19, BQ-07
- **Completion note:** `ExpandedTestAnswerChoice` helper를 추가했고 choice layout을 `flex items-start gap-3`로 변경했다. Expanded question은 `21px` semibold strong ink/tighter tracking/free wrapping으로 조정했고, answer choice는 text + decorative `aria-hidden` `→` arrow로 구성했다. `data-slot=answerChoiceA/B`, click handler, `tabIndex`, resolver payload boundary, motion slot은 보존했다.
- **Handoff:** Wave 5 expanded visual.

### Wave 5 — Expanded test visual skin

- **Status:** ✅ 완료
- **Goal:** Expanded Test 카드 시각 스타일을 적용한다.
- **Include:** choice button wrapping, equal padding, meta row `completed`, full number display.
- **Exclude:** transition/storage behavior, automatic actual motion approval, baseline regeneration.
- **Deferred:**
  - Expanded content-only motion은 별도 승인 후에만 평가; Wave 1 seam 준비가 actual motion 승인을 의미하지 않는다.
  - `expanded-focus-shell.png`, `overlay-focus-shell.png` screenshot baseline은 BQ-07에 따라 후속 baseline wave로 이연.
- **Prereqs:** Wave 4 완료; Logic Improvement Analysis gate cleared
- **Risk:** Medium
- **Gates/Validation:** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` green; `tests/e2e/grid-smoke.spec.ts` 18/18; `tests/e2e/gnb-smoke.spec.ts` 23/23; state-smoke 기능 체크 green; `git diff --check` clean
- **BQ refs:** BQ-07, BQ-09, BQ-16, BQ-19, BQ-25
- **Completion note:** `landing-grid-card.module.css`에 scoped `--expanded-*` 토큰을 도입했다. Choice button은 warm/sage styling, `px-3.5 py-3`, no hover box-shadow를 적용했고, choice text는 `15px` normal warm ink + `keep-all/anywhere` wrapping으로 정리했다. `metaAttempts` 값은 `"Completed"`로 변경하면서 `getDefaultCardCopy`와 12개 locale message key 구조를 보존했다. answer-choice handler, storage/telemetry/transition behavior, `data-slot`, focus order, decorative arrow behavior는 보존했다.
- **Handoff:** Wave 6 overlay behavior. 단, Wave 6 진입 전 Wave 5↔Wave 6 사이에 BQ-21 design.md 시각 권위 확정 + W1-W5 visual reconciliation이 먼저 완료되었다.

### Inter-wave Reconciliation — BQ-21 design authority and W1–W5 visual reconciliation

- **Status:** ✅ 완료
- **Position:** Wave 5(`571eb0c`) 완료 후 ~ Wave 6 구현 전. Wave 번호 체계 밖의 inter-wave 정합 작업이며 Wave 번호를 변경하지 않는다.
- **Commits:** `cc78257`(design authority 선언 + `design.md` 재구성) → `f3acb9f`(승인된 W1-W5 reconciliation 구현 적용).
- **Goal:** `docs/design/design.md`를 시각 단일 출처(SSOT)로 확정하고(BQ-21), 구현된 Wave 1-W5 결과를 현재 Claude Design 기준과 운영 모델에 재정합한다.
- **Include:**
  - BQ-21: `docs/design/design.md`를 VIVE/ViveTest design-system foundation + ViveTest catalog application layer 시각 SSOT로 확정
  - Visual precedence: `decision-register.md` → product requirements / active rules → `docs/design/design.md` → patterns/application layer → mockup resources → existing implementation evidence → wave-specific CSS(exception only)
  - `AGENTS.md §2` 및 `docs/agent-guides/project-rules.md §Visual-Design`에 design authority 운영 모델 명문화
  - per-wave CSS 추출 퇴역; 보충 CSS는 BQ-19 Analysis gate가 design.md 공백을 입증·승인한 경우에만 예외 발행
  - `wave3-normal-card-reference.css`, `wave4-expanded-test-content-reference.css`, `wave5-expanded-test-visual-skin-reference.css`를 `docs/design/resources/superseded/`로 이동(R100, 내용 무변화)
  - BQ-22: landing thumbnail slot ratio `aspect-[6/1]` → `aspect-[16/6]`, thumbnail slot `mt-[var(--landing-card-base-gap)]` 제거
  - BQ-22 / RC-W1W5-03: `public/landing-card-media/qmbti/thumbnail.svg` viewBox `600×100` → `640×240`, warm-neutral/sage palette(`#E8F0EC`, `#5C8E78`) abstract-only 구성
  - `tests/e2e/grid-smoke.spec.ts` ratio assertion `>5.5 && <6.5` → `>2.4 && <2.9`; expanded title single-line guard headroom `+1` → `+2`
  - Expanded meta inline row를 `label/value`에서 점-구분 inline "value label" 행으로 전환(`landing-grid-card-meta-separator` ×2, `landing-grid-card-meta-value-lead`)
  - 12개 locale meta label copy를 leading-label에서 trailing inline-unit lowercase로 변경하고 `tests/unit/landing-card-contract.test.ts`를 신규 markup에 맞춰 갱신
  - Related analysis/plan docs 추가/갱신: `docs/plans/2026-06-01-rc-w1-w5-reconciliation-analysis.md` 등
- **Exclude:**
  - 전역 theme token migration 미수행; `src/app/globals.css` 전역 적용·namespace 정착은 Wave 16(BQ-04/BQ-21)로 유지
  - High-risk runtime logic 미수정: controller/hooks/storage/telemetry/transition/routing/test-entry
  - storage / telemetry / transition / routing / test-flow / variant-registry behavior 계약 변경 없음
  - visual baseline regeneration / snapshot 등록 / `npm run qa:visual:full` 없음(BQ-07)
  - Wave 6 overlay isolation 구현 자체는 포함하지 않음
- **Deferred:** BQ-23 hero 제거, BQ-25 arrow optical nudge, Wave 16 global token migration, BQ-07 visual baseline regeneration.
- **Prereqs:** Wave 1-W5 완료; BQ-21/BQ-22 approved reconciliation scope
- **Risk:** Medium — design authority + visual asset/test-contract reconciliation. Runtime behavior 영향은 낮지만 권위 문서 변경으로 process/documentation 영향은 Medium-High.
- **Gates/Validation:** `tests/e2e/grid-smoke.spec.ts` ratio/single-line guard 단언 및 `tests/unit/landing-card-contract.test.ts` meta inline row 단언이 신규 markup/asset과 동기화됨. 두 commit 메시지/STATE에는 명시적 Basic Gates green 로그가 없어 해당 실행 결과는 추정하지 않는다.
- **BQ refs:** BQ-07, BQ-21, BQ-22, BQ-23, BQ-24, BQ-25
- **Completion note:** `docs/design/design.md`를 코드베이스 시각 SSOT로 확정하고 superseded references를 보존했다. i18n은 meta label copy만 바꾸고 message key/structure/behavior는 보존했다.
- **Handoff:** Wave 6는 BQ-21 design authority와 BQ-24 floor input 위에서 desktop expanded overlay isolation + height floor를 진행한다.

### Wave 6 — Desktop expanded overlay sibling isolation + height floor

- **Status:** ✅ 완료
- **Goal:** 데스크톱 Expanded overlay 형제 요소 격리 및 Expanded 높이 floor(Normal ≥) 구현.
- **Include:**
  - invisible Normal placeholder + absolute `DesktopExpandedShell` seam 보존
  - `RestingFloorMap` 기반 explicit px floor 측정/전달: active card root `offsetHeight`를 `useLayoutEffect`에서 측정하고 `expandedRestingFloorPx`로 활성 카드에 전달
  - desktop expanded body에만 `expandedRestingFloorPx / resolvedShellScale` 기반 `minHeight` 적용; shell/surface `min-height:0` 보존
  - `layoutMode='desktop-overlay-floor'`에서만 Test choices↔meta, Blog subtitle↔meta+CTA 사이 단일 flex spacer 적용
  - lower-row 포함 non-target top/height/bottom isolation, baseline freeze/release 상태모델, clipping 금지 보존
- **Exclude:** mobile expanded, Blog behavior / direct navigation, unrelated transition/storage/telemetry/routing/test-entry behavior, motion, BQ-25 arrow optical correction, Wave 16 global tokens, visual baseline regeneration / `npm run qa:visual:full`.
- **Deferred:** BQ-25 arrow optical correction and Wave 16 global token work. BQ-07 baseline regeneration remains deferred.
- **Prereqs:** Wave 4-W5 완료; `docs/plans/2026-06-02-expanded-height-floor.md` 검토; Logic Improvement Analysis gate cleared
- **Risk:** High
- **Gates/Validation:** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` green; full `tests/e2e/grid-smoke.spec.ts` 18/18 green; functional-only `tests/e2e/state-smoke.spec.ts` 13/13 green; `git diff --check` clean. Expanded ≥ same-row Normal height geometry, lower-row isolation, B4 `surfaceMinHeight==='0px'` 보존 확인.
- **BQ refs:** BQ-12, BQ-19, BQ-24, BQ-25, BQ-07
- **Completion note:** `src/features/landing/grid/baseline-manager.ts`, `use-grid-geometry-controller.ts`, `landing-catalog-grid.tsx`, `landing-grid-card.tsx`, `tests/e2e/grid-smoke.spec.ts`, `tests/unit/landing-baseline-manager.test.ts`를 갱신했다. Completed solution은 resting-cell 높이를 explicit pixel floor로 측정·전달하고 desktop overlay body에만 floor와 single flex spacer를 적용한다.
- **Handoff:** Wave 7 Blog behavior.

### Wave 7 — Blog direct navigation behavior

- **Status:** ✅ 완료
- **Goal:** Blog 카드를 Expanded / Read more CTA 경로가 아니라 Normal card whole-card trigger(`<Link>`)에서 직접 article navigation을 시작하도록 재배선한다.
- **Include:**
  - Blog-level semantic `<Link>` / whole-card navigation trigger
  - Blog Expanded render branch 제거: `ExpandedBlogBody`, `ExpandedBlogSubtitleContinuity`, Blog `primaryCTA(Read more)`, Blog subtitle split/plumbing 제거
  - Blog requested expanded state를 Normal로 강제하고 desktop/mobile expanded/transient shell은 Test card 전용으로 제한
  - `use-landing-interaction-controller.ts` Blog branch: modifier/middle-click passthrough, normal click/tap은 existing `beginBlogTransition` path로 진입 후 landing visual lock
  - `use-hover-intent-controller.ts` / `use-card-keyboard-handler.ts` Blog gate: hover/focus는 기존 Test expanded를 collapse하되 Blog를 expand하지 않음
  - mobile Blog tap direct navigation; Blog never enters `use-mobile-card-lifecycle`
  - `src/features/transition/**` unchanged; existing `beginBlogTransition` / `beginLandingTransition` / storage / telemetry side effects reused
- **Exclude:**
  - Blog visual CTA styling / tag-row `Read more →` label / desktop hover reveal / mobile always-visible CTA(Wave 8)
  - transition runtime/storage/telemetry redesign
  - Test card expansion/answer behavior, unavailable behavior
  - `src/features/transition/**`, `src/features/landing/grid/use-mobile-card-lifecycle.ts`, `src/app/globals.css`, theme-token work
  - visual baseline regeneration / `npm run qa:visual:full` / snapshot updates
- **Deferred:**
  - Wave 8 owns Blog normal/active visual affordance.
  - `tests/e2e/theme-matrix-manifest.json` stale Blog-expanded entries remain Ask-First + BQ-07 deferred.
  - Broader stale `docs/req-landing.md` §1.3 / §8.5 prose deferred unless scope is reopened.
- **Prereqs:** Wave 2 완료; controller coupling 확인; Wave 7 BQ-19 Analysis + implementation plan gate authorization confirmed
- **Risk:** High
- **Gates/Validation:** `npm run lint`, `npm run typecheck`, `npm test`(73 files / 484 tests), `npm run build` green; Wave 7 targeted E2E slice 17/17 green; `git diff --check` clean before roadmap update. Full `npm run test:e2e:smoke` was not green due mainly to deferred visual/theme-matrix baseline debt and stale Blog-expanded manifest states; non-visual consent/grid failures passed when rerun individually.
- **BQ refs:** BQ-02, BQ-07, BQ-12, BQ-19
- **Completion note:** `landing-grid-card.tsx` now renders Blog primary trigger as `<Link href={buildLocalizedPath(RouteBuilder.blogArticle(card.variant), locale)} data-slot="primaryTrigger">`; Test/unavailable triggers remain buttons. Blog Expanded subtree and CTA were removed, Blog whole-card activation reuses existing transition path, modified/middle-click pass through, and `<Link>` receives `aria-label={card.title}`. Post-review fixed Test→Blog hover collapse reason to preserve standard close motion.
- **Handoff:** Wave 8 Blog normal/active visual without reintroducing Blog Expanded behavior.

### Wave 8 — Blog normal/active visual

- **Status:** ✅ 완료
- **Goal:** Blog 카드를 Expanded/CTA 재도입 없이 Normal whole-card link 위에 시각 affordance와 active skin만 얹는다.
- **Include:** no `READ` eyebrow, `Read more →` in tag row, desktop hover reveal, mobile always visible.
- **Exclude:** GNB/mobile menu, logic/state/routing/storage/telemetry/i18n changes, global token mutation.
- **Deferred:**
  - `tests/e2e/theme-matrix-manifest.json` stale Blog-expanded entries remain deferred(Ask-First + BQ-07).
  - Visual baselines / Safari/theme-matrix snapshots remain deferred under BQ-07.
  - Broader stale `docs/req-landing.md` §1.3 / §8.5 prose remains Wave 14 scope per approved Wave 8 plan.
- **Prereqs:** Wave 7 완료; Logic Improvement Analysis gate cleared
- **Risk:** Medium
- **Gates/Validation:** `npm run lint`, `npm run typecheck`, `npm test`(73 files / 485 tests), `npm run build` green; full `tests/e2e/grid-smoke.spec.ts` 21/21 green in preview mode with one worker; Browser checks confirmed mobile Read-more opacity `1` / `primaryCTA=0` and desktop hover single-edge sage border + `rgba(92, 142, 120, 0.22)` glow + opacity `1`.
- **BQ refs:** BQ-02, BQ-07, BQ-19, BQ-21
- **Completion note:** `landing-grid-card.tsx` renders Blog collapsed-face `copy.readMore` as non-interactive `data-slot="blogReadMore"` span with `aria-hidden="true"` and no `tabindex`/`primaryCTA`. `landing-grid-card.module.css` adds scoped `--blog-hover-*` tokens and fine-pointer media-gated hover skin. `docs/design/design.md` and `docs/req-landing.md` were synced for the whole-card-link visual contract.
- **Handoff:** Wave 9 unavailable.

### Wave 9 — Unavailable behavior and visual

- **Status:** ✅ 완료
- **Goal:** 비활성 카드 동작 및 시각 처리.
- **Include:**
  - no hover/click/tap
  - `tabIndex=-1`, keyboard-skipped, HOVER_LOCK non-target
  - `--surface-soft` surface, standard coming-soon tag in tags-row(always visible, no dashed pill, no dot)
  - subtle thumbnail dim(0.72), full-opacity title/subtitle
  - fixture cleanup for `creativity-profile`
- **Exclude:** Test/Blog behavior, visual baseline regeneration, global unavailable token cleanup.
- **Deferred:**
  - `expanded-focus-shell.png` snapshot remains deferred under BQ-07.
  - legacy global `--unavailable-*` tokens in `src/app/globals.css` are dead and deferred to Wave 16 cleanup.
- **Prereqs:** Wave 2-Wave 3 완료; Logic Improvement Analysis gate cleared
- **Risk:** Medium; D1 keyboard/a11y change is treated as High-Risk and requires Playwright regression coverage.
- **Gates/Validation:** `npm run lint`, `npm run typecheck`, `npm test`(488), `npm run build` green; registry regeneration + `registry-serializer`/`landing-data-contract` green; `scripts/qa/check-variant-registry-contracts.mjs`, `check-variant-only-contracts.mjs`, `check-phase5-card-contracts.mjs` green; Wave E2E `a11y-smoke` + `state-smoke` + `grid-smoke` green in preview `--workers=1`; no baseline regeneration.
- **BQ refs:** BQ-07, BQ-10, BQ-19, BQ-26
- **Completion note:** `resolveCardTabIndex(state, variant, enterable)` returns `-1` for unavailable in all states, and `resolveAdjacentEnterableCardVariant` skips unavailable during keyboard handoff. `UnavailableCardStatusOverlay` / `data-slot="unavailableOverlay"` were removed; `coming soon` became a standard visible tag. `creativity-profile` title suffix and duplicate coming-soon tag were removed while preserving `attribute:unavailable` and consumer shape. Updated paths include landing interaction/model/card files, `src/features/variant-registry/source-fixture.ts`, generated registry, `src/messages/en.json`, unit/E2E tests, `scripts/qa/check-phase5-card-contracts.mjs`, `docs/req-landing.md`, `docs/design/design.md`, `docs/agent-guides/project-rules.md`, `docs/wave-roadmap.md`, `docs/decision-register.md`.
- **Handoff:** Wave 10 grid rhythm.

### Inter-wave Reconciliation — Visual Reconciliation R1 (rev4 catalog) + Claude Design SSOT 단일화

- **Status:** ✅ 완료
- **Position:** Wave 9 ↔ Wave 10. Wave 번호 밖 정합 작업이며 Wave 번호를 밀지 않는다.
- **Goal:** 잠금된 rev4 카탈로그 시각 결정으로 `docs/design/design.md`를 재정합하고 완료된 Wave 1-Wave 9 카드 시각 표면을 그 기준에 맞춘다. 동시에 Claude Design의 CLAY 기반 `design.md`를 코드베이스본으로 단일화한다.
- **Include:**
  - R1-V-01 / BQ-27: resting Test/Blog/Unavailable card border `transparent` → `1px solid --hairline`(`#E6E2D8`)
  - R1-V-02 / BQ-28: shared tag chip fill `#F0ECE2` → `--surface-muted`(`#ECE8DF`) + `1px solid --hairline-strong`(`#D6D1C4`), radius 5/nowrap/ellipsis/no-dot preserved
  - R1-V-03 / BQ-28 casing: case-bearing locales(`de,en,es,fr,id,pt,ru`) `comingSoon` and `getDefaultCardCopy()` lowercase; caseless locales byte-identical; no CSS `text-transform`
  - R1-V-04: Normal resting surface `#fff`, title `-0.01em`, subtitle 15/400/1.45/`--body`, clamp unchanged
  - R1-V-05: expanded white surface + `--sage` edge + `--shadow-expanded`; context/meta scoped contrast correction; floor/spacer/choices/continuity preserved
  - R1-V-06: Blog `Read more →` label/arrow split into explicit 6px gap visual children while preserving parent semantics
  - BQ-29: scoped expanded context/meta `#757580` temporary AA fix; global `--muted` remains deferred to Wave 16
  - `docs/design/design.md` §§4.2/4.3/4.11/5.6/6.1/6.3/6.10/7.2-7.5 재정합
  - `docs/decision-register.md` BQ-27, BQ-28, BQ-29 등재
  - Static QA adjunct: `scripts/qa/check-phase5-card-contracts.mjs` and `scripts/qa/check-phase9-performance-contracts.mjs` stale assertions updated to current architecture; product code unchanged
  - focus-shell drift confirmed as pre-existing BQ-07 frozen baseline debt
- **Exclude:**
  - behavior/logic changes: resolver/controller/hooks/storage/telemetry/transition/routing/test-entry/state/a11y logic 보존
  - `src/app/globals.css` and global token promotion(Wave 16)
  - visual baseline regeneration / `npm run qa:visual:full`
  - Wave 10 grid target implementation; BQ-30 tag treatment follow-up; W13 mobile expand; BQ-23 hero; BQ-25 arrow nudge
- **Deferred:**
  - BQ-31 mockup review targets to Wave 10
  - BQ-30 tag border removal + unavailable darker fill to Wave 10
  - BQ-29 global muted correction and scoped exception removal to Wave 16
  - BQ-07 visual baseline regeneration remains deferred
- **Prereqs:** Wave 1-Wave 9 완료; R1 rev4 decisions locked
- **Risk:** Medium — visual + SSOT/QA reconciliation; runtime behavior impact low, process/documentation impact Medium.
- **Gates/Validation:** `lint`/`typecheck`/`test`(490)/`build` green; static phase 4/6/7/8/10 green; phase 5/9 green after QA adjunct; functional non-baseline E2E 68 green; `git diff --check` clean; commit completed.
- **BQ refs:** BQ-07, BQ-21, BQ-27, BQ-28, BQ-29, BQ-30, BQ-31
- **Completion note:** Updated `docs/design/design.md`, `docs/decision-register.md`, `src/features/landing/grid/landing-grid-card.module.css`, `landing-grid-card.tsx`, `src/messages/{de,en,es,fr,id,pt,ru}.json`, `getDefaultCardCopy()`, `tests/unit/landing-card-contract.test.ts`, `tests/unit/landing-message-labels.test.ts`, `tests/e2e/grid-smoke.spec.ts`, `scripts/qa/check-phase5-card-contracts.mjs`, `scripts/qa/check-phase9-performance-contracts.mjs`, and related R1 analysis/plan docs.
- **Handoff:** Wave 10 grid height rhythm uses BQ-31 visual targets and BQ-30 tag treatment through BQ-19 analysis.

### Wave 10 — Landing grid height rhythm

- **Status:** ✅ 완료
- **Goal:** 콘텐츠 기반 카드 높이와 행 리듬을 안정화하고, 반응형 태그/CTA 배치와 확장 폭을 일관되게 정리한다.
- **Include:** content-driven height, measured row compensation, bottom-anchored tags/CTA, responsive subtitle clamp, constrained desktop expansion, BQ-30/BQ-31/BQ-32.
- **Exclude:** Wave 6 expanded overlay internals, transition/telemetry/routing/storage behavior, GNB/theme cleanup, visual baseline regeneration, second Normal-floor map, CSS auto-spacer mechanism.
- **Deferred:**
  - BQ-07: `expanded-focus-shell.png` stale baseline remains frozen; do not regenerate in Wave 10.
  - Mobile browse visual polish and final mobile CTA presentation remain Wave 12; Wave 12 must not introduce a second tag-hiding implementation.
  - Wave 16: global token promotion, Pretendard migration, global muted correction, scoped token exception removal.
  - BQ-25 arrow optical nudge remains forbidden before Wave 16.
- **Prereqs:** Waves 2-Wave 9 완료; Logic Improvement Analysis gate cleared
- **Risk:** High
- **Gates/Validation:** `npm run lint`, `npm run typecheck`, `npm test`(496), `npm run build` green; phase 4/5/6/7/8/10 QA and Wave 10 unit regression green; non-baseline grid/state/a11y geometry and 12-locale tag-fit/overflow checks complete.
- **BQ refs:** BQ-19, BQ-21, BQ-24, BQ-25, BQ-30, BQ-31, BQ-32, BQ-07
- **Completion note:** W10-LI-01-W10-LI-06 approved and applied. Settled Normal measurement now uses `ResizeObserver`/RAF/font-ready invalidation while preserving the existing `base_gap + comp_gap` row compensation and keeping BQ-24 Expanded floor separate. BQ-32 visible-prefix uses a 56px tail minimum, right-side suffix unmount, Blog CTA priority, resize reappearance, and Test/Blog/Unavailable shared rules. Desktop desired expansion is measured `1.10`, Tablet is `1.04`, reduced motion is `1.00`. Fixed root `min-h-44` was removed, Desktop/Tablet subtitle remains two-line ellipsis, Mobile subtitle is full text, and BQ-30 borderless tags use available `#ECE8DF` / unavailable `#E6E2D8`.
- **Files / QA touched:** `src/features/landing/grid/spacing-plan.ts`, `layout-plan.ts`, `use-card-inline-geometry.ts`, `use-grid-geometry-controller.ts`, `landing-catalog-grid.tsx`, `landing-grid-card.tsx`, `landing-grid-card.module.css`, `tests/unit/landing-spacing-plan.test.ts`, `tests/unit/landing-grid-plan.test.ts`, `tests/unit/landing-card-contract.test.ts`, `tests/e2e/grid-smoke.spec.ts`, `tests/e2e/state-smoke.spec.ts`, `tests/e2e/a11y-smoke.spec.ts`, `scripts/qa/check-phase4-grid-contracts.mjs`, `scripts/qa/check-phase5-card-contracts.mjs`, `scripts/qa/check-phase6-spacing-contracts.mjs`, `docs/req-landing.md`, `docs/design/design.md`, `docs/decision-register.md`, `docs/plans/2026-06-09-wave-10-landing-grid-plan.md`.
- **Handoff:** Wave 11 accessibility hardening; Wave 12 mobile browse may visually validate shared mobile browse presentation without replacing BQ-32 logic.

### Wave 11 — Landing desktop a11y/keyboard hardening

- **Status:** ✅ 완료
- **Goal:** Desktop/Tablet 카드의 키보드 탐색, disclosure ARIA, focus lifecycle을 결정적으로 정리한다.
- **Include:**
  - Test immediate focus expansion regardless of capability, with pointer-intent cancellation
  - Blog enterable/focus-only and never expandable
  - Test trigger `Enter/Space` idempotent `CARD_EXPAND`; Test entry A/B-only
  - controller-owned Escape/focus-out close, closing focus safety, true focus-out destination preservation, pure window blur disclosure preservation
  - document-wide non-hidden `[role="dialog"]` top-overlay precedence for settings Escape
  - 12-locale stable Test accessible name, logical trigger `aria-expanded` and stage `aria-hidden`
  - unavailable button-only disabled/name/status ownership and `tabIndex=-1`; remove hard-coded tags `aria-label`
  - expanded focus-visible scoped 2px sage outline + 2px offset
- **Exclude:** mobile expanded shape, GNB internals, transition/telemetry/storage/routing/registry/test-entry, Wave 13 keyboard traceability, Wave 15 overlay re-scope, Wave 16 global token migration.
- **Deferred:** BQ-07 snapshot/baseline regeneration remains deferred. Wave 13 owns mobile expanded shape/title-continuity follow-up.
- **Prereqs:** Waves 4-Wave 10 완료; Logic Improvement Analysis gate cleared
- **Risk:** High
- **Gates/Validation:** `npm run lint`, `npm run typecheck`, `npm test`(515/515), `npm run build` PASS; focused unit 62/62 PASS; filtered preview Wave 11 E2E 10/10 PASS; Phase 4-10 PASS.
- **BQ refs:** BQ-12, BQ-19, BQ-21, BQ-24, BQ-25, BQ-26, BQ-33, BQ-07
- **Completion note:** A1-A8 and W11-LI-01-W11-LI-04 approved and applied. Runtime updates include `desktop-shell-phase.ts`, `interaction-dom.ts`, landing interaction bindings/controllers/keyboard handoff, grid/card components/styles, and interaction state. Tests updated include `tests/unit/landing-card-contract.test.ts`, `landing-desktop-shell-phase.test.ts`, `landing-interaction-controller-handlers.test.ts`, `landing-interaction-dom.test.ts`, `landing-interaction-state.test.ts`, `tests/e2e/a11y-smoke.spec.ts`, and `tests/e2e/state-smoke.spec.ts`. SSOT docs updated: `docs/decision-register.md`(BQ-33), `docs/design/design.md`, `docs/req-landing.md`, `docs/plans/2026-06-11-wave-11-desktop-a11y-keyboard-plan.md`, `docs/wave-roadmap.md`.
- **Phase 9 reconciliation:** The previous `desktopShellInlineScale` checker debt is resolved in current repo state. `scripts/qa/check-phase9-performance-contracts.mjs` now asserts `expandedScale.frameInlineScale`, `ResizeObserver` measurement paths, equality guards, and reduced-motion contracts instead of restoring removed props.
- **Handoff:** Wave 12 mobile browse.

### Wave 12 — Mobile browse card visual

- **Status:** ⬜ 계획
- **Goal:** 모바일 브라우즈 카드 시각 처리.
- **Include:** single-column browse card visual, mobile Blog CTA visibility.
- **Exclude:** mobile expanded focus state; second tag-hiding or locale-threshold implementation; Wave 13 mobile expanded shape/position.
- **Deferred:** Mobile expanded shape/position, lifecycle coupling, and B14 title-continuity fix remain Wave 13. BQ-07 visual baseline regeneration remains deferred.
- **Prereqs:** Waves 2-Wave 3, Wave 8-Wave 9 완료; Logic Improvement Analysis gate cleared. Current Wave 10/Wave 11 outcomes must be preserved.
- **Risk:** Medium
- **Gates/Validation:** mobile browse smoke; targeted landing/grid visual checks appropriate to the approved Wave 12 plan.
- **BQ refs:** BQ-19, BQ-21, BQ-31, BQ-32. No BQ-34/BQ-35 row exists in current `docs/decision-register.md`.
- **Completion note:** Not completed in current repo. Current evidence has no Wave 12 plan file, no Wave 12 commit/tag, and no BQ-34/BQ-35 decision row.
- **Handoff:** Wave 13 mobile expanded.

### Wave 13 — Mobile expanded shape/position

- **Status:** ⬜ 계획
- **Goal:** 모바일 Expanded 형태 및 위치 정의.
- **Include:** full viewport width, GNB-flush top, natural height, scrim, no side radius, B14 mobile title-continuity `test.fixme` 해제 및 재정렬.
- **Exclude:** swipe-down close, mobile menu, desktop keyboard/a11y behavior, GNB internals.
- **Deferred:** Swipe-down close remains undecided and must not be included without a separate decision.
- **Prereqs:** Wave 12 완료; lifecycle coupling 조사 완료; Logic Improvement Analysis gate cleared.
- **Risk:** High
- **Gates/Validation:** mobile lifecycle smoke, scroll lock check.
- **BQ refs:** BQ-11, BQ-16, BQ-19, Wave 1 B14 deferred marker.
- **Completion note:** Not completed.
- **Handoff:** Wave 14 regression fixes.

### Wave 14 — Landing-only regression stabilization

- **Status:** ⬜ 계획
- **Goal:** 랜딩 한정 회귀 안정화.
- **Include:** fixes required by landing waves only — card/grid/a11y/routing regressions.
- **Exclude:** product pipeline, GNB/theme, visual baseline.
- **Deferred:** BQ-07 visual baseline approval/regeneration remains outside this wave unless separately approved.
- **Prereqs:** Waves 1-Wave 13 완료; Logic Improvement Analysis gate cleared.
- **Risk:** Medium
- **Gates/Validation:** Basic gates; targeted E2E suggestions based on approved regression scope.
- **BQ refs:** BQ-07, BQ-12, BQ-19, BQ-21.
- **Completion note:** Not completed.
- **Handoff:** Wave 15 GNB visual.

### Wave 15 — Desktop GNB visual shell

- **Status:** ⬜ 계획
- **Goal:** 데스크톱 GNB 시각 셸 구성.
- **Include:** static `English / ☀` pill visual, no gear/hamburger desktop.
- **Exclude:** functional locale/theme switching, landing card behavior, mobile menu overlay.
- **Deferred:** Functional locale/theme switching remains outside this visual shell wave.
- **Prereqs:** Landing waves stable; Logic Improvement Analysis gate cleared.
- **Risk:** High
- **Gates/Validation:** gnb smoke, routing smoke.
- **BQ refs:** BQ-03, BQ-19, BQ-21.
- **Completion note:** Not completed.
- **Handoff:** Wave 16 theme cleanup.

### Wave 16 — Light-only theme cleanup

- **Status:** ⬜ 계획
- **Goal:** 라이트 테마 단일화 정리 + scoped 시각 토큰의 전역 통합.
- **Include:**
  - light-first visible state cleanup; dark/system controls not active
  - Scoped visual-token consolidation: `landing-grid-card.module.css`의 `--normal-*` / `--expanded-*` scoped tokens를 `src/app/globals.css`의 warm-neutral / sage / Pretendard semantic namespace로 승격·통합하고 component-side duplicate declarations를 제거
  - BQ-29: system-wide `--muted` AA contrast correction so all light-surface normal text is ≥4.5:1; remove R1's temporary scoped `#757580` expanded-card exception
  - Token parity check against `docs/design/design.md §5` and `docs/agent-guides/project-rules.md §Visual-Design`
- **Exclude:** result pipeline, baseline regeneration, functional dark/system activation unless separately approved.
- **Deferred:** BQ-25 arrow optical nudge is evaluated only after Pretendard transition; do not nudge before this wave. BQ-07 visual baselines remain separate approval.
- **Prereqs:** Wave 15 완료; `theme-bootstrap` risk plan; W3/W5 이후 도입된 scoped token inventory + `docs/design/design.md §5` value parity 확인 완료.
- **Risk:** High
- **Gates/Validation:** theme matrix smoke suggestion only; before/after visual identity screenshot function checks and token parity verification.
- **BQ refs:** BQ-04, BQ-19, BQ-21, BQ-25, BQ-29, BQ-30.
- **Completion note:** Not completed.
- **Handoff:** Wave 17 mobile menu.

### Wave 17 — Mobile menu overlay visual

- **Status:** ⬜ 계획
- **Goal:** 모바일 메뉴 오버레이 시각 구성.
- **Include:** full-screen overlay visual, language/theme display shell.
- **Exclude:** functional locale/theme switching, dark/system activation.
- **Deferred:** Functional locale/theme switching and dark/system activation remain outside this visual shell wave unless separately approved.
- **Prereqs:** Wave 15-Wave 16 완료; Logic Improvement Analysis gate cleared.
- **Risk:** High
- **Gates/Validation:** gnb mobile smoke, a11y smoke.
- **BQ refs:** BQ-03, BQ-04, BQ-19, BQ-21.
- **Completion note:** Not completed.
- **Handoff:** 이후 별도 승인 범위.
