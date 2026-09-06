---
name: vive-design
description: Use this skill to generate well-branded interfaces and assets for VIVE, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping calm, trustworthy, lightweight product UI.
user-invocable: true
---

# VIVE Design System

VIVE is a general-purpose product UI system for **calm, trustworthy, lightweight** digital products: warm-neutral surfaces, a sage/moss primary accent, restrained depth, quiet motion, and bilingual (Korean + Latin) typography via Pretendard.

Read **`README.md`** first — it holds the full context: content fundamentals (voice & copy), visual foundations (color, type, spacing, radius, elevation, motion, states), and iconography. Then explore the other files.

**Rebaselined 2026-09-06, design pass 2026-09-07.** The token values here are the ones the ViveTest product actually ships; the names and structure are VIVE's. `README.md` and `colors_and_type.css` are one definition shared with that repository — **edit them there, not here**, or the two drift apart again.

The design pass resolved M-01 (easing), D-01 (the neutral ramp is now one temperature end to end), D-03 and D-12 (the accent's two jobs), D-09, D-11 and **D-10 — the system now has a dark theme**, which it had never had while the product shipped one. What remains open is listed in `README.md`'s findings table; do not resolve those silently.

**Dark is a remap of the semantic layer, not a second palette.** Every dark value resolves to a step of the same ramp, read from the other end. Set it with `data-theme="dark"` on any element — it works on a subtree, so one page can show both — or let `prefers-color-scheme` pick it up. If you find yourself writing a `[data-theme]` branch inside a component, something is wrong with the token you reached for, not with the theme.

## What's here
- `colors_and_type.css` — all design tokens (base palette, VIVE semantic roles, catalog aliases, type, spacing, radius, elevation, motion, layout). **Load first.**
- `vive-components.css` — reusable component styles (buttons, inputs, cards, badges, chips, switch, avatar, menu). Load second; scope markup with `class="vive"`.
- `catalog-components.css` — the ViveTest catalog's card system: four card states, tag chips, answer choices, the meta row.
- `app-components.css` — every ViveTest surface that is *not* the card: navigation and its settings layer, the mobile drawer, the shared panel / floating / well surfaces, buttons, pills, chips, progress, quiet data rows, banner and empty states.
- `fonts/PretendardVariable.woff2` — bundled variable typeface.
- `assets/` — logo (`vive-logo.svg`) and mark (`vive-mark.svg`).
- `preview/` — small specimen cards for every foundation and component. Start with `dark-theme.html` (both themes side by side from one rule set), `color-sage.html` (the accent's two jobs), `card-bilingual.html` (Korean and Latin in the same card) and the three `App` cards for navigation, the test flow and the secondary surfaces.
- `ui_kits/app/` — task/data application kit (shell, dashboard, table, settings, dialog, empty state).
- `ui_kits/catalog/` — content browse kit (nav, hero, filters, card grid, detail drawer).

## How to work
- **Visual artifacts** (slides, mocks, throwaway prototypes): copy the assets and CSS you need out of this skill, then produce static/standalone HTML files for the user to view. Reuse UI-kit components as starting points.
- **Production code**: copy the assets and read the rules here to design accurately with the brand. Reference **semantic tokens** (`--accent`, `--fg1`, `--surface`, `--space-4`, `--radius-lg`), not raw hex.
- **Icons**: Lucide (1.75 stroke), linked from CDN — see ICONOGRAPHY in the README.

If invoked without specific guidance, ask the user what they want to build, ask a few clarifying questions, then act as an expert designer who outputs HTML artifacts *or* production code depending on the need.
