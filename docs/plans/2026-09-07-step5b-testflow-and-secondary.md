# Step 5b — the test flow and the secondary surfaces

**Date:** 2026-09-07 · **Task mode:** Implementation · **Branch:** `claude/step5b-surfaces` · **Opens `src/**`:** yes

---

## Shared frame — repeated so this document is standalone

**Programme.** The 2026-09-06 rebaseline (`BQ-38`) replaces waves 13–17. The repository owns the visual definition under `docs/design/ds/` and pushes it **one way** to **VIVE Design System v2** (`cd630eec-25e4-4613-a58f-c671c80297ca`). Procedure and traps: `docs/design/ds/SYNC.md`.

**Priorities, in order, from the user.** **1 — preserve the implemented logic with no side effects. 2 — take design and interaction quality as high as it will go.** Where a visual improvement risks behaviour, behaviour wins and the visual is deferred with a register entry.

**Where this sits.** step 2 motion `484331d` → tier 2 → step 3 design pass `729a4f7` + `111fafa` → **step 4 theme cut `986a956`** → step 5a navigation → **step 5b, this document** → step 6 baseline.

**Hard stops.** `BQ-07` — **never regenerate visual baselines**; that is step 6 and needs the user's approval. `.env`/secrets are never read or printed. No worktrees; the isolated workspace is `git clone`. `docs/design/ds/**` is Ask-First. High-Risk files (`AGENTS.md` §4) need named risk dimensions and E2E coverage — **this plan touches none of them**, which is why it is separate from 5a.

---

## Check the prior steps landed

```bash
grep -c '@mirror-begin' src/app/globals.css     # expect 2  (step 4)
ls docs/design/ds/app-components.css            # expect present (step 3)
npm test                                        # expect 577+ passing
```

5a is **not** a prerequisite — these surfaces share no file with the GNB — but if 5a has landed, rebase onto it rather than working in parallel on `globals.css`.

---

## Do NOT re-run these

| Already done | Where |
|:---|:---|
| Runtime tokens moved to VIVE; `@mirror` region is a guarded **copy** of the design definition | `src/app/globals.css` |
| 16 dead tokens removed (zero consumers, verified repo-wide) | `globals.css` |
| Pretendard loaded via plain `@font-face`; 12-locale fallback stack | `globals.css`, `public/fonts/` |
| Page ground: legacy teal/blue radial washes removed | `src/app/app-body-class.ts` |
| Card module literals → global tokens | `landing-grid-card.module.css` |
| The component specs themselves | `docs/design/ds/app-components.css` |

Editing a value inside `@mirror-begin`/`@mirror-end` fails `tests/unit/design-tokens-dark-parity.test.ts`. Edit `docs/design/ds/colors_and_type.css` and re-copy.

---

## The one pattern all six surfaces were missing

Every undesigned surface repeats one unwritten treatment, by copy:

```
rounded-[18px] p-5
background: color-mix(in srgb, var(--panel-solid) 94%, transparent)
box-shadow: var(--dialog-shadow)
```

A **translucent** panel, a heavy shadow, and **no border**. VIVE says the opposite (`design.md` §4.7, README *Corners, borders & cards*): an opaque fill, a 1px hairline, and a whisper of shadow, with hierarchy built from surface tint and hairlines and shadow reserved for genuinely floating things. `app-components.css` writes that down once as three classes, and the difference between them is **what they rest on**, not how important they are:

| Class | Rests on | Use |
|:---|:---|:---|
| `.vt-panel` | the page | question surface, result panel, history, blog detail |
| `.vt-floating` | over the page | instruction dialog, settings layer, drawer, consent banner |
| `.vt-well` | inside a panel | the result panel's answer list |

**Geometry that came off the ramp.** Realized radii are 18px (panels), 16px (shell cards) and 14px (buttons). The VIVE ramp is 5 / 8 / 12 / 16 / 24 / 999 — only 16 is on it. Panels move to `--radius-lg` (16), dialogs and drawers to `--radius-xl` (24) per §6.8, buttons to `--radius-md` (12). The one realized value **kept as-is** is `min-height: 46px` on buttons: off the 4px grid but it clears §4.10's 44px floor, and a real value that satisfies a real rule is not worth rounding.

**Dark needs no branch.** Nothing in `app-components.css` declares a dark value; every surface resolves through the semantic layer. The four specimens render both themes from one rule set. If you find yourself writing a `[data-theme]` branch inside a component, the token you reached for is wrong, not the theme. The single exception is stated in the spec: an overlay in dark cannot separate itself by dimming what is behind it — measured, the light scrim dims its ground 3.12:1 and the same treatment dims the dark ground **1.04:1**, and deepening it to 85% only reaches 1.08 — so in dark the overlay's **edge** carries the separation (`--border-strong` is 4.73:1 against the scrimmed ground, 3.18:1 against the panel).

---

## Surface by surface

### The test flow

| Product file | Spec to apply |
|:---|:---|
| `src/features/test/instruction-overlay.tsx` | `.vt-floating` dialog over `.vt-scrim`; `.vt-btn--primary` / `--secondary` / `--quiet` |
| `src/features/test/test-question-client.tsx` | `.vt-panel`; `.vt-progress*`; `.vt-choice--answer` (catalog spec); `.vt-btn*` nav row |
| `src/features/test/test-result-panel.tsx` | `.vt-panel` + `.vt-well` + `.vt-datarow*`; `.vt-btn*` |
| `src/features/test/qualifier-chip.tsx` | `.vt-chip` family |

Specimen: `docs/design/ds/preview/test-flow.html` (both themes).

**The progress bar is a redesign, not a reskin.** The realized bar is 24px tall with the percentage floating **inside** the fill and escaping to `right: -2.5rem` when the fill is too narrow to hold it — two layouts for one control, and the number changes side as you answer. The spec puts the label outside the track, where it does not move, and drops the track to **6px** because it is a progress indication, not a surface. Keep the `role="progressbar"` and all four aria attributes exactly as they are.

**The answer button was already decided in step 2** — `.vt-choice--answer` is the catalog's choice row with a radio mark instead of an arrow, and the submit CTA keeps the filled treatment (`.vt-cta`). Do not revisit that; just use it.

**`.vt-btn--quiet` is new and the flow needs it.** "Deny and start" currently renders with the same neutral fill as "Previous", so a consent refusal and a navigation step carry identical visual weight.

**D-12 binds here.** A filled accent control reads `--accent-solid` / `-hover` / `-pressed`, **never `--accent`**: as a line or ring the accent needs 3:1 and clears it at 3.75, but as the **fill under its own label** it needs 4.5:1 against that label and white on `--accent` is 3.75. Inverting the label does not fix it — a dark label measures 4.61 at rest and then *falls* to 3.39 and 2.44 as the fill deepens. Stepping the fill one deeper keeps the white label and moves the right way: 5.09 → 7.09 → 9.76.

### The secondary surfaces

| Product file | Spec to apply |
|:---|:---|
| `src/features/landing/shell/consent-banner.tsx` | `.vt-banner*` — a floating surface **without** a scrim: it is over the page but must not read as a modal it is not |
| `src/features/blog/blog-destination-client.tsx`, `src/app/[locale]/blog/[variant]/page.tsx` | `.vt-panel` + prose; reading measure `--container-narrow` (760px), which existed in the token file with no consumer; body is 16px/1.6, the one place the general `--body` role is right and the catalog's 15px is not |
| `src/app/[locale]/history/page.tsx` | `.vt-panel`; `.vt-empty*` for the empty state; `.vt-datarow*` for entries |
| `src/app/[locale]/test/error/page.tsx` | `.vt-empty*` |
| `src/app/not-found.tsx`, `src/app/global-not-found.tsx` | `.vt-empty*` |

Specimen: `docs/design/ds/preview/secondary-surfaces.html` (both themes).

### Content defects — record, do not design around, do not silently fix

These are **content**, not visual, and they will be visible in anything you build on these surfaces. `design.md` is visual-only under `BQ-21` and does not govern copy. Surface them to the user rather than inventing strings.

- `history/page.tsx` renders `Locale: ${locale}` as body copy — a debug line in the page's own content area, below the H1.
- `test/error/page.tsx`'s heading is a **hardcoded Korean string** (`이 테스트에 진입할 수 없습니다`) served to **all twelve locales**, with the raw `variant` id interpolated into it.
- `not-found.tsx` and `global-not-found.tsx` are hardcoded English **and render outside `PageShell`** — the only routes with no GNB, no consent banner, and no way back except one bare link. Whether they should carry the shell is a **routing** question, not a visual one; it is open.
- The GNB timer is `timerPlaceholder: "00:00"` — the entire centre column in test context.

---

## Verification

Read `docs/LESSONS_LEARNED.md` **L06, L07, L08, L09** before measuring. The short form:

- Render and read back with `getComputedStyle`; never quote a declaration (L06).
- Fix the axes before extracting and write down the ones you skipped (L07).
- **Falsify your measuring script on a case whose answer you already know** (L08). A physically impossible result — the same string identical in two fonts, black ink at 1.05:1 on white — is a broken tool, not a finding.
- **A hidden browser pane freezes `requestAnimationFrame`**: transitions register and never advance. And a value read immediately after a state change is mid-flight — 17 false AA failures came from exactly that. Inject `*,*::before,*::after{transition:none!important;animation:none!important}` before measuring static values; use `getAnimations()` and drive `anim.currentTime` to prove an animation runs (L09). Never test hover with a real pointer; force a class.

**Contrast audit.** Re-run the step-4 audit after each surface: iframe the route, kill transitions, set `data-theme`, then composite every text element's colour over its accumulated ancestor background and compare against 4.5:1 (3:1 for `>=24px` or `>=18.66px` bold). Chrome serialises `color-mix()` as `color(srgb r g b / a)` with **0–1** channels; skip `[aria-hidden="true"]` subtrees. **Step 4's result was 0 failures across 6 routes × 2 themes** — that is the bar, and any new failure is yours.

```bash
npm run lint && npm run typecheck && npm test && npm run build
npx playwright install chromium webkit          # not installed in a fresh clone
npm run test:e2e -- tests/e2e/consent-smoke.spec.ts tests/e2e/qualifier-overlay.spec.ts tests/e2e/routing-smoke.spec.ts tests/e2e/a11y-smoke.spec.ts
```

`theme-matrix-smoke.spec.ts` **will fail**; its 48 baselines predate the theme cut and all of them cover the test flow, which this plan restyles. **Do not pass `--update`.** Report the failing case list; step 6 regenerates once with approval.

Unit coverage that must stay green: `test-result-panel`, `test-question-*`, `test-entry-*`, `use-test-run-controller`, `telemetry-consent-banner`, `blog-server-model`.

---

## Execution prompt

> Read `docs/plans/2026-09-07-step5b-testflow-and-secondary.md` and `docs/LESSONS_LEARNED.md` L06–L09. Confirm step 4 landed with the check block. Implement the test flow first, then the secondary surfaces, as separate gated commits. Use `docs/design/ds/app-components.css` as the specification — read it, do not import it; `tests/unit/design-ds-boundary.test.ts` forbids the runtime consuming that directory and will fail the build. Never regenerate visual baselines: `BQ-07` reserves that for step 6 under the user's approval. Report the content defects listed under "Content defects" to the user rather than inventing copy for them.
