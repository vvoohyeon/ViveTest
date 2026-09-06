# Step 3 · U3 — Extraction of the undesigned surfaces

**Date:** 2026-09-07 · **Task mode:** Analysis Only · **Branch:** `claude/step3-design` · **Opens `src/**`:** no (read-only)

---

## Why this document exists

Step 1b read the catalog card and nothing else. Every other surface the product ships — navigation, the whole test flow, blog, history, consent, the two 404s, the test error page — has never been read against the design system at all. U4 designs those surfaces; it cannot start until someone has written down what is actually there.

`L07` says the failure mode is not a wrong reading but a missing one: *what you did not extract shows up as "correct", not as a defect.* So the axes are fixed and written down first, below, including the axes deliberately skipped, and the extraction is then held to that list.

---

## Axes — fixed before reading

**Surfaces read.** GNB desktop · GNB mobile · desktop settings layer · mobile menu panel · test instruction overlay · test qualifier step · test qualifier chip · test question surface · test progress bar · test result panel · blog list · blog detail · history · consent banner · segment 404 · global 404 · test error · page shell and page ground.

**Dimensions read per surface.**

| Axis | Read |
|:---|:---|
| Token provenance | every `var(--…)` consumed, classified against the legacy runtime layer (`src/app/globals.css`) and against `docs/design/ds/colors_and_type.css` |
| Theme | light **and** dark, resolved through `color-mix()` to final sRGB |
| Contrast | computed for each realized text/ground pair |
| Geometry | radius, padding and control height where the surface declares one |
| Contract conformance | against `docs/req-landing.md` §6.4 and §10, and against `docs/design/design.md` §6–§7 |

**Axes deliberately NOT read, and therefore not claimed either way.**

- **Tablet tier.** Desktop and mobile only. The tablet tier has its own column-mode thresholds (`req-landing.md` §6.2) and is not read here.
- **Ten of the twelve locales.** `en` and `kr` only. `zs` `zt` `ja` `es` `fr` `pt` `de` `hi` `id` `ru` are unread; Devanagari and Cyrillic in particular may behave differently from anything measured here.
- **Motion and lifecycle.** Static states only. Mobile `OPENING` / `CLOSING`, the transition overlay, and the theme-change view transition are named as skipped, not as absent.
- **Hover and focus on the undesigned surfaces.** Declared values were read from source; they were not rendered and force-classed the way the card specimens were. Where this document names a hover value it is marked **D** (derived from the declaration), never **R**.
- **The landing card.** Already covered by steps 1b and 2; it appears here only in the token census, for comparison.

---

## Finding 1 — the token census

Method: extract every `var(--…)` from each surface's source, then classify each name against the 71 custom properties declared in `src/app/globals.css` and the 185 declared in `docs/design/ds/colors_and_type.css`.

| Surface | legacy tokens | VIVE tokens | literal hex |
|:---|---:|---:|---:|
| GNB (desktop + mobile + settings + menu) | **33** | 0 | 0 |
| Test — instruction overlay | 23 | 0 | 0 |
| Test — question surface | 23 | 0 | 0 |
| Test — result panel | 20 | 0 | 0 |
| Consent banner | 18 | 0 | 0 |
| Test — qualifier chip | 8 | 0 | 0 |
| Blog list + detail | 8 | 0 | 0 |
| History | 3 | 0 | 0 |
| Test error | 2 | 0 | 0 |
| Page shell + page ground | 2 | 0 | 0 |
| 404 (segment + global) | 1 | 0 | 0 |
| *(landing card, rebaselined — for comparison)* | *1* | *2* | *13* |
| **Distinct legacy tokens across all of the above** | **51** | | |

**Not one of these surfaces consumes a single VIVE token.** The rebaseline has so far reached exactly one component.

**49 of the 51 have no same-named counterpart in the VIVE file.** The theme cut is therefore a *mapping* exercise, not a rename: for all but two names there is nothing to collide with, and each one needs a destination chosen for it.

**The two that do collide are the dangerous ones**, because a name that exists on both sides changes meaning silently the moment both files are in scope.

| Name | Runtime value | VIVE value | Consequence of a collision |
|:---|:---|:---|:---|
| `--ink` | `#161a20` | `var(--warm-900)` `#1a1a1f` | ink shifts; small and survivable |
| `--surface` | `rgb(247 249 250 / 92%)` | `var(--warm-25)` `#fdfcfa` | **translucent becomes opaque** — the GNB's `backdrop-filter: blur(12px)` sits on `--surface` and would stop showing anything through it |

`--surface` is the one to watch. Its runtime value is 92% translucent *by design* — that is what makes the sticky GNB read as frosted over scrolling content. The VIVE `--surface` is a flat opaque step. Importing the token file without renaming would not error; it would silently flatten the navigation bar.

---

## Finding 2 — the product ships a dark theme; the design system does not

This is the largest gap found, and it blocks step 4 outright.

**What the product realizes.** `src/app/globals.css` carries a complete `html[data-theme='dark']` block redefining **31** custom properties. `public/theme-bootstrap.js` sets `data-theme` before hydration from `localStorage['vivetest-theme']`, falling back to `prefers-color-scheme`. `tests/e2e/theme-matrix-manifest.json` runs **2 locales × 2 themes × 6 viewports**, and the checked-in baseline PNGs under `tests/e2e/theme-matrix-smoke.spec.ts-snapshots/` cover both themes for every layout and state case. Dark mode is not a stub; it is a tested, released feature with visual regression coverage.

**What the design system provides.** Nothing. `colors_and_type.css` declares no dark values, no `prefers-color-scheme` block, and no `[data-theme]` selector. Searching the whole bundle for a dark-mode token returns zero hits.

**What the visual SSOT says.** `docs/design/design.md` §9 lists *"A dark-theme token mapping (only the Light theme is realized)"* among **recommended missing resources — "not yet produced — do not assume they exist"**. §7.6 says the theme control is *"a segmented Light · Dark · System with Light active only"*.

Both statements are false against the product as measured. Under `AGENTS.md` §3-1 this is an **R vs I** divergence — the realized value and the intent disagree — and §2's precedence puts the product requirement above `design.md`. Registered as **D-10**.

**Why it blocks step 4.** The theme cut swaps the runtime token layer from the legacy names to VIVE names. There is nothing to swap the 31 dark values *to*. Executing step 4 against the bundle as it stands would either delete dark mode or leave it stranded on legacy tokens permanently, and 48 checked-in baseline PNGs would go red with no defined correct state to regenerate against.

**Measured resolution of the realized dark theme**, for whatever replaces it (read back through `getComputedStyle`, so `color-mix()` is resolved):

| Role | Light | Dark |
|:---|:---|:---|
| `--bg` | `rgb(245 247 247)` | `rgb(15 18 24)` |
| `--ink` | `rgb(22 26 32)` | `rgb(239 242 248)` |
| `--panel-solid` | `rgb(255 255 255)` | `rgb(18 24 33)` |
| `--accent-solid` | `rgb(47 115 255)` | `rgb(47 115 255)` — **identical in both themes** |
| `--focus-ring-outer` | blue @ 72% | **identical** |
| `--focus-ring-inner` | white @ 78% | **identical** |
| `--overlay-scrim-soft/medium/strong` | `rgba(4 6 10, .56/.64/.74)` | **identical** |
| shadow ladder | ink-tinted `rgb(11 15 22 / 10–22%)` | **pure black** `rgb(0 0 0 / 26–42%)` |

Three of those rows matter for the redesign. The accent never adapts — one blue serves both themes, which works only because `#2f73ff` happens to sit mid-luminance (4.19:1 on white, 4.26:1 on the dark panel). The focus ring never adapts either. And the shadow ladder switches to pure black in dark, which `design.md` §4.7 and the VIVE README both forbid ("never pure black").

The sage accent has no such luck: `--sage-500 #5c8e78` is 3.75:1 on white and 4.59:1 on a dark ground. It cannot be one value across both themes at acceptable contrast, so the dark theme must move the accent along the ramp rather than reuse it. Resolved in the dark mapping shipped with this step.

---

## Finding 3 — `design.md` §7.6 contradicts `req-landing.md` §6.4 on navigation

Three conflicts, all in the same section, all resolved the same way by `AGENTS.md` §2's precedence order (`decision-register` → **product requirements** → `design.md`). Registered as **D-11**.

### 3a. The desktop settings trigger

`design.md` §7.6: *"No desktop gear/settings icon."* §6.6 specifies instead a *"static language/theme pill … Static display only — no dropdown."*

`req-landing.md` §6.4: *"Desktop Landing: 좌측 CI(home), 메뉴(테스트 이력/블로그), 우측 **설정 트리거**(햄버거 금지)"* — and then **eight further lines** specifying the settings *layer*: hover-open at `>=1024`, focus/click fallback where pointers are undetectable, close on `Esc` / outside click / focus out, a **0px** effective hover gap between trigger and layer, a 100–180ms close grace on the hover path only, and focus-out close within `<=1 frame`. §6.4's Verification block automates four of those.

The product realizes the requirement: `gnb-settings-trigger`, a 40×40 round button carrying the current theme glyph, opening a `role="dialog"` panel.

**A static pill cannot satisfy a contract that specifies its dropdown's hover-gap geometry.** `design.md` is visual-only under `BQ-21` and does not govern interaction; the requirement stands and §6.6/§7.6 are stale on this point. The design question that remains is genuine but narrower: *what should the trigger and its layer look like in VIVE?* — not whether they exist.

### 3b. The mobile menu shape

`design.md` §7.6: *"a full-screen overlay that **covers the GNB**; its header row mirrors the mobile nav exactly (logo left, close right)"*.

Realized: a right-hand drawer, `width: min(87vw, 340px)`, full `100dvh`, `padding-top: 72px`, sliding in with `transform` + `opacity` over a backdrop at `--overlay-scrim-strong`. It sits at `z-index: 1200` against the GNB's `1100`, so it *is* above the GNB, as `req-landing.md` §6.4 requires ("GNB를 포함한 페이지 요소보다 상위 레이어 … 상단 클리핑 금지").

**Full-screen would break a behaviour contract.** `req-landing.md` §6.4 requires, for Mobile Landing/Blog/History: *"메뉴 확장 상태에서 패널 외부 영역 입력은 `pointer down` 시점에 닫힘을 시작해야 한다"*, and the following line requires that input to be cancelled if it resolves to a scroll gesture. A panel occupying the whole viewport has no 패널 외부 영역, so the required input has nowhere to land. `§10` line 1049 lists that behaviour among the PASS criteria.

The drawer stays. The design work is to make the drawer look like VIVE, not to replace it.

### 3c. The menu's contents and the theme control

| `design.md` §7.6 | Realized |
|:---|:---|
| items: Test history · Blog · **About vive**; no `Catalog` | items: **Home** · History · Blog. No `About vive` exists anywhere in `src/messages/`. No item is labelled `Catalog`, so §10's ban is honoured. |
| theme control: *"segmented Light · Dark · System with **Light active only**"* | two icon chips (Light / Dark), the active one `disabled` with `aria-pressed="true"`, the inactive one previewing its own theme's colours. **No System option** — and none is possible: `req-landing.md` §6.4 makes system-follow the *initial* state, persisted to `light|dark` on first manual change, so "System" is not a third selectable value. Both themes are fully active. |
| 12-locale chip set, active chip on `--sage-muted` with `--sage` text, transparent border, no hover | structurally exact — active chip is `border-transparent` + accent-tinted fill + `disabled` (hence no hover); inactive chips carry a hairline and a hover of border + fill + shadow. Only the palette is legacy. **This one is a clean reskin.** |

The locale chip row is the single piece of the navigation that needs no design decision at all — only a token swap.

---

## Finding 4 — the shared surface language has no VIVE equivalent

Every undesigned surface is built from one unwritten pattern, repeated by copy:

```
rounded-[18px] p-5 [background:color-mix(in srgb, var(--panel-solid) 94%, transparent)] [box-shadow:var(--dialog-shadow)]
```

That is a **translucent panel with a heavy shadow and no border** — instruction overlay, question panel, result panel and test error all use it verbatim; the shell card and history use the 90%/`--card-shadow`/`rounded-[16px]` variant.

VIVE says the opposite, in `design.md` §4.7 and README *Corners, borders & cards*: cards are an **opaque fill + a 1px hairline + a whisper of shadow**, and *"Hierarchy is built primarily through surface tint and hairlines, with shadow reserved for genuinely floating things."* The realized surfaces invert that — no hairline anywhere, and a 22px-blur 16%-alpha shadow on a panel that is not floating.

Geometry diverges too. The realized radii are **18px** (panels), **16px** (shell cards) and **14px** (buttons). The VIVE ramp is 5 / 8 / 12 / 16 / 24 / 999. Only 16 is on it; 18 and 14 are not on any step, and 14 is used for the most repeated control in the product.

Control height is the one thing already right: every button declares `min-height: 46px`, clearing the 44px floor `design.md` §4.10 requires.

---

## Finding 5 — placeholder content shipping as product

Not visual-token issues; they will be visible in any screen designed against these surfaces, so they are recorded rather than silently designed around.

| Surface | What is there |
|:---|:---|
| History | renders `Locale: ${locale}` as body copy — a debug line in the page's own content area, below the H1 |
| Test error | heading is a **hardcoded Korean string** — `이 테스트에 진입할 수 없습니다` — served for all 12 locales, with the raw `variant` id interpolated |
| Segment 404 / Global 404 | hardcoded English (`Segment Not Found`, `Global Not Found`), no `PageShell`, therefore **no GNB and no way back except one bare link** |
| GNB timer | `timerPlaceholder: "00:00"` is the entire test-context centre column |

The two 404s are the notable ones: they are the only routes that render outside `PageShell`, so they are also the only routes with no navigation, no consent banner and no theme-aware chrome beyond the body class.

---

## Finding 6 — the page ground is pre-rebaseline in three independent ways

`src/app/app-body-class.ts`, one string, applied to `<body>`:

```
[background:radial-gradient(circle at 20% -10%, rgb(31 181 143 / 12%), transparent 34%),
            radial-gradient(circle at 78% 0%,  rgb(52 119 255 / 14%), transparent 38%),
            var(--bg)]
min-h-screen text-[var(--ink)] leading-[1.5]
[font-family:'Avenir_Next','Noto_Sans_KR','Segoe_UI',sans-serif]
```

1. **Two coloured wash gradients** — a teal `rgb(31 181 143)` and a blue `rgb(52 119 255)` — neither of which is any VIVE hue. VIVE's ground is a flat warm off-white.
2. **`--bg` is `#f5f7f7`**, a *cool* off-white. VIVE's `--canvas` is `#fbfaf7`, warm. The README's first colour sentence is *"a warm off-white, never cool grey or pure white."*
3. **The typeface is Avenir Next**, with `Noto Sans KR` as the Korean fallback. Pretendard — the typeface the whole system rests on, chosen precisely so Korean and Latin share metrics — is not loaded on any product surface. **Every Korean character the product has ever rendered was rendered in Noto Sans KR.**

Point 3 outranks the other two. The bilingual typography claim in `design.md` §4.3 and the README is, at this moment, unrealized everywhere.

---

## What this hands to U4

| # | Item | Blocks |
|:---:|:---|:---|
| 1 | No dark token mapping exists (**D-10**) | step 4 entirely |
| 2 | `--surface` collides with a translucent runtime value | step 4's GNB |
| 3 | Navigation contract conflicts resolved (**D-11**) — trigger + layer stay, drawer stays | U4a |
| 4 | No VIVE panel/overlay pattern exists for the shared surface language | U4b, U4c |
| 5 | Radius 18 and 14 are off-ramp | U4b, U4c |
| 6 | Pretendard is not loaded on any product surface | step 4 |
| 7 | Placeholder copy on history, test error, both 404s | U4c |

Items 1 and 3 are answered inside step 3. Items 2, 5 and 6 are carried into the theme cut. Item 7 is content, not design, and is recorded for the owner of those strings.
