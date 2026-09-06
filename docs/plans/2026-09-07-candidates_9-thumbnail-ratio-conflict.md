# Candidate 9 — two routed SSOTs disagree on the thumbnail ratio, and the extraction propagated one without noticing

**Date:** 2026-09-07 · **Tier:** 3 — run after the design pass · **Task mode:** Plan Only until approved, then Implementation · **공수** S · **효과** 중 · **심각도** 중

---

## Shared frame

**Program.** The 2026-09-06 design-system rebaseline (`BQ-38`) replaces waves 13–17. The repository owns one token definition under `docs/design/ds/` and pushes it one-way to **VIVE Design System v2** (`cd630eec-25e4-4613-a58f-c671c80297ca`). Sync procedure: `docs/design/ds/SYNC.md`.

**Priorities, in order.** 1 — preserve the implemented logic with no side effects. 2 — take design and interaction quality as high as it will go.

**Approved decisions (`BQ-38`).** **A** tokens carry catalog values under VIVE names · **B** `req-landing.md` §8 frozen · **C** catalog card tokens and patterns frozen · **D** from `825385f6` take only card components and thumbnail SVGs.

**Invariant boundaries.** No baseline regeneration (`BQ-07`). This item edits `docs/req-landing.md`, which is a **routed SSOT** — see the approval note below.

**Where this sits.** motion pass → tier 2 → design pass → **this document** → theme cut.

---

## The finding

`AGENTS.md` §2 routes both `docs/req-landing.md` and `docs/design/design.md` as SSOT contracts. They disagree about the normal card's thumbnail, and have since `BQ-22`.

**`docs/req-landing.md:389`:**

> - Normal thumbnail: width `100%`, ratio `6:1`, `object-fit: cover`(왜곡 금지).

**`docs/design/design.md` §6.2:**

> A `16 / 6` aspect-ratio block at medium radius, full width, clipped.

**The product** — `src/features/landing/grid/landing-grid-card.tsx:216`: `aspect-[16/6]`.

`6:1` and `16 / 6` are not the same shape. `6:1` is a letterbox six times wider than tall; `16 / 6` is about 2.67:1. The realized thumbnail is the latter, and it is what the extraction measured and what `colors_and_type.css` now carries as `--thumb-ratio: 16 / 6`.

### How it happened, and why it is worth fixing rather than shrugging at

`BQ-22` made the change deliberately:

> **Decision** — RC W1–W5 thumbnail reconciliation은 최신 Claude Design visual SSOT를 우선해 `16 / 6`을 채택하고, implementation ratio·`grid-smoke` ratio contract·fallback/qmbti thumbnail SVG 재작업을 같은 change set에 포함한다

The change set covered the implementation, the E2E ratio assertion and the SVG assets. It did not cover `req-landing.md`, which still carries the pre-`BQ-22` value. Nothing detected that in the fifteen waves since, because **nothing compares the two contracts** — the same gap `candidates_10` proposes to close.

The step-1b extraction then read `16 / 6` off the product and wrote it into the design system, correctly, while walking past a routed contract that says otherwise. That is the failure mode worth naming: an extraction validates against *the product*, and a product that already diverged from a contract will teach the divergence forward.

---

## What to change

### The edit itself is one line

`docs/req-landing.md:389` becomes `ratio 16 / 6`, with `BQ-22` named as the source of the change so the next reader can see why it moved rather than wondering whether it is a typo.

### But it is a routed SSOT, so it needs approval

`AGENTS.md` §4 lists the SSOT contracts and `§7` requires a plan for changes to them. `docs/req-landing.md` is not on the Ask-First path list, but §10's guardrail is explicit: *지침 충돌 시 자체 해소 금지 — 충돌 항목을 출처와 함께 나열하고 문서 충돌로 보고한다.* This document is that report. The edit should be confirmed by the user before it lands, even though the correct value is not in doubt.

Present it as: two routed contracts disagree, the product and `design.md` and the E2E assertion all say `16 / 6`, `req-landing.md` alone says `6:1`, and `BQ-22` is the decision that moved everything except that line.

### Then check the neighbourhood

`BQ-22`'s change set is fifteen waves old. Before editing, verify that the E2E ratio assertion in `tests/e2e/grid-smoke.spec.ts` still encodes `16 / 6` — `BQ-22` says it was updated to a `>2.4 && <2.9` band, but confirm it against the current file rather than the decision record. If the assertion has since drifted too, that is a second finding and it belongs in the same report.

Also re-read `req-landing.md` §10 around line 389 for any other value `BQ-22` should have touched: the section covers responsive requirements, and a thumbnail ratio is unlikely to be the only casualty of a change set that reworked the slot.

---

## Verification

- After the edit, `grep -rn "6:1" docs/` returns nothing that refers to the thumbnail.
- `docs/req-landing.md`, `docs/design/design.md`, `docs/design/ds/colors_and_type.css` and `landing-grid-card.tsx` all say `16 / 6`.
- The E2E ratio assertion's band contains 2.667 and excludes 6.0.
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` — this is a documentation edit and none of them read it, but `docs/req-landing.md` is a contract and running the gates once after touching one is cheap insurance against an unnoticed coupling.
- `git diff --stat` shows `docs/req-landing.md` and this plan only.

---

## Decisions the user needs to make

- **Confirm the direction.** The recommendation is to correct `req-landing.md` to `16 / 6`, because the product, `design.md`, the E2E contract and the design system all already agree. The alternative — treating `req-landing.md` as authoritative and reverting the product to `6:1` — would undo `BQ-22`, break the E2E assertion and reshape every thumbnail asset. It is listed only so the choice is visibly a choice.
- **Whether the correction is recorded as a new `BQ` or as an amendment to `BQ-22`.** An amendment reads more honestly: `BQ-22` was under-applied, and the register's 변경 이력 table already carries that kind of entry.

---

## Execution prompt

> Read `docs/plans/2026-09-07-candidates_0-overview.md`, then `docs/plans/2026-09-07-candidates_9-thumbnail-ratio-conflict.md`. Verify the current state of the E2E ratio assertion and of `req-landing.md:389` before proposing anything. Report the conflict to the user with sources and wait for a direction — `docs/req-landing.md` is a routed SSOT and `AGENTS.md` §10 forbids resolving a contract conflict unilaterally. Once directed, make the one-line edit in an isolated clone, record it in `docs/decision-register.md` as an amendment to `BQ-22`, run the basic gates, then commit and land on `main`.
