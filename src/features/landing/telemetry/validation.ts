import type {TelemetryConsentState, TelemetryEvent, TelemetryEventType} from '@/features/landing/telemetry/types';

const FORBIDDEN_FIELD_PATTERN =
  /^(question_text|answer_text|free_input|free_text|email|ip|fingerprint)$/iu;
const LEGACY_FORBIDDEN_FIELD_PATTERN = /^(transition_id|result_reason|final_q1_response)$/u;
const CANONICAL_INDEX_KEY = /^[1-9]\d*$/u;
const TELEMETRY_EVENT_TYPES: ReadonlyArray<TelemetryEventType> = [
  'landing_view',
  'card_answered',
  'attempt_start',
  'final_submit'
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertCommonFields(event: TelemetryEvent): void {
  if (!event.event_id.trim()) {
    throw new Error('Telemetry event_id is required.');
  }

  if (!Number.isFinite(event.ts_ms) || event.ts_ms <= 0) {
    throw new Error('Telemetry ts_ms must be a positive finite number.');
  }

  if (!event.route.startsWith('/')) {
    throw new Error('Telemetry route must be a localized pathname.');
  }
}

function assertStringField(value: unknown, fieldName: string): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error(`Telemetry ${fieldName} must be a string.`);
  }
}

function assertSessionIdField(value: unknown): asserts value is string | null {
  if (value !== null && typeof value !== 'string') {
    throw new Error('Telemetry session_id must be null or a string.');
  }

  if (typeof value === 'string' && !value.trim()) {
    throw new Error('Telemetry session_id must be null or a non-empty string.');
  }
}

function assertNumberField(value: unknown, fieldName: string): asserts value is number {
  if (typeof value !== 'number') {
    throw new Error(`Telemetry ${fieldName} must be a number.`);
  }
}

function assertConsentState(value: unknown): asserts value is TelemetryConsentState {
  if (value !== 'UNKNOWN' && value !== 'OPTED_IN' && value !== 'OPTED_OUT') {
    throw new Error(`Unsupported telemetry consent state: ${value}`);
  }
}

function isTelemetryEventType(value: unknown): value is TelemetryEventType {
  return typeof value === 'string' && TELEMETRY_EVENT_TYPES.includes(value as TelemetryEventType);
}

function assertTelemetryEventPayloadShape(value: unknown): asserts value is TelemetryEvent {
  if (!isPlainObject(value)) {
    throw new Error('Telemetry payload must be an object.');
  }

  if (!Object.hasOwn(value, 'event_type')) {
    throw new Error('Telemetry event_type is required.');
  }

  if (!isTelemetryEventType(value.event_type)) {
    throw new Error(`Unsupported telemetry event_type: ${String(value.event_type)}`);
  }

  assertStringField(value.event_id, 'event_id');
  assertSessionIdField(value.session_id);
  assertNumberField(value.ts_ms, 'ts_ms');
  assertStringField(value.locale, 'locale');
  assertStringField(value.route, 'route');
  assertConsentState(value.consent_state);
}

function assertNoForbiddenFields(value: unknown): void {
  if (Array.isArray(value)) {
    for (const entry of value) {
      assertNoForbiddenFields(entry);
    }
    return;
  }

  if (!isPlainObject(value)) {
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (FORBIDDEN_FIELD_PATTERN.test(key)) {
      throw new Error(`Forbidden telemetry field detected: ${key}`);
    }
    if (LEGACY_FORBIDDEN_FIELD_PATTERN.test(key)) {
      throw new Error(`Legacy telemetry field detected: ${key}`);
    }
    assertNoForbiddenFields(nestedValue);
  }
}

function assertPostAttemptSessionId(event: TelemetryEvent): void {
  if ((event.event_type === 'attempt_start' || event.event_type === 'final_submit') && event.session_id === null) {
    throw new Error('attempt_start and later telemetry events require session_id.');
  }
}

export function validateTelemetryEventPayload(payload: unknown): TelemetryEvent {
  assertTelemetryEventPayloadShape(payload);

  const event = payload;
  assertCommonFields(event);
  assertConsentState(event.consent_state);
  assertNoForbiddenFields(event);

  switch (event.event_type) {
    case 'card_answered':
      if (
        !event.source_variant.trim() ||
        !event.target_route.trim() ||
        !event.target_route.startsWith('/') ||
        event.landing_ingress_flag !== true
      ) {
        throw new Error('card_answered requires source_variant, target_route, and landing_ingress_flag=true.');
      }
      break;
    case 'attempt_start':
      if (
        !event.variant.trim() ||
        !Number.isFinite(event.question_index_1based) ||
        event.question_index_1based < 1 ||
        !Number.isFinite(event.dwell_ms_accumulated) ||
        event.dwell_ms_accumulated < 0 ||
        typeof event.landing_ingress_flag !== 'boolean'
      ) {
        throw new Error('attempt_start requires variant, 1-based question index, dwell, and landing_ingress_flag.');
      }
      break;
    case 'final_submit':
      if (
        !event.variant.trim() ||
        !Number.isFinite(event.question_index_1based) ||
        event.question_index_1based < 1 ||
        !Number.isFinite(event.dwell_ms_accumulated) ||
        event.dwell_ms_accumulated < 0 ||
        typeof event.landing_ingress_flag !== 'boolean'
      ) {
        throw new Error('final_submit requires variant, 1-based question index, dwell, and landing_ingress_flag.');
      }

      if (!isPlainObject(event.final_responses) || Object.keys(event.final_responses).length === 0) {
        throw new Error('final_submit requires final_responses.');
      }

      for (const responseKey of Object.keys(event.final_responses)) {
        if (!CANONICAL_INDEX_KEY.test(responseKey)) {
          throw new Error('final_submit response keys must be canonical question index strings.');
        }
      }

      for (const response of Object.values(event.final_responses)) {
        if (response !== 'A' && response !== 'B') {
          throw new Error('final_submit responses must use semantic A/B codes only.');
        }
      }
      break;
    default:
      break;
  }

  return event;
}

export function validateTelemetryEvent(event: TelemetryEvent): TelemetryEvent {
  return validateTelemetryEventPayload(event);
}

export function validateTelemetryTransportEvent(payload: unknown): TelemetryEvent {
  const event = validateTelemetryEventPayload(payload);
  assertPostAttemptSessionId(event);
  return event;
}

export function patchTelemetryEventForTransport(
  event: TelemetryEvent,
  sessionId: string | null,
  consentState: TelemetryConsentState
): TelemetryEvent {
  const patchedEvent: TelemetryEvent = {
    ...event,
    session_id: sessionId,
    consent_state: consentState
  };

  return validateTelemetryTransportEvent(patchedEvent);
}
