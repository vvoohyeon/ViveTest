# Step 3 — design pass: execution plan

**Date:** 2026-09-07 · **Task mode:** Plan Only · **Branch:** `claude/step3-design` · **Inputs:** `docs/design/ds/**` as of `effa654`, the tier-2 units U1–U4, and `docs/plans/2026-09-07-candidates_0-overview.md`

---

## Shared frame

**Program.** The 2026-09-06 design-system rebaseline (`BQ-38`) replaces waves 13–17. The repository owns the visual definition under `docs/design/ds/` and pushes it one-way to **VIVE Design System v2** (`cd630eec-25e4-4613-a58f-c671c80297ca`). Sync procedure and operational traps: `docs/design/ds/SYNC.md`.

**Priorities, in order.** 1 — preserve the implemented logic with no side effects. 2 — take design and interaction quality as high as it will go.

**Approved decisions (`BQ-38`).** **A** tokens carry catalog values under VIVE names · **B** `req-landing.md` §8 stays frozen · **C** catalog card tokens and patterns frozen, improvements raised as separate artboards · **D** from `825385f6` take only card components and thumbnail SVGs.

**Invariant boundaries.** `src/**` stays closed — the theme cut (step 4) is that boundary, and step 2's `484331d` remains the programme's only runtime change. No baseline regeneration (`BQ-07`). `docs/design/ds/**` is **Ask-First** (`AGENTS.md` §4): edits there leave the repository. `cd630eec` is the only push target; `ee2fb724` is the canvas workspace and its project type can never become a design system.

**Where this sits.** step 1 `c5fc624` → step 1b `e8a453e` → tier-1 review `a3a1c3e` → **step 2 motion pass `484331d`** → tier 2 `10d6321`…`effa654` → **step 3, this plan** → theme cut → per-surface implementation → baseline.

**What changes at this step.** Decision C inverts. Through tier 2 the discipline was *record, never close by design* — every divergence became a table row with a measurement attached and nothing was proposed. Step 3 is the first step allowed to propose, and required to. Two things stay frozen regardless: `req-landing.md` §8 under decision B, and `design.md`'s standing as visual-only under `BQ-21` — it does not override behaviour, routing, telemetry, i18n, test-flow or a11y contracts.

---

## What the opening move already did

**Landed tier-2 plans moved to `docs/done/`.** Seven documents — `candidates_1` through `candidates_6` and the tier-2 execution plan — were still sitting in `docs/plans/`, which `AGENTS.md` §7-1 defines as the active set. A session reading the active list would have found six finished units presented as work to do. `candidates_0` stays active because it is the map for tier 3 as well; `candidates_7`–`candidates_10` stay active because tier 3 has not run.

The link guard in `tests/unit/docs-lifecycle.test.ts` was checked before the move rather than after: its backtick pattern requires a file extension, so `candidates_0`'s glob citation of `candidates_1-*` is not a link and does not break.

**D-06 was measured rather than inferred, and it is worse than the record said.**

The axes read were fixed before reading, per `L07`: surface — the catalog card's title and subtitle; state — rest only; tier — desktop, with mobile as the control; language — `en` and `kr`. **Not read**: tablet, the other ten locales, expanded-card body text, and every hover or focus state.

Computed styles, desktop tier, `kr`: title and subtitle both carry `word-break: normal` with `overflow-wrap: anywhere`. Mobile tier, same cards: both carry `word-break: keep-all`. That much only confirmed the register.

The line-box measurement is the part that was missing. Of the eight catalog cards, five wrap, and **four of those break Korean mid-word today**:

| Variant | Card width | Breaks today as | With `keep-all` |
|:---|---:|:---|:---|
| `egtt` | 292px | 카탈로그에 / 서는 | 퍼블릭 / 카탈로그에서는 |
| `ops-handbook` | 292px | 준비할 / 지 · 갖 / 춰야 · 또 / 한 · 데스크톱 / 과 · 유지 / 합니다 | every break on an 어절 boundary |
| `build-metrics` | 292px | 테스 / 트 · 실용 / 적인 | 빌드, / 테스트, · 짧고 / 실용적인 |
| `release-gate` | 292px | 쌓 / 아 | 겹겹이 / 쌓아 |

Splitting 준비할지 into 준비할 / 지 and 갖춰야 into 갖 / 춰야 is not a typographic nicety; it is the failure `word-break: keep-all` exists to prevent, and `design.md` §4.3 states the rule globally with no tier condition.

**The safety check passed too.** `rhythm-b` carries a deliberately unbreakable Latin token, and its line boxes are byte-identical with and without `keep-all` — `overflow-wrap: anywhere` still handles it. So the pair `keep-all` + `anywhere`, which is exactly what §4.3 specifies, fixes the Korean case without regressing the long-token case. That was the only plausible objection to applying the rule at every tier, and it does not hold.

---

## The units

### U1 — Bilingual truth in the specimens · 공수 S

Every specimen in the bundle is Latin. A system that claims bilingual typography as a foundation (`design.md` §4.3, and Pretendard chosen for matched Korean and Latin metrics) has never shown a Korean word.

Add a Korean variant to the card specimens — at minimum `card-test`, `card-blog` and `card-mobile` — rendering the same card in both languages side by side so line counts and rhythm can be compared at a glance. Record the D-06 measurement above on `catalog-drift.html`, replacing the current inferred wording with the four measured cases.

This unit changes no product code. The *decision* it feeds — whether `keep-all` goes to every tier — is D-1 below.

### U2 — Catalog proposals, the first ones allowed · 공수 M

Decision C is lifted here. The standing divergences that are catalog design questions rather than legacy leakage are **D-01** (the neutral ramp changes temperature between steps 400 and 500, so surfaces and ink disagree), **D-03** (the accent has no realized hover or pressed state; the two in the system are derived) and **D-08** (the catalog renders exactly one illustration across eight cards, and the seven imported candidates match neither the 16:6 slot nor the single-sage palette).

Each becomes a proposal with an artboard, not an edit to the frozen catalog values. The output of this unit is a decision list for the user, and only what is approved reaches `colors_and_type.css`.

### U3 — Extract the undesigned surfaces · 공수 L

The largest single piece of work in step 3, and the gate on U4. Step 1b read the card and nothing else; these surfaces have never been read at all.

Per `L07` the axis list is written **before** the extraction and shipped with it, including the axes deliberately skipped. The proposed axes:

- **Surfaces** — GNB desktop · GNB mobile · mobile menu overlay · test flow (instruction overlay, qualifier chip and overlay, question surface, result panel) · blog list · blog detail · history · consent banner · 404 · test error.
- **States** — rest · hover · `:focus-visible` · pressed · disabled · selected · empty · loading · error, wherever the surface has them.
- **Tiers** — desktop and mobile. Tablet is skipped and must be said so.
- **Languages** — `en` and `kr` for every text-bearing surface, given what U1 found.
- **Lifecycle** — static only. Mobile `OPENING` / `CLOSING` were identified in tier 2 and never specified; they stay out of this extraction and are named as skipped.

A first sounding is already on the record: the test flow at `/en/test/qmbti` consumes **31** legacy custom properties, paints `#f5f7f7`, and renders in Avenir Next — it is entirely pre-rebaseline. The instruction overlay is a plain white dialog with a blue accent button.

### U4 — Design the undesigned surfaces · 공수 L

Against the system as it now stands. Split by surface group so each lands on its own:

- **U4a — navigation.** GNB desktop, GNB mobile, mobile menu overlay. `design.md` §7.6 already specifies these in detail — static language/theme pill, no desktop gear or hamburger, the menu covering the GNB, the 12-locale chip set — so this group is closest to *implementing an existing design* and should go first.
- **U4b — test flow.** Instruction overlay, qualifier, question surface, result panel. The largest surface and the one with the most legacy tokens. Step 2 already defined the answer-button type (`.vt-choice--answer`) and the submit CTA, so the hardest control is settled.
- **U4c — secondary surfaces.** Blog list, blog detail, history, consent banner, 404, test error.

---

## Sequencing

| Unit | Depends on | 공수 | Lands |
|:---|:---|:---:|:---:|
| U1 · bilingual specimens | — | S | 1 |
| U2 · catalog proposals | — | M | 1 |
| U3 · extraction | — | L | 1 |
| U4a · navigation | U3 | L | 1 |
| U4b · test flow | U3 | L | 1 |
| U4c · secondary | U3 | L | 1 |

U1, U2 and U3 are independent and can run in any order. U3 gates all of U4. Nothing here opens `src/**`.

---

## The fork that has to be decided before U4 starts

**How does the design work actually happen?** The programme has always said "design in Claude Design", but the tooling makes that ambiguous and the answer changes what U4 is.

`ee2fb724` — the canvas workspace where the original ViveTest design lives — is a regular project, not a design system. `DesignSync` reads and writes **design-system** projects; it cannot push artboards to a canvas project. So there are three ways U4 can run, and they are genuinely different jobs:

**(a) The user designs on the Claude Design canvas.** The updated system is already attached to `ee2fb724`, so screens generated there build from the real components. The session then extracts the result back into `docs/design/ds/` as specimens. This is what the programme originally described. It puts the design judgement with the user and the transcription with the session.

**(b) The session drafts with the `design` skill.** Artboards are published as an Artifact canvas, the user edits them there, and the chosen option becomes specimens. Faster to start, and it keeps the loop inside this session — but the artboards are not in `ee2fb724`, so the canvas project and the repository drift apart again, which is the exact failure `BQ-38` exists to end.

**(c) The session authors the specimens directly** in `docs/design/ds/preview/` as designed proposals, with no canvas step. Cheapest and the most consistent with how tier 2 ran, but it makes the session the designer, and for six surfaces with no prior art that is a lot of unreviewed judgement.

**Recommendation: (a) for U4a and U4b, (c) for U4c.** Navigation and the test flow are the surfaces a user will have opinions about and the ones where a wrong call is expensive to unwind; the secondary surfaces are mostly applying settled patterns to simple layouts. U1, U2 and U3 are unaffected by this choice and can start immediately either way.

---

## Decisions the user owns

**D-1 — `word-break: keep-all` at every tier.** Measured: four of eight catalog cards break Korean mid-word on desktop today, and the fix regresses nothing. The rule is already stated globally in `design.md` §4.3. Recommendation: approve, implement in step 4 or 5. Declining means the rule needs a tier condition written into §4.3, because right now the document and the product disagree and the document is losing.

**D-2 — D-07, the blog CTA's dead fade.** The `Read more →` carries a 140ms opacity transition that never runs because the same element switches `display`. One of the two has to go: keep the fade and drive it with opacity plus `visibility`, or drop the transition and accept an instant reveal. This is a taste question about a hover affordance, and it is small.

**D-3 — D-09, the mobile close button at 40 × 40.** `design.md` §4.10 names 44 × 44 for this control specifically. Unlike the other divergences this one is an accessibility shortfall rather than an unfinished wave. Recommendation: raise it to 44, in step 5.

**D-4 — the U4 fork above.**

**D-5 — Ask-First on `docs/design/ds/**`.** Every unit here writes to that directory. Approving this plan is the natural place to grant that for step 3's scope, or to say it should be requested per unit.

---

## Verification

Each unit carries its own, but three rules hold across all of them.

**Render before quoting.** `L06`: the bundle is not rendered by any gate, so a declared value and a computed value can differ silently — twice already. Read values back with `getComputedStyle` after rendering; never quote a declaration.

**Await fonts per frame.** Each preview loads in its own iframe and the parent's font load does not propagate. `await iframe.contentWindow.document.fonts.ready`, then confirm `document.fonts.check('16px "Pretendard Variable"')` is true. A 404'd `@font-face` fails silently and every measurement taken after it is void.

**Do not test hover with hover.** Force a class. A real pointer sitting on the element has already produced one false reading.

Basic gates (`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`) run on any unit that touches a file a gate reads. Units that touch only `docs/` say so and skip them, with `git diff --stat` as the evidence.

---

## Execution prompt

> Read `docs/plans/2026-09-07-step3-execution-plan.md`. Confirm D-1 through D-5, then run U1, U2 and U3 in any order — they are independent and none of them opens `src/**`. U3's axis list goes into its output document before the extraction starts, together with the axes it skipped. U4 does not start until U3 has landed and D-4 is answered.
