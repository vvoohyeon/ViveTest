# `_provenance/` — pre-rebaseline snapshots

**Repo-only. Never pushed to Claude Design.**

Each file here is the content that stood in the Claude Design project **VIVE Design System v2** (`cd630eec-25e4-4613-a58f-c671c80297ca`) immediately before the 2026-09-06 rebaseline overwrote it. They exist so the pre-rebaseline system can be restored without depending on Claude Design's own version history.

| Snapshot | Restores | Captured |
|:---|:---|:---|
| `colors_and_type.v2-original.css` | `colors_and_type.css` | 2026-09-06, step 1 |
| `README.v2-original.md` | `README.md` | 2026-09-06, step 1 |
| `SKILL.v2-original.md` | `SKILL.md` | 2026-09-06, step 1 |
| `radius-scale.v2-original.html` | `preview/radius-scale.html` | 2026-09-06, step 1 |
| `motion.v2-original.html` | `preview/motion.html` | 2026-09-06, step 1 |

All five are byte-faithful except `colors_and_type.v2-original.css`, which carries a prepended comment block identifying it; its `:root` body is unmodified.

Four of these were captured late — during the 2026-09-06 mid-review, not at the moment of overwrite. The step-1 push claimed `_provenance/` as its rollback path while holding only the CSS, so for the intervening period four files had no snapshot at all and their originals survived only in one session's context. **Capture the snapshot in the same change that overwrites the file**, not afterwards.

Files added by the rebaseline rather than overwritten — `catalog-components.css` and every `preview/card-*.html`, `comp-*.html`, `catalog-drift.html`, `color-temperature.html` — have no snapshot because they replaced nothing. Deleting them restores the prior state.
