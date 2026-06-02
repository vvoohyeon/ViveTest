# Wave Roadmap

## Wave Overview

| Wave | Purpose | Prerequisites | Risk | Status |
| ---: | ------- | ------------- | ---- | ------ |
| 1 | Landing card render seam isolation + Normal order alignment + motion-ready internal seams | Codex investigation reports reviewed + BQ-08 approved + Logic Improvement Analysis gate cleared | Medium | ✅ 완료 |
| 2 | Normal card structural order verification and Wave 3 readiness | Wave 1 + Logic Improvement Analysis gate cleared | Medium | ✅ 완료 |
| 3 | Normal card visual skin | Wave 2 + Logic Improvement Analysis gate cleared | Medium | ✅ 완료 |
| 4 | Expanded test content contract | Wave 1 + Logic Improvement Analysis gate cleared | High | ✅ 완료 |
| 5 | Expanded test visual skin; motion implementation candidate if separately approved | Wave 4 + Logic Improvement Analysis gate cleared | Medium | ✅ 완료 |
| 6 | Desktop expanded overlay sibling isolation; motion implementation candidate if separately approved | Wave 4–5 + Logic Improvement Analysis gate cleared | High | ⬜ 미완료 |
| 7 | Blog direct navigation behavior | Wave 2 + controller coupling 확인 + Logic Improvement Analysis gate cleared | High | ⬜ 미완료 |
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
- **Handoff:** Wave 6 overlay behavior

### Wave 6 — Desktop expanded overlay sibling isolation + height floor

- **Status:** ⬜ 미완료
- **Purpose:** 데스크톱 Expanded overlay 형제 요소 격리 및 Expanded 높이 floor(Normal ≥) 구현
- **Include:**
  - invisible Normal placeholder, absolute Expanded, z-index layering, row height stability
  - **Expanded height floor (BQ-24):** resting-cell 높이를 explicit pixel로 측정해 floor로 주입; 잉여 높이는 last-choice↔meta 단일 flex spacer에만 흡수; content 초과 시 spacer 접힘(content-fit). `min-height:100%`/CSS-only flex floor 금지
  - §6.7(3) same-row non-target 카드 top/bottom/outer height 0px 격리; §6.7(4) baseline freeze/release 상태모델; §6.7(5) clipping 금지
- **Exclude:** mobile expanded, Blog behavior, **motion(별도 승인 시에만), 화살표 글리프 광학(BQ-25, Wave 16 이후), 전역 토큰(Wave 16)**
- **Mockup divergence note (expected):** current_status에서 짧은 콘텐츠 Expanded가 same-row Normal보다 짧아지는 floor 회귀는 본 Wave에서 해소한다.
- **Prerequisites:** Wave 4–5 완료; **RC W1–W5 Unit 5 핸드오프(`docs/plans/2026-06-02-expanded-height-floor.md`) 검토**; Logic Improvement Analysis gate cleared
- **Validation / tests:** grid/state smoke, row height check; **신규: Expanded ≥ same-row Normal 높이 geometry 단언(스크린샷 아님); B4 `surfaceMinHeight==='0px'` 보존 확인**
- **Risk:** High
- **Handoff:** Wave 7 Blog behavior

### Wave 7 — Blog direct navigation behavior

- **Status:** ⬜ 미완료
- **Purpose:** Blog 카드 직접 내비게이션 동작 구현
- **Include:** remove Blog Expanded path, whole-card navigation, no test-like expansion
- **Exclude:** Blog visual CTA styling
- **Prerequisites:** Wave 2 완료; current controller coupling 확인; Logic Improvement Analysis gate cleared
- **Validation / tests:** routing smoke, transition telemetry smoke
- **Risk:** High
- **Handoff:** Wave 8 Blog visual

### Wave 8 — Blog normal/active visual

- **Status:** ⬜ 미완료
- **Purpose:** Blog 카드 시각 스타일 적용
- **Include:** no `READ` eyebrow, `Read more →` in tag row, desktop hover reveal, mobile always visible
- **Exclude:** GNB/mobile menu
- **Prerequisites:** Wave 7 완료; Logic Improvement Analysis gate cleared
- **Validation / tests:** landing interaction smoke, mobile browse check
- **Risk:** Medium
- **Handoff:** Wave 9 unavailable

### Wave 9 — Unavailable behavior and visual

- **Status:** ⬜ 미완료
- **Purpose:** 비활성 카드 동작 및 시각 처리
- **Include:** no hover/click/tap, `tabIndex=-1`, muted surface, dashed Coming Soon pill, no dot
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
