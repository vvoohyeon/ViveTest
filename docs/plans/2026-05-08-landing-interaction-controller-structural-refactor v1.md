# Landing Interaction Controller Structural Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Project override: execute inline only after explicit user approval; do not use subagents, parallel agents, or automated multi-wave execution.

**Goal:** Simplify `use-landing-interaction-controller.ts` by extracting pure visual derivation, stabilizing card event handlers, and moving the binding contract type without changing landing card behavior.

**Architecture:** Keep reducer ownership and the external `resolveCardInteractionBindings(card)` call shape in the controller. Move pure derivation to existing pure/model modules, keep the binding type in a standalone contract file, and reimplement the four inline card handlers as stable controller-level callbacks that resolve the current card by variant at event time.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Playwright, custom QA contract scripts.

---

## Required Planning Fields

**Plan status:** planning document only. No runtime implementation is authorized until D1 and D2 are confirmed.

**Relevant SSOT contract and guides:**

- `docs/req-landing.md` section 6.6-6.9: card text, slot, height, spacing, and theme contracts.
- `docs/req-landing.md` section 7.5-7.7: HOVER_LOCK, keyboard sequential expansion, and state conformance.
- `docs/req-landing.md` section 8.1-8.6: capability gate, desktop/tap trigger, motion, mobile expanded, and transition start.
- `docs/req-landing.md` section 9.1-9.2: keyboard focus and disabled semantics.
- `docs/req-landing.md` section 11.1-11.3: hydration, animation, and reduced-motion guardrails.
- `docs/project-analysis.md` section 5.1: landing interaction runtime ownership wording.
- `docs/agent-guides/project-rules.md` section `Blog-Telemetry-Theme`.
- `docs/agent-guides/verification-commands.md` section `landing`.

**Future implementation files:**

- Modify: `src/features/landing/grid/use-landing-interaction-controller.ts`
- Modify: `src/features/landing/grid/desktop-shell-phase.ts`
- Modify: `src/features/landing/model/interaction-state.ts`
- Modify: `src/features/landing/grid/landing-grid-card.tsx`
- Create: `src/features/landing/grid/landing-card-interaction-bindings.ts`
- Modify: `tests/unit/landing-desktop-shell-phase.test.ts`
- Modify: `tests/unit/landing-interaction-state.test.ts`
- Create: `tests/unit/landing-interaction-controller-handlers.test.ts`
- Modify: `docs/project-analysis.md`

**Files inspected with no planned change unless implementation disproves this plan:**

- `src/features/landing/grid/landing-catalog-grid.tsx`
- `scripts/qa/_path-config.mjs`
- `scripts/qa/check-phase7-state-contracts.mjs`
- `scripts/qa/check-phase9-performance-contracts.mjs`
- `tests/unit/landing-card-contract.test.ts`
- `src/features/landing/grid/index.ts`

**Impact assessment:**

- Shared components: `LandingGridCard` prop names and runtime prop values stay unchanged. Only the source file for the `LandingCardVisualState` type and the `LandingCardInteractionBindings` type ownership change.
- Localization: no route, locale, message, or copy changes.
- A11y: high-risk because keyboard mode, `inert`, `aria-disabled`, `tabIndex`, trigger activation, and mobile close focus paths must remain identical.
- State contracts: reducer declarations, initial states, reducer transitions, and transition runtime integration remain untouched.
- Core user flow: desktop/tap expansion, mobile open/close, answer choice transition, blog CTA transition, HOVER_LOCK, and reduced-motion behavior must remain observable-equivalent.
- Risk dimensions: usability, a11y, responsiveness, performance, and design-system consistency are all in scope because the controller is a High-Risk landing grid file.

**Validation commands for final implementation:**

```bash
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
npm test -- \
  tests/unit/landing-interaction-dom.test.ts \
  tests/unit/landing-hover-intent.test.ts \
  tests/unit/landing-mobile-lifecycle.test.ts \
  tests/unit/landing-desktop-shell-phase.test.ts \
  tests/unit/landing-grid-plan.test.ts \
  tests/unit/landing-baseline-manager.test.ts \
  tests/unit/gnb-behavior.test.ts \
  tests/unit/gnb-desktop-settings.test.ts \
  tests/unit/gnb-mobile-menu.test.ts \
  tests/unit/gnb-back-navigation.test.ts \
  tests/unit/gnb-theme-transition.test.ts \
  tests/unit/landing-interaction-controller-handlers.test.ts
npx playwright test \
  tests/e2e/grid-smoke.spec.ts \
  tests/e2e/state-smoke.spec.ts \
  tests/e2e/gnb-smoke.spec.ts \
  tests/e2e/a11y-smoke.spec.ts \
  tests/e2e/transition-telemetry-smoke.spec.ts
```

**Decisions requiring confirmation before implementation:**

- D1: final target for `resolveDesktopMotionRole`.
- D2: flat binding type move vs grouped binding return shape.

## 0. Superseded constraints

- Prompt reference: `docs/plans/2026-05-03-landing-interaction-controller-refactor.md:184`.
- Verified repository path: `docs/plans/2026-05-03-r02-landing-interaction-controller-refactor.md:184`.
- Superseded constraint: `Do not wrap event handlers or resolveCardInteractionBindings in new useCallbacks.`
- Scope of supersession: this new refactoring may introduce `useCallback` for card-level handlers where it improves correctness/testability and removes per-card handler closure allocation. The old blanket prohibition is no longer authoritative.
- Current recommendation: use `useCallback` for the four root handlers, but keep `resolveCardInteractionBindings(card)` as a plain resolver function instead of turning it into a hook or wrapping it by default.

## 1. Candidate 1 plan - Extract pure visual derivation

### Target file decision

**`resolveDesktopMotionRole` target: `src/features/landing/grid/desktop-shell-phase.ts`**

- Recommendation: move it beside `resolveDesktopShellPhase`.
- Reason: `resolveDesktopMotionRole` produces `LandingCardDesktopMotionRole`, and `resolveDesktopShellPhase` immediately consumes that value. `desktop-shell-phase.ts` already owns `LandingCardDesktopMotionRole` and `LandingCardDesktopShellPhase`, so this is a "move beside" operation, not a merge.
- Confirmed non-duplicate: `resolveDesktopMotionRole` consumes card state, card variant, enterability, viewport, transition-expanded state, and `DesktopMotionState`; `resolveDesktopShellPhase` consumes the already-derived `motionRole`, availability, viewport, visual expansion, and cleanup pending state.
- D1 remains a decision point because a new `landing-card-visual-state.ts` could keep all visual derivation together, but the recommended target is `desktop-shell-phase.ts`.

**`resolveVisualState` target: `src/features/landing/model/interaction-state.ts`**

- Recommendation: move it beside `resolveCardStateForVariant`.
- Reason: the function is a pure projection from `CardState` plus transient flags into `LandingCardVisualState`. `interaction-state.ts` already owns card state selectors (`resolveCardStateForVariant`, `resolveCardTabIndex`, `isKeyboardModeBlocked`) and has no dependency on the controller.
- Implementation detail: move the `LandingCardVisualState = 'normal' | 'expanded' | 'focused'` type source to `interaction-state.ts`, then re-export it from `landing-grid-card.tsx` so current public imports from `landing-grid-card` and the grid barrel keep working.
- Rejected alternative: a new visual-state helper would avoid adding visual projection to the model file, but it would create another small grid helper for one runtime consumer. The current repo rule against tiny single-use files makes `interaction-state.ts` the cleaner default.

### Import direction check

- Current controller already imports from `desktop-shell-phase.ts` and `interaction-state.ts`.
- After the move, `use-landing-interaction-controller.ts` imports `resolveDesktopMotionRole` from `desktop-shell-phase.ts` and `resolveVisualState` from `interaction-state.ts`.
- `desktop-shell-phase.ts` must not import from `use-landing-interaction-controller.ts`. If it needs `DesktopMotionState`, use a type-only import from `use-desktop-motion-controller.ts`; that hook does not import `desktop-shell-phase.ts`, so no circular import is introduced.
- `interaction-state.ts` must not import from `use-landing-interaction-controller.ts` or `landing-grid-card.tsx`. It can own and export `LandingCardVisualState` directly to avoid a model-to-component dependency.
- `landing-grid-card.tsx` may import and re-export the visual-state type from `interaction-state.ts`; that is a one-way component-to-model type dependency and does not form a cycle.

### Export decision

- Export `resolveDesktopMotionRole`.
- Export `resolveVisualState`.
- Reason: both are pure deterministic helpers and should be directly unit-tested. Keeping them file-private in their new locations would force tests through the controller hook and would make behavior regressions harder to isolate.
- Do not add either helper to `src/features/landing/grid/index.ts` unless an existing consumer needs the barrel. Use exact file imports in tests and controller.

### Change sequence

1. RED: update `tests/unit/landing-desktop-shell-phase.test.ts` to import `resolveDesktopMotionRole` from `../../src/features/landing/grid/desktop-shell-phase`.
   - Run: `npm test -- tests/unit/landing-desktop-shell-phase.test.ts`
   - Expected RED before implementation: missing export for `resolveDesktopMotionRole`.
2. RED: update `tests/unit/landing-interaction-state.test.ts` to import `resolveVisualState` from `../../src/features/landing/model/interaction-state`.
   - Run: `npm test -- tests/unit/landing-interaction-state.test.ts`
   - Expected RED before implementation: missing export for `resolveVisualState`.
3. Move `LandingCardVisualState` type ownership to `interaction-state.ts`; re-export the type from `landing-grid-card.tsx` to preserve existing public imports.
   - Verify: `npm run typecheck`
   - Expected: type-only import/export surface compiles.
4. Move `resolveVisualState` implementation from the controller to `interaction-state.ts`; update the controller import and remove the local function.
   - Verify: `npm test -- tests/unit/landing-interaction-state.test.ts`
   - Expected: new visual-state tests pass, existing interaction-state reducer tests still pass.
5. Move `resolveDesktopMotionRole` implementation from the controller to `desktop-shell-phase.ts`; update the controller import and remove the local function.
   - Verify: `npm test -- tests/unit/landing-desktop-shell-phase.test.ts`
   - Expected: new motion-role tests pass, existing shell-phase tests still pass.
6. Run static contract scripts that inspect the controller surface.
   - Run: `node scripts/qa/check-phase7-state-contracts.mjs`
   - Run: `node scripts/qa/check-phase9-performance-contracts.mjs`
   - Expected: both pass without script changes.
7. Update `docs/project-analysis.md` section 5.1 after the code move is green.
   - Verify by grep: `rg -n "active visual state derivation|desktop-shell-phase|resolveVisualState" docs/project-analysis.md`

### New unit tests

**Modify `tests/unit/landing-desktop-shell-phase.test.ts`:**

- Assert `resolveDesktopMotionRole` returns `handoff-source` when `handoffSourceCardVariant` matches the card.
- Assert it returns `handoff-target` when only `handoffTargetCardVariant` matches.
- Assert it returns `opening` and `closing` for matching opening/closing variants.
- Assert it returns `steady` only when the viewport is not mobile and either `transitionExpanded` is true or the card is `EXPANDED` and enterable.
- Assert it returns `idle` for mobile viewport, non-enterable expanded card, and no matching motion markers.

**Modify `tests/unit/landing-interaction-state.test.ts`:**

- Assert `resolveVisualState` returns `expanded` for `transitionExpanded`, `desktopClosingVisible`, and `desktopCleanupPending`.
- Assert it returns `expanded` for `cardState: 'EXPANDED'` only when `cardEnterable` is true.
- Assert it returns `focused` for `cardState: 'FOCUSED'` when no expanded override is present.
- Assert it returns `normal` for `NORMAL` and for non-enterable `EXPANDED` without transition/desktop override flags.

### QA script impact

- `scripts/qa/check-phase7-state-contracts.mjs` does not reference `resolveDesktopMotionRole` or `resolveVisualState` by name.
- Relevant confirmed lines:
  - Lines 99-100 assert only `resolveCardStateForVariant` and `resolveCardTabIndex` remain visible in the controller.
  - Lines 119-120 assert `LandingCatalogGrid` still wires `resolveCardInteractionBindings` into `interactionBindings`.
- No Phase 7 script update is recommended for Candidate 1.
- `scripts/qa/_path-config.mjs` does not list `desktop-shell-phase.ts`; adding a function there does not require a path-config update.
- `scripts/qa/check-phase9-performance-contracts.mjs` only checks that the controller keeps `prefers-reduced-motion` and `useLayoutEffect`; Candidate 1 must not remove either string/behavior.

### Doc update

Current sentence in `docs/project-analysis.md` section 5.1, line 200:

> `src/features/landing/grid/use-landing-interaction-controller.ts` - **558 lines**, owns the two `useReducer` calls, capability/reduced-motion/visibility sync, per-card binding composition, active visual state derivation, and transition-start callback composition.

Proposed replacement after implementation:

> `src/features/landing/grid/use-landing-interaction-controller.ts` - owns the two `useReducer` calls, capability/reduced-motion/visibility sync, per-card binding composition, and transition-start callback composition. Pure visual projection is split out: `interaction-state.ts` derives card visual state, and `desktop-shell-phase.ts` derives desktop motion roles and shell phases.

## 2. Candidate 2 plan - Stabilize card event handler composition

### Supersession statement

The constraint at `docs/plans/2026-05-03-r02-landing-interaction-controller-refactor.md:184` (`Do not wrap event handlers or resolveCardInteractionBindings in new useCallbacks.`) is superseded by this refactoring. The supersession allows stable `useCallback` handlers for the four inline handlers currently returned from `resolveCardInteractionBindings`.

### Per-handler stabilization

Add a card lookup map inside `useLandingInteractionController`:

```ts
const cardByVariant = useMemo<ReadonlyMap<string, LandingCard>>(
  () => new Map(cards.map((card) => [card.variant, card])),
  [cards]
);
```

Add a small file-private resolver in `use-landing-interaction-controller.ts` to read the nearest card root from the event target and retrieve the current card from `cardByVariant`. The helper must not import from `landing-grid-card.tsx`; it should depend only on the rendered `data-card-variant` attribute.

#### onMobileClose

Use a stable callback because it has no card data dependency:

```ts
const handleMobileClose = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
  event.preventDefault();
  beginMobileClose();
}, [beginMobileClose]);
```

Dependency array: `[beginMobileClose]`.

#### onClick

Use a stable root handler that resolves the current card from the event target, then recomputes `cardEnterable`, `mobileInteractionLocked`, and `activationBlocked` from current closure state:

```ts
const handleCardClick = useCallback((event: ReactMouseEvent<HTMLElement>) => {
  const card = resolveInteractionCard(event.currentTarget, cardByVariant);
  if (!card) {
    return;
  }

  const cardEnterable = isEnterableCard(card);
  const isTransitioning = interactionState.pageState === 'TRANSITIONING';
  const mobileInteractionLocked =
    isMobileViewport &&
    mobileLifecycleState.phase !== 'NORMAL' &&
    (mobileLifecycleState.cardVariant !== card.variant || mobileLifecycleState.phase !== 'OPEN');
  const activationBlocked = isTransitioning || !cardEnterable || mobileInteractionLocked;

  if (activationBlocked) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  if (isMobileViewport) {
    if (mobileLifecycleState.phase === 'NORMAL' && mobileLifecycleState.cardVariant !== card.variant) {
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
}, [
  beginMobileOpen,
  cardByVariant,
  desktopTransitionReasonRef,
  interactionMode,
  interactionState.pageState,
  isMobileViewport,
  mobileLifecycleState.cardVariant,
  mobileLifecycleState.phase
]);
```

Dependency array: `[beginMobileOpen, cardByVariant, desktopTransitionReasonRef, interactionMode, interactionState.pageState, isMobileViewport, mobileLifecycleState.cardVariant, mobileLifecycleState.phase]`.

#### onAnswerChoiceSelect

Use a stable handler that resolves the current card from the answer button event target before calling the external callback:

```ts
const handleAnswerChoiceSelect = useCallback((
  choice: 'A' | 'B',
  event: ReactMouseEvent<HTMLButtonElement>
) => {
  const card = resolveInteractionCard(event.currentTarget, cardByVariant);
  if (!card || card.type !== 'test') {
    return;
  }

  const shouldBeginTransition = onAnswerChoiceSelect?.(card, choice) !== false;
  if (shouldBeginTransition) {
    beginTransition(card.variant);
  }
  event.preventDefault();
}, [beginTransition, cardByVariant, onAnswerChoiceSelect]);
```

Dependency array: `[beginTransition, cardByVariant, onAnswerChoiceSelect]`.

#### onPrimaryCtaClick

Use a stable handler that resolves the current card from the CTA link event target before calling the external callback:

```ts
const handlePrimaryCtaClick = useCallback((event: ReactMouseEvent<HTMLAnchorElement>) => {
  const card = resolveInteractionCard(event.currentTarget, cardByVariant);
  if (!card || card.type !== 'blog') {
    return;
  }

  const shouldBeginTransition = onPrimaryCtaSelect?.(card) !== false;
  if (shouldBeginTransition) {
    beginTransition(card.variant);
  }
  event.preventDefault();
}, [beginTransition, cardByVariant, onPrimaryCtaSelect]);
```

Dependency array: `[beginTransition, cardByVariant, onPrimaryCtaSelect]`.

### resolveCardInteractionBindings post-migration shape

- Keep `resolveCardInteractionBindings(card)` as a plain function inside `useLandingInteractionController`.
- It continues to assemble one binding object per card and returns the same flat `LandingCardInteractionBindings` shape.
- It should assign stable references:
  - `onClick: handleCardClick`
  - `onAnswerChoiceSelect: handleAnswerChoiceSelect`
  - `onPrimaryCtaClick: handlePrimaryCtaClick`
  - `onMobileClose: handleMobileClose`
- Do not turn `resolveCardInteractionBindings` into a hook.
- Do not change how `LandingCatalogGrid` calls it at `landing-catalog-grid.tsx:220`.
- Do not change the external prop names passed to `LandingGridCard` at `landing-catalog-grid.tsx:227-260`.

### Change sequence

1. RED: create `tests/unit/landing-interaction-controller-handlers.test.ts` with handler identity and latest-card callback assertions.
   - Run: `npm test -- tests/unit/landing-interaction-controller-handlers.test.ts`
   - Expected RED before implementation: handler identity assertions fail because current inline closures create new handler references per `resolveCardInteractionBindings(card)` call.
2. Add `cardByVariant` with `useMemo(() => new Map(cards.map(...)), [cards])` inside `useLandingInteractionController`.
   - Keep key type as `string` and value type as `LandingCard`.
3. Add the file-private event-target card resolver in `use-landing-interaction-controller.ts`.
   - Verify it reads `data-card-variant` from the nearest `[data-testid="landing-grid-card"]` root and returns `cardByVariant.get(variant) ?? null`.
4. Add `handleMobileClose` first because it has the smallest dependency surface.
   - Wire `onMobileClose: handleMobileClose` in the returned binding object.
5. Add `handleCardClick`.
   - Recompute `cardEnterable`, `mobileInteractionLocked`, and `activationBlocked` inside the callback from the current card/map and current controller state.
   - Wire `onClick: handleCardClick`.
6. Add `handleAnswerChoiceSelect` and `handlePrimaryCtaClick`.
   - Both must resolve the current card from the map before calling external callbacks.
   - Wire `onAnswerChoiceSelect: handleAnswerChoiceSelect` and `onPrimaryCtaClick: handlePrimaryCtaClick`.
7. Remove only the four old inline handler closures from `resolveCardInteractionBindings`.
   - Do not change the returned binding property names.
   - Do not change `LandingCatalogGrid` or `LandingGridCard` call/prop shapes.
8. GREEN: run focused unit and static checks.
   - `npm test -- tests/unit/landing-interaction-controller-handlers.test.ts`
   - `node scripts/qa/check-phase7-state-contracts.mjs`
   - `node scripts/qa/check-phase9-performance-contracts.mjs`
9. GREEN: run focused Playwright regressions for observable handler behavior.
   - `npx playwright test tests/e2e/state-smoke.spec.ts tests/e2e/transition-telemetry-smoke.spec.ts tests/e2e/a11y-smoke.spec.ts`

### Commit boundary

Migrate all four handlers in one coordinated implementation unit/commit.

Reason: `onClick`, `onAnswerChoiceSelect`, and `onPrimaryCtaClick` share the same `cardByVariant` map and event-target card lookup helper. Splitting them would create temporary mixed semantics and make stale-closure verification harder. `onMobileClose` is simpler but should land with the handler stabilization unit so the returned binding object has a consistent handler strategy.

### Existing test coverage

**`onClick` observable behavior:**

- `tests/e2e/transition-telemetry-smoke.spec.ts`: repeated `landing-grid-card-trigger` clicks open test/blog/mobile cards before CTA or close flows.
- `tests/e2e/routing-smoke.spec.ts:217-223`: landing blog card trigger click plus `primaryCTA` navigation.
- `tests/e2e/a11y-smoke.spec.ts:164-170`: blog card trigger click plus CTA transition overlay accessibility.
- `tests/e2e/consent-smoke.spec.ts:44-48`: helper opens a landing test card before clicking answer choice.
- `tests/e2e/theme-matrix-smoke.spec.ts:181-184`, `243-253`: desktop/mobile card expansion helpers click triggers.
- Unit coverage is indirect only: `tests/unit/landing-interaction-state.test.ts` covers reducer results after `CARD_EXPAND`/related events, but no unit test currently exercises the controller handler.

**`onAnswerChoiceSelect` observable behavior:**

- `tests/e2e/transition-telemetry-smoke.spec.ts:158-248`: answer choice starts landing test transition and records telemetry/transition signals.
- `tests/e2e/transition-telemetry-smoke.spec.ts:300-316`, `343-359`: opt-out and re-entry answer-choice ingress flows.
- `tests/e2e/consent-smoke.spec.ts:44-48`: landing answer choice ingress under consent variants.
- `tests/e2e/state-smoke.spec.ts:484-503`: reduced-motion answer choice still enters `TRANSITIONING`.
- `tests/e2e/state-smoke.spec.ts:226-259`, `375-414`: answer choices are included in keyboard traversal.
- Unit coverage is DOM/slot-only through `tests/unit/landing-card-contract.test.ts:115-140`; it does not invoke the controller handler.

**`onPrimaryCtaClick` observable behavior:**

- `tests/e2e/routing-smoke.spec.ts:211-223`: landing blog CTA routes to the selected article.
- `tests/e2e/a11y-smoke.spec.ts:159-171`: blog CTA transition overlay remains axe-clean.
- `tests/e2e/transition-telemetry-smoke.spec.ts:376-409`, `431-470`: blog CTA starts transition, preserves source GNB, and stores return-scroll context.
- `tests/e2e/state-smoke.spec.ts:505-536`: CTA cursor policy stays scoped to available landing interactions.
- `tests/e2e/state-smoke.spec.ts:538-572`: CTA hover styling does not shift geometry.
- Unit coverage is DOM/slot-only through `tests/unit/landing-card-contract.test.ts:167-197`; it does not invoke the controller handler.

**`onMobileClose` observable behavior:**

- No current E2E test directly clicks the mobile X button that receives `onMobileClose`.
- `tests/e2e/state-smoke.spec.ts:375-414` verifies the mobile close button enters the keyboard traversal order.
- `tests/e2e/transition-telemetry-smoke.spec.ts:618-699`, `701-778`, `780-819` cover mobile close lifecycle through backdrop/gesture and queue-close paths, not through the X button handler.
- `tests/unit/landing-mobile-lifecycle.test.ts:15-46`, `77-97` covers reducer close/queue/restore semantics, not the controller handler.

### New unit tests

Create `tests/unit/landing-interaction-controller-handlers.test.ts` with `// @vitest-environment jsdom`.

Add tests that were not practical while handlers were inline per-card closures:

- Handler identity stability: for unchanged `cards`, `onClick`, `onAnswerChoiceSelect`, `onPrimaryCtaClick`, and `onMobileClose` references returned by `resolveCardInteractionBindings(card)` stay identical across rerender.
- Desktop trigger behavior: invoking `onClick` from a trigger inside a card root expands the current card and uses the current card variant from the DOM/map.
- Latest-card behavior after `cards` replacement: rerender with a new card object for the same variant, invoke `onAnswerChoiceSelect`, and assert the external callback receives the updated card object.
- Latest-blog behavior after `cards` replacement: rerender with a new blog card object for the same variant, invoke `onPrimaryCtaClick`, and assert the external callback receives the updated card object.
- Mobile close behavior: after opening a mobile card through the returned trigger handler, invoke `onMobileClose` and assert the event is prevented and lifecycle state enters/queues the close path expected for the current phase.

### Stale closure analysis

**`onClick`:**

- Failure mode if stale: a clicked card could use old availability/type data, open the wrong variant, ignore a newly non-enterable card, or dispatch `CARD_EXPAND` with an old card object's variant.
- Prevention: `cardByVariant` is recreated from `[cards]`, and `handleCardClick` depends on `cardByVariant` plus all state used to compute `activationBlocked`.

**`onAnswerChoiceSelect`:**

- Failure mode if stale: the external callback could receive an old test card object, causing transition route, telemetry source variant, or ingress data to reflect stale catalog data.
- Prevention: the stable handler depends on `[beginTransition, cardByVariant, onAnswerChoiceSelect]`, so card catalog changes, callback changes, or transition callback changes replace the handler.

**`onPrimaryCtaClick`:**

- Failure mode if stale: the blog CTA could call the external transition callback with an old blog card object, causing route/article mismatch or stale return context.
- Prevention: the stable handler depends on `[beginTransition, cardByVariant, onPrimaryCtaSelect]`.

**`onMobileClose`:**

- Failure mode if stale: the X button could call an old `beginMobileClose` implementation and fail to use the current lifecycle/timer coordination.
- Prevention: the handler depends on `[beginMobileClose]`. It has no card-map dependency because it intentionally does not read card data.

### QA script impact

- Recommended plan keeps `resolveCardInteractionBindings` in the controller and keeps the `LandingCatalogGrid` call shape unchanged.
- Therefore `scripts/qa/check-phase7-state-contracts.mjs:119-120` does not change.
- If a future implementation renames or moves the resolver despite this recommendation, update line 119 from:

```js
if (!/resolveCardInteractionBindings/u.test(gridFile) || !/interactionBindings/u.test(gridFile)) {
```

to the exact new resolver identifier and binding variable used in `landing-catalog-grid.tsx`, and update the line 120 failure message to name that new contract. This plan does not recommend that path.

## 3. Candidate 3 plan - Split binding contract type ownership

### Target file decision

**Option A: new `src/features/landing/grid/landing-card-interaction-bindings.ts`**

- Recommendation: choose this.
- Reason: `LandingCardInteractionBindings` is the contract between controller binding composition and card rendering. It contains visual props, a11y props, mobile/desktop runtime props, and event handlers, so it does not belong exclusively to either the controller implementation or the card component.
- This keeps the hook file smaller without pushing orchestration details into `LandingGridCard`.

**Option B: move into `landing-grid-card.tsx`**

- Rejected.
- Reason: `LandingGridCard` is the receiver of the props, but the binding type represents controller output, not the full card prop interface. Moving it into the component would make the component own a controller-specific composition contract.

**Option C: move into `interaction-state.ts`**

- Rejected.
- Reason: the type includes DOM event handlers, desktop/mobile visual props, and card render bindings. `interaction-state.ts` should stay reducer/selector/model-focused and should not own React DOM handler contracts.

### Grouping decision

- Recommendation: flat type move, not grouped split.
- Reason: all 22 properties are pure pass-throughs in `LandingCatalogGrid`, but grouping would hide the exact prop mapping at the JSX boundary without changing downstream consumption. Since `LandingGridCard` still expects flat props, grouping only adds an intermediate shape.
- Keep the return type as `LandingCardInteractionBindings` with the same 22 flat properties.
- Do not change `LandingGridCard` prop interface names or types.

### Spread pattern analysis

Current required call shape stays:

```tsx
const interactionBindings = resolveCardInteractionBindings(card);
```

Recommended flat mapping stays explicit at `landing-catalog-grid.tsx:227-260`, for example:

```tsx
<LandingGridCard
  state={interactionBindings.state}
  mobilePhase={interactionBindings.mobilePhase}
  desktopMotionRole={interactionBindings.desktopMotionRole}
  ariaDisabled={interactionBindings.ariaDisabled}
  onClick={interactionBindings.onClick}
  onAnswerChoiceSelect={interactionBindings.onAnswerChoiceSelect}
  onPrimaryCtaClick={interactionBindings.onPrimaryCtaClick}
  onMobileClose={interactionBindings.onMobileClose}
/>
```

If D2 chooses grouped bindings, the resolver call can still remain unchanged, but the JSX would need coordinated spreads:

```tsx
const interactionBindings = resolveCardInteractionBindings(card);

<LandingGridCard
  {...interactionBindings.visualProps}
  {...interactionBindings.a11yProps}
  {...interactionBindings.handlers}
/>
```

Grouped return shape would require changing the `LandingCardInteractionBindings` return type and every `interactionBindings.*` access in `landing-catalog-grid.tsx:227-260`. This is not recommended for the current refactor because it adds indirection without changing the receiving component contract.

### Barrel export decision

- Do not add `LandingCardInteractionBindings` to `src/features/landing/grid/index.ts`.
- Reason: the type is not currently exported through the barrel, no QA script asserts on its name, and no external module consumes it. Keep it as an internal exact-path type import.

### Change sequence

1. Create `src/features/landing/grid/landing-card-interaction-bindings.ts`.
2. Move only the `LandingCardInteractionBindings` interface into that file.
3. Import it as a type in `use-landing-interaction-controller.ts`.
4. Do not modify `landing-catalog-grid.tsx` for the flat recommendation.
5. Run: `npm run typecheck`
   - Expected: no runtime diff; TypeScript validates the moved type.
6. Run: `npm test -- tests/unit/landing-card-contract.test.ts`
   - Expected: card prop/render contract remains unchanged.

### TypeScript coverage

- Current direct type references found in runtime code are inside `src/features/landing/grid/use-landing-interaction-controller.ts`.
- `tests/unit/landing-card-contract.test.ts` imports `LandingGridCard` and visual/motion types, not `LandingCardInteractionBindings`.
- `src/features/landing/grid/index.ts` does not export `LandingCardInteractionBindings`; no test imports it from the barrel.
- Primary guard for Candidate 3 is `npm run typecheck`; no test import should break under the flat type-only move.

## 4. Recommended candidate sequencing

1. Confirm D1 and D2 before implementation.
   - Reason: D1 decides whether motion role derivation lands in `desktop-shell-phase.ts`; D2 decides whether Candidate 3 remains type-only or becomes a JSX return-shape change.
2. Candidate 1: Extract pure visual derivation, test-first.
   - Reason: the pure helper exports are deterministic and low-blast-radius, and Candidate 3 can import the visual-state type from its final owner afterward.
3. Candidate 3: Move `LandingCardInteractionBindings`, flat type-only move.
   - Reason: this reduces controller type ownership before the higher-risk handler rewrite, with TypeScript as the primary guard.
4. Candidate 2: Stabilize all four handlers in one coordinated unit.
   - Reason: this is the highest-risk behavioral candidate because it changes handler identity, card lookup timing, and callback closure boundaries. It should run after helper/type ownership is settled.

Parallelism note: Candidate 1 and Candidate 3 are conceptually independent in behavior, but both touch controller imports and type surfaces. Execute sequentially in this repo to avoid avoidable merge and review complexity.

## 5. Decision points requiring confirmation

### D1: `resolveDesktopMotionRole` target

**Option 1: move to `desktop-shell-phase.ts`**

- Recommendation: choose this.
- Reason: the function derives the `motionRole` consumed by `resolveDesktopShellPhase`, and the file already owns `LandingCardDesktopMotionRole`.

**Option 2: move to a new `landing-card-visual-state.ts`**

- Reason to consider: clean separation of all visual derivation from shell phase resolution.
- Reason not recommended: it separates `motionRole` from its consuming phase resolver and likely creates a small helper whose main role is forwarding shell inputs.

### D2: binding return shape

**Option 1: keep `LandingCardInteractionBindings` flat and move only type ownership**

- Recommendation: choose this.
- Reason: preserves `LandingGridCard` prop names/types, preserves `landing-catalog-grid.tsx` explicit prop mapping, and keeps the candidate type-only.

**Option 2: split into `visualProps`, `a11yProps`, and `handlers` groups**

- Reason to consider: reduces repeated `interactionBindings.*` reads at `landing-catalog-grid.tsx:227-260`.
- Reason not recommended: adds an intermediate return shape without downstream grouped consumers, and it requires coordinated JSX changes that are not needed for correctness.

## 6. Prohibited changes checklist

- Do not change the external call shape `resolveCardInteractionBindings(card)` in `landing-catalog-grid.tsx`.
- Do not modify `LandingGridCard` prop interface names or runtime prop types; only binding type ownership changes.
- Do not change the two `useReducer` declarations or their initial states.
- Do not touch transition runtime integration, including `LANDING_TRANSITION_CLEANUP_EVENT` and `beginTransition` semantics.
- Do not modify `interaction-state.ts` reducer logic or state transitions.
- Do not modify `public/theme-bootstrap.js`.
- Do not add npm packages or any other external dependency.
- Do not modify `src/proxy.ts`, route builders, locale path helpers, or variant registry files.
- Do not update QA scripts unless implementation actually changes a static contract identifier. The recommended plan requires no QA script edits.

## 7. Risk summary

| Candidate | Risk level | Primary risk | Mitigation |
|---|---:|---|---|
| Candidate 1 - Extract pure visual derivation | Medium | Motion-role or visual-state priority changes during extraction | Add RED unit tests from the future target files before moving code; keep implementation as a direct move, not a merge or redesign; run Phase 7 and Phase 9 static checks. |
| Candidate 2 - Stabilize card event handlers | High | Stale card/callback closures or incorrect DOM-to-card lookup could break expansion, CTA transition, or mobile close behavior | Use `cardByVariant` from `[cards]`, exact handler dependency arrays, new jsdom handler tests for identity/latest-card behavior, and Playwright state/transition/a11y regressions. |
| Candidate 3 - Move binding contract type | Low | Type import churn or accidental public barrel/API change | Keep flat type shape, exact-path internal import only, no barrel export, and rely on `npm run typecheck` plus existing card contract tests. |
