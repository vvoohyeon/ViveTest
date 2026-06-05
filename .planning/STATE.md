# STATE.md — Wave 9: Unavailable behavior & visual (COMPLETE)

> Session continuity anchor only. Not executable, not an SSOT.
> Plan SSOT: `docs/plans/2026-06-04-wave-9-unavailable-implementation.md` (committed `74a1361`).
> Branch `main`. Implementation committed with the Wave 9 change set; nothing pushed.

## Current Phase / Milestone

Wave 9 (unavailable behavior + visual) implementation is **COMPLETE & VERIFIED**. Task mode:
Implementation. All §7 units (1–6) done; gated green. No branch/push/merge/checkpoint work.

- **D1/BQ-26 keyboard a11y:** `resolveCardTabIndex(state, variant, enterable)` → `-1` for
  unavailable in all states; controller passes `cardEnterable`; new pure
  `resolveAdjacentEnterableCardVariant` routes all 6 handoff sites (desktop+mobile) past
  non-enterable neighbors. Semantic `<button aria-disabled tabindex=-1>` retained (no native
  `disabled`, no `role` override).
- **D2/BQ-26 visual:** `UnavailableCardStatusOverlay` + `data-slot="unavailableOverlay"` removed;
  coming-soon rendered as an always-visible standard tag (`data-slot="comingSoonTag"`,
  `copy.comingSoon`, non-`aria-hidden`, reuses `--normal-tag-*` chip). Scoped `--unavailable-surface`
  (`#f4f1ea` = `--surface-soft`) + `--unavailable-thumb-opacity` (0.72); `.root.unavailableCard`
  surface + `.normalThumbnail` dim. Title/subtitle full opacity. No `globals.css` (Wave 16).
- **D3 fixture:** `creativity-profile` "(Soon)"/"(곧 공개)" suffix removed, `tags: {}`; registry
  regenerated. `attribute:unavailable` / meta / consumer shape preserved; `unavailableCount===1`.
- **W9-LI-01:** `en.json` `comingSoon` → `"Coming soon"`.
- **Docs:** req-landing §7.5/§7.6/§9.2/§9.3/§13.2; design.md §7.5 (dim 0.72); project-rules anchor;
  wave-roadmap Wave 9 ✅ + 구현 결과. BQ-26 + Include line pre-committed in `74a1361`.

## Verification (all green except documented BQ-07 / pre-existing debt)

- Basic gates: `lint` ✓ · `typecheck` ✓ · `vitest` ✓ (488) · `build` ✓.
- Registry regen scoped to creativity-profile; `registry-serializer` / `landing-data-contract` ✓;
  `check-variant-registry` / `check-variant-only` ✓.
- `#landing` QA: check-phase4/6/7/8/10 ✓.
- Wave E2E (preview, `--workers=1`): a11y-smoke ✓, state-smoke ✓ (functional), grid-smoke ✓ (21) —
  42 passed; only `expanded-focus-shell.png` snapshot fails (Wave 6 / BQ-07 deferred, not Wave 9).

## Pending Verifications / Debt (NOT Wave 9 regressions)

- `check-phase5-card-contracts.mjs` (Blog-expanded marker checks `cardSubtitleExpanded`/"Blog
  Expanded") and `check-phase9-performance-contracts.mjs` (CTA cursor policy) FAIL at HEAD too —
  pre-existing repo QA debt (Wave 7 Blog-expanded removal), out of Wave 9 scope. Flagged for a
  separate fix.
- `expanded-focus-shell.png` snapshot deferred (BQ-07); legacy global `--unavailable-*` tokens dead →
  Wave 16.

## Next Immediate Actionable Steps

1. (Optional) Push, if/when the user directs.
2. Wave 10 — landing grid height rhythm (next BQ-19 Analysis gate).

## Files to Revisit

- `docs/wave-roadmap.md` (Wave 10 next) · `docs/plans/2026-06-04-wave-9-unavailable-implementation.md`
