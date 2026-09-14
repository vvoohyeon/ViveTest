// @vitest-environment jsdom

import {act, cleanup, renderHook} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {useGnbTabRouting} from '../../src/features/gnb/hooks/use-gnb-tab-routing';

function createButton(label: string) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  document.body.appendChild(button);
  return button;
}

function createEvent({
  key = 'Tab',
  shiftKey = false,
  altKey = false,
  ctrlKey = false,
  metaKey = false
}: {
  key?: string;
  shiftKey?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
} = {}) {
  return {
    key,
    shiftKey,
    altKey,
    ctrlKey,
    metaKey,
    preventDefault: vi.fn()
  };
}

function renderRouting({
  targets,
  isLandingContext = false,
  settingsOpen = false,
  closeSettingsImmediate = vi.fn(),
  focusFirstLandingCardTrigger = vi.fn(() => false)
}: {
  targets: HTMLElement[];
  isLandingContext?: boolean;
  settingsOpen?: boolean;
  closeSettingsImmediate?: () => void;
  focusFirstLandingCardTrigger?: () => boolean;
}) {
  const getOrderedKeyboardTargets = vi.fn(() => targets);
  const hook = renderHook(() =>
    useGnbTabRouting({
      getOrderedKeyboardTargets,
      isLandingContext,
      settingsOpen,
      closeSettingsImmediate,
      focusFirstLandingCardTrigger
    })
  );

  return {
    ...hook,
    getOrderedKeyboardTargets,
    closeSettingsImmediate,
    focusFirstLandingCardTrigger
  };
}

describe('useGnbTabRouting', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('ignores non-Tab keys and Tab with alt, ctrl, or meta modifiers', () => {
    const first = createButton('first');
    const second = createButton('second');
    const {result} = renderRouting({targets: [first, second]});

    for (const event of [
      createEvent({key: 'Enter'}),
      createEvent({altKey: true}),
      createEvent({ctrlKey: true}),
      createEvent({metaKey: true})
    ]) {
      first.focus();
      act(() => {
        result.current.handleGnbKeyDownCapture(event as never);
      });
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(first);
    }
  });

  it('no-ops when activeElement is missing or target list is empty', () => {
    const first = createButton('first');
    const event = createEvent();
    const {result} = renderRouting({targets: []});

    first.focus();
    act(() => {
      result.current.handleGnbKeyDownCapture(event as never);
    });

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(first);
  });

  it('no-ops when activeElement is outside ordered targets', () => {
    const first = createButton('first');
    const second = createButton('second');
    const outside = createButton('outside');
    const event = createEvent();
    const {result} = renderRouting({targets: [first, second]});

    outside.focus();
    act(() => {
      result.current.handleGnbKeyDownCapture(event as never);
    });

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(outside);
  });

  it('moves focus forward within ordered targets and prevents default', () => {
    const first = createButton('first');
    const second = createButton('second');
    const event = createEvent();
    const {result} = renderRouting({targets: [first, second]});

    first.focus();
    act(() => {
      result.current.handleGnbKeyDownCapture(event as never);
    });

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(second);
  });

  it('moves focus backward within ordered targets and prevents default', () => {
    const first = createButton('first');
    const second = createButton('second');
    const event = createEvent({shiftKey: true});
    const {result} = renderRouting({targets: [first, second]});

    second.focus();
    act(() => {
      result.current.handleGnbKeyDownCapture(event as never);
    });

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(first);
  });

  it('forward overflow in landing context focuses the first landing card, closes settings when open, and prevents default', () => {
    const first = createButton('first');
    const second = createButton('second');
    const event = createEvent();
    const closeSettingsImmediate = vi.fn();
    const focusFirstLandingCardTrigger = vi.fn(() => true);
    const {result} = renderRouting({
      targets: [first, second],
      isLandingContext: true,
      settingsOpen: true,
      closeSettingsImmediate,
      focusFirstLandingCardTrigger
    });

    second.focus();
    act(() => {
      result.current.handleGnbKeyDownCapture(event as never);
    });

    expect(focusFirstLandingCardTrigger).toHaveBeenCalledTimes(1);
    expect(closeSettingsImmediate).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
  });

  it('forward overflow in landing context without card focus success is a no-op and does not close settings', () => {
    const first = createButton('first');
    const second = createButton('second');
    const event = createEvent();
    const closeSettingsImmediate = vi.fn();
    const focusFirstLandingCardTrigger = vi.fn(() => false);
    const {result} = renderRouting({
      targets: [first, second],
      isLandingContext: true,
      settingsOpen: true,
      closeSettingsImmediate,
      focusFirstLandingCardTrigger
    });

    second.focus();
    act(() => {
      result.current.handleGnbKeyDownCapture(event as never);
    });

    expect(focusFirstLandingCardTrigger).toHaveBeenCalledTimes(1);
    expect(closeSettingsImmediate).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('forward overflow in destination context allows native focus-out', () => {
    const first = createButton('first');
    const second = createButton('second');
    const event = createEvent();
    const closeSettingsImmediate = vi.fn();
    const focusFirstLandingCardTrigger = vi.fn(() => true);
    const {result} = renderRouting({
      targets: [first, second],
      isLandingContext: false,
      settingsOpen: true,
      closeSettingsImmediate,
      focusFirstLandingCardTrigger
    });

    second.focus();
    act(() => {
      result.current.handleGnbKeyDownCapture(event as never);
    });

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(focusFirstLandingCardTrigger).not.toHaveBeenCalled();
    expect(closeSettingsImmediate).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(second);
  });


  // 종전에는 이 자리에 두 케이스가 있었다 — 「첫 `Tab` 이 GNB 첫 대상으로 간다」와 「랜딩에서는
  // 가지 않는다」. 둘 다 **탭 순서를 코드가 소유한다**는 같은 전제 위에 있었고, skip link 로
  // 교체되면서 그 전제가 사라졌다. 이제 문서 수준 `Tab` 은 가로채지 않는다 — 브라우저가 문서
  // 순서대로 처리하고, 첫 탭 스톱은 skip link 다.
  it('does not intercept a document-level Tab — the browser owns document order', () => {
    const first = createButton('first');
    const second = createButton('second');
    renderRouting({targets: [first, second]});
    const event = new KeyboardEvent('keydown', {key: 'Tab', bubbles: true, cancelable: true});

    act(() => {
      document.dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).not.toBe(first);
  });

  it('does not intercept a document-level Tab on landing either', () => {
    // 랜딩만 다르게 굴던 것이 종전 결함의 핵심이었다 — 같은 입력이 문맥에 따라 두 뜻이었다.
    const first = createButton('first');
    renderRouting({targets: [first], isLandingContext: true});
    const event = new KeyboardEvent('keydown', {key: 'Tab', bubbles: true, cancelable: true});

    act(() => {
      document.dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).not.toBe(first);
  });

  it('document-level Shift+Tab from body is a no-op', () => {
    const first = createButton('first');
    renderRouting({targets: [first]});
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true
    });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(document.body);
  });

});
