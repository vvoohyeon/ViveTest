import {describe, expect, it} from 'vitest';

import {
  DESKTOP_SETTINGS_HOVER_MIN_WIDTH,
  MOBILE_MENU_SCROLL_CANCEL_THRESHOLD_PX,
  shouldCancelOutsideCloseAsScroll,
  shouldOpenDesktopSettingsByHover,
  shouldUseHistoryBack
} from '../../src/features/landing/gnb/behavior';

describe('gnb behavior contracts', () => {
  it('enables desktop hover-open only on desktop width and hover-capable inputs', () => {
    expect(
      shouldOpenDesktopSettingsByHover({
        viewportWidth: DESKTOP_SETTINGS_HOVER_MIN_WIDTH - 1,
        hoverCapable: true
      })
    ).toBe(false);

    expect(
      shouldOpenDesktopSettingsByHover({
        viewportWidth: DESKTOP_SETTINGS_HOVER_MIN_WIDTH,
        hoverCapable: false
      })
    ).toBe(false);

    expect(
      shouldOpenDesktopSettingsByHover({
        viewportWidth: DESKTOP_SETTINGS_HOVER_MIN_WIDTH,
        hoverCapable: true
      })
    ).toBe(true);
  });

  it('cancels outside-close when a backdrop gesture turns into scroll movement', () => {
    expect(
      shouldCancelOutsideCloseAsScroll({
        startX: 0,
        startY: 0,
        endX: 0,
        endY: MOBILE_MENU_SCROLL_CANCEL_THRESHOLD_PX + 1
      })
    ).toBe(true);

    expect(
      shouldCancelOutsideCloseAsScroll({
        startX: 0,
        startY: 0,
        endX: MOBILE_MENU_SCROLL_CANCEL_THRESHOLD_PX - 1,
        endY: MOBILE_MENU_SCROLL_CANCEL_THRESHOLD_PX - 1
      })
    ).toBe(false);
  });

  it('uses history.back only when same-origin referrer exists', () => {
    expect(
      shouldUseHistoryBack({
        historyLength: 1,
        referrer: 'https://example.com/en/blog',
        currentOrigin: 'https://example.com'
      })
    ).toBe(false);

    expect(
      shouldUseHistoryBack({
        historyLength: 2,
        referrer: '',
        currentOrigin: 'https://example.com'
      })
    ).toBe(false);

    expect(
      shouldUseHistoryBack({
        historyLength: 2,
        referrer: 'https://another.example.com/en/blog',
        currentOrigin: 'https://example.com'
      })
    ).toBe(false);

    expect(
      shouldUseHistoryBack({
        historyLength: 2,
        referrer: 'https://example.com/en/blog',
        currentOrigin: 'https://example.com'
      })
    ).toBe(true);
  });
});
