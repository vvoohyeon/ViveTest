# Rebuild Plan — BQ-21 Design-Authority Reconciliation (R1–R3)

> Format: AGENTS.md §7 (base + rebuild-specific fields).
> Trigger: BQ-21 adoption (design.md becomes the durable visual SSOT; per-wave CSS retired as default input).
> This is **not a roadmap wave.** It is a one-time documentation/process reconciliation that follows BQ-21,
> plus a forward-dependency note for Wave 16. It must not re-implement completed Wave 1–5 visuals.

---

## 0. Summary

Three scoped tasks:

- **R1 — Design-authority unification (primary).** Establish `docs/design/design.md` (the CLAY-structured, VIVE/ViveTest-adapted document produced by `claude-design-prompt-rev2.md`) as the single visual SSOT. Reclassify the Wave 3/4/5 reference CSS as superseded interpretation aids; fold their values into the design.md application layer.
- **R2 — Token reconciliation (analysis/no code change).** Confirm that the as-built scoped card token *values* match the new SSOT (they do, per the token-drift analysis). Record the global token-namespace divergence as **scheduled Wave 16 scope**, not a Wave 1–5 defect. design.md global tokens are *target intent only* until Wave 16.
- **R3 — Hygiene.** Fix whitespace/state-text defects surfaced in the Wave 2/5 summaries. Preserve intentional defers.

Recommended order: **R1 → R2 → R3.**

---

## 1. Task Mode

| Task | Mode | Rationale |
|---|---|---|
| R1 | Implementation (docs only) | Reclassify/move design docs; finalize SSOT location. No runtime code. |
| R2 | Analysis Only | Value-parity confirmation + forward-dependency record. No code, no globals.css edit. |
| R3 | Implementation (hygiene) | Whitespace + STATE.md state-text correction. No functional change. |

---

## 2. Corresponding Wave Number / Range

- Not a roadmap wave. BQ-21 adoption follow-up.
- **Forward dependency recorded for Wave 16** (Light-only theme cleanup): the global semantic-token migration to the new SSOT namespace/values is Wave 16 scope, gated by the theme-bootstrap risk plan (per BQ-04 and the wave roadmap). R2 produces the target token set Wave 16 will consume; it does **not** perform that migration here.

---

## 3. All Files To Be Modified

**R1**
- `docs/design/design.md` — place/confirm the produced design.md as the visual SSOT (created from `claude-design-prompt-rev2.md`).
- `docs/design/resources/wave3-normal-card-reference.css` — mark superseded (header note) or relocate to `docs/design/resources/superseded/`.
- `docs/design/resources/wave4-expanded-test-content-reference.css` — same.
- `docs/design/resources/wave5-expanded-test-visual-skin-reference.css` — same.
- `docs/design/resources/README.md` (new, optional) — manifest + "superseded" provenance note.
- `docs/decision-register.md` — add BQ-21; amend BQ-07/BQ-12 Notes (see separate patch).
- `AGENTS.md` — §2 routing row, §2 Rebuild Workflow Sources bullet + precedence, §8 DoD bullet (see separate patch).

**R2**
- None (analysis output is a parity table appended to this plan or to `docs/design/`; no source edit). Explicitly **does not** modify `src/app/globals.css` or `src/features/landing/grid/landing-grid-card.module.css`.

**R3**
- `docs/design/resources/assets/vive-logo.svg` — strip trailing whitespace (added in Wave 2).
- `.planning/STATE.md` — strip trailing whitespace; correct the stale "uncommitted" text to reflect that HEAD is the Wave 5 commit.
- Wave 5 analysis plan under `docs/plans/` — strip trailing whitespace.

---

## 4. Relevant SSOT Contract (per §2 Task Routing Table)

- New routing row (this plan adds it): `visual skin / design tokens / card visual → docs/design/design.md (+ §7 application layer)`, with `decision-register.md > req-*.md > design.md` on conflict.
- `docs/req-landing.md §14.4` Visual Redesign Preservation Contract governs the interaction/behavior invariants R1–R3 must not disturb.
- `docs/decision-register.md` is the final conflict resolver.

---

## 5. Reference-Only Files and Worktree (must not be modified)

- `legacy/reference` worktree — read-only.
- All `checkpoint/*` worktrees — verification/rollback anchors only.
- **As-built scoped token code** — `src/features/landing/grid/landing-grid-card.module.css` and `landing-grid-card.tsx`: R2 is analysis-only and must not refactor scoped `--normal-*` / `--expanded-*` tokens.
- `src/app/globals.css` — Ask-First path; **not** touched here. Global token migration is Wave 16.

---

## 6. Preservation Contracts (Exclude-list items that must not change)

- **Visual Redesign Preservation Contract** (req-landing §14.4): Normal/front no entry CTA; enterable/unavailable rules; landing preview = first scoring question; transition pending/terminal/rollback, duplicate-locale no-op, return-scroll restore, destination-ready boundary; GNB control set; consent-gated telemetry; `data-testid`/semantic/inert-aria a11y guards.
- **BQ-07** — no mid-rebuild visual-regression baseline regeneration. R1's "design reference screenshots" are a *separate artifact class* from test baselines; this plan does not run `qa:visual:full` or register snapshots.
- **BQ-12** — resolver/registry/runtime boundary and transition storage preserved.
- **BQ-04 / Wave 16 boundary** — light-only; `globals.css` and `theme-bootstrap.js` remain untouched until the Wave 16 theme-bootstrap risk plan.
- **Intentional defers kept as-is** — Wave 1 B14 mobile title-continuity `test.fixme` (→ Wave 13); deferred screenshot baselines `expanded-focus-shell.png`, `overlay-focus-shell.png`.

---

## 7. R2 Token-Parity Findings (analysis record)

**Value parity (scoped card tokens ≡ new SSOT values): confirmed.**
Normal-card and expanded-test-choice scoped tokens match SSOT values exactly — e.g. `--normal-card-shadow ≡ --shadow-rest (0 1px 2px rgba(26,26,31,0.04))`, `--normal-focus-ring`/`--expanded-choice-accent ≡ --sage (#5C8E78)`, `--normal-thumb-radius`/choice radius ≡ `--radius-md (12px)`, `--normal-tag-radius ≡ --radius-xs (5px)`, `--normal-tag-bg ≡ --tag-bg (#F0ECE2)`, `--expanded-choice-surface ≡ --canvas-elevated (#FFFFFF)`, `--expanded-choice-border ≡ --hairline-strong (#D6D1C4)`, `--expanded-choice-ink ≡ --ink-soft (#2E2E36)`, `--expanded-choice-accent-surface ≡ --sage-muted (#E8F0EC)`.
→ **No Wave 1–5 code change required.** design.md = intent; scoped tokens = implementation; they coexist.

**Namespace/global divergence: expected and scheduled, not a defect.**
The global theme layer (`globals.css`) is still the prior blue/gray/Avenir system (`--bg #f5f7f7`, `--accent-solid #2f73ff`, `--ink #161a20`, Avenir Next stack, blue focus glow, multi-layer `--card-shadow-*`/`--panel-shadow`, `280ms` card motion, partly hardcoded radii/motion). The new warm-neutral/sage/Pretendard SSOT namespace (`--canvas`, `--body`, `--sage`, `--surface-soft/-muted`, `--hairline`, `--focus-ring-soft`, `--overlay-scrim`, `--shadow-expanded/-overlay`, `--radius-*`, `--ease-*`/`--dur-*`) is **not yet** the global layer.
→ This is correct: waves 1–15 deliberately used scoped tokens to land card visuals without touching the high-risk global theme. Global migration belongs to **Wave 16**.

**Forward dependency for Wave 16 (record only):**
1. Migrate `globals.css` to the new semantic namespace/values under the theme-bootstrap risk plan (light-only per BQ-04).
2. Where redundant after migration, collapse scoped `--normal-*`/`--expanded-*` tokens into the shared semantic layer — evaluated via the BQ-19 Analysis gate, not assumed.
3. Until then, **do not** apply design.md global tokens to `globals.css`.

---

## 8. Impact Assessment

| Dimension | R1 | R2 | R3 |
|---|---|---|---|
| Shared components (shell/GNB) | none (docs) | none (analysis) | none |
| Localization | none | none | none (STATE.md/SVG/plan only) |
| a11y | none | none | none |
| State contracts | none | none | none |
| Core user flow | none | none | none |

All three are non-runtime or hygiene-only; no behavioral surface is touched.

---

## 9. Validation Gates (applicable within scope)

- R1/R3 (docs + hygiene): `git diff --check` must return clean (closes the Wave 2/5 trailing-whitespace items). Markdown renders without broken tables. No source change → Basic Gates not strictly required, but run `npm run lint`/`typecheck`/`test`/`build` once after R3 to confirm zero functional drift.
- R2: no gate (analysis). Output is the parity record in §7.
- **Not run:** `qa:visual:full`, snapshot registration, baseline approval (BQ-07).

---

## 10. Decisions Requiring User Confirmation Before Execution

1. **design.md path** — confirmed: `docs/design/design.md`. ✓ (user-confirmed)
2. **Wave CSS disposition** — recommend **reclassify-in-place or move to `resources/superseded/`**, not delete (they remain provenance/evidence). Confirm delete-vs-keep preference.
3. **Produced design.md acceptance** — R1 cannot finalize until the produced design.md passes the verification checklist (pending re-share of the file). R1 is blocked on this.
4. **STATE.md correction** — confirm the Wave 5 STATE.md should be updated to "committed at HEAD <wave5 sha>" rather than left as "uncommitted."

---

## 11. Handoff

- On R1 completion: `docs/design/design.md` is the visual SSOT referenced by AGENTS §2; wave CSS no longer SSOT.
- On R2 completion: Wave 16 inherits the target token set + migration checklist (§7).
- On R3 completion: `git diff --check` clean across the rebuild range; intentional defers preserved.
