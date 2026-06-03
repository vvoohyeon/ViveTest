# Wave 9 — Unavailable Behavior & Visual · Analysis-Only Report (BQ-19 Step 1)

> **Task mode:** Analysis Only. No source/test/CSS/doc/generated/branch changes were made.
> **Date:** 2026-06-04 · **Wave:** 9 (unavailable behavior + visual) · **Gate:** BQ-19 Step 1.
> This report gates the Wave 9 implementation prompt. Per BQ-19, no implementation may be
> issued until each candidate below is approved or deferred.

---

## 0. Executive summary

- **Wave 9 is a visual-only wave.** Every behavior contract the Wave 9 Include line names
  (no-hover / no-click / no-tap, handoff exclusion, keyboard non-expansion, HOVER_LOCK
  `tabIndex=-1` non-keyboard / `inert` keyboard) is **already enforced** at the
  controller / hover-intent / keyboard-handoff layers. **Recommendation: no hook change.**
- The unavailable trigger **must stay a semantic `<button aria-disabled="true">`** — this is
  mandated by req-landing §9.2 and §14.4, which govern a11y and override design.md. design.md
  §7.5 "not styled like a broken disabled button" is a *visual* caution, not an element-semantics
  directive. The two are fully compatible.
- The real Wave 9 work is **re-skinning** the unavailable card from its current **legacy
  dark-overlay + dark top-right pill** to design.md §7.5: warm `--surface-soft` surface,
  a **standard `coming soon` tag** (no dashed pill, no dot), subtle thumbnail dim, full-opacity
  title/subtitle. Visibility timing (hover/focus reveal in hover mode, always-on in tap mode)
  stays per req-landing §13.2.
- **Roadmap conflict confirmed and resolved:** the Wave 9 Include line "dashed Coming Soon pill,
  no dot" contradicts design.md §7.5, §10, and BQ-10. The standard tag wins; recommend
  correcting the roadmap.

---

## 1. Current-state findings (investigation questions)

### Q1 — How is an unavailable card rendered today?

Representative fixture: **`creativity-profile`** (`source-fixture.ts:109-133`, generated at
`variant-registry.generated.ts:143`), `type: "test"`, `attribute: "unavailable"`,
title `Creativity Profile (Soon)` / `창의성 프로필 (곧 공개)`, carrying its own fixture tag
`coming-soon` / `출시예정`, `sharedC: 0`, `engagedC: 0`.

Rendering path (`landing-grid-card.tsx`):
- `isUnavailable = isUnavailablePresentation(card)` → `attribute === 'unavailable'`
  (`attribute.ts:63`).
- The primary trigger is the **non-blog branch: a `<button type="button">`** (`tsx:1059-1075`),
  with `tabIndex={tabIndex}`, `aria-disabled={ariaDisabled ? 'true' : undefined}`. Wave 7 left
  Test/unavailable on `<button>`; only Blog became `<Link>`.
- The collapsed face renders Thumbnail → Title → Subtitle → TagRow (its own fixture tags),
  identical to a normal card. `resolvedState` forces `expanded → normal` for unavailable
  (`tsx:863`), so no Expanded shell / mobile expanded body / transient shell is ever mounted
  (`tsx:868-870, 1077`).
- The coming-soon indicator is a **separate absolutely-positioned overlay**,
  `UnavailableCardStatusOverlay` (`tsx:714-727, 1158-1160`):
  `data-slot="unavailableOverlay"`, `aria-hidden="true"`, `pointer-events-none`,
  `absolute inset-0 flex items-start justify-end` (top-right), dark gradient background
  `var(--unavailable-overlay-gradient)`, holding a **`rounded-full` pill** with a border,
  dark fill, white ink (`var(--unavailable-badge-bg/-ink/-border)`), label `copy.comingSoon`.
- **Visibility timing:** hover mode → `opacity-0 group-hover:opacity-100 group-focus-within:opacity-100`;
  tap mode → `opacity-100` (`tsx:715-720`).

**Focusable / interactive?** The `<button>` is natively focusable. `tabIndex` resolves to **0 in
the neutral browse state** (see Q2). `cursor` is `default` (`aria-[disabled=true]:cursor-default`,
`tsx:205`). No click/keydown activation occurs (blocked upstream — Q2). It carries
`aria-disabled="true"` and `inert` only when HOVER_LOCK keyboard-mode blocks it (Q2). It is
placed in the grid in normal flow as expected.

### Q2 — Already-enforced vs. gap (behavior layers)

All of the following are **already enforced** — Wave 9 changes none of it:

| Contract | Where enforced | Evidence |
|---|---|---|
| **No click / no tap** (no expand, no navigate, no mobile-open) | `use-landing-interaction-controller.ts:343-355` | `activationBlocked = isTransitioning \|\| !cardEnterable \|\| mobileInteractionLocked`; unavailable ⇒ `!cardEnterable` ⇒ `preventDefault()/stopPropagation()/return` before any expand/`beginMobileOpen`. |
| **No hover expand** (desktop) | `use-hover-intent-controller.ts:166-203` | For `!cardEnterable`, `onMouseEnter` never schedules expand; only collapses a prior expanded card. |
| **Handoff exclusion** (req-landing §8.2) | `hover-intent.ts:22-27` + `use-hover-intent-controller.ts:167-171` | `isEnterableHandoffCandidate({enterable:false})` → false; unavailable entry is never a handoff. (req-landing §8.2: "unavailable 진입은 handoff로 간주하지 않는다".) |
| **Keyboard non-expansion** (req-landing §7.6) | `use-keyboard-handoff` (via `keyboardActivationBlocked: activationBlocked`) + state model | req-landing §7.6: "unavailable 카드는 본 override의 Expanded 대상이 아니다." Encoded by passing state-smoke `B5-keyboard-sequential` (focus → `data-card-state='focused'`, not expanded; collapses prior). |
| **HOVER_LOCK non-keyboard `tabIndex=-1` / keyboard `inert`** for non-target cards | `interaction-state.ts:473-497` (`isKeyboardModeBlocked`, `resolveCardTabIndex`) + `tsx:1021` `inert={keyboardModeBlocked}` | req-landing §7.5: non-target cards get `tabIndex=-1` (non-keyboard) / `inert` (keyboard). Applied to *all* non-target cards, unavailable included. |
| **aria-disabled** (focus allowed, activation blocked) | controller `ariaDisabled: …!cardEnterable…` (`:493`) → `tsx:1020,1067` | req-landing §9.2: use `aria-disabled` "only when focus should be allowed but activation blocked." |
| **No telemetry, no transition** | controller never dispatches for unavailable | Preservation contract; unavailable emits no event, starts no transition. |

**The one nuance (not a defect):** in the **neutral browse state** (no HOVER_LOCK active),
`resolveCardTabIndex` returns `0` for *every* card including unavailable
(`interaction-state.ts:488-489`). So the unavailable `<button>` is a reachable keyboard
tab-stop in neutral state. This is **correct per req-landing §7.6** (unavailable is reachable
but non-expanding; first neutral Tab targets the first *available* card, but unavailable is not
removed from the sequence) and is **locked by passing tests** (state-smoke
`B5-keyboard-sequential`, a11y-smoke focus-by-Tab). design.md §4.10 "removed from the tab
order" is a *visual-doc a11y statement*, and **a11y is not governed by design.md (BQ-21)** —
req-landing §7.6 / §9.2 are authoritative and override it. **Conclusion: do not remove
unavailable from the neutral tab order; doing so would break §7.6 and the B5 tests.**

**What Wave 9 must still change (card/markup/CSS layer only):** the **visual skin** (Q4) and
the **coming-soon indicator form/casing** (Q5). Nothing at the controller/keyboard/hover/
mobile-lifecycle layer.

### Q3 — Element semantics

**Keep the `<button aria-disabled="true">`.** This is mandated, not optional:

- req-landing **§9.2 Disabled Semantics**: "unavailable Test 카드의 진입 불가는 시맨틱으로 표현
  해야 한다"; "포커스는 허용하되 활성만 차단해야 하는 경우에만 `aria-disabled='true'`를 사용한다";
  "`role='button'` 대체 구현은 금지." Because §7.6 requires the card to remain focus-reachable,
  native `disabled` (which removes focusability) is wrong here; `aria-disabled` is exactly right.
- req-landing **§14.4 Visual Redesign Preservation**: "semantic button/link, inert/aria-disabled
  기반 a11y guard는 시각 표현 변경으로 제거하면 안 된다."
- design.md **§7.5 / §4.10**: "visually inert … **not** styled like a broken disabled button" —
  a directive about *appearance* (no greyed-out disabled look), not element type. A semantic
  `<button aria-disabled>` that is *skinned* as a calm warm card fully satisfies both docs.

A11y trade-offs of the alternatives (all rejected):
- *non-interactive `<div>` / `role=button`*: violates §9.2 ("비시맨틱 컨테이너 단독 활성화 트리거
  금지", "role='button' 대체 금지").
- *native `disabled`*: removes neutral focusability → breaks §7.6 keyboard reachability and the
  B5 tests.
- *button + permanent `tabIndex=-1`*: removes it from the neutral sequence → same §7.6 breakage.

→ **No element-semantics change in Wave 9.**

### Q4 — Visual delta (design.md §7.5 → current `module.css`)

Current treatment is the **pre-redesign legacy skin**: a dark scrim
(`--unavailable-overlay-gradient`) + a dark top-right `rounded-full` pill
(`--unavailable-badge-*`). These tokens live in **`globals.css:99-104` (light) and `:130-135`
(dark)** — i.e. global, and a different visual language entirely. `--surface-soft` is **defined
in design.md §5.2 (`#F4F1EA`) but used nowhere in `src/`**.

| Aspect | design.md §7.5 target | Current | Delta |
|---|---|---|---|
| Card surface | warm **`--surface-soft` `#F4F1EA`**, slightly distinct | normal `color-mix(panel-solid 90%)` | apply surface-soft |
| Thumbnail | **subtle** dim only | no dim (dark scrim covers card instead) | subtle dim (proposed ~0.72 opacity — see §5) |
| Title / subtitle | **full opacity** | full opacity (but dark scrim reduces legibility) | remove scrim; keep full opacity |
| Coming-soon mark | **standard tag**, `--radius-xs` 5px, `--tag-bg` `#F0ECE2` fill, `--tag-fg` `#4A4A55` ink, no border, **no dashed pill, no dot** | `rounded-full` (999px) pill, border, dark fill, white ink | reshape to standard tag (§6.3) |
| Position | **tags-row position** | absolute overlay, top-right | decision: move to tags row vs. re-skinned overlay (§ Q5 / W9-LI-04) |

**Scoped tokens needed (W3/W5/W8 "Strategy A" pattern, per project-rules §Visual-Design):**
define `--unavailable-*` in `landing-grid-card.module.css` `.root` whose **values equal the
design.md §5 semantic tokens** — surface = `--surface-soft` `#F4F1EA`, tag fill/ink = `--tag-bg`
`#F0ECE2` / `--tag-fg` `#4A4A55`, plus a subtle thumbnail-dim value. Scoped `.root` definitions
**shadow** the legacy global `--unavailable-*` without editing `globals.css`. **No `globals.css`
change** (that is Wave 16 / BQ-04). The legacy global `--unavailable-*` tokens become dead and
are cleaned up in Wave 16 — not now.

### Q5 — Coming-soon indicator

- **Standard tag, no dashed outline, no dot** — confirmed by design.md §7.5 ("standard
  `coming soon` tag … no dashed pill, no dot"), §10 ("Never reintroduce: Dashed `Coming soon`
  pill / A dot inside the `Coming soon` tag / Opacity reduction on the unavailable card's title /
  subtitle"), and BQ-10 ("no hover/no click/no tap, no dot pill").
- **Label source:** i18n `landing.comingSoon` (`src/messages/*.json:21`), threaded as
  `copy.comingSoon` (`landing-catalog-grid.tsx:107` → `tsx:1159`). Fallback
  `getDefaultCardCopy()` returns `'Coming soon'` (`tsx:1167`).
- **Casing (checked, not assumed):** `en.json` is **`"Coming Soon"` (Title Case)** — this
  **violates design.md §4.2** ("sentence case everywhere … labels"). The runtime fallback
  `getDefaultCardCopy()` already uses sentence case `'Coming soon'`, so **en.json and the
  fallback disagree.** All other locales are already sentence/native case (fr "Bientôt
  disponible", es "Próximamente", de "Demnächst", pt "Em breve", ru "Скоро", id "Segera hadir",
  hi/ja/kr/zs/zt non-cased). This mirrors the W5 "Completed" casing reconciliation. → candidate
  **W9-LI-01**.
- **Mobile touch default-visible disclosure (REQ-F-030 / req-landing §13.2):** in tap mode the
  indicator is always visible; in hover mode it is revealed on hover/focus. **Already
  implemented** (`tsx:715-720`) and locked by grid-smoke (default opacity ≤0.05 → hover ≥0.95;
  tap always ≥0.95). Keep this timing.
- **Fixture-tag redundancy (decision point):** the fixture already carries a raw `coming-soon` /
  `출시예정` tag rendered as a normal chip. With §7.5's standard `coming soon` tag, there are two
  coming-soon signals. Whether the standard tag should render the localized `copy.comingSoon`
  (deduping/replacing the raw fixture chip) or coexist is a design/i18n decision → folded into
  **W9-LI-04**. (The fixture is Ask-First / preserved; prefer rendering `copy.comingSoon` as the
  standard tag and leaving fixture data untouched.)

### Q6 — Representative fixture

**`creativity-profile`** is the sole `attribute: "unavailable"` entry in the registry
(`source-fixture.ts:113`, generated `:144`). It is **not currently listed** as a representative
anchor in project-rules §Blog-Telemetry-Theme (which lists available `qmbti`, opt-out
`energy-check`, blog `ops-handbook`). Existing tests already standardize on
`[data-card-variant="creativity-profile"]`. → Recommend adding "unavailable test
`creativity-profile`" to the representative-anchor list when Wave 9 lands (doc upkeep, not a
behavior change).

### Q7 — Test surface

Current unavailable coverage:
- **Unit `landing-card-contract.test.ts`**: `:165-187` forces normal-when-expanded + asserts
  `[data-slot="unavailableOverlay"]` present, no previewQuestion/expanded/primaryCTA; `:215-231`
  no `blogReadMore`/`primaryCTA`. **No assertions on** focusability/`tabIndex`, `aria-disabled`,
  semantic `<button>`, the coming-soon tag text/shape, surface treatment, or casing.
- **E2E `grid-smoke.spec.ts`**: `:867-927` overlay-contract (count 1; hover opacity 0.05→0.95;
  cardTitle visible); `:929-962` tap mode always-visible; `:1068-1103` hover does not expand.
- **E2E `state-smoke.spec.ts`**: `:293-316` B5-keyboard-sequential (focus → `focused`, collapses
  prior); `:370-376` B5-overlay-focus **PNG snapshot** `overlay-focus-shell.png`; `:442-525`
  hover no-expand + `cursor:default`.
- **E2E `a11y-smoke.spec.ts`**: `:117-118` focuses the unavailable trigger.

Must add / update for Wave 9 (a11y + card-contract gates):
- **Add (card-contract)**: unavailable primary trigger is `<button>` with `aria-disabled="true"`;
  coming-soon tag is a standard tag (assert it is **not** `rounded-full`, has **no** dashed
  border, **no** dot, uses tag tokens); title/subtitle remain full opacity (no opacity reduction
  — §10). If W9-LI-01 approved, assert sentence-case label.
- **Add (a11y)**: focus ring readable over `--surface-soft`; `cardTitle` identifiable (§9.3);
  semantic-button + inert/aria-disabled guard preserved (§14.4). If W9-LI-02 approved, assert the
  coming-soon status is exposed to AT.
- **Update (grid-smoke)**: the opacity-timing assertions stay valid **only if** the re-skin keeps
  `data-slot="unavailableOverlay"` + hover/tap gating (recommended). If W9-LI-04 moves the tag and
  changes timing, re-point selectors/assertions accordingly.
- **No visual-regression baseline regeneration (BQ-07).** The re-skin changes pixels, so the
  `overlay-focus-shell.png` snapshot would diverge; that snapshot is a **local ignored baseline**
  and is **deferred** — Wave 9's gate is a11y + card contract, not visual snapshots. Do **not**
  run `qa:visual:full` / regenerate baselines.

---

## 2. Roadmap conflict resolution (dashed pill)

`docs/wave-roadmap.md:360` Wave 9 Include reads:
> "no hover/click/tap, `tabIndex=-1`, muted surface, **dashed Coming Soon pill, no dot**"

This **directly contradicts** the visual authorities:
- **design.md §7.5**: "A standard `coming soon` tag … **no dashed pill, no dot**."
- **design.md §10 Never Reintroduce**: "**Dashed `Coming soon` pill**" and "**A dot inside the
  `Coming soon` tag**."
- **BQ-10**: "no hover/no click/no tap, **no dot pill**."

By BQ-21 precedence (decision-register > product requirements > design.md), **all three
authorities agree against a dashed pill**; only the roadmap line is wrong.

**Resolution: the indicator is the STANDARD coming-soon tag — NO dashed pill, NO dot.**
**Recommendation (doc upkeep at Wave 9 implementation):** correct the roadmap Include line to:
> "no hover/click/tap, `tabIndex=-1` (HOVER_LOCK non-target) / `inert` (keyboard), `--surface-soft`
> surface, **standard coming-soon tag (no dashed pill, no dot)**, subtle thumbnail dim,
> full-opacity title/subtitle."

---

## 3. Logic Improvement candidate table (BQ-18 / BQ-19)

Evaluated across state · hooks · routing · storage · telemetry · i18n · a11y · visual.
**Default is Evaluate, not Keep.** Layers with no candidate (state, hooks, routing, storage,
telemetry) were evaluated and intentionally preserved — see §0/§1.

| Candidate ID | Layer | Description | Change magnitude | Improvement value (1–5) | Risk / rollback | Wave dependency |
|---|---|---|---|---|---|---|
| **W9-LI-01** | i18n | Reconcile `en.json` `comingSoon` Title Case `"Coming Soon"` → sentence case `"Coming soon"` per design.md §4.2; align with `getDefaultCardCopy()` fallback (already sentence case). Other locales already conformant. | **Low** | **4** — design-voice consistency + removes en/fallback divergence (criterion 2 simplicity, 5 a11y/clarity). | Very low; one-string-per-file revert. No behavior/contract impact. | none |
| **W9-LI-02** | a11y | Evaluate exposing the coming-soon status to assistive tech. Today the overlay is `aria-hidden="true"` (`tsx:723`), so the localized status is not announced; AT users rely on the title "(Soon)" + fixture tag. Decide: keep aria-hidden (title suffices) vs. expose the status tag. | **Low** | **3** — potential a11y improvement (criterion 5); but title already encodes "(Soon)", so net value depends on the decision. | Low; aria-only. If exposed, verify no double-announcement with title. | W11 a11y hardening may revisit |
| **W9-LI-03** | visual | Re-skin unavailable to design.md §7.5 via scoped `--unavailable-*` tokens in `module.css` `.root` (values = §5 semantic tokens: `--surface-soft`, `--tag-bg`, `--tag-fg`, subtle dim). Replace legacy dark-overlay/dark-pill skin; keep `data-slot` + §13.2 hover/tap timing. **This is the wave's core deliverable.** | **Medium** | **5** — realizes the §7.5 contract (criterion 2/5). | Low–Med; CSS/markup only, no `globals.css`. Rollback = revert module.css/tsx. Pixel diff vs. local snapshot baseline (deferred, BQ-07). | W10 grid rhythm (height), W12 mobile visual |
| **W9-LI-04** | visual / markup | Decide coming-soon tag **placement**: (a) keep the re-skinned hover/tap-gated overlay slot (minimal, preserves §13.2 timing + `data-slot="unavailableOverlay"` + grid-smoke), or (b) move to the literal tags-row position per §7.5 (closer to design wording, but changes layout/timing/tests). Includes the fixture-tag-vs-`copy.comingSoon` dedup decision. | **Medium** | **3** — (a) is lower-risk and contract-faithful; (b) is more literal to §7.5 wording. | (a) low; (b) medium — touches §13.2 timing + existing tests + `data-slot`. | W10 grid rhythm |

**Recommended pre-selection for user review:** approve **W9-LI-01** (clear design-voice fix) and
**W9-LI-03** (the wave deliverable, placement = option (a) minimal re-skin). Treat **W9-LI-02**
and **W9-LI-04(b)** as explicit decisions to confirm or defer.

---

## 4. Recommended Wave 9 change surface (NOT implemented here)

| File | Nature of change | Risk class |
|---|---|---|
| `src/features/landing/grid/landing-grid-card.module.css` | Add scoped `--unavailable-*` tokens in `.root` (values = design.md §5 semantic tokens) + an unavailable surface/thumbnail-dim selector; restyle the coming-soon mark as a standard tag (5px radius, tag tokens, no border/dashed/dot). No `globals.css`. | Normal (Always-Modify-Freely) |
| `src/features/landing/grid/landing-grid-card.tsx` | Re-skin `UnavailableCardStatusOverlay` / unavailable surface classes to the standard-tag form; keep `<button aria-disabled>`, `data-slot="unavailableOverlay"`, hover/tap timing, `aria-hidden` (unless W9-LI-02 approved). Markup-only; no controller/prop-flow change. | Normal |
| `src/messages/en.json` | **Only if W9-LI-01 approved:** `"Coming Soon"` → `"Coming soon"`. | Always-Modify-Freely (`src/messages/**`) |
| `tests/unit/landing-card-contract.test.ts` | Add unavailable assertions: semantic `<button>` + `aria-disabled`, standard-tag shape (no dashed/dot), full-opacity title/subtitle, (casing if W9-LI-01). | Tests |
| `tests/e2e/a11y-smoke.spec.ts` | Add focus-ring-over-surface + title-identifiable + a11y-guard-preserved checks (§9.3/§14.4). | Tests |
| `tests/e2e/grid-smoke.spec.ts` | Keep opacity-timing assertions; re-point only if W9-LI-04(b) chosen. | Tests |
| `docs/design/design.md` | Only if a §7.5 visual decision is *newly confirmed* (e.g. a concrete dim value) — feed back per BQ-21/§8 of AGENTS. Not for implementation-only refactor. | SSOT (Ask-First care) |
| `docs/wave-roadmap.md` | Correct the Wave 9 Include line (dashed pill → standard tag) + record outcome. | docs |
| `docs/agent-guides/project-rules.md` | Add `creativity-profile` (unavailable) to representative anchors (§Blog-Telemetry-Theme). | docs |

**No change to:** any High-Risk hook (`use-landing-interaction-controller`,
`use-mobile-card-lifecycle`, `use-keyboard-handoff`, hover-intent), the state model,
variant-registry resolver/builder/fixture (enterable classification), transition runtime/storage,
telemetry, `globals.css`, public `data-slot` names, answer-choice / blog whole-card-link
contracts, or any visual-regression baseline (BQ-07).

**High-Risk note (AGENTS §4):** the analysis concludes Wave 9 touches **none** of the
landing interaction controller / keyboard handler-handoff / hover-intent controller /
mobile-lifecycle hook. The existing exclusion already satisfies no-hover/no-click/no-tap/
handoff/keyboard contracts. → **Recommend "no hook change."** No Playwright E2E regression is
mandated on the High-Risk-hook basis (no High-Risk hook is in the change set); E2E grid/state
smoke remains advisable for visual-timing confidence but is not a §4 trigger here.

---

## 5. Concrete design.md gap (BQ-21 exception candidate)

**One minor, non-blocking gap.** design.md §7.5 specifies the thumbnail "may dim **subtly only**"
but gives **no numeric value**, and §5 has **no token** for the unavailable thumbnail-dim amount
(it tokenizes the surface `--surface-soft` and tag `--tag-bg/--tag-fg`, but not the dim). The
Wave 9 task references a concrete "thumbnail dim 0.72"; design.md does not state it.

**This does NOT require a supplemental per-wave CSS extraction (BQ-21).** "Subtly" can be realized
with a scoped value (e.g. thumbnail `opacity ~0.72`, or an equally subtle tint) inside
`module.css`, consistent with the W3/W5/W8 scoped-token pattern. **Recommendation:** pick a concrete
subtle dim value at implementation, confirm it with the user, and **feed the confirmed value back
into design.md §7.5** as the durable visual decision (per BQ-21 / AGENTS §8) — rather than issuing
a supplemental CSS exception. No other design.md gap was found.

---

## 6. Recommended validation gates

- **Basic gates (AGENTS §5, in order):** `npm run lint` → `npm run typecheck` → `npm test`
  → `npm run build`.
- **Wave-scoped (per roadmap Wave 9 "a11y + card contract"):** targeted
  `tests/unit/landing-card-contract.test.ts` + `tests/e2e/a11y-smoke.spec.ts`; plus
  `tests/e2e/grid-smoke.spec.ts` unavailable blocks for hover/tap timing confidence
  (preview mode, `--workers=1`, per the W8 precedent).
- **Explicitly NOT run:** `qa:visual:full` / any visual-regression baseline regeneration
  (BQ-07); the `overlay-focus-shell.png` snapshot remains deferred.
- Per AGENTS §8: confirm regression coverage is added/updated for the visual + a11y assertions.

---

## 7. Preservation contracts re-affirmed (must NOT change in Wave 9)

resolver / variant-registry enterable classification · transition runtime + storage · telemetry
(unavailable emits no event, starts no transition) · test & blog behavior · public `data-slot`
names (incl. `unavailableOverlay`) · answer-choice and blog whole-card-link contracts ·
`globals.css` (Wave 16) · scoped tokens not promoted to global · BQ-07 no baseline regeneration ·
deferred items (B14 mobile title-continuity → W13, grid height rhythm → W10). Reference-only and
untouched: `legacy/reference` worktree, all checkpoint worktrees,
`docs/design/resources/superseded/**`.

---

## 8. BQ-19 Step-2 handoff line

Choose one to authorize the Wave 9 implementation prompt:

- `Logic Improvement: [W9-LI-01, W9-LI-03] approved — apply per analysis report 2026-06-04.`
  (recommended baseline: en casing fix + §7.5 re-skin with minimal placement option (a))
- `Logic Improvement: [W9-LI-01, W9-LI-02, W9-LI-03, W9-LI-04] approved — apply per analysis report 2026-06-04.`
  (also expose coming-soon to AT and move the tag to the literal tags-row position)
- `Logic Improvement: no candidates approved — preserve existing logic.`
  (would leave the legacy dark-overlay skin in place — not recommended; defeats the wave purpose)
