# 폰 시트의 A/B 답이 테스트로 들어가지 못하던 결함

**Task mode:** Implementation — 결함 수정 한 단위. wave 작업이 아니다. High-Risk 경로(`use-landing-interaction-controller.ts` · `src/features/transition/`)를 건드리므로 위험 차원과 E2E 회귀를 함께 적는다.

**사용자 결정.** 2026-09-24, 모바일 인터랙션 탐색 세션의 중간 확인에서 사용자가 「목업 뒤 이 세션에서 수정」을 택했다 — 별도 clone 에서 390px 재현 E2E 를 먼저 붉힌 뒤 고치고, 게이트 통과 후 main 에 착지한다.

## 무엇이 일어났나

step 3(`39d2869`)이 폰 카드 확장을 `document.body` 포탈에 그려지는 바텀시트로 옮긴 뒤, 폰에서 테스트로 들어가는 유일한 길 — 시트의 A/B 답 — 이 아무 일도 하지 않았다. 원인은 두 겹이었고 앞의 것을 고치자 뒤의 것이 드러났다.

**원인 ① — 카드를 DOM 조상에서 되찾았다.** 시트의 답은 `resolveCardInteractionBindings(card).onAnswerChoiceSelect` 로 들어가는데, 그 핸들러만 카드를 `event.currentTarget.closest('[data-card-variant]')` 로 찾았다. 포탈 안 버튼에는 카드 조상이 없어 핸들러가 빈손으로 반환했다 — 전환·pre-answer 저장·`card_answered` 가 모두 일어나지 않았다. 같은 바인딩의 다른 핸들러(`onCardKeyDown` · `onCardBlur` · 키보드 핸들러)는 이미 카드를 클로저로 받는다.

**원인 ② — 시트의 history 항목이 이동을 되돌렸다.** ①을 고치자 `transition_start` 는 나갔지만, 전환 시작으로 시트가 닫히며 제 history 항목을 `history.back()` 으로 거둬 방금의 `router.push` 를 취소했다. 1,600ms 뒤 `DESTINATION_TIMEOUT` 으로 실패하고 롤백이 방금 저장한 답을 지웠다. `use-overlay-history-entry.ts` 가 이미 정한 규칙 — 버튼의 `router.push` 는 호출부가 `discardOverlayHistoryEntry()` 를 직접 부른다(L53 ⑳, 선례 `site-gnb.tsx` 의 언어 칩) — 을 시트의 진입 경로가 따르지 않았다.

**왜 아무것도 붉어지지 않았나.** 랜딩→테스트 진입을 누르는 E2E 는 전부 1280·1440 이었다. 폰 폭 검사는 시트를 열고 닫기만 했다. 단위 검사는 답 버튼을 카드 루트 아래에 심은 DOM 으로 핸들러를 불러 포탈을 흉내 낼 수 없었다.

## 재현

수정 전 빌드, 390×844 터치: 카드 탭 → 시트 `OPEN` → `answerChoiceA` 탭 → 주소가 `/en` 에 머문다(`toHaveURL` 9 회 불일치). 단위 수준에서 포탈 버튼으로 부른 바인딩은 콜백을 0 회 불렀다. ①만 고친 빌드에서는 `transition_start` 뒤 `history.back()` 이 찍히고 `transition_fail`(`DESTINATION_TIMEOUT`)로 끝났다.

## 수정

| 파일 | 변경 |
|:---|:---|
| `src/features/landing/grid/use-landing-interaction-controller.ts` | 답 핸들러를 카드별 클로저로 — `useMemo` 로 카드마다 한 번 만들어 바인딩의 함수 정체성(단위 검사가 고정)을 유지한다. 조상 탐색은 그리드 안 트리거에만 붙는 `handleCardClick` 에 남는다(깨지지 않았고 범위 밖) |
| `src/features/transition/use-landing-transition.ts` | `beginTestTransition` 이 `router.push` 직전에 `discardOverlayHistoryEntry()` 를 부른다. 층이 없으면(데스크톱) 아무 일도 하지 않는다 |
| `tests/unit/landing-interaction-controller-handlers.test.ts` | 카드 조상이 없는 포탈 버튼으로 진입이 시작되는지 |
| `tests/e2e/transition-telemetry-smoke.spec.ts` | 390px 시트 답 → 주소 이동 · instruction 시트 · 진행률 13% · `card_answered` 1 회 · 전환 신호 1 회 |
| `docs/LESSONS_LEARNED.md` | L59 |

계약은 바꾸지 않는다 — 구현을 `docs/req-landing-interaction.md` 의 진입 경로와 `docs/req-landing.md` §13 전환 핸드셰이크로 되돌린다.

## 영향과 위험 차원

shared shell/GNB 없음 · localization 없음 · a11y 없음(버튼·포커스 불변) · state contracts: 폰에서 전환 저장 키·`card_answered` 가 계약대로 다시 기록된다 · core user flow: 폰의 랜딩→테스트 진입이 복구된다. usability 복구, responsiveness·design-system consistency 변화 없음, performance 는 카드 목록이 바뀔 때만 카드 수만큼 클로저를 만든다.

범위 밖으로 남긴 것: 명세 §2-2 의 「전환 동안 시트를 제자리에 둔다 · 탭한 답에 `data-pending`」은 여전히 구현되지 않았다. 이 수정은 이동을 살릴 뿐 그 연출을 만들지 않는다.

## 검증

`npm run lint`(오류 0, 경고 2 는 main 에도 있는 기존 것) · `npm run typecheck` · `npm test`(124 파일 836 건) · `npm run build` 통과. 자체 포트(4291)의 빌드 서버에 붙여 chromium E2E 를 시각 baseline 스펙 둘을 빼고 전부 돌렸다 — 236 건 통과. 새 E2E 는 수정 전 빌드에서 붉었고 수정 뒤 초록이다.
