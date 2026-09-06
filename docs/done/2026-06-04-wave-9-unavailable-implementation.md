# Wave 9 — Unavailable Behavior & Visual · Implementation PLAN (BQ-19 Step 2)

> **Task mode (this document):** Plan Only. No source/test/CSS/fixture/generated/doc/branch
> changes were made while authoring this plan. The deliverable is this file only.
> **Task mode it authorizes (after approval):** Implementation.
> **Date:** 2026-06-04 · **Wave:** 9 (no roadmap renumbering).
> **Authorization (BQ-19 Step 2):** `Logic Improvement: [W9-LI-01, W9-LI-03, W9-LI-04, W9-LI-05]
> approved — apply per analysis report 2026-06-04 + user decisions D1–D3 (2026-06-04). W9-LI-02
> satisfied by D2.`
> **Basis:** `docs/plans/2026-06-04-wave-9-unavailable-analysis.md` (BQ-19 Step 1) + user
> decisions **D1–D3** (which OVERRIDE the report where they conflict) + **BQ-26** (decision-register).

---

## 0. Read-this-first — discrepancies between the Step-2 prompt and the actual repo

These were found by reading the live repo. They do **not** block the plan, but they change what the
implementation must (and must not) do. Each is reconciled below and flagged again where relevant.

| # | Prompt says | Actual repo state | Resolution in this plan |
|---|---|---|---|
| 0.1 | "`docs/decision-register.md` (add BQ-25)"; "route the override through the BQ-25 record" | **BQ-25 already exists** = the Expanded choice-arrow glyph deferral (unrelated). **BQ-26 already exists and already records D1–D3 verbatim**, including the keep-focusable supersede. It is present but **uncommitted** (`git diff docs/decision-register.md`). | The override is **already logged in BQ-26**, not BQ-25. The implementation must **not** add a new decision row. The decision-register ancillary step is therefore **already satisfied**; the only open action is to commit it with the rest of the change set. See §8.1. |
| 0.2 | "`docs/wave-roadmap.md` (correct Wave 9 Include line)" | The Wave 9 **Include line is already corrected** (uncommitted): it already reads `--surface-soft` surface + standard coming-soon tag in tags-row (always visible, no dashed pill, no dot) + subtle thumbnail dim (0.72) + full-opacity title/subtitle + `tabIndex=-1`/keyboard-skipped. | Implementation must **not** re-edit the Include line. It only sets Wave 9 **Status → ✅ 완료** and appends the 구현 결과 / Files changed / Validation block after gates pass. See §8.4. |
| 0.3 | State file is `src/features/landing/grid/interaction-state.ts` | The file lives at **`src/features/landing/model/interaction-state.ts`** (re-exported via `src/features/landing/model/index.ts`). There is no `grid/interaction-state.ts`. | All references in this plan use the real `model/` path. See §2 group B. |
| 0.4 | The state change is "`resolveCardTabIndex` returns `-1` for unavailable … Confirm interaction with `isKeyboardModeBlocked` and `use-keyboard-handoff`." | `resolveCardTabIndex(state, cardVariant)` takes **no enterability argument**, and the keyboard **handoff actively focuses the unavailable card programmatically** (proven by `state-smoke.spec.ts:293-318`). A `tabIndex=-1` alone does **not** keep it "keyboard-skipped in all states" — `.focus()` still works on a `tabIndex=-1` button. | D1 requires **two** changes: (a) a `resolveCardTabIndex` signature/logic change, and (b) a **keyboard-handoff skip** so Tab-out of an expanded card lands on the next *enterable* card. (b) touches `use-card-keyboard-handler.ts`/`interaction-dom.ts` — **not** in the prompt's file list but **required** by D1 and by the prompt's own test bullet ("unavailable skipped; collapse-prior intact"). Flagged as **Decision E1** (§5) because it widens the change surface into the High-Risk keyboard cluster. See §2 group B + §4 (a11y). |
| 0.5 | File list omits any QA script | **`scripts/qa/check-phase5-card-contracts.mjs` (Ask-First)** hard-greps for the literal test titles `normal card slot order and unavailable overlay contract` and `unavailable overlay is always visible in tap mode`. It is executed by the `#landing` gate. Renaming those tests (overlay → coming-soon tag) will make this script **fail**. | Add `check-phase5-card-contracts.mjs` to the change set (Ask-First). Update its two grep patterns to the new titles. See §2 group E + §3. |
| 0.6 | "`req-landing.md` (§7.x/§9.2 … §13.2)" | §9.2:655–656 currently says **prefer native `disabled`**, `aria-disabled` *only* when focus is allowed. D1 removes keyboard focus yet keeps `aria-disabled` + `<button>`. §9.3 ("Overlay Readability") and §7.5:437 / §9.3:664,667 still describe the **removed overlay**. | The §9.2 rule must be reworded (button + `aria-disabled` + `tabIndex=-1`, *not* native `disabled`, with the a11y-tree rationale). §9.3 is stale too and should be synced even though the prompt did not name it (flagged **Decision E5**). See §2 group F + §8.2. |
| 0.7 | Analysis preservation list says "public `data-slot` names (incl. `unavailableOverlay`) must NOT change." | D2 **removes** `data-slot="unavailableOverlay"`. | BQ-26/D2 (decision-register, top precedence) **supersedes** that preservation note. Removal is authorized and logged in BQ-26. All four test references + the QA script are updated accordingly. Called out explicitly in §6 (Preservation contracts). |
| 0.8 | "regenerate `variant-registry.generated.ts` via the actual generation command (verify it in `package.json`)" | There is **no `package.json` script** that regenerates the registry. The mechanism is the standalone `scripts/sync/regenerate-variant-registry-from-fixture.ts` (run via vite-node). `npm run sync` runs `sync.ts` (Sheets sync), which is a different thing. | Exact command: `npx vite-node -c ./vitest.config.ts scripts/sync/regenerate-variant-registry-from-fixture.ts`. The generated file is **never hand-edited**. See §2 group C + §7. |

---

## 1. Wave / range / mode (Rebuild field)

- **Wave:** 9 — "Unavailable behavior and visual." No roadmap renumbering. Risk: Medium per
  roadmap; this plan **escalates the keyboard/a11y portion to High-Risk** (see §4, §6).
- **Prerequisites (met):** Waves 2–3 complete; BQ-19 Analysis gate cleared (Step-1 report exists);
  Step-2 authorization line present (header).
- **Execution mode after approval:** Implementation, one unit at a time, gate before advancing.

### 1.1 Decision basis (D1–D3 + BQ-26)

- **D1 (W9-LI-05 · behavior/a11y):** the unavailable card is **removed from the tab order**
  (`tabIndex=-1`, keyboard-skipped) in **all** states, while keeping the semantic `<button>`
  (no `role` override). This **supersedes** the Step-1 report's keep-focusable recommendation —
  an approved change under BQ-20, **not** a contract violation, logged in **BQ-26**. It makes
  design.md §4.10/§7.5 "removed from the tab order" factually accurate (so design.md tab-order
  wording needs **no** correction). Tab removal does **not** remove the card from the a11y/reading
  tree.
- **D2 (W9-LI-03 + W9-LI-04b · visual):** remove the legacy top-right dark overlay pill; realize
  design.md §7.5 — a **standard coming-soon tag in the tags row, always visible** + `--surface-soft`
  surface + **subtle thumbnail dim 0.72** + **full-opacity title/subtitle** (no whole-card opacity).
  The surface dim + the tag carry the signal; no separate overlay. **W9-LI-02 (AT exposure) is
  satisfied by D2** because the tags-row tag is real text (not an `aria-hidden` overlay).
- **D3 (fixture + AT):** production titles drop "(Soon)"/"(곧 공개)"; the unavailable signal is the
  tag + dim only, never a title suffix.

### 1.2 Visual authority & precedence (BQ-21)

Visual SSOT = `docs/design/design.md` §7.5 (+ §5 tokens, §4.10, §6.3, §10). Behavior / a11y / scope /
storage / telemetry / routing / i18n come from `req-landing.md` / `req-test.md` /
`decision-register.md` / `project-rules.md`. Conflict order: **decision-register > product
requirements > design.md > resources > existing implementation > wave-specific CSS.** No new
per-wave CSS extraction (BQ-21); §7.5 is realized with scoped `--unavailable-*` tokens in
`module.css` whose **values equal** the design.md §5 semantic tokens (the W3/W5/W8 "Strategy A"
pattern). No `globals.css` change (Wave 16 / BQ-04).

---

## 2. All files to be modified (Rebuild field: full change set, grouped)

> Legend — **[AF]** Ask-First (AGENTS §4) · **[GEN]** generated, never hand-edited · **[HR]**
> High-Risk-cluster behavior · **[A]** Always-modify-freely.

### Group A — Landing render / markup / CSS (visual: D2)

**A1. `src/features/landing/grid/landing-grid-card.tsx`** [A]
- **Remove the overlay entirely:**
  - Delete the `UnavailableCardStatusOverlay` component (`:714-727`).
  - Delete its props interface `UnavailableCardStatusOverlayProps` (`:539-542`).
  - Delete the two class constants `LANDING_GRID_CARD_UNAVAILABLE_OVERLAY_BASE_CLASSNAME` (`:283-284`)
    and `LANDING_GRID_CARD_UNAVAILABLE_BADGE_CLASSNAME` (`:285-286`).
  - Delete the render site `{isUnavailable ? <UnavailableCardStatusOverlay … /> : null}` (`:1158-1160`).
  - This deletes the public slot `data-slot="unavailableOverlay"` (authorized by BQ-26/D2 — see §6).
- **Render the coming-soon indicator as a standard tag in the tags row** (mirror the W8
  `readMoreLabel` threading exactly):
  - Add optional `comingSoonLabel?: string` to `NormalCardTagRowProps` (`:330-335`) and
    `NormalCardFaceProps` (`:296-…`), threaded `NormalCardFace` → `NormalCardTagRow`.
  - In `NormalCardTagRow`, when `comingSoonLabel` is present, render it as a **leading**
    `<li class={LANDING_GRID_CARD_TAG_ITEM_CLASSNAME}><span class={LANDING_GRID_CARD_TAG_CHIP_CLASSNAME}>{comingSoonLabel}</span></li>`
    inside the existing `tags` `<ul>` (which already carries `aria-label="Card tags"` and is **not**
    `aria-hidden`). The existing `LANDING_GRID_CARD_TAG_CHIP_CLASSNAME` already realizes design.md
    §6.3/§7.5: `--normal-tag-radius` 5px (= `--radius-xs`), `--normal-tag-bg` `#f0ece2` (= `--tag-bg`),
    `--normal-tag-ink` `#4a4a55` (= `--tag-fg`), 13px/500, no border, no dot, no `rounded-full`. So
    "restyle the indicator as a standard tag" = **reuse the standard chip** — no new tag CSS needed.
  - In `triggerContent` (`:949-963`), pass `comingSoonLabel={isUnavailable ? copy.comingSoon : undefined}`
    to `NormalCardFace`. (`copy.comingSoon` is already threaded from `landing-catalog-grid.tsx` →
    falls back to `getDefaultCardCopy().comingSoon = 'Coming soon'`.)
  - **Always visible:** because it is a normal chip with no opacity gating, it shows in **both**
    hover and tap modes by default — satisfying D2 "always visible" and replacing the old
    hover/tap opacity gate. No `interactionMode` gating on this tag.
- **Surface + thumbnail dim:** add `isUnavailable && styles.unavailableCard` to
  `resolvedRootClassName` (`:910-926`), and stop routing unavailable through the normal-background
  arm of `resolvedRootVisualClassName` (`:903-909`) — give unavailable a branch that omits the
  normal background/shadow so the scoped `.root.unavailableCard` surface (A2) is the authority.
  (Specificity note: a CSS-module `.root.unavailableCard` rule (0,2,0) outranks Tailwind arbitrary
  `[background:…]` (0,1,0); either approach works, but the explicit branch is more traceable and is
  the recommended path.)
- **Unchanged:** the non-blog branch stays a `<button type="button" … aria-disabled … tabIndex … >`
  (`:1059-1075`); `resolvedState` still forces `expanded → normal` for unavailable (`:863`); no
  Expanded/mobile/transient shell for unavailable (`:865-870`); `data-card-attribute`,
  `data-card-availability`, `inert={keyboardModeBlocked}`, `aria-disabled` wiring all preserved.

**A2. `src/features/landing/grid/landing-grid-card.module.css`** [A]
- Add to `.root` (alongside the existing `--normal-*` block), scoped values **equal to design.md §5**:
  ```css
  /* Wave 9 unavailable-card skin (design.md §7.5). Strategy A: values = design.md §5 semantic
     tokens; scoped here until Wave 16 global migration. */
  --unavailable-surface: #f4f1ea;     /* = design.md §5.2 --surface-soft */
  --unavailable-thumb-opacity: 0.72;  /* design.md §7.5 "subtle dim"; concrete value per BQ-26/§8 */
  ```
- Add selectors:
  ```css
  .root.unavailableCard {
    background: var(--unavailable-surface);
    /* keep it calm, not a broken-disabled look (design §7.5): faint hairline/shadow consistent
       with the resting normal card; do NOT reduce whole-card opacity (design §10). */
  }
  .root.unavailableCard .normalThumbnail {
    opacity: var(--unavailable-thumb-opacity);
  }
  ```
- **No tag CSS** is added — the coming-soon tag reuses the standard chip (A1). (Optional, for the
  Wave 16 token inventory only: mirror `--unavailable-tag-bg`/`--unavailable-tag-fg` = `--tag-bg`/`--tag-fg`.
  See **Decision E2** — recommended to skip the mirror and reuse `--normal-tag-*` to avoid dead duplication.)
- **No `globals.css`.** The legacy global `--unavailable-overlay-gradient` / `--unavailable-badge-*`
  tokens (`globals.css:99-104, 130-135`) become dead; their removal is **Wave 16** scope (BQ-04), not now.

### Group B — Interaction / keyboard (D1) — **High-Risk cluster**

**B1. `src/features/landing/model/interaction-state.ts`** [HR] (path corrected — see §0.3)
- Change `resolveCardTabIndex` to take enterability and short-circuit:
  ```ts
  export function resolveCardTabIndex(
    state: LandingInteractionState,
    cardVariant: string,
    enterable: boolean
  ): number {
    if (!enterable) {
      return -1; // D1/BQ-26: unavailable is removed from the tab order in ALL states.
    }
    if (!state.hoverLock.enabled) return 0;
    if (state.hoverLock.cardVariant === cardVariant) return 0;
    return state.hoverLock.keyboardMode ? 0 : -1;
  }
  ```
- `isKeyboardModeBlocked` is unchanged. (`inert` for keyboard-mode non-target cards continues to
  apply to the unavailable card when another card holds the keyboard HOVER_LOCK — that path is
  unaffected; the unavailable card is never itself the HOVER_LOCK target because
  `CARD_FOCUS{available:false}` clears the lock — confirmed in `interaction-state.ts:300-302`.)
- `src/features/landing/model/index.ts` re-exports the symbol unchanged (no signature is declared
  there).

**B2. `src/features/landing/grid/use-landing-interaction-controller.ts`** [HR]
- At the `tabIndex` binding (`:494`) pass the already-computed `cardEnterable`:
  `tabIndex: isTransitioning || mobileInteractionLocked ? -1 : resolveCardTabIndex(interactionState, card.variant, cardEnterable)`.

**B3. Keyboard-handoff skip — `src/features/landing/grid/use-card-keyboard-handler.ts`**
(and/or **`src/features/landing/grid/interaction-dom.ts`**) [HR] — **see Decision E1**
- **Why required:** `state-smoke.spec.ts:293-318` currently asserts that Tab-out of `energy-check`'s
  last answer choice **programmatically focuses `creativity-profile`** (line 315 `toBeFocused()`).
  In the rendered order (`qmbti, rhythm-b, energy-check(opt_out), creativity-profile(unavailable),
  egtt`) the unavailable card sits **between two enterable cards**. `queueCardHandoff` →
  `resolveAdjacentCardVariant` (`interaction-dom.ts:16-32`) is **index-based, not enterable-aware**,
  and `focusCardByVariant` does `.focus()` which works on a `tabIndex=-1` button. So `tabIndex=-1`
  (B1) alone does **not** keep the card "keyboard-skipped in all states" — the handoff would still
  land on it. D1 requires the handoff to **advance past non-enterable neighbors** to the next
  enterable card.
- **Change:** make handoff target resolution skip non-enterable cards. Minimal options:
  - Option (i): add `resolveAdjacentEnterableCardVariant(cardVariants, current, step, isEnterable)`
    to `interaction-dom.ts` that loops `step` until it finds an enterable variant (or null), and use
    it at the three handoff sites in `use-card-keyboard-handler.ts` (`:160`, `:233`, `:252`/`:261`).
  - Option (ii): filter inside `queueCardHandoff` (`:81-106`) — if the resolved target is
    non-enterable, recompute the next enterable in the same direction. `isCardEnterableByVariant`
    is already injected into the handler (`:73`).
  - **Recommended:** Option (i) (pure helper, independently unit-testable, leaves `queueCardHandoff`
    behavior intact for enterable targets). Keep `collapse-prior` intact (the source card still
    collapses to Normal when focus leaves it).
- **Scope guard:** this is the *minimum* needed to satisfy D1 + the named B5 rewrite. Do **not**
  alter any other keyboard branch (Enter/Space activation, Escape, mobile handoff, shift-tab GNB
  return). Mandatory Playwright E2E (§4, §7).

### Group C — Fixture + generated registry (D3)

**C1. `src/features/variant-registry/source-fixture.ts`** [AF]
- Edit **only** the `creativity-profile` row (`:109-133`):
  - `title.en`: `"Creativity Profile (Soon)"` → `"Creativity Profile"`.
  - `title.kr`: `"창의성 프로필 (곧 공개)"` → `"창의성 프로필"`.
  - Tags — see **Decision E3** (label source + topical-tag set). **Recommended:** remove the lone
    raw coming-soon tag so the card carries **no topical tags** (`tags: {}`), making the i18n
    `copy.comingSoon` chip (A1) the single signal with no fragile string-dedup. (Creativity-profile
    has no other topical tags today, so nothing topical is lost.)
  - **Preserve:** `seq: 50`, `type: "test"`, `attribute: "unavailable"`, `subtitle`, `instruction`,
    `durationM: 4`, `sharedC: 0`, `engagedC: 0`. Do **not** touch any other fixture row (incl.
    `burnout-risk`, which is `attribute: "hide"` and not rendered).
- **Contract guards confirmed safe:** `tests/unit/landing-data-contract.test.ts:42`
  (`unavailableCount === 1`) and `:229` (creativity-profile present in OPTED_OUT catalog) stay green
  because `attribute` is unchanged. No test asserts the `"(Soon)"` title text or the creativity-profile
  tag array (verified by repo-wide grep), so D3 breaks no hidden assertion.

**C2. `src/features/variant-registry/variant-registry.generated.ts`** [GEN] — **regenerate, never hand-edit**
- After C1, run: `npx vite-node -c ./vitest.config.ts scripts/sync/regenerate-variant-registry-from-fixture.ts`.
- Expected diff: the `creativity-profile` block's `title.en/kr` lose the suffix; its `tags` array
  empties (under the recommended Decision E3). No other registry entry changes.
- Verify with `git diff` on the generated file + `npm test -- tests/unit/registry-serializer.test.ts`.

### Group D — i18n (W9-LI-01)

**D1. `src/messages/en.json`** [A]
- `"comingSoon": "Coming Soon"` → `"comingSoon": "Coming soon"` (sentence case, design.md §4.2;
  matches `getDefaultCardCopy()` fallback `'Coming soon'`). All other locales already conformant
  (verified in the Step-1 report). No key/structure change.

### Group E — Tests

**E1. `tests/unit/landing-interaction-state.test.ts`** [A]
- Update the two existing `resolveCardTabIndex(state, 'rhythm-b')` calls (`:82`, `:117`) to the new
  3-arg form, passing `true` (rhythm-b is enterable) — preserving current expectations (`0` and `-1`).
- Add cases for the unavailable card:
  - neutral state: `resolveCardTabIndex(initial, 'creativity-profile', false) === -1`.
  - keyboard-mode HOVER_LOCK on another card: still `-1` for `'creativity-profile', false`.
  - pointer hover-lock on another card: still `-1` for `'creativity-profile', false`.
- (This is where the **resolution logic** is unit-tested; the presentational component only reflects
  the `tabIndex` prop it is given — see E2.)

**E2. `tests/unit/landing-card-contract.test.ts`** [A] (also in `#variant-registry` gate)
- Rewrite the unavailable block (`:165-187`):
  - Remove `expect(doc.querySelector('[data-slot="unavailableOverlay"]')).not.toBeNull()`; replace
    with `expect(doc.querySelector('[data-slot="unavailableOverlay"]')).toBeNull()`.
  - Assert the **primary trigger is a `<button>`** with `aria-disabled="true"` (render with
    `ariaDisabled: true`, `tabIndex: -1` passed through `renderCardDocument` so the contract test
    can assert the markup reflects the props it is given).
  - Assert a **standard coming-soon tag**: a `.landing-grid-card-tag-chip` inside `[data-slot="tags"]`
    whose text is `"Coming soon"`; assert it is **not** `rounded-full`, has **no dashed border**,
    **no dot**, and is **not** inside an `aria-hidden` subtree.
  - Assert **title and subtitle keep full opacity** (no opacity-reduction class on
    `[data-slot="cardTitle"]` / `[data-slot="cardSubtitle"]`; design §10).
  - Assert the rendered title text contains no `"(Soon)"` (D3).
- Keep `:215-231` (`blogReadMore`/`primaryCTA` absent on unavailable) — still valid.

**E3. `tests/e2e/a11y-smoke.spec.ts`** [A]
- Replace the programmatic focus at `:117-118` (`unavailableCard.getByTestId('…trigger').focus()`),
  which still "works" on a `tabIndex=-1` button and therefore no longer represents a real keyboard
  path, with a **Tab-skip assertion**: starting from `document.body`, Tab through the grid and assert
  focus **never lands on** the `creativity-profile` trigger (order goes `…energy-check → egtt`,
  skipping `creativity-profile`). Keep an `expectPageToBeAxeClean` on the canonical landing state.
- Add a focus-ring-over-`--surface-soft` readability check where applicable (the unavailable card's
  surface is `#F4F1EA`; assert the focus ring remains visible — programmatic `.focus()` is acceptable
  here purely to sample computed focus styles, with a comment that it is not a keyboard-reachable path).

**E4. `tests/e2e/state-smoke.spec.ts`** [A]
- Rewrite `B5-keyboard-sequential unavailable …` (`:293-318`): after focusing `energy-check` and
  Tabbing past answer choices A/B, the next `Tab` must **skip `creativity-profile`** and focus
  **`egtt`** (the next enterable card); assert `creativity-profile` is **never focused**, and
  `energy-check` returns to `data-card-state='normal'` (**collapse-prior intact**). Rename the test
  title to drop "unavailable keyboard target" framing toward "skips the unavailable card" — and
  **update the matching QA grep** if the title is also referenced there (it is not today; only the
  grid-smoke titles are — see E7).
- `B5-keyboard-sequential` (`:230-263`, qmbti→rhythm-b) is unaffected (both enterable, adjacent) — keep.
- `B5-overlay-focus` (`:370-377`): this test snapshots `overlay-focus-shell.png` of the (removed)
  overlay via programmatic focus. **Decision E4:** recommend **removing** this test (its subject no
  longer exists) and folding focus-ring-over-surface readability into E3; the stale
  `overlay-focus-shell.png` baseline is **left untouched on disk** (BQ-07 defers baseline cleanup to
  Wave 14/16). Alternative: convert to a non-snapshot computed-style readability check.
- Keep the cursor-policy test (`:509-540`, unavailable trigger `cursor: default` via
  `aria-[disabled=true]:cursor-default`) and the reduced-motion test (`:434-486`, which only hovers
  the unavailable card and asserts no errors) — both still valid after the overlay removal.

**E5. `tests/e2e/grid-smoke.spec.ts`** [A]
- Rewrite `normal card slot order and unavailable overlay contract` (`:867-927`): keep the slot-order
  assertion (`['cardThumbnail','cardTitle','cardSubtitle','tags']`) and title-visible; **remove** the
  `[data-slot="unavailableOverlay"]` count + hover-opacity assertions (`:912-925`); **add** that the
  unavailable card's `[data-slot="tags"]` contains a coming-soon chip with text `"Coming soon"` that
  is **always visible** (opacity ~1) at rest (no hover needed). Rename the title (drops "overlay").
- Rewrite `unavailable overlay is always visible in tap mode` (`:929-962`): assert the coming-soon
  **tag** is visible in tap mode (and now also in hover mode). Rename the title (drops "overlay").
- In the hover-no-expand test (`:1068-1104`): keep `data-card-state='normal'` on hover; **remove** the
  `[data-slot="unavailableOverlay"]` opacity check (`:1102-1104`).
- Check the `creativity-profile` reference at `:298` (a variant list) — no change expected, but verify.

**E6. `scripts/qa/check-phase5-card-contracts.mjs`** [AF] — **required by §0.5**
- Update the two grep patterns to the renamed test titles from E5:
  - `:60-61` `normal card slot order and unavailable overlay contract` → the new E5 title.
  - `:68-69` `unavailable overlay is always visible in tap mode` → the new E5 title.
- Keep `:52-53` (`forces unavailable cards to stay normal`) — that unit-test title is unchanged.
- This is the single QA script touched; no other `scripts/qa/*.mjs` references the overlay/coming-soon
  (verified by grep).

### Group F — Ancillary docs (exact draft text below; see §8)

**F1. `docs/decision-register.md`** — **no new row.** BQ-26 already records D1–D3 and the
keep-focusable supersede (§0.1). Action: commit the existing uncommitted BQ-26 with the change set. §8.1.
**F2. `docs/req-landing.md`** [A] — §7.5:437, §7.6, §9.2:655-656, §9.3 (flagged), §13.2:806-807. §8.2.
**F3. `docs/design/design.md`** [AF-care] — §7.5 record dim `0.72` only; do **not** touch the
§4.10/§7.5 tab-order wording. §8.3.
**F4. `docs/wave-roadmap.md`** [A] — Status → ✅ + 구현 결과 block; Include line already correct. §8.4.
**F5. `docs/agent-guides/project-rules.md`** [A] — §Blog-Telemetry-Theme representative anchors. §8.5.
**F6. `docs/plans/2026-06-04-wave-9-unavailable-implementation.md`** — this plan (the deliverable).

---

## 3. Relevant SSOT contracts (Rebuild field + AGENTS §7)

| Concern | SSOT |
|---|---|
| Unavailable visual (surface, dim, tag, no overlay) | `design.md` §7.5 (+ §5.2 `--surface-soft`, §5.6 `--tag-bg/--tag-fg`, §6.3 tag chip, §4.10, §10 Never-Reintroduce) |
| Sentence-case label | `design.md` §4.2 |
| Tab-order removal / keyboard skip | `req-landing.md` §7.5 (HOVER_LOCK), §7.6 (Keyboard Sequential Override), §9.2 (Disabled Semantics) — **a11y governed by req-landing, not design.md (BQ-21)** |
| Always-visible indicator | `req-landing.md` §13.2; REQ-F-030 |
| Semantic button / aria-disabled / inert preservation | `req-landing.md` §9.2, §14.4 |
| Enterable classification (`available`/`opt_out`) | `req-landing.md` §14.4; `attribute.ts` `isEnterableCard`; `project-rules.md` §VariantRegistry |
| Fixture → generated boundary | `project-rules.md` §VariantRegistry; AGENTS §4 (generated file not hand-written) |
| Decision authority / supersede log | `decision-register.md` **BQ-26** (+ BQ-10, BQ-20, BQ-21, BQ-07) |

---

## 4. Impact assessment (AGENTS §7)

- **Shared shell / GNB:** none. No `page-shell`, `site-gnb`, transition, or telemetry change.
- **Localization:** `en.json` casing only (W9-LI-01); `copy.comingSoon` becomes the visible label
  source for all locales (already localized + sentence/native case elsewhere). Title-suffix removal
  (D3) is content, not i18n keys.
- **a11y (primary risk):** D1 + B3 change keyboard navigation — the unavailable card leaves the tab
  order in all states and the keyboard handoff skips it. At-risk dimensions: **a11y + usability**
  (keyboard reachability). The card stays in the **accessibility/reading tree** (semantic `<button>`
  retained; `aria-disabled` not native `disabled`; the coming-soon tag is real, non-`aria-hidden`
  text → AT-perceivable, satisfying design §4.10 and W9-LI-02). Focus ring must remain visible over
  `--surface-soft`. **Mandatory Playwright E2E regression** (AGENTS §4/§5): `a11y-smoke` (Tab-skip +
  axe) and `state-smoke` `B5-keyboard-sequential` (handoff skip + collapse-prior). See §7.
- **State contracts:** `resolveCardTabIndex` gains an `enterable` parameter (B1); the reducer, page-
  state model, hover-intent, mobile lifecycle, and transition runtime are **unchanged**.
- **Core user flow:** unchanged — no entry/transition/answer/navigation behavior changes; the
  unavailable card still cannot expand/navigate/emit telemetry.
- **Public contract change:** `data-slot="unavailableOverlay"` is **removed** (BQ-26/D2). Consumers:
  4 test references + 1 QA grep, all updated here. No runtime consumer.

---

## 5. Decisions requiring user confirmation BEFORE execution (AGENTS §7)

> Per CLAUDE.md, implementation must not begin until these are resolved. Recommendations are given;
> the first two are the prompt's named §5 decisions, E1/E2/E4/E5 are surfaced by this analysis.

- **E3 (prompt-named) — coming-soon tag label source + topical-tag set.**
  - **(a) Recommended:** label source = i18n `copy.comingSoon` (sentence-case, localized);
    fixture `creativity-profile.tags` emptied (no topical tags exist to retain) → single signal, no
    string-dedup. Consistent with W9-LI-01 and design §4.2.
  - (b) Keep the raw fixture `coming-soon` tag as the signal — rejected: non-localized,
    non-sentence-case, fails design §4.2.
  - (c) i18n tag + keep fixture tag + dedup raw chip at render by string match — rejected: fragile.
  - Topical-tag set for `creativity-profile`: **none today**; adding topical tags is a product/content
    decision **out of scope** unless the user supplies copy.
- **E1 — keyboard-handoff skip (widens surface into the High-Risk keyboard cluster).** D1 + the
  prompt's "unavailable skipped; collapse-prior intact" require changing
  `use-card-keyboard-handler.ts`/`interaction-dom.ts` (B3), which the prompt's file list did not name.
  **Recommended:** approve the minimal `resolveAdjacentEnterableCardVariant` helper (Option i).
  Without it, `state-smoke.spec.ts:293-318` cannot be made to pass under D1.
- **E2 — `--unavailable-*` token granularity.** **Recommended:** define only `--unavailable-surface`
  and `--unavailable-thumb-opacity`; reuse the existing `--normal-tag-*` standard chip for the tag
  (avoids dead duplicate tokens). Alternative: also add `--unavailable-tag-bg/-fg` mirrors purely for
  the Wave 16 consolidation inventory.
- **E4 — `state-smoke` `B5-overlay-focus` snapshot test.** **Recommended:** remove it (subject
  removed) and fold focus-ring readability into `a11y-smoke`; leave `overlay-focus-shell.png`
  untouched (BQ-07). Alternative: convert to a non-snapshot computed-style check.
- **E5 — req-landing §9.3 (Overlay Readability) rewording.** Not named in the prompt's ancillary
  list, but §9.3 describes the removed overlay. **Recommended:** reword §9.3 to the always-visible
  coming-soon tag + full-opacity title/subtitle + focus-ring-over-surface (draft in §8.2).

---

## 6. Rebuild fields — reference-only, preservation, High-Risk, validation gates

### 6.1 Reference-only / must-not-modify
- `legacy/reference` worktree; all checkpoint worktrees (`w01-02`, `w03-06`, `w07-10`, …) — read-only.
- `docs/design/resources/superseded/**`.
- `src/app/globals.css` — **Wave 16** scope (BQ-04); includes the now-dead legacy `--unavailable-*`
  tokens, which are **not** removed in Wave 9.
- Do not redesign/rename/reinterpret branch/worktree/checkpoint topology (BQ-13/14/15).

### 6.2 Preservation contracts (Wave 9 Exclude — must NOT change)
- variant-registry **enterable classification** (`available`/`opt_out` enterable; `unavailable`
  visible-but-not-enterable); resolver/builder/runtime boundary; runtime meta keys
  (`durationM`/`sharedC`/`engagedC`); consumer shape (`previewQuestion`/`answerChoiceA`/`answerChoiceB`).
- transition runtime + storage; telemetry (**unavailable emits no event, starts no transition**).
- test & blog behavior; answer-choice and blog whole-card-link contracts.
- scoped tokens **not** promoted to global (Wave 16); **no `globals.css`**.
- **BQ-07: no visual-regression baseline regeneration / no `qa:visual:full`.**
- deferred items: B14 mobile title-continuity → Wave 13; grid height rhythm → Wave 10.
- **Authorized exception (BQ-26/D2):** removal of `data-slot="unavailableOverlay"` — this supersedes
  the Step-1 report's "preserve public data-slot `unavailableOverlay`" note (decision-register > report).

### 6.3 High-Risk identification (AGENTS §4)
- D1 + B3 are a **keyboard / a11y behavior change** in the interaction cluster
  (`model/interaction-state.ts`, `use-landing-interaction-controller.ts`, `use-card-keyboard-handler.ts`;
  reachable through the High-Risk `use-keyboard-handoff.ts`). **At-risk dimensions: a11y + usability
  (keyboard navigation).**
- **Mandate:** Playwright E2E regression covering `a11y-smoke` (Tab-skip + axe-clean) and `state-smoke`
  `B5-keyboard-sequential` (handoff skips unavailable; collapse-prior intact).

### 6.4 Validation gates (run in order; gate before advancing)
1. **Basic gates (AGENTS §5):** `npm run lint` → `npm run typecheck` → `npm test` → `npm run build`.
2. **Registry regeneration gate:** `npx vite-node -c ./vitest.config.ts scripts/sync/regenerate-variant-registry-from-fixture.ts`,
   then `git diff src/features/variant-registry/variant-registry.generated.ts` (expect only the
   creativity-profile title/tags delta) + `npm test -- tests/unit/registry-serializer.test.ts tests/unit/landing-data-contract.test.ts`.
3. **Scope-specific (`verification-commands.md` `#variant-registry` + `#landing`):**
   - `node scripts/qa/check-variant-registry-contracts.mjs` · `node scripts/qa/check-variant-only-contracts.mjs`
   - `node scripts/qa/check-phase4-grid-contracts.mjs` … `check-phase10-transition-contracts.mjs`
     (**includes `check-phase5-card-contracts.mjs`** — must pass after the E6 grep update)
   - `npm test -- tests/unit/landing-card-contract.test.ts tests/unit/landing-interaction-state.test.ts tests/unit/landing-data-contract.test.ts tests/unit/registry-serializer.test.ts`
4. **Wave E2E (High-Risk mandate; preview, single worker per the W8 precedent):**
   `PLAYWRIGHT_SERVER_MODE=preview npx playwright test tests/e2e/a11y-smoke.spec.ts tests/e2e/state-smoke.spec.ts tests/e2e/grid-smoke.spec.ts --workers=1`.
5. **Explicitly NOT run:** `qa:visual:full` / any baseline regeneration (BQ-07);
   `overlay-focus-shell.png` stays deferred.
6. Per AGENTS §8: confirm regression coverage added/updated for the visual + a11y + keyboard
   assertions (done via E1–E6).

---

## 7. Suggested execution unit order (one unit at a time, gate between)

1. **Unit 1 — red tests first** (E1–E5 expectations authored to fail against current code; E6 grep
   updated to the new titles). Capture red evidence.
2. **Unit 2 — keyboard/a11y (B1, B2, B3)** [HR]. Gate: basic gates + unit (`landing-interaction-state`)
   + Wave E2E (`a11y-smoke`, `state-smoke` B5).
3. **Unit 3 — visual (A1, A2)**. Gate: basic gates + `grid-smoke` + `landing-card-contract`.
4. **Unit 4 — fixture + regen + i18n (C1, C2, D1)** [AF/GEN]. Gate: registry regen gate + `#variant-registry`.
5. **Unit 5 — ancillary docs (F2–F5)** and roadmap status/result (F4); confirm BQ-26 commit (F1).
6. **Unit 6 — full gate sweep** (§6.4 1–4). Write Context Restore.

> STATE.md trigger watch: this plan has ≥3 stages and Unit 2 touches High-Risk files — if ≥1 stage
> is verified and a remaining stage is High-Risk, write `.planning/STATE.md` at the unit boundary
> (CLAUDE.md Trigger 1).

---

## 8. Ancillary doc draft text (exact, in-context)

### 8.1 `docs/decision-register.md` — BQ-26 (already present; do NOT add a new row)
BQ-26 already records D1–D3 verbatim, including: *"Analysis의 keep-focusable 권고를 사용자 결정으로
supersede(BQ-20 승인 변경, 계약 위반 아님)."* This **is** the override log the Step-2 prompt asked for
(the prompt's "BQ-25" is a stale label — BQ-25 is the arrow-glyph deferral). **Action:** commit the
existing uncommitted BQ-26 with the Wave 9 change set. No text edit.

### 8.2 `docs/req-landing.md`
- **§7.5 HOVER_LOCK `:437`** — replace *"활성 조건: available 카드 Expanded 또는 unavailable 카드
  오버레이 활성."* with: *"활성 조건: available 카드 Expanded 또는 unavailable 카드 hover."* (overlay
  removed; the always-visible coming-soon tag is not a HOVER_LOCK trigger).
- **§7.6 Keyboard Sequential Override** — after `:467` (*"unavailable 카드는 본 override의 Expanded
  대상이 아니다."*) add: *"unavailable 카드는 tab order에서 제외된다(`tabIndex=-1`, 모든 상태). 키보드
  순차 탐색과 카드 간 handoff는 unavailable 카드를 건너뛰고 다음 enterable 카드로 이동하며, 직전 카드의
  Normal 복귀(collapse-prior)는 유지한다. (BQ-26/D1)"*
- **§9.2 Disabled Semantics `:655-656`** — replace the two lines with: *"unavailable Test 카드의 1차
  트리거는 semantic `<button aria-disabled=\"true\" tabindex=\"-1\">`로 표현한다. native `disabled`는
  사용하지 않는다 — `disabled`는 접근성 트리에서 카드를 과도하게 제거해 'coming soon' 인지(design §4.10)를
  해치기 때문이다. `tabIndex=-1`로 tab order에서 제외하되 semantic `<button>`과 a11y/reading tree
  노출은 유지한다(`role` 대체 금지). `aria-disabled=\"true\"`는 click/keydown(`Enter/Space`) 기본
  동작을 계속 차단한다. (BQ-26/D1)"* Keep `:657-660` (`aria-disabled` blocks activation; keyboard-mode
  non-target uses `inert`; GNB→landing focus skips `aria-disabled`/`inert`; no `role="button"`).
- **§9.3 Overlay Readability `:662-667`** *(Decision E5 — recommended)* — retitle to "Coming-soon
  Indicator Readability" and replace overlay wording with: *"coming-soon 표준 태그는 tags-row에 상시
  표시되며 텍스트 가독성을 보장한다. unavailable 카드의 title/subtitle은 full opacity를 유지하고
  (opacity 감소 금지, design §10) 항상 식별 가능해야 한다. `--surface-soft` 표면 위에서도 키보드 포커스
  링은 시각적으로 식별 가능해야 한다."*
- **§13.2 Unavailable Card UX `:806-807`** — replace the two lines with: *"coming-soon 표준 태그는
  모든 입력 모드(hover/tap)에서 tags-row에 상시 표시된다(우상단 오버레이 제거, BQ-26/D2)."*

### 8.3 `docs/design/design.md` §7.5 (BQ-21 / AGENTS §8 — value feedback only)
- On the bullet *"Thumbnail may dim subtly only; title and subtitle keep normal opacity."* append the
  concrete value: *"(realized dim: thumbnail `opacity 0.72`)."* **Do not** alter the §4.10 / §7.5
  tab-order sentences (they are already accurate under D1).

### 8.4 `docs/wave-roadmap.md` Wave 9
- Include line: **already correct** (uncommitted) — do not re-edit.
- Set **Status: ✅ 완료**; add `Logic Improvement: [W9-LI-01, W9-LI-03, W9-LI-04, W9-LI-05] approved
  (W9-LI-02 satisfied by D2)`; add **구현 결과** (overlay removed; coming-soon standard tag in tags-row
  always visible; `--surface-soft` surface + thumbnail dim 0.72; `tabIndex=-1` all states + handoff
  skip; fixture "(Soon)" removed + regen; en casing fix), **Files changed** (this §2 list), and
  **Validation** (gate results) after gates pass. Handoff → Wave 10 grid rhythm.

### 8.5 `docs/agent-guides/project-rules.md` §Blog-Telemetry-Theme `:112`
- Append to the representative-anchor line: *"· unavailable test `creativity-profile`."*
- *(Optional, Decision E2 path)* §Visual-Design: note `--unavailable-surface` / `--unavailable-thumb-opacity`
  in the Wave 16 scoped-token consolidation inventory.

---

## 9. Out of scope / explicitly deferred
- Any `globals.css` edit, including removing the dead legacy `--unavailable-*` tokens → **Wave 16**.
- Visual baseline regeneration / `qa:visual:full` / `overlay-focus-shell.png` refresh → **BQ-07** (deferred).
- Grid height rhythm → **Wave 10**; mobile unavailable visual nuance → **Wave 12**; mobile
  title-continuity (B14) → **Wave 13**.
- The req-landing §12 aspiration "unavailable Test 2+" (only 1 exists; `landing-data-contract`
  asserts exactly 1) — **not** a Wave 9 change; D3 preserves `attribute` and the count.
- Adding topical tags to `creativity-profile` (content/product decision) — only if the user supplies copy.

---

## 10. Required-fields checklist (AGENTS §7)
- [x] All files to be modified — §2 (Groups A–F).
- [x] Relevant SSOT contracts — §3.
- [x] Impact assessment (shell/GNB · localization · a11y · state contracts · core flow) — §4.
- [x] Validation commands — §6.4.
- [x] Decisions requiring confirmation — §5 (E1–E5 + prompt-named).
- [x] Wave number / range — §1.
- [x] Task mode (Plan Only now; Implementation authorized after approval) — header + §1.
- [x] Reference-only / must-not-modify — §6.1.
- [x] Preservation contracts (Exclude) — §6.2.
- [x] Validation gates within wave scope — §6.4.
- [x] W9-LI-05 supersede of the analysis keep-focusable recommendation, routed through the BQ-26
      record (not a silent change) — §0.1, §1.1, §8.1.
