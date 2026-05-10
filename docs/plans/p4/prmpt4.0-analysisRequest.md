R4.0 첫 번째 분석 요청 프롬프트

## Analysis Goal

Analyze the structural refactoring candidates in `src/features/test/test-question-client.tsx` and its collaborators, with the goal of extracting a focused run controller, converting answer storage keys from UI ids to canonical indexes, adding a tail-reset invariant on backward navigation, and relocating telemetry call sites — all without changing any observable behavior.

The following changes are confirmed in scope for this refactoring:

1. Extract question runtime state and handlers into a dedicated hook (`use-test-run-controller.ts`)
2. Convert `answers` keys from UI id (`q1`, `q2`) to canonical index string (`"1"`, `"2"`)
3. Implement tail reset: navigating to a previous question deletes answers for the current and all subsequent questions
4. Move `trackAttemptStart` and `trackFinalSubmit` calls into the new controller
5. Update `scripts/qa/check-phase10-transition-contracts.mjs` and `scripts/qa/_path-config.mjs` accordingly
6. Write `test:{variant}:responses` to localStorage during the run (storage write only — resume loading is deferred to Phase 4/5)

The following are explicitly OUT OF SCOPE for this refactoring:

- Delayed auto-advance (answer selection → auto-navigate after 150ms) — deferred to Prompt 2 (UX/UI phase)
- Qualifier Question integration into Instruction Overlay — deferred to Prompt 4
- Active-run resume (reading `test:{variant}:activeRun` on bootstrap) — deferred to Phase 4/5
- Phase-integrated reducer (`'booting' | 'instruction' | 'active' | 'submitted'`) — deferred to Phase 4/5
- Any change to `entry-policy.ts`, `instruction-overlay.tsx`, or `src/features/test/domain/`
- Any change to telemetry event semantics or payload structure

Do NOT implement anything. Produce an analysis document only.

---

## Files to Explore First

Primary:
- `src/features/test/test-question-client.tsx`
- `src/features/test/question-bank.ts`
- `src/features/test/storage/test-storage-keys.ts`
- `src/features/test/storage/active-run.ts`

Supporting:
- `src/features/test/entry-policy.ts`
- `src/features/transition/store.ts`
- `src/features/telemetry/runtime.ts`

Test files:
- `tests/unit/test-question-bootstrap.test.ts`
- `tests/unit/test-entry-policy.test.ts`
- `tests/e2e/consent-smoke.spec.ts`
- `tests/e2e/theme-matrix-smoke.spec.ts`

QA scripts:
- `scripts/qa/check-phase10-transition-contracts.mjs`
- `scripts/qa/_path-config.mjs`
- `scripts/qa/_utils.mjs`

Docs:
- `docs/req-test.md` (§4.3, §6.1, §12.2)
- `docs/req-test-plan.md` (Part 4/5)
- `docs/project-analysis.md` (§5.5, §6)

---

## Code Evidence to Verify

For each item below, locate the actual code, confirm it exists, and report file + line ranges.

### 1. Current state inventory in `test-question-client.tsx`

List every `useState` and `useRef` call. For each:
- What does it track?
- Is it purely question-runtime state (index, answers, submitted), purely entry-phase state (instructionSeen, entryCommitted, redirecting), or mixed/defensive (started, runtimeEntryCommittedRef)?
- Which of the following categories does it fall into?
  - **Run state** — belongs in the new `use-test-run-controller`
  - **Entry phase** — stays in the client component
  - **Defensive flag** — can be eliminated or simplified after extraction

### 2. `resolveQuestionBootstrapState` export boundary

Confirm:
- Is `resolveQuestionBootstrapState` currently exported from `test-question-client.tsx`?
- Is it consumed by `test-question-bootstrap.test.ts` via direct import from that file?
- Does it reference any React primitives or side effects, or is it a pure function that can move without change?
- What would need to change in `test-question-bootstrap.test.ts` if this function moves to a separate module?

### 3. Answer key usage — full call site map

For the `answers` field in `runtimeState` (currently keyed by `question.id`, e.g. `q1`, `q2`):

- List every location in `test-question-client.tsx` where answers are written (keyed by `question.id`)
- List every location where answers are read back using `question.id` as the key
- Confirm the exact expression used for `currentAnswer` derivation
- Confirm the exact expression used for `allAnswered`
- Confirm that `buildCanonicalFinalResponses` is the only place that currently converts to canonical index keys, and that it is exported and tested in `test-question-bootstrap.test.ts`
- After conversion, `answers` will be keyed by `String(question.canonicalIndex)`. Identify every line that would need updating.

### 4. Tail reset — current `moveQuestion` behavior

Confirm:
- The exact body of `moveQuestion(direction: -1 | 1)`, including the `settleCurrentQuestionDwell` call, the `setRuntimeState` update, and the guard conditions
- Whether `moveQuestion(-1)` currently preserves all existing answers without modification
- What the expected post-tail-reset state would be: answers for questions at indexes > (currentIndex - 1) must be deleted. Confirm whether this means "answers at indexes ≥ currentIndex before navigation" (i.e., the question the user is leaving plus all later ones) or "answers at indexes > (currentIndex - 1)" (i.e., only questions after the destination)
- Whether `settleCurrentQuestionDwell` should still run before tail reset on backward navigation, or whether dwell for a discarded question should be excluded

### 5. `trackAttemptStart` and `trackFinalSubmit` — current call sites and payload construction

For `trackAttemptStart`:
- Confirm its current call site (file, line), which `useEffect` it lives in, and the full payload it receives
- Confirm which variables it closes over from the component scope
- Confirm what the `attemptStartedRef` guard does and whether it would be needed inside the controller or could be replaced by a state check

For `trackFinalSubmit`:
- Confirm its current call site inside `handleSubmit`
- Confirm the full payload, especially how `finalResponses` is constructed at that point
- After canonical index conversion, confirm whether `buildCanonicalFinalResponses` would still be needed, or whether `finalResponses` could be derived directly from the canonical-keyed `answers` object

### 6. `consumeLandingIngress` and `markInstructionSeen` — current call sites

Confirm:
- Where `consumeLandingIngress(variant)` is called in `test-question-client.tsx` and what condition gates it
- Where `markInstructionSeen(variant)` is called and through which path (`executeInstructionAction`)
- Whether either call belongs in the new run controller or must remain in the client component (because it is tied to entry-phase logic, not question-runtime logic)
- How `check-phase10-transition-contracts.mjs` currently tests for these identifiers: does it check for the identifier string anywhere in the file, or does it require the call to originate from a specific scope?

### 7. `test:{variant}:responses` write — current status

Confirm:
- Whether `test:{variant}:responses` is currently written anywhere during the question runtime (i.e., on each `updateAnswer` call or on submit)
- Whether `src/features/test/storage/active-run.ts` exports a write function for this key or only a read/clear function
- What the expected write format is: `Record<string, 'A' | 'B'>` keyed by canonical index string, or another shape
- Confirm whether writing on every answer update or only on submit is the right strategy given the deferred resume implementation

### 8. `check-phase10-transition-contracts.mjs` — pattern check scope

Read the script carefully and list:
- Every file path it checks for existence
- Every identifier it checks for in `test-question-client.tsx` specifically (via regex)
- Whether the check is "identifier exists somewhere in this file" or "identifier is called with specific arguments"
- Which checks would fail if `trackAttemptStart`, `trackFinalSubmit`, `consumeLandingIngress`, or `markInstructionSeen` move to a new file
- What the minimal update to the script would be to make it pass after extraction: (a) check the new file path instead, (b) check both files, or (c) check for a re-export or thin reference in `test-question-client.tsx`

### 9. `test-question-bootstrap.test.ts` — impact of extraction

Confirm:
- Every import from `test-question-client.tsx` in this test file (function names, types)
- Which of those imports are pure utility functions (`resolveQuestionBootstrapState`, `buildCanonicalFinalResponses`, `resolveScoringProgress`) vs React component exports
- After extraction, which imports would need to change their source path
- Whether the test file's assertions on `answers` object shape (e.g. `{q1: 'A'}`) would need to be updated after canonical index conversion

### 10. `theme-matrix-smoke.spec.ts` and `consent-smoke.spec.ts` — behavioral boundary

Confirm:
- What state `theme-matrix-smoke.spec.ts` captures for the `test-question` route: specifically, which `data-entry-status` attribute value is expected, and whether the Next button's `disabled` state is asserted
- Whether any `consent-smoke.spec.ts` assertion depends on the `data-entry-status` attribute or on the text/presence of navigation buttons
- Whether the extraction of run state into a controller (with no observable behavior change) would affect either spec's assertions

---

## Refactoring Candidate Verification Criteria

For each confirmed scope item, verify:

- **Extraction boundary**: what inputs (params/props) and outputs (return values/callbacks) would the new `use-test-run-controller` hook expose? List every value the client component currently reads from `runtimeState` or derived from it.
- **Side effect ownership**: which side effects (sessionStorage reads, localStorage writes, telemetry calls, transition completions) must run inside the controller vs. must remain in the client `useEffect`?
- **Incremental safety**: can the extraction be done in a single atomic change, or does the canonical index conversion need to land first as a separate step?
- **Test breakage surface**: for each changed file, list which specific assertions in unit or E2E tests would fail immediately after the change.

---

## Exclusions

- Do NOT analyze `entry-policy.ts`, `instruction-overlay.tsx`, or anything in `src/features/test/domain/`
- Do NOT analyze delayed auto-advance, answer selection animation, or progress bar visual changes
- Do NOT analyze active-run resume (loading from localStorage on bootstrap)
- Do NOT analyze qualifier question integration into the overlay
- Do NOT propose changes to telemetry event payload structure or semantics
- Do NOT analyze `schema-registry.ts` or `response-projection.ts`

---

## Test / QA Impact Analysis

For each confirmed scope item, report:

1. **Existing test coverage**: which test file currently covers this behavior, and at what level (unit / E2E)?
2. **Tests requiring update**: list the specific test file + assertion that would break, and what the update would be
3. **Tests to add**: what new unit tests would be needed to cover the extracted controller in isolation? Specifically:
   - Tail reset: answer state after `NAVIGATE_PREVIOUS` from Q3 when Q2 and Q3 are answered
   - Canonical index write: verify `answers["2"]` rather than `answers["q2"]` after selection
   - `trackAttemptStart` call: verify it fires exactly once regardless of re-renders
   - `trackFinalSubmit` payload: verify `finalResponses` uses canonical index keys
4. **Screenshot baseline impact**: would any of the confirmed scope changes affect the `data-entry-status` attribute, button `disabled` state, or progress bar value captured by `theme-matrix-smoke.spec.ts`? Answer per scope item.
5. **QA script impact**: for `check-phase10-transition-contracts.mjs` and `_path-config.mjs`, state the exact line(s) that would need to change and what the replacement would look like.
6. **Doc sync**: does `docs/project-analysis.md §5.5` or `docs/req-test.md §4.3 / §12.2` describe any behavior that would change? If so, note the section and the required wording update.

---

## Output Format

Produce a markdown document with the following sections:

### Summary
One paragraph: what is structurally suboptimal in the current `test-question-client.tsx` that this refactoring addresses, and what the expected state will be after all confirmed scope items are applied.

### State inventory table
A table with columns: State variable | Type | Category (Run / Entry / Defensive) | Extraction target (controller / client / eliminate)

### Candidate: [Name]
For each of the 6 confirmed scope items (controller extraction, canonical index conversion, tail reset, telemetry relocation, QA script update, responses write):

- **Current location**: file + line range
- **Description**: what the code does today
- **Code evidence**: key identifiers, expressions, call sites
- **Proposed change**: what moves, what stays, what is eliminated
- **Extraction boundary**: inputs / outputs of the extracted unit
- **Incremental order**: can this land independently, or does it require another item first?
- **Risk level**: Low / Medium / High + reason
- **UX impact**: None / Indirect / Direct — and explanation
- **Observable behavior change**: Yes / No — and if No, explain why the external contract is preserved
- **Test coverage**: existing / needs update (specific assertion) / needs addition (specific case)
- **Screenshot baseline impact**: Yes / No / Inspect — and reason
- **QA script impact**: which script, which line, what change
- **Doc sync needed**: Yes / No — which section

### Proposed `use-test-run-controller` API sketch
A TypeScript interface sketch showing:
- Input parameters (what the hook receives from the client)
- Returned state values
- Returned callbacks
- Internal side effects it owns

This is a draft for discussion, not a final implementation spec.

### Extraction order recommendation
A numbered list of the safest implementation sequence for the 6 scope items, with a one-sentence rationale for each ordering decision.

### Open questions
Any ambiguity discovered during analysis that would require a decision before the implementation plan is written. Keep to genuine blockers — do not list items already decided in the confirmed scope.
