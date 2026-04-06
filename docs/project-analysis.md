# Project Analysis

## 1. Current State At A Glance

This repository is a localized Next.js App Router application. Its real technical center of gravity is a landing-to-destination interaction system plus a fixture-backed, policy-driven test-entry shell, not the full assessment product described in `docs/requirements.md`. The codebase is best understood as a V1 front-end interaction prototype with mature contract coverage in landing, transition, consent, and telemetry seams, plus a separate pure test-domain foundation that is only partially wired into the user-facing runtime.

**Workspace verification (2026-04-04):**

- `npm test -- --run`: 34 unit test files / 144 tests — passes
- `npx playwright test --grep @smoke --list`: 271 smoke tests in 9 files — listed
- `npm run qa:rules`: fails at Phase 11 because theme-matrix and Safari ghosting PNG baselines are absent
- Snapshot baseline status: theme-matrix and Safari ghosting PNG baselines are absent in the current workspace; only 2 `state-smoke` PNGs are present

**Implementation phase status (2026-04-06):** Phase 0 pre-requisite ADRs are all complete — ADR-A (`src/features/test` namespace separation), ADR-B (storage key contract and 5-flag topology), ADR-E (representative variant QA baseline). Phase 1 Domain Foundation is complete: all seven files under `src/features/test/domain/` exist, dedicated unit tests pass, and blockers #7/#11/#12/#27 are mapped in `docs/blocker-traceability.json`. Key contracts frozen by Phase 0–1: `VariantId` and `QuestionIndex` intersection brand types, `validateVariant()` three-way result union shape, `BlockingDataErrorReason` enum surface. Modifying these requires a new ADR. The live route/runtime does not yet consume the domain module; that wiring is Phase 4 scope. See `docs/req-test-plan.md` for the full Phase roadmap and ADR decision records.

---

## 2. Implementation Scope

### Substantially implemented

- Localized landing page with hero + catalog (`src/app/[locale]/page.tsx`)
- Landing catalog grid with desktop/mobile expansion behavior (`src/features/landing/grid/`)
- Global navigation shell (GNB) with theme switching, locale switching, keyboard/focus contract (`src/features/landing/gnb/site-gnb.tsx`)
- Landing-to-destination transition handshake with sessionStorage persistence and timeout/cancel semantics (`src/features/landing/transition/`)
- Consent-gated telemetry with anonymous session ID, event queueing, and Vercel analytics bridge (`src/features/landing/telemetry/`)
- Proxy-level locale normalization and SSR `<html lang>` correctness (`src/proxy.ts`, `src/i18n/`)
- Blog index/list route plus route-driven article detail (`src/features/landing/blog/blog-destination-client.tsx`, `src/app/[locale]/blog/[variant]/page.tsx`)
- Pure test-domain foundation for schema validation and derivation utilities: `validateVariant`, `validateQuestionModel`, `validateVariantDataIntegrity`, `computeScoreStats`, `deriveDerivedType`, `parseTypeSegment`, `buildTypeSegment`, plus `VariantSchema` / `ScoringSchema` / `QuestionType` / `QualifierFieldSpec` types (`src/features/test/domain/`). Key interface contracts are frozen by Phase 0–1 ADRs (brand type shapes, `validateVariant()` result union, `BlockingDataErrorReason` enum). The live route/runtime does not import this module; wiring is Phase 4 scope.

### Partially implemented

| Area | What exists | What's missing |
|---|---|---|
| Test destination | Policy-driven instruction overlay keyed by ingress type + consent state + `attribute`, variant-scoped instruction copy from the canonical registry, 4-question flow, answer state, dwell tracking, result panel, `attempt_start` / `final_submit` telemetry | Result route family, shareable payload reconstruction, durable session/history, and schema-driven result rendering are not implemented. Current runtime is still a compatibility shell around entry semantics and registry-backed question data |
| Test domain integration | Pure domain validators, integrity checks, derivation helpers, and type-segment parsing/building exist under `src/features/test/domain/` and are covered by dedicated unit tests | The current route/runtime does not import these domain modules yet, so schema-driven scoring and qualifier-aware result flow are not wired into `/[locale]/test/[variant]` |
| Blog destination | List-only index route, variant-keyed article detail route, article list | Content source beyond fixtures |

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
- Invalid-variant recovery page (Phase 4 scope — `validateVariant()` ok:false → §6.1 recovery page wiring, same-route recoverable handling)
- Server-side telemetry validation or persistence

The following capabilities exist only as pure test-domain implementation today and are not yet connected to the live route/runtime:

- EGTT-like qualifier-bearing schemas in unit-tested domain helpers, but no runtime fixture, route, or result UI that surfaces them to end users
- `questionType`, scoring/profile split, `axisCount`, `qualifierFields`, `derivedType`, and related schema validation/derivation logic in `src/features/test/domain/`, but no user-facing result flow that consumes them

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
| `src/features/test/` | Canonical test destination surface — route/runtime shell, instruction entry policy, overlay composition, question bootstrap, and question-bank resolution |
| `src/features/test/domain/` | Pure domain module — branded ids, question/schema models, variant validation, integrity checks, score derivation, and type-segment parsing/building |
| `src/config/site.ts` | Locale set definition |
| `src/lib/routes/route-builder.ts` + `src/i18n/localized-path.ts` | Locale-free route authoring + locale prefix application |

`src/features/landing` remains the de facto platform namespace for shared runtime concerns. The canonical test surface now lives in `src/features/test`, but its user-facing runtime still depends on landing-owned transition, telemetry, shell, and catalog seams. Separately, `src/features/test/domain/*` already models the future schema-driven test flow, but the current route/runtime does not consume it yet.

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
            │         ├─ src/features/variant-registry/source-fixture.ts (fixture-backed source rows)
            │         ├─ src/features/variant-registry/variant-registry.generated.ts (fixture-backed runtime registry)
            │         ├─ src/features/variant-registry/resolvers.ts (registry loader + resolver boundary)
            │         ├─ src/features/variant-registry/attribute.ts (attribute helpers)
            │         ├─ src/features/landing/grid/use-landing-interaction-controller.ts
            │         └─ src/features/landing/grid/landing-catalog-grid.tsx
            ├─ src/app/[locale]/blog/page.tsx (list-only blog index)
            ├─ src/app/[locale]/blog/[variant]/page.tsx (route-keyed blog detail)
            ├─ src/app/[locale]/test/[variant]/page.tsx
            │    ├─ resolveLandingTestCardByVariant(locale, variant) → notFound on miss
            │    └─ src/features/test/test-question-client.tsx
            │         ├─ src/features/test/entry-policy.ts
            │         ├─ src/features/test/instruction-overlay.tsx
            │         └─ src/features/test/question-bank.ts
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

Separately, `src/features/test/domain/*` exposes pure helpers for future schema-driven test flow:

- `types.ts` / `index.ts` — branded ids, schema, question, and payload interfaces
- `validate-variant.ts` — registered/available variant validation
- `validate-question-model.ts` / `validate-variant-data-integrity.ts` — question-model and schema integrity checks
- `derivation.ts` — `computeScoreStats()` and `deriveDerivedType()`
- `type-segment.ts` — `parseTypeSegment()` and `buildTypeSegment()`

These files are exercised by `tests/unit/test-domain-*.test.ts`, but the current route/runtime path does not import them yet.

---

## 4. Route and Request Flow

### 4.1 Route Surface

Current route files under `src/app/` expose the following application surface:

```
/[locale]                (dynamic)
/[locale]/blog           (dynamic)
/[locale]/blog/[variant] (dynamic)
/[locale]/history        (dynamic)
/[locale]/test/[variant] (dynamic)
/api/telemetry           (dynamic)
```

Segment/global 404 handling is implemented through `src/app/not-found.tsx` and `src/app/global-not-found.tsx`, not through a dedicated user-facing page route file.

### 4.2 Supported Locales

Defined in `src/config/site.ts`: `en`, `kr`, `zs`, `zt`, `ja`, `es`, `fr`, `pt`, `de`, `hi`, `id`, `ru`

All 12 locale files in `src/messages/` are complete with the same 6 namespaces: `gnb`, `landing`, `test`, `blog`, `history`, `consent`. Shared UI chrome, CTA labels, and generic consent-note copy are handled by these files. Variant-specific test instruction copy is now fixture-backed through `src/features/variant-registry/source-fixture.ts` and consumed through the registry resolver boundary.

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

State transitions are named and centralized; timing constants are explicit. The main risk is operational complexity under future browser, content-density, or performance changes. `motion@12.34.0` is installed but not imported anywhere in `src` or `tests`; the live motion system is still entirely CSS- and data-attribute-driven, and any package adoption should stay aligned with `docs/req-landing.md` §8.3 Core Motion Contract.

### 5.2 GNB

`src/features/landing/gnb/site-gnb.tsx` — **~791 lines** — does far more than render nav links. It owns: desktop settings hover, click/focus fallback, mobile menu choreography, route-aware back behavior, locale switching, theme switching, landing-specific keyboard entry order, and focus return semantics.

Key supporting files: `src/features/landing/gnb/behavior.ts`, `src/features/landing/gnb/types.ts` (defines `GnbContext` per route: landing/blog/history/test), `src/features/landing/gnb/hooks/`.

Theme subsystem: `public/theme-bootstrap.js` (sets before hydration from `localStorage`), `src/features/landing/gnb/hooks/use-theme-preference.ts` (persists manual overrides), `src/features/landing/gnb/hooks/theme-transition.ts` (2500ms blur-circle View Transition API, with reduced-motion fallback).

`src/features/landing/shell/page-shell.tsx` mounts the GNB for every localized route — it is a shared runtime controller, not a page-local header.

### 5.3 Catalog Data Model

Source: `src/features/variant-registry/source-fixture.ts`

Current fixture inventory:
- 10 total cards (7 test, 3 blog)
- Test card attributes: 2 `available`, 1 `opt_out`, 2 `unavailable`, 1 `hide`, 1 `debug`
- Blog card attributes: 3 `available`
- Publicly enterable test variant ids: `qmbti`, `rhythm-b`, `energy-check`
- Blog variants: `ops-handbook`, `build-metrics`, `release-gate`

`src/features/variant-registry/attribute.ts` now owns `attribute` normalization and the helper surface that matters to the rest of the app: `deriveAvailability()`, `isEnterableCard()`, `isCatalogVisibleCard()`, and `isUnavailablePresentation()`.

`src/features/variant-registry/resolvers.ts` centralizes locale fallback (active → `defaultLocale` → `default` → first non-empty), consent-aware catalog filtering, strict variant lookup, and the `resolveTestPreviewPayload()` boundary. `src/features/variant-registry/builder.ts` validates source rows, sorts by `seq`, drops `seq` from the exported runtime registry, and emits separate `landingCards` / `testPreviewPayloadByVariant` runtime stores. The resolver layer still exposes a `{audience: 'qa'}` escape hatch that preserves `hide` / `debug` fixtures the end-user catalog hides.

The current builder still relies on fixture-backed localized copy and the temporary bridge where inline Q1 preview is temporary until Questions Q1 migration. That bridge is now isolated to `resolveTestPreviewPayload()` so the rest of the runtime does not read preview source fields directly.

Active e2e representative anchors now use canonical landing variants directly: `PRIMARY_AVAILABLE_TEST_VARIANT` (`qmbti`) and `PRIMARY_OPT_OUT_TEST_VARIANT` (`energy-check`). Theme-matrix screenshots still key off the available representative route.

### 5.4 Transition Runtime

Landing-to-destination handshake: `src/features/landing/transition/use-landing-transition.ts` converts CTA clicks into localized route pushes. Before navigation, `src/features/landing/transition/runtime.ts` writes `PendingLandingTransition` to `sessionStorage`, records return scroll state, and optionally records landing ingress for test cards.

On the destination side, `src/features/landing/transition/transition-runtime-monitor.tsx` enforces a **1600ms timeout**. `TransitionGnbOverlay` keeps a landing-context GNB visible during pending transition for visual continuity. `LandingRuntime` restores scroll on return and cancels stale transitions with `USER_CANCEL`.

Result reasons: `USER_CANCEL`, `DUPLICATE_LOCALE`, `DESTINATION_TIMEOUT`, `DESTINATION_LOAD_ERROR`, `UNKNOWN`. Cleanup is centralized in `rollbackLandingTransition()`.

Limitation: all persistence is session-scoped and client-only. No server correlation, no durable transition history.

### 5.5 Destination Bootstrap

**Blog** (`src/features/landing/blog/server-model.ts`, `src/features/landing/blog/blog-destination-client.tsx`): `variant` is the only article identifier. `/{locale}/blog` is list-only, while `/{locale}/blog/{variant}` resolves article detail strictly from the route variant. Invalid or non-enterable variants redirect to the localized blog index. Pending transition is only a completion/overlay signal and is not the article selection source of truth.

**Test** (`src/features/test/test-question-client.tsx`): policy-driven instruction gating, landing-ingress starts user at Q2 while deep-link entry starts at Q1, dwell time tracking, and `attempt_start` / `final_submit` telemetry. `src/features/test/entry-policy.ts` separates content, CTA configuration, and action effects; `src/features/test/instruction-overlay.tsx` renders the composed instruction surface. The page is still designed around entry semantics and telemetry correctness, not scoring logic, so it remains a compatibility shell rather than the future domain-complete runtime.

`src/app/[locale]/test/[variant]/page.tsx` now regex-validates the URL segment and then resolves the card via `resolveLandingTestCardByVariant(locale, variant)`, failing closed with `notFound()` when the registry lookup misses. This is stricter than the earlier format-only route handling, but it still does not provide the full invalid-variant recovery surface described in the long-term requirements or enforce the SSOT rule that direct non-enterable test routes should be blocked.

`src/features/test/question-bank.ts` now always builds Q1 from the resolved card and Q2–4 from localized fallback questions. Unknown variants no longer receive a generic fallback because route bootstrap is now strict.

**Pure test-domain foundation** (`src/features/test/domain/*`): the current source already contains a separate pure module for branded ids, schema/question models, variant validation, question-model validation, variant data integrity checks, score derivation, and type-segment parsing/building. This surface is exported through `src/features/test/domain/index.ts` and covered by `tests/unit/test-domain-variant-validation.test.ts`, `tests/unit/test-domain-question-model.test.ts`, `tests/unit/test-domain-derivation.test.ts`, and `tests/unit/test-domain-type-segment.test.ts`.

The important boundary is that the live route/runtime path does not import this pure domain module yet. The app does have a canonical fixture-backed variant registry, but there is still no schema-driven result route, no shareable result payload reconstruction, and no same-route recoverable invalid-variant handling in the user-facing flow. Phase 0–1 ADRs froze the contracts that consumers must respect: `VariantId` as a `string` intersection brand, `QuestionIndex` as a `number` intersection brand, the `validateVariant()` three-way result union (`MISSING` / `UNKNOWN` / `UNAVAILABLE`), and the `BlockingDataErrorReason` enum surface. Changes to any of these require a new ADR.

### 5.6 Telemetry

`src/features/landing/telemetry/consent-source.ts` — single consent gate for both custom telemetry and Vercel analytics, synchronized to `localStorage`, bridges cross-tab changes via browser `storage` event.

`src/features/landing/telemetry/runtime.ts` — event queueing, anonymous session ID generation, `landing_view` deduplication by `locale:route`, consent-aware flush. Only session ID is persisted; event queue is in memory.

`src/features/landing/telemetry/validation.ts` — rejects PII-shaped keys and legacy fields (`transition_id`, `result_reason`, `final_q1_response`).

**Active event surface:**

| Event | Required fields |
|---|---|
| `landing_view` | deduplicated by locale:route |
| `card_answered` | `source_variant`, `target_route`, `landing_ingress_flag=true` |
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
- Test-route consent writes now originate only from instruction CTA actions; the page renders no route-local consent banner, no confirm dialog, and no blocked-start popup.
- `vivetest-test-instruction-seen:{variant}` is still variant-scoped in `sessionStorage`.
- `[Start]`, `[Accept All and Start]`, and `[Deny and Start]` record `instructionSeen` and commit runtime entry.
- `[Deny and Abandon]` and `[Keep Current Preference]` do not record `instructionSeen`; they redirect home instead.
- Auto-commit after `instructionSeen` now applies only to the plain `[Start]` path because note-based consent policies keep `canAutoCommitAfterInstructionSeen=false`.
- Blog destination rejects invalid or non-enterable variants by redirecting to the localized blog index.
- Direct `/test/[variant]` entry currently resolves any registered test card, including `unavailable`, `hide`, and `debug` fixtures. Active SSOT docs instead say those direct entries should be blocked and handed off to invalid-variant recovery.
- Test variant URL validation is stricter than before (`resolveLandingTestCardByVariant()` + `notFound()`), but still fixture-backed rather than sheet-backed.
- `history` page shares the full landing shell and GNB but is a non-functional placeholder.
- Preferences button in the consent banner is a visible no-op.

---

## 7. Testing and Quality Gates

The repository includes unit tests, Playwright smoke suites, and custom QA scripts. This section lists the surfaces that exist today; it does not restate gate success/failure beyond the `npm test` rerun noted in §1.

### 7.1 Unit Tests (Vitest)

Scoped to `tests/unit/`. The rerun on 2026-04-04 passed with 34 files / 144 tests. Coverage spans route helpers, localization helpers, telemetry validation, transition storage, card/data contracts, GNB behavior, and the pure test-domain modules.

### 7.2 E2E Tests (Playwright)

9 spec files in `tests/e2e/` are currently enumerated by `npx playwright test --grep @smoke --list`:

| Spec | Contract covered |
|---|---|
| `routing-smoke.spec.ts` | Locale-prefix redirects, not-found split, SSR `<html lang>`, zero hydration warnings |
| `gnb-smoke.spec.ts` | Desktop/mobile shell behavior, keyboard traversal matrices, theme-transition fallback |
| `grid-smoke.spec.ts` | Row planning, underfilled-row rules, spacing compensation, baseline freeze, geometry invariants |
| `state-smoke.spec.ts` | Keyboard-sequential traversal, overlay focus, mobile keyboard handoff, reduced-motion |
| `a11y-smoke.spec.ts` | AxeBuilder audits for landing, GNB-open, transition-overlay, KR representative state |
| `consent-smoke.spec.ts` | Test instruction contract matrix: variant-specific instruction copy, divider/note rendering, CTA labels, consent persistence, redirect/commit semantics, and legacy test-route consent UI absence |
| `theme-matrix-smoke.spec.ts` | 168 representative theme/layout/state screenshots (96 layout + 72 state) |
| `safari-hover-ghosting.spec.ts` | WebKit-only hover/shadow seam regression (5 baselines) |
| `transition-telemetry-smoke.spec.ts` | Landing ingress, transition signals, timeout/load-error/cancel closure, scroll restore, payload hygiene |

Helper layer: `tests/e2e/helpers/landing-fixture.ts` is the single source of truth for the representative test-route anchors via `PRIMARY_AVAILABLE_TEST_VARIANT` / `PRIMARY_AVAILABLE_TEST_VARIANT` and `PRIMARY_OPT_OUT_TEST_VARIANT` / `PRIMARY_OPT_OUT_TEST_VARIANT`; `helpers/consent.ts` seeds consent deterministically; `helpers/axe.ts` formats Axe violations.

The theme-matrix suites assume the combined theme label remains locked to the messages JSON wording family (`Language ⋅ Theme`); changing that label without updating the visual/message contract is a release-gate drift risk.

Theme-matrix and Safari ghosting suites define screenshot-driven QA surfaces around representative routes and states. The manifest currently encodes 168 theme-matrix cases (96 layout + 72 state), and the Safari suite defines 5 WebKit-only snapshot names, but the corresponding PNG baselines are absent from the current workspace.

### 7.3 Custom QA Scripts (`scripts/qa/`)

`qa:rules` runs 12 checks:

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
| `check-variant-registry-contracts.mjs` | Variant-registry boundary, fixture-source usage, and active-doc contract presence |
| `check-variant-only-contracts.mjs` | Variant-only routing and non-enterable blog detail redirect contracts |
| `check-blocker-traceability.mjs` | All blockers in `docs/blocker-traceability.json` anchored to their declared evidence surfaces |

`docs/blocker-traceability.json` spans blockers `1..30`, mixing `automated_assertion`, `scenario_test`, and `manual_checkpoint` evidence kinds.

Consent-specific blockers 20~23 now anchor in `tests/e2e/consent-smoke.spec.ts`; the remaining test-flow blockers 24~30 still mix `docs/req-test.md` manual/scenario anchors with unit/e2e evidence surfaces. The registry remains the machine-readable source for the current evidence kind and file mapping.

As of 2026-04-04, `npm run qa:rules` stops at `check-phase11-telemetry-contracts.mjs` because the expected theme-matrix and Safari ghosting PNG baselines are missing from the workspace.

`qa:gate:once` chains `qa:static`, `build`, `npm test`, and Playwright smoke. `qa:gate` repeats that pipeline three times for flake detection.

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

### Test route runtime / instruction shell
`src/features/test/test-question-client.tsx` · `src/features/test/entry-policy.ts` · `src/features/test/instruction-overlay.tsx` · `src/features/test/question-bank.ts` · `docs/req-test.md` · `docs/req-test-plan.md`

### Test domain foundation
`src/features/test/domain/index.ts` · `src/features/test/domain/types.ts` · `src/features/test/domain/validate-variant.ts` · `src/features/test/domain/validate-question-model.ts` · `src/features/test/domain/validate-variant-data-integrity.ts` · `src/features/test/domain/derivation.ts` · `src/features/test/domain/type-segment.ts` · `tests/unit/test-domain-variant-validation.test.ts` · `tests/unit/test-domain-question-model.test.ts` · `tests/unit/test-domain-derivation.test.ts` · `tests/unit/test-domain-type-segment.test.ts`

### Data model / fixture contract
`src/features/variant-registry/source-fixture.ts` · `src/features/variant-registry/builder.ts` · `src/features/variant-registry/attribute.ts` · `src/features/variant-registry/resolvers.ts` · `src/features/variant-registry/types.ts`

---

## 9. Risks and Open Gaps

**Test domain integration is incomplete.** `src/features/test/domain/*` already provides variant validation, schema/question integrity checks, derivation, and type-segment parsing/building, but the live route/runtime still uses fixture-backed question data and a local result panel. The app already has a canonical variant registry, yet there is still no `/result` route family, no invalid-variant recovery route, and no result history. Recovery page wiring (`validateVariant()` ok:false → §6.1 error recovery, same-route recoverable handling) is Phase 4 scope. Schema-driven result route family is Phase 7–9 scope.

**The instruction contract is much cleaner, but the copy ownership split is now real.** Variant-specific instruction bodies live in fixtures, while CTA labels and consent notes live in locale messages. That split is intentional, but future editors can easily introduce drift if they assume all test copy lives in one source.

**Landing interaction runtime is a scaling risk.** `use-landing-interaction-controller.ts` at 1582 lines mixes geometry measurement, `requestAnimationFrame` sequencing, hover timers, and mobile shell phases. Powerful but fragile under content-density or browser changes. The most likely future refactoring cost concentration point.

**Direct test-route reachability is looser than the active SSOT.** `src/app/[locale]/test/[variant]/page.tsx` currently resolves any registered test card, and `tests/e2e/consent-smoke.spec.ts` intentionally exercises direct entry for `unavailable`, `hide`, and `debug` fixtures. The active requirements in `docs/req-landing.md` and `docs/req-test.md` instead say those routes should be blocked and handed off to invalid-variant recovery. Closing this gap — wiring `validateVariant()` ok:false to the recovery page and blocking non-enterable direct routes — is Phase 4 scope.

**Telemetry server authority is missing.** `src/app/api/telemetry/route.ts` returns `204` on any parseable JSON. Schema enforcement, forbidden-field rejection, and persistence exist only on the trusted client path.

**`src/features/landing` namespace is overburdened.** Blog, test, GNB, telemetry, and transition concerns are all colocated here. Workable for V1, but the boundary will need restructuring as result/history/admin surfaces arrive. Two files stand out as the primary pressure points: `use-landing-interaction-controller.ts` (1582 lines) and `site-gnb.tsx` (~791 lines).

**Screenshot-driven QA remains concentrated in the instruction surface.** The `test-instruction` representative route is still shared by the theme-matrix manifest and consent smoke coverage, so future CTA/copy/layout tweaks will churn a tightly coupled set of representative snapshots and route-level assertions.

**Tech stack notes:**
- `next@16.1.6`, `react@19.2.4`, `next-intl@4.8.3`
- `motion@12.34.0` installed but not imported anywhere in `src` or `tests`; any adoption should stay aligned with `docs/req-landing.md` §8.3 Core Motion Contract
- Tailwind v4 packages installed but runtime is primarily `src/app/globals.css`
