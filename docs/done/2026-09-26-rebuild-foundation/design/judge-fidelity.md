# Judgement — fidelity lens

Judge report, written 2026-09-26 (read-only; nothing under `/Users/woohyeon/Local/ViveTest` or the prototype scratchpad was modified). Lens: which architecture most faithfully and completely realises **both** the prototype (window, shell, stages I/J/D, instruction modal, share/vote, motion, reduced motion → D, per-test colour continuity, owner principles) **and** the surviving legacy requirements (`contracts.md` §4.1–§4.8). Read in full: `arch-domain-core.md` (DC), `arch-next-native.md` (NN), `arch-design-system-first.md` (DSF); inputs `contracts.md` (full), `critique.md` (full), `peer-handoff-2026-09-26.md`, `prototype.md` §1–§2 (surfaces, window protocol, shell, keyboard, focus, a11y limits). Legacy requirement text was re-read at source where a proposal's reading was in doubt (`docs/req-test.md` §6.1, §9.1; `docs/req-landing.md` §6.4, §12.1; `docs/req-landing-interaction.md` §8.5). Framework claims the proposals disagree on were checked against context7 and the installed `next@16.2.4` source (§1).

---

## 0. Verdict

| Proposal | Score (fidelity, 1–10) | One-line reason |
|:---|:---:|:---|
| **DC — domain core** | **8** | Most complete and most correctly read legacy requirements (item-level traceability, every run-machine row cites its rule); the window keeps every prototype behaviour live (grow, live shrink, fallback Q1, card address) and fixes the prototype's own "system back does not close" limit. Loses points on the share sheet vs system back, thin visual/motion fidelity and an invented N-ary scoring semantic. |
| **NN — Next-native** | **7** | Best on platform/sharing requirements (no-JS friend vote in in-app browsers, `?ask` sheet history, static per-question OG, `.strict()` telemetry, SEO) and the only one that designed out the verified interception traps; but drops the prototype's fallback Q1, makes the owner-approved shrink a snapshot that depends on a Next TODO, misreads the recovery-card rule, delegates the legacy locale-normalisation table to a library heuristic and decides an owner item (5 s loading) away. |
| **DSF — design-system first** | **6** | Highest visual/motion fidelity to the prototype (exact motion values, palette-as-data with a single poster-mesh definition, white-surface rule by vocabulary, `drawArt`/`shareOrigin`, `railColor`/`chromeTone`), but the thinnest requirements coverage (group-level traceability; telemetry, staged entry, commit failure, loading, recovery cards absent), one routing claim contradicted by Next's source, and a history model that makes system back leave the test from the share sheet — against a legacy a11y rule and the owner's explicit "don't lose the test when sharing". |

**Recommended base under this lens:** DC's kernel/run machine and client-owned window, with the NN sharing/overlay/platform grafts and the DSF design-system/stage-contract grafts listed in §5. Other lenses (Next idiom, cleanliness) may weigh the window mechanism differently; §2.3 states what the fidelity lens requires of whichever mechanism is chosen.

---

## 1. What I verified (and how)

| # | Question the proposals disagree on | Finding | Source |
|:---|:---|:---|:---|
| V1 | Does a route group `(deck)` around `@window/(.)test/[variant]` limit interception to the landing (DSF §8.1)? | **No.** `extractInterceptionRouteInformation` runs `normalizeAppPath` on the intercepting part, which strips `(deck)` and `@window`, so the intercepting route is `/[locale]`; `generateInterceptionRoutesRewrites` then rewrites the `Next-Url` header regex's optional trailing slash to `(?:/.*)?`, i.e. **any descendant** of `/[locale]` (blog, history, result, recovery) triggers the intercept. DC F3 and NN F5 found the same independently. | `node_modules/next/dist/shared/lib/router/utils/interception-routes.js`, `node_modules/next/dist/lib/generate-interception-routes-rewrites.js` (next 16.2.4, read-only) |
| V2 | Do interception rewrites outrank a static sibling such as `test/error/page.tsx` (NN F6)? | **Yes.** "Interception routes are modelled as beforeFiles rewrites" and are pushed into `rewrites.beforeFiles`. | `node_modules/next/dist/build/index.js:716–717` |
| V3 | Is React `<ViewTransition>` stable (NN F13, DC F12) or canary-only (DSF F11)? | **Stable in React 19.3** per the react.dev blog of 2026-09-09; the reference page's frontmatter still says `version: canary`, which is what DSF read. | context7 `/reactjs/react.dev` — `blog/2026/09/09/react-19-3.md`, `reference/react/ViewTransition.md` |
| V4 | Does a browser-back restore run inside a Transition (NN spike S3)? | **Today yes, flagged for removal.** `onPopState` wraps the traverse dispatch in `startTransition` next to `// TODO-APP: Ideally the back button should not use startTransition`. `router.back()` is the same popstate path, so every back-driven close shares this behaviour. | `node_modules/next/dist/client/components/app-router.js:281–301` |
| V5 | What does a slot with no matching page render on soft navigation? | The client reuses the segment that was already active in that slot; `children` is an implicit slot and needs `default.js` when Next cannot recover its active state. A `(deck)` layout reached from `/kr/blog` has no prior `children` state — the render is undefined without `(deck)/default.tsx`. | context7 `/vercel/next.js/v16.2.9` — `default.mdx`, `parallel-routes.mdx`; canary `render-tree.ts` `reuseActiveSegmentInDefaultSlot` |
| V6 | Must all slots at one level share a rendering mode (DC F1)? | **Yes** — "all slots at the same route segment level must share the same rendering behavior, meaning if one is dynamic, all must be dynamic". Relevant to NN's root-level `@window` (spike S1). | context7 `/vercel/next.js/v16.2.9` — `parallel-routes.mdx` |
| V7 | Legacy recovery-card rule (NN §7.9 reads `vt:run:*`) | Cards are **tests the user has not completed**, catalog order, filtered by completion history (`req-test.md:874–878`, `:1220`, check 1 at `:1317`). Active-run records do not express completion (they are deleted at result commit). | `docs/req-test.md` |
| V8 | Legacy system-back rule for overlays | 「시스템 뒤로가기는 오버레이 층 전부를 닫는다 … 뒤로가기 자체로 닫힌 경우에는 거두지 않는다」 (`req-landing-interaction.md:163`); 「뒤로가기로 닫는 동안 페이지를 떠나지 않는다 — 오버레이 층이 전부 같은 규칙을 쓴다」 (`req-landing.md:233`). Plus the owner on sharing: 「공유 전/후 테스트 이탈되지 않도록 훨씬 더 정교한 UX/UI/트랜지션 설계가 필요합니다」. | legacy docs; `contracts.md` §2.2 |
| V9 | `question_answered` and the landing pre-answer | 「landing pre-answered `scoring1`은 landing `card_answered`로만 기록되며 runtime에서 재발화하지 않는다」; required fields include `landing_ingress_flag`; `attempt_start` fires when the first scoring runtime question **renders**, not on resume. | `docs/req-test.md:1180–1200` |
| V10 | Prototype friend-page CTA destination | 「나도 이 테스트 해 보기」 goes to **the landing's card for that test**. The prototype window adds no history entry, so system back not closing it is a listed known limit. A landing-drawn fallback Q1 replaces a stage that is not `ready` within 3 s. | `prototype.md` §1.2, §1.5, §2.15 |

---

## 2. Fidelity matrices

Legend: **Y** faithful and specified · **P** partial or under-specified · **G** gap (not addressed) · **D** deliberate deviation (stated) · **X** deviation or error not acknowledged.

### 2.1 Legacy requirements (`contracts.md` §4) × proposal

| § | Requirement item | DC | NN | DSF |
|:---|:---|:---:|:---:|:---:|
| 4.1 | Route surface, pages under `[locale]`, single prefix, single proxy entry | Y | Y | Y |
| 4.1 | Locale-less allowlist; new routes added deliberately | Y (`routeRequest`; ask routes listed) | Y (`decideEntry`) | Y |
| 4.1 | Invalid variant → **redirect** to `/test/error?variant=`, no session | Y (redirect; static `test/error`) | D (recovery rendered in place; `error` reserved id; `?variant=` semantics dropped) | P (route listed, mechanism unstated) |
| 4.1 | Result arrival by `replace`; Back goes to the page before the test | Y | Y | Y |
| 4.2 | 12 codes canonical for URL/storage/telemetry; BCP 47 `<html lang>` | Y (product codes + `displayTag`) | P (BCP 47 internal locales; `NEXT_LOCALE` value becomes `ko`, acknowledged one-time loss) | Y (`platform/site.ts` one table) |
| 4.2 | Accept-Language normalisation incl. region-beats-script, alias redirect | Y (owned pure table) | X (delegated to next-intl best-fit; edge tags such as `zh-Hans-HK` can diverge from the legacy table; spike lists only six tags) | Y (proxy owns it) |
| 4.2 | Messages key parity ×12; content en fallback; per-variant instruction, no generic fallback | Y | Y (`satisfies`) | P (parity stated; per-variant instruction not stated) |
| 4.2 | Locale number format, no k/m | Y (`formatCount`) | Y (`getFormatter`) | G |
| 4.3 | Consent machine, SSR `UNKNOWN`, one sync after mount | Y (uSES server snapshot) | Y | P |
| 4.3 | Transmission gate; opt-out drops queue + ids; analytics gate | Y | Y | P (one line) |
| 4.3 | Catalog filtering + OPTED_OUT notice with hidden count, no pre-hydration flash | Y (`hiddenByConsent` + pre-paint CSS) | Y (pre-paint CSS) | P (`catalog-visibility.ts`, no count) |
| 4.3 | Instruction matrix incl. unreachable and OPTED_OUT deep-link rows; CTA invariants | Y (`gateSpec` 12 rows + `GATE_EFFECTS`) | Y (`planInstruction`) | P (named, not specified) |
| 4.3 | Esc never writes; no-op on instruction step; Back on qualifier | Y (machine row with zero effects) | Y | Y (keydown + cancel prevented; E2E) |
| 4.3 | Recall semantics (B0) | P (`recall`; UI deferred) | P (deferred) | P (deferred) |
| 4.4 | Event set incl. `landing_view` once per locale:route, `result_viewed` by IO | Y | Y | G |
| 4.4 | Per-event fields; canonical index vs scoring ordinal never mixed | Y (distinct brand types) | P (sketch omits `landing_ingress_flag` on `question_answered`; defers to spec) | G |
| 4.4 | `session_id` null only before `attempt_start`; `attempt_start` once, not on resume | Y (`attemptStarted`; emits at commit rather than first render) | P | G |
| 4.4 | Payload hygiene, forbidden legacy keys | Y (closed union + `validateEvent`) | Y (`.strict()` zod) | P |
| 4.4 | Dwell time accumulated across revisits (REQ-L §13.7) | Y (`dwellMs` per question) | P (field only) | G |
| 4.5 | Key registry; consent/theme/**history** keys kept for returning users | Y (three kept) | Y (four kept) | P (history key not mentioned) |
| 4.5 | Safe storage, degraded mode | Y (`KeyValue.set → boolean`, `view.degraded`) | Y | Y |
| 4.5 | Variant-scoped atomic cleanup incl. result commit (legacy gap fixed) | Y (`clearRun`) | Y (`submitted` → remove) | P (`volatility.ts` listed; result-commit trigger unstated) |
| 4.6 | Attributes/enterability; canonical index vs scoring order vs label | Y | Y | Y |
| 4.6 | 2–4 answers structurally, binary scoring only | X (maps 3–4 options onto poles = a scoring semantic; O5 defers it) | Y | Y |
| 4.6 | Qualifier steps in the modal; token appended to type segment | Y | Y | P |
| 4.6 | Entry paths, runtime entry commit, staged entry (7-min target) | Y (7-min implemented) | P (no expiry) | P |
| 4.6 | Commit-failure branch (§6.6) | Y (`commitFailed` with 3 actions) | G | G |
| 4.6 | 150 ms lock, auto-advance, no 다음, last question selected | Y | Y | Y |
| 4.6 | Advance-one after revisit (owner) | Y (`advanceDue` → +1) | Y | Y |
| 4.6 | Retention, eligibility, progress incl. pre-answer; bar + %, never "N of M" | Y | Y | Y |
| 4.6 | 30 min timeout at re-entry; structure change after deploy | Y (+ `structureHash`) | Y | P |
| 4.6 | ≥ 5 s derivation loading + back-from-loading (owner-deferred, O4/O5) | Y (kept as `minDerivationMs` seam) | X (decided "no 5 s loading" as default) | P (`phase: 'submitting'` seam only) |
| 4.6 | Result URL/payload byte-compatible; ordered validation; no partial render; case matrix | Y (11 error codes, `data-result-branch`) | Y | P (decode-forever stated; cases unstated) |
| 4.6 | History list-only, status at read, max 50 | Y | Y | P |
| 4.6 | Recovery page: ≥ 1 forward path, ≤ 2 **not-completed** cards in catalog order | Y (`recoveryCards(catalog, completed)`) | X (reads `vt:run:*`) | G |
| 4.6 | Never 404 inside `[locale]` | Y (ESLint ban) | Y | Y |
| 4.6 | Content integrity, no partial activation | Y (build-time compile) | Y (unit-gate validate) | Y |
| 4.7 | Locale manifest, metadata, hreflang, icons, static OG | Y | Y (+ `x-default`) | P |
| 4.7 | robots / sitemap | P (files listed) | Y (content defined) | G |
| 4.7 | Consent-gated Vercel Analytics / Speed Insights | Y | Y | Y |
| 4.8 | 44 px, focus visible, semantic triggers, contrast | Y | Y | Y (stylelint + specimens) |
| 4.8 | Skip link first, tab order = document order | P (table row only) | G | G |
| 4.8 | Dialog focus trap + return; focus to container | Y | Y | Y |
| 4.8 | System back closes overlays without leaving the page | P (window yes; share sheet unspecified — Back would pop the test entry) | **Y** (`?ask=1`) | **X** (overlays own no entry; Back leaves the test) |
| 4.8 | Reduced motion keeps fades; every gesture has a tap/button path | Y | Y (declared keyboard map, E2E) | Y |
| §11.1 | SSR determinism; hydration warnings block release | P (server snapshots; `<html>` pre-paint attributes vs hydration unaddressed) | P (same) | G (renders `data-theme data-motion` on `<html>` in JSX, then the bootstrap rewrites them) |
| §11.4 | Performance budget (C-12) | P | P (R5 LCP/CLS) | Y (CSS ≤ 15 KB gzip, frame-time probe, `failIfMajorPerformanceCaveat`) |

Counts over the 47 rows (Y / P / G / X+D), computed from the table: DC 40 / 6 / 0 / 1 · NN 33 / 8 / 2 / 4 · DSF 19 / 17 / 10 / 1.

### 2.2 Prototype structures × proposal

| Prototype structure (`prototype.md`) | DC | NN | DSF |
|:---|:---:|:---:|:---:|
| Landing deck (swipe browses, tap opens, no dots, nudge, ←/→), end card, list | Y | Y | Y |
| Living field WebGL + CSS fallback; WCAG 2.2.2 settle | Y | Y | Y |
| Window: Q1 drawn by the stage in the card; insets | Y | Y | Y |
| Grow to full while the stage keeps moving | Y (live) | Y (CSS on live layer) | Y (clip-path on live layer) |
| Shrink back into the **same card with content visible**, landing comes alive | Y (live element, machine `returning`) | P (VT snapshot morph via `router.back()`; relies on V4) | Y (`use-presence` keeps last slot content until done) |
| Close before answering (outside tap, 닫기, Esc) | Y | Y | Y |
| System back closes the window (prototype known limit → fixed) | Y | Y | Y |
| Forward after Back re-opens | Y (re-grows) | P (launch mark gone → opens full) | Y |
| Header band, "one title, two sizes" flight | G | P (band only) | Y |
| Fallback Q1 drawn by the landing after the stage-ready timeout | Y (also the `fail` terminal) | X (dropped; error boundary) | Y |
| Deep link `/test/{v}` = full; wordmark from full page returns to that card | Y (`/{locale}#{v}`) | Y (`launch.returnTo`) | Y (`return-hint.ts`) |
| Shell: top bar (wordmark · centred title · ask icon), rail y / story bar x, 이전/제출, badges, prev mark, votes line | Y | Y | Y |
| J 이전 follows the road (`placePrev`) with extended hit zone | Y | Y | Y (`PrevPort`) |
| White surface = answer; question never on white | G | Y (skins) | Y (by vocabulary) |
| Instruction as centred modal; consent note; egtt second step | Y | Y | Y |
| Stages I/J/D; I 3–4 bands; D side peeks + locked card | Y | Y | Y |
| J 2-answer only | D (build error, not silent J→I) | D (same) | D (same) |
| Arrival guard: J 350 ms after signs settle; value for I/D open (C-11) | Y (per-stage arming) | Y (extend only on evidence) | X (350 ms imposed on all stages) |
| Reduced motion → D, resolved once per attempt; fades ≤ 180 ms | Y | Y | Y |
| Per-test colour card → stage → 시작 → share card | Y | Y | Y (`paletteScope` + `coverStyle`) |
| J world "made of the card's materials" (sky = card cover mesh) | P | P | Y (`coverStyle` shared by card, window, J sky, fallback) |
| Motion tokens (580/440/520/560, 560/260/700, overshoot curve, 160 fade) | P (names only) | P (subset) | Y (exact) |
| Share sheet: link first, 9:16 second, never advances, focus back, "same question" toast | P (ask only; icon hidden when votes off) | Y | Y (`shareOrigin` morph) |
| End-of-test art: I palette, J path | G | P (share kinds) | Y (`drawArt`) |
| Friend page in KakaoTalk/Instagram webviews, no login; A–D; largest remainder | P (POST route needs JS) | **Y** (no-JS Server Action form) | P (route only; attribute theme helps old WebViews) |
| Friend CTA 「나도 이 테스트 해 보기」 → landing's card | Y (`/{locale}#{v}`) | X (opens the test as a layer over the friend page) | G |
| Per-question link preview | Y (static from validated ids) | Y (static, enum params) | P (`v/[id]` needs a store lookup) |
| 3–4-answer demo tests exercisable in the real app | Y (`debug`, QA audience) | Y (`debug`) | X (gallery fixtures only → no real-app E2E) |
| `aria-live` announcements (window states, question changes, progress) | G | G | G |
| Landing `inert` under the window, `aria-hidden` once full | Y | Y | G |

### 2.3 What the fidelity lens requires of the window, whichever mechanism wins

1. Q1 drawn by the stage inside the card; grow on the **live** stage; shrink on the **live** content (not only a snapshot) back into the same card; one outcome per open (close / full / fallback).
2. System back closes the window before Q1 and leaves the full test to the landing card; forward re-opens.
3. A landing-drawn fallback Q1 when the stage is late (the prototype's 3 s rule), which is also the single `fail` terminal that replaces legacy §13.3's 1600 ms timeout.
4. Deep link `/{locale}/test/{v}` starts full; its wordmark returns to that card; the friend page's CTA lands on that card.
5. Opening a test from blog/history/result must not render a window over a page without a card — this must be decided by construction, not by the `(deck)` group (V1).
6. Overlays inside the test (share sheet) close on system back without leaving the test (V8).

DC meets 1–5 and misses 6 (unspecified). NN meets 2, 4 (partly), 5, 6 and misses 3 and the live half of 1. DSF meets 1–4 and misses 5 (wrong premise) and 6 (explicit).

---

## 3. Per-proposal judgement

### 3.1 DC — domain core · 8/10

Decisive strengths:

- **Requirements are encoded where they cannot drift and each cites its source.** The run machine's transition table (§4.7.5) has a source column per row; `gateSpec` is the §13.5 matrix as a function including the unreachable `landing ingress + OPTED_OUT + available` row; `GATE_EFFECTS` is the CTA invariant list; "Esc writes nothing" is a row with zero effects. It is the only proposal that keeps §6.6 commit failure (three actions), §13.7 dwell accumulation, `attemptStarted` idempotence, the 7-min staged expiry and the §4.6/§4.7 loading/back-from-loading behaviour as a parameter (`minDerivationMs`, 0 allowed) instead of deciding the owner item.
- **Correct readings where others slip:** recovery cards from the completion set in catalog order (V7); telemetry index spaces as distinct brand types; result codec byte-compatible with eleven distinct failure codes exposed as `data-result-branch`; three legacy storage names kept verbatim so consent, theme and history survive with zero migration code.
- **The window keeps every prototype behaviour live**: grow and shrink animate the same mounted element (content visible throughout), a fallback Q1 on stage-load timeout, `/{locale}#{variant}` as the single "this card" address that the prototype's friend CTA needs, `inertLanding` and focus effects, and system Back closing the window — fixing the prototype's own listed limit.
- Item-level traceability (§10.1, ~50 rows) plus an explicit "deliberately not implemented, with reason" list that goes to `DECISIONS.md`.

Decisive weaknesses:

- **Share sheet vs system back is unspecified.** Under its history model (open pushes `/{locale}#{v}`, Q1 replaces it with `/{locale}/test/{v}`), Back while the sheet is open pops the test entry and shrinks the test to the landing — against V8 and the owner's "don't lose the test when sharing". Needs NN's `?ask` entry.
- **Visual and motion fidelity is thin:** motion tokens are named, not valued; the white-surface rule, header band and title flight, and end-of-test palette/path art are absent; `engine.votes = null` hides the ask icon, so link-first sharing and the 9:16 card disappear until O2 even though neither needs a vote store.
- **N-ary scoring:** mapping 3–4 options onto two poles under `binary_majority` is a scoring semantic, while O5 defers N-ary scoring until a real test exists (the claim "no invented semantics" is wrong, §6).
- The window rides native `pushState`/`replaceState` over a landing tree (verified integration, but its own source carries a TODO), and a hash URL at open needs a spike for Next's hash-scroll behaviour. Test content reaches the window through a bespoke static JSON route.
- `aria-live` announcements (prototype §2.15) not covered; the skip link appears only as a table row.

### 3.2 NN — Next-native · 7/10

Decisive strengths:

- **Verified the traps and designed them out** (V1, V2): root-level `@window` with a launch mark deciding window vs full, no static route under `test/`, URL-derived visibility for stale slots.
- **Sharing fidelity is the best of the three:** `?ask=1` via `pushState` so system back closes the sheet and the test never advances while it is open (V8 and the owner's anti-abandonment rule); friend vote as a `<form action={castVote}>` Server Action that works before hydration in KakaoTalk/Instagram webviews, which is exactly the prototype's build note; client-generated share id for iOS clipboard activation; vote box created lazily and bound to `(variant, question)`; per-question OG static from enum params.
- **Platform completeness:** `.strict()` zod telemetry shared by client and endpoint; robots/sitemap with defined content; `x-default` hreflang; E2E link crawl; landing `inert` + `aria-hidden` once full; item-level traceability (§12.1, ~70 rows).

Decisive weaknesses:

- **Prototype behaviours lost or weakened:** the fallback Q1 is dropped; open, close and shrink are View Transition snapshot morphs, and every back-driven close (닫기, outside tap, Esc, wordmark, deny-and-abandon, system back) rides `router.back()` → popstate-in-`startTransition`, which Next marks with a TODO to remove (V4). Its risk statement says only system back would lose the animation — wrong (§6). Forward after Back opens full, not the window; the friend CTA opens the test over the friend page instead of the landing card.
- **Requirement misreadings and deviations:** recovery cards read `vt:run:*` (V7); invalid variants render recovery in place instead of redirecting to `/test/error?variant=`; the legacy normalisation table is delegated to next-intl best-fit (region-beats-script edge cases), and `NEXT_LOCALE` changes from `kr` to `ko`; "no 5 s loading" is set as the default for an owner-deferred item.
- `launch.take(id)` is called during render in the `TestLayer` sketch (`mode = … !launch.take(id) …`). A consuming read during render is unsafe under StrictMode, concurrent rendering and the React Compiler, which NN turns on: the second render sees no mark and opens full.
- The run reducer sketch has no commit-failure branch, no dwell accounting and no staged-entry expiry.

### 3.3 DSF — design-system first · 6/10

Decisive strengths:

- **Visual and motion fidelity to the prototype is the highest:** `tokens.css` seeded with the prototype's exact values (window 580/440/520/560, stage 560/260/700, overshoot `cubic-bezier(0.2,1.32,0.32,1)`, fade 160); two motion registers with overshoot confined to manipulation settle and entrances; palette-as-data through one emitter (`paletteScope`) and **one poster-mesh definition (`coverStyle`) shared by card, window surface, header band, J sky and fallback Q1**, which is the peer's final J direction ("world made of the card's materials"); PAL-1…7 invariants including J road vs ground and the landing h1 over the field in both themes.
- **Stage contract carries the prototype's shell semantics:** pure `railColor` (I band / J trail / D card) and `chromeTone`, `PrevPort.place(x)` for J, `StageHandle.shareOrigin` for the question → share-card morph, `drawArt` for end-of-test palette/path art, and `StageMeta { maxAnswers, progress axis, submit, prev }`. The white-surface rule is enforced by vocabulary: `Question` has no surface prop.
- Header band with "one title, two sizes", fallback Q1, live shrink via `use-presence`, `Intl.Segmenter` for the kinetic title, and a concrete reason to avoid `light-dark()` on the in-app-browser WebView floor that the friend page must reach.

Decisive weaknesses:

- **Requirements coverage is the thinnest:** the traceability table has 8 group-level rows, so gaps cannot be checked item by item. Telemetry per-event fields, the session-id transport rule, `landing_view`/`result_viewed`, dwell, staged-entry expiry, commit failure, loading/back-from-loading, recovery cards, the result case matrix, history-key continuity, robots/sitemap and locale number format are all missing (§2.1: 10 gaps, 17 partial of 47 rows).
- **History model violates a legacy a11y rule and an owner mandate:** "overlays own no history entries … system back anywhere in the test leaves the test" makes system back from the share sheet abandon the test (V8). On Android the native dialog's close watcher may instead close the sheet, so behaviour also diverges by platform.
- **Wrong routing premise:** a `(deck)` group does not scope interception (V1). Soft navigation from blog, history, result or recovery is intercepted too, and the `(deck)` `children` slot has no state to reuse (V5). DSF's own step-5 E2E ("blog → test opens full page") would fail or render undefined.
- Imposes J's 350 ms arrival guard on I and D, which the owner never experienced (C-11 was open). Keeps 3–4-answer demos in gallery fixtures only, so the real-app 3–4-answer I/D interaction cannot be E2E-tested. The ViewTransition status is stale (V3).

---

## 4. Traceability-table gaps (per proposal's own tables)

| Proposal | Rows | Missing from its requirement table | Missing from its prototype table |
|:---|:---:|:---|:---|
| DC | ~50 + 18 | dwell (§13.7) as a row; SSR/hydration determinism as a row; performance budget; system-back-closes-overlays for the share sheet | white-surface rule; header band/title flight; end-of-test art; `aria-live` |
| NN | ~70 + 26 | dwell; staged-entry expiry; commit failure (§6.6); derivation loading (decided away); recovery-card data source wrong | fallback Q1 (dropped); end-of-test art only as share kinds; header-band title flight; `aria-live` |
| DSF | 8 + 22 | per-item rows for §4.3–§4.6 absent entirely; telemetry fields, session rule, dwell, commit failure, loading, recovery cards, result cases, history key, robots/sitemap, number format | `aria-live`; real-app E2E for 3–4-answer flows |

---

## 5. Grafts the final architecture must adopt

Ordered by effect on fidelity; source in brackets.

1. **Run machine as a pure transition table with a source per row** [DC §4.7]: `gateSpec` (all 12 matrix rows, including the unreachable one) + `GATE_EFFECTS`; `commitFailed` with retry-fresh / resume-previous / home; `minDerivationMs` and back-from-loading kept as a parameter until O4/O5; `attemptStarted` idempotence; per-question dwell accumulation; atomic variant-scoped `clearRun` on timeout, restart commit and result commit.
2. **Distinct brand types for canonical index vs scoring ordinal** in telemetry and storage [DC §4.2]. Adopt `.strict()` discriminated-union validation shared by client and `/api/telemetry` [NN §7.8], with `landing_ingress_flag` on `question_answered` and no re-fire of the landing `scoring1` (V9).
3. **Result codec byte-compatible with legacy links**, ordered validation, one error code per failure branch exposed as `data-result-branch`, and a legacy-format fixture in the exit criteria [DC §4.10].
4. **Recovery cards = not-completed tests in catalog order from completion history, ≤ 2** [DC `recoveryCards`]. Keep the legacy `/{locale}/test/error?variant=` redirect address [requirement §4.1].
5. **Locale normalisation as one owned pure table** (`routeRequest`, `negotiate`, `resolveAlias`, `displayTag`) with product codes as locales and `NEXT_LOCALE` values kept [DC §4.5, DSF `platform/site.ts`]. Reject library best-fit negotiation.
6. **Window behaviour set** (§2.3), realised with live elements: grow and shrink animate the mounted test, and a host keeps the last test content rendered until the shrink ends [DC window machine; DSF `use-presence`]. Include a landing-drawn fallback Q1 on stage-ready timeout as the single `fail` terminal [DC, DSF]. Use `/{locale}#{variant}` as the card address for the friend CTA and the page-host wordmark [DC]. Make the landing `inert` under the window and `aria-hidden` once full [NN, DC].
7. **Overlay history: the share sheet owns a history entry (`?ask=1` via `pushState`)**, so system back closes it without leaving the test; the stage gate is disarmed while it is open [NN §7.7].
8. **Friend vote as a no-JS `<form action>` Server Action**; httpOnly voter cookie; a client-generated share id (iOS clipboard activation); a vote box created lazily and bound to `(variant, question)`; per-question OG built only from validated `(locale, variant, question)` [NN §7.7; DC §4.12].
9. **Sharing does not depend on votes:** link-first ask and the 9:16 card ship without a vote store; only the vote line and the friend tally wait for O2 [prototype §1.5; this corrects DC's `votes = null` hiding the icon].
10. **Design tokens seeded with the prototype's exact values and two motion registers**; overshoot only on manipulation settle and entrances; a concrete `data-theme` set by the bootstrap with one dark block, no `light-dark()`, because of the in-app WebView floor [DSF §4, §9].
11. **Palette as data through one emitter and one poster-mesh definition** (`paletteScope`, `coverStyle`) used by card, window surface, header band, J sky, fallback Q1 and share card; PAL-1…7 as unit tests and content-build failures [DSF §5].
12. **Stage contract extras** [DSF §7.1]: pure `railColor` and `chromeTone`; `PrevPort.place(x)`; `StageHandle.shareOrigin` (question → share-card morph) and `drawArt` (I palette, J path end art); `StageMeta { maxAnswers, progress, submit, prev }`. Enforce the white-surface rule by component vocabulary.
13. **Arrival guard as one `InputGate` primitive with a per-stage arming point**: J arms 350 ms after its signs settle; I and D arm at the end of entry motion; the J value extends to I/D only if the 19-pattern input suite finds a double advance [DC §7.3, NN §7.5]. Reject DSF's global 350 ms.
14. **`data-motion` on `<html>` as the single reduced-motion source**, written pre-paint; the stage is resolved once per attempt and kept [NN AD-8, DSF §9.2].
15. **Stage `forks` with more than two options fails the build** rather than silently opening I. This is a stated deviation from the prototype's `stageFor` fallback, because the owner assigns stages [DC D9, NN, DSF K14 agree].
16. **3–4-answer demo tests as `debug` content reachable only outside production**, so real-app E2E covers I's stacked bands and D's stacked pills [DC, NN]. Reject gallery-only.
17. **Intercept-route hazards, if an intercepting route is chosen at all:** interception fires from every descendant of `/[locale]` (V1), so the mode must be decided by an explicit launch signal, not by a route group. The launch signal must be read without consuming it during render. No static route may sit under `test/` (V2) [NN §5.3–§5.4 with the render-safety fix].
18. **SEO/platform completions** [NN §7.10]: robots and sitemap excluding `ask`, `result` and `debug`; `x-default` hreflang; an E2E internal-link crawl; per-locale manifest on the proxy matcher.
19. **An explicit "requirements deliberately not implemented, with reason" list** fed into `DECISIONS.md` [DC §10.1].

---

## 6. Claims found wrong

1. **DSF §8.1** — "Because the slot is declared in the `(deck)` layout only, a navigation to a test from any other surface (blog, history, result, recovery cards) renders the full page instead of a window over the wrong screen." Contradicted by V1: `normalizeAppPath` strips `(deck)` and `@window`, so the intercepting route is `/[locale]` and the `Next-Url` regex matches every descendant. Soft navigation from those surfaces is intercepted, and the `(deck)` `children` slot then has no active state to reuse (V5).
2. **DSF §17 F11 and §8.3** — "React `<ViewTransition>` is available only in React's Canary and Experimental channels." It has been stable since React 19.3 (react.dev blog, 2026-09-09); only the reference page's frontmatter still says canary (V3). DSF's other reason for rejecting it, that a snapshot freezes a live stage, still stands.
3. **NN §15 risk 2** — "If a browser-back restore is not a Transition, the window closes instantly on system back; every other close path animates." NN's own lifecycle table (§5.2) routes 닫기, outside tap, Esc, the wordmark and [거부하고 중단] through `router.back()`, which is the same popstate path. So all back-driven closes share one fate, and Next 16.2.4 wraps that path in `startTransition` under a TODO to remove it (V4).
4. **NN §7.9** — the recovery view's "up to two incomplete-test cards … come from a client island reading `vt:run:*`". The requirement is tests the user has **not completed**, in catalog order, filtered by completion history (V7). Run records are deleted at result commit, so they cannot express completion.
5. **NN §5.3** — "The legacy recovery URL `/test/error?variant=x` is served for free." The requirement is a **redirect** of invalid variants to that address, with `?variant=` kept but not shown. NN renders recovery in place at `/test/{unknown}` and serves `/test/error` only because `error` is an unknown id. The address survives; the redirect contract does not.
6. **DC §4.3 and D8** — "This satisfies the owner's 「유연한 구조」 with no invented semantics." Mapping 3–4 options onto the two poles of an axis under `binary_majority` is itself a scoring semantic. The critique's O5 defers N-ary scoring until a real 3–4-answer test exists.
7. **DC §11 D3** (part of the rationale) — parallel + intercept rejected because "the URL must change on card open …, mounting the stage in the slot and remounting it on Q1". Pushing at card open, as NN and DSF do, keeps one slot instance through Q1 and the grow, so no remount follows. DC's other two reasons are valid: descendant interception, and Back unmounting the slot before a shrink can play.
8. **DSF §8.4** (as a design claim) — "System back anywhere in the test leaves the test … This replaces the old build's overlay history counters." It replaces them by dropping a surviving requirement: overlays close on system back without leaving the page (V8). For the share sheet this also breaks the owner's anti-abandonment instruction.

---

## 7. Gaps none of the three closed

| Gap | Requirement / prototype source | Recommended handling |
|:---|:---|:---|
| `aria-live` announcements for card changes (debounced), window states (「… · 첫 질문」, 「… 테스트를 시작해요」, 「… 카드로 돌아왔어요」), question changes and progress | `prototype.md` §2.15 | One polite live region owned by the shell and the window host; messages from the catalogs; E2E asserts its text. |
| Pre-paint writes to `<html data-*>` vs React hydration | REQ-L §11.1 "hydration warnings block release" | Do not render those attributes from React, or mark `<html suppressHydrationWarning>` (one level deep only). E2E fails on any hydration console error. |
| Skip link first; tab order = document order across deck, window and shell | `contracts.md` §4.8 | A shell primitive, plus an E2E focus-order walk on the landing and in full mode. |
| Share sheet ↔ instruction modal ordering (can the ask icon open before the modal is resolved?) | owner rule "no new interactive elements during a test"; prototype `setShare(visible)` | Hide the ask icon until commit; the run machine exposes `canAsk`. |

