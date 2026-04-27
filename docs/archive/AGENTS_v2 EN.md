# AGENTS.md

> **Purpose of this file**: A declarative store for project-specific facts, architecture constraints, and validation commands.
> Brainstorming, planning, TDD, code review, and other development workflows are handled by Superpowers skills. Do not add procedural workflow instructions to this file.

---

## 1. Required Checks Before Starting Any Task

First, verify the actual scripts and flags in:
- `package.json`
- `next.config.ts`
- `playwright.config.ts`
- `src/config/site.ts`

Read contract documents in the order below. **Do not read all of them upfront — read only those relevant to the current task type.**
- `docs/project-analysis.md`
- `docs/req-landing.md`
- `docs/req-test.md`
- `docs/req-test-plan.md`
- `docs/blocker-traceability.json` when blocker evidence is involved

`docs/requirements.md` is background context — do not treat it as a direct implementation SSOT.
`docs/archive/**` is historical reference only — do not use it as a current contract basis.

Before touching any of the paths below, confirm the relevant contract document and test anchor first:
- `src/proxy.ts`
- `src/i18n/**`
- `src/app/[locale]/**`
- `src/lib/routes/route-builder.ts`
- `src/i18n/localized-path.ts`
- `src/features/test/**`
- `src/features/variant-registry/**`
- `public/theme-bootstrap.js`
- `tests/e2e/theme-matrix-manifest.json`
- `docs/blocker-traceability.json`

### Task Entry Map

- routing / locale / not-found: `docs/req-landing.md` §5, `docs/project-analysis.md` §4, `src/proxy.ts`, `src/i18n/**`, `tests/e2e/routing-smoke.spec.ts`
- landing grid / GNB / theme: `docs/req-landing.md` §6–11, `src/features/landing/grid/**`, `src/features/landing/gnb/**`, `public/theme-bootstrap.js`
- transition / telemetry / consent: `docs/req-landing.md` §8, §12, §13, `src/features/landing/transition/**`, `src/features/landing/telemetry/**`, `tests/e2e/transition-telemetry-smoke.spec.ts`, `tests/e2e/consent-smoke.spec.ts`
- test flow / domain: `docs/req-test.md`, `docs/req-test-plan.md`, `src/features/test/**`, `src/features/test/domain/**`, `tests/unit/test-domain-*.test.ts`
- variant registry / fixture boundary: `docs/req-landing.md` §12, `docs/req-test.md` §2, `docs/project-analysis.md` §5.3, `src/features/variant-registry/**`, `scripts/sync/**`, `tests/unit/landing-data-contract.test.ts`, `scripts/qa/check-variant-registry-contracts.mjs`

---

## 2. Active Runtime Surface and Ownership

- Active route surface: `/{locale}`, `/{locale}/blog`, `/{locale}/blog/{variant}`, `/{locale}/history`, `/{locale}/test/{variant}`, `/{locale}/test/error`, `/api/telemetry`
- 404 surface: `src/app/not-found.tsx`, `src/app/global-not-found.tsx`
- Supported locales: `en`, `kr`, `zs`, `zt`, `ja`, `es`, `fr`, `pt`, `de`, `hi`, `id`, `ru`
- Platform flags:
  - `src/app/[locale]/layout.tsx`: `dynamicParams = false`
  - `next.config.ts`: `typedRoutes = true`, `experimental.globalNotFound = true`
  - Locale normalization: `ko* -> kr`, Simplified Chinese -> `zs`, Traditional Chinese -> `zt`
- Ownership:
  - `src/app/[locale]/**`: thin route / server entry
  - `src/features/landing/**`: grid, GNB, transition, telemetry, shell, blog destination
  - `src/features/test/**`: canonical test surface
  - `src/features/test/domain/**`: pure domain module — `index.ts` is the only public surface
  - `src/features/test/schema-registry.ts`: owns the variant → ScoringLogicType → ScoringSchema mapping
  - `src/features/test/response-projection.ts`: reserved for future A/B response → domain token projection layer (currently unimplemented placeholder)
  - `src/features/variant-registry/**`: fixture source, builder, resolver, generated runtime registry
  - `scripts/sync/**`: Sheets loading (`sheets-loader.ts`), sync orchestration (`sync.ts`), dry-run verification (`sync-dry-run.ts`), and registry serialization (`registry-serializer.ts`). Contract: `docs/req-test.md §2`.
  - `src/i18n/**`: locale resolution, request policy, SSR `html lang` sync
  - `src/lib/routes/**`: locale-free typed route authoring
  - `src/i18n/localized-path.ts`: locale prefix application
  - `src/messages/*.json`: shared UI copy — namespaces are `gnb`, `landing`, `test`, `blog`, `history`, `consent`
  - `public/theme-bootstrap.js`: pre-hydration theme bootstrap
  - `scripts/qa/*.mjs`: machine-enforced contract checks
  - `docs/blocker-traceability.json`: blocker evidence registry — current blockers `1..30`
  - `tests/e2e/helpers/landing-fixture.ts`: representative route anchor SSOT

---

## 3. Modify Freely / Modify with Caution / Do Not Modify

### Modify Freely
- `src/features/**`
- `src/i18n/**`
- `src/lib/routes/**`
- `src/messages/**`
- `tests/**`
- `docs/**`
- `public/**` — provided the bootstrap contract is not broken

### Modify with Caution
- `src/proxy.ts`
- `src/app/layout.tsx`
- `src/app/[locale]/layout.tsx`
- `public/theme-bootstrap.js`
- `src/lib/routes/route-builder.ts`
- `src/i18n/localized-path.ts`
- `src/features/variant-registry/source-fixture.ts`
- `src/features/variant-registry/builder.ts`
- `src/features/variant-registry/resolvers.ts`
- `src/features/variant-registry/types.ts`
- `src/features/variant-registry/variant-registry.generated.ts`
- `scripts/qa/*.mjs`
- `tests/e2e/theme-matrix-manifest.json`
- `docs/blocker-traceability.json`

Why caution is required:
- These files are directly tied to locale entry, SSR `html lang`, route authoring, runtime registry export, screenshot closure, and blocker evidence contracts.
- `variant-registry.generated.ts` is not a hand-written source of truth. Even when a direct edit seems necessary, check `source-fixture.ts`, `builder.ts`, and `resolvers.ts` first.
- `scripts/qa/*.mjs` runs machine-enforced contract checks — modifying them changes the interpretation of the QA gate itself.

### Do Not Modify / Build Artifacts
- Do not reintroduce `src/middleware.ts`. The single request entry point is `src/proxy.ts`.
- `.next/`, `node_modules/`, `coverage/`, `test-results/`, `playwright-report/`, `dist/`, `out/`, `output/`, `tsconfig.tsbuildinfo`
- Never edit build artifacts directly. All changes must go through the relevant source or builder.

---

## 4. Local Execution Commands

Use the commands below when the Superpowers `verification-before-completion` skill requires proof of completion.

### Basic Gates
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

### Reference Commands
- `npm run sync`
- `npm run sync:dry`
- `npm run qa:rules`
- `npm run qa:static`
- `npm run qa:gate:once`
- `npm run qa:gate`
- `npm run test:e2e`
- `npm run test:e2e:smoke`

### Additional Checks by Change Type
- routing / locale / not-found: `node scripts/qa/check-phase1-contracts.mjs`, `npm test -- tests/unit/route-builder.test.ts tests/unit/localized-path.test.ts tests/unit/locale-resolution.test.ts tests/unit/proxy-policy.test.ts tests/unit/request-locale-header.test.ts tests/unit/locale-config.test.ts`, `npx playwright test tests/e2e/routing-smoke.spec.ts`
- variant registry / fixture boundary: `node scripts/qa/check-variant-registry-contracts.mjs`, `node scripts/qa/check-variant-only-contracts.mjs`, `npm test -- tests/unit/landing-data-contract.test.ts tests/unit/landing-card-contract.test.ts`
- telemetry / consent / transition: `node scripts/qa/check-phase11-telemetry-contracts.mjs`, `npm test -- tests/unit/landing-telemetry-validation.test.ts tests/unit/landing-telemetry-runtime.test.ts tests/unit/landing-transition-store.test.ts`, `npx playwright test tests/e2e/consent-smoke.spec.ts tests/e2e/transition-telemetry-smoke.spec.ts`
- landing grid / state / GNB / theme: `node scripts/qa/check-phase4-grid-contracts.mjs`, `node scripts/qa/check-phase5-card-contracts.mjs`, `node scripts/qa/check-phase6-spacing-contracts.mjs`, `node scripts/qa/check-phase7-state-contracts.mjs`, `node scripts/qa/check-phase8-accessibility-contracts.mjs`, `node scripts/qa/check-phase9-performance-contracts.mjs`, `node scripts/qa/check-phase10-transition-contracts.mjs`, `npm test -- tests/unit/landing-interaction-dom.test.ts tests/unit/landing-hover-intent.test.ts tests/unit/landing-mobile-lifecycle.test.ts tests/unit/landing-desktop-shell-phase.test.ts tests/unit/landing-grid-plan.test.ts`, `npx playwright test tests/e2e/grid-smoke.spec.ts tests/e2e/state-smoke.spec.ts tests/e2e/gnb-smoke.spec.ts tests/e2e/a11y-smoke.spec.ts`
- test flow / domain: `npm test -- tests/unit/test-domain-variant-validation.test.ts tests/unit/test-domain-question-model.test.ts tests/unit/test-domain-derivation.test.ts tests/unit/test-domain-type-segment.test.ts tests/unit/test-entry-policy.test.ts tests/unit/test-question-bootstrap.test.ts`, `npx playwright test tests/e2e/consent-smoke.spec.ts`

### Notes on `qa:rules` Exclusion
- As of 2026-04-16, the Phase 11 visual smoke baseline has been committed as a local QA asset.
- Playwright screenshot baselines are stored as local PNGs under `tests/e2e/*-snapshots/`. Git tracked completeness is not required.
- The visual smoke helper auto-creates missing baseline files and falls back to Playwright comparison when a baseline already exists.
- As of 2026-04-25, `npm run qa:rules` passes Phase 11, variant registry, variant-only, and blocker traceability checks.
- `npm run qa:gate` is a heavy pipeline for release validation and flake detection.

---

## 5. Gold Standards

Do not reference external code patterns from the internet. Replicate the following files exactly:

- Thin route reference: `src/app/[locale]/page.tsx`
- Locale-free route authoring reference: `src/lib/routes/route-builder.ts`
- Locale prefix application reference: `src/i18n/localized-path.ts`
- Resolver boundary reference: `src/features/variant-registry/resolvers.ts`
- Builder reference: `src/features/variant-registry/builder.ts`
- Source/runtime type separation reference: `src/features/variant-registry/types.ts`
- Pure domain public surface reference: `src/features/test/domain/index.ts`
- Pure validator reference: `src/features/test/domain/validate-variant.ts`
- Instruction entry policy reference: `src/features/test/entry-policy.ts`
- Telemetry payload hygiene reference: `src/features/landing/telemetry/validation.ts`
- Transition storage/runtime reference: `src/features/landing/transition/runtime.ts`
- Representative e2e anchor reference: `tests/e2e/helpers/landing-fixture.ts`

---

## 6. Project-Specific Rules

### Architecture / Routing / Locale
- All page files must live under `src/app/[locale]/**`.
- Do not construct path strings manually. Use `RouteBuilder` for route authoring in application code and `buildLocalizedPath()` to apply locale prefixes.
- `src/proxy.ts` is the single request entry point. Do not create alternative entry points or reintroduce `src/middleware.ts` to bypass locale prefix rules.
- `src/app/layout.tsx` is responsible for the top-level document shell only. Locale-specific branching belongs in `src/app/[locale]/layout.tsx` and the route layer.
- Duplicate locale prefixes are handled via `/_not-found` rewrite. Locale-less app paths must redirect to their localized equivalents.

### Variant Registry / Fixture Boundary
- Landing, test, and blog consumers must not read raw fixture shapes directly.
- Direct imports of `raw-fixtures`, `source-fixture`, or `variant-registry.generated` outside the registry layer are prohibited.
- Preview payload access is permitted only through the `resolveTestPreviewPayload()` boundary.
- `variant-registry.generated.ts` is a runtime export. Do not mix source fixture authoring shapes with runtime shapes.
- Source row processing must follow the `seq -> sort -> drop` pipeline.
- Partial activation is prohibited. Do not apply partial updates when cross-source data is inconsistent.
- Unified runtime meta keys are `durationM`, `sharedC`, and `engagedC`.
- The `{audience: 'qa'}` resolver boundary exposes `hide` and `debug` fixtures only within the QA catalog.
- The preview source is the first scoring question `scoring1` from Questions.
  - Do not add inline preview fields to source fixtures.
  - The consumer shape (`previewQuestion`, `answerChoiceA`, `answerChoiceB`) must be preserved.
  - Confine source replacement to the internals of the builder and resolver.

### Test Flow / Domain / Storage
- The canonical test surface is `src/features/test/**`.
- Do not reintroduce `src/features/landing/test/*`.
- Treat only `src/features/test/domain/index.ts` as the public surface.
- Contracts frozen by Phase 0–1 ADRs (`docs/req-test-plan.md`) must not be changed without a new ADR:
  - `VariantId = string & { readonly __brand: 'VariantId' }`
  - `QuestionIndex = number & { readonly __brand: 'QuestionIndex' }`
  - The `MISSING | UNKNOWN | UNAVAILABLE` union shape of `validateVariant()`
  - The `BlockingDataErrorReason` surface
- Instruction body copy is owned by fixtures. CTA labels and consent notes are owned by locale messages.
- The live anchors for question bank access are `buildVariantQuestionBank()` and `resolveVariantPreviewQ1()`. The legacy inline-bridge helper is exported only as a deprecated compatibility path.
- The test route does not render route-local consent banners, confirm dialogs, or blocked popups.
- Do not confuse current runtime keys with Phase 3 future keys documented in specs:
  - Key SSOT: [To be confirmed — no key declaration SSOT file currently exists]
  - Current localStorage: `vivetest-theme`, `vivetest-current-path`, `vivetest-previous-path`, `vivetest-telemetry-consent`, `vivetest-telemetry-session-id`
- Current sessionStorage: `vivetest-landing-pending-transition`, `vivetest-landing-return-scroll-y`, `vivetest-landing-return-variant`, `vivetest-test-instruction-seen:{variant}`, `vivetest-landing-ingress:{variant}`
  - Documented future keys: `test:{variant}:...`, `test:{variant}:flag:{flagName}`
- `instructionSeen` remains a variant-scoped `sessionStorage` key.
- Do not introduce unauthorized storage keys.

### Blog / Telemetry / Theme / QA Surface
- `/{locale}/blog` is a list-only route.
- Blog detail routes for invalid or non-enterable variants must redirect to the localized blog index with no fallback to another article.
- The telemetry API requires an object payload with `event_type`. It returns `400` on shared telemetry transport validation failure and `204` on success. There is no persistence layer.
- Telemetry and Vercel analytics must share a single consent source.
- The Preferences button in the consent banner is currently a visible no-op. Do not add behavior to it before requirements change.
- Representative anchor SSOT: available test `qmbti`, opt-out test `energy-check`, primary blog `ops-handbook`
- Theme-matrix QA uses only the representative `en` and `kr` matrix rows — not all locales.
- The combined theme label wording family uses the `Language ⋅ Theme` format.
- `public/theme-bootstrap.js` reads `vivetest-theme` before hydration.
- The `motion` package is installed but not imported anywhere in `src` or `tests`. Any adoption must align with `docs/req-landing.md` §8.3 Core Motion Contract. [Temporary note: as of 2026-04-15]
- Tailwind v4 is active. Runtime styling ownership is split between `src/app/globals.css` (tokens/base) and feature-local style sources. `src/app/globals.css` covers 112 lines of token/base surface; landing grid/card motion, focus, and reduced-motion are owned by `src/features/landing/grid/landing-grid-card.module.css`. [Updated: 2026-04-21]
- Tech stack: `next@16.2.4`, `react@19.2.4`, `next-intl@4.9.1`, `motion@12.34.0` (unused)

### High-Risk Areas

The files and subsystems below directly affect usability, accessibility, responsiveness, performance, and design system consistency.
Any Superpowers plan that touches these paths must explicitly identify which of those dimensions is at risk and must include subagent-level QA regression coverage.

- `src/features/landing/grid/use-landing-interaction-controller.ts` — 486-line orchestrator. Owns two `useReducer` instances, capability/reduced-motion/visibility sync, card binding composition, and transition start callbacks. DOM/focus helpers, hover intent, desktop motion, mobile lifecycle, keyboard handoff, and grid geometry/RAF have been extracted into dedicated hooks/modules in the same directory. [Updated: 2026-04-25]
- `src/features/landing/grid/use-mobile-card-lifecycle.ts` — 543 lines. Owns mobile card lifecycle. Sensitive to landing grid timing contracts. [Updated: 2026-04-25]
- `src/features/landing/grid/use-keyboard-handoff.ts` — 367 lines. Owns keyboard navigation handoff. [Updated: 2026-04-25]
- `src/features/landing/gnb/site-gnb.tsx` — Owns keyboard navigation order, focus return, theme switching, and locale switching.
- `src/features/landing/shell/page-shell.tsx` — Shared runtime controller for all locale routes. Mounts GNB, TransitionGnbOverlay, and TelemetryConsentBanner.
- `public/theme-bootstrap.js` — Pre-hydration theme bootstrap. Changes carry a high risk of theme flash regression.
- `src/features/landing/telemetry/consent-source.ts` — Single consent gate source. Shared entry point for Vercel analytics and telemetry.
- `src/features/landing/transition/` — Transition handshake and sessionStorage contract. Sensitive to timeout, cancellation, and scroll-restore semantics.

### Code Comment Rules
- Korean-language comments are optional.
- Appropriate uses: non-obvious contracts, timing constraints, reasons for exception handling, browser or state race conditions.
- Do not write comments that describe self-evident code, duplicate logic in prose, or annotate excessively.

### Unimplemented / Stub Areas
The following areas are currently unimplemented or exist only as minimal stubs. Do not treat them as completed contracts.
- Live score derivation wiring and result URL/payload rendering
- Runtime A/B response → domain token projection (`src/features/test/response-projection.ts` is a reserved placeholder)
- Question-level telemetry hooks
- History persistence
- Results Sheets loading (the sync script currently calls `validateCrossSheetIntegrity` in 2-source mode until this source is ready)
- Backend ingestion guarantees and branch-protected production push policy

---

## 7. Superpowers Integration Notes

This section contains project-specific information that Superpowers skills must reference to operate correctly in this repository.

### Required Fields for Plan Documents (writing-plans Checklist)
Any plan document produced by `writing-plans` must include the following:

- Paths of all files to be modified
- Relevant SSOT contract document (per the Task Entry Map in §1)
- Whether shared components are affected (shell, GNB)
- Whether localization is affected (`src/messages`, `src/i18n`)
- Whether accessibility is affected (a11y-smoke scope)
- Whether state contracts are affected (transition / telemetry / consent)
- Whether the core user flow is affected (landing → test entry, consent flow)
- Validation commands to run (per §4)

Any plan missing these fields must be revised before approval.

### Required Context Bridge Rules for Subagents
When spawning a subagent, always inject the following constraints:
- Do not reintroduce `src/middleware.ts` — `src/proxy.ts` is the single entry point
- Do not directly edit `variant-registry.generated.ts`
- List of approved storage keys (see §6 storage rules)
- Any forbidden paths from §3 that are directly relevant to the task

---

## 8. Local Definition of Done

- Default Done gate sequence: follow the basic gates in §4.
- `qa:rules` is excluded from the default Done gate. It is a release-level reference pipeline.
- `qa:gate:once` and `qa:gate` are heavier than the default Done gate. Run them only immediately before a release or when investigating flakiness.
- Scope-specific additional checks:
  - `proxy` / `i18n` / `route-builder` / `localized-path`: routing/locale unit tests + `tests/e2e/routing-smoke.spec.ts`
  - `landing grid` / `GNB` / `theme bootstrap` / `shared shell`: relevant phase QA scripts + `grid-smoke`, `state-smoke`, `gnb-smoke`, and `a11y-smoke` if applicable
  - `transition` / `telemetry` / `consent`: `check-phase10-transition-contracts.mjs`, `check-phase11-telemetry-contracts.mjs`, `tests/e2e/consent-smoke.spec.ts`, `tests/e2e/transition-telemetry-smoke.spec.ts`
  - `test flow` / `entry-policy` / `question-bank` / `domain`: `tests/unit/test-domain-*.test.ts`, `tests/unit/test-entry-policy.test.ts`, `tests/unit/test-question-bootstrap.test.ts`, `tests/unit/variant-question-bank.test.ts`, `tests/unit/test-lazy-validation.test.ts`, `tests/unit/schema-registry.test.ts`, and `tests/e2e/consent-smoke.spec.ts` if applicable
  - `variant-registry` / `data model`: `check-variant-registry-contracts.mjs`, `check-variant-only-contracts.mjs`, `tests/unit/landing-data-contract.test.ts`, `tests/unit/registry-serializer.test.ts`, `tests/unit/variant-registry-runtime-integrity.test.ts`
  - `blog detail` / `subtitle continuity`: `tests/unit/blog-server-model.test.ts`, `tests/unit/landing-card-contract.test.ts`
  - `AGENTS.md`: cross-reference file paths, commands, locale set, representative anchors, and baseline state against the actual repository.
  - If the change triggers any update condition listed in §9, update the relevant contract documents and `AGENTS.md` in the same commit.
- If the change includes a bug fix or behavior change, confirm that regression test coverage has been added or updated for the affected scenario.

---

## 9. Document Maintenance Rules

Update `AGENTS.md` whenever any of the following change:
- Script names or execution order
- List of active contract documents
- Route surface
- Locale set
- Storage keys
- Representative anchors
- `tests/e2e/theme-matrix-manifest.json` closure
- QA script list or responsibilities
- Generated / source-of-truth boundary
- Baseline availability status
- Gold standard files
- Directory ownership
- A repo-specific agent mistake that has occurred two or more times in code review or agent execution

Clarification thresholds, orchestration strategy, and Superpowers routing rules belong in Codex Custom Instructions — not in this file.
Keep only facts and commands specific to this repository.
Temporary operational states must be noted with a date.

---

## 10. Subdirectory Rule Delegation

- Create a child `AGENTS.md` when:
  - Three or more rules apply exclusively to that directory
  - That directory has its own dedicated fixture, QA loop, or gold standard
- Delegation rules:
  - Child documents must not repeat content from the parent
  - Child documents contain only deltas
  - If a conflict arises between a child document and a repo-wide fact, update the root `AGENTS.md` first — do not override from the child
