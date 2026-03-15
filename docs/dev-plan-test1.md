# Test Flow 구현 계획

> **기준 문서**: `docs/req-test.md` (이하 요구사항)  
> **구성**: Phase 전체 요약 → Phase 1 세부 계획 → Phase 2 예비 요약  
> **원칙**: 이 문서만으로 구현 착수 가능 수준. 구현 방식 결정은 구현자 재량이며, 요구사항이 명시한 계약과 검증 기준을 충족하는 한 어떤 접근도 허용.

---

## Part 1 — 전체 Phase 요약 (10 Phases)

| Phase | 핵심 목표 | 주요 산출물 | 전제 Phase |
|---|---|---|---|
| **1** | Domain Foundation | 타입 정의, schema-driven 도출 모델, pure 함수 | — |
| **2** | Storage · Session Lifecycle · Data Volatility | storage 추상 레이어, active run 판정, 5개 상태 플래그, 3가지 휘발 트리거 | 1 |
| **3** | Entry Path · Staged Entry · Invalid Variant Recovery | 3-경로 분류기, staged entry lifecycle, 에러 복구 페이지 | 1, 2 |
| **4** | Instruction Gate · Runtime Entry Commit | instruction overlay (비-라우트), `instructionSeen` lifecycle, commit 도메인 이벤트 | 1, 2, 3 |
| **5** | Question Runtime Core | 응답 루프, tail reset, result-entry eligibility 즉시 반영 | 1, 2, 3, 4 |
| **6** | Derivation · Loading Screen | scoreStats/derivedType 계산, 5초 최소 로딩 AND 조건, back-from-loading | 1, 2, 5 |
| **7** | Result URL Payload · Validation | URL 구조, base64 인코딩, payload 검증 실패 경로 | 1 |
| **8** | Result Page · Content Fallback | 케이스 매트릭스(1/2/4), mandatory/optional 섹션, content fallback | 6, 7 |
| **9** | Error States · Terminal Exclusivity · Cleanup Set | commit-failure / derivation-failure taxonomy, §7.1 전이 테이블, §7.3 cleanup 원자성 | 4, 5, 6 |
| **10** | Telemetry Skeleton · Release Gate | §8.1 hook 6개, traceability closure (blocker 1~25 매핑) | 전체 |

---

## Part 2 — Phase 1 세부 구현 계획

### 개요

**목적**: 이후 모든 런타임 로직의 타입 전제를 확립한다.  
**포함 요구사항 섹션**: §2.1, §2.2, §2.8, §2.11, §5.2  
**출력 형태**: 코드 산출물은 타입 정의와 pure 함수만. 부수효과(storage, 라우팅, UI 렌더링) 없음.  
**완료 조건**: 아래 태스크 전부 + 릴리스 블로커 #7, #11, #12 자동 단언 매핑 완료.

---

### 태스크 목록

#### T1-1 — Core Entity 타입 정의

**목적**: §2.1, §2.8에서 명시된 core entity를 코드 상 명확한 타입으로 고정한다.

**제거 항목 (기존 설계 대비)**:
- `AxisId` brand type — 문항에서 제거. axisId는 poleA+poleB 파생값으로만 사용
- `AnswerPole = 'A' | 'B'` — 추상 이진 기호 제거. 응답은 pole 문자열을 직접 저장
- `AnswerOption` 타입 — Question의 poleA/poleB가 직접 선택지 의미를 가지므로 제거
- `AxisDefinition.positivePole` — ScoreStats 계산이 counts 기준 다수결이므로 불필요

**구현 범위**:

```typescript
// 변경 없는 타입
QuestionIndex   // 1-based 숫자 brand type
VariantId       // string brand type
AxisCount       // 1 | 2 | 4
SectionId       // string (supportedSections 항목 식별자)

// 신규/변경 타입
AxisSpec = {
  poleA: string   // 첫 번째 선택지에 대응하는 pole (e.g., 'E')
  poleB: string   // 두 번째 선택지에 대응하는 pole (e.g., 'I')
  // axisId는 파생값: `${poleA}${poleB}` — 이 타입에 별도 필드로 포함하지 않음
}

Question = {
  index: QuestionIndex     // 1-based, 불변
  poleA: string            // 첫 번째 선택지의 pole
  poleB: string            // 두 번째 선택지의 pole
  // 축 소속: poleA+poleB 쌍이 schema.axes 중 동일 쌍과 일치하는 항목으로 결정
  // 표시용 텍스트는 별도 i18n 레이어 — 이 타입에 포함하지 않음
}

// 응답 저장 타입
// Map<QuestionIndex, string>: 선택된 pole 문자열 직접 저장 (e.g., 'E' 또는 'I')
// 'A'/'B' 추상 기호를 경유하지 않음

AxisScoreStat = {
  poleA: string
  poleB: string
  counts: Record<string, number>  // e.g., { 'E': 7, 'I': 3 }
  dominant: string                 // counts 기준 다수 pole (e.g., 'E')
}

ScoreStats = Record<string, AxisScoreStat>
// key: axisId = poleA + poleB (e.g., 'EI')
// key 순서는 schema.axes 선언 순서와 일치

DerivedType = string  // 길이 = axisCount, 각 위치 = schema.axes 순서 매핑

ScoringSchema = {
  variantId: VariantId
  scoringSchemaId: string       // URL에 노출하지 않음 (§4.1 불변식)
  axisCount: AxisCount
  axes: AxisSpec[]              // ordered, 길이 = axisCount
  supportedSections: SectionId[]
}

VariantSchema = {
  variant: VariantId
  schema: ScoringSchema
  questions: Question[]
}

ResultPayload = {
  scoreStats: ScoreStats
  shared: boolean
}
```

**검증 기준**:
- `ScoringSchema.axes` 배열 길이가 `axisCount`와 다르면 런타임 검증 함수로 차단 (T1-4 위임).
- `DerivedType` 길이가 `axisCount`와 불일치하는 값 생성은 §2.11 계약 위반 — 생성 함수에서 검증.
- 동일 poleA+poleB 쌍이 `schema.axes` 내에서 중복되면 안 된다. T1-4에서 검증.

---

#### T1-2 — Variant Resolution 계약 (pure 함수)

**목적**: §2.2에서 명시된 "variant 입력 검증 → 성공/실패 분기" 경계를 pure 함수로 확립한다.

**구현 범위**:

```
validateVariant(
  input: unknown,
  registeredVariants: VariantId[]
): ValidationResult<VariantId>

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: 'MISSING' | 'UNKNOWN' | 'UNAVAILABLE' }
```

**계약**:
- `input`이 등록된 VariantId에 없으면 `ok: false`.
- 성공 시 `ok: true; value: VariantId`.
- 이 함수는 session/run context를 생성하거나 부수효과를 일으키지 않는다.
- Phase 3 에서 이 결과를 소비해 경로 분기를 수행한다 (`ok: false` → §5.1 에러 복구 페이지).

---

#### T1-3 — Question Model 검증 (pure 함수)

**목적**: §2.8에서 명시된 불변식을 검증하는 pure 함수를 확립한다.

**불변식 체크리스트 (question 단위)**:
1. 각 question은 `poleA`와 `poleB` 두 필드를 모두 가져야 한다.
2. `poleA`와 `poleB`는 서로 달라야 한다 (`poleA ≠ poleB`). 동일하면 axis 내 상반된 선택지가 성립하지 않는다.
3. 각 question의 `index`는 1-based이며, 동일 variant 내 중복이 없어야 한다.

> schema.axes 내 중복 poleA+poleB 쌍 검증은 schema-level 관심사로 T1-4(`DUPLICATE_AXIS_SPEC`)에서 처리한다. T1-3은 question 단위 불변식만 담당한다.

```typescript
validateQuestionModel(questions: Question[]): ValidationResult<Question[]>
```

---

#### T1-4 — Blocking Data Error 검증 (pure 함수)

**목적**: §5.2의 blocking data error 조건을 variant 로드 시점에 검증하는 pure 함수를 확립한다.

**차단 조건 (하나라도 해당 시 `BlockingDataError` 반환)**:
- `questions` 배열이 비어 있음
- question model 불변식 위반 (T1-3 재사용)
- **Odd-count rule 위반**: 동일 axis에 배정된 question 수가 짝수인 경우  
  — 짝수이면 동점(tie)이 발생 가능 → scoring schema 계약 위반
- scoring schema 선언의 `axes` 배열 길이가 `axisCount`와 불일치

```
type BlockingDataErrorReason =
  | 'EMPTY_QUESTION_SET'
  | 'QUESTION_MODEL_VIOLATION'
  | 'EVEN_AXIS_QUESTION_COUNT'      // odd-count rule 위반
  | 'AXIS_COUNT_SCHEMA_MISMATCH'

validateVariantDataIntegrity(
  schema: VariantSchema
): { ok: true } | { ok: false; reason: BlockingDataErrorReason; detail?: string }
```

**Odd-count rule 구현 세부**:
```typescript
// schema.axes를 순회하며 각 AxisSpec의 poleA+poleB 쌍에 매칭되는
// questions를 필터링한 뒤 개수가 짝수이면 차단
function checkOddCountRule(
  questions: Question[],
  axes: AxisSpec[]
): { ok: true } | { ok: false; axisId: string; count: number } {
  for (const axis of axes) {
    const axisId = axis.poleA + axis.poleB
    const axisQuestions = questions.filter(
      q => q.poleA === axis.poleA && q.poleB === axis.poleB
    )
    if (axisQuestions.length % 2 === 0) {
      return { ok: false, axisId, count: axisQuestions.length }
    }
  }
  return { ok: true }
}
```

추가 검증: `schema.axes` 내 중복 poleA+poleB 쌍 존재 시 `'DUPLICATE_AXIS_SPEC'` 반환.
추가 `BlockingDataErrorReason` 항목:
```typescript
| 'DUPLICATE_AXIS_SPEC'    // schema.axes 내 동일 poleA+poleB 쌍 중복
```

---

#### T1-5 — Derivation Model (pure 함수)

**목적**: §2.11의 schema-driven derivation 계약을 pure 함수로 구현한다. UI, 라우팅, storage 의존 없음.

**구현 범위**:

```typescript
// Step 1: responses에서 axis별 점수를 집계 → ScoreStats 구성
computeScoreStats(
  questions: Question[],
  responses: Map<QuestionIndex, string>,   // 선택된 pole 문자열 직접 저장
  schema: ScoringSchema
): ScoreStats | { error: 'INCOMPLETE_RESPONSES' | 'UNMATCHED_QUESTION' }

// Step 2: ScoreStats에서 derivedType 토큰 생성
deriveDerivedType(
  scoreStats: ScoreStats,
  schema: ScoringSchema
): DerivedType | { error: 'AXIS_NOT_FOUND' | 'TOKEN_LENGTH_MISMATCH' }
```

**`computeScoreStats` 계약**:
- `responses.size`가 `questions.length`와 다르면 `INCOMPLETE_RESPONSES` 반환 (completed run 전제 위반 — §2.11).
- `schema.axes`를 선언 순서대로 순회한다.
- 각 `AxisSpec { poleA, poleB }`에 대해 `axisId = poleA + poleB`를 파생한다.
- 해당 axis 소속 문항: `questions`에서 `q.poleA === axis.poleA && q.poleB === axis.poleB`인 항목.
- 응답이 `poleA`도 `poleB`도 아닌 값이면 `UNMATCHED_QUESTION` 반환.
- `counts` 집계 후 더 높은 카운트 pole을 `dominant`로 결정. 홀수 문항 보장 하에 동점 불가.
- 결과: `scoreStats[axisId] = { poleA, poleB, counts, dominant }`.
- MBTI 문자를 하드코딩하지 않는다. axisCount 1/2/4 모두 동일 함수로 처리.

**`deriveDerivedType` 계약**:
- `schema.axes` 선언 순서대로 각 axis의 `scoreStats[axisId].dominant`를 연결한다.
- `axisId`가 `scoreStats`에 없으면 `AXIS_NOT_FOUND` 반환.
- 생성된 토큰 길이가 `schema.axisCount`와 불일치하면 `TOKEN_LENGTH_MISMATCH` 반환.
- 결과 토큰의 각 문자 위치는 `schema.axes` 선언 순서와 결정적으로 매핑된다.

**예시 (axisCount=4, MBTI 기준)**:
```typescript
schema.axes = [
  { poleA: 'E', poleB: 'I' },
  { poleA: 'S', poleB: 'N' },
  { poleA: 'T', poleB: 'F' },
  { poleA: 'J', poleB: 'P' }
]
// responses: { 1→'I', 2→'N', 3→'N', 4→'E', ... }
// scoreStats['EI'] = { ..., counts: {E:4, I:5}, dominant: 'I' }
// scoreStats['SN'] = { ..., counts: {S:8, N:9}, dominant: 'N' }
// scoreStats['TF'] = { ..., counts: {T:6, F:11}, dominant: 'F' }
// scoreStats['JP'] = { ..., counts: {J:10, P:7}, dominant: 'J' }
// derivedType = "INFJ"
```

---

#### T1-6 — Payload Schema 타입 정의 (Phase 7 전제 확립)

**목적**: §4.1 Self-contained Payload 구조의 타입을 Phase 1에서 선언한다. 인코딩/디코딩 구현은 Phase 7에서 수행. Phase 1에서 타입만 선언해두면 Phase 6, 7, 8에서 일관된 타입 참조 가능.

```
ResultPayload       {
  scoreStats: ScoreStats
  shared: boolean    // §4.1: 공유 여부를 payload 내부에 boolean으로 포함
}

// URL 구조 (§1.3 Locked Decisions, §4.1)
// /result/{variant}/{type}?{base64Payload}
// scoringSchemaId는 URL 어느 위치에도 포함하지 않음
// variant 하나로 schema를 유일하게 식별
```

---

### 단위 테스트 요구사항

Phase 1은 pure 함수만 포함하므로 100% 단위 테스트 커버리지 목표.

| 테스트 | 검증 내용 | 릴리스 블로커 |
|---|---|---|
| validateVariant — 등록된 variant | `ok: true` 반환 | #1 (간접) |
| validateVariant — 미등록 variant | `ok: false; reason: 'UNKNOWN'` | #1 |
| validateQuestionModel — poleA≠poleB | pass | #7 |
| validateQuestionModel — poleA=poleB | `QUESTION_MODEL_VIOLATION` | #7 |
| validateQuestionModel — poleA=poleB (동일값) | `QUESTION_MODEL_VIOLATION` | #7 |
| validateQuestionModel — index 중복 | `QUESTION_MODEL_VIOLATION` | #7 |
| odd-count rule — 홀수 배정 | pass | #12 |
| odd-count rule — 짝수 배정 | `EVEN_AXIS_QUESTION_COUNT` | #12 |
| duplicate axis spec — 중복 쌍 | `DUPLICATE_AXIS_SPEC` | #12 |
| computeScoreStats — axisCount=1 | ScoreStats entry 1개, dominant 올바름 | #11 |
| computeScoreStats — axisCount=2 | ScoreStats entry 2개, dominant 올바름 | #11 |
| computeScoreStats — axisCount=4 | ScoreStats entry 4개, dominant 올바름 | #11 |
| computeScoreStats — partial responses | `INCOMPLETE_RESPONSES` 반환 | #11 |
| computeScoreStats — 응답값이 poleA/poleB 외 값 | `UNMATCHED_QUESTION` 반환 | #11 |
| deriveDerivedType — axisCount=1 | 토큰 길이 1 | #11 |
| deriveDerivedType — axisCount=2 | 토큰 길이 2 | #11 |
| deriveDerivedType — axisCount=4 | 토큰 길이 4 | #11 |
| deriveDerivedType — axis 순서 보장 | schema.axes 선언 순서 = 토큰 위치 순서 | #11 |
| deriveDerivedType — axisId 누락 | `AXIS_NOT_FOUND` 반환 | #11 |
| ScoreStats — counts key는 pole 문자열 | Record<string, number> key = poleA 또는 poleB | #11 |
| validateVariantDataIntegrity — 빈 questions | `EMPTY_QUESTION_SET` | #12 |
| validateVariantDataIntegrity — axes 길이≠axisCount | `AXIS_COUNT_SCHEMA_MISMATCH` | #12 |
| validateVariantDataIntegrity — 정상 schema | pass | — |

---

### Phase 1 완료 정의 (DoD)

- [ ] T1-1~T1-6 타입 및 pure 함수 구현 완료
- [ ] 위 단위 테스트 전부 GREEN
- [ ] 릴리스 블로커 #7, #11, #12에 각각 최소 1개 자동 단언 매핑 기록
- [ ] MBTI 4축 하드코딩 없음 (axisCount 1/2/4 동일 경로 처리 확인)
- [ ] storage, UI, 라우팅 의존 없음 (import 트리 검사)

---

## Part 3 — Phase 2 예비 요약

> Phase 1 완료 전에 이 섹션을 확인한다. Phase 2는 Phase 1의 순수 함수 위에 "상태가 저장되는 레이어"를 쌓는 첫 번째 Phase다.

### 목적

Phase 2는 아래 세 관심사를 **하나의 레이어**에서 함께 확립한다. 이 셋을 분리해 구현하면 Phase 3 이후 경로 분기 로직이 불완전한 storage 계약에 의존하게 되어 테스트 불가능한 상태가 생긴다.

1. **Active run 판정** (§2.7): 30분 inactivity timeout, 재진입 시점 평가, 백그라운드 타이머 불필요
2. **5개 상태 플래그 분리** (§7.2): `derivation_in_progress`, `derivation_computed`, `min_loading_duration_elapsed`, `result_entry_committed`, `result_persisted`를 단일 플래그로 뭉개지 않음
3. **3가지 응답 데이터 휘발 트리거** (§5.8): result screen entry commit 완료 / inactivity timeout 판정 / 처음부터 다시 하기 commit success — 각각 `instructionSeen` 포함/제외 범위가 다름

### 핵심 설계 결정 (Phase 2 착수 전 확정 필요)

**storage 추상 레이어 선택**:
Phase 2는 storage key 네이밍, store 구조, key 목록을 별도 구현/설계 문서에서 정의하는 것이 요구사항의 원칙 (§5.8, §7.3 구현 세부사항 위임 구절). Phase 2 착수 시 이 설계 문서 또는 ADR을 먼저 작성 권장.

**variant-scoped 격리**:
모든 storage 조작은 해당 variant 범위에만 영향을 준다. 다른 variant 데이터를 건드리지 않는다 (§5.8 삭제 원칙). Phase 2에서 이 격리 경계를 명확히 구조화하지 않으면 Phase 9의 cleanup set 원자성 검증이 불가능해진다.

### 주요 산출물 (예비)

| 산출물 | 내용 |
|---|---|
| `getActiveRun(variantId)` | storage에서 해당 variant의 run 조회 → 30분 경과 여부 판정 → timeout 시 §5.8 휘발 즉시 실행 후 `null` 반환 |
| `StateFlags` 읽기/쓰기 인터페이스 | 5개 플래그를 개별 접근. 단일 플래그 혼용 금지를 구조적으로 강제 |
| `volatilizeRunData(variantId, trigger)` | 3가지 트리거별로 `instructionSeen` 포함/제외 범위를 switch-case로 명확히 분기. 원자적 삭제 보장 |
| timeout fixture 테스트 | 30분 경과 fixture → timeout 처리 + Cold Start 검증. 29분 59초 fixture → active run 유효 검증 |

### Phase 2가 Phase 1에 주는 설계 제약

Phase 1의 `VariantId` brand type이 storage key prefix로 사용된다. Phase 1에서 `VariantId`를 `string`으로 느슨하게 정의하면 Phase 2에서 격리 경계가 흐려진다. Phase 1 구현 시 `VariantId`를 brand type 또는 nominal type으로 강하게 정의해두면 Phase 2 storage 격리 구현이 타입 수준에서 강제된다.

### Phase 2 완료 후 Phase 3이 안전하게 전제할 수 있는 것

- `validateVariant` 실패 → session 생성 없이 에러 복구 페이지 이동 가능 (storage 레이어 준비됨)
- staged entry 복구 조건 검사 시 active run 유무를 storage에서 신뢰할 수 있음
- 경로 분기 판정(Direct Cold / Direct Resume / Landing Ingress)이 storage 상태를 일관되게 읽을 수 있음

---

*이 문서는 `docs/req-test.md`를 단일 SSOT로 한다. 충돌 시 요구사항 문서 우선.*
