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
        route: '/en/test/rhythm-a/question',
        consent_state: 'OPTED_IN',
        transition_id: 'transition-1',
        variant: 'rhythm-a',
        question_index_1based: 4,
        dwell_ms_accumulated: 1234,
        landing_ingress_flag: true,
        final_responses: {
          q1: 'A',
          q2: 'B'
        },
        final_q1_response: 'A'
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
        route: '/en/test/rhythm-a/question',
        consent_state: 'OPTED_IN',
        transition_id: 'transition-1',
        variant: 'rhythm-a',
        question_index_1based: 4,
        dwell_ms_accumulated: 1234,
        landing_ingress_flag: true,
        final_responses: {
          q1: 'A'
        },
        final_q1_response: 'A',
        question_text: 'Forbidden'
      } as never)
    ).toThrow(/Forbidden telemetry field/u);
  });
});
