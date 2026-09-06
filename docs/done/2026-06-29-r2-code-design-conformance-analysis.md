# Visual Reconciliation R2 - Code/Design Conformance Analysis

## 0. Mode, Baseline, and Scope Lock

- Mode: Analysis-Only, BQ-19 Step-1 style. Inter-wave reconciliation R2; no wave number is advanced.
- Only authorized output: this analysis document.
- Not performed: implementation, CSS/token/doc authority edits, commits, pushes, checkpoints, snapshot/baseline work, network access, lint, typecheck, test, build.
- Baseline: HEAD `ddc5dd7af99f9768409f729ea06c6e7c7cdab1bf` on branch `main`.
- Working tree caveat: pre-existing local changes exist in card source/tests and two added W12 plan docs. Because the user specified HEAD 기준, implementation evidence below is from `git show HEAD:<path>` for dirty files, not from the working tree.

Pre-existing working tree changes observed before writing:

```text
A  docs/plans/2026-06-15-wave-12-mobile-browse-card-visual-analysis.md
A  docs/plans/2026-06-19-wave-12-mobile-browse-card-visual-plan.md
 M src/features/landing/grid/landing-grid-card.module.css
 M src/features/landing/grid/landing-grid-card.tsx
 M tests/e2e/a11y-smoke.spec.ts
 M tests/e2e/grid-smoke.spec.ts
 M tests/unit/landing-card-contract.test.ts
```

Existing `.planning/STATE.md` is a Wave 10 validation-debt continuity note. It is not an R2 authorization source and does not change this analysis scope.

Scope included: Normal/resting browse cards for Mobile, Tablet, Desktop across Test, Blog, and Unavailable surfaces.

Scope excluded: Expanded card contracts, GNB/hero, mobile expanded lifecycle, behavior/a11y/routing/telemetry/transition changes, visual regression baseline/snapshot decisions.

Authority chain used: `docs/decision-register.md` > `docs/req-landing.md` / active rules > `docs/design/design.md` visual sections > local design resources > HEAD implementation.

Classification:
- 1 logged exception: already recorded BQ/roadmap exception; no drift candidate.
- 2 unlogged code drift: HEAD implementation is below current visual authority and no higher-priority exception was found.
- 3 design underspec / authority conflict: user ruling required before any fix scope exists.

Evidence grades:
- A: HEAD source and current authority agree structurally.
- B: HEAD source plus existing HEAD test assertions support the claim, but tests were not rerun.
- C: Static/source evidence only; computed/browser confirmation still required.
- D: Authority or baseline conflict; cannot be closed by inspection alone.

## 1. Per-Section Findings

| Section / contract | HEAD code realized | Classification | Evidence |
| --- | --- | --- | --- |
| `design.md` authority boundary | `design.md` owns visual foundations/tokens/patterns, but not waves, QA gates, routing, telemetry, storage, test-flow, or runtime contracts. | 1 logged exception | `docs/design/design.md:17-30`, `docs/design/design.md:429-431`, `docs/decision-register.md:189-194`, `docs/agent-guides/project-rules.md:129-135` |
| Strategy A scoped tokens vs global tokens | Normal card visual tokens are scoped in `landing-grid-card.module.css`, not promoted to `globals.css`. This matches BQ-04/BQ-21/BQ-34 and Wave 16 deferral. | 1 logged exception | `HEAD:src/features/landing/grid/landing-grid-card.module.css:1-13`, `docs/decision-register.md:306-311`, `docs/wave-roadmap.md:432-443` |
| `design.md §4.3`, `§4.11` title/subtitle matrix | Desktop/Tablet Normal title uses one-line clamp; subtitle uses two-line clamp. Mobile Normal title/subtitle remove clamp and show full text. | aligned, grade B | `HEAD:src/features/landing/grid/landing-grid-card.tsx:347-400`, `HEAD:tests/unit/landing-card-contract.test.ts:551-585`, `HEAD:tests/e2e/grid-smoke.spec.ts:474-527` |
| `design.md §4.3`, `§4.11` global wrapping / W12 mobile keep-all | Authority expects mobile title/subtitle scoped `word-break: keep-all` plus `overflow-wrap:anywhere` under BQ-35. HEAD has `overflow-wrap:anywhere` in the base classes, but no mobile scoped `word-break: keep-all` selector. | 3 authority/status conflict | `docs/design/design.md:81-86`, `docs/design/design.md:116-117`, `docs/decision-register.md:315-320`, `HEAD:src/features/landing/grid/landing-grid-card.module.css:1-180`, `HEAD:src/features/landing/grid/landing-grid-card.tsx:212-214`, `HEAD:src/features/landing/grid/landing-grid-card.tsx:347-400`, `docs/wave-roadmap.md:376-387` |
| `design.md §5.1` card title/subtitle type roles | Title is 20px / 600 / 1.3 / `-0.01em`; subtitle is 15px / 400 / 1.45 / `--body` equivalent scoped ink. | aligned, grade B | `docs/design/design.md:133-143`, `docs/design/design.md:287-291`, `HEAD:src/features/landing/grid/landing-grid-card.tsx:211-214`, `HEAD:tests/e2e/grid-smoke.spec.ts:529-555` |
| `design.md §5.1`, `§5.6`, `§6.3` tag type role | Authority expects tags/meta 13px / 500 / 1.35. HEAD tag chip class still includes `leading-[1.2]`; BQ-35 says that stale class should be removed and line-height 1.35 supplied by scoped CSS. | 3 authority/status conflict | `docs/design/design.md:142`, `docs/design/design.md:248-249`, `docs/decision-register.md:315-320`, `HEAD:src/features/landing/grid/landing-grid-card.tsx:222-223`, `docs/wave-roadmap.md:376-387` |
| `design.md §4.4`, `§5.2`, `§6.1`, `§7.2` available surface | Available Normal card uses `#fff`, `#e6e2d8` hairline, small warm shadow, radius 16, and 16px trigger padding. | aligned, grade B | `docs/design/design.md:145-150`, `docs/design/design.md:189-205`, `docs/design/design.md:242-243`, `docs/design/design.md:287-296`, `HEAD:src/features/landing/grid/landing-grid-card.module.css:4-7`, `HEAD:src/features/landing/grid/landing-grid-card.tsx:205-208`, `HEAD:src/features/landing/grid/landing-grid-card.tsx:1007-1047` |
| `design.md §5.10` card internal padding | Card internal padding is 16px. HEAD applies `[padding:16px]` to non-expanded trigger content. | aligned, grade C | `docs/design/design.md:210-224`, `HEAD:src/features/landing/grid/landing-grid-card.tsx:1044-1047` |
| `design.md §5.10`, `§7.7` grid gutter | Authority records realized grid gutter as 24px desktop, 20px tablet, 14-16px mobile. HEAD grid container and row both use `gap-[15px] md:gap-4`, which realizes 15px mobile and 16px tablet/desktop. Mobile fits `14-16px`; tablet/desktop appear below design. | 2 unlogged code drift | `docs/design/design.md:210-224`, `docs/design/design.md:337-347`, `HEAD:src/features/landing/grid/landing-catalog-grid.tsx:198-209`, `docs/req-landing.md:181-202`, `HEAD:src/features/landing/shell/page-shell.tsx:17-23` |
| `req-landing §6.1` side padding | Side padding is 16px mobile, 20px md, 24px at min 900px through PageShell. This matches req-landing side padding and is not the gutter drift above. | aligned, grade C | `docs/req-landing.md:181-185`, `HEAD:src/features/landing/shell/page-shell.tsx:17-23` |
| Mobile `base_gap` 8px vs design spacing rhythm | HEAD uses `LANDING_CARD_BASE_GAP_PX = 8`. Although design spacing includes 12px reference rhythm, BQ-35/BQ-36 explicitly lock mobile `8px` as fallback and defer `12px` until SSR-tier determinism work. | 1 logged exception | `HEAD:src/features/landing/grid/spacing-plan.ts:1`, `HEAD:src/features/landing/grid/use-grid-geometry-controller.ts:242-260`, `docs/decision-register.md:315-329` |
| `design.md §6.2`, `req-landing §6.8` thumbnail | Normal thumbnail is 16/6, full width, `object-cover`, radius 12. Fallback SVG is warm-neutral/sage abstract. | aligned, grade B | `docs/design/design.md:245-246`, `docs/req-landing.md:387-390`, `HEAD:src/features/landing/grid/landing-grid-card.tsx:166-170`, `HEAD:src/features/landing/grid/landing-grid-card.tsx:215-216`, `HEAD:src/features/landing/grid/landing-grid-card.tsx:410-425`, `HEAD:tests/unit/landing-card-contract.test.ts:123-166` |
| `design.md §6.3` tag fill/radius/padding/no-dot | Available tags use `#ece8df`, ink `#4a4a55`, radius 5, 9px inline padding, nowrap, no border, no dot. Unavailable status tag gets scoped `#e6e2d8`. | aligned except W12 line-height, grade B | `docs/design/design.md:175-180`, `docs/design/design.md:248-249`, `docs/decision-register.md:270-275`, `HEAD:src/features/landing/grid/landing-grid-card.module.css:10-13`, `HEAD:src/features/landing/grid/landing-grid-card.module.css:77-82`, `HEAD:src/features/landing/grid/landing-grid-card.tsx:217-223`, `HEAD:tests/unit/landing-card-contract.test.ts:334-388`, `HEAD:tests/unit/landing-card-contract.test.ts:551-605` |
| `req-landing §6.6`, BQ-32 visible-prefix resolver | HEAD has single `resolveVisibleTagPrefix`; last visible tag alone may ellipsize to 56px, suffix hides right-first, CTA reservation uses probe width, and hidden suffix is unmounted. No second resolver is proposed. | aligned, grade B | `docs/req-landing.md:280-293`, `docs/decision-register.md:288-293`, `HEAD:src/features/landing/grid/spacing-plan.ts:60-101`, `HEAD:src/features/landing/grid/use-card-inline-geometry.ts:181-337`, `HEAD:src/features/landing/grid/landing-grid-card.tsx:441-557`, `HEAD:tests/e2e/grid-smoke.spec.ts:987-1096` |
| `design.md §7.2` Normal test card order | Normal face renders Thumbnail -> Title -> Subtitle -> Tags. No Start CTA appears on the front face. | aligned, grade B | `docs/design/design.md:287-296`, `docs/req-landing.md:259-275`, `HEAD:src/features/landing/grid/landing-grid-card.tsx:579-628`, `HEAD:tests/unit/landing-card-contract.test.ts:92-147` |
| `design.md §7.2` no independent hover skin on Test cards | Blog-only hover CSS is scoped through `.root.blogCard:hover`; no generic Test hover border/shadow/background rule was found in HEAD card module. | aligned, grade C | `docs/design/design.md:293-296`, `docs/design/design.md:398-409`, `HEAD:src/features/landing/grid/landing-grid-card.module.css:51-68` |
| `design.md §7.4` Blog no-expanded + whole-card link | Blog cards are forced to visual Normal when `state='expanded'`, render a `<Link>`, and do not render expanded shell/body/primaryCTA. | aligned, grade B | `docs/design/design.md:312-319`, `docs/req-landing.md:259-275`, `docs/req-landing.md:387-397`, `HEAD:src/features/landing/grid/landing-grid-card.tsx:953-965`, `HEAD:src/features/landing/grid/landing-grid-card.tsx:1158-1173`, `HEAD:tests/unit/landing-card-contract.test.ts:391-423`, `HEAD:tests/e2e/grid-smoke.spec.ts:886-948` |
| `design.md §7.4` Blog `Read more ->` structure | HEAD renders non-interactive `data-slot="blogReadMore"` with label/arrow children, 6px gap, no nested controls, hidden until hover/focus on hover mode and visible in mobile/tap mode. | aligned except W12 ink, grade B | `docs/design/design.md:312-319`, `HEAD:src/features/landing/grid/landing-grid-card.tsx:493-510`, `HEAD:tests/e2e/grid-smoke.spec.ts:886-948` |
| `design.md §7.4`, BQ-35 Blog CTA ink | BQ-35 says Blog `Read more ->` should use card-scoped ink `#6B6B76`. HEAD uses `text-[var(--muted-ink)]` and `.blogReadMore` only sets `width:max-content`; no scoped `--blog-read-more-ink` exists in HEAD. | 3 authority/status conflict | `docs/decision-register.md:315-320`, `HEAD:src/features/landing/grid/landing-grid-card.module.css:15-18`, `HEAD:src/features/landing/grid/landing-grid-card.module.css:117-119`, `HEAD:src/features/landing/grid/landing-grid-card.tsx:493-497`, `docs/wave-roadmap.md:376-387` |
| `design.md §7.5` Unavailable card | HEAD uses warm `--surface-soft`, thumbnail opacity 0.72, title/subtitle full opacity, one standard lowercase `coming soon` tag in the tags row, no overlay/dash/dot, and semantic disabled button outside tab order. | aligned, grade B | `docs/design/design.md:321-326`, `docs/decision-register.md:234-239`, `HEAD:src/features/landing/grid/landing-grid-card.module.css:19-23`, `HEAD:src/features/landing/grid/landing-grid-card.module.css:70-82`, `HEAD:src/features/variant-registry/source-fixture.ts:109-133`, `HEAD:tests/unit/landing-card-contract.test.ts:334-388`, `HEAD:tests/e2e/grid-smoke.spec.ts:1464-1480`, `HEAD:tests/e2e/grid-smoke.spec.ts:1640-1655` |
| `design.md §7.7` responsive column thresholds | Code follows `req-landing` measured grid inline-size thresholds: 1160/1040 and mobile <=767. `design.md` also contains viewport-style 1024/860/768 wording. Product requirements outrank design.md, so this is not code drift; design.md has a lower-authority wording conflict. | 3 design authority conflict | `docs/design/design.md:337-347`, `docs/req-landing.md:191-203`, `HEAD:src/features/landing/grid/layout-plan.ts:63-109`, `HEAD:src/features/landing/grid/layout-plan.ts:143-182` |
| Design resources / visual proof | Local screenshot inventory only contains `canvas-overview.png`, `desktop-full.png`, `desktop-nav-expanded.png`, `expanded-card-spec.png`; no local native mobile browse screenshot or token/style CSS resource was found under current `docs/design/resources/screenshots`. | grade D evidence gap | `docs/design/design.md:370-395`, local inventory observed under `docs/design/resources/screenshots/` |

## 2. Candidate Fix List

These are analysis candidates only. This document does not approve or request implementation.

### 2.1 Confirmed 2 Candidate

| ID | File / selector | Current HEAD | Design expectation | Evidence |
| --- | --- | --- | --- | --- |
| R2-CF-01 | `src/features/landing/grid/landing-catalog-grid.tsx` `.landing-grid-container`, `.landing-grid-row` | `gap-[15px] md:gap-4` = 15px mobile, 16px tablet/desktop | Preserve mobile 14-16px; realize 20px tablet and 24px desktop gutter from `design.md §7.7`. Side padding is already handled separately in `PageShell`. | `docs/design/design.md:337-347`, `HEAD:src/features/landing/grid/landing-catalog-grid.tsx:198-209`, `docs/req-landing.md:181-202`, `HEAD:src/features/landing/shell/page-shell.tsx:17-23` |

### 2.2 Conditional Candidates After Escalation Ruling

These are not classified as final 2 drift until the user resolves the Wave 12 status conflict in Section 3.

| ID | File / selector | Current HEAD | BQ-35 / design expectation | Evidence |
| --- | --- | --- | --- | --- |
| R2-CF-W12-01 | `src/features/landing/grid/landing-grid-card.module.css` mobile normal title/subtitle selectors | No HEAD selector for `.root[data-card-viewport-tier='mobile'] :global(.landing-grid-card-title-normal)` / subtitle. Base classes only provide `overflow-wrap:anywhere`. | Scoped mobile `word-break: keep-all; overflow-wrap: anywhere;` for Normal title/subtitle. | `docs/design/design.md:81-86`, `docs/design/design.md:116-117`, `docs/decision-register.md:315-320`, `HEAD:src/features/landing/grid/landing-grid-card.module.css:1-180`, `HEAD:src/features/landing/grid/landing-grid-card.tsx:212-214` |
| R2-CF-W12-02 | `src/features/landing/grid/landing-grid-card.tsx` `LANDING_GRID_CARD_TAG_CHIP_CLASSNAME` plus module tag-chip rule | Tag chip class contains `leading-[1.2]`; no module line-height override in HEAD. | Remove stale tag-chip `leading-[1.2]` from the class and realize shared catalog tag line-height `1.35` in scoped CSS. | `docs/design/design.md:142`, `docs/design/design.md:248-249`, `docs/decision-register.md:315-320`, `HEAD:src/features/landing/grid/landing-grid-card.tsx:222-223` |
| R2-CF-W12-03 | `src/features/landing/grid/landing-grid-card.module.css` `.blogReadMore`; `landing-grid-card.tsx` readMore class | `text-[var(--muted-ink)]`; `.blogReadMore` only sets `width:max-content`; no `--blog-read-more-ink`. | Card-scoped `--blog-read-more-ink:#6b6b76`; `.blogReadMore { color: var(--blog-read-more-ink); text-decoration:none; }`; remove stale `text-[var(--muted-ink)]` from the CTA class. | `docs/decision-register.md:315-320`, `HEAD:src/features/landing/grid/landing-grid-card.module.css:15-18`, `HEAD:src/features/landing/grid/landing-grid-card.module.css:117-119`, `HEAD:src/features/landing/grid/landing-grid-card.tsx:493-497` |

## 3. Escalations Requiring User Ruling

1. Wave 12 status conflict.
   - User prompt includes Wave 12 in the completed Normal browse surface and lists BQ-35 values as exceptions.
   - Current roadmap says Wave 12 is `계획`, "Not completed in current repo", and no Wave 12 completion commit/tag is recorded.
   - HEAD `decision-register.md` records BQ-35/BQ-36 decisions, but HEAD implementation/tests do not contain W12 source/test anchors; `git grep "W12-mobile" HEAD -- tests src` returns no source/test hits.
   - Local dirty worktree appears to contain W12-like uncommitted changes, but those are excluded by the HEAD baseline.
   - Ruling needed: should R2 treat BQ-35 as already binding against HEAD, or should W12 items stay deferred until Wave 12 lands?

2. Responsive breakpoint wording conflict.
   - `req-landing.md` owns layout behavior and says column mode derives from measured `.landing-grid-container` inline-size with 1160/1040 thresholds.
   - `design.md §7.7` also says realized viewport-style thresholds: desktop >=1024, medium 860-1023, lower tablet 768-859.
   - HEAD code follows req-landing, so no code fix is proposed here. A later authority cleanup may be needed if design.md is meant to express grid-inline thresholds rather than viewport shorthand.

3. Design resource proof gap.
   - `design.md §9` names mobile browse, tablet full page, token CSS, and component CSS resources, but the local screenshot folder currently contains only four PNGs and no native mobile browse screenshot.
   - Source/test alignment cannot prove final visual parity. Any closure claim needs computed/browser inspection or refreshed design resources, after separate approval.

## 4. Evidence Grade and Verification Duties

| Claim area | Current grade | Why | Verification duty, not executed here |
| --- | --- | --- | --- |
| Available card surface/tokens | B | HEAD source and existing tests cover structural values; tests were not rerun. | Computed style check for Test/Blog/Unavailable on Desktop/Tablet/Mobile before closure. |
| Title/subtitle type and clamp | B | HEAD source and existing unit/e2e assertions cover clamp and full mobile subtitle. | Native browser computed checks for title/subtitle font, line-height, clamp, wrapping, and overflow at 360/390/767/768/900/1440. |
| Mobile keep-all | D | BQ-35 says expected; HEAD lacks scoped rule; roadmap says W12 incomplete. | User ruling first; then computed word-break/overflow-wrap checks if authorized. |
| Tag chip visual treatment | B for border/fill/radius/padding/no-dot; D for line-height | BQ-30 is realized; BQ-35 line-height is not in HEAD. | Computed tag `line-height`, border, fill, radius, padding, nowrap at all target breakpoints. |
| Blog Read more structure | B | HEAD source/test cover non-interactive structure, label/arrow split, gap, hover/mobile visibility. | Computed color remains unresolved; verify after W12 ruling. |
| Unavailable card | B | HEAD source/test cover surface, status tag, no overlay/dot, thumbnail dim, title/subtitle opacity, disabled trigger. | Computed color/opacity pass for Desktop/Tablet/Mobile and locale wrapping. |
| Grid gutter | C | Static class mismatch is visible, but exact responsive realized pixels need browser confirmation. | Computed `.landing-grid-container` / row `gap` at desktop, tablet, mobile; confirm no side-padding confusion. |
| Responsive columns | B for code vs req; D for design wording | Code matches higher-priority req-landing, but design.md wording differs. | Authority cleanup/ruling, not implementation. |
| Visual resource parity | D | Local screenshots do not cover the full requested mobile/tablet/desktop card matrix. | Browser captures or design-resource inventory update after separate approval. |

No basic gates were run because the user explicitly prohibited lint/typecheck/test/build. No snapshot or baseline command was run.

## 5. Next Step

Next step is senior review of this analysis, then user ruling on Section 3. Only after separate approval should any fix scope be authorized. This analysis deliberately does not issue an implementation prompt, does not approve candidates, and does not request snapshot/baseline work.
