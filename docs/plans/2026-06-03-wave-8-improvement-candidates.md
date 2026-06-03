# Wave 8 — Blog normal/active visual · Implementation Review & Improvement Candidates

> **Purpose:** post-implementation optimality review of the Wave 8 change set, plus prioritized improvement candidates for a **separate implementation session**. Each candidate is self-contained (file path · current code · proposed change · rationale · risk/rollback · recommendation).
> **Inputs:** [`2026-06-03-wave-8-blog-visual-analysis.md`](2026-06-03-wave-8-blog-visual-analysis.md) (BQ-19 Step 1) · [`2026-06-03-wave-8-blog-visual.md`](2026-06-03-wave-8-blog-visual.md) (approved plan + §11 outcome).
> **Mode of this doc:** review/analysis only. No source/test/token/doc was modified to produce it.

---

## 0. Verification result (current working tree)

The implemented change set was re-verified end-to-end this session:

| Gate | Result |
|---|---|
| `npm run lint` | ✅ clean |
| `npm run typecheck` | ✅ clean (typegen + tsc) |
| `npm test` | ✅ **485/485** (73 files), incl. the new blog contract assertions |
| `npm run build` | ✅ all 8 routes generated |

Blog-specific coverage confirmed present and green: `landing-card-contract.test.ts` (blog `Read more →` present · `aria-hidden` · no `tabindex` · not `primaryCTA`; test/unavailable rows carry no `blogReadMore`), `landing-data-contract.test.ts` (legacy `primaryCTA` rejected, `copy.readMore` rendered as `blogReadMore`), and `grid-smoke.spec.ts` (desktop rest→hover→focus opacity reveal; mobile always-visible + whole-card nav; empty-tags blog still shows Read-more). BQ-07 respected (no baseline regeneration; no `qa:visual:full`).

**Conclusion:** the implementation is **correct, complete, and faithful to the approved plan.** It honors every preservation contract (Wave-7 whole-card `<Link>`, no Blog expanded/BQ-02, transition/storage/telemetry untouched/BQ-12, test/unavailable byte-identical, `globals.css` untouched/BQ-04, focus ring preserved, no baseline regen/BQ-07). The candidates below are **refinements, not defect fixes** — with one exception (**IC-1**, a latent touch-device correctness gap). Nothing here is required for Wave 8 to be considered done; they are quality/fidelity/maintainability upgrades.

---

## 1. What was implemented (baseline for the candidates)

- **`landing-grid-card.tsx`** ([NormalCardTagRow](../../src/features/landing/grid/landing-grid-card.tsx:416)): blog-gated `Read more →` as a non-interactive `<span data-slot="blogReadMore" aria-hidden="true">` with `ml-auto shrink-0 whitespace-nowrap text-[13px] font-medium leading-[1.35] text-[var(--muted-ink)] no-underline`; reveal via `interactionMode === 'hover' ? 'opacity-0 … group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none' : 'opacity-100'`. When present, `<ul>`+span are wrapped in `<div .landing-grid-card-tag-row flex items-center gap-3>` and the `<ul>` gets `flex-1 [flex-shrink:1]`; otherwise markup is unchanged. `readMoreLabel={isBlogCard ? copy.readMore : undefined}` threaded `LandingGridCard → NormalCardFace → NormalCardTagRow`.
- **`landing-grid-card.module.css`** ([+L12, +L35](../../src/features/landing/grid/landing-grid-card.module.css:12)): scoped `--blog-hover-border: #5c8e78;` and `--blog-hover-shadow: 0 0 0 1px var(--blog-hover-border), 0 4px 14px rgb(92 142 120 / 22%);`; selector `.root[data-card-content-type='blog']:hover { border-color: …; box-shadow: …; }`.
- **`design.md`** §5.8 (`--shadow-blog-hover`) + §7.4 cross-ref; §7.3 blog-expanded sentence removed. **`req-landing.md`** §6.5/§6.6/§6.8 Blog-Expanded rows synced to the whole-card-link contract.
- **Tests:** contract + data-contract + grid-smoke extended as above.

---

## 2. Improvement candidates (prioritized)

Priority key: **P1** = recommend adopt (correctness/clear win) · **P2** = recommend adopt (fidelity/quality) · **P3** = optional/consider · **P4** = trivial/defer. Value criteria 1–5 per BQ-18 (Modern patterns → simplicity → performance → testability → a11y).

---

### IC-1 — Gate the blog hover **skin** to hover-capable pointers (avoid sticky-hover on touch) · **P1**

- **Layer:** CSS. **Magnitude:** Low. **Value:** criterion 3 (correct behavior on touch), criterion 1 (modern capability-aware CSS).
- **Problem.** The Read-more *reveal* correctly avoids sticky-hover because it is JS-gated by `interactionMode` (mobile/`tap` ⇒ `opacity-100`, never relies on CSS `:hover`). But the hover **skin** is pure CSS `.root[data-card-content-type='blog']:hover` with **no pointer-capability gate**. On touch devices, `:hover` "sticks" after a tap until the next interaction, so the sage border + glow can latch on a blog card on mobile — exactly where design.md §7.4 wants the *always-visible Read-more* and **no** hover skin ("hover skin" is inherently a desktop affordance; mobile shows the always-visible CTA instead).
- **Current** ([module.css:35](../../src/features/landing/grid/landing-grid-card.module.css:35)):
  ```css
  .root[data-card-content-type='blog']:hover { border-color: …; box-shadow: …; }
  ```
- **Proposed.** Wrap the skin in the capability query the codebase already uses for `interactionMode` detection (and referenced in `grid-smoke.spec.ts`): `@media (hover: hover) and (pointer: fine)`. This makes the skin's trigger consistent with the reveal's hover-only intent.
  ```css
  @media (hover: hover) and (pointer: fine) {
    .root[data-card-content-type='blog']:hover { border-color: …; box-shadow: …; }
  }
  ```
- **Risk/rollback:** none meaningful — blog-scoped, removes an unintended touch state; revert = unwrap. **Recommendation: adopt.** (Combine with IC-9, which changes the selector.)
- **Validation:** desktop hover skin unchanged; on a touch emulation, tapping a blog card no longer latches the sage skin. Computed-style check optional (see IC-5).

---

### IC-2 — Animate the hover skin in sync with the Read-more fade (calm motion, design §8) · **P2**

- **Layer:** CSS. **Magnitude:** Low. **Value:** criterion 1/2 (design-system motion consistency).
- **Problem.** The Read-more text fades over `140ms` (`transition-opacity duration-[140ms]`), but the sage **border + glow snap instantly** (no `transition` on the blog card's `border-color`/`box-shadow`). design.md §4.8/§8 favor calm color/shadow transitions; the mismatched snap-vs-fade reads slightly disjointed on hover-in/out.
- **Proposed.** Add a reduced-motion-safe transition on the blog card's resting state so the skin animates with the reveal (same 140ms, same easing posture). Scope strictly to blog (blog never expands, so the root `box-shadow`/`border` only ever carries the normal-rest → blog-hover values — no interference with the desktop expanded-shell shadow animations, which live on separate `.expanded*` elements).
  ```css
  .root[data-card-content-type='blog'] {
    transition: border-color 140ms ease, box-shadow 140ms ease;
  }
  @media (prefers-reduced-motion: reduce) {
    .root[data-card-content-type='blog'] { transition: none; }
  }
  ```
- **Risk/rollback:** low; isolated to blog; revert = drop the rule. **Recommendation: adopt** (pairs naturally with IC-1/IC-9).
- **Note:** keep the resting `--normal-card-shadow` and transparent border so the transition runs *from* the calm rest state *to* the hover skin and back.

---

### IC-3 — Style the hover skin via a **semantic CSS-module class**, not a `data-*` attribute selector · **P2**

- **Layer:** CSS + component. **Magnitude:** Low–Medium. **Value:** criterion 2 (maintainability; honors the file's own stated convention).
- **Problem.** `landing-grid-card.module.css` explicitly documents its convention at [line 31](../../src/features/landing/grid/landing-grid-card.module.css:31): *"Semantic style classes are the CSS contract; data-* stays on the DOM as QA/debug anchors only."* The new hover skin styles through `[data-card-content-type='blog']` — i.e. it makes a `data-*` attribute part of the **style contract**, contradicting that rule. Every other stateful style in this file is a `styles.*` class toggled in the component (`styles.desktopOverlayLayer`, `styles.normalThumbnail`, `styles.mobileTransientOpening`, …).
- **Proposed.** Add a module class (e.g. `.blogCard`) and toggle it in the component, matching the established pattern:
  - module.css: `.root.blogCard:hover { … }` (and, with IC-2, `.root.blogCard { transition: … }`).
  - `landing-grid-card.tsx` `resolvedRootClassName`: add `isBlogCard && styles.blogCard` to the existing `joinClassNames(LANDING_GRID_CARD_ROOT_CLASSNAME, styles.root, …)` list ([:910](../../src/features/landing/grid/landing-grid-card.tsx:910)). `isBlogCard` is already computed.
- **Risk/rollback:** low; behavior identical, hook source changes from attribute to class; revert = swap back. **Recommendation: adopt** — it is the idiomatic fix and removes the only convention violation in the change set. (Bundle IC-1 + IC-2 + IC-3 into one CSS/markup pass.)

---

### IC-4 — Confirm the intended sage **edge weight** (border + shadow-ring currently double to ~2px) · **P2 (design sign-off)**

- **Layer:** tokens / design.md. **Magnitude:** Low. **Value:** visual fidelity.
- **Observation.** On hover the card gets **both** a 1px sage `border-color` **and** the shadow's leading `0 0 0 1px var(--sage)` ring (just outside the border box) **and** the glow. The two solid 1px sage bands sit adjacent → an effective ~2px solid sage edge before the glow. This faithfully matches design.md §5.8/§7.4 *as written* (`border` + `--shadow-blog-hover` whose first layer is a 1px ring), but the analysis (§3.1) explicitly flagged the border/ring as "redundant-by-design … the implementer may drop the inner ring if the reserved border alone reads cleanly." The current build kept both — a deliberate-looking 2px edge that was never explicitly confirmed.
- **Proposed (pick one, then make design.md + token agree):**
  - **(a)** Keep the 1px border as the crisp edge; **drop** the `0 0 0 1px` ring from `--shadow-blog-hover`, leaving only the glow: `--shadow-blog-hover: 0 4px 14px var(--focus-ring-soft);` (and the scoped `--blog-hover-shadow` to match). → single 1px sage edge + glow.
  - **(b)** Keep the shadow ring as the edge; make the hover **border transparent** so only the ring renders. → single 1px sage edge + glow, no layout-box dependency.
  - **(c)** Keep both (current) — explicitly bless the 2px edge in design.md §7.4 so it stops reading as an oversight.
- **Risk/rollback:** purely visual; revert = restore the token. **Recommendation:** raise with the user; default to **(a)** (cleanest, matches the "border + glow" wording most literally). Whichever is chosen, update **both** design.md §5.8 and the scoped `--blog-hover-shadow` so token parity holds into Wave 16.

---

### IC-5 — Add a non-baseline computed-style guard for the hover **skin** · **P3**

- **Layer:** tests. **Magnitude:** Low. **Value:** criterion 4 (testability).
- **Problem.** The e2e asserts the Read-more **reveal** (opacity) thoroughly, but nothing guards the **skin** itself (border-color/box-shadow change on hover). BQ-07 forbids visual baselines, but a computed-style assertion is baseline-free and would catch a regression of the sage edge/glow.
- **Proposed.** In `grid-smoke.spec.ts`, extend the existing blog-hover test: before hover, read `getComputedStyle(card).borderTopColor` / `boxShadow`; after `trigger.hover()`, assert the border resolves to the sage RGB (`rgb(92, 142, 120)`) and `boxShadow` is non-`none`. (If IC-1 lands, run it under a desktop viewport where `(hover: hover)` holds.)
- **Risk/rollback:** test-only. **Recommendation: adopt** alongside IC-1/IC-4 so the skin has explicit, baseline-free coverage.

---

### IC-6 — Localization robustness: longest `Read more` on the narrowest blog card · **P3 (QA check, likely no code change)**

- **Layer:** i18n / layout (validation). **Magnitude:** Low. **Value:** criterion 2/5.
- **Observation.** `blogReadMore` is `shrink-0 whitespace-nowrap`; the `<ul>` is `flex-1 shrink-1 overflow-hidden`. With a long translation (e.g. `id` "Baca selengkapnya", `ru` "Читать далее", `fr` "Lire la suite") on the narrowest blog card (mobile ~390px, or a 360px expanded-row width — though blog never expands), the tags `<ul>` absorbs all the squeeze and chips truncate first; Read-more stays intact. On an extremely narrow card with a long label, tags could truncate to nothing. This is *acceptable per spec* (Read-more is the priority affordance on mobile; tags truncate gracefully), so it is likely **no code change** — but it was never explicitly validated across all 12 locales.
- **Proposed.** A one-off manual/automated check: render `PRIMARY_BLOG_VARIANT` at the narrowest mobile width across the 4 longest-label locales and confirm Read-more stays on one line and tags truncate (don't wrap/overflow). If wrapping/overflow appears, consider allowing the label to truncate (`max-w` + ellipsis) as a fallback. **Recommendation: verify; change only if the check fails.**

---

### IC-7 — Decide whether keyboard **focus** should also apply the hover skin · **P3 (likely keep as-is)**

- **Layer:** CSS. **Magnitude:** Low. **Value:** criterion 5 (a11y parity / consistency).
- **Observation.** On hover, the card shows skin + Read-more reveal. On keyboard focus, it shows the **focus ring** (`.root:not(.desktopOverlayLayer):has(:focus-visible)`) + Read-more reveal (`group-focus-within`) but **not** the sage skin. Focus visibility is **not** regressed (the focus ring is the authoritative indicator per analysis §3.2), so this is defensible. The asymmetry is intentional-ish: focus-ring is the focus signal, hover-skin is the hover signal.
- **Proposed (only if the user wants symmetry):** add `:focus-within` to the skin selector so focus also gets the sage edge/glow under it. **Recommendation: keep as-is** unless the user prefers visual symmetry; deeper keyboard/a11y polish is Wave 11 scope and should be decided there to avoid double-work.

---

### IC-8 — Pure-CSS `@media (hover)` reveal vs. JS `interactionMode` (systemic; defer) · **P4**

- **Layer:** component/CSS. **Magnitude:** Medium (systemic). **Value:** criterion 1/3 (less JS), but **against** criterion 2 (consistency).
- **Observation.** The reveal's desktop/mobile branch is driven by the JS `interactionMode` prop — **consistent** with `UnavailableCardStatusOverlay`, which uses the identical discriminator. A pure-CSS alternative (`opacity-100` default; `@media (hover: hover) and (pointer: fine)` → `opacity-0` + `group-hover/group-focus-within:opacity-100`) would drop the JS dependency and react live to capability changes, but would diverge from the established overlay pattern for a single component.
- **Recommendation: defer.** Don't refactor just the blog reveal; if "media-query-driven reveal" is desired, do it **systemically** for the unavailable overlay + blog together in a later landing pass (candidate for Wave 14). Logged here so the choice is explicit, not accidental.

---

### IC-9 — Minor simplification (trivial) · **P4**

- **Layer:** component. **Magnitude:** trivial. **Value:** criterion 2.
- Two harmless redundancies: (a) the wrapper `<div .landing-grid-card-tag-row>` carries `min-h-7` while the inner `<ul>` also carries `min-h-7` (from `LANDING_GRID_CARD_TAGS_CLASSNAME`) — the inner one is now redundant when wrapped; (b) `no-underline` on a `<span>` (spans aren't underlined unless styled) is defensive but unnecessary. Both are safe to keep.
- **Recommendation: defer / optional.** Not worth a dedicated change; fold into IC-1/IC-3 only if that file is already open. Note: `no-underline` is cheap insurance against a future global `a *` or link-reset rule, so keeping it is reasonable.

---

## 3. Suggested batching for the implementation session

- **Batch A (one CSS/markup pass — recommended): IC-3 + IC-1 + IC-2.** Introduce `styles.blogCard` (IC-3), move the skin onto it, wrap in `@media (hover: hover) and (pointer: fine)` (IC-1), and add the reduced-motion-safe `transition` (IC-2). One coherent diff in `landing-grid-card.tsx` + `landing-grid-card.module.css`.
- **Batch B (design sign-off): IC-4.** Resolve the sage edge weight; update design.md §5.8/§7.4 **and** the scoped token together.
- **Batch C (tests): IC-5** (+ IC-6 as a QA check). Add the computed-style skin guard and the longest-locale narrow-card check.
- **Defer:** IC-7 (decide in Wave 11), IC-8 (systemic, Wave 14), IC-9 (optional).

**Gates for any batch:** Basic Gates in order (`lint → typecheck → test → build`) + landing interaction smoke (`grid-smoke.spec.ts`) + mobile browse check. **BQ-07: do not regenerate visual baselines / do not run `qa:visual:full`.** All changes stay blog-scoped; do not touch `globals.css` (Wave 16/BQ-04), the High-Risk controllers, transition/storage/telemetry (BQ-12), or test/unavailable visuals.

---

## 4. Summary table

| ID | Title | Layer | Priority | Recommendation |
|---|---|---|---|---|
| IC-1 | Gate hover skin to `(hover: hover)` (no sticky-hover on touch) | CSS | **P1** | Adopt |
| IC-2 | Animate skin border/glow in sync with reveal (140ms, reduced-motion safe) | CSS | **P2** | Adopt |
| IC-3 | Style skin via `styles.blogCard` class, not `data-*` selector (honor file convention) | CSS+TSX | **P2** | Adopt |
| IC-4 | Confirm sage edge weight (border+ring double to ~2px); align design.md + token | tokens/design | **P2** | Sign-off (default: drop inner ring) |
| IC-5 | Baseline-free computed-style guard for the hover skin | tests | P3 | Adopt with IC-1/IC-4 |
| IC-6 | Longest-locale `Read more` on narrowest blog card | i18n/QA | P3 | Verify; change only if it fails |
| IC-7 | Apply skin on keyboard focus too? | CSS/a11y | P3 | Keep as-is (revisit Wave 11) |
| IC-8 | Pure-CSS media-query reveal vs. JS `interactionMode` | component | P4 | Defer (systemic, Wave 14) |
| IC-9 | Trivial dedupe (`min-h-7`, `no-underline`) | component | P4 | Optional |

**Bottom line:** Wave 8 is correctly and completely implemented and passes all gates. The single highest-value follow-up is **IC-1** (touch-device correctness); **IC-2/IC-3** are clean design-system/maintainability wins; **IC-4** needs a quick design decision. Everything else is optional or better deferred to its natural wave.
