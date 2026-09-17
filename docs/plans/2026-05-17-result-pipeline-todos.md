# `result_viewed` 를 실제 result pipeline 에 올린다 — Phase 9 이 열릴 때

- **작성** 2026-05-17 · **현행화** 2026-09-11
- **Task mode** Plan Only — **지금 착수할 수 없다.** 이유는 §2 가 측정값으로 적는다
- **선행** Phase 9 / result pipeline. 그것이 없으면 이 계획의 두 항목 중 하나는 관측할 대상이 없고 하나는 표시할 내용이 없다

## 1. 무엇이 남아 있나

`src/features/test/test-result-panel.tsx` 의 `useEffect` 가 마운트 시 `trackResultViewed` 를 1 회 발화하고, payload 에 `derived_type` 이 없다. 그 자리에 TODO 두 개가 있다(`test-result-panel.tsx` · `result-connector.tsx`). 요구는 둘이다.

1. **`derived_type` 을 payload 에 담는다.** `trackResultViewed` 는 이미 `derivedType` 을 받고(`telemetry/runtime.ts`), transport validator 는 「있으면 비어 있지 않은 문자열」을 이미 강제한다(`telemetry/validation.ts`). 받을 준비는 돼 있고 **보낼 값을 만드는 층이 없다.**
2. **mount 발화를 `derived_type` 블록의 IntersectionObserver 1 회 발화 + disconnect 로 바꾼다**(`req-test.md` §12.2 항목 5 · §12.3). 동시에 `result_viewed` 가 post-attempt `session_id !== null` 규칙에 들어간다(`req-test.md` §12.3).

## 2. 왜 지금 착수할 수 없나 — 측정값

**⑴ 파생 토큰을 만들 투영 층이 비어 있다.** `src/features/test/response-projection.ts` 는 **export 가 하나도 없는 계약 예약 stub** 이다. 런타임의 `'A' | 'B'` 를 `computeScoreStats()` 가 기대하는 pole label 로 바꾸는 것이 그 파일의 일이고, 그것 없이는 `deriveDerivedType()` 에 넣을 입력이 없다. 도메인 쪽은 이미 있다 — `domain/derivation.ts` 의 `computeScoreStats` · `deriveDerivedType`, `schema-registry.ts` 의 `mbti`(4 축) · `egtt`(1 축 + qualifier). **즉 토큰 자체는 계산 가능하고, 없는 것은 그 사이의 한 층이다.**

**⑵ 관측할 블록이 없고, 그 블록의 내용을 정의할 스키마도 없다.** 실측 2026-09-11:

- `src/features/test/fixtures/results/index.ts` 의 `resultsSourceFixture` 는 **`{variantId}` 넷뿐**이다. 결과 콘텐츠가 한 글자도 없다.
- `req-test.md:94` — 「Result content schema 는 **Phase 9 소유**」.
- `req-test.md:1035` — 현재 placeholder 는 `derived_type` · `axis_chart` · `type_desc` · self-contained result URL 중 **어느 것도 생성하지 않는다**.
- `req-test.md:1037` — 섹션 구성은 「Phase 9/Result pipeline 통합 시 적용할 **target contract**」이며 schema-driven 이어야 한다.
- `req-test.md:74` — §4.5~§8.3 의 result 계약은 target contract 로 유지하며 **「현 시점의 다음 단계 필수 구현 범위로 보지 않는다」**.

그러므로 지금 IntersectionObserver 를 달려면 **관측 대상을 발명해야 하고**, 그것은 계약이 Phase 9 에 맡긴 제품 결정이다. 토큰만 렌더해 그것을 「`derived_type` 블록」이라 부르는 것도 같은 발명이다 — §1037 이 섹션 구성을 schema-driven 으로 요구한다.

**⑶ 지금의 mount 발화는 결함이 아니라 계약이다.** `req-test.md:75` 가 현재 동작을 그대로 적고, `tests/unit/test-result-panel.test.ts:68` 이 그것을 고정한다. 의존성 배열은 안정값 넷이라 재발화도 없다. 「마운트 발화라 집계가 부푼다」는 우려는 **실제 result surface 가 생긴 뒤에야 의미를 갖는다** — 지금은 결과를 보는 것과 패널이 마운트되는 것이 같은 사건이다.

## 3. Phase 9 세션이 할 일 — 순서

1. **`response-projection.ts` 를 구현한다.** 그 파일의 docstring 이 사상을 이미 적어 두었다: scoring 은 `A → question.poleA` · `B → question.poleB`, qualifier 는 `A → values[0]` · `B → values[1]`. 순수 함수이므로 단위 테스트로 먼저 붉히고 짓는다.
2. **결과 콘텐츠 스키마를 정한다**(Phase 9 본체). `supportedSections` 가 이미 `derived_type` · `axis_chart` · `type_desc` 를 선언하고 있으므로 그 셋이 최소 골격이다.
3. **`ResultConnector` 가 파생 타입을 계산해 내려보낸다.** `result-connector.tsx` 의 TODO 자리다.
4. **`derived_type` 블록에 IntersectionObserver 1 회 + disconnect**, mount 발화 제거. `test-result-panel.tsx` 의 TODO 자리다.
5. **`result_viewed` 를 post-attempt `session_id` 규칙에 넣는다** — `telemetry/validation.ts` 의 목록에 추가하고, `req-test.md:1163` 과 `project-analysis.md:467` 의 「교체될 때」 문장을 현재형으로 고친다.
6. `req-test.md:75` · `:1035` · `:1136` · `:1157` 과 `project-analysis.md:356` · `:461` · `:465` · `:658` 의 placeholder 서술을 같은 커밋에서 갱신한다.

## 4. 검증

- 투영 층 단위 테스트(먼저 붉힌다) · 파생 토큰이 `schema-registry` 의 `axisCount` 와 길이가 같은지.
- `result_viewed` 가 **블록이 뷰포트에 들어올 때 1 회만** 발화하는지, disconnect 이후 스크롤 왕복에서 재발화 0 건인지.
- payload 에 `derived_type` 이 있고 `session_id !== null` 인지 — transport validator 와 e2e 양쪽에서.
- 기본 게이트 + `#test-flow` · `#telemetry`(`verification-commands.md`).

## 5. 사용자 확인이 필요한 결정

결과 콘텐츠 스키마 자체(어떤 섹션을, 어떤 데이터로, 어떤 fallback 으로). 이 계획은 그것을 정하지 않는다 — Phase 9 의 본체다.
## 6. step 3 단위 8 이 지은 것과 남긴 것 — 2026-09-16

**주소가 생겼다.** `/{locale}/result/{variant}/{type}?{base64}` 가 라우트로 존재하고(`src/app/[locale]/result/[variant]/[type]/page.tsx`), §5.1 의 payload 코덱과 `type` 세그먼트 파싱이 그 뒤에 있으며, §6.3 의 실패 열 갈래가 전부 한 에러 화면으로 모인다(`assertion:RS-01` · `RS-02` · `RS-03`). 그러므로 이 문서 §2 의 「⑵ 관측할 블록이 없다」 중 **주소가 없다는 부분은 더 이상 사실이 아니다.**

**그래도 착수 조건은 그대로다.** 이 라우트가 그리는 것은 `derived_type` 한 칸이고, 그 한 칸은 URL 이 이미 나르는 값을 그대로 보인 것이다 — 계산하지 않고 받아 적었다. 남은 것은 이 문서가 처음부터 말하던 둘이다.

1. ~~**`response-projection.ts`** 는 여전히 export 가 없다~~ — **2026-09-16 에 구현됐다**(§3 의 1 번이 닫혔다). 회차가 끝나면 투영 → `computeScoreStats` → `deriveDerivedType` → `buildTypeSegment` → payload 인코딩을 거쳐 결과 주소로 `router.replace` 한다. **이 문서가 적어 둔 사상 하나는 틀렸다**: qualifier 는 `A → values[0]` 로 옮기는 것이 아니라 **옮기지 않는다** — 오버레이가 `QualifierFieldSpec.values` 를 그대로 토큰으로 쓰므로 런타임에 이미 토큰으로 저장돼 있고, 여기서 또 옮기면 같은 변환이 두 곳에 생긴다.
2. **결과 콘텐츠 스키마**(§5)가 없으므로 `axis_chart` · `type_desc` 는 그릴 것이 없다. 단위 8 은 그 둘을 렌더하지 않고, `supportedSections` 도 읽지 않는다 — 읽으면 없는 내용을 위한 빈 컨테이너를 발명하게 된다(§6.4 는 그 fallback 을 **선언된 섹션**에 대해서만 요구한다).

**동적 OG 도 만들지 않았다.** `[locale]/opengraph-image.tsx` 는 locale 을 갖지 않는 한 장이고 결과별 그림은 Phase 9 소관이다 — 공유 링크의 미리보기가 결과마다 달라야 한다는 결정 자체가 아직 없다.

**Phase 9 세션이 §3 의 순서를 밟을 때 남은 것은 2 · 4 · 5 · 6 이다.** 1 번과 3 번은 닫혔다 — `ResultConnector` 가 주소를 만들어 `router.replace` 하고, 그 주소가 파생 타입을 나른다. 4 번(IntersectionObserver)은 **여전히 막혀 있다**: 관측할 `derived_type` 블록이 생기려면 2 번(콘텐츠 스키마)이 먼저다. 그때 옮길 발화 지점은 이제 `test-result-panel` 이 아니라 **결과 라우트**이고, 그 라우트는 서버 컴포넌트이므로 클라이언트 자식 하나가 필요하다.
