# T-04 GNB Hook Unit Tests Plan

## Goal

Add unit-level coverage for the extracted GNB hooks so state transitions, timers, and browser side effects are validated before E2E feedback.

## Interpretation

- Treat the existing hook behavior as the contract under test.
- Do not modify GNB runtime source unless a test exposes a source bug that must be explicitly re-confirmed.
- Use per-file jsdom with `// @vitest-environment jsdom` as the first line of each new hook test file.
- Do not modify `vitest.config.ts`, `gnb-theme-transition.test.ts`, `gnb-message-labels.test.ts`, or create `gnb-keyboard-mode.test.ts`.
- Exclude `desktopSettingsBlurCapture` unit coverage because `tests/e2e/gnb-smoke.spec.ts` B3 covers it.

## Files To Modify

- Modify: `package.json`
  - Add `@testing-library/react` to `devDependencies` because it is currently absent.
- Modify: `package-lock.json`
  - Let `npm install --save-dev @testing-library/react` update the lockfile.
- Create: `tests/unit/__mocks__/router.ts`
  - Shared `makeRouter()` helper with mocked app-router methods.
- Modify: `tests/unit/gnb-behavior.test.ts`
  - Add only the explicit `thresholdPx` override case to the existing scroll-cancel test block.
- Create: `tests/unit/gnb-desktop-settings.test.ts`
  - Cover initial state, immediate open/close/toggle, hover open/close timer, timer cancel, outside pointerdown close, and inside pointerdown no-op.
- Create: `tests/unit/gnb-mobile-menu.test.ts`
  - Cover closed/open/closing state transitions, close timer, no-op close, immediate close, body scroll lock, outside scroll-cancel gesture, and trigger focus restore.
- Create: `tests/unit/gnb-back-navigation.test.ts`
  - Cover standard back branching, mobile test back fallback/history paths, fallback timer behavior, sessionStorage failure fallback, and pathname tracking.

## Relevant SSOT Contract

- `docs/req-landing.md §6.4 GNB Contract`
  - Desktop settings open/close/focus/scroll-lock-adjacent rules.
  - Mobile menu backdrop, scroll-lock, close transition, scroll-cancel, and focus restore.
  - Mobile Test Back history-first fallback behavior.
- `docs/req-landing.md §9.1 Keyboard & Focus`
  - GNB controls must preserve focus behavior; mobile close restores focus to trigger.
- `docs/req-landing.md §10.2 GNB by Context`
  - GNB context rules defer to §6.4.
- `docs/req-landing.md §11.1 SSR/Hydration Determinism`
  - Tests should not encourage initial render access patterns outside effects.
- `docs/agent-guides/project-rules.md §Blog-Telemetry-Theme`
  - Keep GNB/theme QA surface aligned; no theme behavior changes here.
- `docs/agent-guides/verification-commands.md §landing`
  - Landing/GNB scope has broader E2E anchors, but this T-04 task explicitly limits execution to unit coverage and no E2E.

## Impact Assessment

- Shared components / GNB: Adds tests around extracted hook contracts only; no shared component behavior change.
- Localization: `homeHref` is a branded localized path in source, so tests will cast `'/en'` safely and avoid route-builder changes.
- Accessibility: Verifies focus restore after mobile menu close; does not alter focus behavior.
- State contracts: Captures desktop settings boolean state, mobile menu state machine, close reasons, timer cancellation, and back-navigation path tracking.
- Core user flow: Tests mobile Test Back fallback and internal history behavior without changing runtime navigation.
- Performance / responsiveness / design system consistency: No source or CSS changes; no new runtime cost.

## Options Considered

1. Use `@testing-library/react` `renderHook`.
   - Chosen because the task explicitly requests it and it gives direct hook-level feedback.
2. Reuse the existing `createRoot` harness style from other hook-like unit tests.
   - Rejected for this task because it would avoid the requested dependency and produce more boilerplate.
3. Add test-only exports for internal cancel functions.
   - Rejected because the public hook surface already exposes behavior through handlers and timers.

## Decisions Requiring User Confirmation

- Proceed with installing `@testing-library/react`, which will modify `package.json` and `package-lock.json`.
- Allow small test-shape corrections from the supplied snippets where required by current code:
  - Import and use `SESSION_STORAGE_KEYS` instead of hard-coded placeholders.
  - Set `window.history.length` to `2` for internal-history `handleTestBack` cases.
  - Control `window.location.pathname` with `history.replaceState` / `pushState` for fallback timer tests.
  - Dispatch outside pointer events from `document.body` so `event.target` is correct, rather than attempting to pass a `target` field in `PointerEventInit`.

## Implementation Plan

### Unit 1: Dependency And Router Mock

- Run `npm install --save-dev @testing-library/react`.
- Create `tests/unit/__mocks__/router.ts` exactly as a tiny shared mock factory.
- Verify that only package files and the new mock changed at this stage.

### Unit 2: Pure Behavior Test Addition

- Add the explicit `thresholdPx` override case inside the existing scroll-cancel test.
- Do not reorder or otherwise modify `tests/unit/gnb-behavior.test.ts`.
- Run `npx vitest run tests/unit/gnb-behavior.test.ts`.

### Unit 3: Desktop Settings Hook Test

- Create `tests/unit/gnb-desktop-settings.test.ts`.
- First line must be `// @vitest-environment jsdom`.
- Use fake timers in `beforeEach` and restore timers in `afterEach`.
- Cover immediate controls, hover-enabled and hover-disabled behavior, delayed hover close, timer cancellation, outside pointerdown close, inside pointerdown no-op, and closed-state pointerdown no-op.
- Do not add `desktopSettingsBlurCapture` tests.
- Run `npx vitest run tests/unit/gnb-desktop-settings.test.ts`.

### Unit 4: Mobile Menu Hook Test

- Create `tests/unit/gnb-mobile-menu.test.ts`.
- First line must be `// @vitest-environment jsdom`.
- Use fake timers and reset `document.body.style.overflow` / `touchAction` around every test.
- Cover `closed -> open -> closing -> closed`, close no-op outside open state, duplicate close no-op while closing, immediate close, scroll lock during open/closing, scroll unlock after close, outside scroll gesture cancellation through backdrop handlers, and trigger focus restore.
- Run `npx vitest run tests/unit/gnb-mobile-menu.test.ts`.

### Unit 5: Back Navigation Hook Test

- Create `tests/unit/gnb-back-navigation.test.ts`.
- First line must be `// @vitest-environment jsdom`.
- Import `SESSION_STORAGE_KEYS` from `src/features/landing/storage/storage-keys`.
- Use `makeRouter()` from `tests/unit/__mocks__/router.ts`.
- Mock `window.history.back`, `window.history.length`, and `document.referrer` per test.
- Cover `handleStandardBack`, `handleTestBack` fallback/history paths, unchanged-location fallback timer, changed-location no-fallback timer, sessionStorage unavailability, and pathname tracking.
- Run `npx vitest run tests/unit/gnb-back-navigation.test.ts`.

### Unit 6: Final Verification And Docs Check

- Run requested verification:
  - `npm run typecheck`
  - `npx vitest run tests/unit/gnb-behavior.test.ts`
  - `npx vitest run tests/unit/gnb-desktop-settings.test.ts`
  - `npx vitest run tests/unit/gnb-mobile-menu.test.ts`
  - `npx vitest run tests/unit/gnb-back-navigation.test.ts`
- Run AGENTS basic gates that are applicable without E2E:
  - `npm run lint`
  - `npm test`
  - `npm run build`
- Do not run E2E for this task unless separately requested.
- Inspect affected docs. Since this is test-only coverage plus dependency setup, no product contract doc update is expected unless implementation diverges from documented GNB behavior.

## Stop Conditions

- Stop and ask before modifying any runtime GNB source file.
- Stop and ask if `npm install` introduces an unexpected major dependency tree change unrelated to `@testing-library/react`.
- Stop and ask if any requested behavior conflicts with the current hook contract.

## Implementation Outcome

- Completed on `2026-05-05`.
- Runtime GNB source files were not modified.
- Added `@testing-library/react` as a devDependency via `npm install --save-dev @testing-library/react`.
- Added the requested `thresholdPx` override case to `tests/unit/gnb-behavior.test.ts`.
- Added hook unit coverage for:
  - `tests/unit/gnb-desktop-settings.test.ts`
  - `tests/unit/gnb-mobile-menu.test.ts`
  - `tests/unit/gnb-back-navigation.test.ts`
- Added shared router mock:
  - `tests/unit/__mocks__/router.ts`

## Verification Results

- `npm run lint` — passed.
- `npm run typecheck` — passed.
- `npx vitest run tests/unit/gnb-behavior.test.ts tests/unit/gnb-desktop-settings.test.ts tests/unit/gnb-mobile-menu.test.ts tests/unit/gnb-back-navigation.test.ts` — passed, 36 tests.
- `npm test` — passed, 53 files / 306 tests.
- `npm run build` — passed.
- E2E was not run per T-04 scope.
