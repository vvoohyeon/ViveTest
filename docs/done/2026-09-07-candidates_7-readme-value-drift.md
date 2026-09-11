# Candidate 7 — `README.md` restates ~30 token values in prose, is pushed, and one of them is already wrong

**Date:** 2026-09-07 · **Tier:** 3 — run after the design pass · **Task mode:** Implementation (documentation surface only) · **공수** S · **효과** 중 · **심각도** 중

---

## Shared frame

**Program.** The 2026-09-06 design-system rebaseline (`BQ-38`) replaces waves 13–17. The repository owns one token definition under `docs/design/ds/` and pushes it one-way to **VIVE Design System v2** (`cd630eec-25e4-4613-a58f-c671c80297ca`). Sync procedure: `docs/design/ds/SYNC.md`.

**Priorities, in order.** 1 — preserve the implemented logic with no side effects. 2 — take design and interaction quality as high as it will go.

**Approved decisions (`BQ-38`).** **A** tokens carry catalog values under VIVE names · **B** `req-landing.md` §8 frozen · **C** catalog card tokens and patterns frozen · **D** from `825385f6` take only card components and thumbnail SVGs.

**Invariant boundaries.** `src/**` is untouched until the theme cut — **this document changes no runtime file**. No baseline regeneration (`BQ-07`).

**Where this sits.** motion pass → tier 2 (`candidates_1`–`6`) → design pass → **this document** → theme cut.

**Why tier 3.** Nothing here blocks the design pass, and the design pass may itself change some of the values this document is about to de-duplicate. Doing it after means doing it once.

**Do not re-run.** Tier 1 already corrected `SYNC.md`, which used to claim that everything but two preview cards followed `colors_and_type.css` automatically. It now names all four files that restate values, `README.md` among them. The claim is fixed; the drift is not.

---

## The finding

`docs/design/ds/README.md` is the design system's own documentation and is pushed to Claude Design alongside the CSS (`SYNC.md`). It hardcodes roughly thirty token values in narrative prose, where nothing connects them to the definitions they describe:

| `README.md` line | What it restates |
|:---|:---|
| 80 | `--canvas` `#fbfaf7` |
| 81 | `--accent` `#5c8e78`, hover `#4b7764`, pressed `#396050`, `--accent-subtle` `#e8f0ec` |
| 82 | the sage-on-white contrast figure, 3.75:1, and `--accent-fg` `#396050` at 7.09:1 |
| 83 | `--accent2` `#c2855b` |
| 89–90 | the display and heading scales, 56 / 44 / 36 and 30 / 24 / 20 / 18 |
| 96–97 | the spacing ladder 4 → 96px; `--container` 1280px, `--container-narrow` 760px |
| 98 | the grid gutters 24 / 20 / 15px — **and the column claim, see below** |
| 102 | the whole radius ladder, `xs` 5 through `xl` 24 |
| 103 | `--border` `#e6e2d8`, `--border-strong` `#d6d1c4` |
| 119 | the duration ladder 120 / 140 / 180 / 280ms and the 40 / 100 / 160ms stagger |
| 124 | `--overlay-scrim` `rgba(26,26,31,0.48)` |

It reads as narrative rather than as data, which is exactly why it catches people out: a reader checking whether a value is current will open the CSS, and a reader learning the system will read the prose. The two diverge silently and the prose wins for anyone learning.

### The one that is already wrong

`README.md:98`:

> **Layout primitives:** prefer CSS grid / flex with `gap`. Cards lay out 3-up desktop → 2-up tablet → 1-up mobile.

`design.md` §7.7:

> **Wide desktop:** first row 3 columns, **following rows 4 columns**.

The product agrees with `design.md` — the extraction measured 3 × 397px in the first row and 4 × 292px after it, and the commit message for `e8a453e` says so in the same breath as shipping this README. The asymmetry is a deliberate catalog decision ("top-row prominence comes from wider columns only"), and the README flattens it into a conventional 3-up grid.

---

## What to change

### 1. Replace literals with token names wherever the name is the point

Most of these lines are teaching *which token to reach for*, and the hex is decoration. `--canvas` is a warm off-white; the reader does not need `#fbfaf7` in the sentence to use it, and if they do need it, the swatch card is one click away and always correct.

Rewrite so each of the lines above names the token and describes its role, with no value. Keep the prose voice — this is not a data table.

### 2. Keep the values that are genuinely narrative, and mark them

Three kinds survive:

- **Measurements that are not tokens** — the contrast ratios on line 82. They are facts about the palette, not restatements of it, and they are the reason the sage-as-text rule exists. Keep them.
- **Ladders where the shape is the teaching** — the spacing scale's 4 → 96px, the type scale's steps. A reader needs to see the rhythm. Keep them, and add a one-line pointer to the specimen card that renders each.
- **The grid gutters**, because they are the one set with no specimen card until `candidates_3` adds one. Once that card exists, this line can point at it instead.

Mark each surviving value with a comment or a consistent phrase so `candidates_10`'s gate can find and check them rather than having to parse arbitrary prose.

### 3. Fix line 98

Replace the 3-up claim with the realized behaviour: first row three wider columns, following rows four; 2 → 3 at medium; 2 → 2 at lower tablet; single column on mobile. Name `design.md` §7.7 as the owner. Once `candidates_3` has shipped `grid-rhythm.html`, point at it.

### 4. Re-check the whole file against the CSS while you are in it

The eleven rows above were found by grep on 2026-09-06. Re-run the same grep before editing — `grep -nE '#[0-9a-fA-F]{6}|[0-9]+ms|[0-9]+px' docs/design/ds/README.md` — because the design pass will have landed between then and now.

---

## Verification

- Re-run the grep. Every remaining hit is either a contrast measurement, a ladder whose shape is being taught, or carries the marker phrase from step 2.
- Every token name that replaced a literal resolves — spot-check by rendering any preview and reading the property back, since a mistyped token name in prose is invisible.
- `README.md`'s column description matches `design.md` §7.7 word for word in substance.
- `git diff --stat` shows only `docs/design/ds/README.md` and this plan.
- Push `README.md` and confirm with `get_file` that the pushed copy is the edited one.

---

## Decisions the user may want to make

- **Whether `README.md` should carry any values at all.** The stricter option is zero — every value lives in the CSS and every specimen renders it. That is more robust and slightly less readable. Recommended: the middle path above.

---

## Execution prompt

> Read `docs/plans/2026-09-07-candidates_0-overview.md`, then `docs/plans/2026-09-07-candidates_7-readme-value-drift.md`, and implement it. Re-run the value grep before editing rather than trusting this document's line numbers. Work in an isolated clone; touch nothing under `src/`. Push `README.md` to `cd630eec-25e4-4613-a58f-c671c80297ca` per `docs/design/ds/SYNC.md`, then commit and land on `main`.
