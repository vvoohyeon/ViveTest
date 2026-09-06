# Visual Reconciliation R1 Implementation Plan

> **For implementation:** Execute inline, one unit at a time. Do not use parallel agents or an
> automated multi-wave pipeline. The user approved the visual implementation and SSOT re-anchor on
> 2026-06-08. Static-QA script maintenance remains separately gated and is not approved.

**Goal:** Re-anchor the live visual SSOT to the locked rev4 catalog decisions and reconcile only
the completed Wave 1–9 card visual surfaces without changing behavior or opening Wave 10+.

**Architecture:** Keep the existing `LandingGridCard` seams and all controller/runtime contracts.
Apply exact visual values through scoped CSS custom properties and existing component-owned class
strings, normalize localized coming-soon copy, and preserve all logic and completed-wave behavior.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4 arbitrary utilities, CSS modules,
Vitest/JSDOM, Playwright functional E2E.

---

## 1. Metadata

| Field | Value |
|---|---|
| Initiative | Visual Reconciliation R1 |
| Plan date | 2026-06-08 |
| Workspace | `/Users/b-m-2022001/Local/ViveTest`, local `main` |
| Task mode | Implementation; visual scope approved 2026-06-08 |
| Wave range | Reconciliation through completed Wave 9; no new wave and no Wave 10+ implementation |
| BQ-19 analysis | `docs/plans/2026-06-08-visual-reconciliation-r1-analysis-rev2.md` |
| Logic Improvement | no candidates approved for this task — preserve existing logic. |
| Primary visual SSOT | `docs/design/design.md` |
| Higher behavior SSOT | `docs/req-landing.md`, especially §6.5, §6.6, §8.5, §9.2, §9.3 |
| Governing decisions | BQ-04, BQ-07, BQ-12, BQ-19, BQ-21, BQ-24, BQ-25, BQ-26, new BQ-27/BQ-28 |

## 2. Files and boundaries

### Step 1 refinement target

- `docs/plans/2026-06-08-visual-reconciliation-r1.md`

This plan is edited only during the pre-implementation refinement step. No later implementation
unit edits it to record outcomes.

### Visual SSOT

- `docs/design/design.md`
- `docs/decision-register.md`

### Runtime visual implementation

- `src/features/landing/grid/landing-grid-card.module.css`
- `src/features/landing/grid/landing-grid-card.tsx`

### Localized copy

- `src/messages/en.json`
- `src/messages/de.json`
- `src/messages/es.json`
- `src/messages/fr.json`
- `src/messages/id.json`
- `src/messages/pt.json`
- `src/messages/ru.json`

Caseless scripts remain unchanged: `hi`, `ja`, `kr`, `zs`, `zt`.

### Regression coverage

- `tests/unit/landing-card-contract.test.ts`
- `tests/unit/landing-message-labels.test.ts` (new)
- `tests/e2e/grid-smoke.spec.ts`

### Reference-only / never edit

- `docs/plans/2026-06-08-visual-reconciliation-r1-analysis.md`
- `docs/plans/2026-06-08-visual-reconciliation-r1-analysis-rev2.md`
- All ten supplied screenshots
- `legacy/reference`
- Checkpoint worktrees/branches
- `docs/design/resources/superseded/**`

### Runtime and QA exclusions

- `src/app/globals.css`
- `public/theme-bootstrap.js`
- `src/features/transition/**`
- `src/features/telemetry/**`
- `src/features/variant-registry/**`
- Landing interaction/lifecycle/keyboard controller files
- GNB and page-shell files
- `tests/e2e/theme-matrix-manifest.json`
- Existing visual snapshot PNGs and baseline provenance
- `scripts/qa/**`

`docs/wave-roadmap.md` is not required by the visual implementation. Any R1 completion record there
must be a separately approved post-implementation documentation unit.

Static QA adjunct: pending explicit user approval. Do not edit scripts/qa until approved.

## 3. Authority and locked decisions

Use the authority and conflict handling in rev2 §2.1-§2.2, with the user's 2026-06-08
re-confirmation above the repository precedence.

### R1 changes

Implement R1-V-01 through R1-V-06 exactly as classified in rev2 §5, using the selectors and
constants identified in rev2 §4.2-§4.3. Re-anchor only the documentation statements listed in rev2
§9 and append the ready-to-use BQ-27/BQ-28 rows from rev2 §10.

### Title / clamp / wrap matrix

The user re-confirmed this matrix on 2026-06-08. The following is verbatim from rev2 §6.1:

- Desktop/Tablet Normal title remains single-line ellipsis.
- Mobile Normal title remains full text, no ellipsis, wrap allowed.
- Mobile Expanded and transient titles remain full text, no ellipsis, wrap allowed.
- Desktop/Tablet Expanded preserves the measured Normal first-line split and full overflow text.
- Normal subtitle remains two-line ellipsis.
- Expanded choice text remains unlimited wrap with no truncation.
- Tag chips remain single-line and may ellipsize inside the fixed one-line tags slot.

### Must survive unchanged

- Normal slot order: Thumbnail -> Title -> Subtitle -> Tags.
- Expanded resting-pixel floor and single 14px-min flex spacer.
- Full-digit meta values and `completed` label.
- `items-start` choice arrow alignment and no optical nudge.
- No Normal Test hover skin.
- Blog whole-card link, no expanded state, no separate CTA.
- Unavailable semantic disabled button, keyboard skip, AT exposure.
- All behavior/routing/storage/telemetry/transition/a11y logic.
- Scoped token model; no `globals.css`.
- No baseline regeneration.
- Mobile Expanded Wave 13 card shape, GNB coverage, positioning, natural-height policy,
  backdrop/scroll behavior, lifecycle, and B14 pending markers.
- Desktop title split nodes, full title text, and first-line continuity.

### Explicitly forbidden implementation shortcuts

- `margin-top:auto`
- `justify-content:space-between`
- filler flex used to bottom-pin Normal content
- pseudo-spacer compensation

These remain outside R1 under rev2 §2.2, §3, and §7.

## 4. Impact assessment

- **Shared shell/GNB:** no files touched.
- **Localization:** seven case-bearing `comingSoon` values change; key names and locale routing do
  not change.
- **A11y:** semantic elements, labels, focus behavior, tab order, and accessible names remain
  unchanged. The hairline/tag borders improve non-color structure.
- **State contracts:** no state type, reducer, controller, lifecycle, or handoff change.
- **Core flow:** no navigation, Test entry, Blog entry, storage, telemetry, or transition change.
- **Responsiveness:** typography values change, but clamp rules and viewport branches stay intact.
- **Design-system consistency:** scoped values are updated to the live `design.md`; global
  consolidation remains Wave 16.
- **Performance:** no package, asset, observer, animation, or render-path logic change.

## 5. Decisions confirmed

1. The requirement-accurate title/subtitle wording replaces the proposed blanket
   "catalog title only truncates; subtitles never truncate" wording.
2. R1 includes the material remainder findings R1-V-04 through R1-V-06, not only A1–A3.
3. The seven case-bearing localized coming-soon labels are lowercased; caseless scripts remain
   byte-identical.
4. Static QA adjunct approval is separate from visual approval; Phase 5 and Phase 9 remain
   pre-existing static-assertion drift caused by the approved Wave 7/8 architecture (rev2 §8).
5. Wave 10 bottom-rhythm and Wave 13 mobile focused-expand work remain deferred.

Logic Improvement: no candidates approved for this task — preserve existing logic.

## 6. Execution units

### Unit 1: Write failing visual contracts

**Files:**

- Modify: `tests/unit/landing-card-contract.test.ts`
- Create: `tests/unit/landing-message-labels.test.ts`
- Modify: `tests/e2e/grid-smoke.spec.ts`

- [ ] Add unit contracts for shared bordered tags, complete duration-item emphasis, desktop
  expanded context classes/split nodes, Blog label/arrow visual children, and non-interactive
  semantics.
- [ ] Add exact 12-locale `landing.comingSoon` expectations, changing only the seven case-bearing
  values.
- [ ] Add one non-snapshot R1 E2E block covering exact resting surface/border/tag colors and Normal
  typography.
- [ ] Add named E2E validation anchors for every R1-V-05 sub-surface:
  1. Expanded outer surface/edge/shadow.
  2. Desktop expanded context typography.
  3. Mobile expanded context typography.
  4. Complete duration-item emphasis.
  5. Choice/question preservation.
- [ ] Cover Desktop/Tablet Normal one-line clamp; Mobile Normal plus Mobile Expanded/transient
  full-text no-ellipsis; desktop full title and first-line continuity; Normal subtitle two-line
  clamp; unlimited choices; Blog 6px gap; Unavailable shared tag treatment and locale casing.

Run:

```bash
npm test -- tests/unit/landing-card-contract.test.ts tests/unit/landing-message-labels.test.ts
```

Expected RED: failures identify the old casing/markup/style contracts.

Run:

```bash
PLAYWRIGHT_SERVER_MODE=preview npx playwright test tests/e2e/grid-smoke.spec.ts \
  --workers=1 --grep "visual reconciliation R1"
```

Expected before implementation: FAIL on old computed styles. No screenshot assertion is added.

### Unit 2: Apply Normal/resting, shared-tag, and locale values

**Files:**

- Modify: `src/features/landing/grid/landing-grid-card.module.css`
- Modify: `src/features/landing/grid/landing-grid-card.tsx`
- Modify: the seven case-bearing locale files listed in §2.

- [ ] Implement R1-V-01 through R1-V-04 exactly per rev2 §5.
- [ ] Keep the one shared tag treatment for Test, Blog, and Unavailable; add no per-type exception.
- [ ] Change `getDefaultCardCopy().comingSoon` and only the seven case-bearing locale values listed
  in rev2 §4.3; leave `hi`, `ja`, `kr`, `zs`, `zt` byte-identical.
- [ ] Add no CSS `text-transform`.
- [ ] Preserve slot order, title/subtitle clamp branches, unavailable surface/dim/full-opacity
  text, and all handlers/state.

Run:

```bash
npm test -- tests/unit/landing-card-contract.test.ts tests/unit/landing-message-labels.test.ts
```

Expected GREEN for the R1-V-01 through R1-V-04 and casing contracts.

### Unit 3: Reconcile Expanded and Blog micro-visuals

**Files:**

- Modify: `src/features/landing/grid/landing-grid-card.module.css`
- Modify: `src/features/landing/grid/landing-grid-card.tsx`

- [ ] Implement R1-V-05 as the five separately validated sub-surfaces from rev2 §12.2.
- [ ] Keep mobile context typography visual-only. Do not change Wave 13 shape, GNB coverage,
  positioning, natural-height policy, backdrop/scroll, lifecycle, or B14 markers.
- [ ] Preserve desktop measured line1/overflow nodes, full title, and first-line continuity while
  applying 14/500/1.4 muted context typography.
- [ ] Emphasize the complete duration item only; keep shared/completed plain muted, full-digit
  values, item order, and two separators.
- [ ] Implement R1-V-06 as two visual children with an explicit 6px gap inside one `aria-hidden`
  non-interactive parent. Preserve whole-card navigation and reveal behavior.

Run:

```bash
npm test -- tests/unit/landing-card-contract.test.ts
PLAYWRIGHT_SERVER_MODE=preview npx playwright test tests/e2e/grid-smoke.spec.ts \
  --workers=1 --grep "visual reconciliation R1|title clamp and expanded title continuity|blog Read more"
```

Expected: PASS. No visual snapshots are created or updated.

### Unit 4: Re-anchor visual SSOT

**Files:**

- Modify: `docs/design/design.md`
- Modify: `docs/decision-register.md`

- [ ] Re-anchor only the exact statements listed in rev2 §9: §4.2, §4.3, §4.11, §5.6, §6.1,
  §6.3, §6.10, and §7.2-§7.5.
- [ ] Do not authorize Wave 10/13/16 work or baseline regeneration.
- [ ] Append BQ-27 and BQ-28 using the ready-to-use live-schema rows in rev2 §10.

Run:

```bash
git diff --check -- docs/design/design.md docs/decision-register.md
```

Expected: exit 0.

## 7. Static QA adjunct

Static QA adjunct: pending explicit user approval. Do not edit scripts/qa until approved.

R1 runs the landing static gates read-only. Phase 5 and Phase 9 are expected to remain red because
their assertions target architecture removed by approved Wave 7/8 work; report them as pre-existing
static-assertion drift per rev2 §8. Do not claim the full check-phase suite is green.

## 8. Final verification

Run Basic Gates in order:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Run the landing static gates read-only:

```bash
node scripts/qa/check-phase4-grid-contracts.mjs
node scripts/qa/check-phase5-card-contracts.mjs
node scripts/qa/check-phase6-spacing-contracts.mjs
node scripts/qa/check-phase7-state-contracts.mjs
node scripts/qa/check-phase8-accessibility-contracts.mjs
node scripts/qa/check-phase9-performance-contracts.mjs
node scripts/qa/check-phase10-transition-contracts.mjs
```

Expected: Phase 4/6/7/8/10 follow current contracts; Phase 5/9 are reported as the pre-existing
static-assertion drift in rev2 §8. No `scripts/qa/**` edit is permitted.

Run the landing unit suite from `docs/agent-guides/verification-commands.md §landing`, plus the
targeted R1 unit contracts:

```bash
npm test -- \
  tests/unit/landing-card-contract.test.ts \
  tests/unit/landing-message-labels.test.ts \
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
```

Run functional, non-baseline E2E:

```bash
PLAYWRIGHT_SERVER_MODE=preview npx playwright test \
  tests/e2e/grid-smoke.spec.ts \
  tests/e2e/state-smoke.spec.ts \
  tests/e2e/a11y-smoke.spec.ts \
  --workers=1
```

Targeted assertions must cover every item listed in rev2 §12.4, including all five named R1-V-05
anchors from rev2 §12.2.

Forbidden verification:

```text
npm run qa:visual:full
playwright --update-snapshots
any equivalent snapshot/baseline regeneration
```

## 9. Completion conditions

- All Basic Gates and targeted functional/unit checks pass with zero errors.
- Landing static-gate results are reported exactly; Phase 5/9 are not misrepresented as R1
  regressions or as green.
- No snapshot or baseline file changes.
- `git diff --check` passes.
- Diff contains no Wave 10+ runtime work, controller logic, global-token promotion, routing,
  storage, telemetry, transition, or a11y behavior change.
- Both analysis documents, `docs/wave-roadmap.md`, `.planning/STATE.md`, and `scripts/qa/**` remain
  untouched.
