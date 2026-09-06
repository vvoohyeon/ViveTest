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
| `fonts/PretendardVariable.woff2` | **no** | mirrored into the repo so local renders match; the design system already holds an identical copy |
| `_provenance/*` | **no** | pre-rebaseline snapshots kept for rollback |

Files that exist in the Claude Design project but not here — `vive-components.css`, `assets/`, `ui_kits/`, `uploads/`, `_ds_bundle.js`, `_ds_manifest.json` — are **not** mirrored. They are untouched by the rebaseline, and nothing in the catalog work consumes them. `_ds_manifest.json` is compiled by the Claude Design app from the `@dsCard` markers; never hand-write it.

`fonts/` **is** mirrored, and it is the one path that travels in the opposite direction: the repo copy exists so that a local render resolves the same typeface the design system serves, not so that it can be pushed. Pushing it would be a 2 MB write of a file already present there, twice.

## The typeface

`fonts/PretendardVariable.woff2` — **Pretendard Variable, release 1.3.9**, taken from that release's `web/variable/woff2/PretendardVariable.woff2`. Kil Hyung-jin, SIL Open Font License 1.1, <https://github.com/orioncactus/pretendard>.

| | |
|:---|:---|
| Size | 2,057,688 bytes |
| SHA-256 | `9599f12fd42fc0bce1cd50b47a0c022e108d7aa64dd0d1bb0ed44f3282d900b4` |
| Format | `wOF2`, flavor `0x00010000`, 16 tables, `totalSfntSize` 6,759,776 |
| Axis | `font-weight: 45 920`, exactly as `colors_and_type.css` declares |

**How it was verified, and the limit of that verification.** The design system holds this file twice, at `fonts/` and at `uploads/`. Both were read back through `DesignSync` `get_file`, which caps at 256 KiB, so each returned a 196,608-byte prefix — 9.6% of the file. For both copies and the release file: the declared length in the WOFF2 header is 2,057,688, and the decoded prefixes are byte-identical with a matching SHA-256. The release's own `web/variable/pretendardvariable.css` is also content-identical to the design system's `uploads/pretendardvariable.css`, including the `font-weight: 45 920` range.

That is strong provenance but it is **not** a whole-file hash comparison, and it cannot be one while `get_file` is capped. If a future session needs certainty, compare against the upstream release rather than against the design-system copy.

Ship the full face, not a subset: a subset would add a build step and a way for the two sides to diverge, and it would not change the metrics of the glyphs it kept.

**Every measurement taken before this file existed was taken in a fallback typeface.** The `@font-face` in `colors_and_type.css` pointed at a path that did not resolve locally, and a failed `@font-face` is silent. Before measuring anything in this bundle, confirm the face actually loaded:

```js
document.fonts.check('16px "Pretendard Variable"')   // must be true
```

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
