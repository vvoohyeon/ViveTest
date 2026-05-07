# R-01 Site GNB Hook Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:test-driven-development` as the high-risk guardrail, adapted to this task's explicit constraint that no test files may be modified. Execute inline one unit at a time after explicit user approval. Do not use subagents, automated multi-wave execution, or automated implementation pipelines.

**Status:** COMPLETE
**Completion Date:** 2026-05-03
**Completion Note:** theme-matrix gate failure resolved as local baseline provenance issue, not R-01 production regression. See handoff doc §0-5.
**Cleanup Documentation Note:** E2E browser setup and theme-matrix local baseline regeneration are documented in `tests/e2e/README.md`.

**Goal:** Extract desktop settings, mobile menu, and route-aware back-navigation behavior from `src/features/landing/gnb/site-gnb.tsx` into three focused hooks while preserving rendered output and visible behavior.

**Architecture:** Keep `SiteGnb` as the JSX, keyboard-routing, Escape-priority, and cleanup coordinator. Move only the approved state/ref/callback/effect clusters into one hook per behavioral concern under `src/features/landing/gnb/hooks/`, with the R-06 future-move notice in each new file. Preserve all class name constants, JSX structure, keyboard routing, and existing behavior module boundaries.

**Tech Stack:** Next.js 16, React 19 client components, TypeScript strict mode, existing Vitest/Playwright/QA gates.

---

## Pre-Implementation Checks

- Root `AGENTS.md` was read. `.planning/STATE.md` does not exist.
- Relevant SSOT and guides were read:
  - `docs/req-landing.md` §6.4, §7, §8, §9, §10, §11
  - `docs/agent-guides/project-rules.md` §Ownership and §Blog-Telemetry-Theme
  - `docs/agent-guides/verification-commands.md` §landing
- Script names and flags were verified in `package.json`, `next.config.ts`, `playwright.config.ts`, and `src/config/site.ts`.
- Current `scripts/qa` scan found `site-gnb` references only in `scripts/qa/check-phase8-accessibility-contracts.mjs`; the existing Phase 8 checks assert aria-label wiring that remains in `site-gnb.tsx`.
- Current `scripts/qa/check-phase1-contracts.mjs` and `scripts/qa/check-phase7-state-contracts.mjs` do not contain `site-gnb`, `gnb/site-gnb`, session path, or back-navigation assertions.

## Files To Be Modified

- Create: `src/features/landing/gnb/hooks/use-gnb-desktop-settings.ts`
- Create: `src/features/landing/gnb/hooks/use-gnb-mobile-menu.ts`
- Create: `src/features/landing/gnb/hooks/use-gnb-back-navigation.ts`
- Modify: `src/features/landing/gnb/site-gnb.tsx`
- Modify: `src/features/landing/gnb/hooks/index.ts`
- Modify: `src/features/landing/storage/storage-keys.ts`
- Inspect and modify only if moved-logic read scopes require it:
  - `scripts/qa/check-phase1-contracts.mjs`
  - `scripts/qa/check-phase7-state-contracts.mjs`
  - `scripts/qa/check-phase8-accessibility-contracts.mjs`
  - any other `scripts/qa/*.mjs` matched by `rg -n "site-gnb|gnb/site-gnb" scripts/qa`
- Update this plan with the implementation outcome after the approved implementation completes.

## Relevant SSOT Contracts

- `docs/req-landing.md` §6.4 GNB Contract:
  - desktop settings open/close must preserve hover, click/focus fallback, Escape, outside click, focus-out, zero trigger-layer hover gap, hover-only close delay, and immediate non-hover close paths.
  - mobile menu must preserve overlay/backdrop, scroll lock, pointer-down outside close, scroll-gesture cancellation, close-transition timing, and trigger focus restoration after animated close.
  - mobile test back must prefer `history.back` and fall back to localized landing.
- `docs/req-landing.md` §7 State Model:
  - state transitions must remain deterministic and keyboard handoff must stay in `site-gnb.tsx`.
- `docs/req-landing.md` §9 Accessibility Requirements:
  - Escape closes top-level overlay/panel first.
  - mobile hamburger, desktop settings, and back buttons keep aria labels.
- `docs/req-landing.md` §10.2:
  - GNB-by-context behavior follows §6.4 only.
- `docs/req-landing.md` §11:
  - client-only browser API reads stay in effects/callbacks and must not introduce SSR/hydration nondeterminism.
- `docs/agent-guides/project-rules.md` §Ownership:
  - `src/features/landing/**` owns Grid, GNB, transition, telemetry, shell, and blog destination.
  - `scripts/qa/*.mjs` are machine-enforced contract checks.

## Impact Assessment

- Shared components (shell/GNB): high impact. `site-gnb.tsx` is a high-risk GNB surface; this refactor must preserve the component shell, JSX structure, CSS constants, and DOM/test markers.
- Localization: low functional risk. Locale routing and `handleLocaleChange` remain in `site-gnb.tsx`; the mobile menu immediate-close hook API preserves the current route-change behavior.
- A11y: high impact. Focus-out settings close, animated mobile close focus restoration, Escape priority, aria-label checks, and keyboard routing must remain unchanged.
- State contracts: high impact. Settings, mobile menu, outside gesture, close timers, back fallback timer, and previous-path tracking move ownership but must keep exact state/ref types and timing semantics.
- Core user flow: medium-high impact. Landing/blog/history/test GNB variants, mobile test back fallback, standard back fallback, and mobile menu backdrop gestures must remain identical.
- Performance/responsiveness/design consistency: medium impact. Extraction must not change class names, rendered output, scroll locking, overlay timing, or breakpoint/hover capability behavior.
- Security/input validation: no new external input surface and no new packages. Existing `sessionStorage` try/catch behavior must be preserved exactly in the back-navigation hook.

## Decisions Confirmed Before Execution

- Approved API additions for `useGnbDesktopSettings`:
  - `openSettingsImmediate(): void`
  - `toggleSettingsOpen(): void`
  - `clearSettingsHoverCloseTimer(): void`
- Approved API addition for `useGnbMobileMenu`:
  - `closeMobileMenuImmediate(): void`
- `closeMobileMenuImmediate()` clears the mobile close timer, resets `mobileMenuCloseReasonRef.current` to `null`, and sets state to `'closed'`; it does not focus the trigger.
- `useGnbBackNavigation` return type remains unchanged.
- No test files may be modified for this task.
- `behavior.ts`, `use-gnb-capability.ts`, and `use-theme-preference.ts` must not be modified.
- Keyboard routing logic and the Escape key effect remain in `site-gnb.tsx`.

## Decisions Requiring Confirmation Before Execution

- Approval to execute this plan.
- No additional product, UX, or architecture decisions remain open.

## TDD / Regression Strategy

Because this is a behavior-preserving refactor and the task explicitly forbids test-file changes, implementation will not add or edit unit/E2E tests. The test-driven guardrail for this task is:

- Preserve the existing behavioral assertions by running the current QA and smoke suites after the refactor.
- Update only QA read-scope paths when an existing static contract check reads moved logic from `site-gnb.tsx`.
- Do not weaken assertion patterns or broaden them beyond the minimal file-path/read-scope change.
- Treat any regression in `qa:rules`, typecheck, build, unit tests, or smoke E2E as a blocker and fix root cause before proceeding.

## Implementation Tasks

### Task 1: Create Focused Hook Files

**Files:**
- Create: `src/features/landing/gnb/hooks/use-gnb-desktop-settings.ts`
- Create: `src/features/landing/gnb/hooks/use-gnb-mobile-menu.ts`
- Create: `src/features/landing/gnb/hooks/use-gnb-back-navigation.ts`
- Modify: `src/features/landing/gnb/hooks/index.ts`

- [ ] Add `'use client';` and the required `@future-move R-06` comment block to each new hook file.
- [ ] Implement `useGnbDesktopSettings(options)` with exact extracted behavior:
  - state: `settingsOpen`
  - refs: `settingsRootRef`, `settingsHoverCloseTimerRef`
  - internal live hover fallback using `hoverOpenEnabled` first, then `window.matchMedia` + `window.innerWidth`
  - exposed callbacks: `openSettingsImmediate`, `toggleSettingsOpen`, `closeSettingsImmediate`, `clearSettingsHoverCloseTimer`, `desktopSettingsEnter`, `desktopSettingsLeave`, `desktopSettingsBlurCapture`
  - pointerdown-outside effect active only while `settingsOpen`
- [ ] Implement `useGnbMobileMenu()` with exact extracted behavior:
  - local `CloseReason` and `OutsideGesture` types
  - state: `mobileMenuState`
  - refs: `mobileMenuTriggerRef`, `mobileMenuCloseTimerRef`, `mobileMenuCloseReasonRef`, `outsideGestureRef`
  - exposed callbacks: `setMobileMenuOpen`, `requestMobileMenuClose`, `closeMobileMenuImmediate`, `clearMobileMenuCloseTimer`, backdrop pointer handlers
  - scroll lock effect active while state is not `'closed'`
- [ ] Implement `useGnbBackNavigation(options)` with exact extracted behavior:
  - local `MOBILE_TEST_BACK_FALLBACK_TIMEOUT_MS = 220`
  - refs: `mobileBackFallbackTimerRef`, `previousInternalPathRef`
  - pathname tracking effect with the original `sessionStorage` try/catch semantics
  - exposed callbacks: `handleTestBack`, `handleStandardBack`, `clearMobileBackFallbackTimer`
  - import `useRouter` only as a type source for the `router` option.
- [ ] Add barrel exports for all three hooks to `src/features/landing/gnb/hooks/index.ts`; keep existing exports unchanged.

Verification after Task 1:

```bash
npm run typecheck
```

Expected: pass. This checks the standalone hook signatures before `site-gnb.tsx` consumes them.

### Task 2: Refactor `site-gnb.tsx` To Consume Hooks

**Files:**
- Modify: `src/features/landing/gnb/site-gnb.tsx`

- [ ] Add imports for:
  - `useGnbDesktopSettings`
  - `useGnbMobileMenu`
  - `useGnbBackNavigation`
- [ ] Remove now-unneeded imports from `site-gnb.tsx`:
  - `type PointerEvent as ReactPointerEvent`
  - `DESKTOP_SETTINGS_HOVER_CLOSE_DELAY_MS`
  - `MOBILE_MENU_CLOSE_DURATION_MS`
  - `shouldCancelOutsideCloseAsScroll`
  - `shouldUseHistoryBack`
  - `MobileMenuState`
  - `SESSION_STORAGE_KEYS`
- [ ] Keep only the imports still used by retained code, including `shouldOpenDesktopSettingsByHover`.
- [ ] Replace extracted state/ref/callback blocks with:

```ts
const {
  settingsOpen,
  settingsRootRef,
  openSettingsImmediate,
  toggleSettingsOpen,
  closeSettingsImmediate,
  clearSettingsHoverCloseTimer,
  desktopSettingsEnter,
  desktopSettingsLeave,
  desktopSettingsBlurCapture
} = useGnbDesktopSettings({hoverOpenEnabled, viewportWidth, hoverCapable});

const {
  mobileMenuState,
  mobileMenuTriggerRef,
  setMobileMenuOpen,
  requestMobileMenuClose,
  closeMobileMenuImmediate,
  clearMobileMenuCloseTimer,
  mobileMenuBackdropPointerDown,
  mobileMenuBackdropPointerMove,
  mobileMenuBackdropPointerEnd
} = useGnbMobileMenu();

const {handleTestBack, handleStandardBack, clearMobileBackFallbackTimer} =
  useGnbBackNavigation({pathname, homeHref, router});
```

- [ ] Keep in `site-gnb.tsx`:
  - all CSS class name constants
  - `isVisibleFocusableElement`
  - all keyboard routing helpers and keyboard effects
  - Escape key effect
  - cleanup effect
  - `handleLocaleChange`
  - all JSX
- [ ] Update `handleLocaleChange` to call `closeMobileMenuImmediate()` instead of direct `setMobileMenuState('closed')`.
- [ ] Update the settings trigger:
  - focus fallback uses `openSettingsImmediate()`
  - click uses `toggleSettingsOpen`
- [ ] Update the mobile trigger open branch to call `setMobileMenuOpen()`.
- [ ] Keep cleanup effect in `site-gnb.tsx` and ensure deps include:
  - `clearSettingsHoverCloseTimer`
  - `clearMobileMenuCloseTimer`
  - `clearMobileBackFallbackTimer`
- [ ] Do not change JSX structure, class names, data attributes, aria attributes, or visible text.

Verification after Task 2:

```bash
npm run typecheck
```

Expected: pass.

### Task 3: Update Ownership Comments And QA Read Scopes

**Files:**
- Modify: `src/features/landing/storage/storage-keys.ts`
- Inspect and modify only if needed: `scripts/qa/*.mjs`

- [ ] Update the owner comments for `SESSION_STORAGE_KEYS.CURRENT_PATH` and `SESSION_STORAGE_KEYS.PREVIOUS_PATH` from `src/features/landing/gnb/site-gnb.tsx` to `src/features/landing/gnb/hooks/use-gnb-back-navigation.ts`.
- [ ] Search QA scripts:

```bash
rg -n "site-gnb|gnb/site-gnb|CURRENT_PATH|PREVIOUS_PATH|shouldUseHistoryBack|history\\.back|mobileBackFallback|MOBILE_TEST_BACK" scripts/qa
```

- [ ] For each match, determine whether the assertion reads logic moved into a hook.
- [ ] If a QA script checks session storage keys or back-navigation logic inside `site-gnb.tsx`, expand its read scope to include `src/features/landing/gnb/hooks/use-gnb-back-navigation.ts`.
- [ ] If a QA script checks logic moved entirely to a hook, update only the target path/read scope.
- [ ] If a QA script checks JSX, aria labels, or markers that remain in `site-gnb.tsx`, leave it unchanged.
- [ ] Do not alter assertion logic.

Verification after Task 3:

```bash
npm run qa:rules
```

Expected: pass with zero failures.

### Task 4: Full Verification Gate

**Files:**
- No planned edits unless verification reveals a regression.

- [ ] Run the requested full gate:

```bash
npm run qa:gate:once
```

Expected: pass with zero errors. This includes static QA, build, unit tests, and smoke E2E.

- [ ] Because `qa:rules` is a separate script and the user explicitly requested it, confirm it passes as part of `qa:gate:once` and rerun separately if gate output does not make the standalone `qa:rules` pass clear:

```bash
npm run qa:rules
```

Expected: pass with zero failures.

- [ ] If any step fails, diagnose the root cause, make the smallest scoped fix, and rerun the failed command before continuing.

## Post-Implementation Documentation Check

- Inspect `docs/` for descriptions of GNB behavior ownership that would become stale after hook extraction.
- Update only documentation that incorrectly names `site-gnb.tsx` as the owner of moved behavior.
- Do not update broad architecture docs unless the shipped implementation diverges from documented contracts.

## Acceptance Checklist

- [ ] `site-gnb.tsx` no longer owns desktop settings, mobile menu, or route-aware back-navigation internals.
- [ ] `site-gnb.tsx` still owns JSX, class constants, keyboard routing, Escape priority, cleanup coordination, and `handleLocaleChange`.
- [ ] No JSX structure or rendered output changed.
- [ ] No existing className values changed.
- [ ] `behavior.ts`, `use-gnb-capability.ts`, `use-theme-preference.ts`, and all test files are untouched.
- [ ] One hook exists per new file under `src/features/landing/gnb/hooks/`.
- [ ] Each new hook file includes the R-06 future-move comment.
- [ ] Ref types are preserved exactly.
- [ ] `src/features/landing/gnb/hooks/index.ts` exports the three new hooks and keeps existing exports.
- [ ] Storage key ownership comments point to `use-gnb-back-navigation.ts`.
- [ ] QA scripts are updated only if their read scopes target moved logic.
- [ ] `npm run qa:gate:once` passes.
- [ ] `npm run qa:rules` passes or is clearly shown passing within `qa:gate:once`.

## Implementation Outcome — 2026-05-02

- Implemented the three focused hooks:
  - `src/features/landing/gnb/hooks/use-gnb-desktop-settings.ts`
  - `src/features/landing/gnb/hooks/use-gnb-mobile-menu.ts`
  - `src/features/landing/gnb/hooks/use-gnb-back-navigation.ts`
- Refactored `src/features/landing/gnb/site-gnb.tsx` so it retains JSX, class constants, keyboard routing, Escape priority, cleanup coordination, locale switching, and theme switching.
- Updated `src/features/landing/gnb/hooks/index.ts` barrel exports.
- Updated `src/features/landing/storage/storage-keys.ts` owner comments for `CURRENT_PATH` and `PREVIOUS_PATH`.
- QA script read scopes were inspected and left unchanged because the only `site-gnb.tsx` read checks aria-label wiring that remains in `site-gnb.tsx`.
- Updated `docs/project-analysis.md` to remove the stale claim that `site-gnb.tsx` owns the moved behavior.

Verification status before 2026-05-03 baseline resolution:

- `npm run typecheck` passed after Task 1.
- `npm run typecheck` passed after Task 2.
- `npm run qa:rules` passed after Task 3.
- `npm run qa:gate:once` passed through lint, typecheck, `qa:rules`, build, and all unit tests, then failed in `test:e2e:smoke`.

Previously outstanding verification blockers:

- Chromium theme-matrix screenshot comparisons reproduce 1-10 pixel diffs on representative cases; GNB behavioral smoke and a11y smoke passed.

Resolved verification blockers:

- User approved WebKit installation; `npx playwright install webkit` completed and installed build `webkit-2227`.
- `PLAYWRIGHT_SERVER_MODE=preview npx playwright test tests/e2e/safari-hover-ghosting.spec.ts --project=webkit-ghosting --grep @smoke` passed: 6/6.
- 2026-05-03 follow-up resolved theme-matrix as a stale local baseline provenance issue, regenerated baselines from commit `8f65e2805fff94ac726c3be251c2cd20f1f1a0c7`, and confirmed `npm run qa:gate:once` PASS.
- Cleanup 4/5 documentation now lives in `tests/e2e/README.md`.
