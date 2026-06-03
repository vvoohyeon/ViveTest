# Wave 8 — Blog normal/active visual · Analysis-Only Report (BQ-19 Step 1)

> **Task mode:** Analysis Only. This document is the sole artifact produced. No source, test, token, or other doc was modified.
> **Wave:** 8 (Blog normal/active visual). **Prereq:** Wave 7 ✅ (whole-card `<Link>` direct navigation). **Risk:** Medium.
> **Branch:** local `main`, read/inspection only (BQ-13). Nothing branched/pushed/merged; no checkpoint or `legacy/reference` worktree touched (AGENTS §4).
> **Gate:** This is Step 1 of BQ-19. No implementation is authorized until the user reviews the `W8-LI-0n` candidates in §8 and issues a Step-2 prompt with `Logic Improvement: [IDs] approved` or `no candidates approved`.

---

## 1. Surface inventory — current Blog card render path

### 1.1 Component tree (post-Wave-7)

Entry: [`LandingGridCard`](../../src/features/landing/grid/landing-grid-card.tsx:781). The relevant flags for a Blog card:

- `isBlogCard = card.type === 'blog'` ([:820](../../src/features/landing/grid/landing-grid-card.tsx:820)).
- `resolvedState`: for blog (and unavailable), a requested `'expanded'` is forced back to `'normal'` ([:822](../../src/features/landing/grid/landing-grid-card.tsx:822)). **Blog has no expanded state** (BQ-02).
- `showDesktopExpandedShell`, `isMobileExpanded`, `showMobileTransientShell` are all gated on `isTestCard` ([:824–833](../../src/features/landing/grid/landing-grid-card.tsx:824)) — none render for Blog.

Render for a Blog card:

```
<div .landing-grid-card.group …                       ← root; data-card-content-type="blog", data-card-state="normal"
     class includes resolvedRootVisualClassName>           (shared normal skin: --normal-card-shadow + --normal-card-border)
  <Link .landing-grid-card-trigger                     ← blog branch (lines 999–1014); data-slot="primaryTrigger"
        href={buildLocalizedPath(RouteBuilder.blogArticle(card.variant), locale)}
        aria-label={card.title} tabIndex onFocus onKeyDown onClick>
    {triggerContent}                                   ← <div .landing-grid-card-content>
      <NormalCardFace presentation="collapsed" exposePublicSlots>
        <NormalCardThumbnail/>      data-slot="cardThumbnail"
        <NormalCardTitle/>          data-slot="cardTitle"
        <NormalCardSubtitle/>       data-slot="cardSubtitle"
        <NormalCardTagRow/>         data-slot="tags"           ← the tag-row seam
  </Link>
  (no DesktopExpandedShell — isTestCard gate)
  (no mobile expanded / transient — isTestCard gate)
  (no UnavailableCardStatusOverlay — not unavailable)
</div>
```

The card face for Blog is **identical to the Normal test face** because `NormalCardFace` with `presentation='collapsed'` is shared; Blog simply never enters the expanded branches.

### 1.2 The tag-row seam (`NormalCardTagRow`)

[`NormalCardTagRow`](../../src/features/landing/grid/landing-grid-card.tsx:412) renders, in order:

1. A spacing gap div (`LANDING_GRID_CARD_TAGS_GAP_CLASSNAME`, `aria-hidden`).
2. `<ul .landing-grid-card-tags …>` — `flex min-h-7 items-center gap-2 overflow-hidden`, `data-slot="tags"` (when `exposePublicSlot`), `data-tag-count`, `aria-label="Card tags"`.
3. One `<li .landing-grid-card-tag-item>` per tag, each wrapping `<span .landing-grid-card-tag-chip>` (text-only chip, `--normal-tag-*` tokens, `whitespace-nowrap`, `text-ellipsis`).

It has **no Read-more affordance today**. The chip CSS classes are tokenized via the scoped `--normal-tag-*` tokens in [`landing-grid-card.module.css` `.root`](../../src/features/landing/grid/landing-grid-card.module.css:1).

### 1.3 How the tag row is composed today for test / blog / unavailable

`NormalCardTagRow` is invoked **only** from `NormalCardFace` ([:475](../../src/features/landing/grid/landing-grid-card.tsx:475)) and `NormalCardGhostBody` ([:442](../../src/features/landing/grid/landing-grid-card.tsx:442), the invisible desktop-expanded ghost). `NormalCardFace` (collapsed presentation) is the Normal face for **all three card types**:

| Card type | Tag row source | Notes |
|---|---|---|
| **Test** | `NormalCardFace` collapsed → `NormalCardTagRow` | Also rendered in the invisible `NormalCardGhostBody` while desktop-expanded (height ghost). |
| **Blog** | `NormalCardFace` collapsed → `NormalCardTagRow` | Always collapsed (no expanded state). |
| **Unavailable** | `NormalCardFace` collapsed → `NormalCardTagRow` | Plus a separate `UnavailableCardStatusOverlay` (Wave 9 scope). |

**Consequence for Wave 8:** because the seam is shared across all three types, the `Read more →` affordance must be **gated on `card.type === 'blog'`** inside `NormalCardTagRow` (or its parent) so test/unavailable rows render byte-identical markup. `NormalCardTagRow` already receives `card`, so the type is locally available without new prop plumbing — though a small prop addition is cleaner (see §2.1).

### 1.4 Blog-specific branches that already exist in `landing-grid-card.tsx`

- Trigger element branch (`<Link>` vs `<button>`): [:999–1031](../../src/features/landing/grid/landing-grid-card.tsx:999).
- `resolvedState` force-to-normal: [:822](../../src/features/landing/grid/landing-grid-card.tsx:822).
- `data-card-content-type={card.type}` on root ([:940](../../src/features/landing/grid/landing-grid-card.tsx:940)) → **a stable CSS hook (`[data-card-content-type="blog"]`) is already on the DOM** for any module.css blog-only selector.
- Root carries the `group` class ([`LANDING_GRID_CARD_ROOT_CLASSNAME`](../../src/features/landing/grid/landing-grid-card.tsx:202)) → Tailwind `group-hover:` / `group-focus-within:` reveal works without new wiring.
- Copy: `LandingCardCopy.readMore` field exists ([:76](../../src/features/landing/grid/landing-grid-card.tsx:76)); default `'Read more'` ([:1131](../../src/features/landing/grid/landing-grid-card.tsx:1131)); wired from locale via `readMore: t('readMore')` in [`landing-catalog-grid.tsx:115`](../../src/features/landing/grid/landing-catalog-grid.tsx:115). **Wave 7 removed the CTA element but left this copy plumbing in place** — it is currently defined-but-unused and Wave 8 simply re-consumes it.

---

## 2. Visual implementation options per requirement

Default preference: **CSS-only / markup-only**, no controller changes. Each option flags whether it crosses into JS-controller territory (elevated risk).

### 2.1 `Read more →` insertion into the tag row (blog-only, right-aligned)

Design authority: design.md **§7.4** ("`Read more →` sits at the right end of the tags row"), **§5.1** tags/meta type role (13px / 500 / line-height 1.35), **§10** (never underlined; no `READ` eyebrow). It is a **visual affordance inside the existing whole-card `<Link>`**, never a separate interactive/focusable control (BQ-02; Wave-7 contract; req-landing §6.5/§14.4).

**Option A — trailing `<span>` appended inside the existing `<ul>` (rejected).** Simplest diff, but appending a non-`<li>` to a `<ul>` is invalid markup and pollutes `data-tag-count` / `aria-label="Card tags"`. **Reject.**

**Option B — flex-row wrapper around `<ul>` + sibling `<span>` (recommended).** For blog only, `NormalCardTagRow` renders the existing `<ul>` plus a sibling, non-interactive `<span data-slot="blogReadMore" aria-hidden="true">Read more →</span>` in a shared flex row; the span gets `ml-auto shrink-0` so it pins to the right end and never gets clipped by the `<ul>`'s `overflow-hidden`. The `→` is decorative and appended in the component (not in the i18n string), consistent with how the expanded choice arrow is rendered ([:543](../../src/features/landing/grid/landing-grid-card.tsx:543)).

- **Zero impact on Test/Unavailable guaranteed by:** gating the entire wrapper/span on `card.type === 'blog'`. The non-blog branch returns the **current** markup unchanged (same gap div + same `<ul>`), so test/unavailable DOM and computed layout are byte-identical. Recommend an explicit prop (`readMoreLabel?: string` or `isBlog: boolean`) threaded `NormalCardFace → NormalCardTagRow` rather than reading `card.type` deep in the leaf, to keep the seam's contract explicit.
- **Typography/placement:** `text-[13px] font-medium leading-[1.35] text-[var(--muted-ink)]` (matches existing chip type ramp and design.md §5.1 tags-meta `--muted`); right end via `ml-auto`. No underline (design.md §10). Color does not change on its own hover (design.md §7.4) — only opacity (reveal) animates on desktop.
- **a11y:** `aria-hidden="true"` on the span. The whole card is already an `<a aria-label={card.title}>`; the visible "Read more →" is a redundant visual cue, so hiding it from AT avoids a duplicate, label-less link child (which would also violate "not a nested focusable element"). It must **not** carry `data-slot="primaryCTA"` (the contract test asserts that slot is `null`, [`landing-card-contract.test.ts:206`](../../tests/unit/landing-card-contract.test.ts:206)).

**Risk:** Low. Markup + CSS only. No controller, no focusable node, no navigation trigger.

### 2.2 Desktop hover reveal

Design authority: design.md §7.4 ("revealed on hover at desktop"), §4.8/§8 (opacity fades; honor `prefers-reduced-motion`).

**Recommended — pure CSS, mirroring the existing unavailable-overlay reveal.** The root already has `group`; the Read-more span uses the exact pattern already in use by [`UnavailableCardStatusOverlay`](../../src/features/landing/grid/landing-grid-card.tsx:673):

```
interactionMode === 'hover'
  ? 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-[140ms] motion-reduce:transition-none'
  : 'opacity-100'          // mobile / coarse-pointer → always visible (see §2.3)
```

- `group-focus-within:opacity-100` ensures the affordance also appears on keyboard focus of the card link (a11y parity; design.md §4.10 "focus always visible").
- `motion-reduce:transition-none` (and/or the existing `@media (prefers-reduced-motion: reduce)` block) keeps it `prefers-reduced-motion` safe: the reveal becomes an instant opacity swap, no transition. Opacity-only reveal is within the §8 allowed set.

**Controllers — explicitly NOT required.** Wave 7 already routed Blog hover/focus to *collapse-only, non-expanding* paths:
- [`use-hover-intent-controller.ts:148–164`](../../src/features/landing/grid/use-hover-intent-controller.ts:148) — Blog `mouseenter` clears hover intent and collapses any prior Test card; `mouseleave` is a no-op ([:230](../../src/features/landing/grid/use-hover-intent-controller.ts:230)).
- [`use-card-keyboard-handler.ts:174–196`](../../src/features/landing/grid/use-card-keyboard-handler.ts:174) — Blog focus records non-expanding focus; Enter/Space do not dispatch `CARD_EXPAND`.

The reveal is a CSS state on hover/focus of the card root; it needs **no new state, no hover-intent timer, no keyboard handler change**. Therefore the **High-Risk** [`use-landing-interaction-controller.ts`](../../src/features/landing/grid/use-landing-interaction-controller.ts) (AGENTS §4) is **not touched**, and the Wave-7 controller logic (`use-hover-intent-controller.ts`, `use-card-keyboard-handler.ts`) is **not touched**. This keeps Wave 8 a Medium-risk, CSS/markup-only wave with no E2E-mandated controller regression.

**Risk:** Low (CSS only). If any reveal were instead implemented via JS state on the controller, it would become an elevated-risk change requiring an at-risk-dimension declaration + Playwright E2E regression (AGENTS §4); this analysis recommends **against** that path.

### 2.3 Mobile always-visible treatment

Design authority: design.md §7.4 ("always visible on mobile"), §4.10 (44×44 tap target — but here the affordance is non-interactive; the whole card is the target).

**Recommended:** drive visibility off the same `interactionMode` discriminator already used by the unavailable overlay: `interactionMode === 'hover'` → desktop reveal; otherwise (`'tap'`) → `opacity-100`. `interactionMode` is already a prop on `LandingGridCard` and threaded to the face. Mobile = `tap` ⇒ always visible. No viewport JS branch needed beyond what already exists.

- The whole Blog card on mobile is the `<Link>`; tapping anywhere navigates (Wave 7). The visible "Read more →" is a static cue, not a tap target of its own. No 44px concern for the span itself.

**Risk:** Low.

### 2.4 Blog hover skin — `--sage` border + `--focus-ring-soft` glow

Design authority: design.md **§7.4** ("Blog is the one card with a hover skin: a `--sage` border plus the `--focus-ring-soft` glow"), §5.5 (`--sage #5C8E78`), §5.7 (`--focus-ring-soft: rgba(92,142,120,0.22)` — labeled "blog-hover glow"), §5.8 (shadow tokens). **Note:** design.md §7.2/§10 forbid an independent hover skin on the *Normal test card* (expansion is its hover response); the hover skin is **Blog-only** and does not conflict.

**Token availability (verified):** `--sage`, `--focus-ring-soft`, `--hairline-strong`, `--shadow-hover` are **not present in `globals.css`** (global migration is Wave 16, BQ-04). The landing card already follows the project-rules §Visual-Design pattern of **scoped `--normal-*` / `--expanded-*` tokens in `landing-grid-card.module.css` whose literal values match design.md semantic tokens.** Wave 8 should follow the identical pattern: introduce scoped blog tokens (e.g. `--blog-hover-border: #5c8e78;` and a `--blog-hover-glow` composite) in `.root`, consumed only by a blog-scoped hover selector. Do **not** promote to `globals.css` (Wave 16), and do **not** refactor the existing scoped tokens as a side effect (project-rules §Visual-Design).

**Implementation options:**

**Option A — module.css blog-scoped selector (recommended).** `.root[data-card-content-type="blog"]:hover { … }` (the `data-card-content-type` hook already exists). Sets `border-color: var(--blog-hover-border)` and `box-shadow: <glow composite>`. Note the resting border is already `1px solid var(--normal-card-border)` with `--normal-card-border: transparent` ([module.css:5](../../src/features/landing/grid/landing-grid-card.module.css:5)) — i.e. the 1px border box is **already reserved**, so deepening it to sage on hover causes **no layout shift** (matches design.md §6.1 "1px transparent border at rest reserves layout").

**Option B — Tailwind arbitrary classes in the blog branch.** Conditionally append `hover:[border-color:…] hover:[box-shadow:…]` to the root when `isBlogCard`. Functional but scatters literal values into the component and is harder to keep in token parity for Wave 16. **Prefer Option A** for token-consolidation hygiene.

**Reduced-motion / focus interaction:** the hover skin is a color+shadow transition (allowed, §8). It must compose with — not override — the existing focus ring (§2.5, §3.2). Keep the resting state visually unchanged (only `--normal-card-shadow` + transparent border at rest).

**Risk:** Low–Medium (introduces one scoped token group + one selector; isolated to blog). Flagged as a **supplemental-CSS extraction**, which BQ-21 / project-rules §Visual-Design permit **only** when the Analysis gate documents a concrete design.md gap and the user approves — see §3.1 for the glow-composite gap that justifies this.

### 2.5 `READ` eyebrow cleanup

Design authority: design.md §7.4 + §10 ("No `READ` eyebrow (no eyebrow on any card)").

**Verified: no `READ` eyebrow is rendered on any card.** The blog face renders only Thumbnail/Title/Subtitle/TagRow; there is no eyebrow node, and a repo grep for an eyebrow/`READ` overline in the landing grid returns none. The stale `landing.heroTitle` / `landing.heroBody` message keys still exist but belong to the deferred hero band (BQ-23), not a card eyebrow. **No cleanup action is required in Wave 8** beyond confirming the absence; this requirement is already satisfied. (If the user wants a regression guard, a contract assertion that no eyebrow/overline node exists on the blog face could be added — optional.)

---

## 3. design.md coverage check (BQ-21)

For each visual value Wave 8 needs, whether design.md fully specifies it, resolved via the precedence chain (`decision-register` → requirements/rules → design.md → patterns → mockups → existing impl → wave CSS).

### 3.1 Blog-hover shadow composite — **partial gap; resolution proposed**

- design.md §7.4 states the intent qualitatively: "a `--sage` border plus the `--focus-ring-soft` glow."
- §5.7 supplies the **color**: `--focus-ring-soft: rgba(92,142,120,0.22)`, explicitly annotated "blog-hover glow."
- §5.8 has **no** blog-glow shadow token: the named composites are `--shadow-rest`, `--shadow-hover`, `--shadow-expanded`, `--shadow-overlay`. None encodes the blog glow's blur/spread geometry. `--shadow-hover` is the generic neutral hover (`0 4px 14px … , 0 0 0 1px --hairline-strong`) — its hairline ring conflicts with the sage border intent, so it is **not** the blog composite.

**Conclusion:** design.md fully specifies the glow **color and the border color**, but **not the glow's box-shadow geometry** (blur radius / spread). This is a real, narrow gap.

**Recommended resolution (both, in order):**
1. **(a) Document the composite back into design.md (AGENTS §8 / design.md §11 feedback path).** Propose adding to §5.8 a named token, e.g.
   `--shadow-blog-hover: 0 0 0 1px var(--sage), 0 4px 14px var(--focus-ring-soft);`
   (1px sage edge ring + a soft 14px-blur sage-tinted glow reusing the §5.8 hover blur geometry and the §5.7 glow color), and cross-reference it from §7.4. This keeps design.md the SSOT and removes the qualitative gap. **This is the preferred path** because the value is a durable visual decision.
2. **(b) If the user prefers not to amend design.md in this wave**, issue it as a **BQ-21 supplemental CSS clarification** scoped to the wave: define the scoped `--blog-hover-*` token(s) in `landing-grid-card.module.css` with the literal composite above, and log the exact value in the Decision Register so Wave 16 can consolidate it. (This is the supplemental-CSS exception BQ-21/§Visual-Design allow once the gap is proven.)

Either way, the **numeric composite proposed for review** is: `box-shadow: 0 0 0 1px #5c8e78, 0 4px 14px rgba(92,142,120,0.22);` with `border-color: #5c8e78`. The border and the 1px ring are redundant-by-design (border reserves layout; ring renders the crisp sage edge over the glow) — the implementer may drop the inner ring if the reserved border alone reads cleanly; that micro-choice should be confirmed at implementation.

### 3.2 Blog `focus-visible` treatment — **specified; resolve to "both, layered"**

- §6.9 (focus ring): 2px `--focus-ring` (sage) outline, 2px offset on `:focus-visible`, always visible, never removed. §4.10 reinforces "focus is strong and always visible."
- §7.4 (hover skin): sage border + glow on hover.
- **Current behavior:** `module.css` rule `.root:not(.desktopOverlayLayer):has(:focus-visible)` ([module.css:26](../../src/features/landing/grid/landing-grid-card.module.css:26)) already applies a 2px sage outline + 2px offset to **all** collapsed Normal cards, **including Blog** (Blog is never `desktopOverlayLayer`). So Blog already has a compliant focus ring today.

**Resolution:** keep the **focus ring (§6.9) as the authoritative `:focus-visible` indicator**, and let the **hover skin (§7.4) apply additively** when the pointer hovers. They are different triggers (`:hover` vs `:focus-visible`) and may legitimately co-occur (hover + keyboard focus). The Read-more reveal must also fire on focus (`group-focus-within`, §2.2) so keyboard users see the same affordance. **Do not** replace the focus ring with the hover skin, and **do not** suppress the existing outline — that would regress focus visibility (design.md §4.10; note keyboard/a11y hardening proper is Wave 11, so Wave 8 must at minimum *not regress* it). This is an a11y-relevant decision: **no `outline: none`, no removal of the `:has(:focus-visible)` rule.**

### 3.3 `Read more →` typography & placement — **fully specified**

- **Typography:** design.md §5.1 tags/meta row = **13px / weight 500 / line-height 1.35**, color `--muted` (§5.3 `--muted #7A7A85`; in the current scoped impl, the nearest live token is `--muted-ink`, used by the meta row and chips). §7.4: never underlined, color does not change on its own hover. → `13px / 500 / --muted`, no underline. ✅ matches the task's expectation (13px / 500 / `--muted`).
- **Placement:** §7.4 "right end of the tags row." → `ml-auto`, right-aligned, `shrink-0`. ✅
- **Casing:** design.md §4.2 sentence case → "Read more" (the en value is already sentence case; see §4 i18n). ✅
- **Arrow:** the `→` glyph is decorative and component-appended (like the expanded choice arrow), not part of the i18n string. BQ-25 (arrow optical nudge deferred to post-Pretendard) applies to the *expanded choice* arrow; this Read-more arrow inherits the same "no nudge before Pretendard" posture by default — no optical correction in Wave 8.

---

## 4. Logic Improvement candidates (BQ-18 six-layer eval, no default Keep)

Evaluated against criteria 1–5 (Modern React patterns → simplicity/maintainability → performance → testability → a11y logic). For a visual wave most layers correctly resolve to **Keep**, but each was evaluated explicitly, not defaulted.

### W8-LI-01 — i18n: `Read more` message key
- **Layer:** i18n.
- **Finding:** the `landing.readMore` key **already exists in all 12 locales** (verified: en `Read more`, kr `더 읽기`, ja `続きを読む`, zs `阅读更多`, zt `閱讀更多`, es `Leer más`, fr `Lire la suite`, de `Mehr lesen`, pt `Ler mais`, hi `और पढ़ें`, id `Baca selengkapnya`, ru `Читать далее`). It is already fetched (`t('readMore')`, catalog-grid:115) and threaded through `copy.readMore`; Wave 7 left this plumbing intact when it removed the CTA element. **Owner = locale messages** (project-rules §TestFlow), casing follows design voice sentence case (design.md §4.2) — en is already sentence case.
- **Change magnitude:** **Low** (reuse; no key add/rename; no new namespace).
- **Improvement value:** n/a (no change). Reuse maximizes simplicity/maintainability (criterion 2) and avoids 12-file churn.
- **Risk/rollback:** none.
- **Wave dependency:** none.
- **Recommendation:** **Keep / reuse as-is. No re-add.** (Confirm `Read more` reads as sentence case in every locale; all sampled values comply.)

### W8-LI-02 — hooks: hover / keyboard / interaction-controller for the reveal
- **Layer:** hooks.
- **Finding:** the desktop hover reveal and mobile always-visible can be **pure CSS** (`group-hover` / `group-focus-within`, `interactionMode` discriminator) reusing the existing unavailable-overlay pattern. No new timer/state. Wave-7 Blog gates in `use-hover-intent-controller.ts` and `use-card-keyboard-handler.ts` already collapse-only / non-expand; they need **no change**. The **High-Risk** `use-landing-interaction-controller.ts` (AGENTS §4) is **not touched**.
- **Change magnitude:** **None (Keep).** (A JS-driven reveal would be **High** magnitude + High-Risk + mandatory Playwright E2E — explicitly rejected.)
- **Improvement value:** keeping it CSS-only is the modern, simplest, most performant, most a11y-robust option (criteria 1–3, 5). No JS re-render on hover.
- **Risk/rollback:** none (no controller diff).
- **Wave dependency:** preserves Wave 7 contracts; relevant to Wave 11 (a11y hardening) which will own deeper keyboard work.
- **Recommendation:** **Keep (no controller/hook change). Implement reveal in CSS only.**

### W8-LI-03 — state: visual interaction state
- **Layer:** state (`interaction-state.ts` reducer / `LandingCardVisualState`).
- **Finding:** the reveal and hover skin are presentational; no new visual state, no reducer event. Blog already resolves to `'normal'` ([:822](../../src/features/landing/grid/landing-grid-card.tsx:822)).
- **Change magnitude:** **None (Keep).**
- **Improvement value:** n/a. Adding state would violate simplicity (criterion 2).
- **Risk/rollback:** none.
- **Wave dependency:** none.
- **Recommendation:** **Keep.**

### W8-LI-04 — routing: blog navigation
- **Layer:** routing.
- **Finding:** the `<Link href={buildLocalizedPath(RouteBuilder.blogArticle(card.variant), locale)}>` already uses `RouteBuilder` + `buildLocalizedPath` (Gold Standard, AGENTS §6). Visual work touches nothing here.
- **Change magnitude:** **None (Keep).**
- **Improvement value:** n/a.
- **Risk/rollback:** none.
- **Wave dependency:** preserves Wave 7 navigation (BQ-12).
- **Recommendation:** **Keep.**

### W8-LI-05 — storage: ingress / pending
- **Layer:** storage.
- **Finding:** Blog transition reuses `beginBlogTransition` → pending transition + return scroll + internal signal only; **no landing ingress, no `card_answered`** (req-landing §13.3, §14.4; BQ-12). Visual work does not touch storage.
- **Change magnitude:** **None (Keep).**
- **Improvement value:** n/a.
- **Risk/rollback:** none.
- **Wave dependency:** none.
- **Recommendation:** **Keep.**

### W8-LI-06 — telemetry
- **Layer:** telemetry.
- **Finding:** no new event for a visual affordance. Blog telemetry contract (no `card_answered`) is preserved (BQ-12, req-landing §13.3). Consent source unchanged.
- **Change magnitude:** **None (Keep).**
- **Improvement value:** n/a.
- **Risk/rollback:** none.
- **Wave dependency:** none.
- **Recommendation:** **Keep.**

---

## 5. Preservation contracts to assert (must not change)

- **Wave 7 whole-card `<Link>` navigation** for Blog; Test/Unavailable triggers stay `<button>`. `Read more →` is a **non-interactive, `aria-hidden`, non-focusable `<span>` inside the link** — never `data-slot="primaryCTA"`, never a nested focusable, never a navigation trigger (BQ-02; req-landing §6.5/§8.6/§14.4).
- **No Blog expanded state** (BQ-02; design.md §7.4/§10). Do not reintroduce `ExpandedBlogBody`, `cardSubtitleExpanded`, blog subtitle split, or any blog expanded slot.
- **Transition runtime / storage / telemetry**: Blog produces no landing ingress and no `card_answered` (BQ-12, req-landing §13.3/§14.4). `src/features/transition/**` untouched.
- **Test & Unavailable card visuals and tag-row layout unchanged** — Read-more and hover skin are gated `card.type === 'blog'`; non-blog markup is byte-identical to today.
- **`globals.css` / theme tokens untouched** (Wave 16, BQ-04). New blog tokens stay **scoped** in `landing-grid-card.module.css` with values matching design.md (project-rules §Visual-Design); existing `--normal-*` / `--expanded-*` scoped tokens are not refactored.
- **Existing collapsed focus ring** (`.root:not(.desktopOverlayLayer):has(:focus-visible)`, sage 2px / 2px offset) preserved for Blog (design.md §6.9; do not regress §4.10). No `outline: none`.
- **No visual-regression baseline regeneration** (BQ-07); no `qa:visual:full`.
- **GNB / mobile menu excluded** (wave scope; BQ-03).
- **`data-testid`, semantic link, `aria-label`, inert/aria-disabled a11y guards** preserved (req-landing §14.4).

---

## 6. Risk & validation

### 6.1 High-Risk path assessment (AGENTS §4)
With the recommended **CSS/markup-only** approach, **no High-Risk file is touched**: `use-landing-interaction-controller.ts`, `use-mobile-card-lifecycle.ts`, `use-keyboard-handoff.ts`, `site-gnb.tsx`, `page-shell.tsx`, `theme-bootstrap.js`, `consent-source.ts`, `src/features/transition/**` are all untouched. Files in scope are `landing-grid-card.tsx` (markup branch) and `landing-grid-card.module.css` (scoped tokens + blog selectors) — neither is High-Risk or Ask-First. **Therefore no at-risk-dimension declaration and no mandatory Playwright E2E regression are triggered** by AGENTS §4.

If the user instead directs a JS-driven reveal/skin (not recommended), it would touch a High-Risk controller, with the **at-risk dimension = a11y + responsiveness**, and would then require Playwright E2E regression per AGENTS §4/§5.

### 6.2 Validation mapped to wave scope (wave-roadmap Wave 8: "landing interaction smoke, mobile browse check")
- **Basic Gates (in order):** `npm run lint` → `npm run typecheck` → `npm test` → `npm run build` (AGENTS §5).
- **Landing interaction smoke:** the existing `grid-smoke.spec.ts` already has `@smoke blog hover keeps the card normal without rendering Expanded slots` ([grid-smoke.spec.ts:516](../../tests/e2e/grid-smoke.spec.ts:516)) — Wave 8's Read-more span and hover skin must keep that test green (the span is not an expanded slot). A new assertion can confirm the Read-more affordance is present, `aria-hidden`, non-focusable, and not `primaryCTA`.
- **Contract test:** `landing-card-contract.test.ts` Blog case ([:189–207](../../tests/unit/landing-card-contract.test.ts:189)) must stay green (`primaryCTA` null; trigger is `<a>`); add a blog-Read-more presence/`aria-hidden` assertion if a regression guard is wanted.
- **Mobile browse check:** confirm Read-more is `opacity:1` (always visible) at `viewportTier='mobile'` / `interactionMode='tap'`.
- **BQ-07:** baseline regeneration is **forbidden**; the visual / theme-matrix snapshot debt (see §7) **stays deferred**. Do not run `qa:visual:full`.

---

## 7. Known-debt interactions (surface only; recommendations noted)

### 7.1 Stale theme-matrix manifest entries (Ask-First path)
`tests/e2e/theme-matrix-manifest.json` still contains `landing-blog-expanded` ([:21/85](../../tests/e2e/theme-matrix-manifest.json:21)) and `mobile-landing-blog-expanded` ([:28/148](../../tests/e2e/theme-matrix-manifest.json:28)), describing a Blog expanded state removed in Wave 7. This is an **Ask-First** file (AGENTS §4), untouched by Wave 7.
- **Recommendation: defer (do not bring in-scope for Wave 8).** It is Ask-First, snapshot/baseline-adjacent, and BQ-07 keeps theme-matrix debt deferred. Removing it touches baseline provenance and is better consolidated with the deferred visual-baseline work (Wave 14) or an explicit Ask-First cleanup. Surface it here so it is not mistaken for live coverage.

### 7.2 Stale `req-landing.md` Blog-Expanded / Read-more CTA references
Wave 7 synced only §8.6 / §14.4 / §13.3 and left other Blog-Expanded references stale (Wave 7 plan §11 deferred them "unless scope is reopened"). **Wave 8 reopens Blog visual scope.** Still-stale spots:
- §1.3 Locked-Decisions table rows ([:31–32](../../docs/req-landing.md:31)) — "Expanded ... Blog는 Read more CTA 허용".
- §6.5 Card Slot Order ([:265, :274–275](../../docs/req-landing.md:274)) — "Expanded Blog ...", "Blog Expanded: cardSubtitleExpanded, meta(3), primaryCTA(Read more)", "Blog entry는 Expanded의 primaryCTA(Read more)에서만 시작".
- §6.6 Text/Clamp ([:294–296, :305](../../docs/req-landing.md:294)) — Blog Expanded subtitle continuity (4-line).
- §6.8 / §8.5 ([:385–386, :608](../../docs/req-landing.md:385)) — "Blog Expanded primaryCTA(Read more)", mobile CTA priority list naming Read more.
- **Recommendation: sync-now (in this wave's doc-update step) the §6.5/§6.6 slot/clamp rows that describe a *Blog Expanded* surface, because Wave 8 is the wave that finalizes Blog's non-expanded visual** and leaving "primaryCTA(Read more)" / "Blog Expanded" language live directly contradicts the implemented contract and could mislead Wave 9–14. Lower-priority prose (e.g. §1.3 table phrasing, §8.5 priority-list naming) may **defer to Wave 14** (landing regression stabilization). Flag for the user to choose the sync boundary; per CLAUDE.md this doc edit is itself a separate, approval-gated change (not part of the analysis-only artifact).

### 7.3 design.md internal inconsistency — Blog "expanded card" paragraph
design.md **§7.3** still contains a paragraph describing "the blog expanded card (which has no choices and ends with a `Read more →` CTA below the meta)" ([design.md:297](../../docs/design/design.md:297)). This contradicts **§7.4** ("No expanded state") and **§10**, and the implemented BQ-02 contract.
- **Recommendation: surface as a design.md gap/stale-ref for the §11 maintenance/AGENTS §8 feedback path.** Because Wave 8 finalizes Blog visual, it is the natural point to amend §7.3 to drop the blog-expanded sentence (the floor/spacer mechanism it documents remains valid for the **Test** expanded card only). Pair this with the §3.1 glow-composite addition to §5.8/§7.4 in a single design.md feedback edit (separate, approval-gated; not part of this analysis artifact).

---

## 8. W8-LI candidate summary & recommendations

| ID | Layer | Magnitude | Recommendation |
|---|---|---|---|
| **W8-LI-01** | i18n | Low (reuse) | **Approve — Keep/reuse** the existing 12-locale `landing.readMore`; do **not** re-add. |
| **W8-LI-02** | hooks | None (Keep) | **Approve — Keep**; implement hover reveal / mobile-visible / blog hover skin as CSS-only. Do not touch `use-landing-interaction-controller.ts` (High-Risk) or Wave-7 hover/keyboard controllers. |
| **W8-LI-03** | state | None (Keep) | **Approve — Keep**; no new visual state/reducer event. |
| **W8-LI-04** | routing | None (Keep) | **Approve — Keep**; blog `<Link>` via `RouteBuilder`/`buildLocalizedPath` unchanged. |
| **W8-LI-05** | storage | None (Keep) | **Approve — Keep**; no ingress / `card_answered` for Blog. |
| **W8-LI-06** | telemetry | None (Keep) | **Approve — Keep**; no new event; consent source unchanged. |

**Net:** this is a pure visual wave — all six logic layers resolve to **Keep**. The Step-2 implementation prompt can therefore be issued with **`Logic Improvement: no candidates approved — preserve existing logic`** (equivalently, "W8-LI-01..06 approved as Keep"). The substantive Wave-8 decisions are **visual**, and two of them need an explicit user choice before implementation:

1. **Blog-hover glow composite (§3.1):** approve adding `--shadow-blog-hover: 0 0 0 1px var(--sage), 0 4px 14px var(--focus-ring-soft);` to **design.md §5.8 + §7.4** (preferred, AGENTS §8 feedback), **or** issue it as a **BQ-21 supplemental scoped-CSS clarification** logged to the Decision Register.
2. **Stale-debt sync boundary (§7.2 / §7.3):** confirm whether to sync the `req-landing.md` §6.5/§6.6 Blog-Expanded rows and amend `design.md` §7.3 **now** (recommended, since Wave 8 finalizes Blog visual) or **defer** the prose to Wave 14. The theme-matrix manifest entries (§7.1) are recommended **deferred** regardless (Ask-First + BQ-07).

> Implementation scope for Step 2 (for reference): `landing-grid-card.tsx` (blog-only Read-more span in the tag-row seam + mobile/desktop visibility class) and `landing-grid-card.module.css` (scoped `--blog-*` tokens + `[data-card-content-type="blog"]:hover` skin). No controller, no globals.css, no transition/storage/telemetry, no baseline regeneration.
