# Phase Requirements Draft — Question Runtime & Result

## 1. Scope / Non-goals / Locked Decisions

### 1.1 Scope
본 Phase의 구현 범위는 다음 두 축으로 한정한다.

1. **질문 런타임 완성**
   - variant 판정 및 유효성 검증
   - instruction 진입 및 start 규칙
   - progress 계산 및 completion gating
   - answer revision
   - run/session lifecycle 정리

2. **결과 도출과 결과 화면**
   - `derivedType` 도출
   - `scoreStats` 계산 및 검증
   - variant-aware 결과 섹션 렌더링
   - fallback / error UX

### 1.2 Non-goals
본 Phase 범위에서 다음 항목은 제외한다.

- 랜딩 카탈로그 UI 및 카드 인터랙션 세부 규칙
- blog 진입/표시 규칙
- admin analytics / ops / sync
- local history
- share URL 생성/복원/파싱
- 프레임워크/라우팅/i18n 기반 구조 설계
- 전역 문서(`requirements.md`)의 즉시 정합화 작업

### 1.3 Locked Decisions
- 본 문서는 이번 Phase 범위에서 구현 및 QA 기준으로 사용할 수 있을 정도의 상세도를 목표로 한다.
- 단, 특정 구현 경로를 불필요하게 고정하는 과도한 프레임워크/코드 수준 지시는 포함하지 않는다.
- 본 Phase는 도메인 로직만이 아니라 **UI 상태 / 복원 / 예외 처리 / fallback UX**까지 포함한다.
- `terminal 상호배타`, `rollback cleanup set`, `ambiguity registry`, `single-change synchronization`, `traceability + release gate`는 본 문서의 필수 구성 요소로 유지한다.

---

## 2. Core Domain & UI Lifecycle Definitions

### 2.1 Core Entities
- **Test Variant**: 사용자가 실행하는 테스트 단위. identifier, scoring schema, axis model, question set, result content 지원 범위를 가진다.
- **Session / Run Context**: instruction → question runtime → result까지 이어지는 실행 문맥.
- **Response Set**: 현재 run에서 기록된 응답 집합.
- **Question Index**: 질문 순서를 나타내는 인덱스. UI와 계산 기준 모두 일관된 순서를 사용해야 한다.
- **scoreStats**: variant가 선언한 scoring schema에 따라 계산되는 축/지표별 결과 구조.
- **derivedType**: variant별 최종 결과 토큰. axisCount 및 axis order에 따라 길이와 위치 의미가 결정된다.
- **Blocking Data Error**: 테스트 실행이나 결과 계산을 진행할 수 없을 정도의 데이터 구조/스키마 오류.
- **Recoverable UI Error**: 사용자에게 retry / 다른 테스트 선택 / 홈 복귀 등 복구 경로를 제공해야 하는 오류 상태.

### 2.2 Variant Resolution Contract
- route / query / storage / session 등에서 유입되는 test variant 입력은 반드시 검증해야 한다.
- 유효하지 않은 variant 입력은 instruction / test / result 흐름을 crash시키면 안 된다.
- variant 검증 실패 시 단일하고 결정적인 fallback variant를 사용해야 한다.
- fallback 대상 variant의 구체 값은 별도 확정이 필요하다.

### 2.3 Instruction Gate Contract
- 사용자는 테스트 실행 전에 instruction 단계를 거쳐야 한다.
- test start는 instruction 문맥에서 시작되어야 한다.
- instruction 진입 후 start 이전에 이탈하는 경우, 이는 **pre-test abandonment context**로 취급한다.
- 랜딩 유입 등으로 Q1이 사전 응답된 경우에도 instruction이 존재할 수 있으며, instruction은 기존 사전 응답을 무효화하거나 덮어쓰면 안 된다.

### 2.4 Session / Run Lifecycle Contract
- session identity는 instruction, question runtime, result 전 구간에서 연속성을 유지해야 한다.
- 재사용 가능한 활성 session은 탐지 가능해야 한다.
- 다른 test variant로 전환하는 경우 기존 실행 문맥은 닫히거나 대체되어야 한다.
- inactive session timeout 동작은 결정적이어야 한다.
- timeout의 구체 시간값은 별도 확정이 필요하다.

### 2.5 Question Model Contract
- 각 question은 정확히 2개의 answer option만 가져야 한다.
- 각 question은 정확히 1개의 axis/metric만 평가해야 한다.
- 한 question의 두 answer option은 동일 axis 내 상반되는 pole/value로 매핑되어야 한다.
- 하나의 question이 다중 axis에 동시에 기여하면 안 된다.

### 2.6 Progress / Revision / Completion Contract
- progress는 answered count / total question count를 기준으로 계산해야 한다.
- 모든 required question이 응답되기 전에는 completion transition을 허용하면 안 된다.
- 사용자는 진행 중 이전 응답을 수정할 수 있어야 한다.
- 최종 계산과 결과 표시는 수정이 반영된 최종 응답 집합을 기준으로 해야 한다.

### 2.7 Derivation Model Contract
- 각 released variant는 다음을 선언해야 한다.
  - axisCount (`1`, `2`, `4`)
  - ordered axis list
  - scoring schema
  - answers → `scoreStats` → `derivedType` 도출 규칙
  - tie / threshold 처리 규칙
- `derivedType`의 길이는 `axisCount`와 일치해야 한다.
- `derivedType`의 각 문자 위치는 선언된 axis order와 결정적으로 매핑되어야 한다.
- UI는 고정된 MBTI 4축 구조를 가정하면 안 되며, variant 선언을 기준으로 결과를 렌더링해야 한다.
- completed run에 대해서만 최종 `derivedType`을 생성해야 한다.
- 각 axis는 표준 counting rule 하에서 tie가 불가능하도록 홀수 question count를 가져야 한다.
- released dataset이 odd-count rule을 위반하면 blocking validation error로 처리해야 한다.

### 2.8 Result Rendering Contract
- 결과 화면은 최소한 다음 두 가지를 표시해야 한다.
  - 계산된 `derivedType`
  - variant-aware profile / result content
- 결과 콘텐츠는 schema-driven이어야 하며, variant는 어떤 결과 섹션을 지원하는지 선언할 수 있어야 한다.
- variant가 지원하지 않는 결과 섹션은 경고 없이 정상적으로 omission 처리해야 한다.
- variant가 지원한다고 선언한 섹션의 content mapping이 누락된 경우:
  - `derivedType`은 계속 표시해야 한다.
  - user-visible minimal fallback을 제공해야 한다.
  - recoverable path를 제공해야 한다.
  - hard crash를 허용하면 안 된다.

---

## 3. Happy-path Contract

### 3.1 Runtime Entry
- 사용자는 유효한 test variant 문맥으로 진입해야 한다.
- variant 입력이 유효하면 해당 variant의 instruction으로 진입한다.
- variant 입력이 무효하면 deterministic fallback variant로 정규화한 뒤 동일 흐름을 이어간다.

### 3.2 Instruction → Start
- instruction은 test start의 선행 단계다.
- start action이 발생하면 해당 run은 question runtime으로 진입한다.
- 랜딩 유입으로 Q1이 이미 응답된 경우:
  - instruction은 기존 Q1 응답을 유지해야 한다.
  - instruction 이후 표시되는 첫 unanswered question은 Q1이 아니라 다음 문항이어야 한다.

### 3.3 Question Runtime
- question runtime은 variant의 ordered question set을 기준으로 진행한다.
- 사용자는 각 question에서 정확히 두 개의 answer option 중 하나를 선택해야 한다.
- 사용자는 이전 question으로 이동해 응답을 수정할 수 있어야 한다.
- progress는 현재까지 유효하게 응답된 question 수를 기준으로 갱신되어야 한다.
- partial answer 상태에서 결과 계산으로 넘어가면 안 된다.

### 3.4 Completion → Result Derivation
- 마지막 required question까지 응답되면 run은 completion 자격을 갖는다.
- completion 시 시스템은 현재 최종 응답 집합을 바탕으로 `scoreStats`를 계산해야 한다.
- `scoreStats` 계산 후 시스템은 해당 variant의 scoring schema에 따라 `derivedType`을 계산해야 한다.
- 계산된 `scoreStats`와 `derivedType`은 variant 선언과 일치해야 한다.

### 3.5 Result Screen
- result screen은 variant에 맞는 결과 섹션을 표시해야 한다.
- 결과 화면은 적어도 `derivedType`을 잃지 않고 보여줄 수 있어야 한다.
- 결과 섹션이 일부 누락되어도 전체 결과 경험이 즉시 붕괴하면 안 된다.

---

## 4. Error / Fallback / Rollback / Restoration Contract

### 4.1 Invalid Variant Input
- invalid variant input은 crash를 유발하면 안 된다.
- deterministic fallback variant를 통해 recoverable entry를 제공해야 한다.
- fallback 처리 이후에도 instruction / runtime / result 흐름은 일관된 variant 문맥으로 유지되어야 한다.

### 4.2 Blocking Data Errors
다음 경우는 blocking data error로 처리한다.
- test module 누락
- invalid structure
- empty question set
- released dataset의 odd-count rule 위반
- scoring schema 불일치로 인해 `scoreStats` / `derivedType` 계산 불가

blocking data error 발생 시:
- 실행을 계속하면 안 된다.
- 사용자에게 blocking error state를 표시해야 한다.
- retry 또는 다른 안전한 복귀 경로를 제공해야 한다.

### 4.3 Result Content Fallback
- 결과 섹션 지원 여부는 variant 선언을 기준으로 판단한다.
- unsupported section은 정상 omission 처리한다.
- supported section인데 content mapping이 없는 경우:
  - minimal fallback message를 표시해야 한다.
  - `derivedType`은 유지 표시해야 한다.
  - 사용자에게 recoverable path를 제공해야 한다.
- hard crash 또는 blank result screen을 허용하면 안 된다.

### 4.4 Recoverable Error UX
instruction / runtime / result 각 구간은 다음 원칙을 따라야 한다.
- loading state와 error state를 구분한다.
- error state는 actionable path를 포함해야 한다.
- severity는 blocking / non-blocking으로 구분 가능해야 한다.
- recoverable error UX는 retry, 다른 테스트 선택, 홈 복귀 중 적어도 하나 이상의 유효 경로를 제공해야 한다.

### 4.5 Restoration / Continuity
- reused active session은 감지 가능해야 한다.
- 다른 variant로 전환 시 prior context를 그대로 이어붙이면 안 된다.
- inactive timeout 이후 재진입 동작은 결정적으로 처리되어야 한다.
- session continuity와 result continuity는 variant 문맥을 넘어서 섞이면 안 된다.

---

## 5. Terminal Exclusivity & Cleanup Set

### 5.1 Runtime Terminal Exclusivity
하나의 run/session execution 문맥은 정확히 하나의 종료 상태로 귀결되어야 한다.

허용 terminal 후보:
- completed
- pre-start abandonment
- replaced by variant switch
- inactive timeout closure
- blocking data error termination

규칙:
- 동일 run이 동시에 둘 이상의 terminal state를 갖으면 안 된다.
- completed run에 대해서만 결과 계산 및 결과 화면 진입을 허용한다.
- pre-start abandonment는 started run으로 간주하면 안 된다.
- variant switch나 timeout으로 닫힌 prior context를 active 상태로 계속 참조하면 안 된다.

### 5.2 Cleanup / Replacement Set
다음 상황에서는 prior context 정리가 필요하다.
- variant switch
- inactive timeout closure
- blocking data error
- pre-start abandonment 후 재진입

정리 대상은 최소한 다음을 포함해야 한다.
- prior variant association
- stale response set
- stale progress state
- stale completion/result-ready state
- stale derived result context
- stale session/run continuation marker

부분 정리는 허용하지 않는다.  
정리 이후 새 실행 문맥은 이전 문맥의 응답/결과를 잘못 재사용하면 안 된다.

---

## 6. Ambiguity Registry / TBD

### AR-001 Deterministic Default Variant
- Open Question: invalid variant fallback 시 사용할 단일 default variant는 무엇인가?
- Why It Matters: variant validation failure 시 instruction / runtime / result 전체 문맥을 결정한다.
- Required Output: selected default variant identifier 및 선택 근거

### AR-002 Inactive Session Timeout Duration
- Open Question: inactive timeout의 구체 시간값은 얼마인가?
- Why It Matters: session reuse / closure / recovery UX / stale context 방지에 직접 영향
- Required Output: timeout duration, timeout 이후 UX 동작, prior context 유지/폐기 기준

### AR-003 Result Section Taxonomy
- Open Question: 결과 화면의 섹션 단위는 어떤 구조로 선언하는가?
- Why It Matters: unsupported section omission vs supported-but-missing fallback을 구분하려면 section taxonomy가 필요하다.
- Required Output: variant별 section declaration model

### AR-004 Minimal Fallback Message Scope
- Open Question: supported section content가 누락된 경우 minimal fallback은 어느 수준까지 표시하는가?
- Why It Matters: blank state를 피하면서도 과도한 임시 콘텐츠를 만들지 않기 위함
- Required Output: 최소 표시 요소, 사용자 recovery actions, operator-visible signal 여부

---

## 7. Single-change Synchronization

### 7.1 Variant Resolution Change Sync
다음 정책이 바뀌면 함께 갱신해야 한다.
- Section 2.2 Variant Resolution Contract
- Section 3.1 Runtime Entry
- Section 4.1 Invalid Variant Input
- Section 5.1 Runtime Terminal Exclusivity
- Section 8 Acceptance / Traceability

### 7.2 Session Lifecycle Change Sync
다음 정책이 바뀌면 함께 갱신해야 한다.
- Section 2.4 Session / Run Lifecycle Contract
- Section 4.5 Restoration / Continuity
- Section 5.1 Runtime Terminal Exclusivity
- Section 5.2 Cleanup / Replacement Set
- Section 8 Acceptance / Traceability

### 7.3 Progress / Revision / Completion Change Sync
다음 정책이 바뀌면 함께 갱신해야 한다.
- Section 2.6 Progress / Revision / Completion Contract
- Section 3.3 Question Runtime
- Section 3.4 Completion → Result Derivation
- Section 5.1 Runtime Terminal Exclusivity
- Section 8 Acceptance / Traceability

### 7.4 Derivation Schema Change Sync
다음 정책이 바뀌면 함께 갱신해야 한다.
- Section 2.7 Derivation Model Contract
- Section 3.4 Completion → Result Derivation
- Section 4.2 Blocking Data Errors
- Section 8 Acceptance / Traceability

### 7.5 Result Section / Fallback Policy Change Sync
다음 정책이 바뀌면 함께 갱신해야 한다.
- Section 2.8 Result Rendering Contract
- Section 3.5 Result Screen
- Section 4.3 Result Content Fallback
- Section 4.4 Recoverable Error UX
- Section 8 Acceptance / Traceability

---

## 8. Acceptance / Traceability / Release Gate

### 8.1 Release Gate
- 본 Phase는 QA 가능한 요구사항 문서여야 한다.
- release-blocking 항목은 최소 1개 이상의 검증 경로와 연결되어야 한다.
- traceability가 없는 핵심 계약은 release-ready로 간주하지 않는다.

### 8.2 Release-blocking Checks
다음 항목 중 1건이라도 실패하면 릴리스를 차단한다.

1. **Variant Validation / Fallback**
   - invalid variant가 crash를 유발하지 않는다.
   - deterministic fallback이 일관되게 적용된다.

2. **Instruction Gate**
   - start는 instruction 문맥에서만 발생한다.
   - instruction 이탈은 pre-test abandonment로 구분된다.

3. **Landing Ingress Continuity**
   - Q1 pre-answer가 있는 진입에서 instruction이 기존 응답을 무효화하지 않는다.
   - 첫 unanswered question이 올바르게 이어진다.

4. **Question Model Integrity**
   - 모든 question이 정확히 2개 선택지만 가진다.
   - 각 question은 정확히 1개 axis만 평가한다.

5. **Progress / Completion Gating**
   - progress가 answered/total 기준으로 계산된다.
   - 모든 required question 응답 전 completion이 발생하지 않는다.

6. **Revision Integrity**
   - 이전 응답 수정이 가능하다.
   - 최종 계산은 수정 후 최종 응답 기준으로 수행된다.

7. **Session Lifecycle Determinism**
   - reused active session이 탐지 가능하다.
   - variant switch 시 prior context가 닫히거나 대체된다.
   - timeout 이후 stale context가 잘못 유지되지 않는다.

8. **Derivation Correctness**
   - `scoreStats`가 variant schema와 일치한다.
   - `derivedType` 길이와 문자 위치 의미가 axis model과 일치한다.
   - completed run만 최종 결과를 생성한다.

9. **Odd-count Validation**
   - axis별 odd question count rule 위반 시 blocking validation error로 차단된다.

10. **Result Rendering**
   - `derivedType`은 항상 결과 화면의 최소 표시 요소로 유지된다.
   - unsupported result section은 정상 omission 처리된다.
   - supported-but-missing content는 minimal fallback으로 처리된다.

11. **Recoverable Error UX**
   - instruction / runtime / result 각 구간에서 loading / error state가 구분된다.
   - blocking / non-blocking 차이가 사용자 경험에 반영된다.
   - retry 또는 안전한 복귀 경로가 존재한다.

12. **Blocking Data Error Handling**
   - missing module / invalid structure / empty question set / schema mismatch에서 실행을 계속하지 않는다.
   - blank or crash 상태 대신 명시적 error handling으로 귀결된다.

### 8.3 Traceability Requirement
- Section 8.2의 모든 블로킹 항목은 최소 1개 이상의 검증 단위와 매핑되어야 한다.
- 검증 단위는 automated assertion, scenario test, 또는 manual QA checkpoint일 수 있다.
- 미매핑 항목이 존재하면 문서 초안은 완료로 간주하지 않는다.
