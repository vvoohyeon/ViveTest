# ia-navigation — 계층 깊이 · 되돌아가기 · 현재 위치 · 딥링크 · 엄지 도달

읽은 저장소: `/Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis`(HEAD `7616211` 착수 마커, 부모 `a5aec95`). 모든 `file:line` 은 이 clone 기준이며, 저장소 파일은 하나도 수정하지 않았다(`git status --porcelain` 빈 출력). 브라우저는 띄우지 않았다 — **실측**이라고 적지 않은 수치는 전부 클래스·토큰에서 유도한 계산값이거나 과제 프롬프트가 이미 제공한 실측값이며, 그렇게 표시했다.

근거 표기: **[규범]** WCAG 2.2 / 측정 가능한 기준 · **[관행]** iOS HIG · Material 3 · 모바일 웹 관행 · **[계약]** `docs/req-*.md` 조항 · **[design.md]** 시각 권위 · **[모순]** 문서↔코드 또는 문서↔문서 불일치 · **[측정]** 이 세션이 코드·토큰에서 계산한 값 · **[기주어짐]** 프롬프트가 제공한 실측값 · **[미확인]** 확인하지 못함.

---

## 0. 이 렌즈의 한 문단 결론

이 제품의 모바일 IA 는 **깊이가 얕은 대신 옆으로 갈 길이 없고, 뒤로 갈 길이 표준과 어긋나 있다.** 라우트는 6개뿐이고 계층은 최대 2단(`/{locale}/blog/{variant}`)이라 깊이는 문제가 아니다. 문제는 세 가지다 — ⑴ **브라우저·시스템 뒤로가기가 아무것도 닫지 않는다**(저장소 전체에 `popstate` 리스너 0건 · `pushState`/`replaceState` 0건, 실측 grep). 모바일 표준의 네 레이어(랜딩 확장 카드 · GNB 드로어 · 설정 패널 · instruction 오버레이)가 전부 뒤로가기에 페이지를 떠나는 것으로 응답한다. ⑵ **앱 내 「위로」가 없다** — 블로그 상세의 Back 은 부모인 목록이 아니라 랜딩으로 가고, 그 판정이 `document.referrer` 에 걸려 있어 목록이 히스토리 스택에 있어도 랜딩으로 밀어낸다. ⑶ **모바일 GNB 는 자기가 어느 화면인지 말하지 않는다** — 현재 위치 표시(`aria-current` + dot)가 드로어 안에만 있어서, 보려면 모달을 열어야 한다. 그리고 엄지 도달 관점에서는 **하단에 고정된 액션이 제품 전체에 하나도 없다**(sticky/fixed 전수 6건: GNB 상단 · 확장 카드 헤더 상단 · 드로어 · transition 오버레이 · 카드 transient shell · 동의 배너 — 액션 바 0건).

랜딩 3.76화면 스크롤은 **IA 문제가 아니라 밀도 문제다.** 근거는 §11 에 수치로 적었다 — 카드 1장의 최소 높이 255px 중 206px(81%)이 콘텐츠와 무관한 고정 구조(썸네일 122.25 + 태그 행 28 + 패딩·간격 56)이고, 8장이 만드는 그리드 최소 높이 2,145px 이 실측 문서 높이 3,173px 의 68% 다. 첫 카드 위 크롬은 315px(9.9%)에 불과하다. 즉 IA 를 아무리 정리해도 회수 가능한 것은 10% 안쪽이고, 카드 높이를 절반으로 줄이면 34% 가 회수된다. 다만 그 315px 안의 179px 짜리 히어로는 `design.md` §7.1 이 **명시적으로 금지한 요소**이므로(§12) 그것만은 IA 쪽에서 걷어낼 근거가 따로 있다.

---

## 1. 라우트·계층 지도 (전수)

| 라우트 | 계층 | 진입 경로 | 나가는 앱 내 경로(모바일) |
|:---|:---|:---|:---|
| `/{locale}` | 1 | 직접 · 프록시 리다이렉트 · 모든 Back 폴백 | 카드 탭 → 확장 → A/B → test · 블로그 카드 탭 → blog 상세 · 드로어(2탭) |
| `/{locale}/blog` | 1 | 드로어 2탭 · 딥링크 | Back(→랜딩) · 목록 행 탭 · 드로어 |
| `/{locale}/blog/{variant}` | 2 | 랜딩 블로그 카드 · 목록 행 · 딥링크 | Back(→**랜딩**, 목록 아님) · 하단에 다시 붙은 전체 목록 · 드로어 |
| `/{locale}/history` | 1 | 드로어 2탭 · 결과 화면 CTA · 딥링크 | Back(→랜딩) · 드로어. **페이지 안 링크 0개** |
| `/{locale}/test/{variant}` | 2 | 랜딩 A/B · 딥링크 | Back(→history.back 또는 랜딩). **드로어 없음**(`site-gnb.tsx:134`) |
| `/{locale}/test/error` | 3 | `/test/{variant}` 서버 리다이렉트 | Back 하나뿐. **페이지 안 링크·CTA 0개** |
| `/_not-found` · global 404 | — | 미매치 | `Return home` 링크 1개(영어 고정) |

URL 을 갖지 않는 화면 상태 4종: 랜딩 모바일 확장 카드(`landing-grid-card.tsx:1225-1255`) · GNB 모바일 드로어(`site-gnb.tsx:419-442`) · GNB 설정 패널(`site-gnb.tsx:329-351`) · test instruction/qualifier 오버레이(`instruction-overlay.tsx:144-249`). 여기에 **결과 화면**(`test-question-client.tsx:281-290` 의 `submitted ? <ResultConnector/>`)이 더해진다 — 이것은 오버레이가 아니라 같은 URL 안의 phase 전환이고, §4 에서 따로 다룬다.

---

## 2. 표면별 「목표 도달까지의 동작 수」

계산 기준: 390×844, consent 이미 결정됨(배너 없음), 스크롤은 별도 열에 적는다. 「탭」은 확정 입력(click/tap)만 센다.

| 목표 | 모바일 | 데스크톱 | 차이 | 근거 |
|:---|---:|---:|:---|:---|
| 첫 문항 화면 도달(qmbti) | **3탭** + 카드까지 스크롤 | 2클릭(hover 확장) | +1탭 +스크롤 | 카드 탭(`use-landing-interaction-controller.ts:578-583`) → A/B(`landing-grid-card.tsx` ExpandedCardBody) → instruction primary(`instruction-overlay.tsx:238-245`) |
| History 도달 | **2탭**(햄버거 → 링크) | 1클릭(`site-gnb.tsx:276`) | ×2 + 모달 | `site-gnb.tsx:391-405` → `:443-466` |
| Blog 도달 | **2탭** | 1클릭(`site-gnb.tsx:287`) | ×2 + 모달 | 위와 동일 |
| 언어 변경 | **2탭 + 드로어 하단까지 스크롤 가능성** | 1 hover + 1클릭 | — | `site-gnb.tsx:468`, `settings-controls.tsx:174` |
| 블로그 상세 → 블로그 목록 | **1탭이지만 랜딩으로 간다**(§6) | 1클릭(GNB Blog 링크) | 경로 자체가 없음 | `use-gnb-back-navigation.ts:63-80` |
| 테스트 중 다른 테스트로 | **불가**(드로어 없음) → Back → 랜딩 → 스크롤 → 카드 → A/B = 4탭+ | 동일 | — | `site-gnb.tsx:134` |
| `/test/error` 에서 복구 | **불가**(Back 하나) | 동일 | — | `app/[locale]/test/error/page.tsx:44-56` |
| 동의 선택 변경 | **불가** | 불가 | — | §3 |

`8장 전부를 훑기`: 모바일 3.76화면 / 데스크톱 1.31화면(**[기주어짐]**) = **2.87배**. 「시작」 비용이 아니라 「고르기」 비용이 격차의 전부다.

---

## 3. 되돌아가기 — 브라우저 뒤로가기가 무엇을 하는가

**실측 grep(`src/` + `public/` 전체):** `popstate` 리스너 **0건** · `history.pushState` **0건** · `history.replaceState` **0건** · `history.scrollRestoration` **0건**. History API 사용은 `use-gnb-back-navigation.ts:53`(test Back)과 `:75`(일반 Back)의 `window.history.back()` 두 줄, 그리고 `:47`·`:70` 의 `history.length` 읽기뿐이다.

| 뒤로가기 대상 | 현재 동작 | 모바일 표준 |
|:---|:---|:---|
| 랜딩 모바일 확장 카드(OPEN, scrim 있음) | **페이지를 떠난다.** 카드는 닫히지 않는다 | 최상위 레이어를 닫는다 |
| GNB 모바일 드로어(`aria-modal="true"`, body 잠금) | **페이지를 떠난다** | 드로어를 닫는다 |
| GNB 설정 패널(`role="dialog"`) | **페이지를 떠난다** | 패널을 닫는다 |
| test instruction/qualifier 오버레이(`aria-modal="true"`, 포커스 트랩) | **페이지를 떠난다** | 오버레이를 닫는다 |
| qualifier step 2 → step 1 | 오버레이 안의 자체 Back 버튼(`test-question-client.tsx:329`) | 시스템 뒤로가기가 같은 일을 해야 한다 |
| 문항 N → 문항 N-1 | 카드 안의 「이전」 버튼(`test-question-client.tsx:389-404`) | 〃 |
| 결과 화면 → 문항 | 없음(phase 단방향) | 〃 |

계약이 이 층의 신설을 정면으로 막는다 — `docs/req-landing.md:632` 「닫기 경로는 `X 버튼` 또는 `카드 외부(backdrop) 탭`**만** 허용한다」는 배타적 열거이고, `docs/req-test.md:399` 「instruction 은 별도 route 가 아니라 `/test/{variant}` 위 overlay 다」는 표현 형식을 계약으로 고정한다. 사용자 결정 1·5 아래에서 둘 다 개정 대상이다.

부수 사실: 테스트 진행 중 이탈 경고가 비대칭이다. `use-before-unload-guard.ts:16-32` 의 `beforeunload` 는 **문서 언로드에만** 걸린다. 랜딩→테스트는 `router.push`(soft nav, 같은 document)이므로 그 뒤의 브라우저 뒤로가기는 popstate 이고 **경고가 뜨지 않는다**. 새로고침은 경고하고 뒤로가기는 경고하지 않는다. 응답 자체는 `test:{variant}:responses`(`test-storage-keys.ts:18`)에 남아 유실되지 않지만, 돌아올 길이 없다는 것이 §5 다.

---

## 4. 딥링크 — 공유된 URL 로 들어왔을 때 온전히 복원되는가

| URL | 복원 | 문제 |
|:---|:---|:---|
| `/{locale}` | ✅ | — |
| `/{locale}/blog` | ✅ | — |
| `/{locale}/blog/{variant}` | ✅ 기사 본문 | Back 이 목록이 아니라 랜딩으로(§6). `generateMetadata` 가 `title` 하나뿐(`blog/[variant]/page.tsx:26-28`)이라 메신저 공유 카드의 설명이 루트의 `'Reset baseline placeholder'`(`app/layout.tsx:15`) |
| `/{locale}/blog/{존재하지 않는 variant}` | ⚠️ | **아무 메시지 없이 색인으로 리다이렉트**(`blog/[variant]/page.tsx:42-45`). `routing-smoke.spec.ts:227-235` 가 그 침묵을 계약으로 고정 |
| `/{locale}/history` | ✅(빈 화면) | 페이지 안 링크 0개 |
| `/{locale}/test/{variant}` | ✅ Direct Cold / Direct Resume 전부 계약대로(`req-test.md:324-328`) | — |
| `/{locale}/test/error` | ✅ | 복구 경로 0개 |
| **결과 화면** | ❌ **URL 자체가 없다** | §4-1 |
| **랜딩 확장 카드** | ❌ URL 없음 | 「이 테스트 미리보기」를 공유할 수 없다 |
| **드로어 · 설정 · instruction** | ❌ URL 없음 | 정상(모달) |

### 4-1. 결과 화면에는 URL 이 없다

제출은 `SUBMIT` 액션으로 `phase: 'submitted'` 를 만드는 **메모리 전용 전이**다(`test-run-reducer.ts:185-190`). URL 은 `/{locale}/test/{variant}` 그대로다. 그리고 부트스트랩의 진입 모드는 `'new' | 'resume'` 둘뿐이라(`bootstrap-state-resolver.ts:16`) **submitted 를 복원하는 경로가 없다**. 귀결 셋:

1. 결과 화면에서 새로고침하면 마지막 문항 + Submit 버튼으로 돌아간다(응답은 남아 있으므로 Submit 을 한 번 더 눌러야 한다).
2. 결과 화면에서 브라우저 뒤로가기를 하면 문항으로 돌아가는 것이 아니라 **테스트 라우트 자체를 떠난다**.
3. 결과를 공유·북마크할 수 없다.

계약은 이미 다른 형태를 규정해 두었다 — `docs/req-test.md:771` 의 `/result/{variant}/{type}?{base64Payload}`. 구현은 0건이다(실측: `grep -rn "'/result\|/result/\|resultUrl\|base64\|btoa\|atob" src` → 0). **그런데 그 규정된 URL 모양이 저장소의 라우팅 가드 셋과 충돌한다**: ⑴ `scripts/qa/check-phase1-contracts.mjs:26-32` 는 모든 `page.tsx` 가 `src/app/[locale]/**` 아래일 것을 강제하므로 locale 없는 최상위 `/result/...` 는 파일을 만드는 순간 막힌다. ⑵ `src/i18n/proxy-policy.ts:11` 의 locale-less 허용목록은 `/blog`·`/blog/[variant]`·`/history`·`/test/[variant]` 넷 고정이고 `docs/req-landing.md:139` 가 그것을 계약으로 못박는다 — `/result/...` 는 런타임 404 다. ⑶ `src/lib/routes/route-builder.ts:1-29` 의 `LocaleFreeRoute` 유니온과 `src/i18n/localized-path.ts:7-15` 의 조건부 타입 체인에도 없다. **결과 IA 는 지금 정하는 것이 가장 싸다 — 구현이 0이라 고칠 것이 없고, 대신 `req-test.md §5.1` 의 URL 모양을 `/{locale}/result/...` 로 옮기는 개정이 선행돼야 한다.**

---

## 5. 중단된 회차에 돌아갈 입구가 IA 에 없다

`req-test.md:328` 이 Direct Resume(「valid active run 존재 시 프롬프트 없이 즉시 재개」)를 계약으로 두고 구현도 있다(`storage/active-run.ts:6` 30분 타임아웃 · `bootstrap-state-resolver.ts`). 그런데 **그 경로로 들어갈 UI 가 어디에도 없다**:

- 랜딩 카드에 진행 중 표시가 없다 — `grep -rn "resume\|Resume" src/features/landing/ src/features/variant-registry/` **0건**(실측).
- `src/messages/en.json` 전체에 `resume`·`inProgress`·`continue`(동사) 문자열이 없다(실측: `continue` 는 consent 안내문 한 곳뿐).
- 히스토리는 빈 화면이다(§7).

즉 사용자는 「내가 하던 테스트가 무엇이었는지」를 스스로 기억하고, 3.76화면을 스크롤해 그 카드를 찾아 다시 탭해야 한다. 그리고 그렇게 다시 탭하면 랜딩 A/B 재선택은 `req-test.md:335` 에 따라 **restart intent** 로 처리돼 기존 회차가 새 staged entry 로 대체된다 — **재개하려다 처음부터 다시 하게 되는 경로가 가장 찾기 쉬운 경로다.** 30분 타임아웃은 페이지 로드 시점에만 평가되므로(`active-run.ts:6,66`) 모바일에서 흔한 「탭 백그라운드 → 복귀」는 다음 로드에서 회차가 사라진 것으로 나타난다.

---

## 6. 「위로」 내비게이션이 없다 — 블로그 상세의 Back

`site-gnb.tsx:379` 의 모바일 Back 은 blog/history 컨텍스트에서 `handleStandardBack`(`use-gnb-back-navigation.ts:63-80`)을 부른다. 그 안의 판정은 `shouldUseHistoryBack`(`behavior.ts:29-43`)이고 조건은 **`history.length > 1` AND `document.referrer` 의 origin 이 현재 origin과 같을 것**이다. 거짓이면 `router.push(homeHref, {scroll:false})` 이고 `homeHref` 는 `/{locale}`(`site-gnb.tsx:130`) — **부모인 `/{locale}/blog` 가 아니다.**

`document.referrer` 는 **문서 로드 시점의 값**이고 Next App Router 의 소프트 내비게이션으로는 갱신되지 않는다. 그래서:

- 트위터/카톡 링크로 기사에 들어온 사용자 → referrer 가 외부 origin → 거짓 → 랜딩으로 push. **push 이므로 히스토리 항목이 하나 더 쌓이고, 그 상태에서 브라우저 뒤로가기를 하면 기사로 되돌아온다** — Back 버튼과 시스템 뒤로가기가 서로를 되돌리는 루프. *(루프의 실제 발생은 브라우저 미검증 — **[미확인]**. referrer 판정과 push 는 코드로 확정.)*
- `/{locale}/blog` 를 주소창에 직접 입력 → referrer 빈 문자열 → 기사로 소프트 이동 → Back → **거짓 → 랜딩**. 목록이 히스토리 스택 안에 실재하는데도 건너뛴다.
- `push` 는 back 이 아니므로 목록의 스크롤 위치가 복원되지 않는다.

그리고 **블로그 상세 페이지 안에는 목록으로 가는 링크가 없다**(`blog-destination-client.tsx:110-146` 전수). 대신 전체 목록이 기사 아래에 통째로 다시 렌더되고, 지금 읽고 있는 기사도 그 안에 `data-selected="true"` 로 들어가 자기 자신을 가리키는 링크가 된다(`:122-136`).

**계약이 이 행선지를 규정하지 않는다.** `req-landing.md:244` 는 `Mobile Test Back: 우선 history.back, 불가 시 /{locale}로 fallback` 을 못박지만, `:245` 의 `Mobile Blog: Back + 햄버거` 는 Back 의 **행선지를 한 글자도 적지 않는다**. 게이트도 없다 — `handleStandardBack` 의 행선지를 단언하는 E2E 가 0건이고(실측: `gnb-mobile-back` 은 `gnb-smoke.spec.ts:983` 의 포커스 단언 한 곳에서만 쓰인다), 검증은 순수 함수 `shouldUseHistoryBack` 의 단위 테스트(`tests/unit/gnb-behavior.test.ts:79-107`)뿐이다.

---

## 7. 현재 위치 표시

**있다. 단, 데스크톱에만 상시로 있다.**

- 데스크톱 행: History/Blog 링크에 `aria-current="page"` + accent dot(`site-gnb.tsx:280,283-285` · `:291,294-296`). 판정은 `isCurrentSection`(`:110-120`)이고 `/blog/[variant]` 도 `blog` 로 접는다.
- 드로어: 같은 신호가 Home/History/Blog 세 링크에 붙는다(`site-gnb.tsx:459-461`). 하지만 **드로어를 열어야 보인다**(2탭).
- **모바일 바에는 화면 이름이 없다.** leading 은 CI 링크(랜딩) 또는 Back 버튼, trailing 은 햄버거 또는 `00:00` 타이머뿐이다(`site-gnb.tsx:370-394`). 제목 슬롯이 존재하지 않는다. iOS 내비게이션 바의 title, Material 3 top app bar 의 headline 이 있는 자리가 비어 있다 **[관행]**.
- 랜딩에서만 존재하는 CI 링크는 현재 URL 과 같은 `homeHref` 를 가리키고 `scroll={false}` 다(`site-gnb.tsx:373`) — 랜딩에서 누르면 **관측 가능한 변화가 없다**. 모바일 관행에서 타이틀 바 탭은 최상단 복귀인데(iOS), 그 자리에 아무것도 안 하는 컨트롤이 있다.
- 히스토리 페이지는 제목(`Local Result History`)을 본문 `<h1>` 으로 갖는다(`history/page.tsx:46`). 블로그 상세의 `<h1>` 은 12px 짜리 `Selected article` 이다(`blog-destination-client.tsx:112`). test 라우트의 `<h1>` 은 카드 제목이다(`test-question-client.tsx:255`). **셋이 서로 다른 규칙으로 「여기가 어디인지」를 말하고, 그 어느 것도 스크롤하면 사라진다**(sticky 아님).

---

## 8. 엄지 도달 — 주요 액션의 세로 위치

390×844 기준. GNB 56px + `<main pt-20>` 80px = **본문 시작 y=136px**(`site-gnb.tsx:41` · `page-shell.tsx:22`). 토큰은 `globals.css:201-222`.

| 표면 | 주요 액션 | 계산된 y | 판정 |
|:---|:---|:---|:---|
| instruction 오버레이 | `시작` / `동의하고 시작`(유일 CTA) | **189.4 – 235.4**(상단 22–28%) | **최악**. 우측 정렬(`instruction-overlay.tsx:227` `justify-end`), 시트의 72%(608px)가 빈 화면 |
| 문항 화면 | 답변 A / B | 303 – 407 | 중앙. 무난 |
| 문항 화면 | 이전 / 제출 | 423 – 469 | 무난. 단 카드 아래 **309.6px(36.7%)가 빈 공간** |
| 문항 화면 | 진행 바 | 214.85 – 220.85 | **sticky 아님** — 스크롤이 생기는 순간 사라진다 |
| 결과 화면 | 랜딩으로 / 이력 보기 | ≈793 – 839 | 우연히 하단. 문항 9개·긴 로케일·844px 미만 기기 중 하나만 생겨도 스크롤 밖으로 나간다 |
| 랜딩 | (페이지 수준 CTA 없음) | — | 카드 A/B 는 스크롤 위치에 종속(§10) |
| 랜딩 | 햄버거 | 6 – 50, 우상단 | **상단 6%**. 모바일에서 가장 자주 누르는 내비 컨트롤이 가장 먼 자리 |
| 히스토리 | (액션 0개) | — | — |
| `/test/error` | (액션 0개) | — | — |
| 404 두 장 | `Return home` | ≈399 – 445(수직 중앙) | 무난 |
| 동의 배너 | Accept / Deny / Preferences | 하단 고정 | **유일하게 올바른 자리** |

**저장소 전체의 sticky/fixed 전수(실측 grep, 6건):** GNB 셸 `sticky top-0`(`site-gnb.tsx:38`) · 확장 카드 헤더 `sticky top-0`(`landing-grid-card.tsx:287`) · 드로어 레이어 `fixed inset-0`(`site-gnb.tsx:80`) · transition GNB 오버레이(`transition-gnb-overlay.tsx:14`) · 카드 transient shell(`landing-grid-card.tsx:292`) · 동의 배너(`consent-banner.tsx:21`). **하단 액션 바·탭 바·sticky CTA 는 0건이다.**

sticky CTA 가 필요한 지점 넷: ⑴ instruction 시트의 primary CTA, ⑵ 문항 화면의 진행 바(상단 sticky)와 제출 버튼(하단 sticky), ⑶ 결과 화면의 CTA 행, ⑷ 전 표면 공통의 하단 내비(§9).

전제 조건이 빠져 있다 — `env(safe-area-inset-bottom)` 참조는 저장소 전체에 **2곳**(`site-gnb.tsx:87` 드로어 패딩 · `consent-banner.tsx:21` 배너 오프셋)뿐이고 `top/left/right` 는 **0곳**이다(실측). `100dvh` 는 4곳뿐이고 `page-shell.tsx:19` 와 `app-body-class.ts:19` 는 `min-h-screen`(=`100vh`)이다. 하단 고정 액션을 넣기 전에 이 둘을 먼저 세워야 한다.

---

## 9. 모바일에 상시 1차 내비게이션이 없다

`SiteGnb` 는 `PageShell` 안에 있고(`page-shell.tsx:21`), `PageShell` 은 여섯 개 `page.tsx` 가 **각자** 렌더한다(`[locale]/page.tsx:26` · `blog/page.tsx:25` · `blog/[variant]/page.tsx:50` · `history/page.tsx:34` · `test/[variant]/page.tsx:54` · `test/error/page.tsx:38`). `[locale]/layout.tsx` 에 GNB 가 없으므로 **라우트가 바뀔 때마다 GNB 가 언마운트·재마운트된다.** `TransitionGnbOverlay`(`transition-gnb-overlay.tsx:14-32`)가 존재하는 이유가 정확히 그 공백을 가리기 위해서다.

그 결과 모바일의 모든 섹션 이동이 **모달을 거친다**: 햄버거 → 드로어(`aria-modal="true"`, body 스크롤 잠금) → 링크 → 드로어 언마운트 → 새 GNB 마운트. 항목은 셋뿐이다(Home · History · Blog). 그리고 `mobileMenuEnabled = context !== 'test'`(`site-gnb.tsx:134`)이므로 **`/test/{variant}` 와 `/test/error` 에서는 드로어가 아예 없다** — 그 두 라우트에서 History·Blog·테마·언어에 닿을 경로가 0이다. 이것은 계약이 그렇게 요구한다(`req-landing.md:242-243`).

GNB 를 `[locale]/layout.tsx` 로 올리면 ⑴ 라우트 간 지속되는 하단 탭 바가 가능해지고, ⑵ `TransitionGnbOverlay` 전체(그리고 그것이 만드는 키보드 타깃 오염, `use-gnb-keyboard-targets.ts:32-33` 가 `document.querySelector('.gnb-desktop')` 로 DOM 첫 번째를 잡는 문제)가 불필요해진다. 두 Ask-First 경로(`src/app/[locale]/layout.tsx`, GNB)를 동시에 건드리는 변경이다.

---

## 10. 확장 카드가 화면 밖에서 열린다

모바일 확장은 in-flow 이고 계약이 y-anchor 무편차를 요구한다 — `req-landing.md:625`(「in-flow 위치를 유지하며 top jump 를 금지한다」) · `:626`(transition window 동안 y-anchor 편차 없음) · `:652`(카드 인덱스/스크롤 위치/콘텐츠 길이에 따른 예외 불허). 확장 본문의 최대 높이는 `max-h-[calc(100dvh-116px)]` = **728px**(`landing-grid-card.tsx:285`)이다.

카드 pitch 는 255 + 15 = **270px** 이므로(`landing-catalog-grid.tsx:211` `gap-[15px]`, 카드 높이 §11) 어느 카드의 상단이든 뷰포트 안에서 0~270px 어디에나 놓일 수 있고, 화면 아래쪽 카드를 탭하는 것은 일상적이다. 상단이 y=700 인 카드를 탭하면 **728px 짜리 본문 중 144px 만 화면에 있고 나머지 584px 은 접힌 화면 밖에 열린다.** 그리고 `req-landing.md:641` 이 「자동 viewport 보정 스크롤을 금지한다」고 못박으므로 **표준 해법(`scrollIntoView`)이 계약으로 봉쇄돼 있다** — 실제로 `scrollIntoView` 는 `src/` 전체에 0건이다(실측).

결합 효과: 그 상태에서 `OPEN` 은 페이지 스크롤 잠금이 풀려 있고(`use-mobile-scroll-lock.ts:5-7`, 계약 `:641`) backdrop 은 `touch-pan-y` 로 세로 패닝을 허용한다(`landing-catalog-grid.tsx:31`). 즉 **scrim 이 깔린 채 배경이 스크롤되는 화면에서, 방금 연 콘텐츠를 보려면 그 배경을 스크롤해야 한다.**

---

## 11. 랜딩 3.76화면 — IA 인가 밀도인가

### 11-1. 카드 1장의 높이를 토큰에서 재구성했고, 실측과 일치한다

390px 뷰포트 → `<main px-[var(--shell-gutter)]`(16px, `globals.css:323`) → 카드 폭 **358px** → 카드 패딩 16px(`landing-grid-card.tsx:1058` `[padding:16px]`) → 내부 폭 **326px**.

| 블록 | 근거 | 높이 |
|:---|:---|---:|
| 패딩 상 | `landing-grid-card.tsx:1058` | 16.00 |
| 썸네일 `aspect-[16/6]` | `landing-grid-card.tsx:223` → 326 × 6/16 | **122.25** |
| base_gap | `spacing-plan.ts:1` `LANDING_CARD_BASE_GAP_PX = 8` | 8.00 |
| 제목 `--t-card-title` 1줄 | `globals.css:219` = 600 20px/1.3 | 26.00 |
| base_gap | 〃 | 8.00 |
| 부제 `--t-card-subtitle` 1줄 | `globals.css:220` = 400 15px/1.45 | 21.75 |
| tags-gap = base_gap + comp_gap(모바일 1열이라 항상 0) | `landing-grid-card.tsx:227` | 8.00 |
| 태그 행 `min-h-7` | `landing-grid-card.tsx:225` | 28.00 |
| 패딩 하 | 〃 | 16.00 |
| **합** | | **254.00** |

프롬프트의 실측 카드 크기는 **358×255**(**[기주어짐]**) — 1px 이내로 일치한다. 계산 모델이 맞다.

### 11-2. 판정: 밀도다

- **카드 1장에서 제목+부제(카드를 서로 구별시키는 유일한 것)는 47.75px = 18.8%** 다. 썸네일 하나가 122.25px = **48.1%** 이고, 콘텐츠와 무관한 고정 구조(썸네일 + 태그 행 + 패딩·간격)의 합은 **206.25px = 81.2%** 다.
- 그리드 최소 높이 = 8 × 255 + 7 × 15 = **2,145px**. 실측 문서 높이 3,173px(**[기주어짐]**)의 **67.6%**.
- 첫 카드 위 크롬 = 315px(**[기주어짐]**)로 문서의 **9.9%**. 그 내역은 GNB 56 + `pt-20` 80 = 136, 히어로 ≈179.
- 그리드 아래 잔여 ≤ 3,173 − 315 − 2,145 = **713px**(≤22.5%). `pb-6` 24px + 동의 배너 spacer + 카드 일부가 픽스처의 긴 부제로 255px 을 넘는 몫.

**결론: IA 를 완전히 정리해도(히어로 제거 + 상단 여백 정상화) 회수 가능한 것은 문서의 약 10% 이고, 카드 높이를 255 → 120px 로 낮추면 34% 가 회수된다.** 8장은 IA 로 쪼갤 규모가 아니고(섹션도 필터도 8개에는 과하다), `design.md:293` 이 **「one continuous card grid — no section dividers, labels, or row headings」** 로 그룹핑을 명시적으로 금지하고 있다. 즉 **해법은 리스트 밀도이지 IA 분할이 아니다.**

다만 밀도 변경은 계약 두 곳을 건드린다 — `req-landing.md:287`(모바일 Normal 부제 clamp 금지, 구현 `landing-grid-card.tsx:408`)과 `design.md §7.2:298`(콘텐츠 순서 Thumbnail → Title → Subtitle → Tags). 세로 카드를 가로 리스트 행으로 바꾸면 순서는 유지되지만 배치가 바뀐다.

---

## 12. 히어로는 `design.md` 가 금지한 요소다

`design.md:291` — **「No hero. No marketing band, no large headline, no illustration band.」** `:292` 는 그 자리에 **「a single minimal eyebrow line (brief service description + catalog count)」** 를 두고 「reserves space for future search/filter」라고 적는다.

제품은 히어로를 렌더한다 — `src/app/[locale]/page.tsx:28-31` 의 `<section className="landing-hero grid gap-3 py-5 pb-4" aria-label="Landing Hero">` 안에 `clamp(1.5rem,2.4vw,2.2rem)`(390px 에서 24px) 짜리 `<h1>` 과 `max-w-[70ch]` 본문 `<p>`. 카피는 `Find your working rhythm in one pass` + 2문장(`src/messages/en.json` `landing.heroTitle`/`heroBody`)으로, 문면 그대로 marketing headline 이다.

그리고 `req-landing.md:212-213` 은 `### 6.3 Hero & Visual Baseline` 이라는 절을 두고 히어로의 존재를 전제한다. **두 SSOT 가 정면으로 모순하며, `AGENTS.md §2` 의 Visual source precedence(product requirements > design.md)에 따라 현행은 req-landing 쪽이 이긴다 — 그러나 이 갈림은 `docs/decision-register.md` 에 등재돼 있지 않다** *(등재 여부는 키워드 검색만 했고 전문 통독하지 않았다 — **[미확인]**)*.

모바일 영향: 히어로 ≈179px = 844px 뷰포트의 **21.2%**, 첫 화면에서 카드에 도달하기 전에 소모되는 315px 의 57% 다. `design.md` 가 규정한 eyebrow 한 줄(caption 13px/1.45 = 18.85px + 여백)로 바꾸면 약 **140px** 이 회수되고 첫 화면에 카드가 1장 더 들어온다.

---

## 13. 동의 「Deny」는 되돌릴 수 없는 문이고 카탈로그를 4분의 1로 줄인다

- `isCatalogVisibleCard`(`src/features/variant-registry/attribute.ts:56-58`): `available` 카드는 `consentState !== 'OPTED_OUT'` 일 때만 보인다. 계약은 `req-landing.md:1029` — 「Disagree All 선택 시 카탈로그에는 opt_out 카드와 unavailable 카드만 남는다」.
- 픽스처 기준 end-user 카탈로그 8장(test 5 + blog 3) → **OPTED_OUT 에서 2장**(`energy-check`=opt_out, `creativity-profile`=unavailable), 그중 진입 가능한 것은 **1장**.
- 배너는 `consentState === 'UNKNOWN'` 일 때만 렌더된다(`telemetry-consent-banner.tsx:12`). 한 번 선택하면 **다시 나타나지 않는다.**
- `Preferences` 버튼의 핸들러는 빈 함수다 — `onPreferencesAction={() => {}}`(`telemetry-consent-banner.tsx:32`), `title` 은 `"Preferences panel coming soon"`.
- `setTelemetryConsentState` 의 프로덕션 호출처는 배너 두 줄(`:27`,`:30`)과 `use-test-entry-orchestrator.ts:61`(instruction 오버레이의 `accept_all_and_start`) 셋뿐이다(실측). 마지막 경로는 **OPTED_OUT 사용자에게 숨겨진 카드의 URL 을 직접 입력해야** 닿는다.
- 배너 본문은 `"You can choose whether to allow optional cookies, and you can change your choice at any time."`(`src/messages/en.json` `consent.message`)다.

**모바일 사용자가 한 번의 탭으로 카탈로그의 4분의 3을 잃고, 그것을 되돌릴 UI 가 제품에 존재하지 않는다.** 그리고 배너 카피가 그 반대를 약속한다.

덧붙여 **개인정보/약관으로 가는 경로가 제품 전체에 없다** — `<footer>` 는 `src/` 전수 grep **0건**이고, `design.md:295` 는 「The **footer** is low-emphasis chrome: anonymous statement, privacy/terms links, locale toggle」을 규정한다. 동의를 묻되 무엇에 동의하는지 읽을 곳이 없다.

---

## 14. 히스토리가 막다른 길이고, 결과 화면 CTA 가 그리로 보낸다

`src/app/[locale]/history/page.tsx:33-51` 전체가 빈 상태 하나이고 **링크·버튼이 0개**다. 본문 세 번째 줄은 디버그 문자열 `Locale: en` 이다(`:48`; 같은 파일 `:10-11` 주석이 그것을 보고 대상이라 적는다). 라벨은 이미 12 locale 번역돼 있는데 소비자가 없다 — `history.goHome` · `history.open` · `history.delete` · `history.clearAll` 4개 × 12 = 48 문자열.

그리고 `src/features/test/test-result-panel.tsx:95-99` 가 결과 화면에 `RouteBuilder.history()` 로 가는 CTA 를 놓는다. **테스트를 막 끝낸 사용자가 그것을 누르면, 방금 한 실행이 저장되지 않은 채 「완료된 실행은 항목으로 저장된다」고 적힌 빈 화면에 도착하고, 그 화면에서 나갈 링크가 없다**(GNB Back 만 남는다). 저장 계층 자체가 없다 — `grep -rn "resultHistory\|result-history\|HISTORY" src/` 무매치.

`docs/design/ds/README.md:66` 은 저장소 자신의 규칙으로 「Empty states are one line of guidance + one action」을 적고, 설계 표본은 그 자리에 `Browse tests` 버튼을 그린다(`docs/design/ds/preview/secondary-surfaces.html:33`).

---

## 15. `/test/error` 는 출구가 0개다

`src/app/[locale]/test/error/page.tsx:44-56` 이 렌더하는 것은 `aria-hidden` X 아이콘 하나와 `<h1>` 하나뿐이다. **링크·버튼 0개.** 그리고 `context="test"` 이므로 `mobileMenuEnabled = false`(`site-gnb.tsx:134`) → 모바일 GNB 는 Back + `00:00` 타이머만 그린다(`site-gnb.tsx:377,411`). **에러 화면에 동작하지 않는 러닝 타이머가 떠 있고, 유일한 컨트롤은 Back 하나다.**

계약이 이것을 이미 금지하고 있다 — `docs/req-test.md:317`(§3.2) **「에러 복구 페이지는 사용자가 다른 테스트를 선택할 수 있는 복구 경로를 제공해야 한다」**. 이것은 Phase 4 확장 조항이 아니라 현행 §3.2 불변식이다. 복구 카드 선정 규칙(`:846-856`)만이 Phase 4 로 분리돼 있다.

그 Back 의 동작: `handleTestBack`(`use-gnb-back-navigation.ts:38-61`)은 sessionStorage 의 `PREVIOUS_PATH` 가 있으면 `history.back()` 을 부르고 220ms 뒤 pathname 이 그대로면 랜딩으로 push 한다. 이 페이지에 온 경로는 `/test/{variant}` 의 **서버 리다이렉트**이므로 `history.back()` 은 그 리다이렉트 소스로 돌아가고 다시 여기로 리다이렉트될 수 있다. 220ms 폴백이 그것을 잡을지는 리다이렉트 완료 타이밍에 달린 경합이다 — **[미확인]**(브라우저 재현 필요).

---

## 16. 작은 것들

- **결과 CTA 가 랜딩을 두 번 스크롤한다.** `test-result-panel.tsx:91` 의 `<Link href={landingPath}>` 에 `scroll={false}` 가 없다. Next 기본은 상단 이동이고, 그 직후 `LandingRuntime` 의 이펙트가 `LANDING_RETURN_SCROLL_Y` 를 읽어 다시 `window.scrollTo` 한다(`landing-runtime.tsx:56-64`; 성공한 전환은 그 레코드를 지우지 않는다 — `req-landing.md:1004` 는 consume 을 랜딩 mount 에서만 한다). 같은 저장소의 GNB 랜딩 링크 세 곳은 전부 `scroll={false}` 를 붙인다(`site-gnb.tsx:264,373,446`). 어휘가 이미 있는데 이 한 곳만 빠졌다. *(시각적 점프의 실제 가시성은 **[미확인]**.)*
- **복귀 대상 카드를 저장해 놓고 쓰지 않는다.** `saveLandingReturnScrollY(window.scrollY, input.sourceVariant)`(`transition/runtime.ts:49`)가 `LANDING_RETURN_VARIANT` 를 쓰고 `readLandingReturnVariant`/`consumeLandingReturnVariant`(`store.ts:179-194`)가 있는데, 프로덕션 소비자는 **0곳**이다(실측: `store.ts` 자신과 `tests/unit/landing-transition-store.test.ts` 뿐). 그래서 테스트를 마치고 랜딩으로 돌아오면 스크롤만 맞고, 1열 3.76화면 목록에서 「내가 어느 카드에서 출발했는지」를 표시하는 신호가 없다.
- **블로그 상세가 자기 자신을 링크한다.** `blog-destination-client.tsx:122-136` 이 현재 기사도 목록에 넣고 `data-selected="true"` 를 붙인 뒤 같은 URL 로 가는 `<Link>` 로 만든다. 누르면 같은 페이지로 이동한다.
- **첫 방문 모바일에서 동의 배너가 탐색 밴드를 덮는다.** `fixed inset-x-0 bottom-[max(16px,env(safe-area-inset-bottom))]`(`consent-banner.tsx:21`)이고 390px 에서는 `max-[719px]:flex-wrap`(`:241`)으로 메시지 행 + 액션 행 2단이 된다. 회피 프로토콜 `data-consent-banner-avoid` 를 다는 것은 **확장 카드 세 곳뿐**(`landing-grid-card.tsx:863,1229,1262`)이라 접힌 카드를 훑는 동안에는 배너가 비켜서지 않는다. SSR 예약값 120px 은 `1280×720` 에서만 실측됐다고 주석이 밝힌다(`consent-banner.tsx:15-18`). **390px 실제 높이는 미측정 — [미확인]**(gnb 지도의 계산값은 190~250px).

---

## 17. 훑은 표면과 훑지 못한 표면

훑음: landing(`app/[locale]/page.tsx` · `landing-catalog-grid.tsx` · `landing-grid-card.tsx` 전수 아님/IA 관련 구간 · `landing-runtime.tsx` 전수) · test(`test-question-client.tsx` 전수 · `instruction-overlay.tsx` 전수 · `test-result-panel.tsx` · `test-run-reducer.ts` · `bootstrap-state-resolver.ts` 전반부 · `use-before-unload-guard.ts` 전수 · `storage/active-run.ts` 전반부) · blog(`blog/page.tsx` · `blog/[variant]/page.tsx` 전수 · `blog-destination-client.tsx` 전수) · history(`history/page.tsx` 전수) · gnb(`site-gnb.tsx` 전수 · `behavior.ts` 전수 · `use-gnb-back-navigation.ts` 전수) · settings(`settings-controls.tsx` 는 GNB 지도 인용 + IA 관련 구간만) · error(`test/error/page.tsx` 전수) · 404 2장(전수) · global(`page-shell.tsx` · `layout.tsx` · `app-body-class.ts` · `proxy-policy.ts` · `route-builder.ts` · `consent-banner.tsx` · `telemetry-consent-banner.tsx` · `attribute.ts` · `transition/runtime.ts` · `transition/store.ts`).

훑지 못함: ⑴ `src/features/landing/grid/use-landing-interaction-controller.ts`(738줄)와 모바일 생명주기 훅 6종의 **전문** — IA 결론에 필요한 분기만 다른 지도를 통해 확인했다. ⑵ `tests/e2e/state-smoke.spec.ts` · `transition-telemetry-smoke.spec.ts` 의 모바일 lifecycle 블록 본문 — 게이트 목록은 파일·단언 이름 수준에서만 채웠다. ⑶ `docs/req-landing.md` §13.3 handshake 12개 불변식(`:865-882`) 전문 — §13.8 만 읽었다. ⑷ `docs/req-test.md` §7~§9(결과·로딩·telemetry hook) 전문 — §5.1 과 §3.3/§6.1 만 읽었다. ⑸ **브라우저를 한 번도 띄우지 않았다** — §6 의 뒤로가기 루프, §10 의 화면 밖 확장 실제 폭, §15 의 리다이렉트 경합, §16 의 이중 스크롤 가시성, 390px 동의 배너 실제 높이는 전부 재현·측정이 필요하다.
