# Landing Requirements v2 (Normalized)

## 0. Document Meta
- 문서 목적:
  - 랜딩페이지 구현 요구를 단일 해석 가능한 형태로 정규화한다.
  - 반복/충돌/중복 기술을 제거하고, 구현 및 QA 기준을 분리한다.
- 본 문서는 `docs/req-landing.md`의 유효 요구를 보존해 재구성한 v2 문서다.
- 우선순위:
  1) 본 문서의 본문(Section 1~12)
  2) `docs/requirements.md`의 전역 제약
  3) 본 문서 부록(Appendix)
- 용어:
  - `MUST`: 필수
  - `SHOULD`: 권장
  - `MAY`: 선택

## 1. Scope & Non-Goals
### 1.1 In Scope (V1)
- 랜딩 카탈로그(테스트/블로그 혼합) UI 및 반응형 레이아웃
- 카드 Normal/Expanded 상태 전환 및 CTA 게이팅
- unavailable 카드 고정 계약(진입 불가, 오버레이 고지)
- 랜딩→목적지(테스트/블로그) 전환 잠금 정책
- 테스트 진입 핸드셰이크(Q1 pre-answer, instruction 오버레이 분기)
- 최소 텔레메트리(랜딩/전환/테스트 시도·제출)
- SSR/Hydration 일관성 및 빌드 안정성 제약

### 1.2 Out of Scope (V1)
- 배경 요소 동적 연출(실시간 업데이트): 비활성(강도 0/정지)
- REQ-F-016 전체 이벤트 택소노미의 전면 구현(전역 requirements의 REQ-F-016 MUST는 V1에서 유예하고, 본문 11.2 최소 이벤트셋을 우선 적용)
- Google Sheets 실연동(현재는 Fixture + Adapter)
- 테스트/블로그 본문의 고도화 기능

### 1.3 Locked Decisions
- 시각 패키지: 버전 B
- 배경 요소: 정적(강도 0/정지)
- 카드 tilt: 전면 비활성
- Expanded scale: `1.1` (110%)
- Expanded 카드 본체 opacity: `1.0` 고정

## 2. Technical Baseline & Build Contract
### 2.1 Fixed Stack
- Next.js `16.1.6`
- React `19.2.4`
- Tailwind CSS `4.1.0`
- Motion `12.34.0`
- next-intl `4.8.3`

### 2.2 App Router Layout Hierarchy (MUST)
- App Router는 layout 2계층을 유지한다.
- `src/app/layout.tsx`:
  - HTML/Body/전역 스타일 담당
- `src/app/[locale]/layout.tsx`:
  - locale 검증
  - i18n 메시지 주입
  - page shell / provider 주입
- 두 layout은 중복이 아니라 역할 분리이며 병합하지 않는다.

### 2.3 Typed Routing (MUST)
- `typedRoutes: true` 기준으로 구현한다.
- `router.push/replace` 및 `Link href`에 임의 문자열 직접 연결을 금지한다.
- 동적 경로(`/test/[variant]/question` 등)는 RouteBuilder(또는 typed route helper)에서만 생성한다.
- locale 중복(`/en/en/...`) 등 비정상 URL 생성은 빌드/코드리뷰 단계에서 차단한다.

### 2.4 i18n Routing Entry (MUST)
- Next.js 16 기준으로 `middleware.ts` 대신 `proxy.ts`를 사용한다.
- locale 매칭/리다이렉트 정책은 `proxy.ts` 단일 엔트리에서 관리한다.

### 2.5 SSG Safety (MUST)
- SSG 경로에서 `useSearchParams`를 사용할 경우:
  - Suspense 경계 또는 동적 렌더링 전략을 명시한다.
- 위 조건이 없으면 해당 훅 사용을 금지한다.

## 3. IA & Route Contract
### 3.1 Route Surface
- 랜딩: `/{locale}`
- 테스트 질문: `/{locale}/test/[variant]/question`
- 블로그: `/{locale}/blog`
- 블로그 카탈로그 CTA 진입 시 `?source=<cardId>` query를 부가한다.
- 이력: `/{locale}/history`

### 3.2 Locale URL Integrity (MUST)
- locale 반영 책임은 라우팅 계층 단일 책임으로 유지한다.
- 비정상 locale URL 감지 시 전환 실패로 처리한다.
- 전환 실패 시 pre-answer(Q1) 데이터는 롤백한다.

### 3.3 Navigation Swap Timing (MUST)
- 랜딩→목적지 전환 중에는 source GNB를 유지한다.
- 목적지 진입 완료 시점에 destination GNB로 1회 교체한다.

## 4. Layout Contract
### 4.1 Container
- max-width: `1280px`
- center align (auto margin)
- side padding:
  - Desktop/Tablet: `24px` 기본, 좁은 폭에서 `20px` 허용
  - Mobile: `16px` 고정
- vertical rhythm:
  - GNB 아래 시작 간격: `16~24px` clamp
  - 섹션 간격: `24~40px`

### 4.2 Breakpoints
- Mobile: `0~767`
- Tablet: `768~1023`
- Desktop: `>=1024`
- 구현은 `min-width` 기반 단순화

### 4.3 Hero Area
- 입력 없는 정보 영역
- outline/border/stroke 없는 flat 표현

### 4.4 Grid Composition
#### Desktop (2-stage)
- hero row + main grid 분리
- threshold:
  - `availableWidth >= 1160`: hero 3, main 4
  - else: hero 2, main 3
- `minCardWidth`: `260~300px` 허용 범위, V1 기본값은 `280px`

#### Tablet (2-stage)
- hero fixed 2
- main:
  - `availableWidth >= 900`: 3
  - else: 2

#### Mobile
- 1 column
- side padding 16px
- vertical gap `14~16px`

### 4.5 Card Height Policy
- Normal 카드 높이는 콘텐츠 기반 compact(auto) 우선
- 동일 row 내 equal-height stretch 적용(최대 높이로 맞춤)
- row 간 높이는 독립 계산
- 불필요한 하단 빈 공간 금지

## 5. GNB Contract
### 5.1 Common
- sticky top `0`
- height:
  - Desktop/Tablet `64px`
  - Mobile `56px`
- background: 불투명 또는 반투명+blur
- scrollY > 4px 시 얕은 shadow(없으면 1px divider)
- z-index >= 1000

### 5.2 Desktop / Landing
- 좌측: CI(home)
- 메뉴: 테스트 이력, 블로그 링크
- 우측: 설정 트리거(햄버거 금지)

### 5.3 Desktop Settings Layer
- 트리거 UI: `EN/KR` 텍스트 + 현재 테마 아이콘(단일 덩어리)
- 레이어 내부 컨트롤은 2개만 허용:
  - 언어 토글 (`EN ↔ KR`)
  - 테마 토글 (`Light ↔ Dark`)
- 열기: hover/focus/click
- 닫기: Esc / outside click / focus out
- 트리거와 레이어 사이 hover gap 금지
- hovered-out 방지용 닫힘 유예 `100~180ms` 권장

### 5.4 Mobile / Landing
- CI + 햄버거
- 햄버거는 fixed overlay + backdrop
- body scroll lock 적용
- backdrop 탭으로 닫힘
- 최하단 설정 컨트롤 2개:
  - 언어: 아이콘 + 현재값 텍스트
  - 테마: 아이콘 + 현재값 텍스트

### 5.5 Test / Blog Context
- Desktop Test: CI + Timer + 최소 메뉴
- Mobile Test: Back + Timer
- Mobile Blog: Back + 햄버거(최하단 설정 구성 동일)

### 5.6 Language / Theme State
- 언어 변경 위치:
  - Desktop: 설정 레이어 내부만
  - Mobile: 햄버거 최하단 컨트롤만
- 테마:
  - 최초: system-follow (`prefers-color-scheme`)
  - 수동 변경 이후: `light|dark`를 localStorage에 고정 저장

### 5.7 A11y
- 햄버거/설정 버튼 `aria-label` 필수
- 키보드 focus ring 명확히 표시

## 6. Card Content Contract
### 6.1 Faces
- Normal:
  - 탐색 기본면
  - CTA 금지
- Expanded:
  - 명시 조작(hover/tap/keyboard)으로 노출
  - CTA는 Expanded에서만 허용

### 6.2 Normal Slots (Test/Blog 공통)
- `cardTitle` (required)
- `cardSubtitle` (required)
- `thumbnailOrIcon` (required)
- `tags[]` (0~3 노출)

### 6.3 Normal Thumbnail Spec
- width: 카드 콘텐츠 영역 100%
- ratio: `6:1` 고정
- object-fit: `cover` (왜곡 금지)

### 6.4 Expanded Header
- `cardTitle`만 유지
- Normal의 subtitle/thumbnail/tags는 제거
- front/back title 불일치 금지

### 6.5 Expanded Slots by Type
#### Test (available)
- `previewQuestion` (Q1 동일 소스)
- `answerChoiceA/B` (Q1 동일 소스)
- `meta` 3개 고정:
  - 예상 소요 시간
  - 공유 횟수
  - 누적 테스트 횟수
- 별도 Start CTA 금지

#### Blog (available)
- `summary` (최대 4줄)
- `meta` 3개 고정:
  - 읽기 시간
  - 공유 횟수
  - 조회수
- `primaryCTA` 1개 고정: Read more(i18n)

### 6.6 Text Clamp Policy
#### Normal
- title: 1줄 + truncate
- subtitle: 1줄 + truncate
- tags: 각 1줄 + truncate
- 상태 배지 텍스트 슬롯 미사용

#### Expanded
- Test:
  - previewQuestion: 줄바꿈 허용, truncate 금지
  - answerChoiceA/B: 줄바꿈 허용, truncate 금지
  - meta: overflow 시 truncate
- Blog:
  - summary: 4줄 clamp
  - meta: overflow 시 truncate
  - primaryCTA: 1줄 + truncate

### 6.7 Missing Slot Handling
- required 슬롯 누락 시 영역 제거 금지
- required 값 누락 시 빈값 렌더(레이아웃 유지)
- optional(`tags[]`) 비어있으면 숨김

### 6.8 Unavailable Contract
#### Blog
- unavailable 블로그 카드 금지

#### Test
- CTA 없음
- Expanded 진입 없음(포인터/터치/키보드 공통)
- 표시: Normal 정보 + coming soon 오버레이만 허용

#### Desktop
- 해당 unavailable 카드 hover/focus일 때만 오버레이 노출
- hover enter 후 `120~200ms` 유지 시 표시
- hover/focus out 즉시 해제(0ms)
- 글로벌 동시 오버레이 금지

#### Mobile
- 기본 상태에서 오버레이 상시 표시
- 탭 입력 추가 피드백/전환 없음

#### Overlay visual
- black overlay + white “Coming Soon”
- 메시지 가독성 우선
- 카드 정보 완전 차단 금지
- focus ring 식별성 보장

## 7. State Machine & Interaction
### 7.1 States
#### PageState
- `ACTIVE`
- `INACTIVE`
- `REDUCED_MOTION`
- `SENSOR_DENIED`
- `TRANSITIONING`

#### CardState
- `NORMAL`
- `EXPANDED`
- `FOCUSED`

#### Global override
- `HOVER_LOCK (Desktop)`

### 7.2 State Priority
- `INACTIVE > REDUCED_MOTION > TRANSITIONING > EXPANDED > HOVER_LOCK > NORMAL`

### 7.3 Page Reactions
- INACTIVE:
  - 입력 기반 카드 반응 중지
  - HOVER_LOCK 비활성
- ACTIVE 복귀:
  - 짧은 램프업 후 정상화
- TRANSITIONING:
  - 스크롤/입력 잠금
  - 시작 프레임 시각 상태 고정
  - GNB는 완료 시 교체

### 7.4 Determinism / Idempotency
- 동일 전환 상관키의 중복 실행은 동일 결과 유지
- 재렌더/재마운트가 발생해도 Q1/Q2 시작 문항 역전 금지

### 7.5 HOVER_LOCK
- 트리거:
  - available 카드 Expanded
  - unavailable 카드 오버레이 활성
- 반응:
  - 비대상 카드 NORMAL 강제
  - 비대상 카드 입력 기반 반응 0
  - 비대상 Expanded 진입 차단
- 해제:
  - 대상 종료 시 즉시(0ms)
  - 카드 간 handoff 즉시 허용

## 8. Expanded Motion & Visual Contract
### 8.1 Core Motion
- Normal→Expanded:
  - Elevate + scale `1.1`
  - 비타이틀 정보 fade-out + collapse (`160~240ms` 권장)
  - title 상단 이동 (`180~280ms` 권장)
  - 상세 정보 stagger (`40~80ms` 간격, 항목당 `120~220ms`)
- 내부 이중 박스 시각 금지

### 8.2 Desktop Expanded
- available hover enter `120~200ms` 후 Expanded
- scale `1.1`
- transform-origin:
  - 좌측 끝 `0% 0%`
  - 우측 끝 `100% 0%`
  - 그 외 `50% 0%`
- Expanded 유지 동안 `1.1` 고정
- 비대상 카드 scale은 항상 1

### 8.3 Expanded Opacity
- Expanded 카드 본체 opacity는 항상 `1.0`
- Expanded 전환/유지 중 alpha(투명도) 애니메이션 금지

### 8.4 Transition Start Trigger
- 반드시 Expanded CTA 활성화 시점에서 시작
  - Test: answerChoiceA/B
  - Blog: Read more

## 9. Mobile Expanded & Full-Bleed Contract
### 9.1 Entry / Exit
- available 카드 탭 시 해당 카드만 Expanded
- 닫기:
  - 우측 상단 X 버튼
  - 카드 외부(backdrop) 탭
- 닫힘 시 해당 카드만 Normal 복귀
- 닫힘 후 Expanded 직전 scroll/위치/형태로 자연 복귀

### 9.2 Full-Bleed
- in-flow full-bleed
- 카드 폭: `100vw`
- 컨테이너 패딩 상쇄
- 전환 애니메이션 `220~360ms`
- full-bleed 동안 page scroll lock
- 다른 카드 상호작용 비활성

### 9.3 Layer Order (MUST)
- `GNB > Expanded 카드 > backdrop > 기타 카드`
- backdrop은 Expanded 카드를 덮지 않음
- Expanded 카드는 항상 하이라이트/불투명/상호작용 가능
- dim 처리는 Expanded 외부 영역에만 적용
- X 버튼은 backdrop보다 상위 레이어에 위치하고 항상 클릭 가능

### 9.4 Unavailable on Mobile
- unavailable 카드는 Expanded 진입/닫기 토글 대상이 아님

## 10. Landing → Destination Handshake (Test/Blog)
### 10.1 Transition Lock
- 전환 시작 즉시 TRANSITIONING 진입
- 시작 시 카드 시각 상태 고정
- 전환 중 상태 되돌림 금지
- 다른 카드 상호작용 금지

### 10.2 Return Restoration
- 필수 복원: `scrollY`
- 비필수 복원: 마지막 Expanded 상태, prior focus

### 10.3 Test Q1 Pre-Answer Contract
- Test card Expanded에서 choice A/B 선택 시:
  - 선택값은 Q1 pre-answer로 저장
  - `/test/[variant]/question` 진입
- instruction 오버레이 확인 후:
  - 랜딩 유입(pre-answer 있음): Q2부터 시작
  - 딥링크 유입(pre-answer 없음): Q1부터 시작
- 동일 variant 재진입에서 instruction이 생략되는 경우:
  - 랜딩 유입(pre-answer 있음): choice A/B 선택 즉시 테스트 시작, 질문 진입은 Q2부터
  - 딥링크 유입(pre-answer 없음): URL 진입 후 Q1부터 시작
- 사용자는 테스트 중 Q1 재수정 가능
- 결과는 최종 제출 Q1 기준

### 10.4 Instruction Contract
- 표시 형태:
  - Desktop: centered card overlay
  - Mobile: full-screen overlay
- 오버레이 활성 중 하위 입력 차단
- variant 단위 instructionSeen 유지
- 동일 variant의 최초 진입(랜딩/딥링크 공통)에서는 instruction 표시가 필수
- 동일 variant 재진입 시 instruction은 재표시하지 않음

### 10.5 Pre-Answer Lifecycle
- read와 consume 분리
- read 시 즉시 파기 금지
- consume은 테스트 진입 확정 후 수행
- 랜딩 전환 상관키 없는 유입에 pre-answer 적용 금지

### 10.6 Failure / Cancel Rollback
- 전환 실패/취소 시 pre-answer 롤백
- 테스트 시도는 성립하지 않은 것으로 간주

### 10.7 Question Dwell Time
- 포그라운드 여부와 무관하게 경과시간 포함
- 문항 재방문 시 누적 합산

## 11. Telemetry, Privacy, Data Source
### 11.1 Logging Scope (V1)
- 목적: 랜딩→진입 안정성 + 테스트 시도/제출 최소 지표
- 본 V1은 REQ-F-016 전체 이벤트 택소노미가 아니라 11.2의 최소 Event Set만 구현 대상으로 한다.
- 기본 미수집:
  - 스크롤/hover/expanded 토글/tap 토글/tilt/조명 상호작용
  - unavailable hover/tap 시도

### 11.2 Event Set
- Landing: view 1회
- Transition: start 1회, complete/fail/cancel 1회(상호배타)
- Test: attempt_start 1회, final_submit 1회

### 11.3 Transition Correlation
- TRANSITIONING 중 중복 start 금지
- 전환 종료는 complete/fail/cancel 중 하나(상호배타)
- eventId/transitionId 매칭 필수
- 상관키 생성 실패 시 대체키(세션 카운터) 허용

### 11.4 Consent State Machine
- 상태: `UNKNOWN -> OPTED_IN | OPTED_OUT`
- SSR/첫 렌더는 UNKNOWN 고정
- mount 후 저장소 동기화 1회
- UNKNOWN 중 이벤트는 유예
- OPTED_IN 확정 시 유예 전송
- OPTED_OUT 확정 시 유예 폐기
- 옵트아웃 즉시 익명 식별자/연결키 무효화 및 전송 차단

### 11.5 Anonymous ID Policy
- 동일 브라우저/동일 기기 범위의 일관성만 요구
- 금지: IP/지문성 식별자
- 생성 우선순위:
  1) crypto.randomUUID
  2) crypto.getRandomValues
  3) 시간+난수+카운터 폴백
- 생성 실패해도 사용자 흐름 차단 금지

### 11.6 Payload Boundaries
- 금지: 원문 텍스트/자유입력/개인정보
- 응답은 의미 코드만 기록
- question index 1-based 고정
- final submit 시 최종 응답 + 문항별 누적 체류시간 기록
- Q1은 최종 제출값 기준

### 11.7 Data Source
- V1: 로컬 fixture 사용
- Fixture + Adapter 구조 필수(추후 Sheets 교체 대비)
- Sheets 주기/운영 정책은 본문 강제 범위 아님

## 12. SSR/Hydration, Performance, QA Gates
### 12.1 SSR/Hydration Contract (MUST)
- 초기 렌더 경로에서 다음 분기 금지:
  - localStorage/sessionStorage/window
  - Date.now/Math.random/비결정 시간값
- 위 금지는 useState initializer, provider default, context init에도 동일 적용
- 중립 초기 상태 사용(예: consent UNKNOWN)
- hydration warning 1건이라도 발생 시 릴리스 차단

### 12.2 Reduced Motion / Performance
- prefers-reduced-motion:
  - 대형 공간 이동 금지
  - crossfade/짧은 이동(`150~220ms`) 중심
- 저사양 fallback:
  - 전환 연출 단순화
  - visible 우선 업데이트(배경 동적 비활성 전제)

### 12.3 Cursor Policy
- 커스텀 커서 금지
- OS 기본 커서 사용
- available 카드/CTA만 pointer
- unavailable 카드 기본 커서

### 12.4 Release QA Checklist
#### SSR / Build
- hydration mismatch warning 0건
- typedRoutes 활성 상태에서 `npm run build` 통과
- 동적 경로 RouteBuilder 경유 확인
- i18n 엔트리 `proxy.ts` 유지 확인

#### Settings UI
- Desktop 설정 레이어:
  - hover/focus/click open
  - Esc/outside/focus out close
  - 트리거↔레이어 이동 시 의도치 않은 닫힘 없음
  - 언어/테마 실제 변경 가능
- Mobile 햄버거:
  - fixed overlay + backdrop
  - body scroll lock
  - backdrop 탭 닫힘

#### Card / Expanded
- Normal 탭 → Expanded 진입
- X/backdrop 탭 → Normal 복귀
- unavailable 카드 Expanded 전이 금지
- 썸네일 비율 `6:1`
- Normal compact + row equal-height
- Expanded 본체 opacity `1.0` 유지
- Expanded 카드 하이라이트 유지(backdrop이 카드 자체를 dim 처리하지 않음)

#### Transition / Test Handshake
- 랜딩 CTA 진입 시 locale 중복 URL 없음
- 랜딩 유입은 instruction 후 Q2 시작
- 딥링크 유입은 instruction 후 Q1 시작
- 재렌더/재마운트에도 Q2→Q1 역전 없음
- 실패 시 pre-answer 롤백 확인

---

## Appendix A. Deferred Background Dynamics (Non-Normative)
- 본 부록 항목은 V1에서 비활성(강도 0/정지)이다.
- 추후 활성화 시 다음 후보 규칙을 참고한다:
  - light model: `lightPos`, `lightColor`, `intensity`, `falloff`
  - desktop inactive drift(진폭/주기/easing)
  - pointer enter ramp-up
- 단, 본문의 가독성/A11y/전환 안정성 규칙을 우선 적용한다.

## Appendix B. Alternative Visual Packages (A/C)
- 본문은 버전 B 기준이다.
- A/C는 향후 선택 가능한 대안이며, 활성화 시 별도 변경관리로 본문에 병합한다.

### B.1 Version A (Conservative)
- BP: M<=767 / T 768~1023 / D>=1024
- Desktop hero2/main3, Tablet hero2/main2, Mobile 1열
- 배경 조명 약함, full-bleed 미적용
- Expanded 진입은 Desktop hover(150ms) / Mobile tap

### B.2 Version C (High-Drama)
- Desktop featured hero 중심
- 주변 dim/backdrop 연출 강화
- 오버레이형 full-bleed + 내부 스크롤 허용
- 상호작용 차단 강도 강화

## Appendix C. Parameter Table (Single Source)
| Key | Value |
|---|---|
| Container max width | 1280px |
| Container side padding (D/T) | 24px (min 20px) |
| Container side padding (M) | 16px |
| Breakpoints | M:0~767 / T:768~1023 / D:>=1024 |
| Grid gap | clamp(16px, 1.5vw, 20px) |
| Card padding | 16px (14~18 조정 가능) |
| Card radius | 16px (Mobile full-bleed 0~12 허용) |
| Desktop threshold | 1160px |
| Tablet threshold | 900px |
| Desktop min card width | 260~300 (V1 default 280) |
| Desktop hover delay | 120~200ms |
| Settings hover-close grace | 100~180ms 권장 |
| Expanded scale | 1.1 |
| Expanded opacity | 1.0 fixed |
| Mobile full-bleed transition | 220~360ms |
| Reduced motion transition | 150~220ms |
