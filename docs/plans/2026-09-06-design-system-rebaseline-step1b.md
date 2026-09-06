# Design-system rebaseline — step 1b: catalog component previews, extracted from the running product

**Date:** 2026-09-06 · **Task mode:** Implementation (documentation surface only) · **Branch:** `claude/ds-components`

Step 1b of the program that **replaces waves 13–17** of `docs/wave-roadmap.md`. Step 1 is `docs/plans/2026-09-06-design-system-rebaseline-step1.md`; the shared frame is repeated below so this document stands alone.

---

## Shared frame

### Goal

Make the ViveTest design system a single definition that the repository owns and Claude Design consumes, then use Claude Design to raise the product's visual and interaction quality across every surface — including the surfaces that have no design at all today — and implement the result without the design and the code drifting apart again.

### Priorities, in order

1. **Preserve the implemented logic with no side effects.** The interaction controllers, state model, storage, telemetry, transition runtime, routing, and their E2E contracts are the asset being protected.
2. **Take the design and interaction quality to the highest level achievable.**

### Approved decisions

| # | Decision |
|:---|:---|
| A | Token vocabulary: keep the catalog's realized **values**, adopt the VIVE **structure**. |
| B | `docs/req-landing.md` §8 stays frozen. Other surfaces align to its realized values; amending it is decided last. |
| C | The catalog card tokens and patterns are frozen. Improvements are proposed as separate artboards. |
| D | From design system `825385f6` take only the card components and thumbnail SVGs; freeze the rest. |

### Invariant boundaries

- `src/**` is untouched until the theme cut (step 4).
- No visual-regression baseline is regenerated without separate approval (BQ-07).
- `docs/wave-roadmap.md` and `docs/decision-register.md` are not edited until the program's shape is settled.
- `cd630eec` (**VIVE Design System v2**) is the only push target. `ee2fb724` is the canvas workspace, never a push target. `825385f6` is reference-only.

### Step sequence

| Step | What | State |
|:---|:---|:---|
| 1 | Repo-owned token definition, pushed. | done — `c5fc624` |
| 1b | Catalog component previews, extracted from the running product. | **this document** |
| 2 | Motion pass in Claude Design; M-01 resolved. | next |
| 3 | Design pass — catalog reviewed under C; the undesigned surfaces designed. | |
| 4 | Theme cut in code. Ask-First, own plan. | |
| 5 | Per-surface reskin and motion implementation. | |
| 6 | Visual baseline regenerated once, with approval. | |

---

## Step 1b — what this step does

Adds the catalog's card system to the design system as a stylesheet plus eight specimen cards, so a screen designed in Claude Design is built from the components the product actually has.

**The values were extracted, not transcribed.** The dev server was run and every component was read out of the live DOM with `getComputedStyle` at the realized desktop tier (1240px grid, first row 3 × 397px, following rows 4 × 292px). Writing the specimens from `design.md` alone was rejected: that is how the previous harness drifted, and a specimen that is subtly wrong propagates into every screen generated from it.

### Scope boundary — why only the catalog

Only the four card states and their parts are in this step. The GNB, the mobile menu, the test flow, blog detail, history and the consent banner are **deliberately excluded**: they still render the legacy theme, so extracting them would enshrine a look no one designed. They enter the system in step 3, when they are actually designed.

### What the extraction confirmed

The product and the tokens agree almost everywhere. Card surface, hairline border, 16px radius, resting shadow, the 16px padding on the trigger, the 8px rhythm between thumbnail, title and subtitle, the 8px tags gap and row gap, the thumbnail's `16 / 6` ratio and 12px radius, subtitle at 15/400/1.45 in `--ink-body`, tag chips at 13/500/1.35 on `--tag-bg` with a 5px radius, 4px 9px padding, no border, nowrap and ellipsis — all exact.

The expanded card matches in full: white surface, 16px radius, the sage edge drawn as a `0 0 0 1px` ring, 16px body padding with a 10px stack gap, context label at 14/500/1.4 in `--muted-aa`, question at 21/600/1.3 with `-0.01em` in `--ink`, choices in a grid with an 8px gap, each choice white with a 1px `--hairline-strong` edge, 12px radius, `12px 14px` padding, a 12px gap and top alignment, label at 15/400/1.45 in `--ink-soft` wrapping `keep-all` / `anywhere`, a decorative `aria-hidden` arrow at 15px in `--muted`, and a meta row at 13/500 in `--muted-aa` with separators at 55% of that colour. The blog hover is `--sage` plus the soft glow over 140ms, and `Read more →` is 13px in `#6b6b76` with a 6px gap, `aria-hidden`, no underline. The unavailable card is `--surface-soft` with a 0.72 thumbnail and the darker tag fill, its title and subtitle at full opacity.

Focus was verified live: tabbing into an expanded card puts a **2px `--sage` outline at a 2px offset** on the visible expanded surface, exactly as `design.md` §6.9 requires.

### D-05 — the drift the extraction found

Four things do not match, and all four are the legacy global theme showing through. They are recorded in `preview/catalog-drift.html` rather than baked into the stylesheet, which follows the tokens.

| What | Product renders | Tokens say |
|:---|:---|:---|
| Card title — test, unavailable | `#161A20`, the legacy `--ink` | `#1A1A1F` |
| Card title — blog | `#0F1218`, the legacy `--link-ink`, because the whole card is an anchor | `#1A1A1F` |
| Thumbnail placeholder | `rgba(22,26,32,.05)`, the legacy `--chip-bg`, a cool tint | a warm neutral |
| Typeface | Avenir Next → Noto Sans KR → Segoe UI | Pretendard Variable (D-02) |

Two of these are worth more than their size suggests. **The blog title and the test title are different colours in the same grid**, which no design decided — it is a side effect of Wave 7 making the blog card a whole-card link. And every typographic judgement made on this catalog so far was made in a typeface the product does not load, so sizes, weights and line-heights deserve a re-read once Pretendard is in place. All four resolve in the theme cut.

### Files added

| Path | Pushed |
|:---|:---|
| `docs/design/ds/catalog-components.css` | yes |
| `docs/design/ds/preview/card-test.html` | yes |
| `docs/design/ds/preview/card-expanded.html` | yes |
| `docs/design/ds/preview/card-blog.html` | yes |
| `docs/design/ds/preview/card-unavailable.html` | yes |
| `docs/design/ds/preview/comp-tag-chip.html` | yes |
| `docs/design/ds/preview/comp-choice.html` | yes |
| `docs/design/ds/preview/comp-meta-row.html` | yes |
| `docs/design/ds/preview/catalog-drift.html` | yes |

`colors_and_type.css` gains one token, `--blog-readmore-ink` (`#6b6b76`, 5.26:1 on white), and `README.md` and `SYNC.md` gain the new file in their indexes.

### Files not modified

No file under `src/`, `tests/`, `scripts/`, or `public/`. The dev server was run from the primary checkout for reading only; it writes nothing tracked.

### Validation

The basic gates were not run, for the same reason as step 1: every changed path is under `docs/`, and no file the gates read was touched. `git diff --stat` is the evidence. Gates return at step 4.

Verified by measurement instead:

- **The specimens reproduce the product.** Choice hover renders `--sage` over `#E8F0EC`, and the meta separator resolves to exactly the value measured in the product. Card surface, border, radius and shadow match the extraction.
- **All eight cards render, fit their declared viewports, and none overflows horizontally.** Heights at 700px: card-test 442, card-expanded 429, card-blog 488, card-unavailable 438, comp-tag-chip 364, comp-choice 459, comp-meta-row 310, catalog-drift 585. Every `@dsCard` viewport was corrected to match; all eight had been wrong.
- **One specimen bug was caught by rendering and fixed.** The blog card is an anchor, so its title and subtitle came out underlined and in a link colour — the opposite of the rule the card exists to state. `.vt-card` now clears `color` and `text-decoration`, and both were re-verified as `none` / `#1A1A1F`.
- **Tag rows do not wrap** in any of the three chip specimens.

### Decisions needing the user

None. Step 2 opens the motion pass, where M-01 is decided.
