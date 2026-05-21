# Decision Register

This document is intended to provide information that can serve as the final basis for judgment when interpretation is unclear due to conflicts among the provided documents.

| ID | Decision | Source / 근거 | Implementation impact | Include in first implementation wave? | Notes / caveats |
|---|---|---|---|---|---|
| BQ-01 | Claude Design canonical source는 PDF가 아니라 현재 prompt + 이번 override | 사용자 override, Pre-Rebuild conflict register | PDF-only 요소 제거: `PREVIEW QUESTION`, A/B badge, `READ`, Expanded Blog, `have taken`, dot pill 금지 | Yes, **scope guard only** | PDF에는 해당 충돌 요소가 실제로 남아 있음. |
| BQ-02 | Blog card Expanded state 제거 | 사용자 override, Phase 1/2 방향 | Blog는 Normal card direct navigation으로 전환 | No | Behavioral change이므로 첫 wave 제외 |
| BQ-03 | Desktop GNB는 `English / ☀` static pill visual, 기능은 추후 phase | 사용자 override, Phase 2 nav direction | GNB settings/dropdown 제거 또는 비노출은 별도 GNB wave | No | 현재 GNB는 locale/theme 기능과 결합되어 있어 high-risk |
| BQ-04 | 현 rebuild는 light mode only, dark/system은 추후 phase | 사용자 override, Phase 2 light-first | theme bootstrap / dark tokens 정리는 별도 theme wave | No | `public/theme-bootstrap.js`, `globals.css`는 cautious path |
| BQ-05 | 첫 rebuild 범위는 landing 중심 최소화 | 사용자 override | PageShell/GNB/Test/History는 첫 wave에서 제외 | Yes, **scope guard** | landing card 내부에서도 transition/telemetry/registry는 보존 |
| BQ-06 | result pipeline 제외 | 사용자 override, current runtime status | result URL, history, derivedType, share/result page 작업 금지 | No | 현재 result pipeline은 live 연결 전 target contract로 남아 있음. |
| BQ-07 | 기존 visual regression baseline 폐기, rebuild 완료 후 새 baseline 승인 | 사용자 override | `qa:visual:full`, snapshot 등록, baseline 승인 작업 제외 | No | validation 명령 제안은 가능, baseline 생성은 금지 |
| BQ-08 | Normal card order는 `Thumbnail → Title → Subtitle → Tags`이며 Wave 1에서 반영한다 | 사용자 override, wave-roadmap Wave 1 | Wave 1 Normal face seam 적용; card contract tests 업데이트 허용 | Yes | 상세 scope 및 exclude 목록은 wave-roadmap Wave 1 참조 |
| BQ-09 | Expanded test는 label/badge 제거, text + `→`, meta `completed` | Pre-Rebuild decision, Phase 2 prompt | expanded test content/visual wave에서 반영 | No | A/B 선택의 storage/transition side effect는 보존 |
| BQ-10 | Unavailable card는 no hover/no click/no tap, no dot pill | Pre-Rebuild decision, Phase 1/2 | unavailable behavior + visual wave에서 반영 | No | `tabIndex=-1`, no expand handler 확인 필요 |
| BQ-11 | Mobile expanded는 shape/position만 Claude Design 기준, swipe-down close는 제외 | Pre-Rebuild decision | mobile expanded visual/layout wave에서 반영 | No | swipe-down은 미결정이므로 어떤 wave에도 포함 금지 |
| BQ-12 | resolver, telemetry, transition, test route contract는 보존 surface | Pre-Rebuild report, project-analysis, AGENTS | 첫 wave 및 landing visual waves에서 직접 수정 금지 | Yes, **guard only** | registry/runtime boundary와 transition storage는 변경 금지. 단, Logic Improvement Protocol(BQ-18)에 따라 사용자가 승인한 개선 항목은 예외. |
| BQ-18 | Business logic의 KARD default를 Keep에서 Evaluate first로 변경한다. Keep/Replace는 매 Wave Analysis에서 Logic Improvement Protocol 기준으로 평가하며 기본값 없이 결정한다 | 사용자 override, Planning Agent system prompt revision | 모든 Wave Analysis 프롬프트에서 business logic을 자동 Keep으로 처리하지 않고 6개 레이어(state, hooks, routing, storage, telemetry, i18n) 전체를 평가 대상으로 포함 | Yes, **process guard** | 평가 기준 우선순위: 1) Modern React patterns 2) 단순성·유지보수성 3) 성능 4) 테스트 가능성 5) a11y 로직 |
| BQ-19 | 매 Wave 구현 전 Analysis-Only Coding Agent 작업을 필수 gate로 지정한다. Analysis 보고서 검토 및 improvement candidate 승인 없이는 어떤 wave 구현 프롬프트도 발행할 수 없다 | 사용자 override, Planning Agent system prompt revision | Wave 구현 프롬프트에 반드시 `Logic Improvement: [candidate IDs] approved` 또는 `no candidates approved` 명시 필요. Analysis gate 미완료 시 Planning Agent는 구현 프롬프트 발행을 거부 | Yes, **process guard** | Analysis 보고서 필수 포함 항목: affected layer, change magnitude (Low/Medium/High), improvement value (기준 1~5), risk/rollback, wave dependency |
| BQ-20 | Review Rules의 `verified business logic` 보호 항목에 Logic Improvement Protocol 승인 예외를 추가한다 | 사용자 override, Planning Agent system prompt revision | Coding Agent 결과물 리뷰 시, BQ-19 승인 프로세스를 거친 business logic 변경은 계약 위반으로 분류하지 않음 | Yes, **review guard** | BQ-12와 정합성 유지: BQ-12 Notes에 동일 예외 조항 반영 완료 |
