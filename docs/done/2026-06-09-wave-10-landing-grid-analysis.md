# Wave 10 BQ-19 Deep Analysis Revision

## 1. Gate Status and Startup Verification

- **Task mode:** Analysis Only + documentation update only.
- **Authorized edit:** this file only.
- **Workspace:** `/Users/woohyeon/Local/ViveTest`.
- **Branch:** `main`.
- **HEAD:** `6a7029855e22b3f7473faa52aaf73c7a63790afa`.
- **Initial `git status --short`:**
  - `M docs/decision-register.md`
  - `M docs/wave-roadmap.md`
  - `?? docs/plans/2026-06-09-wave-10-landing-grid-analysis.md`
- The target analysis was **untracked**, not a tracked file with an additional local diff. It was treated as the user-provided junior draft and replaced in place.
- The existing changes in `docs/decision-register.md` and `docs/wave-roadmap.md` are pre-existing user work and were read as the live authority state. They must remain untouched.
- `.planning/STATE.md` exists and records Wave 9 as complete and verified, with Wave 10 BQ-19 analysis as the next action.
- No runtime, test, CSS, snapshot, generated, authority, roadmap, or design file was modified.
- No tests, builds, snapshots, baseline commands, commits, branch operations, or external-network operations were run.

## 2. Source Authority and Conflict Resolution

### 2.1 Applied precedence

1. `docs/decision-register.md`
2. `docs/req-landing.md` and active project rules
3. `docs/design/design.md`
4. Current implementation and tests
5. Mockup resources as visual reference only

`docs/decision-register.md:25` makes this analysis and user approval of the identified candidates a mandatory pre-implementation gate. `docs/decision-register.md:27` makes `design.md` the visual SSOT but explicitly leaves behavior, runtime, storage, telemetry, routing, and QA contracts under requirements and repository rules.

### 2.2 Locked decisions applied

- **BQ-19:** no Wave 10 implementation prompt may be issued from this analysis alone (`docs/decision-register.md:25`; `docs/wave-roadmap.md:38-61`).
- **BQ-21:** visual outcomes re-anchor into `design.md`; geometry, interaction, storage, telemetry, routing, resolver, and test-entry behavior remain requirement-owned (`docs/decision-register.md:27`; `docs/agent-guides/project-rules.md:125-131`).
- **BQ-24:** the Expanded resting-height floor remains an explicit measured pixel floor on the Expanded body, with one last-choice-to-meta flex spacer. It is not a Normal-row mechanism and must not be rewritten (`docs/decision-register.md:30`; `docs/design/design.md:294-305`).
- **BQ-30:** catalog chips become borderless; available remains `#ECE8DF`; unavailable receives a scoped `#E6E2D8` fill; radius, nowrap, ellipsis, no-dot, and source-owned lowercase casing remain (`docs/decision-register.md:36`).
- **BQ-31:** the six visual targets are locked, while the implementation mechanism remains subject to §6.7, BQ-24, and this analysis (`docs/decision-register.md:37`).

### 2.3 Conflicts that must be re-anchored

| Conflict | Higher authority ruling | Consequence |
|---|---|---|
| BQ-31 says “single flex slack,” while `req-landing` forbids automatic flex distribution for Normal compensation (`docs/req-landing.md:319-331`). | BQ-31 explicitly leaves the mechanism to analysis and requires reconciliation with §6.7 (`docs/decision-register.md:37`). | “Slack” describes the one visual surplus region above tags, not permission for `margin-top:auto`, `justify-content:space-between`, filler flex, or a pseudo-spacer. |
| `design.md` still requires a tag border and forbids unavailable exceptions (`docs/design/design.md:175-180`, `248-249`, `314-318`). | BQ-30 supersedes BQ-28. | These design clauses are stale and require Wave 10 visual re-anchor. |
| `design.md` and `req-landing` state a two-line Normal subtitle without a mobile exception (`docs/design/design.md:85-86`, `116-117`, `285-290`; `docs/req-landing.md:280-288`). | BQ-31 locks Mobile Normal description to full text. | The mobile subtitle wording and tests must change in Wave 10. |
| `req-landing` keeps row 0 and two-column Expanded width at `1.04x` (`docs/req-landing.md:552-559`), and `design.md` describes conservative row-width targets (`docs/design/design.md:329-338`). | BQ-31 requires a perceptible desktop width increase but does not lock a numeric ratio. | A constrained `1.10x` desktop candidate requires user approval and synchronized §8.4/§7.7 re-anchor. |

## 3. Evidence Quality Audit of the Previous Draft

| Previous claim | Evidence-grade correction |
|---|---|
| “The current foundation is already correct.” | **Partly true.** The pure row-local arithmetic matches §6.7, but invalidation is incomplete: the spacing effect has no content `ResizeObserver` and no `document.fonts.ready` remeasure (`use-grid-geometry-controller.ts:152-255`). |
| “The current grid cannot horizontally overflow.” | **Unproven.** Equal track construction is proven, but the only direct row overflow assertion is a Normal desktop row-0 check (`tests/e2e/grid-smoke.spec.ts:873-905`). There is no document/container overflow assertion during Expanded active, edge-card, tablet, or handoff states. |
| “`min-h-44` is inert and safe to remove.” | **Inert-looking but not proven safe.** It is present on every card root (`landing-grid-card.tsx:202-203`), while no current unit/E2E/static check proves removal across Normal, desktop overlay placeholder, mobile OPENING/CLOSING, and reduced motion. Removal must be test-first and conditional. |
| “Trigger `min-height:100%` is safe.” | **Supported by contract and placement.** §6.7 explicitly permits `min-height:100%` or an equivalent row-stretch acceptance rule (`docs/req-landing.md:311-317`). The trigger/content use it only outside mobile Expanded (`landing-grid-card.tsx:937-946`); it is not the BQ-24 Expanded height floor. |
| “Title clamp is already correct.” | **Satisfied with evidence.** D/T uses `line-clamp-1`, Mobile removes clamp (`landing-grid-card.tsx:370-384`), and current E2E checks desktop/tablet and mobile (`grid-smoke.spec.ts:463-521`, `685-744`). Locale breadth remains limited. |
| “Description mobile full text is not satisfied.” | **Correct.** the Normal subtitle unconditionally receives `line-clamp-2` (`landing-grid-card.tsx:339-367`). |
| “Tags shrink/clip instead of hiding whole rightmost tags.” | **Correct from structure, under-tested in behavior.** Tag items use `flex: 0 1 auto`, chips use ellipsis, and the list clips overflow (`landing-grid-card.tsx:214-220`, `418-474`). No test proves whole-chip visibility or right-first removal. |
| “All desktop rows can safely become `1.10x`.” | **Candidate, not proof.** Current tests prove selected current `1.04x` and `1.10x` cases only (`grid-smoke.spec.ts:907-998`). The 72px stage bleed is a component implementation value (`landing-grid-card.tsx:202-203`), not an authority guarantee. |
| “Maximum extra width is about 57px and therefore safe.” | **Incomplete.** The current maximum surface outset for a `1.10x` desktop target is about `57.15px` in the desktop-medium row-0 band, but this only proves surface fit within the current 72px clip stage. It does not prove shadow fit, future threshold safety, document overflow safety, or transition-frame safety. |
| “Add `visibleTagCountMap`.” | **Plausible candidate, insufficiently specified.** The previous draft omitted intrinsic-width measurement, font loading, growth reappearance, observer-loop avoidance, zero-fit behavior, unavailable status priority, and accessibility-tree behavior. |

## 4. Current Implementation Evidence and Likely Wave 10 Changes

### 4.1 File responsibility audit

| File | Current responsibility | Likely Wave 10 change |
|---|---|---|
| `src/features/landing/grid/landing-catalog-grid.tsx` | Measures viewport/container width, builds the row plan, renders equal grid tracks, passes spacing, row shell scale, and Expanded resting floor (`:39-63`, `:96-105`, `:118-160`, `:195-266`). | Pass a candidate tag-prefix visibility map if measurement remains grid-owned. Preserve `repeat(N,minmax(0,1fr))`. Do not introduce explicit row heights here. |
| `src/features/landing/grid/landing-grid-card.tsx` | Owns Normal/Expanded/mobile render branches, root/trigger stretch, clamps, tags/CTA structure, BQ-24 floor application, shell/frame variables, and QA attributes (`:202-220`, `:339-477`, `:726-798`, `:819-1090`). | Mobile subtitle unclamp; deterministic visible-prefix rendering; BQ-30 class/token use; candidate desktop width input; conditional root minimum removal only after proof. Preserve slot order and semantics. |
| `src/features/landing/grid/landing-grid-card.module.css` | Owns scoped visual tokens, unavailable skin, clipped desktop stage, frame/shell animation, and lifecycle classes (`:1-40`, `:69-79`, `:93-158`, `:175-290`). | Remove chip border use, add scoped unavailable tag fill, and support visibility markers without partial-chip crop. Do not promote tokens globally. Any stage-bleed change requires explicit proof because the clip is also a Safari/paint-containment boundary. |
| `src/features/landing/grid/use-grid-geometry-controller.ts` | Owns row-local spacing measurement, baseline freeze/release, Expanded resting-floor capture, and plan-change collapse (`:136-255`, `:257-343`, `:345-377`). | Preserve arithmetic but refine measurement scheduling/invalidation. Candidate owner for tag-prefix measurement only if observation remains separated from baseline/floor state and does not create feedback loops. |
| `src/features/landing/grid/spacing-plan.ts` | Pure natural-height normalization and row-local compensation (`:1-87`). | Keep compensation formula. Candidate home for a pure visible-prefix resolver because it is deterministic and independently testable; do not add DOM measurement here. |
| `src/features/landing/grid/layout-plan.ts` | Owns viewport tiers, column modes, rows, and current lower-row frame inline scale (`:1-13`, `:67-121`, `:123-166`). | Replace row-index-only shell-scale policy with a tier/constraint-aware final-width resolver if W10-LI-03 is approved. Preserve columns, row membership, and underfilled alignment. |
| `src/features/landing/grid/baseline-manager.ts` | Pure baseline snapshots and BQ-24 Expanded `RestingFloorMap`, explicitly separated from row snapshots (`:1-72`). | **No Wave 10 change recommended.** A Normal-card floor analogue would collapse two distinct contracts into one state surface and increase stale-state risk. |

### 4.2 Claim-by-claim current status

| Claim | Finding | Classification |
|---|---|---|
| Equal tracks use `repeat(N,minmax(0,1fr))`. | Directly present at `landing-catalog-grid.tsx:203-216`. | **Already satisfied.** |
| Same-row card widths are uniform. | Grid tracks are equal; current E2E compares representative card/thumbnail/tag widths and underfilled-row width (`grid-smoke.spec.ts:257-321`, `873-905`). | **Satisfied for sampled Normal desktop cases; under-tested across tablet/locales.** |
| Desktop/tablet horizontal overflow is always zero, including Expanded. | No current active-state document/container `scrollWidth` assertion exists. The stage itself clips at 72px (`landing-grid-card.module.css:93-107`). | **Unproven.** |
| `min-h-44` is inert. | Normal content appears naturally taller than 176px under current structure, but no contract test measures all lifecycle states. | **Likely inert, not proven.** |
| Trigger `min-height:100%` is a forbidden fixed floor. | It is a row-stretch acceptance rule on the trigger and is disabled for mobile Expanded (`landing-grid-card.tsx:937-946`). §6.7 expressly permits it. | **False claim; preserve unless an equivalent stretch rule replaces it.** |
| D/T title one-line ellipsis and Mobile title full text. | Implemented at `landing-grid-card.tsx:370-384`; tested at `grid-smoke.spec.ts:463-521`, `685-744`. | **Already satisfied.** |
| D/T description two-line ellipsis. | Implemented unconditionally at `landing-grid-card.tsx:339-367`; sampled desktop test at `grid-smoke.spec.ts:443-461`. | **Satisfied on D/T, under-tested across locale/width bands.** |
| Mobile description full text. | No mobile branch exists for subtitle clamp. | **Not satisfied.** |
| Tags hide complete rightmost chips first. | Current flex items may shrink; chips ellipsize and the list clips. | **Not satisfied.** |
| All desktop rows can use an effective `1.10x`. | Current frame path can produce `1.10x`, but only lower rows in wide/medium use it (`layout-plan.ts:104-121`; `req-landing.md:552-559`). | **Implementation path exists; all-desktop policy is a candidate.** |
| Current 72px bleed guarantees the widened target. | It is a local CSS variable, not a contract. Current layout bounds make `1.10x` surface outsets fit, but shadow and future-layout guarantees are unproven. | **Incidental capacity, not a hard guarantee.** |

## 5. Height-Rhythm Mechanism Comparison

### 5.1 Mechanism matrix

| Mechanism | §6.7 fit | BQ-24 / geometry isolation | Main risks | Rollback | Testability | Ruling |
|---|---|---|---|---|---|---|
| 1. Current row stretch + measured `comp_gap` | Directly implements `needs_comp = natural < row max` and places surplus above tags. | Separated from Expanded floor in current code. Desktop active measurement is skipped. | Stale after font/content changes; no content observer; mobile active card can fall back to zero metrics; transition-frame behavior is not asserted. | Low if arithmetic remains unchanged. | High at pure function and DOM geometry levels. | **Keep arithmetic; do not keep invalidation unchanged.** |
| 2. CSS-only `margin-top:auto`, `space-between`, filler flex, or pseudo-spacer | Violates the explicit prohibition at `req-landing.md:329-331` and static QA at `check-phase6-spacing-contracts.mjs:60-88`. | Automatic distribution obscures `needs_comp`, can allocate surplus without an explicit measured decision, and is difficult to freeze through handoff. | Browser rounding, hidden implicit surplus, transition-frame drift, inability to prove zero compensation on tallest cards. | Easy code rollback, high contract rollback risk. | Low for deterministic `needs_comp` proof. | **Reject for Wave 10.** |
| 3. Normal-card `RestingFloorMap` analogue | Could equalize outer heights but bypasses the mandated above-tags compensation formula. | Duplicates native grid stretch and risks coupling Normal rows to BQ-24 floor lifecycle. | Stale floor on resize/font/locale; fixed-height behavior; state duplication; row contamination. | Medium. | Medium for map state, poor for content-driven behavior. | **Reject.** |
| 4. Explicit measured row-height propagation | Can be paired with a measured gap, but adds a second authority for a row height CSS Grid already owns. | Explicit row height can clip later content or perturb baseline freeze/release and underfilled rows. | Resize feedback, font drift, stale row maps, content clipping, more lifecycle state. | Medium/High. | Medium. | **Reject unless native row stretch is proven insufficient; current evidence does not show that.** |
| 5. Hybrid: current measured compensation + tighter observation and stable-state boundaries | Preserves every §6.7 formula and prohibition. | Keeps BQ-24 state separate and can explicitly freeze Normal spacing through Expanded/handoff/mobile active phases. | Observer scheduling and feedback must be carefully bounded. | Low/Medium; new invalidation can be removed without changing the pure formula. | High with pure tests, fake observer tests, and E2E transition sampling. | **Recommended candidate W10-LI-01.** |

### 5.2 Why “single flex slack” does not authorize CSS auto-spacers

BQ-31 locks the visual result: one surplus region between description and tags, with tags bottom-aligned. It does not expressly supersede the deterministic mechanism in `req-landing §6.7`; its own note requires that the “how” reconcile with §6.7 and BQ-24 (`docs/decision-register.md:37`).

Automatic flex distribution remains forbidden because it would:

1. replace the explicit `needs_comp` decision with implicit layout;
2. make `needs_comp=false => comp_gap=0` unobservable or false when a fixed/minimum ancestor creates surplus;
3. make transition-frame and handoff freeze behavior browser-layout dependent;
4. undermine the existing static QA contract (`scripts/qa/check-phase6-spacing-contracts.mjs:60-108`);
5. blur the boundary between the Normal measured gap and BQ-24’s Expanded-only flex spacer.

For Wave 10, “single slack” must therefore be documented as **one explicit measured compensation region above the tags slot**, not as a new CSS flex-spacer mechanism.

## 6. Recommended Wave 10 Height Mechanism

Recommend user approval of **W10-LI-01: retain the pure `base_gap + comp_gap` formula and refine only measurement invalidation and lifecycle boundaries**.

### 6.1 Required invariants

- `base_gap > 0` on Desktop, Tablet, and Mobile. The current constant is `8px` (`spacing-plan.ts:1`).
- Only `needs_comp=true` cards may receive `comp_gap > 0`.
- `needs_comp=false` must expose and render `comp_gap=0px` in settled and transition frames.
- Equal-natural-height rows must keep every card at `needs_comp=false`, `comp_gap=0`.
- Empty tags keep the one-line 28px slot and render zero chips (`landing-grid-card.tsx:214-215`; `grid-smoke.spec.ts:1086-1115`).
- Row 0 and every later row, including an underfilled final row, use the same row-local rule.
- Desktop Expanded, closing, cleanup-pending, and handoff frames must not replace Normal measurements.
- Mobile OPENING/OPEN/CLOSING must not overwrite the last settled Normal measurement with fallback zero geometry.
- Mobile full-description growth must remain content-driven; because Mobile has one card per row, it must not create artificial compensation.
- BQ-24 `RestingFloorMap` remains separate and unchanged.

### 6.2 Invalidation and observation boundaries

The implementation candidate should:

1. schedule one RAF-coalesced measurement pass;
2. observe stable Normal content/card boxes, not the Expanded overlay;
3. remeasure after container/viewport changes, card/locale payload changes, and `document.fonts.ready`;
4. use the existing title-continuity pattern as the font/ResizeObserver precedent (`landing-card-title-continuity.tsx:191-254`);
5. subtract the currently applied compensation exactly as today (`spacing-plan.ts:46-56`);
6. preserve the previous spacing map when required Normal nodes are temporarily absent;
7. avoid committing a state update when normalized measurements are unchanged;
8. suspend measurement while desktop baseline is frozen or any mobile transient/Expanded lifecycle is active, then remeasure once Normal is settled.

This is a refinement of measurement ownership, not a new row-height system.

## 7. Desktop Expansion Width Analysis

### 7.1 Current computation path

- Row policy: `layout-plan.ts:104-121`.
- Row scale passed to cards: `landing-catalog-grid.tsx:218-245`.
- Shell scale and inline scale resolution: `landing-grid-card.tsx:881-892`.
- Edge/center anchoring: `hover-intent.ts:38-50` and `landing-grid-card.tsx:186-195`.
- Frame widening: `landing-grid-card.module.css:151-158`, `304-335`.
- Stage clip bounds: `landing-grid-card.tsx:202-203`, `landing-grid-card.module.css:93-107`.
- BQ-24 floor normalization uses only `expandedRestingFloorPx / resolvedShellScale`, not frame width (`landing-grid-card.tsx:885-892`).

The effective final surface width is:

```text
final_width = normal_root_width * shell_scale * frame_inline_scale
```

The current normal-motion `shell_scale` is `1.04`. The current lower-row frame scale is:

```text
1.0576923077
```

which produces:

```text
1.04 * 1.0576923077 ~= 1.10
```

### 7.2 Current bounded-width evidence

With the current max content width, 16px desktop row gap, and mode thresholds:

| Band | Maximum current card width | One-sided surface outset at `1.10x` |
|---|---:|---:|
| Desktop Wide row 0, 3 columns | 400.00px | 40.00px |
| Desktop Wide row 1+, 4 columns | 296.00px | 29.60px |
| Desktop Medium row 0, 2 columns | 571.50px | 57.15px |
| Desktop Medium row 1+, 3 columns | 375.67px | 37.57px |
| Desktop two-column | 511.50px | 51.15px |

These surface outsets are below the current 72px stage bleed, but that is not enough to declare universal safety:

- 72px is not an SSOT value.
- the stage deliberately clips and paint-contains its contents;
- current tests do not compare stage, surface, shadow, grid container, and document bounds during active edge-card expansion;
- future max-width, gap, or threshold changes could invalidate the arithmetic;
- shadow extent is not covered by the surface-only calculation.

### 7.3 Title continuity and BQ-24 interaction

- Widening the frame does not need to remeasure the first-line split. `useLandingCardTitleSplit()` freezes the Normal split while the desktop stage is active (`landing-grid-card.tsx:873-880`).
- The Expanded title renders the frozen line-1 and overflow strings separately (`landing-grid-card.tsx:771-815`).
- `expandedRestingFloorPx` is divided by vertical shell scale only. Frame widening must not alter this calculation.
- Any width policy change must preserve shell scale `1.04` for normal motion and express additional width through the frame, as required by current §8.4.

### 7.4 Recommended constrained algorithm

Recommend **W10-LI-03** as a candidate:

```text
base_shell_scale =
  reduced_motion ? 1.00 : 1.04

desired_final_scale =
  reduced_motion ? 1.00 :
  viewport_tier == desktop ? 1.10 :
  1.04

max_surface_scale =
  1 + available_stage_outset_px / normal_root_width_px

resolved_final_scale =
  min(desired_final_scale, max_surface_scale)

resolved_frame_inline_scale =
  resolved_final_scale / base_shell_scale
```

Constraints:

- use actual resolved tier, root width, anchor, and stage allowance rather than a row-index shortcut;
- first/last cards may consume the full allowance on one side; center cards split it;
- assert that the full Expanded surface and readable content remain inside the stage;
- do not increase content scale above `1.04`;
- keep Tablet at `1.04` because BQ-31 asks for a desktop increase, Tablet already has the reference feel, and tablet’s narrower width has higher clipping/i18n sensitivity;
- use one desktop desired target (`1.10`) across Wide, Medium, and two-column modes, with the constraint formula as the safety limit rather than separate magic ratios;
- do not treat 72px as permanent without a shared invariant and regression test.

The current layout bounds indicate that all desktop bands can reach `1.10x` for the surface. This remains **under-tested**, not implementation approval.

## 8. Tags + CTA One-Line and Right-First Hiding

### 8.1 Alternative comparison

| Alternative | Whole-chip hiding | i18n/resize robustness | Mobile/Wave 12 | A11y/DOM | Testability | Ruling |
|---|---|---|---|---|---|---|
| 1. CSS overflow clipping | No; boundary chip may be cut. | Width-responsive but visually nondeterministic. | Would preserve current partial-chip failure. | Hidden pixels may still have DOM/AT presence. | Low for “whole chip” proof. | Reject. |
| 2. `nowrap + overflow:hidden`, CTA `shrink-0` | CTA priority works; whole-chip hiding still not guaranteed. | Better CTA safety, same partial-chip problem. | Could carry into mobile but does not satisfy BQ-31. | DOM still contains clipped content. | Medium. | Reject as complete mechanism. |
| 3. JS measured visible-prefix count | Yes, if based on intrinsic item widths and gap. | Strong across locale and resize if fonts and growth are handled. | One shared mechanism can serve Wave 10 and be visually validated in Wave 12. | Hidden suffix can be unmounted so visual and accessibility trees agree. | High with a pure prefix resolver. | **Recommended candidate W10-LI-02.** |
| 4. CSS container-query approximation | Only at coarse predefined thresholds. | Brittle for 12 locales, arbitrary tag copy, and CTA translations. | Would multiply threshold tuning in Wave 12. | Deterministic DOM but not deterministic fit. | Medium/Low. | Reject. |
| 5. Locale-specific thresholds | Can hide whole chips if exhaustively tuned. | Copy/font/card-width changes invalidate thresholds; creates locale behavior tables. | High Wave 12 maintenance cost. | Deterministic but overfit. | Medium. | Reject. |

### 8.2 Recommended measured-prefix contract

If W10-LI-02 is approved, define the largest left-side visible prefix such that:

```text
sum(intrinsic_outer_width(tag[0..k-1]))
+ tag_gap * max(0, k - 1)
<= available_tag_list_width
```

Measurement inputs:

- stable tag-row content-box width;
- non-shrinking `Read more →` width plus the row gap for Blog cards;
- intrinsic uncompressed outer width of each chip/list item;
- tag-list gap;
- rendered locale/font/style generation;
- presence of the unavailable `coming soon` status item.

Recomputation triggers:

- card/locale/tag/CTA text change;
- tag-row or card inline-size change;
- viewport/column-plan change;
- `document.fonts.ready`;
- a later `FontFaceSet` loading completion if the implementation supports runtime font loading.

Feedback-loop controls:

- coalesce observations into one RAF;
- observe the stable row/card width, not a dimension that changes when the visible count changes;
- measure intrinsic widths from an `aria-hidden`, paint-contained probe or an equivalent cache that can restore tags when the container grows;
- update state only when the prefix count changes;
- never switch temporarily to “all visible” in the live row during resize.

Zero-fit and priority behavior:

- **Blog:** `Read more →` always remains; zero tags is valid.
- **Available Test:** zero visible tags is valid if no complete chip fits, while the one-line tags slot remains.
- **Unavailable Test:** the leftmost `coming soon` status tag is mandatory and must not be displaced by topical tags. Current fixture data has no topical unavailable tags, but the algorithm must preserve the status-first invariant.

DOM and accessibility:

- unmount the hidden right-side suffix from the visible list rather than clipping it or leaving it visually hidden;
- expose `data-tag-count` and `data-visible-tag-count` for QA;
- do not append hidden tags to the whole-card accessible name or description without a separate a11y decision;
- keep `coming soon` in the accessibility tree, as required by `req-landing.md:662-670`;
- keep Blog `Read more →` `aria-hidden` and non-interactive because the whole card remains the link (`landing-grid-card.tsx:447-460`; `req-landing.md:383`).

Wave boundary:

- Wave 10 owns the shared prefix-fitting logic and its D/T/M contract because BQ-31 includes mobile full text and one-line tag/CTA behavior.
- Wave 12 may validate or visually refine mobile browse presentation; it must not introduce a second locale-threshold or hiding implementation.

## 9. Clamp Reconciliation

| Target | Current implementation | Finding | Wave 10 action |
|---|---|---|---|
| D/T title: one-line ellipsis | `line-clamp-1` outside mobile (`landing-grid-card.tsx:370-384`). | **Satisfied.** | Preserve; broaden locale/width coverage. |
| Mobile title: full | Mobile branch removes clamp/overflow (`landing-grid-card.tsx:370-384`). | **Satisfied.** | Preserve. |
| D/T description: two-line ellipsis | Normal subtitle always `line-clamp-2` (`landing-grid-card.tsx:339-367`). | **Satisfied for D/T.** | Preserve; add tablet and locale-long tests. |
| Mobile description: full | Same unconditional `line-clamp-2`. | **Not satisfied.** | W10-LI-05: mobile-only unclamp/full-text styling. |

Mobile full description effects:

- **Normal row height:** increases naturally. Mobile uses one card per row (`layout-plan.ts:73-78`), so no cross-card compensation is needed.
- **Compactness:** cards become taller for long locales, but this is the locked target. Do not counteract it with a fixed height or clamp.
- **Tags/CTA row:** inline fit is unchanged, but it moves lower in the card. Base gap remains non-zero and no compensation is added in a one-card row.
- **Mobile lifecycle:** pre-open snapshot height and restore polling must continue to use the actual taller resting card; this requires regression coverage.
- **Wave 12:** mobile browse visual polish remains Wave 12, but the full-description contract itself belongs to Wave 10 and must not be deferred.

## 10. BQ-30 Tag Treatment

Required scoped style changes:

- remove the `--hairline-strong` border from every catalog tag chip;
- preserve available fill `#ECE8DF`;
- add a card-scoped unavailable tag fill `#E6E2D8`;
- preserve `5px` radius, nowrap, ellipsis, no dot, and source-owned lowercase casing;
- do not use CSS `text-transform`;
- do not promote a global token or edit `globals.css` before Wave 16;
- ensure the unavailable override is selected only under `.root.unavailableCard`;
- ensure available Test and Blog tags remain `#ECE8DF`;
- preserve `coming soon` as a non-interactive status tag, not a disabled-button replacement;
- preserve semantic `<button aria-disabled="true" tabindex="-1">` ownership on the unavailable card trigger.

Current stale code/evidence:

- shared border token: `landing-grid-card.module.css:10-13`;
- unavailable currently reuses the shared tag treatment: `landing-grid-card.module.css:19-22`, `69-79`;
- chip includes a border utility: `landing-grid-card.tsx:218-220`;
- current unit/E2E assertions require the old border and fill (`landing-card-contract.test.ts:241-255`; `grid-smoke.spec.ts:463-489`, `523-582`).

## 11. BQ-31 Target-by-Target Verdict

| Locked target | Verdict | Required mechanism/test consequence |
|---|---|---|
| 1. Same-row uniform width, zero horizontal overflow | Equal tracks are satisfied; zero overflow is under-proven. | Preserve grid tracks; add Normal and active Expanded overflow assertions for all column modes and row positions. |
| 2. Perceptible desktop hover width, no clipping | Lower-row `1.10x` path exists; row 0/two-column remain `1.04x`. | Candidate W10-LI-03: constrained desktop `1.10x`; Tablet unchanged; prove stage/surface/document bounds. |
| 3. Uniform row height = tallest card; surplus only above bottom-anchored tags | Pure formula exists and settled samples pass; invalidation/lifecycle proof is incomplete. | Candidate W10-LI-01; no CSS auto-spacer and no Normal floor map. |
| 4. Title D/T one-line ellipsis, Mobile full | Current code satisfies. | Preserve and broaden coverage. |
| 5. Description D/T two-line ellipsis, Mobile full | D/T satisfied; Mobile fails. | Candidate W10-LI-05. |
| 6. Tags + CTA one line, CTA priority, rightmost tags hidden first | CTA is `shrink-0`; deterministic whole-chip hiding is absent. | Candidate W10-LI-02 with intrinsic prefix measurement. |

## 12. Open Risks and Unknowns

1. **Font loading:** current row compensation does not remeasure on `document.fonts.ready`.
2. **Resize invalidation:** the outer container is observed (`landing-catalog-grid.tsx:118-160`), but card-content geometry is not.
3. **Measurement feedback:** changing `comp_gap` changes content height; the natural-height subtraction and equality guard must prevent observer loops.
4. **Mobile active lifecycle:** current measurement can encounter a missing public tags node and write fallback zero metrics while the active mobile Normal face is absent.
5. **Transition frames:** no current E2E samples `needs_comp=false => 0px` throughout opening, closing, cleanup-pending, or handoff.
6. **Locale length:** clamp and tag tests cover selected English and selected CTA locales, not all 12 locale/tag combinations.
7. **Tag growth after resize:** a hidden suffix must reappear when width increases; this requires intrinsic-width storage/probe logic.
8. **Expanded overflow:** no active-state document/container `scrollWidth` proof exists.
9. **72px bleed:** enough for current `1.10x` surface bounds, but not a contractual or shadow-fit guarantee.
10. **Root `min-h-44`:** likely redundant, but safe removal is unproven across mobile transition and reduced-motion states.
11. **Static QA ownership:** `scripts/qa/*.mjs` is Ask-First. Wave 10 implementation planning must explicitly list approved checker edits.

No product target remains undecided. These are implementation proof obligations, not reasons to reopen BQ-30/BQ-31.

## 13. Logic Improvement Candidate Table

Criteria scores use `1` (low value) to `5` (high value):

1. Modern React patterns
2. Simplicity / maintainability
3. Performance
4. Testability
5. Accessibility-related logic

| ID | Layer | Change magnitude | Improvement value against criteria 1-5 | Risk / rollback | Wave dependency | Recommendation |
|---|---|---:|---|---|---|---|
| W10-LI-01 | hooks / geometry | Medium | `1:4, 2:5, 3:4, 4:5, 5:3` | Observer-loop and lifecycle-freeze risk. Roll back invalidation while retaining the unchanged pure compensation formula. | Wave 10; protects Wave 11 state/a11y and Wave 13 mobile lifecycle. | **Recommend user approval:** preserve arithmetic, refine settled-Normal invalidation. |
| W10-LI-02 | hooks + UI structure + pure spacing resolver | Medium | `1:4, 2:4, 3:3, 4:5, 5:4` | Intrinsic-width/font/resize complexity. Roll back visibility map and render all tags; no routing/state rollback. | Wave 10 logic; Wave 12 mobile visual validation. | **Recommend user approval:** deterministic measured visible prefix. |
| W10-LI-03 | layout / geometry | Medium | `1:3, 2:4, 3:5, 4:5, 5:2` | Stage clipping and contract re-anchor risk. Roll back final-width resolver to current row policy. | Wave 10; must preserve Wave 6 floor and title continuity. | **Recommend user approval with constraint formula and all-band E2E.** |
| W10-LI-04 | UI structure | Low | `1:2, 2:4, 3:3, 4:4, 5:2` | Could expose a transition/resting-height dependency not covered today. Single-class rollback. | Wave 10 only. | **Conditional candidate:** remove `min-h-44` only after failing/passing computed-geometry coverage proves it redundant. |
| W10-LI-05 | UI styling / responsive text logic | Low | `1:3, 2:5, 3:5, 4:5, 5:4` | Taller mobile cards affect snapshot/restore geometry and page length. Simple responsive-class rollback. | Wave 10 contract; Wave 12 visual follow-up, Wave 13 lifecycle regression. | **Recommend user approval:** mobile Normal subtitle unclamp. |
| W10-LI-06 | state / routing / storage / telemetry / transition / resolver / i18n data | No change | `1:3, 2:5, 3:5, 4:5, 5:5` | Risk is accidental scope expansion. Rollback is deletion of any unauthorized behavior edit. | Preserves BQ-12; Wave 11–17 remain separate. | **Recommend user approval as a no-change guard:** localized rendered widths are inputs only; no copy, route, persistence, telemetry, transition, resolver, or state-shape change. |

**Logic Improvement: candidates identified for user approval — W10-LI-01, W10-LI-02, W10-LI-03, W10-LI-04, W10-LI-05, W10-LI-06.**

No candidate is approved by this document.

## 14. KARD Matrix

| Area | Keep | Add | Replace | Delete |
|---|---|---|---|---|
| Visual styling | Scoped card tokens; available `#ECE8DF`; radius/nowrap/ellipsis/casing. | Scoped unavailable tag fill `#E6E2D8`; mobile subtitle full-text branch. | Bordered chip styling with borderless styling. | Chip border only; no global token deletion. |
| UI structure | Thumbnail → title → subtitle → tags order; whole-card Blog link; status tag semantics. | Visible-prefix count/debug markers and intrinsic measurement support. | Shrink/partial-clip tag behavior with complete-prefix rendering. | Hidden right suffix from visible DOM; conditional `min-h-44` only after proof. |
| Geometry logic | CSS Grid equal tracks; pure compensation formula; baseline state; BQ-24 floor. | Settled-Normal invalidation; constrained desktop final-width resolver. | Row-index-only desktop frame-width policy if W10-LI-03 is approved. | No floor map, no row-height map, no auto-spacer. |
| Business behavior contracts | Routing, storage, telemetry, transition, resolver, test entry, interaction state, unavailable activation guards. | Nothing. | Nothing. | Nothing. |
| Tests / QA | Existing grid/state/a11y anchors and pure spacing tests. | Font/resize/transition-frame/tag-prefix/mobile-full-text/active-overflow coverage. | Old tag-border and all-breakpoint subtitle assertions. | No snapshots or baselines. |
| Docs re-anchor | BQ-24/BQ-25/BQ-07/BQ-21 boundaries. | BQ-30/BQ-31 visual and acceptance wording. | Stale border, mobile subtitle, right-first tag, and width clauses. | No authority file in this analysis-only task. |

## 15. Design and Requirements Re-Anchor Deltas

### 15.1 Required in the eventual Wave 10 implementation change set

`docs/design/design.md`:

- §4.3 and §4.11: split Normal subtitle behavior into D/T two-line ellipsis and Mobile full text.
- §5.6: remove catalog tag border wording; retain available `--tag-bg`; document the scoped unavailable application value without global promotion.
- §6.3: borderless shared chip and the BQ-30 unavailable application exception.
- §7.2: mobile full subtitle and the visual result of bottom-anchored tags; avoid making `design.md` the owner of compensation arithmetic.
- §7.4: one-line tags + `Read more →`, CTA priority, complete rightmost-tag hiding.
- §7.5: unavailable `#E6E2D8` tag fill, no border, status readability.
- §7.7: equal tracks/no horizontal overflow and the approved constrained desktop expansion policy; remove conservative row-width wording if W10-LI-03 is approved.

`docs/req-landing.md`:

- §6.6: mobile Normal subtitle full text; deterministic complete-prefix hiding; CTA/status priority.
- §6.7: preserve the existing measured compensation contract. Clarify only if needed that BQ-31 “slack” is the measured `comp_gap` region, not automatic flex distribution.
- §8.4: replace row-0/two-column `1.04x` wording only if W10-LI-03 is approved.
- §9.3 and §13.2: ensure unavailable `coming soon` remains present and perceivable when generic tag hiding applies.
- §14.2: add mobile subtitle full-text, whole-chip right-first hiding, active-state zero-overflow, and font/resize compensation checks.

### 15.2 Separate or deferred synchronization

- **Wave 12:** mobile browse visual polish and final mobile CTA presentation; no second tag-hiding logic.
- **Wave 16 / BQ-04 / BQ-21:** global token promotion, Pretendard migration, global muted correction, and removal of scoped token exceptions.
- **BQ-23:** hero/page-shell reconciliation remains separate.
- **BQ-25:** arrow optical nudge remains forbidden before Wave 16.
- `design.md §7.7` breakpoint/gutter prose is already not an exact description of the current measured-inline-size architecture. Synchronize it only as an explicitly scoped docs correction; do not smuggle breakpoint changes into Wave 10.
- `req-landing §6.6` still contains Expanded Blog subtitle wording although Blog Expanded was removed. That is pre-existing documentation debt, not a Wave 10 behavior change.

## 16. Do-Not-Regress List

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

## 17. Validation Matrix for an Approved Implementation

All validation is **non-baseline**.

| Layer | Required checks |
|---|---|
| Unit | Extend `landing-spacing-plan.test.ts` for observer-stable compensation inputs and pure visible-prefix fitting: exact fit, one-too-wide, zero-fit, all-fit, gap accounting, mandatory status-first behavior. Extend `landing-grid-plan.test.ts` for constrained final-scale resolution across Desktop Wide/Medium/two-column, Tablet, reduced motion, and edge constraints. Preserve `landing-baseline-manager.test.ts` unchanged unless a regression requires a guard assertion. |
| DOM / computed style | `landing-card-contract.test.ts`: D/T title one line; Mobile title full; D/T subtitle two lines; Mobile subtitle no clamp; tag border width zero; available fill `#ECE8DF`; unavailable fill `#E6E2D8`; hidden suffix absent; CTA/status semantics preserved; optional root-minimum contract if W10-LI-04 proceeds. |
| Playwright grid/state | `grid-smoke.spec.ts` and `state-smoke.spec.ts`: equal widths; row bottom equality; `base_gap>0`; tallest/equal/short-card compensation; row 0/later/underfilled final row; resize down/up; font-ready remeasure; all target locales; mobile full description; complete tag-prefix hiding and reappearance; CTA/status priority; active edge/center expansion in every column mode; stage/surface/grid/document horizontal overflow zero; transition-frame `needs_comp=false => 0`; mobile OPENING/OPEN/CLOSING preservation; desktop handoff/cleanup preservation. |
| Playwright a11y | `a11y-smoke.spec.ts`: hidden tags not exposed; unavailable status remains exposed; whole-card Blog link remains the only link/control; no focus or tab-order change. |
| Static QA | Update phase 4 for active-state overflow/width coverage anchors; phase 5 for responsive clamp and BQ-30 DOM/style anchors; phase 6 for hybrid measurement invariants and continued auto-spacer prohibition. `scripts/qa/*.mjs` edits are Ask-First and must be declared in the implementation plan. |
| Manual visual | D/T/M review at threshold edges; first/middle/last card; long English/German/Russian/Indonesian and CJK/Korean; zero/one/many tags; Blog CTA; unavailable status; resize while idle and after close. Inspect clipping without generating or updating snapshots. |
| Standard gates | After approval and implementation: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, then the approved landing-specific static/unit/E2E commands from `docs/agent-guides/verification-commands.md:53-80`. |

### Explicitly forbidden commands

```text
npm run qa:visual:full
any command containing --update-snapshots
any visual baseline regeneration command
```

## 18. Implementation Prompt Readiness Verdict

**Ready for user approval of candidates.**

The target outcomes are sufficiently locked, the contract conflicts are identified, and the implementation mechanisms are now bounded. No implementation prompt is included or authorized by this document. Implementation remains blocked until the user approves or rejects each W10-LI candidate and an implementation plan records the approved set.
