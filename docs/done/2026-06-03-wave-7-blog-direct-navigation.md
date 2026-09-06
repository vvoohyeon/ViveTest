# Wave 7 — Blog Direct Navigation Behavior — Implementation Plan

- **Date:** 2026-06-03
- **Wave:** 7 (Blog direct navigation behavior)
- **Task mode (this doc):** Plan Only → next step Implementation.
- **Risk:** High. **Handoff:** Wave 8 (Blog normal/active visual).
- **Basis:** Wave 7 BQ-19 Analysis (`docs/plans/2026-06-03-wave-7-blog-direct-navigation-analysis.md`) + R1/R2/R3 addendum. This plan **consumes** that analysis as the approved basis and does not re-run it.
- **Approach:** Approach 1 — controller-gated rewire. Reuse `src/features/transition/**` **unmodified**.

## Gate authorization (verbatim)

```
Logic Improvement: [W7-LI-01, W7-LI-02, W7-LI-03, W7-LI-04, W7-LI-05] approved
— apply per analysis report 2026-06-03, with refinements R1 (modifier/middle-click
passthrough), R2 (link-semantic keyboard activation: Enter-only, no Space hijack),
R3 (mobile scroll-on-blog-card must-not-navigate E2E assertion);
O1=(a), O2=(a), O3=update req-landing §8.6/§13.3/§14.4 trigger wording in-wave,
O4=immediate-nav, O5=defer-visual.
```

**Landing rule:** W7-LI-01…05 are a single indivisible unit. Partial landing leaves blog with no working navigation path. The wave is "done" only when every step below has landed and all gates pass.

---

## 1. All files to be modified

### Source (High-Risk + central render)
| File | Change | Candidate(s) |
|---|---|---|
| `src/features/landing/grid/landing-grid-card.tsx` | Blog card trigger → semantic `<Link>` (`<a>`); test/unavailable keep `<button>`. Remove blog Expanded render (`ExpandedBlogBody`, `ExpandedBlogSubtitleContinuity`, blog branch of `ExpandedCardBody`, blog `desktop-continuity` subtitle split + plumbing, `forwardBlogDestinationCtaClick`, `onPrimaryCtaClick` prop). | W7-LI-01, W7-LI-04 |
| `src/features/landing/grid/use-landing-interaction-controller.ts` (**High-Risk**, AGENTS §4) | `handleCardClick`: add `card.type === 'blog'` branch (desktop + mobile) → R1 modifier/button guard → `onPrimaryCtaSelect?.(card)` (= `beginBlogTransition`) + `beginTransition(card.variant)` + `preventDefault()`. Remove `handlePrimaryCtaClick` + `onPrimaryCtaClick` from the returned bindings (fold its body into the blog branch). Keep `handleAnswerChoiceSelect` and the test branch byte-identical. | W7-LI-02, W7-LI-05, R1 |
| `src/features/landing/grid/use-card-keyboard-handler.ts` (**High-Risk-adjacent**: implementation behind `use-keyboard-handoff.ts`) | Blog gate: Enter activates via native `<a>` click (do **not** dispatch `CARD_EXPAND`); **do not intercept Space** for blog (R2). Blog `onFocus` must focus **without** expanding (must not set `expandedCardVariant` to the blog variant) and must collapse any prior expanded test card. Keep the test `<button>` Enter+Space → `CARD_EXPAND` path byte-identical. | W7-LI-03, R2 |
| `src/features/landing/grid/use-hover-intent-controller.ts` (**High-Risk-adjacent**) | Blog gate in `resolveHoverHandlers`: hovering a blog card collapses any prior expanded test card but **never schedules/dispatches `CARD_EXPAND`** for blog; `onMouseLeave` no-op for blog. Test hover path unchanged. | W7-LI-03 |

> `src/features/landing/grid/use-mobile-card-lifecycle.ts` (**High-Risk**) is **NOT modified** — blog simply never enters it (the controller routes blog mobile tap to navigation). Keeping it off the change set reduces High-Risk surface (W7-LI-05/O4).
> `src/features/transition/**` (**High-Risk**) is **NOT modified** — `beginBlogTransition`/`beginLandingTransition` already produce the exact whole-card-nav side effects.
> `src/features/landing/grid/landing-card-title-continuity.tsx` — remove the now-unused `useLandingCardSubtitleSplit` **call** in the card; remove the export/helper **only if** no remaining consumer (verify at implementation; `useLandingCardTitleSplit` stays — still used for the test expanded title). Pre-existing `landing-grid-card.tsx` is 1291 lines (already > 500); Wave 7 **net-reduces** it. No size-driven refactor is in scope — do not expand scope to split the file.

### Tests (see §5 for the full matrix)
`tests/unit/landing-card-contract.test.ts`, `tests/unit/landing-interaction-controller-handlers.test.ts`, `tests/e2e/grid-smoke.spec.ts`, `tests/e2e/state-smoke.spec.ts`, `tests/e2e/transition-telemetry-smoke.spec.ts`, `tests/e2e/routing-smoke.spec.ts`, `tests/e2e/a11y-smoke.spec.ts`. (`tests/e2e/helpers/landing-fixture.ts` reused as-is.)

### Docs (O3 — in-wave trigger-wording sync only)
`docs/req-landing.md` — **§8.6 (line 631)** and **§14.4 (line 1049)** trigger wording only. **§13.3 side-effect wording preserved unchanged.** (Other stale references found by the O3 sweep are **not** edited here — see §11.)

---

## 2. Relevant SSOT contracts (Task Routing Table)

| Change area | SSOT contract | Project rules | Verify |
|---|---|---|---|
| Blog whole-card navigation, transition | `req-landing.md §8.6, §13.3, §14.4` | `project-rules.md §Blog-Telemetry-Theme` | `verification-commands.md §telemetry` |
| Routing / route variant / redirect | `req-landing.md §5.4` | `project-rules.md §Architecture` | `verification-commands.md §routing` |
| a11y (semantic trigger, focus boundary, Esc) | `req-landing.md §9.1, §9.2` | `project-rules.md §Architecture` | `verification-commands.md §landing` |
| Card render seam / preview boundary | `req-landing.md §6.5, §6.6, §12.6` | `project-rules.md §VariantRegistry` | `verification-commands.md §variant-registry` |
| Visual intent only (no skin) | `design.md §7.4` (BQ-21) | `project-rules.md §Visual-Design` | — |
| Decisions of record | `decision-register.md` BQ-02/07/12/18/19/21 | — | — |

---

## 3. Impact assessment (AGENTS §7)

- **Shared shell / GNB:** none. GNB transition-overlay behavior is driven by the unchanged transition runtime; source-GNB-persist-until-destination-ready is preserved because `beginBlogTransition` is reused verbatim.
- **Localization:** `readMore` key exists in all **12** locale files (`src/messages/*.json`). It is **kept** (Wave 8 reuses it for the tag-row `Read more →` label). No message edits. Net locale impact: zero.
- **a11y:** blog primary trigger becomes a semantic `<a>` (§9.2 — correct for URL navigation); keyboard activation is **Enter-only** (native link semantics, R2 — Space must not be hijacked); focus ring stays on the card-shell outer edge (§9.1 — the `<a>` spans the same shell region the `<button>` did); Esc precedence unaffected (blog never expands, so `collapseExpandedCard` is a no-op for blog). No nested interactive control (`Read more` `<Link>` removed → no `<a>`-in-`<a>`).
- **State contracts:** the interaction reducer (`interaction-state.ts`) is **unchanged**. Blog simply never becomes `expandedCardVariant`. Test single-expand, hover-lock, keyboard-mode, mobile lifecycle reducers untouched.
- **Core user flow:** test card expand/answer/transition path is **byte-identical**. Blog flow changes from "expand → Read more CTA" to "whole-card click/tap → navigate." Blog mobile flow changes from "tap → mobile expanded lifecycle" to "tap → navigate."
- **Responsiveness/perf:** removing the blog Expanded render drops the per-frame blog subtitle-split measurement and the blog desktop/mobile expanded subtree. Net reduction.

---

## 4. Ordered implementation sequence (commit-level)

> TDD is mandatory: High-Risk files are in the change set (CLAUDE.md Skill Routing → "Define failing tests before implementation"). New guard tests are written failing in Step 1.

**Step 1 — Failing guard tests (TDD anchor).**
Add the new assertions (red): blog stays `data-card-state="normal"` on hover/tap/focus with no `expandedShell`/`expandedBody`/`cardSubtitleExpanded`; mobile blog tap navigates and `mobileLifecycleState` never owns a blog variant; modifier/middle-click on a blog card opens a new tab and does **not** begin a transition (R1); keyboard Enter on a focused blog card navigates while Space does **not** activate (R2); mobile scroll/drag starting on a blog card does **not** navigate (R3).
Verify: tests fail for the right reasons (`npm test`, targeted `test:e2e:smoke`).

**Step 2 — Controller blog navigation gate (W7-LI-02 + R1 + W7-LI-05).**
`use-landing-interaction-controller.ts`: in `handleCardClick`, add a `card.type === 'blog'` branch covering desktop **and** mobile: R1 guard (`event.button !== 0 || metaKey || ctrlKey || shiftKey || altKey` → early return, no transition, no `preventDefault`) → `onPrimaryCtaSelect?.(card)` (= `beginBlogTransition`) → on success `beginTransition(card.variant)` → `event.preventDefault()`. Remove `handlePrimaryCtaClick` and the `onPrimaryCtaClick` binding from `resolveCardInteractionBindings`. Keep `onPrimaryCtaSelect` controller input (wired to `beginBlogTransition` in `landing-catalog-grid.tsx`). Test branch + `handleAnswerChoiceSelect` unchanged.
Verify: `lint`, `typecheck`, controller unit tests.

**Step 3 — Card render: blog `<a>` trigger + remove blog expanded path (W7-LI-01 + W7-LI-04).**
`landing-grid-card.tsx`: render the root trigger as `<Link href={buildLocalizedPath(RouteBuilder.blogArticle(card.variant), locale)} …>` for blog (carry over `resolvedTriggerClassName`, data attributes, `tabIndex`, `onFocus`, `onKeyDown`, `onClick`); keep `<button type="button">` for test/unavailable. Remove `ExpandedBlogBody`, `ExpandedBlogSubtitleContinuity`, the blog branch of `ExpandedCardBody`, blog `blogSubtitlePresentation`/`blogSubtitleSplit` plumbing through `ExpandedCardBodyProps`/`DesktopExpandedShellProps`, the `useLandingCardSubtitleSplit` call, `forwardBlogDestinationCtaClick`, and the `onPrimaryCtaClick` prop. `DesktopExpandedShell`/mobile-expanded body become test-only.
Verify: `lint`, `typecheck`, `landing-card-contract` (after Step-5 test updates), `build`.

**Step 4 — Suppress hover + keyboard expand for blog (W7-LI-03 + R2).**
`use-hover-intent-controller.ts`: blog branch in `resolveHoverHandlers` — collapse any prior expanded test card, never schedule/dispatch `CARD_EXPAND` for blog; `onMouseLeave` no-op for blog. `use-card-keyboard-handler.ts`: blog — Enter relies on native `<a>` click (no `CARD_EXPAND`), **Space not intercepted**; `onFocus` focuses without expanding (must not set `expandedCardVariant` to the blog variant) and collapses any prior expanded test card. Test path byte-identical.
Verify: `lint`, `typecheck`, hover/keyboard unit tests, `a11y-smoke`.

**Step 5 — Test suite updates/removals (§5).**
Apply the remove/update/no-change matrix; make Step-1 guards green.
Verify: `npm test` green; `test:e2e:smoke` green.

**Step 6 — Doc sync (O3, in-wave).**
`req-landing.md` §8.6 (line 631) and §14.4 (line 1049): change blog **trigger** wording from "Read more" to whole-card navigation. **Do not** alter side-effect wording (no ingress, no `card_answered`, pending transition + return scroll + `transition_start`); §13.3 stays unchanged.
Verify: manual read-through; the side-effect contract sentences are untouched.

**Step 7 — Full gate run.**
`npm run lint` → `npm run typecheck` → `npm test` → `npm run build`, then the E2E in §6. Wave is done only when all pass.

---

## 5. Test plan (10 mapped specs from Analysis §1.10 + new guards)

**Remove** (blog no longer has an Expanded state):
- `tests/unit/landing-card-contract.test.ts` — "renders Blog Expanded subtitle/meta/primaryCTA contract" (`:189-219`); "keeps desktop blog expanded subtitle continuity" (`:221-239`).
- `tests/e2e/grid-smoke.spec.ts` — "blog subtitle continuity … expanded overflow" (`:516-575`).
- `tests/e2e/transition-telemetry-smoke.spec.ts` — "blog mobile open and close keep subtitle continuity" (`:879-917`).

**Update**:
- `tests/e2e/transition-telemetry-smoke.spec.ts` — the three blog-nav tests (`:388-394`, `:397-421`, `:423-479`): replace the two-step `trigger.click()` + `[data-slot="primaryCTA"].click()` with a **single whole-card click**. Keep assertions: `card_answered`=0, `transition_start`=1, `transition_complete`=1, source GNB persists until destination-ready, return-scroll restored once.
- `tests/e2e/routing-smoke.spec.ts` — "blog detail list navigation and landing CTA" (`:211-224`): single whole-card click.
- `tests/e2e/a11y-smoke.spec.ts` — blog nav (`:164-170`): single whole-card click + assert the blog primary trigger is a semantic `<a>` (has `href`).
- `tests/unit/landing-interaction-controller-handlers.test.ts` — blog CTA callback identity (`:176-205`): retarget to the whole-card blog activation handler (`onClick`), drop `onPrimaryCtaClick`.

**No change** (route-level / runtime-level, independent of card interaction):
- `tests/e2e/routing-smoke.spec.ts` — blog index/detail direct entry + invalid/non-enterable redirect (`:196-234`).
- `tests/unit/landing-transition-runtime.test.ts` — blog `targetType`, no-ingress (`:70-131`).
- `tests/unit/blog-server-model.test.ts`, `tests/unit/route-builder.test.ts` — unaffected.

**New guards** (added in Step 1):
- **Blog-no-expand:** on hover/tap/focus the blog card keeps `data-card-state="normal"`; no `[data-slot="expandedShell"]` / `[data-slot="expandedBody"]` / `[data-slot="cardSubtitleExpanded"]` for blog (grid/state-smoke).
- **Test→blog handoff:** hovering from an expanded test card onto a blog card collapses the test card and does **not** expand blog.
- **Mobile-tap-navigates (O4):** blog mobile tap navigates to `/{locale}/blog/{variant}`; `mobileLifecycleState` never owns a blog variant; no transient shell / scroll lock for blog.
- **R1 modified/middle-click:** Cmd/Ctrl/Shift/Alt+click or middle-click on a blog card opens a new tab and does **not** write a pending transition / fire `transition_start`.
- **R2 keyboard:** focused blog card — Enter navigates; Space does not activate.
- **R3 mobile scroll/drag:** a scroll/drag gesture starting on a blog card does not trigger navigation.

---

## 6. High-Risk dimensions per change + mandatory E2E (AGENTS §4/§5)

**High-Risk files touched:** `use-landing-interaction-controller.ts` (listed §4); `use-card-keyboard-handler.ts` / `use-keyboard-handoff.ts` and `use-hover-intent-controller.ts` (sub-hooks of High-Risk controllers — treated with High-Risk rigor). `use-mobile-card-lifecycle.ts` and `src/features/transition/**` are **not modified**.

| Change | Risk dimension |
|---|---|
| W7-LI-01 semantic `<a>` | a11y · design-system consistency |
| W7-LI-02 controller nav gate (+R1) | usability · a11y |
| W7-LI-03 suppress hover/keyboard expand (+R2) | a11y · usability |
| W7-LI-04 remove blog expanded render | responsiveness · performance |
| W7-LI-05 blog out of mobile lifecycle (O4/R3) | usability · responsiveness |

**Mandatory E2E (min: routing-smoke + transition-telemetry-smoke; run via `npm run test:e2e:smoke` = `PLAYWRIGHT_SERVER_MODE=preview playwright test --grep @smoke`):**
1. routing-smoke: blog whole-card click → `/{locale}/blog/{variant}`; index/detail direct entry + invalid/non-enterable (`burnout-risk`) redirect unchanged.
2. transition-telemetry-smoke: `card_answered`=0, `transition_start`=1, `transition_complete`=1, source GNB persists until destination-ready, return-scroll restored once.
3. a11y-smoke: blog trigger is semantic `<a>`; Enter navigates; focus = card shell; axe clean.
4. grid/state-smoke: blog-no-expand guard; test→blog handoff collapse; test single-expand intact.
5. mobile-tap-navigates (O4) + `mobileLifecycleState` never owns blog; R3 scroll-no-nav.
6. R1 modified/middle-click opens new tab, no transition.

---

## 7. Validation gates within wave scope

Basic Gates in order: `npm run lint` → `npm run typecheck` → `npm test` → `npm run build`. Then the E2E in §6. **No `npm run qa:visual:full`; no visual-regression baseline regeneration (BQ-07); no `qa:gate`/`qa:gate:once` unless investigating flakiness.**

---

## 8. Rebuild fields (AGENTS §7)

- **Wave:** 7. **Task mode:** Plan Only (this doc) → Implementation (next prompt, carrying the gate token).
- **Active workspace:** local `main` (`/Users/woohyeon/Local/ViveTest`).
- **Reference-only / must NOT modify:** `legacy/reference` worktree; all checkpoint worktrees; `docs/design/resources/superseded/**`; `src/app/globals.css` (Wave 16, BQ-04); visual-regression baselines under `tests/e2e/*-snapshots/` (BQ-07); **`src/features/transition/**` (reused unmodified)**; **`src/features/landing/grid/use-mobile-card-lifecycle.ts` (not modified)**.
- **Preservation contracts (Analysis §4 + Wave 7 Exclude):** test expand/answer + single-expand intact; test transition still writes ingress + `card_answered`, blog still writes neither; blog article-id (`card.variant`) → `RouteBuilder.blogArticle` → route-variant resolution + destination-ready/complete handshake preserved; invalid/non-enterable blog → localized blog index redirect (route-level, unchanged); resolver/registry boundary (`resolveTestPreviewPayload`, no raw fixture reads); routing only via `RouteBuilder` + `buildLocalizedPath`; single telemetry consent source; `readMore` i18n key kept; a11y semantic trigger + card-shell focus + Esc precedence; `design.md` visual-only — **no** blog skin/CTA/reveal work; no `globals.css`; no baseline regen.
- **Applicable validation gates:** §7 Basic Gates + §6 E2E.

---

## 9. Rollback strategy

- **Range anchor:** checkpoint `w07-10` (`checkpoint/w07-10-blog-unavailable-grid`) — verification/rollback anchor only; do not implement there.
- **Per-candidate revert:** W7-LI-01/04 are isolated to `landing-grid-card.tsx` (revert the trigger branch + restore the removed expanded subtree). W7-LI-02/R1 isolated to the controller `handleCardClick` blog branch (restore `handlePrimaryCtaClick` + `onPrimaryCtaClick`). W7-LI-03/R2 isolated to the hover + keyboard handlers. W7-LI-05/O4 has no standalone diff (falls out of W7-LI-02). Because `src/features/transition/**` and `use-mobile-card-lifecycle.ts` are untouched, a full revert restores prior behavior without touching the runtime/storage/telemetry layers.

---

## 10. Explicit out-of-scope (Wave 8 / Wave 16)

- All **Wave 8** blog visual: the `Read more →` tag-row label, its desktop hover-reveal / mobile-always-visible behavior, the blog sage-border + focus-ring hover skin, `READ` eyebrow removal (design §7.4). Wave 7 leaves blog cards visually unchanged in the normal state; between Wave 7 and Wave 8 a blog card navigates on whole-card click with **no visible Read-more affordance** (O1=(a), O5=defer-visual).
- Any `globals.css` / theme-token work (Wave 16, BQ-04).
- Visual-regression baseline regeneration (BQ-07).

---

## 11. Decisions requiring user confirmation

The O3 doc sweep found **stale "Read more = trigger" references outside §8.6/§13.3/§14.4.** Per the gate's O3 instruction these are **listed, not silently edited.** Confirm whether to also sync them in this wave (recommend: yes, in Step 6, to keep req-landing internally consistent) or defer:

- `req-landing.md §2` Terms — line 32: "Expanded … Blog는 Read more CTA 허용" (Expanded as blog entry).
- `req-landing.md §6.6` — lines 274–275: "Blog Expanded: … `primaryCTA(Read more)`" and **"Blog entry는 Expanded의 `primaryCTA(Read more)`에서만 시작할 수 있다."** (direct stale trigger statement).
- `req-landing.md §7` — line 385: "Blog Expanded `primaryCTA`는 1개 고정(`Read more`, i18n)."
- `req-landing.md §8.5` — line 608: "Mobile Expanded 내부 상호작용 우선순위 … `CTA(응답 A/B, Read more) > X 버튼 …`" (blog no longer mobile-expands).
- `req-test.md` — line 1130: "블로그 카드 Read more CTA" (cross-doc reference).

> Lines 31 and 262 ("Normal/front 상태에서는 Start/Read more/A-B entry CTA 비노출") describe the **Normal** state and remain **correct** (blog normal card still shows no entry CTA in Wave 7) — not stale, no edit.

**Separately surfaced (Wave 8 visual doc, not a Wave 7 edit):** `design.md §7.3` line 297 still describes a "blog expanded card … with a `Read more →` CTA below the meta," which contradicts §7.4 line 301 ("No expanded state"). `design.md` is visual-intent-only (BQ-21) and Wave 8 scope — flag for Wave 8 reconciliation; do **not** edit in Wave 7.

If the user does not expand O3 scope, Step 6 edits **only** §8.6 + §14.4 and these remain as listed for a later doc-sync pass.

---

## 12. Gate token for the Implementation prompt (Step 2 → next)

The implementation prompt must carry:

```
Logic Improvement: [W7-LI-01, W7-LI-02, W7-LI-03, W7-LI-04, W7-LI-05] approved
— apply per analysis report 2026-06-03 (R1/R2/R3; O1=a, O2=a, O3, O4, O5).
```

This document writes no code and modifies no other file. Implementation belongs to the next prompt.
