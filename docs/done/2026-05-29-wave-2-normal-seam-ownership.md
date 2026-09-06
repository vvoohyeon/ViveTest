# Wave 2 — Normal Card Structural Order Verification and Wave 3 Readiness

> **Task mode:** Plan Only. No files modified, no patches, no tests run, no snapshots generated, no code implemented.
> This document is the deliverable. It requires user approval before any implementation prompt is issued.
> **Wave:** 2 (of `docs/wave-roadmap.md`). **Prerequisite:** Wave 1 complete (commit `9ed6d1b`) ✅.

---

## 0. AGENTS.md §7 Required Plan Fields (index)

| Field | Where covered |
|---|---|
| All files to be modified | §3 Planned File Scope |
| Relevant SSOT contract (§2 routing) | `docs/req-landing.md §6.5` (landing grid / card slot order) — see §2 |
| Impact assessment (shell/GNB · localization · a11y · state · core flow) | §6 + §2.4 |
| Validation commands | §8 Suggested Validation Commands |
| Decisions requiring user confirmation | §2.5 + §5 (W2-LI-03 line 323; W2-LI-04 disposition) |
| Wave number / range | Wave 2 (header) |
| Task mode | Plan Only (header) |
| Reference-only files / worktrees | §1.4 |
| Preservation contracts (wave Exclude list) | §6 |
| Validation gates within wave scope | §8 |

---

## 1. Context Verification

### 1.1 Workspace & branch
- Workspace: `/Users/woohyeon/Local/ViveTest` ✅ (matches expected).
- Branch: `main` ✅ (matches expected; active rebuild implementation workspace per `docs/rebuild-worktree-setup.md §3`).
- Working tree: clean.
- `.planning/STATE.md`: not present.
- `HEAD`: `9ed6d1b` — `wave-1: render seam isolation + Normal order alignment + motion-ready internal seams`.

No workspace/branch mismatch. No blocking issue inherited from the guard.

### 1.2 Fixed inputs accepted from the three Wave 2 analysis reports (not reopened)
- **W2-LI-01** — Approved (conditional): route the desktop-expanded title-only render through `NormalCardFace` via an explicit presentation mode; output-identical.
- **W2-LI-02** — Approved: refresh the stale QA-checker slot-exposure anchor.
- **W2-LI-03** — Approved: sync `req-landing.md` order notation to BQ-08.
- **W2-LI-04** — Conditional: internal seam naming clarification only if W2-LI-01 needs it for coherence.
- **W2-LI-05 / 06 / 07** — Deferred (Wave 4/5/13, Wave 7, Wave 6). Not reopened.
- **Wave 3 readiness** — All four Normal slots confirmed CSS-only feasible; no new wrapper / public `data-slot` needed. No stop condition for Wave 3 once W2-LI-01 lands.

### 1.3 Inherited stop condition
The Wave 2 Investigation Report triggered exactly one stop condition: *`NormalCardFace` does not exclusively own `cardTitle` across every render branch* — the desktop-expanded branch renders a standalone `NormalCardTitle` outside the seam. This plan's W2-LI-01 is the approved, output-identical resolution path for that stop condition. No new stop condition is introduced by planning.

### 1.4 Reference-only (must NOT be edited)
- `legacy/reference` worktree (`/Users/woohyeon/Local/vivetest-legacy-reference`) — read-only reference.
- All checkpoint worktrees (`/Users/woohyeon/Local/vivetest-checkpoints/*`) — verification / rollback anchors only.
- Do not push, merge, reset, revert, rename, or repurpose any branch/worktree/checkpoint.

### 1.5 Live-source verification performed during planning (line numbers confirmed against current `HEAD`)
> The analysis reports warned that their line numbers may have drifted. The following were re-verified directly:

| Claim | Verified location (current source) |
|---|---|
| `NormalCardFace` definition | [landing-grid-card.tsx:425](src/features/landing/grid/landing-grid-card.tsx:425) |
| `NormalCardFace` sole call site | [landing-grid-card.tsx:1029](src/features/landing/grid/landing-grid-card.tsx:1029) |
| Standalone expanded `NormalCardTitle` (the seam gap) | [landing-grid-card.tsx:1021-1027](src/features/landing/grid/landing-grid-card.tsx:1021) |
| Ghost body (`NormalCardGhostBody`, carries `normalSubtitleRef`) | [landing-grid-card.tsx:1039-1047](src/features/landing/grid/landing-grid-card.tsx:1039), def [411](src/features/landing/grid/landing-grid-card.tsx:411) |
| `normalTitleRef` / `normalSubtitleRef` creation | [landing-grid-card.tsx:864-865](src/features/landing/grid/landing-grid-card.tsx:864) |
| `exposePublicSlot` / `exposePublicSlots` pattern | [landing-grid-card.tsx:283](src/features/landing/grid/landing-grid-card.tsx:283), [364](src/features/landing/grid/landing-grid-card.tsx:364) (only public-slot mechanism in file) |
| Stale QA anchor `includeSlotAttributes` | [check-variant-only-contracts.mjs:100](scripts/qa/check-variant-only-contracts.mjs:100) — **only** occurrence in the repo |
| Stale Normal order line | [req-landing.md:261](docs/req-landing.md:261) |
| Additional stale order-sequence line (W2-LI-03 guard) | [req-landing.md:323](docs/req-landing.md:323) |
| Collapsed Normal order unit assertion | [landing-card-contract.test.ts:83](tests/unit/landing-card-contract.test.ts:83) |
| Expanded Test slot-suppression unit assertions | [landing-card-contract.test.ts:126-140](tests/unit/landing-card-contract.test.ts:126) |
| Collapsed Normal order E2E assertion | [grid-smoke.spec.ts:815](tests/e2e/grid-smoke.spec.ts:815) |

**Documentation observation (non-blocking, no action this wave):** `docs/decision-register.md` contains BQ-01–12 and BQ-18–20 but **not BQ-13–17**, yet the Codex prompt and Wave 1 Handoff cite BQ-16 (motion-ready only) and BQ-17 (W1-LI-03 output-identical relocation). BQ-08 — the decision that governs Wave 2 substance — **is** present at [decision-register.md:14](docs/decision-register.md:14). Per hard constraint, the Decision Register is **not** modified here. Flagging the register gap as an observation only.

---

## 2. Source Interpretation

### 2.1 BQ-08 (canonical Normal order)
BQ-08 ([decision-register.md:14](docs/decision-register.md:14)) fixes Normal visible order as `Thumbnail → Title → Subtitle → Tags`, applied in Wave 1. Live collapsed render already matches at [landing-grid-card.tsx:435-443](src/features/landing/grid/landing-grid-card.tsx:435); unit + E2E assert it. Wave 2 must **verify** this is preserved and must **not** introduce a new visible order. W2-LI-03 aligns the lagging documentation notation to BQ-08.

### 2.2 Wave 2 include/exclude (`wave-roadmap.md §Wave 2`, lines 88-107)
- **Include:** verify Wave-1 Normal order, review Wave-1 card-contract tests / QA anchors, fix Normal-face structural defects that are *fallout of Wave 1 Normal order alignment only*.
- **Exclude:** new visible order; visual token/hover skin/border/shadow/radius/thumbnail treatment; Blog direct navigation; Unavailable behavior; actual motion; mobile/GNB/theme/result/baseline.

Every item in this plan maps to an Include bullet (seam-ownership fallout, QA anchor, doc sync). No Exclude item is touched.

### 2.3 W2-LI decisions applied
- **W2-LI-01** (approved, conditional) → §5 Steps 1-2; output-identity enforced by §6.
- **W2-LI-02** (approved) → §5 Step 4.
- **W2-LI-03** (approved) → §5 Step 5 (line 261 + flagged line 323).
- **W2-LI-04** (conditional) → §5 Step 3: **evaluated, not required** (see §2.6).

### 2.4 Refactor-First principle applied to W2-LI-01
Design question posed by the prompt: *if only the new Visual Style structure and the preservation contracts existed — no legacy — how would the expanded title-only behavior be expressed cleanly inside the seam boundary?*

Answer adopted: `NormalCardFace` is the seam that owns the Normal face. A Normal face naturally has two presentation contexts on the landing grid:
1. **collapsed browse** — the full face (thumbnail, title, subtitle, tags); and
2. **expanded title-only** — the desktop-expanded state where only the face's *title* persists in-flow for visual/measurement continuity while the expanded overlay shell renders the rich content elsewhere.

A from-scratch design would therefore make `NormalCardFace` aware of *which presentation it is rendering* via an explicit `presentation` discriminator — not patch a title in from outside. The result reads as though the title-only capability were always part of the face. This is an **origin-redesign of structure/naming/organization only**; every preservation contract in §6 is met without exception, and where the cleanest shape and a contract would conflict, the contract wins (none conflict here).

> Note: this is explicitly **not** "move `NormalCardTitle` inside `NormalCardFace`." `NormalCardTitle` is already a leaf of the face ([line 436](src/features/landing/grid/landing-grid-card.tsx:436)). The redesign removes the *standalone, out-of-seam* usage ([line 1022](src/features/landing/grid/landing-grid-card.tsx:1022)) by giving the face a first-class title-only presentation.

### 2.5 Decisions requiring user confirmation before execution
1. **W2-LI-03 line 323 (additional finding).** The approved input cited only [req-landing.md:261](docs/req-landing.md:261). The mandated guard ("list any other stale order line") surfaced [req-landing.md:323](docs/req-landing.md:323): `\`base_gap\`은 \`title -> thumbnail -> subtitle\` 기본 수직 리듬…`. This encodes the **old** title-before-thumbnail sequence. Recommendation: sync it to `thumbnail -> title -> subtitle` in the same W2-LI-03 step. **Confirm** whether to include line 323 or descope it. (See §5 Step 5.)
2. **W2-LI-04 disposition.** Plan concludes naming clarification is **not required** (§2.6). Confirm acceptance, or request the optional internal-naming pass.
3. **Presentation-mode API naming.** Plan proposes prop `presentation` with values `'collapsed' | 'expandedTitleOnly'`. Confirm or substitute preferred names (output identity is unaffected by the chosen identifiers).

### 2.6 W2-LI-04 evaluation (conditional)
After the W2-LI-01 design, three concerns remain **orthogonal and individually self-explanatory**:
- `presentation` → *which* slots the face renders (structure);
- `exposePublicSlots` → *whether* those slots emit public `data-slot` values (publication mechanic, shared with the ghost which passes `false`);
- `NormalCardGhostBody` → the separate, invisible desktop-expanded geometry placeholder (untouched).

Adding `presentation` does not make `exposePublicSlot(s)` or `NormalCardGhostBody` harder to read; the publication mechanic is unchanged and still load-bearing (it suppresses public slots on ghost/transient elements). Therefore **W2-LI-04 is not required**. No public `data-slot`/`data-testid`/ARIA/ref/handler identifiers change regardless.

---

## 3. Planned File Scope

Exactly the expected default set. No additions.

```txt
src/features/landing/grid/landing-grid-card.tsx     # W2-LI-01 (NormalCardFace presentation mode + call site)
tests/unit/landing-card-contract.test.ts            # expanded-branch title-ownership assertion strengthening
scripts/qa/check-variant-only-contracts.mjs         # W2-LI-02 (stale slot-exposure anchor)  [Ask First]
docs/req-landing.md                                  # W2-LI-03 (order notation sync)         [SSOT]
```

**Justification for each (no resolver/telemetry/transition/test-route/runtime-contract files included):**
- `landing-grid-card.tsx` — only file rendering the Normal face seam; W2-LI-01 lives entirely here.
- `landing-card-contract.test.ts` — only unit suite asserting Normal/Expanded slot contracts.
- `check-variant-only-contracts.mjs` — holds the single stale `includeSlotAttributes` anchor (Ask First path → plan-gated).
- `req-landing.md` — SSOT carrying the stale order notation (SSOT contract → plan-gated).

**Explicitly NOT in scope** (confirmed not requiring edits): `desktop-shell-phase.ts`, `landing-card-title-continuity.ts`, `landing-catalog-grid.tsx`, `use-landing-interaction-controller.ts`, resolvers/registry, telemetry, transition, test routes, `grid-smoke.spec.ts` / other E2E specs, `*.module.css`, `project-analysis.md` (verified: no Normal-order notation present).

---

## 4. KARD Matrix for Wave 2

| Category | Item | Notes |
|---|---|---|
| Keep | resolver, telemetry, transition, test route, GNB, theme, mobile lifecycle, result pipeline | No touch |
| Keep | `ExpandedTestBody`, `ExpandedBlogBody`, `DesktopExpandedShell` | Deferred (W2-LI-05/06/07); output-identical required |
| Keep | `UnavailableCardStatusOverlay` | No change |
| Keep | `NormalCardGhostBody` ghost placeholder (scope, `invisible`, `exposePublicSlot=false`, `normalSubtitleRef`) | No change |
| Keep | All preservation contracts | `data-testid`, `data-slot`, `data-card-*`, ARIA, `inert`, `tabIndex`, handlers, refs |
| Keep | Collapsed Normal slot order `cardThumbnail → cardTitle → cardSubtitle → tags` | Verified, unchanged |
| Adapt | `NormalCardFace` | Add explicit `presentation: 'collapsed' \| 'expandedTitleOnly'` mode (W2-LI-01) |
| Adapt | `LandingGridCard` content render (call site ~1021) | Route both collapsed and expanded-title-only through `NormalCardFace` |
| Adapt | `landing-card-contract.test.ts` | Strengthen expanded title-ownership assertions (additive only) |
| Adapt | `check-variant-only-contracts.mjs` | `includeSlotAttributes` → `exposePublicSlot` anchor (W2-LI-02) |
| Adapt | `req-landing.md` | Sync line 261 (+flagged line 323) to BQ-08 (W2-LI-03) |
| Replace | (none) | No replacements in Wave 2 |
| Delete | (none) | No deletions in Wave 2. (The standalone out-of-seam `NormalCardTitle` *usage* is absorbed into the face, not a file/contract deletion.) |

---

## 5. Step-by-Step Implementation Plan

> All snippets below are **design specifications** against current source, not applied changes. Identifiers (`presentation`, `'expandedTitleOnly'`) are proposals pending §2.5 confirmation.

### Step 1 — W2-LI-01 design: `NormalCardFace` expanded title-only presentation mode

- **Target file:** `src/features/landing/grid/landing-grid-card.tsx`
- **Exact purpose:** Give `NormalCardFace` a first-class presentation discriminator so it owns the desktop-expanded title-only render, eliminating the standalone out-of-seam `NormalCardTitle`.
- **Refactor-First rationale:** A Normal face has two grid presentations (collapsed browse; expanded title-only continuity). Expressing that as a `presentation` prop makes the seam self-describing to a developer with no legacy knowledge; the title-only path becomes a declared responsibility of the face rather than an external exception.
- **Design (proposed):**

  Add a presentation type and prop to the existing interface ([line 279](src/features/landing/grid/landing-grid-card.tsx:279)):
  ```tsx
  type NormalCardFacePresentation = 'collapsed' | 'expandedTitleOnly';

  interface NormalCardFaceProps {
    card: LandingCard;
    hasAssetMedia: boolean;
    isMobileViewport: boolean;
    exposePublicSlots: boolean;
    presentation: NormalCardFacePresentation; // NEW (required)
    titleRef?: RefObject<HTMLHeadingElement | null>;
    subtitleRef?: RefObject<HTMLParagraphElement | null>;
  }
  ```
  Rewrite the face body ([lines 425-446](src/features/landing/grid/landing-grid-card.tsx:425)) so the title element is shared by both modes and the title-only mode returns just the title:
  ```tsx
  function NormalCardFace({
    card, hasAssetMedia, isMobileViewport, exposePublicSlots, presentation, titleRef, subtitleRef
  }: NormalCardFaceProps) {
    const title = (
      <NormalCardTitle
        card={card}
        isMobileViewport={isMobileViewport}
        exposePublicSlot={exposePublicSlots}
        titleRef={titleRef}
      />
    );

    if (presentation === 'expandedTitleOnly') {
      return title; // desktop-expanded: only the face title persists in-flow
    }

    return (
      <>
        <NormalCardThumbnail card={card} hasAssetMedia={hasAssetMedia} exposePublicSlot={exposePublicSlots} />
        {title}
        <NormalCardSubtitle card={card} exposePublicSlot={exposePublicSlots} subtitleRef={subtitleRef} />
        <NormalCardTagRow card={card} exposePublicSlot={exposePublicSlots} />
      </>
    );
  }
  ```
- **Contract preservation:** The title-only branch renders the *same* `NormalCardTitle` with the *same* props it receives today as a standalone element (`exposePublicSlot = exposePublicSlots = true`, `titleRef = normalTitleRef`) → identical `<h2 data-slot="cardTitle" class="…landing-grid-card-title-normal…">`. In title-only mode the face does not render a subtitle, so it does not attach `subtitleRef` (matching today, where the standalone title also did not) — `normalSubtitleRef` continues to attach solely to the ghost subtitle.
- **What must not change:** `NormalCardTitle`, `NormalCardThumbnail`, `NormalCardSubtitle`, `NormalCardTagRow`, `NormalCardGhostBody` internals; `data-slot` values; className hooks; the tags gap/empty-tags container.
- **Rollback:** `git checkout -- src/features/landing/grid/landing-grid-card.tsx` (single file; tree clean at start). Pre-change behavior is the standalone-title branch.

### Step 2 — W2-LI-01 implementation: call site + collapsed-path verification

- **Target file:** `src/features/landing/grid/landing-grid-card.tsx`
- **Exact purpose:** Unify the content-area render so both collapsed and desktop-expanded-title-only go through `NormalCardFace`; verify the collapsed path is byte-identical.
- **Refactor-First rationale:** The call site should express "render the Normal face in its current presentation," not branch between a face and a loose title.
- **Design (proposed):** Replace the current ternary ([lines 1020-1037](src/features/landing/grid/landing-grid-card.tsx:1020)):
  ```tsx
  {isMobileExpanded ? null : isExpanded ? (
    <NormalCardTitle card={card} isMobileViewport={isMobileViewport} exposePublicSlot titleRef={normalTitleRef} />
  ) : (
    <NormalCardFace card={card} hasAssetMedia={hasAssetMedia} isMobileViewport={isMobileViewport}
      exposePublicSlots titleRef={normalTitleRef} subtitleRef={normalSubtitleRef} />
  )}
  ```
  with:
  ```tsx
  {isMobileExpanded ? null : (
    <NormalCardFace
      card={card}
      hasAssetMedia={hasAssetMedia}
      isMobileViewport={isMobileViewport}
      presentation={isDesktopExpanded ? 'expandedTitleOnly' : 'collapsed'}
      exposePublicSlots
      titleRef={normalTitleRef}
      subtitleRef={normalSubtitleRef}
    />
  )}
  ```
  - The ghost block ([lines 1039-1047](src/features/landing/grid/landing-grid-card.tsx:1039)) is **unchanged**.
  - `isDesktopExpanded` is value-equivalent to the prior `isExpanded` test inside this already-`!isMobileExpanded` branch (`isExpanded = showDesktopExpandedShell || isMobileExpanded`; with mobile excluded it reduces to `showDesktopExpandedShell = isDesktopExpanded`). Using `isDesktopExpanded` states intent precisely; reusing `isExpanded` is also acceptable and identical in output.
- **Contract preservation:** mobile-expanded still renders `null` in the content area (mobile title remains in the mobile header at [line 1075](src/features/landing/grid/landing-grid-card.tsx:1075)); collapsed renders all four slots in order; desktop-expanded renders exactly one in-flow `cardTitle` + unchanged ghost.
- **What must not change:** ghost placeholder block; `DesktopExpandedShell` invocation ([1051-1066](src/features/landing/grid/landing-grid-card.tsx:1051)); mobile expanded body ([1068-1098](src/features/landing/grid/landing-grid-card.tsx:1068)); mobile transient shell ([1100-1133](src/features/landing/grid/landing-grid-card.tsx:1100)); unavailable overlay ([1135-1137](src/features/landing/grid/landing-grid-card.tsx:1135)); all root/trigger attributes & handlers.
- **Rollback:** same as Step 1 (same file; revert together).

### Step 3 — W2-LI-04 (conditional): internal seam naming clarification

- **Disposition: NOT REQUIRED.** Per §2.6, the presentation-mode design keeps `exposePublicSlots` and `NormalCardGhostBody` coherent. No identifier changes.
- If the user nonetheless requests it (§2.5 decision 2), the **only** allowed scope is internal symbol renaming within `landing-grid-card.tsx` with zero behavior change and zero public `data-slot`/`data-testid`/ARIA/ref/handler change. Default plan: skip.

### Step 4 — W2-LI-02: QA checker anchor update

- **Target file:** `scripts/qa/check-variant-only-contracts.mjs` (**Ask First** path)
- **Exact purpose:** Repair the stale anchor at [line 100](scripts/qa/check-variant-only-contracts.mjs:100) so the checker again verifies the canonical `cardThumbnail` public-slot exposure under the current `exposePublicSlot` mechanic.
- **Design (proposed):** change the regex token only:
  ```js
  // before
  if (!/data-slot=\{includeSlotAttributes \? 'cardThumbnail' : undefined\}/u.test(cardFile)) {
  // after
  if (!/data-slot=\{exposePublicSlot \? 'cardThumbnail' : undefined\}/u.test(cardFile)) {
  ```
  This matches `NormalCardThumbnail` exactly at [landing-grid-card.tsx:364](src/features/landing/grid/landing-grid-card.tsx:364) (`data-slot={exposePublicSlot ? 'cardThumbnail' : undefined}`), which W2-LI-01 does **not** modify.
- **Scope guard:** no other line changes. The adjacent thumbnail-media assertion at [line 104](scripts/qa/check-variant-only-contracts.mjs:104) (`resolveVariantMediaSource(card.variant, hasAssetMedia)`) still matches [line 369](src/features/landing/grid/landing-grid-card.tsx:369) and is left intact. No new check categories; no other QA scripts touched.
- **Sequencing note:** independent of W2-LI-01 (it targets the thumbnail leaf, untouched by W2-LI-01). The checker currently **fails** (`!test()` is true because the old token is gone); this step restores PASS.
- **Rollback:** `git checkout -- scripts/qa/check-variant-only-contracts.mjs`.

### Step 5 — W2-LI-03: `req-landing.md` order notation sync

- **Target file:** `docs/req-landing.md` (**SSOT** contract)
- **Exact purpose:** Align documentation notation with BQ-08; no runtime/test/contract change.
- **Edit 5a (primary, approved):** [line 261](docs/req-landing.md:261)
  ```diff
  - - Normal 순서: `cardTitle -> cardThumbnail -> cardSubtitle -> tags`
  + - Normal 순서: `cardThumbnail -> cardTitle -> cardSubtitle -> tags`
  ```
- **Edit 5b (additional finding — requires confirmation, §2.5 decision 1):** [line 323](docs/req-landing.md:323), in §6.7 Spacing Model:
  ```diff
  - - `base_gap`은 `title -> thumbnail -> subtitle` 기본 수직 리듬과 동일 기준으로 유지해야 한다.
  + - `base_gap`은 `thumbnail -> title -> subtitle` 기본 수직 리듬과 동일 기준으로 유지해야 한다.
  ```
  Rationale: this line names the vertical-rhythm sequence in the **old** title-before-thumbnail order; under BQ-08 the sequence is thumbnail-before-title. Leaving it creates exactly the Wave 3 mis-read risk W2-LI-03 exists to prevent.
- **Guard result (all `req-landing.md` order/thumbnail lines reviewed):**
  - Stale → 261, 323 (above).
  - Order-neutral, leave unchanged: `subtitle -> tags` references (66, 321, 332, 1020 — subtitle precedes tags in both orders); 263 (`Expanded 공통 헤더: cardTitle만 유지` — correct, consistent with W2-LI-01); 264/265/266/267/315/376/378 (expanded removal / asset-semantics / "tags last", all correct under BQ-08).
- **What must not change:** any non-order content; the SSOT must continue to satisfy `check-variant-only-contracts.mjs` lines 111-121 (must still contain `/blog/[variant]`, `cardThumbnail`, and the `subtitle`/`4줄`/`재사용` markers — none of these are touched).
- **Rollback:** `git checkout -- docs/req-landing.md`.

### Step 6 — Test update: card-contract expanded title-ownership

- **Target file:** `tests/unit/landing-card-contract.test.ts`
- **Exact purpose:** Lock the DOM-observable contract that the desktop-expanded Normal render exposes exactly one `cardTitle` through the seam and no thumbnail/subtitle/tags public slots — the testable proxy for seam ownership (output-identity means component provenance is not separately observable in static markup, by design).
- **Design (proposed) — additive only, in the existing Test-Expanded case** ([lines 115-141](tests/unit/landing-card-contract.test.ts:115)):
  ```ts
  // ADD (alongside existing null checks at 126-128 and continuity check at 138-140):
  const expandedTitles = expandedDoc.querySelectorAll('[data-slot="cardTitle"]');
  expect(expandedTitles).toHaveLength(1);
  expect(expandedTitles[0]?.className).toContain('landing-grid-card-title-normal');
  ```
  - The existing assertions that `cardSubtitle`/`cardThumbnail`/`tags` are `null` in expanded ([126-128](tests/unit/landing-card-contract.test.ts:126)) already cover "no public thumbnail/subtitle/tags via the Normal seam in expanded" — reused, not duplicated, not weakened.
  - The existing title-continuity assertion ([138-140](tests/unit/landing-card-contract.test.ts:138)) is preserved unchanged.
- **Optional parity (recommended):** mirror the two added lines in the Blog-Expanded case ([lines 167-197](tests/unit/landing-card-contract.test.ts:167)) since the title-only path also applies to desktop-expanded Blog. Additive; confirm if desired.
- **Not allowed:** deleting/weakening any existing assertion; snapshot generation; positional/visual expectations; transition/telemetry/test-route expectation changes.
- **Rollback:** `git checkout -- tests/unit/landing-card-contract.test.ts`.

### Suggested implementation order
`Step 1 → Step 2` (W2-LI-01 together, single file) → `Step 6` (tests) → run unit gate → `Step 4` (QA anchor) → run QA checker → `Step 5` (doc sync) → full suggested gates (§8). Steps 4 and 5 are independent of 1/2 and may be done in any order; grouping after the code change keeps one verifiable unit.

---

## 6. Output Identity and Contract Preservation Checklist (verify after W2-LI-01)

Desktop-expanded and all non-target branches must be byte-for-byte identical except for the absence of the standalone out-of-seam title element (now produced by the face).

- [ ] `data-slot="cardTitle"` present on the expanded title element (one occurrence).
- [ ] `normalTitleRef` attached to that same title element (drives `useLandingCardTitleSplit`).
- [ ] className hooks present on the title: `landing-grid-card-title`, `landing-grid-card-title-normal`, viewport clamp class (`line-clamp-1` desktop / `block overflow-visible text-clip` mobile), `styles.normalTitle`.
- [ ] No `data-slot` on `cardThumbnail`, `cardSubtitle`, `tags` in expanded title-only mode (ghost keeps `exposePublicSlot=false`).
- [ ] `data-testid="landing-grid-card"` on root unchanged; `data-testid="landing-grid-card-trigger"` unchanged.
- [ ] All `data-card-*` markers unchanged ([942-983](src/features/landing/grid/landing-grid-card.tsx:942)).
- [ ] `aria-disabled`, `inert` on root unchanged; `tabIndex`, `aria-disabled` on trigger unchanged.
- [ ] Root handlers (`onMouseEnter/Leave`, `onPointerMove`, `onMouseDown`, `onWheel`) and trigger handlers (`onFocus`, `onKeyDown`, `onClick`) unchanged.
- [ ] `onAnswerChoiceSelect`, `onPrimaryCtaClick` threading unchanged (incl. `forwardBlogDestinationCtaClick`).
- [ ] `interactive={false}` transient suppression unchanged (`ExpandedCardBody` calls).
- [ ] `aria-hidden` placements unchanged (ghost, transient shell, unavailable overlay, thumbnail).
- [ ] Desktop shell `onExpandedBodyKeyDown` wiring unchanged.
- [ ] Mobile close + transient shell behavior unchanged.
- [ ] Ghost placeholder public-slot suppression behavior unchanged; `normalSubtitleRef` still on the ghost subtitle.
- [ ] Resolver usage unchanged (`resolveTestPreviewPayload` only at [532](src/features/landing/grid/landing-grid-card.tsx:532)).
- [ ] Transition callback boundary unchanged; telemetry side-effect boundary unchanged.
- [ ] Collapsed Normal slot order unchanged: `cardThumbnail → cardTitle → cardSubtitle → tags`.

**Impact assessment (AGENTS.md §7):** shared shell/GNB — none touched; localization — none (no copy/message changes); a11y — neutral (same ARIA/roles/refs); state contracts — none (no controller/lifecycle changes); core user flow — neutral (output-identical render). Risk: Medium (central card file), mitigated by output-identity gates.

---

## 7. Test Update Plan (summary)

Allowed (and planned):
- `tests/unit/landing-card-contract.test.ts`: add expanded-branch assertions — exactly one `[data-slot="cardTitle"]` in desktop-expanded Normal render via seam, carrying `landing-grid-card-title-normal`; reuse existing null checks for thumbnail/subtitle/tags. Optional Blog-Expanded parity.

Not allowed (and not planned):
- Deleting/weakening existing assertions; snapshot generation; transition/telemetry/test-route expectation changes; changing E2E smoke order assertions beyond output-identity confirmation (e.g. [grid-smoke.spec.ts:815](tests/e2e/grid-smoke.spec.ts:815) collapsed order, [461](tests/e2e/grid-smoke.spec.ts:461) expanded in-flow title — both remain valid as-is and are not edited).

---

## 8. Suggested Validation Commands (suggestions only — do not run during planning)

```txt
npm run lint                                              (suggested only)
npm run typecheck                                         (suggested only)
npm test -- tests/unit/landing-card-contract.test.ts \
            tests/unit/landing-interaction-controller-handlers.test.ts \
            tests/unit/landing-interaction-dom.test.ts   (suggested only)
node scripts/qa/check-phase5-card-contracts.mjs          (suggested only)
node scripts/qa/check-phase7-state-contracts.mjs         (suggested only)
node scripts/qa/check-phase8-accessibility-contracts.mjs (suggested only)
node scripts/qa/check-variant-only-contracts.mjs         (suggested only — post W2-LI-02)
npx playwright test tests/e2e/grid-smoke.spec.ts \
                    tests/e2e/state-smoke.spec.ts \
                    tests/e2e/a11y-smoke.spec.ts          (suggested only)
npx playwright test tests/e2e/transition-telemetry-smoke.spec.ts  (suggested only)
```
Wave-scoped gate (per `wave-roadmap.md §Wave 2`): card contract unit, grid smoke, a11y smoke. Full Basic Gates (`lint → typecheck → test → build`) recommended before declaring done. **Do not** run `npm run qa:visual:full`; do not generate or approve visual baselines (BQ-07).

---

## 9. Stop Conditions (implementation must halt and report)

- Any change to a file outside §3.
- Any change to `data-slot`, `data-testid`, ARIA, ref, or event-handler contracts.
- Any change to ghost placeholder behavior or scope.
- Any change to the collapsed Normal slot order.
- Any change to `ExpandedTestBody`, `ExpandedBlogBody`, or `DesktopExpandedShell` output.
- Any change to mobile lifecycle / mobile transient shell behavior.
- Any change to resolver, telemetry, transition, or test-route files.
- Any change to GNB, theme, or result pipeline.
- Introduction of a new public `data-slot` value.
- Introduction of a layout-affecting wrapper.
- Introduction of visual skin, hover/focus visual, or animation.
- Inability to prove W2-LI-01 output identity in the expanded branch.
- Any need for visual baseline generation.
- Any contract-assertion deletion or test regression.
- Crossing the Wave 2 include/exclude boundary (e.g. a requested fix that is actually Wave 3+ skin) → stop before editing and report the boundary violation.

---

## 10. Wave 3 Readiness Confirmation

After Wave 2 implementation as planned:
- `NormalCardFace` exclusively owns all four Normal face slots in **collapsed** state and the title in **expanded title-only** state — i.e. every in-flow Normal render of `cardTitle` flows through the seam.
- All Wave 3 skin targets remain **CSS-only** via existing className hooks, with **no** new wrapper and **no** public-contract change:
  - border (resting/hover/focus-visible) via root/trigger hooks + `.root:has(:focus-visible)`;
  - shadow via resolved root visual class;
  - radius via `--landing-card-radius`;
  - thumbnail treatment via `landing-grid-card-thumbnail-slot` / `styles.normalThumbnail` / image child;
  - tags compact style via `landing-grid-card-tags` / `styles.normalTags` / chip classes (keep tag row extensible for Wave 8 `Read more →`);
  - hover/focus visual ring via the focus-visible CSS hook.
- **Wave 3 attach point:** the `NormalCardFace` seam.

---

## 11. Implementation Approval Gate

```
No implementation has been performed. This plan requires user approval
before any file is modified.
```
