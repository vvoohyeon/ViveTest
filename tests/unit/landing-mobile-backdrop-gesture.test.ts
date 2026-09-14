// @vitest-environment jsdom

import type {PointerEvent as ReactPointerEvent} from 'react';
import React, {act, useEffect} from 'react';
import type {Root} from 'react-dom/client';
import {createRoot} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import type {LandingCardMobilePhase} from '../../src/features/landing/grid/landing-grid-card';
import type {LandingMobileLifecycleEvent} from '../../src/features/landing/grid/mobile-lifecycle';
import {
  type MobileBackdropBindings,
  useMobileBackdropGesture
} from '../../src/features/landing/grid/use-mobile-backdrop-gesture';

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let bindings: MobileBackdropBindings | null = null;

function pointer(clientX: number, clientY: number) {
  return {clientX, clientY} as ReactPointerEvent<HTMLDivElement>;
}

function BackdropGestureHarness({
  isMobileViewport,
  phase,
  beginMobileClose,
  dispatchMobileLifecycle
}: {
  isMobileViewport: boolean;
  phase: LandingCardMobilePhase;
  beginMobileClose: () => void;
  dispatchMobileLifecycle: React.Dispatch<LandingMobileLifecycleEvent>;
}) {
  const nextBindings = useMobileBackdropGesture({
    isMobileViewport,
    phase,
    beginMobileClose,
    dispatchMobileLifecycle
  ,
        usesTouchCloseAffordance: false,
        desktopOverlayExpandedCardVariant: null,
        collapseDesktopOverlay: () => {}
      });

  useEffect(() => {
    bindings = nextBindings;
  }, [nextBindings]);

  return null;
}

async function renderGesture(props: {
  isMobileViewport?: boolean;
  phase: LandingCardMobilePhase;
  beginMobileClose?: () => void;
  dispatchMobileLifecycle?: React.Dispatch<LandingMobileLifecycleEvent>;
}) {
  const beginMobileClose = props.beginMobileClose ?? vi.fn();
  const dispatchMobileLifecycle = props.dispatchMobileLifecycle ?? vi.fn();

  await act(async () => {
    root?.render(
      React.createElement(BackdropGestureHarness, {
        isMobileViewport: props.isMobileViewport ?? true,
        phase: props.phase,
        beginMobileClose,
        dispatchMobileLifecycle
      })
    );
    await Promise.resolve();
  });

  return {beginMobileClose, dispatchMobileLifecycle};
}

describe('mobile backdrop gesture', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
      configurable: true,
      value: true
    });
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
    Reflect.deleteProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT');
  });

  it('is inactive and no-ops outside the mobile active phases', async () => {
    const {beginMobileClose, dispatchMobileLifecycle} = await renderGesture({
      isMobileViewport: false,
      phase: 'OPEN'
    });

    expect(bindings?.active).toBe(false);
    expect(bindings?.state).toBe('HIDDEN');

    bindings?.onPointerDown(pointer(0, 0));
    bindings?.onPointerMove(pointer(20, 0));
    bindings?.onPointerUp();
    bindings?.onPointerCancel();

    expect(beginMobileClose).not.toHaveBeenCalled();
    expect(dispatchMobileLifecycle).not.toHaveBeenCalled();
  });

  it('closes once for an OPEN outside pointer down and up', async () => {
    const {beginMobileClose} = await renderGesture({phase: 'OPEN'});

    expect(bindings?.active).toBe(true);
    expect(bindings?.state).toBe('OPEN');

    bindings?.onPointerDown(pointer(10, 10));
    bindings?.onPointerUp();
    bindings?.onPointerUp();

    expect(beginMobileClose).toHaveBeenCalledTimes(1);
  });

  it('cancels the OPEN close when outside movement exceeds the scroll threshold', async () => {
    const {beginMobileClose} = await renderGesture({phase: 'OPEN'});

    bindings?.onPointerDown(pointer(10, 10));
    bindings?.onPointerMove(pointer(10, 21));
    bindings?.onPointerUp();

    expect(beginMobileClose).not.toHaveBeenCalled();
  });

  it('queues OPENING close and cancels the queue when movement becomes scroll', async () => {
    const beginMobileClose = vi.fn();
    const dispatchMobileLifecycle = vi.fn();
    await renderGesture({
      phase: 'OPENING',
      beginMobileClose,
      dispatchMobileLifecycle
    });

    bindings?.onPointerDown(pointer(5, 5));
    expect(beginMobileClose).toHaveBeenCalledTimes(1);

    bindings?.onPointerMove(pointer(16, 5));
    bindings?.onPointerUp();

    expect(dispatchMobileLifecycle).toHaveBeenCalledWith({type: 'QUEUE_CLOSE_CANCEL'});
    expect(beginMobileClose).toHaveBeenCalledTimes(1);
  });
});
