# Current Phase/Milestone

- Approved plan: `docs/plans/2026-05-03-landing-interaction-controller-refactor.md`
- Current milestone: Task 5 pending after completing Tasks 1-4.
- Branch: `codex/landing-interaction-controller-refactor`

# Pending Verifications/Debt

- Final Basic Gates still pending: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- Final requested suite still pending: `npm run qa:rules`, `npm run test -- landing-hover-intent landing-grid-plan state-smoke`, `npm run qa:gate`.
- Explicit High-Risk Playwright coverage still pending: `npx playwright test tests/e2e/state-smoke.spec.ts tests/e2e/transition-telemetry-smoke.spec.ts`.
- Docs drift inspection still pending after final verification.

# Next Immediate Actionable Steps

1. Resume at Task 5 of the approved plan.
2. Run final gates in the exact order required by the plan and AGENTS.md.
3. Inspect affected docs and update only if implementation drift is found.
4. Report final status with passed/failed gate evidence.

# Key Decisions

- User confirmed the approved plan on 2026-05-03 and requested implementation without another approval step.
- Keyboard mode now exits on `mousedown`; `pointermove` only records pointer position; `wheel` no longer exits keyboard mode or has a global keyboard-mode listener.
- Public mobile snapshot view no longer exposes `snapshotWriteCount` or `data-mobile-snapshot-writes`.
- `mobile-lifecycle.ts` internal `snapshotWriteCount` remains untouched per plan non-goal.

# Files to Revisit

- `docs/plans/2026-05-03-landing-interaction-controller-refactor.md`
- `docs/req-landing.md`
- `scripts/qa/check-phase7-state-contracts.mjs`
- `tests/e2e/state-smoke.spec.ts`
- `tests/e2e/transition-telemetry-smoke.spec.ts`
- `src/features/landing/grid/use-keyboard-handoff.ts`
- `src/features/landing/grid/use-landing-interaction-controller.ts`
- `src/features/landing/grid/landing-grid-card.tsx`
