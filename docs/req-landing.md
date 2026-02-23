## 1) 목표 요약 (3~6줄)
- 랜딩페이지는 “다양한 테스트/콘텐츠 카탈로그”를 카드 그리드로 제공하고, 사용자는 카드 탐색(스크롤) 중 즉시 흥미를 느끼며 진입할 수 있어야 한다.
- 카드에는 실시간 조명/tilt로 “생동감”을 제공하되, 텍스트 가독성과 멀미/피로도를 해치지 않도록 각도/속도/감쇠를 제한한다.
- 카드 hover/tap 시 expanded “추가 정보(예: 테스트 첫 문항, 블로그 요약, 태그)”를 노출해 클릭 전 의사결정을 돕는다.
- 반응형(Desktop/Tablet/Mobile)에서 그리드가 자연스럽게 재배치되며, i18n 문자열 길이 변화에도 레이아웃이 깨지지 않아야 한다.
- 일부 카드는 unavailable(coming soon)로 노출될 수 있으며, 시각적으로 구분되되 탐색 흐름을 방해하지 않는다.
- 이번 범위(버전 1)에서는 배경 요소(background elements)는 미구현 또는 정적(업데이트 0) 으로 둘 수 있다. 이 경우 본 문서의 배경 관련 항목은 ‘강도 0/정지’로 간주하며, 카드/콘텐츠 인터랙션 요구사항의 구현·QA를 우선한다. 추후 확장 시에만 배경 규칙을 활성화한다.
- (이번 세션 확정) 시각 패키지는 버전 B 기준으로 적용하되, 배경 요소는 정적(강도 0/정지)으로 고정한다.

## 2) 화면 구조 명세 (레이아웃)

### 2.1 컨테이너 규칙
- Page container:
  - max-width: 1280px
  - align: center (좌우 자동 여백)
  - side padding:
    - Desktop/Tablet: 24px (기본), 단 좁아질수록 20px까지 허용
    - Mobile: 16px 고정
- Vertical rhythm:
  - GNB 아래 콘텐츠 시작 spacing: 16~24px (Viewport 높이/밀도에 따라 clamp)
  - 섹션 간격: 24~40px (과한 섹션 분리는 없고, 카드 그리드 중심)
- Hero(캐치프레이즈) 영역(필수 고정):
  - 사용자 입력을 받지 않는 단순 정보 표시 영역으로 취급한다.
  - 외곽 outline/border/stroke를 사용하지 않는 flat 표현으로 고정한다.

### 2.2 브레이크포인트 정의 (2~3개)
- Mobile: 0 ~ 767px
- Tablet: 768 ~ 1023px
- Desktop: 1024px 이상

> 업계 표준 범위로 제안하며, 실제 구현은 `min-width` 기반으로 단순화 권장.

### 2.3 GNB 명세
- 구성요소:
  - 좌측: CI(로고) (클릭 시 홈)
  - 페이지 컨텍스트별 구성(필수 고정):
    - Desktop / 랜딩 페이지:
      - CI(홈) + 메뉴(테스트 이력, 블로그 링크 등) 전체 나열
      - 우측 햄버거는 사용하지 않는다.
      - 우측 끝에 설정 아이콘(1개)을 노출한다.
      - 설정 레이어(아이콘 기준 앵커) 내부에 아래 2개 컨트롤만 노출한다.
        1) 언어 토글: 현재 언어 텍스트만 표시(`EN` 또는 `KR`), 클릭 시 `EN ↔ KR` 전환
        2) 테마 토글: 현재 테마 아이콘(라이트/다크) 표시, 클릭 시 `Light ↔ Dark` 전환
    - Desktop / 테스트 페이지:
      - CI + Timer Count + 테스트 이력 등(노출 정보 최소화)
    - Mobile / 랜딩 페이지:
      - CI + 햄버거 메뉴
      - 햄버거 메뉴 최하단에 설정 컨트롤 2개를 분리 노출한다.
        - 언어: 아이콘 + 현재값 텍스트(`EN`/`KR`), 탭 시 `EN ↔ KR` 순환 토글
        - 테마: 아이콘 + 현재값 텍스트(`Light`/`Dark`), 탭 시 `Light ↔ Dark` 순환 토글
    - Mobile / 테스트 페이지:
      - 뒤로가기 + Timer Count
    - Mobile / 블로그 페이지:
      - 뒤로가기 + 햄버거 메뉴
      - 햄버거 메뉴 최하단 설정 컨트롤 구성은 Mobile 랜딩과 동일하게 적용한다.

- 언어/테마 상태 정책(필수 고정):
  - 언어:
    - Desktop은 설정 레이어 내부에서만 변경 가능하다(독립 언어 버튼 미사용).
    - Mobile은 햄버거 메뉴 최하단 설정 컨트롤에서만 변경 가능하다.
  - 테마:
    - 최초 진입은 시스템 설정(`prefers-color-scheme`)을 따른다(`system-follow`).
    - 사용자가 수동 토글한 이후에는 `light` 또는 `dark`를 localStorage에 고정 저장해 우선 적용한다.

- 레이아웃/동작:
  - Sticky: top: 0
  - Height:
    - Desktop/Tablet: 64px
    - Mobile: 56px
  - Background: 불투명(또는 반투명 + blur는 선택) / 스크롤 시에도 텍스트 대비 유지
  - Shadow: 스크롤 시작(> 4px) 시 얕은 그림자 on (없으면 구분선 1px)
  - z-index: 1000 이상 (카드 hover 확대/expanded 보다 낮지 않게 주의: hover 카드가 GNB 위로 올라가면 안 됨)
  - 전환 중 GNB 교체 타이밍(필수 고정):
    - 전환 중에는 GNB를 유지하고, 전환 완료 시점에 한 번에 목적 페이지 GNB로 교체한다.
    - 요소 구성이 달라지는 경우(예: Mobile 블로그 페이지의 ‘뒤로가기&햄버거’)도 동일 원칙을 적용한다.
  - Desktop 설정 레이어 인터랙션:
    - 열기: Hover 또는 Focus 또는 Click
    - 닫기: `Esc` 또는 외부 클릭 또는 focus out
  - Mobile 햄버거 메뉴 인터랙션:
    - 기존 push(컨텐츠 밀어내기) 방식 금지
    - `fixed` 오버레이 패널 + backdrop 방식으로 표시
    - 오픈 상태에서 body scroll lock 적용
    - 외부 탭(backdrop)으로 닫힘

- 접근성:
  - 햄버거 버튼: aria-label 필수
  - 설정 아이콘 버튼: aria-label 필수
  - 포커스 링: 키보드 탐색 시 명확히 표시

### 2.4 카드 그리드 명세

#### 2.4.1 카드 간격(16~20px) 해석 규칙
- grid gap = clamp(16px, 1.5vw, 20px)
- 카드 내부 padding = 16px (기본), 정보 밀도가 높을 경우 14~18px 범위에서 조절 가능
- 카드 radius:
  - 기본: 16px
  - Mobile full-bleed 모드(아래 3.3): radius 축소(0~12px 범위) 가능

#### 2.4.2 Desktop: 2/3/4 컬럼 “조합” 규칙 (구현 가능 규칙으로 고정)
> “첫 줄 2~3, 이후 3~4”를 **2단 그리드(히어로 행 + 본문 그리드)**로 구현한다.

- 공통:
  - 카드 리스트를 `heroCards`(상단 2~3개) + `mainCards`(나머지)로 분리 렌더링
  - `availableWidth` 는 Page container 내부에서 좌우 패딩이 적용된 이후의 실제 콘텐츠 영역 너비를 의미한다.
- hero row(첫 줄):
  - 조건:
    - availableWidth(컨테이너 실제 너비) >= 1160px 이면 heroCols = 3
    - 그 외 heroCols = 2
  - heroCards 개수:
    - heroCols=3이면 상단 3개
    - heroCols=2이면 상단 2개
- main grid(나머지):
  - 조건:
    - availableWidth >= 1160px 이면 mainCols = 4
    - 그 외 mainCols = 3
- 카드 최소 폭:
  - Desktop: minCardWidth 260~300px 범위(가독성/정보량 기준으로 팀 내 확정)
- 정렬:
  - 동일 row 내 카드 높이는 “콘텐츠 높이”가 아니라 “카드 기본 비율(예: 4:5~3:4)”을 우선(텍스트는 line-clamp 처리)

#### 2.4.3 Tablet: 2/3 컬럼 “조합” 규칙
- 동일하게 `heroCards` + `mainCards` 2단 구조 유지
- hero row(첫 줄): heroCols = 2 고정, heroCards = 상단 2개
- main grid(나머지):
  - availableWidth >= 900px 이면 mainCols = 3
  - 그 외 mainCols = 2
- 본문 내 중복 정의로 인한 충돌을 방지하기 위해, 텍스트 줄수/말줄임은 **2.5.4(텍스트 줄수/말줄임 정책)**을 단일 기준으로 따른다.

#### 2.4.4 Mobile: 1 컬럼 + 좌우 16px 여백
- single column list
- 컨테이너 side padding: 16px 고정
- 카드 간 vertical gap: 14~16px (공간 과다 방지)
- 카드 높이: 콘텐츠에 따라 auto
- 텍스트 줄수/말줄임(필수 고정)
  - 앞면(Normal)
    - title: 1줄 고정, overflow 시 말줄임(truncate)
    - subtitle: 1줄 고정, overflow 시 말줄임(truncate)
    - tags: 0~3개, 각 태그 라벨은 1줄 고정 + 말줄임(truncate)
    - availabilityStatus/배지: 사용하지 않음
  - 확장면(Expanded)
    - 테스트 카드: `previewQuestion`, `answerChoiceA`, `answerChoiceB`는 말줄임 금지(줄바꿈 허용, 콘텐츠 높이에 따라 자연 확장)
    - 블로그 카드: 요약 최대 4줄 — overflow 시 말줄임(truncate)

### 2.5 카드 정보: “데이터 슬롯” 및 노출 규칙 정의
> 카드 타입(테스트/블로그/기타)에 따라 동일 슬롯 구조를 재사용한다.  
> 본 절은 `EXPANDED` 상태 뿐 아니라, **앞면(Normal)과 확장(Expanded)의 노출 매핑**까지 포함한다.  
> 슬롯이 정의되어도, **해당 면(Normal/Expanded)에 노출 대상으로 지정되지 않으면 표시하지 않는다.**

#### 2.5.1 카드 면(Normal/Expanded) 기본 정의
- Normal(기본면): 카탈로그 탐색 시 기본으로 노출되는 면
- Expanded(확장면): hover/tap/키보드 명시 조작으로 노출되는 추가 정보 상태(진입 전 의사결정 보조)
- 공통 원칙:
  - Normal에는 **진입(CTA) 요소를 두지 않는다**.
  - Expanded에는 카드 타입별로 정의된 정보/CTA만 노출한다.
  - Normal/Expanded는 같은 카드 캔버스 내에서 레이아웃/콘텐츠 전환으로 처리한다.

#### 2.5.2 카드 타입별 Normal 노출 슬롯(필수/선택)
- 테스트 카드 Normal(필수 고정)
  - `cardTitle` (필수)
  - `cardSubtitle` (필수)
  - `thumbnailOrIcon` (필수)
  - `tags[]` (0~3개 노출)
- 블로그 카드 Normal(필수 고정)
  - `cardTitle` (필수)
  - `cardSubtitle` (필수)
  - `thumbnailOrIcon` (필수)
  - `tags[]` (0~3개 노출)

- Normal 썸네일 표시 규격(필수 고정):
  - `thumbnailOrIcon`은 Normal 카드 상단에서 좌우 너비를 꽉 채우는 썸네일로 노출한다.
  - 가로 폭: 카드 내부 콘텐츠 영역 기준 100%
  - 비율: 고정 `16:9`
  - 이미지 리사이즈 방식: `cover` 우선(잘림 허용), 왜곡 금지

- 상태 배지(Available/Unavailable) 정책(필수 고정):
  - Normal 우측/상단의 `availabilityStatus` 배지(Available/Unavailable)는 사용하지 않는다.
  - 정지 상태에서 unavailable 여부를 별도 라벨로 노출하지 않는다(Desktop 기준).
  - unavailable 인지는 2.5.6의 오버레이 규칙으로만 전달한다.

- Normal 추가 표기 금지(필수 고정):
  - 키보드 인터랙션 안내 문구(예: “Enter/Space로 열기”)는 Normal 기본 레이아웃에 노출하지 않는다.

#### 2.5.3 카드 타입별 Expanded 노출 슬롯(필수/선택) + CTA 정의
- Expanded 헤더(공통, 필수 고정)
  - `cardTitle`만 상단 헤더로 노출한다.
  - Expanded 헤더의 `cardTitle`은 Normal의 `cardTitle`과 **동일 값으로 고정**한다(불일치 금지).
  - Expanded 상태에서 Normal 정보 중 유지되는 항목은 `cardTitle`만 허용한다.
  - Expanded 상태에서는 Normal의 `cardSubtitle`, `thumbnailOrIcon`, `tags[]`는 모두 사라져야 한다.

- Normal → Expanded 전환 모션(필수 고정)
  - 전환은 카드 Elevate + 확대(기본 120%)를 유지한 상태에서 레이아웃 전환으로 처리한다.
  - 전환 구성:
    1) Normal의 비타이틀 정보(`cardSubtitle`, `thumbnailOrIcon`, `tags[]`): fade-out + collapse (권장 160~240ms)
    2) `cardTitle`: 카드 최상단으로 이동 (권장 180~280ms)
    3) 상세 정보(`previewQuestion`/`summary`, CTA, `meta`): 순차 등장(stagger 40~80ms 간격, 항목당 120~220ms)
  - 구조 규칙:
    - 카드 내부에 별도 “안쪽 outline 박스(내부 패널)”를 새로 만들지 않는다.
    - 카드 전체 캔버스를 그대로 활용해 Expanded 콘텐츠를 배치한다.
    - DOM 구조는 구현 자유이나 시각적으로 이중 박스가 보이면 안 된다.

- 테스트 카드 Expanded(available)
  - `previewQuestion` (필수): “첫 문항 질문” 1개
    - 말줄임 금지(줄바꿈 허용)
  - `answerChoiceA` / `answerChoiceB` (필수): 첫 문항의 2개 선택지
    - 말줄임 금지(줄바꿈 허용)
  - 의미 고정(필수):
    - 각 선택지는 Expanded에서 노출되는 **진입 CTA**이며, 선택 즉시 다음을 만족해야 한다.
      1) 선택한 값이 **테스트 Q1 응답으로 사전 확정(pre-answered)** 된다.
      2) 테스트는 `/test/[variant]/question`으로 진입하고, instruction 오버레이를 확인한 뒤 **Q2부터 이어서 시작**한다(Q1은 이미 응답된 상태로 간주).
    - 사용자는 테스트 진행 중 **이전 문항으로 이동**하여 Q1을 **수정할 수 있다**.
    - 분석/결과 기준은 **최종 제출된 Q1**만 사용한다.
    - `previewQuestion` 및 `answerChoiceA/B`는 본 테스트 Q1과 동일 소스 사용(불일치 금지).
  - `meta` (필수, 3개 고정):
    - 메타데이터1: 예상 소요 시간
    - 메타데이터2: 공유 횟수
    - 메타데이터3: 누적 테스트 횟수
  - 테스트 카드 Expanded에는 별도 `Start` CTA를 두지 않는다(선택지 2개가 CTA 역할 대체).

- 블로그 카드 Expanded(available)
  - `summary` (필수): 블로그 내용 요약
    - 줄수: 최대 4줄(overflow 시 말줄임)
  - `meta` (필수, 3개 고정):
    - 메타데이터1: 읽는 데 걸리는 시간
    - 메타데이터2: 공유 횟수
    - 메타데이터3: 조회수
  - `primaryCTA` (필수, 1개 고정):
    - 라벨: “Read more” 고정(i18n 적용)
    - Expanded에서만 노출되는 진입 CTA

#### 2.5.4 텍스트 줄수/말줄임(truncate) 정책(필수 고정)
- 공통 원칙:
  - 기본은 말줄임(truncate) 우선이나, 테스트 카드 Expanded 핵심 콘텐츠에는 예외를 적용한다.
  - 본 문서 단계에서는 각 슬롯별 규칙만 고정한다.
- Normal(테스트/블로그 공통)
  - `cardTitle`: 1줄 고정 + 말줄임
  - `cardSubtitle`: 1줄 고정 + 말줄임
  - `tags[]`: 0~3개, 각 태그 라벨 1줄 고정 + 말줄임
  - 상태 배지(available/unavailable) 텍스트 슬롯은 사용하지 않는다.
  - 키보드 인터랙션 안내 문구 슬롯은 Normal에 사용하지 않는다.
- Expanded(카드 타입별)
  - 테스트 카드:
    - `previewQuestion`: 말줄임 금지(줄바꿈 허용)
    - `answerChoiceA/B`: 말줄임 금지(줄바꿈 허용)
    - `meta`: 단일 행/블록 내 overflow 시 말줄임(“정보 3개 유지” 원칙)
  - 블로그 카드:
    - `summary`: 최대 4줄 + 말줄임
    - `meta`: 단일 행/블록 내 overflow 시 말줄임
    - `primaryCTA`: 1줄 고정 + 말줄임

#### 2.5.5 슬롯 누락/숨김 처리 정책
> 목적: 운영 데이터가 비정상일 때(또는 선택 슬롯이 비어있을 때) UI가 깨지지 않고 QA에서 빠르게 탐지되도록 한다.

- 정의
  - “필수 슬롯”: 2.5.2/2.5.3에서 (필수)로 명시된 슬롯
  - “선택 슬롯”: `tags[]` 등 0~N 허용 슬롯
  - “자리 유지”: 슬롯 값이 비어도 **레이아웃 골격(공간/정렬/줄수 정책)**은 유지하고, 값만 비어 보이게 두는 정책

- 공통 원칙(필수 고정)
  - 필수 슬롯이 누락/빈 값이어도 “없던 것으로 숨김 처리(conditional render로 영역 제거)”를 금지한다.
  - 선택 슬롯이 비어도 “자리 유지”를 기본으로 하며, 레이아웃이 재배치되거나 다른 슬롯이 당겨져 오지 않아야 한다.

- 조건(when/if)
  - (필수 슬롯 누락) 해당 카드/면(Normal/Expanded)에서 필수 슬롯 값이 비어있으면:
    - 해당 슬롯 영역은 **빈 값(공백)으로 렌더링**하되, 레이아웃 골격은 유지한다.
  - (선택 슬롯 비어있음) 예: `tags[]`가 0개인 경우:
    - 태그 영역은 유지하되, 태그 항목만 비어 보이게 둔다.

#### 2.5.6 Unavailable 카드 콘텐츠/인터랙션 고정 규칙

- 블로그 카드:
  - Unavailable 상태로 존재하지 않는다(coming soon 블로그 카드 금지).

- 테스트 카드(availabilityStatus=unavailable):
  - 공통 원칙(필수 고정):
    - 진입 CTA는 제공하지 않는다(테스트 진입 불가).
    - Expanded 상태로 전환되지 않는다(Desktop/Mobile/키보드 공통).
    - “Coming soon” 안내가 최우선으로 읽히되, 카드 기본 정보(타이틀/서브타이틀/썸네일/태그)는 희미하게라도 인지 가능해야 한다.

  - Normal(필수 고정):
    - 테스트 카드 Normal 슬롯 구성(2.5.2)은 유지한다.

  - Desktop 동작(필수 고정):
    - 오버레이는 **현재 hover/focus된 해당 unavailable 카드에만** 표시한다.
    - available 카드 hover 시 unavailable 카드 오버레이가 함께 표시되면 안 된다(글로벌 동시 표시 금지).
    - hover enter 후 120~200ms 유지 시 “Coming soon” 오버레이를 표시한다.
    - hover out 시 오버레이를 즉시 해제한다(해제 지연 0ms).
    - 키보드 focus in 시 오버레이 표시, focus out 시 즉시 해제.
    - HOVER_LOCK(Desktop)은 오버레이가 활성인 해당 카드 기준으로만 작동한다.

  - Mobile 동작(필수 고정):
    - 기본 상태(디폴트)에서 “Coming soon” 오버레이가 항상 표시된다(hover 전제 없음).
    - 탭 입력은 추가 피드백을 제공하지 않는다(Expanded 없음, 진입 없음).

  - 오버레이 시각 규칙(필수 고정):
    - 검정색 오버레이 + 흰색 “Coming Soon” 메시지
    - 메시지 가독성 우선, 카드 정보 완전 차단 금지
    - 포커스 링 식별성 보장

  - 방어 규칙(필수 고정):
    - 어떤 예외 상태에서도 질문/선택지/메타 등 Expanded 전용 정보를 노출하지 않는다.
    - Normal 정보 + “Coming soon” 오버레이만 허용한다.

#### 2.5.7 테스트 카드 seamless continuation(Expanded 응답 → 본 테스트 이어가기) 계약

- 정의:
  - “Seamless continuation”은 랜딩 카드 Expanded에서의 선택이 **본 테스트 Q1 응답으로 연결**되고, 사용자는 본 테스트 흐름을 즉시 이어가는 것을 의미한다.
- (이번 세션 범위 확정) 본 절은 랜딩 카드 CTA 구현에 한정하지 않고, 테스트 진입 후 분기 동작(랜딩 유입: instruction 확인 후 Q2 시작 / 딥링크 유입: instruction 확인 후 Q1 시작 / 전환 실패·취소 시 롤백)까지 포함한다.

- 진입/진행 규칙:
  - Expanded에서 `answerChoiceA/B`를 선택하면, 선택 값은 **Q1 사전 응답(pre-answered)** 으로 저장된다.
  - 랜딩 유입 케이스는 question 진입 직후 instruction 오버레이를 확인한 뒤 **Q2부터 곧바로 시작**한다.
  - 사용자는 테스트에서 Q1을 다시 수정할 수 있다.
  - 결과/분석 기준은 항상 **최종 제출된 Q1**이다.

- 랜딩 유입 vs 딥링크 유입 분기(필수 고정):
  - 랜딩 유입 정의:
    - 랜딩 카드에서 Expanded 인터랙션 후(테스트 답변 CTA 또는 Read more CTA) 테스트로 진입한 케이스
  - 딥링크 유입 정의:
    - 공유 URL/직접 URL 입력 등으로 테스트 진입 URL에 직접 진입한 케이스
  - 분기 규칙:
    - 랜딩 유입/딥링크 유입 모두 instruction은 **페이지가 아닌 오버레이**로 표시한다.
    - 랜딩 유입(=Q1 사전 응답 존재): 오버레이 확인 후 Q2로 진행
    - 딥링크 유입(=Q1 사전 응답 없음): 오버레이 확인 후 Q1부터 진행
  - 진입 URL 정합성 계약(필수 고정):
    - locale 반영 책임은 라우팅 계층의 단일 책임으로 유지한다.
    - locale 세그먼트 중복 등 비정상 진입 URL은 허용하지 않는다.
    - 비정상 진입 URL이 감지되면 전환 실패로 처리하고, Q1 사전 응답은 롤백한다.

- instruction 표시 형태(필수 고정):
  - Desktop: 화면 정중앙 카드형 오버레이
  - Mobile: 화면 전체를 덮는 full-screen 오버레이
  - 오버레이가 열려 있는 동안 하위 테스트 화면 입력은 차단한다(모달 동작).

- instruction 1회 확인 정책(필수 고정):
  - 랜딩 유입/딥링크 유입 모두, 동일 variant에서 instruction을 1회 확인하면 이후 재진입 시 재표시하지 않는다.
  - 이를 위한 variant 단위 `instructionSeen` 상태를 유지한다.
  - `[다시 보지 않기]` 등 UI 요소는 추후 구현 대상으로 두며, 이번 phase에서는 구현 필수가 아니다.
  - pre-answered(Q1) 수명/소비 정책(필수 고정):
    - pre-answered는 “조회(read)”와 “소비(consume)”를 분리해 처리한다.
    - 조회 시 즉시 파기하지 않는다.
    - consume(파기)은 테스트 진입이 확정된 시점 이후에만 수행한다.
    - 랜딩 전환 상관키가 없는 유입에는 pre-answered를 적용하지 않는다(딥링크는 Q1 시작 유지).

- 실패/취소(롤백) 규칙:
  - 전환 실패/취소 시 Q1 사전 응답은 롤백(없던 일) 처리한다.
  - 테스트 시도는 성립하지 않은 것으로 간주한다.

- 문항 체류시간(백그라운드 포함) 집계 규칙:
  - 문항별 체류시간은 포그라운드 여부와 무관하게 전체 경과시간을 포함한다.
  - 문항 재방문 시 누적 합산한다.
  - 이상치 후보/편차 판정 규칙은 기존 정의를 따른다.

### 3.0 공통 상태 정의 (Page/Card)
- PageState:
  - `ACTIVE` (입력 신호 정상)
  - `INACTIVE` (브라우저 focus out/visibility hidden)
  - `REDUCED_MOTION` (prefers-reduced-motion)
  - `SENSOR_DENIED` (모바일 자이로 권한 거부/미지원)
  - `TRANSITIONING` (페이지 진입 전환 진행 중: 입력/스크롤 잠금 및 시각 상태 고정)

- CardState(각 카드별):
  - `REST` (기본)
  - `TILTING` (tilt 적용 중)
  - `EXPANDED` (확장 정보 노출 상태)
  - `FOCUSED` (키보드 포커스/접근성)

- PageState 전역 반응 규칙
  - `INACTIVE` 진입 시:
    - 카드 상호작용 입력과 입력 기반 업데이트를 중지
    - `HOVER_LOCK(Desktop)` 비활성 처리
  - `ACTIVE` 복귀 시:
    - 입력 반응은 짧은 램프업 후 정상화
  - `TRANSITIONING` 진입 시:
    - 스크롤/입력 기반 상태 전이 잠금
    - 전환 시작 프레임 시각 상태 고정
    - GNB는 전환 완료 시점에 교체
  - 상태 전이 결정성/멱등성(필수 고정):
    - 동일 전환 상관키에 대한 상태 전이는 중복 실행되어도 같은 결과를 유지해야 한다.
    - 재렌더/재마운트가 발생해도 시작 문항 결정(Q1/Q2)이 역전되면 안 된다.

- GlobalOverride(전역 규칙/플래그)
  - `HOVER_LOCK(Desktop)`
    - 의미:
      - Desktop에서 단 1개 카드만 읽기/주의 집중 상태를 갖도록 제한
    - 트리거:
      1) available 카드가 `EXPANDED` 상태
      2) unavailable 카드에서 해당 카드 오버레이 활성
    - 반응:
      - 비대상 카드 `REST` 강제
      - 비대상 카드 입력 기반 반응 0
      - 비대상 카드 Expanded 진입 차단
    - 해제:
      - 대상 카드 상태 종료 시 **즉시(0ms)** 해제
      - 카드 간 이동 시 즉시 handoff 허용(해제 지연 금지)

> 우선순위(상위가 하위를 덮음):
`INACTIVE` > `REDUCED_MOTION` > `TRANSITIONING` > `EXPANDED` > `HOVER_LOCK(Desktop)` > `TILTING` > `REST`

> 참고: `FOCUSED`는 키보드 접근성 관점의 상태이며, 시각/모션 상태(`EXPANDED`/`TILTING`/`REST`)와의 결합 가능 여부 및 제약은 각 하위 규칙에서 명시한다.

#### 3.0.1 SSR/Hydration 렌더 일관성 계약 (필수 고정)

- 목적:
  - 서버 렌더(SSR) 결과와 클라이언트 첫 렌더가 동일해야 하며, hydration mismatch를 방지한다.

- 렌더 결정값 규칙(필수):
  - SSR되는 Client Component의 초기 렌더 경로에서 다음 값을 직접 사용해 텍스트/속성 분기를 만들지 않는다:
    - `localStorage` / `sessionStorage` / `window` 기반 값
    - `Date.now()` / `Math.random()` / 비결정적 시간·난수 값
  - 위 값은 **mount 이후 effect 단계에서만** 동기화한다.

- 초기 상태 규칙(필수):
  - 사용자 저장 상태(예: consent, 토글 상태) 기반 UI라도, SSR과 클라이언트 첫 렌더에서는 동일한 초기 표시를 사용한다.
  - 초기 표시와 hydrate 이후 표시가 달라질 수 있는 경우, hydrate 전에는 중립/기본 표시를 사용한다.

- 실패 기준(필수):
  - 초기 진입 시(새로고침 포함) React hydration warning이 1건이라도 발생하면 릴리스 차단 이슈로 분류한다.

### 3.1 공통 효과

#### 3.1.1 조명 효과(광원) 정의: 추상 파라미터
- Light model(추상):
  - `lightPos` = (x: -1~+1, y: -1~+1, z: 0~1)  // 화면 정규화 좌표
  - `lightColor` = rgba(255,255,255, α=0.08~0.20)  // 과도한 하이라이트 방지
  - `intensity` = 0.3~0.8
  - `falloff` = 0.6~0.9  // 중심에서 가장자리로 감쇠
- 적용 대상:
  - background elements(선택/추후 확장): 점과 라인만으로 구성된 장식 레이어(정보 비전달).
  - 순서: GNB > 카드(콘텐츠) > 배경. 배경은 카드/텍스트 가독성에 어떠한 영향도 주면 안 된다(대비/밝기/가독성 변화 금지).
  - 카드 표면(고주파, 빠른 반응) — 단 텍스트 영역은 대비 유지(아래 4 참고)

#### 3.1.2 입력 신호
- Desktop:
  - pointer position (x,y): `pointermove`
  - scroll: `scrollY`, `scrollVelocity`
- Mobile:
  - gyroscope/device orientation: `beta/gamma` 기반 tilt
  - scroll: `scrollVelocity`
- 배경 레이어 입력 우선순위(추후 확장 시): 포인터 입력 > 단말 기울기 입력 > (둘 다 없을 때) 의도적인 랜덤 반응 순으로 적용한다. 단, 배경 반응은 항상 저주파(읽기 방해 금지)로 제한한다.

#### 3.1.3 카드 Tilt 규칙 (가독성 제한 포함)
- Desktop tilt(마우스 상대 위치):
  - 트리거: `pointermove` (단, 현재 EXPANDED 카드가 없고 HOVER_LOCK이 없을 때)
  - 반응: 카드 중심 대비 포인터 상대 위치로 tilt 계산
  - 파라미터(권장 범위):
    - maxTiltDeg = 6° ~ 10° (기본 8°)
    - responseSmoothing = 80ms ~ 180ms (저역통과/스프링 감쇠)
    - updateRate = rAF 기반, 단 60fps 유지 어려우면 30fps로 degrade
- Mobile tilt(기울기 기반):
  - 트리거: deviceorientation (권한 허용 시)
  - 반응: (gamma, beta)를 정규화해 tiltX/tiltY로 매핑
  - 파라미터(권장 범위):
    - sensorClamp = ±15° 입력 제한
    - maxTiltDeg = 5° ~ 9° (기본 7°)
    - smoothingHalfLife = 120ms ~ 220ms
- 가독성 보호 방식 선택(필수 고정)
  - 기본값: (A) 텍스트/아이콘 레이어는 별도 평면(또는 독립 처리)으로 간주하고, tilt/조명 영향은 50% 이하로 제한한다.
  - 대안: (B) 텍스트 레이어 분리를 사용하지 않는 경우에만, 텍스트 대비 자동 보정을 적용한다(그라데이션/오버레이 강도 상한을 유지).
  - 혼용 금지: 한 카드에서 (A)와 (B)를 동시에 적용하지 않는다(중복 보정으로 인한 과보정/가독성 저하 방지).
  - 우선순위: `REDUCED_MOTION`에서는 (A)/(B) 모두 “최소 움직임/최소 변화” 원칙에 맞춰 단순화한다(읽기 우선).

#### 3.1.4 카드 Expanded 규칙
- 공통 원칙
  - Normal → Expanded는 카드 Elevate + 확대(120%) + 콘텐츠 전환으로 구현한다.
  - 전환 중, 전환 후 카드 내부의 별도 outline 박스(내부 패널) 시각을 만들지 않는다.
  - 상태 전환 전/후는 Desktop/Mobile 모두 시각적으로 seamless 해야 한다.
  - Expanded 진입 시 Normal 정보 중 `cardTitle`만 유지하고, 나머지 Normal 정보(`cardSubtitle`, `thumbnailOrIcon`, `tags[]`)는 제거한다.

- Desktop
  - available 카드:
    - 트리거: `hover enter` 후 120~200ms 유지
    - 반응: `EXPANDED` 진입 + scale 1.2
    - Normal 비타이틀 정보는 fade-out + collapse, 타이틀은 카드 상단으로 이동
    - 상세 정보/CTA는 stagger로 등장
  - unavailable 테스트 카드:
    - 해당 카드 hover/focus에서만 “Coming soon” 오버레이 표시
    - Expanded 진입 없음, CTA 없음
    - hover out/focus out 시 즉시 해제(0ms)

- Mobile
  - available 카드:
    - 트리거: `tap`
    - 반응: Normal → `EXPANDED` 진입 + (정의된 경우) full-bleed
    - 닫기: Expanded 우측 상단 `X` 버튼 또는 Expanded 카드 외부(backdrop) 탭으로 닫힘
  - unavailable 테스트 카드:
    - 기본 오버레이 유지
    - 탭으로 Expanded 토글/진입 불가

- 모바일 상태 전이 검증 규칙(필수 고정)
  - `ACTIVE & available & Normal`에서 카드 본문 탭 시, 해당 카드만 `EXPANDED`로 전이한다.
  - `EXPANDED` 상태에서 `X` 탭 시, 해당 카드만 `Normal`로 복귀한다.
  - `EXPANDED` 상태에서 카드 외부(backdrop) 탭 시, 해당 카드만 `Normal`로 복귀한다.
  - `TRANSITIONING` 상태에서는 탭 입력으로 Expanded 상태를 변경하지 않는다.
  - unavailable 카드는 어떤 경우에도 Expanded로 전이하지 않는다.

- 전환 시작점(필수 고정)
  - 전환은 `EXPANDED` 상태에서 CTA 활성화 순간 시작
    - 테스트: `answerChoiceA/B`
    - 블로그: `Read more`

- 전환 중 정책
  - 스크롤/입력 잠금
  - 시작 시점 카드 시각 상태 고정
  - hover out 등으로 상태 되돌림 금지

- 복귀 정책
  - 랜딩 복귀 시 복원 필수: scrollY
  - 복원 비필수: 직전 Expanded 상태, prior focus
  - Mobile에서 `X` 또는 외부 탭으로 닫을 때는 Expanded 진입 직전의 스크롤 지점/카드 형태로 자연 복귀해야 한다.

- Desktop 주의 집중 잠금(HOVER_LOCK)
  - 대상 카드 제외 카드 상호작용 차단
  - 카드 간 handoff는 즉시 허용(지연 0ms)

- 콘텐츠/CTA 노출 규칙
  - 진입 CTA는 Expanded에서만 노출
  - Normal의 CTA 없음
  - unavailable 카드의 CTA 없음

- 키보드 접근성(필수 고정)
  - 기본 상태에서는 카드당 탭 정지점 1개만 제공(카드 내부 다중 포커스 금지)
  - `Enter/Space`로 `EXPANDED` 진입
  - Expanded 진입 이후 다음 Tab부터 CTA 순서 진입
  - Normal에서 키보드로 직접 navigation 시작 금지
  - unavailable 포커스 시 오버레이만 허용, CTA 접근 불가

- 커서 정책(필수 고정)
  - available 카드/CTA: OS 기본 `pointer` 커서 사용
  - unavailable 카드: 기본 커서 유지(`pointer`/커스텀 커서 강제 금지)

### 3.2 Desktop 전용

#### 3.2.1 Browser Focus Out 시: 배경 요소 느리게 움직임
- 트리거: `window blur` 또는 `document.visibilityState !== 'visible'`
- 반응: background elements에 “idle drift” 적용
- 파라미터(추상):
  - driftAmplitude = 6~14px
  - driftPeriod = 12~24s
  - driftEasing = ease-in-out
- 제약:
  - 카드(콘텐츠) 자체는 drift 금지(가독성/멀미 방지), 배경 레이어만 적용

#### 3.2.2 마우스 진입 직후 0.5초: 배경 반응 게인을 빠르게 램프업(초기 가속 구간)
- 트리거: `pointerenter` 발생
- 반응:
  - 0~0.5s: gain 0.3 → 1.0 램프업(초기 적응 구간)
  - 0.5s 이후: gain = 1.0 유지(일반 반응 속도로 정착)
- 파라미터:
  - rampDuration = 500ms
  - rampEasing = cubic-bezier(0.2, 0.8, 0.2, 1)

#### 3.2.3 Hover로 Expanded 된 카드는 120% 확대
- 적용 대상(필수 고정):
  - Desktop에서 available 카드가 hover로 `EXPANDED`에 진입한 경우
  - unavailable 테스트 카드는 Expanded가 없으므로 적용 대상 아님

- 트리거:
  - available 카드가 Desktop hover로 `EXPANDED` 진입 시

- 반응:
  - 120% 확대
  - 확대 기준점(transform-origin) 고정 규칙:
    - 좌측 끝 카드: `x=0%, y=0%`
    - 우측 끝 카드: `x=100%, y=0%`
    - 그 외 카드: `x=50%, y=0%`
  - Expanded 유지 동안 120% 상태 유지

- 레이아웃/안정성 규칙:
  - 리플로우 유발 금지
  - 카드 레이어는 GNB보다 낮게 유지
  - 자동 보정은 Expanded 진입 시 1회 결정 후 고정
  - 전환 시작 이후 보정/스케일 재계산 금지
  - 전환 시작 이후 hover out 등으로 시각 상태 역전 금지
  - 같은 row의 비대상 카드 크기 변화 금지(비대상 카드는 scale=1 유지)
  - Expanded 대상 카드만 독립 레이어에서 transform되어야 하며, 형제 카드의 너비/높이/행 높이에 영향 주면 안 된다.

### 3.3 Mobile 전용

#### 3.3.1 기울기 감지로 tilt
- 트리거: deviceorientation permission granted
- 반응: 각 카드 tilt 적용(단, 화면에 보이는 카드만)
- 제약:
  - 화면 내 visible 카드만 업데이트(Intersection ratio >= 0.25)

  - 스크롤 상태 정의(모바일 공통)
    - “사용자 드래그 스크롤 중”: 사용자가 화면을 터치한 채 스크롤 제스처를 수행하는 동안
    - “관성 스크롤 중”: 사용자가 손을 뗀 이후에도 화면이 계속 이동하는 동안
    - “정지”: 스크롤 이동이 사실상 멈춘 상태

  - 스크롤 상태에 따른 센서 tilt gain 조정(멀미 방지)
    - 사용자 드래그 스크롤 중: 센서 tilt gain을 50%로 감소
    - 관성 스크롤 중: 센서 tilt gain은 즉시 100%로 복귀하지 않고, 짧은 안정화 구간 후 점진 복귀(급격한 변화 방지)
    - 정지: 센서 tilt gain 100% 적용

#### 3.3.2 스크롤 속도에 따른 tilt (간단 함수/구간)
- 트리거: scroll event로 velocity 계산(v = ΔscrollY / Δt, px/ms)
- 반응: 추가 tiltBoostDeg 적용(스크롤 방향에 따른 “살짝 눌림/젖힘”)
- 매핑(예시, 구현 고정 규칙):
  - |v| < 0.5 → tiltBoost = 0°
  - 0.5 ≤ |v| < 1.5 → tiltBoost = lerp(0°, 3°)
  - |v| ≥ 1.5 → tiltBoost = 5° cap
- 결합 규칙:
  - 최종 tilt = gyroTilt * 0.7 + scrollTiltBoost * 0.3 (기본)
  - `EXPANDED` 상태에서는 scrollTiltBoost = 0° (읽기 우선)

#### 3.3.3 Expanded 카드는 full-bleed 표시(좌우 16px 여백 제거)
- 트리거: Mobile에서 available 카드 tap → `EXPANDED` 진입
- 반응(기본: in-flow full-bleed):
  - 카드 폭: 100vw
  - 좌우 확장: 컨테이너 패딩 상쇄
  - 전환 애니메이션: 220~360ms, cubic-bezier(0.2, 0.8, 0.2, 1)

- full-bleed 상태 정책
  - Mobile 진입은 `EXPANDED` 상태 CTA로만 허용
  - 전환 시작점은 “full-bleed된 Expanded 카드의 최종 외곽”
  - full-bleed 상태에서 page scroll lock
  - 모바일 Expanded 상태에서는 우측 상단 `X` 버튼을 필수 노출한다.
  - Expanded 카드 외부 영역은 backdrop으로 처리한다.

- 닫기 규칙(모바일 한정, 필수 고정)
  - `X` 버튼 클릭 시 닫힘 처리한다.
  - Expanded 카드 외부(backdrop) 탭 시 닫힘 처리한다.
  - 닫힘 시 해당 카드는 Normal 상태로 복귀해야 한다.
  - 닫힘 시점은 Expanded 진입 직전의 스크롤 지점/카드 위치/형태로 자연스럽게 되돌린다.

- 제약
  - full-bleed 상태에서 다른 카드 상호작용 비활성 + scroll lock 유지
  - unavailable 카드는 탭/외부탭 어떤 경우에도 Expanded 진입/닫기 토글 대상이 아니다.

### 3.4 텔레메트리/이벤트 로깅 요구사항(UX + 데이터 계약) (필수 고정)

- 기본 방침(범위 최소화):
  - 버전 1의 로깅 목적은 “랜딩 → 테스트/블로그 진입 전환”의 안정성과, 테스트 완료/제출 지표를 최소 이벤트로 측정하는 것이다.
  - 카드 탐색 성격의 상호작용(스크롤/hover/expanded 토글/tap 토글/tilt/조명 등)은 **기본 미수집**으로 한다.
  - Unavailable 카드에 대한 hover/tap “시도”는 **기록하지 않는다(미수집)**.

- 익명 개인 식별(동일 브라우저/동일 기기 범위):
  - 식별 목표 범위는 **동일 브라우저/동일 기기 내 일관된 묶음**이면 충분하다(사실상 device/browser 단위).
  - 금지(필수): IP 주소, 브라우저/기기 특성 조합(지문) 등 외부 식별 가능성이 있는 값으로 개인을 추정/구성하지 않는다.
  - 권장(필수 고정): 브라우저 내에 저장되는 **무작위 기반의 익명 식별자 1종**을 사용한다.
  - 식별자 생성 호환성(필수 고정):
    - 1순위: `crypto.randomUUID` 사용
    - 2순위: `crypto.getRandomValues` 기반 UUID/동등 난수 식별자 생성
    - 3순위(최후): 시간값+난수(+카운터) 조합의 경량 폴백 허용
  - 런타임 안정성(필수 고정):
    - 상위 API 미지원이어도 예외 throw로 사용자 흐름을 중단하면 안 된다.
    - 식별자 생성 실패 시에도 집계 모드(anonymousId 없이)로 이벤트 로깅은 지속 가능해야 한다.
  - 수명: 브라우저 데이터 유지 기간 동안 장기 유지

- 동의/옵트아웃(Consent) 정책:
  - 기본 수집, 사용자 거부 가능
  - 옵트아웃 시 익명 식별자 및 연결키 즉시 무효화, 이후 생성/전송 금지

- Consent 초기화/동기화 상태 머신(필수 고정):
  - 상태는 `UNKNOWN` → `OPTED_IN` 또는 `OPTED_OUT`으로 전이한다.
  - SSR과 클라이언트 첫 렌더에서는 `UNKNOWN`을 기본으로 사용한다(저장소 직접 참조 금지).
  - mount 이후 저장소 값을 읽어 최종 상태로 1회 동기화한다.

- Consent와 UI 렌더 정합성(필수 고정):
  - `UNKNOWN` 상태에서 consent 기반 라벨/aria-label은 SSR과 동일한 기본값으로 고정한다.
  - `OPTED_IN/OPTED_OUT` 확정 후에만 on/off 라벨을 전환한다.

- Consent와 이벤트 전송 정합성(필수 고정):
  - `UNKNOWN` 상태에서는 이벤트를 즉시 전송하지 않고 유예한다.
  - `OPTED_IN` 확정 시 유예 이벤트를 전송한다.
  - `OPTED_OUT` 확정 시 유예 이벤트를 폐기한다.
  - 옵트아웃 전환 시 익명 식별자/연결키 무효화와 전송 차단을 즉시 적용한다.

- 이벤트 최소 세트:
  - Landing: 페이지 진입(1회)
  - Transition: 시작(1회), 완료 또는 실패/취소(1회, 상호 배타)
  - Test: 시도 시작(1회), 최종 제출(1회)

- TRANSITIONING 정합성:
  - 전환 시작점에서 시작 이벤트 1회
  - TRANSITIONING 중 중복 시작 이벤트 금지
  - 전환은 완료/실패 중 하나로만 종료
  - 전환 상관키(eventId/transitionId)는 호환성 규칙을 따름
  - 상관키 생성 실패 시 대체키(세션 카운터 등)로 완료/실패 매칭 유지

- 테스트 응답/문항 체류시간 로깅:
  - 원문 텍스트/자유입력/개인정보 수집 금지
  - 의미 코드만 기록
  - 문항 인덱스 1-based 고정
  - 최종 제출 응답 + 문항별 누적 체류시간 기록
  - Q1은 최종 제출값 기준
  - 이상치 후보/편차 규칙은 기존 정의 유지

### 3.5 테스트 문항/카탈로그 데이터 소스

- 버전 1 범위(필수 고정):
  - 테스트 문항/카탈로그 데이터는 로컬 fixture를 사용한다.
  - fixture 기반 구현은 추후 데이터 소스 교체를 고려한 어댑터 구조를 전제로 한다.
  - (이번 세션 확정) 구현 전략은 “Fixture + Adapter”로 고정하며, Google Sheets 연동 확장이 용이한 형태로 구현한다. - Google Sheet 연동을 고려해, Fixture 가 추후 쉽게 교체 가능한 형태로
- 확장 참고:
  - Google Sheet 동기화 주기(예: 일 1~2회) 및 운영 동기화 정책은 본 문서에서 구현 요구로 강제하지 않는다.
  - 동기화/운영 규칙은 전역 요구사항 문서(`requirements.md`)의 관련 조항을 참조한다.

## 4) 접근성/성능 최소 가이드 (과하지 않게, 랜딩 범위만)
- prefers-reduced-motion:
  - tilt: off
  - 조명: off 또는 intensity를 0.2 이하로 약화
  - Expanded 전환: 큰 공간 이동 없이 crossfade/짧은 이동(150~220ms)로 단순화

- 페이지 진입 전환(landing → 테스트/블로그) reduced motion:
  - 기본값: 페이드 중심 + 작은 변화 1개만 허용
  - 금지: 카드 외곽 추적형 대형 확대 연출 강제
  - 저사양 감지 시 완전 페이드 중심으로 자동 단순화

- 저사양/권한 미허용 fallback:
  - Mobile 센서 거부/미지원 시 gyroTilt=0
  - Desktop 성능 저하 시 업데이트 주기 완화(30fps), visible 카드 우선

- 텍스트 가독성 원칙:
  - (1) 텍스트 대비 상시 확보(하이라이트 alpha 상한 ≤ 0.20)
  - (2) `EXPANDED` 상태에서는 tilt/조명 반드시 약화
  - (3) 줄수/말줄임은 2.5.4 단일 기준 적용
  - (4) Expanded CTA는 말줄임되더라도 영역/상호작용 가능성이 명확해야 함

- 커서 정책(필수 고정):
  - 별도 커스텀 커서 사용 금지
  - OS 기본 커서만 사용
  - available 카드/CTA에만 `pointer`
  - unavailable 카드는 기본 커서 유지

### 4.1 SSR/Hydration QA 체크 (필수)

- 콘솔 오류 기준:
  - 랜딩 첫 진입/새로고침 시 hydration mismatch warning 0건이어야 한다.

- 상태 조합 기준:
  - 다음 조합 모두에서 텍스트/aria-label의 초기 렌더 정합성을 확인한다.
    - consent 저장값 없음
    - consent = opted-in
    - consent = opted-out
  - 각 조합을 locale별(`en`, `ko`)로 반복 검증한다.

- 설정 UI 검증(필수):
  - Desktop:
    - 설정 아이콘 Hover/Focus/Click으로 설정 레이어가 열려야 한다.
    - `Esc`, 외부 클릭, focus out으로 설정 레이어가 닫혀야 한다.
    - 언어 토글은 현재 언어 텍스트(`EN` 또는 `KR`)만 표시하고 클릭 시 반대 언어로 전환되어야 한다.
    - 테마 토글은 아이콘으로 현재 테마를 표시하고 클릭 시 `Light ↔ Dark` 전환되어야 한다.
  - Mobile:
    - 햄버거 메뉴는 fixed 오버레이 + backdrop으로 열려야 하며 컨텐츠를 밀어내면 안 된다.
    - 메뉴 오픈 중 body scroll lock이 적용되어야 한다.
    - 메뉴 최하단의 언어/테마 컨트롤은 아이콘+현재값 텍스트로 표시되어야 한다.
    - 언어/테마 컨트롤 탭 시 각 값이 순환 토글되어야 한다.
    - backdrop 탭으로 메뉴가 닫혀야 한다.

- 모바일 Expanded 상호작용 검증(필수):
  - Normal 카드 탭 시 Expanded로 진입해야 한다.
  - Expanded의 `X` 버튼 탭 시 Normal로 복귀해야 한다.
  - Expanded 카드 외부(backdrop) 탭 시 Normal로 복귀해야 한다.
  - unavailable 카드는 어떤 탭 입력에서도 Expanded로 전이하면 안 된다.

- 랜딩→테스트 진입 정합성 QA(필수):
  - 랜딩 카드 선택지 CTA로 진입 시 비정상 locale 중복 URL이 발생하지 않아야 한다.
  - 랜딩 유입(pre-answered 존재)에서는 instruction 확인 후 첫 표시 문항이 Q2여야 한다.
  - 딥링크 유입(pre-answered 없음)에서는 instruction 확인 후 Q1부터 시작해야 한다.
  - 동일 시나리오에서 재렌더/재마운트가 발생해도 시작 문항이 Q2→Q1로 역전되면 안 된다.

- 회귀 기준:
  - SSR과 첫 클라이언트 렌더의 DOM 텍스트/속성이 달라질 수 있는 분기(저장소/시간/난수/환경 분기)가 새로 추가되면 PR 차단 대상으로 본다.
  - 진입 URL 정합성과 pre-answered 수명/소비 정책을 위반하는 변경은 PR 차단 대상으로 본다.

## 5) 개선안 2~3버전 제시 (필수)
버전 A/B/C는 서로 배타적인 전체 패키지이며, 한 번 선택되면 문서 1~4의 관련 파라미터/규칙은 선택한 버전으로 치환한다. 본 문서 본문(1~4)은 기본값으로 버전 B 기준으로 작성되었으며, 다른 버전을 선택할 경우 해당 섹션의 규칙을 버전 정의에 맞춰 적용한다.
- (이번 세션 선택안) 버전 B를 채택하며, 배경 요소는 1장 목표 요약의 원칙에 따라 정적(강도 0/정지)으로 운용한다.

### 버전 A (보수적/구현 쉬움)
- 레이아웃
  - BP: Mobile≤767 / Tablet 768~1023 / Desktop≥1024
  - Desktop: heroCols=2, mainCols=3
  - Tablet: hero=2, main=2
  - Mobile: 1컬럼 + 16px 패딩
- 조명/tilt/expanded 우선순위
  - 조명: 카드 약하게, 배경 조명 없음
  - tilt: Desktop pointer만
  - expanded: Desktop hover(지연 150ms) / Mobile tap(진입)
  - Mobile Expanded 닫기: 우측 상단 `X` 버튼
  - `EXPANDED` 시 tilt=0, 조명=50% 축소
- Mobile full-bleed
  - 미적용(컨테이너 16px 유지)

### 버전 B (균형형/권장)
- 레이아웃
  - Desktop: heroCols=(width>=1160?3:2), mainCols=(width>=1160?4:3)
  - Tablet: hero=2, main=(width>=900?3:2)
  - Mobile: 1컬럼 + 16px
- 조명/tilt/expanded 우선순위
  - 조명: 배경(저주파)+카드(고주파), intensity 상한 준수
  - tilt: Desktop pointer / Mobile gyro+scrollBoost
  - expanded:
    - Desktop hover expanded + 카드 scale 1.2
    - Desktop에서 expanded 카드 존재 시 다른 카드 입력 억제(HOVER_LOCK)
    - Mobile tap expanded
  - 충돌 처리: expanded 시 tilt 0~2° 축소 + 조명 70% 축소
- Mobile full-bleed
  - in-flow full-bleed 적용
  - 닫기: 우측 상단 `X` 버튼(필수), 닫힘 시 진입 직전 스크롤/형태로 자연 복원

### 버전 C (연출 강화/복잡)
- 레이아웃
  - BP 동일, Desktop width>=1160 mainCols=4
  - hero row 3개 우선 + featured 스타일
- 조명/tilt/expanded 우선순위
  - 조명: 배경 다중 요소 drift + 포인터/자이로 반응
  - tilt: 카드별 시차(phase) 허용
  - expanded:
    - Desktop hover expanded + scale 1.2 + 주변 dim
    - Mobile tap expanded + 반투명 backdrop
  - backdrop 활성 시 다른 카드 입력 완전 차단
- Mobile full-bleed
  - 오버레이형 full-bleed
  - 페이지 scroll lock + 내부 scroll 허용
  - 닫기: 우측 상단 `X` 버튼(필수), 닫힘 시 진입 직전 스크롤/형태로 자연 복원
