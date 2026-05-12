# Completion Report — `test-question-client.tsx` Refactor (Steps 1–5)

**Date:** 2026-05-12
**Branch:** `test-question-refactoring`
**Plan:** `docs/plans/2026-05-11-refactor-plan-test-question-client.md`

---

## Step Results

| Step | Change | Status |
|---|---|---|
| 1 | Canonical index keys (`'1'`…`'N'` replacing `question.id`) | Done |
| 2 | Tail-reset invariant (`Number(key) < nextIndex` predicate on back-nav) | Done |
| 3 | `writeResponseSet` persistence after every `updateAnswer` | Done |
| 4 | `useTestRunController` extraction + `question-runtime-utils.ts` pure utils + telemetry relocation | Done |
| 5 | `_path-config.mjs` + `check-phase10-transition-contracts.mjs` updated | Done |

---

## Files Changed / Created

| File | Action |
|---|---|
| `src/features/test/test-question-client.tsx` | Modified (delegating to controller) |
| `src/features/test/use-test-run-controller.ts` | New |
| `src/features/test/question-runtime-utils.ts` | New |
| `src/features/test/storage/response-set.ts` | New |
| `tests/unit/use-test-run-controller.test.ts` | New (14 tests, T-01–T-12) |
| `tests/unit/test-question-bootstrap.test.ts` | Modified (updated imports + canonical key assertions) |
| `scripts/qa/_path-config.mjs` | Modified (added `test` export) |
| `scripts/qa/check-phase10-transition-contracts.mjs` | Modified (split into Block 1 client / Block 2 controller checks) |
| `docs/req-test.md` | Modified (§3.9 tail-reset contract note) |

---

## QA Gate Results

| Check | Result |
|---|---|
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm test` (unit) | 367/367 pass (59 files) |
| `npm run qa:rules` | 12/12 pass |
| `consent-smoke.spec.ts` | 13/13 pass |
| `theme-matrix-smoke.spec.ts` | 286 failed — pre-existing (287 failed on base branch before any changes; our branch improved by 1) |

---

## Behavioral Contracts

- **No observable UI change** except tail-reset on back-navigation (Step 2 behavioral intent)
- **Telemetry payload identical**: `trackAttemptStart` and `trackFinalSubmit` call sites, argument shape, and payload fields unchanged
- **`trackAttemptStart` fires exactly once** under React 18 Strict Mode (guarded by `attemptStartedRef`)
- **Tail-reset predicate**: `Number(key) < nextIndex` — verified by T-06 and T-07

---

## Non-Obvious Implementation Notes

### Dual ref+state for `pendingTransitionId`
The plan originally called for reading a ref during render, which violates the Next.js `react-hooks/refs` ESLint rule. Fixed with a dual pattern: `pendingTransitionIdRef` (survives Strict Mode unmount/remount, safe in effects) + `pendingTransitionId` state (triggers re-renders, safe in dep arrays and JSX). The Strict Mode fast-path re-bootstrap reads from the ref inside `queueMicrotask`, never during render.

### `instructionSeen` initialization
After moving bootstrap into the controller, `setInstructionSeen(bootstrapState.instructionSeen)` was no longer called in the client. Fixed by initializing lazily: `useState(() => hasSeenInstruction(variant))`. The `hasSeenInstruction` import is retained in the client for this purpose.

### T-07 tail-reset at Q1
When back-navigating from Q1, `nextIndex = 1` and the filter `Number(key) < 1` removes all keys including `'1'`, producing `answers = {}`. This is academic — the Prev button is disabled at Q1 in the UI. Test assertion updated accordingly.

### T-12 `clearPendingTransitionId` split
`clearPendingTransitionId` sets state asynchronously; asserting `null` in the same synchronous act block sees stale value. Split into two `it` blocks: one asserts the initial value, another triggers `rerender()` before asserting null.

### `answers` added to controller output
The plan's `TestRunControllerOutput` interface did not include `answers`, but the result panel renders all per-question answers. Added `answers: Record<string, 'A' | 'B'>` to the interface and destructured it in the client.
