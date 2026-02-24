'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';

type ConsentState = 'UNKNOWN' | 'OPTED_IN' | 'OPTED_OUT';

export type TelemetryEventName =
  | 'landing_view'
  | 'transition_start'
  | 'transition_complete'
  | 'transition_fail'
  | 'transition_cancel'
  | 'test_attempt_start'
  | 'test_final_submit';

export type TelemetryEventPayload = Record<string, string | number | boolean | null | undefined>;

export type TelemetryEnvelope = {
  eventId: string;
  eventName: TelemetryEventName;
  emittedAt: string;
  anonymousId: string | null;
  payload: TelemetryEventPayload;
};

type TelemetryContextValue = {
  consent: ConsentState;
  emit: (eventName: TelemetryEventName, payload?: TelemetryEventPayload) => void;
};

const CONSENT_KEY = 'vt:consent';
const ANON_ID_KEY = 'vt:anonymous-id';
const WINDOW_EVENT_KEY = '__VT_EVENTS__';

const TelemetryContext = createContext<TelemetryContextValue | undefined>(undefined);

function safeRandomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((value) => value.toString(16).padStart(2, '0'))
      .join('');
  }

  return `${Date.now()}-${Math.floor(Math.random() * 100_000)}-${Math.floor(Math.random() * 10_000)}`;
}

function getOrCreateAnonymousId(): string | null {
  try {
    const existing = window.localStorage.getItem(ANON_ID_KEY);
    if (existing) {
      return existing;
    }

    const next = safeRandomId();
    window.localStorage.setItem(ANON_ID_KEY, next);
    return next;
  } catch {
    return null;
  }
}

function writeWindowEvent(envelope: TelemetryEnvelope): void {
  const bucket = (window as Window & {[WINDOW_EVENT_KEY]?: TelemetryEnvelope[]})[WINDOW_EVENT_KEY] ?? [];
  bucket.push(envelope);
  (window as Window & {[WINDOW_EVENT_KEY]?: TelemetryEnvelope[]})[WINDOW_EVENT_KEY] = bucket;
}

export function TelemetryProvider({children}: {children: ReactNode}) {
  const [consent, setConsent] = useState<ConsentState>('UNKNOWN');
  const queueRef = useRef<TelemetryEnvelope[]>([]);
  const anonIdRef = useRef<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(CONSENT_KEY);

    if (stored === 'OPTED_OUT') {
      setConsent('OPTED_OUT');
      window.localStorage.removeItem(ANON_ID_KEY);
      anonIdRef.current = null;
      return;
    }

    setConsent('OPTED_IN');
    anonIdRef.current = getOrCreateAnonymousId();
  }, []);

  useEffect(() => {
    if (consent === 'OPTED_IN') {
      while (queueRef.current.length > 0) {
        const event = queueRef.current.shift();
        if (event) {
          writeWindowEvent(event);
        }
      }
      return;
    }

    if (consent === 'OPTED_OUT') {
      queueRef.current = [];
    }
  }, [consent]);

  const emit = useCallback(
    (eventName: TelemetryEventName, payload: TelemetryEventPayload = {}) => {
      const envelope: TelemetryEnvelope = {
        eventId: safeRandomId(),
        eventName,
        emittedAt: new Date().toISOString(),
        anonymousId: anonIdRef.current,
        payload
      };

      if (consent === 'UNKNOWN') {
        queueRef.current.push(envelope);
        return;
      }

      if (consent === 'OPTED_OUT') {
        return;
      }

      writeWindowEvent(envelope);
    },
    [consent]
  );

  const value = useMemo(() => ({consent, emit}), [consent, emit]);

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
}

export function useTelemetry() {
  const value = useContext(TelemetryContext);

  if (!value) {
    throw new Error('useTelemetry must be used inside TelemetryProvider');
  }

  return value;
}
