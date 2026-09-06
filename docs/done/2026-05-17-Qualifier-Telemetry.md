# Implementation Plan — Qualifier/Telemetry Session

## ⚠️ Premise Correction (read first)

**HEAD commit `b3ec9d4` "Add qualifier reentry UI and telemetry events" (1671 insertions, working tree clean) already implements Waves A, B, C1, and D1 — including unit + e2e tests and a 795-line plan doc (`docs/plans/2026-05-16-qualifier-reentry-ui.md`).**

Treating the Wave A/B/C1/D1 "Scope" blocks literally would mean re-adding code that already exists, and in several places the committed implementation **deliberately differs** from the "Confirmed Decisions" in this task. Per `AGENTS.md §9` ("plans must reflect actual outcome, not original intent") and the Claude Code guardrail "On documentation conflict, halt and report — do not self-resolve," this plan is a **gap-closure + verification + conflict-surfacing** plan, not a greenfield build.

**Genuinely unimplemented work:** `trackResultViewed` helper (Wave C2), `TestResultPanel` result_viewed fire point (Wave C2, blocked — see R1), `hasAllRequiredAnswers` scoring-only filter (Wave D2), Phase 11 QA script extension (Wave E).

**SSOT (Routing Table §2):** test-flow → `docs/req-test.md`, `docs/req-test-plan.md`, `project-rules.md §TestFlow`; telemetry → `docs/req-landing.md §8/§12/§13`, `§Blog-Telemetry-Theme`. **Prior plan:** `docs/plans/2026-05-16-qualifier-reentry-ui.md`.

**Command reality (verified in `package.json`; `AGENTS.md §5`):** package manager is **npm, not pnpm**; there is **no `qa` script** — it is **`npm run qa:rules`** (= `node scripts/qa/run-all.mjs`, 12 checks, excluded from the default Done gate per §8). Vitest = `npm test`. E2E subset = `npx playwright test consent-smoke qualifier-overlay`.

---

## WAVE A: Reducer foundation + qualifier exclusion
**Prerequisite:** none

**ACTUAL STATE (already committed):**
- `test-run-reducer.ts:46-50, 207-217` — `RESET_SCORING_ANSWERS` exists; payload is `{firstScoringCanonicalIndex: number; qualifierAnswers: Record<string,StoredAnswer>}`; behavior `answers: {...action.qualifierAnswers}`, `currentQuestionIndex: action.firstScoringCanonicalIndex`, active-phase guard.
- `use-test-run-controller.ts:391-401` — `resetScoringAnswers(qualifierAnswers)` callback (computes `firstScoringCanonicalIndex` via `findFirstScoringQuestion`).
- `use-test-run-controller.ts:373-378` — `handleSubmit` already excludes profile indexes from `finalResponses` via `profileIndexes = questions.filter(isProfileQuestion)`.
- `validation.ts:174-178` — `final_responses` already A/B-only.
- `test-result-panel.tsx:46-54` — profile filter + exact TODO comment already present (NOT in `test-question-client.tsx:294-306`; that range is the progress header — the task's line reference is stale).
- Tests `test-run-reducer.test.ts:262-341` lock the `{firstScoringCanonicalIndex, qualifierAnswers}` contract (5 cases incl. interleaved-index).

**FILES CHANGED:** None required for stated outcomes — all Wave A outcomes are satisfied by committed code.

**LOGIC NOTES:** Decision C prescribes Option P (`{qualifierCanonicalIndexes: number[], firstScoringIndex}`, "delete all answers except qualifier index keys", controller computes via `questions.filter(isProfileQuestion)`). The committed design instead carries the resolved `qualifierAnswers` map and replaces wholesale. End-state is equivalent **only because** the orchestrator passes exactly the qualifier answers; the action contract and test surface differ from Decision C.

**GATE:** `npm test` (specifically `test-run-reducer.test.ts`, `landing-telemetry-validation.test.ts`) — currently green; no change expected.

**RISK FLAGS:**
- **R3 (decision required):** Reconcile Decision C / Wave-A payload spec (Option P) vs. committed `{firstScoringCanonicalIndex, qualifierAnswers}`. Rewriting to Option P churns 5 committed reducer tests + the orchestrator confirm path + `test-entry-orchestrator-reentry.test.ts` for no behavioral gain. Recommend: **amend Decision C to ratify the committed contract**, or explicitly authorize the refactor + test rewrite.
- **R4:** Task's "test-question-client.tsx line ~294-306 result panel placeholder" is stale; the filter is `test-result-panel.tsx:46-54`. Confirm no second edit is intended.

---

## WAVE B: Qualifier reentry chip + overlay
**Prerequisite:** Wave A (satisfied)

**ACTUAL STATE (already committed):**
- `use-test-entry-orchestrator.ts:60` `overlayMode` state; `:92-104` `reopenQualifierOverlay` seeds `qualifierDraft` from `answers` by qualifier canonical index; `:72-86` reentry Cancel restores `overlayMode:'entry'`; `:156-164` reentry Confirm → `resetScoringAnswers` + `writeResponseSet` + close.
- `test-question-client.tsx:196-206` `instructionVisible` already `overlayMode === 'reentry' || (…)`; `:386-403` chip with `data-testid="test-qualifier-chip"`, `onClick=reopenQualifierOverlay`, keyboard handler; `:226-236` `qualifierChipLabel` joins labels with `" · "`.
- `instruction-overlay.tsx:33-43, 85-97` reentry handled via `qualifierStep.isReentry`/`backLabel` (no `overlayMode` prop added to the overlay).
- i18n keys `qualifierRestartConfirm`/`qualifierPending`/`qualifierChipAriaLabel`/`cancel` present in **all 12** locale files.
- E2E `tests/e2e/qualifier-overlay.spec.ts:221-284` covers chip→reentry→cancel(keeps answers)→confirm(clears scoring, restarts).

**FILES CHANGED:** None required for functional outcomes.

**LOGIC NOTES — deviations from task spec (not bugs, design differences):**
1. Chip has **no 24-char truncation/ellipsis**; renders full `label · label`. Task & Decision B example imply a compact summary.
2. Chip render condition is `entryCommitted && qualifierItems.length>0 && overlayMode!=='reentry'` — not the task's `qualifierItems.length>0 && phase==='active'` (functionally close: `entryCommitted` = `active||submitted`; chip would show post-submit too, since result panel replaces the panel that's moot).
3. Overlay reentry is threaded via `qualifierStep.isReentry`/`backLabel`, not a new `overlayMode` prop. Test IDs differ from any implied (`test-qualifier-reentry-cancel-button`).
4. `test-question-client.tsx:117-119` clears the auto-advance timer on question-index change but does **not** `setIsAnswerLocked(false)` there (unlock relies on timer callback / Prev handler) — note for Wave C1 edge review.

**GATE:** `npm test`; manual EGTT: entry→active→chip→reentry→Cancel(answers kept)→reentry→change→Confirm(scoring cleared, first scoring question). Already covered by committed e2e.

**RISK FLAGS:**
- **R5 (decision required):** Apply 24-char ellipsis truncation + align render condition to Decision B, or ratify committed behavior? Truncation is the only concrete functional delta in Wave B.

---

## WAVE C: Answer lock + telemetry layer
**Prerequisite:** Wave A (satisfied)

### C1 — 150ms answer lock — **ALREADY COMMITTED**
`test-question-client.tsx:72` `isAnswerLocked`; `:421,433` `disabled={isAnswerLocked}` on both choices; `:263` set before `:265-278` 150ms timer; cleared at `:273` (timer), `:449` (Prev). Disabled+selected CSS coexistence: `testAnswerButtonClassName` (`:46-47`) combines `data-[selected=true]:*` with `disabled:!*` overrides bound to `--interactive-disabled-*` tokens (R-08). **No change required.** Edge note: index-change effect does not force-unlock (see Wave B note 4) — flag for review only.

### C2 — telemetry types + validation + helpers
**ACTUAL STATE:** `types.ts:5-11,51-73` union + `QuestionAnsweredEvent` + `ResultViewedEvent` — DONE. `validation.ts:7-14,180-201,110-118` branches + allowlist + post-attempt session-id — DONE. `runtime.ts:296-313` `trackQuestionAnswered` — DONE; `trackQuestionAnswered` call wired in `test-question-client.tsx:245-255` with last-scoring exclusion (`lastScoringCanonicalIndex`, `:222-225`) — DONE.

**FILES CHANGED (genuine gap):**
- `src/features/telemetry/runtime.ts` — **add `trackResultViewed(...)`** helper (currently absent; file ends at L313). Must satisfy committed `ResultViewedEvent`.
- `src/features/test/test-result-panel.tsx` — add one-shot mount `useEffect(() => trackResultViewed(...), [])` + TODO("Replace with IntersectionObserver at derived_type block in 2위 result pipeline session"). **Requires new props** (`variant`, `route`/`pathname`, `landingIngressFlag`) threaded from `test-question-client.tsx:329` — panel currently receives only `questions/answers/locale/landingPath`.

**NEW INTERFACES / TYPES:** none new — `ResultViewedEvent` already defined as `{variant, derived_type, landing_ingress_flag}`.

**LOGIC NOTES:** "Last scoring question" identification is already solved via `lastScoringCanonicalIndex` (`questions.filter(!isProfileQuestion).at(-1)`).

**GATE:** `npm test` (+ `telemetry-question-answered.test.ts`); `npx playwright test consent-smoke qualifier-overlay`.

**RISK FLAGS:**
- **R1 (CRITICAL — blocks C2 fire point, decision required before editing):** Decision H/C2 say `result_viewed` payload is `{ variant }` minimal. The **committed contract requires non-empty `derived_type` + boolean `landing_ingress_flag`** (`types.ts:60-65`, enforced `validation.ts:193-200`). `derived_type` is explicitly **deferred 2위 scope**. A mount-fire in `TestResultPanel` **cannot pass `validateTelemetryEvent`** without a `derived_type`. `validation.ts` is a **Gold Standard** ("Telemetry payload hygiene", `AGENTS.md §6`); relaxing it conflicts with that and is adjacent to **Ask-First** `scripts/qa/*`. Options for human decision: (a) **defer `trackResultViewed`/panel fire entirely to the 2位 session** (recommended — avoids Gold-Standard edit and forbidden derived_type); (b) emit a sentinel `derived_type` (e.g. `'pending'`) now (pollutes telemetry contract); (c) relax `result_viewed` validation to make `derived_type` optional (Gold-Standard change — needs explicit approval + test updates). **Do not edit until chosen.**

---

## WAVE D: Per-answer persist + hasAllRequiredAnswers
**Prerequisite:** Wave A (satisfied)

### D1 — Active-run per-answer persist — **ALREADY COMMITTED**
`use-test-run-controller.ts:311-312` `updateAnswer` → `writeResponseSet(variant,newAnswers)` + `writeLastAnsweredAt`; `:332` NAVIGATE_PREVIOUS path → `writeResponseSet(filteredAnswers)`; orchestrator `:159,175` commit/reentry → `writeResponseSet`. The advance-only `SELECT_ANSWER` in `moveQuestion(1)` (`:356-363`) intentionally does **not** re-write (answer already persisted by the preceding `updateAnswer` in `handleAnswerChoice`). **No new call needed; adding one would double-write.** → Verification only.

### D2 — `hasAllRequiredAnswers` scoring-only (genuine gap)
**ACTUAL STATE:** `test-run-reducer.ts:65-77` iterates `1..totalQuestions`, no question-type awareness. Callers: reducer `SUBMIT` (`:200`), controller `allAnswered` (`:284`). Tests lock current behavior: `test-run-reducer.test.ts:200-201, 339`.

**FILES CHANGED:**
- `src/features/test/test-run-reducer.ts` — `hasAllRequiredAnswers` must consider only scoring canonical indexes. The reducer is a **pure module with no `ResolvedQuestion` import**; it cannot call `isProfileQuestion`. Requires either (i) new param `scoringCanonicalIndexes: ReadonlySet<number>` (then `SUBMIT` action payload must carry it, and controller passes it), or (ii) move the all-answered check out of the reducer into the controller using `resolveScoringProgress` (already scoring-aware, `question-runtime-utils.ts:134-147`).
- `src/features/test/use-test-run-controller.ts:284,388` — update `allAnswered`/`SUBMIT` dispatch accordingly.
- `tests/unit/test-run-reducer.test.ts` — 3 assertions (`:200-201, 339`) + `SUBMIT` cases need updating.

**LOGIC NOTES:** Q for plan ("same `qualifierCanonicalIndexes` set as Wave A, or derive independently?"): **derive independently** from question type — `resolveScoringProgress` already filters `questionType==='scoring'` and is the lowest-risk source of truth. Recommended approach: **(ii)** — controller computes `allAnswered = scoringProgress.answered === scoringProgress.total && total>0`; `SUBMIT` guard then trusts controller (or accepts a precomputed boolean). Keeps the reducer pure, no signature explosion in the action union.

**GATE:** `npm test`; then **`npm run qa:rules`** (12 checks; note: this is the real script name, not `npm run qa`; `qa:rules` is excluded from the §8 default Done gate but explicitly required here).

**RISK FLAGS:**
- **R6 (decision required):** Approach (i) reducer-signature/action-contract change vs (ii) move check to controller. (ii) is less invasive but changes where the SUBMIT invariant lives (state-contract impact, `AGENTS.md §7`). Reducer + `use-test-run-controller.test.ts` are committed test surfaces — confirm test rewrite is authorized.

---

## WAVE E: Phase 11 QA script extension
**Prerequisite:** Wave C2 (`trackResultViewed` must exist before the script asserts it — gated by R1)

**ACTUAL STATE:** `scripts/qa/check-phase11-telemetry-contracts.mjs:134-141` runtime-helper presence `if` (landingView/cardAnswered/attemptStart/finalSubmit, negated regex `||`); `:148-158` validation-token `if` (Forbidden/Legacy/card_answered/final_responses). Neither references the new events. No type-union check exists (correct — defer per task).

**FILES CHANGED:**
- `scripts/qa/check-phase11-telemetry-contracts.mjs` — extend the `:134-141` `if` with `!/trackQuestionAnswered/u.test(runtimeFile) || !/trackResultViewed/u.test(runtimeFile)` clauses (+ update fail message); extend the `:148-158` `if` with `!/question_answered/u.test(validationFile) || !/result_viewed/u.test(validationFile)` (+ message). Mirror existing structure exactly; **no type-union check**.
- `scripts/qa/_path-config.mjs` — **no additions**: `telemetry.runtime`/`telemetry.validation` already exported (`:29-32`); the script already imports `{e2e, telemetry}`.

**LOGIC NOTES:** If R1 defers `trackResultViewed`, the `trackResultViewed` presence clause must also be deferred or it will hard-fail `qa:rules`. The two clauses are independent — `trackQuestionAnswered`/`result_viewed`/`question_answered` can be added now regardless of R1; the `trackResultViewed` runtime-helper clause is coupled to R1.

**GATE:** `npm run qa:rules` — all 12 checks pass (session-final gate).

**RISK FLAGS:**
- **R7 (Ask First):** `scripts/qa/*.mjs` is **Ask-First** (`AGENTS.md §4`). Confirm the contract/test anchor before editing. The script is also Gold-Standard-adjacent; an over-tight regex risks flaking `qa:rules` (excluded from default Done gate but release-critical).
- **E↔R1 coupling:** do not add the `trackResultViewed` clause until R1 resolves, else `qa:rules` fails by construction.

---

## CROSS-WAVE DEPENDENCY MAP (files touched in ≥1 wave; edit ordering)

| File | Waves | Status / required edit ordering |
|---|---|---|
| `test-run-reducer.ts` | A, D2 | A = no-op (committed). D2 = only real edit. Edit once, in D2. Gated by R3 (don't rewrite for A) + R6. |
| `use-test-run-controller.ts` | A, C2(prop source), D1, D2 | A/D1 committed (no-op). D2 may edit `allAnswered`/SUBMIT (`:284,388`). C2 supplies `variant`/`landingIngressFlag` to panel from here (`:329`). Sequence: resolve R1 → D2 edit → C2 prop wiring. |
| `test-question-client.tsx` | A(stale ref), B, C1, C2 | B/C1/C2-call all committed. Only possible edit: pass new props to `<TestResultPanel>` at `:329` (C2, after R1). |
| `test-result-panel.tsx` | A, C2 | A committed (`:46-54`). C2 = add props + mount `useEffect` (after R1). Single edit pass in C2. |
| `telemetry/runtime.ts` | C2, E | C2 adds `trackResultViewed` (after R1) → **then** E asserts it. Strict order C2→E. |
| `telemetry/types.ts`, `telemetry/validation.ts` | A, C2 | Fully committed. Edit only if R1 chooses option (c) (Gold-Standard change — needs approval). |
| `use-test-entry-orchestrator.ts` | A, B | Fully committed. No edit unless R3/R5 authorize refactor. |
| `instruction-overlay.tsx` | B | Committed. No edit unless R5 authorizes redesign to `overlayMode` prop. |
| `check-phase11-telemetry-contracts.mjs` | E | Last file edited in the session. Ask-First (R7). `trackResultViewed` clause coupled to R1. |
| `test-run-reducer.test.ts` / telemetry/e2e tests | A, D2, C2, E | Regression-update only where D2/C2 change behavior; A/B/C1/D1 tests must stay green untouched. |

**Recommended global ordering:** Resolve **R1, R3, R5, R6, R7** (human decisions) → Wave D2 → Wave C2 (if R1 ≠ defer) → Wave E → final `npm run qa:rules`. Waves A/B/C1/D1 require **no edits** (verification gates only).

---

## Consolidated Decisions Required Before Any Editing

| ID | Decision | Recommendation |
|---|---|---|
| **R1** | `result_viewed` `derived_type` is mandatory in committed contract but is deferred 2位 scope; Decision H wants `{variant}` minimal | **Defer `trackResultViewed` + panel fire to 2位 session**; do C2 types/validation only (already done) |
| **R2** | Most Wave A/B/C1/D1 scope is already committed | Confirm session intent = verify + close gaps (not re-implement) |
| **R3** | `RESET_SCORING_ANSWERS` payload: Decision C Option P vs committed `{firstScoringCanonicalIndex, qualifierAnswers}` | Ratify committed contract; amend Decision C |
| **R5** | Chip 24-char truncation + render-condition vs committed full-label | Decide truncate-now vs ratify |
| **R6** | `hasAllRequiredAnswers` refactor location (reducer signature vs controller) | Controller via `resolveScoringProgress` (keeps reducer pure) |
| **R7** | `scripts/qa/*` is Ask-First | Confirm anchor before Wave E edit |

No files were modified. Awaiting decisions on R1–R7 before any implementation begins.
