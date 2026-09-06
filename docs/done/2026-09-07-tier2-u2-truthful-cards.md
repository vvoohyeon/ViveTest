# Tier 2 · U2 — Make the existing cards tell the truth

**Date:** 2026-09-07 · **Task mode:** Implementation (documentation surface only) · **Inputs:** `docs/plans/2026-09-07-candidates_2-responsive-text-rules.md` + `candidates_5-missing-states.md`, sequenced by `2026-09-07-tier2-execution-plan.md`

---

## Shared frame

**Program.** The 2026-09-06 rebaseline (`BQ-38`) replaces waves 13–17. The repository owns one token definition under `docs/design/ds/` and pushes it one-way to **VIVE Design System v2** (`cd630eec-25e4-4613-a58f-c671c80297ca`). Sync procedure and traps: `docs/design/ds/SYNC.md`.

**Priorities.** 1 — preserve the implemented logic with no side effects. 2 — take design and interaction quality as high as it will go.

**Decisions (`BQ-38`).** **A** catalog values under VIVE names · **B** `req-landing.md` §8 frozen; M-01 resolved to `--ease-in-out` and implemented · **C** catalog card tokens and patterns frozen · **D** from `825385f6`, card components and thumbnail SVGs only.

**Boundaries held.** No runtime file changed — `git status` shows `docs/**` only. No baseline regeneration (`BQ-07`). `cd630eec` is the only push target.

**Where this sits.** step 1 `c5fc624` → step 1b `e8a453e` → tier 1 `a3a1c3e` → motion pass `484331d` → U1 font `10d6321` → **U2, this document** → U3 → U4 → design pass.

---

## What the unit claimed, and what it found

The two candidate documents make one claim between them: *a specimen states a rule its own markup contradicts.* Both were right, and executing them surfaced three more instances of the same failure — each found by rendering and measuring rather than by reading.

### Carried out as specified

**1 · The clamp is now a modifier you must ask for.** `.vt-title` and `.vt-subtitle` became unclamped bases carrying `design.md` §4.3's wrapping rule; `.vt-title--clamp1` and `.vt-subtitle--clamp2` carry the desktop-and-tablet clamp, and the three desktop specimens ask for them. The base is deliberately the safe one: forget the modifier and you get full text, which violates nothing, where the old arrangement's omission produced a clamp that violates `req-landing.md:285` and `:287` on mobile. Named for behaviour rather than tier, because one clamp serves two tiers.

**2 · The blog CTA reveal is a mechanism again.** The rest and hover specimens now carry identical markup, and `.vt-card--blog:hover` / `:focus-within` do the work. `focus-within` is load-bearing rather than decorative: the card is a link, so a keyboard user arrives by tab and never by pointer. `.vt-readmore--always` expresses the mobile case that `req-landing.md:293` requires.

**3 · The expanded surface has its own focus ring.** Three rings on three boxes — collapsed shell, expanded surface, individual choice — the same 2px sage at a 2px offset, and not interchangeable. The product keeps the first two mutually exclusive by excluding the overlay layer from its collapsed rule; here the selectors match different elements and the same exclusivity falls out.

**4 · `preview/card-states.html`.** Six tiles at 292px for the states with a visual difference, and prose for the ones without. Every tile is traced to the line that produces it.

**5 · `--blog-readmore-ink` → `--blog-read-more-ink`.** The product's spelling wins, since it is the one that survives the theme cut. One rule, one preview, same value.

### Found while doing it

**6 · D-05 stands at five.** `landing-grid-card.module.css:154` applies the legacy global `--card-shadow` — `globals.css:88`'s cool `0 14px 30px rgb(11 15 22 / 10%)` — to a focused expanded card, so its warm lift turns cool for as long as focus is inside. Missed by step 1b because that extraction read the resting and hover states and not the focused one.

**7 · D-06 — the global wrapping rule is not global.** `design.md` §4.3 declares `word-break: keep-all; overflow-wrap: anywhere` as one global rule. The product applies `overflow-wrap` unconditionally to the card title and subtitle (`tsx:212`, `:214`) and adds `word-break` only on the mobile tier (`module.css:96-100`). Unobservable on the one-line title; **visible on the two-line subtitle**, where Korean may break mid-word against the rule. The bundle follows the intent and records the gap, per the policy in `catalog-components.css`'s own header.

**8 · D-07 — a fade that never runs.** The blog CTA carries `transition-opacity duration-[140ms]` and also switches `display` on the same element, and an element with no rendered previous frame cannot transition. Measured rather than inferred: with the display switch, zero running animations and `opacity: 1` on the flip frame; an otherwise identical control without it reports one running animation and `opacity: 0`. The specimen therefore has no transition either. Which of the two declarations goes is a decision for the theme cut.

**9 · Every card in the bundle was overflowing its own padding.** No `box-sizing` reset existed anywhere in `docs/design/ds/`, so `.vt-card__pad`'s `width: 100%` plus 16px padding resolved to the full width *plus* the padding. Measured: the content box came out 290px inside a 292px card and ran 15px past its right edge, and the 397px card's thumbnail drew at 395×148 where the product draws 363×136. `catalog-components.css` states in a comment that the 16px padding "is why the thumbnail gets an even margin on all four sides" — and it did not. The product is unaffected because Tailwind Preflight resets `box-sizing` globally (`node_modules/tailwindcss/preflight.css:12`); the bundle loads no reset, so it now states the rule itself, scoped to `.vive` so it can never reach a host page.

---

## Verification

**Boundary.** `git status` shows `docs/**` only; `src/**` untouched. Documentation-only, so the basic gates are not affected and were not run.

**The modifiers changed nothing, which was the check.** Base versus branch, every existing preview measured in an iframe at 1200px: `card-test` 397×270, `card-blog` 292×264 twice, `card-unavailable` 292×230, `card-expanded` 397×268 — identical, and every component card's page height identical. The clamp split and the CTA mechanism are behaviour-preserving.

**The box-sizing correction moved geometry, deliberately.** After it, the content box resolves to 363px inside the 397px card and 258px inside the 292px card — matching the product, where the padding is inside the grid track. Three cards changed height: 397×270 → 397×258, 292×264 → 292×252, 292×230 → 292×244. The 12px on the first is exactly the thumbnail's aspect-ratio error resolving.

**Mechanism, read back from the DOM.** Rest card's CTA `display: none`; hover card's `display: flex` (blockified from `inline-flex` inside the flex row, as in the product). Title and subtitle report `-webkit-line-clamp: 1` / `2` with `word-break: keep-all` and `overflow-wrap: anywhere` on both. Clamp efficacy checked by forcing an over-long title: height stays at one line.

**Claims measured, not asserted.** The empty tags row's contribution was verified by removing the row and re-measuring: 230px → 202px, so the reserved slot is worth exactly 28px. The card-states tile annotates it with a dashed rule, labelled as an annotation in both the stylesheet and the caption, because an empty row is invisible and that is the whole difficulty.

**Viewports re-measured at each card's declared width**, with at least 24px of headroom. Four were wrong and are corrected: `card-unavailable` 470 → 480, `radius-scale` 190 → 200, `catalog-drift` 975 → 1600 (new section), `card-blog` 520 → 770 (new prose). One was badly wrong independently of this unit — **`comp-answer-button` declared 620 against a 942px body**, so it has been clipped in the pane since the motion pass created it; now 970. `card-states` is 980×1800.

**What this unit did not look at.** Mobile viewports were not entered — `card-states.html` shows the mobile lifecycle as prose and defers the sheet to U4. No card was measured with Pretendard loaded; U4 re-measures everything with the font, and any viewport here may move again. `preview/color-sage.html`, referenced by D-03 in `README.md`, exists in the Claude Design project but is not mirrored into the repo bundle, so that reference resolves on one side only — left alone, since `candidates_7` owns README value drift.

---

## Not done here, on purpose

`.vt-grid`, the row-stretch rule, the real `.vt-tags-gap` compensation and the expanded card's three-box body are U3. The mobile specimens, the thumbnail import under decision **D**, and the single measurement pass with the font are U4. Applying `.vt-choice--answer` to `test-question-client.tsx` is step 5. D-06 and D-07 are recorded, not fixed — both would need a runtime change, and `src/**` opens at the theme cut.
