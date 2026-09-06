# VIVE Design System

A reusable design system for **calm, trustworthy, lightweight digital products**. VIVE is general-purpose: it supports responsive web interfaces such as onboarding flows, catalogs, dashboards, settings pages, content surfaces, forms, and task-based tools. It is intentionally *not* a kit for one page or one service — it is a set of flexible foundations and components you assemble per surface.

The system is bilingual by default (Korean + Latin) thanks to the **Pretendard** typeface, and leans on **warm-neutral surfaces**, a **sage / moss primary accent**, **restrained depth**, and **quiet motion**.

---

## Rebaseline note — 2026-09-06

This file and `colors_and_type.css` are **one definition shared with the ViveTest repository**. They live there at `docs/design/ds/` and are pushed to this project at the same paths. Neither side re-types the other's values.

The token **values** are now the ones the ViveTest product actually ships, read from its realized stylesheets rather than from an intent document. The token **names and structure** stay VIVE's. Generic components therefore round one step softer than before (`--radius-md` is 12px, not 8px), cards sit on exact white, and the accent is a slightly more saturated, more teal sage. That is intended: the design system now speaks the product's language, so a screen generated here can be implemented without translation.

Three findings are recorded and **not** settled. Do not resolve them silently.

| # | Finding | Where it is visible |
|:---|:---|:---|
| M-01 | All 21 landing-card animations ship `linear`, while `req-landing.md` §8.3 requires an ease-in-out curve. No test catches the gap. | `preview/motion.html` |
| D-01 | The neutral ramp is warm at steps 0–400 and cool at 500–900, so surfaces and ink disagree in temperature. | `preview/color-temperature.html` |
| D-03 | The catalog defines no hover or pressed state for the accent; `--accent-hover` and `--accent-pressed` are derived here, not realized in the product. | `preview/color-sage.html` |
| D-05 | Four values in the catalog still come from the legacy global theme, including two different title colours in the same grid. | `preview/catalog-drift.html` |

---

## Product context

VIVE is a foundation layer, not a product. It expresses one personality — *calm competence* — and bends to many surfaces:

- **Task & data tools** — dashboards, tables, settings, forms, dialogs, empty states.
- **Content & catalog surfaces** — browse grids, filters, content blocks, detail views.
- **Onboarding & flows** — multi-step forms, progress, confirmation.

Two reference **UI kits** ship with the system to show the foundations in use across different surface types (see the index below).

### Sources & references
This system was built independently, using one external reference for **structure and completeness only** (not for palette, personality, or assets):

- **Clay-inspired design analysis** — VoltAgent / `awesome-design-md`, `design-md/clay/` subtree.
  <https://github.com/VoltAgent/awesome-design-md/tree/main/design-md/clay>
  Used as a structural template for *what a complete design-system spec covers*. VIVE deliberately diverges from Clay's cream-and-saturated-claymation direction toward a quieter sage/warm-neutral language.

The reader is encouraged to explore that repository to understand the structural conventions behind this document. To build richer designs on top of VIVE, start from `colors_and_type.css` + `vive-components.css` and the UI kits.

### Typeface source
- **Pretendard Variable** — Kil Hyung-jin, OFL 1.1. <https://github.com/orioncactus/pretendard>. Bundled at `fonts/PretendardVariable.woff2`.

---

## Content fundamentals

How VIVE products *talk*. The voice matches the visuals: calm, plain, and respectful of the reader's attention.

- **Tone:** Quiet and competent. Reassuring without being chirpy. Never urgent, never salesy, no exclamation marks in product UI.
- **Person:** Address the user as **"you."** Refer to the product by name or as the neutral subject ("VIVE keeps a copy"), never as "I" or "we" inside the UI. "We" is acceptable only in marketing/account comms.
- **Casing:** **Sentence case everywhere** — buttons, headings, menus, labels, table headers. No Title Case, no ALL CAPS except the small `overline` eyebrow label (tracked, 12px).
- **Length:** Short. A button is a verb or verb-noun ("Save", "Add member", "Invite"). Helper text is one sentence. Empty states are one line of guidance + one action.
- **Verbs over nouns in actions:** "Create project", not "Project creation". "Invite teammate", not "Teammate invitation".
- **Errors are plain and constructive:** say what happened and what to do. *"Enter a valid email address."* — not *"Error: invalid input (422)."* Never blame the user.
- **No emoji** in product UI. No gamified or congratulatory copy ("You crushed it!"). Confirmation is calm: *"Changes saved."*
- **Numbers & units:** spell out small counts in prose ("three members"), use numerals in dense UI ("3 members", "12 of 40"). Always pair a number with its noun. In dense catalog UI, counts are shown in full digits — never abbreviated to `k` or `m`.
- **Bilingual:** copy must read naturally in both Korean and English; avoid idioms that don't translate. Keep labels short so they don't overflow when localized.

**Examples**
| Context | Write | Avoid |
|---|---|---|
| Primary button | `Save changes` | `SAVE CHANGES` / `Save Changes!` |
| Empty state | `No projects yet. Create your first one to get started.` | `Nothing here! 🎉 Let's gooo` |
| Error | `That email is already in use.` | `Error 409: duplicate` |
| Confirmation | `Invitation sent.` | `Woohoo — invite on its way!` |
| Eyebrow / overline | `WORKSPACE` | `Workspace Settings Panel` |

---

## Visual foundations

The complete answer to "what does VIVE *look* like." Tokens live in `colors_and_type.css`; component patterns in `vive-components.css`.

### Color & vibe
- **Atmosphere:** warm-neutral, low-contrast calm. The page floor is `--canvas` (`#fbfaf7`) — a warm off-white, never cool grey or pure white. Ink is `--fg1` (`#1a1a1f`), a near-black that reads neutral rather than warm (see D-01).
- **Primary accent:** **Sage / moss** (`--accent` `#5c8e78`). A green-grey that signals trust without shouting. Hover steps to `#4b7764`, pressed to `#396050`. Tints (`--accent-subtle` `#e8f0ec`) carry selection and quiet emphasis.
- **Sage as text:** `--accent` on white measures **3.75:1**. That clears AA for large text and for borders, focus rings and other non-text UI — every way the product uses it — but it is **below AA for normal-size text**. Use `--accent-fg` (`#396050`, 7.09:1) whenever sage has to be read as text.
- **Secondary accent:** **Clay** (`--accent2` `#c2855b`), a warm earthy tone used *sparingly* — a highlighted avatar, an occasional category, an illustration accent. Never competes with sage. The catalog does not use it.
- **Semantic hues are muted** to stay in the calm family: success is a soft forest green, warning a dim amber, danger a dusty brick red, info a slate blue. Each ships a `subtle` tint, a base, and a readable `fg`. The catalog does not use them.
- **Imagery vibe (when used):** warm, natural, soft daylight; low saturation. No neon, no cold blue tech imagery, no heavy duotones. Photography sits inside `--radius-md` containers.

### Type
- **One family does everything: Pretendard Variable.** It covers Korean + Latin with matched metrics, so bilingual layouts stay even. Weights used: 400 / 500 / 600 / 700 (the variable face spans 45–920).
- **Display** (56 / 44 / 36px, weight 700, tracking `-0.02em`) for hero and marketing moments only. The catalog has no hero band and does not use this scale.
- **Headings** H1–H4 (30 / 24 / 20 / 18px, 600–700). **Body** 16px / 1.6 line-height for comfortable reading. **Label** 14/500 for UI. **Overline** 12px uppercase tracked for eyebrows. **Code** in JetBrains Mono (see *Substitutions*).
- **Catalog roles** sit alongside the general scale where the product needs a size the scale does not carry: `--t-card-title` 20/600, `--t-card-subtitle` 15/400, `--t-expanded-question` 21/600, `--t-choice` 15/400, `--t-tag` 13/500.
- **Tracking:** slightly negative on display and headings (`-0.01 / -0.02em`); normal on body; wide (`0.08em`) on the uppercase overline.
- **Wrapping:** bilingual text wraps with `word-break: keep-all` and `overflow-wrap: anywhere`, so Korean breaks on word boundaries and long Latin strings still break rather than overflow.

### Spacing & layout
- **4px base unit.** Tokens `--space-1…24` (4 → 96px), with a t-shirt alias set (`--space-2xs…--space-section`) for surfaces that prefer it. Section rhythm is generous (48–96px between major bands); component padding clusters around 16–24px.
- **Containers:** `--container` 1280px standard, `--container-narrow` 760px for reading/forms. Content is centered with comfortable gutters.
- **Layout primitives:** prefer CSS grid / flex with `gap`. Cards lay out 3-up desktop → 2-up tablet → 1-up mobile. The catalog's realized gutters are 24px desktop, 20px tablet, 15px mobile.
- **Fixed elements:** top nav / app header is sticky and flat (no shadow until content scrolls under it, then `--shadow-sm`). Side nav is a fixed rail on desktop, a drawer on mobile.

### Corners, borders & cards
- **Radius is restrained** — softer than playful, firmer than sharp: `--radius-xs` 5px for tag chips, `--radius-sm` 8px for small controls, `--radius-md` 12px for choice buttons and thumbnails, `--radius-lg` 16px for cards, `--radius-xl` 24px for overlay panels, `pill` for chips/badges/toggles.
- **Borders are hairlines:** 1px `--border` (`#e6e2d8`). A `--border-strong` (`#d6d1c4`) exists for inputs and emphasized edges. Borders do the structural work; color does not.
- **Cards** = `--surface` fill (exact white) + 1px hairline + a *whisper* of `--shadow-xs`. Raised variants use `--shadow-md`. Sunken/well areas drop the shadow and use `--surface-sunken`. **No** colored left-border accent cards, **no** tilt, **no** thick drop shadows.

### Elevation & depth
- **Depth is a whisper.** Five low-alpha shadow steps (`--shadow-xs…xl`) tinted with the ink color (`rgba(26,26,31,…)`) at 4–18% — never pure black, never large blur halos.
- Hierarchy is built primarily through **surface tint and hairlines**, with shadow reserved for genuinely floating things (menus, dialogs, popovers, drag).

### Interaction states (all components encode these)
- **Hover:** a small, calm shift — accent steps one shade darker; neutral surfaces pick up `--surface-sunken`; cards deepen to `--shadow-md`. Never a color *change*, just a deepening.
- **Pressed:** one more shade darker + a 0.5px nudge down (`translateY`). No squish/scale beyond that.
- **Focus:** **strong and always visible** — `:focus-visible` gets a 2px sage outline with a 2px offset. Inputs use a 3px `--accent-subtle` glow + accent border. Focus is never removed.
- **Disabled:** neutral fill + `--fg-disabled` text, `not-allowed` cursor, no shadow.
- **Loading:** label hides, a 16px spinner (currentColor, 0.7s linear) appears; control is non-interactive.
- **Error / success:** border + tint shift to the semantic hue; helper text swaps to the semantic `fg`.

### Motion
- **Calm and purposeful.** Durations are the product's realized ladder: **120ms** slot exit, **140ms** hover and focus skins, **180ms** general UI and the reduced-motion core, **280ms** expand and collapse, with a **40 / 100 / 160ms** stagger on staged reveals.
- **Easing is an open question (M-01).** The product currently ships `linear` on every landing-card animation while its own behaviour contract requires an ease-in-out curve. `preview/motion.html` puts the three candidates side by side at the realized 280ms. Do not treat `--ease-standard` as decided.
- **Allowed:** opacity fades, small (≤8px) translations, color transitions, shadow depth. **Banned:** bounce, spring overshoot, parallax, card tilt, auto-playing decorative motion. Respect `prefers-reduced-motion` — reduced motion drops translations and keeps opacity only.

### Transparency & blur
- Used rarely and quietly: a sticky header may use a subtle `backdrop-filter: blur(8px)` over a translucent `--canvas`. Scrims behind dialogs and mobile sheets are `--overlay-scrim` (`rgba(26,26,31,0.48)`). No frosted-glass everywhere.

---

## Iconography

- **System:** **Lucide** (<https://lucide.dev>) — open-source, MIT, consistent geometric line icons. Chosen for its even **1.75px stroke**, rounded line caps, and calm neutral character that matches VIVE's restraint.
- **Why a CDN, not a copy:** Lucide is not present in any provided codebase, so it is **linked from CDN** rather than vendored:
  `<script src="https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js"></script>` then `lucide.createIcons()`. *(Flagged substitution — see Caveats. Swap for a vendored sprite if you need offline/self-hosted assets.)*
- **Usage:** sizes **16 / 18 / 20 / 24px**; stroke stays 1.75 at all sizes; color inherits `currentColor` (usually `--fg2`, or `--accent` for active). Icons are decorative companions to text labels, not the only affordance.
- **Stroke vs fill:** stroke-only by default. Filled glyphs only for tiny status dots (the `badge-dot` uses a CSS dot, not an icon).
- **Emoji:** **not used** anywhere in the system — neither in copy nor as iconography.
- **Unicode glyphs:** only the keyboard-shortcut symbols (⌘, ⇧, ⏎) in menus, and the decorative `→` on catalog answer choices; everything else is a Lucide icon.
- **Brand mark:** a simple geometric **sprout** (two leaves on a stem) in sage — see `assets/vive-logo.svg` (wordmark) and `assets/vive-mark.svg` (mark). The mark is original geometry, not a Lucide glyph.

---

## Index — what's in this system

Root foundations:
- **`colors_and_type.css`** — all tokens: base palette, VIVE semantic roles, and the catalog's own alias vocabulary; type scale, spacing, radius, elevation, motion, layout. Load this first.
- **`vive-components.css`** — reusable component styles (buttons, inputs, cards, badges, chips, switch, avatar, menu) built on the tokens. Load after the tokens; scope markup with `class="vive"`.
- **`catalog-components.css`** — the ViveTest catalog's card system: the four card states, tag chips, answer choices and the meta row, every value read off the running product. Load after the tokens when you are building the catalog surface.
- **`README.md`** — this file.
- **`SKILL.md`** — Agent-Skills-compatible entry point for using VIVE in Claude Code or as a downloaded skill.

Assets:
- **`fonts/PretendardVariable.woff2`** — bundled variable typeface.
- **`assets/vive-logo.svg`**, **`assets/vive-mark.svg`** — wordmark and mark, light/dark safe.

Previews (populate the Design System tab — small specimen cards):
- **`preview/`** — type, color, spacing, radius, elevation, motion, component, and brand cards.

UI kits (high-fidelity, assemblable recreations of real surfaces):
- **`ui_kits/app/`** — a calm task/data **application**: app shell with side nav + header, dashboard, data table, settings forms, dialog, empty state. Entry: `ui_kits/app/index.html`.
- **`ui_kits/catalog/`** — a content **catalog / browse** surface: top nav, filter bar, catalog grid, detail panel. Entry: `ui_kits/catalog/index.html`.

Each UI kit folder has its own `README.md` documenting its components.

---

## Using VIVE

```html
<link rel="stylesheet" href="colors_and_type.css">
<link rel="stylesheet" href="vive-components.css">
<body class="vive">
  <button class="btn btn-primary">Save changes</button>
</body>
```

Reference **semantic tokens** (`--accent`, `--fg1`, `--surface`, `--space-4`, `--radius-lg`) in product work — not raw palette steps or hex. The palette steps (`--sage-500`, `--warm-200`) exist to *define* the semantic tokens; reach for the semantic layer when building.
