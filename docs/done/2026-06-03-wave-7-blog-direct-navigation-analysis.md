# Wave 7 — Blog Direct Navigation Behavior — BQ-19 Analysis (Step 1)

- **Date:** 2026-06-03
- **Wave:** 7 (Blog direct navigation behavior)
- **Task mode:** Analysis Only (BQ-19 Global Gate, Step 1). No source edits, no commits, no implementation plan.
- **Active wave range:** Wave 7 only. Prerequisite Wave 2 ✅ complete; Wave 6 ✅ complete (uncommitted per `.planning/STATE.md`).
- **Scope (wave-roadmap.md Wave 7):** Include — remove Blog Expanded path · whole-card navigation · no test-like expansion. Exclude — Blog visual CTA styling (Wave 8). Risk: High. Handoff: Wave 8 Blog visual.
- **Authority for the behavior change:** BQ-02 (`Blog는 Normal card direct navigation으로 전환`). Visual authority is `design.md §7.4` but **visual intent only** (BQ-21) — no skin/reveal work here.
- **Files expected to be modified (Step 2, for reference only — NOT this task):** `src/features/landing/grid/landing-grid-card.tsx`, `use-landing-interaction-controller.ts`, `use-card-keyboard-handler.ts` / `use-keyboard-handoff.ts`, `use-hover-intent-controller.ts`, `use-mobile-card-lifecycle.ts`, and the affected unit/e2e specs. `src/features/transition/**` is reusable as-is (see §4).
- **Reference-only / must not modify:** `legacy/reference` worktree, all checkpoint worktrees, `docs/design/resources/superseded/**`, `globals.css` (Wave 16), visual-regression baselines (BQ-07).

---

## 1. Current Coupling Map (file:line evidence)

### 1.1 Blog is rendered and driven identically to a Test card — only three type-branches diverge

Today **every enterable card (test + blog) flows through the exact same expand/collapse/hover/keyboard/mobile machinery.** The shared state machine and hooks are entirely **card-type-agnostic** — they key off `cardVariant` strings and an `available`/`isEnterableCard` boolean, never `card.type`. The only places that know "this is a blog card" are:

| Divergence | Location | Effect |
|---|---|---|
| Answer-choice select (test only) | [use-landing-interaction-controller.ts:382-396](src/features/landing/grid/use-landing-interaction-controller.ts) `handleAnswerChoiceSelect` guards `card.type !== 'test'` | Test A/B → `beginTestTransition` |
| Primary-CTA click (blog only) | [use-landing-interaction-controller.ts:398-412](src/features/landing/grid/use-landing-interaction-controller.ts) `handlePrimaryCtaClick` guards `card.type !== 'blog'` | Blog Read more → `beginBlogTransition` |
| Expanded body render | [landing-grid-card.tsx:805-830](src/features/landing/grid/landing-grid-card.tsx) `ExpandedCardBody` branches `card.type === 'test'` vs `ExpandedBlogBody` | Renders preview-question vs subtitle/meta/CTA |

Everything else treats blog as a test card.

### 1.2 The Blog Expanded path (the seam to remove)

- **Card root trigger is a shared `<button>`** for both test and blog: [landing-grid-card.tsx:1149-1161](src/features/landing/grid/landing-grid-card.tsx) — `<button type="button" data-slot="primaryTrigger">` with `onClick={onClick}`, `onKeyDown`, `onFocus`. This button triggers **expansion** (not navigation) for both card types.
- **Desktop Expanded shell renders for blog** whenever `!isMobileViewport && !isUnavailable`: [landing-grid-card.tsx:1187-1203](src/features/landing/grid/landing-grid-card.tsx) → `DesktopExpandedShell` → [ExpandedBlogBody:711-792](src/features/landing/grid/landing-grid-card.tsx).
- **`ExpandedBlogBody`** renders subtitle + meta + the interactive `Read more` `<Link>`: [landing-grid-card.tsx:752-761](src/features/landing/grid/landing-grid-card.tsx) — `<Link href={buildLocalizedPath(RouteBuilder.blogArticle(card.variant), locale)} data-slot="primaryCTA" onClick={onPrimaryCtaClick}>`.
- **Mobile blog Expanded body** uses the same shared `showMobileExpandedBody` path: [landing-grid-card.tsx:1205-1235](src/features/landing/grid/landing-grid-card.tsx) → `ExpandedCardBody … interactive` → blog branch with the same `Read more` `<Link>`.
- **Blog-only desktop subtitle continuity** measurement: [landing-grid-card.tsx:1006-1011](src/features/landing/grid/landing-grid-card.tsx) `useLandingCardSubtitleSplit({enabled: !isMobileViewport && card.type === 'blog', …})` and [:912-913](src/features/landing/grid/landing-grid-card.tsx) `blogSubtitlePresentation`/`blogSubtitleSplit`. This is a per-frame layout measurement that exists **only** to fill the blog Expanded body.

### 1.3 Navigation trigger today (req-landing §8.6: "Blog: Read more")

1. User expands the blog card (hover/tap/focus) → blog Expanded body shows.
2. User clicks the `Read more` `<Link>` ([landing-grid-card.tsx:752](src/features/landing/grid/landing-grid-card.tsx)) → `onPrimaryCtaClick` → `forwardBlogDestinationCtaClick` ([:1076-1081](src/features/landing/grid/landing-grid-card.tsx)) → parent `onPrimaryCtaClick`.
3. Controller `handlePrimaryCtaClick` ([:398-412](src/features/landing/grid/use-landing-interaction-controller.ts)) resolves the card, calls `onPrimaryCtaSelect?.(card)` (→ `beginBlogTransition`), then `beginTransition(card.variant)` (landing-side visual lock), then `event.preventDefault()`.
4. `onPrimaryCtaSelect` is wired in [landing-catalog-grid.tsx:88-94](src/features/landing/grid/landing-catalog-grid.tsx) → `beginBlogTransition(card)`.
5. `beginBlogTransition` ([use-landing-transition.ts:45-66](src/features/transition/use-landing-transition.ts)) resolves `RouteBuilder.blogArticle(card.variant)` → `buildLocalizedPath` → `beginLandingTransition({targetType: 'blog', …})` → `router.push(targetRoute)`.

The **article identifier is `card.variant`**, carried through `RouteBuilder.blogArticle(variant)` to the route `/{locale}/blog/{variant}`. The destination resolves content **by route variant** ([server-model.ts:26-38](src/features/blog/server-model.ts)), which is the SSOT per req-landing §5.4.

### 1.4 Blog vs Test transition — what blog writes/emits (`src/features/transition/**`)

`beginLandingTransition` ([runtime.ts:33-78](src/features/transition/runtime.ts)) is the single entry. The blog vs test divergence is **already correct and contract-compliant**:

| Side effect | Test | Blog |
|---|---|---|
| `writePendingLandingTransition` | ✅ | ✅ |
| `saveLandingReturnScrollY` | ✅ | ✅ |
| `writeLandingIngress` (pre-answer) | ✅ (guarded by `targetType==='test' && preAnswerChoice`, [runtime.ts:54-61](src/features/transition/runtime.ts)) | ❌ none |
| `trackCardAnswered` | ✅ ([runtime.ts:62-67](src/features/transition/runtime.ts)) | ❌ none |
| `emitLandingTransitionSignal('transition_start')` | ✅ | ✅ ([runtime.ts:70-75](src/features/transition/runtime.ts)) |

This matches req-landing §13.3 ("Blog transition은 pending transition + return scroll + internal transition signal만 생성하며 landing ingress와 `card_answered`를 생성하지 않는다") and §14.4. **Wave 7 must preserve this exactly** — it only moves the *call site* (from the Read-more CTA to the whole card), not the runtime.

### 1.5 Destination model & destination-ready/complete semantics (§8.6)

- Model: [server-model.ts](src/features/blog/server-model.ts) — `getBlogIndexPageModel` / `getBlogDetailPageModel`; client: [blog-destination-client.tsx](src/features/blog/blog-destination-client.tsx).
- Destination-ready / complete: [blog-destination-client.tsx:46-90](src/features/blog/blog-destination-client.tsx) — reads pending transition, matches `targetType==='blog'` + `targetRoute===pathname`, then `requestAnimationFrame` → `completePendingLandingTransition({targetType:'blog'})` (req-landing §13.3: "Blog에서는 route/article model ready와 animation frame 이후"). Mismatch → `terminatePendingLandingTransition('transition_fail','DESTINATION_LOAD_ERROR')`.
- **Whole-card navigation must keep producing the same pending transition shape** so this handshake still fires. Since the change reuses `beginBlogTransition`, the handshake is untouched.

### 1.6 Redirect contract (invalid / non-enterable → localized blog index)

- **Route-level, server-side, independent of card interaction:** [blog/[variant]/page.tsx:43-48](src/app/[locale]/blog/[variant]/page.tsx) — `getBlogDetailPageModel` returns `null` for invalid/non-enterable → `redirect(buildLocalizedPath(RouteBuilder.blog(), locale))`. No cross-article fallback (project-rules §Blog-Telemetry-Theme, req-landing §5.4).
- **Landing-side reality:** every blog card in the catalog is `available` → enterable. Source fixture: `ops-handbook`, `build-metrics`, `release-gate` are all `attribute: "available"` ([source-fixture.ts:186-227](src/features/variant-registry/source-fixture.ts)). There are **no** unavailable/opt_out/hide/debug *blog* cards (req-landing §13.2: "unavailable Blog 카드는 존재하면 안 된다"). The e2e `NON_ENTERABLE_BLOG_VARIANT = 'burnout-risk'` is actually a `type:"test", attribute:"hide"` variant ([source-fixture.ts:136-138](src/features/variant-registry/source-fixture.ts)) used only to exercise the **route** redirect.
- **Implication:** whole-card navigation never needs an "invalid blog" guard at the card level. The route redirect is a safety net for direct URL entry only and stays untouched.

### 1.7 Accessibility today

- **Primary trigger semantics:** shared `<button type="button">` ([landing-grid-card.tsx:1149](src/features/landing/grid/landing-grid-card.tsx)). For a card whose activation is *navigation to a URL*, §9.2 wants a semantic `<a>` (currently it is a `<button>` because expansion is an action). The interactive `Read more` is a nested `<Link>` inside the expanded body.
- **Focus boundary (§9.1):** the trigger spans the card shell (`block w-full … [min-height:100%] [padding:16px]`, [:1066-1071](src/features/landing/grid/landing-grid-card.tsx)) so focus already aligns to the card-shell outer edge.
- **Esc precedence (§9.1):** [use-card-keyboard-handler.ts:275-279](src/features/landing/grid/use-card-keyboard-handler.ts) — Escape → `collapseExpandedCard()`. For a non-expanding blog card this becomes a no-op (nothing to collapse), which is acceptable.
- **Whole-card nav as a single `<a>` without nesting interactive controls is feasible:** the blog list destination already wraps a whole list item in one `<Link>` ([blog-destination-client.tsx:113-120](src/features/blog/blog-destination-client.tsx)). For the landing card, a single `<a>` over the card shell is the natural shape **provided the nested interactive `Read more` `<Link>` is removed** (it would otherwise be `<a>` inside `<a>`). The `Read more →` becomes a non-interactive label (Wave 8 visual).

### 1.8 Shared-state blast radius — what removing the blog expand branch can affect

The shared machinery is variant-agnostic, so blog and test currently share it. Enumerated regression surfaces if blog stops expanding:

1. **Interaction reducer** ([interaction-state.ts](src/features/landing/model/interaction-state.ts)): `CARD_EXPAND` / `CARD_HOVER_ENTER` / `CARD_FOCUS` / single-expand (`expandedCardVariant`) / `HOVER_LOCK`. **No reducer change needed** — blog simply stops dispatching expand events. Test single-expand logic is untouched. **Risk: low** if the gate is at the controller, not the reducer.
2. **Hover intent** ([use-hover-intent-controller.ts:138-254](src/features/landing/grid/use-hover-intent-controller.ts)): schedules expand/collapse for every enterable card. **Handoff edge case** ([:149-171](src/features/landing/grid/use-hover-intent-controller.ts)): `isEnterableHandoffCandidate` treats blog as a valid handoff target → today hovering test→blog collapses test and *expands* blog. After Wave 7, a hover landing on blog must collapse the prior test card and **not** expand blog. **Risk: medium** — must verify handoff-to-blog collapses cleanly.
3. **Keyboard handoff** ([use-card-keyboard-handler.ts](src/features/landing/grid/use-card-keyboard-handler.ts)): Tab cycling enters the expanded body's focusables (`getExpandedFocusableElements`) and Enter/Space dispatches `CARD_EXPAND`. Blog must instead activate **navigation** on Enter/Space, and never be a Tab-into-expanded-body target. **Risk: medium-high** (High-Risk file) — must keep test handoff/cycling intact.
4. **Mobile lifecycle** ([use-mobile-card-lifecycle.ts](src/features/landing/grid/use-mobile-card-lifecycle.ts)): blog tap currently opens the OPENING→OPEN→CLOSING→NORMAL lifecycle + transient shell. Wave 7 must route blog mobile tap to **navigation**, dropping blog from the lifecycle entirely. **Risk: medium** — verify the lifecycle is never entered for blog and test mobile lifecycle is unaffected.
5. **Desktop motion / shell phase** ([desktop-shell-phase.ts](src/features/landing/grid/desktop-shell-phase.ts), [use-desktop-motion-controller.ts](src/features/landing/grid/use-desktop-motion-controller.ts)): variant-agnostic; blog stops reaching `steady`/`opening`. No logic change; the blog shell simply never renders. **Risk: low.**
6. **Grid geometry / resting-floor** (Wave 6): blog expanded floor measurement becomes dead for blog. No correctness impact (blog won't be the active expanded card). **Risk: low.**

### 1.9 Telemetry today

- `trackCardAnswered` fires **only** from `beginLandingTransition` for test ([runtime.ts:62-67](src/features/transition/runtime.ts), [telemetry/runtime.ts:247-259](src/features/telemetry/runtime.ts)). Blog never fires it.
- Blog emits only internal `transition_start/complete/fail/cancel` signals ([signals.ts](src/features/transition/signals.ts)) — **not** telemetry-transported (req-landing §12.1).
- Consent source is single (`consent-source.ts`); blog navigation triggers no consent-gated event. **Must remain unchanged.**

### 1.10 Tests that depend on blog expansion (must be updated/removed in Step 2)

| Test | Location | Dependency | Required change |
|---|---|---|---|
| Blog Expanded subtitle/meta/primaryCTA contract | [landing-card-contract.test.ts:189-219](tests/unit/landing-card-contract.test.ts) | Blog Expanded render | **Remove** (no blog expanded state) |
| Desktop blog expanded subtitle continuity | [landing-card-contract.test.ts:221-239](tests/unit/landing-card-contract.test.ts) | Blog Expanded subtitle split | **Remove** |
| Blog subtitle continuity (expanded overflow) | [grid-smoke.spec.ts:516-575](tests/e2e/grid-smoke.spec.ts) | `hoverDesktopExpandedCard` + `cardSubtitleExpanded` | **Remove** |
| Blog mobile open/close subtitle continuity | [transition-telemetry-smoke.spec.ts:879-917](tests/e2e/transition-telemetry-smoke.spec.ts) | Mobile blog expanded lifecycle | **Remove / replace** with mobile-tap-navigates |
| Blog nav (no telemetry / GNB persist / return restore) | [transition-telemetry-smoke.spec.ts:388-394,397-421,423-479](tests/e2e/transition-telemetry-smoke.spec.ts) | two-step `trigger.click()` + `primaryCTA.click()` | **Update** to single whole-card click |
| Blog landing CTA route alignment | [routing-smoke.spec.ts:211-224](tests/e2e/routing-smoke.spec.ts) | two-step click | **Update** to single whole-card click |
| Blog a11y nav | [a11y-smoke.spec.ts:164-170](tests/e2e/a11y-smoke.spec.ts) | two-step click | **Update** + assert semantic `<a>` |
| Controller blog CTA callback identity | [landing-interaction-controller-handlers.test.ts:176-205](tests/unit/landing-interaction-controller-handlers.test.ts) | `onPrimaryCtaClick` path | **Update** to whole-card nav handler |
| Blog redirect / index / detail direct entry | [routing-smoke.spec.ts:196-234](tests/e2e/routing-smoke.spec.ts) | route-level only | **No change** (independent of card) |
| Blog transition runtime (no ingress, blog targetType) | [landing-transition-runtime.test.ts:70-131](tests/unit/landing-transition-runtime.test.ts) | `beginLandingTransition` blog path | **No change** (runtime preserved) |

---

## 2. Evaluate-First 6-Layer Review (BQ-18 — no default to Keep)

Ranked criteria: 1) modern React patterns · 2) simplicity/maintainability · 3) performance · 4) testability · 5) a11y logic.

| Layer | Verdict | Rationale (evidence-based) |
|---|---|---|
| **state** ([interaction-state.ts](src/features/landing/model/interaction-state.ts)) | **Keep** | Variant-agnostic reducer; correct for test single-expand. Wave 7 needs blog to *not dispatch* expand events — no reducer change. Replacing would add risk to verified test logic for zero benefit. (crit 2, 4) |
| **hooks** (controller + hover + keyboard + mobile) | **Keep core + add a thin card-type navigation gate** | The expand machinery is correct and shared. The only honest change is a `card.type === 'blog'` gate at the controller seam diverting blog activation to the *existing* `beginBlogTransition`, and suppressing hover/keyboard/mobile *expand* for blog. Not a Replace — internal test logic stays intact. (crit 1, 2, 5) |
| **routing** ([use-landing-transition.ts](src/features/transition/use-landing-transition.ts), `RouteBuilder`, blog route redirect) | **Keep** | `beginBlogTransition` + `RouteBuilder.blogArticle` + `buildLocalizedPath` + route-level redirect already implement whole-card navigation end-to-end. Wave 7 reuses them verbatim; only the call site moves. (crit 2) |
| **storage** ([transition/store.ts](src/features/transition/store.ts)) | **Keep** | Blog already writes only pending transition + return scroll, no ingress. Exactly the whole-card-nav contract. No change. (crit 2) |
| **telemetry** ([telemetry/runtime.ts](src/features/telemetry/runtime.ts), [signals.ts](src/features/transition/signals.ts)) | **Keep** | Blog already emits no `card_answered`, only internal signals. Single consent source. Must stay byte-identical (req-landing §14.4). (crit 5) |
| **i18n** (`readMore` message, `blog` namespace) | **Keep** | The `readMore` key is still the future `Read more →` label (Wave 8). No message change in Wave 7. (crit 2) |

**Net BQ-18 finding:** all six layers are **Keep**. Wave 7 is a *behavior rewire*, not a rebuild — the blog-navigation machinery already exists. The improvement candidates below concern **where** the blog/test divergence is expressed and **which semantic element** the blog trigger uses.

---

## 3. Improvement Candidates (BQ-19 fields)

> All candidates are behavior-scoped. Visual `Read more →` skin/reveal and blog hover skin are **Wave 8** and excluded.

| ID | Layer | Change magnitude | Improvement value (crit 1–5) | Risk / rollback | Wave dependency |
|---|---|---|---|---|---|
| **W7-LI-01** | hooks/component (render) | **Med** | Render blog primary trigger as semantic `<a>`/`<Link>` (navigation) while test keeps `<button>` (action). **5 (a11y, §9.2 correct semantic for URL navigation)**, 1 (idiomatic React). | Risk: must keep focus boundary = card-shell outer edge (§9.1) and avoid `<a>`-in-`<a>` (remove nested interactive `Read more`). Rollback: revert the trigger render branch. | Wave 8 styles the `<a>` + `Read more →`. |
| **W7-LI-02** | hooks | **Med** | Controller card-type gate: blog activation (desktop click / mobile tap / keyboard Enter-Space) calls the existing `beginBlogTransition` + landing visual lock (mirroring today's `handlePrimaryCtaClick` body, [controller:398-412](src/features/landing/grid/use-landing-interaction-controller.ts)) instead of `CARD_EXPAND` / `beginMobileOpen`. **2 (simplicity — blog drops all expand state)**, 4 (testability). | Risk: High-Risk file (`use-landing-interaction-controller.ts`); must not alter the test path. Reuses `src/features/transition/**` unchanged. Rollback: medium (one controller diff). | none beyond Wave 7. |
| **W7-LI-03** | hooks | **Med** | Suppress hover-expand and keyboard-expand for blog: hover landing on a blog card collapses any prior test expansion and does **not** expand blog ([hover:149-205](src/features/landing/grid/use-hover-intent-controller.ts)); Enter/Space on blog navigates rather than `CARD_EXPAND` ([keyboard:281-304](src/features/landing/grid/use-card-keyboard-handler.ts)). **5 (a11y — no spurious expand)**, 2. | Risk: High-Risk files (`use-hover-intent-controller.ts`, `use-keyboard-handoff.ts`); handoff-to-blog and test→blog hover edges must be verified; test handoff/cycling unaffected. Rollback: medium. | none. |
| **W7-LI-04** | component | **Med-High** | Remove the blog Expanded render branch from `landing-grid-card.tsx`: `ExpandedBlogBody`, blog `desktop-continuity` subtitle split ([:1006-1011](src/features/landing/grid/landing-grid-card.tsx)), blog branch of the mobile expanded body, and the now-dead `blogSubtitleSplit` plumbing. **2 (delete dead coupling)**, 3 (perf — drop per-frame blog subtitle measurement). | Risk: large diff in a 1291-line central file; must keep the test expanded path byte-identical; ensure 500-line guard respected (file shrinks). Rollback: medium. | Wave 8 re-introduces `Read more →` as a **normal tag-row label** (visual), not an expanded body. |
| **W7-LI-05** | hooks (mobile) | **Med** | Route blog mobile tap straight to navigation; blog never enters `useMobileCardLifecycle` (no transient shell, no scroll lock, no snapshot). **2 (simplicity)**, 3 (perf — no snapshot/observer for blog). | Risk: High-Risk file (`use-mobile-card-lifecycle.ts`); verify test mobile lifecycle untouched and `mobileLifecycleState` never owns a blog variant. Rollback: medium. | none. |

> **Wave-8 drift watch:** the *visible* `Read more →` (placement in tag row, desktop hover reveal, mobile always-visible — design §7.4) and the blog hover skin (sage border + focus-ring glow) are **excluded** from every candidate above. W7-LI-04 only removes the *behavioral* expanded path; it does **not** add the Wave 8 affordance. Consequence: between Wave 7 and Wave 8, blog cards navigate on whole-card click but show **no visible Read-more affordance** — see Open Question O1.

---

## 4. Preservation-Contract Checklist (must NOT change in Wave 7)

- [ ] **Test card expand/answer + single-expand** intact ([interaction-state.ts](src/features/landing/model/interaction-state.ts) `expandedCardVariant`, `CARD_EXPAND`) — guaranteed by keeping the reducer and gating only blog at the controller.
- [ ] **Test transition** still creates landing ingress + `card_answered` ([runtime.ts:54-67](src/features/transition/runtime.ts)); **blog still creates no test-style ingress and no `card_answered`** (req-landing §13.3, §14.4).
- [ ] **Blog article-identifier → destination** preserved: `card.variant` via `RouteBuilder.blogArticle` → `/{locale}/blog/{variant}`, resolved by route variant ([server-model.ts:26-38](src/features/blog/server-model.ts)); destination-ready/complete handshake ([blog-destination-client.tsx:46-90](src/features/blog/blog-destination-client.tsx)) unchanged — **rewired to whole-card, not broken.**
- [ ] **Mobile CTA-priority intent** (req-landing §8.6: CTA input precedes close, must resolve to `transition_start`) — for whole-card blog, the card body *is* the CTA; the tap must always navigate (no close/expand toggle).
- [ ] **Invalid / non-enterable blog → localized blog index redirect, no cross-article fallback** ([blog/[variant]/page.tsx:43-48](src/app/[locale]/blog/[variant]/page.tsx)) — route-level, untouched.
- [ ] **Resolver/registry/fixture boundary:** `resolveTestPreviewPayload` only; no raw fixture reads; blog cards via the registry resolver layer (project-rules §VariantRegistry).
- [ ] **Routing only via `RouteBuilder` + `buildLocalizedPath`**; no manual path strings (req-landing §5.4).
- [ ] **Single telemetry consent source** ([consent-source.ts](src/features/telemetry/consent-source.ts)); Vercel bridges unchanged.
- [ ] **i18n message ownership:** `readMore` key + `blog` namespace unchanged.
- [ ] **a11y:** primary trigger remains a semantic `<a>`/`<button>` (W7-LI-01 makes blog `<a>`); focus = card-shell outer boundary (§9.1); Esc precedence preserved.
- [ ] **`design.md` = visual intent only:** no blog visual/CTA styling, no `Read more →` skin/reveal (Wave 8).
- [ ] **No `globals.css` change** (Wave 16); **no visual-regression baseline regeneration** (BQ-07); `legacy/reference`, checkpoint worktrees, `docs/design/resources/superseded/**` read-only.

---

## 5. High-Risk Dimensions + Required E2E Coverage (AGENTS §4/§5)

**High-Risk files touched:** `use-landing-interaction-controller.ts`, `use-keyboard-handoff.ts` / `use-card-keyboard-handler.ts`, `use-hover-intent-controller.ts`, `use-mobile-card-lifecycle.ts`. (`src/features/transition/**` is reused **without modification** — keeping it off the change set reduces High-Risk surface. `landing-grid-card.tsx` is `src/features/landing/**` = modify-freely, but is the central render.)

| Candidate | Primary risk dimension |
|---|---|
| W7-LI-01 (semantic `<a>`) | a11y · design-system consistency |
| W7-LI-02 (controller nav gate) | usability · a11y |
| W7-LI-03 (suppress hover/keyboard expand) | a11y · usability |
| W7-LI-04 (remove blog expanded render) | responsiveness · performance |
| W7-LI-05 (blog out of mobile lifecycle) | usability · responsiveness |

**Mandatory E2E the implementation must run/add (min: routing smoke + transition-telemetry smoke):**

1. **routing-smoke** (`npm run test:e2e:smoke`): blog whole-card click navigates to `/{locale}/blog/{variant}`; blog index/detail **direct entry** unchanged; invalid + non-enterable (`burnout-risk`) **redirect** to blog index unchanged ([routing-smoke.spec.ts:196-234](tests/e2e/routing-smoke.spec.ts)).
2. **transition-telemetry-smoke:** blog whole-card click → source GNB persists until destination-ready; `transition_start`=1 / `transition_complete`=1; **`card_answered`=0**; return-scroll restored once. (Convert the three two-step blog tests to single whole-card click; remove/replace the mobile blog-expanded test.)
3. **a11y-smoke (new/updated):** blog primary trigger is a semantic `<a>`; keyboard Enter/Space activates navigation; focus boundary = card shell; no nested interactive control; axe-core clean.
4. **grid-smoke / state-smoke (new regression guard):** blog card stays `data-card-state="normal"` on hover/tap/focus — **no** `expandedShell`/`expandedBody`/`cardSubtitleExpanded` rendered for blog; test single-expand unaffected; handoff test→blog collapses the test card without expanding blog.
5. **mobile (new):** blog mobile tap navigates immediately; `mobileLifecycleState` never owns a blog variant; no transient shell / scroll lock for blog.
6. Basic gates in order: `npm run lint` → `npm run typecheck` → `npm test` → `npm run build`.

---

## 6. Open Questions / Ambiguities Needing a User Decision

- **O1 — Behavioral fate of `Read more →` in Wave 7 (before Wave 8 styling).**
  - (a, recommended) Remove the interactive `Read more` `<Link>` entirely; the whole-card `<a>` is the only nav element. The `Read more →` is re-introduced as a **non-interactive label in the normal tag row** in Wave 8. Consequence: blog cards have no visible Read-more affordance between Wave 7 and Wave 8 (behavior wave only).
  - (b) Keep a `Read more` element interactive somewhere in Wave 7. Rejected as it reintroduces nested-interactive / dead-state coupling and pre-empts Wave 8 placement.
- **O2 — Whole-card navigation mechanism.**
  - (a, recommended) Card trigger = `<Link href={blogArticle}>` with `onClick` → `beginBlogTransition` (+ landing visual lock) + `preventDefault()` (so the runtime's `router.push` performs nav after the pending-transition write). Gives semantic `<a>`, SSR href, right-/middle-click, and keyboard activation for free (§9.2), while preserving the pending-transition / return-scroll / `transition_start` bookkeeping.
  - (b) Keep `<button>` + programmatic `router.push`. Loses href semantics, right-click, and is weaker for a11y/SEO. Not recommended.
- **O3 — req-landing documentation sync (§3.2 single-change synchronization).** req-landing §8.6 ("Blog: Read more"), §13.3, and §14.4 name **Read more** as the blog transition trigger — that text describes pre-Wave-7 behavior. Under whole-card nav the trigger is the card body. Per §3.1 priority + BQ-02 the behavior is authorized, but should the Wave 7 change set also update §8.6/§13.3/§14.4 wording, or is the doc sync handled separately? (Needs a decision so the implementation prompt can scope doc edits.)
- **O4 — Mobile blog tap.** Confirm blog mobile tap navigates immediately with **no** mobile expanded lifecycle / transient shell (default per BQ-02 + roadmap "no test-like expansion"). This drops blog from `useMobileCardLifecycle` entirely (W7-LI-05).
- **O5 — Blog hover in Wave 7.** Confirm blog hover simply suppresses expansion with **no** visual change (the sage border + focus-ring glow hover skin from design §7.4 is deferred to Wave 8). Default: defer visual to Wave 8.

---

## 7. Recommended Wave 7 Implementation Approach Options (trade-offs)

- **Approach 1 — Controller-gated rewire (RECOMMENDED).** Bundle W7-LI-01…05: render blog trigger as `<a>`; controller gate routes blog activation to the existing `beginBlogTransition` + landing visual lock; suppress hover/keyboard/mobile expand for blog; remove the blog Expanded render branch. **Pros:** all six layers Keep; reuses `src/features/transition/**` unchanged; reducer/storage/telemetry untouched; confines change to controller + card render + tests. **Cons:** touches four High-Risk hooks with type-gates; needs careful handoff-to-blog and mobile-lifecycle exclusion verification.
- **Approach 2 — Card-render split + minimal controller.** Render blog as a self-contained `<Link>` card with no expand props; controller skips wiring expand handlers for blog. **Pros:** cleaner card/controller separation; less type-branching in the hooks. **Cons:** larger `landing-grid-card.tsx` refactor; risk of duplicating the card-shell markup; bigger render diff for a behavior wave.
- **Approach 3 — Keep expand machinery, hide blog expanded body (REJECTED).** Leave blog in the expand state machine but suppress the expanded body visually. **Cons:** violates "remove Blog Expanded path"; keeps dead coupling and the blog subtitle-split measurement; fails the §14.4/roadmap intent. Not recommended.

**Recommendation:** Approach 1 with candidate set **W7-LI-01, W7-LI-02, W7-LI-03, W7-LI-04, W7-LI-05**, contingent on O1=(a), O2=(a), O4=immediate-nav, O5=defer-visual, and an O3 decision on doc sync.

---

## 8. Gate Token (for Step 2)

After review, the Wave 7 implementation prompt must carry one of:

- `Logic Improvement: [W7-LI-01, W7-LI-02, W7-LI-03, W7-LI-04, W7-LI-05] approved — apply per analysis report 2026-06-03.` (or a subset), **or**
- `Logic Improvement: no candidates approved — preserve existing logic.`

Deferred candidates are logged in the Decision Register. This report writes no implementation plan and modifies no code — those belong to Step 2 after approval.
