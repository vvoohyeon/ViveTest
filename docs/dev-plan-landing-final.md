# [개선된 구현 계획 문서 제목]

## 0. 문서 목적 및 기준 문서
- 목적: `docs/req-landing-final.md`의 MUST/RULE/Verification/release-blocking 계약을 구현 가능한 실행 계획으로 전개하고, 구현 순서/책임 경계/검증/릴리스 게이트를 단일 문서로 고정한다.
- 기준 문서 1순위: `docs/req-landing-final.md`.
- 흡수 문서 2순위: `docs/dev-plan-landing.md`.
- 적용 원칙: 요구사항 문서와 충돌하는 초안 내용은 제거 또는 교정하고, 충돌하지 않는 유효 내용은 재배치하여 흡수한다.
- 문서 적용 범위: Landing V1 재구현, QA 게이트, 릴리스 준비, 회귀 방지 운영 규칙.

## 1. 구현 범위 / 비범위 / 고정 결정
- 구현 범위(V1 고정): 랜딩 카탈로그 UI, 카드 상태 전이(Normal/Expanded), unavailable 계약, 랜딩→목적지 핸드셰이크, 최소 텔레메트리, SSR/Hydration 안정성.
- 비범위(V1 고정): 배경 동적 연출, Google Sheets 실연동, 전역 택소노미 전체 구현, 테스트/블로그 본문 고도화.
- 고정 시각 결정: Visual Package Version B, 배경 동적 연출 강도 0/정지, 카드 tilt 비활성.
- 고정 라우팅/레이아웃 결정: 실제 페이지는 `src/app/[locale]/**` 하위만 허용, `src/app/layout.tsx`(정적 루트)와 `src/app/[locale]/layout.tsx`(locale 검증/i18n 주입) 책임 분리.
- 고정 i18n 진입 결정: `src/proxy.ts` 단일 엔트리 유지, locale-less 처리 allowlist 정책 준수, duplicate locale prefix는 전역 unmatched 404로 귀결.
- 고정 경로 생성 결정: 수동 문자열 결합 금지, typed route helper/RouteBuilder만 허용, 우회 캐스팅(`as Route`, `as never`) 금지.
- 고정 404 결정: segment not-found(`src/app/not-found.tsx`)와 global unmatched(`src/app/global-not-found.tsx`) 이원 분리.
- 고정 상태/전환 결정: 상태 우선순위, HOVER_LOCK, keyboard sequential override, handoff source 0ms/target 표준 모션 분리를 계약으로 고정.
- 고정 개인정보 결정: 동의 UI 도입 전 기본 운용은 `OPTED_OUT`(EX-002), `UNKNOWN/OPTED_OUT` 전송 금지.

## 2. 해석 규칙 / 충돌 해결 / 모호성 처리
- 충돌 우선순위: Global Invariants(Section 4) > Routing/Layout(Section 5) > 기능 계약(Section 6~13) > Exception Registry(Section 15의 명시 범위).
- 동기화 강제 규칙: 단일 정책 변경은 연관 섹션을 동일 변경셋으로 동시 갱신한다.

| 변경 트리거 | 동기화 대상 섹션 |
|---|---|
| title/truncate/wrap 정책 | 6, 8, 9, 14 |
| 전환/핸드셰이크 정책 | 7, 8, 12, 13, 14 |
| 라우팅/locale 정책 | 5, 13, 14 |
| 키보드 포커스/확장/Esc | 7, 9, 14 |
| 테마/다크모드 | 6, 8, 10, 14 |
| `thumbnail -> tags` 간격 정책 | 6.7, 14.3 |
| underfilled 마지막 row 정렬/예외 | 6.2, 14.3 |
| Desktop hover-out collapse 경계/유예 | 8.2, 14.3 |
| Mobile Expanded title baseline | 8.5, 14.3 |
| 전환 terminal 이벤트 시점/상호배타/필드 | 8.6, 12.1, 12.2, 13.3, 13.6, 14.3 |
| fail/cancel rollback cleanup set | 13.3, 13.6, 14.3 |
| missing-slot(tags empty) 정책 | 6.7, 13.1, 14.3 |
| `final_submit` payload 스키마 | 12.2, 12.3, 13.7, 14.3 |
| Desktop settings 열기/닫기/gap | 6.4, 10.2, 14.3 |
| return restoration(`scrollY`) | 13.8, 14.3 |

- 용어 해석 고정(구현 영향):
| 용어 | 구현 해석 영향 |
|---|---|
| Settled | 시간 기준이 아니라 상태 기준 완료 판정으로 사용하며, 추가 상태 변형이 없을 때만 완료로 처리 |
| Row Baseline | Expanded 시작 직전 same-row snapshot 기준값으로 freeze/restore의 단일 기준 |
| Handoff | “다른 available 카드 진입”으로만 성립하며 source 0ms/target 표준 모션 분리 강제 |
| Hover-capable Mode | `width>=768` + `(hover:hover && pointer:fine)`일 때만 hover intent/handoff 계약 활성 |
| Tap Mode | `width<768` 또는 hover capability 미충족 시 적용, 모바일 full-bleed/탭 기반 전이 적용 |
| Keyboard Mode | `Tab/Shift+Tab` 탐지 시 진입, pointer 입력 시 즉시 해제, sequential expansion override 우선 적용 |
| Landing Ingress Flag | Test 시작 문항(Q1/Q2) 결정의 유일 근거로 사용하며 instructionSeen은 보조 조건으로 사용 금지 |
| Question Index | UI/Telemetry 모두 1-based 고정, payload 검증 시 강제 |
| Transition Correlation | `transition_id` 단위 `start=1`과 terminal 1회 상호배타 종료를 강제하는 핵심 키 |

- 추적성 동기화 규칙: 위 변경 트리거가 발생하면 Section 7의 blocker↔assertion 매핑도 같은 커밋에서 갱신한다.
- 모호성 처리 규칙: 단일 해석 불가 시 릴리스 중단 후 옵션/선택 근거를 문서에 고정한다.
- 모호성 레지스트리 고정 선택:
1. AR-001 Transition Terminal Timing: `transition_complete`는 destination ready 이후만 허용(Option B).
2. AR-002 Empty Tags Slot Policy: tags container 1줄 높이 유지 + chip 0개 렌더(Option B).
- 운영 규칙: 모호성 미해결 상태에서 구현/릴리스 진행 금지.

## 3. 요구사항 기반 핵심 아키텍처 결정
- 전역 불변식(절대): locale prefix는 1회만 허용, 루트/locale 레이아웃 책임 분리, 실제 페이지 위치 제한, Expanded 콘텐츠 식별성 훼손 crop 금지.
- 라우팅 결정:
1. 최종 URL 형식은 `/{locale}/...`.
2. 내부 경로는 locale-free 기준으로 생성.
3. locale-less allowlist(`/blog`, `/history`, `/test/[variant]/question`)만 locale 주입.
4. allowlist 외 locale-less 경로는 locale 주입 금지 + global unmatched 404.
5. duplicate locale prefix는 비정상 경로로 분기해 global unmatched 404.
- `proxy.ts` 책임 경계: locale 해석/리다이렉트/allowlist 분기 전용, 비즈니스 상태 로직 금지.
- 진입점 예외 제어: `middleware.ts` 도입이 필요할 경우 EX 레지스트리에 사유/리스크/가드레일/검증을 선등록한 경우에만 허용.
- typed route 책임 경계: RouteBuilder는 경로 생성만 담당, i18n 계층이 locale 주입을 담당.
- 404 아키텍처: 도메인 내부 오류는 segment not-found, 라우팅 트리 외부 unmatched는 global-not-found.
- Exception Registry 반영:
1. EX-001: global-not-found는 Next 버전 종속 설정과 함께 운용, 버전 고정 + 404 E2E 회귀 필수.
2. EX-002: consent UI 전 기본 `OPTED_OUT`, 비동의 전송 금지.
- 레이아웃 아키텍처:
1. Container max-width 1280.
2. Side padding Desktop/Tablet 24(좁은 폭 20 허용), Mobile 16.
3. Breakpoint: Mobile 0~767, Tablet 768~1023, Desktop 1024+.
4. Desktop grid 규칙(Wide/Medium/Narrow)과 underfilled 마지막 row 정렬 예외를 고정 적용.
5. Expanded 활성 중 폭 재계산 필요 시 강제 종료 후 1회 재계산.
- 테마 아키텍처: 의미 토큰 기반(light/dark) 적용, Landing/Test/Blog/History + Normal/Expanded 전 구간 커버.
- 성능/결정성 아키텍처:
1. 초기 렌더 경로(`useState initializer`, provider default, context init 포함)에서 `window`, `localStorage`, `sessionStorage`, `Date.now`, `Math.random` 분기 금지.
2. SSR 초기 중립값을 강제하고 hydration warning 0건을 자동 로그로 증명.
3. `useSearchParams()` 사용 Client Component는 가장 가까운 Suspense 경계 강제.
4. Reduced Motion은 대형 이동을 금지하고 150~220ms 단순 전환으로 축소.
5. 커스텀 커서 금지, available 카드/CTA만 pointer, unavailable는 기본 커서 유지.
- 모션 아키텍처:
1. Expanded 관련 모션은 transform 중심으로 구성하고 비확장 row 재계산 유발 구현 금지.
2. source 0ms는 handoff source 이탈에만 허용, 동일 카드 일반 leave/close에서 0ms 금지.
3. spring/overshoot, Expanded alpha 애니메이션, 내부 이중 박스 시각, 콘텐츠 식별성 저해 clipping 금지.

## 4. 기능 영역별 구현 계획
| 기능 영역 | 무엇을 구현하는가 | 책임 경계 | 방지하려는 실패 | 검증 및 릴리스 연계 |
|---|---|---|---|---|
| 라우팅/i18n/404 | 2-layer layout, `proxy.ts`, locale prefix 단일성, allowlist/404 분기, typed routes | Layout 계층은 렌더 책임, proxy는 locale 분기 책임, RouteBuilder는 locale-free 경로 책임 | duplicate locale, locale-less 오분기, 수동 경로 결합, 404 혼선 | Blocker 1,2,15 / proxy unit + routing E2E + 정적 패턴 검사 |
| IA/Grid/Container | breakpoint별 컬럼 규칙, hero/main 연속 grid, underfilled 마지막 row 시작측 정렬, 폭 변경 시 강제 종료 재계산 | Grid planner는 배치 계산만 담당, 카드 상태 엔진과 분리 | hero/main 경계 강제 줄바꿈, 빈 track/빈 카드 공간, underfilled 폭 확장 | Blocker 4,12 / viewport 파라미터 E2E + 레이아웃 스냅샷 |
| 카드 슬롯/텍스트 | Normal/Expanded 슬롯 순서, 제거 슬롯 미렌더링, clamp/ellipsis 규칙, locale fallback, Normal thumbnail `6:1`+`object-fit:cover`, Expanded meta 3개 고정 및 숫자 축약(`k/m`) 금지, Test Expanded Start CTA 금지/Blog CTA 1개(`Read more`) 고정 | Card renderer는 슬롯 렌더 책임, 데이터 adapter는 콘텐츠 정규화 책임 | subtitle overflow로 형제 슬롯/row 폭 오염, front/back title 불일치, 메타 표기 불일치, 썸네일 왜곡, CTA 개수 규칙 위반 | Blocker 4,10,18 / DOM 순서 검사 + long-token 시각 회귀 |
| spacing/geometry 불변식 | `base_gap + comp_gap`, needs_comp 판정식, empty-tags 높이 유지(chip 0), same-row 비대상 geometry isolation | Spacing solver는 Normal 불변식 책임, Expanded 엔진은 non-target 불변식 보호 책임 | non-comp 추가 잉여 여백, same-row 비대상 높이 동조, row2+ 잔류 드리프트 | Blocker 4,10,11 / 계산식 단언 + 프레임 기반 geometry 측정 |
| GNB/설정/메뉴 | Desktop settings hover/fallback open, Esc/outside/focus out close, hover gap 0px, hover 유예는 hover 경로에만 적용, Mobile overlay/backdrop/scroll lock, 메뉴 패널 solid 표면+외부 불투명 dim, 패널은 GNB 포함 페이지 요소보다 상위 레이어+상단 클리핑 금지, outside `pointer down` 즉시 close 시작(스크롤 제스처면 취소), close 중 추가 입력 무시, Mobile Test back fallback(`history.back` 우선, 실패 시 `/{locale}`), 언어 변경 위치(Desktop 설정 레이어 내부/Mobile 하단 컨트롤) 고정 | Desktop settings controller와 Mobile menu controller 분리, History는 Blog와 동일 GNB 컨텍스트 공유 | focus out 지연 누적, backdrop 입력 처리 오류, unlock 시점 누락, Test back 경로 불일치, 언어 제어 위치 이탈 | Blocker 3,7 / Playwright 상호작용 시나리오 |
| 오류/빈상태/unavailable | required slot 누락 시 레이아웃 유지, tags empty 슬롯 높이 유지+chip 0, unavailable Blog 미노출, unavailable Test는 진입/CTA/전환 금지 | Adapter는 누락 방어 책임, Interaction layer는 unavailable 진입 차단 책임 | missing slot 제거, placeholder chip, unavailable 경로 진입 | Blocker 4,10,16 / fixture 검사 + DOM/E2E 단언 |
| 상태/상호작용/모션 | capability gate, HOVER_LOCK, keyboard override, handoff source/target 모션 분리, core motion time/stagger | State machine은 전이 결정성 책임, Motion engine은 시각 규격 책임 | handoff 오인, source/target 모션 혼합, dual-visibility, crop/clipping | Blocker 4,5,13,14 / 상태 전이 테스트 + 타임라인 단언 |
| 모바일 Expanded lifecycle | `OPENING -> OPEN -> CLOSING -> NORMAL`, queue-close, closing-interrupt ignore, y-anchor/title baseline 0px, pre-open snapshot 1회 | Mobile lifecycle reducer가 단일 시퀀스 전이 책임 | OPENING↔CLOSING 역전, snapshot 재기록, 높이 복원 실패, CTA 우선순위 위반 | Blocker 6,14 / 모바일 전용 E2E + 반복 토글 오차 측정 |
| 전환 핸드셰이크/Test ingress | CTA에서만 transition_start, Test pre-answer/ingress flag, instruction consume 시점, rollback 3케이스, return restoration | Transition controller와 Test ingress store 분리 | start/terminal 누락, Q2→Q1 역전, rollback 누수, scroll 중복 복원 | Blocker 6,15,16,17 / 핸드셰이크 E2E + 롤백 카오스 시나리오 |
| 접근성/시맨틱 | 카드 1차 트리거 시맨틱 요소 강제, focus ring/경계 일치, Esc 해제 우선순위, aria-disabled 규칙 | Interaction trigger 레이어가 시맨틱 강제 책임 | role=button 오남용, 포커스 경계 붕괴, overlay에서 title/focus 식별 불가 | Blocker 5 / axe-core + DOM 감사 + 키보드 시나리오 |
| 테마/다크모드 | 페이지 4종 x 상태 2종 matrix 적용, 핵심/보조 요소 다크 정합, 초기 system-follow와 수동 변경 후 `light|dark` 저장 | Theme tokens는 공통, 페이지는 토큰 소비만 담당, 언어/테마 제어 위치는 GNB 계약으로 제한 | 페이지별 테마 불일치, Expanded 다크 누락, 저장 상태 불일치 | Blocker 8 / 페이지×테마 시각 회귀 |
| SSR/성능/커서 | 초기 렌더 결정성, hydration 무경고, reduced motion/low-spec 전환 축소, cursor policy 적용 | SSR gate는 정적 분석 책임, UI layer는 커서/모션 토큰 소비 책임 | hydration 경고, CSR bailout, 과도 모션, 커서 정책 위반 | Blocker 1,4 / build 로그 게이트 + 모션/커서 E2E |
| 텔레메트리/동의 | 최소 이벤트셋, transition correlation, payload 금지필드 차단, consent/anon ID 정책 | Telemetry collector와 consent gate 분리 | UNKNOWN/OPTED_OUT 전송 누출, terminal 중복, raw text/PII 포함 | Blocker 9,15,18 / 스키마 테스트 + 네트워크 캡처 단언 |

## 5. 상태 / 상호작용 / 전환 설계
### 5.1 상태 모델 및 우선순위
| 축 | 고정 값 |
|---|---|
| PageState | `ACTIVE`, `INACTIVE`, `REDUCED_MOTION`, `SENSOR_DENIED`, `TRANSITIONING` |
| CardState | `NORMAL`, `EXPANDED`, `FOCUSED` |
| Override | `HOVER_LOCK` |
| 우선순위 | `INACTIVE > REDUCED_MOTION > TRANSITIONING > EXPANDED > HOVER_LOCK > NORMAL` |

- Guard 고정: `INACTIVE`에서 입력 기반 카드 상태 변경 no-op, `ACTIVE` 복귀 램프업(120~180ms) 중 확장/축소/오버레이 변경 금지, `TRANSITIONING`에서 입력/스크롤 잠금 및 시작 프레임 상태 고정.
- 결정성 고정: 입력 순서 역전/지연/재마운트가 있어도 동일 시퀀스의 settled 결과는 동일해야 한다.
- 상태 적합성 게이트: 허용 전이 집합/우선순위 위반 전이는 UI 가시 동작 정상 여부와 무관하게 릴리스 차단으로 처리한다.

### 5.2 Desktop/Tablet 전이 규칙
- capability gate: SSR 초기 Tap Mode, mount 후 모드 동기화.
- hover-capable Expanded 진입: hover enter 후 120~200ms.
- hover leave collapse: 경계 완전 이탈 시 100~180ms 유예 내 수행, 다른 카드 hover 여부와 독립.
- handoff 성립 조건: 다른 available 카드 진입에서만 성립.
- handoff 모션 분리: source는 0ms 즉시 Normal, target은 표준 Expanded 모션 유지.
- handoff 외 경로에서 0ms 전이 금지.
- HOVER_LOCK 가드: 비대상 카드는 NORMAL 강제/opacity 1.0 고정, 키보드 모드가 아니면 `tabIndex=-1`, 키보드 모드에서는 `aria-disabled=true`로 활성화만 차단.
- Keyboard sequential override: `Tab/Shift+Tab`으로 카드 포커스 도달 시 즉시 Expanded, 내부 입력 요소 순회 후 다음 카드 이동, 카드 이동 시 이전 카드는 0ms Normal 복귀.
- 이벤트 안전성: `relatedTarget` 부재/비-Element/DOM 외부 대상에서도 runtime 예외 없이 동일 결과를 보장.
- 코어 모션 시간 계약: Normal→Expanded는 Phase A/B/C 각 280ms, C stagger 40/100/160ms, easing은 `ease-in-out` 계열로 통일.
- 복귀 단조성 계약: Expanded→Normal 중 카드 외곽 높이는 non-increasing을 유지하고 종료 시 pre-expand Normal 높이와 0px 오차로 복원.
- Shell 적용 계약: Desktop/Tablet Expanded `scale=1.1`은 Card Shell 전체에 적용하며 내부 콘텐츠 단독 확대 구현 금지.
- transform-origin 계약: row 첫 카드 `0% 0%`, 마지막 카드 `100% 0%`, 그 외 `50% 0%`, 단일 카드 row는 `0% 0%`.

### 5.3 Baseline Freeze/Restore 및 geometry isolation
- baseline 상태 전이 고정: `BASELINE_READY -> BASELINE_FROZEN -> BASELINE_RESTORE_PENDING -> BASELINE_READY`.
- Expanded/handoff 시작 시 same-row baseline snapshot 즉시 freeze.
- Expanded/handoff 중 freeze 해제/재측정 금지.
- snapshot 해제는 종료 직후 1회만 허용.
- row A→B handoff 시 row A 해제는 row B settled 이후에만 허용.
- same-row non-target 카드 안정성: 활성/종료 프레임 모두 top/bottom/outer height 오차 0px.
- Expanded 높이 정책: Desktop/Tablet에서 fixed height 금지, settled는 content-fit 하단 무여백을 강제.
- dual-visibility 금지: 동일 카드가 전환 중 Normal/Expanded로 동시 가시화되면 안 된다.

### 5.4 Mobile lifecycle atomicity
- lifecycle 단방향 고정: `OPENING -> OPEN -> CLOSING -> NORMAL`.
- 단일 pointer/touch 시퀀스당 상태 전이는 최대 1회.
- OPENING 중 닫기 입력은 OPEN settled 직후 queue-close 1회 처리.
- CLOSING 중 추가 open/close 입력 무시.
- 닫기 경로 제한: X 또는 backdrop만 허용.
- 상호작용 우선순위: `CTA > X > outside`, non-CTA 내부 탭 no-op.
- 탭 판정 보수 규칙: 미세 이동 감지 입력은 scroll gesture로 분류해 open/close 전이를 시작하지 않는다.
- pre-open snapshot: 시퀀스당 1회 생성, 재기록 금지.
- `NORMAL` 확정 조건: pre-open 높이 복귀 0px 완료 후에만 허용.
- y-anchor/title baseline 계약: Expanded 시작~종료까지 활성 카드 상단 y-anchor drift 0px, settled title baseline은 진입 직전 Normal과 0px 오차.
- 레이어 계약: `GNB > Expanded 카드 > backdrop > 기타 카드`, backdrop이 Expanded/X를 덮으면 안 된다.
- 스크롤 계약: full-bleed 구간 전 기간 page scroll lock 유지, close transition 종료 시점 unlock, 자동 viewport 보정 스크롤 금지.

### 5.5 Landing→Destination 전환 시퀀스
1. 유효 CTA 입력에서만 `transition_start` 허용.
2. 즉시 `TRANSITIONING` 진입 + 상호작용 잠금.
3. Test 경로는 pre-answer 저장 + ingress flag 기록 + 목적지 이동.
4. Blog 경로는 article 식별자 전달 + 목적지 컨텍스트 확정, 식별자 누락/무효 시 `/{locale}/blog`로 이동 후 adapter 정렬 기준 “첫 번째 유효 article”로 컨텍스트를 확정한다.
5. destination ready 이후에만 `transition_complete` 허용하며, destination ready는 “라우트 진입 완료 + 목적지 필수 컨텍스트 준비 완료”를 동시에 만족해야 한다.
6. 목적지 필수 컨텍스트의 최소 조건은 다음과 같이 고정한다.
   - Blog: 렌더 대상 article ID 확정 + 해당 article 데이터 normalize 완료.
   - Test: `variant` 확정 + 시작 문항 인덱스(Q1/Q2) 확정 + instruction 표시/생략 상태 확정.
7. 실패/취소는 `transition_fail` 또는 `transition_cancel`로 종료하고 rollback cleanup set 전체 정리.
8. terminal 상호배타 규칙: `start=1`, `terminal=1`.
9. source GNB는 destination ready 전까지 유지하고 destination GNB는 ready 시점에 1회만 교체.
10. 전환 시작 프레임의 카드 시각 상태 고정, 전환 중 상태 되돌림 금지.

## 6. 데이터 / 텔레메트리 / 동의 / 복원 계획
### 6.1 Fixture + Adapter 데이터 계약
- fixture 최소치: Test 4+, Blog 3+, unavailable Test 2+, unavailable Blog 0.
- fixture 다양성: long text, long-token subtitle, empty tags, debug/sample 포함.
- required 슬롯 누락 금지.
- adapter 방어 규칙: required 누락에서도 throw 대신 normalize + default 삽입.
- empty tags 렌더 규칙: tags 슬롯 높이 1줄 유지, chip 렌더 0개.

### 6.2 텔레메트리 이벤트 계약
- V1 필수 이벤트: `landing_view`, `transition_start`, `transition_complete|transition_fail|transition_cancel`(상호배타), `attempt_start`, `final_submit`.
- 기본 미수집: scroll/hover/expanded 토글/tilt/unavailable 시도.
- transition correlation 규칙: `transition_id` 단위 `start=1`, `terminal=1`, terminal 중복 금지.
- `transition_complete`는 destination ready(목적지 라우트 진입 + 목적지 컨텍스트 확정) 이후에만 허용.
- 전송 필수 공통 필드: `event_id`, `session_id`, `ts_ms(UTC)`, `locale`, `route`, `consent_state`.
- 전환 필수 필드: `transition_id`, `source_card_id`, `target_route`, `result_reason(실패/취소 시)`.
- `result_reason`은 고정 enum만 허용한다: `USER_CANCEL`, `DUPLICATE_LOCALE`, `DESTINATION_TIMEOUT`, `DESTINATION_LOAD_ERROR`, `BLOG_FALLBACK_EMPTY`, `UNKNOWN`.
- `transition_cancel`에는 `USER_CANCEL`만 허용하고, 나머지 코드는 `transition_fail`에서만 허용한다.
- 테스트 필수 필드: `variant`, `question_index_1based`, `dwell_ms_accumulated`, `landing_ingress_flag`.

### 6.3 Payload 경계 및 프라이버시
- 금지 데이터: 원문 질문/답변 텍스트, 자유입력 텍스트, PII/지문성 식별자.
- `final_submit` 필수: `variant`, `question_index_1based`, `dwell_ms_accumulated`, `landing_ingress_flag`, `final_responses`, `final_q1_response`.
- `final_responses`는 의미 코드 맵으로만 기록.
- question index는 UI/Telemetry 모두 1-based 고정.

### 6.4 Consent/Anonymous ID 상태기계
- consent 상태: `UNKNOWN -> OPTED_IN | OPTED_OUT`.
- SSR/초기 렌더는 `UNKNOWN` 고정, mount 후 저장소 동기화 1회.
- `UNKNOWN/OPTED_OUT` 전송 금지, `OPTED_IN`에서만 유예 큐 전송.
- `OPTED_OUT` 확정 즉시 유예 큐 폐기 + 익명 식별자 무효화.
- anonymous ID 우선순위: `randomUUID -> getRandomValues`.
- 랜덤 소스 불가 환경: `session_id` 미생성, 클라이언트 전송 금지.

### 6.5 Pre-answer / rollback / restoration
- Test ingress 규칙: ingress flag 존재 시 Q2 시작, 부재 시 Q1 시작.
- 진행표시 계약: ingress flag 존재 시 instruction Start 이전 진행표시도 `Question 2 of N`으로 고정.
- instruction 계약: Desktop centered card overlay, Mobile full-screen overlay, 활성 중 하위 입력 차단, 최초 진입 표시 필수, variant 재진입 재표시 금지.
- pre-answer lifecycle: read/consume 분리, consume 시점은 Start click 직후 또는 instruction 생략 시 내부 `test_start`.
- rollback cleanup set(누수 금지): pre-answer, ingress flag, pending transition/state, interaction lock, body lock, queued close.
- 조기 return/short transition과 무관하게 시작된 전환은 terminal 이벤트(`complete|fail|cancel`)로 반드시 종료.
- dwell time: 포그라운드 여부와 무관 누적, 재방문 합산.
- return restoration: 라우팅 직전 `scrollY` 저장, 재진입 mount 직후 1회 복원 후 즉시 consume, 중복 복원 금지, 복원 중 자동 viewport 보정 스크롤 금지.

## 7. 검증 전략 / QA 게이트 / 자동화 매핑
### 7.1 게이트 실행 정책
- 릴리스 게이트 명령: `npm run qa:gate`.
- 최소 포함: `build && test && test:e2e:smoke`.
- 실패 처리: 1건 실패 시 즉시 릴리스 차단.
- 최종 통과 조건: 연속 3회 PASS(3/3).

### 7.2 자동화 계층
- 정적 게이트: typed routes 우회 패턴 검사, 초기 렌더 금지 API 검사, `useSearchParams()` Suspense 경계 검사.
- 단위 테스트: proxy locale 해석, RouteBuilder, 상태 전이/가드, spacing 판정식, payload schema.
- 통합/E2E: 라우팅/404, GNB, 카드/그리드/모션, 모바일 lifecycle, 핸드셰이크/롤백, consent 전송 게이트.
- 시각 회귀: breakpoint×테마 matrix, shell scale/crop, overlay readability.
- 추적성 검사: blocker 항목과 자동 단언 매핑 정합성 스크립트.

### 7.3 Release-blocking(1~19) 자동 단언 매핑
| Blocker | 자동 단언(최소 1개) | 주 검증 스위트 | 릴리스 차단 조건 |
|---|---|---|---|
| 1 SSR/Hydration | hydration warning 0, typedRoutes build PASS, Suspense 경계 위반 0 | build + static gate | 1건이라도 위반 |
| 2 Routing/i18n | locale prefix 단일성, duplicate prefix 0, allowlist/404 분기 PASS | route unit + E2E | 분기/중복 실패 |
| 3 GNB/Settings | Desktop open/close/fallback, gap 0px, focus out <=1 frame, Mobile overlay/lock | Playwright E2E | 동작/타이밍 위반 |
| 4 Card/Grid/Expanded | 컬럼 규칙, hero/main 연속, same-row 안정성 0px, overflow 오염 0, shell scale/crop | layout E2E + visual diff | 기하/모션 위반 |
| 5 Keyboard/A11y | Tab sequential override, 내부 포커스 순회, Esc unwind, 시맨틱 트리거 강제 | keyboard E2E + DOM audit + axe | 키보드/시맨틱 위반 |
| 6 Transition/Test Handshake | ingress/Q2 규칙, consume 시점, rollback 3케이스, mobile lifecycle atomicity, CTA 우선순위 | handshake E2E | 역전/누락/원자성 위반 |
| 7 Mobile Menu Overlay | 패널/백드롭 시각, outside pointer down close, 스크롤 제스처 취소, close 중 입력 무시 | mobile menu E2E | 메뉴 생명주기 위반 |
| 8 Theme Matrix | 페이지 4종×light/dark, Expanded 다크 적용, 핵심/보조 요소 정합 | visual matrix | 테마 누락/불일치 |
| 9 Privacy/Consent | `UNKNOWN/OPTED_OUT` 전송 0, `OPTED_IN` 전송 허용, 랜덤 소스 불가 전송 차단 | telemetry network tests | 비동의 전송 발생 |
| 10 Normal Spacing Model | `base_gap>0`, non-comp `comp_gap=0`, empty-tags chip 0 + 슬롯 높이 유지 | spacing unit + geometry E2E | spacing invariant 위반 |
| 11 Row1/Row2+ 일관성 | needs_comp 판정식 row 무관성, row index 우회 신호 0 | spacing property tests | 판정식 불일치 |
| 12 Underfilled Final Row | 시작측 정렬 유지, 카드 폭 확장 0 | grid E2E | 정렬/폭 확장 위반 |
| 13 Hover-out Collapse Independence | 최신 경계 판정, 단일 timer+intent token, source 0ms/target 표준 분리 | motion timeline E2E | collapse/handoff 계약 위반 |
| 14 Mobile Title Baseline Stability | title baseline 0px, y-anchor drift 0px, queue-close/closing ignore, NORMAL terminal 선행조건 | mobile geometry E2E | 기준선/앵커/터미널 위반 |
| 15 Transition Terminal Correlation | `start=1`,`terminal=1` 상호배타, complete는 destination-ready 이후, fail/cancel reason 필수 | telemetry correlation tests | terminal 상호배타 위반 |
| 16 Rollback Cleanup Closure | fail/cancel 3케이스에서 cleanup set 누수 0 | rollback chaos E2E | 상태/락/플래그 누수 |
| 17 Return Restoration | 저장 시점, mount 직후 1회 복원, 즉시 consume, 중복 복원 0 | restoration E2E | 복원 중복/누락 |
| 18 Telemetry Final Payload | `final_submit` 필수 필드 누락 0, raw text/PII 0 | payload schema tests | 필드 누락/금지필드 포함 |
| 19 Traceability Closure | blocker↔assertion 매핑 미매핑 0, stale reference 0 | traceability gate script | 매핑 공백/불일치 |

### 7.4 수동 검증(자동화 보완)
- Manual 체크는 요구사항이 명시한 항목만 수행하며, 자동 단언을 대체하지 않는다.
- 404 화면/상태코드, 시각 품질, 키보드-only 탐색, AR 레지스트리 기록 상태를 릴리스 리뷰에서 샘플링 확인한다.
- traceability closure 검증: blocker↔assertion 매핑 누락/불일치/stale reference 1건이라도 있으면 릴리스를 차단한다.

## 8. 단계별 구현 순서(Phase)
| Phase | 구현 목표 | 선행 이유 | 종료 게이트 | 연결 Blocker |
|---|---|---|---|---|
| 1 | 라우팅/레이아웃/typed routes/404 기반 고정 | 경로 계약이 모든 기능의 선행 제약 | 구조 규칙 통과, duplicate locale 경로 0, build PASS | 1,2 |
| 2 | fixture+adapter+도메인 타입 구축 | 카드/GNB/상태 구현의 입력 계약 확보 | fixture 최소치/다양성/required 검증 PASS | 6(전제),18(전제) |
| 3 | Landing/Test/Blog/History 셸 + GNB 골격 | 이후 카드/상태 전이를 수용할 페이지 컨텍스트 확보 | Desktop/Mobile GNB 기본 동작 PASS | 3,7 |
| 4 | 반응형 grid/row planner/underfilled 정책 | 카드 상태 전이 이전에 배치 안정성 확보 | 컬럼 규칙/underfilled 정렬 PASS | 4,12 |
| 5 | 카드 슬롯/텍스트/clamp/locale fallback | spacing/모션 이전에 콘텐츠 표면 계약 확정 | 슬롯 순서/미렌더링/overflow 오염 0 | 4 |
| 6 | spacing 모델 + same-row geometry isolation | 상호작용 전 기하 불변식을 먼저 고정 | comp_gap/needs_comp/empty-tags/same-row 오차 0 | 4,10,11 |
| 7 | 상태기계(Page/Card/HOVER_LOCK) + keyboard override | 모션/핸드셰이크의 결정성 기반 확보 | 허용 전이/결정성/키보드 규칙 PASS | 5 |
| 8 | Desktop/Tablet trigger/handoff/core motion/shell scale | PC계열 상호작용 복잡 구간을 독립 완성 | handoff 분리/hover-out/crop 0 PASS | 4,13 |
| 9 | Mobile full-bleed lifecycle/레이어/스냅샷 | 모바일 원자성·복원성 계약 분리 구현 | lifecycle atomicity/y-anchor/baseline 복원 PASS | 6,14 |
| 10 | 전환 핸드셰이크/rollback/return restoration | 상태·모션 위에 전환 원자성 결합 | start-terminal 상호배타, rollback closure, restoration 1회 PASS | 6,15,16,17 |
| 11 | telemetry/consent/privacy + traceability gate 통합 | 릴리스 판단의 마지막 게이트 | consent 전송 규칙, payload 경계, 매핑 공백 0, qa:gate 3/3 | 9,18,19 |

## 9. 리스크 / 회귀 포인트 / 방지책
| 고위험 구간 | 주요 회귀 신호 | 방지 설계 | 탐지/게이트 |
|---|---|---|---|
| spacing invariant(`base_gap+comp_gap`) | non-comp 카드 잉여 여백, row별 판정 불일치 | needs_comp 수식 고정, auto-spacer 패턴 금지 | Blocker 10,11 자동 단언 |
| same-row non-target geometry 안정성 | Expanded/handoff 중 비대상 top/bottom/height 변동 | geometry isolation + baseline freeze 상태기계 | Blocker 4 자동 측정 |
| baseline freeze/restore | freeze 중 재측정, row A snapshot 조기 해제 | `READY->FROZEN->RESTORE_PENDING->READY` 강제 | Blocker 4,13 프레임 테스트 |
| handoff source/target 모션 분리 | target까지 0ms 적용, same-card leave 0ms 오남용 | source 전용 0ms 규칙 고정 | Blocker 13 타임라인 단언 |
| mobile lifecycle atomicity | OPENING↔CLOSING 역전, closing 중 인터럽트 수용 | 단방향 lifecycle + queue-close/closing-ignore | Blocker 6,14 |
| hydration determinism | SSR/CSR 분기, hydration warning 발생 | 초기 렌더 금지 API 차단 + 중립 초기값 | Blocker 1 |
| telemetry terminal correlation | terminal 누락/중복, complete 조기 발생 | `start=1`,`terminal=1` invariant + destination-ready 게이트 | Blocker 15 |
| fail/cancel rollback cleanup closure | state/lock/flag/body lock 누수 | cleanup set 전체 원자 정리 강제 | Blocker 16 |
| return restoration 1회 복원/즉시 consume | 중복 복원, stale scroll 적용 | 저장/복원/consume 시점 고정 | Blocker 17 |
| traceability closure | blocker와 자동 단언 매핑 공백 | 매핑 검증 스크립트 qa:gate 필수화 | Blocker 19 |
| EX-001(global-not-found 버전 종속) | Next 업그레이드 후 unmatched 404 동작 변질 | Next 버전 고정 + 업그레이드 시 404 회귀 결과/설정 변경 근거 기록 강제 | Blocker 2 + 404 회귀 게이트 |
| EX-002(consent 기본 OPTED_OUT) | 동의 UI 이전 비동의 전송 누출 | 기본값 OPTED_OUT 고정 + UNKNOWN/OPTED_OUT 전송 0 단언 | Blocker 9 |

## 10. 완료 정의(DoD)
- Section 1의 구현 범위 항목이 모두 코드/테스트로 구현되고 비범위 항목이 유입되지 않았다.
- 요구사항 문서의 Global Invariants, Routing/Layout, Section 6~13 계약, Exception Registry 가드레일이 구현과 검증에 반영되었다.
- release-blocking 1~19가 모두 PASS이며, 각 항목은 최소 1개 이상의 자동 단언으로 증빙된다.
- `npm run qa:gate`를 연속 3회 실행해 3/3 PASS를 확보했다.
- hydration warning 0, typed routes 관련 우회 캐스팅 0, `useSearchParams()` Suspense 경계 위반 0을 확인했다.
- 롤백 누수 0, consent 비동의 전송 0, `final_submit` 금지필드 0, return restoration 중복 0을 확인했다.
- Section 3.2 동기화 규칙 대상 변경 시 관련 섹션과 traceability 매핑이 동일 변경셋에서 갱신되었다.
- 모호성 레지스트리 미해결 항목이 없고, 확인 필요 항목은 정책 확정 후 반영되었다.

## 11. 확인 필요 항목(있다면)
- 현재 확인 필요 항목 없음(2026-03-06 확정 반영 완료).
- 확정 반영 1: Blog article 식별자 누락/무효 시 `/{locale}/blog` 이동 후 adapter 정렬 기준 첫 번째 유효 article을 목적지 컨텍스트로 사용한다.
- 확정 반영 2: `result_reason`은 고정 enum(`USER_CANCEL`, `DUPLICATE_LOCALE`, `DESTINATION_TIMEOUT`, `DESTINATION_LOAD_ERROR`, `BLOG_FALLBACK_EMPTY`, `UNKNOWN`)만 허용한다.
- 확정 반영 3: destination-ready 판정은 “라우트 진입 + 목적지 필수 컨텍스트 준비 완료” 동시 만족으로 고정한다.
