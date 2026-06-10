# STATE.md - Wave 10 Landing Grid Height Rhythm (VALIDATION BLOCKED)

> Session continuity anchor only. Not executable, not an SSOT.
> Approved plan SSOT: `docs/plans/2026-06-09-wave-10-landing-grid-plan.md`.
> User amendments A1-A7 override conflicting plan text. Branch `main`; no commit/push/checkpoint work.

## Current Phase / Milestone

Wave 10 Units 0 through 9 are implemented. Runtime, tests, scoped phase 4/5/6 QA, and SSOT
re-anchors are complete. Final completion is blocked only by one stale local screenshot baseline and
one unchanged stale Phase 9 source matcher; `docs/wave-roadmap.md` was not advanced.

- Unit 0: restored Wave 9 completion state, read routed landing/design/verification contracts, verified
  `main` at `16e5a0b`, clean starting worktree, allowed file set, exact test-title inventory, and no
  snapshot/baseline changes.
- Documented divergence: the approved plan records stale workspace
  `/Users/woohyeon/Local/ViveTest`; the authorized live workspace is
  `/Users/b-m-2022001/Local/ViveTest`.
- Unit 1 / W10-LI-01: replaced one-shot spacing measurement with one RAF-coalesced scheduler and one
  `ResizeObserver` over settled Normal card/content boxes. Added cached module-level
  `document.fonts.ready`, cleaned-up `loadingdone`, resize invalidation, Mobile phase suspension,
  desktop active/frozen suspension, prior-map retention for missing Normal nodes, and whole-pixel
  normalized state inputs while preserving compensation arithmetic and BQ-24 floor/baseline order.
- Unit 2 / W10-LI-02 / BQ-32: added the pure 56px visible-prefix resolver, a card-local intrinsic
  tag/CTA probe, suffix-only public DOM rendering, mandatory status-first visibility, settled-width
  count updates, probe-derived CTA reservation, Tablet hover/focus parity, and resize down/up
  reappearance. CSS owns the flexible tail; JS changes only the prefix count.
- Unit 3 / W10-LI-03: replaced row-index expansion ratios with one pure measured scale resolver.
  Desktop Wide/Medium/two-column desire `1.10`, Tablet stays `1.04`, reduced motion stays `1.00`,
  and edge/center stage allowance is measured from the existing scoped stage bleed. Title split and
  BQ-24 floor values remain stable through opening/steady/handoff/closing/cleanup.
- Unit 4 / W10-LI-05: Desktop/Tablet Normal subtitles retain two-line ellipsis; Mobile Normal
  subtitles render full text with no clamp or ellipsis. All 12 locales preserve full scroll height,
  positive base gap, zero one-card-row compensation, and tag-row geometry. Taller Mobile cards keep
  exact OPENING snapshot capture and final NORMAL restore under normal and reduced motion.
- Unit 5 / W10-LI-04: the conditional deletion took the implemented branch. Removed only the root
  `min-h-44`; computed root `min-height` is now intrinsic `auto`. Normal Test/Blog/Unavailable row
  stretch, trigger coverage, desktop active placeholder/cleanup geometry, same-row isolation,
  Mobile OPENING/OPEN/CLOSING/NORMAL, answer-choice hit targets, snapshots, final restore, and
  reduced motion all remain green.
- Unit 5's broader reduced-motion matrix exposed a Unit 3 timing regression: after hydration the
  scale hook could briefly return the earlier non-reduced zero-width frame scale `0.9615384615`.
  `useCardExpandedScale` now returns the reduced-motion `1.00` decision synchronously, preserving the
  pre-Wave-10 contract without weakening the existing assertion.
- Unit 6 / BQ-30: catalog tags are borderless, available Test/Blog tags retain `#ECE8DF`, and the
  Unavailable status tag uses scoped `#E6E2D8`. Radius, 9px inline padding, nowrap, ellipsis
  capability, source casing, text-only markup, and status semantics remain unchanged.
- Unit 7 / W10-LI-06: no behavior-layer runtime file changed. Transition, telemetry, registry,
  test-flow, routing, localization, messages, storage/consent, route files, card interaction
  handlers, snapshots, baselines, and `globals.css` remain untouched.
- Unit 8: phase 4/5/6 QA checkers were updated with exactly the approved Wave 10 anchors and pass.
  The pre-edit checkers unexpectedly passed because they did not inspect those anchors; no red state
  was fabricated. No phase 7/8/9/10 checker changed.
- Unit 9: BQ-30/31/32, `req-landing`, `design.md`, and the approved plan were synchronized. Manual
  verification found and fixed hidden-probe Mobile overflow plus an unintended extra Blog flex gap;
  the probe anchor is clipped and out-of-flow. The roadmap remains unchanged because final gates are
  not literally all green.

## Pending Verifications / Debt

- Unit 1 red evidence:
  - `keeps non-comp compensation at zero for repeated normalized measurements`: passed because the
    existing pure arithmetic was intentionally preserved.
  - `font-ready and resize remeasure preserve settled compensation`: failed before runtime change
    (`rhythm-b` remained `259.75px`).
  - `transition frames keep non-comp gap at zero through mobile and desktop lifecycle states`: failed
    before runtime change because Mobile OPEN rewrote settled `qmbti` natural height
    `221.25px -> 222px`.
- Unit 1 green evidence:
  - `npm test -- tests/unit/landing-spacing-plan.test.ts`: 6/6 passed.
  - focused grid/state Playwright command: 2/2 passed.
- Unit 2 red evidence:
  - resolver titles failed because `resolveVisibleTagPrefix` did not exist;
  - DOM title failed because visible-count/probe anchors did not exist;
  - grid/a11y titles failed because hidden suffixes remained public.
- Unit 2 green evidence:
  - spacing/card unit command: 18/18 passed;
  - focused grid/a11y Playwright command: 2/2 passed;
  - all 12 locales passed resize down/up prefix identity and count-change-at-most-once;
  - Tablet Blog rest-to-hover reduced the visible prefix while preserving identity.
- Unit 3 red evidence:
  - scale unit title failed because `resolveLandingExpandedScale` did not exist;
  - grid title read absent scale QA attributes;
  - state title read absent floor lifecycle evidence.
- Unit 3 green evidence:
  - `npm test -- tests/unit/landing-grid-plan.test.ts`: 12/12 passed;
  - focused grid/state Playwright command: 2/2 passed;
  - Desktop Wide, Desktop Medium, desktop two-column reached `1.10`; Tablet two-column reached
    `1.04`; no live band/anchor clamp engaged; stage/grid/container/document overflow assertions
    passed.
- Unit 4 red evidence:
  - responsive DOM matrix failed because Mobile subtitle retained `line-clamp-2`;
  - 12-locale grid and Mobile lifecycle titles failed because computed clamp was `2`.
- Unit 4 green evidence:
  - `npm test -- tests/unit/landing-card-contract.test.ts`: 11/11 passed;
  - focused grid/state Playwright command: 2/2 passed.
- Unit 5 red evidence:
  - after calibrating the permitted transition-window subpixel tolerance, all geometry/lifecycle
    assertions passed and only computed root minimum failed (`176px` instead of intrinsic).
- Unit 5 green evidence:
  - `npm test -- tests/unit/landing-card-contract.test.ts`: 12/12 passed;
  - focused grid/state Playwright command: 5/5 passed;
  - Chromium reports the removed fixed minimum as `auto`, which is the A7 no-fixed-minimum contract.
- Unit 6 red evidence:
  - `applies the responsive title/subtitle clamp matrix and BQ-30 tag treatment` failed because the
    source chip still contained `border` and `border-[var(--normal-tag-border)]`;
  - `BQ-30 tag visuals stay borderless with available and unavailable fills` reported `1px` borders
    for Test/Blog/Unavailable and the old Unavailable fill `rgb(236, 232, 223)`.
- Unit 6 green evidence:
  - `npm test -- tests/unit/landing-card-contract.test.ts`: 12/12 passed;
  - prescribed focused BQ-30 Playwright command: 1/1 passed;
  - the re-anchored title-continuity and R1 visual assertions plus BQ-30 smoke: 3/3 passed.
- Unit 7 green evidence:
  - prohibited-path `git diff --name-only` commands printed nothing;
  - unchanged `check-phase10-transition-contracts.mjs` passed;
  - eight no-change unit files passed 45/45 tests;
  - snapshot/baseline/global/behavior-path audit printed nothing and `git diff --check` passed.
- Focused ESLint and `git diff --check` passed after Units 2, 3, 4, and 5.
- Final §17.1 unit command passed 38/38.
- Final §17.1 E2E command passed 54/55. The only failure is the stale local
  `expanded-focus-shell.png` baseline (`403x210` expected, `403x295` current). A direct non-baseline
  rerun confirmed the focused trigger remains inside the expanded surface, the surface remains
  inside the stage, and document overflow is `0`.
- Final §17.2 passed in order: lint clean, typecheck clean, full unit suite 496/496, build green.
- Final §17.3 phase 4/5/6/7/8/10 checkers passed. The unchanged Phase 9 checker failed because its
  regex still requires `desktopShellInlineScale`; runtime now owns measured shell geometry through
  `useCardExpandedScale(...).frameInlineScale`.
- Final §17.3 regression units passed 85/85. Full landing/GNB E2E passed 77/78 with the same sole
  stale screenshot baseline failure.
- No snapshot/baseline file has changed and no forbidden command has run.
- React best-practices review found no additional component, hooks, cleanup, semantics, performance,
  or TypeScript issue.

## Next Immediate Actionable Steps

1. Keep `docs/wave-roadmap.md` unchanged until the user decides how to resolve the stale local
   `expanded-focus-shell.png` baseline debt and the stale Phase 9 matcher.
2. Do not regenerate the baseline or edit Phase 9 under the current Wave 10 authorization.
3. If those debts are separately authorized and resolved, rerun §17.1 -> §17.2 -> §17.3 and only
   then mark Wave 10 complete in the roadmap.

## Key Decisions

- Execute Units 0-9 inline, sequentially, TDD red-to-green, no parallel agents.
- Preserve `deriveNaturalHeightFromGeometry()` and `buildRowCompensationModel()` arithmetic.
- Preserve BQ-24 `RestingFloorMap`, `surfaceMinHeight === '0px'`, and baseline
  `BASELINE_READY -> BASELINE_FROZEN -> BASELINE_READY` ordering.
- A2: JS visible-count changes only at settled/target width; CSS owns flexible-tail width.
- A3: CTA reservation is intrinsic probe width times visibility state plus row gap, never live-row
  consumed width.
- A4: reappearance is tested by resize down/up; Blog rest-to-hover tests CTA-priority shrink.
- A5: normalize measurements to whole pixels before equality comparison; share one cached
  `document.fonts.ready`; remove `loadingdone` listeners on unmount.
- LI-03: card content shell remains `1.04`; measured frame scale supplies the remainder to `1.10`.
  The realized Desktop Wide/Medium/two-column and Tablet anchors did not clamp.
- LI-04 actual branch: implemented. The fixed root `min-h-44` was removed after the complete
  geometry/lifecycle matrix passed; no replacement minimum, row height, floor, or spacer was added.
- LI-05: Mobile Normal subtitles are full text; Desktop/Tablet remain two-line ellipsis.
- BQ-30: tag chips have no border; available tags use `#ECE8DF`; the Unavailable status tag uses
  scoped `#E6E2D8` without changing status semantics.
- LI-06: behavior/routing/storage/telemetry/transition/resolver/i18n-data remain unchanged.
- A6: extend the existing BQ-32 row in place, preserving user decision text verbatim.
- A7: LI-04 should prefer computed root min-height evidence.
- Final gate policy: do not manufacture green by refreshing BQ-07 baselines, editing Phase 9, or
  restoring dead `desktopShellInlineScale` prop plumbing.

## Files to Revisit

- `docs/plans/2026-06-09-wave-10-landing-grid-plan.md`
- `src/features/landing/grid/spacing-plan.ts`
- `src/features/landing/grid/layout-plan.ts`
- `src/features/landing/grid/use-card-inline-geometry.ts`
- `src/features/landing/grid/landing-grid-card.tsx`
- `src/features/landing/grid/landing-grid-card.module.css`
- `src/features/landing/grid/use-grid-geometry-controller.ts`
- `src/features/landing/grid/landing-catalog-grid.tsx`
- `tests/unit/landing-spacing-plan.test.ts`
- `tests/unit/landing-grid-plan.test.ts`
- `tests/unit/landing-card-contract.test.ts`
- `tests/e2e/grid-smoke.spec.ts`
- `tests/e2e/state-smoke.spec.ts`
- `tests/e2e/a11y-smoke.spec.ts`
- `scripts/qa/check-phase4-grid-contracts.mjs`
- `scripts/qa/check-phase5-card-contracts.mjs`
- `scripts/qa/check-phase6-spacing-contracts.mjs`
- `scripts/qa/check-phase9-performance-contracts.mjs` (read-only stale matcher)
- `tests/e2e/state-smoke.spec.ts-snapshots/expanded-focus-shell-chromium-darwin.png` (read-only
  deferred baseline debt)
- `docs/wave-roadmap.md` (leave unchanged until final gates are truly green)
