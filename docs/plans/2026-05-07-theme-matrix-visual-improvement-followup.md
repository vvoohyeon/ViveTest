# Theme Matrix Visual Improvement Follow-up Implementation Plan

**Goal:** Promote the accepted 2026-05-07 visual baseline context into a narrow visual-improvement pass for unavailable-card dark treatment, landing expanded answer contrast, and test question disabled-button affordance while keeping the screenshot gate aligned with the current implementation.

**Architecture:** Keep styling changes at the shared token/component-constant layer. Prefer `src/app/globals.css` semantic tokens already consumed by landing cards and GNB controls, plus the existing test button class constant in `src/features/test/test-question-client.tsx`. Do not add per-case CSS selectors, one-off CSS modules, new packages, or new UI behavior.

**Execution rule:** This plan requires explicit user approval before implementation. Execute inline one unit at a time; do not use parallel agents, automated multi-wave execution, or stage/commit snapshot/provenance changes without explicit approval.

---

## Background

2026-05-06 `qa:gate:once`의 Playwright `@gate` theme-matrix 구간에서 35개 screenshot mismatch가 확인되었다. R-06 Landing Namespace Relocation은 path-only 변경이며, 진단 결과 CSS class, selector, `data-*`, `aria-*`, theme token, dark-mode scope, hover/focus/selected 로직 변경은 확인되지 않았다.

실패 expected PNG는 모두 로컬 ignored baseline(`tests/e2e/theme-matrix-smoke.spec.ts-snapshots/`)과 byte-identical이며, 해당 local baseline provenance는 2026-05-03 기준이다. tracked provenance(`tests/e2e/theme-matrix-baseline-provenance.md`)는 2026-05-06 22:31:08 KST 기준 baseline 재생성 및 gate 통과를 기록한다.

## Baseline Decision

현재 actual rendering을 baseline으로 승격한다.

사용자 확인 사항:

- Landing normal desktop/tablet unavailable badge는 neutral 상태에서 숨기고 hover/focus 후 `Coming Soon / 출시 예정` badge를 표시하는 것이 의도된 UX다.
- Landing normal dark mobile, blog/history dark GNB, test-instruction dark overlay, landing-test-expanded answer surface 차이는 치명적 오류가 아니며 현재 상태를 baseline으로 간주해도 된다.
- 이번 baseline 승격은 Visual Improvement backlog를 닫는 것이 아니라, screenshot gate를 현재 구현 상태에 맞추는 조치다.

Baseline regeneration command approved for the baseline-promotion follow-up:

```bash
npm run qa:visual:full
```

Actual execution reused the already-running preview server on `127.0.0.1:4173`:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 npm run qa:visual:full
```

Result: `288 passed`.

Gate verification:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 npm run test:e2e:gate
```

Result: `126 passed`.

Do not stage or commit the resulting snapshot/provenance changes without explicit user approval.

---

## Relevant SSOT Contracts

- Landing grid / GNB / theme: `docs/req-landing.md §6.4`, `§6.5`, `§6.8`, `§6.9`, `§9.2`, `§9.3`, `§10.2`, `§13.2`, `§14.2`.
- Test flow / instruction / runtime question: `docs/req-test.md §4.3`, `§12.2`; `docs/req-test-plan.md` Part 4/5 current runtime notes.
- Project rules: `docs/agent-guides/project-rules.md §Blog-Telemetry-Theme`, `§TestFlow`.
- Verification: `docs/agent-guides/verification-commands.md §landing`, `§test-flow`.

## Current Code Evidence

- `src/app/globals.css` owns semantic theme tokens: interactive neutral/accent tokens, landing answer tokens, overlay scrims, unavailable overlay/badge tokens, and dark overrides.
- `src/features/landing/grid/landing-grid-card.tsx` already consumes shared tokens:
  - answer buttons use `--landing-answer-bg-rest`, `--landing-answer-bg-hover`, `--landing-answer-border-hover`, `--landing-answer-shadow-hover`.
  - unavailable overlay uses `--unavailable-overlay-gradient`, `--unavailable-badge-*`.
  - desktop hover-capable unavailable overlay remains `opacity-0` until hover/focus; tap/mobile stays `opacity-100`.
- `src/features/test/test-question-client.tsx` owns live test button class constants. Disabled buttons currently rely mainly on `disabled:opacity-[0.58]` and `disabled:cursor-default`.
- `src/features/gnb/site-gnb.tsx` consumes shared surface/neutral tokens for dark header controls. This follow-up should inspect GNB impact but should not edit GNB source unless the review finds a contract-level defect and the user re-confirms.
- `tests/e2e/theme-matrix-smoke.spec.ts` currently captures `test-question` after selecting answer A, so the disabled `Next / 다음` state is not visible in that screenshot.

## Files To Modify

- Modify: `docs/plans/2026-05-07-theme-matrix-visual-improvement-followup.md`
  - This file is the approval plan and execution checklist.
- Modify: `src/app/globals.css`
  - Add shared disabled affordance tokens.
  - Tune existing landing answer and unavailable dark-mode tokens.
  - Preserve single-file Tailwind v4 globals boundary.
- Modify: `src/features/test/test-question-client.tsx`
  - Replace the generic disabled opacity-only treatment with token-backed disabled button classes.
  - Preserve current button semantics, labels, `disabled` attributes, click guards, and test ids.
- Modify: `tests/e2e/theme-matrix-smoke.spec.ts`
  - Preferred minimal coverage option: change the existing `test-question` settle recipe to stop immediately after instruction start so the existing matrix captures disabled `Next / 다음`.
  - Alternative option requiring confirmation: add a separate manifest case for disabled question state and keep the existing selected-answer state. This would also require modifying `tests/e2e/theme-matrix-manifest.json` and updating documented screenshot counts.
- Conditional modify after implementation and explicit approval: `tests/e2e/theme-matrix-baseline-provenance.md`
  - Record the new regeneration date, git SHA, environment, commands/results, and reason after visual tokens are accepted.
  - Also correct the currently stale plan path if provenance is touched.
- Conditional inspect/update after implementation: `docs/project-analysis.md`
  - Only update exact lines that become stale because `globals.css` token ownership or line count changes. The file is already dirty before this plan, so inspect the existing diff first and preserve unrelated user changes.

## Explicit Non-Scope

- Do not touch `public/theme-bootstrap.js`.
- Do not touch `src/features/gnb/site-gnb.tsx` for micro contrast unless the GNB review finds a contract failure and the user re-confirms.
- Do not change landing interaction state, hover/focus logic, `data-*`, `aria-*`, locale routing, card availability, or variant registry data.
- Do not add packages, Tailwind config files, new CSS modules, or broad CSS selectors.
- Do not stage or commit local PNG snapshots or provenance changes without explicit user approval.

## Impact Assessment

- Shared components / shell / GNB: Shared tokens may affect surfaces that consume `--surface`, `--chip-*`, or `--interactive-*`. The preferred plan avoids changing broad neutral tokens for landing answer contrast and only changes landing-specific answer tokens plus new disabled tokens. GNB receives audit coverage but no direct source edit.
- Localization: No message keys or locale copy change. Verify `/en` and `/kr` because those are the theme-matrix representative rows.
- A11y: Disabled controls remain native `<button disabled>`. Focus rings and unavailable overlay focus visibility must remain readable. Cursor changes apply only to disabled test buttons.
- State contracts: No state machine or transition changes. The only test-state change is visual coverage for the unanswered test question state.
- Core user flow: Landing cards still block unavailable entry, test answer buttons still navigate through the same handlers, and runtime question navigation still requires an answer before Next.
- Risk dimensions: usability, a11y, responsiveness, design system consistency. Performance risk is low because changes are token/class-only, but visual regression must cover desktop/tablet/mobile and light/dark.

## Implementation Units

### Unit 0 — Baseline Guard And Dirty-Tree Isolation

**Files:** none.

- [ ] Confirm no `.planning/STATE.md` exists or restore it if present.
- [ ] Run:

```bash
git status --short
```

Expected before implementation: existing unrelated dirty files may remain, currently `docs/project-analysis.md`, `playwright.config.ts`, and `tests/e2e/transition-telemetry-smoke.spec.ts`. Do not edit or revert them unless this plan later requires a targeted docs update.

- [ ] Verify script names before running gates:

```bash
node -e "const p=require('./package.json'); console.log(p.scripts['qa:visual:full']); console.log(p.scripts['test:e2e:gate']);"
```

Expected:

```text
PLAYWRIGHT_SERVER_MODE=preview playwright test tests/e2e/theme-matrix-smoke.spec.ts --update-snapshots
PLAYWRIGHT_SERVER_MODE=preview playwright test --grep @gate
```

### Unit 1 — RED Coverage For Disabled Test Question State

**Files:**

- Modify: `tests/e2e/theme-matrix-smoke.spec.ts`

Preferred minimal change:

- [ ] In `applySettleRecipe()`, change the `test-question` branch from:

```ts
case 'test-question':
  await startTestAttempt(page);
  await answerCurrentQuestion(page, 'A');
  return;
```

to:

```ts
case 'test-question':
  await startTestAttempt(page);
  return;
```

- [ ] Leave `completeTestAttempt()` unchanged. It still answers each question internally for result-state coverage.
- [ ] Run targeted RED visual check against existing snapshots:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 npx playwright test tests/e2e/theme-matrix-smoke.spec.ts --grep "theme matrix gate.*test-question"
```

Expected RED before token implementation/baseline regeneration: screenshot mismatches for `test-question` cases because the state changed from selected-answer/Next-enabled to no-answer/Next-disabled. If this passes unexpectedly, stop and inspect whether local snapshots already reflect the disabled state.

### Unit 2 — Token-Level Visual Improvements

**Files:**

- Modify: `src/app/globals.css`
- Modify: `src/features/test/test-question-client.tsx`

`src/app/globals.css` token edits:

- [ ] Add root disabled tokens near the interactive token block:

```css
  --interactive-disabled-bg: color-mix(in srgb, var(--chip-bg) 58%, var(--panel-solid));
  --interactive-disabled-border: color-mix(in srgb, var(--surface-divider) 72%, transparent);
  --interactive-disabled-ink: color-mix(in srgb, var(--muted-ink) 62%, transparent);
```

- [ ] Tune root landing answer tokens without making hover look selected:

```css
  --landing-answer-bg-rest: color-mix(in srgb, var(--chip-bg) 54%, var(--panel-solid));
  --landing-answer-bg-hover: color-mix(in srgb, var(--interactive-neutral-bg-hover) 70%, var(--panel-solid));
  --landing-answer-border-hover: color-mix(in srgb, var(--surface-divider) 84%, var(--accent-solid) 16%);
  --landing-answer-shadow-hover:
    0 10px 22px rgb(11 15 22 / 10%),
    inset 0 0 0 1px color-mix(in srgb, var(--surface-divider) 58%, transparent);
```

- [ ] Add dark disabled and unavailable overrides inside `html[data-theme='dark']`:

```css
  --interactive-disabled-bg: color-mix(in srgb, var(--chip-bg) 42%, transparent);
  --interactive-disabled-border: color-mix(in srgb, var(--surface-divider) 64%, transparent);
  --interactive-disabled-ink: color-mix(in srgb, var(--muted-ink) 58%, transparent);
  --unavailable-overlay-gradient:
    linear-gradient(180deg, rgb(3 5 9 / 10%) 0 30%, rgb(3 5 9 / 36%) 70%, rgb(3 5 9 / 54%) 100%),
    linear-gradient(145deg, rgb(3 5 9 / 20%), rgb(3 5 9 / 34%));
  --unavailable-badge-border: rgb(238 244 255 / 42%);
  --unavailable-badge-bg: color-mix(in srgb, var(--panel-solid) 62%, black);
  --unavailable-badge-ink: rgb(255 255 255 / 98%);
```

- [ ] Tune dark landing answer hover/neutral contrast:

```css
  --landing-answer-bg-rest: color-mix(in srgb, var(--chip-bg) 70%, transparent);
  --landing-answer-bg-hover: color-mix(in srgb, var(--chip-bg) 92%, var(--panel-solid));
  --landing-answer-border-hover: color-mix(in srgb, var(--surface-divider) 80%, var(--accent-solid) 20%);
  --landing-answer-shadow-hover:
    0 12px 28px rgb(0 0 0 / 34%),
    inset 0 0 0 1px color-mix(in srgb, var(--surface-divider) 72%, transparent);
```

`src/features/test/test-question-client.tsx` class edit:

- [ ] Replace the disabled portion of `testButtonBaseClassName`:

```ts
disabled:cursor-default disabled:opacity-[0.58]
```

with token-backed disabled styling:

```ts
disabled:cursor-not-allowed disabled:border-[var(--interactive-disabled-border)] disabled:bg-[var(--interactive-disabled-bg)] disabled:text-[var(--interactive-disabled-ink)] disabled:opacity-100 disabled:shadow-none disabled:hover:border-[var(--interactive-disabled-border)] disabled:hover:bg-[var(--interactive-disabled-bg)] disabled:hover:text-[var(--interactive-disabled-ink)] disabled:hover:shadow-none disabled:hover:translate-y-0
```

- [ ] Do not change `disabled={!started || !currentAnswer}`, `disabled={!started || !allAnswered}`, `data-testid`, click handlers, telemetry, or question navigation.

### Unit 3 — Targeted Visual Review Before Snapshot Promotion

**Files:** no new source files unless review exposes a contract failure.

- [ ] Run a targeted gate subset before updating snapshots:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 npx playwright test tests/e2e/theme-matrix-smoke.spec.ts --grep "theme matrix gate.*(landing-normal|landing-test-expanded|test-question|blog-default|history-default|mobile-landing-menu-open|mobile-blog-menu-open|mobile-history-menu-open)"
```

Expected before snapshot regeneration: screenshot mismatches only in cases affected by the intentional visual changes. Runtime errors, layout explosions, missing elements, or unrelated state failures are not acceptable and must be diagnosed before continuing.

- [ ] Inspect affected artifacts in `test-results/` locally:
  - `/en`, `/kr`, dark mobile unavailable cards at `390x844`.
  - `/en`, `/kr`, dark desktop/tablet unavailable hover/focus treatment at `1440x980` and `1023x980`.
  - `/en`, `/kr`, QMBTI expanded answer buttons, desktop/tablet, light/dark.
  - `/en/test/qmbti`, `/kr/test/qmbti`, after instruction start with no answer selected, desktop/tablet/mobile, light/dark.
  - `/en`, `/kr`, `/en/blog`, `/kr/blog`, `/en/history`, `/kr/history`, dark GNB controls.

- [ ] If GNB contrast still looks acceptable, record "no GNB source change" in the implementation notes. If it does not, stop and ask before touching `src/features/gnb/site-gnb.tsx`.

### Unit 4 — Baseline Regeneration And Provenance

**Files:**

- Local ignored PNGs under `tests/e2e/theme-matrix-smoke.spec.ts-snapshots/`
- Conditional modify with explicit approval: `tests/e2e/theme-matrix-baseline-provenance.md`

- [ ] Regenerate full local theme matrix snapshots:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 npm run qa:visual:full
```

Expected: full theme-matrix suite passes, currently expected count is `288 passed`.

- [ ] Verify gate:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 npm run test:e2e:gate
```

Expected: gate passes, currently expected count is `126 passed`.

- [ ] If and only if the user approves provenance modification, update `tests/e2e/theme-matrix-baseline-provenance.md` with:
  - Date generated.
  - Git commit SHA from `git rev-parse HEAD`.
  - Working tree note describing visual-improvement token changes.
  - OS, Node version, Playwright version.
  - Regeneration and gate verification commands/results.
  - Reason: accepted visual-improvement baseline for dark unavailable treatment, expanded answer contrast, and disabled Next affordance.

### Unit 5 — Default Done Gates And Scope-Specific Checks

**Files:** none beyond implemented changes and approved docs updates.

Run basic gates in order:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Run landing/GNB/theme scope checks:

```bash
node scripts/qa/check-phase4-grid-contracts.mjs
node scripts/qa/check-phase5-card-contracts.mjs
node scripts/qa/check-phase6-spacing-contracts.mjs
node scripts/qa/check-phase7-state-contracts.mjs
node scripts/qa/check-phase8-accessibility-contracts.mjs
node scripts/qa/check-phase9-performance-contracts.mjs
node scripts/qa/check-phase10-transition-contracts.mjs
npm test -- \
  tests/unit/landing-interaction-dom.test.ts \
  tests/unit/landing-hover-intent.test.ts \
  tests/unit/landing-mobile-lifecycle.test.ts \
  tests/unit/landing-desktop-shell-phase.test.ts \
  tests/unit/landing-grid-plan.test.ts \
  tests/unit/landing-baseline-manager.test.ts \
  tests/unit/gnb-behavior.test.ts \
  tests/unit/gnb-desktop-settings.test.ts \
  tests/unit/gnb-mobile-menu.test.ts \
  tests/unit/gnb-back-navigation.test.ts \
  tests/unit/gnb-theme-transition.test.ts
npx playwright test \
  tests/e2e/grid-smoke.spec.ts \
  tests/e2e/state-smoke.spec.ts \
  tests/e2e/gnb-smoke.spec.ts \
  tests/e2e/a11y-smoke.spec.ts
```

Run test-flow checks applicable to the disabled question surface:

```bash
npm test -- \
  tests/unit/test-domain-variant-validation.test.ts \
  tests/unit/test-domain-question-model.test.ts \
  tests/unit/test-domain-derivation.test.ts \
  tests/unit/test-domain-type-segment.test.ts \
  tests/unit/test-entry-policy.test.ts \
  tests/unit/test-question-bootstrap.test.ts \
  tests/unit/variant-question-bank.test.ts \
  tests/unit/test-lazy-validation.test.ts \
  tests/unit/schema-registry.test.ts
npx playwright test tests/e2e/consent-smoke.spec.ts
```

If `PLAYWRIGHT_BASE_URL` is not available, use the repo preview webServer path instead:

```bash
PLAYWRIGHT_SERVER_MODE=preview npm run test:e2e:gate
```

## Documentation Sync After Implementation

- Inspect `docs/project-analysis.md` after code changes. If `src/app/globals.css` line count or token ownership wording becomes stale, update only the affected line(s), preserving pre-existing user edits.
- Do not update `AGENTS.md` unless scripts, route surface, locale set, Gold Standards, baseline policy, or persistent repo-specific rules change. This plan does not intend to change those.
- Do not update `docs/archive/**`.

## Decisions Requiring User Confirmation Before Execution

1. Approve the preferred minimal test coverage change: reuse the existing `test-question` theme-matrix state for the answer-unselected / disabled-Next surface. Alternative: add a separate manifest case and update screenshot counts.
2. Approve the token-first implementation approach in `src/app/globals.css` plus the test button class constant in `src/features/test/test-question-client.tsx`.
3. Confirm whether provenance modification is approved after regeneration. PNG snapshots are local ignored files; tracked provenance must not be staged or committed without explicit approval.
4. Confirm that Dark GNB micro contrast remains review-only unless the targeted visual review finds a contract-level contrast failure.

## Stop Conditions

- Stop before code if the user rejects the `test-question` coverage change or requests a separate manifest case instead.
- Stop if targeted RED check does not fail after changing the screenshot state.
- Stop if visual changes require touching `src/features/gnb/site-gnb.tsx`, `public/theme-bootstrap.js`, `tests/e2e/theme-matrix-manifest.json`, or build/deployment config beyond the approved scope.
- Stop if implementation would require a new package, new CSS file, or broad refactor.
- Stop if basic gates fail three or more times in the same unit; write `.planning/STATE.md` per session-preservation rules.
