# Refactoring Candidates

Scope: read-only evidence survey of current implementation state. Result score derivation, result URL construction, and full result-screen pipeline are intentionally excluded except where a listed target explicitly asks for telemetry/result-panel evidence.

Limitations: no test or QA command was executed. Counts and line ranges are static source evidence from the current checkout on 2026-05-17.

## TARGET [1] — `test-question-client.tsx` size and responsibility mix

LINE COUNT: 486

FINDING [1.1]: The client component is below the 500-line hard stop but now combines runtime rendering, entry overlay wiring, qualifier chip UI, answer-lock timing, transition completion, and telemetry call-site logic.
EVIDENCE: `src/features/test/test-question-client.tsx` lines 54-97, 196-236, 238-279, 328-479
SMELL / SIGNAL: one component owns phase display, derived labels, qualifier reentry props, a 150 ms timer, answer locking, `trackQuestionAnswered`, and `TestResultPanel` prop threading.
RISK IF DEFERRED: high — future runtime or overlay changes have to preserve several independent contracts in one render file.
EFFORT: L

CURRENT STATE:

| Inventory | Evidence |
|:---|:---|
| Total line count | `src/features/test/test-question-client.tsx` = 486 lines |
| React `useState` calls | `slideDirection` at line 71, initial `'forward'`; `isAnswerLocked` at line 72, initial `false` |
| React `useMemo` calls | `landingPath` line 60; `questions` line 61; `qualifierItems` lines 62-68; `entryPolicy` lines 157-166; `lastScoringCanonicalIndex` lines 222-225; `qualifierChipLabel` lines 226-236 |

External hook calls:

| Hook call | Import source | Line |
|:---|:---|---:|
| `useTranslations('test')` | `next-intl` | 55 |
| `usePathname()` | `next/navigation` | 56 |
| `useRouter()` | `next/navigation` | 57 |
| `useTelemetryConsentSource()` | `@/features/telemetry/consent-source` | 58 |
| `useReducedMotion()` | `motion/react` | 73 |
| `useTestRunController(...)` | `@/features/test/use-test-run-controller` | 75-97 |
| `useTestEntryOrchestrator(...)` | `@/features/test/use-test-entry-orchestrator` | 170-194 |

Non-rendering logic blocks:

| Block | Evidence | What it does |
|:---|:---|:---|
| Timer cleanup callback | `test-question-client.tsx` lines 100-105 | clears `autoAdvanceTimerRef` with `window.clearTimeout` |
| Submitted ref synchronization | lines 107-109 | keeps `submittedRef` current for delayed timer callback |
| Timer cleanup on unmount | lines 111-115 | clears auto-advance timer when component unmounts |
| Timer cleanup on question index change | lines 117-119 | clears auto-advance timer when navigation changes current question |
| Before-unload guard | lines 121-136 | registers `beforeunload` while started and not submitted |
| Pending landing transition completion | lines 138-154 | waits one animation frame, calls `completePendingLandingTransition`, clears matching transition id |
| Answer choice handler | lines 238-279 | guards locked/submitted state, writes answer through controller, emits `trackQuestionAnswered`, manages 150 ms answer lock and forward auto-advance |
| Previous button inline handler | lines 455-461 | clears timer, unlocks answer buttons, sets slide direction, moves previous |
| Qualifier chip keyboard handler | lines 402-407 | treats Enter/Space as reentry-open activation |

Conditional render/property branches: 16 render-time JSX/property branches were identified.

| # | Evidence | Branch |
|---:|:---|:---|
| 1 | lines 285-291 | `data-entry-status` chained ternary: redirecting / booting / submitted / started / ready |
| 2 | lines 328-338 | `submitted ? <TestResultPanel> : ...` |
| 3 | lines 340-387 | `instructionVisible ? <InstructionOverlay> : null` |
| 4 | lines 346-350 | primary label switches to `next` for instruction + qualifier |
| 5 | line 351 | secondary label exists only when `secondaryButton` exists |
| 6 | lines 355-361 | secondary action exists only when `secondaryButton` exists |
| 7 | lines 364-385 | `qualifierStep` object exists only when `currentQualifierItem` exists |
| 8 | lines 373-378 | continue label selects `next`, `qualifierRestartConfirm`, or `start` |
| 9 | line 382 | reentry back label selects `cancel`; entry-mode fallback is delegated to overlay |
| 10 | line 391 | question panel `aria-hidden` depends on `instructionVisible` |
| 11 | lines 394-411 | qualifier chip renders only after entry commit, only with qualifier items, and not during reentry |
| 12 | lines 412-416 | question number renders only for a current scoring question |
| 13 | line 428 | answer A selected state |
| 14 | line 440 | answer B selected state |
| 15 | line 463 | previous button visibility hides at question index 1 |
| 16 | lines 469-479 | submit button renders only on last question |

SUMMARY: The file is still one component but has become the visible integration point for entry orchestration, controller state, telemetry, motion, lock timing, and result-panel entry. The main refactoring opportunity is structural risk, not a single broken branch.

## TARGET [2] — `use-test-entry-orchestrator.ts` post-Wave-B state

LINE COUNT: 241

FINDING [2.1]: The orchestrator owns overlay state plus consent, transition-store, router, reducer, and response-storage side effects.
EVIDENCE: `src/features/test/use-test-entry-orchestrator.ts` lines 56-61, 106-198, 200-227, 229-240
SMELL / SIGNAL: a hook named as entry orchestration now writes consent, marks instruction seen, clears landing ingress, navigates home, dispatches reducer actions, writes qualifier response sets, and handles reentry reset.
RISK IF DEFERRED: high — entry and reentry behavior can drift across storage, reducer, and overlay state because all side effects are coupled inside one callback.
EFFORT: M

CURRENT STATE:

State calls:

| State | Type | Initial value | Evidence |
|:---|:---|:---|:---|
| `overlayStep` | `OverlayStepId` = `'instruction' | number` | `'instruction'` | line 59 |
| `overlayMode` | `'entry' | 'reentry'` | `'entry'` | line 60 |
| `qualifierDraft` | `Record<number, string>` | `{}` | line 61 |

Functions/callbacks defined inside the hook:

| Function | Evidence | What it does |
|:---|:---|:---|
| `buildQualifierAnswers` | lines 63-70 | converts selected qualifier draft tokens into string-keyed canonical response entries |
| `onQualifierBack` | lines 72-86 | backs up qualifier step; in reentry at step 0, cancels reentry and clears draft |
| `onQualifierSelect` | lines 88-90 | stores a token by canonical qualifier index |
| `reopenQualifierOverlay` | lines 92-104 | seeds draft from current answers and switches to reentry step 0 |
| `executeInstructionAction` | lines 106-198 | applies policy effects, consent writes, redirects, qualifier step progression, entry commit, and reentry confirm/reset |
| auto-commit effect callback | lines 200-227 | queues `executeInstructionAction('start')` when instruction was already seen and auto-commit is allowed |

Return shape:

| Returned field | Evidence |
|:---|:---|
| `instructionSeen`, `entryCommitted`, `redirecting` | lines 230-232 |
| `overlayStep`, `overlayMode`, `qualifierDraft` | lines 233-235 |
| `executeInstructionAction`, `onQualifierSelect`, `onQualifierBack`, `reopenQualifierOverlay` | lines 236-239 |

Misplaced-responsibility signals:

| Responsibility | Evidence |
|:---|:---|
| Consent mutation | `setTelemetryConsentState(effect.writesConsent)` lines 113-115 |
| Instruction storage mutation | `markInstructionSeen(variant)` lines 117-119 |
| Redirect-phase reducer + landing ingress clear + router replace | lines 121-129 |
| Reentry storage write and scoring reset | lines 156-163 |
| Entry commit reducer action and qualifier storage write | lines 166-176 |
| Microtask auto-commit scheduling | lines 214-217 |

SUMMARY: The orchestrator is currently a stateful adapter between instruction policy, overlay wizard state, reducer actions, transition store, response storage, and router navigation. The risk is not file size alone; it is the breadth of side-effect ownership behind one exported hook.

## TARGET [3] — `use-test-run-controller.ts` post-D2 state

LINE COUNT: 435

FINDING [3.1]: The controller now owns bootstrap/resume, storage reads and writes, dwell tracking, scoring-only completion, telemetry dispatch, response filtering, and question navigation.
EVIDENCE: `src/features/test/use-test-run-controller.ts` lines 4-27, 127-221, 223-272, 274-388, 390-410
SMELL / SIGNAL: a single hook integrates transition store, active-run storage, response storage, qualifier resume validation, reducer bootstrap, attempt/final telemetry, dwell accounting, and movement rules.
RISK IF DEFERRED: high — small changes to resume, qualifier, telemetry, or navigation can accidentally alter the same controller state graph.
EFFORT: L

Refs:

| Ref | Initial value | Purpose inferred from usage | Evidence |
|:---|:---|:---|:---|
| `dwellStartRef` | `null` | current question dwell start timestamp | line 137; used lines 287-295, 402-404 |
| `dwellByQuestionRef` | `{}` | accumulated dwell milliseconds by question id | line 138; used lines 292-293, 371 |
| `processedEntrySequenceRef` | `0` | prevents duplicate attempt-start side effects for the same reducer entry sequence | line 139; used lines 223-229 |
| `bootstrapStateRef` | `null` | caches bootstrap state so later effect runs reuse it instead of re-reading storage | line 140; used lines 144-160, 207-220 |
| `pendingTransitionIdRef` | `null` | mutable pending transition id backing state setter/clearer | line 141; used lines 157, 207, 407-410 |

Effects and callbacks:

| Hook | Evidence | Dependency array |
|:---|:---|:---|
| bootstrap/resume effect | lines 144-221 | `[locale, pathname, qualifierItems, questions, variant, variantId]` |
| active-entry side-effect effect | lines 223-272 | `[locale, pathname, runState.currentQuestionIndex, runState.entryMode, runState.entryAnswersSnapshot, runState.entrySequence, runState.landingIngressFlag, runState.phase, questions, variant, variantId]` |
| `resetScoringAnswers` callback | lines 390-400 | `[questions]` |
| `getCurrentDwellMs` callback | lines 402-405 | `[]` |
| `clearPendingTransitionId` callback | lines 407-410 | `[]` |

Returned functions:

| Function | Evidence | Description |
|:---|:---|:---|
| `dispatchRunAction` | line 427 | exposes reducer dispatch directly to the client/orchestrator |
| `clearPendingTransitionId` | line 428 | clears pending transition id ref and state |
| `updateAnswer` | line 429 | writes answer to reducer, response storage, and active-run timestamp |
| `moveQuestion` | line 430 | handles previous/next navigation, profile skipping, tail reset, and reducer advance |
| `handleSubmit` | line 431 | validates active/all-answered, settles dwell, filters profile responses, emits `final_submit`, dispatches submit |
| `resetScoringAnswers` | line 432 | dispatches `RESET_SCORING_ANSWERS` with first scoring canonical index |
| `getCurrentDwellMs` | line 433 | returns current dwell delta without settling it |

FINDING [3.2]: Several local helper blocks overlap with `question-runtime-utils.ts` profile/response helper responsibilities.
EVIDENCE: `src/features/test/use-test-run-controller.ts` lines 72-125, 274-283, 314-363, 390-397; `src/features/test/question-runtime-utils.ts` lines 40-61, 75-147, 149-213
SMELL / SIGNAL: profile skipping and semantic-response filtering appear both in controller-local helpers and in shared runtime helpers.
RISK IF DEFERRED: medium — future profile/qualifier variants may need changes in both helper locations to keep bootstrap and live navigation aligned.
EFFORT: M

Overlap map:

| Controller logic | Runtime utility logic |
|:---|:---|
| `skipForwardPastProfile` / `skipBackwardPastProfile` lines 72-92 | `findFirstScoringQuestion`, `resolveInitialQuestionIndex`, `resolveResumeQuestionIndex`, `isProfileQuestion` lines 40-61, 109-128, 211-213 |
| `buildBootstrapResponseSet` lines 94-113 | `filterResponseSetForQuestions`, `hasSemanticAnswer`, `resolveScoringProgress` lines 75-100, 130-147 |
| `buildSemanticAnswerMap` lines 115-125 | `hasSemanticAnswer` and `resolveScoringProgress` lines 130-147 |
| next-question search with profile skip lines 345-353 | resume first-unanswered selection lines 118-127 |

SUMMARY: The controller is the largest test-flow hook and the active owner of runtime effects. It already delegates some scoring progress work to `question-runtime-utils.ts`, but enough profile/response filtering remains local to create parallel contracts.

## TARGET [4] — `test-run-reducer.ts` post-D2 state

LINE COUNT: 208

FINDING [4.1]: The reducer action union has seven action types, with completion now supplied by controller-owned `allAnswered`.
EVIDENCE: `src/features/test/test-run-reducer.ts` lines 19-50, 103-208
SMELL / SIGNAL: reducer state mutation is compact, but action payloads now mix bootstrap, entry, answer, navigation, submit, and qualifier-reset concerns.
RISK IF DEFERRED: medium — action semantics remain readable today, but reducer callers own important validation and derived state outside the reducer.
EFFORT: M

Action union and mutation surface:

| Action type | Payload shape | Mutated state fields |
|:---|:---|:---|
| `BOOTSTRAP_COMPLETE` | `instructionSeen`, `landingIngressFlag`, `currentQuestionIndex`, `answers`, optional `autoCommitEntry`, optional `entryMode` | sets `phase: 'instruction'`, `landingIngressFlag`, clamped `currentQuestionIndex`, copied `answers`, `instructionSeen`, `entryMode`, clears `entryAnswersSnapshot`; if `autoCommitEntry`, also commits active entry |
| `COMMIT_ENTRY` | optional `recordsInstructionSeen`, optional `entryMode`, optional `qualifierAnswers` | merges qualifier answers, sets `phase: 'active'`, updates `instructionSeen`, increments `entrySequence`, sets `entryMode`, snapshots entry answers |
| `REDIRECT_HOME` | none | sets `phase: 'redirecting'` from instruction phase |
| `SELECT_ANSWER` | `canonicalIndex`, `choice`, `totalQuestions`, optional `advance`, optional `nextQuestionIndex` | writes `answers[String(canonicalIndex)]`; optionally advances/clamps `currentQuestionIndex` |
| `NAVIGATE_PREVIOUS` | optional `nextQuestionIndex` | sets previous `currentQuestionIndex`; replaces `answers` with entries before next index |
| `SUBMIT` | `allAnswered` | sets `phase: 'submitted'` when active and `allAnswered` is true |
| `RESET_SCORING_ANSWERS` | `firstScoringCanonicalIndex`, `qualifierAnswers` | replaces `answers` with qualifier-only map; sets `currentQuestionIndex` to first scoring canonical index |

FINDING [4.2]: Helper functions remain in the reducer file, but they are pure state helpers/selectors rather than storage or telemetry logic.
EVIDENCE: `src/features/test/test-run-reducer.ts` lines 52-101
SMELL / SIGNAL: `buildInitialTestRunState`, `isRuntimeActive`, `isRuntimeSubmitted`, `commitActiveEntry`, and `filterAnswersBeforeIndex` are colocated with reducer cases; no non-pure side effects remain in the reducer file.
RISK IF DEFERRED: low — current helper locality is mostly readability pressure, not behavior risk.
EFFORT: S

Approximate file proportion:

| Section | Lines | Proportion |
|:---|---:|---:|
| Type definitions/action union | 1-50 | about 24% |
| Helper functions/selectors | 52-101 | about 24% |
| Reducer/case-handler logic | 103-208 | about 51% |

SUMMARY: D2 left the reducer relatively pure and bounded. The main structural signal is that completion and profile/qualifier semantics are now caller-owned, while the reducer still carries qualifier-reset and entry snapshot state.

## TARGET [5] — Telemetry layer cohesion (`runtime.ts`, `types.ts`, `validation.ts`)

LINE COUNT: `runtime.ts` 329; `types.ts` 73; `validation.ts` 237

FINDING [5.1]: `runtime.ts` exposes six `track*` helpers and they mostly follow `createBaseEvent` then `enqueueOrSend`, with one dedupe outlier and one optional-field outlier.
EVIDENCE: `src/features/telemetry/runtime.ts` lines 131-166, 237-329
SMELL / SIGNAL: `trackLandingView`, `trackCardAnswered`, `trackAttemptStart`, `trackFinalSubmit`, `trackQuestionAnswered`, and `trackResultViewed` all build base events and enqueue/send; `trackLandingView` can return `null` after dedupe, and `trackResultViewed` conditionally includes `derived_type`.
RISK IF DEFERRED: low — helper shape is cohesive, but return-type and optional-field differences require caller awareness.
EFFORT: S

Runtime helper pattern:

| Helper | Evidence | Pattern notes |
|:---|:---|:---|
| `trackLandingView` | lines 237-245 | dedupes by locale/route, may return `null`, then enqueues base event |
| `trackCardAnswered` | lines 247-259 | base event plus `source_variant`, `target_route`, `landing_ingress_flag: true` |
| `trackAttemptStart` | lines 261-276 | base event plus variant, canonical question index, dwell, ingress flag |
| `trackFinalSubmit` | lines 278-295 | base event plus variant, canonical question index, dwell, ingress flag, final responses |
| `trackQuestionAnswered` | lines 297-314 | base event plus variant, canonical question index, A/B choice, dwell, ingress flag |
| `trackResultViewed` | lines 316-329 | base event plus variant, optional `derived_type`, ingress flag |

FINDING [5.2]: `validation.ts` has a consistent common-field gate, but event-specific branches have uneven strictness.
EVIDENCE: `src/features/telemetry/validation.ts` lines 66-85, 110-119, 121-237
SMELL / SIGNAL: common shape and forbidden-field checks are shared, but `attempt_start` and `final_submit` accept finite numeric `question_index_1based`, while `question_answered` requires an integer; `result_viewed` is thinner and not covered by the post-attempt session-id check.
RISK IF DEFERRED: medium — telemetry payload rules can drift by event type even when field names look parallel.
EFFORT: M

Validation branch structure:

| Branch | Evidence | Validation shape |
|:---|:---|:---|
| Common payload shape | lines 66-85 | object, event type allowlist, event id/session/ts/locale/route/consent type checks |
| Common semantic checks | lines 121-128 | common fields, consent state, forbidden/legacy field recursion |
| `card_answered` | lines 130-139 | source variant, target route, target route starts `/`, `landing_ingress_flag === true` |
| `attempt_start` | lines 140-151 | variant, finite question index >= 1, finite dwell >= 0, boolean ingress flag |
| `final_submit` | lines 152-179 | attempt-like fields plus non-empty `final_responses`, canonical response keys, `A`/`B` values |
| `question_answered` | lines 180-192 | variant, integer question index >= 1, `A`/`B` choice, finite dwell, boolean ingress flag |
| `result_viewed` | lines 193-207 | variant, boolean ingress flag, optional non-empty `derived_type` |
| post-attempt session rule | lines 110-119, 219-237 | requires session id for `attempt_start`, `final_submit`, `question_answered`; excludes `result_viewed` |

FINDING [5.3]: The discriminated union uses snake_case payload fields consistently, but interface naming is less uniform.
EVIDENCE: `src/features/telemetry/types.ts` lines 5-73
SMELL / SIGNAL: event payload fields use `event_type`, `session_id`, `question_index_1based`, `dwell_ms`, `landing_ingress_flag`, and `derived_type`; newer interfaces are named `QuestionAnsweredEvent` and `ResultViewedEvent` rather than `*TelemetryEvent`.
RISK IF DEFERRED: low — this is mostly API readability, not runtime behavior.
EFFORT: S

Union shape:

| Event interface | Event type | Event-specific fields |
|:---|:---|:---|
| `LandingViewTelemetryEvent` | `landing_view` | none beyond base |
| `CardAnsweredTelemetryEvent` | `card_answered` | `source_variant`, `target_route`, `landing_ingress_flag: true` |
| `AttemptStartTelemetryEvent` | `attempt_start` | `variant`, `question_index_1based`, `dwell_ms_accumulated`, `landing_ingress_flag` |
| `FinalSubmitTelemetryEvent` | `final_submit` | `variant`, `question_index_1based`, `dwell_ms_accumulated`, `landing_ingress_flag`, `final_responses` |
| `QuestionAnsweredEvent` | `question_answered` | `variant`, `question_index_1based`, `choice`, `dwell_ms`, `landing_ingress_flag` |
| `ResultViewedEvent` | `result_viewed` | `variant`, optional `derived_type`, `landing_ingress_flag` |

FINDING [5.4]: There is no substantial duplicate runtime validation in `runtime.ts`; validation is centralized through `enqueueOrSend`, but call sites still decide event timing and payload inclusion.
EVIDENCE: `src/features/telemetry/runtime.ts` lines 131-145, 237-329; `src/features/telemetry/validation.ts` lines 121-237; `src/features/test/test-question-client.tsx` lines 245-255; `src/features/test/test-result-panel.tsx` lines 53-61
SMELL / SIGNAL: `runtime.ts` maps typed inputs and immediately validates via `enqueueOrSend`; event timing remains outside the telemetry layer.
RISK IF DEFERRED: medium — QA can confirm helper availability while still missing call-site regressions.
EFFORT: M

SUMMARY: The telemetry layer is cohesive at the helper/type/validation boundary, but event-specific strictness and call-site enforcement are not symmetrical. The biggest current signal is QA enforceability rather than helper duplication.

## TARGET [6] — `qualifier-overlay-model.ts` and `qualifier-resume-validator.ts`

LINE COUNT: `qualifier-overlay-model.ts` 40; `qualifier-resume-validator.ts` 15

FINDING [6.1]: `buildQualifierOverlayModel` is a small pure module with a single production call site and several test/type import sites.
EVIDENCE: `src/features/test/qualifier-overlay-model.ts` lines 1-40; `src/features/test/test-question-client.tsx` lines 17, 62-68; `src/features/test/instruction-overlay.tsx` line 3; `src/features/test/use-test-entry-orchestrator.ts` line 7; `src/features/test/use-test-run-controller.ts` line 14; `tests/unit/qualifier-overlay-model.test.ts` lines 3-75
SMELL / SIGNAL: the exported function is used for production model construction only in `test-question-client.tsx`; other production imports consume the exported type.
RISK IF DEFERRED: medium — the module is clean, but its single production consumer makes it a possible premature abstraction boundary.
EFFORT: S

Exported API:

| File | Exports |
|:---|:---|
| `qualifier-overlay-model.ts` | `QualifierOverlayChoice`, `QualifierOverlayItem`, `buildQualifierOverlayModel(...)` |
| `qualifier-resume-validator.ts` | `hasValidQualifierAnswers(...)` |

Import sites:

| Symbol | Import sites |
|:---|:---|
| `buildQualifierOverlayModel` | `src/features/test/test-question-client.tsx` line 17; `tests/unit/qualifier-overlay-model.test.ts` line 5 |
| `QualifierOverlayItem` type | `src/features/test/test-question-client.tsx` line 17; `src/features/test/instruction-overlay.tsx` line 3; `src/features/test/use-test-entry-orchestrator.ts` line 7; `src/features/test/use-test-run-controller.ts` line 14; `src/features/test/qualifier-resume-validator.ts` line 1; related unit tests |
| `hasValidQualifierAnswers` | `src/features/test/use-test-run-controller.ts` line 15; `tests/unit/qualifier-resume-validator.test.ts` line 4 |

FINDING [6.2]: `qualifier-resume-validator.ts` is a 15-line pure helper with one production consumer.
EVIDENCE: `src/features/test/qualifier-resume-validator.ts` lines 1-15; `src/features/test/use-test-run-controller.ts` lines 15, 174-183; `tests/unit/qualifier-resume-validator.test.ts` lines 17-37
SMELL / SIGNAL: the validator is isolated and unit-tested, but its only production use is inside controller bootstrap.
RISK IF DEFERRED: low — behavior is simple and directly covered, but ownership is narrow.
EFFORT: S

SUMMARY: Both qualifier utility modules are small, pure, and tested. The refactoring signal is single-consumer module shape rather than complexity or side effects.

## TARGET [7] — E2E and unit test coverage gaps (non-result)

LINE COUNT: not applicable

FINDING [7.1]: Dedicated unit coverage exists for most listed non-result units, but `instruction-overlay.tsx` has no dedicated unit test file.
EVIDENCE: `tests/unit/use-test-entry-orchestrator.test.ts` lines 95-227; `tests/unit/test-entry-orchestrator-qualifier.test.ts` lines 83-180; `tests/unit/test-entry-orchestrator-reentry.test.ts` lines 79-166; `tests/unit/qualifier-overlay-model.test.ts` lines 30-75; `tests/unit/qualifier-resume-validator.test.ts` lines 17-37; `tests/unit/use-test-run-controller.test.ts` lines 96-478; `tests/unit/test-result-panel.test.ts` lines 49-79; `src/features/test/instruction-overlay.tsx` lines 46-152
SMELL / SIGNAL: overlay rendering is E2E-covered via `qualifier-overlay.spec.ts`, but unit coverage is indirect/absent for the component itself.
RISK IF DEFERRED: medium — copy/test-id/render branch regressions in the overlay can require browser coverage to catch.
EFFORT: S

Dedicated unit coverage for requested files:

| Source file | Dedicated unit file exists? | Test cases |
|:---|:---|---:|
| `use-test-entry-orchestrator.ts` | Yes: `use-test-entry-orchestrator.test.ts`, `test-entry-orchestrator-qualifier.test.ts`, `test-entry-orchestrator-reentry.test.ts` | 20 total |
| `qualifier-overlay-model.ts` | Yes: `qualifier-overlay-model.test.ts` | 5 |
| `qualifier-resume-validator.ts` | Yes: `qualifier-resume-validator.test.ts` | 5 |
| `use-test-run-controller.ts` | Yes: `use-test-run-controller.test.ts` | 17 |
| `instruction-overlay.tsx` | No dedicated unit file found | 0 |
| `test-result-panel.tsx` | Yes: `test-result-panel.test.ts` | 1 |

All unit test files:

| Unit test file | Lines | Primary coverage |
|:---|---:|:---|
| `tests/unit/blog-server-model.test.ts` | 31 | blog server model |
| `tests/unit/cross-sheet-integrity.test.ts` | 127 | cross-sheet integrity |
| `tests/unit/gnb-back-navigation.test.ts` | 211 | GNB back navigation hook |
| `tests/unit/gnb-behavior.test.ts` | 110 | GNB behavior helpers |
| `tests/unit/gnb-desktop-settings.test.ts` | 188 | desktop settings hook |
| `tests/unit/gnb-keyboard-dom.test.ts` | 101 | GNB keyboard DOM helpers |
| `tests/unit/gnb-keyboard-targets.test.ts` | 222 | GNB keyboard target hook |
| `tests/unit/gnb-landing-entry-mode.test.ts` | 173 | landing GNB entry mode hook |
| `tests/unit/gnb-message-labels.test.ts` | 44 | GNB locale message labels |
| `tests/unit/gnb-mobile-menu.test.ts` | 209 | mobile menu hook |
| `tests/unit/gnb-tab-routing.test.ts` | 319 | GNB tab routing hook |
| `tests/unit/gnb-theme-transition.test.ts` | 19 | theme transition helpers |
| `tests/unit/landing-baseline-manager.test.ts` | 46 | landing baseline manager |
| `tests/unit/landing-card-contract.test.ts` | 238 | landing card render contract |
| `tests/unit/landing-data-contract.test.ts` | 389 | landing registry/data contract |
| `tests/unit/landing-desktop-shell-phase.test.ts` | 173 | desktop shell phase/motion |
| `tests/unit/landing-grid-plan.test.ts` | 176 | landing grid layout plan |
| `tests/unit/landing-hover-intent.test.ts` | 62 | hover intent helpers/hook |
| `tests/unit/landing-interaction-controller-handlers.test.ts` | 238 | landing interaction controller handlers |
| `tests/unit/landing-interaction-dom.test.ts` | 124 | interaction DOM and keyboard handoff |
| `tests/unit/landing-interaction-state.test.ts` | 313 | landing interaction reducer/model |
| `tests/unit/landing-mobile-backdrop-gesture.test.ts` | 156 | mobile backdrop gesture hook |
| `tests/unit/landing-mobile-lifecycle.test.ts` | 355 | mobile lifecycle and related hooks |
| `tests/unit/landing-mobile-scroll-lock.test.ts` | 98 | mobile scroll lock hook |
| `tests/unit/landing-runtime.test.ts` | 56 | landing runtime helpers |
| `tests/unit/landing-spacing-plan.test.ts` | 82 | spacing plan helpers |
| `tests/unit/landing-telemetry-runtime.test.ts` | 147 | telemetry runtime |
| `tests/unit/landing-telemetry-validation.test.ts` | 161 | telemetry validation |
| `tests/unit/landing-transition-runtime.test.ts` | 136 | transition runtime |
| `tests/unit/landing-transition-store.test.ts` | 166 | transition store |
| `tests/unit/locale-config.test.ts` | 33 | locale config |
| `tests/unit/locale-resolution.test.ts` | 128 | locale resolution |
| `tests/unit/localized-path.test.ts` | 16 | localized path helper |
| `tests/unit/proxy-policy.test.ts` | 105 | proxy policy |
| `tests/unit/qualifier-overlay-model.test.ts` | 75 | qualifier overlay model |
| `tests/unit/qualifier-resume-validator.test.ts` | 37 | qualifier resume validator |
| `tests/unit/question-source-parser.test.ts` | 67 | question source parser |
| `tests/unit/registry-serializer.test.ts` | 158 | registry serializer |
| `tests/unit/request-locale-header.test.ts` | 34 | request locale header |
| `tests/unit/route-builder.test.ts` | 25 | route builder |
| `tests/unit/schema-registry.test.ts` | 85 | test schema registry |
| `tests/unit/sheets-loader.test.ts` | 371 | Sheets loader |
| `tests/unit/sheets-row-normalizer.test.ts` | 154 | Sheets row normalizer |
| `tests/unit/sync-orchestration.test.ts` | 238 | sync orchestration |
| `tests/unit/telemetry-consent-banner.test.ts` | 220 | consent banner |
| `tests/unit/telemetry-question-answered.test.ts` | 154 | question/result telemetry runtime and validation |
| `tests/unit/telemetry-route.test.ts` | 84 | telemetry API route |
| `tests/unit/test-domain-derivation.test.ts` | 292 | test domain derivation |
| `tests/unit/test-domain-question-model.test.ts` | 235 | test question model validation |
| `tests/unit/test-domain-type-segment.test.ts` | 210 | type segment helpers |
| `tests/unit/test-domain-variant-validation.test.ts` | 51 | variant validation |
| `tests/unit/test-entry-orchestrator-qualifier.test.ts` | 180 | qualifier entry orchestrator path |
| `tests/unit/test-entry-orchestrator-reentry.test.ts` | 166 | qualifier reentry orchestrator path |
| `tests/unit/test-entry-policy.test.ts` | 238 | entry policy |
| `tests/unit/test-lazy-validation.test.ts` | 101 | lazy validation |
| `tests/unit/test-question-bootstrap.test.ts` | 434 | question runtime utils/bootstrap |
| `tests/unit/test-question-runtime-utils.test.ts` | 28 | question runtime utility guard |
| `tests/unit/test-result-panel.test.ts` | 79 | result panel telemetry mount |
| `tests/unit/test-run-reducer.test.ts` | 331 | test run reducer |
| `tests/unit/test-storage-active-run.test.ts` | 105 | active-run storage |
| `tests/unit/test-storage-response-set.test.ts` | 128 | response-set storage |
| `tests/unit/test-storage-state-flags.test.ts` | 88 | state flags storage |
| `tests/unit/test-storage-volatility.test.ts` | 133 | volatility cleanup |
| `tests/unit/use-test-entry-orchestrator.test.ts` | 227 | base entry orchestrator path |
| `tests/unit/use-test-run-controller.test.ts` | 478 | test run controller |
| `tests/unit/variant-question-bank.test.ts` | 88 | variant question bank |
| `tests/unit/variant-registry-runtime-integrity.test.ts` | 169 | registry runtime integrity |
| `tests/unit/vercel-analytics-gate.test.ts` | 130 | Vercel analytics gate |
| `tests/unit/vercel-speed-insights-gate.test.ts` | 131 | Vercel speed insights gate |

FINDING [7.2]: E2E coverage includes qualifier overlay and reentry flows, but known broader consent smoke paths do not use EGTT qualifier coverage.
EVIDENCE: `tests/e2e/qualifier-overlay.spec.ts` lines 83-293; `tests/e2e/consent-smoke.spec.ts` lines 129-406
SMELL / SIGNAL: qualifier-specific browser coverage lives in one spec; consent smoke paths exercise instruction contracts but not the qualifier-bearing variant path.
RISK IF DEFERRED: medium — consent/instruction regressions specific to qualifier variants can remain concentrated in a single E2E suite.
EFFORT: M

All E2E spec files:

| E2E spec | Approx. test count | Main flows covered |
|:---|---:|:---|
| `tests/e2e/a11y-smoke.spec.ts` | 5 | canonical accessibility states for landing, GNB, mobile expanded/destination, transition overlay, KR representative landing |
| `tests/e2e/consent-smoke.spec.ts` | 13 | instruction consent contract, direct/landing ingress, active-run reload, opt-out cases, unload warning |
| `tests/e2e/gnb-smoke.spec.ts` | 23 | desktop/mobile GNB settings, theme, keyboard matrix, menu, back behavior |
| `tests/e2e/grid-smoke.spec.ts` | 18 | landing grid layout, card contracts, subtitle/title continuity, spacing, unavailable overlay, desktop expanded behavior |
| `tests/e2e/qualifier-overlay.spec.ts` | 14 | EGTT qualifier navigation, selection, resume validation, reentry chip/cancel/confirm |
| `tests/e2e/routing-smoke.spec.ts` | 12 | locale redirects, global/segment 404, lazy-validation error route, html lang, blog routes |
| `tests/e2e/safari-hover-ghosting.spec.ts` | 6 | WebKit desktop hover ghosting visual gate |
| `tests/e2e/state-smoke.spec.ts` | 14 | landing state/capability, keyboard traversal, reduced motion, test answer hover |
| `tests/e2e/theme-matrix-smoke.spec.ts` | dynamic: 120 smoke + 120 gate cases | theme/layout/state screenshot matrix from manifest |
| `tests/e2e/transition-telemetry-smoke.spec.ts` | 18 | transition persistence, telemetry, return restore, mobile lifecycle, stale transition rollback |

`qualifier-overlay.spec.ts` TODO/skip markers: no `TODO`, `test.skip`, `describe.skip`, or `fixme` marker was found. The only `skip` match is the test title "resume with valid qualifier in storage skips overlay entirely" at line 178.

FINDING [7.3]: Phase 10/11 QA scripts enforce older anchors and helper existence, but not newer behavior call sites such as `overlayMode`, `reopenQualifierOverlay`, `isAnswerLocked`, or `trackQuestionAnswered` usage from the test client.
EVIDENCE: `scripts/qa/check-phase10-transition-contracts.mjs` lines 45-93; `scripts/qa/check-phase11-telemetry-contracts.mjs` lines 120-162; `src/features/test/test-question-client.tsx` lines 72, 197, 246-254, 394-405
SMELL / SIGNAL: QA checks look for helper exports and broad file anchors, but do not currently assert the newest qualifier reentry or answer-lock contracts at the static rule layer.
RISK IF DEFERRED: high — regression-sensitive behavior can be covered by unit/E2E tests but remain unenforced by the repository's static contract gate.
EFFORT: M

Phase 10 QA assertions:

| Evidence | Assertion |
|:---|:---|
| lines 6-17 | required files exist for transition runtime/signals/hook, landing runtime, test client, reducer, blog destination, mobile lifecycle/CSS, transition E2E |
| lines 25-30 | transition runtime persists pending transition and return scrollY |
| lines 32-34 | transition runtime writes landing ingress and emits `card_answered` |
| lines 36-38 | transition runtime uses internal signals instead of `transition_*` telemetry |
| lines 40-42 | transition runtime exposes complete/terminate helpers |
| lines 45-52 | question client must not depend on fallback/runtime transition id state |
| lines 54-62 | entry orchestrator must call `markInstructionSeen` and `clearLandingIngress` |
| lines 64-80 | reducer must include six action types: `BOOTSTRAP_COMPLETE`, `COMMIT_ENTRY`, `REDIRECT_HOME`, `SELECT_ANSWER`, `NAVIGATE_PREVIOUS`, `SUBMIT` |
| lines 82-93 | run controller must consume landing ingress and emit `attempt_start`/`final_submit` |
| lines 95-109 | blog destination completes/terminates transitions from route truth and must not bootstrap telemetry directly |
| lines 111-149 | transition smoke must cover listed telemetry, mobile lifecycle, signals, and scroll-lock assertions |
| lines 152-166 | grid CSS must keep mobile open/close keyframes and semantic classes |

Phase 10 enforcement gaps relative to implemented behavior:

| Gap | Current implementation evidence |
|:---|:---|
| no `RESET_SCORING_ANSWERS` check | reducer action exists at `test-run-reducer.ts` lines 46-50, 193-203 |
| no `overlayMode` / `reopenQualifierOverlay` check | orchestrator exposes them at lines 34-39, 60, 92-104, 229-240 |
| no answer-lock check | client owns `isAnswerLocked` at lines 72, 239, 263-278, 429, 441 |
| no `trackQuestionAnswered` call-site check | client calls it at lines 246-254 |

Phase 11 QA assertions:

| Evidence | Assertion |
|:---|:---|
| lines 88-99 | required telemetry, API, Playwright, helper, manifest, and visual spec files exist |
| lines 120-148 | telemetry runtime has consent states, correlation id utilities, six `track*` helpers, and no transition network helpers |
| lines 150-162 | telemetry validation rejects forbidden/legacy fields and validates `card_answered`, `final_responses`, `question_answered`, `result_viewed` |
| lines 164-299 | theme matrix manifest has expected locales/themes/viewports/cases/route templates/settle recipes/coverage closure |
| lines 301-318 | theme matrix spec uses screenshots, manifest, expanded-state waits, settings-open, and result-panel state |
| lines 320-332 | theme matrix snapshots exactly match expected file set |
| lines 334-356 | Safari ghosting spec and snapshots exactly match expected stems |
| lines 358-363 | Playwright Chromium config excludes Safari ghosting spec |

Phase 11 enforcement gaps relative to implemented behavior:

| Gap | Current implementation evidence |
|:---|:---|
| helper existence is checked, but `trackQuestionAnswered` call site is not | runtime helper at `runtime.ts` lines 297-314; client call at `test-question-client.tsx` lines 246-254 |
| helper existence is checked, but `trackResultViewed` mount call site is not | runtime helper at `runtime.ts` lines 316-329; result panel call at `test-result-panel.tsx` lines 53-61 |
| no `isAnswerLocked` static guard | client state and disabled props at `test-question-client.tsx` lines 72, 429, 441 |

SUMMARY: Coverage exists, especially for the recently introduced qualifier/reentry behavior, but static QA scripts lag behind the newer test-flow contracts. The most visible unit gap is the absence of direct `InstructionOverlay` unit coverage.

## TARGET [8] — i18n key hygiene

LINE COUNT: not applicable

FINDING [8.1]: All 12 locale files have the same 22 `test` namespace keys, and the qualifier/reentry-related keys are present in each file.
EVIDENCE: `src/messages/en.json` lines 31-54; `src/messages/{de,en,es,fr,hi,id,ja,kr,pt,ru,zs,zt}.json` lines 35, 50-53
SMELL / SIGNAL: key presence is consistent across locales; current hygiene issue is not missing keys.
RISK IF DEFERRED: low — missing-key runtime failures are unlikely for the scanned keys.
EFFORT: S

Current `test` namespace keys in every locale file:

`acceptAllAndStart`, `cancel`, `denyAndAbandon`, `denyAndStart`, `goHistory`, `goHome`, `instructionTitle`, `keepCurrentPreference`, `next`, `optedOutAvailableWarning`, `prev`, `progressLabel`, `progressValue`, `qualifierChipAriaLabel`, `qualifierPending`, `qualifierRestartConfirm`, `resultBody`, `resultLabel`, `start`, `submit`, `unknownAvailableNote`, `unknownOptOutNote`.

Qualifier/reentry key usage:

| Key | Locale-file evidence | Source usage |
|:---|:---|:---|
| `next` | line 35 in all 12 locale files | `test-question-client.tsx` lines 348, 375 |
| `qualifierRestartConfirm` | line 50 in all 12 locale files | `test-question-client.tsx` line 377 |
| `qualifierPending` | line 51 in all 12 locale files | `test-question-client.tsx` line 232 |
| `qualifierChipAriaLabel` | line 52 in all 12 locale files | `test-question-client.tsx` line 399 |
| `cancel` | line 53 in all 12 locale files | `test-question-client.tsx` line 382 |
| consent CTA/note keys | `en.json` lines 43-49 and same key set in every locale | `entry-policy.ts` lines 11-17, 151-190 |

Dead-key scan for qualifier/reentry-related keys: no dead key was found among `next`, `qualifierRestartConfirm`, `qualifierPending`, `qualifierChipAriaLabel`, or `cancel`; each is referenced from `test-question-client.tsx`.

FINDING [8.2]: Several newly relevant qualifier/reentry values are English strings in every non-English locale file.
EVIDENCE: `src/messages/de.json`, `es.json`, `fr.json`, `hi.json`, `id.json`, `ja.json`, `kr.json`, `pt.json`, `ru.json`, `zs.json`, `zt.json` lines 50-53
SMELL / SIGNAL: `qualifierRestartConfirm`, `qualifierChipAriaLabel`, and `cancel` are present but hold English values such as "Change and restart", "Change qualifier answers", and "Cancel" outside `en.json`.
RISK IF DEFERRED: medium — UI does not fail technically, but localized test-flow UI can display mixed-language controls.
EFFORT: S

FINDING [8.3]: `instruction-overlay.tsx` contains a hardcoded visible fallback string for the entry-mode qualifier back button.
EVIDENCE: `src/features/test/instruction-overlay.tsx` line 96; `src/features/test/test-question-client.tsx` lines 380-382
SMELL / SIGNAL: reentry passes localized `cancel`, but entry mode omits `backLabel`, so the overlay renders the literal string `Back`.
RISK IF DEFERRED: medium — one qualifier overlay control bypasses the locale message namespace.
EFFORT: S

Hardcoded UI string scan:

| File | Result |
|:---|:---|
| `test-question-client.tsx` | no visible hardcoded phrase found among scanned UI strings; labels use `t(...)` or fixture/card text |
| `instruction-overlay.tsx` | hardcoded visible fallback `Back` at line 96 |
| `test-result-panel.tsx` | visible labels use `t(...)` or question ids/answers; TODO comments are not UI strings |

SUMMARY: Key presence is healthy, but value localization and one hardcoded overlay fallback are not. The most concrete i18n smell is mixed-language qualifier reentry copy across non-English locales.

## ADDITIONAL FINDINGS

ADDITIONAL FINDING [A.1]: `landing-grid-card.tsx` is a 958-line mixed render/contract component.
EVIDENCE: `src/features/landing/grid/landing-grid-card.tsx` lines 80-117, 119-185, 564-692, 699-760
SMELL / SIGNAL: the file combines prop contract, media fallback generation, spacing normalization, desktop/mobile motion state derivation, data-attribute contract, and large JSX rendering.
RISK IF DEFERRED: medium — landing visual contracts remain concentrated in one very large file.
EFFORT: L
WHY THIS WAS INCLUDED: it is outside Targets 1-8 but directly matches the requested scan for large files and mixed rendering/business logic.

ADDITIONAL FINDING [A.2]: `use-landing-interaction-controller.ts` is a 526-line high-risk coordination hook.
EVIDENCE: `src/features/landing/grid/use-landing-interaction-controller.ts` lines 88-167, 168-322, 324-412, 414-526
SMELL / SIGNAL: the hook composes reducers, capability/reduced-motion listeners, visibility listeners, timer cleanup, transition cleanup, mobile lifecycle, desktop motion, keyboard handoff, and per-card binding derivation.
RISK IF DEFERRED: high — interaction behavior changes must preserve multiple page/card/mobile/desktop state machines in one hook.
EFFORT: L
WHY THIS WAS INCLUDED: it is a listed High-Risk Area in `AGENTS.md` and matches the survey criteria for oversized hooks and ownership concentration.

ADDITIONAL FINDING [A.3]: `site-gnb.tsx` still coordinates desktop/mobile render branches, settings, theme, locale routing, back navigation, menu state, and keyboard routing.
EVIDENCE: `src/features/gnb/site-gnb.tsx` lines 67-150, 152-193, 201-286, 288-401
SMELL / SIGNAL: extracted hooks exist, but the shell file remains a 401-line integration component with route-aware, device-aware, and theme-aware JSX branches.
RISK IF DEFERRED: medium — GNB changes can still require reasoning across desktop, mobile, test-context, landing-context, and settings-context branches in one file.
EFFORT: L
WHY THIS WAS INCLUDED: it is outside the explicit test-flow targets but materially relevant to accumulated refactor pressure and ownership boundaries.

ADDITIONAL FINDING [A.4]: `instructionSeen` storage ownership crosses transition, landing storage keys, and test volatility cleanup.
EVIDENCE: `src/features/transition/store.ts` lines 1, 138-150; `src/features/test/storage/volatility.ts` lines 3, 32-43; `src/features/test/storage/test-storage-keys.ts` lines 13-17; `docs/agent-guides/project-rules.md` lines 84-92
SMELL / SIGNAL: instruction state is stored through `variantSessionKeys` from landing storage, read/written in transition store, and cleared by test storage volatility; test key API does not include instructionSeen.
RISK IF DEFERRED: medium — future storage migration or cleanup changes can miss one ownership boundary.
EFFORT: M
WHY THIS WAS INCLUDED: the request explicitly called out storage/resume/overlay ownership ambiguity as a discovery dimension.

ADDITIONAL FINDING [A.5]: Canonical index key validation is duplicated across runtime utilities, response storage, and telemetry validation.
EVIDENCE: `src/features/test/question-runtime-utils.ts` lines 7, 82-84; `src/features/test/storage/response-set.ts` lines 6, 27-36; `src/features/telemetry/validation.ts` lines 6, 168-171
SMELL / SIGNAL: the same positive-integer string key contract is enforced with separate regex constants in three modules.
RISK IF DEFERRED: medium — a future canonical-key rule change has multiple enforcement sites.
EFFORT: M
WHY THIS WAS INCLUDED: it is a clear duplicated contract-enforcement pattern outside the explicit targets.

ADDITIONAL FINDING [A.6]: Project rules still list question-level telemetry hooks as unimplemented while current runtime exposes and tests `question_answered`/`result_viewed`.
EVIDENCE: `docs/agent-guides/project-rules.md` lines 119-127; `src/features/telemetry/runtime.ts` lines 297-329; `tests/unit/telemetry-question-answered.test.ts` lines 47-154
SMELL / SIGNAL: documentation status lags current runtime/test evidence.
RISK IF DEFERRED: low — code behavior is present, but human and agent routing can be misled by stale status text.
EFFORT: S
WHY THIS WAS INCLUDED: the request asked to survey QA/docs-adjacent ownership and contract gaps, not only source files.

## PRIORITY TABLE

| Target | Title | Max Risk | Total Effort | Recommended Order |
|:---|:---|:---|:---|---:|
| 2 | `use-test-entry-orchestrator.ts` post-Wave-B state | high | M | 1 |
| 7 | E2E and unit test coverage gaps (non-result) | high | M | 2 |
| 1 | `test-question-client.tsx` size and responsibility mix | high | L | 3 |
| 3 | `use-test-run-controller.ts` post-D2 state | high | L | 4 |
| 8 | i18n key hygiene | medium | S | 5 |
| 6 | qualifier utility modules | medium | S | 6 |
| 4 | `test-run-reducer.ts` post-D2 state | medium | M | 7 |
| 5 | telemetry layer cohesion | medium | M | 8 |
