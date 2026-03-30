# Revised Implementation Plan: Test Instruction Contract Rework

## 1. Executive Summary
- 이번 수정의 핵심 목표는 test route의 instruction 계약을 `variant별 고유 instruction 본문 + optional consent note + CTA set + action result` 구조로 다시 세우고, 이전 요구사항 기반 흐름을 코드/테스트/문서에서 완전히 제거하는 것이다.
- 이번 버전에서 반드시 제거해야 할 과거 계약은 다음이다: test 페이지 하단 Consent UI, `showBottomConsentUi`/`blocked_until_consent` 계열 상태, popup 기반 blocked/confirm 흐름, generic `instructionBody`/`consentBranchBody`, direct `available + OPTED_OUT` 즉시 redirect 계약, 그리고 그에 기대는 test id/selector/assertion wording.
- 최종 설계 원칙:
  - `instruction 본문`, `consent note`, `CTA 구성`, `CTA 클릭 결과`는 서로 다른 레이어로 분리한다.
  - policy는 `ingress type + consent state + card type`만 입력으로 받고, 화면 조합과 side effect를 분리된 출력으로 돌려준다.
  - test route에서는 consent banner/dialog를 전혀 렌더하지 않는다. consent 관련 저장은 CTA action 실행 시점에만 발생한다.
  - landing과 deep-link의 차이는 “문구 재사용”이 아니라 “허용 케이스와 action 결과”에서만 표현한다.
  - 명시되지 않은 케이스를 확장 해석하지 않는다. 특히 `landing + OPTED_OUT + available`는 policy branch가 아니라 catalog-layer unreachable로 유지한다.

## 2. Clean-slate Replacement / Deletion Map
**유지**
- [consent-source.ts](/src/features/landing/telemetry/consent-source.ts)의 consent SSOT와 same-tab sync 구조
- [store.ts](/src/features/landing/transition/store.ts), [runtime.ts](/src/features/landing/transition/runtime.ts)의 landing ingress / pending transition 저장 구조
- landing catalog filter의 `cardType` 권위 구조와 `landing + OPTED_OUT + available` 비노출 계약
- landing 전용 기본 consent banner 자산 자체는 유지하되, test route에서는 사용하지 않음

**부분 재설계**
- [types.ts](/src/features/landing/data/types.ts), [adapter.ts](/src/features/landing/data/adapter.ts), [raw-fixtures.ts](/src/features/landing/data/raw-fixtures.ts): `instruction` 데이터를 fixture/normalized card의 새 SSOT로 추가
- [entry-policy.ts](/src/features/test/entry-policy.ts): old mode/flag 중심 모델을 버리고 `content / cta / effects` 출력으로 재설계
- [instruction-overlay.tsx](/src/features/test/instruction-overlay.tsx): 단일 body 렌더가 아니라 `instruction + divider + note + CTA set` 조합 렌더로 재작성
- [test-question-client.tsx](/src/features/test/test-question-client.tsx): bootstrap / policy resolve / action dispatch / commit·redirect 오케스트레이션만 남기도록 재구성
- consent smoke, policy unit, snapshots, 요구사항 문서 3종, blocker traceability wording, grep/qa 계약

**완전 삭제**
- test route의 bottom consent render와 그 상태 의존성
- `showBottomConsentUi`, `blocked_until_consent`, `start_blocked`, `deny_confirm`
- test route의 `ConsentBanner` import/usage
- [instruction-dialog.tsx](/src/features/test/instruction-dialog.tsx)와 popup 기반 분기 전체
- `instructionBody`, `consentBranchBody` 번역 키와 그 참조
- `test-local-consent-banner`, `test-local-consent-accept`, `test-local-consent-deny`, `test-dialog-*` test id
- deep-link `available + OPTED_OUT` 즉시 redirect 계약과 그 테스트/문서 설명
- old CTA wording에 묶인 assertion title, docs prose, grep contract

## 3. Target Architecture
- 최종 구조는 세 층으로 고정한다.
  - `Instruction Content Resolver`: variant instruction 본문과 optional consent note/divider를 결정
  - `Instruction CTA Resolver`: primary/secondary CTA label과 semantic action을 결정
  - `Instruction Action Executor`: consent 저장, runtime entry commit, redirect, instructionSeen 기록을 수행
- authoritative field:
  - `card.test.instruction`
  - `card.cardType`
  - `consentState`
  - `landingIngressFlag`
  - `instructionSeen`
- derived field:
  - `ingressType`
  - `showDivider`
  - `consentNoteKey`
  - `primaryAction` / `secondaryAction`
  - `writesConsent` / `redirectHome` / `commitsRuntimeEntry` / `recordsInstructionSeen`
- policy structure:
  - `known consent + enterable card`는 plain instruction + `Start`
  - `UNKNOWN + available`는 instruction + divider + available note + `[Accept All and Start] / [Deny and Abandon]`
  - `UNKNOWN + opt_out`는 instruction + divider + opt_out note + `[Accept All and Start] / [Deny and Start]`
  - `direct + OPTED_OUT + available`는 instruction + divider + opted-out warning + `[Accept All and Start] / [Keep Current Preference]`
  - `OPTED_OUT + opt_out`는 plain instruction + `Start`
  - `landing + OPTED_OUT + available`는 policy가 아니라 upstream non-reachability invariant
- 메시지 조합 / CTA 구성 / 액션 결과 분리 원칙:
  - variant instruction은 fixture data가 소유
  - consent note는 locale message key가 소유
  - CTA label은 locale message key가 소유
  - CTA action 결과는 UI 텍스트와 독립된 pure action map이 소유
- 금지할 안티패턴:
  - `if` 체인에서 copy / CTA label / side effect를 동시에 결정하는 방식
  - banner를 숨기기만 하고 state/branch를 남겨두는 방식
  - landing/directional 차이를 `consentState + cardType`만으로 뭉개는 방식
  - generic `instructionBody` fallback
  - “도달 불가 케이스”를 test route에서 조용한 fallback branch로 받아주는 방식
  - CTA 검증만 하고 instruction/divider/note 부재 여부를 검증하지 않는 테스트

## 4. Detailed Plan by Wave

### Wave 1
- 목표: old contract vocabulary를 끊고, variant instruction + new policy model을 위한 데이터/타입 표면을 먼저 고정한다.
- 이번 Wave에서 반드시 제거할 과거 계약/흔적:
  - `instructionBody` / `consentBranchBody` 의존
  - `showBottomConsentUi`, `blocked_until_consent` 같은 policy output vocabulary
- 이번 Wave에서 신설/재설계할 구조:
  - test fixture `instruction` 필드
  - normalized `LandingTestCard.test.instruction`
  - `entry-policy`의 새 output shape (`content / cta / effects`)
- 구체 작업 항목:
  - test payload 타입에 `instruction`을 추가하고 adapter에서 locale-resolved instruction을 생성한다.
  - 현재 fixture에 존재하는 모든 test variant에 서로 다른 dummy instruction을 넣는다.
  - `entry-policy`를 pure data resolver로 재작성하고, old flag/deny mode enum을 제거한다.
  - policy가 허용하는 reachable cases만 명시하고, `landing + OPTED_OUT + available`는 explicit unreachable invariant로 문서화한다.
- 테스트/검증 항목:
  - unit: instruction normalization, variant uniqueness, policy matrix, unreachable invariant
  - search: `instructionBody`, `consentBranchBody`, `showBottomConsentUi`, `blocked_until_consent`가 `src/features/test`와 `src/messages/*`에서 제거되었는지 확인
- 통과 게이트:
  - 새 policy가 old output fields 없이 compile 가능
  - fixture/unit tests가 variant instruction uniqueness를 검증
  - source code에 old policy vocabulary가 남지 않음
- 다음 Wave로 넘기면 안 되는 미해결 리스크:
  - generic copy fallback이 남아 있으면 UI 재구성이 끝나도 old contract가 계속 숨는다
  - policy output이 여전히 UI-specific state를 섞고 있으면 clean deletion이 불가능하다

### Wave 2
- 목표: test route instruction UI와 action executor를 clean-slate로 교체하고, banner/dialog/state 잔재를 실제로 삭제한다.
- 이번 Wave에서 반드시 제거할 과거 계약/흔적:
  - test 페이지 하단 Consent UI render
  - popup blocked/confirm flow
  - `InstructionDialog`와 관련 state/test id
  - direct `available + OPTED_OUT` 즉시 redirect branch
- 이번 Wave에서 신설/재설계할 구조:
  - `InstructionOverlay`의 section-based 렌더
  - `TestQuestionClient`의 action-dispatch 중심 state machine
  - `Start / Accept All and Start / Deny and Start / Deny and Abandon / Keep Current Preference` action executor
- 구체 작업 항목:
  - `InstructionOverlay`가 `instructionText`, `showDivider`, `consentNote`, CTA set을 받도록 변경한다.
  - `TestQuestionClient`에서 `ConsentBanner` import/render, `dialogState`, blocked popup, confirm popup, bottom consent handlers를 제거한다.
  - CTA action executor를 분리해 consent write / redirect / commit / instructionSeen 기록을 action map으로 처리한다.
  - landing ingress는 start-like action 이후 Q2 continuation, deep-link는 Q1 start를 유지한다.
  - `Keep Current Preference`는 consent write 없이 landing redirect only로 고정한다.
- 테스트/검증 항목:
  - unit: bootstrap Q2 continuation, instructionSeen timing, action executor side effect
  - component/integration: divider/note/CTA layout, old banner/dialog absent
  - search: `test-local-consent-banner`, `test-dialog-*`, `start_blocked`, `deny_confirm` 제거 확인
- 통과 게이트:
  - test route source에서 old banner/dialog state와 selectors가 0건
  - new action executor로 모든 reachable case가 commit/redirect/write semantics를 만족
  - test page에 consent UI가 렌더되지 않음
- 다음 Wave로 넘기면 안 되는 미해결 리스크:
  - popup/bottom-banner dead code가 남아 있으면 테스트가 통과해도 과거 계약이 구조적으로 잔존한다
  - direct `OPTED_OUT + available` redirect branch가 남아 있으면 새 warning flow와 충돌한다

### Wave 3
- 목표: 새 계약에 맞춰 테스트를 전면 교체하고, CTA-only 검증 맹점을 없앤다.
- 이번 Wave에서 반드시 제거할 과거 계약/흔적:
  - bottom consent UI 기준 smoke assertions
  - old CTA wording에 매인 test title/assertion
  - old snapshots와 old selector 의존
- 이번 Wave에서 신설/재설계할 구조:
  - case-based consent smoke matrix
  - variant instruction text assertion
  - residue absence assertion/search coverage
- 구체 작업 항목:
  - `tests/unit/test-entry-policy.test.ts`를 새 matrix로 전면 교체한다.
  - `tests/e2e/consent-smoke.spec.ts`를 CTA-only 검증이 아니라 `instruction 본문 / divider / note / CTA / click side effect / old UI absence` 검증 구조로 다시 쓴다.
  - theme/state snapshots의 `test-instruction`, `test-question`, `test-result` baseline을 새 overlay 구조로 갱신한다.
  - old test id 존재 여부를 negative assertion으로 넣고, variant별 instruction text가 서로 다른지 e2e에서 실제로 확인한다.
- 테스트/검증 항목:
  - landing `UNKNOWN + available`
  - landing `UNKNOWN + opt_out`
  - deep-link `UNKNOWN + available`
  - deep-link `UNKNOWN + opt_out`
  - deep-link `OPTED_OUT + available`
  - `OPTED_IN + available|opt_out`
  - `OPTED_OUT + opt_out`
  - `landing + OPTED_OUT + available` non-reachability
- 통과 게이트:
  - CTA뿐 아니라 body/divider/note까지 검증하는 e2e가 존재
  - old selectors/assertion wording이 테스트 파일에서 제거
  - test-related snapshots가 새 UI와 일치
- 다음 Wave로 넘기면 안 되는 미해결 리스크:
  - CTA만 보는 테스트는 과거 copy/state 잔재를 놓친다
  - snapshot만 갱신하고 assertion wording을 안 바꾸면 old contract가 문서화된 채 남는다

### Wave 4
- 목표: 문서/QA contract/grep 기준까지 포함해 “이전 요구사항 흔적 없음”을 마무리하고 full gate를 통과시킨다.
- 이번 Wave에서 반드시 제거할 과거 계약/흔적:
  - “Default variant + 하단 Consent UI”
  - “blocked_until_consent”
  - direct `available + OPTED_OUT` 즉시 redirect 설명
  - old CTA wording이 남은 docs/traceability/qa text
- 이번 Wave에서 신설/재설계할 구조:
  - 새 contract에 맞는 requirement prose
  - residue eradication grep checklist
  - QA script/traceability wording alignment
- 구체 작업 항목:
  - `req-landing`, `req-test`, `req-test-plan`을 새 matrix 기준으로 다시 쓴다.
  - `docs/blocker-traceability.json`과 필요 시 QA script wording을 새 test titles/assertion ids와 동기화한다.
  - residue grep checklist를 실제 qa flow에 포함하고, old terminology가 문서/테스트/소스 어디에도 남지 않게 정리한다.
  - 최종 `npm run qa:gate:once`와 residue search를 함께 통과시킨다.
- 테스트/검증 항목:
  - qa scripts pass
  - full build/unit/e2e smoke pass
  - grep checklist clean
- 통과 게이트:
  - `qa:gate:once` green
  - old contract keywords/search keys 0건
  - docs/test/qa wording이 새 contract만 가리킴
- 다음 Wave로 넘기면 안 되는 미해결 리스크:
  - 문서와 QA가 old wording을 유지하면 회귀가 다시 합법화된다
  - grep cleanup 없이 끝내면 dead code/unused selectors가 그대로 남는다

## 5. Regression-proof Verification Matrix
| 진입 케이스 | instruction 본문 | divider | consent note | CTA | CTA 결과 | 과거 UI/분기 부재 |
| --- | --- | --- | --- | --- | --- | --- |
| landing + `OPTED_IN` + `available` | 해당 variant 고유 본문 | 없음 | 없음 | `Start` | commit, consent write 없음, `instructionSeen` 기록, Q2 시작 | banner/dialog/test-local-consent id 0건 |
| landing + `OPTED_IN` + `opt_out` | 해당 variant 고유 본문 | 없음 | 없음 | `Start` | commit, consent write 없음, `instructionSeen` 기록, Q2 시작 | old consent-branch copy 0건 |
| landing + `UNKNOWN` + `available` | 해당 variant 고유 본문 | 있음 | available unknown note | `Accept All and Start` / `Deny and Abandon` | accept: `OPTED_IN` + commit + Q2, deny: `OPTED_OUT` + home redirect + commit 0 + `instructionSeen` 0 | bottom consent/banner/dialog 0건 |
| landing + `UNKNOWN` + `opt_out` | 해당 variant 고유 본문 | 있음 | opt_out unknown note | `Accept All and Start` / `Deny and Start` | accept: `OPTED_IN` + commit + Q2, deny: `OPTED_OUT` + commit + Q2 | popup confirm 0건 |
| deep-link + `OPTED_IN` + `available` | 해당 variant 고유 본문 | 없음 | 없음 | `Start` | commit, consent write 없음, Q1 시작 | old redirect branch 0건 |
| deep-link + `OPTED_IN` + `opt_out` | 해당 variant 고유 본문 | 없음 | 없음 | `Start` | commit, consent write 없음, Q1 시작 | bottom consent 0건 |
| deep-link + `UNKNOWN` + `available` | 해당 variant 고유 본문 | 있음 | available unknown note | `Accept All and Start` / `Deny and Abandon` | accept: `OPTED_IN` + commit + Q1, deny: `OPTED_OUT` + home redirect + commit 0 + `instructionSeen` 0 | start-blocked popup 0건 |
| deep-link + `UNKNOWN` + `opt_out` | 해당 variant 고유 본문 | 있음 | opt_out unknown note | `Accept All and Start` / `Deny and Start` | accept: `OPTED_IN` + commit + Q1, deny: `OPTED_OUT` + commit + Q1 | confirm popup 0건 |
| deep-link + `OPTED_OUT` + `available` | 해당 variant 고유 본문 | 있음 | opted-out available warning | `Accept All and Start` / `Keep Current Preference` | accept: `OPTED_IN` + commit + Q1, keep: consent 유지 + home redirect + commit 0 + `instructionSeen` 0 | immediate redirect 0건 |
| deep-link + `OPTED_OUT` + `opt_out` | 해당 variant 고유 본문 | 없음 | 없음 | `Start` | commit, consent 유지, Q1 시작 | note/divider 강제 표시 0건 |
| landing + `OPTED_OUT` + `available` | test route 진입 자체 없음 | 해당 없음 | 해당 없음 | 해당 없음 | landing catalog에서 비노출 | test route fallback branch 0건 |

## 6. Residue Eradication Checklist
- source search:
  - `showBottomConsentUi`
  - `blocked_until_consent`
  - `start_blocked`
  - `deny_confirm`
  - `test-local-consent-banner`
  - `test-local-consent-accept`
  - `test-local-consent-deny`
  - `test-dialog-close-button`
  - `test-dialog-confirm-button`
  - `consentBranchBody`
  - `instructionBody`
- docs/test wording search:
  - `Default variant + 하단 Consent UI`
  - `즉시 landing redirect`
  - `bottom consent UI`
  - `blocked until consent`
- dead code 확인:
  - `InstructionDialog` file/exports/importers
  - test route에서 `ConsentBanner` importer
  - 사용되지 않는 deny/confirm handlers
  - old message keys across all locale JSON
- obsolete test/selector 확인:
  - old banner/dialog test id가 spec, snapshot, helper, theme matrix에 남아 있지 않음
  - e2e helper가 old consent banner interaction을 더 이상 호출하지 않음
- docs/qa contract 확인:
  - requirement docs가 new note/CTA wording만 설명
  - traceability/assertion ids가 새 spec title과 일치
  - QA script에 old contract wording이 남지 않음
- negative verification:
  - `rg` 결과가 0건이어야 하는 키워드 목록을 final QA log에 포함
  - “렌더되지 않음”이 아니라 “코드/문서/테스트에서 더 이상 참조되지 않음”을 확인

## 7. Final Recommended Execution Order
- 실제 구현 순서:
  1. Wave 1에서 data/policy surface를 먼저 리셋한다.
  2. Wave 2에서 test route UI/action을 clean-slate로 재구현하면서 old banner/dialog/state를 실제 삭제한다.
  3. Wave 3에서 테스트를 새 계약 기준으로 전면 교체하고 snapshots를 갱신한다.
  4. Wave 4에서 문서/QA/search cleanup을 마무리하고 full gate를 통과시킨다.
- 이 순서가 가장 안전한 이유:
  - policy vocabulary를 먼저 끊어야 UI가 old contract를 재사용하지 않는다.
  - UI/action 재구현 전에 테스트를 바꾸면 false positive가 생기고, 테스트를 너무 늦게 바꾸면 snapshot churn이 uncontrolled해진다.
  - 문서/QA cleanup은 코드와 테스트가 안정된 뒤 한 번에 해야 old wording이 다시 유입되지 않는다.
- 병렬 가능한 것:
  - variant dummy instruction fixture 작성
  - policy unit test 초안
  - docs wording 초안과 residue grep checklist 준비
- 병렬하면 안 되는 것:
  - old UI 삭제 이전의 snapshot 업데이트
  - runtime action 재배선 이전의 consent smoke 확정
  - code contract 안정화 이전의 docs/QA final wording 확정
