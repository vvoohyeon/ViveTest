You are implementing R-08: replace the three-layer keyboard-mode blocking mechanism
(aria-disabled + tabIndex=-1 + pointerEvents:none) with the HTML `inert` attribute.

This is a scoped simplification. Do not touch hover-mode blocking, transition state
blocking, or mobile interaction locking — only the keyboard-mode hoverLock path.

Read the current state of all files before making changes.

---

## Background

Currently, when `hoverLock.keyboardMode` is true and a card is not the focused card,
three separate mechanisms block it:

1. `aria-disabled="true"` (from `isCardKeyboardAriaDisabled()`)
2. `tabIndex` stays at 0 (from `resolveCardTabIndex()` — keyboard mode keeps 0, not -1)
3. `pointerEvents: none` via `style` prop (from `isCardPointerInteractionBlocked()`)

The `inert` HTML attribute handles all three at once: it excludes the element from
the accessibility tree, prevents all keyboard focus, and blocks all pointer events.

Card-to-card Tab navigation is handled explicitly by JavaScript in
`use-card-keyboard-handler.ts`, so removing these cards from the natural tab order
via `inert` does not break keyboard navigation flow.

---

## Step 1 — Add `isKeyboardModeBlocked` to interaction-state.ts

File: `src/features/landing/model/interaction-state.ts`

Add the following exported function after `isCardKeyboardAriaDisabled`:

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

Do not remove `isCardKeyboardAriaDisabled`, `isCardPointerInteractionBlocked`,
or `resolveCardTabIndex` yet — they will be removed in Step 4 after the bindings
are updated.

---

## Step 2 — Update LandingCardInteractionBindings

File: `src/features/landing/grid/use-landing-interaction-controller.ts`

### 2-a. Add import

Add `isKeyboardModeBlocked` to the import from
`@/features/landing/model/interaction-state`.

### 2-b. Add `keyboardModeBlocked` to the return type

In the `LandingCardInteractionBindings` interface, add:

```ts
keyboardModeBlocked: boolean;
```

Keep the existing `ariaDisabled`, `tabIndex`, `interactionBlocked`, and `keyboardMode`
fields — they serve non-keyboard-mode purposes (transition state, mobile locking).

### 2-c. Compute and return the new field

Inside `resolveCardInteractionBindings`, add:

```ts
const keyboardModeBlocked = isKeyboardModeBlocked(interactionState, card.variant);
```

And include it in the returned bindings object:

```ts
keyboardModeBlocked,
```

### 2-d. Update ariaDisabled and interactionBlocked to exclude the keyboard-mode path

The existing `ariaDisabled` computation:
```ts
ariaDisabled: isTransitioning ? true : keyboardAriaDisabled || mobileInteractionLocked,
```

Change to:
```ts
ariaDisabled: isTransitioning ? true : (!cardEnterable && !mobileInteractionLocked ? true : mobileInteractionLocked),
```

Explanation: `isCardKeyboardAriaDisabled` (which contributed `keyboardAriaDisabled`)
is now handled by `inert`. The `!cardEnterable` case (unavailable cards) still needs
`aria-disabled` because those cards are always visible in the DOM and not inert.

The existing `interactionBlocked` computation:
```ts
interactionBlocked: isTransitioning ? true : pointerBlocked || mobileInteractionLocked,
```

Change to:
```ts
interactionBlocked: isTransitioning ? true : mobileInteractionLocked,
```

Explanation: `isCardPointerInteractionBlocked` (which contributed `pointerBlocked`)
is now handled by `inert`. The `style.pointerEvents` override is no longer needed
for the keyboard-mode case.

---

## Step 3 — Apply `inert` in LandingGridCard

File: `src/features/landing/grid/landing-grid-card.tsx`

### 3-a. Add `keyboardModeBlocked` to props

In `LandingGridCardProps`, add:

```ts
keyboardModeBlocked?: boolean;
```

In the destructured parameters of `LandingGridCard`, add:

```ts
keyboardModeBlocked = false,
```

### 3-b. Apply `inert` to the card root div

On the outermost `<div>` element (the one with `data-testid="landing-grid-card"`),
add the following attribute:

```tsx
inert={keyboardModeBlocked ? '' : undefined}
```

TypeScript note: `inert` is a standard HTML attribute in React 19. If the TypeScript
compiler raises an error, add `inert?: string` to the JSX intrinsic elements
declaration or cast as needed. Do not use `{...({inert: ''} as object)}` — prefer
the direct prop.

### 3-c. Pass the prop from the catalog grid

File: `src/features/landing/grid/landing-catalog-grid.tsx`

In the place where `LandingGridCard` is rendered and bindings are spread,
pass `keyboardModeBlocked={bindings.keyboardModeBlocked}`.

If bindings are spread with `{...bindings}`, verify that `keyboardModeBlocked`
is included in the spread. If the card receives props individually, add the prop
explicitly.

---

## Step 4 — Remove now-unused exports from interaction-state.ts

File: `src/features/landing/model/interaction-state.ts`

Remove the following exported functions entirely (they are replaced by
`isKeyboardModeBlocked`):
- `isCardKeyboardAriaDisabled`
- `isCardPointerInteractionBlocked`

Do NOT remove `resolveCardTabIndex` — it is still used for the hover-mode
(non-keyboard) tabIndex=-1 case.

Remove the corresponding imports of these functions from
`use-landing-interaction-controller.ts`.

---

## Step 5 — Update state-smoke.spec.ts

File: `tests/e2e/state-smoke.spec.ts`

Locate the test named:
`@smoke assertion:B5-keyboard-sequential keyboard sequential override expands...`

Find the assertion:
```ts
await expect(secondCard).toHaveAttribute('aria-disabled', 'true');
```

Replace with:
```ts
await expect(secondCard).toHaveAttribute('inert', '');
```

The `data-hover-lock-blocked` assertion on the line above it remains unchanged.

No other test file assertions need updating. `aria-disabled` in other contexts
(unavailable cards, transitioning state) is separate and remains.

---

## Step 6 — Run verification suite

Run in order:

1. `npm run typecheck`
2. `npm test`
3. `npx playwright test tests/e2e/state-smoke.spec.ts tests/e2e/a11y-smoke.spec.ts`

Report pass/fail for each. If `a11y-smoke.spec.ts` passes without axe violations
in all states (including the keyboard-expanded state), R-08 is confirmed safe.

If `state-smoke.spec.ts` fails on any assertion other than the one updated in
Step 5, report the exact failure — do not auto-fix.

---

## Constraints

- Do not modify `use-keyboard-handoff.ts` or any of the three R-03 modules.
- Do not modify `interaction-state.ts` reducer cases — only add/remove exported
  helper functions.
- Do not add `aria-disabled` to unavailable card overlays — those already render
  with `pointer-events: none` via their own CSS class and are visually inert.
- Do not apply `inert` to transitioning state or mobile-locked state — those
  remain under the existing `ariaDisabled`/`tabIndex` path.
- `resolveCardTabIndex` must remain and continue to handle the hover-mode
  (keyboardMode=false) tabIndex=-1 case.
- The `inert` attribute value must be the empty string `''` (not `true` or `"true"`).
  HTML boolean attributes require an empty string value in React.

---

## Verification checklist

After all changes, confirm:

1. `isKeyboardModeBlocked` is exported from `interaction-state.ts`.
2. `isCardKeyboardAriaDisabled` and `isCardPointerInteractionBlocked` no longer exist.
3. `LandingGridCard` root div receives `inert=''` when `keyboardModeBlocked` is true.
4. `state-smoke.spec.ts` asserts `inert=''` (not `aria-disabled`) on the blocked card.
5. `npm run typecheck` passes.
6. `npm test` passes.
7. `tests/e2e/state-smoke.spec.ts` passes all tests.
8. `tests/e2e/a11y-smoke.spec.ts` passes all axe-clean assertions.
