# Wave 8 — Blog normal/active visual · Implementation Plan

> **This document was authored in Plan Only mode.** User approval was received on 2026-06-03 and the implementation described here has been executed. Outcome is recorded in §11.
> **Input:** [`docs/plans/2026-06-03-wave-8-blog-visual-analysis.md`](2026-06-03-wave-8-blog-visual-analysis.md) (BQ-19 Step 1). Detail is pulled from that report; not restated at length.
> **Logic Improvement (BQ-19):** `no candidates approved — preserve existing logic.` All six layers (state/hooks/routing/storage/telemetry/i18n) are Keep (analysis §4/§8).

---

## 1. Header / scope

| Field | Value |
|---|---|
| **Wave** | **8** — Blog normal/active visual |
| **Task mode of the planned work** | **Implementation** (this plan authored in Plan Only) |
| **Prerequisite** | Wave 7 ✅ (whole-card `<Link>` direct navigation); BQ-19 Step 1 analysis complete |
| **Risk** | Medium (CSS/markup-only; no High-Risk file touched) |
| **Branch / workspace** | local `main` (BQ-13). No branch/push/merge; no checkpoint or `legacy/reference` worktree |
| **Logic Improvement line for Step 2** | `Logic Improvement: no candidates approved — preserve existing logic.` |

**Wave 8 Include (wave-roadmap):** no `READ` eyebrow · `Read more →` in the tag row · desktop hover reveal · mobile always-visible · blog hover skin.
**Wave 8 Exclude (wave-roadmap):** GNB / mobile menu · any Blog navigation/behavior change · transition/storage/telemetry redesign · Test and Unavailable cards · `globals.css` / theme tokens.

**Approach (settled, from analysis):** Read-more = Option B (blog-gated flex wrapper + non-interactive `aria-hidden` span, never `primaryCTA`, never focusable); reveal = CSS-only (`group-hover` / `group-focus-within` + `interactionMode`, reduced-motion safe); blog hover skin = Option A (`[data-card-content-type="blog"]:hover` in `landing-grid-card.module.css` with scoped `--blog-*` tokens, no `globals.css`); reuse existing 12-locale `landing.readMore` as-is; keep the existing collapsed focus ring additive (no `outline:none`).

---

## 2. SSOT contract (per AGENTS §2 Task Routing Table — "visual skin / design tokens / card visual" row)

- **Primary visual SSOT:** [`docs/design/design.md`](../design/design.md) — **§7.4** (Blog card: `Read more →` at right of tag row, revealed on hover desktop / always-visible mobile; never underlined; no `READ` eyebrow; sage border + `--focus-ring-soft` glow hover skin), **§5.1** (tags/meta type role 13px/500/1.35, `--muted`), **§5.5** (`--sage`), **§5.7** (`--focus-ring-soft`), **§5.8** (shadow tokens), **§6.9** (focus ring), **§10** (Never Reintroduce).
- **Project rules:** [`project-rules.md §Visual-Design`](../agent-guides/project-rules.md) — scoped `--*` tokens stay in `landing-grid-card.module.css` with values matching design.md; do **not** promote to `globals.css` (Wave 16); do not refactor existing scoped tokens as a side effect.
- **Precedence (BQ-21):** `decision-register.md` → product requirements / active rules → `design.md` → patterns/application → mockups → existing impl → wave CSS.
- **Governing BQ IDs:** BQ-02 (no Blog expanded), BQ-04 (globals.css = Wave 16), BQ-07 (no baseline regen), BQ-12 (transition/telemetry/storage preserved), BQ-18/BQ-19 (Logic gate), BQ-21 (design.md SSOT; supplemental CSS only on proven gap), BQ-25 (no arrow optical nudge pre-Pretendard).
- **Verify:** [`docs/agent-guides/verification-commands.md §landing`](../agent-guides/verification-commands.md) via AGENTS §8.

---

## 3. Files to be modified / actual changed files

| # | File | Change | Ask-First / High-Risk? |
|---|---|---|---|
| 1 | `src/features/landing/grid/landing-grid-card.tsx` | Blog-gated `Read more →` affordance in the tag-row seam (Option B); thread `readMoreLabel` `NormalCardFace → NormalCardTagRow`; reveal classes (`group-hover`/`group-focus-within` + `interactionMode`); re-consume `copy.readMore`. | No |
| 2 | `src/features/landing/grid/landing-grid-card.module.css` | Add scoped `--blog-*` tokens in `.root`; add `.root[data-card-content-type="blog"]:hover` skin (border + glow); keep resting state and focus ring unchanged. | No |
| 3 | `tests/unit/landing-card-contract.test.ts` | Extend the blog case: assert `Read more →` span present, `aria-hidden`, **not** focusable, **not** `data-slot="primaryCTA"`; assert test/unavailable tag rows carry **no** Read-more node. | No (tests/**) |
| 4 | `tests/e2e/grid-smoke.spec.ts` | Landing interaction smoke: blog Read-more revealed on desktop hover/focus and hidden at rest; always-visible on mobile; no new focusable/expanded slot; existing `@smoke blog hover keeps the card normal` stays green. | No (tests/**) |
| 5 | `docs/design/design.md` | **Decision 1:** add `--shadow-blog-hover` to §5.8 + cross-reference from §7.4. **Decision 2:** drop the blog-expanded sentence in §7.3 (the floor/spacer mechanism stays valid for the Test expanded card only). | No (docs/**); visual SSOT — AGENTS §8 feedback path |
| 6 | `docs/req-landing.md` | **Decision 2:** sync §6.5 (remove "Blog Expanded … primaryCTA(Read more)" / "Blog entry는 Expanded의 primaryCTA(Read more)에서만 시작" rows) and §6.6 (Blog Expanded subtitle-continuity rows) to the implemented whole-card-link contract. Defer §1.3/§8.5 prose to Wave 14. | No (docs/**) |
| 7 | `tests/unit/landing-data-contract.test.ts` | Actual implementation follow-up: update the stale Wave 7 guard so it still rejects legacy `blog.primaryCTA` but allows `copy.readMore` as the new non-interactive `blogReadMore` affordance. | No (tests/**) |

**Not modified (confirmed):** `landing-catalog-grid.tsx` — `readMore: t('readMore')` already wires the copy (analysis §1.4). `getDefaultCardCopy()` already returns `readMore: 'Read more'`. No locale `*.json` edits — `landing.readMore` exists in all 12 (analysis §4 W8-LI-01). No `globals.css`. No controller/hook files. No `tests/e2e/theme-matrix-manifest.json` (see §7).

---

## 4. Planned implementation design (reference for the executor)

### 4.1 `landing-grid-card.tsx` — Read-more affordance (Unit B)
- Thread a `readMoreLabel?: string` prop through `NormalCardFaceProps` → `NormalCardTagRowProps`. In `LandingGridCard`, pass `readMoreLabel={isBlogCard ? copy.readMore : undefined}` to `NormalCardFace` (the `copy` and `isBlogCard` are already in scope; `interactionMode` is already a prop). The invisible `NormalCardGhostBody` path (test-only desktop-expand ghost) passes **no** `readMoreLabel` → unchanged.
- In `NormalCardTagRow`, when `readMoreLabel` is set, wrap the existing `<ul>` and a sibling span in a flex row; render a **non-interactive** `<span data-slot="blogReadMore" aria-hidden="true">` with `ml-auto shrink-0` and the decorative `→` appended in-component (not in the i18n string). When `readMoreLabel` is unset (test/unavailable), return the **current** markup byte-identical (gap div + `<ul>` only).
- Reveal classes on the span: `interactionMode === 'hover' ? 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-[140ms] motion-reduce:transition-none' : 'opacity-100'` (mirrors `UnavailableCardStatusOverlay`, analysis §2.2/§2.3).
- Typography: `text-[13px] font-medium leading-[1.35] text-[var(--muted-ink)]`, no underline (design.md §5.1/§7.4/§10).
- **Never** `data-slot="primaryCTA"`; **never** a focusable node; **never** a navigation trigger (BQ-02; contract test `primaryCTA` null at [`landing-card-contract.test.ts:206`](../../tests/unit/landing-card-contract.test.ts:206)).

### 4.2 `landing-grid-card.module.css` — blog hover skin (Unit C)
- In `.root`, add scoped tokens matching design.md literals (analysis §2.4/§3.1), e.g. `--blog-hover-border: #5c8e78;` and a `--blog-hover-shadow` composite per Decision 1 (`0 0 0 1px var(--blog-hover-border), 0 4px 14px rgba(92,142,120,0.22)`), kept blog-scoped — no shared/global token mutated, consistent with the existing `--normal-*` / `--expanded-*` pattern.
- Add `.root[data-card-content-type="blog"]:hover { border-color: var(--blog-hover-border); box-shadow: var(--blog-hover-shadow); }`. The resting 1px border box is already reserved (`--normal-card-border: transparent`), so deepening to sage causes **no layout shift** (design.md §6.1).
- The existing `.root:not(.desktopOverlayLayer):has(:focus-visible)` sage outline ([`module.css:26`](../../src/features/landing/grid/landing-grid-card.module.css:26)) is **left intact** — focus ring composes additively over the hover skin (analysis §3.2). No `outline:none`. Resting state visually unchanged.

### 4.3 Tests (Unit A — authored first; see §5 ordering)
- Unit contract: blog Read-more present + `aria-hidden` + non-focusable + not `primaryCTA`; test/unavailable Read-more absent.
- E2E landing smoke: rest→hover/focus reveal on desktop; always-visible on mobile; no new tab stop; no expanded slot; existing blog-hover normal-state test unaffected.

---

## 5. Execution order (units; gate after each; one unit at a time)

> Per CLAUDE.md (multi-file change): execution order is stated and is to be confirmed at approval. Verify before advancing; if new requirements emerge mid-unit, stop and re-confirm.

1. **Unit A — Tests first (red).** Edit files #3, #4 to encode the target DOM/behavior. Expected: new assertions fail (affordance absent). Gate: `npm test` shows the new blog assertions red, others green.
2. **Unit B — Component markup.** Edit file #1 (Read-more affordance + prop threading + reveal classes + re-consume `copy.readMore`). Gate: `lint` → `typecheck` → `npm test` (Unit A unit assertions now green; test/unavailable rows unchanged).
3. **Unit C — Scoped CSS skin.** Edit file #2 (scoped `--blog-*` tokens + blog hover selector; focus ring preserved). Gate: `lint` → `build`; visual review that resting state is unchanged and hover yields sage border + glow; focus ring still visible.
4. **Unit D — Doc sync (Decisions 1 & 2; gated on sign-off).** Edit files #5, #6. Gate: `git diff --check`; re-read design.md §7.3/§7.4/§5.8 and req-landing §6.5/§6.6 for internal consistency after edits.
5. **Unit E — Full gates + scope checks.** Basic Gates in order + landing interaction smoke + mobile browse check (§6).

**Per-unit rollback:** each unit is an isolated file group; revert that unit's diff to roll back. Unit C tokens/selector are blog-scoped, so reverting cannot affect test/unavailable/global theme. Unit D is docs-only.

---

## 6. Validation commands / gates (within wave scope)

- **Basic Gates (in order, AGENTS §5):** `npm run lint` → `npm run typecheck` → `npm test` → `npm run build`.
- **Landing interaction smoke:** `tests/e2e/grid-smoke.spec.ts` (incl. the existing `@smoke blog hover keeps the card normal without rendering Expanded slots` + the new Read-more reveal assertions). Per `verification-commands.md §landing`.
- **Mobile browse check:** confirm Read-more `opacity:1` (always visible) at `viewportTier='mobile'` / `interactionMode='tap'`; whole-card tap still navigates.
- **BQ-07:** baseline regeneration **forbidden** — do **not** run `qa:visual:full`; theme-matrix / Safari snapshot debt stays deferred (analysis §6.2). `git diff --check` clean.
- **Regression coverage:** behavior/visual change adds a DOM affordance → new contract + e2e assertions are part of this change set (CLAUDE.md Verification).

---

## 7. Impact assessment (AGENTS §7)

- **Shared components (shell / GNB):** none. `page-shell.tsx`, `site-gnb.tsx`, mobile menu untouched (Wave 8 Exclude; BQ-03). `NormalCardTagRow` is shared across card types but the change is gated `card.type === 'blog'` → test/unavailable markup byte-identical.
- **Localization:** reuse existing 12-locale `landing.readMore` (analysis §4 W8-LI-01); **no** `*.json` edits, no new keys. `Read more` reads sentence-case in all sampled locales (design.md §4.2). The span is `aria-hidden`; the link's `aria-label={card.title}` is unchanged.
- **a11y:** focus ring preserved (no `outline:none`, design.md §6.9/§4.10); Read-more is `aria-hidden` + non-focusable (no nested focusable, no duplicate label-less link child); reveal fires on `group-focus-within` for keyboard parity; reduced-motion → instant opacity. Deeper keyboard hardening remains Wave 11.
- **State contracts:** none (W8-LI-03 Keep); no reducer event, no `LandingCardVisualState` change; Blog stays force-`normal`.
- **Core user flow:** Blog navigation unchanged (Wave 7 whole-card `<Link>`); transition/storage/telemetry unchanged — no landing ingress, no `card_answered` (BQ-12; req-landing §13.3/§14.4).

---

## 8. Reference-only — must NOT be modified (analysis §5)

- `legacy/reference` worktree and all checkpoint worktrees (AGENTS §4; BQ-13/BQ-14).
- `docs/design/resources/superseded/**` (incl. wave3/4/5 reference CSS, `design_legacy.md`) — history, not SSOT.
- `src/app/globals.css` (Ask-First; Wave 16, BQ-04), `public/theme-bootstrap.js`, `src/features/gnb/**`, `src/features/landing/shell/page-shell.tsx`, `src/features/transition/**`, `src/features/landing/grid/use-mobile-card-lifecycle.ts`.
- **High-Risk controllers (AGENTS §4):** `use-landing-interaction-controller.ts`, `use-keyboard-handoff.ts`, and the Wave-7 Blog gates in `use-hover-intent-controller.ts` / `use-card-keyboard-handler.ts` — not touched (reveal is CSS-only).
- `tests/e2e/theme-matrix-manifest.json` (Ask-First) — stale `landing-blog-expanded` / `mobile-landing-blog-expanded` entries left **deferred** (Ask-First + BQ-07; analysis §7.1).

---

## 9. Preservation contracts (Wave 8 Exclude list; must not change — analysis §5)

- Wave 7 whole-card `<Link>` Blog navigation; Test/Unavailable triggers stay `<button>`. Read-more is a non-interactive `aria-hidden` span inside the link — never `primaryCTA`, never focusable, never a nav trigger (BQ-02).
- **No Blog expanded state** (BQ-02; design.md §7.4/§10). No `ExpandedBlogBody` / `cardSubtitleExpanded` / subtitle split reintroduced.
- Transition runtime / storage / telemetry: Blog produces no landing ingress and no `card_answered` (BQ-12; req-landing §13.3/§14.4); `src/features/transition/**` untouched.
- Test & Unavailable card visuals and tag-row layout unchanged (blog-gated change).
- `globals.css` / theme tokens untouched (Wave 16, BQ-04); new tokens stay scoped in `landing-grid-card.module.css` with design.md-matching values; existing `--normal-*`/`--expanded-*` not refactored (project-rules §Visual-Design).
- Existing collapsed focus ring preserved for Blog (design.md §6.9; do not regress §4.10).
- No visual-regression baseline regeneration (BQ-07); no `qa:visual:full`.
- GNB / mobile menu excluded (BQ-03).
- `data-testid`, semantic link, `aria-label`, inert/aria-disabled a11y guards preserved (req-landing §14.4).

---

## 10. Decisions confirmed before execution

User approval on 2026-06-03 accepted the recommended defaults below, including the Unit D document edits.

**Decision 1 — Blog-hover glow composite (analysis §3.1).**
Default = add to `design.md` §5.8: `--shadow-blog-hover: 0 0 0 1px var(--sage), 0 4px 14px var(--focus-ring-soft);` and cross-reference it from §7.4 (design.md feedback path, AGENTS §8). The scoped `landing-grid-card.module.css` `--blog-hover-shadow` mirrors this literal value. Include this design.md amendment in the Wave 8 change set (Unit D).
- *Alternative if declined:* issue the composite as a BQ-21 supplemental scoped-CSS clarification logged in the Decision Register instead of amending design.md. (Implementation tokens are identical either way.)

**Decision 2 — Stale-debt sync boundary (analysis §7.2 / §7.3).**
Default = within Wave 8's doc step (Unit D): sync the contradictory `req-landing.md` §6.5 / §6.6 Blog-Expanded rows to the whole-card-link contract, and amend `design.md` §7.3 to drop the blog-expanded sentence. Defer §1.3 / §8.5 prose to Wave 14. Theme-matrix manifest entries (§7.1) deferred (Ask-First + BQ-07).
- *Alternative if declined:* defer all stale-debt sync to Wave 14; Units A–C (code) proceed unchanged, Unit D shrinks to only the Decision-1 design.md token (if approved).

---

## 11. Implementation outcome

Implementation completed on 2026-06-03 after user approval. No branch/push/merge/checkpoint work was performed. `legacy/reference`, checkpoint worktrees, `globals.css`, controllers/hooks, transition/storage/telemetry, GNB/mobile menu, locale message files, and `tests/e2e/theme-matrix-manifest.json` were not modified.

- Unit A red: `npm test -- tests/unit/landing-card-contract.test.ts` failed on missing `blogReadMore`; `npx playwright test tests/e2e/grid-smoke.spec.ts --grep "blog Read more"` failed on missing `blogReadMore`.
- Unit B/C/D/E green: Blog-only `Read more →` is non-interactive (`aria-hidden`, no `tabindex`, no `primaryCTA`), desktop hover/focus reveal is CSS-only, mobile tap mode keeps it visible, and Blog remains whole-card link navigation.
- Final validation: `npm run lint`, `npm run typecheck`, `npm test` (73 files / 485 tests), `npm run build`, `PLAYWRIGHT_SERVER_MODE=preview npx playwright test tests/e2e/grid-smoke.spec.ts --workers=1` (20/20), Browser mobile check (`interactionMode=tap`, opacity `1`, href `/en/blog/ops-handbook`), Browser desktop computed style check (resting transparent border/normal shadow/opacity `0`; hover sage border + `rgba(92, 142, 120, 0.22)` glow + opacity `1`).
