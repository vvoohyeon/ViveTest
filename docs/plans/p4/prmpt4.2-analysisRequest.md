R4.2 첫 번째 분석 요청 프롬프트

## Analysis Goal

Analyze the current implementation of the test question flow UI — specifically
`src/features/test/test-question-client.tsx` and its CSS/token dependencies —
to produce an objective inventory of the following seven UX/UI surfaces:

1. Navigation button layout (Previous/Next/Submit)
2. Delayed auto-advance infrastructure prerequisites
3. Question transition animation infrastructure
4. Progress bar implementation
5. Layout container hierarchy
6. Question number display availability
7. Exit/navigation warning
8. InstructionOverlay disabled button style gap

The code has been through a structural refactor (run controller extraction,
canonical-index answer storage, tail-reset on NAVIGATE_PREVIOUS). Report
only what the code currently does. Do NOT propose implementations, evaluate
design choices, or recommend directions.

---

## Context: What Has Already Changed

The following structural changes are already in place and are NOT in scope:

- Run state is now managed by a dedicated controller (e.g., `use-test-run-controller.ts`
  or equivalent). Do NOT analyze run state management internals.
- Answer storage uses canonical index string keys (`"1"`, `"2"`) rather than UI ids.
- NAVIGATE_PREVIOUS action deletes the current and all subsequent answers (tail reset).
- `trackAttemptStart` / `trackFinalSubmit` calls have moved to the controller.
  `check-phase10-transition-contracts.mjs` has been updated accordingly.

---

## Files to Explore First

Primary:
- `src/features/test/test-question-client.tsx`
- `src/features/test/instruction-overlay.tsx`
- `src/app/globals.css`

Animation reference (read-only — do not propose changes to these):
- `src/features/landing/grid/landing-grid-card.module.css`
- `src/features/landing/grid/landing-grid-card.tsx`
- `src/features/landing/model/interaction-state.ts`

Supporting:
- `src/features/test/question-bank.ts`
- `src/features/test/domain/types.ts`
- `src/features/test/storage/test-storage-keys.ts`

Test files:
- `tests/e2e/consent-smoke.spec.ts`
- `tests/e2e/theme-matrix-smoke.spec.ts`
- `tests/unit/test-question-bootstrap.test.ts`

QA scripts:
- `scripts/qa/check-phase10-transition-contracts.mjs`
- `scripts/qa/check-phase11-telemetry-contracts.mjs`
- `scripts/qa/_path-config.mjs`

---

## Code Evidence to Verify

Report actual file paths and line ranges for every finding.

### Section 1 — Navigation Button Layout

1. **Current Previous button visibility logic** — what condition controls whether
   the Previous button is rendered vs hidden? Is it a conditional render
   (`{condition ? <button> : null}`) or a CSS visibility/opacity toggle? Confirm
   whether hiding Previous at Q1 changes the layout height of the nav row
   (i.e., does the nav row collapse, or does it maintain a fixed height?).

2. **Current Submit vs Next split** — confirm the exact JSX conditional that
   switches between the Next button and Submit button. Is it rendered in the
   same DOM slot (same flex row position), or do they occupy different positions
   in the layout?

3. **Current disabled conditions** — list the exact boolean expressions used in:
   - Previous button `disabled` prop
   - Next button `disabled` prop
   - Submit button `disabled` prop

   Note whether `started` or any controller-phase flag is still part of these
   expressions after the structural refactor.

4. **`data-testid` anchors on nav buttons** — list every `data-testid` attribute
   on the three navigation buttons. Note whether any E2E spec in
   `consent-smoke.spec.ts` or `theme-matrix-smoke.spec.ts` asserts on these
   test ids or on the button's disabled state.

---

### Section 2 — Delayed Auto-advance Infrastructure

5. **Timer and RAF usage in test-question-client.tsx** — list every
   `setTimeout`, `clearTimeout`, `requestAnimationFrame`, and
   `cancelAnimationFrame` call currently present in the client file or its
   controller. For each: what is its purpose, and is its cleanup ref owned at
   the component or controller level?

6. **Current answer selection handler** — confirm the exact function that fires
   when the user clicks an answer choice (A or B). What does it do after
   updating the answer? Does it currently trigger any navigation or side effect
   beyond the state update?

7. **Reduced-motion support patterns in the project** — in
   `landing-grid-card.module.css` and any related CSS, identify how
   `prefers-reduced-motion: reduce` is currently handled. Is it via
   `@media (prefers-reduced-motion: reduce)` blocks, or via a data attribute on
   the root element, or both? Confirm whether there is a JS-readable
   `prefersReducedMotion` signal available in the landing runtime and whether
   it is accessible outside the landing feature namespace.

---

### Section 3 — Animation Infrastructure

8. **Existing CSS animation tokens and keyframe patterns** — in
   `landing-grid-card.module.css`, list:
   - Every named `@keyframes` block (name and approximate line range)
   - Every CSS custom property used as a duration or easing value
   - Whether animations are applied via CSS class toggling or inline style
   - Whether `animation-fill-mode: both` or `forwards` is used

9. **CSS Module usage pattern in test feature** — confirm whether any file
   under `src/features/test/` currently uses a `.module.css` file. If not,
   confirm what styling approach is used (Tailwind utility classes inline,
   class constants at file top, or global CSS classes).

10. **`will-change` and `transform` usage** — in the landing grid animation
    CSS, note whether `will-change: transform` or `will-change: opacity` is
    declared on animated elements, and whether `transform: translateX()`
    is used for slide animations specifically.

11. **Current animation surface in test-question-client.tsx** — list every
    CSS class or inline style that applies a `transition-*` or `animation-*`
    property on any element in the current question panel or answer grid.
    Note the target property (e.g., `transition-property: width`) and
    duration for each.

---

### Section 4 — Progress Bar

12. **Current progress bar implementation** — confirm:
    - The DOM element type and ARIA attributes (`role`, `aria-valuenow`,
      `aria-valuemax`, `aria-valuetext`) on the progress bar
    - How `scoringProgress.percent` is computed and what its input is
    - The exact CSS expression used to set the filled-bar width
      (e.g., `style={{width: \`${scoringProgress.percent}%\`}}`)
    - Whether the percentage label is rendered inside or outside the bar element
    - `data-testid` values on the bar and label

13. **Progress bar sync with tail reset** — after the structural refactor,
    when NAVIGATE_PREVIOUS fires and subsequent answers are deleted, does
    `scoringProgress` recompute from the new (reduced) answer set? Confirm
    by tracing `resolveScoringProgress()` inputs — does it read directly from
    run controller state, or from a snapshot?

14. **Theme-matrix screenshot of progress bar** — in
    `tests/e2e/theme-matrix-smoke.spec.ts`, confirm whether the progress bar
    is visible in the captured `test-question` state. Does the manifest specify
    a non-zero `answered` count, or is it always captured at 0% progress?

---

### Section 5 — Layout Container Hierarchy

15. **Current container nesting in the question panel** — starting from the
    outermost `<section>` (or equivalent), list every container element wrapping
    the question, answer choices, and navigation buttons. For each container:
    - Element type and primary CSS class
    - `data-testid` if present
    - Layout role (e.g., `grid gap-[14px]`, `flex flex-wrap gap-[10px]`)

16. **Progress bar container relationship** — confirm which ancestor element
    contains both the progress bar and the question panel. Is the progress bar
    inside the `<header>`, and is the question panel inside a separate `<div>`?
    What is the outermost shared container?

17. **`testShellCardClassName` and `testShellStageClassName` roles** — confirm
    the exact Tailwind classes on these two class constants and what layout
    model they establish (grid, flex, or block).

---

### Section 6 — Question Number Display

18. **Current question number data availability** — in the resolved question
    object (`ResolvedQuestion`), confirm whether a display-ready question
    number field exists. Specifically:
    - Is `canonicalIndex` always a 1-based integer?
    - Is there a separate `displayIndex` or `questionNumber` field, or would
      `canonicalIndex` be the direct source for a "Q{n}" label?
    - For profile-type questions (`questionType === 'profile'`), what is
      `canonicalIndex`? Is it 1 when a profile question appears first (e.g., egtt)?

19. **Current question text element** — confirm the DOM element type, CSS
    classes, and `data-testid` (if any) of the element rendering
    `currentQuestion.question`. Is there any heading level or semantic wrapper?

---

### Section 7 — Exit / Navigation Warning

20. **Current `beforeunload` or router guard presence** — confirm whether
    `test-question-client.tsx` or its controller currently registers any
    `beforeunload` event listener or Next.js router `beforePopState`/`back`
    guard. If none exists, confirm that explicitly.

21. **Next.js version and router guard API** — in `package.json`, confirm the
    exact `next` version. Determine whether `router.beforePopState` is available
    in this version's App Router, or whether only the `beforeunload` Web API
    approach is viable for exit warning in this context.

---

### Section 8 — InstructionOverlay Disabled Button Style Gap

22. **Exact disabled class strings in both files** — report verbatim the
    `disabled:*` Tailwind utility classes on:
    - The primary and secondary buttons in `instruction-overlay.tsx`
    - The primary and secondary buttons in `test-question-client.tsx`
      (or the equivalent in the extracted run controller UI)

    List every differing token between the two sets.

23. **CSS token availability** — confirm that `--interactive-disabled-bg`,
    `--interactive-disabled-border`, and `--interactive-disabled-ink` are
    declared in `src/app/globals.css` (both `:root` and
    `html[data-theme='dark']` if applicable). Report the exact values.

---

## Test / QA Impact Inventory

For each of the eight UX/UI surfaces above, report:

1. **Existing E2E test coverage** — which spec file and which test description
   currently exercises this surface? Is the assertion on DOM presence,
   disabled attribute, visual state, or screenshot?

2. **Existing unit test coverage** — does any file under `tests/unit/` assert
   on this surface directly?

3. **Screenshot baseline involvement** — does `theme-matrix-smoke.spec.ts`
   capture this element in any of its matrix states? Confirm the relevant
   `data-testid` or CSS selector used.

4. **QA script pattern dependency** — does `check-phase10-transition-contracts.mjs`
   or `check-phase11-telemetry-contracts.mjs` assert on any identifier, pattern,
   or file path that this surface touches? Report the exact regex or file-path
   check.

---

## Exclusions

Do NOT analyze or report on:

- Qualifier Question / Instruction Overlay integration — this is out of scope
  for this prompt (future Prompt 4).
- Run state machine internals, reducer design, or phase flag structure —
  already handled in prior structural refactor.
- Active-run resume (read path from `test:{variant}:activeRun`) — Phase 4/5.
- Telemetry event semantics or payload shape.
- `src/features/test/domain/`, `schema-registry.ts`, `response-projection.ts`.
- Blog destination, landing grid, or GNB behavior.
- Any file outside `src/features/test/`, `src/app/globals.css`, and the
  animation reference files listed above.

---

## Output Format

Produce a markdown document with the following sections.

### Summary
One paragraph: what is the current state of the test question UI relative to
the seven analysis targets, and what are the most significant gaps or
dependencies that the analysis uncovered.

### Section findings: [Section name]
One subsection per Section (1–8). For each Code Evidence item within the
section, report:
- **Finding**: what the code actually does, verbatim identifiers and class
  strings where relevant
- **File + line range**: exact location
- **Test coverage**: existing E2E / unit coverage for this specific behavior
- **QA script dependency**: any pattern check in `check-phase10` or
  `check-phase11` that references this element

### Cross-cutting dependencies
List any dependencies between sections that would require coordinated changes
(e.g., "removing the Next button affects both Section 1 nav layout and
Section 2 auto-advance timer ownership").

### Open questions
List only ambiguities that cannot be resolved by reading the code — decisions
that require product or design input before implementation can proceed.
Do NOT include implementation recommendations.
