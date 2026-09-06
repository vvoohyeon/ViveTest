# Wave 4 — Expanded Test Content Contract · Pre-Implementation Analysis

> **Task mode: `Analysis Only`.** No files modified, no code implemented, no tests run, no
> baselines generated. This document is the deliverable and doubles as the BQ-19 **Step 1
> (Analysis Only)** Logic-Improvement report that gates the Wave 4 implementation prompt.
> Implementation requires a separate approved plan + `Logic Improvement: …` directive.

---

## 0. Metadata (AGENTS.md §7 — analysis framing)

| Field | Value |
|---|---|
| **Wave** | Wave 4 — Expanded test content contract (single wave; prereq = Wave 1 only, satisfied) |
| **Task mode** | `Analysis Only` |
| **SSOT contract (§2 routing)** | `docs/req-landing.md §6–11` (esp. the §8 slot/exposure block, lines ~262–298) — landing grid/card. Process governs via `docs/wave-roadmap.md` Wave 4 + `docs/decision-register.md` (BQ-01/09/12/18/19). Visual intent: `docs/design/design.md §6.5, §7.7, §10`. |
| **Files in Wave 4 implementation scope (later)** | `src/features/landing/grid/landing-grid-card.tsx` (Expanded Test body); `tests/unit/landing-card-contract.test.ts` and/or `tests/e2e/grid-smoke.spec.ts` (presence/aria assertions only). |
| **Reference-only (must NOT modify)** | `docs/**`; `src/features/variant-registry/**` (Ask First — resolver/builder/fixture; consume `resolveTestPreviewPayload` only); `src/messages/**` (meta-label i18n = Wave 5); `src/app/globals.css` (Ask First); `legacy/reference` + all checkpoint worktrees. |
| **Preservation contracts (Wave 4 Exclude)** | Overlay geometry / sibling isolation / row-height / baseline freeze-release (W6, req-landing §3); title continuity line-split + `normalTitleRef`/`normalSubtitleRef` measurement (W6-adjacent); mobile expanded shape (W13); expanded **visual skin** — choice button skin, equal padding, meta `completed`/full-number relabel (**W5**); keyboard/focus-expands/Esc/aria-expanded (W11); motion/CSS transitions (W5/6); visual baselines (BQ-07). |
| **Logic Improvement gate (BQ-18/19)** | Evaluated in §8. Recommendation: **no candidates approved — preserve existing logic** (markup/content wave; all six behavioral layers preserved). |

---

## 1. Context Verification

| Check | Expected | Actual | Result |
|---|---|---|---|
| Active workspace | `/Users/woohyeon/Local/ViveTest` (`docs/rebuild-worktree-setup.md §3`) | same | ✅ |
| Branch | `main` (active rebuild impl workspace) | `main` | ✅ |
| HEAD | setup-time `afe7077…` | `fe063ad` (`wave-3: Normal card visual skin`) | ℹ️ **expected advance** — `main` progressed W1 (`9ed6d1b`) → W2 (`020e12d`) → W3 (`fe063ad`); checkpoint worktrees remain pinned at `afe7077…`. Not a topology change. |
| Working tree | clean | clean | ✅ |
| Prerequisite | Wave 1 complete; Logic-Improvement gate cleared | W1–W3 landed on `main` | ✅ Wave 4 prereq (Wave 1) satisfied |

- Targets **local `main`**. No implementation in `legacy/reference` or any checkpoint worktree. No
  branch/merge/reset/checkpoint manipulation contemplated by Wave 4.
- **No blocking workspace/branch issue.** Wave 4 may proceed to the plan step after the decision
  points in §11 are resolved.

---

## 2. Wave 4 Scope (authoritative sources, not re-derived)

**`docs/wave-roadmap.md` Wave 4 — "Expanded test content contract" (Risk: High):**
- **Include:** thumbnail/subtitle/tags 제거 · question prominence · no label · no A/B badge · text+arrow.
- **Exclude:** overlay geometry · sibling isolation · mobile shape.
- **Validation:** card contract · choice aria-label check. **Handoff:** Wave 5 expanded visual.

**`docs/req-landing.md §8` (SSOT — canonical Expanded contract):**
- (L263) Expanded 공통 헤더: **`cardTitle`만 유지**.
- (L264) Expanded Test: `subtitle/thumbnail/tags` **제거(비노출, not hidden)**.
- (L268) Test Expanded slot set: **`previewQuestion`, `answerChoiceA/B`, `meta(3)`**.
- (L269) **Test entry는 `answerChoiceA/B`에서만** 시작.
- (L270) **canonical preview consumer shape = `previewQuestion`/`answerChoiceA`/`answerChoiceB` (고정)**.
- (L271–273) preview source = `scoring1` projection via **`resolveTestPreviewPayload`**; no raw fixture
  access; **do not distribute payload-access logic into UI**.
- (L290–293) preview/choices wrap freely, **truncate/ellipsis/clamp 금지**; choices left-aligned.
- (L298) one font family across Normal/Expanded (**no per-state font branching**).

**`docs/decision-register.md`:** BQ-01 (remove `PREVIEW QUESTION`/A/B badge/`have taken`/dot pill — scope
guard) · BQ-09 (Expanded test = label/badge removed, text + `→`, meta `completed`; **A/B selection
storage/transition side-effects preserved**) · BQ-12 (resolver/telemetry/transition/test-route =
preserved surface) · BQ-18/19 (logic-improvement evaluate-first + mandatory analysis gate).

**`docs/design/design.md §6.5` (visual intent):** content order = context label (test name, 14px
`--muted`, 500) → preview question (21px `--ink`, 600) → Choice A (text + `→`) → Choice B (text + `→`)
→ flex spacer → meta. Hard rules (§6.5/§10): no section label, no A/B badge, no divider, choices wrap,
meta `completed`.

---

## 3. Current State Map (evidence)

Expanded Test renders through `ExpandedTestBody` (`landing-grid-card.tsx:542–611`), composed under the
desktop overlay shell after the expanded title (`DesktopExpandedShell`, `:774–795`):

| Element | Location | Current value |
|---|---|---|
| Expanded title (test name) | `:774–785` `cardTitleExpanded` h2; in-flow ghost `cardTitle` via `NormalCardFace presentation='expandedTitleOnly'` (`:446–447`) | base title class `text-[1.04rem]` (~16.6px) leading-1.35 (`:211`) + line-split continuity |
| Preview question | `:548–554`, class `:223` | `landing-grid-card-preview-question m-0 text-[var(--muted-ink)]` — **muted, no size/weight (inherits ~16px/400)** |
| Answer choices A/B | `:561–588`, class `:225–226` | `<button>` text only — `{previewPayload.answerChoiceA/B}`; **no `→` glyph, no A/B badge**; click → `onAnswerChoiceSelect('A'/'B')` (test-entry trigger) |
| Meta row (3) | `:591–608` | `<dl>` Est. time / Shares / Total attempts (`copy.*`, defaults `:1153–1155`); `formatMetaValue` truncates to integer |
| Preview source | `resolveTestPreviewPayload` (`resolvers.ts:212`); fields `previewQuestion/answerChoiceA/answerChoiceB` (`builder.ts:272–273`) | resolver boundary intact; UI reads payload only |

Contract already enforced by `tests/unit/landing-card-contract.test.ts:115–145`: Expanded Test has **no**
`cardSubtitle/cardThumbnail/tags`, exactly one `cardTitle` (`landing-grid-card-title-normal`),
`previewQuestion`+`answerChoiceA`+`answerChoiceB`+`meta(3)` present, **no `primaryCTA`**.

---

## 4. Contract Gap Analysis (current → Wave 4 target)

| Wave 4 Include target | Current state | Gap | Wave 4 action |
|---|---|---|---|
| thumbnail/subtitle/tags removed | removed (SSOT L264; test-asserted) | none | **Verify/preserve** |
| no label (no `PREVIEW QUESTION`/section label) | none present (BQ-01) | none | **Verify/preserve** |
| no A/B badge | choices are text-only | none | **Verify/preserve** |
| text + arrow (`→` on choices) | **absent** (`:573/:587` text only) | **present** | **Add** (decorative; see W4-CC-01) |
| question prominence | question is `--muted-ink`, ~16px/400 — **less prominent than the title** (prominence inverted vs design §6.5) | **present** | **Establish** (see W4-CC-02 + Decision D2) |
| `cardTitle` header retained (SSOT L263) | retained | none | **Preserve** (do **not** demote to design's "context label" — Decision D1) |
| meta(3) | present; labels "Total attempts"/"Shares", integer numbers | "completed"/"shared"/full-number = **Wave 5** | **Out of Wave 4** (boundary) |

**Net:** the slot/exposure contract (removed slots, no label, no badge, meta(3), single `cardTitle`
header) is **already largely satisfied**. The genuine Wave-4 deltas are **(a) the answer-choice arrow
glyph** and **(b) preview-question prominence** — both small but landing on a behaviorally critical
element (the test-entry trigger), which is why Wave 4 is rated **High**.

---

## 5. Source Reconciliation — `design.md §6.5` ↔ `req-landing.md §8` (SSOT)

Precedence (per `design.md §1/§12` + AGENTS.md §2): **req-landing.md is the contract SSOT**; design.md
governs **visual intent** only. Declared tensions:

1. **"Context label" vs `cardTitle` header (PRIMARY).** design §6.5 wants the test name as a *quiet*
   14px `--muted` context label *below* nothing and *above* a prominent question. SSOT L263 keeps the
   expanded header as **`cardTitle`** (one element), and L284–285 builds elaborate **title continuity**
   (first-line split on Normal width) on that title. Demoting it to a tiny muted label would contradict
   both the SSOT header rule and the continuity feature. **Resolution:** preserve `cardTitle`; treat
   design's "context label" sizing as **superseded by the SSOT** (→ Decision **D1**). The test name's
   *context-cue role* is satisfied by its header position; its visual weight is a Wave-5 question at most.
2. **"Question prominence" ownership.** design §6.5 wants the question prominent; the current question
   is muted. Wave 5's Include list (choice button / padding / meta) **does not claim the question**, so
   if Wave 4 defers it, **no wave owns it**. **Resolution:** Wave 4 owns *minimal* question prominence,
   scoped to the `previewQuestion` element only (→ W4-CC-02, Decision **D2**).
3. **"text + arrow" vs fixed consumer shape.** SSOT L270 fixes the *data* consumer shape to three
   fields; the `→` is a **presentational glyph** (roadmap + design §7.7), not a payload field. **Resolution:**
   add the arrow as a **decorative `aria-hidden` element**, leaving payload + accessible name unchanged
   (→ W4-CC-01, Decision **D3**). This keeps SSOT L270 and the "choice aria-label check" green.
4. **Meta labels/numbers.** design §6.5 wants `completed` + full digits; roadmap assigns this to **Wave 5**.
   **Resolution:** **out of Wave 4** (→ Decision **D4**). Touching it would also enter the i18n layer.

---

## 6. Wave 4 Candidate Set (W4-CC-*)

| ID | Target | Approach | Layer | Magnitude | Risk | Recommend |
|---|---|---|---|---|---|---|
| **W4-CC-01** | Answer choice arrow | Append a decorative `<span aria-hidden="true">→</span>` inside each choice button after the answer text; do not alter payload, click handler, `onAnswerChoiceSelect`, `tabIndex`, or accessible name. Alignment polish = Wave 5. | markup | Low | **Med** (lives inside the test-entry trigger; must not change click target/handler) | **Approve** |
| **W4-CC-02** | Preview question prominence | Give `previewQuestion` focal typography (size/weight/ink) so it reads as the primary content per design §6.5. Minimal, element-scoped; exact token reconciliation in Wave 5. | markup/CSS | Low | Med (color/size only; no geometry, no measurement element) | **Approve (pending D2)** |
| **W4-CC-03** | Removed slots (thumb/subtitle/tags) | Confirm absence; no edit. | — | None | Low | **Approve (no-op / preserve)** |
| **W4-CC-04** | No section label | Confirm no `PREVIEW QUESTION`/label exists; no edit. | — | None | Low | **Approve (no-op / preserve)** |
| **W4-CC-05** | No A/B badge | Confirm choices carry no letter badge; no edit. | — | None | Low | **Approve (no-op / preserve)** |
| **W4-CC-06** | `cardTitle` header role | Preserve as-is; do **not** add a context-label element or demote the title. | — | None | Low (D1) | **Preserve (pending D1)** |
| **W4-CC-07** | Meta `completed` + full-number | Relabel + number display. | i18n/markup | Low | Med | **Reject for Wave 4 → Wave 5** (roadmap boundary) |
| **W4-CC-08** | Choice wrapping / left-align / no-truncate | Already enforced (SSOT L290–293; class `:226`). Confirm only. | — | None | Low | **Approve (no-op / preserve)** |

**Net Wave-4 actionable set:** **W4-CC-01** (arrow) + **W4-CC-02** (question prominence). Everything
else is preserve/verify or explicitly deferred. Both actionable items touch only `ExpandedTestBody`
markup/className; neither adds a wrapper, a new public `data-slot`, a transition, or any geometry.

---

## 7. Behavioral Guards (why Wave 4 is High risk)

The expanded test body contains the **test-entry trigger**. `answerChoiceA/B` clicks fire
`onAnswerChoiceSelect` → landing→test transition + telemetry + the **Landing Ingress Flag** (scoring1
A/B record, req-landing §"Landing Ingress Flag" L40; BQ-09). Wave 4 must:

- Preserve the choice button's handler, click target, `type="button"`, `tabIndex`/`aria-hidden`
  interactive/ghost branching, and the `interactive` gating (`:561–588`). The arrow is **decorative
  only** and must not become a separate click/focus target.
- Consume preview text **only** via `resolveTestPreviewPayload`; never read fixture/registry directly;
  never distribute payload-access logic into the component (SSOT L270–273; BQ-12).
- Not touch the title continuity machinery, `normalTitleRef`/`normalSubtitleRef`, overlay shell wrappers,
  or any measurement/baseline path (Wave 4 Exclude; W6 owns geometry).
- Keep one font family across Normal/Expanded (SSOT L298) — prominence via size/weight/color, not a
  different family.

---

## 8. Logic Improvement Analysis (BQ-19 Step 1 — six-layer, evaluate-first per BQ-18)

| Layer | Candidate considered | Change magnitude | Improvement value (1 modern-React · 2 simplicity · 3 perf · 4 testability · 5 a11y) | Risk / rollback | Wave dependency | Verdict |
|---|---|---|---|---|---|---|
| state | Expanded visual-state model unchanged for a content/markup wave | None | — | — | W6 owns geometry/baseline state | **Preserve** |
| hooks | Interaction controller / title-continuity hooks | None proposed | low — touching them risks W6 geometry | High rollback (measurement coupling) | W6/W11 | **Preserve** |
| routing | Test-entry routing from `answerChoiceA/B` | None | a11y(5): keep entry intact | High (entry contract) | W7 (blog) unrelated | **Preserve** (BQ-12) |
| storage | Landing Ingress Flag / A/B selection record | None | — | High (entry side-effect) | — | **Preserve** (BQ-09) |
| telemetry | Answer-select telemetry | None | — | High | — | **Preserve** (BQ-12) |
| i18n | Meta `completed`/`shared` relabel | Low (deferred) | 2: copy accuracy | Low, but **Wave 5** owns it | W5 | **Defer to Wave 5** |

**Conclusion:** no logic-layer change is required or beneficial enough to justify risk in Wave 4. The
two actionable items (arrow, question prominence) are **presentation/markup**, not business logic.
→ **Recommended implementation directive: `Logic Improvement: no candidates approved — preserve
existing logic.`** (i18n meta relabel logged as a Wave-5 item, consistent with the roadmap.)

---

## 9. Stop Conditions (halt + report if implementation hits any)

- Any edit outside `landing-grid-card.tsx` (Expanded Test body) + the two optional test files — esp.
  `variant-registry/**`, `messages/**`, `globals.css`, expanded-shell/blog/mobile regions.
- Changing the preview **consumer shape**, reading fixtures directly, or distributing payload-access
  logic into the component (SSOT L270–273).
- Altering the answer-choice **handler / click target / entry behavior / telemetry / ingress flag**.
- Adding a new public `data-slot`, a layout wrapper, an A/B badge, a section label, or a divider.
- Touching overlay geometry, sibling isolation, title continuity, `normalTitleRef`/`normalSubtitleRef`,
  baseline freeze-release, or mobile expanded shape.
- Relabeling meta / changing number display (Wave 5), or any i18n message edit.
- Introducing motion/transition or generating a visual baseline.
- The arrow needing to be non-decorative (in payload or accessible name) to satisfy the mockup — escalate.

---

## 10. Validation / Test Impact (no baselines — BQ-07)

- **Unit (`landing-card-contract.test.ts`):** existing Expanded Test contract must stay green. If W4-CC-01/02
  land, add **presence-only** assertions (e.g., decorative arrow element present + `aria-hidden`; choice
  **accessible name === answer text** unchanged; `previewQuestion` carries its prominence hook). No
  asserting computed px/colors.
- **Choice aria-label check (roadmap):** verify each choice's accessible name is exactly the answer text
  (arrow excluded) — protects SSOT L269/L270 + the test-entry contract.
- **E2E (`grid-smoke.spec.ts` `@smoke`):** expanded slot presence + that expanded overlay metric/collapse
  contracts stay green (W6 isolation untouched).
- **Gates (AGENTS.md §5):** `npm run lint` → `npm run typecheck` → `npm test` → `npm run build`.
- **Excluded:** `qa:visual:full`, baseline regeneration, theme-matrix.

---

## 11. Decision Points (resolve before drafting the Wave 4 plan)

1. **D1 — Context label vs `cardTitle`.** Confirm the SSOT `cardTitle` header is **preserved** and design's
   14px-muted "context label" sizing is **superseded** (not implemented as a new element). *(Plan default: preserve `cardTitle`.)*
2. **D2 — Question prominence ownership.** Confirm **Wave 4** owns minimal `previewQuestion` prominence
   (size/weight/ink on that element only), since Wave 5's scope does not list the question. *(Plan default: Wave 4 owns it.)*
3. **D3 — Arrow mechanism.** Confirm the `→` is a **decorative `aria-hidden`** element (payload + accessible
   name unchanged), not appended to the answer text. *(Plan default: decorative.)*
4. **D4 — Meta boundary.** Confirm meta `completed`/`shared` relabel + full-number display stay in **Wave 5**
   (out of Wave 4; avoids the i18n layer). *(Plan default: defer to Wave 5.)*

---

## 12. Wave 4 Readiness Summary

- **Prerequisite:** satisfied (Wave 1 complete; W1–W3 on `main`).
- **Contract baseline:** slot/exposure contract already met (removed slots, no label/badge, meta(3),
  single `cardTitle`); the real work is **two small presentation deltas** (arrow + question prominence)
  on a **High-risk, entry-critical** element.
- **Logic gate (BQ-19):** evaluated — **no candidates** (preserve existing logic); i18n meta relabel
  logged for Wave 5.
- **Blocking ambiguities:** D1–D4 (visual/scope), all with safe plan defaults; none require touching an
  excluded surface. No AGENTS.md root/child conflict; the only cross-doc tension (design ↔ SSOT) has a
  documented precedence and is resolved in §5.
- **Recommended next step:** confirm D1–D4, then draft `docs/plans/2026-05-31-wave-4-…-plan.md`
  (Implementation mode, scoped to `ExpandedTestBody`) carrying `Logic Improvement: no candidates approved`.

---

```
Analysis only. No implementation performed. A separate approved Wave 4 plan and the BQ-19
Step-2 approval/handoff directive are required before any file is modified.
```
