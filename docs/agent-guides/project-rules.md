# docs/agent-guides/project-rules.md

> Project-specific implementation rules for ViveTest.
> Load when the Task Routing Table (AGENTS.md §2) directs you here.
> These are project deviations and hard constraints — not general engineering principles.

---

## Directory Ownership {#Ownership}

| Path | Role |
|:---|:---|
| `src/app/[locale]/**` | Thin route / server entry only |
| `src/features/landing/**` | Landing runtime, grid/model/shell/storage orchestration |
| `src/features/gnb/**` | Global navigation shell, theme preference, locale switching, route-aware back navigation |
| `src/features/telemetry/**` | Consent source, custom telemetry runtime, payload validation, Vercel analytics consent bridge |
| `src/features/transition/**` | Landing-to-destination transition persistence, signals, monitor, GNB overlay |
| `src/features/blog/**` | Blog list/detail destination model and client |
| `src/features/test/**` | Canonical test surface |
| `src/features/test/domain/**` | Pure domain module — `index.ts` is the only public surface |
| `src/features/test/schema-registry.ts` | Owns variant → ScoringLogicType → ScoringSchema mapping |
| `src/features/test/response-projection.ts` | Reserved placeholder — currently unimplemented |
| `src/features/variant-registry/**` | Fixture source, builder, resolver, generated runtime registry |
| `scripts/sync/**` | Sheets loading (`sheets-loader.ts`), sync (`sync.ts`), dry-run (`sync-dry-run.ts`), serialization (`registry-serializer.ts`). Contract: `docs/req-test.md §2` |
| `src/i18n/**` | Locale resolution, request policy, SSR `html lang` sync |
| `src/lib/routes/**` | Locale-free typed route authoring |
| `src/lib/correlation-id.ts` | Browser-safe anonymous/correlation ID utilities |
| `src/i18n/localized-path.ts` | Locale prefix application |
| `src/messages/*.json` | Shared UI copy — namespaces: `gnb`, `landing`, `test`, `blog`, `history`, `consent` |
| `public/theme-bootstrap.js` | Pre-hydration theme bootstrap |
| `scripts/qa/*.mjs` | Machine-enforced contract checks |
| `docs/blocker-traceability.json` | Blocker evidence registry — current blockers `1..30` |
| `tests/e2e/helpers/landing-fixture.ts` | Representative route anchor SSOT |

---

## Architecture / Routing / Locale {#Architecture}

- All page files must live under `src/app/[locale]/**`.
- Route authoring: use `RouteBuilder`. Locale prefix: use `buildLocalizedPath()`.
  Never construct path strings manually.
- `src/proxy.ts` is the single request entry point.
  Do not create alternative entry points or reintroduce `src/middleware.ts`.
- `src/app/layout.tsx` — top-level document shell only.
  Locale-specific branching belongs in `src/app/[locale]/layout.tsx`.
- Duplicate locale prefixes handled via `/_not-found` rewrite.
  Locale-less paths must redirect to localized equivalents.

---

## Variant Registry / Fixture Boundary {#VariantRegistry}

- Landing, test, and blog consumers must not read raw fixture shapes directly.
- Direct imports of `raw-fixtures`, `source-fixture`, or `variant-registry.generated`
  outside the registry layer are prohibited.
- Preview payload access: permitted only through `resolveTestPreviewPayload()`.
- `variant-registry.generated.ts` — runtime export only.
  Do not mix source fixture authoring shapes with runtime shapes.
- Source row processing pipeline: `seq → sort → drop`.
- Partial activation prohibited — do not apply partial updates when cross-source data is inconsistent.
- Unified runtime meta keys: `durationM`, `sharedC`, `engagedC`.
- `{audience: 'qa'}` resolver exposes `hide` and `debug` fixtures only within QA catalog.
- Preview source: first scoring question `scoring1` from Questions Sheet.
  Do not add inline preview fields to source fixtures.
  Consumer shape (`previewQuestion`, `answerChoiceA`, `answerChoiceB`) must be preserved.
  Confine source replacement to builder and resolver internals.

---

## Test Flow / Domain / Storage {#TestFlow}

- Canonical test surface: `src/features/test/**`. Do not reintroduce `src/features/landing/test/*`.
- Domain public API: `src/features/test/domain/index.ts` only.
- Contracts frozen by Phase 0–1 ADRs (`docs/req-test-plan.md`) — must not change without a new ADR:
  - `VariantId = string & { readonly __brand: 'VariantId' }`
  - `QuestionIndex = number & { readonly __brand: 'QuestionIndex' }`
  - `MISSING | UNKNOWN | UNAVAILABLE` union shape of `validateVariant()`
  - `BlockingDataErrorReason` surface
- Instruction body copy: owned by fixtures.
  CTA labels and consent notes: owned by locale messages.
- Live anchors: `buildVariantQuestionBank()`, `resolveVariantPreviewQ1()`, and the thin
  `resolveVariantPreviewPayload()` projection helper. Do not reintroduce inline preview fields.
- Test route: does not render route-local consent banners, confirm dialogs, or blocked popups.
- Storage Key SSOT:
  - Landing keys → `src/features/landing/storage/storage-keys.ts`
  - Test keys → `src/features/test/storage/storage-keys.ts` compatibility re-export; concrete Phase 3 key API lives in `src/features/test/storage/test-storage-keys.ts`
  - `instructionSeen` key/helper owner → `src/features/test/storage/instruction-seen.ts`
  - ADR-B external legacy key format: `vivetest-test-instruction-seen:{variant}`
    remains outside the ADR-B prefix form (`test:{variant}:instructionSeen`) until Phase 5 migration.
  - Landing ingress → runtime answer boundary:
    - `writeLandingIngress` / `readLandingIngress` / `clearLandingIngress` → `src/features/transition/store.ts`
    - `preAnswerChoice → first scoring answer` bootstrap mapping → `src/features/test/bootstrap-state-resolver.ts`
    - Bootstrap state resolution (question index, resume path, ingress precedence) → `src/features/test/bootstrap-state-resolver.ts`
  - Exception: `public/theme-bootstrap.js` retains `'vivetest-theme'` as string literal
    (TS import not possible at pre-hydration stage)
- `instructionSeen` remains a variant-scoped `sessionStorage` key.
  Do not introduce unauthorized storage keys beyond the documented legacy exception above.

---

## Blog / Telemetry / Theme / QA Surface {#Blog-Telemetry-Theme}

- `/{locale}/blog` is a list-only route.
- Blog detail routes for invalid or non-enterable variants must redirect to the localized blog
  index — no fallback to another article.
- Telemetry API: object payload with `event_type` required.
  Returns `400` on validation failure, `204` on success. No persistence layer.
- Telemetry and Vercel analytics must share a single consent source
  (`src/features/telemetry/consent-source.ts`).
- Preferences button in consent banner is currently a visible no-op.
  Do not add behavior before requirements change.
- Representative anchors: available test `qmbti` · opt-out test `energy-check` · primary blog `ops-handbook`.
- Theme-matrix QA uses only representative `en` and `kr` matrix rows — not all locales.
- Theme-matrix screenshot baselines are local ignored files under `tests/e2e/*-snapshots/`.
  Record the shared latest regeneration and gate verification result in
  `tests/e2e/theme-matrix-baseline-provenance.md` using `tests/e2e/README.md`.
- Combined theme label format: `Language ⋅ Theme`.
- `public/theme-bootstrap.js` reads `vivetest-theme` before hydration.
- `motion` is currently imported in `src/features/test/test-question-client.tsx`
  for answer-grid transitions. Any broader adoption must align with
  `docs/req-landing.md §8.3 Core Motion Contract`.

---

## Unimplemented / Stub Areas

Do not treat the following as completed contracts:

- Live score derivation wiring and result URL/payload rendering
- Runtime A/B response → domain token projection
  (`src/features/test/response-projection.ts` is a reserved placeholder)
- Question-level telemetry — implemented, not stub: `question_answered` (validated;
  `trackQuestionAnswered` runtime helper; Phase 11 QA enforces helper presence; fires from
  `use-answer-handler.ts` on each non-last scoring answer) and `result_viewed` (validated;
  optional `derived_type`; temporary mount-based fire from `TestResultPanel`). Only remaining
  deferred follow-up: real `derived_type` value + IntersectionObserver replacement of the
  temporary mount fire — tracked in `docs/plans/result-pipeline-todos.md`.
- History persistence
- Results Sheets loading
  (`validateCrossSheetIntegrity` runs in 2-source mode until this source is ready)
- Backend ingestion guarantees and branch-protected production push policy
