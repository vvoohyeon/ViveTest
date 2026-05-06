// @vitest-environment jsdom
import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {MOBILE_TEST_BACK_FALLBACK_TIMEOUT_MS} from '../../src/features/gnb/behavior';
import {useGnbBackNavigation} from '../../src/features/gnb/hooks/use-gnb-back-navigation';
import {SESSION_STORAGE_KEYS} from '../../src/features/landing/storage/storage-keys';
import type {LocalizedRoutePath} from '../../src/i18n/localized-path';
import {makeRouter} from './__mocks__/router';

const HOME_HREF = '/en' as LocalizedRoutePath;

function setHistoryLength(length: number) {
  Object.defineProperty(window.history, 'length', {
    configurable: true,
    get: vi.fn(() => length)
  });
}

function setReferrer(referrer: string) {
  Object.defineProperty(document, 'referrer', {
    configurable: true,
    get: vi.fn(() => referrer)
  });
}

function makeProps(overrides?: Partial<{pathname: string}>) {
  return {
    pathname: overrides?.pathname ?? '/en/test/variant-a',
    homeHref: HOME_HREF,
    router: makeRouter()
  };
}

describe('useGnbBackNavigation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    window.history.replaceState({}, '', '/en/test/variant-a');
    vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    setHistoryLength(1);
    setReferrer('');
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    sessionStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  describe('handleStandardBack', () => {
    it('calls history.back when shouldUseHistoryBack is true', () => {
      setHistoryLength(2);
      setReferrer(window.location.origin + '/en');
      const props = makeProps();
      const {result} = renderHook(() => useGnbBackNavigation(props));

      act(() => {
        result.current.handleStandardBack();
      });

      expect(window.history.back).toHaveBeenCalledOnce();
      expect(props.router.push).not.toHaveBeenCalled();
    });

    it('calls router.push to homeHref when shouldUseHistoryBack is false', () => {
      const props = makeProps();
      const {result} = renderHook(() => useGnbBackNavigation(props));

      act(() => {
        result.current.handleStandardBack();
      });

      expect(props.router.push).toHaveBeenCalledWith(HOME_HREF, {scroll: false});
      expect(window.history.back).not.toHaveBeenCalled();
    });
  });

  describe('handleTestBack', () => {
    it('falls back to homeHref when no internal previous path exists', () => {
      setHistoryLength(2);
      const props = makeProps({pathname: '/en/test/variant-a'});
      const {result} = renderHook(() => useGnbBackNavigation(props));

      act(() => {
        result.current.handleTestBack();
      });

      expect(props.router.push).toHaveBeenCalledWith(HOME_HREF, {scroll: false});
      expect(window.history.back).not.toHaveBeenCalled();
    });

    it('calls history.back when internal previous path exists', () => {
      setHistoryLength(2);
      window.history.replaceState({}, '', '/en/blog');
      const props = makeProps();
      const {rerender, result} = renderHook(
        ({pathname}: {pathname: string}) => useGnbBackNavigation({...props, pathname}),
        {initialProps: {pathname: '/en/blog'}}
      );

      act(() => {
        window.history.pushState({}, '', '/en/test/variant-a');
        rerender({pathname: '/en/test/variant-a'});
      });
      act(() => {
        result.current.handleTestBack();
      });

      expect(window.history.back).toHaveBeenCalledOnce();
      expect(props.router.push).not.toHaveBeenCalled();
    });

    it('fires fallback router.push if location is unchanged after timeout', () => {
      setHistoryLength(2);
      window.history.replaceState({}, '', '/en/blog');
      const props = makeProps();
      const {rerender, result} = renderHook(
        ({pathname}: {pathname: string}) => useGnbBackNavigation({...props, pathname}),
        {initialProps: {pathname: '/en/blog'}}
      );

      act(() => {
        window.history.pushState({}, '', '/en/test/variant-a');
        rerender({pathname: '/en/test/variant-a'});
      });
      act(() => {
        result.current.handleTestBack();
      });
      expect(props.router.push).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(MOBILE_TEST_BACK_FALLBACK_TIMEOUT_MS);
      });

      expect(props.router.push).toHaveBeenCalledWith(HOME_HREF, {scroll: false});
    });

    it('does not fire fallback router.push when location changes before timeout', () => {
      setHistoryLength(2);
      vi.mocked(window.history.back).mockImplementation(() => {
        window.history.replaceState({}, '', '/en/blog');
      });
      window.history.replaceState({}, '', '/en/blog');
      const props = makeProps();
      const {rerender, result} = renderHook(
        ({pathname}: {pathname: string}) => useGnbBackNavigation({...props, pathname}),
        {initialProps: {pathname: '/en/blog'}}
      );

      act(() => {
        window.history.pushState({}, '', '/en/test/variant-a');
        rerender({pathname: '/en/test/variant-a'});
      });
      act(() => {
        result.current.handleTestBack();
      });
      act(() => {
        vi.advanceTimersByTime(MOBILE_TEST_BACK_FALLBACK_TIMEOUT_MS);
      });

      expect(window.history.back).toHaveBeenCalledOnce();
      expect(props.router.push).not.toHaveBeenCalled();
    });
  });

  describe('sessionStorage behavior', () => {
    it('does not throw and falls back when sessionStorage is unavailable', () => {
      const originalSessionStorage = window.sessionStorage;
      Object.defineProperty(window, 'sessionStorage', {
        configurable: true,
        get: vi.fn(() => {
          throw new Error('SecurityError');
        })
      });
      const props = makeProps();

      try {
        const {result} = renderHook(() => useGnbBackNavigation(props));

        act(() => {
          result.current.handleTestBack();
        });

        expect(props.router.push).toHaveBeenCalledWith(HOME_HREF, {scroll: false});
      } finally {
        Object.defineProperty(window, 'sessionStorage', {
          configurable: true,
          get: () => originalSessionStorage
        });
      }
    });

    it('tracks previous and current paths when pathname changes', () => {
      const props = makeProps();
      const {rerender} = renderHook(
        ({pathname}: {pathname: string}) => useGnbBackNavigation({...props, pathname}),
        {initialProps: {pathname: '/en/blog'}}
      );

      act(() => {
        rerender({pathname: '/en/test/variant-a'});
      });

      expect(sessionStorage.getItem(SESSION_STORAGE_KEYS.PREVIOUS_PATH)).toBe('/en/blog');
      expect(sessionStorage.getItem(SESSION_STORAGE_KEYS.CURRENT_PATH)).toBe('/en/test/variant-a');
    });
  });
});
