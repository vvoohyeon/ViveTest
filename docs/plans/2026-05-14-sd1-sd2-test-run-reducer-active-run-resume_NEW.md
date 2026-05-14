# SD-1/SD-2 Test Run Reducer and Active-Run Resume Plan

> **Status**: Pending implementation approval.
> **Execution model**: Implement sequentially in a fresh session: SD-1 first, verify, then SD-2. Do not use parallel agents, automated multi-wave execution, or source edits outside this plan.
> **Plan style**: This document avoids exact TypeScript definitions and line-by-line code. It records verified codebase insights, ownership boundaries, implementation direction, risk points, and validation scope so an implementer can start without broad rediscovery while retaining implementation discretion.

---

## 0. Revision Note

This plan was revised twice.

**First revision** corrected an earlier version that treated `src/features/test/use-test-entry-orchestrator.ts` as something to delete during SD-1. That direction is wrong. The file is a recent, intentional extraction that owns the entry-policy command path and entry-side effects. SD-1 keeps it and refactors it into a **reducer-aware adapter**.

**Second revision** absorbed implementation specifics from a companion prompt document — behavioral contracts, reducer test coverage, storage validation direction, E2E resume smoke structure, and granular validation commands — while explicitly rejecting that prompt's orchestrator deletion language in all forms. Any instruction in any source document that says "delete `use-test-entry-orchestrator.ts`" or "remove `test.entryOrchestrator` from QA config" must be ignored.

---

## 1. Goal

SD-1 introduces a phase-discriminated reducer for the test run lifecycle before additional Phase 5/6/7 behavior is added. SD-2 connects active-run write/read/resume so `/test/{variant}` can restore an unfinished run after reload or direct re-entry.

The architectural intent is not to collapse every test runtime concern into one hook. The intent is to make the phase transition graph observable, testable, and reducer-owned while preserving the already useful boundaries:

| Boundary | Post-SD-1 role |
|---|---|
| Pure reducer | Owns phase, question index, answers, and transition guards. No storage, router, telemetry, or consent calls. |
| `useTestRunController` | Owns reducer instance, bootstrap, runtime side-effect effects, dwell refs, response persistence coordination, telemetry coordination. |
| `useTestEntryOrchestrator` | Stays as reducer-aware entry adapter: instruction CTA execution, auto-commit scheduling, consent write, instruction-seen write, redirect-home side effects. Does not own independent phase state. |
| `test-question-client.tsx` | Keeps UI composition, render mapping, animation/timer wiring, beforeunload wiring, and localized text. Does not bridge phase state manually. |

---

## 2. Behavioral Contracts

### SD-1 — Observable Behavior Must Not Change

1. **Instruction overlay visibility**: shows when the run is in instruction phase and either instruction has not been seen or the policy does not allow auto-commit. This is identical to the current `instructionVisible` logic regardless of where that derivation lives.
2. **Auto-commit path**: when bootstrap resolves with instruction already seen and the policy allows auto-commit, the run transitions directly to active without showing the instruction overlay. This path must be indistinguishable from the current orchestrator's auto-commit microtask behavior.
3. **CTA actions** produce identical effects:
   - `start`, `accept_all_and_start`, `deny_and_start` → entry commit + instruction seen write
   - `deny_and_abandon`, `keep_current_preference` → home redirect + optional landing-ingress clear
   - Consent writes and landing-ingress clears continue to be orchestrator side effects, not reducer state.
4. **150 ms delayed auto-advance**: on answer selection, the UI dispatches the answer immediately for visual feedback, then after 150 ms dispatches the advance. The advance `choice` is captured at click time, not at timer callback time.
5. **Last question does not auto-advance**: the advance logic at the last question stays at the last index. The Submit button remains explicit.
6. **Tail reset on previous navigation**: answers at canonical indexes at or after the destination index are deleted. The reducer owns this invariant; storage sync of the truncated response set happens immediately after dispatch.
7. **`attempt_start` fires once per new runtime entry**. The exact-once guarantee should be driven by a reducer-owned transition/effect signal rather than a standalone `useRef` flag.
8. **`attempt_start` must NOT fire when SD-2 resumes an existing active run**. Resume versus new entry must be distinguishable within reducer state.
9. **`final_submit.finalResponses`** uses canonical index string keys (`"1"`, `"2"`) and semantic `"A"` / `"B"` values. Answers are already stored in canonical form so no conversion is needed at submit time.
10. **`data-entry-status` attribute values** are unchanged: `redirecting | booting | submitted | started | ready`. The instruction phase maps to `ready`.
11. **`beforeunload` guard** is active only when the run is in active phase and inactive in all other phases.
12. All existing unit tests, E2E specs, and QA script checks remain green. No screenshot baseline update is expected.

### SD-2 — New Observable Behaviors

1. On new runtime entry commit, active-run metadata (`startedAtMs`, `lastAnsweredAtMs`) is written to `test:{variant}:activeRun`.
2. On each confirmed answer, `lastAnsweredAtMs` is refreshed.
3. On previous navigation with tail reset, the truncated response set is persisted. `lastAnsweredAtMs` is not refreshed on backward navigation.
4. On page reload or direct re-entry with an unexpired active run and a non-null response set, the run resumes at the next unanswered canonical index with the stored answers preloaded. Instruction overlay shows if instruction has not been seen; it does not show if instruction has been seen, regardless of phase.
5. **Landing Ingress takes priority**: if landing ingress is present, skip active-run resume even when an active run and response set both exist.
6. `getActiveRun()` owns the 30-min timeout and `volatilizeRunData` cleanup. Bootstrap reads its return value only.
7. Active-run resume does NOT re-emit `attempt_start`.
8. Active run metadata is NOT cleared on placeholder Submit. Result-entry cleanup is Phase 7/10 scope.

---

## 3. Required Reading

Read these sources before implementation. Do not load unrelated docs upfront.

| Area | Required source |
|---|---|
| Repo routing and plan requirements | `AGENTS.md §2`, `AGENTS.md §4`, `AGENTS.md §5`, `AGENTS.md §7` |
| Test-flow implementation contract | `docs/req-test.md` |
| SD-1/SD-2 blocking contract | `docs/req-test-plan.md §Phase 5/6 사전 설계 결정` |
| Immediate SD-1 prompt | `docs/req-test-plan-p4.9prompt.md` |
| Test-flow project rules | `docs/agent-guides/project-rules.md §TestFlow` |
| Scope verification commands | `docs/agent-guides/verification-commands.md §test-flow` |
| Current implementation status | `docs/project-analysis.md §5.5`, `docs/project-analysis.md §6` |

Worktree caution: `docs/req-test-plan.md` was already modified before this plan was written. Treat the current working-tree version as the user-provided reference and do not revert it.

---

## 4. Verified Current Code Shape

| Current fact | Evidence path |
|---|---|
| `test-question-client.tsx` owns `entryCommittedForController`, slide direction, auto-advance timer, beforeunload effect, pending-transition completion scheduling, and render-state mapping. | `src/features/test/test-question-client.tsx` |
| `useTestRunController` owns runtime bootstrap, `runtimeState`, `started`, `submitted`, `attemptStartedRef`, dwell refs, pending transition id, `trackAttemptStart`, `trackFinalSubmit`, `consumeLandingIngress`, and `writeResponseSet`. | `src/features/test/use-test-run-controller.ts` |
| `useTestEntryOrchestrator` owns `instructionSeen`, `entryCommitted`, `redirecting`, `entryCommittedRef`, CTA action execution, consent write, `markInstructionSeen`, `clearLandingIngress`, `router.replace`, and instruction auto-commit. | `src/features/test/use-test-entry-orchestrator.ts` |
| `resolveQuestionBootstrapState()` currently receives only instruction/landing/pending-transition/question inputs. It does not accept active-run metadata or a stored response set. | `src/features/test/question-runtime-utils.ts` |
| `writeResponseSet()` exists and writes canonical-index string keys to `test:{variant}:responses`. There is no `readResponseSet()` helper yet. | `src/features/test/storage/response-set.ts` |
| `getActiveRun()`, `saveActiveRun()`, `writeLastAnsweredAt()`, and `clearActiveRun()` exist. Live question runtime does not call them yet. | `src/features/test/storage/active-run.ts` |
| QA currently has a Phase 10 check that conditionally verifies `markInstructionSeen` and `clearLandingIngress` ownership in `use-test-entry-orchestrator.ts`. | `scripts/qa/check-phase10-transition-contracts.mjs` |
| Dedicated unit coverage exists for `useTestEntryOrchestrator`; it covers auto-commit, redirect actions, consent actions, runtime-ready guard, and redirecting guard. | `tests/unit/use-test-entry-orchestrator.test.ts` |

Recent-plan context that affects this plan:

- `docs/plans/2026-05-12-Test-Entry-Orchestrator-Extraction.md` created the orchestrator specifically to move entry action logic and auto-commit out of the client.
- `docs/plans/2026-05-13-test-question-ux-ui.md` explicitly resolved the orchestrator disposition as **keep**.
- Deleting the orchestrator now would undo a deliberate separation without a stronger architectural reason. The reducer requirement is not strong enough to justify deletion.

---

## 5. Why The Orchestrator Should Stay

`use-test-entry-orchestrator.ts` is not just duplicate state. It is the focused boundary for entry-policy command execution:

- It interprets instruction CTA action effects.
- It writes consent state for consent-bearing entry actions.
- It records instruction seen for start-like actions.
- It clears landing ingress and navigates home for abandon/keep-current actions.
- It schedules auto-commit after an already-seen instruction.
- It guards double commit under Strict Mode style repeated effects.

Deleting it would move entry, consent, redirect, instruction storage, and runtime-entry coordination into `useTestRunController`. That would make the controller responsible for both entry-policy side effects and question-runtime side effects, which is exactly the overload the recent extraction avoided.

The correct SD-1 target:

- Remove **independent phase state** from the orchestrator.
- Do not remove the orchestrator itself.
- Let the reducer own `phase`, `instructionSeen`, `redirecting`, active/submitted state, current index, and answer map.
- Let the orchestrator become a reducer-aware adapter that requests reducer transitions and performs entry-side effects in response to reducer-owned transition signals.

---

## 6. Scope Boundaries

### SD-1 In Scope

- Add a pure reducer for the test run lifecycle with a top-level phase discriminant covering booting, instruction, active, submitted, and redirecting states.
- Replace dispersed phase state: `instructionSeen`, `entryCommitted`, `redirecting`, `started`, `submitted`.
- Remove the client-level `entryCommittedForController` bridge.
- Keep `use-test-entry-orchestrator.ts`, refactored so reducer state is authoritative and the orchestrator holds no independent phase `useState`.
- Preserve all current observable behavior (see §2 behavioral contracts).
- Keep the reducer pure: no storage, router, telemetry, consent, or transition calls inside the reducer.

### SD-2 In Scope

- Add a safe response-set read helper for `test:{variant}:responses`.
- Start writing active-run metadata from the live runtime on entry commit.
- Refresh `lastAnsweredAtMs` on confirmed answer.
- Extend bootstrap to use active-run metadata plus response-set data.
- Preserve priority: Landing Ingress wins over Active-Run Resume; Active-Run Resume wins over Direct Cold.
- Add unit and E2E coverage for active-run resume.

### Out Of Scope

- Score derivation, result URL construction, result page rendering, and history persistence.
- `response-projection.ts` implementation.
- Result-entry loading state, derivation-failure state, commit-failure state, or full `/test/error` recovery-card UI.
- New `question_answered` telemetry.
- Results Sheets loader.
- Migration from legacy `vivetest-test-instruction-seen:{variant}` to `test:{variant}:instructionSeen`.
- Baseline screenshot regeneration unless a real approved visual change appears.
- UX/UI changes: slide animation, progress bar percentage positioning, question number display, layout restructuring, beforeunload warning popup, or disabled-token sync for `instruction-overlay.tsx`. Those are Prompt 2 scope.

### Contract Tension To Keep Explicit

`docs/req-test.md §6.8` says the full cleanup triggers delete `instructionSeen`, but the current runtime and smoke behavior still rely on recording the legacy `instructionSeen` session key after instruction start. SD-1 must not silently migrate or volatilize this key. Do not call `volatilizeRunData(variant, 'restart')` during normal Start or landing-ingress commit. Treat full restart cleanup and key migration as later behavior-changing work.

---

## 7. Impact Assessment

| Dimension | SD-1 impact | SD-2 impact |
|---|---|---|
| Shared shell/GNB | None. | None. |
| Localization | No message-key changes. | No message-key changes. |
| A11y | Instruction overlay and question panel `aria-hidden` behavior must stay unchanged. | Resume must use the same panel/overlay semantics as the resumed state. |
| State contracts | High. Phase state moves into reducer; orchestrator becomes adapter, not owner. | Medium/high. Storage read path becomes live and must not revive invalid or timed-out data. |
| Core user flow | Behavior-preserving. | Behavior-changing for unfinished reload/direct re-entry: should resume instead of cold-starting. |
| Telemetry | Preserve `attempt_start` and `final_submit` names and payload shapes; emit exactly once per logical transition. | Resume itself adds no telemetry event. `attempt_start` fires once when entering new active runtime. |
| Storage | Existing response writes continue. No instruction key migration. | Adds response read and active-run metadata live wiring. |
| QA scripts | Update checks to include reducer and keep orchestrator ownership checks meaningful. | No new QA script category expected beyond SD-1 changes. |
| E2E | Existing consent/state smoke coverage must stay green. | Add or extend smoke coverage for reload/direct re-entry resume. |

---

## 8. Files To Modify

### SD-1 Files

| File | Operation | Responsibility |
|---|---|---|
| `src/features/test/test-run-reducer.ts` | **Create** | Pure reducer, state/action types, selectors or small helpers. No side effects. Keep under source-file size limits. |
| `src/features/test/use-test-run-controller.ts` | **Modify** | Own reducer instance; replace `runtimeState`, `started`, `submitted`, `attemptStartedRef`, and the `entryCommitted` input pattern with reducer-backed state and effects. |
| `src/features/test/use-test-entry-orchestrator.ts` | **Modify** | Keep file. Refactor from local phase-state owner into reducer-aware entry adapter. Remove independent phase `useState`. Retain all entry-side effect ownership. |
| `src/features/test/test-question-client.tsx` | **Modify** | Remove `entryCommittedForController`; keep UI/timer/render wiring; consume reducer-backed controller and orchestrator outputs. |
| `tests/unit/test-run-reducer.test.ts` | **Create** | Cover reducer action sequences, guards, tail reset, submit guards, redirect guard, and idempotent entry transition semantics. |
| `tests/unit/use-test-entry-orchestrator.test.ts` | **Modify** | Keep test file. Update expectations to assert on reducer dispatch calls and side-effect execution rather than internal `entryCommitted` state. Preserve coverage for CTA effects and auto-commit. |
| `tests/unit/use-test-run-controller.test.ts` | **Modify** | Update controller setup and assertions for reducer-backed state/effects. Preserve telemetry, ingress consume, response write, submit, and tail-reset coverage. |
| `scripts/qa/_path-config.mjs` | **Modify** | Add reducer path while keeping `test.entryOrchestrator`. |
| `scripts/qa/check-phase10-transition-contracts.mjs` | **Modify** | Add reducer presence check; keep orchestrator ownership checks for `markInstructionSeen` and `clearLandingIngress`. |
| `docs/project-analysis.md` | **Modify after implementation** | Update current runtime status only after code lands. |

No file in this list is deleted. `use-test-entry-orchestrator.ts` and its test file are Modify, not Delete.

### SD-2 Files

| File | Operation | Responsibility |
|---|---|---|
| `src/features/test/storage/response-set.ts` | **Modify** | Add safe `readResponseSet()` while keeping `writeResponseSet()` stable. |
| `src/features/test/storage/index.ts` | **Modify** | Export the new response read helper. |
| `src/features/test/question-runtime-utils.ts` | **Modify** | Extend bootstrap input/output to support active-run resume without reading storage directly. |
| `src/features/test/use-test-run-controller.ts` | **Modify** | Read active run/response set during bootstrap; save/refresh active-run metadata during live runtime; persist tail-reset response changes. |
| `tests/unit/test-storage-response-set.test.ts` | **Create** | Cover read/write, malformed payload handling, canonical key filtering, semantic value filtering, and variant isolation. |
| `tests/unit/test-question-bootstrap.test.ts` | **Modify** | Add Landing Ingress priority, Active-Run Resume, Direct Cold, timeout/null, malformed response, and partial response cases. |
| `tests/unit/use-test-run-controller.test.ts` | **Modify** | Add active-run save, refresh, read-bootstrap, and stale/null behavior coverage. |
| `tests/e2e/consent-smoke.spec.ts` | **Modify** | Add reload/direct re-entry resume smoke. Use existing representative variant patterns. |
| `docs/project-analysis.md` | **Modify after implementation** | Remove "active-run resume deferred/write-without-read" wording after SD-2 lands. |

---

## 9. Decisions Before Execution

| Decision | Plan position | Needs user confirmation? |
|---|---|---|
| Keep `use-test-entry-orchestrator.ts` | Yes. Refactor into reducer-aware adapter. | No; this revision records the decision. |
| Reducer placement | `useTestRunController` owns the reducer instance by default. | No, unless implementation discovers a hard hook-order problem. |
| Auto-commit modeling | Orchestrator-driven: after bootstrap resolves to instruction phase, orchestrator observes `instructionSeen`, `entryPolicy.canAutoCommitAfterInstructionSeen`, and runtime readiness, then dispatches commit-entry. This avoids making the controller depend on consent/entry-policy details. | No, if behavior remains unchanged. |
| Resume index semantics | `docs/req-test.md §3.3` says resume position is the last answered question; `docs/req-test-plan.md SD-2` says initial index is the next unanswered question or last question. These are not identical. | **Yes before SD-2 Unit F implementation.** |
| ActiveRun record shape | Prefer preserving metadata-only `ActiveRun` and reading answers from `test:{variant}:responses`. | No, unless implementer wants to expand `ActiveRun` shape. |
| `instructionSeen` key migration | Out of scope. Keep legacy behavior. | Yes if anyone proposes migration during SD-1/SD-2. |

---

## 10. SD-1 Implementation Direction

### 10.1 Reducer Boundary

Create a pure reducer module. Every function must be pure. Zero React imports. Zero storage, router, telemetry, consent, or browser API calls.

Required conceptual state fields:

- Top-level phase discriminant: `booting | instruction | active | submitted | redirecting`
- Landing ingress flag
- Current canonical question index (1-based)
- Canonical-index keyed answers (key = `String(canonicalIndex)`)
- Instruction-seen state
- A monotonic entry sequence counter (increments once per active-phase entry) — this replaces `useRef` flags as the exactly-once guard for runtime effects
- Entry mode distinguishing a new run from a resume — used to gate `attempt_start` emission
- Entry answers snapshot at the moment active phase begins — used by SD-2 to persist landing-ingress seeded answers on entry commit

Required conceptual actions and their guard rules:

| Action | Valid from phase | Key reducer behavior |
|---|---|---|
| Bootstrap complete | `booting` | If instruction already seen and policy allows auto-commit, transition directly to `active` and increment entry sequence. Otherwise, transition to `instruction`. Entry mode defaults to `new`. |
| Commit entry | `instruction` | Transition to `active`, increment entry sequence, snapshot entry answers. |
| Redirect home | `instruction` | Transition to `redirecting`. |
| Select answer | `active` | Write the provided canonical index key. If `advance` is set, also increment current index up to total questions. |
| Navigate previous | `active` | Decrement current index (floor at 1); delete all answer entries at or above the destination index (tail reset). |
| Submit | `active` | Guard: all canonical index keys 1..totalQuestions must have semantic answers. If guard fails, return state unchanged. On success, transition to `submitted`. |

Reducer invariants:

- All answer-mutating, navigation, and submit actions are no-ops outside `active` phase.
- Redirect is only valid from `instruction`.
- Commit entry is only valid from `instruction`.
- `submitted` and `redirecting` are terminal within this reducer; no further state changes.

Additional pure helpers to export from the same file:

- `buildInitialTestRunState()` — returns the initial booting state
- `hasAllRequiredAnswers(answers, totalQuestions)` — used by submit guard and controller
- Selector helpers `isRuntimeActive(state)` and `isRuntimeSubmitted(state)` if convenient

### 10.2 Reducer Unit Test Coverage

Required test cases for `tests/unit/test-run-reducer.test.ts`:

1. Bootstrap complete with instruction not seen → `phase === 'instruction'`, entry sequence 0.
2. Bootstrap complete with instruction seen and auto-commit allowed → `phase === 'active'`, entry sequence incremented.
3. Commit entry from `instruction` with `recordsInstructionSeen=true` → `phase === 'active'`, `instructionSeen === true`, entry sequence incremented.
4. Redirect home from `instruction` → `phase === 'redirecting'`.
5. Commit entry ignored when not in `instruction` phase.
6. Select answer writes the given canonical index key only when in `active` phase.
7. Full blocked-submit sequence: answer Q1 only then dispatch submit with totalQuestions=4 → `phase` stays `active`.
8. Full successful sequence: answer all 4 canonical indexes, then submit → `phase === 'submitted'`.
9. Previous navigation at index 1 → stays at index 1, all answers cleared.
10. Previous navigation at index 3 with answers at 1, 2, 3 → index 2, only answer at 1 retained.
11. Select answer, previous navigation, and submit are all no-ops in `submitted` phase.
12. `hasAllRequiredAnswers({1:'A', 2:'B'}, 2)` → true.
13. `hasAllRequiredAnswers({1:'A'}, 2)` → false.

### 10.3 Controller Integration

`useTestRunController` becomes the reducer owner.

Implementation direction:

- Bootstrap reads the same existing sources: pending landing transition, landing ingress, instruction seen, question bank.
- Bootstrap dispatches reducer state instead of setting standalone `runtimeState`.
- The controller no longer accepts an `entryCommitted` prop or exposes `executeInstructionAction`. That output belongs to the orchestrator.
- `started` and `submitted` become reducer-derived booleans.
- The entry-sequence counter replaces `attemptStartedRef` as the exactly-once guard for `attempt_start`.
- Runtime side effects are driven by reducer-owned transition signals:
  - Entering active with a new-run entry mode emits `attempt_start` once.
  - Entering active with a new-run entry mode consumes landing ingress once if present.
  - Answer selection persists the full response set.
  - Tail reset persists the truncated response set immediately after dispatch.
  - Submit emits `final_submit` with the answers from reducer state at that moment.
- Dwell refs stay in the controller. They are measurement tools, not phase authority.
- Pending-transition completion can stay outside the reducer unless implementation naturally folds it into bootstrap metadata.

Hook-order insight:

The client currently computes `entryPolicy` after the controller returns `landingIngressFlag`. Making `BOOTSTRAP_COMPLETE` carry `canAutoCommitAfterInstructionSeen` creates a dependency on policy inside bootstrap, which requires the controller to compute policy during bootstrap. A simpler model: bootstrap dispatches to `instruction` state first (without needing policy). The orchestrator observes `instructionSeen`, `entryPolicy.canAutoCommitAfterInstructionSeen`, and runtime readiness after bootstrap, then dispatches commit-entry for auto-commit cases. This keeps `entryPolicy` out of the controller bootstrap effect entirely and preserves the orchestrator's role.

If a specific implementation finds this model creates a hook-order problem, surface it before proceeding. Do not silently move auto-commit into the controller.

### 10.4 Entry Orchestrator Adapter Refactor

Keep `use-test-entry-orchestrator.ts`. The file is Modify, not Delete.

Post-SD-1 responsibilities to **keep**:

- Interpret `TestInstructionAction` through `entryPolicy.effects`.
- Request reducer transitions: dispatch commit-entry or redirect-home actions.
- Schedule auto-commit when instruction has already been seen and policy allows it.
- Execute entry-side effects after reducer transition:
  - Consent writes
  - Instruction-seen writes (`markInstructionSeen`)
  - Landing ingress clear on redirect-home actions (`clearLandingIngress`)
  - Router navigation for redirect-home actions
- Expose instruction visibility derivation and `executeInstructionAction` to the client.

Post-SD-1 responsibilities to **remove**:

- Local `instructionSeen`, `entryCommitted`, `redirecting` as independent `useState`.
- A local ref as the authoritative source of whether entry has committed.
- Any runtime telemetry (runtime telemetry belongs to the controller).

Idempotency: auto-commit must remain idempotent under repeated effects. Prefer reducer guards plus the reducer-owned entry sequence as the signal, not a standalone local ref. A timer/scheduling ref is acceptable if it does not define phase truth.

### 10.5 Client Simplification

Required changes to `test-question-client.tsx`:

- Remove `entryCommittedForController` and the effect that sets it.
- Continue to call `useTestRunController` for runtime state and answer handlers.
- Continue to call `useTestEntryOrchestrator`, now receiving reducer-backed phase and callbacks from the controller and policy from `resolveTestEntryPolicy`.
- Compute instruction overlay visibility from the orchestrator's output or reducer-backed phase/instruction values.
- Keep the 150 ms auto-advance timer. It dispatches the advance version of the answer action after 150 ms, capturing the choice at click time.
- Keep `slideDirection` state. UX/UI scope.
- Keep `beforeunload` active only when phase is active and not submitted.
- Preserve `data-entry-status` value mapping: `redirecting | booting | submitted | started | ready`. Instruction phase maps to `ready`.

### 10.6 SD-1 Test And QA Direction

Reducer tests: cover action sequences as described in §10.2. Do not snapshot state; use direct field assertions.

Orchestrator tests (update `use-test-entry-orchestrator.test.ts`, do not delete):

- CTA action results in the correct reducer dispatch call (commit-entry or redirect-home).
- Consent-bearing actions still call consent write.
- Start-like actions still call `markInstructionSeen`.
- Redirect actions still call `clearLandingIngress` when landing ingress flag is present and navigate home.
- Auto-commit dispatches commit-entry once when conditions are met.
- Runtime-not-ready and redirecting guards still prevent action execution.

Controller tests (update `use-test-run-controller.test.ts`):

- `attempt_start` fires once on new active entry.
- Landing ingress consumed once on new active entry when flag is set.
- Response set written on answer and on tail reset.
- `final_submit` fires once with canonical response keys.
- No runtime telemetry emitted by the orchestrator.

QA script direction:

- Keep `test.entryOrchestrator` in `scripts/qa/_path-config.mjs`.
- Add `test.runReducer` to `scripts/qa/_path-config.mjs`.
- `check-phase10-transition-contracts.mjs` must continue to verify orchestrator ownership of `markInstructionSeen` and `clearLandingIngress`.
- Add a check that the reducer file exists and contains the six required action type strings. Keep it a stable existence/presence check, not a brittle pattern match against exact variable names.
- Update any check that currently looks for `consumeLandingIngress` or `trackAttemptStart` inside `test-question-client.tsx` to look in `use-test-run-controller.ts` instead.

---

## 11. SD-2 Implementation Direction

### 11.1 Response-Set Read Boundary

Add `readResponseSet()` beside `writeResponseSet()` in `src/features/test/storage/response-set.ts`.

Contract direction:

- Read from `testVariantKey.responseSet(variant)`.
- Return a canonical-index keyed record containing only semantic `A`/`B` values.
- Validation filtering: only keys matching positive integer strings (no leading zeros, no zero, no negative, no UI-id format like `q1`) are kept. Only `'A'` or `'B'` values are kept.
- Malformed JSON and non-object payloads are non-resumable. Whether to remove the corrupt storage entry is an implementation choice; unit tests must make the behavior explicit either way.
- An empty or entirely-invalid filtered result returns `null`.
- Variant isolation: reading variant A must not affect variant B's storage key.
- Keep `writeResponseSet()` API stable.

Unit test cases for `tests/unit/test-storage-response-set.test.ts`:

1. Round-trip write then read returns canonical index entries with semantic values.
2. Missing storage key returns `null`.
3. Malformed JSON returns `null` (and documents cleanup behavior explicitly).
4. Non-object JSON (array, string, number) returns `null`.
5. Keys `q1`, `0`, `01`, `-1` are filtered out; only valid positive integers remain.
6. Values other than `'A'` or `'B'` are filtered out.
7. Another variant's response key is not affected by reading or by cleanup if triggered.

### 11.2 Bootstrap Resume Boundary

Extend `resolveQuestionBootstrapState()` or an equivalent pure bootstrap helper. Keep it storage-free: callers pass active-run metadata and response-set data in; the helper does not read storage itself.

Priority order:

1. **Landing Ingress** (`landingIngress !== null`): existing landing-ingress seeding logic wins. `activeRun` and `responseSet` inputs are ignored entirely.
2. **Active-Run Resume** (`landingIngress === null && activeRun != null && responseSet != null`): restore unfinished progress. Validate stored response keys against the current question bank; stale or unknown keys must not corrupt runtime state. Compute resume index per the confirmed interpretation of the resume-index decision (§9, pending user confirmation before this unit executes).
3. **Direct Cold** (all other cases): existing cold-start logic unchanged.

Bootstrap must preserve current landing behavior: landing ingress seeds the first scoring answer from `preAnswerChoice`, starts at the correct initial position per existing logic, and must not inherit any prior active-run response set.

Unit test cases to add to `tests/unit/test-question-bootstrap.test.ts`:

1. Active run + response set + no landing ingress → resumed current index and stored answers loaded.
2. Active run with responses answered through final question → current index is the final question.
3. Active run + landing ingress present → landing ingress wins; active run ignored.
4. `activeRun === null` → cold start (index 1, empty answers).
5. `responseSet === null` → cold start even if active run is present.
6. EGTT profile-first: active run with one scoring response → resume at next index.
7. Response set with only invalid keys → cold start.

### 11.3 Active-Run Live Writes

Wire the existing active-run storage API into the live runtime.

Expected ownership and sequence:

- **On new runtime entry** (entry mode is new, not resume): create or replace active-run metadata for the current variant (`saveActiveRun`). Also persist any landing-ingress seeded answers already in reducer state at this moment.
- **On each confirmed answer**: persist the updated response set and refresh `lastAnsweredAtMs`.
- **On previous navigation/tail reset**: persist the truncated response set. Do not refresh `lastAnsweredAtMs` on backward navigation.
- **On landing-ingress restart**: do not inherit the old response set. Landing ingress seeds answers at bootstrap; the entry-commit effect persists them fresh.
- **On placeholder Submit**: do not clear active run. Full result-entry cleanup is Phase 7/10 scope.

The active-run record currently stores only metadata (`variantId`, `startedAtMs`, `lastAnsweredAtMs`). Prefer keeping that shape and reading answers separately from `test:{variant}:responses`. Expanding the record shape is a storage-contract change requiring confirmation.

### 11.4 SD-2 Tests And E2E Direction

Unit coverage additions beyond §11.1 test cases:

- Controller bootstrap calls `getActiveRun()` when no landing ingress exists.
- Controller bootstrap skips `getActiveRun()` when landing ingress is present.
- Controller reads `readResponseSet()` only when `getActiveRun()` returns a non-null record.
- Active-run resume does not trigger `saveActiveRun()` during bootstrap/reload (it is not a new entry).
- New entry commit calls `saveActiveRun()` once.
- Confirmed answer calls both `writeResponseSet()` and `writeLastAnsweredAt()`.
- Previous navigation/tail reset persists the filtered response set without calling `writeLastAnsweredAt()`.

E2E coverage — add to `tests/e2e/consent-smoke.spec.ts`:

**Test 1 — direct active-run reload resume:**
Seed `OPTED_IN` consent, navigate to the primary available test variant, click Start, answer at least one question, wait for auto-advance to complete, reload the page, and assert: instruction overlay is not visible, `data-entry-status` is `started`, and the current question and progress percent match the resumed state. Do not use fixed sleeps; use attribute/text polling assertions with a timeout.

**Test 2 — landing ingress priority over prior active run:**
Directly seed active-run metadata and a partial response set in localStorage for the primary available variant. Navigate to the landing page, trigger the landing-card answer for the same variant, and enter the test. After Start, assert that the run reflects the landing-ingress seeded state (not the prior active-run index or prior answers).

---

## 12. Validation Commands

Run in this order. Stop immediately on any failure.

### After Unit A (reducer only):

```bash
npm test -- tests/unit/test-run-reducer.test.ts
```

### After Unit B (controller integration):

```bash
npm test -- \
  tests/unit/test-run-reducer.test.ts \
  tests/unit/use-test-run-controller.test.ts \
  tests/unit/test-entry-policy.test.ts \
  tests/unit/test-question-bootstrap.test.ts
```

### After Unit C (orchestrator adapter refactor):

```bash
npm test -- \
  tests/unit/test-run-reducer.test.ts \
  tests/unit/use-test-entry-orchestrator.test.ts \
  tests/unit/use-test-run-controller.test.ts \
  tests/unit/test-entry-policy.test.ts
```

### After Unit D (client simplification + QA sync):

```bash
node scripts/qa/check-phase10-transition-contracts.mjs
npm run qa:rules
npm run lint
npm run typecheck
npm test
npm run build
npx playwright test tests/e2e/consent-smoke.spec.ts tests/e2e/state-smoke.spec.ts
```

**Stop here if SD-1 fails. Do not begin SD-2 until all SD-1 commands pass.**

### After Unit E (response-set read boundary):

```bash
npm test -- \
  tests/unit/test-storage-response-set.test.ts \
  tests/unit/test-storage-active-run.test.ts \
  tests/unit/test-storage-volatility.test.ts
```

### After Unit F (bootstrap resume extension):

```bash
npm test -- tests/unit/test-question-bootstrap.test.ts
```

### After Unit G (live active-run wiring):

```bash
npm test -- \
  tests/unit/test-storage-response-set.test.ts \
  tests/unit/test-storage-active-run.test.ts \
  tests/unit/test-storage-volatility.test.ts \
  tests/unit/test-question-bootstrap.test.ts \
  tests/unit/use-test-run-controller.test.ts \
  tests/unit/test-entry-policy.test.ts
```

### After Unit H (E2E and docs) — final done gate:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run qa:rules
npx playwright test tests/e2e/consent-smoke.spec.ts
npx playwright test tests/e2e/state-smoke.spec.ts
npx playwright test tests/e2e/transition-telemetry-smoke.spec.ts
```

If Playwright browser executables are missing, run `npx playwright install chromium webkit` first. This is environment setup, not an app regression.

`npm run qa:gate:once` is heavy. Run it only when preparing release-level validation or investigating flakiness, unless the approving user explicitly requires it.

Do not update any screenshot baselines unless a deliberate approved visual change is introduced. This implementation contains no such change.

---

## 13. Implementation Order

### Unit A — Reducer And Reducer Tests

- Create the pure reducer file.
- Create reducer unit tests covering the 13 cases in §10.2.
- Run the focused reducer test.
- Do not wire runtime hooks yet.

### Unit B — Controller Reducer Integration

- Move controller phase state to the reducer.
- Remove the `entryCommitted` input pattern.
- Replace exactly-once runtime side-effect refs with reducer-owned transition/effect signals.
- Keep dwell and timer refs that are not phase authority.
- Run controller tests.

### Unit C — Orchestrator Adapter Refactor

- Refactor `use-test-entry-orchestrator.ts` into a reducer-aware adapter.
- Remove its local phase-state ownership (`instructionSeen`, `entryCommitted`, `redirecting` as standalone `useState`).
- Preserve all entry-side effect ownership: consent write, `markInstructionSeen`, `clearLandingIngress`, `router.replace`, auto-commit scheduling.
- Update orchestrator tests to assert on reducer dispatch calls and side-effect invocations.
- Run orchestrator tests.

### Unit D — Client Simplification And QA Sync

- Update `test-question-client.tsx` render mapping to consume reducer-backed state.
- Remove `entryCommittedForController`.
- Update `scripts/qa/_path-config.mjs`: add `test.runReducer`, keep `test.entryOrchestrator`.
- Update `scripts/qa/check-phase10-transition-contracts.mjs`: add reducer presence check, keep orchestrator ownership checks.
- Run SD-1 validation commands in §12.

**Stop here if SD-1 fails.**

### Unit E — Response-Set Read Boundary

- Add `readResponseSet()`.
- Export it from `src/features/test/storage/index.ts`.
- Add response-set unit tests covering the 7 cases in §11.1.

### Unit F — Bootstrap Resume Extension

**Resolve the resume-index decision before coding this unit.** Confirm with the user whether resume position is the last answered question or the next unanswered question.

- Extend pure bootstrap inputs/outputs for active-run resume.
- Add bootstrap unit tests for the 7 priority and resume cases in §11.2.

### Unit G — Live Active-Run Wiring

- Wire `getActiveRun()` and `readResponseSet()` into controller bootstrap.
- Wire `saveActiveRun()` and entry-answer persistence on entry commit.
- Wire `writeLastAnsweredAt()` on confirmed answer.
- Persist filtered response set on tail reset.
- Add controller unit tests for the SD-2 assertions in §11.4.

### Unit H — Resume E2E And Docs

- Add the two reload/direct re-entry resume smoke tests described in §11.4.
- Run SD-2 focused check and the focused E2E grep.
- Update `docs/project-analysis.md` after code is verified (remove deferred wording, add reducer and resume status).
- Update `docs/req-test-plan.md` §Phase 5/6 사전 설계 결정: mark SD-1 and SD-2 implemented; preserve result-entry/derivation caveats.
- Run the final done gate.

---

## 14. Failure Handling

- If hook order becomes awkward, do not delete `use-test-entry-orchestrator.ts` as the escape hatch. Prefer modeling auto-commit as orchestrator-dispatched commit after bootstrap, or introduce a small composed hook only if it reduces coupling without widening scope.
- If the resume-index contract remains unresolved before Unit F, stop and ask the user. Do not choose silently.
- If `attempt_start` fires twice under Strict Mode double-invoke, fix the reducer so the entry-sequence counter increments only once per transition into active phase from a non-active phase.
- If QA script checks become brittle, prefer executable unit coverage over fragile static string matching. Keep static checks only for stable ownership rules.
- If source files approach the AGENTS.md size/splitting limits, stop and propose a refactoring plan before continuing.
- If Playwright visual diffs appear, treat them as blockers unless they are caused by an approved behavior change. Do not regenerate baselines for SD-1/SD-2 by default.

---

## 15. Approval Boundary

This plan is a specification. It does not authorize code changes until explicitly approved.

Before executing SD-2 Unit F, confirm the resume-index decision:

- Resume at the **last answered** question (`docs/req-test.md §3.3`).
- Resume at the **next unanswered** question or last question (`docs/req-test-plan.md SD-2`).

Implementation must stop before Unit F until this ambiguity is resolved.
