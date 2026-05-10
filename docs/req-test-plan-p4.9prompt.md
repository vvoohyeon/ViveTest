## Goal

Phase 5 (Instruction Gate · Runtime Entry Commit) 구현을 시작하기 전에, `docs/req-test-plan.md`의 "Phase 5/6 사전 설계 결정" 섹션 SD-1을 먼저 구현하라. SD-1 구현 완료 후 Phase 5 본 구현을 진행한다.

## SD-1: Phase 통합 Reducer 구현

`src/features/test/test-question-client.tsx`의 분리된 entry phase `useState`를 (`instructionSeen`, `entryCommitted`, `redirecting`, `started`, `submitted`) `docs/req-test-plan.md` SD-1에 명시된 `TestRunPhase` discriminant 기반 통합 reducer로 교체하라.

구체적으로:
1. `type TestRunPhase = 'booting' | 'instruction' | 'active' | 'submitted' | 'redirecting'`를 정의한다.
2. `interface TestRunState`에 `phase: TestRunPhase`를 최상위 필드로 추가한다.
3. SD-1에 명시된 6개 action(`BOOTSTRAP_COMPLETE`, `COMMIT_ENTRY`, `REDIRECT_HOME`, `SELECT_ANSWER`, `NAVIGATE_PREVIOUS`, `SUBMIT`)을 구현한다.
4. 모든 side effect(`markInstructionSeen`, `trackAttemptStart`, `consumeLandingIngress`)는 phase 전환 이후 `useEffect`에서 실행한다. `useRef` flag 패턴(`attemptStartedRef` 등)을 이 구조로 대체한다.
5. reducer를 순수 함수로 추출하고 action 시퀀스 단위 unit test를 작성한다.

## Observable Behavior

SD-1 구현은 observable behavior를 변경하지 않는다. 기존 smoke/E2E 테스트가 모두 통과해야 한다.

## Verification

- `npm run lint && npm run typecheck && npm test` 통과
- `npm run qa:rules` 통과
- `tests/e2e/consent-smoke.spec.ts` 통과
- `tests/e2e/state-smoke.spec.ts` 통과

SD-1 완료 후 Phase 5 본 구현(instruction overlay, `instructionSeen` lifecycle, commit 도메인 이벤트)을 착수한다.
