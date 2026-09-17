import type {VariantId} from '@/features/test/domain';

import {testVariantKey} from '@/features/test/storage/test-storage-keys';
import {volatilizeRunData} from '@/features/test/storage/volatility';
import {readLocal, removeLocal, writeLocal} from '@/lib/safe-storage';

const ACTIVE_RUN_TIMEOUT_MS = 30 * 60 * 1000;

export interface ActiveRun {
  variantId: VariantId;
  lastAnsweredAtMs: number;
  startedAtMs: number;
}

function isActiveRun(value: unknown, variantId: VariantId): value is ActiveRun {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ActiveRun>;
  return (
    candidate.variantId === variantId &&
    typeof candidate.startedAtMs === 'number' &&
    Number.isFinite(candidate.startedAtMs) &&
    typeof candidate.lastAnsweredAtMs === 'number' &&
    Number.isFinite(candidate.lastAnsweredAtMs)
  );
}

/**
 * 활성 회차를 **쓰지 않고** 읽는다.
 *
 * `getActiveRun` 은 읽으면서 치운다 — 깨진 값을 지우고, 시간이 지난 회차의 작업 데이터를
 * 휘발시킨다. 그 청소는 테스트 화면이 부트스트랩할 때 옳지만, **회차 이력 목록처럼 그저 물어보는
 * 자리**에서는 옳지 않다: 목록을 한 번 그리는 일이 다른 variant 의 저장소를 지우면 안 된다.
 *
 * 그래서 판정과 청소를 갈랐다. 여기는 판정만 하고, 무엇을 치워야 하는지는 이유로 돌려준다.
 */
export type ActiveRunPeek =
  | {status: 'live'; run: ActiveRun}
  | {status: 'stale'}
  | {status: 'corrupt'}
  | {status: 'none'};

export function peekActiveRun(variantId: VariantId): ActiveRunPeek {
  const raw = readLocal(testVariantKey.activeRun(variantId));
  if (!raw) {
    return {status: 'none'};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {status: 'corrupt'};
  }

  if (!isActiveRun(parsed, variantId)) {
    return {status: 'corrupt'};
  }

  if (Date.now() - parsed.lastAnsweredAtMs >= ACTIVE_RUN_TIMEOUT_MS) {
    return {status: 'stale'};
  }

  return {status: 'live', run: parsed};
}

export function getActiveRun(variantId: VariantId): ActiveRun | null {
  const peeked = peekActiveRun(variantId);

  if (peeked.status === 'corrupt') {
    removeLocal(testVariantKey.activeRun(variantId));
    return null;
  }

  if (peeked.status === 'stale') {
    volatilizeRunData(variantId, 'inactivity');
    return null;
  }

  return peeked.status === 'live' ? peeked.run : null;
}

export function saveActiveRun(variantId: VariantId, run: ActiveRun): void {
  writeLocal(testVariantKey.activeRun(variantId), JSON.stringify(run));
}

export function writeLastAnsweredAt(variantId: VariantId): void {
  const run = getActiveRun(variantId);
  if (!run) {
    return;
  }

  saveActiveRun(variantId, {
    ...run,
    lastAnsweredAtMs: Date.now()
  });
}

export function clearActiveRun(variantId: VariantId): void {
  removeLocal(testVariantKey.activeRun(variantId));
}
