# RC: W1–W5 Design-SSOT Reconciliation — BQ-19 Analysis (Analysis Only)

> **Task mode: Analysis Only (BQ-19 gate).** This report is the sole deliverable.
> No source / CSS / message / requirements / baseline / branch / checkpoint / worktree
> mutation was performed. Every finding below was re-verified directly against the live
> `main` workspace; the prior untracked draft at this path was rebuilt from that
> verification, and two of its classifications were corrected (see §RC-2 and the
> Candidate Register).

## 1. Metadata

| Field | Result |
|---|---|
| Initiative | RC: W1–W5 design-SSOT reconciliation (re-anchor implemented Waves 1–5 to current visual SSOT + operating model) |
| Report date | 2026-06-01 |
| Workspace | `/Users/woohyeon/Local/ViveTest` (confirmed active local rebuild implementation workspace) |
| Branch / HEAD | `main` @ `571eb0c` (wave-5) |
| Mode | Analysis Only / BQ-19 gate; no Plan, no Implementation |
| Allowed artifact | This report under `docs/plans/` |
| Child `AGENTS.md` | None under `docs/`; root `AGENTS.md` governs |
| Tests run | None |
| Non-mutating checks | file reads, `rg`, `git status --short`, `git worktree list`, `git diff`, `git show HEAD:…`, `git diff --check` |
| Visual precedence applied | `decision-register.md` → product requirements / active rules → `docs/design/design.md` → patterns/application → mockup resources → existing implementation → wave CSS (exception only) — per AGENTS.md §2 (BQ-21) |

**Working-tree note.** The repo already carried uncommitted docs/design-resource changes before this report (`AGENTS.md`, `docs/agent-guides/project-rules.md`, `docs/decision-register.md`, `docs/design/design.md`, deleted root wave CSS, new `docs/design/resources/superseded/`, untracked BQ-21/Wave 6 docs, and Wave 5 source per `.planning/STATE.md`). This analysis treats those as pre-existing context; it does not claim, reinterpret, or revert them.

### User Decision Applied

The user has resolved the Candidate Register as follows:

| ID | Decision | Implementation disposition |
|---|---|---|
| RC-W1W5-01 | Reject / no-change | Keep `Completed`; optionally clarify `design.md §7.3` as word choice, not casing directive |
| RC-W1W5-02 | Approve | Adopt `16 / 6`; update implementation and `grid-smoke` in the same change set |
| RC-W1W5-03 | Approve | Rework fallback SVG and `qmbti` thumbnail SVG to warm-neutral/sage palette |
| RC-W1W5-04 | Approve if same small set | Repoint current Wave 6 analysis to `design.md` before reuse; avoid broad historical rewrite |
| RC-W1W5-05 | Optional | May include in the same docs/assets hygiene change set; not required |
| RC-W1W5-06 | Defer | Do not touch `scripts/qa/*` in this change set |

This resolves the previously conflict-gated status of RC-W1W5-02. The subsequent implementation scope is visual/asset/QA-contract reconciliation only; resolver, storage, telemetry, transition, routing, test entry, and i18n behavior remain protected.

These decisions supersede the earlier “conflict-gated / open question” framing in this report. RC-W1W5-02 is now approved for implementation as a visual/QA-contract reconciliation.

## 2. Sources Read (routing order)

- `AGENTS.md` — §4 Critical Boundaries, §2 Task Routing Table (visual skin / design tokens / card visual row), Visual source precedence (BQ-21).
- `.planning/STATE.md` — Wave 5 expanded test visual skin recorded complete/uncommitted; context only.
- `docs/decision-register.md` — BQ-04, BQ-07, BQ-08, BQ-09, BQ-12, BQ-13…BQ-21 (all read in full).
- `docs/design/design.md` — current visual SSOT (foundations §4 → tokens §5 → components §6 → patterns/application §7 → §10 never-reintroduce).
- `docs/agent-guides/project-rules.md` — §Visual-Design, §Ownership.
- `docs/wave-roadmap.md` — Wave overview + Waves 1–5 detail + Global Gate (BQ-19).
- `docs/rebuild-worktree-setup.md` (worktree roles confirmed via `git worktree list`).
- Implementation evidence: `landing-grid-card.module.css`, `landing-grid-card.tsx`, all 12 `src/messages/*.json`, `public/landing-card-media/qmbti/thumbnail.svg`, `tests/e2e/grid-smoke.spec.ts`, `docs/design/resources/assets/vive-logo.svg`.

Reference-only (read-only, not modified, confirmed present): `legacy/reference` (`d3305b7`), checkpoint worktrees `w01-02`…`w15-17`, `docs/design/resources/superseded/**`.

## 3. Preservation Contracts Asserted Unaffected

| Contract | Result |
|---|---|
| B14 mobile title-continuity `test.fixme` | Untouched; stays deferred to Wave 13. No RC item proposes editing it. |
| Overlay geometry / sibling isolation / spacer | Wave 6 territory. No RC item touches `use-landing-interaction-controller.ts`, `use-mobile-card-lifecycle.ts`, `use-keyboard-handoff.ts`, or the stage-bleed/spacer geometry. |
| Visual-regression baselines (BQ-07) | No regeneration proposed. Later validation explicitly excludes screenshot baseline regen. |
| `globals.css` global tokens (BQ-04 / Wave 16) | No change, no scoped-token promotion proposed. |
| `data-slot` names | No public slot rename proposed. |
| Resolver / transition / telemetry / storage / test-entry / answer-choice entry behavior | No behavior change proposed by any RC item. |
| Worktree / checkpoint / branch topology | No branch, merge, reset, push, checkpoint, or worktree action proposed. |

**High-Risk / Ask-First / globals.css / worktree check:** No RC finding requires touching a High-Risk Area, `globals.css`, or the worktree topology. RC-3 (if approved) edits `landing-grid-card.tsx` (not Ask-First, not High-Risk; `src/features/landing/grid/**` is owner-editable) plus a `grid-smoke` functional assertion — no blocking question is triggered. All other findings are i18n/docs/asset scoped. **No STOP/blocking condition arose.**

---

## 4. RC-1 — Token Parity

All scoped `--normal-*` / `--expanded-*` tokens are declared in
`src/features/landing/grid/landing-grid-card.module.css:4-20` (14 tokens: 7 normal + 7 expanded). Each maps cleanly to a `design.md §5` semantic token; values agree exactly (hex case / shadow `rgb()` vs `rgba()` are syntax-equivalent).

| Scoped token (module.css) | Current value | design.md §5/§6 semantic source | Verdict |
|---|---|---|---|
| `--normal-card-border` | `transparent` | §6.1 base card "1px **transparent** border at rest" | Match |
| `--normal-card-shadow` | `0 1px 2px rgb(26 26 31 / 4%)` | §5.8 `--shadow-rest: 0 1px 2px rgba(26,26,31,0.04)` | Match (syntax-equiv) |
| `--normal-focus-ring` | `#5c8e78` | §5.7 `--focus-ring` / §5.5 `--sage: #5C8E78` | Match |
| `--normal-thumb-radius` | `12px` | §5.9 `--radius-md: 12px` | Match |
| `--normal-tag-bg` | `#f0ece2` | §5.6 `--tag-bg: #F0ECE2` | Match |
| `--normal-tag-ink` | `#4a4a55` | §5.6 `--tag-fg: #4A4A55` | Match |
| `--normal-tag-radius` | `5px` | §5.9 `--radius-xs: 5px` | Match |
| `--expanded-question-ink` | `#1a1a1f` | §5.3 `--ink: #1A1A1F` | Match |
| `--expanded-choice-surface` | `#ffffff` | §5.2 `--canvas-elevated: #FFFFFF` | Match |
| `--expanded-choice-border` | `#d6d1c4` | §5.4 `--hairline-strong: #D6D1C4` | Match |
| `--expanded-choice-ink` | `#2e2e36` | §5.3 `--ink-soft: #2E2E36` | Match |
| `--expanded-choice-arrow-ink` | `#7a7a85` | §5.3 `--muted: #7A7A85` | Match |
| `--expanded-choice-accent` | `#5c8e78` | §5.5 `--sage: #5C8E78` | Match |
| `--expanded-choice-accent-surface` | `#e8f0ec` | §5.5 `--sage-muted: #E8F0EC` | Match |

**Scoped-token verdict: no required correction.** Values agree with the visual SSOT. Keeping them in `module.css` (not `globals.css`) is explicitly correct per `project-rules.md §Visual-Design` ("their *values* match the `design.md` semantic tokens; this coexistence is intentional… Do not refactor scoped tokens as a side effect"). **No promotion to `globals.css` proposed** (Wave 16 / BQ-04).

### Hardcoded visual values not traceable to a design.md token

| Evidence | Value(s) | Traceability / disposition |
|---|---|---|
| `landing-grid-card.tsx:165-170` fallback thumbnail SVG | gradient `#3B6EF5` → `#17A789`, text `rgba(255,255,255,0.85)`, Avenir stack, `viewBox 0 0 600 100` (6:1) | **Cold-blue / teal** — conflicts with §4.4/§4.9 imagery direction. → RC-3 (palette). |
| `public/landing-card-media/qmbti/thumbnail.svg` | gradient `#102541` → `#1f5aa6` → `#31b28b`, fill `#f7fbff`, white `rgba` circles, Avenir, `viewBox 0 0 600 100` (6:1) | **Cold-blue / navy / teal** — conflicts with §4.9. → RC-3 (palette). |
| `landing-grid-card.tsx:215` thumbnail slot | `aspect-[6/1]` | Conflicts with §6.2 `16 / 6`. → RC-2 (ratio). |
| `landing-grid-card.tsx:224` preview question | `tracking-[-0.01em]` | §5.1/§7.3 specify size/weight/line-height but not negative tracking. Minor; not a token-parity defect. Logged, not a candidate. |
| `landing-grid-card.tsx:205`, module motion vars | `--landing-card-motion-ms:280ms` (reduced `180ms`), staged delays 40/100/160ms, shell scale `1.04`, stage-bleed `72/56/192px` | Not mapped to §5.11/§8 motion tokens (`--dur-expand:260ms`, `--dur-fast:140ms`, easing tokens). Motion choreography is a **separate motion/geometry reconciliation**, not W1–W5 token parity. Logged, **out of scope**. |

**BQ-21 coverage (RC-1):** `design.md §5/§6` **fully covers** the scoped color/radius/shadow surface. Motion timing tokens and overlay stage-bleed values are **not** fully specified by design.md, but they are out of this RC's scope (motion/geometry analysis is separate) — therefore **no supplemental-CSS exception candidate** arises here. Do not rewrite motion/bleed values under this RC.

---

## 5. RC-2 — Thumbnail Aspect Ratio (design `16 / 6` vs implementation `6/1`)

> *(Scope note: RC-2 here = the thumbnail ratio. The meta-label casing item the prompt
> labels "RC-2" is analyzed in §6 to keep the design-vs-implementation conflicts grouped;
> candidate IDs are stable regardless of section order.)*

| Surface | Evidence | Value |
|---|---|---|
| Design SSOT | `design.md §6.2`: "A `16 / 6` aspect-ratio block at medium radius, full width, clipped." | `16 / 6` ≈ **2.667:1** |
| design.md provenance | `git show HEAD:docs/design/design.md` (committed, pre-restructure) also stated `aspect-ratio: 16 / 6` and "Aspect reference: `16 / 6` (wide letterbox), as realized in the final mockup." | **Long-standing**, not newly introduced by the BQ-21 restructure |
| Implementation | `landing-grid-card.tsx:215` slot class: `aspect-[6/1]` | `6/1` = **6:1** |
| Placeholder art | both SVGs use `viewBox 0 0 600 100` (6:1), matched to the 6/1 slot | 6:1 |
| Existing QA contract | `grid-smoke.spec.ts:823-827` asserts thumbnail `clientWidth/clientHeight ∈ (5.5, 6.5)` | encodes/protects **6/1** |
| Prior wave resolution | `docs/plans/2026-05-31-wave-3-normal-card-visual-skin.md` — "PRIMARY conflict… **Resolution: keep `6/1`**… `16/6` is aspirational/non-binding for Wave 3 and is **logged as a future reconciliation item** (would need a contract+test decision outside Wave 3)." Justified then by the wave3 reference CSS marking `16/6` "reference only, not mandatory." | Deferred to *this* reconciliation |

**Conflict (surfaced, not silently resolved).** design.md SSOT says `16/6`; the implementation and a green E2E assertion say `6/1`. The Wave 3 plan deliberately kept `6/1` and deferred the decision — and the "reference only, not mandatory" basis for that deferral came from the **now-superseded** wave3 reference CSS, which BQ-21 retires as a visual source. The current `design.md §6.2` states `16/6` as a component spec with **no** "non-mandatory" caveat.

**Magnitude reality check (important).** At fixed card width, `16/6` makes the thumbnail **~2.25× taller** than `6/1` (height goes from `W/6` to `0.375W`). This is a **visible** change to card height, row rhythm, and the resting-height floor used by the expanded card — it is **not** "near-unchanged." That directly tensions the initiative's stated "unchanged or near-unchanged" expectation, so this item needs an explicit user decision rather than a silent SSOT-follow.

**Resolution by precedence.** No decision-register entry and no product requirement fixes the thumbnail ratio (BQ-08 governs *order*, not ratio; req-doc search found none). So `design.md §6.2` is the governing visual authority → the implementation has **drifted**. The only counter-authority is the `grid-smoke` assertion, which is QA encoding the drifted value, not a product/decision contract. **Recommended:** treat as a **required SSOT correction** to `16/6` *and* update the `grid-smoke` ratio bound to ~`(2.4, 2.9)` — unless the **user reaffirms `6/1`** as an intentional product/QA contract (in which case log a BQ-21 exception in the decision register and add the "non-mandatory" caveat back to `design.md §6.2`). Because the visual delta is non-trivial, this is the single most important item for the user to adjudicate.

**Coupling:** if `16/6` is approved, the two placeholder SVGs (6:1 art) should be re-drawn to the new ratio together with RC-3 (palette), or `object-cover` will crop them.

**BQ-21 coverage (RC-2):** `16/6` is a concrete value, **fully covered** by `design.md §6.2`. No supplemental-CSS exception needed. The gap is not in design.md — it is the conflict with the E2E contract + the near-unchanged expectation.

**User decision / resolved status.** The user approved adopting `16 / 6`. The prior conflict-gated status is resolved: implementation should change the thumbnail slot from `aspect-[6/1]` to the `16 / 6` design SSOT value, and the `grid-smoke` ratio assertion must be updated in the same change set. The previous `6/1` assertion is now treated as a QA encoding of the old implementation, not as a product contract.

**Implementation disposition.**
- Update `landing-grid-card.tsx:215` from `aspect-[6/1]` to the `16 / 6` equivalent.
- Update `tests/e2e/grid-smoke.spec.ts:823-827` from the `6/1` bound to an appropriate `16/6` bound, e.g. around `2.4–2.9`.
- Redraw/rework both thumbnail SVG surfaces to the new ratio in the same change set to avoid accidental `object-cover` cropping.
- Preserve card entry behavior, storage, telemetry, transition, resolver, routing, and i18n behavior.

**Risk note.** The visual delta remains non-trivial: at fixed width, `16/6` is about 2.25× taller than `6/1`. That is now an accepted visual/QA-contract change, not an open question. Rollback is straightforward: restore `6/1`, previous SVG viewBox/art, and previous grid-smoke ratio bounds.

---

## 6. RC-W1W5-01 — Meta Label Casing (`metaAttempts`) — rejected / no-change

### Evidence

`getDefaultCardCopy()` (`landing-grid-card.tsx:1167-1179`) and all 12 locales (`src/messages/*.json:26`) define `metaAttempts`. The label renders as a `<dt>` in a 3-column meta grid (`landing-grid-card.tsx:623-625`), sitting above the numeric `engagedC` value.

| Locale | `metaAttempts` value | Note |
|---|---|---|
| en (`en.json:26`) + default (`tsx:1174`) | `Completed` | sentence-case (first-letter capital) |
| de | `Abgeschlossen` · es `Completados` · fr `Terminés` · id `Selesai` · pt `Concluídos` · ru `Завершено` | cased scripts, initial-capital |
| kr `완료 수` · ja `完了数` · zs `完成数` · zt `完成數` · hi `पूर्ण` | no Latin/Cyrillic upper-lower distinction — semantic equivalents |

Sibling labels in the same row (en): `metaEstimated` = `"Est. time"`, `metaShares` = `"Shares"`; adjacent card copy: `comingSoon` = `"Coming soon"`, `metaViews` = `"Views"`, `readMore` = `"Read more"`. **The entire realized copy set uses sentence case (first-letter capital).**

Requirements search (`req-landing.md`, `req-test.md`, `req-test-plan.md`, `project-analysis.md`, `requirements.md`): every "completed"/"Completed run" hit is a **test-flow domain term** (Active/Completed Run state machine, result pipeline) — **no product requirement governs landing meta-label casing.**

**Final decision.** Rejected / no-change. Keep rendered English `Completed`. This is not an implementation task.

**Disposition.**
- No source or locale message change.
- No row-wide lowercase rewrite.
- Optional docs-only clarification, if this file is edited in a nearby docs pass: clarify `design.md §7.3` so `completed` is understood as word choice, not a casing directive.

### The real finding: a design.md internal notation tension, not code drift

- `design.md §4.2` (Product voice → **Casing**): "**sentence case everywhere** — buttons, headings, menus, labels." For a single-word label, sentence case = first-letter capital ⇒ **"Completed"**.
- `design.md §7.3` and `decision-register BQ-09` write the label as **`completed`** (lowercase, in code backticks), in contrast with the removed `taken` / `have taken`.

Read literally, §7.3's lowercase `completed` would demand "completed"; but §4.2 (the explicit casing rule) demands "Completed", and every sibling meta label is sentence-cased. The most consistent reading is that **BQ-09/§7.3's substantive mandate is the *word* ("completed", never "taken")** and the lowercase styling is token notation, while **§4.2 governs casing** → "Completed" is correct.

**Resolution by precedence.** BQ-09 (decision-register, highest) mandates the *word* — **satisfied** ("Completed" is the word *completed*). Casing is owned by `design.md §4.2` (sentence case) — **satisfied**. Lowercasing only this one cell would *violate* §4.2's "sentence case … labels" and break row consistency with "Shares"/"Est. time". **Therefore the implementation is defensibly correct and RC-2′ is NOT a required code/i18n correction** — a reversal of the prior draft, which over-read §7.3's backtick lowercase as a casing mandate.

**Recommended action:** **no source/message change.** Optionally clarify `design.md §7.3` to note the label renders sentence-case "Completed" (word "completed", not "taken"), removing the §4.2-vs-§7.3 notation ambiguity at the source. If the user instead intends a *literal* lowercase stat-label convention, that is a **deliberate, row-wide + cross-locale** voice decision (it would also lowercase "Shares"/"Est. time"/"Views" and revisit §4.2) — out of proportion to a single-cell change and reserved for the user.

**BQ-21 coverage (RC-2′):** the surface is covered, but `design.md` is **internally ambiguous** (§4.2 vs §7.3 notation). No CSS exception; the only possible artifact is an optional design.md wording clarification (docs, not code).

---

## 7. RC-3 — Thumbnail Placeholder / Asset Palette (cold-blue drift)

| Surface | Evidence | Verdict |
|---|---|---|
| Fallback SVG | `landing-grid-card.tsx:165-170`: `#3B6EF5` → `#17A789`, Avenir | Cold-blue/teal "tech" gradient |
| Asset SVG | `public/landing-card-media/qmbti/thumbnail.svg`: `#102541` → `#1f5aa6` → `#31b28b`, Avenir | Cold-navy/blue/teal gradient (the one asset-backed variant, user-visible) |
| Design direction | §4.4 "**No** … **cold blue tech imagery**"; §4.9 thumbnails "warm-neutral / sage family at low saturation… must **not** introduce neon or **cold-blue** tech aesthetics." | Implementation violates direction |

**Classification: required correction (SSOT drift).** Both placeholders are off-system cold-blue/tech aesthetics, the exact thing §4.4/§4.9 forbid. The asset SVG is visible for the live `qmbti` variant; the fallback covers all other variants. Structure stays the same (gradient + token text); only the palette (and ideally font stack → Pretendard per §4.3) changes.

**Design coverage:** §4.4/§4.9 give the **constraint** (warm-neutral / sage family, low saturation) and §5 gives the token family (`--canvas`, `--surface-soft`, `--sage`/`--sage-soft`/`--sage-muted`); §9 explicitly states real thumbnail imagery is a "recommended missing resource" and current ones are "calm abstract placeholders." So exact placeholder hex is the implementer's choice **within** that family — **covered enough; no supplemental-CSS exception** (these are SVG/inline assets, not a CSS-snippet gap). Contrast must be checked for the overlaid token text (§4.10). Couples with RC-2 if the ratio changes (re-draw art to the new viewBox).

**Coupling with RC-W1W5-02.** Because `16 / 6` is approved, this palette correction must not be implemented as a color-only edit against the old `600×100` / `6:1` art. Rework the fallback SVG and `qmbti` thumbnail SVG composition, viewBox, and palette together.

**User decision.** Approved. Implement RC-W1W5-03 in the same change set as RC-W1W5-02.

**Required implementation scope:**
- Replace cold-blue / teal / navy values in the inline fallback SVG.
- Rework `public/landing-card-media/qmbti/thumbnail.svg` into the warm-neutral/sage family.
- If RC-W1W5-02 changes the thumbnail slot to `16 / 6`, redraw the SVG art and viewBox for that ratio in the same change set.
- Prefer the existing design token family as source values where practical; do not introduce a new palette system.

---

## 8. RC-4 — Superseded References & Doc Repointing

### Runtime / test import check (decisive)

`rg` across `src/**` and `tests/**` for `design_legacy`, `wave3-normal-card-reference`, `wave4-expanded-test-content-reference`, `wave5-expanded-test-visual-skin-reference`: **zero matches.** No runtime or test code imports any wave reference CSS or `design_legacy.md`. The deleted root wave-CSS files now live under `docs/design/resources/superseded/`.

### Docs still naming wave CSS / legacy as a current visual source

| File | Evidence | Repoint need |
|---|---|---|
| `docs/plans/2026-05-31-wave-6-desktop-expanded-overlay-sibling-isolation-analysis.md` (~L27) | "Design references: `docs/design/design.md`; `…/wave4-…reference.css`; `…/wave5-…reference.css`" | **Required before this Wave 6 analysis is reused.** It is untracked and current-looking; should point at `docs/design/design.md` (+ at most `superseded/**` as historical evidence). |
| `docs/2026-05-31-bq21-design-authority-reconciliation.md` (~L43-45) | Lists old root wave-CSS paths as files to supersede/relocate | This *is* the BQ-21 reconciliation plan; legitimate as plan text. Not a runtime/visual source — leave, but do not treat as current authority. |
| `docs/plans/2026-05-31-wave-3-normal-card-visual-skin.md` | Names `wave3-…reference.css` as visual authority/reference | Historical approved plan — optional supersession note only if docs are actively normalized. |
| `docs/plans/2026-05-31-wave-5-expanded-test-visual-skin-analysis.md` | Names `wave4-…reference.css` as visual authority (notes "no separate wave5 css exists") | Historical approved analysis — optional supersession note only. |

**User decision.** Approved only for the same small current set.

**Disposition.**
- Required before reuse: repoint the current untracked Wave 6 analysis from wave4/5 CSS references to `docs/design/design.md`.
- Do not broadly rewrite historical Wave 3/5 plans in this change set.
- Historical docs may retain superseded references as historical evidence unless they are actively reused as current visual authority.

**BQ-21 coverage (RC-4):** fully covered by `design.md` + `project-rules.md §Visual-Design` ("Per-wave CSS is not the design SSOT… superseded under `…/superseded/`"). No CSS exception.

**Scope guard.** This approval is limited to the current Wave 6 analysis document before reuse. Do not normalize historical Wave 3/5 reports in this change set unless they are actively being reused as current visual authority.

---

## 9. RC-5 — Traceability & Hygiene

| Check | Result |
|---|---|
| BQ-13 present | Yes — `decision-register.md:19` |
| BQ-14 present | Yes — `decision-register.md:20` |
| BQ-15 present | Yes — `decision-register.md:21` |
| BQ-16 present | Yes — `decision-register.md:22` |
| BQ-17 present | Yes — `decision-register.md:23` |
| Wave 1 BQ-08 prerequisite | `wave-roadmap.md:7` (overview) + `:83` (detail prereq "BQ-08 승인"); BQ-08 at `decision-register.md:14` — resolves |
| Wave 1 BQ-16 / BQ-17 resolution | `wave-roadmap.md` Wave 1 Include/Exclude (`:60-82`) align: motion-ready seam only, output-identical pure relocation only (BQ-16/17), geometry/sibling isolation deferred to Wave 6 (`:82`) — resolves |
| `git diff --check` | **Clean (exit 0).** It does **not** flag the logo whitespace — the prompt's "trailing-whitespace reported by `git diff --check`" does not hold in the current committed-unchanged state (the check only inspects the working-tree diff). |
| `vive-logo.svg` whitespace | **Present:** `docs/design/resources/assets/vive-logo.svg:2` is a whitespace-only line (two spaces). Real, but only surfaced by direct read, not by `git diff --check` until the file is otherwise edited. Optional hygiene. |
| Path casing note | Git tracks canonical `docs/design/design.md` (lowercase); the macOS case-insensitive filesystem can display `DESIGN.md` in tool output. Use the lowercase path in docs. No action needed. |

**Classification:** BQ traceability is intact (no correction needed). The logo whitespace is optional hygiene; note the corrected understanding of `git diff --check`.

If the implementation change set already touches docs/design assets, stripping `vive-logo.svg:2` is allowed. It must not expand the scope or become a blocker.

---

## 10. design.md Coverage Summary (BQ-21 visual-wave requirement)

| RC item | design.md coverage | Supplemental-CSS exception? |
|---|---|---|
| RC-1 tokens | Fully covered (§5/§6). Motion/bleed values out of scope. | **No** |
| RC-2 thumbnail ratio | Fully covered (§6.2 `16/6`). Conflict is external (E2E + near-unchanged expectation). | **No** |
| RC-2′ meta casing | Covered but internally ambiguous (§4.2 vs §7.3 notation). | **No** (optional docs clarification only) |
| RC-3 palette | Direction covered (§4.4/§4.9 + §5 token family); placeholder is implementer-chosen within family. | **No** |
| RC-4 doc repoint | Fully covered (BQ-21 / project-rules). | **No** |
| RC-5 hygiene/traceability | Process/docs only. | **No** |

**No BQ-21 supplemental-CSS exception candidate arises from this RC.** No CSS is authored here.

---

## 11. BQ-19 Finding Fields

Layers use the BQ-18 lens: {state, hooks, routing, storage, telemetry, i18n} + {visual/CSS, docs}.
Improvement value rated 1–5: (1) modern React patterns · (2) simplicity/maintainability · (3) performance · (4) testability · (5) a11y logic.

### RC-W1W5-01 — Meta `metaAttempts` casing (reclassified to no-change / optional docs clarification)
| Field | Value |
|---|---|
| Classification | **Rejected / no-change.** Keep rendered `Completed`; optional `design.md §7.3` wording clarification only. |
| Change magnitude | Low (docs-only, if applied). |
| Affected layers | docs (design.md §7.3) at most; **no** i18n/source change. |
| Risk & rollback | Very low. Rollback: revert the docs note. |
| Improvement value | 2) low (removes §4.2-vs-§7.3 notation ambiguity); others n/a. |
| Wave dependency | Wave 4/5 content scope; no Wave 6+ dependency. |
| design coverage | Covered but internally ambiguous (§4.2 vs §7.3). |
| Later validation gates | Markdown review only. |

### RC-W1W5-02 — Thumbnail aspect ratio `6/1` → `16/6`
| Field | Value |
|---|---|
| Classification | **Approved required correction.** Adopt `16 / 6`; update implementation + `grid-smoke` ratio contract in the same change set. |
| Risk & rollback | Medium. Approved despite non-trivial visual delta. Rollback: restore `aspect-[6/1]`, previous SVG viewBox/art, and previous grid-smoke ratio bound. |
| Affected layers | visual/CSS (`landing-grid-card.tsx:215`), tests (`grid-smoke.spec.ts:823-827`), docs (if `6/1` reaffirmed → log BQ-21 exception) |
| Change magnitude | **Medium–High** (thumbnail ~2.25× taller; affects card height/row rhythm; **not** near-unchanged) |
| Improvement value | 1) n/a · 2) medium (removes design↔impl contradiction) · 3) neutral · 4) high (explicit ratio assertion) · 5) low/neutral |
| Risk & rollback | Medium. Interacts with Wave 10 grid height rhythm and B14/Wave 13 mobile continuity perception. Rollback: restore `aspect-[6/1]` + ratio bounds. |
| Wave dependency | Wave 3 (thumbnail treatment); interacts with Wave 10, Wave 13 |
| design coverage | Fully covered (§6.2) |
| Later validation gates | Basic Gates; focused `grid-smoke` thumbnail-ratio assertion updated to ≈`(2.4, 2.9)` (functional geometry, **not** a screenshot); state/gnb functional smoke; **no** baseline regen |

### RC-W1W5-03 — Replace cold-blue thumbnail placeholder/asset palette
| Field | Value |
|---|---|
| Classification | **Approved required correction.** Rework fallback + `qmbti` SVG palette to warm-neutral/sage; couple with RC-W1W5-02 ratio redraw. |
| Affected layers | visual/CSS (`landing-grid-card.tsx:165-170`), asset (`public/landing-card-media/qmbti/thumbnail.svg`), docs |
| Change magnitude | Low–Medium (palette + font stack; structure unchanged) |
| Improvement value | 1) n/a · 2) medium (removes off-system hardcoded colors) · 3) neutral · 4) low/medium (can assert absence of old hex) · 5) low (contrast must be checked) |
| Risk & rollback | Low for fallback; Medium for visible asset (contrast). Rollback: restore prior SVG colors. |
| Wave dependency | Wave 3; couples with RC-W1W5-02 if ratio changes (re-draw art to new viewBox) |
| design coverage | Direction covered (§4.4/§4.9 + §5 token family); exact placeholder values implementer-chosen |
| Later validation gates | Basic Gates; `grid-smoke` thumbnail src/presence functional; manual contrast check; **no** baseline regen |

### RC-W1W5-04 — Repoint current docs away from wave CSS as visual authority
| Field | Value |
|---|---|
| Classification | **Approved, limited docs correction.** Repoint only the current Wave 6 analysis before reuse; avoid broad historical doc normalization. |
| Affected layers | docs |
| Change magnitude | Low |
| Improvement value | 1) n/a · 2) high (prevents future prompt drift) · 3) none · 4) low · 5) none |
| Risk & rollback | Low; prefer small supersession notes over rewriting historical intent |
| Wave dependency | BQ-21 process guard before any Wave 6+ prompt |
| design coverage | Fully covered (BQ-21 / project-rules) |
| Later validation gates | Markdown/diff review; `git diff --check`; no app gates for docs-only |

### RC-W1W5-05 — Strip `vive-logo.svg` line-2 whitespace
| Field | Value |
|---|---|
| Classification | **Optional hygiene.** May include with the same docs/assets hygiene change set; not required. |
| Affected layers | docs/asset |
| Change magnitude | Low |
| Improvement value | 1) n/a · 2) low · 3) none · 4) low (`git diff --check` once edited) · 5) none |
| Risk & rollback | Very low |
| Wave dependency | BQ-21 R3 hygiene; not a visual-wave blocker |
| design coverage | n/a |
| Later validation gates | `git diff --check` |

### RC-W1W5-06 — (Optional, out-of-band) token-parity QA check
| Field | Value |
|---|---|
| Classification | **Deferred / out of scope for this change set.** Do not touch `scripts/qa/*`. |
| Affected layers | QA script, docs |
| Change magnitude | Medium (Ask-First path; brittle-parse risk) |
| Improvement value | 1) n/a · 2) high (machine-enforces RC-1 scoped-token ↔ design.md invariant) · 3) none · 4) high · 5) none |
| Risk & rollback | Low/medium (parser brittleness). Rollback: remove script + any package wiring |
| Wave dependency | Post-RC guard; useful before Wave 16 global-token migration |
| design coverage | Fully covered for the known token table; parser must skip intent-only tokens |
| Later validation gates | Basic Gates if wired; script dry run; **no** baseline regen |

---

## 12. Required Validation for the Approved Implementation

For RC-W1W5-02/-03:
1. Basic Gates: `npm run lint` → `npm run typecheck` → `npm test` → `npm run build`.
2. Focused `grid-smoke` update/check for the `16 / 6` thumbnail ratio.
3. Static grep/assertion that old cold-blue hex values are removed from:
   - inline fallback SVG in `landing-grid-card.tsx`
   - `public/landing-card-media/qmbti/thumbnail.svg`
4. Manual visual check for thumbnail composition, crop, and contrast.

For RC-W1W5-04 and optional RC-W1W5-05:
- `git diff --check`
- markdown/diff review

Explicitly excluded:
- `qa:visual:full`
- screenshot baseline regeneration
- new `scripts/qa/*` token parity script

---

## 13. Candidate Register (user decision applied)

| ID | Tag | Candidate | Decision / Status |
|---|---|---|---|
| RC-W1W5-01 | No-change | Meta `metaAttempts` casing | **Rejected / no-change.** Keep `Completed`; optional `design.md §7.3` clarification only. |
| RC-W1W5-02 | Approved | Thumbnail ratio `6/1` → `16 / 6` | **Approved.** Implement ratio change and update `grid-smoke` in the same change set. |
| RC-W1W5-03 | Approved | Replace cold-blue fallback + `qmbti` thumbnail SVG palette | **Approved.** Rework to warm-neutral/sage; redraw/rework assets with the approved `16 / 6` ratio. |
| RC-W1W5-04 | Limited approved | Repoint current docs away from wave CSS as visual authority | **Approved if same small set.** Repoint current Wave 6 analysis before reuse; do not broadly rewrite historical plans. |
| RC-W1W5-05 | Optional | Strip whitespace-only line at `vive-logo.svg:2` | **Optional.** May include with docs/assets hygiene; not required. |
| RC-W1W5-06 | Deferred | Token-parity QA script | **Deferred.** Do not touch `scripts/qa/*` in this change set. |

**Gate status:** BQ-19 Analysis gate is cleared for the approved RC implementation scope. The next step may be a Plan Only or Implementation prompt, limited to RC-W1W5-02/-03 plus RC-W1W5-04 and optional RC-W1W5-05 hygiene. RC-W1W5-01 is no-change; RC-W1W5-06 is deferred.

Logic Improvement: no business-logic candidates approved for this task — preserve existing resolver, storage, telemetry, transition, routing, test-entry, and i18n behavior.

Approved RC corrections: RC-W1W5-02 and RC-W1W5-03 are approved as visual/asset/QA-contract reconciliation only. Apply the `16 / 6` thumbnail ratio, update the matching `grid-smoke` ratio contract, and redraw/rework fallback + `qmbti` thumbnail SVG assets in the same change set. RC-W1W5-04 is approved only for the current Wave 6 docs repoint before reuse. RC-W1W5-05 is optional hygiene. RC-W1W5-06 is deferred.
