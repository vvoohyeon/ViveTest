import {SESSION_STORAGE_KEYS, variantSessionKeys} from '@/features/landing/storage/storage-keys';
import {readSession, removeSession, writeSession} from '@/lib/safe-storage';

export type LandingTransitionResultReason =
  | 'USER_CANCEL'
  | 'DUPLICATE_LOCALE'
  | 'DESTINATION_TIMEOUT'
  | 'DESTINATION_LOAD_ERROR'
  | 'UNKNOWN';

export interface PendingLandingTransition {
  transitionId: string;
  sourceVariant: string;
  targetRoute: string;
  targetType: 'test' | 'blog';
  startedAtMs: number;
  variant: string;
  preAnswerChoice?: 'A' | 'B';
}

export interface LandingIngressRecord {
  variant: string;
  preAnswerChoice: 'A' | 'B';
  createdAtMs: number;
  landingIngressFlag: true;
}

export const LANDING_TRANSITION_STORE_EVENT = 'landing:transition-store-change';
export const LANDING_TRANSITION_CLEANUP_EVENT = 'landing:transition-cleanup';

function readJson<T>(key: string): T | null {
  const raw = readSession(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    removeSession(key);
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  writeSession(key, JSON.stringify(value));
}

function dispatchStoreChangeEvent(name: string, detail: Record<string, unknown>): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new window.CustomEvent(name, {
      detail
    })
  );
}

export function writePendingLandingTransition(transition: PendingLandingTransition): void {
  writeJson(SESSION_STORAGE_KEYS.LANDING_PENDING_TRANSITION, transition);
  dispatchStoreChangeEvent(LANDING_TRANSITION_STORE_EVENT, {
    key: SESSION_STORAGE_KEYS.LANDING_PENDING_TRANSITION,
    transitionId: transition.transitionId
  });
}

export function readPendingLandingTransition(): PendingLandingTransition | null {
  return readJson<PendingLandingTransition>(SESSION_STORAGE_KEYS.LANDING_PENDING_TRANSITION);
}

export function clearPendingLandingTransition(): void {
  removeSession(SESSION_STORAGE_KEYS.LANDING_PENDING_TRANSITION);
  dispatchStoreChangeEvent(LANDING_TRANSITION_STORE_EVENT, {
    key: SESSION_STORAGE_KEYS.LANDING_PENDING_TRANSITION,
    transitionId: null
  });
}

export function writeLandingIngress(record: LandingIngressRecord): void {
  const key = variantSessionKeys.landingIngress(record.variant);
  writeJson(key, record);
  dispatchStoreChangeEvent(LANDING_TRANSITION_STORE_EVENT, {
    key,
    variant: record.variant
  });
}

export function readLandingIngress(variant: string): LandingIngressRecord | null {
  return readJson<LandingIngressRecord>(variantSessionKeys.landingIngress(variant));
}

export function consumeLandingIngress(variant: string): LandingIngressRecord | null {
  const key = variantSessionKeys.landingIngress(variant);
  const value = readJson<LandingIngressRecord>(key);
  removeSession(key);
  return value;
}

export function clearLandingIngress(variant: string): void {
  const key = variantSessionKeys.landingIngress(variant);
  removeSession(key);
  dispatchStoreChangeEvent(LANDING_TRANSITION_STORE_EVENT, {
    key,
    variant
  });
}

export function saveLandingReturnScrollY(scrollY: number, sourceVariant?: string): void {
  writeSession(SESSION_STORAGE_KEYS.LANDING_RETURN_SCROLL_Y, String(Math.max(0, Math.trunc(scrollY))));
  if (sourceVariant) {
    writeSession(SESSION_STORAGE_KEYS.LANDING_RETURN_VARIANT, sourceVariant);
  } else {
    removeSession(SESSION_STORAGE_KEYS.LANDING_RETURN_VARIANT);
  }

  dispatchStoreChangeEvent(LANDING_TRANSITION_STORE_EVENT, {
    key: SESSION_STORAGE_KEYS.LANDING_RETURN_SCROLL_Y,
    sourceVariant: sourceVariant ?? null
  });
}

export function readLandingReturnScrollY(): number | null {
  const raw = readSession(SESSION_STORAGE_KEYS.LANDING_RETURN_SCROLL_Y);
  if (!raw) {
    return null;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function consumeLandingReturnScrollY(): number | null {
  const value = readLandingReturnScrollY();
  removeSession(SESSION_STORAGE_KEYS.LANDING_RETURN_SCROLL_Y);
  return value;
}

export function readLandingReturnVariant(): string | null {
  const value = readSession(SESSION_STORAGE_KEYS.LANDING_RETURN_VARIANT);
  return value && value.trim().length > 0 ? value : null;
}

export function consumeLandingReturnVariant(): string | null {
  const value = readLandingReturnVariant();
  removeSession(SESSION_STORAGE_KEYS.LANDING_RETURN_VARIANT);
  return value;
}

export function clearLandingReturnScroll(): void {
  removeSession(SESSION_STORAGE_KEYS.LANDING_RETURN_SCROLL_Y);
  removeSession(SESSION_STORAGE_KEYS.LANDING_RETURN_VARIANT);
  dispatchStoreChangeEvent(LANDING_TRANSITION_STORE_EVENT, {
    keys: [
      SESSION_STORAGE_KEYS.LANDING_RETURN_SCROLL_Y,
      SESSION_STORAGE_KEYS.LANDING_RETURN_VARIANT
    ],
    sourceVariant: null
  });
}

export function rollbackLandingTransition(input: {
  variant?: string;
}): void {
  removeSession(SESSION_STORAGE_KEYS.LANDING_PENDING_TRANSITION);
  removeSession(SESSION_STORAGE_KEYS.LANDING_RETURN_SCROLL_Y);
  removeSession(SESSION_STORAGE_KEYS.LANDING_RETURN_VARIANT);
  if (input.variant) {
    removeSession(variantSessionKeys.landingIngress(input.variant));
  }
  dispatchStoreChangeEvent(LANDING_TRANSITION_STORE_EVENT, {
    key: SESSION_STORAGE_KEYS.LANDING_PENDING_TRANSITION,
    transitionId: null
  });
  dispatchStoreChangeEvent(LANDING_TRANSITION_CLEANUP_EVENT, {
    variant: input.variant ?? null
  });
}
