# Decision Register

This document is intended to provide information that can serve as the final basis for judgment when interpretation is unclear due to conflicts among the provided documents.

**역할:** 이곳은 rebuild 제품·설계 결정(`BQ-NN`)의 원장이다 — 확정된 것뿐 아니라 미결·보류·잠정 결정을 상태 태그와 재검토 트리거를 달아 보관한다. 대체·폐지된 결정도 id를 유지한 채 남기고 `Status`로 표시하며, 무엇이 바뀌었는지는 문서 끝 §변경 이력이 갖는다. **규칙이 왜 그 모양인지와 무엇이 이미 기각됐는지는 여기가 아니라 `docs/DECISIONS.md`가 갖는다.** 이 문서는 무엇을 결정했는가에, `DECISIONS.md`는 왜 그렇게 결정했는가에 답한다.

> Each decision is a block anchored by its stable `BQ-NN` id (ids are never renumbered or reused; gaps are intentional). Fields per entry: Decision · Source / 근거 · Implementation impact · Include in first implementation wave? · Notes / caveats.
>
> Optional field: **Status** — 결정이 대체·부분 대체·보류 상태일 때만 붙인다. 날짜 · 무엇이 유효하고 무엇이 대체됐는지 · 현행 규칙 위치 · 재검토 트리거를 한 줄에 적는다. Status가 없는 항목은 원문 그대로 유효하다.

---

## BQ-01
- **Decision** — Claude Design canonical source는 PDF가 아니라 현재 prompt + 이번 override
- **Source / 근거** — 사용자 override, Pre-Rebuild conflict register
- **Implementation impact** — PDF-only 요소 제거: `PREVIEW QUESTION`, A/B badge, `READ`, Expanded Blog, `have taken`, dot pill 금지
- **Include in first implementation wave?** — Yes, **scope guard only**
- **Notes / caveats** — PDF에는 해당 충돌 요소가 실제로 남아 있음.

---

## BQ-02
- **Decision** — Blog card Expanded state 제거
- **Source / 근거** — 사용자 override, Phase 1/2 방향
- **Implementation impact** — Blog는 Normal card direct navigation으로 전환
- **Include in first implementation wave?** — No
- **Notes / caveats** — Behavioral change이므로 첫 wave 제외

---

## BQ-03
- **Decision** — Desktop GNB는 `English / ☀` static pill visual, 기능은 추후 phase
- **Source / 근거** — 사용자 override, Phase 2 nav direction
- **Implementation impact** — GNB settings/dropdown 제거 또는 비노출은 별도 GNB wave
- **Include in first implementation wave?** — No
- **Notes / caveats** — 현재 GNB는 locale/theme 기능과 결합되어 있어 high-risk

---

## BQ-04
- **Decision** — 현 rebuild는 light mode only, dark/system은 추후 phase
- **Source / 근거** — 사용자 override, Phase 2 light-first
- **Implementation impact** — theme bootstrap / dark tokens 정리는 별도 theme wave
- **Include in first implementation wave?** — No
- **Notes / caveats** — `public/theme-bootstrap.js`, `globals.css`는 cautious path

---

## BQ-05
- **Decision** — 첫 rebuild 범위는 landing 중심 최소화
- **Source / 근거** — 사용자 override
- **Implementation impact** — PageShell/GNB/Test/History는 첫 wave에서 제외
- **Include in first implementation wave?** — Yes, **scope guard**
- **Notes / caveats** — landing card 내부에서도 transition/telemetry/registry는 보존

---

## BQ-06
- **Decision** — result pipeline 제외
- **Source / 근거** — 사용자 override, current runtime status
- **Implementation impact** — result URL, history, derivedType, share/result page 작업 금지
- **Include in first implementation wave?** — No
- **Notes / caveats** — 현재 result pipeline은 live 연결 전 target contract로 남아 있음.

---

## BQ-07
- **Decision** — 기존 visual regression baseline 폐기, rebuild 완료 후 새 baseline 승인
- **Source / 근거** — 사용자 override
- **Implementation impact** — `qa:visual:full`, snapshot 등록, baseline 승인 작업 제외
- **Include in first implementation wave?** — No
- **Notes / caveats** — validation 명령 제안은 가능, baseline 생성은 금지. design.md가 참조하는 design reference screenshot은 본 항목의 visual-regression baseline과 별개 아티팩트이며, baseline 재생성 금지는 유지된다(BQ-21).

---

## BQ-08
- **Decision** — Normal card order는 `Thumbnail → Title → Subtitle → Tags`이며 Wave 1에서 반영한다
- **Source / 근거** — 사용자 override, wave-roadmap Wave 1
- **Implementation impact** — Wave 1 Normal face seam 적용; card contract tests 업데이트 허용
- **Include in first implementation wave?** — Yes
- **Notes / caveats** — 상세 scope 및 exclude 목록은 wave-roadmap Wave 1 참조

---

## BQ-09
- **Decision** — Expanded test는 label/badge 제거, text + `→`, meta `completed`
- **Source / 근거** — Pre-Rebuild decision, Phase 2 prompt
- **Implementation impact** — expanded test content/visual wave에서 반영
- **Include in first implementation wave?** — No
- **Notes / caveats** — A/B 선택의 storage/transition side effect는 보존

---

## BQ-10
- **Decision** — Unavailable card는 no hover/no click/no tap, no dot pill
- **Source / 근거** — Pre-Rebuild decision, Phase 1/2
- **Implementation impact** — unavailable behavior + visual wave에서 반영
- **Include in first implementation wave?** — No
- **Notes / caveats** — `tabIndex=-1`, no expand handler 확인 필요

---

## BQ-11
- **Decision** — Mobile expanded는 shape/position만 Claude Design 기준, swipe-down close는 제외
- **Source / 근거** — Pre-Rebuild decision
- **Implementation impact** — mobile expanded visual/layout wave에서 반영
- **Include in first implementation wave?** — No
- **Notes / caveats** — swipe-down은 미결정이므로 어떤 wave에도 포함 금지

---

## BQ-12
- **Decision** — resolver, telemetry, transition, test route contract는 보존 surface
- **Source / 근거** — Pre-Rebuild report, project-analysis, AGENTS
- **Implementation impact** — 첫 wave 및 landing visual waves에서 직접 수정 금지
- **Include in first implementation wave?** — Yes, **guard only**
- **Notes / caveats** — registry/runtime boundary와 transition storage는 변경 금지. 단, Logic Improvement Protocol(BQ-18)에 따라 사용자가 승인한 개선 항목은 예외. 시각 권위는 design.md이나(BQ-21), storage/telemetry/transition/registry 등 behavior 계약은 design.md가 지배하지 않는다.

---

## BQ-13
- **Decision** — Local `main`을 active rebuild implementation workspace로 사용하고, wave/checkpoint branch는 main 완료분을 검증·보존하는 rollback anchor로 사용한다
- **Source / 근거** — 사용자 추가 결정, branch/worktree 운영 검토
- **Implementation impact** — Codex Implementation 기본 branch를 `main`으로 변경. checkpoint branch/worktree는 기본적으로 read/test-only
- **Include in first implementation wave?** — Yes, process guard
- **Notes / caveats** — remote push 방지는 강제하지 않되 Codex는 명시 지시 없이 push 금지
- **Status** — ⚠️ 부분 대체 (2026-09-03). **브랜치 결정은 유효**하다: `main`이 착지 대상이고 checkpoint 브랜치는 read/test-only rollback 앵커다. **workspace 운영 절반은 폐지**됐다 — 워크트리를 만들지 않고 격리 작업공간은 clone이며, 현행 규칙은 `AGENTS.md §4`, 근거는 `docs/DECISIONS.md`. 재검토 트리거: 사용자가 워크트리 선호를 되돌리거나 GitHub Desktop의 브랜치 기반 리뷰 경로가 바뀔 때.

---

## BQ-14
- **Decision** — `legacy/reference`는 pre-rebuild 기준 commit `d3305b7183a9c0f70331ca64baa5531d1164c2c0`에서 분기한 read-only reference로 고정한다
- **Source / 근거** — 사용자 추가 결정
- **Implementation impact** — legacy evidence 수집은 허용하되 legacy worktree 수정 금지
- **Include in first implementation wave?** — Yes, setup guard
- **Notes / caveats** — rollback source가 아니라 reference source
- **Status** — ✅ 유효, 문구만 조정 (2026-09-03). 결정 자체는 그대로다. "legacy worktree 수정 금지"는 이제 "`legacy/reference` **브랜치**에서 구현·수정 금지"로 읽는다 — 해당 워크트리 체크아웃은 철거됐고 브랜치와 기준 commit은 보존됐다.

---

## BQ-15
- **Decision** — Wave checkpoint는 매 wave가 아니라 range checkpoint로 묶고, 이름에 범위를 명시한다: `w01-02`, `w03-06`, `w07-10`, `w11-14`, `w15-17`
- **Source / 근거** — 사용자 추가 결정, wave-roadmap 구조
- **Implementation impact** — checkpoint naming, merge/report 기준 변경
- **Include in first implementation wave?** — Yes, process guard
- **Notes / caveats** — range별 안정 지점을 rollback anchor로 사용
- **Status** — ✅ 유효, 문구만 조정 (2026-09-03). range checkpoint **브랜치** 명명(`w01-02`·`w03-06`·`w07-10`·`w11-14`·`w15-17`)은 그대로 유효하다. 각 range의 워크트리 체크아웃은 철거됐고 rollback 앵커 기능은 브랜치가 갖는다.

---

## BQ-16
- **Decision** — Wave 1은 actual motion이 아니라 motion-ready internal seam만 허용한다
- **Source / 근거** — 사용자 override, Wave 1 Motion-Ready Seam Investigation
- **Implementation impact** — Internal helper/component naming and output-identical seam extraction allowed; CSS animation, Motion primitives, new public slots, layout-affecting wrappers are prohibited
- **Include in first implementation wave?** — Yes
- **Notes / caveats** — Actual motion placement remains deferred; candidate future waves are Wave 5 or Wave 6 depending on content-only vs geometry/sibling impact

---

## BQ-17
- **Decision** — W1-LI-03 desktop expanded shell seam은 revised Wave 1에 조건부 포함한다
- **Source / 근거** — 사용자 override, Wave 1 Logic Improvement Analysis, Wave 1 Motion-Ready Seam Investigation
- **Implementation impact** — `landing-grid-card.tsx` 내부에서 wrapper depth, className, `data-slot`, `onKeyDown`, geometry, sibling behavior가 output-identical일 때만 pure relocation 허용. geometry/sibling isolation이 필요하면 Wave 6으로 defer하고 stop/report
- **Include in first implementation wave?** — Yes
- **Notes / caveats** — Actual overlay isolation, clipping viewport, z-index/absolute geometry, sibling row stabilization, animation은 Wave 1 금지. W1-LI-05 prop grouping은 계속 제외

---

## BQ-18
- **Decision** — Business logic의 KARD default를 Keep에서 Evaluate first로 변경한다. Keep/Replace는 매 Wave Analysis에서 Logic Improvement Protocol 기준으로 평가하며 기본값 없이 결정한다
- **Source / 근거** — 사용자 override, Planning Agent system prompt revision
- **Implementation impact** — 모든 Wave Analysis 프롬프트에서 business logic을 자동 Keep으로 처리하지 않고 6개 레이어(state, hooks, routing, storage, telemetry, i18n) 전체를 평가 대상으로 포함
- **Include in first implementation wave?** — Yes, **process guard**
- **Notes / caveats** — 평가 기준 우선순위: 1) Modern React patterns 2) 단순성·유지보수성 3) 성능 4) 테스트 가능성 5) a11y 로직

---

## BQ-19
- **Decision** — 매 Wave 구현 전 Analysis-Only Coding Agent 작업을 필수 gate로 지정한다. Analysis 보고서 검토 및 improvement candidate 승인 없이는 어떤 wave 구현 프롬프트도 발행할 수 없다
- **Source / 근거** — 사용자 override, Planning Agent system prompt revision
- **Implementation impact** — Wave 구현 프롬프트에 반드시 `Logic Improvement: [candidate IDs] approved` 또는 `no candidates approved` 명시 필요. Analysis gate 미완료 시 Planning Agent는 구현 프롬프트 발행을 거부
- **Include in first implementation wave?** — Yes, **process guard**
- **Notes / caveats** — Analysis 보고서 필수 포함 항목: affected layer, change magnitude (Low/Medium/High), improvement value (기준 1~5), risk/rollback, wave dependency

---

## BQ-20
- **Decision** — Review Rules의 `verified business logic` 보호 항목에 Logic Improvement Protocol 승인 예외를 추가한다
- **Source / 근거** — 사용자 override, Planning Agent system prompt revision
- **Implementation impact** — Coding Agent 결과물 리뷰 시, BQ-19 승인 프로세스를 거친 business logic 변경은 계약 위반으로 분류하지 않음
- **Include in first implementation wave?** — Yes, **review guard**
- **Notes / caveats** — BQ-12와 정합성 유지: BQ-12 Notes에 동일 예외 조항 반영 완료

---

## BQ-21
- **Decision** — `design.md`를 CLAY 구조 기반·VIVE/ViveTest 적응형 design-system foundation 문서(+ ViveTest catalog application layer)로 운용하며 위치는 `docs/design/design.md`로 고정한다. per-wave CSS 추출은 기본 시각 입력에서 퇴역한다
- **Source / 근거** — User operating-policy change, CLAY `DESIGN.md` review, ViveTest IA/visual mockup outputs
- **Implementation impact** — 후속 프롬프트는 `docs/design/design.md`+resources를 시각 권위로 사용. product-specific 시각 결정은 application layer에 귀속. 행위·scope·QA·routing·telemetry·storage·runtime 계약은 requirements/decision-register/roadmap/repo가 계속 지배
- **Include in first implementation wave?** — Yes, **process guard**
- **Notes / caveats** — CLAY는 구조·framing만 기여하며 충돌 시 CLAY 시각값은 비권위. 보충 CSS는 BQ-19 Analysis gate가 design.md 공백을 입증·승인한 경우에만 예외 발행. design.md의 전역 토큰값은 target intent이며 `globals.css` 전역 적용·namespace 정착은 Wave 16(BQ-04 theme cleanup)에서 수행한다. design.md가 참조하는 design reference screenshot은 BQ-07의 visual-regression baseline과 별개 아티팩트이며 baseline 재생성을 승인하지 않는다

---

## BQ-22
- **Decision** — RC W1–W5 thumbnail reconciliation은 최신 Claude Design visual SSOT를 우선해 `16 / 6`을 채택하고, implementation ratio·`grid-smoke` ratio contract·fallback/qmbti thumbnail SVG 재작업을 같은 change set에 포함한다
- **Source / 근거** — 사용자 승인, RC W1–W5 Design-SSOT Reconciliation Analysis
- **Implementation impact** — `aspect-[6/1]`을 `16 / 6` 기준으로 교체하고 관련 E2E ratio assertion 및 SVG viewBox/palette를 동시 갱신한다. Business logic, resolver, storage, telemetry, transition, routing, i18n behavior는 변경하지 않는다
- **Include in first implementation wave?** — No
- **Notes / caveats** — RC-W1W5-01 meta casing은 no-change로 정정. RC-W1W5-06 token parity QA script는 별도 Ask-First 후보로 defer

---

## BQ-23
- **Decision** — 랜딩 상단 hero 밴드는 design.md §7.1(no-hero) 위반이며 제거 대상이나, 현 카드 중심 wave 범위 밖이다. 별도 landing-shell 정합 작업으로 처리하며 카드 wave에 끌어오지 않는다
- **Source / 근거** — mockup vs current_status 비교, design.md §7.1
- **Implementation impact** — hero 제거는 page-shell 표면 작업으로 분리 분류; 카드/expanded wave 범위 외
- **Include in first implementation wave?** — No
- **Notes / caveats** — page-shell은 High-Risk(AGENTS §4); 별도 plan·승인 필요

---

## BQ-24
- **Decision** — Expanded 카드의 "Normal ≥ height floor" 불변식은 Wave 6(row height stability)에서 구현한다. 기제는 design.md §7.3대로 resting 높이를 explicit pixel로 측정해 floor로 주입하고, 잉여 높이는 last-choice↔meta 사이 단일 flex spacer에만 흡수한다. `min-height:100%` 및 CSS-only flex floor 표현은 금지한다
- **Source / 근거** — RC W1–W5 Unit 5 분석(2026-06-02), Unit 4 인라인 meta 이후 floor 회귀 발현
- **Implementation impact** — Wave 6 BQ-19 Analysis 입력. `use-grid-geometry-controller`/`baseline-manager`(High-Risk) 변경 수반. B4-short-expanded의 `shell/surfaceMinHeight==='0px'`는 content-fit 의도 계약이므로 보존, floor는 별도 px 측정으로 운반
- **Include in first implementation wave?** — Yes, **scope guard**
- **Notes / caveats** — §6.7(3) geometry isolation(same-row non-target 0px) 및 (5) clipping 금지와 동시 충족. CSS-only A~D 접근(이전 프롬프트 4)은 §7.3 미충족이므로 재사용 금지

---

## BQ-25
- **Decision** — Expanded choice 화살표(`→`) 글리프의 광학적 수직 쏠림 보정은 Wave 16 Pretendard 전환 이후에 평가한다. 폰트 전환 전 nudge를 금지한다
- **Source / 근거** — RC W1–W5 Unit 5 분석(2026-06-02), 단일 줄 choice 실측(line-box 13/13, ink +1.13px = 박스 중앙)
- **Implementation impact** — 현 Avenir Next 기준 보정은 Pretendard에서 재-오차이므로 도입 보류. `items-start`(다중 줄 VF-4 화살표 첫 줄 고정)는 유지
- **Include in first implementation wave?** — No
- **Notes / caveats** — 텍스트는 이미 박스 중앙; 미세 쏠림 대상은 글리프 광학이며 박스/ink 정렬 문제 아님

---

## BQ-26
- **Decision** — Wave 9 unavailable card는 (a) tab order에서 제외(`tabIndex=-1`, 키보드 skip)하되 semantic `<button>`는 유지하고, (b) coming-soon 신호를 우상단 다크 오버레이가 아니라 tags-row 표준 태그(상시 표시) + `--surface-soft` 표면 + thumbnail subtle dim(0.72)로 표현하며, (c) fixture(`creativity-profile`)의 "(Soon)" 제목 접미사와 중복 coming-soon 태그를 정리한다(topical 태그·`attribute:unavailable` enterable 분류·consumer shape 보존)
- **Source / 근거** — 사용자 결정 D1–D3(2026-06-04), Wave 9 Analysis Report(BQ-19), phase1 IA 사전확정 #3/#7, design.md §7.5/§10
- **Implementation impact** — (a) `interaction-state.ts` `resolveCardTabIndex`가 unavailable에 대해 neutral 상태에서도 `-1` 반환; `a11y-smoke`/`state-smoke` B5 갱신. (b) `landing-grid-card.tsx` `UnavailableCardStatusOverlay` 제거·tags-row 표준 태그화(비 `aria-hidden`); `module.css` scoped `--unavailable-*`(값=design.md §5). (c) `source-fixture.ts` 편집 + `variant-registry.generated.ts` 재생성. req-landing §7.x/§9.2/§13.2 및 design.md §7.5(dim 0.72) 환류
- **Include in first implementation wave?** — No (Wave 9)
- **Notes / caveats** — Analysis의 keep-focusable 권고를 사용자 결정으로 supersede(BQ-20 승인 변경, 계약 위반 아님). a11y는 design.md가 아니라 req-landing이 지배(BQ-21); 본 결정으로 design.md §4.10/§7.5 "removed from tab order" 문구가 사실과 정합되어 정정 불필요. 탭 제외는 a11y 트리/스캔 인지에 영향 없음. W9-LI-02(AT 노출)는 (b)로 충족. BQ-07 baseline 재생성 금지 유지

---

## BQ-27
- **Decision** — Resting Test/Blog/Unavailable card border는 `1px solid --hairline` (`#E6E2D8`)로 통일한다
- **Source / 근거** — 사용자 잠금 결정, Visual Reconciliation R1 rev4 BQ-19 analysis
- **Implementation impact** — 기존 1px border box는 유지하고 scoped card module의 `--normal-card-border` 값만 변경한다. Test/Blog/Unavailable에 동일 적용하며 layout shift는 발생하지 않는다
- **Include in first implementation wave?** — No
- **Notes / caveats** — Normal Test hover effect가 아닌 static structural edge다. `src/app/globals.css` 전역 token promotion은 Wave 16으로 이연한다

---

## BQ-28
- **Decision** — Catalog tag chip은 system-wide로 `--surface-muted` (`#ECE8DF`) fill + `1px solid --hairline-strong` (`#D6D1C4`) border를 사용하고, case-bearing script의 label은 lowercase로 표시한다
- **Source / 근거** — 사용자 잠금 결정, Visual Reconciliation R1 rev4 BQ-19 analysis
- **Implementation impact** — scoped card module의 shared tag class/token과 case-bearing locale source values를 갱신한다. radius 5px, nowrap, ellipsis, no dot을 보존하고 unavailable도 동일 treatment를 재사용한다
- **Include in first implementation wave?** — No
- **Notes / caveats** — Per-type exception 및 CSS `text-transform`을 금지한다. casing은 localized source value가 소유한다. `src/app/globals.css` 전역 token promotion은 Wave 16으로 이연한다

---

## BQ-29
- **Decision** — `--muted` (#7A7A85)는 light surface에서 WCAG AA normal-text 대비(흰 배경 4.24:1)를 충족하지 못한다. R1에서는 expanded card의 context/meta에 한해 scoped `#757580`(4.55:1)을 잠정 적용하고, `--muted` 전역 AA 보정 및 토큰 명명은 Wave 16에서 system-wide로 수행한다(catalog eyebrow 등 잔여 `--muted`-on-light normal-text 포함)
- **Source / 근거** — Visual Reconciliation R1 구현 중 Codex flagged divergence(2026-06-08), 사용자 승인 Option A
- **Implementation impact** — R1: `landing-grid-card.module.css`의 scoped expanded 값만 `#757580`; 전역 `--muted` 토큰 불변; design.md §7.3에 잠정 기록. Wave 16: `--muted`를 AA 충족 값으로 revalue/명명하고 expanded scoped 예외를 제거하며 eyebrow 포함 전 `--muted`-on-light normal-text를 ≥4.5:1로 검증
- **Include in first implementation wave?** — No (R1 잠정 기록, 해소는 Wave 16)
- **Notes / caveats** — BQ-04/BQ-21 global token consolidation(Wave 16)에 귀속. CSS `text-transform` 금지. AA normal-text 기준 4.5:1. eyebrow(§7.1, 14/400 `--muted`)는 Wave 16까지 ~4.2:1로 남는다

---

## BQ-30
- **Decision** — Catalog tag chip의 `1px solid --hairline-strong` 보더를 전역 제거한다(태그는 비인터랙티브 요소). available 카드 태그는 `--surface-muted`(#ECE8DF) fill을 유지하고, unavailable 카드 태그에 한해 1단계 진한 fill(제안값 #E6E2D8) 예외를 적용한다(보더 없음)
- **Source / 근거** — 사용자 잠금 결정(2026-06-08), Claude Design mockup-fix rev3 검토
- **Implementation impact** — BQ-28의 보더 추가 및 "per-type 예외 금지" 조항을 supersede한다. 보더 제거 후 unavailable 태그가 `--surface-soft`(#F4F1EA) 위에서 식별되도록 scoped `--unavailable-tag-bg`(제안 #E6E2D8)를 부여한다. fill #ECE8DF·radius 5/nowrap/ellipsis/no-dot/lowercase 등 나머지 BQ-28 속성은 유지
- **Include in first implementation wave?** — No (Wave 10에서 구현)
- **Notes / caveats** — R1은 BQ-28의 보더 상태로 커밋되어 있으며 본 개정은 Wave 10 코드에서 반영. #E6E2D8은 catalog warm-neutral ladder 1단계로 design.md §5/§7.5 재정합 시 확정. `globals.css` 전역 token promotion은 Wave 16. Wave 10 구현 증거: tag-chip border utility/`--normal-tag-border` 제거, available `#ECE8DF`, scoped unavailable `#E6E2D8`, DOM/computed-style/phase-5 QA 통과

---

## BQ-31
- **Decision** — Wave 10 grid height rhythm의 시각 타깃을 Claude Design mockup-fix rev3로 잠근다: (a) same-row 카드 균일 폭·컨테이너 내 horizontal overflow 0, (b) 데스크톱 hover 확장 폭을 체감 가능한 수준(태블릿 느낌)으로 증대(클립 없음), (c) row 균일 높이(=가장 높은 카드), 잉여 높이는 description↔tags 사이 단일 flex slack으로 흡수(tags bottom-anchored), (d) title 데스크톱·태블릿 1줄 ellipsis / 모바일 전체, (e) description 데스크톱·태블릿 2줄 ellipsis / 모바일 전체, (f) tags+`Read more →`는 항상 1줄(CTA 우선, 너비 부족 시 우측 태그부터 숨김)
- **Source / 근거** — 사용자 잠금 결정(2026-06-08), Claude Design mockup-fix rev3 검토 컨펌
- **Implementation impact** — Wave 10 BQ-19 Analysis 입력. "무엇"은 본 타깃으로 고정하되 "어떻게"(슬랙/높이 기제)는 §6.7 geometry isolation·clipping 금지 및 BQ-24 floor/단일 spacer 모델과 정합하도록 Analysis가 결정한다. `min-height` 고정으로 vertical gap을 0으로 만드는 현 mockup 버그 방식은 금지
- **Include in first implementation wave?** — No (Wave 10)
- **Notes / caveats** — #4 확장 폭은 Wave 6 expansion 기제와, #6 tag-hiding은 Wave 12 mobile browse와 정합 확인 필요. design.md 재정합 및 BQ-30과 함께 Wave 10에서 환류. Wave 10 구현 증거: slack은 측정 `comp_gap`으로만 적용, Desktop 모든 column mode desired `1.10` + stage clamp, Tablet `1.04`, Mobile subtitle full, active horizontal overflow `0` smoke 통과

---

## BQ-32
- **Decision** — Catalog 태그 행은 좌→우 고정 순서로 앞쪽 가시 태그는 항상 전체 표시하고 **마지막 가시 태그만** `--tag-min-width`(56px, border-box)까지 말줄임한다. 다음 태그의 가용 폭이 min-width 미만이면 우측부터 숨긴다(topical 0개 유효). 자연 너비가 min-width 이하인 짧은 태그는 말줄임 없이 전체 표시 또는 숨김. Blog `Read more →` CTA가 태그보다 우선(데스크톱 호버 시 상시)이며 여유가 있으면 태그를 최대 3개까지 표시한다. 호버 폭 변화(W10-LI-03)에 걸쳐 가시 태그 정체성은 안정적이어야 하며(재배열·교체 금지), 마지막 태그 말줄임은 CSS 가변 폭으로 부드럽게 전개되고 새로 들어오는 태그는 이산 mount(model A)한다. Test/Blog/Unavailable 동일 적용, per-type 예외 없음
- **Source / 근거** — 사용자 결정(2026-06-10), Wave 10 BQ-19 analysis §8, BQ-31 target #6 정밀화
- **Implementation impact** — W10-LI-02 visible-prefix resolver가 구현(scoped `--tag-min-width:56px`). req-landing §6.6 계약·static-QA phase 4/5 anchor 갱신. 숨긴 suffix는 가시 DOM에서 unmount. 전역 토큰 미사용
- **Include in first implementation wave?** — Yes (Wave 10)
- **Notes / caveats** — 본 tag-fit/CTA 로직은 코드(req-landing)가 behavior SSOT, 목업은 시각 참조(BQ-21 정합). unavailable은 `coming soon` 1개만 노출=첫 태그이자 우측우선 규칙상 미숨김 → 예외 불필요·AT 노출 유지(req-landing §9.3/§13.2). model A=신규 태그 이산 mount. Wave 10 구현 증거: 12 locale resize down/up prefix identity·재등장, width transition당 visible-count 변경 `<=1`, Tablet/Desktop hover/focus CTA reserve, hidden suffix DOM/a11y 제거, status-first 노출 검증

---

## BQ-33
- **Decision** — Wave 11 Desktop/Tablet keyboard-a11y는 card-aware 즉시 focus command와 controller-owned close command를 각각 단일 소유자로 사용한다. Test focus는 pointer intent를 취소하고 capability와 무관하게 즉시 확장하며, Blog는 enterable/focus-only이고 never expandable다. Test trigger `Enter/Space`는 idempotent `CARD_EXPAND`, Test entry는 A/B-only다. Test trigger/A/B의 `Escape`는 표준 lifecycle로 한 번 닫고 closing 비상호작용보다 먼저 Test trigger에 focus를 확보한다. true in-page focus-out은 destination focus를 보존하고 pure window blur는 disclosure를 유지한다. Test→Test는 source `0ms`/target 표준 motion과 후속 source blur idempotence를 유지하며 Test→Blog는 표준 Test close + Blog focus-only다. 실제 Desktop settings는 non-hidden `div[role="dialog"]`이고 `aria-modal`/focus trap이 없으므로 card safety predicate는 document-wide `[role="dialog"]:not([hidden])`를 사용한다; 첫 Escape는 dialog만, 둘째는 card를 닫는다. Test name은 locale title 단일 `aria-label`로 전 cycle byte-stable하고 trigger `aria-expanded`와 stage `aria-hidden`은 logical disclosure를 함께 따른다; optional `aria-controls`는 생략한다. unavailable은 button-only disabled/name/status ownership과 `tabIndex=-1`을 유지하고 tags hard-coded `aria-label`은 제거한다. Expanded focus-visible은 scoped 2px sage outline + 2px offset이다.
- **Source / 근거** — 사용자 승인 Wave 11 plan + A1-A8 amendments (2026-06-15), W11-LI-01..04, D1-D3
- **Implementation impact** — `interaction-state` classifier, hover-intent cancellation, controller/root keyboard+blur ownership, desktop shell logical-interactivity, stable card ARIA, scoped CSS focus ring, unit/E2E assertions를 구현한다. `req-landing` §§7.6/8.2/8.3/9.1-9.3/14.2와 `design.md` §§6.9/7.2-7.5를 재고정한다.
- **Include in first implementation wave?** — No (Wave 11)
- **Notes / caveats** — BQ-12/21/24/25/26와 Wave 10 motion/geometry/tag 결과를 보존한다. BQ-07 snapshot/baseline 재생성 금지 유지. GNB/mobile/transition/telemetry/storage/routing/registry/test-entry는 수정하지 않는다. Wave 13 keyboard traceability, Wave 15 overlay re-scope 조건, Wave 16 global token migration은 별도 범위다.

---

## BQ-34
- **Decision** — 코드베이스↔Claude Design 시각 토큰 정합의 장기 방향은 design.md §5를 단일 공유 `:root` 토큰 정의(`tokens.css`)로 운용하고 양쪽이 동일 정의를 소비하는 것이다. **권위 교정(2026-06-19):** §5 토큰 값의 권위는 `globals.css`가 아니라 design.md §5(intent) + 코드 module CSS의 Strategy A 스코프 토큰(realized)이며 둘은 일치한다. `globals.css`는 §5를 realize하지 않는 동결 legacy(별개 토큰 시스템)이므로 값 소스 채택 금지(채택 시 하네스가 legacy로 회귀). styles.css 등 realization CSS는 공유 SSOT가 아니다
- **Source / 근거** — 사용자 결정(2026-06-19) + 동일자 evidence: git상 `globals.css` 최신 커밋 2026-05-07(`9ec1396`) 이후 0 커밋 vs 같은 기간 landing-grid-card.module.css 7 커밋(waves 3·5·8·9·10·11 + SSOT 재고정); module CSS 주석이 §5 값을 "Strategy A scoped, Wave 16 global migration까지" 복제로 명시; 하네스 `:root`·module CSS realized·design.md §5 값 delta 0(전수 대조); design.md PKB본·업로드본 byte-identical. 당초 전제 "globals.css가 §5 realize"는 무효 확인
- **Implementation impact** — **값 패리티 이미 성립** → Wave 12 선행 "하네스를 코드 값에 정렬"은 reconcile 대상이 없어 불필요. 공유 `tokens.css` 추출 + 양쪽 소비 및 `globals.css` legacy 교체는 Wave 16 토큰 consolidation에 통합(코드 채택 = Strategy A 스코프 → 전역 `:root` 전환 = Wave 16 작업, BQ-04/21로 그 전 금지). 그때까지 하네스는 `colors_and_type.css` 소비 유지; drift 방지는 저비용 `design.md §5 ↔ 하네스` conformance 점검. behavior/a11y(req-landing/code)·design.md 시각-intent 권위 불변
- **Include in first implementation wave?** — No — Wave 16 consolidation에 통합; Wave 12 선행 작업 불필요(값 패리티 검증으로 종결)
- **Notes / caveats** — §5 글로벌 토큰만 대상; 스코프드 `--normal-*`/`--expanded-*`는 Wave 16. `--muted` #7A7A85(sub-AA 4.24:1)는 BQ-29대로 Wave 16 revalue(여기 미수정). 값 패리티는 §5 리스킨 완료된 landing-grid-card 표면 기준 — test/nav/settings 등 비-landing은 아직 legacy globals.css 토큰 소비 가능, conformance는 해당 wave/Wave 16 소관. 구조/셀렉터 drift(부제 clamp 등) 범위 밖(별도 conformance). BQ-04/21 globals.css 동결·BQ-07 baseline 금지 유지. pixel-parity 보장 아님

---

## BQ-35
- **Decision** — Wave 12 모바일 browse 카드 시각은 W12-LI-01~06을 적용한다: 모바일 Normal title/subtitle에 scoped `word-break: keep-all`(+`overflow-wrap: anywhere`); 공유 catalog tag chip `line-height: 1.35`; Blog `Read more →`는 card-scoped ink `#6B6B76`(흰 배경 5.28:1, WCAG AA); 모바일 `base_gap`은 **8px 유지(fallback)** — SSR이 `INITIAL_VIEWPORT_WIDTH=1280`로 desktop tier에서 출발해 mobile tier가 hydration 후 확정되므로, tier-가변 12px는 8→12 hydration flip(§11.1 위반)을 일으켜 infeasible로 판정; W12 proof는 `assertion:W12-mobile` focused non-snapshot unit + grid-smoke + a11y-smoke(360/390/767); behavior no-change guard 적용
- **Source / 근거** — 사용자 승인 — Wave 12 Analysis Step-2(2026-06-15) + 모바일 reference 실측 룰링(2026-06-19) + A4 feasibility 게이트에서 `8px` fallback 명시 승인(2026-06-19)
- **Implementation impact** — scoped `landing-grid-card.module.css`(keep-all rule, tag `line-height:1.35`, `--blog-read-more-ink:#6b6b76`, `.blogReadMore` color)와 `landing-grid-card.tsx` tag/CTA class 정리(stale `leading-[1.2]`·`text-[var(--muted-ink)]`를 해당 요소에서만 제거; whole-source 금지 아님). geometry/spacing/`globals.css` 무변경. focused W12 unit/e2e/a11y assertion 추가
- **Include in first implementation wave?** — No (Wave 12)
- **Notes / caveats** — BQ-29(#6B6B76 scoped, Wave 16까지)·BQ-30(borderless fill)·BQ-31(모바일 full text·content-driven height)·BQ-32(단일 prefix resolver·CTA/status priority)와 정합. globals.css 동결·전역 토큰 promotion 없음(BQ-04/21), snapshot/baseline 재생성 없음(BQ-07). **mobile `base_gap` 12px + SSR-tier 결정성은 별도 plan으로 deferred**(그 작업이 12px를 unblock). BQ-34와 독립. 잔여 full-E2E 2건(W11 telemetry race `state-smoke.spec.ts:364`, BQ-07 `expanded-focus-shell.png` 403×210 vs 403×295)은 HEAD 55e2808에서도 동일 재현되는 pre-existing debt로 Wave 12 무관 확정

---

## BQ-36
- **Decision** — Wave 12 LI-04에서 mobile Normal `base_gap`의 design.md §5.10 의도값 `12px`는 채택 보류하고 현행 `8px`을 유지(fallback)한다. 근본 원인은 SSR/초기 렌더의 viewport tier 비결정성으로, tier-가변 시각값을 `data-base-gap`/geometry로 운반하면 hydration flip이 발생한다. SSR가 실제 viewport tier를 결정하게 하는 작업과 그것이 unblock하는 mobile `12px` gap은 별도 아키텍처 plan(page-shell 성격, numbered card wave 아님)으로 분리한다
- **Source / 근거** — Wave 12 구현 Unit 0 preflight(2026-06-19): `/en` raw SSR HTML이 `data-grid-tier`/`data-card-viewport-tier="desktop"`·`data-base-gap="8"`로 렌더; 390px live DOM은 layout sync 후 tier=mobile로 전환하나 `baseGap`은 8 유지. 원인 = `src/features/landing/grid/landing-catalog-grid.tsx`의 `INITIAL_VIEWPORT_WIDTH=1280`에서 SSR/초기 렌더 출발 → SSR가 실제 mobile viewport 미인지. ∴ tier-가변 `12px`는 SSR/early `8px`→settled `12px` flip → req-landing §11.1(SSR/hydration determinism) 위반. A4 feasibility hard gate에서 적발, A6대로 구현 전 정지
- **Implementation impact** — Wave 12 = `8px` fallback 확정(design.md §5.10 "realized via utility classes" 단서가 `8px` realized / `12px`는 `--space-sm` reference rhythm을 허용). SSR-tier 결정성은 별도 plan에서 viewport 신호 옵션(client-hints / cookie / CSS-media-driven gap + geometry-read)을 비교·설계하며, 그 작업이 mobile `12px` gap을 unblock한다. design.md §5.10/§7.2·req-landing §6.7는 `8px` fallback note로 재anchor(Wave 12 authority pass, BQ-35)
- **Include in first implementation wave?** — No — 별도 아키텍처/page-shell plan(미일정); Wave 12는 `8px`로 종결, numbered card wave 아님
- **Notes / caveats** — Wave 12 BQ-35 LI-04와 짝(상호참조). BQ-04/21 `globals.css`·전역 토큰 동결, BQ-07 baseline 금지, §6.7 spacing-contract 합의 원칙은 SSR-tier 작업도 §11.1과 함께 준수해야 함. BQ-34(토큰 값 consolidation)와는 독립 축(토큰 값 vs SSR tier 결정성). pixel/visual parity 보장 아님

---

## BQ-37
- **Decision** — Visual Reconciliation R2(code↔design, post-W12)를 확정한다. (1) R2-CF-01 grid gutter drift 교정: `.landing-grid-container`/`.landing-grid-row`의 `gap-[15px] md:gap-4`를 `gap-[15px] md:gap-5 xl:gap-6`로 변경해 Mobile `15px`·Tablet(≥768) `20px`·Desktop(≥1280) `24px`를 실현한다(design.md §5.10/§7.7 소유값 정합). (2) design.md §7.7 column-threshold wording을 req-landing 측정 계약으로 정합하고 viewport 수치(`1024/860/768`)를 manual review approximation으로 강등한다. (3) design.md §9 Resource Manifest를 실제 인벤토리 + conformance-통과 Claude Design 하네스/`wave12-conformance/` reference로 갱신한다. (4) 하네스 conformance(Task B: 부제 clamp `.is-mobile` carve-out, CTA `#6B6B76`, `focus-within` reveal — 하네스 한정)와 코드 conformance(Task A: R2-CF-01 외 un-logged drift 없음)를 certification한다
- **Source / 근거** — R2 conformance 분석(2026-06-29) + R2-CF-01 gutter 검증(2026-06-29): gutter 권위 소재 확인 — design.md §5.10("24px desktop grid gutter")·§7.7("24 desktop·20 tablet·14–16 mobile")가 소유, req-landing은 side padding(§6.1)·측정 column threshold(§6.2)만 소유하고 D/T card-to-card gutter는 미소유, decision-register에 `16px`/`gap-4` 예외 없음 ∴ design.md-owned 코드 drift(Tablet −4·Desktop −8). computed(360=15 / 768·900·1440·1280 검증)로 실현값 확정. fix 구현 검증(2026-06-29): RED(768 container/row=16px, target 20px 실패)→GREEN(360=15 / 768·900=20 / 1280·1440=24); BQ-32 visible prefix count/label 360/768/1440에서 baseline 동일(`qmbti=3, rhythm-b=3, ops-handbook=2, creativity-profile=1`), `rhythm-b` tail ellipsis·56px tail 유지; expanded containment container/document/body horizontal overflow `0`, 768/1440 sibling reflow 없음, row template 동일
- **Implementation impact** — `src/features/landing/grid/landing-catalog-grid.tsx` 단일 파일(2 insertions / 2 deletions); layout-plan/geometry/`use-card-inline-geometry`/module CSS/`globals.css`/토큰 무변경. gutter tier 신호 = viewport breakpoint(옵션 A) — column-mode는 측정 grid-inline-size 계약(req §6.2, `1160/1040`) 불변이고 viewport(768/1280) vs 측정 tier 경계의 미세 불일치는 수용된 cosmetic. side padding(PageShell 24/20/16)·base_gap(BQ-35 `8px`)·probe gap 8px 불변. 검증: `lint`/`typecheck`/`test`(74 files·516 tests)/`build` 통과, `grid`/`a11y`/`state`/`gnb-smoke`(90 passed) + static QA phase 4–10 통과. design.md는 rev2로 §7.7/§9 개정 반영
- **Include in first implementation wave?** — No — inter-wave reconciliation(R1/BQ-21 패턴), numbered wave 아님; Wave 12 배치 커밋에 포함해 종결
- **Notes / caveats** — 알려진 pre-existing 2건 유지(재생성·수정 없음): W11 telemetry race(`state-smoke.spec.ts:364`, Expected 0/Received 1), BQ-07 동결 baseline `expanded-focus-shell.png`(frozen 403×210). 후자는 gutter 확대(16→24)로 column 폭이 좁아져 received가 `403×295→398×293`으로 변동 — 정당한 기하 변화이며 baseline 재생성 금지 유지, post-W17 재생성 시 반영. 정합: BQ-07(baseline 동결)·BQ-13(명시 커밋)·BQ-21(design.md visual SSOT)·BQ-32(단일 resolver, prefix 불변 증명)·BQ-35/36(카드 내부 `base_gap` ≠ grid gutter이므로 독립 축). 1280 경계의 20→24 전환은 측정 column tier와 완전 일치하지 않음(수용된 cosmetic); 거슬리면 `xl` 경계만 후속 미세조정 가능. pixel/visual parity 보장 아님(computed 기반)

---

## 변경 이력

기존 결정이 대체·조정된 기록이다. `BQ-NN` 블록은 그대로 남고 이 표가 무엇이 언제 왜 바뀌었는지를 가리킨다.

| 날짜 | 항목 | 변경 | 근거 |
|:---|:---|:---|:---|
| 2026-09-03 | BQ-13 | workspace 운영 절반 대체 — wave별 워크트리 폐지, 격리 작업공간은 clone. `main` 착지·checkpoint read-only라는 브랜치 결정은 유지 | `docs/DECISIONS.md` · `AGENTS.md §4` |
| 2026-09-03 | BQ-14 | 문구 조정 — "legacy worktree 수정 금지" → `legacy/reference` **브랜치** 수정 금지. 브랜치·기준 commit 보존 | `docs/DECISIONS.md` |
| 2026-09-03 | BQ-15 | 문구 조정 — range checkpoint는 브랜치로만 존속, 워크트리 체크아웃 철거 | `docs/DECISIONS.md` |
