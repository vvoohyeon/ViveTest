# ViveTest rebuild — final target architecture

Written 2026-09-26. This is the merged architecture for the from-scratch rebuild. It takes the strongest parts of the three proposals (`design/arch-domain-core.md` = DC, `design/arch-next-native.md` = NN, `design/arch-design-system-first.md` = DSF), adds every graft the three judges required (`design/judge-maintainability.md` = JM, `design/judge-fidelity.md` = JF, `design/judge-feasibility.md` = JX), corrects every claim they found wrong, and resolves each disagreement explicitly. Appendix A records each graft and correction with its disposition. Nothing under `/Users/woohyeon/Local/ViveTest` or the prototype scratchpad was modified. Framework behaviour this design depends on was checked in this session with context7 and the npm registry (§4.7). Facts the judges verified by reading the installed Next.js 16.2.4 source are labelled as such and are re-run as spikes on the pinned 16.3.6.

Inputs are only the prototype (`understand/prototype.md`, `peer-handoff-2026-09-26.md`, `MOCK/` sources) and the legacy requirements as classified in `understand/contracts.md` §4. The stack traps in `understand/governance.md` §2 are used as design knowledge: this document picks structures under which a trap cannot occur, and ports no guard. Abbreviations: `C§4.x` = `contracts.md` §4.x; `P§x` = `prototype.md` §x; `MD` = `mess-diagnosis.md`; `L##` = a governance stack lesson; `REQ-T`/`REQ-L` = the legacy `req-test.md` / `req-landing.md`; I/J/D = the split / forks / story stages; `{l}` = a product locale code; `{v}` = a variant id.

---

## 0. Decision summary

### 0.1 Which base, and why

| Proposal | JM | JF | JX | Aggregate | Carried into the final design |
|:---|:---:|:---:|:---:|:---:|:---|
| DC (domain core) | 7 | 8 | 8 | **23** | Domain semantics (run/gate transition table, brands, total derivation, trust-boundary codecs, `structureHash`, legacy-compatible result codec and storage keys) and the window mechanism (a client layer over the mounted landing, driven by the History API) |
| NN (Next-native) | 8 | 7 | 5.5 | 20.5 | The thin-layer skeleton (flat `domain/`, `server-only`/`client-only` markers, colocated tests, one `tsconfig`), zod telemetry, typed message catalogues, the sharing stack (no-JS vote form, static per-question OG, client share id), SEO completions, `vercel.json` freeze, CI hygiene |
| DSF (design-system first) | 6.5 | 6 | 4 | 16.5 | The UI and design-system layer (pure `ui/` views, one plain-CSS entry with layers, concrete `data-theme`, `data-motion`, `paletteScope()`/`coverStyle()`, native `<dialog>`, `StageModule`, `InputGate`, specimens and the Claude Design bundle) |

The base is **DC's semantics and window inside NN's skeleton, rendered through DSF's design system**. The judges disagreed on one load-bearing question, the window. JM ranked NN first on the assumption that a presence snapshot could keep the stage visible during an exit from an intercepting route (JM G3). JX then verified from the installed Next source that a slot prop is an `OuterLayoutRouter` that renders the current tree (JX V3), and that every `router.back()`-driven close is a `popstate` traversal for which React skips View Transition animations (JX V4, JF V4). Under interception, the owner-approved "shrink back into the same card with its content visible" (P§1.2, owner round 3 「네 잘 고쳐졌습니다」) is therefore impossible on every back-driven exit. The facts decide the question, so the window follows DC and JX. JM's objections to DC are answered structurally rather than by choosing the intercept: DC's engine and ports layer is collapsed into one session module (JM G10), the History API is touched by exactly one module (§4.4), and the second content transport is one static route fed by the same projector as the page (§4.4.6).

### 0.2 Architecture decisions (these seed `docs/DECISIONS.md`)

| ID | Decision | Rejected alternative and why |
|:---|:---|:---|
| AD-01 | The window is a client layer over the mounted landing. Card open pushes `/{l}#{v}`, answering Q1 replaces it with `/{l}/test/{v}`, and every exit calls `history.back()`. A `popstate` listener is the single place that closes or shrinks the window (§4.4). | Parallel + intercepting route: interception fires from every page under `[locale]` (JX V1), an exit cannot keep old slot content on screen (JX V3), `popstate` exits are never animated (JX V4), and a child `generateStaticParams` under root `dynamicParams=false` turns unknown ids into 404s (JX V7). View Transitions: a second animation system that snapshots a live stage and does not animate `popstate`. |
| AD-02 | `client/history-bridge.ts` is the only module that calls `history.pushState`, `replaceState` or `back` (enforced by ESLint). It owns a small marker protocol shared by the window and the share sheet. | Several history owners, which is the L43/L53/L59 trap family. Overlays that own no entry, which breaks the surviving a11y rule that system back closes overlays without leaving the page (C§8.5 A-a11y, JF V8). |
| AD-03 | Product codes (`kr`, `zs`, `zt`, …) are the `[locale]` segment and the only locale identity in URLs, storage, cookies and telemetry. `displayTag()` maps them to BCP 47 for `<html lang>` and for next-intl's formatting locale. A pure, owned `routeRequest()` implements the legacy normalisation table. | NN's BCP 47 internal locales with prefix rewrites: the proxy must run on every request including prefetches (JX V10), there are two locale vocabularies, the legacy `NEXT_LOCALE=kr` cookie stops matching, and library best-fit negotiation diverges from the legacy table (JF). Product codes as next-intl locales: next-intl specifies BCP 47 tags (§4.7 F9), and `Intl` reads `kr` as Kanuri. |
| AD-04 | next-intl is used for messages and ICU formatting only: no middleware, no `defineRouting`, no `createNavigation`. All paths are built by `lib/routes.ts` and checked by Next `typedRoutes`. | next-intl navigation as the route builder (JM G6): it assumes next-intl owns routing, which AD-03 rejects. |
| AD-05 | Unknown or non-enterable variant ids are redirected by the proxy to `/{l}/test/error?variant={id}`, and unknown blog slugs to `/{l}/blog`, using the enterable-id and slug sets imported from `content/catalog.ts`. Test and blog pages are fully static. | Rendering recovery in place (NN, JM G2): with root `dynamicParams=false` and child `generateStaticParams` it 404s (JX V7), and it drops the legacy redirect contract (C§4.1, JF). On-demand pages without `generateStaticParams`: one function invocation per hard load under Hobby caps, and a behaviour that rests on an undocumented route-wide flag. |
| AD-06 | All business rules live in a flat, pure `src/domain/`. The run and the gate are one `step(state, event, ctx) → { state, effects }` whose transition table is normative in `docs/spec/domain.md` (§5.9). | Business state in React reducers (NN): an effect-drained event list runs twice under StrictMode and drops events under batching (JX). A state-only reducer (DSF): it leaves side effects unplaced. |
| AD-07 | Effects run synchronously inside `dispatch` of one client module, `client/run-session.ts`. It is memoised per open, boots on first subscribe and is read through `useSyncExternalStore`. | DC's engine, ports, effect executor, composition root and three `tsconfig` projects: a mini-framework for five small machines (JM). A `useEffect` event mapper: StrictMode double runs. |
| AD-08 | Validation happens only at four trust boundaries (URL, storage, network, content build), with one codec each. Content compiles at build and reports every error at once, and the runtime never re-validates it. | Lazy runtime validation, per-variant fallbacks and defensive checks in components: the "accumulated defensive code" the owner ruled out. |
| AD-09 | Styling is plain CSS with native cascade layers and one entry file (`src/ui/index.css`) that also imports stage CSS. `data-theme` is a concrete attribute written before paint, with one dark block. `data-motion` is the single reduced-motion source. | Tailwind v4 (L10/L25/L26 and a second idiom); CSS Modules (hashed names cannot be shown as static specimens); `light-dark()` (Safari 17.5 floor for in-app WebViews); stage CSS in dynamic chunks (a second loading path, §4.7 F12). |
| AD-10 | Overlays use one native `<dialog>` primitive that stays mounted and is driven by an `open` prop. The instruction modal owns no history entry. The share sheet owns one same-URL entry through the history bridge. | NN's `?ask=1` query state (a second URL shape for UI state); portalled overlays (L40); a share sheet with no entry, which lets system back abandon the test (JF V8, owner 「공유 전/후 테스트 이탈되지 않도록」). |
| AD-11 | A stage is a `StageModule`: meta, a React view, pure `railColor`/`chromeTone`, a handle and a `PrevPort`. It is loaded by dynamic `import()` and preloaded when the deck settles. One `InputGate` primitive is armed at a per-stage point. | An imperative shell API; per-stage guards; DSF's global 350 ms guard (the owner experienced it only on J). |
| AD-12 | If the stage is late, the window shows a skeleton. After 3 s without `onReady`, or on a content-fetch or chunk error, it shows a fallback Q1 composed from `ui/answer` primitives. Answering the fallback stages the landing answer and hard-navigates to the page host. | Dropping the fallback (NN, JM G24): the prototype author's build note keeps it (「늦으면 스켈레톤, 실패하면 기본 Q1」). A second full Q1 renderer: the fallback reuses story-stage answer primitives and the staged-entry hand-off. |
| AD-13 | Motion uses CSS transitions and WAAPI with no animation library. There are two registers, paper and stage; overshoot is limited to manipulation settle and entrances. `PopStateEvent.hasUAVisualTransition` skips our animation when the browser already animated a swipe-back. | `motion`/framer-motion (a dependency for effects the prototype built in a few KB); View Transitions for the window (AD-01). |
| AD-14 | Answers are an ordered list of 2–4 options. Every scoring option declares its pole in content, and `binary_majority` counts poles. This is the interim semantics until O5. A `forks` stage on a test with any question of more than 2 options fails the build. | A 2-only schema (contradicts 「유연한 구조」); a silent J→I fallback (overrides the owner's per-test choice invisibly); inventing category scoring before a real N-ary test exists. |
| AD-15 | Content is repo-owned typed TypeScript in `src/content/`, compiled at build (recommendation for O3, §8.3). | Sheets at runtime; a content JSON API; runtime validation. |
| AD-16 | Tests: vitest in a node environment, colocated `*.test.{ts,tsx}`. Playwright projects `mobile-webkit` (primary), `mobile-chromium` and `desktop-chromium` against the production server. Pixel baselines exist only for specimens, only in the CI Linux container, with an agent-dispatchable regeneration workflow. There are two file-system static checks; everything else is ESLint, stylelint, `tsc` or behaviour. | jsdom component tests (L39); Markdown-reading guards; host-bound baselines (MD Rule 11). |
| AD-17 | Six normative documents: `docs/spec/{domain,platform,privacy-telemetry,experience,sharing}.md` plus `docs/design/system.md`. `AGENTS.md` has at most 150 lines, and `DECISIONS.md` is the record. | A seventh `content.md` spec (content compile rules are domain rules, JM G25); traceability JSON. |

---

## 1. Principles

1. **Two inputs only.** The prototype decides design and interaction, and the legacy requirements decide behaviour. No legacy code, guard, ledger entry or defensive pattern is ported. *(Owner mandate, 2026-09-25T17:52Z.)*
2. **One home per rule and per value.** Every rule and every value has one home, and the other places link to it or import it. *(MD D2/D3: rules in six to nine places, 12 false statements that passed every guard; MD Rules 4 and 7.)*
3. **Structure over guards.** A boundary is enforced by the compiler, `server-only`/`client-only` markers, ESLint or stylelint, never by a test that reads text. At most two file-system static checks exist. *(MD D6: 29% of unit-test files read the repo as text; MD Rule 10.)*
4. **Validate at trust boundaries, nowhere else.** The boundaries are URL, storage, network and content build. A value that crossed a codec is typed and never re-checked. *(Owner: 「누적된 방어코드가 없이」.)*
5. **Rules are data transitions, and effects happen in one place.** Transitions are pure functions and effects are plain data executed by one module. React holds only presentation state. *(Legacy rules scattered across hooks, and StrictMode double effects.)*
6. **The framework owns what it can.** The app adds infrastructure only where the framework cannot express a requirement, and names it in one module: the window's history protocol in `client/history-bridge.ts`. *(JM K2: in-house infrastructure is the largest maintenance cost.)*
7. **Mobile-first by construction.** The phone column is the only layout until O1 is decided. There is no hover-only path and no desktop shell code. *(MD Rule 12, D9: 23% of legacy landing code was desktop residue.)*
8. **One gate, few hermetic pixels.** `lint → lint:css → typecheck → test → build → e2e` runs identically in CI and locally. Pixel baselines are few and render only in the CI container. *(MD Rule 11, D6: 117/123 baselines red after an OS update.)*
9. **The design system is code-first.** Claude Design receives a bundle generated from the files the app runs. *(MD Rule 8, D8: 11 artifacts per token decision.)*
10. **Zero recurring owner actions.** The owner decides; agents do the labour, including landing, Claude Design pushes, baseline regeneration and content edits. *(Global orchestration rules.)*

---

## 2. Stack and styling mechanism

### 2.1 Packages (exact pins for the foundation)

Versions were read from the npm registry in this session.

| Package | Pin | Why |
|:---|:---|:---|
| `next` | `16.3.6` | Fixes GHSA-vcvr-r3jv-pc5j (`next/og`, affected `>=16.2.0 <16.3.6`). `next/root-params` is on by default from 16.3. Turbopack builds. |
| `react`, `react-dom` | `19.3.0` | The version Next 16.3.6 targets (`^19`). `<ViewTransition>` is stable but deliberately unused (AD-01). |
| `next-intl` | `^4.14.7` | Messages and ICU formatting only (AD-04). It reads the locale through `next/root-params`, so no `setRequestLocale` is needed. |
| `zod` | `^4.6.5` | The one schema tool for trust-boundary codecs (telemetry, storage records, vote input, result payload). A schema is both type and validator. |
| `server-only`, `client-only` | `0.0.1` | A build error when server code reaches the client bundle or the reverse. |
| `@vercel/analytics`, `@vercel/speed-insights` | `^2.0.x` | Consent-gated (C§4.3). |
| `pretendard` | `1.3.9` | Dynamic-subset CSS, imported by `ui/fonts.css` (spike SP-4). Licence text ships in `public/licenses/`. |
| dev `typescript` | `5.9.3` | `typescript-eslint` 8.70 requires `<6.1`. npm `latest` is 7.0.2, which becomes a separate upgrade unit. |
| dev `eslint` | `9.39.x` | `eslint-config-next@16.3.6` pulls `eslint-plugin-react`/`import`/`jsx-a11y`, whose peer ranges stop at ESLint 9. |
| dev `eslint-config-next` | `16.3.6` | Next and React hooks rules. |
| dev `typescript-eslint` | `^8.70` | Typed lint rules. |
| dev `stylelint` | `^17.15` | Class pattern, no hex outside `tokens.css`, no `!important`, and one inline "every rule is layered" plugin (§3.4). |
| dev `vitest` | `^5.0.2` | Node environment. Requires Node `^22.12 ‖ ^24`. |
| dev `fast-check` | `^4.10` | Property tests for codecs, advance-one, retention and tally percentages. |
| dev `@playwright/test` | `1.63.0` | E2E. The same version pins the CI container image. |
| dev `@axe-core/playwright` | `^4.13` | a11y assertions. |
| dev `tsx` | latest 4.x | Runs `scripts/design-bundle.ts`. Added with the first specimen, not in the foundation. |
| toolchain | `engines.node: "24.x"`, `packageManager: "npm@<lockfile version>"` | Local, CI and Vercel resolve the lockfile identically. |

### 2.2 Styling mechanism

- **Plain `.css` files, each wrapped in a named cascade layer.** Layer order is declared once in `src/ui/index.css`: `@layer reset, tokens, base, components, stages, preferences;`. `index.css` imports every stylesheet in the app, including `src/stages/*/stage.css`. It is imported by the root layout and by the two self-rendered documents (`global-not-found.tsx`, `global-error.tsx`, L12).
- **Class names** are `vt-<block>` and `vt-<block>__<element>`. States and variants are attributes (`data-state`, `data-tone`, `data-axis`, `aria-*`). Per-instance values are custom properties set in `style`. JS writes only custom properties and attributes, never layout.
- **Why a single entry.** CSS from a dynamically imported chunk is injected at load time outside the initial route stylesheet (§4.7 F12). Putting stage CSS in the one entry removes that second loading path. The budget is ≤ 20 KB gzip for all CSS, reported in CI.
- **Themes.** The bootstrap writes a concrete `data-theme="light" | "dark"` before paint. CSS has one `:root[data-theme="dark"]` block. Worlds (posters, stages, the friend page) are theme-independent; paper surfaces follow the theme.

### 2.3 Deliberately not used

| Not used | Why |
|:---|:---|
| Tailwind CSS | Its layer, class-scanning and emit-order traps (L10, L25, L26) and a second idiom. Utilities also cannot be rendered byte-for-byte in Claude Design. |
| CSS Modules, CSS-in-JS | Hashed names cannot be shown as static specimens, and CSS-in-JS has a runtime cost. |
| `light-dark()` | Safari 17.5 floor (JM V7). The friend vote page opens in iOS in-app WebViews that run the OS engine. |
| next-intl middleware, `defineRouting`, `createNavigation` | AD-03, AD-04. |
| Parallel and intercepting routes; `<ViewTransition>` for the window | AD-01. |
| An animation library (`motion`), a state library (XState, Redux, Zustand) | The prototype built every motion in a few KB. Five small machines are plain reducers. |
| React Compiler (`reactCompiler`), `cacheComponents` | Imperative canvas code inside stages carries compiler risk (JX). `cacheComponents` forbids `dynamicParams`/`dynamic` segment config, which AD-05 relies on (NN F12). Both can be revisited as isolated upgrade units. |
| jsdom / happy-dom component tests | Real history, focus, portals and dialogs are what matter here (L39). React behaviour is asserted in real browsers. |
| Experimental `viewTransition` flag | Removed as inert in Next canary (JM V2), and unused anyway. |
| A monorepo or packages workspace | One app, one deploy. ESLint and markers give the isolation. |

---

## 3. Directory tree, layers and dependency rules

### 3.1 The finished app

```text
/
├─ AGENTS.md                     repo contract (≤150 lines, derived facts only)
├─ README.md  LICENSE(O7)        LICENSE only after the owner picks one
├─ .claude/{CLAUDE.md, settings.json}
├─ .github/workflows/
│  ├─ ci.yml                     gate on push to claude/** and main; visual job in the Playwright container
│  └─ visual-baselines.yml       workflow_dispatch: regenerate specimen baselines in the same container, commit to the given branch
├─ vercel.json                   production freeze until launch (removed in the launch commit)
├─ package.json  package-lock.json  tsconfig.json  next.config.ts
├─ eslint.config.mjs  stylelint.config.mjs  vitest.config.ts  playwright.config.ts
├─ docs/
│  ├─ DECISIONS.md               why, and what was rejected (AD-*, then later entries)
│  ├─ spec/{domain,platform,privacy-telemetry,experience,sharing}.md   normative, rule IDs DOM-/PLT-/PRV-/EXP-/SHR-
│  ├─ design/system.md           design-system spec: principles, token NAMES, component anatomy, push procedure
│  ├─ plans/  done/              lifecycle by location
├─ public/licenses/pretendard-OFL.txt
├─ scripts/design-bundle.ts      specimens → .design-bundle/ (arrives with the first ui block specimen)
├─ tests/
│  ├─ repo.test.ts               the two static checks (vercel.json freeze keys; no src/middleware.ts)
│  └─ e2e/{*.spec.ts, support/}  Playwright, tagged @smoke @window @test @consent @share @i18n @errors @a11y; specimens/ spec later
└─ src/
   ├─ proxy.ts                   single request entry: routeRequest() adapter
   ├─ i18n/                      locale model (pure core + one server adapter)
   │  ├─ locales.ts              LOCALES, isLocale, displayTag, resolveAlias, negotiate            [pure]
   │  ├─ entry.ts                routeRequest(): the whole proxy policy                            [pure]
   │  └─ request.ts              next-intl getRequestConfig via next/root-params                   [server]
   ├─ messages/{en,kr,zs,zt,ja,es,fr,pt,de,hi,id,ru}.ts   UI chrome copy, `satisfies Messages`, file name = product code
   ├─ lib/routes.ts              THE path builder: test, card(#v), result, ask, blog, history, recovery   [pure]
   ├─ domain/                    PURE business rules (zod allowed; no react/next/DOM/clock/random)
   │  ├─ ids.ts                  brands, AnswerKey A–D, Result
   │  ├─ content-model.ts        authoring types + defineTest(); compiled Test model types
   │  ├─ compile.ts              compileContent(): every CNT rule incl. palette invariants → Result<Content, Error[]>
   │  ├─ views.ts                serialisable view types crossing server → client (CardView, TestView, …)
   │  ├─ catalog.ts              attributes, isEnterable, visibleCatalog, hiddenByConsent, recoveryCards
   │  ├─ scoring.ts              completeness → CompleteResponses; derive() (total); type segment
   │  ├─ records.ts              RunRecord, StagedEntry, HistoryEntry + zod codecs (storage trust boundary)
   │  ├─ entry.ts                classifyEntry (ingress / resume / cold), 7-min staged expiry, 30-min run expiry, structureHash
   │  ├─ gate.ts                 gateSpec(), GATE_EFFECTS, qualifier steps
   │  ├─ run.ts                  RunState, RunEvent, Effect, step()
   │  ├─ view.ts                 view(): RunView (progress, option states, frontier, eligibility, canAsk)
   │  ├─ consent.ts              decide(), transmission(), recall(), parseStoredConsent()
   │  ├─ telemetry.ts            zod Event union (type = validator), drafts, finalize()
   │  ├─ result.ts               legacy-compatible codec, resolveResultView() + error codes
   │  ├─ history.ts              list-only history, status computed at read
   │  ├─ stage.ts                resolveStage(test, motion)
   │  ├─ palette.ts              look(), answerColors(), storySteps(), legible(), toneFor(), contrast(), invariant checks
   │  └─ share.ts                ShareId, VoteInput (zod), percentages() (largest remainder)
   ├─ content/                   SERVER-ONLY product data
   │  ├─ catalog.ts              the ONE ordered catalogue: { kind, id|slug, attribute } (also read by the proxy)
   │  ├─ tests/<id>.ts           one test per file: stage, palette, meta, 12-locale text, questions, qualifier
   │  ├─ blog/<slug>.ts          articles
   │  ├─ results/<id>.ts         result copy per type segment (O4)
   │  ├─ load.ts                 compile once (memoised); throws the formatted error list → build fails
   │  └─ project.ts              per-locale projections: projectCatalog, projectTest, projectBlog (en fallback)
   ├─ server/                    SERVER-ONLY infrastructure
   │  ├─ site.ts                 site origin from Vercel env
   │  ├─ telemetry-sink.ts       TelemetrySink (null sink until O2)
   │  ├─ vote-store.ts           VoteStore interface + adapter chosen by env (in-memory for dev/E2E; managed store with O2)
   │  └─ actions/vote.ts         'use server' castVote
   ├─ client/                    CLIENT-ONLY infrastructure
   │  ├─ storage.ts              KeyValue that never throws; degraded flag
   │  ├─ keys.ts                 every storage key (3 legacy names kept, the rest vt1:)
   │  ├─ bootstrap.ts            inline pre-paint script source: data-theme, data-motion, data-consent, theme-color
   │  ├─ prefs.ts                consent / theme / motion stores (useSyncExternalStore over html[data-*])
   │  ├─ telemetry.ts            queue, consent gate, anonymous id, beacon transport
   │  ├─ history-bridge.ts       the ONLY caller of history.pushState/replaceState/back; marker protocol
   │  ├─ run-session.ts          openRunSession(): dispatch = step → store → effects → notify
   │  ├─ run-history.ts          run-history store (test:runHistory)
   │  ├─ test-view.ts            prefetch + cache of TestView JSON for the window
   │  └─ announce.ts             polite live-region message store
   ├─ ui/                        PURE VIEWS + the design system (no next, next-intl, client, content, features)
   │  ├─ index.css  tokens.css  base.css  fonts.css
   │  ├─ palette-scope.ts        paletteScope() (the one --t-* emitter), coverStyle() (the one poster mesh)
   │  ├─ motion.ts               readDuration() (from CSS custom properties), spring integrator
   │  ├─ shell/                  TopBar, Rail (y|x), BottomBar (이전, 제출)
   │  ├─ answer/                 Badge, PrevMark, Question, QuestionLabel, AnswerPill, VotesLine
   │  ├─ overlay/                Dialog (native <dialog>, center|bottom), Toast, Coach
   │  ├─ instruction/            InstructionCard (head, body, landing-answer row, consent note, CTAs, qualifier step)
   │  ├─ share/                  ShareBody, StoryCardFrame, ShareDone
   │  ├─ deck/                   PosterCard, SoonCard, EndCard, DeckControls, PositionReadout, Cover
   │  ├─ window/                 WindowFrame (surface, header band, skeleton, fallback slot)
   │  ├─ landing/                Gnb, ListSheet, ListRow, FieldFallback
   │  ├─ paper/                  Button, PageHead, Notice, Banner, EmptyState, Chip, LinkRow, SkipLink, LiveRegion
   │  └─ vote/                   VoteChoices, VoteResults
   │                             each block: <block>.tsx + <block>.css [+ <block>.specimen.tsx from the DS step on]
   ├─ stages/                    the three stages (react + ui + contract; no next, client, content, features)
   │  ├─ contract.ts             StageProps, StageHandle, StageModule, InputGate, PrevPort
   │  ├─ loaders.ts              loadStage(kind), preloadStage(kind): one chunk per stage
   │  ├─ split/  (I)             stage.tsx, engine.ts (seam drag, flood), colors.ts, stage.css
   │  ├─ forks/  (J)             stage.tsx (signs, gate), engine.ts, world.ts (canvas projection), camera.ts, colors.ts, stage.css
   │  └─ story/  (D)             stage.tsx (cards, peeks, lock card, pills), engine.ts (pointer track, edge zones), colors.ts, stage.css
   ├─ features/                  composition with behaviour (the only place that combines client/, ui/, stages/, next)
   │  ├─ landing/                Landing, Deck + use-deck.ts, Field + field-gl.ts, CatalogList, ConsentNotice
   │  ├─ window/                 WindowHost, window-machine.ts (pure), choreography.ts (WAAPI), FallbackQ1
   │  ├─ test/                   TestExperience, StageHost, ShellChrome, InstructionDialog, input-gate.ts, use-run-session.ts
   │  ├─ share/                  ShareSheet, story-card.ts (canvas 9:16), use-share.ts
   │  ├─ vote/                   VotePage, VoteForm
   │  ├─ result/  recovery/  history/  blog/
   │  ├─ consent/                GatedAnalytics, ConsentPanel (O4 surface)
   │  └─ chrome/                 LiveRegionHost, ThemeColorSync
   └─ app/                       routes only: resolve params, load a projection, render a feature (§4.1)
```

Unit tests sit beside their files (`src/domain/run.test.ts`). `domain/` files hold one concept each, typically 80–300 lines. The ~500-line planning stop from the legacy contract carries over as a repo rule in `AGENTS.md`.

### 3.2 Layers: what may import what

| Directory | May import | Must not import or touch |
|:---|:---|:---|
| `domain/` | `zod`, `domain/` | `react`, `next*`, `next-intl`, every other `src/` directory; the globals `window`, `document`, `navigator`, `location`, `history`, `localStorage`, `sessionStorage`, `fetch`, `crypto`; the properties `Date.now`, `Math.random` |
| `i18n/locales.ts`, `i18n/entry.ts`, `lib/routes.ts` | `domain/ids`, each other, `content/catalog` (entry only) | the same bans as `domain/` |
| `content/` | `domain/` | `react`, `client/`, `ui/`, `stages/`, `features/`, `app/` (`import 'server-only'`) |
| `server/` | `domain/`, `content/`, `next/server`, `next/headers`, vendor SDK | `client/`, `ui/`, `stages/`, `features/` (`import 'server-only'`) |
| `client/` | `domain/`, `lib/routes` | `content/`, `server/`, `ui/`, `stages/`, `features/`, `app/` (`import 'client-only'`) |
| `ui/` | `react`, `ui/`, `import type` from `domain/` | `next*`, `next-intl`, `client/`, `content/`, `server/`, `stages/`, `features/`, `app/` |
| `stages/` | `react`, `ui/`, `stages/`, `import type` from `domain/` | `next*`, `next-intl`, `client/`, `content/`, `server/`, `features/` |
| `features/` | `domain/`, `client/`, `ui/`, `stages/`, `lib/routes`, `server/actions/*`, `next/link`, `next/navigation` (except `notFound`), `next-intl` | `content/`, other `server/*` |
| `app/` | everything | business logic; `notFound` anywhere under `app/[locale]/**` |
| `proxy.ts` | `i18n/entry`, `next/server` | everything else |

### 3.3 Global rules that are not import directions

| Rule | Reason | Mechanism |
|:---|:---|:---|
| `history.pushState`, `replaceState`, `back`, `forward`, `go` only in `client/history-bridge.ts` | AD-02 | ESLint `no-restricted-properties` |
| `localStorage` / `sessionStorage` only in `client/storage.ts` | L52; one never-throwing writer | ESLint `no-restricted-globals` + `no-restricted-properties` |
| No `router.refresh()` and no Server Action import under `features/{window,test,share}/**` and `stages/**` | While windowed, the URL is the test path over the landing tree, so a refetch would swap trees (JX G14) | ESLint `no-restricted-syntax` + `no-restricted-imports` |
| No template-literal or string-literal paths in `href`, `router.push/replace/prefetch` outside `lib/routes.ts` | One path builder | ESLint `no-restricted-syntax` selectors on `JSXAttribute[name.name='href']` and `CallExpression[callee.property.name=/^(push|replace|prefetch)$/]` |
| No `notFound` under `app/[locale]/**` | L51: a 404 inside `[locale]` ships an empty body | ESLint `no-restricted-imports` scoped to that folder |
| No hex colour literal in TS except `content/**`, `stages/*/colors.ts`, `app/brand.ts` | Colours are tokens or palette data | ESLint `no-restricted-syntax` on `Literal[value=/^#[0-9a-fA-F]{3,8}$/]` |
| No hex, no `!important`, class pattern `^vt-`, no unlayered rule in CSS | AD-09 | stylelint: `color-no-hex` (except `tokens.css`), `declaration-no-important`, `selector-class-pattern`, one inline plugin `vt/layered` (~20 lines in `stylelint.config.mjs`) |
| No `useFormatter`/`getFormatter` numbers or dates with a hand-built locale | AD-03: formatting locale is always `displayTag()`, which next-intl already holds | none needed: next-intl's configured locale is the display tag, so the default call is correct |
| `src/middleware.ts` must not exist | Single request entry | static check in `tests/repo.test.ts` |

### 3.4 How the rules stay cheap

- **Boundaries:** one `eslint.config.mjs` with one flat-config block per directory (`files: ['src/domain/**']`, …), using only ESLint core rules (`no-restricted-imports`, `no-restricted-globals`, `no-restricted-properties`, `no-restricted-syntax`). There is no boundaries plugin and no custom rule package.
- **Server/client split:** `import 'server-only'` and `import 'client-only'` make a wrong import a build error.
- **Everything else** is `tsc` (message parity by `satisfies`, content shape, typed routes, brands) or a behavioural test.
- **Text-reading tests:** exactly two, both in `tests/repo.test.ts`. No guard reads Markdown.

---

## 4. Routing and the window

### 4.1 The route tree

```text
src/app/
├─ [locale]/                                   locale = product code
│  ├─ layout.tsx          ROOT layout. <html lang={displayTag(locale)} suppressHydrationWarning>; inline bootstrap;
│  │                      ui/index.css; NextIntlClientProvider; SkipLink; LiveRegionHost; GatedAnalytics; ThemeColorSync.
│  │                      generateStaticParams = LOCALES; dynamicParams = false; generateMetadata (description, canonical,
│  │                      12 hreflang + x-default, og:locale = display tag); viewport.
│  ├─ page.tsx            landing (static): <Landing cards={projectCatalog(l)} /> with <WindowHost/>
│  ├─ error.tsx           client error net (keeps translations and theme)
│  ├─ opengraph-image.tsx static brand card per locale
│  ├─ manifest.webmanifest/route.ts           static per-locale manifest (translated description, start_url /{l})
│  ├─ test/[variant]/page.tsx                 page host (static; generateStaticParams = enterable ids for this build's audience)
│  ├─ test/error/page.tsx                     recovery (static; ?variant= kept by the redirect, never read or shown)
│  ├─ result/[variant]/[type]/page.tsx        dynamic (reads the keyless query payload)
│  ├─ ask/[variant]/[question]/opengraph-image.tsx      static per (locale, variant, scoring question), enum params only (O2)
│  ├─ ask/[variant]/[question]/[share]/page.tsx         dynamic friend vote page (O2)
│  ├─ blog/page.tsx  blog/[slug]/page.tsx     static; unknown slugs never arrive (proxy)
│  ├─ history/page.tsx                        static shell, client list
│  └─ privacy/page.tsx                        (O6)
├─ api/
│  ├─ telemetry/route.ts                      POST: Batch.safeParse → 400 | 204, after(() => sink.write())
│  ├─ test-view/[locale]/[variant]/route.ts   GET, force-static, generateStaticParams, dynamicParams = false: TestView JSON
│  └─ ask/[share]/route.ts                    GET tally, no-store (O2)
├─ global-not-found.tsx    full document; imports ui/index.css + bootstrap itself (L12)
├─ global-error.tsx        full document; imports ui/index.css itself
├─ manifest.ts  robots.ts  sitemap.ts  icon.svg  apple-icon.tsx  brand.ts
src/proxy.ts
```

There is no parallel slot, no interception marker and no route group. The descendant-interception trap (JX V1), `beforeFiles` shadowing of static siblings (JX V5, JM V5), `default.tsx`, slot rendering-mode parity and stale slots (JM V6) therefore have nothing to apply to. `test/error` can stay a static sibling of `test/[variant]`, and the legacy redirect address (C§4.1) is kept unchanged.

### 4.2 Rendering modes

| Route | Mode | Why |
|:---|:---|:---|
| `/{l}`, blog, history shell, recovery, manifest, test-view JSON, brand OG | static per locale (and per id) | No request-dependent input. Consent and theme are applied before paint. |
| `/{l}/test/{v}` | static for this build's enterable ids | SSR renders the shell and the stage ground in `booting`. The session boots from storage after mount. |
| `/{l}/result/{v}/{type}` | dynamic | The payload is in the query. A server-side decode gives "no partial render" by structure. |
| `/{l}/ask/…/[share]` | dynamic | Live tally and voter cookie. The form works without JS. |
| Ask OG images | static at build from enum params | No request value reaches `ImageResponse` (GHSA precondition impossible). |
| `/api/telemetry`, `/api/ask/{share}` | functions | writes / live reads |

"Audience" is fixed per build: `process.env.VERCEL_ENV !== 'production'` includes `debug` tests (the 3- and 4-answer demo tests) as enterable. Production builds never list or serve them.

### 4.3 The proxy

`src/proxy.ts` is an adapter around one pure decision, `routeRequest()`, in `src/i18n/entry.ts`:

```ts
// src/i18n/entry.ts — pure; unit-tested as a decision table
export interface KnownIds { readonly enterable: ReadonlySet<string>; readonly blog: ReadonlySet<string> }
export type RouteDecision =
  | { readonly kind: 'pass'; readonly setLocaleCookie?: Locale }
  | { readonly kind: 'redirect'; readonly location: string; readonly status: 307 | 308 };
export function routeRequest(r: {
  readonly pathname: string; readonly search: string;
  readonly cookie?: string; readonly acceptLanguage?: string; readonly known: KnownIds;
}): RouteDecision;
```

| Input | Decision | Requirement |
|:---|:---|:---|
| `/` | 307 → `/{negotiate(cookie, Accept-Language)}` | C§4.2 |
| First segment is an alias (`/ko`, `/zh-Hans`, `/en-US`, `/jp`, `/zh-TW`, …) | 308 → canonical code + rest, with the rows below applied to the result so there is never a double redirect | C§4.2 (region subtags stripped right to left; `zh-tw/hk/mo → zt`) |
| Locale-less path on the allowlist (`/blog`, `/blog/{slug}`, `/history`, `/test/{v}`) | 307 → `/{negotiated}{path}` | C§4.1 |
| `/{l}/test/{id}` with `id ∉ known.enterable ∪ {'error'}` | 307 → `/{l}/test/error?variant={id}` | C§4.1, REQ-T §3.2 (no session created) |
| `/{l}/blog/{slug}` with `slug ∉ known.blog` | 307 → `/{l}/blog` | C§4.1 |
| Valid prefix | pass, refreshing `NEXT_LOCALE` with the product code if it differs | C§4.2 |
| Anything else | pass; the route table renders `global-not-found` outside `[locale]` | C§4.6 404 rule |

```ts
// src/proxy.ts
import { NextResponse, type NextRequest } from 'next/server';
import { routeRequest, KNOWN } from '@/i18n/entry';   // KNOWN = sets derived from content/catalog.ts at module load
export function proxy(req: NextRequest) {
  const d = routeRequest({ pathname: req.nextUrl.pathname, search: req.nextUrl.search,
    cookie: req.cookies.get('NEXT_LOCALE')?.value, acceptLanguage: req.headers.get('accept-language') ?? undefined, known: KNOWN });
  if (d.kind === 'redirect') return NextResponse.redirect(new URL(d.location, req.url), d.status);
  const res = NextResponse.next();
  if (d.setLocaleCookie) res.cookies.set('NEXT_LOCALE', d.setLocaleCookie, { path: '/', sameSite: 'lax' });
  return res;
}
export const config = {
  matcher: [{
    source: '/((?!api|_next/static|_next/image|_vercel|icon|apple-icon|opengraph-image|.*\\..*).*)',
    missing: [{ type: 'header', key: 'next-router-prefetch' }, { type: 'header', key: 'purpose', value: 'prefetch' }],
  }],
};
```

The proxy runs on Node (Next 16, not configurable) and holds no business state. Prefetches skip it (§4.7 F10). That is safe because every in-app link is built by `lib/routes.ts` from compiled content, so a prefetch can only target a known id. `content/catalog.ts` holds only `{ kind, id | slug, attribute }`, so importing it keeps the proxy bundle small; test bodies live in `content/tests/*` and are never imported by the proxy.

### 4.4 The window

#### 4.4.1 What it is

The landing (`/{l}`) stays mounted. `WindowHost` (a client component on the landing page) renders `TestExperience` for the opened card inside the card's expanded frame, which is Q1 drawn by the stage (P§1.2). Answering Q1 grows the same element to full screen while the stage keeps moving. Every exit shrinks or closes the same live element, so content stays visible throughout (owner principle 10). The page host (`/{l}/test/{v}`) renders the same `TestExperience` full-screen. There is one experience with two hosts; only the exit behaviour differs.

#### 4.4.2 History marker protocol (AD-02)

```ts
// src/client/history-bridge.ts — the only module that calls history.*
export type Marker =
  | { readonly vt: 1; readonly kind: 'window'; readonly v: VariantId; readonly phase: 'open' | 'full'; readonly sheet?: true }
  | { readonly vt: 1; readonly kind: 'page'; readonly v: VariantId; readonly sheet?: true };
export interface HistoryBridge {
  current(): Marker | null;                               // our keys read from history.state; Next's __NA keys are left alone
  push(marker: Marker, url: string): void;                // goes through Next's patched pushState → usePathname follows
  replace(marker: Marker, url: string): void;
  back(): void;                                           // never animates; the pop listener does
  onPop(fn: (e: { readonly marker: Marker | null; readonly uaAnimated: boolean }) => void): () => void;  // uaAnimated = e.hasUAVisualTransition === true
}
export const historyBridge: HistoryBridge;
```

The rules this protocol imposes:

- **Every UI-initiated close calls `back()`.** The pop listener is the only place state changes. This gives one path for buttons and for system back, and it removes the counter bookkeeping of L43.
- **Marker content is the truth.** The window is `open` or `full` if and only if the current marker says so, and the share sheet is open if and only if `marker.sheet` is set.
- **No layer that owns an entry contains a navigating control.** This leaves L53 (`back()` cancelling a navigation started inside a layer) nothing to apply to. The share sheet only copies or shares. The friend preview renders inside the sheet.
- **Before hydration the card is a plain `<a href={routes.test(l, v)}>`.** A tap then is an ordinary navigation to the page host. An unpatched `pushState` can never happen, because an entry without `__NA` would make Next call `location.reload()` on pop (JX V6).

#### 4.4.3 Lifecycle, every path

| # | Trigger | History | Window state | Mechanism |
|:---|:---|:---|:---|:---|
| 1 | The deck settles on card `v` for 350 ms | — | rest | `testView.prefetch(l, v)` (JSON) and `preloadStage(resolveStage(v, motion))` |
| 2 | Tap or Enter on the card (hydrated) | push `/{l}#{v}`, marker `{window, open}` | rest → opening → open | `preventDefault` on the `<a>`. WAAPI clip-path open (580 ms). Landing `inert`. Stage in `presentation: window`. Skeleton (cover + sheen) until `onReady`. Announce 「… · 첫 질문」. |
| 3 | Tap before hydration | ordinary navigation | — | page host, full mode |
| 4 | No `onReady` within 3 s, TestView fetch failed, or stage chunk error | — | open (fallback) | `FallbackQ1` (`ui/answer` pills from the card's `q1` preview). Answering it dispatches `previewAnswer` (staged entry, `card_answered`), then `location.assign(routes.test(l, v))`. The page host boots as landing ingress. |
| 5 | 닫기, outside tap or Esc before answering | `back()` | open → closing → rest | Pop listener plays close (440 ms). Focus returns to the card CTA. |
| 6 | System back while open | `popstate` | open → closing → rest | Same path as 5. If `uaAnimated`, jump to the end state. |
| 7 | Q1 answered in the window | replace `/{l}/test/{v}`, marker `{window, full}` | open → growing → full | Session `previewAnswer` (staged entry, `card_answered`). Grow (520 ms) while the stage keeps its forward motion. Landing `aria-hidden`. The gate dialog opens once, when fully grown. |
| 8 | Wordmark, [거부하고 중단], or a close request at the gate | `back()` | full → shrinking → rest | Pop listener plays shrink (560 ms) into the same card with the live stage visible; the landing comes alive around it. Focus returns to the card. Announce 「… 카드로 돌아왔어요」. |
| 9 | System back while full | `popstate` | full → shrinking → rest | Same path as 8. If `uaAnimated`, jump to the end state. The run is persisted and resumable. |
| 10 | Forward after 5, 6, 8 or 9 | `popstate` to a marked entry | rest → open, or rest → full | Marker `open` reopens. Marker `full` reopens grown at the run's current question (the session resumes from storage). |
| 11 | Ask-a-friend icon | push the same URL, marker `{…, sheet: true}` | full + sheet | `Dialog placement="bottom"` opens. The stage's `InputGate` is disarmed. |
| 12 | Sheet close (button, outside tap, Esc, system back, Android back) | `back()` or `popstate` | full | The dialog closes because the marker has no `sheet`. Focus returns to the question block. Toast 「같은 질문으로 돌아왔어요」. |
| 13 | Submit (window or page) | `router.replace(resultHref)` | — | The landing (with its window host) unmounts. Back from the result goes to the page before the test (C§4.1). |
| 14 | Hard load of `/{l}/test/{v}` | — | — | Page host, full mode. The wordmark does `router.push(routes.card(l, v))` = `/{l}#{v}`, and the landing mounts centred on that card. [거부하고 중단] does `router.replace` to the same address, so Back does not return into an abandoned test. |
| 15 | Reload while the window is full | — | — | The URL is the test path, so the page host renders and the run is a direct resume. |
| 16 | Reload while the window is open (before Q1) | — | — | `/{l}#{v}`: the landing mounts centred on that card, with the window closed. |
| 17 | Link to a test from blog, history, result or recovery | ordinary soft navigation | — | Page host, full mode. No window exists on those pages, so nothing can open over the wrong screen. |

Every open ends in exactly one outcome: closed, full or fallback. This is REQ-L §13.3's terminal exclusivity with no route to wait for. The legacy 1600 ms destination-ready timeout becomes the 3 s stage-ready budget (EXP spec).

#### 4.4.4 The window machine

```ts
// src/features/window/window-machine.ts — pure; reacts to history, never causes it
export type WState =
  | { tag: 'rest' } | { tag: 'opening'; v: VariantId } | { tag: 'open'; v: VariantId; fallback: boolean }
  | { tag: 'growing'; v: VariantId } | { tag: 'full'; v: VariantId }
  | { tag: 'closing'; v: VariantId } | { tag: 'shrinking'; v: VariantId };
export type WEvent =
  | { type: 'tap'; v: VariantId } | { type: 'stageReady' } | { type: 'readyTimeout' } | { type: 'loadFailed' }
  | { type: 'q1Answered' } | { type: 'exitRequested' }                      // 닫기 · outside · Esc · wordmark · abandon → back()
  | { type: 'pop'; marker: Marker | null; uaAnimated: boolean } | { type: 'animationEnd' };
export type WEffect =
  | { type: 'push' | 'replace'; marker: Marker; url: string } | { type: 'back' }
  | { type: 'animate'; kind: 'open' | 'close' | 'grow' | 'shrink'; instant: boolean }
  | { type: 'landing'; inert: boolean; hidden: boolean } | { type: 'focus'; target: 'stage' | 'card' | 'question' }
  | { type: 'announce'; key: 'windowOpen' | 'testStart' | 'backToCard' } | { type: 'hardNavigate'; href: Route };
export function wstep(s: WState, e: WEvent): { readonly state: WState; readonly effects: readonly WEffect[] };
```

Properties unit-tested over every `WState × WEvent`: exactly one terminal per open; no effect while animating except `animationEnd`; `pop(null)` from `open` gives `closing`; from `full` it gives `shrinking`; `uaAnimated` turns an animation into an instant jump.

#### 4.4.5 Rules that come with the design (JX G14)

- **The URL is not the tree while windowed.** The URL is `/{l}/test/{v}` over the landing tree. Anything that refetches the current URL would swap trees: `router.refresh()`, a Server Action, `revalidatePath`. These are banned in `features/{window,test,share}/**` and `stages/**` (§3.3). Plain `fetch` (telemetry beacon, tally GET, test-view JSON) is fine. In development, a Fast Refresh of a server file can swap the tree; that is a dev-only inconvenience.
- **Telemetry `route` is a route template supplied by the host** (`/[locale]/test/[variant]` for run events, `/[locale]` for landing events). It is never read from `usePathname()`.
- **Landing code never derives state from `usePathname()`.** It reads the marker.

#### 4.4.6 Content transport for the window

- **One projector, two outputs.** `content/project.ts#projectTest(locale, id): TestView` is the only projection. The page host passes it as an RSC prop. `app/api/test-view/[locale]/[variant]/route.ts` (`dynamic = 'force-static'`, `generateStaticParams` over locales × enterable ids, `dynamicParams = false`) returns the same object as JSON, prerendered at build.
- **Q1 comes with the landing.** The landing's `CardView` carries each test's localized `q1` preview, so the fallback can draw Q1 with no fetch. The full `TestView` is fetched at deck settle (row 1) and is normally warm by the tap.
- **Deploy skew.** `TestView` carries `format: 1`. A client that receives a different format does `location.assign(routes.test(l, v))`, which is one line.
- **Rejected: all tests' full content in the landing payload.** It grows with the catalogue on a mobile first paint.
- **Rejected: a Server Action.** It violates §4.4.5.
- **Rejected: dynamic import of content modules.** Each chunk would carry all 12 locales, or content would need per-locale generated files.

### 4.5 404 and error policy

- **Nothing under `app/[locale]/**` can resolve a 404** (ESLint ban). Unknown locales are rejected by `dynamicParams = false` on the root layout. Unknown paths match no route. Both render `global-not-found.tsx`, a full document that imports `ui/index.css` and the bootstrap itself.
- **Unknown or non-enterable test ids and unknown blog slugs are redirected by the proxy** (§4.3), so a fully generated segment never sees an unknown param. Invalid result payloads render the in-page error branch with `data-result-branch={code}`.
- **`[locale]/error.tsx` and `global-error.tsx` are client-side nets only.** They draw after hydration, so they are not a server recovery.
- **Spike SP-1** (foundation) proves with server HTML (`request.get`, no JS) that `/zz`, `/zz/test/qmbti`, `/en/no-such` and `/kr/kr/x` return 404 with a non-empty, styled `global-not-found` body. **If `/en/no-such` instead renders inside `[locale]`**, the fallback is structural and needs no guard: `lib/routes.ts` exports its path patterns, `routeRequest` rewrites any `/{l}/…` that matches none of them to `/_unmatched`, and that path matches no route, so `global-not-found` renders. The pattern list has one home, so it cannot drift.

### 4.6 Rejected window designs, with the evidence

| Alternative | Why not | Evidence |
|:---|:---|:---|
| `[locale]/@window/(.)test/[variant]` + launch mark + URL-derived visibility (NN) | Every back-driven exit (닫기, Esc, outside tap, wordmark, abandon, system back) is a `popstate` traversal inside `startTransition`, and React skips View Transitions started from `popstate`, so every close is instant. The slot content is gone on pop, so no presence snapshot can keep it visible. Unknown ids under the intercept 404 through V7. `launch.take()` during render is unsafe under StrictMode. | JX V3, V4, V7; JF V4 (`app-router.js:281–301` in 16.2.4) |
| `(deck)` route group to scope interception (DSF) | `normalizeAppPath` drops groups and slots, so interception fires from every `/{l}/**` page. `test/error` is shadowed by `beforeFiles` rewrites. | JM V4/V5, JX V1 |
| Intercept at Q1 instead of at the tap | Two component instances across a remount, which needs a hand-off store for a running flood or camera move | DSF §8.3 |
| Hybrid: intercept for routing, landing-owned host for rendering | Still carries V1 (descendant interception), V7 and the launch-mark rules, and adds a store bridge between slot and host. More concepts than AD-01 for the same result. | this document |
| iframe + `postMessage` (the mockup) | Two documents, two bundles, and split focus and history | P§2.1 |

### 4.7 Framework facts relied on

"This session" means verified here with context7 (canary docs and source) or the npm registry. "Judge" means verified by a judge from the installed `next@16.2.4` source, not re-read here. Every fact is re-run as a spike on the pinned 16.3.6.

| # | Fact | Source | Used for |
|:---|:---|:---|:---|
| F1 | Native `history.pushState`/`replaceState` integrate with the App Router and sync `usePathname`/`useSearchParams` without a server request | this session: Next canary `linking-and-navigating.mdx` §Native History API, `single-page-applications.mdx` | AD-01 |
| F2 | Next's `HistoryUpdater` writes `__NA` plus the router tree into history state. A patched caller `pushState` has `__NA` and the tree copied into the caller's state. A `popstate` whose state has `__NA` restores the stored tree; one without it triggers `location.reload()`. | this session: canary `app-router.tsx` (`HistoryUpdater`, `preserveCustomHistoryState`); judge JX V6 (`app-router.js:233–305`, `restore-reducer.js`) | marker survival, the no-reload rule |
| F3 | The interception rewrite matches `Next-Url` against the normalised intercepting route plus `(?:/.*)?`; groups and `@slot` are dropped | judge JM V4, JX V1, JF V1 | rejection in §4.6 |
| F4 | Interception rewrites are `beforeFiles` | judge JM V5, JF V2 | rejection |
| F5 | A slot prop is an `OuterLayoutRouter` that renders the current tree from context | judge JX V3 | rejection (no presence snapshot) |
| F6 | `popstate` traversals run in `startTransition`, and React skips View Transition animations for them | judge JX V4, JF V4 | rejection; AD-13 |
| F7 | `dynamicParams=false` always yields `FallbackMode.NOT_FOUND` (`calculateFallbackMode`); the flag is AND-ed across all segments of a route | this session: canary `build/static-paths/app.ts`; judge JX V7 (`segments.every(...)`) | AD-05 |
| F8 | `next/root-params` in `getRequestConfig`; `setRequestLocale` is legacy | this session: next-intl `routing/setup.mdx`, `blog/nextjs-root-params.mdx`, `usage/configuration.mdx` | `i18n/request.ts` |
| F9 | next-intl locales are BCP 47 tags; custom `prefixes` are rewritten internally to the locale | this session: next-intl `usage/configuration.mdx` §Locale, `routing/configuration.mdx` §prefixes | AD-03 (display tag as next-intl locale; no next-intl routing) |
| F10 | Proxy matcher `missing: [{header next-router-prefetch}, {header purpose=prefetch}]` skips prefetches | this session: canary `proxy.mdx`, `content-security-policy.mdx` | §4.3 |
| F11 | `global-not-found.js` is experimental and intended for root layouts under a top-level dynamic segment | this session: canary `not-found.mdx` | §4.5 |
| F12 | CSS of a dynamically imported component is not in the route's entry stylesheets. It is injected as `<link precedence="dynamic">` during SSR, or appended to `<head>` at chunk load. | this session: canary `preload-chunks.tsx`, `get-css-inlined-link-tags.tsx`, turbopack `runtime-backend-dom.ts` | AD-09 single CSS entry |
| F13 | Route handlers with `generateStaticParams` (and `force-static`) are prerendered at build | this session: canary `generate-static-params.mdx`, `static-exports.mdx` | test-view JSON |
| F14 | Metadata routes (`opengraph-image`) always attempt build-time prerendering | this session: canary `export/routes/app-route.ts` | static ask OG |
| F15 | `typedRoutes` validates literal and template-literal hrefs; `next typegen` emits the route types | this session: canary `typescript.mdx` §Statically Typed Links | `lib/routes.ts` |
| F16 | A form bound to a Server Action works before JS loads (MPA action path renders full HTML) | this session: canary `action-handler.ts` | no-JS friend vote |
| F17 | `<dialog>` `cancel` fires on a close request (Esc, mobile back button, `requestClose()`). It may be non-cancelable, and MDN's pattern checks `if (!e.cancelable)`. | this session: MDN `htmldialogelement/cancel_event`, `button` (request-close) | §6.6, §6.7, spike SP-7 |
| F18 | `PopStateEvent.hasUAVisualTransition` reports a browser-provided back animation | this session: MDN `popstateevent/hasuavisualtransition` | AD-13 |
| F19 | React 19.3 (2026-09-09) made `<ViewTransition>` stable | judge JM V1, JF V3 | correction of DSF F11 (unused anyway) |
| F20 | `light-dark()` needs Safari 17.5 | judge JM V7 | AD-09 |
| F21 | Vercel Hobby: non-commercial; 1 M function invocations, 1 M edge requests, 4 active-CPU h, 50 k Web Analytics events per month | judge JX V11 | budgets §9.6 |
| F22 | npm: next 16.3.6, react 19.3.0, next-intl 4.14.7, zod 4.6.5, vitest 5.0.2 (Node ^22.12 ‖ ^24), @playwright/test 1.63.0. typescript-eslint 8.70 needs TS < 6.1. eslint-config-next's plugins peer ESLint ≤ 9. | this session: `npm view` | §2.1 |
| F23 | GHSA-vcvr-r3jv-pc5j affects `next/og` 16.2.0–16.3.5, fixed in 16.3.6 | `critique.md` §3 #8 | pin |

Spikes each run as a test with a pass condition. They are listed where they are due.

| Spike | Due | Pass condition |
|:---|:---|:---|
| SP-1 404 surfaces | foundation | Server HTML (no JS) of `/zz`, `/zz/test/qmbti`, `/en/no-such`, `/kr/kr/x`: status 404, non-empty body, stylesheet link present. Otherwise apply the §4.5 fallback. |
| SP-2 next-intl with a display-tag locale | foundation | `/kr` and `/de` render static, with no dynamic bail-out in the build log. `<html lang="ko">`. `getFormatter().number(15236)` gives `15,236` on `/kr` and `15.236` on `/de`. `useTranslations` works in a client component. |
| SP-3 proxy | foundation | `ko-KR → /kr`; `zh-TW`, `zh-HK`, `zh-MO → /zt`; `zh-CN → /zs`; `/ko/x → /kr/x`; `/en/test/nope → /en/test/error?variant=nope`. A prefetch request carries no proxy `Set-Cookie`. |
| SP-4 CSS pipeline | foundation | The production CSS keeps the declared `@layer` order. The Pretendard package's dynamic-subset CSS resolves under Turbopack. If not, the fallback is `public/fonts/pretendard/` slices copied from the package, and the spike records which. |
| SP-5 pre-paint attributes | foundation | No hydration warning in the console on `/kr` with stored theme `dark` and consent `OPTED_OUT`, in WebKit and Chromium. |
| SP-6 history bridge on 16.3.6 | window step | On `mobile-webkit` and `mobile-chromium`: card → Q1 → grow → Back → Forward → Back keeps the landing DOM node identity, with zero document and zero RSC requests. `/{l}#{v}` push causes no scroll jump; if it does, push `/{l}` with the marker only. |
| SP-7 native dialog | test-experience step | Esc twice on the instruction step leaves it open in WebKit and Chromium (keydown `preventDefault` + `cancel` prevention). An emulated close request on Chromium closes the share sheet via `back()` with no dangling entry. |
| SP-8 ask OG build cost | sharing step | Build time for all static ask images is within the CI budget. If not, `generateStaticParams` is limited to the launch locales (O3). |
| SP-9 field fallback | landing step | `failIfMajorPerformanceCaveat` plus the frame-time probe switches to the CSS field on a throttled profile. `requestIdleCallback` is absent on WebKit, so it falls back to `setTimeout`. |

---

## 5. Domain kernel

### 5.1 Rules for domain code

- **Pure and deterministic.** Time arrives as `now: EpochMs`, ids arrive pre-generated in a context object, and randomness never enters.
- **Total.** Expected failures are `Result<T, E>` with enumerated codes. The only throw site is `content/load.ts` at build.
- **Transitions are data.** "Esc writes nothing" is a test that `effects.length === 0`. "Cleanup is atomic" is one `clearRun` effect.
- **No display text in domain types.** Localized text is projected separately (`views.ts`).
- **Tests are named by spec rule ID** (`it('DOM-RUN-07 re-answering a revisited question advances exactly one', …)`).

### 5.2 Vocabulary (`domain/ids.ts`)

```ts
export type Brand<T, B extends string> = T & { readonly __brand: B };
export type VariantId = Brand<string, 'VariantId'>;      export type RunId = Brand<string, 'RunId'>;
export type QuestionIndex = Brand<number, 'QuestionIndex'>;   // canonical, 1-based, over ALL questions (REQ-T §3.1)
export type ScoringOrdinal = Brand<number, 'ScoringOrdinal'>; // 1-based over scoring questions = user-facing Qn
export type Pole = Brand<string, 'Pole'>;   export type AxisId = Brand<string, 'AxisId'>;
export type EpochMs = Brand<number, 'EpochMs'>;   export type Hex = Brand<string, 'Hex'>;
export type ShareId = Brand<string, 'ShareId'>;               // 16 random bytes, base64url (22 chars)
export const ANSWER_KEYS = ['A', 'B', 'C', 'D'] as const;  export type AnswerKey = (typeof ANSWER_KEYS)[number];
export type Result<T, E> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };
```

### 5.3 Content model and compile (`domain/content-model.ts`, `domain/compile.ts`)

```ts
export type Attribute = 'available' | 'unavailable' | 'hide' | 'opt_out' | 'debug';
export type StageKind = 'I' | 'J' | 'D';
export type Localized<T> = { readonly en: T } & { readonly [L in Exclude<Locale, 'en'>]?: T };
export interface TestSource {                               // authored in content/tests/<id>.ts via defineTest()
  readonly id: string; readonly schema: SchemaSource; readonly stage: StageKind;   // owner fills stage at launch (O8)
  readonly palette: { readonly base: Hex; readonly hi: Hex; readonly look?: Partial<PaletteLook>; readonly answers?: readonly (readonly Hex[])[] };
  readonly meta: { readonly minutes: number; readonly completed: number; readonly shared: number };
  readonly text: Localized<{ readonly title: string; readonly subtitle?: string; readonly instruction: string }>;
  readonly questions: readonly QuestionSource[];             // authoring order = canonical order
}
export type QuestionSource =
  | { readonly kind: 'scoring'; readonly emoji?: string; readonly prompt: Localized<string>;
      readonly options: readonly [OptionSource, OptionSource, ...OptionSource[]] }   // 2..4, pole declared per option
  | { readonly kind: 'profile'; readonly key: string; readonly prompt: Localized<string>;
      readonly values: readonly { readonly token: string; readonly label: Localized<string> }[] };
export interface OptionSource { readonly pole: string; readonly text: Localized<string> }
export interface SchemaSource { readonly axes: readonly { poleA: string; poleB: string }[]; readonly scoringMode: 'binary_majority';
  readonly qualifiers?: readonly { key: string; tokenLength: number }[] }
export function defineTest<const T extends TestSource>(t: T): T;

export interface Test {                                       // compiled, runtime-facing, no display text
  readonly id: VariantId; readonly attribute: Attribute; readonly stage: StageKind; readonly palette: Palette;
  readonly axes: readonly { readonly id: AxisId; readonly poleA: Pole; readonly poleB: Pole }[];   // length ∈ {1,2,4}
  readonly questions: readonly Question[]; readonly scoring: readonly QuestionIndex[];          // ordinal → canonical index
  readonly qualifiers: readonly QualifierField[]; readonly maxAnswers: 2 | 3 | 4; readonly structureHash: string;
}
export type Question =
  | { readonly kind: 'scoring'; readonly index: QuestionIndex; readonly ordinal: ScoringOrdinal; readonly axis: AxisId;
      readonly options: readonly { readonly key: AnswerKey; readonly pole: Pole }[] }
  | { readonly kind: 'profile'; readonly index: QuestionIndex; readonly field: string };
export interface Content { readonly catalog: readonly CatalogEntry[]; test(id: string): Test | undefined; readonly blog: readonly BlogEntry[] }
export type ContentError = { readonly code: CntCode; readonly at: string; readonly detail: string };
export function compileContent(src: ContentSource): Result<Content, readonly ContentError[]>;   // ALL errors at once
```

Compile rules (`DOM-CNT-*`; each has one failing fixture in `compile.test.ts`):

- catalogue and test files agree both ways, with unique ids, and `error` reserved;
- `axes.length ∈ {1,2,4}`, with no duplicate axis;
- every scoring question's options cover both poles of exactly one axis, with at least one option per pole;
- 2–4 options per scoring question;
- an odd scoring-question count per `binary_majority` axis;
- qualifier fields reference profile questions, have non-empty values, and every token length equals `tokenLength`;
- `en` text exists everywhere, and every enterable test has its own instruction text (no generic fallback);
- `stage: 'J'` only when every question has 2 options (AD-14);
- palette invariants PAL-1…7 (§6.9) hold for every enterable test.

The last known good is the live deployment: an invalid content change fails `next build` and the unit gate, so it cannot deploy (REQ-T §2.4–§2.5).

### 5.4 Catalogue (`domain/catalog.ts`)

```ts
export type CatalogEntry = { readonly kind: 'test'; readonly id: VariantId; readonly attribute: Attribute } | { readonly kind: 'blog'; readonly slug: string };
export type Audience = 'public' | 'qa';
export const isEnterable = (a: Attribute, aud: Audience): boolean => a === 'available' || a === 'opt_out' || (aud === 'qa' && a === 'debug');
export function enterableIds(c: readonly CatalogEntry[], aud: Audience): ReadonlySet<VariantId>;   // proxy + generateStaticParams + JSON route
export function visibleCatalog(c: readonly CatalogEntry[], consent: ConsentState, aud: Audience): readonly CatalogEntry[];
export function hiddenByConsent(c: readonly CatalogEntry[], consent: ConsentState): number;          // OPTED_OUT notice count
export function recoveryCards(c: readonly CatalogEntry[], completed: ReadonlySet<VariantId>, max = 2): readonly VariantId[];
```

`visibleCatalog` is the REQ-L §13.9 matrix: under `OPTED_OUT`, `available` is hidden; `opt_out` is always shown; `unavailable` is shown as coming soon; `hide` and `debug` are never listed. `recoveryCards` returns up to two not-completed enterable tests in catalogue order, taken from the completion history (JF V7; corrects NN §7.9).

### 5.5 Scoring (`domain/scoring.ts`)

```ts
export type ResponseMap = Readonly<Record<number /* QuestionIndex */, AnswerKey | string /* qualifier token */>>;
declare const complete: unique symbol;
export type CompleteResponses = ResponseMap & { readonly [complete]: true };
export function completeness(t: Test, r: ResponseMap): Result<CompleteResponses, { readonly missing: readonly ScoringOrdinal[] }>;
export interface AxisScore { readonly poleA: Pole; readonly poleB: Pole; readonly counts: Readonly<Record<string, number>>; readonly dominant: Pole }
export type ScoreStats = Readonly<Record<string /* AxisId in schema order */, AxisScore>>;
export interface Derivation { readonly scoreStats: ScoreStats; readonly derivedType: string; readonly typeSegment: string }
export function derive(t: Test, r: CompleteResponses): Derivation;   // TOTAL — no error branch
```

Projection from answer key to pole happens inside `derive`. `derive` accepts only `CompleteResponses`, and compile guarantees odd counts and pole coverage, so derivation cannot fail. The derivation-failure UI (REQ-T §6.7) has no reachable trigger and is not built (§10.3).

### 5.6 Storage records (`domain/records.ts`)

```ts
export const StagedEntry = z.object({ v: z.literal(1), variant: z.string(), choice: z.enum(ANSWER_KEYS), createdAt: z.number() }).strict();
export const RunRecord = z.object({
  v: z.literal(1), variant: z.string(), runId: z.string(), structureHash: z.string(), ingress: z.boolean(),
  responses: z.record(z.string(), z.string()),                // canonical index → key | qualifier token
  startedAt: z.number(), lastAnswerAt: z.number(),
  dwellMs: z.record(z.string(), z.number()),                  // accumulated per question incl. revisits (REQ-L §13.7)
  attemptStarted: z.boolean(),                                // attempt_start emitted once per run
  asks: z.record(z.string(), z.string()),                     // canonical index → ShareId created during this run
}).strict();
export const HistoryEntry = z.object({ variantId: z.string(), startedAtMs: z.number(), completedAtMs: z.number().nullable() });  // legacy shape
export function parseRecord<T>(schema: z.ZodType<T>, raw: string | null): T | null;   // malformed → null (history: per entry)
```

The run record has no cursor. The resume position is derived, and moving between questions never reads or writes storage (REQ-T §3.9).

### 5.7 Entry classification (`domain/entry.ts`)

```ts
export type EntryPlan =
  | { readonly path: 'landingIngress'; readonly staged: StagedEntry; readonly previous: RunRecord | null }
  | { readonly path: 'directResume'; readonly run: RunRecord; readonly showGate: boolean }
  | { readonly path: 'directCold'; readonly discard: 'timeout' | 'structureChanged' | 'qualifierInvalid' | null };
export const STAGED_TTL_MS = 7 * 60_000; export const RUN_TTL_MS = 30 * 60_000;
export function classifyEntry(i: { readonly test: Test; readonly now: EpochMs; readonly staged: StagedEntry | null;
  readonly run: RunRecord | null; readonly seen: boolean }): EntryPlan;
```

The rules come from REQ-T §3.3–§3.7:

- A fresh staged entry beats an active run (restart intent). The old run survives until commit succeeds.
- A run is valid only if its last answer is less than 30 min old at `now`, its qualifier tokens are allowed, and its `structureHash` equals the test's. A content deploy that changed structure therefore expires the run instead of producing the legacy mid-flow blocking error (§10.3).
- A staged entry older than 7 minutes is dropped at classification.
- `showGate` is `!seen`. Qualifier tests resume without the gate only with valid tokens and `seen`.

### 5.8 The gate (`domain/gate.ts`)

```ts
export type GateAction = 'start' | 'accept_all_and_start' | 'deny_and_start' | 'deny_and_abandon' | 'keep_current_preference';
export type GateNote = 'none' | 'unknownAvailable' | 'unknownOptOut' | 'optedOutAvailable';
export interface GateSpec { readonly note: GateNote; readonly primary: GateAction; readonly secondary: GateAction | null }
export function gateSpec(i: { readonly ingress: boolean; readonly consent: ConsentState; readonly attribute: 'available' | 'opt_out' }): GateSpec;
export interface GateEffectSpec { readonly consentWrite: 'OPTED_IN' | 'OPTED_OUT' | null; readonly recordsSeen: boolean; readonly outcome: 'proceed' | 'exit' }
export const GATE_EFFECTS: Readonly<Record<GateAction, GateEffectSpec>>;
```

`gateSpec` implements all 12 rows of the REQ-L §13.5 matrix, including the unreachable `ingress + OPTED_OUT + available` row, which maps to a plain `start`. The CTA sets are:

- `UNKNOWN + available` → [모두 허용하고 시작] and [거부하고 중단];
- `UNKNOWN + opt_out` → [모두 허용하고 시작] and [거부하고 시작];
- deep link with `OPTED_OUT + available` → warning plus [모두 허용하고 시작] and [현재 설정 유지];
- otherwise [시작].

When the test has qualifiers, the primary button is labelled 「다음」. `GATE_EFFECTS` is the CTA invariant list: `start`, `accept` and `deny_and_start` record `instructionSeen`; `abandon` and `keep` do not.

### 5.9 The run machine (`domain/run.ts`, `domain/view.ts`)

```ts
export type Phase =
  | { tag: 'booting' } | { tag: 'preview' }                                       // preview = window, Q1 on the card
  | { tag: 'gate'; plan: EntryPlan; step: { kind: 'instruction' } | { kind: 'qualifier'; field: number }; draft: Readonly<Record<string, string>> }
  | { tag: 'commitFailed'; previous: RunRecord | null } | { tag: 'answering' }
  | { tag: 'deriving'; href: ResultHref } | { tag: 'done'; href: ResultHref } | { tag: 'exited' };
export interface RunState {
  readonly variant: VariantId; readonly phase: Phase; readonly run: RunRecord | null; readonly staged: StagedEntry | null;
  readonly cursor: ScoringOrdinal; readonly lockedUntil: EpochMs | null; readonly enteredAt: EpochMs;
  readonly last: { readonly from: ScoringOrdinal; readonly to: ScoringOrdinal; readonly cause: 'answer' | 'prev' | 'jump' | 'resume' | 'commit' } | null;
}
export type RunEvent =
  | { type: 'boot'; stored: { staged: StagedEntry | null; run: RunRecord | null; seen: boolean }; host: 'window' | 'page' }
  | { type: 'previewAnswer'; key: AnswerKey } | { type: 'gate'; action: GateAction | 'escape' | 'back' | 'dismiss' }
  | { type: 'qualifier'; token: string } | { type: 'qualifierNext' } | { type: 'answer'; key: AnswerKey } | { type: 'advanceDue' }
  | { type: 'moveTo'; ordinal: ScoringOrdinal } | { type: 'asked'; index: QuestionIndex; share: ShareId }
  | { type: 'submit' } | { type: 'minLoadingElapsed' } | { type: 'backFromLoading' }
  | { type: 'commitFailure'; action: 'retryFresh' | 'resumePrevious' | 'home' };
export type Effect =
  | { type: 'writeStaged'; entry: StagedEntry } | { type: 'dropStaged'; variant: VariantId }
  | { type: 'writeRun'; record: RunRecord } | { type: 'clearRun'; variant: VariantId }              // run + staged + seen, atomic, variant-scoped
  | { type: 'setSeen'; variant: VariantId } | { type: 'setConsent'; value: 'OPTED_IN' | 'OPTED_OUT' }
  | { type: 'track'; draft: TelemetryDraft } | { type: 'history'; op: 'start' | 'complete'; variant: VariantId; startedAt: EpochMs; at: EpochMs }
  | { type: 'schedule'; key: 'advance' | 'minLoading'; afterMs: number } | { type: 'cancel'; key: 'advance' | 'minLoading' }
  | { type: 'navigate'; to: ResultHref } | { type: 'exit'; reason: 'abandon' | 'keep' | 'dismiss' | 'home' };
export interface RunCtx { readonly test: Test; readonly now: EpochMs; readonly consent: ConsentState; readonly freshRunId: RunId; readonly minDerivationMs: number }
export function initial(v: VariantId, now: EpochMs): RunState;
export function step(s: RunState, e: RunEvent, ctx: RunCtx): { readonly state: RunState; readonly effects: readonly Effect[] };
```

The transition table below is the whole run and gate contract. `docs/spec/domain.md` restates it with `DOM-RUN-*` IDs, and each row has a named test.

| From | Event | Guard | To | Effects | Source |
|:---|:---|:---|:---|:---|:---|
| booting | boot (window) | — | preview | — | EXP window; REQ-L §8.6 entry = answer |
| booting | boot (page) | `classifyEntry` | gate, or answering (resume without gate; auto-commit when seen ∧ no qualifier ∧ plain start) | discard ⇒ `clearRun` | REQ-T §3.3, §3.6, §6.8 |
| preview | previewAnswer(k) | not locked | gate(landingIngress), or commit ↓ under the auto-commit rule | `writeStaged`, `track card_answered` | REQ-L §13.4, §12.1 |
| gate(instruction) | gate(escape) | — | same | **none** | REQ-T §3.6 (BQ-41) |
| gate(instruction) | gate(a) with a ∈ spec, a proceeds | — | gate(qualifier 1) if the test has qualifiers, else commit ↓ | `setConsent?`, `setSeen` if `recordsSeen` | REQ-L §13.5 |
| gate(instruction) | gate(deny_and_abandon) | a = spec.secondary | exited | `setConsent OPTED_OUT`, `dropStaged`, `exit abandon` | REQ-L §13.5 |
| gate(instruction) | gate(keep_current_preference) | a = spec.secondary | exited | `dropStaged`, `exit keep` | REQ-L §13.5 |
| gate(any) | gate(dismiss) (close request not prevented) | — | exited | `exit dismiss` (no consent, no seen, staged kept) | EXP: an uncommitted dismissal is never consent |
| gate(qualifier k) | qualifier(t) | t ∈ values | same (draft) | none | REQ-T §3.6 |
| gate(qualifier k) | gate(back) or gate(escape) | — | qualifier k−1, or instruction | none | REQ-T §3.6 |
| gate(qualifier last) | qualifierNext | draft complete | commit ↓ | — | REQ-T §3.4 |
| commit | (internal) | ingress ∧ staged expired | commitFailed | none | REQ-T §3.4, §6.6 |
| commit | (internal) | ok | answering at ordinal 2 (ingress) or 1 | `clearRun(prev)` if replacing, `writeRun` (seed + qualifiers only), `dropStaged`, `history start`, `track attempt_start` (canonical index; `attemptStarted` set) | REQ-T §3.4, §4.2, §9.1 |
| commitFailed | commitFailure(retryFresh / resumePrevious / home) | resumePrevious re-validates | booting → … / answering / exited | per branch | REQ-T §6.6 |
| answering | answer(k) | not locked, not last | same, locked 150 ms, option selected | `writeRun` (response, lastAnswerAt, dwell), `track question_answered` (ordinal, choice, dwell), `schedule advance 150` | REQ-T §4.3, §9.1 |
| answering | answer(k) | not locked, last | same (stays selected) | `writeRun` | REQ-T §4.4 |
| answering | advanceDue | — | **cursor + 1 (advance exactly one)** | none | owner round 2 (replaces REQ-T §4.3 destination) |
| answering | moveTo(o) | 1 ≤ o ≤ frontier | cursor = o | `cancel advance`; no storage access | REQ-T §3.9 |
| answering | asked(i, s) | committed | same | `writeRun` (asks[i] = s) | SHR |
| answering | submit | eligible | deriving if `minDerivationMs > 0`, else done | `track final_submit`; `schedule minLoading` or the done effects | REQ-T §4.4–§4.6 |
| deriving | minLoadingElapsed | — | done | `clearRun`, `history complete`, `navigate` (replace) | REQ-T §4.6, §6.8, §5.2 |
| deriving | backFromLoading | — | answering at the last question | `cancel minLoading` | REQ-T §4.7 |

The landing answer never fires `question_answered` again at runtime (JF V9). No transition removes an answer; only the derivation residue is invalidated. The optional qualifier recap chip (REQ-T §3.6) is not built, because it would be a new interactive element during the test (owner principle 3).

```ts
export interface RunView {
  readonly phase: Phase['tag'];
  readonly question: { readonly ordinal: ScoringOrdinal; readonly index: QuestionIndex; readonly isLast: boolean;
    readonly options: readonly { readonly key: AnswerKey; readonly state: 'none' | 'selected' | 'marked' }[] } | null;
  readonly total: number; readonly frontier: ScoringOrdinal;
  readonly progress: { readonly answered: number; readonly percent: number; readonly choices: readonly (AnswerKey | null)[] };  // incl. landing answer
  readonly inputLocked: boolean; readonly canPrev: boolean; readonly canSubmit: boolean; readonly canAsk: boolean;  // canAsk only once committed
  readonly gate: { readonly step: 'instruction' | 'qualifier'; readonly spec: GateSpec; readonly primaryLabel: 'start' | 'acceptAllAndStart' | 'next';
    readonly landingAnswer: AnswerKey | null; readonly qualifier: QualifierStepView | null } | null;
  readonly last: RunState['last']; readonly degraded: boolean;
}
export function view(s: RunState, t: Test, now: EpochMs, degraded: boolean): RunView;
```

Option states: `selected` during the lock and on an answered last question; `marked` (previous choice, announced as text) on any other revisited question; otherwise `none`. The frontier is the first unanswered scoring ordinal, or the last one. Progress is shown as the rail plus a percentage, never as "N of M".

### 5.10 Consent (`domain/consent.ts`)

```ts
export type ConsentState = 'UNKNOWN' | 'OPTED_IN' | 'OPTED_OUT';
export function parseStoredConsent(raw: string | null): ConsentState;          // legacy values 'OPTED_IN' | 'OPTED_OUT'
export function transmission(c: ConsentState): 'send' | 'hold' | 'drop';
export function decide(current: ConsentState, choice: 'OPTED_IN' | 'OPTED_OUT'): { readonly next: ConsentState; readonly rotateIds: boolean; readonly queue: 'flush' | 'drop' };
export function recall(current: ConsentState): { readonly previous: ConsentState };  // recall never writes; closing keeps the choice
```

SSR and the first hydration pass render `UNKNOWN`. The analytics gate reads the same store.

### 5.11 Telemetry (`domain/telemetry.ts`)

```ts
const Common = { event_id: z.uuid(), session_id: z.uuid().nullable(), ts_ms: z.number().int(), locale: z.enum(LOCALES),
  route: z.string().startsWith('/['), consent_state: z.enum(['UNKNOWN', 'OPTED_IN', 'OPTED_OUT']) };
const Key = z.enum(ANSWER_KEYS); const Stage = z.enum(['I', 'J', 'D']);
export const Event = z.discriminatedUnion('event_type', [
  z.object({ ...Common, event_type: z.literal('landing_view') }).strict(),
  z.object({ ...Common, event_type: z.literal('card_answered'), source_variant: z.string(), target_route: z.string(), landing_ingress_flag: z.literal(true) }).strict(),
  z.object({ ...Common, event_type: z.literal('attempt_start'), variant: z.string(), stage: Stage, question_index_1based: z.number().int().min(1), landing_ingress_flag: z.boolean() }).strict(),
  z.object({ ...Common, event_type: z.literal('question_answered'), variant: z.string(), stage: Stage, scoring_ordinal: z.number().int().min(1), choice: Key, dwell_ms: z.number().int().min(0), landing_ingress_flag: z.boolean() }).strict(),
  z.object({ ...Common, event_type: z.literal('final_submit'), variant: z.string(), stage: Stage, question_index_1based: z.number().int().min(1), dwell_ms_accumulated: z.number().int().min(0), landing_ingress_flag: z.boolean(), final_responses: z.record(z.string(), Key) }).strict(),
  z.object({ ...Common, event_type: z.literal('result_viewed'), variant: z.string(), type_segment: z.string() }).strict(),
  z.object({ ...Common, event_type: z.literal('share_clicked'), variant: z.string(), kind: z.enum(['ask', 'path', 'palette']) }).strict(),
  z.object({ ...Common, event_type: z.literal('share_copied'), variant: z.string(), kind: z.enum(['ask', 'path', 'palette']) }).strict(),
]);
export const Batch = z.array(Event).min(1).max(50);
export type TelemetryEvent = z.infer<typeof Event>;
export type TelemetryDraft =                                  // what the machine emits: brands keep the index spaces apart
  | { type: 'card_answered'; variant: VariantId } | { type: 'attempt_start'; index: QuestionIndex; ingress: boolean }
  | { type: 'question_answered'; ordinal: ScoringOrdinal; key: AnswerKey; dwellMs: number; ingress: boolean }
  | { type: 'final_submit'; index: QuestionIndex; dwellMs: number; ingress: boolean; responses: Readonly<Record<number, AnswerKey>> }
  | { type: 'landing_view' } | { type: 'result_viewed'; variant: VariantId; typeSegment: string }
  | { type: 'share_clicked' | 'share_copied'; variant: VariantId; kind: 'ask' | 'path' | 'palette' };
export function finalize(d: TelemetryDraft, c: CommonFields): TelemetryEvent;
```

- **One definition, two sides.** The schema is the type and the validator on the client and in `POST /api/telemetry`.
- **Payload hygiene is structural.** `.strict()` rejects the legacy `transition_id`, `result_reason` and `final_q1_response`, and no field can carry text.
- **Field list.** The authoritative list is the restatement of REQ-L §12.2 and REQ-T §9.1 in `docs/spec/privacy-telemetry.md`. The sketch above is its shape.
- **`session_id` may be null only before `attempt_start`.** A `.superRefine` on the batch checks this.
- **Deliberate widenings:** `choice` is A–D, and `stage` joins the attempt events (C§4.4 gaps).

### 5.12 Result codec (`domain/result.ts`)

```ts
export type ResultHref = Brand<string, 'ResultHref'>;       // /{l}/result/{v}/{type}?{base64url(JSON.stringify({scoreStats, shared}))}
export function encodeResult(l: Locale, t: Test, d: Derivation, shared: boolean): ResultHref;
export type ResultError = 'MISSING_VARIANT' | 'MISSING_TYPE' | 'MISSING_PAYLOAD' | 'BASE64_INVALID' | 'JSON_INVALID' | 'SCORESTATS_MISSING'
  | 'UNKNOWN_VARIANT' | 'TYPE_LENGTH_MISMATCH' | 'QUALIFIER_VALUE_INVALID' | 'SCORESTATS_SCHEMA_MISMATCH' | 'SHARED_NOT_BOOLEAN';
export interface ResultView { readonly variant: VariantId; readonly typeSegment: string; readonly derivedType: string;
  readonly qualifiers: Readonly<Record<string, string>>; readonly scoreStats: ScoreStats; readonly audience: 'own' | 'shared' }
export function resolveResultView(content: Content, i: { variant?: string; type?: string; rawQuery: string }): Result<ResultView, ResultError>;
```

- **Byte-compatible with links already in the wild.** The wire format is URL-safe base64 without padding, schema axis order, and a keyless query (critique G11).
- **Ordered validation.** Decode, then parse, then schema, then type segment. Each failure is a distinct code, rendered as `data-result-branch`.
- **No partial render, by structure.** The page receives either a `ResultView` or an error code.
- **Hand-edited types are rejected.** A `derivedType` that disagrees with the payload's dominants is a schema mismatch.

A legacy-format fixture is part of the kernel step's exit criteria.

### 5.13 History, stage and share

```ts
// domain/history.ts — list-only (REQ-T §8.4; O5 default)
export function start(list: readonly HistoryEntry[], e: HistoryEntry, max = 50): readonly HistoryEntry[];
export function complete(list: readonly HistoryEntry[], v: VariantId, startedAtMs: number, at: number): readonly HistoryEntry[];
export function rows(list: readonly HistoryEntry[], active: ReadonlyMap<VariantId, number>): readonly { variantId: VariantId; status: 'completed' | 'in-progress' | 'abandoned'; at: number }[];
export const completedSet: (list: readonly HistoryEntry[]) => ReadonlySet<VariantId>;
// domain/stage.ts — resolved once per attempt, fixed for the run
export const resolveStage = (t: Test, motion: 'full' | 'reduced'): StageKind => (motion === 'reduced' ? 'D' : t.stage);
// domain/share.ts
export const VoteInput = z.object({ share: z.string().regex(/^[A-Za-z0-9_-]{22}$/), variant: z.string(), question: z.coerce.number().int().min(1), choice: z.enum(ANSWER_KEYS) }).strict();
export interface Tally { readonly counts: Readonly<Partial<Record<AnswerKey, number>>>; readonly n: number }
export function percentages(t: Tally, keys: readonly AnswerKey[]): Readonly<Record<AnswerKey, number>>;   // largest remainder, sums to 100
```

### 5.14 Effects execution: the run session (`client/run-session.ts`)

```ts
export interface SessionIO {
  readonly store: KeyValue; readonly track: (d: TelemetryDraft) => void; readonly now: () => EpochMs;
  readonly after: (ms: number, fn: () => void) => () => void; readonly id: () => string;
  readonly consent: () => ConsentState; readonly setConsent: (c: 'OPTED_IN' | 'OPTED_OUT') => void;
  readonly navigate: (href: ResultHref) => void; readonly exit: (reason: 'abandon' | 'keep' | 'dismiss' | 'home') => void;   // supplied by the host
}
export interface RunSession {
  subscribe(fn: () => void): () => void;            // first subscriber boots the session (client-only, after hydration)
  getSnapshot(): RunView; getServerSnapshot(): RunView;   // server snapshot = booting view = first client render
  dispatch(e: Exclude<RunEvent, { type: 'boot' | 'advanceDue' | 'minLoadingElapsed' }>): void;
}
export function openRunSession(test: Test, host: 'window' | 'page', openId: number, io?: Partial<SessionIO>): RunSession;  // memoised per (variant, openId)
```

`dispatch` works in four ordered steps:

1. `step()` computes the new state and the effect list.
2. The new state is stored.
3. The effects execute in order: storage effects first, then `track`, then `schedule`/`cancel`, then `navigate`/`exit`.
4. Subscribers are notified once.

Three properties make it StrictMode-safe:

- `boot` is idempotent.
- Disposal is deferred one macrotask after the last unsubscribe, so an unsubscribe/resubscribe pair cannot dispose a live session.
- `attemptStarted` is persisted.

Tests pass a fake `SessionIO` in node, including a store that refuses writes. There is no engine layer, no ports module and no `useEffect` for business side effects.

### 5.15 Storage adapter and keys (`client/storage.ts`, `client/keys.ts`)

```ts
export type Area = 'local' | 'session';
export interface KeyValue { get(a: Area, k: string): string | null; set(a: Area, k: string, v: string): boolean; remove(a: Area, ...k: string[]): void }
export const storage: KeyValue & { readonly degraded: () => boolean };
// every access, including the `window.localStorage` getter itself, sits inside try/catch; a refusal returns null/false and flips degraded
export const KEYS = {
  consent: 'vivetest-telemetry-consent', theme: 'vivetest-theme', history: 'test:runHistory',   // legacy names and formats kept
  telemetrySession: 'vt1:tsid', coach: 'vt1:coach',
  run: (v: VariantId) => `vt1:run:${v}`, staged: (v: VariantId) => `vt1:staged:${v}`, seen: (v: VariantId) => `vt1:seen:${v}`,
} as const;
```

The three legacy keys keep their names and value formats, so returning users keep consent, theme and history with zero migration code. Everything else is versioned under `vt1:`, because run state lives at most 30 minutes. WebKit's "Block all cookies" (`setItem` throws, L52) degrades the visit instead of stalling it: `RunView.degraded` becomes true and the flow continues.

---

## 6. UI system

### 6.1 Rules for `src/ui/**`

1. **Pure views.** A `ui/` component is a function of its props. It does not import Next, next-intl, a router, storage or `client/`. Strings arrive translated.
2. **Layout lives in CSS.** Positions derive from custom properties (`--fill`, `--split`, `--prev-x`). JS writes custom properties and attributes only.
3. **Blocks.** Each block is `<block>.tsx` and `<block>.css`, plus `<block>.specimen.tsx` from the design-system step on. Behaviour lives in `features/` or `stages/`.
4. **The white-surface rule is enforced by vocabulary.** `Question` and `QuestionLabel` have no surface prop. Only `AnswerPill`, the I bands and the J signs have filled surfaces (P§2.11, owner round 2).
5. **No text in `ui/`.** It contains no Korean and no English.

### 6.2 Shell components

| Component | Props (shape) | Prototype source |
|:---|:---|:---|
| `TopBar` | `{ title, tone, onBrand, onAsk?, brandLabel, askLabel }`; the ask icon renders only when `onAsk` is given (`view.canAsk`) | `.vt-top`, `.vt-brand`, `.vt-icon` |
| `Rail` | `{ axis: 'y' \| 'x', segments: (Hex \| null)[], current, percent, label, tone }`; `role=progressbar`, `aria-valuetext` | `.vt-rail`, story bar |
| `BottomBar` | `{ prev: { visible, label }, submit: 'hidden' \| 'disabled' \| 'ready', placement: 'centre' \| 'follow' }`; the 이전 button owns the extended hit zone for J | `.vt-bottom`, `.vt-prev`, `.vt-submit` |
| `Badge`, `PrevMark`, `Question`, `QuestionLabel`, `AnswerPill`, `VotesLine` | answer tokens | `.vt-badge`, `.vt-prev-mark`, `.vt-q`, `.vt-qlabel`, `.ans`, `.vt-votes` |
| `Dialog` | `{ open, placement: 'center' \| 'bottom', labelledBy, escape: 'swallow' \| 'dismiss', onDismiss(reason) }` | `.vt-scrim`, `.vt-modal`, share frame |
| `WindowFrame` | `{ state, cover, band: { title, chip }, skeleton, fallback? }` | `#win`, `.wband`, `#wfall` |

`features/test/ShellChrome` composes `TopBar`, `Rail` and `BottomBar` from `RunView` and `StageModule.meta`. There is no imperative `setTone`: tone is `chromeTone(palette, ordinal)`, a pure function.

### 6.3 Stage contract (`src/stages/contract.ts`)

```ts
export interface Insets { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number }
export type Presentation = { readonly kind: 'window'; readonly insets: Insets; readonly active: boolean } | { readonly kind: 'full' };
export interface InputGate { arm(afterMs: number): void; readonly armed: boolean; accept(e: PointerEvent | KeyboardEvent): boolean }
export interface PrevPort { place(x: number | null): void }          // J writes --prev-x per frame; null = centre
export interface StageProps {
  readonly view: RunView; readonly test: StageTest;                    // localized questions + options for this locale
  readonly palette: Palette; readonly motion: 'full' | 'reduced'; readonly presentation: Presentation;
  readonly gate: InputGate; readonly prev: PrevPort; readonly votes: Tally | null; readonly labels: StageLabels;
  readonly act: { answer(k: AnswerKey, origin?: { x: number; y: number }): void; prev(): void; moveTo(o: ScoringOrdinal): void; submit(): void };
  readonly onReady: () => void;                                       // Q1 drawn → the window may reveal
  readonly onSettled: (o: ScoringOrdinal) => void;                    // arrival motion finished → controller arms the gate
}
export interface StageHandle { focusQuestion(): void; shareOrigin(): DOMRect | null; drawArt?(ctx: CanvasRenderingContext2D, box: { w: number; h: number }): void }
export interface StageMeta { readonly kind: StageKind; readonly maxAnswers: 2 | 4; readonly progress: 'y' | 'x'; readonly submit: 'shell' | 'stage'; readonly prev: 'centre' | 'follow';
  readonly arrivalGuardMs: number }                                   // J 350 after signs settle; I and D 0 unless the input suite says otherwise
export interface StageModule {
  readonly meta: StageMeta;
  readonly Stage: React.ForwardRefExoticComponent<StageProps & React.RefAttributes<StageHandle>>;
  railColor(p: Palette, ordinal: number, key: AnswerKey, count: number): Hex;   // I chosen band · J trail · D card
  chromeTone(p: Palette, ordinal: number): { readonly top: Tone; readonly bottom: Tone };
}
export const loadStage: (k: StageKind) => Promise<StageModule>;       // stages/loaders.ts: one dynamic import per stage
export const preloadStage: (k: StageKind) => void;
```

The prototype protocol maps onto the contract as follows:

| Prototype message | Contract equivalent |
|:---|:---|
| `vive:ready` | `onReady` |
| `vive:window` | `presentation.insets` |
| `vive:open` | `presentation.active` (and the gate arms) |
| `vive:collapse` | the window closes; the session stays in `preview` |
| `vive:q1` | `act.answer` in `preview`, which the session turns into `previewAnswer` |
| `vive:full` | `presentation.kind = 'full'` (structural, once) |
| `vive:back` | the wordmark in `ShellChrome` |
| `vive:escape` | `WindowHost` keydown |

What stays inside a stage: canvas and WebGL drawing, gesture recognition (I's seam drag, J's lean-and-commit swipe, D's card drag that never answers), per-stage motion, and the rail-colour and tone functions.

**Input guards are one mechanism.** The domain owns the 150 ms answer lock, because it is a domain rule: duplicate taps are ignored and the selected state is shown. `features/test/input-gate.ts` implements `InputGate`: a press that started before arming is void, and key repeats count once. The controller arms it on `onSettled` after `meta.arrivalGuardMs`. The J value (350 ms after the signs settle) is the one the prototype's 19-pattern suite validated (P§2.7). I and D arm at the end of their entrance. The 19-pattern suite runs on all three stages in E2E, and the value is raised for I or D only if the suite finds a double advance. This resolves C-11 by evidence.

### 6.4 Test experience and state ownership

```tsx
// src/features/test/TestExperience.tsx ('use client')
export function TestExperience(p: {
  test: TestView; host: { kind: 'window'; presentation: Presentation } | { kind: 'page' };
  openId: number; onExit(reason: 'abandon' | 'keep' | 'dismiss' | 'home'): void;
}): React.JSX.Element;
// composes: StageHost (resolved stage, loaded once per attempt) · ShellChrome · InstructionDialog · ShareSheet · paletteScope on its root
```

| State | Owner | Why there |
|:---|:---|:---|
| Run: responses, cursor, phase, lock, eligibility, progress | `domain/run.ts` via `client/run-session.ts` | one rule for three stages; node-testable |
| Window: rest…full, fallback | `features/window/window-machine.ts` (pure) + `WindowHost` | reacts to history; node-testable |
| History entries (window, sheet) | `client/history-bridge.ts` | AD-02 |
| Consent, theme, motion | `client/prefs.ts` over `html[data-*]` | one pre-paint source, uSES server snapshot = defaults |
| Stage resolution | `domain/stage.ts`, once per attempt in `StageHost` | never switch stage mid-test |
| Gesture offsets, animation progress, canvas | the stage (refs, not React state) | 60 fps; J's 이전 moves via `PrevPort` without renders |
| Sheet open/closed | marker (`sheet: true`) | AD-10 |
| Toasts, coach mark, live-region messages | `client/announce.ts` + `ui/overlay/Toast` | one polite region |

### 6.5 Landing deck and window host

- **`features/landing/Landing`** receives `CardView[]` from the server. Each card carries the localized title, subtitle, meta formatted by next-intl with the display-tag locale (no k/m abbreviation), palette, attribute, stage and the `q1` preview.
- **Consent filtering** uses `visibleCatalog` after hydration. A pre-paint CSS rule, `html[data-consent="OPTED_OUT"] [data-attr="available"] { display: none }`, prevents a flash, so the landing stays static (JM G21).
- **The deck** uses pointer events with a spring integrator (`ui/motion.ts`, ζ ≈ 0.72). Swipe browses and never answers; tapping a neighbour centres it; ←/→ keys and the 44 px `‹ ›` buttons do the same. The first-visit nudge and rubber band are kept. There are no dots. The kinetic title splits text by `Intl.Segmenter` graphemes, so Hindi conjuncts survive.
- **The living field** (`field-gl.ts`, about 5–8 KB) starts after first paint via `requestIdleCallback` with a `setTimeout` fallback. It uses `failIfMajorPerformanceCaveat` and a frame-time probe; failing either gives the CSS field (`coverStyle`). It settles within 5 s of the last interaction, which meets WCAG 2.2.2 without a pause control (critique G14). Under reduced motion it is static.
- **The list section** shows catalogue rows (tests, coming soon, blogs). An unavailable card shows the toast 「출시 예정이에요」 on tap (O5 default) and stays non-enterable: `aria-disabled`, out of the tab order.
- **`WindowHost`** owns one `openId` counter, the window machine, the choreography (`choreography.ts`: WAAPI clip-path with the prototype's timings and a FLIP of the title into the header band), and `FallbackQ1`. It renders `TestExperience` with `host.kind = 'window'`.

### 6.6 Instruction modal

- **Structure.** `InstructionDialog` is `ui/overlay/Dialog` with `placement: 'center'` plus `ui/instruction/InstructionCard`. The card is driven by `view.gate`: note, CTAs, primary label, the landing-answer row with its badge, and the qualifier step.
- **Open state.** The dialog opens when the phase is `gate` and the window is `full` (or immediately on the page host). It stays mounted and is driven by `open` (L39).
- **Focus and keys.** Focus goes to the dialog container, so one Enter is never consent. Tab and Shift+Tab cycle inside on every press, which is WebKit-safe.
- **Esc.** On the instruction step Esc is swallowed at `keydown` (`preventDefault`) and the `cancel` event is prevented, so it writes nothing (DOM-RUN row). On a qualifier step Esc means Back.
- **Close requests.** A close request the page could not prevent (F17) dispatches `gate(dismiss)`, which means exit to the card, never consent or start (SP-7).
- **No history entry.** Back while the modal is open means leaving the test. In window mode that is the shrink to the same card; the run is uncommitted and the staged entry is kept for 7 minutes.

### 6.7 Share sheet

- **Structure.** `ShareSheet` is `Dialog` with `placement: 'bottom'` plus `ui/share/ShareBody`. There is no grabber and no drag-to-close.
- **Availability.** It is shown only when `view.canAsk` is true (committed and answering). The ask icon does not exist before commit, so the sheet can never compete with the gate (JF gap).
- **History.** Opening pushes a same-URL marker with `sheet: true` (AD-10). Closing by button, outside tap or Esc calls `back()`, and system back closes it through the pop listener. An Android close request prevents `cancel` if it is cancelable and calls `back()`; otherwise the `close` event calls `back()`.
- **Content, link first.** 「나 대신 골라 줘」 comes first: `newShareId()` runs on the client, so the clipboard write stays inside the tap's user activation (iOS). The href is `routes.ask(l, v, index, share)`. `navigator.share({ url })` is used when available, else copy.
- **Content, story card second.** The 9:16 card is drawn on a client canvas (`story-card.ts`) as a JPEG blob, shared with `navigator.share({ files })` after `canShare`, or saved by long-press.
- **Recording and freezing.** The `asked` event records the share id in the run. While the sheet is open the stage gate is disarmed, so the test never advances. On close, focus returns to the question block (`StageHandle.focusQuestion`) with the toast 「같은 질문으로 돌아왔어요 · 친구 투표는 여기에 모여요」.
- **Morphs.** The question block morphs into the sheet thumbnail and back (`StageHandle.shareOrigin`, 420 ms).
- **Sharing does not wait for votes** (JF #9). The link and the 9:16 card ship with the share step. The vote line under the question and the friend tally appear only when a vote store is configured (O2): `VoteStore` availability is a server flag passed as a prop.
- **End of test.** The end-of-test art (I palette, J path) comes from `StageHandle.drawArt`.

### 6.8 Motion system and reduced motion

| Register | Surfaces | Tokens | Overshoot | Loops |
|:---|:---|:---|:---|:---|
| Paper | list, instruction card body, share sheet, banners, blog, history, legal, result (until O4) | `--motion-paper-fast/base/slow` 140/180/280 ms, `--ease-paper` | never | never |
| Stage | deck, field, window choreography, stages, vote page entrance | `--motion-stage-enter/exit/flood` 560/260/700 ms, `--motion-window-open/close/grow/shrink` 580/440/520/560 ms, `--ease-stage-out cubic-bezier(.2,.9,.25,1)`, `--ease-flood`, `--ease-overshoot cubic-bezier(.2,1.32,.32,1)` | only on (a) settle of a direct manipulation, (b) entrances of the kinetic title | field and J traveller only; both settle within 5 s of the last interaction |

- **Mechanisms.** CSS transitions handle state changes. WAAPI handles choreography: every run is cancelled on completion and its end state is written as inline style. A spring integrator in `ui/motion.ts` handles direct manipulation. JS reads durations from custom properties once per document (`readDuration`), so no duration exists twice.
- **Reduced motion has one source.** `data-motion="full" | "reduced"` on `<html>` is written before paint from `prefers-reduced-motion` and updated live. CSS keys only off the attribute, in the `preferences` layer (L19).
- **v1 follows the OS only.** An in-site switch would be a new control; it can later become a second input to the same attribute.
- **Stage under reduced motion.** Every test opens in D, resolved once per attempt. A mid-test change switches only transitions. Every stage implements `motion: 'reduced'` (fades ≤ 180 ms).
- **Window and landing under reduced motion.** The window's open, close, grow and shrink become 160–180 ms fades. The landing has no kinetic entrance, nudge, parallax or spring.
- **Browser swipe-back.** `hasUAVisualTransition` makes our exit animation jump to its end state when the browser already animated the back (AD-13).

### 6.9 Per-test palette data and contrast invariants

- **Palette is content data.** `content/tests/<id>.ts#palette` holds `{ base, hi, look?, answers? }`. `domain/palette.ts#look()` fills a full `Palette { base, hi, c1, c2, glow, deep, tint, field: { dark[4], light[4] } }` by the prototype's rule where a curated value is absent. The seed values are the prototype's `TEST_COLORS`/`LOOK`/`CURATED` (P§3.4–§3.5), finalised after the V4 capture.
- **One emitter.** `ui/palette-scope.ts#paletteScope(palette)` returns `{ style: { '--t-base', …, '--t-on-base', '--t-on-tint' }, 'data-tone' }`. It is spread on the root of every world surface: card, window, test root, vote page, share preview, specimen. Native dialogs inherit it through the DOM.
- **One poster mesh.** `coverStyle(palette, frame)` is shared by the card, window surface, header band, J sky, fallback Q1 and CSS field.
- **Stage-specific derivations stay in the stage** (`stages/story/colors.ts` for D's OKLCH steps, `stages/forks/colors.ts` for J's land bands). They are built on `domain/palette.ts` primitives.

The invariants are compile rules (§5.3), so a failing palette fails the build and the unit gate. They are never nudged silently.

| ID | Invariant |
|:---|:---|
| PAL-1 | Tone-chosen ink on `base` ≥ 4.5:1 |
| PAL-2 | Type-bearing blobs (`base`, `c1`, `c2`, `deep`) luminance ≤ 0.13 (window copy ≤ 0.15); `glow` ≤ 0.34 and only in the non-type corner |
| PAL-3 | Every answer colour: tone-chosen ink ≥ 4.5:1 |
| PAL-4 | Neighbouring answer colours in a 3–4-answer row ≥ 3:1 |
| PAL-5 | Landing h1 over each `field` colour ≥ 4.5:1, both themes |
| PAL-6 | D card colours: white ≥ 4.5:1 for every step up to 12 questions |
| PAL-7 | J road vs ground ≥ 3:1 |

Rendered contrast (glass over bands, chips over the field, the modal) is measured on specimens in Playwright, because blur cannot be proven by arithmetic.

### 6.10 Accessibility mechanisms (C§4.8 plus the gaps no proposal closed)

- **Skip link and live region.** `ui/paper/SkipLink` is the first focusable element of the root layout. One polite live region (`features/chrome/LiveRegionHost` + `client/announce.ts`) carries card changes (debounced 380 ms), the window states, question changes and progress, with messages from the catalogues.
- **Focus.** Focus follows P§2.14: window open goes to the stage, close to the card CTA, return to the card, the modal to its container, share close to the question, and D to the question heading after every move. The landing under the window is `inert`, and also `aria-hidden` once full.
- **Semantics and sizes.** Triggers are semantic `<button>`/`<a>`. Unavailable items use `aria-disabled`, not `disabled`. Targets are at least 44 px (`--tap`). The focus ring is tone-aware.
- **Gestures.** Every gesture has a tap, button or keyboard alternative, declared per stage. J's moving 이전 and spatial 제출 get focus-order, zoom and screen-reader E2E in the J step.
- **Hydration.** `<html suppressHydrationWarning>` (one level) covers the bootstrap-written attributes. The E2E suite fails on any hydration error in the console.

---

## 7. Design system and tokens

### 7.1 Single sources

| Source | Holds | Consumed by |
|:---|:---|:---|
| `src/ui/tokens.css` | every CSS design value: warm and sage primitives; paper roles (v2 values, one `[data-theme=dark]` block); world roles (on-colour inks via palette scope, glass, stage ground, poster shadow, modal scrim); type (paper tier, display tier; weights 400/500/600/700/800, prototype 650 → 700); radius 12/14/16/18/24/28/pill; spacing; layout (`--app-max: 430px`, `--app-w`, `--app-left`, shell metrics); both motion registers; materials (grain size, luminance caps as documented constants) | the app (via `index.css`), specimens, the Claude Design bundle |
| `src/ui/**/*.css`, `src/stages/*/stage.css` | component and stage skins | the same |
| `content/tests/*#palette` + `domain/palette.ts` | per-test colour (data, not tokens) | `paletteScope`, canvas, WebGL, 9:16 card |
| `src/app/brand.ts` | the brand mark and its colours for `icon.svg`, `apple-icon`, OG | metadata files (brand assets, not UI tokens) |
| `docs/design/system.md` | principles, the two registers, rules (white = answer, tone, luminance caps, action colour follows surface), component anatomy, bans kept/lifted with the owner's verdicts, push procedure. **Token names only, no values.** | people, agents |

Theme-colour is not a TS literal. `features/chrome/ThemeColorSync` and the bootstrap write `meta[name=theme-color]` from `getComputedStyle(documentElement).getPropertyValue('--paper')` on load and on theme change. There is no build-time token parser, no generated file, and no parity test, because there is no second copy.

### 7.2 Specimens and the bundle (from the design-system step on)

- **Specimens.** Each `ui/` block gains a co-located `*.specimen.tsx` when it is built. There is no gallery before its subject exists (L42). Fixtures (3- and 4-answer examples, tallies, long strings in `hi`/`ru`/`ja`) live in `src/ui/specimen-fixtures/`. ESLint forbids importing them from `app/`, `features/`, `stages/*/engine.ts` and `domain/` (critique G17).
- **The bundle.** `scripts/design-bundle.ts` (run with `tsx`) renders every specimen with `renderToStaticMarkup` into `.design-bundle/` (gitignored). Each specimen is a complete static document: `<html data-theme data-motion="full">`, a link to `fonts.css` and `index.css`, and no script. The script byte-copies every CSS file, copies `docs/design/system.md` as `README.md`, writes `SKILL.md` (how to use v3, plus one line saying the repository owns the definition), and writes `BUILD.json { commit, builtAt, files: [{ path, sha256 }] }`. It verifies its own hashes.
- **Tests on the bundle.** Playwright `tests/e2e/specimens.spec.ts` opens every specimen and runs axe and rendered-contrast checks locally. Pixel comparison runs only in CI (§9.4).

### 7.3 Claude Design

- **Project.** A new design-system project, "VIVE Design System v3", is created with `DesignSync create_project`. `cd630eec` (v2) stays untouched as the legacy record, and `ee2fb724` and `825385f6` are unchanged.
- **What is pushed.** Exactly the bundle: CSS byte copies, specimens, `README.md`, `SKILL.md`, `fonts/PretendardVariable.woff2` and `BUILD.json`. The invariant is that `list_files` equals `BUILD.json.files`.
- **Push procedure.** `list_files` → `finalize_plan` (writes = bundle globs, deletes = files no longer in `BUILD.json`) → `write_files` → verify set equality and that `get_file BUILD.json` names `HEAD`. SVGs are compared by drawing, not bytes. `_ds_manifest.json` is never a check.
- **Actor and trigger.** The agent that lands a unit touching `src/ui/**`, `src/stages/**/*.css`, `docs/design/**` or a content palette runs the bundle and the push in the same unit.
- **Owner actions.** Zero recurring. The owner approves allowing `DesignSync` in `.claude/settings.json` once; until then each push shows one permission prompt, which is an approval, not labour.

---

## 8. Content and i18n

### 8.1 Locale model (AD-03)

```ts
// src/i18n/locales.ts — pure
export const LOCALES = ['en', 'kr', 'zs', 'zt', 'ja', 'es', 'fr', 'pt', 'de', 'hi', 'id', 'ru'] as const;
export type Locale = (typeof LOCALES)[number];  export const DEFAULT_LOCALE: Locale = 'en';
export const isLocale = (s: string): s is Locale => (LOCALES as readonly string[]).includes(s);
const DISPLAY = { kr: 'ko', zs: 'zh-Hans', zt: 'zh-Hant' } as const;
export const displayTag = (l: Locale): string => (DISPLAY as Record<string, string>)[l] ?? l;   // <html lang> and next-intl's locale
export function resolveAlias(segment: string): Locale | null;      // legacy table restated in docs/spec/platform.md; never a canonical code
export function negotiate(i: { cookie?: string; acceptLanguage?: string }): Locale;   // cookie → Accept-Language (ko* → kr, Hans → zs, Hant/TW/HK/MO → zt) → en
```

```ts
// src/i18n/request.ts — next-intl for messages and formatting only
import * as rootParams from 'next/root-params';
import { getRequestConfig } from 'next-intl/server';
export default getRequestConfig(async () => {
  const code = await rootParams.locale();                       // product code; the root layout's dynamicParams=false guarantees validity
  if (!isLocale(code)) throw new Error(`unreachable locale ${code}`);
  return { locale: displayTag(code), messages: (await import(`../messages/${code}.ts`)).messages };
});
```

`<html lang>` is `displayTag(code)`. The `og:locale` and every `Intl` call inside next-intl use the display tag. URLs, storage, cookies and telemetry use the product code. The only bridge is `displayTag()`, and it is used in exactly two places: the root layout and `request.ts`.

### 8.2 Message catalogues

- **Format.** `src/messages/en.ts` exports `messages` as the base (`as const`), and `type Messages = DeepStrings<typeof messages>`. Each other locale file is `export const messages = { … } satisfies Messages`, so a missing or extra key is a compile error (no parity test). `declare module 'next-intl' { interface AppConfig { Messages: Messages } }` types every `t()` key.
- **Namespaces**, set in the specs, not here: `meta`, `landing`, `window`, `test`, `gate`, `share`, `vote`, `result`, `recovery`, `history`, `blog`, `consent`, `a11y`.
- **Delivery.** `NextIntlClientProvider` in the root layout inherits the messages. `ui/` never calls `t()`; features translate and pass strings as props.
- **Translation.** The agent translates UI chrome for 12 locales with a glossary in `docs/spec/platform.md` (critique G7). The launch-locale set for test content belongs to O3.

### 8.3 Content source (owner decision O3)

| | (a) Repo-owned typed content (**recommended**) | (b) Google Sheets as the CMS, done right |
|:---|:---|:---|
| Authoring | `src/content/tests/<id>.ts` via `defineTest()`, one file per test with all 12 locales side by side; catalogue order and attributes in `content/catalog.ts` | Three sheets (Landing, Questions with `sheet = variantId`, Results) edited by the owner or a translator |
| Pipeline | none: `next build` compiles and validates | `.github/workflows/content-import.yml` (workflow_dispatch, optionally scheduled) reads Sheets with the existing service-account secret, writes `src/content/tests/*.generated.ts` deterministically, runs the full gate, and pushes a `claude/content-import-<date>` branch. An agent session lands it by the normal squash. The workflow never writes `main`. |
| Validation | compile rules at build (§5.3) | the same compile rules, run in the workflow before push; a failing sheet yields a red run and no branch |
| Who changes content | agents, from the owner's feedback in chat; the diff is reviewable; typed | the owner edits cells; agents land the import |
| Recurring owner actions | 0 | 0 if the owner already wants to edit Sheets (that edit is the owner's own chosen activity); otherwise each content change is a Sheets edit plus waiting for an agent landing |
| Cost to the codebase | none | generated files (and their "never hand-edit" rule), a workflow, a secret in use, and a mapping from sheet columns to 2–4-option questions and palettes that Sheets was never shaped for |
| Evidence | legacy questions never reached runtime from Sheets; production used in-repo fixtures (critique §3 #2) | the legacy `sync.yml` ran 209 times with 0 successes (critique §3 #1) |

The recommendation is (a). It has zero code-level cost, full typing of 2–4 options and palettes, and review by diff. Option (b) remains possible later without any architectural change, because an importer writes the same `content/tests/` files. If the owner picks (a) and later drops Sheets for good, the unused `GOOGLE_SHEETS_SA_KEY` secret is one deletion the owner performs, because credential handling is the owner's.

### 8.4 Localization rules

- **Content fallback.** `Localized<T>` requires `en`; `pick(v, l) = v[l] ?? v.en` runs in `content/project.ts`, so the client never sees a missing string (REQ-F-026).
- **Per-variant instruction.** Each variant has its own instruction text; there is no generic fallback (compile rule).
- **Number format.** Counts use next-intl's formatter with the display-tag locale, with no `k`/`m` abbreviation. A 12-locale E2E asserts that locale-varying output actually varies (L58).
- **Wrapping.** Text wraps with `word-break: keep-all` plus `overflow-wrap: anywhere` and `text-wrap: balance` for display type (`base.css`). The 12-locale overflow check runs at 360 px for bands, signs, pills and the share card.

---

## 9. Testing and gates

### 9.1 Layers

| Layer | Runner | Asserts | Named by |
|:---|:---|:---|:---|
| `src/domain/*.test.ts` | vitest (node) | every spec rule as table cases. `fast-check` properties: result codec round-trip, legacy fixture decode, advance-one, "no transition removes an answer", percentages sum to 100, exactly one terminal per window open. | `DOM-*`, `PRV-*` |
| `src/domain/compile.test.ts`, `src/content/content.test.ts` | vitest (node) | one failing fixture per `CNT` code; the real catalogue compiles; PAL-1…7 over every test | `DOM-CNT-*` |
| `src/i18n/*.test.ts`, `src/lib/routes.test.ts` | vitest (node) | alias and negotiation table; `routeRequest` table; path builders | `PLT-*` |
| `src/client/run-session.test.ts` | vitest (node, fake `SessionIO`) | effect order; atomic `clearRun`; one `attempt_start` under double subscribe; refusing storage leads to `degraded` and the flow continues; opt-out drops the queue and rotates the id | `DOM-*`, `PRV-*` |
| `src/features/window/window-machine.test.ts` | vitest (node) | every `WState × WEvent`; `uaAnimated` jumps | `EXP-*` |
| `tests/e2e/*.spec.ts` | Playwright against `next start` | the §4.4.3 lifecycle rows; gate-matrix rows; Esc twice; system back and forward; reduced motion → D; the 19 input patterns on every stage; 3/4 answers through `debug` demos; 12 locales at 360 px; no hydration errors; server-HTML 404 and recovery bodies; no-JS vote; the internal link crawl (every link on every static page per locale returns 200 or 3xx, replacing the legacy route-citation guard) | tags `@smoke @window @test @consent @share @i18n @errors @a11y` |
| `tests/e2e/specimens.spec.ts` | Playwright | axe and rendered contrast on every specimen (local and CI); pixels in CI only | — |
| `tests/repo.test.ts` | vitest | `vercel.json` freeze keys (deleted in the launch commit); `src/middleware.ts` absent | — |

vitest includes `src/**/*.test.{ts,tsx}` and `tests/*.test.ts` from day one (L35), with an explicit timeout on any slow test (L50).

### 9.2 Playwright projects

| Project | Device | Role |
|:---|:---|:---|
| `mobile-webkit` | iPhone profile, `hasTouch`, `isMobile` | primary; every tag |
| `mobile-chromium` | Pixel profile | every tag |
| `desktop-chromium` | 1280×800 | the centred column (O1 default), keyboard and pointer parity, `@smoke @a11y @window` |

Project names never change. `snapshotPathTemplate` is set explicitly on day one (L24). The server mode is always a production build via `next start`, never `next dev` (L32). `document.fonts.ready` and `animations: 'disabled'` apply before any capture (L28).

### 9.3 CI workflow (`.github/workflows/ci.yml`)

- **Triggers:** push to `claude/**` and `main`. It is a public repository, so minutes are free.
- **Job `gate`** (ubuntu-latest, Node 24): `npm ci` → `npx playwright install --with-deps chromium webkit` → `npm run gate`, which is `lint → lint:css → typecheck (next typegen && tsc --noEmit) → test → build → e2e`.
- **Job `visual`** (added with the first specimen; container `mcr.microsoft.com/playwright:v1.63.0-noble`): runs the specimen suite with `updateSnapshots: 'none'`, so a missing baseline fails and nothing is written (NN F22).
- **`visual-baselines.yml`** (`workflow_dispatch`, input `branch`): regenerates specimen baselines in the same container and commits them to that branch, never to `main`. The agent dispatches it with `gh workflow run` and shows the old and new renders side by side in its report (JX G9). Owner actions: 0.

### 9.4 Pixels

Pixel baselines exist only for specimens (about 20–40 cards), because specimens are deterministic: no data, no motion, no network. They render and compare only in the CI Linux container, and local runs skip `toHaveScreenshot`. App pages are asserted through the DOM (geometry, computed style, state attributes, `data-result-branch`), never by pixels.

### 9.5 The single Done gate

`npm run gate` is Done, and it is identical locally and in CI except for pixel comparison. The E2E runs all three projects. A unit lands only when `gate` is green on its branch and again on the squash commit.

### 9.6 Budgets (numbers owned by `docs/spec/platform.md`, asserted in E2E or CI)

| Budget | Initial value | Where asserted |
|:---|:---|:---|
| CSS total | ≤ 20 KB gzip | CI build step (reads `.next` CSS sizes) |
| Landing first-load JS (excluding stage chunks) | ≤ 130 KB gzip | CI build step |
| Stage chunk each | ≤ 25 KB gzip (J canvas world included) | CI build step |
| Edge requests per first landing view | measured on first landing; then capped at +10% (Hobby 1 M/month; font slices dominate) | E2E request log |
| Proxy invocations | 1 per document request; 0 for prefetches | E2E request log |
| CLS | < 0.05 at 360, 390 and 430 px widths | E2E `layout-shift` entries |
| LCP image | never lazy; first card cover is CSS, not an image | review of the landing |
| E2E wall time | ≤ 8 min on the CI runner | CI |

---

## 10. Traceability

### 10.1 Requirement groups (`contracts.md` §4.1–§4.8) → modules

| C§ | Requirement | Module / route | Proof |
|:---|:---|:---|:---|
| 4.1 | Route surface; every page under `[locale]`; one prefix | `app/[locale]/**` (root layout), `lib/routes.ts` | link crawl; `@errors` |
| 4.1 | Single request entry, no business state | `proxy.ts` → `i18n/entry.ts routeRequest` | `repo.test.ts`; entry table |
| 4.1 | Locale-less allowlist (+ new public routes added deliberately) | `routeRequest` allowlist | unit + `@errors` |
| 4.1 | Paths only through a builder | `lib/routes.ts` + `typedRoutes` + ESLint | lint, `tsc` |
| 4.1 | Blog list/detail; invalid or non-enterable → blog index | `blog/[slug]` static + proxy redirect | unit + E2E |
| 4.1 | Test route hosts gate and runtime; invalid → `/test/error?variant=` without a session | proxy redirect; `test/[variant]`; `test/error`; `features/recovery` | `@errors` server HTML |
| 4.1 | Result route; arrival by `replace`; Back → page before the test | `domain/result.ts`, `navigate` effect → `router.replace` | `@test` |
| 4.2 | 12 codes canonical for URL, storage, telemetry; BCP 47 `<html lang>` | `i18n/locales.ts displayTag` | unit + `@i18n` |
| 4.2 | Accept-Language normalisation; aliases incl. region-beats-script | `i18n/locales.ts negotiate/resolveAlias` (owned table) | unit table + SP-3 |
| 4.2 | Messages; key parity ×12 | `messages/*.ts satisfies Messages` | `tsc` |
| 4.2 | Content localisation with `en` fallback; per-variant instruction | `content/project.ts pick`; compile rule | unit |
| 4.2 | Locale number format, no k/m | next-intl formatter with display tag | 12-locale E2E |
| 4.3 | Consent machine; SSR `UNKNOWN`; one sync after mount; in/out persisted | `domain/consent.ts`, `client/prefs.ts`, bootstrap | unit + `@consent` |
| 4.3 | Transmission gate; opt-out drops queue and ids; analytics gate | `client/telemetry.ts`, `features/consent/GatedAnalytics` | unit + E2E request bodies |
| 4.3 | Catalogue filtering; OPTED_OUT notice with hidden count; no pre-hydration flash | `domain/catalog.ts` + pre-paint CSS + `ConsentNotice` | unit + no-flash E2E |
| 4.3 | Instruction consent matrix incl. unreachable and deep-link OPTED_OUT rows; CTA invariants | `domain/gate.ts` + `InstructionDialog` | exhaustive unit + `@consent` |
| 4.3 | Esc never writes; no-op on instruction; Back on qualifier | run rows + `Dialog escape='swallow'` | unit (`effects.length === 0`) + Esc-twice E2E (SP-7) |
| 4.3 | Recall semantics | `domain/consent.recall`, `features/consent/ConsentPanel` (O4 surface) | E2E when built |
| 4.4 | Event set: `landing_view` once per locale:route, `card_answered`, `attempt_start` (not on resume), `question_answered` (never re-fire `scoring1`), `final_submit`, `result_viewed` by IO | run effects; landing; `features/result` IntersectionObserver | unit + request-body E2E |
| 4.4 | Common and per-event fields; canonical index vs scoring ordinal never mixed; `session_id` null only before `attempt_start` | `domain/telemetry.ts` zod + brands in drafts | unit |
| 4.4 | Payload hygiene; forbidden legacy keys | `.strict()` schemas | unit |
| 4.4 | Anonymous id `randomUUID → getRandomValues → none` | `client/telemetry.ts` | unit |
| 4.4 | `POST /api/telemetry` 400/204; sink; retention (O2) | `app/api/telemetry`, `server/telemetry-sink.ts` | E2E |
| 4.4 | Dwell accumulated across revisits | `RunRecord.dwellMs`, `enteredAt` | unit |
| 4.5 | Key registry and continuity | `client/keys.ts` (3 legacy keys kept) | unit (legacy value parse) |
| 4.5 | Safe storage, degraded mode | `client/storage.ts`, `RunView.degraded` | unit (refusing store) + E2E with storage blocked |
| 4.5 | Theme preference before paint; System clears | `client/bootstrap.ts`, `prefs.useTheme` | no-flash E2E |
| 4.5 | Variant-scoped atomic cleanup incl. result commit (legacy gap closed) | `clearRun` effect | unit |
| 4.6 | Attributes; enterable set | `domain/catalog.ts` | unit |
| 4.6 | Canonical index vs scoring ordinal vs Q label | `domain/ids.ts` brands | `tsc` + unit |
| 4.6 | 2–4 options, poles, binary scoring, odd counts, `axisCount ∈ {1,2,4}` | `domain/compile.ts`, `domain/scoring.ts` | unit |
| 4.6 | Qualifiers (egtt) in the modal; token appended to type segment | `gate.ts` qualifier steps, `derive()` | unit + E2E |
| 4.6 | Entry paths; runtime entry commit; staged entry (7 min) | `domain/entry.ts`, run commit rows | unit |
| 4.6 | Commit failure (3 actions) | `commitFailed` phase | unit + E2E |
| 4.6 | `instructionSeen` lifecycle | `GATE_EFFECTS`, `clearRun` | unit |
| 4.6 | 150 ms lock, auto-advance, no 다음, last question selected | run rows + `view.ts` | unit + E2E |
| 4.6 | Advance exactly one after revisit (owner) | `advanceDue` row | unit + `@test` on all stages |
| 4.6 | Revisit mark (text, not `aria-checked`); retention; eligibility; progress incl. pre-answer; bar + %, never N of M | `view.ts`; `Rail`; `PrevMark` | unit + axe |
| 4.6 | 30-min timeout at re-entry; structure change after deploy | `classifyEntry` + `structureHash` | unit |
| 4.6 | ≥ 5 s derivation loading and back-from-loading (O5) | `minDerivationMs` context value (default 0 until decided) | unit both ways |
| 4.6 | Result payload, cases, ordered validation, no partial render | `domain/result.ts`, result page | unit (legacy fixture) + `@errors` |
| 4.6 | History list-only, max 50, status at read | `domain/history.ts`, `client/run-history.ts`, `features/history` | unit + E2E |
| 4.6 | Recovery page: ≥ 1 forward path, ≤ 2 not-completed cards in catalogue order | `features/recovery` + `recoveryCards(catalog, completedSet(history))` | E2E |
| 4.6 | 404 never inside `[locale]` | route tree + ESLint + `global-not-found` | SP-1, server-HTML E2E |
| 4.6 | Content integrity; no partial activation | build-time `compileContent` | unit gate + `next build` |
| 4.7 | Locale manifest; per-locale metadata; canonical; 12 hreflang + `x-default`; `og:locale` | `[locale]/manifest.webmanifest/route.ts`, root `generateMetadata` | `@i18n` |
| 4.7 | Static brand OG; icons from one brand definition; proxy lets them through | `opengraph-image.tsx`, `icon.svg`, `apple-icon.tsx`, `brand.ts`, matcher | `@errors` 200s |
| 4.7 | robots / sitemap (previously undefined) | `robots.ts`, `sitemap.ts` (exclude `ask`, `result`, `debug`) | E2E |
| 4.7 | Consent-gated Vercel Analytics / Speed Insights | `GatedAnalytics` | `@consent` |
| 4.8 | 44 px, visible focus, semantic triggers, stable names, contrast ≥ 4.5 | `ui/` + tokens + PAL invariants | axe + unit |
| 4.8 | Keyboard independent of width and input; Esc closes expansions; skip link first; tab order = document order | `SkipLink`, stage keyboard maps, `WindowHost` keydown | `@a11y` focus walk |
| 4.8 | Dialogs trap focus and return it; system back closes overlays without leaving the page | `Dialog`, history bridge (window and sheet) | `@a11y`, `@window`, `@share` |
| 4.8 | Reduced motion keeps fades; every gesture has a tap/button path | `data-motion`, `StageProps.act`, declared keymaps | `@test` |
| §11.1 | SSR determinism; hydration warnings block release | uSES server snapshots; `suppressHydrationWarning` on `<html>` only | E2E console check (SP-5) |

### 10.2 Prototype structures → modules

| Prototype structure (P§) | Module |
|:---|:---|
| Landing deck, poster cards, kinetic title, end card, list (1.1) | `features/landing/{Deck,use-deck,CatalogList}`, `ui/deck/*`, `ui/landing/*` |
| Living field WebGL + CSS fallback, grain (3.8) | `features/landing/{Field,field-gl}`, `coverStyle`, grain as a committed static asset |
| Window: expand, Q1 by the stage, grow, shrink with content visible (1.2) | `features/window/*`, `client/history-bridge.ts`, `ui/window/WindowFrame` |
| Header band, "one title, two sizes" | `WindowFrame` + FLIP in `choreography.ts` |
| Preload at 350 ms settle; 3 s fallback Q1 (1.2) | `client/test-view.ts`, `preloadStage`, `FallbackQ1` (AD-12) |
| `vive:*` protocol (2.1) | `StageProps` (§6.3 table) + history markers |
| Hand-off and return records `vive-handoff`, `vive-landing-return` (2.2) | gone: same tree; fallback and hard-load paths use the domain's staged entry; card address `/{l}#{v}` |
| Shell: top bar, rail y / story bar x, 이전/제출, badges, prev mark, votes line (2.9–2.11) | `ui/shell/*`, `ui/answer/*`, `features/test/ShellChrome`, `StageModule.meta` |
| J 이전 riding the road (`placePrev`) with extended hit zone (2.10) | `PrevPort`, `BottomBar placement='follow'` |
| White surface = answer | component vocabulary (§6.1 rule 4) |
| Instruction centred modal, consent note, qualifier step, focus/Tab/Esc (1.4) | `InstructionDialog` = `Dialog` + `InstructionCard` + `domain/gate.ts` |
| Stages I (2–4 bands, seam drag), J (2.5D forks, gate), D (story cards, peeks, lock card) (1.3) | `stages/{split,forks,story}` |
| `stageFor` override > reduced → D > default map; J 2-answer only (2.3) | content `stage` + `resolveStage` + compile rule (no override in product) |
| Advance-one revisit (2.6) | `advanceDue` row |
| J arrival guard (2.7) | `InputGate` + `meta.arrivalGuardMs` |
| `TEST_COLORS`, `LOOK`, `CURATED`, `genSet`, `legible`, `toneFor` (3.4–3.5) | content palette + `domain/palette.ts` + `paletteScope` |
| Motion inventory (3.7) | tokens (§6.8) + choreography + stage engines |
| Share sheet, coach, 9:16 card, question → card morph (1.5) | `features/share/*`, `ui/share/*`, `StageHandle.shareOrigin` |
| End-of-test art: I palette, J path (1.6) | `StageHandle.drawArt` |
| Friend page, votes, largest remainder, 「나도 이 테스트 해 보기」 → the landing card (1.5) | `app/[locale]/ask/…`, `features/vote`, `server/actions/vote.ts`, `domain/share.ts`, `routes.card(l, v)` |
| `aria-live` announcements (2.15) | `client/announce.ts` + `LiveRegionHost` |
| `예시` demo tests, simulated votes, prototype chrome (1.7, 4.1) | `debug`-attribute content reachable only in QA builds; specimen fixtures; chrome not built |
| Phone column `--app-w: min(100vw, 430px)` | `tokens.css` layout tokens; all fixed layers use them (O1) |

### 10.3 Requirements deliberately changed or not implemented (each becomes a `DECISIONS.md` entry)

| Requirement | Disposition | Reason |
|:---|:---|:---|
| REQ-T §4.3/§3.9 "go to first unanswered" | replaced by "advance exactly one" | owner decision, round 2 |
| REQ-L §13.5 mobile bottom-sheet instruction | centred modal | owner decision, round 3 |
| REQ-T §3.8 exactly two options | 2–4 options with declared poles; binary scoring (interim until O5) | owner 「유연한 구조」; AD-14 |
| REQ-T §2.4 runtime lazy validation, per-variant fallback | not built | build-time compile makes them unreachable (AD-08) |
| REQ-T §2.6 mid-flow blocking error after a content deploy | the run expires (`structureHash`) and restarts cold | the same data outcome without an error screen |
| REQ-T §6.7 derivation failure UI | not built | `derive()` is total by type |
| REQ-T §3.6 qualifier recap chip (optional) | not built | owner principle 3 (no new controls during a test) |
| REQ-L §13.8 return-scroll restoration; ghost GNB swap | not built | the landing never unmounts in the window path |
| REQ-L §13.3 1600 ms destination-ready timeout | becomes the 3 s stage-ready budget with a fallback Q1 | the window replaced the route transition |
| REQ-L §1.3 "background animation 0"; `design.md` motion bans | lifted within the two registers | owner rounds 1–3 |
| C-15 unavailable card: no tap | tap shows a toast, entry still impossible | prototype; O5 default |

---

## 11. The foundation commit

### 11.1 What lands (the squash commit S on the new `main`, together with the legacy refs in one atomic push)

**Root:**

- `.gitignore`: `node_modules/`, `.next/`, `out/`, `dist/`, `coverage/`, `test-results/`, `playwright-report/`, `*.tsbuildinfo`, `next-env.d.ts`, `.env*.local`, `.DS_Store`, `.vercel`, `.design-bundle/`. Snapshot directories are never ignored (L56).
- `package.json` + `package-lock.json`: the §2.1 pins, `engines.node: "24.x"`, `packageManager`, and scripts `dev`, `build`, `start`, `lint` (`eslint .`), `lint:css` (`stylelint "src/**/*.css"`), `typecheck` (`next typegen && tsc --noEmit`), `test` (`vitest run`), `e2e` (`playwright test`), `gate` (`npm run lint && npm run lint:css && npm run typecheck && npm test && npm run build && npm run e2e`).
- `tsconfig.json`: strict, `noUncheckedIndexedAccess`, `@/*` → `src/*`.
- `next.config.ts`: `typedRoutes: true`, `experimental: { globalNotFound: true }`, `poweredByHeader: false`. There is no `images`, no `reactCompiler`, no `cacheComponents`, no `viewTransition` and no webpack customisation.
- `eslint.config.mjs`: `eslint-config-next`, `typescript-eslint`, and the per-directory blocks of §3.2 and §3.3.
- `stylelint.config.mjs`: class pattern, `color-no-hex` except `src/ui/tokens.css`, `declaration-no-important`, and the inline `vt/layered` plugin.
- `vitest.config.ts`: environment `node`; include `src/**/*.test.{ts,tsx}` and `tests/*.test.ts`.
- `playwright.config.ts`: projects `mobile-webkit`, `mobile-chromium`, `desktop-chromium`; `webServer: npm run build && npm run start` with `reuseExistingServer: false`; an explicit `snapshotPathTemplate`; `updateSnapshots: 'none'` when `CI`.
- `vercel.json`: exactly the freeze from `git-deploy.md` §4.2, `git.deploymentEnabled.main = false` plus the production `ignoreCommand`.
- `.github/workflows/ci.yml`: the `gate` job only. `visual` and `visual-baselines.yml` arrive with the first specimen.
- `README.md` (short), `AGENTS.md`, `.claude/CLAUDE.md` (pointer), and `.claude/settings.json` (allow `npm run`, `npm test`, `npx playwright`, `npx vitest`).

**Contracts:**

- `docs/DECISIONS.md` with AD-01…AD-17, one short entry each (decision, why, rejected).
- `docs/spec/{domain,platform,privacy-telemetry,experience,sharing}.md` as headed skeletons with each document's rule-ID prefix and scope. `platform.md` is complete for what the foundation implements (PLT-ROUTE, PLT-LOCALE, PLT-404 rules).
- `docs/design/system.md` as a skeleton.

**Source (real, not stubs):**

- `src/proxy.ts`.
- `src/i18n/locales.ts` + test, `src/i18n/entry.ts` + test, `src/i18n/request.ts`.
- `src/messages/{12}.ts` with the `meta` and `recovery` namespaces.
- `src/lib/routes.ts` + test.
- `src/domain/ids.ts`, `src/domain/catalog.ts` + test.
- `src/content/catalog.ts`: the real catalogue ids, attributes and blog slugs restated from the requirements and `MOCK/shared/content.js`. Test bodies arrive in step 3.
- `src/client/keys.ts`, `src/client/bootstrap.ts`.
- `src/ui/{index.css, tokens.css, base.css, fonts.css}`: paper roles and layout tokens seeded from the prototype, with type tokens provisional until the G6 render check.
- `src/app/[locale]/layout.tsx`: root layout with bootstrap, `lang`, provider, skip-link target and metadata.
- `src/app/[locale]/page.tsx`: a placeholder landing with the wordmark and intro line on paper.
- `src/app/[locale]/test/error/page.tsx`: recovery with one forward path. Cards arrive with step 6.
- `src/app/[locale]/error.tsx`, `src/app/global-not-found.tsx`, `src/app/global-error.tsx`.

**Assets and tests:**

- `public/licenses/pretendard-OFL.txt`.
- `tests/repo.test.ts`.
- `tests/e2e/smoke.spec.ts` (`@smoke`): `/` with `Accept-Language: ko-KR` redirects to `/kr`; `/ko` redirects to `/kr`; `/kr` renders `<html lang="ko">` with `data-theme` set before paint; `/en/test/nope` redirects to `/en/test/error?variant=nope` and renders a forward link in server HTML; the SP-1 paths return 404 with a styled body; no hydration errors.

**Deliberately absent from S:**

- `sync.yml`, `public/56T-ToDo.html` and every legacy file. They stay reachable at the legacy refs.
- The window, stages, domain run modules, telemetry endpoint and metadata files. They arrive in their steps.

### 11.2 Green criteria for S

- `npm run gate` is green locally and in CI on `claude/<slug>`, and again on the squash commit.
- Spikes SP-1…SP-5 have passed as tests inside the smoke and unit suites. If SP-1 or SP-4 took its fallback, the fallback is what landed and it is recorded in `DECISIONS.md`.
- `vercel.json` freeze keys are present (`repo.test.ts`). The Vercel deployment list shows no Production deployment for S, and the production fingerprint is unchanged (`git-deploy.md` §6.4).

### 11.3 `AGENTS.md` outline (≤ 150 lines, Korean-first as today)

| § | Contents | Excluded |
|:---|:---|:---|
| 0 | Scope and authority. It is the single contract for Codex and Claude Code; *how to work* belongs to the global layer. | procedure |
| 1 | Derived facts only: request entry, locale model (product code ↔ display tag), 404 rule, the one CSS entry, the Next pin with its reason | counts, versions without reasons |
| 2 | Task routing: area → spec document | section numbers of unwritten docs |
| 3 | Coding principles: the §3.2/§3.3 layer table by reference to `eslint.config.mjs`; generated ≠ hand-written; ~500-line stop | incident narratives |
| 4 | Refs (`main`, `legacy/…` tag and branch); Never; Ask-First (`proxy.ts`, root layout, `i18n/*`, `lib/routes.ts`, `client/history-bridge.ts`, `client/bootstrap.ts`, `ui/tokens.css`, `vercel.json`, `.github/workflows/**`, `package.json`, `AGENTS.md`, `.claude/*`); High-Risk (window + history bridge, dialog primitive, gate modal, input gate, reduced-motion → D, consent/telemetry, share/vote server) | wave history |
| 5 | Gate command and what each tag covers; the baseline regeneration workflow | file lists |
| 6 | Gold standards: empty until a file becomes the pattern | wishes |
| 7 | Plan fields; lifecycle by location | — |
| 8 | The four documentation layers | — |

---

## 12. Implementation roadmap

Each step lands on its own as one squash commit, with a green gate, and it moves its plan to `docs/done/` in the same commit. The owner decisions a step needs before it starts are listed. A step whose decision is still open proceeds on the stated default and keeps the seam.

| # | Step | Scope | Exit criteria | Needs from the owner first |
|:---|:---|:---|:---|:---|
| 0 | Separation | Security-bump legacy `next` (≥ 16.3.6) and verify its production build. Run the freeze rehearsal on a probe branch. Capture the prototype after the peer's V4 publish notification: `MOCK/` sources, BRIEFs, `tools/`, the regression scripts, the artifact URL and version label, to an orphan ref (or a private home per O7). | Legacy production is on a patched build and the fingerprint is recorded. The probe outcome is recorded. The prototype ref is pushed. | O7 only for where the capture lives (default: an orphan ref in this repo) |
| 1 | Foundation (S) | §11 | §11.2, with S pushed atomically with the legacy tag and branch | — |
| 2 | Specs | Restate C§4.1–§4.8, the owner-decided changes and the prototype's adopted behaviour into the five specs with stable rule IDs. Add the §10.3 entries to `DECISIONS.md`. The experience spec is written from the V4 capture. | Every §10.1 row names a rule ID. There are no counts or inventories. Each spec is ≤ ~30 KB. | — (O5 items are written as defaults with the seam named) |
| 3 | Content + domain kernel | `domain/*` complete; `content/tests/*` for qmbti, energy-check, egtt, creativity-profile (unavailable), `demo-three`/`demo-four` (debug); `content/blog/*`; `content/load.ts`, `project.ts`; the content defects flagged in `DECISIONS.md`, not silently fixed | Every `DOM-*` rule has a named passing test. A legacy result URL decodes. The real catalogue compiles. PAL-1…7 hold. | O3 source (default (a)); content correctness is flagged, not blocking |
| 4 | Platform completion | `client/{storage,prefs,telemetry,announce}`; `api/telemetry`; root metadata, manifest, robots, sitemap, icons, brand OG; `GatedAnalytics`; fonts final; the 12-locale message namespaces used so far | `@i18n`, `@errors` and consent request-body E2E are green. Budgets are measured and written into `platform.md`. | — (sink is null until O2) |
| 5 | Design-system core | G6 render check of the captured prototype with Pretendard (light/dark, 360/390/430, WebKit/Chromium), then final type tokens; `ui/` blocks shell, answer, overlay, instruction, share frame, deck, window, landing, paper, each with specimens; `scripts/design-bundle.ts`; the `visual` job and `visual-baselines.yml`; create Claude Design v3; first push | Specimens pass axe and rendered contrast. Baselines exist in CI. `list_files` equals `BUILD.json.files`. | one-time approval to allow `DesignSync` (optional; otherwise one prompt per push) |
| 6 | Test experience, page host, stage D | `run-session`, `TestExperience`, `ShellChrome`, `InstructionDialog` (full matrix), `StageHost`, `stages/story`; `test/[variant]` page host; `result/[v]/[type]` (mandatory sections with placeholder copy; error branches); recovery cards; history list page | On `mobile-webkit` and `mobile-chromium`: deep link → every gate row → answer all → result (legacy-compatible URL) → Back to the page before the test. Advance-one; Esc twice (SP-7); reduced motion → D for every test; commit failure path. | O4 only affects result copy (placeholder until then); O6 before production, not before this step |
| 7 | Stage I | `stages/split` with 2/3/4 bands, seam drag, flood, end-of-test palette art | 2/3/4-answer debug tests complete. Keyboard 1–4 / A–D and ↑/↓ work. The 19-pattern suite passes. 360 px 12-locale overflow is checked. | — |
| 8 | Landing + window | `features/landing/*`, field, list, consent notice, `features/window/*`, `client/history-bridge.ts`, `client/test-view.ts`, `api/test-view`, fallback Q1 | Every §4.4.3 row is an E2E row (SP-6). WCAG 2.2.2 settle ≤ 5 s. The landing budgets hold. No hydration errors. | O1 only if the owner wants something other than the centred column |
| 9 | Stage J | `stages/forks` (canvas world from the card's materials, signs, gate, `PrevPort`, arrival guard) | The 19 patterns plus the edge suite pass on WebKit and Chromium. Focus order, zoom and screen-reader checks for the moving 이전 and the spatial 제출. Stage chunk budget holds. | — |
| 10a | Share sheet | `features/share/*`, story card, question → card morph, end-of-test path/palette art, share telemetry | Sheet open/close by every path including system back, with no dangling entry. The test never advances while open. Focus returns. Link shape. | — |
| 10b | Votes and friend page | `server/vote-store.ts` adapter, `actions/vote.ts`, `api/ask/[share]`, `ask/…/[share]` page, static ask OG (SP-8), vote line | No-JS vote in a `javaScriptEnabled: false` context. Duplicate vote rejected. Tally sums to 100. OG exists for every (locale, variant, question). | **O2** (store, expiry, domain); **O6** before production |
| 11 | Surfaces the prototype never drew | Consent banner + recall panel, menu (locale, theme, privacy recall), blog list/detail, history visual, privacy/terms, result content, post-submit transition, desktop presentation | Each surface has E2E + axe + specimens. No `debug` content is reachable from any list. | **O4**, **O6**, **O1** |
| 12 | Launch | Owner-supplied stage per test and final content; remove the freeze keys and their static check; production deploy; retire the stale project-memory notes and add one naming the legacy refs (critique G12) | Production serves the rebuild. Legacy result URLs still resolve. The fingerprint changed exactly once. | **O3** content, **O8** stage map, **O6**, owner go |

Handoff grouping, per the global rule of 2–3 documents per step group, each standalone with the shared goal, boundaries, a prior-step check, a "do not re-run" list and its own prompt:

- **Group A** (steps 0–2): `…-step1-separation-foundation.md`, `…-step2-specs.md`.
- **Group B** (steps 3–7): `…-step1-kernel-platform.md` (3–4), `…-step2-design-system.md` (5), `…-step3-test-experience-D-I.md` (6–7).
- **Group C** (steps 8–12): `…-step1-landing-window-J.md` (8–9), `…-step2-sharing.md` (10a–10b), `…-step3-surfaces-launch.md` (11–12).

One programme is in flight at a time (MD Rule 3). Steps 5 and 3–4 can overlap only if they run in separate clones and branches, because they touch disjoint trees.

---

## 13. Open decisions for the owner, and risks

### 13.1 Decisions that are genuinely the owner's

None blocks steps 0–9. Every recommended path has 0 recurring owner actions.

| # | Decision | Recommendation | Blocks |
|:---|:---|:---|:---|
| O1 | Desktop and tablet presentation | Centred phone column (430 px) on wide screens with keyboard and pointer parity. Like a phone-sized shop window on a big street: the same shop, framed. | step 11 (only if the owner wants a wide layout) |
| O2 | Votes at launch and the infrastructure behind them (store vendor via the Vercel Marketplace, vote expiry, optional custom short domain, telemetry sink and retention) | Votes at launch, backed by one managed store that also becomes the telemetry sink. Votes are anonymous functional data with dedupe and expiry. The link and 9:16 card ship regardless. | step 10b |
| O3 | Content source; content correctness (qmbti Q6 poles, energy-check's real scoring model, placeholder subtitles and rows, blog articles, result copy); launch locales for test content | Repo-owned content (§8.3 (a)). The agent restates the current content with defects flagged; the owner answers the flagged questions once. | step 3 correctness, step 12 |
| O4 | Surfaces the prototype never drew (result page, post-submit transition, menu/locale/theme, consent banner, history, blog, 404/recovery look) | One more prototype round run by an agent in the established language, then one owner review | step 11 |
| O5 | Residual conflicts: history list-only vs REQ-F-012 full; ≥ 5 s derivation loading; N-ary scoring semantics; unavailable-card tap | list-only; decide the loading with O4 (default 0 via `minDerivationMs`); N-ary semantics when a real 3–4-answer test exists (interim AD-14); toast | none (defaults are in code as parameters) |
| O6 | Legal identity for a privacy notice and terms (the consent copy promises 「약관」; votes add processing) | The agent drafts both. The owner fills 2–3 identity fields and approves. | production launch |
| O7 | Repository visibility and licence; where the prototype capture and verbatim owner feedback live | Keep public (free CI); add a licence of the owner's choice; keep verbatim feedback and the capture in a private home, cited from the public spec | step 0 (capture home), launch (licence) |
| O8 | Stage per test (I/J/D) | The owner supplies it at launch, as they said. Until then the prototype's placeholder map seeds content (`qmbti`, `egtt` → I; `energy-check` → J). The build rejects impossible assignments. | step 12 |

One one-time approval: allowing `DesignSync` in `.claude/settings.json` (step 5). It is optional; without it each push shows one prompt.

### 13.2 Risks

| # | Risk | Likelihood / impact | Mitigation |
|:---|:---|:---|:---|
| R1 | The window depends on Next's native-History integration (F1, F2), and the source carries a TODO to move to the Navigation API | medium / high | SP-6 on the pinned 16.3.6. The `@window` E2E rows run on every landing, so a regression surfaces at the gate. Fallback: once grown, `router.replace` to the page host (the run resumes from storage); only the shrink-on-Back animation is lost. |
| R2 | URL/tree divergence while windowed (a refetch swaps the landing for the page host) | low / medium | ESLint bans (§3.3); telemetry `route` from host templates |
| R3 | Native `<dialog>` close-request behaviour differs by engine (F17) | medium / medium | SP-7. An uncommitted dismissal is always exit, never consent. The share sheet syncs history on either `cancel` or `close`. |
| R4 | iOS edge-swipe Back versus D's left edge zone and J's swipes | medium / medium | `hasUAVisualTransition`; every gesture has a button path. It needs a physical iPhone, so it surfaces during the owner's normal preview review rather than as a separate task. |
| R5 | `global-not-found` under a `[locale]` root (SP-1) | low / medium | The structural fallback in §4.5 |
| R6 | WebGL field and canvas stages on low-end phones | medium / medium | capability-based fallback (SP-9); per-stage chunk budgets |
| R7 | Moving controls in J (이전 on the road, spatial 제출) | medium / high for a11y | step 9 E2E for focus order, zoom and screen reader; the extended hit zone lives in the shared `BottomBar` |
| R8 | Build-time content gate strength: a missing compile rule is missing everywhere | low / high | one failing fixture per `CNT` code; all content lands through the squash workflow that runs the gate |
| R9 | Static ask-OG count grows with locales × questions (build time), and CJK needs a static non-variable font subset inside `ImageResponse`'s budget | medium / low | SP-8; limit to launch locales if needed |
| R10 | Hobby caps (function invocations for result and ask pages; edge requests from font slices) | low now / medium at scale | budgets in §9.6; O2 revisits the plan tier |
| R11 | The prototype's J pass may still change visuals before V4 | medium / low | the experience spec and final tokens are written from the V4 capture (steps 2 and 5), never from the live scratchpad |
| R12 | Result links already in the wild | low / high | legacy-format fixture in step 3 exit criteria; codec decode kept forever |

---

## Appendix A — Graft and correction ledger

### A.1 Judge grafts

| Source | Graft | Disposition |
|:---|:---|:---|
| JM G1 | Window = intercepting `@window` slot | **Rejected**: AD-01; JX V3/V4/V7 |
| JM G2 | No static route under `test/`; recovery in place | **Rejected**: no interception, so no shadowing; the legacy redirect is kept (AD-05) |
| JM G3 | Presence snapshot for every exit | **Rejected**: JX V3. The live landing tree gives the same outcome. |
| JM G4 | `satisfies Messages` | Adopted (§8.2) |
| JM G5 | `server-only`/`client-only` + ESLint, one `tsconfig` | Adopted (§3) |
| JM G6 | next-intl `createNavigation` as the only builder; `typedRoutes` off | **Modified**: `lib/routes.ts` + `typedRoutes` on (AD-04) |
| JM G7 | zod telemetry, A–D, `stage` | Adopted (§5.11) |
| JM G8 | Brands; total `derive` | Adopted (§5.2, §5.5) |
| JM G9 | One pure `step`, normative table | Adopted (§5.9) |
| JM G10 | Effects inside dispatch in one module | Adopted (§5.14) |
| JM G11 | `structureHash` | Adopted (§5.7) |
| JM G12 | Four trust boundaries; compile with all errors | Adopted (AD-08, §5.3) |
| JM G13 | Keep 3 legacy keys; codec byte-compatible | Adopted (§5.12, §5.15) |
| JM G14 | Pure `ui/` views | Adopted (§6.1) |
| JM G15 | `paletteScope`, `coverStyle`, PAL invariants | Adopted, with the invariants as compile rules (§6.9) |
| JM G16 | Native dialog; share sheet without a history entry | **Modified**: native dialog adopted; the share sheet owns a same-URL entry through the single bridge (AD-10; JF V8) |
| JM G17 | `StageModule` | Adopted (§6.3) |
| JM G18 | 150 ms lock in the domain + one `InputGate` | Adopted with a per-stage arming point (§6.3) |
| JM G19 | Plain CSS, one idiom, stylelint | Adopted (AD-09) |
| JM G20 | Concrete `data-theme`; `data-motion` | Adopted |
| JM G21 | Pre-paint `data-consent` | Adopted (§6.5) |
| JM G22 | Static OG from enums; Server Action vote; client share id | Adopted (§6.7, step 10b) |
| JM G23 | Specimens only for `ui/` blocks, added with each block, CI-only pixels | Adopted (§7.2, §9.4) |
| JM G24 | Drop the fallback Q1 | **Modified**: kept as a composition of `ui/answer` primitives + staged-entry hard navigation (AD-12) |
| JM G25 | Five specs + design system | Adopted (AD-17) |
| JF 1 | Run table with `commitFailed`, `minDerivationMs`, `attemptStarted`, dwell, atomic `clearRun` | Adopted (§5.9) |
| JF 2 | Brands + strict zod; `landing_ingress_flag`; no re-fire of `scoring1` | Adopted (§5.11) |
| JF 3 | Legacy-compatible codec, `data-result-branch`, legacy fixture | Adopted (§5.12) |
| JF 4 | Recovery cards from completion; keep the redirect | Adopted (§5.4, AD-05) |
| JF 5 | Owned normalisation table; product codes as locales; `NEXT_LOCALE` kept | Adopted, with next-intl on the display tag (AD-03) |
| JF 6 | Live grow/shrink; fallback Q1; card address; `inert` | Adopted (§4.4) |
| JF 7 | Share-sheet history entry | Adopted as a marker on the same URL (AD-10) |
| JF 8 | No-JS vote; httpOnly voter; lazy box; OG from validated ids | Adopted (step 10b) |
| JF 9 | Sharing does not depend on votes | Adopted (§6.7) |
| JF 10 | Exact motion tokens, two registers, concrete theme | Adopted (§6.8) |
| JF 11 | Palette as data, one mesh | Adopted (§6.9) |
| JF 12 | `railColor`, `chromeTone`, `PrevPort`, `shareOrigin`, `drawArt`, `StageMeta` | Adopted (§6.3) |
| JF 13 | `InputGate` per stage; reject a global 350 ms | Adopted |
| JF 14 | `data-motion` single source | Adopted |
| JF 15 | `forks` with > 2 options fails the build | Adopted (AD-14) |
| JF 16 | 3–4-answer demos reachable in the real app outside production | Adopted (`debug`, QA audience) |
| JF 17 | Intercept hazards | Moot (no interception) |
| JF 18 | robots/sitemap, `x-default`, link crawl, locale manifest | Adopted (§4.1, §9.1) |
| JF 19 | "Deliberately not implemented" list | Adopted (§10.3) |
| JF §7 gaps | `aria-live`; hydration of `<html>` attributes; skip link; share icon before commit | Adopted (§6.10, §6.7) |
| JX G1 | History-API window | Adopted (AD-01) |
| JX G2 | Proxy redirects unknown ids | Adopted (AD-05) |
| JX G3 | Kernel + engine through ports | **Modified**: collapsed into `run-session.ts` with one `SessionIO` (AD-07) |
| JX G4 | Native dialog, no `?ask` entry | **Modified**: see JM G16 |
| JX G5 | Concrete `data-theme` | Adopted |
| JX G6 | Product-code segment + prefetch-skipping matcher | Adopted (§4.3) |
| JX G7, G8 | `InputGate`; `StageModule` | Adopted |
| JX G9 | CI-only pixels + a regeneration workflow | Adopted (§9.3) |
| JX G10 | Static OG + Server Action vote | Adopted |
| JX G11 | Typed messages, markers, link crawl, TS 5.9, freeze, React Compiler off | Adopted |
| JX G12 | Codec, keys, `structureHash`, forks build error | Adopted |
| JX G13 | `hasUAVisualTransition` | Adopted (AD-13) |
| JX G14 | No refresh or Server Action in the window; route from window state | Adopted (§4.4.5) |
| JX G15 | Capability-based performance fallback; edge-request budget | Adopted (§6.5, §9.6) |
| JX scorecard #11 | `requestIdleCallback` → `setTimeout` | Adopted |

### A.2 Wrong or outdated claims, and how this design fixes them

| Claim (proposal) | Found by | Fix here |
|:---|:---|:---|
| `(deck)` group scopes interception (DSF §8.1) | JM W1, JF 1, JX W4 | no interception at all |
| `test/error` beside an interceptor (DSF) | JM W2, JX | no interception; the static sibling is fine |
| `use-presence` keeps slot content (DSF §8.2) | JX W5 | the live element stays in the landing tree |
| `<ViewTransition>` canary-only (DSF F11) | JM W3, JF 2, JX W6 | stable in 19.3; unused by decision |
| `setRequestLocale` needed everywhere (DSF F8) | JM W3, JX W7 | `next/root-params` in `request.ts` |
| Overlays own no entry; system back leaves the test (DSF §8.4) | JF 8 | the share sheet owns an entry (AD-10) |
| Global 350 ms arrival guard (DSF) | JF | per-stage arming (§6.3) |
| `router.back()` closes animate as a VT share morph (NN §5.2/§5.5/§8) | JX W1, JF 3 | WAAPI on the live element, driven by `popstate` |
| Unknown ids render recovery in place under a generated segment (NN §5.1/§5.3) | JX W2/W8, JM W6 | proxy redirect (AD-05) |
| `experimental.viewTransition` needed (NN §10) | JM W4 | not configured |
| Recovery cards from `vt:run:*` (NN §7.9) | JF 4 | from completion history |
| "No 5 s loading" decided as default (NN) | JF | `minDerivationMs` parameter (O5) |
| Best-fit negotiation equals the legacy table (NN) | JF | owned table in `i18n/locales.ts` |
| `launch.take()` during render (NN) | JF | no launch mark; history markers |
| `useReducer` events drained by one effect (NN §7.5) | JM, JX | `dispatch` executes effects (AD-07) |
| "Static for enterable, redirect for others" under root `dynamicParams=false` (DC §8.4) | JX W3 | the redirect happens in the proxy, before routing |
| `dynamicParams = true` on a page overrides the root `false` (DC §15) | JX V7 | not relied upon |
| 3–4 options mapped to poles is "no invented semantics" (DC D8) | JF 6 | recorded as interim semantics pending O5 (AD-14) |
| Intercept rejected because "the URL must change on card open" (DC D3) | JM W5, JF 7 | the rejection now rests on V1/V3/V4/V7 only |
| `light-dark()` token file (DC, NN) | JM V7, JX G5 | concrete `data-theme` (AD-09) |
| `votes = null` hides the ask icon (DC) | JF | sharing ships without votes (§6.7) |
| Share sheet vs system back unspecified (DC) | JF | AD-10 |
