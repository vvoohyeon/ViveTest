# Step 6 — the baseline, the tier-3 backlog, and closing the programme

**Date:** 2026-09-07 · **Task mode:** Plan Only until the user approves the baseline · **Branch:** `claude/step6-baseline` · **Opens `src/**`:** only for tier-3 items that say so

---

## CLOSED 2026-09-11 — 네 항목 전부

이 문서가 요구한 것은 넷이었고 넷 다 끝났다.

| # | 요구 | 결말 |
|:--|:--|:--|
| — | **baseline** — 두 질문을 사용자에게 올리고, 답을 받은 뒤에만 재생성 | 승인 후 재생성. theme-matrix **164/164**(선언만 있던 케이스 포함) · safari ghosting **5/5**(종전 0) · `test:e2e:gate` **122 passed · 0 failed**. 재생성 **전에** 도달 불가 케이스 넷을 먼저 고쳤다 — 경위는 `docs/done/2026-09-11-bq07-baseline-closeout.md` |
| 1 | 착지한 계획을 같은 커밋에서 `docs/done/` 으로 | 프로그램 문서 전부 이관. 이 문서가 마지막이다 |
| 2 | `docs/wave-roadmap.md` 상태 갱신 | §Programme close 신설 — 대체된 wave 13–17 이 어디로 가서 어떻게 끝났는지, 그리고 **이 프로그램이 남기지 않은 것**까지 |
| 3 | `docs/design/ds/` 최종 상태를 `cd630eec` 로 push | 38 장 push(`README.md` · `SKILL.md` · 3 CSS · preview 24 · assets 8). `SYNC.md`·`fonts/`·`_provenance/` 제외. push 직후 `list_files` 로 양쪽 집합을 실측해 `SYNC.md` 의 「원격에만 있는 것」 목록을 고쳤다 — 종전 목록이 **preview 카드 19 장과 asset 2 장을 빠뜨리고** 있었고, 「나머지 카드는 토큰만 참조한다」는 문장이 저장소가 갖지도 않은 파일을 보증하고 있었다 |
| 4 | `decision-register.md` 에 프로그램 종결 기록 | `BQ-38` 후속으로 등재 |

**tier-3 도 함께 닫혔다** — 아래 §The tier-3 backlog 표가 결말을 갖는다.

**아래 §D-08 절은 낡았다.** 그 절은 제안이 「채택되지 않았다」고 적지만 Step 4 가 채택해 16:6 네이티브 썸네일 **열 장**을 착지시켰다(`docs/done/2026-09-10-step4-mobile-cls-and-card-thumbnails.md`). 근거로 쓰지 말 것.

**살아남는 것은 §Open items that belong to no step yet 하나뿐이고, 그것은 이 프로그램의 미완이 아니라 다음 범위다** — `docs/wave-roadmap.md` §Programme close 가 그렇게 적는다.

---

## Shared frame — repeated so this document is standalone

**Programme.** The 2026-09-06 rebaseline (`BQ-38`) replaces waves 13–17. The repository owns the visual definition under `docs/design/ds/` and pushes it **one way** to **VIVE Design System v2** (`cd630eec-25e4-4613-a58f-c671c80297ca`). Procedure and traps: `docs/design/ds/SYNC.md`.

**Priorities, in order, from the user.** **1 — preserve the implemented logic with no side effects. 2 — take design and interaction quality as high as it will go.**

**Where this sits.** step 3 design pass `729a4f7` + `111fafa` → step 4 theme cut `986a956` → step 5a navigation + card remainders → step 5b test flow + secondary → **step 6, this document**.

---

## The one thing this step exists for, and the one thing it must ask

`BQ-07` reads: *기존 visual regression baseline 폐기, rebuild 완료 후 새 baseline 승인* — discard the existing baselines, approve new ones **after the rebuild completes**. `AGENTS.md` §4 lists it as a hard stop: `qa:visual:full` / `--update` is never run without human approval.

So step 6 opens by **asking the user**, with evidence, and does not run the regeneration until they answer. The evidence to put in front of them:

1. Which E2E cases currently fail, by name, from a run **without** `--update`.
2. A rendered before/after for at least the landing, the test instruction, and one secondary surface, in both themes.
3. The statement that every failure is expected: the theme cut changed the palette, the typeface and the elevation ladder on every surface, and step 5 restyled the surfaces themselves.

Then, and only then:

```bash
npm run qa:visual:full     # PLAYWRIGHT_SERVER_MODE=preview playwright test theme-matrix-smoke --update-snapshots
```

Afterwards update `tests/e2e/theme-matrix-baseline-provenance.md` — `AGENTS.md` §10 says a baseline diff is a regression **until** provenance says otherwise, so a regenerated baseline with no provenance entry leaves the next session unable to tell an approved change from a defect.

---

## Before regenerating, look at what the baseline actually covers — it is much less than it claims

Measured 2026-09-07. `tests/e2e/theme-matrix-manifest.json` declares **18 cases**:

- layout: `landing-normal`, `blog-default`, `history-default`, `test-instruction`
- state: `landing-test-expanded`, `landing-blog-expanded`, `landing-settings-open`, `blog-settings-open`, `history-settings-open`, `test-question`, `test-result`, `mobile-landing-test-expanded`, `mobile-landing-blog-expanded`, `mobile-landing-menu-open`, `mobile-blog-menu-open`, `mobile-history-menu-open`, `mobile-test-question`, `mobile-test-result`

But only **48 PNGs** exist on disk, and they cover **five** case prefixes, all of them the test flow:

```
theme-layout-test-instruction   theme-state-test-question   theme-state-test-result
theme-state-mobile-test-question   theme-state-mobile-test-result
```

**The landing grid, blog, history, the settings layer and the mobile menu have no visual baseline at all** — which is precisely why the landing card's total absence of dark-theme styling survived until step 4 found it by reading the CSS. Regenerating "the baselines" without closing this gap would re-freeze a net with holes in exactly the places the programme has been changing.

So step 6's baseline work is two decisions, not one, and the second is the user's too: **regenerate the 48**, and **whether to generate the missing 13 cases** the manifest already declares. Generating them is not free — every new baseline is a file that must be reviewed once and maintained forever — but leaving them out means the surfaces step 5 just rebuilt have no regression net.

---

## The tier-3 backlog — closed 2026-09-11

셋 다 닫혔으므로 이 절은 기록이다. 지도는 `docs/done/2026-09-07-candidates_0-overview.md` 로 옮겨 갔다.

| # | Item | 결말 |
|:---|:---|:---|
| 7 | `README.md` restates ~30 token values in prose, is pushed, and drifts | **구현 2026-09-11.** *Visual foundations* 가 값 대신 토큰 이름을 부르고, 살아남은 리터럴은 `<!-- ds-literal: kind -->` 표식을 단다. `SYNC.md` 의 표류 파일이 넷 → 셋 |
| 8 | radius / shadow / duration were revalued at the **role** level | **미구현 종결(CANCELLED) 2026-09-11.** 계획서가 지목한 결정의 답이 「일반 컴포넌트는 배포하지 않는 참조물」이었다. 값은 그대로 두고 layer-2 머리말에 가드 문장 한 줄만 남겼다 |
| 10 | nothing detects drift between the four places these values live | **구현 2026-09-11.** `scripts/qa/check-design-token-parity.mjs`, `qa:rules` 의 열세 번째 검사. 면제 목록은 `decision-register.md` 의 표에서 읽는다 |

경위: `docs/done/2026-09-11-ds-value-drift-and-parity-gate.md`.

---

## D-08 — the thumbnail proposal, raised and not adopted

`docs/design/ds/preview/thumb-proposal.html` holds a seven-piece 16:6 set drawn native to the slot in the single sage family, with four rules so a new one can be drawn without asking. Nothing about it is adopted: no value went into `colors_and_type.css`, no card specimen references it, and the eight files imported under decision D are untouched.

The measured argument, so it does not have to be rebuilt: the product ships **one** thumbnail for eight cards and it is the same artwork as the generated fallback. The seven imported candidates are **300 × 200 (3:2)** against a **16:6** slot, so `object-fit: cover` discards **43.8%** of their height at every card width. The subjects are not clipped — they are left **airless**: at the 292px card the slot is 258 × 96.75, the artwork scales to 258 × 172, and the centred subject lands at 79.1px (the face) or **94.6px in a 96.75px box** (the panels). And the palette is five accent hues — `#5C8E78` sage, `#8A7BB5` violet, `#C4704A` terracotta, `#C9A24A` gold, `#4A6FA5` blue — plus two neutral greys, `#7A7A85` and `#A6A6AE`, which are the **pre-D-01 cool** values of `--warm-600` and `--warm-500` and are now stale against the warmed ramp as well.

Adoption means promoting the proposal to `assets/` and mapping variants to compositions. The mapping in the specimen is by **kind**, deliberately: the catalog's variants will change and its kinds will not. This is real content work and belongs with whoever owns the catalog's artwork.

---

## Open items that belong to no step yet

- **The font payload.** Pretendard Variable ships as the full face, **1.96 MB**, `font-display: swap`, deliberately not preloaded so text never waits on it. Shipping the full face rather than a subset is the choice this repository already made once for the design bundle (`SYNC.md`): a subset needs a build step and becomes a way for the two sides to diverge on which glyphs exist. The way to reduce it is the **upstream dynamic subset** (per-unicode-range files), which needs assets this repository does not have and a download this session was not authorised to make.
- **Pretendard's Han coverage is unknown.** Width comparison cannot separate "the face has this glyph" from "both fallbacks resolved to the same system font", and a canvas raster comparison disagreed with it. The fallback stack was written so the answer does not matter — every script the product ships has a named face behind Pretendard. If someone later needs the answer, read the font's `cmap` with `fontTools` (not installed here) rather than guessing from the browser.
- **`--landing-answer-*` is a misnomer.** Those three tokens are consumed only by the GNB chips in `settings-controls.tsx`. Renaming is safe but must change every consumer in one commit — a renamed token does not error, it silently stops applying.
- **The `--muted-ink` naming.** It maps to `--ink-body` because it measured 7.66:1 and was never the sub-AA token its name suggests. The name still misleads and a rename would be honest, under the same one-commit rule.
- **Tablet tier and ten locales were never extracted.** Step 3's U3 read desktop and mobile, `en` and `kr`. `zs zt ja es fr pt de hi id ru` and the tablet tier have never been read against the system.
- **Mobile `OPENING` / `CLOSING` transitions were identified in tier 2 and never specified.**

---

## Closing the programme

When step 6's baseline is approved and landed:

1. Move every landed plan from `docs/plans/` to `docs/done/` **in the same commit that lands it** (`AGENTS.md` §7-1). Check the link guard's citation pattern **before** moving — `tests/unit/docs-lifecycle.test.ts` treats a backticked `docs/…` path with a file extension as a link, and `docs/decision-register.md` is a live contract, so its citations are repointed rather than left to rot. `docs/done/**` and `docs/archive/**` are **not** repointed: history is not retroactively edited.
2. Update `docs/wave-roadmap.md`'s status — waves 13–17 were replaced by this programme and the roadmap should say so at the end, not only in the register.
3. Push the final `docs/design/ds/` state to `cd630eec` with `DesignSync` (`list_files` → `finalize_plan` → `write_files`). `SYNC.md` owns the push table; `SYNC.md`, `fonts/` and `_provenance/` are **not** pushed. Uploading an SVG injects a ~5 KB C2PA block, so a byte comparison of `assets/` will report every file as differing with no real difference — compare the drawing, not the file.
4. Record the programme's close in `docs/decision-register.md` under `BQ-38`.

---

## Execution prompt

> Read `docs/plans/2026-09-07-step6-baseline-and-closeout.md`. Do **not** run `qa:visual:full` yet. First run the theme-matrix E2E **without** `--update`, collect the failing case list, render before/after evidence for the landing, the test instruction and one secondary surface in both themes, and put two questions to the user together: (a) approve regenerating the 48 existing baselines, and (b) whether to also generate the 13 declared-but-missing cases, given that the landing grid, blog, history, the settings layer and the mobile menu currently have no visual regression net at all. Only after an answer, regenerate and write `tests/e2e/theme-matrix-baseline-provenance.md`. Then work the tier-3 items in the order 7 → 8 → 10.
