# Project Analysis

## 1. Current State At A Glance

This repository is a localized Next.js App Router application. Its real technical center of gravity is a landing-to-destination interaction system plus a fixture-backed, policy-driven test-entry shell, not the full assessment product described in `docs/requirements.md`. The codebase is best understood as a V1 front-end interaction prototype with mature contract coverage in landing, transition, consent, and telemetry seams, plus a separate pure test-domain foundation that is only partially wired into the user-facing runtime.

**Workspace verification:**

- `PLAYWRIGHT_SERVER_MODE=preview npx playwright test tests/e2e/theme-matrix-smoke.spec.ts tests/e2e/safari-hover-ghosting.spec.ts`: 174 tests — passes
- `node scripts/qa/check-phase11-telemetry-contracts.mjs`: passes
- `npm run qa:rules` (2026-04-21 docs sync gate): passes
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` (2026-04-22 axisMatchesQuestion direct test docs sync gate): pass
- Ownership migration final gate (`check-phase4`~`check-phase10`, `grid/state/gnb/a11y/theme-matrix/transition` Playwright smoke): pass
- `npm test`: 42 unit test files / 218 tests — passes
- Snapshot baseline policy: visual smoke stores local PNG baselines under `tests/e2e/*-snapshots/`. The screenshot helper auto-creates missing files and falls back to Playwright comparison when a local baseline already exists. Git tracked completeness is not required.

**Implementation phase status (2026-04-23):** Phase 0 pre-requisite ADRs are all complete — ADR-A (`src/features/test` namespace separation), ADR-B (storage key contract and 5-flag topology), ADR-E (representative variant QA baseline). Phase 1 Domain Foundation is complete: all seven files under `src/features/test/domain/` exist, dedicated unit tests pass, and blockers #7/#11/#12/#27 are mapped in `docs/blocker-traceability.json`. Phase 2 data guardrails now cover Group A and Group C runtime paths: 3-source cross-sheet validation, Results fixture boundary, runtime fallback, entry route guard, fixture hardening for enterable variants, lazy validation + cache, `/test/error` recovery stub, and B29/B30 automated evidence are present. Key contracts frozen by Phase 0–1: `VariantId` and `QuestionIndex` intersection brand types, `validateVariant()` three-way result union shape, `BlockingDataErrorReason` enum surface. Modifying these requires a new ADR. See `docs/req-test-plan.md` for the full Phase roadmap and ADR decision records.

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
- Pure test-domain foundation for schema validation and derivation utilities: `validateVariant`, `validateQuestionModel`, `validateVariantDataIntegrity`, `axisMatchesQuestion`, `computeScoreStats`, `deriveDerivedType`, `parseTypeSegment`, `buildTypeSegment`, plus `VariantSchema` / `ScoringSchema` / `QuestionType` / `QualifierFieldSpec` types (`src/features/test/domain/`). Key interface contracts are frozen by Phase 0–1 ADRs (brand type shapes, `validateVariant()` result union, `BlockingDataErrorReason` enum).
- Code-owned test schema registry and projection boundary reservation: `src/features/test/schema-registry.ts` owns the variant → `ScoringLogicType` → `ScoringSchema` template mapping, while `src/features/test/response-projection.ts` reserves the future A/B runtime response → domain token projection layer.

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
            │         ├─ src/features/variant-registry/variant-registry.generated.ts (static generated runtime registry)
            │         ├─ src/features/variant-registry/resolvers.ts (registry loader + resolver boundary)
            │         ├─ src/features/variant-registry/attribute.ts (attribute helpers)
            │         ├─ src/features/test/fixtures/questions/** (variant-split Questions row fixtures)
            │         ├─ src/features/test/fixtures/results/** (row-level Results variantId fixture)
            │         ├─ src/features/landing/grid/use-landing-interaction-controller.ts
            │         └─ src/features/landing/grid/landing-catalog-grid.tsx
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

Separately, the pure test-domain foundation and adjacent schema/projection boundaries expose helpers for future schema-driven test flow:

- `types.ts` / `index.ts` — branded ids, schema, question, and payload interfaces
- `validate-variant.ts` — registered/available variant validation
- `validate-question-model.ts` / `validate-variant-data-integrity.ts` — question-model and schema integrity checks
- `derivation.ts` — `axisMatchesQuestion()`, `computeScoreStats()`, and `deriveDerivedType()`
- `type-segment.ts` — `parseTypeSegment()` and `buildTypeSegment()`
- `src/features/test/schema-registry.ts` — single owner of the variant → ScoringLogicType → ScoringSchema template mapping
- `response-projection.ts` — reserved Phase 4/7 projection boundary from runtime A/B codes to domain tokens

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
/api/telemetry           (dynamic)
```

Segment/global 404 handling is implemented through `src/app/not-found.tsx` and `src/app/global-not-found.tsx`, not through a dedicated user-facing page route file.

### 4.2 Supported Locales

Defined in `src/config/site.ts`: `en`, `kr`, `zs`, `zt`, `ja`, `es`, `fr`, `pt`, `de`, `hi`, `id`, `ru`

All 12 locale files in `src/messages/` are complete with the same 6 namespaces: `gnb`, `landing`, `test`, `blog`, `history`, `consent`. Shared UI chrome, CTA labels, and generic consent-note copy are handled by these files. Variant-specific test instruction copy is fixture-backed through `src/features/variant-registry/source-fixture.ts` and consumed through the registry resolver boundary. Question/answer fixture copy is split by variant under `src/features/test/fixtures/questions/**` and uses the same locale-keyed `LocalizedText` pattern for question and answer text.

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

- `src/features/landing/grid/use-landing-interaction-controller.ts` — **1587 lines**, runtime state machine for focus, hover intent, keyboard handoff, reduced motion, page visibility, mobile transient shells, backdrop gestures, transition start/cancel
- `src/features/landing/grid/landing-catalog-grid.tsx` — DOM geometry measurement, row baseline freezing, `requestAnimationFrame` timing

State transitions are named and centralized; timing constants are explicit. The main risk is operational complexity under future browser, content-density, or performance changes. Styling ownership is hybrid: static shells plus boolean-resolvable card states live as utility/class constants in `landing-catalog-grid.tsx` and `landing-grid-card.tsx`, while `landing-grid-card.tsx` also remaps raw runtime state into semantic style classes that `landing-grid-card.module.css` consumes exclusively for motion, focus continuity, reduced-motion branches, and desktop/mobile transient choreography. Raw `data-*` attributes remain on the DOM as QA/debug and Playwright anchors but no longer participate in the CSS contract.

### 5.2 GNB

`src/features/landing/gnb/site-gnb.tsx` — **~831 lines** — does far more than render nav links. It owns: desktop settings hover, click/focus fallback, mobile menu choreography, route-aware back behavior, locale switching, theme switching, landing-specific keyboard entry order, and focus return semantics.

Key supporting files: `src/features/landing/gnb/behavior.ts`, `src/features/landing/gnb/types.ts` (defines `GnbContext` per route: landing/blog/history/test), `src/features/landing/gnb/hooks/`.

Theme subsystem: `public/theme-bootstrap.js` (sets before hydration from `localStorage`), `src/features/landing/gnb/hooks/use-theme-preference.ts` (persists manual overrides), `src/features/landing/gnb/hooks/theme-transition.ts` (2500ms blur-circle View Transition API, with reduced-motion fallback).

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

`src/features/variant-registry/builder.ts` validates source rows, sorts by `seq`, drops `seq` from the exported runtime registry, and emits separate `landingCards` / `testPreviewPayloadByVariant` runtime stores. The builder does not import Questions fixtures; callers inject `questionSourcesByVariant`, and the preview store is projected from each variant's first scoring row via `findFirstScoringRow()`. `resolveTestPreviewPayload()` reads the registry's `testPreviewPayloadByVariant` store and exposes the stable `previewQuestion` / `answerChoiceA` / `answerChoiceB` runtime shape. Runtime meta keys are unified as `durationM` / `sharedC` / `engagedC`.

`src/features/variant-registry/sheets-row-normalizer.ts` is the pure pre-sync Questions row normalization boundary for Group B callers. It converts raw Sheets columns such as `question_EN`, `answerA_KR`, and `pole_A` / `pole_B` into parser-compatible `QuestionSourceRow` shape (`question` / `answerA` / `answerB` `LocalizedText`, `poleA` / `poleB`). Locale suffix mapping is owned by `parseLocaleColumnKey()` (`EN` → `en`, `KR` → `kr`, `ZS` → `zs` via lowercase normalization), unsupported columns/locales are ignored, and empty string values are omitted so the existing default-locale fallback path remains responsible for display fallback. `tests/unit/sheets-row-normalizer.test.ts` verifies both TypeScript assignability to `QuestionSourceRow` and runtime compatibility with `buildCanonicalQuestions()`.

`src/features/variant-registry/variant-registry.generated.ts` is a static object-literal `VariantRegistry` artifact, not a runtime fixture-build bridge. The current baseline was regenerated from the fixture builder output, and `scripts/sync/regenerate-variant-registry-from-fixture.ts` is available as a fixture-only one-shot regeneration path until the full Google Sheets Sync script owns production regeneration.

`src/features/variant-registry/registry-serializer.ts` is the pure generated-file serialization boundary. `serializeRegistryToFile(registry)` returns the TypeScript file contents for an object-literal `variantRegistryGenerated` export using the existing generated header, `import type {VariantRegistry} from './types'`, and deterministic alphabetic object-key ordering. `tests/unit/registry-serializer.test.ts` checks parseability, deterministic output, key-order normalization, and structural equivalence against the currently importable generated registry data. This utility does not read Sheets or write files; Action/script wiring remains Group B scope.

`src/features/test/question-source-parser.ts` is the pure Questions parser boundary: `parseSeqToQuestionType()` (`q.*` → profile, numeric → scoring), `buildCanonicalQuestions()` (source-order 1-based canonical indexes), and `findFirstScoringRow()`. Group D preview migration is complete: `src/features/test/question-bank.ts` exposes live `buildVariantQuestionBank()` runtime wiring and `resolveVariantPreviewQ1()` for direct Questions-backed `scoring1` projection helpers, while landing UI preview consumption stays behind the variant-registry resolver. `src/features/landing/data/` now re-exports resolver-backed variant-registry surfaces only; the raw fixture compatibility export/file is removed.

### 5.4 Transition Runtime

Landing-to-destination handshake: `src/features/landing/transition/use-landing-transition.ts` converts CTA clicks into localized route pushes. Before navigation, `src/features/landing/transition/runtime.ts` writes `PendingLandingTransition` to `sessionStorage`, records return scroll state, and, for test cards, writes a landing ingress record (`variant`, `preAnswerChoice`, `createdAtMs`, `landingIngressFlag`).

On the destination side, `src/features/landing/transition/transition-runtime-monitor.tsx` enforces a **1600ms timeout**. `TransitionGnbOverlay` keeps a landing-context GNB visible during pending transition. `LandingRuntime` restores scroll on return and cancels stale transitions with `USER_CANCEL`.

Result reasons: `USER_CANCEL`, `DUPLICATE_LOCALE`, `DESTINATION_TIMEOUT`, `DESTINATION_LOAD_ERROR`, `UNKNOWN`. Cleanup is centralized in `rollbackLandingTransition()`. All persistence is session-scoped and client-only.

### 5.5 Destination Bootstrap

**Blog** (`src/features/landing/blog/server-model.ts`, `src/features/landing/blog/blog-destination-client.tsx`): `variant` is the only article identifier. Invalid or non-enterable variants redirect to the localized blog index. Pending transition is an overlay/completion signal only. The detail route exports `generateMetadata()`.

**Test** (`src/features/test/test-question-client.tsx`): policy-driven instruction gating, variant Questions fixture runtime wiring through `buildVariantQuestionBank()`, landing-ingress seeding of `scoring1`, direct-entry start from `q.1` when profile rows exist or `scoring1` otherwise, dwell time tracking, and `attempt_start` / `final_submit` telemetry. Ingress entries keep the landing `scoring1` pre-answer, then start from `q.1` for profile-first variants such as `egtt` or from `scoring2` when no profile row exists. `src/features/test/entry-policy.ts` separates content, CTA configuration, and action effects; `src/features/test/instruction-overlay.tsx` renders the composed instruction surface. `src/app/[locale]/test/[variant]/page.tsx` regex-validates the URL segment, redirects runtime-blocked variants to `/test/error?variant=...`, resolves via `resolveLandingTestEntryCardByVariant(locale, variant)`, fails closed with `notFound()` on true miss, and runs `getLazyValidatedVariant()` before mounting the runtime.

**Pure test-domain foundation** (`src/features/test/domain/*`): separate pure module for branded ids, schema/question models, variant validation, question-model validation, variant data integrity checks, score derivation, and type-segment parsing/building. `derivation.ts` exports the shared `axisMatchesQuestion()` helper so `computeScoreStats()`, `validateQuestionModel()`, and `validateVariantDataIntegrity()` all use the same bidirectional axis matching rule. `Question.poleA` / `Question.poleB` are required for `scoring` questions and optional for `profile` questions (ADR-X).

`src/features/test/schema-registry.ts` is the single owner of the variant → `ScoringLogicType` → `ScoringSchema` template mapping. MBTI variants share the 4-axis `E/I`, `S/N`, `T/F`, `J/P` schema. EGTT resolves to one `E/T` axis plus the `gender` qualifier with `['M', 'F']` token values.

**Live runtime status**: `test-question-client.tsx` still does not import `src/features/test/domain/` directly. The route `page.tsx` uses the lazy-validation boundary, so domain integrity failures now redirect to the §6.1 stub error-recovery route before session/run context creation. The current stub route is `/[locale]/test/error`; it displays `이 테스트에 진입할 수 없습니다`, and includes the blocked variant when `?variant=...` is present. Phase 4 still owns the full recovery-card UI expansion.

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

Tailwind v4 is active via `src/app/globals.css` `@import "tailwindcss"` plus `postcss.config.mjs`. `src/app/globals.css` is down to 112 lines and intentionally limited to theme tokens and the shared anchor base. `src/features/landing/grid/landing-grid-card.module.css` owns landing-grid motion, focus continuity, reduced-motion branches, and transient choreography. Component-local utility/class constants now own all other surface styling.

### 5.7.1 Tailwind v4 Migration — Completion Record

**Completion status (2026-04-16)**: Batches 1–7 complete, Checkpoints 1–4 all passed.

**Locked decisions:**

- `src/app/globals.css` reduced from 1,240 lines to **112 lines**; retains only token/theme definitions plus the shared anchor base.
- Landing grid/card motion, focus continuity, reduced-motion branches owned by `landing-grid-card.module.css` (371 lines).
- `data-*` anchors remain on the DOM as QA/debug/Playwright surface. Only visual CSS ownership moved.
- Global CSS surface intentionally limited to three essentials: `:root`, `html[data-theme='dark']`, and `a { color: var(--link-ink) }`.
- Do not introduce `tailwind.config.*` until content scanning or theme extension is actually needed.
- The original migration-plan stub was absorbed into this section; use git history for batch-level provenance.

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

- Landing ingress is consumed exactly once: deep-link `/test` entry starts from `q.1` when a profile row exists or `scoring1` otherwise, without `card_answered` or `transition_start`; landing-ingress entry keeps the pre-answered `scoring1` and starts from `q.1` for profile-first variants or `scoring2` otherwise.
- `card_answered` fires at transition start for test cards — telemetry can record ingress intent even when the destination later fails closed.
- Test-route consent writes now originate only from instruction CTA actions; the page renders no route-local consent banner, no confirm dialog, and no blocked-start popup.
- `vivetest-test-instruction-seen:{variant}` is still variant-scoped in `sessionStorage`.
- `[Start]`, `[Accept All and Start]`, and `[Deny and Start]` record `instructionSeen` and commit runtime entry.
- `[Deny and Abandon]` and `[Keep Current Preference]` do not record `instructionSeen`; they redirect home instead.
- Auto-commit after `instructionSeen` now applies only to the plain `[Start]` path because note-based consent policies keep `canAutoCommitAfterInstructionSeen=false`.
- Blog destination rejects invalid or non-enterable variants by redirecting to the localized blog index.
- Test variant URL validation is stricter than before: runtime-blocked variants redirect to `/test/error?variant=...`, while true route/card misses still use `notFound()`.
- `history` page shares the full landing shell and GNB.
- Preferences button in the consent banner is a visible no-op.

---

## 7. Testing and Quality Gates

### 7.1 Unit Tests (Vitest)

Scoped to `tests/unit/`. Latest rerun: 42 files / 218 tests. Coverage spans route helpers, localization helpers, telemetry validation, transition storage, card/data contracts, GNB behavior, pure test-domain modules, cross-sheet integrity, runtime integrity fallback, lazy validation, and the schema registry.

### 7.2 E2E Tests (Playwright)

9 spec files / 275 tests in `tests/e2e/`:

| Spec | Contract covered |
|---|---|
| `routing-smoke.spec.ts` | Locale-prefix redirects, not-found split, SSR `<html lang>`, zero hydration warnings |
| `gnb-smoke.spec.ts` | Desktop/mobile shell behavior, keyboard traversal matrices, theme-transition fallback |
| `grid-smoke.spec.ts` | Row planning, underfilled-row rules, spacing compensation, baseline freeze, geometry invariants |
| `state-smoke.spec.ts` | Keyboard-sequential traversal, overlay focus, mobile keyboard handoff, reduced-motion |
| `a11y-smoke.spec.ts` | AxeBuilder audits for landing, GNB-open, transition-overlay, KR representative state |
| `consent-smoke.spec.ts` | Test instruction contract matrix: variant-specific instruction copy, divider/note rendering, CTA labels, consent persistence, redirect/commit semantics |
| `theme-matrix-smoke.spec.ts` | 168 representative theme/layout/state screenshots (96 layout + 72 state) |
| `safari-hover-ghosting.spec.ts` | WebKit-only hover/shadow seam regression (5 baselines) |
| `transition-telemetry-smoke.spec.ts` | Landing ingress, transition signals, timeout/load-error/cancel closure, scroll restore, payload hygiene |

Helper layer: `tests/e2e/helpers/landing-fixture.ts` is the single source of truth for representative anchors via `PRIMARY_AVAILABLE_TEST_VARIANT`, `PRIMARY_AVAILABLE_TEST_INGRESS_STORAGE_KEY`, `PRIMARY_OPT_OUT_TEST_VARIANT`, `PRIMARY_OPT_OUT_TEST_INGRESS_STORAGE_KEY`, `PRIMARY_BLOG_VARIANT`, and `SECONDARY_BLOG_VARIANT`; `helpers/consent.ts` seeds consent deterministically; `helpers/axe.ts` formats Axe violations.

The theme-matrix suites assume the combined theme label remains locked to the messages JSON wording family (`Language ⋅ Theme`); changing that label without updating the visual/message contract is a release-gate drift risk.

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

Consent-specific blockers 20~23 anchor in `tests/e2e/consent-smoke.spec.ts`; remaining test-flow blockers 24~30 mix `docs/req-test.md` manual/scenario anchors with unit/e2e evidence. Blockers 27, 28, 29, and 30 now carry automated evidence, including the 3-source cross-sheet unit coverage and route-level runtime guard assertions.

As of 2026-04-23, `npm run qa:rules` passes all 12 checks.

`qa:gate:once` chains `qa:static`, `build`, `npm test`, and Playwright smoke. `qa:gate` repeats that pipeline three times for flake detection.

**Least verified areas** correspond directly to unimplemented product surfaces: scoring correctness, result semantics, history persistence, backend ingestion guarantees, data-source synchronization.

### 7.4 Closed Follow-up Items (Historical Record)

Tailwind v4 Checkpoint 1–2 cycle follow-up tasks (variant registry fixture drift, theme matrix / Safari baseline closure) were all closed as of 2026-04-16. No active follow-up tasks remain from that cycle. Use git history if original stub context is needed.

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
`src/features/landing/telemetry/runtime.ts` · `src/features/landing/telemetry/validation.ts` · `src/features/landing/telemetry/consent-source.ts` · `src/app/api/telemetry/route.ts` · `src/app/vercel-analytics-gate.tsx` · `scripts/qa/check-phase11-telemetry-contracts.mjs` · `tests/e2e/consent-smoke.spec.ts` · `docs/req-landing.md §12` · `docs/req-test.md §9`

### Screenshot baseline / representative fixture
`tests/e2e/theme-matrix-manifest.json` · `tests/e2e/theme-matrix-smoke.spec.ts` · `tests/e2e/helpers/landing-fixture.ts` · `tests/e2e/safari-hover-ghosting.spec.ts`

### Test route runtime / instruction shell
`src/features/test/test-question-client.tsx` · `src/features/test/entry-policy.ts` · `src/features/test/instruction-overlay.tsx` · `src/features/test/question-bank.ts` · `src/features/test/question-source-parser.ts` · `tests/unit/question-source-parser.test.ts` · `tests/unit/variant-question-bank.test.ts` · `docs/req-test.md` · `docs/req-test-plan.md`

### Test domain foundation
`src/features/test/domain/index.ts` · `src/features/test/domain/types.ts` · `src/features/test/domain/validate-variant.ts` · `src/features/test/domain/validate-question-model.ts` · `src/features/test/domain/validate-variant-data-integrity.ts` · `src/features/test/domain/derivation.ts` · `src/features/test/domain/type-segment.ts` · `src/features/test/schema-registry.ts` · `src/features/test/response-projection.ts` · `tests/unit/test-domain-variant-validation.test.ts` · `tests/unit/test-domain-question-model.test.ts` · `tests/unit/test-domain-derivation.test.ts` · `tests/unit/test-domain-type-segment.test.ts` · `tests/unit/schema-registry.test.ts`

### Data model / fixture contract
`src/features/variant-registry/source-fixture.ts` · `src/features/variant-registry/builder.ts` · `src/features/variant-registry/attribute.ts` · `src/features/variant-registry/resolvers.ts` · `src/features/variant-registry/types.ts` · `src/features/test/fixtures/questions/index.ts` · `src/features/test/fixtures/questions/types.ts`

---

## 9. Risks and Notes

**Instruction copy ownership is intentionally split.** Variant-specific instruction bodies live in fixtures, while CTA labels and consent notes live in locale messages. Future editors need to keep both sources in sync.

**Landing interaction runtime is a scaling risk.** `use-landing-interaction-controller.ts` at 1587 lines mixes geometry measurement, `requestAnimationFrame` sequencing, hover timers, and mobile shell phases. The most likely future refactoring cost concentration point.

**`src/features/landing` namespace is dense.** Blog, test, GNB, telemetry, and transition concerns are all colocated here. Two files stand out as primary pressure points: `use-landing-interaction-controller.ts` (1587 lines) and `site-gnb.tsx` (~831 lines).

**Screenshot-driven QA remains concentrated in the instruction surface.** The `test-instruction` representative route is shared by the theme-matrix manifest and consent smoke coverage, so CTA/copy/layout tweaks will churn a tightly coupled set of snapshots and route-level assertions.

**Tech stack notes:**
- `next@16.1.6`, `react@19.2.4`, `next-intl@4.8.3`
- `motion@12.34.0` installed but not imported anywhere in `src` or `tests`; any adoption should stay aligned with `docs/req-landing.md` §8.3 Core Motion Contract
- Tailwind v4 active via `src/app/globals.css`; `src/app/globals.css` is limited to tokens/shared anchor base; `data-*` anchors continue serving QA/debug and Playwright coverage. Any further follow-up should stay within feature-local CSS.
