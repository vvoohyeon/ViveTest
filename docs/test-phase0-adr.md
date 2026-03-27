# Test Phase 0 ADR Status

> 기준 시점: 2026-03-27  
> 목적: `docs/req-test-plan.md` Phase 0 ADR-A / ADR-B / ADR-E의 현재 상태를 실제 워크트리 기준으로 기록한다.

## ADR-A — `src/features/test` 네임스페이스 분리 + `test-question-client.tsx` clean-room 교체

**상태**: 미완료

현재 저장소 사실:
- canonical test runtime은 아직 `src/features/landing/test/` 아래에 있다.
- `src/app/[locale]/test/[variant]/page.tsx`는 여전히 `@/features/landing/test/test-question-client`를 import한다.
- `src/features/test` 디렉토리는 아직 존재하지 않는다.
- malformed variant는 route 단계에서 `notFound()`로 종료되고, unknown variant는 `question-bank.ts` generic fallback을 사용한다.

이번 changeset에서 확정하는 결정:
- 실제 분리 착수 시 canonical namespace는 `src/features/test`다.
- `src/features/landing/test/*`는 최종적으로 shim-only compatibility surface가 되어야 한다.
- clean-room 교체 범위는 test question runtime, question definition resolution, test-owned storage/telemetry seam까지 포함한다.

미완료 사유:
- 물리 경로 분리, shim cutover, route import 전환이 아직 저장소에 반영되지 않았다.
- same-route recoverable invalid-variant 처리도 아직 현행 워크트리에 없다.

## ADR-B — Storage Key 네이밍 + 5개 상태 플래그 계약

**상태**: 미완료

현재 저장소 사실:
- Phase 3의 5개 상태 플래그 명명 규칙과 cleanup grouping은 아직 문서화되지 않았다.
- `VariantId`/storage prefix 정합성도 Phase 1 착수 전 최종 결정이 필요하다.

이번 changeset에서 확정하는 결정:
- ADR-B는 이번 changeset의 범위 밖이다.
- Phase 0 전체 게이트는 ADR-A와 별개로 ADR-B가 닫히기 전까지 완료로 간주하지 않는다.

## ADR-E — Representative Variant 범위 + QA Baseline 정비

**상태**: 부분 완료

이번 changeset에서 확정하는 결정:
- Phase 0의 QA gate는 `qa:gate:once` GREEN 복구를 기준으로 본다.
- representative test route anchor는 `tests/e2e/helpers/landing-fixture.ts`의 `PRIMARY_AVAILABLE_TEST_VARIANT`를 single source로 사용한다.
- theme-matrix / safari ghosting PNG baseline은 **로컬 QA 자산**이며 Git tracked completeness는 완료 조건이 아니다.
- manifest closure와 local baseline directory completeness는 유지해야 하지만, PNG를 저장소에 커밋하는 것은 필수 전제가 아니다.
- blocker traceability registry는 `1~30`까지 확장하되, 현재 구현 상태를 반영하기 위해 `automated_assertion` / `scenario_test` / `manual_checkpoint` 혼합 evidence를 허용한다.

잔여 주의점:
- mixed-evidence blocker registry와 local baseline 정책은 이번 changeset에서 정리되었지만, `qa:gate:once`는 아직 unrelated unit drift로 인해 GREEN이 아니다.
- 현재 확인된 blocker는 `tests/unit/gnb-message-labels.test.ts`의 combined theme label 기대값 불일치다.
- 따라서 ADR-E는 문서/traceability 기준으로는 정리되었지만, gate 복구 완료 전까지는 완전 종료로 간주하지 않는다.

## Phase 0 상태 요약

- issue #1: traceability와 baseline 정책 문서화는 완료했지만 `qa:gate:once`가 아직 RED라서 완전히 닫히지 않았다.
- issue #2: 실제 코드 분리 미착수 상태이므로 계속 미완료다.
- Phase 0 전체: ADR-A, ADR-B가 남아 있으므로 아직 완료가 아니다.
