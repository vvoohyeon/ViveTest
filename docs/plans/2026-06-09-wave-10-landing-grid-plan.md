# Wave 10 Landing Grid Height Rhythm Implementation Plan

> **Plan status:** Awaiting explicit user approval. This document does not authorize implementation by itself.
> **Authoring mode:** Plan Only. Creating this file is the only authorized change for this task.
> **Implementation mode after approval:** Inline execution only, one unit at a time, with a failing
> contract/computed-style test before production code. Do not dispatch parallel agents or automated
> multi-wave pipelines.
> **Wave:** 10 - Landing grid height rhythm.
> **Risk:** High - responsiveness, design-system consistency, usability, accessibility, and lifecycle
> geometry are all in scope.
> **Workspace:** `/Users/woohyeon/Local/ViveTest`, branch `main`.
> **Basis:** `docs/plans/2026-06-09-wave-10-landing-grid-analysis.md`. Section references below point
> to that approved analysis; this plan does not restate its evidence audit.
> **Logic Improvement: approved — W10-LI-01, W10-LI-02, W10-LI-03, W10-LI-04, W10-LI-05, W10-LI-06.**
> LI-04 is conditional and test-first. LI-06 is a no-change guard.
> **Locked follow-up decisions:** Decision B = constrained desktop `1.10x`; Decision C = maximum
> Wave 10 scope/minimum deferred debt, including all §15.1 re-anchors and phase 4/5/6 static-QA sync.
> **Governing decisions:** BQ-19, BQ-21, BQ-24, BQ-30, BQ-31, and user-approved BQ-32.

---

## 1. Goal and Architecture

**Goal:** Stabilize content-driven row height rhythm, deterministic tag/CTA fitting, responsive text
clamps, and constrained desktop expansion while preserving every existing interaction, transition,
storage, telemetry, routing, resolver, and accessibility contract outside the approved Wave 10
surface.

**Architecture:**

1. Keep the existing pure `base_gap + comp_gap` row-local formula and BQ-24 Expanded floor exactly
   separated. Improve only settled-Normal invalidation, observation, and lifecycle suspension.
2. Add a pure visible-prefix resolver to `spacing-plan.ts`. Measure intrinsic tag/CTA widths in a
   card-local inline-geometry hook using an `aria-hidden` paint-contained probe, then unmount the
   hidden suffix from the public tags list.
3. Replace row-index expansion ratios with a pure constrained scale resolver in `layout-plan.ts`.
   Keep content shell scale `1.04`; express desktop width beyond `1.04` through the frame.
4. Keep the large card renderer declarative. Put ResizeObserver/font/inline-width orchestration in
   one new focused hook rather than growing `landing-grid-card.tsx` or mixing horizontal tag/scale
   state into the vertical row compensation controller.

**Tech stack:** Next.js 16, React 19, TypeScript, Tailwind v4 component classes, CSS Modules, Vitest,
JSDOM, Playwright, and repository static QA scripts.

## 2. Authority, Precedence, and Wave Boundary

Apply the authority order from analysis §2:

1. `docs/decision-register.md`
2. `docs/req-landing.md` and active project rules
3. `docs/design/design.md`
4. Current implementation and tests
5. Mockup resources as visual reference only

For BQ-32 tag-fit/CTA behavior specifically, `docs/req-landing.md` and the implementation/tests are
the behavioral SSOT. The mockup is visual reference only under BQ-21. `design.md` records the visual
result, but must not become the owner of measurement, DOM, accessibility, or interaction behavior.

The Wave 10 roadmap boundary remains:

- **Include:** content-driven height, row stretch, measured bottom-anchored tag compensation,
  deterministic tags/CTA fit, responsive clamp correction, constrained desktop expansion, BQ-30,
  all required SSOT re-anchors, and phase 4/5/6 static-QA synchronization.
- **Exclude:** Expanded overlay internals already completed by Wave 6, baseline regeneration,
  mobile-browse visual redesign reserved for Wave 12, GNB/theme cleanup, global token promotion,
  hero/page-shell work, transition/runtime/resolver/i18n-data changes, and later-wave behavior.

## 3. Locked Contracts

### 3.1 LI-01 - row compensation

- Preserve `natural_height`, `row_max`, `needs_comp`, and `comp_gap` arithmetic from analysis §6.
- Preserve rendered gap as `base_gap + comp_gap`.
- `needs_comp=false` means `comp_gap=0` in settled and every sampled transition frame.
- Observe settled Normal card/content geometry, never the Expanded overlay.
- Remeasure after stable content/card resize, viewport/column change, card/locale payload change,
  `document.fonts.ready`, and supported later `FontFaceSet` loading completion.
- Suspend writes during desktop baseline freeze/active/cleanup/handoff and Mobile
  `OPENING/OPEN/CLOSING`; retain the last valid Normal map until Normal settles.
- BQ-24 `RestingFloorMap` and its Expanded-only spacer remain unchanged.

### 3.2 LI-02 / BQ-32 - tag fit and CTA priority

Normalize the public tag sequence in fixed left-to-right order. The unavailable status is the first
priority item and unavailable renders no topical tags.

For a candidate visible prefix of length `k`:

```text
required_width(k) =
  sum(full_intrinsic_width(tag[0 .. k-2]))
  + gap * max(0, k - 1)
  + tail_required_width(tag[k-1])

tail_required_width(tag) =
  natural_width(tag) <= 56px ? natural_width(tag) : 56px
```

Choose the largest prefix whose required width fits after reserving any currently visible Blog CTA.

- All visible tags except the last use full intrinsic width and never ellipsize.
- The last visible tag may flex/ellipsis down to scoped border-box `--tag-min-width: 56px`.
- The 56px border-box minimum includes the 9px chip padding and must retain at least four Latin or
  two CJK characters plus the ellipsis under the realized font metrics.
- A tag whose natural width is `<=56px` is full-width or hidden; it is never ellipsized.
- If the next tag has less than its required tail width, hide it. Hiding is suffix-only/right-first.
- Zero topical tags is valid.
- Blog `Read more →` is always visible on desktop hover/focus and on mobile. Tags consume only the
  remaining width. When the CTA consumes no width at desktop rest, show all available tags that fit,
  up to the catalog maximum of three.
- The visible sequence is always a prefix, so identities never reshuffle. While count is stable, the
  tail item flexes smoothly as width changes. A newly fitting suffix item mounts discretely.
- The hidden suffix is absent from the public `[data-slot="tags"]` DOM and accessibility tree. An
  `aria-hidden`, inert measurement probe may retain intrinsic copies solely for measurement.
- Unavailable `coming soon` remains visible and AT-exposed. The same resolver is used for Test,
  Blog, and Unavailable; priority comes from item semantics, not a per-card-type layout fork.
- Expose `data-tag-count`, `data-visible-tag-count`, and `data-tag-tail-ellipsis` as QA/debug anchors.

### 3.3 LI-03 / Decision B - desktop expansion

Use analysis §7.4 with the locked target:

```text
base_shell_scale =
  reduced_motion ? 1.00 : 1.04

desired_final_scale =
  reduced_motion ? 1.00 :
  viewport_tier == desktop ? 1.10 :
  viewport_tier == tablet ? 1.04 :
  1.00

max_surface_scale =
  1 + available_stage_outset_px / normal_root_width_px

resolved_final_scale =
  min(desired_final_scale, max_surface_scale)

resolved_frame_inline_scale =
  resolved_final_scale / base_shell_scale
```

- Desktop Wide, Desktop Medium, and desktop two-column use one desired final scale: `1.10`.
- Tablet remains `1.04`.
- Content shell scale remains `1.04`; extra width belongs to the frame.
- For an edge anchor, `available_stage_outset_px` is the measured expansion-side allowance. For a
  center anchor, it is twice the smaller measured side allowance.
- Reduced motion resolves to `1.00`.
- Preserve title first-line continuity and `expandedRestingFloorPx / resolvedShellScale`.
- Do not increase a global/stage token to force `1.10`. If the measured clamp resolves below `1.10`,
  retain the safe clamp and report the band/anchor as evidence.

### 3.4 LI-05 - responsive subtitle

- Desktop/Tablet Normal subtitle: two-line ellipsis.
- Mobile Normal subtitle: full text, no line clamp, no ellipsis.
- Existing title matrix remains Desktop/Tablet one-line ellipsis and Mobile full text.
- Taller Mobile Normal cards remain content-driven and must preserve pre-open snapshot, restore,
  OPENING/OPEN/CLOSING, and reduced-motion behavior.

### 3.5 LI-04 - conditional root minimum

`min-h-44` may be removed only after tests cover Normal, desktop overlay placeholder, Mobile
OPENING/CLOSING, OPEN restore, and reduced motion. If any geometry/lifecycle assertion regresses,
restore `min-h-44`, keep the new regression coverage, and record LI-04 as an approved no-change
outcome. Do not weaken the test to force deletion.

### 3.6 LI-06 - no-change guard

No behavior, routing, storage, telemetry, transition, resolver, registry, or i18n-data change is
authorized. Localized rendered widths are measurement inputs only.

## 4. Complete Implementation File Set

Only the following files may change during the later implementation unless a failing gate exposes a
genuine requirement contradiction and the user separately expands scope.

### 4.1 Runtime and styling

| File | Planned responsibility |
|---|---|
| `src/features/landing/grid/spacing-plan.ts` | Preserve compensation functions; add pure BQ-32 visible-prefix decision. |
| `src/features/landing/grid/layout-plan.ts` | Replace row-index width policy with the pure constrained scale resolution. Preserve columns/row membership. |
| `src/features/landing/grid/use-grid-geometry-controller.ts` | Add settled-Normal observer/font invalidation and lifecycle-safe map retention. Do not add tag fitting or a Normal floor map. |
| `src/features/landing/grid/use-card-inline-geometry.ts` | **Create.** Own card-local intrinsic tag/CTA measurement, stable resize/font scheduling, and measured desktop frame-scale input/output. Keep this file over 30 lines and independently driven by pure tested resolvers. |
| `src/features/landing/grid/landing-catalog-grid.tsx` | Pass Mobile lifecycle settlement input; stop passing row-index shell width; preserve equal grid tracks and interaction wiring. |
| `src/features/landing/grid/landing-grid-card.tsx` | Consume inline-geometry results; render visible prefix/probe/CTA width state; apply responsive subtitle classes; conditionally remove `min-h-44`; preserve slot/semantic/lifecycle structure. |
| `src/features/landing/grid/landing-grid-card.module.css` | BQ-30 colors/border removal, scoped 56px minimum, tail flex/ellipsis, CTA width visibility, and no global token changes. |

`src/features/landing/grid/baseline-manager.ts` is reference-only and must remain unchanged.

### 4.2 Tests

| File | Planned coverage |
|---|---|
| `tests/unit/landing-spacing-plan.test.ts` | Existing compensation formula plus exact BQ-32 fit cases. |
| `tests/unit/landing-grid-plan.test.ts` | Desktop `1.10`, Tablet `1.04`, reduced motion, and clamp bounds. |
| `tests/unit/landing-card-contract.test.ts` | DOM/class/slot/CTA/status/BQ-30/clamp and conditional root-minimum contracts. |
| `tests/e2e/grid-smoke.spec.ts` | Geometry, all modes/rows/locales, tag fit/reappearance, BQ-30, clamps, font/resize, overflow. |
| `tests/e2e/state-smoke.spec.ts` | Mobile and desktop lifecycle/handoff/cleanup/reduced-motion preservation. |
| `tests/e2e/a11y-smoke.spec.ts` | Hidden suffix absence, status exposure, Blog whole-card semantics, focus/tab-order preservation. |

No snapshot or baseline file may change.

### 4.3 Ask-First static QA - Decision C approval

Exactly these three `scripts/qa/**` files may change:

- `scripts/qa/check-phase4-grid-contracts.mjs`
- `scripts/qa/check-phase5-card-contracts.mjs`
- `scripts/qa/check-phase6-spacing-contracts.mjs`

Do not edit `_path-config.mjs`, `run-all.mjs`, phase 1-3, or phase 7+ checkers.

### 4.4 SSOT and completion documentation

| File | Planned change |
|---|---|
| `docs/decision-register.md` | Confirm BQ-30/BQ-31 remain authoritative; add BQ-32; append implementation evidence only after gates pass. |
| `docs/req-landing.md` | Apply every analysis §15.1 requirement delta, amended by BQ-32. |
| `docs/design/design.md` | Apply every analysis §15.1 visual delta without taking ownership of behavior. |
| `docs/wave-roadmap.md` | Mark Wave 10 complete only after all completion conditions pass; record files and non-baseline validation. |
| `docs/plans/2026-06-09-wave-10-landing-grid-plan.md` | During implementation, check completed units and record LI-04's actual outcome if project plan maintenance requires it. No scope expansion may be self-authorized here. |

## 5. Impact Assessment

| Dimension | Impact and guard |
|---|---|
| Shared shell/GNB | No GNB or page-shell edit. Document/container overflow is tested because expanded frames overlay shared page geometry. |
| Localization | No message/data edits. All 12 locales are rendered as width inputs in Playwright. |
| Accessibility | Hidden suffix is unmounted; probe is `aria-hidden`/inert; `coming soon` remains exposed; Blog whole-card link remains the only control. |
| State contracts | Measurement writes are suspended through Mobile and desktop transient states. No interaction reducer/controller behavior changes. |
| Core user flow | Test/Blog navigation, pre-answer, transition, storage, and telemetry are no-change surfaces. |
| Responsiveness | High risk: every column mode, row position, threshold edge, and Mobile lifecycle must pass. |
| Performance | RAF-coalesced observers, intrinsic probes, and equality guards prevent repeated state writes and observer loops. |
| Design system | BQ-30 scoped tokens only. No `globals.css`, global token promotion, or Wave 16 work. |

## 6. Execution Protocol

1. Work inline. Do not use subagents.
2. Execute exactly one unit at a time.
3. Add the named failing tests/assertions first and run the unit's red command.
4. Implement the minimum production change.
5. Run the unit's green commands. Do not advance on a failure.
6. Inspect the diff for unit scope before starting the next unit.
7. Do not commit, push, merge, reset, update a checkpoint, or touch `legacy/reference` unless the
   user separately authorizes that operation.
8. If a unit needs an unlisted file, stop and request scope approval before editing it.

## 7. Unit 0 - Implementation Preflight and Red-Test Inventory

**Files modified:** none.

- [ ] Re-read this plan, analysis §2/§6/§7/§8/§12/§13/§15/§16/§17, Wave 10 roadmap entry,
  BQ-24/BQ-30/BQ-31, and the live BQ-32 user decision.
- [ ] Verify `pwd`, branch `main`, clean/understood worktree, and current HEAD.
- [ ] Confirm the implementation file set in §4 and that no snapshot/baseline files are modified.
- [ ] Record the exact test titles from Units 1-6 before editing static QA so the checker anchors
  cannot drift.

Run:

```bash
pwd
git branch --show-current
git rev-parse --short HEAD
git status --short
git diff --name-only
```

Expected: `/Users/woohyeon/Local/ViveTest`, `main`, and no unexplained implementation diff.

## 8. Unit 1 - LI-01 Compensation Invalidation and Lifecycle

**Files:**

- Modify: `tests/unit/landing-spacing-plan.test.ts`
- Modify: `tests/e2e/grid-smoke.spec.ts`
- Modify: `tests/e2e/state-smoke.spec.ts`
- Modify: `src/features/landing/grid/use-grid-geometry-controller.ts`
- Modify: `src/features/landing/grid/landing-catalog-grid.tsx`

**Risk:** Responsiveness, performance, desktop baseline order, and Mobile lifecycle.

### 8.1 Red tests

- [ ] Add unit test: `keeps non-comp compensation at zero for repeated normalized measurements`.
  It must prove applied compensation subtraction does not drift natural height or create a positive
  gap after repeated passes.
- [ ] Add grid smoke: `font-ready and resize remeasure preserve settled compensation`.
  Cover resize down/up, a controlled `document.fonts.ready` completion, shortest/tallest/equal cards,
  row 0, later rows, and an underfilled final row.
- [ ] Add state smoke: `transition frames keep non-comp gap at zero through mobile and desktop lifecycle states`.
  Sample Mobile `OPENING/OPEN/CLOSING/NORMAL`, desktop opening/steady/closing/cleanup-pending, and
  handoff. For every sampled `data-needs-comp="false"` card, require `data-comp-gap="0"`.

Run red:

```bash
npm test -- tests/unit/landing-spacing-plan.test.ts
npx playwright test tests/e2e/grid-smoke.spec.ts tests/e2e/state-smoke.spec.ts \
  --grep "font-ready and resize remeasure|transition frames keep non-comp gap" \
  --workers=1
```

Expected before implementation: new observer/font/lifecycle assertions fail while existing
compensation arithmetic tests remain green.

### 8.2 Minimal implementation

- [ ] Keep `deriveNaturalHeightFromGeometry()` and `buildRowCompensationModel()` formulas unchanged.
- [ ] Replace the one-shot spacing layout effect with one RAF-coalesced scheduler.
- [ ] Observe stable public Normal card/content boxes with one `ResizeObserver`; do not observe the
  Expanded surface or a probe dimension changed by the resulting state.
- [ ] Schedule after `document.fonts.ready`. When supported, listen for `document.fonts`
  `loadingdone`; remove the listener on cleanup.
- [ ] Pass the current Mobile lifecycle phase from `landing-catalog-grid.tsx`.
- [ ] Suspend measurement writes while:
  - desktop active visual card exists;
  - baseline is frozen or cleanup/handoff is not settled;
  - Mobile phase is not `NORMAL`.
- [ ] If required Normal nodes are temporarily absent, preserve the prior per-card spacing decision
  rather than writing a fallback zero measurement.
- [ ] Keep the existing equality guard; commit state only when normalized values differ.
- [ ] On return to settled Normal, schedule exactly one fresh measurement.
- [ ] Do not touch `RestingFloorMap`, floor capture, baseline reducer ordering, or release timer.

### 8.3 Green verification

```bash
npm test -- tests/unit/landing-spacing-plan.test.ts
npx playwright test tests/e2e/grid-smoke.spec.ts tests/e2e/state-smoke.spec.ts \
  --grep "font-ready and resize remeasure|transition frames keep non-comp gap" \
  --workers=1
```

Expected: all named tests pass; no observer loop, state-update warning, or transient zero-map write.

## 9. Unit 2 - LI-02 / BQ-32 Visible Prefix and CTA Priority

**Files:**

- Modify: `tests/unit/landing-spacing-plan.test.ts`
- Modify: `tests/unit/landing-card-contract.test.ts`
- Modify: `tests/e2e/grid-smoke.spec.ts`
- Modify: `tests/e2e/a11y-smoke.spec.ts`
- Modify: `src/features/landing/grid/spacing-plan.ts`
- Create: `src/features/landing/grid/use-card-inline-geometry.ts`
- Modify: `src/features/landing/grid/landing-grid-card.tsx`
- Modify: `src/features/landing/grid/landing-grid-card.module.css`

**Risk:** Localization, accessibility, resize performance, CTA visibility, and hydration.

### 9.1 Red tests

- [ ] Add pure test: `resolves tag tail ellipsis with right-first hiding and growth reappearance`.
  Cover exact fit, one-pixel under, one-pixel over, zero-fit, all-fit, gap accounting, a natural
  width below 56px, a natural width above 56px, shrink, and widen.
- [ ] Add pure test: `keeps mandatory status-first prefix visible`.
  The status item remains first and visible; topical suffix is removed right-first.
- [ ] Add DOM test: `unmounts hidden tag suffix while preserving CTA and status semantics`.
  Require total/visible count attributes, absent hidden suffix in public list, `aria-hidden` probe,
  Blog CTA non-interactivity, and exposed `coming soon`.
- [ ] Add grid smoke:
  `tag tail ellipsis hides right-first and reappears on widen across all 12 locales`.
  Import `locales` from `src/config/site.ts`, cover Test and Blog, and assert the same prefix
  identities before/after shrink/widen.
- [ ] Add a11y smoke:
  `hidden tag suffix stays out of the tree while CTA and coming-soon status keep priority`.

Run red:

```bash
npm test -- \
  tests/unit/landing-spacing-plan.test.ts \
  tests/unit/landing-card-contract.test.ts
npx playwright test tests/e2e/grid-smoke.spec.ts tests/e2e/a11y-smoke.spec.ts \
  --grep "tag tail ellipsis|hidden tag suffix" \
  --workers=1
```

Expected before implementation: visible-prefix, reappearance, and hidden-suffix assertions fail.

### 9.2 Pure resolver

- [ ] Add `TAG_MIN_WIDTH_PX = 56`.
- [ ] Add `TagFitInput` with `availableWidth`, `intrinsicWidths`, `gap`, and
  `requiredVisiblePrefixCount`.
- [ ] Add `TagFitDecision` with `visibleCount`, `tailIndex`, and `tailMayEllipsize`.
- [ ] Add `resolveVisibleTagPrefix(input)` implementing §3.2 exactly.
- [ ] Normalize non-finite/negative dimensions to zero and preserve fixed order.
- [ ] Never put DOM APIs, locale tables, card types, CTA copy, or React state in the pure resolver.

### 9.3 Measurement hook and rendering

- [ ] Create `use-card-inline-geometry.ts` with a single RAF scheduler, `ResizeObserver`, equality
  guard, `document.fonts.ready`, optional `loadingdone`, and cleanup.
- [ ] Measure:
  - stable public tag-row content-box width;
  - tag gap;
  - every tag item's intrinsic border-box width from the hidden probe;
  - Blog CTA intrinsic width from the probe;
  - actual CTA-consumed width from the live row.
- [ ] Render the probe outside the public `<ul>`, absolute/paint-contained, `aria-hidden="true"`,
  inert, and non-interactive.
- [ ] Keep the live list as the resolver's prefix only. No clipped hidden suffix remains inside it.
- [ ] Render prior visible tags at full intrinsic width.
- [ ] Add scoped root `--tag-min-width: 56px` before applying the flexible-tail class.
- [ ] Render only the last visible tag as flexible when `tailMayEllipsize=true`, with border-box
  minimum `var(--tag-min-width)` and intrinsic maximum. Let CSS flex sizing reveal it smoothly.
- [ ] Keep a short natural tail full-width or hidden; do not ellipsize it.
- [ ] Change desktop-hover Blog CTA width consumption from always-reserved invisible space to:
  zero width at rest, measured width on hover/focus, always measured/full width on Mobile.
- [ ] Preserve CTA `aria-hidden`, lack of nested control, whole-card Blog link, and 6px label/arrow
  gap.
- [ ] Expose the three data attributes named in §3.2.

### 9.4 Green verification

```bash
npm test -- \
  tests/unit/landing-spacing-plan.test.ts \
  tests/unit/landing-card-contract.test.ts
npx playwright test tests/e2e/grid-smoke.spec.ts tests/e2e/a11y-smoke.spec.ts \
  --grep "tag tail ellipsis|hidden tag suffix" \
  --workers=1
```

Expected: all 12 locales pass shrink/widen; prefixes never reorder; hidden tags are absent from the
public DOM/a11y tree; CTA/status priority remains intact.

## 10. Unit 3 - LI-03 Constrained Desktop `1.10x`

**Files:**

- Modify: `tests/unit/landing-grid-plan.test.ts`
- Modify: `tests/e2e/grid-smoke.spec.ts`
- Modify: `tests/e2e/state-smoke.spec.ts`
- Modify: `src/features/landing/grid/layout-plan.ts`
- Modify: `src/features/landing/grid/use-card-inline-geometry.ts`
- Modify: `src/features/landing/grid/landing-catalog-grid.tsx`
- Modify: `src/features/landing/grid/landing-grid-card.tsx`

**Risk:** Horizontal overflow, clipping, title continuity, BQ-24 floor, and reduced motion.

### 10.1 Red tests

- [ ] Replace row-index ratio assertions with unit test:
  `constrains desktop final scale to 1.10 while keeping tablet at 1.04`.
  Cover Desktop Wide/Medium/two-column, edge/center allowance, a clamped allowance, Tablet, Mobile,
  reduced motion, zero root width, and non-finite inputs.
- [ ] Add grid smoke:
  `active expanded width and zero horizontal overflow cover edge and center cards across all column modes`.
  Cover row 0/later/underfilled rows, first/middle/last cards, and every column mode.
- [ ] In that smoke, assert surface width scale, content shell scale `1.04`, frame scale, transform
  origin, stage containment, grid/container/document `scrollWidth <= clientWidth`, and readable slot
  bounds.
- [ ] Extend state smoke to assert title split and BQ-24 floor values do not change during
  opening/steady/closing/handoff/cleanup.

Run red:

```bash
npm test -- tests/unit/landing-grid-plan.test.ts
npx playwright test tests/e2e/grid-smoke.spec.ts tests/e2e/state-smoke.spec.ts \
  --grep "active expanded width and zero horizontal overflow|desktop title|resting floor" \
  --workers=1
```

Expected before implementation: row-0/two-column desktop scale assertions fail.

### 10.2 Pure scale resolution

- [ ] Add `DESKTOP_EXPANDED_DESIRED_FINAL_SCALE = 1.1`.
- [ ] Add `TABLET_EXPANDED_DESIRED_FINAL_SCALE = 1.04`.
- [ ] Add `resolveLandingExpandedScale()` returning:
  `baseShellScale`, `desiredFinalScale`, `maxSurfaceScale`, `resolvedFinalScale`,
  `frameInlineScale`.
- [ ] Implement the exact §3.3 formula with normalized finite inputs.
- [ ] Remove `DESKTOP_LOWER_ROW_SHELL_INLINE_SCALE`,
  `resolveLandingRowExpandedShellInlineScale()`, and `expandedShellInlineScale` from row plans.
- [ ] Preserve every column threshold, row boundary, underfilled-row rule, and track count.

### 10.3 Measured use

- [ ] Extend `use-card-inline-geometry.ts` to measure settled root width and the available stage
  allowance from actual computed geometry/custom properties.
- [ ] Convert left/center/right allowance to the single `availableStageOutsetPx` input described in
  §3.3.
- [ ] Return the pure resolution; update state only when the normalized resolution changes.
- [ ] Stop passing row-derived shell inline scale from `landing-catalog-grid.tsx`.
- [ ] Use hook-provided `frameInlineScale` in `landing-grid-card.tsx`.
- [ ] Add QA attributes for desired, max, resolved final, and frame scale.
- [ ] Keep `resolvedShellScale = reducedMotion ? 1 : 1.04`.
- [ ] Do not change title-continuity measurement/freeze or Expanded floor division.

### 10.4 Green verification

```bash
npm test -- tests/unit/landing-grid-plan.test.ts
npx playwright test tests/e2e/grid-smoke.spec.ts tests/e2e/state-smoke.spec.ts \
  --grep "active expanded width and zero horizontal overflow|desktop title|resting floor" \
  --workers=1
```

Expected: all desktop bands desire `1.10`, Tablet resolves `1.04`, reduced motion resolves `1.00`,
and every active edge/center case has zero container/document horizontal overflow.

## 11. Unit 4 - LI-05 Mobile Full Subtitle

**Files:**

- Modify: `tests/unit/landing-card-contract.test.ts`
- Modify: `tests/e2e/grid-smoke.spec.ts`
- Modify: `tests/e2e/state-smoke.spec.ts`
- Modify: `src/features/landing/grid/landing-grid-card.tsx`

**Risk:** Mobile card height, snapshot/restore geometry, and localization.

### 11.1 Red tests

- [ ] Add DOM assertions for the full title/subtitle matrix.
- [ ] Add grid smoke:
  `mobile full subtitle preserves tag-row geometry across all 12 locales`.
  Require Mobile subtitle computed clamp `none`, full scroll height, no ellipsis, positive base gap,
  and no one-card-row artificial compensation.
- [ ] Extend state smoke to compare the taller pre-open card height with OPENING snapshot and final
  NORMAL restore height under normal and reduced motion.

Run red:

```bash
npm test -- tests/unit/landing-card-contract.test.ts
npx playwright test tests/e2e/grid-smoke.spec.ts tests/e2e/state-smoke.spec.ts \
  --grep "mobile full subtitle|Mobile.*subtitle|pre-open" \
  --workers=1
```

Expected before implementation: Mobile subtitle still reports a two-line clamp.

### 11.2 Minimal implementation

- [ ] Thread `isMobileViewport` into Normal subtitle class resolution.
- [ ] Keep Desktop/Tablet `line-clamp-2`.
- [ ] On Mobile, remove clamp/ellipsis/hidden overflow and render full text.
- [ ] Preserve subtitle source, typography, slot order, base gap, tag row, and all Expanded branches.
- [ ] Do not add fixed height/minimum or compensate a one-card Mobile row.

### 11.3 Green verification

```bash
npm test -- tests/unit/landing-card-contract.test.ts
npx playwright test tests/e2e/grid-smoke.spec.ts tests/e2e/state-smoke.spec.ts \
  --grep "mobile full subtitle|Mobile.*subtitle|pre-open" \
  --workers=1
```

Expected: matrix and lifecycle assertions pass across all 12 locales.

## 12. Unit 5 - LI-04 Conditional `min-h-44` Removal

**Files:**

- Modify: `tests/unit/landing-card-contract.test.ts`
- Modify: `tests/e2e/grid-smoke.spec.ts`
- Modify: `tests/e2e/state-smoke.spec.ts`
- Conditionally modify: `src/features/landing/grid/landing-grid-card.tsx`

**Risk:** Usability target minimum, placeholder height, transient shell geometry, and reduced motion.

### 12.1 Establish coverage before deletion

- [ ] Add computed geometry coverage for:
  Normal Test/Blog/Unavailable, desktop active placeholder, desktop cleanup, Mobile
  OPENING/OPEN/CLOSING/NORMAL, and reduced motion.
- [ ] Assert row stretch, trigger coverage, card outer height restoration, snapshot height,
  non-target isolation, and no 44px hit-target regression for actual controls.
- [ ] Add a contract assertion that the fixed root `min-h-44` class is absent. This is the deliberate
  failing assertion that authorizes the minimal deletion attempt.

Run red:

```bash
npm test -- tests/unit/landing-card-contract.test.ts
npx playwright test tests/e2e/grid-smoke.spec.ts tests/e2e/state-smoke.spec.ts \
  --grep "root minimum|placeholder|OPENING|CLOSING|reduced-motion" \
  --workers=1
```

Expected before deletion: only the fixed-root-minimum assertion fails; geometry assertions establish
the baseline.

### 12.2 Conditional implementation and decision

- [ ] Remove only `min-h-44` from `LANDING_GRID_CARD_ROOT_CLASSNAME`.
- [ ] Re-run the full Unit 5 matrix.
- [ ] If every assertion passes, keep the deletion and record LI-04 as implemented.
- [ ] If any geometry/lifecycle assertion fails because of the deletion, restore `min-h-44`, remove
  only the deletion-specific expectation, retain all new geometry coverage, and record
  `LI-04 approved/tested — no runtime change; fixed minimum remains required`.
- [ ] Do not replace it with another fixed minimum, row height, floor map, or spacer.

Green command:

```bash
npm test -- tests/unit/landing-card-contract.test.ts
npx playwright test tests/e2e/grid-smoke.spec.ts tests/e2e/state-smoke.spec.ts \
  --grep "root minimum|placeholder|OPENING|CLOSING|reduced-motion" \
  --workers=1
```

Expected: the retained branch is fully green and documented without weakening geometry coverage.

## 13. Unit 6 - BQ-30 Borderless Tag Visuals

**Files:**

- Modify: `tests/unit/landing-card-contract.test.ts`
- Modify: `tests/e2e/grid-smoke.spec.ts`
- Modify: `src/features/landing/grid/landing-grid-card.tsx`
- Modify: `src/features/landing/grid/landing-grid-card.module.css`

**Risk:** Design-system consistency and unavailable status readability.

### 13.1 Red tests

- [ ] Add DOM test:
  `applies the responsive title/subtitle clamp matrix and BQ-30 tag treatment`.
- [ ] Add grid smoke:
  `BQ-30 tag visuals stay borderless with available and unavailable fills`.
- [ ] Require computed `border-width: 0px`, available Test/Blog background `#ECE8DF`, unavailable
  status background `#E6E2D8`, radius `5px`, 9px inline padding, nowrap, no dot, and no
  `text-transform`.

Run red:

```bash
npm test -- tests/unit/landing-card-contract.test.ts
npx playwright test tests/e2e/grid-smoke.spec.ts \
  --grep "BQ-30 tag visuals|BQ-30 tag treatment" \
  --workers=1
```

Expected before implementation: old border and unavailable shared fill assertions fail.

### 13.2 Minimal implementation

- [ ] Remove the tag chip border utility and scoped `--normal-tag-border`.
- [ ] Keep `--normal-tag-bg: #ECE8DF`.
- [ ] Add scoped `--unavailable-tag-bg: #E6E2D8`.
- [ ] Add `.root.unavailableCard` tag-chip override using only the unavailable fill.
- [ ] Preserve radius, nowrap, ellipsis capability, source-owned casing, and status semantics.
- [ ] Do not edit `globals.css`.

### 13.3 Green verification

```bash
npm test -- tests/unit/landing-card-contract.test.ts
npx playwright test tests/e2e/grid-smoke.spec.ts \
  --grep "BQ-30 tag visuals|BQ-30 tag treatment" \
  --workers=1
```

Expected: exact colors and borderless treatment pass for Test, Blog, and Unavailable.

## 14. Unit 7 - LI-06 No-Change Behavior Guard

**Runtime files modified:** none.

- [ ] Review the diff and require no changes under:
  `src/features/transition/**`, `src/features/telemetry/**`,
  `src/features/variant-registry/**`, `src/features/test/**`, `src/i18n/**`,
  `src/messages/**`, `src/lib/routes/**`, route files, or consent/storage code.
- [ ] Require no change to card interaction handlers, route targets, transition calls, storage keys,
  telemetry events/payloads, resolver inputs, or localized source values.
- [ ] Run existing no-change guards.

Run:

```bash
git diff --name-only -- \
  src/features/transition \
  src/features/telemetry \
  src/features/variant-registry \
  src/features/test \
  src/i18n \
  src/messages \
  src/lib/routes
node scripts/qa/check-phase10-transition-contracts.mjs
npm test -- \
  tests/unit/landing-transition-runtime.test.ts \
  tests/unit/landing-transition-store.test.ts \
  tests/unit/landing-telemetry-validation.test.ts \
  tests/unit/landing-telemetry-runtime.test.ts \
  tests/unit/landing-data-contract.test.ts \
  tests/unit/variant-registry-runtime-integrity.test.ts \
  tests/unit/route-builder.test.ts \
  tests/unit/localized-path.test.ts
```

Expected: the diff command prints nothing and every guard passes. Any diff in these paths is a scope
violation, not an implementation opportunity.

## 15. Unit 8 - Ask-First Static-QA Synchronization

**Files:**

- Modify: `scripts/qa/check-phase4-grid-contracts.mjs`
- Modify: `scripts/qa/check-phase5-card-contracts.mjs`
- Modify: `scripts/qa/check-phase6-spacing-contracts.mjs`

The edits below are the complete approved `scripts/qa/**` scope.

### 15.1 Phase 4 exact edits - active width and overflow

- [ ] Read `layout-plan.ts` and require:
  - `DESKTOP_EXPANDED_DESIRED_FINAL_SCALE` with value `1.1`;
  - `TABLET_EXPANDED_DESIRED_FINAL_SCALE` with value `1.04`;
  - `resolveLandingExpandedScale`;
  - `Math.min(desiredFinalScale, maxSurfaceScale)` or the equivalent named final assignment.
- [ ] Require unit title:
  `constrains desktop final scale to 1.10 while keeping tablet at 1.04`.
- [ ] Require grid-smoke title:
  `active expanded width and zero horizontal overflow cover edge and center cards across all column modes`.
- [ ] Require that the named smoke contains both `scrollWidth` and `clientWidth`, and anchors
  `desktop-wide`, `desktop-medium`, `two-column`, edge, and center cases.
- [ ] Keep all current column/underfilled/threshold/title assertions.

### 15.2 Phase 5 exact edits - BQ-30 and responsive clamps

- [ ] Add `landing.grid.gridCardCss` to `requiredFiles`.
- [ ] Read card source and require:
  `data-visible-tag-count`, `data-tag-tail-ellipsis`, Mobile subtitle branch, and the existing
  Desktop/Tablet `line-clamp-2` path.
- [ ] Read CSS and require:
  - `--normal-tag-bg: #ece8df`;
  - `--unavailable-tag-bg: #e6e2d8`;
  - `--tag-min-width: 56px`;
  - no `--normal-tag-border`;
  - no tag-chip `border` declaration/utility.
- [ ] Require unit titles:
  - `applies the responsive title/subtitle clamp matrix and BQ-30 tag treatment`;
  - `unmounts hidden tag suffix while preserving CTA and status semantics`.
- [ ] Require grid-smoke titles:
  - `tag tail ellipsis hides right-first and reappears on widen across all 12 locales`;
  - `mobile full subtitle preserves tag-row geometry across all 12 locales`;
  - `BQ-30 tag visuals stay borderless with available and unavailable fills`.
- [ ] Keep existing Normal slot, unavailable status, Blog whole-card, and subtitle contamination
  anchors.

### 15.3 Phase 6 exact edits - hybrid measurement and prohibitions

- [ ] Read `use-grid-geometry-controller.ts` and require:
  `ResizeObserver`, `requestAnimationFrame`, `document.fonts`, `ready`, equality-guarded spacing
  state, `deriveNaturalHeightFromGeometry`, and `buildRowCompensationModel`.
- [ ] Require unit titles:
  - `keeps non-comp compensation at zero for repeated normalized measurements`;
  - `resolves tag tail ellipsis with right-first hiding and growth reappearance`;
  - `keeps mandatory status-first prefix visible`.
- [ ] Add `e2e.stateSmoke` to `requiredFiles`.
- [ ] Require grid-smoke title:
  `font-ready and resize remeasure preserve settled compensation`.
- [ ] Require state-smoke title:
  `transition frames keep non-comp gap at zero through mobile and desktop lifecycle states`.
- [ ] Preserve the current auto-spacer rejection checks unchanged:
  `margin-top:auto`, `space-between`, filler `flex`, and landing-card pseudo-spacers.
- [ ] Continue requiring explicit `base_gap + comp_gap`, direct geometry, and residual convergence.
- [ ] Do not add a checker exemption for a Normal floor map, explicit row height, or fixed minimum
  used to simulate rhythm.

### 15.4 Static-QA red/green sequence

After production/test titles change but before checker edits:

```bash
node scripts/qa/check-phase4-grid-contracts.mjs
node scripts/qa/check-phase5-card-contracts.mjs
node scripts/qa/check-phase6-spacing-contracts.mjs
```

Expected red: stale/missing Wave 10 anchors fail.

After only the declared checker edits:

```bash
node scripts/qa/check-phase4-grid-contracts.mjs
node scripts/qa/check-phase5-card-contracts.mjs
node scripts/qa/check-phase6-spacing-contracts.mjs
git diff --name-only -- scripts/qa
```

Expected green: all three pass; the diff lists exactly the three approved checker files.

## 16. Unit 9 - SSOT Re-anchor and Wave Completion Documentation

**Files:**

- Modify: `docs/decision-register.md`
- Modify: `docs/req-landing.md`
- Modify: `docs/design/design.md`
- Modify after all gates: `docs/wave-roadmap.md`

Do this unit after runtime/tests/static QA are green so documents describe actual behavior.

### 16.1 Decision register

- [ ] Keep BQ-30 and BQ-31 meanings intact; append actual Wave 10 implementation evidence only.
- [ ] Add BQ-32 with this decision:

```text
BQ-32 | Catalog tag fitting uses one measured left-to-right visible prefix. Every visible tag except
the tail is full intrinsic width. The tail may ellipsize to scoped border-box --tag-min-width:56px;
a naturally shorter tag is full or hidden. Insufficient next-tail width hides the suffix right-first.
Blog Read more → has priority when visible; hidden tag suffix is unmounted. Visible identities remain
prefix-stable through width changes; the tail flexes smoothly and newly fitting suffix tags mount
discretely. The rule is uniform across Test/Blog/Unavailable, while coming soon remains the first,
visible, AT-exposed status item. req-landing/code/tests are behavioral SSOT; mockup is visual
reference only under BQ-21. | User decision, Wave 10 approved plan | Supersedes analysis §8.2's
whole-chip/no-ellipsis tail detail; drives W10-LI-02 and phase 5/6 QA. | No (Wave 10) |
No locale thresholds, per-type hiding implementation, clipped hidden DOM, or i18n-data change.
```

### 16.2 `docs/req-landing.md` - every analysis §15.1 delta

- [ ] §6.6:
  - split subtitle matrix into Desktop/Tablet two-line ellipsis and Mobile full text;
  - add BQ-32 measured prefix, tail 56px ellipsis, short-tail full-or-hidden, suffix-only hiding,
    widen reappearance, CTA/status priority, and hidden-suffix DOM/a11y rule;
  - preserve title matrix and one-line tag-row contract.
- [ ] §6.7:
  - keep the current arithmetic;
  - clarify BQ-31 slack as measured `comp_gap`, never automatic flex distribution;
  - add settled-Normal resize/font invalidation and lifecycle retention proof.
- [ ] §8.4:
  - content scale `1.04`;
  - desired final desktop scale `1.10` for Wide/Medium/two-column;
  - Tablet `1.04`;
  - exact clamp formula and frame-owned extra width;
  - replace stale row-0/two-column `1.04x` wording.
- [ ] §9.3 and §13.2:
  - `coming soon` is first, always visible, AT-exposed, and not removed by suffix hiding.
- [ ] §14.2:
  - add active-state zero-overflow across all modes/rows/anchors;
  - font-ready/resize compensation;
  - transition-frame zero comp for non-comp cards;
  - BQ-32 shrink/hide/reappear across 12 locales;
  - CTA/status priority;
  - Mobile full subtitle;
  - BQ-30 exact visuals;
  - title/subtitle clamp matrix.
- [ ] Do not fix the pre-existing removed-Blog-Expanded subtitle debt outside these deltas.

### 16.3 `docs/design/design.md` - visual re-anchor only

- [ ] §4.3 and §4.11: Desktop/Tablet subtitle two-line; Mobile full.
- [ ] §5.6: remove catalog tag border wording; retain available `#ECE8DF`; describe the scoped
  unavailable application value without global promotion.
- [ ] §6.3: borderless shared chip; visual tail-ellipsis minimum; unavailable fill remains an
  application-layer exception.
- [ ] §7.2: Mobile full subtitle and one visual surplus region above bottom-anchored tags. Do not
  define compensation arithmetic here.
- [ ] §7.4: one-line tags/CTA, CTA priority, left-prefix identity, flexible tail, suffix hiding, and
  rest-state full-row use.
- [ ] §7.5: `#E6E2D8` unavailable tag fill, no border, status readability.
- [ ] §7.7: equal tracks, zero horizontal overflow, desktop desired `1.10` with safety clamp,
  shell `1.04`, Tablet `1.04`; remove stale conservative row-width wording.
- [ ] Preserve BQ-21 boundary text and avoid breakpoint/gutter changes.

### 16.4 Roadmap completion

Only after §18 completion conditions pass:

- [ ] Change Wave 10 status to complete.
- [ ] Record the actual LI-04 branch.
- [ ] Record exact changed files and non-baseline validation commands/results.
- [ ] Preserve Wave 11 handoff and later-wave scope.
- [ ] Keep baseline debt as deferred debt, not a Wave 10 failure or regenerated artifact.

Verify documentation:

```bash
git diff --check -- \
  docs/decision-register.md \
  docs/req-landing.md \
  docs/design/design.md \
  docs/wave-roadmap.md
rg -n "BQ-32|1\\.10|1\\.04|tag-min-width|56px|E6E2D8|ECE8DF|Mobile.*full|horizontal overflow" \
  docs/decision-register.md docs/req-landing.md docs/design/design.md docs/wave-roadmap.md
```

Expected: no whitespace errors and every required anchor is present in its proper authority layer.

## 17. Non-Baseline Validation Matrix

All validation is non-baseline. No screenshot assertion may create or update a baseline.

| Layer | Required proof |
|---|---|
| Unit | `landing-spacing-plan.test.ts`: compensation stability; BQ-32 exact/under/over/zero/all fit; 56px tail; short-tail no ellipsis; gap; status priority; growth reappearance. `landing-grid-plan.test.ts`: Desktop Wide/Medium/two-column `1.10`, Tablet `1.04`, reduced motion, edge/center clamp. `landing-card-contract.test.ts`: DOM suffix removal, CTA/status semantics, responsive clamps, BQ-30, LI-04 branch. |
| DOM/computed style | D/T title one line; Mobile title full; D/T subtitle two lines; Mobile subtitle full; tag border zero; available `#ECE8DF`; unavailable `#E6E2D8`; 56px border-box tail; hidden suffix absent; CTA/status semantics preserved. |
| Playwright grid/state | Equal widths; row bottom equality; `base_gap>0`; tallest/equal/short compensation; row 0/later/underfilled; resize down/up; fonts ready; all 12 locales; Mobile full description; tail ellipsis/right-first hide/reappear; CTA/status priority; active edge/center expansion in every mode; stage/surface/grid/container/document overflow zero; transition-frame non-comp zero; Mobile and desktop lifecycle preservation. |
| Playwright a11y | Hidden suffix absent from tree; probe hidden/inert; status exposed; Blog whole-card link remains sole link/control; focus/tab order unchanged. |
| Static QA | Updated phase 4/5/6 exact anchors from §15; unchanged phase 7/8/9/10 behavior gates. |
| Manual | Threshold edges; first/middle/last cards; long English/German/Russian/Indonesian and CJK/Korean; zero/one/many tags; Blog CTA rest/hover/focus/mobile; unavailable status; idle resize and post-close resize; visible clipping inspection without snapshots. |
| Standard gates | Basic gates in order, then the full landing-specific commands from `verification-commands.md`. |

### 17.1 Unit and focused E2E

```bash
npm test -- \
  tests/unit/landing-spacing-plan.test.ts \
  tests/unit/landing-grid-plan.test.ts \
  tests/unit/landing-card-contract.test.ts \
  tests/unit/landing-baseline-manager.test.ts
npx playwright test \
  tests/e2e/grid-smoke.spec.ts \
  tests/e2e/state-smoke.spec.ts \
  tests/e2e/a11y-smoke.spec.ts \
  --workers=1
```

### 17.2 Basic gates - required order

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

### 17.3 Landing static and regression gates

```bash
node scripts/qa/check-phase4-grid-contracts.mjs
node scripts/qa/check-phase5-card-contracts.mjs
node scripts/qa/check-phase6-spacing-contracts.mjs
node scripts/qa/check-phase7-state-contracts.mjs
node scripts/qa/check-phase8-accessibility-contracts.mjs
node scripts/qa/check-phase9-performance-contracts.mjs
node scripts/qa/check-phase10-transition-contracts.mjs
npm test -- \
  tests/unit/landing-interaction-dom.test.ts \
  tests/unit/landing-hover-intent.test.ts \
  tests/unit/landing-mobile-lifecycle.test.ts \
  tests/unit/landing-desktop-shell-phase.test.ts \
  tests/unit/landing-grid-plan.test.ts \
  tests/unit/landing-baseline-manager.test.ts \
  tests/unit/gnb-behavior.test.ts \
  tests/unit/gnb-desktop-settings.test.ts \
  tests/unit/gnb-mobile-menu.test.ts \
  tests/unit/gnb-back-navigation.test.ts \
  tests/unit/gnb-theme-transition.test.ts
npx playwright test \
  tests/e2e/grid-smoke.spec.ts \
  tests/e2e/state-smoke.spec.ts \
  tests/e2e/gnb-smoke.spec.ts \
  tests/e2e/a11y-smoke.spec.ts \
  --workers=1
```

If an unchanged phase 7/8/9/10 gate fails, diagnose and report it. Do not edit that checker or an
out-of-scope runtime area to manufacture a pass.

## 18. Completion Conditions / Proof Obligations

Wave 10 is not done until all of the following are proven:

- [ ] Active-state document and landing container have zero horizontal overflow in Desktop Wide,
  Desktop Medium, desktop two-column, Tablet, row 0, later rows, underfilled final rows, and
  edge/center expansion.
- [ ] Same-row widths remain equal and non-target top/bottom/outer-height isolation remains `0px`.
- [ ] `needs_comp=false => comp_gap=0` in settled and sampled transition frames.
- [ ] Equal-natural-height rows keep all cards non-compensated.
- [ ] `document.fonts.ready`, supported later font completion, and resize down/up remeasure safely.
- [ ] Observer feedback stabilizes without repeated state churn.
- [ ] Mobile `OPENING/OPEN/CLOSING/NORMAL`, snapshot/restore, reduced motion, and taller subtitle
  preservation pass.
- [ ] Desktop opening/steady/closing/cleanup-pending, handoff, baseline freeze/release, title
  continuity, and BQ-24 floor pass unchanged.
- [ ] Tag tail ellipsis, short-tail full-or-hidden, suffix-only/right-first hide, and reappearance on
  widen pass in all 12 locales.
- [ ] Visible tag identities remain a stable left prefix; no content swap/reshuffle occurs.
- [ ] Blog CTA priority/rest-state width behavior and unavailable status priority pass.
- [ ] Hidden suffix is absent from public DOM/a11y tree; `coming soon` remains exposed.
- [ ] Mobile subtitle is full text; title/subtitle clamp matrix passes at all target tiers.
- [ ] BQ-30 borderless tags use exact `#ECE8DF` and `#E6E2D8` fills.
- [ ] LI-04 has a documented green deletion or green no-change result.
- [ ] Phase 4/5/6 static QA contains exactly the declared anchors and all three scripts pass.
- [ ] LI-06 diff and regression guards prove no behavior/routing/storage/telemetry/transition/
  resolver/i18n-data change.
- [ ] All §17 unit, DOM, Playwright, a11y, static-QA, manual, and standard gates pass.
- [ ] No snapshot/baseline file changed and no forbidden command ran.
- [ ] BQ-30/BQ-31/BQ-32, `req-landing`, `design.md`, and Wave 10 roadmap are synchronized with the
  verified implementation.

## 19. Do-Not-Regress List

The following list is carried verbatim from analysis §16:

- Storage keys, pending transition persistence, return-scroll restoration.
- Telemetry consent, payload validation, and event ordering.
- Locale routing, Blog direct navigation, and typed route construction.
- Transition runtime and landing-to-destination handshake.
- Variant resolver and generated registry boundaries.
- Test entry and `scoring1` pre-answer ownership.
- Existing semantic trigger, focus, `inert`, `aria-disabled`, and tab-order anchors.
- Blog `Read more →` remains non-interactive and `aria-hidden` inside the whole-card link.
- Unavailable `coming soon` remains visible to assistive technology.
- BQ-24 explicit resting-pixel Expanded floor, separate `RestingFloorMap`, and single last-choice-to-meta spacer.
- Same-row non-target top/bottom/outer-height isolation and baseline freeze/release order.
- Desktop title first-line continuity.
- BQ-25 answer arrow remains `items-start` with no optical nudge.
- BQ-07: no baseline regeneration.
- BQ-04/BQ-21: no global token promotion and no `globals.css` change.
- No CSS auto-spacer, Normal floor map, explicit row height, or fixed card minimum introduced to simulate rhythm.

## 20. Forbidden Changes and Commands

- No snapshot/baseline regeneration.
- No `npm run qa:visual:full`.
- No command containing `--update-snapshots`.
- No visual baseline generation command.
- No CSS `margin-top:auto`, `justify-content:space-between`, filler flex, or pseudo-spacer for Normal
  compensation.
- No Normal-card floor map, explicit row height, or fixed card minimum used to simulate rhythm.
- No `globals.css` edit or global token promotion before Wave 16.
- No BQ-25 arrow nudge.
- No BQ-23 hero/page-shell work.
- No behavior/routing/storage/telemetry/transition/resolver/i18n-data change.
- No `scripts/qa/**` edit beyond phase 4, 5, and 6 as declared in §15.
- No package addition, build/deployment configuration change, file deletion, network access,
  destructive Git operation, checkpoint update, or `legacy/reference` modification.

## 21. Approval Gate

No unresolved product, UX, or architecture decision remains. The only required confirmation before
execution is explicit approval of this plan.

After approval, begin at Unit 0 and stop after each unit's green verification before advancing. If a
new requirement, unlisted file, stage-capacity contradiction, or cross-wave dependency appears,
stop and return to the user; do not silently widen Wave 10.
