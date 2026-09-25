# ViveTest — why the repository became hard to maintain, and twelve rules so the rebuild does not repeat it

Snapshot: `main` = `20f973a` (2026-09-24), primary checkout clean. Investigated 2026-09-26 on the Mac mini (Darwin 27.0.0), read-only: only `git log/show/ls-files/grep/branch/tag/rev-parse` against `/Users/woohyeon/Local/ViveTest`, plain reads of tracked files, and read-only listings of the prototype scratchpad. No file in the repository or the prototype directory was modified. Token estimates below are heuristic (Hangul characters × 0.9 + other characters ÷ 3.6) and are labelled `≈`.

---

## 0. The owner's framing (verbatim, from the relayed request)

- 「기존에 1차로 로직과 디자인 구현 후 2차로 디자인 전면 개편을 진행하고 있었고, 2차 작업이 완료되기 전에 3차로 모바일 프로타티이핑 탐색을 하면서 여러 작업이 누적되 저장소가 아주 많이 지저분해졌기 때문입니다.」
- 「이 위에 3차 작업 결과물을 적용하면 프로젝트가 너무 많이 지저분해 추후 운영 시 유지보수가 거의 불가능해집니다.」
- 「그래서, 이번 프로토타이핑 결과에 따라 확정된 방향으로 이 저장소를 원점에서부터 다시 쌓아올리고 싶습니다.」

The measurements below confirm that framing and locate the mess more precisely: it is less in `src/` than in the layers wrapped around it — documents, copies of values, guards over those copies, and screenshots.

---

## 1. Summary — five root causes

1. **Programmes were stacked without closing.** Phase 1 (logic + design) ended at `legacy/reference` = `d3305b7`; Phase 2 (17-wave rebuild → design-system rebaseline) abandoned waves 13–17 mid-roadmap; Phase 3 (mobile refactor, 3 steps) began three days after Phase 2 closed and its step 3 (235 files) was contradicted by the prototype one week after landing. Every phase left its own layer of documents, tokens, tests and baselines in the tree.
2. **Authority is fragmented.** About twelve files are called SSOT, there are at least six separate precedence chains, and two requirement documents carry 39 "single-change synchronization" triggers because each policy is written in 3–6 places. Twelve false statements currently sit in live contract documents; every documentation guard passes them because the guards check form (paths exist, numbering continuous), not truth.
3. **A visual value lives in six to nine places.** Design intent (`design.md` §5), the design definition (`docs/design/ds/colors_and_type.css`), the runtime mirror (`src/app/globals.css` `@mirror` blocks), module-scoped aliases, TS/JS literal copies, SVG literals, Claude Design project `cd630eec`, and the prototype's own `tokens.css`. The repository answered drift with more copies plus parity guards plus a four-way provenance taxonomy (`AGENTS.md` §3-1), instead of fewer copies.
4. **Specs were frozen ahead of product decisions.** The instruction surface went modal → bottom sheet → modal inside 16 days; phone card expansion went in-flow (32 clauses) → bottom sheet → "window"; swipe-to-close went banned → allowed → rejected. Each flip rewrote contracts, code, tests and up to 184 screenshots.
5. **The apparatus became the product.** 30% of all commits touch only documentation; there is 5.5 MB of Markdown; 29% of unit-test files read the repository as text instead of executing code; 38 of 59 "lessons" are about the harness itself; and the release gate's pixel snapshots fail 117 of 123 on this machine without any code change.

---

## 2. Timeline — three stacked phases

| Phase | Dates | Commits | Line churn | Docs share of churn | `src/` share | End ref | Left behind in `main` |
|:---|:---|---:|---:|---:|---:|:---|:---|
| P1 — Codex build: logic + first design | 2026-02-21 → 2026-05-21 | 262 | 191,963 | 41.1% | 33.2% | `d3305b7` (= `legacy/reference`, BQ-14) | `docs/archive/**` (9 prior instruction-file versions), 13 `scripts/qa/check-phase*.mjs` named after Codex "Dev Phase" numbers, 11 stale local branches |
| P2a — rebuild waves 1–12 + reconciliations R1/R2 | 2026-05-29 → 2026-07-15 | 32 | — | — | — | `5a1da0f` (wave 12) | 5 `anchor/*` tags (4 point at the same commit `afe7077`), `docs/design/resources/superseded/**` (981 lines), wave analysis+plan pairs in `docs/done/` |
| P2b — design-system rebaseline (BQ-38), theme cut, 5a/5b/5c, UX refactor, BQ-07 closeout | 2026-09-03 → 2026-09-11 | 41 | — | — | — | `a5aec95` (last commit before mobile analysis) | `docs/design/ds/**` (52 files, 14,399 lines), `@mirror` blocks in `globals.css`, parity guards, `ds/_provenance/**` |
| P2 total | 2026-05-29 → 2026-09-11 | 73 | 48,568 | 57.1% (docs 39.4% + docs/design 17.7%) | 13.0% | | |
| P3 — mobile full refactor steps 1–3 + follow-ups | 2026-09-14 → 2026-09-24 | 22 | 44,146 | 38.6% | 30.4% (+ tests 29.5%) | `20f973a` (HEAD) | `docs/plans/2026-09-11-mobile-refactor-maps/` (33 files, 1.86 MB), bottom-sheet stack, 184 regenerated baselines |
| P3′ — interaction prototype | 2026-09-24 → now | 0 in repo | — | — | — | claude.ai artifact `LPuzkZHX6FTcYwJJa8Vja3` + session scratchpad | nothing in repo (by design) |

Sources: `git log --format=%ad` bucketed by date; `git log --numstat` aggregated by top-level path; wave status in `docs/wave-roadmap.md:84–465` (waves 13–17 "⤳ 대체 (BQ-38, 2026-09-06)" at `:404`, `:418`, `:432`, `:446`, `:465`; programme close at `:479`); commits `e2aa2fb` (2026-09-14, mobile analysis, +12,491 lines of docs) and `39d2869` (2026-09-17, step 3, 235 files, +13,943/−4,181).

Two facts from the timeline matter for the separation work: `legacy/reference` already marks the end of P1, but **no ref marks the end of P2** (`a5aec95`, 2026-09-11) or of P3 (`20f973a`). And the only CI workflow (`.github/workflows/sync.yml`) runs `npm run sync` on every push to `main` with `contents: write`, and `scripts/sync/sync.ts:158` pushes the regenerated registry back to `main` — a rebuilt `main` will trigger it on its first push.

---

## 3. Quantified inventory (HEAD `20f973a`)

### 3.1 Documentation

| Measure | Value | Source |
|:---|---:|:---|
| Tracked files under `docs/` | 239 | `git ls-files docs \| wc -l` |
| Markdown files under `docs/` | 183 files · 56,696 lines · 5.52 MB | `git ls-files -z 'docs/*.md' \| xargs -0 cat \| wc -lc` |
| All Markdown in repo | 187 files · 5.60 MB | same, repo-wide |
| Live (non-lifecycle) Markdown under `docs/` | 20 files · 7,715 lines · 1.06 MB | excludes `docs/done`, `docs/archive`, `docs/plans` |
| `docs/plans/` ("active") | 38 files · 12,772 lines · 2.04 MB | of which `2026-09-11-mobile-refactor-maps/` = 33 files · 11,432 lines · 1.86 MB |
| `docs/done/` (record) | 108 files · 32,313 lines · 2.20 MB | 31 are analysis/report/survey/candidates/review documents; 3 in `done/closed/` |
| `docs/archive/` | 17 files · 3,896 lines · 231 KB | AGENTS v2 EN/KOR, v3, v5; Codex_Custom_Instructions v2 EN/KOR, v3, v5, v6; old project-rules, verification-commands, lessonlearned, backlog, … |
| `docs/design/ds/` | 52 files · 14,399 lines · 2.51 MB | 31 `preview/*.html` (2,784 lines), `colors_and_type.css` 962, `catalog-components.css` 805, `app-components.css` 1,280, `README.md` 43.6 KB, `SYNC.md` 16 KB |
| Docs added per month | Feb 9 · Mar 26 · Apr 26 · May 66 · Jun 24 · Jul 5 · **Sep 134** | `git log --diff-filter=A -- docs` |
| Docs-only commits | 106 of 357 (30%) | commits whose every path is under `docs/` or ends `.md` |
| `AGENTS.md` | 244 lines · 27 KB · 36 revisions | `git log --oneline -- AGENTS.md \| wc -l` |

Largest live contract documents (bytes · lines · revisions where measured):

| File | Bytes | Lines | Revisions |
|:---|---:|---:|---:|
| `docs/decision-register.md` | 239,196 | 680 | 57 |
| `docs/req-test.md` | 147,087 | 1,366 | 37 |
| `docs/req-landing.md` | 114,833 | 1,031 | 56 (64 with `--follow`) |
| `docs/LESSONS_LEARNED.md` | 106,057 | 390 | — |
| `docs/project-analysis.md` | 105,028 | 760 | — |
| `docs/wave-roadmap.md` | 47,292 | 497 | — |
| `docs/design/ds/README.md` | 43,571 | 199 | — |
| `docs/req-test-plan.md` | 41,646 | 398 | — |
| `tests/e2e/theme-matrix-baseline-provenance.md` | 40,929 | 290 | — |
| `docs/design/design.md` | 39,586 | 445 | 12 |
| `docs/requirements.md` | 33,345 | 381 | — |
| `docs/req-landing-interaction.md` | 29,019 | 236 | — |
| `docs/DECISIONS.md` | 28,798 | 178 | — |

Line counts understate size: the decision register averages ~350 bytes per line because each paragraph is one line.

### 3.2 Decisions and lessons

| Measure | Value | Source |
|:---|---:|:---|
| BQ decisions | 48 (`BQ-01`…`BQ-48`) | `docs/decision-register.md:13–596` |
| Largest single entry | `BQ-38` = 50 KB (lines 349–515, with 10 `### BQ-38 후속` sub-entries) | same |
| Change-history section | 103 KB · 79 table rows | `docs/decision-register.md` `## 변경 이력` (starts after `:596`) |
| Median entry | ~1 KB | computed per `## BQ-NN` block |
| Supersede/replace markers | 30 | `superseded|대체|폐기|withdrawn|reversed|번복` |
| Lessons | 59 (`L01`…`L59`) · 106 KB | `grep '^### L' docs/LESSONS_LEARNED.md` |
| Lessons about the harness/guards/tests/measurement rather than product behaviour | 38 of 59 (my classification) | L01–L09, L11, L14, L16, L18, L20, L21, L24, L25, L27–L37, L41, L42, L44–L46, L48–L50, L55–L58 |
| Rule-rationale log | `docs/DECISIONS.md` 29 KB, 12 entries | separate from the BQ register |

### 3.3 Source, CSS and tokens

| Measure | Value | Source |
|:---|---:|:---|
| `src/**/*.ts(x)` | 202 files · 22,129 lines | `git ls-files src` |
| Comment lines in `src` (ts/tsx/css, excl. generated) | 2,791 of 23,149 (12.1%) | regex over `/* */` and `//` |
| History/measurement narrative in `src` comments | 177 phrases (`종전`, `used to`, `Until this commit`, `실측`, `measured`…) across 73 files; 46 dated references; 206 `BQ-`/`L##`/`§N` citations | same scan |
| `src/app/globals.css` | 516 lines (267 comment lines = 52%) · 151 custom-property declarations · 3 `@mirror` blocks (`:129–263` light, `:374–394` mobile-type, `:403–465` dark) | file; history: 1,240 → 112 lines at the Tailwind migration and 149 after 2026-05-07 (`docs/project-analysis.md:504`), 516 now |
| `landing-grid-card.module.css` | 436 lines (87 comment) · 30 scoped `--normal-*`/`--expanded-*` declarations | file |
| Other CSS | `fonts.generated.css` 848 · `bottom-sheet.module.css` 134 · `landing-catalog-grid.module.css` 75 · `test-question.module.css` 40 · `visually-hidden.module.css` 32 | `git ls-files src \| grep css` |
| Class-string modules (Tailwind strings in TS) | `button-class-names.ts` 134 · `surface-class-names.ts` 124 · `landing-grid-card-classnames.ts` 109 · `gnb-control-class-names.ts` 33 | three styling mechanisms coexist: utilities in TS strings, CSS modules, global CSS |
| Files over the 500-line discipline (`AGENTS.md` §3) | `use-landing-interaction-controller.ts` 528 · `globals.css` 516 · `site-gnb.tsx` 506 | `wc -l` |
| Design-definition token declarations | 337 lines of `--x:` in `docs/design/ds/colors_and_type.css`; the runtime mirrors "87 of the design definition's 198" | `globals.css:97–98` comment |
| Tokens retired as dead or pure aliases in P2b | 52 consumer-less tokens (`325458a`), 24 rename-only aliases (`0bac5f1`), 11 more recorded dead in `globals.css:113–119` | commit subjects, file |
| Literal copies of one colour | `#fbfaf7` (canvas) in 48 tracked files / 82 occurrences; `#5c8e78` (sage) in 50 files / 98 occurrences | `git grep -il` |
| Runtime homes of `#fbfaf7` | `globals.css`, `theme-ground-color.ts`, `theme-bootstrap-source.ts`, `brand-assets.ts`, `icon.svg`, `consent-recall-link.tsx`, 9 `public/landing-card-media/*/thumbnail.svg` | same |

### 3.4 Tests, guards, snapshots

| Measure | Value | Source |
|:---|---:|:---|
| Unit test files | 124 · 20,725 lines · 761 `it/test` calls | `tests/unit` |
| E2E specs | 17 · 11,819 lines · 267 `test(` calls · 222 `@smoke` tags | `tests/e2e/*.spec.ts`; largest `grid-smoke` 2,527, `state-smoke` 1,927, `gnb-smoke` 1,629 |
| Unit test files that read the repository as text (static guards) | 38 of 124 · 6,007 lines (29%) | `readFileSync|helpers/repo|git grep|execSync|readdirSync` |
| Guards over documents/process | 9 files · 1,069 lines: `contract-citations` 386, `design-specimen-coverage` 112, `docs-lifecycle` 116, `qa-registry` 89, `decision-register` 84, `snapshot-baselines-tracked` 79, `design-ds-boundary` 72, `lessons-ledger` 68, `snapshot-environment-note` 63 | describe titles |
| Guards that exist because a value has copies | `design-tokens-dark-parity` 349, `locale-alias-parity` 170, `font-subset-manifest` 102, `answer-choice-catalog-parity` 85, `brand-assets-parity` 67, `theme-color-parity` 67, plus `scripts/qa/check-design-token-parity.mjs` 308 | files |
| Source-hygiene regex guards | `tailwind-candidate-hygiene` 115, `type-literal-provenance` 117, `error-boundary-coverage` 106, `shared-shell-gutter` 100, `css-module-reference-integrity` 90, `segment-404-unreachability` 85, `safe-storage-discipline` 64, `mobile-breakpoint-literals` 60, `text-wrap-escape` 49 | files |
| Implementation fingerprints of the legacy controller | 3 files · 1,658 lines (`landing-controller-sequence-fingerprint` 1,002, `-card-render-` 386, `-interaction-reducer-` 270) | files |
| `qa:rules` regex checkers | 13 · ~2,750 lines, excluded from the Default Done gate (`AGENTS.md` §5) | `scripts/qa/run-all.mjs` |
| Release-blocking checks written in prose | 60 (30 in `req-landing.md` §14.2, 30 in `req-test.md` §12.2) | numbered items |
| Traceability layer | `docs/blocker-traceability.json` 67 entries (58 automated, 7 manual, 2 scenario); 12 `<!-- assertion: -->` anchors in `req-test.md`; 192 `assertion:` references in tests/scripts | files |
| Landing/GNB-specific tests | unit 8,669 lines + E2E 8,446 lines = 17,115 (53% of all test lines) | name filter |
| Tracked screenshot baselines | 189 PNG (184 `theme-matrix-smoke`, 5 `safari-hover-ghosting`), all `darwin` | `git ls-files 'tests/e2e/*-snapshots/*'` |
| Baseline environment recorded | `darwin 25.6.0, Apple M2 Pro, playwright 1.57.0` | `tests/e2e/snapshot-environment.json` |
| This machine | Mac mini, Darwin 27.0.0 → `test:e2e:gate` 6 of 123 pass, 117 fail, no code change | memory `vivetest-preexisting-red-gates.md`; `tests/e2e/theme-matrix-baseline-provenance.md:282` |
| Baseline regenerations recorded | 2026-05-11, 05-13, 05-17, 09-11, 09-17, 09-19 (+1 retired image) | provenance headings `:22–282` |
| CI running tests | none — the only workflow is the Sheets sync | `.github/workflows/sync.yml` |

### 3.5 Dead code and residue

| Item | Evidence |
|:---|:---|
| `src/i18n/routing.ts` — no importer anywhere; its `pathnames` omit `/result/...` and `/test/error` | `git grep "i18n/routing"` returns nothing; last touched `22845b9` (2026-04-04) |
| `src/features/landing/grid/use-mobile-scroll-lock.ts` — imported only by its test | `tests/unit/landing-mobile-scroll-lock.test.ts:11` |
| Exports with zero references outside their own declaration and no test: `CORE_MOTION_REVEAL_DELAYS_MS` (`hover-intent.ts:4`), `useLandingCardSubtitleSplit` (`landing-card-title-continuity.tsx:279`), `resolveVariantPreviewPayload` (`question-bank.ts:99`), `resetLazyValidatedVariantCacheForTests` (`lazy-validation.ts:99`), `resultsSourceFixture` (own-file only) | `git grep -n "\b<name>\b" -- src tests scripts` |
| Exports used only by tests (production has no caller): 53, e.g. `resolveInputProfile`, `isHoverCapable`, `isMobileLifecycleActive`, `queueFocusCallback`, `isDocumentLevelFocusTarget`, `isMobileCardElement`, `resolveAdjacentCardVariant`, `DESKTOP_EXPANDED_DESIRED_FINAL_SCALE` | export scan over `src` vs `tests`/`scripts` |
| Desktop/hover-only landing machinery | 11 files · 1,879 lines (23% of `src/features/landing`, 8,100 lines): `use-hover-intent-controller` 452, `use-card-keyboard-handler` 311, `use-desktop-card-close-controller` 266, `use-desktop-motion-controller` 204, `landing-grid-card-desktop-shell` 159, `desktop-shell-phase` 123, `use-hover-scroll-hold` 115, `use-keyboard-handoff` 83, `baseline-manager` 72, `hover-intent` 51, `use-keyboard-mode-tracker` 43; 533 `desktop|hover` mentions in landing `src`, 1,036 in `tests` |
| Desktop-only contract sections | `req-landing.md` §7.5 HOVER_LOCK (hover-capable only), §7.6 keyboard sequential expansion (desktop/tablet); `req-landing-interaction.md` §8.2 desktop/tablet trigger, §8.4 expanded shell scale |
| Unrelated page served in production | `public/56T-ToDo.html` — 4,291 lines, 578 KB, a personal planner unrelated to ViveTest (`94cd18a`, `ae37a1c`, 2026-08-29) |
| Tracked tool debris | `.playwright-mcp/` 3 files (console/page logs, 2026-05/06) |
| Superseded design layers kept in tree | `docs/design/resources/superseded/` (old `design.md` + 3 wave CSS, 981 lines); `docs/design/ds/_provenance/` (v2 originals, 498 lines) |
| Stale refs | 11 local branches, 5 ahead-of-`main` by 1 commit (`codex/GS-Sync-*`, `codex/backup-main-before-origin-sync-20260513`, `codex/gnb-theme-hover-control`), 3 stale remote branches; `anchor/w03-06`, `w07-10`, `w11-14`, `w15-17` all = `afe7077` although their names suggest four different completion points (`AGENTS.md` §4 warns about exactly this) |
| Claude Design residue | project `cd630eec` holds 82 files vs 46 in the repo; 19 preview cards, `vive-components.css`, `ui_kits/**` are unmirrored legacy (`docs/design/ds/SYNC.md` §What is pushed); two more projects exist (`ee2fb724`, `825385f6`) per memory `vivetest-claude-design-integration-status.md` |

---

## 4. Diagnoses with evidence

### D1. Programmes stacked without closing (WIP > 1)

- The 17-wave roadmap stopped at wave 12; waves 13–17 were "대체" by the design-system programme (`docs/wave-roadmap.md:404–465`), which re-scoped them into steps 1–6, tier-2 U1–U4, candidates 0–10, 5a/5b/5c A–C, UX refactor steps 1–2, "Step 3/4" — at least nine named sub-programmes in nine days (commit subjects 2026-09-06 → 2026-09-11).
- The mobile refactor analysis (`e2aa2fb`) started 2026-09-14, three days after that programme closed (`9e3548f`), and its step 3 (`39d2869`, 2026-09-17) landed while the prototype phase was about to start (2026-09-24).
- The prototype's verdicts (2026-09-25) contradict step 3 within a week (§D4). Nothing was removed when a direction was replaced; the replaced direction's documents, tokens, guards and baselines stayed.
- The contract itself still says the old programme is running: `AGENTS.md:13` "현재 **rebuild wave 진행 중**", although `docs/wave-roadmap.md:479` records the programme close on 2026-09-11.

### D2. Authority fragmented across ~12 "SSOT" documents; restatement makes them drift; guards verify form, not truth

- `AGENTS.md` §2 routes a task to 8 rows plus 4 "Rebuild Workflow Sources"; §4 lists 12 SSOT contracts (`req-landing`, `req-landing-interaction`, `req-test`, `req-test-plan`, `project-analysis`, `design.md`, `ds/colors_and_type.css`, `AGENTS.md`, `agent-guides/**`, `decision-register`, `wave-roadmap`, plus `blocker-traceability.json` as evidence registry). "SSOT/정본" appears 19× in `AGENTS.md`, 16× in the register, 12× in `req-test.md`, and 22× in `src` comments.
- Precedence chains: `AGENTS.md:9` (host > contract > global), `AGENTS.md:56` (7-level visual source precedence), `docs/design/design.md:24` (4-level authority order), `docs/req-landing.md:52` §3.1 (4-level in-document priority), `docs/req-landing-interaction.md:21` §0.2 (cross-document priority), `docs/agent-guides/project-rules.md` §Visual-Design ("`decision-register.md` > product requirements > `design.md`"). A registered cross-document conflict proves the chains are exercised: `docs/decision-register.md:434` D-11 "`design.md` §7.6 이 `req-landing.md` §6.4 와 3 건 충돌한다".
- Restatement is institutionalised: `req-landing.md` §3.2 lists 16 triggers that each require editing 2–6 sections together; `req-test.md` §11 lists 23 triggers. Each release-blocking behaviour is then restated a fourth time in §14.2/§12.2 (60 items), a fifth in `blocker-traceability.json` (67 entries) and a sixth as `assertion:` anchors (192 references).
- `req-landing.md` was split so that §8 lives in another file (`req-landing-interaction.md` keeps sections numbered 8 and 11 so old citations still resolve).
- **False statements in live contract documents today** (all pass every guard):
  1. `AGENTS.md:13` — "rebuild wave 진행 중" (closed 2026-09-11, `wave-roadmap.md:479`).
  2. `AGENTS.md:25` — tech stack lists `motion@12.34.0`; it is not in `package.json` and nothing imports it (removed in `39d2869`).
  3. `docs/agent-guides/project-rules.md:124` — "`motion` is currently imported in `src/features/test/test-question-client.tsx`" (false).
  4. `project-rules.md:119` — "Theme-matrix screenshot baselines are local ignored files" (189 are tracked, enforced by `snapshot-baselines-tracked.test.ts`).
  5. `project-rules.md:136` — "The global layer is still the prior theme … Do **not** apply `design.md` global tokens to `globals.css` before Wave 16" (the theme cut `986a956`, 2026-09-07, did exactly that; waves 13–17 no longer exist).
  6. `project-rules.md:134` — lists a `-mobile-surfaces` render branch (no such file) and says the scoped tokens' "*values* match … coexistence is intentional", while `AGENTS.md:26` says they now point at global tokens.
  7. `project-rules.md:22`, `:36–37`, `:148` — `response-projection.ts` "Reserved placeholder — currently unimplemented … exports no runtime helper" (it exports `projectRunResponses`, consumed at `src/features/test/result-view-model.ts:182`).
  8. `project-rules.md:24` — `src/features/ui/**` "현재 `button-class-names.ts` 한 파일" (12 files).
  9. `project-rules.md:87` — `resolveVariantPreviewPayload()` named as a "live anchor" (zero importers).
  10. `docs/project-analysis.md:12` — "74 unit … 10 Playwright … 12 contract scripts" (now 124 / 17 / 13); `:488` `globals.css` "149 lines" (516); `:495`/`:505` module CSS "491 lines" (436); `:14` "Git tracked PNG completeness is not required" (reversed 2026-09-11). `project-analysis.md` is a routed SSOT for routing (`AGENTS.md` §2 row 1).
  11. `tests/unit/theme-color-parity.test.ts:10` — the docblock cites `public/theme-bootstrap.js`, which does not exist (the literal lives in `src/features/gnb/theme-bootstrap-source.ts`).
  12. `src/i18n/routing.ts` — dead module whose `pathnames` disagree with the real route table in `AGENTS.md:19`.
- Why guards missed all twelve: `contract-citations.test.ts` checks that cited paths exist, `§N` headings exist, npm scripts exist and git refs resolve (`:160–379`); `docs-lifecycle.test.ts` checks directory location and the absence of an index (`:61–91`); `decision-register.test.ts` and `lessons-ledger.test.ts` check numbering and headings. None can know whether a sentence is still true. More guards cannot fix this; fewer restatements can.

### D3. One visual value, six to nine homes

Layers a colour/type token currently lives in (each is a place it must be changed or kept in sync):

| # | Layer | Role per current contract | File / place |
|---:|:---|:---|:---|
| 1 | Design intent | `I` — "목표값이지 현재값이 아님" | `docs/design/design.md` §5 (`:123–245`) |
| 2 | Design definition | `C` — realized definition, pushed to Claude Design | `docs/design/ds/colors_and_type.css` |
| 3 | Runtime mirror | `R` — byte-equal copy between `@mirror` sentinels | `src/app/globals.css:129–465` |
| 4 | Module-scoped aliases | card motion/visual | `src/features/landing/grid/landing-grid-card.module.css` (30 `--normal-*`/`--expanded-*`) |
| 5 | TS/JS literal copies | CSS variables unreadable by `meta[name=theme-color]` and pre-hydration script | `src/app/theme-ground-color.ts`, `src/features/gnb/theme-bootstrap-source.ts`, `src/app/brand-assets.ts`, `src/app/icon.svg` |
| 6 | Asset literals | thumbnails | 9 `public/landing-card-media/*/thumbnail.svg`, 8 `docs/design/ds/assets/*.svg` |
| 7 | Specimen stylesheets and 31 preview cards | documentation that "cannot be imported into the product" | `docs/design/ds/{catalog,app}-components.css`, `preview/*.html` |
| 8 | External copy | Claude Design project `cd630eec` (82 files there vs 46 here) | `docs/design/ds/SYNC.md` |
| 9 | Prototype copy | "copied from docs/design/ds/colors_and_type.css" + per-test palettes | prototype `shared/tokens.css` (97 custom properties), 266 distinct hex literals across mockups |

The repository's response to this was additive: a provenance taxonomy with four codes (`AGENTS.md` §3-1, R/C/D/I, "출처를 밝히지 않은 값은 쓰지 않는다"), a registered-divergence rule (`AGENTS.md:56`, "현재 BQ-38의 3건"), six parity guards plus a `qa:rules` parity checker (§3.4), and a push log that records each transfer by hand (`SYNC.md` §Push log, 9 rows in 11 days). The need for `answer-choice-catalog-parity.test.ts` is documented as a symptom: the ds definition lagged the product ("마지막 칸은 실제로 밀렸다", `docs/plans/2026-09-16-design-uplift-before-step3.md` opening), and the same plan found the ds bundle missing half the surfaces step 3 would build and canonising a model step 3 deletes (`:29–40`).

### D4. Specifications frozen ahead of decisions — the same decisions flipped

| Decision | Flip 1 | Flip 2 | Flip 3 |
|:---|:---|:---|:---|
| Test instruction surface | modal dialog — `f150ea5` 2026-09-09 "5c 묶음 A — 지시창을 modal dialog 로" | bottom sheet — `c05850e` 2026-09-14 "instruction 은 시트"; spec `docs/plans/2026-09-14-mobile-refactor-design-spec.md` "여기 적힌 것은 **다시 묻지 않는다**" | modal again — owner 3차 피드백 2026-09-25: 「시작 전 안내 하단 바텀 시트는 화면 위를 덮는 모달 팝업/시트 형태로 변경되는게 더 바람직해보입니다. (모든 안 공통)」 |
| Phone card expansion | in-flow card growing in place (`req-landing.md` §8.5, 32 clauses, per memory `vivetest-mobile-interaction-mockups.md`) | bottom sheet — `req-landing-interaction.md` §8.5 "이 절은 2026-09-16 에 전면 재작성됐다" (BQ-43) | "window": the expanded card hosts the test stage and grows to full screen (prototype 3차, `l3-deck.html`) — owner: 「카드를 펼치면 그 안에서 첫 질문이 무대의 모습으로 열리는 방식은? > 좋습니다.」 |
| Swipe-down close | "Never Reintroduce" | allowed — change-history row 2026-09-16 "BQ-11 부분 대체 — 「Swipe-down close」가 Never Reintroduce 에서 내려와 시트의 닫기 경로 다섯 중 하나가 됐다"; shipped as `src/features/ui/use-sheet-swipe.ts` (137 lines) in `39d2869` | rejected — owner principle: "시트는 끌어서 닫지 않는다 — 바깥 탭과 닫기 버튼이면 충분하다" (memory `vivetest-owner-interaction-principles.md`) |
| Revisit navigation | `req-test.md` §4.3: "scoring 응답 확정 직후 시스템은 즉시 다음 미응답 scoring question으로 이동한다" | owner 2차: going back and changing an answer must advance one question at a time (memory principles: "현행 `req-test.md` §4.3 … 과 충돌하므로 제품 반영은 계약 개정이다") | — |
| Answer count | `req-test.md` §4.3: "정확히 두 개의 answer option" | owner 3차: 「나중에 3지선다, 4지선다 응답형 테스트도 있을 수 있습니다.」 (prototype I now handles 2–4) | — |
| Motion/tone | `design.md:107` and `:377` "**Banned:** bounce, spring overshoot, parallax, card tilt, auto-playing decorative motion"; `req-landing.md` §1.3 "배경 동적 연출은 강도 `0`/정지 상태로 비활성화한다" | owner 1차: 「원하는 톤 … → 3 ~ 5 수준」 and 「현란하고 창의적인 UX와 모션 제공하면서 동시에 직관성도 갖춰야 함」 | — |

The design spec also records six options reversed during its own review ("공유 시트 컨테이너 · 동의 바텀시트 · 태블릿 하단 이동 · 언어 칩 접기 · 동적 OG · 2 열 그리드", header of the 2026-09-14 spec). Every row above generated contract edits, BQ entries, code, unit/E2E changes and, for visual rows, baseline regeneration (`theme-matrix-baseline-provenance.md` §2026-09-16 records three separate causes queued for "단위 11").

### D5. Documentation as the main output; comments as a second history

- Docs churn exceeded `src` churn in P1 (41.1% vs 33.2%) and P2 (57.1% vs 13.0%). 106 of 357 commits are docs-only. September alone added 134 documents.
- Each wave produced two or three documents (analysis → plan → rev2/implementation), e.g. wave 8: `wave-8-blog-visual-analysis`, `wave-8-blog-visual`, `wave-8-improvement-candidates`; R1: `visual-reconciliation-r1-analysis`, `-analysis-rev2`, `r1`.
- `docs/plans/` still holds the 33-file, 1.86 MB `mobile-refactor-maps` corpus for a direction the prototype superseded; `2026-05-17-result-pipeline-todos.md` has been "active" since May; `2026-09-11-mobile-refactor-step3-surfaces.md` remains in `plans/` after `39d2869` landed it (the location rule of `AGENTS.md` §7-1 is enforced, the truth of the location is not).
- The decision register became a diary: BQ-38 is 50 KB, the change-history table 103 KB; implementation narrative (measurements, per-commit notes) is repeated across the BQ entry, the plan, the commit body and code comments.
- Source comments carry history: `globals.css` is 52% comment, including a benchmark table (`:30–37`) and a narrative of what "used to" be (`:266–290`); 177 history/measurement phrases across 73 `src` files; `next.config.ts:16–24` explains past cache behaviour; `src/features/test/response-projection.ts:4–20` narrates what its reservation comment used to say. These comments cite 206 doc anchors (`BQ-`, `L##`, `§N`), so renumbering a document silently rots code comments — and `contract-citations.test.ts` exists partly to police that coupling.

### D6. The verification apparatus became a defect source

- 29% of unit-test files (38/124, 6,007 lines) never execute product code; they grep it or grep documents.
- 13 `qa:rules` checkers (~2,750 lines) are regex over source, named after March "Codex Dev Phase" numbers, and are excluded from the Default Done gate (`AGENTS.md` §5) — memory `vivetest-harness-guards-live-in-vitest.md` records that guards placed there "평시에 안 돈다", and lesson `L05` records the same.
- The ledger's own content shows the cost: 38 of 59 lessons are about the harness — registries that silently omit (`L02`), census guards that count their own docstring (`L03`), negative citations read as requirements (`L04`), release-tier gates that never run (`L05`), pixel checks that are "theatre" (`L20`), guards that assert spelling (`L21`), guards narrowed to an incident's shape (`L30`), regex spanning files (`L31`), `.tsx` unit tests never collected (`L35`), guards for features not yet on (`L42`), expectations computed with the product's own predicate (`L57`).
- Three fingerprint suites (1,658 lines) freeze the internal call sequence of the legacy landing controller; they were a refactor safety net for step 1 ("행동은 한 비트도 바꾸지 않는다", `4bdec85`) and are meaningless for a rebuild.
- Snapshot gate: 189 darwin PNGs; the release gate (`@gate`) is dominated by `theme-matrix-smoke` and `safari-hover-ghosting`. On 2026-09-11 the gate was found "작동하지 않고 있었다" — 125 failed / 1 passed on a clean clone, because sessions had been told not to run it (memory `vivetest-preexisting-red-gates.md`). After an OS update on 2026-09-19 it is 6/123 on this machine with no code change. Six lessons are snapshot-specific (`L11`, `L24`, `L27`, `L28`, `L32`, `L41`), and a 41 KB provenance document exists solely to adjudicate baselines. There is no CI that runs tests, so the pixel reference is whichever Mac last regenerated it.

### D7. Onboarding cost of one UI change

Worked example: "raise the phone card title size by one step" (a type token plus card visual — exactly what `BQ-48` did on 2026-09-16). What the current contract routes a session to, in order:

| # | Document | Why the contract sends you there | Bytes | ≈ tokens |
|---:|:---|:---|---:|---:|
| 1 | `~/.claude/CLAUDE.md` | auto-loaded global rules | 45,494 | 12,600 |
| 2 | `.claude/CLAUDE.md` | pointer | 1,203 | 350 |
| 3 | `AGENTS.md` | contract; §2 routing, §3-1 provenance, §4 Ask-First | 27,254 | 7,700 |
| 4 | `docs/req-landing.md` §6.6 / §6.7 | "landing grid" row | 114,833 | 33,000 |
| 5 | `docs/req-landing-interaction.md` | motion/gesture row | 29,019 | 8,400 |
| 6 | `docs/agent-guides/project-rules.md` §Visual-Design, §Blog-Telemetry-Theme | routing rows | 13,062 | 3,600 |
| 7 | `docs/agent-guides/verification-commands.md` §landing | verify column | 4,154 | 1,150 |
| 8 | `docs/design/design.md` §4.3, §5.1, §7 | "visual skin / design tokens" row | 39,586 | 10,900 |
| 9 | `docs/design/ds/colors_and_type.css` | "토큰 값은 …" | 50,006 | 13,800 |
| 10 | `docs/design/ds/README.md` findings | open drift items (D-01…D-21) | 43,571 | 12,000 |
| 11 | `docs/design/ds/SYNC.md` | `ds/**` is Ask-First and pushes out | 15,978 | 4,400 |
| 12 | `docs/decision-register.md` | first link of the visual precedence chain | 239,196 | 68,200 |
| 13 | `docs/wave-roadmap.md` | "rebuild scope" source; §10 "wave 경계를 넘기 전에 정지" | 47,292 | 13,200 |
| 14 | `docs/LESSONS_LEARNED.md` (titles, then hits) | "필수 진입점" for contract changes | 106,057 | 30,800 |
| 15 | `tests/e2e/theme-matrix-baseline-provenance.md` | baseline diff must be explained with provenance (§4 Hard stops, §10) | 40,929 | 11,700 |
| 16 | `tests/e2e/README.md` | regeneration procedure | 1,621 | 450 |
| — | **Total** | | **819,255** | **≈ 232,000** |

Plus the active spec (`2026-09-14-mobile-refactor-design-spec.md`, 34 KB) if the change touches a phone surface, plus the code (`globals.css` mirror, module CSS, component), plus `tests/e2e/**` "E2E 스펙이 동작 계약의 실측 기록이다" (`AGENTS.md` §10). Verification then runs 8 `qa:rules` scripts, 11 unit files and 4 E2E specs listed under `verification-commands.md` §landing, plus the parity guards, plus a Claude Design push, plus 184 baselines. Even reading only routed sections, the first precedence link (`decision-register.md`) is 239 KB. A rebuild target of "AGENTS.md + one spec section + the token file + the component" is four reads.

### D8. What one token change touches (the real `BQ-48` case)

From `docs/decision-register.md` BQ-48 "Implementation impact", `SYNC.md` push log and the provenance document:

| # | Artifact touched | Kind |
|---:|:---|:---|
| 1 | `docs/design/design.md` §4.3 — axis and line-height floor registered | intent doc |
| 2 | `docs/decision-register.md` BQ-48 entry (+ change-history rows) | decision log |
| 3 | `docs/design/ds/colors_and_type.css` — new mobile block, `--button` correction | design definition |
| 4 | `src/app/globals.css` — third mirror pair `@mirror-begin mobile-type` | runtime copy |
| 5 | `tests/unit/design-tokens-dark-parity.test.ts` — third comparison case | parity guard |
| 6 | `tests/e2e/typography-smoke.spec.ts` (`assertion:TY-01`, `TY-02`) | new E2E |
| 7 | `docs/design/ds/README.md` — findings D-13/D-18/D-19 closed | findings table |
| 8 | 17 phone specimen boxes given `.vt-phone` (D-21), preview cards | specimens |
| 9 | Claude Design `cd630eec` — two pushes on 2026-09-16, verified by `get_file` | external copy |
| 10 | `tests/e2e/theme-matrix-baseline-provenance.md` §"타이포 뷰포트 축이 더한 두 번째 원인" | baseline narrative |
| 11 | 184 theme-matrix baselines regenerated in step 3 unit 11 (2026-09-17) | screenshots |

Eleven artifacts and one external system for one design decision. A colour change additionally reaches layers 5–6 of §D3 (TS literals, SVG thumbnails).

### D9. Desktop-first residue under a mobile-first product

23% of landing `src` (1,879 lines) and a large share of landing tests serve hover-capable desktop behaviour (§3.5). The prototype is phone-only — "Desktop ≥1080px shows a sticky phone-frame iframe preview" (prototype dialogue, hub description) — and the owner reviewed rounds 2 and 3 in the desktop preview (「본 환경: [ ] 폰 [X] 데스크톱 미리보기」). So the prototype does not decide desktop behaviour; if nothing is decided, the rebuild will either port the legacy desktop machinery by inertia or improvise one.

### D10. Parallel agents and tool eras amplify all of the above

Nine archived instruction-file versions (Codex custom instructions v2–v6, AGENTS v2–v5) and 36 `AGENTS.md` revisions show the contract was re-cut for each agent era. Memory `vivetest-parallel-design-sessions-land-fast.md` records concurrent design sessions landing on `main`. Each session that cannot trust the documents writes a new analysis (`docs/plans/…-maps/`, `docs/done/*analysis*`: 31), which becomes the next session's reading load.

---

## 5. Assets worth carrying forward vs liabilities

| Item | Size | Disposition | Why |
|:---|---:|:---|:---|
| Pure test domain `src/features/test/domain/**` + its unit tests | 755 lines | carry, with tests | pure, gold-standard per `AGENTS.md` §6; independent of UI model |
| Variant registry (`types`, `builder`, `resolvers`, `source-fixture`, `localization`, `cross-sheet-integrity`, `sheets-row-normalizer`, serializer) + generator + tests | ~1,400 lines (+420 generated) | carry, re-check against new answer-count schema (2–4) | data pipeline is UI-independent; `req-test.md` §4.3 "정확히 두 개" is already contradicted |
| Sheets sync scripts + `.github/workflows/sync.yml` | 509 lines + 41 | carry but disable/retarget first | it pushes to `main` on every push (`scripts/sync/sync.ts:158`) and will fire on the rebuilt `main` |
| Telemetry validation + consent source | ~840 lines (5 files) | carry the schema, rewrite the runtime hooks | payload hygiene is a gold standard; event set will change with the new flow (share, votes, stages) |
| i18n config (`src/config/site.ts`, `src/i18n/{proxy-policy,request,request-locale-header,messages}.ts`, `src/proxy.ts`) + 12 message catalogs (en: 89 keys, 8 namespaces) | ~900 lines + 1,284 JSON lines | carry | locale model (12 codes, BCP-47 mapping, BQ-40) is product-level, not UI-level |
| Font subset pipeline (`public/fonts/**` 93 files, `fonts.generated.css`, supplement, BQ-47 measurements) | — | carry | measured perf win (2,058 KB → 116 KB) independent of design |
| Landing grid/expand/hover machinery, GNB, UI primitives (bottom sheet), transition, blog client, plus the test-flow UI | ~12,200 lines + test-flow UI | rewrite from prototype | the interaction model is replaced (deck + window + stages) |
| `req-landing*.md`, `req-test*.md`, `project-analysis.md`, `requirements.md` | ~470 KB | reference-only; mine for still-valid behaviours into the new spec | restated, partly false, partly contradicted by the prototype |
| `decision-register.md`, `DECISIONS.md`, `LESSONS_LEARNED.md` | ~375 KB | reference-only; seed a fresh short log with the few decisions that survive | diary-shaped; 38/59 lessons die with the harness |
| `docs/design/ds/**`, `design.md` | ~2.55 MB | reference-only for values; revoke the tone/motion foundation | owner's tone (3–5, motion-rich) contradicts the "calm" foundation and its bans |
| 189 snapshots, provenance doc, 13 `qa:rules`, 9 doc guards, 3 fingerprints | — | discard | host-bound or legacy-shape-bound |
| `public/56T-ToDo.html`, `.playwright-mcp/`, `src/i18n/routing.ts`, dead exports | — | discard | unrelated or dead |

---

## 6. Twelve structural rules for the rebuild

Each rule states what it replaces and the evidence that motivates it. Enforcement prefers structure (fewer copies, fewer files) over new guards.

### Rule 1 — Legacy lives in refs, not in `main`'s tree; `main` receives an explicit port list

- **Rule.** Mark the three phase ends with annotated tags on `origin` (suggested: keep `legacy/reference` = `d3305b7` for P1; add one for P2 at `a5aec95`; add one for P3 at `20f973a`). The rebuild's first commit on `main` removes every tracked path except the port list of §5 (each ported module arrives with its unit tests). Keep git history (no orphan root, no force-push), so `git log`/`git show <tag>:<path>` remain the archive.
- **Retires.** `docs/archive/**`, `docs/design/resources/superseded/**`, `docs/design/ds/_provenance/**`, `docs/done/**` in the working tree, the five `anchor/*` tags as a planning concept, tracked debris.
- **Evidence.** §3.5 residue (9 archived instruction versions, 981 + 498 lines of superseded design layers, 4 anchor tags on one commit, 11 stale branches, `public/56T-ToDo.html` served in production, dead modules); `AGENTS.md` §4 already treats `legacy/reference` as a read-only comparison ref (BQ-14), which is the mechanism generalised.

### Rule 2 — The prototype is evidence, not specification, and none of its code is ported

- **Rule.** Pin the final prototype version (artifact URL + version) and keep its source outside `main` (artifact and/or an archive ref). The new spec restates each adopted behaviour as a short, testable product sentence that links to the prototype screen that motivated it. Anything the prototype did not decide is written as an open item, never inferred: desktop layout, per-test stage assignment, result page, share/vote server, OG.
- **Retires.** Contracts written before the owner has used the interaction on a device; the step-3 habit of freezing a spec ("다시 묻지 않는다") ahead of hands-on review.
- **Evidence.** §D4 (three flips in 16 days); prototype architecture is single-file HTML + iframe + `postMessage` (`vive:ready`, `window`, `open`, `collapse`, `q1`, `full`, `back`, `escape`; memory `vivetest-mobile-interaction-mockups.md`) with its own token copy and 266 hex literals (§D3 row 9); owner on stage assignment: 「어떤 테스트에 어떤 무대를 적용할지는 최종 배포 시점에 다시 한번 고민하고 결정하고」 and 「완성된 후에는 각 테스트 별로 어떤 타입을 적용할지를 사전에 정의하겠습니다.」; owner keeps all three stages: 「3개안 (반반화면, 갈림길, 스토리) 모두 이 서비스 안에서 사용하겠습니다.」; desktop not covered (§D9).

### Rule 3 — One programme in flight

- **Rule.** At most one open plan branch changes product behaviour or visuals at a time. A programme ends by landing or by deletion of its artifacts before the next begins; "superseded" plans are removed from `main`, not annotated.
- **Retires.** Superseded-but-kept waves, overlapping refactor/redesign/prototype phases.
- **Evidence.** §D1; owner's own diagnosis quoted in §0 (「2차 작업이 완료되기 전에 3차로 …」); step 3 (235 files) contradicted eight days after landing (§D4).

### Rule 4 — One normative document per concern; others link, never restate

- **Rule.** Concerns and their single homes: product behaviour → one spec (sections per surface, acceptance criteria as test names); visual values → the token file (Rule 7); component look → the rendered component gallery (Rule 8); content → message catalogs + registry; decisions → one short log (Rule 6); agent contract → `AGENTS.md`. No precedence chains (nothing overlaps, so nothing needs ranking), no "single-change synchronization" tables, no traceability JSON, no `assertion:` anchors — a behaviour is written once and its test cites nothing but its name.
- **Retires.** `requirements.md`, `project-analysis.md`, `req-test-plan.md`, `wave-roadmap.md`, `blocker-traceability.json`, the two-file landing spec split, the visual source precedence chain.
- **Evidence.** §D2 (12 SSOT sources, 6 precedence chains, D-11 conflict, 39 sync triggers, 60 prose blockers + 67 JSON entries + 192 anchors, 12 false statements that passed all guards).

### Rule 5 — A documentation budget, and no prose that restates code or git

- **Rule.** Live normative documents ≤ 6 files and ≈ 150 KB total, `AGENTS.md` ≤ ≈ 150 lines. Never write counts, line numbers, file inventories, test inventories, "verified on <date>" snapshots, or implementation status in contract prose — code, tests and `git log` answer those. Status belongs to the plan branch, not the contract.
- **Retires.** `project-analysis.md`-style inventories, ownership tables that enumerate files, "Path audit (date)" notes.
- **Evidence.** Live docs today = 20 files / 1.06 MB + `AGENTS.md` 27 KB (§3.1); a single UI change routes through 16 documents / 819 KB / ≈ 232k tokens (§D7); the stale inventories in `project-analysis.md:12–14, :488, :495` and `project-rules.md:22–37`; 30% docs-only commits; `globals.css` regrew from 112 to 516 lines, half comments.

### Rule 6 — Plans die at landing; analyses never land; decisions and lessons stay short

- **Rule.** `docs/plans/` holds only plans whose branch is open. At the squash landing the plan moves to `docs/done/` (as the global workflow already requires) and is never routed to or cited by live documents; analysis corpora, maps, scorecards and screenshots stay on the branch or in artifacts and never enter `main`. The decision log keeps one entry per decision in ≤ ≈ 12 lines (decision · why · supersedes/superseded-by); measurement narrative goes into the commit body. A lesson must become a test, a lint rule or a template change within the unit that found it; the ledger keeps only what cannot be mechanised, capped at ≈ 15 entries.
- **Retires.** 33-file analysis maps in `plans/`, 50 KB decision entries, the 103 KB change-history table, a 106 KB ledger.
- **Evidence.** §3.1 (`plans/` 2.04 MB, `done/` 2.20 MB with 31 analysis-type records), §3.2 (register 239 KB, BQ-38 50 KB, change history 103 KB, 38/59 harness lessons), `result-pipeline-todos` active since 2026-05-17, step-3 plan still active after landing.

### Rule 7 — One token source, consumed by the runtime; every other copy is generated

- **Rule.** Exactly one authored file holds token values (CSS custom properties, or a TS object compiled to CSS at build time) and the runtime imports it directly. Values needed outside CSS — `meta[name=theme-color]`, the pre-hydration theme script, OG/icon generation, SVG thumbnails — are generated from the same source at build time. The Claude Design bundle is generated from it by a script. The design-intent document carries no values. No mirror sentinels, no parity guards, no provenance codes.
- **Retires.** `@mirror` blocks, `design.md` §5 values, module-scoped alias tokens, `theme-ground-color.ts`-style literal copies, the R/C/D/I taxonomy, six parity guards and `check-design-token-parity.mjs`.
- **Evidence.** §D3 (nine homes, `#fbfaf7` in 48 files, `#5c8e78` in 50), §D8 (eleven artifacts per token decision), 52 dead + 24 alias + 11 dead tokens retired in P2b, "87 of 198" tokens mirrored, three reconciliation rounds BQ-21/R1/R2 (`SYNC.md` §What each side owns).

### Rule 8 — The design system is code-first; Claude Design receives a generated bundle

- **Rule.** Exploration may happen anywhere (prototype, Claude Design canvas). Once adopted, a visual decision is authored once in the token file and in real components; a gallery route (dev/build-only) renders every component and state from product code, and a script exports tokens + gallery output to the Claude Design system. Specimen HTML and "spec stylesheets that cannot be imported" are not written by hand.
- **Retires.** 31 hand-written preview cards, `catalog-components.css`/`app-components.css`, the findings table as a drift channel, the hand-kept push log.
- **Evidence.** `docs/design/ds/` = 52 files / 14,399 lines; the ds bundle lagged the product and missed half of step 3's surfaces (`docs/plans/2026-09-16-design-uplift-before-step3.md` §2); `DesignSync` is a file API with no generation method (same plan §1 ⑵), so any "revise in Claude Design" loop is manual labour; `cd630eec` carries 36 unmirrored legacy files; the old foundation's bans (`design.md:107`, `:377`) contradict the owner's tone (§D4 last row).

### Rule 9 — Comments describe the present code; history lives in commits

- **Rule.** A comment explains a non-obvious constraint of the code as it is now, in a few lines. No "used to / 종전 / until this commit", no benchmark tables, no measurement diaries, no citations of document section numbers; a stable decision ID is the only allowed pointer.
- **Retires.** 52%-comment CSS, doc-number coupling that needs a citation guard.
- **Evidence.** §3.3 and §D5 (2,791 comment lines, 177 history phrases in 73 files, 206 `BQ/L/§` citations); the stale `public/theme-bootstrap.js` reference in `tests/unit/theme-color-parity.test.ts:10`.

### Rule 10 — Guard budget: test behaviour; do not guard documents or copies

- **Rule.** Tests execute product code. Static checks are allowed only for invariants no behavioural test can express (e.g. single request entry, no raw-fixture imports) and are written as ESLint rules (`no-restricted-imports`, `no-restricted-syntax`) where possible; bespoke text-reading tests are capped at ≈ 5. No guard reads Markdown. No release-only tier: everything runs under `lint` + `test` + `e2e` on every landing.
- **Retires.** 9 doc/process guards, 13 `qa:rules` scripts, implementation fingerprints, source-hygiene regex suites that exist because of copies.
- **Evidence.** §D6 (38/124 text-reading test files, 38/59 harness lessons, `L05` release-tier gates that never run, `L20`/`L21`/`L30`/`L31`/`L57` guard failure modes, fingerprints 1,658 lines); §D2 (guards passed twelve false statements).

### Rule 11 — Snapshots are few, hermetic and never host-bound

- **Rule.** Behaviour, geometry and state are asserted through the DOM. Screenshots cover only a small set of key surfaces (≈ 20), are rendered in the official Playwright Linux container with pinned fonts, and run the same way locally and in CI. A screenshot diff never gates a landing on an unpinned host.
- **Retires.** 189 darwin baselines, the 41 KB provenance document, `snapshot-environment.json` adjudication.
- **Evidence.** §3.4 and §D6 (117/123 red after an OS update with no code change; gate non-functional until 2026-09-11; six regenerations; six snapshot lessons; no CI).

### Rule 12 — Mobile-first by construction; every capability branch is a decision

- **Rule.** The phone interaction model is the base; wider layouts are progressive enhancement. No hover-only, keyboard-mode or desktop-shell code path is written until the owner has decided desktop behaviour, and that decision is one entry in the decision log.
- **Retires.** Porting the 1,879-line desktop/hover machinery by inertia; desktop-only contract sections.
- **Evidence.** §D9 (23% of landing `src` is desktop/hover; the prototype is phone-only; the owner reviewed via a desktop preview of the phone frame).

---

## 7. Decisions implied by the rules

| Topic | Options | Recommendation | Owner must decide? |
|:---|:---|:---|:---|
| How `main` restarts | (a) one "clear tree" commit on top of history; (b) orphan root + force-push; (c) new repository | (a) — keeps `git show <tag>:<path>` as the archive, needs no force-push, keeps the Sheets action and remote settings | No — (b)/(c) are destructive or externally visible; (a) meets the stated goal |
| Phase-end tags | add P2 (`a5aec95`) and P3 (`20f973a`) tags beside `legacy/reference` | add them; do not rename or delete existing refs without approval (`AGENTS.md` §4) | No for adding; **yes** for deleting the 11 stale branches and the 4 misleading `anchor/*` tags |
| `docs/done/` in the new `main` | keep folder (global rule) but unrouted; or rely on git only | start it empty; legacy records stay reachable at the tags | No |
| Token source format | CSS file vs TS object compiled to CSS | TS object → generated CSS + generated literals, because four non-CSS consumers exist (§D3 row 5) | No |
| Claude Design target | reuse `cd630eec` vs a new design-system project seeded from the generated bundle | new project; keep `cd630eec` read-only as legacy | **Yes** — external account/project |
| CI | none (today) vs GitHub Actions running lint/typecheck/unit/e2e in the Playwright container | add CI; retarget the Sheets sync so it cannot push into a half-built `main` | **Yes** — build/deploy configuration |
| Desktop scope | port legacy desktop; phone-frame on desktop; responsive re-layout | decide before any desktop code (Rule 12) | **Yes** |
| Answer count in the schema | 2 only (current contract) vs 2–4 | 2–4 from day one — owner asked for 「유연한 구조」 | No |
| Tone/motion foundation | keep "calm" bans vs owner's 3–5 | revoke the bans; write the new foundation from the prototype | No |
| Stage per test | fixed now vs data field decided later | registry field with a default; owner fills it at deploy time | Later, by the owner (stated) |

---

## 8. Open questions

- Which prototype version is final — the J (갈림길) visual revision was still running on 2026-09-25/26 (`scratchpad/proto-session/dialog.md:2405–2461`), and the prototype directory is being edited live.
- Which legacy behaviour contracts survive the new flow unchanged: consent × instruction gate (`req-landing.md` §13.5/§13.9, `req-test.md` §3.6), answer retention (BQ-42), `Esc` = cancel (BQ-41), qualifier overlay, 30-minute active run, telemetry event set.
- Result page, share/vote server and dynamic OG are outside the prototype and outside the current implementation; they need their own decisions before the spec.
- Whether the Sheets sync (`.github/workflows/sync.yml` → `scripts/sync/sync.ts:158` push) should stay active during the rebuild.
- Whether the owner wants `docs/` Korean-first or English-first for the new contract (the current tree mixes both, including inside single files).

---

## Appendix A — Commands used (all read-only)

| Measure | Command (run with `git -C /Users/woohyeon/Local/ViveTest` or from that directory) |
|:---|:---|
| Commits per month | `git log --format='%ad' --date=format:'%Y-%m' \| sort \| uniq -c` |
| Churn by phase/area | `git log --numstat --format='C %ad' --date=short` aggregated in Python by date bucket and top-level path |
| Docs-only commits | `git log --format='@%h' --name-only` → count commits whose paths all start `docs/` or end `.md` |
| Docs added per month | `git log --diff-filter=A --name-only --format='C %ad' --date=short -- docs` |
| Doc sizes | `git ls-files -z '<path>' \| xargs -0 cat \| wc -lc` |
| BQ / lessons | `grep -nE '^## BQ-[0-9]+' docs/decision-register.md`; `grep -n '^### L' docs/LESSONS_LEARNED.md` |
| Colour copies | `git grep -il 'fbfaf7'`, `git grep -c -i 'fbfaf7'` (same for `5c8e78`) |
| Dead exports | Python scan: `export (const|function|type|…) Name` in `src`, then word-boundary search in other `src` files and in `tests`/`scripts` |
| Text-reading tests | `grep -lE "readFileSync|helpers/repo|git grep|execFileSync|execSync|readdirSync" tests/unit/*.test.ts` |
| Snapshots | `git ls-files 'tests/e2e/*-snapshots/*'`; `cat tests/e2e/snapshot-environment.json`; `uname -r` |
| Refs | `git branch -a`; `git tag -l`; `git rev-parse --short <tag>^{commit}`; `git rev-list --count main..<branch>` |
