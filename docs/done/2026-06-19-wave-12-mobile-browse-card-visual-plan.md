# Wave 12 Mobile Browse Card Visual Implementation Plan

> **Plan status:** Plan-Only specification. Implementation is not authorized by this document.
> **Task mode:** Plan Only.
> **Authoring date:** 2026-06-19.
> **Baseline:** HEAD `55e2808`.
> **Workspace:** `/Users/b-m-2022001/Local/ViveTest`, branch `main`.
> **Current-session output:** this revised plan file only.
> **Do not run in Plan-Only mode:** lint, typecheck, unit tests, E2E tests, build, snapshots, baselines,
> commits, pushes, checkpoint operations, branch operations, or network access.
> **Implementation mode after approval:** separate user prompt only. Execute inline, one unit at a time.
> Do not dispatch parallel agents, automated implementation pipelines, or multi-wave execution.
> **Wave:** 12 - Mobile browse card visual.
> **Reference-only worktrees:** legacy/reference and checkpoint worktrees are not modified or used as
> implementation spaces by this plan.
> **Risk:** Medium. Risk dimensions: responsiveness, localization, a11y, design-system consistency,
> card geometry, and completed Desktop/Tablet tag-fit regression.
> **Logic Improvement: approved and locked - W12-LI-01, W12-LI-02, W12-LI-03, W12-LI-04,
> W12-LI-05, W12-LI-06.**
> **Locked visual values:** mobile Normal title/subtitle `word-break: keep-all` with
> `overflow-wrap: anywhere`; shared tag chip line-height `1.35`; Blog CTA scoped ink `#6B6B76`;
> mobile Normal `base_gap` `12px`; tag-to-CTA reservation gap unchanged at current `12px`.

---

## 1. Goal and Architecture

**Goal:** Align Mobile Normal browse-card visuals with the approved Wave 12 LI rulings while
preserving Wave 10 BQ-30/BQ-31/BQ-32 behavior, Wave 11 keyboard/a11y behavior, and all
non-visual runtime contracts.

**Architecture:**

1. Keep the visual edits card-scoped. Use `landing-grid-card.module.css` selectors under
   `.root` and existing component-local class constants only; do not edit `globals.css` or promote
   tokens before Wave 16.
2. Preserve BQ-32 as the only tag-fit mechanism. Mobile may change typography and spacing values, but
   must keep `useCardInlineGeometry()` plus `resolveVisibleTagPrefix()` as the sole owner of
   visible-prefix count, 56px tail, CTA reservation, and suffix unmount.
3. Carry mobile `base_gap=12px` through the same spacing contract that currently feeds
   `data-base-gap`, `--landing-card-base-gap`, geometry measurement, and tests. CSS-only overrides or
   data-only changes are forbidden.
4. Add focused non-snapshot W12 proof under `assertion:W12-mobile`; do not refresh or create visual
   baselines.

**Tech stack:** Next.js 16, React 19, TypeScript, Tailwind v4 utility classes, CSS Modules, Vitest,
JSDOM, Playwright, and axe-core.

### 1.1 Senior review corrections applied

This revision tightens the junior plan in five places that would otherwise be likely review
findings:

1. The plan no longer treats authority-file deltas as implementation permission. They are paste-ready
   handoff text only, and the live `docs/decision-register.md` BQ-34 numbering conflict is resolved
   as an explicit follow-up decision.
2. W12-LI-04 is not a CSS tweak. It is a tier-aware spacing-contract change that must agree at SSR
   fallback render, measured geometry render, CSS custom property, `data-base-gap`, and tests.
3. W12-LI-02 cannot hide a stale `leading-[1.2]` utility behind CSS specificity. The source contract
   must stop advertising the old line-height if the runtime value becomes `1.35`.
4. Mobile typography selectors must target only Normal-face classes. They may affect the Normal face
   while Mobile OPENING/CLOSING shells are present, but must not target Mobile Expanded title/body
   classes owned by Wave 13.
5. Static QA script edits remain optional Ask-First-surface work. If used, they may only add W12
   anchors after runtime tests are green; they must not relax Wave 10/11 checks or mask stale local
   BQ-07/Phase 9 debt.

## 2. Authority, Scope, and Required Plan Fields

### 2.1 Relevant SSOT contracts

- `docs/req-landing.md §6.5-6.7`: Normal slots, text/clamp, BQ-32 tags, Blog visual affordance,
  `base_gap + comp_gap`.
- `docs/req-landing.md §9.2-9.3`, `§13.2`: unavailable semantics and coming-soon readability.
- `docs/req-landing.md §14.2`: release-blocking traceability, especially BQ-30/BQ-32 and mobile
  lifecycle/spacing rows.
- `docs/design/design.md §4.3`, `§4.11`, `§5.1`, `§5.3`, `§5.10`, `§7.2`, `§7.4`, `§7.5`, `§9`.
- `docs/decision-register.md`: BQ-29, BQ-30, BQ-31, BQ-32, BQ-33, and the existing BQ-34 numbering
  conflict noted in §12.3 below.
- `docs/wave-roadmap.md`: Wave 12 include/exclude/validation and Wave 13 handoff.

### 2.2 Current Plan-Only file change

- Modify: `docs/plans/2026-06-19-wave-12-mobile-browse-card-visual-plan.md`

### 2.3 Future implementation file set

Implementation must stay within this set unless the user approves a new plan revision.

- Modify: `src/features/landing/grid/landing-grid-card.tsx`
- Modify: `src/features/landing/grid/landing-grid-card.module.css`
- Modify: `src/features/landing/grid/spacing-plan.ts`
- Modify: `src/features/landing/grid/use-grid-geometry-controller.ts`
- Modify: `src/features/landing/grid/index.ts` only if a new spacing resolver export is needed by
  existing public barrels.
- Modify: `tests/unit/landing-card-contract.test.ts`
- Modify: `tests/unit/landing-spacing-plan.test.ts`
- Modify: `tests/e2e/grid-smoke.spec.ts`
- Modify: `tests/e2e/a11y-smoke.spec.ts`
- Optional static-QA sync after tests are green: `scripts/qa/check-phase5-card-contracts.mjs`,
  `scripts/qa/check-phase6-spacing-contracts.mjs`, and, only if the a11y tree anchor is added there,
  `scripts/qa/check-phase8-accessibility-contracts.mjs`. These files are Ask-First surfaces; the
  approved plan scope allows only additive W12 anchor recognition for already-green unit/E2E proof.
  Do not edit `scripts/qa/*.mjs` to weaken existing Wave 10/11 assertions, skip Phase 9, suppress
  BQ-07 snapshot debt, or turn a failing runtime contract into a static-pass.

### 2.4 Reference-only and forbidden surfaces

- Reference-only: `docs/plans/2026-06-15-wave-12-mobile-browse-card-visual-analysis.md`,
  `docs/wave-roadmap.md`, `.planning/STATE.md`, `docs/design/resources/**`.
- Do not modify in Wave 12 implementation without a new user decision: `src/app/globals.css`,
  `docs/design/design.md`, `docs/req-landing.md`, `docs/decision-register.md`,
  `docs/blocker-traceability.json`, `tests/e2e/theme-matrix-manifest.json`,
  `tests/e2e/*-snapshots/**`, `src/features/landing/grid/use-landing-interaction-controller.ts`,
  `src/features/landing/grid/use-mobile-card-lifecycle.ts`,
  `src/features/landing/grid/use-keyboard-handoff.ts`, `src/features/gnb/**`,
  `src/features/transition/**`, `src/features/telemetry/**`, `src/features/landing/storage/**`,
  `src/features/test/**`, `src/features/variant-registry/**`, `src/i18n/**`, `src/lib/routes/**`,
  and `src/messages/**`.

### 2.5 Impact assessment

- Shared components: only the landing card renderer and its scoped CSS module may change; GNB, shell,
  route files, and destination pages stay unchanged.
- Localization: all 12 locales must preserve full Mobile title/subtitle text, CJK/Korean keep-all
  quality, long CTA/status containment, and no inline overflow.
- A11y: Blog `Read more ->` stays decorative, `aria-hidden`, non-focusable, and non-interactive.
  Unavailable remains a semantic `button aria-disabled="true" tabindex="-1"` with AT-exposed status.
- State contracts: no reducer, controller, lifecycle, transition, telemetry, storage, resolver,
  registry, or test-entry behavior changes.
- Core user flow: Blog still navigates through the single whole-card link; Test entry remains A/B-only
  from Expanded; unavailable cannot expand or navigate.

### 2.6 Decisions requiring user confirmation before execution

None for the scoped card/test implementation. The prompt locks W12-LI-01 through W12-LI-06 and the
values `#6B6B76`, `12px`, `1.35`, and `keep-all`.

Two conditions still require stopping before changing additional files:

- If W12-LI-04 cannot keep SSR fallback, CSS, data attributes, geometry, and tests on one agreed
  mobile value, stop and ask before taking the `8px` fallback branch in §4.4.
- If authority-file editing is later authorized, resolve the live BQ numbering conflict first. Under
  current HEAD, `docs/decision-register.md` already has BQ-34, so the safe Wave 12 row is BQ-35
  unless the user explicitly approves renumbering.

### 2.7 Validation gates applicable within Wave 12 scope

- Basic gates: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- Focused Wave 12 gates: W12 unit tests plus filtered `grid-smoke` and `a11y-smoke` under
  `assertion:W12-mobile`.
- Landing scope gates: phase 4/5/6/7/8/9/10 static QA scripts, with unrelated BQ-07 or stale
  matcher blockers reported rather than bypassed. Phase 5/6/8 script edits are not required merely
  because W12 exists; add them only when the new runtime assertions would otherwise be invisible to
  the release-level static contract.
- Snapshot/baseline commands remain out of scope.

## 3. Locked Preservation Contracts

- **BQ-32 single resolver:** do not add a second resolver, locale threshold, mobile-only visible-count
  state, CSS clipping substitute, or tag wrap. Mobile tag wrap shown by a JS-less mockup harness is not
  a product target.
- **Mobile full text:** no clamp, ellipsis, fixed height, artificial compensation, or auto-spacer for
  Mobile Normal title/subtitle.
- **BQ-30:** available tag fill `#ECE8DF`, unavailable status fill `#E6E2D8`, border `0px`, radius
  `5px`, inline padding `9px`, nowrap, no dot.
- **BQ-26:** unavailable status stays public and AT-exposed; unavailable trigger stays keyboard-skipped
  but semantically readable.
- **Blog CTA:** visible on Mobile, decorative, `aria-hidden`, no nested control, no `tabIndex`,
  no underline, internal `6px` label-arrow gap, and whole-card link remains the only navigation.
- **Wave 13 boundary:** do not change mobile Expanded shape, position, lifecycle, close behavior,
  focus, or a11y.
- **Wave 16 boundary:** do not edit `globals.css`, revalue global `--muted`, or promote scoped tokens.
- **BQ-07:** no snapshot/baseline generation or image-file changes.

## 4. Per-LI Implementation Design

### 4.1 W12-LI-01 - Mobile Normal title/subtitle keep-all

**Files/selectors:**

- `src/features/landing/grid/landing-grid-card.module.css`
  - Add a scoped selector:
    - `.root[data-card-viewport-tier='mobile'] :global(.landing-grid-card-title-normal)`
    - `.root[data-card-viewport-tier='mobile'] :global(.landing-grid-card-subtitle-normal)`

**Mechanism:**

- Set `word-break: keep-all; overflow-wrap: anywhere;` in that scoped selector.
- Do not add the rule to Desktop/Tablet Normal title/subtitle. Their clamp/ellipsis behavior stays
  controlled by existing class branches in `landing-grid-card.tsx`.
- Do not target `.landing-grid-card-mobile-title`, `[data-slot="cardTitleTransient"]`,
  `[data-slot="expandedBody"]`, answer choices, or Mobile Expanded body selectors in Wave 12; Wave 13
  owns Mobile Expanded visual/a11y.
- Do not add a `data-card-state="normal"` gate unless a failing test proves it is required. The
  `.landing-grid-card-title-normal` / `.landing-grid-card-subtitle-normal` classes are Normal-face
  nodes; during Mobile OPENING/CLOSING the Normal face can still exist while the transient shell is
  present, and its line breaking must remain consistent with the captured pre-open height.

**Why visual-only:** text remains the same source string, same DOM slots, same card state, same
navigation semantics, and same BQ-31 content-driven height model. The only runtime effect is natural
height caused by browser line breaking, which must be proven through spacing/lifecycle validation.

### 4.2 W12-LI-02 - Shared tag chip line-height 1.35

**Files/selectors:**

- `src/features/landing/grid/landing-grid-card.module.css`
  - Add or extend `.root :global(.landing-grid-card-tag-chip)`.
- `src/features/landing/grid/landing-grid-card.tsx`
  - Remove the conflicting `leading-[1.2]` utility from `LANDING_GRID_CARD_TAG_CHIP_CLASSNAME`.

**Mechanism:**

- The scoped computed style for every catalog tag chip becomes `line-height: 1.35`.
- Keep the existing shared chip primitive across Test, Blog, and unavailable. Do not create a
  mobile-only tag role.
- Preserve `font-size:13px`, `font-weight:500`, `padding:4px 9px`, `border:0`, `nowrap`, radius,
  fill values, and `--tag-min-width:56px`.
- Remove `leading-[1.2]` from `LANDING_GRID_CARD_TAG_CHIP_CLASSNAME` when the CSS module owns
  line-height. Do not leave the stale utility in source and rely on selector specificity to mask it;
  that would preserve a false static contract for future QA and reviewers.
- The measurement probe uses the same `LANDING_GRID_CARD_TAG_CHIP_CLASSNAME`; no separate probe-only
  line-height or width measurement path is allowed.

**Desktop/Tablet non-regression approach:**

- Because line-height should not change intrinsic inline width, the implementation proof must compare
  D/T visible prefixes under production `line-height:1.35` and a temporary in-page
  `line-height:1.2` override in the same Playwright case. The test should read the prefix text and
  `data-visible-tag-count` before override, after override, and after restore.
- The same D/T case must assert row bottom alignment, `data-comp-gap` versus geometry, and no
  document/container overflow so the chip box-height increase is absorbed by the existing BQ-31
  measured slack.
- If D/T visible prefix identity changes, stop and revert W12-LI-02; do not compensate by changing
  BQ-32 thresholds.

### 4.3 W12-LI-03 - Blog CTA scoped ink #6B6B76

**Files/selectors:**

- `src/features/landing/grid/landing-grid-card.module.css`
  - Add `--blog-read-more-ink: #6b6b76;` under `.root`.
  - Add `color: var(--blog-read-more-ink); text-decoration: none;` to `.blogReadMore` while keeping
    its existing `width: max-content`.
- `src/features/landing/grid/landing-grid-card.tsx`
  - Replace the current `text-[var(--muted-ink)]` dependency in the
    `landing-grid-card-blog-read-more` class by relying on the scoped `.blogReadMore` color path.

**Mechanism:**

- Preferred source shape:
  - `.root { --blog-read-more-ink: #6b6b76; }`
  - `.blogReadMore { width: max-content; color: var(--blog-read-more-ink); text-decoration: none; }`
  - Remove `text-[var(--muted-ink)]` from the public `landing-grid-card-blog-read-more` utility
    string after the scoped class owns color.
- Keep `landing-grid-card-blog-read-more` as the same non-interactive `<span data-slot="blogReadMore"
  aria-hidden="true">`.
- Preserve label and arrow as separate children with `gap-[6px]`, `13px`, `500`, `1.35`, `nowrap`,
  and `no-underline`.
- Do not change hover/focus reveal logic, Mobile always-visible logic, row gap, or whole-card `Link`.
- The probe span already receives `styles.blogReadMore`; it must inherit the same scoped color path
  without becoming public or measured from live row consumed width.
- Do not add a hover color, underline transition, focus style, `tabIndex`, nested `<a>`/`button`, or
  a separate CTA click handler.

**Why visual-only:** this removes a legacy global-token dependency without changing interaction,
route building, transition, telemetry, or accessible tree. The value remains card-scoped and is
recorded as Wave 16 consolidation debt, not a global token promotion.

### 4.4 W12-LI-04 - Mobile base_gap 12px feasibility and mechanism

**Feasibility ruling:** feasible, if implemented through the existing spacing contract rather than a
CSS-only override.

**Why direct shared-constant change is rejected:**

- `LANDING_CARD_BASE_GAP_PX` is currently `8` and is consumed by both fallback card rendering and
  `useGridGeometryController()`.
- Changing that constant to `12` globally would alter Desktop/Tablet completed surfaces, violating
  the locked D/T no-change requirement.

**Why CSS-only override is rejected:**

- `data-base-gap`, `--landing-card-base-gap`, and geometry-derived `base_gap` would disagree.
- That violates `req-landing.md §6.7`, which requires CSS var, data attributes, geometry controller,
  and tests to agree.

**Files/selectors/mechanism:**

- `src/features/landing/grid/spacing-plan.ts`
  - Keep `LANDING_CARD_BASE_GAP_PX = 8` as the Desktop/Tablet compatibility value.
  - Add `LANDING_CARD_MOBILE_BASE_GAP_PX = 12`.
  - Add a pure resolver without introducing a runtime dependency cycle, for example:
    `resolveLandingCardBaseGapPx(tier: 'mobile' | 'tablet' | 'desktop'): number`.
  - Return `12` only for `mobile`; return `8` for `tablet` and `desktop`.
- `src/features/landing/grid/use-grid-geometry-controller.ts`
  - Compute one `baseGapPx = resolveLandingCardBaseGapPx(plan.tier)` inside the measurement effect.
  - Use that value when writing every measured `baseGapPx` into `spacingModel`, including fallback
    entries for unmeasured cards.
  - Preserve `buildRowCompensationModel()`, `deriveNaturalHeightFromGeometry()`, measurement
    suspension, font/ResizeObserver invalidation, and equality guard.
- `src/features/landing/grid/landing-grid-card.tsx`
  - Change `resolveSpacingContract()` to receive `viewportTier`.
  - Preserve supplied `spacing.baseGapPx` when it is finite; use
    `resolveLandingCardBaseGapPx(viewportTier)` only for absent or invalid spacing.
  - When `spacing` is absent on SSR/static first render, use `resolveLandingCardBaseGapPx(viewportTier)`
    so the initial CSS variable and `data-base-gap` already match the intended tier and do not flip
    from `8` to `12` after hydration.
  - Keep `mt-[var(--landing-card-base-gap)]` on title/subtitle and
    `landing-grid-card-tags-gap h-[calc(var(--landing-card-base-gap)_+_var(--landing-card-comp-gap))]`.
  - Keep `data-base-gap={resolvedSpacing.baseGapPx}` and
    `--landing-card-base-gap: ${resolvedSpacing.baseGapPx}px`.
- `src/features/landing/grid/index.ts`
  - Export the resolver only if existing test imports need the public barrel.

**Feasibility proof required before committing Unit 2:**

- In JSDOM/static markup, rendering `LandingGridCard` with `viewportTier="mobile"` and no `spacing`
  must produce `data-base-gap="12"` and inline `--landing-card-base-gap: 12px`.
- Rendering `viewportTier="tablet"` or `"desktop"` with no `spacing` must still produce `8`.
- Rendering any tier with a finite supplied `spacing.baseGapPx` must preserve that supplied value; the
  fallback resolver must not overwrite measured controller output.
- In Playwright, measured Mobile geometry at 360/390/767 must report `data-base-gap`, CSS custom
  property, and subtitle-to-tags geometry distance as `12px` when `comp_gap=0`.
- Desktop/Tablet measured geometry must remain `8px`; if they change, revert Unit 2 rather than
  compensating elsewhere.

**Unchanged BQ-32 row gaps:**

- Do not change `landing-grid-card-tags` `gap-2` (tag-to-tag `8px`).
- Do not change Blog row `gap-3` (tag-to-CTA reservation gap `12px`).
- Do not change `.tagMeasurementProbe { gap: 8px; }` or `useCardInlineGeometry()` row-gap
  measurement.

**Fallback if feasibility fails:**

- Revert the resolver path and keep mobile `base_gap=8px`.
- Retain any non-snapshot tests that prove the current value is internally consistent.
- Use the §12.1 fallback re-anchor note: design.md §5.10/§7.2 says the current product realizes the
  mobile Normal subtitle-to-tags base gap as `8px` through the spacing contract, while `12px` remains a
  general `--space-sm` token / component rhythm reference.

### 4.5 W12-LI-05 - Focused W12 proof

**Files/tests:**

- `tests/unit/landing-spacing-plan.test.ts`
  - Add pure tests for `resolveLandingCardBaseGapPx('mobile') === 12` and D/T `=== 8`.
  - Expected red before Unit 2 implementation: resolver export is missing, or mobile returns the
    current shared `8`.
  - Confirm `resolveVisibleTagPrefix()` behavior is unchanged by spacing tier values.
- `tests/unit/landing-card-contract.test.ts`
  - Add a W12 contract for mobile default `data-base-gap="12"` / `--landing-card-base-gap: 12px` and
    D/T default `data-base-gap="8"` / `--landing-card-base-gap: 8px`.
  - Add a supplied-spacing guard proving a finite `spacing.baseGapPx` is preserved instead of being
    overwritten by the tier fallback.
  - Add static CSS/source contract coverage for the scoped keep-all selector, tag line-height selector,
    Blog CTA scoped ink, and removal of stale `leading-[1.2]` / `text-[var(--muted-ink)]` utilities.
  - Expected red before Units 1-2 implementation: CSS selectors/variable are absent, tag source still
    advertises `leading-[1.2]`, Blog CTA still references `--muted-ink`, and mobile default
    `data-base-gap` is `8`.
  - Keep existing Blog decorative/no-primaryCTA and unavailable semantic tests.
- `tests/e2e/grid-smoke.spec.ts`
  - Add one or more `@smoke assertion:W12-mobile ...` cases for 360, 390, and 767 widths. Prefer
    extending the existing mobile subtitle, Blog CTA, BQ-30, and BQ-32 tests only when the test title
    remains precise; otherwise add new W12-named cases.
  - Cover all 12 locales for Mobile title/subtitle full text, no overflow, BQ-32 prefix integrity,
    CTA containment, and status containment.
  - Add computed visual checks for padding, radius, surface, border, shadow, base gap, tag line-height,
    tag fills, Blog CTA ink, no underline, and 6px internal gap.
  - Add the D/T line-height override check from §4.2 in the existing BQ-32 D/T prefix scenario or in a
    new `assertion:W12-mobile` guard that also samples tablet/desktop prefix identity.
- `tests/e2e/a11y-smoke.spec.ts`
  - Add `@smoke assertion:W12-mobile ...` axe and tree checks for representative Mobile Normal states:
    available Test, Blog, and unavailable.
  - Assert hidden suffix absence, probe `aria-hidden` + `inert`, Blog CTA decorative status, and
    unavailable status AT exposure.

**No snapshots:** do not add `toHaveScreenshot()`, local snapshot helpers, `--update-snapshots`, or
new image baselines.

### 4.6 W12-LI-06 - Behavior no-change guard

**Mechanism:**

- Keep implementation diffs out of all behavior/runtime files listed in §2.4.
- Add tests only to prove the existing behavior remains true:
  - Blog whole-card link is the only navigation.
  - Hidden suffix is unmounted from public DOM/a11y.
  - Probe remains `aria-hidden` + `inert`.
  - Unavailable trigger owns disabled/name/status semantics.
  - `resolveVisibleTagPrefix()` remains the only prefix resolver.
- Run a final diff audit after implementation approval:

```bash
git diff --name-only -- \
  src/app/globals.css \
  src/features/landing/grid/use-landing-interaction-controller.ts \
  src/features/landing/grid/use-mobile-card-lifecycle.ts \
  src/features/landing/grid/use-keyboard-handoff.ts \
  src/features/gnb \
  src/features/transition \
  src/features/telemetry \
  src/features/landing/storage \
  src/features/test \
  src/features/variant-registry \
  src/i18n \
  src/lib/routes \
  src/messages
```

Expected after implementation: no output.

## 5. Evidence Grades and Proof Obligations

Do not write "already satisfied" as a final completion claim unless the W12 validation below has run
green after implementation. Until then, use these grades:

| Area | Current grade | Required proof before completion |
|---|---|---|
| Mobile one-column browse | Source-aligned; no native 390 visual reference in repo | 360/390/767 W12 grid assertion |
| Mobile title/subtitle full text | Source-aligned; all-locale subtitle proof exists | 12-locale title + subtitle full text and overflow `0` |
| Keep-all quality | Not satisfied at HEAD | Computed `word-break: keep-all` + CJK/KR/long Latin containment |
| Base card visual values | Source-aligned, mobile matrix unproven | Mobile computed padding/radius/surface/border/shadow at 360/390/767 |
| Mobile `base_gap=12` | Approved target, not satisfied at HEAD | SSR fallback + data/CSS/geometry agreement at 12px; D/T still 8px |
| Tag line-height | Not satisfied at HEAD | Stale utility removed, computed `line-height: 1.35`, plus D/T prefix non-regression |
| BQ-32 resolver | Satisfied as mechanism | Mobile 12-locale 360/390/767 prefix, 56px tail, right-first hide |
| Blog CTA visible/decorative | Mechanism mostly satisfied; ink not satisfied at HEAD | Mobile contained/no-wrap/#6B6B76/no underline/one link; public/probe both scoped |
| Unavailable mobile parity | Source-aligned, mobile matrix unproven | Surface/dim/status semantics/long status at 360/390 |
| A11y | Existing representative coverage | W12 Mobile Normal axe-clean and tree assertions |
| Snapshot/baseline unchanged | Not a runtime fact | Diff audit and no snapshot commands/files |

## 6. Implementation Units After Separate Approval

### Unit 0 - Preflight and red-test inventory

- [ ] Re-read `AGENTS.md`, this plan, and the routed docs listed in §2.1.
- [ ] Confirm `HEAD` and worktree status. Do not resolve unrelated user changes.
- [ ] Add the failing W12 unit and E2E assertions before production code.
- [ ] Run only the focused red checks for the new assertions. Expected failures: missing
  `resolveLandingCardBaseGapPx`, current mobile `data-base-gap=8`, missing keep-all selector, tag
  line-height `1.2`, Blog CTA color still tied to `--muted-ink`, and absent `assertion:W12-mobile`
  computed-style proof.
- [ ] During red-test inventory, do not run unfiltered snapshot-bearing `state-smoke` while BQ-07
  local baseline debt exists; use focused W12 failures only.

### Unit 1 - Mobile scoped typography and Blog CTA ink

- [ ] Add the CSS module selectors/variables for W12-LI-01, W12-LI-02, and W12-LI-03.
- [ ] Remove only conflicting component utility dependencies:
  - `leading-[1.2]` on tag chip if CSS module ownership is used.
  - `text-[var(--muted-ink)]` on Blog CTA after introducing the scoped `#6B6B76` path.
- [ ] Keep markup, slots, a11y attributes, and route behavior unchanged.
- [ ] Run the W12 unit subset for CSS/source contracts. Expected green: keep-all selector present,
  stale utilities absent, public/probe Blog CTA both use the scoped class path.

### Unit 2 - Mobile base_gap resolver

- [ ] Add the pure base-gap resolver in `spacing-plan.ts`.
- [ ] Thread the tier-specific value through `use-grid-geometry-controller.ts` and
  `landing-grid-card.tsx`.
- [ ] Prove SSR/static fallback, supplied spacing preservation, `data-base-gap`,
  `--landing-card-base-gap`, and geometry gap agree at `12px` on Mobile and remain `8px` on D/T.
- [ ] If proof fails, revert Unit 2 and stop for the §4.4 fallback decision.

### Unit 3 - Focused non-snapshot verification

- [ ] Add/update `assertion:W12-mobile` unit, grid-smoke, and a11y-smoke assertions.
- [ ] Include 360, 390, and 767 viewports.
- [ ] Include all locales for title/subtitle and prefix/CTA/status stress; at minimum ensure KR,
  ZS/ZT, HI, ID, FR, RU, and DE are explicitly represented in long-text checks.
- [ ] Add a D/T regression assertion for tag prefix identity under the temporary line-height override.
- [ ] Add Mobile available Test, Blog, and unavailable representative axe/tree proof.

### Unit 4 - No-change audit and authority-delta handoff

- [ ] Verify no forbidden runtime files changed.
- [ ] Verify no snapshot/baseline/image files changed.
- [ ] Record paste-ready authority deltas from §12 for a separate authority-file edit approval.
- [ ] Do not edit `design.md`, `req-landing.md`, or `decision-register.md` inside this implementation
  unless the user explicitly authorizes that as a follow-up unit.

## 7. Detailed Validation Plan

These commands are eventual implementation gates only. They were not run while writing this plan.

### 7.1 Basic gates

Run in AGENTS order after implementation:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

### 7.2 Focused W12 gates

```bash
npm test -- \
  tests/unit/landing-card-contract.test.ts \
  tests/unit/landing-spacing-plan.test.ts
npx playwright test \
  tests/e2e/grid-smoke.spec.ts \
  tests/e2e/a11y-smoke.spec.ts \
  --grep "assertion:W12-mobile" \
  --workers=1
```

Required focused assertions:

- 360/390/767 all resolve to `data-grid-tier="mobile"` and one-column rows.
- 12 locales preserve full Mobile title/subtitle, no clamp/ellipsis, no title/subtitle scroll clipping,
  and no card/container/document horizontal overflow.
- Mobile Normal title/subtitle computed styles include `word-break: keep-all`,
  `overflow-wrap: anywhere`, title `20px / 600 / 1.3`, subtitle `15px / 400 / 1.45`.
- KR uses keep-all word grouping; ZS/ZT/JA CJK text remains readable; HI/long Latin strings do not
  clip or push sibling thumbnail/tags inline sizes.
- Mobile computed card padding is `16px`; radius `16px`; available surface white; border `#E6E2D8`;
  resting shadow unchanged.
- Mobile `data-base-gap`, CSS `--landing-card-base-gap`, SSR/static fallback, and geometry
  subtitle-to-tags gap agree at `12px` when `comp_gap=0`.
- Desktop/Tablet computed `data-base-gap` remains `8px`.
- Tag chip source no longer contains `leading-[1.2]`; computed line-height is `1.35`; available fill
  remains `#ECE8DF`; unavailable status fill remains `#E6E2D8`; border remains `0px`.
- D/T tag prefix identity and visible counts are unchanged when the same test toggles chip/probe
  line-height between production `1.35` and temporary `1.2`.
- Existing resolver still owns all-locale prefix, 56px tail, CTA reservation, and right-first hide at
  360/390/767.
- Hidden suffix is absent from public DOM/a11y; measurement probe is `aria-hidden` and `inert`.
- Blog CTA is visible, nowrap, contained, non-underlined, internally spaced by `6px`, scoped
  `#6B6B76`, detached from `--muted-ink`, and does not contain a focusable or interactive descendant.
- Whole-card Blog link remains the only navigation control.
- Unavailable card keeps warm surface, thumbnail-only dim, full-opacity title/subtitle, visible
  status, `aria-disabled`, `tabIndex=-1`, and AT-exposed description.
- Representative Mobile Normal states are axe-clean.
- No snapshot/baseline/image files change.
- No forbidden runtime files from §2.4 change.

### 7.3 Scope-specific landing gates

After focused W12 gates are green, run the routed landing checks from
`docs/agent-guides/verification-commands.md §landing`. The full `npm test` Basic gate already covers
the unit suite, but the implementation closeout still needs the explicit landing static/E2E signal
below. If an unrelated stale snapshot or Phase 9 matcher blocks a full command, do not regenerate a
baseline or restore dead code; report the blocker separately.

```bash
node scripts/qa/check-phase4-grid-contracts.mjs
node scripts/qa/check-phase5-card-contracts.mjs
node scripts/qa/check-phase6-spacing-contracts.mjs
node scripts/qa/check-phase7-state-contracts.mjs
node scripts/qa/check-phase8-accessibility-contracts.mjs
node scripts/qa/check-phase9-performance-contracts.mjs
node scripts/qa/check-phase10-transition-contracts.mjs
npx playwright test \
  tests/e2e/grid-smoke.spec.ts \
  tests/e2e/state-smoke.spec.ts \
  tests/e2e/gnb-smoke.spec.ts \
  tests/e2e/a11y-smoke.spec.ts \
  --workers=1
```

If Phase 5/6/8 static QA scripts are updated, their red/green proof must be based on missing W12
anchors before the script edit and passing scripts after the additive script edit. A static-QA edit is
invalid if the corresponding unit/E2E assertion is not already green.

The focused `--grep "assertion:W12-mobile"` command remains the Wave 12 proof signal. The broader
landing E2E command is a regression gate; if it hits a screenshot comparator, never add
`--update-snapshots` and never edit `tests/e2e/*-snapshots/**` under Wave 12.

### 7.4 Optional lifecycle proof

Use the existing non-snapshot Mobile subtitle lifecycle assertion as a regression proof for
pre-open height capture if W12-LI-01 or W12-LI-04 changes card height:

```bash
npx playwright test tests/e2e/state-smoke.spec.ts \
  --grep "Mobile full subtitle pre-open height matches OPENING CLOSING snapshot and final NORMAL restore" \
  --workers=1
```

This is a non-snapshot assertion despite the word "snapshot" in the title; it reads runtime data
attributes and geometry. Do not run the local-snapshot `expanded-focus-shell.png` test as part of
the focused W12 signal.

## 8. Rollback Rules

- W12-LI-01 rollback: remove only the mobile keep-all CSS selector.
- W12-LI-02 rollback: restore prior tag line-height path; do not change BQ-32 widths or thresholds.
- W12-LI-03 rollback: restore Blog CTA to the previous color path; do not touch global `--muted`.
- W12-LI-04 rollback: remove tier resolver and keep `LANDING_CARD_BASE_GAP_PX=8` everywhere; keep
  proof tests that document the fallback.
- W12-LI-05 rollback: remove only W12-specific assertions if the corresponding visual change is
  reverted.
- W12-LI-06 rollback: any diff in forbidden files means stop and revert the out-of-scope change.

## 9. Implementation Prompt Boundary

The later implementation prompt should be short and must reference this file rather than restating
all details. It must include:

- "Implement `docs/plans/2026-06-19-wave-12-mobile-browse-card-visual-plan.md` one unit at a time."
- "Do not edit authority files unless separately authorized."
- "Do not run snapshot/baseline regeneration."
- "Stop if W12-LI-04 cannot keep CSS/data/geometry at one agreed value."

## 10. Commands Not Run While Writing This Plan

No lint, typecheck, unit test, E2E test, build, snapshot, baseline, commit, push, checkpoint, or
network command was run for this Plan-Only task. Only read-only inspection commands and this plan-file
write were performed.

## 11. Plan Self-Check

- All requested LI decisions are represented in §4.
- Exact future files and selectors are listed in §2.3 and §4.
- W12-LI-04 feasibility is resolved as feasible through a tier-aware spacing resolver, with an
  explicit fallback.
- D/T tag non-regression is carried as a required proof, not an assumption.
- All "safe/already satisfied" claims are downgraded to evidence grades in §5.
- Authority-file edits are not performed here; paste-ready deltas are isolated in §12.
- Implementation remains forbidden until a separate user prompt.

## 12. Paste-Ready Authority Re-anchor Deltas

These are not applied by this Plan-Only task.

### 12.1 `docs/design/design.md`

**§4.3 / §4.11 Typography and localization**

```md
Wave 12 realization: Mobile Normal catalog title and subtitle now apply
`word-break: keep-all` with `overflow-wrap: anywhere`, matching the global wrapping intent while
preserving Desktop/Tablet Normal clamp behavior and Mobile full-text rendering.
```

**§5.1 / §6.3 Tag typography**

```md
Catalog tag chips realize the Tags/meta role at 13px / 500 / 1.35. This is shared across Test, Blog,
and unavailable catalog tags; BQ-32 visible-prefix behavior and the 56px tail minimum remain owned by
requirements/code.
```

**§5.3 / §7.4 Blog card CTA ink**

```md
Wave 12 scoped application value: the decorative Blog `Read more ->` affordance uses card-scoped
ink `#6B6B76` on the catalog card surface. This is not a global `--muted` revalue and remains a
Wave 16 consolidation candidate.
```

**§5.10 / §7.2 Normal card spacing**

```md
Wave 12 realization: Mobile Normal catalog cards use a `12px` subtitle-to-tags base gap through the
same `base_gap + comp_gap` spacing contract as the runtime geometry. Desktop/Tablet remain at the
previous completed `8px` value. The Blog tag-to-CTA reservation gap remains the existing BQ-32
functional `12px` value.
```

Fallback text if W12-LI-04 fails:

```md
Wave 12 realization note: the Mobile Normal subtitle-to-tags base gap remains `8px` because the
existing `base_gap + comp_gap` contract could not carry a mobile-only `12px` value without splitting
CSS, data attributes, and geometry proof. The `12px` spacing token remains the general
`--space-sm` / card-content rhythm reference.
```

**§7.5 Unavailable card**

```md
Wave 12 mobile parity: unavailable catalog cards use the same warm surface, thumbnail-only dim,
full-opacity title/subtitle, and standard `coming soon` tag on Mobile as on wider browse surfaces.
This visual parity does not make unavailable cards keyboard-focusable or enterable.
```

**§9 Resource Manifest**

```md
Current repository resources present under `docs/design/resources/`:
`assets/vive-logo.svg`, `assets/vive-mark.svg`, `screenshots/canvas-overview.png`,
`screenshots/desktop-full.png`, `screenshots/desktop-nav-expanded.png`,
`screenshots/expanded-card-spec.png`, and superseded reference files. Mobile browse, mobile expanded,
mobile menu, tablet full page, and desktop component artboards are not present as standalone files in
the repository and must be marked missing/reference-needed rather than treated as available evidence.
```

### 12.2 `docs/req-landing.md`

**§6.6 Text & Clamp**

```md
Wave 12 traceability: Mobile browse cards reuse the single BQ-32 tag-fit mechanism. The implementation
must not add mobile locale thresholds, a second resolver, mobile-only visible-count state, CSS
clipping replacement, or tag wrapping. Mobile line-break quality remains a visual/product
presentation contract only if separately promoted from design intent into requirements.
```

**§6.7 Card Height & Bottom Spacing**

```md
Wave 12 mobile base-gap agreement: when the approved mobile value is active, Mobile Normal
`subtitle -> tags` `base_gap` is `12px` and must agree across the CSS custom property,
`data-base-gap`, geometry measurement, and automated assertions. Desktop/Tablet values are unchanged.
CSS-only or data-only overrides are invalid.
```

Fallback if W12-LI-04 fails:

```md
Wave 12 fallback traceability: Mobile Normal `base_gap` remains `8px` because the approved 12px value
could not be carried through CSS/data/geometry without violating this section. The fallback is not a
new spacer or compensation mechanism.
```

**§9.3 / §13.2 Unavailable**

```md
Wave 12 mobile visual parity does not change unavailable behavior: the status tag remains public and
AT-exposed, the trigger remains `aria-disabled="true"` and `tabindex="-1"`, and unavailable cards
remain non-enterable in all input modes.
```

**§14.2 QA Matrix**

```md
31. **Wave 12 Mobile Browse Visual Traceability**: 360/390/767 Mobile one-column browse, 12-locale
full title/subtitle with inline overflow `0`, CJK/Korean keep-all quality, long CTA/status
containment, mobile computed padding/radius/surface/border/shadow, mobile base-gap agreement,
tag line-height `1.35`, BQ-32 prefix/56px tail/CTA reservation/right-first hide via the existing
resolver, hidden suffix DOM/a11y absence, probe `aria-hidden`+`inert`, scoped Blog CTA `#6B6B76`,
unavailable parity, representative Mobile Normal axe-clean, and snapshot/baseline unchanged PASS.
```

### 12.3 `docs/decision-register.md`

**Numbering note:** HEAD already contains a BQ-34 row for the 2026-06-19 token-drift/shared-token
decision. The prompt's "Wave 12 신규 BQ-34" label is therefore stale against the live file. Do not
overwrite or renumber BQ-34 silently. If authority-file editing is later approved, use BQ-35 for Wave
12 under current HEAD, unless the user explicitly approves a decision-register renumbering pass.

```md
| BQ-35 | Wave 12 Mobile browse card visual applies the approved W12-LI-01..06 dispositions: Mobile
Normal title/subtitle add scoped `word-break: keep-all` while retaining `overflow-wrap:anywhere`;
shared catalog tag chips use line-height `1.35`; Blog `Read more ->` uses card-scoped ink `#6B6B76`;
Mobile Normal `base_gap` is `12px` if CSS/data/geometry/tests agree, otherwise the documented
fallback remains `8px`; W12 proof is focused non-snapshot unit + grid-smoke/a11y-smoke under
`assertion:W12-mobile`; behavior no-change guard covers BQ-32 logic, interaction hooks, mobile
expanded lifecycle, GNB, globals, messages, routing, transition, telemetry, storage, resolver,
registry, test-entry, and pre-answer. | User approval after Wave 12 Analysis Step-2 and mobile
reference ruling (2026-06-19) | Changes are limited to scoped card visuals, tier-aware spacing
contract, and focused tests. No `globals.css` token promotion; no mobile tag wrap; no second
visible-prefix resolver; no snapshot/baseline regeneration. | No (Wave 12 planned) | Aligns with
BQ-29 by keeping `#6B6B76` scoped until Wave 16, with BQ-30 by preserving borderless fills, with
BQ-31 by preserving Mobile full text and content-driven height, and with BQ-32 by preserving the
single measured prefix resolver and CTA/status priority. |
```

## 13. Context Restore

- Current Task: Wave 12 Plan-Only implementation plan for Mobile browse card visual.
- Last Known State: Plan file revised; no implementation, build, unit, E2E, snapshot, baseline,
  commit, push, checkpoint, or authority-file edit performed.
- Key Decisions: W12-LI-01..06 locked; implementation must use scoped card visuals and tier-aware
  spacing if 12px is feasible.
- Open Questions: None for scoped implementation. Decision-register BQ-34 numbering conflict must be
  resolved before authority-file editing; current safe row is BQ-35.
- Deferred Options: W12-LI-04 fallback to `8px` if CSS/data/geometry cannot agree.
- Files to Revisit: this plan, Wave 12 analysis, `landing-grid-card.tsx`, `landing-grid-card.module.css`,
  `spacing-plan.ts`, `use-grid-geometry-controller.ts`, focused unit/E2E specs.
- Recommended Next Step: Review this plan and, if approved, issue a separate implementation prompt.
