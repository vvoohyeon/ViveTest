# Project Analysis

## 1. Current State At A Glance

This repository is a localized Next.js App Router application. Its real technical center of gravity is a landing-to-destination interaction system plus a fixture-backed, policy-driven test-entry shell, not the full assessment product described in `docs/requirements.md`. The codebase is best understood as a V1 front-end interaction prototype with mature contract coverage in landing, transition, consent, and telemetry seams, plus a separate pure test-domain foundation that is currently used by entry-time guardrails rather than by the live question/result runtime.

**Workspace verification:**

- Current local Done gate for this document sync: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`
- `npm run qa:rules` (2026-05-05): passes all 12 checks through the buffered parallel runner in `scripts/qa/run-all.mjs`
- Representative Playwright smoke coverage is organized around routing, grid, state, GNB, accessibility, consent, theme matrix, Safari hover ghosting, and transition telemetry specs. Exact expanded test counts are intentionally not repeated here because they vary with browser/project matrix expansion.
- Snapshot baseline policy: visual smoke stores local PNG baselines under `tests/e2e/*-snapshots/`. The screenshot helper auto-creates missing files and falls back to Playwright comparison when a local baseline already exists. Git tracked PNG completeness is not required; the latest shared theme-matrix regeneration and gate verification result is tracked in `tests/e2e/theme-matrix-baseline-provenance.md`, with update instructions in `tests/e2e/README.md`.

**Implementation phase status (2026-04-24):** Phase 0 pre-requisite ADRs are all complete — ADR-A (`src/features/test` namespace separation), ADR-B (storage key contract and 5-flag topology), ADR-E (representative variant QA baseline). Phase 1 Domain Foundation is complete: all seven files under `src/features/test/domain/` exist, dedicated unit tests pass, and blockers #7/#11/#12/#27 are mapped in `docs/blocker-traceability.json`. Phase 2 data guardrails now cover Group A and Group C runtime paths plus Group B-1/B-2 Sheets sync: 3-source-capable cross-sheet validation, Results fixture boundary, runtime fallback, entry route guard, fixture hardening for enterable variants, lazy validation + cache, `/test/error` recovery stub, Landing/Questions Google Sheets loading, Action-level 2-source sync orchestration, deterministic generated registry serialization, GitHub Actions wiring, local dry-run, dev/test registry cache reset coverage, and B29/B30 automated evidence are present. The question-bank surface has also been refactored so live `/test/{variant}` coverage is anchored on `buildVariantQuestionBank()` / `resolveVariantPreviewQ1()`, and the legacy inline-bridge compatibility export has been removed. Results Sheets loading remains pending and the sync script intentionally calls `validateCrossSheetIntegrity(landingTestVariants, questionVariants)` in 2-source mode until that source is ready. Key contracts frozen by Phase 0–1: `VariantId` and `QuestionIndex` intersection brand types, `validateVariant()` three-way result union shape, `BlockingDataErrorReason` enum surface. Modifying these requires a new ADR. See `docs/req-test-plan.md` for the full Phase roadmap and ADR decision records.

**Landing interaction refactor status (2026-04-25):** the large landing controller split is complete across five wave commits. `useReducer` ownership remains in `use-landing-interaction-controller.ts`, while DOM/focus helpers, hover intent, desktop motion, mobile lifecycle, keyboard handoff, and grid geometry/RAF ownership now live in dedicated hooks/modules. `landing-catalog-grid.tsx` keeps `shellRef`, `containerRef`, viewport/grid inline-size measurement, plan calculation, JSX rendering, and data attributes. The session also closed a preview-mode routing gap: non-allowlisted, non-bypass locale-less paths such as `/foo` now rewrite through the global unmatched `/_not-found` surface so preview smoke and the documented 404 split agree.

---

## 2. Implementation Scope

### Substantially implemented

- Localized landing page with hero + catalog (`src/app/[locale]/page.tsx`)
- Landing catalog grid with desktop/mobile expansion behavior (`src/features/landing/grid/`)
- Global navigation shell (GNB) with theme switching, locale switching, keyboard/focus contract (`src/features/gnb/site-gnb.tsx`)
- Tailwind v4 entry plus component-local utility migration across shared shell, GNB, landing grid/card static surface, test shell, blog/history shells, and not-found pages, with `src/app/globals.css` reduced to tokens/base while landing-grid motion/focus continuity moved into feature-local CSS
- Landing-to-destination transition handshake with sessionStorage persistence and timeout/cancel semantics (`src/features/transition/`)
- Consent-gated telemetry with anonymous session ID, event queueing, and Vercel analytics bridge (`src/features/telemetry/`)
- Proxy-level locale normalization and SSR `<html lang>` correctness (`src/proxy.ts`, `src/i18n/`)
- Blog index/list route plus route-driven article detail (`src/features/blog/blog-destination-client.tsx`, `src/app/[locale]/blog/[variant]/page.tsx`)
- Test entry recovery stub route (`src/app/[locale]/test/error/page.tsx`) used by runtime-blocked and lazy-validation-failed variants
- Fixture-backed variant registry with generated runtime export, source/runtime type separation, `seq` validation + sort/drop, resolver-only preview access, unified landing meta keys, and resolver-backed card lookup (`src/features/variant-registry/`)
- Pure test-domain foundation for schema validation and derivation utilities: `validateVariant`, `validateQuestionModel`, `validateVariantDataIntegrity`, `axisMatchesQuestion`, `computeScoreStats`, `deriveDerivedType`, `parseTypeSegment`, `buildTypeSegment`, plus `VariantSchema` / `ScoringSchema` / `QuestionType` / `QualifierFieldSpec` types (`src/features/test/domain/`). Key interface contracts are frozen by Phase 0–1 ADRs (brand type shapes, `validateVariant()` result union, `BlockingDataErrorReason` enum).
- Code-owned test schema registry and projection boundary reservation: `src/features/test/schema-registry.ts` owns the variant → `ScoringLogicType` → `ScoringSchema` template mapping, while `src/features/test/response-projection.ts` reserves the future scoring A/B response plus qualifier-token response → domain token projection layer.

### Partially implemented

| Area | Current implementation |
|---|---|
| Test destination | Policy-driven instruction + qualifier overlay keyed by ingress type + consent state + `attribute`, registry-backed instruction copy, fixture-backed scoring question flow, manual previous navigation, answer state, active-run resume, dwell tracking, placeholder result panel, `attempt_start` / `final_submit` telemetry |
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
| `src/features/landing/` | Landing runtime, grid/model/shell/storage orchestration |
| `src/features/gnb/` | Shared GNB shell, theme preference, locale switching, and route-aware back navigation |
| `src/features/transition/` | Landing-to-destination transition persistence, signals, monitor, and GNB overlay |
| `src/features/telemetry/` | Consent source, custom telemetry runtime, payload validation, and Vercel analytics consent bridge |
| `src/features/blog/` | Blog list/detail destination model and client |
| `src/features/test/` | Canonical test destination surface — route/runtime shell, instruction entry policy, overlay composition, question bootstrap, and question-bank resolution |
| `src/features/test/domain/` | Pure domain module — branded ids, question/schema models, variant validation, integrity checks, score derivation, and type-segment parsing/building |
| `src/config/site.ts` | Locale set definition |
| `src/lib/routes/route-builder.ts` + `src/i18n/localized-path.ts` | Locale-free route authoring + locale prefix application |
| `src/lib/correlation-id.ts` | Browser-safe anonymous/correlation ID utilities |

Shared concerns that previously lived under `src/features/landing/*` now have independent feature namespaces. `src/features/landing` owns the landing page runtime and grid/shell/storage orchestration, while GNB, transition, telemetry, and blog destination code are imported from their dedicated namespaces.

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
            │         ├─ src/features/variant-registry/variant-registry.generated.ts (static generated runtime registry)
            │         ├─ src/features/variant-registry/resolvers.ts (registry loader + resolver boundary)
            │         ├─ src/features/variant-registry/attribute.ts (attribute helpers)
            │         ├─ src/features/test/fixtures/questions/** (variant-split Questions row fixtures)
            │         ├─ src/features/test/fixtures/results/** (row-level Results variantId fixture)
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
            │              └─ use-grid-geometry-controller.ts
            ├─ src/app/[locale]/blog/page.tsx (list-only blog index)
            ├─ src/app/[locale]/blog/[variant]/page.tsx (route-keyed blog detail)
            ├─ src/app/[locale]/test/[variant]/page.tsx
            │    ├─ runtime blocked set → /test/error?variant=...
            │    ├─ resolveLandingTestEntryCardByVariant(locale, variant) → notFound on true miss
            │    ├─ getLazyValidatedVariant(variant) → /test/error?variant=... on data-integrity failure
            │    └─ src/features/test/test-question-client.tsx
            │         ├─ src/features/test/entry-policy.ts
            │         ├─ src/features/test/instruction-overlay.tsx
            │         ├─ src/features/test/question-source-parser.ts
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
- `response-projection.ts` — reserved Phase 4/7 projection boundary from runtime scoring A/B codes plus qualifier token strings to domain tokens

The domain files are exercised by `tests/unit/test-domain-*.test.ts`; the schema registry is covered by `tests/unit/schema-registry.test.ts`. `response-projection.ts` is currently a contract-only stub.

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
/[locale]/test/error     (dynamic)
/api/telemetry           (dynamic)
```

Segment/global 404 handling is implemented through `src/app/not-found.tsx` and `src/app/global-not-found.tsx`. The test error page is not a 404 surface; it is the user-facing recovery stub for runtime-blocked variants and lazy validation failures.

### 4.2 Supported Locales

Defined in `src/config/site.ts`: `en`, `kr`, `zs`, `zt`, `ja`, `es`, `fr`, `pt`, `de`, `hi`, `id`, `ru`

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

---

## 5. Core Subsystems

### 5.1 Landing Interaction Runtime

The most technically distinctive part of the codebase. The pre-refactor monolithic interaction controller has been split into focused runtime modules while preserving reducer ownership in the controller.

Pure or model-focused modules:

- `src/features/landing/model/interaction-state.ts` — page/card/hover-lock state transitions
- `src/features/landing/grid/layout-plan.ts` — row plans
- `src/features/landing/grid/spacing-plan.ts` — row-local compensation
- `src/features/landing/grid/mobile-lifecycle.ts` — mobile expansion phases
- `src/features/landing/grid/desktop-shell-phase.ts` — visual shell phases

Runtime ownership after the 2026-04-30 split:

- `src/features/landing/grid/use-landing-interaction-controller.ts` — **526 lines**, owns the two `useReducer` calls, capability/reduced-motion/visibility sync, per-card binding composition, and transition-start callback composition. Pure visual projection is split: `interaction-state.ts` derives card visual state via `resolveVisualState`, and `desktop-shell-phase.ts` derives desktop motion roles via `resolveDesktopMotionRole`.
- `src/features/landing/grid/interaction-dom.ts` — DOM/focus helpers: card-root lookup, expanded focusable selection, adjacent-card resolution, queued focus callbacks, mobile-card detection, and card-boundary resolution.
- `src/features/landing/grid/use-hover-intent-controller.ts` — hover timers/tokens, last pointer position, card-boundary containment checks, and trigger `onMouseEnter` / `onMouseLeave` handlers.
- `src/features/landing/grid/use-desktop-motion-controller.ts` — desktop opening/closing/handoff visual state, transition reason ref, cleanup timers, and double-RAF cleanup.
- `src/features/landing/grid/use-mobile-card-lifecycle.ts` — **287 lines**, owns mobile lifecycle orchestration, queued close, keyboard handoff, viewport reset, open/close timer coordination (including transient shell teardown after both open and close timers), and public API composition.
- `src/features/landing/grid/use-mobile-scroll-lock.ts` — **27 lines**, owns phase-based body scroll lock.
- `src/features/landing/grid/use-mobile-backdrop-gesture.ts` — **100 lines**, owns outside gesture state and pointer handlers.
- `src/features/landing/grid/mobile-card-lifecycle-dom.ts` — **48 lines**, owns mobile snapshot capture and restore measurement helpers.
- `src/features/landing/grid/use-mobile-restore-polling.ts` — **120 lines**, owns the restore-ready marker timer and RAF polling with the restore-settled predicate injected from the hub orchestrator.
- `src/features/landing/grid/use-mobile-transient-shell.ts` — **57 lines**, owns transient shell state; no independent auto-reset timer — teardown driven by the orchestrator's open and close timers via `resetMobileTransientShell()`.
- `src/features/landing/grid/use-keyboard-handoff.ts` — **91 lines**, composition layer for keyboard-mode tracking, first landing entry, and per-card keyboard handlers.
- `src/features/landing/grid/use-keyboard-mode-tracker.ts` — global Tab/Escape keyboard-mode entry and mousedown exit listener wiring.
- `src/features/landing/grid/use-landing-keyboard-entry.ts` — reverse Shift+Tab focus return from the first landing card toward the GNB target.
- `src/features/landing/grid/use-card-keyboard-handler.ts` — **328 lines**, per-card focus/key handlers, expanded-body traversal, mobile keyboard handoff, and desktop transition intent handoff.
- `src/features/landing/grid/use-grid-geometry-controller.ts` — **348 lines**, spacing model, row baseline snapshots, reducer-owned `BASELINE_READY`/`BASELINE_FROZEN` freeze/release, 32ms release timer lock, plan-change collapse, and `LANDING_GRID_PLAN_CHANGED_EVENT`.
- `src/features/landing/grid/landing-catalog-grid.tsx` — **270 lines**, keeps `shellRef`, `containerRef`, viewport/grid inline-size measurement, `LandingGridPlan` calculation, render assembly, and data attributes.

The core risk is still choreography complexity across hover, keyboard, mobile, desktop shell phases, and geometry timing, but ownership is now explicit and testable at narrower seams. Styling ownership is hybrid: static shells plus boolean-resolvable card states live as utility/class constants in `landing-catalog-grid.tsx` and `landing-grid-card.tsx`, while `landing-grid-card.tsx` remaps raw runtime state into semantic style classes consumed by `landing-grid-card.module.css` for motion, focus continuity, reduced-motion branches, and desktop/mobile transient choreography. Raw `data-*` attributes remain on the DOM as QA/debug and Playwright anchors but no longer participate in the CSS contract.

2026-05-07 R-08 note: keyboard-mode HOVER_LOCK non-target cards now use root `inert` while keeping `data-hover-lock-blocked` as the QA marker; card-to-card keyboard handoff dispatches the target focus state before queued DOM focus so the target is no longer inert when focused.

### 5.2 GNB

`src/features/gnb/site-gnb.tsx` — **401 lines** — keeps the rendered GNB shell: JSX, class constants, Escape priority, cleanup coordination, locale switching, theme switching, and hook orchestration for the keyboard/focus contract. Focused modules now own desktop settings behavior, mobile menu choreography, route-aware back navigation, landing-card focus transfer, landing GNB entry mode, GNB keyboard target discovery, and Tab routing.

Key supporting files: `src/features/gnb/behavior.ts`, `src/features/gnb/types.ts` (defines `GnbContext` per route: landing/blog/history/test), `src/features/gnb/gnb-keyboard-dom.ts`, `src/features/gnb/hooks/use-gnb-desktop-settings.ts`, `src/features/gnb/hooks/use-gnb-mobile-menu.ts`, `src/features/gnb/hooks/use-gnb-back-navigation.ts`, `src/features/gnb/hooks/use-landing-gnb-entry-mode.ts`, `src/features/gnb/hooks/use-gnb-keyboard-targets.ts`, `src/features/gnb/hooks/use-gnb-tab-routing.ts`, `src/features/gnb/hooks/use-keyboard-mode-tracker.ts`.

2026-05-08 GNB keyboard routing note: `gnb-keyboard-dom.ts` owns GNB-to-landing focus transfer with `aria-disabled` and ancestor-`inert` filtering; `useLandingGnbEntryMode()`, `useGnbKeyboardTargets()`, and `useGnbTabRouting()` own the extracted keyboard entry, target discovery, and Tab routing seams. `useGnbKeyboardModeTracker()` remains exported but unwired pending `docs/req-landing.md §7.5` compliance review.

2026-05-05 GNB cleanup note: `behavior.ts` centralizes shared GNB timing constants including mobile test-back fallback timing; `useGnbDesktopSettings()`, `useGnbMobileMenu()`, and `useGnbBackNavigation()` now have focused unit coverage.

Theme subsystem: `public/theme-bootstrap.js` (sets before hydration from `localStorage`), `src/features/gnb/hooks/use-theme-preference.ts` (persists manual overrides), `src/features/gnb/hooks/theme-transition.ts` (2500ms blur-circle View Transition API, with reduced-motion fallback).

`src/features/landing/shell/page-shell.tsx` mounts the GNB for every localized route — it is a shared runtime controller, not a page-local header.

### 5.3 Catalog Data Model

Landing/card source: `src/features/variant-registry/source-fixture.ts`
Questions source rows: `src/features/test/fixtures/questions/**`
Results source rows: `src/features/test/fixtures/results/**`

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

`src/features/variant-registry/source-fixture.ts` is now Landing metadata-only: source rows carry card metadata, `seq`, and instruction copy, but no inline preview fields. `src/features/variant-registry/types.ts` separates source-facing and runtime-facing shapes: source rows can carry `seq`, while runtime landing cards and preview payloads exclude source-only fields. `src/features/variant-registry/resolvers.ts` centralizes `loadVariantRegistry()`, locale fallback, consent-aware catalog filtering, strict variant lookup, and the `resolveTestPreviewPayload()` boundary.

`src/features/variant-registry/cross-sheet-integrity.ts` provides the shared pure cross-source validation helper: `validateCrossSheetIntegrity(landingTestVariants, questionVariants, resultsVariants?)`. With `resultsVariants` present it compares Landing test IDs, Questions sheet-name IDs, and Results row-level `variantId`s, returning `missingInQuestions`, `extraInQuestions`, `missingInResults`, and `extraInResults`. The third argument is optional, so existing 2-source callers still get Landing↔Questions-only `ok` semantics with empty Results arrays. Blog variants remain caller-excluded from `landingTestVariants`.

`loadVariantRegistry()` now has an explicit runtime source split: production reads the static `variantRegistryGenerated` artifact, while dev/test builds a fixture registry by injecting `questionSourceFixture` into `buildVariantRegistry()`. The dev/test fixture path then runs 3-source validation and applies `applyCrossSheetRuntimeFallback()`: Landing-only variants are downgraded to `hide`, while Questions-only, Results-missing, and Results-only mismatches are added to `blockedRuntimeVariants` without changing catalog attributes for existing cards. `src/app/[locale]/test/[variant]/page.tsx` checks that blocked set before resolving the entry card, redirects blocked variants to `/test/error?variant=...`, and then uses `resolveLandingTestEntryCardByVariant()` for the route-level card lookup.

The dev/test fixture registry state is intentionally cached at module scope so repeated `loadVariantRegistry()` calls return the same `VariantRegistry` object within one test/runtime process. A 2026-04-24 refactor added `clearDevRegistryCacheForTesting()` in `src/features/variant-registry/resolvers.ts` as a direct-import-only test isolation hook. It resets only the fixture registry cache, is not exposed through `src/features/variant-registry/index.ts`, and is covered by `tests/unit/variant-registry-runtime-integrity.test.ts` with both reference-equality and reset-invalidates-cache assertions. The production static import path remains unchanged.

`src/features/variant-registry/builder.ts` validates source rows, sorts by `seq`, drops `seq` from the exported runtime registry, and emits separate `landingCards` / `testPreviewPayloadByVariant` runtime stores. The builder does not import Questions fixtures; callers inject `questionSourcesByVariant`, and the preview store is projected from each variant's first scoring row via `findFirstScoringRow()`. `resolveTestPreviewPayload()` reads the registry's `testPreviewPayloadByVariant` store and exposes the stable `previewQuestion` / `answerChoiceA` / `answerChoiceB` runtime shape. Runtime meta keys are unified as `durationM` / `sharedC` / `engagedC`.

`src/features/variant-registry/sheets-row-normalizer.ts` is the pure pre-sync Questions row normalization boundary for Group B callers. It converts raw Sheets columns such as `question_EN`, `answerA_KR`, and `pole_A` / `pole_B` into parser-compatible `QuestionSourceRow` shape (`question` / `answerA` / `answerB` `LocalizedText`, `poleA` / `poleB`). Locale suffix mapping is owned by `parseLocaleColumnKey()` (`EN` → `en`, `KR` → `kr`, `ZS` → `zs` via lowercase normalization), unsupported columns/locales are ignored, and empty string values are omitted so the existing default-locale fallback path remains responsible for display fallback. `tests/unit/sheets-row-normalizer.test.ts` verifies both TypeScript assignability to `QuestionSourceRow` and runtime compatibility with `buildCanonicalQuestions()`.

`scripts/sync/sheets-loader.ts` is the Group B-1 pure Google Sheets loading boundary. It uses the `googleapis` Service Account client (`GoogleAuth` with readonly spreadsheets scope), reads the `Landing` sheet directly, and returns `ReadonlyArray<VariantRegistrySourceCard>` after converting flat Landing columns (`title_EN`, `tags_KR`, `instruction_JA`, etc.) into `LocalizedText` / `LocalizedStringList` source shape. It skips invalid Landing rows with `console.warn` and never calls `buildVariantRegistry()`, cross-source validation, file I/O, Git, or GitHub Actions. Questions workbook loading first reads sheet titles via `spreadsheets.get`, preserves each raw sheet name as the Map key, reads each sheet with `FORMATTED_VALUE`, skips empty/unparseable `seq` rows, and passes every kept row through `normalizeQuestionSheetRow(rawRow, locales)`. `tests/unit/sheets-loader.test.ts` covers the googleapis mock boundary, Landing test/blog union mapping, tag splitting, invalid row skipping, empty sheets, API error propagation, and Questions workbook Map output.

`scripts/sync/sync.ts` is the Group B-2 production orchestration boundary. It loads `.env.local` via `dotenv` for local smoke, requires `GOOGLE_SHEETS_SA_KEY`, `GOOGLE_SHEETS_ID_LANDING`, and `GOOGLE_SHEETS_ID_QUESTIONS`, creates the Sheets client, loads Landing and Questions in parallel, excludes `type === 'blog'` rows from `landingTestVariants`, runs `validateCrossSheetIntegrity(landingTestVariants, questionVariants)` in 2-source mode, and only then calls `buildVariantRegistry(landingRows, questionSourcesByVariant)` with the builder's positional 2-argument signature. The script serializes through `serializeRegistryToFile()`, compares against `src/features/variant-registry/variant-registry.generated.ts` resolved from `process.cwd()`, exits with `no changes` when identical, and otherwise writes the full generated file before `git add`, `git commit -m "chore: sync variant registry from Sheets [skip ci]"`, and `git push`. If any git operation fails after write, it restores the original generated file content before exiting non-zero, preserving the last-known-good artifact. Branch-protection bypass is explicitly not implemented; the catch block tells operators to configure a PAT or exempt the Actions bot if direct push is blocked. `tests/unit/sync-orchestration.test.ts` covers missing env, cross-source mismatch, no-op sync, write/commit/push, git failure restore, and blog exclusion.

`.github/workflows/sync.yml` runs Group B-2 on `main` pushes with `permissions: contents: write`, checkout on `github.ref_name`, Node 22 setup, `npm ci`, GitHub Actions bot git identity, and `npm run sync` with the three current Sheets secrets. The sync step has `continue-on-error: false`; the script itself owns file restoration on post-write git failures.

`scripts/sync/sync-dry-run.ts` is the local no-Sheets verification path. It loads `.env.local` quietly, injects `getVariantRegistrySourceFixture()` and `questionSourceFixture` directly into the same builder + serializer path, writes no files, performs no git operations, and emits the generated TypeScript source to stdout. It is exposed as `npm run sync:dry`.

`src/features/variant-registry/variant-registry.generated.ts` is a static object-literal `VariantRegistry` artifact, not a runtime fixture-build bridge. The current baseline has been synchronized through the B-2 Sheets sync path, and the dev/test fixture sources mirror that generated artifact so `variantRegistryGenerated` remains structurally equal to the fixture builder output. `scripts/sync/regenerate-variant-registry-from-fixture.ts` remains available as a fixture-only one-shot regeneration path; `scripts/sync/sync-dry-run.ts` is the safer no-write verification path for comparing fixture builder + serializer output.

`src/features/variant-registry/registry-serializer.ts` is the pure generated-file serialization boundary. `serializeRegistryToFile(registry)` returns the TypeScript file contents for an object-literal `variantRegistryGenerated` export using the existing generated header, `import type {VariantRegistry} from './types'`, and deterministic alphabetic object-key ordering. `tests/unit/registry-serializer.test.ts` checks parseability, deterministic output, key-order normalization, and structural equivalence against the currently importable generated registry data. This utility does not read Sheets, write files, or run Git; `scripts/sync/sync.ts` owns that orchestration.

`src/features/test/question-source-parser.ts` is the pure Questions parser boundary: `parseSeqToQuestionType()` (`q.*` → profile, numeric → scoring), `buildCanonicalQuestions()` (source-order 1-based canonical indexes), and `findFirstScoringRow()`. Group D preview migration is complete: `src/features/test/question-bank.ts` exposes live `buildVariantQuestionBank()` runtime wiring and `resolveVariantPreviewQ1()` for direct Questions-backed `scoring1` projection helpers, while landing UI preview consumption stays behind the variant-registry resolver. The deprecated inline-bridge compatibility export has been removed, so live question-bank coverage now stays on `tests/unit/variant-question-bank.test.ts`, where the live APIs cover locale fallback and profile-row skipping for `scoring1`. The obsolete `src/features/landing/data/` compatibility directory has been removed; consumers use `src/features/variant-registry` directly.

### 5.4 Transition Runtime

Landing-to-destination handshake: `src/features/transition/use-landing-transition.ts` converts CTA clicks into localized route pushes. Before navigation, `src/features/transition/runtime.ts` records return scroll position plus source variant, writes `PendingLandingTransition` to `sessionStorage`, and, for valid test-card transitions, writes a landing ingress record (`variant`, `preAnswerChoice`, `createdAtMs`, `landingIngressFlag`). Duplicate-locale target routes return `null` before this persistence path and emit no transition signal or telemetry.

On the destination side, `src/features/transition/transition-runtime-monitor.tsx` enforces a **1600ms timeout**. `TransitionGnbOverlay` keeps a landing-context GNB visible during pending transition. `LandingRuntime` restores scroll on return and cancels stale transitions with `USER_CANCEL`.

Result reasons: `USER_CANCEL`, `DUPLICATE_LOCALE`, `DESTINATION_TIMEOUT`, `DESTINATION_LOAD_ERROR`, `UNKNOWN`. Cleanup is centralized in `rollbackLandingTransition()`, which removes pending, return-scroll, and ingress storage directly before dispatching one pending-store event and one cleanup event. All persistence is session-scoped and client-only.

### 5.5 Destination Bootstrap

**Blog** (`src/features/blog/server-model.ts`, `src/features/blog/blog-destination-client.tsx`): `variant` is the only article identifier. Invalid or non-enterable variants redirect to the localized blog index. Pending transition is an overlay/completion signal only. The detail route exports `generateMetadata()`.

**Test** (`src/features/test/test-question-client.tsx`): policy-driven instruction gating, qualifier overlay wiring, variant Questions fixture runtime wiring through `buildVariantQuestionBank()`, landing-ingress seeding of `scoring1`, direct-entry runtime start after any qualifier overlay, dwell time tracking, and `attempt_start` / `question_answered` / `final_submit` / `result_viewed` telemetry. Ingress entries keep the landing `scoring1` pre-answer in reducer answers at commit, then start the runtime panel at the first scoring question that still needs runtime display: `qmbti` starts at canonical index 2, and `egtt` now also starts at the first scoring question (canonical index 2) because `q.1` is a qualifier question collected in the instruction overlay before runtime entry. `src/features/test/test-run-reducer.ts` owns the booting / instruction / active / submitted / redirecting phase graph, canonical-index keyed string answers, qualifier answer merging on commit, tail reset, submit guards fed by the controller's scoring-only completion check, and entry-mode signals for new vs resume entry. `use-test-run-controller.ts` owns the reducer instance, reads `getActiveRun()` + `readResponseSet()` only when no Landing Ingress exists, validates stored qualifier answers before resume, writes active-run metadata on new runtime entry, initializes a fresh response set on every new entry, refreshes `lastAnsweredAtMs` on confirmed scoring answers, and preserves Landing Ingress priority over older response sets. Active-Run Resume restores filtered canonical answers when qualifier prerequisites are valid; missing or invalid qualifier answers clear the stale run context and return through instruction/qualifier collection, while valid resume skips `attempt_start`. The live question panel renders scoring questions only, renders user-facing `Q` labels using scoring order, displays main progress as answered scoring count / total scoring count with the percent label inside the fill bar, and uses a 150 ms delayed auto-advance as the forward navigation mechanism for non-last scoring questions; the delayed advance captures the clicked choice before React render catch-up and skips already-answered resume gaps. Previous remains present in the DOM and is hidden at Q1 with `visibility: hidden` so navigation space is preserved. The answer grid uses `motion/react` directional slide transitions on question navigation, with reduced-motion removing horizontal movement. The `started` flag is retained as the active-run UI guard signal, and a `beforeunload` listener is active only during a started, not-yet-submitted run before being removed on submit and unmount. It does not yet run score derivation, result URL construction, answer projection into domain tokens, result-entry cleanup, or history persistence. `final_submit.final_responses` uses scoring canonical question index string keys (`"1"`, `"2"`, ...) mapped to semantic `A` / `B` values and excludes qualifier/profile tokens. `src/features/test/entry-policy.ts` separates content, CTA configuration, and action effects; `src/features/test/instruction-overlay.tsx` renders the composed instruction and qualifier surfaces. `src/features/test/qualifier-overlay-model.ts` maps qualifier fields to overlay items, and `src/features/test/qualifier-resume-validator.ts` guards resume against missing or invalid qualifier tokens. `src/app/[locale]/test/[variant]/page.tsx` regex-validates the URL segment, redirects runtime-blocked variants to `/test/error?variant=...`, resolves via `resolveLandingTestEntryCardByVariant(locale, variant)`, fails closed with `notFound()` on true miss, and runs `getLazyValidatedVariant()` before mounting the runtime.

**Pure test-domain foundation** (`src/features/test/domain/*`): separate pure module for branded ids, schema/question models, variant validation, question-model validation, variant data integrity checks, score derivation, and type-segment parsing/building. `derivation.ts` exports the shared `axisMatchesQuestion()` helper so `computeScoreStats()`, `validateQuestionModel()`, and `validateVariantDataIntegrity()` all use the same bidirectional axis matching rule. `Question.poleA` / `Question.poleB` are required for `scoring` questions and optional for `profile` questions (ADR-X).

`src/features/test/schema-registry.ts` is the single owner of the variant → `ScoringLogicType` → `ScoringSchema` template mapping. MBTI variants share the 4-axis `E/I`, `S/N`, `T/F`, `J/P` schema. EGTT resolves to one `E/T` axis plus the `gender` qualifier with `['M', 'F']` token values.

**Live runtime status**: `test-question-client.tsx` still does not import `src/features/test/domain/` directly. The route `page.tsx` uses the lazy-validation boundary, so domain integrity failures now redirect to the §6.1 stub error-recovery route before session/run context creation. The current stub route is `/[locale]/test/error`; it displays `이 테스트에 진입할 수 없습니다`, includes the blocked variant when `?variant=...` is present, uses `PageShell` with the test GNB context, and suppresses the default consent banner. Phase 4 still owns the full recovery-card UI expansion.

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

`src/features/telemetry/consent-source.ts` — single consent gate for both custom telemetry and Vercel analytics, synchronized to `localStorage`, bridges cross-tab changes via browser `storage` event.

`src/features/telemetry/runtime.ts` — event queueing, anonymous session ID generation, `landing_view` deduplication by `locale:route`, consent-aware flush. Only session ID is persisted; event queue is in memory.

`src/features/telemetry/validation.ts` — rejects PII-shaped keys and legacy fields (`transition_id`, `result_reason`, `final_q1_response`).

There are currently six custom telemetry event types in `src/features/telemetry/types.ts`: `landing_view`, `card_answered`, `attempt_start`, `question_answered`, `final_submit`, and `result_viewed`. User-visible error events are described in `docs/req-test.md` as future hooks but are not implemented in the live telemetry type union.

**Active event surface:**

| Event | Required fields |
|---|---|
| `landing_view` | deduplicated by locale:route |
| `card_answered` | `source_variant`, `target_route`, `landing_ingress_flag=true` |
| `attempt_start` | `variant`, `question_index_1based`, `dwell_ms_accumulated`, `landing_ingress_flag` |
| `question_answered` | `variant`, `question_index_1based`, `choice`, `dwell_ms`, `landing_ingress_flag` |
| `final_submit` | same as `attempt_start` + `final_responses` (scoring canonical question index string keys: `"1"`, `"2"`, ...; values: semantic `A`/`B`; qualifier/profile tokens excluded) |
| `result_viewed` | `variant`, `landing_ingress_flag`; `derived_type` is optional until the 2위 result pipeline replaces the temporary mount fire with IntersectionObserver |

`src/app/api/telemetry/route.ts` requires an object payload with a supported `event_type`, reuses the shared telemetry transport validator, returns `400` on invalid schema/field hygiene/session contract failures, and returns `204` on accepted payloads. There is still no persistence. Transport validation now enforces the `attempt_start`-and-later `session_id !== null` requirement from `docs/req-test-plan.md` Gate C.

### 5.7 Styling Runtime

Tailwind v4 is active via `src/app/globals.css` `@import "tailwindcss"` plus `postcss.config.mjs`. As of the 2026-05-07 theme-matrix visual follow-up, `src/app/globals.css` is 149 lines and intentionally limited to theme tokens, visual state tokens, and the shared anchor base. `src/features/landing/grid/landing-grid-card.module.css` owns landing-grid motion, focus continuity, reduced-motion branches, and transient choreography. Component-local utility/class constants now own all other surface styling.

### 5.7.1 Tailwind v4 Migration — Completion Record

**Completion status (2026-04-16)**: Batches 1–7 complete, Checkpoints 1–4 all passed.

**Locked decisions:**

- `src/app/globals.css` was reduced from 1,240 lines to **112 lines** in the migration checkpoint; as of the 2026-05-07 theme-matrix visual follow-up, it is **149 lines** after token-only visual QA additions and still retains only token/theme definitions plus the shared anchor base.
- Landing grid/card motion, focus continuity, reduced-motion branches owned by `landing-grid-card.module.css` (371 lines).
- `data-*` anchors remain on the DOM as QA/debug/Playwright surface. Only visual CSS ownership moved.
- Global CSS selector surface intentionally limited to `:root`, `html[data-theme='dark']`, and `a { color: var(--link-ink) }`.
- Do not introduce `tailwind.config.*` until content scanning or theme extension is actually needed.
- The original migration-plan stub was absorbed into this section; use git history for batch-level provenance.

---

## 6. Runtime Contracts and Storage

Storage key changes should be treated as runtime-contract changes, not implementation details.

The key lists below describe the live prototype plus the Phase 3 test storage contract. Phase 3 owns ADR-B test-flow storage topology as `test:{variant}:...` plus `test:{variant}:flag:{flagName}`. The live `instructionSeen` key remains the variant-scoped legacy sessionStorage key and is managed through `src/features/transition/store.ts`.

**Storage key SSOT:**
- Landing keys: `src/features/landing/storage/storage-keys.ts`
- Test keys: `src/features/test/storage/storage-keys.ts` compatibility re-export, with the concrete Phase 3 API in `src/features/test/storage/test-storage-keys.ts`
- Exception: `public/theme-bootstrap.js` retains `'vivetest-theme'` as a string literal because the pre-hydration script cannot import TypeScript.

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
- `landing:transition-signal`
- `landing:transition-store-change`
- `landing:transition-cleanup`

**Prototype behaviors that are easy to miss:**

- Landing ingress is consumed exactly once: deep-link `/test` entry collects qualifier fields in the instruction overlay and then starts the runtime panel at `scoring1`; landing-ingress entry keeps the pre-answered `scoring1`, collects qualifier fields in the overlay when present, and starts the runtime panel at the next scoring question.
- `card_answered` fires at transition start for valid test cards — telemetry can record ingress intent even when the destination later fails closed.
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

Scoped to `tests/unit/`. Current file inventory: 57 `*.test.ts` files. Coverage spans route helpers, localization helpers, proxy policy, telemetry validation, transition storage, card/data contracts, GNB behavior and focused GNB hooks, GNB keyboard DOM/entry/target/routing seams, landing interaction DOM helpers, hover intent, desktop shell phase hooks, mobile lifecycle hooks, grid geometry, pure test-domain modules, cross-sheet integrity, Sheets loader normalization, sync orchestration failure/no-op/write paths, runtime integrity fallback, dev/test registry cache reset behavior, lazy validation, live question-bank APIs, and the schema registry. The legacy landing question-bank test file was removed during the 2026-04-24 question-bank refactor because its meaningful assertions now exercise `buildVariantQuestionBank()` / `resolveVariantPreviewQ1()` directly.

### 7.2 E2E Tests (Playwright)

9 spec files in `tests/e2e/`:

`playwright.config.ts` runs the E2E surface with `fullyParallel: true`; local output stays on the `list` reporter, while CI adds the GitHub reporter for PR-check annotations.

2026-05-07 R-08 follow-up: the default-parallel landing E2E bundle was hardened test-side only. `a11y-smoke.spec.ts` now waits for destination title/source-GNB readiness before axe, and `grid-smoke.spec.ts` samples the desktop closing frame atomically.

| Spec | Contract covered |
|---|---|
| `routing-smoke.spec.ts` | Locale-prefix redirects, not-found split, SSR `<html lang>`, zero hydration warnings |
| `gnb-smoke.spec.ts` | Desktop/mobile shell behavior, keyboard traversal matrices, theme-transition fallback |
| `grid-smoke.spec.ts` | Row planning, underfilled-row rules, spacing compensation, baseline freeze, geometry invariants |
| `state-smoke.spec.ts` | Keyboard-sequential traversal, overlay focus, mobile keyboard handoff, reduced-motion |
| `a11y-smoke.spec.ts` | AxeBuilder audits for landing, GNB-open, transition-overlay, KR representative state |
| `consent-smoke.spec.ts` | Test instruction contract matrix: variant-specific instruction copy, divider/note rendering, CTA labels, consent persistence, redirect/commit semantics |
| `theme-matrix-smoke.spec.ts` | Full matrix loop: 168 representative theme/layout/state screenshots (96 layout + 72 state); `@gate @smoke` loop: 120 canonical viewport screenshots |
| `safari-hover-ghosting.spec.ts` | WebKit-only hover/shadow seam regression (6 baselines, all `@gate`) |
| `transition-telemetry-smoke.spec.ts` | Landing ingress, transition signals, timeout/load-error/cancel closure, scroll restore, payload hygiene; B16 stale-pending cases assert known hydration console errors caused by intentional sessionStorage injection |

Helper layer: `tests/e2e/helpers/landing-fixture.ts` is the single source of truth for representative anchors via `PRIMARY_AVAILABLE_TEST_VARIANT`, `PRIMARY_AVAILABLE_TEST_INGRESS_STORAGE_KEY`, `PRIMARY_OPT_OUT_TEST_VARIANT`, `PRIMARY_OPT_OUT_TEST_INGRESS_STORAGE_KEY`, `PRIMARY_BLOG_VARIANT`, and `SECONDARY_BLOG_VARIANT`; ingress storage-key constants are constructed through `buildIngressStorageKey(variant)` so representative key values stay centralized; `helpers/consent.ts` seeds consent deterministically; `helpers/axe.ts` formats Axe violations.

The theme-matrix suites assume the combined theme label remains locked to the messages JSON wording family (`Language ⋅ Theme`); changing that label without updating the visual/message contract is a release-gate drift risk. Full local regeneration remains available through `npm run qa:visual:full`; that command runs both theme-matrix loops and currently reports 288 Chromium tests. The `@gate` E2E tier uses the reduced 120 Chromium theme-matrix screenshots plus 6 WebKit ghosting cases.

Local full-smoke reproduction requires Playwright Chromium and WebKit installation. WebKit ghosting coverage was verified with `webkit-2227` on 2026-05-03; install with `npx playwright install chromium webkit`.

### 7.3 Custom QA Scripts (`scripts/qa/`)

`qa:rules` delegates to `scripts/qa/run-all.mjs`, which runs the same 12 checks in parallel and prints each child script's buffered output after completion:

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

Consent-specific blockers 20~23 anchor in `tests/e2e/consent-smoke.spec.ts`; remaining test-flow blockers 24~30 mix `docs/req-test.md` manual/scenario anchors with unit/e2e evidence. Blockers 27, 28, 29, and 30 now carry automated evidence, including the 3-source cross-sheet unit coverage and route-level runtime guard assertions.

Shared local QA plumbing lives in `scripts/qa/_utils.mjs`; shared QA path groups live in `scripts/qa/_path-config.mjs`; and the Phase 1 duplicate-locale regex source lives in `scripts/qa/_locale-list.mjs`. Phase-specific helper functions remain inside their original scripts.

As of 2026-05-05, `npm run qa:rules` passes all 12 checks through the runner. The landing-controller split expanded the relevant script read scopes without weakening required-file checks: Phase 6 now reads `landing-catalog-grid.tsx` plus `use-grid-geometry-controller.ts`, Phase 7 reads the controller plus `interaction-dom.ts`, hover, desktop motion, and keyboard hooks, and Phase 10 includes the mobile lifecycle hook while keeping existing CSS/e2e contract anchors.

As of 2026-05-07, the T-02 QA path-config refactor centralizes shared landing, GNB, telemetry, transition, blog, style, and e2e file paths in `scripts/qa/_path-config.mjs`. The affected Phase 4-11 scripts and `check-variant-only-contracts.mjs` import only the path groups they scan, while single-source contract paths remain inline. Post-refactor verification: `npm run qa:rules`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` passed.

`qa:gate:once` chains `qa:static`, `build`, `npm test`, and the Playwright `@gate` subset. `qa:gate` repeats that pipeline three times for flake detection.

**Least verified areas** correspond directly to unimplemented or stubbed product surfaces: live score derivation wiring, contracted result screen rendering, test error recovery cards, answer projection from runtime `A`/`B` to domain tokens, question-level telemetry hooks, history persistence, backend ingestion guarantees, Results Sheets loading, and branch-protected production push policy.

### 7.4 Closed Follow-up Items (Historical Record)

Tailwind v4 Checkpoint 1–2 cycle follow-up tasks (variant registry fixture drift, theme matrix / Safari baseline closure) were all closed as of 2026-04-16. The 2026-04-25 landing-controller extraction cycle also closed its follow-ups: preview global 404 routing was realigned with `req-landing.md` §5.3/§5.5, and local theme-matrix/Safari visual baselines were refreshed and re-run under `PLAYWRIGHT_SERVER_MODE=preview`. Use git history if original stub context is needed.

---

## 8. Task Entry Guide

### Routing / locale / not-found
`src/proxy.ts` · `src/i18n/locale-resolution.ts` · `src/i18n/proxy-policy.ts` · `src/i18n/routing.ts` · `src/app/layout.tsx` · `src/app/[locale]/layout.tsx` · `src/app/[locale]/test/error/page.tsx` · `src/app/global-not-found.tsx` · `src/app/not-found.tsx` · `tests/e2e/routing-smoke.spec.ts`

### Landing grid / layout / interaction
`src/features/landing/grid/use-landing-interaction-controller.ts` · `src/features/landing/grid/interaction-dom.ts` · `src/features/landing/grid/use-hover-intent-controller.ts` · `src/features/landing/grid/use-desktop-motion-controller.ts` · `src/features/landing/grid/use-mobile-card-lifecycle.ts` · `src/features/landing/grid/use-keyboard-handoff.ts` · `src/features/landing/grid/use-keyboard-mode-tracker.ts` · `src/features/landing/grid/use-landing-keyboard-entry.ts` · `src/features/landing/grid/use-card-keyboard-handler.ts` · `src/features/landing/grid/use-grid-geometry-controller.ts` · `src/features/landing/grid/baseline-manager.ts` · `src/features/landing/grid/landing-catalog-grid.tsx` · `src/features/landing/model/interaction-state.ts` · `src/features/landing/grid/layout-plan.ts` · `src/features/landing/grid/spacing-plan.ts` · `tests/unit/landing-interaction-dom.test.ts` · `tests/unit/landing-hover-intent.test.ts` · `tests/unit/landing-mobile-lifecycle.test.ts` · `tests/unit/landing-desktop-shell-phase.test.ts` · `tests/unit/landing-grid-plan.test.ts` · `tests/unit/landing-baseline-manager.test.ts` · `tests/e2e/grid-smoke.spec.ts` · `tests/e2e/state-smoke.spec.ts`

### GNB / theme / shared shell
`src/features/gnb/site-gnb.tsx` · `src/features/gnb/gnb-keyboard-dom.ts` · `src/features/gnb/hooks/use-gnb-desktop-settings.ts` · `src/features/gnb/hooks/use-gnb-mobile-menu.ts` · `src/features/gnb/hooks/use-gnb-back-navigation.ts` · `src/features/gnb/hooks/use-landing-gnb-entry-mode.ts` · `src/features/gnb/hooks/use-gnb-keyboard-targets.ts` · `src/features/gnb/hooks/use-gnb-tab-routing.ts` · `src/features/gnb/hooks/use-keyboard-mode-tracker.ts` · `src/features/gnb/hooks/use-theme-preference.ts` · `src/features/gnb/hooks/theme-transition.ts` · `public/theme-bootstrap.js` · `src/features/landing/shell/page-shell.tsx` · `tests/e2e/gnb-smoke.spec.ts` · `tests/unit/gnb-behavior.test.ts` · `tests/unit/gnb-desktop-settings.test.ts` · `tests/unit/gnb-mobile-menu.test.ts` · `tests/unit/gnb-back-navigation.test.ts` · `tests/unit/gnb-keyboard-dom.test.ts` · `tests/unit/gnb-landing-entry-mode.test.ts` · `tests/unit/gnb-keyboard-targets.test.ts` · `tests/unit/gnb-tab-routing.test.ts` · `tests/unit/gnb-theme-transition.test.ts` · `tests/unit/gnb-message-labels.test.ts`

### Transition / destination continuity / return-restore
`src/features/transition/runtime.ts` · `src/features/transition/store.ts` · `src/features/transition/signals.ts` · `src/features/transition/transition-runtime-monitor.tsx` · `src/features/transition/use-pending-landing-transition.ts` · `src/features/landing/landing-runtime.tsx` · `tests/unit/landing-transition-runtime.test.ts` · `tests/unit/landing-transition-store.test.ts` · `tests/e2e/transition-telemetry-smoke.spec.ts`

### Telemetry / consent
`src/features/telemetry/runtime.ts` · `src/features/telemetry/validation.ts` · `src/features/telemetry/consent-source.ts` · `src/app/api/telemetry/route.ts` · `src/app/vercel-analytics-gate.tsx` · `scripts/qa/check-phase11-telemetry-contracts.mjs` · `tests/e2e/consent-smoke.spec.ts` · `docs/req-landing.md §12` · `docs/req-test.md §9`

### Screenshot baseline / representative fixture
`tests/e2e/theme-matrix-manifest.json` · `tests/e2e/theme-matrix-smoke.spec.ts` · `tests/e2e/helpers/landing-fixture.ts` · `tests/e2e/safari-hover-ghosting.spec.ts` · `tests/e2e/README.md`

### Test route runtime / instruction shell
`src/app/[locale]/test/[variant]/page.tsx` · `src/app/[locale]/test/error/page.tsx` · `src/features/test/test-question-client.tsx` · `src/features/test/entry-policy.ts` · `src/features/test/instruction-overlay.tsx` · `src/features/test/qualifier-overlay-model.ts` · `src/features/test/qualifier-resume-validator.ts` · `src/features/test/question-bank.ts` · `src/features/test/question-source-parser.ts` · `src/features/test/lazy-validation.ts` · `tests/unit/question-source-parser.test.ts` · `tests/unit/variant-question-bank.test.ts` · `tests/unit/test-question-bootstrap.test.ts` · `tests/unit/test-entry-policy.test.ts` · `tests/unit/test-entry-orchestrator-qualifier.test.ts` · `tests/unit/qualifier-overlay-model.test.ts` · `tests/unit/qualifier-resume-validator.test.ts` · `tests/unit/test-lazy-validation.test.ts` · `tests/e2e/qualifier-overlay.spec.ts` · `docs/req-test.md` · `docs/req-test-plan.md`

### Test domain foundation
`src/features/test/domain/index.ts` · `src/features/test/domain/types.ts` · `src/features/test/domain/validate-variant.ts` · `src/features/test/domain/validate-question-model.ts` · `src/features/test/domain/validate-variant-data-integrity.ts` · `src/features/test/domain/derivation.ts` · `src/features/test/domain/type-segment.ts` · `src/features/test/schema-registry.ts` · `src/features/test/response-projection.ts` · `tests/unit/test-domain-variant-validation.test.ts` · `tests/unit/test-domain-question-model.test.ts` · `tests/unit/test-domain-derivation.test.ts` · `tests/unit/test-domain-type-segment.test.ts` · `tests/unit/schema-registry.test.ts`

### Data model / fixture contract
`src/features/variant-registry/source-fixture.ts` · `src/features/variant-registry/builder.ts` · `src/features/variant-registry/attribute.ts` · `src/features/variant-registry/resolvers.ts` · `src/features/variant-registry/types.ts` · `src/features/variant-registry/cross-sheet-integrity.ts` · `src/features/variant-registry/registry-serializer.ts` · `src/features/variant-registry/sheets-row-normalizer.ts` · `scripts/sync/sheets-loader.ts` · `scripts/sync/sync.ts` · `scripts/sync/sync-dry-run.ts` · `.github/workflows/sync.yml` · `src/features/test/fixtures/questions/index.ts` · `src/features/test/fixtures/questions/types.ts` · `src/features/test/fixtures/results/index.ts` · `tests/unit/sheets-loader.test.ts` · `tests/unit/sync-orchestration.test.ts` · `tests/unit/cross-sheet-integrity.test.ts` · `tests/unit/registry-serializer.test.ts` · `tests/unit/variant-registry-runtime-integrity.test.ts`

---

## 9. Risks and Notes

**Instruction copy ownership is intentionally split.** Variant-specific instruction bodies live in fixtures, while CTA labels and consent notes live in locale messages. Future editors need to keep both sources in sync.

**Landing interaction runtime remains choreography-heavy, but the risk is now distributed.** The controller is 558 lines and reducer/orchestration ownership is clear, while hover, desktop motion, mobile lifecycle, keyboard handoff, DOM focus helpers, and grid geometry each have a named module. Future changes still need broad gate coverage because regressions can emerge from timing contracts between these hooks rather than from any single file.

**Shared runtime namespaces are now split by concern.** GNB, telemetry, transition, and blog destination code live under `src/features/gnb`, `src/features/telemetry`, `src/features/transition`, and `src/features/blog`, leaving `src/features/landing` focused on the landing runtime, grid, shell, and storage. Current pressure points are `src/features/gnb/site-gnb.tsx` (401 lines), `src/features/landing/grid/use-landing-interaction-controller.ts` (526 lines), `src/features/landing/grid/use-card-keyboard-handler.ts` (328 lines), and `src/features/landing/grid/use-grid-geometry-controller.ts` (348 lines). `use-keyboard-handoff.ts` is now a 91-line composition layer rather than a pressure point. GNB behavior pressure is split across focused desktop settings, mobile menu, back-navigation, keyboard DOM, landing entry mode, target discovery, and Tab-routing modules; keyboard-mode tracking has an exported hook reserved for future wiring after §7.5 compliance review. `use-mobile-card-lifecycle.ts` is now 287 lines after extracting `use-mobile-scroll-lock.ts` (27), `use-mobile-backdrop-gesture.ts` (100), `mobile-card-lifecycle-dom.ts` (48), `use-mobile-restore-polling.ts` (120), and `use-mobile-transient-shell.ts` (57; independent auto-reset timer removed — teardown now driven by the orchestrator's open and close timers).

**Test entry orchestration is now split from the client.** `use-test-entry-orchestrator.ts` owns the entry action handler (`executeInstructionAction`), qualifier step state, qualifier draft answers, Back/Continue behavior, qualifier answer writes, and the auto-commit effect. `markInstructionSeen` and `clearLandingIngress` are called from this hook. `test-question-client.tsx` retains `instructionVisible` derivation and renders the instruction/qualifier overlay props. The orchestrator hook does not own telemetry — `trackAttemptStart` and `trackFinalSubmit` remain in `use-test-run-controller.ts`.

**Test question auto-advance is client-owned.** The 150 ms auto-advance timer lives in `test-question-client.tsx`; rapid Previous taps during that window cancel the timer before backward navigation fires. A client-local `submittedRef` mirror prevents the delayed timer from advancing after manual Submit on the last question.

**Screenshot-driven QA remains concentrated in the instruction/qualifier surface and visual matrix.** The `test-instruction` representative route is shared by the theme-matrix manifest and consent smoke coverage, while `tests/e2e/qualifier-overlay.spec.ts` now owns EGTT qualifier navigation, selection, resume validation, and a11y coverage. CTA/copy/layout tweaks will churn a tightly coupled set of snapshots and route-level assertions. The 2026-05-03 R-01 follow-up confirmed theme-matrix baseline provenance, not code output, as the blocker source; future local baseline regeneration should use the preview command in `tests/e2e/README.md` and update the tracked provenance record at `tests/e2e/theme-matrix-baseline-provenance.md`.

**Tech stack notes:**
- `next@16.2.4`, `react@19.2.4`, `next-intl@4.9.1`
- `motion@12.34.0` is used by the test question answer-grid transitions; any broader adoption should stay aligned with `docs/req-landing.md` §8.3 Core Motion Contract
- Tailwind v4 active via `src/app/globals.css`; `src/app/globals.css` is limited to tokens/shared anchor base; `data-*` anchors continue serving QA/debug and Playwright coverage. Any further follow-up should stay within feature-local CSS.
