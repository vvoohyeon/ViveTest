# Project Analysis

## 1. Current State At A Glance

This repository is a localized Next.js App Router application. Its real technical center of gravity is a landing-to-destination interaction system, not the full assessment product described in `docs/requirements.md`. The codebase is best understood as a polished V1 front-end interaction prototype with unusually mature contract discipline.

**Test suite (2026-03-28):**

- `npm test`: 28 unit test files / 111 tests — passes
- `npm run qa:static`: passes all phase checks (Phase 1 → 11)
- `npm run qa:gate:once`: passes
- Screenshot baselines: 168 theme-matrix PNGs, 5 Safari ghosting PNGs, 4 state-smoke PNGs — all present

---

## 2. Implementation Scope

### Substantially implemented

- Localized landing page with hero + catalog (`src/app/[locale]/page.tsx`)
- Landing catalog grid with desktop/mobile expansion behavior (`src/features/landing/grid/`)
- Global navigation shell (GNB) with theme switching, locale switching, keyboard/focus contract (`src/features/landing/gnb/site-gnb.tsx`)
- Landing-to-destination transition handshake with sessionStorage persistence and timeout/cancel semantics (`src/features/landing/transition/`)
- Consent-gated telemetry with anonymous session ID, event queueing, and Vercel analytics bridge (`src/features/landing/telemetry/`)
- Proxy-level locale normalization and SSR `<html lang>` correctness (`src/proxy.ts`, `src/i18n/`)
- Blog destination with article list and selected-article view (`src/features/landing/blog/blog-destination-client.tsx`)

### Partially implemented

| Area | What exists | What's missing |
|---|---|---|
| Test destination | Instruction overlay, 4-question flow, answer state, dwell tracking, result panel, `attempt_start` / `final_submit` telemetry | Schema-driven scoring, variant registry, shareable result URL, durable session. Current runtime is a provisional compatibility shell retained by Phase 0 ADR; clean-room replacement is owned by the first Phase 1 changeset |
| Test variant model | String ids in fixtures, format-only URL validation | Domain-level validation, blocking on unknown variant |
| Blog destination | Selected-article view, article list | Article-specific route, content source beyond fixtures |

### Placeholder only

- `src/app/[locale]/history/page.tsx` — renders localized shell text and current locale; no functionality
- Preferences button in `src/features/landing/shell/telemetry-consent-banner.tsx` — click handler is a no-op
- `src/app/layout.tsx` root metadata — title is `ViveTest`, description is still `Reset baseline placeholder`

### Entirely absent

The following product surfaces from `docs/requirements.md` have no implementation in `src`:

- `/result` route family and share payload reconstruction
- Local result history store, delete/clear UI
- Admin routes and auth boundary
- Google Sheets sync pipeline (no client dependency, no sync script, no generated registry)
- EGTT variant — `egtt`, `axisCount`, `qualifierFields`, `derivedType` appear only in docs
- Invalid-variant recovery page
- Server-side telemetry validation or persistence
- Profile question type (no `questionType`, scoring/profile split, or qualifier-field structure in `src/features/landing/data/types.ts`)

---

## 3. Architecture

### 3.1 Layered Structure

| Layer | Responsibility |
|---|---|
| `src/proxy.ts` + `src/i18n/` | Request normalization, locale resolution, `X-NEXT-INTL-LOCALE` injection |
| `src/app/layout.tsx` | Document structure, global CSS, theme bootstrap, Vercel analytics gates |
| `src/app/[locale]/layout.tsx` | Locale validation, `NextIntlClientProvider`, `TransitionRuntimeMonitor` |
| `src/app/[locale]/**/page.tsx` | Thin server components — load translations, validate params, hand off to `PageShell` + client |
| `src/features/landing/` | **Shared application runtime** — grid, GNB, transition, telemetry, shared shell, blog destination |
| `src/features/test/` | Canonical test destination surface — route, unit test, and QA consumers all resolve here for question bootstrap/runtime and question-bank resolution. The current runtime remains a provisional compatibility shell until the Phase 1 clean-room prelude, and the old `src/features/landing/test/*` implementation path has been removed without shims |
| `src/config/site.ts` | Locale set definition |
| `src/lib/routes/route-builder.ts` + `src/i18n/localized-path.ts` | Locale-free route authoring + locale prefix application |

`src/features/landing` remains the de facto platform namespace for shared runtime concerns. The canonical test surface now lives in `src/features/test`, but it still depends on landing-owned transition, telemetry, shell, and catalog seams. This is still a V1 compromise and will become strained when result/history/admin surfaces arrive.

Three directories exist as scaffold only and contain no implementation files: `src/components`, `src/hooks`, `src/lib/landing`.

### 3.2 Module Flow

```
Request
  └─ src/proxy.ts → src/i18n/proxy-policy.ts
       ├─ locale-less paths → redirect to localized
       ├─ duplicate prefix → rewrite to /_not-found
       └─ pass-through → Next.js route tree

Route tree
  └─ src/app/layout.tsx (document, theme-bootstrap.js)
       └─ src/app/[locale]/layout.tsx (locale, messages, TransitionRuntimeMonitor)
            ├─ src/app/[locale]/page.tsx
            │    └─ LandingRuntime + LandingCatalogGridLoader
            │         ├─ src/features/landing/data/raw-fixtures.ts (content source)
            │         ├─ src/features/landing/data/adapter.ts (normalization)
            │         ├─ src/features/landing/grid/use-landing-interaction-controller.ts
            │         └─ src/features/landing/grid/landing-catalog-grid.tsx
            ├─ src/app/[locale]/blog/page.tsx → blog-destination-client.tsx
            ├─ src/app/[locale]/test/[variant]/page.tsx → src/features/test/test-question-client.tsx
            └─ src/app/[locale]/history/page.tsx (placeholder)

Shared page wrapper (all localized routes)
  └─ src/features/landing/shell/page-shell.tsx
       ├─ TransitionGnbOverlay
       ├─ SiteGnb
       ├─ <main>
       └─ TelemetryConsentBanner

Telemetry
  └─ src/features/landing/telemetry/consent-source.ts (single consent gate)
       ├─ src/features/landing/telemetry/runtime.ts (queue, session, flush)
       ├─ src/app/vercel-analytics-gate.tsx
       └─ src/app/vercel-speed-insights-gate.tsx
```

---

## 4. Route and Request Flow

### 4.1 Route Surface

Effective route tree confirmed by 2026-03-28 build output:

```
/_not-found              (static prerender)
/[locale]                (dynamic)
/[locale]/blog           (dynamic)
/[locale]/history        (dynamic)
/[locale]/test/[variant] (dynamic)
/api/telemetry           (dynamic)
```

There is an empty scaffold directory at `src/app/[locale]/test/[variant]/question` but no route file under it.

### 4.2 Supported Locales

Defined in `src/config/site.ts`: `en`, `kr`, `zs`, `zt`, `ja`, `es`, `fr`, `pt`, `de`, `hi`, `id`, `ru`

All 12 locale files in `src/messages/` are complete with the same 6 namespaces: `gnb`, `landing`, `test`, `blog`, `history`, `consent`. UI chrome is handled by these files; future test/content localization is expected to come from a separate data source.

### 4.3 Proxy Contract

- Locale-less app-owned paths → 307 redirect to localized equivalent
- Duplicate locale prefix (e.g. `/en/en/...`) → rewrite to `/_not-found`
- `/_next`, `/api`, file-like assets, `/favicon.ico`, `/robots.txt`, `/sitemap.xml` → bypassed by `src/i18n/locale-resolution.ts`
- Locale family normalization: `ko* → kr`, Simplified Chinese → `zs`, Traditional Chinese → `zt`

### 4.4 SSR Locale Correctness

The proxy injects `X-NEXT-INTL-LOCALE`. `src/app/layout.tsx` reads it to set `<html lang>` on initial server response. `src/i18n/locale-html-lang-sync.tsx` reconciles it client-side on navigation. Locale correctness does not depend on client hydration alone.

`src/app/[locale]/layout.tsx` exports `dynamicParams = false` and uses `generateStaticParams()` from the locale list, making the locale parameter surface explicit and preventing hidden permutations.

---

## 5. Core Subsystems

### 5.1 Landing Interaction Runtime

The most technically distinctive part of the codebase. Several focused pure modules:

- `src/features/landing/model/interaction-state.ts` — page/card/hover-lock state transitions
- `src/features/landing/grid/layout-plan.ts` — row plans
- `src/features/landing/grid/spacing-plan.ts` — row-local compensation
- `src/features/landing/grid/mobile-lifecycle.ts` — mobile expansion phases
- `src/features/landing/grid/desktop-shell-phase.ts` — visual shell phases

Coordinated by:

- `src/features/landing/grid/use-landing-interaction-controller.ts` — **1582 lines**, runtime state machine for focus, hover intent, keyboard handoff, reduced motion, page visibility, mobile transient shells, backdrop gestures, transition start/cancel
- `src/features/landing/grid/landing-catalog-grid.tsx` — DOM geometry measurement, row baseline freezing, `requestAnimationFrame` timing

State transitions are named and centralized; timing constants are explicit. The main risk is operational complexity under future browser, content-density, or performance changes. `motion@12.34.0` is installed but not imported anywhere in `src` or `tests`; the motion system is entirely CSS- and data-attribute-driven.

### 5.2 GNB

`src/features/landing/gnb/site-gnb.tsx` — **~791 lines** — does far more than render nav links. It owns: desktop settings hover, click/focus fallback, mobile menu choreography, route-aware back behavior, locale switching, theme switching, landing-specific keyboard entry order, and focus return semantics.

Key supporting files: `src/features/landing/gnb/behavior.ts`, `src/features/landing/gnb/types.ts` (defines `GnbContext` per route: landing/blog/history/test), `src/features/landing/gnb/hooks/`.

Theme subsystem: `public/theme-bootstrap.js` (sets before hydration from `localStorage`), `src/features/landing/gnb/hooks/use-theme-preference.ts` (persists manual overrides), `src/features/landing/gnb/hooks/theme-transition.ts` (2500ms blur-circle View Transition API, with reduced-motion fallback).

`src/features/landing/shell/page-shell.tsx` mounts the GNB for every localized route — it is a shared runtime controller, not a page-local header.

### 5.3 Catalog Data Model

Source: `src/features/landing/data/raw-fixtures.ts`

Current fixture inventory:
- 9 total cards (6 test, 3 blog)
- 7 available, 2 unavailable, 1 debug/sample
- Available test variant ids: `qmbti`, `rhythm-b`, `debug-sample`, `energy-check`
- Available blog article ids: `ops-handbook`, `build-metrics`, `release-gate`

`src/features/landing/data/adapter.ts` centralizes locale fallback (active → `defaultLocale` → `default` → first non-empty), malformed-value normalization, and debug/sample filtering. It exposes a `{audience: 'qa'}` escape hatch that preserves debug fixtures the end-user catalog hides.

The adapter normalizes silently (empty strings, zeroed metadata) where `docs/requirements.md` describes blocking validation. This divergence will become critical once fixtures are replaced by a remote data source.

Active e2e representative variant: `test-qmbti` / `qmbti` (pinned in `tests/e2e/helpers/landing-fixture.ts` and `theme-matrix-manifest.json`). `rhythm-a` strings appear in unit tests only as synthetic identifiers.

### 5.4 Transition Runtime

Landing-to-destination handshake: `src/features/landing/transition/use-landing-transition.ts` converts CTA clicks into localized route pushes. Before navigation, `src/features/landing/transition/runtime.ts` writes `PendingLandingTransition` to `sessionStorage`, records return scroll state, and optionally records landing ingress for test cards.

On the destination side, `src/features/landing/transition/transition-runtime-monitor.tsx` enforces a **1600ms timeout**. `TransitionGnbOverlay` keeps a landing-context GNB visible during pending transition for visual continuity. `LandingRuntime` restores scroll on return and cancels stale transitions with `USER_CANCEL`.

Result reasons: `USER_CANCEL`, `DUPLICATE_LOCALE`, `DESTINATION_TIMEOUT`, `DESTINATION_LOAD_ERROR`, `BLOG_FALLBACK_EMPTY`, `UNKNOWN`. Cleanup is centralized in `rollbackLandingTransition()`.

Limitation: all persistence is session-scoped and client-only. No server correlation, no durable transition history.

### 5.5 Destination Bootstrap

**Blog** (`src/features/landing/blog/blog-destination-client.tsx`): resolves selected article from transition payload, falls back to first available article, terminates with `BLOG_FALLBACK_EMPTY` if no articles exist.

**Test** (`src/features/test/test-question-client.tsx`): instruction gating, landing-ingress starts user at Q2, dwell time tracking, `attempt_start` / `final_submit` telemetry. The page is designed around entry semantics and telemetry correctness, not test logic. Phase 0 closed only the clean-room scope/timing/interface decision, so this file remains a provisional compatibility shell until the Phase 1 clean-room prelude.

Closing Phase 0 ADR-A did **not** require source edits to `src/features/test/test-question-client.tsx`, `src/features/test/question-bank.ts`, or `src/app/[locale]/test/[variant]/page.tsx`. Those files are frozen as documentation-defined compatibility boundaries only, and the actual runtime replacement remains Phase 1 work.

`src/features/test/question-bank.ts` builds Q1 from the selected card when possible; Q2–4 are generic locale fallbacks; unknown variants still get generic questions instead of a blocking error. No variant registry and no schema-driven scoring exist in current source. This generic fallback is intentionally retained in Phase 0 and is scheduled to be removed together with invalid-variant recovery wiring in the first Phase 4 changeset. Same-route recoverable invalid-variant handling does not exist yet and belongs to that same Phase 4 recovery step.

### 5.6 Telemetry

`src/features/landing/telemetry/consent-source.ts` — single consent gate for both custom telemetry and Vercel analytics, synchronized to `localStorage`, bridges cross-tab changes via browser `storage` event.

`src/features/landing/telemetry/runtime.ts` — event queueing, anonymous session ID generation, `landing_view` deduplication by `locale:route`, consent-aware flush. Only session ID is persisted; event queue is in memory.

`src/features/landing/telemetry/validation.ts` — rejects PII-shaped keys and legacy fields (`transition_id`, `result_reason`, `final_q1_response`).

**Active event surface:**

| Event | Required fields |
|---|---|
| `landing_view` | deduplicated by locale:route |
| `card_answered` | `source_card_id`, `target_route`, `landing_ingress_flag=true` |
| `attempt_start` | `variant`, `question_index_1based`, `dwell_ms_accumulated`, `landing_ingress_flag` |
| `final_submit` | same as above + `final_responses` (semantic `A`/`B` codes only) |

`src/app/api/telemetry/route.ts` accepts any parseable JSON and returns `204`. No server-side schema validation, field rejection, or persistence. All guarantees are client-side only.

---

## 6. Runtime Contracts and Storage

Storage key changes should be treated as runtime-contract changes, not implementation details.

The key lists below describe the live prototype. Phase 0 fixed the future test-flow storage topology in documentation as `test:{variant}:...` plus `test:{variant}:flag:{flagName}`, but runtime key migration has not happened yet, so the current keys and the future Phase 3 contract should not be conflated.

**localStorage keys:**
- `vivetest-theme`
- `vivetest-current-path`
- `vivetest-previous-path`
- `vivetest-telemetry-consent`
- `vivetest-telemetry-session-id`

**sessionStorage keys:**
- `vivetest-landing-pending-transition`
- `vivetest-landing-return-scroll-y`
- `vivetest-landing-return-card-id`
- `vivetest-test-instruction-seen:{variant}`
- `vivetest-landing-ingress:{variant}`

**Browser events emitted:**
- `landing:transition-signal`
- `landing:transition-store-change`
- `landing:transition-cleanup`

**Prototype behaviors that are easy to miss:**

- Landing ingress is consumed exactly once: deep-link `/test` entry starts at Q1 without `card_answered` or `transition_start`; landing-ingress entry starts at Q2.
- `card_answered` fires at transition start for test cards — telemetry can record ingress intent even when the destination later fails closed.
- Blog destination always resolves an article (silent fallback to first available).
- Test variant URL segment validation is format-only, not registry-backed.
- `history` page shares the full landing shell and GNB but is a non-functional placeholder.
- Preferences button in the consent banner is a visible no-op.

---

## 7. Testing and Quality Gates

Phase 0 closure was judged against `qa:gate:once` returning GREEN. The breakdown below explains the assets and checks that make up that gate, rather than serving only as a generic test inventory.

### 7.1 Unit Tests (Vitest)

Scoped to `tests/unit/`. Covers: reducers, route helpers, localization helpers, telemetry validation, transition storage, card/data contracts, GNB message labels.

### 7.2 E2E Tests (Playwright)

9 spec files in `tests/e2e/`:

| Spec | Contract covered |
|---|---|
| `routing-smoke.spec.ts` | Locale-prefix redirects, not-found split, SSR `<html lang>`, zero hydration warnings |
| `gnb-smoke.spec.ts` | Desktop/mobile shell behavior, keyboard traversal matrices, theme-transition fallback |
| `grid-smoke.spec.ts` | Row planning, underfilled-row rules, spacing compensation, baseline freeze, geometry invariants |
| `state-smoke.spec.ts` | Keyboard-sequential traversal, overlay focus, mobile keyboard handoff, reduced-motion |
| `a11y-smoke.spec.ts` | AxeBuilder audits for landing, GNB-open, transition-overlay, KR representative state |
| `consent-smoke.spec.ts` | Consent-banner copy, accept/deny persistence, mobile action-stack layout |
| `theme-matrix-smoke.spec.ts` | 168 representative theme/layout/state screenshots (96 layout + 72 state) |
| `safari-hover-ghosting.spec.ts` | WebKit-only hover/shadow seam regression (5 baselines) |
| `transition-telemetry-smoke.spec.ts` | Landing ingress, transition signals, timeout/load-error/cancel closure, scroll restore, payload hygiene |

Helper layer: `tests/e2e/helpers/landing-fixture.ts` is the single source of truth for the representative test-route anchor via `PRIMARY_AVAILABLE_TEST_CARD_ID` / `PRIMARY_AVAILABLE_TEST_VARIANT`; `helpers/consent.ts` seeds consent deterministically; `helpers/axe.ts` formats Axe violations.

The theme-matrix suites assume the combined theme label remains locked to the messages JSON wording family (`Language ⋅ Theme`); changing that label without updating the visual/message contract is a release-gate drift risk.

Theme-matrix, Safari ghosting, and related screenshot PNG baselines are local QA assets. Local baseline directory completeness matters for gate confidence, but Git-tracked PNG completeness and committing every generated PNG were not Phase 0 acceptance requirements.

### 7.3 Custom QA Scripts (`scripts/qa/`)

`qa:rules` runs 10 phase checks:

| Script | Contract enforced |
|---|---|
| `check-phase1-contracts.mjs` | `proxy.ts` as single entry point; all pages under `src/app/[locale]/**`; SSR-sensitive folders free of browser APIs |
| `check-phase4-grid-contracts.mjs` | Grid structure invariants |
| `check-phase5-card-contracts.mjs` | Card contract surface |
| `check-phase6-spacing-contracts.mjs` | Spacing compensation rules |
| `check-phase7-state-contracts.mjs` | Page-state transition rules |
| `check-phase8-accessibility-contracts.mjs` | Canonical accessibility coverage |
| `check-phase9-performance-contracts.mjs` | Hydration/performance contracts |
| `check-phase10-transition-contracts.mjs` | Transition correlation and closure |
| `check-phase11-telemetry-contracts.mjs` | Telemetry surface + `PRIMARY_AVAILABLE_TEST_VARIANT` + theme-matrix screenshot closure |
| `check-blocker-traceability.mjs` | All blockers in `docs/blocker-traceability.json` anchored to their declared evidence surfaces |

`docs/blocker-traceability.json` spans blockers `1..30`, mixing `automated_assertion`, `scenario_test`, and `manual_checkpoint` evidence kinds.

Test-flow blockers 20~30 now anchor directly in `docs/req-test.md` §12.2 rather than a separate checkpoint document; the registry remains the machine-readable source for current evidence kind and file mapping.

**Release gate:** `qa:gate:once` = static checks + build + unit tests + Playwright smoke. `qa:gate` repeats the pipeline three times for flake detection.

**Least verified areas** correspond directly to unimplemented product surfaces: scoring correctness, result semantics, history persistence, backend ingestion guarantees, data-source synchronization.

---

## 8. Task Entry Guide

### Routing / locale / not-found
`src/proxy.ts` · `src/i18n/locale-resolution.ts` · `src/i18n/proxy-policy.ts` · `src/i18n/routing.ts` · `src/app/layout.tsx` · `src/app/[locale]/layout.tsx` · `src/app/global-not-found.tsx` · `src/app/not-found.tsx` · `tests/e2e/routing-smoke.spec.ts`

### Landing grid / layout / interaction
`src/features/landing/grid/use-landing-interaction-controller.ts` · `src/features/landing/grid/landing-catalog-grid.tsx` · `src/features/landing/model/interaction-state.ts` · `src/features/landing/grid/layout-plan.ts` · `src/features/landing/grid/spacing-plan.ts` · `tests/e2e/grid-smoke.spec.ts` · `tests/e2e/state-smoke.spec.ts`

### GNB / theme / shared shell
`src/features/landing/gnb/site-gnb.tsx` · `src/features/landing/gnb/hooks/use-theme-preference.ts` · `src/features/landing/gnb/hooks/theme-transition.ts` · `public/theme-bootstrap.js` · `src/features/landing/shell/page-shell.tsx` · `tests/e2e/gnb-smoke.spec.ts` · `tests/unit/gnb-message-labels.test.ts`

### Transition / destination continuity / return-restore
`src/features/landing/transition/runtime.ts` · `src/features/landing/transition/store.ts` · `src/features/landing/transition/signals.ts` · `src/features/landing/transition/transition-runtime-monitor.tsx` · `src/features/landing/transition/use-pending-landing-transition.ts` · `src/features/landing/landing-runtime.tsx` · `tests/e2e/transition-telemetry-smoke.spec.ts`

### Telemetry / consent
`src/features/landing/telemetry/runtime.ts` · `src/features/landing/telemetry/validation.ts` · `src/features/landing/telemetry/consent-source.ts` · `src/app/api/telemetry/route.ts` · `src/app/vercel-analytics-gate.tsx` · `scripts/qa/check-phase11-telemetry-contracts.mjs` · `tests/e2e/consent-smoke.spec.ts`

### Screenshot baseline / representative fixture
`tests/e2e/theme-matrix-manifest.json` · `tests/e2e/theme-matrix-smoke.spec.ts` · `tests/e2e/helpers/landing-fixture.ts` · `tests/e2e/safari-hover-ghosting.spec.ts`

### Test domain completion (next major product work)
`src/features/test/test-question-client.tsx` · `src/features/test/question-bank.ts` · `docs/req-test.md` · `docs/req-test-plan.md`

### Data model / fixture contract
`src/features/landing/data/raw-fixtures.ts` · `src/features/landing/data/adapter.ts` · `src/features/landing/data/types.ts` · `src/features/landing/data/fixture-contract.ts`

---

## 9. Risks and Open Gaps

**Test domain foundation is absent.** No variant registry, no schema-driven scoring, no result derivation, no invalid-variant recovery route, no result history. The current shell is sophisticated enough that further feature layering without this foundation will amplify complexity faster than it increases product completeness.

**Landing interaction runtime is a scaling risk.** `use-landing-interaction-controller.ts` at 1582 lines mixes geometry measurement, `requestAnimationFrame` sequencing, hover timers, and mobile shell phases. Powerful but fragile under content-density or browser changes. The most likely future refactoring cost concentration point.

**Data validation is tolerant where requirements call for blocking.** `src/features/landing/data/adapter.ts` normalizes silently; `docs/requirements.md` and `docs/req-test-plan.md` describe blocking failures for malformed data. This mismatch becomes critical once static fixtures are replaced by a remote data source.

**Telemetry server authority is missing.** `src/app/api/telemetry/route.ts` returns `204` on any parseable JSON. Schema enforcement, forbidden-field rejection, and persistence exist only on the trusted client path.

**`src/features/landing` namespace is overburdened.** Blog, test, GNB, telemetry, and transition concerns are all colocated here. Workable for V1, but the boundary will need restructuring as result/history/admin surfaces arrive. Two files stand out as the primary pressure points: `use-landing-interaction-controller.ts` (1582 lines) and `site-gnb.tsx` (~791 lines).

**Current red status is narrow but real.** One failing assertion in `tests/unit/gnb-message-labels.test.ts` (spacing around `⋅` separator in locale JSON). Low severity, but it signals that locale message files, unit contracts, and analysis documents need to be kept synchronized as small product decisions land.

**Tech stack notes:**
- `next@16.1.6`, `react@19.2.4`, `next-intl@4.8.3`
- `motion@12.34.0` installed but not imported anywhere — either abandoned direction or future migration path
- Tailwind v4 packages installed but runtime is primarily `src/app/globals.css`
