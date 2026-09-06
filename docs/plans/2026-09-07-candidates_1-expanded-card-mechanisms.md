# Candidate 1 — the expanded card's three geometry mechanisms are absent from the specimen

**Date:** 2026-09-07 · **Tier:** 2 — run after the motion pass, before the design pass · **Task mode:** Implementation (documentation surface only) · **공수** M · **효과** 상 · **심각도** 높음

---

## Shared frame

**Program.** The 2026-09-06 design-system rebaseline (`BQ-38`) replaces waves 13–17. The repository owns one token definition under `docs/design/ds/` and pushes it one-way to the Claude Design project **VIVE Design System v2** (`cd630eec-25e4-4613-a58f-c671c80297ca`). Sync procedure and operational traps: `docs/design/ds/SYNC.md`.

**Priorities, in order.** 1 — preserve the implemented logic with no side effects. 2 — take design and interaction quality as high as it will go.

**Approved decisions (`BQ-38`).** **A** tokens carry catalog values under VIVE names · **B** `req-landing.md` §8 frozen, other surfaces align to its realized values, §8 amendment decided after the motion pass · **C** catalog card tokens and patterns frozen, improvements raised as separate artboards · **D** from `825385f6` take only card components and thumbnail SVGs.

**Invariant boundaries.** `src/**` is untouched until the theme cut (step 4) — **this document changes no runtime file**. No baseline regeneration (`BQ-07`). `cd630eec` is the only push target.

**Where this sits.** step 1 `c5fc624` → step 1b `e8a453e` → tier 1 `a3a1c3e` → **motion pass** → **this document** → design pass → theme cut.

**Prerequisite check.** `git log --oneline` shows `a3a1c3e`. `docs/design/ds/catalog-components.css` contains the header paragraph beginning "THIS IS A SPECIMEN STYLESHEET". If it does not, tier 1 has not landed and this document is premature.

**Do not re-run.** Tier 1 already restored `--shadow-expanded` on `.vt-expanded`, added `flex: 1` to `.vt-choice__text`, added the arrow's hover colour change, and added the choice's own focus ring. None of that is in scope here.

---

## The finding

The expanded card is the product's signature surface and the one a designer will spend the most time on. Three of the mechanisms that give it its actual size and rhythm have no representation in the specimen, so **anyone designing against it is designing at the wrong scale, against a rhythm that never occurs, on a card with no height relationship to the card it replaced**.

### 1.1 — The expanded shell scale is missing, so every dimension is under-rendered

`docs/req-landing.md` §8.4 fixes the content shell at `1.04` on every non-reduced-motion path, and gives the outer desired final scale as `1.10` on Desktop Wide / Medium / two-column and `1.04` on Tablet. The constants are in code:

```
src/features/landing/grid/layout-plan.ts:10   export const DESKTOP_EXPANDED_DESIRED_FINAL_SCALE = 1.1;
src/features/landing/grid/layout-plan.ts:11   export const TABLET_EXPANDED_DESIRED_FINAL_SCALE = 1.04;
src/features/landing/grid/layout-plan.ts:139      frameInlineScale: roundScale(resolvedFinalScale / baseShellScale)
```

and applied as a uniform `transform: scale(var(--landing-card-shell-scale))` on the shell (`landing-grid-card.tsx:265`) over a frame whose width is driven by `frameInlineScale` (`:263`). §8.4 also fixes the resolution arithmetic: `max_surface_scale = 1 + available_stage_outset_px / normal_root_width_px`, `resolved_final_scale = min(desired_final_scale, max_surface_scale)`, `frame_inline_scale = resolved_final_scale / 1.04`, and `1.00` under reduced motion.

The specimen renders the expanded card at `width: 397px` — the **resting** width, scale 1.0 (`docs/design/ds/preview/card-expanded.html`, `.spec { width: 397px }`).

Consequences, both measurable:

- The question is `600 21px/1.3` in the token file. On screen in the product it is `21 × 1.04 ≈ 21.8` CSS px. In the specimen it is 21px. Every type judgement made against this card is made about 4% small, and the same 4% applies to the choice text, the context label and the meta row.
- The card's outer width is `397 × 1.10 ≈ 437px` in the product against `397px` in the specimen — a 40px difference in line length, which is exactly the dimension that decides how the question and the choices wrap.

### 1.2 — The height floor is missing

`design.md` §7.3 states the invariant: "the expanded card must be **at least the resting card height**. The realized mechanism measures the resting card's height in **explicit pixels** and applies it as a floor … **Do not** express this invariant as `min-height: 100%`."

The product does exactly that — an inline pixel `minHeight` written from a measured map:

```
src/features/landing/grid/landing-grid-card.tsx:837          minHeight: `${floorPx}px`
```

with `floorPx` derived as `expandedRestingFloorPx / resolvedShellScale` and the map fed from `landing-catalog-grid.tsx`.

`.vt-expanded__body` in `catalog-components.css` has no `min-height` of any kind. The specimen's expanded card is exactly as tall as its content, which is the one thing the product guarantees it is not. `card-expanded.html` states the invariant in a caption; a caption is not a specimen (see insight I-2 in `candidates_0`).

### 1.3 — The flex spacer is flattened into a uniform gap, and the flattened value is wrong in both direction and magnitude

The product's expanded body is three nested boxes:

```
src/features/landing/grid/landing-grid-card.tsx:255   floor body   flex min-w-0 flex-1 flex-col
src/features/landing/grid/landing-grid-card.tsx:256   floor group  flex min-w-0 flex-col gap-[10px]
src/features/landing/grid/landing-grid-card.tsx:257   floor spacer min-h-[14px] flex-1
```

The group holds context, question and choices at a 10px rhythm; the spacer sits between the choice block and the meta row, has a **14px minimum**, and takes `flex-1` so it absorbs all surplus height created by the floor. `design.md` §7.3: "surplus height is absorbed **only** between the last choice and the meta row (a single flex spacer)."

The specimen has one flat box:

```
docs/design/ds/catalog-components.css   .vt-expanded__body { display: flex; flex-direction: column; gap: 10px; padding: var(--card-pad); }
```

so the choices→meta distance reads as 10px where the product's floor is 14px and its typical value is larger — and the surplus, which is the whole point of the mechanism, has nowhere to go.

---

## What to change

All changes are in `docs/design/ds/`. No runtime file is touched.

**1. Represent the scale honestly rather than reproducing the transform.** A specimen has no stage to bleed into, so applying a live `transform: scale()` would clip against the card's own viewport and mislead in a different direction. Render the expanded specimen **at its resolved on-screen geometry** instead: outer width `437px` (`397 × 1.10`, the Desktop Wide resolved case), with the body's type and spacing at `1.04` of their token values. Add a short caption naming the three numbers — base shell `1.04`, desktop desired final `1.10`, tablet desired final `1.04` — and stating that reduced motion resolves to `1.00`.

   Add a second, smaller frame in the same card showing the **Tablet** case at `1.04` so the two bands are visible side by side. This is the cheapest way to make "the expanded card is bigger than the card it replaced" a fact a designer can see rather than a sentence they have to trust.

   Do **not** add a `--shell-scale` token. The scale is behaviour governed by `req-landing.md` §8.4, frozen under decision B; putting it in the token file would invite someone to change it.

**2. Give `.vt-expanded__body` a demonstrated floor.** Restructure it to mirror the product's three boxes:

   - `.vt-expanded__body` — `display: flex; flex-direction: column; flex: 1; padding: var(--card-pad)`
   - `.vt-expanded__group` — `display: flex; flex-direction: column; gap: 10px`
   - `.vt-expanded__spacer` — `min-height: 14px; flex: 1`
   - the meta row stays last, outside the group

   Then set an explicit pixel `min-height` on the specimen's `.vt-expanded` in `card-expanded.html` — not in the stylesheet — equal to the height of a resting card rendered beside it, and put the two side by side in the card so the relationship is the subject. Annotate that the product's value is measured per card and written inline, and that `min-height: 100%` is explicitly banned.

**3. Update the captions** in `card-expanded.html` so nothing claims a mechanism the markup does not now show, and remove the sentence that states the height invariant in prose only — it is replaced by the demonstration.

**4. Re-measure and re-declare the viewport.** The card grows; its `@dsCard viewport` must be re-measured at the declared width and updated. See `candidates_6` for why the measurement should be taken with the real typeface, and prefer running that document first if both are being done in the same pass.

**5. Push and re-register.** `finalize_plan` → `write_files` → `register_assets` for `preview/card-expanded.html` with its new subtitle and viewport. `_ds_manifest.json` will still be stale afterwards; that is expected (insight I-4).

---

## Verification

- Render `card-expanded.html` at the declared width and read back the on-screen box: the outer frame is `437px`, the question's computed `font-size` is `21.84px` (or the specimen states plainly that it is showing `21 × 1.04`), and the choices→meta distance is at least `14px`.
- Confirm `min-height: 100%` appears nowhere in `catalog-components.css` or in any preview.
- Confirm the resting card rendered beside the expanded one is the shorter of the two and that the caption names the measured-floor mechanism.
- Look at the render, do not only measure it (insight I-3).
- No gate is applicable: every changed path is under `docs/`. Confirm with `git diff --stat` that nothing outside `docs/design/ds/` and `docs/plans/` moved.

---

## Decisions the user may want to make

- **Whether to show Desktop Wide, Tablet, or both.** The recommendation above is both, because the 1.10 / 1.04 split is invisible otherwise. One frame is cheaper and loses that.
- **Whether the expanded specimen should show a Blog card.** It should not — blog cards have no expanded state (`BQ-02`, Wave 7) — but the question comes up every time someone reads the card list.

---

## Execution prompt

> Read `docs/plans/2026-09-07-candidates_0-overview.md`, then `docs/plans/2026-09-07-candidates_1-expanded-card-mechanisms.md`, and implement it. Work in an isolated clone. Touch nothing under `src/`. When the specimen changes are rendered and verified, push the changed files to the Claude Design project `cd630eec-25e4-4613-a58f-c671c80297ca` following `docs/design/ds/SYNC.md`, re-register the affected card, then commit and land on `main`.
