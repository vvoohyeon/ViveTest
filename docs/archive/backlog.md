# Backlog

## 1. Purpose / How to use
- 이 문서는 구현 SSOT가 아니다. 요구사항 판단은 항상 [req-landing-final.md](../req-landing-final.md) 를 우선한다.
- 목적은 후속 Agent가 현재 상태를 빠르게 이어받도록, 이미 닫힌 축과 보류 축을 짧게 구분해 두는 것이다.
- 보류 항목은 방향만 남긴다. 구체 설계, selector, state 이름, 파일 단위 지시는 의도적으로 제한한다.
- 구현에 착수할 때는 backlog를 그대로 집행하지 말고, 해당 시점 코드베이스와 smoke/traceability를 다시 재탐색한다.

## 2. Recently Completed Areas
- 모바일 transient shell 기반 open/close choreography와 close perception 안정화
- 모바일 keyboard handoff 수정 및 CTA traversal 이후 이전 expanded 정리
- mobile close title continuity 수정
- GNB 기본 keyboard/context matrix 증빙 확대
- settings light/dark 선택 상태 초기 표시 정합화
- boundary-exhaustive dark baseline + CTA/destination/mobile state-exhaustive theme matrix closure
- desktop/mobile 주요 focus 표현 보강과 blocker assertion 확장
- traceability / smoke / blocker assertion 보강
- preview-mode hydration zero-warning proof hardening과 first-paint bootstrap 정리
- canonical axe-core audit 도입과 대표 상태 자동 접근성 감사
- reduced-motion / cursor guardrail proof 강화
- transition source GNB overlay 유지/교체/cleanup proof와 representative overlay a11y sanity
- 모바일 Expanded settled-only page scroll unlock과 current-scroll-preserving close semantics

## 3. Deferred / Follow-up Items

### 3.1 dark baseline 전체 확대
- 현재 상태: `locale/viewport boundary-exhaustive dark baseline closure 완료, active backlog 아님`
- 왜 지금 보류했는가: 현 locale set(`en/kr`)과 boundary viewport set 기준 closure는 끝났다. 이후 reopen 사유는 locale 추가나 visual language 재정의뿐이다.
- 관련 요구사항 / 체크리스트 / 블로커 축: `§6.9`, blocker `#8`
- 권장 구현 시점: locale set이나 boundary definition이 바뀔 때만 재개방
- 함께 다루면 좋은 인접 항목: CTA visual rhythm, expanded visual polish, theme matrix
- 아주 간단한 구현 방향 메모: 현재 기준선은 manifest-driven boundary suite다. 이후 확장은 manifest에 locale/viewport case를 명시적으로 추가하는 방식으로만 연다.
- 주의사항: 현재 항목은 닫혔다. reopen 시에는 manifest/QA/backlog를 같은 변경셋에서 같이 갱신한다.

### 3.2 SSR/hydration determinism 전체 재개방
- 현재 상태: `기본 closure 완료, render-tree refactor 시 재검토`
- 왜 지금 보류했는가: preview-mode hydration/log gate와 first-paint bootstrap은 구현되어 있다. 남은 것은 render/layout tree를 다시 여는 시점의 재감사다.
- 관련 요구사항 / 체크리스트 / 블로커 축: `§11.1`, checklist의 `SSR/hydration determinism`
- 권장 구현 시점: render/layout/tree를 다시 수정하는 phase
- 함께 다루면 좋은 인접 항목: initial render policy, zero-warning gate, routing shell
- 아주 간단한 구현 방향 메모: render tree를 다시 만질 때 build/preview log gate까지 포함해 재평가한다.
- 주의사항: 현재 green gate를 깨뜨리지 않도록, SSR 재개방은 별도 변경축으로 다루는 편이 안전하다.

### 3.3 전역 axe-core 접근성 자동화
- 현재 상태: `canonical audit + destination GNB representative coverage 완료, broader coverage 강화 필요`
- 왜 지금 보류했는가: canonical representative states와 destination GNB representative open state에 대한 axe-core audit은 구현되었다. 남은 것은 broader crawl/locale 확장이다.
- 관련 요구사항 / 체크리스트 / 블로커 축: `§9.3`
- 권장 구현 시점: a11y audit phase
- 함께 다루면 좋은 인접 항목: keyboard scenarios, overlay readability, GNB controls, destination pages
- 아주 간단한 구현 방향 메모: Playwright 기반 시나리오 위에 axe-core audit을 덧대는 방식이 적절하다.
- 주의사항: 현재 smoke가 닫는 계약과 axe audit 결과를 혼동하지 않도록 역할을 분리한다.

### 3.4 CTA visual rhythm / theme matrix 확대
- 현재 상태: `CTA rhythm + destination/settings/mobile state-exhaustive matrix closure 완료, active backlog 아님`
- 왜 지금 보류했는가: 현재 시각 언어와 locale set 기준으로 CTA-bearing state closure는 끝났다. 남은 것은 새 art-direction을 여는 별도 디자인 pass다.
- 관련 요구사항 / 체크리스트 / 블로커 축: `§6.8`, `§6.9`
- 권장 구현 시점: art-direction 자체를 다시 조정할 때만 재개방
- 함께 다루면 좋은 인접 항목: dark baseline 확대, CTA emphasis token 정리
- 아주 간단한 구현 방향 메모: 현재 기준선은 manifest-driven state suite다. 후속은 semantic token을 다시 설계하거나 새로운 state inventory를 정의할 때만 연다.
- 주의사항: 현재 항목은 닫혔다. 향후 reopen 시에는 screenshot inventory와 QA guard를 동시에 갱신한다.

### 3.5 GNB 키보드 접근
- 현재 상태: `기본 계약 + desktop destination representative audit 완료, broader context/state audit 일부 후속 필요`
- 왜 지금 보류했는가: landing의 card-first entry와 reverse GNB handoff를 포함한 기본 keyboard/context matrix, 그리고 desktop blog/history 대표 context의 기본 순회와 focus-out close smoke는 구현되었다. 남은 것은 추가 context/state audit과 대표 상태 확대 성격이 더 크다.
- 관련 요구사항 / 체크리스트 / 블로커 축: `§6.4`, `§10.2`, `§9.1`, checklist의 `GNB responsive behavior as single source`
- 권장 구현 시점: keyboard audit 또는 context/state matrix 확대 시점
- 함께 다루면 좋은 인접 항목: hidden-state tabbability, focus restore, settings/mobile menu open-state traversal
- 아주 간단한 구현 방향 메모: 현재는 base contract를 유지하고, 후속은 matrix smoke 확장과 restore/tabbability audit 중심으로 접근한다.
- 주의사항: “미구현”으로 취급하면 안 된다. 현재는 기본 contract가 닫혀 있고, 남은 것은 context/state 확대 검증이다.

## 4. Suggested Timing Map
- 다음 Phase 전에 하면 안 되는 항목
  - 없음
- 다음 Phase에 꼭 포함될 필요는 없지만, 관련 구조를 다시 만질 때 함께 보는 것이 좋은 항목
  - `GNB 키보드 접근`의 추가 context/state audit
- 기능보다 검증/증빙 성격이 강한 항목
  - `전역 axe-core 접근성 자동화`
  - `GNB 키보드 접근` 후속 audit
- visual polish / matrix expansion 성격의 항목
  - `dark baseline 전체 확대`
  - `CTA visual rhythm / theme matrix 확대`
- render/layout 구조 재작업 시점에 여는 것이 적절한 항목
  - `SSR/hydration determinism 전체 재개방`

## 5. Notes for Future Agents
- backlog는 구현 지시서가 아니다. 착수 전 반드시 현재 코드, smoke, traceability를 다시 읽는다.
- mobile 관련 후속 항목을 열 때는 `y-anchor`, snapshot, restore, scroll lock window, CTA priority, keyboard handoff를 먼저 보호 대상으로 고정한다.
- traceability가 걸린 항목은 구현과 같은 변경셋에서 assertion mapping을 함께 갱신한다.
- “기능 미구현”과 “증빙/coverage 미완”을 구분한다. 특히 GNB keyboard와 axe-core는 후자 성격이 강하다.
