# Wave 11 Desktop A11y / Keyboard Hardening Implementation Plan

> **Plan status:** Approved and implemented on 2026-06-15; formal completion is blocked by the
> separately owned Phase 9 stale matcher recorded in §18.
> **Authoring mode:** Approved implementation record.
> **Implementation mode after approval:** Inline execution only, one unit at a time. Do not dispatch
> parallel agents, automated implementation pipelines, or multi-wave execution.
> **Wave:** 11 - Landing desktop a11y/keyboard hardening.
> **Risk:** High - usability, accessibility, responsive input behavior, lifecycle state, and
> design-system consistency are in scope.
> **Workspace:** `/Users/b-m-2022001/Local/ViveTest`, branch `main`.
> **Basis:** `docs/plans/2026-06-11-wave-11-desktop-a11y-keyboard-analysis.md`. Section references
> below point to that approved analysis; this plan does not restate its evidence audit.
> **Logic Improvement: approved — W11-LI-01, W11-LI-02, W11-LI-03, W11-LI-04.**
> **Resolved decisions:** D1 Escape returns focus to the Test trigger; D2 Test-trigger Enter/Space is
> an idempotent `CARD_EXPAND` command with no navigation or focus transfer; D3 remove
> `aria-label="Card tags"` and rely on native list semantics with no new i18n keys.
> **Governing decisions:** BQ-12, BQ-19, BQ-21, BQ-24, BQ-25, BQ-26, Wave 10 outcomes, and the
> implementation-time BQ-33 record defined in Unit 5.
> **Amendment authority:** User-approved A1-A8 override every conflicting pre-approval example in
> this plan. The implemented choices are recorded in §18.

---

## 1. Goal and Architecture

**Goal:** Make Desktop/Tablet landing-card keyboard behavior deterministic and accessible without
changing Test entry, Blog navigation, unavailable-card reachability, mobile lifecycle, GNB behavior,
or the established transition/telemetry/storage/routing contracts.

**Architecture:**

1. Route Desktop/Tablet keyboard focus through one card-aware immediate command. It cancels the
   pending pointer intent, distinguishes Test-expandable from merely enterable Blog, and dispatches
   the existing reducer events used by the current desktop motion/geometry path.
2. Route card Escape through one bubbling card-root handler and true focus-out through one card-root
   boundary predicate. Both invoke one controller-owned desktop close primitive. The primitive is
   source-aware and idempotent: a blur emitted after a queued Test-to-Test handoff must not overwrite
   the already-selected `handoff` reason or collapse the new target. Escape queues focus back to the
   Test trigger; focus-out preserves the destination.
3. Define logical disclosure interactivity from the desktop shell phase. `closing`,
   `cleanup-pending`, and `handoff-source` are noninteractive immediately even when the visual shell
   remains mounted for reverse motion and BQ-24 geometry.
4. Put names, disabled state, and disclosure state on semantic triggers. Use element relationships,
   not concatenated labels, and add no live region or message key.
5. Replace only the expanded card's legacy blue-derived focus-ring references with the card-scoped
   2px sage outline and 2px offset.
6. Preserve top-overlay precedence without editing GNB: a card-root Escape may run only when no
   higher-priority GNB dialog is open. The proof must use the existing rendered semantic state. If
   this cannot be proven locally, stop and request the Wave 15 re-scope.

**Tech stack:** Next.js 16, React 19, TypeScript, CSS Modules/Tailwind v4 component classes, Vitest,
JSDOM, Playwright, and axe-core.

## 2. Authority, Precedence, and Boundaries

Apply the authority order from analysis §2:

1. `docs/decision-register.md`
2. `docs/req-landing.md` and active project rules
3. `docs/design/design.md` for visual focus treatment only
4. Current implementation and tests
5. Mockup resources as visual reference only

Behavior, focus, keyboard, ARIA, lifecycle, routing, storage, transition, and telemetry remain owned
by requirements/decision records/code. `docs/design/design.md` may record only the visual placement
and appearance of focus-visible treatment under BQ-21.

### 2.1 Wave boundary

- **Include:** Desktop/Tablet Test focus expansion, focus-versus-activation separation, Escape and
  true focus-out close, closing-phase noninteractivity, trigger-owned ARIA, stable names and
  descriptions, tags-label removal, scoped expanded focus-visible parity, tests, and the listed SSOT
  re-anchors.
- **Exclude:** Mobile lifecycle a11y (Wave 13), GNB internals (Wave 15), global token migration or
  `src/app/globals.css` (Wave 16), snapshots/baselines (BQ-07), and transition/telemetry/storage/
  routing/resolver/registry/test-entry/pre-answer behavior.
- **Stop condition:** If deterministic card Escape cannot remain isolated to the landing card root
  while preserving top-overlay precedence through the existing rendered GNB semantic state, stop
  before changing code and request a Wave 15/GNB re-scope. Do not edit or export new behavior from
  GNB under this plan.

### 2.2 Separate prerequisite note

Wave 8/10 roadmap and `.planning/STATE.md` reconciliation is owned by the user separately. It is not
an implementation unit in this plan. Do not edit `docs/wave-roadmap.md` or `.planning/STATE.md`.
Before implementation begins, record the user's authorization to proceed; do not try to satisfy the
prerequisite by changing either file.

### 2.3 Reference-only surfaces

- `docs/plans/2026-06-11-wave-11-desktop-a11y-keyboard-analysis.md`
- `docs/wave-roadmap.md`
- `.planning/STATE.md`
- `src/features/gnb/**`
- `src/features/transition/**`
- `src/features/telemetry/**`
- `src/features/landing/storage/**`
- `src/features/test/**`
- `src/features/variant-registry/**`
- `src/i18n/**`
- `src/lib/routes/**`
- `src/app/globals.css`
- `tests/e2e/theme-matrix-manifest.json`
- `tests/e2e/state-smoke.spec.ts-snapshots/**`
- `tests/e2e/a11y-smoke.spec.ts-snapshots/**`
- `docs/blocker-traceability.json`

### 2.4 Confirmations before execution

- **Product/UX decisions:** none remain. D1, D2, D3 and §6.1/§6.2/§6.3/§6.4/§6.6 rulings are
  locked by the user.
- **Required user gates:** explicit approval of this plan and an explicit disposition of the
  separately owned Wave 8/10 roadmap/STATE prerequisite.
- **Re-scope gate:** any required GNB source change, mobile lifecycle change, global token change,
  baseline update, or transition/telemetry/storage/routing change requires a new user decision and
  stops this plan.

## 3. Locked Behavioral and Semantic Contracts

### 3.1 D1 - Escape and focus-out

- Escape from the Test trigger, choice A, or choice B invokes the same controller close command.
- Escape starts the standard `collapse` lifecycle and returns focus to that card's Test trigger.
- True focus-out invokes the same state/timer/lifecycle cleanup but never reclaims focus.
- Trigger to choice and choice to choice are inside-card moves and must not close.
- No focus trap is introduced.
- This supersedes the current `req-landing.md §9.1` browse-neutral Escape wording. It does not
  supersede top-overlay precedence.

### 3.2 D2 - Test-trigger Enter/Space

- Desktop/Tablet Test trigger Enter and Space prevent native button submission behavior and dispatch
  the existing `CARD_EXPAND`.
- The command is idempotent when focus has already expanded the card.
- It does not navigate, enter the test, move focus to choice A, or toggle the card closed.
- Test entry remains exclusively owned by answer-choice A/B activation under BQ-12.

### 3.3 D3 - Tags semantics

- Remove the hard-coded English `aria-label="Card tags"`.
- Keep the public tags row as a native `<ul>` with `<li>` children.
- Add no replacement label and no message key.
- Preserve hidden-suffix unmounting and the `aria-hidden` + `inert` measurement probe.

### 3.4 Approved mechanism rulings

- **Analysis §6.1 A:** one card-aware immediate keyboard-focus command on the existing desktop path.
- **Analysis §6.2 C:** one controller-owned close command plus one focus-boundary predicate.
- **Analysis §6.3 A:** Test-trigger `aria-expanded`; `aria-controls` may target only the
  always-mounted desktop stage.
- **Analysis §6.4 A:** no `aria-live`.
- **Analysis §6.6 B:** logical disclosure closes at the start of the closing phase while the visual
  shell remains for reverse animation.

## 4. Complete Implementation File Set

No new source file is required.

### 4.1 Runtime and styling

| File | Planned responsibility |
|---|---|
| `src/features/landing/model/interaction-state.ts` | Add the pure enterable-versus-expandable keyboard-focus decision; preserve `CARD_EXPAND` idempotence; remove the unused global `ESCAPE` reducer event after card Escape has one owner. |
| `src/features/landing/grid/use-hover-intent-controller.ts` | Replace timer-only clearing at keyboard boundaries with one cancellation command that clears timer, invalidates token, and clears pointer target. Pointer dwell timings remain unchanged. |
| `src/features/landing/grid/interaction-dom.ts` | Add the single card focus-boundary predicate, a read-only higher-priority-overlay predicate based on existing rendered semantics, and reuse existing queued trigger focus. |
| `src/features/landing/grid/desktop-shell-phase.ts` | Add the pure logical-interactivity predicate used by controls and ARIA. |
| `src/features/landing/grid/use-keyboard-mode-tracker.ts` | Keep global Tab/mousedown mode tracking; remove global Escape dispatch. |
| `src/features/landing/grid/use-card-keyboard-handler.ts` | Route direct focus and queued handoff through the controller command; remove the Blog-only pre-focus workaround and local trigger Escape owner; keep D2 activation and existing mobile branches. |
| `src/features/landing/grid/use-keyboard-handoff.ts` | Thread the shared focus and close commands to the card keyboard handler without changing mobile handoff behavior. |
| `src/features/landing/grid/use-landing-interaction-controller.ts` | Own the immediate keyboard-focus command and one source-aware desktop close primitive; classify Test expandability; guard duplicate blur-after-handoff close; provide card-root Escape/focus-out bindings; preserve the existing no-argument cleanup close used by geometry/transition cleanup. |
| `src/features/landing/grid/landing-card-interaction-bindings.ts` | Add typed card-root `onKeyDown` and `onBlur` bindings. |
| `src/features/landing/grid/landing-catalog-grid.tsx` | Pass card-root bindings and expose `data-interaction-expanded-card-variant` plus `data-active-visual-card-variant` on the existing grid shell for reducer-versus-geometry race assertions. |
| `src/features/landing/grid/landing-grid-card.tsx` | Attach root Escape/focus-out handlers; define stable title/status/stage relationships; make closing controls noninteractive; remove duplicate root `aria-disabled`; remove tags label. |
| `src/features/landing/grid/landing-grid-card.module.css` | Use the scoped 2px sage/2px-offset focus ring for the expanded Test surface; remove expanded references to global `--focus-ring-*`. |

### 4.2 Tests

| File | Planned responsibility |
|---|---|
| `tests/unit/landing-interaction-state.test.ts` | Expandability classification, desktop-tap `CARD_EXPAND`, D2 idempotence, and removal of the parallel `ESCAPE` event contract. |
| `tests/unit/landing-interaction-dom.test.ts` | Inside-card versus true focus-out boundary cases, including null/non-Node related targets. |
| `tests/unit/landing-desktop-shell-phase.test.ts` | Opening/steady/handoff-target interactive; closing/cleanup/handoff-source/idle noninteractive. |
| `tests/unit/landing-interaction-controller-handlers.test.ts` | Hook-level immediate focus, pending-intent cancellation, Escape/focus-out ownership, blur-after-handoff idempotence, destination-focus preservation, and D2 no-entry behavior. |
| `tests/unit/landing-card-contract.test.ts` | Static DOM ARIA ownership/relationships, tags-label removal, single unavailable disabled owner, stable stage target, closing-control attributes, and scoped CSS source contract. Activation blocking is proved in hook/E2E tests, not by the static-markup helper. |
| `tests/e2e/state-smoke.spec.ts` | Immediate focus, pending-pointer cancellation, Test/Blog handoff state, Escape/focus-out lifecycle, closing noninteractivity, no trap, geometry/baseline/scale preservation. |
| `tests/e2e/a11y-smoke.spec.ts` | Keyboard matrix, D2 activation, all-locale names/states, unavailable semantics, tags/list semantics, focus-only no-side-effects, and desktop-expanded axe. |

All new Playwright cases must include the unique non-snapshot title marker
`assertion:W11-keyboard`. Unit-specific titles append `LI-01`, `LI-02`, `LI-03`, or `LI-04`.

### 4.3 SSOT and implementation record

| File | Planned responsibility |
|---|---|
| `docs/req-landing.md` | Re-anchor §7.6, §8.2, §8.3, §9.1, §9.2, §9.3, and the existing §14.2 Keyboard/A11y item. |
| `docs/design/design.md` | Re-anchor §6.9 and §7.2-§7.5 for visual focus placement only. |
| `docs/decision-register.md` | Add BQ-33 with the approved Wave 11 keyboard/a11y contract. |
| `docs/plans/2026-06-11-wave-11-desktop-a11y-keyboard-plan.md` | After implementation and all gates, record actual files, commands, divergences, and outcome. |

Do not add a new §14.2 blocker number. Extend the existing Keyboard/A11y item so
`docs/blocker-traceability.json` does not require an unrelated numbering change.

## 5. Impact Assessment

| Dimension | Impact and guard |
|---|---|
| Shared shell / GNB | Landing card root only. No GNB file or behavior change. Stop if overlay precedence cannot be preserved locally. |
| Localization | No new message keys. Validate existing title and coming-soon relationships in `en`, `kr`, `zs`, `zt`, `ja`, `es`, `fr`, `pt`, `de`, `hi`, `id`, `ru`. |
| Accessibility | High impact: focus disposition, tab order, logical disclosure, names, descriptions, expanded state, disabled ownership, and focus-visible treatment. |
| State contracts | Reuse `CARD_FOCUS`, `CARD_EXPAND`, and `CARD_COLLAPSE`; remove the duplicate global `ESCAPE` event. No parallel expanded state. |
| Core user flow | Focus previews only. Test entry remains A/B-only; Blog Enter remains native navigation; unavailable remains skipped. |
| Responsiveness | Desktop/Tablet behavior changes only. Mobile focus/lifecycle behavior remains unchanged. |
| Performance | No new observer, polling loop, global listener, timer source, live region, or render-driving QA counter. Pending hover work is canceled rather than duplicated. |
| Design system | Card-scoped sage focus ring only. No global token promotion or `globals.css` edit. |

## 6. Execution Protocol

1. Execute Units 0-5 inline and sequentially.
2. For Units 1-4, add the named failing contract/computed-style/keyboard tests before production
   code.
3. Run each unit's red command and confirm failure is caused by the missing Wave 11 contract.
4. Implement the minimum code needed for that unit.
5. Run the unit's green command and stop on any failure.
6. Do not begin the next unit until the current unit is green.
7. Do not commit, push, update checkpoints, regenerate snapshots, or edit roadmap/STATE under this
   plan unless the user gives separate authorization.
8. If a new product, GNB, mobile, transition, telemetry, storage, routing, or test-entry decision is
   discovered, stop and request clarification rather than widening scope.

## 7. Unit 0 - Implementation Preflight

### Files

- Read only: all files listed in §§2.3 and 4.

### Steps

- [x] Verify `pwd` is `/Users/b-m-2022001/Local/ViveTest`.
- [ ] Verify branch `main`, record HEAD, and record `git status --short --untracked-files=all`.
- [ ] Confirm the user has authorized implementation after reviewing this plan.
- [ ] Confirm the user-owned Wave 8/10 roadmap/STATE prerequisite has been reconciled, or record an
      explicit user authorization to proceed despite that separate authority mismatch. Do not edit
      roadmap or STATE from this plan, and do not describe Wave 11 as complete while the prerequisite
      remains unresolved.
- [ ] Re-read root `AGENTS.md`, this plan, and analysis §§5, 6, 8, 9, and 10.13.
- [ ] Confirm `package.json`, `playwright.config.ts`, `next.config.ts`, and `src/config/site.ts` still
      match the commands/locales assumed here.
- [x] Prove from the current rendered DOM that an open desktop GNB settings dialog can be detected
      from the card layer without editing `src/features/gnb/**`. The verified panel is a non-hidden
      `div[role="dialog"]` under `header`, has no `aria-modal`, and does not trap focus. The local
      safety predicate is document-wide `[role="dialog"]:not([hidden])`, not header-coupled.
- [ ] Confirm Unit 2 will begin with the top-overlay regression before its production edits. It must
      open settings while a Test card retains focus, press Escape once, and prove only settings
      closes; the second Escape closes the card. If the first-Escape isolation cannot be made
      deterministic without a GNB change, stop and request re-scope.
- [ ] Confirm the allowed file set is exactly §4 and no snapshot/baseline file is modified.
- [ ] Record the sorted SHA-256 output for existing files under `tests/e2e/*-snapshots/` as
      pre-implementation evidence because local baseline files may be ignored by Git. Compare the
      same checksum inventory in §13.5; do not create, delete, or refresh any baseline.

```bash
find tests/e2e -type f -path '*-snapshots/*' -print |
  LC_ALL=C sort |
  while IFS= read -r file; do shasum -a 256 "$file"; done
```

No test command is required for Unit 0.

## 8. Unit 1 - W11-LI-01 Immediate Card-Aware Focus Expansion

### Contract

Implement analysis §6.1 A:

- Keyboard focus cancels pending pointer intent by clearing both timer and intent token.
- Desktop/Tablet Test focus expands within at most the queued React/focus frame, never after the
  160ms pointer dwell.
- Expansion works when desktop capability resolves to `interactionMode='tap'`.
- Blog is enterable but never expandable, including pre-focus queued handoff.
- Unavailable is neither enterable nor expandable.
- Test focus dispatches the existing `CARD_EXPAND`; Blog focus dispatches focus-only state and
  collapses a prior Test through the existing controller reducer/motion path.
- The existing reducer, desktop motion, BQ-24 floor, baseline, title continuity, and Wave 10 scale
  remain the only expansion path.
- Focus alone produces no navigation, transition, ingress, telemetry, or Test entry.
- A queued Test-to-Test handoff preserves the existing source `handoff-source` / target
  `handoff-target` contract. A Test-to-Blog move is a standard Test collapse plus Blog focus-only;
  Blog is never a handoff target because it is not expandable.

### Red tests first

- [ ] In `tests/unit/landing-interaction-state.test.ts`, add a failing contract for the new pure
      classifier:

```ts
resolveKeyboardFocusDisposition({
  isMobileViewport: false,
  cardEnterable: true,
  cardExpandable: true
}) === 'expand'

resolveKeyboardFocusDisposition({
  isMobileViewport: false,
  cardEnterable: true,
  cardExpandable: false
}) === 'focus-only'

resolveKeyboardFocusDisposition({
  isMobileViewport: false,
  cardEnterable: false,
  cardExpandable: false
}) === 'focus-only'

resolveKeyboardFocusDisposition({
  isMobileViewport: true,
  cardEnterable: true,
  cardExpandable: true
}) === 'preserve-mobile'
```

- [ ] In `tests/unit/landing-interaction-controller-handlers.test.ts`, make the match-media stub
      configurable and add failing hook contracts for:
  - Desktop `hover:none` Test `onFocus` setting `expandedCardVariant` immediately.
  - A queued hover expand timer followed by keyboard focus on another Test; advancing beyond
    `DESKTOP_EXPAND_DELAY_MS` must not restore the pointer target.
  - The actual target `focus` event after queued Test-to-Test handoff is idempotent and does not
    replace the handoff reason with `expand`.
  - Test-to-Blog focus collapsing Test through `collapse`, leaving Blog focused-only, and never
    assigning Blog to `expandedCardVariant`.
  - Repeated Test-trigger Enter/Space leaving the same expanded variant and never calling
    `onAnswerChoiceSelect`.

- [ ] Add `assertion:W11-keyboard LI-01` Playwright cases that fail before implementation:
  - Desktop `hover:none` and Tablet-width Test focus expand without dwell by reusing the established
    `window.matchMedia('(hover: hover) and (pointer: fine)')` stub pattern;
  - pointer dwell queued on Test A, then keyboard focus moves to Test B, and A never expands after
    the pointer delay;
  - Test-to-Blog queued transfer and Blog-to-Test native/direct focus transfer keep
    `data-interaction-expanded-card-variant`, `data-active-visual-card-variant`, Blog
    `data-desktop-motion-role`, and `data-baseline-active-card-variant` free of Blog ownership;
  - focus-only side-effect audit snapshots URL, transition overlay count, session-storage ingress
    values, and intercepted `/api/telemetry` request count before and after focus.

- [ ] Run the red command:

```bash
npm test -- \
  tests/unit/landing-interaction-state.test.ts \
  tests/unit/landing-interaction-controller-handlers.test.ts
npx playwright test \
  tests/e2e/state-smoke.spec.ts \
  tests/e2e/a11y-smoke.spec.ts \
  --grep "assertion:W11-keyboard.*LI-01"
```

Expected red: the classifier is absent; desktop tap-capability focus does not expand; pending hover
intent can win; queued Blog handoff can temporarily own expanded/opening/geometry state.

### Minimal implementation

- [ ] Add `resolveKeyboardFocusDisposition()` to `interaction-state.ts`. It classifies only
      `expand`, `focus-only`, or `preserve-mobile`; it does not create a new state machine.
- [ ] Expose `cancelPendingHoverIntent()` from `use-hover-intent-controller.ts`. It must call the
      timer clear, increment/invalidate `hoverIntentTokenRef`, and clear
      `pointerWithinCardVariantRef`. Keep `DESKTOP_EXPAND_DELAY_MS` and
      `DESKTOP_COLLAPSE_DELAY_MS` unchanged. Existing unmount/transition cleanup may call the same
      idempotent cancellation command.
- [ ] In the controller, derive `cardExpandable` as `card.type === 'test' && isEnterableCard(card)`.
- [ ] Add one controller callback with this effective contract:

```ts
focusCardFromKeyboard({
  cardVariant,
  cardEnterable,
  cardExpandable,
  nowMs
})
```

It cancels pointer intent first and then:

- preserves the current mobile branch without applying Desktop/Tablet disclosure semantics;
- returns without reassigning transition reason or dispatching when the same target already owns
  the intended focused/expanded state; this makes the real `focus` event after queued handoff
  idempotent;
- dispatches `CARD_EXPAND` for an expandable Test even when `interactionMode === 'tap'`;
- uses `handoff` only when an already-expanded Test is moving to another expandable Test;
- closes an already-expanded Test from the controller by assigning `collapse` and dispatching the
  existing `CARD_COLLAPSE` before Blog `CARD_FOCUS available:false`; keep this branch in the
  controller so Unit 2 can consolidate it into the sole close primitive without changing behavior;
- dispatches focus-only state for Blog/unavailable and never assigns either as expanded.

Do not add a new reducer event or a second expanded state.

- [ ] Route both direct `onFocus` and queued card handoff through that callback.
- [ ] Delete the Blog-only pre-focus collapse workaround. Blog behavior must fall out of
      `cardExpandable=false`.
- [ ] Keep Enter/Space on the Test trigger as the existing `CARD_EXPAND` dispatch. Add a reducer
      assertion that repeating it leaves the same focused/expanded variant.
- [ ] Add `data-interaction-expanded-card-variant` and `data-active-visual-card-variant` to the
      existing landing shell solely as QA/debug projections of existing controller values; do not
      add render-driving state.

### Green verification

- [ ] Re-run the Unit 1 command and require all selected tests to pass.
- [ ] Run:

```bash
git diff --check
```

## 9. Unit 2 - W11-LI-02 Unified Escape / Focus-Out Close

### Contract

Implement analysis §6.2 C, §6.6 B, and D1:

- One controller-owned desktop close primitive performs pending-hover cancellation, state collapse,
  desktop reason assignment, and transition-source cleanup for keyboard Escape/focus-out.
- The close primitive accepts the source card and is idempotent. If a queued handoff has already
  transferred `expandedCardVariant`/`focusedCardVariant` to another Test, the source blur is a no-op
  and must not overwrite `handoff` with `collapse`.
- Test-to-Test handoff keeps source `0ms` and target standard motion. Test-to-Blog is not a
  disclosure handoff: it uses standard Test closing motion and Blog focus-only state.
- One card-root Escape handler is the only card Escape event source.
- Global keyboard tracking retains Tab/mousedown behavior but no longer dispatches `ESCAPE`.
- Escape from trigger/A/B returns focus to that Test trigger after close begins.
- True focus-out closes without focusing anything.
- One predicate treats a destination contained by the same card root as inside-card.
- An open higher-priority GNB dialog consumes the first Escape. The card handler must no-op and let
  the existing GNB document listener run; no GNB file is edited.
- Closing starts logical collapse immediately: preview controls become non-tabbable,
  `aria-hidden`, and non-activatable in `closing`, `cleanup-pending`, and `handoff-source`.
- Reverse visual motion, the shell node, BQ-24 floor/spacer, and baseline release remain intact.
- The existing no-argument `collapseExpandedCard()` used by transition cleanup and geometry
  invalidation remains available; Wave 11 must not silently change those unrelated callers.

### Red tests first

- [ ] In `tests/unit/landing-interaction-dom.test.ts`, add failing cases for:

```ts
isCardFocusExit(cardRoot, choiceB) === false
isCardFocusExit(cardRoot, trigger) === false
isCardFocusExit(cardRoot, outsideButton) === true
isCardFocusExit(cardRoot, null) === true
```

- [ ] In the same file, add a semantic top-overlay predicate contract:

```ts
hasOpenHigherPriorityOverlay(document) === false
// true while a non-hidden role=dialog exists anywhere in the document
```

The helper must not import from `src/features/gnb/**`, inspect React state, or recognize the landing
card's own disclosure as an overlay.

- [ ] In `tests/unit/landing-desktop-shell-phase.test.ts`, add failing cases for:

```ts
isDesktopShellLogicallyInteractive('opening') === true
isDesktopShellLogicallyInteractive('steady') === true
isDesktopShellLogicallyInteractive('handoff-target') === true
isDesktopShellLogicallyInteractive('closing') === false
isDesktopShellLogicallyInteractive('cleanup-pending') === false
isDesktopShellLogicallyInteractive('handoff-source') === false
isDesktopShellLogicallyInteractive('idle') === false
```

- [ ] In `tests/unit/landing-card-contract.test.ts`, render `closing` and `cleanup-pending` desktop
      shells with the existing static-markup helper. Assert the visual answer buttons remain mounted
      but have no public `data-slot="answerChoiceA|B"`, use `tabIndex=-1`, and use
      `aria-hidden="true"`. Do not claim callback execution proof from this static-render harness.
- [ ] In `tests/unit/landing-interaction-controller-handlers.test.ts`, add failing hook-level cases
      that invoke the new root bindings:
  - Escape from the Test trigger and from each choice takes one root route, prevents default once,
    stops propagation once, starts `collapse`, and queues the Test trigger focus.
  - Escape on Blog or programmatically focused Unavailable is a card-state no-op and is not
    prevented by the Test-only root branch.
  - Trigger-to-choice, choice-A-to-choice-B, and choice-to-trigger blur are inside-card no-ops.
  - Blur to an outside control collapses without calling `.focus()` on the Test trigger.
  - After queued Test-to-Test handoff selects the target, the source blur does not clear the target
    or replace the handoff reason.
  - After Test-to-Blog focus-only state closes Test, the source blur is idempotent.
- [ ] Add `assertion:W11-keyboard LI-02` Playwright cases:
  - Escape from trigger, choice A, and choice B;
  - Escape on Blog and programmatically focused Unavailable is a no-op with focus/status preserved;
  - one normalized phase sequence: `steady -> closing -> cleanup-pending -> idle`;
  - one baseline sequence: `BASELINE_FROZEN -> BASELINE_READY`;
  - no `handoff-source` reason during Escape;
  - true focus-out to Blog, GNB, and a document control preserves the destination focus;
  - trigger to A, A to B, and B to trigger do not close;
  - Escape followed immediately by Tab cannot enter closing controls;
  - Escape followed immediately by Enter/Space on the retained formerly-focused choice cannot
    start transition, write ingress, or invoke entry;
  - first-card reverse exit and final-card forward exit do not trap focus;
  - with desktop settings held open while focus is on a Test card, first Escape closes only settings
    and leaves the card expanded/focused; second Escape closes the card and returns focus to its
    trigger.

For sequence assertions, install a `MutationObserver` before Escape, record
`data-desktop-shell-phase` and `data-baseline-phase`, then normalize adjacent duplicate values.
Do not add render-driving counters or a new runtime event solely for tests.

- [ ] Run the red command:

```bash
npm test -- \
  tests/unit/landing-interaction-dom.test.ts \
  tests/unit/landing-desktop-shell-phase.test.ts \
  tests/unit/landing-interaction-controller-handlers.test.ts \
  tests/unit/landing-card-contract.test.ts
npx playwright test \
  tests/e2e/state-smoke.spec.ts \
  tests/e2e/a11y-smoke.spec.ts \
  --grep "assertion:W11-keyboard.*LI-02"
```

Expected red: boundary/interactivity helpers are absent; Escape has duplicate/incomplete ownership;
closing controls remain reachable; focus is not restored from internal choices; the first Escape
can close both an open settings dialog and the card.

### Minimal implementation

- [ ] Add `isCardFocusExit(cardRoot, relatedTarget)` in `interaction-dom.ts`. It returns false only
      when `relatedTarget` is a `Node` contained by `cardRoot`.
- [ ] Add `hasOpenHigherPriorityOverlay(document)` in `interaction-dom.ts`. It may read only the
      current rendered semantic DOM (a document-wide non-hidden `role="dialog"`). It must not import
      GNB modules, mutate the overlay, or add a global listener.

```ts
return ownerDocument.querySelector('[role="dialog"]:not([hidden])') !== null;
```

- [ ] Add `isDesktopShellLogicallyInteractive(phase)` in `desktop-shell-phase.ts`.
- [ ] Replace `isInteractive={desktopStagePhase !== 'cleanup-pending'}` with the pure helper.
- [ ] Add root bindings:

```ts
onCardKeyDown(event: ReactKeyboardEvent<HTMLElement>)
onCardBlur(event: ReactFocusEvent<HTMLElement>)
```

Thread these names through `LandingCardInteractionBindings`, `resolveCardInteractionBindings`,
`LandingCatalogGrid`, and `LandingGridCardProps`, then attach them only to the card root. Keep the
existing trigger `onKeyDown` for Tab and D2 Enter/Space.

The Escape handler:

- runs only for Desktop/Tablet Test cards;
- returns without preventing propagation when `event.defaultPrevented` is true or a
  higher-priority overlay is open;
- otherwise prevents default, stops propagation, and invokes the shared close primitive with
  `reason:'collapse'` and `focusDisposition:'return-trigger'`.

The blur handler invokes the same primitive only on a true boundary exit and uses
`focusDisposition:'preserve-destination'`. It must preserve an already-applied queued handoff.
Both root handlers are Desktop/Tablet-only. A null `relatedTarget` caused by document/window focus
loss is not a true in-page focus-out and must preserve disclosure.

- [ ] Add the source-aware desktop close primitive with this effective contract:

```ts
{
  sourceCardVariant: string;
  reason: 'collapse' | 'handoff';
  focusDisposition: 'return-trigger' | 'preserve-destination';
  nowMs: number;
}
```

It first checks whether the source still owns focused or expanded interaction state. If ownership
already moved to another target, it returns without changing reason/state. Otherwise it performs
one pending-hover cancellation, one transition-reason assignment, one transition-source clear, and
one `CARD_COLLAPSE`. Only `return-trigger` queues
`queueFocusCardByVariant(shellRef.current, sourceCardVariant)`.

Use this primitive from direct/queued keyboard focus when a prior Test must close. Keep
`collapseExpandedCard()` as a no-argument wrapper for its existing geometry/transition-cleanup
callers; do not route mobile lifecycle through the new desktop focus-disposition API.

- [ ] Attach the Escape handler to the card root so events from the trigger or either choice share
      one route.
- [ ] Remove Escape handling from `use-card-keyboard-handler.ts`.
- [ ] Remove global Escape dispatch from `use-keyboard-mode-tracker.ts`, then remove the unused
      `ESCAPE` event and reducer case from `interaction-state.ts`.
- [ ] Do not change mobile close, mobile keyboard handoff, or GNB listeners.

### Green verification

- [ ] Re-run the Unit 2 command and require all selected tests to pass.
- [ ] Verify the only card Escape branch is the card-root handler:

```bash
rg -n "event\\.key === 'Escape'|type: 'ESCAPE'" \
  src/features/landing/model \
  src/features/landing/grid
```

Expected: one Wave 11 card-root Escape branch and no reducer/global `ESCAPE` dispatch.
- [ ] Verify no GNB file changed:

```bash
git diff --name-only -- src/features/gnb
```

Expected: no output.
- [ ] Run `git diff --check`.

## 10. Unit 3 - W11-LI-03 ARIA Ownership and Stable Relationships

### Contract

Implement analysis §6.3 A, §6.4 A, §4.5 naming guidance, D3, and BQ-26:

- Desktop/Tablet available Test trigger owns `aria-expanded`.
- `aria-expanded` follows logical interactivity, not visual persistence:
  `false -> true -> false` at the start of closing. `opening`, `steady`, and `handoff-target` are
  true; `idle`, `closing`, `cleanup-pending`, and `handoff-source` are false.
- The Test trigger name is the locale title as a single-value `aria-label`; it must remain
  byte-identical through idle/opening/steady/closing.
- The always-mounted desktop stage `aria-hidden` follows the same logical disclosure predicate as
  `aria-expanded`. Optional `aria-controls` is omitted.
- Blog remains the title-labelled whole-card link and receives no `aria-expanded`.
- Unavailable keeps one semantic owner: the button has `aria-labelledby` to title,
  `aria-describedby` to coming-soon, `aria-disabled="true"`, and `tabIndex=-1`; the root no longer
  duplicates `aria-disabled`.
- Tags use native unnamed-list semantics with no `aria-label`.
- No live region, hidden announcement string, or new message key.
- Mobile lifecycle ARIA behavior is not redesigned. Existing mobile naming remains intact.

### Red tests first

- [ ] Extend `tests/unit/landing-card-contract.test.ts` with failing DOM contracts:
  - Test trigger accessible name remains byte-identical to `card.title` across expand/Escape/close.
  - Desktop Test trigger has `aria-expanded="false"` at idle, `"true"` at
    opening/steady/handoff-target, and `"false"` at closing/cleanup/handoff-source.
  - The always-mounted `data-slot="desktopStage"` is AT-exposed while logically expanded and hidden
    while logically closed; Test omits `aria-controls`.
  - Blog keeps its title label and has no `aria-expanded`/`aria-controls`.
  - Unavailable root has no `aria-disabled`; button owns disabled state/name/description.
  - The coming-soon description id resolves to the public, non-`aria-hidden` status chip.
  - `[data-slot="tags"]` has no `aria-label`.
  - No `aria-live` exists.
- [ ] Add `assertion:W11-keyboard LI-03` Playwright cases:
  - Test `aria-expanded` false/true/false through focus and Escape;
  - iterate the exported `locales` list and compare Test/Blog/Unavailable accessible names against
    `resolveLandingCatalog(locale)`; compare the unavailable accessible description against the
    localized public coming-soon text in all 12 locales;
  - in the same locale loop, assert Test owns disclosure state, Blog omits disclosure state, and
    Unavailable keeps `aria-disabled="true"` plus `tabIndex=-1`;
  - unavailable Enter/Space is blocked after programmatic focus and remains `tabIndex=-1`;
  - hidden suffix, probe, and Blog CTA remain absent from focus/AT navigation;
  - initial and desktop-expanded Test states are axe-clean.
- [ ] Run the red command:

```bash
npm test -- tests/unit/landing-card-contract.test.ts
npx playwright test \
  tests/e2e/a11y-smoke.spec.ts \
  tests/e2e/state-smoke.spec.ts \
  --grep "assertion:W11-keyboard.*LI-03"
```

Expected red: Test lacks disclosure relationships, names can change with descendants, root disabled
state is duplicated, and tags retain the English label.

### Minimal implementation

- [ ] Create stable per-card ids from React's stable id mechanism, with explicit suffixes for title
      and status. Use one `useId()` base per card render; do not derive ids from localized text.
- [ ] Thread `titleId` through `NormalCardFace` -> `NormalCardTitle` and attach it to the single
      visible Normal title node used by Desktop/Tablet. Preserve the existing mobile expanded naming
      path; do not restructure mobile lifecycle.
- [ ] Thread `statusId` through `NormalCardFace` -> `NormalCardTagRow` and attach it only to the
      unavailable coming-soon chip.
- [ ] Keep the desktop stage always mounted. Its `aria-hidden` follows
      `isDesktopShellLogicallyInteractive`; do not add `aria-controls`.
- [ ] Compute Desktop/Tablet Test disclosure state from
      `isDesktopShellLogicallyInteractive(desktopStagePhase)`.
- [ ] Apply to the Test trigger:

```tsx
aria-label={card.title}
aria-expanded={!isMobileViewport ? desktopLogicalExpanded : undefined}
```

- [ ] Keep the Test name as the same title-only `aria-label` on Mobile; do not redesign Mobile
      lifecycle state.
- [ ] Keep Blog's current title label and omit disclosure attributes.
- [ ] Apply unavailable `aria-labelledby`, `aria-describedby`, `aria-disabled`, and `tabIndex=-1`
      to the button only.
- [ ] Remove root `aria-disabled` and remove `aria-label="Card tags"`.
- [ ] Do not add `role`, native `disabled`, `aria-live`, or new localized copy.

### Green verification

- [ ] Re-run the Unit 3 command and require all selected tests to pass.
- [ ] Verify no message catalog changed:

```bash
git diff --name-only -- src/messages
```

Expected: no output.
- [ ] Run `git diff --check`.

## 11. Unit 4 - W11-LI-04 Scoped Expanded Focus-Visible Ring

### Contract

- Expanded Test keyboard focus uses a 2px `#5C8E78` outline with 2px offset.
- The ring follows the visible expanded surface/card-shell boundary.
- No expanded selector references `--focus-ring-outer` or `--focus-ring-inner`.
- No `globals.css` or global token value changes.
- The ring does not change shell geometry, BQ-24 floor, Wave 10 scale, or horizontal overflow.

### Red tests first

- [ ] Extend `tests/unit/landing-card-contract.test.ts` with a `readFileSync` of
      `landing-grid-card.module.css`, then add a failing source contract that requires the expanded
      focus-visible selector to consume `var(--normal-focus-ring)`, `2px`, and
      `outline-offset: 2px`, while rejecting `--focus-ring-outer` and `--focus-ring-inner` from that
      selector. Keep this separate from the static DOM renderer.

```ts
const cardCss = readFileSync(
  new URL('../../src/features/landing/grid/landing-grid-card.module.css', import.meta.url),
  'utf8'
);
```
- [ ] Add `assertion:W11-keyboard LI-04` computed-style coverage:
  - focus choice A in expanded Test;
  - read the expanded surface `outlineWidth`, `outlineStyle`, `outlineColor`, and `outlineOffset`;
  - require `2px`, `solid`, `rgb(92, 142, 120)`, and `2px`;
  - require the surface rectangle expanded by outline width + offset to remain inside the desktop
    stage bleed rectangle so the ring is not clipped;
  - require stage/surface/grid/container/document horizontal overflow `0px`;
  - run once with normal motion and once with reduced motion.
- [ ] Run the red command:

```bash
npm test -- tests/unit/landing-card-contract.test.ts
npx playwright test \
  tests/e2e/state-smoke.spec.ts \
  --grep "assertion:W11-keyboard.*LI-04"
```

Expected red: expanded focus still uses the legacy global blue-derived ring variables.

### Minimal implementation

- [ ] Keep `--normal-focus-ring: #5c8e78` as the card-scoped value.
- [ ] Replace only the expanded-surface focus-visible rule with:

```css
.root.desktopOverlayLayer:has(:focus-visible) .expandedSurface {
  outline: 2px solid var(--normal-focus-ring);
  outline-offset: 2px;
}
```

- [ ] Remove the legacy focus-only `--focus-ring-outer` / `--focus-ring-inner` box-shadow layers.
      Preserve the non-focus expanded border/shadow outside the focus-specific rule.
- [ ] Do not change stage inset, clip, scale, transform origin, or global tokens.

### Green verification

- [ ] Re-run the Unit 4 command and require all selected tests to pass.
- [ ] Verify the forbidden global file is unchanged:

```bash
git diff --name-only -- src/app/globals.css
```

Expected: no output.
- [ ] Run `git diff --check`.

## 12. Unit 5 - SSOT Re-anchor and BQ-33

Begin this unit only after Units 1-4 are green.

### 12.1 `docs/req-landing.md`

- [ ] **§7.6:** limit this Wave 11 override to Desktop/Tablet; Test focus expands immediately
      independent of pointer capability; Blog whole-card link focus never expands; unavailable is
      skipped; keyboard handoff separates enterable from expandable; Test Enter/Space is idempotent
      `CARD_EXPAND`; Test entry remains A/B-only; Test-to-Test preserves source `0ms`/target standard
      motion while Test-to-Blog is standard Test close plus Blog focus-only.
- [ ] **§8.2:** add pending pointer-intent cancellation for keyboard focus, zero keyboard dwell, and
      explicit Blog non-expandability while preserving pointer hover delays.
- [ ] **§8.3:** require the shared controller close primitive for Escape and true focus-out; use
      `collapse` for Escape/outside/Blog destination, preserve `handoff` for a pre-applied
      Test-to-Test transfer, and make source blur idempotent; define logical close at closing start;
      keep the visual shell for reverse motion and BQ-24 cleanup.
- [ ] **§9.1:** replace the card-specific browse-neutral Escape result with D1
      Escape-to-Test-trigger; state that an open higher-priority overlay consumes the first Escape;
      define focus-out as close-without-reclaim; define trigger/choice internal movement as
      inside-card; prohibit focus trap.
- [ ] **§9.2:** define Test-trigger disclosure ownership and relationships; define button-only
      unavailable ownership and remove root disabled duplication; preserve BQ-26.
- [ ] **§9.3:** define title + coming-soon relationship; preserve public status and unnamed native
      tags list; preserve Blog decorative CTA exclusion.
- [ ] **§14.2:** expand the existing Keyboard/A11y blocker item rather than creating a new number.
      Include immediate focus expansion, pending-intent cancellation, Blog non-expansion, D1/D2/D3,
      closing noninteractivity, no trap, all-locale names/states, and desktop-expanded axe.

### 12.2 `docs/design/design.md`

- [ ] **§6.9:** state 2px sage outline + 2px offset for card-shell and expanded-surface
      `:focus-visible`.
- [ ] **§7.2:** visual placement for Normal Test focus ring.
- [ ] **§7.3:** visual placement for Expanded Test focus ring.
- [ ] **§7.4:** visual placement for the Blog whole-card link.
- [ ] **§7.5:** visual treatment remains perceptible on unavailable surface, without implying it is
      keyboard-focusable.
- [ ] Add no behavior, ARIA, focus disposition, lifecycle, QA, routing, or telemetry authority.

### 12.3 `docs/decision-register.md`

- [ ] Add BQ-33 as the next decision row. Its decision text must capture:

> Wave 11 Desktop/Tablet keyboard-a11y uses one immediate card-aware focus command and one
> controller-owned close command. Test focus cancels pointer intent and expands independent of
> hover capability; Blog is enterable but never expandable; Test-trigger Enter/Space remains
> idempotent `CARD_EXPAND` and Test entry remains A/B-only. Escape from the Test trigger or either
> choice closes once through the standard lifecycle and returns focus to the Test trigger,
> superseding the card-specific `req-landing §9.1` browse-neutral wording; true focus-out closes
> without reclaiming focus. Queued Test-to-Test handoff preserves source `0ms`/target standard
> motion and a later source blur is idempotent; Test-to-Blog uses standard Test close plus Blog
> focus-only. An open higher-priority GNB dialog consumes Escape before the card without changing
> GNB internals. Test owns `aria-expanded`; the title-only name is cycle-stable, stage
> `aria-hidden` follows logical disclosure, and optional `aria-controls` is omitted;
> unavailable keeps button-only disabled/name/status ownership with `tabIndex=-1`; the hard-coded
> tags `aria-label` is removed in favor of native list semantics; no live region or new i18n key is
> added. Closing controls become noninteractive at closing start while reverse motion and BQ-24
> geometry persist. Expanded focus-visible uses the scoped 2px sage ring with 2px offset.

- [ ] BQ-33 implementation impact must name the controller/keyboard/card/CSS/test surfaces and the
      §§7.6/8.2/8.3/9.1-9.3/14.2 re-anchor.
- [ ] BQ-33 notes must retain BQ-12/21/24/25/26, Wave 10, BQ-07, Wave 13, Wave 15, and Wave 16
      boundaries.

### 12.4 Plan outcome record

- [ ] Update this plan's status only after all completion conditions pass.
- [ ] Record actual changed files, red evidence, green evidence, command results, and any approved
      divergence. Do not claim roadmap completion.

### Unit 5 verification

```bash
rg -n "BQ-33|Escape|aria-expanded|Card tags|focus-visible" \
  docs/decision-register.md \
  docs/req-landing.md \
  docs/design/design.md
git diff --check
```

Review the matches against Unit 5; a textual match alone is not a pass. Machine QA runs only after
the Basic Gates in §13.4. Do not edit QA scripts unless a separate user approval expands scope.

## 13. Non-Baseline Validation Matrix

Final validation runs in the order below. Per-unit RED/GREEN commands still run inside Units 1-4;
this section is the final proof after implementation and SSOT re-anchor.

### 13.1 Full basic gates in repository order

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

All four must pass with zero errors before scope-specific validation starts.

### 13.2 Focused unit evidence

```bash
npm test -- \
  tests/unit/landing-interaction-state.test.ts \
  tests/unit/landing-interaction-dom.test.ts \
  tests/unit/landing-desktop-shell-phase.test.ts \
  tests/unit/landing-interaction-controller-handlers.test.ts \
  tests/unit/landing-card-contract.test.ts
```

### 13.3 Focused Wave 11 E2E gate

```bash
PLAYWRIGHT_SERVER_MODE=preview npx playwright test \
  tests/e2e/a11y-smoke.spec.ts \
  tests/e2e/state-smoke.spec.ts \
  --grep "assertion:W11-keyboard" \
  --workers=1
```

Do not run unfiltered `tests/e2e/state-smoke.spec.ts` as focused Wave 11 proof while the BQ-07
`expanded-focus-shell.png` baseline debt remains. Every new non-snapshot case must contain the exact
`assertion:W11-keyboard` marker.

### 13.4 Relevant static checks

```bash
node scripts/qa/check-phase4-grid-contracts.mjs
node scripts/qa/check-phase5-card-contracts.mjs
node scripts/qa/check-phase6-spacing-contracts.mjs
node scripts/qa/check-phase7-state-contracts.mjs
node scripts/qa/check-phase8-accessibility-contracts.mjs
node scripts/qa/check-phase9-performance-contracts.mjs
node scripts/qa/check-phase10-transition-contracts.mjs
```

All applicable landing checks must be executed because `AGENTS.md` routes landing changes through
the complete Phase 4-10 static set. Phase 9's separately owned stale
`desktopShellInlineScale` matcher is not a Wave 11 edit target: do not restore dead props or edit the
checker to manufacture green. If the user-owned prerequisite reconciliation has not already removed
that debt and Phase 9 still fails for the recorded matcher, Wave 11 cannot be marked complete; record
the exact failure and stop for separate authorization.

### 13.5 Forbidden-path and artifact audit

```bash
git diff --name-only -- \
  src/features/gnb \
  src/features/transition \
  src/features/telemetry \
  src/features/landing/storage \
  src/features/test \
  src/features/variant-registry \
  src/i18n \
  src/lib/routes \
  src/messages \
  src/app/globals.css \
  package.json \
  next.config.ts \
  playwright.config.ts \
  tests/e2e/theme-matrix-manifest.json \
  docs/blocker-traceability.json \
  .planning/STATE.md \
  docs/wave-roadmap.md
git diff --name-only -- 'tests/e2e/*-snapshots/**'
git diff --check
```

Also rerun the Unit 0 sorted SHA-256 inventory for `tests/e2e/*-snapshots/` and compare it byte for
byte with the pre-implementation record. Expected: both `git diff --name-only` commands print
nothing, the checksum inventory is identical, and `git diff --check` passes.

### 13.6 Keyboard matrix

Execute every row under:

1. Desktop normal motion.
2. Desktop `prefers-reduced-motion: reduce`.

| Surface | Tab | Shift+Tab | Enter | Space | Escape |
|---|---|---|---|---|---|
| Test trigger | Focus expands immediately with no URL/transition/ingress/telemetry/entry | Prior visual/source target is deterministic; first card exits to GNB | Idempotent `CARD_EXPAND`; no entry/focus move/toggle | Idempotent `CARD_EXPAND`; no entry/focus move/toggle | One close lifecycle; focus ends on same Test trigger |
| Test choice A | Moves to B | Returns to trigger without closing | Enters through A only | Enters through A only | One close lifecycle; focus returns to Test trigger |
| Test choice B | Moves to next enterable card or exits grid at final edge; prior Test closes | Returns to A | Enters through B only | Enters through B only | One close lifecycle; focus returns to Test trigger |
| Blog link | Focus only; no Expanded state | Reverse order preserved; no prior Test leak | Native direct Blog navigation | No navigation | No card state leak; Blog remains focused unless normal browser behavior moves it |
| Unavailable button | Skipped | Skipped | Blocked when programmatically targeted | Blocked when programmatically targeted | No-op; status remains exposed |

Additionally run the immediate-focus subset at Tablet width and at Desktop `hover:none`; these
capability rows do not replace the full Desktop normal/reduced-motion matrix.

### 13.7 Required assertions

- Focus-expand has no dwell and cancels pending pointer intent.
- Test to Blog and Blog to Test handoff never assigns Blog as `expandedCardVariant`, opening target,
  or active geometry target.
- Focus alone causes no URL change, transition start, ingress write, telemetry emission, or entry.
- One Escape produces one close command, one `collapse` reason, one closing/cleanup sequence, and one
  baseline release.
- A queued Test-to-Test handoff remains `handoff-source -> handoff-target` and a later source blur
  does not issue a second close or collapse the target.
- Test-to-Blog closes Test with standard closing motion, keeps Blog focus-only, and never assigns
  Blog as an expanded/opening/geometry target.
- With the desktop settings dialog open, first Escape closes only settings and second Escape closes
  the card; no GNB source file changes.
- Escape returns focus to the Test trigger from the trigger, choice A, and choice B.
- True focus-out closes without stealing destination focus.
- Trigger to choice and choice to choice are inside-card moves, not focus-out.
- Closing/cleanup controls immediately leave tab and activation order while reverse motion and
  BQ-24 geometry remain.
- No focus trap exists at first/last card edges.
- Test trigger owns `aria-expanded` and follows `false -> true -> false`.
- Test omits optional `aria-controls`; the always-mounted desktop stage follows logical
  `aria-hidden` state and exposes question/choices while expanded.
- Stable names/descriptions/states pass across all 12 locales.
- Blog link remains title-labelled and receives no disclosure state.
- Unavailable remains title + coming-soon description + `aria-disabled` + `tabIndex=-1`, with the
  button as the single semantic owner.
- Tags retain native list semantics with no hard-coded group label.
- Hidden suffix, probe, and Blog CTA stay absent from focus/AT navigation.
- Initial landing and desktop-expanded Test are axe-clean.
- Wave 10 Desktop `1.10`, Tablet `1.04`, reduced-motion `1.00`, BQ-24 floor/spacer,
  `surfaceMinHeight === '0px'`, title continuity, baseline order, and zero overflow remain intact.

## 14. Completion Conditions / Proof Obligations

Wave 11 implementation is complete only when all conditions below are true:

- [ ] Units 0-5 executed sequentially with red evidence before production changes in Units 1-4.
- [ ] No parallel agent or automated pipeline was used.
- [ ] All files changed are listed in §4 and every changed line traces to an approved LI or SSOT
      re-anchor.
- [ ] D1, D2, and D3 are implemented exactly.
- [ ] The full normal/reduced-motion keyboard matrix passes.
- [ ] Every assertion in §13.7 passes.
- [ ] Focused unit and `assertion:W11-keyboard` E2E gates pass.
- [ ] Basic gates pass in the exact repository order.
- [ ] Phase 4-10 static checks were all executed and pass. A still-failing separately owned Phase 9
      matcher blocks completion and is reported without an out-of-scope fix.
- [ ] No snapshot or baseline file changed.
- [ ] No forbidden runtime/authority surface changed.
- [ ] `docs/req-landing.md`, `docs/design/design.md`, and `docs/decision-register.md` are re-anchored
      exactly as Unit 5 specifies.
- [ ] This plan records the actual implementation outcome.
- [ ] `git diff --check` passes.

## 15. Do-Not-Regress

Carry verbatim:

- storage/transition persistence and scroll restore
- telemetry consent/payload/ordering
- routing/Blog direct navigation/typed routes
- transition runtime/handshake
- resolver and generated registry
- test entry and pre-answer ownership
- BQ-24 floor + spacer
- BQ-25 arrow
- BQ-26 unavailable model
- Wave 10 expansion/tag/rhythm outcomes
- BQ-07 baselines
- BQ-04/BQ-21 no global token/`globals.css`

Additional concrete anchors:

- Preserve `surfaceMinHeight === '0px'` and the separate `RestingFloorMap`.
- Preserve `BASELINE_READY -> BASELINE_FROZEN -> BASELINE_READY`.
- Preserve Desktop desired `1.10`, Tablet `1.04`, and reduced-motion `1.00`.
- Preserve title first-line continuity and closing/cleanup/handoff phases.
- Preserve hidden tag suffix unmounting and `aria-hidden` + `inert` probe semantics.
- Preserve Blog CTA as `aria-hidden`, non-interactive, and inside the sole whole-card link.
- Preserve unavailable as AT-exposed but keyboard-skipped.

## 16. Forbidden Changes and Commands

- No direct Test entry from the trigger.
- No Blog routing, whole-card-link, Enter, or Space behavior change.
- No making unavailable keyboard-focusable.
- No Mobile lifecycle a11y change.
- No GNB internal change.
- No `src/app/globals.css` or global token promotion.
- No snapshot/baseline regeneration.
- No `qa:visual:full`.
- No `--update-snapshots`.
- No transition, telemetry, storage, routing, resolver, generated-registry, test-entry, or
  pre-answer change.
- No new package.
- No build/deployment configuration change.
- No file deletion.
- No roadmap or STATE edit.
- No commit, push, checkpoint, merge, reset, revert, or branch manipulation without separate
  explicit authorization.

## 17. Approval Gate

The user explicitly approved this BQ-19 implementation plan and W11-LI-01..04 on 2026-06-15, with
A1-A8 as binding amendments. Authorization remained limited to the recorded files and validation
scope; no GNB/mobile/global-token/baseline expansion was used.

## 18. Implementation Outcome (2026-06-15)

### 18.1 Amendment result

- **A1:** Verified the real settings panel as a non-hidden `div[role="dialog"]` under `header`,
  without `aria-modal` and without a focus trap. Implemented the document-wide safety predicate
  `[role="dialog"]:not([hidden])`; first Escape closes settings, second closes the Test card.
- **A2:** Chose the title-only `aria-label={card.title}` path. The computed name is byte-identical
  across idle → opening → steady → closing in all 12 locales.
- **A3:** Omitted optional `aria-controls`. The always-mounted desktop stage `aria-hidden` follows
  logical disclosure, and expanded question/A/B are AT-exposed and axe-clean.
- **A4:** Escape from A/B focuses the Test trigger synchronously before collapse and queues the same
  trigger after dispatch. The observed sequence never leaves focus in hidden/inert content.
- **A5:** Both card-root `onKeyDown` and `onBlur` are Desktop/Tablet-only; mobile-state no-op tests
  cover both branches.
- **A6:** Repository search found no `ESCAPE` consumer beyond the global dispatch and landing
  reducer case, so both were removed.
- **A7:** Null `relatedTarget` during document/window focus loss preserves disclosure; only a true
  in-page focus-out closes.
- **A8:** `idle`, `handoff-source`, and `handoff-target` were existing shell phases. The logical
  interactivity helper maps them without adding or renaming motion states.

### 18.2 Actual changed files

Runtime/style:
`desktop-shell-phase.ts`, `interaction-dom.ts`, `landing-card-interaction-bindings.ts`,
`landing-catalog-grid.tsx`, `landing-grid-card.tsx`, `landing-grid-card.module.css`,
`use-card-keyboard-handler.ts`, `use-hover-intent-controller.ts`, `use-keyboard-handoff.ts`,
`use-keyboard-mode-tracker.ts`, `use-landing-interaction-controller.ts`, and
`interaction-state.ts`.

Tests:
`a11y-smoke.spec.ts`, `state-smoke.spec.ts`, `landing-card-contract.test.ts`,
`landing-desktop-shell-phase.test.ts`, `landing-interaction-controller-handlers.test.ts`,
`landing-interaction-dom.test.ts`, and `landing-interaction-state.test.ts`.

SSOT/record:
`req-landing.md`, `design/design.md`, `decision-register.md`, and this plan.

### 18.3 TDD and validation evidence

- Unit 1 RED: 3/26 unit failures and 3/3 LI-01 E2E failures on missing classifier/immediate focus
  and stale pointer intent. GREEN: 26/26 unit and 3/3 E2E.
- Unit 2 RED: 10/45 unit failures and 3 expected LI-02 E2E failures; Blog/unavailable no-op already
  passed. GREEN: 45/45 unit and 4/4 E2E.
- Unit 3 RED: 1/14 unit failure and the all-locale name-stability E2E failure. GREEN: 14/14 unit and
  2/2 E2E.
- Unit 4 RED: 1/15 unit failure and computed `outline: 0px none`. GREEN: 15/15 unit and 1/1 E2E.
- Basic gates: lint PASS with zero warnings; typecheck PASS; full Vitest 74 files / 515 tests PASS;
  production build PASS.
- Focused units: 5 files / 62 tests PASS.
- Preview `assertion:W11-keyboard`: 10/10 PASS with one worker.
- Static checks: Phase 4, 5, 6, 7, 8, and 10 PASS. Phase 9 FAILS with
  `LandingGridCard must consume runtime reduced-motion and plan-derived shell geometry in
  component-owned style state.` The separately owned stale `desktopShellInlineScale` matcher was
  not fixed or worked around.
- Forbidden paths and snapshot diff: empty. Snapshot inventory: 177 files before/after with
  identical inventory SHA-256
  `9780a1d2b195add48f84829d4af22adb8731255f8f5f7f301c1f00c866117642`.
- `git diff --check`: PASS.

### 18.4 Divergences and status

- The approved plan recorded the old workspace path `/Users/woohyeon/Local/ViveTest`; execution
  used the user-provided workspace `/Users/b-m-2022001/Local/ViveTest`.
- A1 replaced the unverified header-coupled selector with the verified document-wide dialog
  predicate.
- A2/A3 replaced the pre-amendment `aria-labelledby` + `aria-controls` proposal with stable
  title-only `aria-label`, omitted `aria-controls`, and logical stage `aria-hidden`.
- The user explicitly authorized proceeding despite stale roadmap/STATE prerequisite text and
  prohibited editing either file.
- Implementation is present and all Wave 11 focused/basic evidence passes, but formal Wave 11
  completion is **not claimed** because Phase 9 remains red. No roadmap completion is recorded.
