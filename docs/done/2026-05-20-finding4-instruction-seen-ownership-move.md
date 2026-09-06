# Finding 4 InstructionSeen Ownership Move Implementation Plan

**Goal:** Move `instructionSeen` key/helper ownership into the test domain without changing the persisted key format or user-facing test-flow behavior.

**Architecture:** Add a single test-domain storage module at `src/features/test/storage/instruction-seen.ts`, move the legacy key factory and three sessionStorage helpers there, and update production/tests/docs to consume that new owner. `src/features/transition/store.ts` retains landing/transition storage helpers only; `src/features/landing/storage/storage-keys.ts` retains `landingIngress` only in `variantSessionKeys`.

**Plan mode reason:** This touches `src/features/transition/` (High-Risk Area) and SSOT docs (`docs/req-test-plan.md`, `docs/agent-guides/project-rules.md`), so approval is required before source/test/docs implementation.

---

## Current Evidence

- `.planning/STATE.md` is absent.
- `src/features/test/use-test-entry-orchestrator.ts` currently imports `markInstructionSeen` directly from `@/features/transition/store`, satisfying the Finding 3 prerequisite.
- `docs/req-test-plan.md` already reflects Finding 3 inline execution at the SD-1 line: no remaining `useEntrySideEffects` reference there.
- `docs/req-test.md` contains behavioral `instructionSeen` contracts only; current search found no explicit `transition/store.ts` or `landing/storage/storage-keys.ts` ownership reference.
- `docs/project-analysis.md` does contain an explicit ownership statement that the live `instructionSeen` key is managed through `src/features/transition/store.ts`; this plan includes a minimal sync for that current doc drift.

## Files To Create Or Modify

- Create `src/features/test/storage/instruction-seen.ts` — new test-domain owner for `instructionSeenKey`, `markInstructionSeen`, `clearInstructionSeen`, `hasSeenInstruction`, with file-local SSR-safe `getSessionStorage()`.
- Modify `src/features/test/use-test-run-bootstrap.ts` — move `clearInstructionSeen` and `hasSeenInstruction` imports from transition store to test storage; no logic changes.
- Modify `src/features/test/use-test-entry-orchestrator.ts` — move `markInstructionSeen` import from transition store to test storage; keep `clearLandingIngress` on transition store; no logic changes.
- Modify `src/features/test/storage/volatility.ts` — replace `variantSessionKeys.instructionSeen(variantId)` with `instructionSeenKey(variantId)` and remove the cross-namespace delete comment.
- Modify `src/features/transition/store.ts` — remove the `instructionSeen` helper exports and the cross-namespace NOTE; retain `variantSessionKeys` import because `landingIngress` helpers still use it.
- Modify `src/features/landing/storage/storage-keys.ts` — remove the `variantSessionKeys.instructionSeen` entry and its JSDoc; keep `landingIngress` unchanged.
- Modify `src/features/test/storage/test-storage-keys.ts` — replace the old cross-namespace NOTE with the new test-domain ownership comment.
- Modify `tests/unit/use-test-run-controller.test.ts` — split mocks/imports so instructionSeen helpers come from `../../src/features/test/storage/instruction-seen` and transition-only helpers stay on `../../src/features/transition/store`.
- Modify `tests/unit/test-entry-orchestrator-qualifier.test.ts` — mock/import `markInstructionSeen` from `@/features/test/storage/instruction-seen`; keep transition mock for `clearLandingIngress`.
- Modify `tests/unit/test-entry-orchestrator-reentry.test.ts` — move the unused `markInstructionSeen` mock off `@/features/transition/store`; add a dedicated mock for `@/features/test/storage/instruction-seen` if the production import requires interception.
- Modify `tests/unit/use-test-entry-orchestrator.test.ts` — split `clearLandingIngress` and `markInstructionSeen` mocks/imports across transition store and new test storage module.
- Modify `tests/unit/test-storage-volatility.test.ts` — import `instructionSeenKey` from the new test storage file and replace all `variantSessionKeys.instructionSeen(variantId)` assertions.
- Modify `docs/agent-guides/project-rules.md` — rewrite the Test Flow storage SSOT bullets to state `instructionSeen` key/helper ownership in `src/features/test/storage/instruction-seen.ts` and defer only key-format migration to Phase 5.
- Modify `docs/req-test-plan.md` — separate `instructionSeen` ownership status from key-format status, mark Finding 4 ownership move complete, and keep the legacy key format migration deferred to Phase 5.
- Modify `docs/project-analysis.md` — minimal sync for the explicit `transition/store.ts` ownership statement and stale test-entry orchestration prose so structural analysis matches the new owner.

## Files Confirmed Out Of Scope

- No changes to `docs/req-test.md` unless implementation-time search finds an explicit file-path ownership reference.
- No changes to E2E files: `tests/e2e/routing-smoke.spec.ts`, `tests/e2e/qualifier-overlay.spec.ts`, `tests/e2e/consent-smoke.spec.ts`.
- No changes to QA scripts are planned.
- No re-export or alias from `src/features/landing/storage/storage-keys.ts`.
- No change to key string format: `vivetest-test-instruction-seen:{variant}` remains live.

## Impact Assessment

- Shared components / shell / GNB: no direct UI or shell changes.
- Localization: no message or locale-surface changes.
- A11y: no rendered markup changes; risk is limited to instruction overlay visibility state.
- State contracts: primary risk. The same sessionStorage key must be read, written, and cleared from a new owner without changing lifetime semantics.
- Core user flow: instruction overlay skip/re-display, active-run resume invalidation, restart/timeout/result cleanup, and qualifier re-entry must remain behaviorally identical.
- High-risk dimension for `src/features/transition/`: usability and state-contract regression risk. The transition store export surface shrinks, but landing ingress and transition storage behavior must remain untouched.

## Implementation Units

### Unit 1 — New Owner And Production Imports

1. Create `src/features/test/storage/instruction-seen.ts` with the existing SSR guard + try/catch sessionStorage pattern.
2. Move the legacy key string factory into `instructionSeenKey(variant: string)`.
3. Update bootstrap, orchestrator, and volatility imports to consume the new owner.
4. Remove the old helper exports from `src/features/transition/store.ts`.
5. Remove `variantSessionKeys.instructionSeen` from `src/features/landing/storage/storage-keys.ts`.
6. Update `src/features/test/storage/test-storage-keys.ts` comment only.

### Unit 2 — Unit Test Import/Mock Paths

1. Split instructionSeen helper mocks away from transition store in the four orchestrator/controller tests.
2. Update volatility test assertions to use `instructionSeenKey`.
3. Keep all test logic, mock behavior, and assertions unchanged except for module ownership paths.

### Unit 3 — Documentation Sync

1. Update `docs/agent-guides/project-rules.md` as specified in the instruction.
2. Update `docs/req-test-plan.md` ownership/format wording and checklist status.
3. Confirm `docs/req-test.md` still has no file-path ownership references before skipping it.
4. Update `docs/project-analysis.md` only where it explicitly names the old owner or stale entry-side-effect ownership.

## Validation Commands

Run after implementation, in this order:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run qa:rules
```

Scope-specific checks:

```bash
node scripts/qa/check-phase10-transition-contracts.mjs
node scripts/qa/check-phase11-telemetry-contracts.mjs
npm test -- \
  tests/unit/landing-telemetry-validation.test.ts \
  tests/unit/landing-telemetry-runtime.test.ts \
  tests/unit/landing-transition-runtime.test.ts \
  tests/unit/landing-transition-store.test.ts
npm test -- \
  tests/unit/test-domain-variant-validation.test.ts \
  tests/unit/test-domain-question-model.test.ts \
  tests/unit/test-domain-derivation.test.ts \
  tests/unit/test-domain-type-segment.test.ts \
  tests/unit/test-entry-policy.test.ts \
  tests/unit/test-question-bootstrap.test.ts \
  tests/unit/variant-question-bank.test.ts \
  tests/unit/test-lazy-validation.test.ts \
  tests/unit/schema-registry.test.ts
npx playwright test \
  tests/e2e/consent-smoke.spec.ts \
  tests/e2e/transition-telemetry-smoke.spec.ts
```

Ownership/search checks:

```bash
rg -n "markInstructionSeen|clearInstructionSeen|hasSeenInstruction" src/features/transition/store.ts src tests/unit
rg -n "variantSessionKeys\\.instructionSeen" src
rg -n "from ['\\\"][^'\\\"]*features/transition/store['\\\"]" src/features/test tests/unit
```

Expected ownership results:

- `src/features/transition/store.ts` has zero `markInstructionSeen`, `clearInstructionSeen`, or `hasSeenInstruction` declarations.
- No test-domain import of those three helpers remains from transition store.
- `variantSessionKeys.instructionSeen` has zero occurrences in `src/`.

## Expected Test Baseline After Change

- Unit test files: 73 passed.
- Unit test cases: 479 passed.
- E2E baseline remains 125 passed because E2E behavior and E2E files are unchanged; targeted Playwright regression coverage should pass for consent and transition telemetry.
- TypeScript: `npm run typecheck` / `tsc --noEmit` reports 0 errors.
- QA script suite: `npm run qa:rules` reports 0 failures.
- Net source/test/doc file count: +1 created file, 0 deleted files.

## Decisions Requiring User Approval

- Approving this plan authorizes the source/test/docs changes listed above, including the additional `docs/project-analysis.md` sync found during current-code evidence review.
- No product, UX, key-format, E2E literal, package, build-config, or QA-script behavior change is authorized by this plan.

## Implementation Result — 2026-05-20

- Created `src/features/test/storage/instruction-seen.ts` as the test-domain owner for the legacy `vivetest-test-instruction-seen:{variant}` key and helper functions.
- Removed `instructionSeen` helper ownership from `src/features/transition/store.ts` and removed `variantSessionKeys.instructionSeen` from landing storage keys.
- Updated production imports, volatility cleanup, and affected unit mocks/assertions to consume the new test storage owner.
- Synced `docs/agent-guides/project-rules.md`, `docs/req-test-plan.md`, and `docs/project-analysis.md`; `docs/req-test.md` was left unchanged because it contains behavioral contracts only, not file-path ownership references.
- Validation passed: `git diff --check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run qa:rules`, Phase 10/11 QA scripts, targeted transition/telemetry unit tests, targeted test-domain unit tests, and preview-mode Playwright consent/transition telemetry bundle (`35 passed`).
- Note: the first dev-mode Playwright bundle failed one transition-overlay case and the first preview bundle failed one mobile lifecycle case; the failing mobile case passed isolated, and the full preview bundle passed on rerun.
