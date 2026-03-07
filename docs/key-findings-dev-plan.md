# Top Priority 10 재검증 및 다음 수정 라운드 계획

## I. 검증 개요
- 확인 범위: SSOT 문서 [req-landing-final.md](/Users/woohyeon/Local/VibeTest/docs/req-landing-final.md), 보조 문서 [dev-plan-landing-final.md](/Users/woohyeon/Local/VibeTest/docs/dev-plan-landing-final.md), [reimpl-checklist-ssot.md](/Users/woohyeon/Local/VibeTest/docs/reimpl-checklist-ssot.md), 검증 대상 주장 문서 [key-findings.md](/Users/woohyeon/Local/VibeTest/docs/key-findings.md), 구현 코드(`grid/card/controller/state/runtime/transition/telemetry/GNB/page`), unit/e2e, `qa:rules`, blocker registry를 모두 다시 읽었다.
- 판정 기준: 요구사항 조항, 실제 코드 경로, 자동 단언이 모두 맞아야 `PASS`로 두었다. 코드만 있거나 테스트가 약하면 `PARTIAL`, 구현이 계약 핵심을 놓치면 `FAIL`, 증빙이 없으면 `UNVERIFIED`로 분류했다.
- 완료 보고서 중 중점 검증 포인트: 시맨틱 1차 트리거, desktop handoff/geometry, mobile lifecycle, transition rollback/restoration, consent/telemetry, theme matrix, blocker traceability, 그리고 보고서의 `qa:gate` 3/3 PASS 주장.
- 실제 게이트 재검증: `npm run qa:gate`를 현재 코드베이스에서 다시 실행했고 3/3 PASS를 확인했다. 다만 게이트 PASS는 “요구사항 완전 충족”과 동일하지 않았다.

## II. Top Priority 10개 항목 검증 결과

1. **카드 1차 트리거 시맨틱 위반**  
판정: `PASS`  
요구사항 근거: `§9.2`, `§14.3-5`  
확인 근거: [landing-grid-card.tsx](/Users/woohyeon/Local/VibeTest/src/features/landing/grid/landing-grid-card.tsx), [state-smoke.spec.ts](/Users/woohyeon/Local/VibeTest/tests/e2e/state-smoke.spec.ts), [check-phase8-accessibility-contracts.mjs](/Users/woohyeon/Local/VibeTest/scripts/qa/check-phase8-accessibility-contracts.mjs)  
검증 결과 요약: 카드 1차 트리거가 실제 `<button>`으로 치환됐고 `role="button"` 대체는 제거됐다. trigger와 expanded body도 sibling 구조다.  
남은 리스크/누락/의문점: 정적 QA가 문자열 검사 중심이지만, 런타임 DOM과 smoke가 같이 받치고 있어 이 항목 자체는 닫혔다.  
보완 필요 여부: `No`

2. **Desktop/Tablet handoff + hover-out 독립**  
판정: `PARTIAL`  
요구사항 근거: `§8.2`, `§8.3`, `§14.3-13`  
확인 근거: [use-landing-interaction-controller.ts](/Users/woohyeon/Local/VibeTest/src/features/landing/grid/use-landing-interaction-controller.ts), [hover-intent.ts](/Users/woohyeon/Local/VibeTest/src/features/landing/grid/hover-intent.ts), [landing-hover-intent.test.ts](/Users/woohyeon/Local/VibeTest/tests/unit/landing-hover-intent.test.ts)  
검증 결과 요약: single timer, intent token, available-only handoff helper는 있다. 하지만 source `0ms` / target 표준 모션 분리, hover-out 독립 collapse의 실동작, execution-time boundary 판정, blocker #13 수준 E2E가 없다. CSS에도 core motion timeline 자체가 없다.  
남은 리스크/누락/의문점: 현재는 “helper 존재” 수준이 크고, 실제 handoff 품질은 자동화로 닫히지 않았다.  
보완 필요 여부: `Yes`

3. **Mobile Expanded lifecycle 원자성**  
판정: `PARTIAL`  
요구사항 근거: `§8.5`, `§14.3-14`  
확인 근거: [mobile-lifecycle.ts](/Users/woohyeon/Local/VibeTest/src/features/landing/grid/mobile-lifecycle.ts), [use-landing-interaction-controller.ts](/Users/woohyeon/Local/VibeTest/src/features/landing/grid/use-landing-interaction-controller.ts), [transition-telemetry-smoke.spec.ts](/Users/woohyeon/Local/VibeTest/tests/e2e/transition-telemetry-smoke.spec.ts)  
검증 결과 요약: `OPENING/OPEN/CLOSING/NORMAL`, queue-close, scroll-lock의 기본 틀은 들어갔다. 하지만 y-anchor `0px`, title baseline `0px`, pre-open snapshot 1회/재기록 금지, `NORMAL` terminal의 height restore 선행 조건은 구현도 단언도 없다.  
남은 리스크/누락/의문점: 현재 mobile test는 scroll lock과 outside gesture만 본다. SSOT의 mobile contract 대부분은 아직 비어 있다.  
보완 필요 여부: `Yes`

4. **Transition handshake / rollback / restoration 부재**  
판정: `PARTIAL`  
요구사항 근거: `§8.6`, `§12.2`, `§13.3~§13.8`, `§14.3-15~17`  
확인 근거: [transition/runtime.ts](/Users/woohyeon/Local/VibeTest/src/features/landing/transition/runtime.ts), [use-landing-transition.ts](/Users/woohyeon/Local/VibeTest/src/features/landing/transition/use-landing-transition.ts), [landing-runtime.tsx](/Users/woohyeon/Local/VibeTest/src/features/landing/landing-runtime.tsx), [blog-destination-client.tsx](/Users/woohyeon/Local/VibeTest/src/features/landing/blog/blog-destination-client.tsx), [test-question-client.tsx](/Users/woohyeon/Local/VibeTest/src/features/landing/test/test-question-client.tsx), [transition-telemetry-smoke.spec.ts](/Users/woohyeon/Local/VibeTest/tests/e2e/transition-telemetry-smoke.spec.ts)  
검증 결과 요약: pending transition, ingress, article fallback, one-shot scroll restoration은 구현됐다. 하지만 source GNB 유지, destination timeout 경로, 3대 rollback 케이스 전체, cleanup set의 interaction lock/queued close closure는 코드와 테스트가 부족하다.  
남은 리스크/누락/의문점: 현재 `rollbackLandingTransition()`은 pending/ingress/body style만 지우고, SSOT가 요구한 cleanup set 전체를 명시적으로 닫지 않는다.  
보완 필요 여부: `Yes`

5. **Telemetry / Consent / Privacy**  
판정: `PARTIAL`  
요구사항 근거: `§12.1~§12.5`, `§15 EX-002`, `§14.3-9`, `§14.3-18`  
확인 근거: [telemetry/runtime.ts](/Users/woohyeon/Local/VibeTest/src/features/landing/telemetry/runtime.ts), [telemetry/validation.ts](/Users/woohyeon/Local/VibeTest/src/features/landing/telemetry/validation.ts), [telemetry/types.ts](/Users/woohyeon/Local/VibeTest/src/features/landing/telemetry/types.ts), [landing-telemetry-validation.test.ts](/Users/woohyeon/Local/VibeTest/tests/unit/landing-telemetry-validation.test.ts), [transition-telemetry-smoke.spec.ts](/Users/woohyeon/Local/VibeTest/tests/e2e/transition-telemetry-smoke.spec.ts)  
검증 결과 요약: 기본 `OPTED_OUT`, no-send, final_submit validation, randomUUID→getRandomValues 정책은 들어갔다. 하지만 fail/cancel telemetry, UNKNOWN queue flush/discard, random-source unavailable 환경 차단, correlation failure path 증빙은 약하다.  
남은 리스크/누락/의문점: 현재 API route는 204 sink일 뿐이며, contract closure는 사실상 client-side test에 의존한다.  
보완 필요 여부: `Yes`

6. **Expanded geometry isolation + top-layer 부족**  
판정: `PARTIAL`  
요구사항 근거: `§6.7`, `§8.4`, `§14.3-4`  
확인 근거: [landing-grid-card.tsx](/Users/woohyeon/Local/VibeTest/src/features/landing/grid/landing-grid-card.tsx), [globals.css](/Users/woohyeon/Local/VibeTest/src/app/globals.css), [baseline-manager.ts](/Users/woohyeon/Local/VibeTest/src/features/landing/grid/baseline-manager.ts), [grid-smoke.spec.ts](/Users/woohyeon/Local/VibeTest/tests/e2e/grid-smoke.spec.ts)  
검증 결과 요약: desktop expanded layer는 absolute overlay로 분리됐고 shell crop도 완화됐다. 하지만 baseline freeze/restore manager는 런타임에 연결되지 않았고, same-row non-target `0px` drift / handoff 100회 / top-layer overlap hit-target 검증이 없다.  
남은 리스크/누락/의문점: geometry isolation은 “구조 방향”만 맞았고, SSOT의 active-frame 불변식은 닫히지 않았다.  
보완 필요 여부: `Yes`

7. **blocker 1~19 traceability closure 미완**  
판정: `PARTIAL`  
요구사항 근거: `§14.3`, `§14.4`, `§14.3-19`  
확인 근거: [blocker-traceability.json](/Users/woohyeon/Local/VibeTest/docs/blocker-traceability.json), [check-blocker-traceability.mjs](/Users/woohyeon/Local/VibeTest/scripts/qa/check-blocker-traceability.mjs), [reimpl-checklist-ssot.md](/Users/woohyeon/Local/VibeTest/docs/reimpl-checklist-ssot.md)  
검증 결과 요약: blocker registry와 gate는 존재하고 동작한다. 그러나 매핑 기준이 assertion id가 아니라 단순 file/pattern 포함 여부라서 “실제 blocker를 닫는 단언”인지 보장하지 못한다. 체크리스트도 여전히 대량 미완료로 남아 있다.  
남은 리스크/누락/의문점: blocker #11, #13, #14 같은 항목은 현재 매핑이 과대평가되어 있다.  
보완 필요 여부: `Yes`

8. **Focus ring / aria-label 접근성 갭**  
판정: `PARTIAL`  
요구사항 근거: `§9.1`, `§9.3`, `§14.3-5`  
확인 근거: [globals.css](/Users/woohyeon/Local/VibeTest/src/app/globals.css), [site-gnb.tsx](/Users/woohyeon/Local/VibeTest/src/features/landing/gnb/site-gnb.tsx), [check-phase8-accessibility-contracts.mjs](/Users/woohyeon/Local/VibeTest/scripts/qa/check-phase8-accessibility-contracts.mjs), [grid-smoke.spec.ts](/Users/woohyeon/Local/VibeTest/tests/e2e/grid-smoke.spec.ts)  
검증 결과 요약: shell-level focus style와 GNB aria-label은 들어갔다. 하지만 overlay 활성 상태에서 focus ring과 title readability를 screenshot gate로 닫지 않았고, axe-core 수준 접근성 감사도 없다.  
남은 리스크/누락/의문점: 구현은 개선됐지만 SSOT의 overlay readability 증빙은 부족하다.  
보완 필요 여부: `Yes`

9. **Theme matrix 게이트 부재**  
판정: `PARTIAL`  
요구사항 근거: `§6.9`, `§14.3-8`  
확인 근거: [theme-matrix-smoke.spec.ts](/Users/woohyeon/Local/VibeTest/tests/e2e/theme-matrix-smoke.spec.ts), [theme-matrix-smoke.spec.ts-snapshots](/Users/woohyeon/Local/VibeTest/tests/e2e/theme-matrix-smoke.spec.ts-snapshots)  
검증 결과 요약: screenshot gate와 baseline은 있다. 하지만 요구사항은 Landing/Test/Blog/History의 light/dark 전 페이지와 Normal/Expanded 상태 전부를 요구하는데, 현재는 일부 조합만 캡처한다.  
남은 리스크/누락/의문점: gate는 생겼지만 matrix completeness는 아니다.  
보완 필요 여부: `Yes`

10. **상태 우선순위 실효성 부족**  
판정: `PASS`  
요구사항 근거: `§7.2`, `§7.7`  
확인 근거: [interaction-state.ts](/Users/woohyeon/Local/VibeTest/src/features/landing/model/interaction-state.ts), [landing-interaction-state.test.ts](/Users/woohyeon/Local/VibeTest/tests/unit/landing-interaction-state.test.ts)  
검증 결과 요약: `PAGE_STATE_PRIORITY`가 reducer 경로에 실제 사용되고, allowed-transition table과 ramp-up/no-op 테스트도 있다. 초기 문제였던 “정의만 있고 미사용” 상태는 해소됐다.  
남은 리스크/누락/의문점: SENSOR_DENIED/TRANSITIONING의 실경로 E2E는 약하지만, 이 항목의 핵심 드리프트 자체는 정리됐다.  
보완 필요 여부: `No`

## III. 추가 보완이 필요한 Top Priority 항목만 추출
- **TP2 Desktop/Tablet handoff + hover-out 독립**  
왜 아직 닫히지 않았는지: helper/timer는 있으나 blocker #13의 실동작과 motion split이 없다.  
필요한 보완 종류: `구현 보완`, `테스트 보완`, `게이트 보완`  
우선순위: `P0`  
선행 관계: geometry/top-layer 보강과 함께 처리해야 한다.

- **TP3 Mobile Expanded lifecycle 원자성**  
왜 아직 닫히지 않았는지: lifecycle 명칭만 있고 y-anchor/title baseline/snapshot restore gate가 비어 있다.  
필요한 보완 종류: `구현 보완`, `테스트 보완`, `게이트 보완`  
우선순위: `P0`  
선행 관계: transition rollback cleanup 이전에 고정되어야 한다.

- **TP4 Transition handshake / rollback / restoration**  
왜 아직 닫히지 않았는지: pending transition과 restoration은 있으나 timeout/fail/cancel cleanup set과 source GNB 유지 계약이 비었다.  
필요한 보완 종류: `구현 보완`, `테스트 보완`, `게이트 보완`  
우선순위: `P0`  
선행 관계: mobile cleanup state 확정 이후.

- **TP5 Telemetry / Consent / Privacy**  
왜 아직 닫히지 않았는지: 기본 전송 경계는 있으나 fail/cancel correlation, queue flush/discard, random-source failure 증빙이 부족하다.  
필요한 보완 종류: `테스트 보완`, `게이트 보완`, 일부 `구현 보완`  
우선순위: `P1`  
선행 관계: transition terminal contract 확정 이후.

- **TP6 Expanded geometry isolation + top-layer**  
왜 아직 닫히지 않았는지: overlay 구조는 있지만 baseline freeze/restore runtime wiring과 active-frame 0px drift 검증이 없다.  
필요한 보완 종류: `구현 보완`, `테스트 보완`  
우선순위: `P0`  
선행 관계: TP2와 동시 처리.

- **TP7 blocker 1~19 traceability closure**  
왜 아직 닫히지 않았는지: registry는 있으나 assertion-level mapping이 아니고 체크리스트/문서 동기화도 안 됐다.  
필요한 보완 종류: `게이트 보완`, `문서/traceability 보완`  
우선순위: `P1`  
선행 관계: 각 blocker용 테스트 자산이 먼저 확정되어야 한다.

- **TP8 Focus ring / aria-label 접근성 갭**  
왜 아직 닫히지 않았는지: aria-label은 보강됐지만 overlay+focus readability gate가 없다.  
필요한 보완 종류: `테스트 보완`, 일부 `구현 보완`  
우선순위: `P1`  
선행 관계: geometry/top-layer 시각 안정화 이후 screenshot gate 추가.

- **TP9 Theme matrix gate**  
왜 아직 닫히지 않았는지: screenshot harness는 있으나 page×theme×state 전행렬이 아니다.  
필요한 보완 종류: `테스트 보완`, `게이트 보완`  
우선순위: `P1`  
선행 관계: motion/geometry/mobile/transition UI 안정화 이후.

## IV. 다음 수정 라운드의 최종 대상 집합
- **상태 전환의 지각 연속성 부족**  
포함 이유: TP2·TP6와 겹치는 시각/모션 완성도 축이다.  
기대 효과: 같은 카드의 상태 변화가 자연스럽게 인지된다.  
방치 시 위험: interaction 신뢰도 저하, motion 회귀 은폐.  
관련 요구사항/블로커: `§8.3`, `§8.4`, blocker `#13`

- **card shell focus 시각 경계 불명확**  
포함 이유: TP8의 남은 gap과 동일 축이다.  
기대 효과: keyboard-only 탐색 품질과 overlay readability가 올라간다.  
방치 시 위험: A11y 회귀, focus 식별 실패.  
관련 요구사항/블로커: `§9.1`, `§9.3`, blocker `#5`

- **Expanded 레이어 우선순위 체감 불안정**  
포함 이유: TP6의 geometry/top-layer 미완과 동일하다.  
기대 효과: non-target 안정성과 hit-target 일관성이 확보된다.  
방치 시 위험: overlap, 가림, drift 회귀.  
관련 요구사항/블로커: `§6.7`, `§8.4`, blocker `#4`

- **모바일 full-bleed 읽기 리듬 계약 부재**  
포함 이유: TP3의 미완 사항을 UX 기준으로 보강해야 한다.  
기대 효과: title/X/CTA/read flow가 안정된다.  
방치 시 위험: mobile 사용성 저하, close 오작동.  
관련 요구사항/블로커: `§8.5`, blocker `#14`

- **CTA 시각 리듬 일관성 부족 가능성**  
포함 이유: TP4의 CTA-trigger contract과 TP2/TP3의 state feedback이 시각적으로 아직 분리돼 있다.  
기대 효과: Blog/Test CTA affordance가 타입 차이를 유지하면서도 같은 전환 신호로 읽힌다.  
방치 시 위험: action meaning 불일치, destination handoff 혼선.  
관련 요구사항/블로커: `§6.8`, `§8.6`, `§13.4`

- **TP2 Desktop/Tablet handoff + hover-out 독립**  
포함 이유: blocker #13 핵심 미완.  
기대 효과: pointer/keyboard handoff가 결정적으로 닫힌다.  
방치 시 위험: hover regressions, same-row drift.  
관련 요구사항/블로커: `§8.2`, `§8.3`, `§14.3-13`

- **TP3 Mobile Expanded lifecycle 원자성**  
포함 이유: 현재 구현은 이름만 lifecycle이고 핵심 수치 계약이 비었다.  
기대 효과: mobile full-bleed contract이 수치로 닫힌다.  
방치 시 위험: close race, scroll lock leak, baseline drift.  
관련 요구사항/블로커: `§8.5`, `§14.3-14`

- **TP4 Transition handshake / rollback / restoration**  
포함 이유: destination handshake와 cleanup-set closure가 아직 불완전하다.  
기대 효과: fail/cancel/complete가 정확히 상호배타적으로 정리된다.  
방치 시 위험: pending/leak, 잘못된 GNB/route context.  
관련 요구사항/블로커: `§13.3~§13.8`, blocker `#15~#17`

- **TP5 Telemetry / Consent / Privacy**  
포함 이유: 현재는 happy-path 중심이고 failure-path privacy/correlation closure가 약하다.  
기대 효과: telemetry correctness와 privacy claim이 실제로 증명된다.  
방치 시 위험: over-logging, correlation 누락, false blocker closure.  
관련 요구사항/블로커: `§12.1~§12.5`, blocker `#9`, `#18`

- **TP7 blocker 1~19 traceability closure**  
포함 이유: 현재 registry는 존재하지만 release-grade closure는 아니다.  
기대 효과: gate PASS가 실제 blocker closure와 연결된다.  
방치 시 위험: false green release.  
관련 요구사항/블로커: `§14.3`, `§14.4`, blocker `#19`

- **TP8 Focus ring / aria-label 접근성 갭**  
포함 이유: 구현은 들어갔지만 시각 증빙이 부족하다.  
기대 효과: overlay 상태에서도 focus/title readability가 닫힌다.  
방치 시 위험: A11y 회귀 미탐지.  
관련 요구사항/블로커: `§9.1`, `§9.3`, blocker `#5`

- **TP9 Theme matrix gate**  
포함 이유: matrix가 부분 조합만 커버한다.  
기대 효과: dark/light 상태 품질 회귀를 실제로 막을 수 있다.  
방치 시 위험: 특정 페이지/상태의 대비 붕괴.  
관련 요구사항/블로커: `§6.9`, blocker `#8`

## V. 3~5단계 구현 계획

### 1. Desktop Motion/Geometry Hardening
- 목표: desktop/tablet의 handoff, hover-out, top-layer, shell focus 경계를 먼저 실제 blocker 수준으로 고정한다.
- 포함 항목: TP2, TP6, TP8, Design 1, 2, 3
- 선행 조건: 현재 semantic trigger와 state priority는 유지한다.
- 핵심 작업: baseline manager를 실제 grid/controller에 연결하고, active-frame same-row non-target `0px` 안정성을 측정 가능한 state/data marker로 노출한다. source `0ms` / target 표준 모션을 CSS token과 controller path에 분리하고, hover-out collapse를 live boundary 판정으로 재구성한다. focus-visible screenshot gate와 overlay readability gate를 추가한다.
- 수정 후보 파일/영역: [use-landing-interaction-controller.ts](/Users/woohyeon/Local/VibeTest/src/features/landing/grid/use-landing-interaction-controller.ts), [landing-catalog-grid.tsx](/Users/woohyeon/Local/VibeTest/src/features/landing/grid/landing-catalog-grid.tsx), [baseline-manager.ts](/Users/woohyeon/Local/VibeTest/src/features/landing/grid/baseline-manager.ts), [landing-grid-card.tsx](/Users/woohyeon/Local/VibeTest/src/features/landing/grid/landing-grid-card.tsx), [globals.css](/Users/woohyeon/Local/VibeTest/src/app/globals.css)
- 검증 방법: desktop handoff E2E 신설, active-frame drift `0px` 측정, overlap/hit-target test, keyboard-only screenshot, overlay+focus screenshot, blocker #13 assertion 강화.
- 완료 판정 기준: handoff helper가 아니라 실제 pointer/keyboard 경로가 `§8.2/§8.3/§8.4`를 충족하고, blocker #13과 geometry 관련 blocker #4의 미흡 항목이 자동화로 닫힌다.
- 회귀 방지 장치: transform-origin, source/target motion, non-target drift에 대한 assertion id를 traceability에 연결한다.
- 왜 이 단계 순서가 적절한지: 이 축이 흔들리면 mobile/transition/theme screenshot이 전부 다시 찍혀야 한다.

### 2. Mobile Full-Bleed Lifecycle Completion
- 목표: mobile expanded를 문서 수치 계약대로 완성한다.
- 포함 항목: TP3, Design 5
- 선행 조건: Phase 1에서 card shell/layer 토큰이 안정화돼 있어야 한다.
- 핵심 작업: snapshot lifecycle을 실제 restore gate로 승격하고, y-anchor/title baseline 측정과 `NORMAL` terminal gating을 reducer+controller에 넣는다. X/backdrop/CTA 우선순위와 non-CTA no-op를 명시하고, body-only scroll region과 full-bleed reading rhythm을 CSS로 고정한다.
- 수정 후보 파일/영역: [mobile-lifecycle.ts](/Users/woohyeon/Local/VibeTest/src/features/landing/grid/mobile-lifecycle.ts), [use-landing-interaction-controller.ts](/Users/woohyeon/Local/VibeTest/src/features/landing/grid/use-landing-interaction-controller.ts), [landing-grid-card.tsx](/Users/woohyeon/Local/VibeTest/src/features/landing/grid/landing-grid-card.tsx), [globals.css](/Users/woohyeon/Local/VibeTest/src/app/globals.css)
- 검증 방법: y-anchor/title baseline E2E, repeated open-close stability, queue-close/closing-ignore unit, CTA > X > outside 경쟁 E2E, mobile screenshot pack.
- 완료 판정 기준: blocker #14의 누락 항목이 자동 단언으로 채워지고, mobile full-bleed가 “동작”이 아니라 “계약”으로 닫힌다.
- 회귀 방지 장치: 상태 marker와 측정치를 DOM에 노출해 visual-only 회귀를 수치로 잡는다.
- 왜 이 단계 순서가 적절한지: Phase 3의 transition cleanup set은 mobile state/body lock semantics를 전제로 해야 한다.

### 3. Transition / CTA / Telemetry Closure
- 목표: landing→destination 전환, rollback, restoration, telemetry correlation을 failure-path까지 닫는다.
- 포함 항목: TP4, TP5, Design 7
- 선행 조건: Phase 2에서 mobile queued-close/body lock semantics가 확정돼 있어야 한다.
- 핵심 작업: transition controller를 shared shell 계층으로 끌어올려 source GNB 유지와 destination-ready complete 시점을 고정한다. fail/cancel 3케이스와 timeout reason을 구현하고 cleanup set에 pending transition, ingress, interaction lock, body lock, queued close를 모두 포함한다. CTA visual feedback을 Blog/Test에 공통 토큰으로 맞추고, telemetry는 fail/cancel, random-source unavailable, consent queue flush/discard, terminal exclusivity를 테스트로 닫는다.
- 수정 후보 파일/영역: [transition/runtime.ts](/Users/woohyeon/Local/VibeTest/src/features/landing/transition/runtime.ts), [use-landing-transition.ts](/Users/woohyeon/Local/VibeTest/src/features/landing/transition/use-landing-transition.ts), [landing-runtime.tsx](/Users/woohyeon/Local/VibeTest/src/features/landing/landing-runtime.tsx), [blog-destination-client.tsx](/Users/woohyeon/Local/VibeTest/src/features/landing/blog/blog-destination-client.tsx), [test-question-client.tsx](/Users/woohyeon/Local/VibeTest/src/features/landing/test/test-question-client.tsx), [telemetry/runtime.ts](/Users/woohyeon/Local/VibeTest/src/features/landing/telemetry/runtime.ts)
- 검증 방법: rollback 3케이스 E2E, timeout/fail/cancel network assertions, start=1 terminal=1 fail-path test, consent queue flush/discard unit/integration, CTA interaction screenshot.
- 완료 판정 기준: blockers #15, #16, #17, #18의 미흡 항목이 닫히고, completion report의 “transition/telemetry complete” 주장을 코드와 테스트가 실제로 뒷받침한다.
- 회귀 방지 장치: transition/telemetry event에 assertion id를 심고 traceability registry를 string search가 아니라 assertion mapping으로 교체한다.
- 왜 이 단계 순서가 적절한지: transition/telemetry는 앞 단계의 desktop/mobile state semantics가 정리돼야만 failure cleanup을 올바르게 설계할 수 있다.

### 4. Theme Matrix and Traceability Finalization
- 목표: 남은 theme coverage와 blocker evidence를 release-grade로 마무리한다.
- 포함 항목: TP7, TP9
- 선행 조건: Phase 1~3의 UI/behavior churn이 끝나 있어야 한다.
- 핵심 작업: theme screenshot matrix를 Landing/Test/Blog/History × light/dark × required state로 확장한다. blocker registry는 file/pattern 포함 여부가 아니라 assertion id, owning test, blocker clause를 매핑하도록 승격한다. [reimpl-checklist-ssot.md](/Users/woohyeon/Local/VibeTest/docs/reimpl-checklist-ssot.md)도 실제 구현 상태와 동기화한다.
- 수정 후보 파일/영역: [theme-matrix-smoke.spec.ts](/Users/woohyeon/Local/VibeTest/tests/e2e/theme-matrix-smoke.spec.ts), [blocker-traceability.json](/Users/woohyeon/Local/VibeTest/docs/blocker-traceability.json), [check-blocker-traceability.mjs](/Users/woohyeon/Local/VibeTest/scripts/qa/check-blocker-traceability.mjs), [reimpl-checklist-ssot.md](/Users/woohyeon/Local/VibeTest/docs/reimpl-checklist-ssot.md)
- 검증 방법: full matrix screenshot baseline, stale/missing mapping fail test, checklist-vs-registry consistency check.
- 완료 판정 기준: blocker #8과 #19가 “형식상 존재”가 아니라 “실질 closure”로 승격된다.
- 회귀 방지 장치: 새 blocker가 생기면 assertion id 없이는 `qa:rules`가 실패하도록 만든다.
- 왜 이 단계 순서가 적절한지: behavior가 안정되기 전에 screenshot과 traceability를 굳히면 다시 뜯어야 한다.

## VI. 최종 판단
- 지금 상태에서 정말 닫혔다고 볼 수 있는 것: semantic primary trigger, state priority wiring, 기본 ingress/start/final_submit happy-path, 기본 consent no-send 경계, theme screenshot harness 존재, `qa:gate` 3/3 PASS 사실 자체.
- 아직 닫히지 않은 것: desktop handoff/core motion, baseline freeze runtime wiring, mobile y-anchor/title baseline/snapshot restore, transition cleanup-set closure와 timeout/fail path, telemetry failure-path/privacy edge cases, full theme matrix, assertion-level traceability closure.
- 다음 수정 라운드의 핵심 위험: 현재 gate가 녹색이더라도 blocker #13/#14/#15~#19 일부를 과신하게 만든다는 점이다. 특히 [reimpl-checklist-ssot.md](/Users/woohyeon/Local/VibeTest/docs/reimpl-checklist-ssot.md)는 아직 대량 미완으로 남아 있어 문서 증빙도 불안정하다.
- 구현 착수 전 반드시 합의되어야 할 설계 쟁점: source GNB 유지 요구를 충족하기 위한 transition controller의 계층 위치, mobile full-bleed의 snapshot/height restore 구현 방식, traceability를 string pattern에서 assertion id 체계로 바꾸는 범위, theme matrix의 필수 상태 조합 정의.
