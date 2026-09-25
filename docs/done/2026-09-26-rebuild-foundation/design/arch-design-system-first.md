# ViveTest rebuild — target architecture, design-system-first

Proposal, 2026-09-26. Angle: the shell + stage component system is the backbone; everything else (routes, domain, platform) is arranged so that the design system stays one source, renders the same in the product and in Claude Design, and never needs a copy or a parity guard. Inputs are only the prototype (`MOCK/` = `/private/tmp/claude-501/-Users-woohyeon-Local-ViveTest/7b610dca-70f4-41bf-b48e-fe44caf07c81/scratchpad/mockups/`, read through `understand/prototype.md` and the files themselves) and the legacy requirements (`understand/contracts.md` §4). No legacy code, guard, ledger or defensive pattern is ported; stack traps from `understand/governance.md` §2 are used only to pick structures that make the trap impossible. Framework behaviour relied on here was checked with context7 (§17).

## 0. The decisions on one screen

1. **One styling mechanism: plain CSS files with native cascade layers**, no Tailwind, no CSS Modules, no CSS-in-JS. The prototype's shell is already plain CSS driven by custom properties and data-attributes, and the Claude Design pane renders only static HTML/CSS, so the file the app loads can be the file Claude Design shows.
2. **One token file, `src/ui/tokens.css`,** imported by the runtime and copied byte-for-byte into the Claude Design bundle. The spec names tokens and never restates values. Nothing mirrors it, so nothing guards a mirror.
3. **Per-test colour is data, not tokens.** Each test carries a `look` (signature palette + optional curated answer colours) in content. One pure function, `paletteScope()`, turns it into `--t-*` custom properties on the element that scopes a test. Contrast invariants are math over that data and fail the build.
4. **Components are pure views.** `src/ui/**` imports only React and itself, receives every string and state as props, lays itself out completely in CSS, and lets JS write only custom properties and attributes. That is what lets a Node script render every component to static HTML with `renderToStaticMarkup`.
5. **The gallery is the specimen source.** Each component has a co-located `*.specimen.tsx`; `npm run design:bundle` renders them into static HTML that links the byte-copied CSS, and the same HTML is what Playwright measures (contrast, axe, a few pixel baselines in CI). Claude Design gets a new project, "VIVE Design System v3", fed only from that bundle.
6. **A stage contract every stage implements**: declarative props in (test, look, run view, presentation, motion), intents out (answer, move, prev, submit, exit), two pure functions (`railColor`, `chromeTone`) and a three-method handle (focus, share origin, end art). The controller, not the stage, owns the 150 ms lock, the arrival guard, the advance-one rule and share blocking.
7. **The window is a parallel + intercepting route** (`[locale]/(deck)/@window/(.)test/[variant]`) opened at card tap; the landing stays mounted as `children`, a hard load of `/test/{variant}` renders the full page, and every window animation is a *reaction* to route state, so system back, the wordmark and forward all run through one path.
8. **Overlays are one primitive on native `<dialog>`** (top layer, no portals, no history entries), so palette custom properties are always inherited and the portal and history traps of the old build cannot occur.
9. **Motion has two registers** (paper, stage) and one reduced-motion source (`data-motion` on `<html>`); reduced motion resolves the stage to D once per attempt and turns every other movement into ≤ 180 ms fades, with CSS reduced rules living in a top cascade layer next to each component.

## 1. Scope

This document fixes module boundaries, dependency rules, interfaces, the design-system pipeline and the order of work. It does not decide the seven owner items from `critique.md` §5 (O1 desktop, O2 sharing infra, O3 content source, O4 undrawn surfaces, O5 residual conflicts, O6 legal identity, O7 visibility/licence); where the architecture depends on one, it names the seam that absorbs either answer. Final values of J materials, `TEST_COLORS`/`LOOK` and shell metrics are taken from the prototype capture after V4 publishes (`critique.md` §1, §7.1); this document fixes where they live, not what they are.

## 2. The spine

```text
                 ┌──────────────────────────── src/app ────────────────────────────┐
                 │ thin routes: params → content → one experience screen            │
                 └───────────────┬──────────────────────────────────────────────────┘
                                 │
                 ┌───────────── src/experience ─────────────┐     src/platform (storage, telemetry transport,
                 │ screens + controllers: landing, window,   │────▶ consent store, site/locale, routes)
                 │ test (controller, chrome, instruction),   │
                 │ share, vote, consent, result, …           │────▶ src/domain (pure rules: run, scoring,
                 └──────┬───────────────────────┬────────────┘       entry, consent matrix, telemetry schema)
                        │                       │
             ┌──── src/stages ────┐             │                     src/content (typed, validated test data
             │ contract + I/J/D    │             │                     incl. `look` and `stage`)
             │ View + Engine each  │             │
             └────────┬───────────┘             │
                      ▼                         ▼
             ┌─────────────────────── src/ui (the design system) ───────────────────────┐
             │ tokens.css · base.css · index.css (layer order) · palette/ · motion/ ·     │
             │ shell/ answer/ overlay/ instruction/ share/ deck/ window/ landing/ paper/  │
             │ every component = view.tsx + view.css + view.specimen.tsx                  │
             └───────────────────────────────────────────────────────────────────────────┘
                      │ byte copy of every .css + rendered specimens
                      ▼
             .design-bundle/ ──DesignSync──▶ Claude Design "VIVE Design System v3"
```

Arrows are the only allowed import directions (§11.3). The design system sits at the bottom so that it can be rendered without Next, without i18n and without a router.

## 3. Styling mechanism

### 3.1 Decision

Plain `.css` files, one per component block, every rule inside a named cascade layer, one ordered entry `src/ui/index.css` imported once by the root layout and by the two self-rendered documents (`global-not-found.tsx`, `global-error.tsx`). Class names are `vt-<block>` and `vt-<block>__<element>`; states and variants are attributes (`data-state`, `data-variant`, `data-tone`, `data-axis`, `aria-pressed`, `aria-current`); per-instance values are custom properties set in `style`. CSS files live only under `src/ui/**` and `src/stages/<stage>/`.

```css
/* src/ui/index.css — the only CSS entry. Order of layers is declared once, here. */
@layer reset, tokens, base, components, stages, preferences;

@import "./tokens.css";
@import "./base.css";
@import "./shell/top-bar.css";
@import "./shell/rail.css";
@import "./shell/bottom-bar.css";
@import "./answer/answer.css";
/* … every ui block … */
@import "../stages/split/split.css";
@import "../stages/forks/forks.css";
@import "../stages/story/story.css";
```

Each imported file wraps its own rules in its layer (`@layer components { … }`), so precedence does not depend on the bundler honouring `@import … layer()`. A component's reduced-motion and forced-colours rules sit in the same file under `@layer preferences { :root[data-motion="reduced"] .vt-rail__pct { transition: none } }`: the rule lives next to the component yet always outranks it, whatever its specificity. `!important` is banned (stylelint), so layers are the only precedence tool.

### 3.2 Why, and what was rejected

| Criterion | Plain CSS + layers (chosen) | Tailwind v4 | CSS Modules |
|:---|:---|:---|:---|
| Claude Design pane (static HTML/CSS) | Specimen links the same file the app loads; byte-for-byte | Pane needs compiled output, which contains only the classes the scanner found; specimen markup must repeat utility lists by hand → the v2 drift again | Class names are hashed at build; a static specimen cannot reference `.root` of ten modules without collisions |
| Fit with the prototype | Shell is `.vt-*` classes, `data-tone`, `data-axis`, `--c` custom props (`shell.css`) — same idiom | Attribute-driven visual state (tone over arbitrary colours, rail axis, free-moving 이전) becomes long arbitrary-variant class strings | Works, but every attribute state still needs a module selector |
| Precedence | Declared once by layer order | Utilities live in layers; unlayered rules beat all utilities; same-property arbitrary values resolve by emit order (governance L10, L26) | Import order decides; Next merges chunks by import order |
| Build traps | None added | Candidate scanning of comments/markdown can emit invalid CSS that kills `next dev` only (L25) | None |
| Cost | Global namespace discipline | — | — |

The namespace cost is paid structurally: one block per file, a `vt-` prefix enforced by stylelint `selector-class-pattern`, and `color-no-hex` plus a `function-disallowed-list` of colour functions for every file except `tokens.css`, so a literal colour outside the token file cannot land. That is configuration, not a bespoke guard.

The single-entry import follows Next's own recommendation: CSS order is decided by import order and chunks are merged, so imports should be contained in one entry at the root (§17 F9). Components never import CSS. The whole stylesheet ships on every route; the prototype's `shell.css` and `share.css` together are ~20 KB raw before minification, and with the landing and stage styles the target is a ≤ 15 KB-gzip budget that CI reports on every build.

## 4. The token system

### 4.1 One file, three kinds of role

`src/ui/tokens.css` holds every design value that CSS consumes and nothing else. It is seeded from the final prototype: paper roles from `shared/tokens.css` (itself v2's unchanged warm ramp), shell and world values from `shared/shell.css`, motion from `shell.css` and `l3-deck.html`.

```css
/* src/ui/tokens.css */
@layer tokens {
  :root {
    color-scheme: light;

    /* primitives — fixed across themes */
    --warm-0: #ffffff; /* … */ --warm-975: #0c0a09;
    --sage-500: #5c8e78; /* … */

    /* paper roles — follow the theme */
    --paper: #fbfaf7;            --paper-raised: #ffffff;
    --paper-soft: #f4f1ea;       --paper-muted: #ece8df;
    --ink: #1e1a16;              --ink-body: #504a43;      --ink-muted: #756d66;  /* the only caption ink */
    --line: #e6e2d8;             --line-strong: #d6d1c4;
    --accent: var(--sage-500);   --accent-ink: #396050;    --focus: var(--sage-500);
    --shadow-paper-1: 0 1px 2px rgb(30 26 22 / .04); /* … -2, -3, -overlay */

    /* world roles — theme-independent (posters, stages, the vote page) */
    --world-ground: var(--warm-975);
    --glass-dark: rgb(14 12 11 / .34);       --glass-dark-strong: rgb(14 12 11 / .56);
    --glass-light: rgb(255 255 255 / .5);    --glass-filter: blur(12px) saturate(1.3);
    --scrim-modal: rgb(8 6 5 / .58);         --scrim-modal-filter: blur(6px) saturate(.9);
    --shadow-poster: 0 34px 64px -26px rgb(0 0 0 / .6), 0 12px 26px -14px rgb(0 0 0 / .4);
    --shadow-answer: 0 12px 24px -14px rgb(0 0 0 / .5);
    --shadow-modal: 0 30px 80px rgb(0 0 0 / .45);
    --grain: url("./assets/grain.png");      --grain-size: 128px;

    /* type — role tokens (font shorthand); weights 400/500/600/700/800 only */
    --font-sans: "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo",
      "Noto Sans KR", "Noto Sans JP", "Noto Sans SC", "Noto Sans TC", "Noto Sans Devanagari", system-ui, sans-serif;
    --type-display: 800 clamp(30px, 8vw, 50px)/1.05 var(--font-sans);    /* card title (render check) */
    --type-question: 800 clamp(22px, 6.2vw, 26px)/1.3 var(--font-sans);
    --type-answer-split: 800 clamp(24px, 6.7vw, 28px)/1.26 var(--font-sans);
    --type-answer: 700 16px/1.38 var(--font-sans);                        /* prototype 650 → 700, see §4.4 */
    --type-label: 700 17px/1.38 var(--font-sans);                          /* question label on glass */
    --type-title: 800 23px/1.25 var(--font-sans);    --type-body: 400 15.5px/1.6 var(--font-sans);
    --type-cta: 800 17px/1.2 var(--font-sans);       --type-chrome: 700 14px/1.2 var(--font-sans);
    --type-caption: 600 13px/1.3 var(--font-sans);   --type-micro: 700 11px/1.2 var(--font-sans);
    --track-display: -0.03em; --track-tight: -0.02em; --track-snug: -0.01em;

    /* shape */
    --radius-chip: 12px; --radius-control: 14px; --radius-cta: 16px; --radius-answer: 18px;
    --radius-sheet: 24px; --radius-card: 28px; --radius-pill: 999px;
    --space-1: 4px; /* … */ --space-8: 32px;
    --tap: 44px;

    /* layout */
    --app-max: 430px; --app-w: min(100vw, var(--app-max)); --app-left: calc((100vw - var(--app-w)) / 2);
    --gutter: 16px; --shell-top: 56px; --shell-top-story: 64px; --shell-bottom: 72px;
    --rail-w: 12px; --rail-inset: 16px; --rail-lane: 44px; --window-side: 12px; --window-vertical: 6%;
    --z-gnb: 20; --z-catcher: 30; --z-window: 40; --z-chrome: 10;

    /* motion — paper register */
    --motion-paper-fast: 140ms; --motion-paper-base: 180ms; --motion-paper-slow: 280ms;
    --ease-paper: cubic-bezier(0.2, 0, 0, 1);
    /* motion — stage register */
    --motion-stage-enter: 560ms; --motion-stage-exit: 260ms; --motion-stage-flood: 700ms;
    --ease-stage-out: cubic-bezier(0.2, 0.9, 0.25, 1); --ease-stage-in: cubic-bezier(0.4, 0, 1, 1);
    --ease-flood: cubic-bezier(0.66, 0, 0.2, 1); --ease-overshoot: cubic-bezier(0.2, 1.32, 0.32, 1);
    /* motion — window choreography */
    --motion-window-open: 580ms; --motion-window-close: 440ms; --motion-window-grow: 520ms; --motion-window-shrink: 560ms;
    --ease-window-open: cubic-bezier(0.22, 1, 0.36, 1); --ease-window-close: cubic-bezier(0.5, 0, 0.2, 1);
    /* motion — reduced */
    --motion-fade: 160ms;
  }

  :root[data-theme="dark"] {
    color-scheme: dark;
    --paper: #141110; --paper-raised: #1e1a16; /* … every paper role, once … */
  }
}
```

### 4.2 Themes

The theme bootstrap (an inline script in the root layout's `<head>`) always writes a concrete `data-theme="light" | "dark"` before first paint, resolving "System" from `matchMedia` and following its `change` event. CSS therefore needs exactly one dark block, keyed by the attribute. Worlds (posters, stages, the vote page) are theme-independent by design (`prototype.md` §3.10) and never read paper roles; paper surfaces inside a world (instruction modal, share sheet, list) follow the theme because they read paper roles.

Rejected: `light-dark()` inside tokens. It would remove even the dark block, but an unsupporting engine treats the substituted value as invalid at computed-value time, which drops backgrounds and colours rather than falling back to light. The friend vote page must open inside KakaoTalk and Instagram in-app browsers, whose iOS WebView is the OS engine, and `light-dark()` needs Safari 17.5. The attribute block costs one selector and has no support floor. Also rejected: v2's two dark blocks (media query + attribute) — the bootstrap makes the media-query copy unnecessary; Claude Design specimens set `data-theme` explicitly because each theme is its own card.

`meta[name=theme-color]` is written by the same bootstrap after `DOMContentLoaded` from `getComputedStyle(document.documentElement).getPropertyValue('--paper')`, so no TS file carries a paper colour literal. Icons and the static OG card are brand assets with their own source (`src/app/brand.ts`); they are not UI tokens and do not follow UI paper changes.

### 4.3 What is deliberately not a token

| Value | Home | Why |
|:---|:---|:---|
| Per-test palette, answer colours | content `look` → `paletteScope()` (§5) | varies per test; JS needs it (canvas, WebGL, 9:16 card) |
| On-world inks (white, `#1e1a16`) | `src/ui/palette/world.ts` → emitted by `paletteScope()` | the contrast math and the CSS must use the same two values; every world surface sits inside a palette scope, so CSS reads them as `--t-on-*` and no second copy exists. Paper `--ink` shares a hex with the dark on-world ink by coincidence of role, not by reference |
| Luminance caps (type-bearing blobs ≤ 0.13, window ≤ 0.15, glow ≤ 0.34) | `src/ui/palette/invariants.ts` | only the palette math and the WebGL shader use them |
| Spring physics (stiffness, damping) | `src/ui/motion/springs.ts` | JS-only; CSS never animates a spring |
| Answer lock 150 ms, arrival guard 350 ms, deck settle 350 ms, stage-ready timeout | `src/domain/test/timing.ts` / `src/experience/landing/deck-timing.ts` | behaviour contracts, not visuals |

JS that needs a CSS duration (WAAPI choreography) reads it through `motion/durations.ts`, which reads the custom property once per document and caches it; there is no TS copy of a CSS duration.

### 4.4 Type decisions the prototype leaves open

Weights are 400/500/600/700/800. The prototype's 650 is normalised to **700**: Pretendard was never loaded (`prototype.md` §3.6), so on Apple devices the owner saw Apple SD Gothic Neo, where CSS font matching resolves 650 upward to Bold (700). Display line-heights of 1 and 1.05 conflict with v2's measured Pretendard clipping; the foundation step renders the type specimens in WebKit and Chromium at 360/390/430 in both themes before the type tokens are frozen (critique G6), and adjusts only the tokens that clip. Fractional sizes stay only where the prototype used them for a reason (15.5 body in the modal); everything else snaps to the listed roles.

## 5. Per-test palettes as data

### 5.1 Schema

```ts
// src/ui/palette/types.ts
export type Hex = `#${string}`;
export type Tone = 'dark' | 'light';          // dark = white type on the colour, light = ink type

export interface TestPalette {
  base: Hex;                                  // signature: poster ground, modal head, 시작, share card
  hi: Hex;                                    // highlight: category dot, glow family
  c1: Hex; c2: Hex; glow: Hex; deep: Hex;     // cover mesh blobs
  tint: Hex;                                  // light companion (share card, D ground mix)
  field: { light: readonly [Hex, Hex, Hex, Hex]; dark: readonly [Hex, Hex, Hex, Hex] }; // landing field
}

export interface TestLook {
  palette: TestPalette;
  /** curated answer colours per scoring position (I stage); index-aligned with scoring order, 2–4 per row */
  answers?: readonly (readonly Hex[])[];
  derived: boolean;                           // true when palette came from deriveLook(base, hi)
}
```

Content supplies either a full palette or only `{ base, hi }`; `deriveLook(base, hi)` fills the rest by the prototype's documented rule (`shell.js` `look()`), and the content build prints which tests are derived. Curated answer colours are optional; `answerColors(look, position, count)` returns the curated row or the derived set (golden-angle hue turns, alternating deep/light — `i3-split.html` `genSet`). Stage-specific derivations stay in the stage (`stages/story/colors.ts` for D's OKLCH steps, `stages/forks/colors.ts` for J's land bands).

### 5.2 Emission: one function, one naming scheme

```ts
// src/ui/palette/scope.ts
export interface PaletteScope {
  style: Record<`--t-${string}`, string>;   // --t-base … --t-tint, --t-on-base, --t-on-tint, --t-on-dark, --t-on-light
  'data-tone': Tone;                          // tone of the base colour, drives chrome glass/ink
}
export function paletteScope(palette: TestPalette): PaletteScope;
export function answerScope(color: Hex): { style: { '--a': string; '--a-on': string }; 'data-tone': Tone };
export function coverStyle(palette: TestPalette, frame: CoverFrame): { '--cover': string }; // four radial blobs
```

Every world surface — deck card, window, test scope, vote page, share card preview, specimen — spreads `paletteScope()` on its root. CSS reads `var(--t-base)`, `var(--t-on-base)`; it never computes a text colour. Because overlays are native dialogs in the same DOM subtree (§6.4), the palette reaches the instruction modal and the share sheet by inheritance with no portal workaround. `coverStyle()` is the one definition of the poster mesh; the landing card, the window surface and header band, J's sky and the specimens all use it, and the WebGL field falls back to it.

### 5.3 Contrast invariants

Pure unit tests over every test in content plus a sweep of synthetic `{base, hi}` pairs through `deriveLook`. They run in `npm test` and again in the content build, which refuses a look that fails, printing the nearest legible value — a curated colour is never nudged silently (a fallback indistinguishable from the real value hides absence).

| ID | Invariant | Source of the number |
|:---|:---|:---|
| PAL-1 | Text on `base` (the tone-chosen ink) ≥ 4.5:1 | prototype contrast rule (`prototype.md` §3.9) |
| PAL-2 | Blobs that sit under type (`base`, `c1`, `c2`, `deep`) relative luminance ≤ 0.13 (white ≥ 5.8:1); `glow` ≤ 0.34 and only in the non-type corner | `l3-deck.html` luminance caps |
| PAL-3 | Every answer colour: tone-chosen ink ≥ 4.5:1 | I stage `legible()` rule |
| PAL-4 | Adjacent answer colours in a 3–4 answer row ≥ 3:1 against each other | I `genSet` rule |
| PAL-5 | Landing h1 over each `field` colour (tone ink) ≥ 4.5:1, both themes | round-2 measurement (`prototype.md` §3.9) |
| PAL-6 | D card colours: white ≥ 4.5:1 for every step up to 12 questions | D derivation |
| PAL-7 | J road vs ground ≥ 3:1 (non-text UI) | J world rule |

Rendered contrast (glass labels over bands, chips over fields, the modal) is measured on the specimens in Playwright (§10.4), because glass and blur cannot be proven by colour math.

## 6. The component system (`src/ui`)

### 6.1 Rules every component obeys

1. **Pure view.** A component is a function of its props. No `next/*`, no `next-intl`, no router, no storage, no domain import; ESLint `no-restricted-imports` enforces it for `src/ui/**`. Strings arrive translated.
2. **Layout-complete in CSS.** Positions derive from custom properties, not measurements. The rail is a flex column of segments; the percentage pill sits at `calc((1 - var(--fill)) * 100%)`; I's seam is `--split`. JS writes `--fill`, `--split`, a transform, or an attribute — never layout. This is what makes a static specimen faithful, and it removes the prototype's `ResizeObserver` layout pass.
3. **Three files per block**: `rail.tsx`, `rail.css`, `rail.specimen.tsx`. A block's behaviour, if any, lives in the experience or stage module that uses it (`use-*.ts`), never in `ui/`.
4. **Attributes for state**: `data-state="selected|revisit|locked"`, `aria-pressed`, `aria-current="step"`, `data-tone`, `data-axis`, `data-variant`. The same attribute is what the specimen sets.
5. **No text inside `ui/`.** Even `예시`, `이전`, `제출` come from messages; the `ui` layer has zero Korean.
6. **White or filled surface = answer; a question is never on white.** Enforced by vocabulary: `Question` and `QuestionLabel` expose no `surface` prop that could make them white; only `AnswerPill`/`AnswerBand`/`Sign` have filled surfaces.

### 6.2 Inventory (derived from `prototype.md` §2.9–§2.11, §3.2, `design-system.md` §3.7)

| Block | Components | Replaces in prototype |
|:---|:---|:---|
| `shell/` | `TopBar` (wordmark chip, centred title, ask-a-friend icon), `Rail` (`axis: 'y' \| 'x'`, segments, current, percent), `BottomBar` (이전, 제출; `prevPlacement: 'centre' \| 'follow'`) | `.vt-top`, `.vt-rail*`, `.vt-bottom`, `.vt-prev`, `.vt-submit` |
| `answer/` | `Badge` (A–D), `PrevMark` (check + sr text), `Question` (emoji + text), `QuestionLabel` (glass), `AnswerPill` (D, landing fallback), `VotesLine` | `.vt-badge`, `.vt-prev-mark`, `.vt-q`, `.vt-qlabel`, `.vt-votes`, `.ans` |
| `overlay/` | `Dialog` (native `<dialog>`, `placement: 'center' \| 'bottom'`), `Toast` and `Coach` (popover, top layer) | `.vt-scrim`, `.vt-modal`, share-sheet frame, `P.toast` |
| `instruction/` | `InstructionCard` (head in test colour, eyebrow, body, landing-answer row, consent note, CTA stack, qualifier step) | `.vt-sheet`, `.vt-mhead`, `.vt-ctx`, `.vt-consent`, `.vt-start`, `.vt-second`, `.vt-qual*` |
| `share/` | `ShareBody` (link-first block, link card, story section, footer), `StoryCardFrame` (9:16 preview), `ShareDone` | `share.css` |
| `deck/` | `PosterCard` (category line, kinetic title, subtitle, meta, motif slot, quiet CTA), `SoonCard`, `EndCard`, `DeckControls`, `PositionReadout`, `Cover` | `l3-deck.html` card styles |
| `window/` | `WindowFrame` (surface, header band, fallback Q1 slot, catcher) | `#win`, `.wband`, `#wfall` |
| `landing/` | `Gnb` (over-field and solid), `ListSheet`, `ListRow` (test, soon, blog), `FieldFallback` | `.gnb`, `.all`, list rows |
| `paper/` | `Button`, `PageHead`, `Notice`, `Banner` (consent), `EmptyState`, `Chip`, `LinkRow` | surfaces the prototype never drew (O4) |
| `vote/` | `VoteChoices`, `VoteResults` (largest-remainder bars) | `v-vote.html` |
| `palette/`, `motion/` | pure TS (§5, §9) | `Shell.look`, `toneFor`, `legible`, `Proto.reduced` |

### 6.3 A component, concretely

```tsx
// src/ui/shell/rail.tsx
export interface RailProps {
  axis: 'y' | 'x';                         // I and J: 'y' (right edge); D: 'x' (top edge)
  segments: readonly (Hex | null)[];       // answered colour per scoring position, null = unanswered
  current: number;                         // ringed segment
  percent: number;                         // 0–100; also aria-valuenow
  label: string;                           // "진행률" (translated)
  tone: Tone;
}
export function Rail({ axis, segments, current, percent, label, tone }: RailProps) {
  return (
    <div className="vt-rail" data-axis={axis} data-tone={tone} role="progressbar"
      aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}
      aria-valuetext={`${label} ${percent}%`} style={{ '--fill': percent / 100 } as CSSProperties}>
      {segments.map((c, i) => (
        <i key={i} className="vt-rail__seg" aria-hidden data-current={i === current || undefined}
          hidden={c === null} style={c ? ({ '--seg': c } as CSSProperties) : undefined} />
      ))}
      <span className="vt-rail__pct" aria-hidden>{percent}%</span>
    </div>
  );
}
```

```tsx
// src/ui/shell/rail.specimen.tsx
export default defineSpecimen({
  id: 'shell/rail', group: 'Shell', title: 'Palette rail', subtitle: 'y and x at 13 / 50 / 100%',
  viewport: { w: 390, h: 520 }, themes: ['dark'],
  render: () => <RailSheet fixtures={railFixtures} />,   // gallery/fixtures only; never imported by the app
});
```

### 6.4 The overlay primitive

`Dialog` wraps a native `<dialog>` opened with `showModal()`: it enters the top layer (no z-index, no clipping by the window's `clip-path`), the rest of the document becomes inert, and CSS inheritance still follows the DOM tree, so `--t-*` reach it. The dialog itself is a transparent full-viewport box containing its own scrim element and card (the prototype's structure), so `::backdrop` inheritance never matters. Rules:

- The component stays mounted and is driven by an `open` prop that calls `showModal()`/`close()`; it never returns `null` conditionally (a remount would replay side effects — governance L39).
- It owns no history entry. System back while the test is open means "leave the test" (§8.4); a close request that the page did not prevent is reported as `onDismiss(reason)`, and the instruction controller treats an un-committed dismissal as exit to the card, never as consent or start.
- Esc on the instruction step is swallowed at `keydown` (`preventDefault`) so that no close request starts, and the `cancel` event is also prevented; an E2E asserts that two Esc presses leave the dialog open in WebKit and Chromium (§18). The qualifier step maps Esc to Back. Tab and Shift+Tab cycle inside on every press (WebKit's plain Tab skips buttons). Focus lands on the dialog container so one Enter is never consent.
- Placement `center` is the instruction modal (owner round 3); `bottom` is the share sheet (still a sheet in the final prototype). Neither has a grabber or drag-to-close.

## 7. The stage contract

### 7.1 Interfaces

```ts
// src/stages/contract.ts
import type { Hex, Tone, TestLook } from '@/ui/palette/types';
export type AnswerKey = 'A' | 'B' | 'C' | 'D';
export type StageKind = 'I' | 'J' | 'D';
export type MotionMode = 'full' | 'reduced';
export interface Insets { top: number; right: number; bottom: number; left: number }

export type Presentation =
  | { kind: 'window'; insets: Insets; open: boolean }  // Q1 inside the expanded card; open=false while the window is still animating
  | { kind: 'full' };                                  // chrome visible; the stage owns the screen

export interface StageQuestion {
  position: number;                                    // 0-based scoring order (0 = the landing preview)
  text: string; emoji?: string;
  answers: readonly { key: AnswerKey; text: string }[]; // 2–4, from content
}

export interface StageRunView {                        // read-only projection of the domain run
  current: number;
  chosen: ReadonlyMap<number, AnswerKey>;              // retained answers
  revisit: boolean;                                    // current is answered and was returned to → both unselected + PrevMark
  frontier: number;                                    // highest reachable position (answered + first unanswered)
  isLast: boolean;
  phase: 'answering' | 'submitting';
}

export interface StageProps {
  test: { id: string; title: string; questions: readonly StageQuestion[] };
  look: TestLook;
  run: StageRunView;
  presentation: Presentation;
  motion: MotionMode;
  votes: VoteTally | null;                             // current question; null when sharing is off (O2)
  labels: StageLabels;                                 // translated: prevMark, answerPrefix, hints, gate label …
  prev: PrevPort;                                      // J only: move 이전 without a React render
  onIntent(intent: StageIntent): void;
  onReady(): void;                                     // Q1 drawn → the window may reveal the stage
  onSettled(position: number): void;                   // arrival animation finished → controller arms input after the guard
}

export type StageIntent =
  | { type: 'answer'; position: number; key: AnswerKey; origin?: { x: number; y: number } }
  | { type: 'move'; to: number }                       // D swipe/edge tap, J tap on a trailing position
  | { type: 'prev' }
  | { type: 'submit' }                                 // J's spatial gate; I and D use the shell 제출
  | { type: 'exit' };                                  // wordmark inside the stage world (J has none; shell handles it)

export interface PrevPort { place(x: number | null): void }   // writes a transform on the shell's 이전; null = centre

export interface StageHandle {
  focusQuestion(): void;                               // after the dialog/sheet closes, after every move (D)
  shareOrigin(): DOMRect | null;                       // question block, for the question → share-card morph
  drawArt?(ctx: CanvasRenderingContext2D, box: { w: number; h: number }): void; // I palette, J path (end-of-test share)
}

export interface StageMeta {
  kind: StageKind;
  maxAnswers: 2 | 4;                                   // J: 2
  progress: 'y' | 'x';                                 // D: 'x'
  submit: 'shell' | 'stage';                           // J: 'stage' (the gate)
  prev: 'centre' | 'follow';                           // J: 'follow' (road centre)
}

export interface StageModule {
  meta: StageMeta;
  Stage: React.ForwardRefExoticComponent<StageProps & React.RefAttributes<StageHandle>>;
  /** pure: rail colour of an answered position (I = chosen band, J = trail colour, D = card colour) */
  railColor(look: TestLook, position: number, key: AnswerKey, count: number): Hex;
  /** pure: chrome tone over what the stage paints at this position */
  chromeTone(look: TestLook, position: number): { top: Tone; bottom: Tone };
}
```

The prototype's window protocol maps one-to-one and disappears as a protocol: `vive:ready` → `onReady`; `vive:window` → `presentation.insets`; `vive:open` → `presentation.open`; `vive:collapse` → unmount; `vive:q1` → `answer` intent at position 0 in window presentation; `vive:full` → `presentation.kind = 'full'`; `vive:back` → `exit`; `vive:escape` → handled by the window host's key handler.

### 7.2 Who owns what

| Concern | Owner | Why here |
|:---|:---|:---|
| Answer retention, advance-one after a revisit, frontier, eligibility | `domain/test/run.ts` (pure reducer) | one rule for three stages; unit-tested once |
| 150 ms lock (selected state), 350 ms arrival guard after `onSettled`, held-key repeats, blocking while a dialog or the share sheet is open | `experience/test/input-gate.ts`, called by the controller before any intent reaches the reducer | stages cannot forget it; J's measured 19/19 input patterns become one gate for all stages |
| Rail segments, percent, submit state, 이전 visibility | controller, from the run view + `railColor` | restorable on resume from stored answers alone |
| Chrome tone | `chromeTone()` (pure) | no imperative `setTone` |
| 이전 position in J | `PrevPort.place(x)` per frame | 60 fps without React renders; the shell owns the enlarged hit zone that covers the spot it just left |
| Gesture recognition, canvas, forward/back motion, arrival animation | the stage's engine hook | stage identity |
| Stage choice | `stages/registry.ts` `resolveStage()` | §9.3 |

The arrival guard applies to every stage (answering the author's open question in `j3-forks.html` realBuild) because the defect it prevents — a second tap landing on the next question — is stage-independent; its 350 ms is measured from the stage's own `onSettled`, so a fast D slide does not wait for J's sign animation. First E2E runs record the feel on I and D; a change of the value is one constant.

### 7.3 Stage anatomy: View + Engine

Each stage splits into a **View** (pure DOM/CSS: bands, labels, signs, story cards, gate button — renderable by the specimen harness) and an **Engine** hook (pointer gestures, canvas, WAAPI, physics). The canvas layer is drawn behind the View; its sky or ground is `Cover`, so a specimen renders the View over the CSS cover with no canvas. Specimens therefore show real stage structure, colour and type; motion is judged in the product.

```text
src/stages/
├── contract.ts · registry.ts
├── split/  (I)   view.tsx · engine.ts (seam drag, tap push, flood) · colors.ts · split.css · split.specimen.tsx
├── forks/  (J)   view.tsx (signs, gate, labels) · engine.ts · world.ts (canvas projection, ~4–7 KB) · camera.ts · colors.ts · forks.css · forks.specimen.tsx
└── story/  (D)   view.tsx (cards, peeks, lock card, pills) · engine.ts (pointer track, edge zones) · colors.ts · story.css · story.specimen.tsx
```

`registry.ts` exposes `loadStage(kind): Promise<StageModule>` (dynamic `import()`, one chunk per stage) and `preloadStage(kind)`, called when the deck settles on a card.

### 7.4 The controller and the chrome

```tsx
// src/experience/test/TestScreen.tsx (shape)
export function TestScreen({ test, entry }: { test: TestView; entry: EntryContext }) {
  const win = useWindowPresentation();                  // from WindowHost; static { kind: 'full' } on a hard load
  const motion = useMotionMode();
  const stage = useStageModule(resolveStage(test, motion.atAttemptStart));
  const ctl = useTestRun(test, entry, stage.meta);      // domain reducer + storage + telemetry + input gate
  return (
    <div className="vt-test" data-stage={stage.meta.kind} {...paletteScope(test.look.palette)}>
      <stage.Stage ref={ctl.stageRef} {...ctl.stageProps(win, motion.mode)} />
      <StageChrome hidden={win.kind === 'window'} meta={stage.meta} {...ctl.chrome} />
      <InstructionDialog open={ctl.instructionOpen} {...ctl.instruction} />
      <ShareSheet open={ctl.shareOpen} {...ctl.share} />
    </div>
  );
}
```

`StageChrome` composes `TopBar` + `Rail` + `BottomBar` from `ui/shell`; `InstructionDialog` composes `ui/overlay/Dialog` + `ui/instruction/InstructionCard` with `domain/consent/instruction-policy.ts`, which returns the note and CTA identities for (ingress, consent, attribute) including the `OPTED_OUT` rows the mockup did not model.

## 8. The window and the routes

### 8.1 Route layout

```text
src/app/[locale]/
├── layout.tsx                          ROOT layout: <html lang={displayTag(locale)} data-theme data-motion>, bootstrap, providers, ui/index.css
├── (deck)/
│   ├── layout.tsx                      <WindowHost slot={window}>{children}</WindowHost>
│   ├── page.tsx                        landing (deck, field, list)
│   └── @window/
│       ├── default.tsx                 returns null (Next 16 requires it for every slot)
│       └── (.)test/[variant]/page.tsx  <TestScreen> inside the window (soft navigation from the deck)
└── test/[variant]/page.tsx             <TestScreen> full screen (hard load, deep link, refresh)
```

Parallel slot `@window` and interception `(.)test` are resolved by route segments, not folders, and ignore `@slot` folders (§17 F1), so `(deck)/@window/(.)test/[variant]` intercepts `/{locale}/test/{variant}`. Because the slot is declared in the `(deck)` layout only, a navigation to a test from any other surface (blog, history, result, recovery cards) renders the full page instead of a window over the wrong screen. `[locale]/layout.tsx` is the root layout, so `<html lang>` comes straight from the validated param through `platform/site.ts` (`kr→ko`, `zs→zh-Hans`, `zt→zh-Hant`) with no proxy header; a root layout on a top-level dynamic segment is exactly the case `global-not-found.tsx` exists for (§17 F6), and both self-rendered documents import `ui/index.css` and the fonts themselves.

### 8.2 The host state machine

```ts
// src/experience/window/window-machine.ts (pure)
export type WindowState = 'rest' | 'opening' | 'open' | 'growing' | 'full' | 'closing' | 'shrinking';
export type WindowEvent =
  | { type: 'tap-card'; variant: string; cardRect: Rect }
  | { type: 'slot-mounted' }          // route committed; stage content present
  | { type: 'stage-ready' }           // onReady
  | { type: 'q1-answered' }
  | { type: 'slot-cleared' }          // route no longer matches the slot (back, wordmark → back, deny-and-abandon → back)
  | { type: 'animation-done' };
export function next(state: WindowState, e: WindowEvent): { state: WindowState; effect?: WindowEffect };
```

- **Open**: tap → `opening`: the host paints the window surface and header band from the card (`coverStyle`, "one title, two sizes" FLIP of the title) and calls `router.push(testHref, { scroll: false })`. A fallback Q1 built from the card's own preview data (`AnswerPill` ×2–4) shows only if the stage has not called `onReady` within the stage-ready timeout. Deck settle (350 ms) has already prefetched the route and preloaded the stage chunk.
- **Grow**: `answer` at position 0 in window presentation → controller records the landing ingress (staged entry + `card_answered`), host → `growing` (clip-path to full, 520 ms) while the stage keeps its forward motion; `full` → presentation `full`, chrome shows, the instruction dialog opens over Q2. No route change: the URL has been `/test/{variant}` since the tap.
- **Leave**: every exit — outside tap, 닫기, Escape, wordmark, [거부하고 중단], system back, Android back — becomes `router.back()` or the browser's own pop. The host observes the slot becoming `null` and plays `closing` (from `open`) or `shrinking` (from `full`: the stage shrinks into its card with content visible while the landing comes alive around it), keeping the last slot content rendered until `animation-done` (`use-presence.ts`, a render-time snapshot, not an effect). Animations react to route state; they never cause it, so there is one path for every exit and forward navigation re-opens the window from the same card.
- **Hard load** of `/test/{variant}` renders the full page with no host. Its wordmark does `router.push(landingHref)` and leaves a one-shot in-memory return hint (`return-hint.ts`) so the landing mounts centred on that card and contracts the test colour into it.
- **Submit** → `router.replace(resultHref)`; the `(deck)` layout unmounts. The post-submit transition is the owner's open item (`prototype.md` §1.6) and has a named seam: `run.phase = 'submitting'` lets a stage play a closing moment before the controller navigates.

### 8.3 Rejected window designs

| Alternative | Why not |
|:---|:---|
| Native `history.pushState` to `/test/{variant}` inside one client tree (Next supports it, §17 F5) | The router would keep rendering the landing under a test URL; any refresh-type navigation or server action would swap the tree mid-test, and test content would have to reach the client outside the RSC path. The intercepted route gets server-loaded content, prefetch and deep-link behaviour from the framework |
| Intercept at Q1 answer instead of at tap (the prototype author's history-timing note) | Q1 would be drawn by one component instance in the landing and continued by another in the slot; continuity of a running flood or camera move across a remount needs a hand-off store. Pushing at tap costs nothing: a refresh during Q1 lands on the full page as Direct Cold entry, which the domain already defines |
| React `<ViewTransition>` for open/grow/shrink | Canary/experimental only (§17 F11) and snapshot-based: the stage must keep moving while the window grows, and a snapshot freezes it |
| iframe (the prototype mechanism) | protocol by `postMessage`, two documents, duplicated styles; the prototype's own note says product stages are components |

### 8.4 History ownership, stated once

The test owns exactly one history entry (the soft navigation to `/test/{variant}`); overlays own none; Q1 and the grow add none. System back anywhere in the test leaves the test; the run is persisted, so leaving is resumable within the 30-minute active-run window. This replaces the old build's overlay history counters and discard paths (governance L43, L53, L59), which existed only because several layers each pushed entries.

## 9. Motion

### 9.1 Two registers

| Register | Surfaces | Durations / easing | Overshoot | Loops |
|:---|:---|:---|:---|:---|
| Paper | list sheet, instruction card content, share sheet, banners, blog, history, legal, result (until O4) | `--motion-paper-*` 140/180/280, `--ease-paper` | never | never |
| Stage | deck, field, window choreography, stages, vote page entrance | `--motion-stage-*` 260/560/700, `--motion-window-*`, `--ease-stage-*`, `--ease-flood` | only on (a) settle of a direct manipulation (deck release, I seam, J swipe spring-back) and (b) entrance of the kinetic title | only the field and J's traveller, and both settle within 5 s of the last interaction (WCAG 2.2.2 without a pause control, critique G14) |

Implementation: CSS transitions for state changes, WAAPI for choreography (`experience/window/choreography.ts`, stage engines), a small spring integrator in `ui/motion/springs.ts` for direct manipulation. No animation library. Every WAAPI run is cancelled on completion and its end state written as inline style, so no finished animation keeps overriding styles.

### 9.2 Reduced motion: one source

`data-motion="full" | "reduced"` on `<html>` is written before paint by the bootstrap from `prefers-reduced-motion` and updated live. CSS keys only off the attribute (never the media query); JS reads only `ui/motion/preference.ts`, which reads the same attribute. v1 follows the OS only; an in-site switch, if ever wanted, is one more input to the same module (C-13 resolved without a new control, per the owner's no-new-controls principle).

### 9.3 Reduced motion → D

```ts
// src/stages/registry.ts
export function resolveStage(test: { stage: StageKind }, motion: MotionMode): StageKind {
  return motion === 'reduced' ? 'D' : test.stage;
}
```

- The stage is resolved once per attempt, when the window opens (or the full page mounts), and kept for that attempt; a mid-test change of the setting switches only transitions (the D author's recommendation).
- Every stage implements `motion: 'reduced'` for its own transitions (opacity only, `--motion-fade`), because a mid-test switch can reach I or J; D is the only stage whose full design is the reduced one.
- `stage` is a required per-test content field. A test whose questions have more than two answers declaring `J` is a content validation error, not a silent J → I fallback: the owner assigns stages at launch, and a rejected build tells the author immediately. The placeholder map from `shell.js` (`qmbti·egtt → I`, `energy-check → J`) seeds content until then.
- Landing under reduced motion: no kinetic entrance, nudge, parallax or deck spring; the field renders one still frame; window open/close/grow/shrink are 160–180 ms fades.

## 10. Gallery, bundle and Claude Design

### 10.1 Specimens

```ts
// src/gallery/specimen.ts
export interface Specimen {
  id: string;                                  // 'shell/rail'
  group: 'Foundations' | 'Shell' | 'Answer' | 'Overlay' | 'Instruction' | 'Share' | 'Landing' | 'Window' | 'Stages' | 'Paper' | 'Vote';
  title: string; subtitle?: string;
  viewport: { w: number; h: number };          // phone viewports; 390×844 for full screens
  themes: readonly ('light' | 'dark')[];       // paper-reading specimens list both
  locales?: readonly ('kr' | 'en' | 'ja' | 'hi' | 'ru')[];  // long-text and script checks (Hindi graphemes, Cyrillic)
  render(ctx: { theme: 'light' | 'dark'; locale: string }): React.ReactElement;
}
export const defineSpecimen = (s: Specimen) => s;
```

Fixtures (`src/gallery/fixtures/`) hold everything that is not product data: the 3- and 4-answer example tests (`demo-three`, `demo-four`), vote tallies, long-string sets per locale. ESLint forbids any import of `src/gallery/**` or `*.specimen.tsx` from `src/app`, `src/experience`, `src/stages/*/engine.ts` and `src/domain` (critique G17: example data can never reach the product).

Groups mirror `design-system.md` §5.5: Foundations (paper colours ×2 themes, test palettes with field light/dark, answer colour sets 2/3/4 with contrast labels computed by `palette/contrast.ts`, tone chips, type paper/display tiers, radius, elevation paper vs poster, materials, motion registers as tables from tokens), Shell (top bar tones, rail y and x at 13/50/100 %, bottom bar states), Answer tokens, Instruction (plain, consent note ×2 attributes, qualifier step), Share (sheet, done, coach, 9:16 frame), Landing (poster card, soon, end card, GNB over field and solid, list rows), Window (surface + band + fallback Q1), Stages (I 2/3/4 answers, J fork at rest/lean/selected and gate, D card with peeks, lock card, end), Paper, Vote.

### 10.2 The bundle

`npm run design:bundle` (`scripts/design-bundle.ts`, run with `tsx`) produces `.design-bundle/` (git-ignored):

```text
.design-bundle/
├── src/ui/**.css, src/ui/assets/**          byte copies (paths preserved so @import resolves)
├── src/stages/*/**.css                      byte copies
├── fonts.css + fonts/PretendardVariable.woff2   bundle-only font face (the runtime serves subset slices)
├── specimens/<group>/<id>.<theme>[.<locale>].html   renderToStaticMarkup + <!-- @dsCard … --> marker line
├── README.md                                byte copy of docs/design/system.md
├── SKILL.md                                 byte copy of docs/design/SKILL.md
└── BUILD.json                               { commit, builtAt, files: [{ path, sha256 }] }
```

Each specimen HTML is a complete static document: `<html data-theme=… data-motion="full">`, `<link>` to `fonts.css` and `src/ui/index.css`, the rendered markup, no script. The same files are what the tests open (§10.4). The script verifies inside itself that every copied CSS hashes equal to its source; there is no separate parity test because there is no second authored copy.

### 10.3 Claude Design

New design-system project **"VIVE Design System v3"**, created with `DesignSync create_project`; `cd630eec` (v2) stays untouched as the record of the legacy system (`design-system.md` §5.5; the request already authorises the revision, critique X6). The project holds exactly the bundle, so `list_files` must equal `BUILD.json.files`. Push procedure (in `docs/design/SYNC.md`, repo-only): `list_files` → `finalize_plan` (writes = bundle globs, deletes = files no longer in `BUILD.json`) → `write_files` → verify `list_files` set equality and `get_file BUILD.json` commit = HEAD. SVG uploads are compared by drawing, not bytes; `_ds_manifest.json` lags and is never a check (`design-system.md` §2.7 traps carried as procedure, not as prose history).

Actor and trigger: the agent that lands a unit touching `src/ui/**`, `src/stages/**/*.css`, `docs/design/**` or any content `look` runs the bundle and the push in the same unit, before landing. Recurring owner actions: **0** once `DesignSync` is allowed in `.claude/settings.json` (a one-time Ask-First approval inside the foundation plan); until then each push is one permission prompt (an approval, not labour). Remote drift is detected by the agent comparing remote `BUILD.json` with the local one.

### 10.4 Visual QA on specimens, behaviour QA on the app

- `tests/specimens/`: Playwright opens every specimen file; runs axe; measures rendered text contrast (skipping `aria-hidden`, parsing `color(srgb …)` serialisation correctly); and, **in CI only** inside the official Playwright Linux container, compares a pixel baseline per specimen. Specimens are deterministic (no data fetch, no motion), so they are the right surface for the few pixel baselines (governance Rule 11) and pages are asserted through the DOM.
- `tests/e2e/`: behaviour on the real app in `mobile-webkit` (primary), `mobile-chromium` and `desktop-chromium` projects, preview server mode.

## 11. The rest of the application

### 11.1 Domain (pure)

```text
src/domain/
├── test/   model.ts (branded VariantId, ScoringPosition, AnswerKey, Attribute, Question{answers 2–4}) · run.ts (reduceRun: answer/prev/move/submit, advance-one, retention, revisit) · entry.ts (landing ingress / direct cold / direct resume, staged entry, runtime entry commit) · progress.ts · eligibility.ts · scoring.ts (binary_majority, odd count, type segment, qualifier tokens) · result-codec.ts (encode; decode accepts every payload ever issued) · volatility.ts · timing.ts
├── consent/ machine.ts (UNKNOWN → OPTED_IN | OPTED_OUT) · instruction-policy.ts (CTA matrix incl. OPTED_OUT rows, Esc writes nothing) · catalog-visibility.ts
├── telemetry/ events.ts (event schema, index semantics, choice 'A'–'D', payload hygiene validator shared by client and /api/telemetry)
└── share/ tally.ts (largest-remainder percentages, A–D) · subject.ts (what a shared question exposes)
```

```ts
// src/domain/test/run.ts (shape)
export type RunEvent =
  | { type: 'answer'; position: number; key: AnswerKey; at: number }
  | { type: 'move'; to: number } | { type: 'prev' } | { type: 'submit'; at: number };
export function reduceRun(run: RunState, e: RunEvent): RunState;
// answer on a revisited position → current = position + 1 (never "first unanswered"); last position never auto-advances
```

### 11.2 Platform, content, experience

```text
src/platform/  site.ts (12 locales, default, display tags, aliases — one table) · routes.ts (locale-free builders + localize) · storage.ts (never-throwing reads/writes, key registry) · consent-store.ts · telemetry-client.ts (queue; sends only when OPTED_IN; opt-out drops queue + ids) · analytics.tsx (Vercel Analytics/Speed Insights, consent-gated)
src/content/   index.ts (getCatalog(locale), getTest(locale, id)) · schema.ts · validate.ts (cross-source integrity, answer-count vs stage, binary scoring poles, palette invariants) — the on-disk format is decided by O3
src/experience/ landing/ (LandingScreen, Deck + use-deck spring physics, Field + field-gl.ts, ListSection) · window/ (WindowHost, window-machine, choreography, use-presence, return-hint) · test/ (TestScreen, use-test-run, input-gate, StageChrome, InstructionDialog) · share/ (ShareSheet, use-share, story-card.ts canvas 9:16, link) · vote/ · consent/ (Banner, recall) · recovery/ · result/ · blog/ · history/ · legal/ · theme/ (bootstrap source, preference hooks)
src/i18n/      request.ts (next-intl getRequestConfig + hasLocale) · messages/{12 locales}.json
src/proxy.ts   the single request entry: locale redirect (cookie → Accept-Language → default), BCP 47 aliases, locale-less allowlist, unknown first segment → global 404; no business state
```

Storage continuity (critique G11): consent and theme keep their legacy key names so returning users keep their choice; run keys use a new namespace (the old ones expire in 30 minutes anyway); the result route, payload codec and type segment decode every link already shared.

### 11.3 Dependency rules (ESLint `no-restricted-imports`, one config block per directory)

| Directory | May import | Must not import |
|:---|:---|:---|
| `src/domain/**` | `src/domain/**` | React, Next, next-intl, DOM globals, anything else in `src` |
| `src/ui/**` | React, `src/ui/**` | `next/*`, `next-intl`, `src/{domain,platform,content,experience,stages,app,i18n}`, `src/gallery` |
| `src/stages/**` | React, `src/ui/**`, `src/stages/contract`, `import type` from `src/domain` | `next/*`, `next-intl`, `src/{platform,content,experience,app}`, `src/gallery` (except `*.specimen.tsx`) |
| `src/platform/**` | `src/domain/**`, Next runtime APIs | `src/{ui,stages,experience,app}` |
| `src/content/**` | `src/domain/**`, `src/ui/palette/**` (types, invariants, derive) | React components |
| `src/experience/**` | everything above, Next, next-intl | `src/app/**`, `src/gallery/**` |
| `src/app/**` | `src/{experience,content,platform,i18n}`, `src/ui/index.css`, `src/app/brand.ts` | `src/domain` directly (goes through experience/content), `src/gallery` |
| `src/gallery/**`, `*.specimen.tsx` | `src/ui/**`, `src/stages/**/view.tsx`, `src/stages/*/colors.ts` | nothing imports them except `scripts/design-bundle.ts` |

Also: a hex colour literal in TS is allowed only under `src/ui/palette/**`, `src/stages/*/colors.ts`, `src/app/brand.ts` and content (`no-restricted-syntax` on string literals matching `^#[0-9a-f]{3,8}$`). File-size discipline stays: a source file past ~500 lines or a split into three or more new files is a planning stop.

## 12. Full tree of the new `main`

```text
.
├── AGENTS.md · .claude/{CLAUDE.md,settings.json}
├── .github/workflows/ci.yml            lint · lint:css · typecheck · unit · build · e2e · specimens (Playwright container)
├── vercel.json                         production freeze until launch (separation step)
├── package.json · package-lock.json · tsconfig.json · next.config.ts
├── eslint.config.mjs · stylelint.config.mjs · vitest.config.ts · playwright.config.ts
├── docs/
│   ├── DECISIONS.md                    fresh log, new ID prefix
│   ├── spec/{domain,platform,privacy-telemetry,content,experience,sharing}.md
│   ├── design/{system.md,SKILL.md,SYNC.md}
│   └── plans/ · done/
├── content/                            test content incl. `look` and `stage` (format: O3)
├── public/fonts/pretendard/{subset slices, supplement, OFL.txt}
├── scripts/design-bundle.ts
├── src/
│   ├── proxy.ts
│   ├── app/{global-not-found.tsx, global-error.tsx, brand.ts, fonts.css, api/telemetry/route.ts, [locale]/…}
│   ├── ui/{index.css, tokens.css, base.css, assets/grain.png, palette/, motion/, shell/, answer/, overlay/, instruction/, share/, deck/, window/, landing/, paper/, vote/}
│   ├── stages/{contract.ts, registry.ts, split/, forks/, story/}
│   ├── experience/{landing/, window/, test/, share/, vote/, consent/, recovery/, result/, blog/, history/, legal/, theme/}
│   ├── domain/{test/, consent/, telemetry/, share/}
│   ├── platform/ · content/ · i18n/
│   └── gallery/{specimen.ts, harness.tsx, fixtures/}
└── tests/{e2e/, specimens/}             unit tests are co-located as *.test.ts(x); vitest includes src/**/*.test.{ts,tsx}
```

`[locale]` routes beyond §8.1: `test/error` (recovery), `result/[variant]/[type]`, `blog`, `blog/[slug]`, `history`, `v/[id]` + its `opengraph-image.tsx` (O2), `legal/{privacy,terms}` (O6), `manifest.webmanifest/route.ts`, `opengraph-image.tsx` (static brand card), `error.tsx`.

## 13. Traceability

### 13.1 Requirement groups (`contracts.md` §4) → modules

| Group | Spec home | Modules | Verified by |
|:---|:---|:---|:---|
| §4.1 Routes and request entry | `spec/platform.md` | `src/proxy.ts`, `src/app/**`, `platform/routes.ts`; `(deck)` group + `@window` slot | E2E navigation matrix (soft → window, hard → full, back closes, other surfaces → full page); server-HTML probe for 404 bodies |
| §4.2 Locales, `<html lang>`, messages | `spec/platform.md` | `platform/site.ts`, `[locale]/layout.tsx` (lang from param), `i18n/`, messages ×12; `ui` holds no text; `base.css` wrapping (`keep-all` + `anywhere`); kinetic title splits by `Intl.Segmenter` graphemes | unit (alias table, display tags), message-key parity, specimens in `hi`/`ru`/`ja` |
| §4.3 Consent | `spec/privacy-telemetry.md` | `domain/consent/*`, `platform/consent-store.ts`, `experience/test/InstructionDialog`, `experience/consent/*`, `platform/analytics.tsx` | unit (matrix incl. `OPTED_OUT`), E2E (Esc no-op, deny-and-abandon returns to card) |
| §4.4 Telemetry | `spec/privacy-telemetry.md` | `domain/telemetry/events.ts` (shared validator), `platform/telemetry-client.ts`, `app/api/telemetry/route.ts`; emission in `use-test-run` and landing | unit (schema, index semantics, hygiene), E2E (no send before `OPTED_IN`) |
| §4.5 Storage | `spec/privacy-telemetry.md` | `platform/storage.ts` (never throws; legacy consent/theme key names kept) | unit with a `setItem` that throws |
| §4.6 Test domain | `spec/domain.md` | `domain/test/*` (answers 2–4, binary scoring, advance-one, lock/guard constants), `content/validate.ts` | unit per spec rule ID |
| §4.7 Manifest, SEO, OG, analytics | `spec/platform.md`, `spec/sharing.md` | `[locale]/manifest.webmanifest`, `generateMetadata` in `[locale]/layout.tsx`, `opengraph-image.tsx` (static), `v/[id]/opengraph-image.tsx` (O2, Next ≥ 16.3.6), `app/brand.ts` | build + E2E metadata checks |
| §4.8 Accessibility floor | `spec/experience.md` | `ui/base.css` (focus ring, sr-only, 44 px), `ui/overlay/Dialog`, stage contract (every gesture has a tap/button path), `data-motion`, `aria-*` in `ui` components | axe on specimens + E2E keyboard paths |

### 13.2 Prototype structures → modules

| Prototype structure | Source | Module |
|:---|:---|:---|
| Landing deck, cards, end card, soon card | `l3-deck.html` | `experience/landing/Deck` + `use-deck.ts`; `ui/deck/*` |
| Living field (WebGL, CSS fallback, OKLab blend) | `l3-deck.html` §3.8 | `experience/landing/field-gl.ts`; fallback `ui/landing/FieldFallback` via `coverStyle` |
| List section, rows | `l3-deck.html` | `experience/landing/ListSection`; `ui/landing/ListSheet`, `ListRow` |
| The window (surface, header band, clip-path choreography, fallback Q1) | `l3-deck.html` `openWindow`… | `experience/window/*`; `ui/window/WindowFrame`; route `(deck)/@window/(.)test/[variant]` |
| Window protocol `vive:*` | `shell.js` header | `StageProps`/`StageIntent` (§7.1); no messaging layer |
| Shell chrome: top bar, palette rail y/x, 이전/제출, `placePrev` | `shell.js` `chrome()`, `shell.css` | `ui/shell/*`; `StageChrome`; `PrevPort` |
| Badge, previous mark, question, glass label, votes line, 예시 chip | `shell.css` | `ui/answer/*` (예시 only in gallery fixtures) |
| Instruction modal + consent step + qualifier step | `shell.js` `sheet()` | `ui/overlay/Dialog` + `ui/instruction/InstructionCard` + `domain/consent/instruction-policy.ts` |
| Stage I split fields | `i3-split.html` | `stages/split/*` |
| Stage J forks world, arrival guard, gate | `j3-forks.html` | `stages/forks/*`; guard in `experience/test/input-gate.ts` |
| Stage D story cards, lock card, edge zones | `d3-story.html` | `stages/story/*` |
| `stageFor` override/reduced/default map; J 2-answer only | `shell.js` | content `stage` + `resolveStage()` + content validation |
| `TEST_COLORS`, `LOOK`, `look()`, `CURATED`, `genSet`, `legible`, `toneFor` | `shell.js`, `i3-split.html` | content `look`; `ui/palette/*`; `stages/*/colors.ts` |
| Tokens | `shared/tokens.css`, `shell.css` | `ui/tokens.css` |
| Grain canvas tile | `l3-deck.html` | static `ui/assets/grain.png` (generated once, committed as an asset) |
| Share sheet, coach, 9:16 story card, question → card morph | `share.js`, `share.css` | `experience/share/*`; `ui/share/*`; `StageHandle.shareOrigin`, `drawArt` |
| Friend vote page | `v-vote.html` | `app/[locale]/v/[id]`, `experience/vote`, `ui/vote/*`, `domain/share/tally.ts` (backend: O2) |
| Hand-off / return records (`vive-handoff`, `vive-landing-return`) | `flow.js` | removed: the window keeps one tree; hard-load return uses `return-hint.ts`; landing ingress uses the domain's staged entry |
| Proto chrome, hub, `예시` demo tests, simulated votes | `proto.*`, hub, `content.js` | `src/gallery/fixtures` only |

## 14. Key decisions and rejected alternatives

| # | Decision | Rationale | Rejected |
|:---|:---|:---|:---|
| K1 | Plain CSS + native cascade layers (`reset, tokens, base, components, stages, preferences`), one CSS entry | Pane renders static CSS; prototype idiom; precedence independent of chunk order | Tailwind v4 (compiled subset, class-list drift, L10/L25/L26), CSS Modules (hashed names), CSS-in-JS (runtime cost, no static specimen) |
| K2 | `src/ui/tokens.css` is the only home of CSS design values; bundle copies it byte-for-byte | Removes mirrors instead of guarding them | TS/JSON token source generating CSS (the pushed file becomes generated, a build step before `next dev`, for a handful of non-CSS values); v2's ds definition + runtime mirror |
| K3 | Concrete `data-theme` from the bootstrap; one dark block | One declaration per role, no support floor | `light-dark()` (iOS < 17.5 WebViews in in-app browsers invalidate values); media + attribute double block |
| K4 | Per-test look is content data emitted as `--t-*` by `paletteScope()`; on-world inks resolved in TS | JS needs the same colours (canvas, WebGL, 9:16); one emitter, no CSS math | Palette tokens in CSS; generated palette stylesheet at runtime; CSS-side tone logic |
| K5 | Contrast invariants PAL-1…7 as math in `npm test` and in the content build; rendered contrast on specimens | Illegible data cannot ship; glass is measured where it renders | Silent `legible()` nudging of curated colours; one-off manual audits |
| K6 | `ui/` components are pure views with CSS-complete layout | Specimens are faithful; fewer measurement passes | Components reading i18n, router, stores or measuring layout |
| K7 | Co-located `*.specimen.tsx` → `renderToStaticMarkup` → static HTML bundle, also the Playwright surface | Specimen and product are the same component | Hand-written specimen HTML; a Next gallery route + static export (needs a running server to publish) |
| K8 | New Claude Design project "VIVE Design System v3" from the bundle; v2 frozen | Tool contract forbids wholesale replace; 36 remote-only files in v2 | Rewriting `cd630eec` |
| K9 | One overlay primitive on native `<dialog>`, no portals, no history entries | Top layer + DOM inheritance + native inertness; removes L39/L40/L43/L53/L59 causes | Portalled overlays; bottom-sheet primitive with pushed entries |
| K10 | Window = `(deck)/@window/(.)test/[variant]`, opened at tap; exits are route pops the host reacts to | Landing mounted, server-loaded content, deep link = full page, one exit path | Native `pushState` in one tree; intercept at Q1 answer; View Transitions; iframe |
| K11 | `[locale]/layout.tsx` is the root layout; `global-not-found` for unmatched URLs | `lang` from the param; no header plumbing | Static root layout + proxy-injected header |
| K12 | Stage contract: declarative props, intents, pure `railColor`/`chromeTone`, 3-method handle, `PrevPort` | Stages are replaceable; resume redraws from data | Prototype-style imperative `Shell` API; stages owning run state |
| K13 | Lock + arrival guard enforced once in the controller for all stages | J's failure class is stage-independent | Per-stage guards |
| K14 | `stage` required in content; J with > 2 answers fails validation; reduced → D once per attempt | Owner decides at launch; errors surface at build | Silent J → I fallback; switching stage mid-attempt |
| K15 | `data-motion` single source, OS-only in v1 | L19 cause removed; no new control | Media query + JS class; in-site switch now |
| K16 | Two motion registers; overshoot only on manipulation settle and entrances; WAAPI + CSS, springs in TS | Owner tone 3–5 with clarity; no library | `motion`/framer-motion; View Transitions for stages |
| K17 | CSS only in `ui/` and `stages/`; experience modules compose components | Every visual rule is in the bundle | Screen-level stylesheets outside the design system |
| K18 | Answers are an ordered list of 2–4; binary scoring only; 3/4-answer examples only in gallery fixtures | Owner's "유연한 구조"; no scoring semantics yet | 2-only schema; shipping demo tests |
| K19 | Grain is a committed static asset | CSS-only specimens; no runtime canvas | Runtime canvas generation |
| K20 | Pretendard subsets served by the platform; the bundle ships the variable file; 650 → 700 | Delivery is not a design value; matches what the owner saw | Pushing the runtime font CSS; keeping 650 |

## 15. Foundation commit (first commit on the new `main`, after separation and prototype capture)

It creates a running, empty-but-styled app, the design-system core and the harness, and nothing feature-shaped.

1. Harness: `package.json` (`next` ≥ 16.3.6, `react`/`react-dom` 19, `next-intl` 4, TypeScript strict, `vitest`, `@playwright/test`, `eslint`, `stylelint`, `tsx`), lockfile, `tsconfig.json` (strict, `noUncheckedIndexedAccess`), `next.config.ts` (`typedRoutes`, `experimental.globalNotFound`), `eslint.config.mjs` (§11.3 boundaries, hex rule), `stylelint.config.mjs` (class pattern, no hex outside tokens, no `!important`, allowed layer names), `vitest.config.ts` (`src/**/*.test.{ts,tsx}`), `playwright.config.ts` (projects `mobile-webkit`, `mobile-chromium`, `desktop-chromium`; preview mode; fixed `snapshotPathTemplate`), `.gitignore` (`.next`, `node_modules`, `.env*.local`, `.design-bundle`, test outputs; never snapshot dirs), `.github/workflows/ci.yml`.
2. Contracts: `AGENTS.md` (≤ ~150 lines, derived facts only), `.claude/CLAUDE.md` (pointer), `.claude/settings.json` (existing allow list + `DesignSync`, pending owner approval), `docs/DECISIONS.md` (entry 1 = this architecture's K1–K20), `docs/spec/*.md` skeletons with section headings and open items, `docs/design/{system.md,SKILL.md,SYNC.md}`.
3. Design-system core: `src/ui/index.css` (layer order), `tokens.css` (seeded from the captured final prototype), `base.css`, `assets/grain.png`, `palette/{types,contrast,derive,scope,world,invariants}.ts` + tests, `motion/{preference,durations,springs}.ts`, `src/gallery/{specimen.ts,harness.tsx}`, Foundations specimens, `scripts/design-bundle.ts`, `tests/specimens/` (axe + contrast locally; pixels in CI).
4. Platform skeleton: `src/proxy.ts`, `platform/site.ts`, `i18n/request.ts`, messages ×12 (meta keys), `[locale]/layout.tsx` (root: lang, bootstrap, `ui/index.css`, fonts), `(deck)/page.tsx` rendering the wordmark and intro line on paper, `global-not-found.tsx`, `global-error.tsx`, `src/app/fonts.css`, `public/fonts/pretendard/**` + `OFL.txt`, `vercel.json` freeze.

Exit: `npm run lint && npm run lint:css && npm run typecheck && npm test && npm run build` green; E2E smoke loads `/en`, `/kr`, an unknown path (server HTML carries a styled 404 body), `data-theme` and `data-motion` set before paint; `design:bundle` produces Foundations specimens that pass axe and contrast.

## 16. Roadmap

| Step | Scope | Depends on | Exit criteria |
|:---|:---|:---|:---|
| 0 | Separation (legacy tag + branch, legacy `next` security bump, freeze probe) and prototype capture after the V4 publish notification | peer publish | tags on `origin`; capture ref holds final `MOCK/` sources; production fingerprint unchanged |
| 1 | Foundation commit (§15) | 0 | §15 exit |
| 2 | Spec extraction into `docs/spec/*` with stable rule IDs (contracts §4 + prototype + owner verdicts); render check G6 of the captured prototype with Pretendard, light/dark, 360/390/430 → type tokens frozen | 1 | every §4.1–§4.8 row has a rule ID; type specimens show no clipping |
| 3 | Design-system components: `shell`, `answer`, `overlay`, `instruction`, `share` (frame), `deck`, `window`, `landing`, `paper` basics, each with specimens; create Claude Design v3; first push | 1, 2 (type) | all specimens pass axe + contrast; `list_files` = `BUILD.json.files` |
| 4 | Domain core: `domain/test`, `domain/consent`, `domain/telemetry`; `platform/storage`, `consent-store`, `telemetry-client`; content schema + validation incl. PAL-1…7 and stage rules | 2 | unit tests named by spec rule IDs green |
| 5 | Routing + window skeleton: `(deck)` group, `@window` slot, intercepted and full test routes, recovery route; `WindowHost` machine with static card list; spike S-1/S-2 (§18) | 3, 4 | E2E: tap → window at `/test/x`; back closes with animation; refresh → full page; blog → test opens full page; 404 bodies non-empty in server HTML |
| 6 | Stage contract + `TestScreen` + stage D end to end (Q1 in window → grow → instruction dialog with full consent matrix → Q2…last → submit → result route) | 5 | E2E on `mobile-webkit` and `mobile-chromium`: advance-one, lock + guard, Esc rules, deny-and-abandon returns to card, reduced motion forces D |
| 7 | Landing: deck physics, kinetic title (grapheme split), field WebGL + fallback, list; prefetch/preload at settle | 6 | perf budget met on a throttled mobile profile; WCAG 2.2.2 settle ≤ 5 s; reduced-motion landing |
| 8 | Stage I | 6 | 2/3/4-answer specimens; drag + tap + keyboard E2E; PAL-3/4 hold on real data |
| 9 | Stage J (with `PrevPort`, gate, world) | 6 | the 19 input patterns + edge suite as E2E; focus order and zoom checks for the moving 이전 and the gate |
| 10 | Share: sheet, link, 9:16 card, `drawArt`, blocking while open; then votes, friend page and per-question OG after O2 | 6, O2 | sheet never advances the test; focus returns to the question; vote page opens in in-app browser profiles |
| 11 | Surfaces the prototype never drew (consent banner, menu, locale/theme, blog, history, legal, result content) in the paper register | O4, O6 | specimens + E2E per surface |
| 12 | Launch: owner sets `stage` per test and content (O3), unfreeze | all above | production deploy of the rebuilt `main` |

## 17. Framework facts verified in this session (context7)

| # | Fact | Source |
|:---|:---|:---|
| F1 | Intercepting-route markers `(.)`, `(..)`, `(..)(..)`, `(...)` are based on route segments, not the file system, and do not count `@slot` folders | Next.js v16.2.9 docs, `intercepting-routes.mdx` |
| F2 | A client navigation (`Link`, router) to an intercepted route renders the slot (modal); direct navigation or refresh renders the full page; slots are passed to the parent layout as props beside `children` | Next.js v16.2.9 docs, `parallel-routes.mdx` |
| F3 | Next 16 requires an explicit `default.js` for parallel route slots (return `null` or call `notFound()`) | Next.js v16.2.9 docs, `upgrading/version-16.mdx` |
| F4 | A modal slot closes by `router.back()` or `Link`; a slot must match a `null` page when navigating to routes that no longer render it, or it stays visible | Next.js v16.2.9 docs, `parallel-routes.mdx` |
| F5 | Native `window.history.pushState`/`replaceState` integrate with the Next router and sync `usePathname`/`useSearchParams` | Next.js v16.2.9 docs, `linking-and-navigating.mdx`, `single-page-applications.mdx` |
| F6 | `global-not-found.js` needs `experimental.globalNotFound`, returns a full `<html>`/`<body>` document, imports its own global styles and fonts, and is meant for apps whose root layout sits on a top-level dynamic segment; it is used when a URL matches no route | Next.js v16.2.9 docs, `not-found.mdx` |
| F7 | `dynamicParams = false` returns 404 for params not produced by `generateStaticParams` (which document renders it under a `[locale]` root layout was **not** established) | Next.js v16.2.9 docs, `dynamicParams.mdx`, `generate-static-params.mdx` |
| F8 | next-intl 4: `proxy.ts` may compose `createMiddleware(routing)`; `getRequestConfig({ requestLocale })` with `hasLocale`; `setRequestLocale` must be called in every layout/page meant for static rendering, before any next-intl call | next-intl docs (`routing/middleware.mdx`, `routing/setup.mdx`, 4.0 release notes) |
| F9 | Next orders final CSS by import order and chunks/merges stylesheets; it recommends containing CSS imports in a single entry and importing globals at the root; `cssChunking` controls merging | Next.js v16.2.9 docs, `11-css.mdx`, `cssChunking.mdx` |
| F10 | Tailwind v4 emits into native cascade layers `theme, base, components, utilities`; custom utilities use `@utility`; `source(none)` disables automatic source detection | Tailwind CSS docs (preflight, upgrade guide) |
| F11 | React `<ViewTransition>` is available only in React's Canary and Experimental channels, animates only updates inside a Transition/Suspense/`useDeferredValue`, and works from snapshots; Next 16 exposes it behind `experimental.viewTransition` | react.dev `ViewTransition`; Next.js v16.2.9 `view-transitions.mdx` |
| F12 | `light-dark()` requires `color-scheme: light dark`; custom properties can carry `light-dark()` values resolved where used | MDN `light-dark()`, `color-scheme` |
| F13 | `oklch()` support: Chrome 111, Firefox 113, Safari 15.4 (D's OKLCH steps can run as CSS or in TS) | MDN browser-compat-data `css/types/color.json` |
| F14 | `<dialog>` `cancel` fires on a close request (Esc on desktop, back button on mobile, `requestClose()`) and is cancelable; `showModal()` makes the rest of the page inert; built-in dialogs take part in `CloseWatcher` close handling | MDN `HTMLDialogElement` cancel, `requestClose()`, `showModal()`, `CloseWatcher` |

Taken from the critique, not re-verified here: GHSA-vcvr-r3jv-pc5j (`next/og` ImageResponse RCE, `>= 16.2.0 < 16.3.6`, patched 16.3.6; `critique.md` §3 #8). Not verified: `light-dark()` minimum browser versions (Safari 17.5 is from memory — it only strengthens K3); whether Chromium's close-watcher anti-abuse lets a second Esc skip a prevented `cancel` (the design swallows Esc at `keydown` instead and tests it, §18).

## 18. Risks and spikes

- **S-1 Intercept under `[locale]` + `(deck)` group.** F1 says groups and slots are transparent to `(.)`, but the combination with a dynamic root segment, `typedRoutes` and prefetch has had bugs historically. Step 5 proves it first with an E2E matrix; the fallback, if it fails, is the native-`pushState` design of §8.3 row 1 behind the same `WindowHost` interface (stages and the controller do not change).
- **S-2 404 document under a `[locale]` root.** F7 leaves open what `dynamicParams = false` renders; the invariant (no `notFound()` reachable under `[locale]`; the proxy sends unknown first segments to a URL that matches no route, so `global-not-found` renders) is proven by a server-HTML probe with scripts stripped.
- **Esc and Android back on native dialogs.** Esc is swallowed at `keydown`; Android back may still close the dialog, which the controller treats as exit to the card. E2E asserts "Esc twice on the instruction step leaves it open" in WebKit and Chromium.
- **Window choreography jank on low-end phones** (clip-path on three layers plus a live canvas stage). Budget measured in step 7; the reduced-motion path and the CSS field fallback are the degradations, decided by `failIfMajorPerformanceCaveat` and a frame-time probe, not by device lists.
- **Pretendard line-height 1–1.05 clipping** and never-rendered light mode of worlds (G6): step 2 renders before the type tokens freeze.
- **Claude Design pane capabilities** (relative `@import` resolution, fonts via `localPath`, specimen count): first push verifies; if `@import` does not resolve, the bundle script writes one `<link>` per file into each specimen instead, still byte-copied CSS.
- **Palette authoring for new tests** is owner/content work under O3; derived looks keep a new test shippable, and the build prints which looks are derived.
- **Arrival guard feel on I and D**: uniform 350 ms after `onSettled` may feel slow to fast tappers; one constant, measured in the first stage E2E and shown in the owner's preview.
- **iOS edge-back vs D's left edge zone and J swipes**: real-device check in steps 6 and 9; the design already gives every gesture a button path.
- **Owner decisions that shape later steps**: O1 (desktop — the tokens already carry `--app-max`; nothing desktop-specific is written before it), O2 (votes, OG, telemetry sink), O3 (content source and launch locales), O4 (undrawn surfaces), O6 (legal pages the consent copy points to), O7 (where verbatim feedback and the capture live).
