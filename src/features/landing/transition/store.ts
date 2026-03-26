export type LandingTransitionResultReason =
  | 'USER_CANCEL'
  | 'DUPLICATE_LOCALE'
  | 'DESTINATION_TIMEOUT'
  | 'DESTINATION_LOAD_ERROR'
  | 'BLOG_FALLBACK_EMPTY'
  | 'UNKNOWN';

export interface PendingLandingTransition {
  transitionId: string;
  sourceCardId: string;
  targetRoute: string;
  targetType: 'test' | 'blog';
  startedAtMs: number;
  variant?: string;
  blogArticleId?: string;
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

const PENDING_TRANSITION_KEY = 'vivetest-landing-pending-transition';
const RETURN_SCROLL_Y_KEY = 'vivetest-landing-return-scroll-y';
const RETURN_SCROLL_CARD_ID_KEY = 'vivetest-landing-return-card-id';
const LANDING_INGRESS_PREFIX = 'vivetest-landing-ingress:';

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
  writeJson(PENDING_TRANSITION_KEY, transition);
  dispatchTransitionEvent(LANDING_TRANSITION_STORE_EVENT, {
    key: PENDING_TRANSITION_KEY,
    transitionId: transition.transitionId
  });
}

export function readPendingLandingTransition(): PendingLandingTransition | null {
  return readJson<PendingLandingTransition>(PENDING_TRANSITION_KEY);
}

export function clearPendingLandingTransition(): void {
  const storage = getSessionStorage();
  storage?.removeItem(PENDING_TRANSITION_KEY);
  dispatchTransitionEvent(LANDING_TRANSITION_STORE_EVENT, {
    key: PENDING_TRANSITION_KEY,
    transitionId: null
  });
}

export function writeLandingIngress(record: LandingIngressRecord): void {
  writeJson(`${LANDING_INGRESS_PREFIX}${record.variant}`, record);
  dispatchTransitionEvent(LANDING_TRANSITION_STORE_EVENT, {
    key: `${LANDING_INGRESS_PREFIX}${record.variant}`,
    variant: record.variant
  });
}

export function readLandingIngress(variant: string): LandingIngressRecord | null {
  return readJson<LandingIngressRecord>(`${LANDING_INGRESS_PREFIX}${variant}`);
}

export function consumeLandingIngress(variant: string): LandingIngressRecord | null {
  const storage = getSessionStorage();
  if (!storage) {
    return null;
  }

  const key = `${LANDING_INGRESS_PREFIX}${variant}`;
  const value = readJson<LandingIngressRecord>(key);
  storage.removeItem(key);
  return value;
}

export function clearLandingIngress(variant: string): void {
  const storage = getSessionStorage();
  storage?.removeItem(`${LANDING_INGRESS_PREFIX}${variant}`);
  dispatchTransitionEvent(LANDING_TRANSITION_STORE_EVENT, {
    key: `${LANDING_INGRESS_PREFIX}${variant}`,
    variant
  });
}

export function saveLandingReturnScrollY(scrollY: number, sourceCardId?: string): void {
  const storage = getSessionStorage();
  if (!storage) {
    return;
  }

  storage.setItem(RETURN_SCROLL_Y_KEY, String(Math.max(0, Math.trunc(scrollY))));
  if (sourceCardId) {
    storage.setItem(RETURN_SCROLL_CARD_ID_KEY, sourceCardId);
  } else {
    storage.removeItem(RETURN_SCROLL_CARD_ID_KEY);
  }

  dispatchTransitionEvent(LANDING_TRANSITION_STORE_EVENT, {
    key: RETURN_SCROLL_Y_KEY,
    sourceCardId: sourceCardId ?? null
  });
}

export function readLandingReturnScrollY(): number | null {
  const storage = getSessionStorage();
  if (!storage) {
    return null;
  }

  const raw = storage.getItem(RETURN_SCROLL_Y_KEY);
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

export function readLandingReturnCardId(): string | null {
  const storage = getSessionStorage();
  if (!storage) {
    return null;
  }

  const value = storage.getItem(RETURN_SCROLL_CARD_ID_KEY);
  return value && value.trim().length > 0 ? value : null;
}

export function consumeLandingReturnCardId(): string | null {
  const value = readLandingReturnCardId();
  clearLandingReturnScroll();
  return value;
}

export function clearLandingReturnScroll(): void {
  const storage = getSessionStorage();
  if (!storage) {
    return;
  }

  storage.removeItem(RETURN_SCROLL_Y_KEY);
  storage.removeItem(RETURN_SCROLL_CARD_ID_KEY);
  dispatchTransitionEvent(LANDING_TRANSITION_STORE_EVENT, {
    key: RETURN_SCROLL_Y_KEY,
    sourceCardId: null
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
