# Test Flow Traceability Checkpoints

> 목적: `docs/blocker-traceability.json`의 mixed-evidence entry 중 blocker `20~30`이 참조하는 현재 checkpoint anchor를 제공한다.  
> 주의: 이 문서는 future-phase 기능이 이미 구현되었다는 뜻이 아니라, 현재 저장소 기준으로 어떤 증거 형태를 사용할지와 executable 승격 경로를 기록한다.

### assertion:B20-result-entry-eligibility

Blocker 20. 현재 kind는 `manual_checkpoint`다. intended verification surface는 마지막 문항 응답과 result-entry eligibility 즉시 반영 로직이며 Phase 6/7 소유다. executable 승격 조건은 all-required-answered, tail reset, 마지막 문항 변경 유지 규칙을 unit/e2e로 단언하는 것이다.

### assertion:B21-final-question-screen

Blocker 21. 현재 kind는 `manual_checkpoint`다. intended verification surface는 마지막 문항 화면의 "결과 보기" CTA 제공과 back-from-loading / derivation-failure 복귀 UX이며 Phase 6/7 소유다. executable 승격 조건은 final question screen CTA presence와 response preservation을 smoke 또는 unit test로 고정하는 것이다.

### assertion:B22-result-derivation-loading

Blocker 22. 현재 kind는 `manual_checkpoint`다. intended verification surface는 5초 최소 로딩, `derivation_computed` + `min_loading_duration_elapsed` AND commit, 5개 상태 플래그 hygiene이며 Phase 7 소유다. executable 승격 조건은 storage state transition과 loading timing gate를 unit/e2e로 검증하는 것이다.

### assertion:B23-back-from-loading

Blocker 23. 현재 kind는 `manual_checkpoint`다. intended verification surface는 loading 뒤로가기 시 항상 마지막 문항 복귀, residue 정리, commit 미발생 보장이며 Phase 7 소유다. executable 승격 조건은 back-from-loading 전용 scenario를 추가하는 것이다.

### assertion:B24-commit-failure

Blocker 24. 현재 kind는 `manual_checkpoint`다. intended verification surface는 old active run 유지, staged entry 폐기, 허용 액션 3가지 제공과 재검증 흐름이며 Phase 10 소유다. executable 승격 조건은 commit-failure taxonomy와 action matrix를 smoke로 추가하는 것이다.

### assertion:B25-derivation-failure

Blocker 25. 현재 kind는 `manual_checkpoint`다. intended verification surface는 commit-failure와 분리된 derivation-failure taxonomy, cleanup bundle, eligibility 유지, partial carryover 0건이며 Phase 10 소유다. executable 승격 조건은 failure recovery fixture를 unit/e2e로 추가하는 것이다.

### assertion:B26-traceability-closure

Blocker 26. 현재 kind는 `manual_checkpoint`다. intended verification surface는 req-test blocker `1~25` 전체의 final release traceability closure이며 Phase 11 소유다. executable 승격 조건은 future-phase blocker가 실제 구현된 뒤 automated assertion coverage 기준으로 재평가하는 것이다.

### assertion:B27-type-segment-parsing-qualifier-validation

Blocker 27. 현재 kind는 `manual_checkpoint`다. intended verification surface는 qualifier-aware type segment parsing, qualifier value validation, profile/scoring question index integrity이며 Phase 1/2/8 소유다. executable 승격 조건은 parser/validator pure function과 error render path를 자동 단언으로 추가하는 것이다.

### assertion:B28-cross-phase-event-integrity-shared-fixture

Blocker 28. 이 blocker는 현재 executable evidence를 별도로 갖지만, shared fixture narrative는 반드시 문서로도 고정한다. landing blocker 15와 동일한 ingress fixture를 공유하며, `card_answered -> attempt_start` 순서와 `landing_ingress_flag` / `question_index_1based` 정합성을 같은 시나리오에서 해석해야 한다. direct entry branch도 동일 파일 내 paired assertion으로 유지한다.

### assertion:B29-sheets-sync-action-validation

Blocker 29. 현재 kind는 `scenario_test`다. intended verification surface는 GitHub Action cross-sheet validation, last-known-good 유지, partial activation 차단이며 Phase 2 소유다. executable 승격 조건은 Action 또는 동등 dry-run fixture가 저장소에 추가되어 generated registry commit gate를 자동 검증하는 것이다.

### assertion:B30-runtime-lazy-validation-unavailable-guard

Blocker 30. 현재 kind는 `manual_checkpoint`다. intended verification surface는 lazy validation caching, unavailable guard, variant 격리, no-session-on-failure 보장이며 Phase 2/4 소유다. executable 승격 조건은 `getLazyValidatedVariant()`와 recoverable routing path가 실제 구현된 뒤 cache/isolation contract를 자동 검증하는 것이다.
