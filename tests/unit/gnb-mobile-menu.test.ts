// @vitest-environment jsdom
import type {PointerEvent as ReactPointerEvent} from 'react';
import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {MOBILE_MENU_CLOSE_DURATION_MS} from '../../src/features/landing/gnb/behavior';
import {useGnbMobileMenu} from '../../src/features/landing/gnb/hooks/use-gnb-mobile-menu';

function pointer(clientX: number, clientY: number) {
  return {clientX, clientY} as ReactPointerEvent<HTMLDivElement>;
}

describe('useGnbMobileMenu', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  });

  it('starts in closed state', () => {
    const {result} = renderHook(() => useGnbMobileMenu());

    expect(result.current.mobileMenuState).toBe('closed');
  });

  it('setMobileMenuOpen transitions to open', () => {
    const {result} = renderHook(() => useGnbMobileMenu());

    act(() => {
      result.current.setMobileMenuOpen();
    });

    expect(result.current.mobileMenuState).toBe('open');
  });

  describe('requestMobileMenuClose', () => {
    it('transitions open -> closing -> closed after timer', () => {
      const {result} = renderHook(() => useGnbMobileMenu());

      act(() => {
        result.current.setMobileMenuOpen();
      });
      act(() => {
        result.current.requestMobileMenuClose('button');
      });
      expect(result.current.mobileMenuState).toBe('closing');

      act(() => {
        vi.advanceTimersByTime(MOBILE_MENU_CLOSE_DURATION_MS);
      });
      expect(result.current.mobileMenuState).toBe('closed');
    });

    it('is a no-op when state is not open', () => {
      const {result} = renderHook(() => useGnbMobileMenu());

      act(() => {
        result.current.requestMobileMenuClose('button');
      });

      expect(result.current.mobileMenuState).toBe('closed');
    });

    it('does not double-close when called twice while closing', () => {
      const {result} = renderHook(() => useGnbMobileMenu());

      act(() => {
        result.current.setMobileMenuOpen();
      });
      act(() => {
        result.current.requestMobileMenuClose('button');
      });
      act(() => {
        result.current.requestMobileMenuClose('button');
      });

      expect(result.current.mobileMenuState).toBe('closing');
    });
  });

  it('closeMobileMenuImmediate closes without waiting for timer', () => {
    const {result} = renderHook(() => useGnbMobileMenu());

    act(() => {
      result.current.setMobileMenuOpen();
    });
    act(() => {
      result.current.closeMobileMenuImmediate();
    });

    expect(result.current.mobileMenuState).toBe('closed');
  });

  describe('scroll lock side-effect', () => {
    it('locks body scroll when menu is open', () => {
      const {result} = renderHook(() => useGnbMobileMenu());

      act(() => {
        result.current.setMobileMenuOpen();
      });

      expect(document.body.style.overflow).toBe('hidden');
      expect(document.body.style.touchAction).toBe('none');
    });

    it('locks body scroll during closing transition', () => {
      const {result} = renderHook(() => useGnbMobileMenu());

      act(() => {
        result.current.setMobileMenuOpen();
      });
      act(() => {
        result.current.requestMobileMenuClose('button');
      });

      expect(document.body.style.overflow).toBe('hidden');
      expect(document.body.style.touchAction).toBe('none');
    });

    it('restores body scroll after close completes', () => {
      const {result} = renderHook(() => useGnbMobileMenu());

      act(() => {
        result.current.setMobileMenuOpen();
      });
      act(() => {
        result.current.requestMobileMenuClose('button');
      });
      act(() => {
        vi.advanceTimersByTime(MOBILE_MENU_CLOSE_DURATION_MS);
      });

      expect(document.body.style.overflow).toBe('');
      expect(document.body.style.touchAction).toBe('');
    });
  });

  describe('cancelMobileMenuCloseFromScroll', () => {
    it('reverts closing -> open when an outside close becomes scroll movement', () => {
      const {result} = renderHook(() => useGnbMobileMenu());

      act(() => {
        result.current.setMobileMenuOpen();
      });
      act(() => {
        result.current.mobileMenuBackdropPointerDown(pointer(10, 10));
      });
      expect(result.current.mobileMenuState).toBe('closing');

      act(() => {
        result.current.mobileMenuBackdropPointerMove(pointer(10, 30));
      });

      expect(result.current.mobileMenuState).toBe('open');

      act(() => {
        vi.advanceTimersByTime(MOBILE_MENU_CLOSE_DURATION_MS * 2);
      });
      expect(result.current.mobileMenuState).toBe('open');
    });

    it('does not cancel when close reason is not outside', () => {
      const {result} = renderHook(() => useGnbMobileMenu());

      act(() => {
        result.current.setMobileMenuOpen();
      });
      act(() => {
        result.current.requestMobileMenuClose('button');
      });
      act(() => {
        vi.advanceTimersByTime(MOBILE_MENU_CLOSE_DURATION_MS);
      });

      expect(result.current.mobileMenuState).toBe('closed');
    });
  });

  describe('focus restore', () => {
    it('restores focus to mobileMenuTriggerRef after close completes', () => {
      const {result} = renderHook(() => useGnbMobileMenu());
      const trigger = document.createElement('button');
      const focusSpy = vi.spyOn(trigger, 'focus');

      document.body.appendChild(trigger);

      act(() => {
        result.current.mobileMenuTriggerRef.current = trigger;
        result.current.setMobileMenuOpen();
      });
      act(() => {
        result.current.requestMobileMenuClose('escape');
      });
      act(() => {
        vi.advanceTimersByTime(MOBILE_MENU_CLOSE_DURATION_MS);
      });

      expect(focusSpy).toHaveBeenCalledOnce();

      document.body.removeChild(trigger);
    });
  });
});
