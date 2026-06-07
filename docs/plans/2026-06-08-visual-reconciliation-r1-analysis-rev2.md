# Visual Reconciliation R1 — BQ-19 Analysis rev2

> **Task mode:** Analysis Only.
> **This document authorizes no runtime implementation.**
> **Scope:** rev4 catalog visual reconciliation; visual-only; completed Wave 1-9 card surfaces
> only; Wave 10+ untouched; BQ-19 gated; no behavior, routing, storage, telemetry, transition,
> or a11y-logic change; no visual-regression baseline regeneration; no `src/app/globals.css`
> token promotion.
> **Workspace:** `/Users/woohyeon/Local/ViveTest`, branch `main`, HEAD
> `929f83de1d979c2d073f37f1a2ccd8673d765df8`.
> **Source comparison target:** original implementation pack + existing analysis
> `docs/plans/2026-06-08-visual-reconciliation-r1-analysis.md` + existing implementation plan
> `docs/plans/2026-06-08-visual-reconciliation-r1.md`.
> **Working-tree note:** the existing analysis and implementation plan were already untracked at
> rev2 analysis start. They were treated as reference-only inputs and were not modified.

## 1. Executive delta from rev1

### What changed from rev1

1. The title policy is now stated as a breakpoint/state matrix rather than as a single
   "catalog title truncates" exception:
   - Desktop/Tablet Normal: one-line ellipsis.
   - Mobile Normal: full title, no ellipsis, wrapping allowed.
   - Mobile Expanded: full title, no ellipsis, wrapping allowed.
   - Desktop/Tablet Expanded: full title with the Normal-width first-line continuity split.
2. The live `docs/req-landing.md` contract was compared directly with component markup, unit
   tests, E2E assertions, and the existing implementation plan.
3. Every R1 finding now names the implementation selector/constant, current state, target state,
   behavior-preservation reason, and rollback boundary.
4. The rev4 screenshot set was verified as accessible at all ten supplied paths and inspected.
5. Phase 5/9 static QA failures were rerun and traced to stale assertions that predate R1.
6. Static QA maintenance is classified as a separate, Ask-First **gate maintenance adjunct**,
   not as visual implementation and not as product/runtime logic improvement.
7. Two live requirement drifts were found and separated from R1:
   - stale Blog Expanded wording inside §6.6 despite the §6.5 no-Expanded contract;
   - stale `6:1` thumbnail text in §6.8 despite BQ-22 and the live `16/6` implementation.

### Why rev2 was needed

Rev1 reached the right implementation direction, but it compressed several important distinctions:

- the user-confirmed mobile title policy was not contrasted against every conflicting prompt,
  design, plan, and code source;
- `R1-V-04` through `R1-V-06` lacked selector-level evidence;
- the unavailable tag's shared treatment versus conditional rendering branch was not explicit;
- duration emphasis did not distinguish "first number only" from "complete duration item";
- the QA-script update was described as part of the implementation plan without a sufficiently
  explicit Ask-First and non-visual classification;
- §6.5 slot-order consistency had not been independently proven against code and tests.

### What remains unchanged

- R1 stays visual-only and bounded to completed Wave 1-9 card surfaces.
- A1-A3 remain fix-now.
- Material remainder findings `R1-V-04` through `R1-V-06` remain valid.
- Mobile focused-expand shape/position remains Wave 13.
- Global token consolidation remains Wave 16.
- Visual baseline regeneration remains prohibited by BQ-07.
- Existing runtime logic and all behavior contracts remain preserved.

## 2. Authority, precedence, and conflict resolution

### 2.1 Precedence for this pass

| Priority | Source | Role in R1 | Classification |
|---|---|---|---|
| 1 | User's explicit rev2 instruction | Mobile titles show full text with wrapping allowed and no ellipsis; this supersedes blanket prompt/mockup wording | approved decision |
| 2 | `docs/decision-register.md` | Existing BQ scope, preservation, deferral, and process guards | approved decision |
| 3 | `docs/req-landing.md`, especially §3.2, §6.5-§6.8, §8.5, §9.2-§9.3, §14.2 | Behavior, slot, clamp, responsive, a11y, and release contract | approved contract |
| 4 | `docs/design/design.md` | Visual values, primitives, and application-layer intent only | approved visual authority, subject to higher contracts |
| 5 | rev4 mockup/screenshots | Visual reference for completed card surfaces; not behavior or wave authority | corroborating visual evidence |
| 6 | Current implementation/tests | Evidence of current realized state and preserved contracts; not authority when drift is proven | implementation evidence |
| 7 | `docs/design/resources/superseded/**` | Historical value corroboration only | corroboration only |

The user instruction is placed explicitly above the normal repository precedence because it is the
newest direct product decision for this analysis. Within the repository, the existing BQ-21 order
still applies: decision register -> product requirements / active rules -> `design.md` -> mockups ->
implementation evidence -> superseded wave CSS.

### 2.2 Conflict resolution matrix

| Conflict | Resolved by source | Resolution | Classification |
|---|---|---|---|
| Original pack C1 says catalog title is single-line ellipsis for all card types; user says Mobile Normal/Expanded must show all text | User instruction + `req-landing.md` §6.6 lines 282-286 + §8.5 line 586 | Keep Desktop/Tablet Normal one-line ellipsis; Mobile Normal/Expanded wrap fully; Desktop/Tablet Expanded shows full split title | approved decision |
| `design.md` §4.3/§4.11 says all titles/subtitles/choices never truncate | `req-landing.md` §6.6 | Re-anchor design wording to the exact title matrix, two-line Normal subtitle clamp, and unlimited choice wrap | approved contract; current design documentation drift |
| Original pack says subtitle is never truncated | `req-landing.md` §6.6 lines 286-287 | Normal subtitle remains max two lines with visual ellipsis | approved contract |
| Original pack says `margin-top:auto` bottom-pins tags | `req-landing.md` §6.7 lines 314-330 | Do not implement `margin-top:auto`; current `base_gap + comp_gap` model remains. Any Wave 10 bottom-rhythm work must comply with §6.7 | deferred decision; prompt mechanism rejected |
| Roadmap Wave 10 says "bottom-anchored tags/CTA" | `req-landing.md` §6.7 + BQ-19 future Wave 10 gate | Treat "bottom-anchored" as a future visual/rhythm intent, not authorization for auto margin/filler flex | deferred decision |
| Isolated Blog artboard shows two-line title and visible Read-more | `req-landing.md` §6.5/§6.6 + Wave 7/8 contracts + full-page mockups | Artboard is a demo mismatch; preserve title clamp and desktop hover-only Read-more | approved decision |
| Mobile focused-expand screenshot changes GNB coverage and natural-height shape | Roadmap Wave 13 + user deferral | Do not implement in R1; use only as Wave 13 reference | deferred decision |
| BQ-27/BQ-28 are absent from live register but stated locked in the original implementation pack | User-provided locked decisions | Treat as approved for analysis and require future decision-register synchronization before implementation | approved decision; pending SSOT synchronization |
| Superseded CSS says title/subtitle wrap freely and tags use `margin-top:auto` | BQ-21 + live requirements | Use only for token/type corroboration where it agrees; reject conflicting behavior/layout rules | corroboration only |
| `req-landing.md` §6.8 says `6:1`, while BQ-22/code/E2E use `16/6` | BQ-22 + implementation/test evidence | `16/6` remains the approved implemented state; §6.8 is future documentation drift, not an R1 change | approved decision; out of R1 |

No unresolved source conflict blocks the R1 visual findings. One separate approval gate remains for
the Ask-First static QA adjunct, described in §8 and §13.

## 3. Prompt / Analysis / Plan Reconciliation

| Topic | Original implementation pack says | Existing analysis says | Existing plan assumes | Rev2 resolution | Source / evidence | Classification |
|---|---|---|---|---|---|---|
| Mobile title wrap / no ellipsis | C1 blanket single-line title wording conflicts with the later user correction | Mobile Normal and Expanded show complete text | Correctly preserves full mobile title | Full text, no ellipsis, wrapping allowed in Normal/OPENING/OPEN/CLOSING | User instruction; `req-landing.md:285-286,586`; `landing-grid-card.tsx:365-375,1083-1092,1114-1129` | approved decision |
| Desktop/Tablet Normal title single-line ellipsis | C1 says single-line title | Preserves it | Preserves it | No implementation behavior change; typography values only may change | `req-landing.md:282`; `landing-grid-card.tsx:365-375`; `grid-smoke.spec.ts:463-531` | approved contract |
| Desktop/Tablet Expanded title full text + first-line continuity | Pinned reference requires full context/title | Preserves full title and split | Preserves measured split nodes | Keep `useLandingCardTitleSplit(... visibleLineCount:1)` and line1/overflow DOM | `req-landing.md:283-284`; `landing-card-title-continuity.tsx:259-276`; unit lines 292-310; E2E lines 503-527 | approved contract |
| Normal subtitle two-line ellipsis | Prompt foundation wording implies free wrapping | Correctly retains two-line clamp | Correctly retains `line-clamp-2` | No clamp change; only 15/400/1.45/color reconciliation | `req-landing.md:286-287`; `landing-grid-card.tsx:334-361`; E2E lines 443-461 | approved contract |
| Expanded choice text unlimited wrap | Pinned reference says unlimited wrap | Preserves it | Preserves it | Keep no clamp/truncate/ellipsis and keep `items-start` | `req-landing.md:289-292`; `landing-grid-card.tsx:224-229,562-588`; expanded screenshots | approved contract |
| A1-A3 vs material remainder R1-V-04 through R1-V-06 | Remainder rule allows material Wave <=9 gaps | Adds surface/type, expanded, and Read-more micro-spacing findings | Includes all six visual findings | Keep A1-A3 plus V04-V06; no additional R1-V-07 is justified | `design.md` type/surface rules; current selectors in §4; screenshots | approved decision |
| BQ-27 resting border | `transparent` -> `--hairline` all three card types | Fix-now R1-V-01 | Scoped token change | Keep; the existing 1px box means no layout shift | User locked decision; `module.css:4`; `landing-grid-card.tsx:891-897` | approved decision |
| BQ-28 tag chip + lowercase label | `--surface-muted` + `--hairline-strong`; lowercase system-wide | Fix-now R1-V-02/R1-V-03 | Scoped token/class + seven message values | Keep; preserve radius 5, nowrap, ellipsis, no dot, one treatment | User locked decision; `module.css:8-10`; `landing-grid-card.tsx:214-220,413-470`; all locale files | approved decision |
| Coming-soon casing across locales | Lowercase all tag labels | Lowercase case-bearing locales, leave caseless scripts unchanged | Seven locale files + default copy | Case-bearing: `de,en,es,fr,id,pt,ru`; caseless: `hi,ja,kr,zs,zt`; use source copy, not CSS transform | `src/messages/*.json:21`; `getDefaultCardCopy()` lines 1152-1162 | approved decision |
| Blog Read-more behavior vs visual micro-spacing | Desktop hover-only, mobile visible, explicit 6px gap | Preserve behavior; split label/arrow for gap | Split visual children while retaining parent semantics | Keep behavior exactly; explicit child separation is warranted for deterministic 6px spacing | `design.md:300-305`; `landing-grid-card.tsx:442-465`; unit lines 248-290; E2E lines 559-647 | approved visual refinement |
| No Normal Test hover skin | No hover skin | Preserve | Preserve | No Test hover selector/class added; Blog remains sole card hover skin | `design.md:283-287,393`; `module.css:40-51`; source grep shows only `.blogCard:hover` | approved contract |
| `margin-top:auto` / bottom-pinned tag row | Pinned reference says `margin-top:auto` | Defers to Wave 10 | Defers but uses loose "bottom-pinned" language | R1 must not touch it; Wave 10 must not use `margin-top:auto`, `space-between`, filler flex, or pseudo spacer as compensation | `req-landing.md:308-330`; E2E spacing model lines 781-865; roadmap Wave 10 | deferred decision |
| Mobile focused-expand redesign | Wave 13 deferred | Deferred | Deferred | Keep current mobile lifecycle/shape untouched; screenshot remains reference-only | Roadmap `416-424`; B14 `test.fixme` lines 582-587,655-660 | deferred decision |
| Global token promotion | Wave 16 deferred | Deferred | No `globals.css` | Keep new values scoped in card CSS; no global namespace migration | BQ-21; project rules `125-131`; roadmap `449-459` | deferred decision |
| Visual baseline regeneration | Prohibited | Prohibited | Prohibited | No snapshot update, no `qa:visual:full` | BQ-07; decision register line 13 | approved scope guard |
| Stale Phase 5/9 QA maintenance | Validation asks existing checks to pass | Includes a narrow QA maintenance unit | Treats plan approval as approval to edit scripts | Separate Ask-First gate maintenance adjunct; not R1 visual implementation and not product/runtime logic | `AGENTS.md` Ask-First; current script failures; git blame/history in §8 | blocking approval question for full-gate plan |

## 4. Evidence inventory by surface

### 4.1 Screenshot accessibility and visual use

All ten supplied files were accessible outside the repository workspace:

- `Blog normal.png`
- `Mobile 390.png`
- `Desktop _ 1280.png`
- `Mobile focused expand.png`
- `Mobile menu overlay.png`
- `Tablet _ 920.png`
- `Test Card Expanded 360.png`
- `Test Card Expanded 400.png`
- `Test Normal 380.png`
- `Unavailable card.png`

The card screenshots corroborate white available surfaces, warm unavailable surfaces, sage expanded
edges, muted expanded context, wrapped choices, full-digit meta, lowercase `coming soon`, and the
general type scale. They do not override live clamp, behavior, wave, or a11y contracts.

### 4.2 Current implementation evidence

| Surface | Evidence files / selectors / constants | Current state | Rev2 interpretation |
|---|---|---|---|
| Resting available surface | `landing-grid-card.tsx:891-897` `resolvedRootVisualClassName`; `globals.css:14` `--panel-solid:#fff` | `color-mix(... panel-solid 90%, transparent)` plus 1px token border | This is a 90% white mix, not exact `#fff`; R1-V-04 |
| Resting border | `module.css:4` `--normal-card-border:transparent`; root class consumes it at `tsx:897` | 1px box exists but is transparent | Change token value only; R1-V-01 |
| Tag fill/border/radius | `module.css:8-10`; `tsx:219-220` | `#f0ece2`, `border-transparent`, radius 5px, `whitespace-nowrap`, text ellipsis | Fill/border mismatch only; preserve radius/nowrap/truncation; R1-V-02 |
| Tag row/no dot | `tsx:413-470` | Single-line flex row with hidden overflow; chip is a text-only `<span>` with no decorative child | Preserve no-dot and one-line contracts |
| Unavailable tag sharing | `tsx:425-438`; `module.css:16-19,59-69`; `STATE.md:17-24` | `comingSoonLabel` uses a conditional content branch, but consumes the same `LANDING_GRID_CARD_TAG_CHIP_CLASSNAME` as topical tags | It is not a separate visual treatment; BQ-28 remains one system-wide treatment |
| Unavailable surface/text | `module.css:18-19,63-69`; unit `196-246`; E2E `909-938` | `#f4f1ea`, thumb opacity 0.72, title/subtitle full opacity | Preserve, except shared resting border/tag treatment and lowercase copy |
| Normal title typography/clamp | `tsx:208-211,365-380` | 20/600/1.3, no `-0.01em`; Desktop/Tablet `line-clamp-1`; mobile branch removes clipping and allows overflow | Add tracking only; preserve breakpoint clamp behavior |
| Normal subtitle typography/clamp | `tsx:210-211,334-361`; E2E `443-461` | `0.92rem` (~14.72px at 16px root), line-height 1.4, `--muted-ink`, `line-clamp-2` | Reconcile to 15/400/1.45/`--body` equivalent without changing clamp |
| Normal slot order | `tsx:513-525`; unit `75-100`; E2E `867-889`; `req-landing.md:259-278` | Thumbnail -> Title -> Subtitle -> Tags | No conflict; implementation, requirement, tests, analysis, and plan agree |
| Expanded outer surface/shadow | `tsx:259-262,747-783`; `globals.css:10,91-92` | Separate legacy global mid/far shadow plate; 96% panel surface; divider mix edge | Reconcile only surface/edge/shadow values through scoped card visual tokens; R1-V-05 |
| Expanded desktop context | `tsx:762-773` | `cardTitleExpanded` reuses `LANDING_GRID_CARD_TITLE_BASE_CLASSNAME`, therefore 20/600/1.3 instead of 14/500/1.4 muted | Explicit context styling required; preserve split nodes and full text |
| Expanded mobile context | `tsx:269-274,1083-1092,1114-1129` | `LANDING_GRID_CARD_MOBILE_TITLE_CLASSNAME` has no explicit component-owned 14/500/1.4 muted utilities | R1-V-05 should cover context typography without changing mobile layout/lifecycle |
| Expanded question | `tsx:221-222,632-640` | 21/600/1.3/-0.01em, wrap enabled | Already aligned; preserve |
| Expanded choices | `tsx:224-229,562-588` | 12px radius, 12/14 padding, `items-start`, 15/400/1.45, no clamp/truncate; arrow has no 3px optical nudge | Preserve; BQ-25 forbids glyph nudge |
| Expanded floor/spacer | `tsx:242-250,674-685,730-735,876-883` | Explicit pixel floor and a single `min-h-[14px] flex-1` spacer | Preserve BQ-24 exactly |
| Expanded meta emphasis | `tsx:230-241,597-624` | Entire row is 13/500 muted; only the first numeric value span is 600/strong; the duration label remains muted | Target is the complete duration item, matching screenshots and superseded component references; R1-V-05 |
| Blog Read-more markup | `tsx:442-465` | One aria-hidden text run: `{readMoreLabel} →`; normal word-space separation | Split visual label/arrow children to express exact 6px gap while keeping one noninteractive parent; R1-V-06 |
| Blog behavior | `tsx:848-859,1033-1048`; unit `248-290`; E2E `533-647` | Whole-card `<Link>`, no Expanded, hover/focus reveal desktop, visible mobile | Preserve; spacing is the only R1 change |
| Normal Test hover | `module.css:40-51`; source grep | Only `.root.blogCard:hover` changes card border/shadow | No Normal Test hover skin exists; preserve |
| Locale copy | `src/messages/*.json:21`; `tsx:1152-1162` | Seven case-bearing values start uppercase; five caseless values have no case distinction; default copy is uppercase | Lowercase seven source values and default copy; keep key and caseless values |

### 4.3 Locale casing inventory

| Class | Locales | Current values | Required result |
|---|---|---|---|
| Case-bearing scripts | `de`, `en`, `es`, `fr`, `id`, `pt`, `ru` | `Demnächst`, `Coming soon`, `Próximamente`, `Bientôt disponible`, `Segera hadir`, `Em breve`, `Скоро` | Lowercase initial form in each locale source |
| Caseless scripts | `hi`, `ja`, `kr`, `zs`, `zt` | `जल्द आ रहा है`, `近日公開`, `출시 예정`, `即将推出`, `即將推出` | Byte-identical; no synthetic casing rule |

Use explicit localized source values. Do not add `text-transform: lowercase`, because visible and
accessible copy should match and locale-sensitive case conversion should not be delegated to CSS.

## 5. Fix-now findings rev2

| ID | Surface | Evidence files / selectors / constants | Current state | Required result | Why in R1 | Why not behavior change | Rollback |
|---|---|---|---|---|---|---|---|
| R1-V-01 | Resting card edge | `module.css:4`; `tsx:891-897`; 1px root border already reserved | Transparent border on Test, Blog, Unavailable | `1px solid #E6E2D8` through scoped `--normal-card-border` | Locked BQ-27 and completed W3/W8/W9 surfaces | Token value only; hitbox, dimensions, handlers, state unchanged | Restore scoped token to `transparent` |
| R1-V-02 | Shared tag chip | `module.css:8-10`; `tsx:214-220,425-438` | `#F0ECE2`, transparent border, radius 5, nowrap, ellipsis, no dot | `#ECE8DF` + 1px `#D6D1C4`; preserve all other chip contracts | Locked BQ-28 and shared W3/W8/W9 visual seam | Style token/class only; list semantics, text, and tag data shape unchanged | Restore prior fill/border class/token |
| R1-V-03 | Coming-soon label casing | `src/messages/*.json:21`; `tsx:1152-1162`; unit `223-232`; E2E `916-969` | Seven case-bearing locale values and default copy begin uppercase | Lowercase those seven values; caseless scripts unchanged | Locked BQ-28 system-wide lowercase labels | Existing i18n key, lookup, DOM, semantics, and availability behavior remain | Restore prior message/default values |
| R1-V-04 | Normal surface and type metrics | `tsx:208-213,334-380,891-897`; `design.md:131-149`; Normal screenshots | 90% white mix; title lacks `-0.01em`; subtitle ~14.72/1.4 and legacy muted color | Exact scoped `#fff`; title 20/600/1.3/-0.01em; subtitle 15/400/1.45/body; existing clamps unchanged | Material remainder rule, completed Wave 3 skin | No slot, clamp, height algorithm, or interaction branch change | Restore prior scoped surface/type utility strings |
| R1-V-05 | Expanded outer surface, context, and meta | `tsx:259-262,597-624,730-783,1083-1129`; `globals.css:10,91-92`; design §5.8/§7.3; expanded screenshots | Legacy global shadow/divider; desktop context reuses 20/600 title; mobile context lacks explicit target style; only duration number is strong | Scoped white surface, sage edge, `--shadow-expanded`; context 14/500/1.4 muted on desktop and mobile; complete duration item 600/body, other items plain muted | Material completed W5/W6 visual shell mismatch | Split continuity, floor, spacer, choice handlers, title text, meta data, and lifecycle remain unchanged | Restore prior surface/shadow/context/meta classes |
| R1-V-06 | Blog Read-more micro-spacing | `tsx:442-465`; unit `248-290`; E2E `559-647`; design §7.4 | Label and arrow share one text node with a normal word space | Keep one aria-hidden noninteractive parent; render label and arrow as visual children with explicit 6px gap | Material Wave 8 micro-visual remainder | Whole-card link, reveal rules, navigation, focus, and event path unchanged | Recombine child text into prior text run |
| R1-D-01 | `design.md` clamp/type wording | `design.md:81-85,114-115,131-140,283-310`; `req-landing.md:280-306,576-590` | Blanket never-truncate wording conflicts with title/subtitle contracts | Record the exact title matrix, two-line Normal subtitle, unlimited choices, and R1 visual metrics | Visual SSOT must match higher product contract before implementation | Documentation only; it constrains implementation rather than changing runtime | Revert the scoped wording if the higher contract changes |
| R1-D-02 | Decision register | `decision-register.md:5-32` | Live register ends at BQ-26; BQ-27/BQ-28 absent | Record BQ-27/BQ-28, scoped-token boundary, lowercase strategy, no layout shift, no per-type tag exception, Wave 16 deferral | User states both are locked decisions and BQ-19 requires traceable authority | Documentation/process only | Revert the two new rows |

No `R1-V-07` is warranted. The additional evidence either strengthens `R1-V-05` or proves
preserve/defer/documentation-drift status rather than a new implementation change.

## 6. Preserve / no-change findings rev2

### 6.1 Clamp and wrapping contracts

- Desktop/Tablet Normal title remains single-line ellipsis.
- Mobile Normal title remains full text, no ellipsis, wrap allowed.
- Mobile Expanded and transient titles remain full text, no ellipsis, wrap allowed.
- Desktop/Tablet Expanded preserves the measured Normal first-line split and full overflow text.
- Normal subtitle remains two-line ellipsis.
- Expanded choice text remains unlimited wrap with no truncation.
- Tag chips remain single-line and may ellipsize inside the fixed one-line tags slot.

### 6.2 Slot order classification

**Classification: No conflict.**

The live requirement, code, unit test, E2E test, existing analysis, and existing plan all agree:

`cardThumbnail -> cardTitle -> cardSubtitle -> tags`

Evidence:

- `docs/req-landing.md:259-278`
- `landing-grid-card.tsx:513-525`
- `landing-card-contract.test.ts:75-100`
- `grid-smoke.spec.ts:867-889`

No R1 implementation or documentation correction is required for §6.5 slot order.

### 6.3 Other preservation contracts

- Normal Test has no independent hover border/shadow/background.
- Blog remains the only Normal card with a hover skin.
- Blog remains a whole-card link with no Expanded state and no separate CTA.
- Unavailable remains semantic `<button aria-disabled="true" tabindex="-1">`, AT-exposed,
  non-enterable, with full-opacity title/subtitle.
- Unavailable `coming soon` remains inside the standard tags row and shares the normal tag class.
- Expanded height remains resting `offsetHeight`-derived explicit pixels plus one 14px-min flex
  spacer between choices and meta; never `min-height:100%`.
- Choice arrow remains top-aligned through `items-start`; no optical nudge before Wave 16.
- Meta values remain full-digit and the final English label remains `completed`.
- Resolver, controller, routing, transition, telemetry, storage, test entry, and a11y logic remain
  unchanged.

### 6.4 Future documentation reconciliation candidates

These are live documentation drifts, but changing them is outside this Analysis-Only artifact and
outside R1 implementation scope unless separately approved:

1. `req-landing.md` §6.6 lines 293-295 still describe Blog Expanded subtitle continuity, while
   §6.5 lines 265/274, Wave 7/8, code, and tests establish that Blog never expands.
2. `req-landing.md` §6.8 line 375 says thumbnail ratio `6:1`; BQ-22, `design.md` §6.2,
   `aspect-[16/6]`, and E2E ratio bounds establish the live implemented ratio as `16/6`.

Disposition: **Documentation drift; out of R1; future doc reconciliation candidate.**

## 7. Deferred / out-of-scope findings rev2

| ID | Finding | Rev2 disposition | Source |
|---|---|---|---|
| R1-DEF-01 | `margin-top:auto` / filler-flex tag pinning | Do not implement in R1. Wave 10 may revisit bottom rhythm, but its mechanism must obey `base_gap + comp_gap` and the explicit auto-margin prohibition | `req-landing.md` §6.7; roadmap Wave 10 |
| R1-DEF-02 | Mobile focused-expand GNB coverage, natural-height shape, lower-page dim/tap-close | Wave 13 only; preserve current lifecycle and B14 pending markers | roadmap Wave 13; transition E2E B14 |
| R1-DEF-03 | Hero removal | Separate landing-shell work under BQ-23 | decision register BQ-23 |
| R1-DEF-04 | Choice arrow 3px optical nudge | Prohibited until post-Pretendard/Wave 16 review | BQ-25 |
| R1-DEF-05 | Scoped-to-global token consolidation | Wave 16; do not touch `globals.css` | BQ-21; project rules; roadmap Wave 16 |
| R1-DEF-06 | Visual snapshot/baseline regeneration | Prohibited | BQ-07 |
| R1-DEF-07 | Stale Blog Expanded and thumbnail-ratio requirement prose | Future documentation reconciliation candidate; not an R1 runtime instruction | §6.4 above |
| R1-DEF-08 | Mobile menu overlay visual | Wave 17 and outside card R1 | roadmap Wave 17 |

## 8. Static QA gate debt and Ask-First classification

### 8.1 Current failures

The two checks were rerun at current HEAD:

```text
Phase 5 contract checks failed:
- LandingGridCard must define expanded slot markers for both content types.
- Phase 5 unit spec must cover Expanded contracts for both test and blog cards.

Phase 9 performance contract checks failed:
- LandingGridCard must keep CTA cursor policy explicit in component-owned class sources.
```

### 8.2 Why these are assertion drift, not R1 visual regressions

Phase 5:

- `check-phase5-card-contracts.mjs:32-34` still requires `cardSubtitleExpanded`.
- `check-phase5-card-contracts.mjs:48-50` still requires a unit-test title containing
  `Blog Expanded`.
- Wave 7 removed Blog Expanded, `cardSubtitleExpanded`, and Blog primary CTA by approved design.
- The live unit/E2E contracts now assert Blog remains Normal with no Expanded slots.
- `wave-roadmap.md:376-378` and `.planning/STATE.md:37-42` already record this debt as pre-existing.

Phase 9:

- `check-phase9-performance-contracts.mjs:53-58` still requires
  `LANDING_GRID_CARD_PRIMARY_CTA_CLASSNAME` and
  `LANDING_GRID_CARD_PRIMARY_CTA_STATIC_CLASSNAME`.
- Git blame dates these assertions to the pre-rebuild Tailwind migration.
- Wave 7 removed those constants with the Blog Expanded primary CTA.
- Current source still has explicit cursor policy for answer choices, card triggers, disabled
  triggers, and close controls; the failing check is looking for deleted names.

Therefore both failures are stale static assertion drift caused by the approved Wave 7 architecture,
not by R1 and not by any current visual mismatch.

### 8.3 Risk and classification

- `scripts/qa/*.mjs` is an **Ask-First** path under root `AGENTS.md`.
- Updating these scripts does not change runtime behavior, rendering, data flow, accessibility
  behavior, or product logic.
- It still cannot be silently bundled into visual implementation because it edits machine-enforced
  contracts and changes what the release gate accepts.
- **Approval state at this analysis update: not approved.** The user has authorized analysis
  documentation only and has not authorized either QA script edit.

**Conclusion:** classify Phase 5/9 updates as a separate **gate maintenance adjunct**, not as part
of BQ-19 visual implementation proper. The implementation plan may carry this adjunct in the same
change sequence only if it is:

1. separately labeled;
2. explicitly approved by the user;
3. limited to replacing stale names/expectations with the already-approved current architecture;
4. verified not to loosen unrelated assertions.

Without that approval, R1 visual implementation can still be planned, but the plan must report
Phase 5/9 as pre-existing red gates and cannot claim the full requested check-phase suite is green.
Implementation approval and QA-adjunct approval are separate consents: a later statement approving
"the R1 plan" alone must not be interpreted as permission to edit `scripts/qa/**`.

Until explicit approval is obtained, the refined plan must contain:

```text
Static QA adjunct: pending explicit user approval. Do not edit scripts/qa until approved.
```

Only after a direct user approval may the plan replace that line with:

```text
Static QA adjunct: explicitly approved by user on [date/session].
```

The date/session field must record the actual approval evidence and must not be filled speculatively.

## 9. Design.md re-anchor requirements

No `design.md` edit is authorized by this analysis. A later approved implementation plan should
re-anchor only the following visual statements:

1. **§4.3 Typography foundation**
   - Remove the blanket "all titles, subtitles, and choice text never truncate" rule.
   - State the exact title matrix.
   - State Normal subtitle two-line ellipsis.
   - Preserve unlimited Expanded choice wrapping.
2. **§4.11 Localization**
   - Repeat the exact state/breakpoint exceptions rather than naming one universal title exception.
   - Keep `word-break:keep-all` and `overflow-wrap:anywhere` for wrapping text.
3. **§4.2 Product voice**
   - Record lowercase catalog tag labels as a deliberate tag-system exception to broad sentence-case
     prose, if needed to avoid contradiction.
4. **§5.6 Tag tokens**
   - `--tag-bg:#ECE8DF`.
   - Add `--hairline-strong` border treatment.
5. **§6.1 Base card**
   - Resting border becomes `--hairline`; note the 1px box already exists.
6. **§6.3 Tag/chip**
   - Fill, 1px border, radius 5px, 4px/9px padding, nowrap, lowercase, no dot, one treatment.
7. **§6.10 Meta row**
   - Clarify that the complete duration item is emphasized, not only the number.
8. **§7.2 Normal test card**
   - Add title matrix reference and resting structural edge.
   - Preserve no independent hover skin.
9. **§7.3 Expanded test card**
   - Context is 14/500/1.4 muted.
   - Preserve full title and desktop first-line continuity.
   - Preserve floor/spacer and unlimited choices.
10. **§7.4 Blog card**
    - Preserve behavior and record explicit 6px label/arrow gap.
11. **§7.5 Unavailable card**
    - Standard shared bordered tag; lowercase label; no per-type exception.

The re-anchor must not authorize Wave 10 layout, Wave 13 mobile shape, Wave 16 global tokens, or
baseline regeneration.

## 10. Decision Register requirements

No decision-register edit is authorized now. Before visual implementation, the approved plan should
add only the locked decisions needed for traceability:

### BQ-27

- Resting Test/Blog/Unavailable card border is `1px solid --hairline` (`#E6E2D8`).
- The existing 1px border box remains, so no layout shift is introduced.
- This is a static structural edge, not a Normal Test hover effect.
- Implementation remains scoped to the card module until Wave 16.

### BQ-28

- All catalog tags use `--surface-muted` (`#ECE8DF`) plus
  `1px solid --hairline-strong` (`#D6D1C4`).
- Radius 5px, nowrap, ellipsis, and no-dot rules remain.
- Labels are lowercase where the writing system has case.
- Unavailable uses the same tag treatment; no per-type exception.
- Localized source values, not CSS text transformation, own casing.
- Global token promotion remains Wave 16.

### Ready-to-use rows

The following rows are proposals for a later approved `docs/decision-register.md` edit. Their
presence here does not modify or pre-authorize modification of the live register.

| ID | Decision | Source / 근거 | Implementation impact | Include in first implementation wave? | Notes / caveats |
|---|---|---|---|---|---|
| BQ-27 | Resting Test/Blog/Unavailable card border는 `1px solid --hairline` (`#E6E2D8`)로 통일한다 | 사용자 잠금 결정, Visual Reconciliation R1 rev4 BQ-19 analysis | 기존 1px border box는 유지하고 scoped card module의 `--normal-card-border` 값만 변경한다. Test/Blog/Unavailable에 동일 적용하며 layout shift는 발생하지 않는다 | No | Normal Test hover effect가 아닌 static structural edge다. `src/app/globals.css` 전역 token promotion은 Wave 16으로 이연한다 |
| BQ-28 | Catalog tag chip은 system-wide로 `--surface-muted` (`#ECE8DF`) fill + `1px solid --hairline-strong` (`#D6D1C4`) border를 사용하고, case-bearing script의 label은 lowercase로 표시한다 | 사용자 잠금 결정, Visual Reconciliation R1 rev4 BQ-19 analysis | scoped card module의 shared tag class/token과 case-bearing locale source values를 갱신한다. radius 5px, nowrap, ellipsis, no dot을 보존하고 unavailable도 동일 treatment를 재사용한다 | No | Per-type exception 및 CSS `text-transform`을 금지한다. casing은 localized source value가 소유한다. `src/app/globals.css` 전역 token promotion은 Wave 16으로 이연한다 |

No new BQ number is proposed for the mobile title policy in this analysis because the live
requirement already states it in §6.6/§8.5 and the user has re-confirmed it. Plan refinement should
cite that confirmation explicitly.

## 11. Logic-layer review under BQ-19

| Layer | Current evidence | Candidate considered | Decision | Reason |
|---|---|---|---|---|
| Component state/data flow | Card type/state gates in `LandingGridCard`; Blog/unavailable forced Normal; Test owns Expanded | Add a new visual state or prop for R1 values | Keep | Existing states already select every required surface; values/classes are sufficient |
| Hooks/controllers | Title split, interaction controller, mobile lifecycle, geometry controller already enforce continuity and state | Adapt controller for mobile title or tag layout | Keep | Title/wrap changes need no controller input; touching controllers would cross behavior/high-risk boundaries |
| Routing/page branching | Blog whole-card link and Test choice entry are live and covered | Add separate Read-more link/button | Keep | Separate CTA would violate §6.5 and Wave 7/8 |
| Storage schema | Transition, ingress, return-scroll, and test storage are unrelated | Store visual state or casing preference | Keep | No visual requirement needs persistence |
| Telemetry trigger conditions | Blog has no `card_answered`; Test choice owns entry events | Track Read-more or tag changes | Keep | R1 changes no user action or event meaning |
| i18n key structure | `landing.comingSoon` and `landing.readMore` already exist in all 12 locales | Add a new lowercase-specific key | Keep | Existing key is correct; only seven values and fallback copy need visual-copy normalization |
| A11y logic | Unavailable semantic button/keyboard skip/AT exposure and Blog link semantics are covered | Change role, disabled semantics, focus, or accessible label | Keep | R1 must preserve behavior; bordered tag and copy casing do not require semantic changes |
| QA/static gates | Phase 5/9 assertions target removed Blog Expanded/primary CTA names | Update stale assertions to current architecture | Adapt, adjunct only | Not product/runtime logic; Ask-First gate maintenance only, separately approved |

No component, hook, routing, storage, telemetry, i18n-key, or a11y logic candidate is approved.
The QA row is not a Logic Improvement candidate because it changes only stale gate assertions.

**Logic Improvement: no candidates approved for this task — preserve existing logic.**

## 12. Risks, rollback, and validation implications

### 12.1 Risks

| Risk | Level | Control |
|---|---|---|
| Breakpoint clamp regression while changing title classes | Medium | Preserve existing branch strings; add functional assertions for Desktop/Tablet Normal, Mobile Normal, Mobile Expanded, and desktop split continuity |
| Mobile expanded context typography changes layout metrics | Medium | Do not change lifecycle/position; functional mobile check only; leave Wave 13 B14 markers untouched |
| Meta markup changes accessible text or separators | Low-Medium | Keep one textual item order and separators; assert rendered text and only one emphasized duration item |
| Read-more child split accidentally creates interactive descendants | Low | Keep one `aria-hidden` parent, no link/button/tabindex, whole-card link unchanged |
| Locale lowercase changes unintended scripts | Low | Exact-value test for 12 locales; case-bearing seven only |
| Tag border changes chip box size | Low | Existing `border` already reserves 1px; only color changes |
| QA adjunct loosens a gate | Medium | Ask-First approval; replace only stale assertions; retain all unrelated checks |
| Baseline side effects | High if violated | Do not run snapshot update or `qa:visual:full` |

### 12.2 R1-V-05 validation decomposition

R1-V-05 must be implemented and verified as independent visual sub-surfaces. A single broad
"Expanded styling" change is insufficient because it could accidentally cross into Wave 13
layout/lifecycle or break desktop title continuity.

| Sub-surface | Expected assertion type | Must not change |
|---|---|---|
| Expanded outer surface/edge/shadow | Computed-style assertion for surface, edge, and shadow, plus scoped class/token assertion | Overlay geometry, resting pixel floor, spacer, z-index, pointer behavior, desktop/mobile lifecycle |
| Desktop expanded context typography | Unit DOM/class assertion plus desktop/tablet E2E computed style | Normal-width first-line title split, line1/overflow nodes, full title text, expand/collapse continuity |
| Mobile expanded context typography | Mobile E2E or functional computed-style assertion in OPEN and, where practical, transient states | Wave 13 card shape/position, GNB coverage, scroll/backdrop behavior, OPENING/OPEN/CLOSING lifecycle, B14 pending markers |
| Duration-item emphasis | Unit DOM/markup assertion plus E2E style/text assertion proving the complete duration item is emphasized | Meta item order, two dot separators, full-digit values, localized labels, shared/completed muted treatment |
| Choice/question preservation | Existing regression tests or explicit no-change assertions | Question typography, unlimited choice wrapping, `items-start` arrow alignment, no arrow nudge, choice handlers and entry behavior |

The refined plan must name each row as a distinct validation anchor even if implementation remains
inside one component file.

### 12.3 Rollback boundary

Visual rollback is limited to:

- scoped card CSS custom-property values;
- component-owned visual class strings;
- visual-only child markup for meta and Read-more;
- seven localized values plus default fallback copy;
- later approved SSOT rows/paragraphs;
- separately approved static gate assertions.

No rollback should involve controller, registry, transition, telemetry, storage, routing, GNB,
page-shell, or global theme files.

### 12.4 Validation implications for a refined plan

After implementation, use the default gates in order:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Then run the landing-specific static gates and functional, non-baseline E2E identified by
`docs/agent-guides/verification-commands.md`. The refined plan should add targeted assertions for:

- exact resting border and tag colors;
- exact Normal surface/type metrics;
- Desktop/Tablet Normal one-line clamp;
- Mobile Normal and Expanded no-ellipsis/full-text behavior;
- desktop full expanded title and first-line continuity;
- Normal subtitle two-line clamp;
- unlimited choice wrapping;
- duration-item-only emphasis;
- Blog 6px Read-more gap without new interactive semantics;
- unavailable shared tag treatment and locale casing.

Forbidden:

```text
npm run qa:visual:full
playwright --update-snapshots
any equivalent snapshot/baseline regeneration
```

This Analysis-Only session did not run lint, typecheck, Vitest, build, or Playwright. It reran only
the two read-only static checks needed to classify known gate debt.

## 13. Open questions / blocking questions

### R1 visual scope

No blocking question remains for the visual findings themselves. The user instruction and live
requirements resolve the mobile title conflict.

### Static QA adjunct

One approval question remains before an implementation plan can promise all requested phase gates:

> Approve the separately labeled Ask-First gate maintenance adjunct for
> `check-phase5-card-contracts.mjs` and `check-phase9-performance-contracts.mjs`?

- **If approved:** refine the plan with one narrow adjunct unit and prove unrelated assertions stay
  intact.
- **If not approved:** keep both scripts untouched, report their failures as pre-existing debt, and
  do not claim full check-phase completion.

This question does not block refining the visual implementation units, but it blocks an
unconditional full-gate readiness claim.

**Current approval state: not approved.** Implementation-plan refinement may proceed, but its
approval boundary must keep visual implementation consent separate from QA-adjunct consent. A
generic approval of the R1 plan is not sufficient authorization for `scripts/qa/**`. Until the user
explicitly approves the adjunct, the plan must carry:

```text
Static QA adjunct: pending explicit user approval. Do not edit scripts/qa until approved.
```

### Future-only conflict

Wave 10 will need its own BQ-19 decision on how "bottom-anchored" intent coexists with the live
§6.7 prohibition on `margin-top:auto`, `space-between`, filler flex, and pseudo spacers. This is not
an R1 blocking question.

## 14. Recommendation

Proceed with a **targeted SSOT re-anchor plus bounded visual reconciliation**:

1. Refine the implementation plan against this rev2 title/clamp matrix.
2. Keep A1-A3 and material remainder `R1-V-04` through `R1-V-06`.
3. Expand `R1-V-05` coverage to both desktop and mobile expanded context typography while leaving
   mobile shape/lifecycle untouched.
4. Add regression assertions before visual implementation.
5. Keep all values scoped to the card module.
6. Treat Phase 5/9 maintenance as a separately approved adjunct.
7. Run functional visual checks without snapshot updates.

Reject:

- A1-A3-only implementation, because it leaves material completed-surface mismatches.
- Full mockup parity, because it crosses Wave 10/13/16 and contradicts live requirements.
- Blanket "catalog title only truncates" wording, because it misstates both mobile titles and the
  Normal subtitle clamp.
- `margin-top:auto` as a Wave 10 shortcut, because live §6.7 explicitly forbids it.
- Any runtime logic cleanup bundled with this visual pass.

## 15. Readiness for plan refinement

**Verdict: Ready for implementation plan refinement, with one explicit Ask-First approval gate for
the static QA adjunct.**

The current implementation plan should be revised before approval to:

- point to this rev2 analysis;
- preserve the exact title/subtitle/choice matrix;
- cover mobile expanded context typography under `R1-V-05` without adopting Wave 13 layout;
- add no-ellipsis functional coverage for Mobile Normal and Mobile Expanded;
- describe Wave 10 bottom-rhythm deferral without authorizing `margin-top:auto`;
- separate Phase 5/9 gate maintenance from visual implementation;
- avoid editing the existing rev1 analysis as an implementation outcome artifact unless the user
  separately requests that documentation workflow.

No runtime implementation is authorized by this readiness verdict.

### 15.1 Required deltas for `2026-06-08-visual-reconciliation-r1.md`

- [ ] Change the BQ-19 analysis pointer from
  `docs/plans/2026-06-08-visual-reconciliation-r1-analysis.md` to
  `docs/plans/2026-06-08-visual-reconciliation-r1-analysis-rev2.md`.
- [ ] Remove `docs/plans/2026-06-08-visual-reconciliation-r1-analysis.md` from the implementation
  plan's "files to modify" list. Keep rev1 and rev2 analysis documents reference-only / do not edit.
- [ ] Treat `docs/plans/2026-06-08-visual-reconciliation-r1.md` as the current plan-refinement
  target only. Do not list it again as a runtime implementation outcome artifact or modify it from
  a later implementation unit merely to record results.
- [ ] Re-evaluate whether `docs/wave-roadmap.md` needs any R1 update. If completion recording is
  approved, isolate it in a post-implementation documentation unit; do not make it a required file
  of the visual implementation itself.
- [ ] Separate the Static QA adjunct from every visual implementation unit and mark its current
  state exactly as:

  ```text
  Static QA adjunct: pending explicit user approval. Do not edit scripts/qa until approved.
  ```

- [ ] Do not interpret generic approval of the whole R1 plan as QA-script approval. After direct
  approval only, replace the pending line with
  `Static QA adjunct: explicitly approved by user on [date/session].`
- [ ] Before QA-adjunct approval, do not promise that the full check-phase gate suite will be green;
  report the Phase 5/9 failures as pre-existing static assertion drift.
- [ ] Decompose R1-V-05 validation into: expanded outer surface/edge/shadow; desktop expanded
  context typography; mobile expanded context typography; complete duration-item emphasis; and
  choice/question preservation.
- [ ] Apply Mobile Expanded context typography without changing Wave 13 card shape, GNB coverage,
  positioning, natural-height policy, backdrop/scroll behavior, or lifecycle.
- [ ] Preserve desktop title split continuity and full title text while changing desktop context
  typography.
- [ ] Prohibit Wave 10 shortcuts including `margin-top:auto`,
  `justify-content:space-between`, filler flex, and pseudo-spacer compensation.
- [ ] State in the plan validation section that `npm run qa:visual:full`,
  `playwright --update-snapshots`, and equivalent snapshot/baseline updates are forbidden.
- [ ] Use this exact Logic Improvement line:

  ```text
  Logic Improvement: no candidates approved for this task — preserve existing logic.
  ```

## Appendix A. Read-only inspection command log

The following command groups were executed. Results are summarized exactly at the level relevant to
this analysis.

### A.1 Workspace and status

```bash
pwd
git branch --show-current
git rev-parse HEAD
git status --short
```

Result:

```text
/Users/woohyeon/Local/ViveTest
main
929f83de1d979c2d073f37f1a2ccd8673d765df8
?? docs/plans/2026-06-08-visual-reconciliation-r1-analysis.md
?? docs/plans/2026-06-08-visual-reconciliation-r1.md
```

### A.2 Required-document inspection

```bash
sed -n '1,280p' AGENTS.md
test -f .planning/STATE.md && sed -n '1,260p' .planning/STATE.md
nl -ba docs/decision-register.md | sed -n '1,45p'
nl -ba docs/req-landing.md | sed -n '45,85p'
nl -ba docs/req-landing.md | sed -n '245,395p'
nl -ba docs/req-landing.md | sed -n '560,690p'
nl -ba docs/req-landing.md | sed -n '995,1028p'
nl -ba docs/design/design.md | sed -n '70,210p'
nl -ba docs/design/design.md | sed -n '228,320p'
nl -ba docs/design/design.md | sed -n '380,418p'
nl -ba docs/wave-roadmap.md | sed -n '270,470p'
nl -ba docs/project-analysis.md | sed -n '1,240p'
nl -ba docs/plans/2026-06-08-visual-reconciliation-r1-analysis.md | sed -n '1,420p'
nl -ba docs/plans/2026-06-08-visual-reconciliation-r1.md | sed -n '1,420p'
nl -ba docs/agent-guides/project-rules.md | sed -n '1,220p'
nl -ba docs/agent-guides/verification-commands.md | sed -n '1,220p'
```

Result: the source and conflict findings recorded in §§2-10 were confirmed. No files were changed.

### A.3 Card implementation, tests, messages, and QA inspection

```bash
nl -ba src/features/landing/grid/landing-grid-card.module.css | sed -n '1,240p'
nl -ba src/features/landing/grid/landing-grid-card.tsx | sed -n '180,500p'
nl -ba src/features/landing/grid/landing-grid-card.tsx | sed -n '487,735p'
nl -ba src/features/landing/grid/landing-grid-card.tsx | sed -n '717,1170p'
nl -ba src/features/landing/grid/landing-card-title-continuity.tsx | sed -n '240,350p'
nl -ba tests/unit/landing-card-contract.test.ts | sed -n '60,330p'
nl -ba tests/e2e/grid-smoke.spec.ts | sed -n '440,640p'
nl -ba tests/e2e/grid-smoke.spec.ts | sed -n '760,990p'
nl -ba tests/e2e/transition-telemetry-smoke.spec.ts | sed -n '520,690p'
nl -ba scripts/qa/check-phase5-card-contracts.mjs | sed -n '1,260p'
nl -ba scripts/qa/check-phase9-performance-contracts.mjs | sed -n '1,260p'
for file in src/messages/*.json; do
  printf '%s: ' "$file"
  rg -o '"comingSoon"\s*:\s*"[^"]+"' "$file"
done
```

Result: selector/constant/test/copy states are recorded in §4. No files were changed.

### A.4 Static QA rerun

```bash
node scripts/qa/check-phase5-card-contracts.mjs
```

Result: exit 1 with the two stale Blog Expanded failures quoted in §8.1.

```bash
node scripts/qa/check-phase9-performance-contracts.mjs
```

Result: exit 1 with the stale primary-CTA cursor-policy failure quoted in §8.1.

### A.5 QA provenance inspection

```bash
git blame -L 25,55 -- scripts/qa/check-phase5-card-contracts.mjs
git blame -L 50,60 -- scripts/qa/check-phase9-performance-contracts.mjs
git log -S'LANDING_GRID_CARD_PRIMARY_CTA_CLASSNAME' --oneline -- \
  src/features/landing/grid/landing-grid-card.tsx
git show 3783f71 -- src/features/landing/grid/landing-grid-card.tsx
```

Result: Phase 5 stale expectations predate the Wave 7 removal; Phase 9 CTA constants were removed by
Wave 7 commit `3783f71` while the older static assertion remained.

### A.6 Screenshot accessibility

```bash
find '/Users/woohyeon/Documents/GitHub/ViveTest Resources/ddddd/screenshots' \
  -maxdepth 1 -type f -print | sort
for file in '/Users/woohyeon/Documents/GitHub/ViveTest Resources/ddddd/screenshots'/*.png; do
  sips -g pixelWidth -g pixelHeight "$file"
done
```

Result: all ten named PNG references were present and readable. Each was visually inspected.

### A.7 Command corrections

One exploratory `rg` invocation treated a pattern beginning with `--` as an option:

```bash
rg -n "--panel-solid|--surface-divider|--card-shadow-expanded-mid|--card-shadow-expanded-far|--text-strong|--muted-ink" src/app/globals.css
```

Result:

```text
rg: unrecognized flag --panel-solid|...
```

It was rerun correctly:

```bash
rg -n -- "--panel-solid|--surface-divider|--card-shadow-expanded-mid|--card-shadow-expanded-far|--text-strong|--muted-ink" src/app/globals.css
```

Result: the legacy global values used by the current expanded surface were found at
`globals.css:8-16,91-92`.

One exploratory shell glob for `[locale]` was unquoted and produced:

```text
zsh: no matches found: src/app/[locale]/layout.tsx
```

The failed glob did not alter the workspace and was not needed for any conclusion.

One final-scope loop initially used `path` as its zsh loop variable:

```bash
for path in src tests scripts/qa src/messages docs/design/design.md \
  docs/decision-register.md docs/wave-roadmap.md \
  docs/plans/2026-06-08-visual-reconciliation-r1-analysis.md \
  docs/plans/2026-06-08-visual-reconciliation-r1.md; do
  git diff --quiet -- "$path" || printf 'tracked_diff:%s\n' "$path"
done
```

In zsh, lowercase `path` is tied to `PATH`, so the loop temporarily caused `git: command not
found`. The check was rerun with `target` as the loop variable, as recorded below. This shell-local
error did not alter any file.

### A.8 Final document and scope verification

```bash
rg -n '^# |^## ' docs/plans/2026-06-08-visual-reconciliation-r1-analysis-rev2.md
wc -l docs/plans/2026-06-08-visual-reconciliation-r1-analysis-rev2.md
rg -n '[ \t]+$' docs/plans/2026-06-08-visual-reconciliation-r1-analysis-rev2.md || true
```

Result before this final appendix entry: all required numbered sections plus Appendix A were
present; the file had 674 lines; no trailing whitespace was found.

```bash
for target in src tests scripts/qa src/messages docs/design/design.md \
  docs/decision-register.md docs/wave-roadmap.md \
  docs/plans/2026-06-08-visual-reconciliation-r1-analysis.md \
  docs/plans/2026-06-08-visual-reconciliation-r1.md; do
  git diff --quiet -- "$target" || printf 'tracked_diff:%s\n' "$target"
done
printf 'tracked_scope_check=complete\n'
```

Result:

```text
tracked_scope_check=complete
```

No tracked diff was reported for any prohibited path.

```bash
git diff --name-only
git status --short
test -f docs/plans/2026-06-08-visual-reconciliation-r1-analysis-rev2.md
printf 'rev2_exists=%s\n' "$?"
test "$(git diff --name-only | wc -l | tr -d ' ')" = 0
printf 'tracked_diff_empty=%s\n' "$?"
```

Result:

```text
?? docs/plans/2026-06-08-visual-reconciliation-r1-analysis-rev2.md
?? docs/plans/2026-06-08-visual-reconciliation-r1-analysis.md
?? docs/plans/2026-06-08-visual-reconciliation-r1.md
rev2_exists=0
tracked_diff_empty=0
```

The latter two files were pre-existing untracked reference inputs. The only file created by this
task is the rev2 document.

```bash
git diff --no-index --check /dev/null \
  docs/plans/2026-06-08-visual-reconciliation-r1-analysis-rev2.md
test -z "$(rg -n '[ \t]+$' \
  docs/plans/2026-06-08-visual-reconciliation-r1-analysis-rev2.md)"
printf 'trailing_whitespace_check=%s\n' "$?"
```

Result: `git diff --no-index` returned exit 1 because the compared files differ, as expected for a
new file, and emitted no whitespace-error lines. The explicit trailing-whitespace check returned:

```text
trailing_whitespace_check=0
```

### A.9 Post-append verification

```bash
git diff --name-only
git status --short
rg -n '[ \t]+$' docs/plans/2026-06-08-visual-reconciliation-r1-analysis-rev2.md || true
wc -l docs/plans/2026-06-08-visual-reconciliation-r1-analysis-rev2.md
```

Result:

```text
?? docs/plans/2026-06-08-visual-reconciliation-r1-analysis-rev2.md
?? docs/plans/2026-06-08-visual-reconciliation-r1-analysis.md
?? docs/plans/2026-06-08-visual-reconciliation-r1.md
755 docs/plans/2026-06-08-visual-reconciliation-r1-analysis-rev2.md
```

`git diff --name-only` and the trailing-whitespace search emitted no lines.

```bash
tail -n 120 docs/plans/2026-06-08-visual-reconciliation-r1-analysis-rev2.md
```

Result: the final command-log sections and scope-verification results rendered intact.

```bash
for target in src tests scripts/qa src/messages docs/design/design.md \
  docs/decision-register.md docs/wave-roadmap.md \
  docs/plans/2026-06-08-visual-reconciliation-r1-analysis.md \
  docs/plans/2026-06-08-visual-reconciliation-r1.md; do
  git diff --quiet -- "$target" || printf 'tracked_diff:%s\n' "$target"
done
```

Result: no output; no tracked prohibited path had a diff.

### A.10 Analysis documentation update inspection

Commands used to inspect the target sections, live Decision Register schema, and current
implementation-plan deltas:

```bash
nl -ba docs/plans/2026-06-08-visual-reconciliation-r1-analysis-rev2.md \
  | sed -n '255,430p'
nl -ba docs/plans/2026-06-08-visual-reconciliation-r1-analysis-rev2.md \
  | sed -n '460,555p'
tail -n 90 docs/plans/2026-06-08-visual-reconciliation-r1-analysis-rev2.md
nl -ba docs/decision-register.md | sed -n '1,12p'
nl -ba docs/plans/2026-06-08-visual-reconciliation-r1.md | sed -n '20,90p'
nl -ba docs/plans/2026-06-08-visual-reconciliation-r1.md | sed -n '318,365p'
git status --short
git diff --name-only
git diff -- docs/plans/2026-06-08-visual-reconciliation-r1-analysis-rev2.md
```

Result:

- The live Decision Register table schema was confirmed as
  `ID | Decision | Source / 근거 | Implementation impact | Include in first implementation wave? | Notes / caveats`.
- The implementation plan still points to rev1 at line 29, lists rev1 and itself under files to
  modify, carries QA maintenance as Unit 6, and couples roadmap/plan outcome recording in Unit 7.
- `git status --short` listed only the three pre-existing/untracked plan documents, including this
  rev2 target. No tracked diff was present.

Post-update structure and scope checks:

```bash
rg -n '^# |^## |^### ' \
  docs/plans/2026-06-08-visual-reconciliation-r1-analysis-rev2.md \
  | sed -n '1,120p'
rg -n '[ \t]+$' \
  docs/plans/2026-06-08-visual-reconciliation-r1-analysis-rev2.md || true
wc -l docs/plans/2026-06-08-visual-reconciliation-r1-analysis-rev2.md
rg -n \
  "Ready-to-use rows|Static QA adjunct: pending explicit user approval|Static QA adjunct: explicitly approved|R1-V-05 validation decomposition|15\\.1 Required deltas|Logic Improvement: no candidates approved for this task" \
  docs/plans/2026-06-08-visual-reconciliation-r1-analysis-rev2.md
git diff --name-only
git status --short
for target in src tests scripts/qa src/messages docs/design/design.md \
  docs/decision-register.md docs/wave-roadmap.md \
  docs/plans/2026-06-08-visual-reconciliation-r1-analysis.md \
  docs/plans/2026-06-08-visual-reconciliation-r1.md; do
  git diff --quiet -- "$target" || printf 'tracked_diff:%s\n' "$target"
done
stat -f '%N | modified=%Sm | size=%z' -t '%Y-%m-%d %H:%M:%S %z' \
  docs/plans/2026-06-08-visual-reconciliation-r1-analysis-rev2.md \
  docs/plans/2026-06-08-visual-reconciliation-r1-analysis.md \
  docs/plans/2026-06-08-visual-reconciliation-r1.md \
  docs/design/design.md docs/decision-register.md docs/wave-roadmap.md
```

Result:

- Required headings were present, including `Ready-to-use rows`,
  `12.2 R1-V-05 validation decomposition`, and `15.1 Required deltas`.
- The exact pending/approved QA-adjunct strings and Logic Improvement sentence were present.
- The trailing-whitespace search emitted no output.
- The rev2 file had 888 lines before this command-log entry.
- No tracked prohibited path reported a diff.
- Modification times showed only rev2 changed during this task; rev1, the implementation plan,
  `design.md`, the Decision Register, and the roadmap retained their earlier timestamps.
