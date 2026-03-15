# [개선된 구현 계획 문서 제목]

## 0. 문서 목적 및 기준 문서
- 목적: `docs/req-landing-final.md`의 요구사항을 구현 가능한 실행 계획으로 재구성하고, 구현 순서/책임 경계/검증/릴리스 판정을 단일 문서로 고정한다.
- 최상위 기준: `docs/req-landing-final.md`.
- 보조 흡수: `docs/dev-plan-landing.md`의 유효 내용만 선별 반영.
- 문서 사용 원칙:
1. 요구사항과 충돌 시 요구사항 우선.
2. 정책 변경 시 Section 2 동기화 규칙을 동일 변경셋에 적용.
3. 릴리스는 Section 7~10의 자동 단언과 게이트 증빙으로만 판정.

## 1. 구현 범위 / 비범위 / 고정 결정
### 1.1 구현 범위(V1)
1. 랜딩 카탈로그 UI.
2. 카드 상태 전이(Normal/Expanded).
3. unavailable 계약.
4. 랜딩→목적지 전환 핸드셰이크.
5. 최소 텔레메트리.
6. SSR/Hydration 안정성.

### 1.2 비범위(V1)
1. 배경 동적 연출.
2. Google Sheets 실연동.
3. 전역 택소노미 전체 구현.
4. 테스트/블로그 본문 고도화.

### 1.3 고정 결정(Locked)
1. Visual package는 Version B.
2. 배경 동적 연출은 강도 0/정지.
3. 카드 tilt 전면 비활성.
4. 페이지는 `src/app/[locale]/**` 하위만 허용.
5. root/locale layout 책임 분리 고정.
   request-scoped root `html lang` 해석만 예외 허용.
6. i18n 진입점은 `src/proxy.ts` 단일 유지.
7. 경로 생성은 typed route helper/RouteBuilder만 허용.
8. 404는 segment/global 이원 분리.
9. consent UI 도입 전 기본값은 `OPTED_OUT`.

### 1.4 경로 표면
1. `/{locale}`.
2. `/{locale}/test/[variant]/question`.
3. `/{locale}/blog`.
4. `/{locale}/history`.

## 2. 해석 규칙 / 충돌 해결 / 모호성 처리
### 2.1 충돌 해결 우선순위
1. Section 4 Global Invariants.
2. Section 5 Routing & Layout Contract.
3. Section 6~13 기능 계약.
4. Section 15 Exception Registry(명시 범위만).

### 2.2 Single-change Synchronization
| 변경 트리거 | 동기화 대상 섹션 |
|---|---|
| title/truncate/wrap | 6, 8, 9, 14 |
| 전환/핸드셰이크 | 7, 8, 12, 13, 14 |
| 라우팅/locale | 5, 13, 14 |
| 키보드 포커스/확장/Esc | 7, 9, 14 |
| 테마/다크모드 | 6, 8, 10, 14 |
| `subtitle -> tags` 간격 | 6.7, 14.3 |
| underfilled 마지막 row | 6.2, 14.3 |
| Desktop hover-out collapse | 8.2, 14.3 |
| Mobile title baseline | 8.5, 14.3 |
| terminal 이벤트 시점/상호배타/필수필드 | 8.6, 12.1, 12.2, 13.3, 13.6, 14.3 |
| fail/cancel cleanup set | 13.3, 13.6, 14.3 |
| missing-slot(tags empty) | 6.7, 13.1, 14.3 |
| `final_submit` payload schema | 12.2, 12.3, 13.7, 14.3 |
| Desktop settings 열기/닫기/gap | 6.4, 10.2, 14.3 |
| return restoration(`scrollY`) | 13.8, 14.3 |

- 위 변경이 발생하면 blocker↔assertion 매핑(Section 7.4)도 같은 변경셋에서 갱신한다.

### 2.3 용어 해석 고정(구현 영향)
| 용어 | 구현 해석 |
|---|---|
| Settled | 시간 기준이 아닌 상태 기준 완료 판정 |
| Row Baseline | Expanded 직전 same-row snapshot 기준값 |
| Handoff | 다른 available 카드 진입에서만 성립 |
| Hover-capable Mode | `width>=768` + `(hover:hover && pointer:fine)` |
| Tap Mode | `width<768` 또는 capability 미충족 |
| Keyboard Mode | `Tab/Shift+Tab` 기반 탐색 모드 |
| Landing Ingress Flag | Q1/Q2 시작 문항 판단의 유일 근거 |
| Question Index | UI/Telemetry 1-based 고정 |
| Transition Correlation | `transition_id` 단위 `start=1`, terminal 1회 |

### 2.4 모호성 처리
- 단일 해석 불가 시 릴리스 중단 후 옵션/선택 근거를 문서에 고정한다.
- 고정된 모호성 레지스트리:
1. AR-001 Transition Terminal Timing: Option B(`transition_complete`는 destination-ready 이후).
2. AR-002 Empty Tags Slot Policy: Option B(tags 높이 유지 + chip 0개).

### 2.5 이번 확정 반영(2026-03-06)
1. Blog fallback: `/{locale}/blog`로 이동 후 첫 번째 유효 article 사용.
2. `result_reason` 코드 체계: 고정 enum.
3. destination-ready: 라우트 진입 + 목적지 필수 컨텍스트 준비 완료 동시 만족.

## 3. 요구사항 기반 핵심 아키텍처 결정
### 3.1 전역 불변식
1. 유효 라우트는 locale prefix 1회만 허용.
2. `src/app/layout.tsx`는 top-level 루트(`html/body` 포함)이며 request-scoped document `lang` 반영만 허용한다.
3. `src/app/[locale]/layout.tsx`는 locale 검증/i18n 주입 전용.
4. 실제 페이지는 `src/app/[locale]/**` 하위만 존재.
5. Expanded에서 콘텐츠 식별성 훼손 crop 금지.

### 3.2 라우팅/레이아웃/404
- `src/proxy.ts`는 locale 해석/리다이렉트/allowlist 분기만 담당한다.
- localized request pass-through 시에는 root document semantics용 request locale header를 함께 주입한다.
- `/` 처리: cookie -> Accept-Language -> defaultLocale.
- locale-less allowlist: `/blog`, `/history`, `/test/[variant]/question`.
- allowlist 외 locale-less 경로는 locale 주입 금지 + global unmatched 404.
- duplicate locale prefix는 비정상 경로로 global unmatched 404.
- `middleware.ts` 도입은 Section 15 예외 등록 후에만 허용.
- 404 전략:
1. segment not-found: `src/app/not-found.tsx`.
2. global unmatched: `src/app/global-not-found.tsx`.

### 3.3 Typed Routes
1. RouteBuilder 입력/출력은 locale-free path 기준.
2. locale 주입은 i18n 계층 단일 책임.
3. 금지: 수동 문자열 결합, `as Route`, `as never`.

### 3.4 IA/레이아웃 기준
- Container max-width 1280.
- Side padding: Desktop/Tablet 24(좁은 폭 20 허용), Mobile 16.
- Breakpoints: Mobile 0~767, Tablet 768~1023, Desktop 1024+.
- Grid 규칙:
1. Desktop Wide(`availableWidth>=1160`): Row1=3, Row2+=4.
2. Desktop Medium(`1040<=availableWidth<1160`): Row1=2, Row2+=3.
3. Desktop Narrow(`900<=availableWidth<1040`): 모든 row=2.
4. Tablet: hero=2, main은 `availableWidth>=900`이면 3 아니면 2.
5. Mobile: 1열, gap 14~16.
6. underfilled 마지막 row는 시작측 정렬 유지, 카드 폭 확장 금지.
7. Expanded 활성 중 폭 재계산 필요 시 강제 종료 후 1회 재계산.
- hero/main은 시각 명칭이며 배치는 단일 연속 grid로 처리한다.
- Hero는 입력 없는 정보 영역이며 outline/border/stroke를 사용하지 않는다.

### 3.5 GNB 계약
- 공통: sticky top 0, z-index >=1000, Desktop/Tablet 64, Mobile 56.
- Desktop settings:
1. 기본 hover open.
2. pointer 미감지 환경은 focus/click fallback.
3. close: Esc/outside/focus out.
4. trigger-layer 실효 gap 0px.
5. focus out close 지연 <=1 frame.
6. hover 유예(100~180ms)는 hover 경로에만 허용.
- Mobile menu:
1. fixed overlay + backdrop.
2. 패널은 solid, 패널 외 영역은 불투명 dim.
3. 패널은 페이지 요소보다 상위 레이어, 상단 클리핑 금지.
4. 외부 `pointer down` 시 close 시작, scroll gesture면 취소.
5. close 중 추가 입력 무시.
6. close 완료 후 햄버거 트리거로 focus 복귀.
- Mobile Test GNB: Back + Timer.
- Mobile Test Back: `history.back` 우선, 실패 시 `/{locale}` fallback.
- History는 Blog와 동일 GNB 컨텍스트.
- 언어/테마 제어 위치:
1. Desktop은 settings 내부만.
2. Mobile은 햄버거 하단 컨트롤만.

### 3.6 카드/텍스트/슬롯 계약
- 슬롯:
1. Normal: `title -> thumbnailOrIcon -> subtitle -> tags`.
2. Expanded 공통 헤더: title만 유지.
3. Expanded에서 subtitle/thumbnail/tags는 제거(숨김 아님).
4. Test Expanded: previewQuestion, answerChoiceA/B, meta(3).
5. Blog Expanded: summary(4줄 clamp), meta(3), CTA(Read more 1개).
6. Test Expanded Start CTA 금지.
- 텍스트:
1. Normal title: wrap 허용, truncate/ellipsis 금지.
2. Normal subtitle: 최대 2줄 + overflow 시 ellipsis 시각 노출.
3. subtitle overflow는 카드/row/형제 슬롯 inline-size 변경 금지.
4. tags는 1줄 슬롯 고정, chip wrap 금지.
5. Test choices는 좌측 정렬, 줄 제한 없음, truncate/ellipsis/clamp 금지.
6. Blog summary는 4줄 clamp.
7. meta/CTA overflow는 truncate.
- 썸네일/의미론:
1. Normal thumbnail은 ratio 6:1 + `object-fit:cover`.
2. front/back title 불일치 금지.
3. meta는 3개 고정, non-interactive 슬롯.
4. 수치 표기는 `k/m` 축약 금지, 3자리 구분자 사용.
5. 텍스트는 활성 locale 우선, 누락 시 default locale fallback.

### 3.7 spacing/geometry 불변식
- `subtitle -> tags`는 `base_gap + comp_gap`.
- `base_gap`은 비-0 + 기본 수직 리듬 일치.
- `needs_comp(card_i) = (natural_height_i < max(natural_height_row))` 고정.
- `needs_comp=false` 카드의 `comp_gap=0`은 전이 프레임 포함 항상 유지.
- empty-tags는 chip 0 + tags 슬롯 1줄 높이 유지.
- auto-spacer(`margin-top:auto`, `space-between`, filler flex, pseudo spacer) 금지.
- same-row non-target 안정성:
1. Expanded/handoff 중 top/bottom/outer height 오차 0px.
2. 종료 직후 잔류 변화 0px.
3. row1 규칙을 row2+에 동일 적용.

### 3.8 상태/모션/성능
- 상태 우선순위: `INACTIVE > REDUCED_MOTION > TRANSITIONING > EXPANDED > HOVER_LOCK > NORMAL`.
- capability gate:
1. `width<768`은 Tap Mode.
2. `width>=768` + capability 충족은 Hover-capable.
3. `width>=768` + capability 미충족은 Tap Mode.
4. SSR 초기값은 Tap Mode.
- HOVER_LOCK:
1. hover-capable 전용.
2. 비대상 카드 NORMAL 강제 + opacity 1.0.
3. 키보드 모드 아님: `tabIndex=-1`.
4. 키보드 모드: `aria-disabled=true` + Enter/Space 차단.
- Keyboard sequential override:
1. Tab/Shift+Tab으로 카드 포커스 도달 시 즉시 Expanded.
2. 내부 입력 요소 순회 후 다음 카드 이동.
3. 카드 이동 시 이전 카드는 0ms로 Normal 복귀, 현재 카드는 표준 Expanded 모션.
- Desktop/Tablet trigger/handoff:
1. hover enter 120~200ms 후 Expanded.
2. hover leave collapse 100~180ms 유예.
3. handoff는 다른 available 카드 진입에서만 성립.
4. 단일 timer + intent token.
5. source pending/진행 transition 즉시 취소, 마지막 hover 카드만 Expanded.
- Core motion:
1. Normal->Expanded: Phase A/B/C 각 280ms, C stagger 40/100/160.
2. easing은 `ease-in-out` 계열 통일.
3. spring/overshoot 금지.
4. source 0ms는 handoff source 이탈에만 허용.
5. target 진입은 표준 모션 유지.
6. Expanded->Normal은 non-increasing + 종료 높이 0px 복원.
- Shell/readability:
1. Desktop/Tablet scale=1.1은 shell 전체 적용.
2. 내부 콘텐츠 단독 확대 금지.
3. crop/clip로 식별성 저해 금지.
4. 다중 Expanded 금지(활성 1개).
- Baseline freeze/restore:
1. `BASELINE_READY -> BASELINE_FROZEN -> BASELINE_RESTORE_PENDING -> BASELINE_READY`.
2. 활성 중 재측정 금지.
3. snapshot 해제는 종료 직후 1회.
4. row A->B handoff에서 row A 해제는 row B settled 이후.
- Mobile lifecycle:
1. `OPENING -> OPEN -> CLOSING -> NORMAL` 단방향.
2. 단일 pointer/touch 시퀀스당 상태 전이 최대 1회.
3. OPENING 중 닫기 입력은 OPEN settled 직후 queue-close 1회.
4. CLOSING 중 추가 open/close 입력 무시.
5. 닫기 경로는 X/backdrop만 허용.
6. CTA 우선순위 `CTA > X > outside`.
7. non-CTA 내부 탭 no-op.
8. 미세 이동 입력은 scroll gesture로 분류.
9. pre-open snapshot은 시퀀스당 1회, 재기록 금지.
10. `NORMAL` terminal은 snapshot 높이 복귀 0px 완료 후 허용.
11. OPENING/CLOSING transition window의 y-anchor drift 0px, settled title baseline 0px.
12. layer는 `GNB > Expanded > backdrop > others`.
13. OPENING/CLOSING transition window page scroll lock, OPEN settled unlock, close 후 current scroll position 유지.
- SSR/Hydration:
1. 초기 렌더에서 `window/localStorage/sessionStorage/Date.now/Math.random` 분기 금지.
2. `useSearchParams()`는 가장 가까운 Suspense 경계 강제.
3. hydration warning 1건이라도 릴리스 차단.
- Reduced motion/cursor:
1. `prefers-reduced-motion`에서 대형 이동 금지, 150~220ms 단순 전환.
2. 커스텀 커서 금지.
3. available 카드/CTA만 pointer, unavailable는 기본 커서.

### 3.9 접근성
- 키보드 도달성 보장(HOVER_LOCK 예외 규칙 포함).
- focus ring 명확성 보장.
- 카드 focus 경계는 Card Shell 외곽과 일치.
- Esc 우선순위: 최상위 오버레이/패널 닫기 -> 카드 Focus/Expanded 해제.
- hamburger/settings/back/X는 `aria-label` 필수.
- 1차 트리거는 시맨틱 요소(`<button>`, `<a>`) 강제.
- `aria-disabled=true`는 활성 차단 동작을 click/Enter/Space에서 실제 차단해야 함.
- `role="button"` 대체는 예외 등록 없이 금지.
- Coming Soon overlay 활성 시에도 focus 스타일과 cardTitle 식별성 유지.

### 3.10 텔레메트리/동의/데이터 소스
- 최소 이벤트셋만 수집.
- `OPTED_IN`에서만 네트워크 전송.
- `UNKNOWN/OPTED_OUT`는 전송 금지(유예 큐 저장 가능).
- transition correlation: `start=1`, terminal 1회(`complete|fail|cancel`).
- `transition_complete`는 destination-ready 이후만 허용.
- 필수 공통 필드: `event_id`, `session_id`, `ts_ms`, `locale`, `route`, `consent_state`.
- 전환 필수 필드: `transition_id`, `source_card_id`, `target_route`, `result_reason`.
- `result_reason` 고정 enum:
1. `USER_CANCEL`.
2. `DUPLICATE_LOCALE`.
3. `DESTINATION_TIMEOUT`.
4. `DESTINATION_LOAD_ERROR`.
5. `BLOG_FALLBACK_EMPTY`.
6. `UNKNOWN`.
- `transition_cancel`은 `USER_CANCEL`만 허용.
- payload 금지: 원문 질문/답변, 자유입력 텍스트, PII/지문성 식별자.
- `final_submit` 필수: `variant`, `question_index_1based`, `dwell_ms_accumulated`, `landing_ingress_flag`, `final_responses`, `final_q1_response`.
- fixture + adapter 강제:
1. Test 4+, Blog 3+, unavailable Test 2+, unavailable Blog 0.
2. long text/empty tags/debug/sample 포함.
3. required 누락 시 throw 대신 normalize + default 삽입.

### 3.11 에러/빈상태/핸드셰이크/복원
- missing-slot: required 누락 시 영역 제거 금지, 빈값 유지.
- tags empty: chip 0 + 슬롯 높이 유지.
- unavailable Blog 카드 금지.
- unavailable Test는 Expanded/CTA/전환 금지.
- 전환 잠금:
1. 시작 즉시 `TRANSITIONING`.
2. 시작 프레임 시각 상태 고정.
3. source GNB는 destination-ready 전까지 유지.
4. destination GNB는 ready 시점 1회 교체.
5. fail/cancel 시 cleanup set 전체 롤백(부분 정리 금지).
- Test ingress:
1. Q1 pre-answer 저장 + ingress flag 기록.
2. ingress flag 존재 시 Q2 시작(InstructionSeen과 무관).
3. ingress flag 부재 시 Q1 시작.
4. ingress flag 존재 시 instruction Start 전 진행표시 `Question 2 of N`.
5. consume 시점은 Start 직후, instruction 생략 경로는 `test_start` 시점.
- dwell time은 foreground 여부와 무관 누적, 재방문 합산.
- return restoration:
1. 저장 시점은 라우팅 직전.
2. 랜딩 재진입 mount 직후 1회 복원.
3. 복원 직후 즉시 consume.
4. 중복 복원 금지.

### 3.12 Exception Registry 적용
- EX-001: global-not-found는 버전 종속 설정과 함께 운용.
- 가드레일: Next 버전 고정 + 릴리스 전 404 E2E 회귀.
- EX-002: consent UI 도입 전 기본 `OPTED_OUT`.
- 가드레일: `UNKNOWN/OPTED_OUT` 전송 0, `OPTED_IN`에서만 유예 큐 전송.

## 4. 기능 영역별 구현 계획
### 4.1 책임 분리 매트릭스
| 기능 영역 | 구현 단위 | 책임 경계 | 실패 방지 포인트 | 검증 연결 |
|---|---|---|---|---|
| 라우팅/i18n/404 | layout/proxy/typed routes/404 | layout-proxy-routebuilder 분리 | duplicate locale, allowlist 오분기 | #1, #2, #15 |
| IA/Grid | breakpoint/grid/underfilled/recalc | planner와 state 분리 | 빈 track, 폭 확장, 경계 줄바꿈 | #4, #12 |
| 카드 표면 | 슬롯/텍스트/썸네일/meta/CTA | renderer-adapter 분리 | overflow 오염, CTA 규칙 위반 | #4, #10, #18 |
| spacing/geometry | base+comp, needs_comp, row 안정성 | spacing solver + baseline manager | non-comp comp_gap 누수, row drift | #4, #10, #11 |
| GNB | Desktop settings + Mobile menu | desktop/mobile controller 분리 | gap/close 타이밍 누락 | #3, #7 |
| 상태/모션 | capability/HOVER_LOCK/keyboard/handoff | state machine + motion engine | source/target 혼선 | #4, #5, #13, #14 |
| Mobile Expanded | lifecycle/snapshot/layer/priority | mobile reducer 단일 책임 | OPENING↔CLOSING 역전 | #6, #14 |
| 핸드셰이크 | ingress/instruction/rollback/restoration | transition controller + ingress store | terminal 누락, rollback 누수 | #6, #15, #16, #17 |
| 접근성 | semantic/focus/Esc/overlay | trigger layer 시맨틱 강제 | role 대체, focus 경계 불일치 | #5 |
| 테마 | light/dark matrix + persistence | token 공급/소비 분리 | 페이지별 다크 누락 | #8 |
| 텔레메트리/동의 | event/correlation/payload/consent | collector-consent gate 분리 | 비동의 전송, payload 경계 위반 | #9, #15, #18 |

### 4.2 구현 산출물(핵심)
1. RouteBuilder 단위 테스트와 금지 패턴 정적 검사.
2. Grid planner 테스트(Desktop Wide/Medium/Narrow, Tablet, Mobile, underfilled).
3. Spacing solver 테스트(`base_gap`, `comp_gap`, `needs_comp`).
4. State transition 테스트(우선순위/허용 전이/결정성).
5. Motion timeline 테스트(source 0ms/target 표준 분리).
6. Mobile lifecycle 테스트(queue-close/closing-ignore/snapshot gate).
7. Handshake/rollback 테스트(3케이스 + terminal 상호배타).
8. Telemetry schema/금지필드/consent gate 테스트.
9. Traceability 매핑 산출물(blocker↔assertion).

## 5. 상태 / 상호작용 / 전환 설계
### 5.1 상태 전이 표준
- 상태 집합과 우선순위는 Section 3.8 고정 계약을 따른다.
- `settled`는 시간 기반이 아니라 상태 기반 완료 조건으로 판정한다.
- 허용 전이 테이블 외 전이와 우선순위 위반 전이는 릴리스 차단 대상이다.

### 5.2 Desktop/Tablet 상호작용
1. hover enter 지연과 hover leave 유예를 분리 운영한다.
2. handoff는 available 카드 간 이동에만 적용한다.
3. handoff source와 target의 모션 규격을 분리한다.
4. 관련 이벤트 역전/지연에도 최종 상태 결정성을 유지한다.

### 5.3 Baseline/Geometry 안정성
1. baseline freeze/restore 전이를 엄격히 준수한다.
2. Expanded/handoff 활성 프레임 동안 same-row non-target 변형을 금지한다.
3. 종료 후 잔류 오차 0px를 만족하기 전에는 Normal settled로 판정하지 않는다.

### 5.4 Mobile lifecycle 원자성
1. `OPENING -> OPEN -> CLOSING -> NORMAL` 외 전이 금지.
2. OPENING 중 close 입력은 queue-close 1회만 허용.
3. CLOSING 인터럽트는 무시한다.
4. pre-open snapshot은 시퀀스당 1회만 생성한다.
5. `NORMAL` terminal은 복원 완료 후에만 허용한다.

### 5.5 Landing→Destination 전환
1. 전환 시작은 유효 CTA에서만 허용한다.
2. destination-ready 이전 `transition_complete` 금지.
3. destination-ready는 “라우트 진입 + 목적지 필수 컨텍스트 준비 완료” 동시 만족으로 판정한다.
4. Blog 식별자 누락/무효 시 fallback은 `/{locale}/blog` + 첫 유효 article로 고정한다.
5. terminal 상호배타(`start=1`, terminal=1)를 전 경로에 강제한다.

## 6. 데이터 / 텔레메트리 / 동의 / 복원 계획
### 6.1 데이터 계약
- fixture 최소 수량과 다양성 규칙은 Section 3.10을 따른다.
- adapter는 normalize + default 삽입으로 required 누락을 방어한다.
- empty-tags는 chip 0과 슬롯 높이 유지를 동시에 만족한다.

### 6.2 텔레메트리 계약
- V1 최소 이벤트셋만 수집한다.
- correlation 규칙(`start=1`, terminal 1회)과 필수 필드를 강제한다.
- `result_reason`은 고정 enum만 허용한다.
- payload 금지 필드 위반은 즉시 릴리스 차단이다.

### 6.3 동의/익명 ID 계약
- `UNKNOWN -> OPTED_IN | OPTED_OUT` 상태기계 고정.
- `UNKNOWN/OPTED_OUT` 전송 금지.
- `OPTED_IN`에서만 유예 큐 flush.
- 랜덤 소스 불가 환경은 session_id 생성/전송을 모두 금지한다.

### 6.4 핸드셰이크/롤백/복원
- pre-answer read/consume 분리.
- consume 시점은 Start 직후 또는 `test_start`.
- rollback cleanup set 누수 금지.
- dwell은 백그라운드 포함 누적.
- return restoration은 1회 복원 후 즉시 consume 고정.

## 7. 검증 전략 / QA 게이트 / 자동화 매핑
### 7.1 릴리스 게이트
1. 명령: `npm run qa:gate`.
2. 최소 구성: `build && test && test:e2e:smoke`.
3. 1건 실패 시 릴리스 차단.
4. 최종 PASS는 연속 3회(3/3).

### 7.2 검증 계층
- 정적 게이트:
1. typed route 우회 패턴 검사.
2. 초기 렌더 금지 API 검사.
3. `useSearchParams()` Suspense 경계 검사.
4. hydration warning 0건 로그 수집.
- 단위/통합 게이트:
1. proxy/RouteBuilder/grid/spacing/state/payload 테스트.
2. correlation/consent/anon ID 테스트.
- E2E/시각 게이트:
1. 라우팅/404.
2. GNB/settings/menu.
3. card/grid/expanded/geometry.
4. handoff/core motion.
5. mobile lifecycle.
6. handshake/rollback/restoration.
7. theme matrix.

### 7.3 Release-blocking(1~19) 매핑
| Blocker | 핵심 자동 단언 |
|---|---|
| 1 SSR/Hydration | warning 0, typedRoutes build PASS, Suspense 위반 0 |
| 2 Routing/i18n | locale prefix 단일성, duplicate 0, allowlist/404 분기 PASS |
| 3 GNB/Settings | open/close/fallback, gap 0px, focus out <=1 frame, mobile overlay/lock |
| 4 Card/Grid/Expanded | 컬럼 규칙, same-row 안정성 0px, overflow 오염 0, shell scale/crop PASS |
| 5 Keyboard/A11y | Tab override, 내부 순회, Esc unwind, 시맨틱 트리거 강제 |
| 6 Transition/Test | ingress/Q2, consume 시점, rollback 3케이스, mobile atomicity, CTA 우선순위 |
| 7 Mobile Menu Overlay | 패널/백드롭, 외부 입력 close, gesture 취소, close 중 입력 무시 |
| 8 Theme Matrix | 페이지4x테마2, Expanded 다크, 핵심/보조 정합 |
| 9 Privacy/Consent | UNKNOWN/OPTED_OUT 전송 0, OPTED_IN 전송만 허용 |
| 10 Normal Spacing | `base_gap>0`, non-comp `comp_gap=0`, empty-tags 계약 PASS |
| 11 Row1/Row2+ | needs_comp row 독립성, row index 우회 신호 0 |
| 12 Underfilled Row | 시작측 정렬 유지, 폭 확장 0 |
| 13 Hover-out Independence | 최신 경계 판정, single timer+token, source/target 분리 |
| 14 Mobile Baseline | title baseline 0, y-anchor 0, queue-close, terminal 선행조건 |
| 15 Terminal Correlation | `start=1`, terminal 1회, complete ready 이후, reason 필수 |
| 16 Rollback Closure | fail/cancel 3케이스 cleanup set 누수 0 |
| 17 Return Restoration | 저장시점/1회복원/즉시consume/중복0 |
| 18 Final Payload | 필수필드 누락 0, raw text/PII 0 |
| 19 Traceability Closure | blocker↔assertion 미매핑 0, stale reference 0 |

### 7.4 Traceability 운영 규칙
1. blocker 1~19는 모두 최소 1개 자동 단언과 매핑되어야 한다.
2. 매핑 누락/불일치/stale reference 1건이라도 릴리스 차단.
3. Section 2.2 동기화 대상 변경 시 매핑표를 동일 변경셋에서 갱신.

## 8. 단계별 구현 순서(Phase)
| Phase | 구현 목표 | 종료 게이트 | 연결 Blocker |
|---|---|---|---|
| 1 | 라우팅/레이아웃/typed routes/404 기반 고정 | 구조 규칙 PASS, duplicate locale 경로 0, build PASS | 1,2 |
| 2 | fixture+adapter+도메인 타입 | 최소 수량/다양성/required 검증 PASS | 6(전제),18(전제) |
| 3 | 페이지 셸/GNB 뼈대 | 라우트별 GNB 계약 PASS | 3,7 |
| 4 | 반응형 grid/underfilled 정책 | 컬럼/정렬/폭 확장 금지 PASS | 4,12 |
| 5 | 카드 표면 계약 | 슬롯/텍스트/overflow 오염 0 PASS | 4 |
| 6 | spacing/geometry 안정화 | comp_gap/needs_comp/row 안정성 PASS | 4,10,11 |
| 7 | 상태기계 + keyboard override | 허용 전이/결정성/키보드 규칙 PASS | 5 |
| 8 | Desktop/Tablet handoff + core motion | source/target 분리, hover-out 독립 PASS | 4,13 |
| 9 | Mobile full-bleed lifecycle | atomicity/y-anchor/baseline/terminal PASS | 6,14 |
| 10 | 전환 핸드셰이크/rollback/restoration | terminal 상호배타, cleanup closure, 1회 복원 PASS | 6,15,16,17 |
| 11 | telemetry/consent/privacy + traceability | 전송 게이트/Payload/매핑 공백 0, qa:gate 3/3 PASS | 9,18,19 |

## 9. 리스크 / 회귀 포인트 / 방지책
| 고위험 구간 | 회귀 신호 | 방지책 | 탐지 |
|---|---|---|---|
| spacing invariant | non-comp 잉여 여백, 판정 불일치 | needs_comp 수식 고정, auto-spacer 금지 | #10,#11 |
| same-row non-target geometry | 활성 중 비대상 높이 변동 | geometry isolation + baseline freeze | #4 |
| baseline freeze/restore | freeze 중 재측정, row A 조기 해제 | 상태 전이 강제 + 해제 타이밍 단언 | #4,#13 |
| handoff source/target 분리 | target까지 0ms 적용 | source 전용 0ms 규칙 강제 | #13 |
| mobile lifecycle atomicity | OPENING↔CLOSING 역전 | 단방향 lifecycle + queue-close/closing-ignore | #6,#14 |
| hydration determinism | SSR/CSR 분기, warning 발생 | 초기 렌더 금지 API 차단 + 로그 게이트 + SSR `html lang` smoke | #1 |
| telemetry terminal correlation | terminal 누락/중복 | `start=1`/terminal 1회 강제 | #15 |
| rollback cleanup closure | state/lock/flag/body lock 누수 | cleanup set 전체 원자 정리 | #16 |
| return restoration | 중복 복원, stale scroll | 저장/복원/consume 시점 고정 | #17 |
| traceability closure | 매핑 공백/stale reference | 매핑 스크립트 필수화 | #19 |
| Blog fallback | 식별자 누락 시 컨텍스트 불안정 | `/{locale}/blog` + 첫 유효 article 고정 | #6,#15 |
| `result_reason` drift | 코드 체계 불일치 | 고정 enum + cancel/fail 분리 | #15,#18 |
| EX-001 | Next 업그레이드 후 404 변동 | 버전 고정 + 404 회귀 | #2 |
| EX-002 | 비동의 전송 누출 | 기본 OPTED_OUT + 전송 게이트 | #9 |
| EX-003 | request-scoped root `html lang`로 localized routes dynamic 전환 | proxy header provenance + SSR `html lang` smoke + hydration 0 | #1,#2 |

## 10. 완료 정의(DoD)
1. Section 1 범위 항목이 구현/검증으로 충족되고 비범위 항목이 유입되지 않았다.
2. 요구사항 Section 1~15 핵심 계약이 구현 계획/코드/검증에 반영되었다.
3. release-blocking 1~19 전 항목 PASS.
4. 각 blocker는 최소 1개 자동 단언으로 증빙된다.
5. `npm run qa:gate` 연속 3회 PASS.
6. hydration warning 0, typed route 우회 캐스팅 0, Suspense 위반 0.
7. rollback 누수 0, 비동의 전송 0, payload 금지필드 0, restoration 중복 0.
8. Section 2.2 동기화 트리거 변경 시 관련 섹션/매핑이 동일 변경셋에서 갱신되었다.
9. EX-001/EX-002 가드레일이 운영/검증에 반영되었다.

## 11. 확인 필요 항목(있다면)
- 현재 확인 필요 항목 없음.
- 확정 사항 유지:
1. Blog fallback은 `/{locale}/blog` + 첫 유효 article.
2. `result_reason`은 고정 enum만 허용.
3. destination-ready는 라우트 진입 + 목적지 필수 컨텍스트 준비 완료 동시 만족.
