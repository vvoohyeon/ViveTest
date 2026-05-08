# GNB Keyboard Routing Decomposition Implementation Plan

> **For agentic workers:** This plan is analysis and execution guidance only. Do not implement until the user explicitly approves it. If approved later, execute the five steps in order and verify each step before continuing.

**Goal:** Extract the GNB keyboard routing layer from `src/features/gnb/site-gnb.tsx` into focused, independently testable units while preserving every observable keyboard and focus contract.

**Architecture:** Keep `site-gnb.tsx` as the rendered shell and move DOM focus helpers, landing GNB entry state, target discovery, and Tab routing into GNB-owned modules. Preserve existing JSX, Escape handling, locale switching, theme transition, desktop settings behavior, mobile menu behavior, and back navigation. Use the landing DOM helper as the shared visibility primitive with an option that preserves current landing behavior by default.

**Tech Stack:** Next.js 16, React 19 hooks, TypeScript, Vitest with jsdom for hook/DOM units, Playwright Chromium for GNB/state/a11y keyboard regression coverage.

---

## Plan Mode Gate

This task touches the high-risk `src/features/gnb/site-gnb.tsx` surface and the landing/GNB SSOT (`docs/req-landing.md` sections 7.5, 7.6, and 9.2). This plan must be approved before source implementation begins.

## Source Evidence Read

- `src/features/gnb/site-gnb.tsx`: current inline keyboard layer is at lines 73-84, 95-97, 142-165, 167-237, 239-270, and 331-370.
- `src/features/gnb/hooks/use-keyboard-mode-tracker.ts`: current hook listens to `wheel` at lines 29 and 35.
- `src/features/gnb/hooks/use-gnb-desktop-settings.ts`: settings state, refs, focus-out close, outside pointer close, and hover close timing stay out of scope.
- `src/features/gnb/behavior.ts`: existing timing constants and pure behavior helpers stay out of scope except for imports used by existing hooks.
- `src/features/gnb/types.ts`: `MobileMenuState` remains the shared state type for new GNB hooks.
- `src/features/landing/grid/interaction-dom.ts`: shared `isVisibleFocusableElement` currently has no disabled check at lines 57-64.
- `src/features/landing/grid/landing-grid-card.tsx`: R-09/R-08 inert blocking is applied on the card root at line 742, while the trigger remains the descendant at lines 764-772.
- `tests/unit/landing-interaction-dom.test.ts`: existing helper coverage is lines 68-77 and does not assert disabled behavior.
- `tests/unit/gnb-desktop-settings.test.ts`: existing extracted-hook test style uses `renderHook`, `act`, and jsdom DOM setup.
- `tests/e2e/gnb-smoke.spec.ts`: keyboard matrix assertions are lines 553-622, 624-701, 741-809, 882-948.
- `tests/e2e/state-smoke.spec.ts`: inert and wheel-preserves-keyboard-mode assertions are lines 226-287.
- `scripts/qa/_path-config.mjs`: current GNB path group only lists `siteGnb` and `capabilityHook`.
- `scripts/qa/check-phase7-state-contracts.mjs`: wheel listener rejection currently applies to landing keyboard files, not GNB.
- `scripts/qa/check-phase8-accessibility-contracts.mjs`: reads `gnb.siteGnb` for ARIA labels and `gnb-smoke` assertion labels.
- `docs/req-landing.md`: section 7.5 says wheel must not exit keyboard mode and inert blocks non-target keyboard-mode cards; section 7.6 owns landing first-Tab and reverse-GNB semantics; section 9.2 owns disabled and inert semantics.

## Files To Modify

Create:

- `src/features/gnb/gnb-keyboard-dom.ts`
- `src/features/gnb/hooks/use-landing-gnb-entry-mode.ts`
- `src/features/gnb/hooks/use-gnb-keyboard-targets.ts`
- `src/features/gnb/hooks/use-gnb-tab-routing.ts`
- `tests/unit/gnb-keyboard-dom.test.ts`
- `tests/unit/gnb-landing-entry-mode.test.ts`
- `tests/unit/gnb-keyboard-targets.test.ts`
- `tests/unit/gnb-tab-routing.test.ts`

Modify:

- `src/features/gnb/site-gnb.tsx`
- `src/features/gnb/hooks/use-keyboard-mode-tracker.ts`
- `src/features/landing/grid/interaction-dom.ts`
- `tests/unit/landing-interaction-dom.test.ts`
- `docs/project-analysis.md`
- `docs/req-landing.md` only if the implementation changes or clarifies the documented selector semantics as described in "Documentation Updates"

Do not modify:

- `public/theme-bootstrap.js`
- `src/features/gnb/hooks/use-gnb-desktop-settings.ts`
- `src/features/gnb/hooks/use-gnb-mobile-menu.ts`
- `src/features/gnb/hooks/use-gnb-back-navigation.ts`
- `src/features/gnb/hooks/use-theme-preference.ts`
- `src/features/gnb/components/settings-controls.tsx`
- `src/features/gnb/components/theme-mode-icon.tsx`
- Locale switching logic, theme transition logic, Escape close behavior, or any file under `src/features/test/domain/`
- Screenshot PNG baselines or provenance records

## Relevant SSOT Contract

- `docs/req-landing.md §7.5`: keyboard-mode entry/exit, inert, and wheel-preservation contract.
- `docs/req-landing.md §7.6`: landing first-Tab, reverse-GNB return, and destination default GNB traversal.
- `docs/req-landing.md §9.2`: disabled, `aria-disabled`, and `inert` semantics.
- `docs/agent-guides/project-rules.md §Blog-Telemetry-Theme`: GNB/theme QA surface.
- `docs/agent-guides/verification-commands.md §landing`: scope-specific GNB and landing verification commands.

## Impact Assessment

- Shared components: High impact on `SiteGnb`, but JSX should remain behaviorally unchanged.
- Localization: No locale data or route-building behavior changes. Locale controls must stay ordered and disabled-current controls must remain skipped in GNB keyboard targets.
- Accessibility: High risk. The plan touches Tab order, focus transfer, disabled exclusion, inert exclusion, and panel focus containment.
- State contracts: Medium to high risk. Landing `card-first | gnb` entry state must remain equivalent, and keyboard-mode wheel behavior must remain compliant.
- Core user flow: High risk. Landing first Tab, Shift+Tab return to GNB, settings panel traversal, mobile menu traversal, and destination first Tab must all stay identical.
- Performance/responsiveness: Low direct risk. DOM queries remain event-driven; extraction must not introduce render-time DOM reads.
- Design system consistency: Low direct risk. No style or layout changes are planned.

## C-6 Disposition Decision

Chosen option: **Option B - defer wiring.**

Rationale: `useGnbKeyboardModeTracker()` currently exits keyboard mode on `wheel`, which conflicts with `docs/req-landing.md §7.5`. It also returns only `isKeyboardMode: boolean`, which cannot replace `landingKeyboardEntryMode: 'card-first' | 'gnb'`; both concepts would need to coexist. Wiring it now would add a global input-modality listener without reducing the GNB keyboard routing layer and would risk changing behavior outside the extraction goal.

Implementation disposition:

- Keep the hook exported.
- Do not import or call it from `site-gnb.tsx` or the new hooks.
- Add this exact comment near the top of `src/features/gnb/hooks/use-keyboard-mode-tracker.ts`:

```ts
// TODO: wire after §7.5 compliance review
```

- Do not remove the `wheel` listener in this five-step sequence.
- Future compliance fix before wiring: remove `document.addEventListener('wheel', handlePointerInput, passiveListenerOptions)` and the matching cleanup line, then add dedicated unit coverage that wheel preserves keyboard mode.
- Final runtime wheel behavior remains compliant for this plan because the GNB tracker remains unwired; landing runtime wheel behavior is already covered by `tests/e2e/state-smoke.spec.ts` lines 261-287.

No separate C-6 implementation step is added to the strict sequence. The comment is a non-behavioral guardrail and may be included with the Step 1 patch.

---

## Step 1 - Fix C-5: `focusFirstLandingCardTrigger` Selector And Extraction

**Why first:** The R-09 selector bug is independent of broader refactoring and has the smallest regression boundary.

**Files:**

- Create: `src/features/gnb/gnb-keyboard-dom.ts`
- Create: `tests/unit/gnb-keyboard-dom.test.ts`
- Modify: `src/features/gnb/site-gnb.tsx`
- Modify: `src/features/gnb/hooks/use-keyboard-mode-tracker.ts` comment only for C-6 Option B

**Implementation details:**

- Extract `focusFirstLandingCardTrigger` to `src/features/gnb/gnb-keyboard-dom.ts`.
- Use this exact selector constant:

```ts
export const LANDING_CARD_TRIGGER_SELECTOR =
  '[data-testid="landing-grid-card-trigger"]:not([inert]):not([aria-disabled="true"])';
```

- Because the actual `inert` attribute is currently on the card root (`landing-grid-card.tsx` line 742), not the trigger, the helper must also reject candidates inside an inert subtree with `candidate.closest('[inert]')`.
- Query all candidates, not only the first match, so an invalid first candidate does not mask a later valid card.
- Preserve silent failure: return `false` and do not call `focus()` when no eligible trigger exists.
- Keep `site-gnb.tsx` call-site semantics unchanged: `routeKeyboardWithinGnb` still prevents default and closes settings only when `focusFirstLandingCardTrigger()` returns `true`.
- E2E assertion update: none. `gnb-smoke.spec.ts` does not assert the old `aria-disabled` filtering path directly; lines 592-601 and 802-808 assert the observable focus transfer and should remain unchanged.

**New unit test file:** `tests/unit/gnb-keyboard-dom.test.ts`

Test cases:

- `focuses the first visible trigger that is neither inert nor aria-disabled`
- `skips a trigger inside an inert card root and focuses the next eligible trigger`
- `skips a trigger with aria-disabled true`
- `returns false when all matching triggers are hidden, inert, or aria-disabled`
- `returns false without throwing when document is unavailable`

Mock strategy:

- Use jsdom `document.body.innerHTML`.
- Spy on `HTMLElement.prototype.focus` only when necessary; prefer asserting `document.activeElement`.
- Mount a root-inert card fixture that matches current `landing-grid-card.tsx` behavior.

**Verification commands:**

```bash
npm run test -- gnb-keyboard-dom landing-interaction-dom
npx playwright test gnb-smoke
```

Required E2E confirmations:

- `gnb-smoke.spec.ts` lines 592-601 still pass: desktop settings panel overflow focuses first landing card and closes panel.
- `gnb-smoke.spec.ts` lines 802-808 still pass: mobile closed menu overflow focuses first landing card.

**Rollback condition:**

- If `gnb-keyboard-dom` unit tests fail because selector behavior is wrong, revert only `src/features/gnb/gnb-keyboard-dom.ts`, `tests/unit/gnb-keyboard-dom.test.ts`, and the `site-gnb.tsx` import/call-site change.
- If `gnb-smoke` fails at lines 592-601 or 802-808, first restore the inline `focusFirstLandingCardTrigger` with the corrected selector and ancestor-inert guard; if the failure persists, revert Step 1 fully and stop before Step 2.

---

## Step 2 - Resolve C-1: Shared `isVisibleFocusableElement`

**Why second:** Every later DOM-query hook depends on a stable visibility and disabled-exclusion contract.

**Files:**

- Modify: `src/features/landing/grid/interaction-dom.ts`
- Modify: `src/features/gnb/gnb-keyboard-dom.ts`
- Modify: `src/features/gnb/site-gnb.tsx`
- Modify: `tests/unit/landing-interaction-dom.test.ts`
- Modify: `tests/unit/gnb-keyboard-dom.test.ts`

**Chosen approach:** Approach (a), add `{excludeDisabled?: boolean}` to `interaction-dom.ts`.

Rationale:

- This unifies the two divergent implementations at the shared primitive.
- The default must be `excludeDisabled = false`, preserving landing-grid behavior exactly.
- GNB can opt into the stricter behavior by calling the helper with `{excludeDisabled: true}`.
- The existing landing unit test does not cover disabled behavior, so adding explicit default and opt-in assertions makes the contract visible without changing current callers.

Target shared signature:

```ts
interface VisibleFocusableElementOptions {
  excludeDisabled?: boolean;
}

export function isVisibleFocusableElement(
  element: HTMLElement | null,
  options: VisibleFocusableElementOptions = {}
): element is HTMLElement;
```

GNB wrapper in `gnb-keyboard-dom.ts`:

```ts
export function isVisibleFocusableGnbElement(element: HTMLElement | null): element is HTMLElement {
  return isVisibleFocusableElement(element, {excludeDisabled: true});
}
```

`site-gnb.tsx` must remove the local module-level `isVisibleFocusableElement` function and import/use `isVisibleFocusableGnbElement` only until Step 4 removes the inline target resolver.

**Existing test file update:** `tests/unit/landing-interaction-dom.test.ts`

Add assertions to the existing visibility test:

- A disabled button remains `true` with the default call.
- The same disabled button returns `false` with `{excludeDisabled: true}`.

**Verification command:**

```bash
npm run test -- landing-interaction-dom gnb-keyboard-dom
```

Expected result:

- Existing visible/hidden assertions remain green.
- New disabled default/opt-in assertions are green.

**Rollback condition:**

- If existing landing behavior fails, revert only the `interaction-dom.ts` signature change and the associated `landing-interaction-dom.test.ts` edits, then keep Step 1 by temporarily using a GNB-local wrapper in `gnb-keyboard-dom.ts`.
- If TypeScript narrowing fails in GNB callers, keep the shared option but narrow through the exported GNB wrapper before continuing.

---

## Step 3 - Extract C-4: `useLandingGnbEntryMode`

**Why third:** The final Tab routing hook consumes `shouldDeferLandingGnbEntry`, so landing entry mode must be extracted before routing.

**Files:**

- Create: `src/features/gnb/hooks/use-landing-gnb-entry-mode.ts`
- Create: `tests/unit/gnb-landing-entry-mode.test.ts`
- Modify: `src/features/gnb/site-gnb.tsx`

**Hook signature:**

```ts
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

export function useLandingGnbEntryMode(input: UseLandingGnbEntryModeInput): UseLandingGnbEntryModeOutput;
```

**`isWithinInteractiveGnb` handling:**

- Extract it as a private helper inside `use-landing-gnb-entry-mode.ts`, not in `gnb-keyboard-dom.ts`.
- Reason: it is coupled to the hook's `gnbShellRef` and `mobileMenuPanelId` and is not reused by target resolution or focus helpers.
- Keep the selector unchanged:

```ts
'a[href], button, [data-testid="gnb-settings-panel"], [data-testid="gnb-mobile-menu-panel"]'
```

**Code remaining in `site-gnb.tsx`:**

- The local `LandingKeyboardEntryMode` type is removed.
- The local `useState` for `landingKeyboardEntryMode` is removed.
- The local `shouldDeferLandingGnbEntry`, `desktopLandingTabIndex`, `mobileLandingTabIndex`, `isWithinInteractiveGnb`, and focus/pointer `useEffect` are removed.
- Only this hook call remains:

```ts
const {
  landingKeyboardEntryMode,
  shouldDeferLandingGnbEntry,
  desktopLandingTabIndex,
  mobileLandingTabIndex
} = useLandingGnbEntryMode({
  isLandingContext,
  gnbShellRef,
  mobileMenuPanelId,
  settingsOpen,
  mobileMenuState
});
```

**New unit test file:** `tests/unit/gnb-landing-entry-mode.test.ts`

Test cases:

- `starts landing context in card-first mode and defers GNB tab indexes`
- `starts non-landing context in gnb mode and leaves tab indexes undefined`
- `focusin inside the desktop GNB switches entry mode to gnb`
- `focusin inside the mobile menu panel switches entry mode to gnb`
- `focusin outside interactive GNB switches entry mode to card-first`
- `pointerdown outside interactive GNB resets landing entry mode to card-first`
- `pointerdown inside interactive GNB does not reset entry mode`
- `open settings disables card-first deferral`
- `open or closing mobile menu disables card-first deferral`
- `removes focusin and pointerdown listeners on unmount`

Mock strategy:

- Use `renderHook` from `@testing-library/react`.
- Create a real `header` element and assign it to `gnbShellRef.current`.
- Create a mobile panel element with the provided ID.
- Dispatch real `FocusEvent('focusin', {bubbles: true})` and `PointerEvent('pointerdown', {bubbles: true})` where jsdom supports them; otherwise use `MouseEvent` with event type `pointerdown`.

**Verification commands:**

```bash
npm run test -- gnb-landing-entry-mode
npx playwright test gnb-smoke state-smoke
```

Required E2E confirmations:

- `gnb-smoke.spec.ts` lines 553-622 still pass: desktop landing enters cards first and reverse-enters GNB.
- `gnb-smoke.spec.ts` lines 741-809 still pass: mobile landing enters cards first, reverse-enters menu, and closed menu stays out of order.

**Rollback condition:**

- If the new hook unit tests fail, revert only `use-landing-gnb-entry-mode.ts`, `gnb-landing-entry-mode.test.ts`, and the `site-gnb.tsx` extraction.
- If `gnb-smoke` or `state-smoke` fails after unit tests pass, restore the original inline state/effect block in `site-gnb.tsx` and stop before Step 4.

---

## Step 4 - Extract C-2: `useGnbKeyboardTargets`

**Why fourth:** The final Tab routing hook consumes this resolver.

**Files:**

- Create: `src/features/gnb/hooks/use-gnb-keyboard-targets.ts`
- Create: `tests/unit/gnb-keyboard-targets.test.ts`
- Modify: `src/features/gnb/site-gnb.tsx`

**Hook signature:**

```ts
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

export function useGnbKeyboardTargets(input: UseGnbKeyboardTargetsInput): UseGnbKeyboardTargetsOutput;
```

**DOM helper dependency:**

- Call `isVisibleFocusableGnbElement` from `src/features/gnb/gnb-keyboard-dom.ts`.
- That wrapper must delegate to `interaction-dom.ts` with `{excludeDisabled: true}` per Step 2.

**Selector behavior:**

- Keep GNB target selectors as `a[href], button`; do not apply the Step 1 landing-card trigger selector here.
- No `querySelectorAll` selector needs an inert-specific update in this hook because it resolves GNB and panel controls, not landing card triggers.
- Disabled current locale/theme controls remain excluded through `isVisibleFocusableGnbElement`.
- Panel exclusion must remain: top-level container targets must exclude descendants inside `settingsPanel` or `mobilePanel`.

**Code remaining in `site-gnb.tsx`:**

```ts
const {getOrderedKeyboardTargets} = useGnbKeyboardTargets({
  settingsPanelId,
  mobileMenuPanelId,
  settingsOpen,
  mobileMenuState,
  mobileMenuTriggerRef
});
```

The inline `getOrderedKeyboardTargets`, `getTopLevelTargets`, and `getPanelTargets` callbacks are removed.

**New unit test file:** `tests/unit/gnb-keyboard-targets.test.ts`

Test cases:

- `desktop closed returns visible desktop CI, nav links, and settings trigger only`
- `desktop settings open appends enabled settings panel controls after top-level targets`
- `desktop closed excludes settings panel descendants from top-level targets`
- `mobile closed returns visible mobile CI/back and menu trigger only`
- `mobile menu open returns mobile menu trigger followed by panel links and enabled controls`
- `hidden desktop container falls back to mobile targets`
- `hidden mobile container returns an empty target list when desktop is unavailable`
- `disabled current locale and theme buttons are excluded`
- `aria-hidden and hidden panels are excluded`

Mock strategy:

- Use jsdom `document.body.innerHTML` with `.gnb-desktop`, `.gnb-mobile`, settings panel, mobile panel, and buttons.
- Use `renderHook` and pass a mutable `mobileMenuTriggerRef`.
- Assert returned elements by `textContent`, `dataset.testid`, or object identity.

**QA script impact:**

- `_path-config.mjs`: no required update for this extraction. Current QA scripts validate external contracts through `siteGnb` and `gnb-smoke`, and no script currently requires a GNB keyboard hook inventory.
- `check-phase7-state-contracts.mjs`: no update. It checks landing keyboard files and already rejects landing wheel listeners.
- `check-phase8-accessibility-contracts.mjs`: no required update. The ARIA-label strings remain in `site-gnb.tsx`; B3/B7 keyboard matrix labels remain in `gnb-smoke.spec.ts`.
- Optional follow-up only: add `gnb.keyboardDom`, `gnb.landingEntryModeHook`, `gnb.keyboardTargetsHook`, and `gnb.tabRoutingHook` to `_path-config.mjs` if the team wants static QA inventory after this refactor. Do not include that optional follow-up in this implementation unless explicitly approved, because `scripts/qa/*.mjs` are Ask First files.

**Verification commands:**

```bash
npm run test -- gnb-keyboard-targets
npx playwright test gnb-smoke
```

Required E2E confirmations:

- `gnb-smoke.spec.ts` lines 553-701 still pass: desktop landing and destination target ordering.
- `gnb-smoke.spec.ts` lines 741-948 still pass: mobile landing, blog/history, and test target ordering.

**Rollback condition:**

- If unit tests fail, keep Step 1-3 and revert only `use-gnb-keyboard-targets.ts`, `gnb-keyboard-targets.test.ts`, and the `site-gnb.tsx` resolver extraction.
- If `gnb-smoke` fails in desktop/mobile target ordering, restore the inline resolver exactly and stop before Step 5.

---

## Step 5 - Extract C-3: `useGnbTabRouting`

**Why last:** This is the highest-risk extraction and depends on Step 1 focus helper, Step 3 entry state, and Step 4 target resolver.

**Files:**

- Create: `src/features/gnb/hooks/use-gnb-tab-routing.ts`
- Create: `tests/unit/gnb-tab-routing.test.ts`
- Modify: `src/features/gnb/site-gnb.tsx`

**Hook signature:**

```ts
import type {KeyboardEvent as ReactKeyboardEvent} from 'react';
import type {LandingKeyboardEntryMode} from '@/features/gnb/hooks/use-landing-gnb-entry-mode';

type GnbTabRoutableEvent = Pick<
  KeyboardEvent,
  'key' | 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey' | 'preventDefault'
>;

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

export function useGnbTabRouting(input: UseGnbTabRoutingInput): UseGnbTabRoutingOutput;
```

**Listener registration pattern:**

- Preserve the current document-level capture behavior exactly:

```ts
document.addEventListener('keydown', handleKeyboardTabRouting, true);
document.removeEventListener('keydown', handleKeyboardTabRouting, true);
```

- Do not replace it with a ref-based listener.
- Preserve current modifier-key behavior: ignore `altKey`, `ctrlKey`, and `metaKey`.
- Preserve current body/document first-Tab behavior:
  - If target is body/document/null and Shift is pressed, no-op.
  - If landing context is deferring GNB entry and mode is `card-first`, no-op so native/landing card flow wins.
  - Otherwise prevent default and focus `targets[0]`.

**Code remaining in `site-gnb.tsx`:**

```ts
const {handleGnbKeyDownCapture} = useGnbTabRouting({
  getOrderedKeyboardTargets,
  isLandingContext,
  shouldDeferLandingGnbEntry,
  landingKeyboardEntryMode,
  settingsOpen,
  closeSettingsImmediate,
  focusFirstLandingCardTrigger
});
```

The JSX remains:

```tsx
<header onKeyDownCapture={handleGnbKeyDownCapture}>
...
<div data-testid="gnb-mobile-menu-panel" onKeyDownCapture={handleGnbKeyDownCapture}>
```

The inline `routeKeyboardWithinGnb`, document-level Tab effect, and `handleGnbKeyDownCapture` adapter are removed.

**New unit test file:** `tests/unit/gnb-tab-routing.test.ts`

Test cases:

- `ignores non-Tab keys and Tab with alt ctrl or meta modifiers`
- `no-ops when activeElement is missing or targets are empty`
- `no-ops when activeElement is outside ordered targets`
- `moves focus forward within ordered targets and prevents default`
- `moves focus backward within ordered targets and prevents default`
- `landing forward overflow focuses the first landing card, closes settings when open, and prevents default`
- `landing forward overflow without a card focus success is a no-op and does not close settings`
- `destination forward overflow does not call the landing card focus helper`
- `document-level first Tab focuses first GNB target outside landing card-first deferral`
- `document-level first Tab does not steal focus during landing card-first deferral`
- `document-level Shift+Tab from body is a no-op`
- `removes the document capture listener on unmount`

Mock strategy:

- Use `renderHook` for the hook and call `handleGnbKeyDownCapture` with a minimal event object cast to `ReactKeyboardEvent<HTMLElement>`.
- For document-level capture tests, dispatch real `KeyboardEvent('keydown', {key: 'Tab', bubbles: true})` after rendering the hook.
- Use real buttons appended to `document.body`, call `focus()`, and assert `document.activeElement`.
- Use `vi.fn()` for `getOrderedKeyboardTargets`, `closeSettingsImmediate`, and `focusFirstLandingCardTrigger`.

**Verification commands:**

```bash
npm run test -- gnb-tab-routing
npx playwright test gnb-smoke state-smoke
npm run qa:rules
```

Required E2E confirmations:

- All B3/B7 GNB keyboard matrix assertions in `gnb-smoke.spec.ts` remain green.
- `state-smoke.spec.ts` lines 226-287 remain green, especially inert handoff and wheel-preserves-keyboard-mode behavior.

**Rollback condition:**

- If `gnb-tab-routing` unit tests fail, revert only `use-gnb-tab-routing.ts`, `gnb-tab-routing.test.ts`, and the `site-gnb.tsx` routing extraction.
- If `gnb-smoke` or `state-smoke` fails after Step 5, first revert Step 5 only. Step 1-4 are designed to be safe to keep because they isolate selector, helper, entry state, and target discovery.
- If failures persist after reverting Step 5, revert Step 4 next because target resolver ordering is the next most likely blast radius. Do not revert Step 1 selector fix unless first-card focus behavior is still failing.

---

## Existing Test Updates

- `tests/unit/landing-interaction-dom.test.ts`: update only because Step 2 chooses shared-helper option (a). Add default-disabled and opt-in-disabled assertions.
- `tests/e2e/gnb-smoke.spec.ts`: no behavioral edits expected. Existing B3/B7 assertions remain the source of truth.
- `tests/e2e/state-smoke.spec.ts`: no behavioral edits expected. Existing inert and wheel-preservation assertions remain the source of truth.
- `tests/unit/gnb-desktop-settings.test.ts`: no import or behavior changes. Use it only as style reference for `renderHook`/jsdom testing.

## New Unit Test Files

- `tests/unit/gnb-keyboard-dom.test.ts`: jsdom DOM helper tests for first-card focus and inert/aria-disabled filtering.
- `tests/unit/gnb-landing-entry-mode.test.ts`: `renderHook` tests for landing entry mode, tab indexes, and document listeners.
- `tests/unit/gnb-keyboard-targets.test.ts`: `renderHook` tests for desktop/mobile target ordering and disabled exclusion.
- `tests/unit/gnb-tab-routing.test.ts`: `renderHook` and direct handler tests for GNB Tab routing and document capture behavior.

## QA And Verification Commands

After all five steps are complete, run these commands in order:

```bash
npm run lint
npm run typecheck
npm run test
npm run qa:rules
npx playwright test gnb-smoke state-smoke a11y-smoke --project=chromium
```

All commands must pass with zero errors before implementation is considered complete.

## Documentation Updates

Minimum required updates after implementation:

- `docs/project-analysis.md §5.2`: update the `site-gnb.tsx` line count and hook/module inventory. Mention `gnb-keyboard-dom.ts`, `use-landing-gnb-entry-mode.ts`, `use-gnb-keyboard-targets.ts`, and `use-gnb-tab-routing.ts`. Keep the note that `useGnbKeyboardModeTracker()` remains exported but unwired pending §7.5 compliance review.
- `docs/project-analysis.md §9`: reduce the GNB pressure-point line count and reword the pressure note so keyboard routing is no longer listed as inline in `site-gnb.tsx`.

Conditional/minimum updates:

- `docs/req-landing.md §7.5`: no update for Option B because runtime wheel behavior does not change and the GNB tracker stays unwired. If a future Option A compliance fix is approved, update this section only after removing the GNB hook's wheel listener and adding tests.
- `docs/req-landing.md §7.6`: update only if implementation changes observable Tab order. The intended plan preserves behavior, so no wording change should be needed.
- `docs/req-landing.md §9.2`: update only if the team wants explicit wording that GNB overflow-to-card focus skips triggers inside inert subtrees. Minimum wording, if added: "GNB-to-landing keyboard focus transfer must skip card triggers inside `inert` subtrees as well as triggers with `aria-disabled=\"true\"`."

Do not update screenshot provenance or commit screenshot PNG files.

## Approval Checkpoint

Before implementation, confirm:

- C-6 Option B is acceptable: no wiring, comment guardrail only, future compliance fix required before use.
- Step 1 may include an ancestor-inert guard in addition to the required `:not([inert]):not([aria-disabled="true"])` selector because current DOM places `inert` on the card root.
- QA script files will not be modified unless the user explicitly asks for static path inventory updates.

## Implementation Plan Summary

Steps: 5

New files:

- `src/features/gnb/gnb-keyboard-dom.ts`
- `src/features/gnb/hooks/use-landing-gnb-entry-mode.ts`
- `src/features/gnb/hooks/use-gnb-keyboard-targets.ts`
- `src/features/gnb/hooks/use-gnb-tab-routing.ts`
- `tests/unit/gnb-keyboard-dom.test.ts`
- `tests/unit/gnb-landing-entry-mode.test.ts`
- `tests/unit/gnb-keyboard-targets.test.ts`
- `tests/unit/gnb-tab-routing.test.ts`

Modified files:

- `src/features/gnb/site-gnb.tsx`
- `src/features/gnb/hooks/use-keyboard-mode-tracker.ts`
- `src/features/landing/grid/interaction-dom.ts`
- `tests/unit/landing-interaction-dom.test.ts`
- `docs/project-analysis.md`
- `docs/req-landing.md` only if conditional wording is approved or behavior changes

New unit test files:

- `tests/unit/gnb-keyboard-dom.test.ts`
- `tests/unit/gnb-landing-entry-mode.test.ts`
- `tests/unit/gnb-keyboard-targets.test.ts`
- `tests/unit/gnb-tab-routing.test.ts`

E2E tests requiring behavioral update: none

QA script files requiring update: none

Doc sections requiring update:

- `docs/project-analysis.md §5.2`
- `docs/project-analysis.md §9`
- `docs/req-landing.md §9.2` only if explicit inert-subtree selector wording is approved
- `docs/req-landing.md §7.5` only for a future Option A compliance fix
- `docs/req-landing.md §7.6` only if observable Tab order changes, which this plan forbids

C-6 disposition: Option B - defer wiring because the hook's current wheel listener conflicts with §7.5 and its boolean output cannot replace landing `card-first | gnb` entry mode.

Estimated risk surface: Step 5 has the highest risk because it moves document-level capture routing and intra-GNB focus movement; mitigation is to leave Steps 1-4 intact and rollback only Step 5 if `gnb-smoke` or `state-smoke` fails.
