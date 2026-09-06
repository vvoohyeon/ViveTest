# Candidate 2 — the title and subtitle rules are breakpoint-specific and the specimen states them as universal

**Date:** 2026-09-07 · **Tier:** 2 — run after the motion pass, before the design pass · **Task mode:** Implementation (documentation surface only) · **공수** S · **효과** 상 · **심각도** 높음

---

## Shared frame

**Program.** The 2026-09-06 design-system rebaseline (`BQ-38`) replaces waves 13–17. The repository owns one token definition under `docs/design/ds/` and pushes it one-way to **VIVE Design System v2** (`cd630eec-25e4-4613-a58f-c671c80297ca`). Sync procedure: `docs/design/ds/SYNC.md`.

**Priorities, in order.** 1 — preserve the implemented logic with no side effects. 2 — take design and interaction quality as high as it will go.

**Approved decisions (`BQ-38`).** **A** tokens carry catalog values under VIVE names · **B** `req-landing.md` §8 frozen · **C** catalog card tokens and patterns frozen · **D** from `825385f6` take only card components and thumbnail SVGs.

**Invariant boundaries.** `src/**` is untouched until the theme cut — **this document changes no runtime file**. No baseline regeneration (`BQ-07`).

**Where this sits.** step 1 `c5fc624` → step 1b `e8a453e` → tier 1 `a3a1c3e` → motion pass → **this document** → design pass.

**Prerequisite check.** `docs/design/ds/catalog-components.css` contains the "THIS IS A SPECIMEN STYLESHEET" header. If not, tier 1 has not landed.

---

## The finding

`docs/design/ds/catalog-components.css` contains **no width-based media query at all**; its only three are `(hover: hover) and (pointer: fine)` and two `prefers-reduced-motion`. A designer opening it has no signal that the card has tiers.

Two of its rules are written as universal while the behaviour contract makes them desktop-and-tablet-only, and in both cases the mobile behaviour the contract requires is the **opposite** of what the CSS does.

### 2.1 — Title

Specimen, with the tier stated only in a comment:

```css
.vt-title {
  /* Desktop and tablet: one line, ellipsised. Mobile shows the full text. */
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

Contract — `docs/req-landing.md:285`:

> Mobile title: Normal/OPENING/OPEN/CLOSING 전 상태에서 전체 title을 표시해야 하며 ellipsis를 적용하면 안 된다.

Product — `src/features/landing/grid/landing-grid-card.tsx:400`:

```
isMobileViewport ? 'block overflow-visible text-clip' : 'overflow-hidden text-ellipsis line-clamp-1',
```

### 2.2 — Subtitle

Same shape. Specimen clamps to 2 lines unconditionally under a comment saying mobile shows full text. Contract — `docs/req-landing.md:287`:

> Mobile Landing Normal subtitle: 전체 텍스트를 표시하고 clamp/ellipsis를 적용하면 안 된다.

Product — `landing-grid-card.tsx:371`:

```
isMobileViewport ? 'overflow-visible text-clip' : 'overflow-hidden text-ellipsis line-clamp-2',
```

**Why it matters.** Copying `.vt-title` or `.vt-subtitle` into a new mobile screen produces a clipped title — the exact thing the contract forbids — and the comment above it cannot stop that, because comments do not execute. This is insight I-2 in `candidates_0`: a rule stated in prose and contradicted by the CSS beneath it reads as authoritative precisely because the prose is right.

### 2.3 — The global wrapping rule is missing from both

`design.md` §4.3:

> **Global wrapping rule:** wrapping text uses `word-break: keep-all; overflow-wrap: anywhere;`.

The product applies `[overflow-wrap:anywhere]` to the title (`landing-grid-card.tsx:212`) and the subtitle (`:214`), and adds both properties on the mobile tier in `landing-grid-card.module.css:86-90`. In the specimen only `.vt-question` and `.vt-choice__text` carry them; `.vt-title` and `.vt-subtitle` carry neither, so Korean text and long unbroken Latin tokens break differently against the specimen than in the product — and the specimen is where bilingual line-length judgements will be made.

---

## What to change

### The mechanism: modifier classes, not media queries, and not container queries

Two approaches that look obvious are both wrong here, and the reasons are worth writing down because they will occur to whoever picks this up.

**A width media query is wrong** because the specimen renders inside a fixed-width card frame in the Design System pane. `@media (max-width: 767px)` would fire on the pane's width, not on the tier the specimen is simulating, so the card would show mobile behaviour in a desktop context or the reverse.

**A container query on the card is wrong** because *card width does not determine tier*. The product's realized widths are 397px (desktop first row), 292px (desktop later rows) and roughly 358px of content on a 390px mobile viewport. The mobile card is **wider** than a desktop later-row card. Tier is decided from the measured `.landing-grid-container` inline size (`req-landing.md` §6.2: `>= 1160` → 3→4 columns, `1040–1159` → 2→3, `< 1040` → 2→2, `<= 767px` → mobile), never from the card.

So: express the tier as an explicit modifier the specimen author must choose.

- `.vt-title` and `.vt-subtitle` become the **unclamped** base — full text, `word-break: keep-all`, `overflow-wrap: anywhere`. This is the mobile behaviour and the global wrapping rule together.
- `.vt-title--clamp1` and `.vt-subtitle--clamp2` carry the desktop-and-tablet clamp.

The base is deliberately the safe one. Forgetting the modifier yields full text, which violates nothing; the current arrangement fails the other way, where forgetting yields a clamp that violates `req-landing.md` on mobile.

### Concrete edits

1. **`catalog-components.css`** — split the two rules as above. Keep the tier explanation in the comment, but make it describe *which modifier to use where* rather than describing behaviour the CSS does not have. Add `word-break: keep-all; overflow-wrap: anywhere` to both bases.
2. **Every existing specimen that shows a desktop or tablet card** — `preview/card-test.html`, `card-blog.html`, `card-unavailable.html` — gains the `--clamp1` / `--clamp2` modifiers on its title and subtitle. Their rendering must not change; that is the check.
3. **Record the full title matrix in the card caption**, because it is larger than one line and `design.md` §4.3 is the only place it currently lives: Desktop/Tablet Normal is single-line ellipsis; Mobile Normal is full text; Mobile Expanded and transient titles are full text; Desktop/Tablet Expanded preserves the measured Normal first-line split and reveals the overflow beneath it. Subtitles: Desktop/Tablet two-line clamp, Mobile full text, expanded choice text never truncated.
4. **Do not** add a mobile specimen here — that is `candidates_4`, which will consume these modifiers.

---

## Verification

- Read back computed styles on each changed preview: the desktop specimens still report `-webkit-line-clamp: 1` / `2`, and `word-break: keep-all`, `overflow-wrap: anywhere` now appear on title and subtitle in every case.
- Render each changed card and confirm nothing moved. A one-line title that was clamped and is still clamped looks identical; if it changed, the modifier is on the wrong element.
- Grep the bundle for `line-clamp` and confirm every occurrence is inside a `--clamp` modifier.
- `git diff --stat` shows only `docs/design/ds/**`.
- Push the changed files and re-register any card whose viewport changed. Heights should not change here; if one does, that is a signal the modifier was applied wrongly.

---

## Decisions the user may want to make

- **Whether to name the modifiers by tier (`--desktop`) or by behaviour (`--clamp1`).** Behaviour is recommended: the same clamp applies to two tiers, and a tier name would have to be read as "desktop and tablet but not mobile" every time.

---

## Execution prompt

> Read `docs/plans/2026-09-07-candidates_0-overview.md`, then `docs/plans/2026-09-07-candidates_2-responsive-text-rules.md`, and implement it. Work in an isolated clone. Touch nothing under `src/`. Verify by reading back computed styles and by rendering each changed card — the desktop specimens must look identical afterwards. Push to `cd630eec-25e4-4613-a58f-c671c80297ca` per `docs/design/ds/SYNC.md`, then commit and land on `main`.
