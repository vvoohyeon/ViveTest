# `docs/design/ds/` — the shared design-system bundle

**Repo-only file. Not pushed to Claude Design.**

This directory is the repository's copy of the Claude Design project **VIVE Design System v2** (`cd630eec-25e4-4613-a58f-c671c80297ca`, type `PROJECT_TYPE_DESIGN_SYSTEM`). Paths mirror the project root 1:1, so a diff between the two is a plain file comparison.

## What each side owns

The repository owns the **content**. Claude Design owns the **rendering and the canvas**. Every value is written here and pushed there; nothing is authored on the Claude Design side and copied back by hand. That one-way rule is what the 2026-09-06 rebaseline exists to establish — the previous arrangement kept token values in a harness outside the repo, and the two drifted far enough apart to need three reconciliation rounds (BQ-21, R1, R2).

## What is pushed

| Path | Pushed | Note |
|:---|:---|:---|
| `colors_and_type.css` | yes | the shared token definition |
| `catalog-components.css` | yes | the catalog's card system, expressed in those tokens |
| `README.md` | yes | the system's own documentation |
| `SKILL.md` | yes | agent entry point |
| `preview/*.html` | yes | specimen cards; first line carries the `@dsCard` marker |
| `SYNC.md` | **no** | this file — repo process, not system content |
| `_provenance/*` | **no** | pre-rebaseline snapshots kept for rollback |

Files that exist in the Claude Design project but not here — `vive-components.css`, `fonts/`, `assets/`, `ui_kits/`, `uploads/`, `_ds_bundle.js`, `_ds_manifest.json` — are **not** mirrored yet. They are untouched by the rebaseline. `_ds_manifest.json` is compiled by the Claude Design app from the `@dsCard` markers; never hand-write it.

## How to push

Use the `DesignSync` tool with `localDir` set to this directory. The order is fixed: `list_files` → `finalize_plan` (declares the exact paths and gets a `planId`) → `write_files`. A write outside the finalized plan is rejected.

`/design-sync` the skill is a CLI-only surface and is not available in the desktop app; the tool underneath it is. Authorization is machine-level — `/design-login` once from an interactive terminal, after which desktop and headless sessions reuse the stored credential.

## Preview cards

A specimen card is a standalone HTML file whose **first line after the doctype** carries the marker:

```html
<!-- @dsCard group="Colors" name="Sage primary scale" subtitle="…" viewport="700x160" -->
```

The Design System pane builds its card index from those markers. If a card does not appear after a push, register it explicitly with `register_assets` rather than editing `_ds_manifest.json`.

**`_ds_manifest.json` is derived, and it lags.** Measured on the 2026-09-06 push: immediately after `write_files` succeeded, the manifest still listed the pre-push token values and did not contain the newly added card, because the Claude Design app recompiles it on its own schedule rather than on write. So it is not a way to check whether a push landed — use `list_files` and `get_file` for that — and a card added in a push was registered with `register_assets` to make it appear without waiting. Re-registering an existing card is also how a changed `name`, `subtitle` or `viewport` reaches the pane before the next recompile.

Cards must reference tokens (`var(--accent)`), never literal hex — with one deliberate exception: `catalog-drift.html` prints literal hex on both sides of its table, because its whole subject is two values that differ.

**Four files restate token values in text and therefore drift silently.** They have to be edited whenever a value they name changes; nothing detects it if you forget.

| File | What it restates |
|:---|:---|
| `preview/radius-scale.html` | the whole radius ladder, as labels |
| `preview/motion.html` | the duration ladder, as labels |
| `preview/catalog-drift.html` | the drifting values, as literal hex |
| `README.md` | roughly thirty values in prose — the palette, the radius ladder, the duration ladder, the container widths, the grid gutters |

`README.md` is the one that catches people out, because it reads as narrative rather than as data and it is pushed alongside the CSS. An earlier version of this file claimed everything but two preview cards followed `colors_and_type.css` automatically; that was wrong.

Everything else — every `card-*.html`, every `comp-*.html`, `color-*.html`, `spacing-scale.html`, `elevation-scale.html`, `type-*.html` — references tokens only and does follow the CSS automatically.
