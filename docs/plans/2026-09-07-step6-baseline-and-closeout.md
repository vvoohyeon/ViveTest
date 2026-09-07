# Step 6 — the baseline, the tier-3 backlog, and closing the programme

**Date:** 2026-09-07 · **Task mode:** Plan Only until the user approves the baseline · **Branch:** `claude/step6-baseline` · **Opens `src/**`:** only for tier-3 items that say so

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

## The tier-3 backlog, still open

These were scored in the 2026-09-07 mid-review and deliberately scheduled after the design pass. `docs/plans/2026-09-07-candidates_0-overview.md` is the map. `candidates_9` was closed early during step 3 (it gated the D-08 thumbnail proposal) and lives in `docs/done/`.

| # | Item | 공수 | Note added by later steps |
|:---|:---|:---:|:---|
| 7 | `README.md` restates ~30 token values in prose, is pushed, and drifts | S | Step 3 corrected the *values* it was wrong about; the **duplication** is untouched, so it will drift again. The four-file drift list is in `SYNC.md`. |
| 8 | radius / shadow / duration were revalued at the **role** level, so generic VIVE components inherited catalog decisions | M | Needs `vive-components.css` mirrored into the repo first — it exists only on the Claude Design side, and editing it there breaks the one-way rule. **Does not affect ViveTest surfaces**: `app-components.css` is a separate layer and its `--radius-md` use matches `design.md` §6.4's own choice for controls. |
| 10 | nothing detects drift between the four places these values live | M | **Partly built.** Step 4 added a mirror guard for `globals.css` ↔ `colors_and_type.css`, with fault injection. What remains is `design.md` §5 ↔ `colors_and_type.css` and the prose in `README.md`. Run it last: item 7 removes most of the prose it would have to parse. |

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
