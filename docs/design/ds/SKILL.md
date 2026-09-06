---
name: vive-design
description: Use this skill to generate well-branded interfaces and assets for VIVE, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping calm, trustworthy, lightweight product UI.
user-invocable: true
---

# VIVE Design System

VIVE is a general-purpose product UI system for **calm, trustworthy, lightweight** digital products: warm-neutral surfaces, a sage/moss primary accent, restrained depth, quiet motion, and bilingual (Korean + Latin) typography via Pretendard.

Read **`README.md`** first — it holds the full context: content fundamentals (voice & copy), visual foundations (color, type, spacing, radius, elevation, motion, states), and iconography. Then explore the other files.

**Rebaselined 2026-09-06.** The token values here are the ones the ViveTest product actually ships; the names and structure are VIVE's. `README.md` and `colors_and_type.css` are one definition shared with that repository — edit them there, not here, or the two drift apart again. Three findings are recorded as open in `README.md` (M-01 easing, D-01 neutral temperature, D-03 accent interaction states); do not resolve them silently.

## What's here
- `colors_and_type.css` — all design tokens (base palette, VIVE semantic roles, catalog aliases, type, spacing, radius, elevation, motion, layout). **Load first.**
- `vive-components.css` — reusable component styles (buttons, inputs, cards, badges, chips, switch, avatar, menu). Load second; scope markup with `class="vive"`.
- `fonts/PretendardVariable.woff2` — bundled variable typeface.
- `assets/` — logo (`vive-logo.svg`) and mark (`vive-mark.svg`).
- `preview/` — small specimen cards for every foundation and component, including `motion.html` (the realized duration ladder and the open easing question) and `color-temperature.html` (the warm/cool split in the neutral ramp).
- `ui_kits/app/` — task/data application kit (shell, dashboard, table, settings, dialog, empty state).
- `ui_kits/catalog/` — content browse kit (nav, hero, filters, card grid, detail drawer).

## How to work
- **Visual artifacts** (slides, mocks, throwaway prototypes): copy the assets and CSS you need out of this skill, then produce static/standalone HTML files for the user to view. Reuse UI-kit components as starting points.
- **Production code**: copy the assets and read the rules here to design accurately with the brand. Reference **semantic tokens** (`--accent`, `--fg1`, `--surface`, `--space-4`, `--radius-lg`), not raw hex.
- **Icons**: Lucide (1.75 stroke), linked from CDN — see ICONOGRAPHY in the README.

If invoked without specific guidance, ask the user what they want to build, ask a few clarifying questions, then act as an expert designer who outputs HTML artifacts *or* production code depending on the need.
