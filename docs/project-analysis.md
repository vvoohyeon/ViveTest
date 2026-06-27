# Project Analysis

## 1. Current State At A Glance

This repository is a localized Next.js App Router application. Its current technical center is a front-end runtime that joins five surfaces: localized landing catalog, shared app shell/GNB, landing-to-destination transition continuity, fixture-backed blog/test destinations, and consent-gated telemetry. It is no longer just a landing prototype, but it is still not the full assessment product described in `docs/requirements.md`: scoring derivation, persisted history, full result rendering, and backend ingestion remain deferred.

**Workspace verification *(2026-06-27, HEAD / current source tree)*:**

- Default local Done gate remains `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- `npm run qa:rules` is a release-level reference gate, not the default Done gate. It currently delegates to 12 buffered parallel contract scripts through `scripts/qa/run-all.mjs`.
- `npm run qa:gate:once` runs `qa:static` (`lint` + `typecheck` + `qa:rules`), then `build`, `test`, and the Playwright `@gate` subset. `npm run qa:gate` repeats that same once-gate three times for flake detection.
- Current deterministic test inventory: 74 unit `*.test.ts` files under `tests/unit/`, 10 Playwright `*.spec.ts` files under `tests/e2e/`, and 12 `scripts/qa/check-*.mjs` contract scripts plus 4 local QA helper/runner modules.
- E2E coverage spans routing, grid/state, GNB, accessibility, consent, qualifier overlay, theme matrix, Safari hover ghosting, and transition telemetry. `playwright.config.ts` auto-starts a dev or preview server unless `PLAYWRIGHT_BASE_URL` is provided; the only checked-in GitHub workflow in HEAD is `.github/workflows/sync.yml`, and it runs Sheets sync rather than the general quality gates.
- Snapshot baseline policy: visual smoke stores local PNG baselines under `tests/e2e/*-snapshots/`. The screenshot helper auto-creates missing files and falls back to Playwright comparison when a local baseline already exists. Git tracked PNG completeness is not required; the shared theme-matrix regeneration and gate-verification provenance is tracked in `tests/e2e/theme-matrix-baseline-provenance.md`, with update instructions in `tests/e2e/README.md`.

---

## 2. Implementation Scope

### Substantially implemented

- Localized App Router route tree rooted at `src/app/[locale]/**`, with root document shell, locale layout, segment 404, and global unmatched 404.
- Shared `PageShell` for localized pages, mounting `TransitionGnbOverlay`, `SiteGnb`, route `<main>`, and the default telemetry consent banner.
- Landing page and catalog grid with desktop/mobile expansion behavior, desktop/tablet keyboard-a11y hardening, keyboard handoff, hover/desktop motion, mobile lifecycle, measured spacing/baseline management, tag-prefix fitting, and feature-local grid motion CSS.
- Global navigation shell with route-aware contexts (`landing`, `blog`, `history`, `test`), locale switching, theme preference, mobile menu, settings panel, back-navigation behavior, and extracted keyboard-target/Tab-routing seams.
- Landing-to-destination transition handshake with sessionStorage persistence, return-scroll restoration, destination monitor timeout, cancel/failure signals, and GNB overlay continuity.
- Consent-gated telemetry runtime, validation, `/api/telemetry` transport endpoint, Vercel Analytics gate, and Speed Insights gate sharing a single consent source.
- Proxy-level locale normalization and SSR/client `<html lang>` correctness through `src/proxy.ts`, `src/i18n/request-locale-header.ts`, and `src/i18n/locale-html-lang-sync.tsx`.
- Blog list and route-driven article detail destinations, with invalid detail variants redirected to the localized blog index.
- Test route entry shell with instruction overlay, qualifier collection/re-entry, reducer/controller/bootstrap ownership, answer lock, answer telemetry helper, active-run resume, scoring-only runtime panel, placeholder result panel, and `/test/error` recovery stub for runtime-blocked or lazy-validation-failed variants.
- Fixture-backed variant registry with generated runtime export, source/runtime type separation, resolver-only preview access, cross-source validation/fallback, unified landing meta keys, and resolver-backed catalog/card lookups.
- Pure test-domain foundation for schema validation and derivation utilities under `src/features/test/domain/`, plus schema-registry ownership and a reserved response-projection boundary.
- Local quality infrastructure: Vitest unit inventory, Playwright smoke/gate specs, 12-script `qa:rules`, path-configured static contract checks, theme-matrix provenance docs, and blocker traceability registry.

### Partially implemented

| Area | Current implementation |
|---|---|
| Test result pipeline | Runtime can submit scoring answers and show a placeholder result panel. Real score derivation wiring, result URL/payload rendering, domain-token response projection, history persistence, and final `derived_type` telemetry are still deferred. |
| Test error recovery | `/[locale]/test/error` exists and is routed through `PageShell`, but the user-facing recovery-card experience remains a stub. |
| Sync/data pipeline | Landing and Questions Sheets loading, generated registry serialization, local dry run, and production sync orchestration exist. Production sync still validates Landing↔Questions in 2-source mode; Results fixture IDs participate only in dev/test runtime fallback and unit-level 3-source validation until a real Results Sheets loader/secret is added. |
| Blog destination | List and detail routes exist, but article content remains fixture/model driven rather than a full publishing system. |
| CI quality enforcement | Local quality scripts and Playwright config are present, but `.github/workflows/sync.yml` is the only checked-in workflow and it only runs the Sheets sync job on `main` pushes. No repository workflow currently invokes the default Done gate, `qa:rules`, or E2E gate. |

### Not implemented / deferred

- Backend telemetry persistence and ingestion guarantees.
- History persistence beyond the placeholder history page shell.
- Branch-protected production push policy for Sheets sync.
- Full result screen and share/history flows described in the broader product requirements.

---

## 3. Architecture

### 3.1 Layered Structure

| Layer | Responsibility |
|---|---|
| `src/proxy.ts` + `src/i18n/` | Request normalization, locale resolution, duplicate-prefix rejection, locale-less redirect/rewrite policy, and `X-NEXT-INTL-LOCALE` injection |
| `src/app/layout.tsx` | Top-level document shell, Tailwind/global CSS entry, pre-hydration theme bootstrap, Vercel analytics/speed-insights gates |
| `src/app/[locale]/layout.tsx` | Locale validation, static locale params, `setRequestLocale`, `NextIntlClientProvider`, client lang sync, and `TransitionRuntimeMonitor` |
| `src/app/[locale]/**/page.tsx` | Thin server route entries that validate params, load translations/models, and hand off to `PageShell` plus feature clients |
| `src/features/landing/` | Landing runtime, grid/model/shell/storage/media orchestration |
| `src/features/gnb/` | Shared GNB shell, route contexts, theme preference, locale switching, keyboard routing, mobile menu, and back navigation |
| `src/features/transition/` | Landing-to-destination transition persistence, signals, monitor, and GNB overlay continuity |
| `src/features/telemetry/` | Consent source, telemetry runtime, payload validation, session/correlation IDs, and Vercel consent bridge |
| `src/features/blog/` | Blog list/detail destination model and client rendering |
| `src/features/test/` | Canonical test destination surface: instruction/qualifier entry policy, bootstrap/controller/reducer hooks, answer handling, overlay/result connectors, question-bank resolution, and test storage |
| `src/features/test/domain/` | Pure domain module: branded ids, question/schema models, variant validation, integrity checks, score derivation, and type-segment parsing/building |
| `src/features/variant-registry/` | Fixture source, builder, generated runtime registry, resolver boundary, localization, attributes, cross-sheet integrity, and serializer |
| `src/config/site.ts` | Locale list, default locale, locale cookie name, and locale segment pattern |
| `src/lib/routes/route-builder.ts` + `src/i18n/localized-path.ts` | Locale-free route authoring plus typed locale prefix application |
| `src/lib/correlation-id.ts` | Browser-safe anonymous/correlation ID utilities |

Shared concerns that previously lived under `src/features/landing/*` now have independent feature namespaces. `src/features/landing` owns the landing page runtime and grid/shell/storage orchestration, while GNB, transition, telemetry, and blog destination code are imported from their dedicated namespaces.

### 3.2 Module Flow

```
Request
  └─ src/proxy.ts → src/i18n/proxy-policy.ts
       ├─ locale-less paths → redirect to localized
       ├─ duplicate prefix / unsupported app path → rewrite to /_not-found
       └─ pass-through → Next.js route tree

Route tree
  └─ src/app/layout.tsx (document, globals.css, theme-bootstrap.js, Vercel gates)
       └─ src/app/[locale]/layout.tsx (locale validation, messages, lang sync, TransitionRuntimeMonitor)
            ├─ src/app/[locale]/page.tsx
            │    └─ LandingRuntime + LandingCatalogGridLoader
            │         ├─ src/features/variant-registry/resolvers.ts
            │         │    ├─ source-fixture.ts / variant-registry.generated.ts
            │         │    ├─ builder.ts / registry-serializer.ts
            │         │    ├─ localization.ts / attribute.ts
            │         │    └─ cross-sheet-integrity.ts
            │         ├─ src/features/test/fixtures/questions/**
            │         ├─ src/features/test/fixtures/results/**
            │         ├─ src/features/landing/grid/use-landing-interaction-controller.ts
            │         │    ├─ interaction-dom.ts
            │         │    ├─ use-hover-intent-controller.ts
            │         │    ├─ use-desktop-motion-controller.ts
            │         │    ├─ use-mobile-card-lifecycle.ts
            │         │    └─ use-keyboard-handoff.ts
            │         │         ├─ use-keyboard-mode-tracker.ts
            │         │         ├─ use-landing-keyboard-entry.ts
            │         │         └─ use-card-keyboard-handler.ts
            │         └─ src/features/landing/grid/landing-catalog-grid.tsx
            │              ├─ use-grid-geometry-controller.ts
            │              └─ landing-grid-card.tsx + landing-grid-card.module.css
            ├─ src/app/[locale]/blog/page.tsx (list-only blog index)
            ├─ src/app/[locale]/blog/[variant]/page.tsx (route-keyed blog detail)
            ├─ src/app/[locale]/test/[variant]/page.tsx
            │    ├─ runtime blocked set → /test/error?variant=...
            │    ├─ resolveLandingTestEntryCardByVariant(locale, variant) → notFound on true miss
            │    ├─ getLazyValidatedVariant(variant) → /test/error?variant=... on data-integrity failure
            │    └─ src/features/test/test-question-client.tsx
            │         ├─ src/features/test/test-run-reducer.ts
            │         ├─ src/features/test/use-test-run-controller.ts
            │         │    ├─ use-test-run-bootstrap.ts
            │         │    │    ├─ bootstrap-state-resolver.ts
            │         │    │    └─ storage/{active-run,response-set,volatility}.ts
            │         │    ├─ use-question-dwell.ts
            │         │    └─ question-runtime-utils.ts
            │         ├─ src/features/test/use-test-entry-orchestrator.ts
            │         │    ├─ use-qualifier-overlay-wizard.ts
            │         │    └─ use-auto-commit.ts
            │         ├─ src/features/test/storage/instruction-seen.ts
            │         ├─ src/features/test/use-answer-handler.ts
            │         ├─ src/features/test/overlay-connector.tsx
            │         ├─ src/features/test/instruction-overlay.tsx
            │         ├─ src/features/test/qualifier-chip.tsx
            │         ├─ src/features/test/result-connector.tsx
            │         ├─ src/features/test/test-result-panel.tsx
            │         ├─ src/features/test/use-answer-lock.ts
            │         ├─ src/features/test/use-before-unload-guard.ts
            │         ├─ src/features/test/use-landing-transition-completion.ts
            │         └─ src/features/test/question-bank.ts
            ├─ src/app/[locale]/test/error/page.tsx (stub recovery surface)
            └─ src/app/[locale]/history/page.tsx

Shared page wrapper (all localized routes)
  └─ src/features/landing/shell/page-shell.tsx
       ├─ src/features/transition/transition-gnb-overlay.tsx
       ├─ src/features/gnb/site-gnb.tsx
       ├─ <main>
       └─ TelemetryConsentBanner (unless route disables the default banner)

Telemetry
  └─ src/features/telemetry/consent-source.ts (single consent gate)
       ├─ src/features/telemetry/runtime.ts (queue, session, flush)
       ├─ src/app/api/telemetry/route.ts (validation-only 400/204 endpoint)
       ├─ src/app/vercel-analytics-gate.tsx
       └─ src/app/vercel-speed-insights-gate.tsx
```

Separately, the pure test-domain foundation and adjacent schema/projection boundaries expose helpers for future schema-driven test flow:

- `types.ts` / `index.ts` — branded ids, schema, question, and payload interfaces
- `validate-variant.ts` — registered/available variant validation
- `validate-question-model.ts` / `validate-variant-data-integrity.ts` — question-model and schema integrity checks
- `derivation.ts` — `axisMatchesQuestion()`, `computeScoreStats()`, and `deriveDerivedType()`
- `type-segment.ts` — `parseTypeSegment()` and `buildTypeSegment()`
- `src/features/test/schema-registry.ts` — single owner of the variant → ScoringLogicType → ScoringSchema template mapping
- `response-projection.ts` — reserved Phase 4/7 projection boundary for turning runtime response state into domain tokens before derivation/result URL helpers are called

The domain files are exercised by `tests/unit/test-domain-*.test.ts`; the schema registry is covered by `tests/unit/schema-registry.test.ts`. `response-projection.ts` is currently a contract-only stub with no function exports and no dedicated unit test.

---

## 4. Route and Request Flow

### 4.1 Route Surface

Current route files under `src/app/` expose the following application surface:

```
/{locale}
/{locale}/blog
/{locale}/blog/{variant}
/{locale}/history
/{locale}/test/{variant}
/{locale}/test/error
/api/telemetry
```

Route authoring is split deliberately:

- `src/lib/routes/route-builder.ts` owns locale-free app routes, including `/test/error`.
- `src/i18n/localized-path.ts` applies the locale prefix and returns typed localized paths.
- `src/i18n/routing.ts` defines the `next-intl` always-prefixed routing contract for the main localized public pathnames.

Segment/global 404 handling is implemented through `src/app/not-found.tsx` and `src/app/global-not-found.tsx`. The test error page is not a 404 surface; it is the user-facing recovery stub for runtime-blocked variants and lazy validation failures.

### 4.2 Supported Locales

Defined in `src/config/site.ts`: `en`, `kr`, `zs`, `zt`, `ja`, `es`, `fr`, `pt`, `de`, `hi`, `id`, `ru`.

All 12 locale files in `src/messages/` are complete with the same 6 namespaces: `gnb`, `landing`, `test`, `blog`, `history`, `consent`. Shared UI chrome, CTA labels, and generic consent-note copy are handled by these files. Variant-specific test instruction copy is fixture-backed through `src/features/variant-registry/source-fixture.ts` and consumed through the registry resolver boundary. Question/answer fixture copy is split by variant under `src/features/test/fixtures/questions/**` and uses the same locale-keyed `LocalizedText` pattern for question and answer text.

### 4.3 Proxy Contract

- Locale-less allowlisted app-owned paths → 307 redirect to localized equivalent
- Locale-less non-allowlisted, non-bypass paths → rewrite to `/_not-found`
- Duplicate locale prefix (e.g. `/en/en/...`) → rewrite to `/_not-found`
- `/_next`, `/api`, `/_vercel`, `/_not-found`, file-like assets, `/favicon.ico`, `/robots.txt`, `/sitemap.xml` → bypassed by the static `src/proxy.ts` matcher
- Route ownership decisions live in private helpers in `src/i18n/proxy-policy.ts`; locale token/family normalization lives in `src/i18n/locale-resolution.ts`
- Locale family normalization: `ko* → kr`, Simplified Chinese → `zs`, Traditional Chinese → `zt`

### 4.4 SSR Locale Correctness

The proxy injects `X-NEXT-INTL-LOCALE`. `src/app/layout.tsx` reads it to set `<html lang>` on initial server response. `src/i18n/locale-html-lang-sync.tsx` reconciles it client-side on navigation. Locale correctness does not depend on client hydration alone.

`src/app/[locale]/layout.tsx` exports `dynamicParams = false` and uses `generateStaticParams()` from the locale list, making the locale parameter surface explicit and preventing hidden permutations.

### 4.5 App Shell and 404 Split

- `src/app/layout.tsx` owns only document-level concerns: `globals.css`, the pre-hydration theme script, SSR `lang`, and analytics/speed-insights gates.
- `src/app/[locale]/layout.tsx` owns locale validation, `NextIntlClientProvider`, client-side `<html lang>` sync, and transition monitoring.
- Localized pages use `PageShell`, which mounts the transition overlay, GNB, constrained `<main>`, and default consent banner unless a route opts out.
- `/[locale]/test/[variant]` opts out of the default consent banner because test entry consent is handled through instruction CTA policy.
- `not-found.tsx` is the segment-level “route exists/resource missing” page. `global-not-found.tsx` is the unmatched app-path surface for proxy rewrites such as duplicate locale prefixes or unsupported app-owned paths.

---

## 5. Core Subsystems

### 5.1 Landing Interaction Runtime

The most technically distinctive part of the codebase. The pre-refactor monolithic interaction controller has been split into focused runtime modules while preserving reducer ownership in the controller. The current boundary is intentionally two-layered: runtime contract state lives in hooks/reducers and DOM `data-*` attributes, while the visual system is concentrated in `LandingGridCard` utility classes plus one CSS module.

Pure or model-focused modules:

- `src/features/landing/model/interaction-state.ts` — page/card/hover-lock state transitions
- `src/features/landing/grid/layout-plan.ts` — row plans
- `src/features/landing/grid/spacing-plan.ts` — row-local compensation
- `src/features/landing/grid/mobile-lifecycle.ts` — mobile expansion phases
- `src/features/landing/grid/desktop-shell-phase.ts` — visual shell phases

Runtime ownership after the 2026-04-30 split:

- `src/features/landing/grid/landing-catalog-grid-loader.tsx` — subscribes to `useTelemetryConsentSource()` and resolves the catalog through `resolveLandingCatalog(locale, {consentState})`, so consent-aware card visibility is a loader/catalog concern rather than a card-render concern.
- `src/features/landing/grid/use-landing-interaction-controller.ts` — **738 lines**, owns the two `useReducer` calls, capability/reduced-motion/visibility sync, card focus/expand commands, per-card binding composition, and transition-start callback composition. Pure visual projection is split: `interaction-state.ts` derives card visual state via `resolveVisualState`, and `desktop-shell-phase.ts` derives desktop motion roles via `resolveDesktopMotionRole`.
- `src/features/landing/grid/interaction-dom.ts` — DOM/focus helpers: card-root lookup, expanded focusable selection, adjacent-card resolution, queued focus callbacks, mobile-card detection, and card-boundary resolution.
- `src/features/landing/grid/use-hover-intent-controller.ts` — hover timers/tokens, last pointer position, card-boundary containment checks, and trigger `onMouseEnter` / `onMouseLeave` handlers.
- `src/features/landing/grid/use-desktop-motion-controller.ts` — desktop opening/closing/handoff visual state, transition reason ref, cleanup timers, and double-RAF cleanup.
- `src/features/landing/grid/use-mobile-card-lifecycle.ts` — **287 lines**, owns mobile lifecycle orchestration, queued close, keyboard handoff, viewport reset, open/close timer coordination (including transient shell teardown after both open and close timers), and public API composition.
- `src/features/landing/grid/use-mobile-scroll-lock.ts` — **27 lines**, owns phase-based body scroll lock.
- `src/features/landing/grid/use-mobile-backdrop-gesture.ts` — **100 lines**, owns outside gesture state and pointer handlers.
- `src/features/landing/grid/mobile-card-lifecycle-dom.ts` — **48 lines**, owns mobile snapshot capture and restore measurement helpers.
- `src/features/landing/grid/use-mobile-restore-polling.ts` — **120 lines**, owns the restore-ready marker timer and RAF polling with the restore-settled predicate injected from the hub orchestrator.
- `src/features/landing/grid/use-mobile-transient-shell.ts` — **57 lines**, owns transient shell state; no independent auto-reset timer — teardown driven by the orchestrator's open and close timers via `resetMobileTransientShell()`.
- `src/features/landing/grid/use-keyboard-handoff.ts` — **95 lines**, composition layer for keyboard-mode tracking, first landing entry, and per-card keyboard handlers.
- `src/features/landing/grid/use-keyboard-mode-tracker.ts` — global Tab/Escape keyboard-mode entry and mousedown exit listener wiring.
- `src/features/landing/grid/use-landing-keyboard-entry.ts` — reverse Shift+Tab focus return from the first landing card toward the GNB target.
- `src/features/landing/grid/use-card-keyboard-handler.ts` — **313 lines**, per-card focus/key handlers, expanded-body traversal, mobile keyboard handoff, and desktop transition intent handoff.
- `src/features/landing/grid/use-grid-geometry-controller.ts` — **446 lines**, spacing model, row baseline snapshots, reducer-owned `BASELINE_READY`/`BASELINE_FROZEN` freeze/release, 32ms release timer lock, plan-change collapse, and `LANDING_GRID_PLAN_CHANGED_EVENT`.
- `src/features/landing/grid/landing-catalog-grid.tsx` — **274 lines**, keeps `shellRef`, `containerRef`, viewport/grid inline-size measurement, `LandingGridPlan` calculation, render assembly, and data attributes.
- `src/features/landing/grid/landing-grid-card.tsx` — **1,294 lines**, owns the visual card component, semantic CSS-module class mapping, normal/expanded/mobile/transient render branches, inline CSS custom properties for runtime geometry, and public `data-*` QA/debug anchors.

The core risk is still choreography complexity across hover, keyboard, mobile, desktop shell phases, transition cleanup, and geometry timing, but ownership is now explicit and testable at narrower seams. Styling ownership is hybrid: static shells plus boolean-resolvable card states live as utility/class constants in `landing-catalog-grid.tsx` and `landing-grid-card.tsx`, while `landing-grid-card.tsx` remaps raw runtime state into semantic style classes consumed by `landing-grid-card.module.css` for motion, focus continuity, reduced-motion branches, and desktop/mobile transient choreography. Raw `data-*` attributes remain on the DOM as QA/debug and Playwright anchors and are the runtime contract that a future visual-system replacement must preserve.

2026-05-07 R-08 note: keyboard-mode HOVER_LOCK non-target cards now use root `inert` while keeping `data-hover-lock-blocked` as the QA marker; card-to-card keyboard handoff dispatches the target focus state before queued DOM focus so the target is no longer inert when focused.

### 5.2 GNB

`src/features/gnb/site-gnb.tsx` — **401 lines** — keeps the rendered GNB shell: JSX, class constants, Escape priority, cleanup coordination, locale switching, theme switching, and hook orchestration for the keyboard/focus contract. Focused modules now own desktop settings behavior, mobile menu choreography, route-aware back navigation, landing-card focus transfer, landing GNB entry mode, GNB keyboard target discovery, and Tab routing.

Key supporting files: `src/features/gnb/behavior.ts`, `src/features/gnb/types.ts` (defines `GnbContext` per route: landing/blog/history/test), `src/features/gnb/gnb-keyboard-dom.ts`, `src/features/gnb/hooks/use-gnb-desktop-settings.ts` (111 lines), `src/features/gnb/hooks/use-gnb-mobile-menu.ts` (160), `src/features/gnb/hooks/use-gnb-back-navigation.ts` (104), `src/features/gnb/hooks/use-landing-gnb-entry-mode.ts` (87), `src/features/gnb/hooks/use-gnb-keyboard-targets.ts` (80), `src/features/gnb/hooks/use-gnb-tab-routing.ts` (119), `src/features/gnb/hooks/use-theme-preference.ts` (139), `src/features/gnb/hooks/theme-transition.ts` (199), and exported-but-unwired `src/features/gnb/hooks/use-keyboard-mode-tracker.ts` (41).

2026-05-08 GNB keyboard routing note: `gnb-keyboard-dom.ts` owns GNB-to-landing focus transfer with `aria-disabled` and ancestor-`inert` filtering; `useLandingGnbEntryMode()`, `useGnbKeyboardTargets()`, and `useGnbTabRouting()` own the extracted keyboard entry, target discovery, and Tab routing seams. `useGnbKeyboardModeTracker()` remains exported from `src/features/gnb/index.ts` but is not consumed by `SiteGnb`; the hook still has a wheel listener and a TODO to wire only after `docs/req-landing.md §7.5` compliance review.

2026-05-05 GNB cleanup note: `behavior.ts` centralizes shared GNB timing constants including mobile test-back fallback timing; `useGnbDesktopSettings()`, `useGnbMobileMenu()`, and `useGnbBackNavigation()` now have focused unit coverage.

Theme/locale subsystem: `public/theme-bootstrap.js` sets `document.documentElement.dataset.theme` before hydration from `localStorage` key `vivetest-theme` or system preference; `src/features/gnb/hooks/use-theme-preference.ts` persists/removes manual overrides and mirrors the resolved theme to the DOM; `src/features/gnb/hooks/theme-transition.ts` owns the 2500ms blur-circle View Transition API with reduced-motion/no-support fallback; `SettingsControls` emits locale/theme choices; `SiteGnb` routes locale changes through `buildLocalizedPath(currentRoute, nextLocale)`.

`src/features/landing/shell/page-shell.tsx` mounts the transition overlay, live GNB, constrained `<main>`, and default telemetry consent banner for every localized route unless the route opts out. It is a shared runtime shell, not a page-local header.

### 5.3 Catalog Data Model

Current source boundaries:

| Source | Identity boundary | Current owner / implementation |
|---|---|---|
| Landing/card metadata | row-level `variant` plus `seq` ordering | `src/features/variant-registry/source-fixture.ts` and `scripts/sync/sheets-loader.ts#loadLandingSheet()` provide title/subtitle/tags/instruction, `attribute`, and `durationM` / `sharedC` / `engagedC`. Source rows include `seq`; runtime cards do not. |
| Questions content | workbook sheet name = `variantId`; rows do not carry variant identity | `src/features/test/fixtures/questions/**` and `loadQuestionsWorkbook()` model `seq`, localized question/answer text, and scoring poles. `src/features/test/question-source-parser.ts` maps numeric `seq` to `scoring`, `q.*` to `profile`, assigns source-order canonical indexes, and exposes `findFirstScoringRow()` for preview derivation. |
| Results source | row-level `variantId` only | `src/features/test/fixtures/results/**` currently preserves only the testable variant identity set. There is no Results content schema, result section loader, or real Results Sheets loader yet. |
| Code-owned schema registry | variant id → `ScoringLogicType` → cloned `ScoringSchema` | `src/features/test/schema-registry.ts` is the only owner of schema templates and qualifier specs; neither Landing nor Questions source rows duplicate `scoringLogicType`. |

Current fixture inventory:
- 10 total cards (7 test, 3 blog)
- Test card attributes: 3 `available`, 1 `opt_out`, 1 `unavailable`, 1 `hide`, 1 `debug`
- Blog card attributes: 3 `available`
- Publicly enterable test variant ids: `qmbti`, `rhythm-b`, `energy-check`, `egtt`
- Blog variants: `ops-handbook`, `build-metrics`, `release-gate`
- Results fixture variants: `qmbti`, `rhythm-b`, `energy-check`, `egtt` (row-level `variantId` only; result content schema is not defined in this phase)
- Enterable Questions fixtures now pass `validateVariantDataIntegrity()`: `qmbti`, `energy-check`, and `egtt` were hardened with `Q_placeholder_*` rows on formerly even-count axes; `rhythm-b` already had odd counts on all axes and was left unchanged.
- `debug-sample` is an intentional lazy-validation failure fixture (`EVEN_AXIS_QUESTION_COUNT`) and is used for route-level recovery assertions.

`src/features/variant-registry/attribute.ts` owns `attribute` normalization: `deriveAvailability()`, `isEnterableCard()`, `isCatalogVisibleCard()`, `isUnavailablePresentation()`.

`src/features/variant-registry/source-fixture.ts` is now Landing metadata-only: source rows carry card metadata, `seq`, and instruction copy, but no inline preview fields. `src/features/variant-registry/types.ts` separates source-facing and runtime-facing shapes: source rows can carry `seq`, runtime cards move metrics under `test.meta` / `blog.meta`, and preview payloads live in a separate `testPreviewPayloadByVariant` store. `src/features/variant-registry/resolvers.ts` centralizes `loadVariantRegistry()`, locale fallback, consent-aware catalog filtering, strict variant lookup, runtime-entry lookup, and the `resolveTestPreviewPayload()` boundary.

`src/features/variant-registry/cross-sheet-integrity.ts` provides the shared pure cross-source validation helper: `validateCrossSheetIntegrity(landingTestVariants, questionVariants, resultsVariants?)`. With `resultsVariants` present it compares Landing test IDs, Questions sheet-name IDs, and Results row-level `variantId`s, returning `missingInQuestions`, `extraInQuestions`, `missingInResults`, and `extraInResults`. The third argument is optional, so existing 2-source callers still get Landing↔Questions-only `ok` semantics with empty Results arrays. Blog variants remain caller-excluded from `landingTestVariants`.

`loadVariantRegistry()` now has an explicit runtime source split: production reads the static `variantRegistryGenerated` artifact and does not run request-time cross-source fallback; dev/test builds a fixture registry by injecting `questionSourceFixture` into `buildVariantRegistry()`. The dev/test fixture path then runs 3-source validation using `resolveResultsVariantIds()` and applies `applyCrossSheetRuntimeFallback()`: Landing-only variants are downgraded to `hide`, while Questions-only, Results-missing, and Results-only mismatches are added to `blockedRuntimeVariants` without changing catalog attributes for existing cards. `src/app/[locale]/test/[variant]/page.tsx` checks that blocked set before resolving the entry card, redirects blocked variants to `/test/error?variant=...`, and then uses `resolveLandingTestEntryCardByVariant()` for the route-level card lookup. Production relies on the sync script's pre-write validation and the generated file as its last-known-good artifact.

The dev/test fixture registry state is intentionally cached at module scope so repeated `loadVariantRegistry()` calls return the same `VariantRegistry` object within one test/runtime process. A 2026-04-24 refactor added `clearDevRegistryCacheForTesting()` in `src/features/variant-registry/resolvers.ts` as a direct-import-only test isolation hook. It resets only the fixture registry cache, is not exposed through `src/features/variant-registry/index.ts`, and is covered by `tests/unit/variant-registry-runtime-integrity.test.ts` with both reference-equality and reset-invalidates-cache assertions. The production static import path remains unchanged.

`src/features/variant-registry/builder.ts` validates source rows, sorts by `seq`, drops `seq` from the exported runtime registry, and emits separate `landingCards` / `testPreviewPayloadByVariant` runtime stores. The builder does not import Questions fixtures; callers inject `questionSourcesByVariant`, and the preview store is projected from each variant's first scoring row via `findFirstScoringRow()`. `resolveTestPreviewPayload()` reads the registry's `testPreviewPayloadByVariant` store and exposes the stable `previewQuestion` / `answerChoiceA` / `answerChoiceB` runtime shape. Runtime meta keys are unified as `durationM` / `sharedC` / `engagedC`.

`src/features/variant-registry/sheets-row-normalizer.ts` is the pure pre-sync Questions row normalization boundary for Group B callers. It converts raw Sheets columns such as `question_EN`, `answerA_KR`, and `pole_A` / `pole_B` into parser-compatible `QuestionSourceRow` shape (`question` / `answerA` / `answerB` `LocalizedText`, `poleA` / `poleB`). Locale suffix mapping is owned by `parseLocaleColumnKey()` (`EN` → `en`, `KR` → `kr`, `ZS` → `zs` via lowercase normalization), unsupported columns/locales are ignored, and empty string values are omitted so the existing default-locale fallback path remains responsible for display fallback. `tests/unit/sheets-row-normalizer.test.ts` verifies both TypeScript assignability to `QuestionSourceRow` and runtime compatibility with `buildCanonicalQuestions()`.

`scripts/sync/sheets-loader.ts` is the Group B-1 pure Google Sheets loading boundary. It uses the `googleapis` Service Account client (`GoogleAuth` with readonly spreadsheets scope), reads the `Landing` sheet directly, and returns `ReadonlyArray<VariantRegistrySourceCard>` after converting flat Landing columns (`title_EN`, `tags_KR`, `instruction_JA`, etc.) into `LocalizedText` / `LocalizedStringList` source shape. It skips invalid Landing rows with `console.warn` and never calls `buildVariantRegistry()`, cross-source validation, file I/O, Git, or GitHub Actions. Questions workbook loading first reads sheet titles via `spreadsheets.get`, preserves each raw sheet name as the Map key, reads each sheet with `FORMATTED_VALUE`, skips empty/unparseable `seq` rows, and passes every kept row through `normalizeQuestionSheetRow(rawRow, locales)`. The Results loader is not implemented; the file still carries a `TODO(results)` for `loadResultsSheet(client, spreadsheetId)`. `tests/unit/sheets-loader.test.ts` covers the googleapis mock boundary, Landing test/blog union mapping, tag splitting, invalid row skipping, empty sheets, API error propagation, and Questions workbook Map output.

`scripts/sync/sync.ts` is the Group B-2 production orchestration boundary. It loads `.env.local` via `dotenv` for local smoke, requires `GOOGLE_SHEETS_SA_KEY`, `GOOGLE_SHEETS_ID_LANDING`, and `GOOGLE_SHEETS_ID_QUESTIONS`, creates the Sheets client, loads Landing and Questions in parallel, excludes `type === 'blog'` rows from `landingTestVariants`, runs `validateCrossSheetIntegrity(landingTestVariants, questionVariants)` in 2-source mode, and only then calls `buildVariantRegistry(landingRows, questionSourcesByVariant)` with the builder's positional 2-argument signature. It does not read Results rows and `.github/workflows/sync.yml` does not provide `GOOGLE_SHEETS_ID_RESULTS` yet. The script serializes through `serializeRegistryToFile()`, compares against `src/features/variant-registry/variant-registry.generated.ts` resolved from `process.cwd()`, exits with `no changes` when identical, and otherwise writes the full generated file before `git add`, `git commit -m "chore: sync variant registry from Sheets [skip ci]"`, and `git push`. If any git operation fails after write, it restores the original generated file content before exiting non-zero, preserving the last-known-good artifact. Branch-protection bypass is explicitly not implemented; the catch block tells operators to configure a PAT or exempt the Actions bot if direct push is blocked. `tests/unit/sync-orchestration.test.ts` covers missing env, cross-source mismatch, no-op sync, write/commit/push, git failure restore, and blog exclusion.

`.github/workflows/sync.yml` runs Group B-2 on `main` pushes with `permissions: contents: write`, checkout on `github.ref_name`, Node 22 setup, `npm ci`, GitHub Actions bot git identity, and `npm run sync` with the three current Sheets secrets. The sync step has `continue-on-error: false`; the script itself owns file restoration on post-write git failures.

`scripts/sync/sync-dry-run.ts` is the local no-Sheets verification path. It loads `.env.local` quietly, injects `getVariantRegistrySourceFixture()` and `questionSourceFixture` directly into the same builder + serializer path, writes no files, performs no git operations, and emits the generated TypeScript source to stdout. It is exposed as `npm run sync:dry`.

`src/features/variant-registry/variant-registry.generated.ts` is a static object-literal `VariantRegistry` artifact, not a runtime fixture-build bridge. The current baseline has been synchronized through the B-2 Sheets sync path, and the dev/test fixture sources mirror that generated artifact so `variantRegistryGenerated` remains structurally equal to the fixture builder output. `scripts/sync/regenerate-variant-registry-from-fixture.ts` remains available as a fixture-only one-shot regeneration path; `scripts/sync/sync-dry-run.ts` is the safer no-write verification path for comparing fixture builder + serializer output.

`src/features/variant-registry/registry-serializer.ts` is the pure generated-file serialization boundary. `serializeRegistryToFile(registry)` returns the TypeScript file contents for an object-literal `variantRegistryGenerated` export using the existing generated header, `import type {VariantRegistry} from './types'`, and deterministic alphabetic object-key ordering. `tests/unit/registry-serializer.test.ts` checks parseability, deterministic output, key-order normalization, and structural equivalence against the currently importable generated registry data. This utility does not read Sheets, write files, or run Git; `scripts/sync/sync.ts` owns that orchestration.

`src/features/test/question-source-parser.ts` is the pure Questions parser boundary: `parseSeqToQuestionType()` (`q.*` → profile, numeric → scoring), `buildCanonicalQuestions()` (source-order 1-based canonical indexes), and `findFirstScoringRow()`. Group D preview migration is complete: `src/features/test/question-bank.ts` exposes live `buildVariantQuestionBank()` runtime wiring and `resolveVariantPreviewQ1()` for direct Questions-backed `scoring1` projection helpers, while landing UI preview consumption stays behind the variant-registry resolver. The deprecated inline-bridge compatibility export has been removed, so live question-bank coverage now stays on `tests/unit/variant-question-bank.test.ts`, where the live APIs cover locale fallback and profile-row skipping for `scoring1`. The obsolete `src/features/landing/data/` compatibility directory has been removed; consumers use `src/features/variant-registry` directly.

Route guard status is split across two layers. Registry-level mismatch guards live in `resolvers.ts` and can block runtime entry before a card is resolved. Domain-level lazy validation lives in `src/features/test/lazy-validation.ts`: it fetches the schema from `schema-registry.ts`, requires a first scoring row, builds canonical questions with the default locale, runs `validateVariantDataIntegrity()`, and caches both pass and fail results by variant in a module-level `Map`. The test route fails closed with `notFound()` for malformed segments or true card misses, but redirects registry-blocked and lazy-validation-failed variants to `/test/error?variant=...` before creating session/run context.

### 5.4 Transition Runtime

Landing-to-destination handshake: `src/features/transition/use-landing-transition.ts` converts CTA clicks into localized route pushes. Before navigation, `src/features/transition/runtime.ts` rejects duplicate-locale target routes before persistence, records return scroll position plus source variant, writes `PendingLandingTransition` to `sessionStorage`, and emits the internal `transition_start` signal. For valid test-card transitions with a pre-answer, it also writes a landing ingress record (`variant`, `preAnswerChoice`, `createdAtMs`, `landingIngressFlag`) and emits `card_answered` through the telemetry runtime. Blog transitions persist pending/return-scroll state and internal transition signals, but they do not emit `card_answered` and do not write landing ingress.

Destination readiness is explicit. Test and blog destinations call `completePendingLandingTransition({targetType})` only after their route context is ready; completion emits `transition_complete` and clears only `vivetest-landing-pending-transition`. Return-scroll keys stay available for a future landing return and are consumed by `LandingRuntime` through `consumePendingReturnScrollRestore()`. `TransitionRuntimeMonitor`, mounted in `src/app/[locale]/layout.tsx`, enforces a **1600ms timeout** and terminates stale pending state with `transition_fail` / `DESTINATION_TIMEOUT`. `LandingRuntime` cancels stale pending transitions on the landing route with `transition_cancel` / `USER_CANCEL`.

`TransitionGnbOverlay` subscribes through `usePendingLandingTransition()` and renders an inert, `aria-hidden` landing-context `SiteGnb` above non-landing destinations while pending state exists. Store observers are notified through `landing:transition-store-change`; rollback cleanup is centralized in `rollbackLandingTransition()`, which removes pending transition, return-scroll keys, and optional landing ingress before dispatching one store-change event and one `landing:transition-cleanup` event. Result reasons remain `USER_CANCEL`, `DUPLICATE_LOCALE`, `DESTINATION_TIMEOUT`, `DESTINATION_LOAD_ERROR`, and `UNKNOWN`. All transition persistence is session-scoped and client-only.

### 5.5 Destination Bootstrap

**Blog** (`src/features/blog/server-model.ts`, `src/features/blog/blog-destination-client.tsx`): `variant` is the only article identifier. Invalid or non-enterable variants redirect to the localized blog index. Pending transition is an overlay/completion signal only. The detail route exports `generateMetadata()`.

**Test** (`src/features/test/test-question-client.tsx` and collaborators): the client is now a composition/render shell. It builds the locale-resolved question bank and qualifier overlay model, derives instruction visibility and presentation labels, wires slide direction state, calls the controller/orchestrator/answer hooks, and renders the overlay, scoring panel, qualifier chip, and result connector. It still avoids direct imports from `src/features/test/domain/`.

Instruction is not a separate route. It is an in-page overlay controlled by `test-question-client.tsx` and rendered through `OverlayConnector` / `InstructionOverlay`; the route remains `/[locale]/test/[variant]` for instruction, qualifier, scoring runtime, and placeholder result states. `resolveInstructionVisible()` keeps the overlay visible while booting, before entry commit, during qualifier steps, and during qualifier re-entry; it lets the panel take over only after entry is committed or after a permitted no-qualifier auto-commit.

`use-test-entry-orchestrator.ts` is the current CTA action interpreter. `executeInstructionAction()` reads `entryPolicy.effects[action]`, applies consent writes and `markInstructionSeen()` before branch decisions, advances the qualifier wizard when required, dispatches `REDIRECT_HOME` plus `router.replace(landingPath)` for abandon/keep-current actions, and clears Landing Ingress only when the redirect came from an ingress path. Fresh entry commit dispatches `COMMIT_ENTRY` with optional qualifier answers and writes qualifier responses to storage; qualifier re-entry does not dispatch `COMMIT_ENTRY`, but writes qualifier-only responses, calls `resetScoringAnswers()`, and closes the wizard.

`test-run-reducer.ts` owns the booting / instruction / active / submitted / redirecting phase graph, canonical-index keyed string answers, qualifier answer merge, scoring-answer reset, previous-navigation tail reset, submit guard, and new-vs-resume entry mode. `use-test-run-bootstrap.ts` owns pending-transition hydration, Landing Ingress priority over active-run resume, active-run + response-set reads, qualifier resume validation, stale resume cleanup, Strict Mode replay caching, and `BOOTSTRAP_COMPLETE` dispatch. `bootstrap-state-resolver.ts` keeps pure initial-index, resume-index, ingress seed-answer, and bootstrap response projection logic separate from storage reads. On resume, the hook uses the projected response set for prerequisite math but dispatches the raw stored response payload so qualifier tokens such as `M` / `F` survive in reducer state for chip labels.

`use-test-run-controller.ts` owns the reducer instance, scoring progress, answer persistence, active-run metadata writes, previous/next navigation, dwell tracking through `use-question-dwell.ts`, and `attempt_start` / `final_submit` telemetry. `consumeLandingIngress()` intentionally stays in the controller's active-entry effect after `COMMIT_ENTRY`; the bootstrap hook reads ingress and seeds state but does not consume it. `question-runtime-utils.ts` owns scoring-only progress and profile-skip helpers, while the controller keeps the small semantic-answer map adapter local.

Ingress entries keep the landing `scoring1` pre-answer in reducer answers at commit, then the runtime panel skips profile questions and starts at the first scoring question that still needs display: `qmbti` starts at canonical index 2, and `egtt` also renders its first scoring question at canonical index 2 because `q.1` is collected in the instruction overlay. Active-Run Resume restores filtered canonical answers when qualifier prerequisites are valid; missing or invalid qualifier answers clear the stale run context and return through instruction/qualifier collection, while valid resume skips `attempt_start`. The live question panel renders scoring questions only, renders user-facing `Q` labels using scoring order, and displays main progress as answered scoring count / total scoring count.

Answer selection is split across three boundaries. `use-answer-lock.ts` owns the 150 ms timer and disabled-button lock state. `use-answer-handler.ts` owns answer-choice guards, calls `updateAnswer`, emits `question_answered` for non-final scoring answers, clears or schedules delayed advance, and keeps the stale-submit `submittedRef` guard. The controller persists canonical response-set writes and active-run `lastAnsweredAtMs`; delayed advance captures the clicked choice before React render catch-up and skips already-answered resume gaps. Previous remains present in the DOM and is hidden at Q1 with `visibility: hidden` so navigation space is preserved. Qualifier variants expose a chip after entry; re-entry seeds the existing qualifier token, cancel preserves answers, and confirm writes qualifier-only responses before restarting at the first scoring question.

The answer grid uses `motion/react` directional slide transitions on question navigation, with reduced-motion removing horizontal movement. `use-before-unload-guard.ts` registers the native reload/close prompt only during a started, not-yet-submitted run, and `use-landing-transition-completion.ts` completes the destination-side pending transition once the runtime is ready. It does not yet run score derivation, result URL construction, answer projection into domain tokens, result-entry cleanup, or history persistence. `final_submit.final_responses` uses scoring canonical question index string keys (`"1"`, `"2"`, ...) mapped to semantic `A` / `B` values and excludes qualifier/profile tokens. The placeholder result panel fires `result_viewed` once on mount without `derived_type` until the real result pipeline replaces it with IntersectionObserver. `src/features/test/entry-policy.ts` separates content, CTA configuration, and action effects; `src/features/test/qualifier-overlay-model.ts` maps qualifier fields to overlay items; `src/features/test/qualifier-resume-validator.ts` guards resume against missing or invalid qualifier tokens. `src/app/[locale]/test/[variant]/page.tsx` regex-validates the URL segment, redirects runtime-blocked variants to `/test/error?variant=...`, resolves via `resolveLandingTestEntryCardByVariant(locale, variant)`, fails closed with `notFound()` on true miss, and runs `getLazyValidatedVariant()` before mounting the runtime.

**Pure test-domain foundation** (`src/features/test/domain/*`): separate pure module for branded ids, schema/question models, variant validation, question-model validation, variant data integrity checks, score derivation, and type-segment parsing/building. Its public surface is `src/features/test/domain/index.ts`, which exports `computeScoreStats()`, `deriveDerivedType()`, `parseTypeSegment()`, `buildTypeSegment()`, branded-type helpers, frozen result unions, and the validation helpers. `derivation.ts` exports the shared `axisMatchesQuestion()` helper so `computeScoreStats()`, `validateQuestionModel()`, and `validateVariantDataIntegrity()` all use the same bidirectional axis matching rule. `Question.poleA` / `Question.poleB` are required for `scoring` questions and optional for `profile` questions (ADR-X). These helpers are implemented and unit-covered, but they are not wired into the live submit/result path yet.

`src/features/test/schema-registry.ts` is the single owner of the variant → `ScoringLogicType` → `ScoringSchema` template mapping. MBTI variants share the 4-axis `E/I`, `S/N`, `T/F`, `J/P` schema. EGTT resolves to one `E/T` axis plus the `gender` qualifier with `['M', 'F']` token values. `response-projection.ts` remains an intentionally empty projection placeholder: current runtime state stores scoring answers as semantic `A` / `B` values and qualifier answers as schema tokens such as `M` / `F`, while `final_submit.final_responses` emits only scoring `A` / `B`. The real result pipeline still needs a projection/validation helper before passing runtime responses into `computeScoreStats()` or `buildTypeSegment()`.

**Live runtime status**: `test-question-client.tsx` still does not import `src/features/test/domain/` directly. The route `page.tsx` uses the lazy-validation boundary, so domain integrity failures now redirect to the `/[locale]/test/error` stub before session/run context creation. The current stub route displays `이 테스트에 진입할 수 없습니다`, includes the blocked variant when `?variant=...` is present, uses `PageShell` with the test GNB context, and suppresses the default consent banner. Phase 4 still owns the full recovery-card UI expansion.

### 5.5.1 Phase 1 Domain Foundation — Frozen Interface Contracts

> These contracts were frozen by the Phase 0–1 ADRs. Shape or enum-value changes require a new ADR.
> Phase 2+ implementations should consume the signatures below.

```typescript
// Core branded types — 변경 시 새 ADR 필요
type VariantId     = string & { readonly __brand: 'VariantId' }  // object-wrapping 금지
type QuestionIndex = number & { readonly __brand: 'QuestionIndex' }
type AxisCount     = 1 | 2 | 4  // branded literal union 격상 미결 — plain union 기준 유지

interface Question {
  index: QuestionIndex
  poleA?: string; poleB?: string  // scoring은 필수, profile은 optional (ADR-X)
  questionType: 'scoring' | 'profile'
}
interface QualifierFieldSpec {
  key: string; questionIndex: QuestionIndex
  values: string[]; tokenLength: number
}
interface AxisSpec { poleA: string; poleB: string; scoringMode: 'binary_majority' | 'scale' }
interface ScoringSchema {
  variantId: VariantId; scoringSchemaId: string  // scoringSchemaId는 URL에 포함하지 않음
  axisCount: AxisCount; axes: AxisSpec[]
  supportedSections: SectionId[]
  qualifierFields?: QualifierFieldSpec[]
}
interface VariantSchema {
  variant: VariantId; schema: ScoringSchema
  questions: Question[]  // scoring + profile 전체, canonical 실행 순서
}
// ScoreStats = Record<axisId, { poleA, poleB, counts: Record<string,number>, dominant: string }>
// ResultPayload = { scoreStats: ScoreStats; shared: boolean }
```

```typescript
// validateVariant — Phase 4 entry path 소비. 시그니처·union shape 동결
validateVariant(input: unknown, registeredVariants: VariantId[], availableVariants: VariantId[])
  : { ok: true; value: VariantId }
  | { ok: false; reason: 'MISSING' | 'UNKNOWN' | 'UNAVAILABLE' }
// MISSING: null·undefined·''·비-string. UNKNOWN: 등록 외. UNAVAILABLE: 등록됨·available 아님
```

```typescript
// validateVariantDataIntegrity — Phase 2 registry builder 소비. enum 동결
type BlockingDataErrorReason =
  | 'EMPTY_QUESTION_SET' | 'QUESTION_MODEL_VIOLATION'
  | 'EVEN_AXIS_QUESTION_COUNT'    // binary_majority axis에만 적용
  | 'AXIS_COUNT_SCHEMA_MISMATCH'  // axes 배열 길이 ≠ axisCount
  | 'DUPLICATE_AXIS_SPEC' | 'UNSUPPORTED_SCORING_MODE'
  | 'QUALIFIER_QUESTION_NOT_FOUND' | 'QUALIFIER_QUESTION_NOT_PROFILE'
  | 'DUPLICATE_QUALIFIER_KEY' | 'QUALIFIER_SPEC_INVALID' | 'DUPLICATE_QUALIFIER_VALUE'
// 새 reason 추가는 새 ADR 대상

validateVariantDataIntegrity(schema: VariantSchema)
  : { ok: true } | { ok: false; reason: BlockingDataErrorReason; detail?: string }
```

```typescript
// computeScoreStats / deriveDerivedType — Phase 7 소비
// scoring 문항만 집계; profile 문항 응답은 ScoreStats에 포함하지 않음
// schema axis와 역방향인 question도 같은 axis로 집계 (bidirectional rule)
computeScoreStats(questions: Question[], responses: Map<QuestionIndex, string>, schema: ScoringSchema)
  : ScoreStats | { error: 'INCOMPLETE_SCORING_RESPONSES' | 'UNMATCHED_QUESTION' }
deriveDerivedType(scoreStats: ScoreStats, schema: ScoringSchema)
  : DerivedType | { error: 'AXIS_NOT_FOUND' | 'TOKEN_LENGTH_MISMATCH' }

// parseTypeSegment / buildTypeSegment — Phase 8 result URL 소비
parseTypeSegment(typeSegment: string, schema: ScoringSchema)
  : { ok: true; derivedType: string; qualifiers: Record<string, string> }
  | { ok: false; reason: 'LENGTH_MISMATCH' | 'INVALID_QUALIFIER_VALUE' }
buildTypeSegment(derivedType: string, responses: Map<QuestionIndex, string>, schema: ScoringSchema)
  : { ok: true; typeSegment: string }
  | { ok: false; reason: 'QUALIFIER_RESPONSE_MISSING' | 'INVALID_QUALIFIER_VALUE' }
```

**ADR-X (completed)**: `Question.poleA` / `Question.poleB` are required only for `scoring` questions and optional for `profile` questions. Spans `types.ts`, `validate-question-model.ts`, `question-source-parser.ts`, and related unit tests.

### 5.6 Telemetry

`src/features/telemetry/consent-source.ts` — single consent gate for custom telemetry, Vercel Analytics, and Speed Insights. The memory snapshot starts as `{consentState:'UNKNOWN', synced:false}`, syncs from `localStorage` key `vivetest-telemetry-consent`, persists only `OPTED_IN` / `OPTED_OUT`, and bridges cross-tab changes via browser `storage` events.

`src/features/telemetry/runtime.ts` — event queueing, anonymous session ID generation, `landing_view` deduplication by `locale:route`, consent-aware flush, and helper exports for the active custom event surface. Only session ID is persisted at `vivetest-telemetry-session-id`; the event queue is in memory and is cleared on opt-out.

`src/features/telemetry/validation.ts` — rejects PII-shaped keys and legacy fields (`transition_id`, `result_reason`, `final_q1_response`).

There are currently six custom telemetry event types in `src/features/telemetry/types.ts`: `landing_view`, `card_answered`, `attempt_start`, `question_answered`, `final_submit`, and `result_viewed`. Internal transition signals (`transition_start`, `transition_complete`, `transition_fail`, `transition_cancel`) are browser events only and are intentionally not telemetry network events. User-visible error events are described in `docs/req-test.md` as future hooks but are not implemented in the live telemetry type union.

**Active event surface:**

| Event | Required fields |
|---|---|
| `landing_view` | deduplicated by locale:route |
| `card_answered` | `source_variant`, `target_route`, `landing_ingress_flag=true` |
| `attempt_start` | `variant`, `question_index_1based`, `dwell_ms_accumulated`, `landing_ingress_flag` |
| `question_answered` | `variant`, `question_index_1based`, `choice`, `dwell_ms`, `landing_ingress_flag` |
| `final_submit` | same as `attempt_start` + `final_responses` (scoring canonical question index string keys: `"1"`, `"2"`, ...; values: semantic `A`/`B`; qualifier/profile tokens excluded) |
| `result_viewed` | `variant`, `landing_ingress_flag`; `derived_type` is optional until the future result pipeline replaces the temporary mount fire with IntersectionObserver |

**Test-runtime telemetry call sites:** `attempt_start` fires from `use-test-run-controller.ts` when a new active entry is committed; active-run resume does not re-emit it. The controller passes the profile-skipped runtime question index and zero accumulated dwell at entry. `question_answered` fires from `use-answer-handler.ts` after the answer persistence callback and before delayed auto-advance scheduling; it is suppressed on the final scoring question because `final_submit` owns completion. Current code passes the scoring-order ordinal (`currentScoringQuestionOrdinal`) into `question_index_1based`, while storage and `final_submit.final_responses` remain canonical-index keyed. `final_submit` fires from `use-test-run-controller.ts` on Submit after settling dwell; it passes `totalQuestions` as `question_index_1based` and filters `final_responses` down to semantic `A` / `B` scoring answers. Validation intentionally differs by event: `attempt_start` / `final_submit` require a positive finite question index, while `question_answered` requires a positive integer.

Qualifier/profile answers are stored and replayed as runtime state, but they are not emitted as `question_answered` events and they are excluded from `final_submit.final_responses`. Qualifier re-entry confirm resets scoring answers without opening a new active-entry telemetry sequence, so the next emitted question-level event is whichever subsequent scoring answer the user chooses. The temporary `result_viewed` call site remains the placeholder result-panel mount effect and omits `derived_type` unless a caller explicitly supplies it.

`src/app/api/telemetry/route.ts` requires an object payload with a supported `event_type`, reuses the shared telemetry transport validator, returns `400` on invalid schema/field hygiene/session contract failures, and returns `204` on accepted payloads. There is still no persistence. Transport validation enforces non-null `session_id` for the current post-attempt events `attempt_start`, `question_answered`, and `final_submit`; `result_viewed` joins that requirement when the placeholder mount fire is replaced by the real result pipeline.

### 5.7 Styling Runtime

Tailwind v4 is active via `src/app/globals.css` `@import "tailwindcss"` plus `postcss.config.mjs`. As of this sweep, `src/app/globals.css` is 149 lines and intentionally limited to theme tokens, visual state tokens, dark-theme overrides, and the shared anchor base. `src/app/layout.tsx` imports that file and injects `public/theme-bootstrap.js` before hydration; `src/app/app-body-class.ts` owns the body background/font utility string.

Feature styling ownership is split by runtime surface:

- Shared shell/GNB/consent visual structure is mostly component-local Tailwind utility constants in `page-shell.tsx`, `site-gnb.tsx`, `settings-controls.tsx`, and `consent-banner.tsx`.
- Landing grid layout and mobile backdrop utility constants live in `landing-catalog-grid.tsx`.
- Landing card static structure and semantic state-class mapping live in `landing-grid-card.tsx`.
- `src/features/landing/grid/landing-grid-card.module.css` (491 lines) owns the animation contract: desktop expanded shell motion, focus continuity, mobile transient open/close shells, reduced-motion branches, and keyframes.
- `data-*` attributes are still rendered as QA/debug/Playwright anchors. Styling should consume semantic classes and CSS custom properties rather than making raw `data-*` values the visual contract.

### 5.7.1 Tailwind v4 Migration — Completion Record

**Historical migration checkpoint (2026-04-16)**: Batches 1–7 and Checkpoints 1–4 were closed during the Tailwind migration. Treat this subsection as provenance for the styling boundary, not as a current gate result.

**Locked decisions:**

- `src/app/globals.css` was reduced from 1,240 lines to **112 lines** in the migration checkpoint; as of the 2026-05-07 theme-matrix visual follow-up, it is **149 lines** after token-only visual QA additions and still retains only token/theme definitions plus the shared anchor base.
- Landing grid/card motion, focus continuity, reduced-motion branches owned by `landing-grid-card.module.css` (491 lines as of 2026-06-27).
- `data-*` anchors remain on the DOM as QA/debug/Playwright surface. Only visual CSS ownership moved.
- Global CSS selector surface intentionally limited to `:root`, `html[data-theme='dark']`, and `a { color: var(--link-ink) }`.
- Do not introduce `tailwind.config.*` until content scanning or theme extension is actually needed.
- The original migration-plan stub was absorbed into this section; use git history for batch-level provenance.

---

## 6. Runtime Contracts and Storage

Storage key changes should be treated as runtime-contract changes, not implementation details.

The key lists below describe the live prototype plus the Phase 3 test storage contract. Phase 3 owns ADR-B test-flow storage topology as `test:{variant}:...` plus `test:{variant}:flag:{flagName}`. The live `instructionSeen` key remains the variant-scoped legacy sessionStorage key format, with key/helper ownership in `src/features/test/storage/instruction-seen.ts`.

**Storage key SSOT:**
- Landing keys: `src/features/landing/storage/storage-keys.ts`
- Test keys: `src/features/test/storage/storage-keys.ts` compatibility re-export, with the concrete Phase 3 API in `src/features/test/storage/test-storage-keys.ts`
- Exception: `public/theme-bootstrap.js` retains `'vivetest-theme'` as a string literal because the pre-hydration script cannot import TypeScript.

**Landing / GNB / transition / telemetry storage boundary:**
- `vivetest-theme` is a GNB/theme preference key. `public/theme-bootstrap.js` reads the literal before hydration; `use-theme-preference.ts` reads/writes/removes the same key after hydration.
- `vivetest-telemetry-consent` is the consent-source persistence key. It stores only `OPTED_IN` or `OPTED_OUT`; absence resolves to runtime `UNKNOWN`.
- `vivetest-telemetry-session-id` is owned by the telemetry runtime and is removed on opt-out.
- `vivetest-current-path` / `vivetest-previous-path` are GNB back-navigation session keys.
- `vivetest-landing-pending-transition`, `vivetest-landing-return-scroll-y`, `vivetest-landing-return-variant`, and `vivetest-landing-ingress:{variant}` are transition/store session keys. Pending state drives the overlay and timeout monitor; return-scroll state is consumed by `LandingRuntime`; ingress is consumed once by test bootstrap/controller flow.

**Test runtime run/answer boundary:**
- Active-run metadata lives in `test:{variant}:activeRun` and contains only `variantId`, `startedAtMs`, and `lastAnsweredAtMs`; responses are intentionally stored separately in `test:{variant}:responses`.
- The response set accepts canonical index string keys with string values. Scoring answers are semantic `A` / `B`; qualifier answers preserve schema tokens such as `M` / `F`.
- Bootstrap reads active-run metadata only when no Landing Ingress exists. If qualifier prerequisites are missing or invalid, it calls the volatility cleanup path and resets instruction visibility instead of trusting the stored run.
- Fresh entry and landing-ingress entry replace stale response state when the controller commits the active entry. Answer selection then writes the response set on every confirmed scoring choice and refreshes `lastAnsweredAtMs`.
- `instructionSeen` is deliberately outside `testVariantKey`: `src/features/test/storage/test-storage-keys.ts` owns `test:{variant}:activeRun`, `test:{variant}:responses`, and `test:{variant}:flag:{flagName}`, while `src/features/test/storage/instruction-seen.ts` owns the helper trio and the legacy `vivetest-test-instruction-seen:{variant}` key factory until a future migration.

**localStorage keys:**
- `vivetest-theme`
- `vivetest-telemetry-consent`
- `vivetest-telemetry-session-id`
- `test:{variant}:activeRun`
- `test:{variant}:responses`
- `test:{variant}:flag:derivation_in_progress`
- `test:{variant}:flag:derivation_computed`
- `test:{variant}:flag:min_loading_duration_elapsed`
- `test:{variant}:flag:result_entry_committed`
- `test:{variant}:flag:result_persisted`

**sessionStorage keys:**
- `vivetest-current-path`
- `vivetest-previous-path`
- `vivetest-landing-pending-transition`
- `vivetest-landing-return-scroll-y`
- `vivetest-landing-return-variant`
- `vivetest-test-instruction-seen:{variant}`
- `vivetest-landing-ingress:{variant}`

**Browser events emitted:**
- `landing:transition-signal` with `transition_start`, `transition_complete`, `transition_fail`, or `transition_cancel`
- `landing:transition-store-change` after pending/return/ingress write-clear operations that need overlay or hook observers to resync
- `landing:transition-cleanup` after rollback cleanup so landing interaction runtime can collapse expanded/mobile state

**Custom telemetry events sent to `/api/telemetry`:**
- `landing_view`
- `card_answered`
- `attempt_start`
- `question_answered`
- `final_submit`
- `result_viewed`

`transition_*` names are reserved for internal browser signals and must not be sent to `/api/telemetry`.

**Prototype behaviors that are easy to miss:**

- Landing ingress is consumed exactly once by the controller after active entry commit: deep-link `/test` entry collects qualifier fields in the instruction overlay and then starts the runtime panel at `scoring1`; landing-ingress entry keeps the pre-answered `scoring1`, collects qualifier fields in the overlay when present, and starts the runtime panel at the next scoring question.
- `card_answered` fires at transition start for valid test cards — telemetry can record ingress intent even when the destination later fails closed.
- `transition_complete` clears only pending transition state; return-scroll keys stay until the landing route consumes and clears them.
- `transition_fail` / `transition_cancel` rollback clears pending transition, return-scroll keys, and variant-scoped ingress, then emits `landing:transition-cleanup`.
- Duplicate-locale target routes are preflight no-ops: no pending transition, no landing ingress, no internal signal, and no telemetry event.
- Test-route consent writes now originate only from instruction CTA actions; the page renders no route-local consent banner, no confirm dialog, and no blocked-start popup.
- `vivetest-test-instruction-seen:{variant}` is still variant-scoped in `sessionStorage`; active-run resume clears it when stored resume data is inconsistent with required qualifier prerequisites.
- `[Start]`, `[Accept All and Start]`, and `[Deny and Start]` record `instructionSeen`; for qualifier variants they advance to the qualifier step first, and final qualifier Continue commits runtime entry.
- `[Deny and Abandon]` and `[Keep Current Preference]` do not record `instructionSeen`; they redirect home instead.
- Auto-commit after `instructionSeen` applies only when the entry policy permits it and the variant has no qualifier fields; note-based consent policies keep `canAutoCommitAfterInstructionSeen=false`, and qualifier variants suppress auto-commit until valid qualifier answers are present.
- Blog destination rejects invalid or non-enterable variants by redirecting to the localized blog index.
- Test variant URL validation is stricter than before: malformed variant segments and true route/card misses still use `notFound()`, while runtime-blocked variants and lazy-validation failures redirect to `/test/error?variant=...`.
- `history` page shares the full landing shell and GNB.
- Preferences button in the consent banner is a visible no-op.

---

## 7. Testing and Quality Gates

### 7.1 Unit Tests (Vitest)

Scoped to `tests/unit/`. Current deterministic file inventory: 74 `*.test.ts` files. The file count is treated as the inventory contract; total assertion/case count is not recorded here because Vitest suites can contain nested or generated cases.

| Surface | Primary unit coverage |
|---|---|
| Routing / locale | `route-builder`, `localized-path`, `locale-resolution`, `proxy-policy`, `request-locale-header`, and locale config tests |
| Landing grid / interaction | Interaction state/DOM, interaction-controller handler identity, hover intent, desktop shell phase, mobile lifecycle, mobile backdrop gesture, mobile scroll lock, grid plan, spacing plan, baseline manager, card contract, data contract, and landing return-scroll runtime tests |
| GNB / theme / shell | GNB behavior, desktop settings, mobile menu, back navigation, keyboard DOM, landing entry mode, keyboard target discovery, Tab routing, theme transition, theme label messages, consent banner, and Vercel analytics/speed-insights gate tests |
| Transition / telemetry | Transition runtime/store tests, telemetry runtime/validation/API route tests, `question_answered` transport/runtime tests, and placeholder `result_viewed` mount telemetry tests |
| Test runtime / entry | `test-run-reducer`, `use-test-run-controller`, bootstrap, runtime utils, entry policy, base orchestrator, qualifier entry, qualifier re-entry, instruction overlay, overlay connector, qualifier chip, qualifier model/resume validation, answer handler, result panel, lazy validation, and storage active-run/response-set/state-flag/volatility tests |
| Test domain / data / sync | Domain validation/derivation/type-segment tests, schema registry, question source parser, live question bank, cross-sheet integrity, registry serializer/runtime integrity, Sheets row normalizer/loader, sync orchestration, and blog server model tests |

Instruction/qualifier coverage is split by responsibility: `instruction-overlay.test.ts` owns direct overlay rendering states; `use-test-entry-orchestrator.test.ts` covers auto-commit, consent-writing start actions, redirect-home cleanup, and runtime-ready/redirect guards; `test-entry-orchestrator-qualifier.test.ts` covers qualifier step progression, draft retention, canonical string-key commit payloads, and no-qualifier direct commit; `test-entry-orchestrator-reentry.test.ts` covers re-entry seeding, cancel, scoring reset, and qualifier-only storage writes. Supporting tests cover reducer qualifier merge/reset, active-run qualifier invalidation, bootstrap token normalization, instructionSeen volatility cleanup, overlay connector mapping, qualifier chip keyboard behavior, qualifier model/resume validation, answer telemetry, and placeholder `result_viewed`.

The composed `TestQuestionClient` itself still has no dedicated component-level integration test; its behavior is covered through hook/connector unit tests plus consent/qualifier/transition E2E paths.

### 7.2 E2E Tests (Playwright)

10 spec files in `tests/e2e/`:

`playwright.config.ts` runs the E2E surface with `fullyParallel: true`; local output stays on the `list` reporter, while CI adds the GitHub reporter if a CI job invokes Playwright. Project split: Chromium runs the normal E2E surface and ignores `safari-hover-ghosting.spec.ts`; the `webkit-ghosting` project runs only that Safari-specific spec. The config starts `npm run dev -- --port 4173` by default, or a preview server when `PLAYWRIGHT_SERVER_MODE=preview`.

| Spec | Contract covered |
|---|---|
| `routing-smoke.spec.ts` | Locale-prefix redirects, not-found split, SSR `<html lang>`, zero hydration warnings, lazy-validation error-route redirect, and blog detail routing |
| `gnb-smoke.spec.ts` | Desktop/mobile shell behavior, shared shell width alignment, keyboard traversal matrices, theme-transition fallback, and test-context back behavior |
| `grid-smoke.spec.ts` | Row planning, underfilled-row rules, spacing compensation, baseline freeze, geometry invariants |
| `state-smoke.spec.ts` | Keyboard-sequential traversal, keyboard-mode input policy, overlay focus, mobile keyboard handoff, reduced-motion, transition lock, and answer-button hover fill |
| `a11y-smoke.spec.ts` | AxeBuilder audits for landing, GNB-open, transition-overlay, KR representative state |
| `consent-smoke.spec.ts` | Test instruction contract matrix: variant-specific instruction copy, divider/note rendering, CTA labels, consent persistence, redirect/commit semantics, active-run reload, landing-ingress priority, browser unload warning, and EGTT consent intersections |
| `qualifier-overlay.spec.ts` | EGTT qualifier navigation, selection, commit, resume validation, re-entry, cancel/restart behavior, and qualifier a11y coverage |
| `theme-matrix-smoke.spec.ts` | Full matrix loop: 168 representative theme/layout/state screenshots (96 layout + 72 state); `@gate @smoke` loop: 120 canonical viewport screenshots |
| `safari-hover-ghosting.spec.ts` | WebKit-only hover/shadow seam regression (6 baselines, all `@gate`) |
| `transition-telemetry-smoke.spec.ts` | Landing ingress, transition signals, timeout/load-error/cancel closure, scroll restore, payload hygiene; B16 stale-pending cases assert known hydration console errors caused by intentional sessionStorage injection |

Helper layer: `tests/e2e/helpers/landing-fixture.ts` is the single source of truth for representative anchors via `PRIMARY_AVAILABLE_TEST_VARIANT`, `PRIMARY_AVAILABLE_TEST_INGRESS_STORAGE_KEY`, `PRIMARY_OPT_OUT_TEST_VARIANT`, `PRIMARY_OPT_OUT_TEST_INGRESS_STORAGE_KEY`, `PRIMARY_BLOG_VARIANT`, and `SECONDARY_BLOG_VARIANT`; ingress storage-key constants are constructed through `buildIngressStorageKey(variant)` so representative key values stay centralized; `helpers/consent.ts` seeds consent deterministically; `helpers/axe.ts` formats Axe violations.

Qualifier E2E responsibility is intentionally split: `qualifier-overlay.spec.ts` owns EGTT qualifier navigation, disabled Continue, schema labels, commit storage, resume invalidation, chip re-entry, cancel, restart/reset, and a11y checks; `consent-smoke.spec.ts` owns consent-policy intersections, including UNKNOWN-consent EGTT accept-through-qualifier and Deny-and-Abandon-without-residue cases. This keeps chip/re-entry regressions out of the broader consent matrix while still proving qualifier variants obey instruction CTA consent semantics.

The theme-matrix suites assume the combined theme label remains locked to the messages JSON wording family (`Language ⋅ Theme`); changing that label without updating the visual/message contract is a release-gate drift risk. Full local regeneration remains available through `npm run qa:visual:full`; that command runs both theme-matrix loops and currently reports 288 Chromium tests. The `@gate` E2E tier uses the reduced 120 Chromium theme-matrix screenshots plus 6 WebKit ghosting cases. The theme-matrix manifest currently defines 2 locales, 2 themes, 4 layout cases, and 14 state cases: 168 full representative screenshots (96 layout + 72 state), reduced to 120 `@gate` canonical-viewport screenshots by `stateCanonical` viewport filtering.

Local full-smoke reproduction requires Playwright Chromium and WebKit installation; install with `npx playwright install chromium webkit`.

### 7.3 Custom QA Scripts (`scripts/qa/`)

`scripts/qa/` currently contains 16 `.mjs` files: 12 `check-*.mjs` contract scripts, `run-all.mjs`, `_utils.mjs`, `_path-config.mjs`, and `_locale-list.mjs`. `qa:rules` delegates to `scripts/qa/run-all.mjs`, which runs the same 12 checks in parallel and prints each child script's buffered output after completion:

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

`docs/blocker-traceability.json` currently contains 67 evidence entries across blockers `1..30`: 58 `automated_assertion`, 7 `manual_checkpoint`, and 2 `scenario_test` entries.

Consent-specific blockers 20~23 anchor in `tests/e2e/consent-smoke.spec.ts`; remaining test-flow blockers 24~30 mix `docs/req-test.md` manual/scenario anchors with unit/e2e evidence. Blockers 27, 28, 29, and 30 now carry automated evidence, including the 3-source cross-sheet unit coverage and route-level runtime guard assertions.

Shared local QA plumbing lives in `scripts/qa/_utils.mjs`; shared QA path groups live in `scripts/qa/_path-config.mjs`; and the Phase 1 duplicate-locale regex source lives in `scripts/qa/_locale-list.mjs`. Phase-specific helper functions remain inside their original scripts.

Current QA path configuration exports eight path groups from `scripts/qa/_path-config.mjs`: `landing`, `gnb`, `telemetry`, `transition`, `blog`, `styles`, `e2e`, and `test`. The `test` group currently owns `questionClient`, `answerLock`, `answerHandler`, `runController`, `testRunBootstrap`, `bootstrapStateResolver`, `runReducer`, and `entryOrchestrator`; the `e2e` group covers routing/grid/state/GNB/a11y/transition-telemetry/theme-matrix/Safari specs, while consent and qualifier specs remain referenced outside this path-config helper. Phase 4-11 scripts and `check-variant-only-contracts.mjs` import only the path groups they scan, while single-source contract paths remain inline. Phase 11 now treats `trackQuestionAnswered`, `trackResultViewed`, `question_answered`, `result_viewed`, `disabled={isAnswerLocked}`, and the `use-answer-handler.ts` answer guard/telemetry surface as static contract anchors.

`qa:gate:once` chains `qa:static`, `build`, `npm test`, and the Playwright `@gate` subset. `qa:gate` repeats that pipeline three times for flake detection.

### 7.4 Least Verified Areas

Least verified areas correspond to surfaces that are either not implemented, implemented only as placeholders, or mostly covered indirectly:

- Live score derivation wiring, result URL/payload rendering, result-content lookup, and history/share flow.
- Runtime `A`/`B` answer projection into domain tokens before `computeScoreStats()` / `buildTypeSegment()`.
- Contracted result screen rendering. Current coverage reaches the placeholder result panel and theme-matrix `test-result` representative states, not a real result-content pipeline.
- `result_viewed` with real `derived_type` and IntersectionObserver-backed visibility semantics. Current code fires a temporary mount-based event without `derived_type`.
- User-visible error telemetry and full `/test/error` recovery-card UX.
- Results Sheets loading, `GOOGLE_SHEETS_ID_RESULTS`, production 3-source sync validation, and result-content schema.
- Backend telemetry persistence/ingestion guarantees and branch-protected production push policy.
- Composed `TestQuestionClient` integration coverage. Its behavior is covered through smaller unit seams and E2E flows, but there is no dedicated component-level integration test for the full composition.
- Repository CI enforcement for quality gates. Local scripts exist, but the checked-in `.github` workflow surface currently covers only Sheets sync.

### 7.5 Closed Follow-up Items (Historical Record)

Tailwind v4 Checkpoint 1–2 cycle follow-up tasks (variant registry fixture drift, theme matrix / Safari baseline closure) were all closed as of 2026-04-16. The 2026-04-25 landing-controller extraction cycle also closed its follow-ups: preview global 404 routing was realigned with `req-landing.md` §5.3/§5.5, and local theme-matrix/Safari visual baselines were refreshed and re-run under `PLAYWRIGHT_SERVER_MODE=preview`. Use git history if original stub context is needed.

---

## 8. Task Entry Guide

### QA scripts / release gates / CI
`package.json` · `playwright.config.ts` · `vitest.config.ts` · `tsconfig.json` · `next.config.ts` · `scripts/qa/run-all.mjs` · `scripts/qa/_utils.mjs` · `scripts/qa/_path-config.mjs` · `scripts/qa/_locale-list.mjs` · `scripts/qa/check-phase1-contracts.mjs` · `scripts/qa/check-phase4-grid-contracts.mjs` · `scripts/qa/check-phase5-card-contracts.mjs` · `scripts/qa/check-phase6-spacing-contracts.mjs` · `scripts/qa/check-phase7-state-contracts.mjs` · `scripts/qa/check-phase8-accessibility-contracts.mjs` · `scripts/qa/check-phase9-performance-contracts.mjs` · `scripts/qa/check-phase10-transition-contracts.mjs` · `scripts/qa/check-phase11-telemetry-contracts.mjs` · `scripts/qa/check-variant-registry-contracts.mjs` · `scripts/qa/check-variant-only-contracts.mjs` · `scripts/qa/check-blocker-traceability.mjs` · `docs/blocker-traceability.json` · `.github/workflows/sync.yml` · `docs/agent-guides/verification-commands.md`

### Routing / locale / not-found
`src/proxy.ts` · `src/i18n/locale-resolution.ts` · `src/i18n/proxy-policy.ts` · `src/i18n/routing.ts` · `src/app/layout.tsx` · `src/app/[locale]/layout.tsx` · `src/app/[locale]/test/error/page.tsx` · `src/app/global-not-found.tsx` · `src/app/not-found.tsx` · `tests/e2e/routing-smoke.spec.ts`

### Landing grid / layout / interaction
`src/features/landing/grid/landing-catalog-grid-loader.tsx` · `src/features/landing/grid/use-landing-interaction-controller.ts` · `src/features/landing/grid/interaction-dom.ts` · `src/features/landing/grid/use-hover-intent-controller.ts` · `src/features/landing/grid/use-desktop-motion-controller.ts` · `src/features/landing/grid/use-mobile-card-lifecycle.ts` · `src/features/landing/grid/use-mobile-scroll-lock.ts` · `src/features/landing/grid/use-mobile-backdrop-gesture.ts` · `src/features/landing/grid/mobile-card-lifecycle-dom.ts` · `src/features/landing/grid/use-mobile-restore-polling.ts` · `src/features/landing/grid/use-mobile-transient-shell.ts` · `src/features/landing/grid/use-keyboard-handoff.ts` · `src/features/landing/grid/use-keyboard-mode-tracker.ts` · `src/features/landing/grid/use-landing-keyboard-entry.ts` · `src/features/landing/grid/use-card-keyboard-handler.ts` · `src/features/landing/grid/use-grid-geometry-controller.ts` · `src/features/landing/grid/baseline-manager.ts` · `src/features/landing/grid/landing-catalog-grid.tsx` · `src/features/landing/grid/landing-grid-card.tsx` · `src/features/landing/grid/landing-grid-card.module.css` · `src/features/landing/model/interaction-state.ts` · `src/features/landing/grid/layout-plan.ts` · `src/features/landing/grid/spacing-plan.ts` · `tests/unit/landing-interaction-state.test.ts` · `tests/unit/landing-interaction-dom.test.ts` · `tests/unit/landing-interaction-controller-handlers.test.ts` · `tests/unit/landing-hover-intent.test.ts` · `tests/unit/landing-mobile-lifecycle.test.ts` · `tests/unit/landing-mobile-backdrop-gesture.test.ts` · `tests/unit/landing-mobile-scroll-lock.test.ts` · `tests/unit/landing-desktop-shell-phase.test.ts` · `tests/unit/landing-grid-plan.test.ts` · `tests/unit/landing-spacing-plan.test.ts` · `tests/unit/landing-baseline-manager.test.ts` · `tests/e2e/grid-smoke.spec.ts` · `tests/e2e/state-smoke.spec.ts`

### GNB / theme / shared shell
`src/features/gnb/site-gnb.tsx` · `src/features/gnb/behavior.ts` · `src/features/gnb/types.ts` · `src/features/gnb/gnb-keyboard-dom.ts` · `src/features/gnb/hooks/use-gnb-capability.ts` · `src/features/gnb/hooks/use-gnb-desktop-settings.ts` · `src/features/gnb/hooks/use-gnb-mobile-menu.ts` · `src/features/gnb/hooks/use-gnb-back-navigation.ts` · `src/features/gnb/hooks/use-landing-gnb-entry-mode.ts` · `src/features/gnb/hooks/use-gnb-keyboard-targets.ts` · `src/features/gnb/hooks/use-gnb-tab-routing.ts` · `src/features/gnb/hooks/use-keyboard-mode-tracker.ts` · `src/features/gnb/hooks/use-theme-preference.ts` · `src/features/gnb/hooks/theme-transition.ts` · `public/theme-bootstrap.js` · `src/features/landing/shell/page-shell.tsx` · `tests/e2e/gnb-smoke.spec.ts` · `tests/unit/gnb-behavior.test.ts` · `tests/unit/gnb-desktop-settings.test.ts` · `tests/unit/gnb-mobile-menu.test.ts` · `tests/unit/gnb-back-navigation.test.ts` · `tests/unit/gnb-keyboard-dom.test.ts` · `tests/unit/gnb-landing-entry-mode.test.ts` · `tests/unit/gnb-keyboard-targets.test.ts` · `tests/unit/gnb-tab-routing.test.ts` · `tests/unit/gnb-theme-transition.test.ts` · `tests/unit/gnb-message-labels.test.ts`

### Transition / destination continuity / return-restore
`src/features/transition/runtime.ts` · `src/features/transition/store.ts` · `src/features/transition/signals.ts` · `src/features/transition/transition-runtime-monitor.tsx` · `src/features/transition/use-pending-landing-transition.ts` · `src/features/transition/use-landing-transition.ts` · `src/features/transition/transition-gnb-overlay.tsx` · `src/features/landing/landing-runtime.tsx` · `tests/unit/landing-runtime.test.ts` · `tests/unit/landing-transition-runtime.test.ts` · `tests/unit/landing-transition-store.test.ts` · `tests/e2e/transition-telemetry-smoke.spec.ts`

### Telemetry / consent
`src/features/telemetry/types.ts` · `src/features/telemetry/runtime.ts` · `src/features/telemetry/validation.ts` · `src/features/telemetry/consent-source.ts` · `src/lib/correlation-id.ts` · `src/app/api/telemetry/route.ts` · `src/app/vercel-analytics-gate.tsx` · `src/app/vercel-speed-insights-gate.tsx` · `src/features/test/use-answer-handler.ts` · `src/features/test/test-result-panel.tsx` · `scripts/qa/check-phase11-telemetry-contracts.mjs` · `tests/unit/landing-telemetry-runtime.test.ts` · `tests/unit/landing-telemetry-validation.test.ts` · `tests/unit/telemetry-question-answered.test.ts` · `tests/unit/test-result-panel.test.ts` · `tests/unit/telemetry-route.test.ts` · `tests/unit/telemetry-consent-banner.test.ts` · `tests/unit/vercel-analytics-gate.test.ts` · `tests/unit/vercel-speed-insights-gate.test.ts` · `tests/e2e/consent-smoke.spec.ts` · `tests/e2e/transition-telemetry-smoke.spec.ts` · `docs/req-landing.md §12` · `docs/req-test.md §9`

### Screenshot baseline / representative fixture
`tests/e2e/theme-matrix-manifest.json` · `tests/e2e/theme-matrix-smoke.spec.ts` · `tests/e2e/helpers/landing-fixture.ts` · `tests/e2e/safari-hover-ghosting.spec.ts` · `tests/e2e/README.md`

### Test route runtime / instruction shell
Route and shell: `src/app/[locale]/test/[variant]/page.tsx` · `src/app/[locale]/test/error/page.tsx` · `src/features/test/test-question-client.tsx` · `src/features/test/overlay-connector.tsx` · `src/features/test/instruction-overlay.tsx` · `src/features/test/qualifier-chip.tsx` · `src/features/test/result-connector.tsx` · `src/features/test/test-result-panel.tsx`

Controller/bootstrap/answer flow: `src/features/test/test-run-reducer.ts` · `src/features/test/use-test-run-controller.ts` · `src/features/test/use-test-run-bootstrap.ts` · `src/features/test/bootstrap-state-resolver.ts` · `src/features/test/use-question-dwell.ts` · `src/features/test/use-answer-lock.ts` · `src/features/test/use-answer-handler.ts` · `src/features/test/use-before-unload-guard.ts` · `src/features/test/use-landing-transition-completion.ts` · `src/features/test/question-runtime-utils.ts` · `src/features/test/canonical-key.ts`

Instruction/qualifier/storage support: `src/features/test/use-test-entry-orchestrator.ts` · `src/features/test/use-qualifier-overlay-wizard.ts` · `src/features/test/use-auto-commit.ts` · `src/features/test/entry-policy.ts` · `src/features/test/qualifier-overlay-model.ts` · `src/features/test/qualifier-resume-validator.ts` · `src/features/test/storage/index.ts` · `src/features/test/storage/storage-keys.ts` · `src/features/test/storage/test-storage-keys.ts` · `src/features/test/storage/active-run.ts` · `src/features/test/storage/response-set.ts` · `src/features/test/storage/state-flags.ts` · `src/features/test/storage/instruction-seen.ts` · `src/features/test/storage/volatility.ts` · `src/features/test/question-bank.ts` · `src/features/test/question-source-parser.ts` · `src/features/test/lazy-validation.ts`

Primary checks: `tests/unit/question-source-parser.test.ts` · `tests/unit/variant-question-bank.test.ts` · `tests/unit/test-question-bootstrap.test.ts` · `tests/unit/test-question-runtime-utils.test.ts` · `tests/unit/test-entry-policy.test.ts` · `tests/unit/instruction-overlay.test.ts` · `tests/unit/test-entry-orchestrator-qualifier.test.ts` · `tests/unit/test-entry-orchestrator-reentry.test.ts` · `tests/unit/use-test-entry-orchestrator.test.ts` · `tests/unit/use-test-run-controller.test.ts` · `tests/unit/test-run-reducer.test.ts` · `tests/unit/use-answer-handler.test.ts` · `tests/unit/telemetry-question-answered.test.ts` · `tests/unit/overlay-connector.test.ts` · `tests/unit/qualifier-chip.test.ts` · `tests/unit/test-result-panel.test.ts` · `tests/unit/qualifier-overlay-model.test.ts` · `tests/unit/qualifier-resume-validator.test.ts` · `tests/unit/test-lazy-validation.test.ts` · `tests/unit/test-storage-active-run.test.ts` · `tests/unit/test-storage-response-set.test.ts` · `tests/unit/test-storage-state-flags.test.ts` · `tests/unit/test-storage-volatility.test.ts` · `tests/e2e/consent-smoke.spec.ts` · `tests/e2e/qualifier-overlay.spec.ts` · `scripts/qa/check-phase10-transition-contracts.mjs` · `scripts/qa/check-phase11-telemetry-contracts.mjs` · `docs/req-test.md` · `docs/req-test-plan.md`

### Blog destinations
`src/app/[locale]/blog/page.tsx` · `src/app/[locale]/blog/[variant]/page.tsx` · `src/features/blog/server-model.ts` · `src/features/blog/blog-destination-client.tsx` · `tests/unit/blog-server-model.test.ts` · `tests/e2e/routing-smoke.spec.ts` · `tests/e2e/grid-smoke.spec.ts` · `tests/e2e/transition-telemetry-smoke.spec.ts`

### Test domain foundation
`src/features/test/domain/index.ts` · `src/features/test/domain/types.ts` · `src/features/test/domain/validate-variant.ts` · `src/features/test/domain/validate-question-model.ts` · `src/features/test/domain/validate-variant-data-integrity.ts` · `src/features/test/domain/derivation.ts` · `src/features/test/domain/type-segment.ts` · `src/features/test/schema-registry.ts` · `src/features/test/response-projection.ts` · `src/features/test/lazy-validation.ts` · `tests/unit/test-domain-variant-validation.test.ts` · `tests/unit/test-domain-question-model.test.ts` · `tests/unit/test-domain-derivation.test.ts` · `tests/unit/test-domain-type-segment.test.ts` · `tests/unit/schema-registry.test.ts` · `tests/unit/test-lazy-validation.test.ts`

### Data model / fixture contract
`src/features/variant-registry/source-fixture.ts` · `src/features/variant-registry/builder.ts` · `src/features/variant-registry/attribute.ts` · `src/features/variant-registry/resolvers.ts` · `src/features/variant-registry/types.ts` · `src/features/variant-registry/cross-sheet-integrity.ts` · `src/features/variant-registry/registry-serializer.ts` · `src/features/variant-registry/sheets-row-normalizer.ts` · `src/features/variant-registry/variant-registry.generated.ts` · `scripts/sync/sheets-loader.ts` · `scripts/sync/sync.ts` · `scripts/sync/sync-dry-run.ts` · `scripts/sync/regenerate-variant-registry-from-fixture.ts` · `.github/workflows/sync.yml` · `src/features/test/question-source-parser.ts` · `src/features/test/question-bank.ts` · `src/features/test/fixtures/questions/index.ts` · `src/features/test/fixtures/questions/types.ts` · `src/features/test/fixtures/results/index.ts` · `src/features/test/fixtures/results/types.ts` · `tests/unit/question-source-parser.test.ts` · `tests/unit/variant-question-bank.test.ts` · `tests/unit/sheets-row-normalizer.test.ts` · `tests/unit/sheets-loader.test.ts` · `tests/unit/sync-orchestration.test.ts` · `tests/unit/cross-sheet-integrity.test.ts` · `tests/unit/registry-serializer.test.ts` · `tests/unit/variant-registry-runtime-integrity.test.ts` · `tests/unit/landing-data-contract.test.ts`

---

## 9. Risks and Notes

**Instruction copy ownership is intentionally split.** Variant-specific instruction bodies live in fixtures, while CTA labels and consent notes live in locale messages. Future editors need to keep both sources in sync.

**Landing interaction runtime remains choreography-heavy, but the risk is now distributed.** The controller is 738 lines and reducer/orchestration ownership is clear, while hover, desktop motion, mobile lifecycle, keyboard handoff, DOM focus helpers, and grid geometry each have a named module. Future changes still need broad gate coverage because regressions can emerge from timing contracts between these hooks rather than from any single file.

**Landing visual-system replacement is possible only if runtime contracts stay intact.** `landing-grid-card.tsx` is now the largest landing file at 1,294 lines and mixes visual render branches with contract attributes. A visual rewrite should treat the card component and CSS module as replaceable UI surface, but preserve `LandingCardInteractionBindings`, transition callbacks, focus/keyboard hooks, mobile snapshot CSS variables, `inert`/`aria-disabled` behavior, and the existing `data-*` anchors used by unit/E2E/QA scripts.

**Shared runtime namespaces are now split by concern.** GNB, telemetry, transition, and blog destination code live under `src/features/gnb`, `src/features/telemetry`, `src/features/transition`, and `src/features/blog`, leaving `src/features/landing` focused on the landing runtime, grid, shell, and storage. Current pressure points are `src/features/gnb/site-gnb.tsx` (401 lines), `src/features/landing/grid/use-landing-interaction-controller.ts` (738 lines), `src/features/landing/grid/use-grid-geometry-controller.ts` (446 lines), `src/features/landing/grid/use-card-keyboard-handler.ts` (313 lines), and `src/features/landing/grid/landing-grid-card.tsx` (1,294 lines). `use-keyboard-handoff.ts` is now a 95-line composition layer rather than a pressure point. GNB behavior pressure is split across focused desktop settings, mobile menu, back-navigation, keyboard DOM, landing entry mode, target discovery, and Tab-routing modules; keyboard-mode tracking has an exported hook reserved for future wiring after §7.5 compliance review. `use-mobile-card-lifecycle.ts` is now 287 lines after extracting `use-mobile-scroll-lock.ts` (27), `use-mobile-backdrop-gesture.ts` (100), `mobile-card-lifecycle-dom.ts` (48), `use-mobile-restore-polling.ts` (120), and `use-mobile-transient-shell.ts` (57; independent auto-reset timer removed — teardown now driven by the orchestrator's open and close timers).

**Test entry orchestration is now split from the client.** `use-test-entry-orchestrator.ts` owns the entry action handler (`executeInstructionAction`) and composes the qualifier wizard plus auto-commit scheduling. `use-qualifier-overlay-wizard.ts` owns qualifier step/re-entry draft state; entry side effects remain inline in the orchestrator and call `setTelemetryConsentState`, `markInstructionSeen`, and `clearLandingIngress` directly. `use-auto-commit.ts` owns instruction-seen auto-entry for non-qualifier variants. `test-question-client.tsx` retains `instructionVisible` derivation and renders connector props. The orchestrator path does not own telemetry — `trackAttemptStart` and `trackFinalSubmit` remain in `use-test-run-controller.ts`, while `question_answered` fires from `use-answer-handler.ts`.

**Test question auto-advance is split across client-adjacent hooks.** `use-answer-lock.ts` owns the 150 ms delayed auto-advance timer and answer-button lock state; `use-answer-handler.ts` owns the answer guard, `question_answered` call site, and stale-submit `submittedRef` mirror. Rapid Previous taps clear the timer before backward navigation fires, while the hook-level submitted ref prevents the delayed callback from advancing after manual Submit on the last question.

**Data-source parity has environment-specific gaps.** Dev/test registry loading exercises Landing + Questions + Results fixture identity through 3-source runtime fallback, but production sync currently loads only Landing and Questions and has no `GOOGLE_SHEETS_ID_RESULTS` secret. The generated registry is the production last-known-good artifact, not a request-time fixture rebuild path. Future Results work must add the Sheets loader, workflow secret, 3-source production validation, and result-content schema/loading without treating the current row-level Results fixture as real content.

**Domain helpers are implemented ahead of the live result pipeline.** `src/features/test/domain/index.ts` exposes validation, scoring derivation, and type-segment helpers, and `schema-registry.ts` owns schema templates. The live runtime still submits scoring `A` / `B` answers into a placeholder result panel; `response-projection.ts` has no exports, so score derivation, type-segment construction, result-content lookup, and `derived_type` telemetry remain deferred integration work rather than a frozen runtime contract.

**Screenshot-driven QA remains concentrated in the instruction/qualifier surface and visual matrix.** The `test-instruction` representative route is shared by the theme-matrix manifest and consent smoke coverage, while `tests/e2e/qualifier-overlay.spec.ts` now owns EGTT qualifier navigation, selection, resume validation, and a11y coverage. CTA/copy/layout tweaks will churn a tightly coupled set of snapshots and route-level assertions. The 2026-05-03 R-01 follow-up confirmed theme-matrix baseline provenance, not code output, as the blocker source; future local baseline regeneration should use the preview command in `tests/e2e/README.md` and update the tracked provenance record at `tests/e2e/theme-matrix-baseline-provenance.md`.

**Transition and telemetry must remain separate channels.** Transition lifecycle names are internal browser signals for overlay, timeout, rollback, and QA correlation. User-action telemetry uses `landing_view`, `card_answered`, `attempt_start`, `question_answered`, `final_submit`, and `result_viewed` only. Reintroducing `transition_*` transport events or adding `transition_id` / `result_reason` payload fields would violate `validation.ts` and Phase 10/11 QA scripts.

**Quality-gate truth is local-script centered.** `package.json`, `scripts/qa/run-all.mjs`, `_path-config.mjs`, and `playwright.config.ts` define the current verification topology. `.github/workflows/sync.yml` is a data-sync workflow only, so anyone expecting PR/push CI coverage for lint/typecheck/test/build/QA/E2E must add that workflow explicitly rather than inferring it from the local gates.

**Styling ownership is intentionally narrow but still coupled to screenshots.** Global CSS owns tokens and theme overrides; component utility constants own most shell structure; the landing CSS module owns motion. This keeps Tailwind v4 cleanup small, but copy/layout/class-token edits in GNB, consent banner, landing card, or body background can still churn theme-matrix and Safari baselines.

**Tech stack notes:**
- `next@16.2.4`, `react@19.2.4`, `next-intl@4.9.1`
- `motion@12.34.0` is used by the test question answer-grid transitions; any broader adoption should stay aligned with `docs/req-landing.md` §8.3 Core Motion Contract
- Tailwind v4 active via `src/app/globals.css`; `src/app/globals.css` is limited to tokens/theme overrides/shared anchor base; `data-*` anchors continue serving QA/debug and Playwright coverage. Any further visual-system follow-up should prefer feature-local component constants or `landing-grid-card.module.css` unless the token surface itself changes.
