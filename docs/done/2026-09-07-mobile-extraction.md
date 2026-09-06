# Mobile extraction — 390 × 844, measured 2026-09-07

**Task mode:** Analysis Only (this document records measurements; the specimens that consume them are U4) · **Method:** `next dev`, viewport set to 390 × 844, **page reloaded after the resize** because the tier is decided at load and a resize alone leaves `data-card-viewport-tier` stale. Confirmed `data-card-viewport-tier="mobile"` and a single-column grid before reading anything. All values via `getComputedStyle` and `getBoundingClientRect` on the running product.

---

## Browse card, mobile

| | Measured |
|:---|:---|
| Viewport | 390 × 844 |
| Page side padding | 16px each side |
| Grid template | `358px` — single column |
| Gutter between cards | **15px** (`--grid-gutter-mobile`) |
| Card outer | **358 × 255.25**, left 16 |
| Card radius / surface / border / shadow | 16px · `#ffffff` · `1px solid #e6e2d8` · `0 1px 2px rgb(26 26 31 / 4%)` |
| Trigger | padding `16px`, `min-height: 100%` |
| Content box | 324 wide (`358 − 2 border − 32 padding`), `height`/`min-height: 100%` |
| Thumbnail | 324 × 121.5, radius 12px, `aspect-ratio: 16 / 6` |
| Title | `20px/26 600`, `margin-top: 8px` |
| Subtitle | `15px/21.75 400`, `margin-top: 8px` |
| Tags gap | 8px — `base 8px + comp 0px` |
| Tags row | `min-height: 28px`, `gap: 8px` |
| Page ground | `rgb(245, 247, 247)` |

**The clamp check, which is the point of the exercise.** Title: `-webkit-line-clamp: none`, `overflow: visible`, `text-overflow: clip`. Subtitle: identical. Both carry `word-break: keep-all` and `overflow-wrap: anywhere`. This is what `candidates_2` predicted and what the unclamped bases landed in U2 now express — the mobile card shows full text, and the desktop clamp is the modifier.

The mobile card is **wider than a desktop later-row card** — 358px against 292px — which is why tier can never be derived from card width.

---

## Expanded, mobile, steady `OPEN`

| | Measured |
|:---|:---|
| Card outer | **390 × 254.34**, left 0, right 390 — full viewport width |
| Card radius | **`0px`** — all four corners |
| Surface padding | `0px 16px 16px` — the top padding is dropped and the sides move inside |
| Surface | `max-height: calc(100dvh − 116px)` = 728px, `overflow: auto`, `gap: 0` |
| Header | sticky, `top: 0`, `z-index: 4`, `background: #ffffff`, padding `16px` top / `14px` bottom, `gap: 12px`, `align-items: flex-start`, `justify-content: space-between` |
| Header title | `14px/19.6 500`, `rgb(117, 117, 128)` = `--muted-aa` |
| Close button | **40 × 40**, fully round, `1px solid rgb(22 26 32 / 16%)`, fill `rgb(200 201 202 / 21%)`, glyph `×` at `rgb(15, 18, 24)`, `aria-label="Close expanded card"` |
| Body | `display: grid`, `gap: 10px`, 358 wide |
| Question | `21px/27.3` — mobile does **not** scale the type; there is no shell scale here |
| Choice | 358 × 47.75, padding `12px 14px`, radius 12px, `1px solid #d6d1c4`, white |
| Backdrop | `position: fixed`, inset 0, `rgb(4 6 10 / 64%)`, `z-index: 10`, `transition: opacity 180ms` |
| Layer order | GNB `1100` > card `20` > backdrop `10` — matches `req-landing.md` §8.5, and the backdrop never covers the card |

**A correction worth recording.** Reading `landing-grid-card.tsx:283` alone suggests the mobile expanded surface keeps a 16px radius, because `landing-grid-card-mobile-transient-shell` carries `rounded-[var(--landing-card-radius)]`. That class belongs to the **transient** shell used during `OPENING` / `CLOSING`, which is anchored at the card's own left and width. The steady `OPEN` state is a different element — `landing-grid-card-mobile-expanded` — and it is full-bleed with `border-radius: 0`. Source reading gave the wrong answer here; the running product gave the right one.

---

## `design.md` §7.8 — realized against specified

Wave 13 ("Mobile expanded shape/position") was never implemented and `BQ-38` superseded it, so this is a gap list for the design pass, not a defect list. **Decision C forbids designing it closed here.**

| §7.8 requires | Product | |
|:---|:---|:---:|
| Full viewport width, no side margin | 390px, left 0, right 390 | ✓ |
| No left/right card radius | `border-radius: 0px` | ✓ |
| A scrim dims the grid beneath | fixed, inset 0, behind the card | ✓ |
| Visible close button, top right | present, right edge of the sticky header | ✓ |
| **Top edge flush to the GNB bottom** | GNB bottom `57`, card top `338.59` — a **281.59px** gap; the card stays where it sat in the grid | ✗ |
| **A `--sage` bottom edge anchors it** | no border on the card or any ancestor — `border-width: 0px` throughout the chain | ✗ |

Two more, against other sections:

| Requirement | Product | |
|:---|:---|:---:|
| `design.md` §4.10 — close button at least 44 × 44 | **40 × 40** (`min-h-10 min-w-10`) | ✗ |
| §4.10 — choices at least 44 × 44 | 47.75 tall | ✓ |

The 40px close button is a real accessibility gap against the foundations. Raising it is a runtime change and therefore step 5, not U4.

---

## A sixth D-05 item, found here

`design.md` §5.7 defines the scrim as a token: `--overlay-scrim: rgba(26, 26, 31, 0.48)`, and `docs/design/ds/colors_and_type.css:376` carries that value. The product paints `--overlay-scrim-medium` from `src/app/globals.css:97` — `rgb(4 6 10 / 64%)`.

They differ in **both** hue and strength: a warm-ink 48% against a cool near-black 64%. It is the legacy global theme showing through on the largest single surface the mobile flow paints, so it joins D-05 rather than the D-06/D-07 group, and it resolves at the theme cut.
