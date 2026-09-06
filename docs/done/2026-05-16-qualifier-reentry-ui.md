# Implementation Plan — Qualifier Reentry UI, final_submit Qualifier Exclusion, 150ms Answer Lock, `question_answered` Telemetry

- **Date**: 2026-05-16
- **Feature branch target**: `main`
- **Plan status**: Approved 2026-05-16. All four §8 decisions resolved (D2 confirmed, D3 scoped to reentry-only, D4 follows Q-F1 override, D9 approved). Implementation authorized — see §8.
- **Author**: Claude Code (planning session)

---

## 0. Scope Summary

| Sub-task | Label | Observable change? |
|---|---|---|
| A | qualifier exclusion from `final_submit` + result-panel filter | Internal contract fix + visible result panel change |
| B | Qualifier reentry chip + overlay reopen | Yes — new UI |
| C | `RESET_SCORING_ANSWERS` reducer action | Yes — scoring reset on reentry confirm |
| D | 150ms answer lock (`isAnswerLocked`) | Yes — choice buttons disabled during advance |
| E | `question_answered` telemetry type + `trackQuestionAnswered` | Yes — new event fires |

This plan converts the confirmed behavioral contracts into a concrete, code-verified
implementation sequence. **It does not implement anything.** Section 3 documents
every place where the contract spec diverges from the actual repository state, with a
recommended reconciliation and an explicit decision request where a product/architecture
call is required.

---

## 1. Relevant SSOT Contracts and Project Rules (per AGENTS.md §2 Task Routing Table)

This task spans two routing rows: **test flow / domain** and **transition / telemetry / consent**.

| Concern | SSOT Contract | Project Rules | Verify anchor |
|---|---|---|---|
| Test flow / runtime / qualifier | `docs/req-test.md`, `docs/req-test-plan.md` | `docs/agent-guides/project-rules.md §TestFlow` | `docs/agent-guides/verification-commands.md #test-flow` |
| Telemetry event surface / validation | `docs/req-landing.md §8, §12, §13` | `docs/agent-guides/project-rules.md §Blog-Telemetry-Theme` | `docs/agent-guides/verification-commands.md #telemetry` |

**Gold Standard touched (AGENTS.md §6):** `src/features/telemetry/validation.ts`
("Telemetry payload hygiene"). Replicate its existing assertion style exactly
(`assertStringField` / `assertNumberField` / boolean inline checks). Do not
restructure the file.

**§4 boundary classification of the change set:** None of the files to be modified
are in the §4 *Never*, *Ask First*, or *High-Risk* lists. Plan mode is triggered by
**SSOT-contract-governed work** (AGENTS.md §7), not by an Ask-First/High-Risk path.
`src/features/telemetry/consent-source.ts` and `src/features/transition/**` (High-Risk)
are **not** modified.

**Project-rules constraints honored:**
- §TestFlow: CTA labels & consent notes owned by locale messages (not fixtures, not
  hardcoded in the overlay). The new chip/cancel/restart labels go in `src/messages/*`.
- §TestFlow: Storage Key SSOT — no new storage keys introduced; `writeResponseSet`
  is reused as-is.
- §Blog-Telemetry-Theme: Telemetry API payload requires `event_type`; single consent
  source untouched; `400` on validation failure / `204` on success contract preserved
  by extending (not loosening) `validation.ts`.

---

## 2. All Files To Be Modified / Created

### Modified (source)

| # | File | Functional change |
|---|---|---|
| 1 | `src/features/telemetry/types.ts` | Add `QuestionAnsweredEvent`, `ResultViewedEvent`; extend `TelemetryEventType` union; extend `TelemetryEvent` union. |
| 2 | `src/features/telemetry/validation.ts` | Restore `final_responses` to strict `'A'\|'B'`; add 2 event types to allowlist; add 2 validation branches; (decision D9) post-attempt session-id rule. |
| 3 | `src/features/telemetry/runtime.ts` | Add `trackQuestionAnswered` helper. |
| 4 | `src/features/test/test-run-reducer.ts` | Add `RESET_SCORING_ANSWERS` action + handler. |
| 5 | `src/features/test/use-test-run-controller.ts` | Filter qualifier indexes out of `final_submit`; add `resetScoringAnswers()`; expose dwell snapshot accessor (decision D2). |
| 6 | `src/features/test/use-test-entry-orchestrator.ts` | Add `overlayMode`; `reopenQualifierOverlay`; reentry confirm/cancel paths; new `answers` input. |
| 7 | `src/features/test/instruction-overlay.tsx` | Add `isReentry`/back-label props; reentry cancel test id. |
| 8 | `src/features/test/test-question-client.tsx` | Chip, `isAnswerLocked`, `instructionVisible` reentry override, `question_answered` call, label wiring; render `<TestResultPanel/>` instead of inline result block (see §8-D14). |
| 9 | `src/messages/{de,en,es,fr,hi,id,ja,kr,pt,ru,zs,zt}.json` (12 files) | Add 4 keys under `test` namespace. |

### Modified (tests)

| # | File | Change |
|---|---|---|
| 10 | `tests/unit/test-run-reducer.test.ts` | Add `describe('RESET_SCORING_ANSWERS')` block (5 cases). |
| 11 | `tests/e2e/qualifier-overlay.spec.ts` | Add reentry `describe` block (5 cases). |
| 11a | `tests/unit/use-test-entry-orchestrator.test.ts` | `makeInput` helper: add required `answers: {}` + `resetScoringAnswers: vi.fn()` (D5/D13 interface change — necessary to keep existing regression tests compiling; no behavioral assertions changed). |
| 11b | `tests/unit/test-entry-orchestrator-qualifier.test.ts` | Same `makeInput` two-prop addition as 11a (D5/D13). |
| 11c | `tests/unit/landing-telemetry-validation.test.ts` | One fixture value `final_responses['13']: 'M' → 'A'` (BC-A-2: `final_responses` tightened to A/B-only; the `'M'` exercised the now-removed relaxation, and qualifier tokens no longer appear in `final_submit` per BC-A-1). Canonical-index-key intent preserved. |

### Created (source) — §8-D14 approved deviation

| # | File | Purpose |
|---|---|---|
| S1 | `src/features/test/test-result-panel.tsx` | Presentational `TestResultPanel` extracted from the client's `submitted` branch (test-stage + result panel incl. the 8f qualifier filter + result-pipeline TODO). Self-contained class consts, consistent with the `instruction-overlay.tsx` convention. ~70 LOC. |

### Created (tests)

| # | File | Purpose |
|---|---|---|
| 12 | `tests/unit/telemetry-question-answered.test.ts` | `question_answered` / `result_viewed` type + validation (8 cases incl. D9 null session-id). |
| 13 | `tests/unit/test-entry-orchestrator-reentry.test.ts` | Orchestrator reentry behavior (5 cases). |

No barrel/`index.ts` files. **§8-D14 (user-approved 2026-05-17):** the original
"no new source files" constraint is amended — exactly **one** new source file
(`test-result-panel.tsx`) is added because Step 8 pushed `test-question-client.tsx`
to 509 LOC (>500 ceiling). Extraction is a cohesive, independently-testable unit
(>30 LOC, not a barrel), well under the "≥3 new files" hard limit. Post-extraction:
client ~478 LOC, new file ~70 LOC (see §6).

---

## 3. Verification Findings — Spec vs. Actual Code (MUST READ BEFORE IMPLEMENTATION)

The contract spec was written against an assumed code shape. Twelve points diverge
from the actual repository. Each is classified: **[AUTO]** = safe to reconcile with
the documented approach during implementation; **[DECISION]** = requires user
confirmation before execution (listed again in §8).

### D1 — `handleAnswerSelect` does not exist [AUTO]
Actual function: `handleAnswerChoice(choice: 'A' | 'B')` at
`test-question-client.tsx:218`. BC-D-2, BC-E-4, Step 8a/8b name it
`handleAnswerSelect`. **Reconciliation:** all spec references to
`handleAnswerSelect` map to `handleAnswerChoice`. The 150ms timer is
`autoAdvanceTimerRef`, callback at lines 232–244, navigation dispatch is
`moveQuestion(1, choice)` at line 242.

### D2 — `dwellStartRef` is not accessible from the client [DECISION]
`dwellStartRef` lives in `use-test-run-controller.ts:135`, is mutated at lines 257
and 292, and is **not** part of `TestRunControllerOutput`. BC-E-4's snippet
(`Date.now() - dwellStartRef.current`) cannot run in the client as written.
**Recommended:** add `getCurrentDwellMs(): number` to the controller output,
returning `dwellStartRef.current !== null ? Math.max(0, Date.now() - dwellStartRef.current) : 0`
(read-only; does not mutate the ref, so it does not disturb `settleCurrentQuestionDwell`).
The client calls it at click time. **Alternative:** add an independent client-local
`dwellStartRef` reset on `currentQuestionIndex` change — rejected because it would
double-track dwell and diverge from the controller's accumulation semantics.
→ **RESOLVED (§8-1):** Recommended approach approved. Add non-mutating
`getCurrentDwellMs()` to the controller output; the client calls it from
`handleAnswerChoice` at click time, immediately after answer selection and **before**
the 150ms lock/advance flow. No client-local dwell tracker.

### D3 — Overlay Back button label is a hardcoded `"Back"` literal [DECISION]
`instruction-overlay.tsx:90` renders the literal string `Back`, not `t('back')`.
No `back` key exists under the `test` namespace (verified absent in `en.json`).
BC-B-4 / Step 7 assume a `t('back')` baseline and "fall back to Back label".
**Recommended (consistent with project-rules.md §TestFlow "CTA labels owned by locale
messages"):** extend `qualifierStep` with an optional `backLabel?: string`. The
**client** (which owns `t`) passes the label: `t('back')` for entry — which means a
`back` key must also be added — or `t('cancel')` for reentry. Keep the overlay
copy-agnostic. **Alternative:** keep the hardcoded `Back` for entry and only override
to `t('cancel')` for reentry (smaller change, but leaves an untranslated entry-path
string and violates §TestFlow). → **RESOLVED (§8-2): scope label work to reentry
only.** The Alternative is adopted. `qualifierStep` still gains an optional
`backLabel?: string` (overlay stays copy-agnostic, renders `backLabel ?? 'Back'`),
but only **reentry** supplies a value: `t('cancel')`. Entry mode passes no
`backLabel`, preserving the existing hardcoded `'Back'` fallback. **No `back` locale
key is added.** Do not de-hardcode the entry-mode Back label unless strictly necessary
for the implementation (it is not — the `?? 'Back'` fallback keeps entry behavior
byte-identical). The §TestFlow deviation for the pre-existing entry-path literal is
explicitly accepted as out of scope for this task.

### D4 — `instructionVisible` actual expression differs from BC-B-2's stated baseline [DECISION]
Actual (`test-question-client.tsx:192–201`):
```
!isBooting && !entryCommitted && !redirecting &&
( overlayStep !== 'instruction' || !instructionSeen
  || !entryPolicy.canAutoCommitAfterInstructionSeen || qualifierItems.length > 0 )
```
BC-B-2's target **drops** the `overlayStep !== 'instruction'` disjunct and relocates
`!entryCommitted` inside the parentheses. This restructure is *required* for reentry
(during reentry `entryCommitted === true`, so the old top-level `!entryCommitted` gate
would force the overlay hidden). But implementing BC-B-2 verbatim also changes
**entry-path** visibility by removing `overlayStep !== 'instruction'`.
**Reconciliation (superseded):** the original plan proposed implementing BC-B-2
verbatim. → **RESOLVED (§8-3): do NOT implement BC-B-2 verbatim.** Follow the earlier
**Q-F1 decision**: preserve the existing entry-mode visibility expression unchanged
(including the `overlayStep !== 'instruction'` disjunct and the top-level
`!entryCommitted` gate) and add `overlayMode === 'reentry'` as an **override prefix**:

```
overlayMode === 'reentry' || (
  !isBooting && !entryCommitted && !redirecting &&
  ( overlayStep !== 'instruction' || !instructionSeen
    || !entryPolicy.canAutoCommitAfterInstructionSeen || qualifierItems.length > 0 )
)
```

This keeps the entry-path boolean shape byte-identical (a strict superset: the only
new way to be visible is `overlayMode === 'reentry'`, which is always `false` on the
entry path). Add regression coverage proving multi-step qualifier **entry** overlay
visibility is unchanged (T-4 entry guard + existing `qualifier-overlay.spec.ts` entry
cases must stay green).

### D5 — Orchestrator has no access to `answers` [AUTO, with interface addition]
`useTestEntryOrchestrator` input (lines 14–25) has no `answers`/`runState`. BC-B-3
(seed `qualifierDraft` from current answers) and BC-C-2 (qualifier-only
`writeResponseSet`) need them. **Reconciliation:** add `answers: Record<string, string>`
to `UseTestEntryOrchestratorInput` (read-only, already available in the client from
the controller output as `answers`). The controller owns
`resetScoringAnswers(qualifierAnswers)` (Step 5); the orchestrator uses `answers`
**only for (a) seeding `qualifierDraft`** on reopen. **Per §8-D13:** the qualifier-only
object for `writeResponseSet` AND the new qualifier map passed to
`resetScoringAnswers` are built from the **new `qualifierDraft`** (mirroring entry's
`buildQualifierAnswers()`), not from `answers` — otherwise the user's overlay edits
would be discarded.

### D6 — `hasAllRequiredAnswers` signature/behavior differs from BC-C-5's description [AUTO]
Actual (`test-run-reducer.ts:60–72`): `hasAllRequiredAnswers(answers, totalQuestions)`
iterates `index = 1..totalQuestions` and requires a non-empty string at each
`String(index)`. BC-C-5 says it "checks all canonical indexes in answers" — inaccurate
but the **intent holds**: after `RESET_SCORING_ANSWERS`, preserved qualifier tokens
remain at their canonical indexes and cleared scoring indexes become absent, so the
1..N scan returns `false` until every scoring question is re-answered. `SUBMIT` also
calls it (line 195) — same gating applies. **Reconciliation:** do not change
`hasAllRequiredAnswers`; add a reducer test asserting the *index-based* post-reset
gating explicitly (T-1 case using interleaved qualifier/scoring indexes).

### D7 — `final_responses` "relaxation" is precisely validation.ts:167–171 [AUTO]
The non-A/B relaxation is the loop:
```js
for (const response of Object.values(event.final_responses)) {
  if (typeof response !== 'string' || response.length === 0) { throw ... }
}
```
BC-A-2 restoration = replace the body so each value must be strictly `'A'` or `'B'`
(reuse the same strict pattern the spec wants for `question_answered.choice`).

### D8 — `TelemetryEventType` union must also be extended [AUTO, critical]
`types.ts:5–9` defines a standalone `TelemetryEventType` union; `TelemetryBaseEvent.event_type`
is typed as `TelemetryEventType`. New interfaces extending `TelemetryBaseEvent` with
`event_type: 'question_answered'` **fail typecheck** unless `'question_answered'` and
`'result_viewed'` are added to `TelemetryEventType`. Also: the spec writes
`extends BaseTelemetryEvent` — the real base interface is **`TelemetryBaseEvent`**.
The codebase naming convention is `XxxTelemetryEvent` (e.g. `AttemptStartTelemetryEvent`),
but the spec explicitly names them `QuestionAnsweredEvent` / `ResultViewedEvent`.
**Reconciliation:** (1) extend `TelemetryEventType` with both literals; (2) extend
both new interfaces from `TelemetryBaseEvent`; (3) use the spec's exact names
`QuestionAnsweredEvent` / `ResultViewedEvent` (spec is explicit; note the convention
divergence but follow the contract). The validation allowlist is the
`TELEMETRY_EVENT_TYPES` array at `validation.ts:7–12` — both literals added there too.

### D9 — `assertPostAttemptSessionId` and `question_answered` [DECISION]
`validation.ts:108–112` requires `session_id` for `attempt_start` and `final_submit`.
`question_answered` fires *after* `attempt_start`, so by the existing model it should
also require `session_id`. The spec is silent. **Recommended:** add `question_answered`
to `assertPostAttemptSessionId` for consistency. **Risk if added without confirmation:**
could break a test that constructs a `question_answered` event with `session_id: null`.
→ **RESOLVED (§8-4): APPROVED as a newly approved telemetry-consistency decision**
(not a previously confirmed product decision). `question_answered` fires after
`attempt_start` and must be linkable to the same attempt session as `final_submit`,
so it joins `assertPostAttemptSessionId` (non-null `session_id` required). A validation
test asserting `question_answered` with `session_id: null` is **rejected** is added
(T-2 case 8). No existing test constructs such an event (verified during planning).

### D10 — Result panel `.map()` location [AUTO]
`test-question-client.tsx:300` is `questions.map((question) => ...)`. BC-A-3 filter is
`questions.filter((q) => !isProfileQuestion(q)).map(...)`. `isProfileQuestion` is
exported from `question-runtime-utils.ts:211` but is **not yet imported** into the
client — add the import. Add the exact required comment:
`// TODO(result-pipeline): remove filter when result panel is replaced in 2위`.

### D11 — `trackQuestionAnswered` `route` argument [AUTO]
BC-E-3 input includes `route`; BC-E-4's call snippet omits it. The client has
`pathname`. **Reconciliation:** pass `route: pathname` at the call site (mirrors
`trackAttemptStart`/`trackFinalSubmit` which receive `route: pathname` from the
controller).

### D12 — "417 tests" is unverified [AUTO]
`tests/unit` has 66 test *files*; the spec's "417" is an assertion count, not verified
here. **Reconciliation:** capture the real baseline by running `npm test` *before* any
change; the completion report reconciles before/after against that captured number, not
against the literal 417.

---

## 4. Impact Assessment (AGENTS.md §7 required field)

| Dimension | Impact | Mitigation |
|---|---|---|
| Shared components (shell / GNB) | None. No `page-shell.tsx`/`site-gnb.tsx` touched. | — |
| Localization | Exactly 4 new keys × 12 locale files. Non-en values may equal en for now (localization pass out of scope). §8-2 resolved to reentry-only → **no `back` key added**. | Add identical keys to all 12 files atomically; verify with a key-parity check. |
| a11y | New chip is `role="button" tabIndex={0}` with Enter/Space handler + `aria-label` (deliberately not a `<button>` to avoid nesting inside the panel). Choice buttons gain `disabled` for 150ms. | `qualifier-overlay.spec.ts` uses `expectPageToBeAxeClean`; ensure chip + disabled-state pass axe. Verify focus ring tokens render. |
| State contracts | New reducer action `RESET_SCORING_ANSWERS`; new orchestrator `overlayMode`; controller `resetScoringAnswers()` + dwell accessor. `hasAllRequiredAnswers` unchanged. | Unit tests T-1/T-3; reducer phase stays `'active'`; storage write replaces full responseSet (no orphan scoring keys). |
| Core user flow (EGTT entry → answer → submit) | `instructionVisible` gains a `overlayMode === 'reentry' \|\|` override prefix (D4, Q-F1) — entry-path expression preserved byte-identical (strict superset); 150ms lock changes click cadence; reentry clears scoring answers (destructive to in-progress scoring — by design). | E2E reentry block + unchanged entry/consent/state smokes; D4 entry-visibility regression assertion; reentry is explicit user action (chip tap → confirm). |
| Telemetry contract | New event types broaden the union/allowlist (additive); `final_responses` is *tightened* (A/B-only) — could reject previously-accepted payloads. | `final_responses` was always logically A/B for scoring; qualifier exclusion (BC-A-1) removes the only non-A/B source before tightening. Order Steps 5-before-2 conceptually but both ship same change set; validation tests cover. |
| Theme-matrix visual | EGTT renders a chip during active phase; theme-matrix QA uses `qmbti`/representative rows (no qualifier) → no chip in captures. | `theme-matrix-smoke.spec.ts @gate` must show **no** snapshot diff for `test-question`. Treat any diff as regression (Claude Code guardrail). |

---

## 5. Implementation Sequence

`npm run typecheck` after Steps 2, 5, 8, and 12 (per spec) — catch type errors early.

> **Pre-flight:** run `npm test` and record the exact passing assertion count
> (reconciles D12). Re-read `AGENTS.md` if scope drifts.

### Step 1 — `src/features/telemetry/types.ts`
- Extend `TelemetryEventType` union: add `'question_answered'`, `'result_viewed'` (D8).
- Add `export interface QuestionAnsweredEvent extends TelemetryBaseEvent` with
  `event_type: 'question_answered'`, `variant: string`, `question_index_1based: number`,
  `choice: 'A' | 'B'`, `dwell_ms: number`, `landing_ingress_flag: boolean`.
- Add `export interface ResultViewedEvent extends TelemetryBaseEvent` with
  `event_type: 'result_viewed'`, `variant: string`, `derived_type: string`,
  `landing_ingress_flag: boolean`.
- Add both to the `TelemetryEvent` union.
- Note (D8): base is `TelemetryBaseEvent`, not `BaseTelemetryEvent`.

### Step 2 — `src/features/telemetry/validation.ts`  → typecheck
- Add `'question_answered'`, `'result_viewed'` to `TELEMETRY_EVENT_TYPES` (lines 7–12).
- BC-A-2: replace the `final_responses` value loop (lines 167–171) so each value must
  be exactly `'A'` or `'B'` (throw otherwise). Keep the canonical-index key check
  (lines 161–165) unchanged. This is the **only** `validation.ts` change beyond the
  two new branches.
- Add `case 'question_answered':` branch — require non-empty `variant`, positive
  integer `question_index_1based`, strict `choice` ∈ {`'A'`,`'B'`}, non-negative
  number `dwell_ms`, boolean `landing_ingress_flag`. Reuse `assertStringField`-style
  inline checks consistent with `attempt_start`/`final_submit`.
- Add `case 'result_viewed':` branch — require non-empty `variant`, non-empty
  `derived_type`, boolean `landing_ingress_flag`.
- (D9, **APPROVED §8-4**) Add `'question_answered'` to `assertPostAttemptSessionId`
  so it requires a non-null `session_id`, consistent with
  `attempt_start`/`final_submit`. Telemetry-consistency decision.

### Step 3 — `src/features/telemetry/runtime.ts`
- Import `QuestionAnsweredEvent` from types.
- Add `export function trackQuestionAnswered(input: { locale: AppLocale; route: string;
  variant: string; questionIndex: number; choice: 'A' | 'B'; dwellMs: number;
  landingIngressFlag: boolean }): void` — structurally mirror `trackAttemptStart`
  (lines 259–274): `enqueueOrSend({ ...createBaseEvent({...input, eventType:
  'question_answered'}), variant, question_index_1based: input.questionIndex,
  choice: input.choice, dwell_ms: input.dwellMs, landing_ingress_flag:
  input.landingIngressFlag } satisfies QuestionAnsweredEvent)`.
- Do **not** add `trackResultViewed` (BC-E-1, deferred to 2위).

### Step 4 — `src/features/test/test-run-reducer.ts`  (**§8-D13 enriched**)
- Add to `TestRunAction` union:
  `{ type: 'RESET_SCORING_ANSWERS'; firstScoringCanonicalIndex: number;
  qualifierAnswers: Record<string, StoredAnswer> }`.
  (`qualifierCanonicalIndexes` is **dropped** — the new qualifier map is authoritative
  and is keyed only by qualifier canonical indexes by construction, so an index set is
  redundant. KISS.)
- Add handler: if `state.phase !== 'active'` return `state`; else
  `return {...state, answers: {...action.qualifierAnswers},
  currentQuestionIndex: action.firstScoringCanonicalIndex}` — i.e. **replace**
  `state.answers` with the new qualifier-only map (scoring entries are absent →
  cleared), keep `phase: 'active'`, do not touch `entrySequence`/`entryMode`.
- Add T-1 test block (see §7).

### Step 5 — `src/features/test/use-test-run-controller.ts`  → typecheck
- BC-A-1: in `handleSubmit` (lines 363–381), build `finalResponses` by filtering
  `runState.answers` to **scoring-only** before passing to `trackFinalSubmit`.
  Use `isProfileQuestion` (already imported, line 21): exclude the canonical index
  of every question where `isProfileQuestion(q)` is true. Concretely: build a
  `Set<number>` of profile canonical indexes from `questions`, then
  `finalResponses = Object.fromEntries(Object.entries(runState.answers).filter(
  ([k]) => !profileIndexes.has(Number(k))))`.
- BC-C-3 (**§8-D13 enriched**): add
  `resetScoringAnswers(qualifierAnswers: Record<string, string>)` to the controller.
  It derives `firstScoringCanonicalIndex` from
  `findFirstScoringQuestion(questions)?.canonicalIndex` (import from
  `question-runtime-utils.ts`; fall back to `1` if `null`), then
  `dispatchRunAction({ type: 'RESET_SCORING_ANSWERS', firstScoringCanonicalIndex,
  qualifierAnswers })`. The orchestrator passes the **new qualifier draft map**
  (§8-D13). Expose `resetScoringAnswers` and `answers` (already exposed) so the
  orchestrator can perform the BC-C-2 storage write with the same draft map. Add
  `resetScoringAnswers` to `TestRunControllerOutput` with the new signature.
- D2 (**APPROVED §8-1**): add `getCurrentDwellMs(): number` to the controller output,
  returning `dwellStartRef.current !== null ? Math.max(0, Date.now() - dwellStartRef.current) : 0`
  (non-mutating snapshot; does not disturb `settleCurrentQuestionDwell`). No
  client-local dwell tracker.
- `qualifierItems` is already threaded into the controller (line 130, default
  `EMPTY_QUALIFIER_ITEMS`) — no signature change needed there.

### Step 6 — `src/features/test/use-test-entry-orchestrator.ts`
- Add `answers: Record<string, string>` to `UseTestEntryOrchestratorInput` (D5) and
  `resetScoringAnswers: (qualifierAnswers: Record<string, string>) => void`
  (from controller, threaded via the client; §8-D13 signature).
- Add `overlayMode: 'entry' | 'reentry'` state, init `'entry'`. Add to output.
- After `COMMIT_ENTRY` the mode stays `'entry'` (it already resets `overlayStep` to
  `'instruction'` at line 136 — leave `overlayMode` untouched there).
- Add `reopenQualifierOverlay` (stable `useCallback`, deps per §"Detailed Notes"):
  sets `overlayMode → 'reentry'`, `overlayStep → 0`, and **seeds** `qualifierDraft`
  once from `answers`: for each `qualifierItems` entry whose
  `answers[String(item.canonicalIndex)]` matches a `choices[].token`, set
  `qualifierDraft[item.canonicalIndex] = thatToken`. Add to output.
- Reentry **confirm** (Continue on the final qualifier reentry step — i.e. the
  existing `executeInstructionAction` `commitsRuntimeEntry` path while
  `overlayMode === 'reentry'` and on the last qualifier step): instead of
  `COMMIT_ENTRY`, build `qualifierOnlyResponses` from the **new `qualifierDraft`**
  via the existing `buildQualifierAnswers()` helper (§8-D13 — NOT from `answers`),
  call `resetScoringAnswers(qualifierOnlyResponses)`, then
  `writeResponseSet(variant, qualifierOnlyResponses)`, then set
  `overlayMode → 'entry'`, `overlayStep → 'instruction'`, `qualifierDraft → {}`.
  The enriched `RESET_SCORING_ANSWERS` writes the new qualifier map into
  `state.answers` (scoring cleared) so the in-session chip reflects the change.
  (BC-C-2/C-4, §8-D13.)
- Reentry **cancel** (Back from step 0 while `overlayMode === 'reentry'`): set
  `overlayMode → 'entry'`, `overlayStep → 'instruction'`, `qualifierDraft → {}`;
  do **not** touch `answers`/storage (BC-B-4). Entry-mode Back behavior unchanged.
- Note: the existing `executeInstructionAction` has `state.phase !== 'instruction'`
  guards inside the reducer for `COMMIT_ENTRY`. Reentry confirm must **not** rely on
  `COMMIT_ENTRY` (phase is `'active'`); it goes through `resetScoringAnswers()` +
  storage write + local overlay state reset only. Plan the branch so reentry never
  dispatches `COMMIT_ENTRY`.

### Step 7 — `src/features/test/instruction-overlay.tsx`
- Add to `qualifierStep` shape: `isReentry?: boolean` and `backLabel?: string`
  (D3, §8-2 reentry-only). Render the Back button label as
  `qualifierStep.backLabel ?? 'Back'`. Per §8-2 the **entry** path passes no
  `backLabel` (keeps the existing hardcoded `'Back'` fallback byte-identical); only
  **reentry** supplies a value. Do not de-hardcode the entry literal.
- When `qualifierStep.isReentry === true`, add
  `data-testid="test-qualifier-reentry-cancel-button"` to the Back button (distinct
  from `test-qualifier-back-button`). When `false`/undefined keep
  `test-qualifier-back-button`.
- Back `onClick` stays `qualifierStep.onBack` — the orchestrator owns the mode reset.
- No change to the non-qualifier instruction branch.

### Step 8 — `src/features/test/test-question-client.tsx`  → typecheck
- **8a** Add `const [isAnswerLocked, setIsAnswerLocked] = useState(false)` after the
  existing local state (after `slideDirection`, line ~74). In `handleAnswerChoice`
  (D1): early-return if `isAnswerLocked`; after `updateAnswer(choice)` and the
  existing last-question/booting guards, in the auto-advance path call
  `setIsAnswerLocked(true)`; inside the `autoAdvanceTimerRef` callback call
  `setIsAnswerLocked(false)` **before** `moveQuestion(1, choice)` (BC-D-2). In the
  Previous-button `onClick` (lines 404–418) and any manual nav: after
  `clearAutoAdvanceTimer()` also `setIsAnswerLocked(false)` (BC-D-3). Add
  `disabled={isAnswerLocked}` to both choice buttons (lines 379–400); keep
  `data-selected` bound to `currentAnswer` so the selected state stays correct while
  disabled (BC-D-5/D-6). Unmount cleanup already exists (lines 111–115).
- **8b** Import `trackQuestionAnswered`. In `handleAnswerChoice`, **before**
  `setIsAnswerLocked(true)`, compute `dwellMs` via the controller's
  `getCurrentDwellMs()` (D2) and call `trackQuestionAnswered({ locale,
  route: pathname, variant, questionIndex: <1-based current scoring index>,
  choice, dwellMs, landingIngressFlag })`. **Skip** the call when the current
  question is the last scoring question:
  `currentQuestion.canonicalIndex === lastScoringCanonicalIndex`, where
  `lastScoringCanonicalIndex = useMemo(() => questions.filter((q) =>
  !isProfileQuestion(q)).at(-1)?.canonicalIndex ?? 0, [questions])` (BC-E-4).
  For `questionIndex`, reuse the existing `currentScoringQuestionOrdinal`
  computation (1-based scoring ordinal, lines 209–212) — it is already the
  1-based scoring index.
- **8c** Add module-level `testQualifierChipClassName` constant with exactly the
  token classes in BC-B-6 (design tokens only, no hex). Render the chip as the
  **first child** of the `test-question-panel` div (line ~361), guarded by
  `entryCommitted && qualifierItems.length > 0 && overlayMode !== 'reentry'`
  (BC-B-5 + the §"Detailed Notes" guard so it hides while the reentry overlay is
  open). Chip markup exactly per BC-B-5 (`role="button"`, `tabIndex={0}`,
  `onKeyDown` Enter/Space, `aria-label={t('qualifierChipAriaLabel')}`,
  `data-testid="test-qualifier-chip"`). `qualifierChipLabel` via
  `useMemo([qualifierItems, answers, t])`: for each qualifier item, read
  `answers[String(item.canonicalIndex)]`, resolve the matching `choices[].label`;
  if absent use `t('qualifierPending')`; join with `' · '`. Add
  `handleQualifierChipClick` → calls `reopenQualifierOverlay()` only (client never
  sets `overlayMode`/`overlayStep` directly — BC-B-7).
- **8d** (D4, §8-3 Q-F1 — **NOT BC-B-2 verbatim**) Do **not** replace the existing
  `instructionVisible` expression (lines 192–201). Preserve it byte-identical and wrap
  it with a reentry override prefix:
  `overlayMode === 'reentry' || ( !isBooting && !entryCommitted && !redirecting && ( overlayStep !== 'instruction' || !instructionSeen || !entryPolicy.canAutoCommitAfterInstructionSeen || qualifierItems.length > 0 ) )`.
  Read the actual lines 192–201 first and copy the inner expression exactly as it
  stands; only add `overlayMode === 'reentry' || ( ... )` around it. This is a strict
  superset on the entry path (`overlayMode` is always `'entry'` there). T-4 must
  include an entry-visibility regression guard.
- **8e** Pass to `InstructionOverlay` (via the `qualifierStep` object, lines 343–357):
  `isReentry: overlayMode === 'reentry'`; `backLabel: overlayMode === 'reentry'
  ? t('cancel') : undefined` (§8-2 reentry-only: entry passes `undefined` so the
  overlay keeps its hardcoded `'Back'` fallback — **no `t('back')`**); and set
  `continueLabel` on the final qualifier step to `t('qualifierRestartConfirm')`
  when `overlayMode === 'reentry'` (else keep existing `t('next')`/`t('start')`).
- **8f** Result panel (line 300): `questions.filter((q) => !isProfileQuestion(q)).map(...)`
  with the exact comment
  `// TODO(result-pipeline): remove filter when result panel is replaced in 2위`
  on the filter line (BC-A-3, D10).
- **8g** Add imports: `trackQuestionAnswered` from telemetry runtime;
  `isProfileQuestion` from `question-runtime-utils`. Thread `answers` and
  `resetScoringAnswers` into the `useTestEntryOrchestrator(...)` call; destructure
  `overlayMode` and `reopenQualifierOverlay` from its return.

### Step 9 — Locale messages (12 files)
Add under the `test` namespace in each of
`de,en,es,fr,hi,id,ja,kr,pt,ru,zs,zt`.json:
```json
"qualifierRestartConfirm": "Change and restart",
"qualifierPending": "—",
"qualifierChipAriaLabel": "Change qualifier answers",
"cancel": "Cancel"
```
`cancel` is **absent** in en.json (verified) → add it everywhere. **§8-2 resolved to
reentry-only: do NOT add a `back` key** — exactly these 4 keys, no 5th. Non-English
values may equal English for now (localization out of scope). Verify 12/12 key
parity after editing.

---

## 6. Source File Size Check (CLAUDE.md / AGENTS.md ceiling)

| File | Pre LOC | Actual post-change | Under 500? |
|---|---|---|---|
| types.ts | 53 | 75 | ✅ (type-decl exemption also applies) |
| validation.ts | 203 | ~237 | ✅ |
| runtime.ts | 293 | ~314 | ✅ |
| test-run-reducer.ts | 205 | ~218 | ✅ |
| use-test-run-controller.ts | 409 | 436 | ✅ |
| use-test-entry-orchestrator.ts | 194 | 241 | ✅ |
| instruction-overlay.tsx | 146 | ~152 | ✅ |
| test-question-client.tsx | 437 | **478** | ✅ (post §8-D14 extraction) |
| **test-result-panel.tsx (NEW)** | — | **70** | ✅ |

**Resolved (§8-D14):** Step 8 first pushed `test-question-client.tsx` to **509 LOC**
(>500). Per CLAUDE.md / plan §6 the work **stopped** and a refactor was proposed for
approval (no reactive split). User approved extracting the `submitted` result panel
into a new `test-result-panel.tsx` (cohesive, independently testable, self-contained
class consts mirroring the `instruction-overlay.tsx` convention; the 8f qualifier
filter + result-pipeline TODO moved with it). Result: client **478**, new file **70**
— both well under 500. One new source file only (≪ the "≥3 new files" hard limit);
not a barrel; not a sub-30-LOC extraction.

---

## 7. Test Plan

### T-1 `tests/unit/test-run-reducer.test.ts` — `describe('RESET_SCORING_ANSWERS')`
(**§8-D13 enriched action**: `{firstScoringCanonicalIndex, qualifierAnswers}`)
1. `state.answers` becomes exactly the new `qualifierAnswers` map (old scoring +
   old qualifier values fully replaced; scoring cleared).
2. Sets `currentQuestionIndex` to `firstScoringCanonicalIndex`.
3. `phase` remains `'active'` (and returns unchanged if phase ≠ `'active'`).
4. Empty `qualifierAnswers` (`{}`) → clears all answers.
5. New `qualifierAnswers` differs from prior qualifier values → state reflects the
   **new** values (proves draft edits propagate); **plus** an interleaved-index
   assertion (qualifier @1, scoring @2..N) proving
   `hasAllRequiredAnswers(state.answers, N)` is `false` post-reset (D6).

### T-2 `tests/unit/telemetry-question-answered.test.ts` (new)
1. `trackQuestionAnswered` produces a payload with all required fields + correct
   key mapping (`questionIndex→question_index_1based`, `dwellMs→dwell_ms`).
2. `choice` typed `'A'|'B'` (type-level only).
3. `validateTelemetryTransportEvent` accepts a valid `question_answered`.
4. Rejects `question_answered` with `choice: 'M'`.
5. Accepts a valid `result_viewed`.
6. Rejects `result_viewed` missing `derived_type`.
7. Rejects an unknown `event_type` (regression).
8. (D9 **APPROVED** §8-4) Rejects `question_answered` with `session_id: null` via
   `validateTelemetryTransportEvent` (post-attempt session-id rule). This case is
   mandatory, not conditional.

### T-3 `tests/unit/test-entry-orchestrator-reentry.test.ts` (new)
1. `reopenQualifierOverlay` → `overlayMode='reentry'`, `overlayStep=0`.
2. `reopenQualifierOverlay` seeds `qualifierDraft` from existing `answers`.
3. Reentry cancel → `overlayMode='entry'`, `overlayStep='instruction'`,
   `qualifierDraft={}`, `answers` untouched.
4. Reentry confirm on final qualifier step → calls `resetScoringAnswers` and
   closes overlay.
5. Reentry confirm builds qualifier-only responses for the storage write.

### T-4 `tests/e2e/qualifier-overlay.spec.ts` — add reentry `describe` block
1. After entry commit, `test-qualifier-chip` visible with correct label.
2. Chip click → overlay reopens in reentry mode (Back uses cancel label,
   `test-qualifier-reentry-cancel-button` present, not `test-qualifier-back-button`).
3. Cancel closes overlay, answers unchanged.
4. New qualifier → Continue (`qualifierRestartConfirm` label) → scoring cleared →
   first scoring question visible.
5. Chip label updates to reflect new qualifier selection.
   Plus axe-clean assertion (chip + disabled choice state).
   Plus a mandatory guard that multi-step **entry** overlay visibility is unchanged
   (D4, §8-3): a multi-step qualifier **entry** flow still shows the overlay and
   reaches the first scoring question normally (the Q-F1 override is a strict
   superset, so entry behavior must be byte-identical).

### T-5 Regression
Capture the real pre-change passing count (D12). All existing unit + E2E must pass
unmodified. `state-smoke.spec.ts` / `grid-smoke.spec.ts` failures = regression →
fix before proceeding. `theme-matrix-smoke.spec.ts @gate` must show no
`test-question` snapshot diff.

---

## 8. Decisions — RESOLVED 2026-05-16 (AGENTS.md §7)

All four decision points were resolved by the user on 2026-05-16. Implementation is
authorized. Resolutions below are binding; the corresponding §3 findings and §5 steps
have been updated to match.

1. **(D2) Dwell snapshot source — APPROVED (recommended approach).** Add a
   non-mutating `getCurrentDwellMs()` accessor to `TestRunControllerOutput`. The
   client calls it from `handleAnswerChoice` at click time, immediately after answer
   selection and **before** the 150ms lock/advance flow. `trackQuestionAnswered()`
   is called from the client at click time. **No** separate client-local dwell
   tracker. (§3 D2, Step 5, Step 8b updated.)
2. **(D3) Back/Cancel label scope — RESOLVED: reentry-only.** Do **not** de-hardcode
   the entry-mode Back label and do **not** add a `back` locale key. `qualifierStep`
   gains an optional `backLabel?: string`; the overlay renders `backLabel ?? 'Back'`.
   Only **reentry** supplies `t('cancel')`; entry passes `undefined` (keeps the
   existing hardcoded `'Back'` byte-identical) and closes the overlay without changing
   answers. Scope is not expanded unless strictly necessary (it is not). (§3 D3,
   Step 7, Step 8e, Step 9, §4 localization updated.)
3. **(D4) `instructionVisible` — RESOLVED: NOT BC-B-2 verbatim; follow Q-F1.**
   Do **not** remove the existing `overlayStep !== 'instruction'` entry-path
   disjunct. Preserve the existing entry-mode expression byte-identical and add
   `overlayMode === 'reentry'` as an override prefix:
   `overlayMode === 'reentry' || ( <existing expression unchanged> )`. This is a
   strict superset on the entry path. Mandatory regression coverage proves the
   existing qualifier **entry** flow is unchanged (T-4 entry guard +
   `qualifier-overlay.spec.ts` entry cases stay green). (§3 D4, Step 8d, §4 core
   flow, T-4 updated.)
4. **(D9) Post-attempt session-id for `question_answered` — APPROVED (new
   telemetry-consistency decision).** Add `question_answered` to
   `assertPostAttemptSessionId` (requires non-null `session_id`, consistent with
   `attempt_start`/`final_submit`), because it fires after `attempt_start` and must
   be linkable to the same attempt session as `final_submit`. Treated as a newly
   approved telemetry-consistency decision, not a previously confirmed product
   decision. Mandatory validation test rejects `question_answered` with
   `session_id: null` (T-2 case 8). (§3 D9, Step 2, T-2 updated.)

5. **(D13 — NEW, discovered during implementation) Reentry-confirm data flow —
   RESOLVED: draft source + enriched reducer action.** The original plan (§5 Step 6,
   §3 D5) built `qualifierOnlyResponses` from `answers` and `RESET_SCORING_ANSWERS`
   carried indexes only — which would discard the user's overlay edits (they live in
   `qualifierDraft`), leaving the chip/storage unchanged. This gap was **not** among
   the original four §8 decisions. **User decision (2026-05-16):** build
   `qualifierOnlyResponses` from the new `qualifierDraft` (mirrors entry's
   `buildQualifierAnswers()`), and **enrich the already-approved
   `RESET_SCORING_ANSWERS` action** to carry the new qualifier answer map and write it
   into `state.answers` (replacing old qualifier values) while clearing scoring and
   setting `currentQuestionIndex` to the first scoring question. Still **one** new
   reducer action (payload enriched, not an additional action — consistent with §10).
   In-session chip reflects the new selection; storage and run state stay consistent;
   T-4.4/T-4.5 satisfied without a reload. (§3 D5, Step 4, Step 5, Step 6, T-1, T-3
   updated.)

6. **(D14 — NEW, discovered during implementation) 500-LOC ceiling on
   `test-question-client.tsx` — RESOLVED: extract result panel to a new file.**
   After Step 8 the client reached **509 LOC**, exceeding the hard 500 ceiling. Per
   CLAUDE.md / plan §6 implementation **stopped** and a refactor was proposed (no
   reactive split). This also overrides the original §2 "no new source files"
   constraint, so it required explicit approval. **User decision (2026-05-17):**
   extract the `submitted` result panel into `src/features/test/test-result-panel.tsx`
   (`TestResultPanel`, props `{questions, answers, locale, landingPath}`), moving the
   8f qualifier filter + result-pipeline TODO with it. Self-contained class consts
   (same design tokens, byte-identical class strings → no visual regression),
   consistent with the existing `instruction-overlay.tsx` convention. Result: client
   **478 LOC**, new file **70 LOC**. Exactly one new source file (not a barrel; >30
   LOC; ≪ the "≥3 new files" limit). (§2 created-source table, §6 updated.)

> All §8 decision points (the original four + D13 and D14 discovered during
> implementation) are resolved. Implementation authorized per the user's 2026-05-16
> instruction and the 2026-05-17 §8-D14 approval.

---

## 9. Validation Commands (AGENTS.md §5 + verification-commands.md #test-flow / #telemetry)

Run in order; all must pass with zero errors.

```bash
# Basic Done gate (AGENTS.md §5, in order)
npm run lint
npm run typecheck
npm test
npm run build

# Scope-specific (verification-commands.md #test-flow + #telemetry)
npm test -- \
  tests/unit/test-run-reducer.test.ts \
  tests/unit/telemetry-question-answered.test.ts \
  tests/unit/test-entry-orchestrator-reentry.test.ts \
  tests/unit/landing-telemetry-validation.test.ts \
  tests/unit/landing-telemetry-runtime.test.ts \
  tests/unit/use-test-entry-orchestrator.test.ts \
  tests/unit/use-test-run-controller.test.ts \
  tests/unit/test-entry-orchestrator-qualifier.test.ts
node scripts/qa/check-phase11-telemetry-contracts.mjs

# Release-level reference (spec-requested; excluded from default Done gate)
npm run qa:rules

# E2E
npx playwright test tests/e2e/qualifier-overlay.spec.ts --project=chromium
npx playwright test tests/e2e/consent-smoke.spec.ts --project=chromium
npx playwright test tests/e2e/theme-matrix-smoke.spec.ts --project=chromium --grep "@gate"
```

**E2E acceptance:** `qualifier-overlay.spec.ts` incl. new reentry block all pass;
`consent-smoke.spec.ts` unchanged; `theme-matrix-smoke.spec.ts @gate` — no
`test-question` snapshot diff. `state-smoke.spec.ts` / `grid-smoke.spec.ts`
failures are regressions.

> Note: `tests/e2e/theme-matrix-smoke.spec.ts`, `tests/e2e/theme-matrix-manifest.json`,
> `scripts/qa/*.mjs` are §4-protected — **read/run only, never edit**. Any visual
> baseline diff is treated as a regression unless provenance is verified in
> `tests/e2e/theme-matrix-baseline-provenance.md` (Claude Code guardrail).

---

## 10. Prohibited / Non-Scope (enforced)

- `src/features/test/domain/**`, `schema-registry.ts`, `response-projection.ts`,
  `entry-policy.ts` — no changes.
- `qualifier-overlay-model.ts`, `question-runtime-utils.ts` — **import only**
  (`QualifierOverlayItem`, `isProfileQuestion`, `findFirstScoringQuestion`).
- No `qualifier_responses` in any telemetry payload (→ 4位/2位).
- No `trackResultViewed` helper or call site (type/validation only this session).
- No change to `hasAllRequiredAnswers` logic.
- No active-run persist on every `SELECT_ANSWER` (→ 3位).
- No barrel/`index.ts`. No canonical-index renumbering. No change to existing
  qualifier **entry** (initial commit) path behavior beyond the D4 boolean
  restructure (guarded by tests).
- `tests/e2e/theme-matrix-smoke.spec.ts`, `tests/e2e/theme-matrix-manifest.json`,
  `scripts/qa/**` — no edits.
- **Docs are NOT updated this session** (`docs/project-analysis.md` §5.5/§5.6 and
  AGENTS.md updates are a follow-up after the QA gate passes).

---

## 11. Deferred Items (confirmed out-of-scope; future owner)

| Item | Owner |
|---|---|
| `qualifier_responses` in telemetry | 4位 (후속 구현) |
| `trackResultViewed` wiring + call site | 2위 result pipeline |
| Result panel qualifier summary section | 2위 |
| `docs/project-analysis.md` §5.5/§5.6 + AGENTS.md update | follow-up after QA gate |
| Active-run persist on `SELECT_ANSWER` | 3位 |

---

## 12. Completion Report Template (to be filled at end of implementation)

Summary paragraph · Behavioral delta table (per spec) · New files (path + 1 line) ·
Modified files (1 sentence each) · Test results (before/after assertion count from
the D12 baseline, new file case counts, Playwright per-spec summary) · Verification
(exit status per command) · Deferred items (§11).

### Completion Report — 2026-05-17

**Summary.** Qualifier reentry UI (chip + reopen overlay), `final_submit` qualifier
exclusion, 150ms answer lock, and `question_answered`/`result_viewed` telemetry were
implemented across Steps 1–9 plus tests, following the resolved §8 decisions (D2,
D3-reentry-only, D4-Q-F1, D9) and the two implementation-discovered decisions
(D13 enriched `RESET_SCORING_ANSWERS`; D14 result-panel extraction for the 500-LOC
ceiling).

**New files.** `src/features/test/test-result-panel.tsx` (presentational result
panel extracted per §8-D14); `tests/unit/telemetry-question-answered.test.ts`
(8 cases); `tests/unit/test-entry-orchestrator-reentry.test.ts` (5 cases).

**Modified (source).** types.ts (+2 event interfaces/unions) · validation.ts
(allowlist, strict A/B `final_responses`, 2 branches, D9 post-attempt session-id) ·
runtime.ts (`trackQuestionAnswered`) · test-run-reducer.ts (enriched
`RESET_SCORING_ANSWERS`) · use-test-run-controller.ts (`final_submit` profile
filter, `resetScoringAnswers`, `getCurrentDwellMs`) · use-test-entry-orchestrator.ts
(`overlayMode`, `reopenQualifierOverlay`, reentry confirm/cancel) ·
instruction-overlay.tsx (`isReentry`/`backLabel`) · test-question-client.tsx (chip,
`isAnswerLocked`, `instructionVisible` reentry override, telemetry call, orchestrator
wiring, `<TestResultPanel/>`) · 12 locale files (4 keys).

**Test results.** Unit: D12 baseline 66 files / 431 → **68 files / 449 passed**
(+T-1 5, +T-2 8, +T-3 5 = +18; existing-helper updates 11a/11b/11c kept green).
E2E: `qualifier-overlay.spec.ts` **14/14 passed** (9 entry incl. D3/D4 regression
guard + 5 new reentry). `consent-smoke.spec.ts` **16/16 passed** (one parallel-load
flake at :173 cleared on isolated + full re-run; that test exercises no answer/lock
path).

**Verification (exit status).** `npm run lint` ✅ 0/0 · `npm run typecheck` ✅ ·
`npm test` ✅ 449/449 · `npm run build` ✅ (52/52 pages) ·
`check-phase11-telemetry-contracts.mjs` ✅ · qualifier-overlay E2E ✅ · consent-smoke
E2E ✅.

**`theme-matrix-smoke.spec.ts @gate` — NOT a regression from this change; user
decision required.** The @gate run shows ~117 ~1% sub-pixel snapshot diffs spanning
`blog-*`, `landing-*`, `*-menu-open` (history/blog), and the `qmbti` test states.
This change's diff is confined to telemetry + test-feature + `src/messages` + tests —
**zero** shared code with blog/landing/gnb/history surfaces, so those diffs cannot
originate here. Theme-matrix test states use `qmbti` (no qualifier/profile): the chip
is guarded off (`qualifierItems.length === 0`), the 8f profile filter removes nothing,
`instructionVisible` is a strict superset (`overlayMode` always `'entry'`), and the
§8-D14 extraction reproduces byte-identical class strings — so qmbti captures render
byte-identical DOM. The broad ~1% drift matches the documented "preview/dev-runtime
environment drift" in `tests/e2e/theme-matrix-baseline-provenance.md` (entries
2026-05-11 and 2026-05-13; baselines stale since 2026-05-13). Per the Claude Code
guardrail, the user **explicitly authorized** the §4 baseline regeneration. Ran
`npm run qa:visual:full` → **288 passed**; only **6** PNGs byte-changed, all
`theme-layout-test-instruction-kr-*` (Korean instruction-overlay text-wrap — kr-only,
not the qualifier branch, confirming locale text-rendering env drift not this change).
`npm run test:e2e:gate` verification → **126 passed**. New provenance entry appended
to `tests/e2e/theme-matrix-baseline-provenance.md` (2026-05-17 §). theme-matrix
@gate now green.

**Deferred (§11) unchanged:** `qualifier_responses` telemetry (4위);
`trackResultViewed` wiring (2위); result-panel qualifier summary (2위);
`docs/project-analysis.md` §5.5/§5.6 + AGENTS.md follow-up; active-run persist on
`SELECT_ANSWER` (3위).

---

### Approval gate

**APPROVED 2026-05-16.** The user explicitly approved this plan and resolved all four
§8 decision points (D2 approved, D3 reentry-only, D4 Q-F1 override, D9 approved).
Implementation is authorized to proceed.
