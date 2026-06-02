# RC W1–W5 follow-up — Normal card spacing/title 정합 + Expanded choice arrow 정렬

> **Task mode: Implementation.** Authorized by the BQ-19 Analysis gate (2026-06-01 분석 보고).
> Logic Improvement: **no candidates approved** — business logic 무변경.
> Initiative: RC W1–W5 design-SSOT reconciliation 후속, **visual-only**. Wave 재번호 없음.

## 1. Metadata (AGENTS §7 + rebuild 필드)

| Field | Value |
|---|---|
| Plan date | 2026-06-01 |
| Workspace | confirmed active local `main` (repo root per `git worktree list`) |
| Task mode | **Implementation** |
| Wave range | W1–W5 reconciliation 후속; no roadmap renumbering |
| SSOT contract | `docs/design/design.md` §6.1 (base card 16px padding, 사방 균일), §6.2 (thumbnail 16/6, 패딩 안쪽 자연 여백), §5.1 (Card title 20px / 600 / 1.3), §6.4 (choice top-aligned icon); `docs/req-landing.md §6.7` base_gap/comp_gap 계약 |
| Reference-only (불변) | `legacy/reference`; checkpoints `w01-02`…`w15-17`; `docs/design/resources/superseded/**` |
| Logic Improvement | None approved — resolver/transition/telemetry/storage/routing/test-entry/answer-choice/i18n behavior 보존 |

## 2. 변경 대상 (정확히 이 파일만)

- `src/features/landing/grid/landing-grid-card.tsx`
- `landing-grid-card.module.css` — **불필요로 판단**, 변경 안 함 (모든 수정이 utility-class로 가능; scoped 토큰값 무변경)

## 3. 수정 내용

### A. VF-3/VF-2 — 썸네일 inset 17px 통일
`LANDING_GRID_CARD_THUMBNAIL_SLOT_CLASSNAME`(L214-215)에서 `mt-[var(--landing-card-base-gap)]` 제거.
trigger 16px padding + root 1px border = 사방 17px inset이 그대로 적용되어 thumbnail이 콘텐츠 최상단에 위치.
trigger 패딩/ root/content padding 추가·중복 **금지**.

### B. VF-1 — thumbnail → title base_gap 복원 (§6.7 준수)
A로 thumbnail mt가 사라진 만큼을 **title 위쪽**에 base_gap으로 부여. `NormalCardTitle`에 `topGap` prop을 추가하고,
`NormalCardFace`에서 `presentation === 'collapsed'`일 때만 `mt-[var(--landing-card-base-gap)]` 적용
(`expandedTitleOnly`에서는 미적용 → 그 presentation은 thumbnail이 없으므로 title이 inset top에 위치).
- §6.7: 이 간격은 순수 base_gap(정적 `mt`). `margin-top:auto`/`space-between`/filler/pseudo spacer **금지**. comp_gap은 기존대로 `subtitle→tags` tags-gap 구간에만.
- **핵심 불변식:** 8px를 thumbnail-위 → title-위로 이동만 함. thumbnail 높이 불변이므로 **title의 절대 위치 불변**, content 전체 높이 불변. 이동하는 것은 thumbnail(위로 8px, 대칭 inset). → B10/B11 natural-height/comp 수식·title-continuity 정렬 무영향.

### C. G1 — Normal 타이틀 20px / 600 / 1.3
`LANDING_GRID_CARD_TITLE_BASE_CLASSNAME`(L210-211): `text-[1.04rem] leading-[1.35]` → `text-[20px] font-semibold leading-[1.3]` (design §5.1).
- base class는 normal title + desktop expanded title `<h2>`가 공유 → 두 title metric이 동일하게 유지되어 **title-continuity split 정합 유지**.
- desktop `line-clamp-1` 유지. mobile 확장 헤더 title(`LANDING_GRID_CARD_MOBILE_TITLE_CLASSNAME`)은 base class 미사용 → 무영향(범위 밖).
- 폰트 패밀리(body font) 무변경.

### D. VF-4 — Expanded choice 화살표 첫 줄 정렬
`LANDING_GRID_CARD_ANSWER_CHOICE_ARROW_CLASSNAME`(L230-231): `mt-[3px]` 제거, `text-[15px] leading-[1.45]` 추가
(텍스트 L229와 동일 line-box). `items-start` 유지 → 화살표가 첫 줄 line-box에 정렬, 다중 줄에서도 첫 줄 고정.
- §6.4 "top-aligned icon"의 정밀 구현 — 위반 아님, design.md 갱신 불필요.

## 4. Impact assessment

- shared shell/GNB: 무관. localization: 무관(메시지 무변경). a11y: arrow `aria-hidden` 유지, 타이틀 가독성 향상(20px). state/flow: data-slot·핸들러·tabIndex·motion 슬롯 무변경.
- geometry: A+B는 height-neutral(검증됨). C는 title 높이 균일 증가(+~3.5px/카드) → 그리드 재측정으로 comp 일관 반영. overlay geometry(Wave 6) 무변경.

## 5. 보존 계약 (변경 금지)

- behavior 전반(resolver/transition/telemetry/storage/routing/test-entry/answer-choice), data-slot 명, tabIndex/aria, motion 슬롯.
- `globals.css` 전역 토큰(Wave 16/BQ-04), scoped `--normal-*`/`--expanded-*` 토큰값.
- req-landing §6.7 base_gap/comp_gap, grid-smoke B10/B11 `contentBottom===tagsBottom`.
- B14 mobile title-continuity `test.fixme`(Wave 13), overlay geometry(Wave 6).
- BQ-07: visual-regression baseline 재생성 금지, `qa:visual:full` 금지.
- meta 레이아웃·썸네일 art(별도 프롬프트) 무변경.

## 6. 검증 게이트 (순서대로)

1. Basic Gates: `npm run lint` → `npm run typecheck` → `npm test` → `npm run build`.
2. grid-smoke 전체: B4/B10/B11 geometry, title-continuity, short-expanded, hover-collapse 회귀 확인.
3. 시각 확인: normal 카드 상/좌/우 inset 17px 균일, thumbnail→title 8px, title 20px/600; expanded choice 화살표 단일/다중 줄 첫 줄 정렬. (title `margin-top` 계산값 == 8px 확인.)
4. `git diff --check`.
- 제외: `qa:visual:full`, baseline 재생성, 신규 `scripts/qa/*`.

## 7. Decisions requiring user confirmation
없음 — 4개 항목 모두 분석 보고에서 승인됨.

## 8. Actual outcome

**Status: 완료·검증·uncommitted (지시 대기).** branch `main`, commit/push/checkpoint 미수행.

### 적용된 변경

| File | 변경 |
|---|---|
| `src/features/landing/grid/landing-grid-card.tsx` | **A** thumbnail slot `mt-[var(--landing-card-base-gap)]` 제거 · **B** `NormalCardTitle`에 `topGap` prop 추가, `NormalCardFace`에서 `presentation==='collapsed'`일 때만 `mt-[var(--landing-card-base-gap)]` 적용 · **C** title base class `text-[1.04rem] leading-[1.35]` → `text-[20px] font-semibold leading-[1.3]` · **D** arrow `mt-[3px]` 제거, `text-[15px] leading-[1.45]` 추가 |
| `tests/e2e/grid-smoke.spec.ts` | title-continuity 단일-라인 가드(`:508`) 허용오차 `+1` → `+2px` (**사용자 승인**). design §5.1의 `leading-[1.3]`를 유지한 상태에서 20px title의 sub-pixel glyph-box overshoot(27.04px vs 27)을 흡수; 2줄 wrap(~2×lineHeight)은 여전히 검출. 주석 추가. |
| `landing-grid-card.module.css` | 변경 없음 (불필요) |
| `docs/plans/2026-06-01-rc-w1w5-normal-spacing-title-arrow.md` | 본 plan 문서 (신규) |

> **Scope note:** 원 프롬프트 "정확히 이 파일만"은 tsx/css였으나, C(`leading-[1.3]`, design §5.1)와 기존 title-continuity 허용오차가 0.04px 충돌. 사용자가 "1.3 유지 + 테스트 보정"을 선택하여 grid-smoke 1줄을 보정함(직전 RC가 시각변경에 맞춰 grid-smoke를 갱신한 선례와 동일).

### 측정 검증 (preview eval, 실측)

- inset: top/left/right = **17 / 17 / 17px** (대칭) ✓ — VF-3/VF-2
- thumbnail→title = **8px**, title→subtitle = **8px** (둘 다 base_gap) ✓ — VF-1, §6.7 "thumbnail→title→subtitle 동일 기준"
- title computed: `margin-top` **8px** (`m-0` vs `mt-[…]` → longhand 우선 확인), font-size **20px**, weight **600**, line-height **26px**(=1.3) ✓ — G1
- expanded choice arrow: font-size **15px**, line-height **21.75px**, `margin-top` **0**, `align-items: flex-start`; arrow-box-center − text-first-line-center = **0px** (첫 줄 광학 중심 정렬) ✓ — VF-4. 다중 줄은 동일 line-box + top-align으로 결정적.

### 검증 게이트 결과

| Gate | Result |
|---|---|
| `npm run lint` | ✓ |
| `npm run typecheck` | ✓ |
| `npm test` | ✓ 479/479 |
| `npm run build` | ✓ |
| grid-smoke 전체 | ✓ **18/18** (B4 geometry-active-frame, B4 short-expanded, B10/B11 spacing, title-continuity[보정], B13 hover-collapse 포함). A+B는 height-neutral, C는 균일 +~3.5px로 comp 재측정 일관 → 회귀 없음. |
| 시각 확인 | ✓ (위 실측 + mobile-expanded 스크린샷: 화살표 첫 줄 정렬) |
| `git diff --check` | ✓ clean |

**참고 — state-smoke (게이트 외 예방 실행):** functional 12 pass. `:289`는 STATE.md 기록된 parallel worker-contention flake(serial 단독 실행 시 pass). `:352`/`:366`은 **screenshot 비교** 실패이며, 그 대상이 STATE.md가 BQ-07로 이미 deferred 처리한 `expanded-focus-shell.png`/`overlay-focus-shell.png`임. 차이는 **높이만**(403×210→292, 298×193→254)으로 16/6 썸네일 + 20px title로 카드가 높아진 예상 결과. **BQ-07에 따라 baseline 재생성 금지 → 미수행.** functional/geometry 계약 회귀 없음.
