# Test Flow 구현 계획

> **기준 문서**: `docs/req-test.md` (이하 요구사항)  
> **구성**: Phase 전체 요약 → Phase 1 세부 계획 → Phase 3 예비 요약  
> **원칙**: 이 문서만으로 구현 착수 가능 수준. 구현 방식 결정은 구현자 재량이며, 요구사항이 명시한 계약과 검증 기준을 충족하는 한 어떤 접근도 허용.

---

## Part 1 — 전체 Phase 요약 (11 Phases)

| Phase | 핵심 목표 | 주요 산출물 | 전제 Phase |
|---|---|---|---|
| **0** | 착수 전 ADR 확정 (Phase 1 착수 차단 조건) | ADR-A: `src/features/test` 분리 + `test-question-client.tsx` clean-room ADR 확정. ADR-B: Storage Key 네이밍 + 5개 상태 플래그 계약 + variant-scope 격리 전략 | — |
| **1** | Domain Foundation | 타입 정의, schema-driven 도출 모델, pure 함수 | **0** |
| **2** | Data Source & Sync Layer | variant-registry 인터페이스, cross-sheet 검증, lazy validation + 캐싱 | 1 |
| **3** | Storage · Session Lifecycle · Data Volatility | storage 추상 레이어, active run 판정, 5개 상태 플래그, 3가지 휘발 트리거 | 1, 2 |
| **4** | Entry Path · Staged Entry · Invalid Variant Recovery | 3-경로 분류기, staged entry lifecycle, 에러 복구 페이지 | 1, 2, 3 |
| **5** | Instruction Gate · Runtime Entry Commit | instruction overlay (비-라우트), `instructionSeen` lifecycle, commit 도메인 이벤트 | 1, 2, 3, 4 |
| **6** | Question Runtime Core | 응답 루프, tail reset, result-entry eligibility 즉시 반영 | 1, 2, 3, 4, 5 |
| **7** | Derivation · Loading Screen | scoreStats/derivedType 계산, 5초 최소 로딩 AND 조건, back-from-loading | 1, 2, 3, 6 |
| **8** | Result URL Payload · Validation | URL 구조, base64 인코딩, payload 검증 실패 경로 | 1 |
| **9** | Result Page · Content Fallback | 케이스 매트릭스(1/2/4), mandatory/optional 섹션, content fallback | 7, 8 |
| **10** | Error States · Terminal Exclusivity · Cleanup Set | commit-failure / derivation-failure taxonomy, §8.1 전이 테이블, §8.3 cleanup 원자성 | 5, 6, 7 |
| **11** | Telemetry Skeleton · Release Gate | §9.1 hook 6개, traceability closure (blocker 1~30 매핑) | 전체 |

---

## Part 1.5 — Phase 0: 착수 전 필수 선결 조건

> **Phase 0은 구현 Phase가 아니다.** Phase 1 착수 이전에 아래 두 ADR이 모두 완료 상태여야 한다.  
> 어느 하나라도 미완료 상태에서 Phase 1 파일을 생성하면 안 된다.

### ADR-A — `src/features/test` 네임스페이스 분리 + `test-question-client.tsx` clean-room 교체

**완료 조건**:
- [ ] `src/features/test` 디렉토리 분리 범위 결정 및 문서화
- [ ] `src/features/landing/test/` 내 test 런타임 파일의 이관 대상 목록 확정
- [ ] `test-question-client.tsx` clean-room 교체 범위 및 타이밍 ADR 확정
- [ ] Phase 1 T1-1~T1-7 파일이 생성될 디렉토리 경로 결정

**미완료 시 리스크**: Phase 1~5의 모든 타입/함수 파일이 `src/features/landing` 네임스페이스에 혼입됨. Phase 5 완료 후 전체 import 경로 재작업 불가피.

### ADR-B — Storage Key 네이밍 + 5개 상태 플래그 계약

**완료 조건**:
- [ ] `derivation_in_progress`, `derivation_computed`, `min_loading_duration_elapsed`, `result_entry_committed`, `result_persisted` 5개 플래그의 storage key 명명 규칙 확정
- [ ] `VariantId` brand type을 storage key prefix로 사용하는 variant-scope 격리 전략 확정
- [ ] cleanup set 원자성 보장을 위한 key 그룹핑 구조 결정
- [ ] ADR 문서 작성 완료

**미완료 시 리스크**: Phase 1의 `VariantId` 타입 결정이 Phase 3 storage key prefix 설계와 사후 불일치 발생. Phase 3에서 Phase 1 타입 역방향 수정 요구됨.

### Phase 0 완료 게이트

두 ADR 모두 완료된 경우에만 Phase 1 착수를 허용한다.

| ADR | 완료 여부 |
|---|---|
| ADR-A: 네임스페이스 분리 + clean-room ADR | ⬜ 미완료 |
| ADR-B: Storage Key + 5개 플래그 계약 | ⬜ 미완료 |

---

## Part 2 — Phase 1 세부 구현 계획

### 개요

**목적**: 이후 모든 런타임 로직의 타입 전제를 확립한다.  
**포함 요구사항 섹션**: §3.1, §3.2, §3.8, §3.11, §6.2  
**출력 형태**: 코드 산출물은 타입 정의와 pure 함수만. 부수효과(storage, 라우팅, UI 렌더링) 없음.  
**완료 조건**: 아래 태스크 전부 + 릴리스 블로커 #7, #11, #12 자동 단언 매핑 완료.

---

### 태스크 목록

#### T1-1 — Core Entity 타입 정의

**목적**: §3.1, §3.8에서 명시된 core entity를 코드 상 명확한 타입으로 고정한다.

**구현 범위**:

```typescript
// 변경 없는 타입
QuestionIndex   // 1-based 숫자 brand type
VariantId       // string brand type
AxisCount       // 1 | 2 | 4
SectionId       // string (supportedSections 항목 식별자)

// 신규/변경 타입
QuestionType = 'scoring' | 'profile'

ScoringMode = 'binary_majority' | 'scale'
// 현재 구현 대상: 'binary_majority'만.
// 'scale'은 타입 예약 상태. validateVariantDataIntegrity에서 'scale' 선언 시 blocking error 반환.

AxisSpec = {
  poleA: string
  poleB: string
  scoringMode: ScoringMode  // default: 'binary_majority'
}

Question = {
  index: QuestionIndex        // 1-based, 불변
  poleA: string
  poleB: string
  questionType: QuestionType  // 'scoring' | 'profile'
  // 축 소속(scoring): poleA+poleB 쌍이 schema.axes 중 동일 쌍과 일치하는 항목으로 결정
  // profile 문항은 axis 귀속 없음
  // 표시용 텍스트는 별도 i18n 레이어 — 이 타입에 포함하지 않음
}

// 응답 저장 타입 (변경 없음)
// Map<QuestionIndex, string>: 선택된 pole 문자열 직접 저장
// scoring question: axis pole값 (e.g., 'E' 또는 'I')
// profile question: qualifier pole값 (e.g., 'm' 또는 'f')

QualifierFieldSpec = {
  key: string              // qualifier 식별자 (e.g., 'sex')
  questionIndex: QuestionIndex  // 이 qualifier 값을 제공하는 profile 문항의 index
  values: string[]         // 허용 응답값 목록 (e.g., ['m', 'f'])
  tokenLength: number      // type segment에서 이 qualifier가 차지하는 문자 수 (일반적으로 1)
}

AxisScoreStat = {
  poleA: string
  poleB: string
  counts: Record<string, number>  // e.g., { 'E': 7, 'I': 3 }
  dominant: string                 // counts 기준 다수 pole
}

ScoreStats = Record<string, AxisScoreStat>
// key: axisId = poleA + poleB (scoring axis만. profile 문항 응답 포함하지 않음)
// key 순서는 schema.axes 선언 순서와 일치

DerivedType = string  // 길이 = axisCount, 각 위치 = schema.axes 순서 매핑

// type segment 구조
// typeSegment = derivedType(길이=axisCount) + qualifier토큰들(qualifierFields 순서대로)
// 전체 길이 = axisCount + sum(qualifierFields[i].tokenLength)
// qualifierFields 없음/빈 배열 → 길이 = axisCount (MBTI 등)

ScoringSchema = {
  variantId: VariantId
  scoringSchemaId: string         // URL에 노출하지 않음 (§5.1 불변식)
  axisCount: AxisCount
  axes: AxisSpec[]                // ordered, 길이 = axisCount, scoring axes만
  supportedSections: SectionId[]
  qualifierFields?: QualifierFieldSpec[]  // 없거나 빈 배열 = qualifier 없음
}

VariantSchema = {
  variant: VariantId
  schema: ScoringSchema
  questions: Question[]           // scoring + profile 문항 모두 포함. 실행 순서 소스
}

ResultPayload = {
  scoreStats: ScoreStats    // scoring axis만 포함
  shared: boolean
}
```

**검증 기준**:
- `ScoringSchema.axes` 배열 길이가 `axisCount`와 다르면 T1-4 차단.
- `DerivedType` 길이 = `axisCount` — 생성 함수에서 검증.
- 동일 poleA+poleB 쌍이 `schema.axes` 내에서 중복되면 안 된다 — T1-4에서 검증.
- `qualifierFields`의 `questionIndex`는 반드시 `questionType === 'profile'`인 문항을 가리켜야 한다 — T1-4에서 검증.
- `qualifierFields` 내 `key` 중복 없음 — T1-4에서 검증.

---

#### T1-2 — Variant Resolution 계약 (pure 함수)

**목적**: §3.2에서 명시된 "variant 입력 검증 → 성공/실패 분기" 경계를 pure 함수로 확립한다.

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
- Phase 4 에서 이 결과를 소비해 경로 분기를 수행한다 (`ok: false` → §6.1 에러 복구 페이지).

---

#### T1-3 — Question Model 검증 (pure 함수)

**목적**: §3.8에서 명시된 불변식을 검증하는 pure 함수를 확립한다.

**불변식 체크리스트 (question 단위)**:

*공통 (questionType 무관)*:
1. 각 question은 `poleA`, `poleB`, `questionType`, `index` 필드를 모두 가져야 한다.
2. `poleA`와 `poleB`는 서로 달라야 한다 (`poleA ≠ poleB`).
3. 각 question의 `index`는 1-based이며, 동일 variant 내 중복이 없어야 한다.

*scoring question 전용*:
4. `poleA`+`poleB` 쌍이 `schema.axes` 중 정확히 1개와 일치해야 한다. 0개 또는 2개 이상 일치 시 위반.

*profile question 전용*:
5. axis 귀속 요구 없음. `poleA`+`poleB` 쌍이 `schema.axes`와 일치하지 않아도 통과.

```typescript
validateQuestionModel(
  questions: Question[],
  schema: ScoringSchema
): ValidationResult<Question[]>
```

> scoring question의 axis 매핑 검증(불변식 4)은 schema 참조가 필요하므로 `schema`를 인자로 추가한다. profile question은 schema 참조 없이 검증 가능하나 동일 함수 시그니처로 통일한다.

---

#### T1-4 — Blocking Data Error 검증 (pure 함수)

**목적**: §6.2의 blocking data error 조건을 variant 로드 시점에 검증하는 pure 함수를 확립한다.

**차단 조건 (하나라도 해당 시 `BlockingDataError` 반환)**:

```typescript
type BlockingDataErrorReason =
  | 'EMPTY_QUESTION_SET'
  | 'QUESTION_MODEL_VIOLATION'
  | 'EVEN_AXIS_QUESTION_COUNT'       // odd-count rule 위반 (binary_majority scoring axis에만 적용)
  | 'AXIS_COUNT_SCHEMA_MISMATCH'     // axes 배열 길이 ≠ axisCount
  | 'DUPLICATE_AXIS_SPEC'            // schema.axes 내 동일 poleA+poleB 쌍 중복
  | 'UNSUPPORTED_SCORING_MODE'       // 'scale' 등 미구현 scoringMode 선언
  | 'QUALIFIER_QUESTION_NOT_FOUND'   // qualifierFields의 questionIndex에 해당하는 문항 없음
  | 'QUALIFIER_QUESTION_NOT_PROFILE' // qualifierFields의 questionIndex가 scoring 문항을 가리킴
  | 'DUPLICATE_QUALIFIER_KEY'        // qualifierFields 내 key 중복

validateVariantDataIntegrity(
  schema: VariantSchema
): { ok: true } | { ok: false; reason: BlockingDataErrorReason; detail?: string }
```

**Odd-count rule 구현 세부 (binary_majority scoring axis에만 적용)**:
```typescript
function checkOddCountRule(
  questions: Question[],
  axes: AxisSpec[]
): { ok: true } | { ok: false; axisId: string; count: number } {
  // binary_majority scoring 문항만 필터링
  const scoringQuestions = questions.filter(
    q => q.questionType === 'scoring'
  )
  for (const axis of axes) {
    if (axis.scoringMode !== 'binary_majority') continue  // scale 등은 별도 차단
    const axisId = axis.poleA + axis.poleB
    const axisQuestions = scoringQuestions.filter(
      q => q.poleA === axis.poleA && q.poleB === axis.poleB
    )
    if (axisQuestions.length % 2 === 0) {
      return { ok: false, axisId, count: axisQuestions.length }
    }
  }
  return { ok: true }
}
```

**Unsupported scoring mode 검증**:
```typescript
function checkScoringModes(axes: AxisSpec[]): { ok: true } | { ok: false; axisId: string } {
  for (const axis of axes) {
    if (axis.scoringMode !== 'binary_majority') {
      return { ok: false, axisId: axis.poleA + axis.poleB }
    }
  }
  return { ok: true }
}
```

**QualifierFields 검증**:
```typescript
function checkQualifierFields(
  qualifierFields: QualifierFieldSpec[] | undefined,
  questions: Question[]
): { ok: true } | { ok: false; reason: BlockingDataErrorReason; detail: string } {
  if (!qualifierFields || qualifierFields.length === 0) return { ok: true }
  const keys = new Set<string>()
  for (const field of qualifierFields) {
    if (keys.has(field.key)) return { ok: false, reason: 'DUPLICATE_QUALIFIER_KEY', detail: field.key }
    keys.add(field.key)
    const question = questions.find(q => q.index === field.questionIndex)
    if (!question) return { ok: false, reason: 'QUALIFIER_QUESTION_NOT_FOUND', detail: String(field.questionIndex) }
    if (question.questionType !== 'profile') return { ok: false, reason: 'QUALIFIER_QUESTION_NOT_PROFILE', detail: String(field.questionIndex) }
  }
  return { ok: true }
}
```

---

#### T1-5 — Derivation Model (pure 함수)

**목적**: §3.11의 schema-driven derivation 계약을 pure 함수로 구현한다. UI, 라우팅, storage 의존 없음.

**구현 범위**:

```typescript
// Step 1: scoring 문항 응답에서 axis별 점수를 집계 → ScoreStats 구성
computeScoreStats(
  questions: Question[],
  responses: Map<QuestionIndex, string>,
  schema: ScoringSchema
): ScoreStats | { error: 'INCOMPLETE_SCORING_RESPONSES' | 'UNMATCHED_QUESTION' }

// Step 2: ScoreStats에서 derivedType 토큰 생성
deriveDerivedType(
  scoreStats: ScoreStats,
  schema: ScoringSchema
): DerivedType | { error: 'AXIS_NOT_FOUND' | 'TOKEN_LENGTH_MISMATCH' }
```

**`computeScoreStats` 계약**:
- `questions[]`에서 `questionType === 'scoring'`인 문항만 필터링해 처리한다. profile 문항은 완전히 무시한다.
- 필터링 후 scoring 문항 수 = `scoringQuestions.length`이어야 한다. `responses`의 scoring 문항 응답 완료 여부는 `scoringQuestions`를 기준으로 검증한다.
- `scoringQuestions`의 각 index에 대한 응답이 `responses`에 없으면 `INCOMPLETE_SCORING_RESPONSES` 반환.
- `schema.axes`를 선언 순서대로 순회한다.
- 각 `AxisSpec { poleA, poleB }`에 대해 `axisId = poleA + poleB`를 파생한다.
- 해당 axis 소속 scoring 문항: 필터링된 scoring 문항 중 `q.poleA === axis.poleA && q.poleB === axis.poleB`인 항목.
- 응답이 `poleA`도 `poleB`도 아닌 값이면 `UNMATCHED_QUESTION` 반환.
- `counts` 집계 후 더 높은 카운트 pole을 `dominant`로 결정.
- 결과: `scoreStats[axisId] = { poleA, poleB, counts, dominant }`.
- MBTI 문자를 하드코딩하지 않는다. axisCount 1/2/4 모두 동일 함수로 처리.

**`deriveDerivedType` 계약 (변경 없음)**:
- `schema.axes` 선언 순서대로 각 axis의 `scoreStats[axisId].dominant`를 연결한다.
- `axisId`가 `scoreStats`에 없으면 `AXIS_NOT_FOUND` 반환.
- 생성된 토큰 길이가 `schema.axisCount`와 불일치하면 `TOKEN_LENGTH_MISMATCH` 반환.

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

**EGTT 예시 (axisCount=1)**:
```typescript
// scoring 문항만 필터링 후 처리 (Q1 profile 문항은 제외)
// schema.axes = [{ poleA: 'e', poleB: 't', scoringMode: 'binary_majority' }]
// scoringQuestions = questions.filter(q => q.questionType === 'scoring')
// scoreStats['et'] = { ..., counts: { e:15, t:10 }, dominant: 'e' }
// derivedType = 'e'
```

---

#### T1-6 — Type Segment 인코딩/파싱 (pure 함수)

**목적**: §5.1의 `type` segment 인코딩과 파싱 계약을 pure 함수로 확립한다. Phase 8 URL 인코딩/디코딩 구현의 전제.

**구현 범위**:

```typescript
// type segment 파싱 (result URL 수신 시 사용)
parseTypeSegment(
  typeSegment: string,
  schema: ScoringSchema
):
  | { ok: true; derivedType: string; qualifiers: Record<string, string> }
  | { ok: false; reason: 'LENGTH_MISMATCH' | 'INVALID_QUALIFIER_VALUE' }

// type segment 생성 (result URL 생성 시 사용)
buildTypeSegment(
  derivedType: string,
  responses: Map<QuestionIndex, string>,
  schema: ScoringSchema
):
  | { ok: true; typeSegment: string }
  | { ok: false; reason: 'QUALIFIER_RESPONSE_MISSING' | 'INVALID_QUALIFIER_VALUE' }
```

**`parseTypeSegment` 계약**:
```typescript
function parseTypeSegment(typeSegment, schema) {
  const qualifierFields = schema.qualifierFields ?? []
  const expectedLength = schema.axisCount + qualifierFields.reduce((sum, f) => sum + f.tokenLength, 0)
  if (typeSegment.length !== expectedLength) return { ok: false, reason: 'LENGTH_MISMATCH' }

  const derivedType = typeSegment.slice(0, schema.axisCount)
  const qualifiers: Record<string, string> = {}
  let cursor = schema.axisCount

  for (const field of qualifierFields) {
    const value = typeSegment.slice(cursor, cursor + field.tokenLength)
    if (!field.values.includes(value)) return { ok: false, reason: 'INVALID_QUALIFIER_VALUE' }
    qualifiers[field.key] = value
    cursor += field.tokenLength
  }

  return { ok: true, derivedType, qualifiers }
}
```

**`buildTypeSegment` 계약**:
```typescript
function buildTypeSegment(derivedType, responses, schema) {
  const qualifierFields = schema.qualifierFields ?? []
  let typeSegment = derivedType

  for (const field of qualifierFields) {
    const value = responses.get(field.questionIndex)
    if (value === undefined) return { ok: false, reason: 'QUALIFIER_RESPONSE_MISSING' }
    if (!field.values.includes(value)) return { ok: false, reason: 'INVALID_QUALIFIER_VALUE' }
    typeSegment += value
  }

  return { ok: true, typeSegment }
}
```

**MBTI 검증 (qualifierFields 없음)**:
- `parseTypeSegment('infj', mbtiSchema)` → `{ ok: true, derivedType: 'infj', qualifiers: {} }`
- expectedLength = 4 + 0 = 4. `'infj'.length === 4` → 통과.

**EGTT 검증 (qualifierFields 1개)**:
- `parseTypeSegment('em', egttSchema)` → `{ ok: true, derivedType: 'e', qualifiers: { sex: 'm' } }`
- expectedLength = 1 + 1 = 2. `'em'.length === 2` → 통과.
- `parseTypeSegment('ex', egttSchema)` → `{ ok: false, reason: 'INVALID_QUALIFIER_VALUE' }` ('x' ∉ ['m','f'])
- `parseTypeSegment('e', egttSchema)` → `{ ok: false, reason: 'LENGTH_MISMATCH' }` (길이 1 ≠ 2)

---

#### T1-7 — Payload Schema 타입 정의 (Phase 8 전제 확립)

**목적**: §5.1 Self-contained Payload 구조의 타입을 Phase 1에서 선언한다. 인코딩/디코딩 구현은 Phase 8에서 수행. Phase 1에서 타입만 선언해두면 Phase 7, 7, 8에서 일관된 타입 참조 가능.

```
ResultPayload       {
  scoreStats: ScoreStats
  shared: boolean    // §5.1: 공유 여부를 payload 내부에 boolean으로 포함
}

// URL 구조 (§1.3 Locked Decisions, §5.1)
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
| validateQuestionModel — scoring 문항 + schema axis 일치 | pass | #7 |
| validateQuestionModel — scoring 문항 + axis 불일치 | `QUESTION_MODEL_VIOLATION` | #7 |
| validateQuestionModel — profile 문항 + axis 불일치 | pass (axis 귀속 불필요) | #7 |
| validateQuestionModel — profile 문항 + poleA=poleB | `QUESTION_MODEL_VIOLATION` | #7 |
| validateVariantDataIntegrity — scale mode axis | `UNSUPPORTED_SCORING_MODE` | #12 |
| validateVariantDataIntegrity — qualifierFields.questionIndex가 없는 index | `QUALIFIER_QUESTION_NOT_FOUND` | #27 |
| validateVariantDataIntegrity — qualifierFields.questionIndex가 scoring 문항 | `QUALIFIER_QUESTION_NOT_PROFILE` | #27 |
| validateVariantDataIntegrity — qualifierFields 중복 key | `DUPLICATE_QUALIFIER_KEY` | #27 |
| validateVariantDataIntegrity — 정상 EGTT schema | pass | — |
| computeScoreStats — profile 문항 응답이 scoring 결과에 영향 없음 | ScoreStats에 profile axis 없음 | #11 |
| computeScoreStats — scoring 문항 미응답 (profile 응답은 있음) | `INCOMPLETE_SCORING_RESPONSES` | #11 |
| parseTypeSegment — MBTI (qualifierFields 없음) | derivedType='infj', qualifiers={} | #27 |
| parseTypeSegment — EGTT (qualifierFields 1개) | derivedType='e', qualifiers={sex:'m'} | #27 |
| parseTypeSegment — 길이 불일치 | `LENGTH_MISMATCH` | #27 |
| parseTypeSegment — qualifier 값 목록 외 값 | `INVALID_QUALIFIER_VALUE` | #27 |
| buildTypeSegment — MBTI | typeSegment='infj' | #27 |
| buildTypeSegment — EGTT | typeSegment='em' | #27 |
| buildTypeSegment — qualifier 응답 누락 | `QUALIFIER_RESPONSE_MISSING` | #27 |

---

### Phase 1 완료 정의 (DoD)

- [ ] T1-1~T1-7 타입 및 pure 함수 구현 완료
- [ ] 위 단위 테스트 전부 GREEN
- [ ] 릴리스 블로커 #7, #11, #12, #27에 각각 최소 1개 자동 단언 매핑 기록
- [ ] MBTI 4축 하드코딩 없음 (axisCount 1/2/4 동일 경로 처리 확인)
- [ ] `qualifierFields` 부재 시 MBTI 기존 동작 회귀 없음 (`parseTypeSegment` + `buildTypeSegment` MBTI 케이스 통과)
- [ ] `computeScoreStats`가 profile 문항을 scoring 결과에 포함하지 않음 확인
- [ ] `scale` scoringMode 선언 variant에서 blocking error 확인
- [ ] storage, UI, 라우팅 의존 없음 (import 트리 검사)

---

## Part 3 — Phase 2 예비 요약 (Data Source & Sync Layer)

> Phase 1 완료 전에 이 섹션을 확인한다. Phase 2는 Phase 1의 순수 함수 위에 "외부 데이터 소스 계약"을 추가하는 Phase다. 이 Phase가 완료되어야 Phase 3(Storage/Session)이 variant-registry 인터페이스를 신뢰할 수 있다.

### ⚠️ Phase 2 착수 전 미결 설계 결정 (ADR 신호)

아래 항목은 Phase 2 착수 전에 결정 및 ADR 기록이 완료되어야 한다.  
결정 없이 Phase 2 구현을 시작하면 안 된다.

| # | ADR 주제 | 선택지 | 결정 상태 |
|---|---|---|---|
| ADR-C | Google Sheets API 인증 방식 | Service Account vs OAuth (GitHub Action 시크릿 구성 포함) | ⬜ 미결 |
| ADR-D | `variant-registry.generated.json` 버전 관리 방식 | `.gitignore` 제외 / versioned file / 별도 아티팩트 저장소 | ⬜ 미결 |

결정 내용은 별도 ADR 또는 ops 설계 문서에 기록한다.

### ⚠️ Phase 2 착수 전 제거 필수: `question-bank.ts` generic fallback

Phase 1 T1-2 `validateVariant()` pure 함수 구현 완료 시점에 `question-bank.ts`의 **unknown variant → generic questions fallback** 동작을 제거해야 한다.

- **현재 동작**: unknown variant가 유입되면 generic 문항을 fallback으로 제공 → req-test.md AR-001 계약과 역방향 충돌
- **목표 동작**: unknown/invalid variant → `validateVariant()` ok:false → §6.1 에러 복구 페이지 이동. session/run context 미생성.
- **제거 타이밍**: Phase 1 DoD 확인 후, Phase 2 착수 직전 동일 변경셋 또는 별도 커밋
- **미이행 시 리스크**: Phase 4 진입 경로 분류기 구현 시 기존 fallback 동작과 AR-001 계약이 충돌. blocker #1 자동 단언 매핑 불가.

### 목적

Phase 2는 아래 세 관심사를 **하나의 레이어**에서 함께 확립한다.

1. **variant-registry 인터페이스 정의**: `variant-registry.generated.json`의 구조를 코드 상 타입으로 고정한다. production / local dev 환경 모두 동일 인터페이스를 참조한다.
2. **Cross-sheet 검증 함수**: 3개 Sheet(Questions / Results / Landing Card Metadata)의 데이터 일관성을 검증하는 pure 함수. GitHub Action과 runtime 2차 방어선에서 재사용 가능한 구조.
3. **Lazy validation + 캐싱**: `validateVariantDataIntegrity()`를 variant 첫 진입 시 실행하고 결과를 캐싱하는 인프라. Phase 1의 `validateVariant` 결과와 조합해 variant 진입 분기를 완성한다.

### 주요 산출물 (예비)

| 산출물 | 내용 |
|---|---|
| `VariantRegistry` 타입 | `variant-registry.generated.json`의 스키마. `VariantSchema[]`, `LandingCardMeta[]`(`unavailable` 플래그 포함) 포함 |
| `loadVariantRegistry()` | 환경별 registry 파일 로딩 인터페이스. production과 dev fixture가 동일 시그니처 |
| `validateCrossSheetIntegrity(registry)` | 3개 Sheet cross-sheet 검증 pure 함수. GitHub Action 스크립트와 runtime 2차 방어선 모두에서 사용 |
| `getLazyValidatedVariant(variantId)` | 캐싱 포함 lazy validation. 첫 호출 시 `validateVariantDataIntegrity()` 실행 → 이후 캐시 반환 |
| GitHub Action 스크립트 골격 | Sheets 읽기 → cross-sheet 검증 → 성공 시 registry 파일 생성 → 커밋 트리거. sync_script.js 인터페이스 확정 |

### 핵심 설계 결정 (Phase 2 착수 전 확정 필요)

- **Google Sheets API 인증 방식**: Service Account vs OAuth. GitHub Action 시크릿 구성 방법.
- **`variant-registry.generated.json` 버전 관리 방식**: `.gitignore` 제외 vs versioned file vs 별도 아티팩트 저장소.

> 위 두 항목은 운영 환경 설정에 의존하므로 Phase 2 착수 시 먼저 결정 필요. 결정 내용은 별도 ADR 또는 ops 문서에 기록한다.

### Phase 2가 Phase 1에 주는 설계 제약

Phase 1의 `VariantSchema` 타입이 `variant-registry.generated.json` 스키마의 기반 타입이 된다. Phase 1에서 `VariantSchema`를 불완전하게 정의하면 Phase 2 registry 타입과 불일치가 발생한다. Phase 1 DoD 항목 중 "storage, UI, 라우팅 의존 없음" 조건은 Phase 2에서 registry 로딩 레이어를 깔끔하게 추가할 수 있는 전제를 확보한다.

### Phase 2 완료 후 Phase 3이 안전하게 전제할 수 있는 것

- variant-registry 인터페이스가 확정되어 있음. Phase 3의 storage 레이어가 `loadVariantRegistry()`를 통해 variant 목록에 접근할 수 있음.
- `getLazyValidatedVariant(variantId)` 결과를 소비해 Phase 3의 진입 경로 분류기(Direct Cold / Direct Resume / Landing Ingress)가 "variant 유효성 검증"을 신뢰할 수 있음.
- dev/test 환경에서는 fixture 파일로 전체 Phase 3 구현 및 테스트가 가능함. Google Sheets 실연동 없이 Phase 3 착수 가능.

---

## Part 4 — Phase 3 예비 요약

> Phase 1 완료 전에 이 섹션을 확인한다. Phase 3은 Phase 1, 2의 기반 위에 "상태가 저장되는 레이어"를 쌓는 Phase다.

### 목적

Phase 3는 아래 세 관심사를 **하나의 레이어**에서 함께 확립한다. 이 셋을 분리해 구현하면 Phase 4 이후 경로 분기 로직이 불완전한 storage 계약에 의존하게 되어 테스트 불가능한 상태가 생긴다. Phase 3 착수 전 Phase 2의 registry 인터페이스 확정을 전제한다.

1. **Active run 판정** (§3.7): 30분 inactivity timeout, 재진입 시점 평가, 백그라운드 타이머 불필요
2. **5개 상태 플래그 분리** (§8.2): `derivation_in_progress`, `derivation_computed`, `min_loading_duration_elapsed`, `result_entry_committed`, `result_persisted`를 단일 플래그로 뭉개지 않음
3. **3가지 응답 데이터 휘발 트리거** (§6.8): result screen entry commit 완료 / inactivity timeout 판정 / 처음부터 다시 하기 commit success — 각각 `instructionSeen` 포함/제외 범위가 다름

### 핵심 설계 결정 (Phase 3 착수 전 확정 필요)

**storage 추상 레이어 선택**:
Phase 3는 storage key 네이밍, store 구조, key 목록을 별도 구현/설계 문서에서 정의하는 것이 요구사항의 원칙 (§6.8, §8.3 구현 세부사항 위임 구절).  
**storage key ADR(ADR-B)은 Phase 0 선결 조건으로 Phase 1 착수 전에 이미 완료되어 있어야 한다.** Phase 3 착수 시 ADR-B를 참조해 storage 추상 레이어를 설계한다. ADR-B 미완료 상태에서 Phase 3를 착수하는 경우는 Phase 0 gate 위반이다.

**variant-scoped 격리**:
모든 storage 조작은 해당 variant 범위에만 영향을 준다. 다른 variant 데이터를 건드리지 않는다 (§6.8 삭제 원칙). Phase 3에서 이 격리 경계를 명확히 구조화하지 않으면 Phase 10의 cleanup set 원자성 검증이 불가능해진다.

### 주요 산출물 (예비)

| 산출물 | 내용 |
|---|---|
| `getActiveRun(variantId)` | storage에서 해당 variant의 run 조회 → 30분 경과 여부 판정 → timeout 시 §6.8 휘발 즉시 실행 후 `null` 반환 |
| `StateFlags` 읽기/쓰기 인터페이스 | 5개 플래그를 개별 접근. 단일 플래그 혼용 금지를 구조적으로 강제 |
| `volatilizeRunData(variantId, trigger)` | 3가지 트리거별로 `instructionSeen` 포함/제외 범위를 switch-case로 명확히 분기. 원자적 삭제 보장 |
| timeout fixture 테스트 | 30분 경과 fixture → timeout 처리 + Cold Start 검증. 29분 59초 fixture → active run 유효 검증 |

### Phase 3이 Phase 1, 2에 주는 설계 제약

Phase 1의 `VariantId` brand type이 storage key prefix로 사용된다. Phase 1에서 `VariantId`를 `string`으로 느슨하게 정의하면 Phase 3에서 격리 경계가 흐려진다. Phase 1 구현 시 `VariantId`를 brand type 또는 nominal type으로 강하게 정의해두면 Phase 3 storage 격리 구현이 타입 수준에서 강제된다.

### Phase 3 완료 후 Phase 4이 안전하게 전제할 수 있는 것

- `validateVariant` 실패 → session 생성 없이 에러 복구 페이지 이동 가능 (storage 레이어 준비됨)
- staged entry 복구 조건 검사 시 active run 유무를 storage에서 신뢰할 수 있음
- 경로 분기 판정(Direct Cold / Direct Resume / Landing Ingress)이 storage 상태를 일관되게 읽을 수 있음

---

*이 문서는 `docs/req-test.md`를 단일 SSOT로 한다. 충돌 시 요구사항 문서 우선.*
