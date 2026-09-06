# Design-system rebaseline — step 1: repo-owned tokens, pushed to VIVE Design System v2

**Date:** 2026-09-06 · **Task mode:** Implementation (documentation surface only) · **Branch:** `claude/design-system-rebaseline`

This is step 1 of a multi-step program that **replaces waves 13–17** of `docs/wave-roadmap.md`. Each step gets its own document; the shared frame below is repeated in every one so each stands alone.

---

## Shared frame

### Goal

Make the ViveTest design system a single definition that the repository owns and Claude Design consumes, then use Claude Design to raise the product's visual and interaction quality across every surface — including the surfaces that have no design at all today — and implement the result without the design and the code drifting apart again.

### Priorities, in order

1. **Preserve the implemented logic with no side effects.** The interaction controllers, state model, storage, telemetry, transition runtime, routing, and their E2E contracts are the asset being protected. Nothing in this program is worth a behavioural regression.
2. **Take the design and interaction quality to the highest level achievable.** Micro-interactions, transitions, hover and focus behaviour, and visual completeness are the point of the program, not a finish pass.

### Approved decisions

| # | Decision | Approved |
|:---|:---|:---|
| A | Token vocabulary: keep the **catalog's realized values**, adopt the **VIVE base structure**. Two layers, not a value migration. | 2026-09-06 |
| B | `docs/req-landing.md` §8 stays **frozen** for now. Every other surface aligns to its realized values. Amending §8 is decided last, separately, after the motion pass. | 2026-09-06 |
| C | The catalog card tokens and patterns are **frozen**. Improvements are proposed as separate artboards, never applied silently. | 2026-09-06 |
| D | From the older design system `825385f6` take only the **card components and thumbnail SVGs**; freeze the rest as reference. | 2026-09-06 |

### Invariant boundaries for the whole program

- `src/**` is untouched until the theme cut (step 4), which is its own plan and its own approval.
- No visual-regression baseline is regenerated at any step without separate approval (BQ-07). The `qa:visual:full` script is not run.
- `docs/wave-roadmap.md` and `docs/decision-register.md` are **not** edited until the program's shape is settled; retiring waves 13–17 is a decision-register change and gets its own approval.
- Claude Design projects: `cd630eec` (**VIVE Design System v2**, `PROJECT_TYPE_DESIGN_SYSTEM`) is the only push target. `ee2fb724` (**ViveTest v3 -branch2**) is a regular project — the canvas workspace, never a push target; its type is immutable. `825385f6` is reference-only per decision D.

### Step sequence

| Step | What | State |
|:---|:---|:---|
| 1 | Repo-owned token definition, pushed to `cd630eec`. Foundation layer. | this document |
| 1b | Component previews built from the real rendered app, pushed. | next |
| 2 | Motion pass in Claude Design — interactive artboards, one unified spec, M-01 resolved. | |
| 3 | Design pass — catalog reviewed under decision C; the undesigned surfaces designed. | |
| 4 | Theme cut in code — `globals.css` replaced, dark tokens removed, Pretendard loaded, hero removed, GNB pill. Ask-First, own plan. | |
| 5 | Per-surface reskin and motion implementation, each pushing back to the design system. | |
| 6 | Visual baseline regenerated once, with approval. | |

---

## Findings register

Measured this session against the working tree at `0c7d794`. Each is recorded rather than fixed, because each is a design decision and not a cleanup.

### M-01 — the core interaction animates `linear`, against its own contract

All **21** animations in `src/features/landing/grid/landing-grid-card.module.css` declare `linear`, and `animation-timing-function` appears nowhere in the file. `docs/req-landing.md` §8.3 requires that "easing은 `ease-in-out` 계열로 통일한다". No unit or E2E test asserts a timing function, so nothing catches the divergence.

This is the largest single micro-interaction defect available to fix: the signature expand and collapse — the product's whole identity — moves mechanically. Fixing it is pure CSS timing with no logic surface, and it moves the code *toward* its contract rather than away.

It is not fixed here because the curve should come from the motion pass, and the two documents that could supply one disagree: `docs/design/design.md` §5.11 names `--ease-standard: cubic-bezier(0.2,0,0,1)`, which is an ease-**out**, while §8.3 mandates ease-in-out. `preview/motion.html` now renders all three candidates at the realized 280ms so the choice can be made by eye.

### D-01 — the neutral ramp changes temperature mid-scale

Measured red-minus-blue per step: `--warm-0…400` run warm (0, +4, +10, +13, +14, +18, +18); `--warm-500…900` run cool (−8, −11, −11, −8, −5). Surfaces are warm, ink is cool, and the break falls between 400 and 500. Both halves are realized product values, so both are frozen under decision C. Unifying them would move every text colour in the product.

### D-02 — Pretendard is specified everywhere and loaded nowhere

`docs/design/design.md` §4.3 makes Pretendard Variable the single family, and the design system bundles the woff2. The product renders in `'Avenir Next', 'Noto Sans KR', 'Segoe UI'` — set in `src/app/app-body-class.ts`. There is no `@font-face`, no `next/font`, and no Pretendard reference anywhere in `src/`. Every type decision reviewed so far was reviewed in the wrong typeface. Loading it belongs to the theme cut (step 4), and the design pass should assume it.

### D-03 — the accent has no interaction states

The catalog defines `--sage` and two tints. It defines no hover or pressed step, because until now nothing needed one: the normal card's hover response is expansion, not a skin. Every other surface — buttons, the GNB, the mobile menu, the test flow — will need them. `--accent-hover` (`#4b7764`, 5.09:1 on white) and `--accent-pressed` (`#396050`, 7.09:1) are **derived** in this step, not realized in the product, and the design pass owns confirming them.

### D-04 — three token systems are live at once

| Layer | Where | Consumed by |
|:---|:---|:---|
| Legacy theme (cool grey, blue `#2f73ff`, full dark set) | `src/app/globals.css` | **279** `var(--…)` references across 18 files |
| Catalog realized (warm surfaces, sage) | scoped `--normal-*` / `--expanded-*` in `landing-grid-card.module.css` | the landing cards only |
| VIVE base (`--warm-*`, `--fg*`, `--sage-*`) | the Claude Design system | design work only |

By file, the legacy layer is consumed most heavily by exactly the surfaces that have no design: the test flow (119 references across four files), the GNB and settings (46), the consent banner (20), blog detail (10), history and error routes (7). Step 4 collapses the first and third layers onto the second.

### Accessibility measurements

Computed 2026-09-06. `--sage` on white is **3.75:1** — fine for borders, focus rings and large text, below AA for normal text. `--muted` is **4.24:1**, confirming BQ-29 independently; the scoped correction `#757580` is **4.55:1**. `--accent-fg` is **7.09:1**, `--ink-body` **8.74:1**, `--ink` **17.33:1**, and the tag foreground on the tag fill **7.15:1**.

---

## Step 1 — scope

### What this step does

Creates `docs/design/ds/` as the repository's copy of the Claude Design project `cd630eec`, with paths mirroring the project root 1:1, and pushes the rebaselined foundation to it. After this step the design system renders in the product's own palette, radii, shadows and motion ladder, so a screen designed against it can be implemented without translation.

Decision A is realized as three layers inside one file: VIVE base primitives carrying catalog values, VIVE semantic roles with unchanged names, and the catalog's own alias vocabulary. **No token name is removed**, so all 24 existing preview cards and both UI kits keep rendering; only values move.

### Files added

| Path | Pushed | Purpose |
|:---|:---|:---|
| `docs/design/ds/colors_and_type.css` | yes | the shared token definition |
| `docs/design/ds/README.md` | yes | system documentation, values corrected, findings recorded |
| `docs/design/ds/SKILL.md` | yes | agent entry point, rebaseline note |
| `docs/design/ds/preview/radius-scale.html` | yes | prints values as text — had to change |
| `docs/design/ds/preview/motion.html` | yes | prints values as text; now renders the three easing candidates at 280ms |
| `docs/design/ds/preview/color-temperature.html` | yes | new card making D-01 visible |
| `docs/design/ds/SYNC.md` | no | the repo↔Claude Design contract |
| `docs/design/ds/_provenance/colors_and_type.v2-original.css` | no | pre-overwrite snapshot for rollback |

`preview/color-neutrals.html`, `color-sage.html`, `spacing-scale.html`, `elevation-scale.html` and every `comp-*` and `type-*` card reference tokens only and were audited as correct without edits.

### Files not modified

No file under `src/`, `tests/`, `scripts/`, or `public/`. No change to `docs/design/design.md`, `docs/wave-roadmap.md`, `docs/decision-register.md`, `AGENTS.md`, or `package.json`.

### Relevant SSOT

`docs/design/design.md` §5 supplies the catalog's intended token values; the realized values were read from `src/features/landing/grid/landing-grid-card.module.css` and `landing-grid-card.tsx` and agree with it except on motion, where `docs/req-landing.md` §8.3 and the shipped code both say 280ms against §5.11's 260ms — decision B resolves that in favour of the realized value.

### Impact assessment

- **Shared shell / GNB:** none. No runtime file is touched.
- **Localization:** none.
- **Accessibility:** none at runtime. Three contrast measurements are recorded, and the sage-as-text rule is now written next to the token.
- **State contracts:** none.
- **Core user flow:** none.
- **Outside the repository:** the Claude Design project's foundation file is overwritten. Generic components there round one step softer, cards move to exact white, and the accent shifts to the product's sage. The pre-overwrite file is preserved at `docs/design/ds/_provenance/`.

### Validation

**The basic gates were not run, deliberately.** Every file in this change is under `docs/`, and no file that `lint`, `typecheck`, `test` or `build` reads was touched — `git diff --stat` against `main` is the evidence, and it is a stronger claim than a green gate would be, because a gate run on an unchanged input proves nothing about the input that did change. The gates return at step 4, which is the first step that edits `src/`.

What was verified instead, all of it by measurement rather than by eye:

- **The token file parses and every token resolves.** All **114** custom properties were read back through `getComputedStyle` in a browser against the real stylesheet; **zero** were unresolved. A typo or a broken `var()` chain would have surfaced as an empty string.
- **The derived sage ramp is coherent.** Lightness descends monotonically across all ten steps, hue stays inside 147–157°, and saturation inside 20–29%. The three realized steps sit on that curve rather than beside it.
- **Every contrast figure in this document was computed**, not estimated, using the WCAG relative-luminance formula.
- **The changed preview cards render and fit their declared viewports.** Measured at 700px: `radius-scale` 178px tall with all eight boxes on one row and top-aligned, `color-temperature` 325px, `motion` 371px. The declared `@dsCard` viewports were corrected to match — all three had been wrong, and `radius-scale` had been wrapping.
- **The push landed.** `write_files` reported 6 written, `list_files` confirms `preview/color-temperature.html` is in the project, and the three changed cards were registered explicitly.

### Decisions needing the user

None for this step; A–D are approved and this step implements A. Step 2 opens the motion pass, where M-01 is decided.
