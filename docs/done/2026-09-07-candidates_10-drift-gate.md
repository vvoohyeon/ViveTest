# Candidate 10 — nothing detects drift between the four places these values live

**Date:** 2026-09-07 · **Tier:** 3 — run after the design pass · **Task mode:** Plan Only until approved, then Implementation · **공수** M · **효과** 중 · **심각도** 중

---

## Shared frame

**Program.** The 2026-09-06 design-system rebaseline (`BQ-38`) replaces waves 13–17. The repository owns one token definition under `docs/design/ds/` and pushes it one-way to **VIVE Design System v2** (`cd630eec-25e4-4613-a58f-c671c80297ca`). Sync procedure: `docs/design/ds/SYNC.md`.

**Priorities, in order.** 1 — preserve the implemented logic with no side effects. 2 — take design and interaction quality as high as it will go.

**Approved decisions (`BQ-38`).** **A** tokens carry catalog values under VIVE names · **B** `req-landing.md` §8 frozen · **C** catalog card tokens and patterns frozen · **D** from `825385f6` take only card components and thumbnail SVGs.

**Invariant boundaries.** `scripts/qa/*.mjs` is an **Ask-First** path (`AGENTS.md` §4). No baseline regeneration (`BQ-07`). This item adds a checker; it changes no product code.

**Where this sits.** motion pass → tier 2 → design pass → **this document** → theme cut. Run it last of the three tier-3 items: `candidates_7` removes most of the prose values it would otherwise have to parse, and `candidates_9` removes one of the conflicts it would immediately report.

---

## The finding

The same visual concepts are defined in five places (insight I-5 in `candidates_0`), and **no automated check compares any two of them**. `grep -rl "docs/design" scripts/` returns nothing; none of the twelve checkers behind `npm run qa:rules` reads a design document.

Everything the mid-review found in this class was found by a human or an agent reading two files side by side:

- `--dur-base` `220ms` in `design.md` §5.11 against `180ms` in `colors_and_type.css`, with §8 repeating the stale value a second time.
- `--dur-expand` `260ms` against `280ms`.
- `--ease-out` bound to two different curves — the subtle one, because `--ease-standard` agreed and hid it.
- `--body` meaning a colour in one file and a font shorthand in the other.
- The thumbnail ratio `6:1` against `16 / 6`, standing for fifteen waves (`candidates_9`).
- `--blog-read-more-ink` in the module CSS against `--blog-readmore-ink` in the token file — the same value under names that differ by one hyphen, which is the case a naive comparison misses (`candidates_5`).

`BQ-38` now requires that any divergence between `design.md` §5 and `colors_and_type.css` be **registered before it is written**, and lists the three that are approved. That rule is currently enforced by nothing but attention.

### This was already identified once and deferred

`BQ-22`'s notes, from the R1 reconciliation:

> RC-W1W5-06 token parity QA script는 별도 Ask-First 후보로 defer

So a token-parity checker has been an open candidate since before this programme existed. It is the same item; it should be closed under that name.

---

## What to change

### The checker

Add `scripts/qa/check-design-token-parity.mjs`, wired into `scripts/qa/run-all.mjs`, that compares:

1. **`design.md` §5 code fences against `docs/design/ds/colors_and_type.css`.** Parse the fenced CSS blocks in §5.1–§5.11, resolve the token file's `var()` chains to final values, and diff. Any token present in both with different resolved values is a failure **unless** its name appears in an allow-list.
2. **The allow-list is the decision register, not a constant in the script.** `BQ-38` names its three approved deviations. Read them from `docs/decision-register.md` so that adding a deviation requires registering it — which is exactly what `BQ-38` says must happen. A deviation in the script but not the register is itself a failure.
3. **`design.md` §5.11 against §8.** The motion tokens are stated twice in the same document and both copies went stale together. Compare them to each other.
4. **The scoped literals in `landing-grid-card.module.css` against their catalog aliases.** The module CSS defines about 21 scoped `--normal-*` / `--expanded-*` tokens as hardcoded hex. Each has a counterpart in the token file. Map them explicitly — the mapping table is the valuable artifact here, and building it will surface more pairs like the `blog-read-more-ink` hyphenation.

### What it must not do

- **Do not compare against `src/app/globals.css`.** It is the frozen legacy layer; `project-rules.md` forbids reconciling it before the theme cut, and a checker that fails on it would fail on day one and be disabled by day two.
- **Do not fail on tokens that exist in only one file.** The token file adds 60 names the design document has no counterpart for, by design. Only shared names are comparable.
- **Do not try to parse `README.md`'s prose.** `candidates_7` removes most of those values; whatever survives it gets a marker phrase precisely so a checker can find it without parsing English. Add that as a fifth comparison only after `candidates_7` has landed.

### Placement in the gate

`qa:rules` is release-level and excluded from the Default Done gate (`AGENTS.md` §5). That is the right home: this checker guards a documentation invariant, and failing a routine `npm test` on it would be disproportionate.

---

## Verification

- The checker fails when it should: temporarily change one value in `colors_and_type.css`, confirm a failure naming the token and both values, revert.
- The checker passes on a clean tree, and its pass is meaningful — confirm it actually compared something by having it print the count of tokens compared, not just a green line. A parity checker that silently compares zero tokens is the classic failure of this genre.
- Remove one of `BQ-38`'s three registered deviations from the register and confirm the checker then fails on it.
- `npm run qa:rules` green; `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` green.
- `git diff --stat` shows `scripts/qa/check-design-token-parity.mjs`, `scripts/qa/run-all.mjs`, this plan, and — if the mapping table lives in a document — one file under `docs/`.

---

## Decisions the user needs to make

- **This is an Ask-First path.** `scripts/qa/*.mjs` requires approval before implementation, and `run-all.mjs` gains a thirteenth check, which changes what `AGENTS.md` §5 states ("12 contract checks"). That line needs updating in the same change, and `AGENTS.md` is itself Ask-First.
- **Whether the checker is worth its maintenance.** It is the only item in either tier that adds something to maintain rather than correcting something. The argument for it is that six drift instances were found by hand in one review and one of them had survived fifteen waves; the argument against is that the theme cut will collapse two of the five layers and reduce the surface. Reasonable either way — but if the answer is no, `BQ-38`'s "register before you diverge" rule should be softened to match, because a rule with no enforcement and no reminder is a rule that will be broken silently.

---

## Execution prompt

> Read `docs/plans/2026-09-07-candidates_0-overview.md`, then `docs/plans/2026-09-07-candidates_10-drift-gate.md`. This touches `scripts/qa/*.mjs` and `AGENTS.md`, both Ask-First — present the plan and wait for approval before implementing. Once approved, work in an isolated clone, build the module-CSS-to-alias mapping table first and report anything it surfaces, then write the checker so that it prints how many tokens it compared. Run `npm run qa:rules` plus the basic gates, then commit and land on `main`.
