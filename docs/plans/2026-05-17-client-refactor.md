# Client Responsibility Extraction — Implementation Plan

> Status: **COMPLETE — Waves A–G implemented and final gate passed.**
> Plan filename fixed by session brief (`2026-05-17-client-refactor.md`); actual working date 2026-05-18.

## Session Identity

- Session name: Client Responsibility Extraction
- Session type: Structural refactoring — no observable production behavior change
- Target file: `src/features/test/test-question-client.tsx`
- Gate command (session brief): `npm test && npm run qa:rules`
- Session-final gate (full): `npm run lint` → `npm run typecheck` → `npm test` → `npm run build` → `npm run qa:rules` → `git diff --check`
- Package manager: npm
- Declared baseline (to verify before Wave A): Controller Extraction COMPLETE — 462/462 unit tests, qa:rules 12/12, Playwright 32.
- Pre-session line count: `test-question-client.tsx` = **486 lines** (`wc -l`).

### Baseline / STATE.md note

`.planning/STATE.md` documents the **prior** "Controller Responsibility Extraction" session, whose final gates were still listed as pending. This new session declares that work COMPLETE as its baseline. Per AGENTS.md §1 / CLAUDE.md Session Startup the STATE.md was read; it does not authorize autonomous execution (CLAUDE.md Prohibited Actions, AGENTS.md §4 `.planning/` boundary). The 462/462 + qa:rules 12/12 baseline will be empirically captured as the first action of Wave A execution (after approval).

---

## AGENTS.md §7 Required Fields

### All files to be modified

| File | Wave | Type | Boundary class (AGENTS.md §4) |
|---|---|---|---|
| `src/features/test/test-question-client.tsx` | A–F | edit (shrink) | Always — Modify Freely (`src/features/**`) |
| `src/features/test/use-before-unload-guard.ts` | A | **new** | Always |
| `src/features/test/use-landing-transition-completion.ts` | B | **new** | Always |
| `src/features/test/use-answer-lock.ts` | C | **new** | Always |
| `src/features/test/qualifier-chip.tsx` | D | **new** | Always |
| `src/features/test/overlay-connector.tsx` | E | **new** | Always |
| `src/features/test/result-connector.tsx` | F | **new** | Always |
| `tests/unit/qualifier-chip.test.ts` | D | **new** | Always (`tests/**`) |
| `tests/unit/overlay-connector.test.ts` | E | **new** | Always (`tests/**`) |
| `scripts/qa/check-phase11-telemetry-contracts.mjs` | G | edit | **Ask First** (`scripts/qa/*.mjs`) |
| `scripts/qa/_path-config.mjs` | G | edit (conditional) | **Ask First** (`scripts/qa/*.mjs`) |
| `docs/plans/2026-05-17-client-refactor.md` | all | this doc | Always (`docs/**`) |

Frozen perimeter NOT touched: `src/features/test/domain/**`, `schema-registry.ts`, `response-projection.ts`, `src/messages/**`, `use-test-entry-orchestrator.ts`, `use-test-run-controller.ts`, all other `docs/plans/**`. Only IMPORTED, never modified: `@/features/transition/runtime` (High-Risk dir `src/features/transition/` — import only, confirmed also imported by `blog-destination-client.tsx`).

### Relevant SSOT contract (AGENTS.md §2 Task Routing Table — "test flow / domain")

- SSOT: `docs/req-test.md`, `docs/req-test-plan.md`
- Project rules: `docs/agent-guides/project-rules.md §TestFlow`
- Verify: `docs/agent-guides/verification-commands.md §test-flow`
- This is a behavior-preserving structural refactor: no contract clause changes. SSOT relevance is the *invariant* that observable test-flow behavior is unchanged (INV-1..INV-4 below).

### Impact assessment

- **Shared components (shell/GNB):** none touched. `TestQuestionClient` public surface frozen (INV-2).
- **Localization:** no `src/messages/**` edits. All `t(...)` keys preserved; for pure subcomponents (D/E) labels are computed in the client with the same keys and passed as props.
- **a11y:** all `data-testid`, `role`, `tabIndex`, `aria-label` attributes preserved verbatim in moved markup. Keyboard handler (Enter/Space) on qualifier chip preserved in `QualifierChip`.
- **State contracts:** answer-lock timer/lock state relocated into `useAnswerLock` with identical timing (150ms) and identical guards. `submitted`/`started` guards preserved.
- **Core user flow:** instruction → qualifier → question → auto-advance → submit → result. No flow step altered; only code ownership relocated.
- **Telemetry:** `trackQuestionAnswered` call site stays in client (handler not moved). `trackResultViewed` stays in `TestResultPanel` (wrapped, not moved). QA Phase 11 anchors evaluated in PA-7 / Wave G.

### Validation commands

- Per-wave: `npm test` (zero assertion changes to existing tests; INV-3).
- Per-wave grep gates: as specified per wave below.
- Wave D/E: new `.test.ts` files (`tests/unit/`), `npm test` count rises ≥5 each.
- Wave G: `npm run qa:rules` 12/12; `wc -l` recorded.
- Session-final: `npm run lint && npm run typecheck && npm test && npm run build && npm run qa:rules && git diff --check`.
- Behavioral confidence: client has **no direct unit test** (grep of `tests/` for `TestQuestionClient` = 0 hits); behavior is covered by E2E + QA Phase 11 regex anchors. Recommend scoped E2E (`tests/e2e/qualifier-overlay.spec.ts`, `tests/e2e/consent-smoke.spec.ts`) at session end — to confirm with user (not in default Done gate).

### Decisions requiring user confirmation before execution

Three decision points (detail in "Decision Points" section). **Approval of this plan = approval of the recommended resolution for each, unless the user overrides:**

- **DP-B1 (minor deviation):** Wave B spec §4 says the hook "Receives `pathname`". The actual effect does **not** use `pathname`; it gates on `runtimeReady` and calls `completePendingLandingTransition({targetType: 'test'})` (hardcoded). Recommended: hook receives `runtimeReady`, `pendingTransitionId`, `clearPendingTransitionId` (NOT `pathname`). Spec-vs-code mismatch → documented; proceeding as recommended preserves behavior exactly.
- **DP-C1:** `submittedRef` + its sync effect **stay in the client**; `useAnswerLock` is submission-agnostic; the client-supplied `onAdvance` guards on `submittedRef.current` before advancing. Rationale below.
- **DP-G1 (Ask-First — `scripts/qa/*.mjs`):** Phase 11 anchors (`submitted || isAnswerLocked`, `disabled={isAnswerLocked}`, `trackQuestionAnswered({`) **remain valid against `test.questionClient`** after the refactor (handler + answer buttons stay in client). Recommended G-1: keep assertions on `test.questionClient`, remove the speculative "Target-1 may move" annotation, add a new `test.answerLock` path key + assertion that `use-answer-lock.ts` owns the timer/lock. Requires explicit Ask-First approval.

### Governance — execution model

Per CLAUDE.md **Planning Flow** ("Do not begin implementation until the user explicitly approves the plan") and **Prohibited Actions** ("Do not invoke automated multi-wave execution… pipelines"), this plan will NOT be auto-executed end-to-end. After approval, waves execute **one at a time**, each followed by its gate; STATE.md trigger conditions (CLAUDE.md) are honored. Wave G is independently Ask-First and will be re-confirmed before its edits even if the plan is approved.

---

## 1. Pre-Edit Analysis

### PA-1 — Public prop interface of `TestQuestionClient`

`test-question-client.tsx:25-28`:

```ts
interface TestQuestionClientProps {
  locale: AppLocale;   // required
  card: LandingTestCard; // required
}
```

Two props, both required, neither optional. INV-2: this interface is byte-for-byte frozen across all waves.

### PA-2 — Line ranges of non-render logic blocks (pre-session)

| Block | Lines |
|---|---|
| `clearAutoAdvanceTimer` callback | 100–105 |
| submitted ref synchronization effect | 107–109 |
| timer cleanup on unmount effect | 111–115 |
| timer cleanup on question-index change effect | 117–119 |
| `beforeunload` guard effect | 121–136 |
| landing transition completion effect | 138–154 |
| answer choice handler `handleAnswerChoice` (incl. `setIsAnswerLocked(true)` @263 + 150ms timer @265–278) | 238–279 |
| previous-button inline `onClick` handler | 455–461 |
| qualifier chip `onKeyDown` handler | 402–407 |

Supporting declarations: `autoAdvanceTimerRef` useRef @70; `isAnswerLocked` useState @72; `submittedRef` useRef @98; `slideDirectionRef` @69 / `slideDirection` state @71 (NOT in scope — stays in client).

### PA-3 — All `autoAdvanceTimerRef` call sites

| Line | Operation |
|---|---|
| 70 | declare `useRef<ReturnType<typeof window.setTimeout> | null>(null)` |
| 101 | read (`!== null` guard, inside `clearAutoAdvanceTimer`) |
| 102 | read (`window.clearTimeout(...)`) |
| 103 | set `null` (inside `clearAutoAdvanceTimer`) |
| 265 | set (assign `window.setTimeout(...)` result, inside handler) |
| 267 | set `null` (first line of the timer callback) |

All six move into `use-answer-lock.ts` (Wave C). Zero `autoAdvanceTimerRef` references may remain in the client post-Wave C.

### PA-4 — `QualifierChip` derived values (chip render block 394–411)

| Source in client | Becomes prop | Type |
|---|---|---|
| `qualifierChipLabel` (useMemo @226–236, uses `t`) — rendered as child @409 | `label` | `string` |
| `t('qualifierChipAriaLabel')` @399 | `ariaLabel` | `string` |
| `reopenQualifierOverlay` (orchestrator, no-arg) — `onClick` @401 + `onKeyDown` Enter/Space @402–407 | `onActivate` | `() => void` |

Carried into the component (not props): `role="button"` @396, `tabIndex={0}` @397, `className={testQualifierChipClassName}` @398 (constant moves into the new file), `data-testid="test-qualifier-chip"` @400, the Enter/Space `preventDefault` keydown logic @402–407.

Render condition `entryCommitted && qualifierItems.length > 0 && overlayMode !== 'reentry'` (@394) **stays in client**; client renders `<QualifierChip/>` only when true (no condition logic in component). `qualifierChipLabel` useMemo **stays in client** (uses `t`).

### PA-5 — `OverlayConnector` derived values (overlay render block 340–387)

Gate boolean `instructionVisible` (computed @196–206 from `overlayMode`, `isBooting`, `entryCommitted`, `redirecting`, `overlayStep`, `instructionSeen`, `entryPolicy.canAutoCommitAfterInstructionSeen`, `qualifierItems.length`) **stays in client**, passed as `visible`.

`t(...)` calls inside the block (all move to client, passed as label props — component has no `useTranslations`):

| `t(...)` call | Current location |
|---|---|
| `t('instructionTitle')` | title @342 |
| `t(entryPolicy.content.consentNoteKey)` via `instructionNote` @210 | consentNote @344 |
| `t(primaryButton.labelKey)` / `t('next')` (instruction step + qualifiers) | primaryLabel @346–350 |
| `t(secondaryButton.labelKey)` | secondaryLabel @351 |
| `t('next')` (qualifier continue, not last) | qualifierStep.continueLabel @375 |
| `t('qualifierRestartConfirm')` (reentry, last) | qualifierStep.continueLabel @377 |
| `t('start')` (entry, last) | qualifierStep.continueLabel @378 |
| `t('cancel')` (reentry back) | qualifierStep.backLabel @382 |
| `t('overlayBack')` (entry back) | qualifierStep.backLabel @382 |

Orchestrator/derived inputs: `overlayStep`, `overlayMode`, `qualifierDraft`, `executeInstructionAction`, `onQualifierSelect`, `onQualifierBack`, `currentQualifierItem` (@220–221, derived from `overlayStep`+`qualifierItems`), `currentQualifierStepIndex` (@219), `qualifierItems`. `entryPolicy` inputs: `content.instructionText`, `content.consentNoteKey`, `content.showDivider`, `cta.primary` (`primaryButton`), `cta.secondary` (`secondaryButton`), `primaryButton.testId`, `secondaryButton?.testId`, `primaryButton.action`, `secondaryButton?.action`.

The `qualifierStep` object (@364–385) is reconstructed **inside** `OverlayConnector` from props (`overlayStep`, `overlayMode`, `qualifierDraft`, `qualifierItems`, `currentQualifierItem`, `currentQualifierStepIndex`, and the passed-in label strings). It is NOT a prop (internal detail, per spec §7). Final prop list locked at Wave E pre-edit step (the spec's prop list is explicitly approximate; full list below in Wave E section).

### PA-6 — `ResultConnector` derived values + `TestResultPanel` interface

Client → `TestResultPanel` (@328–337): `questions`, `answers`, `locale`, `landingPath`, `route={pathname}`, `variant`, `landingIngressFlag`.

`TestResultPanel` current prop interface (`test-result-panel.tsx:32-40`):

```ts
interface TestResultPanelProps {
  questions: ReadonlyArray<ResolvedQuestion>;
  answers: Record<string, string>;
  locale: AppLocale;
  landingPath: LocalizedRoutePath;   // NOTE: actual type is LocalizedRoutePath, not string (spec §8 said string)
  route: string;
  variant: string;
  landingIngressFlag: boolean;
}
```

`ResultConnector` is a thin pass-through with identical prop names/types. `derivedType` is **not** added now — placeholder TODO comment only (2위 Result pipeline). Existing TODO already present at `test-result-panel.tsx:54` and `:70`; `docs/plans/result-pipeline-todos.md` exists. Deferred item recorded below.

### PA-7 — Phase 11 QA script annotation

`scripts/qa/check-phase11-telemetry-contracts.mjs:165-176`:

```js
if (fileExists(test.questionClient)) {
  const questionClient = read(test.questionClient);
  // Target-1 may move this UI ownership; keep this call-site anchor current when that refactor lands.   [annotation @168]
  if (!/submitted \|\| isAnswerLocked/u.test(questionClient) || !/disabled=\{isAnswerLocked\}/u.test(questionClient)) {
    fail('Test question client must keep answer-lock guarding at the current answer choice call sites.');   // @169-171
  }
  if (!/trackQuestionAnswered\(\{/u.test(questionClient)) {
    fail('Test question client must emit question_answered from the answer choice call site.');             // @173-175
  }
}
```

`test.questionClient` = `src/features/test/test-question-client.tsx` (`_path-config.mjs:60`). No `answerLock` key exists in `_path-config.mjs`.

Post-refactor anchor analysis:
- `disabled={isAnswerLocked}` — answer buttons stay in client (@429, @441). Anchor **holds**.
- `submitted || isAnswerLocked` — handler guard line 239 (`if (!currentQuestion || submitted || isAnswerLocked)`) stays in client (handler not moved per Wave C spec). Anchor **holds**.
- `trackQuestionAnswered({` — handler stays in client (@246). Anchor **holds**.

→ The anchors do **not** require re-homing; the speculative annotation can be retired. See Wave G / DP-G1 for the recommended companion edit (Ask-First).

### PA-8 — vitest config

`vitest.config.ts`: `include: ['tests/unit/**/*.test.ts']`, `exclude: ['tests/e2e/**']`. `.test.tsx` is **NOT** collected. New tests MUST be `tests/unit/*.test.ts` using `// @vitest-environment jsdom` + `React.createElement` + `createRoot` (no JSX). Confirmed patterns:
- `tests/unit/instruction-overlay.test.ts` — pure component, **no provider** (props only). → mirror for `qualifier-chip.test.ts` and `overlay-connector.test.ts` (both spec'd pure, no `useTranslations`).
- `tests/unit/test-result-panel.test.ts` — wraps `NextIntlClientProvider` (uses `useTranslations`) + mocks telemetry.

---

## 2. Decision Points

### DP-B1 — Wave B input set (spec vs. code mismatch) — minor, documented

Spec §4 lists hook inputs `pendingTransitionId`, `clearPendingTransitionId`, `pathname`. Actual effect (`test-question-client.tsx:138-154`) gates on `!runtimeReady || pendingTransitionId === null` and calls `completePendingLandingTransition({targetType: 'test'})` — **`pathname` is never read; `runtimeReady` is required**. Deviation is minor (input naming, no behavior change). **Recommendation:** `useLandingTransitionCompletion` receives `{ runtimeReady, pendingTransitionId, clearPendingTransitionId }`. Effect body and deps array (`[runtimeReady, pendingTransitionId, clearPendingTransitionId]`) moved verbatim. Proceeding per task §11 ("proceed with note if minor") — surfaced for confirmation.

### DP-C1 — `submittedRef` ownership

Original timer callback (@266–278) closes over `submittedRef` (synced @107–109) and, when `submittedRef.current` is true, returns **before** `setIsAnswerLocked(false)` / `moveQuestion`. When `submitted` is true the result panel renders and answer buttons are unmounted, so the value of `isAnswerLocked` at that point is not observable. Both "guard in hook" and "guard in client `onAdvance`" preserve observable behavior.

**Recommendation:** `submittedRef` declaration (@98) and its sync effect (@107–109) **stay in the client** — `submitted` is controller-derived client state and the answer handler (which stays in client) is its only consumer. `useAnswerLock` stays submission-agnostic. The client builds `onAdvance` closing over `submittedRef`; `onAdvance` early-returns when `submittedRef.current` is true, otherwise sets slide direction forward and calls `moveQuestion(1, choice)`. `lockAnswer` schedules `setTimeout(() => { unlockAnswer(); onAdvance(); }, delayMs)`. Net behavior identical (unlock-then-advance; advance suppressed if submitted; lock state irrelevant once submitted).

### DP-G1 — Phase 11 QA re-homing (Ask-First, `scripts/qa/*.mjs`)

Per PA-7 all three anchors stay valid against `test.questionClient`. **Recommendation:**
1. `scripts/qa/_path-config.mjs`: add `answerLock: 'src/features/test/use-answer-lock.ts'` to the `test` export object.
2. `scripts/qa/check-phase11-telemetry-contracts.mjs`: keep the three existing assertions on `test.questionClient`; **remove** the `// Target-1 may move…` annotation (@168, refactor landed, anchors proved stable); **add** a new assertion that `test.answerLock` exists and its content matches `/setTimeout/` and `/isAnswerLocked/` (lock/timer ownership now lives there).
3. No change to `trackQuestionAnswered` assertion (stays on `test.questionClient`).

This is Ask-First; the specific diff will be re-confirmed at Wave G even under plan approval.

### No other deviations

`buildSemanticAnswerMap` not re-opened (prior DP-3, frozen). No new npm deps (INV-4). No `.test.tsx` (PA-8). No new `data-testid` beyond existing, except none needed — D/E reuse existing testids.

---

## 3. Scope Table

| Wave | Target | Effort | Behavior change | Status |
|---|---|---|---|---|
| A | Extract `useBeforeUnloadGuard` | S | No | **DONE — gate passed** |
| B | Extract `useLandingTransitionCompletion` | S | No | **DONE — gate passed** |
| C | Extract `useAnswerLock` (timer ref fully owned) | M | No | **DONE — gate passed** |
| D | Extract `QualifierChip` | M | No | **DONE — gate passed** |
| E | Extract `OverlayConnector` | M | No | **DONE — gate passed** |
| F | Extract `ResultConnector` | S | No | **DONE — gate passed** |
| G | Phase 11 QA re-homing + line-count verify | S | No | **DONE — Ask-First re-confirmed, gate passed** |

Execution order strict: A → B → C → D → E → F → G. C only after A+B gates pass. E only after D. G only after A–F.

---

## 4. Per-Wave Detail

### Wave A — `useBeforeUnloadGuard`

- New file `src/features/test/use-before-unload-guard.ts`, single named export `useBeforeUnloadGuard`, void hook.
- Moves effect @121–136 verbatim. Signature: `useBeforeUnloadGuard({ started, submitted }: { started: boolean; submitted: boolean }): void`. Effect deps `[started, submitted]`.
- Client: delete @121–136, add `useBeforeUnloadGuard({started, submitted});` at the same position.
- Gate: `npm test` ≥462 pass, zero assertion changes. `grep -n "beforeunload" src/features/test/test-question-client.tsx` → 0 matches.

### Wave B — `useLandingTransitionCompletion`

- New file `src/features/test/use-landing-transition-completion.ts`, single named export, void hook.
- Per **DP-B1**: signature `useLandingTransitionCompletion({ runtimeReady, pendingTransitionId, clearPendingTransitionId }: { runtimeReady: boolean; pendingTransitionId: string | null; clearPendingTransitionId: () => void }): void`.
- Imports `completePendingLandingTransition` from `@/features/transition/runtime` (import-only; High-Risk dir not modified; path confirmed stable, also used by `blog-destination-client.tsx`).
- Moves effect @138–154 verbatim incl. deps `[runtimeReady, pendingTransitionId, clearPendingTransitionId]`.
- Client: delete @138–154 + remove now-unused `completePendingLandingTransition` import (@11); add hook call.
- Gate: `npm test` ≥462. `grep -n "completePendingLandingTransition" src/features/test/test-question-client.tsx` → 0 matches.

### Wave C — `useAnswerLock` (highest risk; after A+B)

- New file `src/features/test/use-answer-lock.ts`, single named export `useAnswerLock`.
- Owns: `autoAdvanceTimerRef` (PA-3 all six sites), `isAnswerLocked` useState (init `false`), `clearAutoAdvanceTimer` callback (@100–105), unmount cleanup effect (@111–115), question-index cleanup effect (@117–119, dep on `currentQuestionIndex` → received as input).
- Per **DP-C1**: does NOT own `submittedRef`/its sync effect (stay in client).
- Returned interface (final):

```ts
interface UseAnswerLockResult {
  isAnswerLocked: boolean;
  lockAnswer: (onAdvance: () => void, delayMs?: number) => void;
  unlockAnswer: () => void;
  clearTimer: () => void;
}
function useAnswerLock(params: { currentQuestionIndex: number }): UseAnswerLockResult;
```

- `lockAnswer(onAdvance, delayMs = 150)`: `setIsAnswerLocked(true)` → clear existing timer → `autoAdvanceTimerRef.current = window.setTimeout(() => { autoAdvanceTimerRef.current = null; setIsAnswerLocked(false); onAdvance(); }, delayMs)`.
- `unlockAnswer()`: `setIsAnswerLocked(false)`.
- `clearTimer()`: clears timer ref only; does not touch lock state.
- Client after C: remove `autoAdvanceTimerRef` decl @70, `isAnswerLocked` useState @72, `clearAutoAdvanceTimer` @100–105, unmount effect @111–115, qindex effect @117–119, the @262–278 timer block inside `handleAnswerChoice`. `submittedRef` (@98) + sync effect (@107–109) remain. Destructure `{ isAnswerLocked, lockAnswer, unlockAnswer, clearTimer } = useAnswerLock({ currentQuestionIndex })`.
- `handleAnswerChoice` stays in client; the slide-direction-forward + `moveQuestion(1, choice)` (guarded by `submittedRef.current`) becomes the `onAdvance` passed to `lockAnswer`. The `if (!started || submitted || isLastQuestion) { clearTimer(); return; }` early path preserved using `clearTimer()`.
- Previous-button handler (@455–461): `clearTimer()` then `unlockAnswer()` (explicit) replacing `clearAutoAdvanceTimer()` + `setIsAnswerLocked(false)`; slide-direction-backward + `moveQuestion(-1)` unchanged.
- Gate: `npm test` ≥462. `grep -n "autoAdvanceTimerRef\|setTimeout" src/features/test/test-question-client.tsx` → 0 matches; `isAnswerLocked` only as destructured hook return.

### Wave D — `QualifierChip` (after C)

- New file `src/features/test/qualifier-chip.tsx`, single named export `QualifierChip`, pure presentational, no hooks, no `useTranslations`.
- Props (from PA-4):

```ts
interface QualifierChipProps {
  label: string;
  ariaLabel: string;
  onActivate: () => void;
}
```

- Carries `role="button"`, `tabIndex={0}`, `data-testid="test-qualifier-chip"`, `testQualifierChipClassName` (constant moved into file), Enter/Space `preventDefault`→`onActivate` keydown.
- Client renders `<QualifierChip label={qualifierChipLabel} ariaLabel={t('qualifierChipAriaLabel')} onActivate={reopenQualifierOverlay} />` only when `entryCommitted && qualifierItems.length > 0 && overlayMode !== 'reentry'`. `qualifierChipLabel` useMemo stays in client.
- New test `tests/unit/qualifier-chip.test.ts` (PA-8 pattern, no provider). Cases D-1..D-5: label text, click→onActivate, aria-label match, Enter→onActivate, Space→onActivate.
- Gate: `npm test` rises ≥5, all pass. `grep -n "qualifierChipLabel\|reopenQualifierOverlay\|qualifierChipAriaLabel" src/features/test/test-question-client.tsx` → only prop-passing refs, no render/keydown logic.

### Wave E — `OverlayConnector` (most complex; after D)

- New file `src/features/test/overlay-connector.tsx`, single named export `OverlayConnector`, pure presentational, no `useTranslations`.
- Renders `<InstructionOverlay/>` directly; reconstructs the `qualifierStep` object internally from props. Returns `null` when `visible === false`.
- Prop list (final, from PA-5 — verified at pre-edit step of Wave E before coding):

```ts
interface OverlayConnectorProps {
  visible: boolean;
  // labels (client-computed via t)
  title: string;
  instructionText: string;
  consentNote?: string;
  showDivider: boolean;
  primaryLabel: string;
  secondaryLabel?: string;
  primaryTestId?: string;
  secondaryTestId?: string;
  // qualifier-step label strings (client-computed via t)
  qualifierContinueNextLabel: string;     // t('next')
  qualifierRestartConfirmLabel: string;   // t('qualifierRestartConfirm')
  qualifierStartLabel: string;            // t('start')
  qualifierReentryCancelLabel: string;    // t('cancel')
  qualifierEntryBackLabel: string;        // t('overlayBack')
  // orchestrator / derived state
  overlayStep: /* OverlayStepId */ unknown;
  overlayMode: 'entry' | 'reentry';
  qualifierDraft: Record<number, string>;
  qualifierItems: ReadonlyArray<QualifierOverlayItem>;
  currentQualifierItem?: QualifierOverlayItem;
  currentQualifierStepIndex: number | null;
  // actions
  onPrimaryAction: () => void;            // executeInstructionAction(primaryButton.action)
  onSecondaryAction?: () => void;
  onQualifierSelect: (canonicalIndex: number, token: string) => void;
  onQualifierBack: () => void;
}
```

Exact `overlayStep` type resolved from the orchestrator's exported type at Wave E pre-edit (no `any`; reuse the exported union). If the verified prop set diverges structurally from the above, Wave E halts and re-confirms (task §12).
- Client computes every label with `t(...)` (same keys, PA-5 table), computes `visible = instructionVisible`, passes flat props; deletes inline overlay JSX @340–387.
- New test `tests/unit/overlay-connector.test.ts` (PA-8 pattern, no provider). Cases E-1..E-5: not visible→nothing; entry primary→onPrimaryAction; entry qualifier step→onQualifierSelect; reentry cancel uses `qualifierReentryCancelLabel`; back→onQualifierBack.
- Gate: `npm test` rises ≥5, all pass. `grep -n "InstructionOverlay\|qualifierStep\|executeInstructionAction" src/features/test/test-question-client.tsx` → only `<OverlayConnector` usage / prop-passing, no inline overlay construction.

### Wave F — `ResultConnector` (after E)

- New file `src/features/test/result-connector.tsx`, single named export `ResultConnector`, thin pass-through, no hooks.
- Props mirror PA-6 `TestResultPanelProps` exactly (incl. `landingPath: LocalizedRoutePath`). Add a single TODO line: `// TODO(2위 result pipeline): add derivedType when result pipeline is implemented` — prop NOT added.
- Imports + renders `<TestResultPanel/>`. Client removes `TestResultPanel` import (@14); `submitted ? <ResultConnector .../> : ...`.
- Gate: `npm test` ≥462 (no new test; `test-result-panel.test.ts` covers the panel). `grep -n "TestResultPanel" src/features/test/test-question-client.tsx` → 0 matches.

### Wave G — Phase 11 QA re-homing + line count (Ask-First; after A–F; re-confirm before edit)

Per **DP-G1**: edit `_path-config.mjs` (add `answerLock` key) + `check-phase11-telemetry-contracts.mjs` (keep 3 client anchors, drop stale annotation, add `test.answerLock` ownership assertion). Decisions table:

| Question | Decision |
|---|---|
| `isAnswerLocked` assertion change target? | No — stays `test.questionClient` (button `disabled={isAnswerLocked}` + handler guard stay in client). |
| `trackQuestionAnswered` assertion stays on `test.questionClient`? | Yes (handler not moved). |
| New path key needed? | Yes — `test.answerLock = 'src/features/test/use-answer-lock.ts'`. |
| Annotation handling? | Remove `// Target-1 may move…` (@168); add ownership assertion against `test.answerLock` (`/setTimeout/` + `/isAnswerLocked/`). |

- G-2: record `wc -l src/features/test/test-question-client.tsx` before (**486**) and after. Projection: removals across A–F net ≈ 60–90 lines → projected **≈ 400–430**, well under the 500 circuit breaker. If post count > 500, document overage + next extraction candidate; do NOT self-resolve beyond scope.
- Gate: `npm run qa:rules` 12/12; `wc -l` recorded.

---

## 5. Constraints Compliance

- Each new file: single named export, target 30–500 lines, no barrel edits.
- Hooks `src/features/test/use-*.ts`; components `src/features/test/*.tsx`; tests `tests/unit/*.test.ts`.
- INV-1 (file not renamed/moved), INV-2 (prop interface frozen), INV-3 (zero existing-assertion changes; import-path updates only where a moved export requires — none expected, all new files), INV-4 (no new deps) — all upheld.
- Any wave revealing awkward prop drilling or a frozen-perimeter touch → halt, document, report (no self-resolve).

---

## 6. Verification Results

_To be filled during execution (per wave + session-final). Empty until approved & executed._

| Stage | Command | Result |
|---|---|---|
| Baseline | `npm test` | **462 passed (462)**, 70 files — matches declared baseline |
| Wave A | `npm test` + grep | **462 passed (462)**; `grep beforeunload` → 0 matches. New file 33 lines (≥30). INV-1..4 upheld. |
| Wave B | `npm test` + grep | **462 passed (462)**; `grep completePendingLandingTransition` in client → 0 matches. New hook 35 lines. |
| Wave C | `npm test` + grep | **462 passed (462)**; `grep "autoAdvanceTimerRef\|setTimeout"` in client → 0 matches; `isAnswerLocked` remains only at hook destructure, handler guard, and button disabled call sites. New hook 56 lines. |
| Wave D | focused test + `npm test` + grep | `tests/unit/qualifier-chip.test.ts` **5 passed**; full suite **467 passed (467)**; grep confirms only prop-passing/derived-label refs remain in client. New component 37 lines; new test 118 lines. |
| Wave E | focused test + `npm test` + grep | `tests/unit/overlay-connector.test.ts` **5 passed**; full suite **472 passed (472)**; grep confirms no `InstructionOverlay` or inline `qualifierStep` construction remains in client. New component 104 lines; new test 160 lines. |
| Wave F | `npm test` + grep | **472 passed (472)**; `grep TestResultPanel` in client → 0 matches. New connector 39 lines. |
| Wave G | `npm run qa:rules`, `wc -l` | **12/12 QA checks passed**; `test.answerLock` path added; stale annotation removed; ownership assertion added for `setTimeout` + `isAnswerLocked`; client line count **406**. |
| Final | lint/typecheck/test/build/qa:rules/`git diff --check` | **PASS**: `npm run lint`, `npm run typecheck`, `npm test` (**472 passed / 72 files**), `npm run build`, `npm run qa:rules`, and `git diff --check` all passed. One initial typecheck failure found `use-answer-lock.ts` timer ref as `ReturnType<typeof window.setTimeout>` resolving to Node `Timeout`; fixed to the repo-standard `number | null`, then the full final gate was rerun from lint and passed. |

Expected final unit count: ≥462 + Wave D (≥5) + Wave E (≥5) = **≥472**. Actual final unit count: **472**.

---

## 7. Deferred Items

- **2위 Result pipeline:** `ResultConnector` carries a TODO for `derivedType`; not added this session. Aligns with existing TODOs at `test-result-panel.tsx:54`, `:70` and `docs/plans/result-pipeline-todos.md`. When that session lands: add `derivedType` prop through `ResultConnector` → `TestResultPanel`, IntersectionObserver on derived_type block, add `derived_type` to `result_viewed` payload.
- **Scoped E2E** (not in default Done gate): recommend `tests/e2e/qualifier-overlay.spec.ts` + `tests/e2e/consent-smoke.spec.ts` post-session to confirm overlay/chip/auto-advance behavior — to confirm with user.
</content>
</invoke>
