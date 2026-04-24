import {describe, expect, it} from 'vitest';

import {patchTelemetryEventForTransport, validateTelemetryEvent} from '../../src/features/landing/telemetry/validation';

describe('landing telemetry validation', () => {
  it('assertion:B18-final-submit-validation accepts final_submit payloads keyed by canonical question indexes', () => {
    expect(() =>
      validateTelemetryEvent({
        event_type: 'final_submit',
        event_id: 'event-1',
        session_id: 'session-1',
        ts_ms: 1,
        locale: 'en',
        route: '/en/test/qmbti',
        consent_state: 'OPTED_IN',
        variant: 'qmbti',
        question_index_1based: 4,
        dwell_ms_accumulated: 1234,
        landing_ingress_flag: true,
        final_responses: {
          '1': 'A',
          '12': 'B'
        }
      })
    ).not.toThrow();
  });

  it.each(['0', '01', 'foo', ''])(
    'rejects final_submit response key "%s" because it is not a canonical positive index string',
    (responseKey) => {
      expect(() =>
        validateTelemetryEvent({
          event_type: 'final_submit',
          event_id: 'event-1',
          session_id: 'session-1',
          ts_ms: 1,
          locale: 'en',
          route: '/en/test/qmbti',
          consent_state: 'OPTED_IN',
          variant: 'qmbti',
          question_index_1based: 4,
          dwell_ms_accumulated: 1234,
          landing_ingress_flag: true,
          final_responses: {
            [responseKey]: 'A'
          }
        })
      ).toThrow(/canonical question index/u);
    }
  );

  it('rejects final_submit response maps keyed by UI question ids', () => {
    expect(() =>
      validateTelemetryEvent({
        event_type: 'final_submit',
        event_id: 'event-1',
        session_id: 'session-1',
        ts_ms: 1,
        locale: 'en',
        route: '/en/test/qmbti',
        consent_state: 'OPTED_IN',
        variant: 'qmbti',
        question_index_1based: 4,
        dwell_ms_accumulated: 1234,
        landing_ingress_flag: true,
        final_responses: {
          q1: 'A'
        }
      })
    ).toThrow(/canonical question index/u);
  });

  it('accepts card_answered payloads for landing ingress only', () => {
    expect(() =>
      validateTelemetryEvent({
        event_type: 'card_answered',
        event_id: 'event-1',
        session_id: 'session-1',
        ts_ms: 1,
        locale: 'en',
        route: '/en',
        consent_state: 'OPTED_IN',
        source_variant: 'qmbti',
        target_route: '/en/test/qmbti',
        landing_ingress_flag: true
      })
    ).not.toThrow();
  });

  it('rejects forbidden raw-text field names', () => {
    expect(() =>
      validateTelemetryEvent({
        event_type: 'final_submit',
        event_id: 'event-1',
        session_id: 'session-1',
        ts_ms: 1,
        locale: 'en',
        route: '/en/test/qmbti',
        consent_state: 'OPTED_IN',
        variant: 'qmbti',
        question_index_1based: 4,
        dwell_ms_accumulated: 1234,
        landing_ingress_flag: true,
        final_responses: {
          '1': 'A'
        },
        question_text: 'Forbidden'
      } as never)
    ).toThrow(/Forbidden telemetry field/u);
  });

  it('rejects legacy transition-only fields from public telemetry payloads', () => {
    expect(() =>
      validateTelemetryEvent({
        event_type: 'final_submit',
        event_id: 'event-1',
        session_id: 'session-1',
        ts_ms: 1,
        locale: 'en',
        route: '/en/test/qmbti',
        consent_state: 'OPTED_IN',
        variant: 'qmbti',
        question_index_1based: 4,
        dwell_ms_accumulated: 1234,
        landing_ingress_flag: true,
        final_responses: {
          '1': 'A'
        },
        transition_id: 'transition-1'
      } as never)
    ).toThrow(/Legacy telemetry field/u);
  });

  it('assertion:B18-post-attempt-session-id-validation rejects post-attempt transport payloads when session_id is null', () => {
    for (const eventType of ['attempt_start', 'final_submit'] as const) {
      const event = {
        event_type: eventType,
        event_id: 'event-1',
        session_id: 'session-1',
        ts_ms: 1,
        locale: 'en',
        route: '/en/test/qmbti',
        consent_state: 'OPTED_IN',
        variant: 'qmbti',
        question_index_1based: 4,
        dwell_ms_accumulated: 1234,
        landing_ingress_flag: true,
        ...(eventType === 'final_submit'
          ? {
              final_responses: {
                '1': 'A'
              }
            }
          : {})
      };

      expect(() => patchTelemetryEventForTransport(event as never, null, 'OPTED_IN')).toThrow(/session_id/u);
    }
  });
});
