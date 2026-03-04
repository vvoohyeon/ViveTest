# Reimplementation Checklist (SSOT-Aligned)

## 0. Scope / Sync / Non-goals
- [ ] Reimplementation scope is limited to V1 contracts only (`§1.1`).
- [ ] Explicitly exclude non-goals (dynamic background, sheets live integration, full taxonomy, advanced article bodies) (`§1.2`).
- [ ] Keep locked decisions (Visual package B, background intensity 0, tilt disabled) (`§1.3`).
- [ ] Resolve policy conflicts strictly by priority order (Global Invariants -> Routing/Layout -> Section 6~13 -> Exceptions) (`§3.1`).
- [ ] Apply single-change synchronization when touching linked policies (`§3.2`).
- [ ] Stop and resolve ambiguity before implementation when a single interpretation is not guaranteed (`§3.3`).

## 1. Routing / i18n / 404 Baseline
- [ ] Keep root vs locale layout responsibility split (`§5.1`).
- [ ] Enforce single locale prefix policy (`§5.2`).
- [ ] Keep `proxy.ts` single-entry locale policy and allowlist behavior (`§5.3`).
- [ ] Keep typed route builder as locale-free input/output; no manual path concat bypass (`§5.4`).
- [ ] Preserve two-layer 404 strategy: segment vs global unmatched (`§5.5`, `§15 EX-001`).
- [ ] Keep Global Invariants active: real pages live only under locale segment, and Expanded content remains identifiable (no crop/clip loss) (`§4.1`).

## 2. Layout / Grid / Slots
- [ ] Apply container/breakpoint baseline exactly (`§6.1`).
- [ ] Implement Desktop/Tablet/Mobile grid plan and row composition (`§6.2`).
- [ ] Enforce underfilled last-row start alignment on Desktop+Tablet and prevent width fill/stretch (`§6.2`, `§14.3-12`).
- [ ] Treat underfilled final-row residual space as explicit allowed exception only (`§6.2`).
- [ ] Keep Hero visual baseline as non-input informational block (`§6.3`).
- [ ] Enforce GNB context contracts end-to-end (Desktop settings open/close fallback + trigger-layer gap `0px` + focus-out close `<=1 frame`, Mobile overlay/backdrop/scroll lock, Mobile Test back fallback, History=Blog context) (`§6.4`, `§10.2`, `§14.3-3`, `§14.3-7`).
- [ ] Enforce card slot order and Expanded slot removal contract (`§6.5`, `§6.8`).
- [ ] Enforce text/wrap/truncate/clamp policy by slot (`§6.6`).
- [ ] Enforce subtitle-only single-line truncation with visible ellipsis and block overflow-driven inline-size contamination (card/row width + sibling-slot width unchanged) (`§6.6`, `§6.8`, `§14.3-4`).
- [ ] Enforce Expanded meta formatting/localization contracts (no abbreviated counts, locale switch + default fallback correctness) (`§6.8`).
- [ ] Enforce theme coverage on Landing/Test/Blog/History for both Normal/Expanded, light/dark matrix quality gate (`§6.9`, `§14.3-8`).

## 3. Normal Height / Spacing Contracts
- [ ] Enforce Normal compact + same-row equal-height stretch (`§6.7`).
- [ ] Keep tags terminal slot and forbid dynamic space under tags (`§6.7`).
- [ ] Apply and verify `thumbnail -> tags` two-level spacing model with `base_gap + comp_gap` measurement (`§6.7`, `§14.3-10`, `§14.3-11`).
- [ ] Keep `base spacing` non-zero across Desktop/Tablet/Mobile and aligned with title-subtitle-thumbnail rhythm (`§6.7`, `§14.3-10`).
- [ ] Allow compensation spacing only on cards requiring row equalization (`§6.7`).
- [ ] For Desktop/Tablet settled rows, keep non-comp cards at `comp_gap=0` with extra residual `thumbnail -> tags` gap `0` (`§6.7`, `§14.3-10`).
- [ ] Determine compensation-need using row-local Normal natural height comparison (row-index independent) (`§6.7`, `§14.3-11`).
- [ ] Preserve row1/row2+ non-target stability consistency in Expanded/handoff paths (`§6.7`, `§14.3-11`).
- [ ] Enforce empty-tags contract: tags slot height is preserved by container metrics while rendered chip count remains `0` (no placeholder/blank chip) (`§6.7`, `§13.1`, `§14.3-10`).

## 4. State Model / Desktop-Tablet Interaction
- [ ] Implement page/card state sets and fixed priority ordering (`§7.1`, `§7.2`).
- [ ] Respect guard rules for INACTIVE/ACTIVE-ramp/TRANSITIONING (`§7.3`).
- [ ] Ensure deterministic transitions and settled semantics with explicit allowed-transition table + guard no-op assertions (`§7.4`, `§7.7`, `§14.3-4`, `§14.3-5`).
- [ ] Implement HOVER_LOCK contracts for non-target cards and keyboard override behavior (`§7.5`).
- [ ] Implement keyboard sequential expansion override across all viewports (`§7.6`).
- [ ] Apply capability gate split for hover-capable vs tap mode (`§8.1`).
- [ ] Implement Desktop/Tablet trigger timing, cancel, and handoff behavior with single global timer + intent token + execution-time target revalidation (`§8.2`, `§14.3-13`).
- [ ] Classify handoff only on entering another available card; unavailable entry must never be treated as handoff (`§8.2`, `§14.3-13`).
- [ ] Enforce hover-out collapse independence from other-card hover, using live boundary decision and 100~180ms close window (`§8.2`, `§14.3-13`).
- [ ] Keep core motion phase/timing symmetry and no forbidden 0ms paths outside handoff exception; enforce handoff source `0ms` + target standard motion split for pointer and keyboard paths (`§7.6`, `§8.3`, `§14.3-13`).
- [ ] Enforce shell-scale/readability/origin policy including single-card-row origin (`§8.4`).

## 5. Mobile Expanded Lifecycle
- [ ] Enforce lifecycle `OPENING -> OPEN -> CLOSING -> NORMAL` and one-transition-per-sequence rule (`§8.5`).
- [ ] Keep in-flow full-bleed behavior with strict scroll-lock window, fixed layer order, and y-anchor/title baseline `0px` settled guarantees (`§8.5`, `§14.3-6`, `§14.3-14`).
- [ ] Keep close controls limited to `X` and outside tap, with queue-close and closing-ignore rules (`§8.5`).
- [ ] Keep X visible in OPENING/OPEN/CLOSING and disabled during CLOSING (`§8.5`).
- [ ] Enforce viewport y-anchor zero drift across index/scroll/content combinations (`§8.5`).
- [ ] Enforce title baseline zero drift at Mobile Expanded settled state (`§8.5`, `§14.3-14`).
- [ ] Enforce mobile pre-open snapshot lifecycle (sequence당 1회 생성, 재기록 금지) and allow `NORMAL` terminal only after pre-open height restore `0px` completion (`§8.5`, `§14.3-14`).
- [ ] Keep CTA priority over close/outside and non-CTA internal no-op (`§8.5`).

## 6. Accessibility / Responsive / Performance
- [ ] Enforce keyboard reachability, shell-aligned focus boundary, and Esc unwind order (`§9.1`).
- [ ] Enforce disabled semantics with semantic controls, including semantic-only primary card expansion/entry triggers, and aria-disabled activation blocking (`§9.2`, `§14.3-5`).
- [ ] Enforce overlay readability and title visibility under unavailable overlays (`§9.3`).
- [ ] Keep GNB responsive behavior as single source from context contract (`§10.2`, `§6.4`).
- [ ] Enforce SSR/hydration determinism and zero-warning gate (`§11.1`).
- [ ] Enforce animation/reduced-motion/cursor guardrails (`§11.2`, `§11.3`, `§11.4`).

## 7. Telemetry / Data / Error Handling
- [ ] Keep telemetry to V1 minimal event set and collection boundaries (`§12.1`, `§12.3`).
- [ ] Enforce transition correlation closure and required payload fields (`start=1`, `terminal=1`, `complete` after destination-ready, fail/cancel reason required) (`§12.2`, `§13.3`, `§14.3-15`).
- [ ] Enforce consent state machine and EX-002 default operating policy (`§12.4`, `§15 EX-002`).
- [ ] Enforce anonymous ID generation policy and random-source fallback boundaries (`§12.5`).
- [ ] Enforce fixture+adapter data source contract and minimum fixture diversity counts (`§12.6`).
- [ ] Enforce missing-slot behavior and unavailable behavior split by interaction mode (`§13.1`, `§13.2`).
- [ ] Enforce landing→destination handshake and rollback cleanup (`§13.3`, `§13.6`).
- [ ] Enforce rollback cleanup-set closure on fail/cancel for the 3 mandatory scenarios with zero leakage (`§13.3`, `§13.6`, `§14.3-16`).
- [ ] Enforce transition start trigger contract: routing starts only from valid Expanded CTA and preserves destination context handoff (`§8.6`, `§13.3`).
- [ ] Enforce test ingress/pre-answer/instruction/start-question contracts (`§13.4`, `§13.5`).
- [ ] Enforce dwell accumulation and return restoration hard contract (save right before routing, restore once on landing re-entry mount, immediate consume, no duplicate restoration) (`§13.7`, `§13.8`, `§14.3-17`).
- [ ] Enforce `final_submit` payload completeness with `final_responses` and `final_q1_response` required; raw text/PII forbidden (`§12.3`, `§14.3-18`).

## 8. Release Blocking Matrix Traceability
- [ ] Map implementation checks to all release-blocking items 1~19 and fail release when any blocker lacks at least one automated assertion mapping (`§14.3`, `§14.4`).
- [ ] Explicitly include new blockers: normal spacing model, row consistency, underfilled-row alignment, hover-out collapse independence, mobile title baseline stability (`§14.3-10`~`§14.3-14`).
- [ ] Ensure blocker #4 explicitly includes overflow-driven inline-size contamination `0건` checks (card/row + sibling slots) (`§14.3-4`).
- [ ] Ensure blocker #13 includes available-only handoff classification and source `0ms`/target standard motion split (`§14.3-13`, `§7.6`, `§8.2`, `§8.3`).
- [ ] Ensure blocker #14 includes `NORMAL` terminal gating by pre-open height restoration completion (`§14.3-14`, `§8.5`).

## 9. Verification Gate
- [ ] Keep release gate contract fixed: `qa:gate` includes minimum `build && test && test:e2e:smoke`, and release pass requires consecutive 3/3 (`§14.1`).
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] `npm test`
- [ ] `npm run test:e2e:smoke`
- [ ] `npm run qa:gate` (3/3)
