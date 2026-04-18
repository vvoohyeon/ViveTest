# Landing Requirements

## 1. Scope & Non-goals

### 1.1 Scope (V1)
**Rule**: V1 구현 범위는 랜딩 카탈로그 UI, 카드 상태 전이(Normal/Expanded), unavailable 계약, 랜딩→목적지 전환 핸드셰이크, 최소 텔레메트리, SSR/Hydration 안정성으로 한정한다.

### 1.2 Non-goals (V1)
**Rule**: 배경 동적 연출, Google Sheets 실연동, 전역 택소노미 전체 구현, 테스트/블로그 본문 고도화는 V1 범위에서 제외한다.

### 1.3 Locked Decisions (V1)
**Rule**: 아래 결정은 V1에서 고정하며, 임의 변경을 금지한다.
- Visual package는 Version B로 고정한다.
- 배경 동적 연출은 강도 `0`/정지 상태로 비활성화한다.
- 카드 tilt 효과는 전면 비활성화한다.

**Verification**:
1. Manual: 배경 동적 연출/tilt가 비활성 상태인지 확인한다.
2. Automated: 시각 회귀 테스트에서 scale/opacity 고정값 위반이 없는지 확인한다.

## 2. Terms & Definitions

| Term | Definition |
|---|---|
| Card Type | 카드 가시성·진입 가능성·consent 연동을 결정하는 5종 분류. `available` \| `unavailable` \| `hide` \| `opt_out` \| `debug`. consent × 카드 타입 전체 매트릭스는 §13.9 참조. |
| Available Card | 카탈로그에 노출. 진입 가능. consent 미선택(default) 또는 Agree All 사용자에게 노출. Disagree All 사용자에게 비노출. |
| Unavailable Card | 카탈로그에 노출. Coming Soon badge 표시. 진입 불가. 직접 URL 접근 시 에러 복구 페이지. consent 상태와 무관하게 노출. |
| Hidden Card | 카탈로그에서 제외. 직접 URL 접근 시 에러 복구 페이지. 운영 목적 임시 비노출 처리에 사용. consent 상태와 무관하게 비노출. |
| Opt-out Card | 카탈로그에 노출. 진입 가능. consent 상태와 무관하게 항상 노출(미선택·Agree·Disagree 공통). 상세 계약은 §13.9 참조. |
| Debug Card | 로컬/QA 환경 전용. production 배포에서는 Hidden Card와 동일하게 처리. |
| Normal | 기본 탐색 상태. CTA 비노출 |
| Expanded | 상세 슬롯 노출 상태. CTA 허용(카드 타입 규칙 적용) |
| Card Shell | 카드 외곽 컨테이너. scale/높이/clip 규칙의 기준 단위 |
| Row Baseline | Expanded 진입 직전 Normal 상태의 같은 row 높이 기준값 |
| Handoff | 카드 A에서 B로 연속 hover/tap 이동하는 전이 경로 |
| Settled | 목표 상태 확정 후 추가 상태 변형이 없는 안정 시점 |
| Hover-capable Mode | `width>=768` + `(hover:hover && pointer:fine)` |
| Tap Mode | `width<768` 또는 hover-capability 미감지 |
| Keyboard Mode | 최근 입력이 `Tab/Shift+Tab` 기반인 상태 |
| Landing Ingress Flag | 랜딩 Test 카드에서 **first scoring question (`scoring1`)**을 pre-answer한 뒤 유입되었음을 나타내는 플래그 |
| Question Index | canonical `questions[]` 기준 1-based 인덱스. telemetry 기준축이며 user-facing `Q1/Q2`와 동일하다고 가정하면 안 된다 |
| User-facing Q Label | scoring question에만 부여되는 `Q1`, `Q2`, ... 표기. canonical index가 아니라 scoring order 기준 |
| Transition Correlation | start/complete/fail/cancel를 묶는 상관키 |

## 3. Conflict Resolution Policy

### 3.1 Priority
**Rule**: 문서 내 충돌 시 우선순위는 다음 순서로 고정한다.
1. Section 4 Global Invariants
2. Section 5 Routing & Layout Contract
3. Section 6~13 기능 계약
4. Section 15 Exception Registry (명시된 예외 범위에 한함)

### 3.2 Single-change Synchronization
**Rule**: 단일 UI 정책 변경은 연관 섹션을 동일 변경셋으로 동시 갱신해야 한다.

**Implementation Notes**:
- title/truncate/wrap 정책 변경 시 Section 6, 8, 9, 14를 동기화한다.
- 전환/핸드셰이크 변경 시 Section 7, 8, 12, 13, 14를 동기화한다.
- 라우팅/locale 정책 변경 시 Section 5, 13, 14를 동기화한다.
- 키보드 포커스/확장/Esc 정책 변경 시 Section 7, 9, 14를 동기화한다.
- 테마/다크모드 정책 변경 시 Section 6, 8, 10, 14를 동기화한다.
- `subtitle -> tags` 기본/보정 간격 정책 변경 시 Section 6.7, 14.2를 동기화한다.
- underfilled 마지막 row 정렬/예외 정책 변경 시 Section 6.2, 14.2를 동기화한다.
- Desktop hover-out collapse 경계/유예 정책 변경 시 Section 8.2, 14.2를 동기화한다.
- Mobile Expanded 내부 title baseline 정책 변경 시 Section 8.5, 14.2를 동기화한다.
- 전환 종료 이벤트(`complete|fail|cancel`) 시점/상호배타/필수필드 변경 시
  Section 8.6, 12.1, 12.2, 13.3, 13.6, 14.2를 동기화한다.
- fail/cancel rollback cleanup set 변경 시 Section 13.3, 13.6, 14.2를 동기화한다.
- missing-slot(tags empty) 정책 변경 시 Section 6.7, 13.1, 14.2를 동기화한다.
- `final_submit` payload 스키마 변경 시 Section 12.2, 12.3, 13.7, 14.2를 동기화한다.
- Desktop settings 열기/닫기/gap 정책 변경 시 Section 6.4, 10.2, 14.2를 동기화한다.
- return restoration(`scrollY`) 정책 변경 시 Section 13.8, 14.2를 동기화한다.
- consent × instruction branch 정책 변경 시 (분기 조건, CTA 레이블, 저장 방식,
  딥링크 케이스 분기 포함) Section §13.5, §13.9, §14.2, req-test.md §3.6을 동기화한다.

### 3.3 Ambiguity Handling
**Rule**: 구현자가 단일 해석을 확정할 수 없으면 릴리스를 멈추고 해당 섹션에 정책 옵션/선택 근거를 추가한 뒤 확정한다.

### 3.3.1 Ambiguity Registry (Release-stop)
**Rule**: 아래 항목은 단일 해석이 보장되지 않으면 릴리스를 중단하고 옵션 비교/선택 근거를 문서에 고정한다.

1. AR-001 Transition Terminal Timing
- Option A: `transition_complete`를 라우팅 호출 직후 허용
- Option B: `transition_complete`를 destination ready(목적지 진입 + 목적지 컨텍스트 확정) 이후에만 허용
- Selected: Option B
- Reason: `start:1 -> terminal:1` 상호배타 종료와 rollback 경계를 동시에 결정적으로 고정한다.

2. AR-002 Empty Tags Slot Policy
- Option A: 빈 chip/placeholder로 1줄 높이를 유지
- Option B: tags container 자체 높이로 1줄 유지, chip은 0개 렌더
- Selected: Option B
- Reason: `빈 chip 강제 렌더 금지(Section 13.1)`와 `tags 슬롯 높이 유지(Section 6.7)`를 동시에 충족한다.

**Verification**:
1. Manual: 모호성 발생 시 Option/Selected/Reason 3요소 기록 여부를 확인한다.
2. Automated: AR 항목 미기록 상태에서 관련 정책 변경이 있으면 문서 게이트를 FAIL 처리한다.

## 4. Global Invariants (Absolute)

### 4.1 Invariant Set
**Rule**: 아래 규칙은 모든 구현에서 동시에 성립해야 한다.
1. 유효 라우트는 항상 `/{locale}` prefix 1회만 가진다.
2. `src/app/layout.tsx`는 top-level 루트 레이아웃이며 `html/body`를 포함한다. request-scoped document `lang` 해석만 예외적으로 허용한다.
3. `src/app/[locale]/layout.tsx`는 locale 검증/i18n 주입 전용 중첩 레이아웃이다. 단, pathname/params/pending transition/consent state를 읽어 overlay mode만 결정하는 runtime-only passive shell/monitor mount는 예외적으로 허용한다.
4. 모든 실제 페이지는 `src/app/[locale]/**` 하위에만 존재한다.
5. Expanded에서 콘텐츠 crop/clip으로 식별 불가 상태를 만들면 안 된다.

**Verification**:
1. Automated: Section 14.2 Detailed QA Matrix(Release Blocking)를 단일 게이트로 사용한다.

## 5. Routing & Layout Contract

### 5.1 Layout Responsibility Split
**Rule**: 루트/locale 레이아웃 책임은 분리 고정한다.
- `src/app/layout.tsx`: 전역 HTML/Body, 전역 스타일, 전역 Provider 골격. locale 검증/i18n 메시지 주입 없이 request-scoped document `lang` 반영만 허용한다.
- `src/app/[locale]/layout.tsx`: locale 파라미터 검증, 메시지 로드, locale 컨텍스트 주입. runtime-only passive shell/monitor는 허용하되 locale 검증, message loading, redirect, route branching, business-content fetching을 수행하면 안 된다.

**Verification**:
1. Manual: 루트 레이아웃이 top-level `html/body` 책임을 유지하고, locale 검증/i18n 메시지 로드를 수행하지 않는지 확인한다.
2. Automated: 파일 트리 규칙 검사 스크립트로 root/locale layout 분리와 root layout의 hard-coded default `lang` 회귀를 검증한다.

### 5.2 Locale Prefix Policy
**Rule**: 최종 URL은 `/{locale}/...` 형식이며 locale 세그먼트는 정확히 1회만 허용한다.

**Implementation Notes**:
- 내부 링크 생성은 locale-free 경로를 기준으로 한다.
- `/{locale}/{locale}/...`는 비정상 URL로 처리한다.

**Verification**:
1. Automated: 링크/라우팅 E2E에서 `/en/en`, `/kr/kr` 패턴 0건을 확인한다.

### 5.3 `proxy.ts` Single Entry + Locale Resolution Policy
**Rule**: V1/V2 i18n 진입점은 기본적으로 `src/proxy.ts` 단일 엔트리로 유지한다.

**Implementation Notes**:
- `/` 요청 처리(V2 고정):
1. 유효한 locale 쿠키가 있으면 해당 locale로 리다이렉트한다.
2. 쿠키가 없거나 무효면 `Accept-Language`를 파싱해 지원 locale 최적 매치를 선택한다.
3. 매치 실패 시 `defaultLocale`로 리다이렉트한다.
- locale 없는 경로 처리(V2 고정): 허용 목록 기반 리다이렉트만 허용한다.
- 허용 목록(locale-less redirect allowlist): `/blog`, `/blog/[variant]`, `/history`, `/test/[variant]`, `/result/[variant]/[type]`
- 허용 목록에 없는 locale-less 경로는 locale 주입 리다이렉트하지 않고 global unmatched 404로 처리한다.
- duplicate locale prefix는 비정상 경로로 분기해 전역 unmatched 404 전략으로 처리한다.
- localized request가 실제 페이지로 통과할 때는 proxy가 request-scoped locale header를 주입해 root document semantics(`html lang`)의 서버 반영 근거를 제공해야 한다.
- `proxy.ts`에는 비즈니스 상태 로직을 넣지 않는다.
- `middleware.ts` 도입이 필요해지면 Section 15 Exception Registry에 사유/리스크/가드레일/검증을 등록한 뒤에만 허용한다.

**Verification**:
1. Automated: proxy 단위 테스트(쿠키 우선/Accept-Language 폴백/기본값 폴백)를 수행한다.
2. Automated: 허용 목록 경로만 locale 주입되고, 비허용 locale-less 경로는 404로 귀결되는지 E2E로 검증한다.

### 5.4 Typed Routes & RouteBuilder
**Rule**: 경로 문자열 수동 결합을 금지하고 typed route helper/RouteBuilder만 사용한다.

**Implementation Notes**:
- RouteBuilder 입력/출력은 locale-free 경로를 기준으로 한다.
- `RouteBuilder.blog()`는 list-only route `/{locale}/blog`를 생성한다.
- `RouteBuilder.blogArticle(variant)`는 canonical article route `/{locale}/blog/{variant}`를 생성한다.
- `/{locale}/blog`는 article 본문이나 selected article panel을 렌더링하지 않는다.
- `/{locale}/blog/{variant}`만 route variant와 일치하는 selected article을 렌더링한다.
- blog detail route에서 invalid variant 또는 non-enterable variant(`hide`, `debug`, `unavailable`)는 다른 글 fallback 없이 localized blog index로 redirect한다.
- blog detail 선택의 source of truth는 route variant뿐이다. pending transition은 overlay/completion/restore 보조 신호로만 사용한다.
- `as Route`, `as never` 같은 우회 캐스팅을 금지한다.

**Verification**:
1. Automated: RouteBuilder 단위 테스트(landing/blog/blogArticle/history/test/result)를 수행한다.
2. Automated: `/blog` index direct entry, `/blog/{variant}` direct entry, detail refresh, 목록 링크 이동, landing CTA 유입, invalid/non-enterable redirect를 각각 검증한다.
3. Automated: ESLint rule 또는 코드 검색으로 금지 패턴을 검사한다.

### 5.5 404 Strategy
**Rule**: 404는 두 층으로 분리한다.
- Segment not-found: `src/app/not-found.tsx`
- Global unmatched route: `src/app/global-not-found.tsx`

**Implementation Notes**:
- segment 내부 도메인 오류는 `notFound()`로 처리한다.
- 라우팅 트리 외부 unmatched는 global-not-found에서 처리한다.
- 전역 unmatched 404의 버전/설정 종속 사항은 Section 15(EX-001)에서만 정의한다.

**Verification**:
1. Manual: 존재하지 않는 locale 포함 경로와 완전 무관 경로를 각각 점검한다.
2. Automated: E2E에서 segment 404와 global unmatched 404가 분리 동작하는지 검증한다.

---

## 6. Information Architecture & Layout

### 6.1 Container & Breakpoints
**Rule**: 레이아웃 기준치는 아래 값으로 고정한다.
- Container max-width: `1280px`
- Side padding: Desktop/Tablet `24px`(좁은 폭 `20px` 허용), Mobile `16px`
- Breakpoints: Mobile `0~767`, Tablet `768~1023`, Desktop `>=1024`

**Verification**:
1. Manual: 360/768/1024/1280 뷰포트에서 padding 및 폭을 확인한다.
2. Automated: visual regression으로 핵심 breakpoint 스냅샷 비교를 수행한다.

### 6.2 Grid Composition
**Rule**: Grid는 breakpoint 별 고정 규칙을 따른다.
- Grid 컬럼 규칙의 source of truth는 `.landing-grid-container`의 **measured grid inline-size**이며, `window.innerWidth - padding` 같은 viewport 기반 추정값으로 판정하면 안 된다.
- Desktop: hero/main 명칭은 유지하되 카드 흐름은 단일 연속 grid로 구성한다. hero/main은 시각 영역 분리가 아니라 row index 기반 규칙으로만 해석한다.
- Desktop/Tablet Wide(`gridInlineSize>=1160`): Row 1은 `3`, Row 2+는 `4` 컬럼을 강제한다.
- Desktop/Tablet Medium(`1040<=gridInlineSize<1160`): Row 1은 `2`, Row 2+는 `3` 컬럼을 강제한다.
- Desktop/Tablet Two-column(`gridInlineSize<1040`): first-row 예외 없이 모든 non-mobile row를 `2` 컬럼으로 고정한다.
- Desktop first-row 예외 구간(Medium/Wide)에서 Row 1 카드가 목표 개수에 미달하면 이후 row 후보를 앞 row로 당겨 채운다.
- Desktop/Tablet: hero/main 경계가 강제 줄바꿈, 빈 track, 빈 카드 공간을 만들면 안 된다.
- Desktop/Tablet 마지막 row가 underfilled(카드 수가 목표 컬럼 수 미만)인 경우에도 row 컬럼 폭은 목표 컬럼 규칙을 유지해야 하며, 카드는 row 시작측 정렬을 유지해야 한다.
- Desktop/Tablet underfilled 마지막 row의 잔여 영역은 위 빈 track/빈 카드 공간 금지 규칙의 허용 예외로 간주한다. 단, 잔여 영역을 해소하기 위한 카드 폭 확장(좌우 채움)은 금지한다.
- Mobile: 1열, vertical gap `14~16px`
- Expanded 활성 중 viewport/gridInlineSize 변경으로 재계산이 필요하면 활성 Expanded를 강제 종료해 Normal settled로 복귀한 뒤 1회만 재계산한다.

**Verification**:
1. Manual: threshold 근처 폭에서 컬럼 전환을 확인한다.
2. Automated: viewport parameterized E2E로 컬럼 수를 검증한다.
3. Automated: Desktop Narrow/Medium/Wide에서 Row 1/Row 2+ 컬럼 규칙이 정확히 적용되는지 검증한다.
4. Automated: hero/main 경계에서 강제 줄바꿈·빈 track·빈 카드 공간 `0건`을 검증한다.
5. Automated: Expanded 활성 중 폭 변경 시 강제 종료→Normal settled→배치 재계산 순서가 보장되는지 검증한다.
6. Automated: Desktop/Tablet underfilled 마지막 row에서 카드 폭 확장(좌우 채움) `0건`과 시작측 정렬 유지 여부를 검증한다.

### 6.3 Hero & Visual Baseline
**Rule**: Hero는 입력 없는 정보 영역이며 outline/border/stroke를 사용하지 않는다.

### 6.4 GNB Contract
**Rule**: GNB는 컨텍스트별 고정 동작을 가지며, 열기/닫기/포커스/스크롤 잠금 규칙을 준수해야 한다.
- 공통: sticky top `0`, z-index `>=1000`, Desktop/Tablet 높이 `64`, Mobile 높이 `56`.
- 공통: 배경은 불투명 또는 반투명+blur를 사용한다.
- 공통: `scrollY > 4px`에서 얕은 shadow를 적용하고, shadow가 없으면 `1px divider`를 적용한다.
- Desktop Landing: 좌측 CI(home), 메뉴(테스트 이력/블로그), 우측 설정 트리거(햄버거 금지).
- Desktop 설정 레이어: 기본 열기 방식은 hover(`>=1024`), 포인터 감지 불가 환경에서는 focus/click fallback 허용.
- Desktop 설정 레이어 닫기: `Esc`, outside click, focus out.
- Desktop 설정 레이어: Tab/Shift+Tab 기반 focus out 닫힘은 즉시 적용한다.
- Desktop 설정 레이어: 트리거와 레이어 사이 hover gap을 금지한다.
- Desktop 설정 레이어: hovered-out 방지용 닫힘 유예 `100~180ms`는 hover 경로에만 허용한다.
- Desktop 설정 레이어: 트리거와 레이어 사이 실효 hover gap은 `0px`여야 한다.
- Desktop 설정 레이어: focus out 닫힘 허용 지연은 `<=1 frame`으로 고정한다.
- Desktop 설정 레이어: `Esc`/outside click/focus out 경로에는 hover 유예를 적용하면 안 된다.
- Mobile Landing: CI + 햄버거, 햄버거는 우측 끝(Mobile `16px` inset) 고정.
- Mobile Landing: fixed overlay + backdrop, backdrop은 메뉴 패널 외 전체 viewport를 dimmed 처리한다.
- Mobile Landing/Blog/History: 햄버거 확장 패널은 solid 표면으로 표시하고, 패널 외부 영역은 불투명 dim backdrop으로 처리한다.
- Mobile Landing/Blog: 햄버거 확장 패널은 GNB를 포함한 페이지 요소보다 상위 레이어에 표시되어야 하며, 상단 클리핑을 금지한다.
- Mobile Landing: body scroll lock을 적용한다.
- Mobile Landing: backdrop 탭으로 닫고, body scroll unlock은 close transition 종료 시점에 수행한다.
- Mobile Landing/Blog/History: 메뉴 확장 상태에서 패널 외부 영역 입력은 `pointer down` 시점에 닫힘을 시작해야 한다.
- Mobile Landing/Blog/History: 위 입력이 스크롤 제스처로 판정되면 닫힘 시작을 취소해야 한다.
- Mobile Landing/Blog/History: 닫힘 transition 진행 중 추가 닫힘 입력은 무시해야 한다.
- Mobile Landing/Blog/History: 닫힘 완료 후 포커스는 햄버거 트리거로 복귀해야 한다.
- Mobile Landing: 최하단 설정 컨트롤은 언어/테마 2개만 허용한다.
- Mobile Test: Back + Timer만 제공하며 instruction/question/result 전 상태에서 동일 구성을 유지한다.
- Mobile Test Back: 우선 `history.back`, 불가 시 `/{locale}`로 fallback.
- Mobile Blog: Back + 햄버거를 사용하고 최하단 설정 컨트롤 규칙은 Landing과 동일하게 적용한다.
- History: Blog와 동일한 GNB 컨텍스트를 사용한다(Desktop/Mobile 공통).
- 언어 변경 위치: Desktop은 설정 레이어 내부만, Mobile은 햄버거 최하단 컨트롤만 허용한다.
- 테마 상태: 최초는 system-follow, 수동 변경 이후 `light|dark`를 localStorage에 고정 저장한다.

**Verification**:
1. Automated: Playwright에서 Desktop hover open/fallback open, Esc/outside/focus out close를 검증한다.
2. Automated: Playwright에서 Mobile overlay/backdrop/scroll lock/unlock 타이밍을 검증한다.
3. Automated: Mobile Test Back의 history fallback 동작을 검증한다.
4. Automated: Desktop 설정 트리거↔레이어 경계 이동에서 hover gap crossing으로 닫힘이 발생하지 않음을 검증한다.
5. Automated: Desktop focus out 닫힘 지연이 `<=1 frame`이며 hover 유예가 적용되지 않음을 검증한다.

### 6.5 Card Slot Order Contract
**Rule**: 슬롯 순서와 존재 규칙은 고정한다.
- Normal 순서: `cardTitle -> cardThumbnail -> cardSubtitle -> tags`
- Expanded 공통 헤더: `cardTitle`만 유지
- Expanded Test에서는 `subtitle/thumbnail/tags`를 제거한다(숨김 아님, 비노출).
- Expanded Blog에서는 `thumbnail/tags`만 제거하고 같은 `subtitle`을 유지한다.
- `cardThumbnail`은 UI slot 이름일 뿐이며, thumbnail asset 결정 입력은 오직 `variant`다.
- fallback thumbnail도 `variant` 기반 규칙 안에서만 결정한다.
- Test Expanded: `previewQuestion`, `answerChoiceA/B`, `meta(3)`
- Test Expanded의 canonical preview consumer shape는 `previewQuestion`, `answerChoiceA`, `answerChoiceB`로 고정한다.
- 현재 단계의 Test Expanded preview source는 Questions direct read가 아니라 fixture inline 기반 **temporary bridge** 일 수 있다. 단, canonical target은 항상 Questions의 **first scoring question (`scoring1`)** 이며 UI는 이를 source detail로 인식하지 않고 resolver가 주입한 landing projection으로만 소비해야 한다.
- preview payload 접근 로직을 랜딩 UI 컴포넌트 내부에 분산시키는 것을 금지한다. raw fixture shape 직접 참조도 금지한다.
- Blog Expanded: `cardSubtitleExpanded(최대 4줄)`, `meta(3)`, `primaryCTA(Read more)`

**Verification**:
1. Manual: Normal/Expanded 전환 시 슬롯 제거/등장 순서를 확인한다.
2. Automated: DOM query 기반 E2E로 슬롯 순서를 검증한다.

### 6.6 Text & Clamp Contract
**Rule**: 텍스트 정책은 아래와 같이 고정한다.
- Desktop/Tablet Normal title: normal inline-size 기준의 wrap-based 1줄 clamp를 적용하고 overflow 시 ellipsis(`...`)를 노출해야 한다.
- Desktop/Tablet Expanded title: ellipsis 없이 전체 title을 표시해야 하며, Expanded의 첫 줄은 widened expanded 폭이 아니라 **Normal title 폭 기준으로 계산한 첫 줄 split 결과**를 그대로 유지해야 한다.
- Desktop/Tablet Expanded title의 나머지 텍스트는 첫 줄 아래에서만 reveal/collapse 되어야 하며, 첫 줄 continuity를 깨는 재래핑을 금지한다.
- Mobile title: Normal/OPENING/OPEN/CLOSING 전 상태에서 전체 title을 표시해야 하며 ellipsis를 적용하면 안 된다.
- Landing Normal subtitle: 최대 2줄까지만 표시하며, overflow 발생 시 ellipsis(`...`)가 반드시 시각 노출되어야 한다.
- Normal subtitle overflow 처리 결과는 동일 카드의 형제 슬롯 기하(썸네일/태그 포함)의 inline-size를 변경하면 안 된다.
- Normal tags 영역: 1줄 슬롯 고정, chip은 1줄 truncate, wrap 금지
- Expanded Test preview/choices: 줄바꿈 허용, truncate 금지
- Expanded Test subtitle: 렌더링하지 않는다.
- Expanded Test answer choices 텍스트는 버튼 내부 좌측 정렬을 강제하며 줄 수 제한 없이 줄바꿈을 허용한다.
- Expanded Test answer choices 텍스트는 truncate/ellipsis/clamp를 금지한다.
- Landing Expanded Blog subtitle: 같은 `subtitle`을 continuity 있게 유지하며 총 4줄까지만 표시한다.
- Blog subtitle은 Normal 2줄 clamp와 Expanded 4줄 clamp가 **같은 source text** 를 재사용해야 한다.
- Blog는 별도 blog 전용 보조 텍스트 소스를 사용하지 않는다.
- blog subtitle은 치환, 요약, 후처리, blog 전용 우회 소스 없이 동일한 `subtitle` 텍스트 하나만 재사용한다.
- 제거된 blog 전용 보조 필드 및 런타임 카드 우회 shape가 blog subtitle source, subtitle continuity 계산, 런타임 카드 계약에 재유입되는 것을 금지한다.
- Expanded meta/CTA: overflow 시 truncate
- 카드 타이포그래피는 동일 locale에서 Normal/Expanded 상태 간 대표 폰트 1종을 유지해야 하며 상태별 폰트 분기를 금지한다.
- 폰트는 `ko`, `en` locale별로 각 1종의 대표 폰트를 허용하고 공통 fallback 체인을 사용한다.

**Verification**:
1. Manual: 긴 텍스트 fixture로 줄바꿈/클램프를 확인한다.
2. Automated: screenshot diff로 clamp 정책 위반 여부를 검증한다.
3. Automated: Desktop/Mobile long-token fixture에서 subtitle overflow 시 ellipsis가 노출되는지 검증한다.
4. Automated: Desktop Expanded Blog subtitle continuity가 lead+overflow 구조를 사용하면서도 Normal subtitle과 동일한 source text를 재사용하는지 검증한다.
5. Automated: subtitle 길이 변화가 Normal 카드의 형제 슬롯 inline-size를 변경하지 않는지 검증한다.
6. Automated: 제거된 blog 전용 보조 필드 및 런타임 카드 우회 shape 재유입이 없는지 회귀 검증한다.

### 6.7 Card Height & Bottom Spacing Contract
**Rule**: 카드 높이/하단 여백/row 안정성은 아래 5개 불변식을 동시에 만족해야 한다.

1) Normal Compactness & Slot Integrity
- Normal은 콘텐츠 기반 compact(auto) + same-row equal-height stretch를 적용한다.
- row stretch를 깨뜨리는 축 정렬 설정을 금지하며, 카드 shell은 row stretch를 수용해야 한다(`min-height: 100%` 또는 동등 규칙).
- Normal 마지막 슬롯은 `tags`로 고정한다.
- `tags` 하단에 동적 spacer/margin/pseudo-element 추가를 금지한다.
- same-row equal-height 보정 잔여 높이는 `tags` 상단에서만 허용한다.
- tags 값이 비어 있어도 `tags` 슬롯 1줄 높이는 유지해야 하며, chip 렌더 개수는 `0`이어야 한다(placeholder/공백 chip/pseudo spacer 금지).

2) Spacing Model (`base_gap + comp_gap`) & Compensation Determinism
- `subtitle -> tags` 구간은 `기본 간격(base_gap) + 보정 간격(comp_gap)` 이원 정책으로 고정한다.
- `base_gap`은 Normal 상태의 `subtitle 하단`과 `tags container 상단` 시각 거리이며, Desktop/Tablet/Mobile 전 구간에서 비-0을 유지해야 한다.
- `base_gap`은 `title -> thumbnail -> subtitle` 기본 수직 리듬과 동일 기준으로 유지해야 한다.
- `comp_gap = actual_gap - base_gap`으로 정의한다.
- `needs_comp(card_i) = (natural_height_i < max(natural_height_row))` 판정식을 고정한다.
- `needs_comp=true` 카드만 `comp_gap>0`을 허용한다.
- `needs_comp=false` 카드의 `comp_gap`은 항상 `0px`여야 하며, 전이 중 단 1프레임이라도 `comp_gap>0`이면 안 된다.
- 동일 row 모든 카드의 natural height가 같으면 해당 row의 모든 카드는 `needs_comp=false` 및 `comp_gap=0`이어야 한다.
- `needs_comp` 판정 규칙은 row index(Row 1/Row 2+)와 무관해야 한다.
- `tags` 상단 보정은 계산된 `comp_gap` 값으로만 허용한다.
- 자동 여백/자동 분배 기반 보정(`margin-top:auto`, `justify-content: space-between`, filler flex, pseudo spacer 및 동등 메커니즘)을 보정 수단으로 사용하면 안 된다.
- Desktop/Tablet Normal settled에서 `needs_comp=false` 카드는 `subtitle -> tags` 구간의 추가 잉여 여백을 가져서는 안 된다(`comp_gap=0`과 동치).

3) Expanded Geometry Isolation (Desktop/Tablet)
- Expanded 높이 정책은 Desktop/Tablet에만 적용하고, Mobile은 full-bleed 규칙을 따른다.
- Desktop/Tablet Expanded는 fixed height를 금지한다.
- Desktop Expanded settled는 시각 최외곽 기준 content-fit이어야 하며 하단 잔여 공간을 허용하지 않는다.
- Desktop Expanded 초장문 콘텐츠는 카드 고정 높이로 수용하지 않고 페이지 스크롤로 수용한다.
- Expanded 상세 슬롯은 same-row non-target 카드의 row track sizing에 영향을 주면 안 된다(geometry isolation 강제).
- Expanded/handoff 활성 중 same-row non-target 카드의 top/bottom/outer height 오차는 snapshot 대비 `0px`여야 한다.
- Row 1에서 성립하는 same-row non-target 안정 규칙은 Desktop/Tablet 모든 row(row 2+)에 동일 적용한다.
- same-row 비확장 카드 하단 추가 빈 공간 생성은 금지한다.
- Expanded 종료 직후 same-row non-target 카드의 높이 잔류 변화는 `0px`여야 하며 row 2+에서도 동일해야 한다.
- same-row non-target 카드의 높이 복귀가 완료되기 전에는 Normal settled 판정을 허용하면 안 된다.

4) Baseline Freeze/Restore State Model (Desktop/Tablet)
- Expanded lifecycle에는 baseline freeze/restore 상태모델을 필수 적용한다.
- baseline 상태 전이는 `BASELINE_READY -> BASELINE_FROZEN -> BASELINE_RESTORE_PENDING -> BASELINE_READY` 순서를 벗어나면 안 된다.
- Expanded/handoff 시작 시 same-row baseline snapshot은 즉시 freeze되어야 하며, 종료 정착 전까지 freeze 해제/재측정을 금지한다.
- snapshot 해제는 Expanded 종료 직후 1회만 허용한다.
- baseline 재측정은 레이아웃 안정 구간에서만 허용한다.
- Expanded 활성/ handoff 정리/instant 종료 처리 중 baseline 재측정을 금지한다.
- Expanded 활성 중 layout 재계산이 필요하면 활성 Expanded를 강제 종료해 Normal settled로 복귀한 뒤에만 baseline/배치를 재측정할 수 있다.
- handoff(row A→B)에서 row A snapshot은 row B settled 직후에만 해제할 수 있다.

5) Visibility & Readability Safety
- 전환 중 동일 카드가 Normal/Expanded로 동시에 보이면 안 된다.
- Expanded 카드가 다른 row 위를 시각적으로 덮는 것은 허용한다.
- 콘텐츠 식별성을 해치는 clipping(`overflow: hidden` 기반 crop 포함)은 금지한다. 단, 동일 가독성을 보장하는 동등 구현은 허용한다.

**Implementation Notes (Prevention Focus)**:
- 반복 재발 원인 1: `tags` 영역에 auto-margin이 상시 적용되면 non-comp 카드에서도 `subtitle -> tags` 구간 잉여 여백이 발생할 수 있다.
- 반복 재발 원인 2: Expanded 상세 슬롯이 row sizing에 참여하면 same-row non-target 카드 높이 동조 및 종료 후 잔류 변화가 발생할 수 있다.
- 위 원인에 해당하는 구현은 본 섹션 Rule의 간격/row 안정성/기하 불변식 항목과 불일치한다.

**Verification**:
1. Automated: Desktop Normal settled에서 same-row 카드 하단 기준선 오차 `0px`를 검증한다.
2. Automated: Desktop/Tablet/Mobile에서 `base_gap>0`과 기본 수직 리듬 기준 일치를 검증한다.
3. Automated: `needs_comp(card_i) = (natural_height_i < max(natural_height_row))` 판정식이 row 1/row 2+ 모두에서 동일하게 적용되는지 검증한다.
4. Automated: `needs_comp=false` 카드의 `comp_gap=0`과 추가 잉여 여백 `0`(전이 프레임 포함)을 검증한다.
5. Automated: 동일 row 자연 높이가 모두 같은 fixture에서 전 카드 `needs_comp=false` 및 `comp_gap=0`을 검증한다.
6. Automated: empty-tags fixture에서 chip 개수 `0`과 tags 슬롯 높이 유지를 동시에 검증한다.
7. Automated: non-comp 카드에서 auto-spacer 패턴(`margin-top:auto`, `space-between`, filler flex, pseudo spacer) 활성 `0건`을 검증한다.
8. Automated: Expanded/handoff 활성 프레임 구간에서 same-row non-target row track size 변화 `0px`를 검증한다.
9. Automated: Expanded/handoff 활성 중 same-row non-target 카드의 top/bottom/outer height 오차 `0px`를 검증한다.
10. Automated: Expanded 종료 직후 same-row non-target 카드 높이 잔류 변화 `0px`(row 1/row 2+)를 검증한다.
11. Automated: baseline 상태 전이가 `BASELINE_READY -> BASELINE_FROZEN -> BASELINE_RESTORE_PENDING -> BASELINE_READY` 순서를 위반하지 않는지 검증한다.
12. Automated: Expanded 활성 중 폭 변경 시 강제 종료 이후에만 재측정/재배치가 수행되는지 검증한다.
13. Automated: handoff(row A→B)에서 row A snapshot 해제가 row B settled 이후에만 발생하는지 검증한다.
14. Automated: Expanded 전환 중 dual-visibility(동일 카드 이중 가시화) `0건`을 검증한다.
15. Automated: 반복 handoff/open-close(최소 100회) 후 same-row non-target 누적 높이 오차 `0px`를 검증한다.

### 6.8 Normal Thumbnail & Expanded Slot Semantics
**Rule**: Normal 썸네일 규격과 Expanded 타입별 슬롯 의미론은 아래 규칙으로 고정한다.
- Normal thumbnail: width `100%`, ratio `6:1`, `object-fit: cover`(왜곡 금지).
- Normal 상태의 슬롯 기하 계약은 subtitle overflow 처리와 독립이어야 하며, 텍스트 처리로 슬롯 간 폭 전파를 허용하지 않는다.
- Expanded에서 제거 대상(`subtitle/thumbnail/tags`)은 시각 숨김이 아니라 미렌더링 또는 접근성 트리 비노출이어야 한다.
- front/back title 불일치를 금지한다.
- Test Expanded `meta`는 3개 고정이며 runtime data key는 `durationM`, `sharedC`, `engagedC`만 사용한다. 표시 라벨만 `예상 시간`, `공유`, `시도`로 분기하며 non-interactive 정보 슬롯으로 렌더링한다.
- Test Expanded는 별도 Start CTA를 허용하지 않는다.
- Test Expanded의 preview/answer CTA는 generic first row가 아니라 canonical preview payload만 사용한다. 해당 payload의 현재 source는 fixture inline temporary bridge일 수 있으나, 다음 단계 Questions **first scoring question** migration 이후에도 consumer shape는 유지되어야 한다.
- Blog Expanded `meta`는 3개 고정이며 runtime data key는 `durationM`, `sharedC`, `engagedC`만 사용한다. 표시 라벨만 `읽기 시간`, `공유`, `조회`로 분기하며 non-interactive 정보 슬롯으로 렌더링한다.
- Blog Expanded `primaryCTA`는 1개 고정(`Read more`, i18n).
- Expanded `meta` 수치값은 축약 표기(`k`/`m` 등)를 금지하고 3자리마다 `,` 구분자를 적용한다.
- 카드에 노출되는 텍스트(제목/부제/질문/선택지/메타 레이블)는 활성 locale에 맞춰 표시해야 하며, locale 값 누락 시 default locale fallback을 적용한다.

**Verification**:
1. Manual: Normal thumbnail 비율/왜곡 여부를 확인한다.
2. Automated: DOM/ARIA 검사로 제거 슬롯 미노출과 CTA 개수 제한을 검증한다.
3. Automated: Expanded 메타 축약 표기(`k`/`m`) `0건`과 3자리 구분자 규칙을 검증한다.
4. Automated: 카드 콘텐츠 locale 전환 및 default locale fallback 동작을 검증한다.

### 6.9 Theme & Dark-mode Coverage
**Rule**: 테마 적용 범위와 다크모드 품질 기준은 아래 규칙으로 고정한다.
- 테마 색상은 고정 색상표가 아니라 의미 토큰(배경/표면/텍스트/경계/상호작용 요소)과 대비 기준으로 정의한다.
- 다크모드는 Landing/Test/Blog/History 모든 사용자 페이지에 일관 적용해야 한다.
- 다크모드는 Normal/Expanded 상태 모두에서 동일하게 적용해야 한다.
- Expanded 다크모드에서는 핵심 요소(카드 컨테이너/본문 텍스트)의 다크 대응을 필수로 적용한다.
- 보조요소(경계선/아이콘/2차 버튼/칩 등)는 다크 팔레트 정합을 권장하며, 릴리스 게이트에서 검증 대상으로 포함한다.

**Verification**:
1. Manual: 핵심 페이지 4종의 light/dark 전환 시 배경/표면/텍스트 일관성을 점검한다.
2. Automated: 페이지×테마 매트릭스에서 핵심 요소/보조요소 모두 검증하며 위반 시 릴리스를 차단한다.

---

## 7. State Model

### 7.1 State Sets
**Rule**: 상태 집합은 아래로 고정한다.
- PageState: `ACTIVE`, `INACTIVE`, `REDUCED_MOTION`, `SENSOR_DENIED`, `TRANSITIONING`
- CardState: `NORMAL`, `EXPANDED`, `FOCUSED`
- Override: `HOVER_LOCK`

### 7.2 Priority
**Rule**: 우선순위는 `INACTIVE > REDUCED_MOTION > TRANSITIONING > EXPANDED > HOVER_LOCK > NORMAL`로 고정한다.

### 7.3 Guard Rules
**Rule**:
- INACTIVE: 입력 기반 카드 반응 중지, HOVER_LOCK 비활성, enter/leave/focus/click/keydown 기반 카드 상태 변경 no-op
- ACTIVE 복귀: 입력 램프업 `120~180ms`(기본 140), 램프업 중 확장/축소/오버레이 변경 금지
- TRANSITIONING: 스크롤/입력 잠금, 시작 프레임 상태 고정, leave/focusout collapse 금지

**Verification**:
1. Automated: 상태 전이 단위 테스트로 guard 조건을 검증한다.
2. Automated: E2E에서 탭 전환 중 입력 차단을 검증한다.
3. Automated: ACTIVE 램프업 구간에서 Expanded/Collapse/Overlay 변형 시작 `0건`을 검증한다.

### 7.4 Determinism
**Rule**: 상태 전이는 입력 순서/이벤트 편차와 무관하게 결정적으로 동일해야 한다.
- 동일 전환 상관키의 중복 실행은 동일 결과를 보장해야 한다.
- 재렌더/재마운트가 발생해도 canonical runtime start와 user-facing scoring label의 관계가 뒤바뀌는 역전을 금지한다.
- `settled`는 시간 기반이 아니라 상태 기반으로 정의한다.
- `settled` 조건: 목표 Card/Page 상태가 확정되고, 동일 사용자 입력 없이 추가 상태 변형(확장/축소/오버레이/레이아웃 변화)이 발생하지 않는 시점.

**Verification**:
1. Automated: 이벤트 순서 역전/지연 시나리오에서 동일 최종 상태를 검증한다.
2. Automated: 재마운트 후 landing pre-answered `scoring1`, runtime start canonical index, user-facing scoring label의 관계가 역전되지 않는지 검증한다.

### 7.5 HOVER_LOCK Contract (Hover-capable only)
**Rule**: HOVER_LOCK은 hover-capable 모드 전용이며 입력 모드 분기와 handoff 안전성 규칙을 따른다.
- 활성 조건: available 카드 Expanded 또는 unavailable 카드 오버레이 활성.
- 비대상 카드: NORMAL 강제, dim/backdrop 금지, opacity `1.0` 고정.
- 비대상 카드: 마우스 입력 기반 반응(`hover/click/pointer`)을 차단한다.
- 키보드 모드 아님: 비대상 카드 `tabIndex=-1`.
- 키보드 모드: Tab 포커스 허용, `Enter/Space` 활성화 차단, `aria-disabled=true`.
- handoff: 직전 카드 이탈 전이는 `0ms` 즉시 종료를 허용하고 최종 대상만 전이를 유지한다.
- handoff 외 종료는 일반 복귀 모션 규칙을 따른다.
- 키보드 모드 진입: `Tab/Shift+Tab` 입력 감지.
- 키보드 모드 종료: `pointermove` 또는 `mousedown` 또는 `wheel` 입력 감지 시 즉시 종료.
- 이벤트 안전성: `relatedTarget` 부재/비-Element/DOM 외부 대상에서도 런타임 예외 없이 동작해야 한다.
- hover enter/leave 이벤트 도착 순서 역전/지연이 있어도 최종 상태는 결정적으로 동일해야 한다.

**Verification**:
1. Automated: `tabIndex`, `aria-disabled`, keydown 차단 규칙을 검증한다.
2. Automated: pointer 입력으로 키보드 모드가 즉시 해제되는지 검증한다.
3. Automated: rapid hover sweep에서 uncaught runtime error `0건`을 검증한다.

### 7.6 Keyboard Sequential Expansion Override (All Viewports)
**Rule**: 카드 키보드 탐색은 아래 순차 규칙을 최우선으로 따른다.
- 본 규칙은 모든 viewport/입력 모드에 적용한다.
- `Tab/Shift+Tab`으로 available 카드에 포커스가 도달하면 해당 카드는 즉시 Expanded가 되어야 한다.
- Expanded 상태에서 다음 `Tab` 입력은 카드 내부의 입력 가능한 요소(테스트 A/B 선택지 또는 블로그 CTA)로 포커스를 이동해야 한다.
- 카드 내부의 입력 가능한 요소를 모두 순회한 뒤 다음 `Tab`을 입력하면 다음 카드로 포커스가 이동해야 한다.
- 카드 간 포커스 이동 시 이전 카드는 `0ms`로 즉시 Normal로 복귀하고, 새로 포커스된 카드는 표준 Expanded 모션 규격으로 전환되어야 한다.
- `Shift+Tab` 역방향 이동도 동일한 규칙(이전 카드 즉시 Expanded, 현재 카드 Normal 복귀)을 따른다.
- Landing 컨텍스트에서는 중립 페이지 상태에서 첫 forward `Tab`이 첫 번째 available 카드로 진입해야 하며, 첫 번째 available 카드 trigger에서 `Shift+Tab`은 마지막 visible GNB control(Desktop settings / Mobile menu)로 복귀해야 한다.
- 위 landing 진입/복귀 규칙은 landing에만 적용하며, Blog/History/Test 컨텍스트의 기본 GNB 순회 규칙은 그대로 유지한다.
- unavailable 카드는 본 override의 Expanded 대상이 아니다.
- 본 규칙은 기존 키보드 관련 카드 전이 규칙을 override한다.

**Verification**:
1. Automated: 카드 간 Tab 이동 시 `Focused -> Expanded` 즉시 전환과 이전 카드 Normal 복귀를 검증한다.
2. Automated: Expanded 카드 내부 포커스 순회(입력 요소 순서) 후 다음 카드로 이동되는지 검증한다.
3. Automated: Shift+Tab 역순 탐색에서 동일 규칙이 성립하는지 검증한다.
4. Automated: 키보드 카드 이동에서 이전 카드 `0ms` 복귀 + 현재 카드 표준 Expanded 모션 분리가 유지되는지 검증한다.
5. Automated: Landing에서 첫 `Tab -> 첫 카드`, 첫 카드 trigger에서 `Shift+Tab -> 마지막 visible GNB control`이 브라우저 간 일관되게 유지되는지 검증한다.

### 7.7 State Conformance Gate
**Rule**:
- PageState/CardState/Override 허용 전이 집합을 벗어나는 전이는 금지한다.
- Section 7.2 우선순위 위반 전이 결과를 금지한다.
- 동일 입력 시퀀스 재실행에서 최종 settled 상태는 항상 동일해야 한다.

**Implementation Notes**:
- 본 게이트는 선언적 상태 규칙을 테스트 가능한 전이 단언으로 고정하기 위한 계약이다.
- 본 게이트 실패는 UI 가시 동작 정상 여부와 무관하게 릴리스를 차단한다.

**Verification**:
1. Automated: 허용/금지 전이 테이블 테스트를 수행한다.
2. Automated: 이벤트 순서 교란/지연 시나리오에서도 동일 최종 settled 상태를 검증한다.

---

## 8. Interaction & Motion Spec

### 8.1 Capability Gate
**Rule**:
- `width<768`: 항상 Tap Mode
- `width>=768` + capability 충족: Hover-capable Mode
- `width>=768` + capability 미충족: Tap Mode
- SSR 초기값은 Tap Mode, mount 후 동기화

**Verification**:
1. Automated: media feature mocking으로 모드 판정을 검증한다.

### 8.2 Desktop/Tablet Expanded Trigger
**Rule**: Desktop/Tablet Expanded 트리거는 지연/취소/handoff 규칙을 모두 준수해야 한다.
- Hover-capable: hover enter 후 `120~200ms`에 Expanded.
- 활성 Expanded 카드의 경계는 확장된 카드의 실제 상호작용 영역 전체로 정의한다.
- hover leave로 위 경계를 완전히 벗어나면 collapse 전이를 수행해야 하며, 다른 카드 hover 여부와 무관하게 동작해야 한다.
- hover leave 기반 collapse는 허용 유예 `100~180ms` 범위 내에서 수행한다.
- handoff는 `다른 enterable 카드(available 또는 opt_out) 진입`에서만 성립한다(unavailable 진입은 handoff로 간주하지 않는다).
- 카드 간 handoff 시 직전 카드의 pending/진행 transition은 즉시 취소하고 마지막 hover 카드만 Expanded로 진입한다.
- handoff(카드 A→B)에서 카드 A는 scale/높이/빈공간 잔류 없이 즉시 Normal 정착해야 하며, same-row 비대상 카드 하단 여백 증가를 금지한다.
- Tap Mode fallback(`width>=768`): tap으로 Expanded 진입, 전환 비주얼 계약은 hover 경로와 동일하다.
- hover intent 스케줄러는 전역 단일 timer + intent token으로 관리한다.
- 새 hover 진입 시 이전 예약을 즉시 취소한다.
- 타이머 실행 직전 `현재 hover 대상 == 예약 대상`을 재검증하고 불일치 시 no-op 처리한다.
- hover leave 기반 collapse 결정은 실행 시점의 최신 경계 판정을 기준으로 수행해야 한다.
- handoff 경로는 지연 없이 즉시 전환한다.

**Verification**:
1. Automated: handoff 시 직전 카드 pending transition 취소 여부를 검증한다.
2. Automated: 마지막 hover 카드만 최종 Expanded인지 검증한다.
3. Automated: Expanded 상태에서 포인터가 비카드 영역으로 이탈할 때(다른 카드 hover 없이) 허용 유예 범위 내 Normal 복귀가 수행되는지 검증한다.
4. Automated: hover intent 스케줄러가 전역 단일 timer + intent token으로 동작하는지 검증한다.
5. Automated: 새 hover 진입 시 이전 예약이 즉시 취소되고, 실행 직전 대상 재검증 불일치 시 no-op 처리되는지 검증한다.
6. Automated: hover leave collapse가 다른 카드 hover 여부와 무관하게 최신 경계 판정으로 수행되는지 검증한다.
7. Automated: unavailable 카드 진입이 handoff로 오인되지 않는지 검증한다.

### 8.3 Core Motion Contract
**Rule**: Expanded core motion은 시간/곡선/단조성/예외 경로를 엄격히 준수해야 한다.
- 본 섹션 시간 범위는 권장이 아니라 검증 대상이다.
- Normal→Expanded: Phase A/B/C 각 `280ms`, C stagger `40/100/160ms`.
- Phase A/B는 전환 시작 프레임에서 시작 가능, Phase C는 상세 블록 활성 이후 시작.
- reveal 항목 순서는 DOM 순서와 일치해야 한다.
- Expanded→Normal은 동일 축/곡선으로 대칭 복귀해야 한다.
- Expanded→Normal 동안 카드 외곽 높이는 non-increasing(단조 감소/정체)이어야 하며 시작 높이를 초과하는 프레임을 금지한다.
- Expanded→Normal 완료 시 카드 높이는 확장 진입 직전 Normal 스냅샷 높이와 `0px` 오차로 일치해야 한다.
- Mobile에서는 전환 중 임시 오차를 허용할 수 있으나, 완료 시점에는 위 복원 규칙을 동일하게 강제한다.
- `0ms` 전이는 handoff의 직전 카드(source) 이탈 경로에서만 허용한다.
- handoff의 target 카드 진입은 표준 Expanded 모션 규격(duration/easing/stagger)을 유지해야 하며 `0ms`를 허용하지 않는다.
- 키보드 카드 이동 handoff에서도 source `0ms` / target 표준 모션 분리 규칙을 동일하게 적용한다.
- 동일 카드 일반 leave/close, 최종 hover 대상 진입, tap 기반 일반 전이에서는 `0ms` 전이를 금지한다.
- HOVER_LOCK 등 보조 잠금 상태는 비대상 반응 차단에만 사용하며 대상 카드 core motion 무효화를 금지한다.
- core motion 진행 중 전이 역전(열림/닫힘의 즉시 반전)으로 인한 플리커를 금지한다.
- easing은 `ease-in-out` 계열로 통일한다.
- spring/overshoot(탄성 튐)를 금지한다.
- Expanded 전환/유지 중 alpha(투명도) 애니메이션을 금지한다.
- 내부 이중 박스 시각을 금지한다.
- 정적 외곽 카드 + 내부 콘텐츠만 scale 구조를 금지한다.
- Desktop/Mobile 공통 duration/easing/stagger는 단일 규격으로 관리한다.

**Verification**:
1. Automated: Phase 순서/시간/stagger를 타임라인 단언으로 검증한다.
2. Automated: Expanded→Normal non-increasing 위반 프레임 `0건`을 검증한다.
3. Automated: same-card leave에서 `0ms` 강제 종료가 발생하지 않는지 검증한다.
4. Automated: Desktop/Mobile 반복 토글에서 Expanded→Normal 완료 높이 복원 오차 `0px`를 검증한다.
5. Automated: pointer/keyboard handoff 모두에서 source `0ms` / target 표준 모션 분리를 검증한다.

### 8.4 Expanded Shell Scale and Readability
**Rule**:
- Desktop/Tablet Expanded 콘텐츠 scale은 reduced-motion을 제외한 모든 경로에서 `1.04`로 고정해야 한다.
- `desktop-wide`, `desktop-medium` 레이아웃의 row 1+ 카드는 콘텐츠 scale을 키우지 않고, 카드 외곽의 **최종 가로폭만** `1.10x`가 되도록 확장해야 한다.
- row 0 카드와 `two-column` 레이아웃 카드는 외곽 가로폭도 `1.04x`를 유지해야 한다.
- row 1+ 예외는 `expanded shell frame`의 pre-transform width/offset으로 처리해야 하며, shadow/surface/body가 함께 넓어져야 한다.
- widened lower-row 카드의 visible title/meta/CTA inset은 row 0 Expanded 기준과 `<=1px` 오차로 일치해야 하며, inner counter-scale 또는 surface/body 단독 width 조정을 금지한다.
- Mobile은 기존 full-bleed 모바일 전개 규칙을 유지하며, 위 desktop/tablet width-only 예외를 적용하지 않는다.
- 내부 콘텐츠만 확대하는 구현 금지
- Expanded 전 구간(진입/유지/해제)에서 title/body/CTA/meta crop 0건
- transform-origin 판정은 Expanded 시작 시점의 settled row 경계를 기준으로 수행해야 한다.
- transform-origin: 해당 row의 첫 카드 `0% 0%`, 마지막 카드 `100% 0%`, 그 외 `50% 0%`.
- row에 카드가 1개인 경우 해당 카드는 row 첫 카드로 간주해 `0% 0%`를 적용한다.
- row 경계 판정에 고정 인덱스(예: 특정 순번 카드)를 사용하면 안 된다.
- Expanded 카드 opacity는 항상 `1.0`
- Desktop/Tablet에서 Expanded 카드는 GNB와 Settings 레이어를 제외한 카드 레이어 중 최상위여야 하며, 인접 카드에 의해 가려지면 안 된다.
- 다중 Expanded는 금지하며, 활성 Expanded 카드는 항상 1개여야 한다.

**Verification**:
1. Automated: 스크린샷 기반으로 shell 스케일 적용과 crop 0건을 검증한다.
2. Automated: Desktop/Tablet에서 인접 카드 가림 현상 `0건`과 Expanded hit-target 우선순위를 검증한다.
3. Automated: Desktop/Tablet의 Wide/Medium/Narrow 및 hero/main 연속 배치에서 row-edge transform-origin 판정 정확성을 검증한다.
4. Automated: row 단일 카드 케이스에서 transform-origin `0% 0%` 적용을 검증한다.

### 8.5 Mobile Expanded (`width<768`)
**Rule**: Mobile Expanded는 in-flow full-bleed와 닫기/스크롤/레이어 규칙을 준수해야 한다.
- 탭한 해당 카드만 Expanded로 진입한다.
- Mobile Expanded lifecycle은 `OPENING -> OPEN -> CLOSING -> NORMAL` 단방향으로 고정한다.
- 단일 pointer/touch 시퀀스에서 동일 카드 상태 전이는 최대 1회만 허용한다.
- collapsed 카드의 유효 탭으로 OPENING이 시작된 동일 시퀀스에서 즉시 CLOSING으로 역전되는 전이를 금지한다.
- Expanded는 in-flow 위치를 유지하며 top jump를 금지한다.
- OPENING/CLOSING transition window 동안 활성 카드 상단 y-anchor(뷰포트 기준)는 편차 없이 유지되어야 한다.
- Expanded 헤더는 `title + X` 구조를 유지한다.
- 헤더(`title + X`)는 카드 최상단 첫 행에 위치해야 한다.
- title은 줄바꿈 허용, truncate/ellipsis 금지, top align 유지.
- Mobile Expanded settled에서 title 시작 기준선은 Expanded 진입 직전 Normal 상태와 `0px` 오차로 일치해야 한다.
- X 버튼은 아이콘 `X` 단일 표현으로 고정하며 헤더 우측 끝에 sticky로 유지한다.
- X 버튼은 OPENING 시작 시점부터 CLOSING 종료 직전까지 항상 시각 노출되어야 한다.
- CLOSING 동안 X 버튼은 시각적으로 유지하되 비활성 상태여야 한다.
- 닫기 경로는 `X 버튼` 또는 `카드 외부(backdrop) 탭`만 허용한다.
- 닫힘 후 Expanded 직전 카드 형상/높이/타이틀 연속성으로 자연 복귀해야 하며, Expanded 중 사용자가 이동한 현재 page scroll 위치는 유지해야 한다.
- Expanded 진입 직전 Normal 카드 외곽 높이 snapshot을 기록하고, 닫힘 완료 시 해당 snapshot 높이로 `0px` 오차 복귀를 강제한다.
- 모바일 높이 복원 기준은 항상 진입 직전 snapshot으로 고정하며, 전이 중 콘텐츠 변화가 있어도 복원 기준 snapshot 교체를 금지한다.
- Mobile Expanded 시퀀스당 pre-open snapshot은 정확히 1개만 생성해야 하며 시퀀스 중 재기록을 금지한다.
- `NORMAL` terminal 확정은 pre-open snapshot 높이로의 복귀 완료(`0px` 오차) 이후에만 허용한다.
- 카드 폭은 `100vw`로 확장하고 컨테이너 패딩을 상쇄한다.
- 전환 `220~360ms`(기준 `280ms`), spring/overshoot 금지.
- Normal 카드에서 Expanded 카드로의 전환은 동일 카드의 연속 전이로 지각되어야 하며, 분리된 별도 카드가 돌출되는 듯한 강한 불연속 전이를 금지한다.
- 모바일 외곽 컨테이너 높이 전이는 content-fit 목표 높이까지 monotonic(증가/감소)이어야 하며 overshoot를 금지한다.
- content-fit 높이 계산은 런타임 실측(`from px -> to px -> auto`) 또는 동등 정확도 방식으로 수행한다.
- Expanded 내부 콘텐츠 스크롤은 body에서 허용하며, OPEN settled 이후에는 page scroll도 함께 허용한다.
- 콘텐츠가 viewport를 넘지 않으면 내부 스크롤이 없어야 한다.
- 자동 viewport 보정 스크롤을 금지한다.
- OPENING/CLOSING transition window 동안 page scroll lock을 적용하고, OPEN settled에서는 unlock을 유지한다.
- 다른 카드 상호작용을 비활성화한다.
- unavailable 카드는 Expanded 진입/닫기 토글 대상이 아니다.
- OPENING 중 유효 닫기 입력(X/outside)은 OPEN settled 직후 1회 queue-close로 처리한다.
- CLOSING 중 추가 open/close 입력은 무시한다.
- 레이어 순서는 `GNB > Expanded 카드 > backdrop > 기타 카드`로 고정한다.
- backdrop은 Expanded 카드를 덮으면 안 된다.
- dim 처리는 Expanded 외부 영역에만 적용한다.
- X 버튼은 backdrop보다 상위 레이어에 위치하고 항상 클릭 가능해야 한다.
- Mobile Expanded settled 상태에서 활성 카드 본체 위 dim/tint는 `0%`여야 한다.
- Mobile Expanded 내부 상호작용 우선순위는 `CTA(응답 A/B, Read more) > X 버튼 > 카드 외부 영역`으로 고정한다.
- Mobile Expanded 내부 비-CTA 영역 탭은 no-op이어야 하며, 닫기/전환을 유발하면 안 된다.
- Mobile tap 판정은 보수적으로 처리하며, 미세 이동이 감지된 입력은 scroll gesture로 분류해 카드 open/close 전이를 시작하면 안 된다.
- 위 y-anchor 규칙은 transition window 기준으로 카드 인덱스/스크롤 위치/콘텐츠 길이에 따른 예외를 허용하지 않는다.

**Verification**:
1. Automated: 모바일에서 닫기 경로(X/backdrop)와 자연 복귀를 검증한다.
2. Automated: content-fit 높이 전이 overshoot `0건`을 검증한다.
3. Automated: 내부 스크롤 영역이 body로 제한되는지 검증한다.
4. Automated: z-index/포인터 타깃 검증으로 모바일 레이어 순서를 확인한다.
5. Automated: Mobile Expanded settled 상태에서 활성 카드 본체 dim/tint `0%`를 검증한다.
6. Automated: 모바일 CTA 우선순위(`CTA > X > outside`) 및 내부 non-CTA no-op를 검증한다.
7. Automated: Mobile Expanded settled에서 title 시작 기준선 편차 `0px`를 검증한다.
8. Automated: 단일 pointer/touch sequence당 상태 전이가 최대 1회인지 검증한다.
9. Automated: OPENING 중 닫기 입력이 OPEN settled 직후 queue-close 1회로만 처리되는지 검증한다.
10. Automated: CLOSING 중 추가 open/close 입력이 무시되는지 검증한다.
11. Automated: OPENING/CLOSING transition window에서 page scroll lock 유지, OPEN settled unlock, 종료 후 현재 scroll 위치 유지 여부를 검증한다.
12. Automated: OPENING/CLOSING transition window에서 y-anchor drift `0px`를 검증한다.
13. Automated: 모바일 CTA 우선순위 경합 상황에서 `CTA > X > outside` 순서로 귀결되는지 검증한다.
14. Automated: 시퀀스당 snapshot 1회 생성/재기록 금지와 `NORMAL` terminal의 높이 복귀 완료 선행 조건을 검증한다.
15. Automated: 모바일 반복 open-close에서 누적 높이 오차 `0px`를 검증한다.

### 8.6 Transition Start Trigger (Landing→Destination)
**Rule**: 라우팅 전환 시작은 Expanded의 유효 CTA 활성화 시점에만 허용한다.
- Test: answerChoiceA/B
- Blog: Read more
- Blog CTA 전환은 선택된 article 식별자를 목적지로 전달해야 하며, 목적지는 해당 식별자 기준으로 콘텐츠 컨텍스트를 결정해야 한다.
- article 식별자 누락/무효 시에는 문서에 정의된 안전 fallback으로 처리해야 한다.
- Mobile에서도 CTA 입력(마우스 클릭/터치 탭)은 닫기 동작보다 우선하며 반드시 `transition_start`로 귀결되어야 한다.
- 본 섹션의 전환 시작 규칙은 Section 13.3/13.6의 fail/cancel/rollback 계약을 변경하지 않는다.
- **Test 페이지 destination-ready 해석**: `/test/{variant}` 진입 시 destination-ready는 variant 유효성 검증 완료 + Runtime Entry Commit 준비 완료를 동시에 만족하는 시점이다 (Test Flow Requirements §2.4 참조).

---

## 9. Accessibility Requirements

### 9.1 Keyboard & Focus
**Rule**:
- 모든 상호작용 요소는 키보드 도달 가능해야 한다(단, HOVER_LOCK 가드 예외 적용).
- focus ring은 명확히 보여야 한다.
- 카드 탐색 포커스의 시각 경계는 Card Shell 외곽과 일치해야 하며, 카드 내부 일부 영역만 감싸는 표시를 금지한다.
- `Esc` 입력 시에는 최상위 오버레이/패널을 먼저 닫고, 그 다음 카드의 Focus/Expanded 상태를 해제해 포커스 없는 browse-neutral 상태로 복귀해야 한다.
- Mobile hamburger/desktop settings/back/X 버튼은 `aria-label` 필수다.

### 9.2 Disabled Semantics
**Rule**:
- CTA/클릭 가능한 컨트롤은 기본적으로 시맨틱 요소(`<button>`, `<a>`)를 사용한다.
- 카드 확장/진입을 유발하는 1차 트리거는 반드시 시맨틱 컨트롤(`<button>`, `<a>`)이어야 한다.
- 비시맨틱 컨테이너 단독 활성화 트리거를 금지한다.
- unavailable Test 카드의 진입 불가는 시맨틱으로 표현해야 한다.
- `<button>` 기반 진입 컨트롤은 `disabled`를 우선 사용한다.
- 포커스는 허용하되 활성만 차단해야 하는 경우에만 `aria-disabled="true"`를 사용한다.
- `aria-disabled="true"` 대상은 click/keydown(`Enter/Space`)에서 기본 동작을 차단해야 한다.
- HOVER_LOCK 키보드 모드 비대상 카드의 활성 차단은 위 `aria-disabled` 규칙을 따른다.
- `role="button"` 대체 구현은 금지하며, 불가피한 경우 Section 15 Exception Registry 등록 후에만 허용한다.

### 9.3 Overlay Readability
**Rule**:
- Coming Soon 오버레이는 텍스트 가독성을 보장해야 하며 원본 카드 정보를 완전히 차단하면 안 된다.
- 포커스 표시가 오버레이에서 소실되면 안 된다.
- 오버레이가 활성화되어도 키보드 포커스 링(또는 동등한 focus 스타일)은 시각적으로 식별 가능해야 한다.
- 오버레이 활성 상태에서도 `cardTitle`은 항상 식별 가능해야 한다.

**Verification**:
1. Manual: 키보드-only 탐색으로 focus 이동/활성화 차단을 확인한다.
2. Automated: axe-core + Playwright 키보드 시나리오를 수행한다.
3. Automated: 오버레이 활성 상태에서 포커스 스타일과 `cardTitle` 식별 가능 여부를 스크린샷 검증한다.
4. Automated: 카드 확장/진입 1차 트리거가 시맨틱 요소로만 구성되는지 DOM 감사로 검증한다.

---

## 10. Responsive Requirements

### 10.2 GNB by Context
**Rule**: GNB 컨텍스트 규칙은 Section 6.4를 단일 소스로 따른다(중복 정의 금지).

---

## 11. Performance Constraints

### 11.1 SSR/Hydration Determinism
**Rule**: 초기 렌더 결정성과 hydration 무경고를 강제한다.
- 초기 렌더 경로에서 `window`, `localStorage`, `sessionStorage` 분기를 금지한다.
- 초기 렌더 경로에서 `Date.now`, `Math.random`, 비결정 시간값 분기를 금지한다.
- 위 금지는 `useState initializer`, `provider default`, `context init`에도 동일 적용한다.
- 중립 초기 상태를 사용해야 한다(예: consent `UNKNOWN`, interaction mode는 SSR neutral 값).
- `useSearchParams()`를 사용하는 Client Component는 반드시 가장 가까운 위치에 Suspense 경계를 둬야 한다.
- 위 조건을 충족하지 않아 정적 렌더링 구간이 CSR bailout 되는 구성을 허용하지 않는다.
- root layout의 request-scoped document `lang` 해석은 proxy가 주입한 locale header만을 입력으로 사용할 때에 한해 허용한다.
- hydration warning 1건이라도 발생하면 릴리스를 차단한다.
- hydration warning `0건`은 자동화 로그로 증명해야 하며 수동 확인만으로 PASS 처리하면 안 된다.

**Verification**:
1. Automated: build/preview 실행 로그에서 hydration warning `0건`을 수집한다.
2. Automated: 초기 렌더 금지 API 사용 정적 분석(rule or grep gate)을 수행한다.

### 11.2 Animation Guardrails
**Rule**:
- Expanded 관련 모션은 transform/opacity 중심으로 구성한다.
- 비확장 row 재계산 유발 구현을 금지한다.
- rapid hover/tap 반복에서도 런타임 예외 0건이어야 한다.

### 11.3 Reduced Motion / Low-spec
**Rule**:
- `prefers-reduced-motion`에서 대형 이동을 금지하고 `150~220ms` 단순 전환으로 축소한다.
- 저사양 fallback은 시각 효과보다 상태 일관성을 우선한다.

### 11.4 Cursor Policy
**Rule**:
- 커스텀 커서 금지
- available 카드/CTA에만 pointer
- unavailable 카드는 기본 커서 유지

---

## 12. Telemetry / Logging Contract

### 12.1 Logging Scope & V1 Event Set
**Rule**: V1은 최소 이벤트셋만 수집하며 비필수 상호작용 로그를 수집하지 않는다.
- 목적: 랜딩→진입 안정성 + 테스트 시도/제출 최소 지표.
- 클라이언트 텔레메트리 네트워크 전송은 `consent_state=OPTED_IN`에서만 허용한다.
- `OPTED_OUT/UNKNOWN`에서는 클라이언트 이벤트를 로컬 큐에 보관할 수 있으나 네트워크 전송은 금지한다.
- V1 필수 이벤트:
  - `landing_view`: 1회.
  - `card_answered`: 1회. 랜딩 카드 A/B 선택 시점에 발화하며, 랜딩 ingress 경로에서만 발생한다. 직접 진입 경로에서는 발화하지 않는다. 이 이벤트는 landing phase에서 기록된 `scoring1` 응답을 대표한다.
  - `attempt_start`: 1회. instruction 이후 **첫 runtime question render 시점**에 발화한다. ingress 경로에서는 landing에서 pre-answered `scoring1`을 건너뛴 뒤 첫 runtime question이 기준이다.
  - `final_submit`: 1회.
- `transition_start`, `transition_complete`, `transition_fail`, `transition_cancel`은 내부 시스템 신호로만 유지하며 텔레메트리 전송 대상에서 제외한다. `card_answered`는 사용자 행위 기반 이벤트이며 위 내부 신호와 독립적으로 동작한다.
- 기본 미수집: `scroll`, `hover`, `expanded/tap 토글`, `tilt/조명 상호작용`, `unavailable hover/tap 시도`.
- test runtime의 `question_answered`는 landing에서 pre-answered된 `scoring1`을 재발화하지 않는다. landing phase의 `card_answered`와 runtime phase의 `question_answered`는 역할이 다르다.

### 12.2 Required Fields per Telemetry Event
**Rule**: 텔레메트리 이벤트별 필수 필드는 아래와 같이 고정한다.
- 공통 필수 필드(모든 전송 이벤트): `event_id`, `session_id`, `ts_ms(UTC)`, `locale`, `route`, `consent_state`.
- `card_answered` 추가 필수 필드: `source_variant`, `target_route`, `landing_ingress_flag`.
  - `source_variant`는 선택이 발생한 카드의 식별자다.
  - `target_route`는 진입 예정 테스트 variant 경로다.
  - `landing_ingress_flag`는 `true`로 고정한다.
- `attempt_start` 추가 필수 필드: `landing_ingress_flag`, `question_index_1based`.
  - `question_index_1based`는 UI `Qn`이 아니라 **canonical index**다.
  - ingress 경로: `landing_ingress_flag=true`, `question_index_1based`는 첫 runtime question의 canonical index (`q.1`이 있으면 `1`, 없으면 `scoring2`의 canonical index).
  - 직접 진입 경로: `landing_ingress_flag=false`, `question_index_1based`는 첫 runtime question의 canonical index (`q.1`이 있으면 `1`, 없으면 `scoring1`의 canonical index).
- `final_submit` 필수 필드: `variant`, `question_index_1based`, `dwell_ms_accumulated`, `landing_ingress_flag`, `final_responses`.
- `final_responses`는 canonical 전체 문항(profile 포함)의 응답 맵이다. 진입 경로(ingress/직접 진입)와 무관하게 동일한 구조를 유지한다. `scoring1` 재수정이 발생한 경우 최종 제출 시점의 값을 반영한다.
- `landing_ingress_flag`는 진입 경로를 나타내며, 테스트 중 `scoring1`을 재수정하더라도 ingress 경로로 진입한 세션은 항상 `true`를 유지한다. `scoring1` 재수정 여부는 이 플래그의 값에 영향을 주지 않는다.
- 상관키 생성 실패 시 세션 카운터 기반 대체키를 허용한다.
- `transition_id`, `result_reason` 필드는 내부 시스템 로직 전용이며 텔레메트리 payload에 포함하지 않는다.

> **강조 주석**:
> `question_index_1based`는 telemetry canonical index다.
> profile question이 존재하면 user-facing `Q1/Q2`와 일치하지 않을 수 있다.
> 랜딩 문서에서 `Q1` 표현이 필요할 때는 기본적으로 first scoring question을 뜻한다.

### 12.3 Payload Boundaries
**Rule**: 텔레메트리 payload는 의미 코드 중심으로 제한한다.
- 금지: 원문 질문/답변 텍스트, 자유입력 텍스트, PII/지문성 식별자(IP, fingerprint).
- 응답은 의미 코드만 기록한다.
- question index는 canonical `questions[]` 기준 1-based다.
- `final_submit` 필수 필드: `variant`, `question_index_1based`, `dwell_ms_accumulated`, `landing_ingress_flag`, `final_responses`.
- `final_submit`에는 최종 응답 + 문항별 누적 체류시간을 기록한다.
- `landing_ingress_flag`는 진입 경로 기준이며 `scoring1` 재수정으로 변경되지 않는다. ingress 경로 세션은 제출 시점까지 `true`를 유지한다.
- `final_responses`는 canonical 전체 문항의 의미 코드 맵이어야 하며, 원문 질문/답변 텍스트를 포함하면 안 된다. 진입 경로와 무관하게 동일한 구조를 유지한다. `scoring1` 재수정이 발생한 경우 최종 제출 시점의 값을 반영한다.
- `final_submit`의 `question_index_1based`는 최종 answered canonical index여야 한다.

### 12.4 Consent State Machine
**Rule**: consent는 `UNKNOWN -> OPTED_IN | OPTED_OUT` 상태 머신으로 관리한다.
- SSR/초기 렌더는 `UNKNOWN` 고정.
- mount 후 저장소 동기화는 1회만 수행한다.
- `UNKNOWN` 구간 이벤트는 유예 큐에 저장할 수 있으나 전송은 금지한다.
- `OPTED_IN` 확정 시에만 유예 이벤트 전송을 허용한다.
- `OPTED_OUT` 확정 시 유예 이벤트를 폐기한다.
- 옵트아웃 즉시 익명 식별자/연결키를 무효화하고 전송을 차단한다.

### 12.5 Anonymous ID Policy
**Rule**: 익명 ID는 비식별/안전 생성 원칙을 따른다.
- 동일 브라우저/동일 기기 범위 일관성만 요구한다.
- 생성 우선순위: `randomUUID -> getRandomValues`.
- 위 2개가 모두 불가한 환경에서는 `session_id`를 생성하지 않는다.
- `time+rand+counter` 기반 폴백은 금지한다.
- 랜덤 소스 불가 환경은 `consent_state=OPTED_OUT` 또는 `UNKNOWN` 상태에서 클라이언트 전송을 금지한다.

### 12.6 Data Source Contract
**Rule**: 랜딩 구현은 generated runtime registry + adapter/resolver 경계를 사용한다. 전체 source topology SSOT는 `docs/req-test.md` §2가 소유한다.
- 현재 구현 단계에서는 fixture-backed registry를 사용할 수 있으나, 이것이 active source topology 자체를 정의하지는 않는다.
- source fixture shape와 exported runtime registry shape는 명시적으로 분리해야 한다. source 전용 `seq`와 temporary inline preview bridge는 runtime landing card payload로 전파되면 안 된다.
- landing / test / blog consumer는 raw fixture shape를 직접 읽지 않는다. preview payload는 `resolveTestPreviewPayload()` 같은 단일 resolver/adapter 경계로만 주입해야 하며, 접근 로직을 UI 컴포넌트 안에 분산시키는 것을 금지한다.
- 배열 순서 계약은 `seq -> sort -> drop`으로 고정한다. `seq`는 source 입력에서만 허용되며, exported runtime registry에는 남아 있으면 안 된다. 누락/중복 `seq`는 fixture validation fail로 처리한다.
- landing preview는 항상 first scoring question(`scoring1`) 기준이다. profile 문항은 landing preview에 사용하지 않는다.
- landing 단계에서는 profile 문항을 묻지 않는다. landing이 수집하는 입력은 `scoring1` preview 기반 A/B 선택뿐이다.
- landing 단계에서는 preview 선택값을 durable staged entry로 저장할 수 있으나, canonical question index binding은 test runtime commit 시점의 책임이다.
- same-variant landing 재선택은 restart intent 의미를 가진다. old run replace 시점과 auto-presentation 세부 규칙은 `docs/req-test.md`가 소유한다.
- 랜딩 fixture 최소: Test `4+`, Blog `3+`, unavailable Test `2+`, unavailable Blog `0`.
- fixture 다양성 케이스 필수: 긴 텍스트, 빈 tags, debug fixture.
- fixture에서 required 슬롯 누락은 금지한다.
- 런타임 adapter는 required 누락에서 throw하지 않고 normalize + default 삽입으로 방어해야 한다.

**Verification**:
1. Automated: payload schema/금지필드 검사 테스트를 수행한다.
2. Automated: transition correlation 상호배타/중복 방지 테스트를 수행한다.
3. Automated: fixture 최소 개수/다양성/required 누락 금지 테스트를 수행한다.

---

## 13. Error / Empty / Not-Found Handling

### 13.1 Missing Slot Handling
**Rule**:
- required 슬롯 누락 시 영역 제거 금지, 빈값으로 레이아웃 유지
- tags 값이 비어 있어도 tags 슬롯 1줄 높이는 유지해야 한다.
- tags 값이 비어 있는 경우 chip 렌더 개수는 `0`이어야 한다.
- 빈 chip 강제 렌더 및 placeholder/공백문자 chip 렌더를 금지한다.

### 13.2 Unavailable Card UX
**Rule**: unavailable Test 카드는 진입 차단 + Coming Soon 표시를 적용한다.
- unavailable Blog 카드는 존재하면 안 된다.
- unavailable Test 카드는 Expanded/CTA/전환을 허용하지 않는다.
- Hover-capable 모드에서는 hover/focus 시에만 오버레이 노출
- Tap Mode에서는 오버레이 상시 노출

**Adapter 레이어 책임 (Landing-side 계약)**:
- `unavailable` 판정의 단일 소스는 generated runtime registry(`variant-registry.generated.ts`)의 `attribute` 필드다. `unavailable: boolean` 레거시 필드는 `attribute: 'unavailable'`으로 해석한다 (req-test.md §2.5 레거시 호환 기준).
- `loadVariantRegistry()`가 canonical registry를 로드하고, `resolveLandingCatalog()`가 각 카드의 `attribute`를 반영해 카탈로그를 구성한다. 렌더링/상호작용 레이어는 이 값을 런타임 재검증 없이 그대로 사용해 Coming Soon 표시와 진입 차단을 수행한다.
- 직접 URL 접근(딥링크)을 통한 unavailable variant 진입 차단은 Test Flow Requirements §2.5 / §6.1 계약이 담당한다. 이 섹션의 계약과 중복되지 않는다.

### 13.3 Landing→Destination Handshake
**Rule**: 전환 잠금과 GNB 교체 시점은 아래 규칙으로 고정한다.
- 전환 시작 즉시 `TRANSITIONING`으로 진입한다.
- 시작 프레임의 카드 시각 상태를 고정한다.
- 전환 중 상태 되돌림을 금지한다.
- 전환 중 다른 카드 상호작용을 금지한다.
- source GNB는 목적지 진입 완료 전까지 유지한다.
- destination GNB는 목적지 진입 완료 시점에 1회 교체한다.
- `transition_complete`는 destination ready 이전에 발생하면 안 된다.
- 전환 종료 이벤트는 `complete|fail|cancel` 중 정확히 1회만 발생해야 한다.
- 실패/취소 시 pre-answer 및 pending 상태를 롤백해야 한다.
- 실패/취소 cleanup set은 pre-answer, ingress flag, pending transition/state, interaction lock, body lock, queued close 상태를 모두 포함해야 하며 부분 정리를 금지한다.
- fail/cancel/rollback 계약은 모바일 CTA 우선순위 보완 여부와 무관하게 항상 동일하게 유지해야 한다.
- `transition_complete`, `transition_fail`, `transition_cancel`은 내부 시스템 신호로 rollback 경계 및 GNB 교체 시점을 결정한다. 텔레메트리 전송 대상이 아니다.

### 13.4 Test `scoring1` Pre-answer & Instruction Start Rule
**Rule**: `scoring1` pre-answer와 시작 문항 결정은 ingress flag 기준으로만 판단한다.
- 본 계약은 Test 카드에만 적용하며 Blog 카드에는 적용하지 않는다.
- Test 카드 Expanded에서 A/B 선택 시:
1. 선택값을 `scoring1` provisional pre-answer로 **즉시 durable staged entry**에 저장
2. `variant + session` 단위 landing ingress flag 기록
3. `createdAtMs`를 함께 기록
3. `/test/[variant]` 진입
- landing ingress flag 존재 시 instruction seen 여부와 무관하게 landing이 미리 답한 문항은 항상 `scoring1`이다.
- landing 단계에서는 이 provisional pre-answer를 아직 canonical question index에 bind하지 않는다.
- landing ingress runtime은 `q.1`이 존재하면 `q.1`부터, 없으면 `scoring2`부터 시작한다.
- landing ingress flag 부재 시 direct runtime은 `q.1`이 존재하면 `q.1`부터, 없으면 `scoring1`부터 시작한다.
- profile question이 존재하면 runtime에서는 `scoring1` 다음에 `q.*`가 먼저 노출될 수 있으며, landing ingress 이후 자동 제시는 unanswered profile → unanswered scoring 순서를 따른다.
- landing에서 seed된 `scoring1`은 revisitable이지만 auto-present 대상이 아니어야 한다.
- 동일 variant 재진입에서 instruction이 생략되는 경우:
1. ingress flag 존재 시 즉시 시작 + landing ingress runtime start 규칙 적용
2. ingress flag 부재 시 direct runtime start 규칙 적용
- same-variant landing 재선택은 항상 restart intent다.
- old active run replace는 commit success 시점에만 발생한다.
- 사용자는 테스트 중 `scoring1`을 재수정할 수 있다.
- staged entry 만료(A/B 선택 시점으로부터 7분 경과)와 commit-failure UX는 다음 Phase(Test Flow Requirements) 범위다.
- 이번 Phase에서는 ingress save/read/consume/rollback 계약만 release-blocking으로 유지한다.

### 13.5 Instruction Contract

**Rule**: instruction 노출·분기·CTA 규칙을 아래와 같이 고정한다.

#### 레이아웃 불변식

- Desktop: centered card overlay. Mobile: full-screen overlay.
- instruction overlay 활성 중 하위 입력 차단.
- instructionSeen은 variant 단위로 저장한다.

#### 표시 구성 원칙

- instruction 본문은 각 variant에 대응하는 `instruction` 데이터가 소유한다. generic fallback instruction을 금지한다.
- consent note, divider, CTA set은 `ingress type + consent state + attribute` 조합으로 결정한다.
- landing ingress 판정은 landing ingress flag만 사용한다. path/referrer/pending transition은 근거로 쓰지 않는다.
- test route는 route-local consent banner, confirm dialog, blocked popup을 렌더하지 않는다.

#### 용어 정리

- 아래 표에서 `OPTED_IN`은 사용자가 opt_in 상태인 경우를 뜻한다.
- 아래 표에서 `OPTED_OUT`은 사용자가 opt_out 상태인 경우를 뜻한다.
- 아래 표에서 `딥링크 유입`은 landing ingress flag가 없는 test route 진입을 뜻한다.

#### 정책 매트릭스

| ingress | consent | attribute | 표시 내용 | CTA | 결과 |
|---|---|---|---|---|---|
| landing ingress | `OPTED_IN` | `available` | variant별 사전 정의 instruction 메시지 | [Start] | consent 저장 없이 commit. landing은 `scoring1` 유지, runtime은 `q.1`이 있으면 `q.1`, 없으면 `scoring2`부터 진행 |
| landing ingress | `OPTED_IN` | `opt_out` | variant별 사전 정의 instruction 메시지 | [Start] | consent 저장 없이 commit. landing은 `scoring1` 유지, runtime은 `q.1`이 있으면 `q.1`, 없으면 `scoring2`부터 진행 |
| landing ingress | `OPTED_OUT` | `available` | 비도달 | 없음 | 랜딩 카탈로그에서 비노출, 일반 사용자 플로우상 진입 불가 |
| landing ingress | `OPTED_OUT` | `opt_out` | variant별 사전 정의 instruction 메시지 | [Start] | consent 저장 없이 commit. landing은 `scoring1` 유지, runtime은 `q.1`이 있으면 `q.1`, 없으면 `scoring2`부터 진행 |
| landing ingress | `UNKNOWN` | `available` | variant별 사전 정의 instruction 메시지 + divider + "For a better experience, please agree to the terms to proceed with the test." | [Accept All and Start] / [Deny and Abandon] | Accept: `OPTED_IN` 저장 + commit + landing ingress runtime start 규칙 적용. Deny: `OPTED_OUT` 저장 + 랜딩 복귀 + commit 0 |
| landing ingress | `UNKNOWN` | `opt_out` | variant별 사전 정의 instruction 메시지 + divider + "For a better experience, please agree to the terms before proceeding with the test. You can still continue without agreeing." | [Accept All and Start] / [Deny and Start] | Accept: `OPTED_IN` 저장 + commit + landing ingress runtime start 규칙 적용. Deny: `OPTED_OUT` 저장 + commit + landing ingress runtime start 규칙 적용 |
| 딥링크 유입 | `OPTED_IN` | `available` | variant별 사전 정의 instruction 메시지 | [Start] | consent 저장 없이 commit. runtime은 `q.1`이 있으면 `q.1`, 없으면 `scoring1`부터 진행 |
| 딥링크 유입 | `OPTED_IN` | `opt_out` | variant별 사전 정의 instruction 메시지 | [Start] | consent 저장 없이 commit. runtime은 `q.1`이 있으면 `q.1`, 없으면 `scoring1`부터 진행 |
| 딥링크 유입 | `OPTED_OUT` | `available` | variant별 사전 정의 instruction 메시지 + divider + "This test is only available to users who have agreed. We're sorry, but if you keep your current preference, you will not be able to take this test." | [Accept All and Start] / [Keep Current Preference] | Accept: `OPTED_IN` 저장 + commit + direct runtime start 규칙 적용. Keep: consent 유지 + 랜딩 복귀 + commit 0 |
| 딥링크 유입 | `OPTED_OUT` | `opt_out` | variant별 사전 정의 instruction 메시지 | [Start] | consent 저장 없이 commit. runtime은 `q.1`이 있으면 `q.1`, 없으면 `scoring1`부터 진행 |
| 딥링크 유입 | `UNKNOWN` | `available` | variant별 사전 정의 instruction 메시지 + divider + "For a better experience, please agree to the terms to proceed with the test." | [Accept All and Start] / [Deny and Abandon] | Accept: `OPTED_IN` 저장 + commit + direct runtime start 규칙 적용. Deny: `OPTED_OUT` 저장 + 랜딩 복귀 + commit 0 |
| 딥링크 유입 | `UNKNOWN` | `opt_out` | variant별 사전 정의 instruction 메시지 + divider + "For a better experience, please agree to the terms before proceeding with the test. You can still continue without agreeing." | [Accept All and Start] / [Deny and Start] | Accept: `OPTED_IN` 저장 + commit + direct runtime start 규칙 적용. Deny: `OPTED_OUT` 저장 + commit + direct runtime start 규칙 적용 |

#### 비도달 케이스 불변식

- `landing ingress + OPTED_OUT + available`는 카탈로그 필터 단계에서 비도달 상태다. test route에서 별도 fallback branch를 두지 않는다.
- `unavailable` / `hide` / `debug` variant의 recovery owner는 consent contract가 아니라 invalid-variant recovery owner다.

#### CTA action 불변식

- [Accept All and Start]: `OPTED_IN` 저장 + runtime entry commit + `instructionSeen` 기록. landing ingress는 `scoring1` 유지 후 `q.1` 또는 `scoring2`부터, 딥링크 유입은 `q.1` 또는 `scoring1`부터 진행한다.
- [Deny and Start]: `OPTED_OUT` 저장 + runtime entry commit + `instructionSeen` 기록. landing ingress는 `scoring1` 유지 후 `q.1` 또는 `scoring2`부터, 딥링크 유입은 `q.1` 또는 `scoring1`부터 진행한다.
- [Deny and Abandon]: `OPTED_OUT` 저장 + 랜딩 복귀 + runtime entry commit `0건` + `instructionSeen` 기록 `0건`.
- [Keep Current Preference]: consent 유지 + 랜딩 복귀 + runtime entry commit `0건` + `instructionSeen` 기록 `0건`.
- [Start]: consent 저장 없이 runtime entry commit + `instructionSeen` 기록. landing ingress는 `scoring1` 유지 후 `q.1` 또는 `scoring2`부터, 딥링크 유입은 `q.1` 또는 `scoring1`부터 진행한다.

#### 동일 variant 재진입 규칙 (기존 유지)

- 동일 variant 최초 진입(Landing/딥링크 공통)에서는 instruction 표시 필수.
- `instructionSeen:{variantId}`가 유효한 경우 instruction 재표시 금지.
- `instructionSeen` 리셋 조건(테스트 완료, inactivity timeout) 발생 시
  다음 진입은 최초 진입으로 취급 (Test Flow Requirements §3.6 참조).

**Verification**:
1. Automated: landing ingress 경로에서 `OPTED_IN + available|opt_out`, `OPTED_OUT + opt_out`는 variant별 plain instruction + [Start]만 표시하고, landing pre-answered `scoring1` 이후 runtime이 `q.1` 또는 `scoring2`부터 진행함을 검증한다. 딥링크 유입의 동일 consent × attribute 조합은 plain instruction + [Start] + `q.1` 또는 `scoring1` 시작임을 검증한다.
2. Automated: landing ingress + `OPTED_OUT` + `available`가 랜딩 카탈로그 단계에서 비도달 상태임을 검증한다. test route에 fallback branch가 없음을 함께 검증한다.
3. Automated: `UNKNOWN` + `available` 조합 — landing ingress 경로에서는 variant별 instruction + divider + available note + [Accept All and Start] / [Deny and Abandon]이 표시되고, [Accept All and Start] → `OPTED_IN` 저장 + landing ingress runtime start 규칙 적용, [Deny and Abandon] → `OPTED_OUT` 저장 + 랜딩 복귀를 검증한다. 딥링크 유입 경로에서는 동일 UI 구성 + [Accept All and Start] → direct runtime start 규칙 적용, [Deny and Abandon] → 랜딩 복귀를 검증한다.
4. Automated: `UNKNOWN` + `opt_out` 조합 — landing ingress 경로에서는 variant별 instruction + divider + opt_out note + [Accept All and Start] / [Deny and Start]가 표시되고 두 CTA 모두 landing ingress runtime start 규칙을 따름을 검증한다. 딥링크 유입 경로에서는 동일 UI 구성 + 두 CTA 모두 direct runtime start 규칙을 따름을 검증한다.
5. Automated: 딥링크 유입 + `OPTED_OUT` + `available` → variant별 instruction + divider + warning note + [Accept All and Start] / [Keep Current Preference] 표시, [Accept All and Start] → `OPTED_IN` 저장 + direct runtime start 규칙 적용, [Keep Current Preference] → consent 유지 + 랜딩 복귀 + commit `0건`을 검증한다.
6. Automated: test route에서 route-local consent banner / confirm dialog / blocked popup이 렌더되지 않음(`0건`)을 검증한다.
7. Automated: [Accept All and Start] → `OPTED_IN` 영구 저장 + runtime entry commit + `instructionSeen` 기록이 원자적으로 실행됨을 검증한다.
8. Automated: OPTED_OUT 상태에서 opt_out 카드 직접 URL 접근 시 정상 진입됨을 검증한다 (§13.9 준용).
9. Automated: 모든 variant에서 서로 다른 instruction 본문이 노출됨을 검증한다. 동일 instruction 메시지를 공유하는 variant `0건`을 확인한다.

### 13.6 Pre-answer Lifecycle / Failure Rollback
**Rule**: pre-answer lifecycle과 실패 정리는 누수 없이 종료되어야 한다.

**ingress-first 유효성 원칙 (SSOT: Test Flow Requirements §3.1, §4.1)**:
- pre-answer를 `scoring1` 응답으로 적용하기 위한 유일한 기준은 **landing ingress flag 존재 여부**다.
- landing ingress flag가 존재하면 pre-answer를 `scoring1` 응답으로 적용한다.
- 단, canonical question index binding은 landing 단계가 아니라 runtime entry commit 시점에 수행한다.
- landing ingress flag가 없는 유입에 pre-answer 적용을 금지한다. storage에 pre-answer가 잔류하더라도 무시하고 direct runtime start 규칙(`q.1` 우선, 없으면 `scoring1`)으로 정상 진행한다.
- transition correlation은 pre-answer 유효성 판단의 근거로 사용하지 않는다.

**read / consume 분리 계약**:
- read와 consume을 분리해야 한다.
- read 시 즉시 파기를 금지한다.
- consume은 instruction Start click 직후 수행한다.
- instruction 생략 경로에서는 Start click과 동등한 내부 `test_start` 시점에 consume한다.

**실패 롤백 계약**:
- 전환 실패/취소 시 pre-answer를 롤백해야 한다.
- 전환 시작 후 지속시간과 무관하게 반드시 종료 이벤트(`complete|fail|cancel`)로 정리해야 한다.
- `short transition` 조기 return 등으로 fail/cancel 정리 생략을 금지한다.
- 정리 시 pending transition/state/flag/body lock 누수를 금지한다.

**QA 최소 액션 케이스**:
1. 랜딩 CTA 직후 사용자 취소(뒤로가기/중단)
2. locale duplicate 실패
3. 목적지 라우트 진입 실패(타임아웃/로드 실패)

staged entry 만료/commit-failure 시나리오는 다음 Phase에서 Test Flow Requirements와 함께 별도 게이트로 다룬다.

### 13.7 Question Dwell Time
**Rule**: dwell time은 포그라운드 여부와 무관하게 누적 계산한다.
- 문항 체류시간은 포그라운드/백그라운드 상태와 무관하게 경과시간을 포함한다.
- 문항 재방문 시 누적 합산한다.

### 13.8 Return Restoration
**Rule**:
- 필수 복원 대상은 `scrollY`
- 저장 시점은 라우팅 호출 직전
- 랜딩 재진입 mount 직후 `1회` 복원 후 즉시 consume
- 동일 재진입에서 중복 복원을 금지한다.
- 복원 과정에서 자동 viewport 보정 스크롤을 금지한다.

**Verification**:
1. Automated: ingress flag/시작 문항/landing pre-answered `scoring1` 유지 규칙을 검증한다.
2. Automated: consume 시점이 Start 직후(또는 test_start)인지 검증한다.
3. Automated: rollback 3케이스와 종료 이벤트 상호배타성을 검증한다.
4. Automated: dwell time 누적 계산(재방문 포함)을 검증한다.

### 13.9 Opt-out Card Contract

**Rule**: opt_out 카드의 노출·진입 규칙은 consent 상태와 독립적으로 정의한다.

#### 노출 규칙

opt_out 카드는 consent 상태와 무관하게 카탈로그에 항상 노출한다.

| Consent 상태 | available 카드 | opt_out 카드 | unavailable 카드 |
|---|---|---|---|
| 미선택 (default) | ✅ 노출 | ✅ 노출 | ✅ badge |
| Agree All | ✅ 노출 | ✅ 노출 | ✅ badge |
| Disagree All | ❌ 비노출 | ✅ 노출 | ✅ badge |

**불변식**:
- Disagree All 선택 시 카탈로그에는 opt_out 카드와 unavailable 카드만 남는다.
- consent 상태 변경은 카탈로그 필터링에 즉시 반영되어야 한다. 페이지 리로드 없이 반영을 권장하나, 구현 방식은 구현자 재량이다.
- opt_out 카드의 진입 가능성은 `available` 카드와 동일하다. 진입 시 telemetry 동작은 §12 Telemetry 계약을 따른다.
- opt_out 카드는 consent UX를 우회하지 않는다.
  - landing ingress + `UNKNOWN` + `opt_out`는 divider + opt_out note + [Accept All and Start] / [Deny and Start]를 사용하고, 두 CTA 모두 landing pre-answered `scoring1` 이후 `q.1` 또는 `scoring2`부터 진행한다.
  - 딥링크 유입 + `UNKNOWN` + `opt_out`는 divider + opt_out note + [Accept All and Start] / [Deny and Start]를 사용하고, 두 CTA 모두 `q.1` 또는 `scoring1`부터 진행한다.
  - landing ingress + `OPTED_IN` + `opt_out`, landing ingress + `OPTED_OUT` + `opt_out`는 plain instruction + [Start]를 사용하며 landing pre-answered `scoring1` 이후 `q.1` 또는 `scoring2`부터 진행한다.
  - 딥링크 유입 + `OPTED_IN` + `opt_out`, 딥링크 유입 + `OPTED_OUT` + `opt_out`는 plain instruction + [Start]를 사용하며 `q.1` 또는 `scoring1`부터 진행한다.
- `attribute` 5종 필터링은 landing-side resolver(`loadVariantRegistry()` / `resolveLandingCatalog()`)가 담당한다. Google Sheets registry 연동 이후에도 이 레이어 책임은 변경되지 않는다(ADR-F 확정, `docs/req-test-plan.md` Part 4 참조).

#### 관련 섹션 동기화 (§3.2 single-change synchronization 추가)

opt_out 카드 노출 규칙 변경 시 §2(Terms), §13.9, req-test.md §2.5를 동일
변경셋으로 갱신한다.

**Verification**:
1. Automated: Disagree All 상태에서 available 카드 `0건`, opt_out 카드 정상 노출을 검증한다.
2. Automated: consent 상태 전환 시 카탈로그 필터 결과 변경이 즉시 반영됨을 검증한다.
3. Automated: opt_out 카드 진입 경로가 §13.5 정책 매트릭스 계약을 따름을 검증한다.   instruction 분기 상세 검증은 §13.5 Verification을 따른다.
4. Automated: landing ingress + `OPTED_OUT` + `opt_out`에서 plain instruction + [Start] + landing pre-answered `scoring1` 이후 `q.1` 또는 `scoring2` 시작임을 검증한다.
5. Automated: 딥링크 유입 + `OPTED_OUT` + `opt_out`에서 plain instruction + [Start] + `q.1` 또는 `scoring1` 시작임을 검증한다.

---

## 14. Acceptance Criteria & DoD

### 14.1 Release Gate
**Rule**:
- 릴리스 게이트 명령은 `npm run qa:gate`로 고정한다.
- `qa:gate`는 최소 `build && test && test:e2e:smoke`를 포함해야 한다.
- 1건 실패 시 릴리스 차단
- 최종 PASS는 연속 3회 통과(3/3)

### 14.2 Detailed QA Matrix (Release Blocking)
**Rule**: 아래 핵심 블로킹 체크 중 1건이라도 실패하면 릴리스를 차단한다.
1. SSR/Hydration: warning `0건`, typedRoutes build PASS, `useSearchParams()` Suspense 경계 위반 `0건` (Section 5, 11).
2. Routing/i18n: single locale prefix, duplicate prefix `0건`, `proxy.ts` 단일 책임, locale-less allowlist/404 분기 PASS (Section 5, 13).
3. GNB/Settings: Desktop 설정 레이어 open/close/fallback, trigger-layer gap `0px`, focus out close `<=1 frame`, hover 유예 hover-only, Mobile overlay/backdrop/scroll lock, History의 Blog형 GNB 컨텍스트 PASS (Section 6, 10).
4. Card/Grid/Expanded: capability gate, unavailable 가드, hero/main 연속 배치, Desktop Narrow/Medium/Wide 컬럼 규칙, Expanded/handoff 활성 중 grid plan freeze, 폭 변경 시 강제 종료 후 재계산, same-row 비대상 카드 top/bottom/outer height 오차 `0px`, Desktop Normal same-row bottom edge `0px`, 텍스트 overflow(특히 subtitle long-token)로 인한 카드/row inline-size 확장 `0건`, 텍스트 overflow로 인한 형제 슬롯(썸네일/태그) inline-size 변형 `0건`, Expanded settled content-fit 하단 무여백, Expanded→Normal 높이 복원 `0px`, handoff는 enterable 카드(available 또는 opt_out) 기준으로만 성립, shell scale/crop PASS (Section 6, 7, 8, 9).
5. Keyboard/A11y: 카드 Shell focus 경계, Tab 순차 Expanded override, 카드 내부 포커스 순회, Esc 우선순위 해제, aria 규칙, 카드 확장/진입 1차 트리거 시맨틱 요소(`<button>`, `<a>`) 강제 PASS (Section 7, 9).
6. Transition/Test Handshake: ingress flag 기록, landing `scoring1` pre-answer 유지, runtime start 규칙(`q.1` 우선 / 없으면 `scoring2` 또는 `scoring1`) 적용, consume 시점, rollback 3케이스, canonical/runtime order와 user-facing scoring label 역전 `0건`, Blog article 식별자 전달, `start=1 -> terminal=1` 상호배타, `transition_complete` destination-ready 이후 발생, Mobile lifecycle atomicity(`OPENING -> OPEN -> CLOSING -> NORMAL`), single sequence 상태 전이 1회, OPENING close queue 처리, CLOSING 인터럽트 무시, Mobile CTA 우선순위(`CTA > Close > outside`) 및 non-CTA no-op, return scroll 복원 1회+즉시 consume PASS (Section 8, 12, 13).
7. Mobile Menu Overlay: 패널 solid 표면, 패널 외부 불투명 dim, 외부 `pointer down` 즉시 닫힘(스크롤 제스처 취소), 닫힘 중 추가 입력 무시, 닫힘 후 햄버거 트리거 포커스 복귀 PASS (Section 6, 10).
8. Theme Matrix: Landing/Test/Blog/History 전 페이지 light/dark, Expanded 다크모드, 핵심 요소/보조요소 톤 정합 PASS (Section 6, 10).
9. Privacy/Consent: `UNKNOWN/OPTED_OUT` 전송 `0건`, `OPTED_IN`에서만 전송, 랜덤 소스 불가 환경 전송 차단 PASS (Section 12, 15).
10. Normal Spacing Model: Desktop/Tablet Normal에서 `subtitle -> tags` 기본 간격 비-0 유지, 보정 불필요 카드의 `보정 간격=0` + 추가 잉여 여백 `0`, 보정 필요 카드만 추가 보정 간격 허용, empty-tags에서 chip `0개` + 슬롯 높이 유지 PASS (Section 6.7, 13.1).
11. Row 1/Row 2+ Consistency: `보정 필요` 판정이 row index와 무관하게 동일 규칙(해당 row의 Normal 자연 높이 비교 결과)으로 적용되고, row index 기반 우회 신호 사용 `0건` PASS (Section 6.7).
12. Underfilled Final Row Alignment: Desktop/Tablet underfilled 마지막 row에서 시작측 정렬 유지, 카드 폭 확장(좌우 채움) `0건`, 잔여 영역 허용 예외 적용 PASS (Section 6.2).
13. Hover-out Collapse Independence: Desktop/Tablet Hover-capable에서 Expanded 카드가 비카드 영역 이탈 시 다른 카드 hover 여부와 무관하게 허용 유예 `100~180ms` 내 Normal 복귀, 단일 timer+intent token, 실행 직전 대상 재검증, 최신 경계 판정, handoff는 `다른 enterable 카드(available 또는 opt_out) 진입`으로만 성립, source `0ms`/target 표준 모션 분리 PASS (Section 8.2, 8.3).
14. Mobile Title Baseline Stability: Mobile Expanded settled에서 title 시작 기준선 편차 `0px`, OPENING/CLOSING transition window의 y-anchor drift `0px`, OPENING queue-close 1회, CLOSING 인터럽트 무시, OPEN settled unlock + transition window scroll lock, close 후 현재 scroll 위치 유지, `NORMAL` terminal 전 pre-open 높이 복귀(`0px`) 완료 PASS (Section 8.5).
15. **Card-to-Attempt Field Integrity**: `card_answered` payload의 `source_variant`·`target_route`·`landing_ingress_flag` 필수 필드 포함, `card_answered`가 landing phase의 `scoring1` 기록임을 유지하고, `attempt_start.question_index_1based`가 UI `Qn`이 아니라 첫 runtime question의 canonical index로 정확히 발화하며, `landing_ingress_flag` 일관성 (`card_answered` true → `attempt_start` true) PASS.
Test Flow Requirements §12.2 Blocker #28에 단방향으로 참조된다. 연계 검증 단언의 픽스처 공유 계약은 §12.2 Blocker #28이 소유한다.
16. Rollback Cleanup Closure: fail/cancel 3케이스(사용자 취소, locale duplicate, 목적지 실패)에서 pre-answer/ingress/pending transition/state/interaction lock/body lock/queued close 누수 `0건` PASS (Section 13.3, 13.6).
17. Return Restoration: 라우팅 직전 저장, 랜딩 재진입 mount 직후 1회 복원, 즉시 consume, 중복 복원 `0건` PASS (Section 13.8).
18. Telemetry Final Payload Completeness: `final_submit` 필수 필드(`final_responses` 포함, canonical 전 문항 맵) 누락 `0건`, raw text/PII `0건` PASS (Section 12.3).
19. Traceability Closure: 이 섹션(§14.2)의 모든 블로킹 항목이 최소 1개 이상의 자동 단언과 매핑되어야 하며, 미매핑 `0건` PASS (Section 14.3).
20. **Instruction Contract Display**: variant별 instruction 본문이 항상 표시되고, `UNKNOWN + available|opt_out`에서는 divider + consent note가 추가된다. `OPTED_IN + available|opt_out`, `OPTED_OUT + opt_out`에서는 plain instruction + [Start]만 표시된다. test route consent banner/dialog/popup `0건` PASS.
21. **[Accept All and Start] Contract**: `OPTED_IN` 영구 저장 + runtime entry commit + `instructionSeen` 기록 원자성 PASS. landing ingress는 landing pre-answered `scoring1` 이후 `q.1` 또는 `scoring2`, 딥링크 유입은 `q.1` 또는 `scoring1`로 시작 PASS.
22. **Secondary CTA Contract**: [Deny and Abandon] = `OPTED_OUT` 저장 + 랜딩 복귀 + runtime entry commit `0건` + `instructionSeen` 기록 `0건`. [Deny and Start] = `OPTED_OUT` 저장 + runtime entry commit + `instructionSeen` 기록이며, landing ingress는 landing pre-answered `scoring1` 이후 `q.1` 또는 `scoring2`, 딥링크 유입은 `q.1` 또는 `scoring1`로 진행 PASS. [Keep Current Preference] = consent 유지 + 랜딩 복귀 + runtime entry commit `0건` PASS.
23. **OPTED_OUT Available Deep-link Warning Contract**: 딥링크 유입 + `OPTED_OUT` + `available` 경로는 즉시 redirect되지 않고 warning note + [Keep Current Preference]를 표시한다. [Keep Current Preference]는 랜딩 복귀 + commit `0건`, [Accept All and Start]는 `OPTED_IN` 저장 후 direct runtime start 규칙(`q.1` 또는 `scoring1`) 적용 PASS. `landing ingress + OPTED_OUT + available`는 카탈로그 단계 비도달 PASS (§13.5).

### 14.3 Release Traceability Closure

**Rule**:
- Section 14.2의 각 release-blocking 항목은 최소 1개 이상의 automated assertion에 매핑되어야 한다.
- 매핑 누락/불일치/stale reference가 1건이라도 존재하면 릴리스를 차단한다.
- Section 3.2 동기화 대상 정책 변경 시 traceability 매핑도 동일 변경셋에서 갱신해야 한다.

**Verification**:
1. Automated: blocker item ↔ automated assertion 매핑 정합성 검사를 수행한다.
2. Manual: 릴리스 리뷰에서 매핑 표 샘플링 검수를 수행한다.

---

## 15. Exception Registry

### EX-001: `global-not-found` 설정 운용(버전 종속)
**Exception**: 전역 unmatched 404를 위해 `global-not-found` 파일 컨벤션과 버전 종속 설정을 함께 운용한다.

**Risk**: Next.js 업그레이드 시 global unmatched 404 동작/설정 요구사항이 변동될 수 있다.

**Guardrails**:
- CI에서 Next 버전 고정 + 릴리스 전 404 E2E 회귀 테스트를 필수로 수행한다.
- 현행 버전(Next.js `16.1.6`)은 `experimental.globalNotFound: true`를 요구하며, 변경 시 근거/회귀 결과를 Change Log에 기록한다.

**Verification**:
1. Automated: unmatched URL E2E 회귀 테스트.
2. Manual: production build에서 404 화면/상태코드 확인.

### EX-002: 동의 미확정(`UNKNOWN`) 또는 `OPTED_OUT` 상태 기본 전송 금지

**Exception**: consent 상태가 `UNKNOWN`(미선택) 또는 `OPTED_OUT`인 경우,
비필수 클라이언트 텔레메트리의 네트워크 전송을 금지한다.

**Why Needed**: 사용자가 동의 여부를 선택하지 않았거나 거부한 상태에서
클라이언트 텔레메트리가 전송되는 리스크를 차단하기 위함.
consent 상태 머신은 `UNKNOWN → OPTED_IN | OPTED_OUT`으로 관리되며,
배너는 `UNKNOWN`일 때만 노출된다 (§12.4 참조).

**적용 범위**: 본 예외는 텔레메트리 이벤트 전송 금지에 한정한다.
카드 가시성 필터링(§13.9)은 별도 계약이며 EX-002의 적용 대상이 아니다.

**Guardrails/Verification**: `OPTED_OUT/UNKNOWN` 전송 `0건`, strictly-necessary 서버 집계만 허용, `OPTED_IN`에서만 유예 큐 전송(Section 12.1, 12.4 검증 기준 준용).

### EX-003: request-scoped root `html lang`
**Exception**: locale별 SSR document semantics를 위해 top-level root layout이 proxy-provided locale header를 읽어 `html lang`를 request-scoped로 렌더링하는 것을 허용한다.

**Risk**: localized app routes가 dynamic rendering으로 전환될 수 있다.

**Guardrails**:
- locale source는 `proxy.ts`가 주입한 request locale header 1개로 제한한다.
- root layout은 locale 검증, 메시지 로드, route branching을 수행하면 안 된다.
- locale별 SSR response의 `<html lang>`와 hydration warning `0건`을 동시에 만족해야 한다.

**Verification**:
1. Automated: localized route SSR response에서 `<html lang>`가 active locale과 일치하는지 검증한다.
2. Automated: build/preview + hydration zero-warning smoke를 유지한다.
