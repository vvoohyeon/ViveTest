# Wave 3 — Normal Card Visual Skin · Implementation Plan

> **Task mode: `Plan Only`.** No files modified, no patches, no tests run, no snapshots/baselines generated, no code implemented. This document is the deliverable. Implementation is gated on explicit user approval (see final statement).

---

## 0. Plan Metadata (AGENTS.md §7 — required fields)

| Field | Value |
|---|---|
| **Wave** | Wave 3 — Normal card visual skin (single wave; no range) |
| **Task mode** | `Plan Only` |
| **SSOT contract (§2 routing)** | `docs/req-landing.md §6–11` (landing grid / card) · process governs via `docs/wave-roadmap.md` Wave 3, `docs/decision-register.md`; visual authority `docs/design/design.md` + `docs/design/resources/wave3-normal-card-reference.css` |
| **Files to be modified (implementation, later)** | `src/features/landing/grid/landing-grid-card.tsx` · `src/features/landing/grid/landing-grid-card.module.css` · *(optional, presence-assertions only)* `tests/unit/landing-card-contract.test.ts`, `tests/e2e/grid-smoke.spec.ts` |
| **Reference-only (must NOT modify)** | `docs/decision-register.md`, `docs/wave-roadmap.md`, `docs/rebuild-worktree-setup.md`, `docs/design/**`; `src/app/globals.css` (Ask First — Tailwind token SSOT); `legacy/reference` worktree; all checkpoint worktrees; `DesktopExpandedShell` / `ExpandedTestBody` / `ExpandedBlogBody` regions of the TSX |
| **Preservation contracts (Wave 3 Exclude)** | Expanded skin (W4–6), Blog behavior/`Read more →` (W7–8), Unavailable muted surface/no-op (W9), keyboard/`aria-expanded`/focus-expands/Esc (W11), mobile expanded shape (W13), motion/CSS transitions (W5–6), visual baselines (BQ-07) |
| **Validation gates** | `npm run lint` → `npm run typecheck` → `npm test` → `npm run build`; targeted `tests/e2e/grid-smoke.spec.ts` (`@smoke`) for a11y-focus + slot/tag geometry. **No `qa:visual:full`, no baseline regeneration.** |
| **Logic Improvement gate (BQ-19)** | Wave 3 is a **visual skin** wave (CSS/className only). No business-logic (state/hooks/routing/storage/telemetry/i18n) candidates are proposed. Implementation prompt must carry `Logic Improvement: no candidates approved — preserve existing logic.` |

---

## 1. Context Verification

### 1.1 Workspace and branch guard

| Check | Expected (`docs/rebuild-worktree-setup.md`) | Actual | Result |
|---|---|---|---|
| Active workspace | `/Users/woohyeon/Local/ViveTest` | `/Users/woohyeon/Local/ViveTest` | ✅ match |
| Branch | `main` | `main` | ✅ match |
| Role | Active rebuild implementation workspace | same | ✅ |
| HEAD | setup-time `afe7077…` | `66bc50c` (`wave-2 …`) | ℹ️ **expected advance** — `main` has progressed through Wave 1 (`9ed6d1b`) and Wave 2 (`66bc50c`) since setup; checkpoint worktrees remain pinned at `afe7077…`. Not a topology change. |
| Working tree | — | only `docs/design/` untracked (the visual-spec inputs) | ✅ no source drift |

- Plan targets **local `main`** as the implementation workspace. **No** implementation is planned in `legacy/reference` or any checkpoint worktree.
- **No** branch push / merge / reset / revert / checkpoint manipulation is planned.
- **No blocking workspace/branch issue.** Proceed.

### 1.2 Fixed inputs treated as constraints

Wave 3 Analyses 1–3 (as supplied in the task prompt) are treated as **fixed planning constraints**, not re-derived:
- CSS-only feasible; no new wrappers, no new public `data-slot`, no layout-affecting structure.
- Permitted files limited to the two card files (+ optional presence-only tests).
- Token-leak set: `--card-shadow`, `--chip-bg`, `--landing-card-radius`, `--focus-ring-*`, `--panel-solid`, `--muted-ink` → **Strategy A confirmed** (Normal-scoped wrappers; no direct global mutation).
- All W3-VS candidates were "Conditional pending values"; values are now supplied by `design.md` + `wave3-normal-card-reference.css`.
- Anchored decisions: **W3-VS-10 (`data-tag-count` hook) Rejected**; **aspect-ratio + `object-fit` Rejected (contract-bound)**; **spacing compensation (`normalTagsGap`, base/comp gap) Deferred**.
- Cross-variant: Test/Blog/Unavailable Normal share one `NormalCardFace` path; `UnavailableCardStatusOverlay` sits `z-[2]`, `pointer-events:none` → root-level skin only; Blog tag row must stay open-form (Wave 8); `expandedTitleOnly` + `.desktopOverlayLayer` must not receive full Normal surface; `normalTitleRef`/`normalSubtitleRef` measurement must stay non-breaking; `:hover`/`:focus-visible`/`:has(:focus-visible)` permitted for **visual-only** changes; focus-expands/Esc/aria are Wave 11.

### 1.3 Inherited stop conditions

None inherited from prior analysis. Wave 2 ("Normal structural order verification + Wave 3 readiness") is complete on `main`; the Wave 2 plan (`docs/plans/2026-05-29-wave-2-normal-seam-ownership.md`) and `docs/plans/Wave 3 Handoff.md` confirm `NormalCardFace` owns all four Normal slots through `collapsed` / `expandedTitleOnly` modes and is **visual-ready**. No structural defect blocks Wave 3.

---

## 2. Visual Spec Interpretation

How `design.md` and `wave3-normal-card-reference.css` map to each Wave 3 **Include target**, and where the two sources (or the codebase contract) conflict.

### 2.1 Current state baseline (evidence)

The Normal resting skin is expressed as **inline Tailwind arbitrary utilities** inside the TSX constant strings (not in the module CSS, not in `globals.css`):

| Element | Current (TSX constant) | Key values |
|---|---|---|
| Root resting visual | `landing-grid-card.tsx:907` | `background: color-mix(--panel-solid 90%)`, `box-shadow: var(--card-shadow)` (heavy `0 14px 30px /10%`), **no border** |
| Root radius | `LANDING_GRID_CARD_ROOT_CLASSNAME` (`:205`) | `rounded-[var(--landing-card-radius)]`, `--landing-card-radius:16px` |
| Focus ring | module `.root:has(:focus-visible)` (`module.css:1–6`) | box-shadow double ring from `--focus-ring-outer/inner` (blue) + `--card-shadow` |
| Thumbnail slot | `LANDING_GRID_CARD_THUMBNAIL_SLOT_CLASSNAME` (`:214`) | `aspect-[6/1]`, `rounded-[10px]`, `bg-[color-mix(--chip-bg 85%)]`; `<Image … object-cover>` (`:371`) |
| Tag chip | `LANDING_GRID_CARD_TAG_CHIP_CLASSNAME` (`:221`) | `rounded-full`, `border-transparent`, `bg-[var(--chip-bg)]` (cool grey), `px-2.5 py-1` (4×10), `text-[0.74rem]` (~11.8px) |
| Tag row | `LANDING_GRID_CARD_TAGS_CLASSNAME` (`:216`) | `min-h-7` (28px), `gap-1.5` (6px), `data-tag-count` on `<ul>` (`:401`) |

Global token reality (`globals.css`): the live theme is **cool/blue + heavy shadow** — `--accent-solid:#2f73ff`, `--card-shadow:0 14px 30px rgb(11 15 22 /10%)`, `--chip-bg:rgb(22 26 32 /6%)`, `--focus-ring-outer: accent 72%` (blue), `--panel-solid:#ffffff`.

### 2.2 Target language (design authority)

`design.md` mandates a **warm + sage + whisper-shadow** language: `--canvas:#FBFAF7`, card fill `--canvas-elevated:#FFFFFF`, `--ink:#1A1A1F`, `--sage/--focus-ring:#5C8E78`, `--shadow-rest:0 1px 2px rgba(26,26,31,0.04)`, `--tag-bg:#F0ECE2`, `--tag-fg:#4A4A55`, radii `lg 16 / md 12 / xs 5`. The reference CSS realizes the same values.

**Interpretation:** Wave 3 re-skins **only the collapsed Normal face** from the cool/heavy language to the warm/sage/light language, via Normal-scoped tokens. The page canvas (`--bg`) is **not** in scope (theme = Wave 16), and expanded/mobile/answer styling stays on the existing global tokens (expanded skin = Wave 4–6). A transient intra-build mismatch (sage Normal face vs still-blue expanded surface) is expected and correct for this wave order.

### 2.3 Include-target mapping

| Include target | design.md | reference.css | Resolution |
|---|---|---|---|
| Resting border | §6.1 `1px solid transparent` (reserves layout) | `.vive-card` §2 same | Add `border:1px solid transparent` to collapsed Normal surface |
| Hover border + surface | §6.2 **Test = none** ("expansion is the hover response", Never-Include §10); §6.3 **Blog = sage border + glow** | `.vive-card--test:hover` no-op; `.vive-card--blog:hover` sage+glow | Test: **no-op (preserve absence)**; Blog: **Defer** (Wave 7/8 — see §4 VS-02) |
| Focus-visible ring | §6.2 "2px sage ring, 2px offset" | §9 `outline:2px solid; outline-offset:2px` | Re-skin collapsed focus ring to sage `outline` |
| Resting shadow | §4.3 `--shadow-rest:0 1px 2px rgba(26,26,31,0.04)` | `--vive-shadow-rest` same | Replace heavy `--card-shadow` with Normal-scoped whisper shadow |
| Card radius | §4.4 `--radius-lg:16px` | `--vive-radius-card:16px` | **Already 16px** — confirm, no edit |
| Thumbnail treatment | §7.1 radius `--radius-md:12px`, `aspect 16/6`, cover | radius 12px; **aspect "reference only, not mandatory"** | radius 10→12; **keep `aspect-[6/1]` + `object-cover` (contract-bound)** |
| Tags compact + chip | §7.4 radius 5px, bg `#F0ECE2`, fg `#4A4A55`, 13px/500, pad 4×9 | `.vive-tag` same; row `gap:8px` | Re-skin chip; keep transparent border + `min-h-7` reserve |

### 2.4 Declared conflicts (stated, not silently assumed)

1. **Thumbnail aspect ratio — design vs contract (PRIMARY conflict).** `design.md §6.2/§7.1` says `aspect-ratio: 16/6` (≈2.667:1, a taller letterbox). The codebase renders `aspect-[6/1]` (=6:1, short/wide), and `grid-smoke.spec.ts:823–827` asserts thumbnail `clientWidth/clientHeight ∈ (5.5, 6.5)`. **Resolution:** keep `6/1`. Justification: (a) the task's fixed inputs classify aspect-ratio change as **Rejected — contract-bound**; (b) `wave3-normal-card-reference.css:52` explicitly marks `aspect-ratio: 16/6` as *"realized proportion … reference only, not mandatory"*; (c) changing it would break an existing green E2E contract with no Wave-3 authority to rewrite it. The `16/6` mockup proportion is therefore **aspirational/non-binding** for Wave 3 and is logged as a future reconciliation item (would need a contract+test decision outside Wave 3).
2. **Focus ring mechanism — `outline` vs `box-shadow`.** Design/reference express the ring as `outline:2px + offset:2px`; the codebase implements it as a composed `box-shadow` double-ring (`module.css:1`). **Resolution:** adopt the design's `outline` form for the collapsed Normal focus state (origin-redesign fidelity, simpler, leaves the resting `box-shadow` shadow intact). This is a same-intent mechanism swap, not a behavior change.
3. **Card resting surface — `#FFFFFF` vs `color-mix(--panel-solid 90%)`.** Design wants pure elevated white; current is white@90% over the page. **Resolution:** treat as **Conditional/minor** (≈imperceptible on a near-white canvas) — see §4 VS-06.
4. **Test card "hover border".** The Wave 3 Include phrase "hover border and surface" reads as generic, but `design.md` is explicit that the **Test** Normal card has *no* hover visual. **Resolution:** the only Normal-face card with a hover surface in the spec is **Blog**, which is Wave 7/8-coupled → the hover-border candidate is **Deferred**, and Test's no-hover state is **preserved** (already compliant). See §4 VS-02 and §8 Decisions.

No other `design.md` ↔ `reference.css` value conflicts found (border/shadow/radii/tag values agree across both).

---

## 3. Token Strategy

**Principle (Strategy A, confirmed):** introduce **Normal-scoped tokens** that hold the literal `design.md` values, **consumed only by collapsed Normal-face selectors**. Do **not** mutate any shared global token. Verified necessity — each leak token is consumed outside the Normal face:

| Global token | Also consumed by (evidence) | ∴ direct mutation unsafe |
|---|---|---|
| `--card-shadow` | `history/page.tsx:23`, `test-question-client.tsx:38`, `blog-destination-client.tsx:26`, module focus rule | ✅ |
| `--panel-solid` | GNB, consent banner, test/blog/history/error, instruction overlay | ✅ |
| `--muted-ink` | not-found, page, history, GNB, test, blog | ✅ |
| `--focus-ring-outer/inner` | GNB, settings, consent, test panel/qualifier/question, instruction | ✅ |
| `--chip-bg` | landing card only — but still wrapped (Strategy A is unconditional this wave) | ✅ |
| `--landing-card-radius` | landing card normal **and** expanded surface/mobile | n/a — value unchanged (16px), reused as-is |

### 3.1 Normal-scoped tokens to introduce

Declared in **`landing-grid-card.module.css`** on `.root` (idiomatic — the card already declares card-level CSS vars on its root className), **consumed only** by collapsed Normal-face element styles. Expanded/`.desktopOverlayLayer` selectors keep the existing global/expanded tokens untouched (guard in §5).

| Token | Value (design.md) | Consumed by | Replaces |
|---|---|---|---|
| `--normal-card-border` | `transparent` | resting border on collapsed surface | (new — none today) |
| `--normal-card-shadow` | `0 1px 2px rgb(26 26 31 / 4%)` | collapsed root resting `box-shadow` | inline `var(--card-shadow)` (`:907`) |
| `--normal-focus-ring` | `#5C8E78` | collapsed `.root:has(:focus-visible)` outline | `--focus-ring-outer/inner` in module focus rule |
| `--normal-thumb-radius` | `12px` | thumbnail slot radius | `rounded-[10px]` (`:214`) |
| `--normal-tag-bg` | `#F0ECE2` | tag chip background | `var(--chip-bg)` in chip (`:221`) |
| `--normal-tag-ink` | `#4A4A55` | tag chip text color | (chip inherits today) |
| `--normal-tag-radius` | `5px` | tag chip radius | `rounded-full` (`:221`) |
| `--normal-card-surface` *(conditional)* | `#FFFFFF` | collapsed root background | `color-mix(--panel-solid 90%)` — only if VS-06 approved |

Card radius (`--radius-lg 16px`) needs **no token** — `--landing-card-radius:16px` already equals it and is reused.

### 3.2 Shared tokens consumed directly (justified, unchanged)

| Shared token | Why direct consumption is acceptable in Normal scope |
|---|---|
| `--panel-solid` | Card fill base; design `--canvas-elevated` = `#FFFFFF` = current `--panel-solid`. Kept unless VS-06 promotes to a Normal token. No mutation. |
| `--landing-card-radius` | 16px already matches design; reused for resting border-radius and (separately) expanded — no change. |
| `--muted-ink` | Subtitle color; subtitle **typography is out of Wave 3 scope** — consumed as-is, untouched. |

---

## 4. Candidate Resolution (W3-VS-01 … W3-VS-12)

> **Provenance note (flagged ambiguity).** The repository materializes the Analysis-2 candidate IDs only for **W3-VS-01** (border resting) and **W3-VS-02** (border hover) in `docs/plans/Wave 3 Handoff.md`, plus **W3-VS-10** (`data-tag-count`) via this task's fixed inputs. IDs **03–09, 11, 12** are **derived here** from the Handoff skin-target enumeration (`border-resting / border-hover / border-focus / shadow / radius / thumbnail-treatment / tags-compact / hover-focus-ring`) + the fixed-input anchors. If the original Analysis-2 numbering differs, only the **labels↔IDs** shift — the resolutions per *target* stand. This numbering is an explicit assumption for user confirmation (§8).

| ID | Target | Resolved approach | Recommend | Pre-condition now resolved by spec |
|---|---|---|---|---|
| **W3-VS-01** | Resting border | Add `border:1px solid transparent` (`--normal-card-border`) to the collapsed Normal surface; reserves layout for future colored borders without shift. | **Approve** | `design.md §6.1` confirms `1px solid transparent`. |
| **W3-VS-02** | Hover border + surface | **Test:** preserve *no* hover visual (already compliant; `design.md §6.2/§10`). **Blog:** sage border + glow is the navigability cue — but Blog still **expands on desktop** (Wave 7 not done) and Blog active-visual is Wave 8. | **Defer** (Blog → W7/8); **no-op/preserve** (Test) | Spec value known (sage border + `0 0 0 3px focus-ring-soft, 0 8px 24px`), but **behavioral pre-condition (Blog non-expand) not yet met** → cannot land in W3. |
| **W3-VS-03** | Focus-visible ring | Re-skin collapsed `.root:has(:focus-visible)` to `outline:2px solid var(--normal-focus-ring); outline-offset:2px`. Leave `.desktopOverlayLayer:has(:focus-visible)` rules untouched. | **Approve** | `design.md §6.2` + `reference §9` supply sage 2px / offset 2px. |
| **W3-VS-04** | Resting shadow | Consume `--normal-card-shadow` (whisper) in the collapsed root visual instead of `--card-shadow`. | **Approve** | `design.md §4.3 --shadow-rest`. |
| **W3-VS-05** | Card border-radius | Confirm 16px (`--landing-card-radius`) = `--radius-lg`. **No edit.** | **Approve (no-op)** | `design.md §4.4` = current value. |
| **W3-VS-06** | Resting surface | Optional `--normal-card-surface:#FFFFFF` (pure elevated white) vs keep `color-mix(--panel-solid 90%)`. Low perceptual delta; broad-token-free. | **Conditional** (recommend keep; promote only if reviewer wants exact `#FFFFFF`) | `design.md §6.1 --canvas-elevated`. |
| **W3-VS-07** | Thumbnail radius | `rounded-[10px]` → `rounded-[var(--normal-thumb-radius)]` = 12px. | **Approve** | `design.md §7.1 --radius-md:12px`. |
| **W3-VS-08** | Thumbnail aspect / `object-fit` | Keep `aspect-[6/1]` + `object-cover`. | **Reject** (contract-bound) | Fixed input = Rejected; `reference:52` marks 16/6 non-mandatory; `grid-smoke:823` asserts ratio. |
| **W3-VS-09** | Tags chip style | radius `full→5px` (`--normal-tag-radius`), bg `--chip-bg→--normal-tag-bg` (#F0ECE2), color `→--normal-tag-ink` (#4A4A55), font `0.74rem→13px`/500, padding `4×10→4×9`. **Keep** transparent border + `nowrap`/ellipsis. | **Approve** | `design.md §7.4` + `reference §5` supply all values. |
| **W3-VS-10** | `data-tag-count` CSS hook | Do **not** author any selector keyed on `[data-tag-count]`. Attribute remains as DOM/QA anchor only. | **Reject** | Fixed input = Rejected; preserves Wave 8 tag-row extensibility. |
| **W3-VS-11** | Tags row layout | **Keep** `min-h-7` (28px reserve — `grid-smoke:818` contract) and the `normalTagsGap` slot (Deferred spacing). Only horizontal chip gap `gap-1.5→gap-2` (6→8px) as compact polish. | **Approve (gap only)**; **Defer** vertical/`normalTagsGap`/base-comp gap | `design.md §4.5` tags gap 8px; fixed input defers spacing compensation. |
| **W3-VS-12** | Thumbnail fallback palette | Recolor generated fallback SVG (`createThumbnailFallbackDataUri`, `:165–170`) from blue/teal to warm/sage. Design-aligned but is imagery/content, not core CSS skin; keeps `^data:image/svg+xml,` contract. | **Defer** (optional follow-up) | `design.md §7.1` imagery vibe; low Wave-3 value. |

**Net Wave-3 actionable set:** Approve VS-01, VS-03, VS-04, VS-05(no-op), VS-07, VS-09, VS-11(gap). Conditional VS-06. Reject VS-08, VS-10. Defer VS-02, VS-11(spacing), VS-12.

---

## 5. Implementation Sequence (for the future, approved implementation step)

Ordered to land tokens first, then consumers, with the overlay guard before any `.root`-level change.

1. **Declare Normal-scoped tokens** in `landing-grid-card.module.css` on `.root` (§3.1). Pure additions; no consumer yet → zero visual change. *(Dependency root for all following steps.)*
2. **`.desktopOverlayLayer` / `expandedTitleOnly` guard (place BEFORE root-visual edits).** Confirm and preserve: the resting visual className branch at `landing-grid-card.tsx:901–907` already emits `[background:transparent] [box-shadow:none]` when `showDesktopExpandedShell` (overlay) — Normal skin (border/shadow/surface) must attach **only** to the collapsed branch (the `else` resting branch), never to the overlay branch; and the `presentation==='expandedTitleOnly'` title-only render must not gain a Normal surface. Likewise, module focus changes touch **only** the base `.root:has(:focus-visible)` rule, leaving `.root.desktopOverlayLayer:has(:focus-visible)` (`module.css:9–18`) untouched. *(Guards Analysis-3 stop conditions; must precede steps 3–4.)*
3. **Resting shadow + border (VS-04, VS-01)** — in the collapsed resting branch (`:907`), swap `var(--card-shadow)` → `var(--normal-card-shadow)` and add `border:1px solid var(--normal-card-border)`. *(Depends on 1, 2.)*
4. **Focus ring (VS-03)** — rewrite the base `.root:has(:focus-visible)` rule to the sage `outline` form. *(Depends on 1, 2; isolated from overlay focus rule.)*
5. **Thumbnail radius (VS-07)** — `rounded-[10px]` → `rounded-[var(--normal-thumb-radius)]` in `LANDING_GRID_CARD_THUMBNAIL_SLOT_CLASSNAME`. **Do not** touch `aspect-[6/1]` or `object-cover` (VS-08 Reject). *(Depends on 1.)*
6. **Tags chip + row (VS-09, VS-11 gap)** — restyle `LANDING_GRID_CARD_TAG_CHIP_CLASSNAME` (radius/bg/ink/font/padding) keeping `border-transparent` + `nowrap`/ellipsis; bump row `gap-1.5→gap-2`. Keep `min-h-7` and `data-tag-count` (no CSS hook). *(Depends on 1; keep tag row open-form for Wave 8.)*
7. **(Conditional) Resting surface (VS-06)** — only if approved, introduce `--normal-card-surface:#FFFFFF` and consume in the collapsed branch. *(Depends on 1, 2.)*
8. **Self-verify against preserved contracts** (slot order, empty-tags 28px, thumbnail ratio, tag border alpha, focus visibility) by reading the relevant tests — then run validation gates (§6).

No step adds a wrapper, a `data-slot`, a transition, or touches `DesktopExpandedShell`/`ExpandedTestBody`/`ExpandedBlogBody`, the trigger/content layout, `normalTitleRef`/`normalSubtitleRef`, or `globals.css`.

---

## 6. Test Impact

**No visual baseline generation. No `qa:visual:full`. No snapshot updates.** (BQ-07.)

### 6.1 Existing contracts that must stay green (no change expected)

- `tests/unit/landing-card-contract.test.ts` — Normal slot order `thumbnail→title→subtitle→tags`, empty-tags container, `landing-grid-card-tags-gap` present, thumbnail src resolution. *(Skin changes don't alter DOM/slots.)*
- `tests/e2e/grid-smoke.spec.ts` — `min-height:28px` on tags (`:818`), thumbnail ratio 5.5–6.5 (`:823` — protected by VS-08 Reject), **tag border alpha ≤ 0.05** (`:466` — protected by keeping `border-transparent`), subtitle/title clamp, focus/expand smokes.

### 6.2 Permitted optional assertions (presence only — never visual values)

If the reviewer wants Wave-3 hooks pinned, add **class/attribute-presence** assertions only, e.g.: tag chip carries the (new) compact class; thumbnail slot exposes the 12px-radius class hook; collapsed card exposes the resting-border hook. **Disallowed:** asserting computed colors, shadow strings, sage hex, or pixel radii as baselines.

### 6.3 Gate commands (§5 AGENTS.md)

`npm run lint` → `npm run typecheck` → `npm test` → `npm run build`, then targeted `npx playwright test tests/e2e/grid-smoke.spec.ts` (a11y-focus + slot/tag geometry). High-Risk Playwright E2E note (AGENTS.md §4): Wave 3 touches `landing-grid-card.*` (not the High-Risk controller/hook files), so grid-smoke `@smoke` coverage is the appropriate regression surface; **dimension at risk = design-system consistency + a11y (focus visibility)**.

---

## 7. Stop Conditions

Implementation must **halt and report** if any becomes necessary:

- Editing any file outside `landing-grid-card.tsx` / `landing-grid-card.module.css` / the two optional test files (esp. `globals.css`, expanded/blog/test components).
- Mutating any shared global token directly instead of via a Normal-scoped wrapper.
- Adding a new public `data-slot`, a layout-affecting wrapper, or a `[data-tag-count]` CSS hook.
- Any change to Blog behavior / `Read more →` (W8), Unavailable surface/no-op (W9), keyboard / `aria-expanded` / focus-expands / Esc / `tabIndex` (W11), mobile expanded (W13).
- Touching `DesktopExpandedShell`, `ExpandedTestBody`, `ExpandedBlogBody`, or applying Normal surface to `.desktopOverlayLayer` / `expandedTitleOnly`.
- Altering `normalTitleRef` / `normalSubtitleRef` measurement behavior (e.g., title/subtitle typography that shifts computed metrics).
- Introducing any motion / CSS transition, or generating a visual baseline.
- Needing to change the thumbnail aspect-ratio / `object-fit` to satisfy the mockup (contract-bound — escalate instead).
- Any spec ambiguity beyond those resolved in §2.4 / §8.

---

## 8. Decisions Requiring User Confirmation (before implementation)

1. **W3-VS-02 hover border → Defer.** Confirm that the Blog sage hover border + glow is deferred to Wave 7/8 (rationale: Blog still expands on desktop pre-Wave-7; Blog active-visual is Wave 8), and that the Test card's no-hover state is preserved. *(Default in this plan: Defer.)*
2. **Candidate numbering provenance (§4).** Confirm the derived W3-VS-03…09/11/12 ID↔target mapping, since the repo anchors only 01/02/10.
3. **W3-VS-06 resting surface.** Keep `color-mix(--panel-solid 90%)` (default) or promote to exact `#FFFFFF` via `--normal-card-surface`.
4. **Thumbnail aspect ratio (§2.4 #1).** Confirm keeping `6/1` (contract-bound) and logging `16/6` as a separate future reconciliation — i.e., Wave 3 will *not* match the mockup's thumbnail height.

---

## Impact Assessment (AGENTS.md §7)

- **Shared components (shell / GNB):** none — change is card-internal; no `page-shell`, `site-gnb`, or `globals.css` edits.
- **Localization:** none — no copy/messages touched; tag/label text unchanged.
- **a11y:** focus-visible ring re-skinned to sage `outline` (kept visible, parity preserved); `tabIndex`/`aria`/`inert`/focus-expands untouched (Wave 11). Net a11y neutral-to-positive.
- **State contracts:** none — no state/hooks/routing/storage/telemetry/i18n changes (BQ-19: no logic candidates).
- **Core user flow:** none — expansion, navigation, and interaction modes unchanged; visual-only resting skin.

---

```
No implementation has been performed. This plan requires user approval
before any file is modified.
```
