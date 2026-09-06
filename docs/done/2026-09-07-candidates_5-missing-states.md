# Candidate 5 — nine card states the implementation supports have no specimen, and one of them hides a sixth legacy leak

**Date:** 2026-09-07 · **Tier:** 2 — run after the motion pass, before the design pass · **Task mode:** Implementation (documentation surface only) · **공수** M · **효과** 중 · **심각도** 중

---

## Shared frame

**Program.** The 2026-09-06 design-system rebaseline (`BQ-38`) replaces waves 13–17. The repository owns one token definition under `docs/design/ds/` and pushes it one-way to **VIVE Design System v2** (`cd630eec-25e4-4613-a58f-c671c80297ca`). Sync procedure: `docs/design/ds/SYNC.md`.

**Priorities, in order.** 1 — preserve the implemented logic with no side effects. 2 — take design and interaction quality as high as it will go.

**Approved decisions (`BQ-38`).** **A** tokens carry catalog values under VIVE names · **B** `req-landing.md` §8 frozen · **C** catalog card tokens and patterns frozen · **D** from `825385f6` take only card components and thumbnail SVGs.

**Invariant boundaries.** `src/**` is untouched until the theme cut — **this document changes no runtime file**. No baseline regeneration (`BQ-07`).

**Where this sits.** step 1 `c5fc624` → step 1b `e8a453e` → tier 1 `a3a1c3e` → motion pass → **this document** → design pass.

**Do not re-run.** Tier 1 already added the answer choice's own `:focus-visible` ring to `catalog-components.css` and a Focus row to `preview/comp-choice.html`. That state is done; the other nine are not.

---

## The finding

The specimens show four resting card states and two hover states. The implementation supports at least nine more, and a designer working from the bundle has no way to know they exist — several of them are the states where the card's appearance is most likely to be got wrong.

| State | Where it lives in the product |
|:---|:---|
| Normal face in `expandedTitleOnly` presentation — title only, no thumbnail, subtitle or tags, title at the content inset | `landing-grid-card.tsx:293` (the type), `:604`, `:1062` |
| Desktop motion enter / exit / steady / cleanup-pending | `landing-grid-card.module.css:176-218`, roles assigned at `landing-grid-card.tsx:998-1002` |
| Mobile `OPENING` / `OPEN` / `CLOSING` | `landing-grid-card.tsx:959-961`; module CSS `:235-294` |
| Reduced motion — shell scale forced to 1, opacity cross-fade replaces the transform | module CSS `:296-352`, `:498-503` |
| Blog CTA reveal on `:focus-within`, not only `:hover` | module CSS `:134-141` |
| Expanded-surface focus ring, distinct from the card's own ring | module CSS `:144-151` |
| `inert` / hover-locked / interaction-blocked | `landing-grid-card.tsx:518`, `:1097`, `:1099`, `:1134` |
| Empty tags row — slot keeps one line, zero chips | `req-landing.md:325`; product `min-h-7` at `landing-grid-card.tsx:218` |
| Real thumbnail asset vs generated placeholder | `landing-grid-card.tsx:166-187` |

### 5.1 — A sixth legacy leak, found while checking this list

The desktop expanded overlay's focus state applies a **legacy global token**:

```
src/features/landing/grid/landing-grid-card.module.css:144-146
.root.desktopOverlayLayer:has(:focus-visible) {
  box-shadow: var(--card-shadow);
}
```

`--card-shadow` is `0 14px 30px rgb(11 15 22 / 10%)` in `src/app/globals.css` — the cool-tinted legacy elevation, not `--shadow-expanded`. So focusing into an expanded card swaps its warm, ink-tinted lift for a cool one.

The step-1b extraction missed it because it read the resting and hover states only. This is exactly insight I-1 in `candidates_0`: what you did not extract is silently assumed correct. **Add it to `preview/catalog-drift.html` as a fifth D-05 row**, and note in `BQ-38`'s notes that D-05 now stands at five items rather than four.

### 5.2 — A token name that differs by hyphenation between the two layers

The product's scoped token is `--blog-read-more-ink` (`landing-grid-card.module.css`, consumed at `.blogReadMore`). The design system's is `--blog-readmore-ink` (`colors_and_type.css`). Same value, `#6b6b76`; different names. Nothing breaks today because neither consumes the other, but any grep-based comparison between the layers will silently miss this pair — which is a direct input to `candidates_10`.

Recommended: rename the design-system token to `--blog-read-more-ink` to match the product, since the product's name is the one that will survive the theme cut. It is used in exactly one rule and one preview.

### 5.3 — The motion states belong after the motion pass, and that is why this document sits here

Four of the nine — desktop enter/exit/steady, the mobile lifecycle, reduced motion, and the choice's transition behaviour — are motion states. Their appearance is settled by the motion pass (step 2), including the open `M-01` easing question. Specifying them before that pass would mean specifying them twice. Tier 2 running immediately after the motion pass is what makes this item cheap.

---

## What to change

### 1. Add `preview/card-states.html`

A matrix card, group `Catalog`, showing the **static appearance** of each state that has one, side by side at 292px:

- collapsed Normal
- `expandedTitleOnly` — the same card with only its title, at the content inset
- empty tags row — a card with zero chips, showing the row still holds one line's height
- interaction-blocked / inert — whatever the extraction shows this looks like
- real thumbnail asset (`qmbti`) beside the generated placeholder, so the difference is visible

Caption each with the condition that produces it. A state whose only difference is behavioural, not visual, gets a line of prose rather than a tile — say so explicitly rather than inventing a look for it.

### 2. Add the blog CTA reveal to `catalog-components.css`

The specimen currently shows the CTA by putting it in the markup of the hover card and omitting it from the rest card. That is a stand-in, not the mechanism. Add the real one:

```css
.vt-readmore { display: none; }
.vt-card--blog:hover .vt-readmore,
.vt-card--blog:focus-within .vt-readmore,
.vt-card--blog.is-hover .vt-readmore { display: inline-flex; }
```

and note in the comment that mobile shows it always — which `candidates_4`'s mobile card will then need a modifier for.

### 3. Add the expanded-surface focus ring

Distinct from `.vt-card:has(:focus-visible)`. Both rings exist in the product and they land on different boxes; the bundle currently shows one and the choice ring, but not this one.

### 4. Record the two new findings

The legacy `--card-shadow` leak as a fifth row in `catalog-drift.html`, and the hyphenation mismatch either fixed or recorded.

### 5. After the motion pass, add the motion states

Once `M-01` is decided, add a card showing enter / steady / exit and the reduced-motion substitution. If the motion pass produces its own interactive artboards, that card may be a link to them rather than a duplicate — decide then.

---

## Verification

- Every tile in `card-states.html` is reachable from a named condition in the product; no tile is invented. Cross-check each against the file:line in the table above.
- The blog rest specimen still shows no CTA and the hover specimen still shows one — the mechanism change must not alter either rendering.
- `catalog-drift.html` has five rows, and its lede sentence's count matches.
- Render, measure, look.
- `git diff --stat` shows only `docs/design/ds/**` and `docs/plans/**`.
- Push and register the new card; re-register `catalog-drift.html` if its viewport changes.

---

## Decisions the user may want to make

- **Whether the hyphenation mismatch is fixed now or left for the theme cut.** Fixing it now is one rule and one preview; leaving it means the drift gate in `candidates_10` needs a special case.
- **Whether `card-states.html` is one card or several.** One matrix reads better but grows tall; the alternative is folding each state into the card it belongs to.

---

## Execution prompt

> Read `docs/plans/2026-09-07-candidates_0-overview.md`, then `docs/plans/2026-09-07-candidates_5-missing-states.md`, and implement it. Work in an isolated clone; touch nothing under `src/`. Verify each state tile against the file:line given in the finding table before drawing it — do not invent an appearance for a state you cannot observe. Push to `cd630eec-25e4-4613-a58f-c671c80297ca` per `docs/design/ds/SYNC.md`, register the new card, then commit and land on `main`.
