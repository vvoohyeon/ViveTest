# Visual Reconciliation R1 — BQ-19 Analysis

> **Task mode:** Analysis Only. This document authorizes no runtime implementation.
> **Scope:** rev4 catalog visual reconciliation, visual-only, through completed Wave 9 card
> surfaces. Wave 10+ behavior and layout work remain closed.
> **Workspace:** `/Users/woohyeon/Local/ViveTest`, branch `main`, HEAD
> `929f83de1d979c2d073f37f1a2ccd8673d765df8`, clean at analysis start.

## 1. Authority and interpretation

Precedence for this pass:

1. `docs/decision-register.md`
2. `docs/req-landing.md` and active project rules
3. `docs/design/design.md`
4. rev4 mockup/screenshots
5. current implementation evidence
6. superseded wave CSS as historical corroboration only

The user confirmed that the existing mobile title contract remains the highest authority:
Mobile Normal and Mobile Expanded show the complete title without ellipsis and may wrap as
needed. Desktop/Tablet Normal alone uses a single-line ellipsis. Desktop/Tablet Expanded shows
the full title while preserving the Normal first-line split.

The same precedence means the existing Normal subtitle clamp remains authoritative:
Normal subtitle is a maximum two-line ellipsis, not unlimited text. Expanded choice text remains
unlimited and untruncated. `design.md` must describe those product exceptions rather than
overriding them with a foundation-level "never truncate" sentence.

## 2. Reference-only inputs

The following are visual evidence and must not be modified:

- `/Users/woohyeon/Documents/GitHub/ViveTest Resources/ddddd/screenshots/Blog normal.png`
- `/Users/woohyeon/Documents/GitHub/ViveTest Resources/ddddd/screenshots/Mobile 390.png`
- `/Users/woohyeon/Documents/GitHub/ViveTest Resources/ddddd/screenshots/Desktop _ 1280.png`
- `/Users/woohyeon/Documents/GitHub/ViveTest Resources/ddddd/screenshots/Mobile focused expand.png`
- `/Users/woohyeon/Documents/GitHub/ViveTest Resources/ddddd/screenshots/Mobile menu overlay.png`
- `/Users/woohyeon/Documents/GitHub/ViveTest Resources/ddddd/screenshots/Tablet _ 920.png`
- `/Users/woohyeon/Documents/GitHub/ViveTest Resources/ddddd/screenshots/Test Card Expanded 360.png`
- `/Users/woohyeon/Documents/GitHub/ViveTest Resources/ddddd/screenshots/Test Card Expanded 400.png`
- `/Users/woohyeon/Documents/GitHub/ViveTest Resources/ddddd/screenshots/Test Normal 380.png`
- `/Users/woohyeon/Documents/GitHub/ViveTest Resources/ddddd/screenshots/Unavailable card.png`
- `legacy/reference` and all checkpoint worktrees
- `docs/design/resources/superseded/**`

## 3. Fix-now findings

| ID | Surface | Current evidence | Required result | Magnitude | Value | Risk / rollback | Wave dependency |
|---|---|---|---|---|---|---|---|
| R1-V-01 | Resting card edge | `--normal-card-border: transparent` | `#e6e2d8` / `--hairline` for Test, Blog, and Unavailable; existing 1px box remains | Low | 5 | Token-only rollback | W3/W8/W9 visual surfaces |
| R1-V-02 | Tag chip | `#f0ece2`, transparent border | `#ece8df` fill + `#d6d1c4` 1px border; 5px radius, no dot, nowrap preserved | Low | 5 | Scoped token/class rollback | Shared W3/W8/W9 tag seam |
| R1-V-03 | Coming-soon copy | Case-bearing locales start uppercase; default copy is uppercase | Lowercase tag label in all locales with casing; caseless scripts unchanged | Low | 4 | Message-only rollback | W9 i18n copy |
| R1-V-04 | Normal surface/type metrics | Rest uses 90% white mix; title lacks `-0.01em`; subtitle is approximately 14.72/1.4 | Exact `#fff` scoped surface, title 20/600/1.3/-0.01em, subtitle 15/400/1.45; current clamps unchanged | Low | 4 | Scoped classes/tokens rollback | W3 visual skin |
| R1-V-05 | Expanded outer/context/meta | Expanded surface uses legacy global divider/shadows; context uses 20/600 title style; only duration number is emphasized | Scoped white surface, sage edge, design shadow; context 14/500/muted; entire duration item emphasized, shared/completed plain muted | Medium | 5 | Visual class/token rollback; no geometry or handlers | W5/W6 completed visual shell |
| R1-V-06 | Blog Read-more spacing | Label and arrow are one text run with a normal word space | Keep hover/mobile behavior, use an explicit 6px visual gap, no nudge/underline/color change | Low | 3 | Markup/class rollback | W8 visual affordance |
| R1-D-01 | `design.md` title/subtitle wording | Foundation says all titles/subtitles/choices never truncate | Describe product exceptions: Desktop/Tablet Normal title 1-line ellipsis; Mobile and Expanded titles full; Normal subtitle follows 2-line clamp; choices remain untruncated | Docs | 5 | Revert doc paragraph | Requirements override visual SSOT |
| R1-D-02 | BQ decisions | BQ-27/BQ-28 are absent from the live register | Record locked border/tag decisions and their scoped implementation boundary | Docs | 5 | Revert decision rows | Process/SSOT |

## 4. Preserve / no-change findings

- **C1 title behavior:** implementation remains unchanged. Desktop/Tablet Normal is one-line
  ellipsis; Mobile and Expanded titles are full. Only typography metrics may change.
- **C2 Blog behavior:** whole-card link, no expanded state, desktop hover reveal, mobile
  always-visible. The isolated artboard's forced Read-more display does not change runtime.
- Normal slot order stays Thumbnail → Title → Subtitle → Tags.
- Normal Test receives no independent hover border/shadow/background.
- Blog remains the only Normal card hover skin.
- Unavailable remains semantic `<button aria-disabled="true" tabindex="-1">`, AT-exposed,
  non-enterable, and full-opacity for title/subtitle.
- Expanded floor remains measured resting `offsetHeight` in pixels with one
  `flex:1; min-height:14px` spacer. No `min-height:100%`.
- Choice text remains unlimited and untruncated. The `→` glyph remains top-aligned through
  `items-start`; BQ-25 prohibits an optical nudge before Wave 16.
- Resolver, routing, transition, storage, telemetry, test entry, state, hooks, and a11y logic
  remain unchanged.
- `src/app/globals.css` and global token promotion remain Wave 16.
- No visual-regression snapshot or baseline regeneration.

## 5. Deferred / boundary findings

| ID | Finding | Disposition |
|---|---|---|
| R1-DEF-01 | `margin-top:auto` / bottom-pinned tag-row conversion | Defer to Wave 10. It changes the active compensation/row-height model and is explicitly inside grid-rhythm scope. |
| R1-DEF-02 | Mobile focused-expanded redesign | Defer to Wave 13 exactly as requested. |
| R1-DEF-03 | Hero removal | Preserve BQ-23 deferral. |
| R1-DEF-04 | Arrow optical nudge | Preserve BQ-25 deferral to post-Pretendard/Wave 16 review. |
| R1-DEF-05 | Global token consolidation | Preserve BQ-04/Wave 16 boundary. |
| R1-DEF-06 | Visual baseline regeneration | Prohibited by BQ-07. |

## 6. BQ-19 logic-layer review

No logic improvement candidate is warranted.

| Layer | Finding | Decision |
|---|---|---|
| State | Visual states and availability gates already express the required card types | Keep |
| Hooks/controllers | No visual change needs controller state or viewport logic | Keep |
| Routing | Blog whole-card route and Test entry routes are correct | Keep |
| Storage | No storage contract is involved | Keep |
| Telemetry | No event change is involved | Keep |
| i18n | Existing key is sufficient; values only need casing normalization | Adapt copy values only |
| A11y logic | Existing semantics and tab-order rules are correct | Keep |

**Logic Improvement line for implementation:**  
`Logic Improvement: no candidates approved — preserve existing logic.`

## 7. Existing validation debt discovered at HEAD

The requested static gates were run before implementation:

- Phase 4: pass
- Phase 5: fail on stale Blog-expanded markers (`cardSubtitleExpanded`, `Blog Expanded`)
- Phase 6: pass
- Phase 7: pass
- Phase 8: pass
- Phase 9: fail on removed primary-CTA cursor constants
- Phase 10: pass
- Variant registry and variant-only gates: pass

Phase 5 and Phase 9 failures predate R1 and describe contracts removed by Wave 7/8. They are
not visual regressions. Because the requested Done gate includes existing check-phase gates,
the implementation plan includes a narrow Ask-First QA maintenance unit that updates only those
stale static assertions to the already-approved whole-card Blog/no-primary-CTA architecture.

## 8. Recommendation

Use a **targeted re-anchor plus bounded reconciliation**:

1. Re-anchor `design.md` and the decision register.
2. Write failing contract/computed-style tests.
3. Change only scoped card tokens, visual class strings, copy values, and stale QA assertions.
4. Run the full requested gates without snapshots.

Rejected alternatives:

- **A1–A3 only:** misses material rev4 mismatches explicitly covered by the remainder rule.
- **Full mockup parity:** crosses Wave 10/13/16 boundaries and conflicts with product requirements.

## 9. Readiness

The implementation is ready after explicit approval of
`docs/plans/2026-06-08-visual-reconciliation-r1.md`. Approval also confirms the corrected
requirement-accurate `design.md` wording and the narrow Phase 5/9 static-QA maintenance unit.

