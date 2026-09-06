# Wave 11 Desktop A11y / Keyboard Hardening — BQ-19 Step-1 Analysis

## 0. Gate and Startup Record

### Mode

- **Task mode:** Analysis Only + documentation.
- **BQ-19 gate:** Step 1 only. This document authorizes no implementation, no implementation plan,
  no candidate approval, and no authority-file edit.
- **Authorized change:** this analysis file only.
- **Commands intentionally not run:** tests, lint, typecheck, build, snapshots, baseline generation,
  commits, pushes, branch operations, checkpoint operations, and external network access.

### Repository startup

| Item | Evidence | Result |
|---|---|---|
| Working directory | `pwd` | `/Users/b-m-2022001/Local/ViveTest` |
| Branch | `git branch --show-current` | `main` |
| HEAD | `git rev-parse HEAD` | `e18c0c9f1df684ebd814d999bf640b92443c0f23` |
| Worktree | `git status --short --untracked-files=all` | `?? docs/plans/2026-06-11-wave-11-desktop-a11y-keyboard-analysis.md` |
| Pre-existing tracked diffs | `git diff --name-only` | none |
| Authorized live document | untracked-file audit | this analysis file already existed as the junior-agent result and is the only authorized edit |
| HEAD identity | `git log`, `git show` | `wave-10: landing grid height rhythm`; `HEAD`, `origin/main`, and `origin/HEAD` coincide |

### Wave 10 baseline status

**Evidence classification: not-satisfied for formal completion; satisfied for current implementation
baseline identity.**

- Current `main` is the Wave 10 implementation commit, and its commit message explicitly records the
  implemented grid rhythm, BQ-30/31/32 outcomes, tests, and documentation synchronization. This is
  therefore the runtime/code baseline used by this analysis.
- Formal completion cannot be confirmed from live authority. The roadmap overview and Wave 10 detail
  both still say `⬜ 미완료`, while Wave 11 requires Waves 4–10 complete
  (`docs/wave-roadmap.md:5-17`, `docs/wave-roadmap.md:420-438`).
- The roadmap also has a separate prerequisite inconsistency: its overview marks Wave 8 incomplete,
  while the Wave 8 detail records `✅ 완료` with implementation and validation evidence
  (`docs/wave-roadmap.md:14`, `docs/wave-roadmap.md:326-355`). Wave 10's prerequisite chain therefore
  cannot be judged from the overview alone.
- The live session-state document says runtime and scoped verification were implemented but final
  completion remained blocked by one stale screenshot baseline and one stale Phase 9 matcher; it
  explicitly says the roadmap was not advanced (`.planning/STATE.md:1-11`,
  `.planning/STATE.md:118-140`).
- The untracked analysis document does not supersede any authority file.

**Ruling for this analysis:** treat HEAD `e18c0c9` as the new Wave 10 implementation baseline, but do
not represent Waves 8/10 as authority-consistent or Wave 10 as formally complete. Wave 11
implementation readiness remains blocked until the roadmap/STATE prerequisite conflict is resolved
outside this task.

## 1. Scope

### In scope

1. Desktop/Tablet Test-card focus expansion through the existing desktop expansion path, with no
   hover-intent dwell.
2. Separation of focus from activation and destination entry.
3. Escape and focus-out close behavior, deterministic focus disposition, and no focus trap.
4. Accessible names/states for card triggers, expanded state, tags, Blog affordance, and unavailable
   status.
5. Existing desktop focus-visible treatment and keyboard-order evidence.
6. Non-baseline validation requirements for a later, separately approved implementation.

### Out of scope

- Mobile expanded shape/lifecycle a11y: Wave 13.
- GNB behavior or structure: Wave 15.
- Mobile menu: Wave 17.
- Global token migration or `src/app/globals.css`: Wave 16.
- Snapshot or visual-baseline generation: BQ-07.
- Transition, telemetry, storage, routing, resolver, generated registry, test-entry, or pre-answer
  behavior changes.

No mobile lifecycle, GNB, transition, telemetry, storage, route, registry, test-flow, CSS authority,
roadmap, design, requirement, test, or runtime file is changed by this analysis.

## 2. Authority and Precedence

The applicable order is:

1. `docs/decision-register.md`
2. `docs/req-landing.md` plus project rules
3. `docs/design/design.md` for visual treatment only
4. implementation and tests
5. mockup resources as visual reference only

Relevant authority:

- BQ-12 preserves resolver, telemetry, transition, registry, and test-route contracts, except only
  for separately approved BQ-19 logic improvements (`docs/decision-register.md:18`).
- BQ-19 requires this analysis and user approval before any implementation prompt
  (`docs/decision-register.md:24-26`, `docs/wave-roadmap.md:38-61`).
- BQ-21 keeps behavior/a11y authority in requirements and repo contracts; design owns visual intent
  only (`docs/decision-register.md:27`, `docs/agent-guides/project-rules.md:125-131`).
- BQ-24 keeps the explicit resting-pixel floor, separate floor state, single spacer, and zero-minimum
  surface contract (`docs/decision-register.md:30`).
- BQ-25 forbids choice-arrow optical nudging before Wave 16 (`docs/decision-register.md:31`).
- BQ-26 fixes unavailable as semantic `<button aria-disabled="true" tabindex="-1">`, AT-exposed but
  keyboard-skipped (`docs/decision-register.md:32`, `docs/req-landing.md:666-683`).
- Wave 10 fixes Desktop desired scale `1.10`, Tablet `1.04`, reduced-motion `1.00`, title continuity,
  BQ-32 suffix unmounting, and Blog CTA/status priority
  (`docs/decision-register.md:36-38`, `docs/req-landing.md:280-314`,
  `docs/req-landing.md:566-590`).

## 3. Locked Baseline Interpretation

- Test is the only desktop card type with an expanded preview. Blog has no expanded surface and uses
  its whole-card link for direct navigation (`docs/req-landing.md:259-275`,
  `docs/design/design.md:308-315`).
- Test entry remains owned by Expanded answer choices A/B, not by focus and not by the Normal trigger
  (`docs/req-landing.md:268-274`, `docs/req-landing.md:642-650`).
- Therefore, “Enter/Space for Test” cannot mean direct test entry. The current runtime treats it as
  an explicit Test-trigger expansion command, while actual entry still requires answer-choice
  activation. Direct entry would violate BQ-12 and is out of scope.
- Immediate focus expansion makes Test-trigger Enter/Space idempotent in the normal desktop keyboard
  path: by the time the trigger can be activated, focus has already opened the preview. Whether
  activation remains an idempotent disclosure command, toggles closed, or moves focus to choice A is
  a product/a11y decision not resolved by current authority. Direct test entry remains prohibited.
- Blog focus may reveal its visual `Read more →` affordance, but the affordance remains
  `aria-hidden`, non-interactive, and inside the sole whole-card link.
- Hidden tag suffixes stay unmounted; measurement probes stay `aria-hidden` and `inert`.
- `req-landing.md` is internally stale in two places that Wave 11 must re-anchor rather than blindly
  implement: §7.6 says the override applies to all viewports and names a Blog CTA as an internal
  focus target, while the approved Wave 11 scope defers Mobile and the live Blog CTA is deliberately
  non-interactive (`docs/req-landing.md:471-483`, `docs/wave-roadmap.md:432-440`,
  `docs/req-landing.md:262-274`).
- Escape focus disposition is also unresolved: §9.1 requires a focusless browse-neutral result,
  while this task asks for deterministic focus return. The analysis may compare options, but cannot
  silently replace the live SSOT (`docs/req-landing.md:658-664`).

## 4. Evidence Audit

Evidence grades:

- **satisfied:** source and existing coverage directly prove the claim.
- **unproven:** source suggests the behavior, but the requested matrix or edge condition is not
  directly covered.
- **not-satisfied:** the requested behavior/state is absent or contradicted by current source.

### 4.1 Current focus and keyboard model by card type

#### Test

| Claim | Grade | Evidence |
|---|---|---|
| Normal trigger is keyboard-focusable | satisfied | Controller resolves enterable neutral cards to `tabIndex=0`; the card renders a semantic `<button>` (`src/features/landing/model/interaction-state.ts:484-503`, `src/features/landing/grid/landing-grid-card.tsx:1140-1154`). |
| Focus lands on the whole-card trigger | satisfied | Landing entry and handoff target `[data-testid="landing-grid-card-trigger"]`; first forward Tab is redirected to the first enterable card (`src/features/landing/grid/interaction-dom.ts:57-69`, `src/features/landing/grid/use-keyboard-mode-tracker.ts:28-48`). |
| Focus immediately expands in hover-capable desktop | satisfied | `onFocus` dispatches `CARD_FOCUS`; in `interactionMode='hover'`, available focus assigns `expandedCardVariant` immediately, without the hover timer (`src/features/landing/grid/use-card-keyboard-handler.ts:198-211`, `src/features/landing/model/interaction-state.ts:279-305`). Existing E2E proves focused Test becomes expanded (`tests/e2e/state-smoke.spec.ts:230-263`). |
| Focus expands on every desktop keyboard-capable environment | not-satisfied | The reducer expands on focus only when `interactionMode==='hover'`; desktop tap fallback preserves the previous expanded variant instead (`src/features/landing/model/interaction-state.ts:284-297`). The capability gate explicitly permits `width>=768` tap mode when hover capability is absent (`docs/req-landing.md:510-515`). |
| Trigger focus itself enters the test | satisfied as no-entry | Focus only changes card state. Test transition is invoked only from answer-choice selection (`src/features/landing/grid/use-landing-interaction-controller.ts:401-415`). |
| Enter/Space on Normal Test trigger directly enters the test | not-satisfied by design, and must remain so | Enter/Space dispatches `CARD_EXPAND`; it does not call the transition callback (`src/features/landing/grid/use-card-keyboard-handler.ts:309-331`). Direct entry here would conflict with the locked A/B entry contract. |
| Enter/Space has a distinct desktop action after focus expansion | not-satisfied / decision required | Immediate focus already sets the same expanded variant, and Enter/Space dispatches the same `CARD_EXPAND` again. The current action is therefore idempotent; no authority says whether activation should remain idempotent, toggle, or transfer focus into the preview (`src/features/landing/grid/use-card-keyboard-handler.ts:198-211`, `src/features/landing/grid/use-card-keyboard-handler.ts:309-331`). |

#### Blog

| Claim | Grade | Evidence |
|---|---|---|
| Whole card is one focusable link | satisfied | Blog renders `Link` with localized href and `aria-label={card.title}` (`src/features/landing/grid/landing-grid-card.tsx:1123-1138`). |
| Focus does not navigate | satisfied | Blog `onFocus` collapses prior Test expansion and records non-expanding focus only (`src/features/landing/grid/use-card-keyboard-handler.ts:173-195`). |
| Focus does not create an Expanded surface | satisfied | Blog is forced to Normal and does not render desktop Expanded (`src/features/landing/grid/landing-grid-card.tsx:925-936`). E2E confirms no Expanded body on focus (`tests/e2e/grid-smoke.spec.ts:886-930`). |
| Enter navigates; Space does not | satisfied | Native link semantics are preserved; E2E verifies Space stays on landing and Enter reaches the article (`tests/e2e/a11y-smoke.spec.ts:210-227`). |
| Visual CTA is a second control | satisfied as absent | `Read more →` is a span with `aria-hidden="true"` and no nested focusable element (`src/features/landing/grid/landing-grid-card.tsx:471-489`; `tests/e2e/a11y-smoke.spec.ts:250-255`). |
| Keyboard handoff can never put Blog into expanded interaction state | not-satisfied | `queueCardHandoff` classifies the target only by enterability, dispatches `CARD_FOCUS available:true`, and queues focus. For a Blog target this can transiently set `expandedCardVariant` before the Blog `onFocus` special case collapses it two frames later. Rendering masks the surface, but state/motion/geometry ownership still observes the wrong capability (`src/features/landing/grid/use-card-keyboard-handler.ts:81-106`, `src/features/landing/grid/use-card-keyboard-handler.ts:173-195`, `src/features/landing/model/interaction-state.ts:279-305`). |

#### Unavailable

| Claim | Grade | Evidence |
|---|---|---|
| Semantic disabled model is preserved | satisfied | Trigger is a `<button>`, receives `aria-disabled="true"`, and is not native-disabled (`src/features/landing/grid/landing-grid-card.tsx:1140-1154`; `tests/unit/landing-card-contract.test.ts:216-257`). |
| Keyboard skips it | satisfied | `resolveCardTabIndex` returns `-1` before all hover-lock branches; E2E sweeps the grid and never focuses it (`src/features/landing/model/interaction-state.ts:484-503`; `tests/e2e/a11y-smoke.spec.ts:118-156`). |
| AT can perceive status | satisfied at DOM/axe level | `coming soon` is mounted in the public tags row and is not under `aria-hidden`; the trigger remains in the accessibility tree (`src/features/landing/grid/landing-grid-card.tsx:426-468`; `tests/e2e/a11y-smoke.spec.ts:257-262`). |
| Programmatic focus expands or enters | satisfied as no-op | Non-enterable focus dispatches `available:false`, clears prior hover lock, and does not expand (`src/features/landing/grid/use-card-keyboard-handler.ts:198-211`, `src/features/landing/model/interaction-state.ts:284-304`). |
| Disabled state has one semantic owner | unproven | `aria-disabled` is placed on both the card root and the primary button. The button is the required semantic owner; no accessibility snapshot proves the root-level duplicate adds value or avoids repeated state (`src/features/landing/grid/landing-grid-card.tsx:1100-1101`, `src/features/landing/grid/landing-grid-card.tsx:1140-1154`). |

### 4.2 Expansion integration

| Claim | Grade | Evidence |
|---|---|---|
| Hover expansion uses one intent timer/token | satisfied | Hover schedules `CARD_EXPAND` after `160ms`, validates the latest token/target, and uses a `140ms` collapse delay (`src/features/landing/grid/hover-intent.ts:1-19`, `src/features/landing/grid/use-hover-intent-controller.ts:116-136`, `src/features/landing/grid/use-hover-intent-controller.ts:205-260`). |
| Keyboard focus bypasses hover dwell | satisfied in current hover mode | Focus dispatches synchronously and does not call `scheduleHoverIntent` (`src/features/landing/grid/use-card-keyboard-handler.ts:198-211`). |
| Focus uses the same state, desktop motion, shell, geometry, and title path | satisfied | Focus sets the same `expandedCardVariant`; desktop motion derives opening/steady/closing from that state; `activeVisualCardVariant` drives floor/baseline geometry; card rendering uses the same title split and shell (`src/features/landing/grid/use-landing-interaction-controller.ts:292-306`, `src/features/landing/grid/use-landing-interaction-controller.ts:510-515`, `src/features/landing/grid/use-grid-geometry-controller.ts:378-405`, `src/features/landing/grid/landing-grid-card.tsx:944-967`, `src/features/landing/grid/landing-grid-card.tsx:1157-1170`). |
| Focus and hover cannot race through two pending sources | unproven | Focus does not clear a pending hover-intent timer. Both routes converge on the reducer, but a pointer timer can remain live while keyboard focus dispatches separately (`src/features/landing/grid/use-hover-intent-controller.ts:64-83`, `src/features/landing/grid/use-card-keyboard-handler.ts:173-211`). No test covers pointer dwell interrupted by Tab. |
| A stale pointer timer cannot override the keyboard target | not-satisfied | If pointer dwell is pending on card A and focus moves to card B, focus does not invalidate the timer token or pointer target. The timer may still dispatch `CARD_EXPAND` for A after B receives focus (`src/features/landing/grid/use-hover-intent-controller.ts:116-135`, `src/features/landing/grid/use-hover-intent-controller.ts:205-223`, `src/features/landing/grid/use-card-keyboard-handler.ts:198-211`). |
| Enterable and expandable capability are separated | not-satisfied | Blog is enterable but not expandable. The keyboard handoff path receives only `isCardEnterableByVariant`, so its pre-focus dispatch can treat Blog as an expansion target. Wave 11 needs an explicit expandability decision or a card-aware focus command, not another Blog-only rendering guard (`src/features/landing/grid/use-keyboard-handoff.ts:22-35`, `src/features/landing/grid/use-card-keyboard-handler.ts:81-106`). |
| BQ-24 freeze/release order remains shared | satisfied | Active visual state freezes rows through the existing baseline reducer and releases after close; the floor map stays separate (`src/features/landing/grid/use-grid-geometry-controller.ts:63-83`, `src/features/landing/grid/use-grid-geometry-controller.ts:378-405`, `src/features/landing/grid/baseline-manager.ts:22-46`). |
| Wave 10 scale applies to focus expansion | satisfied by shared rendering; keyboard-specific matrix unproven | The card always resolves Desktop desired scale through the shared scale hook; reduced motion synchronously resolves `1.00` (`src/features/landing/grid/use-card-inline-geometry.ts:87-122`, `src/features/landing/grid/use-card-inline-geometry.ts:169-175`, `src/features/landing/grid/landing-grid-card.tsx:951-967`). Existing reduced-motion E2E uses hover, not focus (`tests/e2e/state-smoke.spec.ts:660-726`). |

### 4.3 Focus versus activation separation

| Claim | Grade | Evidence |
|---|---|---|
| Test focus only previews | satisfied in hover-capable desktop | Focus updates expansion state only; no transition callback is called. |
| Test trigger Enter/Space is explicit activation | satisfied as expansion activation | Enter/Space prevents default and dispatches `CARD_EXPAND` (`src/features/landing/grid/use-card-keyboard-handler.ts:309-331`). |
| Test trigger activation is meaningfully distinct from focus | not-satisfied / authority gap | On the intended desktop path focus already expands synchronously, so Enter/Space repeats the same state. The prompt's wording and the locked A/B entry rule do not define a second action. This must be resolved before an implementation plan; direct entry is not an admissible option. |
| Test entry remains explicit A/B activation | satisfied | Only `onAnswerChoiceSelect` calls `beginTestTransition` (`src/features/landing/grid/landing-catalog-grid.tsx:76-94`, `src/features/landing/grid/use-landing-interaction-controller.ts:401-415`). |
| Blog focus is non-navigation; Enter navigates | satisfied | Source and E2E directly prove the split (`src/features/landing/grid/use-card-keyboard-handler.ts:173-195`, `tests/e2e/a11y-smoke.spec.ts:210-227`). |
| Space on Blog remains non-navigation | satisfied | Handler intentionally leaves native link behavior unchanged, and the E2E asserts no navigation on Space (`src/features/landing/grid/use-card-keyboard-handler.ts:305-307`, `tests/e2e/a11y-smoke.spec.ts:221-226`). |

### 4.4 Escape, focus-out close, focus disposition, lifecycle

| Claim | Grade | Evidence |
|---|---|---|
| Escape has one authoritative close owner | not-satisfied | Window capture dispatches reducer `ESCAPE` for every Escape. Escape on the primary trigger then also reaches the React handler, which calls `collapseExpandedCard`; the same keystroke has two owners and two event types (`src/features/landing/grid/use-keyboard-mode-tracker.ts:28-48`, `src/features/landing/grid/use-card-keyboard-handler.ts:299-303`). |
| Escape from the trigger uses the standard close lifecycle | unproven | The local path clears hover work and sets desktop reason `collapse`, but the global capture dispatch occurs first. React/native batching may still settle correctly, yet no test proves one close transition, one cleanup, or one baseline release (`src/features/landing/grid/use-landing-interaction-controller.ts:253-269`). |
| Escape from answer A/B uses the standard close lifecycle | not-satisfied | The expanded-body handler only handles Tab. Escape is therefore global-only: it clears reducer state but does not clear the hover timer, set desktop transition reason to `collapse`, or run the shared close command. If the prior reason is `expand`/`handoff`, the motion controller takes its immediate-reset branch instead of the normal closing/cleanup branch (`src/features/landing/grid/use-card-keyboard-handler.ts:112-170`, `src/features/landing/grid/use-keyboard-mode-tracker.ts:43-48`, `src/features/landing/grid/use-desktop-motion-controller.ts:159-186`). |
| Escape from answer A/B has deterministic focus disposition | not-satisfied | Choices are siblings of the trigger. Global-only collapse can unmount the focused choice without focusing or blurring an approved target, leaving browser-dependent fallback focus (`src/features/landing/grid/landing-grid-card.tsx:795-867`, `src/features/landing/grid/landing-grid-card.tsx:1123-1170`). |
| Escape focus target is already decided by authority | not-satisfied / conflict | `req-landing` says focusless browse-neutral; this task asks for deterministic focus return. Same-trigger return is a defensible disclosure pattern, but it is not the current SSOT and cannot be selected by analysis alone (`docs/req-landing.md:658-664`). |
| Escape respects top-overlay precedence | unproven | The global card listener dispatches on every Escape and does not inspect whether GNB/settings or another top overlay consumed the key. GNB is out of Wave 11 scope, so any required cross-layer change is a blocking re-scope rather than an implicit edit. |
| Tab/Shift-Tab card handoff closes the prior card | satisfied for covered internal paths | The handler queues the next enterable trigger after `CARD_FOCUS`, and E2E proves forward/reverse handoff plus unavailable skip (`src/features/landing/grid/use-card-keyboard-handler.ts:81-106`, `src/features/landing/grid/use-card-keyboard-handler.ts:112-170`, `tests/e2e/state-smoke.spec.ts:230-336`). |
| Generic focus-out closes an expanded Test card | not-satisfied | Card interaction bindings expose `onFocus` and key handlers but no `onBlur`; card root has no focus-out close handler (`src/features/landing/grid/landing-card-interaction-bindings.ts:18-39`, `src/features/landing/grid/use-landing-interaction-controller.ts:485-507`). The only card-root `focusout` listener controls Blog CTA measurement visibility, not interaction state (`src/features/landing/grid/use-card-inline-geometry.ts:278-309`). |
| Focus-out does not steal focus back and create a trap | unproven | Covered Tab handoff moves forward, but there is no general outside-focus test, no last-card edge test, and no explicit no-trap assertion. |
| Closing content immediately leaves the keyboard order | not-satisfied | `isInteractive` is false only in `cleanup-pending`; during the 280ms `closing` phase the answer buttons remain enabled and tabbable. CSS disables pointer events on the surface but not keyboard focus (`src/features/landing/grid/landing-grid-card.tsx:1157-1169`, `src/features/landing/grid/landing-grid-card.tsx:637-664`, `src/features/landing/grid/landing-grid-card.module.css:173-183`). |
| Close remains in existing OPENING/OPEN/CLOSING/cleanup/handoff path | satisfied only when callers set the reason and use the shared command | Desktop close is derived from `expandedCardVariant` plus `desktopTransitionReasonRef`; global `ESCAPE` currently bypasses that contract (`src/features/landing/grid/use-desktop-motion-controller.ts:132-188`). |

**Decision gate for eventual implementation:** Escape and true focus-out need one shared close
command but different focus disposition. Focus-out must never reclaim focus from its destination.
Escape disposition must be explicitly chosen by the user after reconciling `req-landing`:

1. **Same-trigger return:** close, make the closing subtree non-tabbable immediately, then focus the
   same Test trigger. Strongest continuity, but changes the current browse-neutral wording.
2. **Browse-neutral blur:** close and explicitly blur to the document-level neutral target. Matches
   current wording, but is less conventional for a disclosure whose trigger remains mounted.
3. **Contextual:** leave focus on the trigger when Escape originates there, but return internal
   choice focus to the trigger. Deterministic and low-movement, but produces two postconditions and
   still requires an SSOT rewrite.

No option is approved by this analysis.

### 4.5 ARIA names and states

| Surface | Grade | Current evidence and gap |
|---|---|---|
| Test trigger name | not-satisfied for stability; unproven for actual output | Desktop Test has no explicit naming relationship. Collapsed name is composed from title/subtitle/tags; expanded rendering leaves only the title in the trigger and moves preview content to a sibling shell, so the trigger name can change on focus. No cross-locale computed-name assertion exists (`src/features/landing/grid/landing-grid-card.tsx:1022-1048`, `src/features/landing/grid/landing-grid-card.tsx:1140-1170`). |
| Blog trigger name | satisfied | Whole-card link uses `aria-label={card.title}`, so the decorative CTA does not alter the link name (`src/features/landing/grid/landing-grid-card.tsx:1123-1138`). |
| Unavailable trigger name/state | state satisfied; name unproven | `aria-disabled=true`, `tabIndex=-1`, semantic button, and public coming-soon text are present. The computed name/description is not asserted, and root + trigger both carry disabled state (`docs/req-landing.md:666-683`; `tests/e2e/a11y-smoke.spec.ts:118-156`). |
| Expanded state | not-satisfied | No landing card trigger has `aria-expanded`; no `aria-controls` relationship exists. Repository search finds these only on unrelated GNB controls. |
| Tags label | not-satisfied for localization | The list uses hard-coded English `aria-label="Card tags"` in all locales (`src/features/landing/grid/landing-grid-card.tsx:439-468`). |
| Blog CTA | satisfied | CTA is visual-only, `aria-hidden`, and contains no control or `tabindex` (`src/features/landing/grid/landing-grid-card.tsx:471-489`). |
| Unavailable status announcement | satisfied at static DOM level; exact relationship unproven | Coming-soon text is AT-exposed and the button remains semantic, but no explicit `aria-describedby`/`aria-labelledby` relationship or computed-name assertion proves a concise title + status result across locales. |
| Expanded question/choices | satisfied as native static content | The question is visible text and choices are semantic buttons whose decorative arrows are hidden (`src/features/landing/grid/landing-grid-card.tsx:637-664`, `src/features/landing/grid/landing-grid-card.tsx:705-738`). |
| Expanded preview announcement on open | unproven and not necessarily required | No live region exists. Static content becomes available in DOM and Tab reaches choices, but the trigger exposes no expanded state/relationship. A live region could duplicate announcements on hover and is not justified by current evidence. |
| `aria-controls` can target a stable owned node | satisfied as structurally feasible, not implemented | The desktop stage wrapper is always mounted while its contents are conditional, so it could own a stable id without keeping hidden preview controls in the tree. `aria-controls` remains optional; adding it to an unmounted body would create stale references (`src/features/landing/grid/landing-grid-card.tsx:815-865`, `src/features/landing/grid/landing-grid-card.tsx:1157-1170`). |
| `aria-expanded` can follow one unambiguous boolean | unproven | Reducer disclosure state becomes false before the visual closing shell unmounts, and closing choices currently stay tabbable. The implementation must define whether ARIA follows logical interactivity or visual persistence and then make the closing subtree consistent with that choice. |

**Naming mechanism note:** avoid a concatenated `aria-label` that manually joins title, status, and
state. Prefer stable element relationships where possible: title as `aria-labelledby`, coming-soon
as `aria-describedby`, and `aria-expanded` on the Test trigger. The tags group has two legitimate
options: localize its group name, or remove the unnecessary English group name and rely on native
list semantics. That product verbosity choice is not resolved here.

### 4.6 Focus visibility

| Claim | Grade | Evidence |
|---|---|---|
| Normal card focus ring exists | satisfied | Root `:has(:focus-visible)` draws a 2px `#5C8E78` outline with 2px offset (`src/features/landing/grid/landing-grid-card.module.css:1-49`). |
| Ring is keyboard-specific | satisfied | Styling is driven by `:focus-visible`, not plain `:focus` (`src/features/landing/grid/landing-grid-card.module.css:43-49`). |
| Ring meets non-text 3:1 contrast on current light card surfaces | satisfied by static calculation | `#5C8E78` contrast is approximately `3.75:1` on `#FFFFFF`, `3.33:1` on unavailable `#F4F1EA`, and `3.60:1` on `#FBFAF7`. |
| BQ-29 muted-text debt affects the focus ring | satisfied as no | BQ-29 concerns `--muted` normal text; the focus ring uses sage, not the muted text token (`docs/decision-register.md:35`, `docs/design/design.md:182-187`). |
| Expanded-surface ring follows the design focus token | not-satisfied for design consistency | Expanded focus uses `--focus-ring-outer/inner` from global legacy tokens rather than scoped `--normal-focus-ring`; those global values derive from blue `--accent-solid` (`src/features/landing/grid/landing-grid-card.module.css:130-140`, `src/app/globals.css:14-18`, `src/app/globals.css:86-88`). Visibility exists, but token/contrast parity with the design's 2px sage ring is not established. |

The eventual Wave 11 change must remain scoped to card CSS if visual focus parity is approved. Global
token correction and `globals.css` remain Wave 16.

### 4.7 Tab order and hidden content

| Claim | Grade | Evidence |
|---|---|---|
| Hidden BQ-32 suffix is absent from public DOM/AT tree | satisfied | Only `visibleTags` render; probes are `aria-hidden` and `inert` (`src/features/landing/grid/landing-grid-card.tsx:426-468`, `src/features/landing/grid/landing-grid-card.tsx:490-515`). E2E asserts public child count equals visible count (`tests/e2e/a11y-smoke.spec.ts:229-262`). |
| Blog CTA is absent from focus/AT order | satisfied | It is a non-control `span`, `aria-hidden=true`, with no nested focusable element. |
| Transient/noninteractive answer choices are hidden and non-tabbable | satisfied | Noninteractive copies use `tabIndex=-1` and `aria-hidden=true` (`src/features/landing/grid/landing-grid-card.tsx:637-664`). |
| Desktop closing answer choices are hidden and non-tabbable | not-satisfied | The desktop closing shell still passes `interactive=true`; only cleanup-pending disables the controls. This is distinct from the already-correct transient noninteractive copies. |
| Unavailable has an orphaned `tabindex` | satisfied as intentional no | `-1` is the explicit BQ-26 semantic model, not an orphan. |
| Card tab order follows visual/source order while skipping unavailable | satisfied for covered card handoffs | Cards render in plan slice order and adjacency resolves from the same `cardVariants` list; unavailable is skipped (`src/features/landing/grid/landing-catalog-grid.tsx:201-264`, `src/features/landing/grid/interaction-dom.ts:34-55`). |
| Full Test/Blog/Unavailable Tab and Shift-Tab matrix equals visual order | unproven | Existing tests cover Test-to-Test handoff and unavailable skip, but not a complete matrix including Blog, last-card exit, reverse entry from below the grid, and reduced motion. |
| Blog handoff preserves state order as well as visual order | not-satisfied | The queued pre-focus event can transiently mark Blog expanded even though its rendered card stays Normal. A visual-only assertion will miss this; tests must inspect reducer/motion-visible state during the handoff. |

### 4.8 Existing coverage: proven versus missing

#### Proven

- Landing canonical states are axe-clean (`tests/e2e/a11y-smoke.spec.ts:107-116`).
- Unavailable is skipped by Tab while semantic/AT-exposed
  (`tests/e2e/a11y-smoke.spec.ts:118-156`).
- Focused Test expands, internal A/B controls are traversed, next Test handoff collapses prior, and
  Shift-Tab reverses (`tests/e2e/state-smoke.spec.ts:230-263`).
- Handoff skips unavailable in both directions (`tests/e2e/state-smoke.spec.ts:293-336`).
- First landing Tab and reverse GNB return are covered
  (`tests/e2e/state-smoke.spec.ts:338-355`).
- Blog focus does not expand, Space does not navigate, and Enter navigates
  (`tests/e2e/a11y-smoke.spec.ts:210-227`).
- Hidden tag suffix/probe, Blog CTA, and coming-soon exposure are covered
  (`tests/e2e/a11y-smoke.spec.ts:229-262`).
- Reduced-motion shared scale/motion is covered through hover, with scale `1.00`
  (`tests/e2e/state-smoke.spec.ts:660-726`).

#### Missing

- Desktop `hover:none` / tap-capability keyboard focus expansion.
- Focus expansion with reduced motion as the initiating path.
- Focus during a pending hover-intent timer and pointer/keyboard source-race behavior.
- Test-to-Blog and Blog-to-Test keyboard handoff with no transient Blog expansion/motion state.
- Escape from trigger, answer A, and answer B.
- One Escape close command, one transition reason, one cleanup, and one baseline release.
- The approved Escape focus disposition from trigger and internal choices.
- Immediate removal of closing choices from the tab/activation order.
- Generic focus-out to Blog, unavailable-skip neighbor, GNB, footer/next document control, and
  programmatic outside focus.
- Last-card forward exit and first-card reverse exit without a trap.
- `aria-expanded` false/true/false transitions and ownership.
- Stable computed accessible names/descriptions for Test, Blog, tags, and unavailable status across
  representative script families and all 12 message catalogs.
- Desktop Expanded axe coverage; the canonical axe test currently audits only the initial landing
  state.
- Explicit assertion that focus alone never starts transition, writes landing ingress, emits
  telemetry, or changes URL.
- Explicit Test-trigger activation semantics after focus has already expanded the card.
- Full Tab / Shift-Tab / Enter / Space / Escape matrix for Test / Blog / Unavailable in desktop
  normal and reduced-motion modes.

## 5. Candidate Framing Rules

Candidates below are proposals for user review only. They prefer the existing reducer, desktop
motion controller, geometry controller, and card rendering path. None may add a parallel expanded
state or touch transition, telemetry, storage, routing, resolver, generated registry, test-entry, or
pre-answer logic.

Because the likely implementation touches the High-Risk keyboard/controller surface, later planning
must explicitly carry these risk dimensions: **usability** (focus disposition and no trap),
**a11y** (names, state, order), **responsiveness** (Desktop/Tablet only; Mobile preserved),
**performance** (no duplicate observers/listeners or timer sources), and **design-system
consistency** (scoped focus ring only).

Out-of-scope ideas that must not be promoted as Wave 11 candidates:

- Direct Test entry from the Normal trigger: conflicts with A/B entry ownership.
- Changing Blog routing or replacing the whole-card link.
- Making unavailable focusable to solve announcement concerns: conflicts with BQ-26.
- Adding mobile lifecycle focus changes: Wave 13.
- Changing GNB Escape/focus transfer internals: Wave 15.
- Promoting/revaluing global focus or muted tokens in `globals.css`: Wave 16.
- Adding transition/telemetry events for focus-expand.

## 6. Mechanism Comparison and Recommended Rulings

All rulings are recommendations for later user approval; none are approved here.

### 6.1 Focus-expand wiring

| Alternative | Fit | Risk / continuity | Testability |
|---|---|---|---|
| A. Add one card-aware immediate focus command to the existing controller path; cancel pending hover intent, distinguish Test-expandable from merely enterable Blog, set the existing desktop transition reason, and dispatch the existing state transition | Best fit. Reuses reducer, desktop motion, title continuity, baseline/floor, scale, and shell while removing the Blog pre-focus workaround | Lowest double-source risk. Must avoid changing pointer dwell and must work in desktop tap-capability mode | High: timer cancellation, capability decision, state transition, shell phase, and no-navigation can be asserted independently |
| B. Keep a separate card-local focus handler that directly sets separate expansion state | Poor fit | High double-source and flicker risk; can diverge from hover lifecycle, baseline freeze, and cleanup | Medium initially, low over time because two state machines must be tested |
| C. Route focus through the existing delayed hover scheduler | Incorrect fit | Violates no-dwell keyboard requirement and couples focus to pointer boundary refs | Easy to test but fails the requirement |

**Recommended ruling:** Alternative A. “Existing controller path” means a shared immediate expansion
command, not reuse of the pointer timer. Focus must cancel stale hover work, decide expandability
from card type/capability rather than enterability, and then enter the same
reducer/motion/geometry path with zero dwell.

### 6.2 Close trigger

| Alternative | Fit | Risk / continuity | Testability |
|---|---|---|---|
| A. Keep global reducer Escape plus local trigger Escape | Incorrect current shape | Duplicate close ownership, global-only internal-choice path, stale transition reason, and possible top-overlay double close | High to reproduce, hard to reason about |
| B. Focus-within/focus-out observer only | Incomplete | Cannot express explicit Escape disposition; careless blur handling can close while moving trigger → choice | Medium; `relatedTarget` and remount timing are delicate |
| C. One controller-owned close command, invoked by a single card Escape route plus a card-root focus boundary | Best fit | Escape and true focus-out share timer/state/lifecycle cleanup but use distinct focus disposition. Must ignore inside-card moves and preserve handoff reason ordering | High: one event source and each postcondition can be asserted |

**Recommended ruling:** Alternative C for mechanism only. Use one shared close command and one
focus-boundary predicate; do not install a focus trap. Focus-out owns state close only and never
reclaims focus. Escape focus disposition remains blocked on the §9.1 authority decision documented
in §4.4.

### 6.3 `aria-expanded` and state ownership

| Alternative | Fit | Risk / continuity | Testability |
|---|---|---|---|
| A. Put `aria-expanded` on the Test primary trigger; add `aria-controls` only if it targets the always-mounted desktop stage | Correct ARIA ownership: the button controls disclosure | Requires a stable stage id and a clear logical-state rule during closing cleanup | High: direct trigger/state/relationship assertions |
| B. Put `aria-expanded` on the card container | Weak | Non-interactive container does not own the activation; AT state can be detached from the focused control | Medium |
| C. Put state only on expanded content | Incorrect | The focused trigger announces no expanded/collapsed state | Low value |

**Recommended ruling:** Alternative A. Blog must not receive `aria-expanded` because it has no
expanded state. Unavailable remains `aria-disabled=true` and omits `aria-expanded` because it cannot
expand. Do not point `aria-controls` at the conditionally unmounted `expandedBody`.

### 6.4 Expanded-preview AT exposure

| Alternative | Fit | Risk / continuity | Testability |
|---|---|---|---|
| A. Nothing new beyond trigger-owned `aria-expanded`/relationship and existing semantic question/choice content | Best default | Lowest verbosity and no hover announcement spam | High: accessibility snapshot/name/state plus Tab sequence |
| B. Add a concise static labelled region for the preview | Conditional | Can improve navigation context, but may add an unnecessary landmark per card and duplicate the title | Medium |
| C. Add `aria-live` announcement on expansion | Poor fit | Hover expansion can announce unsolicited content; repeated handoff can become noisy; state and live text can double-announce | High technically, high UX risk |

**Recommended ruling:** Alternative A. The existing question text and choice-button names are
already semantic. Add no live region unless later assistive-technology testing proves the static
disclosure relationship insufficient.

### 6.5 Test-trigger activation after focus expansion

| Alternative | Fit | Risk / continuity | Testability |
|---|---|---|---|
| A. Preserve Enter/Space as an idempotent expand command | Smallest contract change; preserves A/B-only entry | The button action has little observable effect after focus expansion, but does not invent navigation or focus movement | High |
| B. Enter/Space moves focus to choice A | Gives activation a visible result without entering the test | New focus-management product decision; may surprise users who expect Tab to enter content | High |
| C. Enter/Space toggles collapse | Familiar disclosure-button behavior in isolation | Directly conflicts with “focus expands” because collapse while focus remains would immediately demand a re-open policy | Medium |
| D. Enter/Space enters the test | Not admissible | Violates BQ-12 and A/B pre-answer ownership | N/A |

**Recommended ruling:** Alternative A unless the user explicitly chooses B. This preserves the
current entry contract and keeps Wave 11 from inventing a new keyboard shortcut. No alternative is
approved here.

### 6.6 Closing-phase keyboard exposure

| Alternative | Fit | Risk / continuity | Testability |
|---|---|---|---|
| A. Keep answer choices tabbable/activatable during visual closing | Poor | ARIA can say collapsed while hidden-going-away controls remain operable; Escape followed by Tab can re-enter closing content | Easy to expose, unacceptable state mismatch |
| B. Mark closing/cleanup preview content noninteractive immediately while preserving the visual reverse animation | Best fit | Must preserve visual nodes and BQ-24 geometry while removing only focus/activation semantics | High: tab order, disabled/hidden state, animation, and geometry can be checked separately |
| C. Unmount preview content immediately | Poor | Breaks the explicit reverse motion/title continuity and may disturb floor/baseline cleanup | High regression risk |

**Recommended ruling:** Alternative B. Logical disclosure closes at the start of closing; the visual
shell may persist for animation, but its controls must leave the focus and activation order
immediately.

## 7. Authority Re-anchor Deltas for Eventual Implementation

List only; edit nothing in this task.

### `docs/req-landing.md`

- **§7.6 Keyboard Sequential Expansion Override**
  - Resolve the current “All Viewports” wording against Wave 11's Desktop/Tablet scope without
    changing Mobile lifecycle in this wave.
  - Replace the stale “Blog CTA” internal focus target with the live Blog whole-card-link contract.
  - State that Desktop/Tablet **Test** focus expands immediately independent of pointer hover
    capability; Blog focus never enters expanded state, including queued handoff state.
  - State that keyboard focus bypasses hover dwell but shares the same expansion, motion, floor,
    baseline, title-continuity, and scale path.
  - Record the approved Test trigger Enter/Space behavior after focus has already expanded; actual
    Test entry remains A/B-only.
  - Clarify Blog focus versus Enter/Space behavior and unavailable skip.
- **§8.2 Desktop/Tablet Expanded Trigger**
  - Add the focus entrypoint and pending-hover cancellation rule.
  - Define enterable versus expandable capability so Blog never becomes an expansion target.
  - Preserve pointer-only `120–200ms` hover dwell and `100–180ms` hover-out delay.
- **§8.3 Core Motion Contract**
  - Require Escape/focus-out close to set the standard collapse reason and preserve
    closing→cleanup/baseline release.
  - Permit the visual closing shell to remain while requiring its controls to become noninteractive
    immediately.
- **§9.1 Keyboard & Focus**
  - Reconcile the existing focusless browse-neutral rule with the user-approved deterministic Escape
    disposition; do not silently assume same-trigger return.
  - Define true focus-out close without focus reclamation and explicitly prohibit focus traps.
  - Define internal focus moves as within-card, not focus-out.
- **§9.2 / §9.3**
  - Define trigger-owned `aria-expanded`, optional stable-stage `aria-controls`, stable
    accessible-name/description relationships, the approved tags-group naming strategy, Blog
    decorative CTA exclusion, and unavailable title + coming-soon + disabled announcement while
    preserving `tabIndex=-1`.
  - Clarify that the semantic trigger, not the non-interactive card root, owns disabled/disclosure
    state.
- **§14.2 Keyboard/A11y**
  - Add the complete non-baseline keyboard matrix, state-race assertions, closing-subtree
    noninteractivity, and accessible-name/state assertions.

### `docs/design/design.md`

- **§6.9 Focus ring**
  - Re-anchor card-shell and expanded-surface use of the existing 2px sage focus ring with 2px
    offset, if W11-LI-04 is approved.
- **§7.2 / §7.3 / §7.4 / §7.5 application notes**
  - Record only visual focus-visible placement for Normal Test, Expanded Test, Blog link, and
    unavailable surface.
  - Do not add behavioral, keyboard, ARIA, lifecycle, routing, or QA rules to design authority.

## 8. Do-Not-Regress

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

## 9. Eventual Validation Scope — Non-Baseline

No runtime, test, build, or snapshot validation command is run in this analysis. A later approved
implementation must run the basic gates in repository order, then focused units plus
`a11y-smoke`/keyboard E2E; no snapshot assertion or baseline update.

The implementation should give new cases a unique non-snapshot title marker (for example
`assertion:W11-keyboard`) so the E2E can be selected without executing the stale
`expanded-focus-shell.png` assertion in the same `state-smoke` file:

```bash
npm test -- \
  tests/unit/landing-interaction-state.test.ts \
  tests/unit/landing-interaction-dom.test.ts \
  tests/unit/landing-desktop-shell-phase.test.ts \
  tests/unit/landing-card-contract.test.ts
npx playwright test \
  tests/e2e/a11y-smoke.spec.ts \
  tests/e2e/state-smoke.spec.ts \
  --grep "assertion:W11-keyboard"
```

Do not use an unfiltered full `state-smoke.spec.ts` run as the Wave 11 focused proof while the BQ-07
snapshot debt remains. Full non-baseline/basic gates remain required by the eventual approved plan.

### Required keyboard matrix

Run for desktop normal motion and `prefers-reduced-motion: reduce`:

| Card type | Tab | Shift-Tab | Enter | Space | Escape |
|---|---|---|---|---|---|
| Test trigger | focus expands immediately; URL/transition unchanged | prior target and collapse/handoff deterministic | approved non-entry activation behavior | approved non-entry activation behavior | one close path; approved deterministic focus disposition |
| Test choice A/B | ordered internal traversal | ordered reverse traversal | enters through selected choice only | enters through selected choice only | one close path; approved deterministic focus disposition |
| Blog link | focus only; no navigation; no Expanded surface | reverse order preserved | direct Blog navigation | no navigation | no card state leak |
| Unavailable | skipped | skipped | blocked if programmatically targeted | blocked if programmatically targeted | no-op; status remains exposed |

### Required assertions

- Focus-expand has no hover dwell and cancels pending pointer intent.
- Test→Blog and Blog→Test handoff never assigns Blog as `expandedCardVariant`, opening target, or
  active geometry target.
- Focus alone produces no URL change, transition start, ingress write, telemetry emission, or test
  entry.
- One Escape produces one close command, one collapse reason, one closing/cleanup sequence, and one
  baseline release.
- Escape focus disposition matches the separately approved §9.1 ruling from trigger and both
  choices.
- True focus-out closes without stealing destination focus.
- Trigger→choice and choice→choice movement is treated as inside-card focus, not focus-out.
- Closing/cleanup preview controls are immediately absent from the tab and activation order while
  reverse visual motion and BQ-24 geometry remain intact.
- No focus trap at first/last card edges.
- `aria-expanded` is trigger-owned and follows false → true → false.
- `aria-controls`, if used, always resolves to the stable desktop-stage id.
- Names/descriptions/states are stable for Test, Blog, tags, and unavailable status in all 12
  locales; no hand-built concatenated label duplicates visible state.
- Tab order equals visual/source order while unavailable is skipped.
- Unavailable remains semantic and AT-exposed with `tabIndex=-1`.
- Hidden suffix, measurement probe, and Blog CTA remain absent from focus/AT navigation.
- Initial and desktop-expanded representative states remain axe-clean.
- Desktop expansion keeps Wave 10 scale, BQ-24 floor/spacer, title continuity, baseline order, and
  zero horizontal overflow under normal and reduced motion.
- No snapshots, baseline files, or `qa:visual:full`.

## 10. Open Risks and Unknowns

1. **Wave prerequisite conflict:** Wave 8 overview/detail disagree, and Wave 10 roadmap/STATE do not
   confirm formal completion despite the implementation commit. Wave 11 implementation must not
   begin until authority is reconciled.
2. **Pointer-capability coupling:** current focus expansion is conditional on `interactionMode`.
   Desktop keyboard behavior is therefore coupled to hover capability even though keyboard intent
   should be independent.
3. **Enterable/expandable conflation:** queued keyboard handoff can transiently assign Blog as
   expanded because the pre-focus command sees only enterability.
4. **Pending hover timer:** focus does not cancel pending pointer intent; stale pointer work can
   override the focused keyboard target.
5. **Escape double ownership:** trigger Escape takes global + local paths; internal Escape takes only
   the global reducer path and can skip timer cleanup, collapse reason, closing motion, and focus
   disposition.
6. **Escape authority conflict:** same-trigger return is not currently authorized because §9.1 says
   focusless browse-neutral. This must be a user decision, not an implementation assumption.
7. **Blur boundary timing:** closing on every blur would collapse when moving trigger → A or A → B.
   The implementation must distinguish inside-card focus movement from true focus-out, including
   closing/cleanup DOM phases.
8. **Closing controls remain live:** current 280ms closing shell keeps A/B tabbable and activatable.
   ARIA cannot safely declare collapsed until logical interactivity and visual persistence are split.
9. **Activation semantics gap:** focus already expands Test, so Enter/Space is currently idempotent.
   Any move-to-choice or toggle behavior is a new UX decision; direct test entry is forbidden.
10. **Accessible-name strategy:** Test names change with rendered descendants, unavailable lacks an
   explicit title/status relationship, and tags use hard-coded English. The tags-group verbosity
   choice and any new message keys require approval.
11. **Unavailable AT variance:** a `tabIndex=-1` aria-disabled button remains in the reading tree, but
   screen-reader browse behavior varies. The BQ-26 model is locked; validation must test exposure
   without making it keyboard-focusable.
12. **Expanded ring token split:** Normal uses scoped sage; Expanded uses legacy global blue-derived
   variables. A scoped fix is possible, but global consolidation remains Wave 16.
13. **GNB Escape precedence:** Wave 11 must not modify GNB. If deterministic card Escape cannot be
    isolated from top-overlay precedence without GNB changes, stop and re-scope rather than touching
    Wave 15 behavior.

## 11. Readiness Verdict

- **BQ-19 Step-1 analysis readiness:** complete enough for user review of the candidates below.
- **Implementation readiness:** not ready.
- **Blocking conditions:** no candidate is approved; Wave 8/10 completion authority is inconsistent;
  Escape focus disposition, Test-trigger activation semantics, and tags-group naming strategy have
  not been approved.
- **Implementation authorization:** none.

## 12. Logic Improvement Candidate Table

| ID | Candidate | Layer | Magnitude | Improvement value against criteria 1–5 | Risk / rollback | Wave dependency |
|---|---|---|---|---|---|---|
| W11-LI-01 | Add one card-aware immediate keyboard-focus command to the existing desktop expansion path: cancel pending hover intent, separate Test-expandable from merely enterable Blog, expand Test independent of hover capability, and reuse reducer/motion/floor/baseline/title/Wave 10 scale | interaction-state / hooks | Medium | 1 Modern React: High; 2 simplicity/maintainability: High; 3 performance: High; 4 testability: High; 5 a11y logic: High | Main risk is pointer/keyboard ordering, handoff reason, or changing Blog state timing. Rollback is localized to the focus command/capability input; no data/route contract change | Wave 10 authority reconciliation required; Desktop/Tablet only; no Wave 13 mobile lifecycle or Wave 15 GNB |
| W11-LI-02 | Replace global/local Escape split with one controller-owned close command plus a card focus boundary; clear pending hover work, preserve standard closing/cleanup, make closing preview controls immediately noninteractive, ignore inside-card focus moves, and apply the separately approved Escape focus disposition while true focus-out never reclaims focus | hooks / a11y-logic / UI-structure | High | 1: High; 2: High; 3: Medium; 4: High; 5: High | Highest risk is blur/handoff/remount ordering, top-overlay precedence, or focus loops. Rollback restores the old event entrypoints but must not partially retain duplicate Escape handlers | Requires explicit §9.1 focus-disposition decision; depends on existing desktop lifecycle; no Mobile/GNB behavior edits |
| W11-LI-03 | Put stable names/descriptions and disclosure state on semantic owners: Test trigger `aria-expanded` plus optional always-mounted-stage `aria-controls`; stable title relationship; unavailable title + coming-soon description + `aria-disabled`/`tabIndex=-1`; Blog retains title-labelled link; choose localized tags-group name or native unnamed-list semantics; add no live region | a11y-logic / UI-structure | Medium | 1: Medium; 2: High; 3: High; 4: High; 5: High | Risk is duplicate names, stale references, or ARIA state disagreeing with closing interactivity. Rollback is attribute/id/message-key removal; BQ-26 semantics must never be rolled back | Tags-label option may require 12-locale messages; preserve BQ-32 unmount, probes, and Blog CTA hiding |
| W11-LI-04 | Align expanded Test focus-visible treatment with the existing scoped 2px sage/2px-offset card focus contract, keeping all changes inside card-scoped styling and leaving global tokens untouched | UI-structure | Low | 1: Low; 2: Medium; 3: High; 4: Medium; 5: High | Risk is ring clipping or geometry/screenshot drift. Rollback is one scoped selector/token change. No baseline regeneration is allowed | Visual note re-anchors to `design.md`; global token cleanup remains Wave 16 |

Logic Improvement: candidates identified for user approval — [W11-LI-01, W11-LI-02, W11-LI-03, W11-LI-04]. No candidate is approved by this document.
