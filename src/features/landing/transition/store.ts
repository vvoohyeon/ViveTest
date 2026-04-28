import {SESSION_STORAGE_KEYS, variantSessionKeys} from '@/features/landing/storage/storage-keys';

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

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function readJson<T>(key: string): T | null {
  const storage = getSessionStorage();
  if (!storage) {
    return null;
  }

  const raw = storage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    storage.removeItem(key);
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  const storage = getSessionStorage();
  if (!storage) {
    return;
  }

  storage.setItem(key, JSON.stringify(value));
}

function dispatchTransitionEvent(name: string, detail: Record<string, unknown>): void {
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
  dispatchTransitionEvent(LANDING_TRANSITION_STORE_EVENT, {
    key: SESSION_STORAGE_KEYS.LANDING_PENDING_TRANSITION,
    transitionId: transition.transitionId
  });
}

export function readPendingLandingTransition(): PendingLandingTransition | null {
  return readJson<PendingLandingTransition>(SESSION_STORAGE_KEYS.LANDING_PENDING_TRANSITION);
}

export function clearPendingLandingTransition(): void {
  const storage = getSessionStorage();
  storage?.removeItem(SESSION_STORAGE_KEYS.LANDING_PENDING_TRANSITION);
  dispatchTransitionEvent(LANDING_TRANSITION_STORE_EVENT, {
    key: SESSION_STORAGE_KEYS.LANDING_PENDING_TRANSITION,
    transitionId: null
  });
}

export function writeLandingIngress(record: LandingIngressRecord): void {
  const key = variantSessionKeys.landingIngress(record.variant);
  writeJson(key, record);
  dispatchTransitionEvent(LANDING_TRANSITION_STORE_EVENT, {
    key,
    variant: record.variant
  });
}

export function readLandingIngress(variant: string): LandingIngressRecord | null {
  return readJson<LandingIngressRecord>(variantSessionKeys.landingIngress(variant));
}

export function consumeLandingIngress(variant: string): LandingIngressRecord | null {
  const storage = getSessionStorage();
  if (!storage) {
    return null;
  }

  const key = variantSessionKeys.landingIngress(variant);
  const value = readJson<LandingIngressRecord>(key);
  storage.removeItem(key);
  return value;
}

export function clearLandingIngress(variant: string): void {
  const storage = getSessionStorage();
  const key = variantSessionKeys.landingIngress(variant);
  storage?.removeItem(key);
  dispatchTransitionEvent(LANDING_TRANSITION_STORE_EVENT, {
    key,
    variant
  });
}

export function markInstructionSeen(variant: string): void {
  const storage = getSessionStorage();
  storage?.setItem(variantSessionKeys.instructionSeen(variant), 'true');
}

export function hasSeenInstruction(variant: string): boolean {
  const storage = getSessionStorage();
  return storage?.getItem(variantSessionKeys.instructionSeen(variant)) === 'true';
}

export function saveLandingReturnScrollY(scrollY: number, sourceVariant?: string): void {
  const storage = getSessionStorage();
  if (!storage) {
    return;
  }

  storage.setItem(SESSION_STORAGE_KEYS.LANDING_RETURN_SCROLL_Y, String(Math.max(0, Math.trunc(scrollY))));
  if (sourceVariant) {
    storage.setItem(SESSION_STORAGE_KEYS.LANDING_RETURN_VARIANT, sourceVariant);
  } else {
    storage.removeItem(SESSION_STORAGE_KEYS.LANDING_RETURN_VARIANT);
  }

  dispatchTransitionEvent(LANDING_TRANSITION_STORE_EVENT, {
    key: SESSION_STORAGE_KEYS.LANDING_RETURN_SCROLL_Y,
    sourceVariant: sourceVariant ?? null
  });
}

export function readLandingReturnScrollY(): number | null {
  const storage = getSessionStorage();
  if (!storage) {
    return null;
  }

  const raw = storage.getItem(SESSION_STORAGE_KEYS.LANDING_RETURN_SCROLL_Y);
  if (!raw) {
    return null;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function consumeLandingReturnScrollY(): number | null {
  const value = readLandingReturnScrollY();
  clearLandingReturnScroll();
  return value;
}

export function readLandingReturnVariant(): string | null {
  const storage = getSessionStorage();
  if (!storage) {
    return null;
  }

  const value = storage.getItem(SESSION_STORAGE_KEYS.LANDING_RETURN_VARIANT);
  return value && value.trim().length > 0 ? value : null;
}

export function consumeLandingReturnVariant(): string | null {
  const value = readLandingReturnVariant();
  clearLandingReturnScroll();
  return value;
}

export function clearLandingReturnScroll(): void {
  const storage = getSessionStorage();
  if (!storage) {
    return;
  }

  storage.removeItem(SESSION_STORAGE_KEYS.LANDING_RETURN_SCROLL_Y);
  storage.removeItem(SESSION_STORAGE_KEYS.LANDING_RETURN_VARIANT);
  dispatchTransitionEvent(LANDING_TRANSITION_STORE_EVENT, {
    key: SESSION_STORAGE_KEYS.LANDING_RETURN_SCROLL_Y,
    sourceVariant: null
  });
}

export function rollbackLandingTransition(input: {
  variant?: string;
}): void {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  }

  clearPendingLandingTransition();
  clearLandingReturnScroll();
  if (input.variant) {
    clearLandingIngress(input.variant);
  }
  dispatchTransitionEvent(LANDING_TRANSITION_CLEANUP_EVENT, {
    variant: input.variant ?? null
  });
}
