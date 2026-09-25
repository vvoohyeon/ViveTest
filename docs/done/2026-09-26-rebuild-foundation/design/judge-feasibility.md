# Judgement — feasibility and risk on the real stack

Judge report, written 2026-09-26. Lens: which of the three target architectures will work the first time on Next.js 16.3.x + React 19.3 + next-intl 4 + Vercel Hobby, and fail least during implementation. Inputs read in full: `design/arch-domain-core.md` (DC), `design/arch-next-native.md` (NN), `design/arch-design-system-first.md` (DSF), plus `understand/critique.md`, `understand/peer-handoff-2026-09-26.md`, `understand/governance.md` §2, `understand/prototype.md` §1–§2 and `understand/contracts.md` §4–§5. Nothing under `/Users/woohyeon/Local/ViveTest` or the mockup scratchpad was modified. The installed framework source at `/Users/woohyeon/Local/ViveTest/node_modules/next` (**16.2.4**) was read only. The target pin is 16.3.6, which is not installed anywhere I could read. Every source-level fact below is therefore "true in 16.2.4 and not contradicted by the 16.2.9 or canary docs"; §7 lists what still needs a re-check on 16.3.6.

---

## 0. Verdict

| Proposal | Score (lens) | One line |
|:---|:---:|:---|
| **DC: domain-core** | **8 / 10** | The only window design whose central choreography, shrinking into the same card with content visible on **every** exit including system Back, survives the verified framework facts. It has one shared trap: root `dynamicParams=false` plus child `generateStaticParams`. It also costs the most code before the first pixel. |
| NN: next-native | 5.5 / 10 | Best trap analysis for intercepting routes, and strong non-window parts (static OG, a no-JS vote form, typed messages). Two verified-wrong load-bearing claims: every `router.back()` close is **unanimated**, and unknown or reserved variant ids **404** instead of reaching recovery. Its BCP 47 internal locales force the proxy to run on every request. |
| DSF: design-system-first | 4 / 10 | The strongest design-system pipeline and overlay primitive of the three, but its window routing is wrong in two load-bearing places. The `(deck)` group does not scope interception, and holding the slot element cannot keep old content on screen. It also keeps a static `test/error` route beside an interceptor. Its own fallback, native `pushState`, is the DC design. |

Decision for the final architecture: **use DC's structure (kernel → engine → ports; the window as a client layer driven by the History API)**. Adopt DSF's design-system layer (native `<dialog>`, a concrete `data-theme`, `data-motion`, specimens, the InputGate, the stage module). Adopt NN's sharing and SEO parts (static OG from enum params, the Server Action vote form, typed messages, `updateSnapshots:'none'`). Apply the five verified fixes in §5 and §6.

---

## 1. What I verified, and where

| # | Fact | Source (read-only) | Bears on |
|:---|:---|:---|:---|
| V1 | The interception rewrite's `Next-Url` regex is the **normalised** intercepting route plus `(?:/.*)?`. Normalising strips route groups `(x)` and `@slot` segments, so `[locale]/(deck)/@window/(.)test/[variant]` intercepts from **any** `/{locale}/**` page. | `next/dist/lib/generate-interception-routes-rewrites.js`; `shared/lib/router/utils/interception-routes.js` (`extractInterceptionRouteInformation` → `normalizeAppPath`); `shared/lib/router/utils/app-paths.js:29-48` ("Groups are ignored", "Parallel segments are ignored") | DSF §8.1 wrong; NN F5 and DC F3 right |
| V2 | Named groups captured from a `has` header override path params (`Object.assign(params, hasParams)`). The client's `Next-Url` is built from the router **tree** (`extractPathFromFlightRouterState`, internal param values), not from `location.pathname`. | `server/lib/router-utils/resolve-routes.js:233-241`; `client/components/router-reducer/create-initial-router-state.js:140`; `compute-changed-path.js:90-111` | NN's next-intl `/kr → /ko` rewrite plus interception is consistent: the header carries `/ko`. No bug here. |
| V3 | A slot prop handed to a layout is an `OuterLayoutRouter` element that reads `LayoutRouterContext`. Keeping a stale reference to that element renders the **current** segment, not the old content. | `server/app-render/create-component-tree.js:433`; `client/components/layout-router.js:441-460` | DSF `use-presence` "render-time snapshot of the slot" cannot work |
| V4 | `router.back()` is `window.history.back()`. Next handles every `popstate` inside `startTransition(dispatchTraverseAction)`, and **React skips View Transition animations for transitions started from `popstate`**. Next's own guide animates "back" with a *push* (`<Link transitionTypes={['nav-back']}>`) and says untyped browser back/forward produce no directional animation. | `client/components/app-router-instance.js:289`; `app-router.js:284-298`; react.dev `reference/react/ViewTransition.md` §"Building View Transition enabled routers"; Next canary `guides/view-transitions.mdx` | NN §5.2/§5.5 wrong: every close path (닫기, Esc, outside tap, wordmark, 거부하고 중단, system Back) is a popstate |
| V5 | `<ViewTransition>` is stable in React 19.3 (blog, 2026-09-09). The reference page's front-matter still says `canary`. | react.dev `blog/2026/09/09/react-19-3.md`; `reference/react/ViewTransition.md` | DSF F11 is stale. It does not change DSF's design, which rejects View Transitions anyway. |
| V6 | Next patches `pushState`/`replaceState`: it copies `__NA` and the tree into the caller's state object and dispatches `ACTION_RESTORE` in a transition, so `usePathname` follows. A `popstate` whose state has `__NA` traverses to the stored tree, and restoring an identical tree reuses the cache. A `popstate` whose state lacks `__NA` makes Next call `location.reload()`. | `client/components/app-router.js:233-305`; `router-reducer/reducers/restore-reducer.js:15-54`; Next 16.2.9 docs `linking-and-navigating.mdx` (native History API section) | DC's window is built on a documented API. The patch is installed in a post-hydration effect, so the card must be a plain `<a href>` until hydrated. |
| V7 | `dynamicParams` is **route-wide across segments**: `const dynamicParams = segments.every(s => s.config?.dynamicParams !== false)` (with a TODO saying it "should be granular per segment"). When every param of a route is generated, the prerender entry gets `fallback: false`, and at runtime a non-generated param throws `NoFallbackError`, which is a 404. The legacy app avoids this only because its `test/[variant]` has **no** `generateStaticParams`; that is why its unknown variants reach 307 → recovery. | `build/static-paths/app.js:588-629`; `build/templates/app-page.js:639-680`; legacy `src/app` grep: `generateStaticParams` only in `[locale]/layout.tsx` and the manifest route | DC §8.4 and NN §4/§5.1 plans produce 404 where the requirement says recovery |
| V8 | During soft navigation a slot keeps its active sub-page. A hard navigation renders `default.js`. Closing a modal slot needs `router.back()` or a slot that matches `null`. | context7 `/vercel/next.js/v16.2.9` `parallel-routes.mdx`, `default.mdx` | All three read this correctly |
| V9 | With `next/root-params`, `setRequestLocale` is a legacy API. `generateStaticParams` is still needed for static rendering. | context7 `/amannn/next-intl` `routing/setup.mdx`, blog `nextjs-root-params.mdx` | DSF F8 is outdated (it still works) |
| V10 | Skipping prefetches in the proxy via `missing: [{type:'header',key:'next-router-prefetch'},{type:'header',key:'purpose',value:'prefetch'}]` is the documented matcher pattern. | context7 `/vercel/next.js/v16.2.9` `proxy.mdx`, `content-security-policy.mdx` | NN cannot use it: its `/kr → /ko` rewrite has to run on prefetches too |
| V11 | Vercel Hobby is non-commercial, with hard monthly caps: 1 M function invocations, 1 M edge requests, 4 active-CPU hours, 360 GB-h memory, 50 k Web Analytics events, 10 k Speed Insights events. | context7 `/llmstxt/vercel_llms_txt` (vercel.com/docs/plans/hobby, /docs/limits) | Proxy invocations, dynamic result pages, and font-slice request count all draw on these caps |

---

## 2. The load-bearing questions, answered per proposal

| Question | DC | NN | DSF |
|:---|:---|:---|:---|
| **Parallel + intercepting route under `[locale]`, with next-intl** | Not used. It rejects interception for verified reasons (V1, V3, V4); every one of those reasons checks out. | Works mechanically. Placing `@window` at `[locale]` accepts descendant interception on purpose, and a launch mark picks window or full mode (V1, V2 hold). | Wrong. The `(deck)` group does not scope interception (V1). From blog, history or result, the `[locale]` children switch to `(deck)`, whose `children` falls to the built-in `default` (not-found) or to an undeclared `default.tsx`. |
| **Deep link vs soft nav** | A hard load of `/test/{v}` renders the page host. Soft "navigation" is `pushState`/`replaceState` over the same tree (V6). | Hard load → full page; soft → slot (V8). | Same as NN in intent, broken for non-deck origins. |
| **Static sibling under `test/`** | Not affected: no interception. | Designed out. `error` becomes a reserved id rendered in place. But see V7: that id now 404s. | Not addressed. `test/error` sits beside `(.)test/[variant]`, so soft navigations (including the client-side follow of a server `redirect()`) to `/test/error` are rewritten into the slot with `variant='error'` (beforeFiles precedence, NN F6). |
| **System back closes the window** | Yes. Open = push, Q1 = replace. Back pops and the machine shrinks the still-mounted stage, so content stays visible because Next's tree never changes. | Yes, but instantly, as does every UI close routed through `router.back()` (V4). | Yes, but the shrink cannot show content (V3), and the claim of "one path for every exit, animated" fails. |
| **Unknown or hidden variant** | Plan: static for enterable ids, redirect for the rest. With root `dynamicParams=false` the redirect never runs; unknown ids 404 via `global-not-found` (V7). Same for `blog/[slug]`. DC flagged the question as unverified. | Plan: `dynamicParams` "default true" renders recovery in place. False (V7). `/kr/test/error` 404s too. | Not specified. |
| **`proxy.ts`** | One pure `routeRequest` decides everything. Product codes are the `[locale]` segment, so valid-prefix requests are a pass and prefetches can skip the proxy (V10). | next-intl middleware plus a rewrite from product prefix to BCP 47 on **every** page and RSC request, prefetches included. Correct (V2), but it doubles proxy traffic under Hobby caps (V11) and adds two locale vocabularies. | Hand-rolled, in the same spirit as DC. |
| **SSR determinism with WebGL/canvas** | Explicit: SSR renders the shell and stage ground in `booting`. The session boots from storage after mount, and `getServerSnapshot` equals the first client render. | Preference stores are right (`useSyncExternalStore` over `html[data-*]`). The run state's initial read from storage in `useReducer` is unspecified, which is a hydration-mismatch risk. | Unspecified. `motion.atAttemptStart` read in render needs the same external-store treatment. |
| **Side-effect idempotence (StrictMode, batching)** | Memoised `session()`, idempotent `boot()`, effects-as-data run by the engine, `attemptStarted` persisted. Provable in node. | `useReducer` returns `events[]` drained by one effect. Under StrictMode that means double drains in dev, and batched dispatches either drop events or need a second dispatch to clear them. | `reduceRun` returns only state, and where storage and telemetry writes happen is unstated. |
| **Low-end phones** | Lazy field (CSS fallback), stage chunks per stage, and a content JSON preload at settle. The budget is left to the spec. | Lazy field via `requestIdleCallback`. Safari has not historically shipped it, so it needs a `setTimeout` fallback on the primary target (not re-verified). | Best: `failIfMajorPerformanceCaveat` plus a frame-time probe decides the fallback, and grain is a static asset. |
| **Vercel Hobby** | Static landing, test and content JSON; dynamic result and ask pages; the proxy can skip prefetches. | The proxy runs on all requests; the intercept page might render per request (their spike S1). The static OG set is good. | Similar to DC. |
| **Testing in CI without host-bound baselines** | Node-only vitest, Playwright `mobile-webkit` first, pixels only in the CI container. | Same, plus `updateSnapshots:'none'` (verified by them). | Best surface: deterministic `renderToStaticMarkup` specimens as the pixel set. |
| **Who creates the CI-only baselines** | Not stated. | Not stated. | Not stated. The gap is shared (§5 G9). |

---

## 3. Per-proposal assessment

### 3.1 DC — domain-core — 8 / 10

Decisive strengths:

- **The window design matches the verified framework behaviour.** The stage lives in the landing's own React tree, so `popstate` from system Back, a wordmark click or 거부하고 중단 does not unmount it. The window machine plays the shrink with content visible, which the owner approved in round 3 (「네 잘 고쳐졌습니다」, prototype.md §1.2) and which is an owner principle (content visible during transitions). Forward re-grows from storage.
- **Every rejected alternative in D3 is backed by facts that check out.** Those are V1 (descendant interception), V3 and V4 (slot unmounts before a shrink can play), and the need for `default.tsx` and shared rendering modes.
- **StrictMode and concurrency safety by construction.** `step → {state, effects}`, an engine-owned session memoised per `(variant, host)`, and `attemptStarted` in the record make "exactly one `attempt_start`" a node unit test, not a browser observation.
- **Trust boundaries are few and typed.** Result codec with `data-result-branch`, `KeyValue.set → boolean` for WebKit "Block all cookies", branded `QuestionIndex` vs `ScoringOrdinal`, and `structureHash` so a content deploy expires an in-flight run instead of adding a mid-flow error screen.
- **Product codes stay the `[locale]` segment.** One `displayTag` table serves `lang` and `Intl`, and the proxy is a pass for valid prefixes, which keeps it cheap under Hobby caps.

Decisive weaknesses:

- **V7 trap.** `test/[variant]` "static for enterable, redirect for others" and `blog/[slug]` "invalid → redirect to index" both become 404 under root `dynamicParams=false`. DC marked this unverified, but its build order (step 4 exit criteria) depends on it.
- **URL and tree diverge while windowed.** After `replaceState('/…/test/{v}')`, `usePathname()` reports the test path over the landing tree. Anything that refetches the current URL would swap the landing for the page host mid-test: `router.refresh()`, a Server Action invoked in the window, and dev HMR. This is survivable only by rule: no refresh or Server Action inside the window, and telemetry `route` taken from window state.
- **`light-dark()` browser floor.** The friend vote page opens in iOS in-app WebViews, which run the OS WebKit. DSF's concrete `data-theme` has no support floor at all.
- **Most upfront code of the three.** Kernel, engine, ports, effect union and the DOM-less `tsc -b` projects all come before the first stage pixel. `tsc -b` for kernel and engine alongside `next typegen` is a second type-check pass. ESLint `no-restricted-globals` gives most of the same isolation more cheaply.
- **A second content transport.** `/api/content/{locale}/{variant}` has to stay identical to the page host's loader. That holds only because DC routes both through one loader, and it should stay that way.
- **iOS edge-swipe Back.** Safari already animates a swipe-back. DC would then play its own shrink as well, so a double animation needs `PopStateEvent.hasUAVisualTransition` (not in any proposal).

### 3.2 NN — next-native — 5.5 / 10

Decisive strengths:

- **The most careful reading of intercepting-route mechanics.** It covers descendant interception (F5), beforeFiles precedence over static siblings (F6), stale slots on soft navigation (F3), and why the catch-all `null` slot is rejected. The launch mark ("window only when opened from a deck card") is a clean answer to descendant interception.
- **Sharing and SEO that work on the real stack.** OG images are static from `(locale, variant, question)` and inherited by share-id children (F19), so no request value ever reaches `ImageResponse`. Votes use `<form action={castVote}>`, which works before hydration in KakaoTalk and Instagram WebViews. Tallies come from a Route Handler with `after()`, and the share id is generated client-side so the clipboard write stays inside the user activation.
- **Harness hygiene.** Typed messages (`satisfies Messages`) replace a parity test. It uses `server-only`/`client-only` markers, an E2E link crawl instead of a route-citation guard, `updateSnapshots:'none'` in CI, TypeScript pinned to 5.9 (not the npm `latest` 7.x), and a `vercel.json` freeze with a deletion plan.
- **Honest spikes.** S1–S6 are all phrased as tests with pass conditions.

Decisive weaknesses:

- **V4.** Its motion plan (§5.2 table, §5.5, §8) gives a "share" morph to 닫기, Esc, outside tap, wordmark-when-launched and 거부하고 중단, all of which call `router.back()` and therefore run through `popstate`. React skips those animations, so every close is instant. That drops the owner-validated shrink. Fixing it needs animate-then-`back()` choreography (DSF's host machine), and that choreography still cannot cover system Back, because the slot content is gone on pop.
- **V7.** `generateStaticParams` on `test/[variant]` and on the intercept page, with root `dynamicParams=false`, makes unknown ids, and the reserved `error` id meant to serve the legacy `/test/error` URL, 404.
- **BCP 47 internal locales with prefix rewrites.** Every page and RSC request has to pass through the proxy (it cannot skip prefetches, V10), and there are two locale vocabularies with a mapping. The legacy `NEXT_LOCALE=kr` cookie also stops matching. It is correct (V2) but more moving parts under Hobby caps (V11).
- **`useReducer` returning `DomainEvent[]` drained by an effect** (§7.5): double effects in dev, and batched dispatches overwrite or lose events unless a clear-dispatch is added.
- **`?ask=1` share sheet via `pushState`.** This brings back a history-owning overlay, the exact L53/L59 trap family. System Back closing the sheet is not a requirement.
- **Smaller risk-adders.** `reactCompiler: true` on a codebase full of imperative canvas code, and `requestIdleCallback` for the field on WebKit.

### 3.3 DSF — design-system-first — 4 / 10

Decisive strengths:

- **An overlay primitive that removes three trap families at once.** A native `<dialog>` with `showModal()` sits in the top layer (not clipped by the window's `clip-path`), inherits the `--t-*` palette through the DOM (no portal, L40), and gets native inertness. It owns no history entry (L43/L53/L59), and Esc is swallowed at `keydown` with an E2E for "Esc twice stays open".
- **Theme and motion attributes.** A concrete `data-theme` written by the bootstrap needs one dark attribute block and has **no browser floor**, which matters for iOS in-app WebViews. `data-motion` is the single reduced-motion source; CSS never reads the media query (L19).
- **Specimens.** `renderToStaticMarkup` specimens of pure `ui/` components are both the Claude Design bundle (byte-copied CSS with SHA check) and the only pixel surface: deterministic, no motion, no data, CI container only.
- **One InputGate for all stages.** The controller enforces the 150 ms lock and the arrival guard, armed from each stage's own `onSettled`, so stages cannot forget it.
- **A stage contract that stays fast and resumable.** `StageModule` has pure `railColor` and `chromeTone`, and `PrevPort` moves J's 이전 per frame outside React. That keeps 60 fps and makes a resumed run redraw from data alone.
- **Mechanical style rules.** Stylelint enforces the class pattern, bans hex outside `tokens.css` and bans `!important`; an ESLint hex-literal rule covers TypeScript. The PAL-1…7 contrast invariants are a table of testable rules.
- **Self-aware spike S-1** with a named fallback, native `pushState` behind the same `WindowHost` interface. That fallback is DC's design.

Decisive weaknesses:

- **V1.** `(deck)/@window/(.)test/[variant]` intercepts from blog, history, result and recovery as well. `(deck)` then renders with no `children` page, so the window opens over not-found or blank.
- **V3.** The shrink-on-pop via `use-presence` cannot keep the stage on screen. The stage content unmounts the moment the route pops.
- **`test/error` beside the interceptor.** It is a static sibling of `(.)test/[variant]`, and the soft-navigation path to it gets intercepted, including a server `redirect()` followed on the client.
- **Side effects of the run are unspecified.** `reduceRun(run, e): RunState` returns state only, and the proposal does not say where storage writes and telemetry happen or how they stay idempotent under StrictMode.
- **Stale framework facts.** F11 (View Transitions Canary-only, V5) and F8 (`setRequestLocale` everywhere, V9).

---

## 4. Claims found wrong (with evidence)

| # | Proposal and place | Claim | Why it is wrong |
|:---|:---|:---|:---|
| W1 | NN §5.2 table, §5.5, §8 | Closes via `router.back()` (닫기, Esc, outside tap, wordmark launched from a card, 거부하고 중단) animate as a `<ViewTransition>` share morph; only browser Back is uncertain. | `router.back()` = `window.history.back()` (V4). Next dispatches the traverse from `popstate`, and React skips View Transition animations started from `popstate`. **All** those closes are instant. |
| W2 | NN §4 rendering table, §5.1, §5.3 | Unknown `v` renders the recovery view on demand (`dynamicParams` default `true`), and the reserved id `error` serves the legacy `/test/error` URL. | Root `[locale]/layout.tsx` exports `dynamicParams=false`, and Next ANDs it across all segments (V7). With `generateStaticParams` on the variant segment the route becomes `fallback:false`, so unknown ids and `error` 404 via `global-not-found`. |
| W3 | DC §8.4 and §15 (plus §8.2 for blog) | `test/[variant]` static for enterable ids with a redirect for others, and invalid blog slugs redirect to the index. DC's "the legacy recovery route suggests [a page-level `dynamicParams=true` overrides the layout]". | Same mechanism (V7): no page-level override exists. The legacy works only because its variant segment has no `generateStaticParams`. |
| W4 | DSF §8.1 | "Because the slot is declared in the `(deck)` layout only, a navigation to a test from any other surface … renders the full page." | `normalizeAppPath` drops `(deck)` and `@window`, so the intercepting route is `/[locale]` and the header regex matches every descendant (V1). |
| W5 | DSF §8.2 | `use-presence` keeps the last slot content rendered until `animation-done`, so every exit is one animated path. | The slot prop is an `OuterLayoutRouter` that reads the current tree from context (V3). Holding the element keeps nothing, and the stage unmounts on pop. |
| W6 | DSF §17 F11, §8.3 row 3 | `<ViewTransition>` is "available only in React's Canary and Experimental channels". | React 19.3 (2026-09-09) made it stable (V5). The reference page's front-matter lags. Harmless to DSF's design. |
| W7 | DSF §17 F8 | `setRequestLocale` must be called in every layout and page meant for static rendering. | Legacy API, superseded by `next/root-params` in Next ≥ 16.3 (V9). |
| W8 | NN §5.3 ("the redirect-inside-intercept loop [is removed] entirely") read together with §5.1 | Rendering recovery in place avoids 404s under the intercept. | Only if the unknown id reaches the page, which W2 rules out: the intercept page is 404 too. |

---

## 5. Grafts the final architecture must adopt

Ordered by how much they reduce implementation failure. Source in brackets.

- **G1 [DC] The window is a client layer over the mounted landing, driven by the History API.** Opening a card does `pushState({vt:'win',v}, '', '/{l}#{v}')`. Answering Q1 does `replaceState(…, '/{l}/test/{v}')` while the window grows. **Every** UI exit calls `history.back()`, and the `popstate` listener is the single place that plays close or shrink, because the stage is still mounted. A hard load of `/test/{v}` is the page host. No `@window`, no `(.)`, no `default.tsx`.
- **G2 [verified fix, V7] Root `dynamicParams=false` stays, and unknown ids never reach a fully-generated segment.** The proxy's pure `routeRequest` receives the build-time enterable-variant and blog-slug sets. It redirects `/{l}/test/{unknown}` to `/{l}/test/error?variant=…` and `/{l}/blog/{unknown}` to `/{l}/blog`. The simpler fallback is to put no `generateStaticParams` on child segments (on-demand render, one invocation per hard load). An E2E fetches `/en/test/nope` without JS and asserts the recovery HTML.
- **G3 [DC] Kernel `step(state, event, ctx) → {state, effects}`, executed by a framework-free engine through ports.** The session is memoised per `(variant, host)`, `boot()` is idempotent, and `attemptStarted` is persisted. React only reads snapshots through `useSyncExternalStore` whose server snapshot is `booting`. This replaces NN's events-in-`useReducer` and DSF's unspecified effects.
- **G4 [DSF] One overlay primitive on native `<dialog>` with `showModal()`.** It lives in the top layer, inherits palette variables through the DOM, owns no history entry, swallows Esc at `keydown` on the instruction step, and ships an E2E for "Esc twice leaves it open" in WebKit and Chromium. The share sheet uses the same primitive with bottom placement and **no** `?ask` history entry (reject NN AD-10).
- **G5 [DSF] The bootstrap writes a concrete `data-theme` and `data-motion` before paint.** One dark attribute block, no `light-dark()`, CSS keyed only on the attributes. Reject DC's and NN's `light-dark()`, whose Safari 17.5 floor reaches the friend vote page in in-app WebViews.
- **G6 [DC] Product codes are the `[locale]` segment.** `displayTag()` feeds `<html lang>` and every `Intl` call. The proxy matcher skips prefetches with the documented `missing` headers (V10). Reject NN's BCP 47 internal locales and prefix rewrite (proxy on every request under Hobby caps, two vocabularies, legacy cookie mismatch).
- **G7 [DSF] One InputGate in the controller**, holding the 150 ms lock and the arrival guard armed from each stage's `onSettled`. Combine it with the kernel's lock as DC has it. Keep DC's split: the lock is a domain rule, arrival is presentation.
- **G8 [DSF] `StageModule` with `meta`, pure `railColor`/`chromeTone`, a `forwardRef` handle, and `PrevPort` for J's per-frame 이전.** Loaded as one chunk per stage and preloaded on deck settle.
- **G9 [DSF + NN + new] Pixel baselines only on deterministic specimens, only in the Playwright Linux container, with `updateSnapshots:'none'` in the CI check job.** Add an agent-dispatchable `workflow_dispatch` job that regenerates baselines in the same container and commits them to the feature branch. None of the three says how CI-only baselines come into existence, and without that job the visual gate has no baselines or needs Docker locally.
- **G10 [NN] Static OG images from enum params only**, `ask/[variant]/[q]/opengraph-image.tsx` inherited by `[box]`, so no request value reaches `ImageResponse`. **The friend vote is `<form action={castVote}>`** (works pre-hydration in in-app browsers). Tallies come from a Route Handler (`no-store`) and telemetry sink writes use `after()`.
- **G11 [NN] Typed message catalogues (`satisfies Messages`) instead of a key-parity test.** Also: `server-only`/`client-only` markers, an E2E internal-link crawl instead of a route-citation guard, TypeScript pinned to 5.9.x, a `vercel.json` production freeze with its removal in the launch commit, and `reactCompiler` **off** at foundation.
- **G12 [DC] A byte-compatible result codec with ordered validation and `data-result-branch`.** Keep the three legacy storage keys, version the rest, and add `structureHash` expiry. Compile content at build, so a `forks` stage on a question with more than two options fails the build.
- **G13 [new] Honour `PopStateEvent.hasUAVisualTransition`.** When the browser already animated an edge-swipe Back (iOS Safari), jump to the end state instead of playing the shrink.
- **G14 [DC rule, made explicit] While windowed, the URL is the test path over the landing tree.** So no `router.refresh()`, no Server Action and no `revalidatePath` from inside the window (ESLint ban scoped to `src/ui/window/**` and `src/ui/experience/**`), and the telemetry `route` comes from window state, not `usePathname()`.
- **G15 [DSF] Performance fallback decided by capability, not device lists.** `failIfMajorPerformanceCaveat` plus a frame-time probe switches to the CSS field. Grain is a committed static asset. Budget **edge requests per first view** (Hobby's cap is 1 M a month) and assert it in E2E, which matters for dynamic-subset font slicing.

---

## 6. The feasible composite, concretely

### 6.1 Route tree

```text
src/app/
├─ [locale]/
│  ├─ layout.tsx                         ROOT: <html lang={displayTag(l)} data-theme data-motion data-consent>; generateStaticParams = LOCALES; dynamicParams = false
│  ├─ page.tsx                           landing (static) — mounts <WindowHost> (client layer, G1)
│  ├─ test/[variant]/page.tsx            page host; generateStaticParams = enterable ids (proxy guarantees nothing else arrives, G2)
│  ├─ test/error/page.tsx                recovery (static; cards from client completion data)
│  ├─ result/[variant]/[type]/page.tsx   dynamic (searchParams); no generateStaticParams
│  ├─ ask/[variant]/[q]/opengraph-image.tsx      static from enums (G10)
│  ├─ ask/[variant]/[q]/[box]/page.tsx           dynamic; <form action={castVote}>
│  ├─ blog/page.tsx · blog/[slug]/page.tsx · history/page.tsx · manifest.webmanifest/route.ts · opengraph-image.tsx · error.tsx
├─ api/telemetry/route.ts · api/content/[locale]/[variant]/route.ts (force-static) · api/asks/[box]/route.ts
├─ global-not-found.tsx · global-error.tsx · manifest.ts · robots.ts · sitemap.ts · icon.svg · apple-icon.tsx
src/proxy.ts                             routeRequest() only
```

There is no parallel slot and no interception marker anywhere, so traps V1 and V3, the beforeFiles rewrite precedence, `default.tsx` and slot rendering-mode parity have no subject.

### 6.2 Proxy decision (DC `routeRequest`, extended by G2 and G6)

```ts
// src/kernel/locale/route-request.ts — pure; the proxy is an adapter around it
export interface KnownIds { readonly variants: ReadonlySet<string>; readonly blog: ReadonlySet<string> } // build-time constant from compiled content
export type RouteDecision =
  | { readonly kind: 'pass'; readonly setLocaleCookie?: Locale }
  | { readonly kind: 'redirect'; readonly location: string; readonly status: 307 | 308 };
export function routeRequest(r: {
  pathname: string; search: string; cookie?: string; acceptLanguage?: string; known: KnownIds;
}): RouteDecision;
// adds to DC §4.5: /{l}/test/{id ∉ known.variants ∪ {'error'}} → /{l}/test/error?variant={id}; /{l}/blog/{slug ∉ known.blog} → /{l}/blog

// src/proxy.ts
export const config = {
  matcher: [{
    source: '/((?!api|_next/static|_next/image|_vercel|.*\\..*).*)',
    missing: [{ type: 'header', key: 'next-router-prefetch' }, { type: 'header', key: 'purpose', value: 'prefetch' }],
  }, '/:locale/manifest.webmanifest'],
};
```

Every in-app link is built from compiled content, so a prefetch that skips the proxy can only target a known id.

### 6.3 Window history protocol (G1, G13, G14)

```ts
// src/platform/browser/window-history.ts — the only module that calls history.* (ESLint-enforced)
export interface WindowMarker { readonly vt: 'win'; readonly v: VariantId; readonly phase: 'open' | 'full' }
export interface WindowHistory {
  open(l: Locale, v: VariantId): void;   // pushState({vt:'win', v, phase:'open'}, '', `/${l}#${v}`)
  grow(l: Locale, v: VariantId): void;   // replaceState({vt:'win', v, phase:'full'}, '', `/${l}/test/${v}`)
  exit(): void;                          // history.back(); never animates itself
  onPop(fn: (e: { marker: WindowMarker | null; uaAnimated: boolean }) => void): () => void; // uaAnimated = event.hasUAVisualTransition === true
}
// ui/window/window-machine.ts (DC §7.4) consumes onPop:
//   marker === null  → 'closing' (from open) | 'shrinking' (from full); skip to end state when uaAnimated
//   marker.phase === 'full' (forward) → 'growing' to the run's current question (engine/storage)
```

Next copies `__NA` and its tree into the marker object (V6), and Next's own `popstate` restores an identical tree, so no RSC request is made. The card stays a plain `<a href="/{l}/test/{v}">` until hydration, so a tap before the patch is installed is an ordinary navigation to the page host, never an un-patched `pushState` that would later force `location.reload()`.

### 6.4 Overlay and stage contracts (G4, G7, G8)

```ts
// src/ui/overlay/dialog.tsx — always mounted; `open` drives showModal()/close()
export interface DialogProps {
  open: boolean; placement: 'center' | 'bottom'; labelledBy: string;
  escape: 'swallow' | 'dismiss';                 // instruction step: 'swallow' (keydown preventDefault + cancel prevented)
  onDismiss(reason: 'escape' | 'backdrop' | 'closeRequest'): void; // closeRequest = Android back → controller treats as exit-to-card
  children: React.ReactNode;
}
// src/stages/contract.ts — DSF §7.1, with the run facts supplied by the kernel's RunView (DC §4.7.6)
export interface StageProps { view: RunView; text: VariantText; look: TestLook; presentation: Presentation; motion: 'full' | 'reduced';
  prev: PrevPort; onIntent(i: StageIntent): void; onReady(): void; onSettled(ordinal: ScoringOrdinal): void }
```

---

## 7. Remediation scorecard

| # | Fix | Applies to | Effort | Effect | Defect severity if skipped | Priority |
|:---|:---|:---|:---:|:---:|:---|:---:|
| 1 | G2: unknown ids redirected in the proxy (or no child `generateStaticParams`), plus a no-JS E2E for `/en/test/nope` → recovery | DC, NN | S | High | **High**: recovery requirement silently becomes a 404 for typos, old links and `error` | P1 |
| 2 | G1: the window as a client layer; exits via `history.back()` with the machine reacting to `popstate` | NN, DSF | M (NN) / L (DSF) | High | **High**: the owner-validated shrink-with-content-visible is lost on every close (NN) or on every pop (DSF) | P1 |
| 3 | G3: the engine executes kernel effects; no events in React state | NN, DSF | M | High | **High in dev** (double `attempt_start`, double writes), Med in prod (lost events on batching) | P1 |
| 4 | Remove interception scoping assumptions and the static `test/error` sibling | DSF | M | High | **High**: test links from blog, history or result open over not-found or blank | P1 (moot with #2) |
| 5 | G5: concrete `data-theme`, no `light-dark()` | DC, NN | S | Med | Med: paper surfaces lose colours in iOS < 17.5 WebViews | P2 |
| 6 | G6: product-code segment and prefetch-skipping matcher | NN | M | Med | Med: roughly twice the proxy invocations against the Hobby 1 M cap, plus a second locale vocabulary | P2 |
| 7 | G9: baseline regeneration workflow | all | S | Med | Med: the visual gate has no baselines, or baselines are host-bound | P2 |
| 8 | G14: no refresh or Server Action in the window; `route` from window state | DC | S | Med | Med: mid-test tree swap to the page host | P2 |
| 9 | G15: edge-request budget per first view (font slices) | all | S | Med | Med: Hobby cap exhaustion at modest traffic | P2 |
| 10 | G13: `hasUAVisualTransition` | all | XS | Med | Low–Med: double animation on iOS swipe-Back | P3 |
| 11 | `requestIdleCallback` → `setTimeout` fallback | NN | XS | Low | Low: WebGL field never starts on WebKit if unsupported | P3 |

Recommended order: #1 and #3 land with the foundation, because the kernel, engine and proxy are foundation pieces. #2 is the window step. #5, #6, #7 and #9 are foundation configuration. #8, #10 and #11 ride their feature steps.

---

## 8. Residual risks and spikes that remain (each as a test with a pass condition)

| # | Spike | Pass condition |
|:---|:---|:---|
| R1 | Re-run V4, V6 and V7 on the pinned **16.3.6** (installed source here was 16.2.4) | `node_modules/next` greps give the same lines. Playwright on `mobile-webkit`: card → Q1 → grow → Back → forward → Back with landing DOM node identity preserved and zero document or RSC requests. `/en/test/nope` → recovery HTML without JS. |
| R2 | `global-not-found` under the `[locale]` root with `dynamicParams=false` | `curl` of `/zz`, `/zz/test/qmbti`, `/en/no-such` → 404 with a non-empty body carrying the stylesheet link (legacy measured this on 16.2.4 preview, 2026-09-17) |
| R3 | Native `<dialog>` Esc and close-request behaviour | Esc twice on the instruction step leaves it open in WebKit and Chromium. Android back (Chromium mobile emulation of a close request) maps to exit-to-card. |
| R4 | iOS edge-swipe Back vs D's left edge and J's swipes | Real-device check. With G13 no double animation; every gesture keeps its button path. |
| R5 | Hobby budgets | Per first landing view: edge requests counted in E2E; proxy invocations = 1 per document (prefetches skipped); result and ask pages are the only per-request renders |
| R6 | WebGL field and canvas J on a throttled mobile profile | Frame-time probe and `failIfMajorPerformanceCaveat` switch to the CSS field; no long task over the budget set in the platform spec |

Not verified here: whether Safari ships `requestIdleCallback` today; whether static assets count toward Vercel Edge Requests (stated from general knowledge, so measure it per R5); whether 16.3.x moved the App Router to the Navigation API. That last one would let View Transitions animate Back (source comment "TODO: Warn when Navigation API is available"); if it did, NN's motion plan becomes viable again, but G1 remains the lower-risk choice because it does not depend on it.
