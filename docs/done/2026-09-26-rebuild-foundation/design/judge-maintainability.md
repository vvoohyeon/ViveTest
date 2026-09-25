# Judgement: the three rebuild architectures, scored for cleanliness and maintainability

Judge report, written 2026-09-26. Read-only: nothing under `/Users/woohyeon/Local/ViveTest` or `MOCK/` was modified. The only repo reads were two framework source files under `node_modules/next` (16.2.4) and the header of `MOCK/shared/shell.js`. I read the three proposals in full: `design/arch-domain-core.md` (1,074 lines), `design/arch-next-native.md` (988), `design/arch-design-system-first.md` (788). I also read these inputs: `understand/prototype.md` §0–§9, `peer-handoff-2026-09-26.md`, `contracts.md` (full), `design-system.md` §5–§8, `mess-diagnosis.md` (full), `governance.md` §2–§3 and `critique.md` (full).

Abbreviations:

- **DC** is the domain-core proposal, **NN** is Next-native and **DSF** is design-system-first.
- `C§4.x` is `contracts.md` §4.x.
- `MD Rule n` is `mess-diagnosis.md` §6 Rule n.
- `L##` is a governance stack lesson.
- `MOCK/` is the prototype scratchpad.

---

## 0. Verdict

| Rank | Proposal | Score (1–10) | Decisive reason |
|:---:|:---|:---:|:---|
| 1 | **Next-native (NN)** | **8** | The framework carries the product map. The repo owns the least in-house infrastructure: no engine, no ports, no history bridge, no content JSON endpoint. Structural facts are enforced by the compiler and by markers, so there is no parity test: messages parity comes from `satisfies`, the telemetry type and its validator are one zod schema, and boundaries use `server-only`/`client-only`. Only two file-system checks remain. It pays for this with several small compensating rules around the intercepting route and six spikes that must pass before the foundation lands. |
| 2 | **Domain-core (DC)** | **7** | It has the most rigorous single home for every business rule: branded index spaces, one transition table, total derivation, and one codec per trust boundary. The cost is the largest custom runtime. That runtime comprises a stateful engine, ports, an effect executor, a composition root and three `tsconfig` projects. The window is built as a hand-owned History-API layer that needs a second content transport (`/api/content/…`). |
| 3 | **Design-system-first (DSF)** | **6.5** | It has the best design-system discipline: pure-view components, one CSS entry, specimens rendered from product code, `paletteScope()`, and a native `<dialog>`. It also carries the heaviest per-component apparatus (three files per block plus a gallery, a bundle and specimen tests from the foundation on). Its central routing claim is wrong: a route group does not scope interception (§3, W1), and it keeps a static `test/error` sibling that the interception rewrite shadows. |

**Recommendation.** Build on NN's skeleton, which routes the window, keeps layers thin, enforces the server/client split with markers, types messages, uses zod telemetry and routes every link through next-intl navigation. Fold in DC's domain semantics without its engine/ports layer, and DSF's UI discipline without making the specimen apparatus a foundation deliverable. §5 lists the grafts in priority order and §6 writes out the resulting architecture.

---

## 1. What I verified in this session

| # | Fact | Source | Bears on |
|:---|:---|:---|:---|
| V1 | React 19.3 (2026-09-09) declares `<ViewTransition>` **stable**. The reference page still carries a stale `version: canary` label | context7 `/reactjs/react.dev` — `blog/2026/09/09/react-19-3.md` vs `reference/react/ViewTransition.md` | DSF F11 is outdated. DC F12 and NN F13 are correct |
| V2 | In Next canary, `experimental.viewTransition` "was inert and removed in PR #96098". Route navigations are transitions, so `<ViewTransition>` animates with no configuration | context7 `/vercel/next.js` — `evals/agent-043-view-transitions/EVAL.ts`, `docs/01-app/02-guides/view-transitions.mdx` (canary) | NN §10's `experimental.viewTransition: true` is likely dead config |
| V3 | next-intl: `setRequestLocale` is **legacy**. A setup that reads `next/root-params` in `getRequestConfig` is "automatically eligible for static rendering", with `generateStaticParams` still required | context7 `/amannn/next-intl` — `routing/setup.mdx`, `blog/nextjs-root-params.mdx` | DSF F8 ("must be called in every layout/page") is outdated. DC and NN are correct |
| V4 | The intercepting route is normalised with `normalizeAppPath`, which drops **route groups** and **`@slot`** segments. The header regex is that path plus `(?:/.*)?`, so every descendant page of the intercepting segment triggers interception | `node_modules/next/dist/shared/lib/router/utils/interception-routes.js` (`extractInterceptionRouteInformation`), `…/app-paths.js` (`normalizeAppPath`: "Groups are ignored", "Parallel segments are ignored"), `dist/lib/generate-interception-routes-rewrites.js` — next **16.2.4** installed, read-only | DSF §8.1 claims the opposite for `(deck)/@window` (W1). DC F3 and NN F5 are correct |
| V5 | Interception rewrites are pushed into `rewrites.beforeFiles`, so they win over static filesystem siblings on a soft navigation | `node_modules/next/dist/build/index.js:716–717` (16.2.4) | NN F6 is correct. DSF's `[locale]/test/error` sibling is shadowed (W2) |
| V6 | On a soft navigation a slot keeps its active segment even when the URL no longer matches it. The client reuses the previous route's segment for a "default" slot, and a modal slot closes only by matching a `null` page or by `router.back()`. Next 16 requires `default.js` for slots | context7 `/vercel/next.js/v16.2.9` — `parallel-routes.mdx`, `default.mdx`, `upgrading/version-16.mdx`; canary `render-tree.ts` `reuseActiveSegmentInDefaultSlot` | Any intercept design needs URL-derived visibility (NN §5.4) or a presence snapshot (DSF §8.2) |
| V7 | `light-dark()` is supported from Chrome 123, Firefox 120 and Safari 17.5 | context7 `/mdn/browser-compat-data` `css/types/color.json` | DSF K3 (no `light-dark()`, one attribute-keyed dark block) has a real reason: the friend vote page opens in iOS in-app WebViews |

These were not verified here and stay as spikes:

- whether the V4/V5 rewrite logic is unchanged in the pinned 16.3.6 (it is unchanged in 16.2.4 and there is no sign of a change);
- whether a popstate restore runs inside a Transition, which decides whether `<ViewTransition>` animates system Back;
- whether an intercept page is prerendered;
- whether Chromium's CloseWatcher anti-abuse still lets a `keydown`-prevented Esc reach `cancel`;
- whether a `dynamicParams = true` page overrides a `false` root layout.

---

## 2. The lens as measurable criteria, with evidence

| Criterion | DC | NN | DSF |
|:---|:---|:---|:---|
| **K1 One mechanism per concern** | Strong for rules: one reducer per machine and effects as data. There are **two** styling idioms: global `.vt-*` skins plus CSS Modules for private layout (§7.6). There are **two** content transports: RSC for pages, and `GET /api/content/{locale}/{variant}` for the window (§7.5) | One styling idiom (plain CSS in layers). One link builder: next-intl `createNavigation`, with `next/link` banned elsewhere. One payload definition: a zod schema serves as both type and validator. The share sheet uses a second history mechanism, `?ask=1` via `pushState` (§7.7) | One styling idiom with one CSS entry. One overlay primitive (native `<dialog>`). One palette emitter (`paletteScope()`) and one poster-mesh definition (`coverStyle()`) |
| **K2 In-house infrastructure the repo must own** | Largest: 7 engine files, 7 browser adapters, 4 server adapters, a composition root, a window machine with 8 states × 8 events × 7 effect kinds, a history bridge and a fallback Q1. Three `tsconfig` projects (`tsc -b`) | Smallest: 9 thin `client/` modules, of which `launch.ts` and `layer-store.ts` are the only window-specific ones. The window itself is route files plus one layer component | Medium to large: a gallery harness, one `*.specimen.tsx` per block, `scripts/design-bundle.ts`, `tests/specimens/`, `stylelint`, `WindowHost` + `use-presence` + `choreography.ts` + `return-hint.ts`, and a fallback Q1 |
| **K3 Duplication of values and rules** | None authored twice. `token-values.ts` reads `tokens.css` at build | None authored twice. `/* @export */` markers in `tokens.css` are read at build. Messages parity is by type | None authored twice. The bundle byte-copies CSS and self-checks its hashes. There is one dark block, keyed by attribute |
| **K4 Guard and test overhead that is not behavioural** | Five static checks, one of them a message-parity test. Everything else is behavioural and named by rule ID | **Two** static checks (the `vercel.json` freeze keys and the absence of `middleware.ts`). Everything else is ESLint, `tsc` or behaviour, and an E2E link crawl replaces the route-table guard | ESLint plus stylelint plus a regex rule for hex string literals. The specimen suite is behavioural on renders but is a second test surface to maintain from the foundation on |
| **K5 Documents to read for a typical change** | 6 specs + `design/system.md` + `DECISIONS.md` | Same set, plus `design-system/{README,SKILL,SYNC}` | Same set, plus `docs/design/{SKILL,SYNC}.md` |
| **K6 In-house concepts a new session must learn before editing** | About 9: kernel, engine, ports, effects, stores, platform, composition root, window machine and history bridge | About 6 layers, plus four window rules (launch mark, URL-derived `open`, open-counter key, reserved id `error`) | About 10: ui, stages, experience, domain, platform, content, gallery and app, plus the specimen/bundle pipeline and the `StageModule` contract |
| **K7 Dependence on unverified or internal behaviour** | The window relies on Next keeping the landing tree mounted under a `pushState`-changed path, and on its history-state patching, which DC read from source (DC §14 risk 1). A `router.refresh()` would swap the landing out mid-test | Six spikes (S1–S6) must be green before S lands, and popstate animation is unknown (§15 risk 2) | Two spikes. Its main routing assumption is false (W1) |
| **K8 Correctness of framework claims** | All checked claims hold. One rejection reason is overstated (W5) | One outdated config flag (W4). One requirement reinterpretation is presented as free (W6) | Three outdated or wrong claims plus one unaccounted trap (W1–W3, W2) |

---

## 3. Per-proposal assessment

### 3.1 Next-native: 8 / 10

Decisive strengths:

- **The route tree is the product map (AD-1).** The window is a `@window` slot filled by `(.)test/[variant]`, so prefetch, deep links, Back and RSC data come from the framework. There is no `postMessage`, no hand-kept history counter and no content endpoint (§5.1–§5.2). This matches mess-diagnosis Rule 4 (write each thing once) at the code level.
- **Structural facts are enforced by tools, not bespoke tests.**
  - `satisfies Messages` makes key parity a compile error.
  - A zod `.strict()` discriminated union is both the payload type and the hygiene validator, shared by the client and `/api/telemetry` (§7.8).
  - `server-only`/`client-only` markers turn a wrong import into a build error (§6.2).
  - Raw Web Storage outside `client/storage.ts` is a lint error. This replaces the legacy `safe-storage-discipline` guard with configuration.
  - Two static checks in total (§11.3).
- **One way to build a link.** next-intl `createNavigation` with `pathnames` is the only route builder, which retires the legacy "RouteBuilder + no manual concat" rule instead of restating it (§6.2).
- **Sharing is designed for the real hostile environment.** A Server Action `<form>` lets friends vote in KakaoTalk and Instagram WebViews before hydration (F18). OG images are generated statically from enum params only, so the GHSA-vcvr-r3jv-pc5j precondition cannot occur (§7.7).
- **It drops the prototype's 3 s fallback Q1.** That fallback existed because an iframe could stall silently. A stage-chunk failure hits an error boundary instead (§5.6), which is one mechanism fewer than DC and DSF have.
- **Unit tests are colocated** and `src/**/*.test.{ts,tsx}` from day one, so the L35 trap has no subject.

Decisive weaknesses:

- **The window needs four compensating rules**: the launch mark, URL-derived `open`, an open-counter key reset and the reserved id `error`. Each is small, but each is something a new session has to understand before touching the window, and together they are the proposal's main onboarding cost.
- **Six pre-foundation spikes.** One of them, popstate animation (S3), can leave system Back as the only unanimated exit. That would violate the owner principle "content visible during transitions".
- **The share sheet gets a history entry (`?ask=1` via `pushState`).** An overlay that owns a history entry is exactly the L53/L59 hazard family. A native dialog gives Android Back → close for free (DSF K9).
- **Two locale identities.** The internal locale is BCP 47 (`ko`) and the URL uses the product code (`/kr`). The mapping is confined to `routing.ts` and `productLocale()`, but an agent must know which one to use where. The legacy `NEXT_LOCALE=kr` cookie also stops matching.
- The run reducer's events are mapped to side effects "in one effect" (§7.5). If that effect is a `useEffect`, StrictMode double-invocation and deferred timing come back. Effects should run where the dispatch happens (§6.4 below).

### 3.2 Domain-core: 7 / 10

Decisive strengths:

- **Every rule has exactly one home, and the UI cannot re-derive one.** `RunView` arrives precomputed with progress, marks, CTA sets, locks and eligibility (§4.7.6), and the transition table in §4.7.5 is the whole run contract on one page.
- **Correctness by type rather than by guard:**
  - `QuestionIndex` and `ScoringOrdinal` are distinct brands, so mixing them is a compile error;
  - `derive()` accepts only `CompleteResponses`, which makes it total, so the derivation-failure UI (REQ-T §6.7) is provably unreachable and is not built;
  - `forks` with more than two options fails the build.
- **It names the trust boundaries and validates only there** (URL, storage, network, content build), with one codec each (§4.1, D7). This is the clearest reading of the owner's "누적된 방어코드 없이" (without accumulated defensive code).
- **`structureHash` in the run record** turns a content deploy under an in-flight run into an ordinary expiry instead of the legacy mid-flow blocking error (D11).
- **Storage continuity with zero migration code:** it keeps three legacy key names and formats and versions everything else under `vt1:` (D14).
- It is honest about which requirements it deliberately does not implement, and why (§10.1 end).

Decisive weaknesses:

- **It adds a mini-framework to maintain.** `engine/` adds ports, keyed schedules, effect-ordering semantics, memoised sessions, a cross-tab listener and a composition root, all on top of the kernel. For roughly five small machines, that indirection is the largest fixed cost of any proposal. Adding sharing touches the kernel type, the effect union, the engine, a port, a platform adapter, the UI and a route.
- **The window is a hand-owned History-API layer** (§7.4). It works like this:
  - it pushes `/{locale}#{variant}` at open and replaces the URL with `/test/{v}` at Q1;
  - the landing tree stays mounted under a test URL;
  - it needs a history bridge, a pop-driven machine and a second content transport (`api/content`, D20).
  - This is the custom-history territory where the old repo accumulated its lessons (L43, L53, L59). It depends on Next's history-state patching (DC risk 1) and breaks if anything calls `router.refresh()` mid-test.
- **Two styling idioms**: `.vt-*` skins and CSS Modules.
- **Three `tsconfig` projects** add build-graph weight to the typecheck step for an isolation that ESLint `no-restricted-globals` would also give.

### 3.3 Design-system-first: 6.5 / 10

Decisive strengths:

- **The design system cannot drift, by construction.**
  - `src/ui/**` holds pure views that receive translated strings as props, lay themselves out entirely in CSS, and let JS write only custom properties and attributes (§6.1).
  - Co-located specimens are rendered with `renderToStaticMarkup` into a static bundle that byte-copies the CSS. That bundle feeds both Claude Design v3 and Playwright axe/contrast/pixel checks (§10).
  - This answers mess-diagnosis D3/D8 (nine homes per value, eleven artifacts per token decision) more completely than either other proposal.
- **`paletteScope()` is the one emitter of `--t-*`**, including the on-world inks, and **`coverStyle()` is the one poster mesh.** Card, window, J sky, specimens and the field fallback all use them (§5.2). Invariants PAL-1…7 are math in `npm test` (§5.3).
- **One overlay primitive on native `<dialog>`** (§6.4):
  - the top layer escapes the window's `clip-path`;
  - DOM inheritance carries `--t-*` with no portal;
  - native inertness;
  - no history entries;
  - always mounted, driven by an `open` prop (L39).
- **The `StageModule` contract** declares `maxAnswers`, the progress axis, the submit owner and the placement of 이전 (Previous) as data, and exposes pure `railColor`/`chromeTone` functions (§7.1). This removes the prototype's imperative `setTone` and lets a resume redraw from data.
- **`use-presence`** keeps the last slot content rendered until an exit animation ends, so every exit, including system Back, plays the same animation (§8.2).
- **A concrete `data-theme` from the bootstrap with a single dark block** has no browser-support floor (K3). That matters for the in-app-WebView audience (V7).
- **Stylelint configuration instead of bespoke guards:** a `vt-` class pattern, no hex outside `tokens.css` and no `!important` (§3.2).

Decisive weaknesses:

- **The core routing claim is false (W1).** Putting `@window` under `(deck)` does not stop interception from blog, history or result pages. The rewrite fires there too, so a navigation from `/kr/blog` gets rewritten into a `(deck)` tree whose `children` slot has no active segment. NN designed around the real behaviour; DSF did not.
- **The same blind spot sets up a loop (W2).** `[locale]/test/error` stays a static sibling of the intercepted path, and interception rewrites shadow it on soft navigation (V5). A server `redirect()` from an intercepted unknown variant to `/test/error` is itself intercepted, which is the redirect-inside-intercept loop NN §5.3 names.
- **Apparatus arrives before product.**
  - Every block is three files: view, CSS and specimen.
  - A gallery harness, fixtures, the bundle script and a specimen test suite are foundation deliverables (§15), before any product surface exists.
  - That repeats the order mess-diagnosis D6 warns about ("the apparatus became the product"), and applying the specimens to every experience-level component would double the files per change.
- **Two outdated framework claims** (W3: `ViewTransition` canary-only; `setRequestLocale` required).
- **Nine or ten top-level source concepts**, the most of the three.

---

## 4. Wrong or outdated claims

| # | Proposal and place | Claim | Evidence | Verdict |
|:---|:---|:---|:---|:---|
| W1 | DSF §8.1, §13.1 | "Because the slot is declared in the `(deck)` layout only, a navigation to a test from any other surface (blog, history, result, recovery cards) renders the full page" | `normalizeAppPath` drops groups and `@slot`s, so the intercepting route is `/[locale]` and the header regex `/[locale](?:/.*)?` matches `Next-Url` from every locale page. The rewrite has no other condition (V4) | CONFIRMED on 16.2.4 source; PLAUSIBLE for 16.3.6 |
| W2 | DSF §12 (routes beyond §8.1) | A `test/error` recovery route coexists with `(.)test/[variant]` interception | Interception rewrites are `beforeFiles` (V5), so a soft navigation to `/kr/test/error` is rewritten to the intercept with `variant='error'`, and a server redirect to it from the intercept loops | CONFIRMED (mechanism); loop PLAUSIBLE |
| W3 | DSF F8, F11, §8.3 | `setRequestLocale` must be called in every layout/page for static rendering, and `<ViewTransition>` is "only in React's Canary and Experimental channels" | next-intl docs mark `setRequestLocale` as legacy under `next/root-params` (V3). The React 19.3 blog declares ViewTransition stable; DSF read the stale reference-page label (V1) | CONFIRMED |
| W4 | NN §10, F14 | `experimental: { viewTransition: true }` is needed | Next canary removed the inert flag (#96098); navigations are transitions and need no config (V2) | PLAUSIBLE (canary; unconfirmed for 16.3.6) |
| W5 | DC D3 | Intercept is rejected because "the URL must change on **card open**" and "Back unmounts the slot before a shrink can play" | DC itself pushes a history entry at card open (`/{locale}#{variant}`, §7.4), because the a11y floor requires Back to close the window, so the first reason is shared by DC's own design. The second is solved by a presence snapshot (DSF §8.2) | CONFIRMED (overstated rejection) |
| W6 | NN §5.3, §7.9 | The legacy recovery URL is "served for free" by rendering the recovery view in place for unknown ids | C§4.1 "Test route" requires invalid variants to **redirect** to `/test/error?variant=…`. In-place rendering changes the URL a user sees and shares. It is a defensible simplification but a class-A requirement change, so it needs a `DECISIONS.md` entry rather than being framed as equivalent | CONFIRMED (mis-characterised) |

---

## 5. Grafts the final architecture must adopt, ranked

Effect is the reduction in maintenance cost or defect exposure, effort is implementation cost, and "Risk if skipped" is what goes wrong without it. P1 = foundation, P2 = with the first feature that needs it, P3 = when its subject exists.

| # | Graft | From | Effect | Effort | Risk if skipped | Priority |
|:---|:---|:---|:---|:---|:---|:---:|
| G1 | Window = `[locale]/@window/(.)test/[variant]` + `@window/default.tsx` → `null`, pushed at **card tap**. A launch mark decides window vs full mode. Visibility is derived from `usePathname()`, and a key counter resets the layer | NN AD-1, §5.3–§5.4 | high: no content endpoint, no history bridge, framework deep link and Back | medium | a custom history layer (DC) or broken navigation from blog/result (DSF W1) | P1 |
| G2 | No static route under `test/` except `[variant]`. Both the page host and the intercept render `Recovery` **in place** for unknown or non-enterable ids, with no redirect. The URL `/{p}/test/{id}` already carries the requested id, which satisfies "variant kept, not shown". The change from the legacy redirect to `/test/error?variant=` is recorded as a requirement change in `DECISIONS.md` (W6) | NN §5.3 + W6 fix | medium: no shadowed sibling, no redirect loop, one fewer route | low | W2 loop | P1 |
| G3 | Exit animations **react** to route state through a presence snapshot of the last slot element, the same path for 닫기 (Close), outside tap, Esc, wordmark, [거부하고 중단] (Deny and exit) and system Back. Grow, shrink, open and close use CSS/WAAPI clip-path with the prototype's values. **No `<ViewTransition>` for the window** | DSF §8.2 `use-presence` + choreography | high: one animation mechanism covers every exit, including popstate | medium | an unanimated system Back (NN risk 2) | P1 |
| G4 | Messages as `src/messages/<locale>.ts` `satisfies Messages`, so parity is a type error | NN §7.2, §11.3 | high: removes a parity test for good | low | a bespoke parity test | P1 |
| G5 | `server-only`/`client-only` markers plus ESLint `no-restricted-imports`/`no-restricted-globals` per directory as the whole boundary mechanism. One `tsconfig` | NN §6.2 (instead of DC's three `tsconfig` projects) | medium | low | build-graph weight, or prose boundaries | P1 |
| G6 | next-intl `createNavigation` is the only link and redirect builder. `next/link` and `next/navigation` router APIs are banned elsewhere. `typedRoutes` is off | NN §6.2, §7.1 | medium: one route builder | low | two builders drifting | P1 |
| G7 | Telemetry = one zod `.strict()` discriminated union used as the type **and** the validator on client and server. `choice` widens to A–D and `stage` joins the attempt events | NN §7.8 | high: payload hygiene is structural | low | a hand union plus a hand validator (two homes) | P2 |
| G8 | Branded `QuestionIndex` vs `ScoringOrdinal`, `CompleteResponses` → total `derive()`, and no derivation-failure state | DC §4.2, §4.6, D10 | high: a class of telemetry and derivation bugs cannot compile | low | index-mixing bugs; dead error UI | P2 |
| G9 | The run and the gate as **one** pure `step(state, event, ctx) → { state, effects }`, with DC's transition table (§4.7.5) as the normative table in `spec/domain.md` and tests named by rule ID. `gateSpec()` + `GATE_EFFECTS`; "Esc writes nothing" = `effects.length === 0` | DC §4.7 | high | medium | rules scattered across hooks | P2 |
| G10 | Effects execute **inside dispatch** in one client module (`run-session.ts`, see §6.4) that is memoised per open and exposed through `useSyncExternalStore`. No engine layer, no ports interface, and no `useEffect` for business side effects | DC §5 collapsed; fixes NN §7.5 | high: StrictMode-safe with no framework-in-a-framework | medium | double emits, or DC's engine layer | P2 |
| G11 | `structureHash` in the run record: a content change under an in-flight run means the run expired | DC D11 | medium | low | a mid-flow blocking error screen | P2 |
| G12 | Validate only at the four trust boundaries (URL, storage, network, content build), one codec each; content is compiled at build with **all** errors returned, and the runtime never re-validates content | DC §4.1, §4.3, D6–D7 | high: this is the definition of "no accumulated defensive code" | low | defensive checks creeping back into components | P1 |
| G13 | Keep the legacy names and formats of consent, theme and history keys only; version the rest (`vt1:`). Result URL codec byte-compatible forever | DC D14–D15, critique G11 | medium: zero migration code | low | re-prompting returning users; broken shared links | P2 |
| G14 | `src/ui/**` components are pure views: no Next, next-intl, router, storage or domain import; strings arrive as props; CSS-complete layout; JS writes only custom properties and attributes | DSF §6.1 | high: specimens are possible and components stay testable | low | components growing hidden dependencies | P1 |
| G15 | `paletteScope()` as the one `--t-*` emitter and `coverStyle()` as the one mesh; palette math is pure; PAL-1…7 invariants run over every test in `npm test` | DSF §5 (math placed in `domain/palette.ts`) | high | low | colour logic in several stages | P2 |
| G16 | One overlay primitive on native `<dialog>`, always mounted and driven by `open`, with no history entry. The share sheet uses it too (`placement: 'bottom'`), **not** `?ask=1` | DSF K9 over NN AD-10 | high: removes the portal, z-index and history families (L39, L40, L53, L59) | medium (spike: Esc is swallowed at `keydown`; Android Back = exit or close) | overlay history bookkeeping | P2 |
| G17 | `StageModule` = `{ meta: { maxAnswers, progress: 'y'｜'x', submit: 'shell'｜'stage', prev: 'centre'｜'follow' }, Stage, railColor, chromeTone }`. The shell reads the meta and J's 이전 moves through a `PrevPort` without React renders | DSF §7.1 | high: stages become replaceable data-driven modules | low | an imperative shell API | P2 |
| G18 | The domain owns the 150 ms lock; one presentation `InputGate` primitive owns the arrival guard, armed per stage when a question settles (J = 350 ms after the signs; I and D measured) | DC §7.3 D17 + DSF K13 | medium: one guard, one place | low | per-stage ad-hoc guards | P2 |
| G19 | One CSS idiom: plain CSS, one entry declaring the layer order once, each file wrapping itself in its layer. **No CSS Modules, no Tailwind.** Stylelint: `vt-` pattern, no hex outside `tokens.css`, no `!important` | DSF §3 over DC D12 | medium | low | two idioms (DC) | P1 |
| G20 | Concrete `data-theme` written by the bootstrap and one attribute-keyed dark block; `data-motion` is the single reduced-motion source (CSS never reads the media query) | DSF K3, K15 (NN has the same `data-motion`) | medium: no support floor for WebView friends | low | invalid colours on iOS < 17.5 in-app browsers | P1 |
| G21 | Pre-paint `data-consent` hides `available` cards by CSS so there is no post-hydration shift while the landing stays static | DC §6, NN §7.6 | medium | low | layout shift for opted-out users | P2 |
| G22 | Static per-(locale, variant, question) OG built from enum params; friend vote as a Server Action `<form>` that works without JS; share id generated on the client | NN §7.7 | high (security plus in-app reach) | medium | request input reaching `ImageResponse`; votes broken in WebViews | P3 (O2) |
| G23 | Specimens only for `src/ui/**` blocks, added with each block (not a foundation deliverable), rendered by `renderToStaticMarkup` into the Claude Design v3 bundle, and the **only** pixel-baseline surface (CI Linux container, `updateSnapshots: 'none'`) | DSF §10 scoped by L42, NN F22 | high for the design pipeline | medium | hand-written specimens (v2 drift) or apparatus-first | P3 |
| G24 | Drop the prototype's 3 s fallback Q1. `loading.tsx` plus settle-prefetch plus a stage error boundary replace it | NN §5.6 | medium: one mechanism fewer | low | a second Q1 renderer to maintain | P2 |
| G25 | Five spec documents instead of six: merge `content.md` into `domain.md`, because compile rules are domain rules. Together with `design/system.md` that makes six normative documents, which meets MD Rule 5 (≤ 6) | this judge | medium: fewer documents per change | low | a seventh document | P1 |

---

## 6. The architecture this lens selects

### 6.1 Decisions (chosen, rejected, why)

| # | Concern | Chosen | Rejected and why |
|:---|:---|:---|:---|
| A1 | Window | Intercepting `@window` slot at `[locale]`, pushed at tap (G1). Presence-driven exits (G3) | DC's History-API layer: it needs a second content transport and hand-owned history, and a `refresh` swaps the landing out. DSF's `(deck)` scoping is wrong (W1). An iframe is a mockup device |
| A2 | Window animation | Clip-path CSS/WAAPI with the prototype's timings, driven by a pure window machine that reacts to route plus presence | `<ViewTransition>`, which is stable (V1) but a second animation system whose popstate behaviour is unverified, and snapshots freeze a moving stage |
| A3 | Business side effects | Pure `step → effects`, executed synchronously in `dispatch` by one client module (G9–G10) | DC's engine and ports layer (a mini-framework). A `useEffect` event mapper (StrictMode double runs) |
| A4 | Locale model | next-intl routing with BCP 47 internal locales and product-code prefixes, a pure `entry.ts` for aliases and the allowlist, and `productLocale()` at the edges (NN AD-3) | DC's hand negotiator, which is more custom code than the library's best-fit plus prefixes; product codes as `Intl` locales (`kr` is Kanuri) |
| A5 | Content | `src/content/**` `server-only` typed TS, compiled with all errors at build; views projected per locale on the server (NN AD-6 + DC compile `Result`) | Runtime lazy validation; Sheets at runtime; a content JSON API |
| A6 | Styling | One plain-CSS idiom (G19), one `tokens.css`, a concrete `data-theme` (G20) | Tailwind (L10/L25/L26); CSS Modules as a second idiom; `light-dark()` (V7 floor) |
| A7 | Overlays | Native `<dialog>` primitive for the instruction modal and the share sheet, with no history entries (G16) | NN's `?ask` `pushState`; portals |
| A8 | Stages | `StageModule` meta plus pure functions (G17); one `InputGate` (G18); stages load by dynamic `import()` | Imperative shell API; per-stage guards |
| A9 | Tests and guards | Colocated vitest (node); Playwright on `mobile-webkit`, `mobile-chromium` and `desktop-chromium`; a link crawl; two static checks; ESLint, stylelint and `tsc` for everything structural | Markdown-reading guards, traceability JSON, jsdom component tests |
| A10 | Docs | `AGENTS.md` ≤ 150 lines, `spec/{domain,platform,privacy-telemetry,experience,sharing}.md`, `design/system.md` (names only), `DECISIONS.md` (G25) | A seventh spec; SYNC/SKILL documents before the bundle exists |

### 6.2 Directory tree

```text
/
├─ AGENTS.md  .claude/{CLAUDE.md,settings.json}  vercel.json  .github/workflows/ci.yml
├─ package.json  tsconfig.json  next.config.ts  eslint.config.mjs  stylelint.config.mjs  vitest.config.ts  playwright.config.ts
├─ docs/{DECISIONS.md, spec/{domain,platform,privacy-telemetry,experience,sharing}.md, design/system.md, plans/, done/}
├─ public/licenses/pretendard-OFL.txt
├─ scripts/design-bundle.ts                      (arrives with the first ui block, G23)
└─ src/
   ├─ proxy.ts                                   entry.ts decision → next-intl middleware
   ├─ i18n/{routing.ts, entry.ts, request.ts, navigation.ts}
   ├─ messages/{en,ko,zh-Hans,zh-Hant,ja,es,fr,pt,de,hi,id,ru}.ts   satisfies Messages
   ├─ domain/          PURE — no react/next/DOM, no Date.now/Math.random
   │  ├─ ids.ts        brands: VariantId, QuestionIndex, ScoringOrdinal, ShareId, Pole, EpochMs; AnswerKey A–D
   │  ├─ catalog.ts    attributes, isEnterable, visibleCards(consent), hiddenByConsent
   │  ├─ content.ts    compile rules (CNT-*): 2–4 options → poles, odd counts, axisCount, J ⇒ 2 answers, instruction required
   │  ├─ scoring.ts    completeness → CompleteResponses; derive() (total); type segment
   │  ├─ run.ts        RunState, RunEvent, Effect, step(), view()
   │  ├─ entry.ts      classifyEntry (ingress/resume/cold), staged 7 min, 30 min expiry, structureHash
   │  ├─ gate.ts       gateSpec(), GATE_EFFECTS, qualifier steps
   │  ├─ consent.ts    decide(), transmission(), recall()
   │  ├─ result.ts     legacy-compatible codec + resolveResultView() error taxonomy
   │  ├─ history.ts    list-only history, status at read
   │  ├─ stage.ts      resolveStage(configured, motion)
   │  ├─ palette.ts    look(), answerColors(), storySteps(), legible(), toneFor(), contrast()
   │  ├─ telemetry.ts  zod Event union + Batch (type = validator)
   │  └─ share.ts      ShareId, VoteInput (zod), percentages()
   ├─ content/         server-only: schema.ts (defineTest), tests/*.ts, blog/*.ts, catalog.ts, load.ts (compile once), project.ts (views per locale)
   ├─ server/          server-only: ask-store.ts, telemetry-sink.ts, actions/vote.ts, site.ts
   ├─ client/          client-only: storage.ts, keys.ts, bootstrap.ts, prefs.ts, run-session.ts, history-store.ts, telemetry.ts, launch.ts
   ├─ ui/              PURE VIEWS: index.css, tokens.css, base.css, palette-scope.ts, motion.ts,
   │                   shell/ answer/ overlay/ instruction/ share/ deck/ window/ landing/ paper/ vote/  (block.tsx + block.css [+ block.specimen.tsx])
   ├─ stages/          contract.ts, loaders.ts, split/ forks/ story/  (view.tsx, engine.ts, *.css, colors.ts)
   ├─ features/        composition with behaviour: landing/, window/, test/, share/, result/, consent/, history/, blog/, recovery/
   └─ app/
      ├─ [locale]/layout.tsx  page.tsx  error.tsx  opengraph-image.tsx  manifest.webmanifest/route.ts
      ├─ [locale]/@window/{default.tsx, (.)test/[variant]/{page.tsx, loading.tsx}}
      ├─ [locale]/test/[variant]/page.tsx     result/[variant]/[type]/page.tsx     ask/[variant]/[question]/…
      ├─ [locale]/{blog,blog/[post],history,privacy}/page.tsx
      ├─ api/{telemetry/route.ts, ask/[shareId]/route.ts}
      └─ global-not-found.tsx  global-error.tsx  manifest.ts  robots.ts  sitemap.ts  icon.svg  apple-icon.tsx
```

Comparison with the proposals:

- There is no `engine/` or `platform/` layer (unlike DC), no `gallery/` directory (specimens are colocated in `ui/` blocks), and no route group.
- `domain/` is flat, one concept per file, 80–300 lines each.
- Unit tests sit beside their files as `*.test.ts`.

### 6.3 Dependency rules (ESLint per directory, plus `server-only`/`client-only` markers)

| Directory | May import | Must not import or touch |
|:---|:---|:---|
| `domain/` | `zod`, `domain/` | `react`, `next*`, `next-intl`, every other `src/` directory; DOM globals; `Date.now`; `Math.random`; `crypto` |
| `content/` | `domain/` | `react`, `client/`, `features/`, `ui/`, `app/` (the `server-only` marker makes a client import a build error) |
| `server/` | `domain/`, `content/`, `next/server`, `next/headers` | `client/`, `ui/`, `features/` |
| `client/` | `domain/`, `i18n/routing` (types) | `content/`, `server/`, `ui/`, `features/`, `app/` |
| `ui/` | `react`, `ui/`, `import type` from `domain/` | `next*`, `next-intl`, `client/`, `content/`, `features/`, `stages/`, `app/` |
| `stages/` | `react`, `ui/`, `stages/contract`, `import type` from `domain/` | `next*`, `next-intl`, `client/`, `content/`, `server/`, `features/` |
| `features/` | everything above, `server/actions/*`, `i18n/navigation` | `content/`, other `server/*`, `next/link`, `next/navigation` router APIs, raw Web Storage |
| `app/` | everything | business logic (routes resolve params, load a view and render) |

Global rules:

- No `notFound` import under `app/[locale]/**`.
- No hex string literal outside `domain/palette.ts`, `stages/*/colors.ts`, `content/` and `app/icon.*`.
- Stylelint rules as in G19.

### 6.4 Interface sketches

```ts
// src/domain/run.ts — the whole run + gate contract (normative table = spec/domain.md DOM-RUN-*)
export type Phase = 'booting' | 'preview' | 'gate' | 'commitFailed' | 'answering' | 'deriving' | 'done' | 'exited';
export interface RunRecord { v: 1; variant: VariantId; runId: string; structureHash: string; ingress: boolean;
  responses: Readonly<Record<number /*QuestionIndex*/, AnswerKey | string /*qualifier token*/>>;
  startedAt: EpochMs; lastAnswerAt: EpochMs; dwellMs: Readonly<Record<number, number>>; attemptStarted: boolean }
export type RunEvent =
  | { type: 'boot'; stored: { staged: StagedEntry | null; run: RunRecord | null; seen: boolean }; host: 'window' | 'full' }
  | { type: 'previewAnswer'; key: AnswerKey } | { type: 'gate'; action: GateAction | 'escape' | 'back' }
  | { type: 'qualifier'; token: string } | { type: 'answer'; key: AnswerKey } | { type: 'advanceDue' }
  | { type: 'moveTo'; ordinal: ScoringOrdinal } | { type: 'submit' } | { type: 'minLoadingElapsed' } | { type: 'backFromLoading' };
export type Effect =
  | { type: 'writeRun'; record: RunRecord } | { type: 'clearRun'; variant: VariantId; keepSeen: boolean }
  | { type: 'writeStaged'; entry: StagedEntry } | { type: 'dropStaged'; variant: VariantId }
  | { type: 'setSeen'; variant: VariantId } | { type: 'setConsent'; value: 'OPTED_IN' | 'OPTED_OUT' }
  | { type: 'track'; event: TelemetryDraft } | { type: 'history'; op: 'start' | 'complete'; variant: VariantId; at: EpochMs }
  | { type: 'schedule'; key: 'advance' | 'minLoading'; afterMs: number } | { type: 'cancel'; key: 'advance' | 'minLoading' }
  | { type: 'navigate'; to: ResultHref; mode: 'replace' } | { type: 'exit'; to: 'card' | 'landing' };
export interface RunCtx { test: TestModel; now: EpochMs; consent: Consent; freshRunId: string; minDerivationMs: number }
export function step(s: RunState, e: RunEvent, ctx: RunCtx): { state: RunState; effects: readonly Effect[] };
export function view(s: RunState, t: TestModel): RunView;   // progress, option states, frontier, canPrev/canSubmit, gate spec
```

```ts
// src/client/run-session.ts — the only place effects happen; no engine, no ports interface
export interface SessionIO { store: KeyValue; track(d: TelemetryDraft): void; now(): EpochMs; after(ms: number, fn: () => void): () => void; id(): string }
export interface RunSession { subscribe(fn: () => void): () => void; getSnapshot(): RunView; getServerSnapshot(): RunView;
  dispatch(e: Exclude<RunEvent, { type: 'boot' | 'advanceDue' | 'minLoadingElapsed' }>): void; dispose(): void }
export function openRunSession(test: TestModel, host: 'window' | 'full', openId: number, io?: SessionIO): RunSession; // memoised per (variant, openId)
// dispatch = step() → store state → run effects in order (storage before track) → notify once.
// Tests pass a fake SessionIO; production uses the default built from client/storage + client/telemetry.
```

```ts
// src/client/storage.ts
export interface KeyValue { get(area: 'local' | 'session', key: string): string | null; set(area: 'local' | 'session', key: string, v: string): boolean; remove(area: 'local' | 'session', ...keys: string[]): void }
export const storage: KeyValue;          // never throws; set() === false flips the degraded flag in the view
// src/client/keys.ts — kept: 'vivetest-telemetry-consent', 'vivetest-theme', 'test:runHistory'; new: vt1:run:{v}, vt1:staged:{v}, vt1:seen:{v}, vt1:session
```

```ts
// src/stages/contract.ts
export interface StageProps {
  view: RunView; text: StageText; palette: Palette; motion: 'full' | 'reduced';
  presentation: { kind: 'window'; insets: Insets; active: boolean } | { kind: 'full' };
  gate: InputGate;                                     // arm(ms) on settle; presses started before arming are void
  act: { answer(k: AnswerKey, origin?: Point): void; prev(): void; moveTo(o: ScoringOrdinal): void; submit(): void };
  prev: PrevPort; onReady(): void; onSettled(ordinal: ScoringOrdinal): void;
}
export interface StageModule {
  meta: { kind: 'I' | 'J' | 'D'; maxAnswers: 2 | 4; progress: 'y' | 'x'; submit: 'shell' | 'stage'; prev: 'centre' | 'follow' };
  Stage: React.ForwardRefExoticComponent<StageProps & React.RefAttributes<StageHandle>>;
  railColor(p: Palette, ordinal: number, key: AnswerKey, count: number): Hex;
  chromeTone(p: Palette, ordinal: number): { top: Tone; bottom: Tone };
}
export const loadStage: (k: 'I' | 'J' | 'D') => Promise<StageModule>;   // one chunk per stage; preloaded on deck settle
```

```ts
// src/features/window/window-machine.ts — pure; reacts to route state, never causes it
export type WState = 'rest' | 'opening' | 'open' | 'growing' | 'full' | 'closing' | 'shrinking';
export type WEvent = { type: 'slotMounted'; launched: boolean } | { type: 'stageReady' } | { type: 'q1Answered' }
  | { type: 'slotCleared' } | { type: 'animationDone' };
export function wstep(s: WState, e: WEvent): { state: WState; effect?: 'animateOpen' | 'animateGrow' | 'animateClose' | 'animateShrink' | 'inertLanding' | 'releaseLanding' };
// Every exit calls router.back() (launched) or router.push(landing) + launch.returnTo(v) (not launched); use-presence keeps the
// last slot element until animationDone. open = matchTestPath(usePathname())?.variant === id (URL-derived; V6).
```

```ts
// src/ui/palette-scope.ts
export function paletteScope(p: Palette): { style: Record<`--t-${string}`, string>; 'data-tone': Tone };
export function coverStyle(p: Palette, frame: CoverFrame): { '--cover': string };
// src/domain/telemetry.ts (zod; the type is z.infer<typeof Event>)
export const Event: z.ZodDiscriminatedUnion<'event_type', …>;  export const Batch = z.array(Event).min(1).max(50);
```

### 6.5 Window lifecycle (one table, every path)

| Event | URL/history | Slot | Mode | Mechanism |
|:---|:---|:---|:---|:---|
| Deck settles on a card for 350 ms | — | — | — | `router.prefetch(testHref)` + `preloadStage()` |
| Tap card / Enter | push `/{p}/test/{v}` (next-intl `Link`, `onNavigate` → `launch.mark(v)`) | intercept renders the layer | window | `wstep slotMounted(launched)` → clip-path open |
| 닫기 (Close) / outside tap / Esc before answering | `router.back()` | cleared | — | presence snapshot → `animateClose` |
| System Back (any state) | popstate | cleared | — | the same presence path; animated like every other exit |
| Q1 answered | unchanged | same instance | window → full | `dispatch(previewAnswer)` → `animateGrow`; the stage keeps moving |
| Wordmark / [거부하고 중단] (Deny and exit), launched | `router.back()` | cleared | — | `animateShrink` into the same card |
| Wordmark, not launched (hard load, or opened from result/blog) | `router.push('/')` + `launch.returnTo(v)` | — | — | the landing mounts centred on that card |
| Submit | `router.replace(resultHref)` | stale instance renders nothing | — | `navigate` effect |
| Hard load `/{p}/test/{v}` | — | `default` → `null` | full | page host |
| Unknown or non-enterable variant | unchanged (`/{p}/test/{id}`); no redirect (W2) | intercept or page renders `Recovery` in place | — | no session is created; the requirement change is recorded in `DECISIONS.md` (G2, W6) |

### 6.6 Styling and design-system pipeline

- `ui/index.css` declares `@layer reset, tokens, base, components, stages, preferences;` once. Every CSS file wraps itself in its layer. Stage CSS loads with its chunk into `@layer stages`.
- `tokens.css` is the only home of CSS values. It uses a concrete `[data-theme=dark]` block (G20). Values needed outside CSS (`themeColor`, icon and OG colours) are read from `/* @export */` markers at build (NN §9.4), so nothing is generated into the repo.
- Per-test colour lives in content (`palette`), is computed by `domain/palette.ts` and emitted only through `paletteScope()` and `coverStyle()`. The PAL-1…7 invariants run over every test.
- Specimens (G23) arrive with each `ui/` block. `scripts/design-bundle.ts` renders them with `renderToStaticMarkup` into `.design-bundle/` (gitignored), byte-copies the CSS, checks its own hashes and writes `BUILD.json`. The agent that lands a `ui/` change runs the bundle and the `DesignSync` push in the same unit.

### 6.7 Tests and guards budget

| Layer | Runner | Asserts | Names |
|:---|:---|:---|:---|
| `domain/*.test.ts` | vitest (node) | every spec rule as table cases; `fast-check` properties for codec round-trip, advance-one, "no transition removes an answer" and percentages summing to 100 | `DOM-*`, `PRV-*` |
| `content/*.test.ts` | vitest (node) | compile of the real catalogue returns no errors; one failing fixture per `CNT-*` code; PAL-1…7 | `CNT-*` |
| `client/run-session.test.ts` | vitest (node, fake `SessionIO`) | effect order, atomic `clearRun`, one `attempt_start` under double boot, throwing storage → `degraded` | `DOM-*` |
| `features/window/window-machine.test.ts` | vitest (node) | every `WState` × `WEvent` | `EXP-*` |
| `tests/e2e/*` | Playwright (preview server) | the §6.5 table, gate matrix rows, Esc twice, reduced motion → D, the 19 input patterns on every stage, 12 locales at 360 px, server-HTML 404 bodies, the link crawl, no-JS vote | `EXP-*`, `PLT-*` |
| specimens | Playwright (CI Linux container) | axe, rendered contrast, about 20 pixel baselines | — |
| static | vitest | `vercel.json` freeze keys (deleted at launch); `src/middleware.ts` absent | — |

The gate is one tier: `lint → lint:css → typecheck → test → build → e2e`, identical in CI and locally, except that pixel comparisons run only in CI.

### 6.8 Traceability: requirement groups (C§4.1–§4.8) → modules

| C§ | Requirement | Module(s) | Proof |
|:---|:---|:---|:---|
| 4.1 | Route surface; pages under `[locale]`; one prefix | `app/[locale]/**`, `i18n/routing.ts` (`localePrefix: always`) | link crawl, `@errors` |
| 4.1 | Single request entry, no business state | `proxy.ts` → `i18n/entry.ts` → next-intl | static check 2, entry unit table |
| 4.1 | Locale-less allowlist | `i18n/entry.ts decideEntry` | unit + E2E |
| 4.1 | Paths only through a builder | `i18n/navigation.ts` + ESLint bans | lint |
| 4.1 | Blog list/detail; invalid → blog index | `blog/[post]/page.tsx` `redirect()` | E2E |
| 4.1 | Test route hosts gate and runtime; invalid → recovery without a session | `test/[variant]` + intercept + `features/recovery` | `@errors` |
| 4.1 | Result route, `replace` arrival | `domain/result.ts`, `navigate` effect | E2E |
| 4.2 | 12 locales, aliases, BCP 47 `lang`, product codes at the edges | `i18n/routing.ts`, `entry.ts`, `productLocale()` | unit + `@i18n` |
| 4.2 | Messages and key parity | `messages/*.ts satisfies Messages` | `tsc` |
| 4.2 | Content localisation with `en` fallback; instruction per variant | `content/project.ts`, compile rule | unit |
| 4.2 | Locale number format | next-intl formatter on the BCP 47 locale | 12-locale E2E |
| 4.3 | Consent machine; SSR `UNKNOWN`; persisted in/out | `domain/consent.ts`, `client/prefs.ts`, bootstrap | unit + E2E |
| 4.3 | Transmission and analytics gates | `client/telemetry.ts`, `features/consent/GatedAnalytics` | E2E request bodies |
| 4.3 | Catalogue filtering; opted-out notice count | `domain/catalog.ts` + pre-paint CSS (G21) | unit + no-flash E2E |
| 4.3 | Instruction matrix; Esc writes nothing | `domain/gate.ts`, `ui/overlay` dialog | exhaustive unit + Esc-twice E2E |
| 4.3 | Recall semantics | `domain/consent.recall`, `features/consent` (O4 surface) | E2E when built |
| 4.4 | Events, fields, index semantics, hygiene | `domain/telemetry.ts` (zod), brands | unit |
| 4.4 | Anonymous id; `/api/telemetry` 400/204; sink | `client/telemetry.ts`, `app/api/telemetry`, `server/telemetry-sink.ts` | unit + E2E |
| 4.5 | Key registry and continuity; safe storage | `client/keys.ts`, `client/storage.ts` | lint ban + throwing-storage unit |
| 4.5 | Theme preference before paint | `client/bootstrap.ts`, `data-theme` | no-flash E2E |
| 4.5 | Variant-scoped cleanup | `clearRun` effect | unit |
| 4.6 | Attributes; enterable set | `domain/catalog.ts` | unit |
| 4.6 | Canonical index vs scoring ordinal vs Q label | `domain/ids.ts` brands | `tsc` + unit |
| 4.6 | 2–4 options mapped to poles; binary scoring; odd counts; `axisCount` | `domain/content.ts`, `domain/scoring.ts` | unit |
| 4.6 | Qualifiers and type segment | `domain/gate.ts` qualifier steps, `derive()` | unit + E2E |
| 4.6 | Entry paths, commit, staged 7 min, 30 min expiry | `domain/entry.ts`, `step` commit rows | unit |
| 4.6 | 150 ms lock, auto-advance, advance-one, retention, marks, progress, eligibility | `domain/run.ts` `step`/`view`; `InputGate` for the arrival guard | unit + E2E |
| 4.6 | Volatility incl. result commit | `deriving → done` effects | unit + E2E |
| 4.6 | Result payload, cases, error branches | `domain/result.ts` | unit (legacy fixtures) + `@errors` |
| 4.6 | History list-only | `domain/history.ts`, `client/history-store.ts` | unit + E2E |
| 4.6 | Recovery page, 404 never inside `[locale]` | `features/recovery`, `global-not-found.tsx`, ESLint ban | server-HTML E2E |
| 4.6 | Content integrity | build-time compile (G12) | unit gate + `next build` |
| 4.7 | Manifest, metadata, hreflang, icons, robots, sitemap, static OG | `[locale]/layout.tsx generateMetadata`, metadata files | E2E 200s |
| 4.7 | Consent-gated Vercel Analytics | `GatedAnalytics` | E2E |
| 4.8 | 44 px, focus, semantic triggers, Esc, focus trap and return, reduced motion, contrast, gesture alternatives | `ui/` pure views, `<dialog>` primitive, `data-motion`, PAL invariants, `StageProps.act` | axe + E2E + unit |

### 6.9 Traceability: prototype structures → modules

| Prototype structure | Module |
|:---|:---|
| Landing deck, poster cards, list, end card | `features/landing/*` (deck physics), `ui/deck/*`, `ui/landing/*` |
| Living field (WebGL plus CSS fallback) | `features/landing/field-gl.ts`; the fallback is `coverStyle()` |
| Window (expand, grow, shrink) | `@window/(.)test/[variant]`, `features/window/*`, `ui/window/WindowFrame` |
| `vive:*` protocol | `StageProps` (`presentation`, `act`, `onReady`) plus route state |
| Shell: top bar, rail y/x, 이전 (Previous) and 제출 (Submit), `placePrev` | `ui/shell/*`, `StageModule.meta`, `PrevPort` |
| Badge, previous mark, question, glass label, vote line | `ui/answer/*` |
| Centred instruction modal with consent and qualifier | `ui/overlay` dialog + `ui/instruction` + `domain/gate.ts` |
| Stages I, J and D | `stages/{split,forks,story}` |
| `stageFor`, reduced → D, J only with 2 answers | content `stage` + `domain/stage.ts` + compile rule |
| Advance-one revisit | `domain/run.ts` `advanceDue` row |
| J arrival guard | `InputGate` armed on `onSettled` |
| `TEST_COLORS`/`LOOK`/`CURATED`/`genSet`/`legible`/`toneFor` | content `palette` + `domain/palette.ts` + `paletteScope()` |
| Share sheet, coach, 9:16 card | `ui/share/*`, `features/share/*` (dialog, `placement: 'bottom'`) |
| Friend vote page | `app/[locale]/ask/…`, `server/actions/vote.ts`, `domain/share.ts` |
| Hand-off and return records (`vive-handoff`, `vive-landing-return`) | gone: same tree; `launch.ts` in memory; staged entry persisted only for reload |
| `예시` demo tests, simulated votes, prototype chrome | `debug`-attribute fixtures used by E2E only; never listed |

### 6.10 Foundation (first squash commit S), in order

1. Harness:
   - `package.json`: `next@16.3.6`, React 19.3, `next-intl` 4, `zod` 4, TypeScript 5.9 strict; dev dependencies `vitest`, `fast-check`, `@playwright/test`, `@axe-core/playwright`, `eslint`, `stylelint`.
   - One `tsconfig`, `next.config.ts` (`experimental.globalNotFound`; no `viewTransition` flag, per W4), ESLint and stylelint configs, `vitest` (`src/**/*.test.{ts,tsx}`, node), Playwright (fixed project names, preview server, `updateSnapshots: 'none'` in CI), `.gitignore`, `vercel.json` freeze, CI workflow.
2. Contracts: `AGENTS.md`, `.claude/*`, `DECISIONS.md` (A1–A10 plus W6), and the five spec skeletons with rule IDs.
3. The i18n and platform skeleton, real rather than stubbed: `proxy.ts`, `i18n/*`, `messages/*.ts`, the root layout (bootstrap for theme, motion and consent), `global-not-found`, `global-error`, `[locale]/error.tsx`, metadata files, and `api/telemetry`.
4. `ui/index.css`, `tokens.css`, `base.css` with the paper layer and app column.
5. The window skeleton: the slot, the intercept, the page host rendering title plus Q1 in both modes, and the presence-driven open, close and return.
6. Spikes run as tests before S lands:
   - interception from blog, result and history pages (V4);
   - an unknown variant under the intercept;
   - server-HTML 404s for `/nope`, `/kr/nope` and `/kr/kr/x`;
   - `ko-KR → /kr`, `zh-TW/HK/MO → /zt`;
   - native `<dialog>` Esc twice in WebKit and Chromium;
   - the Pretendard CSS under Turbopack.

---

## 7. Residual risks this lens accepts

1. The intercept design depends on V4–V6 staying true across Next minors. The `@window` E2E rows run on every landing, so a change surfaces at the next gate, not in production.
2. Native `<dialog>`: Android Back closes the instruction modal. The controller treats an uncommitted close as "exit to card", never as consent or start.
3. The next-intl best-fit mapping of `zh-HK/MO` to `zh-Hant` is spike-verified, not assumed.
4. Moving controls in J (이전 riding the road, the spatial `제출` gate) remain the highest accessibility-risk surface. Their E2E belongs to the J step.

**Recurring owner actions in this architecture: 0.** The one-time items are the O1–O7 decisions and a one-time allow of `DesignSync` in settings. Until that allow lands, each push shows one permission prompt, which is an approval, not labour.
