# Tier 2 · U4 — Mobile, assets, and one measurement

**Date:** 2026-09-07 · **Task mode:** Implementation (documentation surface only) · **Inputs:** `docs/plans/2026-09-07-candidates_4-mobile-specimens.md` + `candidates_6-bundle-assets-and-remeasure.md` part b, sequenced by `2026-09-07-tier2-execution-plan.md` · **Extraction:** `docs/done/2026-09-07-mobile-extraction.md`

**This unit closes tier 2.**

---

## Shared frame

**Program.** The 2026-09-06 rebaseline (`BQ-38`) replaces waves 13–17. The repository owns one token definition under `docs/design/ds/` and pushes it one-way to **VIVE Design System v2** (`cd630eec-25e4-4613-a58f-c671c80297ca`). Sync procedure and traps: `docs/design/ds/SYNC.md`.

**Priorities.** 1 — preserve the implemented logic with no side effects. 2 — take design and interaction quality as high as it will go.

**Decisions (`BQ-38`).** **A** catalog values under VIVE names · **B** `req-landing.md` §8 frozen; M-01 resolved and implemented · **C** catalog card tokens and patterns frozen · **D** from `825385f6`, card components and thumbnail SVGs only — **executed in this unit**.

**Boundaries held.** No runtime file changed — the diff is `docs/**` only. No baseline regeneration (`BQ-07`). `cd630eec` is the only push target.

**Where this sits.** step 1 → step 1b → tier 1 → motion pass `484331d` → U1 font `10d6321` → U2 `61bf414` → harness alignment `df6d4bf` → U3 `b79b00d` → **U4, this document** → design pass.

---

## What the unit did

### Mobile, extracted rather than authored

Ran the dev server, set 390 × 844, **reloaded**, and confirmed `data-card-viewport-tier="mobile"` and a single-column grid before reading anything. Every number is in the extraction document; the specimens quote it and invent nothing.

Two facts worth carrying forward. **The mobile card is wider than a desktop later-row card** — 358px against 292px — which is the concrete reason tier can never be derived from card width. And **the mobile title and subtitle report `-webkit-line-clamp: none`, `overflow: visible`, `text-overflow: clip`**, which is the product confirming the call U2 made when it put the clamp behind a modifier and left the base unclamped.

**Mobile expanded is a different shape, not a narrower one**: 390px wide at `border-radius: 0`, padding moved inside so the sticky header reaches the top edge, close button at the header's right, scrim behind at `z-index 10` against the sheet's 20 and the GNB's 1100. There is no shell scale — the question is 21px on screen, not 21 × 1.04.

**Reading the source alone got the radius wrong.** `landing-grid-card-mobile-transient-shell` carries `rounded-[var(--landing-card-radius)]`, which reads as a 16px radius; that class is the `OPENING` / `CLOSING` shell, anchored at the card's own left and width. The steady `OPEN` state is a different element and is full-bleed at radius 0. The running product settled it. This is why the extraction was run rather than inferred, and it is the third instance of the failure now registered as `L07`.

### `design.md` §7.8, recorded and not designed closed

Wave 13 was never implemented and `BQ-38` superseded it, so the gap list is a design-pass input rather than a defect list, and decision **C** forbids closing it here. Four of the eight requirements are met; three are not:

- top edge flush to the GNB bottom — GNB bottom `57`, sheet top `338.59`, a **281.59px** gap
- a `--sage` bottom edge anchoring it — no border anywhere in the chain
- **the close button at 44 × 44 (`design.md` §4.10) — it is 40 × 40**

The third is the one that is not merely unfinished: §4.10 names the close button among the controls that must meet 44 × 44, so it is an accessibility gap against the foundations. Choices meet it at 47.75. Raising the close button is a runtime change and belongs to step 5.

### Decision D, executed

The seven thumbnails and `answer-arrow.svg` imported from `825385f6` unmodified into `docs/design/ds/assets/` (the copies on the Claude Design side come back carrying an injected C2PA provenance block — same drawing, different bytes; recorded in `SYNC.md` so a later comparison does not chase it), shown on `preview/brand-thumbnails.html` labelled **available artwork · not realized in the product**, and deliberately kept out of the card specimens. Two things stand between them and adoption, both decisions rather than work: they are authored at **3 : 2** against the slot's **16 : 6**, and they carry **five accent hues** where this system has one.

The three card specimens' hand-drawn SVGs were replaced with the product's actual generated gradient, so the bundle stops showing three different invented illustrations for a product that renders one wash.

### Three new findings

**D-05 goes to six.** The mobile scrim: `design.md` §5.7 defines `--overlay-scrim: rgba(26, 26, 31, 0.48)` — warm ink at 48% — and the product paints `--overlay-scrim-medium` from `globals.css:97`, a cool near-black at 64%. Different hue and different strength, on the largest surface the mobile flow paints.

**D-08** — the product ships one thumbnail for eight cards, and it is byte-identical artwork to the generated fallback, so the catalog renders exactly one illustration today. **D-09** — the 40 × 40 close button.

---

## Verification

**Boundary.** The diff is `docs/**` only; `src/**` untouched. `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` green.

**The gate that makes the measurement valid.** `document.fonts.check('16px "Pretendard Variable"')` returned `true` in all seventeen iframes, each awaited on its own `document.fonts.ready` before being measured. FontFace `status: loaded`, axis `45 920`.

**Seventeen cards re-measured at their declared widths.** All hold at least 28px of headroom and none overflows horizontally. **No existing card's height changed** — because U1 landed before U3, the U3 measurements were already taken with the typeface loaded, so `candidates_6`'s concern that a card would gain a line and silently overflow did not materialize. Only the four new cards and the drift card moved.

**Both mobile specimens rendered and looked at**, not only measured. The mobile expanded specimen was compared against a screenshot of the running product at the same viewport: full-bleed white sheet, radius 0, sticky header with the title left and a round × right, scrim above and below, GNB above the scrim.

**What this unit did not look at.** The mobile GNB and its menu panel, the blog detail, history, consent and the test flow at mobile width — all still undesigned surfaces that enter at the design pass. The `OPENING` / `CLOSING` transient shell was identified but not specified; only the steady `OPEN` state is drawn. No Korean-language specimen was measured at any tier, so the wrapping behaviour that `word-break: keep-all` governs is stated from the contract rather than observed.

---

## Tier 2 is closed — the insight ledger's disposition

The tier-2 execution plan carried four insights (`I-1`–`I-4`) that the harness alignment deliberately did not absorb, leaving the judgement to this program at its end. That is now.

- **`I-1` (what you did not extract is assumed correct) and `I-3` (render, do not only measure) are registered together as `L07`.** Both are recurring, both are structurally invisible to every gate — no gate knows what you did not look at — and both would have changed behaviour if known beforehand. `I-1` fired three times in this program.
- **`I-2` (prose stating a rule the CSS contradicts) is not registered separately.** It is the same defect `L06` already covers from the other side: the check for both is to render and read back the computed value rather than trust the declaration.
- **`I-4` (`_ds_manifest.json` is derived and lags) is not registered.** It is a fact about one tool on one surface, and `docs/design/ds/SYNC.md` already states it in the contract that governs that surface. A fact a contract can hold belongs in the contract.

---

## Not done here, on purpose

The design pass is next. Tier 3 (`candidates_7`–`candidates_10`) runs after it. D-06 through D-09 stay recorded and unfixed — every one needs a runtime change, and `src/**` opens at the theme cut. Applying `.vt-choice--answer` to `test-question-client.tsx` is step 5.
