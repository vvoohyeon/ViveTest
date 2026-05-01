# Phase 3 Test Storage Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:test-driven-development` for implementation. Project constraint: do not use subagents, automated multi-wave execution, or automated implementation pipelines; execute inline one unit at a time after explicit user approval.

**Goal:** Establish the Phase 3 test storage layer for active run detection, five independent state flags, and variant-scoped volatile run cleanup.

**Architecture:** Add a focused `src/features/test/storage/` API that owns ADR-B `test:{variant}:...` keys while preserving the Phase 3 legacy `instructionSeen` session key through `variantSessionKeys.instructionSeen(variantId)`. The layer remains unused by `test-question-client.tsx` in Phase 3; Phase 4 will wire runtime entry and route branching to this API. Cleanup is variant-scoped and trigger-independent for the three volatile triggers.

**Tech Stack:** Next.js 16, React 19, TypeScript strict mode, Vitest with JSDOM helpers, browser `localStorage` for ADR-B test keys, browser `sessionStorage` for the existing legacy `instructionSeen` key.

## Implementation Outcome (2026-05-01)

- Completed inline with TDD: active run tests failed before implementation, state flag tests failed before implementation, and volatility tests failed against the interim active-run-only cleanup before the full cleanup implementation.
- Implemented `src/features/test/storage/` public storage API for ADR-B keys: active run, response set key, five independent flags, and trigger-independent run data volatility.
- Preserved the Phase 3 legacy `instructionSeen` contract by deleting `variantSessionKeys.instructionSeen(variantId)` from `sessionStorage`; no `test:{variant}:instructionSeen` migration was introduced.
- Kept `src/features/test/storage/storage-keys.ts` as a compatibility re-export to the concrete Phase 3 key API in `test-storage-keys.ts`.
- Added blocker traceability evidence for `assertion:B5-active-run-timeout-boundary-unit`, `assertion:B6-volatility-trigger-cleanup-unit`, and `assertion:B17-cleanup-set-zero-residue-unit`; added the Phase 10 manual checkpoint `assertion:B17-cleanup-set-atomicity-e2e-phase10`.
- Updated stale storage-key wording in `docs/project-analysis.md` and `docs/agent-guides/project-rules.md`.
- Final verification passed: storage suite, test-flow scoped suite, `node scripts/qa/check-blocker-traceability.mjs`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

---

## Pre-Implementation Checks

- Root `AGENTS.md` was read. `.planning/STATE.md` does not exist.
- `docs/req-test.md` §3.7, §6.8, §8.2, §8.3 were read.
- `docs/req-test-plan.md` Part 5 and Gate A were read.
- `docs/agent-guides/project-rules.md` §TestFlow and `docs/agent-guides/verification-commands.md` §test-flow were read.
- `docs/project-analysis.md` §6 was read.
- `docs/AGENTS.md` does not exist in this repo; the applicable storage key SSOT language is in root `AGENTS.md` plus `docs/agent-guides/project-rules.md`.
- Gate A-1 is recorded complete in `docs/req-test-plan.md`.
- Gate A-2 code check passed: `src/features/landing/transition/runtime.ts` calls `writeLandingIngress({ variant, preAnswerChoice, createdAtMs, landingIngressFlag: true })`, and `src/features/landing/transition/store.ts` defines that record shape.
- Gate A-3 is not a Phase 3 blocker. Fixture ownership must be fixed before the first Phase 4 commit.

## Files To Be Modified

- Create: `src/features/test/storage/test-storage-keys.ts`
- Create: `src/features/test/storage/active-run.ts`
- Create: `src/features/test/storage/state-flags.ts`
- Create: `src/features/test/storage/volatility.ts`
- Create: `src/features/test/storage/index.ts`
- Modify: `src/features/test/storage/storage-keys.ts`
  - Existing Phase 3 placeholder. Keep it as a compatibility re-export so current project-rule references to `storage-keys.ts` remain valid while the requested Phase 3 API lives in `test-storage-keys.ts`.
- Create: `tests/unit/test-storage-active-run.test.ts`
- Create: `tests/unit/test-storage-state-flags.test.ts`
- Create: `tests/unit/test-storage-volatility.test.ts`
- Modify: `docs/blocker-traceability.json`
- Modify after implementation if stale wording remains: `docs/project-analysis.md`, `docs/agent-guides/project-rules.md`
- Update this plan with actual outcome if execution diverges.

## Relevant SSOT Contracts

- `docs/req-test.md` §3.7: active run is valid only when not completed and last answer is less than 30 minutes old; timeout immediately applies §6.8 volatility and returns Cold Start.
- `docs/req-test.md` §6.8: result screen entry commit, inactivity timeout, and restart commit success all delete run-continuation state including `instructionSeen`; no `instructionSeen` include/exclude branch.
- `docs/req-test.md` §8.2: five result-derivation state flags must remain separate.
- `docs/req-test.md` §8.3: cleanup is variant-scoped; variant switch and blocking data error keep `instructionSeen`.
- `docs/req-test-plan.md` Part 5: Phase 3 owns storage, active run, state flags, and data volatility.
- `docs/req-test-plan.md` Gate A-1: Phase 3 keeps legacy `vivetest-test-instruction-seen:{variant}` and does not migrate to `test:{variant}:instructionSeen`.
- `docs/agent-guides/project-rules.md` §TestFlow: preserve Phase 0-1 domain contracts and storage key SSOT boundaries.

## Impact Assessment

- Shared components (shell/GNB): no runtime UI or shell/GNB files will change.
- Localization: no message, route, or locale behavior changes.
- A11y: no user-facing UI changes.
- State contracts: high impact. This change introduces the Phase 3 storage contract and must be covered with unit tests.
- Core user flow: no live runtime wiring in Phase 3. `test-question-client.tsx` remains clean-room and does not import the new storage layer.
- Variant isolation: every key operation must use the provided `VariantId` and must not remove another variant's data.
- Security/input validation: storage JSON reads must avoid returning malformed active-run data.

## Decisions Requiring Confirmation Before Execution

- Approval to execute this plan.
- Approval to convert the existing `src/features/test/storage/storage-keys.ts` placeholder into a compatibility re-export instead of leaving stale Phase 3 TODO text.
- Approval that ADR-B `instructionSeen` migration is explicitly out of scope; Phase 3 deletes the legacy `vivetest-test-instruction-seen:{variant}` session key only.
- Approval that ADR-B test keys use `localStorage`, while the legacy `instructionSeen` key remains in `sessionStorage` because the current live key is defined under `variantSessionKeys`.

## Implementation Tasks

### Task 1: RED Active Run Tests

**Files:**
- Create: `tests/unit/test-storage-active-run.test.ts`

- [ ] Write failing tests first.

Test coverage:
- `assertion:B5-active-run-timeout-boundary-unit`: 30 minutes elapsed from `lastAnsweredAtMs` returns `null` and applies inactivity volatility.
- 29 minutes 59 seconds returns the saved active run.
- A valid active run returns the same value that was saved.
- Timing out one variant does not remove another variant's active run.

Representative test shape:

```ts
import {JSDOM} from 'jsdom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {asVariantId} from '../../src/features/test/domain';
import {getActiveRun, saveActiveRun, testVariantKey} from '../../src/features/test/storage';

describe('test storage active run', () => {
  beforeEach(() => {
    installDom();
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
  });

  afterEach(() => {
    vi.useRealTimers();
    uninstallDom();
  });

  it('assertion:B5-active-run-timeout-boundary-unit returns null and volatilizes after 30 minutes', () => {
    const variantId = asVariantId('qmbti');
    saveActiveRun(variantId, {
      variantId,
      startedAtMs: Date.now(),
      lastAnsweredAtMs: Date.now()
    });

    vi.advanceTimersByTime(30 * 60 * 1000);

    expect(getActiveRun(variantId)).toBeNull();
    expect(window.localStorage.getItem(testVariantKey.activeRun(variantId))).toBeNull();
  });
});
```

- [ ] Run RED command:

```bash
npm test -- tests/unit/test-storage-active-run.test.ts
```

Expected: fail because `src/features/test/storage` does not export the new active-run API yet.

### Task 2: GREEN Active Run + Key API

**Files:**
- Create: `src/features/test/storage/test-storage-keys.ts`
- Create: `src/features/test/storage/active-run.ts`
- Create: `src/features/test/storage/index.ts`
- Modify: `src/features/test/storage/storage-keys.ts`

- [ ] Implement the minimal key API.

Required shape:

```ts
import type {VariantId} from '@/features/test/domain';

export const STATE_FLAG_NAMES = [
  'derivation_in_progress',
  'derivation_computed',
  'min_loading_duration_elapsed',
  'result_entry_committed',
  'result_persisted'
] as const;

export type FlagName = (typeof STATE_FLAG_NAMES)[number];

export const testVariantKey = {
  flag: (variantId: VariantId, flagName: FlagName) => `test:${variantId}:flag:${flagName}` as const,
  activeRun: (variantId: VariantId) => `test:${variantId}:activeRun` as const,
  responseSet: (variantId: VariantId) => `test:${variantId}:responses` as const
} as const;
```

- [ ] Implement active-run storage over `window.localStorage`.

Required API:

```ts
export interface ActiveRun {
  variantId: VariantId;
  lastAnsweredAtMs: number;
  startedAtMs: number;
}

export function getActiveRun(variantId: VariantId): ActiveRun | null;
export function saveActiveRun(variantId: VariantId, run: ActiveRun): void;
export function writeLastAnsweredAt(variantId: VariantId): void;
export function clearActiveRun(variantId: VariantId): void;
```

Implementation decisions:
- Timeout threshold is `30 * 60 * 1000`.
- `Date.now() - lastAnsweredAtMs >= threshold` is timed out.
- Timeout calls `volatilizeRunData(variantId, 'inactivity')` and returns `null`.
- `writeLastAnsweredAt()` updates an existing run only; it does not create a run implicitly.
- Malformed stored JSON is removed and treated as no active run.

- [ ] Run GREEN command:

```bash
npm test -- tests/unit/test-storage-active-run.test.ts
```

Expected: pass.

### Task 3: RED/GREEN State Flags

**Files:**
- Create: `tests/unit/test-storage-state-flags.test.ts`
- Create: `src/features/test/storage/state-flags.ts`
- Modify: `src/features/test/storage/index.ts`

- [ ] Write failing tests.

Test coverage:
- Each of the five flags can be read and written independently.
- `clearAllFlags()` makes all five flags read `false`.
- Clearing one variant's flags does not affect another variant.

- [ ] Run RED command:

```bash
npm test -- tests/unit/test-storage-state-flags.test.ts
```

Expected: fail because `getFlag`, `setFlag`, and `clearAllFlags` are not implemented.

- [ ] Implement the minimal flag API.

Required API:

```ts
export function getFlag(variantId: VariantId, flagName: FlagName): boolean;
export function setFlag(variantId: VariantId, flagName: FlagName, value: boolean): void;
export function clearAllFlags(variantId: VariantId): void;
```

Implementation decisions:
- `true` is stored as the string `'true'`.
- `false` removes the flag key.
- `clearAllFlags()` iterates the five `STATE_FLAG_NAMES`.

- [ ] Run GREEN command:

```bash
npm test -- tests/unit/test-storage-state-flags.test.ts
```

Expected: pass.

### Task 4: RED/GREEN Volatility

**Files:**
- Create: `tests/unit/test-storage-volatility.test.ts`
- Create: `src/features/test/storage/volatility.ts`
- Modify: `src/features/test/storage/index.ts`

- [ ] Write failing tests.

Test coverage:
- `result_entry_committed`, `inactivity`, and `restart` each delete active run, response set, all five flags, and legacy `instructionSeen`.
- All three triggers produce the same deletion result.
- Other variant data remains intact.
- Legacy key `vivetest-test-instruction-seen:{variant}` is included through `variantSessionKeys.instructionSeen(variantId)`.
- Variant switch cleanup is Phase 4-owned and is not implemented through `volatilizeRunData()`; leave this as an assertion comment in the unit test file.
- `assertion:B17-cleanup-set-zero-residue-unit`: after volatility, the Phase 3 cleanup set for that variant has zero residual keys.

- [ ] Run RED command:

```bash
npm test -- tests/unit/test-storage-volatility.test.ts
```

Expected: fail because `volatilizeRunData` is not implemented.

- [ ] Implement the minimal volatility API.

Required API:

```ts
export type VolatilityTrigger = 'result_entry_committed' | 'inactivity' | 'restart';

export function volatilizeRunData(variantId: VariantId, trigger: VolatilityTrigger): void;
```

Implementation decisions:
- Do not branch deletion scope by trigger.
- Delete localStorage keys in this order: active run, response set, five flags.
- Delete the legacy sessionStorage key from `variantSessionKeys.instructionSeen(variantId)`.
- If a remove operation throws, call `console.error` once with the trigger and stop without retry.
- No ADR-B `test:{variant}:instructionSeen` key is read, written, or removed in Phase 3.

- [ ] Run GREEN command:

```bash
npm test -- tests/unit/test-storage-volatility.test.ts
```

Expected: pass.

### Task 5: Traceability And Docs

**Files:**
- Modify: `docs/blocker-traceability.json`
- Modify if stale after implementation: `docs/project-analysis.md`, `docs/agent-guides/project-rules.md`
- Update: `docs/plans/2026-05-01-phase-3-test-storage-lifecycle.md`

- [ ] Add automated evidence for blocker #5:

```json
{
  "blocker": 5,
  "kind": "automated_assertion",
  "file": "tests/unit/test-storage-active-run.test.ts",
  "assertionId": "assertion:B5-active-run-timeout-boundary-unit"
}
```

- [ ] Add automated evidence for blocker #6:

```json
{
  "blocker": 6,
  "kind": "automated_assertion",
  "file": "tests/unit/test-storage-volatility.test.ts",
  "assertionId": "assertion:B6-volatility-trigger-cleanup-unit"
}
```

- [ ] Add automated evidence and Phase 10 note for blocker #17:

```json
{
  "blocker": 17,
  "kind": "automated_assertion",
  "file": "tests/unit/test-storage-volatility.test.ts",
  "assertionId": "assertion:B17-cleanup-set-zero-residue-unit"
}
```

```json
{
  "blocker": 17,
  "kind": "manual_checkpoint",
  "file": "docs/req-test-plan.md",
  "assertionId": "assertion:B17-cleanup-set-atomicity-e2e-phase10"
}
```

- [ ] Run traceability verification:

```bash
node scripts/qa/check-blocker-traceability.mjs
```

Expected: pass.

### Task 6: Final Verification

Run in order:

```bash
npm test -- \
  tests/unit/test-storage-active-run.test.ts \
  tests/unit/test-storage-state-flags.test.ts \
  tests/unit/test-storage-volatility.test.ts
```

```bash
npm test -- \
  tests/unit/test-domain-variant-validation.test.ts \
  tests/unit/test-domain-question-model.test.ts \
  tests/unit/test-domain-derivation.test.ts \
  tests/unit/test-domain-type-segment.test.ts \
  tests/unit/test-entry-policy.test.ts \
  tests/unit/test-question-bootstrap.test.ts \
  tests/unit/variant-question-bank.test.ts \
  tests/unit/test-lazy-validation.test.ts \
  tests/unit/schema-registry.test.ts \
  tests/unit/test-storage-active-run.test.ts \
  tests/unit/test-storage-state-flags.test.ts \
  tests/unit/test-storage-volatility.test.ts
```

Then run the default Done gate in root `AGENTS.md` order:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Expected: all pass with zero errors.

## Non-Goals

- Do not modify `src/features/test/test-question-client.tsx`.
- Do not modify `src/features/variant-registry/**`.
- Do not implement Phase 4 recovery surfaces, staged entry lifecycle, or route classifiers.
- Do not implement Phase 5 instruction overlay behavior or migrate `instructionSeen` to `test:{variant}:instructionSeen`.
- Do not add external packages.
- Do not add Playwright E2E coverage; this plan does not touch AGENTS High-Risk UI paths.

## STATE.md Trigger Check

This approved plan has more than three tasks, but the planned remaining stages do not touch High-Risk files. If two independent plan units are completed and verified in this session, write `.planning/STATE.md` at the natural unit boundary and wait for user instruction before continuing.
