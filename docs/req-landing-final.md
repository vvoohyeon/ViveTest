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
- Desktop/Tablet Expanded scale은 `1.1` 고정이다.
- Expanded 카드 본체 opacity는 `1.0` 고정이다.

**Verification**:
1. Manual: 배경 동적 연출/tilt가 비활성 상태인지 확인한다.
2. Automated: 시각 회귀 테스트에서 scale/opacity 고정값 위반이 없는지 확인한다.

---

## 2. Terms & Definitions

| Term | Definition |
|---|---|
| Available Card | 진입 가능한 카드(Test/Blog) |
| Unavailable Test Card | 진입 불가 Test 카드. Coming Soon 오버레이만 허용 |
| Normal | 기본 탐색 상태. CTA 비노출 |
| Expanded | 상세 슬롯 노출 상태. CTA 허용(카드 타입 규칙 적용) |
| Card Shell | 카드 외곽 컨테이너. scale/높이/clip 규칙의 기준 단위 |
| Row Baseline | Expanded 진입 직전 Normal 상태의 같은 row 높이 기준값 |
| Handoff | 카드 A에서 B로 연속 hover/tap 이동하는 전이 경로 |
| Settled | 목표 상태 확정 후 추가 상태 변형이 없는 안정 시점 |
| Hover-capable Mode | `width>=768` + `(hover:hover && pointer:fine)` |
| Tap Mode | `width<768` 또는 hover-capability 미감지 |
| Keyboard Mode | 최근 입력이 `Tab/Shift+Tab` 기반인 상태 |
| Landing Ingress Flag | 랜딩 Test 카드에서 Q1 pre-answer 후 유입되었음을 나타내는 플래그 |
| Question Index | UI/Telemetry 모두 **1-based** 인덱스 |
| Transition Correlation | start/complete/fail/cancel를 묶는 상관키 |
| Locale Resolution (V2) | `/` 또는 locale-less allowlist 경로에서 locale을 결정하는 정책(쿠키 우선, Accept-Language 차순위) |

---

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
- 레이어/포인터 우선순위 정책 변경 시 Section 6.4, 8.4, 8.5, 14.3을 동기화한다.
- 모바일 CTA 우선순위/닫기 경로 정책 변경 시 Section 8.5, 8.6, 13.3, 14.3을 동기화한다.
- first-row 컬럼 규칙 변경 시 Section 6.1, 6.2, 14.3을 동기화한다.
- Expanded lifecycle atomicity/snapshot lock/input arbitration 정책 변경 시 Section 6.2, 6.7, 8.3, 8.5, 14.3을 동기화한다.

### 3.3 Ambiguity Handling
**Rule**: 구현자가 단일 해석을 확정할 수 없으면 릴리스를 멈추고 해당 섹션에 정책 옵션/선택 근거를 추가한 뒤 확정한다.

---

## 4. Global Invariants (Absolute)

### 4.1 Invariant Set
**Rule**: 아래 규칙은 모든 구현에서 동시에 성립해야 한다.
1. 유효 라우트는 항상 `/{locale}` prefix 1회만 가진다.
2. `src/app/layout.tsx`는 정적 루트 레이아웃이며 `html/body`를 포함한다.
3. `src/app/[locale]/layout.tsx`는 locale 검증/i18n 주입 전용 중첩 레이아웃이다.
4. 모든 실제 페이지는 `src/app/[locale]/**` 하위에만 존재한다.
5. Desktop/Tablet Expanded는 **Card Shell 전체**에 `scale(1.1)`을 적용한다.
6. Expanded에서 콘텐츠 crop/clip으로 식별 불가 상태를 만들면 안 된다.
7. `cardTitle`은 Normal/Expanded 모두 카드 최상단(first visible row)에 위치한다.
8. Normal에서 `tags`는 카드 하단 마지막 슬롯(terminal)이며 tags 하단 동적 추가 여백은 금지다.
9. row equal-height 보정 잔여 높이는 `tags` 상단에서만 발생할 수 있다.
10. `/` locale 결정은 V2에서 `쿠키 -> Accept-Language -> defaultLocale` 순서를 따른다.
11. locale 없는 경로는 V2에서 허용 목록 기반으로만 locale 주입 리다이렉트한다.

**Verification**:
1. Manual: 카드 UI(제목 위치, tags 하단, scale, crop), 키보드 포커스, 전환 실패 롤백을 점검한다.
2. Automated: Playwright 시각/상태 검증 + telemetry payload schema 테스트를 수행한다.

---

## 5. Routing & Layout Contract

### 5.1 Layout Responsibility Split
**Rule**: 루트/locale 레이아웃 책임은 분리 고정한다.
- `src/app/layout.tsx`: 전역 HTML/Body, 전역 스타일, 전역 Provider 골격.
- `src/app/[locale]/layout.tsx`: locale 파라미터 검증, 메시지 로드, locale 컨텍스트 주입.

**Verification**:
1. Manual: 루트 레이아웃이 정적 세그먼트인지 확인한다.
2. Automated: 파일 트리 규칙 검사 스크립트로 top-level dynamic root layout 부재를 검증한다.

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
- 허용 목록(locale-less redirect allowlist): `/blog`, `/history`, `/test/[variant]/question`
- 허용 목록에 없는 locale-less 경로는 locale 주입 리다이렉트하지 않고 global unmatched 404로 처리한다.
- duplicate locale prefix는 비정상 경로로 분기해 전역 unmatched 404 전략으로 처리한다.
- `proxy.ts`에는 비즈니스 상태 로직을 넣지 않는다.
- `middleware.ts` 도입이 필요해지면 Section 15 Exception Registry에 사유/리스크/가드레일/검증을 등록한 뒤에만 허용한다.

**Verification**:
1. Automated: proxy 단위 테스트(쿠키 우선/Accept-Language 폴백/기본값 폴백)를 수행한다.
2. Automated: 허용 목록 경로만 locale 주입되고, 비허용 locale-less 경로는 404로 귀결되는지 E2E로 검증한다.

### 5.4 Typed Routes & RouteBuilder
**Rule**: 경로 문자열 수동 결합을 금지하고 typed route helper/RouteBuilder만 사용한다.

**Implementation Notes**:
- RouteBuilder 입력/출력은 locale-free 경로를 기준으로 한다.
- `as Route`, `as never` 같은 우회 캐스팅을 금지한다.

**Verification**:
1. Automated: RouteBuilder 단위 테스트(landing/blog/history/question)를 수행한다.
2. Automated: ESLint rule 또는 코드 검색으로 금지 패턴을 검사한다.

### 5.5 404 Strategy
**Rule**: 404는 두 층으로 분리한다.
- Segment not-found: `src/app/not-found.tsx`
- Global unmatched route: `src/app/global-not-found.tsx`

**Implementation Notes**:
- segment 내부 도메인 오류는 `notFound()`로 처리한다.
- 라우팅 트리 외부 unmatched는 global-not-found에서 처리한다.
- 현재 버전(Next.js `16.1.6`)에서는 global unmatched route 활성화를 위해 `experimental.globalNotFound: true` 설정을 요구한다.

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
- Desktop: hero/main 명칭은 유지하되 카드 흐름은 단일 연속 grid로 구성한다. hero/main은 시각 영역 분리가 아니라 row index 기반 규칙으로만 해석한다.
- Desktop Wide(`availableWidth>=1160`): Row 1은 `3`, Row 2+는 `4` 컬럼을 강제한다.
- Desktop Medium(`900<=availableWidth<1160`): Row 1은 `2`, Row 2+는 `3` 컬럼을 강제한다.
- Desktop Narrow(`availableWidth<=899`): first-row 예외 없이 모든 row를 `2` 컬럼으로 고정한다.
- Desktop first-row 예외 구간(Medium/Wide)에서 Row 1 카드가 목표 개수에 미달하면 이후 row 후보를 앞 row로 당겨 채운다.
- Desktop/Tablet: hero/main 경계가 강제 줄바꿈, 빈 track, 빈 카드 공간을 만들면 안 된다.
- Tablet: hero 2 고정, main은 `availableWidth>=900`이면 3 아니면 2
- Mobile: 1열, vertical gap `14~16px`
- Expanded 활성 중 viewport/availableWidth 변경으로 재계산이 필요하면 활성 Expanded를 강제 종료해 Normal settled로 복귀한 뒤 1회만 재계산한다.

**Verification**:
1. Manual: threshold 근처 폭에서 컬럼 전환을 확인한다.
2. Automated: viewport parameterized E2E로 컬럼 수를 검증한다.
3. Automated: Desktop Narrow/Medium/Wide에서 Row 1/Row 2+ 컬럼 규칙이 정확히 적용되는지 검증한다.
4. Automated: hero/main 경계에서 강제 줄바꿈·빈 track·빈 카드 공간 `0건`을 검증한다.
5. Automated: Expanded 활성 중 폭 변경 시 강제 종료→Normal settled→배치 재계산 순서가 보장되는지 검증한다.

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

### 6.5 Card Slot Order Contract
**Rule**: 슬롯 순서와 존재 규칙은 고정한다.
- Normal 순서: `cardTitle -> cardSubtitle -> thumbnailOrIcon -> tags`
- Expanded 공통 헤더: `cardTitle`만 유지
- Expanded에서 `subtitle/thumbnail/tags`는 제거(숨김 아님, 비노출)
- Test Expanded: `previewQuestion`, `answerChoiceA/B`, `meta(3)`
- Blog Expanded: `summary(최대 4줄)`, `meta(3)`, `primaryCTA(Read more)`

**Verification**:
1. Manual: Normal/Expanded 전환 시 슬롯 제거/등장 순서를 확인한다.
2. Automated: DOM query 기반 E2E로 슬롯 순서를 검증한다.

### 6.6 Text & Clamp Contract
**Rule**: 텍스트 정책은 아래와 같이 고정한다.
- Normal title: 줄바꿈 허용, truncate/ellipsis 금지
- Normal subtitle: 1줄 truncate
- Normal tags 영역: 1줄 슬롯 고정, chip은 1줄 truncate, wrap 금지
- Expanded Test preview/choices: 줄바꿈 허용, truncate 금지
- Expanded Test answer choices 텍스트는 버튼 내부 좌측 정렬을 강제하며 줄 수 제한 없이 줄바꿈을 허용한다.
- Expanded Test answer choices 텍스트는 truncate/ellipsis/clamp를 금지한다.
- Expanded Blog summary: 4줄 clamp
- Expanded meta/CTA: overflow 시 truncate
- 카드 타이포그래피는 동일 locale에서 Normal/Expanded 상태 간 대표 폰트 1종을 유지해야 하며 상태별 폰트 분기를 금지한다.
- 폰트는 `ko`, `en` locale별로 각 1종의 대표 폰트를 허용하고 공통 fallback 체인을 사용한다.

**Verification**:
1. Manual: 긴 텍스트 fixture로 줄바꿈/클램프를 확인한다.
2. Automated: screenshot diff로 clamp 정책 위반 여부를 검증한다.

### 6.7 Card Height & Bottom Spacing Contract
**Rule**: 카드 높이, 하단 여백, row 안정성은 아래 규칙을 모두 동시에 만족해야 한다.
- Normal은 콘텐츠 기반 compact(auto) + 같은 row equal-height stretch를 적용한다.
- row equal-height stretch를 깨뜨리는 축 정렬 설정을 금지한다.
- 카드 shell은 Normal 상태에서 row stretch를 수용해야 한다(`min-height: 100%` 또는 동등 규칙).
- Normal 마지막 슬롯은 `tags`로 고정한다.
- Desktop Normal settled에서 같은 row 카드 하단 기준선 오차는 `0px`여야 한다.
- Desktop Normal에서 같은 row에 더 높은 카드가 없는 경우 카드 높이는 콘텐츠를 감싸는 높이여야 하며, 카드 내부/외부 하단 잔여 공간을 허용하지 않는다.
- `tags` 하단에 동적 spacer/margin/pseudo-element 추가를 금지한다.
- 같은 row equal-height 보정 잔여 높이는 `tags` 상단에서만 허용한다.
- Desktop Normal에서 잔여 높이 보정은 같은 row의 더 높은 카드에 맞추는 불가피한 경우에만 허용한다.
- optional tags 값이 없어도 `tags` 슬롯 1줄 높이는 유지해야 한다.
- Desktop/Tablet Normal settled에서 row 보정이 필요하지 않은 카드는 `thumbnail` 다음 가시 슬롯이 즉시 `tags`여야 하며, 두 슬롯 사이 빈 구간 생성을 금지한다.
- Desktop/Tablet Normal settled에서 row 보정이 필요한 카드만 `tags` 상단 보정 공간을 가질 수 있다.
- Expanded 높이 정책은 Desktop/Tablet에만 적용하고 Mobile은 full-bleed 규칙을 따른다.
- Desktop/Tablet Expanded는 fixed height를 금지한다.
- Desktop Expanded settled에서 카드 높이는 시각 최외곽 기준 content-fit이어야 하며 하단 잔여 공간을 허용하지 않는다.
- Desktop Expanded 초장문 콘텐츠는 카드 고정 높이로 수용하지 않고 페이지 스크롤로 수용한다.
- snapshot 해제는 Expanded 종료 직후 1회만 허용한다.
- baseline(height snapshot) 재측정은 레이아웃 안정 구간에서만 허용한다.
- Expanded 활성, handoff 정리 중, instant 종료 처리 중에는 baseline 재측정을 금지한다.
- Expanded 활성 또는 handoff 정리 중 활성 카드 이외 모든 카드의 top/bottom/outer height 오차는 snapshot 대비 `0px`여야 한다.
- Row 1에서 성립하는 비대상 카드 안정 규칙(top/bottom/outer height 불변)은 Desktop/Tablet의 모든 row(row 2+)에 동일하게 적용해야 한다.
- Expanded 활성 중 layout 재계산이 필요하면 활성 Expanded를 강제 종료해 Normal settled로 복귀한 뒤에만 baseline/배치를 재측정할 수 있다.
- handoff 직후부터 대상 카드 settled 시점까지 비대상 카드 bottom edge 오차는 baseline 대비 `0px`여야 한다.
- handoff(row A→B)에서 row A snapshot은 row B settled 직후에만 해제할 수 있다.
- 전환 중 동일 카드가 Normal/Expanded로 동시에 보이면 안 된다.
- Expanded 카드가 다른 row 위를 시각적으로 덮는 것은 허용한다.
- same-row 비확장 카드 하단 추가 빈 공간 생성은 금지한다.
- 콘텐츠 식별성을 해치는 clipping(`overflow: hidden` 기반 crop 포함)은 금지한다. 단, 동일 가독성을 보장하는 동등 구현은 허용한다.

**Verification**:
1. Automated: Desktop Normal settled에서 same-row 카드 하단 기준선 오차 `0px`를 검증한다.
2. Automated: Expanded 전환 중 dual-visibility(동일 카드 이중 가시화) `0건`을 검증한다.
3. Automated: 초기 렌더/미세 리사이즈 후 Desktop Normal 하단 정렬 규칙이 동일하게 유지되는지 검증한다.
4. Automated: Desktop/Tablet Normal settled에서 row 보정 불필요 카드의 `thumbnail -> tags` 빈 구간 생성 `0건`을 검증한다.
5. Automated: Expanded/handoff 활성 중 모든 비대상 카드의 top/bottom/outer height 오차 `0px`를 검증한다.
6. Automated: row 1과 row 2+에서 동일한 비대상 카드 안정 규칙이 유지되는지 검증한다.
7. Automated: Expanded 활성 중 폭 변경 시 강제 종료 이후에만 재측정/재배치가 수행되는지 검증한다.
8. Automated: handoff(row A→B)에서 row A snapshot 해제가 row B settled 이후에만 발생하는지 검증한다.

### 6.8 Normal Thumbnail & Expanded Slot Semantics
**Rule**: Normal 썸네일 규격과 Expanded 타입별 슬롯 의미론은 아래 규칙으로 고정한다.
- Normal thumbnail: width `100%`, ratio `6:1`, `object-fit: cover`(왜곡 금지).
- Expanded에서 제거 대상(`subtitle/thumbnail/tags`)은 시각 숨김이 아니라 미렌더링 또는 접근성 트리 비노출이어야 한다.
- front/back title 불일치를 금지한다.
- Test Expanded `meta`는 3개 고정(예상 소요 시간, 공유 횟수, 누적 테스트 횟수)이며 non-interactive 정보 슬롯으로 렌더링한다.
- Test Expanded는 별도 Start CTA를 허용하지 않는다.
- Blog Expanded `meta`는 3개 고정(읽기 시간, 공유 횟수, 조회수)이며 non-interactive 정보 슬롯으로 렌더링한다.
- Blog Expanded `primaryCTA`는 1개 고정(`Read more`, i18n).
- Expanded `meta` 수치값은 축약 표기(`k`/`m` 등)를 금지하고 3자리마다 `,` 구분자를 적용한다.
- 카드에 노출되는 텍스트(제목/부제/질문/선택지/요약/메타 레이블)는 활성 locale에 맞춰 표시해야 하며, locale 값 누락 시 default locale fallback을 적용한다.

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
- INACTIVE: 입력 기반 카드 반응 중지, HOVER_LOCK 비활성, enter/leave/focus 이벤트 no-op
- ACTIVE 복귀: 입력 램프업 `120~180ms`(기본 140), 램프업 중 확장/축소/오버레이 변경 금지
- TRANSITIONING: 스크롤/입력 잠금, 시작 프레임 상태 고정, leave/focusout collapse 금지

**Verification**:
1. Automated: 상태 전이 단위 테스트로 guard 조건을 검증한다.
2. Automated: E2E에서 탭 전환 중 입력 차단을 검증한다.

### 7.4 Determinism
**Rule**: 상태 전이는 입력 순서/이벤트 편차와 무관하게 결정적으로 동일해야 한다.
- 동일 전환 상관키의 중복 실행은 동일 결과를 보장해야 한다.
- 재렌더/재마운트가 발생해도 Q1/Q2 시작 문항 역전을 금지한다.
- `settled`는 시간 기반이 아니라 상태 기반으로 정의한다.
- `settled` 조건: 목표 Card/Page 상태가 확정되고, 동일 사용자 입력 없이 추가 상태 변형(확장/축소/오버레이/레이아웃 변화)이 발생하지 않는 시점.

**Verification**:
1. Automated: 이벤트 순서 역전/지연 시나리오에서 동일 최종 상태를 검증한다.
2. Automated: 재마운트 후 Q2→Q1 역전이 없는지 검증한다.

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
- 카드 간 포커스 이동 시 이전 카드는 즉시 Normal로 복귀하고, 새로 포커스된 카드는 즉시 Expanded가 되어야 한다.
- `Shift+Tab` 역방향 이동도 동일한 규칙(이전 카드 즉시 Expanded, 현재 카드 Normal 복귀)을 따른다.
- unavailable 카드는 본 override의 Expanded 대상이 아니다.
- 본 규칙은 기존 키보드 관련 카드 전이 규칙을 override한다.

**Verification**:
1. Automated: 카드 간 Tab 이동 시 `Focused -> Expanded` 즉시 전환과 이전 카드 Normal 복귀를 검증한다.
2. Automated: Expanded 카드 내부 포커스 순회(입력 요소 순서) 후 다음 카드로 이동되는지 검증한다.
3. Automated: Shift+Tab 역순 탐색에서 동일 규칙이 성립하는지 검증한다.

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
- hover leave로 카드 영역을 완전히 벗어나면 collapse 전이를 수행한다.
- 카드 간 handoff 시 직전 카드의 pending/진행 transition은 즉시 취소하고 마지막 hover 카드만 Expanded로 진입한다.
- handoff(카드 A→B)에서 카드 A는 scale/높이/빈공간 잔류 없이 즉시 Normal 정착해야 하며, same-row 비대상 카드 하단 여백 증가를 금지한다.
- Tap Mode fallback(`width>=768`): tap으로 Expanded 진입, 전환 비주얼 계약은 hover 경로와 동일하다.
- hover intent 스케줄러는 전역 단일 timer + intent token으로 관리한다.
- 새 hover 진입 시 이전 예약을 즉시 취소한다.
- 타이머 실행 직전 `현재 hover 대상 == 예약 대상`을 재검증하고 불일치 시 no-op 처리한다.
- handoff 경로는 지연 없이 즉시 전환한다.

**Verification**:
1. Automated: handoff 시 직전 카드 pending transition 취소 여부를 검증한다.
2. Automated: 마지막 hover 카드만 최종 Expanded인지 검증한다.

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
- `0ms` 전이는 handoff의 직전 카드 이탈 경로에서만 허용한다.
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

### 8.4 Expanded Shell Scale and Readability
**Rule**:
- Desktop/Tablet Expanded `scale=1.1`은 **Card Shell 전체**에 적용
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
- Expanded 시작부터 닫힘 완료까지 활성 카드 상단 y-anchor(뷰포트 기준)는 편차 없이 유지되어야 한다.
- Expanded 헤더는 `title + X` 구조를 유지한다.
- 헤더(`title + X`)는 카드 최상단 첫 행에 위치해야 한다.
- title은 줄바꿈 허용, truncate/ellipsis 금지, top align 유지.
- X 버튼은 아이콘 `X` 단일 표현으로 고정하며 헤더 우측 끝에 sticky로 유지한다.
- X 버튼은 OPENING 시작 시점부터 CLOSING 종료 직전까지 항상 시각 노출되어야 한다.
- CLOSING 동안 X 버튼은 시각적으로 유지하되 비활성 상태여야 한다.
- 닫기 경로는 `X 버튼` 또는 `카드 외부(backdrop) 탭`만 허용한다.
- 닫힘 후 Expanded 직전 scroll/위치/형태로 자연 복귀해야 한다.
- Expanded 진입 직전 Normal 카드 외곽 높이 snapshot을 기록하고, 닫힘 완료 시 해당 snapshot 높이로 `0px` 오차 복귀를 강제한다.
- 모바일 높이 복원 기준은 항상 진입 직전 snapshot으로 고정하며, 전이 중 콘텐츠 변화가 있어도 복원 기준 snapshot 교체를 금지한다.
- 카드 폭은 `100vw`로 확장하고 컨테이너 패딩을 상쇄한다.
- 전환 `220~360ms`(기준 `280ms`), spring/overshoot 금지.
- Normal 카드에서 Expanded 카드로의 전환은 동일 카드의 연속 전이로 지각되어야 하며, 분리된 별도 카드가 돌출되는 듯한 강한 불연속 전이를 금지한다.
- 모바일 외곽 컨테이너 높이 전이는 content-fit 목표 높이까지 monotonic(증가/감소)이어야 하며 overshoot를 금지한다.
- content-fit 높이 계산은 런타임 실측(`from px -> to px -> auto`) 또는 동등 정확도 방식으로 수행한다.
- 내부 스크롤은 body에서만 허용한다.
- 콘텐츠가 viewport를 넘지 않으면 내부 스크롤이 없어야 한다.
- 자동 viewport 보정 스크롤을 금지한다.
- full-bleed 동안 page scroll lock을 적용한다.
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
- 위 y-anchor 규칙은 카드 인덱스/스크롤 위치/콘텐츠 길이에 따른 예외를 허용하지 않는다.

**Verification**:
1. Automated: 모바일에서 닫기 경로(X/backdrop)와 자연 복귀를 검증한다.
2. Automated: content-fit 높이 전이 overshoot `0건`을 검증한다.
3. Automated: 내부 스크롤 영역이 body로 제한되는지 검증한다.
4. Automated: z-index/포인터 타깃 검증으로 모바일 레이어 순서를 확인한다.
5. Automated: Mobile Expanded settled 상태에서 활성 카드 본체 dim/tint `0%`를 검증한다.
6. Automated: 모바일 CTA 우선순위(`CTA > X > outside`) 및 내부 non-CTA no-op를 검증한다.
7. Automated: OPENING 중 닫기 입력이 OPEN settled 직후 queue-close 1회로만 처리되는지 검증한다.
8. Automated: 모바일 close 완료 시 pre-entry snapshot 높이 복원 오차 `0px`를 검증한다.
9. Automated: 미세 이동 gesture가 scroll로 분류되어 카드 open/close 전이를 시작하지 않는지 검증한다.
10. Automated: 카드 인덱스 전 구간에서 X 버튼의 시각 노출 상태를 OPENING/OPEN/CLOSING 전 구간으로 검증한다.
11. Automated: CLOSING 동안 X 버튼 비활성 상태와 추가 닫기 입력 무시를 검증한다.
12. Automated: 카드 인덱스/스크롤 위치/콘텐츠 길이 조합에서 활성 카드 상단 y-anchor(뷰포트 기준) 편차 `0px`를 검증한다.

### 8.6 Transition Start Trigger (Landing→Destination)
**Rule**: 라우팅 전환 시작은 Expanded의 유효 CTA 활성화 시점에만 허용한다.
- Test: answerChoiceA/B
- Blog: Read more
- Blog CTA 전환은 선택된 article 식별자를 목적지로 전달해야 하며, 목적지는 해당 식별자 기준으로 콘텐츠 컨텍스트를 결정해야 한다.
- article 식별자 누락/무효 시에는 문서에 정의된 안전 fallback으로 처리해야 한다.
- Mobile에서도 CTA 입력(마우스 클릭/터치 탭)은 닫기 동작보다 우선하며 반드시 `transition_start`로 귀결되어야 한다.
- 본 섹션의 전환 시작 규칙은 Section 13.3/13.6의 fail/cancel/rollback 계약을 변경하지 않는다.

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
- 동의 UI 도입 전 V1 운영에서는 strictly-necessary 범위의 비식별 서버 집계(예: 총 페이지뷰)만 허용한다.
- V1 필수 이벤트: `landing_view` 1회, `transition_start` 1회, `transition_complete|transition_fail|transition_cancel` 중 1회(상호배타), `attempt_start` 1회, `final_submit` 1회.
- 기본 미수집: `scroll`, `hover`, `expanded/tap 토글`, `tilt/조명 상호작용`, `unavailable hover/tap 시도`.

### 12.2 Transition Correlation & Required Fields
**Rule**: 전환 이벤트는 상관키 일관성과 중복 방지 규칙을 준수해야 한다.
- `TRANSITIONING` 상태에서 중복 start를 금지한다.
- 시작된 전환은 반드시 `complete|fail|cancel` 중 하나로 종료되어야 한다.
- `event_id`와 `transition_id` 매칭은 필수다.
- 상관키 생성 실패 시 세션 카운터 기반 대체키를 허용한다.
- 공통 필수 필드(전송 이벤트 기준): `event_id`, `session_id`, `ts_ms(UTC)`, `locale`, `route`, `consent_state`.
- 전환 필수 필드: `transition_id`, `source_card_id`, `target_route`, `result_reason(실패/취소 시)`.
- 테스트 필수 필드: `variant`, `question_index_1based`, `dwell_ms_accumulated`, `landing_ingress_flag`.

### 12.3 Payload Boundaries
**Rule**: 텔레메트리 payload는 의미 코드 중심으로 제한한다.
- 금지: 원문 질문/답변 텍스트, 자유입력 텍스트, PII/지문성 식별자(IP, fingerprint).
- 응답은 의미 코드만 기록한다.
- question index는 1-based 고정이다.
- final submit에는 최종 응답 + 문항별 누적 체류시간을 기록한다.
- Q1 값은 최종 제출 시점 값을 기준으로 한다.

### 12.4 Consent State Machine
**Rule**: consent는 `UNKNOWN -> OPTED_IN | OPTED_OUT` 상태 머신으로 관리한다.
- SSR/초기 렌더는 `UNKNOWN` 고정.
- mount 후 저장소 동기화는 1회만 수행한다.
- `UNKNOWN` 구간 이벤트는 유예 큐에 저장할 수 있으나 전송은 금지한다.
- `OPTED_IN` 확정 시에만 유예 이벤트 전송을 허용한다.
- `OPTED_OUT` 확정 시 유예 이벤트를 폐기한다.
- 옵트아웃 즉시 익명 식별자/연결키를 무효화하고 전송을 차단한다.
- 동의 UI 도입 전까지 V1 기본 확정값은 `OPTED_OUT`으로 처리한다.

### 12.5 Anonymous ID Policy
**Rule**: 익명 ID는 비식별/안전 생성 원칙을 따른다.
- 동일 브라우저/동일 기기 범위 일관성만 요구한다.
- 생성 우선순위: `randomUUID -> getRandomValues`.
- 위 2개가 모두 불가한 환경에서는 `session_id`를 생성하지 않는다.
- `time+rand+counter` 기반 폴백은 금지한다.
- 랜덤 소스 불가 환경은 `consent_state=OPTED_OUT` 또는 `UNKNOWN` 상태에서 클라이언트 전송을 금지한다.

### 12.6 Data Source Contract
**Rule**: V1 데이터 소스는 fixture + adapter 구조를 강제한다.
- 랜딩 fixture 최소: Test `4+`, Blog `3+`, unavailable Test `2+`, unavailable Blog `0`.
- fixture 다양성 케이스 필수: 긴 텍스트, 빈 tags, debug/sample.
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
- 빈 chip 강제 렌더 금지

### 13.2 Unavailable Handling
**Rule**:
- unavailable Blog 카드는 존재하면 안 된다.
- unavailable Test 카드는 Expanded/CTA/전환을 허용하지 않는다.
- Hover-capable 모드에서는 hover/focus 시에만 오버레이 노출
- Tap Mode에서는 오버레이 상시 노출

### 13.3 Landing→Destination Handshake
**Rule**: 전환 잠금과 GNB 교체 시점은 아래 규칙으로 고정한다.
- 전환 시작 즉시 `TRANSITIONING`으로 진입한다.
- 시작 프레임의 카드 시각 상태를 고정한다.
- 전환 중 상태 되돌림을 금지한다.
- 전환 중 다른 카드 상호작용을 금지한다.
- source GNB는 목적지 진입 완료 전까지 유지한다.
- destination GNB는 목적지 진입 완료 시점에 1회 교체한다.
- 전환 종료 이벤트는 `complete|fail|cancel` 중 정확히 1회만 발생해야 한다.
- 실패/취소 시 pre-answer 및 pending 상태를 롤백해야 한다.
- fail/cancel/rollback 계약은 모바일 CTA 우선순위 보완 여부와 무관하게 항상 동일하게 유지해야 한다.

### 13.4 Test Q1 Pre-answer & Instruction Start Rule
**Rule**: Q1 pre-answer와 시작 문항 결정은 ingress flag 기준으로만 판단한다.
- 본 계약은 Test 카드에만 적용하며 Blog 카드에는 적용하지 않는다.
- Test 카드 Expanded에서 A/B 선택 시:
1. 선택값을 Q1 pre-answer로 저장
2. `variant + session` 단위 landing ingress flag 기록
3. `/test/[variant]/question` 진입
- landing ingress flag 존재 시 instruction seen 여부와 무관하게 Q2부터 시작한다.
- landing ingress flag 부재 시 Q1부터 시작한다.
- landing ingress flag 존재 시 instruction Start 이전 진행표시는 `Question 2 of N`이어야 한다.
- 동일 variant 재진입에서 instruction이 생략되는 경우:
1. ingress flag 존재 시 즉시 시작 + Q2 진입
2. ingress flag 부재 시 Q1 진입
- 사용자는 테스트 중 Q1을 재수정할 수 있다.
- 최종 결과 계산은 최종 제출 시점 Q1 값 기준이다.

### 13.5 Instruction Contract
**Rule**: instruction 노출/재노출/입력차단 규칙을 아래와 같이 고정한다.
- Desktop은 centered card overlay, Mobile은 full-screen overlay를 사용한다.
- instruction overlay 활성 중 하위 입력은 차단해야 한다.
- instructionSeen은 variant 단위로 저장한다.
- 동일 variant 최초 진입(랜딩/딥링크 공통)에서는 instruction 표시가 필수다.
- 동일 variant 재진입에서는 instruction 재표시를 금지한다.
- instructionSeen 여부는 시작 문항(Q1/Q2) 결정 조건이 아니며, 시작 문항은 ingress flag 규칙으로만 결정한다.

### 13.6 Pre-answer Lifecycle / Failure Rollback
**Rule**: pre-answer lifecycle과 실패 정리는 누수 없이 종료되어야 한다.
- read와 consume을 분리해야 한다.
- read 시 즉시 파기를 금지한다.
- consume은 instruction Start click 직후 수행한다.
- instruction 생략 경로에서는 Start click과 동등한 내부 `test_start` 시점에 consume한다.
- `transition correlation + landing ingress flag` 없는 유입에 pre-answer 적용을 금지한다.
- pre-answer 적용/소비는 Test 카드에만 허용한다.
- 전환 실패/취소 시 pre-answer를 롤백해야 한다.
- 전환 시작 후 지속시간과 무관하게 반드시 종료 이벤트(`complete|fail|cancel`)로 정리해야 한다.
- `short transition` 조기 return 등으로 fail/cancel 정리 생략을 금지한다.
- 정리 시 pending transition/state/flag/body lock 누수를 금지한다.
- QA 최소 액션 케이스:
1. 랜딩 CTA 직후 사용자 취소(뒤로가기/중단)
2. locale duplicate 실패
3. 목적지 라우트 진입 실패(타임아웃/로드 실패)

### 13.7 Question Dwell Time
**Rule**: dwell time은 포그라운드 여부와 무관하게 누적 계산한다.
- 문항 체류시간은 포그라운드/백그라운드 상태와 무관하게 경과시간을 포함한다.
- 문항 재방문 시 누적 합산한다.

### 13.8 Return Restoration
**Rule**:
- 필수 복원 대상은 `scrollY`
- 저장 시점은 라우팅 호출 직전
- 랜딩 재진입 mount 직후 1회 복원 후 즉시 consume

### 13.9 Not-found Handling
**Rule**: Not-found 정책의 단일 소스는 Section 5.3/5.5를 따른다(중복 정의 금지).

**Verification**:
1. Automated: ingress flag/시작 문항/Q2 진행표시 규칙을 검증한다.
2. Automated: consume 시점이 Start 직후(또는 test_start)인지 검증한다.
3. Automated: rollback 3케이스와 종료 이벤트 상호배타성을 검증한다.
4. Automated: dwell time 누적 계산(재방문 포함)을 검증한다.

---

## 14. Acceptance Criteria & DoD

### 14.1 Release Gate
**Rule**:
- 릴리스 게이트 명령은 `npm run qa:gate`로 고정한다.
- `qa:gate`는 최소 `build && test && test:e2e:smoke`를 포함해야 한다.
- 1건 실패 시 릴리스 차단
- 최종 PASS는 연속 3회 통과(3/3)

### 14.2 Mandatory Checks
**Rule**: DoD 필수 체크 항목은 Section 14.3 Detailed QA Matrix를 단일 소스로 따른다.

### 14.3 Detailed QA Matrix (Release Blocking)
**Rule**: 아래 핵심 블로킹 체크 중 1건이라도 실패하면 릴리스를 차단한다.
1. SSR/Hydration: warning `0건`, typedRoutes build PASS, `useSearchParams()` Suspense 경계 위반 `0건` (Section 5, 11).
2. Routing/i18n: single locale prefix, duplicate prefix `0건`, `proxy.ts` 단일 책임, locale-less allowlist/404 분기 PASS (Section 5, 13).
3. GNB/Settings: Desktop 설정 레이어 open/close/fallback, Mobile overlay/backdrop/scroll lock, History의 Blog형 GNB 컨텍스트 PASS (Section 6, 10).
4. Card/Grid/Expanded: capability gate, unavailable 가드, hero/main 연속 배치, Desktop Narrow/Medium/Wide 컬럼 규칙, Expanded/handoff 활성 중 grid plan freeze, 폭 변경 시 강제 종료 후 재계산, 모든 비대상 row top/bottom 오차 `0px`, Desktop Normal same-row bottom edge `0px`, Expanded settled content-fit 하단 무여백, Expanded→Normal 높이 복원 `0px`, shell scale/crop PASS (Section 6, 7, 8, 9).
5. Keyboard/A11y: 카드 Shell focus 경계, Tab 순차 Expanded override, 카드 내부 포커스 순회, Esc 우선순위 해제, aria 규칙 PASS (Section 7, 9).
6. Transition/Test Handshake: ingress flag 기록, Q2 시작/표시, consume 시점, rollback 3케이스, Q2→Q1 역전 `0건`, Blog article 식별자 전달, Mobile lifecycle atomicity(`OPENING -> OPEN -> CLOSING -> NORMAL`), single sequence 상태 전이 1회, OPENING close queue 처리, CLOSING 인터럽트 무시, Mobile CTA 우선순위(`CTA > Close > outside`) 및 non-CTA no-op PASS (Section 8, 12, 13).
7. Mobile Menu Overlay: 패널 solid 표면, 패널 외부 불투명 dim, 외부 `pointer down` 즉시 닫힘(스크롤 제스처 취소), 닫힘 중 추가 입력 무시, 닫힘 후 햄버거 트리거 포커스 복귀 PASS (Section 6, 10).
8. Theme Matrix: Landing/Test/Blog/History 전 페이지 light/dark, Expanded 다크모드, 핵심 요소/보조요소 톤 정합 PASS (Section 6, 10).
9. Privacy/Consent: `UNKNOWN/OPTED_OUT` 전송 `0건`, `OPTED_IN`에서만 전송, 랜덤 소스 불가 환경 전송 차단 PASS (Section 12, 15).
10. Normal Slot Compaction: Desktop/Tablet Normal settled에서 row 보정 불필요 카드의 `thumbnail -> tags` 빈 구간 생성 `0건` PASS (Section 6.7).
11. Row-edge Origin: Desktop/Tablet Wide/Medium/Narrow 및 hero/main 연속 배치에서 row-edge transform-origin 판정 정확성 PASS (Section 6.2, 8.4).
12. Row Stability Consistency: row 1과 row 2+에서 비대상 카드 top/bottom/outer height 오차 `0px`, handoff의 row A snapshot 해제 시점(row B settled 이후) PASS (Section 6.7, 8.2, 8.3).
13. Mobile Anchor & Close Control: 카드 인덱스/스크롤 위치/콘텐츠 길이 조합에서 활성 카드 상단 y-anchor(뷰포트 기준) 편차 `0px`, X 버튼 전 구간 노출 및 CLOSING 비활성 PASS (Section 8.5, 9.1).

---

## 15. Exception Registry

### EX-001: `global-not-found` 설정 운용(버전 종속)
**Exception**: 전역 unmatched 404를 위해 `global-not-found` 파일 컨벤션과 버전 종속 설정을 함께 운용한다.

**Why Needed**: top-level dynamic segment 루트 문제를 회피하고 운영 404를 명확히 분리하기 위함.

**Risk**: Next.js 버전 업데이트 시 `globalNotFound` 설정 요구사항이 변동될 수 있다.

**Guardrails**:
- CI에서 Next 버전 고정 및 릴리스 전 404 회귀 테스트 필수.
- 현재 버전(16.1.6)에서는 `experimental.globalNotFound: true`를 유지한다.
- 설정 요구사항이 변경되는 버전으로 업그레이드할 때는 변경 근거와 회귀 결과를 Change Log에 남긴다.

**Verification**:
1. Automated: unmatched URL E2E 회귀 테스트.
2. Manual: production build에서 404 화면/상태코드 확인.

### EX-002: 동의 UI 도입 전 기본 `OPTED_OUT` (전송 금지)
**Exception**: consent UI 도입 전 기본 확정값은 `OPTED_OUT`으로 운용한다.
**Why Needed**: 동의 없는 비필수 클라이언트 텔레메트리 전송 리스크를 차단하기 위함.
**Guardrails/Verification**: `OPTED_OUT/UNKNOWN` 전송 `0건`, strictly-necessary 서버 집계만 허용, `OPTED_IN`에서만 유예 큐 전송(Section 12.1, 12.4 검증 기준 준용).
