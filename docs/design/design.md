# ViveTest Catalog Visual Reference

> Consolidated visual reference for the ViveTest anonymous short-assessment **card catalog** experience, built on the VIVE Design System v2. This single document replaces the need to pass individual design-system CSS, JSX, preview, or mockup source files during implementation.

---

## 1. Document Role

This document is the **final visual reference** for the ViveTest catalog experience.

- It is a **visual reference only**.
- It does **not** define implementation scope, implementation order, QA gates, repository rules, or task permissions.
- It does **not** describe phases, waves, sequencing, or task scopes of any kind.
- Implementation scope must be determined by the **rebuild project's own documents** (its roadmap, rules, QA gates, and decision records). Where this document and the rebuild project's process documents touch the same surface, the rebuild project's documents govern *process*; this document governs only *visual intent*.

Read this document to understand **what the catalog should look like and how its states should read** — not to determine what to build or in what order.

---

## 2. Source Provenance

| Source | Contributes |
|---|---|
| **Phase 1 — IA / Interaction Plan (rev3)** | Interaction and **state structure**: page regions, card types, card states, expansion model, responsive grid rhythm, navigation/menu information architecture. |
| **Phase 2 — Visual Mockup (rev4)** | **Visual specifications**: design tokens, card visual rules, expanded-card composition, navigation visuals, the explicit "never include" list. |
| **Final ViveTest v3 mockup output** | The **final realized mockup** — the high-fidelity catalog as built (desktop, tablet, mobile, component artboards). The screenshots in `resources/` are captured from this output. |
| **VIVE Design System v2** | **Design foundations**: Pretendard typeface, warm-neutral surfaces, sage/moss accent, restrained depth, quiet motion, hairline borders, calm voice. |

The values recorded here are the **realized** values from the final mockup, which specialize VIVE's general foundations for the catalog surface.

---

## 3. Visual Principles

The catalog reads as **clear, lightweight, modern, calm, and trustworthy**, with a **slightly playful** warmth. It is deliberately:

- **not game-like** — no badges, streaks, score celebrations, or gamified copy;
- **not clinical** — warm off-white surfaces and a soft sage accent, never cold grey or pure-white sterility;
- **not a heavy dashboard** — no dense chrome, no data-grid framing, no toolbars competing with content.

**The card system is the primary visual identity.** The page is a single continuous grid of cards on a warm canvas; everything else (navigation, a one-line eyebrow, a quiet footer) is low-emphasis chrome around it. The cards carry the brand: their framing, their calm thumbnails, the way a test card *expands in place* to preview its first question. There is no hero, no marketing band, no decorative imagery beyond the calm thumbnails inside cards.

Voice follows VIVE: sentence case everywhere, plain and competent, addresses the reader as "you," no emoji, no exclamation marks.

---

## 4. Design Foundations

All values below are the realized tokens from the final mockup. They specialize VIVE v2 for this surface.

### 4.1 Typography

**Family**
```
--font-sans: "Pretendard Variable", "Pretendard", -apple-system, BlinkMacSystemFont,
             "Apple SD Gothic Neo", "Segoe UI", Roboto, "Helvetica Neue", Arial,
             "Noto Sans KR", sans-serif;
```
One family covers Korean + Latin with matched metrics.

**Base text behavior** (global): `word-break: keep-all;` · `overflow-wrap: anywhere;` — Korean wraps on word boundaries; long Latin tokens still break rather than overflow. **Text is never truncated** anywhere in the catalog.

| Role | Size | Weight | Line-height | Tracking | Color |
|---|---|---|---|---|---|
| Card title | 20px | 600 | 1.3 | -0.01em | `--ink` |
| Card subtitle | 15px | 400 | 1.45 | normal | `--body` |
| Expanded context label | 14px | 500 | 1.4 | normal | `--muted` |
| Expanded preview question | 21px (range 20–22) | 600 | 1.3 | -0.01em | `--ink` |
| Choice text | 15px | 400 | 1.45 | normal | `--ink-soft` |
| Tags / meta | 13px | 500 | 1.35 | normal | `--tag-fg` / `--muted` |

### 4.2 Color Tokens

```css
/* Canvas & surfaces */
--canvas:          #FBFAF7;   /* warm off-white page floor */
--canvas-elevated: #FFFFFF;   /* card fill */
--surface-soft:    #F4F1EA;   /* unavailable card fill (warmer) */
--surface-muted:   #ECE8DF;   /* hover tint, segmented-control track */

/* Ink */
--ink:             #1A1A1F;   /* titles, questions */
--ink-soft:        #2E2E36;   /* choice text */
--body:            #4A4A55;   /* subtitles, body */
--muted:           #7A7A85;   /* context label, meta, eyebrow */
--muted-soft:      #A6A6AE;   /* separators, faint glyphs */

/* Borders */
--hairline:        #E6E2D8;   /* default 1px structural border */
--hairline-strong: #D6D1C4;   /* choice border, emphasized edges */

/* Brand accents */
--sage:            #5C8E78;   /* primary moss accent */
--sage-soft:       #C9DBD1;
--sage-muted:      #E8F0EC;   /* active language chip bg, choice hover bg */

/* Interaction */
--focus-ring:      #5C8E78;
--focus-ring-soft: rgba(92,142,120,0.22);   /* blog-hover glow */
--overlay-scrim:   rgba(26,26,31,0.48);      /* mobile scrim / menu scrim */

/* Tags */
--tag-bg:          #F0ECE2;
--tag-fg:          #4A4A55;
```

### 4.3 Shadows

```css
--shadow-rest:     0 1px 2px rgba(26,26,31,0.04);                                   /* resting card */
--shadow-hover:    0 4px 14px rgba(26,26,31,0.06), 0 0 0 1px var(--hairline-strong); /* generic hover */
--shadow-expanded: 0 12px 32px rgba(26,26,31,0.08), 0 0 0 1px var(--hairline-strong);/* expanded test card */
--shadow-overlay:  0 24px 64px rgba(26,26,31,0.18);                                  /* mobile expanded sheet, mobile menu */

/* Blog card hover (composed inline, not a token) */
box-shadow: 0 0 0 3px var(--focus-ring-soft), 0 8px 24px rgba(26,26,31,0.08);
```
Shadows are warm-tinted with the ink color at low alpha — never pure black, never large halos.

### 4.4 Radii

```css
--radius-xs:   5px;     /* tag chips — exact value */
--radius-sm:   8px;
--radius-md:   12px;    /* choice buttons, thumbnails */
--radius-lg:   16px;    /* cards */
--radius-xl:   24px;    /* mobile menu panel (bottom corners) */
--radius-pill: 999px;   /* language/theme pill, hamburger, chips, status dot */
```

### 4.5 Spacing

| Token / use | Value |
|---|---|
| Container max-width | **1280px**, centered |
| Desktop / tablet side padding | 24px |
| Mobile side padding | 16px |
| Card padding (all sides) | **16px** — intentional; frames the thumbnail with a natural outer margin on all four sides |
| Card internal gap | 12px |
| Tag padding | 4px 9px |
| Grid gap — desktop | 24px |
| Grid gap — tablet | 20px |
| Grid gap — mobile | 14–16px |
| Choice button padding | 12px 14px |
| Choice list gap | 8px |
| Meta row top margin | 14px |

### 4.6 Motion Tokens

```css
--ease-standard: cubic-bezier(0.2, 0, 0, 1);   /* entrances, state changes */
--ease-out:      cubic-bezier(0.0, 0, 0.2, 1);
--ease-in:       cubic-bezier(0.4, 0, 1, 1);    /* exits */
--dur-fast:      140ms;
--dur-base:      220ms;
--dur-expand:    260ms;
```
Hover dwell tolerance (expand/collapse): **150ms** in, **150ms** out. Allowed motion: opacity fades, small (≤~18px) translations, width transitions, color/shadow shifts. Banned: bounce, spring overshoot, parallax, tilt. Honor `prefers-reduced-motion: reduce` (drop translations, keep/skip fades).

> Motion tokens are **visual-system references only**. This document does not decide *when* motion is implemented — only what the calm motion language is.

---

## 5. Page and Catalog Layout

Top → bottom, the page is: **sticky navigation → catalog eyebrow → card grid → footer**. **There is no hero section** and no marketing band; the grid begins immediately beneath the one-line eyebrow.

| Region | Visual |
|---|---|
| **Page canvas** | `--canvas` (#FBFAF7) warm off-white floor, full height. |
| **Container** | max-width **1280px**, centered; side padding 24px (desktop/tablet), 16px (mobile). |
| **Catalog eyebrow** | One low-emphasis utility line above the grid: short service description · catalog count (e.g. "Short, anonymous self-assessments · 9 in the catalog"). 14px, `--muted`. Reads as utility text, never a banner. Reserved space for future search/filter. |
| **Card grid** | A **single continuous responsive grid** — no section dividers, no row labels, no headings between rows. Top-row prominence is expressed by **wider columns only**. |
| **Footer** | Minimal band, hairline top border on `--canvas`: anonymous statement + privacy/terms links + language toggle. Lowest emphasis. |
| **Sticky nav surface** | Translucent `rgba(251,250,247,0.85)` + `backdrop-filter: blur(12px)`; a hairline bottom border appears only once the page is scrolled (>8px). |

**Grid rhythm** (first row = wider columns; following rows = denser):

| Width band | First row | Following rows |
|---|---|---|
| Desktop ≥1024px | 3 columns | 4 columns |
| Tablet 860–1023px | 2 columns | 3 columns |
| Lower tablet 768–859px | 2 columns | 2 columns |
| Mobile 0–767px | 1 column | 1 column |

All cards in the same row share equal height at rest (grid `align-items: stretch`).

---

## 6. Card System

Four card types: **test** (expands), **blog** (navigates, never expands), **unavailable** (inert), and the **expanded** state of a test card. Cards carry no Start CTA on any resting face.

### 6.1 Base Card

```css
.card {
  background: var(--canvas-elevated);   /* #FFFFFF */
  border: 1px solid transparent;        /* invisible at rest; reserves space so borders never shift layout */
  border-radius: var(--radius-lg);      /* 16px */
  box-shadow: var(--shadow-rest);
  padding: 16px;                        /* frames the thumbnail with a natural outer margin */
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
}
```
- **Surface:** elevated white on the warm canvas.
- **Border:** transparent 1px at rest (color does the structural work only on hover/expanded states). Reserving the border prevents layout shift when a colored border appears.
- **Height behavior:** equal-height within a row; the resting card defines the grid cell. An expanded card never changes any sibling's height.
- **Thumbnail framing:** the 16px padding gives the thumbnail a consistent inset on all sides — do not remove the padding or apply negative margins to the thumbnail.

### 6.2 Normal Test Card

**Content order (top → bottom):** 1. Thumbnail · 2. Title · 3. Subtitle · 4. Tags row.

- **Resting visual:** base card; title `--ink` 20/600, subtitle `--body` 15/400, tags pinned to the bottom of the card.
- **Thumbnail:** calm low-saturation abstract motif, `aspect-ratio: 16 / 6`, `--radius-md`.
- **Tags:** text-only `.tag` chips (see §7.4). No color dots.
- **No Start CTA.**
- **Hover visual rule — none.** The Normal test card has **no** hover border, **no** hover shadow, **no** background change, **no** visual hover treatment of any kind. **The expansion *is* the hover response.** A hover border would contradict the immediate expansion — do not add one.
- **Focus visual rule:** a visible 2px sage focus ring (`--focus-ring`, 2px offset) on `:focus-visible`. Focusing a test card expands it (parity with hover).

### 6.3 Blog Card

**Content order:** 1. Thumbnail · 2. Title · 3. Subtitle · 4. Tags row (with "Read more →" at the right end).

- **Blog cards have no expanded state.** Clicking anywhere on the card body — or on the CTA — navigates to the article.
- **Resting visual:** base card; cursor `pointer`.
- **Hover / active outline:**
  ```css
  border-color: var(--sage);
  box-shadow: 0 0 0 3px var(--focus-ring-soft), 0 8px 24px rgba(26,26,31,0.08);
  ```
  This sage border + soft glow signals navigability.
- **"Read more →" CTA placement:** right end of the tags row (`justify-content: space-between` on the tags container).
- **CTA typography:** 13px, `--muted`, no background, no border. Color does **not** change on its own hover (stays `--muted`).
- **Desktop visibility:** CTA is `opacity: 0; pointer-events: none` by default and fades in on card hover.
- **Mobile visibility:** CTA is **always visible** (`opacity: 1`).
- **No underline rule:** "Read more →" is **never underlined — not on any hover state, not ever.**
- **No READ eyebrow** appears on any blog card.

### 6.4 Unavailable Card

**Content order:** 1. Thumbnail · 2. Title · 3. Subtitle · 4. "coming soon" tag.

```css
.card.unavailable           { background: var(--surface-soft); cursor: default; }  /* #F4F1EA, warmer than elevated */
.card.unavailable .card-thumb { opacity: 0.72; }                                   /* subtle reduction only */
```
- **Surface:** `--surface-soft` — slightly warmer/softer than available cards, to read as set-apart.
- **Thumbnail opacity:** 0.72 (subtle reduction, not heavily dimmed).
- **Title / subtitle opacity:** **normal** ink/body color — **no opacity reduction on text.**
- **"coming soon" indicator:** the **standard `.tag`** format, label `coming soon` (sentence/lowercase as the data carries it), sitting in the tags-row position.
- **No dashed pill. No dot inside the tag.**
- **Affordance:** fully inert — no hover, focus, or tap response in any state, on any device. `cursor: default`. Skipped by keyboard (`tabIndex: -1`).

### 6.5 Expanded Test Card

Triggered by hover / focus / click (desktop) or first tap (mobile). It overlays its own grid cell; siblings never move.

```css
.card.expanded { border-color: var(--sage); box-shadow: var(--shadow-expanded); }
```

**Content order (top → bottom):**
1. **Context label** — the test name, 14px, `--muted`, weight 500. A quiet context cue only.
2. **Preview question** — prominent, 20–22px (21px), `--ink`, weight 600.
3. **Choice A** — text + `→` glyph.
4. **Choice B** — text + `→` glyph.
5. **Flex spacer** — absorbs surplus height (see Height behavior).
6. **Meta row** — duration · shared · completed.

**Hard visual rules — never violate:**
- **No "PREVIEW QUESTION" label** and no section label of any kind.
- **No A/B letter badges** — choices are **text + `→` only**.
- **No horizontal divider** between the choices and the meta row.
- Thumbnail, subtitle, and resting tags are **removed** from this state.
- Choice text **wraps freely — never truncated**.
- Meta label reads **"completed"** (not "taken"/"have taken"). Numbers are shown full-digit.

**Spacing / height behavior:** the expanded card's minimum height equals the resting cell height, so it is **always ≥ the Normal card height**. Any surplus height accumulates **only** in the flex spacer between the last choice and the meta row — no other internal gap is affected. When content is taller than the cell (e.g. a long choice), the card **grows downward** and overlays the rows below via z-index; it never reflows or resizes siblings.

**Close button visibility rule:** **Desktop — none** (moving the pointer away collapses the card). **Mobile — always visible** (top-right ✕).

**Choice button:**
```css
.choice {
  background: var(--canvas-elevated);
  border: 1px solid var(--hairline-strong);
  border-radius: var(--radius-md);       /* 12px */
  padding: 12px 14px;                    /* equal top/bottom; no min-height */
  display: flex; align-items: flex-start; gap: 12px;
  width: 100%; text-align: left; cursor: pointer;
}
.choice:hover { border-color: var(--sage); background: var(--sage-muted); }
```

### 6.6 Mobile Expanded Card

```css
.card.expanded.mobile {
  position: absolute; top: 0; left: 0; right: 0;   /* full viewport width, flush to GNB bottom */
  border-radius: 0;                                 /* no left/right radius — reads as chrome, not a floating card */
  border: none;
  border-bottom: 2px solid var(--sage);             /* bottom accent border */
  box-shadow: var(--shadow-overlay);
  background: var(--canvas-elevated);
  padding: 18px 16px 20px;
}
```
- **Full-width**, zero left/right margin.
- **GNB-flush:** top edge sits at the bottom of the sticky nav; natural content height.
- **Scrim:** the grid beneath is covered by an `--overlay-scrim` (rgba(26,26,31,0.48)) layer; tapping it collapses the card.
- **Close button:** ✕ **always visible**, top-right.
- Dismissal: ✕ · tap scrim · swipe down · Esc. The collapse is animated.

---

## 7. Component Specifications

### 7.1 Thumbnail

```css
.card-thumb {
  aspect-ratio: 16 / 6;
  border-radius: var(--radius-md);   /* 12px */
  width: 100%;
  overflow: hidden;
  flex-shrink: 0;
}
```
- **Aspect reference:** `16 / 6` (wide letterbox), as realized in the final mockup.
- Sits inside the card's 16px padding, so it has a natural outer margin on all sides.
- **Imagery vibe:** warm, low-saturation, calm (sage / warm-neutral / clay family). The mockup uses abstract geometric motifs as placeholders — real imagery should follow the same calm, soft-daylight, low-saturation direction. No neon, no cold-blue tech imagery, no heavy duotones.

### 7.2 Title

| Property | Value |
|---|---|
| Font size | 20px |
| Weight | 600 |
| Line-height | 1.3 |
| Tracking | -0.01em |
| Color | `--ink` (#1A1A1F) |
| Wrapping | wraps freely; `word-break: keep-all`; never truncated |

### 7.3 Subtitle

| Property | Value |
|---|---|
| Font size | 15px |
| Weight | 400 |
| Line-height | 1.45 |
| Color | `--body` (#4A4A55) |
| Wrapping | wraps freely; never truncated |

### 7.4 Tags

```css
.tag {
  border-radius: 5px;            /* exact value — --radius-xs */
  background: var(--tag-bg);     /* #F0ECE2 */
  color: var(--tag-fg);          /* #4A4A55 */
  font-size: 13px;
  font-weight: 500;
  line-height: 1.35;
  padding: 4px 9px;
  white-space: nowrap;
  display: inline-flex; align-items: center;
}
```
- **Text-only.** No color dots — no `color` property exists in any card's tag data. (The underlying chip *could* render a dot, but the catalog data never carries one.)

### 7.5 Read More CTA

| Property | Value |
|---|---|
| Label | `Read more →` |
| Position | right end of the blog card's tags row |
| Color | `--muted` (#7A7A85) — unchanged on its own hover |
| Font size | 13px, weight 500 |
| Opacity behavior | desktop: 0 → fades in on card hover; mobile: always 1 |
| Underline | **never**, in any state |

### 7.6 Coming Soon Tag

- Uses the **standard `.tag`** format (same as §7.4).
- Label casing: `coming soon` (as the data carries it).
- **No dashed outline. No dot.**

### 7.7 Choice Buttons

| Property | Value |
|---|---|
| Background | `--canvas-elevated` (#FFFFFF) |
| Border | 1px `--hairline-strong` (#D6D1C4) |
| Radius | `--radius-md` (12px) |
| Padding | 12px 14px (equal top/bottom; no `min-height`) |
| Text alignment | left |
| Wrapping | free; never truncated |
| Arrow glyph | `→` only, leading-aligned to the top of wrapped text |
| Hover | border → `--sage`, background → `--sage-muted` |
| **No A/B badge** | choices are text + `→` only |

### 7.8 Meta Row

| Property | Value |
|---|---|
| Typography | 13px, weight 500, `--muted` |
| Separator | a middle dot `·` in `--muted-soft` between items |
| Numbers | shown full-digit (e.g. `12,000`, `12,480`) |
| Labels | `<duration>` · `<n> shared` · `<n> completed` |
| Emphasis | the duration is `--body`, weight 600; the rest `--muted` |

Use the label **"completed"** (never "taken").

---

## 8. Navigation Visuals

### 8.1 Desktop Navigation

- **Sticky surface:** `rgba(251,250,247,0.85)` + `backdrop-filter: blur(12px)`; hairline bottom border appears only on scroll (>8px). Height 64px; content within the 1280px container.
- **Left:** sprout logo · "Test history" · "Blog" (15px, weight 500, `--body`; hover → `--ink`).
- **Right:** a **static language / theme pill** — `"English"` · a thin vertical divider · a ☀ (sun) icon. `border-radius: 999px`, 1px `--hairline` border, transparent background; hover deepens to `--hairline-strong` border + `--surface-muted` background. **Display only — no dropdown.**
- **No gear / settings icon. No hamburger.**

### 8.2 Mobile Navigation

- **Sticky surface:** same translucent blurred surface; height 56px.
- **Left:** sprout logo.
- **Right:** a **hamburger pill** (≥44×44px, pill radius, 1px hairline) that opens the full-screen menu overlay.

### 8.3 Mobile Menu Overlay

- **Coverage:** full screen from `top: 0`, **including the GNB**, at `z-index: 100`. Tapping the scrim closes it.
- **Panel:** `--canvas` fill, bottom corners `--radius-xl` (24px), `--shadow-overlay`.
- **Header row:** mirrors the mobile nav exactly — logo left, ✕ right, same height and padding. **No duplicate logo.**
- **Nav links (in order):** `Test history` · `Blog` · `About vive`. **No "Catalog" item.**
  - **Current-page indicator dot:** a small **moss dot** (`--sage`, pill) on "Test history" as the current-page example. Dot and the chevrons on the other rows share an identical 24px-wide, centered affix container, so they sit on the same vertical axis.
- **Theme segmented control:** segments **Light · Dark · System**; **Light is the only active segment** (white fill, `--shadow-rest`). Dark / System: subtle `--surface-muted` hover tint, `cursor: default`. **No placeholder/"coming" text of any kind.**
- **Language chip grid** (`flex-wrap: wrap; gap: 8px`): `English · 한국어 · 简体中文 · 繁體中文 · 日本語 · Español · Français · Português · Deutsch · हिन्दी · Indonesia · Русский`.
  - **Active chip (English):** `background: var(--sage-muted)`, `color: var(--sage)`, `border: 1px solid transparent`, no hover effect, `cursor: default`.
  - **Inactive chips:** `background: var(--canvas-elevated)`, `border: 1px solid var(--hairline)`; hover → `--hairline-strong` border + `--surface-muted` background; `cursor: pointer`.

---

## 9. State and Interaction Visual Rules

Design-intent level only (visual + behavioral), independent of any implementation ordering.

| State | Test card | Blog card | Unavailable card |
|---|---|---|---|
| **Resting** | Base card; thumbnail · title · subtitle · tags. No CTA. | Base card; CTA hidden (desktop) / visible (mobile). | Warmer fill, thumbnail at 0.72 opacity, normal-opacity text, "coming soon" tag. |
| **Hover (desktop)** | **No visual change** — expands instead (150ms dwell). | Sage border + soft glow; "Read more →" fades in. | No reaction. |
| **Focus (keyboard)** | Visible sage ring; expands (parity with hover). | Visible sage ring; no expansion; Enter/Space navigates. | Skipped (`tabIndex: -1`). |
| **Expanded** | Sage border + `--shadow-expanded`; context label · question · A/B (text + →) · meta. Desktop: no ✕. Surplus height pools above the meta row only. | — (blog never expands) | — |
| **Mobile focused** | Full-width sheet flush to GNB bottom, sage bottom accent, ✕ always visible, scrim over the grid, scroll locked. | Tap navigates to the article. | No-op — no ripple, no feedback. |

**Cross-cutting rules:**
- **Single-expand:** only one test card is expanded at a time; opening another collapses the first (animated).
- **Anchored expansion (desktop/tablet):** the expanded overlay anchors by column position — leftmost expands rightward (left edge fixed), rightmost expands leftward (right edge fixed), middle columns expand symmetrically from center. It overlays via z-index and never reflows siblings. Row 1 expands conservatively (~400px target); Row 2+ expand more generously (~360px target), never narrower than the natural column.
- **Collapse is animated** — the reverse of expansion (content fades, then the outline contracts). Abrupt removal is not acceptable.
- **Focus is always visible** on every interactive element; never removed.
- **Never truncate** titles, subtitles, or choice text; all containers wrap freely. Tap targets ≥ 44×44px (A/B choices, "Read more →", ✕, hamburger).

---

## 10. Never Include

These must **not** be reintroduced anywhere in the catalog:

- A **"PREVIEW QUESTION"** section label (or any expanded-content section label).
- **A/B letter badges** on choices — choices are text + `→` only.
- A **"READ"** eyebrow on blog cards (or any card eyebrow).
- A **dashed "Coming soon" pill** — use the standard tag format.
- A **dot inside the "coming soon" tag**.
- **Tag color dots** in catalog data — tags are text-only.
- A **gear / settings icon** in the desktop nav (replaced by the static language/theme pill).
- A **hamburger** in the desktop nav.
- An **underline on "Read more →"** — never, in any state.
- A **hover border, hover shadow, or hover background on Normal test cards** — the expansion is the hover response.
- **Opacity reduction on the unavailable card's title or subtitle** — text stays at normal opacity.
- The text **"Dark mode is coming in a later phase."** (or any equivalent placeholder copy on the theme control).
- A **"Catalog"** item in the mobile menu nav.
- *(If motion implementation is documented):* **`layoutId` / `LayoutGroup`** layout-animation patterns — they cause diagonal element movement during expansion. Use a staged, phase-based entrance instead.
- *(If implementation notes are documented):* **`min-height: 100%`** as the expanded-overlay height invariant — it collapses the overlay to thumbnail height in practice. The height floor must be an explicit measured **pixel** value taken from the resting card.

---

## 11. Resource Manifest

Move these resources together with `design.md`. Paths are relative, assuming the document lives beside a `resources/` directory.

| Resource | Type | Demonstrates | Consult when |
|---|---|---|---|
| `resources/screenshots/canvas-overview.png` | Screenshot | Full set of realized screens on one canvas: desktop catalog (with a test card expanded), tablet catalog at rest, and the three mobile screens (browse, focused-expand, menu overlay). | Orienting to the overall composition and the relationship between screens. |
| `resources/screenshots/desktop-full.png` | Screenshot | Full desktop catalog composition (1280px): sticky nav, eyebrow, the 3-up first row with a card expanded, the 4-up following rows, blog cards, unavailable cards. | Verifying desktop grid rhythm, card scale, thumbnail framing, and the expanded card in context. |
| `resources/screenshots/desktop-nav-expanded.png` | Screenshot | Close-up of the desktop nav (logo · Test history · Blog), the catalog eyebrow, and a fully expanded test card (context label, preview question, both choices). | Checking nav layout, eyebrow tone, and expanded-card typography/spacing at 1:1. |
| `resources/screenshots/expanded-card-spec.png` | Screenshot | The expanded test card at Row-1 width with its rules, alongside a blog hover-state card — context label, question, text + → choices, and the `3 min · 12,000 shared · 12,480 completed` meta row. | Implementing the expanded card and blog hover state precisely. |
| `resources/assets/vive-logo.svg` | Asset (SVG) | VIVE sprout wordmark used in the nav and menu header. | Placing the brand mark in navigation. |
| `resources/assets/vive-mark.svg` | Asset (SVG) | VIVE sprout mark (icon only), light/dark safe. | When only the mark (no wordmark) is needed. |

*Tablet and the individual mobile screens are not provided as separate close-ups; they are clearly legible in `canvas-overview.png`. The mockup's thumbnails are calm abstract placeholders — substitute real, low-saturation imagery in the same vibe.*

---

## 12. Implementation Boundary Note

This document is the visual reference for the ViveTest catalog design. It does not grant permission to modify any specific files, does not define implementation waves, does not define QA gates, and does not replace project requirements, decision records, or repository rules. Implementation agents must read this document only as visual reference and determine the applicable implementation scope from the rebuild project's own documents.
