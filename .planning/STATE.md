# STATE.md — Wave 3 Normal Card Visual Skin (Snapshot 3 of 3 — COMPLETE)

> Session continuity anchor only (temporal progress). Not executable, not an SSOT.
> Plan SSOT: `docs/plans/2026-05-31-wave-3-normal-card-visual-skin.md` (approved).
> Implementation from commit `020e12d`. **Status: implementation + verification COMPLETE. Not committed (not requested).**

## Outcome

Wave 3 (visual skin; CSS/className only; BQ-19 = no logic candidates) implemented and verified.
All plan §5 steps done (Step 7 VS-06 intentionally skipped — default keep `color-mix(--panel-solid 90%)`).

## Files changed (2 card files only)

`src/features/landing/grid/landing-grid-card.module.css`
- `.root { --normal-card-border:transparent; --normal-card-shadow:0 1px 2px rgb(26 26 31/4%);
  --normal-focus-ring:#5c8e78; --normal-thumb-radius:12px; --normal-tag-bg:#f0ece2;
  --normal-tag-ink:#4a4a55; --normal-tag-radius:5px; }`
- focus rule: `.root:not(.desktopOverlayLayer):has(:focus-visible){ outline:2px solid var(--normal-focus-ring); outline-offset:2px; }`
  (was blue box-shadow double ring; overlay rules untouched).

`src/features/landing/grid/landing-grid-card.tsx`
- :215 thumbnail radius → `var(--normal-thumb-radius)` (aspect-[6/1]/object-cover kept).
- :217 tags row `gap-2`; :222 chip → 5px radius / `--normal-tag-bg` / `--normal-tag-ink` / 13px / `font-medium` / `px-[9px]`
  (kept `border border-transparent`, nowrap, ellipsis, py-1, leading-[1.2]).
- :907 collapsed resting → `[box-shadow:var(--normal-card-shadow)] [border:1px_solid_var(--normal-card-border)]`.

## Verification — all gates GREEN

- `npm run lint` ✓ · `npm run typecheck` ✓ · `npm test` ✓ (73 files / 479 tests) · `npm run build` ✓.
- `PLAYWRIGHT_SERVER_MODE=preview npx playwright test tests/e2e/grid-smoke.spec.ts` → **18 passed**.
  Confirms tag border alpha ≤0.05, tags min-height 28px, thumbnail ratio 5.5–6.5, radius equality,
  slot order, and expanded-overlay metric/collapse contracts all hold.
- No baseline regeneration, no `qa:visual:full` (BQ-07). No stop condition (plan §7) hit.

## Key Decisions

- Focus rule scoped `:not(.desktopOverlayLayer)` so the sage outline does not bleed onto the
  desktop overlay (overlay rule overrides only box-shadow, not outline) — honors plan's
  "isolated from overlay focus rule" guard; overlay rules left literally untouched. Class-based,
  not `[data-card-state]` (module.css:8 contract + VS-10).
- §8 defaults stand: VS-02 Defer (Blog hover→W7/8; Test no-hover preserved); VS-06 keep `color-mix`;
  thumbnail aspect keep `6/1` (VS-08 Reject; `16/6` logged as future reconciliation).

## If resuming

Work is complete. Remaining optional actions only on user request: commit the 2 files; add
presence-only Wave-3 hook assertions (plan §6.2); Wave 4+ per `docs/wave-roadmap.md`.
