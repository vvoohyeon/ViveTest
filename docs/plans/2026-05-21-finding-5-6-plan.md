# Finding 5 + 6 Implementation Plan

**Goal:** Extract the bootstrap-state resolver domain from `src/features/test/question-runtime-utils.ts` into `src/features/test/bootstrap-state-resolver.ts`, then trim `question-runtime-utils.ts` to shared/controller runtime helpers only.

**Architecture:** `bootstrap-state-resolver.ts` will own initial/resume/bootstrap state resolution and landing ingress to first scoring answer mapping. `question-runtime-utils.ts` will retain only live runtime helpers used by the controller, client, result panel, and focused unit tests. This is a pure ownership move plus dead-export cleanup; behavior, storage keys, E2E contracts, and test counts must remain unchanged.

**Implementation gate:** Do not implement until this plan receives explicit approval.

---

## 1. Pre-condition results

| Check | Result | Evidence |
|---|---|---|
| `npm test` exits with 0 failures, 73 test files, 479 test cases | PASS | `npm test` exited 0. Output: `Test Files 73 passed (73)`, `Tests 479 passed (479)`. |
| `npm run typecheck` exits with 0 errors | PASS | `npm run typecheck` exited 0 after `next typegen` and `tsc --noEmit`. |
| `src/features/test/question-runtime-utils.ts` exists | PASS | File exists on disk. |
| `src/features/test/bootstrap-state-resolver.ts` does not exist | PASS | File is absent on disk. |
| `scripts/qa/_path-config.mjs` exports `test.testRunBootstrap` and does not export `test.bootstrapStateResolver` | PASS | `test.testRunBootstrap` is present; `test.bootstrapStateResolver` is absent. |

Disk notes and discrepancies against the prompt:

- `scripts/qa/_path-config.mjs` currently has `entrySideEffects: 'src/features/test/use-entry-side-effects.ts'`, and `scripts/qa/check-phase10-transition-contracts.mjs` references `test.entrySideEffects`.
- The prompt says the `entrySideEffects` file no longer exists, but `src/features/test/use-entry-side-effects.ts` does exist on disk. This plan still follows the requested cleanup of the QA path key/reference only; it does not delete or edit `use-entry-side-effects.ts`.
- `docs/req-test-plan.md` contains bootstrap function references but no `question-runtime-utils.ts` owner/path reference, so this plan skips `docs/req-test-plan.md`.
- Current `question-runtime-utils.ts` imports `ActiveRun` through `@/features/test/storage`; the new resolver will use the requested direct import from `@/features/test/storage/active-run`, which exists and is already used by `use-test-run-bootstrap.ts`.

## 2. Exact file list

Plan artifact created in this planning-only step:

| Action | File | Description |
|---|---|---|
| Create now | `docs/plans/finding-5-6-plan.md` | This plan. No source files are modified in this step. |

Implementation files after approval:

| Action | File | Description |
|---|---|---|
| Create | `src/features/test/bootstrap-state-resolver.ts` | Owns `QuestionRuntimeState`, `QuestionBootstrapEntryMode`, `QuestionBootstrapState`, `resolveInitialQuestionIndex`, `resolveInitialAnswers`, `resolveResumeQuestionIndex`, `buildBootstrapResponseSet`, `resolveQuestionBootstrapState`, and the moved private bootstrap helpers. Imports `findFirstScoringQuestion` from `./question-runtime-utils`. Declares its own local `type ResponseSet = Record<string, 'A' | 'B'>`. |
| Modify | `src/features/test/question-runtime-utils.ts` | Retains only `ScoringProgress`, `findFirstScoringQuestion`, `skipForwardPastProfile`, `skipBackwardPastProfile`, `resolveScoringProgress`, and `isProfileQuestion`. Removes moved bootstrap code, removes `buildInitialRuntimeState` and `hasSemanticAnswer`, removes now-unused transition/storage/canonical-key imports, and declares its own local `ResponseSet` alias for scoring progress input. |
| Modify | `src/features/test/use-test-run-bootstrap.ts` | Import-only change: bootstrap resolver exports move from `question-runtime-utils` to `bootstrap-state-resolver`. No logic changes. |
| Modify | `tests/unit/test-question-bootstrap.test.ts` | Split imports so bootstrap resolver functions come from `bootstrap-state-resolver`, while scoring/profile navigation helpers remain from `question-runtime-utils`. No assertion changes and no new cases. |
| Modify | `scripts/qa/_path-config.mjs` | Add `test.bootstrapStateResolver`; remove `test.entrySideEffects`; do not add `questionRuntimeUtils`. No other keys change. |
| Modify | `scripts/qa/check-phase10-transition-contracts.mjs` | Remove the `test.entrySideEffects` file-exists/read/check block and any `entrySideEffects` path-key reference. Do not add new `bootstrapStateResolver` QA checks in this task. |
| Modify | `docs/agent-guides/project-rules.md` | Add the landing ingress to runtime answer boundary ownership text in the Storage Key SSOT or nearby ownership section. |
| Delete | none | No files are deleted. Only exports/path keys are removed. |

Verified no-change files:

| File | Plan |
|---|---|
| `src/features/test/test-question-client.tsx` | Existing `isProfileQuestion` import from `question-runtime-utils` remains unchanged. |
| `src/features/test/test-result-panel.tsx` | Existing `isProfileQuestion` import from `question-runtime-utils` remains unchanged. |
| `tests/unit/test-question-runtime-utils.test.ts` | Existing `isProfileQuestion` import remains unchanged. |
| `src/features/test/use-test-run-controller.ts` | Existing imports from `question-runtime-utils` remain unchanged and must still resolve after trimming. No logic changes. |
| `src/features/test/use-test-entry-orchestrator.ts` | Out of scope; no changes. |
| `docs/req-test.md` | Explicitly out of scope; no changes. |
| `docs/req-test-plan.md` | No `question-runtime-utils.ts` owner/path reference found; no changes. |
| `tests/e2e/**` | Out of scope; no E2E spec/helper edits. |

Relevant SSOT and project rules:

- `docs/req-test.md` sections `3.3`, `3.4`, `3.5`, `3.6`, response/progress rules, and telemetry timing rules: entry path, runtime entry commit, staged entry, instruction gate, canonical response keying, and scoring-only progress stay unchanged.
- `docs/req-test-plan.md` SD-2: `resolveQuestionBootstrapState()` stays storage-free; callers pass `activeRun` and `responseSet` inputs.
- `docs/req-landing.md` sections `12`, `13.4`, `13.5`, and `13.6`: `card_answered`, `attempt_start`, landing ingress flag, `scoring1` pre-answer, and pre-answer lifecycle remain unchanged.
- `docs/agent-guides/project-rules.md#TestFlow`: canonical test surface remains `src/features/test/**`; no unauthorized storage keys are introduced.
- `docs/agent-guides/verification-commands.md#test-flow`: focused test-flow unit coverage is applicable after the Basic Gates.

Impact assessment:

- Shared components / shell / GNB: no impact.
- Localization: no message or copy changes.
- A11y: no UI behavior or markup changes.
- State contracts: storage key formats and landing ingress precedence are preserved. `vivetest-landing-ingress:{variant}` and `preAnswerChoice` stay unchanged.
- Core user flow: direct cold start, direct resume, landing ingress, profile prerequisite handling, answer navigation, scoring progress, and submit eligibility must remain identical.
- QA surface: `scripts/qa/*.mjs` is Ask First; the only QA change is removing a stale path-config key/reference and adding the new resolver path key without new static assertions.
- Decisions requiring user confirmation: approve this plan before implementation. No additional product, UX, or architecture decision is currently unresolved.

## 3. Import delta table

| File | Current import | New import |
|---|---|---|
| `src/features/test/bootstrap-state-resolver.ts` | New file | ```typescript\nimport type {LandingIngressRecord, PendingLandingTransition} from '@/features/transition/store';\nimport {CANONICAL_INDEX_KEY_PATTERN} from '@/features/test/canonical-key';\nimport type {ResolvedQuestion} from '@/features/test/question-bank';\nimport type {ActiveRun} from '@/features/test/storage/active-run';\nimport {findFirstScoringQuestion} from './question-runtime-utils';\n``` |
| `src/features/test/question-runtime-utils.ts` | ```typescript\nimport type {LandingIngressRecord, PendingLandingTransition} from '@/features/transition/store';\nimport type {ResolvedQuestion} from '@/features/test/question-bank';\nimport type {ActiveRun} from '@/features/test/storage';\nimport {CANONICAL_INDEX_KEY_PATTERN} from '@/features/test/canonical-key';\n``` | ```typescript\nimport type {ResolvedQuestion} from '@/features/test/question-bank';\n``` |
| `src/features/test/use-test-run-bootstrap.ts` | ```typescript\nimport {\n  buildBootstrapResponseSet,\n  resolveQuestionBootstrapState,\n  type QuestionBootstrapState\n} from '@/features/test/question-runtime-utils';\n``` | ```typescript\nimport {\n  buildBootstrapResponseSet,\n  resolveQuestionBootstrapState,\n  type QuestionBootstrapState\n} from '@/features/test/bootstrap-state-resolver';\n``` |
| `src/features/test/use-test-run-controller.ts` | ```typescript\nimport {\n  findFirstScoringQuestion,\n  isProfileQuestion,\n  resolveScoringProgress,\n  skipBackwardPastProfile,\n  skipForwardPastProfile,\n  type ScoringProgress\n} from '@/features/test/question-runtime-utils';\n``` | Unchanged. |
| `src/features/test/test-question-client.tsx` | ```typescript\nimport {isProfileQuestion} from '@/features/test/question-runtime-utils';\n``` | Unchanged. |
| `src/features/test/test-result-panel.tsx` | ```typescript\nimport {isProfileQuestion} from '@/features/test/question-runtime-utils';\n``` | Unchanged. |
| `tests/unit/test-question-bootstrap.test.ts` | ```typescript\nimport {\n  buildBootstrapResponseSet,\n  resolveQuestionBootstrapState,\n  resolveResumeQuestionIndex,\n  resolveScoringProgress,\n  skipBackwardPastProfile,\n  skipForwardPastProfile\n} from '../../src/features/test/question-runtime-utils';\n``` | ```typescript\nimport {\n  buildBootstrapResponseSet,\n  resolveQuestionBootstrapState,\n  resolveResumeQuestionIndex\n} from '../../src/features/test/bootstrap-state-resolver';\nimport {\n  resolveScoringProgress,\n  skipBackwardPastProfile,\n  skipForwardPastProfile\n} from '../../src/features/test/question-runtime-utils';\n``` |
| `tests/unit/test-question-runtime-utils.test.ts` | ```typescript\nimport {isProfileQuestion} from '@/features/test/question-runtime-utils';\n``` | Unchanged. |

Implementation notes:

- `bootstrap-state-resolver.ts` must not be a barrel re-export. It owns the moved code directly.
- `bootstrap-state-resolver.ts` must import `findFirstScoringQuestion` from `./question-runtime-utils`; it must not duplicate that helper.
- Both `bootstrap-state-resolver.ts` and `question-runtime-utils.ts` declare their own local `type ResponseSet = Record<string, 'A' | 'B'>`.
- `resolveScoringProgress()` must preserve the current semantic-answer filter inline after `hasSemanticAnswer` is deleted; do not add a new exported helper.

## 4. Dead export removal

Task 2 analysis / Finding [6] identifies `question-runtime-utils.ts` as a catch-all for bootstrap, profile skipping, response filtering, and progress (`docs/reports/pre-result-refactoring-candidate-survey.md:69-72`). A fresh disk scan confirms the following four currently exported functions have zero external source/test consumers and can leave the `question-runtime-utils.ts` public API without consumer rewiring:

| Export | Action | External source/test consumers | Evidence |
|---|---|---:|---|
| `buildInitialRuntimeState` | DELETE | 0 | Only current source hit is the export in `question-runtime-utils.ts`; other hits are historical docs/plans. |
| `resolveInitialQuestionIndex` | MOVE to `bootstrap-state-resolver.ts` | 0 | Current source hits are the export and internal bootstrap call inside `question-runtime-utils.ts`; no external source/test import. |
| `resolveInitialAnswers` | MOVE to `bootstrap-state-resolver.ts` | 0 | Current source hits are the export and internal bootstrap call inside `question-runtime-utils.ts`; no external source/test import. |
| `hasSemanticAnswer` | DELETE as exported API | 0 | Current source hits are internal to `question-runtime-utils.ts`; no external source/test import. Its behavior remains inline where needed. |

Not counted as dead exports:

- `QuestionRuntimeState`, `QuestionBootstrapEntryMode`, and `QuestionBootstrapState` move to `bootstrap-state-resolver.ts` because they remain part of the bootstrap resolver API.
- `resolveResumeQuestionIndex`, `buildBootstrapResponseSet`, and `resolveQuestionBootstrapState` move because `tests/unit/test-question-bootstrap.test.ts` and/or `use-test-run-bootstrap.ts` still consume them from the new owner.
- `ScoringProgress`, `findFirstScoringQuestion`, `skipForwardPastProfile`, `skipBackwardPastProfile`, `resolveScoringProgress`, and `isProfileQuestion` stay in `question-runtime-utils.ts`.

## 5. `_path-config.mjs` delta

Before:

```js
export const test = {
  questionClient: 'src/features/test/test-question-client.tsx',
  answerLock: 'src/features/test/use-answer-lock.ts',
  answerHandler: 'src/features/test/use-answer-handler.ts',
  runController: 'src/features/test/use-test-run-controller.ts',
  testRunBootstrap: 'src/features/test/use-test-run-bootstrap.ts',
  runReducer: 'src/features/test/test-run-reducer.ts',
  entryOrchestrator: 'src/features/test/use-test-entry-orchestrator.ts',
  entrySideEffects: 'src/features/test/use-entry-side-effects.ts'
};
```

After:

```js
export const test = {
  questionClient: 'src/features/test/test-question-client.tsx',
  answerLock: 'src/features/test/use-answer-lock.ts',
  answerHandler: 'src/features/test/use-answer-handler.ts',
  runController: 'src/features/test/use-test-run-controller.ts',
  testRunBootstrap: 'src/features/test/use-test-run-bootstrap.ts',
  bootstrapStateResolver: 'src/features/test/bootstrap-state-resolver.ts',
  runReducer: 'src/features/test/test-run-reducer.ts',
  entryOrchestrator: 'src/features/test/use-test-entry-orchestrator.ts'
};
```

Additional QA-script delta:

- Remove the `if (fileExists(test.entrySideEffects)) { ... }` block from `scripts/qa/check-phase10-transition-contracts.mjs`.
- Remove every `entrySideEffects` path-config key reference from that script.
- Leave `requiredFiles` otherwise unchanged.
- Do not add a static QA assertion for `test.bootstrapStateResolver` in this task.

## 6. `project-rules.md` addition

Add this exact text under `docs/agent-guides/project-rules.md` `Storage Key SSOT` or the nearest ownership subsection:

```markdown
- Landing ingress → runtime answer boundary:
  - `writeLandingIngress` / `readLandingIngress` / `clearLandingIngress` → `src/features/transition/store.ts`
  - `preAnswerChoice → first scoring answer` bootstrap mapping → `src/features/test/bootstrap-state-resolver.ts`
  - Bootstrap state resolution (question index, resume path, ingress precedence) → `src/features/test/bootstrap-state-resolver.ts`
```

No other section of `docs/agent-guides/project-rules.md` should change.

## 7. Verification sequence

Run these after implementation, in order:

1. `npm run lint`
2. `npm run typecheck`
3. `npm test`
4. `npm run build`
5. `npm run qa:rules`
6. Focused suites:
   - `npx vitest run tests/unit/test-question-bootstrap.test.ts`
   - `npx vitest run tests/unit/test-question-runtime-utils.test.ts`

If a failure requires any source/test/QA fix, restart the ordered sequence from `npm run lint` so the final evidence is one contiguous green run.

## 8. Expected test result

- Expected full unit result after implementation: 73 test files, 479 test cases, all passing.
- No new test files are added.
- No new test cases are added.
- Existing assertions in `tests/unit/test-question-bootstrap.test.ts` and `tests/unit/test-question-runtime-utils.test.ts` must pass with the new import ownership.

## 9. Risk register

| Risk | Status in this plan | Control |
|---|---|---|
| 6 consumers, not 4 | Accounted for. Current source/test imports from `question-runtime-utils.ts` are: `use-test-run-bootstrap.ts`, `use-test-run-controller.ts`, `test-question-client.tsx`, `test-result-panel.tsx`, `tests/unit/test-question-bootstrap.test.ts`, and `tests/unit/test-question-runtime-utils.test.ts`. | Move only the bootstrap imports in `use-test-run-bootstrap.ts` and `tests/unit/test-question-bootstrap.test.ts`; keep the other four imports unchanged and verify they still resolve after the trim. |
| E2E literals for `preAnswerChoice` and `vivetest-landing-ingress` | Untouched. Current scan found `preAnswerChoice` in `tests/e2e/transition-telemetry-smoke.spec.ts` at lines 927 and 1011; `vivetest-landing-ingress` in `tests/e2e/helpers/landing-fixture.ts` line 9, `tests/e2e/consent-smoke.spec.ts` line 72, and `tests/e2e/transition-telemetry-smoke.spec.ts` line 255. | Do not modify any `tests/e2e/**` file. Storage key format and `preAnswerChoice` field name remain unchanged. |

Stop condition:

- If implementation would require changing `useTestEntryOrchestrator`, `use-test-run-controller.ts` logic, any E2E file/helper, storage key formats, or runtime behavior, stop and request approval before proceeding.
