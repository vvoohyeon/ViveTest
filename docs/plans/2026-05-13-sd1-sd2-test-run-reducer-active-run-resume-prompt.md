# Phase-Unified Run Reducer and Active-Run Resume

## 1. Goal

Implement SD-1 and SD-2 for the test destination flow in two sequential units.

**SD-1** introduces a single pure `testRunReducer` with six domain actions and replaces the
dispersed phase state currently spread across `test-question-client.tsx`,
`use-test-run-controller.ts`, and `use-test-entry-orchestrator.ts`. The observable user
behavior must not change. The only structural change visible to the user is that the full
phase lifecycle (`booting → instruction → active → submitted → redirecting`) is now owned
by a single reducer with explicit action boundaries.

**SD-2** activates the `test:{variant}:activeRun` and `test:{variant}:responses` read path
so that a user returning to an unfinished test via direct URL or page reload resumes from
their last answered question instead of restarting cold. Landing Ingress always beats
Active-Run Resume.

Do not begin SD-2 until every SD-1 verification command passes.

---

## 2. Behavioral Contracts

### SD-1 — Preserved (Observable Behavior Must Not Change)

1. Instruction overlay shows when `phase === 'instruction'` and either `!instructionSeen` or
   `!entryPolicy.canAutoCommitAfterInstructionSeen`. This is identical to the current
   `instructionVisible` logic.
2. Auto-commit path: when bootstrap resolves with `instructionSeen=true` and the policy
   allows auto-commit, the reducer transitions directly to `'active'` via `BOOTSTRAP_COMPLETE`.
   The instruction overlay is never shown. This must be indistinguishable from the current
   `useTestEntryOrchestrator` auto-commit microtask path.
3. CTA actions produce identical effects:
   - `start` / `accept_all_and_start` / `deny_and_start` → `COMMIT_ENTRY`
   - `deny_and_abandon` / `keep_current_preference` → `REDIRECT_HOME`
   - Consent writes and landing-ingress clears happen in client `useEffect` keyed on phase
     transitions, not inside the reducer.
4. **150 ms delayed auto-advance** on answer selection. The timer is launched in the client's
   `onClick` handler after dispatching `SELECT_ANSWER` without `advance`. After 150 ms, it
   dispatches `SELECT_ANSWER` again with the same captured `choice`, `advance: true`, and
   `totalQuestions`. The `choice` is captured at click time, not at timer callback time.
5. **Last question does not auto-advance.** `Math.min(totalQuestions, currentIndex + 1)` at
   the last question stays at `totalQuestions`. The Submit button remains explicit and always
   visible on the last question.
6. **Tail reset on `NAVIGATE_PREVIOUS`**: answers at keys `Number(key) >= currentIndex` are
   deleted. The reducer owns this invariant; storage sync (`writeResponseSet`) happens in the
   controller handler immediately after dispatch.
7. `attempt_start` fires once per new runtime entry. `entrySequence` (a reducer-owned
   counter, not a `useRef` flag) is the exactly-once guard. Under React Strict Mode
   double-invoke, if `entrySequence` increments twice the test must fail and the fix is to
   ensure `BOOTSTRAP_COMPLETE` / `COMMIT_ENTRY` each increment `entrySequence` only when
   transitioning into `active` from a non-`active` phase.
8. `attempt_start` must NOT fire when SD-2 resumes an existing active run
   (`entryMode === 'resume'`).
9. `final_submit.finalResponses` uses canonical index string keys (`"1"`, `"2"`) and
   semantic `"A"` / `"B"` values. Do not convert to any other shape.
10. `data-entry-status` attribute values are unchanged:
    `redirecting | booting | submitted | started | ready`.
    `phase === 'instruction'` maps to `'ready'`.
11. `beforeunload` guard is active when `phase === 'active'` and inactive in all other
    phases.
12. All existing unit tests, E2E specs, and QA script checks from Prompt 0–2 remain green.
    No screenshot baseline update is expected.

### SD-2 — New Observable Behaviors

1. On new runtime entry commit (`entryMode === 'new'`), `saveActiveRun()` writes
   `test:{variant}:activeRun` with `startedAtMs` and `lastAnsweredAtMs` both set to
   `Date.now()`.
2. On each confirmed answer, `writeLastAnsweredAt()` updates the active run metadata.
3. On tail reset (`NAVIGATE_PREVIOUS`), the filtered response set (only answers whose
   canonical index key is < destination index) is persisted via `writeResponseSet()`. Do NOT
   call `writeLastAnsweredAt()` on backward navigation.
4. On page reload or direct re-entry with an unexpired active run and a non-null response
   set, the run resumes at the next unanswered canonical index with the stored answers
   preloaded. The instruction overlay shows if `instructionSeen === false`; it does not show
   if `instructionSeen === true`, regardless of phase.
5. Landing Ingress takes priority: if `landingIngress !== null`, skip active-run resume even
   when `activeRun` and `responseSet` are both present.
6. `getActiveRun()` owns the 30-min timeout and `volatilizeRunData` cleanup. Bootstrap reads
   its return value only.
7. Active-run resume does NOT re-emit `attempt_start`.
8. Active run metadata is NOT cleared on Submit (result-entry cleanup is Phase 7/10 scope).

---

## 3. Pre-Implementation Reading (Mandatory)

Read all of the following before writing any code. If a file's content conflicts with this
prompt, surface the conflict in your completion report before proceeding.

| Priority | File | Section |
|---|---|---|
| 1 | `AGENTS.md` | full |
| 2 | `docs/req-test.md` | §3, §6.8, §8, §9 |
| 3 | `docs/req-test-plan.md` | §Phase 5/6 사전 설계 결정 (SD-1, SD-2 subsections) |
| 4 | `docs/project-analysis.md` | §5.5 (current implementation status) |
| 5 | `docs/agent-guides/project-rules.md` | §TestFlow |
| 6 | `docs/agent-guides/verification-commands.md` | §test-flow |

Verify these facts in the current working tree before starting:

- `src/features/test/test-question-client.tsx`:
  - `entryCommittedForController` useState is present
  - 150 ms auto-advance timer exists and calls `advanceQuestionAfterAnswer`
  - `slideDirection` state exists
- `src/features/test/use-test-run-controller.ts`:
  - Current output does NOT include `phase` or `instructionSeen` directly
  - `writeResponseSet()` is called in `updateAnswer()`
- `src/features/test/use-test-entry-orchestrator.ts`:
  - Owns `instructionSeen`, `entryCommitted`, `redirecting`
  - Will be deleted in SD-1
- `src/features/test/question-runtime-utils.ts`:
  - `resolveQuestionBootstrapState()` does NOT accept `activeRun` or `responseSet`
- `src/features/test/storage/response-set.ts`:
  - `writeResponseSet()` exists
  - `readResponseSet()` does NOT exist
- `src/features/test/storage/active-run.ts`:
  - `getActiveRun()`, `saveActiveRun()`, `writeLastAnsweredAt()`, `clearActiveRun()` exist
  - None are called at live runtime yet

---

## 4. Files to Change and Implementation Order

Implement units A through G in strict sequence. Do not start the next unit until the
current unit's verification command passes.

### SD-1 Units

#### Unit A — Pure Reducer (no React, no side effects)

| File | Operation |
|---|---|
| `src/features/test/test-run-reducer.ts` | Create |
| `tests/unit/test-run-reducer.test.ts` | Create |

Verification: `npm test -- tests/unit/test-run-reducer.test.ts`

#### Unit B — Controller Integration + Client Simplification + Orchestrator Removal

| File | Operation |
|---|---|
| `src/features/test/use-test-run-controller.ts` | Modify — add reducer, move entry phase ownership |
| `src/features/test/test-question-client.tsx` | Modify — remove orchestrator call, bridge state |
| `src/features/test/use-test-entry-orchestrator.ts` | Delete |
| `tests/unit/use-test-run-controller.test.ts` | Modify — update for new input/output shape |
| `tests/unit/use-test-entry-orchestrator.test.ts` | Delete |

Verification: `npm test -- tests/unit/test-run-reducer.test.ts tests/unit/use-test-run-controller.test.ts tests/unit/test-entry-policy.test.ts`

#### Unit C — QA Script Sync

| File | Operation |
|---|---|
| `scripts/qa/_path-config.mjs` | Modify — add `test.runReducer`, remove `test.entryOrchestrator` |
| `scripts/qa/check-phase10-transition-contracts.mjs` | Modify — check reducer ownership, remove orchestrator pattern checks |

Verification: `npm run qa:rules && npm run lint && npm run typecheck`

Then run SD-1 E2E gate:
```
npx playwright test tests/e2e/consent-smoke.spec.ts tests/e2e/state-smoke.spec.ts
```

**Stop here if SD-1 fails. Do not begin SD-2.**

### SD-2 Units

#### Unit D — Storage Read Boundary

| File | Operation |
|---|---|
| `src/features/test/storage/response-set.ts` | Modify — add `readResponseSet()` |
| `src/features/test/storage/index.ts` | Modify — export `readResponseSet()` |
| `tests/unit/test-storage-response-set.test.ts` | Create |

Verification: `npm test -- tests/unit/test-storage-response-set.test.ts tests/unit/test-storage-active-run.test.ts`

#### Unit E — Bootstrap Resume Extension

| File | Operation |
|---|---|
| `src/features/test/question-runtime-utils.ts` | Modify — extend input, add resume priority |
| `tests/unit/test-question-bootstrap.test.ts` | Modify — add resume cases |

Verification: `npm test -- tests/unit/test-question-bootstrap.test.ts`

#### Unit F — Live Runtime Resume Wiring

| File | Operation |
|---|---|
| `src/features/test/use-test-run-controller.ts` | Modify — wire active-run reads/writes |
| `tests/unit/use-test-run-controller.test.ts` | Modify — resume assertions |

Verification: focused SD-2 unit command (see §6)

#### Unit G — E2E and Documentation

| File | Operation |
|---|---|
| `tests/e2e/consent-smoke.spec.ts` | Modify — add active-run resume smoke |
| `docs/project-analysis.md` | Modify — update implementation status |
| `docs/req-test-plan.md` | Modify — mark SD-1/SD-2 implemented |

Verification: full done gate (see §6)

---

## 5. Detailed Implementation Instructions

### 5.1 Create `test-run-reducer.ts` (Unit A)

This file must have zero React imports and zero side effects. Every function must be pure.

**Types:**

```typescript
export type TestAnswerChoice = 'A' | 'B';

export type TestRunPhase =
  | 'booting'
  | 'instruction'
  | 'active'
  | 'submitted'
  | 'redirecting';

export interface TestRunState {
  phase: TestRunPhase;
  landingIngressFlag: boolean;
  currentIndex: number;           // 1-based canonical index
  answers: Record<string, TestAnswerChoice>;  // key: String(canonicalIndex)
  instructionSeen: boolean;
  entrySequence: number;          // increments once per active-phase entry; exactly-once guard
  entryAnswers: Record<string, TestAnswerChoice> | null;  // answers at entry-commit time
  entryMode: 'new' | 'resume' | null;
}
```

**Actions:**

```typescript
export type TestRunAction =
  | {
      type: 'BOOTSTRAP_COMPLETE';
      landingIngressFlag: boolean;
      currentIndex: number;
      answers: Record<string, TestAnswerChoice>;
      instructionSeen: boolean;
      canAutoCommitAfterInstructionSeen: boolean;
      entryMode?: 'new' | 'resume';
    }
  | {type: 'COMMIT_ENTRY'; recordsInstructionSeen: boolean}
  | {type: 'REDIRECT_HOME'}
  | {
      type: 'SELECT_ANSWER';
      choice: TestAnswerChoice;
      canonicalIndex: number;
      advance?: boolean;
      totalQuestions?: number;
    }
  | {type: 'NAVIGATE_PREVIOUS'}
  | {type: 'SUBMIT'; totalQuestions: number};
```

**Note on `SELECT_ANSWER`:** The action carries `canonicalIndex` explicitly so the reducer
does not need to know which question is "current" — the caller provides it. This also means
`SELECT_ANSWER` without `advance` and `SELECT_ANSWER` with `advance: true` both carry the
same `canonicalIndex`, which is captured at click time in the client handler.

**Reducer rules:**

- `BOOTSTRAP_COMPLETE`: If `instructionSeen && canAutoCommitAfterInstructionSeen`, transition
  to `'active'` and increment `entrySequence`. Otherwise, transition to `'instruction'`.
  `entryMode` defaults to `'new'` unless provided.
- `COMMIT_ENTRY`: Only from `'instruction'`. Transition to `'active'`, increment
  `entrySequence`, snapshot `entryAnswers = state.answers`.
- `REDIRECT_HOME`: Only from `'instruction'`. Transition to `'redirecting'`.
- `SELECT_ANSWER`: Only in `'active'`. Write `answers[String(canonicalIndex)] = choice`.
  If `advance === true`, also advance `currentIndex` by `Math.min(totalQuestions,
  currentIndex + 1)`.
- `NAVIGATE_PREVIOUS`: Only in `'active'`. Compute `nextIndex = Math.max(1, currentIndex - 1)`.
  Delete all answer entries where `Number(key) >= nextIndex`. Set `currentIndex = nextIndex`.
- `SUBMIT`: Only in `'active'`. Guard with `hasAllRequiredAnswers`. If the guard fails,
  return `state` unchanged. Otherwise, transition to `'submitted'`.

**Exported helpers (same file):**

```typescript
export function buildInitialTestRunState(): TestRunState { ... }
export function testRunReducer(state: TestRunState, action: TestRunAction): TestRunState { ... }
export function hasAllRequiredAnswers(
  answers: Record<string, TestAnswerChoice>,
  totalQuestions: number
): boolean { ... }
export function isRuntimeActive(state: TestRunState): boolean { ... }
export function isRuntimeSubmitted(state: TestRunState): boolean { ... }
```

### 5.2 Reducer Unit Tests (Unit A)

Required cases — use `buildInitialTestRunState()` as the base:

1. `BOOTSTRAP_COMPLETE` with `instructionSeen=false` → `phase === 'instruction'`,
   `entrySequence === 0`.
2. `BOOTSTRAP_COMPLETE` with `instructionSeen=true` and `canAutoCommitAfterInstructionSeen=true`
   → `phase === 'active'`, `entrySequence === 1`.
3. `COMMIT_ENTRY` from `'instruction'` with `recordsInstructionSeen=true` →
   `phase === 'active'`, `instructionSeen === true`, `entrySequence === 1`.
4. `REDIRECT_HOME` from `'instruction'` → `phase === 'redirecting'`.
5. `COMMIT_ENTRY` ignored when `phase !== 'instruction'`.
6. `SELECT_ANSWER` writes `answers["2"] = 'A'` when `canonicalIndex=2` in `'active'`.
7. Full sequence: `BOOTSTRAP_COMPLETE → COMMIT_ENTRY → SELECT_ANSWER(index=1) →
   SELECT_ANSWER(index=1, advance, totalQuestions=4) → NAVIGATE_PREVIOUS →
   SELECT_ANSWER(index=1) → SUBMIT(totalQuestions=4)` blocked because index 2–4 are missing.
8. Full submit sequence: answer all 4 canonical indexes, then `SUBMIT` → `'submitted'`.
9. `NAVIGATE_PREVIOUS` at `currentIndex=1` → `currentIndex=1`, all answers cleared.
10. `NAVIGATE_PREVIOUS` at `currentIndex=3` with answers `{1:'A', 2:'B', 3:'A'}` →
    `currentIndex=2`, answers `{1:'A'}`.
11. `SELECT_ANSWER`, `NAVIGATE_PREVIOUS`, `SUBMIT` all no-op when `phase === 'submitted'`.
12. `hasAllRequiredAnswers({1:'A', 2:'B'}, 2)` → true.
13. `hasAllRequiredAnswers({1:'A'}, 2)` → false.

### 5.3 Controller Integration (Unit B)

**Updated input shape:**

```typescript
interface TestRunControllerInput {
  variant: string;
  locale: AppLocale;
  pathname: string;
  questions: ReadonlyArray<ResolvedQuestion>;
  consentSynced: boolean;
  consentState: TelemetryConsentState;
  cardAttribute: LandingCardAttribute;
  instructionText: string;
  landingPath: string;
  router: ReturnType<typeof useRouter>;
}
```

**Updated output shape — include all fields currently consumed by the client:**

```typescript
interface TestRunControllerOutput {
  phase: TestRunPhase;
  runtimeReady: boolean;
  landingIngressFlag: boolean;
  currentQuestionIndex: number;
  started: boolean;
  submitted: boolean;
  redirecting: boolean;
  instructionSeen: boolean;
  instructionVisible: boolean;
  entryPolicy: TestEntryPolicy;
  currentQuestion: ResolvedQuestion | null;
  currentAnswer: 'A' | 'B' | undefined;
  allAnswered: boolean;
  scoringProgress: ScoringProgress;
  totalQuestions: number;
  answers: Record<string, 'A' | 'B'>;
  pendingTransitionId: string | null;
  clearPendingTransitionId: () => void;
  executeInstructionAction: (action: TestInstructionAction) => void;
  updateAnswer: (choice: 'A' | 'B') => void;
  advanceQuestionAfterAnswer: (choice: 'A' | 'B') => void;
  moveQuestion: (direction: -1 | 1) => void;
  handleSubmit: () => void;
}
```

**Derived booleans (from reducer state):**

```typescript
const runtimeReady = runState.phase !== 'booting';
const started = runState.phase === 'active' || runState.phase === 'submitted';
const submitted = runState.phase === 'submitted';
const redirecting = runState.phase === 'redirecting';
const instructionVisible =
  runState.phase === 'instruction' &&
  (!runState.instructionSeen || !entryPolicy.canAutoCommitAfterInstructionSeen);
```

**Bootstrap effect:**

1. Skip bootstrap if `consentSynced === false` (remain `'booting'`).
2. Skip if already bootstrapped (`bootstrapRuntimeStateRef.current` exists).
3. Guard stale pending transitions (same as today).
4. Read `landingIngress`, `pendingTransition`, `hasSeenInstruction`.
5. Build bootstrap state with `resolveQuestionBootstrapState()` (SD-1 signature, no
   `activeRun`/`responseSet` yet — SD-2 adds those).
6. Compute `bootstrapEntryPolicy = resolveTestEntryPolicy({..., consentState, landingIngressFlag})`.
7. Dispatch `BOOTSTRAP_COMPLETE` with `canAutoCommitAfterInstructionSeen` from the policy.

**Side-effect effects (keyed on reducer state, not ref flags):**

```typescript
// Redirect effect
useEffect(() => {
  if (runState.phase !== 'redirecting') return;
  if (runState.landingIngressFlag) clearLandingIngress(variant);
  router.replace(landingPath as LocalizedRoutePath);
}, [landingPath, router, runState.landingIngressFlag, runState.phase, variant]);

// Instruction seen write
useEffect(() => {
  if (runState.phase !== 'active' || runState.entrySequence === 0 || !runState.instructionSeen) return;
  markInstructionSeen(variant);
}, [runState.entrySequence, runState.instructionSeen, runState.phase, variant]);

// attempt_start + ingress consume (new entries only)
useEffect(() => {
  if (runState.phase !== 'active' || runState.entrySequence === 0 || runState.entryMode !== 'new') return;
  trackAttemptStart({
    locale, route: pathname, variant,
    questionIndex: runState.currentIndex,
    dwellMsAccumulated: 0,
    landingIngressFlag: runState.landingIngressFlag
  });
  dwellStartRef.current = Date.now();
  if (runState.landingIngressFlag) consumeLandingIngress(variant);
}, [locale, pathname, runState.currentIndex, runState.entryMode,
    runState.entrySequence, runState.landingIngressFlag, runState.phase, variant]);
```

**`executeInstructionAction`:**

```typescript
const executeInstructionAction = useCallback((action: TestInstructionAction) => {
  const effect = entryPolicy.effects[action];
  if (!runtimeReady || redirecting) return;
  if (effect.writesConsent) setTelemetryConsentState(effect.writesConsent);
  if (effect.redirectHome) {
    dispatchRunAction({type: 'REDIRECT_HOME'});
    return;
  }
  if (effect.commitsRuntimeEntry) {
    dispatchRunAction({type: 'COMMIT_ENTRY', recordsInstructionSeen: effect.recordsInstructionSeen});
  }
}, [entryPolicy.effects, redirecting, runtimeReady]);
```

**`updateAnswer`:** dispatches `SELECT_ANSWER` without `advance`, writes response set.

**`advanceQuestionAfterAnswer`:** dispatches `SELECT_ANSWER` with `advance: true` and
`totalQuestions`. Called by the 150 ms timer in the client (not directly by the user).

**`moveQuestion(-1)`:** dispatches `NAVIGATE_PREVIOUS`, computes filtered answer set,
calls `writeResponseSet(variant, filteredAnswers)`.

**`handleSubmit`:** guards with `hasAllRequiredAnswers`, builds `finalResponses` directly
from `runState.answers` (already canonical), calls `trackFinalSubmit`, dispatches `SUBMIT`.

**`currentAnswer` derivation:**

```typescript
const currentAnswer = currentQuestion
  ? runState.answers[String(currentQuestion.canonicalIndex)]
  : undefined;
```

### 5.4 Client Simplification (Unit B)

Remove from `test-question-client.tsx`:
- `const [entryCommittedForController, setEntryCommittedForController] = useState(false)`
- The `useEffect` that sets `entryCommittedForController` when `entryCommitted` changes
- The `useTestEntryOrchestrator(...)` call
- All imports of `useTestEntryOrchestrator`

Update the `useTestRunController(...)` call to use the new input shape.

Replace the old `isBooting` and `instructionVisible` derivations with the controller outputs.

Keep `slideDirection` state if it exists — this is UX/UI scope (Prompt 2 work) and must not
be removed.

The `data-entry-status` mapping must remain identical to current behavior:

```tsx
data-entry-status={
  redirecting ? 'redirecting'
  : isBooting ? 'booting'
  : submitted ? 'submitted'
  : started ? 'started'
  : 'ready'
}
```

### 5.5 QA Script Updates (Unit C)

**`scripts/qa/_path-config.mjs`** — update the `test` group:

```javascript
export const test = {
  questionClient: 'src/features/test/test-question-client.tsx',
  runController: 'src/features/test/use-test-run-controller.ts',
  runReducer: 'src/features/test/test-run-reducer.ts',
  // removed: entryOrchestrator
};
```

**`scripts/qa/check-phase10-transition-contracts.mjs`** — make these changes:

1. Remove the check that requires `use-test-entry-orchestrator.ts` to exist.
2. Remove checks for `markInstructionSeen`, `clearLandingIngress` inside the orchestrator
   file.
3. Add reducer presence and token checks:

```javascript
if (fileExists(test.runReducer)) {
  const reducerFile = read(test.runReducer);
  for (const token of [
    'TestRunPhase', 'BOOTSTRAP_COMPLETE', 'COMMIT_ENTRY',
    'REDIRECT_HOME', 'SELECT_ANSWER', 'NAVIGATE_PREVIOUS', 'SUBMIT'
  ]) {
    if (!new RegExp(token, 'u').test(reducerFile)) {
      fail(`Test run reducer must define ${token}.`);
    }
  }
}
```

4. Update controller ownership checks to look in `test.runController`:

```javascript
if (fileExists(test.runController)) {
  const runController = read(test.runController);
  for (const token of [
    'markInstructionSeen', 'clearLandingIngress', 'consumeLandingIngress',
    'trackAttemptStart', 'trackFinalSubmit'
  ]) {
    if (!new RegExp(token, 'u').test(runController)) {
      fail(`Test run controller must own ${token} after SD-1 reducer integration.`);
    }
  }
}
```

5. The existing check for `consumeLandingIngress` and `markInstructionSeen` inside
   `test-question-client.tsx` must be updated to check `use-test-run-controller.ts` instead.
   The client no longer owns these calls.

### 5.6 `readResponseSet()` (Unit D)

Add to `src/features/test/storage/response-set.ts`:

```typescript
export function readResponseSet(variantId: string): Record<string, 'A' | 'B'> | null {
  const key = testVariantKey.responseSet(variantId as VariantId);
  const raw = localStorage.getItem(key);
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    localStorage.removeItem(key);
    return null;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    localStorage.removeItem(key);
    return null;
  }

  const responses: Record<string, 'A' | 'B'> = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (!/^[1-9]\d*$/u.test(k)) continue;
    if (v === 'A' || v === 'B') responses[k] = v;
  }

  return Object.keys(responses).length > 0 ? responses : null;
}
```

**Response-set unit test cases (Unit D):**

1. Round-trip write + read returns canonical entries.
2. Missing key returns `null`.
3. Malformed JSON removes only the target key and returns `null`.
4. Non-object JSON removes only the target key and returns `null`.
5. Keys `q1`, `0`, `01`, `-1` are filtered out.
6. Values `'C'`, `true`, `null` are filtered out.
7. Another variant's key is not affected.

### 5.7 Bootstrap Resume Extension (Unit E)

Extend `resolveQuestionBootstrapState()` in `src/features/test/question-runtime-utils.ts`:

```typescript
export function resolveQuestionBootstrapState(input: {
  instructionSeen: boolean;
  landingIngress: LandingIngressRecord | null;
  pendingTransition: PendingLandingTransition | null;
  questions: ReadonlyArray<ResolvedQuestion>;
  variant: string;
  activeRun?: ActiveRun | null;
  responseSet?: Record<string, 'A' | 'B'> | null;
}): QuestionBootstrapState { ... }
```

Priority order inside the function:

1. **Landing Ingress** (`landingIngress !== null`): existing logic unchanged. `activeRun`
   and `responseSet` inputs are ignored entirely.
2. **Active-Run Resume** (`landingIngress === null && activeRun != null && responseSet != null`):
   compute resume index from `resolveResumeQuestionIndex()`, use stored answers.
3. **Direct Cold** (everything else): existing logic unchanged.

`resolveResumeQuestionIndex()` helper:

- Filter `responseSet` keys to those matching a `canonicalIndex` in `questions`.
- Sort numerically. Take the last answered canonical index.
- Return `Math.min(questions.length, lastAnsweredIndex + 1)`.
- If no valid answered index found, return `1`.

**Bootstrap resume unit test cases (Unit E) — add to `test-question-bootstrap.test.ts`:**

1. Active run + response set + no landing ingress → `currentQuestionIndex = lastAnsweredIndex + 1`.
2. Active run answered through final question → `currentQuestionIndex = questions.length`.
3. Active run + landing ingress → landing ingress wins (index 2 for qmbti, seed answer).
4. `activeRun === null` → cold start.
5. `responseSet === null` → cold start.
6. EGTT profile-first: active run with `{'1': 'B'}` → `currentQuestionIndex = 2`.
7. Response set with invalid keys only → cold start.

### 5.8 Live Runtime Resume Wiring (Unit F)

**Controller bootstrap effect additions (SD-2):**

```typescript
const landingIngress = readLandingIngress(variant);
const activeRun = landingIngress ? null : getActiveRun(asVariantId(variant));
const responseSet = activeRun ? readResponseSet(variant) : null;
const isResume = landingIngress === null && activeRun !== null && responseSet !== null;
const bootstrapState = resolveQuestionBootstrapState({
  instructionSeen: nextInstructionSeen,
  landingIngress,
  pendingTransition: nextPendingTransition,
  questions,
  variant,
  activeRun,
  responseSet
});
```

Pass `entryMode: isResume ? 'resume' : 'new'` in the `BOOTSTRAP_COMPLETE` dispatch.

**On new-entry commit effect:**

```typescript
useEffect(() => {
  if (runState.phase !== 'active' || runState.entrySequence === 0 || runState.entryMode !== 'new') return;
  const variantId = asVariantId(variant);
  const now = Date.now();
  saveActiveRun(variantId, {variantId, startedAtMs: now, lastAnsweredAtMs: now});
  if (runState.entryAnswers && Object.keys(runState.entryAnswers).length > 0) {
    writeResponseSet(variant, runState.entryAnswers);
  }
}, [runState.entryAnswers, runState.entryMode, runState.entrySequence, runState.phase, variant]);
```

**On answer:** `writeResponseSet(variant, newAnswers)` and `writeLastAnsweredAt(asVariantId(variant))`.

**On previous navigation/tail reset:** `writeResponseSet(variant, filteredAnswers)`. Do NOT
call `writeLastAnsweredAt()`.

**On submit:** No active-run cleanup. Leave metadata intact for future Phase 7/10 result-entry
commit.

### 5.9 Resume E2E (Unit G)

Add to `tests/e2e/consent-smoke.spec.ts`:

**Test 1 — direct active-run reload resume:**

1. Seed `OPTED_IN` consent.
2. Navigate to `/en/test/{PRIMARY_AVAILABLE_TEST_VARIANT}`.
3. Wait for instruction overlay, click Start.
4. Wait for `data-entry-status="started"`.
5. Click `test-choice-a`.
6. Wait for `test-question-number` to show `Q2` (proves auto-advance completed).
7. Reload page.
8. Assert instruction overlay NOT visible.
9. Assert `data-entry-status="started"`.
10. Assert `test-question-number` shows `Q2`.
11. Assert progress percent reflects one answered scoring question.

Do not use fixed sleeps. Use `expect(locator).toHaveText(...)` with a timeout.

**Test 2 — landing ingress beats prior active run:**

1. Directly write active-run metadata + `{'1': 'B', '2': 'A'}` response set to localStorage
   for `{PRIMARY_AVAILABLE_TEST_VARIANT}`.
2. Navigate to landing page, trigger the same card with choice `'A'` (landing ingress path).
3. Assert instruction overlay shown (landing ingress does not auto-commit for `OPTED_IN` on
   first session — check the exact policy branch for this variant/consent combination).
4. Click Start.
5. Assert `data-entry-status="started"`.
6. Assert `test-question-number` shows `Q2` (landing ingress skip, not the prior active-run
   index).
7. Assert progress shows seed answer (`13%` or equivalent for `qmbti`).

---

## 6. QA / Verification Commands

Run in this order. Stop immediately on any failure.

### SD-1 focused (after Unit A):
```bash
npm test -- tests/unit/test-run-reducer.test.ts
```

### SD-1 unit bundle (after Unit B):
```bash
npm test -- \
  tests/unit/test-run-reducer.test.ts \
  tests/unit/use-test-run-controller.test.ts \
  tests/unit/test-entry-policy.test.ts \
  tests/unit/test-question-bootstrap.test.ts
```

### SD-1 QA + static (after Unit C):
```bash
npm run qa:rules
npm run lint
npm run typecheck
npm test
npm run build
```

### SD-1 E2E gate:
```bash
npx playwright test tests/e2e/consent-smoke.spec.ts tests/e2e/state-smoke.spec.ts
```

### SD-2 storage focused (after Unit D):
```bash
npm test -- \
  tests/unit/test-storage-response-set.test.ts \
  tests/unit/test-storage-active-run.test.ts \
  tests/unit/test-storage-volatility.test.ts
```

### SD-2 bootstrap focused (after Unit E):
```bash
npm test -- tests/unit/test-question-bootstrap.test.ts
```

### SD-2 controller focused (after Unit F):
```bash
npm test -- \
  tests/unit/test-storage-response-set.test.ts \
  tests/unit/test-storage-active-run.test.ts \
  tests/unit/test-storage-volatility.test.ts \
  tests/unit/test-question-bootstrap.test.ts \
  tests/unit/use-test-run-controller.test.ts \
  tests/unit/test-entry-policy.test.ts
```

### SD-2 resume E2E focused (after Unit G):
```bash
npx playwright test tests/e2e/consent-smoke.spec.ts --grep "active-run resume"
```

### Final done gate:
```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run qa:rules
npx playwright test tests/e2e/consent-smoke.spec.ts
npx playwright test tests/e2e/state-smoke.spec.ts
npx playwright test tests/e2e/transition-telemetry-smoke.spec.ts
```

If Playwright browser executables are missing, run `npx playwright install chromium webkit`
first. Do not treat that as an app regression.

Do not update any screenshot baselines unless a deliberate approved visual change is
introduced. This implementation contains no such change.

---

## 7. Documentation Updates (Unit G)

After the full done gate passes, update exactly these files:

**`docs/project-analysis.md` §5.5:**
- Remove: "does not yet run active-run resume", "write-without-read asymmetry deferred",
  "started flag retained as defensive flag".
- Add: "Phase-unified reducer (`test-run-reducer.ts`) owns full phase lifecycle. Active-run
  metadata and response-set read path are wired. Result-entry cleanup (active-run clear)
  remains Phase 7/10 scope."

**`docs/req-test-plan.md` §Phase 5/6 사전 설계 결정:**
- SD-1 subsection: replace "다음 확장에서 적용할" language with "구현 완료" marker and
  current implementation date.
- SD-2 subsection: replace "남은 Phase 6 확장 blocking 조건" language with "구현 완료"
  marker. Preserve the result-entry/derivation caveats unchanged.

Do not edit `docs/archive/**`, `docs/requirements.md`, or `docs/req-test.md`.

---

## 8. Prohibited Changes / Non-Scope

Do not implement any of the following in this session:

- Score derivation, `computeScoreStats()`, result URL construction, or result page rendering.
- `response-projection.ts` A/B-to-domain token projection.
- Result-entry loading, 5-state derivation flags (`derivation_in_progress`, etc.),
  back-from-loading, commit-failure, derivation-failure.
- New `question_answered` telemetry event.
- Full `/test/error` recovery-card UI.
- Results Sheets loader or workflow secret expansion.
- Migration from `vivetest-test-instruction-seen:{variant}` to `test:{variant}:instructionSeen`.
- Qualifier Question integration into Instruction Overlay (Prompt 4 scope).
- UX/UI changes: slide animation, progress bar percentage positioning, question number
  display, layout restructuring, `beforeunload` warning popup, or disabled-token sync for
  `instruction-overlay.tsx` (Prompt 2 already owns these).
- Any change to `src/features/test/domain/`, `schema-registry.ts`, or `response-projection.ts`.
- Any change to landing interaction runtime, GNB, transition runtime, telemetry event
  semantics, proxy, or i18n layers.
- Screenshot baseline regeneration.
- Removing or weakening any existing QA script check beyond the orchestrator removal
  described in §5.5.

### Contract Tension — Preserve Explicitly

`docs/req-test.md §6.8` specifies that "처음부터 다시 하기 commit success" deletes
`instructionSeen`. However, SD-1/SD-2 must not trigger `volatilizeRunData(variant, 'restart')`
during a normal Start or landing-ingress commit, because doing so would erase the freshly
written legacy instruction key and break existing instruction smoke behavior. Full restart
cleanup and `instructionSeen` key migration are later-phase scope. Do not implement either
in this session.

---

## 9. Completion Report Format

After all done-gate commands pass, submit a report with exactly this structure:

```markdown
## SD-1/SD-2 Implementation Completion Report

### Files changed
- Created: [list]
- Modified: [list]
- Deleted: [list]

### Behavioral contract verification
For each contract in §2, state: PRESERVED / NEW / N/A and one-line evidence.

### Test results
- Unit tests: N passed / M total
- `npm run qa:rules`: PASS / FAIL (note which check if FAIL)
- `npm run lint`: PASS / FAIL
- `npm run typecheck`: PASS / FAIL
- `npm run build`: PASS / FAIL
- `consent-smoke.spec.ts`: N passed
- `state-smoke.spec.ts`: N passed
- `transition-telemetry-smoke.spec.ts`: N passed

### Deviations from the implementation plan
List any deviation from the §4–5 plan, with reason. If none, write "None."

### Open items (not implemented)
List anything confirmed as out-of-scope per §8 that was discovered during implementation.

### Next step
State the next prompt (Prompt 4 — Qualifier + Instruction Overlay integration) and its
prerequisite (all Prompt 3 gates green).
```
