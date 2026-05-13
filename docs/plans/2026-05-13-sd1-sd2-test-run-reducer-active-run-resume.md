# SD-1/SD-2 Test Run Reducer and Active-Run Resume Plan

> **Status**: Pending implementation approval.
> **Execution model**: Implement sequentially in a fresh session: SD-1 first, verify, then SD-2. Do not use parallel agents, automated multi-wave execution, or source edits outside this plan.
> **Plan style**: This document intentionally avoids exact TypeScript definitions and line-by-line code. It records verified codebase insights, ownership boundaries, implementation direction, risk points, and validation scope so a later implementer can start without broad rediscovery while still retaining implementation discretion.

## 0. Revision Note

This plan was revised after reviewing the current code and recent plan history.

The previous version incorrectly treated `src/features/test/use-test-entry-orchestrator.ts` as something to delete during SD-1. That direction is not recommended. The file is a recent, intentional extraction that owns the entry-policy command path and entry-side effects. SD-1 should keep it and refactor it into a **reducer-aware adapter**:

- The reducer becomes the single source of truth for phase state.
- `use-test-entry-orchestrator.ts` no longer owns independent phase `useState`.
- The orchestrator keeps the entry action interpretation, auto-commit scheduling, and entry-side effect boundary.
- Tests and QA checks should be updated to verify this split, not to erase the hook.

## 1. Goal

SD-1 introduces a phase-discriminated reducer for the test run lifecycle before additional Phase 5/6/7 behavior is added. SD-2 then connects active-run write/read/resume so `/test/{variant}` can restore an unfinished run after reload or direct re-entry.

The architectural intent is not to collapse every test runtime concern into one hook. The intent is to make the phase transition graph observable, testable, and reducer-owned while preserving the already useful boundaries:

| Boundary | Post-SD-1 role |
|---|---|
| Pure reducer | Owns phase, question index, answers, and transition guards. No storage, router, telemetry, or consent calls. |
| `useTestRunController` | Owns reducer instance, bootstrap, runtime side-effect effects, dwell refs, response persistence coordination, telemetry coordination. |
| `useTestEntryOrchestrator` | Stays as reducer-aware entry adapter for instruction CTA execution, auto-commit, consent write, instruction-seen write, redirect-home side effects. |
| `test-question-client.tsx` | Keeps UI composition, render mapping, animation/timer wiring, beforeunload wiring, and localized text. It should not bridge phase state manually. |

## 2. Required Reading

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

## 3. Verified Current Code Shape

The following observations are the implementation context this plan is built on.

| Current fact | Evidence path |
|---|---|
| `test-question-client.tsx` owns `entryCommittedForController`, slide direction, auto-advance timer, beforeunload effect, pending-transition completion scheduling, and render-state mapping. | `src/features/test/test-question-client.tsx` |
| `useTestRunController` owns runtime bootstrap, `runtimeState`, `started`, `submitted`, `attemptStartedRef`, dwell refs, pending transition id, `trackAttemptStart`, `trackFinalSubmit`, `consumeLandingIngress`, and `writeResponseSet`. | `src/features/test/use-test-run-controller.ts` |
| `useTestEntryOrchestrator` owns `instructionSeen`, `entryCommitted`, `redirecting`, `entryCommittedRef`, CTA action execution, consent write, `markInstructionSeen`, `clearLandingIngress`, `router.replace`, and instruction auto-commit. | `src/features/test/use-test-entry-orchestrator.ts` |
| `resolveQuestionBootstrapState()` currently receives only instruction/landing/pending-transition/question inputs. It does not accept active-run metadata or a stored response set. | `src/features/test/question-runtime-utils.ts` |
| `writeResponseSet()` exists and writes canonical-index string keys to `test:{variant}:responses`; there is no `readResponseSet()` helper yet. | `src/features/test/storage/response-set.ts` |
| `getActiveRun()`, `saveActiveRun()`, `writeLastAnsweredAt()`, and `clearActiveRun()` exist. Live question runtime does not call them yet. | `src/features/test/storage/active-run.ts` |
| QA currently has a Phase 10 check that conditionally verifies `markInstructionSeen` and `clearLandingIngress` ownership in `use-test-entry-orchestrator.ts`. | `scripts/qa/check-phase10-transition-contracts.mjs` |
| Dedicated unit coverage exists for `useTestEntryOrchestrator`; it covers auto-commit, redirect actions, consent actions, runtime-ready guard, and redirecting guard. | `tests/unit/use-test-entry-orchestrator.test.ts` |

Important recent-plan context:

- `docs/plans/2026-05-12-Test-Entry-Orchestrator-Extraction.md` created the orchestrator specifically to move entry action logic and auto-commit out of the client.
- `docs/plans/2026-05-13-test-question-ux-ui.md` explicitly resolved the orchestrator disposition as **keep**.
- Deleting the orchestrator now would undo a deliberate separation unless there is a stronger architectural reason. The reducer requirement is not strong enough to justify deletion.

## 4. Why The Orchestrator Should Stay

`use-test-entry-orchestrator.ts` is not just duplicate state. It is currently the only focused boundary for entry-policy command execution:

- It interprets instruction CTA action effects.
- It writes consent state for consent-bearing entry actions.
- It records instruction seen for start-like actions.
- It clears landing ingress and navigates home for abandon/keep-current actions.
- It schedules auto-commit after an already-seen instruction.
- It guards double commit under Strict Mode style repeated effects.

Deleting it would move entry, consent, redirect, instruction storage, and runtime-entry coordination into `useTestRunController`. That would make the controller responsible for both entry-policy side effects and question-runtime side effects, which is exactly the kind of overload the recent extraction avoided.

The correct SD-1 target is therefore:

- Remove **independent phase state** from the orchestrator.
- Do not remove the orchestrator itself.
- Let the reducer own `phase`, `instructionSeen`, `redirecting`, active/submitted state, current index, and answer map.
- Let the orchestrator become a reducer-aware adapter that requests reducer transitions and performs entry-side effects in response to reducer-owned transition/effect signals.

## 5. Scope Boundaries

### SD-1 In Scope

- Add a pure reducer boundary for the test run lifecycle.
- Represent the lifecycle with a top-level phase discriminant covering booting, instruction, active, submitted, and redirecting states.
- Replace dispersed phase state:
  - `instructionSeen`
  - `entryCommitted`
  - `redirecting`
  - `started`
  - `submitted`
- Remove the client-level `entryCommittedForController` bridge.
- Keep `use-test-entry-orchestrator.ts`, but refactor it so reducer state is authoritative.
- Preserve current observable behavior:
  - instruction overlay visibility and CTA behavior
  - consent writes
  - home redirects for `deny_and_abandon` and `keep_current_preference`
  - `attempt_start` and `final_submit` payload shapes
  - 150 ms auto-advance behavior
  - beforeunload behavior while active and not submitted
  - placeholder result panel
- Keep the reducer pure. Storage, router, telemetry, consent, and transition calls stay outside the reducer.

### SD-2 In Scope

- Add a safe response-set read helper for `test:{variant}:responses`.
- Start writing active-run metadata from the live runtime.
- Refresh `lastAnsweredAtMs` during answer progress.
- Extend bootstrap so it can use active-run metadata plus response-set data.
- Preserve priority: Landing Ingress wins over Active-Run Resume; Active-Run Resume wins over Direct Cold.
- Add unit and E2E coverage for active-run resume.

### Out Of Scope

- Score derivation, result URL construction, result page rendering, and history persistence.
- `response-projection.ts` implementation.
- Result-entry loading state, derivation-failure state, commit-failure state, or `/test/error` recovery-card UI.
- New `question_answered` telemetry.
- Results Sheets loader.
- Migration from legacy `vivetest-test-instruction-seen:{variant}` to `test:{variant}:instructionSeen`, unless the user separately approves that behavior change.
- Baseline screenshot regeneration unless a real approved visual change appears.

### Contract Tension To Keep Explicit

`docs/req-test.md §6.8` says the full cleanup triggers delete `instructionSeen`, but the current runtime and smoke behavior still rely on recording the legacy `instructionSeen` session key after instruction start. SD-1 must not silently migrate or volatilize this key.

For this plan:

- Keep the legacy instruction-seen key behavior unchanged.
- Do not call `volatilizeRunData(variant, 'restart')` during normal Start or landing-ingress commit.
- Treat full restart cleanup and key migration as later behavior-changing work.

## 6. Impact Assessment

| Dimension | SD-1 impact | SD-2 impact |
|---|---|---|
| Shared shell/GNB | None. | None. |
| Localization | No message-key changes. `useTranslations('test')` remains in the client. | No message-key changes. |
| A11y | Instruction overlay and question panel `aria-hidden` behavior must stay unchanged. | Resume must use the same panel/overlay semantics as the resumed state. |
| State contracts | High. Phase state moves into reducer; orchestrator becomes adapter, not owner. | Medium/high. Storage read path becomes live and must not revive invalid or timed-out data. |
| Core user flow | Behavior-preserving. | Behavior-changing for unfinished reload/direct re-entry: should resume instead of cold-starting. |
| Telemetry | Preserve `attempt_start` and `final_submit` names and payload shapes; emit exactly once per logical transition. | Resume itself adds no telemetry event. Attempt start still fires once when entering active runtime. |
| Storage | Existing response writes continue. No instruction key migration. | Adds response read and active-run metadata live wiring. |
| QA scripts | Update checks to include reducer and keep orchestrator ownership checks meaningful. | No new QA script category expected. |
| E2E | Existing consent/state smoke coverage must stay green. | Add or extend smoke coverage for reload/direct re-entry resume. |

## 7. Files To Modify

### SD-1 Files

| File | Operation | Responsibility |
|---|---|---|
| `src/features/test/test-run-reducer.ts` | Create | Pure reducer, state/action types, selectors or small helpers. No side effects. Keep under source-file size limits. |
| `src/features/test/use-test-run-controller.ts` | Modify | Own reducer instance; replace `runtimeState`, `started`, `submitted`, `attemptStartedRef`, and the `entryCommitted` input pattern with reducer-backed state and effects. |
| `src/features/test/use-test-entry-orchestrator.ts` | Modify | Keep file. Refactor from local phase-state owner into reducer-aware entry adapter. |
| `src/features/test/test-question-client.tsx` | Modify | Remove `entryCommittedForController`; keep UI/timer/render wiring; consume reducer-backed controller/orchestrator outputs. |
| `tests/unit/test-run-reducer.test.ts` | Create | Cover reducer action sequences, guards, tail reset, submit guards, redirect guard, and idempotent entry transition semantics. |
| `tests/unit/use-test-entry-orchestrator.test.ts` | Modify | Keep test file. Update expectations around reducer callbacks/effect tokens instead of internal `entryCommitted` state. Preserve coverage for CTA effects and auto-commit. |
| `tests/unit/use-test-run-controller.test.ts` | Modify | Update controller setup and assertions for reducer-backed state/effects. Preserve telemetry, ingress consume, response write, submit, and tail-reset coverage. |
| `scripts/qa/_path-config.mjs` | Modify | Add reducer path while keeping `test.entryOrchestrator`. |
| `scripts/qa/check-phase10-transition-contracts.mjs` | Modify | Check reducer presence/purity expectations and keep entry-orchestrator ownership checks for `markInstructionSeen` and `clearLandingIngress`. |
| `docs/project-analysis.md` | Modify after implementation | Update current runtime status only after code lands. Do not update during plan-only work. |

### SD-2 Files

| File | Operation | Responsibility |
|---|---|---|
| `src/features/test/storage/response-set.ts` | Modify | Add safe `readResponseSet()` while keeping `writeResponseSet()` stable. |
| `src/features/test/storage/index.ts` | Modify | Export the new response read helper. |
| `src/features/test/question-runtime-utils.ts` | Modify | Extend bootstrap input/output to support active-run resume without reading storage directly. |
| `src/features/test/use-test-run-controller.ts` | Modify | Read active run/response set during bootstrap; save/refresh active-run metadata during live runtime; persist tail-reset response changes. |
| `tests/unit/test-storage-response-set.test.ts` | Create | Cover read/write, malformed payload handling, canonical key filtering, semantic value filtering, and variant isolation. |
| `tests/unit/test-question-bootstrap.test.ts` | Modify | Add Landing Ingress priority, Active-Run Resume, Direct Cold, timeout/null, malformed response, and partial response cases. |
| `tests/unit/use-test-run-controller.test.ts` | Modify | Add active-run save, refresh, read-bootstrap, and stale/null behavior coverage. |
| `tests/e2e/consent-smoke.spec.ts` or a focused test-flow E2E file | Modify/Create | Add reload/direct re-entry resume smoke. Use existing representative variant patterns. |
| `docs/project-analysis.md` | Modify after implementation | Remove "active-run resume deferred/write-without-read" wording after SD-2 lands. |

No file should be deleted as part of SD-1 solely because the reducer exists.

## 8. Decisions Before Execution

| Decision | Plan position | Needs user confirmation? |
|---|---|---|
| Keep `use-test-entry-orchestrator.ts` | Yes. Refactor into reducer-aware adapter. | No; this revision records the decision. |
| Reducer placement | Default: `useTestRunController` owns the reducer instance because it already owns bootstrap, runtime telemetry, dwell refs, and persistence coordination. | No, unless implementation discovers a hard hook-order problem. |
| Auto-commit modeling | Prefer orchestrator-driven auto-commit dispatch after bootstrap instead of forcing `BOOTSTRAP_COMPLETE` to know `entryPolicy`. This avoids making the controller depend on consent/entry-policy details. | No, if behavior remains unchanged. |
| Resume index semantics | `docs/req-test.md §3.3` says resume position is the last answered question; `docs/req-test-plan.md SD-2` says initial index is the next question or last question. These are not identical. | **Yes before SD-2 implementation.** |
| ActiveRun record shape | Prefer preserving metadata-only `ActiveRun` and reading responses from `test:{variant}:responses`. | No, unless implementer wants to expand `ActiveRun` shape. |
| `instructionSeen` key migration | Out of scope. Keep legacy behavior. | Yes if anyone proposes migration during SD-1/SD-2. |

## 9. SD-1 Implementation Direction

### 9.1 Reducer Boundary

Create a pure reducer module for the test run lifecycle. The reducer should expose enough type surface for tests and controller use, but the exact type names and helper names are implementation details.

Required conceptual state:

- top-level phase discriminant
- landing ingress flag
- current canonical question index
- canonical-index keyed answers
- instruction-seen state
- enough transition metadata to drive exactly-once effects without resurrecting ad hoc phase refs

Required conceptual actions:

- bootstrap complete
- commit entry
- redirect home
- select answer
- navigate previous
- submit

Reducer guard expectations:

- No answer, navigation, or submit mutation before active phase.
- Redirect is only valid from instruction phase.
- Commit entry is only valid from instruction phase or from the planned auto-commit path after bootstrap.
- Submit requires active phase and complete answers.
- Previous navigation applies tail reset by dropping answers after the target canonical index.
- Submitted and redirecting phases ignore further answer/navigation/commit actions.
- Reducer returns stable state when an action is invalid.

Side-effect rule:

- The reducer must not call storage, telemetry, router, transition, consent, clock, or browser APIs.
- If an effect must run exactly once, represent the transition in reducer state with a monotonic sequence, effect descriptor, or equivalent reducer-owned signal. Avoid independent `useRef` flags as phase authority.
- Refs remain acceptable for non-state concerns such as dwell timing, timer handles, DOM scheduling, and cancellation bookkeeping.

### 9.2 Controller Integration

`useTestRunController` should become the reducer owner by default.

Implementation direction:

- Bootstrap reads the same existing sources first: pending landing transition, landing ingress, instruction seen, question bank.
- Bootstrap dispatches reducer state instead of setting standalone `runtimeState`.
- The controller no longer accepts an `entryCommitted` prop.
- `started` and `submitted` become reducer-derived selectors or booleans returned from reducer state.
- `attemptStartedRef` should be replaced by a reducer-owned transition/effect signal.
- Runtime side effects should be driven by reducer-owned transitions:
  - entering active runtime emits `attempt_start` once
  - entering active runtime consumes landing ingress once if present
  - answer selection persists response set
  - tail reset persists the truncated response set
  - submit emits `final_submit` once with the reducer snapshot used for submission
- Keep dwell refs in the controller. Dwell timing is runtime measurement, not phase authority.
- Keep pending-transition completion state outside the reducer unless implementation naturally folds it into reducer bootstrap metadata. It is not the main SD-1 objective.

Hook-order insight:

- The client currently computes `entryPolicy` after the controller returns `landingIngressFlag`.
- If the reducer sits in the controller, making `BOOTSTRAP_COMPLETE` depend directly on `entryPolicy.canAutoCommitAfterInstructionSeen` creates a dependency cycle.
- Preferred resolution: bootstrap to reducer-owned instruction/ready state first, then let `useTestEntryOrchestrator` observe `instructionSeen`, `entryPolicy`, and runtime readiness and dispatch the same commit-entry transition through the reducer-aware adapter.
- This keeps `entryPolicy` out of the controller and preserves the recent entry-orchestrator extraction.

### 9.3 Entry Orchestrator Adapter

Keep `use-test-entry-orchestrator.ts` and refactor it.

Post-SD-1 responsibilities:

- Interpret `TestInstructionAction` through `entryPolicy.effects`.
- Request reducer transitions for commit-entry and redirect-home outcomes.
- Schedule auto-commit when instruction has already been seen and policy allows it.
- Own entry-side effects after reducer-owned transition/effect signals:
  - consent writes
  - instruction-seen writes
  - landing ingress clear on redirect-home actions
  - router replace for redirect-home actions
- Expose a small output surface to the client/controller: instruction visibility inputs, redirecting status, and `executeInstructionAction`, or equivalent names.

Responsibilities to remove:

- Do not keep local `instructionSeen`, `entryCommitted`, or `redirecting` as independent `useState`.
- Do not use a local ref as the true source of whether entry has committed.
- Do not emit runtime telemetry. Runtime telemetry belongs to the controller.

Idempotency direction:

- Auto-commit must remain idempotent under repeated effects.
- Prefer reducer guards plus reducer-owned transition/effect sequence over a standalone `entryCommittedRef`.
- A scheduling/cancellation ref is acceptable if it does not define phase truth.

### 9.4 Client Simplification

`test-question-client.tsx` should become simpler but not behaviorally different.

Required changes:

- Remove `entryCommittedForController`.
- Continue to call `useTestRunController`.
- Continue to compute `entryPolicy` from instruction text, card attribute, consent state, and landing ingress flag.
- Continue to call `useTestEntryOrchestrator`, now with reducer-backed state/callbacks instead of expecting local phase state from the hook.
- Compute instruction overlay visibility from reducer-backed phase/instruction values.
- Keep the 150 ms auto-advance timer in the client.
- Keep slide direction and reduced-motion behavior in the client.
- Keep beforeunload behavior active only while the run is active and not submitted.
- Preserve `data-entry-status` values: `redirecting`, `booting`, `submitted`, `started`, `ready`.

### 9.5 SD-1 Test And QA Direction

Reducer tests should cover action sequences rather than implementation internals:

- cold bootstrap to instruction
- already-seen instruction plus auto-commit path
- manual start path
- redirect-home path
- answer selection
- previous navigation with tail reset
- submit guard before all answers
- submit success
- ignored actions in submitted/redirecting phases

Orchestrator tests should stay and shift focus:

- CTA action maps to the correct reducer request/effect intent
- consent-bearing actions still write consent
- start-like actions still record instruction seen
- redirect actions still clear landing ingress when needed and navigate home
- auto-commit still runs once
- runtime-not-ready/redirecting guards still prevent action execution

Controller tests should verify integration:

- attempt start once on active entry
- ingress consume once on active entry
- response write on answer and tail reset
- final submit once with canonical response keys
- no runtime telemetry from the entry adapter

QA script direction:

- Keep `test.entryOrchestrator` in `_path-config.mjs`.
- Add `test.runReducer`.
- `check-phase10-transition-contracts.mjs` should continue to verify entry-orchestrator ownership of `markInstructionSeen` and `clearLandingIngress`.
- Add a reducer-oriented static check only if it can be robust and non-brittle. Do not encode exact reducer variable names unless tests already enforce the real contract.

## 10. SD-2 Implementation Direction

### 10.1 Response-Set Read Boundary

Add `readResponseSet()` beside `writeResponseSet()`.

Contract direction:

- Read from `testVariantKey.responseSet(variant)`.
- Return a canonical-index keyed record containing only semantic `A`/`B` values.
- Treat malformed JSON, non-object payloads, invalid values, and unrelated shapes as non-resumable data.
- Preserve variant isolation.
- Keep `writeResponseSet()` API stable.
- Prefer not to mutate storage on every invalid shape unless existing storage helpers already establish that cleanup behavior. If cleanup is added, unit tests must make it explicit.

### 10.2 Bootstrap Resume Boundary

Extend `resolveQuestionBootstrapState()` or an equivalent pure bootstrap helper. The helper should remain storage-free: callers pass active-run metadata and response-set data in.

Priority order:

1. Landing Ingress: current landing-ingress behavior wins over any active run.
2. Active-Run Resume: valid active run plus usable response set restores unfinished progress.
3. Direct Cold: no valid active run or no usable resume data starts from the existing cold path.

Bootstrap must preserve current landing behavior:

- Landing ingress still seeds the first scoring answer from `preAnswerChoice`.
- Landing ingress still starts at the current fixture's first non-preseed target according to existing logic.
- Landing ingress must not inherit an old active-run response set.

Resume behavior to implement after user confirmation:

- Use `getActiveRun()` result only after it has already performed timeout cleanup.
- Use stored response-set answers as the resume answers.
- Validate stored response keys against the current question bank. Unknown future/stale keys must not corrupt runtime state.
- Decide the resumed `currentQuestionIndex` according to the confirmed interpretation of the resume-index contract.
- Keep instruction overlay behavior derived from the existing instruction-seen rule. Direct Resume should not introduce a new prompt.

### 10.3 Active-Run Live Writes

Wire the live runtime to the existing active-run storage API.

Expected ownership:

- On successful runtime entry, create or replace the active-run metadata for the current variant.
- On answer selection, update the response set and refresh `lastAnsweredAtMs`.
- On previous navigation with tail reset, persist the truncated response set and refresh activity time if appropriate.
- On landing-ingress restart, do not inherit the old response set.
- Do not clear active run on placeholder submit unless the implementation also reaches the real result-screen entry commit defined by `docs/req-test.md §6.8`. SD-2 does not implement full result entry.

The active-run record currently stores only metadata: `variantId`, `startedAtMs`, and `lastAnsweredAtMs`. Prefer keeping that shape and reading answers from `test:{variant}:responses`. Expanding the record shape would be a larger storage-contract change and should be confirmed first.

### 10.4 SD-2 Tests And E2E Direction

Unit coverage:

- `readResponseSet()` happy path.
- malformed response JSON.
- non-object response payload.
- invalid answer values.
- stale canonical keys not present in the current question bank.
- landing ingress priority over active run.
- active-run resume without landing ingress.
- timeout/null active run falls back to cold path.
- live controller saves active run on runtime entry.
- live controller refreshes `lastAnsweredAtMs` on answer.
- tail reset persists truncated answers.

E2E coverage:

- Use a representative available variant.
- Start a run, answer at least one question, reload or re-enter the same test URL, and assert that the run resumes rather than returning to a cold empty state.
- Keep this before final submit/result behavior because full result-entry cleanup is out of scope.

## 11. Validation Commands

Run validation in this order after implementation.

Basic gates:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

SD-1 focused checks:

```bash
node scripts/qa/check-phase10-transition-contracts.mjs
npm test -- \
  tests/unit/test-run-reducer.test.ts \
  tests/unit/use-test-entry-orchestrator.test.ts \
  tests/unit/use-test-run-controller.test.ts \
  tests/unit/test-question-bootstrap.test.ts \
  tests/unit/test-entry-policy.test.ts
npx playwright test \
  tests/e2e/consent-smoke.spec.ts \
  tests/e2e/state-smoke.spec.ts
```

SD-2 focused checks:

```bash
npm test -- \
  tests/unit/test-storage-response-set.test.ts \
  tests/unit/test-question-bootstrap.test.ts \
  tests/unit/use-test-run-controller.test.ts
npx playwright test tests/e2e/consent-smoke.spec.ts
```

Reference/release-level checks:

```bash
npm run qa:rules
```

`npm run qa:gate:once` is heavy. Run it only when preparing release-level validation or when investigating flakiness, unless the approving user explicitly requires it for this implementation.

## 12. Implementation Order

### Unit A — Reducer And Reducer Tests

- Add the pure reducer file.
- Add reducer unit tests.
- Do not wire runtime hooks yet.
- Run the focused reducer test.

### Unit B — Controller Reducer Integration

- Move controller phase state to reducer.
- Remove the `entryCommitted` input pattern.
- Replace exactly-once runtime side-effect refs with reducer-owned transition/effect signals where practical.
- Keep dwell and timer refs that are not phase authority.
- Run controller tests.

### Unit C — Orchestrator Adapter Integration

- Refactor `use-test-entry-orchestrator.ts` into a reducer-aware adapter.
- Remove its local phase-state ownership.
- Preserve entry-side effect ownership.
- Update orchestrator tests.
- Confirm the client no longer has `entryCommittedForController`.

### Unit D — SD-1 Client And QA Sync

- Update `test-question-client.tsx` render mapping to consume reducer-backed state.
- Update QA path config and Phase 10 checker.
- Run SD-1 focused checks and the required smoke specs.
- Stop here if SD-1 fails. Do not begin SD-2 until SD-1 is green.

### Unit E — Response-Set Read Boundary

- Add `readResponseSet()`.
- Export it.
- Add response-set unit tests.

### Unit F — Bootstrap Resume

- Extend pure bootstrap inputs/outputs for active-run resume.
- Add bootstrap unit tests for priority and resume cases.
- Resolve the resume-index decision before coding this unit.

### Unit G — Live Active-Run Wiring

- Wire active-run save/read/refresh in the controller.
- Persist response changes and tail resets consistently.
- Add controller unit tests.

### Unit H — Resume E2E And Docs

- Add the reload/direct re-entry smoke.
- Run SD-2 focused checks.
- Update `docs/project-analysis.md` after code is verified.

## 13. Failure Handling

- If hook order becomes awkward, do not delete `use-test-entry-orchestrator.ts` as the escape hatch. Prefer modeling auto-commit as an adapter-dispatched commit after bootstrap, or introduce a small composed hook only if it reduces coupling without widening scope.
- If the resume-index contract remains unresolved, stop before SD-2 bootstrap implementation and ask the user. Do not choose silently.
- If QA script checks become brittle, prefer executable unit coverage over fragile static string matching. Keep static checks only for stable ownership rules.
- If source files approach the AGENTS.md size/splitting limits, stop and propose a refactoring plan before continuing.
- If Playwright visual diffs appear, treat them as blockers unless they are clearly caused by an approved behavior change. Do not regenerate baselines for SD-1/SD-2 by default.

## 14. Approval Boundary

This plan is a specification for later implementation. It does not authorize code changes until explicitly approved.

Before executing SD-2, confirm the resume-index decision:

- Resume at the last answered question, as stated in `docs/req-test.md §3.3`.
- Resume at the next unanswered question or last question, as stated in `docs/req-test-plan.md SD-2`.

The implementation should proceed only after this ambiguity is resolved.
