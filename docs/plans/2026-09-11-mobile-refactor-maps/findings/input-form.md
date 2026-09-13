# input-form — 입력 컨트롤 · 키보드 · 선택 UI

- **렌즈** input-form · **작성** 2026-09-11 · **Task mode** Analysis Only (읽기 전용, 저장소 무변경)
- **대상** `/Users/woohyeon/Local/.claude-clones/mobile-refactor-analysis` (HEAD `7616211`, 그 부모가 `a5aec95`)
- 모든 `file:line` 은 저장소 상대경로다. 숫자는 **[측정]**(baseline PNG 픽셀 스캔 또는 Tailwind 컴파일) · **[계산]**(클래스 체인에서 유도) · **[미확인]** 셋 중 하나로 표시한다.

---

## 0. 이 앱의 입력 지점 — 전수

`src/` 전체에 **네이티브 폼 컨트롤이 하나도 없다.** `<input>` · `<select>` · `<textarea>` · `<form>` · `inputMode` · `autoComplete` · `enterKeyHint` · `contentEditable` 전수 grep 0건이다. 따라서 「select 가 모바일에서 네이티브 피커를 띄우는가」는 질문 자체가 성립하지 않고(셀렉트가 없다), 「소프트 키보드가 입력란을 가리는가」도 현재는 해당 사항이 없다 — 텍스트 입력이 0개이기 때문이다. `docs/req-test.md:33` 이 「닉네임 입력」을 명시적 non-goal 로 두고 있어 이것은 누락이 아니라 결정이다. (`public/56T-ToDo.html` 은 578KB 짜리 무관한 개인용 HTML 이 `public/` 에 추적된 채 남아 있는 것이고 ViveTest 표면이 아니다 — 이 렌즈의 대상에서 제외했으나 저장소 위생 항목으로 남긴다.)

`role=` 전수 census: `dialog` 4 · `progressbar` 1 · `img` 1 · `button` **1**. `aria-live` · `role="status"` · `role="alert"` 는 **0건**이다. `tabIndex` 사용은 14곳이고 그중 비네이티브 컨트롤은 `qualifier-chip.tsx:26` 하나뿐이다.

| # | 입력 지점 | 파일 | 요소 | 높이 | 선택 상태 노출 | 누름 피드백 |
|---:|:---|:---|:---|---:|:---|:---|
| 1 | 테스트 답변 A/B | `src/features/test/test-question-client.tsx:360-385` | `<button type="button">` ×2 | **48px** [측정] | **없음** (`data-selected` 만) | **없음** |
| 2 | qualifier 선택지 | `src/features/test/instruction-overlay.tsx:165-178` | `<button type="button">` ×N | 48px [계산] | **없음** (`data-selected` 만) | **없음** |
| 3 | qualifier recap 칩 | `src/features/test/qualifier-chip.tsx:24-32` | **`<div role="button" tabIndex={0}>`** | **32px** [계산] | 해당 없음 | **없음** |
| 4 | 이전 / 제출 | `test-question-client.tsx:389-418` | `<button>` | 46px [계산] | — | primary 있음 / secondary 있음 |
| 5 | instruction primary/secondary CTA | `instruction-overlay.tsx:228-245` | `<button>` | **46px / 44px** [측정 46] | — | primary 있음 / quiet **없음** |
| 6 | GNB 테마 칩 ×2 | `src/features/gnb/components/settings-controls.tsx:144-162` | `<button aria-pressed disabled>` | **44px**(mobile) [측정] / 44px(desktop) | `aria-pressed` | **없음** |
| 7 | GNB 로케일 칩 ×12 | `settings-controls.tsx:174-186` | `<button aria-pressed disabled>` | **44px**(mobile) [측정] / **32px**(desktop) [계산] | `aria-pressed` | **없음** |
| 8 | 동의 배너 수락/거부/설정 | `src/features/landing/shell/consent-banner.tsx:249-273` | `<button>` ×3 | 46 / 46 / 44px [계산] | — | 있음 / 있음 / **없음** |
| 9 | 랜딩 카드 트리거 | `src/features/landing/grid/landing-grid-card.tsx:1170-1200` | `<button>` | 카드 전체 | `aria-expanded`(데스크톱만) | **없음** |
| 10 | 랜딩 확장 카드 A/B | `landing-grid-card.tsx:683-697` | `<button>` ×2 | 48px [계산] | — (탐색 액션) | **없음** |
| 11 | 랜딩 모바일 닫기 X | `landing-grid-card.tsx:1236-1245` | `<button aria-label>` | 44px | — | **없음** |
| 12 | GNB 뒤로 / 햄버거 / 설정 트리거 | `src/features/gnb/site-gnb.tsx:254,377,391,310` | `<button aria-label>` | 44px | `aria-expanded` | **있음** |
| 13 | GNB 드로어 nav 링크 ×3 | `site-gnb.tsx:454` | `<Link>` | 44px | `aria-current="page"` | **없음** |
| 14 | 블로그 목록 행 | `src/features/blog/blog-destination-client.tsx:129-135` | `<Link>` | ≥44px [계산] | **없음**(`data-selected` 는 `<li>` 에) | **없음** |
| 15 | 404 복귀 링크 | `src/app/not-found.tsx:38` · `global-not-found.tsx:53` | `<Link>` | 46px | — | **없음** |
| 16 | `/test/error` | `src/app/[locale]/test/error/page.tsx:44-56` | **없음 (0개)** | — | — | — |
| 17 | `/{locale}/history` | `src/app/[locale]/history/page.tsx:33-51` | **없음 (0개)** | — | — | — |

---

## 1. 두 개의 결정적 컴파일 측정 — 두 지도의 미확인 항목을 닫는다

**측정 ①: `min-h-[var(--tap-min)]` 가 `min-h-8` 을 이긴다 — 순서 무관.** Tailwind v4.1.0 을 clone 의 `node_modules` 로 직접 컴파일한 결과 `.min-h-8` 이 오프셋 4325, `.min-h-\[var\(--tap-min\)\]` 가 4384 로 emit 되고, 후보 입력 순서를 뒤집어도 같다(프로브: `/private/tmp/claude-501/-Users-woohyeon-Local-ViveTest/91a75431-b18f-466b-8d47-1b306568872a/scratchpad/analysis/tw-order4.mjs`). 따라서 `surface-gnb` 지도의 미확인 #2 와 `settings-controls.tsx:33-37` 주석이 열어 둔 질문은 닫힌다 — **드로어 안 로케일 칩·테마 칩은 44px 이다.** baseline PNG 픽셀 스캔이 이를 확증한다: `theme-state-mobile-landing-menu-open-en-light-mobile` 에서 선택된 `English` 칩이 y 612..655 = **44px**, 그 아래 세 줄도 각각 664..707 · 716..759 · 768..811 로 전부 44px, 줄 간격 8px. 테마 스와치는 x=295 에서 y 556..599 = 44px. **즉 모바일 설정 레이어의 터치 타깃 크기는 문제가 아니다.** 문제는 그 다음 두 절(§3 · §4)에 있다.

**측정 ②: 터치 기기에 누름 피드백이 구조적으로 0이다.** 같은 컴파일에서 `hover:` 는 `&:hover { @media (hover: hover) { … } }` 로만 emit 되고(터치 기기에서 발동하지 않는다), `active:` 는 `&:active` 로 미디어 게이트 없이 emit 된다. 그리고 **Tailwind preflight 가 `html, :host { -webkit-tap-highlight-color: transparent }` 를 깐다** — 네이티브 탭 하이라이트라는 마지막 안전망이 꺼져 있고, 저장소에는 이것을 되돌리는 선언이 없다(전수 grep: `src/` 0건). 저장소 전체에서 `active:` 를 쓰는 클래스 문자열은 **4개뿐**이다(`src/features/ui/button-class-names.ts:89,97,101` · `src/features/gnb/site-gnb.tsx:64`).

---

## 2. blocker — 규범을 명백히 위반하거나 기능에 도달하지 못한다

### F-01 답변 선택 상태가 접근성 트리에 존재하지 않는다

**무엇이 일어나는가.** 테스트 답변 A/B(`test-question-client.tsx:360-385`)와 qualifier 선택지(`instruction-overlay.tsx:165-178`)는 `<button type="button">` 에 `data-selected={…}` 만 실어 보낸다. 선택 표식인 원형 마크는 `aria-hidden="true"` 다(`test-question-client.tsx:371,384` · `surface-class-names.ts:86`). `aria-pressed` · `aria-checked` · `role="radio"` · `role="radiogroup"` · `aria-current` 가 **한 개도 없다** — 저장소 전체 `role=` census 가 `dialog`/`progressbar`/`img`/`button` 넷뿐이고 `aria-pressed` 2건은 GNB 칩 전용이다. `req-test.md:523` 은 「이미 답변된 문항을 재방문하면 기존 답변 상태가 선택된 상태로 표시되어야 한다」고 요구하는데, 그 표시는 **오직 시각적으로만** 된다.

**왜 이것이 더 나쁜가.** baseline PNG(`theme-state-mobile-test-question-en-light-mobile`)를 보면 선택 표식이 라벨 뒤에 놓인 **빈 원**이다 — 시각적으로 완전한 라디오 버튼이다. 눈으로 보는 사용자에게는 「하나만 고르는 라디오 그룹」으로 읽히는 컨트롤이, AT 에는 아무 상태도 없는 버튼 두 개로 노출된다. qualifier 단계에서는 더 심각하다: 선택이 지속되고 그 선택이 「다음」 버튼의 `disabled` 를 푸는 게이트인데(`overlay-connector.tsx:82` `continueDisabled: !qualifierDraft[…]`), 스크린리더 사용자는 자기가 무엇을 골랐는지도, 왜 다음 버튼이 활성화됐는지도 알 수 없다.

**무엇으로 바꾸는가.** 답변 쌍과 qualifier 선택지를 `role="radiogroup"`(`aria-labelledby` = 문항 `<h2>` id) + `role="radio" aria-checked` 로 바꾼다. 네이티브를 쓰려면 `<fieldset>` + `<input type="radio" class="sr-only">` + `<label>` 조합이 동등하고 모바일 폼 시맨틱까지 얻는다. 어느 쪽이든 WAI-ARIA APG 의 radio group 키보드 계약(화살표로 이동·선택, 그룹 전체가 탭 스톱 하나, roving `tabindex`)을 함께 구현한다 — 지금은 두 선택지가 각각 탭 스톱이고 화살표 키가 아무 일도 하지 않는다.

### F-02 칩 두 번 탭이면 확인 없이 회차 전체가 지워진다

**무엇이 일어나는가.** 문항 패널 상단의 32px 칩(`test-question-client.tsx:341-346`)을 누르면 qualifier overlay 가 re-entry 모드로 열리고, `reopenQualifierOverlay`(`use-qualifier-overlay-wizard.ts:67-82`)가 **현재 답을 draft 로 seed 한다.** 그래서 `continueDisabled = !qualifierDraft[…]`(`overlay-connector.tsx:82`)가 **첫 프레임부터 false** 이고, accent 로 채워진 primary 버튼(`instruction-overlay.tsx:195-203`, 라벨 `Change and restart` / `변경하고 다시 시작`)이 곧바로 눌린다. 그 버튼은 `executeReentryCommit`(`use-test-entry-orchestrator.ts:115-126`)을 부르고, 그것은 **아무 변경이 없어도 무조건** `resetScoringAnswers(qualifierOnlyResponses)` + `writeResponseSet(variant, qualifierOnlyResponses)` 를 실행한다. 리듀서는 `answers` 를 qualifier 답만 남긴 객체로 통째로 교체하고 `currentQuestionIndex` 를 첫 scoring 문항으로 되돌린다(`test-run-reducer.ts:193-203`). localStorage 까지 덮어쓰므로 **되돌릴 방법이 없다.**

**두 탭이다.** 칩(32px, 문항 바로 위) → primary(46px, accent, 우측 하단 정렬). 확인 다이얼로그도, undo 도, 「N개 답변이 삭제됩니다」 경고도 없다. 파괴적 행동이 **기본(primary·accent) 버튼**이고 안전한 행동(`Cancel`)이 secondary 다 — iOS HIG(파괴적 행동은 기본 버튼이 아니며 확인을 요구한다)와 Material 3(destructive action 은 확인 대화상자를 갖는다) 양쪽과 정반대다. 같은 제품이 **같은 손실**에 대해 브라우저 새로고침에는 `beforeunload` 경고를 건다(`use-before-unload-guard.ts:16-32`) — 앱 안의 더 쉬운 경로에만 가드가 없는 내부 비대칭이다.

**계약이 이 모양을 명시한다.** `req-test.md:280` 「re-entry confirm 은 qualifier answer 만 보존한 response set 을 다시 쓰고, scoring 응답을 삭제한 뒤 첫 scoring question 부터 재시작한다」 · `:427` 「[Cancel] / [Change and restart] 만 사용한다」. 사용자 결정 1(계약 개정 전면 허용)이 가장 먼저 적용될 조항이다.

**무엇으로 바꾸는가.** ⑴ re-entry 에서 draft 가 저장값과 **같으면** primary 를 `continueDisabled` 로 두거나 라벨을 비파괴적 `Done` 으로 바꾼다 — 변경 없는 확인이 삭제를 일으키지 않게 한다. ⑵ draft 가 실제로 달라졌을 때만 파괴적 경로로 들어가고, 그때는 삭제될 답변 수를 본문에 담은 확인 단계를 하나 끼운다(`{n}개의 답변이 지워지고 처음부터 다시 시작합니다`). ⑶ 파괴적 확정 버튼은 primary accent 가 아니라 `--danger` 계열 또는 secondary 무게로 내리고, `Cancel` 을 오른쪽(기본 위치)에 둔다. ⑷ 칩 자체를 44px 로 올리고(F-05) 문항 영역에서 떨어뜨린다.

### F-03 답변을 고르는 순간 포커스가 `<body>` 로 떨어진다

**무엇이 일어나는가.** `handleAnswerChoice` 가 `lockAnswer` 를 부르면(`use-answer-handler.ts:87`) `setIsAnswerLocked(true)` 로 리렌더되고(`use-answer-lock.ts:33`) 방금 누른 버튼에 `disabled` 가 붙는다(`test-question-client.tsx:364,377`). HTML 사양상 포커스를 가진 요소가 disabled 가 되면 포커스는 문서로 되돌아간다 — `document.activeElement === document.body`. 150ms 뒤 `moveQuestion(1)` 이 `currentQuestionIndex` 를 바꾸고 `motion.div key={currentQuestionIndex}`(`:354`)가 선택지 두 개를 통째로 리마운트한다. **`src/features/test/**` 전체에 `.focus()` 호출은 `instruction-overlay.tsx` 안의 4건뿐이고**(전수 grep) 문항 패널에는 하나도 없다. 포커스는 복구되지 않는다.

**귀결.** 키보드·스위치 컨트롤·외장 키보드 태블릿 사용자는 **문항마다** 포커스 위치를 잃고 문서 처음(GNB 뒤로 버튼)부터 다시 Tab 해야 한다. 스크린리더 사용자는 읽기 위치를 잃고, 새 문항이 나타났다는 사실을 알려 주는 것이 **아무것도 없다**(F-04). fixture 8문항에서도 불편이지만, 프로덕션 문항 수가 Sheets 소유라 `req-test.md:786-789` 의 예시가 암시하는 60문항이라면 사용 불가에 가깝다. WCAG 2.4.3 Focus Order(A)와 3.2.1/3.2.2 의 취지를 정면으로 깬다.

**무엇으로 바꾸는가.** ⑴ 잠금 구현을 `disabled` 대신 **핸들러 내부 가드**로 옮긴다 — `handleAnswerChoice` 가 이미 `if (…|| isAnswerLocked) return`(`use-answer-handler.ts:64`)으로 중복 입력을 막고 있으므로 DOM `disabled` 는 불필요하다. 시각적 잠금이 필요하면 `aria-disabled="true"` + `pointer-events:none` 로 표현하고 포커스는 유지한다. ⑵ 문항 전환 직후 새 문항 컨테이너(`<h2>` 를 감싼 그룹, `tabIndex={-1}`)로 포커스를 옮긴다 — `instruction-overlay.tsx:98-100` 이 단계 전환에서 이미 쓰는 패턴이고, 같은 저장소 안에 참조 구현이 있다. ⑶ `req-test.md:678` 의 150ms 값 자체는 유지해도 된다 — 문제는 지연이 아니라 `disabled` 다.

### F-04 상태 변화를 알리는 live region 이 저장소 전체에 0개다

**무엇이 일어나는가.** `aria-live` · `role="status"` · `role="alert"` · `aria-atomic` · `aria-busy` 전수 grep 결과 `src/` 에 **0건**이다. 그래서 다음 중 어느 것도 AT 에 알려지지 않는다 — 문항 자동 전진(`use-answer-handler.ts:87-93`), 진행률 변화(`role="progressbar"` 의 `aria-valuenow` 는 포커스를 갖지 않는 요소라 자동 발화되지 않는다, `test-question-client.tsx:263-272`), 테마/언어 전환(`settings-controls.tsx:159,183`), 동의 선택 결과(배너가 그냥 사라진다, `telemetry-consent-banner.tsx:12-16`), 전환 실패(`blog-destination-client.tsx:76-80` 이 telemetry 로만 보낸다), tail reset 으로 지워진 답변 수(F-06).

**무엇으로 바꾸는가.** 셸 레벨에 `role="status" aria-live="polite"` 단일 announcer 를 하나 두고(`page-shell.tsx` 에 시각적으로 숨긴 `<div>` 하나) 다음 다섯을 흘린다 — ⑴ 문항 전진 시 `{n}번 문항. {질문 텍스트}` 또는 최소한 `{n} / {total}`, ⑵ 동의 확정 시 `분석 동의가 저장되었습니다 / 거부되었습니다`, ⑶ 테마·언어 변경 확정, ⑷ tail reset 시 삭제된 답변 수, ⑸ 전환 실패. WCAG 4.1.3 Status Messages(AA)가 요구하는 최소치다.

### F-05 `Preferences` 는 아무 일도 하지 않고, 동의는 한 번 정하면 UI 로 되돌릴 수 없다

**무엇이 일어나는가.** 동의 배너의 세 번째 버튼(44px, 포커스 가능)의 핸들러가 `onPreferencesAction={() => {}}` 다(`telemetry-consent-banner.tsx:32`). 유일한 설명은 `title="Preferences panel coming soon"`(`consent-banner.tsx:269`)인데 **`title` 툴팁은 터치 기기에서 절대 표시되지 않는다.** 그리고 `setTelemetryConsentState` 호출부는 저장소 전체에 두 곳뿐이다 — 배너(`telemetry-consent-banner.tsx:27,30`)와 테스트 instruction overlay 의 consent CTA(`use-test-entry-orchestrator.ts:61`). 배너는 `consentState === 'UNKNOWN'` 일 때만 렌더되고(`:12`), 설정 레이어에는 동의 컨트롤이 없으며 `req-landing.md:241` 이 「Mobile 최하단 설정 컨트롤은 언어/테마 2개만 허용한다」로 그것을 **금지한다.**

**그런데 배너 본문이 반대를 약속한다.** `src/messages/en.json` `consent.message` 는 "…and you can change your choice at any time." 로 끝난다. 12개 로케일 전부 같은 문장을 갖는다. 즉 **제품이 스스로 약속한 기능이 존재하지 않고**, 그 기능으로 가는 유일한 버튼이 no-op 이다. 사용자가 실수로 「Deny」를 누르면 되돌리는 경로는 특정 consent 분기를 가진 테스트에 딥링크로 진입해 CTA 를 누르는 것뿐이고, 그것은 발견 가능한 경로가 아니다.

**무엇으로 바꾸는가.** ⑴ `Preferences` 를 실제 동의 설정 시트로 연결하거나, 그 구현이 이번 범위 밖이면 **버튼을 제거하고 본문에서 "change your choice at any time" 문장을 지운다** — 없는 기능을 광고하는 것보다 없다고 말하는 편이 낫다. ⑵ 장기 해법은 GNB 설정 레이어(모바일: 드로어 최하단)에 언어·테마와 나란히 「분석 동의」 행을 추가하는 것이고, 그러려면 `req-landing.md:241` 의 「2개만」을 3개로 개정해야 한다. ⑶ 동의 확정 뒤 `role="status"` 로 결과를 알린다(F-04).

---

## 3. major — 표준에 못 미쳐 체감 품질을 떨어뜨린다

### F-06 「이전」 한 번이 목적지부터 끝까지 전부 지우고, 경고가 없다

`moveQuestion(-1)` 은 `Object.entries(runState.answers).filter(([key]) => Number(key) < nextIndex)` 로 **목적지 index 이상의 모든 응답을 제거**하고 `writeResponseSet` 으로 localStorage 에 확정한다(`use-test-run-controller.ts:193-204`). 계약이 그 predicate 를 코드 수준까지 못박는다(`req-test.md:526-528`). 마지막 문항에서 한 번 누르면 2개가 사라지고, 초반 문항을 고치려면 그 뒤 전부를 다시 답해야 한다 — 60문항 제품에서 Q2 를 고치는 비용은 58회 누르기 + 59회 재응답이다. 같은 문서 `req-test.md:522` 는 「사용자는 진행 중 이전 응답을 수정할 수 있어야 한다」고 요구하므로 **문서가 스스로 모순한다.** 버튼은 46px 로 하단 nav 행 좌측, 즉 엄지 도달 영역 안에 있고(`test-question-client.tsx:389-404`) 확인도 undo 도 없다. 이 동작을 `tests/unit/use-test-run-controller.test.ts:360` 이 고정하고 있다.

**무엇으로 바꾸는가.** tail reset 이 실제로 보호하려는 것은 「이전 derivation 결과의 잔류」이지 「뒤 문항의 응답」이 아니다(`req-test.md:515-519` 의 세 항목 중 셋째가 derivation residue 폐기다). 제안: ⑴ 응답은 **보존**하고 run 에 `derivationDirty` 플래그를 세운다, ⑵ `all-required-answered` 는 응답 집합에서 계산하되 dirty 면 result-entry eligibility 를 false 로 둔다, ⑶ 제출 시 최종 응답 집합으로 재계산한다 — `req-test.md:524` 의 「최종 계산과 결과 표시는 수정이 반영된 최종 응답 집합을 기준으로 해야 한다」와 정확히 일치한다. ⑷ 삭제를 남겨야 한다면 삭제 개수를 담은 확인 단계와 `role="status"` 알림을 붙인다. ⑸ 모바일 표준 패턴으로는 「이전」 대신 **문항 인덱스/리뷰 스텝**(제출 전 전체 답변 목록에서 아무 문항이나 눌러 비파괴적으로 고치기)을 도입하는 것이 정답이며, 사용자 결정 5(IA 재설계 허용)가 이것을 연다.

### F-07 qualifier 칩이 제품에서 유일한 비시맨틱 컨트롤이고 32px 이다

`QualifierChip`(`qualifier-chip.tsx:24-32`)은 `<div role="button" tabIndex={0}>` 이고 Enter/Space 를 직접 구현한다(`:16-21`). `req-landing.md:711` 은 「`role="button"` 대체 구현은 금지하며, 불가피한 경우 Section 15 Exception Registry 등재 후에만 허용한다」고 적는데 §15 의 등재 항목은 EX-001 · EX-002 · EX-003 셋뿐이고 어느 것도 이것이 아니다. 저장소는 이 안티패턴을 잡는 **게이트를 이미 갖고 있다** — `scripts/qa/check-phase8-accessibility-contracts.mjs:33` 이 `/role="button"/` 을 fail 로 처리하는데, 대상 파일이 `landing.grid.gridCard` 하나뿐이라 테스트 표면에는 닿지 않는다. 크기는 `testChipClassName` 의 `min-h-8`(`surface-class-names.ts:93`)이 유일한 높이 선언이므로 **32px** 이다 — WCAG 2.5.8(24px)은 통과하지만 `design.md:112` 의 44px 목록과 iOS HIG 44pt · Material 3 48dp 에 미달하고, 같은 파일의 드로어 칩이 `--tap-min` 으로 44px 을 받는 것과(§1 측정 ①) 어긋난다. 그리고 이 32px 칩이 F-02 의 파괴적 경로 입구다.

**무엇으로 바꾸는가.** `<button type="button">` 으로 교체하고 `handleKeyDown` 을 제거한다(네이티브가 처리한다). `testChipClassName` 의 `min-h-8` 을 `min-h-[var(--tap-min)]` 로 올리고, 데스크톱에서 32px 이 필요하면 scope prop 으로 가른다 — `settings-controls.tsx:113-118` 이 이미 쓰는 패턴이다. `check-phase8` 의 `role="button"` 금지 대상을 `src/features/**` 전역으로 넓힌다.

### F-08 12개 언어가 12개의 탭 스톱이고, 그 묶음에 이름이 없다

로케일 선택은 `localeOptions.map` 이 만드는 `<button aria-pressed disabled>` 12개의 평면 wrap 이다(`settings-controls.tsx:168-189`). 문제가 셋이다. ⑴ **역할이 틀렸다** — 12개 중 하나만 고르는 상호배타 집합은 `aria-pressed` 토글 버튼이 아니라 WAI-ARIA APG 의 radio group(또는 listbox)이며, 그러면 탭 스톱이 **1개**가 되고 화살표 키로 이동한다. 지금은 드로어가 열렸을 때 탭 스톱이 햄버거 1 + nav 3 + 테마 1 + 로케일 11 = **16개**다(현재 선택은 `disabled` 라 `isVisibleFocusableGnbElement`(`gnb-keyboard-dom.ts:20-22`)가 제외한다). ⑵ **현재 선택이 탭 순서에서 빠진다** — `disabled={isCurrentLocale}`(`:182`)이라 키보드로 훑는 동안 「지금 English 가 선택돼 있다」를 들을 기회가 없다. APG 는 선택된 항목을 비활성화하지 말고 `aria-checked`/`aria-current` 로 표현하라고 한다. ⑶ **묶음에 접근 가능한 이름이 없다** — 보이는 라벨은 `{labels.theme}` 하나이고 그 값이 `"Language ⋅ Theme"`(`src/messages/en.json` `gnb.theme`)인데 **테마 행 안에만** 렌더된다(`:127-136`). 로케일 행(`:168-190`)에는 `aria-label` 도 `role="group"` 도 없다.

기하는 문제가 아니다 — baseline 측정으로 44px × 4줄(줄 간격 8px, y 612..811, 합 200px)이고 390×844 드로어에서 `mt-auto` 아래에 320px 여유가 있다. 다만 가로 모드(dvh≈390)나 200% 확대(WCAG 1.4.4)에서는 넘치며, 그때 `document.body.style.touchAction = 'none'`(`use-gnb-mobile-menu.ts:141`)이 드로어 자체의 팬을 막는지는 **[미확인]** 이다.

**무엇으로 바꾸는가.** 로케일 행을 `role="radiogroup" aria-labelledby={localeHeadingId}` 로 감싸고 각 칩을 `role="radio" aria-checked` + roving `tabindex`(선택된 것만 `tabIndex=0`, 나머지 `-1`) + 화살표/Home/End 키로 바꾼다. `disabled` 를 제거한다. 「LANGUAGE」와 「THEME」을 각 행의 보이는 헤딩으로 분리한다 — 한 라벨이 두 행을 대표하는 현재 구조는 `gnb.theme` 메시지 키 이름부터 어긋나 있다. 모바일 IA 로는 「언어」 한 줄(현재 값 표시) → 탭하면 전체 선택 목록 바텀시트가 12칩 wrap 보다 플랫폼 관용에 맞고(iOS HIG: 5개 초과 상호배타 옵션은 피커/메뉴, Material 3: menu 또는 full-screen dialog) 드로어 높이도 200px 돌려준다.

### F-09 누른 느낌이 없다 — 터치에서 피드백이 0인 컨트롤 9종

§1 측정 ②가 원인이다. `active:` 를 가진 것은 primary 버튼·secondary 버튼·GNB pill 셋뿐이고, 나머지는 `hover:` 만 갖는데 그것은 터치에서 발동하지 않으며 preflight 가 네이티브 탭 하이라이트까지 껐다. 피드백이 **0인** 컨트롤: 테스트 답변 A/B(`surface-class-names.ts:83`), qualifier 선택지(같은 클래스), qualifier 칩(`:93`), GNB 테마 칩 2 + 로케일 칩 12(`settings-controls.tsx:29,49`), 드로어 nav 링크 3(`site-gnb.tsx:65-66`), quiet 버튼 = 동의 `Preferences` · instruction 의 동의 거부(`button-class-names.ts:108-109`), 404 복귀 링크(`:117`), 블로그 목록 행(`blog-destination-client.tsx:43-45`), 랜딩 확장 카드 A/B(`landing-grid-card.tsx:235`), 랜딩 모바일 닫기 X(`:278-281`). 답변 선택지에서는 이것이 특히 아프다 — 누른 뒤 남는 유일한 신호가 `data-selected=true` 인데 그것마저 150ms 뒤 문항이 바뀌면서 사라진다(`use-answer-lock.ts:32`). 즉 **골랐다는 확인이 사실상 보이지 않는다.**

**무엇으로 바꾸는가.** `skinTransitionClassName` 과 같은 층에 공용 눌림 어휘를 하나 만든다 — 최소 `active:bg-[var(--surface-sunken)]`(중립 표면) / `active:bg-[var(--sage-muted)]`(선택 계열), 그리고 답변 선택지에는 `active:` 로 테두리까지 accent 로 올려 「지금 이것을 누르고 있다」를 명시한다. `design.md §4.8` 이 bounce/overshoot 를 금지하므로 스케일 변형이 아니라 색·테두리만 쓴다. `--dur-fast`(140ms)보다 짧게, 이상적으로는 전이 없이 즉시 적용한다(눌림은 전이 대상이 아니다).

### F-10 전면 시트의 유일한 CTA 가 화면 위 1/4 에 있고 아래 72%가 비어 있다

baseline `theme-layout-test-instruction-en-light-mobile`(390×844) 픽셀 측정: `Start` 버튼이 **y 189..234(46px), x 302..369(68px)** 이다. 중심이 화면 상단에서 **25.1%** 지점, 오른쪽 끝에서 21px. 그 아래 **609px(72.2%)이 완전히 비어 있다.** 원인은 세 클래스다 — `instruction-overlay.tsx:26` 의 `max-[767px]:min-h-full max-[767px]:content-start max-[767px]:pt-[88px]`(전면 시트 + 상단 정렬 + 88px 상단 패딩)와 `:227` 의 `justify-end`. iOS HIG 와 Material 3 은 공통으로 전면 다이얼로그·시트의 주요 행동을 하단 고정으로 둔다. 덧붙여 `pt-[88px]` 은 **모바일 분기에 데스크톱 값을 쓴다** — 모바일 GNB 는 56px 이고 셸의 모바일 상단 여백은 `pt-20`(80px)이다(`page-shell.tsx:22`).

같은 문제가 문항 화면에도 있다. baseline `theme-state-mobile-test-question-en-light-mobile` 측정: 셸 카드가 y 137..538, **카드 아래 306px(36.3%)이 빈다.** 마지막 인터랙티브 요소(답변 B)의 하단이 y=455 이므로 **화면 아래 389px(46.1%)에 컨트롤이 하나도 없다.** Q1 에서는 nav 행의 46px 조차 `visibility:hidden` 으로 빈 자리만 차지한다(`test-question-client.tsx:400`).

**무엇으로 바꾸는가.** 모바일 전면 시트/문항 화면의 주요 행동을 하단 고정 액션 바로 내린다 — `position: sticky; bottom: 0` + `padding-bottom: max(16px, env(safe-area-inset-bottom))`. 저장소에 `env(safe-area-inset-*)` 참조가 2곳(전부 bottom, `consent-banner.tsx:21` · `site-gnb.tsx:87`)뿐이고 테스트 표면에는 0곳이므로 이 이동은 safe-area 토큰 도입을 선행 조건으로 갖는다. `pt-[88px]` 은 모바일 값(80px 또는 GNB 높이에서 유도한 토큰)으로 교체하고, 「바 아래 공간」을 80/88/116 세 리터럴이 따로 적는 현재 상태를 `--shell-gutter` 와 같은 방식의 단일 토큰으로 통합한다.

### F-11 모달이 열려도 뒤 패널의 버튼이 탭·터치로 살아 있고, axe 는 그것을 `incomplete` 로 내려 보고 게이트는 그것을 읽지 않는다

overlay 가 열리면 `aria-hidden="true"` 가 붙는 것은 `test-question-panel` **하나**이고(`test-question-client.tsx:334`) 그 안에는 `disabled` 가 아닌 `<button>` 두 개(답변 A/B)와 qualifier 칩이 그대로 남는다. 같은 `<section>` 의 `<header>`(카드 제목 + progressbar, `:254-279`)에는 `aria-hidden` 도 `inert` 도 없다. `inert` 는 저장소 전체에서 `transition-gnb-overlay.tsx:28` 한 곳에만 쓰인다. 결과적으로 `aria-modal="true"` 다이얼로그가 열린 채 뒤 콘텐츠가 AT 에서 절반만 숨겨지고, 포인터로는 전혀 막히지 않는다.

**게이트가 왜 못 잡는지 확정했다.** axe-core 4.11.1 의 `aria-hidden-focus` 룰은 `all: ["focusable-modal-open","focusable-disabled","focusable-not-tabbable"]` 이고, `focusableModalOpenEvaluate` 는 모달이 열려 있으면 violation 이 아니라 **`undefined`(= incomplete)** 를 반환한다(`node_modules/axe-core/axe.js`). 그리고 저장소의 헬퍼는 `expect(results.violations, …).toEqual([])` 만 단언한다(`tests/e2e/helpers/axe.ts:20-23`) — **`incomplete` 를 읽지 않는다.** 이것이 `surface-test` 지도의 미확인 #3 의 답이다.

**무엇으로 바꾸는가.** ⑴ overlay 가 열려 있는 동안 `aria-hidden` 대신 뒤 콘텐츠 전체(`<section>` 또는 `page-shell-main`)에 `inert` 를 건다 — 포커스·포인터·접근성 트리를 한 번에 막고 `aria-hidden` + 포커스 가능 요소라는 모순 자체가 사라진다. ⑵ `expectPageToBeAxeClean` 에 `incomplete` 를 보고하는 경로를 추가한다 — 최소한 콘솔에 출력하고, 알려진 항목만 화이트리스트로 뺀다. ⑶ 장기적으로는 네이티브 `<dialog showModal>` 로 옮기면 top layer 가 F-12 의 z-index 문제까지 함께 닫는다.

### F-12 터치 태블릿에서 설정 트리거 첫 탭이 열고 곧바로 닫는다

`hoverOpenEnabled = shouldOpenDesktopSettingsByHover({viewportWidth, hoverCapable})` = `viewportWidth >= 1024 && hoverCapable`(`behavior.ts:8-13`). 그 값이 false 면 트리거의 `onFocus` 가 `openSettingsImmediate()` 를 부르는데(`site-gnb.tsx:319-323`) `onClick` 은 **항상** `toggleSettingsOpen` 이다(`:324`). 포인터 입력의 이벤트 순서는 `pointerdown → focus → pointerup → click` 이므로, `hoverOpenEnabled === false` 인 모든 환경 — ① 768~1023px 마우스 데스크톱, ② **모든 폭의 터치 태블릿** — 에서 첫 탭이 열고 바로 닫는다. 두 번째 탭에서야 열린다(이미 포커스가 있어 `focus` 가 재발화하지 않는다). 사용자 결정 2(hover 없는 기기는 폭과 무관하게 터치 취급)를 적용하면 이 구간이 그대로 「터치 태블릿의 유일한 설정 진입로」가 된다. E2E 가 이 조합을 한 번도 돌리지 않는다 — 비-hover 테스트는 `trigger.focus()` 를 직접 호출하고 클릭하지 않으며(`tests/e2e/gnb-smoke.spec.ts:373-377`) 설정 관련 케이스의 뷰포트는 1280/1440/1600 뿐이다. iOS Safari 는 `<button>` 탭에 포커스를 주지 않아 증상이 나타나지 않고 Android Chrome 은 준다 — 플랫폼별 재현은 **[미확인]**.

**무엇으로 바꾸는가.** `onFocus` fallback 을 **키보드 포커스에만** 한정한다 — `onFocus` 대신 `onFocusVisible` 이 없으므로 `pointerdown` 플래그를 ref 에 세우고 `onFocus` 에서 그 플래그가 서 있으면 열지 않는 방식, 또는 더 단순하게 **`onFocus` 열기를 제거하고 `onClick` 토글만 남긴다**(클릭은 키보드 Enter/Space 로도 발화하므로 키보드 접근성은 보존된다). `req-landing.md:224` 의 「포인터 감지 불가 환경에서는 focus/click fallback 허용」을 「focus **또는** click 중 하나만 사용한다 — 둘을 동시에 걸면 서로 상쇄한다」로 개정한다.

### F-13 EGTT 첫 문항의 「이전」 버튼은 보이고 눌리지만 아무 일도 하지 않는다

가시성 판정이 `style={{visibility: currentQuestionIndex === 1 ? 'hidden' : 'visible'}}`(`test-question-client.tsx:400`)인데, EGTT 는 `questions[0]` 이 profile 이라 첫 runtime index 가 `skipForwardPastProfile(1) = 2` 다(`use-test-run-controller.ts:157-160` · `question-runtime-utils.ts:15-24`). 따라서 버튼은 **보이고**, `disabled={!started}` 도 false 라 **눌린다**. 그런데 `moveQuestion(-1)` 은 `skipBackwardPastProfile(max(1, 2-1)) = 1` 을 얻고 `isProfileQuestion(questions[0])` 이 true 라 즉시 return 한다(`:193-197`). 46px 짜리 시각적으로 활성인 버튼이 침묵한다. 이 경로를 고정하는 단언은 저장소 전체에서 `tests/e2e/theme-matrix-smoke.spec.ts:252` 한 줄뿐이고 그것은 qmbti 경로다.

**무엇으로 바꾸는가.** 가시성 판정을 「목적지가 존재하는가」로 바꾼다 — `moveQuestion(-1)` 이 쓰는 것과 같은 계산(`skipBackwardPastProfile(currentQuestionIndex - 1)` 이 현재 index 와 다르고 profile 이 아닌가)을 셀렉터로 뽑아 버튼의 렌더 여부에 쓴다. `visibility:hidden` 으로 자리만 차지하는 현재 방식도 재검토 대상이다 — 모바일에서 46px 의 죽은 공간이고, nav 행이 하단 액션 바로 내려가면(F-10) 더 눈에 띈다.

### F-14 터치 타깃 크기를 보는 게이트가 저장소에 하나도 없다

axe-core 4.11.1 의 `target-size` 룰(태그 `wcag22aa`, `wcag258`)은 **`enabled: false` 가 기본값**이다 — `axe._audit.rules` 를 직접 조회해 확인했고, 기본 비활성 룰 8개(`aria-roledescription`, `audio-caption`, `color-contrast-enhanced`, `duplicate-id-active`, `duplicate-id`, `identical-links-same-purpose`, `meta-refresh-no-exceptions`, `target-size`) 중 하나다. `tests/e2e/helpers/axe.ts:21` 은 `new AxeBuilder({page}).analyze()` 로 룰 지정 없이 돌리므로 **이 룰은 실행되지 않는다.** 그리고 `boundingBox()` 로 크기 하한을 단언하는 곳도 없다(`gnb-smoke.spec.ts:157-160` 의 4건은 hover gap 검증용). 즉 WCAG 2.5.8 의 24px 도, 플랫폼 관용 44px 도 **어느 게이트도 보지 않는다.** F-07 의 32px 칩이 살아남은 구조적 이유이며, 이번 리팩터가 44px 로 올려도 다음 세션이 다시 내리는 것을 아무것도 막지 못한다. (이 측정은 `contract-landing-2` 지도의 「target-size 룰이 기본 활성」 서술을 정정하고 `gates-reverse` 지도의 판정을 확증한다.)

**무엇으로 바꾸는가.** ⑴ `expectPageToBeAxeClean` 에 `.withRules([...defaults, 'target-size'])` 또는 `.options({rules: {'target-size': {enabled: true}}})` 를 더한다 — 24px 바닥이 게이트에 들어온다. ⑵ 44px 은 axe 가 보지 않으므로 별도 단언이 필요하다: 390px 에서 주요 터치 타깃 목록(답변 선택지·qualifier 칩·CTA·드로어 칩·닫기 X)의 `boundingBox().height >= 44` 를 도는 `@smoke` 케이스 하나. ⑶ `design.md:112` 의 44px 열거형을 「모바일 뷰포트에서 1차 터치 타깃인 모든 컨트롤」이라는 규칙으로 바꾼다 — 지금은 열거되지 않은 컨트롤(태그 칩·데스크톱 로케일 칩·CI 링크·데스크톱 nav 링크)이 문면상 계약 밖이다.

### F-15 답변 쌍은 오탭 한 번의 대가가 가장 큰 자리인데 방어가 하나도 없다

390×844 baseline 픽셀 측정: 답변 A 가 y 352..399(**48px**), 간격 y 400..407(**8px**), 답변 B 가 y 408..455(**48px**), 둘 다 카드 내부 폭 전체(`w-full`). WCAG 2.5.8 은 통과한다(타깃이 24px 이상이므로 간격 예외 불요). 문제는 **결합**이다 — ⑴ 8px 간격은 성인 엄지 접촉 면적(약 10~14mm ≈ 38~53 CSS px)보다 한참 작아 경계 오탭이 구조적으로 발생하고, ⑵ 누름 피드백이 0이라 어디를 눌렀는지 확인할 수 없고(F-09), ⑶ 150ms 뒤 자동 전진해 화면이 바뀌며(`use-answer-lock.ts:32`), ⑷ 정정하려면 파괴적인 「이전」을 눌러야 한다(F-06). 즉 **잘못 누른 사실을 알아채기 어렵고, 알아채도 고치는 비용이 크다.** 같은 구조가 랜딩 확장 카드에도 있고(`landing-grid-card.tsx:233` `grid gap-2`, 선택지 48px) 거기서는 오탭이 곧바로 테스트 라우트로 이동하며 `card_answered` telemetry 까지 발화한다(`src/features/transition/runtime.ts:62`).

**무엇으로 바꾸는가.** ⑴ 답변 쌍의 간격을 `gap-2`(8px) → `gap-3`(12px) 이상으로 올린다 — 48px 타깃 두 개에 12px 이면 한 화면 예산에서 4px 만 더 쓴다. ⑵ `active:` 눌림 상태를 넣는다(F-09). ⑶ 자동 전진 뒤 짧은 되돌리기 어포던스를 둔다 — 전진 직후 문항 상단에 `방금 {선택} 을 선택했습니다 · 되돌리기` 를 2~3초 띄우고 `role="status"` 로도 읽히게 한다. 이것은 「이전」의 파괴적 경로를 쓰지 않고 직전 오탭만 무르는 경로이며 F-06 의 tail reset 계약을 건드리지 않는다.

### F-16 포커스가 sticky GNB 아래로 들어갈 수 있다

`scroll-padding-top` · `scroll-margin-top` 이 `src/` 전체에 **0건**이다(전수 grep). GNB 는 `sticky top-0 z-[1100]` 이고 높이가 모바일 56px · 데스크톱 64px 이다(`site-gnb.tsx:38,40,41`). 순차 포커스 이동으로 브라우저가 요소를 스크롤해 올릴 때(특히 Shift+Tab 으로 위로 올라갈 때) 요소는 스크롤포트 상단에 정렬되고, 그 위에 sticky 헤더가 겹친다 — Chrome 은 sticky 요소를 고려하지 않는다. 랜딩은 390px 에서 3.76 화면이고 카드 트리거 8개가 전부 포커스 대상이므로 이 경로가 실재한다. WCAG 2.4.11 Focus Not Obscured (Minimum, AA). 부재는 **[측정]** 으로 확정했고 실제 가림은 렌더로 재지 않아 **[미확인]** 이다.

**무엇으로 바꾸는가.** `html { scroll-padding-top: calc(var(--gnb-height) + 8px) }` 한 줄. 다만 `--gnb-height` 토큰이 존재하지 않는다 — GNB 높이는 `h-16`/`h-14` Tailwind 리터럴이다. `--shell-gutter` 가 좌우 여백에서 같은 문제를 토큰으로 푼 선례(`globals.css:306-336`)를 세로에도 적용해 `--gnb-height`(56/64)를 신설하고, `page-shell.tsx:22` 의 `pt-20`/`md:pt-[88px]` 과 `landing-grid-card.tsx:285,292,296` 의 `calc(100dvh-116px)` 와 `instruction-overlay.tsx:26` 의 `pt-[88px]` 이 그 토큰에서 유도되게 한다.

### F-17 테스트 플로우 — 제품에서 입력이 가장 많이 일어나는 표면 — 에 접근성 계약이 없다

`docs/req-test.md`(1319줄)에서 `aria-` · `role="` · `WCAG` · `대비` · `contrast` · `focus` 중 하나라도 포함하는 줄은 **정확히 1줄**(`:402`, instruction overlay 의 dialog 계약)이다. 접근성 계약의 정본은 `req-landing.md §9`(685-728)인데 그 문서의 §1.1 Scope 는 「랜딩 카탈로그 UI, 카드 상태 전이, …」로 스스로를 랜딩에 한정한다(`req-landing.md:6`). 그래서 F-01(선택 상태 미노출) · F-03(포커스 상실) · F-04(live region 부재) · F-11(aria-hidden 안의 활성 버튼)이 **어느 계약도 위반하지 않는다** — 그 계약이 존재하지 않기 때문이다. 사용자 결정 6(동작 계약 / 인터랙션 계약 분리)의 직접 대상이다.

**무엇으로 바꾸는가.** 분리 시 접근성·키보드·포커스 계약을 **표면 중립의 독립 절**로 승격한다 — `req-landing.md §9` 를 랜딩에서 떼어 「입력·포커스·상태 노출 계약」으로 만들고, 랜딩·테스트·블로그·히스토리·설정·에러 전 표면이 그것을 참조하게 한다. 최소 조항 다섯: ⑴ 상호배타 선택 집합은 radio group 시맨틱을 갖는다, ⑵ 상태 변화(문항 전진·동의 확정·설정 변경·실패)는 live region 으로 알린다, ⑶ 컨트롤이 비활성화·언마운트될 때 포커스 목적지를 명시한다, ⑷ 모달이 열린 동안 배경은 `inert` 다, ⑸ 모바일 뷰포트의 1차 터치 타깃은 44×44 이상이다.

### F-18 디자인 시스템에 폼 필드 패턴이 하나도 없다

`docs/design/design.md` 와 `docs/design/ds/*.css` 전체에 `.vt-input` · `.vt-field` · `.vt-select` · `.vt-radio` · `.vt-checkbox` · `.vt-switch` 에 해당하는 패턴이 없다. 유일한 흔적은 `docs/design/ds/colors_and_type.css:132` 의 주석 한 줄 — 레거시 VIVE 의 radius 스케일을 설명하면서 `.btn`/`.input`/`.textarea`/`.select` 에 `--radius-md` 가 쓰였다고 적을 뿐, 이 시스템의 정의가 아니다. `app-components.css:632-635` 가 「design.md has no pattern for these because they were never extracted」라고 스스로 적는 공백과 같은 종류다. 사용자가 이번 리팩터를 「디자인 개편의 마지막 기회」로 못박았고, Phase 9 의 결과 화면·공유 URL·닉네임(현재 non-goal 이지만 `req-test.md:33` 은 이번 Phase 의 non-goal 이지 영구 배제가 아니다)이 전부 필드를 필요로 한다. 필드 패턴 없이 이 시스템을 잠그면 다음 세션이 패턴을 발명하게 된다.

**무엇으로 바꾸는가.** `docs/design/ds/app-components.css` 에 최소 4종을 정의한다 — `.vt-field`(라벨 + 컨트롤 + 도움말/오류의 수직 스택, 오류 상태는 `--danger` 테두리 + 도움말 자리에 메시지), `.vt-input`(`--radius-md`, `--hairline-strong` 테두리, `min-height: var(--tap-min)`, `focus-visible` 은 기존 `focusRingClassName` 과 동일한 링), `.vt-radio-group` / `.vt-radio`(이 앱의 답변 선택지·로케일 선택이 실제로 필요로 하는 것, F-01·F-08 의 시각 정본), `.vt-switch`(테마 전환의 대안 후보). 그리고 텍스트 입력이 생기는 순간의 모바일 계약 세 줄을 `design.md` §7 에 적는다 — `inputmode`/`autocomplete`/`enterkeyhint` 지정 의무, 소프트 키보드가 뜬 상태의 하단 CTA 처리(`env(keyboard-inset-height)` 또는 `visualViewport` 기반 회피), 그리고 iOS 의 16px 미만 폰트 자동 확대 방지(입력 요소 폰트 크기 하한 16px).

---

## 4. minor — 다듬기

### F-19 블로그 목록에서 현재 보고 있는 기사가 `aria-current` 를 갖지 않는다

상세 페이지에서 목록의 현재 기사는 `data-selected="true"` 로 `--sage-muted` 채움 + accent 테두리를 받지만(`blog-destination-client.tsx:127,43`) 그 표식이 `<li>` 에 붙고 `<Link>` 에는 `aria-current` 가 없다(`:129-135`). 같은 제품의 GNB 는 같은 의미에 `aria-current="page"` 를 쓴다(`site-gnb.tsx:280,291,459`) — 어휘가 이미 있는데 이 표면만 쓰지 않는다. **제안**: `<Link aria-current={isCurrent ? 'page' : undefined}>` 한 줄. `axe` 의 `heading-order`/`page-has-heading-one` 이 `best-practice` 태그라 이 종류를 잡지 못하므로 게이트 추가가 필요하면 단위 테스트가 맞다.

### F-20 모바일 랜딩에서 햄버거가 정방향 탭 순서에 없다

`useLandingGnbEntryMode` 가 `shouldDeferLandingGnbEntry` 일 때 GNB 컨트롤 전체에 `tabIndex={-1}` 을 건다(`use-landing-gnb-entry-mode.ts:51-54`), 여기에 **모바일 햄버거도 포함된다**(`site-gnb.tsx:398`). 따라서 모바일 랜딩에서 Tab 은 GNB 를 건너뛰고 첫 카드로 간다. 역방향 경로는 살아 있다 — `focusLandingReverseGnbTarget` 이 `tabindex` 를 보지 않고 `.focus()` 를 부르며(`use-landing-keyboard-entry.ts:38-48` · `interaction-dom.ts:92-110`), 포커스가 들어오면 `focusin` 핸들러가 모드를 `gnb` 로 되돌려 `tabIndex` 를 복구한다. 즉 「첫 카드에서 Shift+Tab」이 유일한 발견 경로다. `req-landing.md:247` 은 이 card-first 정책을 **desktop/tablet 으로 한정**하므로 구현이 계약보다 넓다. 스크린리더는 DOM 순서로 훑으므로 영향이 없고 외장 키보드·스위치 컨트롤 사용자만 해당된다. **제안**: 계약을 구현에 맞춰 넓히거나(모바일도 card-first), 모바일에서는 `mobileLandingTabIndex` 를 걸지 않는다 — 둘 중 하나를 골라 문서와 코드를 일치시킨다.

### F-21 `title` 툴팁이 터치에서 유일한 설명인 자리가 셋 있다

`consent-banner.tsx:269`(`Preferences panel coming soon` — F-05 에서 다룬 no-op 의 유일한 설명), `settings-controls.tsx:154`(테마 칩, `aria-label` 병기라 AT 는 안전), `site-gnb.tsx:314`(설정 트리거, 역시 `aria-label` 병기). 터치 기기에는 hover 가 없어 `title` 이 절대 표시되지 않는다. 뒤 둘은 `aria-label` 이 있어 실질 손실이 없지만, 아이콘 전용 컨트롤의 의미를 시각적으로 확인할 방법이 터치에서 0 이라는 사실은 남는다. **제안**: `title` 을 지우고(중복이다) 아이콘 전용 컨트롤에는 눌렀을 때 열리는 레이어 안에 보이는 라벨을 둔다 — 설정 트리거는 이미 그렇다(레이어 안의 「LANGUAGE ⋅ THEME」). `Preferences` 는 F-05 에서 제거 또는 구현으로 해소된다.

---

## 5. 미확인 — 이 렌즈가 재지 못한 것

1. **프로덕션 문항 수.** F-03 · F-06 의 비용 추정은 fixture(qmbti 8 · egtt scoring 3) 기준이다. 실제 문항은 Questions Sheets 소유(`req-test.md:105`)이고 `:786-789` 의 예시 payload 가 60문항을 암시하나 그것은 문서의 예시다.
2. **`disabled` 전이 시 포커스가 `<body>` 로 가는 실제 브라우저 거동.** HTML 사양과 주요 브라우저 구현상 확정적이지만 이 세션에서 렌더로 재현하지 않았다. 코드 경로(`use-answer-lock.ts:33` → `test-question-client.tsx:364,377`)만 확정이다.
3. **F-12 의 기기별 재현.** `pointerdown → focus → click` 순서는 사양이지만, iOS Safari 가 `<button>` 탭에 포커스를 주지 않는다는 점 때문에 증상이 Android 에만 나타날 가능성이 있다. 900×1200 터치 프로파일에서 `gnb-settings-trigger` 를 **클릭**(`focus()` 직접 호출이 아니라)하는 Playwright 케이스 하나면 판정된다.
4. **드로어가 넘칠 때 `body{touch-action:none}` 이 드로어 자체의 팬을 막는지.** 390×844 에서는 넘치지 않는 것을 baseline 으로 확인했다(설정 블록 y 556..811, `mt-auto` 위 여유 약 320px). 가로 모드(dvh≈390)와 200% 확대에서는 넘치며, 그때 `use-gnb-mobile-menu.ts:141` 의 `touchAction='none'` 이 자손 스크롤 컨테이너에 미치는 영향은 CSS Touch Action 사양 해석과 브라우저 구현에 따라 갈린다 — 실기기 확인이 필요하다.
5. **F-16 의 실제 가림.** `scroll-padding-top` 부재는 전수 grep 으로 확정했으나, Shift+Tab 으로 위로 스크롤했을 때 포커스 링이 실제로 GNB 아래로 들어가는지는 렌더로 재지 않았다.
6. **12개 로케일에서 instruction overlay 의 CTA 2개 줄바꿈.** theme-matrix baseline 이 en/kr 뿐이라 de/fr/hi/id/ru 에서 `flex-wrap + justify-end` 가 만드는 계단형 배치를 관측하지 못했다. 구조(`instruction-overlay.tsx:20,227`)는 확정이다.
7. **실제 대비비(WCAG 1.4.3 / 1.4.11).** 선택된 답변의 `--sage-muted` 채움 위 `--ink-soft` 라벨, `disabled` 칩의 `--fg-disabled`, 포커스 링 `--focus-ring` 의 인접 색 대비를 렌더 픽셀로 재지 않았다.
8. **`aria-pressed` + `disabled` 조합을 스크린리더가 실제로 어떻게 읽는지.** VoiceOver/TalkBack 에서 「English, pressed, dimmed」로 읽히는지, 탐색 모드에서 아예 건너뛰는지는 AT 로 확인하지 않았다.
9. **`public/56T-ToDo.html`(578KB, 추적됨, `/56T-ToDo.html` 로 서빙 가능).** ViveTest 표면이 아니라고 판단해 이 렌즈에서 제외했고, 그 안의 폼 컨트롤은 감사하지 않았다. 저장소 위생 항목으로 별도 판단이 필요하다.
