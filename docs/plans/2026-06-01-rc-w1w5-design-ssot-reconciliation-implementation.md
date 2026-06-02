# RC: W1–W5 Design-SSOT Reconciliation — Implementation Plan

> **Task mode: Implementation.** Authorized by the BQ-19 Analysis gate
> (`docs/plans/2026-06-01-rc-w1-w5-reconciliation-analysis.md`, §13 Candidate Register +
> §11 Finding Fields). Scope is the approved set only — no re-analysis, no scope expansion.
> Single coupled change set on local `main`.

## 1. Metadata (AGENTS §7 + rebuild fields)

| Field | Value |
|---|---|
| Initiative | RC: W1–W5 design-SSOT reconciliation (visual/asset/QA-contract only) |
| Plan date | 2026-06-01 |
| Workspace | confirmed active local `main` (`git worktree list` → repo root); branch `main` @ `cc78257` |
| Task mode | **Implementation** |
| Wave range | W1–W5 reconciliation; **no roadmap renumbering**, no new wave |
| SSOT contract | `docs/design/design.md` §6.2 (thumbnail `16 / 6`), §4.4 / §4.9 (warm-neutral / sage imagery, no cold-blue), §4.3 (Pretendard), §4.10 (contrast), §5.2 / §5.5 token family; BQ-22 (ratio) per AGENTS §2 visual-skin row |
| Reference-only (must NOT modify) | `legacy/reference` (`d3305b7`); checkpoint worktrees `w01-02`…`w15-17`; `docs/design/resources/superseded/**` |
| Logic Improvement | **None approved.** Preserve resolver / storage / telemetry / transition / routing / test-entry / answer-choice / i18n behavior. |

## 2. Files to modify (4 files; coupled set)

| # | File | Change | RC item |
|---|---|---|---|
| 1 | `src/features/landing/grid/landing-grid-card.tsx` | L215 thumbnail slot `aspect-[6/1]` → `aspect-[16/6]`; L165-170 fallback SVG — warm-neutral/sage palette, Pretendard, viewBox redrawn to 16/6 | RC-W1W5-02, -03 |
| 2 | `tests/e2e/grid-smoke.spec.ts` | L826-827 ratio bound `(5.5, 6.5)` → `(2.4, 2.9)` (functional geometry, NOT screenshot) | RC-W1W5-02 |
| 3 | `public/landing-card-media/qmbti/thumbnail.svg` | warm-neutral/sage palette + Pretendard + viewBox/composition redrawn to 16/6 | RC-W1W5-03 |
| 4 | `docs/plans/2026-05-31-wave-6-desktop-expanded-overlay-sibling-isolation-analysis.md` | L27 "Design references" → point at `docs/design/design.md` (superseded wave4/5 CSS demoted to historical evidence) | RC-W1W5-04 |
| 5 (optional) | `docs/design/resources/assets/vive-logo.svg` | strip whitespace-only L2 | RC-W1W5-05 |

Excluded / no change: RC-W1W5-01 (`metaAttempts` = `Completed` stays); RC-W1W5-06 (`scripts/qa/*` untouched).

### Palette mapping (design.md §5 hex used directly in standalone SVG assets)

These are image assets loaded via `<img>`/`next/image`; CSS custom properties from `globals.css`
do **not** cascade into them, so the design.md §5 **intent hex values** are inlined directly.
This is not a `globals.css` token application and not a scoped→global promotion (Wave 16 / BQ-04 untouched).

| Token | Hex | Use in art |
|---|---|---|
| `--canvas` | `#FBFAF7` | gradient warm end |
| `--surface-soft` | `#F4F1EA` | (available alt warm surface) |
| `--sage-soft` | `#C9DBD1` | gradient sage end / soft shape |
| `--sage-muted` | `#E8F0EC` | soft decorative shape |
| `--sage` | `#5C8E78` | low-opacity accent shape |
| `--ink` | `#1A1A1F` | title / token text |
| `--body` | `#4A4A55` | eyebrow |

## 3. Impact assessment

- **Shared shell / GNB:** none touched. Change is contained to the landing card thumbnail slot + placeholder assets + one test bound + two docs.
- **Localization:** none. No message keys/values touched; i18n behavior preserved.
- **a11y:** thumbnail text moves from white-on-cold-gradient to dark-ink-on-warm-light; contrast improves and is verified (§4.10). Slot `aria-hidden`/`alt=""` unchanged. Tap targets unaffected.
- **State contracts / core flow:** `data-slot` names, answer-choice handlers, resolver boundary, storage/telemetry/transition/routing/test-entry all unchanged.
- **Geometry note (acknowledged):** at fixed card width, `16/6` makes the thumbnail ~2.25× taller than `6/1`; this raises the resting-card height and the expanded-card height floor. Accepted visual/QA-contract change per analysis §5 / BQ-22. Wave 6 overlay geometry, sibling isolation, spacer, and the landing interaction/lifecycle/keyboard-handoff hooks are **not** touched.

## 4. Preservation contracts (must not change)

- `src/app/globals.css` global tokens — untouched (Wave 16 / BQ-04). No scoped→global promotion.
- Scoped `--normal-*` / `--expanded-*` tokens in `landing-grid-card.module.css` — already match design.md §5; not refactored.
- B14 mobile title-continuity `test.fixme` — stays deferred to Wave 13.
- High-Risk hooks (`use-landing-interaction-controller`, `use-mobile-card-lifecycle`, `use-keyboard-handoff`), `site-gnb`, `page-shell`, transition/ — untouched.
- BQ-07: NO visual-regression baseline regeneration; `qa:visual:full` NOT run.
- Worktree / checkpoint / branch topology — no branch/merge/reset/push/checkpoint action.

## 5. Validation gates

1. Basic Gates in order: `npm run lint` → `npm run typecheck` → `npm test` → `npm run build`.
2. Focused `grid-smoke` run confirming the updated `16 / 6` thumbnail-ratio assertion passes.
3. Static grep proving the old cold-blue hex (`#3B6EF5`, `#17A789`, `#102541`, `#1f5aa6`, `#31b28b`, `#f7fbff`) are gone from the fallback SVG and `qmbti/thumbnail.svg`.
4. Manual visual check: thumbnail composition, crop (`object-cover` against new viewBox), contrast.
5. Docs/asset items: `git diff --check`.

**Excluded:** `qa:visual:full`, screenshot baseline regeneration, any new `scripts/qa/*` script.

## 6. Decisions requiring user confirmation

None outstanding — all six RC items adjudicated in the analysis Candidate Register (§13). This plan
executes only the approved subset.

---

## 7. Actual outcome

**Status: complete, verified, uncommitted (awaiting instruction).** Branch `main`, no commit/push/checkpoint action taken.

### Changes applied (exactly the approved set)

| File | Change |
|---|---|
| `src/features/landing/grid/landing-grid-card.tsx` | L215 `aspect-[6/1]` → `aspect-[16/6]`; fallback SVG (`createThumbnailFallbackDataUri`) redrawn: `viewBox 0 0 640 240` (16/6), gradient `#FBFAF7`→`#C9DBD1`, sage-muted/sage decorative circles, Pretendard-led font stack, `#1A1A1F` token text (was cold `#3B6EF5`→`#17A789`, Avenir, white text, 6:1) |
| `tests/e2e/grid-smoke.spec.ts` | L826-827 ratio bound `(5.5, 6.5)` → `(2.4, 2.9)` (functional geometry assertion; 16/6 ≈ 2.667) |
| `public/landing-card-media/qmbti/thumbnail.svg` | redrawn to `viewBox 0 0 640 240` (16/6); gradient `#FBFAF7`→`#C9DBD1`; sage-muted/sage circles; Pretendard; eyebrow `#4A4A55`, title `#1A1A1F` (was cold `#102541`→`#1f5aa6`→`#31b28b`, white text/circles, Avenir, 6:1) |
| `docs/plans/2026-05-31-wave-6-...-analysis.md` | L27 "Design references" repointed to `design.md` as visual SSOT; wave4/5 CSS demoted to historical evidence under `superseded/` |
| `docs/design/resources/assets/vive-logo.svg` | stripped whitespace-only L2 (RC-W1W5-05 optional hygiene) |
| `docs/plans/2026-06-01-rc-w1w5-design-ssot-reconciliation-implementation.md` | this plan doc (new) |

Not touched (as scoped): `metaAttempts` copy (`Completed` kept — RC-W1W5-01), `scripts/qa/*` (RC-W1W5-06), `globals.css`, scoped `module.css` tokens, High-Risk hooks, transition/GNB/shell, message catalogs, worktree/checkpoint topology, visual-regression baselines.

### Validation results

| Gate | Result |
|---|---|
| `npm run lint` | ✓ clean |
| `npm run typecheck` | ✓ clean (typegen + tsc) |
| `npm test` | ✓ 479/479 (73 files) |
| `npm run build` | ✓ success |
| Focused `grid-smoke` ratio test | ✓ pass (ratio = 2.667 ∈ (2.4, 2.9)) |
| Full `grid-smoke` spec | ✓ 18/18 (incl. B4 geometry isolation, short-expanded, B13 hover-collapse — taller thumbnail did not regress height/geometry assertions) |
| Static grep (cold-blue hex absent) | ✓ no `#3B6EF5`/`#17A789`/`#102541`/`#1f5aa6`/`#31b28b`/`#f7fbff` in fallback SVG or qmbti thumbnail |
| `git diff --check` | ✓ clean (exit 0) |
| Manual visual check | ✓ landing page rendered: qmbti thumbnail = warm-neutral→sage gradient, soft sage circle, dark-ink text; 16/6 aspect, no `object-cover` crop (viewBox aspect == slot aspect); strong contrast (title `#1A1A1F` ≈ 12:1, eyebrow `#4A4A55` ≈ 6:1 over the gradient — both > AA). Fallback card confirmed same warm palette. |

**Excluded as required:** `qa:visual:full`, screenshot baseline regeneration, new `scripts/qa/*` script — none run.

### Note (optional follow-up, out of scope)

During E2E runs, `next/image` logged an LCP advisory for `/landing-card-media/qmbti/thumbnail.svg`
(now a larger above-the-fold element after the 2.25× taller `16/6` thumbnail). It is a perf hint, not a
failure — all gates pass. Acting on it (`priority`/`loading="eager"` on the thumbnail `<Image>`) would
change `NormalCardThumbnail` rendering behavior, outside this RC's approved visual/asset/QA-contract scope.
Left for a separate decision.
