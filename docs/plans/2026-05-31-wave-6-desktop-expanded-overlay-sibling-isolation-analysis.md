# Wave 6 — Desktop Expanded Overlay Sibling Isolation · Pre-Implementation Analysis

> **Task mode: `Analysis Only`.** No source files modified, no implementation, no tests run, no
> screenshots or baselines regenerated. This document is the sole deliverable and serves as the
> BQ-19 Logic-Improvement gate for a future Wave 6 implementation prompt.

---

## 1. Metadata

| Field | Value |
|---|---|
| **Wave** | Wave 6 — Desktop expanded overlay sibling isolation |
| **Task mode** | `Analysis Only` |
| **Current HEAD** | `571eb0cc412ca42f38fc3c504eb0e9e7c8810451` (`571eb0c wave-5: expanded test visual skin`) |
| **Branch / workspace** | `main` at `/Users/woohyeon/Local/ViveTest` |
| **Working tree status at analysis start** | clean (`git status --short` empty) |
| **Allowed deliverable** | This new analysis document under `docs/plans/` only |
| **Reference-only worktrees** | `legacy/reference` and all checkpoint worktrees were not modified. Legacy was not inspected because current contracts and implementation evidence were sufficient. |
| **Process gates** | `AGENTS.md` startup · `.planning/STATE.md` restore check · Wave 6 BQ-19 analysis · no implementation before user approval |

### Sources Read

- Project startup and topology: `AGENTS.md`; `.planning/STATE.md`; `docs/rebuild-worktree-setup.md`; `package.json`; `next.config.ts`; `playwright.config.ts`; `src/config/site.ts`.
- Rebuild contracts: `docs/wave-roadmap.md`; `docs/decision-register.md`.
- Product/behavior contracts: `docs/req-landing.md`; `docs/req-test.md`; `docs/project-analysis.md`.
- Design references: `docs/design/design.md`; `docs/design/resources/wave4-expanded-test-content-reference.css`; `docs/design/resources/wave5-expanded-test-visual-skin-reference.css`; `docs/design/resources/screenshots/expanded-card-spec.png`.
- Prior wave docs: `docs/plans/2026-05-31-wave-4-expanded-test-content-contract-analysis.md`; `docs/plans/2026-05-31-wave-5-expanded-test-visual-skin-analysis.md`.
- Current implementation evidence: `src/features/landing/grid/landing-grid-card.tsx`; `src/features/landing/grid/landing-grid-card.module.css`; `src/features/landing/grid/landing-catalog-grid.tsx`; `src/features/landing/grid/use-grid-geometry-controller.ts`; `src/features/landing/grid/baseline-manager.ts`; `src/features/landing/grid/spacing-plan.ts`; `src/features/landing/grid/layout-plan.ts`; `src/features/landing/grid/use-landing-interaction-controller.ts`; `src/features/landing/grid/use-desktop-motion-controller.ts`; `src/features/landing/grid/use-hover-intent-controller.ts`; `src/features/landing/grid/use-keyboard-handoff.ts`; `src/features/landing/grid/use-card-keyboard-handler.ts`; `src/features/landing/grid/interaction-dom.ts`; `src/features/landing/grid/desktop-shell-phase.ts`; `src/features/landing/model/interaction-state.ts`.
- Test evidence: `tests/unit/landing-card-contract.test.ts`; `tests/unit/landing-baseline-manager.test.ts`; `tests/unit/landing-spacing-plan.test.ts`; `tests/unit/landing-grid-plan.test.ts`; `tests/e2e/grid-smoke.spec.ts`; `tests/e2e/state-smoke.spec.ts`; `tests/e2e/safari-hover-ghosting.spec.ts`.

---

## 2. Context Verification

| Required check | Result |
|---|---|
| Root `AGENTS.md` read | Yes. Critical boundaries, commands, Ask First/High-Risk areas, and rebuild worktree constraints internalized. |
| `.planning/STATE.md` read if present | Present and read. It still describes Wave 5 as "complete, uncommitted", but HEAD now contains the Wave 5 commit and the working tree is clean. This analysis treats committed HEAD/status as current and does not edit `.planning/STATE.md`. |
| Expected workspace | Confirmed: `/Users/woohyeon/Local/ViveTest`, the active rebuild implementation workspace. |
| Expected branch | Confirmed: `main`. |
| Recent HEAD includes Wave 5 | Confirmed: `571eb0c wave-5: expanded test visual skin`. |
| Working tree before writing | Clean. No unexpected source changes. |
| Checkpoint worktrees | Not modified. |
| `legacy/reference` | Not modified; not inspected for this analysis. |
| Child `AGENTS.md` | No child `AGENTS.md` found under `src/features/landing` or `tests`; root instructions remain active. |
| Network / external packages | No network access; no package additions. |

No startup blocker was found. The only drift is the stale `.planning/STATE.md` wording relative to the now-committed Wave 5 HEAD; it is informational and out of scope for this analysis-only deliverable.

---

## 3. Source Reconciliation

### Roadmap

`docs/wave-roadmap.md` classifies Wave 6 as High risk and gives this scope:

- **Include:** invisible Normal placeholder, absolute Expanded, z-index, row height stability.
- **Exclude:** mobile expanded, Blog behavior.
- **Motion candidate:** desktop geometry/sibling-related motion may be evaluated only after separate approval.
- **Prerequisites:** Wave 4-5 complete plus Logic Improvement Analysis gate.
- **Validation/tests:** grid/state smoke and row height check.
- **Handoff:** Wave 7 Blog behavior.

Interpretation: Wave 6 is a desktop/tablet geometry isolation wave. It may touch the desktop expanded shell and row-stability mechanics, but it must not turn into mobile shape work, Blog direct-navigation work, test-route work, or visual-baseline approval.

### Decision Register

- **BQ-07:** Visual regression baselines are discarded until rebuild completion and new approval. Wave 6 may propose visual/geometry checks, but must not regenerate or approve baselines.
- **BQ-09:** Expanded test content is label/badge-free, text + arrow, and meta `completed`; A/B storage/transition side effects are preservation contracts.
- **BQ-11:** Mobile expanded shape/position is a later wave; swipe-down close remains excluded.
- **BQ-12:** Resolver, telemetry, transition, and test route contracts are preservation surfaces unless a BQ-19 candidate is explicitly approved.
- **BQ-18/BQ-19/BQ-20:** Evaluate business logic across state/hooks/routing/storage/telemetry/i18n before implementation; user approval/deferral is required before implementation.

### Landing Requirements

Relevant `req-landing.md` contracts:

- Normal slot order is fixed: `cardThumbnail -> cardTitle -> cardSubtitle -> tags`.
- Expanded common header keeps only `cardTitle`; Expanded Test removes subtitle/thumbnail/tags, not merely hiding them.
- Test Expanded entry starts only from `answerChoiceA/B`; preview consumer shape stays `previewQuestion`, `answerChoiceA`, `answerChoiceB`.
- Desktop/Tablet expanded title continuity must preserve the Normal-width first-line split.
- Desktop/Tablet Expanded detail slots must not influence same-row non-target row track sizing.
- Same-row non-target cards must preserve top, bottom, and outer height during expanded/handoff and after close, for row 1 and row 2+.
- Baseline freeze/release must follow `BASELINE_READY -> BASELINE_FROZEN -> BASELINE_READY`.
- During active expanded/handoff, baseline remeasurement is forbidden; viewport/grid-width changes force collapse before remeasure.
- Expanded must not clip readable content; overlaying later rows is allowed.
- `card_answered` is independent of internal transition signals; hover/expanded toggles are not telemetry events.

### Design Authority

`design.md` says the resting card defines the grid cell; an expanded card never changes sibling height. Expanded Test overlays its grid cell, has no desktop close button, and grows downward over later rows if content exceeds the cell. The expanded card's minimum height should equal the resting cell height; surplus height belongs only in the spacer between the final choice and the meta row.

Important design implementation warning: if implementation notes are documented, do not use `min-height: 100%` as the expanded-overlay height invariant because it collapses to thumbnail height in practice. The height floor should be an explicit measured pixel value from the resting card.

### Current Implementation

The current implementation is already closer to Wave 6 than the roadmap text implies:

- `LandingGridCard` keeps the grid item/root in flow and renders `DesktopExpandedShell` as an absolute sibling inside the card root.
- Desktop expanded state renders an in-flow `NormalCardFace presentation="expandedTitleOnly"` plus an invisible ghost body. That currently serves as the Normal footprint placeholder.
- The expanded desktop stage is absolute and the root receives elevated stacking (`z-20`) when expanded.
- Baseline freeze/release is implemented in `use-grid-geometry-controller.ts`, with all-row snapshots while a desktop active visual card exists.
- Existing E2E already asserts same-row sibling top/height/bottom stability for a row-1 card and a short expanded case.

The current gap is that the placeholder is implicit and split across `NormalCardFace` + `NormalCardGhostBody`, while the overlay surface intentionally has `min-height: 0px` to stay content-fit. That conflicts with the design rule that expanded height must be at least the Normal cell height and that surplus should pool above meta. Wave 6 is the right place to reconcile this because the height floor must be absolute-overlay-local; implementing it later in Wave 10 would reopen overlay internals that Wave 10 explicitly excludes.

---

## 4. Current Implementation Evidence

### Render Structure: Normal vs Desktop Expanded Test

Current desktop expanded card structure:

| Layer | Evidence | Current role |
|---|---|---|
| Card root | `landing-grid-card.tsx:973-1037` | Grid item/root with `data-testid="landing-grid-card"`, variant/type/state/debug attributes, spacing CSS vars, and root mouse/pointer handlers. |
| Root class/styling | `landing-grid-card.tsx:920-941`; `landing-grid-card.module.css:1-64` | Expanded desktop root becomes transparent, joins `styles.desktopOverlayLayer`, and gains `z-20`. CSS sets overlay shell/surface `min-height: 0; height: auto`. |
| Primary trigger | `landing-grid-card.tsx:1038-1050` | In-flow `button data-slot="primaryTrigger"`; keeps focus/key/click handlers and tab order. Gets `pointer-events-none` while desktop expanded. |
| Normal placeholder title | `landing-grid-card.tsx:1051-1062`; `NormalCardFace` at `433-463` | In desktop expanded, `NormalCardFace presentation="expandedTitleOnly"` renders exactly one public `data-slot="cardTitle"` via `NormalCardTitle`. |
| Invisible ghost footprint | `landing-grid-card.tsx:1064-1072`; `NormalCardGhostBody` at `419-430` | Invisible wrapper renders thumbnail/subtitle/tags with `exposePublicSlot=false`, preserving layout footprint without public slot anchors. |
| Absolute desktop stage | `landing-grid-card.tsx:1076-1090`; `DesktopExpandedShell` at `755-820` | Absolute stage/layer/shell/surface/body with public geometry slots `desktopStage`, `expandedLayer`, `expandedShell`, `expandedSurface`, `expandedBody`, `cardTitleExpanded`. |
| Expanded Test body | `landing-grid-card.tsx:577-629` | Preview question, answerChoices, answerChoiceA/B, meta. A/B buttons keep `type="button"`, public data slots, click handler, tab order. |
| Mobile expanded body | `landing-grid-card.tsx:1093-1158` | Separate mobile in-flow/transient path. Out of Wave 6 scope. |

Answer to required question 1: after Waves 4-5, Normal Test uses `NormalCardFace` collapsed presentation with thumbnail/title/subtitle/tags in order. Desktop Expanded Test uses the same card root and trigger, but the trigger content becomes a title-only public Normal seam plus an invisible non-public ghost body. The rich expanded body is rendered separately in `DesktopExpandedShell` as an absolute overlay.

### Existing Seam for Placeholder + Overlay

Answer to required question 2: yes, there is already a shell/seam:

- The grid cell/shell is the card root plus primary trigger/content area.
- The current placeholder seam is `NormalCardFace(presentation="expandedTitleOnly")` plus `NormalCardGhostBody`.
- The absolute overlay seam is `DesktopExpandedShell`.
- `landing-grid-card.module.css` already separates semantic overlay classes from public `data-*` anchors.

Recommended interpretation: **adapt** this seam rather than replacing it. A future implementation should make the placeholder contract explicit enough to measure/use as a height floor, but should not introduce a new public `data-slot`, move the overlay outside the card root, or replace the controller model.

### Wrappers, Classes, and Data Attributes to Preserve

Answer to required question 3: preserve these public or contract-observed anchors:

- Root: `data-testid="landing-grid-card"`, `data-card-variant`, `data-card-state`, `data-card-content-type`, `data-card-viewport-tier`, `data-expanded-layer`, `data-desktop-motion-role`, `data-desktop-shell-phase`, spacing/debug attributes.
- Trigger: `data-testid="landing-grid-card-trigger"`, `data-slot="primaryTrigger"`, `data-trigger-state`, focus/key/click handler attachment.
- Normal slots: `cardThumbnail`, `cardTitle`, `cardSubtitle`, `tags` in collapsed; exactly one `cardTitle` in desktop expanded; no public thumbnail/subtitle/tags in desktop expanded.
- Expanded desktop geometry slots: `desktopStage`, `expandedLayer`, `expandedShell`, `expandedSurface`, `expandedBody`, `cardTitleExpanded`.
- Expanded Test slots: `previewQuestion`, `answerChoices`, `answerChoiceA`, `answerChoiceB`, `meta`.
- Mobile-only slots must remain untouched: `mobileHeader`, `mobileClose`, `mobileTransientShell`, `mobileTransientPanel`, `cardTitleTransient`, `mobileCloseGhost`.
- Blog/unavailable slots must remain behaviorally preserved until their waves: `cardSubtitleExpanded`, `primaryCTA`, `unavailableOverlay`.

### Risky File / Function Boundaries

Answer to required question 4:

| Boundary | Risk |
|---|---|
| `LandingGridCard` render branch (`landing-grid-card.tsx:843-1165`) | Highest geometry risk: a wrapper, `display`, `visibility`, or pointer/focus change can alter row height, focus order, or slot tests. |
| `NormalCardFace` / `NormalCardGhostBody` (`419-463`) | The placeholder seam is here. Changing public slots or aria/visibility incorrectly can break contract tests and a11y. |
| `DesktopExpandedShell` (`755-820`) | Shared desktop shell for current Test and Blog expanded paths. Shell changes can unintentionally affect Blog before Wave 7. |
| `landing-grid-card.module.css:43-64` | Active desktop stage clipping, containment, and overlay min-height are central to row isolation and content crop risk. |
| `landing-grid-card.module.css:66-108` and keyframes | Current motion role classes and frame widening. Any change can become a motion implementation. |
| `use-grid-geometry-controller.ts:146-308` | Spacing remeasurement skip, baseline freeze/release, and plan-change collapse. Changes can produce residual row height or stale snapshots. |
| `use-desktop-motion-controller.ts:122-195` | Handoff/open/close/cleanup phase timings. A geometry change should not re-author motion without approval. |
| `use-hover-intent-controller.ts:98-114, 138-254` | Hover-out containment uses the card boundary resolved from the expanded body. Moving overlay outside the root would break this. |
| `use-card-keyboard-handler.ts:112-307` and `interaction-dom.ts:5-14, 110-127` | Keyboard focus traversal and boundary selection depend on `[data-slot="expandedBody"]` staying inside the card root. |
| `landing-catalog-grid.tsx:96-105, 162-268` | Supplies baseline state, row wrappers, and per-card plan/spacing props. Row attributes are E2E anchors. |

---

## 5. Direct Analysis Answers

### 5.1 Does Wave 6 Require Contract-Surface Changes?

| Surface | Required? | Analysis |
|---|---:|---|
| Public `data-slot` values | No | Use existing class/ref/internal data if needed. Public slot additions are unnecessary and risky. |
| Event handler attachment points | No | Root mouse handlers, trigger focus/key/click handlers, `expandedBody` keydown, answer choice click handlers should remain exactly attached. |
| Focus order | No | DOM order can stay trigger -> answerChoiceA -> answerChoiceB -> next card. Absolute positioning does not require focus-order changes. |
| Keyboard handoff | No | Preserve `getExpandedFocusableElements()` and `queueCardHandoff()` assumptions. Add tests for geometry during keyboard handoff, not new keyboard behavior. |
| Hover intent timers | No | Preserve dwell/collapse timers. Only boundary geometry may affect hover-out hit testing, so test it. |
| Baseline freeze/release model | Not required for first implementation | Current model is compatible with Wave 6. A scoped-row optimization exists as a candidate but is not recommended for Wave 6. |

### 5.2 Preventing Same-Row Sibling Height Changes

Answer to required question 6:

1. Keep the card root/grid item in normal flow as the sole row-height contributor.
2. Keep a Normal-footprint placeholder in the trigger/content flow. The placeholder should represent the same collapsed Normal footprint that siblings use for row stretch.
3. Render the expanded surface as an absolute overlay under the same card root. The overlay must not contribute to CSS grid row track sizing.
4. Use a measured pixel height from the Normal placeholder/root as the expanded surface minimum height, not `min-height: 100%`.
5. If expanded content is shorter than the Normal placeholder, the overlay surface remains at least placeholder-height and any surplus is absorbed inside the expanded body spacer above the meta row.
6. If expanded content is taller than the Normal placeholder, the overlay grows downward over later rows via stacking; it must not push same-row siblings or resize the row track.
7. Freeze spacing/baseline during active expanded/handoff and release only after collapse/settle. Do not remeasure spacing while active.

### 5.3 Interaction-State Behavior

Answer to required question 7:

| Scenario | Required behavior |
|---|---|
| Hover enter | Existing hover dwell expands the card. Baseline freezes immediately. Placeholder remains in flow. Overlay appears absolute and becomes the visible surface. Same-row siblings retain pre-expanded top/bottom/height. |
| Hover out | Existing collapse path remains. Closing/cleanup may keep overlay visible briefly, but the in-flow placeholder must remain Normal-sized and no residual sibling height change may persist after release. |
| Card-to-card handoff | Source should not leave a close/cleanup shell that changes source-row height. Target overlay opens absolute. Baseline must not be remeasured mid-handoff. Existing handoff source/target phase semantics should remain. |
| Escape collapse | Existing `collapseExpandedCard()` path remains. Geometry must return to Normal with no residual sibling top/bottom/height change. |
| Keyboard focus expansion | Focus on a Test card can still expand it in hover-capable desktop mode. Trigger focus remains visible through the overlay focus boundary. AnswerChoiceA/B traversal remains unchanged. |
| Viewport/grid width change while expanded | Existing plan-change logic collapses expanded desktop card before remeasure. Preserve this. If placeholder height measurement is introduced, clear/recompute it only after collapse/settled Normal layout. |

### 5.4 Current Tests and Gaps

Answer to required question 8:

Current coverage:

- `landing-card-contract.test.ts` verifies Normal slot order, desktop Expanded Test slot removals, exactly one in-flow `cardTitle`, expanded surface/body slots, answer choice arrow, meta count, and Blog/Unavailable current contracts.
- `landing-baseline-manager.test.ts` verifies freeze and release state helpers.
- `landing-spacing-plan.test.ts` verifies row-local compensation and row-index-independent rules.
- `landing-grid-plan.test.ts` verifies row planning and lower-row shell inline scale.
- `grid-smoke.spec.ts` verifies row planning, spacing compensation, title/subtitle continuity, lower-row shell widening, same-row non-target geometry stability during expanded, short-expanded content-fit, and hover/handoff phases.
- `state-smoke.spec.ts` verifies keyboard traversal, focus boundary, answer choice hover geometry, and mobile keyboard handoff.
- `safari-hover-ghosting.spec.ts` verifies cleanup-pending bounding, row1/lower-row hover-out snapshots, handoff source/target phases, and steady expanded shadow/content-fit snapshots.

Remaining gaps for Wave 6:

- No explicit row-stability test for **row 2+ same-row non-target** during a lower-row Test expanded case using non-screenshot geometry only.
- No explicit test for **handoff across rows** proving the source row and target row retain non-target metrics and baseline release timing.
- No explicit test for **Escape collapse** preserving sibling top/bottom/height.
- No explicit test for **keyboard-focus expansion** preserving same-row sibling metrics.
- No explicit test for **viewport/grid width change while expanded** proving collapse happens before remeasure and no residual height remains.
- Existing tests assert `expandedShell`/`expandedSurface` `min-height: 0px`; those will need updating if the approved Wave 6 implementation adopts the measured Normal-height floor required by design.
- Screenshot/local snapshot tests must not be regenerated under BQ-07. Prefer geometry assertions for Wave 6 regression coverage.

### 5.5 Wave 10 Items Structurally Inseparable From Wave 6

Answer to required question 9: **yes, one Wave 10-adjacent item is structurally inseparable and should be handled in Wave 6 if approved.**

The expanded overlay's Normal-height floor and internal surplus spacer are not general grid rhythm polish; they are part of overlay sibling isolation. Without this, the implementation either:

- keeps the overlay content-fit and may be shorter than the Normal cell, contradicting design; or
- tries `min-height: 100%`, which design explicitly warns against; or
- lets expanded content participate in row sizing, violating Wave 6.

Candidate classification: **W6-LI-01** below. General Wave 10 items remain deferred: collapsed card bottom rhythm across Blog/Unavailable, bottom-anchored future Blog CTA, no fixed card minHeight outside the expanded overlay, and broader breakpoint rhythm.

### 5.6 Motion

Answer to required question 10: **no new motion implementation is advisable now by default.**

Current desktop motion phases and CSS keyframes already exist. Wave 6 should preserve them while changing layout geometry only as needed. Any new choreography, shared-layout-like behavior, z-index transition, clipping animation, or motion re-authoring should be a separately approved motion candidate. The analysis identifies **W6-MOTION-01** below only as a defer/explicit-approval item.

---

## 6. KARD Matrix

| Target | KARD | Recommendation |
|---|---|---|
| Expanded shell geometry | **Adapt** | Current absolute desktop stage is the right base. Adapt height-floor and placeholder mechanics; do not replace the whole stage. |
| Normal placeholder | **Adapt** | Existing `NormalCardFace expandedTitleOnly` + `NormalCardGhostBody` is the seam. Make the footprint contract explicit enough for measurement; avoid public slot changes. |
| Absolute overlay surface | **Adapt** | Keep `DesktopExpandedShell`; adapt surface/body min-height and spacer behavior if W6-LI-01 is approved. |
| z-index strategy | **Keep / minor Adapt** | Keep root `z-20` plus stage layering. Adapt only if lower-row hit/crop tests prove clipping/stacking failure. |
| Row height stability | **Adapt** | Current row freeze + absolute overlay is close; add explicit lower-row/handoff/Escape/keyboard/resize coverage and measured placeholder floor. |
| Baseline freeze/release | **Keep** | Current all-row freeze/release is conservative and contract-compatible. Do not simplify in Wave 6 unless user approves W6-LI-02 despite risk. |
| Hover/handoff | **Keep** | Preserve current hover dwell, collapse, enterable-only handoff, source/target phases. Test geometry under these paths. |
| Keyboard/focus behavior | **Keep / Adapt only if shell affects focus** | Preserve focus order and Escape. If overlay height/focus ring changes, update geometry/focus tests only. |
| Mobile expanded behavior | **Keep / out of scope** | No mobile shape, lifecycle, transient shell, close button, scroll-lock, or mobile backdrop changes. |
| Blog behavior | **Keep / out of scope** | No direct navigation, CTA behavior, Blog copy, Blog visual, or Blog slot behavior change. Shared shell changes must be behavior-preserving. |
| Telemetry/storage/transition | **Keep** | Preservation only; no event, storage key, payload, transition signal, or route changes. |
| Visual baselines | **Delete from Wave 6 scope** | Deferred by BQ-07. Do not regenerate or approve screenshots/baselines. |

---

## 7. Logic Improvement Candidate Report

Evaluation criteria: 1) Modern React patterns, 2) simplicity/maintainability, 3) performance, 4) testability, 5) a11y logic.

### Layer Coverage Summary

| Layer | Evaluation |
|---|---|
| state | Expanded state, visual state, baseline freeze/release, hover/handoff state inspected. One real candidate: measured Normal placeholder height state. |
| hooks | `use-grid-geometry-controller`, desktop motion, hover intent, keyboard handoff inspected. One real candidate: scoped-row baseline optimization, but not recommended. |
| routing | No routing coupling found; no candidate. |
| storage | No storage change expected; staged entry / landing ingress contracts are preservation-only. No candidate. |
| telemetry | No telemetry change expected; `card_answered` and transition signal contracts are preservation-only. No candidate. |
| i18n | No user-facing copy or locale behavior expected. No candidate. |

### Real Candidates

| Field | W6-LI-01 |
|---|---|
| **Candidate ID** | W6-LI-01 |
| **Layer** | state |
| **Current evidence** | Current desktop expanded root renders a title-only in-flow seam plus invisible ghost body (`landing-grid-card.tsx:1053-1071`), while CSS forces overlay shell/surface to `min-height: 0; height: auto` (`landing-grid-card.module.css:59-64`). E2E currently asserts `shellMinHeight`/`surfaceMinHeight` are `0px` (`grid-smoke.spec.ts:932-938`, `state-smoke.spec.ts:331-349`). Design requires expanded min-height to equal the resting cell height and explicitly rejects `min-height: 100%`. |
| **Proposed improvement** | Add a desktop-only measured Normal placeholder height state/ref and expose it as an internal CSS variable for the absolute expanded surface/body. Use that pixel value as the expanded min-height floor, with a flex spacer absorbing surplus above meta. Keep the overlay absolute so sibling rows are not resized. |
| **Change magnitude** | Medium |
| **Improvement value** | 1) Modern React: Medium; measured layout state with refs/ResizeObserver or layout effect is standard when CSS cannot express the contract. 2) Maintainability: High; makes the implicit placeholder contract explicit. 3) Performance: Medium; one measurement per active card/resize, must avoid layout thrash. 4) Testability: High; enables geometry assertions against placeholder/root/surface height. 5) a11y logic: Medium; keeps focus-visible overlay aligned with the actual visible shell. |
| **Risk / rollback** | Risks: measurement timing, stale height on resize/handoff, accidentally hiding the focusable trigger, test updates currently expecting `0px` min-height. Rollback is localized if implemented behind one CSS var and one measured state path. |
| **Wave dependency** | Pulls the expanded-overlay part of Wave 10 into Wave 6; protects Wave 10 from reopening overlay internals. Must not affect Wave 13 mobile expanded. |
| **Recommendation** | **Recommend approve for Wave 6**, subject to user approval and a test plan that updates min-height assertions without regenerating screenshots. |

| Field | W6-LI-02 |
|---|---|
| **Candidate ID** | W6-LI-02 |
| **Layer** | hooks |
| **Current evidence** | `use-grid-geometry-controller.ts:281-296` captures snapshots for all rows whenever `activeVisualCardVariant` exists. The reducer preserves snapshots when already frozen and the active card changes (`50-63`). `landing-catalog-grid.tsx:180-182` exposes frozen-row debug attributes. |
| **Proposed improvement** | Scope baseline snapshots to only the active row and, during cross-row handoff, the source/target rows. Release source-row snapshot when target row settles instead of freezing all rows until full collapse. |
| **Change magnitude** | Medium |
| **Improvement value** | 1) Modern React: Low-Medium; narrower state is cleaner but more conditional. 2) Maintainability: Low; adds row identity/handoff branching. 3) Performance: Low-Medium; fewer row measurements, but catalog size is small. 4) Testability: Medium; can assert specific frozen rows. 5) a11y logic: Neutral. |
| **Risk / rollback** | High risk of breaking baseline order, row 1/row 2+ consistency, and handoff release semantics. Rollback requires restoring all-row freeze. |
| **Wave dependency** | Could affect Wave 10 grid rhythm and Wave 11 keyboard handoff. |
| **Recommendation** | **Reject/defer for Wave 6.** Current all-row freeze is conservative, simpler, and already aligned with "no remeasure while active." Optimize only after row-isolation behavior is stable. |

### Non-Candidates by Layer

| Layer | Current evidence | Recommendation |
|---|---|---|
| state: expanded/visual/handoff | `interaction-state.ts:328-363` expands/collapses one card; `resolveVisualState` is consumed in `use-landing-interaction-controller.ts:450-456`; desktop phases are derived in `desktop-shell-phase.ts`. | **No candidate.** Preserve single-expanded and handoff state semantics. |
| hooks: desktop motion | `use-desktop-motion-controller.ts:122-195` handles opening, closing, handoff, cleanup timers; CSS keyframes are already present. | **No candidate for default Wave 6.** Motion re-authoring is W6-MOTION-01 and needs separate approval. |
| hooks: hover intent | `use-hover-intent-controller.ts:138-254` owns hover enter/leave dwell and handoff. Boundary checks use `resolveCardBoundaryElement()`. | **No candidate.** Keep timers/semantics; test new overlay geometry against existing boundary behavior. |
| hooks: keyboard handoff | `use-card-keyboard-handler.ts:112-307` owns Tab traversal, Escape, and handoff. `interaction-dom.ts:5-14` finds focusables inside `[data-slot="expandedBody"]`. | **No candidate.** Preserve DOM slot and focus order. |
| routing | No Wave 6 source needs `src/lib/routes/**`, `src/i18n/localized-path.ts`, app routes, or `RouteBuilder`. | **No candidate.** |
| storage | Landing A/B entry goes through `beginTestTransition` from `landing-catalog-grid.tsx:81-87` and `handleAnswerChoiceSelect` at `use-landing-interaction-controller.ts:382-396`. | **No candidate.** Preserve staged entry and ingress storage shape. |
| telemetry | `req-landing.md §12` and `req-test.md §9` define `card_answered`, `attempt_start`, and internal transition signals. Geometry does not require event changes. | **No candidate.** |
| i18n | Wave 5 already updated meta copy; Wave 6 has no copy or locale requirements. | **No candidate.** |

### Motion Candidate

| Field | W6-MOTION-01 |
|---|---|
| **Candidate ID** | W6-MOTION-01 |
| **Layer** | hooks/CSS motion |
| **Current evidence** | Roadmap says desktop geometry/sibling-related motion can be evaluated only after separate approval. Current motion roles/keyframes already animate shell scale/frame width (`landing-grid-card.module.css:66-108`, `244-286`) and controller phases (`use-desktop-motion-controller.ts`). |
| **Proposed improvement** | Re-author desktop overlay choreography around the explicit placeholder/absolute surface, including clipping envelope and z-index transition if needed. |
| **Change magnitude** | High |
| **Improvement value** | Potentially improves polish, but not required for geometry correctness. |
| **Risk / rollback** | High risk to hover-out, handoff, reduced-motion, Safari ghosting, and visual baselines. |
| **Wave dependency** | Could affect Wave 11 keyboard/a11y and visual baselines. |
| **Recommendation** | **Defer/reject by default.** Requires explicit user approval separate from W6-LI-01. |

---

## 8. Risk Map

| Dimension | Risk | Mitigation |
|---|---|---|
| Usability | Hover-out, card-to-card handoff, or Escape could leave a residual overlay or row height change. | Preserve existing state/handoff paths; add non-screenshot geometry tests for hover-out, handoff, Escape, and post-release state. |
| A11y | Hiding the placeholder incorrectly could hide the focused trigger or alter accessible names. | Do not `aria-hidden` the focusable trigger; preserve answer choice buttons and accessible names; keep `expandedBody` focus boundary. |
| Responsiveness | Row 1 and row 2+ have different column counts and shell inline scale; viewport resize while expanded can stale the measured height. | Test row 1, lower row, two-column/tablet; preserve plan-change collapse before remeasure; clear/recompute measured height only in settled layout. |
| Performance | Placeholder height measurement can cause layout thrash if done on every render. | Measure only when desktop expanded/resize/content changes require it; prefer one layout effect/ResizeObserver path, no polling. |
| Design-system consistency | Current overlay min-height is `0px`; design wants a Normal-height floor and spacer. | Approve W6-LI-01; update geometry tests; no visual baseline regeneration. |
| Cross-wave scope | Shared `DesktopExpandedShell` currently serves Blog; shell changes might alter Blog expanded geometry before Wave 7. | Keep Blog behavior/slots/handlers unchanged; treat any Blog behavior change as blocking. Decide whether shared shell geometry adaptation is allowed. |
| Baseline policy | Screenshot baselines will likely drift if overlay height/focus shell changes. | Do not regenerate baselines. Use geometry assertions and document deferred visual baseline drift under BQ-07. |

---

## 9. Proposed Implementation Boundary

This is not implementation code; it is the recommended boundary for a later approved plan.

### Candidate Files for Later Implementation

- `src/features/landing/grid/landing-grid-card.tsx`
  - Adapt the desktop expanded placeholder/overlay render boundary.
  - Preserve all public `data-slot` values and handlers.
  - If W6-LI-01 is approved, add desktop-only measured placeholder/root height state/ref and internal CSS variable.
- `src/features/landing/grid/landing-grid-card.module.css`
  - Adapt desktop overlay surface/body min-height and spacer behavior.
  - Preserve motion classes unless W6-MOTION-01 is explicitly approved.
  - Avoid global token/theme changes.
- `tests/unit/landing-card-contract.test.ts`
  - Add/update presence/slot/placeholder contract checks as needed.
- `tests/e2e/grid-smoke.spec.ts`
  - Add/update non-screenshot geometry assertions for row 1, row 2+, handoff, hover-out, Escape, viewport resize.
- `tests/e2e/state-smoke.spec.ts`
  - Add/update keyboard/focus geometry assertions if focus shell changes.
- Possibly `tests/e2e/safari-hover-ghosting.spec.ts`
  - Only non-screenshot assertions unless the user explicitly approves baseline work. Do not regenerate local snapshots.

### Files That Should Remain Out of Scope

- Mobile lifecycle/shape files: `use-mobile-card-lifecycle.ts`, `mobile-lifecycle.ts`, mobile scroll/backdrop/transient shell modules, unless a regression guard requires a no-op preservation test.
- High-risk shell/GNB/theme files: `src/features/gnb/**`, `src/features/landing/shell/page-shell.tsx`, `public/theme-bootstrap.js`, `src/app/globals.css`.
- Routing/i18n: `src/lib/routes/**`, `src/i18n/**`, app route files.
- Registry/resolver/source: `src/features/variant-registry/**`.
- Storage/telemetry/transition runtime: `src/features/transition/**`, telemetry modules, test route/runtime modules.
- Visual baselines and screenshot snapshot files.

### Preservation Contracts

Wave 6 must explicitly protect:

- A/B answer choice test-entry behavior.
- `card_answered` / staged entry / landing ingress behavior.
- Transition runtime behavior and internal transition signal semantics.
- Storage keys and payload shapes.
- Resolver/registry boundaries.
- Public `data-slot` anchors.
- ARIA labels and accessible names.
- Keyboard focus order and Escape behavior.
- Hover/focus/click expansion semantics.
- Mobile expanded behavior.
- Blog behavior.
- Unavailable behavior.
- No visual baseline regeneration.

If any implementation step appears to require changing one of these, stop and ask before coding.

---

## 10. Test and Verification Plan

No tests were run during this analysis. Future implementation should use this plan:

### Basic Gates

Run in order:

1. `npm run lint`
2. `npm run typecheck`
3. `npm test`
4. `npm run build`

### Scope-Specific Verification

- Unit:
  - `npm test -- tests/unit/landing-card-contract.test.ts tests/unit/landing-baseline-manager.test.ts tests/unit/landing-spacing-plan.test.ts tests/unit/landing-grid-plan.test.ts`
- E2E geometry:
  - `npx playwright test tests/e2e/grid-smoke.spec.ts --project=chromium --grep "B4|B10|B11|B13|short-expanded|shell frame"`
  - Add focused tests for lower-row same-row non-target stability, cross-row handoff, Escape collapse, keyboard focus expansion, and viewport resize collapse-before-remeasure.
- E2E state/a11y preservation:
  - `npx playwright test tests/e2e/state-smoke.spec.ts --project=chromium --grep "keyboard|expanded keyboard focus|answer choice|hover"`
  - `npx playwright test tests/e2e/a11y-smoke.spec.ts --project=chromium --grep "landing|expanded"`
- Transition/entry preservation if any handler-adjacent source changes:
  - `npx playwright test tests/e2e/transition-telemetry-smoke.spec.ts --project=chromium`

### Baseline Policy

- Do **not** run `npm run qa:visual:full`.
- Do **not** regenerate Playwright screenshots or local snapshots.
- If existing screenshot assertions fail because Wave 6 intentionally changes the focus/overlay shell, document the drift under BQ-07 and rely on non-screenshot geometry tests unless the user separately approves baseline work.

---

## 11. Blocking Questions

1. **Logic Improvement approval:** Does the user approve **W6-LI-01** (measured desktop Normal placeholder height state + absolute overlay min-height floor), or should Wave 6 preserve the current `min-height: 0px` content-fit overlay?
2. **Baseline model:** Does the user reject/defer **W6-LI-02** as recommended, keeping the current all-row baseline freeze/release model?
3. **Shared shell boundary:** May Wave 6 adapt the shared `DesktopExpandedShell` geometry as long as Blog behavior/slots/handlers remain unchanged, or must the implementation gate the geometry changes to Test cards only until Wave 7 removes Blog expanded behavior?
4. **Motion:** Confirm that **W6-MOTION-01** is not approved by default. Any motion/choreography work needs explicit separate approval.
5. **Screenshot drift handling:** If current screenshot/local snapshot tests fail after geometry changes, should the implementation document the drift and defer baseline regeneration under BQ-07 as assumed?

No source-code blocker was found. These questions gate the future implementation prompt, not the analysis deliverable.

---

## 12. Safe Assumptions

- Active implementation workspace remains `/Users/woohyeon/Local/ViveTest` on `main`.
- Wave 5 is complete and committed at `571eb0c`.
- `.planning/STATE.md` stale wording is not a Wave 6 blocker and should not be edited in this analysis-only task.
- Legacy/reference and checkpoint worktrees remain read-only / untouched.
- Wave 6 is desktop/tablet only.
- Mobile expanded shape/lifecycle remains deferred to Wave 13.
- Blog behavior remains deferred to Wave 7 and Blog visual to Wave 8.
- General grid height rhythm outside the expanded overlay remains Wave 10.
- No public `data-slot` additions or renames are needed.
- No routing, storage, telemetry, transition, registry/resolver, i18n, GNB, PageShell, global theme, or visual-baseline work is needed.

---

## 13. Recommended Next Step

Wave 6 is ready for an implementation prompt **after** the user explicitly approves or defers:

- W6-LI-01,
- W6-LI-02,
- W6-MOTION-01,
- the shared-shell vs test-only boundary,
- and the BQ-07 screenshot-drift handling assumption.

Recommended directive for the implementation prompt if the analysis recommendations are accepted:

`Logic Improvement: W6-LI-01 approved; W6-LI-02 deferred; W6-MOTION-01 not approved — preserve existing routing/storage/telemetry/i18n/keyboard/hover semantics and implement desktop-only placeholder + absolute overlay geometry per analysis.`

Implementation should then proceed with a narrow plan, likely touching only `landing-grid-card.tsx`, `landing-grid-card.module.css`, and focused unit/E2E tests, with no screenshot or baseline regeneration.
