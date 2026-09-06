# Wave 5 — Expanded Test Visual Skin · Pre-Implementation Analysis

> **Task mode: `Analysis Only`.** No source files modified, no implementation, no tests run, no
> baselines generated. This document is the sole deliverable and serves as the BQ-19 **Step 1
> (Analysis Only)** Logic-Improvement report gating the Wave 5 implementation prompt.

---

## 0. Metadata

| Field | Value |
|---|---|
| **Wave** | Wave 5 — Expanded test visual skin (prereq: Wave 4 complete ✅) |
| **Task mode** | `Analysis Only` |
| **SSOT contract (§2 routing)** | `docs/req-landing.md §6–11` (esp. §8 lines ~262–298, §3 geometry); process via `docs/wave-roadmap.md` Wave 5 + `docs/decision-register.md` (BQ-01/07/09/12/18/19); test-entry/telemetry/meta-source via `docs/req-test.md §9, §"Attempt", L118`. |
| **Visual authority** | `docs/design/design.md §6.5, §7.7, §7.8, §10` + `docs/design/resources/wave4-expanded-test-content-reference.css` (§6–§10 — choice button skin, choice text/arrow, spacer, meta row, focus). **No separate `wave5-*.css` exists**; the wave4 reference is the comprehensive expanded-test visual source. Screenshot: `resources/screenshots/expanded-card-spec.png`. |
| **Files expected in Wave 5 impl (later)** | `src/features/landing/grid/landing-grid-card.tsx` (+ `landing-grid-card.module.css` if scoped tokens/focus-outline are added there, mirroring Wave 3); `src/messages/*.json` (12 locales) + `getDefaultCardCopy` for the meta relabel; `tests/unit/landing-card-contract.test.ts` / E2E presence-only updates. |
| **Logic Improvement gate (BQ-18/19)** | Evaluated §4. Recommendation: **no business-logic candidates approved — preserve existing logic**; the meta relabel is a Wave-5 *copy* deliverable (i18n value change), key-rename deferred. |

---

## 1. Context Verification

| Check | Value |
|---|---|
| Branch | `main` (active rebuild implementation workspace per `docs/rebuild-worktree-setup.md §3/§8`) |
| HEAD (after Wave 4 commit) | `a6e0dd8` — `wave-4: implement expanded test content contract` |
| Prior commits | `fe063ad` (wave-3) · `020e12d` (wave-2) · `9ed6d1b` (wave-1) |
| Working tree before analysis | **clean** (Wave 4 committed) |
| Mode | **Analysis Only** — no source edits; only this doc is created under `docs/plans/`. |
| Prerequisite | Wave 4 complete (roadmap: Wave 5 prereq = Wave 4 + Logic-Improvement gate). ✅ |

No workspace/branch/topology issue. No checkpoint/legacy worktree involved.

---

## 2. Wave 5 Source Reconciliation

### 2.1 Roadmap scope (`docs/wave-roadmap.md` Wave 5, Risk: Medium)
- **Include:** choice button wrapping · equal padding · meta row `completed` · full number display.
- **Exclude:** transition/storage behavior · (and inherited rebuild guards) overlay geometry · sibling
  isolation · mobile expanded shape · Blog behavior · unavailable behavior · GNB/theme/mobile menu · result pipeline.
- **Motion:** candidate **only if separately approved**; not assumed. Handoff → Wave 6 overlay behavior.
- **Validation:** a11y · keyboard · card contract.

### 2.2 Design visual intent (the realized expanded-test skin)
`design.md §6.5 / §7.7 / §7.8 / §10` + `wave4-expanded-test-content-reference.css`:
- **Question:** 21px/600, `--ink` **#1A1A1F**, line-height 1.3, tracking −0.01em, wraps freely.
- **Choice button:** bg `--canvas-elevated` #FFFFFF, **1px `--hairline-strong` #D6D1C4**, radius `--radius-md` 12px,
  **padding 12px 14px** (equal top/bottom, no min-height), `display:flex; align-items:flex-start; gap:12px`;
  **hover** → border `--sage` #5C8E78 + bg `--sage-muted` #E8F0EC.
- **Choice text:** 15px/400, `--ink-soft` **#2E2E36**, wraps freely / never truncated.
- **Arrow:** `--muted` #7A7A85, `margin-top:3px`, `flex-shrink:0`; **hover → `--sage`**.
- **Meta row:** inline flex, 13px/500 `--muted` #7A7A85, middle-dot `·` separators in `--muted-soft`,
  labels read **"<n> shared"** and **"<n> completed"**, duration emphasized (`--body` #4A4A55, 600), full-digit numbers.
- **Focus (choice):** `outline:2px solid --focus-ring(#5C8E78); outline-offset:2px`.
- **Spacer (§8):** `flex:1; min-height:14px` between last choice and meta — *absorbs surplus height only here*.

### 2.3 Current implementation state (after Wave 4, `a6e0dd8`)
| Element | Current (evidence) | Cool vs warm / gap |
|---|---|---|
| Question | `…PREVIEW_QUESTION_CLASSNAME` (`:223`): 21px/`font-semibold`/`--text-strong`/tracking/keep-all/anywhere | prominence ✅ (Wave 4); color uses cool `--text-strong`(=`--ink #161a20`) → design wants warm **#1A1A1F** |
| Choice button | `…ANSWER_CHOICE_CLASSNAME` (`:226`): `flex items-start gap-3` (Wave 4), `rounded-[12px]`, **cool** `--interactive-neutral-border`, `--landing-answer-bg-rest/hover/pressed`, `px-3 py-2.5`, blue **box-shadow** focus double-ring | radius ✅; layout ✅; skin/border/bg/hover/focus = **cool** → re-skin to warm/sage; padding 12×10 → **12×14** |
| Choice text | `…ANSWER_CHOICE_TEXT_CLASSNAME` (`:227`): `min-w-0 flex-1` (no typography; inherits button `--interactive-neutral-ink`, `leading-[1.4]`) | needs 15px/400/`--ink-soft` + keep-all/anywhere |
| Arrow | `…ANSWER_CHOICE_ARROW_CLASSNAME` (`:228`): `mt-[3px] shrink-0 text-[var(--muted-ink)]` (Wave 4) | muted ✅; warm `#7A7A85` + **hover→sage** missing |
| Meta | `<dl>` `…META_GRID_CLASSNAME` grid-cols-3 (`:227`-ish) → per item `dt` label + `dd` value; labels `Est. time`/`Shares`/`Total attempts`; `formatMetaValue` → `Intl.NumberFormat` comma full digits (`:157-163`) | **full-number ✅ already**; labels differ ("Total attempts"→"completed", "Shares"→"shared"); **layout** = grid label-over-value vs design **inline value+label with `·`** |
| Focus (choice) | choice `focus-visible:shadow-[blue double ring]` | → sage `outline` (design §10) |
| Spacer | expanded body is `grid gap-[10px] p-4` (`LANDING_GRID_CARD_EXPANDED_CLASSNAME`); no flex spacer | design §8 spacer = **geometry (surplus absorption)** → Wave 6, not Wave 5 |

### 2.4 Conflicts & boundary risks (classified — not silently resolved)
1. **Meta row is a SHARED component (Test + Blog).** Both `ExpandedTestBody` (`:591`) and `ExpandedBlogBody`
   (`:662`) render the same `…META_GRID_CLASSNAME` `<dl>`. A deep meta **layout** restructure (grid → inline
   `·`-separated row, duration-first `3 min`) in Wave 5 would also re-skin Blog meta (Wave 8 owns Blog visual).
   → **Blocking question (Q1):** does Wave 5 (a) only relabel + keep the shared `<dl>` layout, or (b) restructure
   the meta layout to design (accepting it lands shared, pre-empting part of Wave 8)?
2. **`metaShares` "Shares"→"shared" is shared copy (Test + Blog).** `metaAttempts`→"completed" is test-only.
   → **Blocking question (Q2):** relabel `metaShares` too (affects Blog meta copy) or leave it?
3. **i18n footprint.** `metaAttempts`/`metaShares` exist in **all 12 locale files** (`src/messages/*.json`) +
   `getDefaultCardCopy` default. → **Decision (D-i18n):** relabel **en + all 12 locales** for fidelity (recommended),
   or en-only (faster, leaves stale non-en). **Safe assumption** unless overridden: relabel all 12 + default.
4. **Warm-token introduction must not leak (Strategy A).** Choice button consumes global `--interactive-neutral-*`,
   `--focus-ring-*`, `--landing-answer-*` (used by test-question UI and others). Per Wave 3 precedent, Wave 5 must
   introduce **Normal/expanded-scoped tokens** (e.g., on `.root`/expanded surface in `landing-grid-card.module.css`)
   and consume them only in expanded-test selectors — **no global token mutation** (theme = Wave 16). **Approved
   decision** (mirrors Wave 3 Strategy A; deferred conflict reconciliation in BQ-07/Wave 16).
5. **Surplus-height spacer (design §8) is geometry → Wave 6.** Wave 5 Exclude = overlay geometry. **Deferred decision.**
6. **Transient look mismatch.** Warm expanded-test content over a still-cool expanded surface/`--panel-solid` is
   expected pre-Wave-16 (same pattern accepted in Wave 3 §2.2). **Safe assumption.**
7. **`gnb-smoke.spec.ts:402-406` reads answer-choice hover styles** (`readInteractiveSurfaceStyles`). Re-skinning the
   choice hover (cool→sage) will change those computed styles. → **test-impact**, see §6.

---

## 3. KARD Classification (Keep / Adapt / Replace / Delete)

| Target | Current | Design intent | **KARD** | Rationale / scope note |
|---|---|---|---|---|
| Expanded **question styling** | 21/600/`--text-strong`(cool) | 21/600/`--ink #1A1A1F` warm | **Adapt** | Prominence kept (Wave 4); only reconcile color to warm scoped token. Low risk. |
| **Choice button skin** | cool border/bg/hover + blue box-shadow focus | warm border `#D6D1C4`, hover sage border + `#E8F0EC` bg, sage `outline` focus | **Replace** | Re-skin via scoped tokens; **preserve handlers/`data-slot`/`type`** (test-entry trigger). |
| **Choice wrapping / padding** | `whitespace-normal text-clip`, `px-3 py-2.5` (12×10) | wrap freely no truncate, padding **12×14**, `align-items:flex-start` | **Adapt** | Padding → `px-3.5 py-3`; keep wrap (SSOT §8 no-truncate); `items-start` already present (Wave 4). |
| **Arrow visual** | `mt-[3px] shrink-0 --muted-ink` | warm `--muted #7A7A85` + **hover → sage** | **Adapt** | Decorative/`aria-hidden` preserved (Wave 4 D3); add warm color + hover-sage. |
| **Meta row labels** | `Shares` / `Total attempts` | `shared` / **`completed`** | **Adapt** | i18n copy value change (en + 12 locales + default). `metaAttempts`→"completed" test-only; `metaShares`→"shared" shared w/ Blog (Q2). |
| **Full-number display** | `Intl.NumberFormat` comma, no k/m (test-asserted `:197-200`) | full-digit | **Keep** | **Already satisfied** — verify only. |
| **i18n keys / copy** | keys `metaAttempts`/`metaShares` (semantic key vs new value) | values "completed"/"shared" | **Adapt (values)** / **Keep (keys)** | Recommend keep keys, change values; key-rename `metaAttempts→metaCompleted` is optional cleanup (defer, §4 W5-LI-01). |
| **Telemetry / storage / transition handlers** | `onAnswerChoiceSelect` → attempt_start/card_answered; ingress/staged-entry storage; transition | unchanged | **Keep** | **Absolute preservation** (Wave 5 Exclude; BQ-09/BQ-12; req-test §9/Attempt). Skin-only. |
| Meta row **layout** (grid `<dl>` vs inline `·` row) | grid-cols-3 label-over-value | inline value+label, `·` separators, duration emphasis | **Adapt/Replace — gated on Q1** | Shared with Blog; magnitude Medium-High; see §2.4(1), §5. |
| Surplus-height **spacer** (§8) | none (grid gap) | flex spacer absorbs surplus | **Delete from Wave 5 scope** | Geometry → **Wave 6**. |

---

## 4. Logic Improvement Evaluation (BQ-19 Step 1 — six layers, evaluate-first per BQ-18)

| Layer | Candidate considered | Magnitude | Improvement value (maintainability/simplicity/perf/testability/a11y) | Risk / rollback | Wave dependency | Recommendation |
|---|---|---|---|---|---|---|
| state | none (skin wave) | None | — | — | — | **Keep / no candidate** |
| hooks | none (no data-flow change; title/subtitle continuity untouched) | None | — | high if touched (W6 geometry) | W6 | **Keep / no candidate** |
| routing | none | None | — | — | W7 (blog) unrelated | **Keep / no candidate** |
| storage | none — staged-entry/ingress preserved | None | — | High (entry contract) | — | **Keep (preserve)** — BQ-09/req-test §3.5 |
| telemetry | none — answer-choice = attempt/card_answered trigger preserved | None | a11y/integrity: keep intact | High (event contract) | — | **Keep (preserve)** — BQ-12/req-test §9 |
| i18n | **W5-LI-01:** rename key `metaAttempts`→`metaCompleted` (+ optionally `metaShares` semantics) for clarity | Medium (interface + 12 locale files + `getDefaultCardCopy`) | maintainability +, but churn | Low risk, easy rollback, but broad diff | none | **Defer** — change copy *values* only in Wave 5; key-rename optional later cleanup |

**Conclusion:** **No business-logic candidates approved — preserve existing logic.** The Wave 5 meta relabel is a
**scope deliverable** (i18n copy *value* change for "completed"/"shared"), not a logic improvement; the only true
logic-layer candidate (i18n key rename W5-LI-01) is **deferred**. Implementation prompt should carry:
`Logic Improvement: no candidates approved — preserve existing logic.`

---

## 5. Implementation Boundary Proposal

**Safe Wave 5 scope (recommended):**
- Warm-token reconciliation for the **expanded-test content** via **scoped tokens** (Strategy A, mirror Wave 3):
  question `--ink #1A1A1F`; choice border `#D6D1C4`, hover border/ bg `#5C8E78`/`#E8F0EC`; arrow `#7A7A85` + hover sage;
  choice text `#2E2E36`. No global token mutation.
- Choice button: padding `px-3 py-2.5` → **`px-3.5 py-3`** (14×12); keep free-wrap/no-truncate.
- Choice **focus** → sage `outline:2px; outline-offset:2px` (replace blue box-shadow ring on the choice button only).
- Choice text typography 15px/400 + keep-all/anywhere.
- Meta **labels** → "completed" (`metaAttempts`) and, pending **Q2**, "shared" (`metaShares`); **full-number = verify** (already done).
- All on the shared single-source `ExpandedTestBody`/choice helper from Wave 4; **no handler/`data-slot`/`type`/`tabIndex`/`aria` changes**.

**Must remain deferred (Wave 6+ / other waves):**
- Surplus-height **spacer** + any expanded **height/geometry/content-fit/sibling isolation** → **Wave 6**.
- Global **canvas/theme** warm tokens (expanded surface `--panel-solid`, page `--bg`) → **Wave 16**.
- **Blog** meta/visual specifics → **Wave 8** (constrained by the shared-meta decision Q1/Q2).
- **Motion/transition** on choices/meta → only if separately approved (roadmap).
- Mobile expanded shape → **Wave 13**.

**Blocking questions for the user:**
- **Q1 (meta layout):** Wave 5 = relabel-only on the existing shared `<dl>` grid, **or** restructure to the design
  inline `·`-separated row (duration-first "3 min", value+label) — which lands on the **shared** component and
  pre-empts part of Wave 8 (Blog)? *(Plan-safe default: relabel-only; defer layout restructure to a coordinated
  meta wave or Wave 8 — keeps Wave 5 test-scoped and low-risk.)*
- **Q2 (`metaShares`):** relabel "Shares"→"shared" (affects Blog copy too) or leave for Wave 8? *(Default: relabel
  `metaAttempts`→"completed" now; hold `metaShares` unless approved.)*
- **D-i18n:** relabel across **all 12 locales** (recommended) or en-only?
- **Token strategy:** confirm Strategy A scoped tokens (no global mutation), consistent with Wave 3 + BQ-07/Wave 16.

---

## 6. Test & Verification Plan (no baselines — BQ-07)

- **Basic Done gate (AGENTS.md §5):** `lint` → `typecheck` → `test` → `build`.
- **Unit (`landing-card-contract.test.ts`):** keep `meta(3)` + Wave 4 arrow/aria assertions green; meta-value
  comma/no-k-m assertions stay valid (labels not asserted). If relabeling, **no** computed-style assertions; may add
  presence-only hooks (choice skin class, sage focus-outline hook, "completed" label text presence).
- **E2E — answer-choice trigger preservation (critical, High-risk):** `state-smoke.spec.ts` focus/click on
  `[data-slot="answerChoiceA/B"]` (`:245/305/397/500`) and keyboard CTA traversal (`:289`) must stay green — confirms
  the re-skin did not alter the test-entry handler/focus order.
- **E2E — choice hover skin change:** `gnb-smoke.spec.ts:402-406` captures answer-choice hover styles; the cool→sage
  re-skin **will change** these. Verify whether it asserts cross-theme equivalence (may need a presence-only update,
  **not** a baseline). Flag during impl.
- **Visual review (manual, no baseline):** compare against `resources/screenshots/expanded-card-spec.png`
  (question/choice/arrow/meta). 
- **Screenshot baselines:** `state-smoke` `expanded-focus-shell.png` / `overlay-focus-shell.png` + theme-matrix will
  diverge further. **Baseline regeneration remains DEFERRED per BQ-07** (post-rebuild approval) **unless the user
  explicitly overrides** — do not regenerate during Wave 5.

---

## 7. Wave 5 Readiness Summary

- **Prereq satisfied** (Wave 4 committed `a6e0dd8`). Current content contract is in place; Wave 5 is a **visual skin**
  + a **meta copy relabel**, almost entirely CSS/className + i18n values.
- **Main risks:** (1) the **shared meta component** (Test+Blog) — restructure vs relabel (Q1/Q2); (2) preserving the
  **test-entry handler/telemetry/storage** under the choice re-skin (Exclude); (3) **token leakage** (use Strategy A
  scoped tokens); (4) **`gnb-smoke` hover-style** test impact.
- **Open questions:** Q1 (meta layout), Q2 (`metaShares`), D-i18n (locale footprint), token-strategy confirmation.
- **Logic gate:** no candidates approved (preserve logic); key-rename deferred.
- **Recommended next step:** resolve Q1/Q2/D-i18n, then draft `docs/plans/2026-05-31-wave-5-…-plan.md`
  (Implementation, scoped to `landing-grid-card.tsx`/`.module.css` + `messages/*`), carrying
  `Logic Improvement: no candidates approved — preserve existing logic.`

---

```
Analysis only. No source files modified; no Wave 5 implementation performed; no baselines regenerated.
A separate approved Wave 5 plan + BQ-19 Step-2 directive are required before any code change.
```
