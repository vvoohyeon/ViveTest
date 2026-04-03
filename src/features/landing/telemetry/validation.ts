import type {TelemetryConsentState, TelemetryEvent} from '@/features/landing/telemetry/types';

const FORBIDDEN_FIELD_PATTERN =
  /^(question_text|answer_text|free_input|free_text|email|ip|fingerprint)$/iu;
const LEGACY_FORBIDDEN_FIELD_PATTERN = /^(transition_id|result_reason|final_q1_response)$/u;

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

function assertConsentState(value: TelemetryConsentState): void {
  if (value !== 'UNKNOWN' && value !== 'OPTED_IN' && value !== 'OPTED_OUT') {
    throw new Error(`Unsupported telemetry consent state: ${value}`);
  }
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

export function validateTelemetryEvent(event: TelemetryEvent): TelemetryEvent {
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

  return validateTelemetryEvent(patchedEvent);
}
