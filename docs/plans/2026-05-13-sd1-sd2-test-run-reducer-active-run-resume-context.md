저장된 계획 문서와 이번 지시문이 핵심 구조에서 충돌합니다.

- `docs/plans/2026-05-13-sd1-sd2-test-run-reducer-active-run-resume.md`는 SD-1에서 `use-test-entry-orchestrator.ts`를 **삭제하지 말고** reducer-aware adapter로 유지하라고 합니다.
- 이번 지시문은 Unit B에서 `src/features/test/use-test-entry-orchestrator.ts`와 해당 테스트를 **삭제**하라고 명시합니다.

이건 단순 세부 차이가 아니라 phase/entry side-effect 소유권 결정이라, repo `AGENTS.md`의 clarification rule상 코드 수정 전에 결정이 필요합니다.

질문은 하나입니다: 이번 메시지에 붙여주신 지시문을 저장된 계획 문서보다 우선하는 실행 SSOT로 보고, `use-test-entry-orchestrator.ts` 삭제 방향으로 진행할까요?

### Context Restore

- Open Questions: 이번 pasted instruction이 계획 문서의 “orchestrator 유지” 결정을 override하는지 확인 필요
- Deferred Options: orchestrator 유지 adapter 방식 vs 삭제 후 controller reducer 통합 방식
- Files to Revisit: `docs/plans/2026-05-13-sd1-sd2-test-run-reducer-active-run-resume.md`, `src/features/test/use-test-entry-orchestrator.ts`, `src/features/test/use-test-run-controller.ts`
