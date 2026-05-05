// @vitest-environment jsdom
import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {DESKTOP_SETTINGS_HOVER_CLOSE_DELAY_MS} from '../../src/features/landing/gnb/behavior';
import {useGnbDesktopSettings} from '../../src/features/landing/gnb/hooks/use-gnb-desktop-settings';

describe('useGnbDesktopSettings', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with settings closed', () => {
    const {result} = renderHook(() => useGnbDesktopSettings({hoverOpenEnabled: true}));

    expect(result.current.settingsOpen).toBe(false);
  });

  it('openSettingsImmediate sets settingsOpen to true', () => {
    const {result} = renderHook(() => useGnbDesktopSettings({hoverOpenEnabled: true}));

    act(() => {
      result.current.openSettingsImmediate();
    });

    expect(result.current.settingsOpen).toBe(true);
  });

  it('closeSettingsImmediate sets settingsOpen to false', () => {
    const {result} = renderHook(() => useGnbDesktopSettings({hoverOpenEnabled: true}));

    act(() => {
      result.current.openSettingsImmediate();
    });
    act(() => {
      result.current.closeSettingsImmediate();
    });

    expect(result.current.settingsOpen).toBe(false);
  });

  it('toggleSettingsOpen flips the open state', () => {
    const {result} = renderHook(() => useGnbDesktopSettings({hoverOpenEnabled: true}));

    act(() => {
      result.current.toggleSettingsOpen();
    });
    expect(result.current.settingsOpen).toBe(true);

    act(() => {
      result.current.toggleSettingsOpen();
    });
    expect(result.current.settingsOpen).toBe(false);
  });

  describe('hover - hoverOpenEnabled: true', () => {
    it('desktopSettingsEnter opens settings', () => {
      const {result} = renderHook(() => useGnbDesktopSettings({hoverOpenEnabled: true}));

      act(() => {
        result.current.desktopSettingsEnter();
      });

      expect(result.current.settingsOpen).toBe(true);
    });

    it('desktopSettingsLeave closes after DESKTOP_SETTINGS_HOVER_CLOSE_DELAY_MS', () => {
      const {result} = renderHook(() => useGnbDesktopSettings({hoverOpenEnabled: true}));

      act(() => {
        result.current.desktopSettingsEnter();
      });
      act(() => {
        result.current.desktopSettingsLeave();
      });

      expect(result.current.settingsOpen).toBe(true);

      act(() => {
        vi.advanceTimersByTime(DESKTOP_SETTINGS_HOVER_CLOSE_DELAY_MS);
      });

      expect(result.current.settingsOpen).toBe(false);
    });

    it('desktopSettingsEnter after leave cancels the close timer', () => {
      const {result} = renderHook(() => useGnbDesktopSettings({hoverOpenEnabled: true}));

      act(() => {
        result.current.desktopSettingsEnter();
      });
      act(() => {
        result.current.desktopSettingsLeave();
      });
      act(() => {
        result.current.desktopSettingsEnter();
      });
      act(() => {
        vi.advanceTimersByTime(DESKTOP_SETTINGS_HOVER_CLOSE_DELAY_MS * 2);
      });

      expect(result.current.settingsOpen).toBe(true);
    });
  });

  describe('hover - hoverOpenEnabled: false', () => {
    it('desktopSettingsEnter is a no-op', () => {
      const {result} = renderHook(() => useGnbDesktopSettings({hoverOpenEnabled: false}));

      act(() => {
        result.current.desktopSettingsEnter();
      });

      expect(result.current.settingsOpen).toBe(false);
    });

    it('desktopSettingsLeave is a no-op', () => {
      const {result} = renderHook(() => useGnbDesktopSettings({hoverOpenEnabled: false}));

      act(() => {
        result.current.openSettingsImmediate();
      });
      act(() => {
        result.current.desktopSettingsLeave();
      });
      act(() => {
        vi.advanceTimersByTime(DESKTOP_SETTINGS_HOVER_CLOSE_DELAY_MS * 2);
      });

      expect(result.current.settingsOpen).toBe(true);
    });
  });

  describe('outside pointerdown', () => {
    it('closes settings when pointerdown is outside settingsRootRef', () => {
      const {result} = renderHook(() => useGnbDesktopSettings({hoverOpenEnabled: true}));

      act(() => {
        result.current.openSettingsImmediate();
      });
      expect(result.current.settingsOpen).toBe(true);

      act(() => {
        document.body.dispatchEvent(new MouseEvent('pointerdown', {bubbles: true}));
      });

      expect(result.current.settingsOpen).toBe(false);
    });

    it('does not close when pointerdown is inside settingsRootRef', () => {
      const {result} = renderHook(() => useGnbDesktopSettings({hoverOpenEnabled: true}));
      const container = document.createElement('div');
      const inner = document.createElement('button');

      document.body.appendChild(container);
      container.appendChild(inner);

      act(() => {
        result.current.settingsRootRef.current = container;
        result.current.openSettingsImmediate();
      });

      act(() => {
        inner.dispatchEvent(new MouseEvent('pointerdown', {bubbles: true}));
      });

      expect(result.current.settingsOpen).toBe(true);

      document.body.removeChild(container);
    });

    it('does not register pointerdown listener when settings is closed', () => {
      const {result} = renderHook(() => useGnbDesktopSettings({hoverOpenEnabled: true}));

      expect(result.current.settingsOpen).toBe(false);

      act(() => {
        document.body.dispatchEvent(new MouseEvent('pointerdown', {bubbles: true}));
      });

      expect(result.current.settingsOpen).toBe(false);
    });
  });
});
