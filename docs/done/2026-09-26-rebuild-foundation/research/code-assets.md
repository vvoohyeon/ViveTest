# ViveTest code-asset inventory for a from-scratch rebuild

Snapshot: `main` @ `20f973a90f3f595833d6a3763ab907abef8e4616` (clean worktree), read 2026-09-26. Everything below was read with read-only git and file reads against `/Users/woohyeon/Local/ViveTest`; nothing in that checkout was modified. The "kernel" claims were verified by copying the candidate file sets into scratch sandboxes (`scratchpad/codeassets/kernel0|kernel1|kernel2`, primary `node_modules` read through a symlink, Vite cache redirected to scratch; I confirmed afterwards that nothing under the primary `node_modules/.vite` changed). Line counts are newline counts (`wc -l` semantics) from `scratchpad/codeassets/loc.json`; the full import graph is `scratchpad/codeassets/graph.json` (398 files: `src`, `scripts`, `tests/unit`, `tests/fixtures`, `tests/e2e`).

Disposition vocabulary used throughout: **FOUNDATION** = carry verbatim into the new `main` now, as part of the base; **LATER** = carry when that feature is rebuilt (keep it in the legacy ref until then); **REFERENCE** = reference-only in legacy, rebuild from the new contracts; **DISCARD** = do not carry.

---

## 1. Executive summary

1. **The code base is two-thirds UI.** Of 25,494 lines in 221 text files under `src/`, content + domain + client-state logic is 7,621 lines (29.9%); UI (components, hooks, UI-bound pure logic, CSS) is 16,581 lines (65.0%); Next app/infra files are 1,292 lines (5.1%). §2.
2. **A self-contained domain kernel exists and is verified.** 48 `src` files (4,851 lines: config, locale/route logic, variant registry, test domain, question banks, schema registry, result-address logic, entry policy, telemetry types/validation) import nothing outside themselves and no external package. Copied into an empty directory they pass `tsc --noEmit` with 0 errors and 170 of 178 unit tests; the 8 failures are all file reads of paths outside the kernel (messages JSON, `src/app/**` route files). Adding the browser-state tier (+34 files incl. 12 message JSONs) gives 281/285 passing; adding the platform tier (+17 files: proxy, telemetry API, consent source, analytics gates, manifest/OG/icons) gives 337/340. §3.
3. **The Google Sheets sync GitHub Action has never succeeded.** `gh run list` shows 209 runs, 209 failures, oldest 2026-04-24. Retained logs (2026-09-06 onward) all fail at `npm ci` because `package-lock.json` is out of sync for the runner's npm ("Missing: @swc/helpers@0.5.23 from lock file"; cause: `next-intl`'s nested `@swc/core` peer-requires `@swc/helpers >=0.5.17` while the hoisted copy is `next`'s pinned 0.5.15). The only "sync" commit in history (`65ccab5`) was authored locally by the owner. Even if it ran, it would push straight to `main` on every push to `main`. §6.3.
4. **Production questions do not come from Sheets.** `sync.ts` regenerates only `variant-registry.generated.ts` (landing cards + the Q1 preview). The runtime question bank (`src/features/test/question-bank.ts:2,64`) and lazy validation (`src/features/test/lazy-validation.ts:8,45`) always read the in-repo fixture. A Sheets edit to a question would change the landing preview but not the test itself. No doc states this; no test asserts generated == fixture (I verified it currently holds with a scratch probe). §4.1, §8.
5. **Content is mostly placeholder.** Only `en` and `kr` exist in catalog/question content (UI chrome messages are complete in all 12 locales). 3 of 7 test variants are QA-stress rows (`rhythm-b` long strings, `debug-sample`, `burnout-risk`), the 3 blog "articles" are DevOps placeholder copy whose body is just the subtitle, results content does not exist at all (results fixture carries only `variantId`), and EN answer copy for `qmbti` Q1 is unrelated to its question. The prototype itself copied only `qmbti`, `energy-check`, `egtt`, `creativity-profile` (coming soon) and the 3 blog cards. §4.
6. **The prototype's confirmed direction breaks the kernel's binary assumption.** The domain, telemetry, storage, Sheets normalizer and preview payload all hard-code two answers (`'A' | 'B'`, `answerA/answerB`, `poleA/poleB`); 34 `src` files carry the literal (plus `telemetry/validation.ts`, which checks `'A'`/`'B'` without it). The prototype's final revision already renders 2/3/4-answer questions and the owner asked for it: "나중에 3지선다, 4지선다 응답형 테스트도 있을 수 있습니다." §7.
7. **Recommended foundation copy set** (one `git checkout 20f973a -- …` command in §10): K0 kernel + `scripts/sync` + 28 of the K0 tests + `lib/safe-storage.ts` + the message JSONs + platform files that carry no visual decision (`proxy.ts`, `/api/telemetry`, `i18n/request.ts`, `consent-source.ts`, analytics gates, `locale-html-lang-sync.tsx`). Extracted alone into an empty directory this exact list typechecks with 0 errors and passes 201 of 203 tests; the 2 reds are the route-parity guards that are meant to stay red until the new route map is declared. Everything visual (grid, GNB, sheets, CSS, thumbnails, brand colours, tokens) is REFERENCE, to be rebuilt from the revised design system. §9, §10.

---

## 2. Measurements — UI vs domain

### 2.1 `src/` by category (221 text files; `favicon.ico` and `icon.svg` excluded)

| Category | Files | Lines | Share |
|:---|---:|---:|---:|
| A. Content / data (question + results fixtures, `source-fixture.ts`, `variant-registry.generated.ts`, 12 message JSONs) | 25 | 2,370 | 9.3% |
| B. Domain + pure logic, kernel tier K0 (§3) | 35 | 3,765 | 14.8% |
| C. Client-state logic without React, tier K1 (storage, reducer, bootstrap, transition store) | 22 | 1,486 | 5.8% |
| D. UI-bound pure logic (layout/spacing plans, landing interaction state machine, class-name tables, sheet phases, GNB behaviour) | 30 | 2,183 | 8.6% |
| E. React hooks / client runtime `.ts` (landing controllers, GNB hooks, test-run hooks, telemetry/consent runtime) | 43 | 6,574 | 25.8% |
| F. UI components `.tsx` | 33 | 5,743 | 22.5% |
| G. `src/app/**`, `src/proxy.ts`, `i18n/request.ts`, `i18n/routing.ts` | 26 | 1,292 | 5.1% |
| H. CSS (`globals.css` 516, `fonts.generated.css` 848, 5 modules) | 7 | 2,081 | 8.2% |
| **Total** | **221** | **25,494** | |

Domain side (A+B+C) = 7,621 lines (29.9%). UI side (D+E+F+H) = 16,581 (65.0%). Of E and G, 1,085 lines are UI-free platform code (tier K2, §3.4), so the full carry-able kernel K0+K1+K2 is 8,706 lines (34.1%) and everything else 16,788 lines (65.9%). The largest single feature is `src/features/landing` (49 files, 8,100 lines), then `src/features/test` (63 files, 5,827 lines; 1,630 of them are the domain+fixtures+storage).

### 2.2 Tests and tooling

| Asset | Size |
|:---|:---|
| `tests/unit` | 124 test files + `helpers/repo.ts` + `__mocks__/router.ts`, 20,725 lines |
| — kernel tests (K0) | 29 files, 4,107 lines |
| — kernel tests (K0+K1) | 45 files, 6,242 lines |
| — platform tests (K2) | 11 files |
| — legacy UI/hook tests (import UI `src`) | 46 files |
| — repo/doc/design guards (read files, import no `src`) | 22 files |
| `tests/e2e` | 12,525 lines of `.ts` specs, 189 PNG baselines (14 MB), `README.md`, `snapshot-environment.json`, `theme-matrix-manifest.json`, `theme-matrix-baseline-provenance.md` |
| `tests/fixtures` | 3 JSON fingerprints (13,364 B), consumed only by the three landing fingerprint tests |
| `scripts/qa` | 17 `.mjs`, 2,753 lines (13 checks + runner + 3 helpers) |
| `scripts/sync` | 4 `.ts`, 509 lines |

---

## 3. The domain kernel — exact file set, verification, breaking imports

### 3.1 Tiers

- **K0 — pure kernel** (48 files, 4,851 lines, zero external imports, no `window`/`document`/storage, no React, no Next). Its transitive closure equals the root set: nothing outside it is pulled in.
- **K1 — browser-state logic** (+34 files: 22 `.ts` = 1,486 lines, plus `i18n/messages.ts` and the 12 message JSONs). Uses `lib/safe-storage.ts` (guarded `localStorage`/`sessionStorage`) and `CustomEvent`, but no React and no Next. Closure of K0+K1 is again exactly the root set.
- **K2 — platform runtime** (+17 files, 1,085 lines): files that need `react`, `next`, `next-intl` or `@vercel/*` but contain no visual layout: consent source/recall, telemetry runtime, transition runtime, analytics gates, theme bootstrap, proxy, telemetry API route, `i18n/request.ts`, `locale-html-lang-sync.tsx`, brand assets/manifest/OG/apple icon. Closure of K0+K1+K2 pulls in no UI file.

### 3.2 K0 file list (48)

`src/config/site.ts` · `src/i18n/{locale-resolution,localized-path,proxy-policy,request-locale-header}.ts` · `src/lib/correlation-id.ts` · `src/lib/routes/route-builder.ts` · `src/features/telemetry/{types,validation}.ts` · `src/features/test/canonical-key.ts` · `src/features/test/domain/{derivation,index,result-payload,type-segment,types,validate-question-model,validate-variant-data-integrity,validate-variant}.ts` · `src/features/test/{entry-policy,lazy-validation,question-bank,question-source-parser,response-projection,result-view-model,schema-registry}.ts` · `src/features/test/fixtures/questions/{burnout-risk,creativity-profile,debug-sample,egtt,energy-check,index,qmbti,rhythm-b,types}.ts` · `src/features/test/fixtures/results/{index,types}.ts` · `src/features/variant-registry/{attribute,builder,cross-sheet-integrity,fixture-contract,index,localization,registry-serializer,resolvers,sheets-row-normalizer,source-fixture,types,variant-registry.generated}.ts`

K0 by module: locale/i18n 5 files 503 lines · lib 2/152 · telemetry 2/320 · test domain 8/755 · test non-domain logic 8/875 · variant registry 10/1,160 · content 13/1,086.

K0 unit tests (29): `cross-sheet-integrity` · `landing-telemetry-validation` · `locale-alias-parity` · `locale-config` · `locale-manifest` · `locale-resolution` · `localized-path` · `message-key-parity` · `proxy-policy` · `question-source-parser` · `reachable-question-copy` · `registry-serializer` · `request-locale-header` · `route-builder` · `schema-registry` · `sheets-loader` · `sheets-row-normalizer` · `sync-orchestration` · `test-domain-derivation` · `test-domain-question-model` · `test-domain-result-payload` · `test-domain-type-segment` · `test-domain-variant-validation` · `test-entry-policy` · `test-lazy-validation` · `test-result-address` · `test-result-view-model` · `variant-question-bank` · `variant-registry-runtime-integrity` (all `tests/unit/<name>.test.ts`), plus `tests/unit/helpers/repo.ts`. `sheets-loader` and `sync-orchestration` import `scripts/sync/{sheets-loader,sync}.ts` (which need `googleapis`, `dotenv`), so the four `scripts/sync` files travel with K0 or those two tests are dropped.

### 3.3 K1 additions (34)

`src/lib/safe-storage.ts` · `src/features/landing/storage/storage-keys.ts` · `src/features/test/storage/{active-run,index,instruction-seen,response-set,run-history,state-flags,storage-keys,test-storage-keys,volatility}.ts` · `src/features/test/{answer-choice-state,bootstrap-state-resolver,qualifier-overlay-model,qualifier-resume-validator,question-runtime-utils,recovery-cards,test-run-reducer}.ts` · `src/features/transition/{constants,signals,store}.ts` · `src/i18n/messages.ts` · `src/messages/{de,en,es,fr,hi,id,ja,kr,pt,ru,zs,zt}.json`. Additional tests (16): `answer-choice-state` · `gnb-message-labels` · `landing-consent-notice` · `landing-message-labels` · `landing-transition-store` · `qualifier-overlay-model` · `qualifier-resume-validator` · `test-question-bootstrap` · `test-question-runtime-utils` · `test-recovery-cards` · `test-run-history` · `test-run-reducer` · `test-storage-{active-run,response-set,state-flags,volatility}`.

### 3.4 K2 additions (17)

`src/features/telemetry/{consent-source,consent-recall,runtime}.ts` · `src/features/transition/runtime.ts` · `src/app/{vercel-analytics-gate,vercel-speed-insights-gate}.tsx` · `src/features/gnb/theme-bootstrap-source.ts` · `src/app/theme-ground-color.ts` · `src/app/api/telemetry/route.ts` · `src/proxy.ts` · `src/i18n/request.ts` · `src/i18n/locale-html-lang-sync.tsx` · `src/app/brand-assets.ts` · `src/app/manifest.ts` · `src/app/[locale]/manifest.webmanifest/route.ts` · `src/app/apple-icon.tsx` · `src/app/[locale]/opengraph-image.tsx` (+ `src/app/icon.svg` read by a test). Additional tests (11): `brand-assets-parity` · `consent-recall` · `landing-telemetry-runtime` · `landing-transition-runtime` · `locale-html-lang-sync` · `telemetry-question-answered` · `telemetry-route` · `theme-bootstrap-behavior` · `theme-color-parity` · `vercel-analytics-gate` · `vercel-speed-insights-gate`.

### 3.5 Verification results (sandboxes, 2026-09-26)

| Sandbox | Files | `tsc --noEmit` | vitest |
|:---|:---|:---|:---|
| `kernel0` = K0 + `scripts/sync` + 29 tests + helper | 82 | exit 0, 0 lines | 25/29 files, 170/178 tests pass (1.7 s) |
| `kernel1` = K0+K1 + `scripts/sync` + 45 tests | 132 | exit 0, 0 lines | 42/45 files, 281/285 tests pass |
| `kernel2` = K0+K1+K2 + 56 tests | 132 + 29 | exit 0, 0 lines (incl. `.tsx`) | 51/56 files, 337/340 tests pass |

Sandbox `tsconfig.json`: the repo's options minus the `next` plugin and `.next/types` includes, `incremental: false`, `types: ["node"]`. Sandbox `vitest.config.ts`: the repo's alias + include, plus a scratch `cacheDir`.

### 3.6 What breaks when the kernel is copied into an empty repo

No `import` breaks — the closure is complete. What breaks are **test-time file reads** of paths outside the kernel:

| Test | Reads | Fix in the new repo |
|:---|:---|:---|
| `tests/unit/message-key-parity.test.ts:26` | `src/messages/*.json` via `process.cwd()` | carry messages (K1) or drop until messages exist |
| `tests/unit/locale-manifest.test.ts` | `src/app/[locale]/manifest.webmanifest/route.ts` (exists check), `src/app/[locale]/layout.tsx` (manifest link) | passes once the manifest route and a locale layout exist |
| `tests/unit/route-builder.test.ts:21,37,84` | walks `src/app/[locale]/**` and asserts the `LocaleFreeRoute` union equals the app route set, both directions | keep — it is the guard that will force `route-builder.ts` to match the new route map; it goes green when the routes land |
| `tests/unit/variant-registry-runtime-integrity.test.ts:126` | `src/app/[locale]/test/[variant]/page.tsx` must import the entry guard | one assertion; re-point to wherever the new test route lives |
| `tests/unit/brand-assets-parity.test.ts`, `tests/unit/theme-color-parity.test.ts` | `src/app/globals.css` | they bind literals to legacy tokens; rewrite against the revised token file |

Other copy-time notes: `tests/unit/registry-serializer.test.ts` type-checks generated source with the `typescript` package (devDependency). `scripts/sync/sync.ts:21` and `sync-dry-run.ts` call `dotenv.config({path: '.env.local'})` at import — harmless when absent. Package needs for K0 tests: `vitest`, `typescript`, `@types/node`; for the `scripts/sync` tests also `googleapis`, `dotenv`; K1 adds `jsdom` (per-file `// @vitest-environment jsdom`, 27 files in the repo use it) and `next-intl`; K2 adds `react`, `react-dom`, `next`, `@testing-library/react`, `@vercel/analytics`, `@vercel/speed-insights`.

### 3.7 Structural debt inside the kernel (fix while copying)

- **Feature-level cycles** (graph): `variant-registry → test` (builder imports `test/question-source-parser`; resolvers import `test/fixtures/questions` and `test/fixtures/results`) while `test → variant-registry` (fixtures' `types.ts` imports `LocalizedText`; `question-bank`, `entry-policy` import registry types). `telemetry/validation.ts → test/canonical-key.ts` while `test → telemetry`. `variant-registry/attribute.ts → telemetry/types.ts` (for `TelemetryConsentState`). `telemetry/consent-source.ts` and `transition/store.ts → landing/storage/storage-keys.ts`. None is a file-level cycle (the only file-level cycle in `src` is inside the landing grid UI), but they make "copy one feature" impossible. Suggested new layout: `content/` (catalog + question banks + results) · `domain/` (scoring, validators, result address, entry policy, consent-state type, canonical key) · `registry/` (builder, resolvers, localization) · `platform/` (storage keys, safe storage, telemetry, locale/routing).
- **Three different `resolveLocalizedText` implementations**: `variant-registry/localization.ts:34` (locale → default locale → `default` → first non-empty, rejects blanks), `test/question-source-parser.ts:34` and `test/question-bank.ts:43` (locale → `en` → first, `??` so an empty string wins). Same content can resolve differently on landing vs test.
- **Dead code**: `question-source-parser.ts:63` resolves texts and discards them (`locale` parameter is unused); `question-bank.ts` `resolveVariantPreviewPayload` has no caller; `resolvers.ts` `resolveRuntimeTestEntryCardByVariant`, `resolveRuntimeBlogCardByVariant` and `attribute.ts` `isDebugOnlyCard` are only re-exported; `fixture-contract.ts` is test-only; `src/features/test/storage/storage-keys.ts` is a one-line re-export nobody imports.
- **Stale comments**: `registry-serializer.ts:7` cites `scripts/sync/sync-variant-registry.mjs (예정)` (never existed); `landing/storage/storage-keys.ts:5,17` cite `public/theme-bootstrap.js` (removed; now `theme-bootstrap-source.ts`); `app/[locale]/opengraph-image.tsx:10` cites `public/fonts/PretendardVariable.woff2` (replaced by subsets).
- **Environment-split registry**: `resolvers.ts:68` picks `variantRegistryGenerated` when `NODE_ENV === 'production'` and the fixture build otherwise; the production path skips the cross-sheet fallback (`blockedRuntimeVariants: new Set()`, `resolvers.ts:81`). Unit tests, `next dev` E2E and `next start` preview therefore read different sources. Parity currently holds (scratch probe `buildVariantRegistry(fixture, questions)` deep-equals `variantRegistryGenerated`) but only prose claims it (`docs/project-analysis.md` "fixture sources mirror that generated artifact"); `registry-serializer.test.ts:149` checks round-trip, not parity.

---

## 4. Content and data

### 4.1 Variant registry (`src/features/variant-registry/`, 12 files, 1,828 lines)

| File | Lines | Imports | Unit tests | UI coupling | Notes | Disposition |
|:---|---:|:---|:---|:---|:---|:---|
| `types.ts` | 149 | `config/site` | `registry-serializer`, `sync-orchestration`; indirect everywhere | none | Clean source/runtime split (`VariantRegistrySource*` vs `VariantRegistryRuntime*` vs locale-resolved `Landing*Card`). Gold standard per `AGENTS.md` §6. Binary: `answerChoiceA/B` in the preview payload. Needs new fields for the prototype: per-test stage (I/J/D), representative colour/category, N-choice preview. | FOUNDATION, then extend |
| `attribute.ts` | 69 | `telemetry/types`, `types` | indirect (`landing-data-contract`, `variant-registry-runtime-integrity`) | none | `available/unavailable/hide/opt_out/debug` × consent × audience visibility rules. `isDebugOnlyCard` unused. | FOUNDATION |
| `builder.ts` | 285 | `test/question-source-parser`, `attribute`, `types` | indirect (runtime-integrity, reachable-question-copy, sync tests) | none | Strict normaliser: allowed-key whitelist, required keys, `^[a-z0-9-]+$` variant ids, unique `variant`/`seq`, seq-sorted output, preview from first scoring row. Positional 2-arg signature. | FOUNDATION |
| `resolvers.ts` | 243 | 11 internal (fixtures, generated, builder, …) | `variant-registry-runtime-integrity` | none | Single consumer boundary (`AGENTS.md` §6 gold standard). Env split and module-level caches (§3.7). Two dead exports. Imports test fixtures directly — the source of the feature cycle. | FOUNDATION (refactor source selection) |
| `localization.ts` | 99 | `config/site`, `types` | indirect | none | Best of the three locale-fallback functions; make it the only one. | FOUNDATION |
| `cross-sheet-integrity.ts` | 96 | `types` | `cross-sheet-integrity` (9 cases) | none | Landing↔Questions↔Results set comparison + runtime fallback (landing-only → `hide`, others → blocked). | FOUNDATION |
| `registry-serializer.ts` | 36 | `types` | `registry-serializer` (5) | none | Deterministic key-sorted JSON → TS object literal; stale header path. | FOUNDATION |
| `sheets-row-normalizer.ts` | 77 | `test/fixtures/questions/types` | `sheets-row-normalizer`, `sync-orchestration` | none | Parses `question_EN`/`answerA_KR` columns (uppercase 2-letter suffix → locale). Binary (`answerA/answerB`). | FOUNDATION with `scripts/sync`, or LATER with it |
| `fixture-contract.ts` | 44 | `types`, `localization` | test-only consumer (`landing-data-contract`) | none | Report of fixture edge cases (long token, empty tags) — exists to stress legacy card layout. | DISCARD |
| `index.ts` | 62 | barrel | 12 tests import it | none | Re-exports everything incl. fixtures and generated data; importing the barrel for a type drags the registry. | FOUNDATION (slim) |
| `source-fixture.ts` | 248 | `types` | indirect | none | 10 cards (7 test, 3 blog), `en`+`kr` only. See §4.2 for content quality. | LATER as content: carry the 4 real rows, move QA-stress rows to test fixtures |
| `variant-registry.generated.ts` | 420 | `./types` (relative) | round-trip only | none | Fixture-built bridge, byte-equal to builder output today. | Regenerate in the new repo (never copy by hand) |

### 4.2 Catalog content (`source-fixture.ts`) and question banks (`src/features/test/fixtures/**`, 11 files, 418 lines)

| Variant | Type / attribute | Questions | Status of copy | Prototype uses it? |
|:---|:---|:---|:---|:---|
| `qmbti` (seq 10) | test / available | 8 scoring (E/I×3, S/N×1, T/F×1, J/P×3), `mbti` schema | KR real; EN Q1 answers "Early morning blocks"/"Late-night sprints" (`qmbti.ts:9`) do not answer "At parties…"; subtitle "deep-work cadence" and tags "Rapid ipsum Lorem" are placeholders; Q6 `poleA: 'I'` (`qmbti.ts:62`) on the "learn by talking with friends" answer — the prototype's `content.js` flags this as a probable pole inversion | yes (MBTI → I stage) |
| `rhythm-b` (20) | test / available | 4 | QA stress: 90-char title, 80-char unbroken token subtitle, doubled question text | no (explicitly excluded) |
| `debug-sample` (30) | test / debug | 4 (profile + scoring) | QA-only; `test-lazy-validation` mutates it | no |
| `energy-check` (40) | test / opt_out | 4 | KR real, EN mostly real; mixes axes T/F, N/S, E/I, J/P under the `mbti` schema | yes (→ J stage) |
| `creativity-profile` (50) | test / unavailable | 2 | placeholder | yes, as "출시 예정" card |
| `burnout-risk` (60) | test / hide | 2 | placeholder | no |
| `egtt` (70) | test / available | 1 profile (`q.1` gender qualifier `M/F`) + 3 scoring (E/T), `egtt` schema | KR real; subtitle placeholder (prototype shows none) | yes (→ I stage) |
| `ops-handbook`, `build-metrics`, `release-gate` (80–100) | blog / available | — | DevOps placeholder copy; the "article body" is the subtitle (`features/blog/blog-destination-client.tsx:121`) | yes, verbatim, as 읽을거리 |

`fixtures/results/index.ts` holds `{variantId}` rows for `qmbti`, `rhythm-b`, `energy-check`, `egtt` only — **there is no result content anywhere** (the schema lists `supportedSections: ['derived_type','axis_chart','type_desc']` in `schema-registry.ts` but nothing renders `type_desc`). `schema-registry.ts` (84 lines) is the only owner of variant → scoring-logic mapping (`mbti` 4-axis, `egtt` 1-axis + qualifier).

Disposition: the loaders/types (`fixtures/questions/{index,types}.ts`, `fixtures/results/*`) are FOUNDATION as the content contract; the content rows are LATER — carry `qmbti`, `energy-check`, `egtt`, `creativity-profile` and the 3 blog cards as product content (KR verified, EN to be reviewed, pole inversion to be decided by the owner), and keep `rhythm-b`/`debug-sample`/`burnout-risk` only as unit-test fixtures (they are what the validation tests mutate), not as catalog rows.

### 4.3 Messages (`src/messages/*.json`, 12 × 107 lines, 3.9–7.2 KB each)

89 leaf keys in 8 namespaces: `meta` 1 · `gnb` 18 · `landing` 14 · `test` 30 · `blog` 2 · `history` 8 · `error` 9 · `consent` 7. All 12 locales have the full key set (enforced by `message-key-parity`); keys identical to `en` per locale are only format placeholders (`{percent}%`, `00:00`, `—`): kr/zs/zt/ja/hi/ru 3, es/de/id 5, pt 6, fr 7. One ICU plural (`landing.optedOutNotice`). Loaded statically by `src/i18n/messages.ts` and `src/i18n/request.ts` (next-intl `getRequestConfig`).

Reusable as-is for the new UI: `meta.description`; `consent.*`; the instruction/consent strings in `test.*` (`instructionTitle`, `start`, `acceptAllAndStart`, `denyAndAbandon`, `denyAndStart`, `keepCurrentPreference`, `unknownAvailableNote`, `unknownOptOutNote`, `optedOutAvailableWarning`, `prev`, `submit`, `previouslySelected`) — the prototype reuses exactly these KR strings (`mockups/shared/content.js` `ui`), and the owner's third round keeps the consent notice mandatory before Q2; `error.*` (recovery surfaces). Tied to the legacy chrome: most of `gnb.*` (e.g. `timerPlaceholder`, desktop settings), `landing.*` card meta labels, `blog.*`, `history.*`.

Disposition: LATER per feature, copying keys from legacy when the consuming surface is rebuilt; FOUNDATION carries `meta` (needed by the locale manifest route) plus `message-key-parity.test.ts`. The prototype adds new strings (share/"나 대신 골라 줘", vote row, stage labels) that need 12-locale translation.

### 4.4 Landing card media (`public/landing-card-media/<variant>/thumbnail.svg`, 10 files, 428–2,005 B)

Discovered by `src/features/landing/media/manifest.server.ts` (reads the directory at request time, `server-only`). All are drawn in the legacy sage palette (`#5c8e78`, `#c9dbd1`, `#a6c5b5`, ground `#fbfaf7`; `creativity-profile` grey). The prototype colours each test by category (personality green, relationships terracotta, work purple…; `mockups/shared/content.js` `categories`, sourced from `docs/design/ds/assets/thumb-*.svg`). `next.config.ts` gives `/landing-card-media/*` an `immutable` year-long cache — safe only because file names are fixed per variant; a redraw under the same name would be pinned in caches for a year. Disposition: REFERENCE (redraw with the revised design system; if the path is reused, change the file names).

### 4.5 Fonts (`public/fonts/`, 3.1 MB tracked)

- Family `'Pretendard Variable'` v1.3.9 (SIL OFL 1.1, source orioncactus/pretendard), variable weight axis `45 920`, `woff2-variations`, `font-display: swap`, no preload (measured decision in the comment block `globals.css:4-44`).
- 92 upstream dynamic-subset slices `public/fonts/pretendard/PretendardVariable.subset.{0..91}.woff2` declared by `src/app/fonts.generated.css` (848 lines, `GENERATED — do not hand-edit`) with `unicode-range` each.
- 1 repo-built supplement `public/fonts/PretendardVariable.supplement.woff2` (61,916 B, 601 glyphs: Latin-1/Latin Extended A–B gaps and all Cyrillic U+0400–052F), declared in `globals.css:65-71`, generation recorded in `decision-register.md` BQ-47, non-overlap guarded by `tests/unit/font-subset-manifest.test.ts`.
- Design bundle copy: `docs/design/ds/fonts/PretendardVariable.woff2` (2.0 MB full face).
- Font stack `--font-sans` (`globals.css:261`) falls back to system faces for Han/Kana/Devanagari (`Hiragino Sans`, `PingFang SC/TC`, `Noto Sans JP/SC/TC/Devanagari`…); Pretendard itself does not cover zs/zt/ja/hi.
- **No licence file is tracked anywhere** (`git ls-files | grep -i 'licen\|ofl'` → none). OFL 1.1 requires the copyright notice and licence to accompany redistributed font software; the site serves the files publicly.
- `next.config.ts` serves `/fonts/*` with `public, max-age=31536000, immutable`.

Disposition: LATER, with the design-system revision's typeface decision. If Pretendard stays, carry `public/fonts/**` + `fonts.generated.css` + the supplement block + `font-subset-manifest.test.ts` verbatim and add `OFL.txt`.

### 4.6 Icons, OG, manifest

| File | Lines | What | Coupling | Disposition |
|:---|---:|:---|:---|:---|
| `src/app/brand-assets.ts` | 55 | `BRAND_COLORS` (ground `#fbfaf7`, ink `#1e1a16`, accent `#4b7764`) + `brandMarkSvg()` geometric "V" within maskable safe radius | colours bound to legacy tokens by `brand-assets-parity.test.ts` | LATER (keep mark geometry, recolour with new tokens) |
| `src/app/icon.svg` | 1 | 512² mark, byte-equal to `BRAND_ICON_FILE_CONTENT` | same | LATER |
| `src/app/favicon.ico` | bin | 48/32 px ICO, 3 images | not generated from the mark | LATER (regenerate from mark) |
| `src/app/apple-icon.tsx` | 27 | 180² PNG via `next/og` | brand-assets | LATER |
| `src/app/[locale]/opengraph-image.tsx` | 67 | 1200×630 static brand card; deliberately no text (satori cannot read variable woff2) | brand-assets | LATER — the prototype needs per-question link previews ("질문별 링크 미리보기", which the prototype session noted needs Next ≥ 16.3.6) |
| `src/app/manifest.ts` | 38 | root manifest, `start_url: '/'`, SVG icon any+maskable | `theme-ground-color` | LATER (tokens) |
| `src/app/[locale]/manifest.webmanifest/route.ts` | 56 | per-locale manifest using `meta.description`, `start_url: /{locale}` | messages, `theme-ground-color` | FOUNDATION-eligible (no visual decision beyond the ground colour) |
| `src/app/theme-ground-color.ts` | 13 | light `#fbfaf7` / dark `#141110` literals for `meta[name=theme-color]` | bound to `--canvas` by `theme-color-parity.test.ts` | LATER (new tokens) |

### 4.7 `public/56T-ToDo.html` (578,500 B)

An unrelated personal page ("56T 당첨자 입주 플래너 — 성남복정2 A1", header comment "배포본 · 개인 데이터 없음"), last touched `ae37a1c` 2026-08-29, referenced by no code, publicly served at `/56T-ToDo.html` by this deployment. Already flagged three times as repo hygiene in `docs/plans/2026-09-11-mobile-refactor-maps/findings/{feedback-state,input-form,performance}.md`. Disposition: DISCARD from the new `main` — but the owner may be relying on this URL (owner decision; it can be hosted elsewhere).

---

## 5. Pure logic

### 5.1 Test domain (`src/features/test/domain/`, 8 files, 755 lines) — FOUNDATION

| File | Lines | Content | Tests |
|:---|---:|:---|:---|
| `types.ts` | 106 | Branded `VariantId`/`QuestionIndex`; `AxisSpec {poleA,poleB,scoringMode}`; `ScoringMode = 'binary_majority' \| 'scale'` (`scale` unsupported); `ScoringSchema` with `axisCount: 1\|2\|4`, `qualifierFields`; result/validation unions | indirect |
| `derivation.ts` | 93 | `computeScoreStats` (per-axis counts, dominant pole, tie → poleA), `deriveDerivedType` (concatenate dominants), `axisMatchesQuestion` (either orientation) | `test-domain-derivation` (10) |
| `validate-question-model.ts` | 91 | index uniqueness, scoring poles present/distinct, exactly one matching axis | `test-domain-question-model` (7) |
| `validate-variant-data-integrity.ts` | 187 | empty set, axisCount = axes, duplicate axes, only `binary_majority`, qualifier specs, odd question count per axis | `test-domain-question-model`, `test-lazy-validation` |
| `validate-variant.ts` | 28 | MISSING / UNKNOWN / UNAVAILABLE | `test-domain-variant-validation` (5) |
| `type-segment.ts` | 63 | result URL `{type}` = derived type + fixed-width qualifier tokens; parse/build | `test-domain-type-segment` (4) |
| `result-payload.ts` | 150 | keyless query payload: URL-safe Base64 → UTF-8 JSON → schema-ordered `scoreStats` + boolean `shared`; order of checks is the `req-test.md` §5.1 invariant; treats input as untrusted | `test-domain-result-payload` (9) |
| `index.ts` | 37 | public surface (gold standard, `AGENTS.md` §6) | 16 tests import it |

Quality: pure, no imports outside the folder, deterministic, well-typed result unions, documented reasons. Limits relevant to the prototype: axis model is strictly bipolar and answers are projected `A → poleA`, `B → poleB` (in `response-projection.ts`); there is no scoring mode for 3/4-answer questions, and `axisCount` is restricted to 1/2/4.

### 5.2 Test flow logic outside the domain

| File | Lines | Imports | Tests | UI coupling | Disposition |
|:---|---:|:---|:---|:---|:---|
| `schema-registry.ts` | 84 | domain | `schema-registry` (5) | none | FOUNDATION (prune placeholder variants) |
| `question-source-parser.ts` | 82 | site, domain, fixtures | `question-source-parser`, `sheets-row-normalizer`, `test-lazy-validation` | none | FOUNDATION (drop dead resolve; `seq` grammar `q.N` = profile, digits = scoring) |
| `question-bank.ts` | 111 | site, fixtures, parser, registry types | 8 tests | "UI rendering data structure" (`ResolvedQuestion`) | FOUNDATION, then switch to a registry-owned question source (§8 F2) |
| `lazy-validation.ts` | 105 | site, domain, fixtures, parser, schema-registry | `test-lazy-validation` | none | FOUNDATION |
| `response-projection.ts` | 85 | domain, question-bank | `test-result-address` | none | FOUNDATION (binary) |
| `result-view-model.ts` | 212 | site, domain, question-bank, projection, schema-registry, localized-path, route-builder | `test-result-view-model`, `test-result-address` | none (produces an all-or-nothing view model; `buildResultAddress`) | FOUNDATION |
| `entry-policy.ts` | 194 | registry types, telemetry types | `test-entry-policy` + 3 orchestrator tests | light: returns `labelKey` and `testId` strings | FOUNDATION — the owner's third round keeps the consent notice before Q2: "이 메시지와 [시작] 버튼은 Q2 진입 전 필수로 해야하는 아주 중요한 고지의 메시지도 담고 있는데 (요구사항 참고, consent 미선택 Q1 진입 시 고지 함께 하고 있음)"; only the surface changes (bottom sheet → centred modal) |
| `canonical-key.ts` | 2 | — | indirect | none | FOUNDATION (move to domain) |
| `test-run-reducer.ts` | 202 | — | `test-run-reducer` (21) + 4 | none; `SemanticAnswer = 'A' \| 'B'` | LATER (the owner changed re-answer navigation: "되돌아간 문항부터 한 단계식 이동"; today `use-test-run-controller.ts:219-231` jumps to the next unanswered question — the reducer itself already supports stepping) |
| `bootstrap-state-resolver.ts` | 193 | transition store, canonical key, question-bank, active-run, runtime-utils | `test-question-bootstrap` | none | LATER (depends on the legacy transition ingress) |
| `recovery-cards.ts` | 75 | run-history, localized-path, state-flags, domain | `test-recovery-cards` | none | LATER |
| `qualifier-overlay-model.ts`, `qualifier-resume-validator.ts` | 40 + 15 | domain types, question-bank | 8 tests | none | LATER |
| `question-runtime-utils.ts` | 57 | question-bank | 2 | none | LATER |
| `answer-choice-state.ts` | 34 | reducer | 2 | none (selected / previous-answer / none) | LATER |
| `storage/*` (9 files) | 446 | domain, safe-storage | 5 storage tests | none | LATER — keys `test:{variant}:flag:*`, `:activeRun`, `:responses`, `test:runHistory` (limit 50), volatility on result commit / inactivity / restart |
| `use-*.ts` hooks (11 files), `*.tsx` (8 files), `surface-class-names.ts`, `test-question.module.css` | 2,300+ | React, UI | 12 hook/component tests | full | REFERENCE (flow semantics worth reading: resume, 30-min inactivity, qualifier re-entry) |

### 5.3 Locale and routing — FOUNDATION

| File | Lines | Tests | Notes |
|:---|---:|:---|:---|
| `src/config/site.ts` | 199 | 10 tests | 12 locale codes (URL/storage/telemetry canon), labels, BCP 47 `htmlLang` (`kr→ko`, `zs→zh-Hans`, `zt→zh-Hant`), `localeEntryAliases` (only irreducible ones), `resolveLocaleAlias` (strip region subtags right-to-left, narrow script pattern so `/id-card` is not Indonesian), `resolveSiteOrigin` (`NEXT_PUBLIC_SITE_URL` → `VERCEL_PROJECT_PRODUCTION_URL` → localhost). Excellent; carry verbatim. |
| `src/i18n/locale-resolution.ts` | 141 | `locale-resolution`, `locale-alias-parity` (generated token matrix) | cookie → `Accept-Language` q-sorted → `en`; zh script/region rules. |
| `src/i18n/proxy-policy.ts` | 122 | `proxy-policy` (8) | duplicate-locale → rewrite `/_not-found`; alias → redirect; unknown path → rewrite; locale-less allowlist (`/blog`, `/blog/x`, `/history`, `/result/x/y`, `/test/x`) → redirect with resolved locale. **The allowlist is the legacy route map** — edit when the new routes are fixed. |
| `src/lib/routes/route-builder.ts` | 116 | `route-builder` (both-direction parity with `src/app/[locale]/**`), `localized-path` | typed `LocaleFreeRoute` union for 7 routes; gold standard. Route union must be rewritten for the new map; the parity test enforces it. |
| `src/i18n/localized-path.ts` | 26 | 3 | typed `/{locale}/…` builder; gold standard. |
| `src/i18n/request-locale-header.ts` | 15 | 1 | `X-NEXT-INTL-LOCALE` header → locale for the root layout `<html lang>`. |
| `src/i18n/messages.ts` | 28 | indirect | static imports of 12 JSONs. |
| `src/i18n/request.ts` | 14 | none | next-intl request config (referenced from `next.config.ts:4`). |
| `src/i18n/locale-html-lang-sync.tsx` | 27 | 1 | client effect keeping `<html lang>` right after client navigation. |
| `src/i18n/routing.ts` | 16 | none | **Orphan**: no importer; next-intl `defineRouting` with 5 pathnames (no `/result`). DISCARD. |

### 5.4 Telemetry

| File | Lines | Tests | Notes | Disposition |
|:---|---:|:---|:---|:---|
| `telemetry/types.ts` | 75 | 1 | consent `UNKNOWN/OPTED_IN/OPTED_OUT`; 6 events (`landing_view`, `card_answered`, `attempt_start`, `final_submit`, `question_answered`, `result_viewed`); binary `choice` and `final_responses` values | FOUNDATION (event set will grow: share/vote) |
| `telemetry/validation.ts` | 245 | `landing-telemetry-validation`, `telemetry-question-answered` | shape checks, forbidden PII keys (`question_text`, `answer_text`, `email`, `ip`, `fingerprint`…), legacy keys banned, per-event rules, `session_id` required from `attempt_start` on; `locale` only checked as a string (`validation.ts:82`), not as an `AppLocale`; `attempt_start`/`final_submit` accept non-integer indexes (documented intentional difference) | FOUNDATION |
| `telemetry/consent-source.ts` | 136 | 4 | `useSyncExternalStore` store, memory-first, `localStorage` key `vivetest-telemetry-consent`, cross-tab `storage` bridge, `synced` flag to avoid SSR flash | FOUNDATION-eligible (UI-free) |
| `telemetry/consent-recall.ts` | 71 | 2 | tiny React event bus to reopen the consent banner | LATER (UI-shaped) |
| `telemetry/runtime.ts` | 310 | 6 | session id (`vivetest-telemetry-session-id`), pre-consent queue flushed on opt-in, `fetch('/api/telemetry', {keepalive})`, landing-view dedupe, 6 `track*` helpers | LATER (event set changes with share/vote; the prototype session lists "투표 서버·텔레메트리" as new work) |

### 5.5 Transition (`src/features/transition/`, 8 files, 500 lines)

`store.ts` (179): `sessionStorage` pending transition (id, source variant, target route, type, start, pre-answer), landing return scroll/variant, per-variant landing ingress record `{variant, preAnswerChoice: 'A'|'B', createdAtMs, landingIngressFlag: true}`, rollback on fail/cancel. `runtime.ts` (116): begin/complete/terminate, duplicate-locale guard, fires `card_answered`. `signals.ts` (31): `CustomEvent` channel. Hooks/components (5 files) are UI glue. The prototype replaces page navigation with "펼친 카드가 테스트의 창이 됩니다 … 페이지를 옮기지 않으니 돌아올 때 빈 화면도 생기지 않습니다" and the prototype session itself says the transition contract (`req-landing-interaction` §8) must be rewritten. Only the idea "the landing Q1 answer is carried into the run with an ingress flag" survives. Disposition: REFERENCE (store/runtime/signals), DISCARD hooks.

### 5.6 Theme bootstrap (`src/features/gnb/theme-bootstrap-source.ts`, 57 lines)

Inline synchronous `<head>` script string (measured reason: external script left dark users on a light screen for 1.3–5.5 s); reads `vivetest-theme`, falls back to `prefers-color-scheme`, sets `data-theme`, overwrites `meta[name=theme-color]`. Pure string; tested in jsdom by `theme-bootstrap-behavior` (5). Ground colours duplicated from `theme-ground-color.ts` (parity-tested). Disposition: LATER with the design system (mechanism verbatim, colour literals from the new tokens); it lives under `gnb/` only for a `qa:rules` path reason (`check-phase1-contracts.mjs` bans `window` in `src/app`) — move it to a neutral `platform/theme` folder.

### 5.7 `src/lib`

`safe-storage.ts` (106): never-throwing `read/write/removeLocal|Session` (Safari "block all cookies" throws on write; measured failure mode documented), enforced repo-wide by `safe-storage-discipline.test.ts`. FOUNDATION. `correlation-id.ts` (36): `crypto.randomUUID` → `getRandomValues` v4 → counter fallback. FOUNDATION. `routes/route-builder.ts` see §5.3.

---

## 6. Infrastructure

### 6.1 `src/proxy.ts` (54 lines) — FOUNDATION

Single request entry (no `middleware.ts`, per `AGENTS.md` §3). Delegates to `resolveProxyDecision`; sets `X-NEXT-INTL-LOCALE` on pass-through; redirect/rewrite otherwise (rewrite clears the query). Matcher excludes `_next`, `api`, `_vercel`, `_not-found`, `favicon.ico`, `robots.txt`, `sitemap.xml`, `apple-icon`, and any dotted path (`src/proxy.ts:53`); the comment records the measured `apple-icon` 404. No direct unit test (policy has 8; E2E `routing-smoke` covers the wiring). `robots.txt`/`sitemap.xml` are excluded but do not exist.

### 6.2 `/api/telemetry` (`src/app/api/telemetry/route.ts`, 13 lines) — FOUNDATION

`POST` → `validateTelemetryTransportEvent(await request.json())` → `204`, or `400 {ok:false}`. **It stores or forwards nothing** — every accepted event is dropped. Tested by `telemetry-route` (5). Any analytics value (and the prototype's friend votes) needs a real sink; that is new infrastructure, not a carry.

### 6.3 Google Sheets sync pipeline and GitHub Action

| File | Lines | Role |
|:---|---:|:---|
| `scripts/sync/sheets-loader.ts` | 289 | `googleapis` service-account client (read-only scope); `Landing` sheet → `VariantRegistrySourceCard[]` (skips malformed rows with a warning; `field_XX` locale columns; tags split on `' \| '`); Questions workbook: one sheet per variant, `seq` must match `q.N` or `N`, rows via `normalizeQuestionSheetRow`. `// TODO(results)` at `:108`. |
| `scripts/sync/sync.ts` | 178 | env check (`GOOGLE_SHEETS_SA_KEY`, `GOOGLE_SHEETS_ID_LANDING`, `GOOGLE_SHEETS_ID_QUESTIONS`) → load both → 2-source `validateCrossSheetIntegrity` (blogs excluded) → `buildVariantRegistry` → `serializeRegistryToFile` → compare with `variant-registry.generated.ts` → on change `git add` + `git commit -m "chore: sync variant registry from Sheets [skip ci]"` + `git push`, restoring the file if git fails; injectable runtime for tests. `// TODO(results)` at `:124`. |
| `scripts/sync/sync-dry-run.ts` | 18 | fixture → builder → serializer → stdout (`npm run sync:dry`) |
| `scripts/sync/regenerate-variant-registry-from-fixture.ts` | 24 | fixture → writes the generated file; **no npm script** (run as `npx vite-node -c ./vitest.config.ts …`, per `docs/done/2026-06-04-wave-9-unavailable-implementation.md`) |
| `.github/workflows/sync.yml` | 40 | `on: push: branches: [main]`, `permissions: contents: write`, checkout `github.ref_name` with full history, Node 22, `npm ci`, bot identity `github-actions[bot]`, `npm run sync` with secrets `GOOGLE_SHEETS_SA_KEY`, `GOOGLE_SHEETS_ID_LANDING`, `GOOGLE_SHEETS_ID_QUESTIONS` |

What it commits and where: only `src/features/variant-registry/variant-registry.generated.ts`, as a direct commit pushed to `main` (the branch that triggered it). Secret names configured on the repo (`gh secret list`, names and dates only): `GOOGLE_SHEETS_SA_KEY` (2026-04-27), `GOOGLE_SHEETS_ID_LANDING` (2026-04-27), `GOOGLE_SHEETS_ID_QUESTIONS` (2026-04-27). `GOOGLE_SHEETS_ID_RESULTS` is specified in `docs/req-test.md:111` and `docs/req-test-plan.md` ADR-C but not configured and not read by code.

Run history (`gh run list --workflow sync.yml`): 209 runs from 2026-04-24 to 2026-09-24, **209 failures, 0 successes**. Logs before September have expired (HTTP 410); every retained log fails at `npm ci` with `EUSAGE … package.json and package-lock.json … are not in sync … Missing: @swc/helpers@0.5.23 from lock file`. Lockfile facts: `node_modules/@swc/helpers` 0.5.15 (pinned by `next` 16.2.4), `node_modules/next-intl/node_modules/@swc/core` peer `@swc/helpers >=0.5.17`. The repo has no other workflow (no CI for lint/typecheck/test/build/E2E — `docs/project-analysis.md:43,753`).

Hazards if carried as-is: (a) every push to the new `main` spawns a failing run; (b) once fixed it commits to `main` from CI on every push, racing the squash-landing model and resident runners that move `main`; (c) it is only half the pipeline (questions never reach runtime, §8 F2); (d) the Sheets column schema is binary (`answerA_XX`/`answerB_XX`) and has no stage/colour columns the prototype needs.

Disposition: `sheets-loader.ts`, `sync.ts`, `sync-dry-run.ts`, `sheets-row-normalizer.ts` and their tests are sound code — FOUNDATION if Sheets remains the content source (they are 100% unit-tested with injected clients and git runners), otherwise REFERENCE. `regenerate-variant-registry-from-fixture.ts` DISCARD (duplicate of `sync:dry` + a write; replace with an npm script if needed). `.github/workflows/sync.yml` DISCARD in its current trigger; re-add later as `workflow_dispatch`/schedule opening a PR, after the content schema v2 exists.

### 6.4 Vercel Analytics and Speed Insights

`@vercel/analytics` 2.0.1 (pinned) and `@vercel/speed-insights` ^2.0.0 (installed 2.0.0) are dependencies. `src/app/vercel-analytics-gate.tsx` (15) and `vercel-speed-insights-gate.tsx` (16) render `<Analytics/>` / `<SpeedInsights/>` from the `/next` entry only when `useTelemetryConsentSource()` is `synced` and `OPTED_IN`; both are mounted at the end of `<body>` in `src/app/layout.tsx:72,74`. Tested by `vercel-analytics-gate` (130 lines) and `vercel-speed-insights-gate` (131 lines) in jsdom. No `vercel.json`. Disposition: FOUNDATION (with `consent-source.ts`): analytics must stay consent-gated from the first deploy of the new app.

### 6.5 Root configuration

| File | Content | Disposition |
|:---|:---|:---|
| `package.json` | deps `next` 16.2.4, `react`/`react-dom` 19.2.4, `next-intl` 4.9.1, `@vercel/*`, **`googleapis` 171.4.0 in `dependencies`** (only scripts use it → devDependency); devDeps incl. **unused `@vitejs/plugin-react` 5.1.0**; `sync`/`sync:dry` use `vite-node`, which is **not declared** (arrives transitively with vitest 3.2.4); **no `motion` package** although `AGENTS.md:25` lists `motion@12.34.0` in the stack | FOUNDATION as a template: same versions, fix the three items, regenerate the lockfile with the CI npm |
| `package-lock.json` | lockfileVersion 3, out of sync for CI npm (§6.3) | DISCARD (regenerate) |
| `next.config.ts` | next-intl plugin → `./src/i18n/request.ts`; `typedRoutes`; `experimental.globalNotFound`; `outputFileTracingRoot` and `turbopack.root` = `process.cwd()` (keeps clones self-rooted); `allowedDevOrigins ['127.0.0.1']`; immutable cache headers for `/fonts/*` and `/landing-card-media/*` | FOUNDATION (drop the media header until media exists) |
| `tsconfig.json` | strict, bundler resolution, `@/*` → `src/*`, next plugin, incremental | FOUNDATION verbatim |
| `eslint.config.mjs` | `eslint-config-next` core-web-vitals + typescript, ignores build dirs | FOUNDATION verbatim |
| `vitest.config.ts` | `@` alias, include `tests/unit/**/*.test.ts`, node env by default (jsdom per file) | FOUNDATION verbatim |
| `postcss.config.mjs` | `@tailwindcss/postcss` | FOUNDATION verbatim |
| `playwright.config.ts` | base URL `127.0.0.1:4173`, dev vs preview server modes, `webkit-ghosting` project serialised for one legacy spec, screenshot thresholds | REFERENCE (rewrite for the new E2E set; keep the preview-server pattern) |
| `.playwright-mcp/` (3 tracked logs/snapshots from May–June) | debris | DISCARD |

### 6.6 `scripts/qa` (brief)

13 grep-style contract checks run by `run-all.mjs` (`npm run qa:rules`, outside the default gate): phase 1 (no `window`/`localStorage` in `src/app`), 4 grid, 5 card, 6 spacing, 7 state, 8 a11y, 9 performance, 10 transition, 11 telemetry, variant-registry (legacy token bans), variant-only, blocker traceability (`docs/blocker-traceability.json`), design-token parity. Every check names legacy file paths or legacy tests. Disposition: REFERENCE; per project memory, guards belong in vitest, so re-express the two with lasting value (no browser globals in `src/app`; banned legacy tokens) as unit tests when needed.

### 6.7 `tests/unit` outside the kernel (brief)

- Legacy UI/hook tests (46): all `landing-*` grid/controller/fingerprint tests, all `gnb-*`, `bottom-sheet`, `body-scroll-lock`, `instruction-overlay`, `instruction-sheet`, `overlay-connector`, `qualifier-chip`, `test-result-panel`, `use-answer-handler`, `use-test-entry-orchestrator`, `use-test-run-controller`, `test-entry-orchestrator-{qualifier,reentry}`, `telemetry-consent-banner`, `blog-server-model`, `shared-shell-gutter`, `mobile-breakpoint-literals`, `input-profile-axis`. REFERENCE (the orchestrator/controller tests document flow behaviour worth re-deriving).
- Repo/doc/design guards (22): `contract-citations`, `qa-registry`, `decision-register`, `design-ds-boundary`, `design-specimen-coverage`, `design-tokens-dark-parity`, `docs-lifecycle`, `lessons-ledger`, `snapshot-baselines-tracked`, `snapshot-environment-note`, `tailwind-candidate-hygiene`, `css-module-reference-integrity`, `type-literal-provenance`, `safe-storage-discipline`, `error-boundary-coverage`, `segment-404-unreachability`, `font-subset-manifest`, `answer-choice-catalog-parity`, `press-feedback`, `text-wrap-escape`, `locale-aware-formatting`, `landing-motion-stages`. Pattern is valuable (census-style, fault-injected), bodies are bound to legacy docs/paths. Carry `safe-storage-discipline` and `docs-lifecycle` (if the docs layout stays) with the foundation; rewrite the rest when their subject exists.
- `tests/fixtures/*.json` (3 fingerprints): DISCARD with their tests.

---

## 7. Prototype-driven impact on the carried code

Owner decisions from the prototype session (`proto-session/dialog.md`, rounds 2–3, quoted verbatim) and the code they touch:

| Decision (verbatim) | Code affected |
|:---|:---|
| "각각의 안이 모두 마음에 들어서 3개안 (반반화면, 갈림길, 스토리) 모두 이 서비스 안에서 사용하겠습니다." / "완성된 후에는 각 테스트 별로 어떤 타입을 적용할지를 사전에 정의하겠습니다." | Registry source/runtime types need a per-test stage field (and a reduced-motion rule: D is the fallback — "D 안은 모션 제거 시 폴백으로 채택"); builder allowed/required keys; Sheets `Landing` columns; serializer output. |
| "나중에 3지선다, 4지선다 응답형 테스트도 있을 수 있습니다." (the prototype's final revision renders 2/3/4 answers via `keysOf(q)`) | Binary literals in 34 `src` files: `test-run-reducer.ts` `SemanticAnswer`, `response-projection.ts` A/B → poles, `telemetry/types.ts` `choice` + validation of `final_responses`, `transition/store.ts` `preAnswerChoice`, `QuestionSourceRow.answerA/B`, `sheets-row-normalizer.ts` column regex, preview payload `answerChoiceA/B`, domain `AxisSpec` bipolar model and `binary_majority` only. A new scoring mode is a domain design task, not a rename. |
| "되돌아간 문항부터 한 단계식 이동" | Controller navigation (`use-test-run-controller.ts:219-231` jumps to next unanswered); reducer already steps. `req-test.md` §4.3 revision flagged by the prototype session. |
| Instruction as a modal: "시작 전 안내 하단 바텀 시트는 화면 위를 덮는 모달 팝업/시트 형태로 변경되는게 더 바람직해보입니다. (모든 안 공통)" | UI only; `entry-policy.ts` matrix and consent strings carry unchanged. |
| Friend share: "「나 대신 골라 줘」 카드와 링크 문구가 올리고 싶은 모양인가요? > 네" and vote row "있어야 한다" | New: vote storage/server, new telemetry events, per-question share URLs and OG images (none exist; `/api/telemetry` drops everything). |
| "랜딩 선택지 여는 방식 > 펼치기"; card becomes the stage window | Legacy grid/expanded-card/transition code (≈ 8,100 lines in `features/landing` + 500 in `features/transition`) is not reusable; REFERENCE only. |
| Test colour continuity (card → stage → start button → share card) | Registry needs a category/colour field (the prototype's `category` is "a mockup choice, not product data"); thumbnails/brand colours come from the revised design system. |

---

## 8. Findings (defects and risks found during the inventory)

| ID | Finding | Evidence | Severity | Remedy for the rebuild |
|:---|:---|:---|:---|:---|
| F1 | Sync Action 209/209 failed; `npm ci` lockfile mismatch | `gh run list`; run 35948788650 log | High (silent: the only CI never worked) | Regenerate lockfile with CI's npm; do not carry the push-to-main trigger |
| F2 | Production test questions come from the in-repo fixture, not Sheets; only the Q1 preview is synced | `question-bank.ts:2,64`, `lazy-validation.ts:8,45`, `sync.ts` writes only the generated registry | High (content split-brain once Sheets is edited) | Generate a question bank artifact alongside the registry and read only that at runtime |
| F3 | Dev/test and production read different registry sources; parity is asserted nowhere | `resolvers.ts:68,81`; scratch probe | Medium | One source; if generation stays, add a parity test |
| F4 | Three divergent locale-fallback implementations | `localization.ts:34`, `question-source-parser.ts:34`, `question-bank.ts:43` | Medium | Keep `localization.ts` only |
| F5 | `/api/telemetry` validates and drops every event | `route.ts:12` | Medium (analytics value is zero today) | Decide sink before building share/vote |
| F6 | Content is placeholder/QA-stress for 3 of 7 tests and all blog cards; EN copy of `qmbti` Q1 wrong; `qmbti` Q6 pole likely inverted; no results content | §4.2 | Medium | Content pass before launch; separate test fixtures from product content |
| F7 | Pretendard served publicly without OFL licence file | no tracked licence | Low–Medium (licence compliance) | Add `OFL.txt` next to the fonts |
| F8 | Unrelated 578 KB personal page publicly served | `public/56T-ToDo.html` | Low (hygiene, exposure) | Leave out of new `main` |
| F9 | Dead/orphan code | `i18n/routing.ts`, `use-mobile-scroll-lock.ts` (test-only), `landing/model/index.ts`, `test/storage/storage-keys.ts`, dead exports (§3.7) | Low | Do not carry |
| F10 | Dependency declarations drift | `googleapis` in deps, unused `@vitejs/plugin-react`, undeclared `vite-node`, `AGENTS.md:25` lists `motion` which is not installed | Low | Fix in the new `package.json`/contract |
| F11 | Stale path comments | §3.7 | Low | Fix while copying |
| F12 | `immutable` year-long cache on fixed media names | `next.config.ts` headers | Low now, High on redraw | Content-hashed names or drop the header for media |
| F13 | Tracked debris | `.playwright-mcp/*` | Low | Do not carry |

---

## 9. Disposition master table

| Asset | Files / lines | Disposition |
|:---|:---|:---|
| K0 kernel (§3.2) minus content rows and `fixture-contract.ts` | 45 files | FOUNDATION (with §3.7 clean-ups) |
| K0 tests (29) + `tests/unit/helpers/repo.ts` | 30 files, 4,107+74 lines | FOUNDATION (`route-builder`, `locale-manifest`, `variant-registry-runtime-integrity` go green when the new routes land) |
| `scripts/sync/{sheets-loader,sync,sync-dry-run}.ts` + `sheets-row-normalizer.ts` | 4 files | FOUNDATION if Sheets stays the CMS (owner decision), else REFERENCE |
| `scripts/sync/regenerate-variant-registry-from-fixture.ts` | 24 lines | DISCARD |
| `.github/workflows/sync.yml` | 40 lines | DISCARD (re-add later, dispatch/PR-based) |
| Content rows: `qmbti`, `energy-check`, `egtt`, `creativity-profile`, 3 blog cards | in `source-fixture.ts` + 3 question files | LATER (content pass) |
| QA-stress rows `rhythm-b`, `debug-sample`, `burnout-risk` | | move to test fixtures only |
| `variant-registry.generated.ts` | 420 | regenerate, never copy |
| `lib/safe-storage.ts`, `lib/correlation-id.ts` | 142 | FOUNDATION |
| K1 test storage, reducer, bootstrap, recovery, qualifier, runtime utils, answer-choice state | 20 files | LATER (with the test-flow rebuild) |
| `landing/storage/storage-keys.ts` | 79 | LATER, relocated to a neutral storage-keys module |
| `transition/{store,runtime,signals,constants}.ts` | 327 | REFERENCE |
| Messages (12 × 89 keys) | 1,284 | FOUNDATION: `meta` + parity test; LATER: other namespaces per feature |
| `consent-source.ts` + Vercel gates | 167 | FOUNDATION |
| `telemetry/runtime.ts`, `consent-recall.ts` | 381 | LATER |
| `proxy.ts`, `/api/telemetry`, `i18n/request.ts`, `request-locale-header.ts`, `locale-html-lang-sync.tsx`, `[locale]/manifest.webmanifest/route.ts` | 7 files | FOUNDATION |
| `theme-bootstrap-source.ts`, `theme-ground-color.ts` | 70 | LATER (design system values) |
| Brand mark, icons, OG, root manifest, favicon | 6 files | LATER (design system) |
| Fonts + `fonts.generated.css` + supplement | 94 files, 3.1 MB | LATER (typeface decision; add licence) |
| `public/landing-card-media/**` | 10 SVG | REFERENCE (redraw) |
| `globals.css` tokens/base | 516 | REFERENCE (design-system revision replaces it) |
| All landing grid/model/shell, GNB, `features/ui`, test UI `.tsx`/hooks, blog UI | ≈ 16,000 lines | REFERENCE |
| `src/i18n/routing.ts`, dead exports, `use-mobile-scroll-lock.ts`, `landing/model/index.ts`, `test/storage/storage-keys.ts` | | DISCARD |
| `scripts/qa/**` | 2,753 | REFERENCE |
| Legacy UI unit tests (46), `tests/fixtures/**`, E2E specs + 189 PNG baselines | | REFERENCE |
| Repo guards (22) | | `safe-storage-discipline` FOUNDATION; others rewrite when their subject exists |
| `public/56T-ToDo.html`, `.playwright-mcp/**` | | DISCARD (owner to confirm the 56T page) |
| Root configs | 7 files | FOUNDATION as templates (§6.5) |

---

## 10. Foundation copy manifest (for the implementing session)

Run inside the new clone (any clone that still contains commit `20f973a`); it copies exactly the K0 kernel, `scripts/sync`, the K0 tests (minus `locale-manifest`), the two `lib` files and the UI-free platform files from the legacy snapshot without touching anything else. `fixture-contract.ts` is included only so the copied tree typechecks as-is (the barrel imports it); delete it in the clean-up edit below.

**Verified**: the identical path list extracted with `git archive 20f973a… | tar -x` into an empty scratch directory (`scratchpad/codeassets/foundation`, 107 files; repo `package.json`; repo `tsconfig.json` minus the Next plugin) gives `tsc --noEmit` exit 0 with no output, and vitest 31/33 files, 201/203 tests passing. The two red tests are exactly the route-coupled guards named below.

```bash
cd "$(git rev-parse --show-toplevel)" && git checkout 20f973a90f3f595833d6a3763ab907abef8e4616 -- src/config/site.ts src/i18n/locale-resolution.ts src/i18n/localized-path.ts src/i18n/proxy-policy.ts src/i18n/request-locale-header.ts src/i18n/request.ts src/i18n/messages.ts src/i18n/locale-html-lang-sync.tsx src/lib/correlation-id.ts src/lib/safe-storage.ts src/lib/routes/route-builder.ts src/features/telemetry/types.ts src/features/telemetry/validation.ts src/features/telemetry/consent-source.ts src/features/test/canonical-key.ts src/features/test/domain src/features/test/entry-policy.ts src/features/test/lazy-validation.ts src/features/test/question-bank.ts src/features/test/question-source-parser.ts src/features/test/response-projection.ts src/features/test/result-view-model.ts src/features/test/schema-registry.ts src/features/test/fixtures src/features/variant-registry/attribute.ts src/features/variant-registry/builder.ts src/features/variant-registry/cross-sheet-integrity.ts src/features/variant-registry/fixture-contract.ts src/features/variant-registry/index.ts src/features/variant-registry/localization.ts src/features/variant-registry/registry-serializer.ts src/features/variant-registry/resolvers.ts src/features/variant-registry/sheets-row-normalizer.ts src/features/variant-registry/source-fixture.ts src/features/variant-registry/types.ts src/features/variant-registry/variant-registry.generated.ts src/features/landing/storage/storage-keys.ts src/messages src/proxy.ts src/app/api/telemetry/route.ts src/app/vercel-analytics-gate.tsx src/app/vercel-speed-insights-gate.tsx scripts/sync/sheets-loader.ts scripts/sync/sync.ts scripts/sync/sync-dry-run.ts tests/unit/helpers/repo.ts tests/unit/cross-sheet-integrity.test.ts tests/unit/landing-telemetry-validation.test.ts tests/unit/locale-alias-parity.test.ts tests/unit/locale-config.test.ts tests/unit/locale-resolution.test.ts tests/unit/localized-path.test.ts tests/unit/message-key-parity.test.ts tests/unit/proxy-policy.test.ts tests/unit/question-source-parser.test.ts tests/unit/reachable-question-copy.test.ts tests/unit/registry-serializer.test.ts tests/unit/request-locale-header.test.ts tests/unit/route-builder.test.ts tests/unit/schema-registry.test.ts tests/unit/sheets-loader.test.ts tests/unit/sheets-row-normalizer.test.ts tests/unit/sync-orchestration.test.ts tests/unit/test-domain-derivation.test.ts tests/unit/test-domain-question-model.test.ts tests/unit/test-domain-result-payload.test.ts tests/unit/test-domain-type-segment.test.ts tests/unit/test-domain-variant-validation.test.ts tests/unit/test-entry-policy.test.ts tests/unit/test-lazy-validation.test.ts tests/unit/test-result-address.test.ts tests/unit/test-result-view-model.test.ts tests/unit/variant-question-bank.test.ts tests/unit/variant-registry-runtime-integrity.test.ts tests/unit/telemetry-route.test.ts tests/unit/vercel-analytics-gate.test.ts tests/unit/vercel-speed-insights-gate.test.ts tests/unit/safe-storage-discipline.test.ts tests/unit/locale-html-lang-sync.test.ts && git status --short | wc -l
```

Post-copy edits the same unit should make (each is small and verified by the carried tests): delete `fixture-contract.ts` and its re-export from `variant-registry/index.ts`; drop the discarded dead exports (§3.7); make `localization.ts` the only locale-fallback function; fix the stale path comments; move `landing/storage/storage-keys.ts` to a neutral module and update its three importers; set `package.json` per §6.5 and regenerate the lockfile. Expected red until the route map exists (measured above): `route-builder.test.ts` (app route parity) and one assertion in `variant-registry-runtime-integrity.test.ts` (test route must import the entry guard); `locale-manifest.test.ts` is left out of the list because it needs the manifest route and a locale layout — carry it with them. These are the guards that force the new routes to be declared, not defects.

---

## 11. Open questions for the owner

1. Does Google Sheets remain the content source for catalog, questions and (future) results? If yes, the next content schema needs stage, colour/category, N-answer columns and a questions artifact that runtime actually reads (F2).
2. Keep Pretendard as the product typeface in the revised design system? (Decides whether 3.1 MB of font assets and the subset pipeline carry.)
3. Is `qmbti` Q6 `poleA: 'I'` for "친구들이랑 같이 이야기하면서 배우는게 좋아" intended? (Scoring content; the prototype flagged it.)
4. Is `/56T-ToDo.html` still needed at this domain?
5. Where should telemetry and friend votes be stored? (Today's endpoint drops everything.)
