# Step 5a — navigation, and the catalog card's recorded remainders

**Date:** 2026-09-07 · **Task mode:** Implementation · **Branch:** `claude/step5a-navigation` (create it; one branch per plan) · **Opens `src/**`:** yes

---

## Shared frame — repeated in every step-5/6 document so each is standalone

**Programme.** The 2026-09-06 design-system rebaseline (`BQ-38`) replaces waves 13–17. The repository owns the visual definition under `docs/design/ds/` and pushes it **one way** to the Claude Design project **VIVE Design System v2** (`cd630eec-25e4-4613-a58f-c671c80297ca`). Sync procedure and operational traps: `docs/design/ds/SYNC.md`. Nothing is authored on the Claude Design side and copied back.

**Priorities, in order, from the user.** **1 — preserve the implemented logic with no side effects. 2 — take design and interaction quality as high as it will go.** These are not equal. Where a visual improvement would risk behaviour, the behaviour wins and the visual goes in the register as a deferred item.

**Where this sits.** step 1 tokens `c5fc624` → 1b specimens `e8a453e` → tier-1 `a3a1c3e` → step 2 motion `484331d` → tier 2 `10d6321`…`effa654` → step 3 design pass `729a4f7` + `111fafa` → **step 4 theme cut `986a956`** → **step 5, this document** → step 6 baseline.

**Hard stops that outrank any instruction in this document.**

- **`BQ-07` — do not regenerate visual baselines.** `qa:visual:full` / `--update` is forbidden without explicit user approval, and the approval belongs to step 6. The 48 checked-in PNGs are **already red** after the theme cut; that is expected and is not yours to fix here.
- **`.env` and secrets** are never read, printed or committed.
- **No worktrees.** The isolated workspace is `git clone` (`AGENTS.md` §4). Never write the primary checkout.
- **`docs/design/ds/**` is Ask-First** — edits there leave the repository.
- **High-Risk files** (`AGENTS.md` §4) require the plan to name its risk dimensions and to carry Playwright E2E regression coverage. This plan touches one: `src/features/gnb/site-gnb.tsx`.

---

## Check that step 4 actually landed before you start

```bash
git -C <your clone> log --oneline -1 986a956          # theme cut
grep -c '@mirror-begin' src/app/globals.css            # expect 2
grep -c '#[0-9a-fA-F]\{6\}' src/features/landing/grid/landing-grid-card.module.css   # expect 0
ls public/fonts/PretendardVariable.woff2               # expect present
npm test                                               # expect 577 passing
```

If `globals.css` has no `@mirror` sentinels, step 4 is not in your tree and **nothing in this document applies** — the class names it tells you to use resolve against tokens that do not exist yet.

---

## Do NOT re-run these — they are done and re-doing them will regress something

| Already done | Where | Why re-doing it hurts |
|:---|:---|:---|
| Runtime tokens moved to VIVE | `src/app/globals.css` | The `@mirror` region is a **copy** of `docs/design/ds/colors_and_type.css`. Editing a value there fails `tests/unit/design-tokens-dark-parity.test.ts`. Edit the design definition and re-copy. |
| `--gnb-surface` created and wired | `globals.css` + `site-gnb.tsx:33` | The GNB's translucent surface. Do **not** point it back at `--surface`: VIVE's `--surface` is opaque and the sticky bar's `backdrop-filter` flattens with no error. |
| Card module literals → global tokens | `landing-grid-card.module.css` | 22 hexes became `var()` references. This is what makes the landing card dark-aware; reintroducing a literal silently breaks one theme. |
| 16 dead tokens removed | `globals.css` | All had zero consumers, verified repo-wide. |
| Pretendard loaded + 12-locale fallback stack | `globals.css` `@font-face`, `public/fonts/` | Declared as plain `@font-face`, **not** `next/font`, because `--font-sans` is a mirrored token and `next/font` generates a hashed family name that would make the two sides disagree. |
| BQ-25 arrow optical nudge | — | **Evaluated and declined**, with measurements. Do not add a nudge. See "BQ-25 is closed" below. |
| D-07 blog CTA fade mechanism | `catalog-components.css` | Decided: `opacity` + `visibility`. The **product** change is still pending and is listed below. |

---

## Part 1 — Navigation

### What exists to build against

| Thing | Where |
|:---|:---|
| Component spec | `docs/design/ds/app-components.css` — `.vt-gnb*`, `.vt-pill`, `.vt-pill--square`, `.vt-settings*`, `.vt-chip*`, `.vt-drawer*`, `.vt-scrim` |
| Rendered specimens | `docs/design/ds/preview/nav-desktop.html`, `preview/nav-mobile.html` |
| Product files | `src/features/gnb/site-gnb.tsx` **[High-Risk]**, `src/features/gnb/components/settings-controls.tsx`, `src/features/gnb/components/theme-mode-icon.tsx` |
| Behaviour contract | `docs/req-landing.md` §6.4 (the whole GNB block), §9 a11y, §10.2 |
| Visual reference | `docs/design/design.md` §6.6, §6.7, §6.8, §7.6 — **all four were rewritten in step 3**; read the current text, not your memory of it |

`app-components.css` is a **specimen stylesheet**. It is never imported by the app — `tests/unit/design-ds-boundary.test.ts` forbids that and will fail the build. Read the rules, write the equivalent Tailwind/CSS in the product.

### D-11 — two routed contracts disagreed and the disagreement is already settled

`design.md` §7.6 used to forbid a desktop settings icon, specify a static pill with no dropdown, and describe the mobile menu as a full-screen overlay covering the GNB. `req-landing.md` §6.4 requires the opposite on all three. `AGENTS.md` §2's precedence (`decision-register` → **product requirements** → `design.md`) resolves it toward the behaviour contract, and `design.md` was corrected in step 3. **Do not re-open this.** Concretely:

- **The desktop settings trigger stays**, and so does its layer. §6.4 names the trigger and then spends eight lines on the layer's geometry, four of them with automated checks behind them. A static pill cannot satisfy a contract that specifies its dropdown's hover gap.
- **The mobile menu stays a right-hand drawer.** §6.4 requires a `pointer down` **outside the panel** to begin the close, and to be cancelled if it resolves to a scroll. A panel filling the viewport has no outside.
- **Both themes are active.** "Light active only" was never true of the product.
- Menu items are **Home · History · Blog**. `About vive` appears nowhere in `src/messages/**` and never existed.

### The geometry §6.4 fixes, which the design must not break

These are contract values with automated checks. Read §6.4 before writing CSS; do not take them from here alone.

- Sticky, `z-index >= 1000`, desktop/tablet height **64**, mobile height **56**.
- Elevation: a shallow shadow above `scrollY > 4px`, **or** a 1px divider if there is no shadow. `app-components.css` chooses the divider (`design.md` §6.7 asks for it and it is the calmer of the two); either satisfies §6.4.
- Desktop settings layer: hover-open at `>= 1024`, focus/click fallback where pointers are undetectable; closes on `Esc` / outside click / focus out; **effective hover gap between trigger and layer is 0px**; a 100–180ms close grace on the **hover path only**; focus-out close within `<= 1 frame`. The specimen anchors the panel to the trigger's own box for this reason — a decorative margin here fails a test.
- Mobile: hamburger pinned right at a 16px inset; fixed overlay + backdrop dimming the whole viewport outside the panel; panel above the GNB with no top clipping; body scroll lock; backdrop tap closes; unlock on close-transition end; outside `pointer down` starts the close and a scroll gesture cancels it; further close input during the close transition is ignored; focus returns to the hamburger after close.
- Mobile Test context: **Back + Timer only** — no hamburger, no settings, no language, no theme.
- Language change location: desktop **only inside the settings layer**, mobile **only in the drawer foot**.
- `aria-label` is required on the hamburger, the desktop settings trigger, Back, and the close button (§9).

### D-09 — solve it at the class, not the instance

The mobile close button is 40 × 40 against the 44 × 44 `design.md` §4.10 requires of it **by name**. `app-components.css` fixes the class: `.vt-pill--square` is `--tap-min`, and `.vt-pill` itself now has `min-height: var(--tap-min)`. Apply the class rather than resizing one button, and the whole family clears the floor.

The 12-locale chips stay dense at 32px on the desktop layer. That is deliberate: WCAG 2.2 AA's target floor is 24px, §4.10's 44px list names choices, Read more, the close button and the hamburger — not these — and at 44px each the grid becomes a wall. **Inside the drawer** the same chips are a primary touch target and take the floor (`app-components.css` already scopes that).

### One thing in the specimen that is deliberately not theme-aware

The two theme swatches are a **picture** of a theme, not a use of one, so the light swatch stays light inside the dark theme. They are the only literals in the product layer. Their selected state is a **ring**, not the usual `--sage-muted` fill swap — filling them would paint over the very thing the control is showing, and the result reads backwards, with the unselected swatch looking more chosen than the selected one.

### A misnomer you will meet

`--landing-answer-bg-hover`, `--landing-answer-border-hover` and `--landing-answer-shadow-hover` are consumed **only** by `settings-controls.tsx` — the GNB chips. The landing answer buttons never read them. The names were left alone in step 4 because renaming a token is a silent failure mode; if you rename them here, grep first and change every consumer in the same commit.

---

## Part 2 — The catalog card's recorded remainders

Three findings are decided and still in the product. They are small and they are in one file, so they belong together.

### D-06 — `word-break: keep-all` at every tier

`design.md` §4.3 states one global wrapping rule — `word-break: keep-all` with `overflow-wrap: anywhere`. The product applies it to the card title and subtitle **only on the mobile tier** (`landing-grid-card.module.css`, the `[data-card-viewport-tier='mobile']` rule; `landing-grid-card.tsx` carries the desktop branch).

Measured 2026-09-07 **inside real cards at their real content boxes** (258px inside the 292px card, 363px inside the 397px one), reading only the two lines the clamp leaves visible:

| Card (subtitle) | 292px card | 397px card |
|:---|:---|:---|
| release-gate | 스모크 계 / 약을 | clean |
| burnout-risk | 회복탄력성 체 / 크가 | clean |
| energy-check | 찾아봅 / 니다. | clean |
| debug-sample | 카드입 / 니다. | clean |
| egtt | clean | 숨겨둔 카드 / 입니다. |
| ops-handbook | clean | 어떤 원 / 칙으로 |
| build-metrics | clean | 품질 지표 / 를 고르는 |
| qmbti · creativity-profile | clean | clean |
| rhythm-b | the long Latin token breaks — **identically with and without the rule** | same |

**Seven of ten** break Korean mid-word on at least one desktop width; the rule fixes every one; **line counts do not move in any case**, so nothing reflows. The only plausible objection — that `keep-all` would stop a long unbreakable Latin token from breaking — does not hold: `overflow-wrap: anywhere` is the other half of the pair §4.3 specifies and still fires, which is what the `rhythm-b` row shows.

A superseded count of "four of eight" appears in older documents. It was taken on unclamped text at the card's outer width; **cite the table above**, or `preview/card-bilingual.html`, which renders it.

### D-09 in the card — the mobile expanded sheet's close button

Same finding as Part 1, other instance. `landing-grid-card.module.css` / `landing-grid-card.tsx` render the mobile expanded sheet's close at 40 × 40.

### D-05's last item — and it changed shape in the theme cut, so verify before fixing

`landing-grid-card.module.css:178` still carries:

```css
.root.desktopOverlayLayer:has(:focus-visible) {
  box-shadow: var(--card-shadow);
}
```

Before the theme cut this was recorded as "a cool legacy shadow replaces the expanded card's warm lift while focus is inside it". After the cut both shadows are warm, and `--card-shadow` now resolves to `--shadow-rest` — `0 1px 2px rgba(30,26,22,0.04)`, a whisper — while the expanded lift is painted by a **different element** (`landing-grid-card-expanded-shadow`, `landing-grid-card.tsx:267`, `[box-shadow:var(--expanded-card-shadow)]`).

**This was not rendered.** Two shadows on two elements can add rather than replace. Before changing anything: render an expanded card, tab into it, and read both elements' computed `box-shadow`. If focus flattens the card, `design.md`'s rule is "`--shadow-expanded` stays; focus adds a ring, never a different shadow". If it merely adds a faint second shadow, the finding is smaller than recorded and should be re-worded rather than fixed.

### D-07 — the blog CTA's fade, product side

Decided in step 3 and implemented **in the specimen only**. The product still writes a 140ms opacity transition next to a `display` switch on the same element, and a `display: none` element has no rendered previous frame, so the transition never runs.

The decided mechanism, from `catalog-components.css`:

```css
.vt-card--blog .vt-readmore {
  visibility: hidden;
  opacity: 0;
  transition: opacity var(--dur-fast) var(--ease-standard), visibility 0s linear var(--dur-fast);
}
/* revealed state */
{ visibility: visible; opacity: 1; transition: opacity var(--dur-fast) var(--ease-standard), visibility 0s; }
```

`visibility` rather than `opacity` alone because it keeps the hidden CTA out of the tab order and the accessibility tree, which `display: none` was doing and must not be lost. There is a **second reason** found while checking the first: `display: none` takes the CTA out of layout, so at any width where it competes with the tag row the reveal **reflows** that row — measured at 250px, the tags lose 23.33px and the last tag ellipsizes a further 3.92px under the pointer. The `visibility` mechanism measures **zero shift** at 397, 292 and 250px.

`req-landing.md:293` requires the CTA to be shown **always** on mobile; `--always` in the specimen is that case. Keep it.

---

## How to verify — and the four traps that will otherwise cost you a day

Read `docs/LESSONS_LEARNED.md` entries **L06, L07, L08, L09** before measuring anything. Condensed:

- **Render and read back with `getComputedStyle`. Never quote a declaration** (L06).
- **Fix the axes before extracting, and write down the ones you skipped** (L07).
- **Falsify your measuring script on a case whose answer you already know** (L08). Five instruments were silently wrong in one session; every one produced a plausible number. If a result is physically impossible — the same string identical in two different fonts, black ink at 1.05:1 on white — that is a broken tool, not a finding.
- **A hidden browser pane freezes `requestAnimationFrame`**, so a transition registers and never advances; and reading immediately after a state change gives you a mid-flight value (L09). For static values inject `*,*::before,*::after{transition:none!important;animation:none!important}` first. To prove an animation runs, use `element.getAnimations()`, and drive `anim.currentTime` by hand to trace the curve. **Never test hover with a real pointer — force a class.**

**The contrast audit that step 4 used**, and which step 5 should re-run after each surface, in outline: load the route in an iframe, inject the transition-killer, set `data-theme`, wait, then for every element with a text child composite its colour over the accumulated ancestor background and compare against 4.5:1 (3:1 for `>=24px`, or `>=18.66px` bold). Two things it must get right: Chrome serialises `color-mix()` as `color(srgb r g b / a)` with **0–1** channels, not `rgb()` 0–255; and `[aria-hidden="true"]` subtrees must be skipped or decorative glyphs bury the real findings. Step 4's baseline for comparison: **0 failures across 6 routes × 2 themes**, so any new failure is yours.

### Gates

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

`site-gnb.tsx` is High-Risk, so also run the E2E that covers it. Playwright browsers are **not** installed in a fresh clone:

```bash
npx playwright install chromium webkit
npm run test:e2e -- tests/e2e/gnb-smoke.spec.ts tests/e2e/a11y-smoke.spec.ts tests/e2e/state-smoke.spec.ts
```

`tests/e2e/theme-matrix-smoke.spec.ts` **will fail** and that is expected — its 48 baselines predate the theme cut. Do not pass `--update`. Report which cases fail; step 6 regenerates them once, with user approval.

Unit coverage that already exists and must stay green: `gnb-behavior`, `gnb-desktop-settings`, `gnb-mobile-menu`, `gnb-keyboard-targets`, `gnb-tab-routing`, `gnb-back-navigation`, `gnb-landing-entry-mode`, `gnb-message-labels`, `landing-card-contract`, `landing-mobile-*`.

### Risk dimensions for the High-Risk file

Name these in the commit and confirm each: **usability** (the settings layer must still open on hover and close on all four paths), **a11y** (aria-labels on trigger/hamburger/Back/close; focus returns to the hamburger after the drawer closes; the landing-only GNB↔card focus transfer is preserved), **responsiveness** (64/56px heights; the drawer at `min(87vw,340px)`), **performance** (no new blocking asset), **design-system consistency** (every value from a token, no new literal).

---

## Execution prompt

> Read `docs/plans/2026-09-07-step5a-navigation-and-card-remainders.md` and `docs/LESSONS_LEARNED.md` L06–L09. Confirm step 4 landed using the check block. Then implement Part 1 (navigation) and Part 2 (card remainders) as **separate commits**, in that order, each gated. Do not regenerate visual baselines under any circumstance — `BQ-07` reserves that for step 6 and it needs the user's approval. Before fixing D-05's last item, render it: the finding was recorded before the theme cut and the two shadows sit on different elements, so confirm what actually happens before changing it.
