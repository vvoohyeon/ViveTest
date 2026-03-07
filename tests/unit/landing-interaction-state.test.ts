import {describe, expect, it} from 'vitest';

import {
  ALLOWED_PAGE_TRANSITIONS,
  ACTIVE_RAMP_UP_MS,
  initialLandingInteractionState,
  isAllowedPageTransition,
  isCardKeyboardAriaDisabled,
  isCardPointerInteractionBlocked,
  reduceLandingInteractionState,
  resolveCardStateForId,
  resolveCardTabIndex,
  type LandingInteractionEvent
} from '../../src/features/landing/model/interaction-state';

function replay(events: LandingInteractionEvent[]) {
  return events.reduce(reduceLandingInteractionState, initialLandingInteractionState);
}

describe('landing interaction state machine', () => {
  it('blocks card interactions while page is INACTIVE', () => {
    const state = replay([
      {type: 'PAGE_HIDDEN', nowMs: 0},
      {
        type: 'CARD_FOCUS',
        nowMs: 5,
        interactionMode: 'hover',
        cardId: 'test-rhythm-a',
        available: true
      }
    ]);

    expect(state.pageState).toBe('INACTIVE');
    expect(state.expandedCardId).toBeNull();
    expect(state.focusedCardId).toBeNull();
  });

  it('enforces ACTIVE ramp-up guard after INACTIVE -> ACTIVE recovery', () => {
    const preRamp = replay([
      {type: 'PAGE_HIDDEN', nowMs: 0},
      {type: 'PAGE_VISIBLE', nowMs: 100},
      {
        type: 'CARD_ACTIVATE',
        nowMs: 100 + ACTIVE_RAMP_UP_MS - 1,
        interactionMode: 'tap',
        cardId: 'test-rhythm-a',
        available: true
      }
    ]);

    expect(preRamp.expandedCardId).toBeNull();
    expect(preRamp.activeRampUntilMs).toBe(100 + ACTIVE_RAMP_UP_MS);

    const postRamp = reduceLandingInteractionState(preRamp, {
      type: 'CARD_ACTIVATE',
      nowMs: 100 + ACTIVE_RAMP_UP_MS + 1,
      interactionMode: 'tap',
      cardId: 'test-rhythm-a',
      available: true
    });

    expect(postRamp.activeRampUntilMs).toBeNull();
    expect(postRamp.expandedCardId).toBe('test-rhythm-a');
  });

  it('applies HOVER_LOCK keyboard mode split for non-target cards', () => {
    const hoverLocked = replay([
      {
        type: 'CARD_FOCUS',
        nowMs: 1,
        interactionMode: 'hover',
        cardId: 'test-rhythm-a',
        available: true
      },
      {type: 'KEYBOARD_MODE_ENTER'}
    ]);

    expect(hoverLocked.hoverLock.enabled).toBe(true);
    expect(hoverLocked.hoverLock.cardId).toBe('test-rhythm-a');
    expect(hoverLocked.hoverLock.keyboardMode).toBe(true);
    expect(isCardKeyboardAriaDisabled(hoverLocked, 'test-rhythm-b')).toBe(true);
    expect(resolveCardTabIndex(hoverLocked, 'test-rhythm-b')).toBe(0);
    expect(isCardPointerInteractionBlocked(hoverLocked, 'test-rhythm-b')).toBe(true);
  });

  it('enables HOVER_LOCK for unavailable focus in hover-capable mode without expanding unavailable card', () => {
    const state = replay([
      {
        type: 'CARD_FOCUS',
        nowMs: 1,
        interactionMode: 'hover',
        cardId: 'test-coming-soon-1',
        available: false
      }
    ]);

    expect(state.hoverLock.enabled).toBe(true);
    expect(state.hoverLock.cardId).toBe('test-coming-soon-1');
    expect(state.expandedCardId).toBeNull();
  });

  it('exits keyboard mode on pointer input and restores non-target tab blocking', () => {
    const state = replay([
      {
        type: 'CARD_FOCUS',
        nowMs: 1,
        interactionMode: 'hover',
        cardId: 'test-rhythm-a',
        available: true
      },
      {type: 'KEYBOARD_MODE_ENTER'},
      {type: 'KEYBOARD_MODE_EXIT'}
    ]);

    expect(state.hoverLock.keyboardMode).toBe(false);
    expect(isCardKeyboardAriaDisabled(state, 'test-rhythm-b')).toBe(false);
    expect(resolveCardTabIndex(state, 'test-rhythm-b')).toBe(-1);
    expect(isCardPointerInteractionBlocked(state, 'test-rhythm-b')).toBe(false);
  });

  it('keeps non-target cards pointer-reachable during pointer hover lock for desktop handoff', () => {
    const state = replay([
      {
        type: 'CARD_HOVER_ENTER',
        nowMs: 10,
        interactionMode: 'hover',
        cardId: 'test-rhythm-a',
        available: true
      }
    ]);

    expect(state.hoverLock.enabled).toBe(true);
    expect(state.hoverLock.keyboardMode).toBe(false);
    expect(isCardPointerInteractionBlocked(state, 'test-rhythm-b')).toBe(false);
  });

  it('resolves card state with deterministic priority over page lock states', () => {
    const state = replay([
      {
        type: 'CARD_FOCUS',
        nowMs: 1,
        interactionMode: 'tap',
        cardId: 'test-rhythm-a',
        available: true
      },
      {type: 'PAGE_HIDDEN', nowMs: 2}
    ]);

    expect(resolveCardStateForId(state, 'test-rhythm-a')).toBe('NORMAL');
  });

  it('rejects forbidden page-state transition as no-op and accepts declared table transitions', () => {
    expect(isAllowedPageTransition('ACTIVE', 'TRANSITIONING')).toBe(true);
    expect(ALLOWED_PAGE_TRANSITIONS.INACTIVE.has('TRANSITIONING')).toBe(false);

    const blocked = replay([
      {type: 'PAGE_HIDDEN', nowMs: 0},
      {type: 'PAGE_TRANSITION_START', nowMs: 1}
    ]);
    expect(blocked.pageState).toBe('INACTIVE');

    const allowed = replay([
      {type: 'PAGE_TRANSITION_START', nowMs: 0},
      {type: 'PAGE_TRANSITION_END', nowMs: 20}
    ]);
    expect(allowed.pageState).toBe('ACTIVE');
    expect(allowed.activeRampUntilMs).toBe(20 + ACTIVE_RAMP_UP_MS);
  });

  it('preserves conformance for reduced-motion and sensor-denied page states', () => {
    const reduced = replay([
      {type: 'REDUCED_MOTION_ENABLE', nowMs: 10},
      {type: 'REDUCED_MOTION_DISABLE', nowMs: 20}
    ]);
    expect(reduced.pageState).toBe('ACTIVE');

    const sensorDenied = replay([
      {type: 'SENSOR_DENIED', nowMs: 100},
      {type: 'SENSOR_ALLOWED', nowMs: 150}
    ]);
    expect(sensorDenied.pageState).toBe('ACTIVE');
    expect(sensorDenied.activeRampUntilMs).toBe(150 + ACTIVE_RAMP_UP_MS);
  });

  it('keeps settled output deterministic for identical input sequences', () => {
    const eventSequence: LandingInteractionEvent[] = [
      {type: 'MODE_SYNC', interactionMode: 'hover'},
      {
        type: 'CARD_HOVER_ENTER',
        nowMs: 10,
        interactionMode: 'hover',
        cardId: 'test-rhythm-a',
        available: true
      },
      {type: 'KEYBOARD_MODE_ENTER'},
      {
        type: 'CARD_HOVER_LEAVE',
        nowMs: 20,
        interactionMode: 'hover',
        cardId: 'test-rhythm-a'
      },
      {
        type: 'CARD_FOCUS',
        nowMs: 30,
        interactionMode: 'hover',
        cardId: 'test-rhythm-b',
        available: true
      }
    ];

    const first = replay(eventSequence);
    const second = replay(eventSequence);

    expect(second).toEqual(first);
  });
});
