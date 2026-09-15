// @vitest-environment jsdom

import type {PointerEvent as ReactPointerEvent} from 'react';
import React, {act, useEffect} from 'react';
import type {Root} from 'react-dom/client';
import {createRoot} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {
  BACKDROP_MOTION_DURATION_MS,
  useOverlayBackdropGesture,
  type OverlayBackdropBindings
} from '../../src/features/landing/grid/use-overlay-backdrop-gesture';

// 이 backdrop 은 **제자리 오버레이의 것이다.** 폰의 확장은 바텀시트로 옮겨 갔고 시트는 자기
// 스크림·제스처·잠금을 프리미티브에서 갖는다(`bottom-sheet.test.ts`). 여기 남는 계약은 hover 가
// 없는 태블릿에서 「빈 곳 탭」이 닫기가 되는 것 하나다(명세 §2-11).

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let bindings: OverlayBackdropBindings | null = null;

function pointer(clientX: number, clientY: number) {
  return {clientX, clientY} as ReactPointerEvent<HTMLDivElement>;
}

function BackdropGestureHarness({
  usesTouchCloseAffordance,
  rendersInPlaceOverlay,
  expandedCardVariant,
  collapseOverlay
}: {
  usesTouchCloseAffordance: boolean;
  rendersInPlaceOverlay: boolean;
  expandedCardVariant: string | null;
  collapseOverlay: () => void;
}) {
  const nextBindings = useOverlayBackdropGesture({
    usesTouchCloseAffordance,
    rendersInPlaceOverlay,
    expandedCardVariant,
    collapseOverlay
  });

  useEffect(() => {
    bindings = nextBindings;
  }, [nextBindings]);

  return null;
}

async function renderGesture(props: {
  usesTouchCloseAffordance?: boolean;
  rendersInPlaceOverlay?: boolean;
  expandedCardVariant?: string | null;
  collapseOverlay?: () => void;
}) {
  const collapseOverlay = props.collapseOverlay ?? vi.fn();

  await act(async () => {
    root?.render(
      React.createElement(BackdropGestureHarness, {
        usesTouchCloseAffordance: props.usesTouchCloseAffordance ?? true,
        rendersInPlaceOverlay: props.rendersInPlaceOverlay ?? true,
        expandedCardVariant: props.expandedCardVariant ?? 'qmbti',
        collapseOverlay
      })
    );
    await Promise.resolve();
  });

  return {collapseOverlay};
}

describe('제자리 오버레이 backdrop 제스처', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {configurable: true, value: true});
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    bindings = null;
  });

  afterEach(async () => {
    await act(async () => {
      root?.unmount();
      await Promise.resolve();
    });
    root = null;
    container?.remove();
    container = null;
    bindings = null;
    vi.useRealTimers();
    Reflect.deleteProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT');
  });

  it('hover 가 있는 기기에서는 깔리지 않는다 — 닫기 경로가 이미 포인터 이탈이다', async () => {
    const {collapseOverlay} = await renderGesture({usesTouchCloseAffordance: false});

    expect(bindings?.active).toBe(false);
    expect(bindings?.state).toBe('HIDDEN');

    bindings?.onPointerDown(pointer(0, 0));
    bindings?.onPointerUp();

    expect(collapseOverlay).not.toHaveBeenCalled();
  });

  it('폰(시트)에서는 깔리지 않는다 — 시트가 자기 스크림을 갖는다', async () => {
    const {collapseOverlay} = await renderGesture({rendersInPlaceOverlay: false});

    expect(bindings?.active).toBe(false);

    bindings?.onPointerDown(pointer(0, 0));
    bindings?.onPointerUp();

    expect(collapseOverlay).not.toHaveBeenCalled();
  });

  it('빈 곳 탭 한 번이 한 번만 닫는다', async () => {
    const {collapseOverlay} = await renderGesture({});

    expect(bindings?.active).toBe(true);
    expect(bindings?.state).toBe('OPEN');

    bindings?.onPointerDown(pointer(10, 10));
    bindings?.onPointerUp();
    bindings?.onPointerUp();

    expect(collapseOverlay).toHaveBeenCalledTimes(1);
  });

  it('스크롤 문턱을 넘는 이동은 닫기가 아니다', async () => {
    const {collapseOverlay} = await renderGesture({});

    bindings?.onPointerDown(pointer(10, 10));
    bindings?.onPointerMove(pointer(10, 21));
    bindings?.onPointerUp();

    expect(collapseOverlay).not.toHaveBeenCalled();
  });

  it('닫힌 뒤에도 카드가 접히는 동안 어둠이 남고, 그 동안 입력을 통과시킨다', async () => {
    const collapseOverlay = vi.fn();
    await renderGesture({collapseOverlay});

    await act(async () => {
      root?.render(
        React.createElement(BackdropGestureHarness, {
          usesTouchCloseAffordance: true,
          rendersInPlaceOverlay: true,
          expandedCardVariant: null,
          collapseOverlay
        })
      );
      await Promise.resolve();
    });

    expect(bindings?.active, '카드가 아직 접히는 중이면 어둠이 남는다').toBe(true);
    expect(bindings?.state).toBe('EXITING');

    bindings?.onPointerDown(pointer(10, 10));
    bindings?.onPointerUp();
    expect(collapseOverlay, '소멸 중의 어둠은 장식이므로 입력을 삼키지 않는다').not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(BACKDROP_MOTION_DURATION_MS);
      await Promise.resolve();
    });

    expect(bindings?.active).toBe(false);
    expect(bindings?.state).toBe('HIDDEN');
  });
});
