# Wave Roadmap

## Wave Overview

| Wave | Purpose | Prerequisites | Risk | Status |
| ---: | ------- | ------------- | ---- | ------ |
| 1 | Landing card render seam isolation + Normal order alignment + motion-ready internal seams | Codex investigation reports reviewed + BQ-08 approved + Logic Improvement Analysis gate cleared | Medium | ✅ 완료 |
| 2 | Normal card structural order verification and Wave 3 readiness | Wave 1 + Logic Improvement Analysis gate cleared | Medium | ✅ 완료 |
| 3 | Normal card visual skin | Wave 2 + Logic Improvement Analysis gate cleared | Medium | ✅ 완료 |
| 4 | Expanded test content contract | Wave 1 + Logic Improvement Analysis gate cleared | High | ✅ 완료 |
| 5 | Expanded test visual skin; motion implementation candidate if separately approved | Wave 4 + Logic Improvement Analysis gate cleared | Medium | ✅ 완료 |
| 6 | Desktop expanded overlay sibling isolation; motion implementation candidate if separately approved | Wave 4–5 + Logic Improvement Analysis gate cleared | High | ✅ 완료 |
| 7 | Blog direct navigation behavior via whole-card trigger | Wave 2 + controller coupling 확인 + Logic Improvement Analysis gate cleared | High | ✅ 완료 |
| 8 | Blog normal/active visual | Wave 7 + Logic Improvement Analysis gate cleared | Medium | ⬜ 미완료 |
| 9 | Unavailable behavior and visual | Wave 2–3 + Logic Improvement Analysis gate cleared | Medium | ⬜ 미완료 |
| 10 | Landing grid height rhythm | Wave 2–9 + Logic Improvement Analysis gate cleared | High | ⬜ 미완료 |
| 11 | Landing desktop a11y/keyboard hardening | Wave 4–10 + Logic Improvement Analysis gate cleared | High | ⬜ 미완료 |
| 12 | Mobile browse card visual | Wave 2–3, 8–9 + Logic Improvement Analysis gate cleared | Medium | ⬜ 미완료 |
| 13 | Mobile expanded shape/position | Wave 12 + lifecycle coupling 조사 + Logic Improvement Analysis gate cleared | High | ⬜ 미완료 |
| 14 | Landing-only regression stabilization | Wave 1–13 + Logic Improvement Analysis gate cleared | Medium | ⬜ 미완료 |
| 15 | Desktop GNB visual shell | Landing waves stable + Logic Improvement Analysis gate cleared | High | ⬜ 미완료 |
| 16 | Light-only theme cleanup + scoped visual-token consolidation | Wave 15 + theme-bootstrap risk plan | High | ⬜ 미완료 |
| 17 | Mobile menu overlay visual | Wave 15–16 + Logic Improvement Analysis gate cleared | High | ⬜ 미완료 |

### Inter-wave completed checkpoints

Wave 번호 체계 밖에서 진행된 정합 작업이며, Wave 번호를 밀지 않는다.

| Checkpoint | Position | Purpose | Status |
| --- | --- | --- | --- |
| BQ-21 design authority + W1–W5 visual reconciliation | Wave 5 ↔ Wave 6 | `docs/design/design.md`를 시각 SSOT로 확정하고 구현된 Wave 1–5를 현재 Claude Design 기준·운영 모델에 재정합 | ✅ 완료 |

상세는 Wave Details의 "Inter-wave Reconciliation — BQ-21 design authority and W1–W5 visual reconciliation" 항목 참조.

---

## Global Gate — Logic Improvement Analysis (BQ-19)

Every wave follows a mandatory two-step sequence. No implementation prompt may be issued until both steps are complete.

**Step 1 — Analysis Only**

Issue an Analysis-Only Coding Agent task for the wave scope. The report must cover each improvement candidate:

| Field | Content |
|---|---|
| Layer | state / hooks / routing / storage / telemetry / i18n |
| Change magnitude | Low / Medium / High |
| Improvement value | Rated against criteria 1–5 (Modern React patterns → a11y logic) |
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
- **Purpose:** `landing-grid-card.tsx` 내부 render branch/slot 책임을 분리하고, Normal face 정보 순서를 Claude Design 기준(`Thumbnail → Title → Subtitle → Tags`)으로 정렬하며, 후속 motion 적용을 위한 internal seam을 준비한다.
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
  - W1-LI-03: geometry/sibling isolation이 필요하면 Wave 6으로 defer하고 stop/report
- **구현 결과:**
  - 생성된 seam 헬퍼: `NormalCardFace`, `NormalCardTitle`, `NormalCardThumbnail`, `NormalCardSubtitle`, `NormalCardTagRow`, `ExpandedTestBody`, `ExpandedBlogBody`, `UnavailableCardStatusOverlay`, `DesktopExpandedShell`
  - Normal card visible order `cardTitle → cardThumbnail → cardSubtitle → tags` → `cardThumbnail → cardTitle → cardSubtitle → tags` 변경 완료
  - Expanded Test/Blog body: `resolveTestPreviewPayload`를 통한 preview payload 접근 유지, typed helper로 분리
  - Desktop expanded shell markup `DesktopExpandedShell` 뒤로 이동; Unavailable overlay `UnavailableCardStatusOverlay` leaf helper로 분리
  - B14 mobile title-continuity 단언: thumbnail-first Normal order로 인한 Normal title 위치 이동으로 `test.fixme(...)` 처리 → Wave 13 이연
  - `resolver`, `transition`, `telemetry`, event handler, ARIA, `data-slot` contract 전면 보존 확인
- **Prerequisites:** Wave 1 Investigation Report, Wave 1 Logic Improvement Analysis, Wave 1 Motion-Ready Seam Investigation 검토 완료; BQ-08 승인; Logic Improvement Analysis gate cleared
- **Validation / tests:** `landing-card-contract.test.ts` 및 `grid-smoke.spec.ts` — Normal slot 순서 단언 갱신 완료; `transition-telemetry-smoke.spec.ts` — B14 mobile title-continuity Wave-13 pending marker 추가; `git diff --check` clean
- **Risk:** Medium
- **Handoff:** Wave 2에서 Normal order verification 및 Wave 3 visual skin readiness 확인. Actual motion은 Wave 5/6 candidate로 handoff

### Wave 2 — Normal card structural order verification and Wave 3 readiness

- **Status:** ✅ 완료
- **Purpose:** revised Wave 1에서 반영된 Normal face 구조 순서(`Thumbnail → Title → Subtitle → Tags`)의 회귀 여부를 확인하고, Wave 3 visual skin 적용 전 구조 안정성을 확정한다.
- **Include:**
  - revised Wave 1 결과의 Normal order 검증
  - Wave 1에서 업데이트된 card contract tests / QA anchors 검토
  - Wave 3 visual skin 적용 전에 필요한 Normal face 구조 결함 수정
  - 단, 수정은 Wave 1 Normal order alignment의 fallout에 한정
- **Exclude:**
  - 새로운 visible order 변경
  - visual token, hover skin, border, shadow, radius, thumbnail treatment
  - Blog direct navigation
  - Unavailable behavior
  - actual motion
  - mobile/GNB/theme/result/baseline
- **구현 결과:**
  - `NormalCardFacePresentation = 'collapsed' | 'expandedTitleOnly'` 타입 추가; 데스크톱 expanded title-only 렌더를 `NormalCardFace` seam으로 라우팅하여 Wave 1 이후 남은 seam 소유권 갭 해소
  - `data-slot="cardTitle"` (normal-title 클래스 + `normalTitleRef`) output identity 보존 확인; expanded title-only 소유권 단언 강화
  - `check-variant-only-contracts.mjs` QA anchor 텍스트 갱신: `includeSlotAttributes` → `exposePublicSlot`
  - `docs/req-landing.md` Normal order 표기 `cardThumbnail → cardTitle → cardSubtitle → tags` 로 동기화
  - Wave 2/3 handoff용 design reference 및 plan 문서 추가 (`docs/design/**`, `docs/plans/**`)
  - `docs/design/resources/assets/vive-logo.svg` trailing whitespace 발생 — 기능 무영향, 미수정 상태로 기록
  - `NormalCardGhostBody` 및 public slot 노출 메커니즘 변경 없음
- **Prerequisites:** Wave 1 완료; Logic Improvement Analysis gate cleared
- **Validation / tests:** card contract unit — expanded title-only 소유권 단언 강화; grid smoke; a11y smoke; `git diff --check` clean (vive-logo.svg trailing whitespace 제외)
- **Risk:** Medium
- **Handoff:** Wave 3 visual skin

### Wave 3 — Normal card visual skin

- **Status:** ✅ 완료
- **Purpose:** Normal 카드 시각 스타일 적용
- **Include:** resting/hover/focus border, shadow, radius, thumbnail treatment, tags compact style
- **Exclude:** Expanded, Blog behavior, unavailable no-op
- **구현 결과:**
  - `landing-grid-card.module.css`에 scoped `--normal-*` 토큰 도입: 카드 border/shadow, focus ring, thumbnail radius, tag background/ink/radius
  - Collapsed focus rule: sage outline 지정, `.desktopOverlayLayer` 명시 제외 (desktop expanded overlay focus rule 별도 유지)
  - Thumbnail radius: `--normal-thumb-radius` 전환
  - Tags: gap 확장 + compact chip styling (scoped background/ink/radius 토큰)
  - Resting card: `--normal-card-shadow` + transparent scoped border
  - `landing-grid-card.tsx` render-logic 및 public slot 변경 없음
  - 전역 theme token 변경 없음 — scoped Normal skin으로 의도적 격리
  - baseline 재생성 및 `qa:visual:full` 미실행 — Wave 14/16에서 처리
- **Prerequisites:** Wave 2 완료; Logic Improvement Analysis gate cleared
- **Validation / tests:** `lint`, `typecheck`, `test`, `build` green; `grid-smoke.spec.ts` 18/18 통과; `git diff --check` clean; visual review 및 a11y focus check 완료
- **Risk:** Medium
- **Handoff:** Wave 4 expanded content

### Wave 4 — Expanded test content contract

- **Status:** ✅ 완료
- **Purpose:** Expanded 카드 콘텐츠 계약 정의
- **Include:** thumbnail/subtitle/tags 제거, question prominence, no label, no A/B badge, text+arrow
- **Exclude:** overlay geometry, sibling isolation, mobile shape
- **구현 결과:**
  - `ExpandedTestAnswerChoice` 헬퍼 추가; choice layout `flex items-start gap-3` 변경
  - Expanded Test preview question: `21px`, semibold, strong ink, tighter tracking, free wrapping
  - Answer choice: answer text + decorative `aria-hidden` `→` arrow; text/arrow에 별도 class hook 부여
  - `data-slot=answerChoiceA/B`, click handler, `tabIndex`, `aria-hidden`, resolver payload boundary, motion slot 전면 보존
  - choice visual skin, meta labels/numbers, overlay geometry, sibling isolation, mobile shape, resolver, telemetry, storage, i18n, baseline 미포함
  - 기존 `state-smoke` screenshot baseline 2건 발산 확인 — BQ-07 범위 외로 미재생성, 기록만 유지
- **Prerequisites:** Wave 1 완료; Logic Improvement Analysis gate cleared
- **Validation / tests:** `landing-card-contract.test.ts` — decorative arrow presence/ARIA 단언 추가; `grid-smoke.spec.ts` 18/18 green; state-smoke 기능 체크 green; `git diff --check` clean
- **Risk:** High
- **Handoff:** Wave 5 expanded visual

### Wave 5 — Expanded test visual skin

- **Status:** ✅ 완료
- **Purpose:** Expanded 카드 시각 스타일 적용
- **Include:** choice button wrapping, equal padding, meta row `completed`, full number display
- **Exclude:** transition/storage behavior
- **Motion candidate:** Expanded content-only motion may be evaluated here only after separate approval. Wave 1 may prepare motion-ready internal seams, but Wave 5 must not assume actual motion is automatically approved.
- **구현 결과:**
  - `landing-grid-card.module.css`에 scoped `--expanded-*` 토큰 도입: question ink, choice surface/border/ink, arrow ink, sage accent, sage hover surface
  - Expanded question color: warm `--expanded-question-ink` 적용
  - Choice button: warm/sage styling (warm border/surface, sage hover border/background, sage focus outline), `px-3.5 py-3`, hover box-shadow 없음
  - Choice text: `15px`, normal weight, warm ink, `keep-all/anywhere` wrapping
  - Arrow: warm muted → group-hover sage 전환
  - `metaAttempts` 값 `"Completed"` 변경 — `getDefaultCardCopy` 및 12개 locale message 파일 일괄 적용, key 보존
  - `gnb-smoke.spec.ts`: GNB hover affordance와 landing answer-choice hover style equality 단언 분리
  - `state-smoke.spec.ts`: hover box-shadow 무변화 기대값 반영; rested choice 상태 샘플링 전 180ms 대기 추가
  - answer-choice handler, storage/telemetry/transition behavior, `data-slot` 명칭, focus order, decorative arrow behavior 전면 보존
  - 이연된 screenshot baseline: `expanded-focus-shell.png`, `overlay-focus-shell.png` — Wave 14 baseline wave에서 처리
- **Prerequisites:** Wave 4 완료; Logic Improvement Analysis gate cleared
- **Validation / tests:** `lint`, `typecheck`, `test`, `build` green; `grid-smoke.spec.ts` 18/18; `gnb-smoke.spec.ts` 23/23; state-smoke 기능 체크 green (기존 parallel-worker contention 케이스 1건 기록); `git diff --check` clean
- **Risk:** Medium
- **Handoff:** Wave 6 overlay behavior. 단, Wave 6 진입 전 Wave 5↔6 사이에 BQ-21 design.md 시각 권위 확정 + W1–W5 visual reconciliation(아래 Inter-wave Reconciliation 항목)이 먼저 완료되었다

### Inter-wave Reconciliation — BQ-21 design authority and W1–W5 visual reconciliation

- **Status:** ✅ 완료
- **Position:** Wave 5(`571eb0c`) 완료 후 ~ Wave 6 구현 전. Wave 번호 체계 밖의 inter-wave 정합 작업이며 Wave 번호를 변경하지 않는다.
- **Commits:** 2-commit 시퀀스 — `cc78257`(design authority 선언 + design.md 재구성) → `f3acb9f`(승인된 W1–W5 reconciliation 구현 적용).
- **Purpose:** `docs/design/design.md`를 시각 단일 출처(SSOT)로 확정하고(BQ-21), 이미 구현된 Wave 1–5 결과를 현재 Claude Design 기준과 운영 모델에 재정합한다. 특정 wave 구현이 아니라 wave 사이의 시각 권위·정합성 정리 작업이다.
- **Scope / Include:**
  - **Design authority 선언(BQ-21):** `docs/design/design.md`를 VIVE/ViveTest design-system foundation + ViveTest catalog application layer로 운용하는 시각 SSOT로 확정. 위치를 `docs/design/design.md`로 고정.
  - **Visual precedence 정리:** 시각 방향은 `design.md`, product behavior(행위·scope·QA·routing·telemetry·storage·i18n·test-flow·a11y)는 requirements/decision-register/roadmap/repo가 계속 지배. 충돌 우선순위 `decision-register.md` → product requirements/active rules → `design.md` → patterns/application layer → mockup resources → 기존 구현 evidence → wave-specific CSS(예외 한정). `AGENTS.md §2` 및 `project-rules.md §Visual-Design`에 명문화.
  - **운영 원칙:** per-wave CSS 추출은 기본 시각 입력에서 퇴역. 보충 CSS는 BQ-19 Analysis gate가 design.md 공백을 입증·승인한 경우에만 예외 발행. Wave가 신규 시각 결정을 확정하면 wave-specific CSS가 아니라 `design.md`(patterns/application layer)에 환류.
  - **Superseded reference CSS 이동:** `wave3-normal-card-reference.css`, `wave4-expanded-test-content-reference.css`, `wave5-expanded-test-visual-skin-reference.css`를 `docs/design/resources/superseded/`로 이동(R100, 내용 무변화).
  - **CLAY/VIVE design-system 문서화:** `design.md`를 CLAY 구조 기반·VIVE 적응형 design-system 문서로 재구성·확장(foundations, tokens, components, application guidance). superseded 원본은 `docs/design/resources/superseded/design.md`로 보존.
  - **W1–W5 reconciliation 반영(BQ-22):** landing thumbnail slot ratio `aspect-[6/1]` → `aspect-[16/6]` 채택. 동시에 thumbnail slot의 `mt-[var(--landing-card-base-gap)]` 제거(normal spacing 정합).
  - **qmbti thumbnail SVG 재작업(BQ-22 / RC-W1W5-03):** viewBox `600×100` → `640×240`, warm-neutral/sage palette(`#E8F0EC`, `#5C8E78`) abstract-only 구성으로 재작도.
  - **Grid smoke ratio assertion 갱신:** `cardThumbnail` ratio 단언 `>5.5 && <6.5` → `>2.4 && <2.9`. 추가로 expanded title single-line guard headroom `+1` → `+2`(design §5.1 20px/1.3 sub-pixel 흡수).
  - **Expanded meta inline row 재구성(design §6.10):** meta 행을 `label/value`(dt/dd) 구조에서 단일 점-구분 인라인 "value label" 행으로 전환(`landing-grid-card-meta-separator` ×2, `landing-grid-card-meta-value-lead`). 그 결과 12개 locale meta 라벨 카피가 leading-label에서 trailing inline-unit lowercase로 변경(`Est. time / Shares / Completed / Read time / Views` → `min / shared / completed / min read / views`). `landing-card-contract.test.ts`를 신규 markup(separator 2건 + value/label 비어있지 않음)에 맞춰 갱신. *(이 항목은 제공된 commit summary에는 없고 실제 diff에서만 확인됨 — 아래 Note 참조.)*
  - **Related docs/plans 갱신:** RC W1–W5 reconciliation analysis(BQ-19 gate) 및 implementation plan, normal spacing/title-arrow, thumbnail-abstract-only, expanded-meta-inline-row, expanded-height-floor plan 문서 추가/갱신. 임시 BQ-21 reconciliation plan(`docs/2026-05-31-bq21-design-authority-reconciliation.md`)은 `cc78257`에서 추가 후 `f3acb9f`에서 obsolete로 제거.
  - **Hygiene:** `docs/design/resources/assets/vive-logo.svg` trailing whitespace 제거; `design.md` spacing wording 소폭 조정.
- **Exclude / Preservation:**
  - 전역 theme token migration 미수행 — `globals.css` 전역 적용·namespace 정착은 Wave 16(BQ-04 gating)로 유지. design.md 전역 토큰값은 target intent.
  - High-risk runtime logic 미수정(의도적 보존): controller/hooks/storage/telemetry/transition/routing/test-entry.
  - storage / telemetry / transition / routing / test-flow / variant-registry behavior 계약 변경 없음. i18n은 meta 라벨 **카피**만 변경했고 메시지 key·구조·behavior는 보존.
  - visual baseline regeneration / snapshot 등록 / `qa:visual:full` 없음 — BQ-07 deferral 유지.
  - Wave 6 overlay isolation 구현 자체는 본 항목에 포함하지 않음(별도 Wave 6).
  - 화살표 글리프 광학 보정(BQ-25), 랜딩 hero 제거(BQ-23) 등은 후속 분리 작업으로 defer.
- **Files changed (실제 diff 기준):**
  - Design authority / docs: `AGENTS.md`, `docs/agent-guides/project-rules.md`(신규 §Visual-Design), `docs/decision-register.md`(`cc78257`: BQ-21·BQ-22 추가 + BQ-07·BQ-12 design-authority 단서 보완 / `f3acb9f`: BQ-23·BQ-24·BQ-25 추가), `docs/design/design.md`
  - Design resources / superseded assets: `docs/design/resources/superseded/design.md`(신규 보존본), `docs/design/resources/superseded/wave{3,4,5}-*-reference.css`(이동), `docs/design/resources/assets/vive-logo.svg`(hygiene)
  - Landing visual reconciliation: `src/features/landing/grid/landing-grid-card.tsx`(thumbnail ratio + meta inline row + normal spacing), `public/landing-card-media/qmbti/thumbnail.svg`
  - Tests / contracts: `tests/e2e/grid-smoke.spec.ts`, `tests/unit/landing-card-contract.test.ts`
  - i18n / messages: `src/messages/{de,en,es,fr,hi,id,ja,kr,pt,ru,zs,zt}.json`(meta 라벨 카피)
  - Plans / analysis: `docs/plans/2026-06-01-rc-w1-w5-reconciliation-analysis.md` 외 reconciliation/implementation/spacing/thumbnail/meta-inline/height-floor plan 문서; (제거) `docs/2026-05-31-bq21-design-authority-reconciliation.md`
- **Validation / tests:** test contract 동기화가 evidence로 확인됨 — `grid-smoke.spec.ts`의 ratio·single-line guard 단언과 `landing-card-contract.test.ts`의 meta inline row 단언이 신규 markup/asset에 맞춰 갱신(테스트 파일 diff). 단, 이 두 commit의 메시지/STATE에는 명시적 `lint`/`typecheck`/`test`/`build` green 로그가 기록돼 있지 않아 게이트 실행 결과는 추정하지 않는다(후속 Wave 6 commit/STATE에서 Basic Gates green이 별도 기록됨).
- **Risk:** Medium — design authority + visual asset/test-contract reconciliation. runtime behavior 영향은 낮음(High-risk logic 미수정). 단 `AGENTS.md`·`decision-register.md`·design SSOT 등 권위 문서를 변경한 점에서 process/documentation 영향은 Medium-High 수준.
- **Handoff:** Wave 6는 본 reconciliation으로 확정된 `design.md` 시각 권위와 운영 모델 위에서 desktop expanded overlay isolation + height floor를 진행한다(BQ-24가 Wave 6 BQ-19 Analysis 입력으로 연결). Wave 16 global token migration은 계속 deferred/gated. BQ-07 visual baseline deferral 유지.

### Wave 6 — Desktop expanded overlay sibling isolation + height floor

- **Status:** ✅ 완료
- **Purpose:** 데스크톱 Expanded overlay 형제 요소 격리 및 Expanded 높이 floor(Normal ≥) 구현. 완료된 해법은 resting-cell 높이를 explicit pixel floor로 측정·전달하고, desktop overlay body에만 floor와 단일 flex spacer를 적용해 lower-row/sibling geometry를 격리한다.
- **Include:**
  - invisible Normal placeholder + absolute `DesktopExpandedShell` seam 보존
  - `RestingFloorMap` 기반 explicit px floor 측정/전달: active card root `offsetHeight`를 `useLayoutEffect`에서 측정하고, `expandedRestingFloorPx`로 활성 카드에 전달
  - desktop expanded body에만 `expandedRestingFloorPx / resolvedShellScale` 기반 `minHeight` 적용; shell/surface `min-height:0` 보존
  - `layoutMode='desktop-overlay-floor'`에서만 Test choices↔meta, Blog subtitle↔meta+CTA 사이에 단일 flex spacer 적용
  - §6.7(3) lower-row 포함 non-target top/height/bottom isolation; §6.7(4) baseline freeze/release 상태모델 보존; §6.7(5) clipping 금지
- **Exclude:**
  - mobile expanded
  - Blog behavior / direct navigation
  - unrelated transition/storage/telemetry/routing/test-entry behavior
  - motion(별도 승인 시에만)
  - 화살표 글리프 광학(BQ-25, Wave 16 이후)
  - 전역 토큰(Wave 16)
  - visual baseline regeneration / `qa:visual:full`
- **Logic Improvement:** W6-LI-01/02/03/04 approved and applied. W6-LI-05 behavior layers preserved as no-change.
- **구현 결과:**
  - `baseline-manager.ts`: `RestingFloorMap` 타입과 `emptyRestingFloorMap`, `captureRestingFloor`, `clearRestingFloor` pure helper 추가. 기존 baseline snapshot freeze/release reducer 및 `LandingBaselineState`는 확장하지 않고 분리 state로 보존
  - `use-grid-geometry-controller.ts`: desktop active card root의 `offsetHeight`를 `useLayoutEffect`에서 측정해 `restingFloorMap`에 저장하고 controller output으로 노출. 기존 freeze/release `useEffect`와 32ms release lock 순서는 변경하지 않음
  - `landing-catalog-grid.tsx`: `restingFloorMap` 값을 활성 카드의 `expandedRestingFloorPx` prop으로 전달
  - `landing-grid-card.tsx`: desktop overlay expanded body에만 floor px를 shell scale로 보정한 `minHeight`로 적용. `DesktopExpandedShell`/surface의 `min-height:0` content-fit 계약은 유지하고, `desktop-overlay-floor` layout mode에서만 단일 spacer를 삽입
  - Mobile expanded/transient는 `flow` default path로 유지되어 desktop floor/spacer가 전파되지 않음
  - `landing-grid-card.module.css` 수정 없이 Tailwind class-only로 구현
  - BQ-24의 짧은 콘텐츠 Expanded가 same-row Normal보다 짧아지던 floor 회귀 해소
- **Files changed:**
  - `src/features/landing/grid/baseline-manager.ts`
  - `src/features/landing/grid/use-grid-geometry-controller.ts`
  - `src/features/landing/grid/landing-catalog-grid.tsx`
  - `src/features/landing/grid/landing-grid-card.tsx`
  - `tests/e2e/grid-smoke.spec.ts`
  - `tests/unit/landing-baseline-manager.test.ts`
- **Known deferred visual baseline debt:**
  - `expanded-focus-shell.png` expected 403×210, actual 403×292 after intended height floor
  - `overlay-focus-shell.png` expected 298×193, actual 298×254 from pre-existing visual drift
  - BQ-07에 따라 visual baselines were not regenerated; `qa:visual:full` was not run
- **Prerequisites:** Wave 4–5 완료; **RC W1–W5 Unit 5 핸드오프(`docs/plans/2026-06-02-expanded-height-floor.md`) 검토**; Logic Improvement Analysis gate cleared
- **Validation / tests:** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` green; full `grid-smoke` 18/18 green; functional-only `state-smoke` 13/13 green; `git diff --check` clean. Expanded ≥ same-row Normal 높이 geometry 단언과 lower-row isolation 단언 추가; B4 `surfaceMinHeight==='0px'` 보존 확인
- **Risk:** High
- **Handoff:** Wave 7 Blog behavior

### Wave 7 — Blog direct navigation behavior

- **Status:** ✅ 완료
- **Purpose:** Blog 카드를 Expanded / Read more CTA 경로가 아니라 Normal card whole-card trigger(`<Link>`)에서 직접 article navigation을 시작하도록 재배선했다. 완료된 해법은 기존 `beginBlogTransition` → `beginLandingTransition` path를 재사용하면서, Blog가 desktop/mobile/keyboard/hover 어디에서도 Test-like Expanded state에 진입하지 않도록 card-type gate를 추가한다.
- **Include:**
  - Blog-level semantic `<Link>` / whole-card navigation trigger
  - Blog Expanded render branch 제거: `ExpandedBlogBody`, `ExpandedBlogSubtitleContinuity`, blog `primaryCTA(Read more)`, blog subtitle split/plumbing 제거
  - `landing-grid-card.tsx`에서 Blog는 requested expanded state를 Normal로 강제하고, desktop/mobile expanded/transient shell은 Test card 전용으로 제한
  - `use-landing-interaction-controller.ts` Blog branch: R1 modifier/middle-click passthrough, normal click/tap은 `onPrimaryCtaSelect` → existing `beginBlogTransition` 경로로 진입 후 landing visual lock
  - `use-hover-intent-controller.ts` / `use-card-keyboard-handler.ts` Blog gate: hover/focus는 기존 Test expanded를 collapse하되 Blog를 expand하지 않음; Enter는 native link activation, Space는 no hijack
  - mobile Blog tap direct navigation; Blog never enters `use-mobile-card-lifecycle` (file unchanged)
  - `src/features/transition/**` unchanged: existing `beginBlogTransition`/`beginLandingTransition`/storage/telemetry side effects reused; Blog still no landing ingress / no `card_answered`
  - unit + e2e smoke specs updated from two-step Read-more CTA to single whole-card nav; mobile scroll/no-nav and modified-click guards added
  - `docs/req-landing.md` §8.6 and §14.4 transition trigger wording synced; §13.3 side-effect wording preserved
- **Exclude:**
  - Blog visual CTA styling / tag-row `Read more →` label / desktop hover reveal / mobile always-visible CTA — Wave 8
  - new Blog visual skin, sage border/focus-ring hover skin, `READ` eyebrow cleanup — Wave 8
  - transition runtime/storage/telemetry redesign
  - test card expansion/answer behavior changes
  - unavailable card behavior changes
  - `src/features/transition/**`, `use-mobile-card-lifecycle.ts`, `globals.css`, theme-token work
  - visual baseline regeneration / `qa:visual:full` / snapshot updates
- **Logic Improvement:** [W7-LI-01, W7-LI-02, W7-LI-03, W7-LI-04, W7-LI-05] approved — apply per Wave 7 analysis/plan. R1(modifier/middle-click passthrough), R2(link-semantic keyboard activation; Enter-only, no Space hijack), R3(mobile scroll-on-blog-card must-not-navigate) included.
- **구현 결과:**
  - `landing-grid-card.tsx`: Blog primary trigger is now `<Link href={buildLocalizedPath(RouteBuilder.blogArticle(card.variant), locale)} data-slot="primaryTrigger">`; Test/unavailable triggers remain `<button>`. Blog requested expanded state resolves to Normal; desktop expanded shell/mobile expanded body/mobile transient shell are Test-only.
  - Blog Expanded subtree and CTA removed: `ExpandedBlogBody`, `ExpandedBlogSubtitleContinuity`, `data-slot="primaryCTA"` Blog Link, blog meta/subtitle expanded branch, `useLandingCardSubtitleSplit` call and `blogSubtitleSplit` plumbing removed.
  - `landing-card-interaction-bindings.ts` / `landing-catalog-grid.tsx`: removed `onPrimaryCtaClick` binding/prop; `onPrimaryCtaSelect` still routes to `beginBlogTransition(card)`.
  - `use-landing-interaction-controller.ts`: whole-card Blog activation reuses existing blog transition path and prevents default only for ordinary left-click/tap; modified/middle-click returns without transition mutation.
  - `use-hover-intent-controller.ts`: Blog hover clears pending hover intent and collapses any expanded Test card without scheduling Blog expand; Blog mouseleave no-op.
  - `use-card-keyboard-handler.ts`: Blog focus records non-expanding focus and collapses prior Test; Blog Enter/Space no longer dispatches `CARD_EXPAND`.
  - `src/features/transition/**` and `src/features/landing/grid/use-mobile-card-lifecycle.ts` have no diff; transition pending state, return-scroll, internal `transition_start`, and no-`card_answered` Blog contract are preserved via reuse.
  - Test contract changed from Blog Expanded/read-more CTA to semantic whole-card link + no expanded slots. E2E changed routing/a11y/transition/state/grid smoke to single Blog trigger click, no-expanded Blog guards, modified click pass-through, mobile tap navigation, and mobile scroll no-nav.
- **Post-impl 정합(2026-06-03, code-review 후속 3건):**
  - hover로 Test→Blog 진입 시 collapse reason을 `handoff`→`collapse`로 교정 — Test 카드 표준 닫힘 모션(280ms) 보존, 0ms snap 제거(req-landing §8.3). keyboard `onFocus` 경로와 일관화.
  - 회귀 가드로 `state-smoke`에 Test 카드 `data-desktop-motion-role="closing"` 단언 추가(buggy 0ms 경로면 timeout).
  - Blog `<Link>`에 `aria-label`(=card.title) 추가, keyboard Blog `onFocus`의 `available:false` 의도 주석화.
  - 검증: `lint`/`typecheck`/`test`(484) /`build` green, Blog collapse 가드 E2E green. 3건 모두 Blog 경로 한정 — 기존 deferred 시각 baseline(BQ-07) 및 `state-smoke` `energy-check` 키보드 debt와 무관.
- **Files changed (actual current diff/status basis):**
  - Plans / docs: `docs/plans/2026-06-03-wave-7-blog-direct-navigation-analysis.md`, `docs/plans/2026-06-03-wave-7-blog-direct-navigation.md`, `docs/req-landing.md`
  - Landing render/controller: `src/features/landing/grid/landing-grid-card.tsx`, `src/features/landing/grid/landing-card-interaction-bindings.ts`, `src/features/landing/grid/landing-catalog-grid.tsx`, `src/features/landing/grid/use-landing-interaction-controller.ts`, `src/features/landing/grid/use-hover-intent-controller.ts`, `src/features/landing/grid/use-card-keyboard-handler.ts`
  - Tests / contracts: `tests/unit/landing-card-contract.test.ts`, `tests/unit/landing-data-contract.test.ts`, `tests/unit/landing-interaction-controller-handlers.test.ts`, `tests/e2e/a11y-smoke.spec.ts`, `tests/e2e/grid-smoke.spec.ts`, `tests/e2e/routing-smoke.spec.ts`, `tests/e2e/state-smoke.spec.ts`, `tests/e2e/transition-telemetry-smoke.spec.ts`
- **Validation / tests:** Implementation-session evidence: `npm run lint`, `npm run typecheck`, `npm test` (73 files / 484 tests), `npm run build` all green; Wave 7 targeted E2E slice 17/17 green; `git diff --check` clean before roadmap update. Full `npm run test:e2e:smoke` was run and is not green: 291 passed, 2 skipped, 108 failed, dominated by deferred visual/theme-matrix baseline debt and stale `landing-blog-expanded` / `mobile-landing-blog-expanded` manifest states. The two non-visual full-run failures observed (`consent-smoke` opt_out and grid B13 hover-collapse) passed when rerun individually.
- **Known deferred / debt:**
  - Wave 8 remains responsible for Blog normal/active visual: tag-row `Read more →`, desktop hover reveal, mobile always-visible CTA, blog visual skin/focus treatment.
  - `tests/e2e/theme-matrix-manifest.json` still contains `landing-blog-expanded` and `mobile-landing-blog-expanded`; it is an Ask-First path and was not changed in Wave 7.
  - `docs/req-landing.md` still has stale Read-more/Blog Expanded references outside the in-wave §8.6/§14.4 trigger wording sync; these were listed in the Wave 7 plan §11 and deferred unless scope is reopened.
  - Visual baselines / Safari/theme-matrix snapshots remain deferred under BQ-07; no baseline regeneration was performed.
- **Prerequisites:** Wave 2 완료; current controller coupling 확인; Wave 7 BQ-19 Analysis + implementation plan gate authorization confirmed
- **Risk:** High
- **Handoff:** Wave 8 Blog normal/active visual. Wave 8 should add the visual affordance without reintroducing Blog Expanded behavior or changing the preserved transition runtime/storage/telemetry contract.

### Wave 8 — Blog normal/active visual

- **Status:** ✅ 완료
- **Purpose:** Blog 카드를 Expanded/CTA 재도입 없이 Normal whole-card link 위에 시각 affordance와 active skin만 얹었다.
- **Include:** no `READ` eyebrow, `Read more →` in tag row, desktop hover reveal, mobile always visible
- **Exclude:** GNB/mobile menu
- **Logic Improvement:** `no candidates approved — preserve existing logic.` State/hooks/routing/storage/telemetry/i18n layers were kept; reveal and skin are CSS/markup-only.
- **구현 결과:**
  - `landing-grid-card.tsx`: Blog collapsed face에서만 `copy.readMore`를 `data-slot="blogReadMore"` 비상호작용 span으로 렌더링. `aria-hidden="true"`, no `tabindex`, no `primaryCTA`; decorative arrow is appended in-component. Test/unavailable rows do not receive the affordance.
  - Desktop hover/focus reveal uses `group-hover`/`group-focus-within` + `interactionMode`; mobile tap mode keeps the affordance visible. Blog still resolves to Normal and renders no Expanded shell/body.
  - `landing-grid-card.module.css`: scoped `--blog-hover-*` tokens and `[data-card-content-type='blog']:hover` selector added. Hover skin is sage border + soft glow; collapsed focus ring remains additive. `globals.css` was not touched.
  - `docs/design/design.md`: `--shadow-blog-hover` recorded in §5.8, §7.4 cross-referenced, and the stale Blog-expanded floor sentence removed.
  - `docs/req-landing.md`: §6.5/§6.6 Blog Expanded/primaryCTA rows synced to the whole-card-link contract; broader stale prose remains deferred as planned.
  - Post-impl 보완: hover skin을 `styles.blogCard` + fine-pointer media gate로 이동, 140ms reduced-motion-safe transition 적용, single-edge border+glow token으로 정리, computed-style/long-locale guards 추가.
- **Files changed:**
  - `src/features/landing/grid/landing-grid-card.tsx`
  - `src/features/landing/grid/landing-grid-card.module.css`
  - `tests/unit/landing-card-contract.test.ts`
  - `tests/unit/landing-data-contract.test.ts`
  - `tests/e2e/grid-smoke.spec.ts`
  - `docs/design/design.md`
  - `docs/req-landing.md`
- **Prerequisites:** Wave 7 완료; Logic Improvement Analysis gate cleared
- **Validation / tests:** `npm run lint`, `npm run typecheck`, `npm test` (73 files / 485 tests), `npm run build` all green; full `grid-smoke` 21/21 green in preview mode with one worker; Browser checks confirmed mobile Read-more opacity `1` / `primaryCTA=0` and desktop hover single-edge sage border + `rgba(92, 142, 120, 0.22)` glow + opacity `1`.
- **Known deferred / debt:**
  - `tests/e2e/theme-matrix-manifest.json` stale Blog-expanded entries remain deferred (Ask-First + BQ-07).
  - Visual baselines / Safari/theme-matrix snapshots remain deferred under BQ-07; no baseline regeneration was performed.
  - Broader stale `docs/req-landing.md` §1.3 / §8.5 prose remains Wave 14 scope per approved Wave 8 plan.
- **Risk:** Medium
- **Handoff:** Wave 9 unavailable

### Wave 9 — Unavailable behavior and visual

- **Status:** ⬜ 미완료
- **Purpose:** 비활성 카드 동작 및 시각 처리
- **Include:** no hover/click/tap, `tabIndex=-1` (HOVER_LOCK non-target) / keyboard-skipped, `--surface-soft` surface, standard coming-soon tag in tags-row (always visible, no dashed pill, no dot), subtle thumbnail dim (0.72), full-opacity title/subtitle.
- **Exclude:** test/blog behavior
- **Prerequisites:** Wave 2–3 완료; Logic Improvement Analysis gate cleared
- **Validation / tests:** a11y, card contract
- **Risk:** Medium
- **Handoff:** Wave 10 grid rhythm

### Wave 10 — Landing grid height rhythm

- **Status:** ⬜ 미완료
- **Purpose:** 그리드 높이 리듬 안정화
- **Include:** content-driven height, row stretch, bottom-anchored tags/CTA, no fixed card minHeight
- **Exclude:** expanded overlay internals already done, baseline update
- **Prerequisites:** Waves 2–9 완료; Logic Improvement Analysis gate cleared
- **Validation / tests:** grid/state smoke, breakpoint checks
- **Risk:** High
- **Handoff:** Wave 11 accessibility hardening

### Wave 11 — Landing desktop a11y/keyboard hardening

- **Status:** ⬜ 미완료
- **Purpose:** 데스크톱 접근성 및 키보드 강화
- **Include:** focus expands test card, focus does not navigate, Esc/close behavior, aria-labels
- **Exclude:** mobile expanded shape, GNB
- **Prerequisites:** Waves 4–10 완료; Logic Improvement Analysis gate cleared
- **Validation / tests:** a11y smoke, keyboard matrix
- **Risk:** High
- **Handoff:** Wave 12 mobile browse

### Wave 12 — Mobile browse card visual

- **Status:** ⬜ 미완료
- **Purpose:** 모바일 브라우즈 카드 시각 처리
- **Include:** single-column browse card visual, mobile Blog CTA visibility
- **Exclude:** mobile expanded focus state
- **Prerequisites:** Waves 2–3, 8–9 완료; Logic Improvement Analysis gate cleared
- **Validation / tests:** mobile browse smoke
- **Risk:** Medium
- **Handoff:** Wave 13 mobile expanded

### Wave 13 — Mobile expanded shape/position

- **Status:** ⬜ 미완료
- **Purpose:** 모바일 Expanded 형태 및 위치 정의
- **Include:** full viewport width, GNB-flush top, natural height, scrim, no side radius, B14 mobile title-continuity test.fixme 해제 및 재정렬
- **Exclude:** swipe-down close, mobile menu
- **Prerequisites:** Wave 12 완료; lifecycle coupling 조사 완료; Logic Improvement Analysis gate cleared
- **Validation / tests:** mobile lifecycle smoke, scroll lock check
- **Risk:** High
- **Handoff:** Wave 14 regression fixes

### Wave 14 — Landing-only regression stabilization

- **Status:** ⬜ 미완료
- **Purpose:** 랜딩 한정 회귀 안정화
- **Include:** fixes required by landing waves only — card/grid/a11y/routing regressions
- **Exclude:** product pipeline, GNB/theme, visual baseline
- **Prerequisites:** Waves 1–13 완료; Logic Improvement Analysis gate cleared
- **Validation / tests:** Basic gates, targeted e2e suggestions
- **Risk:** Medium
- **Handoff:** Wave 15 GNB visual

### Wave 15 — Desktop GNB visual shell

- **Status:** ⬜ 미완료
- **Purpose:** 데스크톱 GNB 시각 셸 구성
- **Include:** static `English / ☀` pill visual, no gear/hamburger desktop
- **Exclude:** functional locale/theme switching
- **Prerequisites:** Landing waves stable; Logic Improvement Analysis gate cleared
- **Validation / tests:** gnb smoke, routing smoke
- **Risk:** High
- **Handoff:** Wave 16 theme cleanup

### Wave 16 — Light-only theme cleanup

  - **Status:** ⬜ 미완료
  - **Purpose:** 라이트 테마 단일화 정리 + scoped 시각 토큰의 전역 통합
  - **Include:**
    - light-first visible state cleanup, dark/system controls not active
    - **Scoped visual-token consolidation:** `landing-grid-card.module.css`의 `--normal-*` / `--expanded-*` scoped 토큰을 `globals.css`의 warm-neutral / sage / Pretendard semantic namespace로 승격·통합하고, 컴포넌트 측 중복 선언을 제거한다. (대상 토큰 인벤토리: `project-rules.md §Visual-Design`)
  - **Exclude:** result pipeline, baseline
  - **Prerequisites:** Wave 15 완료, `theme-bootstrap` risk plan, **W3/W5 이후 도입된 scoped 토큰 전수 + design.md §5 값 패리티 확인 완료**
  - **Validation / tests:** theme matrix smoke suggestion only; **이관 전후 시각 동일성(스크린샷 기능 체크) 및 token 패리티 재확인**
  - **Risk:** High
  - **Handoff:** Wave 17 mobile menu

### Wave 17 — Mobile menu overlay visual

- **Status:** ⬜ 미완료
- **Purpose:** 모바일 메뉴 오버레이 시각 구성
- **Include:** full-screen overlay visual, language/theme display shell
- **Exclude:** functional locale/theme switching, dark/system activation
- **Prerequisites:** Wave 15–16 완료; Logic Improvement Analysis gate cleared
- **Validation / tests:** gnb mobile smoke, a11y smoke
- **Risk:** High
- **Handoff:** 이후 별도 승인 범위
