## Goal

Refactor `src/features/landing/grid/use-landing-interaction-controller.ts`
across three coordinated candidates without changing any observable landing
card behavior. All three candidates must be implemented sequentially in the
order: Candidate 1 → Candidate 3 → Candidate 2.

This plan supersedes the constraint at
`docs/plans/2026-05-03-r02-landing-interaction-controller-refactor.md:184`
that prohibited wrapping event handlers or `resolveCardInteractionBindings`
in new useCallbacks. That constraint is no longer authoritative for this
refactoring.

Decisions are confirmed:
- D1: move `resolveDesktopMotionRole` to `desktop-shell-phase.ts`
- D2: flat type move — keep `LandingCardInteractionBindings` as 22 flat
  properties, no grouping

---

## Behavioral Contracts

The following behaviors MUST remain identical after all three candidates:

1. Desktop expansion/collapse: clicking a card trigger dispatches
   `CARD_EXPAND` with the correct variant and availability. No change to
   dispatch payload fields.

2. Mobile open/close: `onClick` on a mobile-viewport trigger calls
   `beginMobileOpen(card.variant)` only when `mobileLifecycleState.phase`
   is `NORMAL` and `cardVariant` does not match. `onMobileClose` calls
   `beginMobileClose()` with no card data.

3. Answer choice transition: `onAnswerChoiceSelect` passes the full
   LandingCard object to the external `onAnswerChoiceSelect` callback and
   calls `beginTransition(card.variant)` only when the callback returns
   a non-false result. `card.type !== 'test'` is an early return.

4. Blog CTA transition: `onPrimaryCtaClick` passes the full LandingCard
   object to the external `onPrimaryCtaSelect` callback and calls
   `beginTransition(card.variant)` only when the callback returns a
   non-false result. `card.type !== 'blog'` is an early return.

5. HOVER_LOCK / keyboard-mode / inert / aria-disabled / tabIndex
   semantics: values of `hoverLockEnabled`, `keyboardMode`,
   `keyboardModeBlocked`, `interactionBlocked`, `ariaDisabled`, `tabIndex`
   must be computed from the same source values as before.

6. `resolveCardInteractionBindings(card)` call shape in
   `landing-catalog-grid.tsx` must not change. All 22 property names
   returned must remain identical.

7. `resolveDesktopMotionRole` and `resolveVisualState` must produce
   identical outputs for all inputs after relocation. Do not alter logic,
   input types, or output types during the move.

---

## Files to Change and Implementation Order

### Before writing any code, read these files in full:
- `src/features/landing/grid/use-landing-interaction-controller.ts`
- `src/features/landing/grid/landing-catalog-grid.tsx`
- `src/features/landing/grid/landing-grid-card.tsx`
- `src/features/landing/grid/desktop-shell-phase.ts`
- `src/features/landing/model/interaction-state.ts`
- `src/features/landing/grid/interaction-dom.ts`
- `scripts/qa/check-phase7-state-contracts.mjs`
- `scripts/qa/check-phase9-performance-contracts.mjs`
- `scripts/qa/_path-config.mjs`
- `tests/unit/landing-desktop-shell-phase.test.ts`
- `docs/project-analysis.md`

### Check before any implementation:
Before writing code, confirm the following by reading the source files:

CHECK-A: In `landing-grid-card.tsx`, find the root element of the rendered
card. Confirm whether it has a `data-card-variant` attribute (or equivalent
attribute carrying the variant string). If the attribute name differs from
`data-card-variant`, use the actual attribute name throughout Candidate 2.
Confirm the attribute is present on the same element reachable by
`closest()` from both answer-choice `<button>` elements and CTA `<a>`
elements inside the card body.

CHECK-B: Confirm whether `tests/unit/landing-interaction-state.test.ts`
exists. If it does not exist, create it as a new file (not Modify). If it
exists, Modify it. Do not assume either state; read the filesystem first.

CHECK-C: In `landing-grid-card.tsx`, find the current source of the
`LandingCardVisualState` type. Confirm it is defined or re-exported there
and is used by downstream consumers through that import path. This is
required before planning the re-export in Candidate 1.

### Planned file changes (ordered by candidate):

**Candidate 1:**
- Modify: `src/features/landing/grid/desktop-shell-phase.ts` (add export)
- Modify: `src/features/landing/model/interaction-state.ts` (add export,
  add type)
- Modify: `src/features/landing/grid/landing-grid-card.tsx` (re-export
  `LandingCardVisualState` from new owner — see Detailed Instructions)
- Modify: `src/features/landing/grid/use-landing-interaction-controller.ts`
  (remove local definitions, add imports)
- Modify: `tests/unit/landing-desktop-shell-phase.test.ts`
- Modify or Create: `tests/unit/landing-interaction-state.test.ts`
  (see CHECK-B)

**Candidate 3:**
- Create: `src/features/landing/grid/landing-card-interaction-bindings.ts`
- Modify: `src/features/landing/grid/use-landing-interaction-controller.ts`
  (import from new file)

**Candidate 2:**
- Modify: `src/features/landing/grid/use-landing-interaction-controller.ts`
  (add cardByVariant map, add resolveInteractionCard helper, add four
  stable handlers, update resolveCardInteractionBindings return)
- Create: `tests/unit/landing-interaction-controller-handlers.test.ts`

**Files with no planned change:**
- `src/features/landing/grid/landing-catalog-grid.tsx`
- `src/features/landing/grid/index.ts`
- `scripts/qa/_path-config.mjs`
- `scripts/qa/check-phase7-state-contracts.mjs`
- `scripts/qa/check-phase9-performance-contracts.mjs`
- `tests/unit/landing-card-contract.test.ts`
- `public/theme-bootstrap.js`

---

## Detailed Implementation Instructions

### Candidate 1 — Extract pure visual derivation

#### Step 1-A — RED (resolveDesktopMotionRole)

Update `tests/unit/landing-desktop-shell-phase.test.ts` to import
`resolveDesktopMotionRole` from
`../../src/features/landing/grid/desktop-shell-phase`.

Add unit assertions (before moving the function — tests will fail RED):
- Returns `handoff-source` when `handoffSourceCardVariant` matches the card
- Returns `handoff-target` when only `handoffTargetCardVariant` matches
- Returns `opening` for matching opening variant, `closing` for closing
- Returns `steady` when viewport is not mobile AND (`transitionExpanded`
  OR (`cardState === 'EXPANDED'` AND `cardEnterable`))
- Returns `idle` for mobile viewport, non-enterable expanded, no motion
  markers

Run: `npm test -- tests/unit/landing-desktop-shell-phase.test.ts`
Expected: RED — `resolveDesktopMotionRole` not yet exported.

#### Step 1-B — RED (resolveVisualState)

In the file identified by CHECK-B (existing or new
`tests/unit/landing-interaction-state.test.ts`), add import of
`resolveVisualState` from `../../src/features/landing/model/interaction-state`.

Add unit assertions:
- Returns `expanded` when `transitionExpanded` is true
- Returns `expanded` when `desktopClosingVisible` or `desktopCleanupPending`
  is true
- Returns `expanded` for `cardState: 'EXPANDED'` only when `cardEnterable`
  is true; returns `normal` when `cardEnterable` is false
- Returns `focused` for `cardState: 'FOCUSED'` with no expanded override
- Returns `normal` for `NORMAL` card state

Run: `npm test -- tests/unit/landing-interaction-state.test.ts`
Expected: RED — `resolveVisualState` not yet exported.

#### Step 1-C — Move `LandingCardVisualState` type ownership

After confirming CHECK-C:
1. Add `LandingCardVisualState = 'normal' | 'expanded' | 'focused'` as an
   exported type in `src/features/landing/model/interaction-state.ts`.
2. In `landing-grid-card.tsx`, replace the local type definition (or
   re-export) with:
   `export type { LandingCardVisualState } from '@/features/landing/model/interaction-state';`
   This preserves existing consumers that import from `landing-grid-card`.
3. Remove the type from `use-landing-interaction-controller.ts`; import it
   from `interaction-state`.

Run: `npm run typecheck`
Expected: clean compile, no runtime change.

#### Step 1-D — Move `resolveVisualState`

Move the implementation of `resolveVisualState` from
`use-landing-interaction-controller.ts` to
`src/features/landing/model/interaction-state.ts` as an exported function.

Import direction rule: `interaction-state.ts` MUST NOT import from
`use-landing-interaction-controller.ts`, `landing-grid-card.tsx`, or any
hook file. Its only allowed new imports are from `state-types.ts` or
sibling model files.

In `use-landing-interaction-controller.ts`, replace the local function
with an import from `interaction-state`.

Run: `npm test -- tests/unit/landing-interaction-state.test.ts`
Expected: GREEN — all visual-state assertions pass; existing reducer tests
unchanged.

#### Step 1-E — Move `resolveDesktopMotionRole`

Move the implementation of `resolveDesktopMotionRole` from
`use-landing-interaction-controller.ts` to
`src/features/landing/grid/desktop-shell-phase.ts` as an exported function.

Import direction rule: `desktop-shell-phase.ts` MUST NOT import from
`use-landing-interaction-controller.ts`. If `DesktopMotionState` is needed,
add a type-only import from `use-desktop-motion-controller.ts`. Verify that
`use-desktop-motion-controller.ts` does not import `desktop-shell-phase.ts`
before adding this import (no circular dependency).

In `use-landing-interaction-controller.ts`, replace the local function
with an import from `desktop-shell-phase`.

Run: `npm test -- tests/unit/landing-desktop-shell-phase.test.ts`
Expected: GREEN — all motion-role assertions pass; existing shell-phase
tests unchanged.

#### Step 1-F — Static contract verification

Run:
```bash
node scripts/qa/check-phase7-state-contracts.mjs
node scripts/qa/check-phase9-performance-contracts.mjs
```

The scripts check that `resolveCardStateForVariant` and `resolveCardTabIndex`
remain visible in the controller (they do — they are imported from
`interaction-state.ts` and called inside the controller), and that
`prefers-reduced-motion` and `useLayoutEffect` remain in the controller file.
Neither of these is affected by Candidate 1. Expected: both scripts pass
without modification.

---

### Candidate 3 — Move binding contract type

After Candidate 1 is fully GREEN:

#### Step 3-A — Create contract file

Create `src/features/landing/grid/landing-card-interaction-bindings.ts`.

Move only the `LandingCardInteractionBindings` interface from
`use-landing-interaction-controller.ts` into this file as an exported type.
Do not move any implementation, hook, or logic.

Do not add this file to `src/features/landing/grid/index.ts`. Keep it as
an internal exact-path import.

#### Step 3-B — Update controller import

In `use-landing-interaction-controller.ts`, replace the local interface
definition with:
`import type { LandingCardInteractionBindings } from './landing-card-interaction-bindings';`

#### Step 3-C — Verify

Run: `npm run typecheck`
Expected: clean compile. No test files import `LandingCardInteractionBindings`
by name; no QA script references it. This step is type-compiler-only.

---

### Candidate 2 — Stabilize card event handler composition

After Candidate 3 is fully GREEN:

#### Step 2-Pre — Verify DOM structure

Using CHECK-A results, confirm the exact attribute name on the card root
element. All subsequent `resolveInteractionCard` implementation must use
this confirmed attribute name. If `data-card-variant` does not exist on the
card root, identify the correct attribute and use that consistently.

#### Step 2-A — RED (handler tests)

Create `tests/unit/landing-interaction-controller-handlers.test.ts` with
`// @vitest-environment jsdom`.

Add assertions that will fail RED until implementation:

1. Handler identity stability: render the controller with a set of cards.
   Call `resolveCardInteractionBindings(cards[0])` twice without any state
   change between calls. Assert `onClick`, `onAnswerChoiceSelect`,
   `onPrimaryCtaClick`, and `onMobileClose` are reference-equal (===)
   across both calls.

2. Latest-card behavior: render controller with card A at variant X. Trigger
   a rerender with a new card object for variant X (different object
   reference, same variant). Call `onAnswerChoiceSelect` via the binding
   returned for variant X. Assert the external callback receives the new
   card object, not the old one.

3. Latest-blog behavior: same pattern for `onPrimaryCtaClick` with a blog
   card.

4. Mobile close: call `onMobileClose` and assert `event.preventDefault()`
   was called and `beginMobileClose` was invoked.

Run: `npm test -- tests/unit/landing-interaction-controller-handlers.test.ts`
Expected: RED — all handler identity tests fail because current handlers are
inline closures.

#### Step 2-B — Add card lookup map

Inside `useLandingInteractionController`, add:
```ts
const cardByVariant = useMemo<ReadonlyMap<string, LandingCard>>(
  () => new Map(cards.map((c) => [c.variant, c])),
  [cards]
);
```

Key: `string` (variant). Value: `LandingCard`.

#### Step 2-C — Add `resolveInteractionCard` helper

Add a file-private (non-exported) function in
`use-landing-interaction-controller.ts`:

```ts
function resolveInteractionCard(
  target: EventTarget | null,
  cardByVariant: ReadonlyMap<string, LandingCard>
): LandingCard | null {
  if (!(target instanceof Element)) {
    return null;
  }
  const root = target.closest('[data-CONFIRMED-ATTRIBUTE]'); // use attribute from CHECK-A
  if (!(root instanceof HTMLElement)) {
    return null;
  }
  const variant = root.dataset.CONFIRMED_KEY; // use dataset key from CHECK-A
  if (!variant) {
    return null;
  }
  return cardByVariant.get(variant) ?? null;
}
```

Replace `data-CONFIRMED-ATTRIBUTE` and `CONFIRMED_KEY` with the actual
attribute confirmed in CHECK-A.

This function must not import from `landing-grid-card.tsx`.

#### Step 2-D — Add `handleMobileClose`

```ts
const handleMobileClose = useCallback(
  (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    beginMobileClose();
  },
  [beginMobileClose]
);
```

Dependency array rule: include only the stable identifiers that, if they
change, must produce a new handler instance. Do NOT include the full
`mobileLifecycleState` object — include only specific fields if needed.

Wire into `resolveCardInteractionBindings`: `onMobileClose: handleMobileClose`.

#### Step 2-E — Add `handleCardClick`

Dependency array uses FIELD-LEVEL references, not object references:

```ts
const handleCardClick = useCallback(
  (event: ReactMouseEvent<HTMLElement>) => {
    const card = resolveInteractionCard(event.currentTarget, cardByVariant);
    if (!card) return;

    const cardEnterable = isEnterableCard(card);
    const isTransitioning = interactionState.pageState === 'TRANSITIONING';
    const mobileInteractionLocked =
      isMobileViewport &&
      mobileLifecycleState.phase !== 'NORMAL' &&
      (mobileLifecycleState.cardVariant !== card.variant ||
        mobileLifecycleState.phase !== 'OPEN');
    const activationBlocked = isTransitioning || !cardEnterable || mobileInteractionLocked;

    if (activationBlocked) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (isMobileViewport) {
      if (
        mobileLifecycleState.phase === 'NORMAL' &&
        mobileLifecycleState.cardVariant !== card.variant
      ) {
        beginMobileOpen(card.variant);
      }
      return;
    }

    desktopTransitionReasonRef.current = 'expand';
    dispatchInteraction({
      type: 'CARD_EXPAND',
      nowMs: event.timeStamp,
      interactionMode,
      cardVariant: card.variant,
      available: cardEnterable
    });
  },
  [
    beginMobileOpen,
    cardByVariant,
    desktopTransitionReasonRef,
    dispatchInteraction,
    interactionMode,
    interactionState.pageState,      // field, not full object
    isMobileViewport,
    mobileLifecycleState.cardVariant, // field, not full object
    mobileLifecycleState.phase        // field, not full object
  ]
);
```

IMPORTANT: the deps array must list individual field values
(`interactionState.pageState`, not `interactionState`). This is intentional:
the handler recreates only when those specific field values change, not
whenever the full state object reference changes.

Wire into `resolveCardInteractionBindings`: `onClick: handleCardClick`.

#### Step 2-F — Add `handleAnswerChoiceSelect` and `handlePrimaryCtaClick`

```ts
const handleAnswerChoiceSelect = useCallback(
  (choice: 'A' | 'B', event: ReactMouseEvent<HTMLButtonElement>) => {
    const card = resolveInteractionCard(event.currentTarget, cardByVariant);
    if (!card || card.type !== 'test') return;

    const shouldBeginTransition = onAnswerChoiceSelect?.(card, choice) !== false;
    if (shouldBeginTransition) {
      beginTransition(card.variant);
    }
    event.preventDefault();
  },
  [beginTransition, cardByVariant, onAnswerChoiceSelect]
);

const handlePrimaryCtaClick = useCallback(
  (event: ReactMouseEvent<HTMLAnchorElement>) => {
    const card = resolveInteractionCard(event.currentTarget, cardByVariant);
    if (!card || card.type !== 'blog') return;

    const shouldBeginTransition = onPrimaryCtaSelect?.(card) !== false;
    if (shouldBeginTransition) {
      beginTransition(card.variant);
    }
    event.preventDefault();
  },
  [beginTransition, cardByVariant, onPrimaryCtaSelect]
);
```

Wire both into `resolveCardInteractionBindings`.

The `onAnswerChoiceSelect` handler signature must match the type defined in
`LandingCardInteractionBindings`. Verify TypeScript accepts the stable
handler assignment before proceeding.

#### Step 2-G — Remove inline handlers

Remove only the four inline handler closures (`onClick`, `onAnswerChoiceSelect`,
`onPrimaryCtaClick`, `onMobileClose`) from inside `resolveCardInteractionBindings`.

Do NOT rename any returned property. Do NOT change
`resolveCardInteractionBindings` into a hook.

#### Step 2-H — Commit boundary

Commit all of steps 2-B through 2-G as a single coordinated commit.

Rollback path: if E2E regressions are found after this commit, revert the
entire commit with `git revert HEAD` and re-examine the `resolveInteractionCard`
DOM query and dependency arrays before retrying.

---

## Test Update Instructions

### Candidate 1

- `tests/unit/landing-desktop-shell-phase.test.ts`: add `resolveDesktopMotionRole`
  import and assertions described in Step 1-A. Do not delete existing
  `resolveDesktopShellPhase` / `shouldRenderDesktopStageShell` tests.

- `tests/unit/landing-interaction-state.test.ts` (existing) or new file
  (see CHECK-B): add `resolveVisualState` import and assertions described
  in Step 1-B. If creating new, structure it as a standard Vitest file
  with `describe`/`it` blocks.

### Candidate 2

- `tests/unit/landing-interaction-controller-handlers.test.ts`: created in
  Step 2-A. Must pass GREEN after Step 2-G. The test file uses
  `// @vitest-environment jsdom`.

### No test changes for Candidate 3.

---

## QA / Verification Commands

Run after each candidate completes before starting the next:

```bash
# After Candidate 1
npm run lint
npm run typecheck
npm test -- \
  tests/unit/landing-desktop-shell-phase.test.ts \
  tests/unit/landing-interaction-state.test.ts
node scripts/qa/check-phase7-state-contracts.mjs
node scripts/qa/check-phase9-performance-contracts.mjs

# After Candidate 3
npm run typecheck

# After Candidate 2
npm run lint
npm run typecheck
npm test
npm run build
node scripts/qa/check-phase4-grid-contracts.mjs
node scripts/qa/check-phase5-card-contracts.mjs
node scripts/qa/check-phase6-spacing-contracts.mjs
node scripts/qa/check-phase7-state-contracts.mjs
node scripts/qa/check-phase8-accessibility-contracts.mjs
node scripts/qa/check-phase9-performance-contracts.mjs
node scripts/qa/check-phase10-transition-contracts.mjs
npx playwright test \
  tests/e2e/grid-smoke.spec.ts \
  tests/e2e/state-smoke.spec.ts \
  tests/e2e/gnb-smoke.spec.ts \
  tests/e2e/a11y-smoke.spec.ts \
  tests/e2e/transition-telemetry-smoke.spec.ts
```

QA scripts do not require modification. Confirm by reading the scripts
before running: `check-phase7-state-contracts.mjs` asserts on
`resolveCardStateForVariant`, `resolveCardTabIndex` (remain in controller
via import), `resolveCardInteractionBindings` in `landing-catalog-grid.tsx`,
and `interactionBindings` usage. None of these are moved or renamed.

---

## Documentation Update Instructions

After Candidate 1 is verified GREEN, update `docs/project-analysis.md §5.1`.

Replace:
> `src/features/landing/grid/use-landing-interaction-controller.ts` —
> **558 lines**, owns the two `useReducer` calls, capability/reduced-motion/
> visibility sync, per-card binding composition, active visual state
> derivation, and transition-start callback composition.

With:
> `src/features/landing/grid/use-landing-interaction-controller.ts` — owns
> the two `useReducer` calls, capability/reduced-motion/visibility sync,
> per-card binding composition, and transition-start callback composition.
> Pure visual projection is split: `interaction-state.ts` derives card visual
> state via `resolveVisualState`, and `desktop-shell-phase.ts` derives desktop
> motion roles via `resolveDesktopMotionRole`.

Also update the line count (currently "558 lines") after implementation if
it changes.

No other documentation changes are required for Candidates 2 or 3.

---

## Prohibited Changes / Non-scope

- Do NOT change the external call shape `resolveCardInteractionBindings(card)`
  in `landing-catalog-grid.tsx`
- Do NOT modify `LandingGridCard` prop interface names or runtime prop types
- Do NOT change the two `useReducer` declarations or their initial states
- Do NOT touch transition runtime integration (`LANDING_TRANSITION_CLEANUP_EVENT`,
  `beginTransition` semantics)
- Do NOT modify `interaction-state.ts` reducer logic or state transitions
  (only add the new `resolveVisualState` export and `LandingCardVisualState`
  type)
- Do NOT modify `public/theme-bootstrap.js`
- Do NOT add npm packages or external dependencies
- Do NOT add `LandingCardInteractionBindings` to `src/features/landing/grid/index.ts`
- Do NOT modify `src/proxy.ts`, route builders, locale path helpers, or
  variant registry files
- Do NOT modify QA scripts unless a static contract identifier actually
  changes — this plan does not require any QA script modification

---

## Completion Report Format

When implementation is complete, provide a report with the following sections:

### CHECK results
For each of CHECK-A, CHECK-B, CHECK-C: what was confirmed and any
deviation from the plan.

### Candidate 1 summary
- Functions moved and their confirmed new locations
- `LandingCardVisualState` re-export path in `landing-grid-card.tsx`
- New unit test counts added to each test file
- Confirmation that `check-phase7` and `check-phase9` pass without script changes

### Candidate 3 summary
- Confirmed `landing-card-interaction-bindings.ts` content (interface only)
- Confirmation `typecheck` is clean
- Confirmation the type is NOT added to `index.ts`

### Candidate 2 summary
- Confirmed attribute name used in `resolveInteractionCard` (from CHECK-A)
- Dependency arrays as actually implemented (list all four handlers)
- Confirmation that handler identity test passes GREEN
- Confirmation that latest-card callback test passes GREEN
- E2E test results (pass/fail counts for each spec)

### QA gate result
Output of `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`,
and all QA scripts listed above. State pass or fail for each.

### Deviations
Any step that required a deviation from this plan, with the reason and
what was done instead.
