# Design-system rebaseline — mid-review remediation, tier 1

**Date:** 2026-09-06 · **Task mode:** Implementation · **Branch:** `claude/review-tier1`

A mid-review of steps 1 and 1b, run before opening the motion pass. Two external reviewers were briefed to **falsify** the work rather than confirm it; every finding that changed a conclusion was then re-checked against the source directly. This document records what the review found and what tier 1 fixed. Tiers 2 and 3 are deferred — tier 2 to just before the design pass, tier 3 after it.

## What the review upheld

The token work reproduces. Colour, shadow, spacing and typography values match the product; the contrast arithmetic recomputes to two decimals; the sage ramp is monotonic in luminance with hue held inside 147–157°; and M-01 (21 landing animations on `linear`), D-01 (neutral-ramp temperature split) and D-02 (Pretendard specified, never loaded) all verify independently. No token name was removed by the rebaseline: 124 in, 184 out, zero dropped.

## What it broke

**The component specimens misdescribed the product in six places, two of which contradicted their own captions.** The design system was teaching rules the product does not follow, which would have propagated into every screen designed against it.

**Nothing in the repository pointed at the new bundle.** A session following `AGENTS.md` §2 for visual work landed on `design.md` and read superseded values, and `design.md` §11 classifies any other CSS as non-authoritative — so the bundle was not merely undiscoverable, it was pre-emptively overruled.

## Tier 1 — the eight items fixed here

| # | Finding | Fix |
|:---|:---|:---|
| 1 | `_provenance/` advertised a rollback path while holding one of five overwritten files. `README.md`, `SKILL.md`, `radius-scale.html` and `motion.html` existed only in one session's context. | All four captured. `_provenance/INDEX.md` records what restores what, and the rule the gap teaches: capture the snapshot in the same change that overwrites the file. |
| 2 | Six false statements shipped into the design system, including two cards whose markup did the opposite of their caption. | All six corrected — see below. |
| 3 | The largest drift was never recorded: the page ground is `#f5f7f7` under a teal and a blue radial wash, against a design that says "warm off-white, never cool grey" and rules out "cold blue tech imagery". Missed because the extraction covered cards and never the body. | Added to `catalog-drift.html` as the leading row, with the note that it is painted on the body and so is invisible to any card-level check. |
| 4 | The recorded thumbnail-placeholder drift was invalid — the slot is always covered edge to edge by an opaque image, so its legacy tint is never visible. The specimen had also replaced a two-stop warm→sage gradient with a flat fill. | Drift withdrawn on the card, with the reason. `.vt-thumb` now carries the gradient. |
| 5 | No contract document mentioned `docs/design/ds/`; decisions A–D lived only in plan files and CSS comments; waves 13–17 still read as the active plan, with twelve places deferring live work "to Wave 16". | `AGENTS.md` §1/§2 route to the bundle and state the intent-vs-realized split; `project-rules.md §Visual-Design` gains the same; **BQ-38** registers the programme and its deviations; waves 13–17 are marked `⤳ 대체` with their blocks preserved as the record. |
| 6 | Three `design.md` prohibitions were violated silently: the `--body` rename, and promoting `--tag-bg-unavailable` and `--muted-aa` to global tokens before Wave 16. | Registered as BQ-38 deviations rather than left implicit, with the scope clarified — those clauses govern the runtime global layer, which this documentation stylesheet is not. The rule going forward: a name may be added, a `design.md` value may not be changed, and a new divergence is registered before it is written. |
| 7 | `--ease-out` named two different curves. `design.md` §5.11 binds it to `cubic-bezier(0.0, 0, 0.2, 1)`; the bundle kept VIVE's `cubic-bezier(0.2, 0, 0, 1)` under that name and aliased `--ease-standard` to it — so the two documents agreed on `--ease-standard` and disagreed on `--ease-out`, the harder failure to see. | `design.md` wins on both names. The curve VIVE called `--ease-out` is unchanged and now reached as `--ease-standard`. `motion.html` runs all three candidates at the realized 280ms. |
| 8 | `--surface` was repointed to `--warm-0`, making it identical to `--surface-raised`; `color-tokens.html` showed the two as one colour, and every generic card, input, secondary button and active chip moved to pure white. Unforced — the catalog's white is `--canvas-elevated`. | `--surface` restored to `--warm-25`, with a comment recording why a catalog value must not overwrite a general role. |

### The six corrected statements

| Where | Claimed | Actually |
|:---|:---|:---|
| `catalog-drift.html` | the expanded card matches "exactly", arrow included | the arrow travels grey→sage on hover; the specimen had no hover rule |
| `catalog-drift.html` | "four things" differ | four, but a different four — the thumbnail row was invalid and the page ground was missing |
| `catalog-components.css` | choice hover is "never a colour change" | the arrow changes colour on that very element |
| `comp-tag-chip.html` | "the rest disappear right-first" | nothing disappeared; all chips shrank together |
| `card-blog.html` | the CTA "sits at the right end of the tags row" | it sat mid-row, inside the tag list, at the list's 8px gap |
| `SYNC.md` | everything but two cards follows the CSS automatically | `README.md` restates about thirty values in prose and is pushed |

Two further specimen defects were fixed in the same pass: the expanded card lost `--shadow-expanded` when the product's separate shadow plate was flattened away, so it read flat rather than floating; and `.vt-choice__text` was missing `flex: 1`, which put the arrow beside the label instead of at the button's right edge. `comp-choice.html` also advertised a focus state in its own subtitle without rendering one, and no rule in the stylesheet could have reached a choice — both fixed.

## Files changed

`docs/design/ds/`: `colors_and_type.css`, `catalog-components.css`, `SYNC.md`, `_provenance/` (four snapshots + `INDEX.md`), and nine preview cards. Contracts: `AGENTS.md`, `docs/agent-guides/project-rules.md`, `docs/decision-register.md` (BQ-38 + three 변경 이력 rows), `docs/wave-roadmap.md`.

**No file under `src/`, `tests/`, `scripts/`, or `public/`.** The dev server was run from the primary checkout for reading only.

## Validation

Basic gates not run, for the same reason as steps 1 and 1b: no file they read was touched, and `git diff --stat` is the evidence. Gates return at step 4.

Verified by measurement:

- **Every fix re-rendered and confirmed by computed style.** Arrow at rest `#7a7a85` and on hover `#5c8e78`; choice focus `2px solid rgb(92,142,120)` at a 2px offset; `flex-grow: 1` on the label with the arrow pinned right; blog CTA flush to the row's right edge with no underline on the title; tag row keeping its first two chips at natural width with only the tail ellipsised; expanded shadow resolving to the 12/32 lift plus the hairline ring plus the sage ring.
- **The token collision is gone**: `--ease-standard` reads `cubic-bezier(0.2, 0, 0, 1)` and `--ease-out` reads `cubic-bezier(0.0, 0, 0.2, 1)`, and `--surface` / `--surface-raised` resolve to `#fdfcfa` / `#ffffff` — the ladder is a ladder again.
- **All eleven cards re-measured** and their declared viewports set to the measured height plus roughly 30px, which also hedges the fallback-font rewrap risk that tier 2 resolves properly. Heights at 700px: card-test 444, card-expanded 429, card-blog 490, card-unavailable 441, comp-tag-chip 463, comp-choice 617, comp-meta-row 310, catalog-drift 943, motion 403.
- **The push landed**: 11 files written, 9 cards re-registered.

## Deferred

Tier 2 (before the design pass): expanded-card geometry — shell scale, height floor and the choices↔meta spacer — so the specimen stops rendering at the wrong size; responsive rules currently stated only in comments while the CSS clamps unconditionally, which `req-landing.md` forbids on mobile; row-stretch and the tags-row floor, without which equal-height rows cannot be reproduced; grid gutters, absent from the system entirely; a mobile card at any width and the whole mobile expanded structure; the ten unrepresented states; re-measuring with Pretendard actually loaded; and decision D's thumbnail assets.

Tier 3 (after it): `README.md`'s thirty hardcoded values and its "3-up desktop" error; the radius and shadow revalues that moved generic components when a consumer remap was the right change; the `6:1` versus `16/6` thumbnail-ratio conflict between two routed SSOTs; a gate that can detect drift between the token sources.
