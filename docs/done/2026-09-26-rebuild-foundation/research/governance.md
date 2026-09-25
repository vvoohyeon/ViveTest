# ViveTest governance audit — what the from-scratch rebuild should inherit

Investigator report, read-only. Repository `/Users/woohyeon/Local/ViveTest` at `main` = `20f973a` (clean worktree, 2026-09-26). Nothing in the repository or in the prototype scratchpad was modified. No gate was executed (running `vitest`/`next typegen` in the shared primary checkout writes caches), so every size below is a file measurement, not a run result; run-time figures are quoted from the repo's own records and say so.

## 0. The owner's framing this report answers to

The relayed request (verbatim): 「이 위에 3차 작업 결과물을 적용하면 프로젝트가 너무 많이 지저분해 추후 운영 시 유지보수가 거의 불가능해집니다.」 and 「이 세션에서는 프로토타이핑을 통해 확정된 방향에 따라 저장소가 from-scratch 시작될 수 있는 토대를 마련하는 것이 목표입니다.」 and 「여기에는 디자인 시스템 개정도 함께 포함되므로 필요하다면 Claud Design 재연결을 포함해서, Claude Design 전면 재개정도 포함되어야할 것으로 보입니다.」

The stated metric is therefore **maintainability of the new main**. Every carry/discard verdict below is scored against it: a mechanism carries only if it prevents a defect class that the new code on the same stack will meet again, at a lower upkeep than the defect costs.

Round-3 prototype decisions that shape governance (from `scratchpad/proto-session/dialog.md` lines 2104–2206, verbatim): 「각각의 안이 모두 마음에 들어서 3개안 (반반화면, 갈림길, 스토리) 모두 이 서비스 안에서 사용하겠습니다.」 · 「완성된 후에는 각 테스트 별로 어떤 타입을 적용할지를 사전에 정의하겠습니다.」 · 「나중에 3지선다, 4지선다 응답형 테스트도 있을 수 있습니다.」 · 「시작 전 안내 하단 바텀 시트는 화면 위를 덮는 모달 팝업/시트 형태로 변경되는게 더 바람직해보입니다. (모든 안 공통)」. The prototype session also lists the SSOT areas the product would have to rewrite (dialog.md:2075–2081): the window/transition contract (`req-landing-interaction` §8), one-question-at-a-time (`req-test` §4.3), reduced-motion = story stage as a new a11y contract, background-animation-zero (`req-landing` §1.3) and `design.md`'s spring/parallax ban, vote server + telemetry, and per-question link previews needing Next ≥ 16.3.6.

---

## 1. The governance machinery as it stands

### 1.1 Contract documents (instructions)

| File | Size | Role | Commits since 2026-09-01 |
|:---|:---|:---|:---|
| `AGENTS.md` | 244 lines | Single repo contract for Codex and Claude Code; §0–§10 (scope, runtime facts, routing table, coding principles incl. §3-1 value-provenance R/C/D/I, boundaries, gates, gold standards, plan fields + §7-1 lifecycle, change-type anchors, documentation layers, session guardrails) | 8 (36 total) |
| `.claude/CLAUDE.md` | 7 lines | Pointer: `@../AGENTS.md` + two orientation paragraphs (lifecycle by location; wave worktree topology abolished 2026-09-03) | — |
| `.claude/settings.json` | 9 lines | `permissions.allow`: `Bash(npm run:*)`, `Bash(npm test:*)`, `Bash(npx playwright:*)` | — |
| `docs/agent-guides/project-rules.md` | 160 lines | Directory ownership, architecture/routing, variant-registry boundary, test-flow/storage keys, blog/telemetry/theme/QA, visual/design-system, stub areas | 9 (24 total, both guides) |
| `docs/agent-guides/verification-commands.md` | 112 lines | Hand-listed unit/E2E/qa file lists per change type (`#routing`, `#variant-registry`, `#telemetry`, `#landing`, `#test-flow`) | (above) |

SSOT behaviour/visual contracts routed by `AGENTS.md` §2: `docs/req-landing.md` (1,031 lines / 115 KB), `docs/req-test.md` (1,366 / 147 KB), `docs/req-landing-interaction.md` (236 / 29 KB), `docs/req-test-plan.md` (398 / 42 KB), `docs/project-analysis.md` (760 / 105 KB), `docs/design/design.md` (445), `docs/wave-roadmap.md` (497 / 47 KB), plus background `docs/requirements.md` (381 / 33 KB). Together ≈ 5,100 lines / ≈ 560 KB of behaviour contract for ≈ 22,000 lines of product TypeScript.

### 1.2 Record documents (history, not instruction)

| File | Size | What it holds | Commits since 09-01 |
|:---|:---|:---|:---|
| `docs/DECISIONS.md` | 178 lines / 29 KB, 9 entries | Why the rules have their shape and what was rejected (2026-09-03 worktree→clone, root `CLAUDE.md` deletion, §10 triage, facts re-verification, STATE.md archive, no `docs/lessons/`, §11 moved global; 2026-09-07 kospi-loop harness port incl. "guards live in vitest"; 2026-09-10 blocker traceability) | 4 |
| `docs/decision-register.md` | 680 lines / **239 KB** | `BQ-01`…`BQ-48` product/rebuild decisions (≈ 136 KB; `BQ-38` alone ≈ 50 KB) plus a `## 변경 이력` section from line 598 that is **≈ 103 KB** on its own | **45 of 66** |
| `docs/LESSONS_LEARNED.md` | 390 lines / **106 KB**, `L01`–`L59` | Trap ledger: only structural blind spots of gates/review; title = trap — claim; body = 「무엇이 일어났나」 + 「검사」; ≤ 2,400 bytes/item; no TOC; numbers never reused. Ten items are already > 2,000 bytes (L07, L08, L10, L11, L14, L15, L18, L45, L53, L56) | 28 |
| `tests/e2e/theme-matrix-baseline-provenance.md` | 290 lines, 17 dated sections | Every regeneration/adjudication of pixel baselines since 2026-05-11 | 7 |
| `docs/blocker-traceability.json` | 11.6 KB, 68 rows | `req-landing` §14.2 blocker → assertion registry, checked by `scripts/qa/check-blocker-traceability.mjs` | 3 |
| `docs/done/` (105 files) + `docs/done/closed/` (3) | — | Landed plans / closed-unimplemented | 24 |
| `docs/archive/` (17 files) | — | Superseded rule docs (AGENTS v2/v3/v5, Codex instructions v2–v6, old project-rules, verification-commands, rebuild-worktree-setup, wave-10 STATE) | — |
| `docs/plans/` (6 `.md` + `2026-09-11-mobile-refactor-maps/` 32 files) | — | Active: result-pipeline todos, mobile refactor analysis/step3/spec, design-uplift — all bound to the old implementation | 41 |

### 1.3 Guard tests inside the default gate (`npm test` = vitest)

`vitest.config.ts` includes only `tests/unit/**/*.test.ts`. There are 126 unit test files / 20,725 lines (≈ 761 `it`/`test` blocks by grep); the repo's last recorded timing is 6.6 s for 74 files / 516 tests (`docs/DECISIONS.md:133`, 2026-09-07). Of the 126, about 25 are **meta/stack guards**; the rest are behaviour tests of old modules. Shared helper `tests/unit/helpers/repo.ts` (74 lines: `REPO_ROOT`, `readRepoFile`, `walkRepoFiles` — explicitly "instead of owner allow-lists", L30 — `backtickedTokens`, `gitRefResolves` incl. `origin/<ref>`).

| Guard | Lines | Enforces | Origin |
|:---|:---|:---|:---|
| `contract-citations` | 386 | Backticked rooted paths in the 4 contract docs exist; `MUST_NOT_EXIST` (`src/middleware.ts`, `src/features/landing/test/`) absent; exempt/abbreviation entries still cited; `doc.md §N` headings exist; `guide.md §Anchor` anchors exist; cited `npm run` scripts exist; §4 git refs resolve; **BQ-44-specific** "force-close lines carry their scope" sweep; §1 **Routes row derived bidirectionally from `src/app/**`** (throws on route groups / parallel routes, lines 353–356) | L01, L02, L04, L46 |
| `qa-registry` | 89 | `run-all.mjs` array ↔ `check-*.mjs` files both ways; "13 contract checks" prose count; blocker-registry counts in `project-rules.md` | L02 |
| `decision-register` | 84 | `BQ-NN` unique, contiguous, in order; every `BQ-NN` cited in tracked files (`git grep -I`, excluding register + archive) exists; change-history section exists | L03 |
| `design-ds-boundary` | 72 | `src/`, `public/` never import/`@import`/`url()` `docs/design/ds` files | BQ-38 |
| `docs-lifecycle` | 116 | Four lifecycle dirs exist; retired index files absent; one filename never in two states; links in live docs resolve | §7-1 |
| `lessons-ledger` | 68 | Ledger numbering/title/sections/2,400-byte cap/no TOC | ledger header |
| `design-tokens-dark-parity` | 349 | Two dark selector blocks identical; dark names ⊆ light; caption ink AA in specimens; runtime `@mirror-begin/end` blocks in `globals.css` byte-equal to ds definition (three mirror pairs: light, mobile-type, dark); every `globals.css` name consumed and every consumed name declared | L54, L26 |
| `design-specimen-coverage` | 112 | Every `.vt-*` declared in `app-components.css`/`catalog-components.css` appears in some `preview/*.html`; `@dsCard` markers | answer-choice incident |
| `answer-choice-catalog-parity` | — | Product `AnswerChoiceState` union ↔ catalog modifiers | BQ-42 |
| `snapshot-baselines-tracked` | 79 | Disk baselines = git baselines both ways; no untracked file of any extension in `*-snapshots/` | L11, L24, L56 |
| `snapshot-environment-note` | 63 | Machine environment diff wording for baselines | L28 |
| `tailwind-candidate-hygiene` | 115 | No arbitrary-value candidate with `…`/`...` inside a function call, or `var()` with a non-`--` argument, in any tracked/untracked non-ignored text file | L25, L30 |
| `type-literal-provenance` | 117 | Every `text-[Npx]` literal in `src` is marked `off-ladder` or `partial-role --token` and the mark is true | L30, L36 |
| `css-module-reference-integrity` | 90 | Every `styles.x` read exists in the imported module (CSS-module types are an index signature) | unit 7 |
| `mobile-breakpoint-literals` | 60 | Tailwind `max-/min-[Npx]:` in `src` use the repo's mobile boundary constant | L30 |
| `safe-storage-discipline` | 64 | Every storage write goes through `src/lib/safe-storage.ts` | L52 |
| `error-boundary-coverage` | 106 | Error boundary inside and outside `[locale]`, client directive, way forward; self-rendered documents import their stylesheet + theme bootstrap | L12, L51 |
| `segment-404-unreachability` | 85 | `[locale]/layout` has `dynamicParams=false` + `generateStaticParams`; every `notFound()` in `src/app` is guarded by `!isLocale()` | L51, L42 |
| `message-key-parity` | 53 | 12 locale message files have identical key sets, no empty values | — |
| `locale-alias-parity` | 170 | Header/path locale resolution agree across a generated token matrix | BQ-40 |
| `brand-assets-parity`, `theme-color-parity` | 67 + 67 | Icon/mark literals = palette; `meta[theme-color]` literal copies (TS + `public/theme-bootstrap.js`) = `--canvas` | — |
| `font-subset-manifest` | 102 | Declared font subsets ⇔ files on disk | font subsetting |
| `text-wrap-escape` | 49 | Every `word-break: keep-all` has an `overflow-wrap` escape (CJK) | ja overflow |
| `shared-shell-gutter` | 100 | Gutter contract declared once, both shell surfaces use it | L26 |
| three `*-fingerprint` tests | — | Behaviour-preservation fingerprints for landing card render / controller sequence / reducer | refactor safety |

### 1.4 The release-tier QA scripts (`npm run qa:rules`)

`scripts/qa/run-all.mjs` spawns 13 checkers (`check-phase1/4/5/6/7/8/9/10/11-*`, `check-variant-registry-contracts`, `check-variant-only-contracts`, `check-blocker-traceability`, `check-design-token-parity`) — 2,753 lines in total with `_path-config.mjs` (95 lines of hard-coded old file paths), `_utils.mjs` (`createChecker` → `fail`/`finish`) and `_locale-list.mjs`. They are regex readers of source text. `AGENTS.md` §5 excludes `qa:rules` from the Default Done gate. Their recorded failure modes are all structural: a refactor that moves a spelling turns them red while the product is fine (L21), a regex spanning `[\s\S]*` passes after a definition moves (L31), a block appended after `finish()` never reports (L33), and as a release tier they do not run day to day (L05). Memory `vivetest-harness-guards-live-in-vitest.md` records the resulting rule: new guards go to `tests/unit`, never next to these.

### 1.5 Gates and E2E harness

Default Done gate (`AGENTS.md` §5): `npm run lint` → `npm run typecheck` (`next typegen && tsc --noEmit`) → `npm test` → `npm run build`. Reference: `qa:static`, `qa:rules`, `test:e2e` (dev server!), `test:e2e:smoke` / `test:e2e:gate` (preview), `qa:gate:once`, `qa:gate` (×3), `qa:visual:full` (theme-matrix `--update-snapshots` only), `sync`/`sync:dry`.

`playwright.config.ts`: default `PLAYWRIGHT_SERVER_MODE` is `dev`; preview command skips the build whenever `.next/BUILD_ID` exists (L41); two projects — `chromium` and `webkit-ghosting` (only `safari-hover-ghosting.spec.ts`, `fullyParallel: false`); `toHaveScreenshot` threshold 0.01 / `maxDiffPixels: 20`. No project uses `hasTouch`/`isMobile`; touch is emulated by a JS stub (`tests/e2e/helpers/touch-context.ts`) whose own docblock says it cannot flip CSS `@media (hover: hover)`.

E2E: 17 specs + 8 helpers = 12,525 lines (≈ 237 `test(` blocks by grep; loops generate more), 70 distinct `assertion:XX-NN` ids, `@smoke`/`@gate` tags. Reusable helpers: `local-snapshot.ts` (fails **before** Playwright writes a missing baseline unless `--update-snapshots`; re-awaits `document.fonts.ready` right before capture because unicode-range subsets make it non-one-shot), `snapshot-environment.ts`, `axe.ts`, `touch-target.ts` (44 px / WCAG 2.5.8 spacing probe — axe does not run `target-size` by default).

### 1.6 Visual baselines

189 tracked PNGs: 184 theme-matrix (14 MB, `theme-matrix-manifest.json` 459 lines, representative locales `en`+`kr` only) + 5 WebKit ghosting (228 KB). Since 2026-09-11 all are tracked and `.gitignore` no longer ignores the directory (L56). They are machine-bound: after the Mac-mini moved from darwin 25.6.0 to 27.0.0, `test:e2e:gate` is **123 run / 6 pass / 117 fail**, identical on an `origin/main` control (memory `vivetest-preexisting-red-gates.md`; provenance §2026-09-19 at line 282). Regeneration is pre-approved since 2026-09-17 (`AGENTS.md` §4 Hard stops) but must show old vs new side by side, and `qa:visual:full` does not cover the ghosting PNGs.

### 1.7 A second writer to `main`

`.github/workflows/sync.yml` runs on every push to `main`: `npm ci` → `npm run sync` with three Sheets secrets. `scripts/sync/sync.ts:155-158` then does `git add` / `git commit -m "chore: sync variant registry from Sheets [skip ci]"` / `git push` when the generated registry changed. The same script is reachable locally through the project allow-list `Bash(npm run:*)`; it pushes from whatever branch it runs on.

### 1.8 Design-system sync machinery

`docs/design/ds/` (Ask-First; pushed one-way to Claude Design project `cd630eec-25e4-4613-a58f-c671c80297ca` "VIVE Design System v2"): `colors_and_type.css` 962 lines, `catalog-components.css` 805, `app-components.css` 1,280, `README.md` 199 (findings table rows of several KB each, e.g. `README.md:22-37`), `SKILL.md` 35, `SYNC.md` 136 (repo-only procedure: `DesignSync` `list_files` → `finalize_plan` → `write_files`; `_ds_manifest.json` is derived and lags; SVG uploads gain a C2PA block; three previews restate values in text), 31 preview cards, `_provenance/`, `fonts/PretendardVariable.woff2`. The runtime copies the token values into `src/app/globals.css` between `@mirror-begin`/`@mirror-end` sentinels (lines 129–465), and `design-tokens-dark-parity` keeps the copies byte-equal. `docs/plans/2026-09-16-design-uplift-before-step3.md` §1 records two constraints that bind any "Claude Design full revision": the contract forbids authoring on the Claude Design side and copying back (three drift rounds BQ-21 · R1 · R2), and `DesignSync` is a **file API** (`list_projects`, `get_project`, `list_files`, `get_file`, `finalize_plan`, `write_files`, `delete_files`, `register_assets`) with no generation method; its §3 recommends the order **spec → ds specimen → product**.

### 1.9 Maintenance cost, measured

| Measure | Value | Source |
|:---|:---|:---|
| Product code | 22,075 lines TS/TSX + 2,081 CSS + 1,284 message JSON (223 files) | `git ls-files src` |
| Test + guard code | 20,725 unit + 12,525 E2E + 2,753 qa = **36,003 lines (1.6× product)** | same |
| Markdown docs | **56,696 lines in 183 files (2.6× product)** | `git ls-files docs` |
| Commits since 2026-09-01 | 66 total — `decision-register.md` 45, `docs/plans` 41, `src` 29, `LESSONS` 28, `tests/unit` 27, `tests/e2e` 24, `docs/done` 24, `docs/design/ds` 22, `agent-guides` 9, `AGENTS.md` 8 | `git log --since` |
| Citations code → records | 93 `BQ-NN` citations in 41 files under `src/tests/scripts`; `L##` citations in 53 files | `git grep` |
| Surfaces touched per incident | typically 4: ledger entry + guard + contract prose + BQ entry with change-history line | reading of L21, L25, L30, L51, L56 and their guards |

The register's change-history section (≈ 103 KB) is the single largest upkeep item and duplicates what `git log` already records.

### 1.10 Stale facts that survived eight meta-guards

Each of these is false today and none is caught, because the guards only parse backticked rooted paths, § references, npm scripts, refs and the Routes row.

1. `AGENTS.md:25` lists `motion@12.34.0` in the stack; `package.json` has no `motion` (removed in `39d2869`), and `src` has zero `motion` imports. `docs/agent-guides/project-rules.md:124` still says `motion` "is currently imported in `src/features/test/test-question-client.tsx`".
2. `tests/e2e/README.md:24` says baselines are excluded by `.gitignore`; `.gitignore` has no such rule and 189 PNGs are tracked. `project-rules.md:119` repeats the stale claim, and `contract-citations.test.ts:81` keeps an exemption whose stated reason is that same stale fact.
3. `project-rules.md:136` says the global layer "is still the prior theme … do not apply design.md global tokens to globals.css before Wave 16", while `AGENTS.md` §1 documents the 2026-09-07 theme cut and the mirror.
4. `AGENTS.md:54` and `project-rules.md:133` list open items M-01, D-01, D-02, D-03, D-05; `ds/SKILL.md` and `ds/README.md` record M-01, D-01, D-02, D-03 as resolved.
5. `project-rules.md:134` names a `-mobile-surfaces` render branch; the file does not exist (replaced by `landing-card-sheet.tsx`, per `scripts/qa/_path-config.mjs`).

**Diagnosis.** Upkeep grew because every incident added a rule in several places at once, the contract restated facts that the code also holds, the release-tier checkers were tied to specific file paths and spellings, 184 pixel baselines depend on the machine that took them, and tokens exist in two copies with a guard to keep them equal. The rebuild should inherit the **rules that prevent defects** without these **mechanisms that cause upkeep**.

---

## 2. Stack-level lessons that will bite a from-scratch rebuild on the same stack

These concern Next 16 / next-intl / React 19 / Tailwind v4 / Playwright / WebKit / vitest / browser measurement / macOS rendering and are independent of the old code. **High** marks the ones the prototype's window/stage/sheet architecture meets on day one. The "day-one mechanism" column says what removes or guards the cause in the new repo.

| L | Stack | One-line rule | Priority | Day-one mechanism |
|:---|:---|:---|:---|:---|
| L10 | Tailwind v4 | Utilities live in cascade layers: any unlayered rule beats every utility; same-property arbitrary utilities resolve by Tailwind's emit order, not class order; named breakpoints (`md:`) emit after arbitrary `min-[N]:`; shorthand arbitrary props (`[font:var(--x)]`) override weight/line-height — write element defaults in `@layer base`, route multi-breakpoint values through one custom property, verify with `getComputedStyle`. | High | Convention + computed-style E2E |
| L25 | Tailwind v4 + Next dev | Tailwind scans comments/markdown/HTML for candidates; an arbitrary value with a placeholder (`…`) or a non-`--` `var()` argument emits invalid CSS that kills `next dev`'s PostCSS while `next build` (the minifier drops it) and every gate stay green. | High | `@import "tailwindcss" source(none); @source "../";` in the token entry (scan `src` only — confirmed in Tailwind v4 docs "Detecting classes in source files") + a gate step that boots `next dev` and GETs `/en` |
| L26 | Tailwind v4 | Two surfaces spelling one contract value with different utilities drift in opposite directions (named vs arbitrary breakpoint emit order); alignment checks on border boxes pass anyway — one contract value = one token; measure content boxes (`rect.left + paddingLeft`) at tier boundaries. | High | Rule in AGENTS §3 |
| L12 | Next 16 | A route that renders its own `<html>` (`global-not-found.tsx`, `global-error.tsx`) bypasses the root layout's `globals.css` import; it must import its stylesheet and theme bootstrap itself — a contrast audit passes on an unstyled page (black on white = 21:1). | High | `error-boundary-coverage` guard (rewritten) |
| L51 | Next 16 + next-intl | A 404/error resolved inside `[locale]` ships `<html id="__next_error__">` with an empty `<body>` whatever the cause, and JS-enabled E2E cannot see it — keep `notFound()` unreachable inside `[locale]` (unknown paths go to the proxy outside, unknown IDs to a recovery page) and verify error screens by server HTML (`curl`, scripts stripped). | High | `segment-404-unreachability` guard + one `curl`-level E2E |
| L47 | Next App Router | Dynamic `params` arrive raw/percent-encoded (`'%20'`) — `decodeURIComponent` (try/catch) before validation, and expose the failure branch taken as a DOM attribute so tests prove which branch they hit. | Med | Convention |
| L49 | Next soft nav | After a soft navigation Next commits the body before `<head>` metadata — document-level checks (axe, title) must wait on a document-level condition (`document.title !== ''`). | Med | E2E helper |
| L22 | Next SSR | An SSR "neutral" viewport constant silently favours one tier and pays in CLS elsewhere — in a mobile-first build the SSR default is the phone layout; measure `layout-shift` at narrowest, widest and one in-between width. | High | Rule + first-paint E2E |
| L38 | React 19 | Turning on an "exiting" state in `useEffect` unmounts the element for one commit; the remount replays the enter animation so the exit plays backwards — decide exit during render (adjust-state-on-prop-change), and assert a transition's direction, not its end values. | High | Rule |
| L39 | React 19 | A wrapper that returns `null` conditionally remounts a side-effectful child (history entry, scroll lock, focus return); its cleanup reverts what the open just did (`history.back()` → `popstate` → close) — keep such primitives mounted and let them decide visibility; jsdom cannot show this. | High | Rule for the sheet/modal primitive |
| L40 | React portal + CSS | A portalled surface (`document.body`) loses custom properties scoped to its component root; unresolved `var()` falls back silently (can even raise contrast) — widen the defining selector to reach the portal, and re-point E2E selectors that were ancestor-scoped. | High | Rule; the new window/stage and instruction modal are portals |
| L59 | React portal | Handlers inside a portal cannot find context via `closest()`/DOM ancestors; navigation from inside a history-owning layer is cancelled — pass context by closure, discard the layer's history entry at navigation start, and E2E-press the primary action at the width where the portal appears. | High | Rule + E2E |
| L53 | Browser history | An overlay that pushes a history entry and reverts it with `history.back()` cancels navigation started inside it — give it a `replaceState` discard path called at `pointerdown`, and assert "URL changed", not "layer closed". | High | Rule for system-back handling (the prototype lists "창의 시스템 뒤로가기 처리" as deferred) |
| L43 | Browser history | A module-level "this popstate is mine" counter fails in opposite directions depending on where/when it decrements — own it in a dedicated one-shot listener, defer the decrement a macrotask, test both "must not swallow" and "must not close". | Med | Rule |
| L52 | WebKit/Safari | "Block all cookies" leaves `localStorage` readable but makes `setItem` throw; the symptom is a silent stall — route every storage write through one non-throwing module; simulate by throwing on `setItem` only. | High | `safe-storage-discipline` guard from the first storage write |
| L15 | Chromium | No `mouseout` is delivered when the node under the pointer is removed (e.g. a card swapping children on expand) — base hover-leave recovery on pointer coordinates, pin it with a unit test that removes the node. | Med (desktop hover) | Rule |
| L34 | Browser + Playwright | Clicking before `Tab` moves the sequential-focus starting point to the click — never click to "reset" focus; use `blur()` or start from `goto`. | Med | E2E convention |
| L44 | Browser CSSOM | `getComputedStyle` on root→viewport propagated properties (`overscroll-behavior`, `overflow`) reads stale `auto` until layout is forced — read `offsetHeight` first; polling does not help. | Med | E2E convention |
| L55 | Browser CSSOM | Mid-transition `getComputedStyle` changes the **shape** of values (box-shadow padded with empty layers) — poll shape assertions until settled; fault-inject that a real violation stays red. | Med | E2E convention |
| L08 | Chrome + Tailwind | Measuring tools lie silently: Chrome serialises `color-mix()` as `color(srgb r g b / a)` with 0–1 channels; `getComputedStyle` is live (snapshot before mutating); Tailwind utilities sit inside `@layer`, invisible to top-level CSSOM scans — validate every measuring script on a known answer first. | High for DS audits | Rule |
| L09 | Browser (hidden window) | A hidden window does not fire rAF, so transitions do not advance; reading right after a state change catches mid-transition colours (17 false AA failures) — inject `transition:none!important` before static measurement; use `getAnimations()`/`currentTime` for motion. | High for prototype-to-spec measurement | Rule |
| L19 | CSS + JS | Reduced-motion discipline split between a media query and a JS-set class is judged by reading only one — keep one source (the new "모션 줄이기 → 스토리" stage assignment makes this a contract). | High | Rule |
| L45 | Chromium + Playwright | "Overflows at condition X" needs the unconditioned control in the same sweep; exclude `visibility:hidden`/`aria-hidden`/`inert` probes; 200 % text = `--blink-settings=minimumFontSize=26`, not page zoom; pre-hydration geometry = abort `/_next/static/**/*.js`. | Med | E2E recipe |
| L11 | Playwright | `toHaveScreenshot` writes a missing baseline and fails once; the next run compares against its own image and passes — use the strict `local-snapshot.ts` helper and track every baseline. | High | Carry helper + `snapshot-baselines-tracked` with the first visual spec |
| L24 | Playwright | Snapshot paths embed `projects[].name` (and platform); renaming or adding projects orphans tracked baselines silently — fix project names and `snapshotPathTemplate` on day one and reconcile `git ls-files` with resolved names in the same commit. | High | Config choice + tracked-baselines guard |
| L28 | Playwright + WebKit + macOS | Screenshots don't reproduce under webfont swap (unicode-range subsets re-arm `fonts.ready`), running animations, or CPU contention (WebKit + Chromium in one run) — await `document.fonts.ready` right before capture, pass `animations: 'disabled'` to `page.screenshot`, assert transient states from a MutationObserver log, serialise pointer-heavy specs. | High | Carry helper; see §5.5 on pinning the render environment |
| L32 | Next dev + Playwright | `next dev` paints its dev indicator into every page, so snapshots under dev never match preview-captured baselines — compare only under the capture server mode. | High | Default server mode = preview |
| L37 | Next start | Restarting `next start` while the port is still held leaves the old server answering 200 with stale chunk names — wait for the port to free and confirm the new PID owns it. | Low | Recipe |
| L35 | vitest | `include: ['tests/unit/**/*.test.ts']` silently skips `*.test.tsx` — include both from day one; run a new file alone once to see its case count. | High (cheap) | Config: `**/*.test.{ts,tsx}` |
| L50 | vitest | The 5,000 ms default timeout is nobody's choice — give slow tests an explicit timeout with the measured duration beside it. | Low | Convention |
| L06 | CSS (spec stylesheets) | A stylesheet nobody renders is unverified: include a `box-sizing` reset, write element defaults under `:where()` (specificity 0), render and read computed values before quoting a value. | High for the ds rebuild | Rule in ds `SYNC.md` successor |

Stack-version fact to settle before the first commit: the prototype session reports a `next/og` `ImageResponse` flaw in Next 16.2.0–16.3.5, fixed in 16.3.6, relevant to per-question/result OG images (dialog.md:216, 360, 1818, 2081). The repo pins `next@16.2.4`. I did not verify the advisory myself; the rebuild plan should confirm it and pin ≥ 16.3.6 if confirmed.

## 3. Methodology lessons that carry as principles (stack-agnostic)

| L | One-line rule | Where it lands in the rebuild |
|:---|:---|:---|
| L01 | A git ref a contract cites must travel with a clone (annotated tag or remote branch); local branches drift per machine. | The legacy separation tag(s) — see §5.8 |
| L02 | Hand-written registries fail silently — reconcile against the file set both ways; don't state counts in prose. | No run-all array, no hand file lists in verification docs |
| L03 | A `git grep` census cannot see its own file until committed and counts its own docstring — rerun after commit; fix the docstring, not the census scope. | Decision-ledger census guard |
| L04 | "Must not reintroduce" paths are asserted absent, not present. | `contract-citations` `MUST_NOT_EXIST` |
| L05 | A check in a release-only tier never runs day to day — every contract guard lives in `npm test`. | One gate; no `qa:rules` tier |
| L07 | An extraction records only what it looked at and looks complete — enumerate axes (surfaces, states incl. focus/disabled/empty, tiers, lifecycle incl. mid-transition) first and write down what was not looked at. | **Directly governs extracting the prototype into the new spec** |
| L13 | A token named for contrast is only true on the ground it was measured on — re-measure on tinted/selected/hover grounds. | DS rebuild |
| L14 | When reds move between reruns on a value-invariant change, run the untouched parent commit with the same command side by side; falsify causal stories before writing them. | Debug rule |
| L16 | Interaction E2E asserts its own premises (what overflows, where the pointer is, that scrolling happened), so a broken premise turns red. | E2E convention |
| L20 | Before choosing a comparison anchor, confirm the two candidate values differ there; a passing fault injection may be unobservable at that anchor. | Guard-writing rule |
| L21 | Guards assert resolved values, not spellings; a value-moving refactor re-aims its guards in the same commit. | Guard-writing rule |
| L23 | A fallback indistinguishable from the real asset hides absence — make fallbacks visibly different; count distinctness by content hash. | Thumbnails/test colours |
| L27 | Before `--update-snapshots`, run without it and sort failures: pixel diffs vs earlier-step failures (unreachable states) — never bake an unreachable state into a baseline. | Visual policy |
| L29 | A plan's premises are stale at execution — re-measure the facts a plan instruction stands on before executing it. | Every handoff step plan |
| L30 | Write a guard as the failure condition, not the incident's shape; if narrowed, name where the rest is guarded. | Guard-writing rule; `walkRepoFiles` instead of allow-lists |
| L31 | Source-text guards must not bridge name and literal with `[\s\S]*`; better, avoid source-text guards. | Guard-writing rule |
| L36 | Geometry assertions compare boxes (`{x,width}`), not start coordinates. | E2E convention |
| L42 | A guard written before its defect is reachable passes fault injection vacuously — add guards when the feature lands. | **Governs the day-one vs later split in §5.3** |
| L46 | Narrowing a rule's scope leaves restated summaries behind — don't restate rules across docs. | One SSOT per rule |
| L48 | Reserved-stub comments are hypotheses; date them. | Convention |
| L54 | When one cause appears at many callers, fix the role (token/helper); guards compute the forbidden condition rather than list names. | DS rebuild |
| L56 | Disk-vs-git guards only see what exists where they run; deleting an ignore rule surfaces old accumulations elsewhere — never ignore the baseline directory in the first place. | `.gitignore` of the new repo |
| L57 | Never compute an expected value with the product's own predicate; restate it from the contract. | Test-writing rule |
| L58 | A regression net over `en`+`kr` cannot see number/date formatting bugs (both use comma thousands) — assert locale-varying output across all 12 locales. | i18n tests |

## 4. What must not carry

### 4.1 Lessons whose subject is the old implementation or its harness

| L | Why it does not carry |
|:---|:---|
| L17 | The landing's four collapse paths and `clearHoverTimer()` are deleted with the old grid; its generic half ("enumerate every path that changes a state, confirm the guard in the product") is already carried by L16/L57. |
| L18 | Item-granular closure of `req-landing` §14.2 blockers in `docs/blocker-traceability.json` — the registry and checker do not carry. |
| L33 | `scripts/qa` `createChecker` `finish()` ordering — the checker framework does not carry. |
| L41 | `playwright.config.ts` skipping the build when `.next/BUILD_ID` exists — remove the cause (always build for preview, or opt-in reuse via an explicit env flag); then the lesson has no subject. |

Also not to be carried as rule text: incident specifics inside carried entries — `--muted-aa` (L13), `BQ-07`/`landing-blog-expanded` (L27), `checkpoint/*` history (L01), `consent-smoke:152/176` (memory), the Mac-mini-specific 395×292 vs 398×293 (L28/provenance). Global rule: rule documents carry rules, never incident examples.

### 4.2 Guards, scripts and harness pieces

| Item | Verdict | Reason |
|:---|:---|:---|
| `scripts/qa/*` (13 checkers + `_path-config`, `_utils`, `_locale-list`, `run-all.mjs`) and `npm run qa:rules` / `qa:static` / `qa:gate*` | discard | Path- and spelling-bound regex over old files; release tier (L05, L21, L31, L33) |
| `tests/unit/qa-registry.test.ts` | discard | Guards the discarded registry and blocker counts |
| `docs/blocker-traceability.json` + checker | discard | Old `req-landing` §14 structure (L18) |
| `contract-citations` BQ-44 force-close scope sweep; `ABBREVIATIONS`/`EXEMPT` entries for old paths | discard (rest of the guard is rewritten) | Old-spec specific |
| `type-literal-provenance`, `answer-choice-catalog-parity`, `shared-shell-gutter`, `mobile-breakpoint-literals` (as written) | discard as written | Enumerate old literals/modules; the rules they embody (single token per value, breakpoints as tokens) move into AGENTS §3 and a later generic guard |
| `landing-card-render-fingerprint`, `landing-controller-sequence-fingerprint`, `landing-interaction-reducer-fingerprint` | discard | Preservation fingerprints of code that will not exist |
| All `landing-*`, `gnb-*`, `test-*`, `telemetry-*`, `consent-*` behaviour unit tests | discard as tests; reference-only | Re-derived from the new spec; domain/sheets tests travel only if their code does (other investigator's scope) |
| `design-tokens-dark-parity` runtime-mirror half + `@mirror` sentinels | discard if tokens become single-source (§5.5) | The mirror exists only because tokens have two copies |
| `safari-hover-ghosting.spec.ts` + 5 PNGs, `webkit-ghosting` project | discard | Desktop hover ghosting of the old grid |
| `theme-matrix-smoke.spec.ts`, `theme-matrix-manifest.json`, 184 PNGs, `theme-matrix-baseline-provenance.md` | discard | Old surfaces; the provenance history stays readable at the legacy tag |
| `tests/e2e/helpers/touch-context.ts` JS stub | discard | Replace with real device projects (`hasTouch`/`isMobile`) — the stub cannot flip CSS `(hover: hover)` |
| `tests/e2e/helpers/landing-fixture.ts`, `consent.ts`, `test-run.ts` | reference-only | Old fixtures; variant IDs travel with the registry if it carries |
| `docs/agent-guides/verification-commands.md` | discard | Hand-listed file registries (L02); replace by directory-scoped runs and Playwright tags |
| `.playwright-mcp/` (3 tracked stray logs from `eb37b12`) | discard | Accidentally tracked tool output |
| `.claude/settings.local.json` (untracked, 32 allow entries) | not in scope | Machine-local |
| `docs/design/ds/_provenance/**`, `preview/catalog-drift.html` | reference-only | Pre-rebaseline snapshots and a drift card whose subject is old values |

## 5. The rebuild-era governance

### 5.1 Principles (each one takes its cost out of §1.9)

1. **A fact in the contract is either derived-and-guarded or not written.** The Routes row pattern (`contract-citations.test.ts:323-386`) is the model; `motion@12.34.0` (§1.10) is the counter-example. Versions live in `package.json`; the contract names only a pin that has a reason (e.g. Next ≥ 16.3.6).
2. **No counts in prose.** Counts are what went stale (L02, "13 contract checks", "67 entries").
3. **One gate.** Every contract/harness guard runs in `npm test` (L05); anything slow belongs in E2E, not a third tier.
4. **Prefer a guard over an approval.** Where the hazard is mechanical (snapshot names, vitest include, storage writes), a test beats an Ask-First line: zero round-trips and it cannot be forgotten.
5. **Guards arrive with the defect's reachability** (L42): a day-one guard only for things that exist on day one.
6. **Guards test conditions over whole trees, not allow-lists** (L30), **values, not spellings** (L21), with a "collector found > 0" precondition so an empty scan cannot pass green (pattern already used in `segment-404-unreachability`, `design-specimen-coverage`).
7. **One source per value** (L26): one token file, one sheet primitive, one storage writer, one reduced-motion source.
8. **Rules in one place.** AGENTS holds invariants; the spec holds behaviour; the ledger holds traps; DECISIONS holds why. No agent-guide that restates the spec (L46).
9. **Records stay small.** Git is the change history; ledgers and registers do not duplicate it (the 103 KB change log).

### 5.2 Slim `AGENTS.md` outline (Korean, as today; target ≤ 130 lines vs 244)

| § | Holds | Must not hold | Budget |
|:---|:---|:---|:---|
| 0 Scope and authority | Same as today: single contract for Codex + Claude Code; *how to work* belongs to the global layer; precedence; child `AGENTS.md` only with ≥ 3 own rules | Anything procedural the global file owns | 8 |
| 1 Project facts | Table of **derived** rows only: Routes (derived from `src/app/**` incl. route groups, `@slot` parallel and `(.)` intercepting segments), Locales (from `src/config/site.ts`, incl. the BCP-47 display tag rule), request entry `src/proxy.ts`, 404/error surface rule (L51/L12), one token file, pinned versions **with reasons only** | Versions, counts, file inventories, stub lists | 15 |
| 2 Task routing | One row per area → the **new** SSOT spec doc(s) built from the prototype (landing & window/stage, test flow & stages I/J/D incl. 2–4 answers, instruction modal & consent notice, share/vote, i18n/routing, telemetry, design system) + "harness change → `docs/LESSONS_LEARNED.md` (grep titles) + `docs/DECISIONS.md`" | Section numbers of documents not yet written; verification file lists | 14 |
| 3 Coding principles | Contract-first; no fabrication (IDs, locales, payload fields from source only); generated ≠ hand-written; single request entry; **one value one source** (tokens, sheet primitive, storage writer, reduced-motion); file-size discipline (~500 lines / ≥ 3 new files → plan); test isolation; design definition flows repo → Claude Design one way | Incident narratives (they are in the ledger) | 18 |
| 3-1 Value provenance (R/C/D/I) | **Decide later**: keep only if tokens stay in two layers; with single-source tokens R and C collapse and the table can shrink to "unrealized values are marked `[intent]`" | — | 0–10 |
| 4 Boundaries | Workspace = clone (one line + pointer); refs table: `main` + legacy tag(s) with one-line roles; Never; Ask-First; High-Risk; SSOT list; Always; Hard stops (baseline regen pre-approved with side-by-side report; `.env*` untouchable) | Wave/anchor history | 35 |
| 5 Gates | Basic gate order; E2E commands and which server mode each uses; visual-baseline policy (strict helper, environment pinning, what regeneration must report) | Counts, per-area file lists | 15 |
| 6 Gold standards | Starts **empty** with one sentence: a file enters when it becomes the pattern others copy | Pre-populated wishes | 3→ |
| 7 Plans and lifecycle | Plan fields (files, SSOT, impact incl. a11y/i18n/state/core flow, validation, decisions); 7-1 lifecycle table (§6 below); handoff plans split `-step1-` … per global rule | Wave fields | 15 |
| 8 Documentation layers | The four-layer table (global / repo contract / project memory / DECISIONS) + ledger entry obligation (unchanged wording) | — | 12 |
| 9 Session guardrails | Re-read the routed spec before citing it; E2E is the measured record of behaviour; baseline diff = regression until provenance says otherwise; stop at the phase boundary of the rebuild roadmap; stop on instruction conflicts | Wave-specific clauses | 7 |

Removed relative to today: §2 "Rebuild Workflow Sources" (wave roadmap, decision-register as rebuild source, visual precedence chain BQ-21/BQ-38), §8 change-type anchors (replaced by directory-scoped `npm test -- <dir>` and `playwright --grep @<area>`), `docs/agent-guides/**` (their live content folds into §1/§3/§4; the rest is old-implementation detail).

### 5.3 Guards: day one, later, never

"Day one" means the commit that creates the thing the guard protects, not before (L42).

| Guard | When | Shape in the new repo |
|:---|:---|:---|
| `helpers/repo.ts` | first commit | Carry as-is (`walkRepoFiles`, `gitRefResolves`, `backtickedTokens`) |
| `contract-citations` | first commit | Rewrite: backticked rooted paths exist; `MUST_NOT_EXIST` (`src/middleware.ts`); `§N` and anchor references resolve; cited `npm run` scripts exist; §4 refs resolve (legacy tag!); Routes row derived both ways **including route groups, `@slot` parallel routes and `(.)` intercepting routes** (the current version throws on them, lines 353–356, and the prototype's window structure needs parallel + intercepting routes per memory `vivetest-mobile-interaction-mockups.md`) |
| `docs-lifecycle` | first commit | Carry, relaxed: lifecycle dirs checked **if present** (git cannot track empty dirs); no index files; no filename in two states; live-doc links resolve; include subdirectories of `docs/plans/` (today's `markdownFilesIn` is non-recursive, so `2026-09-11-mobile-refactor-maps/` escapes it) |
| `lessons-ledger` | first commit (ledger seeded) | Carry as-is |
| vitest include | first commit | No guard — set `include: ['tests/unit/**/*.test.{ts,tsx}']` (L35 cause removed) |
| `tailwind-candidate-hygiene` | first CSS commit | Mostly replaced by `source(none)` + `@source` scoping; keep a small guard that the token entry declares that scoping, plus a dev-boot smoke in the gate (L25/L30) |
| `message-key-parity` | first message files | Carry as-is (12 locales) |
| `segment-404-unreachability`, `error-boundary-coverage` | first `src/app` routes | Carry, retarget paths (L51, L12) |
| `safe-storage-discipline` | first storage write | Carry (L52) |
| `css-module-reference-integrity` | first CSS module (if CSS modules are chosen) | Carry |
| `snapshot-baselines-tracked` + strict `local-snapshot.ts` + `snapshot-environment` | first visual spec | Carry (L11, L24, L28, L56) |
| decision-ledger census | first decision entry | Rewrite `decision-register.test.ts` for the new prefix; no change-history requirement |
| design boundary / token single source | ds rebaseline | Rewrite per §5.5 decision |
| `design-specimen-coverage` | when ds component CSS exists | Carry |
| dark-theme parity inside the token file | when two dark selectors exist | Carry the within-file half only |
| `theme-color-parity`, `brand-assets-parity` | when `meta[theme-color]`/bootstrap/brand assets exist | Carry |
| `locale-alias-parity` | when proxy locale resolution exists | Carry |
| `text-wrap-escape` | first `keep-all` | Carry (CJK; ja 128 px overflow) |
| breakpoint literals | when breakpoints exist | Rewrite generically (breakpoints read from one token/constant) |
| `font-subset-manifest` | only if font subsetting returns | Conditional |
| consent/analytics gate tests | when analytics lands | Rewrite |
| everything in §4.2 marked discard | never | — |

### 5.4 Boundaries for the new codebase

**Never:** reintroduce `src/middleware.ts` (single entry `src/proxy.ts`); hand-edit build outputs (`.next/`, `node_modules/`, `coverage/`, `test-results/`, `playwright-report/`, `tsconfig.tsbuildinfo`, `next-env.d.ts`); hand-edit generated files.

**Ask-First (short on purpose; everything mechanical is a guard instead):** `src/proxy.ts` · `src/app/layout.tsx` · `src/app/[locale]/layout.tsx` · self-rendered documents (`global-not-found.tsx`, `global-error.tsx`) · the one token file · the pre-hydration theme bootstrap · route/locale path builders · generated-artifact sources · `docs/design/ds/**` (edits leave the repo via push) · `next.config.ts` · `.github/workflows/**` · `AGENTS.md` · `.claude/*` · `package.json`/lockfile. Not Ask-First: `playwright.config.ts` and `vitest.config.ts` — guarded by `snapshot-baselines-tracked` (L24) and the `{ts,tsx}` include (L35).

**High-Risk (plan must state usability / a11y / responsiveness / performance / DS-consistency risk and include Playwright coverage):** the card → stage-window → full-screen → collapse-back orchestration and its routes; the shared sheet/modal primitive and its history ownership (L39, L43, L53, L59); the instruction/consent **modal** that gates Q2 (owner: 「이 메시지와 [시작] 버튼은 Q2 진입 전 필수로 해야하는 아주 중요한 고지의 메시지도 담고 있는데」, dialog.md round 3); stage input locks (J arrival lock, 350 ms) and the "되돌아가 고치면 한 문항씩" rule; reduced-motion → story-stage assignment (a11y contract, L19); theme bootstrap; consent source and telemetry; the share/vote server.

**SSOT list:** the new spec document(s) extracted from the prototype, the design-system definition, `AGENTS.md`. The old `req-*.md`, `project-analysis.md`, `design.md`, `wave-roadmap.md`, `decision-register.md` are **not** SSOT in the new main; they remain readable at the legacy tag.

**Always (modify freely):** `src/features/**`, `src/i18n/**`, `src/lib/**`, `src/messages/**`, `tests/**`, `docs/**` except `docs/design/ds/**`, `public/**`, `.planning/**`.

### 5.5 Harness choices that remove causes on day one

| Choice | Removes | Note |
|:---|:---|:---|
| `vitest` include `**/*.test.{ts,tsx}`; explicit timeouts on slow tests | L35, L50 | — |
| Playwright projects named once, never renamed, with device descriptors — e.g. `mobile-webkit` (iPhone profile, `hasTouch`/`isMobile`), `mobile-chromium` (Android profile), `desktop-chromium`; explicit `snapshotPathTemplate` | L24, touch stub limits | Mobile-first means WebKit touch is the primary engine; the prototype already verified "Chromium·WebKit × 마우스·터치" |
| Default `PLAYWRIGHT_SERVER_MODE=preview`; preview always builds unless an explicit reuse flag is set; one dev-boot smoke (`next dev` → `/en` 200 with a non-empty body) in the gate | L32, L41, L25, L30 | — |
| Strict missing-baseline helper, `fonts.ready` barrier before capture, `animations: 'disabled'`, few pixel baselines, prefer computed-style/geometry assertions | L11, L28 | 184 pixel baselines became 117 failures after one macOS update |
| Pixel-baseline environment pinned and recorded (`snapshot-environment.json`); optionally rendered in a Playwright Linux container so OS upgrades do not invalidate baselines | L28, §1.6 | Container needs Docker on the owner's machines → owner decision |
| Tailwind `@import "tailwindcss" source(none); @source "../";` in the token entry | L25/L30 structurally; also keeps any prototype HTML/JS placed under `docs/` from being scanned | Verified syntax in Tailwind v4 docs |
| Tokens: one file consumed by the runtime **and** pushed to Claude Design (no `@mirror` copy) | L26; ≈ 350 lines of parity guard; mirror upkeep | Measure first whether the ds token file can be `@import`ed as-is (it carries `.vive` scoping and dark selectors); if not, generate the runtime file from it rather than hand-copy |
| `.gitignore` never ignores `tests/e2e/*-snapshots/` | L56 | — |
| `scripts/sync` (if carried) never commits/pushes locally; only CI pushes | §1.7 | Otherwise `Bash(npm run:*)` lets an agent push from any branch |
| Next pin ≥ 16.3.6 if the reported `next/og` advisory is confirmed | prototype dialog.md:360 | Unverified here |

### 5.6 `.claude/CLAUDE.md` for the rebuild

Keep the pointer shape (DECISIONS 2026-09-03 rejected a root `CLAUDE.md` and duplicate copies). Replace the wave-topology paragraph with where the old implementation lives. Proposed text:

```md
# Claude Code — ViveTest 코딩 세션

**이 저장소의 계약 정본은 아래 `AGENTS.md` 하나다.** 루트 `CLAUDE.md`는 두지 않는다 — 런타임 에이전트가 없어 계약을 달리 읽을 두 번째 독자가 없고, 도구별 사본은 규칙을 두 곳에 두어 표류시킨다. Codex도 같은 `AGENTS.md`를 읽는다. 이 파일에 규칙을 적지 않는다 — 규칙은 `AGENTS.md`, 이유는 `docs/DECISIONS.md`.

*how to work*는 전역 `~/.claude/CLAUDE.md`의 몫이다. 어느 문서가 지시이고 어느 것이 기록인지는 위치가 말한다 — `docs/plans/`만 활성이다(`AGENTS.md` §7-1). 이전 구현(1차 로직·2차 디자인 개편·3차 모바일 프로토타입 탐색)과 그 문서는 이 main 에 없다 — `AGENTS.md` §4 의 legacy 태그가 갖고, 그 안의 모든 것은 기록이지 지시가 아니다.

@../AGENTS.md
```

### 5.7 `.claude/settings.json` for the rebuild

Carry the current allow-list and add the direct vitest runner; add nothing else at project level (worktree, push/delete and tripwire hooks are global). If `scripts/sync` returns with local git writes, fix the script (§5.5) rather than adding a deny.

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run:*)",
      "Bash(npm test:*)",
      "Bash(npx playwright:*)",
      "Bash(npx vitest:*)"
    ]
  }
}
```

### 5.8 Records and refs

- **Legacy ref (L01).** The current `main` tip `20f973a` has no durable name other than `main`. Before main changes, it needs an annotated, pushed tag (name for the orchestrator, e.g. `legacy/v2-final`); the older `legacy/reference` (remote branch, `d3305b7`) and five `anchor/*` annotated tags already travel with clones (verified with `ls-remote`). The new §4 refs table lists `main` plus the tag(s) a session may need; `contract-citations` resolves them.
- **History continuity.** The global rules forbid force-pushing, so the clean slate must be a normal commit on `main` that deletes the old tree (history, blame and `git show legacy/…:path` stay available), not an orphan branch that replaces `main`.
- **`docs/DECISIONS.md`.** Start fresh with one entry, "from-scratch rebuild: what carried and why" (this report's tables), restating briefly the earlier rejections that still bind: no root `CLAUDE.md`, no lifecycle index, guards in vitest, no guard thresholds derived from object counts, no pre-created empty ledgers.
- **Decision register.** New ledger with a **new ID prefix**. Reusing `BQ-` from 1 would let an old `BQ-05` citation resolve silently to a new, unrelated decision; the census guard (L03) cannot detect that. Keep the entry format (Decision / Source / Implementation impact / Notes); drop the in-file change history (git has it).
- **Lessons ledger.** Seed a new `docs/LESSONS_LEARNED.md` with the §2 entries (and the §3 ones judged worth reading before work), rewritten stack-generically, each with a `legacy L##` back-reference; keep the format guard. Carrying the old file verbatim would bring 59 entries full of dead paths into the link-checked `docs/` root.

## 6. Documents lifecycle convention

**Current convention** (`AGENTS.md` §7-1, enforced by `tests/unit/docs-lifecycle.test.ts`; rationale in `docs/DECISIONS.md` 2026-09-07 and the guard's docblock):

| Location | State |
|:---|:---|
| `docs/plans/` | Active — in progress or not yet started |
| `docs/done/` | Landed record |
| `docs/done/closed/` | Closed without implementation (SUPERSEDED · REJECTED · CANCELLED) |
| `docs/archive/` | Superseded rule documents and old session anchors — not current contract |

Rules: a plan moves to `docs/done/` **in the same commit** that lands it; no index files (`PLANS_INDEX.md` etc.) because location and index would both claim state; history is never edited retroactively (links in `docs/done/**`/`docs/archive/**` may rot and are not link-checked); link checks apply only to contract docs and live plans. It was introduced on 2026-09-07 when `docs/plans/` had grown 69 → 84 files with active and finished mixed.

**Should it carry? Yes, with four adjustments.**

1. Carry the four states and the three rules unchanged; they cost one guard and removed a whole class of "is this plan live?" reads.
2. The new main starts with `docs/plans/` (+ `docs/done/` once the first plan lands); `closed/` and `archive/` appear when first needed, and the guard checks them only if present.
3. Do **not** copy the old corpus (105 done, 3 closed, 17 archive, 38 plan files, the `req-*` specs, the register) into the new `docs/archive/`. DECISIONS 2026-09-03 already rejected keeping near-duplicate rule docs in the archive as "a second copy waiting to be mis-cited"; the legacy tag is the archive. The six active plans are all bound to the old implementation (result-pipeline todos, mobile refactor analysis/step 3/spec, design uplift); they close with the old tree, and anything still wanted (e.g. the `result_viewed` pipeline requirement) is rewritten into the new spec.
4. Make the guard recurse into subdirectories of `docs/plans/` (today `2026-09-11-mobile-refactor-maps/` is outside it).

## 7. Open items for the orchestrator

- Decide the legacy tag name(s) and whether the older `legacy/reference` branch should also get an annotated tag for symmetry (it is a remote branch today, so it already travels).
- Is `main` auto-deployed (Vercel)? If yes, a clean-slate commit on `main` replaces the live site. No `vercel.json`/`.vercel` exists in the repo, so this cannot be answered from the code; the Vercel connector in this environment needs authentication.
- `.github/workflows/sync.yml` runs `npm ci && npm run sync` on every push to `main` and pushes generated commits. On a clean-slate main without the script it fails on every push; if it is kept it is a second writer to `main`. It should leave `main` with the old tree and return with the registry pipeline.
- Single-source tokens: whether the ds token file can be the runtime file directly or must be generated into it (measure before deciding).
- Pixel-baseline rendering environment: pinned local machine vs a Playwright Linux container (the container needs Docker installed — the owner's call).
- Confirm the `next/og` advisory and the Next pin before the first dependency commit.

---

## Appendix A — disposition of every ledger entry (`docs/LESSONS_LEARNED.md`, L01–L59)

S = stack-level, carry (rewrite stack-generically). M = methodology, carry as a principle. O = subject is the old implementation/harness, do not carry. "Guard" names the vitest guard that currently embodies the entry, if any.

| L | Title (short) | Class | Guard today | Rebuild disposition |
|:---|:---|:---|:---|:---|
| L01 | Contract-cited git refs differ per machine | M | `contract-citations` (refs) | Carry; legacy tag must be annotated + pushed |
| L02 | Hand-written registry fails by silence | M | `qa-registry` | Carry principle; no registry to guard |
| L03 | Census guard counts its own docstring; fires after commit | M | `decision-register` | Carry with new ledger census |
| L04 | Negative citations must assert absence | M | `contract-citations` | Carry |
| L05 | Release-tier gate never runs | M | (placement) | Carry: one gate |
| L06 | Spec stylesheet: declared ≠ computed | S | — | Carry to ds rebuild |
| L07 | Extraction scope: unseen = "correct" | M | — | Carry; governs prototype → spec extraction |
| L08 | Measuring tools lie (color-mix, live CSSOM, @layer) | S | — | Carry |
| L09 | Hidden window: no rAF; mid-transition values | S | — | Carry |
| L10 | Tailwind v4 cascade layers / emit order / shorthand | S | — | Carry (High) |
| L11 | Missing baseline written then passes | S | `snapshot-baselines-tracked` + helper | Carry (High) |
| L12 | Self-rendered document lacks stylesheet | S | `error-boundary-coverage` | Carry (High) |
| L13 | Contrast-named token true on one ground only | M | `design-tokens-dark-parity` (caption ink) | Carry to ds rebuild |
| L14 | Moving reds: run untouched parent commit | M | — | Carry |
| L15 | Chromium loses `mouseout` on node removal | S | unit test (old) | Carry if desktop hover exists |
| L16 | Interaction E2E must assert its premises | M | — | Carry |
| L17 | Four collapse paths; `clearHoverTimer` erases guard | O | — | Do not carry |
| L18 | Item-granular blocker closure | O | blocker checker | Do not carry |
| L19 | Reduced-motion split CSS/JS | S | — | Carry (High: D stage) |
| L20 | Fault injection passes where candidates coincide | M | — | Carry |
| L21 | Guards asserting spelling | M | — | Carry |
| L22 | SSR neutral constant picks a viewport (CLS) | S | first-paint E2E | Carry (High) |
| L23 | Fallback indistinguishable from real asset | M | — | Carry |
| L24 | Playwright project name in snapshot path | S | `snapshot-baselines-tracked` | Carry (High) |
| L25 | Tailwind scans prose; dev-only crash | S | `tailwind-candidate-hygiene` | Carry; remove cause with `source(none)` |
| L26 | One contract value realised by two surfaces | S | `shared-shell-gutter` | Carry principle; generic |
| L27 | Deferred baseline asserting unreachable state | M | — | Carry rule (run without `--update` first) |
| L28 | Screenshot baselines not self-reproducing | S | `local-snapshot.ts` | Carry (High) |
| L29 | Plan premises stale at execution | M | — | Carry |
| L30 | Guard narrowed to incident shape | M | `helpers/repo.ts` walk | Carry |
| L31 | `[\s\S]*` in source-text guards | M | — | Carry only as "avoid source-text guards" |
| L32 | Snapshots compared under dev server | S | — | Carry (High); default preview |
| L33 | Check appended after `finish()` | O | — | Do not carry |
| L34 | Click-then-Tab moves focus start point | S | — | Carry |
| L35 | `.test.tsx` not collected | S | — | Carry; fix include |
| L36 | Alignment asserted by start coordinate | M | — | Carry |
| L37 | Rebuild with server running; stale 200 | S | — | Carry (recipe) |
| L38 | Exit state set in effect replays enter animation | S | — | Carry (High) |
| L39 | Conditional `null` wrapper remounts; cleanup closes | S | unit tests (old) | Carry (High) |
| L40 | Portal loses scoped CSS variables | S | — | Carry (High) |
| L41 | Preview reuses stale `.next/BUILD_ID` | O | — | Remove the cause; do not carry |
| L42 | Guard before the feature is reachable | M | — | Carry; governs §5.3 |
| L43 | "My own popstate" counter | S | unit tests (old) | Carry if overlays own history |
| L44 | Propagated root property needs forced layout | S | — | Carry |
| L45 | Overflow under condition X; zoom; pre-hydration | S/M | — | Carry |
| L46 | Narrowed rule leaves summaries | M | `contract-citations` BQ-44 sweep | Carry principle; drop the sweep |
| L47 | App Router params are raw | S | — | Carry |
| L48 | Reserved-stub comments | M | — | Carry (low) |
| L49 | Soft navigation: head after body | S | — | Carry |
| L50 | vitest default timeout | S | — | Carry |
| L51 | 404/error inside `[locale]` empty body | S | `segment-404-unreachability` | Carry (High) |
| L52 | Safari `setItem` throws | S | `safe-storage-discipline` | Carry (High) |
| L53 | Overlay history entry kills in-layer navigation | S | E2E (old) | Carry (High) |
| L54 | Fix at callers leaves the role | M | `design-tokens-dark-parity` | Carry to ds rebuild |
| L55 | Mid-transition computed value shape | S | — | Carry |
| L56 | Deleting an ignore rule | M | `snapshot-baselines-tracked` | Carry as "never ignore baselines" |
| L57 | Expected value via product predicate | M | — | Carry |
| L58 | Locale sample shares a convention | M | — | Carry (12 locales) |
| L59 | Portal-escaped handlers use `closest()` | S | E2E (old) | Carry (High) |

Totals: 31 S (incl. L45 S/M; exactly the 31 rows of §2), 24 M (the rows of §3), 4 O (§4.1).

## Appendix B — sources read

`AGENTS.md`; `.claude/CLAUDE.md`; `.claude/settings.json`; `docs/DECISIONS.md` (all); `docs/LESSONS_LEARNED.md` (all 59 entries); `docs/agent-guides/project-rules.md`; `docs/agent-guides/verification-commands.md`; `package.json`; `vitest.config.ts`; `playwright.config.ts`; `next.config.ts`; `postcss.config.mjs`; `eslint.config.mjs`; `.gitignore`; `.github/workflows/sync.yml`; `scripts/sync/sync.ts:120-170`; `scripts/qa/run-all.mjs`, `_path-config.mjs` (head), line counts of all checkers; `tests/unit/helpers/repo.ts`; `tests/unit/{contract-citations,qa-registry,decision-register,design-ds-boundary,docs-lifecycle,lessons-ledger}.test.ts` (full); docblocks and test names of the other guards listed in §1.3; `tests/e2e/README.md`; `tests/e2e/helpers/{local-snapshot,snapshot-environment,landing-fixture,touch-context,touch-target,axe}.ts` (heads); `tests/e2e/snapshot-environment.json`; section list of `tests/e2e/theme-matrix-baseline-provenance.md`; `docs/design/ds/{SYNC,SKILL}.md`, `README.md` (headings, findings rows); `docs/plans/*.md` (heads) and `docs/plans/2026-09-16-design-uplift-before-step3.md` §1–§3; `docs/decision-register.md` (structure and sizes); listings of `docs/done`, `docs/done/closed`, `docs/archive`, `docs/plans`; `git log`/`tag`/`branch`/`ls-remote` (read-only); memory `vivetest-harness-guards-live-in-vitest.md`, `vivetest-preexisting-red-gates.md`, `vivetest-claude-design-integration-status.md`, `vivetest-owner-interaction-principles.md`, `vivetest-mobile-interaction-mockups.md`; prototype dialog `proto-session/dialog.md` (round-3 feedback lines 2104–2206, contract conflicts 2075–2081, Next advisory lines 216/360/1818/2081, latest status 2369–end); Tailwind v4 docs via Context7 ("Detecting classes in source files").
