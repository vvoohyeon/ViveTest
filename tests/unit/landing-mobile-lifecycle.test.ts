/**
 * @vitest-environment jsdom
 */

import {act, cleanup, renderHook} from '@testing-library/react';
import {createRef} from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {
  initialLandingMobileLifecycleState,
  isMobileLifecycleActive,
  mobilePhaseFromSheetPhase
} from '../../src/features/landing/grid/mobile-lifecycle';
import {useMobileCardLifecycle} from '../../src/features/landing/grid/use-mobile-card-lifecycle';
import type {LandingCardInteractionMode} from '../../src/features/landing/grid/landing-grid-card';

// 폰의 확장이 바텀시트가 되면서 이 모듈에서 위상 기계가 사라졌다 — **시트가 위상의 정본**이고
// 여기 남는 것은 그 위상을 계약 이름으로 옮기는 사전과, 의도를 상호작용 상태로 옮기는 셋이다.
// 스냅샷·복귀 폴링·transient 셸·열림/닫힘 타이머를 보던 검사들이 함께 사라진 이유가 그것이다:
// 그것들이 지키던 성질(복귀 정확성)은 이제 절차가 아니라 구조가 준다.

const interactionMode: LandingCardInteractionMode = 'tap';

function renderLifecycle(dispatchInteraction = vi.fn(), clearHoverTimer = vi.fn()) {
  const shellRef = createRef<HTMLElement>() as {current: HTMLElement | null};
  shellRef.current = document.createElement('section');

  const view = renderHook(() =>
    useMobileCardLifecycle({
      interactionMode,
      dispatchInteraction,
      shellRef,
      clearHoverTimer
    })
  );

  return {view, dispatchInteraction, clearHoverTimer, shellRef};
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('시트 위상 → 계약 위상', () => {
  it('네 위상이 일대일로 옮겨진다', () => {
    expect(mobilePhaseFromSheetPhase('closed')).toBe('NORMAL');
    expect(mobilePhaseFromSheetPhase('entering')).toBe('OPENING');
    expect(mobilePhaseFromSheetPhase('open')).toBe('OPEN');
    expect(mobilePhaseFromSheetPhase('closing')).toBe('CLOSING');
  });

  it('초기 상태는 아무 카드도 열려 있지 않다', () => {
    expect(initialLandingMobileLifecycleState).toEqual({phase: 'NORMAL', cardVariant: null});
    expect(isMobileLifecycleActive(initialLandingMobileLifecycleState)).toBe(false);
  });

  it('닫히는 중도 활성이다 — 그 동안 다른 카드의 활성화가 막힌다', () => {
    expect(isMobileLifecycleActive({phase: 'CLOSING', cardVariant: 'qmbti'})).toBe(true);
    expect(isMobileLifecycleActive({phase: 'OPENING', cardVariant: 'qmbti'})).toBe(true);
  });
});

describe('useMobileCardLifecycle', () => {
  it('열기는 hover 타이머를 걷고 CARD_EXPAND 를 보낸다', () => {
    const {view, dispatchInteraction, clearHoverTimer} = renderLifecycle();

    act(() => {
      view.result.current.beginMobileOpen('qmbti');
    });

    expect(clearHoverTimer).toHaveBeenCalled();
    expect(dispatchInteraction).toHaveBeenCalledWith(
      expect.objectContaining({type: 'CARD_EXPAND', cardVariant: 'qmbti', available: true, interactionMode})
    );
  });

  it('syncInteraction 이 거짓이면 상태를 쓰지 않는다 — 이미 열려 있는 것을 다시 열지 않는다', () => {
    const {view, dispatchInteraction} = renderLifecycle();

    act(() => {
      view.result.current.beginMobileOpen('qmbti', false);
    });

    expect(dispatchInteraction).not.toHaveBeenCalled();
  });

  it('닫기는 CARD_COLLAPSE 를 보낸다', () => {
    const {view, dispatchInteraction} = renderLifecycle();

    act(() => {
      view.result.current.beginMobileClose('qmbti');
    });

    expect(dispatchInteraction).toHaveBeenCalledWith(
      expect.objectContaining({type: 'CARD_COLLAPSE', cardVariant: 'qmbti'})
    );
  });

  it('키보드 핸드오프는 원본을 접고 다음 카드로 포커스를 넘긴다', () => {
    const {view, dispatchInteraction, shellRef} = renderLifecycle();
    const nextCard = document.createElement('div');
    nextCard.dataset.cardVariant = 'egtt';
    const trigger = document.createElement('button');
    trigger.dataset.testid = 'landing-grid-card-trigger';
    nextCard.appendChild(trigger);
    shellRef.current?.appendChild(nextCard);

    act(() => {
      view.result.current.beginMobileKeyboardHandoff('qmbti', 'egtt', 10);
    });

    expect(dispatchInteraction).toHaveBeenCalledWith(
      expect.objectContaining({type: 'CARD_COLLAPSE', cardVariant: 'qmbti', nowMs: 10})
    );
  });

  it('넘길 다음 카드가 없으면 접기만 한다', () => {
    const {view, dispatchInteraction} = renderLifecycle();

    act(() => {
      view.result.current.beginMobileKeyboardHandoff('qmbti', null, 10);
    });

    expect(dispatchInteraction).toHaveBeenCalledTimes(1);
    expect(dispatchInteraction).toHaveBeenCalledWith(
      expect.objectContaining({type: 'CARD_COLLAPSE', cardVariant: 'qmbti'})
    );
  });
});
