# VIVE Design System

A reusable design system for **calm, trustworthy, lightweight digital products**. VIVE is general-purpose: it supports responsive web interfaces such as onboarding flows, catalogs, dashboards, settings pages, content surfaces, forms, and task-based tools. It is intentionally *not* a kit for one page or one service — it is a set of flexible foundations and components you assemble per surface.

The system is bilingual by default (Korean + Latin) thanks to the **Pretendard** typeface, and leans on **warm-neutral surfaces**, a **sage / moss primary accent**, **restrained depth**, and **quiet motion**.

---

## Rebaseline note — 2026-09-06

This file and `colors_and_type.css` are **one definition shared with the ViveTest repository**. They live there at `docs/design/ds/` and are pushed to this project at the same paths. Neither side re-types the other's values.

The token **values** are now the ones the ViveTest product actually ships, read from its realized stylesheets rather than from an intent document. The token **names and structure** stay VIVE's. Generic components therefore round one step softer than before (`--radius-md` is 12px, not 8px), cards sit on exact white, and the accent is a slightly more saturated, more teal sage. That is intended: the design system now speaks the product's language, so a screen generated here can be implemented without translation.

Findings recorded and **not** settled. Do not resolve them silently. (M-01, the core easing, was settled on 2026-09-07 — see Motion below.)

| # | Finding | Where it is visible |
|:---|:---|:---|
| D-01 | **Resolved 2026-09-07.** The neutral ramp changed temperature between steps 400 and 500. Steps 500–900 are now warm, re-solved at matched luminance, so no contrast ratio moved by more than 0.07. The dark theme is what forced it — dark reads the same ramp from the other end. | `preview/color-temperature.html` |
| D-03 | **Resolved 2026-09-07.** The values were fine; they had no consumer — nothing in the system or the product read `--accent-pressed`. The accent's interaction ladder is now realized on the filled CTA, through the roles D-12 introduced. | `preview/color-sage.html` |
| D-12 | **New, resolved 2026-09-07.** The accent has two jobs at two different bars: as a line or ring it needs 3:1 and clears it, as the fill under a label it needs 4.5:1 and did not — white on `--accent` is 3.75:1, so the submit CTA's own text failed AA. `--accent-solid` and its two states are one step deeper and clear it in both themes. | `preview/color-sage.html` |
| D-10 | **Resolved 2026-09-07.** The product has shipped a full dark theme since before the rebaseline — 31 runtime overrides, a pre-hydration bootstrap, and baselines across 2 locales × 2 themes × 6 viewports — and this system defined none of it, which made the theme cut impossible. A dark mapping now ships. | `preview/dark-theme.html` |
| D-11 | `design.md` §7.6 contradicts `req-landing.md` §6.4 on navigation in three places: the desktop settings trigger it forbids is required with a specified hover-gap geometry, the full-screen mobile menu it specifies would break the outside-pointer-down close contract, and "Light active only" is false. The behaviour contract wins in all three. | `docs/done/2026-09-07-step3-U3-undesigned-surface-extraction.md` |
| D-05 | Six values in the catalog still come from the legacy global theme, including two different title colours in the same grid, a cool shadow that replaces the expanded card's warm lift while focus is inside it, and a mobile scrim at a different hue and strength from the token. | `preview/catalog-drift.html` |
| D-06 | `design.md` §4.3 states one global wrapping rule; the product applies it to the card title and subtitle only on the mobile tier, so a two-line Korean subtitle may break mid-word above mobile. | `preview/catalog-drift.html` |
| D-07 | **Resolved 2026-09-07.** The 140ms fade never ran, because the same element also switched `display`. The fade is kept and driven by `opacity` + `visibility` — which also removes a layout shift the `display` switch caused at narrow card widths. | `preview/card-blog.html` |
| D-08 | **Proposal raised 2026-09-07, not adopted.** The product ships one thumbnail for eight cards, and the seven imported candidates are 3:2 against a 16:6 slot — cropping discards 43.8% of their height and leaves the composition airless rather than clipped, so re-tinting cannot rescue them. A 16:6-native set in the single sage family is proposed, with four rules so a new one can be drawn without asking. | `preview/thumb-proposal.html` |
| D-09 | The mobile expanded sheet's close button is 40 × 40 against the 44 × 44 `design.md` §4.10 requires of it by name. | `preview/card-mobile-expanded.html` |

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
- **Atmosphere:** warm-neutral, low-contrast calm. The page floor is `--canvas` (`#fbfaf7`) — a warm off-white, never cool grey or pure white. Ink is `--fg1` (`#1e1a16`), a near-black that carries the same warmth as the surfaces: **one ramp, one temperature, end to end** (D-01).
- **Primary accent:** **Sage / moss** (`--accent` `#5c8e78`). A green-grey that signals trust without shouting. Hover steps to `#4b7764`, pressed to `#396050`. Tints (`--accent-subtle` `#e8f0ec`) carry selection and quiet emphasis.
- **Sage as a fill under a label:** use `--accent-solid` (and `-hover` / `-pressed`), never `--accent` — see D-12.
- **Sage as text:** `--accent` on white measures **3.75:1**. That clears AA for large text and for borders, focus rings and other non-text UI — every way the product uses it — but it is **below AA for normal-size text**. Use `--accent-fg` (`#396050`, 7.09:1) whenever sage has to be read as text.
- **Secondary accent:** **Clay** (`--accent2` `#c2855b`), a warm earthy tone used *sparingly* — a highlighted avatar, an occasional category, an illustration accent. Never competes with sage. The catalog does not use it.
- **Semantic hues are muted** to stay in the calm family: success is a soft forest green, warning a dim amber, danger a dusty brick red, info a slate blue. Each ships a `subtle` tint, a base, and a readable `fg`. The catalog does not use them.
- **Dark theme:** one ramp, read from the other end. Surfaces come from `--warm-900…975` and ink from `--warm-50…400`; the accent anchors on `--sage-400` because `--sage-500` measures 3.75:1 on white and cannot serve both grounds. Dark is a **remap of the semantic layer**, not a second palette — every dark value resolves to a step of the same ramp, and no component stylesheet changes. Set it with `data-theme="dark"` on any element, or let `prefers-color-scheme` pick it up.
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
- **Depth is a whisper.** Five low-alpha shadow steps (`--shadow-xs…xl`) tinted with the ink color (`rgba(30,26,22,…)`) at 4–18% — never pure black, never large blur halos.
- **In dark, depth is a surface, not a shadow.** An ink-tinted shadow is invisible on a dark ground, so the dark theme lifts by stepping the surface lighter and keeps shadow only for genuinely floating things, at a warm near-black (`rgba(5,4,3,…)`) and higher alpha.
- Hierarchy is built primarily through **surface tint and hairlines**, with shadow reserved for genuinely floating things (menus, dialogs, popovers, drag).

### Interaction states (all components encode these)
- **Hover:** a small, calm shift — the accent steps one shade **toward higher contrast with the ground**; neutral surfaces pick up `--surface-sunken`; cards deepen to `--shadow-md`. Never a color *change*, just a deepening. On a light ground that step is darker (500 → 600); on a dark ground it is lighter (400 → 300). Stated as "one shade darker" the rule silently inverts to *less* visible in dark, which is why it is written as a direction rather than a value.
- **Pressed:** one more step in the same direction + a 0.5px nudge down (`translateY`). No squish/scale beyond that.
- **Focus:** **strong and always visible** — `:focus-visible` gets a 2px sage outline with a 2px offset. Inputs use a 3px `--accent-subtle` glow + accent border. Focus is never removed.
- **Disabled:** neutral fill + `--fg-disabled` text, `not-allowed` cursor, no shadow.
- **Loading:** label hides, a 16px spinner (currentColor, 0.7s linear) appears; control is non-interactive.
- **Error / success:** border + tint shift to the semantic hue; helper text swaps to the semantic `fg`.

### Motion
- **Calm and purposeful.** Durations are the product's realized ladder: **120ms** slot exit, **140ms** hover and focus skins, **180ms** general UI and the reduced-motion core, **280ms** expand and collapse, with a **40 / 100 / 160ms** stagger on staged reveals.
- **Core easing is `--ease-in-out` (M-01, decided 2026-09-07).** The expand and collapse had shipped `linear` on all 21 animations, against the behaviour contract; the three candidates were compared side by side at the realized 280ms in `preview/motion.html`, and the symmetric curve won because the close has to return on the same curve as the open. `--ease-standard` remains the curve for one-way entrances and reveals.
- **Allowed:** opacity fades, small (≤8px) translations, color transitions, shadow depth. **Banned:** bounce, spring overshoot, parallax, card tilt, auto-playing decorative motion. Respect `prefers-reduced-motion` — reduced motion drops translations and keeps opacity only.

### Transparency & blur
- Used rarely and quietly: a sticky header may use a subtle `backdrop-filter: blur(8px)` over a translucent `--canvas`. Scrims behind dialogs and mobile sheets are `--overlay-scrim` (`rgba(30,26,22,0.48)`). No frosted-glass everywhere.
- **A dark overlay separates by its edge, not by its scrim.** Measured: the light scrim dims its ground 3.12:1, and the same treatment dims the dark ground 1.04:1 — deepening it to 85% only reaches 1.08:1, because you cannot darken a page that is already near-black. So in dark a floating surface draws a 1px `--border-strong` edge, which measures 4.73:1 against the scrimmed ground and 3.18:1 against the panel. In light, the scrim alone is enough.

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
- **`app-components.css`** — every ViveTest surface that is *not* the card: navigation and its settings layer, the mobile drawer, the shared panel / floating / well surfaces, buttons, pills, chips, progress, quiet data rows, banner and empty states. Load after the tokens.
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
