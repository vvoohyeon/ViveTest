# STATE.md — Wave 8: Blog normal/active visual (COMPLETE, uncommitted)

> Session continuity anchor only. Not executable, not an SSOT.
> Plan SSOT: `docs/plans/2026-06-03-wave-8-blog-visual.md`. Branch `main`. Uncommitted; nothing pushed.
> Approved approach (user): Logic Improvement = no candidates approved; preserve logic. Use CSS/markup-only Blog visual affordance and hover skin; default Decision 1/2 document sync accepted.

## Current Phase / Milestone

Wave 8 implementation (Blog normal/active visual) is complete. Task mode: Implementation. No branch/push/merge/checkpoint work was performed.

Units (plan §5):

- **Unit A — DONE.** Added red tests:
  - `tests/unit/landing-card-contract.test.ts`: Blog `blogReadMore` present, `aria-hidden`, non-focusable, not `primaryCTA`; test/unavailable cards have no `blogReadMore`.
  - `tests/e2e/grid-smoke.spec.ts`: desktop rest/hover/focus reveal, mobile tap always-visible, whole-card navigation preserved.
  - Red evidence: targeted unit and E2E checks failed on missing `blogReadMore` before implementation.
- **Unit B — DONE & VERIFIED.**
  - `landing-grid-card.tsx`: threaded optional `readMoreLabel` through `NormalCardFace` -> `NormalCardTagRow`, rendering Blog-only non-interactive `Read more →` span. Test/unavailable paths do not receive the prop; `NormalCardGhostBody` unchanged.
  - Updated stale `tests/unit/landing-data-contract.test.ts` so legacy `blog.primaryCTA` is still ignored while `copy.readMore` is allowed as the new visual affordance.
- **Unit C — DONE & VERIFIED.**
  - `landing-grid-card.module.css`: added scoped `--blog-hover-*` tokens and Blog-only hover selector. Resting state/focus ring remain intact; no `globals.css`.
- **Unit D — DONE & VERIFIED.**
  - `docs/design/design.md`: added `--shadow-blog-hover`, cross-referenced §7.4, removed stale Blog-expanded floor sentence.
  - `docs/req-landing.md`: synced §6.5/§6.6 Blog Expanded/primaryCTA rows to the whole-card-link contract.
  - `docs/wave-roadmap.md` and plan outcome updated to reflect completion.
- **Unit E — DONE & VERIFIED.**
  - Basic gates green: `npm run lint`, `npm run typecheck`, `npm test` (73 files / 485 tests), `npm run build`.
  - Scope checks green: `PLAYWRIGHT_SERVER_MODE=preview npx playwright test tests/e2e/grid-smoke.spec.ts --workers=1` (20/20), Browser mobile computed check, Browser desktop rest/hover computed check, `git diff --check`.
- **Improvement pass — DONE & VERIFIED.**
  - Source: `docs/plans/2026-06-03-wave-8-improvement-candidates.md`.
  - Adopted IC-1/2/3/5 and IC-4 default: Blog hover skin now uses `styles.blogCard`, is gated to `@media (hover: hover) and (pointer: fine)`, transitions border/shadow over 140ms with reduced-motion disabled, and uses a single sage border plus soft glow (no extra 1px shadow ring).
  - IC-6 added as QA guard: longest Read-more locales (`id`, `ru`, `fr`, `de`) stay single-line on narrow mobile cards.
  - Targeted verification green: red computed-style guard first failed on missing transition; after implementation, targeted hover-skin and localized-label E2E checks passed.
  - Final post-improvement gates green: `npm run lint`, `npm run typecheck`, `npm test` (73 files / 485 tests), `npm run build`, `PLAYWRIGHT_SERVER_MODE=preview npx playwright test tests/e2e/grid-smoke.spec.ts --workers=1` (21/21), Browser desktop computed check.

## Pending Verifications / Debt

- `tests/e2e/theme-matrix-manifest.json` still contains stale Blog-expanded entries; unchanged because it is Ask-First and BQ-07 keeps visual baseline work deferred.
- No visual baseline regeneration was performed; `qa:visual:full` was not run.
- Broader stale `docs/req-landing.md` §1.3 / §8.5 prose remains Wave 14 scope per the approved Wave 8 plan.

## Next Immediate Actionable Steps

1. User review of the uncommitted Wave 8 diff.
2. If accepted, commit. Suggested message: `wave8: blog read-more affordance and hover skin`.
3. Continue with Wave 9 unavailable behavior/visual only after review/commit instruction.

## Key Decisions

- `Read more →` is a Blog-only, non-interactive visual affordance inside the existing whole-card `<Link>`, never `primaryCTA`, never focusable, never a separate navigation trigger.
- Reveal is CSS-only via `group-hover` / `group-focus-within` plus existing `interactionMode`; no controller, state, routing, storage, telemetry, i18n, GNB, or mobile lifecycle changes.
- Blog hover skin uses scoped module tokens (`--blog-hover-border`, `--blog-hover-shadow`) and records the durable visual token in `docs/design/design.md`; the improved token is single-edge border + glow, with the hover trigger limited to fine-pointer hover. `globals.css` remains Wave 16 scope.

## Files to Revisit

- `src/features/landing/grid/landing-grid-card.tsx`
- `src/features/landing/grid/landing-grid-card.module.css`
- `tests/unit/landing-card-contract.test.ts`
- `tests/unit/landing-data-contract.test.ts`
- `tests/e2e/grid-smoke.spec.ts`
- `docs/design/design.md`
- `docs/req-landing.md`
- `docs/wave-roadmap.md`
- `docs/plans/2026-06-03-wave-8-blog-visual.md`
