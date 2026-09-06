# Wave 12 Mobile Browse Card Visual - BQ-19 Step-1 Analysis

## 0. Gate, Provenance, and Startup Record

### Mode and authorization

- **Task mode:** Analysis Only.
- **BQ-19 gate:** Step 1 only.
- **Only authorized change:** this analysis file.
- **Not authorized:** implementation, implementation planning, candidate approval, authority-file
  edits, visual-regression baseline work, commits, pushes, branch/checkpoint operations, or network
  access.
- **Commands intentionally not run:** lint, typecheck, unit tests, E2E tests, build, snapshots, and
  baseline generation.

### Original draft provenance

The junior draft recorded that its first pass began on `main` at
`03c502d77f7e7030f65f9077418faf8ef844cd54`, while `docs/wave-roadmap.md` was modified, and later
observed `55e2808733b925d699ea9a7a606d1a868765de90`. Both commits exist. Their only tree difference is
the Wave 8 overview status in `docs/wave-roadmap.md`; the later commit marks Wave 8 complete.

This preserves the draft's history without treating its old startup state as the startup state of
this senior re-audit.

### Senior re-audit startup

| Item | Command | Observed result |
|---|---|---|
| Working directory | `pwd` | `/Users/b-m-2022001/Local/ViveTest` |
| Branch | `git branch --show-current` | `main` |
| HEAD | `git rev-parse HEAD` | `55e2808733b925d699ea9a7a606d1a868765de90` |
| Worktree | `git status --short --untracked-files=all` | `?? docs/plans/2026-06-15-wave-12-mobile-browse-card-visual-analysis.md` |
| Authorized file | worktree audit | the analysis document already existed as the sole untracked artifact |

Current code and authority findings below are anchored to HEAD `55e2808`. No screenshot content was
used in this re-audit. The screenshot directory was inventoried only by filename and dimensions.

## 1. Roadmap-Derived Scope

### Live Wave 12 authority

The live roadmap names the wave **"Mobile browse card visual"** and defines:

- **Purpose:** mobile browse-card visual treatment.
- **Include:** single-column browse-card visual and mobile Blog CTA visibility.
- **Exclude:** mobile expanded focus state.
- **Validation:** mobile browse smoke.
- **Risk:** Medium.
- **Handoff:** Wave 13 mobile expanded
  (`docs/wave-roadmap.md:459-468`).

The filename and title therefore correctly use the actual run date and the roadmap's Wave 12 name.

### In scope

1. Mobile Normal/browse card presentation at the existing mobile tier.
2. Card-stack gutter, card padding, internal vertical rhythm, and mobile text wrapping quality.
3. Mobile tag-chip visual treatment while reusing the Wave 10 BQ-32 fit mechanism unchanged.
4. Final mobile Blog `Read more →` presentation while preserving whole-card-link semantics.
5. Mobile unavailable-card visual parity under BQ-26.
6. Focused, non-baseline verification requirements for a later approved implementation.
7. Visual-authority gaps that must be re-anchored after the user makes taste/UX decisions.

Wave 10 already owns the shared visible-prefix resolver and the full mobile title/subtitle behavior.
Wave 12 may validate or visually refine those outcomes, but must not create a second fit or clamp
system (`docs/plans/2026-06-09-wave-10-landing-grid-analysis.md:244-325`,
`docs/plans/2026-06-09-wave-10-landing-grid-analysis.md:432-438`).

### Out of scope

- Mobile Expanded shape, position, scrim, close behavior, lifecycle, title baseline, or a11y:
  Wave 13.
- Desktop/Tablet redesign or re-tuning.
- Wave 11 keyboard/disclosure behavior.
- GNB or landing-shell redesign: Wave 15.
- Mobile menu: Wave 17.
- `src/app/globals.css`, global token migration, Pretendard, VIVE-base snap, or system-wide
  `--muted` AA correction: Wave 16 / BQ-29.
- Transition, telemetry, consent, storage, routing, resolver, generated registry, fixture,
  test-entry, pre-answer, or destination behavior.
- Snapshot/baseline creation or regeneration: BQ-07.

### Prerequisite divergence and formal readiness

The task prompt expected Waves 4-11 to be complete before Wave 12 implementation. The live roadmap
instead lists **Waves 2-3 and 8-9** as Wave 12 prerequisites
(`docs/wave-roadmap.md:18`, `docs/wave-roadmap.md:465`). The roadmap now marks Waves 1-11 complete
and records the Wave 11 Phase 9 reconciliation as complete
(`docs/wave-roadmap.md:7-18`, `docs/wave-roadmap.md:442-457`).

`.planning/STATE.md`, however, still identifies Wave 10 as validation-blocked and says the Phase 9
matcher remains stale (`.planning/STATE.md:1-11`, `.planning/STATE.md:120-140`). It is a continuity
artifact rather than an implementation SSOT, but its unresolved state conflicts with the task's
explicit prerequisite warning.

**Ruling:** this analysis may use HEAD `55e2808` as the implementation baseline. Wave 12
implementation remains formally blocked until the user reconciles or retires the stale STATE record
and confirms which prerequisite wording governs the handoff.

## 2. Authority and Locked Boundaries

Applied precedence:

1. `docs/decision-register.md`
2. `docs/req-landing.md` and active project rules
3. `docs/design/design.md` for visual intent only
4. current implementation and tests
5. mockup resources as interpretation aids only

### Locked decisions carried into Wave 12

- **BQ-19:** analysis and later user approval are mandatory before implementation
  (`docs/decision-register.md:25`, `docs/wave-roadmap.md:38-61`).
- **BQ-21:** requirements/code own behavior and a11y; `design.md` owns visual intent
  (`docs/decision-register.md:27`, `docs/agent-guides/project-rules.md:125-131`).
- **BQ-32:** reuse the shared measured prefix resolver. No mobile locale table, card-type threshold,
  container-query approximation, or second visible-count state
  (`docs/decision-register.md:38`, `docs/req-landing.md:289-293`).
- **BQ-30:** borderless tags; available fill `#ECE8DF`; unavailable status fill `#E6E2D8`
  (`docs/decision-register.md:36`).
- **BQ-26:** unavailable remains a semantic, AT-exposed `<button aria-disabled="true"
  tabindex="-1">`; coming-soon remains the mandatory public status prefix
  (`docs/decision-register.md:32`, `docs/req-landing.md:679-702`).
- **BQ-29:** no global `--muted` correction before Wave 16
  (`docs/decision-register.md:35`).
- **BQ-24/BQ-25:** desktop Expanded floor/spacer and choice-arrow deferral remain untouched
  (`docs/decision-register.md:30-31`).
- **BQ-07/BQ-04:** no baseline regeneration and no global theme cleanup
  (`docs/decision-register.md:10`, `docs/decision-register.md:13`).
- **BQ-33:** preserve all Wave 11 desktop keyboard/a11y outcomes
  (`docs/decision-register.md:39`).

## 3. Evidence Method and Grade Discipline

The junior draft often treated "the source contains the intended value" as equivalent to "the
mobile visual result is satisfied." That is too strong for a visual wave.

Grades in this revision mean:

- **satisfied:** written authority, current source, and existing mobile-specific proof all align.
- **unproven:** source is plausible or shared coverage exists, but mobile-specific computed evidence
  or the required visual reference is missing.
- **not-satisfied:** current source directly conflicts with written authority or an existing test
  materially overstates what it proves.

Three truth layers are kept separate:

1. **Current runtime contract**
2. **Current visual result**
3. **Product/design decision still required**

No screenshot-conformance claim is made in this pass.

## 4. Evidence Audit

### 4.1 Mobile frame, stack, and card surface

| Target | Grade | Evidence and senior finding |
|---|---|---|
| Mobile is one column | **satisfied** | The mobile resolver returns one column for all rows (`src/features/landing/grid/layout-plan.ts:63-86`) and the 390px smoke verifies the mobile tier and one-column rows (`tests/e2e/grid-smoke.spec.ts:390-402`). |
| Page side inset is 16px | **unproven visually** | Source uses `px-4` before `md` (`src/features/landing/shell/page-shell.tsx:17-24`), matching `req-landing`'s 16px rule (`docs/req-landing.md:181-185`). Existing Wave 12-relevant E2E does not assert the computed inset or compare it to a native 390px reference. |
| Mobile card-stack gutter is 14-16px | **unproven visually** | Source uses 15px for container and row gaps below `md` (`src/features/landing/grid/landing-catalog-grid.tsx:198-210`), inside the written 14-16px target (`docs/req-landing.md:191-202`, `docs/design/design.md:337-347`). No focused mobile computed-gap assertion exists. |
| Base card uses 16px padding, 16px radius, white available surface, hairline, and restrained shadow | **unproven on mobile** | Source aligns: trigger padding 16px, root radius 16px, and scoped surface/border/shadow (`src/features/landing/grid/landing-grid-card.tsx:205-223`, `src/features/landing/grid/landing-grid-card.tsx:1007-1048`, `src/features/landing/grid/landing-grid-card.module.css:1-13`). Current exact computed-style smoke is desktop-oriented (`tests/e2e/grid-smoke.spec.ts:589-648`), not a 360/390 mobile matrix. |
| Exact 390px mockup conformance | **unproven** | `design.md` lists a 390px "Mobile browse" resource (`docs/design/design.md:370-387`), but no dedicated file exists. The screenshot directory contains only four 924x540 images: `canvas-overview.png`, `desktop-full.png`, `desktop-nav-expanded.png`, and `expanded-card-spec.png`. |

The resource manifest currently reads like an inventory of present files, but most named component
artboards are absent. That is a documentation problem, not evidence that the mobile artboard exists.

### 4.2 Mobile title, subtitle, and wrapping quality

| Target | Grade | Evidence and senior finding |
|---|---|---|
| Mobile title is unclamped/full | **satisfied in source; visual wrapping unproven** | Mobile removes the one-line clamp (`src/features/landing/grid/landing-grid-card.tsx:384-406`). Existing coverage checks a representative mobile title, but not all 12 locales at 360/390px. |
| Mobile subtitle is unclamped/full | **satisfied** | Mobile removes `line-clamp-2` (`src/features/landing/grid/landing-grid-card.tsx:347-380`). The 390px 12-locale smoke proves no clamp, full scroll height, positive base gap, and one-card-row `comp_gap=0` (`tests/e2e/grid-smoke.spec.ts:474-527`). |
| Title/subtitle size, weight, and line-height | **source-aligned; visual proof incomplete** | Title is 20/600/1.3/-0.01em and subtitle is 15/400/1.45 (`src/features/landing/grid/landing-grid-card.tsx:211-214`), matching `design.md` (`docs/design/design.md:133-143`, `docs/design/design.md:287-291`). Existing exact computed type assertion is desktop-only (`tests/e2e/grid-smoke.spec.ts:589-642`). |
| Korean/CJK mobile line breaking follows `keep-all` with `anywhere` fallback | **not-satisfied** | `design.md` requires `word-break: keep-all; overflow-wrap: anywhere` for wrapping text (`docs/design/design.md:81-86`, `docs/design/design.md:116-117`). Normal title/subtitle currently set only `overflow-wrap:anywhere`; unlike expanded question/choice text, they omit `word-break:keep-all` (`src/features/landing/grid/landing-grid-card.tsx:211-214`, `src/features/landing/grid/landing-grid-card.tsx:224-230`). Existing 12-locale subtitle smoke proves height, not line-break quality. |
| One consistent numeric internal rhythm | **not-satisfied against written visual SSOT; runtime contract is internally consistent** | Runtime uses one shared 8px `LANDING_CARD_BASE_GAP_PX` (`src/features/landing/grid/spacing-plan.ts:1-2`) and exposes the same value to CSS/data geometry (`src/features/landing/grid/landing-grid-card.tsx:1099-1103`, `src/features/landing/grid/landing-grid-card.tsx:1142-1146`). `design.md` identifies 12px as the realized "card content gap" (`docs/design/design.md:210-224`). Requirements lock consistency and non-zero behavior, but no number (`docs/req-landing.md:327-343`). |

The 8px/12px issue is not merely a screenshot gap: the written visual authority and runtime value
are different. A screenshot is still needed to decide whether the runtime should change or the
visual wording is stale. The analysis must not preselect 8px simply because it is already stable.

### 4.3 Mobile tag row and BQ-32 reuse

| Target | Grade | Evidence and senior finding |
|---|---|---|
| Borderless BQ-30 fills/radius/padding/nowrap | **unproven on mobile** | Shared source uses 5px radius, available `#ECE8DF`, unavailable `#E6E2D8`, `4px 9px`, nowrap, and no border (`src/features/landing/grid/landing-grid-card.tsx:217-223`, `src/features/landing/grid/landing-grid-card.module.css:9-13`, `src/features/landing/grid/landing-grid-card.module.css:70-82`). Exact computed assertions currently run at desktop width (`tests/e2e/grid-smoke.spec.ts:651-695`). |
| Tag type role matches the visual SSOT | **not-satisfied** | `design.md` defines Tags/meta as 13/500/1.35 (`docs/design/design.md:133-143`). The live chip is 13/500/**1.2** (`src/features/landing/grid/landing-grid-card.tsx:221-223`). The adjacent Blog affordance is 13/500/1.35 (`src/features/landing/grid/landing-grid-card.tsx:493-510`), so the shared row currently mixes line-height roles. Existing tests do not assert chip line-height. |
| One shared fit mechanism serves mobile | **satisfied** | Every Normal tag row calls the same `useCardInlineGeometry`; mobile only changes CTA visibility (`src/features/landing/grid/landing-grid-card.tsx:441-459`). The hook measures row/tag/CTA widths and calls the single resolver (`src/features/landing/grid/use-card-inline-geometry.ts:181-219`, `src/features/landing/grid/use-card-inline-geometry.ts:311-332`). |
| Right-first suffix removal and 56px tail | **satisfied as behavior** | The pure resolver computes a left prefix and only permits the last visible tail to shrink to 56px (`src/features/landing/grid/spacing-plan.ts:27-38`, `src/features/landing/grid/spacing-plan.ts:60-101`). Only the prefix is rendered (`src/features/landing/grid/landing-grid-card.tsx:459-489`). |
| Probe and hidden-suffix semantics | **satisfied** | Probe is `aria-hidden` + `inert` in a zero-size clipped anchor (`src/features/landing/grid/landing-grid-card.tsx:512-553`, `src/features/landing/grid/landing-grid-card.module.css:98-115`). A11y smoke proves hidden suffix/probe exclusion (`tests/e2e/a11y-smoke.spec.ts:441-475`). |
| 12-locale mobile prefix/CTA composition at 360/390/767 | **unproven** | The 12-locale prefix transition test runs at 900px and constrains the container to 540px, which remains Tablet (`tests/e2e/grid-smoke.spec.ts:987-1095`). Its final 390px step proves only aggregate document/container overflow zero (`tests/e2e/grid-smoke.spec.ts:1097-1117`), not visible-prefix identity, tail width, or CTA reservation per locale. |

**Boundary ruling:** no Wave 12 candidate may add a locale threshold, mobile-only visible-count
state, CSS clipping substitute, or second resolver. The only admissible fit behavior is BQ-32.

### 4.4 Mobile Blog `Read more →`

| Target | Grade | Evidence and senior finding |
|---|---|---|
| Always visible in mobile tap mode | **satisfied as behavior** | Mobile/tap uses `ctaVisibility='always'` and `opacity-100` (`src/features/landing/grid/landing-grid-card.tsx:441-458`, `src/features/landing/grid/landing-grid-card.tsx:493-510`). Existing smoke proves visibility and navigation at 767px (`tests/e2e/grid-smoke.spec.ts:932-948`). |
| Label and arrow are separate with 6px internal gap | **satisfied** | Markup and styling match the written visual rule (`src/features/landing/grid/landing-grid-card.tsx:493-510`, `docs/design/design.md:312-316`). |
| CTA remains one line and contained on narrow mobile | **not proven by the test that claims it** | The test title says "narrow mobile cards," but it runs at `MOBILE_MAX_VIEWPORT_WIDTH` = 767px for only `id`, `ru`, `fr`, and `de` (`tests/e2e/grid-smoke.spec.ts:950-985`). It does not prove 360px or 390px behavior. |
| Whole card is the sole link; CTA is decorative | **satisfied** | Blog renders one whole-card `Link`; `Read more` is `aria-hidden`, has no `tabIndex`, and contains no control (`src/features/landing/grid/landing-grid-card.tsx:493-510`, `src/features/landing/grid/landing-grid-card.tsx:1158-1173`). Unit coverage preserves no Expanded/primary CTA (`tests/unit/landing-card-contract.test.ts:391-423`). |
| CTA width has priority over tags | **satisfied as mechanism; mobile matrix unproven** | CTA intrinsic width plus row gap is reserved before prefix resolution (`src/features/landing/grid/use-card-inline-geometry.ts:311-331`). Existing transition proof is Tablet; no all-locale 360/390 mobile composition proof exists. |
| CTA ink/emphasis matches visual intent | **unproven** | The affordance inherits legacy global `--muted-ink` (`src/features/landing/grid/landing-grid-card.tsx:493-503`, `src/app/globals.css:4-18`). `design.md` specifies no exact CTA color. A proposed hex value would be invention until the mobile reference is supplied. |
| Tag-to-CTA row density matches visual intent | **unproven** | Live tag-to-tag gap is 8px and tag-to-CTA row gap is 12px (`src/features/landing/grid/landing-grid-card.tsx:217-220`, `src/features/landing/grid/landing-grid-card.tsx:540-549`). The written SSOT does not select the outer row gap. |

`design.md` says "Read more" has a 44x44 tap target (`docs/design/design.md:110-114`), while the
behavior authority makes the visual affordance decorative and the whole-card link interactive
(`docs/req-landing.md:259-275`, `docs/req-landing.md:695-702`). This should be clarified as
"the whole-card link supplies the target," not interpreted as permission to create a nested CTA.

### 4.5 Mobile unavailable presentation

| Target | Grade | Evidence and senior finding |
|---|---|---|
| Warm surface, 0.72 thumbnail dim, full-opacity title/subtitle | **unproven on mobile** | Shared source aligns (`src/features/landing/grid/landing-grid-card.module.css:19-23`, `src/features/landing/grid/landing-grid-card.module.css:70-82`). Existing 390px tap-mode smoke checks only status presence/opacity, not the complete surface/dim/text matrix (`tests/e2e/grid-smoke.spec.ts:1620-1655`). |
| Standard status tag, no overlay/pill/dot | **satisfied structurally** | Unavailable normalizes to one coming-soon tag in the shared row (`src/features/landing/grid/landing-grid-card.tsx:441-489`). Unit coverage verifies the semantic/markup shape (`tests/unit/landing-card-contract.test.ts:334-389`). |
| AT-exposed, keyboard-skipped model | **satisfied** | Trigger owns disabled/name/status semantics and remains programmatically perceivable (`src/features/landing/grid/landing-grid-card.tsx:1175-1194`, `tests/e2e/a11y-smoke.spec.ts:330-369`). |
| Long localized coming-soon labels remain readable and contained at 360/390px | **unproven** | All 12 message keys exist, including long French and Hindi labels (`src/messages/fr.json:21`, `src/messages/hi.json:21`), but no focused mobile width/localization matrix proves the status chip and full card remain visually balanced. |

No Wave 12 styling may make unavailable focusable, hide its status, add an overlay/pill/dot, or add
mobile-specific availability behavior.

## 5. Senior Corrections to the Junior Draft

1. **Remove unsupported mockup claims.** The previous draft described what the low-resolution canvas
   "visibly shows." This pass intentionally makes no screenshot-content claim.
2. **Do not recommend an invented CTA hex.** `#4A4A55` is an existing body/tag value, but no
   authority currently assigns it to `Read more →`.
3. **Do not preselect 8px.** Runtime stability is not authority. The 8px implementation and 12px
   written "card content gap" must be resolved explicitly.
4. **Correct the CTA test claim.** The "narrow mobile" localization test runs at 767px, not 360/390px.
5. **Add the missed text-wrapping gap.** Normal title/subtitle omit the required `keep-all` rule.
6. **Add the missed tag typography gap.** Tags use line-height 1.2 while the visual role says 1.35.
7. **Downgrade source-only visual claims.** Shared CSS and desktop computed checks do not prove the
   final mobile result.
8. **Treat the Resource Manifest as stale inventory.** It lists multiple resources that are not
   present, not only the mobile browse artboard.

## 6. Mechanism Comparisons and Recommended Rulings

All rulings are recommendations for later user review. None is approved.

### 6.1 Mobile Normal line-breaking quality

| Alternative | Fit | Risk / continuity | Testability | Ruling |
|---|---|---|---|---|
| A. Keep only `overflow-wrap:anywhere` | No code change | Preserves current CJK/Korean break behavior but remains contrary to written visual foundation | High | **Reject as final authority alignment** |
| B. Add scoped mobile Normal `word-break:keep-all` while retaining `overflow-wrap:anywhere` | Directly addresses Wave 12 full-text wrapping without changing global CSS | Could increase line count/card height; requires 12-locale overflow and Wave 13 snapshot/restore regression proof | High | **Recommend W12-LI-01** |
| C. Change global typography/wrapping rules | Broadest consistency | Pulls Wave 16/global scope forward | High but out of scope | **Reject** |

### 6.2 Tag and CTA baseline

| Alternative | Fit | Risk / continuity | Testability | Ruling |
|---|---|---|---|---|
| A. Keep tag 1.2 / CTA 1.35 and re-anchor design.md | Maximum runtime continuity | Formalizes two line-height roles in one row; needs visual justification | High | Possible only by user decision after screenshot review |
| B. Change the shared tag chip to 1.35 | Literal visual-role alignment | Alters completed Desktop/Tablet chip height/ink box and may change intrinsic widths/visible prefix counts | High | **Not admissible as a silent Wave 12-only edit** |
| C. Apply 1.35 only on mobile | Keeps desktop stable | Splits a reusable tag primitive by breakpoint and requires an application-layer rationale | High | Conditional candidate only if the mobile reference clearly requires it |

**Recommended ruling:** carry **W12-LI-02** as a decision gate. Do not change line-height before the
mobile card close-up is available.

### 6.3 Blog CTA ink and emphasis

| Alternative | Fit | Risk / continuity | Testability | Ruling |
|---|---|---|---|---|
| A. Keep legacy `var(--muted-ink)` | No change | Remains coupled to the pre-Wave-16 global theme and is not an explicit mobile visual decision | High | Acceptable temporary fallback, not proof of conformance |
| B. Revalue `--muted-ink` or add global tokens | Could align many surfaces | Direct BQ-29/Wave 16 violation | High but out of scope | **Reject** |
| C. After screenshot review, assign one card-scoped existing semantic role/value | Keeps the decision local and removable in Wave 16 | Exact value is taste-owned; must not become interactive or independently hover-colored | High | **Recommend W12-LI-03 only after visual evidence** |

No exact color is recommended in Step 1.

### 6.4 Base rhythm and tag-to-CTA gap

| Alternative | Fit | Risk / continuity | Testability | Ruling |
|---|---|---|---|---|
| A. Preserve 8px `base_gap` and re-anchor `design.md` | Preserves Wave 10 runtime/lifecycle | Declares the current code authoritative over the current visual wording; needs user approval | Very high | Open option, not default |
| B. Add a mobile 12px value through the existing spacing contract | Can satisfy the literal visual token without lying in data/CSS geometry | Changes card height and Wave 13 snapshot/restore inputs | High | Conditional after screenshot/user confirmation |
| C. Change the shared base gap to 12px | Literal global visual interpretation | Alters Desktop/Tablet completed surfaces and exceeds Wave 12 | High | **Reject in Wave 12** |
| D. Override CSS only while data/controller remain 8px | Quick appearance change | Splits rendered geometry from measurement/debug contracts | Low-quality | **Reject** |
| E. Choose tag-to-CTA gap by locale, label length, or tag count | Maximizes local fit | Reintroduces content thresholds around BQ-32 | Medium | **Reject** |
| F. Choose one mobile row gap, measured by the existing hook | Maintains one fit mechanism | Value remains a visual decision and changes visible prefix count | High | Carry under **W12-LI-04** after screenshot review |

### 6.5 Mobile-focused proof

| Alternative | Fit | Risk / continuity | Testability | Ruling |
|---|---|---|---|---|
| A. Reuse broad Wave 10 tests only | Strong behavior baseline | Misses 360/390 composition, mobile computed visuals, and CJK wrapping quality | Medium | Insufficient |
| B. Add focused units and non-snapshot `grid-smoke`/`a11y-smoke` cases with `assertion:W12-mobile` | Matches roadmap validation and isolates Wave 12 claims | Assertions must encode only approved visual values | High | **Recommend W12-LI-05** |
| C. Add/refresh screenshot baselines | Direct visual regression | Forbidden by BQ-07 | High but unauthorized | **Reject** |

### 6.6 Behavior-layer handling

| Alternative | Fit | Risk / continuity | Testability | Ruling |
|---|---|---|---|---|
| A. Preserve state/hooks/routing/storage/telemetry/resolver/i18n data and modify only approved scoped visual classes/tests | Exact Wave 12 boundary | Main risk is accidental behavior drift | High with no-change audit | **Recommend W12-LI-06** |
| B. Add a mobile visible-count state, locale thresholds, or new resolver | Duplicates BQ-32 | Two sources of truth and resize/localization divergence | Medium | **Reject** |
| C. Change copy/message keys as part of visual polish | Not required; all 12 keys exist | Product/translation scope expansion | High | Reject unless separately requested |

## 7. Logic Improvement Candidate Table

Criteria are: 1 Modern React patterns, 2 simplicity/maintainability, 3 performance, 4 testability,
5 a11y-related logic.

| ID | Candidate | Layer | Magnitude | Improvement value against criteria 1-5 | Risk / rollback | Wave dependency | Recommendation |
|---|---|---|---|---|---|---|---|
| W12-LI-01 | Add mobile Normal `word-break:keep-all` while retaining `overflow-wrap:anywhere` for full title/subtitle wrapping | UI styling / localization presentation | Low | `1:2, 2:4, 3:5, 4:5, 5:4` | More lines/taller cards in some locales; rollback is the scoped class. Must prove no overflow and preserve actual pre-open height capture | Wave 12 visual; Wave 13 lifecycle regression | **Recommend user approval after screenshot confirmation of intended Korean/CJK breaks** |
| W12-LI-02 | Resolve tag line-height 1.2 versus visual-role 1.35 without silently altering completed Desktop/Tablet visuals | UI styling / authority alignment | Low if re-anchor; Medium if shared style changes | `1:2, 2:4, 3:4, 4:5, 5:2` | Shared change can alter chip metrics and visible-prefix counts. Rollback returns the prior line-height | Wave 12 presentation; Wave 10 BQ-32 continuity | **Decision required; no value preselected** |
| W12-LI-03 | After screenshot review, assign the mobile Blog affordance one card-scoped visual ink role while preserving 13/500/1.35, 6px gap, no underline, `aria-hidden`, and whole-card navigation | UI styling | Low | `1:2, 2:4, 3:5, 4:5, 5:4` | Taste risk and later Wave 16 token consolidation. Rollback is one scoped value/class | Wave 12 visual; Wave 16 token cleanup | **Defer exact value until visual evidence** |
| W12-LI-04 | Resolve mobile `base_gap` and tag-to-CTA row gap through one approved numeric decision consumed by existing geometry; no raw CSS/data split and no locale thresholds | UI styling / spacing contract | Medium | `1:3, 2:4, 3:4, 4:5, 5:3` | Changes card height and tag fit; requires Wave 13 snapshot/restore regression. Rollback restores prior numeric inputs | Wave 10 rhythm, Wave 12 visual, Wave 13 lifecycle | **Decision required after native 390/360 references** |
| W12-LI-05 | Add focused non-snapshot unit + `grid-smoke`/`a11y-smoke` coverage under `assertion:W12-mobile` for 360/390/767 and localization stress | tests / QA | Low | `1:3, 2:5, 3:3, 4:5, 5:5` | Brittle only if tests encode unapproved taste values. Rollback is isolated to focused assertions | Wave 12 proof; avoids BQ-07 debt | **Recommend user approval after visual rulings** |
| W12-LI-06 | Mandatory no-change guard for BQ-32 logic, interaction state/hooks, mobile Expanded lifecycle, GNB, globals, messages, routing, transition, telemetry, storage, resolver, registry, test-entry, and pre-answer | behavior guard | None/Low | `1:4, 2:5, 3:5, 4:5, 5:5` | Risk is unauthorized scope expansion. Rollback removes every behavior-layer edit | Preserves Waves 10-11; defers 13/15/16/17 | **Recommend user approval as a guard** |

No candidate is approved by this document.

## 8. Authority Re-anchor Deltas

List only. No authority file is edited in this task.

### `docs/design/design.md`

- **§4.3 / §4.11 Typography and localization**
  - Reconfirm whether `keep-all + anywhere` applies to mobile Normal title/subtitle exactly as
    written. If yes, record the Wave 12 realized result after approval.
- **§4.10 Accessibility**
  - Clarify that the Blog whole-card link supplies the 44x44+ mobile target; the visible
    `Read more →` remains decorative.
- **§5.1 / §6.3 Tag typography**
  - Resolve the 1.35 role versus current 1.2 chip implementation. Do not leave both as if aligned.
- **§5.10 Spacing**
  - Resolve whether 12px "card content gap" is the mobile Normal base gap or a general reference
    token. If the runtime remains 8px, say so explicitly instead of implying 12px is realized.
- **§7.2 Normal test card**
  - Record the approved mobile wrapping and internal-rhythm result only; keep measurement/lifecycle
    behavior in requirements/code.
- **§7.4 Blog card**
  - Record the approved CTA ink role and outer tag-to-CTA gap. Keep whole-card navigation,
    `aria-hidden`, and BQ-32 behavior out of visual authority.
- **§7.5 Unavailable card**
  - Record mobile parity after the native reference confirms surface/dim/status density.
- **§7.7 Responsive catalog**
  - Preserve one column, 390px reference, and 14-16px gutter; add no new breakpoint.
- **§9 Resource Manifest**
  - Replace the aspirational list with actual filenames/status, or explicitly mark missing resources.
    At present the repository does not contain most listed artboards.

### `docs/req-landing.md`

- **§6.6 Text & Clamp**
  - Explicitly state that Wave 12 reuses BQ-32 and may not add mobile locale thresholds or a second
    hiding implementation.
  - Add line-break quality only if the user confirms it as a product presentation contract; do not
    move visual token values into requirements.
- **§6.7 Card Height & Bottom Spacing**
  - If a mobile numeric `base_gap` is approved, require CSS variable, data attribute, geometry
    controller, and tests to agree.
- **§9.3 / §13.2 Unavailable**
  - No behavior change. Add only traceability that mobile visual parity does not alter status/name
    semantics.
- **§14.2 QA Matrix**
  - Add 360/390/767 focused Wave 12 traceability, all-locale mobile prefix/overflow proof, and
    representative CJK/long-CTA/long-status wrapping checks without snapshots.

### `docs/wave-roadmap.md` and `.planning/STATE.md`

- Reconcile the roadmap prerequisite (`2-3, 8-9`) with the task's expected `4-11` handoff wording.
- Reconcile, replace, or retire the stale Wave 10 validation-blocked STATE record.
- These are user-owned completion-authority actions, not edits authorized by this analysis.

## 9. Do-Not-Regress

- Mobile full title/subtitle and one-card-row `comp_gap=0`.
- The shared BQ-32 visible-prefix resolver, intrinsic probe, CTA reservation, stable prefix identity,
  right-first suffix unmount, 56px tail, and resize reappearance.
- Hidden suffix absence from public DOM/a11y.
- Probe `aria-hidden` + `inert` and zero overflow contribution.
- BQ-30: available `#ECE8DF`, unavailable `#E6E2D8`, border 0, radius 5px, padding `4px 9px`,
  nowrap, no dot, source-owned casing.
- Blog whole-card link as the sole navigation control.
- Mobile `Read more →` always visible, decorative, `aria-hidden`, non-focusable, non-underlined,
  and label/arrow separated by 6px.
- BQ-26 semantic unavailable button, `aria-disabled`, `tabIndex=-1`, AT-exposed status, keyboard
  skip, warm surface, thumbnail-only dim, and full-opacity title/subtitle.
- Wave 11 keyboard/a11y outcomes and Phase 9 reconciliation.
- BQ-24 floor/spacer and baseline ordering.
- BQ-25 arrow deferral.
- BQ-07 baseline freeze.
- BQ-04/BQ-21 no `globals.css` or global-token migration.
- No mobile Expanded, GNB, mobile-menu, transition, telemetry, storage, routing, resolver, registry,
  test-entry, or pre-answer change.

## 10. Eventual Non-Baseline Validation Scope

No command in this section was run during this analysis. These are eventual implementation gates.

After Basic Gates in the repository-defined order:

```bash
npm test -- \
  tests/unit/landing-card-contract.test.ts \
  tests/unit/landing-spacing-plan.test.ts
npx playwright test \
  tests/e2e/grid-smoke.spec.ts \
  tests/e2e/a11y-smoke.spec.ts \
  --grep "assertion:W12-mobile"
```

Do not use unfiltered `tests/e2e/state-smoke.spec.ts` as the focused Wave 12 signal while the BQ-07
`expanded-focus-shell.png` debt remains. If an approved spacing/wrapping change requires lifecycle
proof, add or select a uniquely filtered non-snapshot case; that is not permission to regenerate a
baseline.

### Required focused assertions

- 360px, 390px, and 767px resolve to mobile and one column.
- Computed page inset is 16px and stack gap is the approved 14-16px value.
- Test, Blog, and unavailable cards have zero card/container/document horizontal overflow.
- Mobile title/subtitle remain full text in all 12 locales.
- Representative Korean, Simplified/Traditional Chinese, Hindi, and long Latin strings follow the
  approved line-break rule without clipping.
- `base_gap` equals the approved value in CSS/data/geometry; one-card rows remain
  `needs_comp=false`, `comp_gap=0`.
- Mobile card padding/radius/surface/border/shadow match approved scoped values.
- Mobile available/unavailable tag computed styles include the approved line-height ruling.
- All 12 locales preserve a left prefix, CTA priority, right-first suffix removal, and 56px tail at
  360/390/767 using the existing resolver.
- Hidden suffix remains absent; probe remains `aria-hidden` and `inert`.
- Blog CTA is visible, nowrap, contained, non-underlined, 6px internally spaced, and uses the
  approved scoped ink/outer gap.
- Blog CTA contains no control or `tabIndex`; the whole card remains the only link and navigates.
- Unavailable status stays visible/AT-exposed; trigger stays `aria-disabled` and `tabIndex=-1`.
- Representative mobile Normal states remain axe-clean.
- No snapshot, baseline, `qa:visual:full`, or image-file changes.

## 11. Open Risks and Unknowns

1. **No native mobile reference:** exact 390px conformance cannot be assessed.
2. **Written/runtime rhythm conflict:** 12px visual wording versus 8px runtime.
3. **Tag line-height conflict:** 1.35 visual role versus 1.2 runtime.
4. **Mobile line-break gap:** written `keep-all` is absent from Normal title/subtitle.
5. **CTA ink is unspecified:** current global `--muted-ink` is not a confirmed card visual role.
6. **Outer CTA gap is unspecified:** current 12px may or may not be the intended density.
7. **Misleading current coverage:** the "narrow mobile" CTA test runs at 767px.
8. **Mobile all-locale fit is unproved:** the 12-locale BQ-32 test is Tablet/constrained-container,
   followed only by one 390px aggregate overflow check.
9. **Unavailable mobile matrix is incomplete:** source parity exists, but 390px surface/dim/text/tag
   composition is not jointly proved.
10. **Wave 13 coupling:** wrapping or spacing changes alter pre-open height and restore geometry.
11. **BQ-29 boundary:** CTA ink must not trigger a global muted-token change.
12. **Formal authority conflict:** roadmap/HEAD and stale STATE disagree on completion state.

## 12. Decisions Only the User Can Make

1. Confirm the intended Korean/CJK mobile line-breaking result and approve/defer W12-LI-01.
2. Decide whether tag line-height should remain 1.2, become 1.35 globally, or become a justified
   mobile application-layer exception.
3. Choose the Blog CTA visual ink role after reviewing the native mobile reference.
4. Choose the mobile Normal base gap and tag-to-CTA outer gap after reviewing 390/360 references.
5. Confirm current localized `readMore`/`comingSoon` copy remains unchanged.
6. Confirm the Wave 12 prerequisite authority and reconcile the stale STATE record.
7. Approve, defer, or reject each `W12-LI-xx` candidate.

## 13. Screenshot Evidence Required for the Second Pass

Use native-size captures without browser rescaling. Include the full 390px artboard where possible,
plus 1:1 card close-ups so text baselines and 8/12px spacing can be inspected.

### Priority 0 - required

1. **390px full mobile browse stack, English**
   - GNB bottom through at least one available Test, one Blog, and one unavailable card.
   - Shows page inset, inter-card gap, and full-card proportions.
2. **390px available Test Normal close-up**
   - Entire card plus left/right page inset and the next card's top edge.
   - Must show thumbnail, multi-line title if available, full subtitle, and tags.
3. **390px Blog Normal close-up**
   - Entire card with the always-visible `Read more →`.
   - Must preserve the full tags row so tag baseline, CTA ink, 6px internal gap, and outer gap can be
     compared.
4. **390px unavailable Normal close-up**
   - Entire card showing warm surface, thumbnail dim, full-opacity title/subtitle, and localized
     coming-soon tag.
5. **360px English full browse or the same three card close-ups**
   - Narrow-width stress for CTA containment and visible-prefix composition.
6. **390px Korean available Test**
   - A card with the longest available Korean title/subtitle in the design source.
   - Needed to decide `keep-all` line breaking and resulting card height.
7. **390px Indonesian Blog**
   - Uses `Baca selengkapnya`; needed for long CTA/tag coexistence.
8. **390px French unavailable**
   - Uses `bientôt disponible`; needed for long status-chip balance.

### Priority 1 - useful

9. **390px Simplified or Traditional Chinese available Test**
   - Confirms CJK wrapping under the intended typography.
10. **767px mobile browse boundary**
    - Confirms whether the large-mobile card should retain the same density as 390px.
11. **768px Tablet comparison**
    - Not a Wave 12 redesign target, but useful to ensure a mobile-only ruling does not visually
      leak across the breakpoint.

Suggested filenames:

```text
wave12-mobile-browse-390-en-full.png
wave12-mobile-test-390-en.png
wave12-mobile-blog-390-en.png
wave12-mobile-unavailable-390-en.png
wave12-mobile-browse-360-en.png
wave12-mobile-test-390-kr.png
wave12-mobile-blog-390-id.png
wave12-mobile-unavailable-390-fr.png
wave12-mobile-test-390-zs.png
wave12-mobile-browse-767-en.png
wave12-tablet-browse-768-en.png
```

## 14. Readiness Verdict

- **BQ-19 Step-1 analysis:** ready for user review.
- **Implementation baseline:** HEAD `55e2808`, with Wave 10 BQ-30/BQ-32 and Wave 11 keyboard/a11y
  outcomes present.
- **Screenshot-free findings:** sufficient to identify concrete authority/runtime gaps and test
  overclaims.
- **Visual decision readiness:** blocked pending native mobile references.
- **Implementation readiness:** blocked pending candidate approval, visual rulings, and
  completion-authority reconciliation.
- **Implementation authorization:** none.
- **Implementation-plan authorization:** none.
- **Authority-file edit authorization:** none.

Logic Improvement: candidates identified for user approval - [W12-LI-01, W12-LI-02, W12-LI-03, W12-LI-04, W12-LI-05, W12-LI-06]. No candidate is approved by this document.
