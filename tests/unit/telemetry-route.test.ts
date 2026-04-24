import {describe, expect, it} from 'vitest';

import {POST} from '../../src/app/api/telemetry/route';

function jsonRequest(body: unknown): Request {
  return new Request('http://localhost/api/telemetry', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
}

describe('telemetry route', () => {
  it('returns 400 when the JSON body is not an object payload', async () => {
    const response = await POST(jsonRequest(['landing_view']));

    expect(response.status).toBe(400);
  });

  it('returns 400 when the payload does not include event_type', async () => {
    const response = await POST(
      jsonRequest({
        event_id: 'event-1'
      })
    );

    expect(response.status).toBe(400);
  });

  it('assertion:B18-server-telemetry-validation returns 400 when shared telemetry validation rejects forbidden fields', async () => {
    const response = await POST(
      jsonRequest({
        event_type: 'landing_view',
        event_id: 'event-1',
        session_id: 'session-1',
        ts_ms: 1,
        locale: 'en',
        route: '/en',
        consent_state: 'OPTED_IN',
        question_text: 'raw text must not be accepted'
      })
    );

    expect(response.status).toBe(400);
  });

  it('returns 400 when attempt_start arrives without a session_id', async () => {
    const response = await POST(
      jsonRequest({
        event_type: 'attempt_start',
        event_id: 'event-1',
        session_id: null,
        ts_ms: 1,
        locale: 'en',
        route: '/en/test/qmbti',
        consent_state: 'OPTED_IN',
        variant: 'qmbti',
        question_index_1based: 1,
        dwell_ms_accumulated: 0,
        landing_ingress_flag: false
      })
    );

    expect(response.status).toBe(400);
  });

  it('returns 204 when a valid telemetry payload passes validation', async () => {
    const response = await POST(
      jsonRequest({
        event_type: 'landing_view',
        event_id: 'event-1',
        session_id: 'session-1',
        ts_ms: 1,
        locale: 'en',
        route: '/en',
        consent_state: 'OPTED_IN'
      })
    );

    expect(response.status).toBe(204);
  });
});
