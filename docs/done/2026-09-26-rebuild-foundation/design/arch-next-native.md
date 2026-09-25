# ViveTest rebuild — target architecture, Next-native angle

Proposal, written 2026-09-26 on the Mac mini. Inputs were only the prototype (`prototype.md`, `peer-handoff-2026-09-26.md`, the mockup sources under `MOCK/`) and the legacy requirements as classified in `contracts.md` §4, with `design-system.md`, `mess-diagnosis.md` §6, `governance.md` §2 and `critique.md` as design knowledge. No legacy code, guard, ledger entry or defensive pattern is ported. Where a stack trap from `governance.md` §2 applies, this document picks a structure in which the trap cannot happen and says so; it never ports the guard that used to catch it.

`MOCK/` = `/private/tmp/claude-501/-Users-woohyeon-Local-ViveTest/7b610dca-70f4-41bf-b48e-fe44caf07c81/scratchpad/mockups/`. "Verified" below means checked in this session against current documentation (context7), the npm registry, or framework source read from `node_modules` (read-only); §2 lists every such fact with its source.

---

## 0. Summary

The app is a statically generated Next.js 16.3 App Router site with one dynamic seam per real runtime need. The route tree itself carries the prototype's central idea: the landing stays mounted while the test runs **as a parallel `@window` slot filled by an intercepting route**, so "the expanded card is a window onto the test stage" is a routing fact, not an iframe or a hand-rolled overlay manager. Everything the legacy requirements say about locales, consent, telemetry, the test domain and the result URL lives in a pure `src/domain` layer with no React, Next or browser imports; UI features receive locale-projected, server-built views as props; the only client-side infrastructure is one storage module, three preference stores built on `useSyncExternalStore`, a telemetry queue and a tiny launch handshake.

The ten decisions that shape everything else:

| # | Decision | In one line |
|:--|:--|:--|
| AD-1 | Window = `app/[locale]/@window/(.)test/[variant]` intercepting route + `default.tsx` | The platform's own modal pattern gives system back, deep link and prefetch for free; its three traps are designed out (§5) |
| AD-2 | `app/[locale]/layout.tsx` is the root layout | `<html lang>` comes from the route param, every page stays static; no request header, no `headers()` |
| AD-3 | next-intl with BCP 47 locales and custom URL prefixes (`ko` → `/kr`, `zh-Hans` → `/zs`, `zh-Hant` → `/zt`) | One table yields the canonical product code, the display tag and correct `Intl` formatting |
| AD-4 | `src/proxy.ts` = entry aliases + locale-less allowlist, then next-intl | The single request entry does routing only; no business state |
| AD-5 | Pure domain layer; run logic is a reducer that returns events | Every legacy domain rule is a unit-testable function; side effects live in one hook |
| AD-6 | Content is repo-owned typed TS, validated at build, projected per locale on the server | Invalid content cannot ship, so runtime "lazy validation" and "partial activation" disappear |
| AD-7 | Plain CSS with native `@layer`, one `tokens.css`, `light-dark()`, global `.vt-*` skins; no Tailwind | The same files render in the app and in Claude Design; the Tailwind layer/scan/emit-order trap family is gone |
| AD-8 | Client preferences (consent, theme, motion) = one pre-paint bootstrap writing `html[data-*]` + `useSyncExternalStore` stores reading them | No hydration flips, one reduced-motion source, no provider tree |
| AD-9 | Votes = Server Action behind a `<form>`; tallies and telemetry = Route Handlers with `after()`; all OG images static from enum params | Works in in-app browsers without JS; no attacker input ever reaches `ImageResponse` |
| AD-10 | Overlays (instruction modal, share sheet) = one `Overlay` primitive using `inert` on the background; share-sheet open state is a URL search param set by native `history.pushState` | System back closes the sheet without custom popstate bookkeeping |

---

## 1. Inputs, scope and non-goals

- **Design and interaction** come from the prototype's final revision: landing deck + window, shell, stages I/J/D, centred instruction modal with consent notice, share sheet + friend vote page, palettes as data (`prototype.md` §1–§4, `peer-handoff`).
- **Behavioural requirements** come from `contracts.md` §4.1–§4.8 (class A) plus the owner-decided change "after re-answering a revisited question, advance exactly one question" (`contracts.md` §2.3).
- **Out of scope for this architecture** (they get seams, not designs): result-page content and post-submit transition (owner deferred, O4), desktop layout (O1), the share/vote store vendor (O2), content source beyond the repo (O3), legal copy (O6).
- **Fixed facts honoured**: Next.js ≥ 16.3.6 (GHSA-vcvr-r3jv-pc5j), React 19, TypeScript strict, Vercel Git integration on Hobby, public GitHub repo, 430 px phone column centred on wide screens for v1.

---

## 2. Framework facts verified in this session

| # | Fact | Source | Architectural consequence |
|:--|:--|:--|:--|
| F1 | npm `latest`: `next` 16.3.6, `react` 19.3.0, `next-intl` 4.14.7, `tailwindcss` 4.3.3, `typescript` 7.0.2, `@playwright/test` 1.63.0, `zod` 4.6.5, `pretendard` 1.3.9 (OFL-1.1) | `npm view <pkg> dist-tags / version` | Pin `next` 16.3.6 exactly; React 19.3 |
| F2 | Intercepting-route markers are relative to **route segments**, not the file system, and ignore `@slot` folders | Next 16.2.9 docs, `intercepting-routes.mdx` | `app/[locale]/@window/(.)test/[variant]` intercepts `/{locale}/test/{variant}` |
| F3 | Soft navigation keeps the active sub-page of every slot the navigation did not touch, even when it no longer matches the URL; hard navigation renders `default.js` or 404 | Next 16.2.9 docs, `parallel-routes.mdx`, `default.mdx` | The landing (children) stays mounted under the window; the window's own visibility must be derived from the URL (§5.4) |
| F4 | Next 16 expects a `default.js` for parallel slots | Next 16.2.9 upgrade guide | `@window/default.tsx` returns `null` |
| F5 | The interception rewrite matches the `Next-Url` header against the intercepting route **and all its descendants** (`(?:/.*)?`) | `node_modules/next/dist/lib/generate-interception-routes-rewrites.js` (next 16.2.4, read-only); same code on `canary` via context7 | A `(.)` intercept under `[locale]` also fires from `/blog`, `/result/…`, `/history` (§5.3) |
| F6 | Interception rewrites are pushed into `rewrites.beforeFiles` | `node_modules/next/dist/build/index.js:717` (next 16.2.4) | They win over static siblings such as `test/error/page.tsx`; no static route may live under `test/` (§5.3) |
| F7 | `proxy.ts` replaces `middleware.ts`; its runtime is `nodejs` and cannot be configured | Next 16.2.9 upgrade guide | One entry file, Node runtime |
| F8 | next-intl `localePrefix.prefixes` rewrites a custom prefix to the internal locale; negotiation uses `@formatjs/intl-localematcher` "best fit" | next-intl docs (`routing/configuration.mdx`, `routing/middleware.mdx`) | BCP 47 locales internally, product codes in URLs |
| F9 | next-intl's middleware only recognises configured prefixes; an internal code in the URL (`/ko/…`) is treated as unprefixed and redirected under the detected locale | `node_modules/next-intl/dist/esm/development/middleware/{middleware,utils}.js` (`getPathnameMatch`, next-intl 4.9.1) | Entry aliases (`/ko`, `/zh-Hans`, `/en-US`, `/jp`, `/zh-TW`) are resolved in the proxy before next-intl |
| F10 | `next/root-params` is available by default in Next ≥ 16.3, so `i18n/request.ts` reads the locale without `setRequestLocale` in every page | next-intl docs (`routing/setup.mdx`, blog `nextjs-root-params`) | No per-page locale boilerplate |
| F11 | `global-not-found.js` is still behind `experimental.globalNotFound` and must render its own `<html>` and import its own CSS | Next 16.2.9 docs, `not-found.mdx` | Enabled; imports `app.css` itself |
| F12 | With `cacheComponents`, the segment configs `dynamic`, `dynamicParams`, `revalidate`, `fetchCache` are build errors; dynamic params without `generateStaticParams` need Suspense | Next source (`react_server_components.rs`) and 16.2.9 docs | `cacheComponents` stays off in v1 (AD-2 rationale) |
| F13 | React 19.3 (2026-09-09) made `<ViewTransition>` stable; a named `ViewTransition` removed in one place and added in another animates as "share" within a Transition | react.dev blog `2026/09/09/react-19-3.md`, `ViewTransition.md` | Card ⇄ window ⇄ card continuity without measuring rects |
| F14 | Next exposes `experimental.viewTransition`; `<Link transitionTypes>` passes types to `addTransitionType` | Next 16.2.9 docs, `view-transitions.mdx`, `link.mdx` | Open/close/return are typed view transitions |
| F15 | `<Link onNavigate>` runs only for client-side navigations (not modifier clicks, external URLs, downloads) and can cancel | Next 16.2.9 docs + `app-dir/link.tsx` source | The deck marks "launched from card" exactly when a soft navigation happens |
| F16 | Native `history.pushState/replaceState` integrate with the Next router and sync `usePathname`/`useSearchParams` without a server request | Next 16.2.9 docs, `linking-and-navigating.mdx`, `single-page-applications.mdx` | Share-sheet state lives in the URL cheaply (AD-10) |
| F17 | `after()` works in Server Components, Server Functions, Route Handlers and Proxy | Next 16.2.9 docs, `after.mdx` | Telemetry and vote side work run after the response |
| F18 | Forms that call Server Actions work before JS loads; a cookie mutation inside an action re-renders the current page | Next 16.2.9 docs, `mutating-data.mdx` | Friend vote page works in KakaoTalk/Instagram webviews on first paint |
| F19 | File-based `opengraph-image` resolves from the closest ancestor segment and is inherited by children; metadata routes always try build-time prerendering | Next source `metadata-resolution-primitives.ts`, `export/routes/app-route.ts` | One static OG per (locale, variant, question) serves every share id beneath it |
| F20 | Prefetching a dynamic route without PPR fetches only up to the first `loading.js`; with no loading boundary nothing is prefetched | Next source `segment-cache/scheduler.ts` | The window route ships a `loading.tsx` (§5.6) |
| F21 | `reactCompiler` is a stable top-level option (off by default); Turbopack is the default for `dev` and `build`; `typedRoutes` is top-level | Next 16.2.9 upgrade guide, `typedRoutes.mdx` | Compiler on; Turbopack; `typedRoutes` off in favour of next-intl `pathnames` (§6.1) |
| F22 | Playwright `updateSnapshots: 'none'` fails on a missing baseline and writes nothing | Playwright `class-testconfig.md`, `toMatchSnapshot.ts` | Replaces the legacy strict-snapshot helper with configuration |

Not verified here and therefore turned into foundation spikes (§13): whether Next prerenders the intercepting page or renders it per request; whether a browser-back (popstate) restore runs inside a Transition so that `<ViewTransition>` animates it; how `dynamicParams = false` on the root `[locale]` segment renders an unknown first segment; whether the next-intl `Link` forwards `onNavigate`/`transitionTypes`; the exact file path of Pretendard's dynamic-subset CSS inside the npm package. GHSA-vcvr-r3jv-pc5j itself was verified by `critique.md` §3 #8, not re-queried here.

---

## 3. Principles this architecture enforces by structure

1. **The route tree is the product map.** A behaviour that is really navigation (open the window, leave the test, show a result, open the share sheet) is expressed as a URL change the framework already knows how to prefetch, restore and deep-link. No parallel client router, no hash protocol, no `postMessage`.
2. **Server builds views, client runs interactions.** Server Components load content, pick the locale's strings and pass flat, serialisable views. Client components never import content.
3. **Pure domain, one side-effect site.** `src/domain` contains every rule from `contracts.md` §4.3–§4.6 as pure functions. The run reducer returns `{ state, events }`; one hook turns events into storage writes and telemetry.
4. **One source per value.** Tokens in `tokens.css`; palettes in content; storage keys in one module; reduced motion in one attribute; locale codes in one routing table; messages typed from one base catalogue.
5. **Invalid states do not compile or do not build.** Content and messages are TypeScript checked with `satisfies`; content invariants (odd axis counts, J only for 2-answer tests, required instruction text) run in the unit gate over the real content; failure blocks the landing, so the runtime carries no fallback branches for them.
6. **Guards are behaviour.** Structural boundaries are ESLint `no-restricted-imports` and `server-only`/`client-only` markers; everything else is a unit or E2E test that executes the product. At most two file-system checks exist (§11.3).
7. **Mobile-first by construction.** The phone column is the only layout until O1; no hover-only path, no desktop shell code.

---

## 4. System overview

```text
Browser ──► src/proxy.ts (Node) ─────────────────────────────────────────────────┐
            1 entry aliases  /ko → /kr, /zh-TW → /zt, /en-US → /en   (308)        │
            2 locale-less allowlist  / /blog /blog/x /history /test/x → next-intl │
              anything else locale-less → falls through to global-not-found      │
            3 next-intl: negotiate (cookie → Accept-Language → en), redirect,     │
              rewrite /kr/… → /ko/… (internal BCP 47), set NEXT_LOCALE            │
                                                                                  ▼
app/[locale]/layout.tsx  (ROOT layout, static × 12)
   <html lang={locale} data-theme data-motion data-consent>   ← bootstrap script
   <body>
     <PageFrame inert={layerOpen}>{children}</PageFrame>      ← landing, blog, result, …
     {window}                                                 ← @window slot
   </body>

@window slot:  default.tsx → null                (hard nav, every page)
               (.)test/[variant]/page.tsx        (soft nav to /{p}/test/{v})
                  └─ <TestLayer entry="intercept"> window mode if launched from a deck card, else full
children:      test/[variant]/page.tsx           (hard nav / refresh / shared link)
                  └─ <TestLayer entry="page"> always full

Server-only:   src/content (typed catalogue, questions, palettes) → views
               src/server  (ask store, telemetry sink, site origin, server actions)
Pure:          src/domain  (all rules; imported by server and client)
Client-only:   src/client  (storage, prefs stores, run/history stores, telemetry queue, launch handshake)
```

Rendering modes:

| Route | Rendering | Why |
|:--|:--|:--|
| `/{p}` landing | static × 12 locales (ISR later, only when live counts arrive with O2) | content is build-time data; consent filtering is client-side over server HTML |
| `/{p}/test/{v}` | static × locales × enterable variants; unknown `v` renders the recovery view on demand (`dynamicParams` default `true`, `robots: noindex`) | deep links are instant; no `notFound()` inside `[locale]` |
| `@window/(.)test/{v}` | same data as the page; static or per-request per spike S1, with `loading.tsx` so prefetch works either way | F20 |
| `/{p}/result/{v}/{type}?{payload}` | dynamic (reads `searchParams`) | the payload is untrusted and must gate rendering server-side (no partial render) |
| `/{p}/ask/{v}/{q}/{shareId}` | dynamic (tally, voter cookie) | live counts; form works without JS |
| `/{p}/blog`, `/{p}/blog/{post}`, `/{p}/history`, `/{p}/privacy` | static | content or client-local data |
| OG images (`[locale]`, `test/[v]`, `result/[v]/[type]`, `ask/[v]/[q]`) | static at build, from enum params only | F19; no request input reaches `ImageResponse` |
| `/api/telemetry` (POST), `/api/ask/{shareId}` (GET) | Route Handlers | beacons and polling need plain HTTP |

---

## 5. The window — parallel + intercepting route, designed around its traps

### 5.1 Files

```text
src/app/[locale]/
├─ layout.tsx                        root layout; renders {children} and {window}
├─ @window/
│  ├─ default.tsx                    export default () => null
│  └─ (.)test/[variant]/
│     ├─ page.tsx                    <TestLayer entry="intercept" view={…} />
│     └─ loading.tsx                 window surface in the card colour + sheen (the prototype's "late stage" state)
└─ test/[variant]/
   └─ page.tsx                       <TestLayer entry="page" view={…} />  or <Recovery/> for unknown ids
```

Both pages call the same loader and render the same client component; the only difference is the `entry` prop.

```ts
// src/app/[locale]/test/[variant]/page.tsx  (the intercept page is identical except entry="intercept")
export async function generateStaticParams() {
  return listEnterableVariants().map((variant) => ({ variant }));   // locale comes from the root layout
}
export default async function Page({ params }: PageProps<'/[locale]/test/[variant]'>) {
  const { variant } = await params;
  const locale = await getLocale();                                   // next-intl via next/root-params (F10)
  const resolved = resolveTestView(locale, variant);                  // src/content, server-only
  return resolved.ok ? <TestLayer entry="page" view={resolved.view} /> : <Recovery reason={resolved.reason} requested={variant} />;
}
```

### 5.2 Lifecycle (every path, one table)

| Event | URL / history | `@window` slot | `children` | Layer mode | Transition |
|:--|:--|:--|:--|:--|:--|
| Landing load | `/kr` | `default` → null | landing | — | — |
| Deck settles on a card for 350 ms | unchanged | — | — | — | `router.prefetch(testHref)` and `preloadStage(stage)` (§5.6) |
| Tap card / Enter on card CTA | push `/kr/test/qmbti` (next-intl `Link`, `onNavigate` → `launch.mark('qmbti')`, `transitionTypes={['window-open']}`) | intercept → `TestLayer` | landing kept, `inert` | `window` (launch mark present) | share: card ⇄ window surface |
| Close before answering: 닫기, outside tap, Esc | `router.back()` → `/kr` | restored to null | landing active | — | share: window → card |
| Browser back while window open | popstate → `/kr` | restored to null | landing | — | share if the restore runs in a Transition (spike S3); otherwise an instant close — the only unanimated path |
| Answer Q1 in the window | unchanged | same instance | landing `aria-hidden` once full | `window → full` (CSS inset/clip, 520 ms `--vt-dur-grow`) | stage keeps its own forward motion |
| Instruction modal [시작 / 모두 허용하고 시작 / 거부하고 시작] | unchanged | same | same | `full` | domain `commitEntry` |
| [거부하고 중단] or wordmark, launched from card | `router.back()` → `/kr` | null | landing | — | share: layer → the same card |
| Wordmark, not launched from card | `router.push('/')` (localized) with `launch.returnTo(variant)` | null | landing mounts centred on that card | — | share: layer → card (cross-route) |
| Submit | `router.replace('/kr/result/qmbti/ENTJ?…')` | stale instance renders nothing (URL-derived, §5.4) | result page | — | default cross-fade |
| Hard load / refresh of `/kr/test/qmbti` | — | `default` → null | `test/[variant]/page` → `TestLayer` | `full` | — |
| "다시하기" / "나도 해 보기" from a result, blog or history page | push `/kr/test/qmbti` | intercept (F5) → `TestLayer` | that page kept, `inert` | `full` (no launch mark) | enter fade |

The postMessage protocol of the mockup maps onto props and routing, message by message:

| Mockup message | Product equivalent |
|:--|:--|
| `vive:ready` | not needed: the stage renders inside the committed tree; the `loading.tsx` skeleton covers the gap |
| `vive:window {insets}` | the layer sets `--win-top/right/bottom/left` on its root; stage CSS lays Q1 out inside them |
| `vive:open` | the input gate arms at mount + `--vt-dur-open` (§7.5) |
| `vive:collapse` | the layer leaves the tree (route back); its state resets by key (§5.4) |
| `vive:q1 {choice, color}` | `onAnswer` at question 0 in window mode → the run controller stages the entry, the layer grows |
| `vive:full` | `mode="full"` prop: chrome appears, rail gets Q1's colour, the instruction modal opens once |
| `vive:back` | shell wordmark `onExit()` |
| `vive:escape` | the layer's own `keydown` handler in window mode |

### 5.3 Trap 1 and 2 — descendant interception and `beforeFiles` precedence (F5, F6)

- **Consequence.** Any soft navigation from any `/{locale}/*` page to `/{locale}/test/*` is intercepted, including paths that look static (`/kr/test/error`).
- **Structure chosen.**
  - The layer decides its mode from a **launch mark**, not from where it is: `launch.mark(variant)` is written only by the deck card's `onNavigate` (F15). Present → window mode; absent → full mode. A test opened from a result page therefore covers that page as a full layer and browser back returns to it, which is the intended behaviour, not a workaround.
  - **No route lives under `test/` except `[variant]`.** The legacy recovery URL `/test/error?variant=x` is served for free: `error` is a reserved id that content validation forbids, so the page renders the recovery view for it like for any unknown id. Invalid variants render the recovery view **in place** instead of redirecting, which removes the redirect-inside-intercept loop entirely and keeps `notFound()` out of `[locale]`.

### 5.4 Trap 3 — slots keep stale state on soft navigation (F3)

- **Rule.** The layer's visibility is derived from the URL: `open = matchTestPath(usePathname())?.variant === view.id`. When the URL moves elsewhere by push or replace (submit → result), the stale instance renders nothing and releases `inert`. When the URL moves by back, Next restores the previous tree and the instance unmounts.
- **Reset.** Re-opening the same variant after a push-based close must not resurrect the grown state, so the layer keys its inner tree by an open counter that increments on every closed → open edge (a React key reset, not an effect).
- **Rejected:** a catch-all `@window/[...rest]/page.tsx` returning `null`, the documented pattern. It turns every unknown path under a locale into a matched route whose `children` slot then 404s **inside** `[locale]`, the one place 404s must not be resolved (`contracts.md` §4.6 "404 handling").

### 5.5 Continuity: view transitions for route changes, CSS for in-layer change

- The deck card wraps its surface in `<ViewTransition name={`card-${id}`}>` **only while that card is not open** (open is `matchTestPath(pathname)?.variant === id`). The layer wraps its surface in the same name. Opening and closing therefore swap which element owns the name within one Transition, and React runs a "share" morph (F13). No rect measurement, no FLIP code, and content stays visible because the old state is a snapshot and the new state is live.
- `transitionTypes` (`window-open`, `window-close`, `return`) select the CSS timing (580 / 440 / 560 ms per the prototype) in `stages/vt-transitions.css`; reduced motion maps all three to a 160 ms fade.
- The **grow** from window to full screen is not a route change and uses a CSS transition on the layer's inset custom properties, so the stage keeps animating underneath without a snapshot.
- Browsers without view transitions still get correct, instant state changes.

### 5.6 Prefetch and the late-stage state

- Deck settle (350 ms, as in the mockup) calls `router.prefetch(href)` for the centred card and `preloadStage(stage)`, which calls the same `import()` the `StageHost` uses, so the stage chunk is warm.
- `loading.tsx` in the intercept folder makes the route prefetchable up to the skeleton even if Next renders it per request (F20), and paints the window surface in the card's palette with the sheen while data arrives.
- The mockup's "fallback Q1 drawn by the landing after 3 s" is not rebuilt: it existed because an iframe could stall silently. A failing stage chunk hits the layer's error boundary, which offers close and retry.

### 5.7 Alternatives considered for the window

| Option | Recurring owner actions | Verdict |
|:--|:--:|:--|
| **Parallel `@window` slot + `(.)test/[variant]` intercept** (chosen) | 0 | Native prefetch, history, deep link and RSC data; traps designed out in §5.3–§5.4 |
| Landing-owned layer + `history.pushState` to `/test/{v}` + client fetch of test data | 0 | Rejected: needs a JSON endpoint, a client cache and manual chunk preloading — the custom infrastructure the platform already provides |
| Separate pages + cross-document view transition | 0 | Rejected: the landing unmounts, so "shrink back into the same card with content visible" and "landing never unmounts" cannot hold |
| `iframe` + `postMessage` (the mockup) | 0 | Rejected: a mockup device; double documents, double bundles, focus and history split |

The prototype author suggested pushing `/test/{variant}` when Q1 is answered; here the entry is pushed when the window **opens**, because the legacy close paths require browser back to close the open window before any answer (`req-landing-interaction` §8.5 per `prototype.md` App. B.1). Answering Q1 adds no second entry, so one back press leaves the test from any state.

---

## 6. Directory tree, module boundaries, dependency rules

### 6.1 Tree

```text
/
├─ src/
│  ├─ proxy.ts                         single request entry (AD-4)
│  ├─ app/                             routing and composition only: thin files
│  │  ├─ [locale]/
│  │  │  ├─ layout.tsx                 ROOT layout: html/body, bootstrap, metadata, NextIntlClientProvider (picked namespaces)
│  │  │  ├─ page.tsx                   landing
│  │  │  ├─ error.tsx                  client error net inside the root layout
│  │  │  ├─ opengraph-image.tsx        brand OG per locale (static)
│  │  │  ├─ manifest.webmanifest/route.ts   locale manifest (static GET)
│  │  │  ├─ @window/{default.tsx, (.)test/[variant]/{page.tsx, loading.tsx}}
│  │  │  ├─ test/[variant]/{page.tsx, opengraph-image.tsx}
│  │  │  ├─ result/[variant]/[type]/{page.tsx, opengraph-image.tsx}
│  │  │  ├─ ask/[variant]/[question]/{opengraph-image.tsx, [shareId]/page.tsx}
│  │  │  ├─ blog/{page.tsx, [post]/page.tsx}
│  │  │  ├─ history/page.tsx
│  │  │  └─ privacy/page.tsx           (O6)
│  │  ├─ api/{telemetry/route.ts, ask/[shareId]/route.ts}
│  │  ├─ global-not-found.tsx          own <html>, imports app.css (F11)
│  │  ├─ global-error.tsx              own <html>, imports app.css
│  │  └─ {manifest.ts, robots.ts, sitemap.ts, icon.svg, apple-icon.tsx}
│  ├─ i18n/
│  │  ├─ routing.ts                    defineRouting: locales, prefixes, pathnames, cookie
│  │  ├─ entry.ts                      aliases + locale-less allowlist (pure; used by proxy)
│  │  ├─ request.ts                    getRequestConfig via next/root-params
│  │  └─ navigation.ts                 createNavigation(routing): Link, redirect, useRouter, usePathname, getPathname
│  ├─ messages/{en,ko,zh-Hans,zh-Hant,ja,es,fr,pt,de,hi,id,ru}.ts   typed `satisfies Messages`
│  ├─ domain/                          PURE TypeScript (no react, next, DOM)
│  │  ├─ ids.ts          branded VariantId, QuestionIndex, ShareId; product locale codes
│  │  ├─ catalog.ts      attributes, enterability, consent visibility
│  │  ├─ question.ts     question model (2–4 answers), canonical index vs scoring order vs Q label
│  │  ├─ scoring.ts      schema, binary_majority derivation, type segment
│  │  ├─ run.ts          run reducer (answer, back, move, advance-one, lock semantics), progress, eligibility
│  │  ├─ entry.ts        entry-path classification, staged entry, runtime entry commit, timeout
│  │  ├─ instruction.ts  consent × attribute × ingress matrix, qualifier steps, instructionSeen rules
│  │  ├─ result.ts       payload codec (legacy-compatible), result view resolution + error taxonomy
│  │  ├─ history.ts      run history model
│  │  ├─ stage.ts        stage resolution (configured, reduced motion → D, J only for 2 answers)
│  │  ├─ palette.ts      palette derivation, answer colour sets, contrast math, tone
│  │  ├─ telemetry.ts    event schemas (zod) = types; hygiene rules
│  │  └─ ask.ts          share id, vote input schema, tally math (largest remainder)
│  ├─ content/                         SERVER-ONLY (`import 'server-only'`)
│  │  ├─ schema.ts       TestSource, BlogSource, LocaleText, defineTest()
│  │  ├─ catalog.ts      ordered catalogue (tests, coming soon, blogs)
│  │  ├─ tests/*.ts      one file per variant: questions, answers, poles, palette, stage, instruction, qualifier
│  │  ├─ blog/*.ts       posts
│  │  ├─ project.ts      locale projection: source → CatalogView / TestView / BlogView (en fallback)
│  │  └─ validate.ts     content invariants, run by the unit gate
│  ├─ server/                          SERVER-ONLY infrastructure
│  │  ├─ ask-store.ts    AskStore port + the one adapter selected by env (O2)
│  │  ├─ telemetry-sink.ts   TelemetrySink port (drop until O2)
│  │  ├─ actions/vote.ts     'use server' castVote
│  │  └─ site.ts         site origin from Vercel env
│  ├─ client/                          CLIENT-ONLY infrastructure (`import 'client-only'`)
│  │  ├─ storage.ts      never-throwing localStorage/sessionStorage access, degraded flag
│  │  ├─ keys.ts         every storage key, one place
│  │  ├─ bootstrap.ts    pre-paint script source (theme, motion, consent → html[data-*])
│  │  ├─ prefs.ts        useConsent / useTheme / useMotion (useSyncExternalStore)
│  │  ├─ run-store.ts    run document + staged entry + instructionSeen persistence
│  │  ├─ history-store.ts
│  │  ├─ telemetry.ts    queue, consent gate, anonymous id, beacon transport
│  │  ├─ layer-store.ts  "a layer is open" flag for PageFrame inert
│  │  └─ launch.ts       launch mark / return target handshake (in-memory)
│  ├─ features/                        UI (React). Receives views as props; never imports content/
│  │  ├─ ui/             Overlay (modal + sheet), Button, Toast, VisuallyHidden, PageFrame
│  │  ├─ landing/        Landing, Gnb, Field (WebGL + CSS fallback), Deck, DeckCard, CatalogList, ConsentNotice
│  │  ├─ test/           TestLayer, TestRun, use-test-run, InstructionModal, ShellChrome, Rail, AnswerBadge, PrevMark, VotesLine, use-input-gate, StageHost
│  │  ├─ stages/         contract.ts, loaders.ts, i/, j/, d/  (each: component + own CSS + local helpers)
│  │  ├─ share/          ShareSheet, story-card (canvas 9:16), AskPage, VoteForm, TallyBars
│  │  ├─ result/         ResultScreen, ResultError
│  │  ├─ consent/        ConsentPanel (recall surface, O4), GatedAnalytics
│  │  ├─ history/        HistoryList
│  │  ├─ blog/           BlogIndex, BlogPost
│  │  └─ recovery/       Recovery
│  └─ styles/
│     ├─ app.css         @layer order + @imports (the only CSS the root layout imports)
│     ├─ tokens.css      THE token definition (AD-7)
│     ├─ base.css        element defaults, focus ring, wrapping, touch defaults
│     ├─ fonts.css       Pretendard dynamic subset import (package), fallback stack
│     ├─ exports.ts      reads tokens marked /* @export */ for next.config env (§9.4)
│     └─ vt/{shell,overlay,answer,rail,deck,list,gnb,share,result}.css   component skins
├─ tests/
│  ├─ e2e/*.spec.ts    Playwright, by area (@window, @test, @consent, @share, @i18n, @errors, @a11y)
│  └─ e2e/support/     page helpers, storage fixtures, server-HTML helpers
├─ design-system/      README.md, SKILL.md, SYNC.md (push procedure), export script (R3)
├─ docs/               DECISIONS.md, spec/*.md, design/system.md, plans/, done/
├─ public/licenses/pretendard-OFL.txt
├─ AGENTS.md, .claude/{CLAUDE.md, settings.json}
├─ next.config.ts, tsconfig.json, eslint.config.mjs, vitest.config.ts, playwright.config.ts
├─ vercel.json          production freeze until launch
└─ .github/workflows/ci.yml
```

Unit tests are colocated (`src/domain/run.test.ts`); vitest includes `src/**/*.test.{ts,tsx}` from day one, so the legacy `.tsx`-not-collected trap has no subject.

### 6.2 Dependency rules

| Layer | May import | Must not import | Enforced by |
|:--|:--|:--|:--|
| `domain` | `zod`, other `domain` files | `react`, `next/*`, `next-intl`, `@/content`, `@/client`, `@/server`, `@/features`, `@/app`; globals `window`, `document`, `localStorage`, `sessionStorage`, `navigator` | ESLint `no-restricted-imports` + `no-restricted-globals` scoped to `src/domain/**` |
| `content` | `domain`, `i18n/routing` (types) | `react`, `@/client`, `@/features`, `@/app` | `import 'server-only'` (build error if bundled for the client) + ESLint |
| `server` | `domain`, `content`, `next/server`, `next/headers`, vendor SDK | `@/client`, `@/features`, `react` (except `actions/` which are Server Functions) | `import 'server-only'` + ESLint |
| `client` | `domain`, `i18n/routing` (types) | `@/content`, `@/server`, `@/features`, `@/app` | `import 'client-only'` + ESLint |
| `features` | `domain`, `client`, `server/actions/*`, `i18n/navigation`, `next-intl`, `react`, `next/dynamic`, `next/form` | `@/content`, `@/server/*` other than `actions`, `@/app`, `next/link`, `next/navigation` router APIs | ESLint |
| `app` | everything above | — | composition root; loads content, calls projections, passes views |
| `proxy.ts` | `i18n/routing`, `i18n/entry`, `next-intl/middleware`, `next/server` | everything else | ESLint `files: ['src/proxy.ts']` |

Global ESLint rules: `next/link` and `next/navigation`'s `useRouter`/`redirect`/`Link` are banned outside `src/i18n/navigation.ts` (everything goes through next-intl's typed wrappers, which replaces the legacy "RouteBuilder only, no manual concatenation" rule); direct `localStorage`/`sessionStorage` is banned outside `src/client/storage.ts` (replaces the legacy safe-storage guard with a lint rule).

---

## 7. Module designs with interface sketches

### 7.1 i18n and the request entry

```ts
// src/i18n/routing.ts
export const routing = defineRouting({
  locales: ['en', 'ko', 'zh-Hans', 'zh-Hant', 'ja', 'es', 'fr', 'pt', 'de', 'hi', 'id', 'ru'],
  defaultLocale: 'en',
  localePrefix: { mode: 'always', prefixes: { ko: '/kr', 'zh-Hans': '/zs', 'zh-Hant': '/zt' } },
  localeCookie: { name: 'NEXT_LOCALE' },
  pathnames: {
    '/': '/', '/test/[variant]': '/test/[variant]', '/result/[variant]/[type]': '/result/[variant]/[type]',
    '/ask/[variant]/[question]/[shareId]': '/ask/[variant]/[question]/[shareId]',
    '/blog': '/blog', '/blog/[post]': '/blog/[post]', '/history': '/history', '/privacy': '/privacy',
  },
});
export type Locale = (typeof routing.locales)[number];
export type ProductLocale = 'en' | 'kr' | 'zs' | 'zt' | 'ja' | 'es' | 'fr' | 'pt' | 'de' | 'hi' | 'id' | 'ru';
/** The canonical product code (URL segment, storage, telemetry) — derived, never hand-listed twice. */
export function productLocale(locale: Locale): ProductLocale;
```

```ts
// src/i18n/entry.ts  (pure; unit-tested with a table of URLs)
export type EntryDecision =
  | { kind: 'redirect'; to: string; status: 308 }   // alias → canonical prefix
  | { kind: 'i18n' }                                // prefixed, or allowlisted locale-less path
  | { kind: 'not-found' };                          // locale-less path outside the allowlist
export function decideEntry(pathname: string, search: string): EntryDecision;
```

```ts
// src/proxy.ts
const handleI18n = createMiddleware(routing);
export function proxy(request: NextRequest) {
  const d = decideEntry(request.nextUrl.pathname, request.nextUrl.search);
  if (d.kind === 'redirect') return NextResponse.redirect(new URL(d.to, request.url), d.status);
  if (d.kind === 'not-found') return NextResponse.next();          // no route matches → global-not-found (spike S2)
  return handleI18n(request);
}
export const config = {
  matcher: [
    '/((?!api/|_next/|_vercel/|icon|apple-icon|opengraph-image|.*\\..*).*)',   // pages; any path with a dot is a file
    '/:prefix/manifest.webmanifest',                                            // locale manifest (has a dot, needs the /kr → /ko rewrite)
  ],
};
```

- **Root segment.** `[locale]/layout.tsx` exports `generateStaticParams` (the 12 locales) and `dynamicParams = false`, so an unknown first segment never renders the root layout; spike S2 proves it reaches `global-not-found`.
- **`<html lang>`** is `locale` itself, because the internal locale is BCP 47 (`ko`, `zh-Hans`, `zh-Hant`); product codes appear only in URLs (next-intl prefixes), storage and telemetry (`productLocale`).
- **Rejected:** product codes as next-intl locales with a hand-written negotiator. `kr` is Kanuri to `Intl` and `zs`/`zt` are unassigned subtags, so every `Intl.NumberFormat`/`DateTimeFormat` call would need a second mapping. That mapping is exactly the kind of parallel table that drifted before.
- **Rejected:** a root `app/layout.tsx` reading a proxy-injected header for `lang`, the legacy EX-003 mechanism. `headers()` in the root layout makes every page dynamic.
- **Compatibility:** a returning visitor's `NEXT_LOCALE=kr` cookie is not a configured locale, so negotiation falls back to `Accept-Language` once and rewrites the cookie. Every shared URL keeps its `/kr` form, so no link breaks.

### 7.2 Content (repo-owned, typed, validated at build)

```ts
// src/content/schema.ts
export type LocaleText = { en: string } & Partial<Record<Exclude<Locale, 'en'>, string>>;
export type Attribute = 'available' | 'opt_out' | 'unavailable' | 'hide' | 'debug';
export type AnswerKey = 'A' | 'B' | 'C' | 'D';

export interface AnswerSource { key: AnswerKey; text: LocaleText; pole?: string; color?: `#${string}` }
export interface ScoringQuestionSource {
  kind: 'scoring'; emoji?: string; text: LocaleText;
  answers: readonly [AnswerSource, AnswerSource, ...AnswerSource[]];   // 2..4, checked in validate.ts
}
export interface ProfileQuestionSource {                               // qualifier (legacy `q.{n}` rows)
  kind: 'profile'; id: string; text: LocaleText;
  values: readonly { token: string; label: LocaleText }[];             // e.g. M/F → 남성/여성
}
export interface TestSource {
  id: string;                         // VariantId; 'error' is reserved
  attribute: Attribute;
  stage: 'I' | 'J' | 'D';            // owner fills at launch; J only if every question has 2 answers
  palette: { base: `#${string}`; hi: `#${string}`; look?: Partial<PaletteLook> };
  minutes: number;
  counts: { completed: number; shared: number };   // static until O2 provides a live source
  schema: ScoringSchema;             // axes, axisCount 1|2|4, mode 'binary_majority'
  title: LocaleText; subtitle?: LocaleText; instruction: LocaleText;
  questions: readonly (ScoringQuestionSource | ProfileQuestionSource)[];   // canonical order
  category?: string;
}
export function defineTest<const T extends TestSource>(t: T): T;
```

- **Projection.** `project.ts` turns sources into flat views for one locale (`CatalogView`, `TestView`, `BlogView`), falling back to `en` per string. It computes the palette (`domain/palette.look`) and per-question answer colours (curated `color` when present, else `domain/palette.answerColors`).
- **Validation.** `validate.ts` holds the content invariants and runs in the unit gate over the real catalogue:
  - unique ids, and `error` is not used as one;
  - scoring questions have 2–4 answers, and binary scoring requires exactly 2 answers with distinct poles on one axis;
  - an odd question count per axis;
  - `stage: 'J'` only when every question has 2 answers;
  - `instruction` present for every enterable test;
  - text contrast of the palette base ≥ 4.5:1 for white or ink;
  - `debug`/`hide` never appear in `CatalogView`.

  Because invalid content never builds, the legacy runtime branches (lazy per-variant validation, `hide` downgrade, "no partial activation") have no reason to exist.
- **Demo 3- and 4-answer tests** (`demo-three`, `demo-four`) ship as `attribute: 'debug'`. They are reachable by direct URL for E2E and never listed, which matches the legacy `debug` attribute's meaning.
- **Sheets.** If O3 keeps Sheets, an importer script writes `content/tests/*.ts` on a branch that lands like any other unit. The runtime never talks to Sheets.

```ts
// view types crossing the server → client boundary (src/domain/views.ts, so both sides share them)
export interface TestView {
  id: VariantId; locale: Locale; productLocale: ProductLocale;
  title: string; minutes: number; attribute: 'available' | 'opt_out';
  stage: StageId; palette: Palette; instruction: string;
  qualifier?: { id: string; text: string; options: { token: string; label: string }[] };
  questions: QuestionView[];          // scoring questions, scoring order, with canonicalIndex
  schema: ScoringSchema;              // needed client-side to derive the result at submit
}
export interface QuestionView {
  canonicalIndex: number; scoringOrdinal: number; emoji?: string; text: string;
  answers: { key: AnswerKey; text: string; color: string; ink: 'white' | 'ink' }[];
}
export interface CardView {
  id: VariantId; kind: 'test' | 'soon'; attribute: Attribute; title: string; subtitle?: string;
  minutes?: number; counts?: { completed: string; shared: string };   // pre-formatted per locale
  palette: Palette; motif: string; stage: StageId;
}
```

### 7.3 Domain

```ts
// src/domain/run.ts
export type Phase = 'q1-staged' | 'instruction' | 'qualifier' | 'question' | 'last' | 'submitted';
export interface RunState {
  variant: VariantId; runId: string; startedAtMs: number; lastAnswerAtMs: number;
  ingress: boolean;                                       // landing ingress bound at commit
  answers: Readonly<Record<number, AnswerKey>>;           // canonicalIndex → key (scoring only)
  qualifier: Readonly<Record<string, string>>;            // raw tokens, never projected
  cursor: number;                                         // scoring ordinal on screen
  phase: Phase; stage: StageId;                           // stage frozen for the run
}
export type RunAction =
  | { type: 'answer'; ordinal: number; key: AnswerKey; nowMs: number }
  | { type: 'back' } | { type: 'moveTo'; ordinal: number }            // D swipe, bounded by the frontier
  | { type: 'start'; cta: InstructionCta; qualifier?: Record<string, string>; nowMs: number }
  | { type: 'submit'; nowMs: number };
export type DomainEvent =
  | { type: 'staged'; key: AnswerKey } | { type: 'committed'; entry: EntryPath }
  | { type: 'answered'; ordinal: number; canonicalIndex: number; key: AnswerKey; last: boolean }
  | { type: 'consent'; value: 'OPTED_IN' | 'OPTED_OUT' } | { type: 'abandoned' }
  | { type: 'submitted'; result: DerivedResult };
export function reduce(state: RunState, action: RunAction, test: TestModel): { state: RunState; events: DomainEvent[] };
export const frontier: (s: RunState, t: TestModel) => number;          // answered + first unanswered
export const progress: (s: RunState, t: TestModel) => number;          // answered scoring / total scoring (incl. pre-answer)
export const isEligible: (s: RunState, t: TestModel) => boolean;
export const markFor: (s: RunState, t: TestModel, ordinal: number) => 'none' | 'previous' | 'selected';  // last question → selected
```

- **Advance-one rule** (owner decision replacing `req-test` §4.3): after `answer` at ordinal *p*, the cursor moves to *p + 1* unless *p* is last. Fresh answers and revisits share the rule, so the legacy "first unanswered" search no longer exists.
- **Retention:** no action removes another answer; only derivation residue is invalidated.

```ts
// src/domain/entry.ts
export type EntryPath = 'landing-ingress' | 'direct-resume' | 'direct-cold';
export interface StagedEntry { variant: VariantId; key: AnswerKey; createdAtMs: number }
export function classifyEntry(i: { staged?: StagedEntry; active?: RunState; nowMs: number }): EntryPath;
export function isExpired(run: RunState, nowMs: number): boolean;      // 30 min after last answer, judged at re-entry
export function commitEntry(i: { variant: VariantId; staged?: StagedEntry; previous?: RunState; nowMs: number; qualifier?: Record<string,string> }): RunState;

// src/domain/instruction.ts
export type Consent = 'UNKNOWN' | 'OPTED_IN' | 'OPTED_OUT';
export type InstructionCta = 'next' | 'start' | 'acceptAllAndStart' | 'denyAndAbandon' | 'denyAndStart' | 'keepCurrentPreference';
export interface InstructionPlan {
  steps: readonly ('instruction' | 'qualifier')[];
  note: 'unknownAvailable' | 'unknownOptOut' | 'optedOutWarning' | null;
  ctas: readonly InstructionCta[];                       // on the final step; 'next' on a non-final instruction step
  escape: Record<'instruction' | 'qualifier', 'noop' | 'back'>;
  recordsSeen: readonly InstructionCta[];                // CTAs that record instructionSeen
}
export function planInstruction(i: { ingress: EntryPath; consent: Consent; attribute: 'available' | 'opt_out'; hasQualifier: boolean }): InstructionPlan;

// src/domain/result.ts
export interface ResultPayload { scoreStats: ScoreStats; shared: boolean }   // byte-compatible with the legacy format
export function encodeResultPayload(p: ResultPayload): string;              // URL-safe base64 JSON, keyless query
export function decodeResultPayload(raw: string | undefined): Result<ResultPayload, ResultError>;
export function resolveResultView(i: { variant: string; type: string; raw?: string; test?: TestModel }): Result<ResultModel, ResultError>;
export interface ResultError { branch: ResultFailureBranch }   // one member per failure branch of req-test §6.3, named in docs/spec/domain.md

// src/domain/stage.ts
export function resolveStage(i: { configured: StageId; motion: 'full' | 'reduced'; maxAnswers: 2 | 3 | 4 }): StageId;
// reduced → 'D'; configured 'J' with >2 answers is impossible (content validation), kept as a type-level precondition
```

- The domain spec (roadmap R1) restates each `contracts.md` §4.6 row as a numbered rule. Every rule has a unit test whose name carries the rule ID, which replaces the legacy blocker registry and `assertion:` anchors.
- **Result commit fixes the legacy gap:** `submitted` makes the run hook delete the run document and `instructionSeen` before navigating.

### 7.4 Client infrastructure

```ts
// src/client/storage.ts — the only place that touches Web Storage
export type Area = 'local' | 'session';
export function read<T>(area: Area, key: StorageKey, parse: (raw: string) => T | undefined): T | undefined;  // never throws
export function write(area: Area, key: StorageKey, value: string): boolean;                                // false = degraded
export function remove(area: Area, ...keys: StorageKey[]): void;
export const degraded: () => boolean;

// src/client/keys.ts — compatibility decisions recorded here once
export const keys = {
  theme: 'vivetest-theme',                       // kept (returning users)
  consent: 'vivetest-telemetry-consent',         // kept, values OPTED_IN | OPTED_OUT
  sessionId: 'vivetest-telemetry-session-id',    // kept
  history: 'test:runHistory',                    // kept (device history continuity)
  run: (v: VariantId) => `vt:run:${v}`,          // new: one JSON document per variant (atomic cleanup)
  staged: (v: VariantId) => `vt:staged:${v}`,    // new, session
  seen: (v: VariantId) => `vt:seen:${v}`,        // new, session
} as const;
```

- **Preferences.** `prefs.ts` exposes `useConsent()`, `useTheme()` and `useMotion()` built on `useSyncExternalStore`. The server snapshot is `UNKNOWN` / `system` / `full`. The client snapshot reads the `html[data-*]` attribute the bootstrap wrote, and subscribers listen to `storage` events and `matchMedia`. Setters write storage and update the attribute. No provider, no mount effect, no hydration mismatch.
- **Bootstrap.** `bootstrap.ts` is one inline script in the root layout `<head>`, wrapped in `try`. It sets `data-theme`, `data-motion` (from `prefers-reduced-motion`; a site setting joins here if C-13 adds one) and `data-consent`. CSS keys off these attributes only: no component stylesheet uses `@media (prefers-reduced-motion)`, so reduced motion has exactly one source.
- **Layer and launch.** `layer-store.ts` holds one boolean for `PageFrame`'s `inert` attribute. `launch.ts` keeps an in-memory `{ mark(variant), take(variant), returnTo(variant), consumeReturn() }`.
- **Telemetry queue.** `telemetry.ts` provides `track(event)`, which fills the common fields (event id, session id, ms timestamp, product locale, route, consent) and applies the gate: `OPTED_IN` sends, `UNKNOWN` queues up to a bound, `OPTED_OUT` drops the queue and deletes the session id. Transport is one `navigator.sendBeacon('/api/telemetry', batch)` per microtask batch and on `pagehide`. The anonymous id is `crypto.randomUUID()`, then `getRandomValues`, else none.

### 7.5 Test experience

```ts
// src/features/test/TestLayer.tsx  ('use client')
export function TestLayer(props: { entry: 'intercept' | 'page'; view: TestView }): JSX.Element | null;
// - open = URL-derived (§5.4); mode = entry === 'page' || !launch.take(id) ? 'full' : 'window'
// - owns: surface <ViewTransition name={`card-${id}`}>, window header band (title, 닫기), grow, Esc/outside close, exit()

// src/features/test/use-test-run.ts
export function useTestRun(view: TestView, entry: 'window' | 'full'): {
  state: RunState; plan: InstructionPlan | null; question: QuestionView; mark: 'none' | 'previous' | 'selected';
  answer(key: AnswerKey): void; back(): void; moveTo(ordinal: number): void;
  start(cta: InstructionCta, qualifier?: Record<string, string>): void; submit(): void;
};
// wraps domain.reduce in useReducer; one effect maps DomainEvent[] → run-store writes + telemetry.track
```

```ts
// src/features/stages/contract.ts — what every stage implements
export interface StageProps {
  view: TestView;
  question: QuestionView; mark: 'none' | 'previous' | 'selected';
  mode: 'window' | 'full'; motion: 'full' | 'reduced';
  gate: InputGate;                                  // armed, lock(ms), armAt(t) — one primitive for all stages
  onAnswer(key: AnswerKey): void;                   // the only way to answer (tap, drag commit, key)
  onNavigate(to: 'prev' | 'next'): void;            // D swipe/edge taps, J back travel; never answers
  anchors: { setPrevX(x: number | null): void; setTone(t: { top: Tone; bottom: Tone }): void };
}
export interface StageModule {
  default: React.ComponentType<StageProps>;
  railAxis: 'y' | 'x';                              // I, J → 'y'; D → 'x'
  maxAnswers: 2 | 4;                                // J → 2
  keyboard: readonly ('arrows-answer' | 'arrows-move' | 'digits' | 'letters')[];   // declared, E2E-checked
}
// src/features/stages/loaders.ts
export const stageLoaders = { I: () => import('./i'), J: () => import('./j'), D: () => import('./d') } satisfies Record<StageId, () => Promise<StageModule>>;
export const preloadStage = (s: StageId) => void stageLoaders[s]();
```

- **Shell chrome** is declarative: `<ShellChrome title rail={{ axis, colors, pct, current }} prev={{ visible }} submit="hidden" | "disabled" | "ready" tone onBrand onShare onPrev onSubmit />`. J's per-frame `placePrev` becomes `anchors.setPrevX(x)`, which writes `--prev-x` on the chrome element through a ref. Per-frame positions never go through React state, and the extended hit zone is part of the shared `Prev` button.
- **Input gate.** `use-input-gate.ts` holds the 150 ms answer lock (selected state visible during the lock) and the arrival guard. J arms 350 ms after its signs settle. I and D arm when their entrance motion ends and run the same 19-pattern input suite in E2E; the J value is extended to them only if that suite finds a double advance. This settles `contracts.md` C-11 by evidence, and the choice is recorded in the experience spec.
- **Instruction modal.** `InstructionModal.tsx` uses the shared `Overlay` in `center` form: `role="dialog"`, `aria-modal`, focus on the container (`tabIndex=-1`), Tab wraps inside, and the stage and chrome behind it are `inert`. Esc follows `plan.escape`; CTAs follow `plan.ctas`, notes use message keys, and the body is the variant's content instruction.
  - **Rejected:** native `<dialog>.showModal()`. Browser close-request handling can make `cancel` non-cancellable after repeated Esc without user activation, which would contradict "Esc never writes, no-op on the instruction step". A plain element with `inert` makes the requirement hold by construction. This platform behaviour was not measured here, so the choice is conservative.
- **Stages.** I, J and D are the prototype's stages rebuilt as React components with their own CSS in `@layer stages`. Canvas and WebGL code lives in plain modules inside each stage folder (`j/world.ts`, `i/liquid.ts`) with a `mount(canvas, params) → { update, dispose }` shape, driven from one effect. No animation library is used; the prototype proved 4–8 KB hand-written canvas code per stage.

### 7.6 Landing

- **Composition.** `page.tsx` (server) gets a `CatalogView` and renders `<Landing>`. Its parts are the server-rendered GNB, `Field` (client; CSS radial-gradient fallback in the server HTML; WebGL after first paint via `requestIdleCallback`), `Deck` (client), the server-rendered `CatalogList` and `ConsentNotice` (client).
- **Deck.** It uses pointer events with its own small spring (ζ ≈ 0.72, matching the mockup), rubber-banding and ←/→ keys. Swipes only browse; a tap on a neighbour centres it; each card is a next-intl `Link` to `/test/[variant]` with `onNavigate={() => launch.mark(id)}`. Without JS the card is a plain link to the full test page. The first-visit nudge is kept.
- **Consent filtering** has one definition, `domain/catalog.visibleCards(cards, consent)`, used by the deck. The bootstrap attribute also drives one CSS rule, `html[data-consent=OPTED_OUT] [data-attribute=available] { display: none }`, so an opted-out visitor never sees hidden cards flash before hydration.
- **WCAG 2.2.2 by design.** The field moves only while the deck moves and settles within 5 s of idle; reduced motion renders it static. There is no pause control, per the owner's principle.

### 7.7 Sharing and votes (store vendor waits for O2; everything else is fixed)

```ts
// src/domain/ask.ts
export type ShareId = Brand<string, 'ShareId'>;                 // 16 random bytes, base64url, generated on the client
export const newShareId: (random: (n: number) => Uint8Array) => ShareId;
export const VoteInput = z.object({ shareId: z.string().regex(/^[A-Za-z0-9_-]{22}$/), variant: z.string(), question: z.coerce.number().int().min(1), choice: z.enum(['A','B','C','D']) });
export interface Tally { counts: Partial<Record<AnswerKey, number>>; n: number }
export function percentages(t: Tally, keys: AnswerKey[]): Record<AnswerKey, number>;   // largest remainder, sums to 100

// src/server/ask-store.ts
export interface AskStore {
  vote(i: { shareId: ShareId; voterId: string; variant: VariantId; question: number; choice: AnswerKey }): Promise<'counted' | 'duplicate' | 'mismatch'>;
  tally(shareId: ShareId): Promise<Tally | null>;
}
export const askStore: AskStore;   // one adapter chosen by env: managed store when configured (O2), in-memory for dev/E2E

// src/server/actions/vote.ts
'use server';
export async function castVote(_: VoteState, form: FormData): Promise<VoteState>;   // zod-validated; voter id = httpOnly cookie; after() for telemetry
```

- **Link shape.** `/{p}/ask/{variant}/{question}/{shareId}`. The id is generated client-side, so copying the link needs no server round trip. iOS Safari needs the clipboard write inside the tap's user activation, which an awaited server call would break. The vote box is created lazily on the first vote and records `(variant, question)`; later votes must match or they are rejected as a mismatch. Only the question travels in the link, never the sharer's own answer.
- **Friend page.** A dynamic Server Component renders the question from static content plus the live tally; `<VoteForm>` is `<form action={castVote}>` (F18), so it works in KakaoTalk and Instagram webviews before hydration. The result bars and "나도 이 테스트 해 보기" link come back in the same response.
- **Sharer's vote line.** `GET /api/ask/{shareId}` returns the tally with `no-store`; the question screen fetches it on show and on `visibilitychange` back to visible. There are no websockets and no polling loop.
- **Share sheet.** `ShareSheet` is the `Overlay` primitive in `bottom` form. Its open state is `?ask=1`, set by `history.pushState` (F16), so browser back closes the sheet instead of leaving the test. The test cannot advance while `?ask` is present because the stage gate is disarmed. The sheet offers:
  - the link first, through `navigator.share({ url, title })` when available, else copy;
  - the 9:16 story card second, rendered client-side on a canvas to a JPEG blob (the mockup's method), then `navigator.share({ files })` or long-press save.
- **OG images.** They are static files: `ask/[variant]/[question]/opengraph-image.tsx` is built from `(locale, variant, question)` at build time and applies to every share id beneath it (F19). No request value reaches `ImageResponse`, which removes the whole GHSA-vcvr-r3jv-pc5j class, and Next is pinned at 16.3.6 anyway.
- **Consent.** A vote is functional data the friend submits on purpose, not telemetry, so it is not consent-gated. The privacy notice (O6) must describe it. Share telemetry events (`share_clicked`, `share_copied`) follow the normal consent gate; `vote_cast` is counted server-side as an aggregate only.

### 7.8 Telemetry and analytics

```ts
// src/domain/telemetry.ts — zod schemas are the single definition of the payload
export const Common = z.object({ event_id: z.uuid(), session_id: z.uuid().nullable(), ts_ms: z.number().int(),
  locale: z.enum(PRODUCT_LOCALES), route: z.string(), consent_state: z.enum(['UNKNOWN','OPTED_IN','OPTED_OUT']) }).strict();
export const Event = z.discriminatedUnion('event_type', [
  Common.extend({ event_type: z.literal('landing_view') }),
  Common.extend({ event_type: z.literal('card_answered'), source_variant: z.string(), target_route: z.string(), landing_ingress_flag: z.literal(true) }),
  Common.extend({ event_type: z.literal('attempt_start'), variant: z.string(), stage: StageEnum, question_index_1based: z.number().int().min(1), landing_ingress_flag: z.boolean() }),
  Common.extend({ event_type: z.literal('question_answered'), variant: z.string(), stage: StageEnum, question_index_1based: z.number().int().min(1), choice: AnswerKeyEnum, dwell_ms: z.number().int().min(0) }),
  Common.extend({ event_type: z.literal('final_submit'), variant: z.string(), stage: StageEnum, question_index_1based: z.number().int(), dwell_ms_accumulated: z.number().int(), landing_ingress_flag: z.boolean(), final_responses: z.record(z.string(), AnswerKeyEnum) }),
  Common.extend({ event_type: z.literal('result_viewed'), variant: z.string(), type: z.string() }),
  Common.extend({ event_type: z.literal('share_clicked'), variant: z.string(), kind: z.enum(['ask','path','palette']) }),
  Common.extend({ event_type: z.literal('share_copied'), variant: z.string(), kind: z.enum(['ask','path','palette']) }),
]);
export const Batch = z.array(Event).min(1).max(50);
```

- **Field names.** The sketch shows the shape. The authoritative field list per event is `req-landing.md` §12.2 and `req-test.md` §9.1 as restated in `docs/spec/privacy-telemetry.md`; the schema is written from that spec, not from this sketch.
- **Hygiene is structural.** `.strict()` objects reject unknown fields, including the legacy `transition_id`, `result_reason` and `final_q1_response`. No field can carry free text: `route` is the pathname template and `variant` comes from the catalogue.
- **Endpoint.** `app/api/telemetry/route.ts` runs `Batch.safeParse` and returns 400 or 204, with `after(() => sink.write(batch))`. The sink drops events until O2 names a store, as the legacy endpoint did; retention (REQ-F-017) is decided with it.
- **Analytics gate.** `features/consent/GatedAnalytics.tsx` mounts `@vercel/analytics` and `@vercel/speed-insights` only while `useConsent() === 'OPTED_IN'`.
- **Deliberate change.** `choice` widens to `A–D` and `stage` joins the attempt events, as `contracts.md` §4.4 lists under gaps.

### 7.9 Result, recovery, errors, 404

- **Result page.** `result/[variant]/[type]/page.tsx` awaits `searchParams`, takes the first key as the payload (keyless query) and calls `resolveResultView`. It renders `ResultScreen` or `ResultError`, never partial content.
  - `result_viewed` fires once from an `IntersectionObserver` on the derived-type block.
  - The result content schema and layout wait for O4; until then the screen renders the `derived_type` block and the case-matrix CTAs (own: 다시하기; shared: 나도 테스트하기).
  - The codec decodes every legacy URL forever, and the v1 encoder emits the same format.
- **Recovery view.** Rendered in place for unknown or blocked variants (§5.3). It is in the reader's locale, has at least one forward path (to the landing) and shows up to two incomplete-test cards. Those cards come from a client island reading `vt:run:*`, not from the server.
- **Unknown paths.** They never reach `[locale]`: aliases redirect, allowlisted locale-less paths negotiate, and everything else falls through to `global-not-found.tsx`. That file renders its own document with `app.css` and the bootstrap, so it keeps the theme (F11).
- **Error boundaries.** `[locale]/error.tsx` keeps translations and theme; `global-error.tsx` renders its own document. Both are client nets, not server recovery.
- **No `notFound()` in `src/app/[locale]/**`.** One ESLint `no-restricted-syntax` rule scoped to that folder enforces it. Blog uses `redirect(getPathname({ href: '/blog', locale }))` for unknown posts; test uses the recovery view.

### 7.10 Metadata, manifest, icons, SEO

- **`[locale]/layout.tsx` metadata.** `generateMetadata` sets the title template, the description from messages, `openGraph.locale`, `alternates.canonical`, and `alternates.languages` for all 12 locales via `getPathname`. It adds `x-default` → `en`. `metadataBase` comes from `server/site.ts` (`VERCEL_PROJECT_PRODUCTION_URL`).
- **Viewport.** `export const viewport` takes `themeColor` light/dark from tokens exported at build (§9.4).
- **Manifests.** `[locale]/manifest.webmanifest/route.ts` is a static GET per locale: translated description and `start_url: /{p}`, with name and short name untranslated. The root `manifest.ts` keeps `start_url: /`.
- **Icons.** `icon.svg` plus `apple-icon.tsx`, rendered from one brand constant; the proxy matcher excludes `icon`, `apple-icon` and `opengraph-image`. `robots.ts` and `sitemap.ts` are new: the sitemap lists every static locale page with hreflang alternates and excludes `ask`, `result` and `debug` variants.

---

## 8. Motion and reduced motion

| Motion | Mechanism | Reduced motion |
|:--|:--|:--|
| Card ⇄ window ⇄ card, test → card on return | React `<ViewTransition>` share + `transitionTypes` (§5.5) | 160 ms fade (same `transitionTypes`, CSS under `[data-motion=reduced]`) |
| Window → full grow | CSS transition on `--win-*` | fade, 160 ms |
| Stage forward motion (I flood, J travel, D slide) | stage-owned canvas/CSS | D is the stage for every test (resolved at run start, frozen for the run); D uses 160 ms cross-fades |
| Deck spring, nudge, parallax, kinetic title, count-up | deck/field code | none; the field is static |
| Instruction modal, share sheet | `Overlay` CSS (460 ms / 380 ms) | opacity only, ≤ 180 ms |

Motion values are tokens in `tokens.css` (`--vt-dur-open`, `--vt-dur-close`, `--vt-dur-grow`, `--vt-dur-return`, `--vt-ease-out`, `--vt-ease-flood`, spring presets as documented constants). JS that needs them reads computed custom properties once at mount, so no duration exists twice.

---

## 9. Styling and the design system (Next-native part only)

### 9.1 CSS files and layers

```css
/* src/styles/app.css — the only stylesheet the root layout imports */
@layer reset, tokens, base, components, stages, transitions, state;
@import './tokens.css' layer(tokens);
@import './fonts.css' layer(base);
@import './base.css' layer(base);
@import './vt/shell.css' layer(components);
/* … other vt/*.css … */
```

- Stage CSS files declare `@layer stages { … }` and load with their chunk; the order was fixed in `app.css`, so chunk load order cannot change the cascade.
- Nothing is unlayered, so no stray rule outranks a component skin.
- `tokens.css` uses `light-dark()` for every theme-varying colour and sets `color-scheme` from `[data-theme]`. There is one declaration per token and no second dark block.
- Per-test palettes are **data**. `TestLayer`, `DeckCard` and `AskPage` set `--t-base`, `--t-hi`, `--t-c1`, `--t-c2`, `--t-glow`, `--t-deep` and `--t-tint` as inline custom properties from `palette`. The stages and the J world read the same values, so card and world cannot drift, which is what the mockup's `Shell.LOOK` achieved.
- The browser floor is iOS/Safari ≥ 17.5 and evergreen Chromium/Firefox, for `light-dark()`, `@layer`, `:has()` and `inert`; view transitions degrade to instant.

### 9.2 Why no Tailwind (AD-7)

| Option | Copies of a value | Trap family | Claude Design renders it as-is | Verdict |
|:--|:--:|:--|:--:|:--|
| Plain CSS + native layers + global `.vt-*` skins (chosen) | 1 | none specific | yes | chosen |
| Tailwind v4 utilities for layout + `.vt-*` skins | 1–2 (theme bridge) | layer precedence, class scanning of comments/markdown, emit order of breakpoints (governance L10, L25, L26) | no (utilities need compilation) | rejected: two idioms, three measured traps |
| CSS Modules | 1 | none specific | no (hashed class names) | rejected for skins; still fine for a one-off page layout if ever needed |

### 9.3 Fonts

- `fonts.css` `@import`s the dynamic-subset stylesheet shipped in the `pretendard` npm package, and Next rewrites its `url()`s to hashed `/_next/static/media` assets. There is no preload, per the legacy performance rule.
- The fallback stack covers the 12 locales, using system fonts for Devanagari, Cyrillic, Japanese and Chinese.
- The OFL text ships at `public/licenses/pretendard-OFL.txt`.
- **Rejected:** `next/font/local`, which cannot express per-slice `unicode-range` subsets, so it would ship the 2 MB variable font or require a custom subset pipeline.

### 9.4 Values needed outside CSS

`tokens.css` marks the few values needed at build time with `/* @export */`: canvas light/dark for `themeColor`, and brand ink and paper for icons and OG. `src/styles/exports.ts` parses those declarations and `next.config.ts` exposes them through `env`, so they are inlined at build.

- **Rejected:** hand-copied TS constants plus a parity test, the v2 failure mode.
- **Rejected:** a TS token source generating CSS (`critique.md` X3). It adds a generated file and a pre-dev build step for about four values, and Claude Design needs the CSS as authored.

### 9.5 Claude Design

Specimens are rendered from product components in a gallery route that exists only outside production. The gallery sits in a `(dev)` route group with its own root layout and returns `notFound()` when `VERCEL_ENV === 'production'`; this is outside `[locale]`, so the 404 rule is untouched. `design-system/export.mjs` captures each specimen with Playwright into static HTML that references the bundled `tokens.css` and `vt/*.css`, and pushes it one way to a new "VIVE Design System v3" project (`design-system.md` §5.5). The detailed specimen list belongs to the design-system proposal; this architecture only guarantees that the files Claude Design receives are the files the app runs.

---

## 10. Build, deploy, CI

- **`next.config.ts`:**
  - `reactCompiler: true` (F21): cleaner components with no manual memoisation, and the lint preset reports compiler rule breaks.
  - `experimental: { globalNotFound: true, viewTransition: true }`.
  - `env` from `styles/exports.ts`.
  - `poweredByHeader: false`.
  - Absent: `typedRoutes` (next-intl `pathnames` types every link), `cacheComponents` (F12), `images` (no raster images), and any custom webpack configuration.
- **`vercel.json`.** It carries the production freeze until launch: `git.deploymentEnabled.main = false` plus a production `ignoreCommand` (`git-deploy.md` §4.2). Rebuild branches get preview deployments. Launch is the commit that removes both keys.
- **Environment.** Only the O2 store credentials, provisioned by the Vercel Marketplace integration (one approval, then zero recurring actions), and nothing else. `.env*.local` stays ignored.
- **CI** (`.github/workflows/ci.yml`, free minutes on a public repo) runs on pushes to `claude/**` and `main`:
  - `npm ci` → `lint` → `typecheck` (`next typegen && tsc --noEmit`) → `test` (vitest) → `build`;
  - Playwright against `next start` on `mobile-webkit` (primary), `mobile-chromium` and `desktop-chromium`;
  - a `visual` job in the official Playwright Linux container with `updateSnapshots: 'none'` (F22) for about 20 key surfaces. Local runs skip pixel assertions.
- **Toolchain pin.** `packageManager` and `engines.node` in `package.json` make local, CI and Vercel resolve the lockfile identically. TypeScript is 5.9.x for the foundation, known-good with `next build` type-checking in 16.x. TypeScript 7 is a separate upgrade unit once Next documents support for it (npm `latest` is 7.0.2, F1).

---

## 11. Testing strategy

### 11.1 Unit (vitest, node environment unless a file opts into `happy-dom`)

- Every `src/domain` rule, named by its spec rule ID. This covers the consent matrix exhaustively, entry classification × timeout, advance-one, retention, frontier, progress incl. pre-answer, eligibility, qualifier token concatenation, type segment, the legacy result-payload fixtures (decode forever), the ten error branches, largest remainder and palette contrast math.
- `src/i18n/entry.ts` decision table: every alias, the allowlist and duplicate prefixes. The proxy composition is also tested by calling `proxy()` with `NextRequest` objects for the `Accept-Language` cases `ko-KR`, `zh-TW`, `zh-HK`, `zh-MO`, `zh-CN` and `pt-BR`.
- `src/content/validate.ts` over the real catalogue, plus palette invariants per test: text contrast ≥ 4.5:1, neighbours ≥ 3:1, luminance caps.
- Component tests only where a hook's contract is subtle (`use-input-gate`, `use-test-run` event mapping).

### 11.2 E2E (Playwright; the measured record of behaviour)

| Area tag | Covers |
|:--|:--|
| `@window` | open/close by all four paths; Q1 → grow → modal; wordmark return to the same card; deep link starts full; from-result opens full and back returns; prefetch warmed; landing `inert` while open |
| `@test` | direct cold/resume/ingress; advance-one after revisit; previous mark; last question selected; submit gating; 150 ms lock; arrival-guard input suite (19 patterns × touch/mouse × WebKit/Chromium) on all three stages; 3/4 answers through the `debug` demo tests; reduced motion → D |
| `@consent` | the instruction matrix rows on rendered CTAs; Esc writes nothing; catalogue filtering pre-paint (no flash) and post-hydration; analytics mount only on `OPTED_IN`; telemetry request bodies validated against `Batch` |
| `@share` | `?ask` sheet open/close by back; clipboard link shape; vote without JS (`javaScriptEnabled: false` context); duplicate vote rejected; tally percentages |
| `@i18n` | all 12 locales render the landing and a test; number formatting varies per locale; `<html lang>` is the BCP 47 tag; hreflang set; aliases redirect |
| `@errors` | server HTML via `request.get` (no JS): unknown path → 404 with a non-empty document; unknown variant → recovery with a forward link; invalid result payloads → error view; `/apple-icon`, `/icon.svg`, `/kr/manifest.webmanifest` → 200 |
| `@a11y` | axe on key screens in both themes; focus order in modal; 44 px targets; every gesture's button/keyboard alternative |

The E2E suite also crawls every internal link from each static page per locale and asserts 200 or 3xx, which replaces the legacy route-table citation guard with behaviour.

### 11.3 Static checks (at most two file-system reads)

1. `vercel.json` still carries both freeze keys while the freeze is active; the test is deleted in the launch commit.
2. `src/middleware.ts` does not exist (single request entry).

Everything else is ESLint (boundaries, banned imports, `notFound` in `[locale]`, raw storage) or the type system (messages parity by `satisfies`, content shape).

---

## 12. Traceability

### 12.1 Legacy requirement groups (`contracts.md` §4) → modules

| § | Requirement | Where it lives | How it is proven |
|:--|:--|:--|:--|
| 4.1 | Route surface | `src/app/[locale]/**` + `i18n/routing.ts pathnames` | E2E link crawl; typed `Link` hrefs |
| 4.1 | Pages under `[locale]`; root owns document + lang | `[locale]/layout.tsx` is the root layout (AD-2) | `@i18n` html lang |
| 4.1 | Exactly one locale prefix; duplicates 404 | next-intl `localePrefix: always`; no route for `/kr/kr/x` | `@errors` |
| 4.1 | Single request entry, no business state | `src/proxy.ts` (routing only) | static check 2 |
| 4.1 | Locale-less allowlist (`/blog`, `/blog/x`, `/history`, `/test/x`) | `i18n/entry.ts decideEntry` | unit table + `@errors` |
| 4.1 | Paths only through a route builder | next-intl `navigation.ts` + ESLint ban on `next/link` | lint |
| 4.1 | Blog list/detail; invalid → blog index | `[locale]/blog/[post]/page.tsx` `redirect()` | E2E |
| 4.1 | Test route hosts instruction/qualifier/runtime; invalid → recovery, no session | `test/[variant]/page.tsx` + intercept + `Recovery` (§5.3) | `@errors`, `@test` |
| 4.1 | Result route; arrival by `replace` | `result/[variant]/[type]/page.tsx`; `useTestRun.submit` | `@test` |
| 4.2 | Locale set; product codes canonical for URL/storage/telemetry | `routing.ts` locales + prefixes; `productLocale()` | unit |
| 4.2 | Accept-Language normalisation (`ko*`, zh script/region) | next-intl best fit + cookie | proxy unit cases |
| 4.2 | BCP 47 / common aliases redirect | `entry.ts` aliases, resolved before next-intl (F9) | unit + E2E |
| 4.2 | Display `<html lang>` BCP 47 | `lang={locale}` (internal locale is BCP 47) | `@i18n` |
| 4.2 | UI message model, key parity × 12 | `src/messages/*.ts satisfies Messages`; next-intl `AppConfig` | `tsc` |
| 4.2 | Content localisation with default fallback | `content/project.ts` (`en` fallback per string) | unit |
| 4.2 | Instruction body per variant; CTAs/notes from messages | `TestSource.instruction` (required by validation) + `messages.test.*` | content validation |
| 4.2 | Locale number formatting | next-intl `useFormatter`/`getFormatter` with BCP 47 locale | `@i18n` 12-locale assertion |
| 4.3 | Consent state machine; SSR `UNKNOWN`; persisted in/out | `client/prefs.ts` + bootstrap; key `vivetest-telemetry-consent` | unit + `@consent` |
| 4.3 | Send only when `OPTED_IN`; opt-out drops queue + ids | `client/telemetry.ts` | unit + `@consent` |
| 4.3 | Analytics gated by the same source | `features/consent/GatedAnalytics.tsx` | `@consent` |
| 4.3 | Catalogue filtering by consent/attribute | `domain/catalog.visibleCards` + CSS pre-paint rule | unit + `@consent` |
| 4.3 | Instruction consent × attribute × ingress matrix | `domain/instruction.planInstruction` + `InstructionModal` | exhaustive unit + `@consent` |
| 4.3 | Esc never writes; no-op on instruction step | `plan.escape` + `Overlay` key handling | `@consent` |
| 4.3 | Recall re-opens same UI; close keeps choice; opted-out notice | `features/consent/ConsentPanel.tsx`, `ConsentNotice.tsx` (surface design O4) | E2E when built (R7) |
| 4.4 | Event set, common + per-event fields, index semantics | `domain/telemetry.ts` schemas; emission in `use-test-run` event mapping | unit + `@consent` body checks |
| 4.4 | Payload hygiene; reject legacy fields | `.strict()` schemas | unit |
| 4.4 | Anonymous id without weak fallback | `client/telemetry.ts` | unit |
| 4.4 | `POST /api/telemetry` 400/204 | `app/api/telemetry/route.ts` + `after()` | E2E request |
| 4.4 | Retention | `server/telemetry-sink.ts` with O2 | decision |
| 4.4 | Gaps: share events, N-ary `choice`, stage identity | schema additions in §7.8 | unit |
| 4.5 | Key registry | `client/keys.ts` | lint ban on raw storage |
| 4.5 | Key changes are contract changes | kept keys vs reset run keys recorded in `keys.ts` docblock + DECISIONS entry | review |
| 4.5 | Safe storage, degraded mode | `client/storage.ts` | unit (throwing `setItem`) + E2E with storage blocked |
| 4.5 | Theme preference, pre-paint bootstrap | `client/bootstrap.ts` + `prefs.useTheme` | E2E no-flash |
| 4.5 | Variant scoping of cleanup | `run-store.remove(variant)` removes `vt:run/staged/seen` for that variant only | unit |
| 4.6 | Variants & attributes; enterable = available/opt_out | `domain/catalog.ts`, `content/schema.ts` | unit |
| 4.6 | Source topology (Sheets) | repo-owned content (O3); optional importer | — |
| 4.6 | Canonical index vs scoring order vs Q label | `domain/question.ts`; `QuestionView.canonicalIndex/scoringOrdinal` | unit |
| 4.6 | Answer model | 2–4 answers structurally; binary scoring only (`validate.ts`) | content validation |
| 4.6 | Scoring / derivation / type segment | `domain/scoring.ts` | unit |
| 4.6 | Qualifiers (egtt) in the instruction overlay | `ProfileQuestionSource`, `planInstruction.steps`, `InstructionModal` | unit + `@test` |
| 4.6 | Response projection | answers carry `pole` in content; lookup in `scoring.ts` | unit |
| 4.6 | Entry paths; runtime entry commit; staged entry | `domain/entry.ts`; `run-store` staged key | unit + `@test` |
| 4.6 | `instructionSeen` lifecycle | `planInstruction.recordsSeen` + `vt:seen:{v}` | unit |
| 4.6 | Answer lock + auto-advance; no 다음 | `use-input-gate` + `reduce` | `@test` |
| 4.6 | Revisit mark (text, not `aria-checked`) | `markFor` + `PrevMark` | `@test` + axe |
| 4.6 | Navigation destination = advance one (owner) | `reduce` answer branch | unit |
| 4.6 | Answer retention | `reduce` | unit |
| 4.6 | Progress bar + %, never "N of M" | `progress()` + `Rail` (`role=progressbar`) | unit + `@a11y` |
| 4.6 | Eligibility & completion | `isEligible` | unit |
| 4.6 | 30-min session, judged at re-entry | `isExpired` + `classifyEntry` | unit |
| 4.6 | Volatility & cleanup incl. result commit | `submitted` event → `run-store.remove` | unit + `@test` |
| 4.6 | Result URL & payload; untrusted, ordered validation | `domain/result.ts` + result page | unit (legacy fixtures) + `@errors` |
| 4.6 | History (list-only, 50, newest first, abandoned at read) | `domain/history.ts` + `client/history-store.ts` + `HistoryList` | unit + E2E |
| 4.6 | Recovery pages | `features/recovery/Recovery.tsx` rendered in place | `@errors` |
| 4.6 | 404 never inside `[locale]` | proxy fall-through + `global-not-found.tsx` + ESLint ban | `@errors` server HTML |
| 4.6 | Content integrity; no partial activation | build-time `validate.ts` (runtime branch removed) | unit gate |
| 4.7 | Locale manifest | `[locale]/manifest.webmanifest/route.ts` + matcher entry | `@errors` 200 |
| 4.7 | Per-locale metadata, canonical, 12 hreflang | `[locale]/layout.tsx generateMetadata` | `@i18n` |
| 4.7 | Static brand OG; no text | `[locale]/opengraph-image.tsx` | E2E 200 |
| 4.7 | Icons from one brand definition; proxy lets them through | `icon.svg`, `apple-icon.tsx`, matcher exclusion | `@errors` |
| 4.7 | robots / sitemap (previously undefined) | `robots.ts`, `sitemap.ts` | E2E |
| 4.7 | Vercel Analytics + Speed Insights consent-gated | `GatedAnalytics` | `@consent` |
| 4.7 | Admin analytics | out of v1 | — |
| 4.8 | 44 px targets, visible focus, semantic triggers, stable names | `ui/Button`, `--tap-min`, focus ring token, `.vt-*` skins | `@a11y` |
| 4.8 | Keyboard independent of width/input; Esc closes expansions | stage `keyboard` declaration; `Overlay`; layer keydown | `@a11y`, `@window` |
| 4.8 | Dialogs trap focus and return it | `Overlay` (inert + Tab wrap + return target) | `@a11y` |
| 4.8 | Reduced motion keeps fades | `[data-motion=reduced]` single source | `@test` |
| 4.8 | Contrast ≥ 4.5:1 | palette math unit tests + axe + visual job | unit + `@a11y` |
| 4.8 | Every gesture has a tap/button alternative | `StageProps.onAnswer`/`onNavigate` + declared keyboard map | `@a11y` |

### 12.2 Prototype structures → modules

| Prototype structure (`prototype.md`) | Product module |
|:--|:--|
| Window = expanded card hosting the stage (§1.2) | `@window/(.)test/[variant]` + `TestLayer` window mode + `DeckCard` `Link` |
| postMessage protocol (§2.1) | props/routing, table in §5.2 |
| Host state machine rest→opening→open→growing→full→returning | route (open/return via view transitions) + `TestLayer` phase `window \| growing \| full` |
| Preload after 350 ms settle; 3 s fallback Q1 | `router.prefetch` + `preloadStage`; `loading.tsx`; stage error boundary |
| Hand-off record `vive-handoff`, return record `vive-landing-return` | gone: same document; `launch.ts` in memory; staged entry persisted only for reload |
| Shell chrome API `Shell.chrome(...)` | `ShellChrome` props; `anchors.setPrevX` for J |
| Palette rail y (I, J) / story bar x (D) | `Rail axis` from `StageModule.railAxis` |
| Instruction sheet → centred modal with consent note, egtt two steps | `InstructionModal` over `Overlay center` + `planInstruction` |
| `stageFor` override > reduced → D > default map; J 2-answer only | `domain/stage.resolveStage`; content validation for J; no override in product |
| `TEST_COLORS` + `LOOK` single palette source | `TestSource.palette` + `domain/palette.look` → `--t-*` custom properties |
| I curated pairs, `genSet`, `legible()`; D OKLCH steps; J world luminance | `content` per-answer `color` + `domain/palette.{answerColors, storySteps, legible}`; stage J reads palette |
| Badges A–D, previous mark, votes line, `.vt-q`, `.vt-qlabel` | `features/test/{AnswerBadge, PrevMark, VotesLine}` + `styles/vt/answer.css` |
| "White surface = answer" rule | only `.vt-answer` skins get white surfaces; questions use `.vt-q`/`.vt-qlabel` |
| 150 ms lock; J arrival guard 350 ms | `use-input-gate` (§7.5) |
| Advance-one revisit | `domain/run.reduce` |
| 3/4-answer demo tests (`예시`) | `attribute: 'debug'` demo content, never listed |
| Share sheet (ask / path / palette), coach label, link first then 9:16 | `features/share/ShareSheet` (`?ask` URL state), `story-card.ts` |
| Friend page `v-vote.html` | `[locale]/ask/.../[shareId]/page.tsx` + `castVote` + `AskStore` |
| Simulated votes | `GET /api/ask/{shareId}` real tallies |
| Deck: swipe browses, flick/threshold, rubber band, nudge, ←/→ | `features/landing/Deck.tsx` |
| Living field WebGL + CSS fallback, grain | `features/landing/Field.tsx` + `field/shader.ts`; grain tile generated once on the client |
| List section below the stage | `CatalogList` (server) |
| GNB transparent → solid | `features/landing/Gnb.tsx` |
| Reduced motion → D, fades only | bootstrap `data-motion` + `resolveStage` + CSS |
| Phone column `--app-w: min(100vw, 430px)` | `tokens.css` app column tokens; all fixed layers use them (O1) |

---

## 13. Foundation (what the first commit on the new `main` contains)

The foundation plan lands as one squash commit S on top of legacy history, with production frozen by `vercel.json` inside S (`git-deploy.md` §4, `critique.md` S2–S3). Before S, and outside it: legacy `next` is patched and deployed so the frozen build is patched (`critique.md` G2); the legacy tag and branch are pushed; the prototype is captured to its own ref after the peer publishes V4 (`critique.md` G5); the freeze probe is run.

S contains exactly:

1. **Repository hygiene**: `.gitignore` (keeps `.env*.local`, build outputs, never ignores snapshot folders), `package.json` + `package-lock.json` (pinned: `next@16.3.6`, `react`/`react-dom@19.3.x`, `next-intl@^4.14`, `zod@^4.6`, `pretendard@1.3.9`, `@vercel/analytics`, `@vercel/speed-insights`, `server-only`, `client-only`; dev: `typescript@5.9.x`, `eslint` + `eslint-config-next@16.3.6`, `vitest`, `@playwright/test@1.63`, `@axe-core/playwright`, `happy-dom`; `packageManager`, `engines.node`), `tsconfig.json` (strict, `noUncheckedIndexedAccess`, `@/*` → `src/*`), `README.md` (short).
2. **Config**: `next.config.ts` (§10), `eslint.config.mjs` (boundaries §6.2, bans, `notFound` in `[locale]`), `vitest.config.ts` (`src/**/*.test.{ts,tsx}`), `playwright.config.ts` (fixed project names `mobile-webkit`, `mobile-chromium`, `desktop-chromium`, `visual`; `snapshotPathTemplate`; preview server; `updateSnapshots: 'none'` in CI), `vercel.json` (freeze), `.github/workflows/ci.yml`.
3. **Contracts**: `AGENTS.md` (≤ ~150 lines, derived facts only, refs table incl. legacy tag/branch, Ask-First list incl. `src/proxy.ts`, root layout, `src/i18n/routing.ts`, `src/styles/tokens.css`, `src/client/bootstrap.ts`, `vercel.json`, `.github/workflows/**`, `design-system/**`), `.claude/CLAUDE.md` (pointer), `.claude/settings.json`, `docs/DECISIONS.md` (fresh, `AD-` prefix; AD-1…AD-10 of this document), `docs/spec/{domain,platform,privacy-telemetry,content,experience,sharing}.md` restating the requirements and prototype decisions as numbered rules, `docs/design/system.md` (names only, no values).
4. **Platform skeleton, real, not stubs**:
   - `src/proxy.ts`, `src/i18n/{routing,entry,request,navigation}.ts`, `src/messages/*.ts` (12 locales, chrome keys for the skeleton);
   - `src/app/[locale]/layout.tsx` with bootstrap, metadata, viewport and `PageFrame`;
   - `src/app/[locale]/page.tsx`, which renders the real catalogue as a plain list of test links;
   - `src/app/[locale]/@window/{default.tsx,(.)test/[variant]/{page.tsx,loading.tsx}}` and `src/app/[locale]/test/[variant]/page.tsx`, rendering a minimal `TestLayer` that shows title and Q1 in both modes with open/close/return wired;
   - `src/app/{global-not-found,global-error}.tsx`, `src/app/[locale]/error.tsx`, `src/app/{manifest.ts,robots.ts,sitemap.ts,icon.svg,apple-icon.tsx}`, `src/app/[locale]/manifest.webmanifest/route.ts`;
   - `src/app/api/telemetry/route.ts` (validate → 204, sink drops).
5. **Styles**: `src/styles/{app.css,tokens.css,base.css,fonts.css,exports.ts}` with the paper layer, app column, motion tokens and layer order, plus `public/licenses/pretendard-OFL.txt`.
6. **Content and client infrastructure**:
   - `src/content/{schema,catalog,project,validate}.ts` + `src/content/tests/*.ts` for the current catalogue (qmbti, energy-check, egtt, creativity-profile as `unavailable`, the two `debug` demo tests) + `src/content/blog/*.ts`. Values are taken from the requirements and the prototype's `content.js`; the known defects are flagged in DECISIONS for O3, not silently fixed.
   - `src/domain/{ids,views,catalog,stage,palette,telemetry}.ts` with tests (what the skeleton uses);
   - `src/client/{storage,keys,bootstrap,prefs,layer-store,launch}.ts`.
7. **Tests**:
   - unit tests for the entry decision table, content validation, palette math and telemetry schemas;
   - E2E specs `@errors`, `@i18n` and `@window` (skeleton level);
   - the two static checks of §11.3.

**Spikes that must be green before S lands** (each becomes an E2E or unit test; none is a comment):

| # | Question | Pass condition |
|:--|:--|:--|
| S1 | Intercept page rendering and prefetch | Record whether the intercept payload is prerendered; prefetch on settle makes the window open without a network wait on a warm cache |
| S2 | 404 surfaces | `curl` of `/nope`, `/kr/nope`, `/xx/test/a`, `/kr/kr/x`: status 404, non-empty `global-not-found` document with the stylesheet link |
| S3 | View transitions | card ⇄ window share morph on push and `router.back()` in WebKit and Chromium; record whether popstate animates |
| S4 | next-intl integration | `Link` forwards `onNavigate` and `transitionTypes`; `ko-KR → /kr`, `zh-TW/HK/MO → /zt`, `zh-CN → /zs`; cookie rewrite from legacy `kr` value |
| S5 | CSS pipeline | Pretendard package CSS resolves under Turbopack; `light-dark()` + `@layer` survive the production CSS minifier; stage CSS loaded late stays in `@layer stages` |
| S6 | Overlay | `inert` background + Tab wrap + container focus behaves identically in WebKit and Chromium; Esc pressed twice stays a no-op |

---

## 14. Roadmap

| Step | Scope | Depends on | Exit criteria |
|:--|:--|:--|:--|
| R0 Separation | Patch legacy `next` and verify its production deploy; tag + branch the legacy tip; freeze probe; capture the final prototype to its own ref after the peer's V4 notification; record the artifact URL | peer V4 publish (capture only) | Legacy production on a patched build; tags on `origin`; probe outcome recorded; prototype ref pushed |
| R1 Foundation (lands as S) | §13 | R0 | CI green on all jobs; spikes S1–S6 pass as tests; production fingerprint unchanged after S; no Vercel production deployment for S |
| R2 Domain core | All of `src/domain` (run, entry, instruction, scoring, result codec, history, ask) + `run-store`, `history-store`, `telemetry` client | R1 (spec rules written) | Every rule ID in `docs/spec/domain.md` has a passing unit test; legacy result URLs from the requirements decode |
| R3 Design system v3 base | `tokens.css` final values after rendering the prototype with Pretendard in light/dark at 360/390/430 (`critique.md` G6); `vt/*` skins for shell, overlay, answer, rail; palettes for current tests; gallery + export + Claude Design v3 push | R1; prototype final values | Palette invariants and rendered-contrast tests green; Claude Design file set equals the bundle manifest |
| R4 Test experience (full mode) | `TestLayer` full, `useTestRun`, `ShellChrome`, `InstructionModal`, stage D, then I, then J; submit → result commit → minimal result route; telemetry emission | R2, R3 | `@test` and `@consent` green on `mobile-webkit` and `mobile-chromium`, including the input suite on all stages and reduced motion → D |
| R5 Landing and window | `Deck`, `Field`, `CatalogList`, `Gnb`, consent notice; window mode, grow, view transitions, prefetch, return; landing `inert` | R4 | `@window` green (all lifecycle rows of §5.2); WCAG 2.2.2 behaviour verified; landing LCP/CLS within the budget set in `docs/spec/platform.md` |
| R6 Sharing | Share sheet (`?ask`), story card, friend page, `castVote`, `AskStore` adapter, tally route, static OG per question, share telemetry | O2 decision; R4 | `@share` green incl. no-JS vote and duplicate rejection; OG files generated at build for every (locale, variant, question) |
| R7 Remaining surfaces | Result content (O4 round), consent banner + recall panel, menu/locale/theme controls, blog, history, privacy notice (O6), desktop presentation (O1) | O1, O4, O6; R5 | Each surface's E2E and axe checks green; no `debug` content reachable from any list |
| R8 Launch | Remove the freeze keys and their static check; production deploy; retire stale project memory notes | R5–R7, owner go | Production serves the rebuild; legacy result URLs still resolve; fingerprint changed exactly once |

---

## 15. Risks

1. **Interception quirks beyond the three designed out.** Examples: prefetch caching keyed by `Next-Url`, or a Next minor changing slot restoration. Mitigation: the `@window` E2E rows run on every landing, and the layer's behaviour depends only on documented facts F2–F5 plus the URL.
2. **Popstate might not animate.** If a browser-back restore is not a Transition, the window closes instantly on system back; every other close path animates. This is accepted if S3 shows it, and recorded in the experience spec.
3. **Static generation of the intercept route is unverified.** If it renders per request, each window open costs a function invocation on Hobby. Mitigation: `loading.tsx` plus settle-prefetch keeps it fast; costs are watched with O2.
4. **`next/root-params` and next-intl `prefixes` are recent features.** A regression would surface at build (S4). The fallback is `setRequestLocale` in layouts and pages, a mechanical change.
5. **Browser floor.** `light-dark()` and `inert` need Safari ≥ 17.5. Older iOS visitors would get the light palette and a non-inert background behind modals. Acceptable for a 2026 launch; the floor is recorded in the platform spec.
6. **Satori and CJK in static OG images.** A Korean question needs a subset of a non-variable font inside the 500 KB image budget. Build-time generation with a per-locale subset is planned; if the subsets are too big, the question OG falls back to the test colour + title art (still static).
7. **React Compiler interplay** with imperative canvas code in stages. Stage modules keep canvas logic outside components; if the compiler bails on a component, the lint preset reports it.
8. **Deleting legacy runtime fallbacks relies on build-time validation.** Content invalidity is caught only if every content change passes CI. The Vercel production build runs `next build` only, so a content file edited directly on `main` without CI could ship. Mitigation: the Ask-First list covers `src/content/**` for direct `main` commits; all work lands through the squash workflow, which runs the gate.
9. **The window pushes a history entry on open,** not on the Q1 answer as the prototype author suggested. Analytics page views count window opens as test views. This is recorded in the experience spec so it is not "fixed" later by accident.
10. **Owner decisions O1–O7** gate R6–R8, not R1–R5.

---

## 16. Owner decisions and the seams that wait for them

| Decision (`critique.md` §5) | Seam in this architecture | Default until decided |
|:--|:--|:--|
| O1 desktop | app column tokens; no desktop code | centred 430 px column, keyboard/pointer parity |
| O2 sharing infra + telemetry sink + domain | `AskStore`, `TelemetrySink`, `server/site.ts` origin | in-memory store in preview/E2E; sink drops; `vivetest.vercel.app` |
| O3 content source, content fixes, launch locales | `src/content/**`; optional importer | repo-owned files; defects flagged, not fixed |
| O4 result page, B0 surfaces | `features/result`, `features/consent/ConsentPanel`, blog/history features | minimal result (derived type + CTAs) |
| O5 residual conflicts | `domain` rules (history scope, 5 s loading, N-ary scoring, unavailable tap toast) | list-only history; no 5 s loading; binary scoring; toast |
| O6 legal identity | `[locale]/privacy/page.tsx`, consent note link | page drafted, identity fields left for the owner |
| O7 visibility/licence | `LICENSE`, where the prototype capture lives | no licence file added by an agent |
