// @vitest-environment jsdom

import {act, renderHook} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {useLandingGnbEntryMode} from '../../src/features/gnb/hooks/use-landing-gnb-entry-mode';
import type {MobileMenuState} from '../../src/features/gnb/types';

function createInput({
  isLandingContext = true,
  settingsOpen = false,
  mobileMenuState = 'closed'
}: {
  isLandingContext?: boolean;
  settingsOpen?: boolean;
  mobileMenuState?: MobileMenuState;
} = {}) {
  const header = document.createElement('header');
  header.innerHTML = '<button>Settings</button>';
  document.body.appendChild(header);

  const mobilePanel = document.createElement('div');
  mobilePanel.id = 'mobile-panel';
  mobilePanel.dataset.testid = 'gnb-mobile-menu-panel';
  mobilePanel.innerHTML = '<button>Mobile Item</button>';
  document.body.appendChild(mobilePanel);

  return {
    input: {
      isLandingContext,
      gnbShellRef: {current: header},
      mobileMenuPanelId: mobilePanel.id,
      settingsOpen,
      mobileMenuState
    },
    header,
    mobilePanel
  };
}

describe('useLandingGnbEntryMode', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('starts landing context in card-first mode and defers GNB tab indexes to -1', () => {
    const {input} = createInput();
    const {result} = renderHook(() => useLandingGnbEntryMode(input));

    expect(result.current.landingKeyboardEntryMode).toBe('card-first');
    expect(result.current.shouldDeferLandingGnbEntry).toBe(true);
    expect(result.current.desktopLandingTabIndex).toBe(-1);
    expect(result.current.mobileLandingTabIndex).toBe(-1);
  });

  it('starts non-landing context in gnb mode with tab indexes undefined', () => {
    const {input} = createInput({isLandingContext: false});
    const {result} = renderHook(() => useLandingGnbEntryMode(input));

    expect(result.current.landingKeyboardEntryMode).toBe('gnb');
    expect(result.current.shouldDeferLandingGnbEntry).toBe(false);
    expect(result.current.desktopLandingTabIndex).toBeUndefined();
    expect(result.current.mobileLandingTabIndex).toBeUndefined();
  });

  it('focusin inside the desktop GNB switches entry mode to gnb', () => {
    const {input, header} = createInput();
    const {result} = renderHook(() => useLandingGnbEntryMode(input));
    const button = header.querySelector('button')!;

    act(() => {
      button.dispatchEvent(new FocusEvent('focusin', {bubbles: true}));
    });

    expect(result.current.landingKeyboardEntryMode).toBe('gnb');
  });

  it('focusin inside the mobile menu panel switches entry mode to gnb', () => {
    const {input, mobilePanel} = createInput();
    const {result} = renderHook(() => useLandingGnbEntryMode(input));
    const button = mobilePanel.querySelector('button')!;

    act(() => {
      button.dispatchEvent(new FocusEvent('focusin', {bubbles: true}));
    });

    expect(result.current.landingKeyboardEntryMode).toBe('gnb');
  });

  it('focusin outside interactive GNB switches entry mode to card-first', () => {
    const {input, header} = createInput();
    const {result} = renderHook(() => useLandingGnbEntryMode(input));
    const button = header.querySelector('button')!;
    const outside = document.createElement('div');
    document.body.appendChild(outside);

    act(() => {
      button.dispatchEvent(new FocusEvent('focusin', {bubbles: true}));
    });
    expect(result.current.landingKeyboardEntryMode).toBe('gnb');

    act(() => {
      outside.dispatchEvent(new FocusEvent('focusin', {bubbles: true}));
    });

    expect(result.current.landingKeyboardEntryMode).toBe('card-first');
  });

  it('pointerdown outside interactive GNB resets entry mode to card-first', () => {
    const {input, header} = createInput();
    const {result} = renderHook(() => useLandingGnbEntryMode(input));
    const button = header.querySelector('button')!;

    act(() => {
      button.dispatchEvent(new FocusEvent('focusin', {bubbles: true}));
    });
    expect(result.current.landingKeyboardEntryMode).toBe('gnb');

    act(() => {
      document.body.dispatchEvent(new MouseEvent('pointerdown', {bubbles: true}));
    });

    expect(result.current.landingKeyboardEntryMode).toBe('card-first');
  });

  it('pointerdown inside interactive GNB does not reset entry mode', () => {
    const {input, header} = createInput();
    const {result} = renderHook(() => useLandingGnbEntryMode(input));
    const button = header.querySelector('button')!;

    act(() => {
      button.dispatchEvent(new FocusEvent('focusin', {bubbles: true}));
      button.dispatchEvent(new MouseEvent('pointerdown', {bubbles: true}));
    });

    expect(result.current.landingKeyboardEntryMode).toBe('gnb');
  });

  it('open settings causes shouldDeferLandingGnbEntry to be false', () => {
    const {input} = createInput({settingsOpen: true});
    const {result} = renderHook(() => useLandingGnbEntryMode(input));

    expect(result.current.shouldDeferLandingGnbEntry).toBe(false);
    expect(result.current.desktopLandingTabIndex).toBeUndefined();
    expect(result.current.mobileLandingTabIndex).toBeUndefined();
  });

  it('open or closing mobile menu causes shouldDeferLandingGnbEntry to be false', () => {
    const openInput = createInput({mobileMenuState: 'open'}).input;
    const closingInput = createInput({mobileMenuState: 'closing'}).input;

    const openResult = renderHook(() => useLandingGnbEntryMode(openInput));
    const closingResult = renderHook(() => useLandingGnbEntryMode(closingInput));

    expect(openResult.result.current.shouldDeferLandingGnbEntry).toBe(false);
    expect(closingResult.result.current.shouldDeferLandingGnbEntry).toBe(false);
  });

  it('removes focusin and pointerdown listeners on unmount', () => {
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
    const {input} = createInput();
    const {unmount} = renderHook(() => useLandingGnbEntryMode(input));

    unmount();

    expect(addEventListenerSpy).toHaveBeenCalledWith('focusin', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('focusin', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function));
  });
});
