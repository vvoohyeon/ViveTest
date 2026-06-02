# STATE.md — Wave 6: Desktop expanded overlay isolation + Expanded height floor (COMPLETE, uncommitted)

> Session continuity anchor only. Not executable, not an SSOT.
> Plan SSOT: `docs/plans/2026-06-02-wave-6-overlay-isolation-height-floor.md`. Branch `main`. Uncommitted; nothing pushed.
> Approved approach (user): scale 보정=card 측 · floor map=controller 분리 state + baseline-manager pure helper · spacer 구간 gap 비적용.

## Current Phase / Milestone

Wave 6 implementation (BQ-24 height floor + §6.7(3) lower-row isolation). Task mode: Implementation. Logic Improvement W6-LI-01/02/03/04 approved. **Implementation complete; awaiting user review/commit instruction only.**

Units (plan §5): A=failing tests → B=floor 측정 → C=floor+spacer 적용 → D=functional 재검증.

- **Unit A — DONE.** `tests/e2e/grid-smoke.spec.ts`:
  - B4-short-expanded: `beforeSourceRoot` 캡처 + `surfaceHeight >= beforeSourceRoot.height - 0.5` 신규(현재 floor 미적용이라 fail 예상 → Unit C에서 green).
  - B4-geometry-active-frame: lower-row(egtt steady → ops-handbook handoff, build-metrics non-target) y/height/bottom Δ≤1px + 종료 잔류 Δ≤1px 추가.
- **Unit B — DONE & VERIFIED.** (High-Risk 파일 2종)
  - `baseline-manager.ts`: `RestingFloorMap` 타입 + `emptyRestingFloorMap`/`captureRestingFloor`/`clearRestingFloor` pure helper (row snapshot freeze/release와 분리, 시그니처 무변경).
  - `use-grid-geometry-controller.ts`: 신규 `useLayoutEffect`(deps `[activeVisualCardVariant, plan.tier, shellRef]`)가 active card root `offsetHeight`(stretched row-max) 측정 → `restingFloorMap` state(첫 paint 전). freeze/release `useEffect` **무변경**. output에 `restingFloorMap` 추가.
  - 검증: `typecheck` green; `landing-baseline-manager.test.ts` 6/6 green(floor helper 4 신규 포함).
- **Unit C — DONE & VERIFIED.**
  - `landing-catalog-grid.tsx`: `restingFloorMap`을 `expandedRestingFloorPx` prop으로 전달.
  - `landing-grid-card.tsx`: `expandedRestingFloorPx / resolvedShellScale`를 desktop `expandedBody`에만 `minHeight`로 적용. shell/surface `min-height:0` 보존. `layoutMode='desktop-overlay-floor'`에서만 Test choices↔meta, Blog subtitle↔meta+CTA 사이 단일 flex spacer(`min-h 14px`) 적용. Mobile expanded/transient는 `flow` default로 기존 grid flow 보존.
  - `landing-grid-card.module.css` 수정 불필요.
- **Unit D — DONE & VERIFIED.**
  - Basic Gates: `lint` ✅, `typecheck` ✅, `test` ✅, `build` ✅.
  - Scope checks: full `grid-smoke` ✅ 18/18, functional-only `state-smoke` ✅ 13/13, `git diff --check` ✅.

## Pending Verifications / Debt

- Full `state-smoke` still reports the two **BQ-07-deferred screenshot** mismatches:
  - `expanded-focus-shell.png` expected 403×210, actual 403×292 after the intended height floor.
  - `overlay-focus-shell.png` expected 298×193, actual 298×254 from pre-existing visual drift.
  - Functional-only rerun excluding those two screenshot tests passed 13/13. **No baseline regeneration performed.**
- Playwright/Next warnings observed only: `NO_COLOR` ignored because `FORCE_COLOR` is set; `qmbti/thumbnail.svg` LCP advisory. Both are pre-existing/no-op for this wave.

## Next Immediate Actionable Steps

1. User review of the uncommitted diff.
2. If accepted, commit. Suggested message: `wave6: explicit expanded height floor with overlay isolation regression coverage`.
3. Do not run `qa:visual:full` or regenerate screenshot baselines unless the user explicitly approves a visual baseline update.

## Key Decisions (user-approved)

- scale 보정 = card 측(`resolvedShellScale = reducedMotion ? 1 : 1.04`), controller는 raw outer px만 운반(모션-불가지).
- floor map = controller 분리 `useState` + baseline-manager pure helper(freeze reducer 무경합 → §6.7(4) 순서 보존). `LandingBaselineState` 미확장.
- floor = `expandedBody` min-height(px)에만; shell/surface 무변경(B4 `surfaceMinHeight==='0px'` 보존); `min-height:100%` 금지(design §7.3/§10).

## Files to Revisit

- `src/features/landing/grid/baseline-manager.ts`
- `src/features/landing/grid/use-grid-geometry-controller.ts`
- `src/features/landing/grid/landing-catalog-grid.tsx`
- `src/features/landing/grid/landing-grid-card.tsx`
- `tests/e2e/grid-smoke.spec.ts`
- `tests/unit/landing-baseline-manager.test.ts`
- `docs/plans/2026-06-02-wave-6-overlay-isolation-height-floor.md`
