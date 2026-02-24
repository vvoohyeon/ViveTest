import type {BinaryChoiceCode} from '@/features/test/data/test-fixture';
import type {TransitionTarget} from '@/features/landing/types';

const SESSION_ID_KEY = 'vt:session-id';
const PRE_ANSWERS_KEY = 'vt:pre-answers';
const LANDING_INGRESS_KEY = 'vt:landing-ingress';
const PENDING_TRANSITION_KEY = 'vt:pending-transition';
const INSTRUCTION_SEEN_KEY = 'vt:instruction-seen';

type StoredPreAnswer = {
  variant: string;
  answer: BinaryChoiceCode;
  transitionId: string;
  createdAt: number;
};

type JsonRecord = Record<string, unknown>;

function canUseStorage(): boolean {
  return typeof window !== 'undefined';
}

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function randomToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  return `${Date.now()}-${Math.floor(Math.random() * 10_000)}-${Math.floor(Math.random() * 10_000)}`;
}

export function getOrCreateSessionId(): string {
  if (!canUseStorage()) {
    return 'ssr-session';
  }

  const existing = sessionStorage.getItem(SESSION_ID_KEY);
  if (existing) {
    return existing;
  }

  const next = randomToken();
  sessionStorage.setItem(SESSION_ID_KEY, next);
  return next;
}

export function setLandingIngressFlag(variant: string): void {
  if (!canUseStorage()) {
    return;
  }

  const ingress = safeParse<Record<string, true>>(sessionStorage.getItem(LANDING_INGRESS_KEY), {});
  ingress[variant] = true;
  sessionStorage.setItem(LANDING_INGRESS_KEY, JSON.stringify(ingress));
}

export function hasLandingIngressFlag(variant: string): boolean {
  if (!canUseStorage()) {
    return false;
  }

  const ingress = safeParse<Record<string, true>>(sessionStorage.getItem(LANDING_INGRESS_KEY), {});
  return Boolean(ingress[variant]);
}

export function savePreAnswer(params: {
  variant: string;
  answer: BinaryChoiceCode;
  transitionId: string;
}): void {
  if (!canUseStorage()) {
    return;
  }

  const stored = safeParse<Record<string, StoredPreAnswer>>(sessionStorage.getItem(PRE_ANSWERS_KEY), {});

  stored[params.variant] = {
    variant: params.variant,
    answer: params.answer,
    transitionId: params.transitionId,
    createdAt: Date.now()
  };

  sessionStorage.setItem(PRE_ANSWERS_KEY, JSON.stringify(stored));
}

export function readPreAnswer(variant: string): StoredPreAnswer | undefined {
  if (!canUseStorage()) {
    return undefined;
  }

  const stored = safeParse<Record<string, StoredPreAnswer>>(sessionStorage.getItem(PRE_ANSWERS_KEY), {});
  return stored[variant];
}

export function consumePreAnswer(variant: string): StoredPreAnswer | undefined {
  if (!canUseStorage()) {
    return undefined;
  }

  const stored = safeParse<Record<string, StoredPreAnswer>>(sessionStorage.getItem(PRE_ANSWERS_KEY), {});
  const answer = stored[variant];

  if (!answer) {
    return undefined;
  }

  delete stored[variant];
  sessionStorage.setItem(PRE_ANSWERS_KEY, JSON.stringify(stored));
  return answer;
}

export function rollbackPreAnswer(variant: string, transitionId?: string): void {
  if (!canUseStorage()) {
    return;
  }

  const stored = safeParse<Record<string, StoredPreAnswer>>(sessionStorage.getItem(PRE_ANSWERS_KEY), {});
  const existing = stored[variant];

  if (!existing) {
    return;
  }

  if (transitionId && existing.transitionId !== transitionId) {
    return;
  }

  delete stored[variant];
  sessionStorage.setItem(PRE_ANSWERS_KEY, JSON.stringify(stored));
}

export function setPendingTransition(target: TransitionTarget): void {
  if (!canUseStorage()) {
    return;
  }

  sessionStorage.setItem(PENDING_TRANSITION_KEY, JSON.stringify(target));
}

export function getPendingTransition(): TransitionTarget | undefined {
  if (!canUseStorage()) {
    return undefined;
  }

  return safeParse<TransitionTarget | undefined>(sessionStorage.getItem(PENDING_TRANSITION_KEY), undefined);
}

export function clearPendingTransition(): void {
  if (!canUseStorage()) {
    return;
  }

  sessionStorage.removeItem(PENDING_TRANSITION_KEY);
}

export function consumePendingTransition(): TransitionTarget | undefined {
  const pending = getPendingTransition();
  if (!pending) {
    return undefined;
  }

  clearPendingTransition();
  return pending;
}

export function getInstructionSeen(variant: string): boolean {
  if (!canUseStorage()) {
    return false;
  }

  const seenMap = safeParse<Record<string, true>>(localStorage.getItem(INSTRUCTION_SEEN_KEY), {});
  return Boolean(seenMap[variant]);
}

export function setInstructionSeen(variant: string): void {
  if (!canUseStorage()) {
    return;
  }

  const seenMap = safeParse<Record<string, true>>(localStorage.getItem(INSTRUCTION_SEEN_KEY), {});
  seenMap[variant] = true;
  localStorage.setItem(INSTRUCTION_SEEN_KEY, JSON.stringify(seenMap));
}

export function hasAnyStorageAccess(): boolean {
  return canUseStorage();
}

export function readUnknownRecord(storage: Storage, key: string): JsonRecord {
  return safeParse<JsonRecord>(storage.getItem(key), {});
}
