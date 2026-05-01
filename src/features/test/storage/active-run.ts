import type {VariantId} from '@/features/test/domain';

import {testVariantKey} from '@/features/test/storage/test-storage-keys';
import {volatilizeRunData} from '@/features/test/storage/volatility';

const ACTIVE_RUN_TIMEOUT_MS = 30 * 60 * 1000;

export interface ActiveRun {
  variantId: VariantId;
  lastAnsweredAtMs: number;
  startedAtMs: number;
}

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
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

export function getActiveRun(variantId: VariantId): ActiveRun | null {
  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }

  const key = testVariantKey.activeRun(variantId);
  const raw = storage.getItem(key);
  if (!raw) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    storage.removeItem(key);
    return null;
  }

  if (!isActiveRun(parsed, variantId)) {
    storage.removeItem(key);
    return null;
  }

  if (Date.now() - parsed.lastAnsweredAtMs >= ACTIVE_RUN_TIMEOUT_MS) {
    volatilizeRunData(variantId, 'inactivity');
    return null;
  }

  return parsed;
}

export function saveActiveRun(variantId: VariantId, run: ActiveRun): void {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  storage.setItem(testVariantKey.activeRun(variantId), JSON.stringify(run));
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
  const storage = getLocalStorage();
  storage?.removeItem(testVariantKey.activeRun(variantId));
}
