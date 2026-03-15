# Landing V1 최종 구현 계획 (코딩 전, SSOT 동기화판)

## 0) 문서 목적
- 본 문서는 `docs/req-landing-final.md`를 1차 기준으로 랜딩페이지 V1 재구현 계획을 확정한다.
- `docs/reimpl-checklist-ssot.md`는 구현 추적/누락 방지 체크리스트로 함께 사용한다.
- `docs/requirements.md`는 전역 제약/일관성/향후 확장 참고로만 사용한다.
- 본 문서는 코드 변경 지침서가 아니라, 실행 순서/검증 기준/릴리스 게이트를 고정하는 계획 문서다.
- 구현 중 정책 변경이 발생하면 SSOT 갱신 후 본 문서와 체크리스트를 같은 변경셋으로 즉시 동기화한다.

## 1) 기준 문서 및 우선순위
1. `docs/req-landing-final.md` 본문(Section 1~15)
2. `docs/reimpl-checklist-ssot.md` (SSOT 추적)
3. `docs/requirements.md` 전역 제약 참고

### 1.1 문서 충돌 처리 규칙
- 충돌 시 우선순위는 `req-landing-final.md` §3.1을 그대로 따른다.
  - Global Invariants > Routing/Layout > Section 6~13 > Exception Registry
- 단일 정책 변경은 `req-landing-final.md` §3.2 Single-change Synchronization을 따른다.
- 단일 해석이 불가능하면 `req-landing-final.md` §3.3 규칙대로 릴리스를 중단하고 옵션/선택 근거를 먼저 확정한다.

## 2) 사전 확정 의사결정(최신 반영)
- App Router/구조 고정:
  - 실제 페이지는 `src/app/[locale]/**` 하위만 허용한다.
  - root layout은 `src/app/layout.tsx`, locale layout은 `src/app/[locale]/layout.tsx`로 분리한다.
  - i18n 단일 진입점은 `src/proxy.ts`로 고정한다.
- 404 전략 고정:
  - segment not-found(`src/app/not-found.tsx`) + global unmatched(`src/app/global-not-found.tsx`) 이원 운용.
- Hero/Main 해석 고정:
  - hero/main은 시각 네이밍이며, Desktop/Tablet은 단일 연속 grid에서 row index 규칙으로 처리한다.
  - Hero row 카드와 Main grid 카드는 동일한 상호작용/CTA 게이팅 규칙을 사용한다.
- Grid/폭 기준:
  - `availableWidth`는 컨테이너 내부폭(뷰포트 - 좌우 패딩)을 기준으로 한다.
  - underfilled 마지막 row는 시작측 정렬 유지, 카드 폭 확장 금지.
- HOVER_LOCK 적용 범위:
  - hover-capable mode에서만 활성.
  - 키보드 모드/포인터 모드 분기 규칙을 고정 적용.
- Handoff 정의/모션 고정:
  - handoff는 `다른 available 카드 진입`에서만 성립.
  - source 카드는 `0ms` 즉시 Normal, target 카드는 표준 Expanded 모션 유지.
  - 위 분리 규칙은 pointer/keyboard 모두 동일 적용.
- Normal 텍스트/기하 불변식:
  - subtitle은 최대 2줄 truncate + ellipsis(`...`) 시각 노출 강제.
  - subtitle overflow가 카드/row/형제 슬롯(썸네일/태그) inline-size를 오염시키면 안 된다.
- Normal spacing 정책:
  - `thumbnail -> tags`는 `base_gap + comp_gap` 이원 정책.
  - non-comp 카드는 `comp_gap=0` + 추가 잉여 여백 `0`.
  - same-row 비대상 카드 안정성은 row1/row2+ 동일 규칙으로 강제.
- Mobile terminal 정책:
  - lifecycle은 `OPENING -> OPEN -> CLOSING -> NORMAL` 단방향.
  - 시퀀스당 pre-open snapshot 1회 생성/재기록 금지.
  - `NORMAL` terminal은 pre-open 높이 복귀(`0px`) 완료 후에만 확정.
- Blog article fallback 정책:
  - article 식별자 누락/무효 시 문서 정의 safe fallback 경로를 적용한다.
- fallback은 `/{locale}/blog` 복귀 + 유효 article 컨텍스트 복원을 기본 경로로 사용한다.
- Consent 기본 운용:
  - 동의 UI 도입 전 기본 확정값은 `OPTED_OUT`(EX-002), 전송 금지.

## 3) 구현 범위 요약

### 3.1 이번 세션 구현 범위(In Scope)
- 라우팅/i18n/404 계약
  - locale prefix 단일성
  - proxy 기반 locale 해석 정책
  - typed route/route builder 계약
- 랜딩 IA/레이아웃
  - Container/Breakpoint/Grid 규칙
  - hero/main 연속 배치
  - underfilled row 예외/금지 규칙
- GNB 계약
  - Desktop settings 레이어
  - Mobile overlay/backdrop/scroll lock
  - route context별 GNB 구성
- 카드 계약
  - Normal/Expanded 슬롯 규칙
  - text clamp/ellipsis 정책
  - spacing/row 안정성 계약
  - unavailable overlay 계약
- 상태/상호작용/모션
  - PageState/CardState/HOVER_LOCK
  - capability gate
  - Desktop handoff/hover-out 규칙
  - Mobile full-bleed lifecycle
- 랜딩→목적지 핸드셰이크
  - Test pre-answer/ingress/instruction/rollback
  - Blog source/article 컨텍스트 전달/fallback
- 텔레메트리/프라이버시
  - V1 최소 이벤트셋
  - transition correlation 상호배타
  - consent/anon id/payload 경계
- SSR/Hydration/성능/A11y/QA 게이트
  - Release blocker 1~19

### 3.2 이번 세션 비구현 범위(Out of Scope)
- 배경 동적 연출(강도 0/정지 유지)
- 카드 tilt
- Google Sheets 실연동/운영 Sync/Admin 분석
- 전역 택소노미 전체 확장
- 테스트/블로그 본문 고도화 기능
- `/history` 실데이터 기능(목록/삭제/정렬)

## 4) 요구사항 매핑 (기능 단위)

| 기능 묶음 | 구현 포인트 | 1차 근거 (`req-landing-final`) | 추적/게이트 |
|---|---|---|---|
| 충돌/동기화 정책 | 우선순위/단일변경 동기화/모호성 중단 | §3.1, §3.2, §3.3 | reimpl checklist 0.x |
| Global Invariants | 실제 페이지 위치, layout 분리, crop 금지 | §4.1 | Blocker #1, #4 |
| 라우팅/i18n/404 | locale prefix 1회, proxy 단일 책임, 404 이원 전략 | §5.1~§5.5 | Blocker #1, #2 |
| Search Params 안전성 | `useSearchParams()` Suspense 경계 강제 | §11.1 | Blocker #1 |
| IA/경로 표면 | `/{locale}`, `/test/[variant]/question`, `/blog`, `/history` | §5, §6, §13 | Blocker #2, #6 |
| Grid 조성 | Desktop Wide/Medium/Narrow, Tablet/Mobile 규칙 | §6.1, §6.2 | Blocker #4, #12 |
| underfilled row | 시작측 정렬 유지 + 폭 확장 금지 | §6.2 | Blocker #12 |
| GNB 컨텍스트 | Desktop settings, Mobile overlay/backdrop, History=Blog | §6.4, §10.2 | Blocker #3, #7 |
| 텍스트/클램프 | subtitle ellipsis 강제 + overflow 오염 금지 | §6.6 | Blocker #4 |
| 카드 슬롯 계약 | Normal/Expanded 순서/제거 규칙 | §6.5, §6.8 | Blocker #4 |
| spacing/높이 계약 | base/comp 간격, same-row 안정성, row2+ 일관 | §6.7 | Blocker #4, #10, #11 |
| 썸네일/형제 슬롯 기하 | subtitle overflow와 슬롯 기하 독립 | §6.6, §6.8 | Blocker #4 |
| 테마/다크모드 | Landing/Test/Blog/History + Normal/Expanded | §6.9 | Blocker #8 |
| 상태모델 | Page/Card/Override/우선순위/가드/결정성 | §7.1~§7.7 | Blocker #5 |
| Desktop trigger/handoff | available-only handoff, timer+intent token | §8.2 | Blocker #13 |
| Core motion | source 0ms/target 표준 분리, non-increasing | §8.3 | Blocker #13, #4 |
| Shell scale/readability | shell 기준 scale, crop 0, row-edge origin | §8.4 | Blocker #4 |
| Mobile lifecycle | atomic lifecycle, queue-close, closing ignore, pre-open snapshot | §8.5 | Blocker #6, #14 |
| Transition start | CTA에서만 전환 시작, 모바일 CTA 우선 | §8.6 | Blocker #6 |
| Blog article fallback | article 식별자 전달 + 누락/무효 안전 fallback | §8.6, §13.3 | Blocker #6 |
| 접근성 | focus 경계, Esc unwind, semantic control, aria-disabled | §9.1~§9.3 | Blocker #5 |
| 성능/SSR | 초기결정성, hydration warning 0, reduced motion, cursor | §11.1~§11.4 | Blocker #1 |
| 텔레메트리 | 최소 이벤트셋, 상관키, 필수필드, payload 경계 | §12.1~§12.3 | Blocker #15, #18 |
| consent/anon id | UNKNOWN/OPTED_OUT 전송 금지, random source 정책 | §12.4, §12.5, §15 EX-002 | Blocker #9 |
| 데이터 계약 | fixture 최소수량/다양성/required 누락 금지 | §12.6 | Blocker #6 (연계) |
| 에러/빈상태 | missing slot/unavailable/rollback/return restoration | §13.1~§13.8 | Blocker #10, #16, #17 |
| 릴리스 게이트 | qa:gate, 1~19 block, traceability closure | §14.1, §14.3, §14.4 | Blocker #19 |

## 5) 구현 아키텍처 계획

### 5.1 라우팅/레이아웃 구조
- 최신 SSOT 기준으로 `src/app` 단일 전략을 사용한다.
- `src/app/layout.tsx`
  - 정적 루트 레이아웃
  - `<html>`, `<body>` 포함
  - 전역 스타일/전역 provider shell만 담당
- `src/app/[locale]/layout.tsx`
  - locale 파라미터 검증
  - i18n 메시지 주입
  - locale 컨텍스트/provider 담당
- `src/proxy.ts`
  - locale 매칭/리다이렉트/allowlist 분기 단일 진입점
  - duplicate locale 차단
- 라우트 표면
  - `/{locale}`: Landing
  - `/{locale}/test/[variant]/question`: Test question entry
  - `/{locale}/blog`: Blog
  - `/{locale}/history`: shell only

### 5.2 typed route / route builder 전략
- `typedRoutes: true` 전제
- route builder 입력/출력은 locale-free path만 허용
- locale 주입은 i18n 라우팅 계층 단일 책임
- `router.push/replace`, `Link href`에서 수동 문자열 결합 금지
- 금지 패턴
  - `as Route` 우회
  - `as never` 우회
  - string concat 기반 locale 중복 생성
- SSG 경로에서 `useSearchParams()` 사용 시
  - 가장 가까운 Suspense 경계 배치 또는 동등 안전 전략 명시

### 5.3 페이지/컴포넌트 경계(개념)
- Landing Page Shell
  - 연속 grid 계산
  - Hero/Main visual 영역 분리
  - capability gate + card state orchestration
- GNB Layer
  - Landing/Desktop+Tablet settings
  - Landing/Mobile menu overlay
  - Test/Mobile back fallback
  - Blog/History context alignment
- Card Layer
  - Catalog card(type: test|blog, availability: available|unavailable)
  - Normal face / Expanded face(Test|Blog)
  - unavailable overlay
- Transition/Handshake Layer
  - Transition controller
  - pre-answer store + ingress flag + correlation
  - fail/cancel rollback cleanup manager
- Telemetry Layer
  - Event queue + Consent resolver + Anonymous ID provider
- Data Layer
  - fixture adapter(normalize + default insertion + required guard)

### 5.4 GNB 동작 확정 규칙
- Desktop/Tablet settings open
  - 기본 hover open
  - pointer 감지 불가 환경에서 focus/click fallback
- Desktop/Tablet settings close
  - Esc / outside click / focus out
  - focus out 닫힘 지연 `<=1 frame`
  - trigger-layer 실효 gap `0px`
  - hover 유예 `100~180ms`는 hover 경로에만 허용
- Mobile 햄버거
  - fixed overlay + backdrop
  - 패널 외부 `pointer down` 닫힘 시작
  - 스크롤 제스처 판정 시 닫힘 취소
  - 닫힘 중 추가 입력 무시
  - close transition 종료 시 unlock
  - close 후 트리거 포커스 복귀

## 6) 상태/이벤트/데이터 흐름 설계

### 6.1 상태 모델
- `PageState`: `ACTIVE | INACTIVE | REDUCED_MOTION | SENSOR_DENIED | TRANSITIONING`
- `CardState`: `NORMAL | EXPANDED | FOCUSED`
- `InteractionMode`
  - `TAP_MODE`
  - `HOVER_MODE` (`width>=768 && hover:hover && pointer:fine`)
- `HOVER_LOCK`
  - hover-capable에서만 활성
  - 활성 카드 외 반응 차단
  - 키보드 모드/비키보드 모드 분기 적용

### 6.2 상태 우선순위/가드/결정성
- 우선순위: `INACTIVE > REDUCED_MOTION > TRANSITIONING > EXPANDED > HOVER_LOCK > NORMAL`
- 구현 원칙:
  - 상위 상태가 하위 상호작용을 덮어쓴다.
  - `TRANSITIONING` 중 카드/스크롤/입력 상태 변화 금지.
  - `TRANSITIONING` 시작 프레임의 시각 상태 고정.
  - `ACTIVE` 복귀 램프업(`120~180ms`) 중 확장/축소/오버레이 변경 금지.
  - 이벤트 도착 순서 역전/지연에도 settled 결과는 동일해야 한다.

### 6.3 Desktop/Tablet 카드 상호작용 흐름
- Available + Hover mode
  - hover enter(`120~200ms`) 후 Expanded
  - hover leave collapse 유예(`100~180ms`)
  - handoff는 다른 available 카드 진입에서만 성립
- handoff 규칙
  - source: `0ms` 즉시 Normal 정착
  - target: 표준 Expanded 모션 유지
  - pointer/keyboard 경로 동일 적용
- Available + Tap fallback(`width>=768`, non-hover-capable)
  - tap으로 Expanded 진입
  - 전환 시각 계약은 hover 경로와 동일
- Unavailable(Test)
  - Expanded/CTA/전환 금지
  - Hover-capable: hover/focus 시에만 overlay
  - Tap mode: overlay 상시 표시
  - overlay 활성 중 cardTitle 식별 가능성 보장

### 6.4 Normal spacing/geometry 불변식
- Hero/Main 카드 공통으로 아래 정책 적용:
  - Normal 카드는 compact(auto) + same-row equal-height stretch
  - `thumbnail -> tags`는 `base_gap + comp_gap`
  - `base_gap`은 비-0 유지
  - `comp_gap`은 보정 필요 카드에서만 허용
  - non-comp 카드 `comp_gap=0` + 추가 잉여 여백 `0`
- row 안정성:
  - Expanded/handoff 중 same-row 비대상 카드 top/bottom/outer height 오차 `0px`
  - row1 규칙이 row2+에도 동일하게 성립
  - Expanded 종료 직후 same-row 비대상 카드 잔류 변화 `0px`
- 텍스트 기하 불변식:
  - subtitle long-token overflow가 카드/row 폭을 늘리면 안 됨
  - subtitle overflow가 형제 슬롯(썸네일/태그) inline-size를 바꾸면 안 됨

### 6.5 Mobile full-bleed lifecycle (`width < 768`)
- Entry
  - 탭한 카드만 Expanded 진입
  - in-flow full-bleed, top jump 금지
  - 카드 폭 `100vw`, 컨테이너 패딩 상쇄
- During
  - lifecycle: `OPENING -> OPEN -> CLOSING -> NORMAL`
  - page scroll lock + body 내부 스크롤 규칙
  - X sticky + layer order 고정
  - CTA 우선순위: `CTA > X > outside`
  - non-CTA 내부 탭은 no-op
- Snapshot/terminal
  - pre-open snapshot 시퀀스당 1회 생성
  - 시퀀스 중 재기록 금지
  - 닫힘 완료 시 pre-open 높이 `0px` 복귀 강제
  - `NORMAL` terminal은 복귀 완료 후 확정
- Exit
  - X/outside 경로만 닫기 허용
  - OPENING 중 닫기 입력은 queue-close 1회
  - CLOSING 중 추가 open/close 입력 무시

### 6.6 전환/핸드셰이크 데이터 흐름
- Blog CTA
  1) transition start(lock)
  2) correlation id(transition_id) 생성 + event_id 매칭
  3) `/{locale}/blog` 진입 + article 식별자 전달
  4) `complete|fail|cancel` 상호배타 종료
- Test CTA(A/B)
  1) Q1 pre-answer 저장
  2) `variant + session` landing ingress flag 기록
  3) transition start(lock)
  4) `/{locale}/test/[variant]/question` 이동
  5) instruction Start 직후 consume(또는 instruction 생략 시 test_start)
- Rollback 트리거(필수 3케이스)
  - 사용자 취소
  - locale duplicate 실패
  - 목적지 route 진입 실패(타임아웃/로드 실패)

### 6.7 Test 시작 문항 결정 규칙
- landing ingress flag 있음 -> instruction seen 여부와 무관하게 Q2 시작
- landing ingress flag 없음 -> Q1 시작
- instructionSeen은 시작 문항 결정 조건이 아님
- landing ingress flag 있음 -> instruction Start 이전 진행표시도 `Question 2 of N`
- 동일 variant 재진입으로 instruction 생략 시에도 동일 규칙 적용
- Q1 수정 가능, 최종 제출값 기준
- dwell time은 포그라운드 여부와 무관 누적, 재방문 합산

### 6.8 Blog article 식별자 fallback 규칙
- 목적지 컨텍스트 결정은 전달된 article 식별자 기준
- 식별자 누락/무효 시 안전 fallback 적용
  - `/{locale}/blog` 이동
  - 기본 article 컨텍스트(첫 번째 유효 article) 복원
- fallback 경로도 transition terminal 상호배타 계약을 동일 적용

### 6.9 consent/telemetry 흐름
- consent 상태머신: `UNKNOWN -> OPTED_IN | OPTED_OUT`
- 기본 운용(EX-002): `OPTED_OUT`
- `UNKNOWN/OPTED_OUT` 전송 금지, 큐 유예/폐기 정책 적용
- `OPTED_IN` 확정 시에만 유예 큐 flush 허용
- transition 이벤트는 `start=1`, `terminal=1` 상호배타 보장

## 7) 데이터 계약 계획 (Fixture + Adapter)

### 7.1 fixture 최소 조건
- Test 카드 4개 이상
- Blog 카드 3개 이상
- unavailable Test 카드 2개 이상
- unavailable Blog 카드 0개
- 다양성 케이스 필수
  - long-token subtitle
  - 긴 본문 텍스트
  - 빈 tags
  - debug/sample fixture
- required 슬롯 누락 금지(데이터 단계)

### 7.2 adapter 출력 모델
- 공통 필드
  - `id`, `type`, `availability`, `title`, `subtitle`, `thumbnailOrIcon`, `tags`
- test expanded 필드
  - `previewQuestion`, `answerChoiceA`, `answerChoiceB`, `meta(3)`
- blog expanded 필드
  - `summary`, `meta(3)`, `primaryCTA`
- 파생 필드
  - `isHero`, `sourceParam`, `localeResolvedText`
- normalize 원칙
  - required 누락 시 throw 대신 normalize + default 삽입
  - empty tags는 chip `0`, 슬롯 높이 유지 정책과 호환

### 7.3 hero/main 배치 알고리즘
- 입력: adapter 정렬 결과(단일 목록)
- 단계:
  1) 표시 대상 필터링(디버그 가시성 정책)
  2) breakpoint별 row 계획 산출
  3) Row1 예외 구간(Medium/Wide) 당김 규칙 적용
  4) underfilled 마지막 row 시작측 정렬 유지
- `heroCount`/row 계획
  - Desktop Wide: Row1 `3`, Row2+ `4`
  - Desktop Medium: Row1 `2`, Row2+ `3`
  - Desktop Narrow: 모든 row `2`
  - Tablet: hero `2`, main `availableWidth>=900`이면 `3` 아니면 `2`
  - Mobile: `1`

### 7.4 슬롯 렌더/클램프/spacing 규칙
- Normal
  - title: 줄바꿈 허용, truncate/ellipsis 금지
  - subtitle: 최대 2줄 truncate + ellipsis(`...`) 시각 노출
  - thumbnail: 6:1, `object-fit: cover`
  - tags: terminal slot, 1줄 슬롯 유지, chip은 1줄 truncate
  - subtitle overflow가 카드/row/형제 슬롯 기하를 바꾸지 않음
- Expanded
  - 공통 헤더: title만 유지
  - subtitle/thumbnail/tags는 미렌더링(숨김 아님)
  - Test: preview/choices 줄바꿈 허용, truncate/ellipsis/clamp 금지
  - Blog: summary 4줄 clamp, CTA/meta overflow truncate
- Missing slot
  - required 누락 시 영역 삭제 금지, 빈값 유지
  - tags empty는 chip `0`, placeholder chip 금지

## 8) 단계별 구현 계획 (순서 고정)

### Phase 1. 기반 계약 고정
- App Router 2-layer layout, proxy, locale/typedRoutes 계약 구현
- route builder/URL 무결성 검증 유틸 구축
- 404 이원 전략(노출/상태코드) 고정
- SSG `useSearchParams` 경계 규칙 적용
- 완료 기준
  - `src/app` + `src/proxy.ts` 구조 규칙 충족
  - 중복 locale URL 생성 경로 없음
  - build 통과 + typed route 우회 캐스팅 0
  - Blocker #1/#2 선충족

### Phase 2. 도메인 모델/데이터 계층
- card/interaction/transition 타입 정의
- fixture + adapter + normalize 정책 구현
- long-token/empty-tags 포함 데이터 다양성 케이스 구성
- 완료 기준
  - fixture 최소 수량/다양성 충족
  - required 슬롯 누락 없는 검증 통과
  - Blocker #6(데이터 전제) 충족 기반 확보

### Phase 3. 페이지 셸/GNB 뼈대
- Landing/Test/Blog/History shell 생성
- 컨텍스트별 GNB 교체 구조 + source/destination swap timing 연결
- Desktop settings open/close 규칙 반영
- Mobile menu overlay/backdrop/scroll lock 구현
- Mobile Test back fallback 반영
- 완료 기준
  - 라우트별 GNB 구성 계약 반영
  - focus-out close, hover-gap `0px`, mobile unlock 타이밍 규칙 반영
  - `/history` shell 접근 가능
  - Blocker #3/#7 충족 기반 확보

### Phase 4. 반응형 레이아웃/그리드
- container/padding/breakpoint/threshold 규칙 적용
- 연속 grid + row 계획 + underfilled 마지막 row 정책 구현
- 폭 변경 시 Expanded 강제 종료 후 재계산 규칙 연결
- 완료 기준
  - breakpoint별 컬럼 규칙 충족
  - hero/main 경계 강제 줄바꿈/빈 track/빈 카드 공간 0
  - underfilled row 폭 확장 0
  - Blocker #4/#12 충족 기반 확보

### Phase 5. 카드 콘텐츠 계약
- Normal/Expanded 슬롯 렌더링 계약 구현
- subtitle ellipsis/long-token 처리 및 기하 불변식 반영
- thumbnail/태그/메타/locale fallback 규칙 적용
- unavailable overlay 규칙 반영
- 완료 기준
  - title 위치/슬롯 순서/미렌더링 규칙 충족
  - overflow로 카드/row/형제 슬롯 폭 오염 0
  - front/back title 불일치 0
  - Blocker #4 충족 기반 확보

### Phase 6. Normal spacing/row 안정성
- `base_gap + comp_gap` 모델 구현
- 보정 필요 판정(row-local 자연 높이 비교) 구현
- non-comp `comp_gap=0` + 추가 잉여 여백 `0` 적용
- same-row 비대상 카드 안정성/잔류 드리프트 제거
- 완료 기준
  - row1/row2+ 동일 판정 규칙 성립
  - same-row 비대상 오차 `0px`
  - empty-tags chip `0` + 슬롯 높이 유지
  - Blocker #10/#11 + #4 일부 충족

### Phase 7. 상호작용 모드 + 상태기계
- capability gate(SSR tap-mode 시작 -> mount 동기화)
- PageState/CardState/HOVER_LOCK reducer/store 구현
- keyboard sequential expansion override(All Viewports) 구현
- state conformance gate(허용/금지 전이) 구성
- 완료 기준
  - 모드별 트리거 계약 충족
  - HOVER_LOCK 키보드/포인터 분기 동작 확인
  - 이벤트 순서 교란에서도 결정성 유지
  - Blocker #5 충족 기반 확보

### Phase 8. Desktop/Tablet handoff + core motion
- hover trigger/cancel/handoff + timer/intent token 구현
- handoff available-only 분기 반영
- source `0ms` / target 표준 모션 분리(pointer+keyboard) 반영
- shell scale/readability/transform-origin 규칙 구현
- 완료 기준
  - unavailable 진입 handoff 오인 0
  - same-card leave `0ms` 오남용 0
  - crop/clipping 0
  - Blocker #13 + #4 충족 기반 확보

### Phase 9. 모바일 full-bleed/레이어/lifecycle
- in-flow full-bleed(`100vw` + 패딩 상쇄)
- queue-close/closing-ignore/CTA 우선순위 구현
- y-anchor/title baseline 0px 규칙 반영
- pre-open snapshot lifecycle + terminal 게이트 구현
- 완료 기준
  - `GNB > Expanded > backdrop > others` 계층 보장
  - top jump/자동 viewport 보정 스크롤 없음
  - 반복 open-close 누적 오차 `0px`
  - Blocker #6/#14 충족 기반 확보

### Phase 10. 전환 잠금/핸드셰이크
- transition correlation/idempotency 구현
- Test pre-answer save/read/consume/rollback 구현
- Blog source/article 전달 및 invalid fallback 연결
- return restoration(scrollY) 저장/1회 복원/즉시 consume 구현
- 완료 기준
  - eventId/transitionId 매칭 + terminal 상호배타 보장
  - rollback 3케이스 재현 가능
  - Q2/Q1 역전 0
  - Blocker #6/#15/#16/#17 충족 기반 확보

### Phase 11. 텔레메트리/프라이버시 + QA 게이트 자동화
- 최소 이벤트셋만 수집
- consent/anon id 정책(EX-002 포함) 반영
- final_submit payload 경계/필수필드 적용
- blocker 1~19 자동 단언 매핑 + qa:gate 3/3 구축
- 완료 기준
  - `UNKNOWN/OPTED_OUT` 전송 0
  - final_submit 누락필드 0, PII/원문 0
  - traceability 미매핑 0
  - Blocker #9/#18/#19 충족

## 9) 테스트/검증 계획

### 9.1 정적 검증
- lint/typecheck/build
- hydration warning `0건`
- route builder 단위 테스트
  - `landing/blog/history/test-question` 경로 생성
  - locale prefix 단일성 보장
- `useSearchParams` 경계/SSR 금지 API 정적 검증
- blocker ↔ automated assertion 매핑 정합성 검사

### 9.2 동작 검증(Playwright)
- URL/i18n/404
  - `/en/en`, `/kr/kr` 0건
  - allowlist 외 locale-less 404 분기
  - segment/global 404 분리 동작
- Settings UI
  - Desktop/Tablet hover-open + fallback open
  - close 규칙(Esc/outside/focus out), gap `0px`, focus-out `<=1 frame`
  - Mobile overlay/backdrop/scroll lock/unlock 타이밍
- Card/Grid/Expanded
  - Wide/Medium/Narrow row 규칙
  - underfilled 마지막 row 시작측 정렬 + 폭 확장 0
  - subtitle ellipsis + overflow contamination 0
  - same-row 비대상 카드 안정성 `0px`
  - row1/row2+ 일관성
  - shell scale/crop 0
- Handoff/Motion
  - available-only handoff
  - source `0ms` / target 표준 모션 분리(pointer+keyboard)
  - hover-out collapse independence
- Mobile lifecycle
  - atomic lifecycle 전이
  - queue-close 1회
  - closing ignore
  - pre-open snapshot lifecycle
  - NORMAL terminal 게이트
- Transition/Test handshake
  - pre-answer 저장/consume 시점
  - ingress flag 기반 Q2 시작
  - instruction 계약
  - rollback 3케이스
  - return scroll 복원 1회
- Telemetry/Privacy
  - transition start/terminal 상호배타
  - destination-ready 이후 complete
  - consent gate/전송 금지
  - final_submit payload 경계

### 9.3 릴리스 블로킹 매트릭스 검증(1~19)
- 1 SSR/Hydration
- 2 Routing/i18n
- 3 GNB/Settings
- 4 Card/Grid/Expanded(+overflow contamination)
- 5 Keyboard/A11y
- 6 Transition/Test Handshake
- 7 Mobile Menu Overlay
- 8 Theme Matrix
- 9 Privacy/Consent
- 10 Normal Spacing Model
- 11 Row 1/Row 2+ Consistency
- 12 Underfilled Final Row Alignment
- 13 Hover-out Collapse Independence
- 14 Mobile Title Baseline Stability
- 15 Transition Terminal Correlation
- 16 Rollback Cleanup Closure
- 17 Return Restoration
- 18 Telemetry Final Payload Completeness
- 19 Traceability Closure

### 9.4 회귀 검증 포인트
- subtitle long-token 회귀
- non-comp 카드 잉여 여백 회귀
- row2+ 잔류 드리프트 회귀
- handoff source/target 모션 분리 회귀
- 모바일 pre-open snapshot/terminal 게이트 회귀
- article fallback 경로 회귀

## 10) 리스크 및 대응
- 레이아웃 스로싱
  - 리스크: Expanded 높이 변화 + row 안정성 충돌
  - 대응: baseline 재측정 금지 구간 고정, 강제 종료 후 재측정
- overflow 기하 오염
  - 리스크: long-token이 카드/row 폭을 오염
  - 대응: subtitle containment 단언 + blocker #4 직접 단언
- handoff 체감 불일치
  - 리스크: source/target 모션 분리 실패
  - 대응: pointer/keyboard 타임라인 단언 테스트 이중화
- 모바일 잔류 높이
  - 리스크: pre-open 복귀 실패/누적 drift
  - 대응: snapshot lifecycle 단언 + 반복 토글 누적 오차 0 검증
- transition 누수
  - 리스크: short path에서 terminal/cleanup 누락
  - 대응: start=1/terminal=1 강제 + rollback cleanup set closure
- consent 운용 오류
  - 리스크: UNKNOWN/OPTED_OUT 전송 누출
  - 대응: 전송 게이트 단언 + EX-002 기본값 고정
- traceability 누락
  - 리스크: blocker 항목 대비 자동 단언 매핑 공백
  - 대응: blocker 1~19 매핑표를 qa:gate 필수 입력으로 강제

## 11) 완료 정의(Definition of Done)
- `req-landing-final.md` Section 1~15의 MUST 항목 충족
- `reimpl-checklist-ssot.md` 핵심 체크 항목 충족
- Release blocker 1~19 모두 PASS
- `npm run qa:gate` 연속 3회 PASS
- SSR/Hydration warning 0건
- 키보드 접근성/포커스/ARIA 필수 항목 충족
- 모바일/데스크탑 반응형 및 상태 전이 계약 충족
- 전환/롤백/텔레메트리/프라이버시 누수 0건
- Out of Scope 기능이 코드 범위로 유입되지 않음
