'use client';

import {useEffect, useState} from 'react';

import type {AppLocale} from '@/config/site';
import type {
  AttemptStartTelemetryEvent,
  FinalSubmitTelemetryEvent,
  TelemetryBaseEvent,
  TelemetryConsentState,
  TelemetryEvent,
  TransitionStartTelemetryEvent,
  TransitionTerminalTelemetryEvent
} from '@/features/landing/telemetry/types';
import {patchTelemetryEventForTransport, validateTelemetryEvent} from '@/features/landing/telemetry/validation';
import type {LandingTransitionResultReason} from '@/features/landing/transition/store';

const TELEMETRY_ENDPOINT = '/api/telemetry';
const TELEMETRY_CONSENT_STORAGE_KEY = 'vibetest-telemetry-consent';
const TELEMETRY_SESSION_ID_STORAGE_KEY = 'vibetest-telemetry-session-id';

interface TelemetrySnapshot {
  consentState: TelemetryConsentState;
  sessionId: string | null;
  synced: boolean;
}

interface TelemetryRuntimeState extends TelemetrySnapshot {
  queue: TelemetryEvent[];
  sentLandingViews: Set<string>;
  sentTransitionStarts: Set<string>;
  sentTransitionTerminals: Set<string>;
}

const runtimeState: TelemetryRuntimeState = {
  consentState: 'UNKNOWN',
  sessionId: null,
  synced: false,
  queue: [],
  sentLandingViews: new Set(),
  sentTransitionStarts: new Set(),
  sentTransitionTerminals: new Set()
};

let fallbackCorrelationCounter = 0;

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

function resolveStoredConsent(): TelemetryConsentState {
  const storage = getLocalStorage();
  const raw = storage?.getItem(TELEMETRY_CONSENT_STORAGE_KEY)?.trim().toUpperCase() ?? '';

  if (raw === 'OPTED_IN') {
    return 'OPTED_IN';
  }

  return 'OPTED_OUT';
}

function resolveRandomUuid(): string | null {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  if (typeof globalThis.crypto?.getRandomValues !== 'function') {
    return null;
  }

  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function resolveSessionId(): string | null {
  const storage = getLocalStorage();
  const stored = storage?.getItem(TELEMETRY_SESSION_ID_STORAGE_KEY)?.trim() ?? '';
  if (stored) {
    return stored;
  }

  const nextSessionId = resolveRandomUuid();
  if (!nextSessionId) {
    return null;
  }

  try {
    storage?.setItem(TELEMETRY_SESSION_ID_STORAGE_KEY, nextSessionId);
  } catch {
    // Ignore storage failures and keep the in-memory value.
  }

  return nextSessionId;
}

function clearSessionId(): void {
  runtimeState.sessionId = null;
  try {
    getLocalStorage()?.removeItem(TELEMETRY_SESSION_ID_STORAGE_KEY);
  } catch {
    // Ignore storage failures during opt-out cleanup.
  }
}

function canSendToNetwork(): boolean {
  return runtimeState.synced && runtimeState.consentState === 'OPTED_IN' && runtimeState.sessionId !== null;
}

function sendTelemetryEvent(event: TelemetryEvent): void {
  void fetch(TELEMETRY_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(event)
  }).catch(() => {
    // Intentionally ignore transport errors in V1. Correlation and cleanup are handled client-side.
  });
}

function flushQueue(): void {
  if (!canSendToNetwork()) {
    if (runtimeState.consentState === 'OPTED_OUT') {
      runtimeState.queue = [];
    }
    return;
  }

  const queued = [...runtimeState.queue];
  runtimeState.queue = [];

  for (const queuedEvent of queued) {
    sendTelemetryEvent(
      patchTelemetryEventForTransport(queuedEvent, runtimeState.sessionId, runtimeState.consentState)
    );
  }
}

function enqueueOrSend(event: TelemetryEvent): TelemetryEvent {
  const validatedEvent = validateTelemetryEvent(event);

  if (!canSendToNetwork()) {
    if (runtimeState.consentState !== 'OPTED_OUT') {
      runtimeState.queue.push(validatedEvent);
    }
    return validatedEvent;
  }

  sendTelemetryEvent(
    patchTelemetryEventForTransport(validatedEvent, runtimeState.sessionId, runtimeState.consentState)
  );
  return validatedEvent;
}

function createBaseEvent<EventType extends TelemetryBaseEvent['event_type']>(input: {
  eventType: EventType;
  locale: AppLocale;
  route: string;
}): Pick<TelemetryBaseEvent, 'event_id' | 'ts_ms' | 'locale' | 'route' | 'consent_state' | 'session_id'> & {
  event_type: EventType;
} {
  return {
    event_type: input.eventType,
    event_id: createCorrelationId(input.eventType),
    session_id: runtimeState.sessionId,
    ts_ms: Date.now(),
    locale: input.locale,
    route: input.route,
    consent_state: runtimeState.consentState
  };
}

export function createCorrelationId(prefix: string): string {
  const randomId = resolveRandomUuid();
  if (randomId) {
    return `${prefix}-${randomId}`;
  }

  fallbackCorrelationCounter += 1;
  return `${prefix}-fallback-${fallbackCorrelationCounter}`;
}

export function getTelemetrySnapshot(): TelemetrySnapshot {
  return {
    consentState: runtimeState.consentState,
    sessionId: runtimeState.sessionId,
    synced: runtimeState.synced
  };
}

export function getTelemetryRuntimeQueueLengthForTests(): number {
  return runtimeState.queue.length;
}

export function resetTelemetryRuntimeForTests(): void {
  runtimeState.consentState = 'UNKNOWN';
  runtimeState.sessionId = null;
  runtimeState.synced = false;
  runtimeState.queue = [];
  runtimeState.sentLandingViews.clear();
  runtimeState.sentTransitionStarts.clear();
  runtimeState.sentTransitionTerminals.clear();
  fallbackCorrelationCounter = 0;

  try {
    getLocalStorage()?.removeItem(TELEMETRY_CONSENT_STORAGE_KEY);
    getLocalStorage()?.removeItem(TELEMETRY_SESSION_ID_STORAGE_KEY);
  } catch {
    // Ignore storage cleanup failures in test reset helpers.
  }
}

export function syncTelemetryConsent(): TelemetrySnapshot {
  const nextConsentState = resolveStoredConsent();
  runtimeState.consentState = nextConsentState;
  runtimeState.synced = true;

  if (nextConsentState === 'OPTED_IN') {
    runtimeState.sessionId = resolveSessionId();
    flushQueue();
    return getTelemetrySnapshot();
  }

  clearSessionId();
  runtimeState.queue = [];
  return getTelemetrySnapshot();
}

export function useTelemetryBootstrap(): TelemetrySnapshot {
  const [snapshot, setSnapshot] = useState<TelemetrySnapshot>(getTelemetrySnapshot);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      setSnapshot(syncTelemetryConsent());
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return snapshot;
}

export function trackLandingView(input: {locale: AppLocale; route: string}): TelemetryEvent | null {
  const dedupeKey = `${input.locale}:${input.route}`;
  if (runtimeState.sentLandingViews.has(dedupeKey)) {
    return null;
  }

  runtimeState.sentLandingViews.add(dedupeKey);
  return enqueueOrSend(createBaseEvent({...input, eventType: 'landing_view'}));
}

export function trackTransitionStart(input: {
  locale: AppLocale;
  route: string;
  transitionId: string;
  sourceCardId: string;
  targetRoute: string;
}): TransitionStartTelemetryEvent | null {
  if (runtimeState.sentTransitionStarts.has(input.transitionId)) {
    return null;
  }

  runtimeState.sentTransitionStarts.add(input.transitionId);

  return enqueueOrSend({
    ...createBaseEvent({...input, eventType: 'transition_start'}),
    transition_id: input.transitionId,
    source_card_id: input.sourceCardId,
    target_route: input.targetRoute
  } satisfies TransitionStartTelemetryEvent) as TransitionStartTelemetryEvent;
}

export function trackTransitionTerminal(input: {
  eventType: TransitionTerminalTelemetryEvent['event_type'];
  locale: AppLocale;
  route: string;
  transitionId: string;
  sourceCardId: string;
  targetRoute: string;
  resultReason?: LandingTransitionResultReason;
}): TransitionTerminalTelemetryEvent | null {
  if (runtimeState.sentTransitionTerminals.has(input.transitionId)) {
    return null;
  }

  runtimeState.sentTransitionTerminals.add(input.transitionId);

  return enqueueOrSend({
    ...createBaseEvent({...input, eventType: input.eventType}),
    transition_id: input.transitionId,
    source_card_id: input.sourceCardId,
    target_route: input.targetRoute,
    result_reason: input.resultReason
  } satisfies TransitionTerminalTelemetryEvent) as TransitionTerminalTelemetryEvent;
}

export function trackAttemptStart(input: {
  locale: AppLocale;
  route: string;
  transitionId: string;
  variant: string;
  questionIndex: number;
  dwellMsAccumulated: number;
  landingIngressFlag: boolean;
}): AttemptStartTelemetryEvent {
  return enqueueOrSend({
    ...createBaseEvent({...input, eventType: 'attempt_start'}),
    transition_id: input.transitionId,
    variant: input.variant,
    question_index_1based: input.questionIndex,
    dwell_ms_accumulated: input.dwellMsAccumulated,
    landing_ingress_flag: input.landingIngressFlag
  } satisfies AttemptStartTelemetryEvent) as AttemptStartTelemetryEvent;
}

export function trackFinalSubmit(input: {
  locale: AppLocale;
  route: string;
  transitionId: string;
  variant: string;
  questionIndex: number;
  dwellMsAccumulated: number;
  landingIngressFlag: boolean;
  finalResponses: Record<string, 'A' | 'B'>;
  finalQ1Response: 'A' | 'B';
}): FinalSubmitTelemetryEvent {
  return enqueueOrSend({
    ...createBaseEvent({...input, eventType: 'final_submit'}),
    transition_id: input.transitionId,
    variant: input.variant,
    question_index_1based: input.questionIndex,
    dwell_ms_accumulated: input.dwellMsAccumulated,
    landing_ingress_flag: input.landingIngressFlag,
    final_responses: input.finalResponses,
    final_q1_response: input.finalQ1Response
  } satisfies FinalSubmitTelemetryEvent) as FinalSubmitTelemetryEvent;
}
