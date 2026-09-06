# Tier 2 · U3 — Make the card's size and rhythm real

**Date:** 2026-09-07 · **Task mode:** Implementation (documentation surface only) · **Inputs:** `docs/plans/2026-09-07-candidates_3-grid-and-row-rhythm.md` + `candidates_1-expanded-card-mechanisms.md`, sequenced by `2026-09-07-tier2-execution-plan.md`

---

## Shared frame

**Program.** The 2026-09-06 rebaseline (`BQ-38`) replaces waves 13–17. The repository owns one token definition under `docs/design/ds/` and pushes it one-way to **VIVE Design System v2** (`cd630eec-25e4-4613-a58f-c671c80297ca`). Sync procedure and traps: `docs/design/ds/SYNC.md`.

**Priorities.** 1 — preserve the implemented logic with no side effects. 2 — take design and interaction quality as high as it will go.

**Decisions (`BQ-38`).** **A** catalog values under VIVE names · **B** `req-landing.md` §8 frozen; M-01 resolved to `--ease-in-out` and implemented · **C** catalog card tokens and patterns frozen · **D** from `825385f6`, card components and thumbnail SVGs only.

**Boundaries held.** No runtime file changed — the diff is `docs/**` only. No baseline regeneration (`BQ-07`). `cd630eec` is the only push target.

**Where this sits.** step 1 → step 1b → tier 1 → motion pass `484331d` → U1 font `10d6321` → U2 truthful cards `61bf414` → harness alignment `df6d4bf` → **U3, this document** → U4 → design pass.

---

## What the unit claimed, and what it found

Between them the two candidate documents say: *the specimen describes a card, and the properties that decide a card's real size and rhythm are not in a card.* Both were right. Executing them turned up a third instance of the failure U2 kept meeting — a base layer silently overriding the component layer — and this one had been falsifying every measurement in the bundle.

### Carried out as specified

**1 · The grid exists.** `.vt-grid` with `--vt-columns`, `align-items: stretch`, and `--tablet` / `--desktop` gutter modifiers. The three gutter tokens had been defined and consumed by nothing. The comment carries the column ladder in full, including the first-row asymmetry — Wide is 3 then 4, Medium 2 then 3, below 1040 always 2 — which no single-row specimen can show and which is where both of the bundle's card widths come from.

**2 · Row stretch.** `min-height: 100%` on `.vt-card__pad` and `height: 100%; min-height: 100%` on `.vt-card__content`, mirroring `landing-grid-card.tsx:1046` and `:1052`. It appears in exactly those two places and nowhere near `.vt-expanded`, where `design.md` §7.3 bans it by name.

**3 · The tags gap carries its mechanism.** `calc(var(--vt-base-gap, 8px) + var(--vt-comp-gap, 0px))`, with the compensation authored per card in the specimen exactly as the product writes it per card from measured values. The `0px` default is the `needs_comp = false` case the contract requires to be exactly zero.

**4 · `preview/grid-rhythm.html`.** Four Desktop Wide later-row cards at 292px on a 24px gutter, deliberately unequal content, plus a counterfactual row with every compensation at `0px`. A dashed annotation is drawn at each distinct tag-row top, so "one line" is something you see rather than something the caption claims: the first row draws one line, the second draws two.

**5 · The expanded card at its resolved geometry.** 437px outer for Desktop Wide (`397 × 1.10`) and 413px for Tablet (`397 × 1.04`), reproduced with `zoom: 1.04` rather than `transform`, which would paint outside a specimen's own frame and clip. The consequence worth having: every number in the file is the number the *product* writes — the floor really is `270 / 1.04`, the question really is 21px in the token — instead of a value multiplied by hand that can drift.

**6 · The three-box body and a floor that binds.** `.vt-expanded__body` / `__group` / `__spacer`, and an inline pixel `min-height` on the body, which is the box the product writes it on. The product has one more nesting level; collapsing it changes nothing on screen, and the comment says so.

**7 · Band labels** on `card-test`, `card-blog` and `card-unavailable`, each with the arithmetic that produces its width.

### Found while doing it

**8 · The base type layer was overriding every component that sat on a `<p>`.** `colors_and_type.css` wrote its element defaults as `.vive p`, `.vive h3` and so on — specificity (0,1,1), which outranks every single-class component selector (0,1,0). Measured 2026-09-07:

| role | token says | rendered |
|:---|:---|:---|
| `.vt-subtitle` on `<p>` | 15px / 21.75 | **16px / 25.6** |
| `.vt-subtitle` on `<span>` | 15px / 21.75 | 15px / 21.75 |
| `.vt-question` | 21px / 27.3 | **16px / 25.6** |
| `.vt-context` | 14px / 19.6 | **16px / 25.6** |
| `.vt-meta` | 13px / 17.55 | **16px / 25.6** |

Four of the catalog's six type roles had never once rendered at their token size, and the same class rendered at two different sizes depending on the tag it sat on. The base rules' `margin: 0` was also cancelling the 8px `margin-top` on `.vt-title` and `.vt-subtitle` — the thumbnail → title → subtitle rhythm that `req-landing.md` §6.7 requires — so the bundle's vertical rhythm was collapsed as well as its type.

Fixed by wrapping the element defaults in `:where()`, which contributes zero specificity and turns them into defaults any class overrides. The utility classes stay at (0,2,0) and still win, which is correct.

---

## Verification

**Boundary.** The diff is `docs/**` only; `src/**` untouched. `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` all green — run because the harness alignment added contract guards to vitest, not because this unit could affect them.

**The acceptance test candidates_3 specified, met exactly.** In `grid-rhythm.html`, with the compensations authored: four card heights all `252.25`, four widths all `292`, four tag-row tops all `207.25`, three gutters all `24`. With every compensation at `0px`: the heights stay equal — that part is the grid — and the tag tops split into `185.5 / 207.25 / 185.5 / 207.25`, exactly the 21.75px a subtitle line is worth.

**The floor is demonstrated, not asserted.** Two Desktop Wide frames sit side by side. With a two-line question the content comes out `271.5` against a `270` floor, so the spacer sits at its `14.6` minimum and the card grows downward. With a one-line question the card lands at exactly `270.0` — the resting card's height — and the spacer stretches to `41.5`. Changing the question's length changes only the spacer, which is the mechanism.

**Scale, read back.** Frames measure `436.7` and `412.9`. Question computes `21px/27.3` at `zoom: 1.04`. Spacer minimum computes `14.6` = `14 × 1.04`.

**Type, read back after the fix.** All six roles resolve to their tokens, and `.vt-subtitle` now computes identically on `<p>` and `<span>`. Card geometry moved with it: `card-test` 397×258 → **397×270**, which reconciles with product arithmetic to within thumbnail rounding — `16 + 136.9 + 8 + 26 + 8 + 21.75 + 8 + 28 + 16 + 2 = 270.6` against a measured `269.9`.

**Every viewport re-measured** at its declared width after the type fix moved eleven of them; all fourteen cards now hold 24–128px of headroom with no horizontal overflow. `min-height: 100%` appears as a declaration exactly twice, on `.vt-card__pad` and `.vt-card__content`.

**What this unit did not look at.** Mobile is untouched — no mobile grid modifier is exercised, and the single-column mobile band is named in the comment but not drawn. No card was measured with Pretendard loaded; U4 re-measures everything with the font and these viewports may move again. The counterfactual row in `grid-rhythm.html` is a construction, not an observation of the product.

---

## Not done here, on purpose

The mobile specimens, the thumbnail import under decision **D**, and the single measurement pass with the real typeface are U4. Applying `.vt-choice--answer` to `test-question-client.tsx` is step 5. D-06 and D-07 stay recorded and unfixed — both need a runtime change, and `src/**` opens at the theme cut.
