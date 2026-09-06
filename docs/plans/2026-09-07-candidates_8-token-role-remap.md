# Candidate 8 — radius and shadow were revalued at the role level, so generic components inherited catalog decisions

**Date:** 2026-09-07 · **Tier:** 3 — run after the design pass · **Task mode:** Implementation (documentation surface only) · **공수** M · **효과** 중 · **심각도** 중

---

## Shared frame

**Program.** The 2026-09-06 design-system rebaseline (`BQ-38`) replaces waves 13–17. The repository owns one token definition under `docs/design/ds/` and pushes it one-way to **VIVE Design System v2** (`cd630eec-25e4-4613-a58f-c671c80297ca`). Sync procedure: `docs/design/ds/SYNC.md`.

**Priorities, in order.** 1 — preserve the implemented logic with no side effects. 2 — take design and interaction quality as high as it will go.

**Approved decisions (`BQ-38`).** **A** tokens carry catalog **values** under VIVE **names and structure** · **B** `req-landing.md` §8 frozen · **C** catalog card tokens and patterns frozen · **D** from `825385f6` take only card components and thumbnail SVGs.

**Invariant boundaries.** `src/**` is untouched until the theme cut — **this document changes no runtime file**. No baseline regeneration (`BQ-07`).

**Where this sits.** motion pass → tier 2 → design pass → **this document** → theme cut.

**Do not re-run.** Tier 1 already restored `--surface` from `--warm-0` back to `--warm-25`. That was the same class of error as this one and the most severe instance; what follows is the remainder.

---

## The finding

Decision A splits the token file into layers on purpose: VIVE **names and structure** on the outside, catalog **values** on the inside, so that the product's decisions reach the catalog without reaching the general system. Colour mostly respects that split — the catalog's white is `--canvas-elevated`, and `catalog-components.css` uses that name rather than `--surface`.

Radius, shadow and duration do not. They were revalued at the **role** level, which means every generic component that references them changed appearance without anyone deciding it should.

### 8.1 — What moved

Measured against `_provenance/colors_and_type.v2-original.css`:

| Token | Before | After |
|:---|:---|:---|
| `--radius-md` | `8px` | `12px` |
| `--radius-lg` | `12px` | `16px` |
| `--radius-xl` | `16px` | `24px` |
| `--radius-2xl` | `20px` | `32px` |
| `--shadow-md` | `0 4px 12px rgba(31,30,27,.08), 0 1px 3px rgba(31,30,27,.05)` | `0 4px 14px rgba(26,26,31,.06)` |
| `--dur-fast` | `120ms` | `140ms` |
| `--dur-slow` | `260ms` | `280ms` |

The colour re-tint of the shadows is correct and should stay — the ink the system tints with genuinely changed. The *geometry* changes are the problem, and `--shadow-md` additionally lost its second layer, so generic raised surfaces are flatter as well as lighter.

### 8.2 — Who consumes them

From `vive-components.css` in the design-system project:

| Token | Consumers |
|:---|:---|
| `--radius-md` | `.btn` (all variants and sizes), `.input`, `.textarea`, `.select` |
| `--radius-lg` | `.card`, `.menu` |
| `--shadow-md` | `.card-raised`, `.card-interactive:hover` |
| `--dur-fast` | `.btn`, `.input`/`.textarea`/`.select`, `.chip`, `.menu-item` transitions |

So every button and every form field in the general system is now 12px-rounded rather than 8px, and every generic raised card is flatter. Nothing in the catalog required either.

### 8.3 — The catalog's own name for that step already existed

The catalog's ladder is `xs 5 · sm 8 · md 12 · lg 16 · xl 24 · pill 999`, and it matches `design.md` §5.9 exactly — that part of the rebaseline is right, and an external reviewer confirmed the radius ladder is *not* a `design.md` contradiction. The catalog's own step for a small control is `--radius-sm: 8px`, which is precisely what `.btn` and `.input` had before.

The fix was therefore never to revalue `--radius-md`; it was to point the generic consumers at `--radius-sm`. Revaluing was the shortcut, and it moved components nobody was looking at.

---

## What to change

### Prerequisite — mirror `vive-components.css` into the repository first

The consumers live in `vive-components.css`, which exists only on the Claude Design side. Editing it there would break the one-way rule that the whole rebaseline exists to establish (`SYNC.md`: the repository owns the content).

So: `get_file` it from `cd630eec`, add it to `docs/design/ds/vive-components.css` unchanged as a first commit, update `SYNC.md`'s mirrored/not-mirrored table, and only then edit it. Two commits, and the first one is a pure move.

### Then remap, do not revalue

- `.btn`, `.input`, `.textarea`, `.select` → `--radius-sm` (8px, their original geometry).
- `.card`, `.menu` → keep `--radius-lg`. 16px is the catalog's card radius and a generic card looking like a catalog card is correct.
- Restore `--shadow-md`'s second layer, re-tinted: `0 4px 12px rgba(26,26,31,.08), 0 1px 3px rgba(26,26,31,.05)`. Keep `--shadow-hover` in the catalog alias layer pointing at whatever the catalog actually renders — check it against the product before changing anything, because the catalog's hover shadow is a composite.
- `--dur-fast` at 140ms and `--dur-slow` at 280ms are **correct and should stay**: decision B aligns every surface to `req-landing.md` §8's realized values, and 140/280 are those values. Record in the comment that these two were deliberately aligned, so a later reader does not "restore" them.

### And add the guard that would have caught it

One sentence in `colors_and_type.css`'s layer-2 header: *a catalog value may be introduced under a catalog alias; it may not change a VIVE role that generic components consume.* That is the rule tier 1 applied to `--surface` and this document applies to the rest, and writing it down is what stops the third instance.

---

## Verification

- Render `preview/comp-buttons.html`, `comp-button-states.html`, `comp-inputs.html`, `comp-cards.html` and `comp-menu.html` before and after, at the same viewport, and compare. Buttons and inputs should return to 8px corners; cards and menus should not move.
- Read back `--radius-md` and confirm it is still `12px` — the *token* does not change in this item, only who points at it. If `--radius-md` moved, the wrong fix was applied.
- Confirm `preview/radius-scale.html` still prints the correct ladder; it labels values as text and is one of the four files that drift silently.
- `git diff --stat` shows `docs/design/ds/vive-components.css`, `colors_and_type.css`, `SYNC.md` and this plan, and nothing else.
- Push both files and re-register any card whose rendering changed height.

---

## Decisions the user may want to make

- **Whether the general system's components matter at all.** They are not the product; the catalog is. If the answer is that `ui_kits/` and the generic components are reference material nobody will ship, this item drops to 하 severity and can be closed with only the guard sentence. That is a legitimate call and it should be made explicitly rather than by neglect — the reason this item exists is that the last two role changes were made by neglect.
- **Whether to mirror `vive-components.css` at all**, given the above. Mirroring it is what makes the one-way rule true for the whole system rather than for the token file alone.

---

## Execution prompt

> Read `docs/plans/2026-09-07-candidates_0-overview.md`, then `docs/plans/2026-09-07-candidates_8-token-role-remap.md`, and implement it. Mirror `vive-components.css` into the repository as its own commit before editing it. Remap consumers; do not revalue tokens. Work in an isolated clone; touch nothing under `src/`. Verify by rendering the five generic component cards before and after. Push to `cd630eec-25e4-4613-a58f-c671c80297ca` per `docs/design/ds/SYNC.md`, then commit and land on `main`.
