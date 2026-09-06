# Rebaseline candidates — overview, insight register, and map

**Date:** 2026-09-07 · **Task mode:** Plan Only · **Status:** tier 2 and tier 3 of the mid-review, deferred by the user on 2026-09-06

This document is the map for `docs/plans/2026-09-07-candidates_1-*` through `candidates_10-*`. It carries the shared frame, everything the mid-review learned that does not belong to a single work item, and the reason each item was deferred rather than dropped. Read it first; then the individual documents stand alone.

The session that produced these findings ends when the motion pass opens. Nothing here depends on that session's context.

---

## Shared frame

**Program.** The 2026-09-06 design-system rebaseline (`BQ-38`) replaces waves 13–17 of `docs/wave-roadmap.md`. The repository owns one token definition under `docs/design/ds/` and pushes it one-way to the Claude Design project **VIVE Design System v2** (`cd630eec-25e4-4613-a58f-c671c80297ca`). The sync procedure and its operational traps are in `docs/design/ds/SYNC.md`.

**Priorities, in order.**

1. **Preserve the implemented logic with no side effects.** The interaction controllers, state model, storage, telemetry, transition runtime, routing and their E2E contracts are the asset the whole programme exists to protect.
2. **Take design and interaction quality as high as it will go.**

**Approved decisions (`BQ-38`).** **A** — tokens carry catalog *values* under VIVE *names and structure*. **B** — `docs/req-landing.md` §8 is frozen; every other surface aligns to its realized values (280 / 180 / 140ms); amending §8 itself is decided after the motion pass. **C** — catalog card tokens and patterns are frozen; improvements are raised as separate artboards, never applied silently. **D** — from the older design system `825385f6`, take only the card components and thumbnail SVGs; freeze the rest as reference.

**Invariant boundaries.** `src/**` is untouched until the theme cut (step 4). No visual-regression baseline is regenerated without separate approval (`BQ-07`). `cd630eec` is the only push target; `ee2fb724` is the canvas workspace and its project type can never become a design system; `825385f6` is reference-only.

**Step sequence.**

| Step | What | State |
|:---|:---|:---|
| 1 | Repo-owned token definition, pushed | done — `c5fc624` |
| 1b | Catalog component specimens, extracted from the running product | done — `e8a453e` |
| — | Mid-review, tier 1 (8 items) | done — `a3a1c3e` |
| 2 | Motion pass in Claude Design; M-01 decided | next |
| — | **Mid-review, tier 2 — `candidates_1` … `candidates_6`** | **this set** |
| 3 | Design pass — catalog reviewed under decision C; undesigned surfaces designed | |
| 4 | Theme cut in code — Ask-First, its own plan | |
| — | **Mid-review, tier 3 — `candidates_7` … `candidates_10`** | **this set** |
| 5 | Per-surface reskin and motion implementation | |
| 6 | Visual baseline regenerated once, with approval | |

Tier 2 runs **after the motion pass and before the design pass**, because every item in it changes what the design pass will be designing against. Tier 3 runs **after the design pass**, because none of it blocks design work and two of its items are cheapest once the theme cut has settled which values survive.

---

## The map

| # | Document | Tier | What it fixes | 공수 | 효과 | 심각도 |
|:---|:---|:---:|:---|:---:|:---:|:---:|
| 1 | `candidates_1-expanded-card-mechanisms` | 2 | Shell scale, height floor and flex spacer are absent, so the expanded specimen is the wrong size and the wrong rhythm | M | 상 | 높음 |
| 2 | `candidates_2-responsive-text-rules` | 2 | Title and subtitle clamps are unconditional where the contract forbids them on mobile; the global wrapping rule is missing from both | S | 상 | 높음 |
| 3 | `candidates_3-grid-and-row-rhythm` | 2 | Grid gutters absent from the system; row-stretch absent; the tags-gap mechanism is still a static stand-in | S | 상 | 높음 |
| 4 | `candidates_4-mobile-specimens` | 2 | No mobile card at any width; the whole mobile expanded structure is missing and the specimen keeps a radius the mobile rule forbids | M | 상 | 중 |
| 5 | `candidates_5-missing-states` | 2 | Nine card states the implementation supports have no specimen | M | 중 | 중 |
| 6 | `candidates_6-bundle-assets-and-remeasure` | 2 | The bundle is one file of a multi-file system: no fonts, no thumbnails, so local rendering ≠ design-system rendering and decision D is unexecuted | S | 중 | 중 |
| 7 | `candidates_7-readme-value-drift` | 3 | `README.md` restates ~30 token values in prose and is pushed; one of them contradicts `design.md` §7.7 | S | 중 | 중 |
| 8 | `candidates_8-token-role-remap` | 3 | Radius and shadow were revalued at the *role* level, so generic components inherited catalog decisions | M | 중 | 중 |
| 9 | ~~`candidates_9-thumbnail-ratio-conflict`~~ | 3 | **Landed 2026-09-07** during the design pass — `req-landing.md` §6.8 now reads `16 / 6`. Moved to `docs/done/`. | S | 중 | 중 |
| 10 | `candidates_10-drift-gate` | 3 | Nothing can detect drift between the four places that define these values | M | 중 | 중 |

Scoring is the mid-review's own: 공수 S/M/L, 효과 and 심각도 상/중/하 and 높음/중간/낮음.

---

## Insight register

These are the things the mid-review learned that are not owned by any single work item. They are the reason the tier-1 fixes were needed, and they will keep being true after tiers 2 and 3 are done.

### I-1 — Extraction is only as good as its scope, and what you did not extract is silently assumed correct

Step 1b read the catalog card out of the live DOM with `getComputedStyle` and got it almost entirely right. It never read the page the card sits on. The result was that the largest visual divergence in the product — the page floor at `#f5f7f7` under a teal and blue radial wash (`src/app/app-body-class.ts`), against `design.md` §4.4's "warm off-white, never cool grey" and "no cold blue tech imagery" — went unrecorded through two steps and was only found when an external reviewer was told to falsify rather than confirm.

The lesson is procedural: an extraction must state its boundary, and everything outside the boundary must be listed as *not examined* rather than left silent. A future extraction of the GNB, the test flow or the blog detail should begin by writing down what it will not look at.

### I-2 — A specimen whose comment contradicts its markup is worse than no specimen

Two shipped cards demonstrated the opposite of their own captions. `comp-tag-chip.html` said surplus tags "disappear right-first" while its markup squashed every chip; `card-blog.html` said the CTA "sits at the right end of the row" while its markup left it stranded mid-row at the tag list's own gap. Both read as authoritative because the prose was correct — it was the CSS that lied.

Any specimen that states a rule must be checked *against its own rendering*, not against the intent that produced it. Tier 1 fixed these two; the same failure is available on every card that carries a caption.

### I-3 — Rendering catches a class of defect that reading cannot

The blog card's underline was invisible in the source (the anchor's link defaults were inherited, never written) and obvious the moment the card was rendered. The tag squash was the same. Static review of the CSS would not have found either.

Every change to a specimen needs a render pass at the declared viewport, and the render needs to be *looked at*, not merely measured.

### I-4 — The Claude Design manifest is derived state and lags; it cannot verify a push

`_ds_manifest.json` was measured stale immediately after a successful `write_files` on two separate occasions: it still listed pre-push token values and did not contain a newly added card. It is compiled by the Claude Design app on its own schedule. Use `list_files` and `get_file` to verify a push, and `register_assets` to make a new or renamed card appear without waiting. This is recorded in `SYNC.md`; it is repeated here because it is the single most likely way a future session mistakenly concludes a push failed.

### I-5 — The same visual concepts are now defined in five places, and only two of them are authoritative

`docs/design/design.md` §5 (intent, and it restates its motion tokens a second time in §8) · `docs/design/ds/colors_and_type.css` (realized values, `BQ-38`) · `docs/design/ds/README.md` (prose restatement, drifts silently — `candidates_7`) · `src/app/globals.css` (the live legacy runtime layer, 71 properties, consumed by 18 files) · `src/features/landing/grid/landing-grid-card.module.css` plus its `.tsx` (the scoped literals that actually render the cards).

The rebaseline added one and removed none. That is by design until the theme cut collapses the runtime layers, but it means **any value quoted from memory is a coin flip**, and it is why `candidates_10` proposes a gate.

### I-6 — Two routed SSOTs can disagree indefinitely with nothing to detect it

`docs/req-landing.md:389` specified the normal thumbnail as ratio `6:1`. `design.md` §6.2 and the product both use `16 / 6` — a change made under `BQ-22` that never reached `req-landing.md`. Both files are routed by `AGENTS.md` §2. The extraction propagated the product's value into the design system without noticing the conflict, because nothing compares them. **Landed 2026-09-07**, ahead of its tier: the design pass's D-08 thumbnail proposal rests on the 16:6 slot, so leaving a routed contract saying otherwise would have put a new proposal on the wrong side of a live conflict. This was propagating `BQ-22`, not deciding anything.

### I-7 — Local rendering is not design-system rendering until the bundle is complete

The repository holds `colors_and_type.css` and the preview cards, but not `fonts/`, `vive-components.css`, `assets/` or the UI kits, all of which exist on the Claude Design side. `colors_and_type.css` declares `@font-face … url('./fonts/PretendardVariable.woff2')`, which resolves to nothing locally — so **every viewport measurement taken in this programme so far was taken in a fallback typeface**. All eleven cards carry 5–12px of headroom, less than one line of prose. See `candidates_6`.

### I-8 — Briefs that demand falsification produce findings; briefs that ask for confirmation produce confirmations

The mid-review's yield came from telling two independent reviewers to attack a stated claim and to report unfounded lines of attack explicitly. Both did, and both reported some attacks as unfounded, which is what made the rest credible. Self-review by the session that did the work found the collateral damage to the general system and the incomplete rollback provenance, but not the six specimen defects.

Repeat this before each major gate, and keep the reviewers' scope disjoint: one on repository coherence, one on artefact fidelity.

### I-9 — Applying a product's values to a general system's *roles* leaks product decisions into unrelated components

Step 1 revalued `--surface` from `--warm-25` to `--warm-0` because the catalog's cards are exact white. That collapsed `--surface` and `--surface-raised` to the same colour, and with them the general system's surface ladder — visible in `preview/color-tokens.html`, which exists to show those four roles as distinct swatches. Nothing required it: the catalog's white is already exposed as `--canvas-elevated`, and `catalog-components.css` uses that name.

Tier 1 restored `--surface`. The same mistake is still standing in the radius and shadow scales, where the fix is to remap consumers rather than to revalue roles — `candidates_8`.

---

## What the review upheld — do not re-audit

Recorded so a later session does not spend the effort again. All of this was independently reproduced during the mid-review, most of it twice.

- **Flat token values are correct.** Roughly 25 colour, spacing, radius, typography and duration values were cross-checked against `landing-grid-card.module.css` and the Tailwind literals in `landing-grid-card.tsx`. All match.
- **The contrast arithmetic recomputes** to two decimals: `--sage` 3.75:1, `--muted` 4.24:1, `--muted-aa` 4.55:1, `--accent-fg` 7.09:1, `--accent-hover` 5.09:1, `--blog-readmore-ink` 5.26:1.
- **The derived sage ramp is coherent** — monotonic in luminance, hue 146.7–156.8°, saturation 20.0–28.7%.
- **No token name was removed** by the rebaseline: 124 in, 184 out, zero dropped.
- **M-01 is real** — exactly 21 `animation: landing-card-*` declarations in the module CSS, all `linear`, no `animation-timing-function` anywhere in the file, against `req-landing.md` §8.3's requirement to unify on an ease-in-out curve, with no test asserting a timing function.
- **D-01, D-02 and the two title-colour drifts of D-05 all verify** against source.
- **The meta row, the card focus ring and the blog hover skin are faithful** in the specimens.

---

## Deferred by decision, not by oversight

Two things look like omissions and are not.

**The undesigned surfaces are absent on purpose.** The GNB, mobile menu, test flow, blog detail, history and consent banner still render the legacy theme. Extracting them into the design system would enshrine a look no one designed. They enter at step 3, when they are actually designed. Nothing in tiers 2 or 3 should add them.

**`catalog-components.css` will never be importable by the product.** It is a specimen stylesheet: the product's card is a CSS Module with different class names, geometry written per card from JavaScript, and a stage/frame/shell layering the specimen deliberately flattens. The file says so in its own header as of `a3a1c3e`. Tier 2 makes it a *better description*; it does not move it toward being adoptable code.
