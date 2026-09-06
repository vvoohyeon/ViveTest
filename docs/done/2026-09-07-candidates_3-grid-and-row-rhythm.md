# Candidate 3 — the grid itself is missing from the system, so equal-height rows cannot be reproduced

**Date:** 2026-09-07 · **Tier:** 2 — run after the motion pass, before the design pass · **Task mode:** Implementation (documentation surface only) · **공수** S · **효과** 상 · **심각도** 높음

---

## Shared frame

**Program.** The 2026-09-06 design-system rebaseline (`BQ-38`) replaces waves 13–17. The repository owns one token definition under `docs/design/ds/` and pushes it one-way to **VIVE Design System v2** (`cd630eec-25e4-4613-a58f-c671c80297ca`). Sync procedure: `docs/design/ds/SYNC.md`.

**Priorities, in order.** 1 — preserve the implemented logic with no side effects. 2 — take design and interaction quality as high as it will go.

**Approved decisions (`BQ-38`).** **A** tokens carry catalog values under VIVE names · **B** `req-landing.md` §8 frozen · **C** catalog card tokens and patterns frozen · **D** from `825385f6` take only card components and thumbnail SVGs.

**Invariant boundaries.** `src/**` is untouched until the theme cut — **this document changes no runtime file**. No baseline regeneration (`BQ-07`).

**Where this sits.** step 1 `c5fc624` → step 1b `e8a453e` → tier 1 `a3a1c3e` → motion pass → **this document** → design pass.

**Do not re-run.** Tier 1 already gave `.vt-tags` its `min-height: 28px` (the empty-tags-row floor), added `.vt-tag--fixed` so only the last chip flexes, and rewrote the `.vt-tags-gap` comment to say plainly that the value is a static stand-in and not the mechanism. What remains is representing the mechanism, not correcting the claim.

---

## The finding

The design system describes a card. It does not describe the thing the cards are arranged in, and three of the properties that make a row of catalog cards look deliberate live in that arrangement rather than in any card.

The visible consequence is that **equal-height rows — the single most noticeable property of the real grid — cannot be produced from this system**, and neither can the common bottom line the tag rows sit on.

### 3.1 — Grid gutters exist as tokens and are used by nothing

`colors_and_type.css:394-396` defines them:

```css
--grid-gutter-mobile:  15px;
--grid-gutter-tablet:  20px;
--grid-gutter-desktop: 24px;
```

`catalog-components.css` contains no grid rule at all, so the tokens are inert. The realized values are `landing-catalog-grid.tsx:200` and `:209`:

```
className="landing-grid-container relative grid gap-[15px] md:gap-5 xl:gap-6"
className="landing-grid-row grid items-stretch gap-[15px] md:gap-5 xl:gap-6 [grid-template-columns:repeat(var(--landing-grid-columns),minmax(0,1fr))]"
```

— 15px below 768, 20px from 768, 24px from 1280 (`BQ-37`). `design.md` §7.7 gives the same ladder as "24px desktop · 20px tablet · 14–16px mobile".

Someone laying out a new catalog row today has no gutter to reach for, and no way to derive the tablet or mobile card width. The 397px and 292px widths hard-coded in the existing specimens are only derivable from the 24px desktop gutter, and neither specimen says which band it belongs to.

### 3.2 — The row-stretch rule is absent

`req-landing.md:321`:

> row stretch를 깨뜨리는 축 정렬 설정을 금지하며, 카드 shell은 row stretch를 수용해야 한다(`min-height: 100%` 또는 동등 규칙).

Product: the row is `items-stretch` (`landing-catalog-grid.tsx:209`), the trigger carries `[min-height:100%]` (`landing-grid-card.tsx:1046`), and the content box carries `h-full min-h-full` (`:1052`).

Specimen: `.vt-card__pad` and `.vt-card__content` carry no height rule at all. Two specimen cards with different amounts of text are two different heights, always.

### 3.3 — The tags gap is a constant where the product measures it per card

Product — `landing-grid-card.tsx:220`:

```
'landing-grid-card-tags-gap h-[calc(var(--landing-card-base-gap) _+_ var(--landing-card-comp-gap))]'
```

with both custom properties written per card from measured values (`landing-grid-card.tsx:1144-1145`, model in `spacing-plan.ts`, base `LANDING_CARD_BASE_GAP_PX = 8`).

The contract is explicit and unusually strict — `req-landing.md:327-334`:

> `subtitle -> tags` 구간은 `기본 간격(base_gap) + 보정 간격(comp_gap)` 이원 정책으로 고정한다… `comp_gap = actual_gap - base_gap`으로 정의한다… `needs_comp=false` 카드의 `comp_gap`은 항상 `0px`여야 하며, 전이 중 단 1프레임이라도 `comp_gap>0`이면 안 된다.

and §6 separately bans faking the effect with a fixed minimum, a floor or a spacer.

Specimen: `.vt-tags-gap { height: var(--space-2); }` — a constant 8px, i.e. the base half with the compensation permanently zero. Tier 1 made the comment say so honestly. The mechanism is still not shown, and it is the mechanism that puts every card's tags row on one line.

---

## What to change

### A new preview card is the centre of this item

Add `preview/grid-rhythm.html`, group `Catalog`, showing **one desktop row of four cards with deliberately unequal content** — a one-line title next to a clamped two-line title, a short subtitle next to a full two-line one, two tags next to four. The card's whole subject is that the four cards are the same height and their tag rows sit on one line. Everything else in this item exists to make that card true.

### Concrete edits to `catalog-components.css`

1. **Add the grid.**

   ```css
   .vt-grid {
     display: grid;
     align-items: stretch;
     gap: var(--grid-gutter-mobile);
     grid-template-columns: repeat(var(--vt-columns, 1), minmax(0, 1fr));
   }
   .vt-grid--tablet  { gap: var(--grid-gutter-tablet); }
   .vt-grid--desktop { gap: var(--grid-gutter-desktop); }
   ```

   Modifiers rather than media queries, for the reason set out in `candidates_2`: the specimen renders inside a fixed-width pane frame, and card width does not determine tier — the product decides it from the measured `.landing-grid-container` inline size (`req-landing.md` §6.2: `>= 1160` → 3 then 4 columns, `1040–1159` → 2 then 3, `< 1040` → 2 then 2, `<= 767` → mobile single column). Say that in the comment, and name the first-row-3 / later-rows-4 asymmetry, which is otherwise invisible and is contradicted elsewhere in the bundle (see `candidates_7`).

2. **Add the row stretch.** `.vt-card__pad { min-height: 100%; }` and `.vt-card__content { height: 100%; min-height: 100%; }`. Note in the comment that this is the one place `min-height: 100%` is correct — the expanded card's height floor must **not** use it (`design.md` §7.3), and `candidates_1` covers that.

3. **Make the tags gap represent its mechanism.**

   ```css
   .vt-tags-gap {
     height: calc(var(--vt-base-gap, 8px) + var(--vt-comp-gap, 0px));
   }
   ```

   and have `grid-rhythm.html` set `--vt-comp-gap` inline per card, exactly as the product writes it per card from JavaScript. That is an honest representation: the specimen is not computing the compensation, it is showing that the value is authored per card and that `needs_comp=false` cards keep it at `0px`. Keep the existing comment's warning that a constant cannot absorb surplus, and add that the numbers in the specimen are illustrative rather than measured.

4. **Label the existing specimens with their band.** `card-test.html` (397px) is Desktop Wide first row; `card-blog.html` and `card-unavailable.html` (292px) are Desktop Wide later rows. One clause in each caption.

---

## Verification

- Render `grid-rhythm.html` and read back the four cards' `offsetHeight`: all four equal. Read back the four tag rows' `getBoundingClientRect().top`: all four equal. Those two assertions are the card's entire reason to exist — if either fails, the row-stretch rule went on the wrong element.
- Confirm the gutter between cards computes to 24px in the `--desktop` modifier, 20px in `--tablet`, 15px in the base.
- Confirm `min-height: 100%` appears in exactly two places in `catalog-components.css` — the pad and the content — and nowhere near `.vt-expanded`.
- Render at the declared viewport, measure, then **look at it**.
- `git diff --stat` shows only `docs/design/ds/**` and `docs/plans/**`.
- Push, and `register_assets` the new card with its measured viewport.

---

## Decisions the user may want to make

- **Whether `grid-rhythm.html` should show four columns or the first row's three.** Four is recommended: the later-row width (292px) is the tighter case and the one where the tag row's common line is hardest to hold.
- **Whether to add a second row** to show the 3-then-4 asymmetry. It roughly doubles the card's height; the alternative is one row plus a sentence.

---

## Execution prompt

> Read `docs/plans/2026-09-07-candidates_0-overview.md`, then `docs/plans/2026-09-07-candidates_3-grid-and-row-rhythm.md`, and implement it. Work in an isolated clone. Touch nothing under `src/`. The acceptance test is mechanical: in `preview/grid-rhythm.html` all four cards must report the same height and all four tag rows the same top offset. Push to `cd630eec-25e4-4613-a58f-c671c80297ca` per `docs/design/ds/SYNC.md`, register the new card, then commit and land on `main`.
