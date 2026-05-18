# Pre-Result Refactoring Candidate Survey

## Scope Confirmation
- Included: landing test discovery, landing-to-test entry, instruction overlay, qualifier/profile-answer collection, active question flow, pre-result resume/storage, reducer/state management, pre-result telemetry, i18n keys that affect pre-result controls, and unit/E2E/QA coverage for those behaviors.
- Excluded: result screen content, result pipeline, score derivation, result-detail behavior, history pages, blog pages, and post-result persistence. Mixed files were inspected only for the pre-result responsibilities; result/history/blog branches are explicitly marked out of scope where they appear in the evidence.
- Read-only status: source code, tests, QA scripts, locale files, and configuration files were inspected only. The only repository change from this survey is this Markdown report.

## Executive Summary
- The highest-risk pre-result complexity is concentrated in bootstrap/resume handling: one hook coordinates cached bootstrap dispatch, pending transition cleanup, landing ingress precedence, active-run reads, qualifier resume validation, volatility cleanup, and reducer dispatch.
- `TestQuestionClient` remains the main integration point for pre-result rendering and behavior despite several recent extractions; it still wires entry policy, overlay visibility, qualifier model, answer locking, progress labels, answer telemetry, navigation, and submit controls in one component.
- Entry orchestration is cleaner than a monolithic client, but `useTestEntryOrchestrator` still combines consent/instruction side effects, qualifier wizard state, reentry behavior, storage writes, router redirects, and auto-commit gating.
- The `instructionSeen` key is a documented legacy exception whose ownership is split across landing storage keys, transition-store helpers, test bootstrap, and test volatility cleanup; current comments already identify it as cross-namespace state.
- Landing pre-answer ownership crosses landing UI, transition runtime, storage, and test bootstrap. The current behavior is covered, but the ownership line is broad for a pre-result answer that becomes the first scoring response.
- Coverage has improved since earlier snapshots: `InstructionOverlay`, `OverlayConnector`, qualifier entry/reentry, reducer reset, and bootstrap rules now have dedicated tests. Remaining gaps are narrower: no direct `TestQuestionClient` behavior test, no E2E assertion for `question_answered`, and no QA static anchor for qualifier reentry ownership.
- i18n key presence is currently healthy for the pre-result qualifier controls: all 12 locale files have 23 `test` namespace keys, including `overlayBack`, `cancel`, `qualifierRestartConfirm`, and `qualifierChipAriaLabel`.

## Findings

## FINDING [1]: Bootstrap/resume handling combines multiple defensive recovery paths in one hook.
EVIDENCE: `src/features/test/use-test-run-bootstrap.ts` lines 50-124; `src/features/test/question-runtime-utils.ts` lines 191-250; `tests/unit/test-question-bootstrap.test.ts` lines 38-489  
CURRENT STATE: `useTestRunBootstrap` caches the resolved bootstrap state in a ref, re-dispatches cached state through `queueMicrotask`, terminates mismatched pending transitions, prioritizes landing ingress over active-run resume, reads active-run and response-set storage, validates qualifier answers, calls `volatilizeRunData()` on invalid qualifier resume, clears stale `instructionSeen`, and dispatches `BOOTSTRAP_COMPLETE`. `resolveQuestionBootstrapState()` separately resolves landing ingress, pending transition, resume answers, missing profile prerequisites, current index, and entry mode. The unit suite contains 21 bootstrap cases covering these branches.  
SMELL / SIGNAL: Direct evidence: two near-parallel dispatch blocks exist in the same effect (`use-test-run-bootstrap.ts` lines 51-64 and 113-124), and the hook crosses transition, storage, qualifier validation, volatility, and reducer boundaries. Inference: this is accumulated defensive logic from multiple rollout rounds rather than a single narrow bootstrap responsibility.  
DEFENSIVE COMPLEXITY SIGNAL: high - stale transition recovery, invalid qualifier resume cleanup, storage filtering, cached Strict Mode-style replay, and instructionSeen clearing are all coordinated in one effect.  
RISK IF DEFERRED: high - future pre-result changes to resume, qualifier prerequisites, or landing ingress can regress one of the recovery branches without touching the visible UI.  
EFFORT: M  
AFFECTED AREA: resume / storage / qualifier / instruction / cross-cutting  
WHY THIS WAS INCLUDED: resume and qualifier recovery are central to the pre-result journey, and this hook is the densest current owner of defensive state restoration.

## FINDING [2]: `TestQuestionClient` remains the broadest pre-result integration point.
EVIDENCE: `src/features/test/test-question-client.tsx` lines 55-220; `src/features/test/test-question-client.tsx` lines 281-400; `tests/e2e/qualifier-overlay.spec.ts` lines 83-293  
CURRENT STATE: The component builds localized questions and qualifier items, calls `useTestRunController`, `useAnswerLock`, `useBeforeUnloadGuard`, `useLandingTransitionCompletion`, and `useTestEntryOrchestrator`, derives `instructionVisible`, progress labels, scoring ordinals, last scoring index, and qualifier chip labels, emits `trackQuestionAnswered`, manages slide direction, and renders overlay, qualifier chip, scoring question UI, previous navigation, and submit controls. Aggregate signal: 406 lines, 1 `useState`, 2 `useRef`, 1 `useEffect`, and 6 `useMemo` calls. Result rendering through `ResultConnector` at lines 269-278 is present but out of scope for this survey.  
SMELL / SIGNAL: Direct evidence: rendering and orchestration decisions share the same component body. Inference: the component is below the 500-line hard stop, but still acts as the composition hub where visual state, business rules, telemetry calls, and overlay wiring meet.  
DEFENSIVE COMPLEXITY SIGNAL: medium - answer locking, submitted guards, overlay visibility guards, profile-skip progress, and qualifier reentry guards are all visible in the component.  
RISK IF DEFERRED: high - small UI changes to the active question panel or overlay can accidentally alter entry state, telemetry, or storage-triggered behavior.  
EFFORT: L  
AFFECTED AREA: test entry / instruction / qualifier / active question / telemetry / cross-cutting  
WHY THIS WAS INCLUDED: it is the visible pre-result surface and the primary point where multiple extracted hooks are recomposed.

## FINDING [3]: Entry orchestration still owns side effects, qualifier wizard flow, reentry, storage writes, and auto-commit gating.
EVIDENCE: `src/features/test/use-test-entry-orchestrator.ts` lines 43-199; `src/features/test/use-qualifier-overlay-wizard.ts` lines 24-95; `src/features/test/use-entry-side-effects.ts` lines 19-39; `src/features/test/use-auto-commit.ts` lines 17-57  
CURRENT STATE: `useTestEntryOrchestrator` derives committed/redirecting state, delegates overlay step and draft state to `useQualifierOverlayWizard`, delegates consent/instruction/landing-ingress side effects to `useEntrySideEffects`, exposes `reopenQualifierOverlay`, and runs `executeInstructionAction`. That action writes consent, records instruction seen, redirects home, advances qualifier steps, blocks continue until a qualifier token exists, resets scoring answers on reentry, writes qualifier-only response sets, dispatches `COMMIT_ENTRY`, writes qualifier answers to storage, resets the wizard, and participates in auto-commit through `useAutoCommit`.  
SMELL / SIGNAL: Direct evidence: lines 81-174 contain consent writes, reducer dispatches, router navigation, qualifier step branching, and response-set writes in one callback. Inference: the hook name suggests entry orchestration, but current ownership spans UI wizard state, storage persistence, navigation, and policy effects.  
DEFENSIVE COMPLEXITY SIGNAL: high - the same callback handles not-ready guards, redirect guards, missing qualifier selections, multi-step progression, reentry reset, and fresh entry commit.  
RISK IF DEFERRED: high - qualifier reentry or consent-policy edits can change storage and reducer behavior through one shared callback.  
EFFORT: M  
AFFECTED AREA: test entry / instruction / qualifier / storage / resume  
WHY THIS WAS INCLUDED: this is the main pre-result ownership boundary between instruction policy and runtime state.

## FINDING [4]: `instructionSeen` is a legacy cross-namespace storage exception with multiple owners.
EVIDENCE: `src/features/landing/storage/storage-keys.ts` lines 71-84; `src/features/transition/store.ts` lines 138-159; `src/features/test/storage/test-storage-keys.ts` lines 3-8; `src/features/test/storage/volatility.ts` lines 32-49  
CURRENT STATE: The key factory for `instructionSeen` lives under landing storage as `vivetest-test-instruction-seen:{variant}`. Transition-store helpers read and write it, with a comment stating the helpers are consumed exclusively by `src/features/test/**`. The test storage key file explicitly excludes `instructionSeen` and points to a prior refactoring report. The volatility cleanup removes the same landing-defined session key while deleting test active-run, response-set, and flag data.  
SMELL / SIGNAL: Direct evidence: source comments call this a cross-namespace dependency and a known ADR-B legacy exception. Inference: ownership is ambiguous because the key is semantically test-domain state but structurally owned by landing/transition modules.  
DEFENSIVE COMPLEXITY SIGNAL: high - several modules carry explanatory comments to keep the split understandable, and cleanup spans localStorage plus sessionStorage namespaces.  
RISK IF DEFERRED: medium - storage migrations, resume resets, or volatility changes can miss one side of the split.  
EFFORT: M  
AFFECTED AREA: instruction / resume / storage / cross-cutting  
WHY THIS WAS INCLUDED: the request explicitly called out storage/resume/overlay ownership ambiguity, and this split is documented inside the source.

## FINDING [5]: Landing pre-answer ownership crosses landing UI, transition runtime, and test bootstrap.
EVIDENCE: `src/features/landing/grid/landing-catalog-grid.tsx` lines 65-87; `src/features/landing/grid/landing-grid-card.tsx` lines 412-457; `src/features/transition/use-landing-transition.ts` lines 21-40; `src/features/transition/runtime.ts` lines 33-68; `src/features/test/question-runtime-utils.ts` lines 65-94  
CURRENT STATE: The landing card resolves a test preview payload, renders answer choice buttons, and passes `A`/`B` selections up to the catalog grid. `useLandingTransition` turns that selection into a test transition, `beginLandingTransition` writes a landing ingress record and emits `card_answered`, and test bootstrap maps the stored `preAnswerChoice` to the first scoring question. For profile-first EGTT, bootstrap can start at the profile question while preserving the seeded first scoring answer. Blog rendering branches in `landing-grid-card.tsx` lines 482-543 are out of scope.  
SMELL / SIGNAL: Direct evidence: one user click travels through landing rendering, transition routing, transition storage, telemetry, and test bootstrap before it becomes a response key. Inference: the behavior is intentional and covered, but the ownership path is broad for a single pre-result answer seed.  
DEFENSIVE COMPLEXITY SIGNAL: medium - the profile-first variant path requires special bootstrap behavior and stale active-run precedence rules.  
RISK IF DEFERRED: medium - future variants with profile/qualifier rows can make landing-ingress and runtime-start assumptions harder to reason about.  
EFFORT: M  
AFFECTED AREA: landing / test entry / active question / telemetry / storage  
WHY THIS WAS INCLUDED: landing discovery and test entry are in scope, and this is the handoff where landing state becomes test runtime state.

## FINDING [6]: `question-runtime-utils.ts` has become a catch-all for bootstrap, profile skipping, response filtering, and progress.
EVIDENCE: `src/features/test/question-runtime-utils.ts` lines 39-94; `src/features/test/question-runtime-utils.ts` lines 96-189; `src/features/test/question-runtime-utils.ts` lines 191-255; `src/features/test/use-test-run-controller.ts` lines 111-165 and 186-235; `tests/unit/test-question-bootstrap.test.ts` lines 129-489  
CURRENT STATE: The utility module exports first-scoring lookup, forward/back profile skipping, initial question resolution, initial answer resolution, response-set filtering, profile-prerequisite checks, resume index selection, qualifier-token bootstrap normalization, scoring progress, full bootstrap state resolution, and `isProfileQuestion`. The controller uses profile-skip and scoring-progress helpers while also performing live next-question search and tail-reset persistence. The bootstrap test file covers most of these utilities, while `tests/unit/test-question-runtime-utils.test.ts` only covers `isProfileQuestion`.  
SMELL / SIGNAL: Direct evidence: one 255-line utility file holds both pure small helpers and the full bootstrap state resolver. Inference: helper boundaries grew around recent profile/qualifier/resume needs and now mix concepts that change for different reasons.  
DEFENSIVE COMPLEXITY SIGNAL: medium - multiple helpers protect against profile rows, stale response keys, missing answers, landing ingress precedence, and qualifier-token normalization.  
RISK IF DEFERRED: medium - changes to profile/qualifier behavior may require coordinated edits across bootstrap and live navigation paths.  
EFFORT: M  
AFFECTED AREA: active question / resume / qualifier / storage / cross-cutting  
WHY THIS WAS INCLUDED: duplicated validation and mixed bootstrap/runtime ownership were explicit survey targets.

## FINDING [7]: The reducer is pure, but its action surface mixes bootstrap, entry, answer, submit, and qualifier-reset concerns.
EVIDENCE: `src/features/test/test-run-reducer.ts` lines 8-50; `src/features/test/test-run-reducer.ts` lines 103-203; `tests/unit/test-run-reducer.test.ts` lines 5-194; `tests/unit/test-run-reducer.test.ts` lines 196-331  
CURRENT STATE: `TestRunState` stores phase, landing ingress flag, current index, answers, instructionSeen, entry sequence, entry mode, and entry answer snapshots. Actions cover bootstrap completion, entry commit, redirect home, answer selection, previous navigation, submit with caller-provided `allAnswered`, and scoring reset with caller-provided qualifier answers. The reducer tests include 20 cases, including qualifier answer merging and `RESET_SCORING_ANSWERS`.  
SMELL / SIGNAL: Direct evidence: reducer state is compact and pure, but action payloads encode multiple layers of pre-result semantics. Inference: completion and qualifier semantics are intentionally caller-owned, leaving the reducer dependent on external precomputed facts while still carrying qualifier reset state.  
DEFENSIVE COMPLEXITY SIGNAL: medium - phase guards prevent actions outside valid phases, and caller-owned payloads preserve reducer purity at the cost of broader action contracts.  
RISK IF DEFERRED: medium - future action additions can make the reducer a central integration contract even if side effects remain outside it.  
EFFORT: S  
AFFECTED AREA: reducer/state management / qualifier / active question / resume  
WHY THIS WAS INCLUDED: reducer/state ownership is in scope, and this is the state contract every pre-result flow crosses.

## FINDING [8]: Pre-result telemetry validation carries intentional event-contract divergence and shares files with out-of-scope result events.
EVIDENCE: `src/features/telemetry/types.ts` lines 5-75; `src/features/telemetry/validation.ts` lines 7-14, 110-121, 143-199; `src/features/telemetry/runtime.ts` lines 247-314; `tests/unit/telemetry-question-answered.test.ts` lines 47-85 and 112-129  
CURRENT STATE: The telemetry union includes landing, card, attempt, final submit, question answered, and result viewed events. Runtime helpers map `card_answered`, `attempt_start`, `final_submit`, and `question_answered` into payload fields used before or at submission. Validation intentionally treats `attempt_start` and `final_submit` `question_index_1based` as finite numbers while `question_answered` requires an integer. `result_viewed` validation and tests are in the same files but are result-related and out of scope for this survey.  
SMELL / SIGNAL: Direct evidence: comments in validation lines 143-148 say the index checks are intentionally different and require an explicit telemetry contract decision to unify. Inference: pre-result telemetry contracts have grown event-by-event rather than through one uniform event-shape policy.  
DEFENSIVE COMPLEXITY SIGNAL: medium - shared forbidden-field checks are uniform, but per-event index and session rules diverge.  
RISK IF DEFERRED: medium - additional pre-result telemetry events can inherit inconsistent validation expectations.  
EFFORT: M  
AFFECTED AREA: telemetry / QA / cross-cutting  
WHY THIS WAS INCLUDED: telemetry was explicitly in scope, and current validation code contains direct evidence of contract divergence.

## FINDING [9]: `question_answered` and answer-lock user-flow behavior are not fully browser-enforced.
EVIDENCE: `src/features/test/test-question-client.tsx` lines 189-219 and 345-363; `src/features/test/use-answer-lock.ts` lines 16-55; `scripts/qa/check-phase11-telemetry-contracts.mjs` lines 165-183; `tests/unit/telemetry-question-answered.test.ts` lines 47-85 and 112-129; `tests/e2e/transition-telemetry-smoke.spec.ts` lines 196-250  
CURRENT STATE: `TestQuestionClient` blocks answer clicks when submitted or locked, emits `trackQuestionAnswered` for non-last scoring answers, and disables answer buttons while locked. `useAnswerLock` owns the 150 ms timer and lock state. Phase 11 QA statically checks the question client and answer-lock source text. Unit tests validate `question_answered` payload shape and runtime mapping. The transition telemetry E2E asserts `card_answered`, `attempt_start`, and `final_submit`, but the inspected E2E telemetry flow does not assert `question_answered`.  
SMELL / SIGNAL: Direct evidence: the QA guard is regex-based and the E2E telemetry assertion filters only `card_answered`, `attempt_start`, and `final_submit` in lines 204-220. Inference: runtime behavior exists, but current browser-level enforcement is thinner than unit/static enforcement.  
DEFENSIVE COMPLEXITY SIGNAL: low - the complexity is mostly enforcement shape rather than runtime branching.  
RISK IF DEFERRED: medium - answer-lock or per-question telemetry regressions can pass the main transition telemetry browser smoke if source text still matches.  
EFFORT: S  
AFFECTED AREA: active question / telemetry / tests / QA  
WHY THIS WAS INCLUDED: the request asked for test and QA gaps around recently introduced pre-result behavior.

## FINDING [10]: Several small single-consumer helpers are now part of the pre-result control path.
EVIDENCE: `src/features/test/qualifier-resume-validator.ts` lines 1-15; `src/features/test/use-entry-side-effects.ts` lines 19-39; `src/features/test/use-auto-commit.ts` lines 17-57; `src/features/test/use-qualifier-overlay-wizard.ts` lines 24-95; repository import evidence from `src/features/test/use-test-run-bootstrap.ts` lines 13 and 80-87 and `src/features/test/use-test-entry-orchestrator.ts` lines 7-9 and 69-75  
CURRENT STATE: `hasValidQualifierAnswers` is a 15-line pure helper consumed by bootstrap and unit tests. `useEntrySideEffects`, `useAutoCommit`, and `useQualifierOverlayWizard` are small hooks consumed by `useTestEntryOrchestrator`. They improve naming around recent behavior, but they are currently single-production-consumer boundaries in the pre-result path.  
SMELL / SIGNAL: Direct evidence: import sites show these helpers are not broadly reused in production. Inference: this is a premature-abstraction signal rather than a correctness bug.  
DEFENSIVE COMPLEXITY SIGNAL: low - the helpers are small and mostly isolated, but they add call boundaries around already narrow behavior.  
RISK IF DEFERRED: low - the main cost is navigation overhead and ownership diffusion rather than immediate behavioral risk.  
EFFORT: S  
AFFECTED AREA: qualifier / resume / instruction / storage  
WHY THIS WAS INCLUDED: single-consumer utility modules were an explicit discovery target.

## Priority Table

| Order | Finding | Affected Area | Max Risk | Defensive Complexity | Effort | Rationale |
|---:|---|---|---|---|---|---|
| 1 | Bootstrap/resume handling combines multiple defensive recovery paths in one hook. | resume / storage / qualifier / instruction / cross-cutting | high | high | M | Highest combination of recovery branches and cross-layer side effects; affects at least bootstrap, runtime utils, storage, transition, qualifier validation, and reducer dispatch. |
| 2 | Entry orchestration still owns side effects, qualifier wizard flow, reentry, storage writes, and auto-commit gating. | test entry / instruction / qualifier / storage / resume | high | high | M | One callback spans consent, redirect, qualifier, storage, reducer, and auto-commit behavior. |
| 3 | `TestQuestionClient` remains the broadest pre-result integration point. | test entry / instruction / qualifier / active question / telemetry / cross-cutting | high | medium | L | Largest pre-result UI module and the composition hub for most extracted hooks and runtime controls. |
| 4 | `instructionSeen` is a legacy cross-namespace storage exception with multiple owners. | instruction / resume / storage / cross-cutting | medium | high | M | Source comments already mark the split as a legacy exception; ownership crosses landing, transition, and test storage. |
| 5 | Landing pre-answer ownership crosses landing UI, transition runtime, and test bootstrap. | landing / test entry / active question / telemetry / storage | medium | medium | M | One landing click becomes a stored test response through several modules and special profile-first bootstrap behavior. |
| 6 | `question-runtime-utils.ts` has become a catch-all for bootstrap, profile skipping, response filtering, and progress. | active question / resume / qualifier / storage / cross-cutting | medium | medium | M | A 255-line utility module mixes small helpers with full bootstrap-state resolution. |
| 7 | Pre-result telemetry validation carries intentional event-contract divergence and shares files with out-of-scope result events. | telemetry / QA / cross-cutting | medium | medium | M | Event validation has direct comments documenting intentional divergence across pre-result events. |
| 8 | The reducer is pure, but its action surface mixes bootstrap, entry, answer, submit, and qualifier-reset concerns. | reducer/state management / qualifier / active question / resume | medium | medium | S | Pure and well tested, but action contracts are still broad and central. |
| 9 | `question_answered` and answer-lock user-flow behavior are not fully browser-enforced. | active question / telemetry / tests / QA | medium | low | S | Behavior exists and has unit/static checks, but E2E telemetry smoke does not assert the per-question event. |
| 10 | Several small single-consumer helpers are now part of the pre-result control path. | qualifier / resume / instruction / storage | low | low | S | Low-risk premature-abstraction signal from small helpers with one production consumer. |

## Coverage / Enforcement Gaps

- No direct `TestQuestionClient` unit/integration test was found in `tests/**`. Direct evidence: the component export is at `src/features/test/test-question-client.tsx` lines 55-406, while current coverage is around child/pure units (`tests/unit/instruction-overlay.test.ts` lines 54-221, `tests/unit/overlay-connector.test.ts` lines 84-160, hook tests) and browser suites (`tests/e2e/qualifier-overlay.spec.ts` lines 83-293).
- `question_answered` is unit-tested and statically guarded, but not asserted in the inspected E2E telemetry smoke. Direct evidence: unit validation/runtime mapping at `tests/unit/telemetry-question-answered.test.ts` lines 47-85 and 112-129; static QA at `scripts/qa/check-phase11-telemetry-contracts.mjs` lines 135-174; E2E transition telemetry filter/assertions at `tests/e2e/transition-telemetry-smoke.spec.ts` lines 204-250 cover `card_answered`, `attempt_start`, and `final_submit`.
- Answer-lock behavior is source-text guarded by QA but lacks a dedicated unit test file in the inspected test list. Direct evidence: `useAnswerLock` implementation at `src/features/test/use-answer-lock.ts` lines 16-55; QA regex guard at `scripts/qa/check-phase11-telemetry-contracts.mjs` lines 165-183; no `tests/unit/*answer-lock*` file was present in the file inventory.
- Qualifier reentry has unit and E2E coverage, but static QA path configuration does not name qualifier-specific modules. Direct evidence: `scripts/qa/_path-config.mjs` lines 59-67 lists test client, answer lock, run controller, bootstrap, reducer, entry orchestrator, and entry side effects; qualifier reentry coverage exists in `tests/unit/test-entry-orchestrator-reentry.test.ts` lines 79-166 and `tests/e2e/qualifier-overlay.spec.ts` lines 221-293.
- i18n key presence did not show a current gap for pre-result qualifier controls. Direct evidence: `src/messages/en.json` lines 35-54, `src/messages/kr.json` lines 35-54, and `src/messages/ja.json` lines 35-54 all include `next`, `cancel`, `overlayBack`, `qualifierRestartConfirm`, `qualifierPending`, and `qualifierChipAriaLabel`; static inspection found the same 23 `test` namespace keys across all 12 locale files.

## Limitations

- No source, test, QA, locale, or configuration file was modified. This report is the only repository change.
- No test, lint, typecheck, build, or Playwright command was run because the request was a read-only evidence survey with no runtime behavior change.
- Evidence is based on static file inspection and line-anchored current checkout state.
- Result screen, result pipeline, score derivation, history, and blog behavior were not analyzed beyond marking mixed-file branches as out of scope.
