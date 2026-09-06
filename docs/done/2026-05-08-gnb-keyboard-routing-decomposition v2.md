## Goal

Implement the GNB keyboard routing decomposition in exactly five sequential steps. The goal is to extract the keyboard routing layer from `src/features/gnb/site-gnb.tsx` into focused, independently testable units while preserving every observable keyboard and focus behavioral contract.

Implement one step at a time. Run verification commands after each step before proceeding. If any verification command fails, follow the rollback condition for that step and stop.

---

## Behavioral Contracts (Must Not Change)

The following behaviors must produce identical results before and after all five steps. These are your ground truth — if any fails at any point, stop and rollback.

1. Landing — first body Tab → first available landing card trigger receives focus (not GNB).
2. Landing — Shift+Tab from first card trigger → `gnb-settings-trigger` (desktop) or `gnb-mobile-menu-trigger` (mobile) receives focus.
3. Landing — Tab past last GNB control in `gnb` entry mode → first available landing card trigger receives focus. Skip triggers that: have `aria-disabled="true"`, or are inside an `inert` subtree (e.g. the card root has `inert`). Triggers that match the selector but whose ancestor has `inert` must also be skipped.
4. Destination (blog / history / test) — first Tab → `gnb-ci-link` → desktop nav links → `gnb-settings-trigger`.
5. Settings panel open → Tab stays within settings panel + GNB; Tab past last settings control loops to `gnb-settings-trigger`.
6. Mobile menu open → Tab stays within mobile menu; Shift+Tab from first menu item → `gnb-mobile-menu-trigger`.
7. Escape closes settings or mobile menu without moving focus to document body.
8. `wheel` event must NOT exit keyboard mode (per `docs/req-landing.md §7.5`). This is currently satisfied because `useGnbKeyboardModeTracker` remains unwired. Do not wire it in this implementation.

---

## C-6 Disposition: Option B (Deferred Wiring)

`useGnbKeyboardModeTracker` in `src/features/gnb/hooks/use-keyboard-mode-tracker.ts` is NOT wired in this implementation. Its `wheel → isKeyboardMode: false` behavior conflicts with §7.5.

Action required in Step 1 only: add this exact comment to the top of the hook function body (not file top, not JSDoc):

```ts
// TODO: wire after §7.5 compliance review — wheel listener must be removed first
```

No other changes to this file.

---

## Files to Create

- `src/features/gnb/gnb-keyboard-dom.ts`
- `src/features/gnb/hooks/use-landing-gnb-entry-mode.ts`
- `src/features/gnb/hooks/use-gnb-keyboard-targets.ts`
- `src/features/gnb/hooks/use-gnb-tab-routing.ts`
- `tests/unit/gnb-keyboard-dom.test.ts`
- `tests/unit/gnb-landing-entry-mode.test.ts`
- `tests/unit/gnb-keyboard-targets.test.ts`
- `tests/unit/gnb-tab-routing.test.ts`

## Files to Modify

- `src/features/gnb/site-gnb.tsx`
- `src/features/gnb/hooks/use-keyboard-mode-tracker.ts` (comment only)
- `src/features/landing/grid/interaction-dom.ts`
- `tests/unit/landing-interaction-dom.test.ts`
- `docs/project-analysis.md`
- `docs/req-landing.md` (§9.2 required; §5.2 and §9 as specified below)

## Prohibited Changes

- `public/theme-bootstrap.js`
- `src/features/gnb/hooks/use-gnb-desktop-settings.ts`
- `src/features/gnb/hooks/use-gnb-mobile-menu.ts`
- `src/features/gnb/hooks/use-gnb-back-navigation.ts`
- `src/features/gnb/hooks/use-theme-preference.ts`
- `src/features/gnb/components/settings-controls.tsx`
- `src/features/gnb/components/theme-mode-icon.tsx`
- Locale switching logic, theme transition logic, Escape close handler, any file under `src/features/test/domain/`
- Screenshot PNG baselines or provenance records
- `scripts/qa/_path-config.mjs` and all `scripts/qa/check-phase*.mjs` files

---

## Step 1 — Fix C-5: Extract `focusFirstLandingCardTrigger` with Corrected Selector

### New file: `src/features/gnb/gnb-keyboard-dom.ts`

Export only the following:

```ts
export const LANDING_CARD_TRIGGER_SELECTOR =
  '[data-testid="landing-grid-card-trigger"]:not([aria-disabled="true"])';

export function focusFirstLandingCardTrigger(options?: {root?: ParentNode}): boolean
```

Implementation requirements:

- Use `(options?.root ?? document).querySelectorAll(LANDING_CARD_TRIGGER_SELECTOR)` to get all candidates.
- For each candidate, additionally call `candidate.closest('[inert]')` — if this returns non-null, the candidate is inside an inert subtree (e.g., the card root has `inert`) and must be skipped. This guard is required because R-09 places `inert` on the card root element, not the trigger element itself. The `:not([inert])` attribute selector alone will not catch this case.
- Skip candidates where `isVisibleFocusableElement(candidate)` returns false. Import this from `src/features/landing/grid/interaction-dom.ts` — do NOT pass `{excludeDisabled: true}` here since landing card triggers are not disabled controls.
- Call `.focus()` on the first passing candidate and return `true`. If no candidate passes, return `false` without calling `.focus()`.
- Guard against SSR: if `typeof document === 'undefined'`, return `false` immediately.
- Silent failure is correct. Do not throw.

### Modify: `src/features/gnb/site-gnb.tsx`

- Remove the inline `focusFirstLandingCardTrigger` function.
- Import `focusFirstLandingCardTrigger` from `../gnb-keyboard-dom`.
- All call sites in `routeKeyboardWithinGnb` and the document-level Tab effect must remain unchanged in behavior.

### Modify: `src/features/gnb/hooks/use-keyboard-mode-tracker.ts`

Add the TODO comment as specified in C-6 disposition. No other changes.

### New file: `tests/unit/gnb-keyboard-dom.test.ts`

Use `@vitest-environment jsdom`. Test cases:

- `focuses the first visible trigger that is neither inert nor aria-disabled`
- `skips a trigger inside an inert card root and focuses the next eligible trigger` — mount a fixture where the first card root has `inert` attribute but the trigger itself does not; verify the second card's trigger is focused
- `skips a trigger with aria-disabled="true"`
- `returns false when all triggers are hidden, inside inert subtrees, or aria-disabled`
- `returns false without throwing when document is unavailable` — stub `global.document` as undefined

Mock strategy: `document.body.innerHTML` with `<article data-testid="landing-grid-card" ...>` structure matching current `landing-grid-card.tsx` — `inert` on the card root, trigger as a descendant button. Assert `document.activeElement`.

### Verification

```bash
npm run test -- gnb-keyboard-dom landing-interaction-dom
npx playwright test gnb-smoke --project=chromium
```

Confirm `gnb-smoke.spec.ts` lines 592-601 and 802-808 remain green.

Rollback: if `gnb-smoke` fails, restore the inline function with the corrected selector and ancestor-inert guard; if failure persists, revert Step 1 fully.

---

## Step 2 — Resolve C-1: Extend `isVisibleFocusableElement` with `excludeDisabled` Option

### Modify: `src/features/landing/grid/interaction-dom.ts`

Change the signature:

```ts
interface IsVisibleFocusableElementOptions {
  excludeDisabled?: boolean;
}

export function isVisibleFocusableElement(
  element: HTMLElement | null,
  options: IsVisibleFocusableElementOptions = {}
): element is HTMLElement
```

Implementation: after the existing hidden/aria-hidden/computedStyle checks, if `options.excludeDisabled === true`, additionally return `false` when `element.hasAttribute('disabled')` or `element.getAttribute('aria-disabled') === 'true'`.

Default is `excludeDisabled: false`, which preserves existing landing-grid behavior exactly. No existing call site needs updating.

### Modify: `src/features/gnb/gnb-keyboard-dom.ts`

Add a GNB-specific wrapper:

```ts
import {isVisibleFocusableElement} from '@/features/landing/grid/interaction-dom';

export function isVisibleFocusableGnbElement(element: HTMLElement | null): element is HTMLElement {
  return isVisibleFocusableElement(element, {excludeDisabled: true});
}
```

### Modify: `src/features/gnb/site-gnb.tsx`

- Remove the local module-level `isVisibleFocusableElement` function (lines 73–84).
- Import and use `isVisibleFocusableGnbElement` from `../gnb-keyboard-dom` in the inline `getOrderedKeyboardTargets` resolver (which will be removed in Step 4, but must work correctly until then).

### Modify: `tests/unit/landing-interaction-dom.test.ts`

In the existing `'detects visible focusable elements'` test, add:

- A disabled button `isVisibleFocusableElement(disabledButton)` returns `true` (default behavior preserved)
- The same disabled button `isVisibleFocusableElement(disabledButton, {excludeDisabled: true})` returns `false`

### Verification

```bash
npm run test -- landing-interaction-dom gnb-keyboard-dom
```

All existing assertions must remain green. Two new disabled assertions must be green.

Rollback: if existing landing tests fail, revert only the `interaction-dom.ts` signature change and the `landing-interaction-dom.test.ts` edits. Use a temporary GNB-local `isVisibleFocusableGnbElement` copy in `gnb-keyboard-dom.ts` instead.

---

## Step 3 — Extract C-4: `useLandingGnbEntryMode`

### New file: `src/features/gnb/hooks/use-landing-gnb-entry-mode.ts`

```ts
'use client';

import type {RefObject} from 'react';
import type {MobileMenuState} from '@/features/gnb/types';

export type LandingKeyboardEntryMode = 'card-first' | 'gnb';

interface UseLandingGnbEntryModeInput {
  isLandingContext: boolean;
  gnbShellRef: RefObject<HTMLElement | null>;
  mobileMenuPanelId: string;
  settingsOpen: boolean;
  mobileMenuState: MobileMenuState;
}

interface UseLandingGnbEntryModeOutput {
  landingKeyboardEntryMode: LandingKeyboardEntryMode;
  shouldDeferLandingGnbEntry: boolean;
  desktopLandingTabIndex: -1 | undefined;
  mobileLandingTabIndex: -1 | undefined;
}

export function useLandingGnbEntryMode(input: UseLandingGnbEntryModeInput): UseLandingGnbEntryModeOutput
```

Implementation requirements:

- Extract `isWithinInteractiveGnb` as a private function inside this file (not in `gnb-keyboard-dom.ts`). Keep its selector unchanged: `'a[href], button, [data-testid="gnb-settings-panel"], [data-testid="gnb-mobile-menu-panel"]'`.
- The `useState` and single `useEffect` with `focusin` + `pointerdown` listeners must be moved verbatim into this hook.
- `shouldDeferLandingGnbEntry` is `isLandingContext && !settingsOpen && mobileMenuState === 'closed' && landingKeyboardEntryMode === 'card-first'`. Derive this value inside the hook, not in `site-gnb.tsx`.
- `desktopLandingTabIndex` and `mobileLandingTabIndex` are derived from `shouldDeferLandingGnbEntry` — return `-1` when deferring, `undefined` otherwise.

### Modify: `src/features/gnb/site-gnb.tsx`

Remove:
- Local `LandingKeyboardEntryMode` type
- Local `useState` for `landingKeyboardEntryMode`
- Inline `shouldDeferLandingGnbEntry`, `desktopLandingTabIndex`, `mobileLandingTabIndex`
- Inline `isWithinInteractiveGnb` function
- The `useEffect` containing `focusin` and `pointerdown` handlers

Replace with:
```ts
const {
  landingKeyboardEntryMode,
  shouldDeferLandingGnbEntry,
  desktopLandingTabIndex,
  mobileLandingTabIndex,
} = useLandingGnbEntryMode({
  isLandingContext,
  gnbShellRef,
  mobileMenuPanelId,
  settingsOpen,
  mobileMenuState,
});
```

### New file: `tests/unit/gnb-landing-entry-mode.test.ts`

Use `@vitest-environment jsdom` and `renderHook` from `@testing-library/react`. Test cases:

- `starts landing context in card-first mode and defers GNB tab indexes to -1`
- `starts non-landing context in gnb mode with tab indexes undefined`
- `focusin inside the desktop GNB switches entry mode to gnb`
- `focusin inside the mobile menu panel switches entry mode to gnb`
- `focusin outside interactive GNB switches entry mode to card-first`
- `pointerdown outside interactive GNB resets entry mode to card-first`
- `pointerdown inside interactive GNB does not reset entry mode`
- `open settings causes shouldDeferLandingGnbEntry to be false`
- `open or closing mobile menu causes shouldDeferLandingGnbEntry to be false`
- `removes focusin and pointerdown listeners on unmount`

Mock: create a real `<header>` element, assign to `gnbShellRef.current`. Create a `<div id="{mobileMenuPanelId}">`. Dispatch `new FocusEvent('focusin', {bubbles: true})` and `new PointerEvent('pointerdown', {bubbles: true})`.

### Verification

```bash
npm run test -- gnb-landing-entry-mode
npx playwright test gnb-smoke state-smoke --project=chromium
```

Confirm `gnb-smoke.spec.ts` lines 553-622 and 741-809 remain green.

Rollback: if `gnb-smoke` or `state-smoke` fails after unit tests pass, restore the original inline state/effect block in `site-gnb.tsx` and stop before Step 4.

---

## Step 4 — Extract C-2: `useGnbKeyboardTargets`

### New file: `src/features/gnb/hooks/use-gnb-keyboard-targets.ts`

```ts
'use client';

import type {RefObject} from 'react';
import type {MobileMenuState} from '@/features/gnb/types';

interface UseGnbKeyboardTargetsInput {
  settingsPanelId: string;
  mobileMenuPanelId: string;
  settingsOpen: boolean;
  mobileMenuState: MobileMenuState;
  mobileMenuTriggerRef: RefObject<HTMLButtonElement | null>;
}

interface UseGnbKeyboardTargetsOutput {
  getOrderedKeyboardTargets: () => HTMLElement[];
}

export function useGnbKeyboardTargets(input: UseGnbKeyboardTargetsInput): UseGnbKeyboardTargetsOutput
```

Implementation requirements:

- `getOrderedKeyboardTargets` must be a stable `useCallback`. Its dependency array should include `settingsOpen`, `mobileMenuState`, `settingsPanelId`, `mobileMenuPanelId`, and `mobileMenuTriggerRef` (as a ref, so the ref object is stable but its `.current` is read inside the callback at call time).
- Use `isVisibleFocusableGnbElement` from `../gnb-keyboard-dom.ts` to filter all candidates. This excludes `disabled` controls (current locale/theme buttons that are active selection).
- Panel exclusion: when building top-level container targets (`.gnb-desktop`, `.gnb-mobile`), exclude elements that are descendants of `settingsPanel` or `mobilePanel` using `.closest('[data-testid="gnb-settings-panel"], [data-testid="gnb-mobile-menu-panel"]')`.
- GNB target selector: `'a[href], button'` — unchanged from current behavior.
- No inert-specific selector update needed here; this hook resolves GNB and panel controls, not landing card triggers.

### Modify: `src/features/gnb/site-gnb.tsx`

Remove inline `getOrderedKeyboardTargets`, `getTopLevelTargets`, and `getPanelTargets`.

Replace with:
```ts
const {getOrderedKeyboardTargets} = useGnbKeyboardTargets({
  settingsPanelId,
  mobileMenuPanelId,
  settingsOpen,
  mobileMenuState,
  mobileMenuTriggerRef,
});
```

The inline `routeKeyboardWithinGnb` and document Tab effect still call `getOrderedKeyboardTargets()` — they remain in `site-gnb.tsx` until Step 5.

### New file: `tests/unit/gnb-keyboard-targets.test.ts`

Use `@vitest-environment jsdom` and `renderHook`. Test cases:

- `desktop closed returns visible desktop CI, nav links, and settings trigger only`
- `desktop settings open appends enabled settings panel controls after top-level targets`
- `desktop closed excludes settings panel descendants from top-level targets`
- `mobile closed returns visible mobile CI/back and menu trigger only`
- `mobile menu open returns mobile menu trigger followed by panel links and enabled controls`
- `hidden desktop container falls back to mobile targets`
- `disabled current locale and theme buttons are excluded`
- `aria-hidden and CSS-hidden panels are excluded`

Mock: `document.body.innerHTML` with `.gnb-desktop`, `.gnb-mobile`, settings panel div with `data-testid="gnb-settings-panel"`, mobile panel div with `data-testid="gnb-mobile-menu-panel"`. Assert returned elements by `textContent` or `dataset.testid`.

### Verification

```bash
npm run test -- gnb-keyboard-targets
npx playwright test gnb-smoke --project=chromium
```

Confirm `gnb-smoke.spec.ts` lines 553-701 and 741-948 remain green.

Rollback: if `gnb-smoke` fails, restore the inline resolver in `site-gnb.tsx` and stop before Step 5.

---

## Step 5 — Extract C-3: `useGnbTabRouting`

### New file: `src/features/gnb/hooks/use-gnb-tab-routing.ts`

```ts
'use client';

import type {KeyboardEvent as ReactKeyboardEvent} from 'react';
import type {LandingKeyboardEntryMode} from '@/features/gnb/hooks/use-landing-gnb-entry-mode';

interface UseGnbTabRoutingInput {
  getOrderedKeyboardTargets: () => HTMLElement[];
  isLandingContext: boolean;
  shouldDeferLandingGnbEntry: boolean;
  landingKeyboardEntryMode: LandingKeyboardEntryMode;
  settingsOpen: boolean;
  closeSettingsImmediate: () => void;
  focusFirstLandingCardTrigger: () => boolean;
}

interface UseGnbTabRoutingOutput {
  handleGnbKeyDownCapture: (event: ReactKeyboardEvent<HTMLElement>) => void;
}

export function useGnbTabRouting(input: UseGnbTabRoutingInput): UseGnbTabRoutingOutput
```

### Implementation — ref-based mutable value mirroring (required)

All input values that change over the component lifetime must be mirrored into a single `useRef` so the document-level capture listener is registered exactly once and reads the latest values without re-registration:

```ts
const inputRef = useRef(input);
useEffect(() => {
  inputRef.current = input;
});
```

The document-level `keydown` capture listener reads only from `inputRef.current`. Its `useEffect` has an empty dependency array `[]`.

### Implementation — two separate responsibilities

**Responsibility 1: intra-GNB Tab routing (JSX handler)**

`handleGnbKeyDownCapture` is returned for use as a React `onKeyDownCapture` prop on the GNB `<header>` and `<div data-testid="gnb-mobile-menu-panel">`. It handles Tab/Shift+Tab when focus is already within one of these elements:

- Ignore if `altKey`, `ctrlKey`, or `metaKey`.
- Call `inputRef.current.getOrderedKeyboardTargets()` to build the target list.
- Find the current `document.activeElement` in the list.
- If found and the next/previous target remains inside the target list, move focus to that target.
- On forward overflow in landing context: call `inputRef.current.focusFirstLandingCardTrigger()`. If it returns `true`, also call `inputRef.current.closeSettingsImmediate()` and `preventDefault`. If it returns `false`, do not `preventDefault` (native browser behavior).
- On forward overflow in non-landing context: do not wrap to `targets[0]`; do not `preventDefault`; do not call the landing card focus helper; allow native focus-out so the destination settings focus-out close contract remains unchanged.
- Always `preventDefault` on successful intra-GNB movement.

**Responsibility 2: document-level first-Tab capture (registered once)**

Registered with `document.addEventListener('keydown', handler, true)` in a `useEffect(() => { ... return () => document.removeEventListener(...) }, [])`.

Handles the case where `document.activeElement` is `body`, `documentElement`, or `null` (focus is not inside the GNB):

- Ignore Shift+Tab from body.
- If `inputRef.current.shouldDeferLandingGnbEntry && inputRef.current.landingKeyboardEntryMode === 'card-first'`, do nothing — let native focus / landing card flow win.
- Otherwise, call `inputRef.current.getOrderedKeyboardTargets()`, `preventDefault`, and focus `targets[0]`.

### Modify: `src/features/gnb/site-gnb.tsx`

**Bind `focusFirstLandingCardTrigger`**: before the hook call, create a stable callback:

```ts
const boundFocusFirstLandingCard = useCallback(
  () => focusFirstLandingCardTrigger(),
  []
);
```

Import `focusFirstLandingCardTrigger` from `../gnb-keyboard-dom`.

**Get `closeSettingsImmediate`**: destructure from `useGnbDesktopSettings`. Verify this is the correct name by reading `use-gnb-desktop-settings.ts` before implementing.

**Hook call**:
```ts
const {handleGnbKeyDownCapture} = useGnbTabRouting({
  getOrderedKeyboardTargets,
  isLandingContext,
  shouldDeferLandingGnbEntry,
  landingKeyboardEntryMode,
  settingsOpen,
  closeSettingsImmediate,
  focusFirstLandingCardTrigger: boundFocusFirstLandingCard,
});
```

Remove: inline `routeKeyboardWithinGnb`, document-level Tab `useEffect`, and the `handleGnbKeyDownCapture` adapter function.

**JSX** — attach to the same two elements, unchanged:
```tsx
<header onKeyDownCapture={handleGnbKeyDownCapture}>
<div data-testid="gnb-mobile-menu-panel" onKeyDownCapture={handleGnbKeyDownCapture}>
```

### New file: `tests/unit/gnb-tab-routing.test.ts`

Use `@vitest-environment jsdom` and `renderHook`. Mock `getOrderedKeyboardTargets`, `closeSettingsImmediate`, and `focusFirstLandingCardTrigger` with `vi.fn()`. Use real buttons appended to `document.body` and `button.focus()` to set `document.activeElement`. Test cases:

- `ignores non-Tab keys and Tab with alt, ctrl, or meta modifiers`
- `no-ops when activeElement is missing or target list is empty`
- `no-ops when activeElement is outside ordered targets`
- `moves focus forward within ordered targets and prevents default`
- `moves focus backward within ordered targets and prevents default`
- `forward overflow in landing context focuses the first landing card, closes settings when open, and prevents default`
- `forward overflow in landing context without card focus success is a no-op and does not close settings`
- `forward overflow in destination context allows native focus-out`
- `document-level first Tab focuses first GNB target when not deferring`
- `document-level first Tab does not steal focus during landing card-first deferral`
- `document-level Shift+Tab from body is a no-op`
- `document capture listener is registered once and removed on unmount`

For document-level capture tests: dispatch `new KeyboardEvent('keydown', {key: 'Tab', bubbles: true, cancelable: true})` on `document` after `renderHook`. Assert `document.activeElement`.

### Verification

```bash
npm run test -- gnb-tab-routing
npx playwright test gnb-smoke state-smoke --project=chromium
npm run qa:rules
```

All B3/B7 keyboard matrix assertions in `gnb-smoke.spec.ts` must remain green. `state-smoke.spec.ts` lines 226-287 (inert handoff and wheel-preserves-keyboard-mode) must remain green.

**Rollback condition**: if `gnb-smoke` or `state-smoke` fails, revert only Step 5 (remove `use-gnb-tab-routing.ts`, `gnb-tab-routing.test.ts`, and restore `site-gnb.tsx` routing code). Steps 1–4 are safe to keep. If failures persist after reverting Step 5, revert Step 4 next. Do not revert Step 1 selector fix unless first-card focus behavior is still failing.

---

## QA / Verification Commands (All Steps Complete)

Run in this exact order. All must pass with zero errors.

```bash
npm run lint
npm run typecheck
npm run test
npm run qa:rules
npx playwright test gnb-smoke state-smoke a11y-smoke --project=chromium
```

---

## Documentation Update Instructions

### Required (do after all 5 steps pass verification)

**`docs/req-landing.md §9.2`** — Add the following sentence to the focusable element semantics:
> GNB-to-landing keyboard focus transfer must skip card triggers with `aria-disabled="true"` and any card triggers whose ancestor card root carries the `inert` attribute.

**`docs/project-analysis.md §5.2`** — Update:
- `site-gnb.tsx` line count (expected to decrease from ~587 lines)
- Add to the GNB hook inventory: `gnb-keyboard-dom.ts`, `use-landing-gnb-entry-mode.ts`, `use-gnb-keyboard-targets.ts`, `use-gnb-tab-routing.ts`
- Keep the note: `useGnbKeyboardModeTracker()` remains exported but unwired pending §7.5 compliance review

**`docs/project-analysis.md §9 (Risks and Notes)`** — Update the GNB pressure-point sentence: keyboard routing is no longer inline in `site-gnb.tsx`.

### Conditional (only if applicable)

**`docs/req-landing.md §7.5`** — No update needed (C-6 Option B; wheel behavior unchanged).

**`docs/req-landing.md §7.6`** — Update only if observable Tab order changes. This plan forbids such changes.

---

## Completion Report Format

After implementation, produce a summary in this format:

```
## Implementation Report

Steps completed: [1-5]
New files created: [list]
Modified files: [list]
New unit test files: [list]
Unit tests added: [count]
E2E tests with behavioral updates: [list or "none"]
QA script files modified: ["none"]
Doc sections updated: [list]
C-6 disposition: Option B — deferred, TODO comment added
Verification status:
  lint: [pass/fail]
  typecheck: [pass/fail]
  test: [pass/fail — include count]
  qa:rules: [pass/fail]
  playwright gnb-smoke: [pass/fail]
  playwright state-smoke: [pass/fail]
  playwright a11y-smoke: [pass/fail]
Highest-risk step: Step 5 (useGnbTabRouting)
Rollback applied: [yes/no — if yes, which step and why]
```
