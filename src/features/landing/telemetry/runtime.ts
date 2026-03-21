'use client';

import type {AppLocale} from '@/config/site';
import {
  createCorrelationId,
  createOpaqueId,
  resetCorrelationIdCounterForTests
} from '@/features/landing/lib/correlation-id';
import {
  ensureTelemetryConsentSourceSync,
  getTelemetryConsentSnapshot,
  resetTelemetryConsentSourceForTests,
  setTelemetryConsentState as setTelemetryConsentStateInSource,
  subscribeToTelemetryConsent,
  TELEMETRY_CONSENT_STORAGE_KEY,
  type TelemetryConsentSnapshot,
  useTelemetryConsentSource
} from '@/features/landing/telemetry/consent-source';
import type {
  AttemptStartTelemetryEvent,
  CardAnsweredTelemetryEvent,
  FinalSubmitTelemetryEvent,
  TelemetryBaseEvent,
  TelemetryConsentState,
  TelemetryEvent
} from '@/features/landing/telemetry/types';
import {patchTelemetryEventForTransport, validateTelemetryEvent} from '@/features/landing/telemetry/validation';

const TELEMETRY_ENDPOINT = '/api/telemetry';
const TELEMETRY_SESSION_ID_STORAGE_KEY = 'vivetest-telemetry-session-id';

interface TelemetrySnapshot {
  consentState: TelemetryConsentState;
  sessionId: string | null;
  synced: boolean;
}

interface TelemetryRuntimeState {
  sessionId: string | null;
  queue: TelemetryEvent[];
  sentLandingViews: Set<string>;
}

const runtimeState: TelemetryRuntimeState = {
  sessionId: null,
  queue: [],
  sentLandingViews: new Set()
};

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

function resolveSessionId(): string | null {
  const storage = getLocalStorage();
  const stored = storage?.getItem(TELEMETRY_SESSION_ID_STORAGE_KEY)?.trim() ?? '';
  if (stored) {
    return stored;
  }

  const nextSessionId = createOpaqueId();
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
  const consentSnapshot = getTelemetryConsentSnapshot();
  return consentSnapshot.synced && consentSnapshot.consentState === 'OPTED_IN' && runtimeState.sessionId !== null;
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
  const consentSnapshot = getTelemetryConsentSnapshot();

  if (!canSendToNetwork()) {
    if (consentSnapshot.consentState === 'OPTED_OUT') {
      runtimeState.queue = [];
    }
    return;
  }

  const queued = [...runtimeState.queue];
  runtimeState.queue = [];

  for (const queuedEvent of queued) {
    sendTelemetryEvent(
      patchTelemetryEventForTransport(queuedEvent, runtimeState.sessionId, consentSnapshot.consentState)
    );
  }
}

function enqueueOrSend(event: TelemetryEvent): TelemetryEvent {
  const validatedEvent = validateTelemetryEvent(event);
  const consentSnapshot = getTelemetryConsentSnapshot();

  if (!canSendToNetwork()) {
    if (consentSnapshot.consentState !== 'OPTED_OUT') {
      runtimeState.queue.push(validatedEvent);
    }
    return validatedEvent;
  }

  sendTelemetryEvent(
    patchTelemetryEventForTransport(validatedEvent, runtimeState.sessionId, consentSnapshot.consentState)
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
  const consentSnapshot = getTelemetryConsentSnapshot();

  return {
    event_type: input.eventType,
    event_id: createCorrelationId(input.eventType),
    session_id: runtimeState.sessionId,
    ts_ms: Date.now(),
    locale: input.locale,
    route: input.route,
    consent_state: consentSnapshot.consentState
  };
}

function applyConsentSnapshotToRuntime(consentSnapshot: TelemetryConsentSnapshot): void {
  if (!consentSnapshot.synced) {
    runtimeState.sessionId = null;
    return;
  }

  if (consentSnapshot.consentState === 'OPTED_IN') {
    runtimeState.sessionId = resolveSessionId();
    flushQueue();
    return;
  }

  clearSessionId();
  if (consentSnapshot.consentState === 'OPTED_OUT') {
    runtimeState.queue = [];
  }
}

// telemetry queue/session 정책은 runtime이 책임지고, consent 값 자체는 외부 source에서만 읽는다.
subscribeToTelemetryConsent(() => {
  applyConsentSnapshotToRuntime(getTelemetryConsentSnapshot());
});

export {TELEMETRY_CONSENT_STORAGE_KEY};

export function setTelemetryConsentState(nextState: Exclude<TelemetryConsentState, 'UNKNOWN'>): TelemetrySnapshot {
  setTelemetryConsentStateInSource(nextState);
  return getTelemetrySnapshot();
}

export function getTelemetrySnapshot(): TelemetrySnapshot {
  const consentSnapshot = getTelemetryConsentSnapshot();

  return {
    consentState: consentSnapshot.consentState,
    sessionId: runtimeState.sessionId,
    synced: consentSnapshot.synced
  };
}

export function getTelemetryRuntimeQueueLengthForTests(): number {
  return runtimeState.queue.length;
}

export function resetTelemetryRuntimeForTests(): void {
  runtimeState.sessionId = null;
  runtimeState.queue = [];
  runtimeState.sentLandingViews.clear();
  resetCorrelationIdCounterForTests();

  resetTelemetryConsentSourceForTests();

  try {
    getLocalStorage()?.removeItem(TELEMETRY_SESSION_ID_STORAGE_KEY);
  } catch {
    // Ignore storage cleanup failures in test reset helpers.
  }
}

export function syncTelemetryConsent(): TelemetrySnapshot {
  ensureTelemetryConsentSourceSync();
  return getTelemetrySnapshot();
}

export function useTelemetryBootstrap(): TelemetrySnapshot {
  useTelemetryConsentSource();
  return getTelemetrySnapshot();
}

export function trackLandingView(input: {locale: AppLocale; route: string}): TelemetryEvent | null {
  const dedupeKey = `${input.locale}:${input.route}`;
  if (runtimeState.sentLandingViews.has(dedupeKey)) {
    return null;
  }

  runtimeState.sentLandingViews.add(dedupeKey);
  return enqueueOrSend(createBaseEvent({...input, eventType: 'landing_view'}));
}

export function trackCardAnswered(input: {
  locale: AppLocale;
  route: string;
  sourceCardId: string;
  targetRoute: string;
}): CardAnsweredTelemetryEvent {
  return enqueueOrSend({
    ...createBaseEvent({...input, eventType: 'card_answered'}),
    source_card_id: input.sourceCardId,
    target_route: input.targetRoute,
    landing_ingress_flag: true
  } satisfies CardAnsweredTelemetryEvent) as CardAnsweredTelemetryEvent;
}

export function trackAttemptStart(input: {
  locale: AppLocale;
  route: string;
  variant: string;
  questionIndex: number;
  dwellMsAccumulated: number;
  landingIngressFlag: boolean;
}): AttemptStartTelemetryEvent {
  return enqueueOrSend({
    ...createBaseEvent({...input, eventType: 'attempt_start'}),
    variant: input.variant,
    question_index_1based: input.questionIndex,
    dwell_ms_accumulated: input.dwellMsAccumulated,
    landing_ingress_flag: input.landingIngressFlag
  } satisfies AttemptStartTelemetryEvent) as AttemptStartTelemetryEvent;
}

export function trackFinalSubmit(input: {
  locale: AppLocale;
  route: string;
  variant: string;
  questionIndex: number;
  dwellMsAccumulated: number;
  landingIngressFlag: boolean;
  finalResponses: Record<string, 'A' | 'B'>;
}): FinalSubmitTelemetryEvent {
  return enqueueOrSend({
    ...createBaseEvent({...input, eventType: 'final_submit'}),
    variant: input.variant,
    question_index_1based: input.questionIndex,
    dwell_ms_accumulated: input.dwellMsAccumulated,
    landing_ingress_flag: input.landingIngressFlag,
    final_responses: input.finalResponses
  } satisfies FinalSubmitTelemetryEvent) as FinalSubmitTelemetryEvent;
}
