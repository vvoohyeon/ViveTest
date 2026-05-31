# STATE.md — Wave 4 Expanded Test Content Contract (Snapshot 2 of ≤3 — verification complete)

> Session continuity anchor only. Not executable, not an SSOT.
> Approved analysis: `docs/plans/2026-05-31-wave-4-expanded-test-content-contract-analysis.md`.
> Visual authority: `design.md §6.5/§7.7/§10` + `resources/wave4-expanded-test-content-reference.css`.
> Base commit `fe063ad` (wave-3), branch `main`. **Not committed (not requested).**

## Outcome

Wave 4 implemented + verified. Logic directive honored: no logic candidates — existing logic preserved.
All code complete; basic Done gate green; functional + geometry E2E green. Two pre-existing visual
baselines diverge as expected (BQ-07 — not regenerated this wave).

## Files changed (2 files)

`src/features/landing/grid/landing-grid-card.tsx`
- previewQuestion prominence (21px/600/`--text-strong`/tracking/keep-all/anywhere) — W4-CC-02 (D2).
- `ExpandedTestAnswerChoice` helper: `<button>[<span .answer-choice-text>, <span .answer-choice-arrow aria-hidden>→</span>]`;
  replaces duplicated A/B buttons. Added `flex items-start gap-3` to choice class (layout only).
  New hooks `…-text` (`min-w-0 flex-1`), `…-arrow` (`mt-[3px] shrink-0 text-[var(--muted-ink)]`).
  Preserved: `type`, `data-slot=answerChoice{A,B}`, `onClick→onAnswerChoiceSelect`, `tabIndex`/`aria-hidden`,
  resolver payload boundary, motion slots. — W4-CC-01 (D3).
- Choice-button skin, meta labels/numbers, title/continuity, overlay geometry, resolver/telemetry, i18n: untouched.

`tests/unit/landing-card-contract.test.ts`
- Presence-only: choice arrow is `aria-hidden="true"` + `→`; answer text in separate `.…-answer-choice-text`.

## Verification

- **Basic Done gate (AGENTS.md §5): ALL GREEN** — `lint` ✓ · `typecheck` ✓ · `test` ✓ (73 files / 479) · `build` ✓.
- **Functional E2E (preview mode):**
  - `grid-smoke.spec.ts` 18/18 ✓ — incl. `B4-geometry-active-frame` (siblings frozen), `B4-short-expanded`
    (content-fit, no shell leak), `B13-hover-collapse`. → Wave 4 Exclude boundary (overlay geometry /
    sibling isolation) intact despite the taller question.
  - `state-smoke.spec.ts` functional ✓ — `:289` keyboard CTA traversal (trigger→choiceA→choiceB→unavailable)
    passes in isolation; it only flaked under parallel workers (pre-existing contention; arrow is
    non-focusable so focus order is unchanged).
- **Two screenshot-baseline diffs (NOT regenerated):**
  - `state-smoke :352 expanded-focus-shell.png` (baseline May 10) — diverges from **Wave 4** question prominence.
  - `state-smoke :366 overlay-focus-shell.png` (baseline May 29) — diverges from **Wave 3** Normal skin /
    sage focus ring on the focused unavailable card (already stale since Wave 3; Wave 3 validated via grid-smoke).
  - Provenance verified = approved Wave 3+4 visual changes; width unchanged, functional + geometry intact.
  - Per **BQ-07** (baselines discarded → re-approved AFTER rebuild) + analysis §10 ("No baselines"),
    these are **not** regenerated mid-rebuild. `theme-matrix-baseline-provenance.md` governs only
    `qa:visual:full` theme-matrix PNGs, not these state-smoke shell snapshots.

## Decisions / Boundaries honored

D1 preserve `cardTitle` (no context-label element) · D2 Wave 4 owns question prominence ·
D3 decorative `aria-hidden` arrow · D4 meta `completed`/full-number = Wave 5.
Question color used existing `--text-strong`; warm `#1A1A1F` token reconciliation deferred to Wave 5.

## If resuming / next steps (user decisions)

- Commit the 2 files if desired (Wave 4). Optionally include `.planning/STATE.md`.
- Visual baselines: the 2 `*-shell` snapshots will be re-approved at the BQ-07 post-rebuild baseline step
  (e.g., Wave 14 stabilization) — do not regenerate piecemeal mid-rebuild unless the user directs it.
- Next wave: Wave 5 (Expanded test visual skin) per `docs/wave-roadmap.md` — choice button skin, equal
  padding, meta `completed`/full-number, plus warm-token reconciliation for the question/arrow.
