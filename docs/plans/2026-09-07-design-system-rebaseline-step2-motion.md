# Design-system rebaseline — step 2: the motion pass

**Date:** 2026-09-07 · **Task mode:** Implementation · **Branch:** `claude/m01-easing`

Step 2 of the programme that replaces waves 13–17. Steps 1, 1b and the mid-review remediation are `docs/plans/2026-09-06-*`. This is the first step that changes `src/`.

## Shared frame

**Goal.** One design definition the repository owns and Claude Design consumes; then raise the product's visual and interaction quality across every surface, and implement it without design and code drifting apart again.

**Priorities.** 1 — preserve the implemented logic with no side effects. 2 — take design and interaction quality as high as it goes.

**Approved decisions.** A: catalog values, VIVE structure. B: `req-landing.md` §8 frozen; other surfaces align to its realized values. C: catalog card tokens and patterns frozen. D: from design system `825385f6`, card components and thumbnails only. All registered as BQ-38.

**Boundaries.** `cd630eec` is the only push target. No visual baseline is regenerated (BQ-07). `globals.css` stays frozen until the theme cut.

## What this step decided

**M-01 — the core expand and collapse takes `--ease-in-out`.**

The decision was made by looking, not by argument. Reading three cubic-bezier definitions tells you nothing about which one the product should feel like at 280ms, so the deliverable was an instrument rather than a document: the real expand reproduced three times — same 280ms core, same 1.04 shell scale, same 1.10 frame widen, same 40/100/160ms stagger, same 120ms slot fade — with only the curve differing, and a speed control down to 0.125× because at 1× the three are nearly indistinguishable.

The two decelerate curves were rejected for a reason the comparison made visible: §8.3 requires Expanded→Normal to return on the same axis and curve as the open, and a decelerate-only curve ends the close faster than it began, which reads as the card being dismissed rather than closing. `--ease-in-out` is also the only candidate that satisfies §8.3 as written, so it needed no amendment to a contract decision B had frozen.

**The test flow's answer button becomes its own type, and the submit CTA keeps the old one.**

The shipped flow paints both with the same brush: `testAnswerButtonClassName` is a filled neutral chip at `font-semibold`, and selecting one moves it to the accent fill with an inset ring and a drop shadow — `testPrimaryButtonClassName` differing mainly in fill strength. So every answer carries the weight of a decision, when answering is a light action repeated a dozen times a run and only submitting commits anything.

The fix reuses rather than invents. The catalog's expanded card already has the right control — white surface, `--hairline-strong` edge, 400 weight, sage deepening on hover — so that becomes the shared type and the test flow takes a variant of it. Two differences: **no arrow**, because inside the test answering navigates nowhere and the glyph would promise something the interaction does not do; and **a selected state**, a sage disc, which the catalog never needed. The submit button keeps the filled treatment as `.vt-cta`.

The argument for one type rather than two: the expanded catalog card previews a test's first question, and entering the test shows that same question again. A light choice in one place and a heavy CTA in the other puts a seam exactly where continuity matters most.

## Changes

**Runtime — one file.** `src/features/landing/grid/landing-grid-card.module.css` declares `--landing-card-motion-ease: cubic-bezier(0.45, 0, 0.2, 1)` once and all 21 animations reference it. Durations, phases, staggers, the reduced-motion path and every keyframe body are untouched; the change is the timing function and nothing else. The 140ms hover and focus transitions already used `ease`, which is in the same family, and were left alone.

**Design system.** `colors_and_type.css` resolves M-01 from `[OPEN]` to decided and records why. `catalog-components.css` gains `.vt-choice--answer` and `.vt-cta`. `preview/motion.html` keeps the three-way comparison as the record of the decision, relabelled. `preview/comp-answer-button.html` is new — the two weights side by side, with the shipped treatment reproduced beneath them for contrast. `README.md` moves M-01 out of the open-findings table into the Motion section.

**Contracts.** `docs/decision-register.md` records both decisions as a BQ-38 follow-up, with a 변경 이력 row.

**Not changed.** `test-question-client.tsx` still ships the old buttons — this step defines the type, and the surface is reskinned in step 5.

## Validation

**Basic gates, all green on the change:** `npm run lint`, `npm run typecheck`, `npm test` (74 files, 516 tests, 516 passed), `npm run build`.

**Change-type anchor for landing (`verification-commands.md §landing`):** `npm run qa:rules` and the grid / state / a11y E2E smokes at `--workers=1`.

Two red results were investigated rather than waved through, and neither belongs to this change:

- **`qa:rules`** reports missing theme-matrix baselines (48 of 168) and a blocker-traceability entry, `assertion:B5-overlay-focus`, whose E2E assertion Wave 9 removed when it removed the overlay. Neither check reads a file this change touches. `AGENTS.md` §5 already places `qa:rules` outside the Default Done gate with its pass/fail state to be established by running it.
- **One E2E failure**, `state-smoke.spec.ts:998`. The first comparison looked damning — it failed with the change and passed without it — but the two runs were not matched: the failing one was the full three-spec suite and the passing one was that test alone. Run identically, **the base fails the same test in the same way**: 68 passed, 1 failed, both with and without the change. It is an order-dependent flake in the suite, not a regression. Reported as observed rather than as a pass.

The lab itself was verified by driving it: the answer buttons advance the question, exactly one question element exists at every step, and the submit CTA appears after the last one.

## Deferred

Tier 2 of the mid-review (before the design pass): expanded-card geometry in the specimens, responsive rules currently stated only in comments, row-stretch and the tags floor, grid gutters, a mobile specimen, the ten unrepresented states, re-measuring with Pretendard loaded, decision D's thumbnails. Tier 3 after it. Applying the new answer-button type to `test-question-client.tsx` waits for step 5.
