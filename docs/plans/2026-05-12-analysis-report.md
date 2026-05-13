# 2026-05-12 Test Question UI Analysis Report

## Summary

The current test question UI is a Tailwind-utility, inline-class React surface centered in `src/features/test/test-question-client.tsx`, with runtime question state delegated to `use-test-run-controller.ts`. Navigation remains manual: answer choices only update canonical-index-keyed state/storage, Previous is always rendered but disabled at Q1, and Next/Submit share the same second flex-row slot. The most significant current gaps/dependencies are: no delayed auto-advance timer exists, no question transition animation surface exists beyond button/progress width transitions, no question-number label is rendered, no exit/navigation warning is registered, and `InstructionOverlay` has a separate disabled-style token set from the test question buttons while the shared disabled color tokens do exist in `globals.css`.

## Section findings: Navigation button layout

### 1. Previous button visibility logic

- **Finding**: Previous is not conditionally rendered and is not hidden by CSS. It is always present as the first child of `test-nav-row`; Q1 uses `disabled={!started || currentQuestionIndex === 1}`. Because the button remains rendered and `testButtonBaseClassName` includes `min-h-[46px]`, Q1 does not collapse the nav row due to Previous being removed. The nav row itself has no fixed height; its height is derived from its rendered flex children.
- **File + line range**: `src/features/test/test-question-client.tsx:39-47`, `src/features/test/test-question-client.tsx:246-257`.
- **Test coverage**: `tests/e2e/theme-matrix-smoke.spec.ts:209-215` starts the question state and captures the resulting page-shell screenshot through `tests/e2e/theme-matrix-smoke.spec.ts:177`; it does not assert Previous presence or disabled state. `tests/unit/use-test-run-controller.test.ts:217-238` covers the controller clamp/tail-filter behavior for move previous from Q1, but not the DOM button disabled attribute.
- **QA script dependency**: `scripts/qa/_path-config.mjs:59-62` maps the question client and run controller. `scripts/qa/check-phase10-transition-contracts.mjs:44-50` reads the question client only for the negative `fallbackTransitionId` / `runtimeState.transitionId` patterns; no nav-button identifier is checked.

### 2. Submit vs Next split

- **Finding**: The exact JSX switch is `{currentQuestionIndex < totalQuestions ? (<button ... data-testid="test-next-button">) : (<button ... data-testid="test-submit-button">)}`. Both branches render in the same DOM slot: the second child of the same `test-nav-row`, after Previous.
- **File + line range**: `src/features/test/test-question-client.tsx:246-281`.
- **Test coverage**: `tests/e2e/theme-matrix-smoke.spec.ts:224-237` uses `test-submit-button` visibility to decide whether to submit and otherwise clicks `test-next-button`; no assertion checks the shared slot. `tests/e2e/consent-smoke.spec.ts` does not assert these test ids.
- **QA script dependency**: No direct Next/Submit regex. `scripts/qa/check-phase11-telemetry-contracts.mjs:297-313` checks that theme-matrix smoke captures screenshots and includes `test-result-panel`, indirectly preserving the smoke path that clicks Next/Submit.

### 3. Disabled conditions

- **Finding**: Current disabled expressions are:
  - Previous: `disabled={!started || currentQuestionIndex === 1}`
  - Next: `disabled={!started || !currentAnswer}`
  - Submit: `disabled={!started || !allAnswered}`
  `started` is still part of all three expressions. No other controller phase flag is used in these disabled props.
- **File + line range**: `src/features/test/test-question-client.tsx:253`, `src/features/test/test-question-client.tsx:266`, `src/features/test/test-question-client.tsx:276`; controller outputs `started`, `currentAnswer`, and `allAnswered` at `src/features/test/use-test-run-controller.ts:30-46`, `src/features/test/use-test-run-controller.ts:127-135`, `src/features/test/use-test-run-controller.ts:212-228`.
- **Test coverage**: No E2E in the requested files asserts `toBeDisabled()` or the `disabled` attribute for nav buttons. `tests/unit/use-test-run-controller.test.ts:241-274` covers `handleSubmit` guards for not-started and not-all-answered states, but not the DOM disabled props.
- **QA script dependency**: No disabled-prop regex in `check-phase10` or `check-phase11`.

### 4. `data-testid` anchors on nav buttons

- **Finding**: Nav button test ids are `test-prev-button`, `test-next-button`, and `test-submit-button`. In the requested E2E files, only `theme-matrix-smoke.spec.ts` references `test-next-button` and `test-submit-button`; neither requested E2E spec references `test-prev-button`, and neither asserts disabled state.
- **File + line range**: `src/features/test/test-question-client.tsx:253-277`; `tests/e2e/theme-matrix-smoke.spec.ts:224-237`; `tests/e2e/consent-smoke.spec.ts:109-259` covers instruction/progress states and has no nav-button assertions.
- **Test coverage**: E2E interaction coverage exists for Next/Submit in the theme-matrix result setup path; no direct DOM-presence or disabled assertion exists for Previous/Next/Submit in the requested E2E files. Unit coverage is controller-level only.
- **QA script dependency**: No QA script checks these three ids directly.

## Section findings: Delayed auto-advance infrastructure

### 5. Timer and RAF usage

- **Finding**: There are no `setTimeout` or `clearTimeout` calls under `src/features/test`. The only `requestAnimationFrame` call is in the client component effect that completes a pending landing-to-test transition once `runtimeReady` and `pendingTransitionId` are present. The matching `cancelAnimationFrame` cleanup is a local effect cleanup; there is no component-level or controller-level RAF ref. The run controller has no `requestAnimationFrame` or `cancelAnimationFrame` call.
- **File + line range**: `src/features/test/test-question-client.tsx:86-102`; `src/features/test/use-test-run-controller.ts:67-125` uses `queueMicrotask`, not timeout/RAF.
- **Test coverage**: `tests/unit/use-test-run-controller.test.ts:336-379` covers surfacing and clearing `pendingTransitionId`; `tests/e2e/theme-matrix-smoke.spec.ts:209-215` waits for the question panel after start. No requested test asserts RAF ownership or cleanup.
- **QA script dependency**: `scripts/qa/check-phase10-transition-contracts.mjs:24-41` requires transition runtime complete/fail-cancel helpers, and `scripts/qa/check-phase10-transition-contracts.mjs:44-50` guards against fallback/runtime transition id state in the question client. It does not check RAF calls.

### 6. Current answer selection handler

- **Finding**: Choice A and B use inline `onClick` handlers that call `updateAnswer('A')` or `updateAnswer('B')`. `updateAnswer` exits only when there is no current question or `submitted` is true, then writes `choice` under `String(currentQuestion.canonicalIndex)`, updates `runtimeState.answers`, and calls `writeResponseSet(variant, newAnswers)`. It does not call `moveQuestion`, `handleSubmit`, router navigation, telemetry, timeout, or RAF.
- **File + line range**: `src/features/test/test-question-client.tsx:221-240`; `src/features/test/use-test-run-controller.ts:147-160`.
- **Test coverage**: `tests/e2e/theme-matrix-smoke.spec.ts:217-222` clicks a choice and asserts `data-selected="true"`. `tests/unit/use-test-run-controller.test.ts:106-153` asserts canonical-key answer writes and `writeResponseSet`.
- **QA script dependency**: `scripts/qa/check-phase10-transition-contracts.mjs:63-73` checks that telemetry moved to the run controller through `consumeLandingIngress`, `trackAttemptStart`, and `trackFinalSubmit`; no answer-selection regex exists.

### 7. Reduced-motion support patterns

- **Finding**: Landing animation CSS has both a data-free media-query fallback and a JS-driven CSS-module class path. CSS uses `@media (prefers-reduced-motion: reduce)` to change landing-card custom properties. Landing JS also reads `window.matchMedia('(prefers-reduced-motion: reduce)')`, dispatches `REDUCED_MOTION_ENABLE`/`REDUCED_MOTION_DISABLE`, exposes `prefersReducedMotion` from `useLandingInteractionController`, and passes it to `LandingGridCard` as `reducedMotion`. This JS-readable signal is inside the landing feature namespace and is consumed by `landing-catalog-grid.tsx`; no shared hook or test-feature import exists.
- **File + line range**: `src/features/landing/grid/landing-grid-card.module.css:163-219`, `src/features/landing/grid/landing-grid-card.module.css:365-371`; `src/features/landing/grid/use-landing-interaction-controller.ts:47-55`, `src/features/landing/grid/use-landing-interaction-controller.ts:187-214`, `src/features/landing/grid/use-landing-interaction-controller.ts:515-524`; `src/features/landing/grid/landing-catalog-grid.tsx:64-75`, `src/features/landing/grid/landing-catalog-grid.tsx:228-238`.
- **Test coverage**: No requested E2E test directly asserts the reduced-motion signal. Theme-matrix screenshots capture normal representative states. Unit coverage for landing reduced-motion is outside the requested unit file set.
- **QA script dependency**: `scripts/qa/check-phase10-transition-contracts.mjs:107-114` requires `assertion:B14-mobile-reduced-motion` in `transition-telemetry-smoke.spec.ts`, but the requested E2E files do not contain that assertion.

## Section findings: Animation infrastructure

### 8. Existing CSS animation tokens and keyframe patterns

- **Finding**: Named keyframes in `landing-grid-card.module.css` are:
  - `landing-card-shell-expand` at lines 221-229
  - `landing-card-shell-frame-expand` at lines 231-241
  - `landing-card-shell-collapse` at lines 243-251
  - `landing-card-shell-frame-collapse` at lines 253-263
  - `landing-card-detail-rise` at lines 265-273
  - `landing-card-shell-reduced-open` at lines 275-283
  - `landing-card-shell-reduced-close` at lines 285-293
  - `landing-card-normal-slot-exit` at lines 295-303
  - `landing-card-normal-slot-enter` at lines 305-313
  - `landing-card-detail-quiet-exit` at lines 315-325
  - `landing-card-mobile-open-shell` at lines 327-339
  - `landing-card-mobile-close-shell` at lines 341-353
  - `landing-card-mobile-close-surface` at lines 355-363
  The duration custom property is `--landing-card-motion-ms`; no easing custom property is used. Easing is hardcoded as `linear` in the animation shorthands. The CSS uses shorthand `animation: ... both`; no `forwards` fill mode is present. Animations are applied by CSS-module semantic class toggles, while inline style sets CSS variables such as `--landing-card-motion-ms`.
- **File + line range**: `src/features/landing/grid/landing-grid-card.module.css:43-57`, `src/features/landing/grid/landing-grid-card.module.css:87-160`, `src/features/landing/grid/landing-grid-card.module.css:163-219`, `src/features/landing/grid/landing-grid-card.module.css:221-371`; `src/features/landing/grid/landing-grid-card.tsx:203-205`, `src/features/landing/grid/landing-grid-card.tsx:650-674`, `src/features/landing/grid/landing-grid-card.tsx:749-762`.
- **Test coverage**: `tests/e2e/theme-matrix-smoke.spec.ts:181-192` waits for expanded desktop landing states and screenshot-captures through `tests/e2e/theme-matrix-smoke.spec.ts:177`; no keyframe-name assertion exists in the requested E2E specs.
- **QA script dependency**: `scripts/qa/check-phase10-transition-contracts.mjs:133-147` checks `/landing-card-mobile-open-shell/u`, `/landing-card-detail-quiet-exit/u`, `/\.root\.mobileTransientOpening/u`, `/\.root\.mobileTransientClosing/u`, `/\.transientShell\.transientOpening/u`, and `/\.transientShell\.transientClosing/u`.

### 9. CSS Module usage pattern in test feature

- **Finding**: No `.css` or `.module.css` file exists under `src/features/test/` in the current file inventory. Test UI styling is implemented with Tailwind utility class strings and class constants at file top in `test-question-client.tsx` and `instruction-overlay.tsx`.
- **File + line range**: `src/features/test/test-question-client.tsx:29-53`; `src/features/test/instruction-overlay.tsx:3-14`.
- **Test coverage**: No requested E2E/unit test asserts the styling approach directly.
- **QA script dependency**: `scripts/qa/_path-config.mjs:59-62` points QA scripts at the TSX files, not a test CSS module.

### 10. `will-change` and `transform` usage

- **Finding**: Landing grid declares `will-change-[left,width]` on the expanded shell frame and `will-change-transform` on the expanded shell. It uses `transform: translateZ(0)`, `transform: scale(...)`, and `transform: translateY(...)` in CSS/keyframes. No `transform: translateX(...)` appears in the listed landing animation files; horizontal shell movement is expressed through `left` and `width` keyframes.
- **File + line range**: `src/features/landing/grid/landing-grid-card.tsx:242-245`; `src/features/landing/grid/landing-grid-card.module.css:20-34`, `src/features/landing/grid/landing-grid-card.module.css:63-85`, `src/features/landing/grid/landing-grid-card.module.css:221-273`, `src/features/landing/grid/landing-grid-card.module.css:327-353`.
- **Test coverage**: No requested test asserts `will-change`, `transform`, or `translateX`.
- **QA script dependency**: Same landing CSS pattern dependency as item 8; no `will-change` or `translateX` regex exists.

### 11. Current animation surface in `test-question-client.tsx`

- **Finding**: The current question panel has no panel-level animation class. The question/answer/nav buttons inherit `testButtonBaseClassName`, which sets `[transition-duration:140ms]`, `[transition-property:border-color,background-color,box-shadow,color,transform]`, and `[transition-timing-function:ease]`. Selected answer state changes are represented through `data-[selected=true]:...` classes on the answer button class. The progress filled bar outside the question panel uses `transition-[width] duration-150 ease-out`. There is no `animation-*` class in `test-question-client.tsx`.
- **File + line range**: `src/features/test/test-question-client.tsx:35-47`, `src/features/test/test-question-client.tsx:205-208`, `src/features/test/test-question-client.tsx:215-281`.
- **Test coverage**: `tests/e2e/theme-matrix-smoke.spec.ts:217-222` asserts answer `data-selected` after click. Theme-matrix screenshots capture the rendered transition-capable elements but do not assert transition timing.
- **QA script dependency**: No QA script checks test-client transition or animation classes.

## Section findings: Progress bar

### 12. Current progress bar implementation

- **Finding**: Progress markup is a `div` wrapper with `data-testid="test-progress"`, containing a nested `div role="progressbar"` with `aria-label`, `aria-valuemax={scoringProgress.total}`, `aria-valuemin={0}`, `aria-valuenow={scoringProgress.answered}`, and `aria-valuetext={t('progressValue', {percent: scoringProgress.percent})}`. The filled bar is a child `div` with `style={{width: `${scoringProgress.percent}%`}}`. The percentage label is a sibling `span` outside the `role="progressbar"` element. Test ids are `test-progress`, `test-progress-bar`, and `test-progress-percent`.
- **File + line range**: `src/features/test/test-question-client.tsx:191-213`.
- **Test coverage**: `tests/e2e/consent-smoke.spec.ts:147-152`, `tests/e2e/consent-smoke.spec.ts:168-173`, `tests/e2e/consent-smoke.spec.ts:201-205`, `tests/e2e/consent-smoke.spec.ts:232-235`, and `tests/e2e/consent-smoke.spec.ts:254-258` assert text on `test-progress`. `tests/unit/test-question-bootstrap.test.ts:139-209` asserts progress computation.
- **QA script dependency**: No direct progress regex in `check-phase10` or `check-phase11`.

### 13. Progress bar sync with tail reset

- **Finding**: `scoringProgress` is recomputed on each render from `resolveScoringProgress({questions, answers: runtimeState.answers})`, not from a stored snapshot. `moveQuestion(-1)` filters answers to keys numerically lower than the destination index, so after backward navigation removes the current/subsequent answers, progress reads the reduced `runtimeState.answers`.
- **File + line range**: `src/features/test/use-test-run-controller.ts:127-135`, `src/features/test/use-test-run-controller.ts:162-185`; `src/features/test/question-runtime-utils.ts:71-84`.
- **Test coverage**: `tests/unit/use-test-run-controller.test.ts:181-214` asserts tail reset on back navigation. `tests/unit/test-question-bootstrap.test.ts:139-175` asserts scoring-only progress. No test combines both assertions through the rendered progress bar.
- **QA script dependency**: `scripts/qa/check-phase10-transition-contracts.mjs:63-73` checks controller ownership for telemetry/ingress only; no progress/tail-reset regex.

### 14. Theme-matrix screenshot of progress bar

- **Finding**: Theme-matrix captures `test-question` and `mobile-test-question` states through `startTestAttempt`, which clicks `test-start-button`, waits for `test-question-panel`, and does not answer any question. The manifest has no `answered` field. Therefore the captured direct `qmbti` test-question state is at 0% progress.
- **File + line range**: `tests/e2e/theme-matrix-smoke.spec.ts:209-215`, `tests/e2e/theme-matrix-smoke.spec.ts:268-284`, `tests/e2e/theme-matrix-manifest.json:120-128`, `tests/e2e/theme-matrix-manifest.json:183-190`.
- **Test coverage**: Screenshot coverage exists through `.page-shell` capture at `tests/e2e/theme-matrix-smoke.spec.ts:171-178`; there is no explicit progress-percent assertion in theme-matrix.
- **QA script dependency**: `scripts/qa/check-phase11-telemetry-contracts.mjs:101-112` allows `test-question`; `scripts/qa/check-phase11-telemetry-contracts.mjs:222-244` validates manifest case route/recipe fields.

## Section findings: Layout container hierarchy

### 15. Current container nesting in the question panel

- **Finding**: The hierarchy is:
  - `section`, `testShellCardClassName`, `data-testid="test-shell-card"`, layout `landing-shell-card grid gap-[18px] ...`.
  - `header`, `testShellHeaderClassName`, no test id, layout `test-shell-header grid gap-1`.
  - Header child `div`, no class/test id, wraps `h1` and progress.
  - Progress wrapper `div`, class `grid gap-2`, `data-testid="test-progress"`.
  - Stage `div`, `testShellStageClassName`, `data-testid="test-stage"`, layout `test-shell-stage relative`.
  - Optional `InstructionOverlay` sibling before the question panel.
  - `article`, `testQuestionPanelClassName`, `data-testid="test-question-panel"`, layout `test-question-panel rounded surface grid gap-[14px]`.
  - Question `h2`, class `m-0`, no test id.
  - Answer grid `div`, `testAnswerGridClassName`, no test id, layout `test-answer-grid grid gap-[10px]`.
  - Answer buttons `button`, `testAnswerButtonClassName`, `data-testid="test-choice-a"` / `test-choice-b`.
  - Nav row `div`, `testNavRowClassName`, no test id, layout `test-nav-row flex flex-wrap gap-[10px]`.
  - Nav buttons `button`, secondary/primary button classes, data ids as listed in Section 1.
- **File + line range**: `src/features/test/test-question-client.tsx:29-53`, `src/features/test/test-question-client.tsx:185-287`.
- **Test coverage**: `tests/e2e/theme-matrix-smoke.spec.ts:209-215` asserts instruction hidden and question panel visible before screenshot. No unit test asserts container hierarchy.
- **QA script dependency**: No hierarchy-specific regex. Theme-matrix QA script checks screenshot infrastructure at `scripts/qa/check-phase11-telemetry-contracts.mjs:297-313`.

### 16. Progress bar container relationship

- **Finding**: The outermost shared container for both progress and question panel is the `section` with `data-testid="test-shell-card"`. The progress bar is inside `header`; the question panel is inside a separate `div` stage (`data-testid="test-stage"`). They are siblings under the shell card, not siblings inside the same header/stage container.
- **File + line range**: `src/features/test/test-question-client.tsx:185-217`, `src/features/test/test-question-client.tsx:264-283`.
- **Test coverage**: `tests/e2e/theme-matrix-smoke.spec.ts:171-178` captures `.page-shell`, which includes both shell/header/stage. Consent smoke asserts progress text but not the hierarchy.
- **QA script dependency**: No direct hierarchy regex.

### 17. `testShellCardClassName` and `testShellStageClassName` roles

- **Finding**: `testShellCardClassName` is `landing-shell-card grid gap-[18px] rounded-[16px] p-[18px] [background:color-mix(in_srgb,var(--panel-solid)_90%,transparent)] [box-shadow:var(--card-shadow)]`, establishing a grid shell. `testShellStageClassName` is `test-shell-stage relative`, establishing a positioned stage without grid/flex.
- **File + line range**: `src/features/test/test-question-client.tsx:31-34`.
- **Test coverage**: Screenshot-only via theme-matrix; no direct class assertion.
- **QA script dependency**: No direct class regex.

## Section findings: Question number display

### 18. Current question number data availability

- **Finding**: `ResolvedQuestion` contains `id`, `canonicalIndex`, `questionType`, `question`, `poleA`, `poleB`, `answerA`, and `answerB`. There is no `displayIndex`, `questionNumber`, or display-ready `Q{n}` field. `buildVariantQuestionBank` sets `id: q${index + 1}` and `canonicalIndex: index + 1`, so `canonicalIndex` is 1-based by construction. For `egtt`, tests assert the first item is `profile` and has `canonicalIndex` 1.
- **File + line range**: `src/features/test/question-bank.ts:20-29`, `src/features/test/question-bank.ts:61-73`; `tests/unit/variant-question-bank.test.ts:13-31`; `tests/unit/test-question-bootstrap.test.ts:62-80`, `tests/unit/test-question-bootstrap.test.ts:99-137`.
- **Test coverage**: Unit coverage exists for canonical index and profile-first EGTT. No requested E2E test asserts a question-number label because the UI does not render one.
- **QA script dependency**: No question-number regex. `scripts/qa/check-phase10-transition-contracts.mjs:63-73` only checks controller telemetry/ingress ownership.

### 19. Current question text element

- **Finding**: The current question text renders as `<h2 className="m-0">{currentQuestion?.question}</h2>` inside the question panel. There is no `data-testid` on the question text element and no additional semantic wrapper beyond the `h2`.
- **File + line range**: `src/features/test/test-question-client.tsx:215-220`.
- **Test coverage**: No requested E2E/unit test asserts the question text element type, class, or test id.
- **QA script dependency**: No direct question text regex.

## Section findings: Exit / navigation warning

### 20. Current `beforeunload` or router guard presence

- **Finding**: `test-question-client.tsx` imports App Router `useRouter` and uses `router.replace(landingPath)` only for instruction redirect-home actions. The client and run controller do not register `beforeunload`, `popstate`, `router.beforePopState`, `router.back`, or a route-leave guard. A separate `use-test-entry-orchestrator.ts` file exists in the working tree and also uses `router.replace`, but it is not imported by the current client.
- **File + line range**: `src/features/test/test-question-client.tsx:3-22`, `src/features/test/test-question-client.tsx:55-65`, `src/features/test/test-question-client.tsx:123-156`; `src/features/test/use-test-run-controller.ts:1-20`.
- **Test coverage**: No requested E2E/unit test covers unload/back navigation warning.
- **QA script dependency**: No `beforeunload` or router guard regex in `check-phase10` or `check-phase11`. `scripts/qa/check-phase10-transition-contracts.mjs:53-61` conditionally checks `test.entryOrchestrator` for instruction/ingress functions if that file exists.

### 21. Next.js version and router guard API

- **Finding**: `package.json` pins `next` to `16.2.4`. The current code uses `next/navigation` App Router `useRouter`, whose local type returns `AppRouterInstance`. `AppRouterInstance` exposes `back`, `forward`, `refresh`, `push`, `replace`, `prefetch`, and optional `experimental_gesturePush`, but not `beforePopState`. The Pages Router `NextRouter` type includes `beforePopState`; that is a different router type from `next/router`.
- **File + line range**: `package.json:24-32`; `src/features/test/test-question-client.tsx:3-4`, `src/features/test/test-question-client.tsx:57-58`; `node_modules/next/dist/client/components/navigation.d.ts:50-62`; `node_modules/next/dist/shared/lib/app-router-context.shared-runtime.d.ts:20-52`; `node_modules/next/dist/shared/lib/router/router.d.ts:50-60`, `node_modules/next/dist/shared/lib/router/router.d.ts:203-207`.
- **Test coverage**: No test coverage for router guard API availability.
- **QA script dependency**: No QA script checks Next router guard APIs.

## Section findings: InstructionOverlay disabled button style gap

### 22. Exact disabled class strings in both files

- **Finding**: `InstructionOverlay` primary and secondary buttons both inherit these disabled utilities from `instructionButtonBaseClassName`: `disabled:cursor-default disabled:opacity-[0.58]`. The rendered instruction buttons do not currently receive a `disabled` prop. `test-question-client.tsx` primary and secondary buttons inherit these disabled utilities from `testButtonBaseClassName`: `disabled:!cursor-not-allowed disabled:!border-[var(--interactive-disabled-border)] disabled:!bg-[var(--interactive-disabled-bg)] disabled:!text-[var(--interactive-disabled-ink)] disabled:!opacity-100 disabled:!shadow-none disabled:hover:!border-[var(--interactive-disabled-border)] disabled:hover:!bg-[var(--interactive-disabled-bg)] disabled:hover:!text-[var(--interactive-disabled-ink)] disabled:hover:!shadow-none disabled:hover:!translate-y-0`. Differing disabled tokens are therefore all instruction disabled tokens and all test-client disabled tokens; there is no identical disabled utility token shared between the two base strings.
- **File + line range**: `src/features/test/instruction-overlay.tsx:7-14`, `src/features/test/instruction-overlay.tsx:62-80`; `src/features/test/test-question-client.tsx:37-44`, `src/features/test/test-question-client.tsx:246-281`.
- **Test coverage**: Consent smoke asserts instruction CTA text/presence in `tests/e2e/consent-smoke.spec.ts:117-123`, `tests/e2e/consent-smoke.spec.ts:141-145`, `tests/e2e/consent-smoke.spec.ts:161-166`, `tests/e2e/consent-smoke.spec.ts:215-219`, and `tests/e2e/consent-smoke.spec.ts:244-252`, but not disabled styling. Theme-matrix captures `test-instruction` screenshots via `tests/e2e/theme-matrix-manifest.json:64-72` and `tests/e2e/theme-matrix-smoke.spec.ts:268-272`, but does not assert disabled classes. No unit test directly asserts these class strings.
- **QA script dependency**: `scripts/qa/_path-config.mjs:44-46` maps `styles.globals`, but `check-phase10` and `check-phase11` do not assert these disabled tokens or `instruction-overlay.tsx`.

### 23. CSS token availability

- **Finding**: The disabled tokens exist in both light root and dark theme scopes.
  - `:root`: `--interactive-disabled-bg: color-mix(in srgb, var(--chip-bg) 58%, var(--panel-solid));`, `--interactive-disabled-border: color-mix(in srgb, var(--surface-divider) 72%, transparent);`, `--interactive-disabled-ink: color-mix(in srgb, var(--muted-ink) 62%, transparent);`
  - `html[data-theme='dark']`: `--interactive-disabled-bg: color-mix(in srgb, var(--chip-bg) 42%, transparent);`, `--interactive-disabled-border: color-mix(in srgb, var(--surface-divider) 64%, transparent);`, `--interactive-disabled-ink: color-mix(in srgb, var(--muted-ink) 58%, transparent);`
- **File + line range**: `src/app/globals.css:4-38`, `src/app/globals.css:107-123`.
- **Test coverage**: No requested test asserts CSS variable declarations. Theme-matrix screenshots may visually include disabled test nav buttons in `test-question` state, but not the instruction overlay disabled state.
- **QA script dependency**: No disabled-token regex in `check-phase10` or `check-phase11`.

## Cross-cutting dependencies

- Navigation and auto-advance: answer choice handlers currently update answer state only; forward movement is owned by `moveQuestion(1)` on `test-next-button`. Theme-matrix result setup also depends on `test-next-button` and `test-submit-button`.
- Navigation and progress: `moveQuestion(-1)` tail-resets `runtimeState.answers`, and `scoringProgress` derives directly from that same answer map each render.
- Layout and screenshots: theme-matrix captures `.page-shell`, so progress/header, question panel, answer grid, and nav row are captured together in the `test-question` state.
- Button styles: `test-question-client.tsx` shares one button base across primary, secondary, and answer buttons; `InstructionOverlay` owns a separate base string with different disabled utilities.
- Animation and reduced motion: landing reduced-motion state is JS-readable only through landing feature hooks and props; the test question UI currently has only local Tailwind transitions and no shared reduced-motion runtime signal.

## Open questions

No unresolved ambiguity was found by reading the current code for this inventory. Product/design decisions would be required only before changing behavior or visuals, which is outside this report's scope.
