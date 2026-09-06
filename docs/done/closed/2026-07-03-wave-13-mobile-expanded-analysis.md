# Wave 13 Mobile Expanded BQ-19 Step-1 Analysis

> Mode: Analysis-Only / BQ-19 Step-1. This document is evidence and gap analysis only.
> No implementation, no CSS/token/source change recommendation, no snapshot/baseline work, no
> commit/push/checkpoint, and no implementation-plan prompt is authorized by this artifact.

## 0. Startup Gate

- Workspace: `/Users/b-m-2022001/Local/ViveTest`
- Branch: `main`
- HEAD inspected: `c4e1efabe7af02707de69cf5e2ad61d94c039d27`
- Senior re-audit startup `git status --short --untracked-files=all`: only this target file was
  present as untracked (`?? docs/plans/2026-06-XX-wave-13-mobile-expanded-analysis.md`).
  The original junior run's "no output before this file was created" startup claim is not reasserted.
- `.planning/STATE.md`: present, but it is a Wave 10 validation-blocked continuity note. It is not an
  authorization source for Wave 13.
- Only authorized write in this run: `docs/plans/2026-06-XX-wave-13-mobile-expanded-analysis.md`.
- Validation commands intentionally not run: `lint`, `typecheck`, `test`, `build`, Playwright, QA scripts,
  snapshot/baseline commands.

## 0.1 Senior Re-Audit Findings

These are the high-risk gaps a Wave 13 implementation prompt must not flatten into "just make the
mobile card look like §7.8":

1. **The biggest issue is an authority-layer conflict, not a missing CSS value.**
   `design.md §7.8` says the visual top edge is flush to the GNB bottom (`docs/design/design.md:350-355`),
   but `req-landing §8.5` says Mobile Expanded is in-flow, forbids top jump, and requires transition-window
   y-anchor drift `0px` (`docs/req-landing.md:601-608`, `634-647`). Because design is visual-only and
   behavior requirements outrank it (`docs/design/design.md:24-30`,
   `docs/agent-guides/project-rules.md:129-135`), Wave 13 needs an explicit reconciliation rule before
   any "GNB-flush" implementation can be considered safe.
2. **The current close affordance is only settled-interactive.** The real button with `onMobileClose`
   renders only in settled `OPEN` (`src/features/landing/grid/landing-grid-card.tsx:1213-1232`;
   `src/features/landing/grid/use-landing-interaction-controller.ts:536-540`). During OPENING/CLOSING,
   the transient "X" is a ghost `span` inside an `aria-hidden` shell and the shell/ghost use
   `pointer-events-none` (`src/features/landing/grid/landing-grid-card.tsx:270-288`, `1244-1276`).
   That is not equivalent to req §8.5's "X button ... OPENING start to CLOSING before end" close-path
   requirement (`docs/req-landing.md:613-614`, `625`, `629`).
3. **"Natural height" must be resolved without importing the prohibited `min-height:100%` overlay idea.**
   Current settled mobile uses `max-h-[calc(100dvh-116px)] overflow-auto`, and there is an E2E test for
   internal scroll (`src/features/landing/grid/landing-grid-card.tsx:276-279`;
   `tests/e2e/transition-telemetry-smoke.spec.ts:881-899`). The design appendix explicitly rejects
   `min-height: 100%` as an expanded-overlay invariant (`docs/design/design.md:417-418`), while
   req §8.5 wants body-owned scroll after `OPEN` and no internal scroll when content fits
   (`docs/req-landing.md:622-623`). This is a product/behavior decision surface, not a value tweak.
4. **B14 traceability is currently marker-complete but proof-incomplete.** The blocker registry and static
   QA script require B14 markers (`docs/blocker-traceability.json:140-180`,
   `scripts/qa/check-phase10-transition-contracts.mjs:122-132`), but two title-baseline assertions are
   guarded by `test.fixme(...)` (`tests/e2e/transition-telemetry-smoke.spec.ts:582-588`, `655-660`).
   Marker presence must stay Grade T, not Grade S.
5. **Snapshot "one write" is unit-proven, not DOM-proven.** The reducer has `snapshotWriteCount`, and unit
   tests cover non-rewrite (`src/features/landing/grid/mobile-lifecycle.ts:13-20`,
   `tests/unit/landing-mobile-lifecycle.test.ts:110-137`), but the card DOM publishes snapshot height/top/left/width/title,
   not a write-count attribute (`src/features/landing/grid/landing-grid-card.tsx:1115-1119`). Current E2E
   polls `data-mobile-snapshot-writes` as null (`tests/e2e/transition-telemetry-smoke.spec.ts:555`,
   `862`), so release-blocking §14.2 snapshot-write closure is not fully mapped to runtime DOM proof yet
   (`docs/req-landing.md:648`, `1061`).
6. **GNB layer ordering is already "GNB above expanded", not "expanded covers GNB".** The GNB shell is
   `z-[1100]`; mobile menu is the separate `z-[1200]` overlay (`src/features/gnb/site-gnb.tsx:32-33`,
   `58-62`). Mobile expanded/backdrop are local low-z layers (`z-20`/`z-[21]`/`z-10`)
   (`src/features/landing/grid/landing-grid-card.tsx:1029-1030`, `284`;
   `src/features/landing/grid/landing-catalog-grid.tsx:27-30`). Cover-GNB is therefore not current behavior
   and would violate Wave 13's "GNB internals out" boundary unless explicitly re-scoped.

## 1. Scope Lock

### In Scope

- Mobile Expanded shape and position only:
  full viewport width, GNB-flush top, natural height, scrim, no side radius, sage bottom edge, visible close.
- Mobile `OPENING -> OPEN -> CLOSING -> NORMAL` lifecycle, focus, scroll-lock, and a11y traceability.
- B14 mobile title-continuity `test.fixme(...)` freeze audit and future mobile reordering target.
- Logic Improvement candidates as analysis candidates only, with no values preselected.

### Out of Scope / Must Preserve

- Swipe-down close is not included. `decision-register.md:99-104` excludes it; `docs/design/design.md:350-355` states
  §7.8 is visual only and does not authorize swipe-down.
- Mobile menu / Wave 17, GNB internals / Wave 15, Wave 16 global token work.
- Desktop keyboard/a11y and desktop Expanded behavior.
- BQ-24 floor / `RestingFloorMap`, BQ-32 single visible-prefix resolver, BQ-12 transition/telemetry/storage/routing.
- BQ-07 snapshot/baseline work.

### Authority Divergence To Flag

The prompt says the baseline is "Wave 12 + R2 batch commit landed HEAD." Current authority docs are mixed:

- `docs/decision-register.md:315-320` records BQ-35 Wave 12 mobile browse decisions and implementation
  impact.
- `docs/decision-register.md:333-338` records BQ-37 R2 conformance and implementation impact.
- But `docs/wave-roadmap.md:376-388` still marks Wave 12 as planned/not completed and says no Wave 12
  completion commit/tag is recorded.
- `docs/wave-roadmap.md:390-402` keeps Wave 13 planned, with Wave 12 completion and lifecycle coupling
  investigation as prerequisites.

This analysis therefore treats current HEAD as implementation evidence, but does not upgrade roadmap status
or call Wave 12 complete.

## 2. Authority Chain Read

1. Decision register:
   - BQ-11: Mobile expanded shape/position only; swipe-down excluded (`docs/decision-register.md:99-104`).
   - BQ-16: Wave 1 allowed motion-ready seams only, not actual motion (`docs/decision-register.md:144-149`).
   - BQ-19: every wave implementation needs Analysis-Only gate before implementation prompt
     (`docs/decision-register.md:171-176`).
   - BQ-33: Wave 11 Desktop/Tablet keyboard-a11y explicitly defers Wave 13 keyboard traceability
     (`docs/decision-register.md:298-302`).
2. Product requirement:
   - Mobile Expanded behavior/lifecycle: `docs/req-landing.md:601-643`.
   - Semantics/a11y: `docs/req-landing.md:681-705`.
   - Reduced motion: `docs/req-landing.md:741-744`.
   - Representative regression matrix: `docs/req-landing.md:1043-1058`.
3. Visual SSOT:
   - Design precedence and scope: `docs/agent-guides/project-rules.md:129-135`.
   - Mobile expanded visual: `docs/design/design.md:350-355`.
   - Focus/scrim token intent: `docs/design/design.md:182-187`.
   - Mobile expanded artboard is missing locally; only harness/export reference is cited
     (`docs/design/design.md:379-391`).
4. Implementation evidence:
   - Mobile lifecycle hook: `src/features/landing/grid/use-mobile-card-lifecycle.ts`.
   - Mobile state reducer: `src/features/landing/grid/mobile-lifecycle.ts`.
   - Mobile DOM/CSS surface: `landing-grid-card.tsx`, `landing-grid-card.module.css`,
     `landing-catalog-grid.tsx`.
   - Existing test anchors: `transition-telemetry-smoke.spec.ts`, `landing-mobile-lifecycle.test.ts`,
     `landing-mobile-scroll-lock.test.ts`, `landing-mobile-backdrop-gesture.test.ts`,
     `a11y-smoke.spec.ts`.

## 3. Current Audit

Evidence grade legend:

- Grade S: source/test anchor exists in HEAD, but not executed in this analysis-only run.
- Grade T: test source exists, but assertion is skipped/fixme or only partial traceability.
- Grade D: decision or visual proof missing; do not claim safe/currently done.
- Grade V: visual proof requires native/mobile screenshot or design-resource evidence that is not present locally.

| Area | Current HEAD evidence | Gap / caution | Grade |
|:---|:---|:---|:---|
| Lifecycle names | Reducer phases are `NORMAL`, `OPENING`, `OPEN`, `CLOSING`; events include `OPEN_START`, `OPEN_SETTLED`, `QUEUE_CLOSE`, `CLOSE_START`, `RESTORE_READY`, `CLOSE_SETTLED`, `RESET` (`src/features/landing/grid/mobile-lifecycle.ts:1-30`). | Phase vocabulary matches req §8.5, but no command was run in this session. | S |
| Lifecycle order | Reducer blocks `OPEN_START` during `CLOSING`, queues close during `OPENING`, gates `CLOSE_SETTLED` on `restoreReady` (`mobile-lifecycle.ts:41-135`). | Existing reducer supports atomic order, but visual shape changes could invalidate timing/restore evidence. | S |
| Open orchestration | `beginMobileOpen()` captures snapshot, starts transient `OPENING`, dispatches `OPEN_START`, syncs `CARD_EXPAND`, and settles after `MOBILE_EXPANDED_DURATION_MS` (`use-mobile-card-lifecycle.ts:98-129`). | Snapshot source is the current in-flow card, not a GNB-flush sheet anchor. | S/D |
| Close orchestration | `beginMobileClose()` queues during `OPENING`, ignores non-`OPEN`, starts transient `CLOSING`, dispatches `CARD_COLLAPSE` and `CLOSE_START` (`use-mobile-card-lifecycle.ts:131-157`). Restore polling then waits before `CLOSE_SETTLED` (`use-mobile-card-lifecycle.ts:230-268`, `use-mobile-restore-polling.ts:79-104`). | Good lifecycle basis; focus return target remains under-specified for X/backdrop close. | S/D |
| Snapshot fields | Snapshot stores `cardHeightPx`, `anchorTopPx`, `cardLeftPx`, `cardWidthPx`, `titleTopPx` from `[data-testid="landing-grid-card"]` and `[data-slot="cardTitle"]` (`mobile-card-lifecycle-dom.ts:3-28`). Restore checks height and title offset within 1px (`mobile-card-lifecycle-dom.ts:30-48`). | This is title-continuity evidence, but B14 title baseline tests are fixme because the Normal title moved below the thumbnail. | T |
| DOM selectors | Shell publishes `data-mobile-phase`, `data-mobile-restore-ready-card-variant`; card publishes `data-mobile-phase`, `data-mobile-transient-mode`, `data-expanded-layer`, snapshot data attributes (`landing-catalog-grid.tsx:163-197`, `landing-grid-card.tsx:1088-1133`). | Strong QA hooks; still no runtime proof in this session. | S |
| Transient title | Opening/closing shell renders `[data-slot="mobileTransientShell"]`, `[data-slot="cardTitleTransient"]`, `aria-hidden="true"`; settled mobile renders `[data-slot="expandedBody"]`, `[data-slot="mobileHeader"]`, `[data-slot="cardTitle"]`, `[data-slot="mobileClose"]` (`landing-grid-card.tsx:1213-1276`). CSS hides the Normal title during transient phases (`landing-grid-card.module.css:235-238`). | Transient shell starts from snapshot top/width/radius; not inherently GNB-flush or no-radius through the whole transition. | S/D |
| Scrim/backdrop | Backdrop is `[data-testid="landing-grid-mobile-backdrop"]`, fixed `inset-0`, `z-10`, `bg-[var(--overlay-scrim-medium)]`, `touch-pan-y`, with `data-state` (`landing-catalog-grid.tsx:27-30`, `landing-catalog-grid.tsx:187-196`). | Uses legacy global `--overlay-scrim-medium` = `rgb(4 6 10 / 64%)` (`src/app/globals.css:96-98`), not design `--overlay-scrim: rgba(26,26,31,0.48)` (`docs/design/design.md:182-187`). Scrim opacity and tap-to-close need user decision. | D |
| Backdrop close | `useMobileBackdropGesture()` closes once on OPEN pointer down/up; during OPENING it queues close and can cancel if movement exceeds 10px (`use-mobile-backdrop-gesture.ts:7-99`). Unit tests cover no-op outside active phases, one close, scroll cancellation, and queue-cancel (`tests/unit/landing-mobile-backdrop-gesture.test.ts:97-155`). | Req currently permits backdrop close (`docs/req-landing.md:614`), but prompt requires user-only flag for scrim tap-to-close. | S/D |
| Close button | Settled mobile header renders button with `aria-label={copy.closeExpandedAria}`, `data-slot="mobileClose"`, text `×`, and `onMobileClose` (`landing-grid-card.tsx:1219-1232`). Unit test checks X handler starts close (`tests/unit/landing-interaction-controller-handlers.test.ts:739-768`). | Close control class is `min-h-10 min-w-10` (`landing-grid-card.tsx:270-275`), i.e. 40px Tailwind default, while design accessibility asks at least 44x44 for close (`docs/design/design.md:110-112`). Placement/affordance needs decision. | S/D |
| OPENING/CLOSING close affordance | Transient header renders `data-slot="mobileCloseGhost"` as a `span`, not a button, inside `aria-hidden="true"` transient shell (`landing-grid-card.tsx:1244-1276`). The shell and ghost are `pointer-events-none` (`landing-grid-card.tsx:270-288`). | Req §8.5 says X is visible from OPENING start through CLOSING and valid close inputs during OPENING queue a close (`docs/req-landing.md:613-614`, `625`, `629`). Current transient ghost may satisfy visual continuity, but not interactive X-close traceability. | D |
| Scroll lock | `shouldLockMobilePageScroll()` locks only `OPENING` and `CLOSING`; hook writes `body.style.overflow='hidden'` and `touchAction='none'`, then restores previous values (`use-mobile-scroll-lock.ts:5-27`). Unit tests cover phase matrix and restoration (`tests/unit/landing-mobile-scroll-lock.test.ts:56-97`). | Matches transition-window lock, but current expanded body is an internal scroll container; req says OPEN settled body/page scroll owns overflow (`docs/req-landing.md:622-623`). | S/D |
| Natural height | Settled mobile expanded class has `max-h-[calc(100dvh-116px)] overflow-auto overscroll-contain` (`landing-grid-card.tsx:276-279`). Existing E2E verifies sticky header during internal scroll (`tests/e2e/transition-telemetry-smoke.spec.ts:881-899`). | Direct gap to requested "natural height" and req body-scroll wording. This is not safe to mark done. | D |
| Full viewport width | Settled root adds `rounded-none w-screen min-h-0 mx-[calc(50%-50vw)]`; transient keyframes animate to `left:0`, `width:100vw`, `border-radius:0` (`landing-grid-card.tsx:1023-1031`, `landing-grid-card.module.css:460-485`). | Settled source aligns with full width/no side radius; transient begins at snapshot width/radius. Needs visual proof and decision whether transient must satisfy §7.8 from OPENING start. | S/D |
| GNB-flush top | Current mobile open preserves card y-anchor; transient shell top is `--landing-mobile-anchor-top` captured from the card (`landing-grid-card.tsx:283-288`, `landing-grid-card.tsx:1150-1153`). B14 tests expect root y stability (`tests/e2e/transition-telemetry-smoke.spec.ts:577-583`, `616-637`). | Conflict: req says in-flow/no top jump (`docs/req-landing.md:607-608`), while design §7.8 says top edge flush to GNB bottom (`docs/design/design.md:350-355`). User decision required. | D |
| GNB layer order | GNB shell is `sticky top-0 z-[1100]`; mobile expanded root/transient/backdrop use `z-20`/`z-[21]`/`z-10` (`site-gnb.tsx:32-33`; `landing-grid-card.tsx:1029-1030`, `284`; `landing-catalog-grid.tsx:27-30`). | Current layer model is `GNB > expanded > backdrop`, matching req §8.5 (`docs/req-landing.md:626-629`). Any cover-GNB version would be a new scope crossing into Wave 15/17 territory. | S/D |
| Sage bottom edge | No current mobile expanded source shows a dedicated `--sage` bottom edge. Expanded tokens include `--expanded-card-border:#5c8e78`, but settled mobile root uses transparent/no shadow state and the mobile body has no bottom-edge class (`landing-grid-card.module.css:26-42`, `landing-grid-card.tsx:1007-1031`, `1213-1241`). | §7.8 explicit gap. | D |
| Snapshot write trace | Reducer tracks `snapshotWriteCount` and prevents same-sequence rewrites (`mobile-lifecycle.ts:13-20`, `51-67`; `tests/unit/landing-mobile-lifecycle.test.ts:110-137`). DOM publishes snapshot geometry attributes, not write count (`landing-grid-card.tsx:1115-1119`). | Req §8.5/§14.2 require sequence-level snapshot single-write closure (`docs/req-landing.md:616-617`, `648`, `1056`, `1061`). E2E currently polls absent `data-mobile-snapshot-writes` as null, which is not proof of one write. | T/D |
| Reduced motion | Controller reads `prefers-reduced-motion` and sets page state (`use-landing-interaction-controller.ts:221-236`); card duration becomes 180ms (`landing-grid-card.tsx:986-989`); CSS has reduced mobile transient rules (`landing-grid-card.module.css:320-350`). E2E source checks reduced mobile open/close animation names (`tests/e2e/transition-telemetry-smoke.spec.ts:761-838`). | Test source exists, not run here. Any W13 visual change must preserve the simpler fallback. | S |
| Focus entry | On mobile, keyboard focus disposition is `preserve-mobile` (`interaction-state.ts:99-109`), but Enter/Space on the focused trigger starts `beginMobileOpen()` (`use-card-keyboard-handler.ts:265-278`). A11y smoke uses Tab then Space to reach mobile `OPEN` and axe-checks (`tests/e2e/a11y-smoke.spec.ts:392-407`, `522-537`). | Mobile a11y proof is mostly axe + open, not explicit focus target/return semantics. | T |
| Focus return / handoff | Expanded body Tab/Shift+Tab on mobile uses `beginMobileKeyboardHandoff()` and queued trigger focus (`use-card-keyboard-handler.ts:130-158`, `203-233`; `interaction-dom.ts:112-122`). | X/backdrop close has no explicit focus-return assertion; mobile Escape/focusout close handlers are intentionally ignored (`tests/unit/landing-interaction-controller-handlers.test.ts:505-550`). | T/D |
| ARIA disclosure | Mobile primary trigger does not receive `aria-expanded`; that is only set when `!isMobileViewport` (`landing-grid-card.tsx:1186-1188`). | This may be intentional, but Wave 13 must decide whether mobile traceability remains shape-only or includes full disclosure semantics. | D |

## 4. §7.8 Visual Comparison

| §7.8 / prompt item | Current | Gap | Ref |
|:---|:---|:---|:---|
| Full viewport width, no side margin | Settled root uses `w-screen` + negative viewport margin; transient ends at `width:100vw`. | Source-only partial. Opening/closing starts from card snapshot width. Needs runtime visual proof. | `landing-grid-card.tsx:1023-1031`, `landing-grid-card.module.css:460-485`, `docs/design/design.md:350-351` |
| Top edge flush to GNB bottom | Current model preserves in-flow card y-anchor; transient `top` comes from captured card top. | Direct conflict with GNB-flush unless user resolves in-flow/no-top-jump vs sheet-like top anchor. | `req-landing.md:607-608`, `docs/design/design.md:350-351`, `landing-grid-card.tsx:283-288` |
| Natural height | Current mobile expanded has `max-h-[calc(100dvh-116px)] overflow-auto`; test validates internal scroll. | Gap to natural-height/body-scroll interpretation. | `landing-grid-card.tsx:276-279`, `transition-telemetry-smoke.spec.ts:881-899`, `req-landing.md:622-623` |
| Scrim dims grid beneath | Backdrop exists and is fixed with scrim color. | Uses legacy `--overlay-scrim-medium` 64%; design token says 48%. Also decide whether scrim covers GNB or only grid beneath. | `landing-catalog-grid.tsx:27-30`, `globals.css:96-98`, `docs/design/design.md:182-187`, `docs/design/design.md:352` |
| Visible close top right | Settled `mobileHeader` has close button at the right. | Tap target is 40px class (`min-h-10 min-w-10`), below design 44px minimum; exact affordance/placement still user-owned. | `landing-grid-card.tsx:270-275`, `landing-grid-card.tsx:1219-1232`, `docs/design/design.md:110-112`, `docs/design/design.md:353` |
| Visible/usable close during transient lifecycle | Transient shell has a visual close ghost, not a button; it is `aria-hidden` and pointer-inert. | Gap if req §8.5 is read literally for X close during OPENING and CLOSING. Decide whether transient X is visual-only or an actual queued-close affordance. | `landing-grid-card.tsx:1244-1276`, `landing-grid-card.tsx:270-288`, `req-landing.md:613-614`, `req-landing.md:625` |
| No left/right card radius | Settled root uses `rounded-none`; transient keyframes end at radius 0. | Opening starts at card radius; closing returns to card radius. Decide whether §7.8 applies to settled only or full transient lifecycle. | `landing-grid-card.tsx:1029-1031`, `landing-grid-card.module.css:460-485`, `docs/design/design.md:354` |
| Sage bottom edge | No dedicated mobile bottom-edge selector found. | Gap. | `docs/design/design.md:354` |
| Swipe-down not authorized | No swipe-down close path found in current mobile expanded code; movement on backdrop is treated as scroll-cancel, not swipe close. | Preserve. Do not add without separate decision. | `decision-register.md:99-104`, `use-mobile-backdrop-gesture.ts:32-99`, `docs/design/design.md:355` |

## 5. B14 Title-Continuity Audit

### Target Files And Assertions

- `tests/e2e/transition-telemetry-smoke.spec.ts:534-614`
  - `assertion:B14-mobile-baseline`
  - currently opens mobile expanded, checks backdrop/scroll-lock/open phase/root y stability, then has
    `test.fixme(...)` for title baseline.
- `tests/e2e/transition-telemetry-smoke.spec.ts:616-662`
  - `assertion:B14-mobile-open-continuity`
  - checks transient shell, root footprint stability, z-order, mobile-in-flow settled state, then has
    `test.fixme(...)` for title baseline.
- `tests/e2e/transition-telemetry-smoke.spec.ts:664-759`
  - `assertion:B14-mobile-close-perception`
  - `assertion:B14-mobile-close-choreography`
  - `assertion:B14-mobile-title-continuity`
  - not fixme; currently checks root footprint restore, transient title visibility, z-order, body unlock,
    and scroll preservation.
- `docs/blocker-traceability.json:140-180`
  - maps B14 mobile baseline/open/close/title/queue/reduced-motion assertions to
    `tests/e2e/transition-telemetry-smoke.spec.ts`.
- `scripts/qa/check-phase10-transition-contracts.mjs:122-132`
  - statically requires B14 assertion markers, but marker presence is not the same as unskipped live proof.
- `src/features/landing/grid/landing-grid-card.tsx:1115-1119`
  - publishes snapshot geometry attributes, but no `snapshotWriteCount` DOM attribute. B14 can currently prove
    height/title restore through geometry, but not DOM-level "snapshot written exactly once" closure.

### Freeze Reason

- Wave 1 changed Normal visible order from `cardTitle -> cardThumbnail -> cardSubtitle -> tags` to
  `cardThumbnail -> cardTitle -> cardSubtitle -> tags` (`docs/wave-roadmap.md:104-111`).
- The B14 comments state the Normal title moved about 62px down after thumbnail-first order while the
  Expanded header title stayed unchanged (`tests/e2e/transition-telemetry-smoke.spec.ts:582-588`,
  `655-660`).

### Mobile Reordering Method, Analysis-Only

No implementation order is approved here. The next authorized work must first resolve whether Wave 13's
mobile expanded title anchor is:

1. Normal title baseline continuity (`req-landing.md:612`), or
2. GNB-flush sheet/header visual anchor (`docs/design/design.md:350-355`), or
3. a documented exception that splits visual top alignment from title baseline continuity.

Only after that decision can B14 be re-ordered. The likely test realignment surface is:

- keep B14 lifecycle assertions on the existing selectors:
  `[data-mobile-phase]`, `[data-expanded-layer]`, `[data-slot="mobileTransientShell"]`,
  `[data-slot="cardTitleTransient"]`, `[data-slot="cardTitle"]`;
- remove the two `test.fixme(...)` guards only after the chosen title anchor has source-level, DOM-level,
  and runtime-level assertions; marker presence alone is not enough;
- add/realign an explicit snapshot single-write proof if Wave 13 claims req §8.5 snapshot closure, because
  today's E2E only sees geometry attributes and an absent `data-mobile-snapshot-writes` attribute;
- preserve the close choreography assertion that root title is hidden while transient title remains visible
  during CLOSING (`tests/e2e/transition-telemetry-smoke.spec.ts:715-758`);
- do not convert B14 into screenshot/baseline approval.

## 6. Lifecycle / Focus / A11y Traceability

### Lifecycle

Current lifecycle is real enough to analyze but not enough to mark visually done:

- Reducer has the required phase names and one-way shape (`mobile-lifecycle.ts:1-30`, `41-135`).
- Hook owns timers, snapshot capture, transient shell teardown, restore polling, viewport reset, and backdrop
  bindings (`use-mobile-card-lifecycle.ts:41-287`).
- Unit tests cover fixed 280ms duration, queued close, snapshot write count, restore-ready gate, restore
  polling, transient shell teardown, and manual reset (`tests/unit/landing-mobile-lifecycle.test.ts:72-163`,
  `166-253`, `255-355`).
- Existing E2E source covers mobile baseline/open/close/reduced/queue-close paths, but this run did not execute it.

### Scroll Lock

- Current mechanism is phase-based body style mutation (`overflow:hidden`, `touchAction:none`) only during
  `OPENING`/`CLOSING` (`use-mobile-scroll-lock.ts:5-27`).
- Unit tests explicitly assert lock matrix and style restoration (`tests/unit/landing-mobile-scroll-lock.test.ts:56-97`).
- Gap: settled `OPEN` currently uses internal expanded-body scroll (`overflow-auto`, `max-h`), while the
  product requirement says expanded internal content scroll is body-owned after OPEN settled
  (`docs/req-landing.md:622-623`).

### Focus Entry And Return

- Desktop/Tablet focus was hardened in Wave 11; BQ-33 explicitly says Wave 13 keyboard traceability remains
  separate (`docs/decision-register.md:298-302`).
- Mobile focus classification currently returns `preserve-mobile`, not immediate focus expansion
  (`interaction-state.ts:99-109`).
- Mobile keyboard activation is still possible: Enter/Space on the trigger calls `beginMobileOpen()`
  (`use-card-keyboard-handler.ts:265-278`), and a11y smoke opens mobile expanded via Tab + Space
  (`tests/e2e/a11y-smoke.spec.ts:392-407`).
- Mobile Tab/Shift+Tab inside expanded body can hand off to adjacent enterable cards and double-RAF focus
  their triggers (`use-card-keyboard-handler.ts:130-158`, `203-233`; `interaction-dom.ts:112-122`).
- E2E source already covers the happy keyboard path: focus trigger -> Space opens mobile expanded -> Tab reaches
  close, answer A, answer B, then next trigger (`tests/e2e/state-smoke.spec.ts:886-925`). This is still not
  equivalent to X/backdrop close return-focus proof.
- Gap: X/backdrop close does not have an explicit focus return target assertion. Mobile Escape/card-root blur
  close handlers are intentionally ignored (`tests/unit/landing-interaction-controller-handlers.test.ts:505-550`).
- Preservation warning: Desktop/Tablet return-focus is owned by `closeDesktopCard()` and bypassed on mobile
  (`use-landing-interaction-controller.ts:301-333`, `430-456`). Wave 13 must not "reuse" that path for mobile
  without revalidating Wave 11 desktop keyboard contracts.

### A11y

- Existing mobile expanded axe coverage exists for English and Korean representative states
  (`tests/e2e/a11y-smoke.spec.ts:392-407`, `522-537`).
- Mobile trigger does not expose `aria-expanded`; current source limits that attribute to non-mobile
  (`landing-grid-card.tsx:1186-1188`).
- Close has an accessible label (`landing-grid-card.tsx:1223-1229`), but target size is below the design
  44px minimum unless CSS elsewhere compensates, which this analysis did not prove.
- Decision required: Wave 13 can be shape-only a11y traceability, or full lifecycle/disclosure/focus traceability.

## 7. User-Only Decisions Required

These are not preselected by this analysis:

1. Swipe-down close:
   - Current authority excludes it. Confirm it remains excluded.
2. Scrim opacity and tap-to-close:
   - Current code uses tap-to-close backdrop and `--overlay-scrim-medium`; design has a different scrim token.
   - Decide opacity/token source and whether to preserve backdrop tap-to-close as-is.
3. Cover-GNB vs GNB-flush:
   - §7.8 default is GNB-flush top, while current lifecycle preserves in-flow y-anchor.
   - Decide how to reconcile with req `in-flow` / `top jump` rules.
4. Scroll-lock mechanism:
   - Current body lock only during transitions; current settled state uses internal scroll.
   - Decide whether Wave 13 must move to natural/body scroll or keep internal scroll as an exception.
5. Close placement and affordance:
   - Current close is top-right and visible, but 40px min-size. Decide final target size, touch area, and visual
     treatment.
6. Transient close semantics:
   - Decide whether OPENING/CLOSING require an actual X close target, or whether the current ghost X is visual-only
     and backdrop is the only queued-close input before OPEN.
7. Focus target:
   - Decide focus entry target after keyboard open, X close, backdrop close, and Tab/Shift+Tab handoff.
8. A11y scope:
   - Decide whether Wave 13 covers full traceability (`aria-expanded`/role/focus/axe/keyboard) or only shape-linked
     mobile a11y proof.
9. Title continuity vs GNB-flush visual:
   - Decide whether B14 continues to assert `0px` Normal title baseline continuity, or is re-anchored to a new
     mobile expanded visual target.
10. Snapshot traceability:
   - Decide whether Wave 13 must close the DOM-level single-snapshot-write traceability gap, or whether unit-level
     reducer proof is sufficient for the B14 release-blocking claim.

## 8. Logic Improvement Candidates

Candidate IDs are analysis labels only. No candidate is approved here and no values are selected.

| Candidate | Layer | Magnitude | Evidence | Value / risk framing |
|:---|:---|:---|:---|:---|
| W13-LI-01 Mobile expanded visual shell reconciliation | `landing-grid-card.tsx` / module CSS visual layer | Medium-High | Current settled mobile is full-width/rounded-none, but top anchor, natural height, sage bottom edge, transient radius/width are incomplete against §7.8. | High visual value; high risk to B14 lifecycle/title/y-anchor tests. |
| W13-LI-02 Scrim token and backdrop behavior decision | visual token consumption + backdrop interaction | Medium | Current backdrop uses legacy `--overlay-scrim-medium`, not design `--overlay-scrim`; backdrop tap closes. | Medium value; risk is behavior drift if tap-to-close changes. |
| W13-LI-03 Natural-height / scroll ownership reconciliation | layout + scroll-lock lifecycle | High | Current mobile body has `max-h` and `overflow-auto`; req says body/page scroll after OPEN settled. | High user-visible value; high risk to sticky header, scroll preservation, restore polling. |
| W13-LI-04 B14 title-continuity re-anchor | E2E tests + possibly layout | Medium | Two B14 title assertions are fixme because thumbnail-first order moved Normal title. | Required for Wave 13 closure; risk is masking real title jump if the authority conflict is not resolved first. |
| W13-LI-05 Mobile focus-return and disclosure traceability | keyboard/a11y tests + controller bindings | Medium | Mobile opens via keyboard and axe passes, but close focus target and mobile disclosure semantics are not explicit. | Accessibility value; risk to desktop Wave 11 contracts if shared handlers are edited carelessly. |
| W13-LI-06 Close affordance conformance | component class / visual CSS | Low-Medium | Close exists but class min size is 40px, below design 44px target. | Focused visual/a11y value; low code magnitude if isolated, but user must decide final affordance. |
| W13-LI-07 GNB-flush vs in-flow policy split | product/visual contract reconciliation | High | Req says in-flow/no top jump; design says GNB-flush top. | Must be resolved before implementation; otherwise any code path will violate one authority. |
| W13-LI-08 Transient X-close traceability | component semantics + lifecycle input gating | Medium | Current OPENING/CLOSING X is a pointer-inert ghost; req names X/outside as close paths and queue-close during OPENING. | Could improve lifecycle/a11y clarity; risk is accidental second close path or CLOSING reentrancy. No value preselected. |
| W13-LI-09 Snapshot single-write DOM proof | lifecycle instrumentation/test traceability | Low-Medium | Reducer/unit proof exists, but E2E DOM has geometry only and polls an absent write-count attribute. | Traceability value; risk is adding QA-only surface without a user-visible need. No instrumentation shape selected. |

## 8.1 Preservation Contracts For Any Later Work

These are not implementation steps; they are the contracts this analysis found most likely to be broken by a
well-intentioned Wave 13 patch:

- Preserve Desktop/Tablet expanded, keyboard close, and Wave 11 focus-return behavior. Mobile focus return must not
  be "fixed" by routing through desktop `closeDesktopCard()` without explicit revalidation
  (`docs/decision-register.md:297-302`; `use-landing-interaction-controller.ts:301-333`, `430-456`).
- Preserve BQ-24 floor/`RestingFloorMap` and the desktop expanded body floor path. Mobile expanded/transient bodies
  intentionally use the `flow` body layout, while BQ-24 floor comments describe desktop only
  (`landing-grid-card.tsx:249-257`, `295-297`).
- Preserve BQ-32 single visible-prefix resolver and Wave 12 browse behavior. Wave 13 must not add second
  mobile-only tag hiding, locale thresholding, or Blog CTA behavior changes (`docs/wave-roadmap.md:376-388`;
  `docs/decision-register.md:315-320`).
- Preserve BQ-12 transition/telemetry/storage/routing and transition cleanup boundaries. `req-landing` explicitly
  says transition pending/terminal/rollback and return restoration are independent of visual-layer changes
  (`docs/req-landing.md:1092-1096`).
- Preserve BQ-07 snapshot/baseline freeze. Future captures may be evidence labels, but not visual-regression
  baseline regeneration unless separately authorized (`docs/design/design.md:30`;
  `docs/decision-register.md:333-338`).

## 9. Verification Obligations For A Later Authorized Implementation

Not run in this analysis-only session.

Minimum future obligations after decisions are resolved:

- Basic gates from `AGENTS.md §5`: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- Landing scope checks from `docs/agent-guides/verification-commands.md:53-80`.
- Transition scope checks if lifecycle/scroll/transition behavior changes:
  `docs/agent-guides/verification-commands.md:38-51`.
- Focused unit targets likely include:
  `tests/unit/landing-mobile-lifecycle.test.ts`,
  `tests/unit/landing-mobile-scroll-lock.test.ts`,
  `tests/unit/landing-mobile-backdrop-gesture.test.ts`,
  `tests/unit/landing-interaction-controller-handlers.test.ts`,
  `tests/unit/landing-card-contract.test.ts`.
- Focused E2E targets likely include:
  `tests/e2e/transition-telemetry-smoke.spec.ts`,
  `tests/e2e/a11y-smoke.spec.ts`,
  and targeted landing/grid smoke that covers mobile expanded.
- No BQ-07 baseline/snapshot regeneration unless separately authorized.

Future visual evidence should be screenshot-independent first, then native mobile captures if requested. The
local design resource manifest has no standalone mobile expanded artboard (`docs/design/design.md:379-391`), so
pixel/visual parity must remain unproven until actual mobile-expanded captures are supplied or generated under a
separate authorization.

Suggested future capture labels, not baseline names:

- `w13-mobile-expanded-open-390-en-qmbti.png`
- `w13-mobile-expanded-open-390-en-qmbti-gutter-to-gnb.png`
- `w13-mobile-expanded-opening-390-en-qmbti.png`
- `w13-mobile-expanded-closing-390-en-qmbti.png`
- `w13-mobile-expanded-open-360-en-long-title.png`
- `w13-mobile-expanded-open-390-kr-qmbti.png`
- `w13-mobile-expanded-reduced-motion-390-en-qmbti.png`
- `w13-mobile-expanded-open-390-en-internal-overflow-check.png`
- `w13-mobile-expanded-open-390-en-close-target-hitbox.png`

## 10. Step-1 Conclusion

Current HEAD has a substantial mobile lifecycle foundation: phases, timers, snapshot/restore gate, transient shell,
backdrop, close button, transition-window scroll lock, reduced-motion branch, and B14 assertion anchors all exist.
However Wave 13 is not visually done:

- GNB-flush top conflicts with current in-flow/y-anchor preservation.
- Natural height conflicts with current internal `max-height`/`overflow-auto`.
- Scrim token/opacity is not aligned to design §5.7.
- Sage bottom edge is absent.
- Close affordance likely misses the 44px target.
- B14 title-continuity remains explicitly frozen in two open-path assertions.
- Mobile focus-return/disclosure traceability is partial.

No W13-LI candidate is approved by this document. No implementation prompt is emitted. The next step is user decision
resolution for §7, followed by a separate plan/implementation commission if desired.

Senior re-audit final status: this document intentionally stops at evidence/gap analysis. It does not approve
`GNB-flush`, natural/body-scroll conversion, scrim token migration, transient X behavior, DOM instrumentation,
or any LI candidate.
