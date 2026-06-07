# Visual Reconciliation R1 Implementation Plan

> **For implementation:** Execute inline, one unit at a time. Do not use parallel agents or an
> automated multi-wave pipeline. This plan requires explicit user approval before any runtime,
> test, message, QA-script, or SSOT file below is modified.

**Goal:** Re-anchor the live visual SSOT to the locked rev4 catalog decisions and reconcile only
the completed Wave 1–9 card visual surfaces without changing behavior or opening Wave 10+.

**Architecture:** Keep the existing `LandingGridCard` seams and all controller/runtime contracts.
Apply exact visual values through scoped CSS custom properties and existing component-owned class
strings, normalize localized coming-soon copy, and repair only stale static QA checks that block
the requested gate suite.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4 arbitrary utilities, CSS modules,
Vitest/JSDOM, Playwright functional E2E, Node static QA scripts.

---

## 1. Metadata

| Field | Value |
|---|---|
| Initiative | Visual Reconciliation R1 |
| Plan date | 2026-06-08 |
| Workspace | `/Users/woohyeon/Local/ViveTest`, local `main` |
| Task mode | Implementation after approval |
| Wave range | Reconciliation through completed Wave 9; no new wave and no Wave 10+ implementation |
| BQ-19 analysis | `docs/plans/2026-06-08-visual-reconciliation-r1-analysis.md` |
| Logic Improvement | `no candidates approved — preserve existing logic` |
| Primary visual SSOT | `docs/design/design.md` |
| Higher behavior SSOT | `docs/req-landing.md`, especially §6.5, §6.6, §8.5, §9.2, §9.3 |
| Governing decisions | BQ-04, BQ-07, BQ-12, BQ-19, BQ-21, BQ-24, BQ-25, BQ-26, new BQ-27/BQ-28 |

## 2. Files to modify

### SSOT and outcome documentation

- `docs/design/design.md`
- `docs/decision-register.md`
- `docs/wave-roadmap.md`
- `docs/plans/2026-06-08-visual-reconciliation-r1-analysis.md`
- `docs/plans/2026-06-08-visual-reconciliation-r1.md`

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
- `tests/unit/landing-message-labels.test.ts` (new; exact 12-locale coming-soon casing contract)
- `tests/e2e/grid-smoke.spec.ts`

### Stale static-QA maintenance (Ask First)

- `scripts/qa/check-phase5-card-contracts.mjs`
- `scripts/qa/check-phase9-performance-contracts.mjs`

## 3. Reference-only / never modify in R1

- All ten supplied screenshots
- `legacy/reference`
- Checkpoint worktrees/branches
- `docs/design/resources/superseded/**`
- `src/app/globals.css`
- `public/theme-bootstrap.js`
- `src/features/transition/**`
- `src/features/telemetry/**`
- `src/features/variant-registry/**`
- Landing interaction/lifecycle/keyboard controller files
- GNB and page-shell files
- `tests/e2e/theme-matrix-manifest.json`
- Existing visual snapshot PNGs and baseline provenance

## 4. Locked design and preservation decisions

### R1 changes

1. Base resting card edge is `1px solid #e6e2d8`.
2. Tag chip is `#ece8df` with `1px solid #d6d1c4`, radius 5px, lowercase label,
   no dot, no per-card-type exception.
3. Normal available surface is exact scoped `#fff`; unavailable remains `#f4f1ea`.
4. Normal title is 20/600/1.3/-0.01em. Normal subtitle is 15/400/1.45.
5. Expanded surface uses scoped `#fff`, sage edge, and `--shadow-expanded` values.
6. Expanded context is 14/500/1.4 muted; preview question remains 21/600/1.3.
7. Expanded meta emphasizes the complete duration item only. Shared/completed remain muted.
8. Blog Read-more keeps existing behavior and gains an explicit 6px label/arrow gap.

### Text/clamp authority

- Desktop/Tablet Normal title: one-line ellipsis.
- Mobile Normal and Mobile Expanded title: complete text, no ellipsis, wrap as needed.
- Desktop/Tablet Expanded title: complete text with existing first-line continuity split.
- Normal subtitle: existing two-line ellipsis.
- Expanded choice text: unlimited wrap, no truncation.

### Must survive unchanged

- Expanded resting-pixel floor and single 14px-min flex spacer.
- Full-digit meta values and `completed` label.
- No arrow optical nudge.
- No Normal Test hover skin.
- Blog whole-card link, no expanded state, no separate CTA.
- Unavailable semantic disabled button, keyboard skip, AT exposure.
- All behavior/routing/storage/telemetry/transition/a11y logic.
- Scoped token model; no `globals.css`.
- No baseline regeneration.

## 5. Impact assessment

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

## 6. Decisions confirmed by approving this plan

1. The requirement-accurate title/subtitle wording replaces the proposed blanket
   "catalog title only truncates; subtitles never truncate" wording.
2. R1 includes the material remainder findings R1-V-04 through R1-V-06, not only A1–A3.
3. The seven case-bearing localized coming-soon labels are lowercased; caseless scripts remain
   byte-identical.
4. The stale Phase 5/9 static checks are repaired narrowly so all requested check-phase gates can
   pass. No runtime behavior is changed by that maintenance.
5. `margin-top:auto` tag-row conversion remains Wave 10 and is not implemented here.

## 7. Execution units

### Unit 1: Re-anchor the live visual SSOT

**Files:**

- Modify: `docs/design/design.md`
- Modify: `docs/decision-register.md`

- [ ] Add BQ-27 and BQ-28 to the decision register with the scoped-token, no-layout-shift,
  no-per-type-exception, and Wave-16 deferral notes.
- [ ] Rewrite `design.md` §4.3 and §4.11 so product clamp exceptions point to §7.2 and the
  requirements instead of claiming all text is untruncated.
- [ ] Update §5.6 `--tag-bg` to `#ECE8DF` and document the `--hairline-strong` border.
- [ ] Update §6.1 resting border to `--hairline`.
- [ ] Update §6.3 tag treatment and lowercase rule.
- [ ] Clarify §6.10 and §7.3 that the complete duration item alone is emphasized.
- [ ] Add §7.2 title/clamp and structural resting-edge bullets.
- [ ] Add §7.5 system-wide lowercase coming-soon tag bullet.
- [ ] Record the exact Normal and Expanded typography/surface values used by R1.

Run:

```bash
git diff --check -- docs/design/design.md docs/decision-register.md
```

Expected: exit 0, with no Wave 10+, behavior, or global-token authorization added.

### Unit 2: Write regression contracts first

**Files:**

- Modify: `tests/unit/landing-card-contract.test.ts`
- Create: `tests/unit/landing-message-labels.test.ts`
- Modify: `tests/e2e/grid-smoke.spec.ts`

- [ ] Change expected English coming-soon text to `coming soon`.
- [ ] Add unit assertions that the tag class consumes a non-transparent border token and keeps the
  5px/no-dot/nowrap contract.
- [ ] Assert expanded meta renders exactly one `<strong>` duration item and keeps shared/completed
  outside it.
- [ ] Assert Blog Read-more has separate label/arrow visual parts and no focusable/CTA semantics.
- [ ] Add exact expected `comingSoon` values for all 12 locales, including unchanged caseless
  scripts.
- [ ] Replace old E2E transparent-border/tag-border assertions with exact computed colors.
- [ ] Add computed-style assertions for Normal surface/type metrics, Expanded sage edge/context,
  duration-only emphasis, and Blog 6px gap.
- [ ] Keep mobile full-title and desktop one-line/full-expanded continuity assertions unchanged.

Run:

```bash
npm test -- tests/unit/landing-card-contract.test.ts tests/unit/landing-message-labels.test.ts
```

Expected before implementation: FAIL on old copy/markup/styles.

Run:

```bash
PLAYWRIGHT_SERVER_MODE=preview npx playwright test tests/e2e/grid-smoke.spec.ts \
  --workers=1 --grep "visual reconciliation R1"
```

Expected before implementation: FAIL on old computed styles. No screenshot assertion is added.

### Unit 3: Apply Normal/resting card and tag values

**Files:**

- Modify: `src/features/landing/grid/landing-grid-card.module.css`
- Modify: `src/features/landing/grid/landing-grid-card.tsx`

- [ ] Add scoped tokens:

```css
--normal-card-surface: #ffffff;
--normal-card-border: #e6e2d8;
--normal-tag-bg: #ece8df;
--normal-tag-border: #d6d1c4;
```

- [ ] Consume `--normal-card-surface` in the collapsed resting branch.
- [ ] Change the tag class from `border-transparent` to
  `border-[var(--normal-tag-border)]`.
- [ ] Add `tracking-[-0.01em]` to the Normal title without changing clamp branches.
- [ ] Change Normal subtitle to `text-[15px] leading-[1.45]` without changing `line-clamp-2`.
- [ ] Keep the unavailable surface override and thumbnail opacity unchanged.

Run:

```bash
npm test -- tests/unit/landing-card-contract.test.ts
npm run lint
npm run typecheck
```

Expected: relevant Normal/tag tests pass; lint/typecheck exit 0.

### Unit 4: Reconcile Expanded and Blog micro-visuals

**Files:**

- Modify: `src/features/landing/grid/landing-grid-card.module.css`
- Modify: `src/features/landing/grid/landing-grid-card.tsx`

- [ ] Add scoped Expanded tokens matching `design.md`:

```css
--expanded-card-surface: #ffffff;
--expanded-card-border: #5c8e78;
--expanded-card-shadow: 0 12px 32px rgb(26 26 31 / 8%),
  0 0 0 1px #d6d1c4;
--expanded-context-ink: #7a7a85;
--expanded-meta-strong: #4a4a55;
```

- [ ] Replace legacy global divider/shadow consumption only on the Expanded card surface/shadow
  plate. Do not change dimensions, floor styles, transform geometry, or pointer behavior.
- [ ] Style `cardTitleExpanded` as the 14/500/1.4 muted context while preserving the existing
  measured line1/overflow nodes and full text.
- [ ] Render the first meta item as one semantic `<strong>` containing value and label; keep
  shared/completed as plain muted spans and separators unchanged.
- [ ] Split the Blog Read-more label and arrow into visual children with `gap-[6px]`; keep the
  parent `aria-hidden`, non-focusable, hover-only desktop, always-visible mobile, and no arrow
  vertical nudge.

Run:

```bash
npm test -- tests/unit/landing-card-contract.test.ts
PLAYWRIGHT_SERVER_MODE=preview npx playwright test tests/e2e/grid-smoke.spec.ts \
  --workers=1 --grep "visual reconciliation R1|title clamp and expanded title continuity|blog Read more"
```

Expected: PASS. No visual snapshots are created or updated.

### Unit 5: Normalize localized coming-soon copy

**Files:**

- Modify the seven case-bearing locale files listed in §2.
- Modify: `src/features/landing/grid/landing-grid-card.tsx`
- Verify: `tests/unit/landing-message-labels.test.ts`

Target values:

```text
en: coming soon
de: demnächst
es: próximamente
fr: bientôt disponible
id: segera hadir
pt: em breve
ru: скоро
```

- [ ] Change `getDefaultCardCopy().comingSoon` to `coming soon`.
- [ ] Do not change `hi`, `ja`, `kr`, `zs`, or `zt`.
- [ ] Do not add CSS `text-transform`; accessible and source copy must match the visible label.

Run:

```bash
npm test -- tests/unit/landing-message-labels.test.ts tests/unit/landing-card-contract.test.ts
```

Expected: PASS for all 12 locale values.

### Unit 6: Repair stale static QA checks

**Files (Ask First):**

- Modify: `scripts/qa/check-phase5-card-contracts.mjs`
- Modify: `scripts/qa/check-phase9-performance-contracts.mjs`

- [ ] Phase 5: replace stale `cardSubtitleExpanded` / `Blog Expanded` requirements with assertions
  for Test Expanded slots plus Blog whole-card/no-expanded coverage already present in
  `landing-card-contract.test.ts`.
- [ ] Phase 9: remove requirements for deleted primary CTA class constants. Assert explicit cursor
  policy on answer choices, card triggers, and `aria-disabled` triggers instead.
- [ ] Do not loosen unrelated checks and do not touch `_path-config.mjs`.

Run:

```bash
node scripts/qa/check-phase5-card-contracts.mjs
node scripts/qa/check-phase9-performance-contracts.mjs
```

Expected: both pass at the R1 implementation state.

### Unit 7: Record the reconciliation outcome

**Files:**

- Modify: `docs/wave-roadmap.md`
- Modify: `docs/plans/2026-06-08-visual-reconciliation-r1.md`

- [ ] Add an inter-wave R1 reconciliation entry after Wave 9 without changing Wave numbering.
- [ ] Record exact changed files, approved deferrals, and gate results.
- [ ] Preserve Wave 10 as the next handoff and keep bottom-pinned tag layout in Wave 10.
- [ ] Record BQ-07 baseline exclusion and any residual pre-existing debt.

Run:

```bash
git diff --check
```

Expected: exit 0.

## 8. Final verification

Run Basic Gates in order:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Run registry/variant gates:

```bash
node scripts/qa/check-variant-registry-contracts.mjs
node scripts/qa/check-variant-only-contracts.mjs
npm test -- \
  tests/unit/landing-data-contract.test.ts \
  tests/unit/landing-card-contract.test.ts \
  tests/unit/registry-serializer.test.ts \
  tests/unit/variant-registry-runtime-integrity.test.ts
```

Run all requested existing phase gates:

```bash
node scripts/qa/check-phase4-grid-contracts.mjs
node scripts/qa/check-phase5-card-contracts.mjs
node scripts/qa/check-phase6-spacing-contracts.mjs
node scripts/qa/check-phase7-state-contracts.mjs
node scripts/qa/check-phase8-accessibility-contracts.mjs
node scripts/qa/check-phase9-performance-contracts.mjs
node scripts/qa/check-phase10-transition-contracts.mjs
```

Run functional, non-baseline E2E:

```bash
PLAYWRIGHT_SERVER_MODE=preview npx playwright test \
  tests/e2e/grid-smoke.spec.ts \
  tests/e2e/state-smoke.spec.ts \
  tests/e2e/a11y-smoke.spec.ts \
  --workers=1
```

Visual functional inspection in the in-app Browser:

- Desktop 1280/1440: resting hairline, tags, Normal typography, Blog hover/Read-more,
  Expanded sage edge/context/meta.
- Tablet 920/1023: Desktop/Tablet Normal title remains one-line ellipsis.
- Mobile 390: title remains complete with no ellipsis; tags remain bordered/lowercase; no
  focused-expanded redesign.
- Unavailable: surface/thumbnail/title/subtitle/a11y semantics unchanged except the shared
  hairline/tag treatment and lowercase copy.

Forbidden verification:

```text
npm run qa:visual:full
playwright --update-snapshots
manual edits to tests/e2e/*-snapshots/*.png
```

## 9. Completion conditions

- All Basic Gates, registry/variant gates, Phase 4–10 static gates, and selected functional E2E
  pass with zero errors.
- No snapshot or baseline file changes.
- `git diff --check` passes.
- Diff contains no Wave 10+ runtime work, controller logic, global-token promotion, routing,
  storage, telemetry, transition, or a11y behavior change.
- The plan's actual-outcome section and roadmap entry match the live diff and terminal proof.

