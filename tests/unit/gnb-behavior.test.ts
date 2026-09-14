import {describe, expect, it} from 'vitest';

import {
  DESKTOP_SETTINGS_PILL_MIN_WIDTH,
  MOBILE_MENU_SCROLL_CANCEL_THRESHOLD_PX,
  shouldCancelOutsideCloseAsScroll,
  shouldOpenDesktopSettingsByHover,
  shouldUseHistoryBack
} from '../../src/features/gnb/behavior';

describe('gnb behavior contracts', () => {
  // 종전 제목은 「only on desktop width and hover-capable」였고 경계가 1024 였다. 폭이
  // 답하는 것은 「pill 이 거기 있는가」뿐이므로 경계는 pill 렌더 경계(768)와 같아야 하고,
  // 「hover 로 열리는가」는 입력이 답한다 — 제목을 그 계약으로 바꾼다(BQ-40).
  it('opens desktop settings by hover wherever the pill renders, gated by input capability', () => {
    expect(
      shouldOpenDesktopSettingsByHover({
        viewportWidth: DESKTOP_SETTINGS_PILL_MIN_WIDTH - 1,
        hoverCapable: true
      })
    ).toBe(false);

    expect(
      shouldOpenDesktopSettingsByHover({
        viewportWidth: DESKTOP_SETTINGS_PILL_MIN_WIDTH,
        hoverCapable: false
      })
    ).toBe(false);

    expect(
      shouldOpenDesktopSettingsByHover({
        viewportWidth: DESKTOP_SETTINGS_PILL_MIN_WIDTH,
        hoverCapable: true
      })
    ).toBe(true);

    // 회귀 앵커 — hover 가능한 1000px 창. 종전 경계(1024)에서는 pill 이 보이는데도 hover 가
    // 아무 일도 하지 않는 죽은 어포던스였다.
    expect(
      shouldOpenDesktopSettingsByHover({
        viewportWidth: 1000,
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

  it('respects an explicit thresholdPx override', () => {
    expect(
      shouldCancelOutsideCloseAsScroll({
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 5,
        thresholdPx: 4
      })
    ).toBe(true);

    expect(
      shouldCancelOutsideCloseAsScroll({
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 4,
        thresholdPx: 4
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
