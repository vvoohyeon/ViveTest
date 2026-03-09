# Backlog

## 1. Purpose / How to use
- 이 문서는 구현 SSOT가 아니다. 요구사항 판단은 항상 [req-landing-final.md](/Users/woohyeon/Local/VibeTest/docs/req-landing-final.md) 를 우선한다.
- 목적은 후속 Agent가 현재 상태를 빠르게 이어받도록, 이미 닫힌 축과 보류 축을 짧게 구분해 두는 것이다.
- 보류 항목은 방향만 남긴다. 구체 설계, selector, state 이름, 파일 단위 지시는 의도적으로 제한한다.
- 구현에 착수할 때는 backlog를 그대로 집행하지 말고, 해당 시점 코드베이스와 smoke/traceability를 다시 재탐색한다.

## 2. Recently Completed Areas
- 모바일 transient shell 기반 open/close choreography와 close perception 안정화
- 모바일 keyboard handoff 수정 및 CTA traversal 이후 이전 expanded 정리
- mobile close title continuity 수정
- GNB 기본 keyboard/context matrix 증빙 확대
- settings light/dark 선택 상태 초기 표시 정합화
- desktop/mobile 주요 focus 표현 보강과 blocker assertion 확장
- traceability / smoke / blocker assertion 보강
- preview-mode hydration zero-warning proof hardening과 first-paint bootstrap 정리
- canonical axe-core audit 도입과 대표 상태 자동 접근성 감사
- reduced-motion / cursor guardrail proof 강화
- transition source GNB overlay 유지/교체/cleanup proof와 representative overlay a11y sanity

## 3. Deferred / Follow-up Items

### 3.1 page/body scroll lock 해제
- 현재 상태: `요구사항 변경 검토 필요`
- 왜 지금 보류했는가: 현재 SSOT는 mobile full-bleed 동안 page scroll lock 유지를 명시한다. 단순 UX 개선으로 열기에는 요구사항 충돌이 크다.
- 관련 요구사항 / 체크리스트 / 블로커 축: `§8.5`, `§14.3-14`, checklist의 `strict scroll-lock window`
- 권장 구현 시점: 요구사항 재합의가 먼저 있을 때만
- 함께 다루면 좋은 인접 항목: mobile lifecycle, y-anchor/title baseline, restore-ready, outside close, CTA priority
- 아주 간단한 구현 방향 메모: page unlock이 아니라 internal expanded body scroll usability 검토가 먼저다. 정책이 바뀌면 mobile lifecycle 계약 전체를 다시 정의해야 한다.
- 주의사항: `y-anchor`, snapshot, restore, dim/backdrop, scroll lock window를 부분 수정으로 건드리면 회귀 반경이 매우 크다.

### 3.2 dark baseline 전체 확대
- 현재 상태: `visual regression coverage 확장 필요`
- 왜 지금 보류했는가: 현재 핵심 기능 축과 직접 연결되지 않고, screenshot churn만 크게 늘릴 가능성이 높다.
- 관련 요구사항 / 체크리스트 / 블로커 축: `§6.9`, blocker `#8`
- 권장 구현 시점: visual polish 또는 theme matrix 재정비 시점
- 함께 다루면 좋은 인접 항목: CTA visual rhythm, expanded visual polish, theme matrix
- 아주 간단한 구현 방향 메모: dark/light baseline은 기능 구조가 안정된 뒤 matrix를 넓히는 방식이 적절하다.
- 주의사항: 기능 수정과 baseline 확대를 같은 변경셋에 섞으면 diff 해석이 어려워진다.

### 3.3 SSR/hydration determinism 전체 재개방
- 현재 상태: `기본 closure 완료, render-tree refactor 시 재검토`
- 왜 지금 보류했는가: preview-mode hydration/log gate와 first-paint bootstrap은 구현되어 있다. 남은 것은 render/layout tree를 다시 여는 시점의 재감사다.
- 관련 요구사항 / 체크리스트 / 블로커 축: `§11.1`, checklist의 `SSR/hydration determinism`
- 권장 구현 시점: render/layout/tree를 다시 수정하는 phase
- 함께 다루면 좋은 인접 항목: initial render policy, zero-warning gate, routing shell
- 아주 간단한 구현 방향 메모: render tree를 다시 만질 때 build/preview log gate까지 포함해 재평가한다.
- 주의사항: 현재 green gate를 깨뜨리지 않도록, SSR 재개방은 별도 변경축으로 다루는 편이 안전하다.

### 3.4 전역 axe-core 접근성 자동화
- 현재 상태: `canonical audit 완료, broader coverage 강화 필요`
- 왜 지금 보류했는가: canonical representative states에 대한 axe-core audit은 구현되었다. 남은 것은 broader crawl/locale 확장이다.
- 관련 요구사항 / 체크리스트 / 블로커 축: `§9.3`
- 권장 구현 시점: a11y audit phase
- 함께 다루면 좋은 인접 항목: keyboard scenarios, overlay readability, GNB controls, destination pages
- 아주 간단한 구현 방향 메모: Playwright 기반 시나리오 위에 axe-core audit을 덧대는 방식이 적절하다.
- 주의사항: 현재 smoke가 닫는 계약과 axe audit 결과를 혼동하지 않도록 역할을 분리한다.

### 3.5 CTA visual rhythm / theme matrix 확대
- 현재 상태: `visual polish 후속 필요`
- 왜 지금 보류했는가: 핵심 기능 계약보다 visual polish 성격이 크며, 지금 열면 mobile/title/transition 변경과 기준선이 섞인다.
- 관련 요구사항 / 체크리스트 / 블로커 축: `§6.8`, `§6.9`
- 권장 구현 시점: visual polish pass 또는 theme matrix 확장 시점
- 함께 다루면 좋은 인접 항목: dark baseline 확대, CTA emphasis token 정리
- 아주 간단한 구현 방향 메모: token 통합과 screenshot matrix 확장을 같은 pass에서 검토하는 편이 효율적이다.
- 주의사항: 기능 회귀 수정과 visual polish를 한 변경셋에 섞지 않는다.

### 3.6 GNB 키보드 접근
- 현재 상태: `기본 계약 완료, broader context/state audit만 후속 필요`
- 왜 지금 보류했는가: landing의 card-first entry와 reverse GNB handoff를 포함한 기본 keyboard/context matrix는 구현 및 smoke로 닫혔다. 남은 것은 추가 context/state audit과 대표 상태 확대 성격이 더 크다.
- 관련 요구사항 / 체크리스트 / 블로커 축: `§6.4`, `§10.2`, `§9.1`, checklist의 `GNB responsive behavior as single source`
- 권장 구현 시점: keyboard audit 또는 context/state matrix 확대 시점
- 함께 다루면 좋은 인접 항목: hidden-state tabbability, focus restore, settings/mobile menu open-state traversal
- 아주 간단한 구현 방향 메모: 현재는 base contract를 유지하고, 후속은 matrix smoke 확장과 restore/tabbability audit 중심으로 접근한다.
- 주의사항: “미구현”으로 취급하면 안 된다. 현재는 기본 contract가 닫혀 있고, 남은 것은 context/state 확대 검증이다.

## 4. Suggested Timing Map
- 다음 Phase 전에 하면 안 되는 항목
  - `page/body scroll lock 해제`
  - 이유: SSOT 충돌 가능성이 크고, mobile 안정화 축을 다시 연다.
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
- mobile 관련 보류 항목을 열 때는 `y-anchor`, snapshot, restore, scroll lock window, CTA priority, keyboard handoff를 먼저 보호 대상으로 고정한다.
- traceability가 걸린 항목은 구현과 같은 변경셋에서 assertion mapping을 함께 갱신한다.
- “기능 미구현”과 “증빙/coverage 미완”을 구분한다. 특히 GNB keyboard와 axe-core는 후자 성격이 강하다.
