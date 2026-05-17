# Plan — Orchestrator Responsibility Extraction + InstructionOverlay Unit Tests

- **Session name**: Orchestrator Responsibility Extraction
- **Date**: 2026-05-17
- **Session type**: Structural refactoring — no observable production behavior change
- **Baseline state**: Prior session (Quality Improvement Set) COMPLETE. `npm test` 453/453, `qa:rules` 12/12, all basic gates green, working tree changes unstaged/uncommitted (per `.planning/STATE.md`).
- **Session gate**: `npm test && npm run qa:rules`
- **Package manager**: npm
- **SSOT contract (AGENTS.md §2 → "test flow / domain")**: `docs/req-test.md`, `docs/req-test-plan.md`; project rules `docs/agent-guides/project-rules.md §TestFlow (#TestFlow)`; verification `docs/agent-guides/verification-commands.md §test-flow (#test-flow)`.
- **Frozen perimeter (untouched)**: `src/features/test/domain/**`, `schema-registry.ts`, `response-projection.ts`, `src/messages/**`, `docs/plans/**` (except this doc), `tests/e2e/**` (except additive `qualifier-overlay.spec.ts` / new specs — not used this session).

---

## 0. Status Legend

`planned` → not started · `complete` → implemented + gated · `skipped` → with reason · `blocked` → awaiting decision

| Wave | Target | Effort | Behavior change | Status |
|------|--------|--------|-----------------|--------|
| A | Extract `useQualifierOverlayWizard` | M | No | complete |
| B | Extract `useAutoCommit` | S | No | complete |
| C | Extract `useEntrySideEffects` | M | No | complete |
| D | InstructionOverlay unit test suite | S | No | complete |

Waves A–C are sequential; Wave D last (covers finalized prop contract).

---

## 1. Pre-Edit Analysis

### PA-1 — Current `useTestEntryOrchestrator` return shape

From `src/features/test/use-test-entry-orchestrator.ts:29-40,229-240`. `UseTestEntryOrchestratorOutput`:

| Field | Type | Origin |
|-------|------|--------|
| `instructionSeen` | `boolean` | passthrough of input |
| `entryCommitted` | `boolean` | `runPhase === 'active' \|\| 'submitted'` |
| `redirecting` | `boolean` | `runPhase === 'redirecting'` |
| `overlayStep` | `OverlayStepId` (`'instruction' \| number`) | local state |
| `overlayMode` | `'entry' \| 'reentry'` | local state |
| `qualifierDraft` | `Record<number, string>` | local state |
| `executeInstructionAction` | `(action: TestInstructionAction) => void` | `useCallback` |
| `onQualifierSelect` | `(canonicalIndex: number, token: string) => void` | `useCallback` |
| `onQualifierBack` | `() => void` **(no args)** | `useCallback` |
| `reopenQualifierOverlay` | `() => void` **(no args)** | `useCallback` |

This 10-field shape is the **primary correctness invariant** (session §7). It must be byte-for-byte identical after all waves. `buildQualifierAnswers` is **internal**, never returned.

### PA-2 — Destructuring in `test-question-client.tsx`

`test-question-client.tsx:170-194` destructures **9 of 10** fields (omits `instructionSeen`, which the client gets directly from `useTestRunController` at line 79). Usage map:

- `entryCommitted` → `instructionVisible` calc (`:199`), qualifier-chip gate (`:394`).
- `redirecting` → `instructionVisible` (`:200`), `data-entry-status` (`:286`).
- `overlayStep` → `instructionVisible` (`:202`), `currentQualifierStepIndex` (`:219`), primary-label branch (`:347`).
- `overlayMode` → `instructionVisible` (`:197`), chip gate (`:394`), continue-label / `isReentry` / `backLabel` (`:376-382`).
- `qualifierDraft` → `selectedToken` (`:368`), `continueDisabled` (`:379`).
- `executeInstructionAction` → primary/secondary overlay actions (`:353,:358`).
- `onQualifierSelect` → overlay `onSelect`, called as `onQualifierSelect(currentQualifierItem.canonicalIndex, token)` (`:370`).
- `onQualifierBack` → overlay `onBack`, passed by reference (`:372`); invoked **no-arg**.
- `reopenQualifierOverlay` → chip `onClick` (passes a click event as arg — currently ignored) and `onKeyDown` no-arg (`:401-406`).

**Implication**: `onQualifierBack` and `reopenQualifierOverlay` are called with **no meaningful args** by the client and by the existing unit tests. The orchestrator's public signatures for these MUST stay no-arg.

### PA-3 — Proposed sub-hooks

**`useQualifierOverlayWizard`** (Wave A)
- State owned: `overlayStep` (init `'instruction'`), `overlayMode` (init `'entry'`), `qualifierDraft` (init `{}`).
- Functions: `onQualifierSelect(canonicalIndex, token)`, `onQualifierBack(qualifierItems)`, `reopenQualifierOverlay(answers, qualifierItems)`, `buildQualifierAnswers(qualifierItems)`, `resetWizard()`.
- Init params: none.
- Returns: 3 state values + 5 callbacks.
- **Confirmed back behavior** (`:72-86`): reentry + step>0 → `step-1`; reentry + step 0 → mode `'entry'`, step `'instruction'`, draft `{}`; entry → step `prev-1` or `'instruction'`.
- **Confirmed reopen behavior** (`:92-104`): seed `qualifierDraft` from `answers[String(canonicalIndex)]` only when token is a valid choice; mode `'reentry'`; step `0`.
- **`resetWizard()` = current inline reset** (`:161-162` reentry confirm; `:178-179` entry commit; `:123-124` redirect-home sets step+draft only — see Wave A note).

> **DP-1 (decision)** — The spec prescribes arg-based inner callbacks **and** "None at init". But `test-question-client.tsx` + all 3 existing unit tests call `onQualifierBack()` / `reopenQualifierOverlay()` **no-arg**, and §7 freezes the public shape. Reconciliation: `useQualifierOverlayWizard` exposes arg-based callbacks per spec; `useTestEntryOrchestrator` wraps them in thin `useCallback` closures that inject `qualifierItems` / `answers` from orchestrator input, preserving the exact no-arg public signatures. Net: ~12 lines of wrapper in the orchestrator. This is the only design that satisfies spec + §7 + the green-tests invariant simultaneously. **Confirm wrapper design.**

**`useAutoCommit`** (Wave B)
- Owns the microtask auto-commit `useEffect` **and** `autoCommitScheduledRef` (currently `:58`).
- **Confirmed full condition** (`:200-217`) — spec's 4-param list is incomplete. Real guard: `!runtimeReady || redirecting || entryCommitted || runPhase !== 'instruction' || !instructionSeen || !canAutoCommitAfterInstructionSeen || qualifierItems.length > 0 || autoCommitScheduledRef.current` → return; else set ref + `queueMicrotask(() => executeInstructionAction('start'))`.
- Init params (full, corrected): `{ runtimeReady, redirecting, entryCommitted, runPhase, instructionSeen, canAutoCommitAfterInstructionSeen, qualifierItemsCount, executeInstructionAction }`.
- Returns: nothing (void).

**`useEntrySideEffects`** (Wave C) — see DP-2.
- Owns: `applyConsentEffect(consent)` → `setTelemetryConsentState`; `applyInstructionSeenEffect()` → `markInstructionSeen(variant)`; `applyLandingIngressClearEffect()` → `clearLandingIngress(variant)`.
- Init params: `{ variant }`.
- Returns: those 3 callbacks.
- `applyInstructionSeenEffect` / `applyLandingIngressClearEffect` are **no-arg** (close over init `variant`) — minor, rationale-documented deviation from the spec's `applyInstructionSeenEffect(variant)` literal, to avoid passing `variant` twice.

### PA-4 — `executeInstructionAction` signature & branch disposition

Signature: `(action: TestInstructionAction) => void`, `useCallback` (`:106-198`). Stays in the orchestrator as the coordinator (session §5 C-3). Branch table:

| Branch (line) | Kind | Disposition |
|---|---|---|
| `!runtimeReady \|\| redirecting` guard (`:109`) | guard | STAY |
| `effect.writesConsent` → `setTelemetryConsentState` (`:113-115`) | side effect | → `applyConsentEffect` (Wave C) |
| `effect.recordsInstructionSeen && !instructionSeen` → `markInstructionSeen` (`:117-119`) | side effect | call → `applyInstructionSeenEffect()`; **condition stays** in orchestrator |
| `effect.redirectHome` block (`:121-130`): step/draft reset, `REDIRECT_HOME` dispatch, `clearLandingIngress`, `router.replace` | mixed | dispatch+reset STAY; `clearLandingIngress` → `applyLandingIngressClearEffect`; `router.replace` **STAY inline** (DP-2) |
| `!effect.commitsRuntimeEntry` early return (`:132-134`) | guard | STAY |
| qualifier step advance (`:136-153`) | local state | STAY (via wizard callbacks) |
| reentry confirm (`:156-164`): `buildQualifierAnswers`, `resetScoringAnswers`, `writeResponseSet`, reset | state+storage | STAY; reset → `resetWizard()` |
| entry commit (`:166-179`): `buildQualifierAnswers`, `COMMIT_ENTRY`, `writeResponseSet`, reset | state+storage | STAY; reset → `resetWizard()` |

### PA-5 — Orchestrator importers & test coupling

Only importers (repo-wide grep): `test-question-client.tsx` + `tests/unit/{use-test-entry-orchestrator,test-entry-orchestrator-qualifier,test-entry-orchestrator-reentry}.test.ts`. No e2e imports the hook.

- All 3 test files import via path `@/features/test/use-test-entry-orchestrator` (or `../../src/...`). **Import path unchanged this session** (file is not moved/renamed) → zero test import edits, zero assertion edits permitted/needed.
- Tests exercise only the **return shape**: `executeInstructionAction(action)`, `onQualifierSelect(idx, token)`, `onQualifierBack()` no-arg, `reopenQualifierOverlay()` no-arg, and read `overlayStep/overlayMode/qualifierDraft/redirecting`. No test imports or asserts an internal callback signature. DP-1 wrapper keeps every one of these green unchanged.

### PA-6 — Mock-breakage risk

Test mocks are **module-path scoped** via `vi.mock('@/features/telemetry/consent-source')`, `vi.mock('@/features/transition/store')`, `vi.mock('@/features/test/storage/response-set')` (and the relative-path equivalents in `use-test-entry-orchestrator.test.ts`). `vitest.config.ts` aliases `@` → `src`, so relative and `@/` specifiers resolve to the **same module id**; vitest mocks by resolved module, not by importer file.

**Conclusion**: moving `setTelemetryConsentState` / `markInstructionSeen` / `clearLandingIngress` imports into `use-entry-side-effects.ts` (Wave C) keeps them under the **same mocked module paths** → mocks still intercept. `writeResponseSet` stays in the orchestrator (Wave C leaves it). **No mock-breakage risk. No mitigation required.**

---

## 2. Decision Points (must be resolved before edits)

| # | Wave | Decision | Recommendation | Why it needs sign-off |
|---|------|----------|----------------|-----------------------|
| DP-1 | A | Inner hook arg-based callbacks + orchestrator wrapper layer to preserve no-arg public contract | Adopt wrapper | Adds a layer the spec did not explicitly describe; only path consistent with §7 + green tests |
| DP-2 | C | Drop `applyRedirectEffect`; keep `router.replace(landingPath)` inline | Keep inline | Deviates from spec's literal ownership list; session §5/§10 explicitly invite this judgment but forbid self-resolving structural design |
| DP-3 | C | **Ask-First mandatory companion edit**: `scripts/qa/_path-config.mjs` + `scripts/qa/check-phase10-transition-contracts.mjs` (`:54-62`) | Edit both | `scripts/qa/*.mjs` is AGENTS.md §4 **Ask First**; without it, `qa:rules` check-phase10 fails → session gate fails |
| DP-4 | D | Spec filename `instruction-overlay.test.tsx` vs vitest `include: ['tests/unit/**/*.test.ts']` (excludes `.tsx`) | Use `instruction-overlay.test.ts` + `React.createElement` | `.test.tsx` → silent non-execution → Wave D gate fails; deviates from spec's literal filename |

DP-3 detail — required script edits (no logic relaxation, intent preserved):
- `_path-config.mjs` `test` object: add `entrySideEffects: 'src/features/test/use-entry-side-effects.ts'`.
- `check-phase10-transition-contracts.mjs:54-62`: read `test.entrySideEffects` (guarded by `fileExists`) and assert `markInstructionSeen` + `clearLandingIngress` appear there; keep orchestrator-existence intent via updated fail messages ("entry side-effects hook must call …"). Net: same two guarantees, relocated to the file that now owns the calls.

DP-4 detail — `instruction-overlay.test.ts` renders `InstructionOverlay` via `React.createElement` + `createRoot` (exact pattern of the two cited style refs). `InstructionOverlay` is purely presentational (no `useTranslations`) → **no `NextIntlClientProvider` needed**; all copy injected via props. Zero new deps, zero config change.

---

## 3. Wave A — `useQualifierOverlayWizard`

- **New file**: `src/features/test/use-qualifier-overlay-wizard.ts` (single named export `useQualifierOverlayWizard`).
- **Moves out of orchestrator**: `overlayStep/overlayMode/qualifierDraft` state, `buildQualifierAnswers`, `onQualifierSelect`, `onQualifierBack`, `reopenQualifierOverlay`; new `resetWizard()`.
- **Orchestrator after**: calls `useQualifierOverlayWizard()`; wraps (DP-1) `onQualifierBack`/`reopenQualifierOverlay` as no-arg closures over `qualifierItems`/`answers`; `executeInstructionAction` calls `buildQualifierAnswers(qualifierItems)` and `resetWizard()` at the two reset points; redirect-home branch (`:123-124`) calls `resetWizard()` (resets step+mode+draft — superset of current step+draft reset; mode is already `'entry'` on the redirect path, so behavior-equivalent — verified against `test-entry-orchestrator-*.test.ts`).
- **Files changed**: `use-test-entry-orchestrator.ts`; **new** `use-qualifier-overlay-wizard.ts`.
- **Gate**: `npm test` ≥453 green, zero assertion changes; `grep -n "overlayStep\|overlayMode\|qualifierDraft\|onQualifierSelect\|onQualifierBack\|reopenQualifierOverlay\|buildQualifierAnswers" src/features/test/use-test-entry-orchestrator.ts` shows only import/destructure/wrapper refs, no `useState`/`useCallback` *definitions* of the moved units.
- **Decision log**: DP-1. Deviation: `onQualifierBack` implemented **no-arg** in the wizard (not `onQualifierBack(qualifierItems)` per PA-3 literal) — it depends only on wizard-internal `overlayMode`/`overlayStep`; an unused param would fail `lint`. Step-advance (PA-4) stays in `executeInstructionAction`; wizard exposes `setOverlayStep` to keep that block byte-identical. `OverlayStepId` kept as a local type in both files (single-named-export constraint).
- **Gate result**: PASS — `typecheck` clean; `npm test` 453/453 (zero assertion edits); orchestrator grep shows only interface/destructure/DP-1 wrapper/coordinator refs, no moved-unit defs.

## 4. Wave B — `useAutoCommit`

- **New file**: `src/features/test/use-auto-commit.ts` (single named export).
- **Moves**: the `useEffect` (`:200-227`) + `autoCommitScheduledRef` (`:58`).
- **Orchestrator after**: `useAutoCommit({ runtimeReady, redirecting, entryCommitted, runPhase, instructionSeen, canAutoCommitAfterInstructionSeen: entryPolicy.canAutoCommitAfterInstructionSeen, qualifierItemsCount: qualifierItems.length, executeInstructionAction })`. Effect count drops by one.
- **Files changed**: `use-test-entry-orchestrator.ts`; **new** `use-auto-commit.ts`.
- **Gate**: `npm test` ≥453 green; `grep -n "useEffect" src/features/test/use-test-entry-orchestrator.ts` → fewer than before (expected: `0`).
- **Decision log**: corrected param set (PA-3) — not a boundary failure, clean extraction.
- **Gate result**: PASS — `typecheck` clean; `npm test` 453/453; `grep -c "useEffect" src/features/test/use-test-entry-orchestrator.ts` → 0.

## 5. Wave C — `useEntrySideEffects`

- **C-1 side effects to extract**: consent write, instruction-seen mark, landing-ingress clear.
- **C-2 stays in orchestrator**: `COMMIT_ENTRY`/`REDIRECT_HOME`/`RESET_SCORING_ANSWERS` dispatch, `writeResponseSet`, wizard resets, **and `router.replace`** (DP-2).
- **C-3**: `executeInstructionAction` stays in orchestrator as coordinator, calling side-effect callbacks.
- **New file**: `src/features/test/use-entry-side-effects.ts` (single named export). Init `{ variant }`; returns `{ applyConsentEffect, applyInstructionSeenEffect, applyLandingIngressClearEffect }`.
- **Orchestrator after**: no longer imports `setTelemetryConsentState`/`markInstructionSeen`/`clearLandingIngress`.
- **Phase 10 QA impact (DP-3, Ask-First, mandatory)**: edit `scripts/qa/_path-config.mjs` + `scripts/qa/check-phase10-transition-contracts.mjs:54-62` as in §2. Confirmed: only these two qa files reference the identifiers (repo grep); `check-phase10` is in the `run-all.mjs` 12-list.
- **Files changed**: `use-test-entry-orchestrator.ts`, `scripts/qa/_path-config.mjs`, `scripts/qa/check-phase10-transition-contracts.mjs`; **new** `use-entry-side-effects.ts`.
- **Gate**: `npm test` ≥453 green; `npm run qa:rules` 12/12; `grep -n "markInstructionSeen\|clearLandingIngress\|setTelemetryConsentState" src/features/test/use-test-entry-orchestrator.ts` → zero (or import-only).
- **Decision log**: DP-2 (`router.replace` kept inline), DP-3 (Ask-First qa edits applied: `_path-config.mjs` +`entrySideEffects`; `check-phase10-transition-contracts.mjs` relocated the `markInstructionSeen`/`clearLandingIngress` assertions to `test.entrySideEffects` with updated fail messages; Block-1 comment updated for accuracy).
- **Gate result**: PASS — `typecheck` clean; `npm test` 453/453; `npm run qa:rules` 12/12 (Phase 10 passed with relocated assertions); orchestrator grep for `markInstructionSeen|clearLandingIngress|setTelemetryConsentState` → 0.

## 6. Wave D — InstructionOverlay unit tests

- **New file**: `tests/unit/instruction-overlay.test.ts` (DP-4), `React.createElement` + `createRoot`, no provider.
- **Cases**: D-1 entry instruction renders (title/body/divider/note/CTA; no qualifier UI when `qualifierStep` undefined). D-2 entry qualifier step (choices count = item.choices.length; continue label = `continueLabel`). D-3 reentry: instruction title/body/note absent; cancel button uses `data-testid=test-qualifier-reentry-cancel-button`; label = `backLabel` (not "Back"). D-4 back: `onBack` fires; reentry back label = `backLabel`. D-5 continue: `onPrimaryAction` fires on continue; disabled when `continueDisabled` true. D-6: handled as type-level note (no runtime test) — props are compile-checked by existing typecheck gate; no `.test-d.ts` added (avoids new infra).
- **Files changed**: **new** `tests/unit/instruction-overlay.test.ts`.
- **Gate**: `npm test` count rises (≥453 + new), all pass; covers D-1…D-5.
- **Decision log**: DP-4 (`tests/unit/instruction-overlay.test.ts`, `React.createElement` + `createRoot`, no provider; D-6 type-level only). 6 cases: D-1, D-2, D-3, D-4, D-5 (+ a paired D-5 disabled-state case).
- **Gate result**: PASS — `typecheck` clean; `npm test` 459/459 (453 baseline + 6 new); all Wave D cases green.

---

## 7. Orchestrator Return Shape — Before / After

**Before** = PA-1 table. **After (target)** = byte-for-byte identical 10-field shape. Verification each wave: `test-question-client.tsx` compiles with **zero** destructuring/usage edits (`tsc --noEmit`), and the 3 orchestrator test files stay green with zero assertion edits.

## 8. Impact Assessment (AGENTS.md §7)

- Shared shell/GNB: none. Localization: none (no message keys touched; copy stays prop-injected). a11y: none (no DOM/markup change; Wave D only adds tests). State contracts: internal reorganization only — public orchestrator contract frozen (§7). Core user flow: unchanged (no behavior change; guarded by full unit suite + qa:rules).
- High-Risk areas (AGENTS.md §4): **none touched**. Ask-First: `scripts/qa/*.mjs` (DP-3) — only via the mandatory companion edit, sign-off required. No e2e regression coverage required (no High-Risk path, no behavior change).

## 9. Validation

- Per-wave gates: §§3–6.
- **Session-final gate**: `npm run lint` · `npm run typecheck` · `npm test` (≥453, +Wave D) · `npm run build` · `npm run qa:rules` (12/12) · `git diff --check`. Scope ref: verification-commands.md `#test-flow`.
- Results: **ALL PASS** — `lint` clean · `typecheck` clean · `npm test` 459/459 (69+1 files) · `npm run build` succeeded · `npm run qa:rules` 12/12 · `git diff --check` clean.

## 10. Deferred / Out of Scope

- Pre-existing refactor debt in `docs/reports/2026-05-17-refactoring-candidates.md` (Targets 1–7, A.1–A.4) — untouched by design.
- D-6 runtime prop-contract test — intentionally not added (type-level coverage via existing `typecheck`; no new `.test-d.ts` infra).
- No barrel/index files; each new hook = one named export (session §10).

## 11. Constraints Confirmed

New hook files in `src/features/test/`, each <500 and >30 lines (est. wizard ~70, auto-commit ~45, side-effects ~35), single named export, no barrel edits. No new dependencies. `git diff --check` clean.
