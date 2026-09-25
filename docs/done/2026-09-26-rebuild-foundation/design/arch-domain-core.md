# ViveTest rebuild — target architecture, domain-core angle

Proposal, written 2026-09-26 (read-only investigation; nothing under `/Users/woohyeon/Local/ViveTest` or the prototype scratchpad was modified). Inputs were only the prototype (design + interaction) and the legacy **requirements** as classified in `understand/contracts.md` §4, per the owner's mandate. Legacy code was consulted exactly twice, for continuity facts the requirements depend on (the persisted consent value format and the storage key names), and nothing is ported from it. Framework behaviour this design relies on was verified with context7 and, where the docs were silent, by reading the installed Next.js source; §15 lists every verified fact with its source.

Abbreviations: `REQ-T` = `docs/req-test.md`, `REQ-L` = `docs/req-landing.md`, `C§4.x` = `understand/contracts.md` §4.x, `P§x` = `understand/prototype.md` §x, `MOCK/` = the prototype scratchpad, I/J/D = the split / forks / story stages.

---

## 0. The design in twelve sentences

1. All business rules live in a **kernel** of pure TypeScript functions (`src/kernel/`) that cannot see the DOM, React, Next.js, the clock or randomness; the compiler enforces this with a kernel-only `tsconfig` whose `lib` has no DOM, and ESLint forbids framework imports.
2. The test run, the instruction/consent gate, consent itself, telemetry construction, the result codec and history are **explicit state machines or total functions**: `step(state, event, ctx) → { state, effects[] }`, where effects are plain data (persist, clear, emit, schedule, navigate).
3. A small **engine** (`src/engine/`, also framework-free) executes those effects through **ports** (storage, clock, ids, timers, telemetry transport, motion preference) and exposes observable stores; it is the only stateful business code in the app.
4. React owns **no business state**: components read immutable view snapshots through `useSyncExternalStore` and call a handful of typed commands (`answer`, `prev`, `moveTo`, `submit`, `gate`, `previewAnswer`); progress, previous-answer marks, CTA sets, eligibility and locks all arrive precomputed in the view.
5. The prototype's iframe + `postMessage` protocol becomes a **typed stage contract** (props + callbacks), and the three stages are interchangeable renderers of the same `RunView`.
6. "The window" is a **client-owned layer over the mounted landing, driven by the native History API**: opening a card pushes a history entry, answering Q1 replaces it with `/{locale}/test/{variant}`, and Back or the wordmark shrinks it; a hard load of `/{locale}/test/{variant}` renders the same experience full-screen. The parallel + intercepting route the prototype author suggested is rejected for verified reasons (§11 D3).
7. `app/[locale]/layout.tsx` is the **root layout**; `<html lang>` comes from the root param, `next-intl` reads the locale through `next/root-params`, unknown paths fall to `global-not-found.tsx`, and nothing inside `[locale]` ever calls `notFound()`.
8. Locale negotiation, alias redirects and the locale-less allowlist are one pure kernel function that `src/proxy.ts` calls; `next-intl` is used for message formatting only.
9. Test content is **repo-owned typed data** (`content/`) compiled and validated by the kernel at build time, so invalid content can never deploy and the legacy runtime lazy-validation and per-variant fallback layers have nothing left to defend against.
10. Trust boundaries are named and few — URL, storage, network, content build — and each has exactly one codec returning `Result`; nothing else validates defensively.
11. Styling is plain CSS in native cascade layers with one token file (`light-dark()` for themes), global `.vt-*` component skins that the Claude Design bundle loads byte-for-byte, and no Tailwind.
12. Tests follow the layers: exhaustive table-driven kernel tests named by spec rule ID, engine tests with fake ports (including a storage that throws), pure UI-machine tests, and Playwright on a mobile-WebKit-first device matrix for everything React and the browser do.

---

## 1. Scope

This document decides the code architecture of the new `main`: directory layout, module boundaries, dependency rules, the kernel's types and state machines, the engine API the UI consumes, the Next.js route structure, the styling architecture, the test harness shape, the foundation commit and a build order. It does not decide product questions the owner holds (O1–O7 in `understand/critique.md` §5); where one of them touches the architecture, §13 shows the seam that keeps the decision late and cheap.

Assumptions, each stated once and reused: desktop renders the phone column centred (O1 recommendation); content is repo-owned (O3 recommendation (a)); sharing and votes sit behind a port whose implementation arrives with O2; the result page renders the requirement's mandatory sections with placeholder copy until O4; the stack is Next.js ≥ 16.3.6, React 19 (the version Next bundles), TypeScript strict, Vercel Hobby.

---

## 2. Architecture in one picture

```text
                    ┌──────────────────────────── src/app  (Next routes: thin) ───────────────────────────┐
                    │ [locale]/layout.tsx  page.tsx  test/[variant]  result/…  ask/…  api/*  proxy.ts      │
                    └───────┬──────────────────────────────┬────────────────────────────────┬───────────────┘
                            │ server: load + render        │ client: mount UI                │ proxy/route handlers
                            ▼                              ▼                                 ▼
 content/ ──typed by──►┌──────────┐   ┌────────────── src/ui (React) ──────────────┐  ┌── src/platform ──────────┐
 (authored data)       │          │◄──│ landing · window · shell · stages · share  │  │ browser/ (storage, clock,│
                       │  kernel  │   │ instruction · result · chrome · skins/*.css │  │ ids, timers, beacon,    │
                       │  (pure)  │   └──────────────┬──────────────────────────────┘  │ motion, history bridge) │
                       │          │                  │ useSyncExternalStore + commands │ server/ (content loader, │
                       │          │◄──┌──────────────▼──────────────┐◄─── implements ──│ vote store, tel. sink)  │
                       └──────────┘   │ src/engine (stateful, pure  │      ports       │ client-engine.ts (root) │
                                      │ TS): executes kernel effects│                  └─────────────────────────┘
                                      └─────────────────────────────┘
```

**Dependency rules** (arrows point at what a layer may import; everything else is forbidden and enforced by ESLint `no-restricted-imports` per directory, plus the kernel and engine `tsconfig` files that omit the DOM `lib`):

| Layer | May import | Must not import | Must not touch |
|:---|:---|:---|:---|
| `src/kernel/**` | other kernel modules | `react*`, `next*`, `next-intl*`, `@/engine`, `@/platform`, `@/ui`, `@/app`, `content/` | DOM globals (no DOM lib), `Date.now()`, `new Date()` without an argument, `Math.random()`, `crypto`, timers, `fetch` |
| `content/**` | kernel **types** and the `define*` helpers | anything else | — |
| `src/engine/**` | kernel | `react*`, `next*`, `@/platform`, `@/ui`, `@/app` | DOM globals (no DOM lib); only ports reach the outside world |
| `src/platform/**` | kernel, engine (ports + `createEngine`) | `@/ui`, `@/app` | — (this is the only layer that touches browser/server APIs) |
| `src/ui/**` | kernel (types + pure view helpers), engine (public types), `@/platform/client-engine` (provider only) | other `@/platform/*`, `@/app` | `localStorage`, `sessionStorage`, `fetch` for business data, `history.*` (except via the window's history bridge port) |
| `src/app/**` | everything above | engine internals | business logic (a route resolves params, calls the kernel, renders UI) |

Why this shape: the diagnosis of the old repo (`mess-diagnosis.md` §1) is that rules lived in six to nine places and guards checked copies of them. Here every rule has one home (a kernel function with one test file), the UI cannot re-implement a rule because it never receives the inputs a rule needs (it receives the rule's output), and the boundaries are mechanical rather than written in prose.

---

## 3. Repository layout

```text
/
├─ AGENTS.md                      # slim contract (≤ ~150 lines); derived facts only
├─ .claude/CLAUDE.md              # pointer to AGENTS.md
├─ .claude/settings.json
├─ .github/workflows/ci.yml       # lint → typecheck → unit → build → e2e (preview) ; pixel checks in Linux container
├─ docs/
│  ├─ spec/domain.md              # test semantics — rule IDs DOM-*
│  ├─ spec/platform.md            # routes, locales, rendering, 404, SEO, budgets — PLT-*
│  ├─ spec/privacy-telemetry.md   # consent, events, storage keys, analytics — PRV-*
│  ├─ spec/content.md             # content model, compile rules, palettes, stage field — CNT-*
│  ├─ spec/experience.md          # prototype formalised: window, shell, stages, motion, a11y — EXP-*
│  ├─ spec/sharing.md             # ask links, votes, story cards, OG — SHR-*
│  ├─ design/system.md            # visual spec, token NAMES only
│  ├─ DECISIONS.md                # why, and what was rejected (fresh ID prefix)
│  └─ plans/                      # active plans only
├─ content/                       # authored product data — no logic
│  ├─ schemas.ts                  # code-owned scoring schemas + variant → schema map (REQ-T §2.1)
│  ├─ variants/<variant-id>.ts    # one test per file: attribute, stage, palette, meta, 12-locale text, questions
│  ├─ blog/<slug>.ts              # articles (structured, localized)
│  ├─ results/<variant-id>.ts     # result copy per type segment (arrives with O4)
│  └─ catalog.ts                  # the ONE ordered list of catalog entries (tests + blog)
├─ messages/<locale>.json         # UI chrome copy (next-intl), 12 files
├─ public/fonts/…                 # Pretendard subsets + OFL.txt
├─ src/
│  ├─ kernel/                     # PURE — see §4
│  │  ├─ tsconfig.json            # lib: ["ES2023"], types: []  → no DOM, no node
│  │  ├─ index.ts                 # public surface
│  │  ├─ core/        {ids.ts, result.ts}
│  │  ├─ locale/      {locales.ts, negotiate.ts, route-request.ts, format.ts}
│  │  ├─ content/     {model.ts, define.ts, compile.ts, errors.ts}
│  │  ├─ catalog/     {catalog.ts}
│  │  ├─ scoring/     {completeness.ts, derive.ts}
│  │  ├─ run/         {types.ts, entry.ts, gate.ts, machine.ts, view.ts}
│  │  ├─ consent/     {consent.ts}
│  │  ├─ telemetry/   {events.ts, validate.ts}
│  │  ├─ result/      {codec.ts, view.ts}
│  │  ├─ history/     {history.ts}
│  │  ├─ share/       {ask.ts, tally.ts}
│  │  ├─ stage/       {resolve.ts}
│  │  ├─ palette/     {color.ts, look.ts, answer-colors.ts}
│  │  └─ storage/     {keys.ts, codecs.ts}
│  ├─ engine/                     # STATEFUL, framework-free — see §5
│  │  ├─ tsconfig.json            # lib: ["ES2023"] → no DOM
│  │  ├─ ports.ts  store.ts  effects.ts
│  │  ├─ consent-store.ts  preferences-store.ts  telemetry-pipeline.ts
│  │  ├─ test-session.ts  history-store.ts  votes-store.ts
│  │  └─ index.ts                 # createEngine(ports): Engine
│  ├─ platform/                   # adapters — the only code touching browser/server APIs
│  │  ├─ browser/  {safe-storage.ts, clock.ts, ids.ts, timers.ts, beacon.ts, motion.ts, history-bridge.ts}
│  │  ├─ server/   {content.ts, token-values.ts, vote-store.ts, telemetry-sink.ts}   # 'server-only'
│  │  ├─ pre-paint.ts             # inline bootstrap source (theme, consent) built from kernel storage keys
│  │  └─ client-engine.tsx        # composition root: EngineProvider + getEngine()
│  ├─ ui/                         # React — see §7
│  │  ├─ hooks/       {use-store.ts}
│  │  ├─ primitives/  {dialog.tsx, input-gate.ts, press.ts, sheet.tsx}
│  │  ├─ experience/  {test-experience.tsx}          # shell + stage + instruction + share, host-agnostic
│  │  ├─ shell/       {shell.tsx, top-bar.tsx, progress-rail.tsx, story-bar.tsx, bottom-controls.tsx, answer-tokens.tsx}
│  │  ├─ instruction/ {instruction-dialog.tsx}
│  │  ├─ stages/      {contract.ts, load.ts, split/, forks/, story/}
│  │  ├─ window/      {window-machine.ts, window-host.tsx}
│  │  ├─ landing/     {landing.tsx, deck.tsx, card.tsx, field/, list.tsx}
│  │  ├─ share/       {share-sheet.tsx, story-card.ts, vote-line.tsx, friend-page.tsx}
│  │  ├─ result/  recovery/  history/  blog/  chrome/ {gnb.tsx, menu.tsx, consent-banner.tsx}
│  │  └─ skins/       {tokens.css, base.css, shell.css, instruction.css, share.css, deck.css, …}  # .vt-* global skins
│  ├─ app/                        # Next routes — see §8
│  ├─ i18n/request.ts             # next-intl getRequestConfig via next/root-params
│  └─ proxy.ts
├─ tests/
│  ├─ kernel/   (vitest, node)    # one file per kernel module; test names carry spec rule IDs
│  ├─ engine/   (vitest, node)    # fake ports
│  ├─ ui-machines/ (vitest, node) # window machine, input gate
│  ├─ content/  (vitest, node)    # compiles content/ with the kernel; palette contrast invariants
│  └─ e2e/      (playwright)      # mobile-webkit primary
├─ eslint.config.mjs  next.config.ts  playwright.config.ts  vitest.config.ts  tsconfig.json  package.json
└─ scripts/design/bundle.ts       # Claude Design bundle from real CSS + gallery export (later step)
```

`content/` sits at the root, beside `src/`, on purpose: it is data, an importer (if the owner ever keeps Sheets, O3 (b)) writes only there, and a reviewer sees content-only diffs as content-only. It is imported through the `@content/*` path alias and may import kernel types only.

No monorepo packages. One app, one deploy; a `packages/kernel` workspace would add a build graph, a second `package.json` and publish-shaped friction for zero isolation gain over the two structural checks (DOM-less `tsconfig` + ESLint boundaries).

---

## 4. The kernel

### 4.1 Rules for kernel code

- **Pure.** Every exported function is deterministic in its arguments. Time arrives as `now: EpochMs`, identifiers arrive pre-generated in a context object, randomness never enters. This is what makes StrictMode replays, back/forward, resume and cross-tab re-entry provable by unit test instead of observable only in a browser.
- **Total.** Functions return `Result<T, E>` with enumerated error codes instead of throwing; the only throw sites in the app are the content loader at build time (content invalid → build fails) and genuine programmer errors.
- **Transitions are data.** A state machine exposes `step(state, event, ctx) → { state, effects }`. Effects are a closed union of plain objects the engine executes. A rule such as "Escape writes nothing" is then a test asserting `effects.length === 0`, and "cleanup is atomic" is one `clearRun` effect executed as one batch.
- **Validation happens at trust boundaries only.** The kernel owns one codec per boundary — result URL (§4.10), storage records (§4.14), telemetry payloads (§4.9), share URL (§4.12), content build (§4.3). Values that crossed a codec are typed and are never re-checked downstream. This replaces the old repo's scattered defensive checks with four places a reviewer can read.
- **No display text in domain types.** Questions carry indices, option keys and poles; localized text is a separate `VariantText` lookup (REQ-T §3.8).
- **Small files.** One concept per file, typically 80–250 lines, never above ~400.

### 4.2 Vocabulary (`core/ids.ts`, `core/result.ts`)

```ts
export type Brand<T, B extends string> = T & { readonly __brand: B };

export type VariantId      = Brand<string, 'VariantId'>;
export type SchemaId       = Brand<string, 'SchemaId'>;
export type RunId          = Brand<string, 'RunId'>;
export type BoxId          = Brand<string, 'BoxId'>;        // ask-link vote box
export type QuestionIndex  = Brand<number, 'QuestionIndex'>; // canonical, 1-based, over ALL questions (REQ-T §3.1)
export type ScoringOrdinal = Brand<number, 'ScoringOrdinal'>;// 1-based over scoring questions = user-facing Qn
export type Pole           = Brand<string, 'Pole'>;
export type AxisId         = Brand<string, 'AxisId'>;        // poleA + poleB
export type EpochMs        = Brand<number, 'EpochMs'>;
export type Hex            = Brand<string, 'Hex'>;           // #rrggbb

export const CHOICE_KEYS = ['A', 'B', 'C', 'D'] as const;
export type ChoiceKey = (typeof CHOICE_KEYS)[number];

export type Result<T, E> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };
```

The two index spaces the requirements insist on never mixing (canonical index vs scoring ordinal) are distinct brands, so passing one where the other is expected is a compile error rather than a telemetry bug.

### 4.3 Content model, definition and compile (`content/`)

Authors write `VariantSource` records with `defineVariant()`; the kernel compiles all sources in one call and either returns a fully typed `Content` or every error at once.

```ts
export type Attribute = 'available' | 'unavailable' | 'hide' | 'opt_out' | 'debug';
export type StageId   = 'split' | 'forks' | 'story';              // I · J · D

export interface VariantSource {
  readonly id: string;
  readonly attribute: Attribute;
  readonly schema: string;                          // key into content/schemas.ts
  readonly stage?: StageId;                         // owner-assigned at launch; default 'split'
  readonly palette: PaletteSource;                  // { base, hi, look?, answerColors? }
  readonly meta: { minutes: number; completedCount: number; sharedCount: number };
  readonly text: Localized<{ title: string; subtitle?: string; instruction: string }>;
  readonly questions: readonly QuestionSource[];    // authoring order = canonical order
}
export type QuestionSource =
  | { readonly kind: 'scoring'; readonly emoji?: string; readonly prompt: Localized<string>;
      readonly options: readonly { readonly pole: string; readonly text: Localized<string> }[] }   // 2..4 options
  | { readonly kind: 'profile'; readonly prompt: Localized<string>;
      readonly options: readonly { readonly token: string; readonly text: Localized<string> }[] };

export interface SchemaSource {
  readonly axes: readonly { poleA: string; poleB: string; scoringMode: 'binary_majority' }[];
  readonly qualifierFields?: readonly { key: string; questionIndex: number; values: readonly string[]; tokenLength: number }[];
  readonly supportedSections?: readonly ('trait_list')[];
}
```

Compiled, runtime-facing types (display text excluded):

```ts
export type Question =
  | { readonly kind: 'scoring'; readonly index: QuestionIndex; readonly ordinal: ScoringOrdinal;
      readonly axis: AxisId; readonly options: readonly { readonly key: ChoiceKey; readonly pole: Pole }[] }
  | { readonly kind: 'profile'; readonly index: QuestionIndex;
      readonly options: readonly { readonly key: ChoiceKey; readonly token: string }[] };

export interface Schema {
  readonly id: SchemaId;
  readonly axes: readonly { readonly id: AxisId; readonly poleA: Pole; readonly poleB: Pole }[]; // length ∈ {1,2,4}
  readonly qualifierFields: readonly QualifierField[];
  readonly sections: readonly SectionId[];          // mandatory three + declared optional
}
export interface Variant {
  readonly id: VariantId; readonly attribute: Attribute; readonly schema: Schema;
  readonly stage: StageId; readonly palette: Palette; readonly meta: VariantMeta;
  readonly questions: readonly Question[];          // canonical
  readonly scoring: readonly QuestionIndex[];       // canonical index of each scoring ordinal
  readonly structureHash: string;                   // FNV-1a of schema + question kinds/options/poles
}
export interface Content {
  readonly catalog: readonly CatalogEntry[];
  variant(id: string): Variant | undefined;
  text(id: VariantId, locale: Locale): VariantText; // resolved with en fallback (REQ-F-026)
  blog(slug: string, locale: Locale): BlogArticle | undefined;
}
export function compileContent(src: ContentSource): Result<Content, readonly ContentError[]>;
```

**Answer model decision (2–4 options, binary scoring unchanged).** Every scoring option carries a pole of its question's axis; `binary_majority` counts poles exactly as before, so a 3- or 4-option question is well-defined today (e.g. A→E, B→E, C→I, D→I) and the odd-count rule still guarantees no tie. This satisfies the owner's 「유연한 구조」 with no invented semantics. A future scoring mode where options are categories rather than poles is a new `scoringMode` value, added when the first such test exists (O5).

**Compile-time rules** (each becomes a `ContentError` code and a `CNT-*` rule): empty question set; `axes.length ∉ {1,2,4}`; duplicate axis; a scoring question whose option poles do not match exactly one axis bidirectionally; an axis pole unreachable from some question (every scoring question needs ≥ 1 option per pole); option count outside 2–4; even scoring-question count on a `binary_majority` axis (profile excluded); qualifier field pointing at a missing or scoring question; duplicate qualifier key; empty `values`, `tokenLength ≤ 0` or a value whose length ≠ `tokenLength`; duplicate qualifier value; missing `en` text anywhere; a test variant without its own instruction text (REQ-L §13.5 verification 9 — no generic fallback); **stage `forks` assigned to a test with any question of more than two options** (the prototype silently opened such tests in I; here the owner's stage choice is either honoured or rejected loudly, never overridden invisibly).

**Where compile runs.** `src/platform/server/content.ts` calls `compileContent` once (memoised) and throws a formatted error list if it fails; every statically generated page imports it, so `next build` fails on invalid content. `tests/content/compile.test.ts` runs the same call for readable diagnostics in the unit gate. This single build-time gate is what satisfies REQ-T §2.4–§2.5 (no partial activation, last-known-good, invalid variants never served): the last known good is simply the deployment that is already live. The runtime never re-validates content.

### 4.4 Catalog (`catalog/catalog.ts`)

```ts
export type CatalogEntry =
  | { readonly kind: 'test'; readonly id: VariantId; readonly attribute: Attribute }
  | { readonly kind: 'blog'; readonly slug: string };

export const isEnterable = (a: Attribute): boolean => a === 'available' || a === 'opt_out';
export function visibleCatalog(c: readonly CatalogEntry[], consent: ConsentState, audience: 'public' | 'qa'): readonly CatalogEntry[];
export function hiddenByConsent(c: readonly CatalogEntry[], consent: ConsentState): number;   // OPTED_OUT notice row count
export function entryDecision(content: Content, raw: string, audience: 'public' | 'qa'):
  | { kind: 'enter'; variant: Variant } | { kind: 'recover'; raw: string };
export function recoveryCards(c: readonly CatalogEntry[], completed: ReadonlySet<VariantId>, max = 2): readonly VariantId[];
```

`visibleCatalog` implements the REQ-L §13.9 matrix (OPTED_OUT hides `available`; `opt_out` always shown; `unavailable` shown as coming soon; `hide`/`debug` public-invisible). `entryDecision` is the single answer to "may this id start a run" (REQ-T §3.2, §6.1): anything but an enterable id — unknown, `hide`, `unavailable`, `debug` outside the QA audience — recovers. `audience` is `'qa'` only on non-production Vercel environments, derived once in the platform layer.

### 4.5 Locale (`locale/*`)

```ts
export const LOCALES = ['en', 'kr', 'zs', 'zt', 'ja', 'es', 'fr', 'pt', 'de', 'hi', 'id', 'ru'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export type Localized<T> = { readonly en: T } & { readonly [L in Exclude<Locale, 'en'>]?: T };
export const pick = <T>(v: Localized<T>, l: Locale): T => v[l] ?? v.en;

export function isLocale(s: string): s is Locale;
export function displayTag(l: Locale): string;                 // kr→ko, zs→zh-Hans, zt→zh-Hant, else identical
export function resolveAlias(segment: string): Locale | null;  // /ko, /zh-Hans, /en-US, /jp, /zh-TW …; never a canonical code
export function negotiate(i: { cookie?: string; acceptLanguage?: string }): Locale; // cookie → Accept-Language → en
export function formatCount(n: number, l: Locale): string;     // Intl.NumberFormat(displayTag(l)); no k/m abbreviation

export type RouteDecision =
  | { readonly kind: 'pass'; readonly setLocaleCookie?: Locale }
  | { readonly kind: 'redirect'; readonly location: string };
export function routeRequest(r: { pathname: string; search: string; cookie?: string; acceptLanguage?: string }): RouteDecision;
```

`routeRequest` is the whole proxy policy (REQ-L §5.2–§5.3): `/` → negotiated locale; a first segment that is an alias → canonical redirect (region subtags stripped right to left; `zh-tw/hk/mo` → `zt`); a locale-less path on the allowlist (`/blog`, `/blog/{slug}`, `/history`, `/test/{variant}`) → locale injected; a valid locale prefix → pass and refresh the `NEXT_LOCALE` cookie; everything else → pass (the route table then 404s it outside `[locale]`). Duplicate prefixes (`/en/kr/…`) need no rule because no route matches them. The alias table is data inside `locale/negotiate.ts`, restated from the legacy definition during spec extraction.

### 4.6 Scoring (`scoring/*`)

```ts
export type ResponseMap = Readonly<Record<number /* QuestionIndex */, ChoiceKey | string /* qualifier token */>>;
declare const complete: unique symbol;
export type CompleteResponses = ResponseMap & { readonly [complete]: true };

export function completeness(v: Variant, r: ResponseMap): Result<CompleteResponses, { missing: readonly ScoringOrdinal[] }>;

export interface AxisScore { readonly poleA: Pole; readonly poleB: Pole; readonly counts: Readonly<Record<string, number>>; readonly dominant: Pole }
export type ScoreStats = Readonly<Record<string /* AxisId, schema order */, AxisScore>>;
export interface Derivation { readonly scoreStats: ScoreStats; readonly derivedType: string; readonly typeSegment: string }

export function derive(v: Variant, r: CompleteResponses): Derivation;   // TOTAL: no error branch
```

Projection (choice key → pole; qualifier token checked against `values`) happens inside `derive`, so raw runtime responses can never reach score computation (REQ-T §3.8). `derive` accepts only `CompleteResponses`, a type obtainable only from `completeness`, and content is validated at build (odd counts, pole coverage, qualifier specs), so derivation **cannot fail**. The requirement's derivation-failure state (REQ-T §6.7, §4.7 back-from-loading after failure) therefore has no reachable trigger and is not implemented; the type system is the proof. Back-from-loading itself (user-initiated, §4.7) is kept.

### 4.7 The run state machine (`run/*`)

This is the heart of the domain: entry classification, the instruction/consent/qualifier gate, runtime entry commit, answering with the 150 ms lock and advance-one revisit, progress and eligibility, submission and result commit with volatility.

#### 4.7.1 Persisted records

```ts
export interface StagedEntry {              // sessionStorage — landing ingress (REQ-T §3.5, REQ-L §13.4)
  readonly v: 1; readonly variant: VariantId; readonly choice: ChoiceKey; readonly createdAt: EpochMs;
}
export interface RunRecord {                // localStorage — the active run (REQ-T §3.1, §3.7)
  readonly v: 1; readonly variant: VariantId; readonly runId: RunId; readonly structureHash: string;
  readonly ingress: boolean;                // landing_ingress_flag for the life of the run
  readonly responses: ResponseMap;          // canonical index → key | qualifier token
  readonly startedAt: EpochMs; readonly lastAnswerAt: EpochMs;
  readonly dwellMs: Readonly<Record<number, number>>;  // accumulated per question, incl. revisits (REQ-L §13.7)
  readonly attemptStarted: boolean;         // attempt_start emitted once per run (REQ-T §3.7 idempotence)
  readonly asks: Readonly<Record<number, BoxId>>;      // ask links created during this run (§4.12)
}
```

The record has no "current question" field. The requirements define resume position as "first unanswered after the last confirmed answer", and moving between questions must neither read nor write the response set (REQ-T §3.9), so the cursor is session memory only.

#### 4.7.2 Entry classification (`run/entry.ts`)

```ts
export type EntryPlan =
  | { readonly path: 'landingIngress'; readonly staged: StagedEntry; readonly previousRun: RunRecord | null }
  | { readonly path: 'directResume';   readonly run: RunRecord; readonly showGate: boolean }
  | { readonly path: 'directCold';     readonly discard: DiscardReason | null };
export type DiscardReason = 'timeout' | 'structureChanged' | 'qualifierInvalid' | 'completed';

export function classifyEntry(i: {
  readonly variant: Variant; readonly now: EpochMs;
  readonly staged: StagedEntry | null; readonly run: RunRecord | null; readonly instructionSeen: boolean;
}): EntryPlan;
```

Rules, all from REQ-T §3.3–§3.7 unless noted: a staged entry for this variant beats an active run (restart intent; the old run survives until commit succeeds); a run is a valid active run iff its last answer is < 30 min old at `now`, its qualifier tokens are in the allowed values, and **its `structureHash` equals the variant's** — a content deploy that changed the question structure turns an in-flight run into an expired one (volatilise, Direct Cold) rather than the legacy blocking error mid-flow (REQ-T §2.6 reinterpreted, recorded as a decision); an invalid run produces `directCold` with a `discard` reason and the engine emits the §6.8 cleanup; `showGate` for a resume is `!instructionSeen` (qualifier variants resume without the gate only with a valid qualifier and `instructionSeen`).

A staged entry older than 7 minutes is **dropped at classification** (Direct Cold, no warning — REQ-T §3.5 target contract, implemented here because the kernel has the clock for free). If it expires while the gate is already open, the commit fails into `commitFailed` (REQ-T §3.4, §6.6) with the three required actions.

#### 4.7.3 The gate (`run/gate.ts`)

```ts
export type GateAction = 'start' | 'accept_all_and_start' | 'deny_and_start' | 'deny_and_abandon' | 'keep_current_preference';
export type GateNote = 'none' | 'unknownAvailable' | 'unknownOptOut' | 'optedOutAvailable';

export interface GateSpec {
  readonly note: GateNote;
  readonly primary: GateAction;                       // visible label 'next' when the variant has qualifiers
  readonly secondary: GateAction | null;
}
export function gateSpec(i: { ingress: boolean; consent: ConsentState; attribute: 'available' | 'opt_out' }): GateSpec;

export interface GateEffectSpec {                     // what a CTA does, before routing to qualifier or commit
  readonly consentWrite: 'OPTED_IN' | 'OPTED_OUT' | null;
  readonly recordsInstructionSeen: boolean;
  readonly outcome: 'proceed' | 'exit';
}
export const GATE_EFFECTS: Readonly<Record<GateAction, GateEffectSpec>>;
```

`gateSpec` is the REQ-L §13.5 table as a function (12 rows including the unreachable `landing ingress + OPTED_OUT + available`, which the catalog filter already prevents and which therefore maps to plain `start`). `GATE_EFFECTS` is the "CTA action invariants" list. The modal UI receives the spec and renders; it cannot reorder or reinterpret an action.

#### 4.7.4 State, events, effects (`run/types.ts`, `run/machine.ts`)

```ts
export type Phase =
  | { readonly tag: 'booting' }
  | { readonly tag: 'preview' }                                             // window host, Q1 on the card
  | { readonly tag: 'gate'; readonly plan: EntryPlan; readonly step: GateStep; readonly draft: Readonly<Record<string, string>> }
  | { readonly tag: 'commitFailed' }                                        // staged entry expired while gated
  | { readonly tag: 'answering' }
  | { readonly tag: 'deriving'; readonly href: ResultHref; readonly since: EpochMs }
  | { readonly tag: 'done'; readonly href: ResultHref }
  | { readonly tag: 'exited' };                                             // deny-and-abandon / keep-preference / home
export type GateStep = { readonly kind: 'instruction' } | { readonly kind: 'qualifier'; readonly field: number };

export interface RunState {
  readonly variant: VariantId;
  readonly phase: Phase;
  readonly run: RunRecord | null;          // null until commit (or resume)
  readonly staged: StagedEntry | null;
  readonly cursor: ScoringOrdinal;
  readonly lockedUntil: EpochMs | null;    // 150 ms answer lock (REQ-T §4.3)
  readonly enteredAt: EpochMs;             // dwell accounting for the current question
  readonly last: Transition | null;        // why the cursor last moved — lets stages pick motion without guessing
}
export type Transition = { readonly from: ScoringOrdinal; readonly to: ScoringOrdinal; readonly cause: 'answer' | 'prev' | 'jump' | 'resume' | 'commit' };

export type RunEvent =
  | { readonly type: 'boot'; readonly stored: { staged: StagedEntry | null; run: RunRecord | null; instructionSeen: boolean }; readonly host: 'window' | 'page' }
  | { readonly type: 'previewAnswer'; readonly choice: ChoiceKey }         // window Q1 = landing card answer
  | { readonly type: 'gate'; readonly action: GateAction | 'escape' | 'back' }
  | { readonly type: 'qualifier'; readonly token: string }
  | { readonly type: 'qualifierNext' }
  | { readonly type: 'answer'; readonly choice: ChoiceKey }
  | { readonly type: 'advanceDue' }                                        // scheduled 150 ms after a non-last answer
  | { readonly type: 'moveTo'; readonly ordinal: ScoringOrdinal }          // prev = moveTo(cursor - 1)
  | { readonly type: 'submit' }
  | { readonly type: 'minLoadingElapsed' }
  | { readonly type: 'backFromLoading' }
  | { readonly type: 'commitFailure'; readonly action: 'retryFresh' | 'resumePrevious' | 'home' };

export interface RunContext {
  readonly variant: Variant; readonly now: EpochMs; readonly consent: ConsentState;
  readonly locale: Locale; readonly freshRunId: RunId;                    // engine pre-generates; unused unless committing
  readonly minDerivationMs: number;                                        // EXP spec value (O4/O5); 0 allowed
}

export type Effect =
  | { readonly type: 'writeStaged'; readonly entry: StagedEntry }
  | { readonly type: 'dropStaged'; readonly variant: VariantId }
  | { readonly type: 'writeRun'; readonly record: RunRecord }
  | { readonly type: 'clearRun'; readonly variant: VariantId; readonly keepInstructionSeen: boolean } // atomic cleanup set (REQ-T §8.3)
  | { readonly type: 'setInstructionSeen'; readonly variant: VariantId }
  | { readonly type: 'setConsent'; readonly value: 'OPTED_IN' | 'OPTED_OUT' }
  | { readonly type: 'emit'; readonly event: TelemetryDraft }
  | { readonly type: 'history'; readonly op: 'start' | 'complete'; readonly variant: VariantId; readonly startedAt: EpochMs; readonly at: EpochMs }
  | { readonly type: 'schedule'; readonly key: 'advance' | 'minLoading'; readonly afterMs: number }
  | { readonly type: 'cancel'; readonly key: 'advance' | 'minLoading' }
  | { readonly type: 'navigate'; readonly to: ResultHref; readonly mode: 'replace' }
  | { readonly type: 'exit'; readonly to: 'landing' };

export function initial(variant: VariantId, now: EpochMs): RunState;
export function step(s: RunState, e: RunEvent, ctx: RunContext): { readonly state: RunState; readonly effects: readonly Effect[] };
```

#### 4.7.5 Transition table (the rules, in one place)

| From | Event | Guard | To | Effects | Source |
|:---|:---|:---|:---|:---|:---|
| booting | boot (host=window) | — | preview | — | EXP window; REQ-L §8.6 entry = answer |
| booting | boot (host=page) | `classifyEntry` | gate / answering (resume, no gate) / answering (auto-commit: no qualifier ∧ instructionSeen) | discard ⇒ `clearRun(keepSeen=false)` | REQ-T §3.3, §3.6, §6.8 |
| preview | previewAnswer(c) | not locked | gate(landingIngress); or straight to commit ↓ when `instructionSeen` ∧ no qualifier ∧ `gateSpec` is plain `start` | `writeStaged`, `emit card_answered` | REQ-L §13.4, §12.1, §13.5; REQ-T §3.6 auto-commit |
| gate(instruction) | gate(escape) | — | same | **none** | REQ-T §3.6 (BQ-41) |
| gate(instruction) | gate(a ∈ proceed) | a ∈ spec | gate(qualifier 1) if qualifiers, else commit ↓ | `setConsent?`, `setInstructionSeen` | REQ-L §13.5 CTA invariants |
| gate(instruction) | gate(deny_and_abandon) | a = spec.secondary | exited | `setConsent OPTED_OUT`, `dropStaged`, `exit` | REQ-L §13.5 |
| gate(instruction) | gate(keep_current_preference) | a = spec.secondary | exited | `dropStaged`, `exit` | REQ-L §13.5 |
| gate(qualifier k) | qualifier(t) | t ∈ values | same (draft) | none | REQ-T §3.6 |
| gate(qualifier k) | gate(back) / gate(escape) | — | qualifier k−1 or instruction | none | REQ-T §3.6 |
| gate(qualifier last) | qualifierNext | draft complete | commit ↓ | — | REQ-T §3.4 |
| **commit** | (internal) | landingIngress ∧ staged expired | commitFailed | none | REQ-T §3.4, §6.6 |
| **commit** | (internal) | ok | answering at first runtime question (ingress: ordinal 2; else 1) | `clearRun(prev, keepSeen=false)` if replacing, `writeRun` (fresh responses: seed + qualifiers only), `dropStaged`, `history start`, `emit attempt_start` (canonical index) | REQ-T §3.4, §4.2, §9.1 |
| commitFailed | retryFresh / resumePrevious / home | resumePrevious re-validates the old run | booting→… / answering / exited | per branch | REQ-T §6.6 |
| answering | answer(c) | not locked; not last | same, lock 150 ms, selected=c | `writeRun` (response, lastAnswerAt, dwell), `emit question_answered` (scoring ordinal, choice, dwell), `schedule advance 150` | REQ-T §4.3, §9.1 |
| answering | answer(c) | not locked; last | same (stays selected) | `writeRun` | REQ-T §4.4 |
| answering | advanceDue | — | cursor = cursor + 1 (**advance exactly one**) | none | owner round 2 (replaces REQ-T §4.3 destination) |
| answering | moveTo(o) | 1 ≤ o ≤ frontier | cursor = o | `cancel advance`; **no storage read/write** | REQ-T §3.9 |
| answering | submit | eligible | deriving (or done if minMs = 0) | `emit final_submit`, `schedule minLoading` | REQ-T §4.4–§4.6 |
| deriving | minLoadingElapsed | — | done | `clearRun(keepSeen=false)`, `history complete`, `navigate replace` | REQ-T §4.6, §6.8, §5.2 |
| deriving | backFromLoading | — | answering at last question | `cancel minLoading` | REQ-T §4.7 |

Derived facts (in `run/view.ts`, never recomputed in React): `frontier` = first unanswered scoring ordinal, or the last ordinal when all are answered; `eligible` = every scoring question answered (the last included) and phase `answering`; progress = answered scoring / total scoring with the landing answer counted (REQ-T §3.9); option state per question = `selected` during the lock and on the last question, `marked` (previous answer, announced as text) on any other revisited question, otherwise `none` (REQ-T §4.3–§4.4). No transition removes an answer; the only answer-reducing path in the requirements (qualifier re-entry via a recap chip) is optional ("…표시할 수 있다", REQ-T §3.6) and is not built, because it would be a new interactive element during a test (owner principle 3).

#### 4.7.6 The view the UI renders (`run/view.ts`)

```ts
export interface RunView {
  readonly phase: Phase['tag'];
  readonly question: {
    readonly ordinal: ScoringOrdinal; readonly index: QuestionIndex; readonly isLast: boolean;
    readonly options: readonly { readonly key: ChoiceKey; readonly state: 'none' | 'selected' | 'marked' }[];
  } | null;                                           // null while booting / in commitFailed
  readonly total: number; readonly frontier: ScoringOrdinal;
  readonly progress: { readonly answered: number; readonly percent: number; readonly choices: readonly (ChoiceKey | null)[] };
  readonly inputLocked: boolean; readonly canPrev: boolean; readonly canSubmit: boolean;
  readonly gate: { readonly step: GateStep; readonly spec: GateSpec; readonly primaryLabel: 'start' | 'acceptAllAndStart' | 'next';
                   readonly landingAnswer: ChoiceKey | null; readonly draft: Readonly<Record<string, string>> } | null;
  readonly last: Transition | null;
  readonly degraded: boolean;                         // storage refused writes: this visit only (REQ-T §8.2)
}
export function view(s: RunState, v: Variant, now: EpochMs, degraded: boolean): RunView;
```

### 4.8 Consent (`consent/consent.ts`)

```ts
export type ConsentState = 'UNKNOWN' | 'OPTED_IN' | 'OPTED_OUT';
export function parseStoredConsent(raw: string | null): ConsentState;   // 'OPTED_IN'|'OPTED_OUT' (legacy format) else UNKNOWN
export function transmission(c: ConsentState): 'send' | 'hold' | 'drop'; // IN send · UNKNOWN hold · OUT drop
export interface ConsentChange { readonly next: ConsentState; readonly invalidateIds: boolean; readonly flush: 'send' | 'drop' | 'none' }
export function decide(current: ConsentState, choice: 'OPTED_IN' | 'OPTED_OUT'): ConsentChange;
export function recall(current: ConsentState): { readonly previous: ConsentState; readonly closable: true }; // recall never writes
```

`decide` encodes REQ-L §12.4 (opt-out invalidates anonymous IDs and drops the held queue; opt-in flushes). SSR and the first hydration pass render `UNKNOWN` (§7.1); the analytics gate reads the same store.

### 4.9 Telemetry (`telemetry/*`)

```ts
export type TelemetryDraft =
  | { readonly type: 'landing_view' }
  | { readonly type: 'card_answered'; readonly sourceVariant: VariantId; readonly targetRoute: string }
  | { readonly type: 'attempt_start'; readonly ingress: boolean; readonly questionIndex: QuestionIndex }
  | { readonly type: 'question_answered'; readonly ingress: boolean; readonly ordinal: ScoringOrdinal; readonly choice: ChoiceKey; readonly dwellMs: number }
  | { readonly type: 'final_submit'; readonly variant: VariantId; readonly questionIndex: QuestionIndex; readonly dwellMsAccumulated: number;
      readonly ingress: boolean; readonly finalResponses: Readonly<Record<number, ChoiceKey>> }            // scoring only
  | { readonly type: 'result_viewed'; readonly variant: VariantId; readonly typeSegment: string }
  | { readonly type: 'share_clicked'; readonly kind: 'ask' | 'path' | 'palette'; readonly questionIndex?: QuestionIndex } // reserved names (REQ-F-016)
  | { readonly type: 'share_copied'; readonly kind: 'ask' | 'path' | 'palette' };

export interface Common { eventId: string; sessionId: string | null; tsMs: number; locale: Locale; route: string; consent: ConsentState }
export function finalize(d: TelemetryDraft, c: Common): TelemetryEvent;                // snake_case wire shape
export function validateEvent(x: unknown): Result<TelemetryEvent, TelemetryError>;    // shared with /api/telemetry
```

The draft union makes the payload-hygiene rules structural: there is no field that could carry question text, free text or an IP, and the legacy forbidden keys (`transition_id`, `result_reason`, `final_q1_response`) are rejected by `validateEvent` because unknown keys are rejected. `session_id` may be null only before `attempt_start` (transport-patch model, REQ-T §9.2), enforced in `validateEvent` per event type. Index semantics (canonical for `attempt_start`/`final_submit`, scoring ordinal for `question_answered`) are the brand types of §4.2. `choice` widens to `A`–`D` with the 2–4 option model.

### 4.10 Result URL codec and view (`result/*`)

```ts
export type ResultHref = Brand<string, 'ResultHref'>;   // /{locale}/result/{variant}/{type}?{base64url(JSON)}
export function encodeResult(l: Locale, v: Variant, d: Derivation, shared: boolean): ResultHref;

export type ResultError =
  | 'MISSING_VARIANT' | 'MISSING_TYPE' | 'MISSING_PAYLOAD' | 'BASE64_INVALID' | 'JSON_INVALID'
  | 'SCORESTATS_MISSING' | 'UNKNOWN_VARIANT' | 'TYPE_LENGTH_MISMATCH' | 'QUALIFIER_VALUE_INVALID'
  | 'SCORESTATS_SCHEMA_MISMATCH' | 'SHARED_NOT_BOOLEAN';
export interface ResultView {
  readonly variant: VariantId; readonly typeSegment: string; readonly derivedType: string;
  readonly qualifiers: Readonly<Record<string, string>>; readonly scoreStats: ScoreStats;
  readonly audience: 'own' | 'shared';               // REQ-T §5.2 cases 1/2 (case 3 = 2 until history can match, AR-006)
}
export function resolveResultView(content: Content, i: { variant?: string; type?: string; rawQuery: string }): Result<ResultView, ResultError>;
```

The wire format is **byte-compatible with the links already in the wild** (REQ-T §5.1; critique G11): URL-safe base64 without padding of `JSON.stringify({ scoreStats, shared })` in schema axis order, as the keyless query string. Validation follows the required order (decode → parse → schema → type segment) and each failure is a distinct code, so the result page can expose the branch it took as `data-result-branch` for E2E (REQ-T §6.3 verification 7). "No partial render" is structural: the page receives either a `ResultView` or an error code, never half a view. One addition inside the `SCORESTATS_SCHEMA_MISMATCH` family: a `derivedType` that disagrees with the payload's dominants is rejected, so a hand-edited type segment cannot display another type's copy.

### 4.11 History (`history/history.ts`)

```ts
export interface HistoryEntry { readonly variantId: VariantId; readonly startedAtMs: number; readonly completedAtMs: number | null } // legacy shape
export function parseHistory(raw: string | null): readonly HistoryEntry[];          // broken entries dropped individually
export function start(list: readonly HistoryEntry[], e: HistoryEntry, max = 50): readonly HistoryEntry[];
export function complete(list: readonly HistoryEntry[], variant: VariantId, startedAtMs: number, at: number): readonly HistoryEntry[];
export function rows(list: readonly HistoryEntry[], activeRuns: ReadonlyMap<VariantId, number /* startedAt */>): readonly HistoryRow[];
// status computed at read: completed | in-progress | abandoned (REQ-T §8.4); newest first
```

### 4.12 Sharing (`share/*`)

```ts
export interface AskRef { readonly locale: Locale; readonly variant: VariantId; readonly question: QuestionIndex; readonly box: BoxId }
export const askHref = (a: AskRef): string => `/${a.locale}/ask/${a.variant}/${a.question}/${a.box}`;
export function resolveAsk(content: Content, p: { locale: string; variant: string; question: string; box: string }): Result<AskView, AskError>;

export interface Tally { readonly counts: Readonly<Partial<Record<ChoiceKey, number>>>; readonly total: number }
export function percentages(t: Tally, keys: readonly ChoiceKey[]): Readonly<Record<ChoiceKey, number>>;  // largest remainder, sums to 100
export function voteAccepted(v: { box: BoxId; choice: ChoiceKey; voter: string }, askView: AskView, seen: boolean, now: EpochMs, expiresAt: EpochMs): Result<true, 'EXPIRED' | 'DUPLICATE' | 'CHOICE_INVALID'>;
```

An ask link is fully addressed by its URL: locale (the sharer's, so link previews in the sharer's chat app speak their language), variant, canonical question index and a random vote-box id created client-side at share time and stored in `RunRecord.asks`. The friend page and its link preview derive **all** displayed text from compiled content selected by validated ids; no URL string ever reaches rendered text or `next/og`. That makes the GHSA-vcvr-r3jv-pc5j precondition (attacker-controlled values reaching `ImageResponse` SVG) structurally impossible even though the pinned `next ≥ 16.3.6` already fixes it. Votes are functional data behind a port (§5.1, O2).

### 4.13 Stage resolution and palette math (`stage/*`, `palette/*`)

```ts
export function resolveStage(v: Variant, motion: 'full' | 'reduced'): StageId;   // reduced → 'story'; else v.stage

export interface Palette { readonly base: Hex; readonly hi: Hex; readonly c1: Hex; readonly c2: Hex; readonly glow: Hex; readonly deep: Hex;
  readonly tint: Hex; readonly field: { readonly dark: readonly [Hex, Hex, Hex, Hex]; readonly light: readonly [Hex, Hex, Hex, Hex] } }
export function look(src: PaletteSource): Palette;                              // curated record, or derived from base/hi
export function answerColors(p: Palette, q: { index: QuestionIndex; count: 2 | 3 | 4; curated?: readonly Hex[] }): readonly Hex[];
export function storySteps(p: Palette, n: number): readonly Hex[];              // D: OKLCH hue steps
export function legible(h: Hex, min?: number): Hex;
export function toneFor(h: Hex): 'dark' | 'light';
export function contrast(a: Hex, b: Hex): number;
```

The stage is resolved **once per session open** and fixed for the run (the prototype author's advice: never switch stage mid-test). Colour that varies per test is data plus pure math, not tokens (`design-system.md` §5.1 principle 5); its invariants (text ≥ 4.5:1 on every answer colour, neighbour bands ≥ 3:1, type-bearing blob luminance under the caps) are unit tests run over every variant in `content/`.

### 4.14 Storage schema (`storage/*`)

```ts
export const KEYS = {
  consent:          'vivetest-telemetry-consent',  // local · 'OPTED_IN' | 'OPTED_OUT' — kept for returning users
  theme:            'vivetest-theme',              // local · 'light' | 'dark'; absent = system — kept
  history:          'test:runHistory',             // local · HistoryEntry[] — kept (user-visible data)
  telemetrySession: 'vt1:telemetry-session',       // local
  voter:            'vt1:voter',                   // local · friend-page dedupe token
  run:        (v: VariantId) => `vt1:run:${v}`,    // local · RunRecord
  staged:     (v: VariantId) => `vt1:staged:${v}`, // session · StagedEntry
  seen:       (v: VariantId) => `vt1:seen:${v}`,   // session · '1' = instructionSeen
  returnHint:                   'vt1:return',      // session · UI-only (landing return colour)
} as const;
export interface Codec<T> { parse(raw: string | null): T | null; serialize(v: T): string }
export const codecs: { readonly run: Codec<RunRecord>; readonly staged: Codec<StagedEntry>; readonly history: Codec<readonly HistoryEntry[]> };
```

Three legacy names and value formats are kept verbatim, so returning users keep their consent choice, theme and history **with zero migration code**; every other key is new and versioned (`vt1:`), because run state lives at most 30 minutes and has no continuity value. The key registry is the single source the pre-paint script (§6) is generated from.

---

## 5. The engine

### 5.1 Ports (`engine/ports.ts`)

```ts
export interface KeyValue { get(key: string): string | null; set(key: string, value: string): boolean; remove(key: string): void } // never throws
export interface Ports {
  readonly local: KeyValue; readonly session: KeyValue;
  readonly clock: { now(): EpochMs };
  readonly ids: { uuid(): string | null; boxId(): BoxId };        // uuid null ⇒ no crypto ⇒ no telemetry session (REQ-L §12.5)
  readonly timers: { after(ms: number, fn: () => void): () => void };
  readonly transport: { send(batch: readonly TelemetryEvent[]): void };
  readonly motion: { get(): 'full' | 'reduced'; subscribe(fn: () => void): () => void };
  readonly votes: VoteClient | null;                                // null until O2 ships a store
}
export interface VoteClient { tally(box: BoxId): Promise<Tally>; cast(box: BoxId, choice: ChoiceKey, voter: string): Promise<Result<Tally, 'EXPIRED' | 'DUPLICATE'>> }
```

`KeyValue.set` returning `false` is how WebKit's "Block all cookies" (`setItem` throws) is absorbed: the browser adapter catches, the engine flips `degraded` in the view, and the flow continues for this visit (REQ-T §8.2). Because ports are the only way out, "every write goes through one helper" needs no guard test.

### 5.2 The engine API — the small typed surface React consumes (`engine/index.ts`)

```ts
export interface Readable<T> { subscribe(fn: () => void): () => void; get(): T; getServer(): T }

export interface Engine {
  readonly consent: Readable<ConsentState> & { choose(c: 'OPTED_IN' | 'OPTED_OUT'): void };
  readonly prefs: Readable<{ motion: 'full' | 'reduced'; theme: 'system' | 'light' | 'dark' }> & { setTheme(t: 'system' | 'light' | 'dark'): void };
  readonly history: Readable<readonly HistoryRow[] | null>;           // null on the server and before hydration
  readonly telemetry: { landingView(route: string): void; resultViewed(v: VariantId, type: string): void;
                        shareClicked(k: 'ask' | 'path' | 'palette', q?: QuestionIndex): void; shareCopied(k: 'ask' | 'path' | 'palette'): void };
  session(variant: Variant, host: 'window' | 'page'): TestSession;     // memoised per (variant, host): StrictMode-safe
  completedVariants(): ReadonlySet<VariantId>;                        // recovery cards (REQ-T §6.1)
}

export interface TestSession extends Readable<RunView> {
  boot(): void;                                                       // idempotent
  previewAnswer(c: ChoiceKey): void;
  gate(a: GateAction | 'escape' | 'back'): void;
  qualifier(token: string): void; qualifierNext(): void;
  answer(c: ChoiceKey): void; prev(): void; moveTo(o: ScoringOrdinal): void;
  submit(): void; backFromLoading(): void;
  commitFailure(a: 'retryFresh' | 'resumePrevious' | 'home'): void;
  ask(q: QuestionIndex): AskRef;                                      // creates the box id, stores it in the run
  votes(q: QuestionIndex): Readable<Tally | null>;                    // polled while visible; null when votes are off
  readonly exits: Readable<{ to: 'landing' } | { to: ResultHref } | null>;  // one-shot intents the host turns into motion + navigation
  dispose(): void;
}
```

Every business decision a screen shows arrives through `RunView`, `ConsentState`, `HistoryRow[]` or a `Tally`. The UI never reads storage, never builds telemetry, never decides where "next" is, and never computes a percentage.

### 5.3 Effect execution semantics (`engine/effects.ts`)

- **Order.** Effects run in array order after the new state is stored, and subscribers are notified once per command. Storage effects precede `emit`, so a crash after a write cannot report an event the storage never saw.
- **Atomicity.** `clearRun` removes the run record, the staged entry and (unless `keepInstructionSeen`) the seen flag of one variant in one synchronous block; other variants are untouched by construction (keys are variant-scoped) (REQ-T §6.8, §8.3).
- **Idempotence.** `session()` is memoised and `boot()` is a no-op after the first call, so React StrictMode's double mount cannot double-emit `attempt_start` or re-initialise responses (REQ-T §3.7); `attemptStarted` in the record makes resume never re-emit.
- **Schedules.** `schedule`/`cancel` are keyed; a pending `advance` is cancelled by `moveTo` and by `dispose` (unmount), exactly as REQ-T §4.3 requires.
- **Telemetry pipeline.** `emit` drafts get common fields (event id, session id, UTC ms, locale, route, consent) and pass `validateEvent`; `transmission(consent)` then sends, holds or drops. The held queue is in memory; opting out drops it and rotates the session id; opting in flushes.
- **Cross-tab.** A `storage` event for a key the engine owns re-reads the affected store (consent, history). Two tabs running the same variant converge on the last write; no locking, because the requirements define no cross-tab contract and the run record is small and self-consistent.

---

## 6. Platform adapters

| Adapter | File | Notes |
|:---|:---|:---|
| Safe storage | `platform/browser/safe-storage.ts` | `KeyValue` over `localStorage`/`sessionStorage`; every accessor in `try/catch`; accessor itself may throw in private modes |
| Clock, ids, timers | `platform/browser/{clock,ids,timers}.ts` | `crypto.randomUUID → getRandomValues → null` (no weak fallback) |
| Telemetry transport | `platform/browser/beacon.ts` | `navigator.sendBeacon('/api/telemetry')`, `fetch(keepalive)` fallback; batches on `visibilitychange: hidden` |
| Motion preference | `platform/browser/motion.ts` | `matchMedia('(prefers-reduced-motion: reduce)')`; the only JS reader of the OS setting (CSS reads the same media query) |
| History bridge | `platform/browser/history-bridge.ts` | `push(state, url)`, `replace(state, url)`, `back()`, `onPop(fn)`; used by the window host only |
| Pre-paint bootstrap | `platform/pre-paint.ts` | exports the inline script **source**, generated from `KEYS`: sets `data-theme` and `data-consent` on `<html>` before first paint |
| Content loader | `platform/server/content.ts` | `'server-only'`; memoised `compileContent`; throws formatted errors at build |
| Token values | `platform/server/token-values.ts` | `'server-only'`; reads the few custom properties non-CSS consumers need (theme-color, icon, OG) from `tokens.css` at build |
| Vote store | `platform/server/vote-store.ts` | interface now; implementation chosen with O2 (one managed store, TTL per box, per-box voter set) |
| Telemetry sink | `platform/server/telemetry-sink.ts` | `NullSink` until O2; same store as votes when chosen (critique G8) |
| Composition root | `platform/client-engine.tsx` | `createEngine(browserPorts)` lazily in the browser; `<EngineProvider>` context whose default is that singleton, tests inject fakes |

The pre-paint script is the one deliberate duplication of a read path, and it has a reason: the landing is statically rendered with consent `UNKNOWN` (REQ-L §11.1), so an opted-out returning user would see `available` cards vanish after hydration. With `data-consent="out"` set before paint, CSS hides those cards (`[data-consent=out] [data-attr=available] { display: none }`), hydration still matches the server HTML, and the store then removes them from the React tree with no visible shift. The same script applies the stored theme (REQ-L §6.4 bootstrap before paint).

---

## 7. The UI layer

### 7.1 How React consumes the engine

```ts
// ui/hooks/use-store.ts
export function useStore<T>(s: Readable<T>): T {
  return useSyncExternalStore(s.subscribe, s.get, s.getServer);
}
```

Every `Readable` returns cached immutable snapshots (a new object only when state changed) and a server snapshot that equals the first client render — `UNKNOWN` consent, `null` history, a `booting` run view — which is exactly the contract `useSyncExternalStore` requires for SSR and hydration (verified, §15). React-local state is allowed only for presentation: drag offsets, animation progress, which sheet is open, focus bookkeeping.

### 7.2 One experience, two hosts (`ui/experience/test-experience.tsx`)

```tsx
export function TestExperience(p: {
  variant: Variant; text: VariantText; palette: Palette;
  host: { kind: 'window'; mode: 'window' | 'full'; insets: Insets; active: boolean } | { kind: 'page' };
  onExit(intent: { to: 'landing' } | { to: ResultHref }): void;   // host decides motion + navigation
}): JSX.Element;
```

`TestExperience` composes the shell (top bar, progress rail or story bar, bottom controls), the resolved stage, the instruction dialog and the share sheet around one `TestSession`. The window host (§7.4) renders it inside the expanded card; the page host (`app/[locale]/test/[variant]`) renders it full-screen. The prototype's three modes (window / full / standalone) collapse to two hosts because "full inside the landing" and "full as a page" are the same component with the same view; only exit behaviour differs.

### 7.3 The stage contract (replaces the `vive:*` postMessage protocol)

```ts
// ui/stages/contract.ts
export interface StageProps {
  readonly view: RunView;                          // all business facts, incl. `last` transition cause
  readonly text: VariantText;                      // localized prompts/options
  readonly palette: Palette;
  readonly motion: 'full' | 'reduced';
  readonly host: { readonly mode: 'window' | 'full'; readonly insets: Insets; readonly active: boolean };
  readonly chrome: ShellHandle;                    // placePrev(x | null), setTone({ top, bottom }), railSlot(i): DOMRect
  readonly gate: InputGate;                        // arm(ms) when a question comes to rest; `open` gates input
  readonly act: { answer(c: ChoiceKey): void; prev(): void; moveTo(o: ScoringOrdinal): void; submit(): void };
  readonly onReady: () => void;                    // Q1 drawn → the window may reveal
}
export type Stage = React.ComponentType<StageProps>;
export const loadStage: (id: StageId) => Promise<Stage>;   // next/dynamic per stage: split, forks, story are separate chunks
```

| Prototype message | Contract equivalent |
|:---|:---|
| `vive:ready` (stage → host) | `onReady()` |
| `vive:window {insets}` (host → stage) | `host.insets` prop |
| `vive:open` (host → stage) | `host.active` becomes `true` (input accepted after the gate arms) |
| `vive:collapse` | host unmounts or sets `active=false`; the session stays in `preview` |
| `vive:q1 {choice,color}` (stage → host) | `act.answer` → session `previewAnswer` → session phase `gate` → window machine `q1Answered` |
| `vive:full` (host → stage, once) | `host.mode` becomes `'full'`; "once" is structural (a prop value, not a message) |
| `vive:back` / wordmark / `거부하고 중단` | session `exits` = landing → host shrink |
| `vive:escape` | window host keydown (Escape collapses an unanswered window) |

**Input guards, one mechanism.** The kernel owns the 150 ms answer lock (a domain rule: duplicate taps ignored, selected state shown). The **arrival guard** is presentation and lives in one shell primitive, `InputGate`, that every stage arms when a question comes to rest: J arms 350 ms after its signs finish appearing (the value its 19/19 input-pattern suite validated, P§2.7), I and D arm at the end of their enter motion. A press that started before the gate opened is void; key repeats count once. This settles C-11 as "one primitive, per-stage arming point" instead of three ad-hoc guards.

**What stays inside a stage.** Canvas/WebGL drawing, gesture recognition (I's seam drag, J's lean-and-commit swipe, D's card drag that never answers), per-stage motion, and the mapping from `view.progress.choices` to rail colours (I: chosen field colour; J: trail colour; D: card colour). A stage never imports the engine, storage or telemetry; it can only call `act.*`.

### 7.4 The window host (`ui/window/*`)

The window is presentation orchestration with rules (history entry, input lock during motion, exactly one outcome per open), so it too is a pure reducer, unit-tested without a browser:

```ts
// ui/window/window-machine.ts
export type WState =
  | { tag: 'rest' } | { tag: 'opening'; v: VariantId } | { tag: 'open'; v: VariantId }
  | { tag: 'closing'; v: VariantId } | { tag: 'growing'; v: VariantId } | { tag: 'full'; v: VariantId }
  | { tag: 'returning'; v: VariantId } | { tag: 'fallback'; v: VariantId };
export type WEvent =
  | { type: 'tapCard'; v: VariantId } | { type: 'stageReady' } | { type: 'stageTimeout' }
  | { type: 'q1Answered' } | { type: 'motionEnd' } | { type: 'dismiss' /* outside tap · 닫기 · Escape */ }
  | { type: 'exitToLanding' /* wordmark · deny-and-abandon */ }
  | { type: 'pop'; marker: WindowMarker | null; path: string };
export type WEffect =
  | { type: 'push'; marker: WindowMarker; url: string } | { type: 'replace'; marker: WindowMarker; url: string }
  | { type: 'back' } | { type: 'animate'; kind: 'open' | 'close' | 'grow' | 'shrink' } | { type: 'inertLanding'; on: boolean }
  | { type: 'focus'; target: 'stage' | 'card' } | { type: 'navigate'; href: string };
export function wstep(s: WState, e: WEvent): { state: WState; effects: readonly WEffect[] };
```

**History is the source of truth for the window's mode.** Opening a card pushes one entry (`/{locale}#{variant}` with a marker in `history.state`), so system Back closes the window without leaving the page, as the a11y floor requires (C§4.8) and as the prototype could not do (P§1.2). Answering Q1 **replaces** that entry with `/{locale}/test/{variant}` while the window grows, so a reload from then on lands on the real test page (deep link = full mode, P§2.1 author note) and Back from the full test returns to `/{locale}` and shrinks the stage into its card. UI-initiated close and shrink call `back()` and let the `pop` event drive the state change, so there is one path for "button" and "system back" (the pattern that avoids L43/L53). Forward after Back re-grows to the run's current question, because the run lives in the engine and storage, not in the component tree.

Every open ends in exactly one outcome — `closing`, `full` or `fallback` — which is the whole of REQ-L §13.3's terminal exclusivity once there is no route to wait for. The 1600 ms "destination ready" timeout becomes the stage-load timeout: if the stage chunk or content has not called `onReady` within the EXP-spec budget (prototype: 3 s), the landing draws the fallback Q1 with shell tokens and answering it navigates to the page host. `/{locale}#{variant}` is also the single "this card" address used by the friend page's 「나도 이 테스트 해 보기」 and by the page host's wordmark exit.

### 7.5 Landing

`app/[locale]/page.tsx` (server, static per locale) builds a `LandingModel` — catalog entries with localized title/subtitle, `formatCount` meta, palette, attribute, stage, and each test's localized Q1 preview (so the window and its fallback can draw Q1 immediately) — and renders the client `<Landing>`. The client filters with `visibleCatalog(model, consent)`, runs the deck, the WebGL field (lazy after first paint, CSS-gradient fallback) and the list, and preloads the centred card's stage chunk and full localized content after the deck settles for 350 ms. Full content comes from a statically generated route handler, `GET /api/content/{locale}/{variant}` (`dynamic = 'force-static'`, `generateStaticParams` over locales × enterable variants), fed by the same `platform/server/content.ts` loader the test page uses: one loader, two transports, CDN-cached JSON, and a landing payload that does not grow with the number of tests.

### 7.6 Styling and design tokens

- **No Tailwind.** Plain CSS in native cascade layers declared once in `ui/skins/base.css`: `@layer reset, tokens, base, skins, stages, util;`. This removes by construction the Tailwind traps the old repo logged (unlayered rules beating utilities, class scanning of comments, emit-order conflicts — `governance.md` L10, L25, L26) and leaves one styling idiom.
- **One token file**, `ui/skins/tokens.css`: primitives, paper roles, world roles, type tiers, radius, elevation, both motion registers, material constants; every theme-varying colour declared once with `light-dark()` under `:root { color-scheme: light dark }` and `[data-theme]` overriding `color-scheme`. No second dark block, no mirror. (Browser floor check for `light-dark()` is a spike item.)
- **Design-system components are global `.vt-*` skins** in `ui/skins/*.css`, applied by React components that own structure and behaviour. The Claude Design bundle loads these same files, so the specimen and the product cannot drift (`design-system.md` §5.4). Page- or stage-private layout uses colocated CSS Modules; the rule is "if the design system names it, it is a `.vt-*` skin; otherwise it is a module".
- **Per-test colour is data**: the experience sets `--t-base`, `--t-hi`, … on its root from the `Palette`; skins reference those variables. Portalled layers (dialog, share sheet) receive the same variables on their own root, not by DOM inheritance (L40).
- **Non-CSS literals** (`viewport.themeColor`, icon and OG colours) are **read from `tokens.css` at build time** by `platform/server/token-values.ts` (server-only, a file read plus a short custom-property parser). `tokens.css` stays the only authored value, nothing is generated into the repo, and no parity test exists because there is no second copy. The pre-paint script needs no colours; it only sets attributes.

### 7.7 Motion and reduced motion

The OS `prefers-reduced-motion` is the single source (read by CSS media queries and by the `motion` port). Under reduced motion every test opens in the story stage (resolved once per session, §4.13), window open/close/grow/shrink become fades ≤ 180 ms, the landing field renders but does not animate, and loops stop. There is no in-site motion switch in v1 (C-13): it would be a new control, and the OS setting is the accessible standard; adding one later is a second input to the `motion` port, with no kernel change. WCAG 2.2.2 for the landing field is met by the field settling after ≤ 5 s idle and moving only in response to deck interaction (critique G14).

---

## 8. Routing and Next.js structure

### 8.1 Route tree

```text
src/app/
├─ [locale]/
│  ├─ layout.tsx                       # ROOT layout: <html lang={displayTag(locale)}>, pre-paint script, skins, providers
│  │                                   #   generateStaticParams = LOCALES; dynamicParams = false
│  ├─ error.tsx                        # client error boundary (translation + theme kept)
│  ├─ page.tsx                         # landing (static per locale)
│  ├─ opengraph-image.tsx              # static brand card
│  ├─ manifest.webmanifest/route.ts    # per-locale manifest (static)
│  ├─ test/[variant]/page.tsx          # page host; dynamicParams = true; non-enterable → redirect to test/error
│  ├─ test/error/page.tsx              # recovery page (static; cards computed client-side from completion)
│  ├─ result/[variant]/[type]/page.tsx # dynamic: resolveResultView(searchParams) → view | error branch
│  ├─ ask/[variant]/[q]/opengraph-image.tsx      # per-question preview (next/og, resolved content only)
│  ├─ ask/[variant]/[q]/[box]/page.tsx           # friend page (O2)
│  ├─ blog/page.tsx  blog/[slug]/page.tsx        # invalid slug → redirect to blog index
│  └─ history/page.tsx                           # client list from engine.history
├─ api/
│  ├─ telemetry/route.ts               # POST; validateEvent; 400/204; sink port
│  ├─ content/[locale]/[variant]/route.ts        # force-static localized content JSON (window preload)
│  └─ asks/[box]/route.ts              # GET tally · POST vote (O2)
├─ global-not-found.tsx                # full document; imports its own skins + pre-paint (L12)
├─ global-error.tsx                    # full document; imports its own skins
├─ manifest.ts  icon.svg  apple-icon.tsx  robots.ts  sitemap.ts
src/proxy.ts                           # routeRequest(); matcher excludes /api, /_next, metadata and static files
src/i18n/request.ts                    # getRequestConfig: rootParams.locale() → messages/<locale>.json
```

Routes are the legacy route surface (C§4.1) plus three internal additions (`/api/content/…`, `/api/asks/…`, `/{locale}/ask/…`) that the Platform spec lists explicitly.

### 8.2 Root layout, i18n and the 404 rule

- `app/[locale]/layout.tsx` is the root layout; there is no `app/layout.tsx`. `<html lang>` is `displayTag(locale)` from the param, so the legacy "request-scoped lang header from the proxy" (REQ-L EX-003) disappears as a mechanism while its requirement — the BCP 47 display tag in server HTML, never the product code — is met more simply.
- `next-intl` reads the locale via `next/root-params` in `getRequestConfig` (default in Next ≥ 16.3), so no page calls `setRequestLocale`; `NextIntlClientProvider` inherits messages (next-intl 4). Route handlers, which cannot use root params yet, receive the locale as a path param.
- **Nothing under `app/[locale]` imports `notFound`.** Unknown locales are rejected by `dynamicParams = false`; unknown paths match no route; both render `global-not-found.tsx` outside `[locale]` with a server-rendered body (the L51 failure cannot occur because its trigger is unreachable). Unknown or non-enterable variants redirect to the recovery page; invalid blog slugs redirect to the blog index; invalid result payloads render the error branch. One ESLint `no-restricted-imports` rule enforces the ban.

### 8.3 Proxy

```ts
// src/proxy.ts — the whole file is an adapter around the kernel decision
export function proxy(req: NextRequest) {
  const d = routeRequest({ pathname: req.nextUrl.pathname, search: req.nextUrl.search,
    cookie: req.cookies.get('NEXT_LOCALE')?.value, acceptLanguage: req.headers.get('accept-language') ?? undefined });
  if (d.kind === 'redirect') return NextResponse.redirect(new URL(d.location, req.url));
  const res = NextResponse.next();
  if (d.setLocaleCookie) res.cookies.set('NEXT_LOCALE', d.setLocaleCookie, { path: '/', sameSite: 'lax' });
  return res;
}
export const config = { matcher: ['/((?!api|_next|.*\\..*|icon|apple-icon|opengraph-image|manifest).*)'] };
```

The proxy runs on the Node.js runtime (not configurable in Next 16), holds no business state and has no branch the kernel does not decide.

### 8.4 Rendering modes

| Route | Mode | Why |
|:---|:---|:---|
| `/{locale}`, blog, history shell, recovery shell, manifest, content JSON | static (SSG per locale / variant) | no request-dependent input; consent/theme applied pre-paint |
| `/{locale}/test/{variant}` | static for enterable variants (`generateStaticParams`), redirect for others | SSR renders the shell + stage ground in `booting`; the session boots from storage after mount |
| `/{locale}/result/{variant}/{type}` | dynamic | the payload is in the query string; server-side decode gives the no-partial-render property |
| `/{locale}/ask/…` | dynamic page, static per-question OG | box id varies; preview text depends only on (locale, variant, q) |
| `/api/telemetry`, `/api/asks/*` | dynamic functions | writes |

---

## 9. Testing and gates

| Layer | Runner / env | What is asserted | Naming |
|:---|:---|:---|:---|
| kernel | vitest, `node` | every rule in `domain.md`, `privacy-telemetry.md`, `content.md` as table-driven cases; property tests (`fast-check`) for codec round-trip, advance-one, "no transition removes an answer", percentages sum to 100 | `it('DOM-RUN-07 re-answering a revisited question advances exactly one', …)` |
| engine | vitest, `node`, fake ports | effect ordering and atomicity; StrictMode double boot emits one `attempt_start`; storage that throws on `set` → flow continues, `degraded` true; opt-out drops the held queue and rotates the id | `PRV-*`, `DOM-*` IDs |
| ui machines | vitest, `node` | window machine outcomes and history effects; input-gate arming and void presses | `EXP-*` IDs |
| content | vitest, `node` | `compileContent(content/)` ok; palette contrast invariants per variant; message key parity across 12 locales | `CNT-*` |
| browser | Playwright, preview server; projects `mobile-webkit` (primary), `mobile-chromium`, `desktop-chromium` (centred column) | window: card → Q1 → grow → Back → same card with the landing DOM node preserved and **no RSC/document request**; forward re-grows; deep link starts full; gate matrix rows; Escape rules; focus trap/return; reduced motion → story; 12-locale overflow at 360 px; `curl`-level 404 has a body; result error branches via `data-result-branch` | `EXP-*`, `PLT-*` |
| pixels | Playwright in the official Linux container, CI only | ≈ 20 key surfaces; local runs skip `toHaveScreenshot` | — |

Rule IDs in test names are the traceability: `grep DOM-RUN-07` finds the spec line and its test. There is no traceability JSON, no `assertion:` anchor, and no test that reads Markdown. Static checks are capped at five and are all mechanical: layer boundaries (ESLint), the DOM-less kernel/engine `tsconfig`, the `notFound` ban under `[locale]`, message key parity, and vitest's `**/*.test.{ts,tsx}` include (config, not a test). jsdom is not used: history, portals and focus are exactly what jsdom cannot show (L39), so React behaviour is asserted in real browsers.

Gate order (one tier, every landing): `lint → typecheck (next typegen; tsc -b for root, kernel, engine) → vitest → next build → playwright (preview)`. CI runs the same commands on GitHub Actions (public repo, free minutes).

---

## 10. Traceability

### 10.1 Requirement groups (C§4.1–§4.8) → modules

| Group / item | Kernel | Engine / platform | UI / route | Spec |
|:---|:---|:---|:---|:---|
| 4.1 Route surface, pages under `[locale]`, single prefix | `locale/route-request.ts` | — | `app/[locale]/**` root layout | PLT |
| 4.1 Single request entry, no middleware | `routeRequest` | — | `src/proxy.ts` only | PLT |
| 4.1 Locale-less allowlist | `routeRequest` allowlist | — | — | PLT |
| 4.1 Typed routes, no manual concat | `askHref`, `encodeResult`, route helpers | — | `typedRoutes: true` | PLT |
| 4.1 Blog routing (list/detail, invalid → index) | `Content.blog` | — | `blog/[slug]` redirect | PLT |
| 4.1 Test route owns instruction/runtime; invalid → `/test/error` without a session | `entryDecision`, run machine | `TestSession` | `test/[variant]`, `test/error` | DOM |
| 4.1 Result route, `replace` arrival | `encodeResult` | effect `navigate replace` | window/page host | DOM |
| 4.2 12 locales, aliases, BCP 47 display tag, negotiation | `locale/*` | — | root layout `lang` | PLT |
| 4.2 UI messages + key parity | — | — | `messages/*`, next-intl | PLT |
| 4.2 Content localisation with en fallback | `Localized`, `pick`, `Content.text` | — | — | CNT |
| 4.2 Instruction copy per variant, no generic fallback | compile rule | — | instruction dialog | CNT |
| 4.2 Locale number format | `formatCount` | — | landing meta | PLT |
| 4.3 Consent machine, SSR `UNKNOWN`, one sync after mount | `consent/*` | consent store + pre-paint | `useStore` | PRV |
| 4.3 Transmission and analytics gates | `transmission`, `decide` | telemetry pipeline | analytics gate component | PRV |
| 4.3 Catalog filtering by consent | `visibleCatalog`, `hiddenByConsent` | — | landing, OPTED_OUT notice row | PRV |
| 4.3 Instruction consent matrix, CTA identities | `gateSpec`, `GATE_EFFECTS` | — | instruction dialog | DOM |
| 4.3 Escape never writes | machine row (no effects) | — | dialog key handling | DOM |
| 4.3 Recall semantics | `recall` | consent store | consent banner (B0, O4) | PRV |
| 4.4 Event set, fields, index semantics | `telemetry/events.ts`, brands | pipeline | — | PRV |
| 4.4 Payload hygiene, forbidden keys | `validateEvent` | pipeline + `/api/telemetry` | — | PRV |
| 4.4 Anonymous id (`randomUUID → getRandomValues → none`) | — | `ids` port | — | PRV |
| 4.4 Endpoint 400/204, retention (open, O2) | `validateEvent` | `telemetry-sink` | `api/telemetry` | PRV |
| 4.5 Storage key registry, continuity | `storage/keys.ts` | safe storage | — | PRV |
| 4.5 Safe storage, degraded mode | — | `KeyValue.set → boolean` | `view.degraded` | PRV |
| 4.5 Theme preference, bootstrap before paint | — | prefs store, `pre-paint.ts` | menu (B0) | PLT |
| 4.5 Variant-scoped cleanup; history outside cleanup | `clearRun` effect | effect executor | — | DOM |
| 4.6 Attributes, enterable set | `catalog.ts` | — | deck/list | DOM |
| 4.6 Question typing, canonical index, Q labels | `content/model.ts`, brands | — | — | DOM |
| 4.6 Binary model → 2–4 options mapped to poles | `content/compile.ts`, `derive` | — | stages I/D (J = 2 only) | DOM/CNT |
| 4.6 Derivation, odd count, `axisCount ∈ {1,2,4}` | `scoring/*`, compile rules | — | — | DOM |
| 4.6 Qualifiers (EGTT), type segment | compile rules, `derive`, gate qualifier steps | — | instruction dialog step 2 | DOM |
| 4.6 Entry paths, runtime entry commit, staged entry (7 min) | `run/entry.ts`, machine commit rows | — | — | DOM |
| 4.6 `instructionSeen` lifecycle | `GATE_EFFECTS`, `clearRun` | — | — | DOM |
| 4.6 150 ms lock, auto-advance, no 다음 | machine rows | `schedule` effect | stages via `view.inputLocked` | DOM |
| 4.6 Revisit mark / last question selected | `view.ts` option states | — | answer tokens | DOM |
| 4.6 Advance-one (owner) | `advanceDue` row | — | — | DOM |
| 4.6 Retention, eligibility, progress | `view.ts` | — | rail / story bar | DOM |
| 4.6 30 min timeout at re-entry | `classifyEntry` | — | — | DOM |
| 4.6 Volatility on result commit / timeout / restart | `clearRun` in commit + result rows | — | — | DOM |
| 4.6 Result URL payload, cases, invalid branches | `result/*` | — | `result/…` page | DOM |
| 4.6 History list, status at read, max 50 | `history.ts` | history store | `history/page.tsx` | DOM |
| 4.6 Recovery page, ≥ 1 forward path, ≤ 2 cards | `recoveryCards` | `completedVariants` | `test/error` | DOM |
| 4.6 Content integrity, no partial activation | `compileContent` | build-time loader | — | CNT |
| 4.6 Never 404 inside `[locale]` | — | — | route tree + ESLint ban | PLT |
| 4.7 Locale manifest, metadata, hreflang, icons, static OG | — | — | metadata files, `generateMetadata` | PLT |
| 4.7 Consent-gated Vercel Analytics / Speed Insights | `transmission` | consent store | `AnalyticsGate` | PRV |
| 4.8 44 px targets, focus visible, semantic triggers, Escape, focus trap/return, skip link, reduced motion, 4.5:1, gesture alternatives | palette invariants | motion port | primitives (`dialog`, `press`), skins, stage contract | EXP |

Requirements deliberately **not** implemented, each with its reason: runtime lazy validation and per-variant fallback (REQ-T §2.4 second line, §2.5) — made unreachable by the build-time gate; derivation-failure state (REQ-T §6.7) — derivation is total; qualifier re-entry recap chip (REQ-T §3.6, optional) — owner principle 3; return-scroll restoration (REQ-L §13.8) and ghost-GNB swap — the landing never unmounts in the window path; mid-flow blocking error after a content deploy (REQ-T §2.6) — treated as an expired run instead. Each goes to `docs/DECISIONS.md` as one short entry.

### 10.2 Prototype structures → modules

| Prototype structure (P§) | Module(s) |
|:---|:---|
| Landing deck, poster cards, kinetic title, list, end card (1.1) | `ui/landing/*`, `ui/skins/deck.css`; grapheme splitting via `Intl.Segmenter` for the kinetic title (Hindi) |
| Living field, WebGL + CSS fallback, grain (3.8) | `ui/landing/field/*` (lazy), material constants in `tokens.css` |
| The window: expand, Q1 by the stage, grow, shrink (1.2, 2.1) | `ui/window/window-machine.ts`, `window-host.tsx`, `platform/browser/history-bridge.ts`, stage contract |
| Window protocol messages (2.1) | `StageProps` (§7.3 table) |
| Landing Q1 → test hand-off (2.2) | `TestSession.previewAnswer` → `StagedEntry` (kernel) |
| Shell: top bar, rail (y), story bar (x), 이전/제출, badges, prev mark, question type, votes line (2.9–2.11) | `ui/shell/*`, `ui/skins/shell.css`; facts from `RunView` |
| J's 이전 riding the road (`placePrev`) (2.10) | `ShellHandle.placePrev` |
| Instruction centred modal, consent note, qualifier step, focus/Tab/Esc (1.4) | `ui/instruction/instruction-dialog.tsx` over `view.gate`; `ui/primitives/dialog.tsx` |
| Stage I split, 2–4 bands, seam drag (1.3) | `ui/stages/split/*`, `answerColors` |
| Stage J forks, 2.5D canvas, gate submit, arrival guard (1.3, 2.7) | `ui/stages/forks/*`, `InputGate`, compile rule "forks ⇒ ≤ 2 options" |
| Stage D story, side peeks, locked card, reduced-motion fallback (1.3, 2.4) | `ui/stages/story/*`, `resolveStage`, `storySteps` |
| Stage assignment `stageFor` (2.3) | `VariantSource.stage` + `resolveStage` |
| Advance-one revisit (2.6) | kernel machine `advanceDue` |
| Test signature colours, `LOOK`, curated pairs, `legible`, `toneFor` (3.4–3.5) | `content/variants/*.palette`, `kernel/palette/*` |
| Share sheet, 9:16 story card, coach label (1.5) | `ui/share/*`; `TestSession.ask`; `engine.telemetry.share*` |
| Friend page, votes, largest remainder (1.5, 4.3) | `app/[locale]/ask/…`, `ui/share/friend-page.tsx`, `kernel/share/tally.ts`, `VoteClient` / vote store |
| Session keys `vive-*` (4.2) | replaced by `KEYS` (§4.14); override and test hooks are not product |
| `demo-three` / `demo-four` (4.1) | `debug`-attribute fixtures in `content/` used by E2E only (valid under the pole-mapped option model) |
| Prototype-only chrome (1.7) | not built |

---

## 11. Decisions and rejected alternatives

| # | Decision | Rejected alternative, and why |
|:---|:---|:---|
| D1 | Functional core / imperative shell: kernel `step → {state, effects}` + an engine executing effects through ports | Business state in React reducers/context: needs a DOM to test, re-runs under StrictMode, and invites UI code to re-derive rules — the old repo's failure mode. XState or Redux: library DSLs for five small machines, coupling the kernel to a dependency and its upgrade cycle. |
| D2 | Kernel and engine purity enforced by DOM-less `tsconfig` + ESLint boundaries | A `packages/kernel` workspace (build graph and tooling for the same isolation); convention in prose (the documented way rules decayed before). |
| D3 | Window = client layer on the mounted landing, History API as source of truth (push at open, replace to `/test/{v}` at Q1, back to close/shrink) | Parallel + intercepting route `@window/(.)test/[variant]`: verified that interception applies from any page under the intercepting route (`Next-Url` regex `…(?:/.*)?`), so blog/history/result links would also open a window over a page with no card; the URL must change on **card open** (interception needs a navigation), mounting the stage in the slot and remounting it on Q1; Back unmounts the slot before a shrink can play; parallel slots need `default.tsx` and matching rendering modes. View Transitions for the grow/shrink: a second animation system and a snapshot layer for a live, input-guarded element we already animate. |
| D4 | `app/[locale]/layout.tsx` as root layout; `next/root-params`; `global-not-found` | Root `app/layout.tsx` + proxy-injected lang header (an extra moving part for a value the param already carries); `setRequestLocale` in every page (superseded by root params in 16.3). |
| D5 | Kernel owns locale negotiation; the proxy calls it; next-intl only formats messages | next-intl middleware: its matcher/negotiation does not express the alias rules (region stripping, `zh-TW → zt`, product codes ≠ BCP 47), so custom code is needed anyway, and two negotiators would drift. |
| D6 | Content is repo-owned typed data compiled and validated at build | Runtime lazy validation + per-variant fallback (defensive layers for content that should never ship invalid); Sheets as a runtime source (the sync never succeeded and questions never reached runtime, critique §3). A future Sheets importer writes `content/` through a branch like any other change. |
| D7 | Validate only at trust boundaries, one codec each | Defensive checks scattered through components and hooks. |
| D8 | 2–4 options per scoring question, each mapped to a pole; `binary_majority` unchanged | Binary-only schema (contradicts 「유연한 구조」); inventing category/plurality scoring before a real test exists (owner, O5). |
| D9 | Stage per variant is data; `forks` with > 2 options fails the build; reduced motion → story, fixed per run | Silent J→I fallback (overrides the owner's per-test choice invisibly); switching stage when the OS setting changes mid-test. |
| D10 | Derivation total; no derivation-failure state | Carrying §6.7 UI for a branch that cannot be reached. |
| D11 | A run whose content structure changed after a deploy is an expired run | Blocking error screen mid-flow (worse UX, more code, same outcome for the data). |
| D12 | Plain CSS with native layers, one `light-dark()` token file, `.vt-*` skins shared with Claude Design, CSS Modules for private layout | Tailwind v4 (second idiom, scanning and emit-order traps); CSS-in-JS (runtime cost, not loadable by the Claude Design pane). |
| D13 | Pre-paint script sets `data-theme` / `data-consent`; static SSR stays `UNKNOWN` | Dynamic SSR reading a consent cookie (loses static landing); accepting the layout shift. |
| D14 | Keep three legacy storage names/formats (consent, theme, history); version everything else | Migration code (the owner asked for none); renaming consent (re-prompts every returning user). |
| D15 | Result URL format byte-compatible with legacy | A new codec (breaks every result link already shared). |
| D16 | Ask links fully URL-addressed; box id client-generated; OG from resolved content only | Server-created share records (a write at share time, more failure modes); OG text from query strings (the advisory's attack surface). |
| D17 | One `InputGate` primitive; kernel keeps only the 150 ms domain lock | Per-stage ad-hoc guards; a global 350 ms guard on I and D, which the owner never experienced and would add lag. |
| D18 | OS reduced-motion only in v1 | An in-site toggle (new control; C-13 left it open and the owner's principles favour no new controls). |
| D19 | Real-browser tests for React; node-only vitest; rule IDs in test names | jsdom component tests (cannot show history, portals, focus — L39); traceability JSON and Markdown-reading guards (the old apparatus). |
| D20 | Content JSON for the window via a static route handler | Shipping every test's full content in the landing payload (grows with the catalog on the first paint of a mobile page). |

---

## 12. Foundation commit and build order

### 12.1 What the first commit on the new `main` contains (before any feature)

The foundation proves every gate on real, minimal code and puts each boundary in place when its subject exists (no vacuous guards):

- `package.json` pinning `next` ≥ 16.3.6, `react`/`react-dom` (the versions `next` expects), `next-intl` 4, `typescript` 5 strict; dev: `vitest`, `fast-check`, `@playwright/test`, `eslint` + `typescript-eslint`; scripts `lint`, `typecheck`, `test`, `build`, `e2e`, `gate`.
- `tsconfig.json` (strict, `@/*` and `@content/*` paths) plus `src/kernel/tsconfig.json` and `src/engine/tsconfig.json` with `lib: ["ES2023"]`, `types: []`.
- `next.config.ts` with `typedRoutes: true` and `experimental.globalNotFound: true`.
- `eslint.config.mjs` with the §2 boundary rules and the `notFound`-under-`[locale]` ban.
- `vitest.config.ts` (`environment: 'node'`, include `tests/**/*.test.{ts,tsx}`); `playwright.config.ts` with fixed project names `mobile-webkit`, `mobile-chromium`, `desktop-chromium`, preview server mode, explicit `snapshotPathTemplate`.
- `.gitignore` (keeps `.env*.local` ignored; never ignores snapshot directories); `.github/workflows/ci.yml` running the gate.
- `AGENTS.md` (slim), `.claude/CLAUDE.md` pointer, `.claude/settings.json`; `docs/spec/*.md` as headed skeletons, `docs/design/system.md` skeleton, `docs/DECISIONS.md` with the first entry (this architecture's D1–D20, one line each with its rejected alternative).
- `src/kernel/core/*`, `src/kernel/locale/*` with complete tests (locales, display tags, aliases, negotiation, `routeRequest`).
- `src/proxy.ts`, `src/i18n/request.ts`, `messages/{12 locales}.json` with one key, `app/[locale]/layout.tsx` + a placeholder `page.tsx`, `app/global-not-found.tsx`, `app/global-error.tsx`, `ui/skins/{base,tokens}.css` with the layer order and paper tokens.
- One Playwright smoke: `/` redirects to a negotiated locale, `/{locale}` renders with the right `lang`, an unknown path returns 404 with a server-rendered body.
- `public/fonts/` with the Pretendard subset delivery and `OFL.txt` (can move to step 5 if the typeface render check, critique G6, is not done yet).

### 12.2 Build order

| Step | Scope | Depends on | Exit criteria |
|:---|:---|:---|:---|
| 1 Content + scoring kernel | `kernel/content`, `scoring`, `catalog`, `palette`; `content/schemas.ts` and the three real variants restated from requirements + prototype content | foundation | `compileContent(content/)` ok; every `CNT-*` error code has a failing fixture; derivation property tests green; palette invariants green for all variants |
| 2 Run, gate, consent, telemetry, result, history, storage kernel | `kernel/run`, `consent`, `telemetry`, `result`, `history`, `storage`, `stage` | 1 | every row of §4.7.5 and every REQ-L §13.5 matrix row has a named test; result codec decodes a legacy-format fixture and rejects each §6.3 branch with its code |
| 3 Engine + browser adapters | `engine/*`, `platform/browser/*`, `platform/pre-paint.ts`, `platform/client-engine.tsx` | 2 | fake-port tests: StrictMode double boot = one `attempt_start`; throwing storage keeps the flow alive; opt-out drops the queue; `clearRun` atomic |
| 4 Page host end-to-end with the story stage | `app/[locale]/test/[variant]`, `test/error`, `result/…` (mandatory sections, placeholder copy), `ui/experience`, `ui/shell`, `ui/instruction`, `ui/stages/story`, `api/telemetry` | 3 | Playwright on `mobile-webkit`: deep link → gate matrix rows → answer all → result URL (legacy-compatible) → Back goes to the page before the test; reduced-motion users complete every variant |
| 5 Split stage | `ui/stages/split` incl. 3–4 bands and seam drag | 4 | 2/3/4-option fixtures complete; keyboard 1–4/A–D and ↑/↓; 12-locale 360 px overflow check |
| 6 Landing + window | `ui/landing`, field, `ui/window`, `api/content`, history bridge | 5 | card → Q1 → grow → Back → shrink with landing DOM preserved and no RSC request; forward re-grows; reload mid-run resumes; fallback Q1 path; system Back closes an open window |
| 7 Forks stage | `ui/stages/forks`, `InputGate` arming, moving 이전 | 6 | the prototype's 19 input patterns × Chromium/WebKit pass as E2E; focus order and zoom checks for the moving controls |
| 8 Sharing (after O2) | vote store impl, `api/asks`, friend page, per-question OG, share sheet, story card | 7, O2 | vote dedupe/expiry tests; OG renders CJK via a static font subset; in-app browser smoke |
| 9 B0 surfaces (after O4) | menu (locale, theme, privacy recall), consent banner, history page, blog, result content | 4, O4 | banner line budget in 12 locales; recall semantics; history status-at-read |
| 10 Design-system bundle | `scripts/design/bundle.ts`, gallery export, Claude Design v3 push | 5–7 | bundle files hash-equal their sources; rendered specimen contrast gate green |

---

## 13. Owner decisions and where the architecture keeps them late

| Decision | Seam that keeps it cheap | Default the code assumes until decided |
|:---|:---|:---|
| O1 desktop | layout tokens (`--app-w`) and the shell; no hover-only code paths exist | centred phone column, pointer + keyboard parity |
| O2 sharing/votes infra, telemetry sink, domain | `VoteClient` / vote store / telemetry sink ports; `engine.votes = null` hides the ask icon | sharing off; telemetry validated then discarded (as today) |
| O3 content source, launch locales | `content/` is the only entry; an importer writes files | repo-owned files; `en` fallback for untranslated content |
| O4 result page, after-submit transition, B0 surfaces | `ResultView` is complete data; `minDerivationMs` is a context value; B0 surfaces consume existing stores | mandatory sections with placeholder copy; `minDerivationMs` from the EXP spec |
| O5 residual conflicts | history list-only; N-ary semantics = new `scoringMode`; unavailable tap = toast | as critique §5 recommends |
| O6 terms / privacy notice | the gate note keys are message keys; a link slot in the dialog | copy as today until the notice exists |
| O7 visibility / licence | none needed in code | — |
| Stage per test (owner at launch) | `VariantSource.stage`; build rejects impossible assignments | `split` |

---

## 14. Risks

1. **The window relies on Next's native-History integration.** Verified in docs and in the 16.2.4 source (§15), but the source carries a TODO to move to the Navigation API. Mitigation: the step-6 E2E asserts node identity and zero RSC requests across grow/Back/forward on the pinned version; if a future Next breaks it, the fallback is to `router.replace` to the page host once the window has fully grown — the session resumes from storage, so only the shrink-on-Back animation is lost.
2. **`next/root-params` and `experimental.globalNotFound` are version-bound.** Re-verify on the pinned 16.3.x in the foundation spike; `setRequestLocale` is the documented fallback for the former.
3. **`light-dark()` browser floor** (Safari 17.5-class). Spike it on `mobile-webkit`; if it fails, the bundle script generates the second theme block instead of anyone writing it.
4. **Canvas/WebGL cost on low-end phones.** Stages and the field are separate lazy chunks; the platform spec sets a JS/GPU budget and the measured fallback rule (critique G15).
5. **Moving controls and spatial submit in J** (focus order, zoom, screen readers) — high-risk in the plan, covered by E2E in step 7.
6. **iOS edge-back gesture** vs D's left edge and J's swipes, now more consequential because Back is meaningful in the window. Real-device check in step 6/7.
7. **The build-time content gate** is only as strong as the rules it runs; a rule missing from `compileContent` is a rule missing everywhere. Mitigation: every `CNT-*` rule ships with a failing fixture in step 1.
8. **Consent copy promises 「약관」 with no terms page** (critique G3) — outside the architecture, but the gate cannot ship to production before O6.
9. **Result links already in the wild** depend on decoding the legacy payload forever; a legacy-format fixture is part of step 2's exit criteria.
10. **OG images with CJK** need a static, non-variable font subset for `next/og` (C-7); planned in step 8.

---

## 15. Verified framework facts

| # | Fact the design relies on | Source |
|:---|:---|:---|
| F1 | Intercepting routes use `(.)`/`(..)`/`(...)` relative to **route segments**, ignore `@slot` folders; slots are not URL segments; all slots at one level share a rendering mode | context7 `/vercel/next.js/v16.2.9` — `intercepting-routes.mdx`, `parallel-routes.mdx` |
| F2 | A `Link` to an intercepted route opens it in the slot; direct navigation or refresh renders the full page; `default.js` renders slots on hard navigation and is needed for parallel slots in v16 | context7 `/vercel/next.js/v16.2.9` — `parallel-routes.mdx`, `default.mdx`, `upgrading/version-16.mdx` |
| F3 | The interception rewrite matches on the `Next-Url` header with the intercepting route's regex plus `(?:/.*)?`, i.e. navigation from **any descendant** of the intercepting route is intercepted | installed source `node_modules/next/dist/lib/generate-interception-routes-rewrites.js` (next 16.2.4) |
| F4 | Native `window.history.pushState/replaceState` integrate with the App Router and sync `usePathname`/`useSearchParams`, including path changes | context7 `/vercel/next.js/v16.2.9` — `linking-and-navigating.mdx`, `single-page-applications.mdx` |
| F5 | Next patches `pushState/replaceState` to copy its `__NA` flag and route tree into the caller's state object (custom keys preserved) and dispatches a restore; `popstate` with `__NA` traverses to the stored tree; traversal and initial load preserve custom history state | installed source `next/dist/client/components/app-router.js`, `segment-cache/navigation.js`, `router-reducer/create-initial-router-state.js`, `reducers/restore-reducer.js` (16.2.4) |
| F6 | `middleware` is renamed `proxy` (`export function proxy`); the proxy runtime is Node.js and cannot be configured; edge is not supported there | context7 `/vercel/next.js/v16.2.9` and canary `upgrading/version-16.mdx` |
| F7 | `global-not-found.js` needs `experimental.globalNotFound: true`, must return a full `<html><body>` document and import its own styles; intended for root layouts under top-level dynamic segments | context7 `/vercel/next.js/v16.2.9` — `not-found.mdx` |
| F8 | `typedRoutes: true` is a top-level config; `PageProps<'/route'>` / `LayoutProps` are global generated helpers; `params` and `searchParams` are Promises | context7 `/vercel/next.js/v16.2.9` — `typedRoutes.mdx`, `page.mdx`, `layouts-and-pages.mdx` |
| F9 | `next/root-params` is available by default in Next ≥ 16.3 (earlier behind `experimental.rootParams`); next-intl reads `rootParams.locale()` in `getRequestConfig`, making `setRequestLocale` unnecessary; root params do not work in Route Handlers or Server Actions yet | context7 `/amannn/next-intl` — `routing/setup.mdx`, `blog/nextjs-root-params.mdx`, `usage/configuration.mdx` |
| F10 | next-intl 4: `NextIntlClientProvider` inherits messages and formats from `i18n/request.ts` | context7 `/amannn/next-intl` — `blog/next-intl-4-0.mdx` |
| F11 | `useSyncExternalStore`'s `getServerSnapshot` is used for SSR and hydration and must equal the first client render; `getSnapshot` must return a cached immutable value | context7 `/reactjs/react.dev` — `useSyncExternalStore.md` |
| F12 | `<ViewTransition>` is stable in React 19.3 (react.dev blog, 2026-09-09); the reference page still carries a canary label; animations run only for Transition-marked updates | context7 `/reactjs/react.dev` — `blog/2026/09/09/react-19-3.md`, `reference/react/ViewTransition.md` |
| F13 | Tailwind v4 emits into native cascade layers `theme, base, components, utilities`; custom utilities use `@utility` | context7 `/websites/tailwindcss` — `theme`, `preflight`, `upgrade-guide` |
| F14 | GHSA-vcvr-r3jv-pc5j (`next/og` ImageResponse RCE) affects 16.2.0–16.3.5, fixed in 16.3.6 | `understand/critique.md` §3 #8 (verified there against the GitHub advisory and npm) |

Not verified here and left to the foundation spike: F5 on the pinned 16.3.x (the check is the step-6 E2E), `light-dark()` on the target WebKit, and whether a `dynamicParams = true` export in `test/[variant]/page.tsx` overrides the root layout's `false` for that segment (the legacy recovery route suggests it does).
