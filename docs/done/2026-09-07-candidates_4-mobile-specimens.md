# Candidate 4 — the mobile card appears at no width, and the entire mobile expanded structure is absent

**Date:** 2026-09-07 · **Tier:** 2 — run after the motion pass, before the design pass · **Task mode:** Implementation (documentation surface only; requires a new extraction pass) · **공수** M · **효과** 상 · **심각도** 중

---

## Shared frame

**Program.** The 2026-09-06 design-system rebaseline (`BQ-38`) replaces waves 13–17. The repository owns one token definition under `docs/design/ds/` and pushes it one-way to **VIVE Design System v2** (`cd630eec-25e4-4613-a58f-c671c80297ca`). Sync procedure: `docs/design/ds/SYNC.md`.

**Priorities, in order.** 1 — preserve the implemented logic with no side effects. 2 — take design and interaction quality as high as it will go.

**Approved decisions (`BQ-38`).** **A** tokens carry catalog values under VIVE names · **B** `req-landing.md` §8 frozen · **C** catalog card tokens and patterns frozen · **D** from `825385f6` take only card components and thumbnail SVGs.

**Invariant boundaries.** `src/**` is untouched until the theme cut — **this document changes no runtime file**. No baseline regeneration (`BQ-07`).

**Where this sits.** step 1 `c5fc624` → step 1b `e8a453e` → tier 1 `a3a1c3e` → motion pass → **this document** → design pass.

**Depends on `candidates_2`.** The mobile card needs the unclamped title and subtitle bases introduced there. Run that first, or do both in one pass.

---

## The finding

Every specimen in the bundle is 397px or 292px wide — the two desktop card widths. `design.md` §7.7 gives the realized reference widths as "desktop ~1280px container, tablet ~920px, mobile ~390px". **The mobile card has no specimen at any width**, and the mobile expanded state — a full-bleed sheet with a sticky header, a close button and a scrim — has no representation at all.

Worse than absent: `.vt-expanded` in `catalog-components.css` carries `border-radius: var(--radius-lg)`, and `design.md` §7.8 requires the mobile expanded surface to have **no left or right radius** — "it reads as chrome, not a floating card". The one expanded specimen in the bundle therefore states the opposite of the mobile rule while showing no mobile case.

Mobile is not a minor band here. Wave 12 was entirely about the mobile browse card; `req-landing.md` §8.5 is the longest single behaviour section in the contract; and the mobile title and subtitle rules are the ones `candidates_2` shows the specimen currently inverts.

### What exists in the product to extract

The mobile structures are implemented, which means this is an extraction job and not an authoring job:

```
src/features/landing/grid/landing-catalog-grid.tsx:30    'landing-grid-mobile-backdrop fixed inset-0 z-10 bg-[var(--overlay-scrim-medium)] touch-pan-y [transition:opacity…]'
src/features/landing/grid/landing-grid-card.tsx:271      'landing-grid-card-mobile-close relative inline-flex min-h-10 min-w-10 shrink-0 basis-auto items-center justify-center…'
src/features/landing/grid/landing-grid-card.tsx:279      'landing-grid-card-mobile-header sticky top-0 z-[4] flex items-start justify-between gap-3 bg-[var(--expanded-card-s…]'
src/features/landing/grid/landing-grid-card.tsx:282      'landing-grid-card-mobile-body grid min-w-0 gap-[10px]'
src/features/landing/grid/landing-grid-card.tsx:1040     styles.transientShell
src/features/landing/grid/landing-grid-card.tsx:1252     LANDING_GRID_CARD_MOBILE_TRANSIENT_PANEL_CLASSNAME
src/features/landing/grid/landing-grid-card.tsx:1046     isMobileExpanded ? '[min-height:0] [padding:0]' : '[min-height:100%] [padding:16px]'
```

Note the last line: the mobile expanded card **drops the 16px padding entirely** and moves it inside, which the desktop specimen's single `--card-pad` rule does not express.

### One caveat that must be carried into the specimen

Wave 13 — "Mobile expanded shape/position" — was never implemented, and `BQ-38` superseded it (`docs/wave-roadmap.md`, status `⤳ 대체`). So the mobile expanded surface in the product today is the realized transient-shell implementation, **not** the finished shape `design.md` §7.8 describes. The two differ, and the specimen must say which it is showing.

`design.md` §7.8 specifies: full viewport width, no side margin, top edge flush to the GNB bottom, a scrim dimming the grid beneath, a visible close button top right, no left or right radius, and a `--sage` bottom edge anchoring it. `req-landing.md` §8.5 adds the behaviour: lifecycle `OPENING → OPEN → CLOSING → NORMAL`, header structure `title + X`, X sticky at the header's right end and visible from the start of OPENING until just before CLOSING ends, close only via the X or a backdrop tap, transition `220–360ms` with `280ms` as the base and no overshoot, layer order `GNB > Expanded > backdrop > other cards`, and the backdrop never covering the expanded card.

**Do not design the gap closed.** Decision C freezes the catalog's patterns; anything `design.md` §7.8 requires and the product does not do is a finding for the design pass, recorded on the card, not a change made here.

---

## What to change

### 1. Extract at mobile width first

Run the dev server, set the viewport to 390 × 844, and **reload** — the tier is decided at load and a resize alone leaves the card reporting `data-card-viewport-tier="mobile"` incorrectly or not at all. Confirm `data-card-viewport-tier` reads `mobile` and the grid is single column before reading anything.

Read out, with `getComputedStyle`, at minimum: the card's outer width and padding; the title and subtitle computed `-webkit-line-clamp`, `overflow` and `text-overflow` (expect no clamp — that is the check on `candidates_2`); the tags row and its chips; the gutter between cards; then tap a test card and read the transient shell, the panel, the sticky header, the close button and the backdrop.

Record every value in the plan document you write for the extraction, the way `2026-09-06-design-system-rebaseline-step1b.md` did, including anything that turns out to differ from `design.md` §7.8.

### 2. Add two preview cards

- **`preview/card-mobile.html`** — the browse card at its realized mobile width (roughly 358px of card inside a 390px frame, given the 16px page padding), using the unclamped title and subtitle bases from `candidates_2`, with a full-length title and a three-line subtitle so the difference from the desktop card is the subject. Show two cards stacked at the 15px mobile gutter.
- **`preview/card-mobile-expanded.html`** — the full-bleed sheet: no side margin, no left or right radius, the sticky header with title and close button, the scrim behind, and the sage bottom edge if the extraction finds it. Caption it with the layer order and the close paths, and mark plainly which parts are realized and which are `design.md` §7.8 intent that Wave 13 never delivered.

### 3. Add the mobile modifiers to `catalog-components.css`

`.vt-expanded--mobile` (radius 0 on the sides, full width, padding moved inside), `.vt-mobile-header`, `.vt-mobile-close` (44×44 minimum per `design.md` §4.10, realized as `min-h-10 min-w-10` — record the discrepancy if 40 ≠ 44 survives the extraction), `.vt-scrim`. Keep the desktop `.vt-expanded` unchanged.

### 4. Correct the desktop expanded caption

`card-expanded.html` should say it is the desktop case and that mobile drops the side radius, so the bundle stops implying one expanded shape.

---

## Verification

- The extraction's numbers are recorded in a dated plan document before any specimen is written. No value reaches a specimen without a measurement behind it.
- Render both new cards at their declared viewports and confirm: the mobile title is not clamped, the mobile subtitle is not clamped, the mobile expanded surface has `border-radius` `0` on its left and right, and the scrim sits behind the sheet rather than over it.
- Confirm the close button's hit box is at least 40×40 and record whether it meets the 44×44 the foundations require.
- `git diff --stat` shows only `docs/design/ds/**` and `docs/plans/**`.
- Push and register both cards.

---

## Decisions the user may want to make

- **Whether the mobile expanded specimen shows the realized state or the §7.8 target.** Recommended: the realized state, with the §7.8 deltas listed on the card. The design pass then has both.
- **Whether the close button's 40px should be raised to 44px.** This is a real accessibility gap against `design.md` §4.10 if the extraction confirms it, but changing it is a runtime change and therefore step 5, not here.

---

## Execution prompt

> Read `docs/plans/2026-09-07-candidates_0-overview.md`, then `docs/plans/2026-09-07-candidates_4-mobile-specimens.md`, and implement it. Start by running the dev server and extracting the mobile card and mobile expanded state at 390×844 with a reload after the resize; record every measured value in a new dated plan document before writing any specimen. Work in an isolated clone; touch nothing under `src/`. Push to `cd630eec-25e4-4613-a58f-c671c80297ca` per `docs/design/ds/SYNC.md`, register the new cards, then commit and land on `main`.
