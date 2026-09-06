# Tier 2 — execution plan

**Date:** 2026-09-07 · **Task mode:** Plan Only · **Inputs:** `docs/plans/2026-09-07-candidates_0-overview.md` through `candidates_6`

The six tier-2 candidate documents describe *what* is wrong and *why*. This document decides *in what order and in how many landings*, because read together they overlap in ways none of them can see alone: five of the six edit `catalog-components.css`, three of them re-measure every card in the bundle, and one of them invalidates every measurement the other five would take.

Tier 3 (`candidates_7`–`candidates_10`) is unchanged and still runs after the design pass.

---

## Shared frame

**Program.** The 2026-09-06 rebaseline (`BQ-38`) replaces waves 13–17. The repository owns one token definition under `docs/design/ds/` and pushes it one-way to **VIVE Design System v2** (`cd630eec-25e4-4613-a58f-c671c80297ca`). Sync procedure and traps: `docs/design/ds/SYNC.md`.

**Priorities.** 1 — preserve the implemented logic with no side effects. 2 — take design and interaction quality as high as it will go.

**Decisions (`BQ-38`).** **A** catalog values under VIVE names · **B** `req-landing.md` §8 frozen; M-01 resolved to `--ease-in-out` on 2026-09-07 and implemented · **C** catalog card tokens and patterns frozen · **D** from `825385f6`, card components and thumbnail SVGs only.

**Boundaries.** No runtime file changes anywhere in tier 2 — every path is under `docs/`. No baseline regeneration (`BQ-07`). `cd630eec` is the only push target.

**Where this sits.** step 1 `c5fc624` → step 1b `e8a453e` → tier 1 `a3a1c3e` → **motion pass `484331d`** → **tier 2, this plan** → design pass → theme cut.

---

## The one structural decision

**`candidates_6` gets split, and its two halves bracket everything else.**

Its finding is that no `fonts/` directory exists in the bundle, so `@font-face … PretendardVariable.woff2` resolves to nothing and every viewport in the system was measured in a fallback face. Its remedy is to mirror the font *and* re-measure all eleven cards.

Executed as written, and in the order the documents suggest, that measurement happens before `candidates_1`, `3`, `4` and `5` add or resize seven more cards — so it would be redone immediately. Executed last, every card added in between is measured in the wrong face and has to be measured again anyway.

Neither. Split it:

- **6a — mirror the font.** Must be first. It costs almost nothing and it is what makes every subsequent measurement valid.
- **6b — measure everything once, at the end**, with 24px of headroom, and re-register.

The thumbnail import (decision **D**) has no measurement coupling and rides along with 6b.

This is the whole reason to read the six documents as a set rather than execute them in sequence.

---

## Four units

Grouped so that each unit is a coherent claim about the system, and so `catalog-components.css` is opened four times rather than six.

### U1 — Make measurement mean something · `candidates_6` part a

**공수 S.** Mirror `PretendardVariable.woff2` into `docs/design/ds/fonts/`, record the upstream release tag and file hash in `SYNC.md`, and correct that file's "not mirrored yet" paragraph. Nothing else.

**Gate.** `document.fonts.check('16px "Pretendard Variable"')` returns `true` in a local render. Until it does, no measurement taken anywhere in tier 2 counts.

**Blocked on a user decision** — see D-1 below. Everything after this unit can proceed without it *except* the final measurement in U4, so U1 can slip without stalling U2 and U3.

### U2 — Make the existing cards tell the truth · `candidates_2` + `candidates_5`

**공수 M · 효과 상 · 심각도 높음.** Both documents are the same claim: a specimen states a rule its own markup contradicts. Doing them together means one pass over the shared files.

- Split `.vt-title` / `.vt-subtitle` into unclamped bases (mobile behaviour + the global `keep-all` / `anywhere` wrapping rule, which neither currently carries) plus `--clamp1` / `--clamp2` modifiers, and apply the modifiers to the three desktop specimens. The base is the safe one: forgetting the modifier yields full text, which violates nothing, where today forgetting yields a clamp that violates `req-landing.md` on mobile.
- Replace the blog CTA stand-in — markup presence — with the real `:hover` / `:focus-within` mechanism.
- Add the expanded-surface focus ring, which is a different box from the card ring and from the choice ring tier 1 added.
- Add `preview/card-states.html` for the states that have a *visual* difference; a state whose difference is only behavioural gets a sentence, not an invented tile.
- **Record the fifth D-05 item.** Verified independently at `landing-grid-card.module.css:154` — `.root.desktopOverlayLayer:has(:focus-visible) { box-shadow: var(--card-shadow); }`, where `--card-shadow` is `globals.css:88`'s cool `0 14px 30px rgb(11 15 22 / 10%)`, not the file's own warm `--expanded-card-shadow`. Focusing into an expanded card swaps its warm lift for a cool one. `catalog-drift.html` gains a fifth row and its lede's count changes from four to five; `BQ-38`'s notes follow.
- **Fix the hyphenation split.** Product: `--blog-read-more-ink`. Design system: `--blog-readmore-ink`. Same value, and any grep-based comparison between the layers misses the pair. Rename the design-system token to the product's spelling — one rule, one preview — rather than leave a special case for `candidates_10`'s gate.
- The motion states are now unblocked: M-01 landed in `484331d`. Rather than redraw them, the states card **links to the Motion Lab artifact**, which already shows enter / steady / exit and the reduced-motion substitution interactively.

### U3 — Make the card's size and rhythm real · `candidates_3` + `candidates_1`

**공수 M · 효과 상 · 심각도 높음.** Both are about relationships between boxes rather than the appearance of one box, and both add the bundle's largest cards.

- Add `.vt-grid` with band modifiers, the row-stretch rule on `.vt-card__pad` / `.vt-card__content`, and a `.vt-tags-gap` that reads `calc(var(--vt-base-gap) + var(--vt-comp-gap))` with the compensation authored per card in the specimen, exactly as the product writes it per card from JavaScript.
- Add `preview/grid-rhythm.html` — one desktop row of four cards with deliberately unequal content. Its acceptance test is mechanical and is the card's whole reason to exist: four equal `offsetHeight`, four equal tag-row `top`.
- Restructure `.vt-expanded__body` into the product's three boxes — body, group at the 10px rhythm, and a `min-height: 14px; flex: 1` spacer between the last choice and the meta row — so surplus has somewhere to go and the choices↔meta distance stops reading as a flat 10px.
- Render `card-expanded.html` at its **resolved on-screen geometry** — 437px outer (397 × 1.10) with body type at 1.04 — rather than applying a live `transform`, which would clip against the specimen's own frame. Show the Tablet 1.04 case beside it so the band split is visible. Verified: `layout-plan.ts:10-11` gives 1.1 desktop / 1.04 tablet, `:139` gives `frameInlineScale = resolvedFinalScale / baseShellScale`.
- Put a resting card beside the expanded one with an explicit pixel floor, so "at least the resting height" becomes a thing you can see. `min-height: 100%` must appear in exactly two places in the stylesheet — the pad and the content — and nowhere near `.vt-expanded`.
- **No `--shell-scale` token.** The scale is behaviour governed by `req-landing.md` §8.4 and frozen under decision B; a token would invite someone to change it.

### U4 — Mobile, assets, and one measurement · `candidates_4` + `candidates_6` part b

**공수 M · 효과 상 · 심각도 중.** Last, because it is the only unit that needs the others finished: its measurement pass covers every card the previous units added.

- **Extract at mobile first.** 390 × 844, and **reload after resizing** — the tier is decided at load, and a resize alone leaves `data-card-viewport-tier` wrong. This is the same trap that cost a cycle during step 1b. Record every measured value in a dated plan document before a single specimen is written.
- Add `preview/card-mobile.html` (browse card at ~358px inside a 390px frame, unclamped title and subtitle from U2, two cards at the 15px gutter) and `preview/card-mobile-expanded.html` (full-bleed sheet, sticky header, close button, scrim, no side radius).
- Add `.vt-expanded--mobile`, `.vt-mobile-header`, `.vt-mobile-close`, `.vt-scrim`. Verified: `landing-grid-card.tsx:1046` shows the mobile expanded card drops its 16px padding entirely — `isMobileExpanded ? '[min-height:0] [padding:0]' : '[min-height:100%] [padding:16px]'` — which the desktop specimen's single `--card-pad` does not express.
- **Wave 13 was never implemented and `BQ-38` superseded it**, so what the product does on mobile expanded is the realized transient shell, not `design.md` §7.8's finished shape. The specimen shows the realized state and lists the §7.8 deltas beside it. Do not design the gap closed here — decision C.
- Import the seven thumbnails and the arrow from `825385f6` under decision D into `docs/design/ds/assets/`, and show them on a `preview/brand-thumbnails.html` card labelled *available artwork, not yet realized*. Replace the hand-drawn inline SVGs in the three card specimens with the product's actual generated gradient, so the bundle stops showing three different invented illustrations for a product that renders one wash.
- **Then measure every card once**, with the font loaded, and give each at least 24px of headroom rather than the current single digits. Re-register everything whose viewport moved.

---

## Order and what it costs

| Unit | Depends on | 공수 | Lands |
|:---|:---|:---:|:---|
| U1 · font | user decision D-1 | S | 1 |
| U2 · truthful cards | — | M | 1 |
| U3 · size and rhythm | U2 (modifiers) | M | 1 |
| U4 · mobile, assets, measure | U1, U2, U3 | M | 1 |

U2 and U3 can start before U1 lands; only U4's measurement needs the font. If D-1 is declined, U4 still runs — its measurements move to the Claude Design pane and the local render loop is lost, which is the loop that has already caught two specimen bugs.

---

## Decisions needed

**D-1 — mirror a ~1.3 MB font binary into the repository?** It cannot come through `DesignSync` (`get_file` caps at 256 KiB), so it means an external download from the upstream OFL release. **Recommended: yes.** The bundle exists so both sides render the same thing, and without it every measurement in the system is taken in the wrong typeface. The alternative — measure only in the pane — gives up the local render pass. *This is the one item I will not proceed on without an answer, because it is an external fetch and a binary in the repo.*

Decided per the candidate documents' own recommendations, stated here so they are not silently inherited: ship the **full face**, not a subset (a subset adds a build step and a way for the two sides to diverge); name the text modifiers by **behaviour** (`--clamp1`) rather than by tier, since the same clamp serves two tiers; show the imported thumbnails **labelled as unrealized** rather than hiding them, since unlabelled absence is what produced the hand-drawn stand-ins; show the mobile expanded **realized state** with the §7.8 deltas listed; show **both** expanded bands, since the 1.10 / 1.04 split is invisible with one; `grid-rhythm.html` shows **four columns, one row**, since the later-row 292px width is the tighter case for the tag row's common line; `card-states.html` is **one matrix card**; and the hyphenation mismatch is **fixed now**.

---

## Verification, common to every unit

Every unit is documentation-only, so the basic gates cannot be affected and are not run — `git diff --stat` showing only `docs/**` is the evidence, and that claim is checked per unit. What replaces them:

- **Render, measure, and look.** Insight I-3: the blog card's underline and the tag squash were both invisible in source and obvious on screen. A measurement alone would have missed both.
- **Read back computed styles** for every rule a specimen claims, against the file:line in the product that owns it. No value reaches a specimen without a measurement behind it.
- **Verify the push with `list_files` and `get_file`, never with `_ds_manifest.json`** — it is derived, it lags, and it has been measured stale immediately after two successful pushes (insight I-4). Re-register any card whose name, subtitle or viewport changed.
- **State the extraction boundary.** Insight I-1: step 1b read the card and never the page it sits on, and the largest drift in the product went unrecorded through two steps. Any extraction in U4 writes down what it did *not* look at.

---

## Out of scope

The undesigned surfaces — GNB, mobile menu, test flow, blog detail, history, consent — stay out. They still render the legacy theme and extracting them would enshrine a look nobody designed; they enter at the design pass. `catalog-components.css` does not move toward being importable by the product; tier 2 makes it a better description, nothing more. Tier 3 stays after the design pass. And applying the answer-button type defined in `484331d` to `test-question-client.tsx` remains step 5.
