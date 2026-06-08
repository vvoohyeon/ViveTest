---
version: rev2
name: VIVE-ViveTest-design-system
description: A calm, warm-neutral design-system foundation for lightweight, trustworthy digital products, applied to the ViveTest anonymous short-assessment catalog. Anchors on a warm off-white canvas with a sage / moss accent, Pretendard bilingual typography, hairline structure, restrained depth, and quiet motion. The product identity is the card catalog itself — test, blog, and unavailable cards, plus an in-grid expanded test-preview state — not a marketing hero. Adapted from the CLAY design-analysis document for structure only; CLAY's claymation personality, saturated multi-color feature cards, and hero-driven marketing direction are intentionally not carried over.
---

## 1. Document Role and Authority

This is the **VIVE design-system foundation** document, with a **ViveTest catalog application layer** built on top of it. It defines the visual language: foundations, tokens, reusable visual components, and the visual application patterns for the ViveTest catalog surface.

It is adapted from the CLAY `DESIGN.md` for **document structure and design-system framing only**. CLAY's visual values are not preserved where they conflict with VIVE / ViveTest.

**What this document is:**
- A reusable, general-purpose visual foundation (usable beyond the catalog page).
- The authority for visual foundations, tokens, reusable visual components, and visual application patterns.

**What this document is not:**
- Not an implementation wave plan.
- Not a QA or test plan, and not a visual-regression baseline authority.
- Not an implementation prompt or Coding Agent instruction.
- Not a product-behavior contract. It does not own routing, telemetry, storage, test-flow business logic, data contracts, or scoring.
- Not a replacement for product requirements, decision records, or repository rules.

**Authority order when conflicts arise:**
1. Project **decision records** override this document.
2. Product **requirements / roadmap / repository rules** own behavior and implementation.
3. This document owns **visual** foundations, tokens, components, and patterns.
4. **Mockup screenshots are interpretation aids only** — they never override written rules.

The design **reference** screenshots listed in the Resource Manifest (Section 9) are distinct from the project's **visual-regression test baselines**. This document does not authorize regenerating or editing those test baselines.

---

## 2. Source Provenance

This document is the product of several inputs, each contributing a specific layer of authority.

| Source | Contributes | Authority |
|---|---|---|
| **Original CLAY `DESIGN.md`** | Document structure, section framing, design-system completeness model | Structure / framing only — **no visual values** |
| **VIVE Design System direction** | Visual personality, color philosophy, Pretendard typography, spacing/radius/elevation/motion language, voice | Foundation visual direction |
| **ViveTest Phase 1 IA / Interaction Plan (rev3)** | Catalog IA, card-state model, responsive grid rhythm, interaction intent, no-hero rule, blog no-expanded rule, unavailable no-op rule, expanded-card content rules | Application structure & intent |
| **ViveTest Phase 2 Visual Mockup (rev4)** | Realized typography, color tokens, shadows, radii, motion tokens, card visual rules, navigation visuals, mobile-menu visuals, the "never include" list | **Primary source of finalized token values** |
| **Realized wave visual references** | Confirmed component CSS handoffs (Normal card, expanded-content, expanded-skin) | Canonical for their components |
| **Final mockup resources** | Screenshots, canvas output, component artboards, token CSS, logo/mark assets | Interpretation support only — not written authority |

CLAY contributes the *shape* of a complete design-system document. The **VIVE system and the ViveTest mockups provide the actual visual values.** Where a realized wave reference and rev4 agree, the value is canonical. Where they conflict, the conflict is surfaced inline as a short note rather than silently resolved.

---

## 3. Design-System Architecture

The system is organized in four layers, deepest first. Read and apply them in this order:

1. **Foundations** (Section 4) — the durable principles: personality, voice, type, color philosophy, spacing, radius, elevation, motion, imagery, accessibility, localization. Rarely change.
2. **Tokens** (Section 5) — the concrete, finalized values expressed as CSS custom properties. The single source of truth for color, surface, text, border, accent, tag, focus/scrim, shadow, radius, spacing, and motion.
3. **Reusable Components** (Section 6) — general-purpose primitives built from tokens, kept reusable beyond the catalog: base card, thumbnail, tag/chip, button / choice-button, pill, language/theme pill, navigation surface, menu panel, focus ring, meta row.
4. **Patterns / Application** (Section 7) — ViveTest-specific arrangements of those components: the catalog page, the four card patterns, navigation, responsive rhythm, and the mobile expanded visual.

**Rule:** product-specific decisions live in **Patterns / Application**, not scattered through Foundations and Components. A foundation or component rule should read as reusable; if it only makes sense for the catalog, it belongs in Section 7.

The realized system styles components with **semantic tokens directly**. An optional product/catalog alias is introduced only where one is genuinely needed — there is no deep primitive→semantic→alias indirection.

---

## 4. Foundations

### 4.1 Visual personality
VIVE expresses **calm competence**: clear, lightweight, modern, trustworthy, and slightly warm — *not* game-like, *not* clinical, *not* a heavy dashboard. Warmth comes from neutral off-white surfaces and a single sage / moss accent, never from saturated color or decorative illustration. Hierarchy is built from **surface tint and hairlines first**, with shadow reserved for genuinely floating things.

For ViveTest specifically, the **card catalog is the primary visual identity**. There is no marketing hero band and no saturated feature-card system; the calm grid of cards carries the brand.

### 4.2 Product voice
- **Tone:** quiet and competent; reassuring without being chirpy. No urgency, no sales language, no exclamation marks in product UI.
- **Person:** address the user as **"you."** Refer to the product by name or as the neutral subject, never "I."
- **Casing:** **sentence case everywhere** — buttons, headings, menus, labels. ALL CAPS only for the small tracked overline. Catalog tag labels are the deliberate exception: use lowercase in writing systems with case, while caseless scripts preserve their localized source value.
- **Length:** short. Buttons are verbs or verb-nouns. Helper text is one sentence.
- **No emoji**, no gamified or congratulatory copy. Confirmation is calm.
- **Numbers:** in dense catalog UI, use numerals paired with their noun; **full-digit counts only** (no `k` / `m` abbreviations) where the realized catalog displays them.

### 4.3 Typography foundation
- **One family does everything: Pretendard Variable** (covers Korean + Latin with matched metrics, so bilingual layouts stay even). Weights 400 / 500 / 600 / 700.
- The display stack falls back gracefully through system bilingual faces (see `--font-sans` in Section 5).
- **Global wrapping rule:** wrapping text uses `word-break: keep-all; overflow-wrap: anywhere;`.
- **Catalog title matrix:** Desktop/Tablet Normal is single-line ellipsis; Mobile Normal is full text with no ellipsis; Mobile Expanded and transient titles are full text with no ellipsis; Desktop/Tablet Expanded preserves the measured Normal first-line split and reveals the full overflow text.
- Normal catalog subtitles use a two-line ellipsis clamp. Expanded choice text wraps without a line limit or truncation.

### 4.4 Color philosophy
- **Atmosphere:** warm-neutral, low-contrast calm. The page floor is a warm off-white, never cool grey or pure white. Cards sit one step brighter than the canvas.
- **Primary accent:** a single **sage / moss** used for selection, focus, the expanded-card edge, and quiet emphasis. It signals trust without shouting.
- **No saturated multi-color card palette.** Color does little structural work; **hairlines and surface tint** carry hierarchy.
- **Imagery vibe (when used):** warm, natural, soft daylight, low saturation. No neon, no cold blue tech imagery, no heavy duotones.

### 4.5 Spacing
- **4px base unit.** Component padding clusters around 12–24px. Card internal padding is **16px** (realized base card), which also produces the natural outer margin around the thumbnail.
- Catalog content is centered within a max width with comfortable gutters; the grid uses CSS grid with `gap`.

### 4.6 Radius
Restrained — softer than playful, firmer than sharp. Tag chips are the smallest radius; choice buttons and thumbnails share the medium radius; cards use the large radius; the mobile menu panel uses the extra-large radius. Exact values are tokenized in Section 5.

### 4.7 Elevation & depth
**Depth is a whisper.** Warm-tinted, low-alpha shadows tint with the ink color, never pure black, never large halos. Resting cards carry only a faint shadow; the expanded card lifts one step; true overlays (mobile sheet, menu) use the deepest step. Hierarchy is primarily surface + hairline, not shadow.

### 4.8 Motion
Calm and purposeful — opacity fades, small translations, color and shadow transitions. **Banned:** bounce, spring overshoot, parallax, card tilt, auto-playing decorative motion. Honor `prefers-reduced-motion`. Full motion language in Section 8.

### 4.9 Imagery
Thumbnails and imagery stay in the warm-neutral / sage family at low saturation, inside the medium card radius. In the realized catalog, thumbnails are calm abstract placeholders pending real imagery; they must not introduce neon or cold-blue tech aesthetics.

### 4.10 Accessibility
- **Focus is strong and always visible** — a sage ring with a canvas offset on `:focus-visible`; never removed.
- Tap targets are at least **44×44px** for choices, "Read more," the close button, and the hamburger.
- The "coming soon" state must read as unavailable without relying on color alone.
- Unavailable cards are removed from the tab order; they are visually inert but not styled like a broken disabled button.

### 4.11 Localization
Korean and English string lengths differ. Keep labels short, use `word-break: keep-all` for Korean line-breaking, and use `overflow-wrap: anywhere` as the Latin fallback. Catalog text follows the state/breakpoint exceptions in §4.3: Desktop/Tablet Normal titles use one-line ellipsis, Mobile Normal/Expanded/transient titles show full text, Desktop/Tablet Expanded preserves the Normal first-line split while showing the full title, Normal subtitles use two-line ellipsis, and Expanded choices wrap without truncation. Case-bearing catalog tag labels are lowercase in localized source values; caseless scripts remain unchanged.

---

## 5. Tokens

Tokens are expressed as **CSS custom properties** and styled onto components **directly** (no YAML, no deep indirection). Reuse these exact identifiers; do not rename them and do not introduce unresolved names. Values marked **intent-only** are not finalized — do not guess a hex.

### 5.1 Typography tokens
```css
--font-sans: "Pretendard Variable", "Pretendard",
             -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo",
             "Segoe UI", Roboto, "Helvetica Neue", Arial,
             "Noto Sans KR", sans-serif;
```

Realized type roles (size / weight / line-height):

| Role | Size | Weight | Line-height |
|---|---|---|---|
| Card title | 20px | 600 | 1.3 |
| Card subtitle | 15px | 400 | 1.45 |
| Expanded question | 20–22px | 600 | 1.3 |
| Expanded context label | 14px | 500 | 1.4 |
| Choice text | 15px | 400 | 1.45 |
| Tags / meta | 13px | 500 | 1.35 |
| Catalog eyebrow / utility line | 14px | 400 | 1.4 | --muted |

### 5.2 Canvas & surface tokens
```css
--canvas:          #FBFAF7;   /* warm off-white page floor */
--canvas-elevated: #FFFFFF;   /* card fill, one step brighter */
--surface-soft:    #F4F1EA;   /* unavailable-card surface (warmer) */
--surface-muted:   #ECE8DF;   /* hover fill for neutral controls */
```

### 5.3 Text tokens
```css
--ink:        #1A1A1F;   /* headlines, expanded question */
--ink-soft:   #2E2E36;   /* emphasized body / choice text */
--body:       #4A4A55;   /* default running text, subtitle */
--muted:      #7A7A85;   /* context label, meta, captions */
--muted-soft: #A6A6AE;   /* fine separators, dot separators */
```

### 5.4 Border tokens
```css
--hairline:        #E6E2D8;   /* 1px structural borders */
--hairline-strong: #D6D1C4;   /* choice-button edge, emphasized borders */
```

### 5.5 Accent tokens
```css
--sage:       #5C8E78;   /* primary accent: selection, focus, expanded edge */
--sage-soft:  #C9DBD1;   /* soft sage tint */
--sage-muted: #E8F0EC;   /* active language chip + choice hover background */
```

### 5.6 Tag tokens
```css
--tag-bg: #ECE8DF;
--tag-fg: #4A4A55;
```
Catalog tags use a `1px solid var(--hairline-strong)` edge. **No `color` property exists in catalog tag data** — tags are text-only; no color dots.

### 5.7 Focus & scrim tokens
```css
--focus-ring:      #5C8E78;
--focus-ring-soft: rgba(92,142,120,0.22);   /* blog-hover glow */
--overlay-scrim:   rgba(26,26,31,0.48);      /* mobile sheet + menu scrim */
```

### 5.8 Shadow tokens
```css
--shadow-rest:     0 1px 2px rgba(26,26,31,0.04);
--shadow-hover:    0 4px 14px rgba(26,26,31,0.06),
                   0 0 0 1px var(--hairline-strong);
--shadow-blog-hover: 0 4px 14px var(--focus-ring-soft);
--shadow-expanded: 0 12px 32px rgba(26,26,31,0.08),
                   0 0 0 1px var(--hairline-strong);
--shadow-overlay:  0 24px 64px rgba(26,26,31,0.18);
```

### 5.9 Radius tokens
```css
--radius-xs:   5px;     /* tag chips — exact realized value */
--radius-sm:   8px;
--radius-md:   12px;    /* choice buttons, thumbnails */
--radius-lg:   16px;    /* cards */
--radius-xl:   24px;    /* mobile menu panel */
--radius-pill: 999px;
```

### 5.10 Spacing
4px base unit. The realized base card uses **16px** internal padding (which yields the thumbnail's outer margin); choice buttons use **12px 14px**.

Layout spacing scale (reference rhythm for gaps, padding, and grid gutters):
```css
--space-2xs:     4px;    /* base unit; tightest internal gap */
--space-xs:      8px;    /* tag gap, choice-list gap */
--space-sm:      12px;   /* card content gap, choice inner gap */
--space-md:      16px;   /* base card internal padding (realized) */
--space-lg:      24px;   /* desktop grid gutter, container side padding */
--space-xl:      32px;   /* intent-only */
--space-2xl:     48px;   /* intent-only */
--space-section: 96px;   /* intent-only — non-catalog editorial band rhythm */
```
`--space-2xs … --space-lg` are realized in the catalog (24px is the desktop grid gutter and the desktop/tablet container side padding); `--space-xl` and larger are **intent-only** until a non-catalog surface uses them. Some component paddings sit deliberately off this 4px grid (choice button `12px 14px`, tag `4px 9px`); those are component-specific values and live with their components (§6.3, §6.4), not in this scale. These tokens document rhythm — the codebase may realize spacing via utility classes rather than consuming these names directly.

### 5.11 Motion tokens
```css
--ease-standard: cubic-bezier(0.2, 0, 0, 1);   /* entrances, state changes */
--ease-out:      cubic-bezier(0.0, 0, 0.2, 1);
--ease-in:       cubic-bezier(0.4, 0, 1, 1);
--dur-fast:      140ms;
--dur-base:      220ms;
--dur-expand:    260ms;
```

---

## 6. Reusable Components

These primitives are built from tokens and kept general enough to reuse beyond the catalog. Catalog-specific behavior lives in Section 7.

### 6.1 Base card
Warm elevated fill, `1px solid var(--hairline)` border at rest, large radius, resting shadow, **16px** padding, vertical flex with gap. The 1px border box already exists, so the structural hairline introduces no layout shift. The 16px padding is intentional and creates the thumbnail's outer margin on all sides — do not remove it or apply negative thumbnail margins.

### 6.2 Thumbnail
A `16 / 6` aspect-ratio block at medium radius, full width, clipped. It sits inside the card's 16px padding and therefore has a natural outer margin on every side.

### 6.3 Tag / chip
Text-only lowercase chip at `--radius-xs` (5px), `--tag-bg` fill, `1px solid var(--hairline-strong)` edge, `--tag-fg` text, 13px / 500, `4px 9px` padding, and no wrap. Long labels may ellipsize inside the fixed one-line tags slot. Test, Blog, and Unavailable use one shared treatment with no per-type exception. **No color dot, ever.**

### 6.4 Button / choice-button primitive
The realized choice button: elevated fill, 1px `--hairline-strong` edge, `--radius-md`, **`12px 14px`** padding, left-aligned, full width, top-aligned icon. Hover deepens the edge to `--sage` with a `--sage-muted` fill — a calm deepening, not a color change. This is the reusable interactive-row primitive; it carries no letter badges by default.

### 6.5 Pill
Generic pill at `--radius-pill` for chips, toggles, and small status holders.

### 6.6 Static language/theme pill
A transparent, hairline-bordered pill showing a language label, a thin vertical divider, and a theme glyph. Static display only — no dropdown. Hover deepens the border and picks up `--surface-muted`. This replaces any gear/settings affordance.

### 6.7 Navigation surface
A sticky top bar over a translucent canvas with a quiet backdrop blur; a hairline bottom border appears once content scrolls beneath it. Flat until scrolled.

### 6.8 Menu panel
A full-width overlay panel on `--canvas` with bottom corners at `--radius-xl` and the deepest overlay shadow, sitting above a scrim. Its header row mirrors the navigation it belongs to.

### 6.9 Focus ring
A 2px `--focus-ring` outline with a 2px offset on `:focus-visible`. Always visible; never removed.

### 6.10 Meta row / quiet data row
A horizontal, wrapping row of small (13px / 500) `--muted` items separated by thin dot separators, with the complete leading duration item (value and label) optionally emphasized at 600 / `--body`. A general low-emphasis data line, reusable anywhere a quiet stat row is needed.

---

## 7. Patterns / Application Layer

ViveTest-specific composition of the primitives above.

### 7.1 Catalog page
- **No hero.** No marketing band, no large headline, no illustration band.
- A single **minimal eyebrow** line (brief service description + catalog count) sits above the grid as low-emphasis utility text — it must read as utility, not a banner, and reserves space for future search/filter.
- **One continuous card grid** — no section dividers, labels, or row headings.
- The **card system is the primary identity.**
- The **footer** is low-emphasis chrome: anonymous statement, privacy/terms links, locale toggle.

### 7.2 Normal test card
Content order: **Thumbnail → Title → Subtitle → Tags.**
- Available cards use exact `--canvas-elevated` (`#FFFFFF`) with a resting `--hairline` structural edge.
- Title typography is 20px / 600 / 1.3 / `-0.01em`; subtitle typography is 15px / 400 / 1.45 / `--body`.
- Apply the §4.3 title matrix and the two-line Normal subtitle ellipsis clamp.
- **No Start CTA** on the front face.
- **No direct navigation** from the front face.
- **No independent hover** border, shadow, or background — **expansion is the hover response.** Adding a hover border would contradict the immediate expansion.

### 7.3 Expanded test card
Content order: **context label → preview question → choice A → choice B → meta row.** Thumbnail, subtitle, and tags are removed in this state.
- Desktop and mobile context typography is 14px / 500 / 1.4 in the muted role. On exact white card surfaces, the scoped card value is `#757580` (the nearest AA-compliant adjustment to `--muted`); the global token remains unchanged until Wave 16.
- The full title remains available. Desktop/Tablet preserves the measured Normal first-line split and reveals overflow text beneath it; Mobile and transient states wrap the full title without ellipsis.
- **No `PREVIEW QUESTION` label.**
- **No A/B letter badges** — choices are **text + `→` only.**
- **No divider** between choices and meta.
- Choice text **wraps freely; never truncated.** Equal top/bottom choice padding; no `minHeight` on choices.
- Meta label is **`completed`** (never `taken` / `have taken`); numbers are full-digit. Emphasize the complete duration item only; shared and completed remain plain `--muted`.
- The expanded card uses exact `--canvas-elevated`, a `--sage` edge, and `--shadow-expanded`.
- **Height invariant:** the expanded card must be **at least the resting card height**. The realized mechanism measures the resting card's height in **explicit pixels** and applies it as a floor; surplus height is absorbed **only** between the last choice and the meta row (a single flex spacer). The card grows downward when content overflows. **Do not** express this invariant as `min-height: 100%`.
- The floor/spacer affects only the expanded card's own height; it must not change any same-row card's track height (the row-isolation behavior is governed by the product requirements, not by this document).

### 7.4 Blog card
- **No expanded state.** The card body navigates to the article on click/tap.
- **`Read more →`** sits at the right end of the tags row: revealed on hover at desktop, always visible on mobile. Its label and arrow are separate visual children with an explicit 6px gap inside the same non-interactive affordance.
- **Never underlined**, and its color does not change on its own hover.
- **No `READ` eyebrow** (no eyebrow on any card).
- Blog is the one card with a hover skin: a `--sage` border plus `--shadow-blog-hover` (using the `--focus-ring-soft` glow), signalling navigability.

### 7.5 Unavailable card
- Warm **`--surface-soft`** surface, slightly distinct from available cards.
- Thumbnail may dim **subtly only** (realized: thumbnail `opacity 0.72`); **title and subtitle keep normal opacity.**
- A lowercase **standard `coming soon` tag** in the tags-row position, using the shared `--tag-bg` + `--hairline-strong` treatment with no Unavailable-specific exception — **no dashed pill, no dot.**
- Visually inert and removed from the tab order, but **not** styled like a broken disabled button.

### 7.6 Navigation
- **Desktop:** logo + text links, plus the **static language/theme pill** at the right. **No desktop gear/settings icon. No desktop hamburger.**
- **Mobile:** logo + hamburger pill.
- Realized nav heights: desktop ~64px, mobile ~56px; sticky over a translucent blurred canvas, hairline bottom border appearing on scroll.
- **Mobile menu** is a full-screen overlay that **covers the GNB**; its header row mirrors the mobile nav exactly (logo left, close right) with **no duplicate logo**.
- Menu nav items: **Test history** (current-page dot indicator) · **Blog** · **About vive**. **No `Catalog` item.**
- Theme control is a segmented Light · Dark · System with **Light active only**; **no dark-mode placeholder text.**
- Preserve the realized **12-locale chip set** — English · 한국어 · 简体中文 · 繁體中文 · 日本語 · Español · Français · Português · Deutsch · हिन्दी · Indonesia · Русский — with the active chip on `--sage-muted` background, `--sage` text, transparent border, and no hover effect; inactive chips are elevated with a hairline and a calm hover.

### 7.7 Responsive catalog
- **Wide desktop:** first row 3 columns, following rows 4 columns.
- **Medium:** 2 → 3.
- **Lower tablet:** 2 → 2.
- **Mobile:** single column.
- Realized reference widths: desktop catalog ~1280px container, tablet ~920px, mobile ~390px; content centered within the max width.
- **Top-row prominence comes from wider columns only** — no extra spacing, divider, heading, label, or hero band between rows.
- Expanded width targets: the realized **Row 1 target is conservative (~400px)** and **Row 2+ is more generous (~360px)**, anchored **left / center / right by column position**, never shrinking below the natural column width. The expanded card overlays via z-index and **never reflows siblings.**
- **Breakpoint thresholds (realized):** Wide desktop ≥ 1024px (3 → 4 columns) · Medium 860–1023px (2 → 3) · Lower tablet 768–859px (2 → 2) · Mobile ≤ 767px (1 column).
- **Grid gutter (realized):** 24px desktop · 20px tablet · 14–16px mobile. The 20px tablet gutter sits deliberately off the 4px-derived scale and is a catalog-grid-specific value.

### 7.8 Mobile expanded visual
- **Full viewport width, no side margin**, top edge **flush to the GNB bottom**.
- A **scrim** dims the grid beneath.
- **Visible close button** (top right).
- **No left/right card radius** — it reads as chrome, not a floating card; a `--sage` bottom edge anchors it.
- This document describes the **visual** only. It does **not** authorize **swipe-down close** as a behavior.

---

## 8. Motion Guidance

This document defines the **visual motion language only**; it does not decide *when* motion is implemented.

- **Easing & duration tokens** (from rev4): `--ease-standard: cubic-bezier(0.2,0,0,1)`, `--ease-out: cubic-bezier(0.0,0,0.2,1)`, `--ease-in: cubic-bezier(0.4,0,1,1)`, `--dur-fast: 140ms`, `--dur-base: 220ms`, `--dur-expand: 260ms`.
- **Allowed:** opacity fades, small translations, color transitions, shadow-depth changes, the staged expand/collapse (outline → resting content exits → expanded content enters with a short stagger; collapse is the explicit animated reverse — never an instant removal).
- **Banned:** bounce, spring overshoot, parallax, card tilt, auto-playing decorative motion.
- **Reduced motion:** under `prefers-reduced-motion: reduce`, drop translate animations and keep opacity fades only.
- **Cautions, not permissions:** do **not** recommend `layoutId` / `LayoutGroup` (they cause diagonal element movement during expansion). Any implementation note here is a caution about visual outcome, not a grant of implementation approach.

---

## 9. Resource Manifest

Accompanying visual resources (interpretation aids; not written authority, and distinct from visual-regression baselines):

| Resource | Description |
|---|---|
| Token CSS | `colors_and_type.css` — finalized custom properties |
| Component CSS | `styles.css` — realized component styles |
| Canvas overview | Full design-canvas output of all artboards |
| Desktop full page | 1280px catalog landing (default expanded card) |
| Desktop normal cards | Test / Blog / Unavailable at ~380px |
| Desktop blog hover | Blog active/hover state at 400 and 360 |
| Desktop expanded Row 1 | Expanded test at 400px + notes |
| Desktop expanded Row 2+ | Expanded test at 360px (long-choice) + notes |
| Tablet full page | 920px catalog landing |
| Mobile browse | 390px browse stack |
| Mobile expanded | 390px full-width sheet flush to GNB |
| Mobile menu | Full-screen menu overlay |
| Logo SVG | `assets/vive-logo.svg` |
| Mark SVG | `assets/vive-mark.svg` |

**Recommended missing resources** (not yet produced — do not assume they exist):
- Real catalog thumbnail imagery (current thumbnails are calm abstract placeholders).
- A dark-theme token mapping (only the Light theme is realized).
- A keyboard-interaction reference capture for the expanded state.

---

## 10. Never Reintroduce for ViveTest

- `PREVIEW QUESTION` label in the expanded card.
- A/B letter badges on choices.
- `READ` (or any) eyebrow on cards.
- Dashed `Coming soon` pill.
- A dot inside the `Coming soon` tag.
- Tag color dots in catalog data.
- Desktop gear / settings icon.
- Desktop hamburger.
- Underline on `Read more →`.
- Hover border / shadow / background on Normal test cards.
- Opacity reduction on the unavailable card's title / subtitle.
- `Dark mode is coming in a later phase.` (or any dark-mode placeholder text).
- `Catalog` item in the mobile menu.
- `layoutId` / `LayoutGroup` as a recommended motion approach.
- `min-height: 100%` as the expanded-overlay height invariant.
- Swipe-down close as authorized mobile expanded behavior.

---

## 11. Maintenance Rules

- **Update this document** when a **visual** decision changes at the foundation, token, component, or application-pattern level.
- **Do not update** it for implementation-only refactors, internal file movement, test-only changes, QA command changes, or routing / telemetry / storage changes with no visual impact.
- **Product-specific visual changes** go in **Patterns / Application** (Section 7) unless they truly change the base system; only then touch Foundations / Tokens / Components.
- **Regenerate design reference screenshots** when they diverge from the written rules — this is distinct from, and does not authorize touching, the project's visual-regression test baselines.
- **Wave-specific CSS snippets are not the source of truth** — the tokens and component rules here are. Where a wave snippet and this document agree, the value is canonical; where they conflict, surface the conflict rather than silently following the snippet.

---

## 12. Boundary Statement

This document is the **VIVE design-system foundation and the ViveTest catalog application reference.** It governs visual foundations, tokens, reusable visual components, and visual application patterns. It does **not** grant implementation permission, define implementation waves, define QA gates, or replace product requirements, decision records, repository rules, or runtime contracts. When this document and a project decision record conflict, the decision record wins.
