# Design system — v2 as built, the prototype's visual language, and the revision for the from-scratch rebuild

Investigator report, read-only. Repository `main` at `20f973a` (clean). Prototype sources read from the live scratchpad of session `7b610dca` on 2026-09-26; `j3-forks.html` was last written 2026-09-26 02:19 and is still being revised, so anything about J below is a snapshot. No `DesignSync` call was made; the tool's schema was loaded only to read its method contract. Remote Claude Design state is therefore described from the repository's own records (`docs/design/ds/SYNC.md`), last measured by `list_files` on 2026-09-11 and last pushed 2026-09-17.

---

## 0. Summary

- **v2 keeps one visual idea in five places.** `design.md` §5 holds intent, `docs/design/ds/colors_and_type.css` holds realised values (198 custom properties, dark theme written twice), `src/app/globals.css` holds a byte-copied mirror of 88 of them in three sentinel pairs, the landing card module holds `var()` chains, and theme-colour literals live in TS and in the bootstrap script. Two spec-only stylesheets (`catalog-components.css`, `app-components.css`, 2,085 lines together) describe components the app never imports. Seven guards (six vitest files and one release-tier `qa:rules` script) exist mainly to keep those copies from drifting. The prototype added a sixth, hand-typed copy of the values (`mockups/shared/tokens.css:1-3`).
- **What the prototype keeps from v2 is the "paper".** It keeps the warm-neutral ramp and its dark remap unchanged (`tokens.css:9-33, 67-125` vs `colors_and_type.css:93-107, 621-735`). It also keeps Pretendard, the 44px tap floor, the 2px/2px focus ring on paper, `--muted-aa`, and the VIVE whisper shadows on the sheets. This paper appears only where it is useful: the instruction modal, the share sheet, end cards and the landing list.
- **Everything the user sees first is new, and it breaks v2's bans.** That covers per-test colour worlds (`Shell.TEST_COLORS` / `Shell.LOOK`), saturated answer colours chosen per question, poster cards with heavy black shadows, a WebGL mesh field that animates on its own, film grain, glass chips and labels, and an 800-weight display type tier. The motion vocabulary is roughly twice as long (560/700ms), with overshoot springs, parallax, per-character kinetic entrances and looping pulses. `design.md` bans overshoot, parallax, tilt and self-playing motion outright (§4.8, §8), and it also bans A/B letter badges (§7.3, §10). The prototype puts A/B badges on every answer (`shell.css:113-116`). The owner adopted all of this in rounds 2 and 3.
- **Proposal: one token file that the app actually loads is the only definition.** The spec document names tokens and never restates their values. Specimens load the same CSS files the app loads. The Claude Design bundle is built by a script that copies those files byte-for-byte, so nothing is mirrored and no parity guard is needed. Theme-varying colours use `light-dark()` so the dark theme is not written twice; browser support still needs checking. Per-test palettes are data in the variant registry with a contrast gate, not tokens.
- **Claude Design: create a new design-system project, "VIVE Design System v3", instead of rewriting `cd630eec`.** The tool's own contract is "incrementally … never as a wholesale replace". v2 holds 36 files the repository never owned. The project type cannot be changed after creation. v2 stays as the record of the old system. The owner's part is at most: `/design-login` once on a machine without a claude.ai design session, plus approving the permission prompts for `create_project` and `finalize_plan`. The agent does everything else.
- **Decidable now:** the source-of-truth structure, the Claude Design strategy, the paper layer, the font, the bans the owner has already overturned, the palette-as-data schema shape, and which guards to carry.
- **Waits on the final prototype:** J's visual materials (being rebuilt from the landing card's mesh and grain), final `TEST_COLORS` / `LOOK` / curated pair values, shell metrics, stage motion values, the test-to-stage assignment (the owner deferred it to deployment), the result page, and every surface the prototype never drew (desktop, blog, history, settings, consent banner).

---

## 1. Sources read, and what was not read

| Source | Read | Note |
|:---|:---|:---|
| `docs/design/design.md` (445 lines) | whole | intent document, `version: rev2` |
| `docs/design/ds/README.md` (199) · `SKILL.md` (35) · `SYNC.md` (136) | whole | |
| `docs/design/ds/colors_and_type.css` (962) | whole except the second dark block, which was diffed by structure | |
| `docs/design/ds/catalog-components.css` (805) · `app-components.css` (1,280) | headers and every selector | bodies sampled |
| `docs/design/ds/preview/*.html` (31) | the `@dsCard` marker of each | bodies not rendered |
| `docs/design/ds/_provenance/INDEX.md`, `fonts/`, `assets/` listing | whole | |
| `docs/design/resources/` listing | listing | screenshots and superseded wave CSS |
| `src/app/globals.css` (516) | whole | |
| `tests/unit/design-*.test.ts`, `brand-assets-parity`, `theme-color-parity`, `answer-choice-catalog-parity` | header comments | |
| `scripts/qa/check-design-token-parity.mjs` | header | |
| `docs/decision-register.md` BQ-34, BQ-38 (+ allowlist) | those sections | |
| `docs/LESSONS_LEARNED.md` L06, L07, L13, L40 | those entries | |
| `docs/plans/2026-09-16-design-uplift-before-step3.md` §1–2, `2026-09-11-mobile-refactor-maps/contract-design.md` §9 | those sections | |
| Memory `vivetest-claude-design-integration-status.md`, `vivetest-ds-readme-findings-are-stale.md`, `vivetest-mobile-interaction-mockups.md`, `vivetest-owner-interaction-principles.md` | whole | |
| Prototype `shared/tokens.css`, `proto.css`, `shell.css`, `share.css` | whole | |
| Prototype `shared/shell.js` | header, palette, tone and stage code (`:1-110`) | |
| Prototype `l3-deck.html` | `<style>` (`:23-224`), palette/grain/shader/loop (`:300-560`) | |
| Prototype `i3-split.html` · `j3-forks.html` · `d3-story.html` | `<style>` blocks; colour code of I (`:150-226`) | |
| Prototype `index.html` (hub), `v-vote.html` style, `BRIEF.md` (shared sections), `BRIEF2.md`, `BRIEF3.md` | as listed | |
| `proto-session/dialog.md` | owner rounds 1–3 and the round-3 summary | owner words are quoted from here |
| `DesignSync` tool schema | method contract | **not called** |

Not read: the remote Claude Design projects (no tool call was made), `share.js`, `jdir/` sketches beyond the workflow summary in `dialog.md:2369-2385`, and every preview-card body. No specimen was rendered, so every contrast or size claim about v2 here is quoted from the repository's own measured records, not re-measured (L06).

---

## 2. Design system v2 as it stands

### 2.1 Where visual truth lives today

| # | Place | Role | Size | Read by | Guarded by |
|:---|:---|:---|:---|:---|:---|
| 1 | `docs/design/design.md` §5 | **intent** (I in `AGENTS.md` §3-1) | 445 lines, 12 sections | people and agents | `scripts/qa/check-design-token-parity.mjs` (§5 vs the light `:root` of #2, §5.11 vs §8, README carries no hex) — **`qa:rules` only, outside the default Done gate** (`AGENTS.md` §5) |
| 2 | `docs/design/ds/colors_and_type.css` | **realised definition** (C), pushed to Claude Design | 962 lines, 198 custom properties in `:root` (190 declaration lines, four lines carry three each) | specimens, Claude Design | the same script; `design-tokens-dark-parity.test.ts` (the two dark blocks must be identical) |
| 3 | `src/app/globals.css` | **runtime mirror** (R) plus the product layer | 516 lines; light mirror `:129-263` (88 declarations, the header says "87 of the design definition's 198", `:97-98`), mobile-type mirror `:374-394`, dark mirror `:403-465`; product layer `:296-372` | the app | `design-tokens-dark-parity.test.ts` (sentinel blocks byte-equal, and no mirrored name without a reader) |
| 4 | `src/features/landing/grid/landing-grid-card.module.css` | scoped `--normal-*` / `--expanded-*` | now `var()` chains, 0 hard-coded (script header, `check-design-token-parity.mjs:19-24`) | the card | — |
| 5 | `theme-ground-color.ts`, `public/theme-bootstrap.js`, `src/app/icon.svg` | literal copies that CSS variables cannot reach (theme-color meta, first paint, icons) | — | browser chrome | `theme-color-parity.test.ts`, `brand-assets-parity.test.ts` |
| (6) | `catalog-components.css`, `app-components.css` | spec stylesheets, "never imported by the app and never could be" (`catalog-components.css:19-23`, `app-components.css:14-16`) | 805 + 1,280 lines | specimens only | `design-specimen-coverage.test.ts` (every `.vt-*` class appears in a specimen), `answer-choice-catalog-parity.test.ts`, `design-ds-boundary.test.ts` (the runtime must not import `ds/`) |
| (7) | prototype `shared/tokens.css` | hand-typed hex copy of #2 for the mockups | 158 lines | mockups | none |

Every guard in the right-hand column exists because a copy exists. BQ-38 counted it: "프로그램 시작 시점에는 같은 시각 개념이 다섯 곳에 있었고 어느 둘도 자동으로 대조되지 않았다" (`decision-register.md:385`). The programme closed that gap with gates rather than by removing the copies.

### 2.2 `design.md` — intent, authority and bans

**Authority.** Decision records win, then product requirements and repository rules, then this document; mockups are interpretation aids only (`design.md:24-28`). The document owns visual matters only, not behaviour (`:17-22`). It is organised in four layers — foundations, tokens, components, patterns/application — and product-specific rules belong in §7 (`:53-60`).

**Foundations.**
- Personality: "calm competence", warmth from off-white and a single sage accent, "never from saturated color or decorative illustration" (`:69-71`).
- Voice: sentence case, no emoji, no exclamation marks, "you" (`:74-79`).
- Type: one family, Pretendard Variable, at 400/500/600/700; wrapping with `keep-all` + `anywhere`; a two-column scale by viewport (`:82-88`). Line height is bounded below by the face: "`line-height: 1` clips" (`:88`).
- Colour: warm neutral and one accent; "No saturated multi-color card palette" (`:91-94`).
- Depth: "Depth is a whisper … never pure black, never large halos" (`:104`).
- Motion: bans bounce, spring overshoot, parallax, card tilt and self-playing decorative motion (`:107`).
- Accessibility: sage focus ring and 44×44 targets (`:113-116`).

**Token values (§5, `:127-242`).**

| Group | Values | Location |
|:---|:---|:---|
| Canvas / surface | `--canvas #FBFAF7`, `--canvas-elevated #FFFFFF`, `--surface-soft #F4F1EA`, `--surface-muted #ECE8DF` | `:148-153` |
| Ink | `--ink #1E1A16` … `--muted-soft #ADA59D` | `:157-162` |
| Hairlines | `#E6E2D8` / `#D6D1C4` | `:167-168` |
| Sage accent and solid ladder | `--sage #5C8E78`, `--accent-solid #4B7764` → `#396050` → `#2B4A3E` (D-12: the filled CTA must not read `--sage`) | `:173-181` |
| Radius | 5 / 8 / 12 / 16 / 24 / 999 | `:210-215` |
| Motion | `--ease-standard (0.2,0,0,1)`, `--dur-fast 140`, `--dur-base 220`, `--dur-expand 260` — the last two are registered deviations; realised values are 180 and 280 (`decision-register.md:399-407`) | `:236-241` |

**Bans that matter for the rebuild.** Each of these is contradicted by the prototype (§4.2).

| Ban | Location |
|:---|:---|
| No saturated multi-colour palette | §4.4 `:93` |
| No neon, no cold blue imagery | §4.9 `:110` |
| Depth is a whisper | §4.7 `:104` |
| Motion bans | §4.8 `:107`, §8 `:377` |
| No colour dot on tags, ever | §6.3 `:257` |
| No hero band | §7.1 `:293` |
| No A/B letter badges | §7.3 `:315` |
| No dashed or dotted "coming soon" | §7.5 `:336` |
| No hover skin on test cards | §7.2 `:307` |
| Swipe-down close not authorised | §7.8 `:367` |
| Never-reintroduce list | §10 `:415-429` |

**Stale parts.** §9's resource manifest still says token CSS is "Missing locally" and points at a `wave12-conformance/` export (`:395-404`), although `ds/` has existed since 2026-09-06. §7 describes a catalog grid (asymmetric 3→4 columns, `:349-360`) and an in-grid expanded card (`:310-322`) that the prototype replaces.

### 2.3 `ds/colors_and_type.css` — the realised token definition

**Structure (three layers, `:10-18`).**

*Base primitives:*
- Sage 50–900, anchored at `--sage-500 #5c8e78` (`:53-62`).
- Warm neutrals 0–975, one temperature end to end after D-01 (`:93-107`).
- Clay and semantic hues, marked not realised (`:111-123`).

*VIVE semantic roles (`:152-227`).* The layer's one rule: "a catalog value may be introduced under a catalog alias; it may NOT change a VIVE role that generic components consume" (`:128-141`). Examples:
- `--fg3` resolves to `--muted-aa` (D-20, `:174`).
- `--accent-solid*` (`:201-203`).
- `--ring` (`:227`).

*Type, spacing and layout:*
- Font stack with a named per-script fallback for all 12 locales (`:232-249`).
- Headings, body, label, caption, overline, and `--button 600 15px/1.2`, which was corrected because 15px/1 clipped (`:261-277`).
- Tracking helpers (`:280-282`).
- 4px spacing ladder (`:287-299`).
- Radius 2xs–2xl + pill (`:308-315`).
- Elevation xs–xl tinted with `rgba(30,26,22,…)` (`:321-325`).

*Motion (`:362-381`):*
- `--ease-in-out (0.45,0,0.2,1)` for the core expand/collapse (M-01).
- Duration ladder 120 / 140 / 180 / 280.
- Staggers 40 / 100 / 160 (plus exit staggers).
- Container 1280 and `--tap-min 44px` (`:386-388`).

*Catalog aliases in `design.md` §5 vocabulary (`:416-513`):*
- `--muted-aa #756d66`, re-solved against the darkest ground (`:427-441`).
- `--blog-read-more-ink` (`:469`).
- Card metrics `--card-pad 16px`, `--choice-pad`, `--tag-pad`, `--thumb-ratio 16 / 4` (`:494-498`).
- Gutters 15 / 20 / 24 (`:501-503`).
- Catalog type roles `--t-card-title` … `--t-eyebrow` (`:507-513`).

**Viewport axis.** A mobile column moves `--h1`, `--h3`, `--body-sm` and four catalog roles under `@media (max-width: 767px)` (`:541-552`). It is copied into `.vt-phone` so that specimens can draw a phone inside a desktop-width card (D-21, `:580-588`). A unit test holds the copy equal to the original (README D-21).

**Dark theme.** The semantic layer is remapped from the other end of the same ramp. It is written **twice** — `[data-theme='dark']` at `:621` and `@media (prefers-color-scheme: dark) :root:not([data-theme='light'])` at `:749`. The first serves the product's pre-hydration bootstrap and the second serves specimens and the Claude Design canvas, which have no bootstrap (`design-tokens-dark-parity.test.ts` header). Dark lifts by surface rather than by shadow, and overlays separate by a `--border-strong` edge because the scrim cannot darken a near-black page (`:866-874`).

**Element defaults.**
- Scoped to `.vive`, wrapped in `:where()` so any class wins (`:891-936`).
- `box-sizing: border-box` scoped in (`:882-896`).
- Reduced motion shortens `--dur-slow` to 180ms (`:958-962`).
- Both came out of measured defects (L06).

### 2.4 Component spec sheets

**`catalog-components.css`** covers:
- Grid bands by modifier, not media query (`:26-60`).
- Card, thumbnail, title and subtitle clamps, tags, blog card with `Read more`, unavailable card.
- Expanded card: body, group, single spacer, context, question, choices.
- Answer-button variant (`:64-587`).

**`app-components.css`** covers:
- Surfaces: `.vt-panel`, `.vt-floating`, `.vt-well`, `.vt-scrim` (`:46-75`).
- Buttons: `.vt-btn` primary, secondary and quiet (`:96-180`).
- Pills, including `--quiet` from D-15 (`:201-312`).
- Navigation: GNB (`:335-409`), settings layer (`:425-471`), chips and theme swatches with the `.is-effective` badge from D-16 (`:490-592`), drawer (`:617-714`).
- Data and banners: progress bar (`:733-752`), data row (`:768-779`), banner/consent (`:787-876`).
- Overlays: sheet primitive with grabber, `dvh` and safe-area (`:930-1053`).
- Misc: notice (`:1089`), skip link (`:1136-1175`), page head (`:1220-1242`), empty state (`:1259-1280`).

Both files say explicitly that they are specimen stylesheets, never imported and never a drop-in.

### 2.5 Preview cards

**Inventory.** There are 31 files, all carrying a first-line `@dsCard` marker:

| Group | Count | Cards |
|:---|:---|:---|
| Catalog | 14 | `card-*` ×8, `catalog-drift`, `comp-answer-button`, `comp-choice`, `comp-meta-row`, `comp-tag-chip`, `grid-rhythm` |
| App | 10 | `banner-consent`, `comp-notice`, `comp-sheet`, `nav-desktop`, `nav-drawer-order`, `nav-mobile`, `nav-settings-layer`, `secondary-surfaces`, `surface-landing-head`, `test-flow` |
| Colors | 3 | `color-sage`, `color-temperature`, `dark-theme` |
| Spacing | 2 | `motion`, `radius-scale` |
| Brand | 2 | `brand-thumbnails`, `thumb-proposal` |

Viewports run from 700×160 to 1300×1360. Most are desktop-width frames with boxed phones inside, which is what made D-21 necessary.

**Contract (`SYNC.md:97-125`).**
- The marker sits on the first line after the doctype.
- Cards use `var()`, never hex, except `catalog-drift.html`.
- Three cards restate values in text and drift silently: `radius-scale`, `motion`, `catalog-drift` (`:111-117`).
- Nothing in the gates renders the bundle. The 2026-09-07 manual contrast audit found 418 failures, 415 from one pattern. Its traps: Chrome serialises `color-mix()` as `color(srgb …)` with 0–1 channels, and `aria-hidden` subtrees must be skipped (`:127-136`).

### 2.6 Findings table, provenance, fonts and assets

**Findings.** Every row D-01…D-21 in `ds/README.md` is closed as of 2026-09-17 (`README.md:17`). Memory `vivetest-ds-readme-findings-are-stale.md` agrees: it records D-17 and D-21 as closed on 2026-09-16.

**Earlier inconsistency checks** (`contract-design.md` §9, 2026-09-11):
- ⑴ `--chip-bg` consumed but undefined — **now fixed** (zero hits today).
- ⑷ README and SKILL point at files that exist only on the remote side — **still true**: `README.md:95, 168, 182-183, 193` and `SKILL.md:21, 25, 27-28` name `vive-components.css`, `ui_kits/app/`, `ui_kits/catalog/`, and the logo and mark under `assets/`. These sentences are true in Claude Design and false in the repository.

**Other files.**
- `_provenance/` holds five pre-rebaseline snapshots of v2 files so v2 can be restored without Claude Design history (`_provenance/INDEX.md`).
- `fonts/PretendardVariable.woff2`: release 1.3.9, 2,057,688 bytes, SHA-256 `9599f12f…`, weight axis 45–920 (`SYNC.md:44-59`). The runtime no longer ships it: it uses 92 upstream dynamic-subset slices plus a 601-glyph supplement (Latin Extended and all of Cyrillic, BQ-47) and deliberately does not preload them. Measured: font transfer 2,058 KB → 116 KB at the same LCP (`globals.css:19-72`).
- `assets/`: seven thumbnails plus `answer-arrow.svg`, imported unmodified from `825385f6` under decision D. They are superseded in the product by ten sage-only 16:4 compositions in `public/landing-card-media/*/thumbnail.svg` (README D-08).
- `docs/design/resources/` holds four reference screenshots, `vive-logo.svg` / `vive-mark.svg`, and three superseded wave CSS files plus an old `design.md`.

### 2.7 The Claude Design sync contract

**Projects** (memory `vivetest-claude-design-integration-status.md`; `SYNC.md:5`):

| ID | Name | Type | Role |
|:---|:---|:---|:---|
| `cd630eec-25e4-4613-a58f-c671c80297ca` | VIVE Design System v2 | `PROJECT_TYPE_DESIGN_SYSTEM` | the only push target |
| `ee2fb724-0b32-484e-89b8-8a01da75ba77` | ViveTest v3 -branch2 | general project (canvas workspace) | never a push target; its type cannot change; `list_projects` does not list it, so it is found only by URL |
| `825385f6` | Vive Design System v1 | design system | reference only; card components and thumbnails came from here (BQ-38 D) |

**Direction.** "The repository owns the content. Claude Design owns the rendering and the canvas. Every value is written here and pushed there; nothing is authored on the Claude Design side and copied back by hand" (`SYNC.md:7-9`). This rests on history: values once lived in a harness outside the repo and drifted three times (BQ-21, R1, R2). Reverse sync was examined and rejected again on 2026-09-16 (`2026-09-16-design-uplift-before-step3.md` §1). One of the reasons given: `DesignSync` is a file API with no method that makes a design.

**What is pushed** (`SYNC.md:13-24`):
- Pushed: `colors_and_type.css`, `catalog-components.css`, `app-components.css`, `README.md`, `SKILL.md`, `preview/*.html`, `assets/*.svg`.
- Not pushed: `SYNC.md`, `fonts/`, `_provenance/`.

The two sides hold different file sets. On 2026-09-11 there were 46 files in the repository and 82 in the project (`:30-36`). The project-only files:
- `vive-components.css`, `ui_kits/app/**`, `ui_kits/catalog/**`, `uploads/`
- `_ds_bundle.js`, `_ds_manifest.json`, `_adherence.oxlintrc.json`
- `assets/vive-logo.svg`, `assets/vive-mark.svg`
- nineteen generic preview cards

**Procedure** (`SYNC.md:91-95`):
1. Order is fixed: `list_files` → `finalize_plan` (declares exact paths, returns a `planId`) → `write_files`. A write outside the plan is rejected.
2. The `/design-sync` skill is CLI-only and absent in the desktop app, so sessions drive the tool directly.
3. Authorisation is machine-level via `/design-login`. Memory says it was done once from the CLI and that desktop sessions reuse it.

The push log in `SYNC.md:67-89` records seven pushes from 2026-09-06 to 2026-09-17, each verified by `list_files` and/or `get_file`.

**Tool methods, from the `DesignSync` schema.**

*Read:*
- `list_projects` — writable design-system projects only.
- `get_project` — use it to check `type: PROJECT_TYPE_DESIGN_SYSTEM`; "that type is immutable at creation".
- `list_files`.
- `get_file` — capped at 256 KiB.

*Setup:*
- `create_project` — creates a new design-system project; permission prompt.

*Plan boundary:*
- `finalize_plan` — takes `writes`/`deletes` globs (at most 3 wildcards each, 256 entries) and `localDir`; permission prompt.

*Write (plan required):*
- `write_files` — `localPath` inside `localDir`, at most 256 files per call; binary goes through `localPath`.
- `delete_files`.
- `register_assets` / `unregister_assets` — both documented as **legacy**.

*Also:* `report_validate`, which takes counts from a `.render-check.json`.

*Usage restrictions stated in the tool description:* use it "only with the /design-sync skill … incrementally, one component at a time, never as a wholesale replace"; "never use it to make a design, deck or prototype — those are made from a Slides or Design Artifact type".

**Known traps, all measured in this repository.**

| Trap | Source |
|:---|:---|
| **`_ds_manifest.json` is derived and lags.** Right after `write_files` it still listed old values and lacked the new card. It is not a way to check a push — use `list_files` / `get_file`. Never hand-write it. | `SYNC.md:40, 105-107` |
| **`register_assets`:** `SYNC.md` used it to make a newly added card appear without waiting. The current tool contract says the pane builds its index from `@dsCard` markers and explicit registration "is no longer required". Both are consistent: markers are enough eventually, and registration forces the card in now. | `SYNC.md:105-107`; tool schema |
| **Uploading an SVG rewrites it** — a ~5 KB `<metadata><c2pa:manifest>` block is injected. Compare the drawing, not the bytes. | `SYNC.md:26` |
| **`get_file` caps at 256 KiB**, so a 2 MB font can only be verified by prefix. | `SYNC.md:55-57` |
| **The count returned by `write_files` says what was written, not what was removed.** A push that deletes rules must re-read the file. | `SYNC.md:87` |
| **A README that describes files only one side holds** reads true on one side and false on the other. | §2.6 above |

---

## 3. The prototype's visual language (round 3, final revision in progress)

### 3.1 Status and structure

**Status.**
- Round 3 was judged on 2026-09-25: "이번 턴에서는 아주 마이너한 수정사항만 반영해 최종 채택" (`dialog.md:2123`).
- The owner will use all three stages: "각각의 안이 모두 마음에 들어서 3개안 (반반화면, 갈림길, 스토리) 모두 이 서비스 안에서 사용하겠습니다. 대신, 갈림길 1개만 Visual Style 과 톤앤매너 시각적 일관성을 맞추는 작업만 하면 모두 사용 가능해보입니다." (`dialog.md:2198-2199`).
- The final revision is running now. I, D and share are done (`dialog.md:2387`). J adopted sketch direction A, "the world is now built from the landing card's own materials" (`dialog.md:2376-2380`), and is in its fix/verify phase. Cross-verification and publishing come after that, estimated 04:30–05:30 KST (`dialog.md:2440-2461`).
- The published hub is `https://claude.ai/artifact/LPuzkZHX6FTcYwJJa8Vja3`. The source exists only in the scratchpad (memory `vivetest-mobile-interaction-mockups.md`).

**Layers.**

| Layer | Files | Visual register |
|:---|:---|:---|
| VIVE paper | `shared/tokens.css` (hex copy of v2 light and dark, `:1-3`) | instruction modal body, share sheet, end cards, landing list, hub |
| Shell | `shared/shell.css` + `shell.js` | top bar, palette rail, 이전/제출, badges, votes, question type, instruction modal; tone-switched `data-tone="dark"|"light"` (`shell.css:1-4, 60-61`) |
| Share | `shared/share.css` + `share.js`, `v-vote.html` | share sheet on paper; the friend's page is a full colour world (`v-vote.html` `--c`) |
| Landing | `l3-deck.html` | WebGL colour field, a horizontal deck of poster cards, a paper list below, "the window" hosting a stage |
| Stages | `i3-split.html`, `j3-forks.html`, `d3-story.html` | colour worlds with white type in both themes |
| Mockup chrome | `shared/proto.css` | info tab, toast, haptic ring — not product |

### 3.2 Colour system

**Per-test signature colour.**
- `Shell.TEST_COLORS[testId] = { base, hi }` (`shell.js:61-69`): `qmbti` `#1d5242`/`#8ae6c2`, `energy-check` `#3a2b7c`/`#cdbdff`, `egtt` `#7a2e1b`/`#ffc48a`, `creativity-profile` `#3d3526`/`#e3c98a`, and two example tests.
- Its reach: "each test's signature colour: the landing card, the stage's first colour, the 시작 button, the share card" (`shell.js:60`).
- The round-3 summary, which the owner then adopted, states it as a rule: "테스트 대표색은 카드 → 무대의 첫 색 → 시작 버튼 → 공유 카드까지 이어집니다" (`dialog.md:2033`).

**Per-test palette record.**
- `Shell.LOOK[testId] = { c1, c2, glow, deep, tint, dark[4], light[4] }`, merged with base/hi (`shell.js:73-82`). `dark[4]` / `light[4]` are the landing field's four colours per theme.
- Tests without a curated entry get one derived by `mixHex` (`shell.js:85-88`).
- It is "the one source for the landing card and field and for the stages that paint a world from it (J)" (`shell.js:24-26`).

**Per-question answer colours (stage I).**
- Curated saturated pairs per question and test (`i3-split.html:201-210`), e.g. `qmbti` Q2 `#ff7a5c` / `#0e6b6b`, Q3 `#5a3fd8` / `#c8d96a`.
- Q1 = the signature plus its complement at the opposite lightness (`:176-177, 216-221`).
- Three or four answers use `genSet`: golden-angle hue turns, alternating deep (Y ≤ 0.07) and light (Y ≥ 0.38) so neighbours part at ≥ 3:1 (`:183-199`).
- `legible()` nudges any colour until white or ink text on it reaches 4.5:1 (`:178-182`).
- The answered colours become the palette rail, which the owner called "나만의 결과물": "네, 잘 느껴졌고 남기고 싶었습니다." (`dialog.md:623`).

**Tone.**
- `toneFor(hex)` picks dark or light chrome ink by comparing contrast against white and ink (`shell.js:106`).
- Chrome pieces carry `data-tone`, which sets `--vt-fg`, `--vt-chip-bg` and `--vt-quiet-bg` (`shell.css:60-61`).

**Luminance caps for type over a moving field.**
- Landing blobs are capped at Y 0.13 wherever type sits; only the lower-corner glow is brighter (`l3-deck.html:316-324`).
- The window's type-bearing blobs are capped at 0.15 (`:323-324`).
- Implied white-text contrast: 1.05/0.18 = 5.8:1 at Y 0.13, and 5.25:1 at 0.15.

**Paper roles.** They are v2 exactly:
- `--canvas`, `--canvas-elevated`, `--ink*`, `--muted-aa`, `--hairline*`, `--tag-*`, `--overlay-scrim`, the whisper shadows, and the full dark remap (`tokens.css:9-33, 67-125`).
- Exception: in dark, the prototype also redefines the *primitives* `--sage-600` / `--sage-700` to light values (`tokens.css:81-82`). v2's rule is that primitives are fixed and only roles move.

**Category hues.** `--cat-*` from the v1 thumbnails (`tokens.css:35-40`, `content.js:111-116`) survive in round 3 only as the blog tile and "읽을거리" stack colour (`l3-deck.html:365, 1094`). `TEST_COLORS` has otherwise replaced them.

**Sage's role shrinks.** It remains:
- the focus ring on paper (`shell.css:175`)
- the share badge and `share-done` tint (`share.css:39, 62-65`)
- the list's link ink `--accent-fg` (`l3-deck.html` `.rgo`)

Filled primary actions are no longer sage:
- ink on paper: `share-primary`, `share-btn--strong` (`share.css:61, 78-81`); I's `fin-share #1e1a16`
- the test colour in the modal: `.vt-start` (`shell.css:166`)
- a white pill on worlds: `.vt-submit` (`shell.css:106-109`)

### 3.3 Surfaces and materials

**Posters.**
- Landing cards are "deep posters with white type in both themes" (`l3-deck.html:24-27`).
- Radius 28px; the background is the grain tile over `--cover`, built from four radial blobs per palette (`:80`, `:319-325`).
- Shadow: `0 34px 64px -26px rgb(0 0 0/.6), 0 12px 26px -14px rgb(0 0 0/.4)` plus inset highlights (`:80-81`).
- A 72px coloured halo behind the current card (`:78`).

**Grain.** A 128px canvas tile of black and white specks at alpha ≤ 22/255, made once (`l3-deck.html:395-402`). It is used on:
- cards
- the window surface (`:169`)
- J's whole world (`j3-forks.html:34-35, 242-245`)

**Living field.**
- A WebGL fragment shader (noise-warped blob mesh, luminance banding, dither, `:404-439`) at one third resolution, DPR ≤ 1.5 (`:461-464`).
- A CSS radial-gradient fallback when there is no GPU (`:65-69, 482-489`).
- The palette blends in OKLab between neighbouring cards and between themes (`:467-470`).
- It runs continuously while the landing is visible and motion is not reduced; it pauses on `visibilitychange` (`:548-558, 1140`).

**Glass.**
- Chips: `rgba(14,12,11,.34)` / `rgba(255,255,255,.5)` + `blur(12px) saturate(1.3)` (`shell.css:44-61`).
- Question label on two colours: `rgba(14,12,11,.56)` + `blur(14px)`, "glass, never white — white surfaces are answers" (`:121-125`).
- Quiet 이전 pill: `blur(8px)` (`:100-104`).
- Modal scrim: `rgba(8,6,5,.58)` + `blur(6px)` (`:135-140`).
- J's glass labels, tinted with the card's deep colour (`j3-forks.html:82, 101`).

**Stage grounds.** Near-black warm `#0f0d0c` (I, `i3-split.html:31, 40`) and `#0c0a09` (D, `d3-story.html:34, 41`). The latter equals v2 `--warm-975`.

**"White = answer".** The owner flagged the round-2 inversion: "Q1 에서 펼쳐진 카드에서 응답 선택은 흰색 round box 에 선택지가 있습니다. 반면 Q2 이후 반반화면에서는 드래그를 하는 `질문` 이 흰색 round box 에 표시되어 양쪽이 정 반대의 요소에 적용됩니다." (`dialog.md:1204-1206`). It became shell rule 5 (`BRIEF3.md` "Shell rules" 5):
- answers on white or filled surfaces: D `.ans` (`d3-story.html:58-65`), J `.board` (`j3-forks.html:57-59`), landing fallback `.ans` (`l3-deck.html:193`)
- the chosen answer takes the test colour with a 2px white inner ring (`d3:65`, `j3:62`)
- questions on glass or straight on colour

### 3.4 Type in use

| Role | Value | Source |
|:---|:---|:---|
| Landing card title | 800, `clamp(30px, cw×.148, 50px)`/1.05, −0.03em, balance | `l3-deck.html:88` |
| Landing intro line | 800 22px/1.3, −0.02em | `l3-deck.html:71` |
| Wordmark (GNB) | 800 19px, −0.02em | `l3-deck.html:53` |
| Question `.vt-q` | 800 `clamp(22px, 6.2vw, 26px)`/1.3, −0.02em, balance | `shell.css:119` |
| Question label `.vt-qlabel` | 700 17px/1.38, −0.012em | `shell.css:122-123` |
| I answer text | 800 `clamp(24px, 6.7vw, 28px)`/1.26, −0.028em (steps down at 3/4 answers) | `i3-split.html:52-57` |
| D / landing answers | 650 16px/1.38 | `d3-story.html:60`, `l3-deck.html:193` |
| Instruction title | 800 23px/1.25 | `shell.css:156` |
| Instruction text | 400 15.5px/1.6 | `shell.css:158` |
| Start button | 800 17px/1 | `shell.css:166` |
| Submit pill | 800 16px/1 | `shell.css:108` |
| Top-bar title / brand chip | 700 14px/1.2 · 800 14px/1 | `shell.css:44, 51` |
| A/B badge | 800 13px/1 in a 26px circle | `shell.css:113-116` |
| Votes line / example chip | 600 13px/1.3 · 800 10.5px/1.3 | `shell.css:127-131` |
| Rail percentage | 700 11px/1.2, tabular | `shell.css:74-77` |
| List row title / sub | 650 16px/1.35 · 13px | `l3-deck.html:151-152` |

Weights 650 and 800 are used; v2 allows 400/500/600/700 only. The variable face spans 45–920, so the font can render them. Several roles use `line-height: 1` or 1.05. v2 measured that `line-height: 1` clips Pretendard (`design.md:88`; `colors_and_type.css:273-276`), so these must be rendered and checked, not assumed. Fractional sizes (15.5, 12.5, 10.5) have no ladder.

### 3.5 Radius, shadow, blur

| Aspect | v2 (`colors_and_type.css:308-325`) | Prototype |
|:---|:---|:---|
| Radius ladder | 4 · 5 · 8 · 12 · 16 · 24 · 32 · 999 | 28 (deck card, modal card, D card: `--vt-radius-card`), 26 (list top, D end card), 24 (share sheet, sheets, final cards), 22, 20, **18** (every answer surface, question label, list rows), 17, **16** (share link, primary, start), **14** (share buttons, qualifier, context row), 12, 9, 7, pills and circles |
| Elevation | `rgba(30,26,22,.04–.18)` whisper, ≤ 64px blur | posters `rgb(0 0 0/.6)` with negative spread; modal `0 30px 80px rgba(0,0,0,.45)` (`shell.css:148`); submit `0 10px 26px rgba(0,0,0,.24)`; answers `0 12px 24px -14px rgba(0,0,0,.5)`; VIVE whisper tokens only on the share sheet (`share.css:18, 70`) |
| Blur | sticky header `blur(8px)`, "No frosted-glass everywhere" (README Transparency) | 6–18px across chips, labels, pills, modal scrim, GNB (12px), J glass |

`app-components.css` itself records that 18px and 14px were off-ramp radii the v2 panel pattern removed (`app-components.css:27-29`). The prototype brings both back as main steps.

### 3.6 Motion vocabulary

| Kind | Prototype | v2 position |
|:---|:---|:---|
| Stage tokens | `--vt-ease-out cubic-bezier(0.2,0.9,0.25,1)`, `--vt-ease-in (0.4,0,1,1)`, `--vt-ease-flood (0.66,0,0.2,1)`, `--vt-dur-enter 560ms`, `--vt-dur-exit 260ms`, `--vt-dur-flood 700ms` (`shell.css:12-17`) | v2 ladder is 120/140/180/280 with `--ease-standard (0.2,0,0,1)` and `--ease-in-out (0.45,0,0.2,1)`; `--vt-ease-in` equals v2 `--ease-in` |
| Overshoot curves | `--spring (.2,1.32,.32,1)`, `--spring-soft (.24,1.16,.36,1)` on kinetic titles (`l3-deck.html:36-37, 115-116`) | **banned** (§4.8) |
| Physics springs | deck settle, underdamped ζ ≈ .72 "a little overshoot" (`l3-deck.html:530-535`); I liquid border `springTo` with neighbour-coupled waves (`i3-split.html:253, 868-871`); J "spring back after a swipe that did not commit (slight overshoot)" (`j3-forks.html:1143`); D `Proto.spring` (stiffness 1200, damping 70, `d3-story.html:405-406`) | **banned** as overshoot |
| Parallax | the field moves at 0.15× the cards (`l3-deck.html:545`); the round-1 H element "배경이 먼 곳과 가까운 곳의 시차" was the one piece kept (`dialog.md:529`) | **banned** (§4.8) |
| Tilt / rotation | I answer text tilts ±6° with the liquid surface (`i3-split.html:434, 696`); the kinetic entrance rotates characters 10° (`l3-deck.html:113`); the stamp sits at −9° (`:106`) | **banned** (card tilt) |
| Self-playing loops | the WebGL field; `bob` down-arrow every 2.4s (`l3-deck.html:140-141`); loading sheen 1.5s (`:182-183`); J traveller ring 2.4s infinite (`j3-forks.html:77-79`); first-visit deck nudge (`l3-deck.html:525-528`) | **banned** (§4.8), and `req-landing.md:16` "배경 동적 연출은 강도 `0`/정지 상태로 비활성화한다" |
| Kinetic type | per-character entrance: blur 8px, 0.66em rise, rotate 10°, scale .78, 30ms stagger; motif strokes draw in over 1000ms (`l3-deck.html:113-120`) | no counterpart |
| Colour flood / morph | I bloom (tapped band floods the screen); `clip-path: circle()` answer fill 420ms (`l3-deck.html:196-199`); share question→card colour-block morph (`share.css:86-87`) | colour transitions allowed |
| Press feedback | `scale(.95 / .985 / .98 / .92)` (`l3-deck.html:55, 81, 127, 194`) | "0.5px nudge down … No squish/scale beyond that" (README Interaction states) |
| Sheets | share sheet 380ms `(0.2,0.9,0.25,1)`; instruction modal opacity 240ms + transform 460ms from `translate3d(0,22px,0) scale(.965)` (`shell.css:149`) | v2 sheet 260 in / 220 out as named constants (README D-18) |
| Reduced motion | `:root[data-reduced-motion]` removes translate, scale and clip, keeps opacity at 140–180ms, stops loops (`l3-deck.html:203-209`, `shell.css:177-179`, `share.css:114-119`); **D becomes the stage for every test** (`shell.js:27, 94-96`) | v2: drop translations, keep opacity, core to 180ms |

What the owner asked for: "원하는 톤 (1 = 지금처럼 차분하고 단정하게 · 5 = 과감하고 화려하게) → 3 ~ 5 수준" (`dialog.md:686`) and "흥미를 유발하는 현란하고 창의적인 UX와 모션 제공하면서 동시에 직관성도 갖춰야 함" (`dialog.md:688`). On the moving background (round-1 B): "배경색 흐름 자연스러웠고, 분위기를 잘 살렸으며 읽기를 방해하지 않았습니다." (`dialog.md:442`). On I's spring: "손맛 있다" (`dialog.md:611`). The exploration brief lifted the bans on purpose: "the current design system bans spring overshoot, parallax, tilt and auto-playing motion — those bans are LIFTED for this exploration" (`BRIEF.md` Build rules 3).

### 3.7 Components the prototype defines

These are the candidates for design-system components, and so for specimen cards.

- **Shell top bar** (`shell.css:34-62`): brand chip "ViveTest" (glass, 800 14px), centred test title (700 14px, ellipsis), 44px circular share icon, tone-switched.
- **Palette rail, y axis** (`:64-78`): 12px track on the right edge, answered colours stacked bottom → top, current segment ringed, a floating percentage chip. It is "the only progress display in every stage" (`BRIEF3.md` rule 2).
- **Story bar, x axis** (`:79-91`): 4px along the top edge for D. The owner insisted: "Vertical Bar 는 이 안에서는 안어울립니다. 기존처럼 상단 edge 부분에 horizontal bar 가 더 적합합니다." (`dialog.md:2188-2189`).
- **Bottom controls** (`:93-110`): quiet `이전` glass pill (≥ 44px, centred; in J it follows the road's centre, `:98-99`); white `제출` pill on the last question.
- **Answer tokens** (`:112-131`): A/B badge, previous-choice mark (opacity .7 check), `.vt-q`, `.vt-qlabel`, votes line `친구 N명이 골라 줬어요 · A 2 · B 1` with the `예시` chip.
- **Instruction dialog** (`:133-179`): centred modal (radius 28, max-width 420) over a blurred scrim. The head wears the test colour; landing-answer context row with badge; consent note block; start button in the test colour; secondary text button; qualifier two-button row. Round 3 changed it from a bottom sheet: "시작 전 안내 하단 바텀 시트는 화면 위를 덮는 모달 팝업/시트 형태로 변경되는게 더 바람직해보입니다 … optional 해보이는 바텀시트보다 화면을 좀 더 많이 덮는 UI 가 더 바람직합니다." (`dialog.md:2132-2133`).
- **Share sheet** (`share.css`):
  - Structure: bottom sheet with no grabber, radius 24 top; link card (76px thumb in the test colour); two-button row; 9:16 story card; ink primary action; one-time coach label.
  - Previews and morphs: the friend's-eye preview (`share-peek`); the question → card colour morph.
  - Friend's page (`v-vote.html`): a full colour world with vote bars.
- **Landing deck card** (`l3-deck.html:74-120`):
  - Content: category line with a hi-colour dot, kinetic title, 3-line subtitle, meta, per-test stroke motif.
  - Actions: quiet text CTA "첫 질문 보기" plus arrow (the owner asked for less emphasis: "[첫 질문 보기] CTA 는 너무 눈에 띄어서 텍스트 버튼으로 하거나 덜 강조되는 방향으로", `dialog.md:1188`).
  - "coming soon": a stamp and a dashed line.
  - End card: a fanned stack of every tile.
- **Landing list** (`:134-157`): paper sheet overlapping the stage by 24px; rows with a gradient tile and motif, 2-line title, `--tag-bg` pill chip, soon rows on `--surface-soft`, underlined footer link.
- **Window** (`:158-201`): expanded card surface (poster blobs + grain), header band with glass category chip and title, loading sheen, and a fallback Q1 drawn with shell tokens.
- **Stage pieces:** I bands/answers/ghosts/final card; J signs (white board, badge, lean/dim/selected), gate button, traveller dot, origin label, hint; D story cards with side peeks, lock card (dashed), frontier hint, end card on paper.

---

## 4. Token-by-token comparison

### 4.1 What carries, what changes, what is new

| Aspect | v2 | Prototype | Verdict |
|:---|:---|:---|:---|
| Font family | Pretendard Variable + per-script fallbacks for 12 locales (`colors_and_type.css:232-249`) | Pretendard + Korean-only fallbacks (`tokens.css:6-7`) | **Carries**; keep v2's stack, the prototype's is Korean-only |
| Font delivery | 92 dynamic subsets + 601-glyph supplement, no preload (`globals.css:19-72`) | not addressed | **Carries** as-is |
| Weights | 400/500/600/700 (`design.md:82`) | adds 650 and 800 (§3.4) | **Changes**: add 800 display; normalise 650 to 600 or 700 |
| Type scale | desktop column + mobile column (`:261-277, 541-552`) | phone-only, clamp-based display roles (§3.4) | **Changes**: new expressive tier; the body 16/1.5–1.6 anchor carries |
| Tracking | −0.02 / −0.01 / +0.08 | −0.03 … −0.005 | **Carries** mostly; add −0.03 for display |
| Line-height floor | ≥ 1.2 for Pretendard (`design.md:88`) | 1 and 1.05 used (§3.4) | **Conflict**: verify by rendering |
| Wrapping | `keep-all` + `anywhere` everywhere | same on `body` (`tokens.css:147-148`), plus `text-wrap: balance` | **Carries** |
| Warm neutral ramp | `--warm-0…975` | same values (`tokens.css:9-33`) | **Carries** |
| Paper roles, light and dark | canvas / elevated / soft / muted / ink / hairline / tag / scrim | same values | **Carries** |
| Dark theme model | remap of roles, primitives fixed; written twice | same values; also flips two primitives (`tokens.css:81-82`); also written twice (`:67-125`) | **Carries** values; fix the naming; remove the duplication (§5.3) |
| Sage accent | primary accent: selection, focus, CTA fill (`--accent-solid`) | paper focus ring, badges, link ink, tints only | **Changes**: sage demoted to the paper accent |
| Filled primary action | `--accent-solid` + white label (D-12) | ink on paper, test colour in the modal, white pill on worlds | **New rule**: the action colour follows the surface |
| Test signature colour | none (the sage family covers everything, D-08) | `TEST_COLORS` + `LOOK` (§3.2) | **New**: palette as data |
| Answer colours | neutral elevated choice, sage hover (`design.md` §6.4) | saturated per-question pairs (I), white answer / test-colour selected (J, D) | **New** |
| Category hues | none (catalog tags are text-only) | `--cat-*`, now only blog tiles | **Drop or decide**: effectively superseded |
| Tone system | none (one theme-driven ink) | `data-tone` dark/light from `toneFor` | **New** |
| Radius | 5/8/12/16/24/pill | 12/14/16/18/24/28/pill in practice | **Changes**: new ladder |
| Elevation | whisper, ink-tinted | whisper on paper, heavy black on posters and worlds | **Changes**: two registers |
| Blur / glass | header only | chips, labels, pills, scrim | **New** material |
| Grain / mesh field | none | canvas grain tile, WebGL field + CSS fallback | **New** materials |
| Motion | 120/140/180/280; `ease-in-out` core | 260–700ms; overshoot curves; physics springs | **Changes**: two registers (paper vs stage) |
| Focus ring | 2px sage, 2px offset (`design.md` §6.9) | same on paper; white or `currentColor` on worlds (`shell.css:62`) | **Changes**: tone-aware ring |
| Tap target | 44px | 44px (`shell.css:101`, `.vt-icon 44`) | **Carries** |
| Scrim | `--overlay-scrim` 48% warm / 72% dark | the same on the share sheet; modal `rgba(8,6,5,.58)` + blur; landing catcher `rgb(0 0 0/.36)` | **Changes**: add a modal scrim with blur |
| Container / grid | 1280 container, asymmetric 3→4 columns, 15/20/24 gutters | phone column `min(100vw, 430px)` centred on a desk (`tokens.css:59-62, 129-133`) | **Dropped** for phone; desktop is an open decision |
| Thumbnails | sage 16:4 SVGs (D-08) | per-test stroke motifs on posters (`l3-deck.html:338-345`) | **Dropped** / replaced |
| Tag chip | 5px radius, 13/500, lowercase, borderless | pill 999, 12/600 (`l3-deck.html:154`) | **Changes** |
| Progress | bar + % (`app-components.css:733-752`) | palette rail + % chip | **Changes** (product contract too) |
| Sheets | bottom sheet primitive with grabber on the card sheet (`app-components.css:930-1053`) | no grabbers, never drag-to-close; instruction is a centred modal | **Changes** |

### 4.2 v2 bans against the prototype, and what the owner already decided

| v2 ban | Prototype use | Owner's recorded verdict | Disposition for v3 |
|:---|:---|:---|:---|
| Spring overshoot (§4.8, §8) | kinetic titles, deck settle ζ ≈ .72, I liquid, J spring-back | round-1 I spring "손맛 있다"; tone "3 ~ 5 수준" | **Lift**, bounded: spring only on direct-manipulation settle and on entrances; never under reduced motion |
| Parallax (§4.8) | field at 0.15× | round 2 "네, 원근감이 좋아졌습니다." (`dialog.md:1181`) | **Lift** |
| Card tilt (§4.8) | text tilt ±6° with the liquid; rotated stamp | not commented | **Lift** for I; the stamp follows the final landing |
| Self-playing decorative motion (§4.8; `req-landing.md:16`) | WebGL field, bob, traveller ring, sheen, first-visit nudge | round 1 B background "자연스러웠고 … 읽기를 방해하지 않았습니다" | **Lift** for the landing field and the J traveller; `req-landing` §1.3 needs amending |
| No saturated multi-colour palette (§4.4), no neon (§4.9) | `TEST_COLORS`, curated pairs | round 3 adopted signature colours; the hub lists "테스트별 대표색이 카드 · 무대 · 공유 카드까지 이어지는 색 체계(현재 단일 sage 액센트)" as a conflict to resolve (`index.html` contract section) | **Reverse** |
| Depth is a whisper (§4.7) | poster and modal shadows | adopted by adopting the landing | **Split**: whisper on paper, poster register on worlds |
| No A/B letter badges (§7.3, §10) | every answer (`BRIEF3.md` rule 5) | round 3: "네, 이제 모두 한 서비스로 느껴집니다." (`dialog.md:2113`) | **Reverse** |
| No hero band (§7.1) | the first screen is a colour world with an intro line and a deck | landing adopted in rounds 2 and 3 | **Reverse** |
| No colour dot on tags (§6.3, §10) | category line dot, window chip dot (`l3-deck.html:86, 178`) | not commented | **Follow the prototype** (the dot marks the test colour, not a tag) |
| Dashed "coming soon" (§7.5, §10) | `.soonline` dashed (`l3-deck.html:107`), D lock card dashed (`d3-story.html:94`) | lock card: "네 이해했습니다." (`dialog.md:2185`) | **Reverse** |
| Frosted glass rare (README) | glass across chrome | round 3 on I: "어두운 반투명 라벨로 바꾼 질문 … 모두 적절합니다." (`dialog.md:2154`) | **Reverse** on the world layer |
| No squish on press (README) | scale presses | not commented | **Follow the prototype** |
| No swipe-down close (§7.8) | none; sheets close by outside tap, × or Escape | round 1: "드래그는 UX 상 사용자 주의와 노력을 많이 필요로하는 인터랙션이므로 가급적 피하고 …" (quoted in `BRIEF2.md` rule 3) | **Carries** |
| Tap 44px | carried | "44px 를 못 채우고 … 작은 점 내비게이션은 쓰지 않는다" (memory principles) | **Carries** |
| Voice: no emoji in UI, no exclamation marks | carried (`BRIEF.md` build rule 8); emoji only inside question content | — | **Carries** |

---

## 5. Proposal — the design system for the rebuild

### 5.1 Principles, taken from the failure record

1. **One definition, read by the app.** Every earlier drift was between two copies: harness vs code (BQ-21, R1, R2), `design.md` vs `ds/`, `ds/` vs `globals.css`, the two dark blocks, `.vt-phone` vs the media column, README prose vs CSS, the spec sheets vs the product (L06, L07), and now the prototype's `tokens.css`. The rebuild removes copies instead of guarding them.
2. **The spec names; it does not restate.** Carry the README rule that already worked: no hex in prose, and every remaining numeric literal is marked and machine-checked (`SYNC.md:119`; `check-design-token-parity.mjs:12-14`).
3. **Specimens render the real CSS.** v2's specimens used a spec stylesheet the app could not import, so specimen and product could only be compared by hand. v3 specimens load the same files the app loads.
4. **Anything rendered is measured.** v2's contrast audit ran once, by hand, and found 418 failures (`SYNC.md:127-136`; L06, L13). v3 renders its specimens and palettes in the repository's own Playwright and measures contrast every time.
5. **Colour that varies per test is data, not tokens.** The palette record, curated answer pairs and derivation rules belong with the variant data. Their invariants (luminance caps, 4.5:1 text, 3:1 neighbours) are unit-tested as math.

### 5.2 Where the single source of truth lives in the new `main`

The paths below are a proposed layout. The names are suggestions; the shape is the point.

| Path | Holds | Consumed by |
|:---|:---|:---|
| `src/styles/tokens.css` | **the** token definition: primitives (warm, sage), paper roles, world roles (on-colour ink, glass, stage ground, poster shadow), type (paper and display tiers), radius, elevation, motion (paper and stage registers), materials (grain size, luminance caps as documented constants). No Tailwind syntax, so it ships to Claude Design unchanged | `src/app/globals.css` (`@import`), specimens, Claude Design |
| `src/styles/vt/*.css` (if plain-CSS component skins are chosen, §5.4) | visual skins of shell, rail, badge, question type, instruction modal, share sheet, deck card, list row, as global `.vt-*` classes. Layout and behaviour stay in React | app components, specimens, Claude Design |
| `src/app/globals.css` | `@import "tailwindcss"`, `@import` of the token file, an optional `@theme inline` bridge so utilities resolve to token names, and the `@layer base` defaults already learned (`globals.css:476-516`) | app |
| variant registry (`source-fixture` → `builder`) | per-test `palette` (`base, hi, c1, c2, glow, deep, tint, field.dark[4], field.light[4]`) and optional curated per-question answer colours; a pure `derivePalette()` / `answerColors()` module for tests without curated data | app, canvas/WebGL stages, share image, specimen generator |
| `docs/design/system.md` | the spec: principles, the two registers (paper / world), rules ("white = answer", tone, luminance caps, action colour follows surface), component anatomy, bans kept and bans lifted with the owner's verdicts. **Token names only**, literals marked | people, agents |
| `design-system/specimens/*.html`, `README.md`, `SKILL.md`, `SYNC.md` | preview cards with `@dsCard` markers linking bundle-relative `tokens.css` / `vt/*.css`; pushed docs; a repo-only push procedure | Claude Design (through the bundle), local render gate |
| `scripts/design/bundle.mjs` → `.design-bundle/` (gitignored) | assembles runtime CSS copied byte-for-byte, specimens, `fonts/PretendardVariable.woff2`, assets, generated palette CSS from the registry, and `BUILD.json` (`{ commit, builtAt, files[], sha256[] }`) | `DesignSync write_files` |

**Why this and not the alternatives.**

| Option | Copies of a value | Guards needed | Verdict |
|:---|:---|:---|:---|
| (a) runtime `tokens.css` is the source; specimens and bundle consume it | 1 | bundle hash equals source (inside the script); spec has no values; specimen coverage; rendered contrast | **Recommended** |
| (b) keep `docs/design/ds/` as the source, mirror into runtime (v2 as-is) | 2–3 (three sentinel pairs, two dark blocks, `.vt-phone`) | parity tests on every pair | rejected: the structure that needed seven guards |
| (c) a JSON/TS token source generating CSS (Style-Dictionary style) | 1 source + generated outputs | generator correctness, generated-file hygiene | not now: adds a build step and "generated ≠ hand-written" rules for no gain over (a). Keep the TS path only for palette **data**, which JS needs anyway (canvas, WebGL, share image) |

**Theme without a second block.** Declare each theme-varying colour once with `light-dark()`, e.g. `--canvas: light-dark(#fbfaf7, #141110)`, and let `color-scheme` select it:
- `:root { color-scheme: light dark }`, plus `[data-theme=light|dark]` setting `color-scheme`.
- Shadows vary only in colour, so `light-dark()` fits inside the shadow value.
- Subtree theming still works, because unregistered custom properties resolve where they are used.
- **Verify before adopting:** the product's browser-support floor (roughly Chromium 123, Firefox 120, Safari 17.5), and that no Tailwind-registered `@property` computes these at `:root`.
- If it fails, generate the second block in the bundle script rather than writing it by hand.

**Remaining literal copies.** `meta theme-color`, the pre-hydration bootstrap and the icons cannot read CSS. Generate them from one TS constant at build time rather than keeping parity tests (`theme-color-parity.test.ts` header).

### 5.3 Token architecture for v3

- **Primitives:** `--warm-0…975`, `--sage-50…900` (fixed across themes); drop clay and the unused semantic hues until a surface needs them.
- **Paper roles** (carry v2 names where they still fit): `--canvas`, `--surface-*`, `--ink`, `--ink-body`, `--muted-aa` (make it the only caption ink; retire `--muted` as text), `--hairline*`, `--accent` / `--accent-fg` / `--accent-subtle` (sage), `--scrim`, `--shadow-xs…xl` (whisper).
- **World roles (new):** `--on-colour-ink` (white) and `--on-colour-ink-dark` (`#1e1a16`), chosen by tone; `--glass-dark` / `--glass-light` (+ blur and saturate as tokens); `--label-glass`; `--stage-ground`; `--poster-shadow`; `--rail-track`; `--modal-scrim` (+ blur).
- **Test palette** (data → custom properties set on a test scope): `--t-base`, `--t-hi`, `--t-c1`, `--t-c2`, `--t-glow`, `--t-deep`, `--t-tint`, plus the answer colour of the current question.
- **Type:** a paper tier (the v2 ladder, one column) and a display tier (800, tight tracking, clamp-based: question, card title, sheet title, answer text in I). Snap fractional sizes to a ladder.
- **Radius:** 12 / 14 / 16 / 18 / 24 / 28 / pill, one role per step (answers 18; modal and deck card 28; sheets 24; buttons 14–16).
- **Motion, paper register:** 140 / 180 / 280, `--ease-standard`, `--ease-in-out`; the sheet's 260/220 as component constants (README D-18 reasoning).
- **Motion, stage register:** `--vt-dur-enter`, `--vt-dur-exit`, `--vt-dur-flood`, `--vt-ease-out`, `--vt-ease-flood`, spring presets (named ζ and stiffness) with a documented rule for where overshoot is allowed.
- **Reduced motion:** a single policy — opacity only, ≤ 180ms, no loops — plus the stage fallback to D.
- **Materials:** `--grain-size 128px`, grain alpha ceiling, and the field's luminance caps (0.13 where type sits, 0.15 in the window) as documented constants referenced by both the shader and the CSS fallback.

### 5.4 Component styling model

The prototype's shell is already plain global CSS classes (`.vt-*`) driven by a small JS layer, and the Claude Design pane can only render plain CSS. Writing the component **skins** as plain CSS files that React components apply lets Claude Design show the real component instead of a spec copy. That removes the need for `catalog-components.css`-style spec sheets and for `answer-choice-catalog-parity`-style guards.

The trade-off is two styling idioms in one app: Tailwind for page layout, `.vt-*` skins for design-system components. The alternative — Tailwind utilities inside TSX, plus hand-written specimen CSS — is exactly v2's drift. The recommendation is plain-CSS skins, recorded in the rebuild plan for the owner's approval.

### 5.5 Claude Design strategy

**Recommendation: create a new design-system project "VIVE Design System v3". Leave `cd630eec` untouched as the v2 record.**

*Why not rewrite `cd630eec`:*
- The tool contract says "incrementally … never as a wholesale replace", and v3 would replace almost every file.
- `cd630eec` holds 36 files the repository never owned (`SYNC.md:30-36`). Rewriting would either leave them contradicting v3 or require deleting files the repository has never seen.
- The v2 project is the only rendered record of the system the legacy branch implements. `_provenance/` exists precisely because Claude Design's own history was not trusted for rollback.

*Why a new project is cheap:*
- `create_project` exists.
- The project type is fixed as a design system at creation.
- The new project holds exactly the bundle, so `list_files` equals `BUILD.json.files`, and the "two sides are not the same set" problem (§2.6 ⑷) cannot recur.

*Other projects:*
- `ee2fb724` (canvas) and `825385f6` (v1): no change.
- If new canvas artboards are ever wanted, they are Design Artifacts (Artifact tool, `quickstart` intent `design`), not `DesignSync` — the tool says so itself.

*Naming.* "VIVE Design System v3" keeps the family name. The v2 README describes VIVE as "intentionally *not* a kit for one page or one service" (`README.md:3`), while v3 is product-first. The v3 README should say so rather than inherit that sentence.

**What gets pushed (v3 bundle).** Every specimen is a phone viewport (390×844 for full screens, narrower heights for components). Each theme and tone is its own card, so no boxed phones and no `.vt-phone` copy.

| Group | Specimen cards |
|:---|:---|
| Foundations | Paper colours (light, dark) · Test palettes (each test's `LOOK`, field light/dark, derivation of an example test) · Answer colours (curated pairs, 3/4-answer `genSet`, contrast labels) · Tone (dark/light chrome over sample colours) · Type — paper tier · Type — display tier · Radius · Elevation — paper vs poster · Materials (grain, glass, mesh field via CSS fallback) · Motion — paper register · Motion — stage register (replay button; reduced-motion variant) |
| Shell | Top bar (dark tone, light tone, window mode hidden) · Palette rail (y) and story bar (x) at 13% / 50% / 100% · Bottom controls (이전 only, 이전 + 제출, disabled) · Answer tokens (badge, previous mark, votes line, `예시` chip) · Question type (`.vt-q` on colour, `.vt-qlabel` on two colours) · Instruction modal (plain; with consent note; egtt qualifier; accept/deny variants) |
| Share | Share sheet (link-first; story card; done state) · Coach label · Friend's page (ask and art shapes) · 9:16 story card |
| Landing | Deck card (test, coming soon, end card) · Window (card → window → full, as stills) · List rows (test, soon, blog) · GNB (over field, solid) |
| Stages | I (2, 3, 4 answers; mid-drag; bloom still) · J (fork with signs at rest / lean / selected; gate) · D (story card with peeks; lock card; end card) |
| Docs | `README.md` (v3), `SKILL.md` (how to use v3; one line saying the repository owns the definition) |
| Assets | `fonts/PretendardVariable.woff2` (a new project has no copy), motif SVGs if extracted, `BUILD.json` |

**Preview-card requirements, carrying v2's lessons:**
- The `@dsCard group name subtitle viewport` marker is on the first line after the doctype (`SYNC.md:97-103`).
- Cards use `var()` only, except cards whose subject is a literal.
- No card restates a value in text without a `ds-literal` marker, so the check that already exists extends to specimens.
- Every `.vt-*` class has a specimen (carry `design-specimen-coverage`).
- Specimens must not depend on WebGL or canvas to be legible. The prototype already has CSS fallbacks for the field (`l3-deck.html:65-69, 482-489`). Stage pieces drawn on canvas (I's liquid, J's world) are shown as rendered stills, with a link to the live prototype. The pane has not been verified to run WebGL or scripts.
- `.vive`-style scoping with `:where()` defaults and `box-sizing: border-box` (L06).
- Contrast is measured by rendering, skipping `aria-hidden`, and parsing `color(srgb …)` correctly (`SYNC.md:131-134`).
- Complex scripts: the per-character kinetic title (`l3-deck.html:89-90, 113`) splits by character. It must split by grapheme (`Intl.Segmenter`) or Hindi conjuncts break. Add a Hindi (`hi`) and a Russian (`ru`, Cyrillic supplement) specimen.

**Who does what** (recurring owner actions target: 0).

| Step | Actor | Tool / method | Owner actions |
|:---|:---|:---|:---|
| Check the connection on this machine | agent | `list_projects` (the first call may prompt to add design scopes to the claude.ai login) | approve that one prompt if shown; if the call fails for lack of authorisation, run `/design-login` once in an interactive terminal on this machine (a credential flow the agent cannot perform) |
| Record v2's final state for the legacy archive | agent | `get_project cd630eec`, `list_files cd630eec` (optionally `get_file` of remote-only files, ≤ 256 KiB each) | 0 |
| Create v3 | agent | `create_project { name: "VIVE Design System v3" }`, then `get_project` to confirm `PROJECT_TYPE_DESIGN_SYSTEM` | approve the permission prompt once |
| Build the bundle | agent | `node scripts/design/bundle.mjs` → `.design-bundle/` + `BUILD.json`; local Playwright render and contrast gate | 0 |
| Declare the push | agent | `finalize_plan { projectId, writes: [globs], localDir: .design-bundle }` | approve the permission prompt (each push). To make pushes zero-touch, the owner can allow `DesignSync` in `.claude/settings.json` (Ask-First path, owner approval) |
| Write | agent | `write_files` (≤ 256 per call; the font via `localPath`) | 0 |
| Verify | agent | `list_files` set equals `BUILD.json.files`; `get_file BUILD.json` commit equals HEAD; `get_file` of one changed specimen; SVGs compared by drawing, not bytes | 0 |
| Cards missing from the pane | agent | `register_assets` for those paths only (legacy, but it forces the card in) | 0 |
| Later updates | agent | same sequence; files removed from the bundle go in the plan's `deletes` + `delete_files`, then are confirmed absent via `list_files` | approval per push unless allowed |

What no tool reaches: looking at the rendered Design System pane. The local Playwright render of the same HTML stands in for it. `_ds_manifest.json` is derived and lags, so it is not a check.

### 5.6 Guards for v3

| Guard | Keep, adapt or drop | Why |
|:---|:---|:---|
| `design-tokens-dark-parity.test.ts` | **drop** | there is no mirror and no second dark block; if the fallback generator is used, its test is "generated equals rule" |
| `check-design-token-parity.mjs` (in `qa:rules`) | **adapt and move to vitest** | "spec names tokens that exist; no hex; marked literals" is cheap and belongs in `npm test` (memory `vivetest-harness-guards-live-in-vitest.md`, L05) |
| `design-ds-boundary.test.ts` | **adapt** | the allowed direction flips: specimens may load runtime CSS; the runtime must not load `design-system/` |
| `design-specimen-coverage.test.ts` | **keep** | each `.vt-*` class has a specimen |
| `answer-choice-catalog-parity.test.ts` | **drop** | with shared skins there is nothing to keep in parity |
| `theme-color-parity.test.ts`, `brand-assets-parity.test.ts` | **replace** by generation from one constant | literal copies are the cause |
| new: palette invariants | **add** (vitest, math only) | per test: text on base/tint ≥ 4.5:1 for white or ink; type-bearing blob luminance ≤ caps; curated and derived neighbours ≥ 3:1 |
| new: rendered specimen contrast | **add** (Playwright) | closes the gap in `SYNC.md:127-129` / L06 |
| new: bundle integrity | **inside the bundle script** | every bundled CSS file hashes equal to its source |

---

## 6. What depends on the final prototype, and what can be decided now

### 6.1 Decidable now

- The source-of-truth structure (§5.2): one runtime token file, a spec with names only, specimens loading runtime CSS, a generated bundle with `BUILD.json`, no mirrors.
- The Claude Design strategy (§5.5): new project v3, v2 frozen as the record, `ee2fb724` and `825385f6` unchanged.
- The paper layer: the warm ramp and dark remap (unchanged in the prototype), `--muted-aa` as caption ink, whisper shadows, 44px, the wrapping rule.
- Typeface and delivery: Pretendard Variable with v2's 12-locale fallback stack; subset slices + supplement, no preload.
- Bans the owner has already overturned (§4.2): overshoot springs, parallax, a living background, saturated per-test colour, A/B badges, a first-screen colour world instead of the no-hero rule, glass on worlds, dashed lock and soon cards. Bans that stay: drag-to-close, sub-44px dot navigation, emoji and exclamation marks in UI chrome.
- New rules the owner already stated: "white = answer, never a question in white"; the test colour carries from card to stage to start button to share card; palette rail on I/J and story bar on D; the instruction step is a covering modal.
- The palette-as-data *shape* (a per-test record plus a derivation fallback plus contrast invariants), even though its values are pending.
- The guard set (§5.6).
- Legacy disposition: `docs/design/**` goes to the legacy separation, not to new `main` (§7).

### 6.2 Waits on the final prototype (or on an owner decision it defers)

- **J's visual materials.** Direction A — sky from the card mesh plus grain, white answer boards, badge in the base colour (`dialog.md:2376-2380`) — is being implemented and reviewed now. Whether grain and mesh become system-wide materials or landing+J only is decided by the final J.
- **Final `TEST_COLORS` / `LOOK` / curated pair values**, including whether J keeps using `LOOK` fields beyond `base`/`hi`.
- **Shell metrics:** top 56, bottom 72, rail 12 / gap 16 / lane 44, radius-card 28, sheet 24 (`shell.css:6-20`), and the final instruction-modal layout (round 3 moved it; I's final revision adds `거부하고 중단`, `dialog.md:2387`).
- **Stage motion values** (560/260/700, curves, spring presets) after cross-verification.
- **Three- and four-answer layouts:** I has them; D holds 2–4; J is two-answer only (`shell.js:27`).
- **Test → stage assignment.** The owner deferred it: "어떤 테스트에 어떤 무대를 적용할지는 최종 배포 시점에 다시 한번 고민하고 결정하고" (`dialog.md:2121`); and "완성된 후에는 각 테스트 별로 어떤 타입을 적용할지를 사전에 정의하겠습니다." (`dialog.md:2200`).
- **Result page and the post-submit transition.** Out of the prototype's scope; the owner will give feedback later: "마지막 제출 이후 트랜지션은 지금의 형태는 마음에 안드는데, 구체적인 피드백은 테스트 플로우 최종 확정 후, 결과 페이지까지 이어지는 부분의 피드백을 추가로 나중에 제공하겠습니다." (`dialog.md:631`).
- **Surfaces the prototype never drew:** desktop presentation, blog list/detail, history, settings / locale / theme controls, consent banner, 404/error, skip link. Whether v2's paper components (`app-components.css`) are revived for these is open.
- **Share image (9:16) rendering spec** and the friend's page.

---

## 7. Disposition of design artefacts for the legacy/new split

| Item | Disposition | Reason |
|:---|:---|:---|
| `docs/design/design.md` | reference-only (legacy) | its bans are overturned; its authority model is superseded by §5.2 |
| `docs/design/ds/colors_and_type.css` | rewrite (seed) | the warm/sage ramps, dark remap, font stack and `:where()` base carry as values; the three-layer alias structure does not |
| `docs/design/ds/catalog-components.css` | discard from new main (legacy reference) | the card catalog is replaced by deck, window and list |
| `docs/design/ds/app-components.css` | reference-only | sheet, drawer, settings, consent, notice, skip link, page head and empty state may seed surfaces the prototype never drew |
| `docs/design/ds/preview/*` (31) | discard from new main (legacy) | they depict v2 |
| `docs/design/ds/README.md` findings | reference-only | closed history; the measured lessons live in L06/L07/L13 |
| `docs/design/ds/SYNC.md` | rewrite | carry every trap in §2.7 into the v3 procedure |
| `docs/design/ds/SKILL.md` | rewrite | points at remote-only files; v3 needs its own |
| `docs/design/ds/_provenance/` | discard | v2 itself stays intact in Claude Design and on the legacy ref |
| `docs/design/ds/fonts/PretendardVariable.woff2` | carry as-is | needed in the v3 bundle; the new project has no copy |
| `public/fonts/**` (93) + `src/app/fonts.generated.css` + BQ-47 supplement | carry as-is | measured delivery win |
| `docs/design/ds/assets/*.svg`, `public/landing-card-media/**` | reference-only | replaced by per-test motifs |
| `docs/design/resources/**` | reference-only | 2026-05 references |
| `src/app/globals.css` | rewrite | keep `@layer base`, `touch-action: manipulation`, `overscroll-behavior-y` (`:476-516`); drop the mirror |
| Prototype `shared/tokens.css` | discard | a hand copy |
| Prototype `shared/shell.css`, `share.css`, stage `<style>` blocks | rewrite into `src/styles/vt/*` | the source of the v3 component skins |
| Prototype `TEST_COLORS`, `LOOK`, `CURATED`, `genSet`, `legible`, `toneFor` | carry as seed data and algorithms (after final) | palette as data |
| Prototype `proto.css` / `proto.js` | discard | mockup chrome |
| Lessons L06, L07, L13, L40 | carry | each maps to a v3 guard or rule |

---

## 8. Risks and open questions

- **Desktop.** The prototype is a 430px phone column centred on a dark desk (`tokens.css:59-62, 129-133`). The owner reviewed rounds 2 and 3 in "데스크톱 미리보기" of that column. Whether desktop ships as that column or as its own layout is a product decision nobody has made, and it decides whether the type scale needs a viewport axis at all.
- **Light theme of worlds.** Worlds are white-on-colour in both themes by design (`l3-deck.html:26-27`), and only paper follows the theme. The owner reviewed in dark in all three rounds (`dialog.md:386, 1173, 2107`). Light-mode screens of the landing, share and stages should be rendered and shown before the tokens are frozen.
- **`line-height` 1 / 1.05 with Pretendard** (§3.4) contradicts v2's measured clipping finding. Render before adopting.
- **Contrast on moving and glass grounds.** It is guaranteed only by the luminance caps and `legible()`. Glass-label contrast over the I split was not measured in this investigation, and the J review measured ≥ 6.07:1 for questions (`dialog.md:2421`). The v3 gate needs forced-state renders (L13).
- **Claude Design pane capability.** Scripts, canvas and WebGL inside preview cards are unverified; the plan above does not depend on them.
- **The font push.** A new project needs the 2 MB variable font. `write_files` accepts `localPath` binary, but no per-file limit is documented in the schema. Verify on the first push; `get_file` can only confirm a 256 KiB prefix.
- **`light-dark()`** must pass the product's browser floor and Tailwind v4's handling of custom properties. Spike it before committing to it.
- **Palette authoring for new tests.** Curated (by whom?) or derived. Registry rows come from Sheets via `npm run sync`; whether palettes become a sheet column is open.
- **Brand mark.** The v2 sage "sprout" (`resources/assets/vive-*.svg`) does not appear in the prototype, which uses the text wordmark "ViveTest" at 800. Its survival is open.
- **Memory staleness.** `vivetest-claude-design-integration-status.md` says authorisation is done; that was 2026-09-06 and machine-scoped. The first `list_projects` call answers it on whichever machine runs the push.
