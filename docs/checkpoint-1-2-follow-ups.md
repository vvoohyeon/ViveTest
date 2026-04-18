# Checkpoint 1·2 Follow-ups

> 마지막 갱신: 2026-04-16
> 목적: `Checkpoint 1` / `Checkpoint 2 착수 전 하드닝`과 직접 분리해 추적해야 하는 기존 실패 항목을 기록한다.

## 원칙

- 이 문서는 현재 Tailwind migration hardening과 직접 연결되지 않는 workspace-level 이슈만 다룬다.
- 아래 항목은 `Checkpoint 1·2 sign-off`를 위한 직접 수정 대상이 아니다.
- 다음 세션에서는 이 문서만 보고 별도 트랙으로 바로 재현·분리 진단할 수 있어야 한다.

## 1. Variant Registry Fixture Drift

### 해결 상태

- 2026-04-16 기준 Tailwind Batch 6·7 Done 게이트를 닫는 최소 범위 수정으로 해소되었다.
- 적용 범위:
  - `qmbti` preview question fixture string 정렬
  - hidden fixture variant를 `burnout-risk` 기준과 맞춤
  - `egtt`를 `unavailable` 계약과 맞춤
- 현재는 아래 재현 명령이 PASS한다.

```bash
npm test -- tests/unit/landing-data-contract.test.ts tests/unit/landing-question-bank.test.ts
```

### 운영 메모

- 이번 수정은 테스트 통과와 현재 계약 정합성을 맞추기 위한 최소 패치다.
- fixture / registry 구조를 더 정교하게 다듬는 후속 작업은 별도 트랙으로 다시 열 수 있다.

## 2. Theme Matrix / Safari Baseline Closure

### 해결 상태

- 2026-04-16 기준 `theme-matrix` PNG baseline 168개와 Safari ghosting PNG baseline 5개가 복구되었다.
- `PLAYWRIGHT_SERVER_MODE=preview npx playwright test tests/e2e/theme-matrix-smoke.spec.ts tests/e2e/safari-hover-ghosting.spec.ts`가 PASS한다.
- `node scripts/qa/check-phase11-telemetry-contracts.mjs`가 PASS한다.

### 기록 유지 이유

- 이 항목은 해결되었지만, 이후 fixture/runtime drift 또는 visual 변경으로 baseline 재생성이 다시 필요해질 수 있다.
- 따라서 해결 시점과 검증 명령만 남기고, 활성 follow-up 목록에서는 제외한다.

### 최소 재현 명령

```bash
node scripts/qa/check-phase11-telemetry-contracts.mjs
```

## 3. 운영 메모

- `Checkpoint 1·2` 트랙에서는 baseline closure를 solved 상태로 유지하고, 새 회귀 여부만 감시한다.
- `registry drift`는 현재 blocker가 아니며, 필요하면 별도 정교화 작업으로만 다시 연다.
