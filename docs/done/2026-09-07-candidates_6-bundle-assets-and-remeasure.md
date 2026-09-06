# Candidate 6 — the repo holds one file of a multi-file system, so local rendering is not design-system rendering

**Date:** 2026-09-07 · **Tier:** 2 — run after the motion pass, before the design pass · **Task mode:** Implementation (documentation surface only) · **공수** S · **효과** 중 · **심각도** 중

---

## Shared frame

**Program.** The 2026-09-06 design-system rebaseline (`BQ-38`) replaces waves 13–17. The repository owns one token definition under `docs/design/ds/` and pushes it one-way to **VIVE Design System v2** (`cd630eec-25e4-4613-a58f-c671c80297ca`). Sync procedure: `docs/design/ds/SYNC.md`.

**Priorities, in order.** 1 — preserve the implemented logic with no side effects. 2 — take design and interaction quality as high as it will go.

**Approved decisions (`BQ-38`).** **A** tokens carry catalog values under VIVE names · **B** `req-landing.md` §8 frozen · **C** catalog card tokens and patterns frozen · **D** from the older design system `825385f6` take only the card components and thumbnail SVGs; freeze the rest as reference.

**Invariant boundaries.** `src/**` is untouched until the theme cut — **this document changes no runtime file**. No baseline regeneration (`BQ-07`).

**Where this sits.** step 1 `c5fc624` → step 1b `e8a453e` → tier 1 `a3a1c3e` → motion pass → **this document** → design pass.

**Run this before `candidates_1` and `candidates_4` if all three are done in one pass.** Both of those re-measure viewports, and measuring twice is waste.

---

## The finding

### 6.1 — Every viewport in the bundle was measured in the wrong typeface

`colors_and_type.css:34-40` declares:

```css
@font-face {
  font-family: 'Pretendard Variable';
  src: url('./fonts/PretendardVariable.woff2') format('woff2-variations');
}
```

There is no `fonts/` directory in `docs/design/ds/`. The full inventory is `README.md`, `SKILL.md`, `SYNC.md`, `colors_and_type.css`, `catalog-components.css`, five `_provenance/` files and eleven `preview/*.html`. On the Claude Design side the font exists and loads; locally the URL resolves to nothing and the stack falls through to the system fallback.

So **every `@dsCard viewport` in the bundle was measured against a substitute typeface**, both in step 1b and again in the tier-1 re-measure. Line boxes are safe — the type roles set explicit line-heights, so a line is the same height in any face — but *wrapping* is not, and the prose blocks on the specimen cards have no clamp. One extra wrapped line is roughly 19px at the caption's 13px/1.45. The cards' declared heights carry single-digit headroom. A card that gains a line when the real font loads overflows its declared viewport in the pane, and nothing will report it.

This is insight I-7 in `candidates_0`, and it is the reason `SYNC.md`'s note that the bundle is "not mirrored yet" is more consequential than it reads.

### 6.2 — Decision D is unexecuted

`BQ-38` decision **D** approves taking the card components and thumbnail SVGs from the older design system `825385f6` ("Vive Design System"). Nothing was taken. Its `assets/` holds seven thumbnails and an arrow that the current system does not have:

```
assets/thumb-blog.svg   thumb-comingsoon.svg   thumb-decision.svg   thumb-personality.svg
assets/thumb-relationships.svg   thumb-values.svg   thumb-work.svg   answer-arrow.svg
```

The current bundle's specimens use inline SVG drawn by hand during step 1b. That is a third source of catalog artwork, alongside the product's one real asset and its generated fallback.

### 6.3 — The product has one thumbnail for eight cards

`public/landing-card-media/` contains exactly one file: `qmbti/thumbnail.svg`. The other seven catalog cards render `createThumbnailFallbackDataUri()` (`landing-grid-card.tsx:166-187`), a generated `#FBFAF7 → #C9DBD1` gradient with two soft circles — the same wash as the one real asset.

`design.md` §9 already lists "Real catalog thumbnail imagery" under *recommended missing resources*. The design pass will have to decide whether the catalog gets real artwork; it should make that decision knowing that today there is effectively none, and that a set of seven candidates already exists in `825385f6`.

---

## What to change

### 1. Mirror the typeface into the bundle

Add `docs/design/ds/fonts/PretendardVariable.woff2`.

It cannot be pulled from the design system with `DesignSync` — `get_file` caps at 256 KiB and the variable face is roughly 1.3 MB. Take it from the upstream OFL 1.1 release (`github.com/orioncactus/pretendard`), and record the exact release tag and file hash in `SYNC.md` so the two sides can be compared later.

Then update `SYNC.md`'s "not mirrored yet" paragraph: `fonts/` is now mirrored; `vive-components.css`, `assets/`, `ui_kits/` and `uploads/` still are not, and the reason is that nothing in the catalog work consumes them.

### 2. Re-measure all eleven cards with the real font and re-declare every viewport

Serve the bundle, confirm the font actually loads (`document.fonts.check('16px "Pretendard Variable"')` returns true — a 404'd `@font-face` fails silently otherwise), then measure each card at its declared width and update the `@dsCard` viewport. **Give each card at least 24px of headroom** rather than the current single digits, so that a future caption edit of one line does not silently overflow.

Re-register every card whose viewport changes; the pane reads the registered value, not the marker, until the app recompiles (insight I-4).

### 3. Import the seven thumbnails from `825385f6` under decision D

Read them with `DesignSync` `get_file` from `825385f6-8305-41d1-a338-eb3c8f1b41e5`, add them to `docs/design/ds/assets/`, and push them to `cd630eec`.

**Do not put them in the card specimens.** The specimens show what the product renders, and the product renders the generated gradient. Add them instead as a single `preview/brand-thumbnails.html` card labelled plainly as *available artwork, not yet realized in the product*, so the design pass has them as material and nobody mistakes them for the current state.

Replace the hand-drawn inline SVGs in `card-test.html`, `card-blog.html` and `card-unavailable.html` with the product's actual generated gradient — the same two-stop wash and circle geometry `createThumbnailFallbackDataUri()` produces — so the card specimens stop showing three different invented illustrations.

### 4. Record the one-asset-for-eight-cards fact

One line in `README.md`'s findings table or on the thumbnails card. It is a design-pass input, not a defect.

---

## Verification

- `document.fonts.check('16px "Pretendard Variable"')` is `true` in the local render before any measurement is taken. If it is false the whole re-measure is void.
- Every card's measured height plus 24px is at most its declared viewport height, and no card overflows horizontally at its declared width.
- The three card specimens' thumbnails are visually identical to the product's generated fallback, compared side by side against a running dev server at the same width.
- `docs/design/ds/assets/` contains exactly the eight files taken from `825385f6`, unmodified.
- `git diff --stat` shows only `docs/design/ds/**` and `docs/plans/**`. Note the binary font will show as a large addition; that is expected.
- Push everything and re-register every card whose viewport moved.

---

## Decisions the user may want to make

- **Whether a ~1.3 MB binary belongs in the repository.** The alternative is to leave the bundle font-less and take all measurements in the Claude Design pane instead, which removes the local render loop that has already caught two specimen bugs. Recommended: mirror it. It is an OFL-licensed design-system asset and the bundle exists precisely so both sides render the same.
- **Whether to subset the font.** A Latin+Korean subset would cut the size substantially and does not change the metrics of included glyphs, but it adds a build step and a way for the two sides to diverge. Recommended: ship the full face.
- **Whether the seven imported thumbnails should be shown at all before the design pass has adopted them.** Recommended yes, clearly labelled — decision D asked for them, and unlabelled absence is what led to hand-drawn stand-ins in the first place.

---

## Execution prompt

> Read `docs/plans/2026-09-07-candidates_0-overview.md`, then `docs/plans/2026-09-07-candidates_6-bundle-assets-and-remeasure.md`, and implement it. Work in an isolated clone; touch nothing under `src/`. Confirm the typeface actually loads before taking a single measurement. Push to `cd630eec-25e4-4613-a58f-c671c80297ca` per `docs/design/ds/SYNC.md`, re-register every card whose viewport changed, then commit and land on `main`.
