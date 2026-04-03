import {describe, expect, it} from 'vitest';

import {validateTelemetryEvent} from '../../src/features/landing/telemetry/validation';

describe('landing telemetry validation', () => {
  it('assertion:B18-final-submit-validation accepts final_submit payloads that use semantic response codes only', () => {
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
          q1: 'A',
          q2: 'B'
        }
      })
    ).not.toThrow();
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
          q1: 'A'
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
          q1: 'A'
        },
        transition_id: 'transition-1'
      } as never)
    ).toThrow(/Legacy telemetry field/u);
  });
});
