import {JSDOM} from 'jsdom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {
  resetTelemetryRuntimeForTests,
  setTelemetryConsentState,
  trackQuestionAnswered
} from '../../src/features/telemetry/runtime';
import type {QuestionAnsweredEvent} from '../../src/features/telemetry/types';
import {validateTelemetryTransportEvent} from '../../src/features/telemetry/validation';

function makeQuestionAnswered(overrides: Record<string, unknown> = {}) {
  return {
    event_type: 'question_answered',
    event_id: 'event-1',
    session_id: 'session-1',
    ts_ms: 1,
    locale: 'en',
    route: '/en/test/egtt',
    consent_state: 'OPTED_IN',
    variant: 'egtt',
    question_index_1based: 3,
    choice: 'A',
    dwell_ms: 1200,
    landing_ingress_flag: true,
    ...overrides
  };
}

function makeResultViewed(overrides: Record<string, unknown> = {}) {
  return {
    event_type: 'result_viewed',
    event_id: 'event-1',
    session_id: 'session-1',
    ts_ms: 1,
    locale: 'en',
    route: '/en/test/egtt',
    consent_state: 'OPTED_IN',
    variant: 'egtt',
    derived_type: 'INTJ',
    landing_ingress_flag: false,
    ...overrides
  };
}

describe('question_answered / result_viewed validation', () => {
  it('accepts a valid question_answered transport event', () => {
    expect(() => validateTelemetryTransportEvent(makeQuestionAnswered())).not.toThrow();
  });

  it('rejects question_answered with a non-A/B choice', () => {
    expect(() => validateTelemetryTransportEvent(makeQuestionAnswered({choice: 'M'}))).toThrow(
      /question_answered/u
    );
  });

  it('accepts a valid result_viewed event', () => {
    expect(() => validateTelemetryTransportEvent(makeResultViewed())).not.toThrow();
  });

  it('rejects result_viewed with an empty derived_type', () => {
    expect(() => validateTelemetryTransportEvent(makeResultViewed({derived_type: ''}))).toThrow(
      /result_viewed/u
    );
  });

  it('rejects an unknown event_type', () => {
    expect(() =>
      validateTelemetryTransportEvent(makeQuestionAnswered({event_type: 'totally_unknown'}))
    ).toThrow(/Unsupported telemetry event_type/u);
  });

  it('rejects question_answered with a null session_id (post-attempt session-id rule)', () => {
    expect(() => validateTelemetryTransportEvent(makeQuestionAnswered({session_id: null}))).toThrow(
      /session_id/u
    );
  });
});

describe('trackQuestionAnswered runtime', () => {
  beforeEach(() => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'http://localhost/en'
    });
    Object.defineProperty(globalThis, 'window', {configurable: true, value: dom.window});
    Object.defineProperty(globalThis, 'document', {configurable: true, value: dom.window.document});
    resetTelemetryRuntimeForTests();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ok: true, status: 204}))
    );
    setTelemetryConsentState('OPTED_IN');
  });

  afterEach(() => {
    resetTelemetryRuntimeForTests();
    vi.unstubAllGlobals();
    // @ts-expect-error test cleanup
    delete globalThis.window;
    // @ts-expect-error test cleanup
    delete globalThis.document;
  });

  it('maps input fields to the question_answered payload keys', () => {
    const event = trackQuestionAnswered({
      locale: 'en',
      route: '/en/test/egtt',
      variant: 'egtt',
      questionIndex: 3,
      choice: 'A',
      dwellMs: 1200,
      landingIngressFlag: true
    });

    expect(event.event_type).toBe('question_answered');
    expect(event.question_index_1based).toBe(3);
    expect(event.dwell_ms).toBe(1200);
    expect(event.choice).toBe('A');
    expect(event.variant).toBe('egtt');
    expect(event.landing_ingress_flag).toBe(true);
  });

  it('types choice as the A|B union (type-level contract)', () => {
    const choice: QuestionAnsweredEvent['choice'] = 'B';
    expect(choice).toBe('B');
  });
});
