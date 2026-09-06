# R-08 Keyboard HoverLock Inert Refactor Plan

> Status: planning update only. Do not implement until the user explicitly approves execution.

## Goal

Replace the keyboard-mode `hoverLock` non-target blocking path with the HTML `inert`
attribute while preserving keyboard sequential handoff, hover-mode blocking,
transition blocking, and mobile interaction locking contracts.

This remains a scoped simplification, but the original plan's focus assumption is
invalid: explicit JavaScript `.focus()` does not bypass `inert`. Keyboard handoff
must therefore update state first, let React remove `inert` from the next target,
and only then queue focus to that next card.

## Relevant SSOT Contract

- `docs/req-landing.md §7.5 HOVER_LOCK Contract`
- `docs/req-landing.md §7.6 Keyboard Sequential Expansion Override`
- `docs/req-landing.md §9 Accessibility Requirements`
- `docs/project-analysis.md §5.1 Landing Interaction Runtime`
- `docs/agent-guides/verification-commands.md §landing`

## Impact Assessment

- Shared components: landing grid/card interaction bindings only. GNB behavior must
  remain unchanged except for existing keyboard entry/return flows.
- Localization: no message or locale data changes expected.
- A11y: keyboard-mode non-target cards move from `aria-disabled` active-blocking to
  `inert` focus/accessibility-tree blocking. `aria-disabled` remains for unavailable
  cards, transition state, and mobile lock paths where applicable.
- State contracts: `hoverLock.keyboardMode` remains the source of keyboard-mode
  non-target blocking. `resolveCardTabIndex()` remains for hover-mode
  `keyboardMode=false` non-target `tabIndex=-1`.
- Core user flow: card-to-card Tab/Shift+Tab traversal must still move through
  expanded internals, collapse the previous card, expand the target card, and focus
  the target trigger after `inert` has been removed.
- High-risk dimension: usability and a11y. The implementation must include
  Playwright regression coverage for keyboard handoff and axe-clean landing states.

## Files To Modify

- `src/features/landing/model/interaction-state.ts`
  - Add `isKeyboardModeBlocked()`.
  - Remove `isCardKeyboardAriaDisabled()` and `isCardPointerInteractionBlocked()`
    after controller/test bindings are migrated.
  - Keep reducer cases unchanged.
  - Keep `resolveCardTabIndex()`.
- `src/features/landing/model/index.ts`
  - Export `isKeyboardModeBlocked`.
  - Remove exports for removed helper functions.
- `tests/unit/landing-interaction-state.test.ts`
  - Add/update test coverage for `isKeyboardModeBlocked()`.
  - Remove imports/assertions for removed helper functions.
  - Keep coverage for keyboard-mode tab policy and hover-mode `tabIndex=-1`.
- `src/features/landing/grid/use-landing-interaction-controller.ts`
  - Import and compute `keyboardModeBlocked`.
  - Add `keyboardModeBlocked` to `LandingCardInteractionBindings`.
  - Simplify `ariaDisabled` to:

    ```ts
    ariaDisabled: isTransitioning ? true : !cardEnterable || mobileInteractionLocked,
    ```

  - Remove keyboard-mode pointer blocking from `interactionBlocked`:

    ```ts
    interactionBlocked: isTransitioning ? true : mobileInteractionLocked,
    ```

  - Pass enough enterability information into keyboard handoff so a target card can
    be made current before queued focus.
- `src/features/landing/grid/landing-grid-card.tsx`
  - Add `keyboardModeBlocked?: boolean`.
  - Apply React's boolean inert prop on the root card:

    ```tsx
    inert={keyboardModeBlocked}
    ```

  - Preserve the QA/debug marker for keyboard hoverLock blocking:

    ```tsx
    data-hover-lock-blocked={interactionBlocked || keyboardModeBlocked ? 'true' : 'false'}
    ```

  - Keep pointer-events style controlled only by `interactionBlocked`:

    ```ts
    pointerEvents: interactionBlocked ? 'none' : 'auto'
    ```

- `src/features/landing/grid/landing-catalog-grid.tsx`
  - Pass `keyboardModeBlocked={interactionBindings.keyboardModeBlocked}` to
    `LandingGridCard`.
- `src/features/landing/grid/use-card-keyboard-handler.ts`
  - Narrowly adjust card-to-card keyboard handoff so next/previous card focus is
    state-first and queued, not immediate focus into an inert subtree.
  - Do not broadly redesign the keyboard module.
- `src/features/landing/grid/use-keyboard-handoff.ts`
  - Only update type plumbing needed by `use-card-keyboard-handler.ts`.
  - Keep this file a thin composition layer.
- `src/features/landing/grid/interaction-dom.ts`
  - Only adjust focus helpers if needed for inert-compatible queued focus.
  - Prefer using the existing queued focus pattern over introducing a new runtime.
- `tests/e2e/state-smoke.spec.ts`
  - Update the keyboard sequential assertion from `aria-disabled="true"` to
    `inert=""` for the blocked non-target card.
  - Keep the `data-hover-lock-blocked="true"` assertion.
  - Existing focus progression assertions must continue to prove the queued handoff.
- `docs/req-landing.md`
  - Synchronize §7.5 and §9.2 so keyboard-mode non-target blocking is documented as
    `inert`, not `aria-disabled`.
  - Document the state-first, queued-focus handoff contract.
- `docs/project-analysis.md`
  - Inspect after implementation. Update only if the runtime ownership or structure
    description becomes stale.

## Files Not To Modify

- Do not modify hover-mode blocking behavior.
- Do not modify transition state blocking behavior.
- Do not modify mobile interaction locking behavior.
- Do not modify reducer cases in `interaction-state.ts`.
- Do not add packages.
- Do not broadly refactor the R-03 keyboard modules.

## Approved Scope Clarification

Narrow changes to `use-card-keyboard-handler.ts`, `use-keyboard-handoff.ts`, and
`interaction-dom.ts` are approved only when needed to make keyboard handoff
compatible with `inert`.

Do not stop merely because those files need narrow changes. Stop only if the fix
requires broad R-03 redesign, hover-mode blocking changes, transition/mobile
locking changes, new packages, or unrelated behavior changes.

## Implementation Plan

### Step 1 - Write/update the failing unit contract first

File: `tests/unit/landing-interaction-state.test.ts`

- Replace imports of `isCardKeyboardAriaDisabled` and
  `isCardPointerInteractionBlocked` with `isKeyboardModeBlocked`.
- In the keyboard-mode non-target test, assert:

  ```ts
  expect(isKeyboardModeBlocked(hoverLocked, 'rhythm-b')).toBe(true);
  expect(resolveCardTabIndex(hoverLocked, 'rhythm-b')).toBe(0);
  ```

- In the keyboard-mode exit test, assert:

  ```ts
  expect(isKeyboardModeBlocked(state, 'rhythm-b')).toBe(false);
  expect(resolveCardTabIndex(state, 'rhythm-b')).toBe(-1);
  ```

- In the pointer hover-lock test, assert:

  ```ts
  expect(isKeyboardModeBlocked(state, 'rhythm-b')).toBe(false);
  ```

Expected before implementation: targeted unit run fails because
`isKeyboardModeBlocked` does not exist.

### Step 2 - Add the model helper and export update

Files:
- `src/features/landing/model/interaction-state.ts`
- `src/features/landing/model/index.ts`

Add to `interaction-state.ts`:

```ts
export function isKeyboardModeBlocked(
  state: LandingInteractionState,
  cardVariant: string
): boolean {
  if (!state.hoverLock.enabled || !state.hoverLock.keyboardMode) {
    return false;
  }

  return state.hoverLock.cardVariant !== cardVariant;
}
```

Keep `isCardKeyboardAriaDisabled()` and `isCardPointerInteractionBlocked()` until
the controller migration is complete, then remove them and their public exports.
Do not remove `resolveCardTabIndex()`.

### Step 3 - Migrate controller bindings

File: `src/features/landing/grid/use-landing-interaction-controller.ts`

- Import `isKeyboardModeBlocked`.
- Add `keyboardModeBlocked: boolean` to `LandingCardInteractionBindings`.
- Compute:

  ```ts
  const keyboardModeBlocked = isKeyboardModeBlocked(interactionState, card.variant);
  ```

- Return `keyboardModeBlocked`.
- Replace `ariaDisabled` with:

  ```ts
  ariaDisabled: isTransitioning ? true : !cardEnterable || mobileInteractionLocked,
  ```

- Replace `interactionBlocked` with:

  ```ts
  interactionBlocked: isTransitioning ? true : mobileInteractionLocked,
  ```

- Remove `pointerBlocked` and the removed helper imports once no longer used.
- Keep click/key activation guards for unavailable cards. Do not recreate the
  keyboard-mode `aria-disabled` path.
- Provide keyboard handoff with a narrow way to determine whether an adjacent card
  variant is enterable, so the target `CARD_FOCUS` event can be dispatched before
  queued focus.

### Step 4 - Make keyboard handoff inert-compatible

Files, only as needed:
- `src/features/landing/grid/use-card-keyboard-handler.ts`
- `src/features/landing/grid/use-keyboard-handoff.ts`
- `src/features/landing/grid/interaction-dom.ts`

Required behavior:

1. When Tab/Shift+Tab handoff targets another card, do not call `.focus()` on that
   target immediately while it may still be inert.
2. Dispatch the target card focus state first:

   ```ts
   dispatch({
     type: 'CARD_FOCUS',
     nowMs: event.timeStamp,
     interactionMode,
     cardVariant: targetCardVariant,
     available: isTargetCardEnterable
   });
   ```

3. Queue focus after React can render the updated `hoverLock.cardVariant` and remove
   `inert` from the target:

   ```ts
   queueFocusCardByVariant(shellRef.current, targetCardVariant);
   ```

4. Keep immediate focus only for elements that are already inside the current,
   non-inert active card.
5. Preserve mobile keyboard handoff behavior and reverse GNB focus behavior.

Do not turn this into a broad R-03 keyboard module redesign. If this requires more
than narrow type plumbing plus state-first queued focus, stop and report the exact
reason.

### Step 5 - Apply inert and separate marker from pointer blocking

Files:
- `src/features/landing/grid/landing-grid-card.tsx`
- `src/features/landing/grid/landing-catalog-grid.tsx`

In `LandingGridCard`:

- Add `keyboardModeBlocked?: boolean`.
- Default it to `false`.
- On the root card element, use:

  ```tsx
  inert={keyboardModeBlocked}
  ```

- Keep rendered tests asserting the HTML attribute as `inert=""`.
- Compute the QA/debug marker from both blocking channels:

  ```tsx
  data-hover-lock-blocked={interactionBlocked || keyboardModeBlocked ? 'true' : 'false'}
  ```

- Keep pointer events tied only to non-keyboard interaction blocking:

  ```ts
  pointerEvents: interactionBlocked ? 'none' : 'auto'
  ```

In `LandingCatalogGrid`, pass:

```tsx
keyboardModeBlocked={interactionBindings.keyboardModeBlocked}
```

### Step 6 - Remove replaced helpers

Files:
- `src/features/landing/model/interaction-state.ts`
- `src/features/landing/model/index.ts`
- `src/features/landing/grid/use-landing-interaction-controller.ts`
- `tests/unit/landing-interaction-state.test.ts`

Remove:

- `isCardKeyboardAriaDisabled`
- `isCardPointerInteractionBlocked`

Keep:

- `isKeyboardModeBlocked`
- `resolveCardTabIndex`

Search the repo for removed helper names and ensure no references remain.

### Step 7 - Update E2E assertions

File: `tests/e2e/state-smoke.spec.ts`

In the test named:

```ts
@smoke assertion:B5-keyboard-sequential keyboard sequential override expands...
```

Replace:

```ts
await expect(secondCard).toHaveAttribute('aria-disabled', 'true');
```

With:

```ts
await expect(secondCard).toHaveAttribute('inert', '');
```

Keep:

```ts
await expect(secondCard).toHaveAttribute('data-hover-lock-blocked', 'true');
```

The later focus assertions must remain. They prove that state-first queued focus
removed `inert` from the next target before focusing it.

### Step 8 - Synchronize docs

Files:
- `docs/req-landing.md`
- `docs/project-analysis.md` only if needed

Update `docs/req-landing.md`:

- §7.5: replace the keyboard-mode rule that says non-target cards allow Tab focus
  with `aria-disabled=true`. The new rule must say keyboard-mode non-target cards
  are blocked with `inert`, and card-to-card keyboard handoff must update
  hoverLock/focused-card state first, then queue focus after React removes `inert`
  from the target.
- §7.5 verification: replace `aria-disabled` verification with `inert` plus queued
  handoff verification.
- §9.2: keep `aria-disabled` rules for cases that still use it, but remove
  HOVER_LOCK keyboard-mode non-target cards from the `aria-disabled` contract.

Inspect `docs/project-analysis.md` after implementation. Update only if the
runtime structure or ownership description becomes stale.

## Verification Plan

Do not run these during planning. During implementation, run in this order.

### Focused red/green checks

```bash
npm test -- tests/unit/landing-interaction-state.test.ts
npx playwright test tests/e2e/state-smoke.spec.ts tests/e2e/a11y-smoke.spec.ts
```

### Basic gates

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

### Landing scope checks

```bash
node scripts/qa/check-phase4-grid-contracts.mjs
node scripts/qa/check-phase5-card-contracts.mjs
node scripts/qa/check-phase6-spacing-contracts.mjs
node scripts/qa/check-phase7-state-contracts.mjs
node scripts/qa/check-phase8-accessibility-contracts.mjs
node scripts/qa/check-phase9-performance-contracts.mjs
node scripts/qa/check-phase10-transition-contracts.mjs
npm test -- \
  tests/unit/landing-interaction-state.test.ts \
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
  tests/unit/gnb-theme-transition.test.ts
npx playwright test \
  tests/e2e/grid-smoke.spec.ts \
  tests/e2e/state-smoke.spec.ts \
  tests/e2e/gnb-smoke.spec.ts \
  tests/e2e/a11y-smoke.spec.ts
```

Report pass/fail per command. If Playwright fails outside the expected changed
assertion path, report the exact failure before fixing.

## Stop Conditions

Stop and ask before continuing if implementation requires any of the following:

- Broad R-03 keyboard module redesign beyond narrow inert-compatible handoff
  changes.
- Changes to hover-mode blocking behavior.
- Changes to transition state blocking behavior.
- Changes to mobile interaction locking behavior.
- New packages or external dependencies.
- Unrelated behavior changes or adjacent refactors.
- Modifying files outside the affected file list above, except for a directly
  required documentation sync already listed in this plan.

Do not stop merely because `use-card-keyboard-handler.ts`,
`use-keyboard-handoff.ts`, or `interaction-dom.ts` need narrow changes for the
state-first queued-focus handoff. That is approved R-08 scope.

## Completion Checklist

- [ ] `isKeyboardModeBlocked` exists and is exported through the model barrel.
- [ ] `isCardKeyboardAriaDisabled` and `isCardPointerInteractionBlocked` no
      longer exist.
- [ ] Unit tests cover `isKeyboardModeBlocked`.
- [ ] Controller returns `keyboardModeBlocked`.
- [ ] `ariaDisabled` is `isTransitioning ? true : !cardEnterable || mobileInteractionLocked`.
- [ ] `interactionBlocked` no longer includes keyboard-mode hoverLock blocking.
- [ ] `LandingGridCard` uses `inert={keyboardModeBlocked}`.
- [ ] `data-hover-lock-blocked` remains true for keyboard-mode blocked cards.
- [ ] `pointerEvents` style uses `interactionBlocked` only.
- [ ] Keyboard handoff dispatches target focus state before queued target focus.
- [ ] `state-smoke.spec.ts` asserts `inert=""` and still proves card-to-card focus.
- [ ] `docs/req-landing.md` reflects the new keyboard-mode inert contract.
- [ ] `docs/project-analysis.md` was inspected and updated only if stale.
- [ ] Basic gates pass.
- [ ] Landing scope checks pass.
