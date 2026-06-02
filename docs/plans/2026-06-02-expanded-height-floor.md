# Expanded 카드 height floor (Normal ≥ 불변식) + Expanded choice 수직 정렬

> **Task mode: Implementation → 결과: E 무변경 종결 + A–D Wave 6 이관.** BQ-19 gate(2026-06-02 위반 분석).
> Logic Improvement: none. visual/geometry-only. RC W1–W5 후속, Wave 재번호 없음.
> 핵심: 조사 결과 A–D(height floor)는 현재 보존 계약과 직접 충돌하여 Wave 6으로 이관, E는 실측상 이미 충족되어 무변경 종결. **코드 변경 없음 — 본 문서가 유일 산출물.**

## 1. Metadata (AGENTS §7 + rebuild 필드)

| Field | Value |
|---|---|
| Plan date | 2026-06-02 |
| Workspace | confirmed active local `main` (repo root) |
| Task mode | Implementation (결과적으로 코드 무변경 / 분석·이관 산출) |
| Wave range | W1–W5 후속. **A–D는 Wave 6(row height stability)으로 이관** (BQ-17: geometry isolation은 Wave 6 defer) |
| SSOT contract | `design.md` §6.5/§7.3 (Expanded ≥ resting cell, surplus는 last-choice↔meta 단일 flex spacer에만; **"min-height:100%로 표현 금지"**), §6.4, §7.8; `req-landing.md` §6.7(3)(content-fit, fixed height 금지, same-row non-target 0px), (5) clipping 금지 |
| Reference-only (불변) | `legacy/reference`; checkpoints; `superseded/**` |
| Logic Improvement | None — behavior 전부 보존 |

## 2. 변경 대상 / 실제 변경

- 변경 대상(프롬프트): `landing-grid-card.tsx` (+ 필요 시 `module.css`).
- **실제 변경: 없음.** A–D는 이관, E는 무변경 종결. 본 plan 문서만 신규.

## 3. A–D (Expanded height floor) — Wave 6 이관 (이번 미구현)

### 근본 원인 (확정)
- Desktop overlay 경로에서 `landing-grid-card.module.css:59-64`가 `expandedShellFrame/Shell/Surface`를 `min-height:0; height:auto`로 덮어써(base의 `min-h-full` 무효화) **cell-height floor가 없음**. 콘텐츠가 cell보다 짧으면 expanded가 normal보다 짧아짐. Unit 4 인라인 meta로 콘텐츠가 짧아지며 발현.
- 프롬프트의 전제("expandedSurface가 `[min-height:100%]` floor를 받음")는 **사실과 다름** — 그 `min-h-full`(L989)은 mobile/in-flow 경로이며 desktop overlay surface는 위 규칙으로 0이 됨.

### 보존 계약과의 충돌 (이관 사유)
- 순수 CSS로 floor를 주려면 surface/shell의 `min-height`를 cell 높이로 줘야 하나, `grid-smoke.spec.ts:939-940` B4-short-expanded가 `shell/surfaceMinHeight === '0px'`를 **단언**하고, 프롬프트가 B4 보존을 요구함.
- 사용자 판정: 이 `0px` 단언은 **버그가 아니라** `design.md §7.3`("min-height:100% 금지") + `req-landing §6.7(3)`(content-fit/fixed-height 금지)와 **정합하는 의도된 계약**. 따라서 B4 갱신(옵션1) 거부.
- `design.md §7.3`의 정답 기제(옵션2) = resting height를 **explicit pixels로 측정 → floor 주입 → last-choice↔meta 단일 flex spacer가 surplus 흡수**. 이는 `use-grid-geometry-controller`/`baseline-manager`(AGENTS §4 High-Risk, Wave 6 대상, BQ-17 defer)를 건드려야 하므로 **현재 보존 계약상 구현 불가**.

### Wave 6 BQ-19 Analysis 입력으로 등록 (이관 사항)
- **위반**: 인라인 meta(Unit 4) 이후 짧은 콘텐츠 expanded 카드가 same-row normal보다 짧아짐 (`design §6.5/§7.3`, `req-landing §6.7(3)` 위반). Wave 6 Include의 "row height stability"에 귀속.
- **요구 기제**: `§7.3`대로 explicit-pixel floor(JS 측정) + last-choice↔meta **단일 flex spacer**가 surplus 흡수. 콘텐츠가 floor 초과 시 spacer 접힘 → content-fit(하단 잔여 0). **`min-height:100%` 표현 금지.**
- **주의(재사용 금지)**: 직전 프롬프트의 CSS-only flex 접근(A–D, 순수 flex spacer + surface min-height 변경)은 `§7.3` explicit-pixel 요건 미충족이며 B4(`min-height:0`)/§6.7(3)와 충돌하므로 **그대로 쓰지 말 것**.
- **격리 제약**: floor/spacer는 expanded 카드 내부에만 영향, same-row non-target track sizing에 **0px 영향**(§6.7(3))이어야 함.

## 4. E (Expanded choice 단일-줄 수직 중앙) — 무변경 종결

### 실측 (running app, 현 body font = Avenir Next, pre-Wave-16)
- 단일 줄 choice 버튼: line-box 상/하 여백 **13px / 13px**(0px 비대칭), content box가 line-box를 정확히 채움, `arrow.top == text.top`(VF-4 단일 줄).
- 글리프 ink 중심은 line-box 중심 대비 **+1.13px**(ink가 오히려 약간 **아래**; 위 여백 4.5px > 아래 2.3px).
- 결론: 프롬프트 전제("텍스트가 박스 위로 쏠림, 상단 여백이 더 좁음")가 **현 렌더에서 재현되지 않음**. 단일 줄은 이미 박스 수직 중앙(±1px 합격 기준 충족). 화면 스크린샷으로도 확인.

### 판정 (사용자 승인)
- **무변경 종결.** 해결할 레이아웃 문제가 실재하지 않음. `items-start` 유지가 옳음(다중 줄 VF-4 = 화살표 첫 줄 고정에 필요, 단일 줄 중앙 안 깨짐). padding 미세조정은 폰트 의존적 → Wave 16 Pretendard 전환 시 재조정 부채이므로 도입 금지.
- 시각적 미세 쏠림은 텍스트가 아니라 **화살표(→) 글리프 광학**(폰트 내 글리프가 광학 중심보다 약간 높게 그려짐) — 박스 정렬 문제가 아니며 ink 중앙 조정으로 해결 불가.

### 후속 후보 (지금 미처리)
- expanded choice 화살표 글리프 광학 쏠림은 **Wave 16 Pretendard 전환 이후** 평가. **폰트 전환 전 nudge 금지**(Avenir Next 기준 보정은 Pretendard에서 재-오차).

## 5. 보존 계약 (이번 세션에서 전부 유지)
- 코드 무변경 → behavior/data-slot/tabIndex/aria/motion/토큰/§6.7/B4/B10/B11/title-continuity(+2px)/Wave 6 overlay geometry/프롬프트 1–4 결과 전부 그대로.
- BQ-07: baseline 재생성·`qa:visual:full` 미수행. 신규 `scripts/qa/*` 없음.

## 6. 검증 (코드 무변경 → 기존 green 유지 확인만)
- Basic Gates: lint → typecheck → test → build 재확인(이번 변경 없음, Unit 1–4 상태 유지).
- 신규 기능 체크/baseline 없음.

## 7. Decisions (사용자 확정)
- Floor 충돌: 옵션 3(Floor 보류·E만) → E도 실측상 무변경 → **A–D Wave 6 이관, E 무변경 종결, 코드 변경 0**.
