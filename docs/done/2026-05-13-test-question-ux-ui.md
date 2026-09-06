# Prompt 2 Test Question UX/UI Implementation Plan

### Overview

This UX/UI pass updates the live test question surface around `src/features/test/test-question-client.tsx`: visible question numbering, in-bar progress text, flatter question-panel structure, Previous button space-preserved hiding, directional answer/nav animation, 150 ms auto-advance, and browser unload warning. It does not implement qualifier-question integration, active-run resume reads, a phase-unified reducer, scoring/result derivation, or broad run-state rewrites. Overall risk is medium: most changes are visual/client-only, but removing the manual Next path and adding a timer affects E2E setup paths, telemetry smoke completion flow, and screenshot baselines.

### Pre-conditions

- Structural refactor Prompt 0/1 is complete: `test-question-client.tsx` delegates entry actions to `use-test-entry-orchestrator.ts` and runtime question state to `use-test-run-controller.ts`.
- `use-test-entry-orchestrator.ts` status is resolved before implementation: current code imports it from `test-question-client.tsx`, has `tests/unit/use-test-entry-orchestrator.test.ts`, and is checked conditionally by `scripts/qa/check-phase10-transition-contracts.mjs`; keep it.
- Baseline commands pass before source edits begin: `npm run qa:rules`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- Relevant SSOT and rules are loaded: `docs/req-test.md`, `docs/req-test-plan.md`, `docs/agent-guides/project-rules.md §TestFlow`, and `docs/agent-guides/verification-commands.md §test-flow`.
- Impact dimensions: no shared shell/GNB change; no localization key required for the fixed `Q{canonicalIndex}` label; a11y risk is progressbar text placement and hidden Previous focusability; state-contract risk is auto-advance collision with backward navigation; core user-flow risk is replacing manual Next with timer-driven forward movement.
- Decisions requiring user confirmation before execution: none. The confirmed design decisions in the prompt are treated as fixed constraints.

### Change A — InstructionOverlay disabled token alignment

#### Files to change

- `src/features/test/instruction-overlay.tsx`: verify the disabled button utilities match `test-question-client.tsx`; in the current worktree they already do, so this change should be a no-op unless the implementation branch starts from an older state.

#### Implementation order within this change

1. Compare `instructionButtonBaseClassName` with `testButtonBaseClassName` disabled utilities.
2. If the instruction overlay still has older disabled classes such as `disabled:cursor-default disabled:opacity-[0.58]`, replace only those disabled utilities with the `--interactive-disabled-*` token set already used by `test-question-client.tsx`.
3. Do not add disabled props to instruction buttons; this change is token alignment only.

#### Observable behavior delta

No visible behavior change in the current worktree because instruction buttons are enabled and the disabled token set is already aligned. On an older branch, disabled instruction buttons would use the same disabled border/background/ink tokens as the test question buttons.

#### `started` flag interaction

None.

#### Test update required

- `tests/e2e/theme-matrix-smoke.spec.ts`: no setup change; no screenshot baseline should change in the current worktree.
- `tests/e2e/consent-smoke.spec.ts`: no assertion change; existing CTA text/presence assertions remain enough.
- `tests/unit/use-test-run-controller.test.ts`: no change.
- `tests/unit/test-question-bootstrap.test.ts`: no change.

#### QA script impact

No `check-phase*.mjs` pattern is affected.

#### Risk level

Low. This is visual token verification only, and the current source already matches the target token family.

#### Rollback note

Rollback scope is only `src/features/test/instruction-overlay.tsx` disabled utility changes, if any were made from an older branch.

### Change B — Question number display

#### Files to change

- `src/features/test/test-question-client.tsx`: render a question-number label above the question `<h2>` using `currentQuestion?.canonicalIndex`.
- `tests/e2e/theme-matrix-smoke.spec.ts`: add a stable assertion in `startTestAttempt()` that the label appears for the question state.

#### Implementation order within this change

1. Add a class constant such as `testQuestionNumberClassName` near the other test question class constants.
2. Render a label above the `<h2>` in the question panel: text must be exactly `Q${currentQuestion.canonicalIndex}` when `currentQuestion` exists.
3. Add `data-testid="test-question-number"` to the label so E2E flows can wait on the current question without reading the question text.
4. Keep the existing `<h2>` element for the question text; do not move the question text into the label.
5. Update `tests/e2e/theme-matrix-smoke.spec.ts::startTestAttempt()` to assert `await expect(page.getByTestId('test-question-number')).toHaveText(/^Q\\d+$/u);`.

#### Observable behavior delta

Users see a compact `Q{canonicalIndex}` label above the question text. Profile questions still display their canonical index, so profile-first variants can show `Q1`.

#### `started` flag interaction

None. The label renders from `currentQuestion`; it does not alter entry/start state.

#### Test update required

- `tests/e2e/theme-matrix-smoke.spec.ts`: add the question-number assertion after `test-question-panel` becomes visible.
- `tests/e2e/consent-smoke.spec.ts`: no assertion change required; progress text assertions remain separate.
- `tests/unit/use-test-run-controller.test.ts`: no change.
- `tests/unit/test-question-bootstrap.test.ts`: no change; canonical index availability is already covered by existing bootstrap assertions.

#### QA script impact

No `check-phase*.mjs` pattern is affected.

#### Risk level

Low. It is a read-only render of existing `ResolvedQuestion.canonicalIndex`.

#### Rollback note

Remove the label, its class constant, and the `test-question-number` assertion.

### Change C — Progress bar percentage repositioned inside the bar

#### Files to change

- `src/features/test/test-question-client.tsx`: move the `data-testid="test-progress-percent"` span into the filled progress-bar `<div>` while preserving `role="progressbar"` attributes and `aria-valuetext`.
- `tests/e2e/consent-smoke.spec.ts`: keep existing `test-progress` text assertions unchanged by preserving the wrapper text output.

#### Implementation order within this change

1. Keep the outer wrapper with `data-testid="test-progress"`.
2. Keep the `role="progressbar"` element and its `aria-label`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and `aria-valuetext` unchanged.
3. Change the filled-bar child from a self-closing `<div />` to an opening/closing `<div>`.
4. Move the existing percent `<span data-testid="test-progress-percent">` inside that filled-bar child.
5. Style the filled bar as `relative` and the label as an in-bar text element. The label must remain readable at 0% without changing the actual width value used for progress; prefer an absolutely positioned span inside the fill node over adding a fake minimum fill width.
6. Ensure `test-progress` still has text content such as `0%`, `13%`, `25%`, and `100%` so existing smoke tests keep working.

#### Observable behavior delta

Users see the percentage visually associated with the progress bar instead of as a separate label below it. Screen readers still receive the preserved `aria-valuetext`.

#### `started` flag interaction

None.

#### Test update required

- `tests/e2e/theme-matrix-smoke.spec.ts`: no setup path change. Screenshot baselines for question/result states will change because the progress label moves.
- `tests/e2e/consent-smoke.spec.ts`: no assertion change. The implementation must keep `test-progress` wrapper text as the same percent string so existing assertions such as `await expect(page.getByTestId('test-progress')).toHaveText('0%')` continue to pass.
- `tests/unit/use-test-run-controller.test.ts`: no change.
- `tests/unit/test-question-bootstrap.test.ts`: no change; progress math is unchanged.

#### QA script impact

No `check-phase*.mjs` pattern is affected.

#### Risk level

Medium. The DOM and visual placement change inside an ARIA progressbar; the accessible value must remain unchanged.

#### Rollback note

Move the `test-progress-percent` span back to a sibling after the `role="progressbar"` element and restore the filled-bar child to its previous class shape.

### Change D — Layout flattening

#### Files to change

- `src/features/test/test-question-client.tsx`: remove the current `<article>` wrapper and make the active question panel the stage surface, preserving consumer-facing test ids used by E2E flows.
- `tests/e2e/theme-matrix-smoke.spec.ts`: keep `test-question-panel` visibility checks; no selector rename.

#### Implementation order within this change

1. Split the submitted and active-question stage markup so the question path can be flattened without disturbing the result panel.
2. For the active-question path, remove the `<article>` element.
3. Put `testQuestionPanelClassName`, `aria-hidden={instructionVisible ? 'true' : undefined}`, and `data-testid="test-question-panel"` on the active stage container.
4. Keep question number, question `<h2>`, answer grid, and nav row as direct children of that active stage container.
5. Preserve the existing tested anchors: `test-question-panel`, `test-choice-a`, `test-choice-b`, `test-prev-button`, and `test-submit-button`.
6. Do not preserve `data-testid="test-stage"` in the active question path. Current code search shows no source, test, or QA script consumer outside the analysis report, while preserving both `test-stage` and `test-question-panel` would require keeping an extra DOM wrapper.
7. Keep the progress header outside this change.

#### Observable behavior delta

Users should see no intentional visual change other than minor spacing differences caused by removing one wrapper. The DOM becomes flatter for the question content.

#### `started` flag interaction

None directly.

#### Test update required

- `tests/e2e/theme-matrix-smoke.spec.ts`: no setup path change; keep `test-question-panel` visibility checks.
- `tests/e2e/consent-smoke.spec.ts`: no assertion change.
- `tests/unit/use-test-run-controller.test.ts`: no change.
- `tests/unit/test-question-bootstrap.test.ts`: no change.

#### QA script impact

No current `check-phase*.mjs` script checks the question-panel hierarchy or `test-stage`.

#### Risk level

Medium. The intended DOM flattening can alter screenshot baselines and must not break E2E locators.

#### Rollback note

Restore the `<article className={testQuestionPanelClassName} data-testid="test-question-panel">` wrapper around the active question content.

### Change E — Previous button space-preserved hiding at Q1

#### Files to change

- `src/features/test/test-question-client.tsx`: change Previous from Q1-disabled to Q1-hidden while retaining layout space.
- `tests/e2e/theme-matrix-smoke.spec.ts`: add a Q1 visibility/layout assertion for Previous in `startTestAttempt()`.

#### Implementation order within this change

1. Add a derived boolean in the client: `const isFirstQuestion = currentQuestionIndex === 1;`.
2. Add a class constant or inline class composition for the Previous button hidden state: `invisible pointer-events-none` is preferred because it maps to `visibility: hidden` and preserves layout space.
3. Change Previous `disabled` from `disabled={!started || currentQuestionIndex === 1}` to `disabled={!started}`.
4. Add the hidden class only when `isFirstQuestion` is true.
5. Keep the Previous button in the DOM at Q1 with `data-testid="test-prev-button"`.
6. Ensure Q1 nav-row height does not change: the button must keep `min-h-[46px]` and normal padding/classes even when invisible.

#### Observable behavior delta

At Q1, users no longer see a disabled Previous button, but the nav row keeps the same occupied space. On later questions, Previous is visible and works as before.

#### `started` flag interaction

Retain `started` for Previous as `disabled={!started}`. This prevents pre-start focus/click leakage when a landing-ingress run initializes at Q2 behind the instruction overlay. The Q1 condition moves out of `disabled` and into CSS visibility.

#### Test update required

- `tests/e2e/theme-matrix-smoke.spec.ts`: after start, assert `test-prev-button` is attached and hidden on Q1, for example `await expect(page.getByTestId('test-prev-button')).toBeHidden();`. Do not assert `toHaveCount(0)`.
- `tests/e2e/consent-smoke.spec.ts`: no assertion change.
- `tests/unit/use-test-run-controller.test.ts`: no required change; existing T-07 controller clamp remains valid.
- `tests/unit/test-question-bootstrap.test.ts`: no change.

#### QA script impact

No `check-phase*.mjs` pattern is affected.

#### Risk level

Medium. It changes focus/click affordance and screenshot output while intentionally preserving layout height.

#### Rollback note

Remove the hidden class and restore the previous disabled expression.

### Change F — Question transition slide animation

#### Files to change

- `src/features/test/test-question-client.tsx`: import a scoped CSS module, track UI transition direction, and apply animation classes to answer grid/nav row.
- `src/features/test/test-question-client.module.css`: new scoped CSS module for test-question animations using `transform: translateX(...)` and `prefers-reduced-motion`.
- `tests/e2e/theme-matrix-smoke.spec.ts`: adjust waits after answer selection so screenshots are captured after the 150 ms auto-advance and slide animation settle.

#### Implementation order within this change

1. Create `src/features/test/test-question-client.module.css` rather than using Tailwind animation utilities. Reason: Tailwind keyframes would require global CSS/config churn, while a local CSS module keeps the animation scoped to the test surface.
2. Define forward/backward answer/nav animation classes using `transform: translateX(...)` and opacity, not `left` or `width`.
3. Include `@media (prefers-reduced-motion: reduce)` in the CSS module so the animation duration collapses and transform movement is removed.
4. In the client, add local UI direction state such as `questionTransitionDirection: 'none' | 'forward' | 'backward'`.
5. Do not animate the `<h2>` with a slide. The question number and `<h2>` may remain static; answer grid and nav row get the directional slide.
6. Apply the animation class to the answer grid and nav row only, and key those elements by `currentQuestionIndex` so the animation re-runs when the question changes.
7. Set direction to `forward` immediately before timer-driven `moveQuestion(1)` and to `backward` immediately before `moveQuestion(-1)`.

#### Observable behavior delta

When advancing, answers/nav slide in from the right. When going backward, answers/nav slide in from the left. Users with reduced motion enabled get no horizontal slide.

#### `started` flag interaction

None directly. The animation direction is set only from active user navigation paths, which remain guarded by `started` through timer scheduling, Previous disabled state, and controller guards.

#### Test update required

- `tests/e2e/theme-matrix-smoke.spec.ts`: after each auto-advance, wait for the question number or submit button state plus a settle wait that covers 150 ms timer plus animation duration. Keep screenshots after motion settles.
- `tests/e2e/consent-smoke.spec.ts`: no direct assertion change.
- `tests/unit/use-test-run-controller.test.ts`: no change; animation is client UI state, not controller state.
- `tests/unit/test-question-bootstrap.test.ts`: no change.

#### QA script impact

No `check-phase*.mjs` pattern is affected. Do not reuse or edit landing grid animation keyframes checked by `check-phase10-transition-contracts.mjs`.

#### Risk level

Medium. It introduces a new CSS module and motion behavior, but scope is local and reduced-motion can be tested visually.

#### Rollback note

Remove the CSS module import, animation class composition, direction state, keyed animation props, and the CSS module file.

### Change G — Delayed auto-advance (150 ms)

#### Files to change

- `src/features/test/test-question-client.tsx`: add client-owned timer ref, remove the non-last Next button, schedule forward navigation after answer selection, and cancel timers before backward navigation.
- `tests/e2e/theme-matrix-smoke.spec.ts`: replace manual `test-next-button` clicks with waits for auto-advance.
- `tests/e2e/transition-telemetry-smoke.spec.ts`: replace manual `test-next-button` clicks with waits for auto-advance so final-submit telemetry smoke still completes.
- `tests/unit/use-test-run-controller.test.ts`: add a controller guard case proving `moveQuestion(1)` before `started` does not advance; do not add timer tests here because the timer lives in the client.

#### Implementation order within this change

1. In `test-question-client.tsx`, add `useCallback` to React imports.
2. Add `const autoAdvanceTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);`.
3. Add `clearAutoAdvanceTimer` with `window.clearTimeout()` and null reset.
4. Add unmount cleanup: `useEffect(() => clearAutoAdvanceTimer, [clearAutoAdvanceTimer]);`.
5. Add current-question cleanup: when `currentQuestionIndex` changes, clear any stale timer so re-renders cannot carry a timer into the wrong question.
6. Add `const isLastQuestion = currentQuestionIndex >= totalQuestions;`.
7. Replace answer button inline handlers with a local handler, for example `handleAnswerChoice(choice)`.
8. In `handleAnswerChoice`, call `updateAnswer(choice)` first so `writeResponseSet(variant, newAnswers)` happens synchronously before any advance.
9. If `isLastQuestion` is true, clear any timer and return; Submit remains manual.
10. If not last question, clear any existing timer, then schedule `window.setTimeout(..., 150)`.
11. In the timeout callback, set transition direction to `forward`, call `moveQuestion(1)`, and null the timer ref.
12. Remove the non-last `test-next-button` branch from JSX. The nav row should render Previous plus Submit only when `isLastQuestion` is true; for non-last questions, no explicit Next button is rendered.
13. Previous button handler must call `clearAutoAdvanceTimer()` before setting transition direction to `backward` and before `moveQuestion(-1)`.
14. Keep Submit button on the last question with `disabled={!started || !allAnswered}` and `data-testid="test-submit-button"`.

#### Observable behavior delta

Selecting an answer on non-last questions shows the selection briefly, then advances after 150 ms. The explicit Next button is gone. On the last question, selecting an answer does not start a timer; Submit becomes enabled when all scoring questions are answered.

#### `started` flag interaction

Next's `!started` gate disappears because Next is removed. `moveQuestion()` still has the controller-level `!started` guard. Timer scheduling should occur only after the test is active; keep the Submit `!started` disabled gate and keep Previous `disabled={!started}` from Change E.

#### Test update required

- `tests/e2e/theme-matrix-smoke.spec.ts`: update `completeTestAttempt()` so it clicks a choice, checks whether `test-submit-button` is visible, and otherwise waits for `test-question-number` to change instead of clicking `test-next-button`. Increase `answerCurrentQuestion()` wait from `100` to at least the timer plus animation settle, or move the wait into the caller using the question-number assertion.
- `tests/e2e/consent-smoke.spec.ts`: no required assertion change; the spec does not click Next. Existing progress assertions after start should remain stable.
- `tests/e2e/transition-telemetry-smoke.spec.ts`: update the final-submit loop to click a choice and wait for auto-advance instead of clicking `test-next-button`; keep the final telemetry payload assertions unchanged.
- `tests/unit/use-test-run-controller.test.ts`: add the controller guard case that calls `moveQuestion(1)` before `entryCommitted` becomes true and asserts `currentQuestionIndex` remains `1`. No timer case belongs here.
- `tests/unit/test-question-bootstrap.test.ts`: no change.

#### QA script impact

`check-phase11-telemetry-contracts.mjs` indirectly requires `theme-matrix-smoke.spec.ts` to include `test-result-panel`; keep the result-state path working after removing Next. No QA script currently checks `test-next-button`, so no regex update is required.

#### Risk level

High. This changes the primary question progression path and touches multiple E2E completion helpers.

#### Rollback note

Restore the Next button branch, restore answer handlers to call only `updateAnswer(choice)`, remove timer refs/effects/helpers, and restore E2E helpers to click `test-next-button`.

### Change H — Exit/navigation warning

#### Files to change

- `src/features/test/test-question-client.tsx`: register a `beforeunload` listener in a client `useEffect`.
- `tests/e2e/consent-smoke.spec.ts`: add a browser-unload warning smoke using a locally created page and Playwright's real `beforeunload` dialog event.

#### Implementation order within this change

1. Add a `useEffect` in `TestQuestionClient`.
2. If `!started || submitted`, return without registering a listener.
3. Register `window.addEventListener('beforeunload', handleBeforeUnload)`.
4. In `handleBeforeUnload`, call `event.preventDefault()` and set `event.returnValue = ''` so browsers show the native warning.
5. Return a cleanup that removes the listener.
6. Because `started` and `submitted` are dependencies, the listener is removed automatically when the user submits and on unmount.
7. Do not attempt `router.beforePopState`: this app uses Next 16.2.4 App Router from `next/navigation`; `AppRouterInstance` exposes `back`, `forward`, `refresh`, `push`, `replace`, `prefetch`, and optional `experimental_gesturePush`, but not `beforePopState`. Pages Router `NextRouter` has `beforePopState`, but that is not the router in this component.
8. Add a consent-smoke test that starts a test attempt, calls `page.close({runBeforeUnload: true})` on a page created inside the test, waits for a Playwright dialog event, asserts `dialog.type() === 'beforeunload'`, then dismisses the dialog and closes the page in cleanup.

#### Observable behavior delta

When a test has started and is not submitted, browser reload/close/navigation away shows the browser-native unload warning. After Submit, the warning no longer appears. In-app back navigation is not intercepted by this plan.

#### `started` flag interaction

This change depends on `started && !submitted`. `started` remains the signal that `attempt_start` has committed and the run is active.

#### Test update required

- `tests/e2e/theme-matrix-smoke.spec.ts`: no change.
- `tests/e2e/consent-smoke.spec.ts`: add the real browser `beforeunload` dialog smoke described above. Use a locally created page so closing/dismissing it does not disturb the rest of the file.
- `tests/unit/use-test-run-controller.test.ts`: no change.
- `tests/unit/test-question-bootstrap.test.ts`: no change.

#### QA script impact

No `check-phase*.mjs` pattern is affected.

#### Risk level

Medium. The listener is small, but browser-native unload warnings are hard to assert and should not be expanded into an unsupported in-app route guard.

#### Rollback note

Remove only the `beforeunload` effect from `test-question-client.tsx`.

### Implementation order across changes

1. Change A first: verify token alignment and avoid churn if already aligned.
2. Change B next: add the stable `test-question-number` anchor before E2E auto-advance waits depend on it.
3. Change C: move progress text while behavior is still manually navigable.
4. Change D: flatten layout before adding motion classes so the animation targets land on the final DOM shape.
5. Change E: adjust Previous visibility before timer work, because timer cancellation on Previous depends on this handler.
6. Change F: add the local CSS module and direction state before the timer starts invoking forward navigation.
7. Change G: remove Next and add the 150 ms auto-advance timer after all visual anchors are in place.
8. Change H last: add unload warning after the started/submitted behavior is otherwise stable.

This sequence keeps visual-only changes ahead of behavior changes, introduces the new question-number test anchor before it is needed for auto-advance waits, and defers the high-risk progression change until the DOM and motion targets are settled.

### Screenshot baseline impact summary

Regenerate baselines only after all eight changes are implemented and verified as intentional. Expected affected theme-matrix states:

1. `test-question`: `en`/`kr`, light/dark, `desktop-wide` and `tablet-wide` because question number, in-bar progress text, Previous hiding, layout flattening, and settled animation target styling affect the question surface.
2. `mobile-test-question`: `en`/`kr`, light/dark, `mobile` for the same question-surface changes.
3. `test-result`: `en`/`kr`, light/dark, `desktop-wide` and `tablet-wide` because the header progress text moves inside the bar and the result setup path changes to auto-advance.
4. `mobile-test-result`: `en`/`kr`, light/dark, `mobile` for the same result/progress impact.

Do not refresh unrelated baselines to hide drift. First run the affected theme-matrix specs and inspect diffs. If accepted, regenerate with `npm run qa:visual:full`, then update `tests/e2e/theme-matrix-baseline-provenance.md` with date, commit SHA, OS, Node, Playwright, regeneration command/result, gate command/result, and reason.

### `use-test-entry-orchestrator.ts` resolution

Recommended disposition: keep. The current worktree imports `useTestEntryOrchestrator` from `test-question-client.tsx`, has dedicated unit coverage, and `check-phase10-transition-contracts.mjs` conditionally verifies that the hook owns `markInstructionSeen` and `clearLandingIngress`. The earlier report that it was not imported is stale for this working tree. No deletion or activation work is needed, and keeping the file does not conflict with any UX/UI change in this plan.

### `started` flag resolution

Final recommended approach: retain `started` as the active-run UI/guard signal. Remove only the obsolete Next disabled gate by removing the Next button. For Previous, move the Q1 condition to CSS visibility and retain `disabled={!started}` to prevent behind-overlay focus/click leakage before `attempt_start`. For Submit, keep `disabled={!started || !allAnswered}` and keep the controller's `handleSubmit()` guard. Do not introduce a new `isRunActive` boolean in this UX pass.

### Non-scope items (confirm exclusions)

- Qualifier / overlay integration is excluded.
- Active-run resume read path is excluded.
- Phase-unified reducer is excluded.
- Run controller internals beyond what Changes G/H require are excluded. The auto-advance timer lives in the client, not in `use-test-run-controller.ts`.

### Open questions (if any)

None.
