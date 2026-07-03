# R2-CF-01 Grid Gutter Verification

## 0. Mode / Scope

- Mode: Analysis-Only.
- 기준: working tree. HEAD 기준 비교 아님.
- 유일 산출물: `docs/plans/2026-06-29-r2-cf-01-gutter-verification.md`.
- 금지 준수: 코드/CSS/토큰/기존 문서 편집 없음, 구현 없음, 커밋/푸시/체크포인트 없음, 스냅샷/baseline 생성 없음, 외부 네트워크 접근 없음.
- Local computed check: `127.0.0.1:4173` dev server + Chromium computed style read only. Screenshot capture는 하지 않았다.

Startup state:

```text
pwd: /Users/b-m-2022001/Local/ViveTest
branch: main
HEAD: ddc5dd7
pre-existing status:
A  docs/plans/2026-06-15-wave-12-mobile-browse-card-visual-analysis.md
A  docs/plans/2026-06-19-wave-12-mobile-browse-card-visual-plan.md
 M src/features/landing/grid/landing-grid-card.module.css
 M src/features/landing/grid/landing-grid-card.tsx
 M tests/e2e/a11y-smoke.spec.ts
 M tests/e2e/grid-smoke.spec.ts
 M tests/unit/landing-card-contract.test.ts
?? docs/plans/2026-06-29-r2-code-design-conformance-analysis.md
```

Child `AGENTS.md`: none found under `src`, `docs`, `tests`, `scripts`, `.planning`.

## 1. Short Ruling

R2-CF-01은 **진짜 drift 후보**로 분류한다.

- Mobile gutter: realized `15px`, `design.md` / `req-landing`의 `14-16px` 범위 안이라 OK.
- Tablet gutter: realized `16px`, `design.md` expected `20px` 대비 `-4px`.
- Desktop gutter: realized `16px`, `design.md` expected `24px` 대비 `-8px`.
- `req-landing`은 Desktop/Tablet `16px` 또는 `gap-4`를 grid gutter 권위값으로 소유하지 않는다.
- `decision-register`에는 grid-level gutter `16px` 예외/승인 기록이 없다. BQ-35/BQ-36은 mobile Normal `base_gap` / `subtitle -> tags` 계열이며, 카드 사이 grid gutter 예외가 아니다.

Evidence grade:

- Authority classification: **B+**. `design.md` 값은 명시적이고, `req-landing` 비소유 및 decision 예외 부재를 확인했다. 다만 design.md §7.7의 breakpoint 문구는 viewport-style이라, fix 설계 시 tier/threshold 표현은 `req-landing`의 measured grid inline-size 권위와 다시 맞춰야 한다.
- Realized gutter: **A-**. 360/768/900/1440에서 Chromium computed `column-gap`/`row-gap`를 확인했다. Screenshot/visual parity는 본 노트에서 주장하지 않는다.
- Overall: **drift candidate validated, implementation not authorized**.

## 2. Authority Check

### 2.1 design.md

`docs/design/design.md §5.10`은 spacing scale을 "gaps, padding, and grid gutters" 기준으로 설명하고, `--space-lg: 24px`를 "desktop grid gutter, container side padding"으로 둔다. 같은 단락은 `24px is the desktop grid gutter and the desktop/tablet container side padding`이라고 적어 desktop grid gutter를 명시한다. Evidence: `docs/design/design.md:210-224`.

`docs/design/design.md §7.7`은 responsive catalog의 realized values를 적고, grid gutter를 `24px desktop · 20px tablet · 14-16px mobile`로 명시한다. `20px tablet gutter`는 4px scale에서 일부러 벗어난 catalog-grid-specific value라고 적는다. Evidence: `docs/design/design.md:337-347`.

표현 방식 주의:

- §7.7의 breakpoint thresholds는 "Wide desktop >= 1024px", "Medium 860-1023px", "Lower tablet 768-859px"처럼 viewport-style로 적혀 있다. Evidence: `docs/design/design.md:337-347`.
- 그러나 gutter 값 자체는 grid-inline식 계산식이 아니라 responsive tier별 realized catalog value로 적혀 있다.
- column threshold 권위는 `req-landing`이 measured grid inline-size로 소유하므로, §7.7의 viewport-style threshold wording은 별도 wording 충돌로 다뤄야 한다. 이 점은 gutter 값 24/20의 소유를 무효화하지 않는다.

### 2.2 req-landing

`docs/req-landing.md §6.1`은 container max-width, side padding, breakpoint를 소유한다. Side padding은 Desktop/Tablet `24px` with narrow `20px` allowed, Mobile `16px`이다. Evidence: `docs/req-landing.md:181-189`.

`docs/req-landing.md §6.2`은 grid composition / column rules를 소유한다. 여기서 source of truth는 `.landing-grid-container`의 measured grid inline-size이며, `window.innerWidth - padding` 같은 viewport 추정값을 금지한다. Desktop/Tablet column counts and underfilled behavior are specified here. Evidence: `docs/req-landing.md:191-203`.

Grid gutter 소유 여부:

- `req-landing`은 Desktop/Tablet card-to-card grid gutter 값을 `16px`, `gap-4`, 또는 다른 px 값으로 명시하지 않는다.
- `req-landing`이 gap 수치를 직접 소유하는 것은 Mobile `1열, vertical gap 14~16px`뿐이다. Evidence: `docs/req-landing.md:191-203`.
- 따라서 Desktop/Tablet gutter `16px`는 product requirement 권위로 방어되지 않는다.
- Side padding은 PageShell/page container 문제이고, 본 노트의 대상인 `.landing-grid-row` 내부 card-to-card gutter와 별개다.

### 2.3 decision-register / Project Rules

`decision-register` BQ-21은 `design.md`를 visual SSOT로 운용하되, behavior/scope/QA/routing/telemetry/storage/runtime은 requirements/decision-register/roadmap/repo가 계속 지배한다고 정한다. Evidence: `docs/decision-register.md:189-194`.

Project rules도 같은 precedence를 둔다: `decision-register.md > product requirements > design.md`, 그리고 `design.md`는 visual foundations/tokens/components/application patterns를 소유하되 runtime/behavior/data contracts는 소유하지 않는다. Evidence: `docs/agent-guides/project-rules.md:129-135`.

Gutter 관련 decision grep 결과:

- `gutter` / `gap` / `grid` 검색에서 grid-level gutter `16px` 또는 `gap-4`를 승인하는 예외는 확인되지 않았다.
- BQ-35/BQ-36은 mobile Normal `base_gap` 8px fallback과 SSR-tier determinism 이슈를 다룬다. Evidence: `docs/decision-register.md:315-329`.
- BQ-35 implementation impact는 `geometry/spacing/globals.css` 무변경을 명시하지만, 그 "spacing"은 W12 mobile card visual scope의 `base_gap`/card internals 맥락이다. grid-level container/row gutter 예외로 읽으면 범위가 과확장된다. Evidence: `docs/decision-register.md:315-320`.

Authority 판정:

1. `design.md` 소유(Desktop 24px / Tablet 20px / Mobile 14-16px) -> **drift**.
2. `req-landing` 소유(Desktop/Tablet 16px) -> 해당 없음.
3. 미명세 -> 해당 없음. `design.md`가 visual grid gutter 값을 명시한다.

## 3. Realized Gutter Check

### 3.1 Static Source

Grid-level gap source:

- `.landing-grid-container`: `className="landing-grid-container relative grid gap-[15px] md:gap-4"`.
- `.landing-grid-row`: `className="landing-grid-row grid items-stretch gap-[15px] md:gap-4 [grid-template-columns:repeat(var(--landing-grid-columns),minmax(0,1fr))]"`.
- Row inline style only injects `--landing-grid-columns`, not gutter. Evidence: `src/features/landing/grid/landing-catalog-grid.tsx:198-219`.

Breakpoint override search:

- No `lg:gap-*`, `xl:gap-*`, `2xl:gap-*`, CSS var, or inline grid-gutter override was found for `.landing-grid-container` / `.landing-grid-row`.
- `landing-grid-card.module.css:109-117` has a `tagMeasurementProbe` `gap: 8px`; that is a hidden inline tag probe, not grid-level card gutter.

Computation/injection path:

- `layout-plan.ts` resolves viewport tier and row column counts only; no gap/gutter field exists in `resolveLandingGridColumns` or `buildLandingGridPlan`. Evidence: `src/features/landing/grid/layout-plan.ts:63-109`, `src/features/landing/grid/layout-plan.ts:143-181`.
- `use-card-inline-geometry.ts` reads `getComputedStyle(row).columnGap` as `rowGap` for Blog CTA reservation and visible tag prefix math; it does not write or override grid gap. Evidence: `src/features/landing/grid/use-card-inline-geometry.ts:201-211`, `src/features/landing/grid/use-card-inline-geometry.ts:323-331`.
- `use-grid-geometry-controller.ts` writes card internal `baseGapPx` / `compGapPx` spacing model, not grid row/container gutter. Evidence: `src/features/landing/grid/use-grid-geometry-controller.ts:242-260`.

### 3.2 Computed Style

Computed with local Chromium against working tree dev server. Each viewport waited until `data-grid-tier` matched the expected tier and `data-grid-inline-size` matched the actual container client width.

| Viewport | Tier / mode | Container `column-gap` / `row-gap` | Row `column-gap` / `row-gap` | Design expected gutter | Result |
| --- | --- | --- | --- | --- | --- |
| 360 | mobile / mobile | `15px` / `15px` | `15px` / `15px` | `14-16px` mobile | OK |
| 768 | tablet / two-column | `16px` / `16px` | `16px` / `16px` | `20px` tablet | Drift `-4px` |
| 900 | tablet / two-column | `16px` / `16px` | `16px` / `16px` | `20px` tablet | Drift `-4px` |
| 1440 | desktop / desktop-wide | `16px` / `16px` | `16px` / `16px` | `24px` desktop | Drift `-8px` |

Side padding was not used as gutter evidence. The measured values above are only `getComputedStyle` on `[data-testid="landing-grid-container"]` and `[data-testid="landing-grid-row-0"]`.

## 4. Drift Candidate Definition

If a future implementation is explicitly authorized, the exact candidate would be:

- File: `src/features/landing/grid/landing-catalog-grid.tsx`.
- Selectors/classes: `.landing-grid-container`, `.landing-grid-row`.
- Current working-tree value: `gap-[15px] md:gap-4`.
- Expected visual authority: preserve Mobile `14-16px`; realize Tablet `20px`; realize Desktop `24px`.
- Current realized values: Mobile `15px`, Tablet `16px`, Desktop `16px`.
- Delta: Tablet `-4px`, Desktop `-8px`.

Risk note:

- This is a grid-level change on the Wave 10 completed landing grid surface, not a card-internal visual tweak.
- Any future fix would require Desktop/Tablet non-regression coverage for row/column geometry, expanded containment, overflow `0px`, same-row behavior, and a11y-visible landing flow.
- Relevant project landing validation anchor includes phase 4-10 QA scripts, landing/GNB unit tests, and `grid-smoke` / `state-smoke` / `gnb-smoke` / `a11y-smoke`. Evidence: `docs/agent-guides/verification-commands.md:53-82`.
- No fix prompt is issued here.

## 5. Closeout

Classification: **design.md-owned grid gutter drift candidate**.

This note does not approve, request, or implement a fix. It only verifies that R2-CF-01 is not merely a `design.md` wording conflict equivalent to the column-threshold issue: for gutter values, `req-landing` does not own Desktop/Tablet `16px`, and no decision-register exception preserves `gap-4` as the intended Desktop/Tablet grid gutter.
