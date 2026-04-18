# Project Analysis

## 1. Current State At A Glance

This repository is a localized Next.js App Router application. Its real technical center of gravity is a landing-to-destination interaction system plus a fixture-backed, policy-driven test-entry shell, not the full assessment product described in `docs/requirements.md`. The codebase is best understood as a V1 front-end interaction prototype with mature contract coverage in landing, transition, consent, and telemetry seams, plus a separate pure test-domain foundation that is only partially wired into the user-facing runtime.

**Workspace verification:**

- `PLAYWRIGHT_SERVER_MODE=preview npx playwright test tests/e2e/theme-matrix-smoke.spec.ts tests/e2e/safari-hover-ghosting.spec.ts`: 174 tests — passes
- `node scripts/qa/check-phase11-telemetry-contracts.mjs`: passes
- `npm run qa:rules` (2026-04-18 docs sync gate): passes
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` (2026-04-18 docs sync gate): pass
- Ownership migration final gate (`check-phase4`~`check-phase10`, `grid/state/gnb/a11y/theme-matrix/transition` Playwright smoke): pass
- `npm test`: 34 unit test files / 146 tests — passes
- Snapshot baseline policy: visual smoke stores local PNG baselines under `tests/e2e/*-snapshots/`. The screenshot helper auto-creates missing files and falls back to Playwright comparison when a local baseline already exists. Git tracked completeness is not required.

**Implementation phase status (2026-04-06):** Phase 0 pre-requisite ADRs are all complete — ADR-A (`src/features/test` namespace separation), ADR-B (storage key contract and 5-flag topology), ADR-E (representative variant QA baseline). Phase 1 Domain Foundation is complete: all seven files under `src/features/test/domain/` exist, dedicated unit tests pass, and blockers #7/#11/#12/#27 are mapped in `docs/blocker-traceability.json`. Key contracts frozen by Phase 0–1: `VariantId` and `QuestionIndex` intersection brand types, `validateVariant()` three-way result union shape, `BlockingDataErrorReason` enum surface. Modifying these requires a new ADR. See `docs/req-test-plan.md` for the full Phase roadmap and ADR decision records.

---

## 2. Implementation Scope

### Substantially implemented

- Localized landing page with hero + catalog (`src/app/[locale]/page.tsx`)
- Landing catalog grid with desktop/mobile expansion behavior (`src/features/landing/grid/`)
- Global navigation shell (GNB) with theme switching, locale switching, keyboard/focus contract (`src/features/landing/gnb/site-gnb.tsx`)
- Tailwind v4 entry plus component-local utility migration across shared shell, GNB, landing grid/card static surface, test shell, blog/history shells, and not-found pages, with `src/app/globals.css` reduced to tokens/base while landing-grid motion/focus continuity moved into feature-local CSS
- Landing-to-destination transition handshake with sessionStorage persistence and timeout/cancel semantics (`src/features/landing/transition/`)
- Consent-gated telemetry with anonymous session ID, event queueing, and Vercel analytics bridge (`src/features/landing/telemetry/`)
- Proxy-level locale normalization and SSR `<html lang>` correctness (`src/proxy.ts`, `src/i18n/`)
- Blog index/list route plus route-driven article detail (`src/features/landing/blog/blog-destination-client.tsx`, `src/app/[locale]/blog/[variant]/page.tsx`)
- Fixture-backed variant registry with generated runtime export, source/runtime type separation, `seq` validation + sort/drop, resolver-only preview access, unified landing meta keys, and resolver-backed card lookup (`src/features/variant-registry/`)
- Pure test-domain foundation for schema validation and derivation utilities: `validateVariant`, `validateQuestionModel`, `validateVariantDataIntegrity`, `computeScoreStats`, `deriveDerivedType`, `parseTypeSegment`, `buildTypeSegment`, plus `VariantSchema` / `ScoringSchema` / `QuestionType` / `QualifierFieldSpec` types (`src/features/test/domain/`). Key interface contracts are frozen by Phase 0–1 ADRs (brand type shapes, `validateVariant()` result union, `BlockingDataErrorReason` enum).

### Partially implemented

| Area | Current implementation |
|---|---|
| Test destination | Policy-driven instruction overlay keyed by ingress type + consent state + `attribute`, registry-backed instruction copy, 4-question compatibility flow, answer state, dwell tracking, result panel, `attempt_start` / `final_submit` telemetry |
| Test domain foundation | Pure domain validators, integrity checks, derivation helpers, canonical index / `questionType` / qualifier-aware types, and type-segment parsing/building under `src/features/test/domain/`, covered by dedicated unit tests |
| Blog destination | List-only index route, variant-keyed article detail route, article list |

---

## 3. Architecture

### 3.1 Layered Structure

| Layer | Responsibility |
|---|---|
| `src/proxy.ts` + `src/i18n/` | Request normalization, locale resolution, `X-NEXT-INTL-LOCALE` injection |
| `src/app/layout.tsx` | Document structure, Tailwind/global CSS entry, theme bootstrap, Vercel analytics gates |
| `src/app/[locale]/layout.tsx` | Locale validation, `NextIntlClientProvider`, `TransitionRuntimeMonitor` |
| `src/app/[locale]/**/page.tsx` | Thin server components — load translations, validate params, hand off to `PageShell` + client |
| `src/features/landing/` | **Shared application runtime** — grid, GNB, transition, telemetry, shared shell, blog destination |
| `src/features/test/` | Canonical test destination surface — route/runtime shell, instruction entry policy, overlay composition, question bootstrap, and question-bank resolution |
| `src/features/test/domain/` | Pure domain module — branded ids, question/schema models, variant validation, integrity checks, score derivation, and type-segment parsing/building |
| `src/config/site.ts` | Locale set definition |
| `src/lib/routes/route-builder.ts` + `src/i18n/localized-path.ts` | Locale-free route authoring + locale prefix application |

`src/features/landing` remains the de facto platform namespace for shared runtime concerns. The canonical test surface now lives in `src/features/test`, and its user-facing runtime currently composes landing-owned transition, telemetry, shell, and catalog seams alongside the pure test-domain foundation.

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
            └─ src/app/[locale]/history/page.tsx

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

These files are exercised by `tests/unit/test-domain-*.test.ts`.

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

State transitions are named and centralized; timing constants are explicit. The main risk is operational complexity under future browser, content-density, or performance changes. Styling ownership is now hybrid: static shells plus boolean-resolvable card states live as utility/class constants in `landing-catalog-grid.tsx` and `landing-grid-card.tsx`, while `landing-grid-card.tsx` also remaps raw runtime state into semantic style classes (`desktopOverlayLayer`, `desktopMotionEnter|Exit|Steady`, `mobileTransientOpening|Closing`, `mobilePhaseClosing`) that `landing-grid-card.module.css` now consumes exclusively for motion, focus continuity, reduced-motion branches, and desktop/mobile transient choreography. Raw `data-*` attributes remain on the DOM as QA/debug and Playwright anchors, but no longer participate in the CSS contract. `src/app/globals.css` now keeps only tokens and the shared anchor base. `motion@12.34.0` is installed but not imported anywhere in `src` or `tests`; the live motion system is still entirely CSS- and data-attribute-driven, and any package adoption should stay aligned with `docs/req-landing.md` §8.3 Core Motion Contract.

### 5.2 GNB

`src/features/landing/gnb/site-gnb.tsx` — **~831 lines** — does far more than render nav links. It owns: desktop settings hover, click/focus fallback, mobile menu choreography, route-aware back behavior, locale switching, theme switching, landing-specific keyboard entry order, and focus return semantics.

Key supporting files: `src/features/landing/gnb/behavior.ts`, `src/features/landing/gnb/types.ts` (defines `GnbContext` per route: landing/blog/history/test), `src/features/landing/gnb/hooks/`.

Theme subsystem: `public/theme-bootstrap.js` (sets before hydration from `localStorage`), `src/features/landing/gnb/hooks/use-theme-preference.ts` (persists manual overrides), `src/features/landing/gnb/hooks/theme-transition.ts` (2500ms blur-circle View Transition API, with reduced-motion fallback).

`src/features/landing/shell/page-shell.tsx` mounts the GNB for every localized route — it is a shared runtime controller, not a page-local header. Styling is similarly split: sticky shell, inner rows, buttons, theme/locale chips, mobile panel/base backdrop, and the desktop settings panel geometry/pseudo-element seam now live in `site-gnb.tsx`, while the theme heading typography shim lives directly on the label span in `settings-controls.tsx`. `src/app/globals.css` no longer owns GNB panel geometry or descendant typography adjustments.

### 5.3 Catalog Data Model

Source: `src/features/variant-registry/source-fixture.ts`

Current fixture inventory:
- 10 total cards (7 test, 3 blog)
- Test card attributes: 2 `available`, 1 `opt_out`, 2 `unavailable`, 1 `hide`, 1 `debug`
- Blog card attributes: 3 `available`
- Publicly enterable test variant ids: `qmbti`, `rhythm-b`, `energy-check`
- Blog variants: `ops-handbook`, `build-metrics`, `release-gate`

`src/features/variant-registry/attribute.ts` now owns `attribute` normalization and the helper surface that matters to the rest of the app: `deriveAvailability()`, `isEnterableCard()`, `isCatalogVisibleCard()`, and `isUnavailablePresentation()`.

`src/features/variant-registry/types.ts` already separates source-facing and runtime-facing shapes: source rows can carry `seq` and inline preview bridge fields, while runtime landing cards exclude those source-only fields. `src/features/variant-registry/resolvers.ts` centralizes locale fallback (active → `defaultLocale` → `default` → first non-empty), consent-aware catalog filtering, strict variant lookup, and the `resolveTestPreviewPayload()` boundary. `src/features/variant-registry/builder.ts` validates source rows, sorts by `seq`, drops `seq` from the exported runtime registry, and emits separate `landingCards` / `testPreviewPayloadByVariant` runtime stores. The resolver layer still exposes a `{audience: 'qa'}` escape hatch that preserves `hide` / `debug` fixtures the end-user catalog hides.

The current builder still relies on fixture-backed localized copy and a temporary bridge where the **first scoring preview source of truth** remains inline. That bridge is isolated to `resolveTestPreviewPayload()` so the rest of the runtime does not read preview source fields directly. Runtime meta keys are unified as `durationM` / `sharedC` / `engagedC`, while UI labels branch by content type.

Blog subtitle continuity is also fixed in tests: the runtime uses `subtitle` as the only blog body-copy source for landing cards, and unit/e2e checks assert that Normal and Expanded states reuse the same text rather than a separate fallback text field.

Active e2e representative anchors now use canonical landing variants directly: `PRIMARY_AVAILABLE_TEST_VARIANT` (`qmbti`) and `PRIMARY_OPT_OUT_TEST_VARIANT` (`energy-check`). Theme-matrix screenshots still key off the available representative route.

### 5.4 Transition Runtime

Landing-to-destination handshake: `src/features/landing/transition/use-landing-transition.ts` converts CTA clicks into localized route pushes. Before navigation, `src/features/landing/transition/runtime.ts` writes `PendingLandingTransition` to `sessionStorage`, records return scroll state, and, for test cards, writes a landing ingress record that includes `variant`, `preAnswerChoice`, `createdAtMs`, and `landingIngressFlag`.

On the destination side, `src/features/landing/transition/transition-runtime-monitor.tsx` enforces a **1600ms timeout**. `TransitionGnbOverlay` keeps a landing-context GNB visible during pending transition for visual continuity. `LandingRuntime` restores scroll on return and cancels stale transitions with `USER_CANCEL`.

Result reasons: `USER_CANCEL`, `DUPLICATE_LOCALE`, `DESTINATION_TIMEOUT`, `DESTINATION_LOAD_ERROR`, `UNKNOWN`. Cleanup is centralized in `rollbackLandingTransition()`.

Limitation: all persistence is session-scoped and client-only. No server correlation, no durable transition history.

### 5.5 Destination Bootstrap

**Blog** (`src/features/landing/blog/server-model.ts`, `src/features/landing/blog/blog-destination-client.tsx`): `variant` is the only article identifier. `/{locale}/blog` is list-only, while `/{locale}/blog/{variant}` resolves article detail strictly from the route variant. Invalid or non-enterable variants redirect to the localized blog index. Pending transition is only a completion/overlay signal and is not the article selection source of truth. The detail route also exports `generateMetadata()` so the document title follows the resolved article title rather than a static fallback.

**Test** (`src/features/test/test-question-client.tsx`): policy-driven instruction gating, landing-ingress starts the current compatibility flow at Q2 while deep-link entry starts at Q1, dwell time tracking, and `attempt_start` / `final_submit` telemetry. `src/features/test/entry-policy.ts` separates content, CTA configuration, and action effects; `src/features/test/instruction-overlay.tsx` renders the composed instruction surface. The live page today is a compatibility shell around entry semantics and registry-backed question data.

`src/app/[locale]/test/[variant]/page.tsx` now regex-validates the URL segment and then resolves the card via `resolveLandingTestCardByVariant(locale, variant)`, failing closed with `notFound()` when the registry lookup misses.

`src/features/test/question-bank.ts` now always builds the landing preview question/choices through `resolveTestPreviewPayload()` and Q2–4 from localized fallback questions. Unknown variants no longer receive a generic fallback because route bootstrap is now strict.

**Pure test-domain foundation** (`src/features/test/domain/*`): the current source already contains a separate pure module for branded ids, schema/question models, variant validation, question-model validation, variant data integrity checks, score derivation, and type-segment parsing/building. This surface is exported through `src/features/test/domain/index.ts` and covered by `tests/unit/test-domain-variant-validation.test.ts`, `tests/unit/test-domain-question-model.test.ts`, `tests/unit/test-domain-derivation.test.ts`, and `tests/unit/test-domain-type-segment.test.ts`. Phase 0–1 ADRs froze the contracts that consumers must respect: `VariantId` as a `string` intersection brand, `QuestionIndex` as a `number` intersection brand, the `validateVariant()` three-way result union (`MISSING` / `UNKNOWN` / `UNAVAILABLE`), and the `BlockingDataErrorReason` enum surface.

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

### 5.7 Styling Runtime

Tailwind v4 is now active in the live runtime through `src/app/globals.css` `@import "tailwindcss"` plus `postcss.config.mjs`, and the app no longer behaves like a globals-first styling system.

- `src/app/globals.css` is down to 112 lines and is intentionally limited to theme tokens and the shared anchor base.
- `src/features/landing/grid/landing-grid-card.module.css` now owns landing-grid motion, focus continuity, reduced-motion branches, and desktop/mobile transient choreography.
- `src/app/app-body-class.ts` now exports `APP_BODY_CLASSNAME`, which owns the body canvas/background, text color, line-height, and font stack for both `src/app/layout.tsx` and `src/app/global-not-found.tsx`.
- Component-local utility/class constants now own `PageShell` spacing, consent banner layout/buttons, transition GNB overlay positioning, GNB shell rows/triggers/chips/settings-panel geometry, landing grid/card static shells and boolean-resolvable state shells, instruction/test shells, blog/history shells, and both not-found surfaces.
- `landing-shell-card` still exists as a shared DOM hook/classname across test/blog/history consumers, but its visual styling is now local to each component rather than defined in `globals.css`.
- Title/subtitle continuity measurement no longer depends on a global `.landing-grid-card-text-probe` selector; `landing-card-title-continuity.tsx` now creates and styles the probe element programmatically.

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
- Test variant URL validation is stricter than before (`resolveLandingTestCardByVariant()` + `notFound()`), and route bootstrap remains fixture-backed through the registry/resolver layer.
- `history` page shares the full landing shell and GNB.
- Preferences button in the consent banner is a visible no-op.

---

## 7. Testing and Quality Gates

The repository includes unit tests, Playwright smoke suites, and custom QA scripts. This section lists the surfaces that exist today; it does not restate gate success/failure beyond the `npm test` rerun noted in §1.

### 7.1 Unit Tests (Vitest)

Scoped to `tests/unit/`. The latest rerun passed with 34 files / 145 tests. Coverage spans route helpers, localization helpers, telemetry validation, transition storage, card/data contracts, GNB behavior, and the pure test-domain modules.

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

Theme-matrix and Safari ghosting suites define screenshot-driven QA surfaces around representative routes and states. The manifest currently encodes 168 theme-matrix cases (96 layout + 72 state), and the Safari suite defines 5 WebKit-only snapshot names. Their corresponding PNG baselines are now present in the current workspace.

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

As of 2026-04-16, `npm run qa:rules` passes `check-phase11-telemetry-contracts.mjs` after baseline restoration and currently stops at `check-variant-registry-contracts.mjs` because legacy identifiers remain in `docs/req-landing.md`, `docs/req-test-plan.md`, and `docs/requirements.md`.

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

## 9. Risks and Notes

**Instruction copy ownership is intentionally split.** Variant-specific instruction bodies live in fixtures, while CTA labels and consent notes live in locale messages. Future editors need to keep both sources in sync.

**Landing interaction runtime is a scaling risk.** `use-landing-interaction-controller.ts` at 1582 lines mixes geometry measurement, `requestAnimationFrame` sequencing, hover timers, and mobile shell phases. Powerful but fragile under content-density or browser changes. The most likely future refactoring cost concentration point.

**`src/features/landing` namespace is dense.** Blog, test, GNB, telemetry, and transition concerns are all colocated here. Two files stand out as the primary pressure points: `use-landing-interaction-controller.ts` (1582 lines) and `site-gnb.tsx` (~831 lines).

**Screenshot-driven QA remains concentrated in the instruction surface.** The `test-instruction` representative route is shared by the theme-matrix manifest and consent smoke coverage, so CTA/copy/layout tweaks will churn a tightly coupled set of representative snapshots and route-level assertions.

**Tech stack notes:**
- `next@16.1.6`, `react@19.2.4`, `next-intl@4.8.3`
- `motion@12.34.0` installed but not imported anywhere in `src` or `tests`; any adoption should stay aligned with `docs/req-landing.md` §8.3 Core Motion Contract
- Tailwind v4 entry is active via `src/app/globals.css` `@import "tailwindcss"` plus `postcss.config.mjs`; static surface ownership is now mostly component-local, `src/app/globals.css` is limited to tokens/shared anchor base, and landing-grid state/motion contracts now live in feature-local CSS that consumes semantic classes only while preserved `data-*` anchors continue serving QA/debug and Playwright coverage. Any further follow-up should stay within feature-local CSS and avoid widening the QA/debug surface.
