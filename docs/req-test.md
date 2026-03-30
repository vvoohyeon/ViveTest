# Test Flow Requirements

## 1. Scope / Non-goals / Locked Decisions

### 1.1 Scope
본 Phase의 구현 범위는 다음 두 축으로 한정한다.

1. **질문 런타임 완성**
   - variant 판정 및 유효성 검증
   - instruction 진입 및 start 규칙 (진입 경로별 분기 포함)
   - progress 계산 및 completion gating
   - answer revision 및 tail reset
   - run/session lifecycle 정리 및 active run 복구

2. **결과 도출과 결과 화면**
   - `derivedType` 도출 (schema-driven, axisCount 가변)
   - `scoreStats` 계산 및 검증
   - result-entry eligibility 상태 관리
   - result derivation loading 계약 (5초 최소 로딩, commit 조건)
   - variant-aware 결과 섹션 렌더링 (dummy data 기반 UI 완성도)
   - result URL self-contained payload 구조
   - 진입 경로별 result UX 분기
   - fallback / error UX (commit-failure / derivation-failure 포함)

### 1.2 Non-goals

- 랜딩 카탈로그 UI 및 카드 인터랙션 세부 규칙
- blog 진입/표시 규칙
- admin analytics / ops
- Action 실패 오퍼레이터 알림 메커니즘 (파이프라인 계약은 §2 포함, 알림 계약 정의 제외)
- local history 저장 및 조회
- share URL 생성 UI/로직 (URL 구조 설계는 포함)
- 닉네임 입력
- 프레임워크/라우팅/i18n 기반 구조 재설계 (랜딩 단계 계승)
- telemetry 이벤트 계약 및 payload schema (skeleton 확보만 포함)
- consent instruction 분기 UX (`ingress type + consent state + card type` 조합 기반 instruction 메시지·divider·CTA set 결정, `OPTED_OUT + available` 딥링크 진입 시  warning note + [Keep Current Preference] 표시, `OPTED_OUT + available` 랜딩 진입 카탈로그 단계 비도달 처리 포함)
  — Landing Requirements §13.5 소유. 본 문서 구현 범위 외. `§6.1`은 route-level invalid-variant recovery를 소유하며,consent 관련 진입 분기는 §13.5 정책 매트릭스 계약을 따른다. shared implementation은 허용하되 ownership boundary는 유지한다.

### 1.3 Locked Decisions

본 문서는 이번 Phase 구현 및 QA 기준 SSOT다. `requirements.md`와 충돌 시 본 문서 우선.  
특정 구현 경로를 불필요하게 고정하는 과도한 코드 수준 지시는 포함하지 않는다.  
**UI 상태 / 복원 / 예외 처리 / fallback UX**는 도메인 로직과 동등한 1급 요구사항이다.

> **절대 불변 규칙**: instruction은 테스트 페이지(`/test/{variantId}`) 위의 overlay로 표시되며, `/instruction`과 같은 별도 라우트를 갖지 않는다. 문서 내 어떤 계약도 instruction을 독립 페이지·라우트로 해석해서는 안 된다.

| 항목 | 결정값 |
|---|---|
| 테스트 진입 경로 | Landing ingress + 직접 접근(딥링크/새로고침) 모두 지원 |
| Scoring schema | schema-driven, axisCount ∈ {1, 2, 4} 가변. MBTI 4축 하드코딩 금지. 각 axis는 `scoringMode: 'binary_majority' \| 'scale'`을 선언한다. 현재 구현 대상은 `binary_majority`만이며 `scale`은 타입 예약 상태다. variant는 `qualifierFields`를 선언해 result URL `type` segment에 scoring 결과 외 보조 식별자를 추가할 수 있다 |
| Answer revision | 이전 문항 재방문 및 답변 수정 허용. 이전 문항 수정 시 tail reset 적용 |
| Staged entry expiry | A/B 선택 시점으로부터 7분. 재진입/새로고침으로 연장되지 않는다 |
| Result URL 구조 | `/result/{variant}/{type}?{base64Payload}` |
| Result URL 인코딩 | `variant`은 path segment 1, `type`은 path segment 2. `type` segment 길이 = `axisCount + sum(qualifierFields[i].tokenLength)`. `qualifierFields`가 없거나 빈 배열이면 길이 = `axisCount`. `scoreStats`와 `shared`(boolean)는 JSON → URL-safe Base64 → 키 없는 query string. `scoringSchemaId`는 URL 어느 위치에도 포함하지 않는다. `variant`가 스키마의 유일한 식별자 |
| 공유 여부 식별자 | `shared: true/false`를 base64 payload 내부에 포함. 별도 `share=y` query parameter를 사용하지 않는다 |
| Result derivation 최소 로딩 시간 | 5초 (변경 가능한 설정값) |
| Inactivity timeout | 마지막 답변 후 30분, 재진입 시점에 판정 |
| 응답 데이터 휘발 | result screen entry commit 완료 직후, timeout 판정 시, 처음부터 다시 하기 commit success 시 즉시 삭제 |
| Telemetry | skeleton(hook 자리)만 확보. 계약 정의는 다음 단계 의무 |
| Share CTA | 이번 단계 미구현 |
| Nickname 입력 | 이번 단계 미구현 |

---

## 2. Data Source & Sync Contract

> **적용 결정**: Decision 1–7 (Google Sheets 연동 계약, 2026년 세션 인계 문서 기준)  
> FRS REQ-F-020(Sheets sync — partial activation 금지, last-known-good 유지)·REQ-F-026(언어 컬럼 누락 시 default locale fallback)의 운영 계약을 이 섹션에서 1급 계약으로 격상한다.

### 2.1 Data Architecture & Source of Truth

- Google Sheets가 테스트 콘텐츠(질문·결과)와 랜딩 카드 메타데이터의 **단일 소스**다.
- 코드베이스의 `raw-fixtures.ts`(및 동등한 fixture 파일)는 **dev/test fallback**으로 유지한다. production 경로에서는 사용하지 않는다.
- 동기화 산출물: **`variant-registry.generated.json`**(또는 `.ts`) 단일 파일. 런타임 코드는 이 파일의 인터페이스만 참조하며, 환경(production / local dev)에 따라 구현 파일만 교체된다.
- `scoringSchemaId`를 포함한 `VariantSchema` 전체가 이 파일에 포함된다. Landing Card 메타데이터(`unavailable` 플래그 포함)도 동일 파일에 통합 관리한다.

### 2.2 Sheet 구성

| Sheet | 역할 | 핵심 컬럼 |
|---|---|---|
| **Questions** | 모든 variant의 질문 데이터 | `variantId`, 질문 인덱스, `poleA`, `poleB`, `questionType`, i18n 텍스트 컬럼 |
| **Results** | 모든 variant의 결과 콘텐츠 | `variantId`, `type segment` key, 결과 섹션별 콘텐츠, i18n 텍스트 컬럼 |
| **Landing Card Metadata** | 랜딩/블로그 카드 메타데이터 | `variantId`, 카드 표시 정보, `unavailable` 플래그 |

- 각 Sheet는 독립적 단일 소스다.
- 동일 `variantId`에 대한 데이터는 반드시 3개 Sheet 전체에 걸쳐 일관성을 유지해야 한다.
- 언어 컬럼 누락 시: default locale fallback 의무 (FRS REQ-F-026 기준).

### 2.3 Deployment Pipeline

**Production**:
1. `main` branch push → GitHub Action 자동 트리거
2. 3개 Sheet 전체 cross-sheet 검증 실행 (§2.4 Action-level 검증 기준)
3. 검증 통과 시: `variant-registry.generated.json` 커밋 → Vercel 배포 트리거
4. 검증 실패 시: 파일 커밋 없음. last-known-good 파일 유지. Action 로그에 불일치 사유 기록.

**Local Dev**:
- fixture 파일이 `variant-registry.generated.json`과 동일 경로·동일 인터페이스로 존재한다.
- 런타임 코드 변경 없이 환경별 파일만 교체된다.

**알림 메커니즘**: Action 로그 확인은 오퍼레이터 책임. 별도 알림 계약을 문서에서 정의하지 않는다 (Decision 6).

### 2.4 Cross-sheet Validation Contract

**1차 방어선 — Action-level Blocking**:
- 3개 Sheet 전체 cross-sheet 검증을 실행한다.
- 불일치 1건이라도 존재하면 파일을 커밋하지 않는다. last-known-good `variant-registry.generated.json`을 유지한다.
- **partial activation 금지**: 일부 variant만 반영하는 부분 커밋을 허용하지 않는다.

**2차 방어선 — Runtime Variant-scoped Fallback**:
- 런타임 초기화 시 cross-sheet 검증을 재실행한다. 1차 방어선과 동일 검증 함수를 사용한다.
- Landing Metadata에만 존재하고 Questions에 없는 variant → 해당 카드 `unavailable` 강등.
- Questions에 존재하고 Results에 없는 variant → 해당 variant 진입 차단 → §6.1 에러 복구 페이지.
- 불일치 variant만 차단하며, 나머지 variant는 정상 서비스한다.

### 2.5 Runtime Lazy Validation Contract

`validateVariantDataIntegrity()`의 실행 시점은 **D-3: Per-request Lazy Validation**을 따른다.

- 앱 초기화 시 전체 variant를 일괄 검증하지 않는다.
- 각 variant가 실제로 **첫 진입 요청**될 때 해당 variant에 대한 검증을 1회 실행한다.
- 첫 검증 이후: 동일 variant는 캐싱된 결과를 사용한다.
- 검증 실패 시: session/run context 생성 없이 해당 variant 진입을 즉시 차단 → §6.1 에러 복구 페이지.
- Landing 카탈로그 렌더링 시점에는 lazy validation이 실행되지 않는다. 랜딩에서는 `cardType`과 enterable 계약 기준으로만 카드 표시 여부를 결정한다.

**카드 타입 계약**:
- Landing Card Metadata Sheet의 `cardType` 컬럼으로 카드의 가시성·진입 가능성을 결정한다.
- 5종 타입: `available` | `unavailable` | `hide` | `opt_out` | `debug`.
  각 타입의 정의와 consent 연동 규칙은 Landing Requirements §2, §13.9가 SSOT다.
- 오퍼레이터 직접 기입과 코드 레벨 자동 강등(§2.4 2차 방어선) 모두 유효하다.

**§2.4 2차 방어선 자동 강등 규칙**:
- Landing Metadata에만 존재하고 Questions Sheet에 없는 variant
  → `hide` 강등 (카탈로그에서 제외. 데이터 오류 variant를 사용자에게 노출하지 않는다).
- Questions Sheet에 존재하고 Results Sheet에 없는 variant
  → 해당 variant 진입 차단 → §6.1 에러 복구 페이지.
  카탈로그 가시성은 `cardType` 값을 유지한다.
- 불일치 variant만 처리하며, 나머지 variant는 정상 서비스한다.

**`unavailable: true` 레거시 필드 처리**:
- 기존 `unavailable: boolean` 필드가 Sheet에 존재하면
  `true` → `cardType: 'unavailable'`으로 해석한다.
- 신규 Sheet 구성에서는 `cardType` 컬럼을 단일 소스로 사용한다.

**검증 범위**:
- `validateCrossSheetIntegrity()` 및 런타임 lazy validation의 검증 대상은
  `variant-registry.generated.json` 내 데이터에 한정한다.
- i18n 메시지 파일(`src/messages/`)은 검증 대상 외다.

### 2.6 In-progress Session Protection

- Sheets sync 및 registry 파일 갱신은 **클라이언트 storage의 진행 중 세션 데이터를 파괴하지 않는다**.
- session/run context는 client-side storage(localStorage 등)에 저장되며 서버 배포와 독립적이다.
- 새 registry 파일은 다음 페이지 로드·네비게이션 시점에 적용된다. 현재 진행 중 세션은 기존 schema를 유지한다.
- 새 registry 적용 후 schema 불일치가 발생하면 §6.2 Blocking Data Errors 계약을 따른다.

### 2.7 Fixture Fallback Policy

- `raw-fixtures.ts` 및 동등한 fixture 파일은 **production 배포에서 사용하지 않는다**.
- **dev 환경**: fixture 파일을 `variant-registry.generated.json`과 동일 경로·동일 인터페이스로 배치한다.
- **테스트**: fixture 파일은 unit/e2e 테스트의 유일한 variant 소스다. Google Sheets 실연동 없이 전체 테스트 스위트가 실행 가능해야 한다.
- fixture 파일의 구조(인터페이스)는 `variant-registry.generated.json`과 동일해야 한다. 구조 불일치는 구현 오류로 처리한다.

---

## 3. Core Domain & UI Lifecycle Definitions

### 3.1 Core Entities

- **Attempt**: 랜딩 카드 A/B 선택 시점에 시작되는 시도 단위(도메인 개념). telemetry `attempt_start` 이벤트 발화 시점과 동일하지 않다. `attempt_start`는 test runtime이 실제로 시작되는 시점(ingress 경로: Q2 제시, 직접 진입 경로: Q1 제시)에 발화한다. ingress 경로에서 시도 의도 및 Q1 pre-answer 기록은 landing 단계의   `card_answered` 이벤트가 담당한다. `card_answered`는 landing phase 계약이며 이 단계에서 재구현하지 않는다.
- **Staged Entry**: landing ingress 전용의 임시 진입 상태. provisional Q1 pre-answer, ingress flag, unconsumed entry marker를 포함한다. A/B 선택 시점으로부터 7분 후 만료된다. 상세 계약은 §3.5 참조.
- **Test Variant**: 사용자가 실행하는 테스트 단위. identifier, scoring schema, axis model, question set, result content 지원 범위를 가진다.
- **Session / Run Context**: instruction → question runtime → result까지 이어지는 실행 문맥.
- **Active Run**: 완료되지 않고 timeout되지 않은 진행 중 테스트 세션. 동일 variant에 대한 응답 데이터가 local storage에 존재하고, 마지막 답변 후 30분 미경과 상태. Completed run은 active run이 아니다.
- **Response Set**: 현재 run에서 기록된 응답 집합.
- **Question Index**: 질문 순서를 나타내는 1-based 인덱스. 내부 로직 및 추후 telemetry 기준으로 사용한다. UI에 문항 번호로 직접 노출하지 않는다.
- **Ingress Flag**: 랜딩 카드에서 Q1 pre-answer와 함께 기록된 진입 플래그. 시작 문항 판정의 유일한 근거.
- **Validated Landing-origin Context**: 랜딩 카드 선택과 ingress flag 저장이 하나의 원자적 동작으로 완료된 상태. Q1 pre-answer를 Q1 응답으로 적용하기 위한 필요충분 조건. 둘 중 하나라도 누락되거나 불완전하면 성립하지 않는다.
- **Result-entry Eligibility**: 마지막 문항 응답이 유효하게 선택되고, `all-required-answered = true`이며, 결과 진입을 막는 blocking 상태가 없을 때 성립하는 자격 상태. 위치 기반이 아니라 논리 조건 기반이다. 상세 계약은 §3.10 참조.
- **Derivation Attempt**: "결과 보기" 액션 이후 결과 계산을 수행하는 단위. 이전 attempt residue와 구분된다.
- **Completed Run**: result screen entry 이후 최종 결과 화면에 도달한 run. same-variant 재진입 시 resume 대상이 아니다.
- **scoreStats**: variant가 선언한 scoring schema에 따라 계산되는 축/지표별 결과 구조.
- **derivedType**: variant별 최종 결과 토큰. axisCount 및 axis order에 따라 길이와 위치 의미가 결정된다.
- **Question Type**: 문항의 역할 분류. `scoring` 문항은 정확히 1개의 scoring axis를 평가한다. `profile` 문항은 scoring axis를 평가하지 않으며, result 표현 보정(qualifier)에 사용되는 응답을 수집한다.
- **Profile Question**: `questionType: 'profile'`로 선언된 문항. axis 귀속이 없고 `scoreStats` 계산에서 제외된다. `questions[]` 배열에 포함되며 progress와 `all-required-answered` 계산 대상이다.
- **Qualifier**: result URL `type` segment에서 derivedType 이후 위치에 포함되는 보조 식별자. 특정 profile 문항의 응답값에서 파생된다. `qualifierFields` 선언 순서대로 positional 파싱된다.
- **Type Segment**: result URL의 `{type}` path segment 전체. derivedType 파트(길이 = `axisCount`)와 qualifier 파트(`qualifierFields` 순서대로 각 `tokenLength` 합산)의 연결로 구성된다. variant에 `qualifierFields`가 없으면 derivedType과 동일하다.
- **QualifierFieldSpec**: `qualifierFields` 배열의 개별 항목. `{ key: string, questionIndex: QuestionIndex, values: string[], tokenLength: number }` 구조. `questionIndex`는 해당 qualifier 값을 제공하는 profile 문항을 가리킨다.
- **Self-contained Payload**: `scoreStats`(schema 선언 기준 축/지표별 결과)와 `shared`(boolean)를 JSON 직렬화 후 URL-safe Base64로 인코딩한 키 없는 query string. `variant`(path segment 1)와 `type`(derivedType 토큰, path segment 2)와 합산하여 서버 없이 result view 재구성이 가능한 데이터 단위. `scoringSchemaId`는 URL 어느 위치에도 포함하지 않는다.
- **Blocking Data Error**: 테스트 실행이나 결과 계산을 진행할 수 없을 정도의 데이터 구조/스키마 오류.
- **Recoverable UI Error**: 사용자에게 retry / 다른 테스트 선택 / 홈 복귀 등 복구 경로를 제공해야 하는 오류 상태.

### 3.2 Variant Resolution Contract

- route / query / storage / session 등에서 유입되는 test variant 입력은 반드시 검증해야 한다.
- 유효하지 않은 variant 입력은 instruction / test / result 흐름을 crash시키면 안 된다.
- variant 검증 실패 시 runtime 진입을 차단하고, 에러 복구 페이지로 이동한다 (§6.1 참조).
- 에러 복구 페이지는 사용자가 다른 테스트를 선택할 수 있는 복구 경로를 제공해야 한다.
- variant 검증 실패는 runtime을 시작하지 않으므로 session/run context가 생성되면 안 된다.

### 3.3 진입 경로 분류

모든 진입 경로는 아래 3가지로 분류하며, 각 경로별 처리 계약을 준수해야 한다.

| 경로 | 정의 | Ingress Flag | 시작 문항 |
|---|---|---|---|
| Landing Ingress | 랜딩 카드 A/B 선택으로 진입. staged entry 생성 | 있음 | Q2 (Q1 pre-answer 소비 후) |
| Direct Cold | 딥링크/직접 URL 입력 또는 general re-entry(새로고침/back-forward). valid active run 없음 또는 timeout. completed run 재진입 포함 | 없음 | Q1 |
| Direct Resume | 딥링크/새로고침/general re-entry. valid active run 존재 | 무관 | 마지막으로 응답을 확정한 문항 기준 |

**불변식**:
- Landing Ingress + active run 존재 시 반드시 §4.2의 프롬프트를 표시해야 한다.
- Direct Resume는 프롬프트 없이 즉시 재개해야 한다. resume 위치는 마지막으로 응답을 확정한 문항이다. 마지막으로 화면에 표시된 문항 기준이 아니다.
- Completed run 재진입(same variant): active run이 존재하지 않으므로 Direct Cold로 분류한다. fresh start로 처리한다. 결과 continuity를 기본 재진입 정책으로 삼지 않는다.
- Landing same-variant A/B 재선택은 항상 restart intent다. 기존 active run 유무와 무관하게 staged entry를 새로 생성한다. 기존 active run은 runtime entry commit success 시점에만 대체된다.
- 진입 경로 판정은 재진입/새로고침 시점에 재평가한다.

### 3.4 Runtime Entry Contract

**Runtime Entry Commit 정의**:
- runtime entry commit은 UI 버튼 클릭 자체가 아니라 question runtime에 진입할 실행 문맥이 확정되는 도메인 이벤트다.
- commit 시점에 아래가 함께 확정된다:
  - variant / run binding
  - 시작 question 위치 (Q1 / Q2 / resumed cursor)
  - staged entry consume (Landing Ingress 경로)
  - old active run replace (Landing Ingress + active run 존재 시)
  - new run activation
  - landing flow 종료

**Instruction과의 관계**:
- instruction Start 클릭은 commit의 한 표현이다.
- instruction 생략 경로에서도 동일한 commit 의미를 가져야 한다.
- commit을 instruction Start 버튼 클릭만으로 정의하면 안 된다.

**Commit success / failure 분기**:
- commit success: 확정된 실행 문맥으로 question runtime 진입.
- commit failure: §6.6 Commit-failure Error State로 처리.
- old active run replace는 commit success에만 결합된다. commit failure 시 old active run replacement가 발생하지 않는다.
- staged entry 만료(7분 경과) 시 commit failure로 처리한다.

**일반 계약**:
- 모든 runtime 진입은 §3.3의 세 경로 중 정확히 하나로 분류되어야 한다.
- 진입 경로가 확정되기 전에 instruction, question runtime, result 중 어느 단계도 시작하면 안 된다.
- variant 유효성 검증은 진입 경로 분류 이전에 완료되어야 한다.
- variant 검증에 실패한 경우 §3.3의 어느 경로로도 분류되지 않으며, §6.1 에러 복구 페이지로 즉시 이동한다.
- 진입 경로와 variant 문맥은 해당 run이 terminal 상태에 도달할 때까지 일관되게 유지되어야 한다.
- 진입 경로가 바뀌는 경우(예: Landing Ingress → 처음부터 다시 하기)는 §8.3 cleanup set을 완료한 뒤 새 경로로 재분류한다.

### 3.5 Staged Entry Contract

staged entry는 landing ingress 전용의 미소비 임시 진입 상태다.

**구성 요소**:
- provisional Q1 pre-answer
- ingress flag
- consume 전 entry marker
- attempt correlation context 일부

**생성 시점**: 랜딩 카드 A/B 선택 시.

**만료**:
- A/B 선택 시점으로부터 7분 후 만료한다.
- 재진입 / 새로고침 / back-forward 탐색으로 연장되지 않는다.
- 만료 후 same-variant 진입은 Direct Cold(fresh entry)로 처리한다.
- 만료 시 별도 경고 없이 자연스럽게 fresh entry로 전환한다.

**복구 허용 조건**: staged entry는 아래 조건을 **모두** 만족할 때만 복구 대상이다.
- same variant
- same tab
- eligible browser navigation (back / forward / refresh 포함)
- unconsumed
- unexpired (7분 미경과)

**Commit 경계**:
- runtime entry commit 전까지 landing flow 내부에서는 staged entry가 우선 상태다.
- runtime entry commit 후에는 staged entry 우선 규칙이 종료되고 일반 active run 규칙이 적용된다.
- landing flow 내부에서 old active run과 staged entry가 공존하는 경우: landing flow 내부에서는 staged entry가 우선, 일반 재진입에서는 old active run이 우선한다.

### 3.6 Instruction Gate Contract

- 사용자는 테스트 실행 전에 instruction 단계를 거쳐야 한다.
- test start는 instruction 문맥에서 시작되어야 한다.
- instruction 진입 후 start 이전에 이탈하는 경우, 이는 **pre-test abandonment context**로 취급한다.
- instruction은 기존 Q1 pre-answer를 무효화하거나 덮어쓰면 안 된다.

**Instruction contract 분기 조건 (SSOT: Landing Requirements §13.5)**:
- instruction 본문은 variant별 고유 `instruction` 데이터가 소유한다. generic fallback을 금지한다.
- consent note / divider / CTA set은 `ingress type + consent state + card type` 조합으로 결정한다.
- 이 섹션에서 `딥링크 유입`은 landing ingress flag가 없는 test route 진입을 뜻한다.
- test route는 route-local consent banner, confirm dialog, blocked popup을 렌더하지 않는다.
- landing ingress + `OPTED_IN` + `available|opt_out`, landing ingress + `OPTED_OUT` + `opt_out`: plain instruction + [Start], Q2부터 진행한다.
- landing ingress + `UNKNOWN` + `available`: instruction + divider + "For a better experience, please agree to the terms to proceed with the test." + [Accept All and Start] / [Deny and Abandon], Accept/Deny 결과에 따라 Q2 continue 또는 랜딩 복귀를 수행한다.
- landing ingress + `UNKNOWN` + `opt_out`: instruction + divider + "For a better experience, please agree to the terms before proceeding with the test. You can still continue without agreeing." + [Accept All and Start] / [Deny and Start], 두 CTA 모두 Q2부터 진행한다.
- 딥링크 유입 + `OPTED_IN` + `available|opt_out`, 딥링크 유입 + `OPTED_OUT` + `opt_out`: plain instruction + [Start], Q1부터 진행한다.
- 딥링크 유입 + `UNKNOWN` + `available`: instruction + divider + "For a better experience, please agree to the terms to proceed with the test." + [Accept All and Start] / [Deny and Abandon], Accept는 Q1 start, Deny는 랜딩 복귀를 수행한다.
- 딥링크 유입 + `UNKNOWN` + `opt_out`: instruction + divider + "For a better experience, please agree to the terms before proceeding with the test. You can still continue without agreeing." + [Accept All and Start] / [Deny and Start], 두 CTA 모두 Q1부터 진행한다.
- 딥링크 유입 + `OPTED_OUT` + `available`: instruction + divider + "This test is only available to users who have agreed. We're sorry, but if you keep your current preference, you will not be able to take this test." + [Accept All and Start] / [Keep Current Preference].
- landing ingress + `OPTED_OUT` + `available`는 카탈로그 단계에서 비도달 상태로 유지한다. test route fallback branch를 두지 않는다.
- route-level invalid-variant recovery owner와 consent instruction owner를 혼합하지 않는다.

**instructionSeen 생명주기**:
- **기록 시점**: Start 버튼 클릭 직후, test_start 진입 직전에 `instructionSeen:{variantId} = true`로 기록한다.
- **재표시 조건**: `instructionSeen:{variantId}`가 `true`인 경우 해당 variant의 instruction을 표시하지 않는다. Direct Resume 경로는 이 규칙의 결과적 적용이다.
- **리셋 조건** (아래 중 하나 발생 시 `instructionSeen:{variantId}`를 삭제한다):
  - 테스트 완료 (result screen entry commit 완료 후, 응답 데이터 휘발과 동시에 리셋)
  - Inactivity timeout 판정 (응답 데이터 휘발과 동시에 리셋)
- **리셋하지 않는 조건**: 처음부터 다시 하기, variant switch — 진행 데이터만 휘발하고 `instructionSeen`은 유지한다.

### 3.7 Session / Run Lifecycle Contract

- session identity는 instruction, question runtime, result 전 구간에서 연속성을 유지해야 한다.
- 재사용 가능한 active run은 탐지 가능해야 한다 (§3.1 Active Run 정의 기준).
- 다른 test variant로 전환하는 경우 기존 실행 문맥은 닫히거나 대체되어야 한다.
- inactive timeout: 마지막 답변 후 30분 경과. 재진입 시점에 판정. 백그라운드 타이머 불필요.
- error state(commit-failure, derivation-failure 등)에 머무는 동안에도 active run inactivity timeout은 freeze되지 않는다.

**Active Run 판정 조건**:
- 해당 variant의 진행 상태가 존재하고, 마지막 답변으로부터 30분이 경과하지 않았으며, run이 완료되지 않은 경우 → active run 유효.
- 30분 초과 시 → timeout 처리. §6.8 휘발 계약 즉시 적용 후 Cold Start.

> **판정 절차의 구현 세부사항 (조회 방법, timestamp 비교 로직 등)은 별도 구현/설계 문서에서 정의한다.**

**Verification**:
1. Automated: 30분 경과 fixture에서 재진입 시 timeout 처리 + Cold Start를 검증한다.
2. Automated: 29분 59초 경과 fixture에서 active run 유효 판정을 검증한다.

### 3.8 Question Model Contract

- 각 question은 정확히 2개의 선택지를 가져야 한다. 두 선택지의 의미는 `poleA`, `poleB` 문자열로 직접 표현한다.
- 각 question은 `questionType: 'scoring' | 'profile'` 필드를 가져야 한다.

**Scoring question 규칙**:
- 정확히 1개의 scoring axis를 평가해야 한다. 축 소속은 `poleA`+`poleB` 쌍이 해당 variant의 `schema.axes` 중 동일 쌍과 일치하는 항목으로 결정된다.
- 하나의 scoring question이 다중 axis에 동시에 기여하면 안 된다. `poleA`+`poleB` 쌍이 schema에서 둘 이상의 axis에 매칭되어서는 안 된다.

**Profile question 규칙**:
- scoring axis에 귀속되지 않는다. `poleA`+`poleB` 쌍이 `schema.axes`와 일치하지 않아도 된다.
- `poleA`와 `poleB`는 서로 달라야 한다 (`poleA ≠ poleB`).
- `scoreStats` 계산에서 제외된다.
- `qualifierFields` 중 해당 question의 `index`를 참조하는 항목이 없는 경우에도 응답은 수집되고 저장된다. 단, result URL 구성에 사용되지 않는다.

**공통 규칙**:
- 사용자의 응답은 선택된 pole 문자열(`poleA` 또는 `poleB` 값)로 직접 저장한다. 'A'/'B' 추상 기호를 중간 변환 단계에서 해석하지 않는다.
- 표시용 텍스트(선택지 본문)는 별도 i18n/콘텐츠 레이어에서 question index 기준으로 조회한다. Question 도메인 타입에 포함하지 않는다.
- `questions[]` 배열은 실행 순서의 유일한 소스다. scoring question과 profile question을 별도 배열로 분리하지 않는다.

**Progress 및 완료 게이팅**:
- `total question count`는 `questions[]` 배열의 전체 길이다 (scoring + profile 포함).
- `all-required-answered`는 scoring 문항과 profile 문항 모두의 응답이 완료된 상태다.
- ingress flag 존재 시 Q1(profile 또는 scoring 무관)은 answered로 계산한다.

> **향후 확장**: 현재 question model은 이진 선택지(`poleA`/`poleB`)만 지원한다. 척도형(1~5점) 응답지 지원은 `AxisSpec.scoringMode: 'scale'` 구현 단계에서 별도 question model 확장이 필요하다. 이번 단계에서는 이진 모델만 구현 대상이다.

### 3.9 Progress / Revision / Tail Reset Contract

- progress는 answered count / total question count를 기준으로 계산해야 한다.
- Ingress flag 존재 시 Q1은 answered로 계산한다.
- 모든 required question이 응답되기 전에는 completion transition을 허용하면 안 된다.
- 사용자는 진행 중 이전 응답을 수정할 수 있어야 한다.
- 이미 답변된 문항을 재방문하면 기존 답변 상태가 선택된 상태로 표시되어야 한다.
- 최종 계산과 결과 표시는 수정이 반영된 최종 응답 집합을 기준으로 해야 한다.

**Tail Reset 계약**:
- 마지막 문항이 아닌 이전 문항의 응답을 변경하면, **변경 확정 즉시** 그 이후 모든 응답을 리셋한다.
- tail reset 즉시: `all-required-answered = false`.
- tail reset 즉시: result-entry eligibility = false (저장형이면 즉시 false로 전환, 계산형이면 즉시 재평가 → false).
- tail reset 즉시: 이전 derivation attempt residue 전체를 폐기한다 (§8.3 cleanup 참조).
- **마지막 문항의 응답 변경은 tail reset을 발생시키지 않는다.** 이전 derivation residue만 무효화하며, 마지막 문항의 새 응답이 유효하면 result-entry eligibility는 유지된다 (§3.10 참조).

### 3.10 Result-entry Eligibility Contract

result-entry eligible은 위치 기반이 아닌 자격 기반 상태다.

**True 조건**: 아래를 모두 만족해야 한다.
- 마지막 문항의 응답이 유효하게 선택됨
- `all-required-answered = true`
- 결과 진입을 막는 blocking 상태 없음

**유지 규칙**:
- 단순 문항 간 이동만으로는 eligibility를 상실하지 않는다.
- 마지막 문항 응답 변경 후에도, 마지막 문항 응답이 유효하고 `all-required-answered = true`이면 eligibility는 유지된다.

**즉시 상실 규칙**:
- 마지막 문항이 아닌 이전 문항 응답 변경으로 tail reset이 발생하면 `all-required-answered = false`가 되어 eligibility는 즉시 false다.
- 이 변화는 변경 확정 즉시 반영되어야 한다.

**UI 반영 규칙**:
- eligibility는 논리 조건에 의해 즉시 true/false가 결정된다.
- 시스템은 마지막 사용자의 유효 응답을 임의로 제거하거나 변경하면 안 된다.
- derivation residue 무효화와 eligibility 평가는 구분한다.

### 3.11 Derivation Model Contract

- 각 released variant는 다음을 선언해야 한다.
  - `axisCount` (`1`, `2`, `4`)
  - `axes`: ordered `AxisSpec[]`. 각 항목은 `{ poleA: string, poleB: string, scoringMode: 'binary_majority' | 'scale' }`. 길이는 `axisCount`와 일치해야 한다.
  - `scoringSchemaId`
  - `qualifierFields?`: optional `QualifierFieldSpec[]`. 각 항목은 `{ key: string, questionIndex: QuestionIndex, values: string[], tokenLength: number }`. 없거나 빈 배열이면 qualifier 없음.
  - answers → `scoreStats` → `derivedType` 도출 규칙 (아래 명세 참조)
- `derivedType`의 길이는 `axisCount`와 일치해야 한다.
- `type` segment의 길이는 `axisCount + sum(qualifierFields[i].tokenLength)`와 일치해야 한다. `qualifierFields`가 없거나 빈 배열이면 `axisCount`와 동일하다.
- `derivedType`의 각 문자 위치는 `schema.axes` 선언 순서와 결정적으로 매핑되어야 한다.
- UI는 고정된 MBTI 4축 구조를 가정하면 안 된다.
- completed run에 대해서만 최종 `derivedType`을 생성해야 한다.
- 각 scoring axis는 `binary_majority` 모드에서 홀수 question count를 가져야 한다. 위반 시 blocking validation error로 처리한다. `profile` 문항은 odd-count rule 적용 대상이 아니다. `scale` 모드 axis는 이번 단계에서 구현하지 않으며 해당 variant는 blocking error로 차단한다.

**ScoreStats 구조**:

```
axisId = poleA + poleB  (파생 문자열, e.g. 'EI')

AxisScoreStat = {
  poleA: string,
  poleB: string,
  counts: Record<string, number>,   // pole 문자열 → 해당 pole 응답 수
  dominant: string                   // counts 기준 다수 pole. binary_majority + 홀수 문항 전제로 동점 불가
}

ScoreStats = Record<string, AxisScoreStat>
// key: axisId (poleA+poleB)
// key 순서는 schema.axes 선언 순서와 일치해야 한다
// profile 문항 응답은 ScoreStats에 포함하지 않는다
```

**도출 절차**:
1. `questions[]`에서 `questionType === 'scoring'`인 문항만 필터링한다.
2. `schema.axes`를 선언 순서대로 순회한다.
3. 각 `AxisSpec { poleA, poleB }`에 대해 `axisId = poleA + poleB`를 파생한다.
4. 필터링된 scoring 문항 중 해당 axisId에 속하는 문항(poleA+poleB 쌍 일치 기준)의 응답을 집계해 `counts`를 구성한다.
5. `counts` 기준 더 높은 pole을 `dominant`로 결정한다. `binary_majority` + 홀수 문항 보장 하에 동점은 발생하지 않는다.
6. `scoreStats[axisId] = { poleA, poleB, counts, dominant }`를 기록한다.
7. `derivedType` 토큰은 `schema.axes` 순서대로 각 axis의 `dominant`를 연결해 생성한다.

**Qualifier 도출 절차**:
1. `qualifierFields`를 선언 순서대로 순회한다.
2. 각 `QualifierFieldSpec { key, questionIndex, values, tokenLength }`에 대해 `responses.get(questionIndex)`로 해당 profile 문항의 응답을 조회한다.
3. 응답값이 `values` 목록에 없으면 blocking error로 처리한다.
4. `type` segment = `derivedType` + qualifier 토큰들의 순서 연결.

**EGTT 예시 (axisCount=1, qualifierFields 1개)**:
```
schema.axes = [{ poleA: 'e', poleB: 't', scoringMode: 'binary_majority' }]
schema.qualifierFields = [{ key: 'sex', questionIndex: 1, values: ['m', 'f'], tokenLength: 1 }]
// questions[0] = { index:1, poleA:'m', poleB:'f', questionType:'profile' }
// questions[1..N] = scoring questions

// 응답: Q1='m', scoring 결과 dominant='e'
// derivedType = 'e'
// qualifier sex = 'm'
// type segment = 'em'
// 결과 라벨 복원: content mapping['em'] → '에겐남'
```

**나이대 qualifier 예시 (tokenLength=3, multi-value):**
```
schema.qualifierFields = [
  { key: 'ageGroup', questionIndex: N, values: ['10s','20s','30s','40s','50s'], tokenLength: 3 }
]
// 응답: Q_N='20s', scoring 결과 dominant='e'
// derivedType = 'e'
// qualifier ageGroup = '20s'
// type segment = 'e20s'   (전체 길이 = axisCount(1) + tokenLength(3) = 4)
```

**자기보고 MBTI qualifier 예시 (tokenLength=4, 16-value):**
```
schema.qualifierFields = [
  {
    key: 'selfMbti',
    questionIndex: N,
    values: [
      'enfj','esfj','entp','enfp','infj','infp',
      'intp','intj','entj','estj','esfp','estp',
      'isfj','isfp','istj','istp'
    ],
    tokenLength: 4
  }
]
// 응답: Q_N='infj', scoring 결과 dominant='e'
// derivedType = 'e'
// qualifier selfMbti = 'infj'
// type segment = 'einfj'  (전체 길이 = axisCount(1) + tokenLength(4) = 5)
```

> `QUALIFIER_SPEC_INVALID` 검증 예:
> - `values: []` → 빈 배열 → 차단
> - `tokenLength: 0` → `<=0` → 차단
> - `values: ['10s', '2s']` with `tokenLength: 3` → '2s'.length(2) ≠ 3 → 차단
> - `DUPLICATE_QUALIFIER_VALUE` 검증 예: `values: ['20s', '20s', '30s']` → 중복 → 차단

**Tie 처리 정책**:
- `binary_majority` 정상 경로(odd-count rule 준수 데이터)에서 동점은 발생하지 않는다.
- odd-count rule 위반은 §6.2 blocking data error로 사전 차단된다. 런타임 tiebreak 로직은 주 경로에 포함하지 않는다.

### 3.12 Result Rendering Contract

result 페이지 렌더링의 추상 원칙 계약이다.  
payload 구조 계약(§5.1)과 분리된 레이어로, §6.4와 §7.1은 이 계약을 위임받아 세부 구현 기준으로 사용한다.

**섹션 선언 모델**:
- variant schema는 `supportedSections` 필드에 지원하는 섹션 ID 목록을 선언해야 한다.
  - 예: `supportedSections: ['axis_chart', 'type_desc', 'trait_list']`
- 섹션 ID 목록에 없는 섹션은 해당 variant가 지원하지 않는 것으로 간주한다.

**섹션 등급**:
- **Mandatory 섹션**: variant 선언과 무관하게 항상 표시해야 한다. omission을 허용하지 않는다.
  - `derived_type`: 계산된 결과 토큰 표시
  - `axis_chart`: axis별 score 시각화
  - `type_desc`: 타입 설명 텍스트
- **Optional 섹션**: variant의 `supportedSections`에 선언된 경우에만 표시한다.
  - `trait_list`: 세부 특성 목록 (그 외 향후 추가 섹션 포함)

**렌더링 원칙**:
- mandatory 섹션은 `supportedSections`에 없어도 항상 렌더링을 시도해야 한다.
- optional 섹션이 `supportedSections`에 없으면 경고 없이 정상 omission 처리한다.
- mandatory·optional 구분 없이, 선언된 섹션의 content mapping이 누락된 경우:
  - `derived_type`은 계속 표시해야 한다.
  - 해당 섹션은 빈 컨테이너와 '준비 중' 류의 짧은 안내 문구로 렌더링한다.
  - operator에게 console warning을 발생시킨다.
  - 별도 recoverable CTA를 제공하지 않는다. `derived_type` 표시로 최소 결과 경험을 보장한다.
  - hard crash를 허용하면 안 된다.
- 결과 섹션 일부 누락이 전체 결과 경험의 즉각적인 붕괴로 이어지면 안 된다.

---

## 4. Happy-path Contract

### 4.1 Instruction → Start

- start action이 발생하면 해당 run은 question runtime으로 진입한다.
- Ingress flag 존재 시:
  - instruction Start 이전 진행 표시: `Question 2 of N`
  - instruction은 기존 Q1 응답을 유지해야 한다.
  - instruction 이후 표시되는 첫 unanswered question은 Q2이어야 한다.
- **Q1 pre-answer consume 계약**:
  - Q1 pre-answer는 **validated landing-origin context**가 확인된 경우에만 Q1 응답으로 적용한다.
  - validated landing-origin context가 없는 경우: pre-answer를 Q1 응답으로 적용하지 않는다. storage에 pre-answer가 잔류하더라도 무시하고 Q1부터 정상 진행한다.
  - read와 consume을 분리한다. read 시 즉시 삭제를 금지한다.
  - consume 시점: instruction Start 버튼 클릭 직후 수행.
  - instruction 생략 경로(variant 재진입)에서는 내부 `test_start` 시점에 consume.

### 4.2 Landing Ingress + Active Run 프롬프트

Landing ingress 경로에서 동일 variant active run이 감지되면 아래 프롬프트를 표시한다:

> "진행하던 테스트가 있습니다. 이어서 하시겠습니까?"  
> [이어서 하기] [처음부터 다시 하기]

두 선택지 모두 runtime entry commit을 시도한다. staged entry가 만료(7분)된 경우 어느 선택지를 택해도 commit failure가 발생할 수 있다.

**[이어서 하기]**:
- commit success 시: 기존 응답 데이터 유지 + 마지막으로 응답을 확정한 문항 다음부터 재개.
- 기존 run에 Q1 응답이 이미 있으면: 새 ingress pre-answer를 무시하고 기존 응답 유지 (AR-005).
- 기존 run에 Q1 응답이 없으면: 새 pre-answer를 Q1 응답으로 저장.
- commit failure 시: §6.6 Commit-failure Error State로 처리.

**[처음부터 다시 하기]**:
- commit success 시: 기존 응답 데이터 즉시 완전 삭제 → Q1 pre-answer를 새 run의 Q1 응답으로 저장 → Q2부터 새 run 시작. Instruction 표시 여부는 §3.6 `instructionSeen` 계약 준수.
- commit failure 시: §6.6 Commit-failure Error State로 처리.

**Verification**:
1. Automated: "이어서 하기" commit success 시 기존 응답 유지 + 마지막 응답 확정 문항 다음에서 재개를 검증한다.
2. Automated: "처음부터 다시 하기" commit success 시 기존 데이터 즉시 삭제 + Q2 시작을 검증한다.
3. Automated: staged entry 만료 후 선택지 선택 시 commit failure 처리를 검증한다.

### 4.3 Question Runtime

- question runtime은 variant의 ordered question set을 기준으로 진행한다.
- 사용자는 각 question에서 정확히 두 개의 answer option 중 하나를 선택해야 한다.
- **응답 확정 직후 시스템은 즉시 current index + 1로 이동한다.** 이 자동 이동 규칙은 정상 순차 진행, revision 후 진행, resume 후 진행 모두에 동일하게 적용된다.
- 사용자는 이전/다음 문항으로 자유롭게 이동할 수 있다. 단, 응답 확정 직후 기본 시스템 반응은 항상 순차 이동(+1)이다.
- 이전 문항으로 이동해 응답을 변경하면 tail reset이 발생한다 (§3.9 참조).
- 마지막 문항의 응답을 변경하면 이전 derivation residue가 무효화된다. tail reset은 발생하지 않는다 (§3.9 참조).
- progress는 현재까지 유효하게 응답된 question 수를 기준으로 갱신되어야 한다.
- 진행 상태는 프로그레스 바와 퍼센트(%)로 표시한다. 문항 번호 텍스트(예: `Question N of M`)는 표시하지 않는다.
- partial answer 상태에서 결과 계산으로 넘어가면 안 된다.

### 4.4 Final Question Screen

마지막 문항은 일반 문항과 다른 terminal-adjacent 규칙을 가진다.

**"결과 보기" CTA 제공 조건**:
- 마지막 문항에서 두 선택지 중 하나의 응답이 유효하게 선택된 상태면 "결과 보기" 액션을 제공한다.
- 이 규칙은 아래 경우 모두에 동일하게 적용된다:
  - 정상 순차 진행으로 마지막 문항에 도달
  - back-from-loading으로 마지막 문항 복귀
  - derivation-failure 후 마지막 문항 복귀
  - 마지막 문항 응답 변경 후

**마지막 문항 응답 보존**:
- 시스템은 마지막 문항에서 사용자가 선택한 최신 응답을 임의로 제거하거나 변경하면 안 된다.
- back-from-loading, derivation-failure 복귀, 이전 문항 탐색 후 복귀 등 어느 경로에서도 마지막 문항의 최신 응답은 유지되어야 한다.

**마지막 문항 응답 변경 시**:
- 이전 derivation attempt residue는 변경 확정 즉시 무효화된다 (§8.3 derivation residue cleanup 범위).
- 마지막 문항의 새 응답은 유지된다.
- `all-required-answered = true`는 유지된다.
- result-entry eligibility는 논리 조건에 따라 즉시 재평가하며, 조건이 충족되면 유지된다.

### 4.5 Completion → Result-entry Eligibility

- 마지막 required question까지 응답이 완료되면 run은 result-entry eligibility를 획득한다 (§3.10).
- result-entry eligible 상태에서 시스템은 마지막 문항 화면에 "결과 보기" 액션을 제공한다.
- 마지막 문항 응답과 결과 도출 단계 진입은 같은 이벤트가 아니다. 사용자가 "결과 보기"를 클릭할 때만 결과 도출 단계로 진입한다.
- "결과 보기" 클릭 전까지 사용자는 마지막 문항 화면에 머물 수 있으며, 이전 문항으로 이동하거나 마지막 문항 응답을 변경할 수 있다.

### 4.6 Result Derivation Loading

**진입**: "결과 보기" 액션 활성화 시 result derivation loading 단계에 진입한다.

**로딩 화면**:
- 결과 도출 단계의 표면 UI는 최소 5초 로딩 화면이다.
- 5초는 변경 가능한 설정값으로 관리한다.
- 실제 계산 시간이 5초보다 짧아도 최소 5초를 표시한다.
- 로딩 화면에는 "뒤로 돌아가기" 옵션을 제공한다.

**Result screen entry commit 조건**: 아래 **두 조건이 모두** 충족된 더 늦은 시점에만 result screen entry commit이 확정된다.
- `derivation_computed = true`
- `min_loading_duration_elapsed = true` (설정값 이상 경과)

**계산 순서**: 최종 응답 집합을 바탕으로 `scoreStats` 계산 → variant scoring schema에 따라 `derivedType` 계산. 계산된 값은 variant 선언과 일치해야 한다.

**응답 데이터 삭제 시점**: result screen entry commit 완료 직후 §6.8 휘발 계약을 실행한다. 계산 완료(`derivation_computed = true`)만으로는 응답 데이터를 삭제하지 않는다.

**확정 저장 시점**: result URL payload 인코딩 및 최종 결과 관련 확정 저장은 result screen entry commit 이후에만 허용한다. 계산이 완료되었더라도 result screen entry commit 전에는 최종 persisted result로 취급하면 안 된다.

**Derivation failure**: 계산 자체가 실패하면 §6.7 Derivation-failure Error State로 처리한다.

### 4.7 Back-from-Loading

**복귀 위치**: 로딩 화면에서 "뒤로 돌아가기"를 선택하면 해당 variant의 **마지막 문항**으로 복귀한다.

**복귀 시 유지 상태**:
- 마지막 문항의 기존 응답은 유지한다.
- "결과 보기" 액션 제공 조건은 논리 조건에 따라 재평가하며, 조건이 충족되면 다시 제공한다.
- 새로운 staged entry나 fresh run 생성으로 해석하면 안 된다.

**Rollback 정리**: back-from-loading 시 아래를 정리한다.
- `derivation-in-progress` 임시 상태
- loading residue (loading timer, min-duration timer, attempt id/correlation token)
- `result_entry_committed`, `result_persisted`는 이 시점에 발생하지 않았어야 한다.
- stale result residue가 남으면 안 된다.

---

## 5. Result URL & 케이스 분기 계약

### 5.1 Self-contained Payload 구조

result 페이지 URL은 서버 없이 result view를 재구성할 수 있는 self-contained payload를 포함해야 한다.

**URL 구조**:
```
/result/{variant}/{type}?{base64Payload}
```

예시 (MBTI):
```
/result/mbti/infj?eifjafehjfioaesjif1843f
```

예시 (EGTT, qualifier 포함):
```
/result/egtt/em?eifjafehjfioaesjif1843f
```
(`em` = derivedType `e` + qualifier sex `m`)

**필드 분리 원칙**:
- `variant`: test variant 식별자. URL path segment 1. 이 값 하나로 고정 scoring logic과 rendering schema를 유일하게 식별한다. `scoringSchemaId`는 URL 어느 위치에도 포함하지 않는다.
- `type`: `type` segment. URL path segment 2. derivedType 파트(길이 = `axisCount`)와 qualifier 파트(`qualifierFields` 순서대로 각 `tokenLength` 합산)의 연결. `qualifierFields`가 없거나 빈 배열이면 derivedType과 동일. 전체 길이 = `axisCount + sum(qualifierFields[i].tokenLength)`.
- `base64Payload`: `scoreStats`와 `shared`(boolean)만 포함한다. qualifier 값은 `type` segment에서 운반하며 payload에 중복 포함하지 않는다. JSON 직렬화 후 URL-safe Base64로 인코딩해 **키 없는 query string** 위치에 단독으로 추가한다.
- 공유 여부는 `shared` 필드를 base64 payload 내부에 boolean으로 포함한다.

**Base64 payload JSON 구조 (MBTI 4축 예시)**:
```json
{
  "scoreStats": {
    "EI": { "poleA": "E", "poleB": "I", "counts": { "E": 4, "I": 5 }, "dominant": "I" },
    "SN": { "poleA": "S", "poleB": "N", "counts": { "S": 8, "N": 9 }, "dominant": "N" },
    "TF": { "poleA": "T", "poleB": "F", "counts": { "T": 6, "F": 11 }, "dominant": "F" },
    "JP": { "poleA": "J", "poleB": "P", "counts": { "J": 10, "P": 7 }, "dominant": "J" }
  },
  "shared": false
}
```

**Base64 payload JSON 구조 (EGTT 1축 예시)**:
```json
{
  "scoreStats": {
    "et": { "poleA": "e", "poleB": "t", "counts": { "e": 15, "t": 10 }, "dominant": "e" }
  },
  "shared": false
}
```
(gender qualifier는 `type` segment `"em"`에서 운반. payload에 포함하지 않는다.)

- `scoreStats` key는 scoring axis의 `poleA+poleB` 파생 문자열 (`axisId`). profile 문항 응답은 포함하지 않는다. schema 선언 순서로 직렬화한다.
- axisCount=1 variant는 `scoreStats` entry가 1개, axisCount=2는 2개다. 구조는 동일하다.

**Base64 인코딩 규칙**: URL-safe Base64 (`+`→`-`, `/`→`_`, padding `=` 제거).

**불변식**:
- payload는 untrusted input으로 취급하며, 수신 시 Base64 디코딩 → JSON 파싱 → schema validation → type segment 파싱 순서로 검증을 강제한다.
- `type` segment 파싱: `variant`로 schema를 조회 → `axisCount` 길이만큼 derivedType 추출 → `qualifierFields` 순서대로 각 `tokenLength`만큼 qualifier 값 추출 → 각 값이 해당 `QualifierFieldSpec.values`에 포함되는지 검증.
- `type` segment 전체 길이는 `axisCount + sum(qualifierFields[i].tokenLength)`와 일치해야 한다. 불일치 시 §6.3 invalid payload로 처리한다.
- qualifier 값이 해당 `QualifierFieldSpec.values`에 없으면 §6.3 invalid payload로 처리한다.
- payload에 원문 질문/답변 텍스트, PII를 포함하면 안 된다.
- `variant` path segment으로 schema를 조회할 수 없는 경우 §6.3 invalid payload로 처리한다.
- `scoreStats` 구조는 `variant`로 식별된 schema의 scoring axes 선언과 일치해야 한다. 불일치 시 §6.3 invalid payload로 처리한다.

### 5.2 결과 페이지 케이스 매트릭스

result 페이지 접근 시 아래 케이스 매트릭스에 따라 UX를 분기한다.

| 케이스 | Payload 유효성 | payload.shared | local storage 매칭 | UX | CTA |
|---|---|---|---|---|---|
| 1 | 유효 | false | 무관 | 내 결과 UX | 다시하기 |
| 2 | 유효 | true | 없음 | 공유받은 결과 UX | 나도 테스트하기 |
| 3 | 유효 | true | 있음 | 내 결과 UX (shared 무시) | 다시하기 |
| 4 | 무효 | 무관 | 무관 | 에러 렌더링 | 랜딩으로 돌아가기 |

**케이스 3**: history 미구현 상태이므로 이번 단계에서 케이스 2와 동일하게 처리한다. history 구현 단계에서 케이스 3 분기를 반드시 추가해야 한다 (AR-006).

CTA 동작:
- **다시하기**: `/test/{variant}`로 이동. `instructionSeen`이 완료/timeout 시 리셋된 상태이므로, 테스트 페이지 진입 시 instruction overlay가 자동 표시된다. 별도 `/instruction` 라우트를 거치지 않는다.
- **나도 테스트하기**: `/test/{variant}`로 이동. `instructionSeen`이 없는 첫 진입이므로, 테스트 페이지 진입 시 instruction overlay가 자동 표시된다.

**Verification**:
1. Automated: `payload.shared = false`인 유효 payload 접근 시 케이스 1 UX를 검증한다.
2. Automated: `payload.shared = true`인 유효 payload 접근 시 케이스 2 UX를 검증한다.
3. Automated: 무효 payload 접근 시 에러 렌더링을 검증한다.

---

## 6. Error / Fallback / Rollback / Restoration Contract

### 6.1 Invalid Variant Input

invalid variant 입력은 runtime을 시작하지 않고 에러 복구 페이지로 이동하는 것으로 처리한다.

**에러 복구 페이지 계약**:
- crash를 유발하면 안 된다.
- 간단한 안내 문구와 함께 테스트 카드 최대 2개를 표시한다.
- session / run context를 생성하면 안 된다.

**복구 카드 선정 규칙**:
1. 랜딩 카탈로그의 카드 목록을 선언 순서 기준으로 앞에서부터 순회한다.
2. 해당 variant의 테스트를 사용자가 이미 완료한 경우 해당 카드를 제외한다.
3. 완료 여부 판단 기준: local storage (이번 Phase). history 구현 이후에는 local storage + history 모두 적용 (§9.2 의무 항목 참조).
4. 제외 후 앞에서부터 2개를 선택한다.

**엣지 케이스**:
- 미완료 카드가 1개뿐인 경우: 1개만 표시한다.
- 미완료 카드가 0개인 경우 (전체 완료): 카드를 표시하지 않고 랜딩 페이지로 돌아가기 CTA만 제공한다.

**Verification**:
1. Automated: invalid variant 진입 시 에러 복구 페이지 표시 + session 생성 `0건`을 검증한다.
2. Automated: 미완료 카드 2개 이상 존재 시 카드 2개 표시를 검증한다.
3. Automated: 미완료 카드 1개 시 카드 1개만 표시를 검증한다.
4. Automated: 전체 완료 시 카드 0개 + 랜딩 CTA 표시를 검증한다.
5. Automated: 카드 선택 순서가 카탈로그 선언 순서 기준 앞에서부터임을 검증한다.

### 6.2 Blocking Data Errors

다음 경우는 blocking data error로 처리한다:
- test module 누락
- invalid structure
- empty question set
- `binary_majority` scoringMode를 가진 scoring axis에서 odd-count rule 위반 (profile 문항은 적용 제외)
- `scale` scoringMode를 가진 axis 선언 — 현재 미구현 모드이며 해당 variant 진입을 차단한다
- scoring schema 불일치로 인해 `scoreStats` / `derivedType` 계산 불가
- `qualifierFields`의 `questionIndex`가 존재하지 않는 문항을 가리키는 경우
- `qualifierFields`의 `questionIndex`가 `scoring` 문항을 가리키는 경우 (profile 문항이어야 함)
- `qualifierFields` 내 중복 `key`
- `qualifierFields` 항목의 `values` 배열이 비어 있거나, `tokenLength <= 0`이거나,
  `values` 내 어느 값의 문자 수가 `tokenLength`와 불일치하는 경우
  → `QUALIFIER_SPEC_INVALID` 반환
- `qualifierFields` 항목의 `values` 배열 내 중복 값이 존재하는 경우
  → `DUPLICATE_QUALIFIER_VALUE` 반환

blocking data error 발생 시 실행을 계속하면 안 되며, 사용자에게 명시적 error state와 안전한 복귀 경로를 제공해야 한다.

### 6.3 Invalid Result Payload

payload가 아래 조건 중 하나라도 해당하면 에러 렌더링으로 처리한다:
- `variant` path segment 누락 또는 빈 값
- `type` path segment 누락 또는 빈 값
- 키 없는 query string 누락 또는 URL-safe Base64 디코딩 실패
- JSON 파싱 실패
- 필수 필드 누락 (`scoreStats`)
- `variant` path segment에 해당하는 schema를 찾을 수 없음
- `type` segment 전체 길이가 `axisCount + sum(qualifierFields[i].tokenLength)`와 불일치
- `type` segment에서 추출한 qualifier 값이 해당 `QualifierFieldSpec.values`에 없음
- `scoreStats` 구조가 `variant`로 식별된 schema의 scoring axes 선언과 불일치 (profile 문항 axis 포함 여부 무관)

에러 렌더링 UX: 랜딩으로 돌아가기 CTA 제공. 부분 렌더링을 금지한다.

**Verification**:
1. Automated: `variant` path 누락, `type` path 누락, Base64 디코딩 실패, JSON 파싱 실패 각각에서 에러 렌더링을 검증한다.
2. Automated: 유효한 `variant`/`type` path + Base64 payload 조합에서 정상 렌더링을 검증한다.
3. Automated: 무효 payload에서 부분 렌더링 `0건`을 검증한다.
4. Automated: `type` segment 길이가 `axisCount + qualifierFields tokenLength 합산`과 불일치 시 에러 렌더링을 검증한다.
5. Automated: qualifier 값이 `QualifierFieldSpec.values`에 없을 때 에러 렌더링을 검증한다.
6. Automated: `variant`에 해당하는 schema 조회 실패에서 에러 렌더링을 검증한다.

### 6.4 Result Content Fallback

§3.12 Result Rendering Contract에서 위임받는 세부 구현 기준이다.

- optional 섹션(`supportedSections`에 없는 섹션)은 경고 없이 정상 omission 처리한다.
- mandatory 섹션(`derived_type`, `axis_chart`, `type_desc`)은 `supportedSections` 선언 여부와 무관하게 렌더링을 시도해야 한다.
- mandatory·optional 구분 없이, 선언된 섹션의 content mapping이 없는 경우:
  - `derived_type`은 계속 표시해야 한다.
  - 해당 섹션은 빈 컨테이너와 '준비 중' 류의 짧은 안내 문구로 렌더링한다.
  - operator에게 console warning을 발생시킨다.
  - 별도 recoverable CTA를 제공하지 않는다.
- hard crash 또는 blank result screen을 허용하면 안 된다.

**Verification**:
1. Automated: `supportedSections`에 없는 optional 섹션이 렌더링되지 않음을 검증한다.
2. Automated: mandatory 섹션이 `supportedSections` 미선언 variant에서도 렌더링됨을 검증한다.
3. Automated: content 누락 fixture에서 빈 컨테이너 + 안내 문구 표시, hard crash `0건`, console warning 발생을 검증한다.
4. Automated: content 누락 시 `derived_type` 섹션 미손상을 검증한다.

### 6.5 Recoverable Error UX

instruction / runtime / result 각 구간은 다음 원칙을 따른다:
- loading state와 error state를 구분한다.
- error state는 actionable path를 포함해야 한다.
- severity는 blocking / non-blocking으로 구분 가능해야 한다.
- recoverable error UX는 retry, 다른 테스트 선택, 홈 복귀 중 적어도 하나 이상의 유효 경로를 제공해야 한다.

| 에러 유형 | 심각도 | 처리 |
|---|---|---|
| Invalid variant ID | Blocking | 전용 에러 페이지 + 랜딩 CTA |
| Invalid result payload | Blocking | 에러 렌더링 + 랜딩 CTA |
| 콘텐츠 섹션 누락 (선언된 섹션) | Non-blocking | fallback 표시 + 계속 진행 가능 |
| Schema data 검증 오류 (짝수 문항) | Blocking | 해당 variant 진입 차단 |
| Commit-failure | Blocking | §6.6 처리: old run 보존 + 복구 액션 |
| Derivation-failure | Blocking | §6.7 처리: 재시도 또는 마지막 문항 복귀 |
| Telemetry hook 실패 | Non-blocking | 핵심 flow 계속 진행 |

### 6.6 Commit-failure Error State

**정의**: runtime entry commit 자체가 확정되지 못한 실패 상태. staged entry 만료(7분), 목적지 라우트 진입 실패 등이 원인이 될 수 있다.

**유지 / 폐기**:

| 구분 | 항목 |
|---|---|
| 유지 | old active run (변경 없이 보존) |
| 폐기 | new staged entry, restart intent, pending new-run context |

**표면 UX**: 시스템은 사용자를 old active run으로 자동 복귀시키면 안 된다. 아래 액션을 제공해야 한다:
- **retry fresh entry**: 새 진입 다시 시도
- **이전 진행으로 돌아가기**: old active run resume
- **홈/랜딩 복귀**

**"이전 진행으로 돌아가기" 실행 시**:
- old active run validity를 실행 시점에 재검증한다.
- 재검증 성공 시 resume 위치: 마지막으로 응답을 확정한 question.
- 재검증 실패(old active run timeout 등): 자동 전환을 금지한다. 동일 error state를 유지하고 안내 메시지를 노출하며 남은 액션만 허용한다.

> error state에 머무는 동안에도 old active run inactivity timeout은 freeze되지 않는다 (§3.7 참조).

### 6.7 Derivation-failure Error State

**정의**: result derivation loading 단계에 진입했으나 계산 자체가 실패한 상태. commit-failure와는 별도 taxonomy다.

**진입 조건**: result screen entry commit 및 result persistence 이전에 derivation 계산 실패가 확정되면 진입한다.

**기본 허용 액션**:
- **마지막 문항으로 돌아가기**: §4.7 Back-from-Loading 계약을 따른다.
- **다시 결과 보기 시도**: 새 derivation attempt로 로딩 단계 재진입.
- **홈/랜딩 복귀**

**"다시 결과 보기 시도" 계약**:
- 이전 attempt의 재개가 아니라 동일 응답 집합 기반의 **새 derivation attempt**다.
- 직전 cleanup bundle(아래 폐기 항목)을 먼저 적용한 후 새 attempt로 진입한다.
- timer / attempt id / correlation token은 새로 생성한다. partial result carryover를 금지한다.

*유지 항목*:
- 현재 variant 식별자
- 마지막 문항 포함 최종 응답 집합
- `all-required-answered = true`
- 마지막 문항의 현재 선택 응답
- result-entry eligibility 기반 자격

*폐기 항목*:
- 이전 derivation failure marker
- 이전 `derivation-in-progress` marker
- 이전 derivation attempt id / correlation token
- 이전 loading timer / min-duration timer
- 이전 partially computed result residue
- 이전 `result-ready` / `result-entry pending` residue
- 이전 failure-specific local storage 임시값

**Verification**:
1. Automated: derivation-failure 발생 시 허용 액션 3가지가 제공됨을 검증한다.
2. Automated: "다시 결과 보기 시도" 후 이전 residue 잔류 `0건`을 검증한다.
3. Automated: "마지막 문항으로 돌아가기" 후 마지막 문항 응답 보존 + derivation residue 정리를 검증한다.

### 6.8 응답 데이터 휘발 계약

아래 조건 중 하나라도 발생하면 진행 중 응답 데이터를 즉시 완전 삭제해야 한다.

| 휘발 트리거 | 삭제 범위 |
|---|---|
| Result screen entry commit 완료 | run continuation을 가능하게 하는 모든 진행 상태 (`instructionSeen` 포함 삭제) |
| Inactivity timeout (30분, 재진입 시 판정) | run continuation을 가능하게 하는 모든 진행 상태 (`instructionSeen` 포함 삭제) |
| 처음부터 다시 하기 (commit success 시) | run continuation을 가능하게 하는 모든 진행 상태 (`instructionSeen` 제외) |

> derivation-failure 상태에서는 응답 데이터를 삭제하지 않는다. result screen entry commit이 아직 발생하지 않았기 때문이다.

**삭제 원칙**:
- 삭제는 해당 variant 범위에서만 수행한다. 다른 variant 데이터를 건드리지 않는다.
- 부분 삭제를 허용하지 않는다. 삭제는 원자적으로 수행해야 한다.
- 삭제 완료 전 새 run 시작을 허용하지 않는다.

> **구현 세부사항 (storage key 목록, key 네이밍, store 구조)은 별도 구현/설계 문서에서 정의한다.**

**Verification**:
1. Automated: result screen entry commit 완료 직후 해당 variant의 run continuation 상태 + `instructionSeen` 잔류 `0건`을 검증한다.
2. Automated: timeout 발생 재진입 후 해당 variant의 run continuation 상태 + `instructionSeen` 잔류 `0건`을 검증한다.
3. Automated: "처음부터 다시 하기" commit success 직후 run continuation 상태 잔류 `0건` + `instructionSeen` 유지를 검증한다.
4. Automated: derivation-failure 상태에서 응답 데이터가 삭제되지 않음을 검증한다.
5. Automated: 다른 variant 데이터가 cleanup에 의해 변경되지 않음을 검증한다.

### 6.9 Restoration / Continuity

- reused active run은 감지 가능해야 한다.
- 다른 variant로 전환 시 prior context를 그대로 이어붙이면 안 된다.
- timeout 이후 재진입 동작은 결정적으로 처리되어야 한다.
- session continuity와 result continuity는 variant 문맥을 넘어서 섞이면 안 된다.

---

## 7. Result 화면 계약

### 7.1 콘텐츠 섹션 구성

§3.12 Result Rendering Contract에서 위임받는 세부 구현 기준이다.  
이번 단계에서 아래 섹션을 dummy data로 구성한다. 섹션 구조는 schema-driven으로 설계한다.

**Mandatory 섹션** (variant 선언 여부와 무관하게 항상 표시):
1. `derived_type` — `type` segment 전체를 키로 content mapping에서 조회한 표시 라벨 강조 표시. qualifier가 없는 variant(MBTI 등)에서는 derivedType 토큰과 동일. qualifier가 있는 variant(EGTT 등)에서는 `type` segment 전체(e.g. `"em"`)를 content mapping 키로 사용해 조회한 라벨(e.g. `"에겐남"`)을 표시한다.
2. `axis_chart` — scoring axis별 score 시각화 (scoreStats 기반, schema 선언 순서. axisCount 1/2/4 모두 지원). profile 문항 응답은 axis_chart 시각화 대상이 아니다. qualifier 값 시각화는 `derived_type` 섹션의 라벨 표시로 대체된다.
3. `type_desc` — 타입 설명 텍스트 (dummy text, 섹션 구조 확정)

**Optional 섹션** (`supportedSections`에 선언된 경우에만 표시):
4. `trait_list` — 세부 특성 목록 (dummy text, 섹션 존재 확정)

**Verification**:
1. Automated: axisCount 1/2/4 dummy fixture에서 mandatory 섹션 3개 모두 렌더링됨을 검증한다.
2. Automated: `supportedSections`에 `trait_list` 포함 시 렌더링, 미포함 시 omission됨을 검증한다.
3. Automated: schema 선언 순서와 axis_chart 렌더링 순서 일치를 검증한다.

---

## 8. Terminal Exclusivity & Cleanup Set

### 8.1 Runtime Terminal Exclusivity

하나의 run/session execution 문맥은 정확히 하나의 종료 상태로 귀결되어야 한다.

```
ENTRY → INSTRUCTION(optional) → IN_PROGRESS → RESULT_ELIGIBLE → DERIVATION_LOADING → COMPLETED → RESULT
                                      ↓                               ↓
                                   ABORTED                    DERIVATION_FAILED (non-terminal)
```

허용 terminal 상태:
- `completed`: result screen entry commit 완료 + result persisted
- `pre_start_abandonment`: instruction 이탈 (started run으로 간주하지 않음)
- `replaced_by_variant_switch`: 다른 variant로 전환
- `inactive_timeout_closure`: 30분 경과 후 재진입 시 판정
- `blocking_data_error_termination`: schema/data 오류로 실행 불가

규칙:
- 동일 run이 동시에 둘 이상의 terminal state를 갖으면 안 된다.
- `completed` run에 대해서만 결과 화면 진입을 허용한다.
- variant switch나 timeout으로 닫힌 prior context를 active 상태로 계속 참조하면 안 된다.

> commit-failure와 derivation-failure는 run의 terminal 상태가 아니다. 진행 중 error state이며, run은 여전히 eligible 또는 in-progress 상태에 있다.

### 8.2 State Hygiene / Storage Contract

result derivation 전환 구간에서 아래 상태를 구분해서 관리해야 한다. 단일 플래그로 뭉개면 안 된다.

| 상태 | 의미 |
|---|---|
| `derivation_in_progress` | 로딩 단계 진입 시 기록하는 임시 상태 |
| `derivation_computed` | 계산 완료 여부 |
| `min_loading_duration_elapsed` | 최소 설정 시간 경과 여부 |
| `result_entry_committed` | result screen entry commit 완료 여부 |
| `result_persisted` | 결과 확정 저장 완료 여부 |

- 로딩 단계 진입 시 local storage에는 `derivation_in_progress` 임시 상태만 기록한다.
- 최종 결과 관련 확정 저장은 `result_entry_committed` 이후에만 허용한다.
- back-from-loading 및 derivation-failure 시 `result_entry_committed`, `result_persisted`는 발생하지 않았어야 한다.
- stale residue가 다음 run에 carry over되면 안 된다.

### 8.3 Cleanup Set

다음 상황에서는 prior context 정리를 원자적으로 수행해야 한다. 부분 정리는 허용하지 않는다.

| 상황 | Cleanup 범위 |
|---|---|
| 처음부터 다시 하기 (commit success) | run continuation을 가능하게 하는 모든 진행 상태 (`instructionSeen` 유지) |
| Timeout 판정 (재진입 시) | run continuation을 가능하게 하는 모든 진행 상태 (`instructionSeen` 포함 삭제) |
| Result screen entry commit 완료 | run continuation을 가능하게 하는 모든 진행 상태 (`instructionSeen` 포함 삭제) |
| Commit-failure 발생 | new staged entry + restart intent + pending new-run context 폐기. old active run 유지 |
| Derivation-failure 발생 | §6.7 폐기 항목 목록 전체. 응답 집합 + eligibility 유지 |
| 마지막 문항 응답 변경 | §6.7 폐기 항목 목록과 동일 범위의 derivation residue 무효화. 응답 집합 + eligibility 유지 가능 |
| 이전 문항 응답 변경 (tail reset) | 변경 이후 응답 전체 + §6.7 폐기 항목 목록과 동일 범위의 derivation residue 전체 폐기 |
| Back-from-loading | `derivation_in_progress` 임시 상태 + loading residue 정리. 응답 집합 유지 |
| 전환 실패/취소 (랜딩→테스트) | validated landing-origin context 관련 상태 (`instructionSeen` 유지) |
| variant switch / blocking data error | 해당 variant의 모든 실행 문맥 상태 (`instructionSeen` 유지) |

cleanup은 해당 variant 범위에만 영향을 준다.

> **구체적인 cleanup 대상 항목 목록 (storage key, store 구조)은 별도 구현/설계 문서에서 정의한다.**

---

## 9. Telemetry Skeleton

### 9.1 이번 단계 정책

이번 단계에서 telemetry는 **hook 자리(skeleton)만 확보**한다. 이벤트 계약, payload schema, correlation 계약은 포함하지 않는다.

skeleton으로 확보해야 할 hook 위치:
1. 랜딩 카드 A/B 선택 시점 (`card_answered` 대응, ingress 경로 전용)
   + 블로그 카드 Read more CTA 선택 시점
   ※ `card_answered`는 landing phase 이벤트다. 이 hook은 landing→test
   전환 경계 검증을 위한 참조 위치이며, test flow에서 재발화하지 않는다.
2. instruction 완료 후 test runtime 진입 시점 (`attempt_start` 대응)
   (Start 버튼 클릭 → question runtime 전환 = runtime entry commit)
   ingress 경로: Q2 제시 시점. 직접 진입 경로: Q1 제시 시점.
3. question 답변 시점 (`question_answered` 대응, 문항별)
   ingress 경로: Q2부터 발화. Q1은 landing 단계 `card_answered`로 기록됨.
   직접 진입 경로: Q1부터 발화.
   세션당 `question_answered` 총 발화 횟수는 경로에 따라 N-1(ingress) 또는
   N(direct)이다. 이 비대칭은 의도된 설계이며 문서화된 계약이다.
4. test 완료 확정 시점 (`final_submit` 대응, result screen entry commit)
5. result 필수 콘텐츠(`derived_type` 블록) 뷰포트 진입 시점
   (`result_viewed` 대응, Intersection Observer 1회 발화 후 disconnect)
6. user-visible error render 시점

### 9.2 다음 Phase 구현 의무 (MANDATORY)

> **⚠️ 다음 Phase 구현 착수 전에 아래 항목을 완료해야 한다. 생략하고 그 다음 단계로 진행하는 것을 금지한다.**

1. 최소 이벤트셋 계약:
   **Landing phase 이벤트 (이번 단계 재구현 불필요, 연계 정합성 확인 의무)**:
   - `landing_view`: landing phase 발화. test flow 재발화 없음.
   - `card_answered`: ingress 경로 전용, landing phase 발화. test flow 재발화 없음.
     `source_card_id`, `target_route`, `landing_ingress_flag(=true)` 필수 필드.
   - 위 두 이벤트와 `attempt_start`·`question_answered` 간의 연계 정합성은
     릴리스 블로커 #28에서 검증한다.

   **이번 단계 구현 의무**:
   - `attempt_start`: ingress=Q2 제시 시점, direct=Q1 제시 시점 발화.
     필수 추가 필드: `landing_ingress_flag`, `question_index_1based`
     (ingress=2, direct=1).
   - `question_answered`: 문항별 발화. 필수 필드: `questionIndex`(1-based),
     `totalQuestions`.
     ingress 경로에서 Q1은 landing `card_answered`로 기록되므로 Q2부터 발화.
     세션당 총 발화 횟수가 경로에 따라 N-1(ingress)/N(direct)임을 이탈 분석
     시 반드시 고려해야 한다.
   - `final_submit`: result screen entry commit 시점 발화.
   - `result_viewed`: `derived_type` 블록 뷰포트 진입 시점, Intersection
     Observer 1회 발화 후 disconnect.

2. `session_id` non-null 보장 계약:
   - `attempt_start` 발화 시점부터 해당 세션의 모든 이벤트에서 `session_id`는 non-null이어야 한다.
   - `attempt_start` 이전 이벤트(`landing_view`, `card_answered`)는 **transport-patch 모델**을 적용한다: consent/session 확보 이전에 큐잉된 이벤트는 `session_id=null`로 발화하며, transport 단계에서 session_id가 패치된다. 이 비대칭은 의도된 설계이며 cross-phase event integrity 분석 시 반드시 고려해야 한다.
   - `validateTelemetryEvent()` 및 e2e smoke는 `attempt_start` 이후 이벤트에서 `session_id !== null`을 직접 단언해야 한다. 이 단언 누락은 blocker #18 미매핑으로 처리한다.

> **이 항목들이 완성되지 않은 상태에서 share, history, admin 구현을 시작하면 telemetry 데이터 신뢰성을 보장할 수 없다.**

---

## 10. Ambiguity Registry

### AR-001 Invalid Variant 처리 정책
- **Status**: ✅ 확정
- **결정 내용**: invalid variant 진입 시 fallback variant로 대체하지 않는다. 에러 복구 페이지를 표시하며, 사용자가 미완료한 테스트 카드 최대 2개를 카탈로그 선언 순서 기준으로 제공한다. 완료 이력은 이번 Phase에서 local storage 기준, history 구현 이후 local storage + history 모두 적용.
- **기존 계약 영향**: §3.2의 "fallback variant 사용" 계약을 "에러 복구 페이지 이동" 계약으로 대체함. "deterministic fallback variant" 개념은 이 문서에서 제거됨.
- **Affected Sections**: 3.2, 3.4, 6.1, 12.2(#1)

### AR-002 Inactive Session Timeout Duration
- **Status**: ✅ 확정 (30분, 재진입 시점 판정)
- **Affected Sections**: 3.7, 6.8, 8.3

### AR-003 Result Section Taxonomy
- **Status**: ✅ 확정
- **결정 내용**: variant schema의 `supportedSections` 필드에 섹션 ID 목록으로 선언. Mandatory 섹션(`derived_type`, `axis_chart`, `type_desc`)은 선언 불필요, 항상 렌더링. Optional 섹션(`trait_list` 등)은 `supportedSections` 선언 시에만 렌더링.
- **Affected Sections**: 3.12, 6.4, 7.1
- **AR-003 확장 요건 (신규 optional 섹션 추가 시 필요한 정의)**:
  신규 `SectionId`를 `supportedSections`에 추가하려면 아래 5가지를 동일 변경셋에서 정의해야 한다.
  1. `SectionId` — 코드베이스 전체에서 중복 없는 string literal
  2. variant schema 선언 — 해당 variant의 `supportedSections` 배열에 명시
  3. 데이터 소스 컬럼 — Sheets에 해당 섹션 content mapping 컬럼 추가
  4. 콘텐츠 누락 fallback — AR-004 계약 동일 적용 (빈 컨테이너 + '준비 중' + console warning, hard crash 금지)
  5. 렌더 순서 — mandatory 3개 섹션(`derived_type`, `axis_chart`, `type_desc`) 이후에만 배치
  위 5가지 중 하나라도 미정의 상태로 섹션 ID를 추가하면 안 된다.

### AR-004 Minimal Fallback Message Scope
- **Status**: ✅ 확정
- **결정 내용**: content mapping 누락 섹션 → 빈 컨테이너 + '준비 중' 류 짧은 안내 문구. operator에게 console warning. 별도 recoverable CTA 없음. `derived_type` 표시로 최소 결과 경험 보장.
- **Affected Sections**: 3.12, 6.4

### AR-005 이어서 하기 시 Q1 충돌 처리
- **Status**: ✅ 확정 (기존 run의 Q1 응답 유지, 새 pre-answer 무시)
- **Reason**: "이어서 하기"는 기존 run의 연속성 보장
- **Affected Sections**: 4.2

### AR-006 케이스 3 이번 단계 처리
- **Status**: ✅ 확정 (이번 단계 임시: 케이스 2와 동일. history 구현 시 케이스 3 분기 추가)
- **Affected Sections**: 5.2

### AR-007 Profile Question / Qualifier 구조
- **Status**: ✅ 확정
- **결정 내용**:
  1. profile question은 `questions[]` 배열에 포함, `questionType: 'profile'` 필드로 구분. 별도 배열 분리 없음.
  2. qualifier는 result URL `type` segment에서 derivedType 이후 positional 위치에 포함. payload에 중복 포함하지 않음.
  3. `type` segment 파싱은 schema의 `qualifierFields` 선언 기준 positional — 코드 분기 없음.
  4. qualifier가 없는 variant(MBTI 등)는 `qualifierFields` 부재로 자연 퇴화.
  5. `scoreStats`는 scoring axis만 포함. profile 문항 응답은 포함하지 않음.
  6. `axis_chart`는 scoring axis만 시각화. qualifier 값은 `derived_type` 섹션 라벨로 표현.
  7. odd-count rule은 `binary_majority` scoring 문항에만 적용. profile 문항 적용 제외.
  8. `AxisSpec.scoringMode: 'binary_majority' | 'scale'` 예약. `scale`은 현재 미구현이며 해당 variant blocking error 처리.
- **Affected Sections**: 1.3, 3.8, 3.9, 3.11, 5.1, 6.2, 6.3, 7.1, 10, 12.2

---

## 11. Single-change Synchronization

정책이 변경될 때 함께 갱신해야 하는 섹션 묶음을 명시한다.

| 변경 트리거 | 동기화 대상 섹션 |
|---|---|
| Variant resolution / 에러 복구 카드 정책 변경 | 3.2, 3.4, 6.1, 8.1, 12.2 |
| `questionType` 정책 변경 (scoring/profile 분류) | 3.8, 3.9, 3.11, 6.2, AR-007, 12.2 |
| `qualifierFields` / `type` segment 구조 변경 | 1.3, 3.11, 5.1, 6.2, 6.3, 7.1, AR-007, 12.2 |
| `scoringMode` 정책 변경 (신규 모드 추가 포함) | 3.11, 6.2, 12.2 |
| `QualifierFieldSpec` 구조 변경 (key/values/tokenLength) | 3.11, 5.1, 6.3, 12.2 |
| Session / active run / timeout 정책 변경 | 3.6, 3.7, 4.2, 6.8, 6.9, 8.1, 8.3, 12.2 |
| instructionSeen 기록·리셋 정책 변경 | 3.6, 6.8, 8.3, 12.2 |
| Ingress flag / validated landing-origin context / 시작 문항 정책 변경 | 3.1, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 8.3, 12.2 |
| Staged entry expiry 변경 | 3.5, 1.3, 8.3, 12.2 |
| Runtime entry commit 정책 변경 | 3.4, 3.5, 4.2, 6.6, 8.3, 12.2 |
| Progress / revision / tail reset 정책 변경 | 3.9, 3.10, 4.3, 4.4, 8.3, 12.2 |
| Result-entry eligibility 정책 변경 | 3.10, 4.4, 4.5, 8.3, 12.2 |
| Result derivation loading / 최소 시간 변경 | 1.3, 4.6, 8.2, 8.3, 6.8, 12.2 |
| Back-from-loading 계약 변경 | 4.4, 4.7, 6.7, 8.2, 8.3, 12.2 |
| Commit-failure / Derivation-failure taxonomy 변경 | 6.5, 6.6, 6.7, 8.1, 8.3, 12.2 |
| Derivation schema (axisCount / axis model) 변경 | 3.11, 4.6, 6.2, 5.1, 12.2 |
| Result URL payload 구조 변경 | 5.1, 5.2, 6.3, 9.2(§5), 12.2 |
| Result section / fallback 정책 변경 | 3.12, 6.4, 6.5, 7.1, AR-003, AR-004, 12.2 |
| `payload.shared` 필드 정책 변경 | 5.1, 5.2, 12.2 |
| 응답 데이터 휘발 시점 변경 | 4.6, 6.8, 8.3, 12.2 |
| Telemetry skeleton hook 위치 변경 | 9.1, 9.2, 12.2 |
| 에러 심각도 분류 변경 | 6.1, 6.2, 6.3, 6.4, 6.5, 12.2 |
| cross-phase event integrity 정책 변경 (`card_answered`↔`attempt_start` 연계, `landing_ingress_flag` 계약) | 3.1, 9.1, 9.2, 12.2, Landing Requirements §12.1, §14.3 |
| Sheets sync 계약 변경 (sheet 구성, cross-sheet 검증 범위, lazy validation 정책, `unavailable` 처리 방식) | 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 12.2 |

---

## 12. Acceptance / Traceability / Release Gate

### 12.1 Release Gate

- 릴리스 게이트 명령: `npm run qa:gate`
- 최소 구성: `build && test && test:e2e:smoke`
- 1건 실패 시 릴리스 차단
- 최종 PASS는 연속 3회(3/3)

### 12.2 Release-blocking Checks

아래 항목 중 1건이라도 실패하면 릴리스를 차단한다.

1. **Variant Validation / Error Recovery**: invalid variant가 crash를 유발하지 않는다. 에러 복구 페이지로 이동하며 session이 생성되지 않는다. 복구 카드가 카탈로그 순서 + 완료 이력 필터 기준으로 최대 2개 표시된다.
2. **진입 경로 분기**: Landing Ingress / Direct Cold / Direct Resume 각 경로 분기 정확성. completed run 재진입이 Direct Cold로 분류됨.
3. **Instruction Gate**: start는 instruction 문맥에서만 발생한다. instruction 이탈은 pre-test abandonment로 구분된다. `instructionSeen`은 Start 클릭 시점에 기록되고, result screen entry commit 완료 및 timeout 시 리셋된다. 처음부터 다시 하기·variant switch 시 `instructionSeen`이 유지된다.
4. **Instruction / Ingress Continuity**: Q1 pre-answer가 있는 진입에서 instruction이 기존 응답을 무효화하지 않는다. consume 시점이 Start 클릭 직후(또는 test_start)임을 검증한다.
5. **Active Run 판정**: 30분 경계값 전후 판정 정확성. timeout 시 휘발.
6. **응답 데이터 휘발**: result screen entry commit 후, timeout 후, 처음부터 다시 하기 commit success 후 — 잔류 데이터 `0건`. derivation-failure 상태에서 응답 데이터 미삭제.
7. **Question Model Integrity**: 모든 question이 `questionType` 필드를 가진다. scoring question은 정확히 2개 선택지 + 정확히 1개 scoring axis 매핑. profile question은 정확히 2개 선택지 + axis 귀속 없음 (`poleA ≠ poleB` 충족). 전체 question index 중복 없음.
8. **Progress / Completion Gating**: progress가 answered/total 기준. 미응답 문항 존재 시 completion 차단.
9. **Answer Revision / Tail Reset**: 이전 문항 재방문 시 기존 답변 표시. 이전 문항(non-final) 응답 변경 즉시 tail reset + eligibility false. 마지막 문항 응답 변경 시 derivation residue 무효화만 발생, eligibility 조건 충족 시 유지.
10. **Session Lifecycle Determinism**: variant switch 시 prior context 정리. timeout 이후 stale context 미유지.
11. **Derivation Correctness**: scoring 문항만 필터링해 `computeScoreStats` 수행. axisCount 1/2/4 각각 derivedType 토큰 길이 검증. schema 순서 준수. qualifier 없는 variant(MBTI)에서 `type` segment = derivedType. qualifier 있는 variant(EGTT)에서 `type` segment = derivedType + qualifier 토큰 연결. completed run만 결과 생성.
12. **Odd-count Validation**: `binary_majority` scoringMode scoring 문항에만 odd-count rule 적용. profile 문항은 적용 제외. 짝수 문항 수 scoring axis fixture에서 blocking error 발생. `scale` mode axis 선언 fixture에서 blocking error 발생.
13. **Result Payload Validation**: 필수 필드 누락 시 에러 렌더링. 부분 렌더링 `0건`.
14. **Result 케이스 분기**: 케이스 1/2/4 UX 및 CTA 분기 정확성. 케이스 1 "다시하기"와 케이스 2 "나도 테스트하기" 모두 `/test/{variant}`로 이동하며, instruction overlay는 `instructionSeen` 상태에 따라 테스트 페이지에서 자동 판정된다.
15. **Axis Score 시각화**: axisCount 1/2/4 렌더링. schema 선언 순서 준수.
16. **콘텐츠 누락 fallback**: hard crash `0건`. fallback 표시. blocking/non-blocking 분류 정확성.
17. **Cleanup Set 원자성**: cleanup 후 잔류 데이터 `0건`. 다른 variant 데이터 영향 `0건`.
18. **Telemetry Skeleton**: §9.1에 명시된 6개 hook 위치 확보 누락 `0건`.
19. **Staged Entry**: A/B 선택 시점으로부터 7분 만료. 재진입/새로고침으로 연장되지 않음. 만료 후 Direct Cold 처리. commit 경계 전후 우선 규칙 분기 정확성.
<!-- assertion:B20-result-entry-eligibility -->
20. **Result-entry Eligibility**: all-required-answered + 마지막 문항 유효 응답 조건 즉시 반영. tail reset 발생 즉시 false. 마지막 문항 변경 후 조건 충족 시 유지.
<!-- assertion:B21-final-question-screen -->
21. **Final Question Screen**: result-entry eligible 상태에서 "결과 보기" CTA 제공. back-from-loading / derivation-failure 복귀 후에도 마지막 문항 응답 보존 및 "결과 보기" 재제공.
<!-- assertion:B22-result-derivation-loading -->
22. **Result Derivation Loading**: 5초(설정값) 최소 로딩. result screen entry commit = `derivation_computed = true` AND `min_loading_duration_elapsed = true` 두 조건 동시 충족. persistence timing: commit 이후에만 확정 저장. state hygiene: 5개 상태 플래그 미혼용.
<!-- assertion:B23-back-from-loading -->
23. **Back-from-Loading**: 항상 마지막 문항 복귀 (last-viewed 기준 아님). 마지막 문항 응답 보존. derivation residue + loading residue 정리. `result_entry_committed` / `result_persisted` 미발생 확인.
<!-- assertion:B24-commit-failure -->
24. **Commit-failure**: old active run 유지. staged entry / pending context 폐기. 자동 복귀 금지. 허용 액션 3가지 제공. "이전 진행으로 돌아가기" 실행 시 old run validity 재검증.
<!-- assertion:B25-derivation-failure -->
25. **Derivation-failure**: commit-failure와 taxonomy 분리. cleanup bundle 적용 후 새 attempt. 응답 집합 + eligibility 유지. partial result carryover `0건`.
<!-- assertion:B26-traceability-closure -->
26. **Traceability Closure**: blocker 1~25 모두 최소 1개 자동 단언 매핑.
<!-- assertion:B27-type-segment-parsing-qualifier-validation -->
27. **Type Segment Parsing / Qualifier Validation**: `qualifierFields` 없는 variant에서 `type` segment 길이 = `axisCount`. `qualifierFields` 있는 variant에서 `type` segment 길이 = `axisCount + tokenLength 합산`. qualifier 값이 `values` 목록 외 값이면 에러 렌더링. `qualifierFields.questionIndex`가 scoring 문항을 가리키면 blocking data error. `qualifierFields` 항목의 `values` 빈 배열·`tokenLength<=0`·값 길이 불일치 시 `QUALIFIER_SPEC_INVALID` blocking error. `qualifierFields` 항목의 `values` 배열 내 중복 값 존재 시 `DUPLICATE_QUALIFIER_VALUE` blocking error.blocking 항목 1~27 모두 최소 1개 자동 단언 매핑.
<!-- assertion:B28-cross-phase-event-integrity-shared-fixture -->
28. **Cross-phase Event Integrity (Landing→Test)**: ingress 경로에서     `card_answered`(landing phase) → `attempt_start`(test phase) 순서 보장.     `card_answered.landing_ingress_flag = true`인 세션에서     `attempt_start.landing_ingress_flag = true`이고     `attempt_start.question_index_1based = 2`임을 검증한다.
직접 진입 경로에서 `card_answered` 미발화 + `attempt_start.question_index_1based = 1` 임을 검증한다.
Landing Requirements §14.3 Blocker #15와 연동하며, 두 블로커의 단언이 동일 픽스처를 공유해야 한다.
<!-- assertion:B29-sheets-sync-action-validation -->
29. **Sheets Sync: Action-level Validation**: GitHub Action cross-sheet 검증이 불일치 감지 시 `variant-registry.generated.json` 커밋을 차단한다. last-known-good 파일이 유지된다. partial activation(일부 variant만 반영하는 부분 커밋)이 발생하지 않는다. 검증 함수는 runtime 2차 방어선과 동일 구현을 공유해야 한다.
<!-- assertion:B30-runtime-lazy-validation-unavailable-guard -->
30. **Runtime Lazy Validation & Unavailable Guard**: `getLazyValidatedVariant(variantId)` 첫 호출 시 `validateVariantDataIntegrity()` 실행 후 결과가 캐싱된다. 검증 실패 variant는 session/run context 생성 없이 §6.1 에러 복구 페이지로 이동한다. `unavailable: true` variant는 Landing 카탈로그에서 제외되고, 직접 URL 접근 시에도 §6.1 에러 복구 페이지로 이동한다. 나머지 variant는 검증 실패 variant의 영향을 받지 않는다. blocker 1~30 모두 최소 1개 자동 단언 매핑.

### 12.3 Traceability Requirement

- Section 11.2의 모든 블로킹 항목은 최소 1개 이상의 검증 단위와 매핑되어야 한다.
- 검증 단위는 **automated assertion**, **scenario test**, 또는 **manual QA checkpoint** 중 하나 이상이어야 한다.
- 미매핑 항목이 존재하면 릴리스를 차단한다.
- Section 10 동기화 트리거 변경 시 traceability 매핑을 동일 변경셋에서 갱신한다.
