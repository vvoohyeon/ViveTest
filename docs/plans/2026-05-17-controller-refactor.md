# Plan: Controller Responsibility Extraction + Target 7 Coverage Bundle

> Status: **COMPLETED — Approved plan implemented and final gates passed on 2026-05-17.**
> 7 decision points (DP-1 … DP-7) were resolved as documented before implementation. Wave D remained skipped by DP-5.

- **Session name**: Controller Responsibility Extraction
- **Session type**: Structural refactoring + coverage expansion (no observable production behavior change)
- **Date**: 2026-05-17
- **Final gate sequence**: `npm run lint` → `npm run typecheck` → `npm test` → `npm run build` → `npm run qa:rules` → `npx playwright test tests/e2e/consent-smoke.spec.ts tests/e2e/qualifier-overlay.spec.ts` → `git diff --check`
- **Package manager**: npm
- **Baseline state**: Orchestrator Extraction COMPLETE (HEAD `0d9cb9b` "Extract test orchestrator hooks and add tests"). Stated baseline 459/459 tests, qa:rules 12/12, all gates green. Working tree clean at session start.
- **SSOT contract (AGENTS.md §2 — test flow / domain)**: `docs/req-test.md`, `docs/req-test-plan.md`; Project rules `docs/agent-guides/project-rules.md §TestFlow`; Verify `docs/agent-guides/verification-commands.md §test-flow`.
- **Ask-First path in scope (AGENTS.md §4)**: `scripts/qa/*.mjs` (Wave E-1), `scripts/qa/_path-config.mjs` (Wave E-1). Authorized by session instruction §8; itemized below.
- **Frozen perimeter (untouched)**: `src/features/test/domain/**`, `schema-registry.ts`, `response-projection.ts`, `src/messages/**`, `docs/plans/**` (except this doc), `src/features/test/use-test-entry-orchestrator.ts`.

---

## Implementation Outcome (2026-05-17)

- **Completed waves**: A (`useTestRunBootstrap` extraction), B (`useQuestionDwell` extraction), C (3 helper exports in `question-runtime-utils.ts`), E-1 (Phase 10/11 QA script extensions), E-2 (EGTT qualifier consent intersection E2E coverage).
- **Skipped wave**: D, unchanged from DP-5 because no return-shape cleanup candidate was identified.
- **Production behavior**: preserved; `consumeLandingIngress` stayed in the controller active-entry effect, telemetry stayed in the controller/client surfaces, and the `useTestRunController` 21-field return shape stayed unchanged.
- **Regression coverage**: unit coverage increased to 462 tests; focused Playwright coverage includes `consent-smoke.spec.ts` and `qualifier-overlay.spec.ts`.
- **Docs impact**: no SSOT contract document outside this plan needed a behavior update; this file is the implementation outcome record.

### Final Verification Evidence

| Command | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 70 files / 462 tests |
| `npm run build` | PASS |
| `npm run qa:rules` | PASS — 12 contract checks |
| `PATH="/opt/homebrew/bin:$PATH" npx playwright test tests/e2e/consent-smoke.spec.ts tests/e2e/qualifier-overlay.spec.ts` | PASS — 32 tests |
| `git diff --check` | PASS |

---

## Pre-Edit Analysis (PA-1 — PA-8)

### PA-1 — Exact current return shape of `useTestRunController`

Source: `src/features/test/use-test-run-controller.ts:412-434`. Interface declared at `:46-68`.

| # | Field | Type | Origin |
|---|-------|------|--------|
| 1 | `runtimeReady` | `boolean` | computed: `runState.phase !== 'booting'` |
| 2 | `runPhase` | `TestRunPhase` | state: `runState.phase` |
| 3 | `landingIngressFlag` | `boolean` | state: `runState.landingIngressFlag` |
| 4 | `instructionSeen` | `boolean` | state: `runState.instructionSeen` |
| 5 | `currentQuestionIndex` | `number` | computed: `skipForwardPastProfile(runState.currentQuestionIndex, questions)` when active/submitted, else `runState.currentQuestionIndex` (`:275-278`) |
| 6 | `started` | `boolean` | computed: `isRuntimeActive(runState) \|\| isRuntimeSubmitted(runState)` |
| 7 | `submitted` | `boolean` | computed: `isRuntimeSubmitted(runState)` |
| 8 | `currentQuestion` | `ResolvedQuestion \| null` | computed: `questions[currentQuestionIndex - 1] ?? questions[0] ?? null` (`:279`) |
| 9 | `currentAnswer` | `'A' \| 'B' \| undefined` | computed from `runState.answers[currentQuestion.canonicalIndex]` (`:281-282`) |
| 10 | `allAnswered` | `boolean` | computed: `scoringProgress.total > 0 && scoringProgress.answered === scoringProgress.total` |
| 11 | `scoringProgress` | `ScoringProgress` | computed: `resolveScoringProgress({questions, answers: buildSemanticAnswerMap(runState.answers)})` (`:280`) |
| 12 | `totalQuestions` | `number` | computed: `questions.length` |
| 13 | `answers` | `Record<string,string>` | state: `runState.answers` |
| 14 | `pendingTransitionId` | `string \| null` | state: `pendingTransitionId` (`useState`, `:142`) |
| 15 | `dispatchRunAction` | `Dispatch<TestRunAction>` | reducer dispatch (`:134`) |
| 16 | `clearPendingTransitionId` | `() => void` | callback (`:407-410`), mutates `pendingTransitionIdRef` + setter |
| 17 | `updateAnswer` | `(choice: SemanticAnswer) => void` | callback (`:297-312`) |
| 18 | `moveQuestion` | `(direction: -1\|1, choiceOverride?) => void` | callback (`:314-363`) |
| 19 | `handleSubmit` | `() => void` | callback (`:365-388`) |
| 20 | `resetScoringAnswers` | `(qualifierAnswers: Record<string,string>) => void` | `useCallback` (`:390-400`) |
| 21 | `getCurrentDwellMs` | `() => number` | `useCallback` reading `dwellStartRef` (`:402-405`) |

### PA-2 — Client destructuring (`test-question-client.tsx:75-97`)

All **21** fields are destructured at the single call site `useTestRunController({variant, locale, pathname, questions, qualifierItems})` (`:97`). Non-destructuring reference counts (measured): every field has ≥1 real usage in the client body/JSX. **No unused field exists.** Fields with exactly one downstream reference (`runPhase`, `allAnswered`, `totalQuestions`, `dispatchRunAction`, `updateAnswer`, `handleSubmit`, `resetScoringAnswers`, `getCurrentDwellMs`) are each genuinely consumed (passed to children / used in JSX / effects). → **No removal candidate. No misnamed field. No safe restructure candidate that respects core invariant 2.** (Feeds PA-8.)

### PA-3 — `useTestRunBootstrap` ownership map

**Bootstrap `useEffect` is `:144-221`.** Two branches: (a) StrictMode replay cache path `:145-160` (re-dispatch from `bootstrapStateRef.current`); (b) full hydration `:162-220`.

Storage / pure reads performed **inside the bootstrap effect** (these move into the hook):

| Symbol | Source module | Line | Actual name (≠ session-spec generic name) |
|--------|---------------|------|-------------------------------------------|
| `readPendingLandingTransition` | `@/features/transition/store` | 162, 170 | — |
| `terminatePendingLandingTransition` | `@/features/transition/runtime` | 164 | — |
| `readLandingIngress` | `@/features/transition/store` | 171 | — |
| `getActiveRun` | `@/features/test/storage/active-run` | 172 | session spec called this `readActiveRun` |
| `readResponseSet` | `@/features/test/storage/response-set` | 173 | — |
| `hasValidQualifierAnswers` | `@/features/test/qualifier-resume-validator` | 175 | — |
| `hasSeenInstruction` | `@/features/transition/store` | 179 | session spec called this `readInstructionSeen` |
| `volatilizeRunData` | `@/features/test/storage/volatility` | 182 | — |
| `clearInstructionSeen` | `@/features/transition/store` | 204 | — |
| `buildBootstrapResponseSet` | local helper (`:94-113`) | 187 | migrated in Wave C (DP-4) |
| `resolveQuestionBootstrapState` | `@/features/test/question-runtime-utils` | 189 | stays in utils; hook imports |

> **`consumeLandingIngress` is NOT in the bootstrap effect.** It is called at `:242`, inside the **active-entry effect (`:223-272`)**, gated on `runState.entryMode === 'new' && runState.landingIngressFlag` (post-`COMMIT_ENTRY`). The session spec's PA-3 enumeration listing `consumeLandingIngress` as a bootstrap-owned read is **incorrect against the actual code**. → see **DP-1**.

Refs:
- `bootstrapStateRef` (`:140`) — used only across the two bootstrap-effect invocations (StrictMode replay cache). **Moves fully into the hook.**
- `pendingTransitionIdRef` (`:141`) — written at `:207`, read at `:157`, **also read by `clearPendingTransitionId` (`:408`) which is returned to the client**. → stays owned by controller; passed into the hook as a param + `onPendingTransitionIdChange` callback (matches session spec interface sketch).
- `processedEntrySequenceRef` (`:139`) — used **only** in the active-entry effect (`:224`, `:228`), never in the bootstrap effect. → **stays in controller** (per session spec conditional).

What the hook dispatches: `dispatchRunAction({type: 'BOOTSTRAP_COMPLETE', …})` via `queueMicrotask` (`:147-158`, `:209-220`) and calls `setPendingTransitionId(…)` (the `onPendingTransitionIdChange` callback). It does **not** dispatch `COMMIT_ENTRY` or telemetry.

**Hook return shape:** the controller's active-entry effect (`:223-272`) and all callbacks read **only** `runState.*` (reducer state) + props (`questions`, `locale`, `pathname`, `variant`, `variantId`) — never `bootstrapStateRef`. Therefore the bootstrap hook can be a near-pure side-effect hook. Proposed:

```ts
interface UseTestRunBootstrapParams {
  variant: string;
  variantId: VariantId;            // asVariantId(variant), computed in controller
  locale: AppLocale;
  pathname: string;
  questions: ReadonlyArray<ResolvedQuestion>;
  qualifierItems: ReadonlyArray<QualifierOverlayItem>;
  dispatchRunAction: Dispatch<TestRunAction>;
  pendingTransitionIdRef: MutableRefObject<string | null>;
  onPendingTransitionIdChange: (id: string | null) => void;
}
type UseTestRunBootstrapResult = void;   // pure side-effect hook
```

8 params — under the 10-param circuit breaker (session §11). `UseTestRunBootstrapResult = void` (session sketch allowed an empty result; nothing in the controller consumes bootstrap return values).

### PA-4 — `useQuestionDwell` ownership map

- `dwellStartRef` (`:137`), `dwellByQuestionRef` (`:138`) — private timing refs, no reducer/storage interaction.
- `getCurrentDwellMs` (`:402-405`) — `dwellStartRef.current !== null ? max(0, now - dwellStartRef.current) : 0`. Stays exposed.
- `settleCurrentQuestionDwell` (`:287-295`) — inline closure. **Keys `dwellByQuestionRef.current` by `currentQuestion.id` (the question id string), NOT by canonicalIndex.** Reads `currentQuestion` from closure. Resets `dwellStartRef` to `Date.now()` after settling (`:294`).
- `handleSubmit` consumption: `settleCurrentQuestionDwell()` then `Object.values(dwellByQuestionRef.current).reduce((s,v)=>s+v,0)` for `dwellMsAccumulated` (`:370-371`).
- `moveQuestion` consumption: `settleCurrentQuestionDwell()` at `:319`.
- `dwellStartRef.current = Date.now()` also set on active entry at `:259` (active-entry effect).

→ Extraction feasible. **`dwellByQuestionRef` stays internal** (only `accumulatedDwellMs()` exposes its sum; controller never reads the map directly). **DP-2**: the session-suggested `settleDwell(canonicalIndex: number)` signature conflicts with the actual `question.id` keying. Preserving behavior requires `settleDwell(question: ResolvedQuestion | null): number`. `resetDwellForQuestion()` maps to the `:259` reset on active entry; the post-settle reset stays inside `settleDwell`.

Proposed hook:
```ts
function useQuestionDwell(): {
  getCurrentDwellMs: () => number;
  settleDwell: (question: ResolvedQuestion | null) => number;  // DP-2 deviation
  resetDwellForQuestion: () => void;
  accumulatedDwellMs: () => number;
};
```
Controller after Wave B: `handleSubmit` → `settleDwell(currentQuestion)` + `accumulatedDwellMs()`; `moveQuestion` → `settleDwell(currentQuestion)`; active-entry effect `:259` → `resetDwellForQuestion()`; `getCurrentDwellMs` returned through from the hook.

### PA-5 — Profile-skip / response-filter local helpers (Wave C)

| Helper | Lines | Call sites | Equivalent in `question-runtime-utils.ts`? | Decision |
|--------|-------|-----------|---------------------------------------------|----------|
| `skipForwardPastProfile` | 72-81 | 231, 277, 352, 353 | None (`findFirstScoringQuestion` returns *first scoring*, not "skip profiles from arbitrary index"). Parallel profile contract risk. | **ADD** to utils + unit test |
| `skipBackwardPastProfile` | 83-92 | 322 | None. Parallel profile contract risk. | **ADD** to utils + unit test |
| `buildBootstrapResponseSet` | 94-113 | 187 (bootstrap effect → moves to hook in Wave A) | None (`filterResponseSetForQuestions` lacks qualifier-default-to-'A' logic). Parallel qualifier contract risk. | **ADD** to utils + unit test (**DP-4** sequencing) |
| `buildSemanticAnswerMap` | 115-125 | 280 only | Partial: `resolveScoringProgress` already re-filters via `hasSemanticAnswer` internally (`:138`); this is a redundant type-narrowing adapter, single call site, **no parallel contract risk** | **KEEP INLINE** (do not migrate) — **DP-3** |

None of the moves break a currently-passing test (helpers are not directly imported by any test; behavior preserved). `question-runtime-utils.ts` additions are **additive only** (no existing signature altered) per session §11.

### PA-6 — Phase 10 QA script (`check-phase10-transition-contracts.mjs`)

- The script is **filename-based**: Block 2 (`:82-93`) does `if (fileExists(test.runController)) { const runController = read(test.runController); … }` and asserts `consumeLandingIngress` (`:86-88`), `trackAttemptStart` + `trackFinalSubmit` (`:90-92`) appear **in `use-test-run-controller.ts`**.
- `consumeLandingIngress`, `trackAttemptStart`, `trackFinalSubmit` all live in the controller's **active-entry effect / handleSubmit**, which Wave A keeps in the controller. **None of the three move.** → **Phase 10 Block 2 stays GREEN with zero edits.** The session spec's anticipated "relocate `consumeLandingIngress` assertion to bootstrap file" companion edit is **NOT required** (its premise — ingress moving — is false; see DP-1).
- Block 1 (`:46-52`) checks `test.questionClient`; Block at `:54-62` checks `test.entrySideEffects`; reducer block `:64-80` checks `test.runReducer`. None affected by Waves A–D.

### PA-7 — Phase 11 QA script (`check-phase11-telemetry-contracts.mjs`)

- Lines 120-148 assert `trackQuestionAnswered` / `trackResultViewed` exist in `telemetry.runtime` (`src/features/telemetry/runtime.ts`); lines 150-162 assert them in `telemetry.validation` (`src/features/telemetry/validation.ts`). **These files are frozen-perimeter-adjacent and untouched by Waves A–D.** No assertion in this script references `use-test-run-controller.ts`. → **Phase 11 cannot fail from Waves A–C.**

### PA-8 — Wave D return-shape candidates

From PA-1 + PA-2: zero unused fields, zero misnamed fields, no restructure achievable within "≤5 client lines per field" that also honors **core invariant 2** ("`test-question-client.tsx` must require ZERO changes to its import list and destructuring"). → **No concrete improvement identified.** **Wave D = SKIPPED (no improvements identified)** — **DP-5**.

---

## Decision Points (resolved before implementation)

Outcome: DP-1 through DP-7 were confirmed as recommended before code edits began. The original confirmation prompts below are retained as the decision record.

### DP-1 — BLOCKING: `consumeLandingIngress` vs Wave A gate (session-spec inconsistency)

**Conflict:** Session §3 Wave A *gate* requires
`grep -n "readActiveRun\|readResponseSet\|hasValidQualifierAnswers\|consumeLandingIngress" use-test-run-controller.ts` → **zero matches**.
But `consumeLandingIngress` is in the **active-entry effect (`:242`)**, which session §3 explicitly says *stays in the controller*. Moving it into the bootstrap hook would change *when* ingress is consumed (mount-time vs post-`COMMIT_ENTRY` new-entry) — an **observable behavior change**, forbidden by the session's core invariant ("no observable behavior change") and §11.

**Recommended resolution (Option A):** Keep `consumeLandingIngress` in the controller's active-entry effect. Replace the Wave A gate grep with the **actual bootstrap-effect storage reads**:
`grep -n "getActiveRun\|readResponseSet\|hasValidQualifierAnswers\|hasSeenInstruction" use-test-run-controller.ts` → must be zero (or import-line only). Phase 10 Block 2 stays green unchanged; no ingress-assertion relocation; no `consumeLandingIngress` companion edit.
- Option B (rejected): move whole active-entry effect into hook — contradicts §3, risks behavior change.
- Option C (rejected): move only the `consumeLandingIngress` call — behavior change (timing), violates core invariant.

→ **User must confirm Option A (amended Wave A gate) before Wave A begins.**

### DP-2 — `settleDwell` signature: `(question: ResolvedQuestion | null)` not `(canonicalIndex: number)`
Dwell map keys by `question.id`. Preserving behavior requires the question object/id, not canonicalIndex. Recommend accepting the deviation. **Confirm.**

### DP-3 — Wave C scope: migrate 3 of 4 helpers
Migrate `skipForwardPastProfile`, `skipBackwardPastProfile`, `buildBootstrapResponseSet`; **keep `buildSemanticAnswerMap` inline** (single call site, trivial adapter, no parallel-contract risk; session §5 forbids trivial-one-liner moves). **Confirm.**

### DP-4 — Wave A/C sequencing for `buildBootstrapResponseSet`
`buildBootstrapResponseSet` is consumed by the bootstrap effect that Wave A relocates into `use-test-run-bootstrap.ts`. Plan: Wave A moves the call with the effect (helper temporarily lives in/with the hook); Wave C migrates the helper into `question-runtime-utils.ts` and the bootstrap hook imports it. **Confirm ordering.**

### DP-5 — Wave D skipped
No unused/misnamed/safely-restructurable fields; core invariant 2 forbids client churn. **Confirm skip.**

### DP-6 — Wave E-2 scope change (overlap with `qualifier-overlay.spec.ts`)
The session's 3 proposed consent-smoke cases are **already fully covered** by `qualifier-overlay.spec.ts`:
- Case 1 (entry → qualifier → scoring) ≈ `qualifier-overlay.spec.ts:147,162`
- Case 2 (chip visible + label) ≈ `qualifier-overlay.spec.ts:222`
- Case 3 (chip reentry, cancel keeps answers) ≈ `qualifier-overlay.spec.ts:231,244`

`consent-smoke.spec.ts` currently has **zero** EGTT/qualifier coverage. The genuinely additive, non-overlapping value is the **consent-contract × EGTT-qualifier intersection** (e.g., `landing UNKNOWN available` → EGTT instruction → qualifier selection → scoring start; and Deny-and-Abandon from an EGTT qualifier variant), which is `consent-smoke`'s domain and absent from `qualifier-overlay.spec.ts`. **Recommendation:** add 1 new `test.describe('EGTT qualifier consent path')` block with 2 consent-intersection cases; skip the 3 duplicate cases (documented overlap per session §7). **Confirm revised Wave E-2 scope.**

### DP-7 — Phase 10 companion edits actually needed (vs session §8 list)
Authorized §8 edits, reconciled with PA-6:
1. `_path-config.mjs`: **ADD** `testRunBootstrap: 'src/features/test/use-test-run-bootstrap.ts'` — **needed**.
2. `check-phase10-transition-contracts.mjs`: **ADD** new block — assert `use-test-run-bootstrap.ts` exists (`fileExists`) + contains `dispatchRunAction` — **needed**. *Relocating the `consumeLandingIngress` assertion is NOT needed* (DP-1/PA-6: ingress stays in controller).
3. `check-phase11-telemetry-contracts.mjs`: **ADD** `isAnswerLocked` call-site assertion + `trackQuestionAnswered` call-site assertion against `test.questionClient` — **needed** (both patterns confirmed present: `test-question-client.tsx:72,239,429,441` and `:246`). Note: after a future Target-1 session these may need re-homing — annotated in-script.

**Confirm DP-7 companion-edit set.**

---

## Scope Table

| Wave | Target | Effort | Behavior change? | Status |
|------|--------|--------|------------------|--------|
| A | Extract `useTestRunBootstrap` (`use-test-run-bootstrap.ts`) | M | No | **DONE** |
| B | Extract `useQuestionDwell` (`use-question-dwell.ts`) | S | No | **DONE** |
| C | Migrate 3 helpers → `question-runtime-utils.ts` | M | No | **DONE** |
| D | Return-shape cleanup | S | No | **SKIPPED (no improvements identified)** — DP-5 |
| E-1 | Phase 10/11 QA script extensions | S | No | **DONE** |
| E-2 | E2E EGTT qualifier × consent intersection in `consent-smoke.spec.ts` | S–M | No | **DONE** |

---

## Per-Wave Detail

### Wave A — `useTestRunBootstrap`
- **New file:** `src/features/test/use-test-run-bootstrap.ts` (single named export `useTestRunBootstrap`, est. ~120–150 lines, within 30–500 bounds, no barrel edit, no new deps).
- **Moves:** bootstrap `useEffect` (`:144-221`) incl. StrictMode replay cache branch; `bootstrapStateRef`; all PA-3 bootstrap-effect reads; the `buildBootstrapResponseSet` call (helper migrated in Wave C — DP-4).
- **Stays in controller:** active-entry effect (`:223-272`), `processedEntrySequenceRef`, `pendingTransitionIdRef` (passed in), `consumeLandingIngress` (DP-1), all telemetry.
- **Controller change:** replace effect with `useTestRunBootstrap({...8 params})`.
- **Files changed:** `use-test-run-controller.ts` (M), **new** `use-test-run-bootstrap.ts`.
- **Gate:** `npm test` (≥459, zero assertion changes; controller test mocks already cover all moved deps) **+ amended grep (DP-1 Option A)**.

### Wave B — `useQuestionDwell`
- **New file:** `src/features/test/use-question-dwell.ts` (single named export, est. ~40–60 lines).
- **Moves:** `dwellStartRef`, `dwellByQuestionRef`, `getCurrentDwellMs`, settle/reset/accumulate logic. `dwellByQuestionRef` stays internal.
- **Controller change:** `handleSubmit`/`moveQuestion`/active-entry-`:259`/returned `getCurrentDwellMs` rewired (DP-2 signature).
- **Files changed:** `use-test-run-controller.ts`, **new** `use-question-dwell.ts`.
- **Gate:** `npm test` (≥459); `grep -n "dwellStartRef\|dwellByQuestionRef" use-test-run-controller.ts` → zero.

### Wave C — Helper migration
- **Changed:** `question-runtime-utils.ts` (additive: 3 new exports), `use-test-run-controller.ts` (delete local helpers, import), `use-test-run-bootstrap.ts` (import `buildBootstrapResponseSet`), `tests/unit/test-question-bootstrap.test.ts` (add unit tests; count ≥ before).
- **Gate:** `npm test` (≥459); `grep -n "skipForwardPastProfile\|skipBackwardPastProfile\|buildBootstrapResponseSet" use-test-run-controller.ts` → zero / import-only. `buildSemanticAnswerMap` intentionally retained (DP-3).

### Wave D — SKIPPED (PA-8 / DP-5).

### Wave E-1 — QA script extensions (Ask-First, §8-authorized, DP-7)
- `_path-config.mjs`: add `testRunBootstrap` key.
- `check-phase10-transition-contracts.mjs`: add bootstrap-file existence + `dispatchRunAction` assertion block. **No** ingress-assertion relocation (PA-6).
- `check-phase11-telemetry-contracts.mjs`: add `isAnswerLocked` + `trackQuestionAnswered` call-site assertions vs `test.questionClient` (with Target-1 re-home annotation).
- **Gate:** `npm run qa:rules` → 12/12.

### Wave E-2 — E2E (DP-6 revised scope)
- `tests/e2e/consent-smoke.spec.ts`: **additive only.** New `test.describe('EGTT qualifier consent path')` with 2 consent-intersection cases (UNKNOWN-available EGTT instruction → qualifier → scoring start; Deny-and-Abandon from EGTT qualifier variant). 3 session-listed cases skipped as documented `qualifier-overlay.spec.ts` overlap. Style ref: `qualifier-overlay.spec.ts` + `consent-smoke.spec.ts` existing helpers.
- **Gate:** `npx playwright test consent-smoke qualifier-overlay` → all pass.

---

## Impact Assessment (AGENTS.md §7)
- **Shared components (shell/GNB):** none touched.
- **Localization:** none (no `src/messages/**`).
- **a11y:** none (no UI markup change; `isAnswerLocked` only asserted, not modified).
- **State contracts:** controller↔reducer dispatch contract preserved; `BOOTSTRAP_COMPLETE` payload unchanged; client return shape unchanged (Wave D skipped → core invariant 2 trivially held).
- **Core user flow:** test entry/resume/dwell/submit — behavior-preserving extraction; covered by `use-test-run-controller.test.ts` (no assertion edits) + new unit + new E2E.
- **High-Risk areas (§4):** none in change set. **Ask-First:** `scripts/qa/*.mjs` + `_path-config.mjs` (Wave E-1) — §8-authorized, itemized in DP-7.

## Risks & Mitigations
- **R1 — StrictMode double-bootstrap regression** (replay cache moves into hook). Mitigation: preserve `bootstrapStateRef` cache branch verbatim; `use-test-run-controller.test.ts:212` StrictMode test guards it (no edit).
- **R2 — `queueMicrotask`/`flushMicrotasks` timing** across hook boundary. Mitigation: keep `queueMicrotask` placement identical; controller test uses double `await Promise.resolve()` flush.
- **R3 — DP-1 misresolution** → behavior change. Mitigation: blocking confirmation before Wave A.
- **R4 — Wave C type widening** of `resolveScoringProgress` avoided by keeping `buildSemanticAnswerMap` inline (DP-3) → no existing-signature mutation (§11).
- **R5 — circuit breakers (§11):** all new files 30–500 lines, ≤10 params (PA-3: 8). If violated → halt + document.

## Verification Plan / Session-Final Gate
```
npm run lint
npm run typecheck
npm test            # ≥ 459 (Wave C + E add coverage)
npm run build
npm run qa:rules    # 12/12
npx playwright test consent-smoke qualifier-overlay
git diff --check
```
Per-wave gates as listed above; one wave at a time, verify before advancing (CLAUDE.md). STATE.md trigger watched (≥3-stage plan, Ask-First in remaining stages).

## Stable Controller Interface
Unchanged from PA-1 (Wave D skipped). The 21-field shape in PA-1 is the stable interface; `test-question-client.tsx` requires zero edits.

## Deferred Items
- Wave D return-shape cleanup — deferred indefinitely (PA-8: no candidates).
- Phase 11 `isAnswerLocked`/`trackQuestionAnswered` assertions may need re-homing after a future Target-1 (`test-question-client.tsx`) refactor — annotated in-script during E-1.
- Session-spec PA-3 wording ("`consumeLandingIngress` is a bootstrap read") should be corrected upstream; out of scope here (DP-1 documents the discrepancy).
