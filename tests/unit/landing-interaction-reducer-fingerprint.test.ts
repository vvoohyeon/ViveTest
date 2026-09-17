import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';

import {describe, expect, it} from 'vitest';

import {
  initialLandingInteractionState,
  reduceLandingInteractionState,
  type LandingInteractionEvent,
  type LandingInteractionState
} from '../../src/features/landing/model/interaction-state';
import type {PageState} from '../../src/features/landing/model/state-types';

// F1 — 리듀서 전수 지문 (step 1 §5-2).
//
// `reduceLandingInteractionState` 는 순수 함수이므로 상태 공간을 전수할 수 있다. 1,620 상태 ×
// 54 이벤트 = 87,480 전이 전부를 접어 하나의 다이제스트로 만들고, 그 값이 바뀌지 않는 것이
// 「리듀서의 행동이 한 비트도 바뀌지 않았다」의 증명이다.
//
// 지문을 「전이별 해시의 평면 목록」으로 커밋하지 않는 이유: sha256 은 되돌릴 수 없으므로 목록이
// 달라져도 어느 전이가 달라졌는지 알 수 없고, 87,480 줄은 그 자체로 1MB 넘는 불투명 파일이 된다.
// 대신 ⑴ 정렬된 전이 해시 목록 전체의 다이제스트(= 평면 목록과 같은 강도)와 ⑵ 이벤트별 다이제스트를
// 함께 커밋하고, 불일치 시에는 이 스펙이 실제 전이를 재계산해 달라진 (from, event, to) 를 출력한다.

const FIXTURE_URL = new URL('../fixtures/landing-interaction-reducer-fingerprint.json', import.meta.url);

const CARD_VARIANTS = ['alpha', 'beta'] as const;
const PAGE_STATES: readonly PageState[] = ['ACTIVE', 'INACTIVE', 'REDUCED_MOTION', 'SENSOR_DENIED', 'TRANSITIONING'];
const RAMP_VALUES: ReadonlyArray<number | null> = [null, 50, 500];
const CARD_SLOTS: ReadonlyArray<string | null> = [null, 'alpha', 'beta'];
const NOW_MS = 100;

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${canonicalize(entryValue)}`);

  return `{${entries.join(',')}}`;
}

function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

function enumerateStates(): LandingInteractionState[] {
  const states: LandingInteractionState[] = [];

  for (const pageState of PAGE_STATES) {
    for (const activeRampUntilMs of RAMP_VALUES) {
      for (const focusedCardVariant of CARD_SLOTS) {
        for (const expandedCardVariant of CARD_SLOTS) {
          for (const enabled of [false, true]) {
            for (const hoverLockCardVariant of CARD_SLOTS) {
              for (const keyboardMode of [false, true]) {
                states.push({
                  pageState,
                  activeRampUntilMs,
                  focusedCardVariant,
                  expandedCardVariant,
                  hoverLock: {enabled, cardVariant: hoverLockCardVariant, keyboardMode}
                });
              }
            }
          }
        }
      }
    }
  }

  return states;
}

function enumerateEvents(): LandingInteractionEvent[] {
  const events: LandingInteractionEvent[] = [];
  const pageEventTypes = [
    'PAGE_HIDDEN',
    'PAGE_VISIBLE',
    'PAGE_TRANSITION_START',
    'PAGE_TRANSITION_END',
    'REDUCED_MOTION_ENABLE',
    'REDUCED_MOTION_DISABLE',
    'SENSOR_DENIED',
    'SENSOR_ALLOWED'
  ] as const;

  for (const type of pageEventTypes) {
    events.push({type, nowMs: NOW_MS} as LandingInteractionEvent);
  }

  for (const interactionMode of ['hover', 'tap'] as const) {
    events.push({type: 'MODE_SYNC', interactionMode});
  }

  events.push({type: 'KEYBOARD_MODE_ENTER'});
  events.push({type: 'KEYBOARD_MODE_EXIT'});

  const availabilityCardEventTypes = ['CARD_FOCUS', 'CARD_ACTIVATE', 'CARD_EXPAND', 'CARD_HOVER_ENTER'] as const;

  for (const type of availabilityCardEventTypes) {
    for (const interactionMode of ['hover', 'tap'] as const) {
      for (const cardVariant of CARD_VARIANTS) {
        for (const available of [false, true]) {
          events.push({type, nowMs: NOW_MS, interactionMode, cardVariant, available} as LandingInteractionEvent);
        }
      }
    }
  }

  for (const interactionMode of ['hover', 'tap'] as const) {
    for (const cardVariant of CARD_SLOTS) {
      events.push({type: 'CARD_COLLAPSE', nowMs: NOW_MS, interactionMode, cardVariant});
    }
  }

  for (const interactionMode of ['hover', 'tap'] as const) {
    for (const cardVariant of CARD_VARIANTS) {
      events.push({type: 'CARD_HOVER_LEAVE', nowMs: NOW_MS, interactionMode, cardVariant});
    }
  }

  return events;
}

interface FingerprintReport {
  version: number;
  stateCount: number;
  eventCount: number;
  transitionCount: number;
  byEvent: Record<string, string>;
  digest: string;
}

type Reducer = (state: LandingInteractionState, event: LandingInteractionEvent) => LandingInteractionState;

function buildFingerprint(reducer: Reducer): {report: FingerprintReport; transitions: Map<string, string[]>} {
  const states = enumerateStates();
  const events = enumerateEvents();
  const transitions = new Map<string, string[]>();
  const allHashes: string[] = [];

  for (const event of events) {
    const eventKey = canonicalize(event);
    const hashes: string[] = [];

    for (const from of states) {
      const to = reducer(from, event);
      const hash = sha256(canonicalize({from, event, to}));
      hashes.push(hash);
      allHashes.push(hash);
    }

    hashes.sort();
    transitions.set(eventKey, hashes);
  }

  allHashes.sort();

  const byEvent: Record<string, string> = {};
  for (const [eventKey, hashes] of [...transitions.entries()].sort(([left], [right]) => (left < right ? -1 : 1))) {
    byEvent[eventKey] = sha256(hashes.join('\n'));
  }

  return {
    report: {
      version: 1,
      stateCount: states.length,
      eventCount: events.length,
      transitionCount: allHashes.length,
      byEvent,
      digest: sha256(allHashes.join('\n'))
    },
    transitions
  };
}

function describeDivergence(expected: FingerprintReport, actual: FingerprintReport): string {
  const changed = Object.keys(actual.byEvent).filter((key) => expected.byEvent[key] !== actual.byEvent[key]);
  const added = Object.keys(actual.byEvent).filter((key) => !(key in expected.byEvent));
  const removed = Object.keys(expected.byEvent).filter((key) => !(key in actual.byEvent));

  const lines: string[] = [];
  if (changed.length > 0) {
    lines.push(`전이가 달라진 이벤트 ${changed.length} 종:`);
    for (const key of changed.slice(0, 10)) {
      const states = enumerateStates();
      const event = JSON.parse(key) as LandingInteractionEvent;
      const sample = states
        .map((from) => ({from, to: reduceLandingInteractionState(from, event)}))
        .slice(0, 1)
        .map(({from, to}) => `  from=${canonicalize(from)}\n  to=${canonicalize(to)}`)
        .join('\n');
      lines.push(`- ${key}\n${sample}`);
    }
  }
  if (added.length > 0) {
    lines.push(`새로 생긴 이벤트: ${added.join(', ')}`);
  }
  if (removed.length > 0) {
    lines.push(`사라진 이벤트: ${removed.join(', ')}`);
  }

  return lines.join('\n');
}

describe('landing interaction reducer fingerprint (F1)', () => {
  const {report} = buildFingerprint(reduceLandingInteractionState);

  it('enumerates the full declared state x event space', () => {
    expect(report.stateCount).toBe(1620);
    expect(report.eventCount).toBe(54);
    expect(report.transitionCount).toBe(1620 * 54);
  });

  it('matches the committed fingerprint byte for byte', () => {
    if (process.env.UPDATE_LANDING_FINGERPRINTS === '1') {
      writeFileSync(FIXTURE_URL, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    }

    const expected = JSON.parse(readFileSync(FIXTURE_URL, 'utf8')) as FingerprintReport;

    expect(report.digest, describeDivergence(expected, report)).toBe(expected.digest);
    expect(report.byEvent).toEqual(expected.byEvent);
    expect(report.stateCount).toBe(expected.stateCount);
    expect(report.eventCount).toBe(expected.eventCount);
    expect(report.transitionCount).toBe(expected.transitionCount);
  });

  // 고장 주입 — 지문이 실제로 변화를 잡는지 같은 스펙 안에서 보인다.
  // 이것이 없으면 지문은 조용히 초록이 되는 장치다.
  // 지문 전체를 **두 번** 만드는 검사라 초 단위로 걸린다 — vitest 의 기본 제한 5,000ms 는 이
  // 일에 맞춰 정해진 값이 아니다. 실측(2026-09-16): F1 3,072ms · F2 **6,281ms** · F3 785ms 이고
  // F2 는 파일 셋만 나란히 돌려도 기본 제한을 넘는다. 즉 이 붉음은 조용한 기계에서만 초록이던
  // 잠복이었고, 단위 9 가 파일 하나를 더하면서 드러났다. 단언은 그대로 두고 **제한만** 실제
  // 소요에 맞춘다 — 매달린 검사는 여전히 여기서 걸린다.
  it('changes when a single reducer outcome is perturbed', () => {
    const perturbed: Reducer = (state, event) => {
      const next = reduceLandingInteractionState(state, event);

      if (event.type === 'KEYBOARD_MODE_ENTER' && state.pageState === 'SENSOR_DENIED') {
        return {...next, focusedCardVariant: 'injected-fault'};
      }

      return next;
    };

    const {report: faulty} = buildFingerprint(perturbed);

    expect(faulty.digest).not.toBe(report.digest);
    expect(faulty.byEvent[canonicalize({type: 'KEYBOARD_MODE_ENTER'})]).not.toBe(
      report.byEvent[canonicalize({type: 'KEYBOARD_MODE_ENTER'})]
    );
    // 다른 이벤트의 지문은 그대로여야 한다 — 이벤트별 국소화가 실제로 작동한다는 증거.
    expect(faulty.byEvent[canonicalize({type: 'KEYBOARD_MODE_EXIT'})]).toBe(
      report.byEvent[canonicalize({type: 'KEYBOARD_MODE_EXIT'})]
    );
  }, 30_000);

  it('keeps the documented initial state inside the enumerated space', () => {
    expect(enumerateStates()).toContainEqual(initialLandingInteractionState);
  });
});
