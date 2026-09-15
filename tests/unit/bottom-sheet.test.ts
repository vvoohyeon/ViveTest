// @vitest-environment jsdom

import React, {act} from 'react';
import type {Root} from 'react-dom/client';
import {createRoot} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {BottomSheet} from '../../src/features/ui/bottom-sheet';
import {bodyScrollLockHolders, resetBodyScrollLockForTest} from '../../src/features/ui/body-scroll-lock';
import {
  SHEET_ENTER_DURATION_MS,
  SHEET_EXIT_DURATION_MS
} from '../../src/features/ui/sheet-motion';
import {
  initialSheetPhase,
  isSheetInteractive,
  isSheetMounted,
  nextSheetPhase
} from '../../src/features/ui/sheet-phase';
import {shouldCloseOnSwipeRelease} from '../../src/features/ui/use-sheet-swipe';

type SheetProps = React.ComponentProps<typeof BottomSheet>;

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function baseProps(overrides: Partial<SheetProps> = {}): SheetProps {
  return {
    open: true,
    layerId: 'card-sheet',
    titleId: 'sheet-title',
    onCloseRequest: vi.fn(),
    closeLabel: '닫기',
    testId: 'card-sheet',
    children: React.createElement(
      'div',
      null,
      React.createElement('h2', {id: 'sheet-title'}, '제목'),
      React.createElement('button', {type: 'button'}, 'A'),
      React.createElement('button', {type: 'button'}, 'B')
    ),
    ...overrides
  };
}

function render(props: SheetProps): void {
  act(() => {
    root?.render(React.createElement(BottomSheet, props));
  });
}

function sheet(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-slot="sheet"]');
}

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {configurable: true, value: true});
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  host?.remove();
  host = null;
  resetBodyScrollLockForTest();
  vi.useRealTimers();
  Reflect.deleteProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT');
});

describe('시트 단계 — 이탈은 렌더 중에 판정된다', () => {
  it('열려 있던 시트가 닫히면 closing 을 거치고 곧바로 사라지지 않는다', () => {
    expect(nextSheetPhase({phase: 'open', open: false, skipEnterMotion: false})).toBe('closing');
    expect(isSheetMounted('closing'), 'closing 동안 트리에 남아야 이탈이 보인다').toBe(true);
    expect(isSheetInteractive('closing'), '닫히는 동안에는 상호작용하지 않는다').toBe(false);
  });

  it('닫혀 있던 시트에 닫힘을 다시 요청해도 이탈 모션이 생기지 않는다', () => {
    expect(nextSheetPhase({phase: 'closed', open: false, skipEnterMotion: false})).toBe('closed');
  });

  it('랜딩 진입은 첫 페인트에 이미 열려 있다 — 진입 모션을 거치지 않는다', () => {
    expect(initialSheetPhase({open: true, skipEnterMotion: true})).toBe('open');
    expect(initialSheetPhase({open: true, skipEnterMotion: false})).toBe('entering');
  });
});

describe('BottomSheet', () => {
  it('열리면 스크림과 시트를 body 로 포탈하고 모달 의미론을 갖는다', () => {
    render(baseProps());

    const node = sheet();
    expect(node).not.toBeNull();
    expect(node?.getAttribute('role')).toBe('dialog');
    expect(node?.getAttribute('aria-modal')).toBe('true');
    expect(node?.getAttribute('aria-labelledby')).toBe('sheet-title');
    expect(node?.parentElement?.parentElement).toBe(document.body);
    expect(document.querySelector('[data-slot="sheetScrim"]')).not.toBeNull();
  });

  it('열린 동안 body 스크롤을 잠그고 닫히면 푼다', () => {
    render(baseProps());
    expect(bodyScrollLockHolders()).toContain('card-sheet');

    render(baseProps({open: false}));
    act(() => {
      vi.advanceTimersByTime(SHEET_EXIT_DURATION_MS);
    });

    expect(bodyScrollLockHolders()).not.toContain('card-sheet');
  });

  it('열린 동안 시트 밖 body 자식이 inert 다 — 배너까지 닿지 않는다', () => {
    const banner = document.createElement('div');
    banner.id = 'consent-banner';
    document.body.appendChild(banner);

    render(baseProps());
    expect(banner.hasAttribute('inert'), '아래 층은 보이되 닿지 않는다').toBe(true);

    render(baseProps({open: false}));
    act(() => {
      vi.advanceTimersByTime(SHEET_EXIT_DURATION_MS);
    });
    expect(banner.hasAttribute('inert')).toBe(false);

    banner.remove();
  });

  it('포커스는 첫 컨트롤이 아니라 시트 컨테이너로 들어온다', () => {
    render(baseProps());
    act(() => {
      vi.advanceTimersByTime(SHEET_ENTER_DURATION_MS);
    });

    expect(document.activeElement).toBe(sheet());
  });

  it('닫히면 포커스가 트리거로 돌아간다', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();

    render(baseProps());
    render(baseProps({open: false}));
    act(() => {
      vi.advanceTimersByTime(SHEET_EXIT_DURATION_MS);
    });

    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('Escape 는 닫힘을 **요청**할 뿐 스스로 닫지 않는다 — instruction 시트의 no-op 이 여기 선다', () => {
    const onCloseRequest = vi.fn();
    render(baseProps({onCloseRequest}));

    act(() => {
      sheet()?.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    });

    expect(onCloseRequest).toHaveBeenCalledWith('escape');
    expect(sheet(), '소비자가 open 을 바꾸지 않았으면 시트는 그대로다').not.toBeNull();
  });

  it('grabber·제스처 닫기·history 항목 셋만 모달 시트와 다르다', () => {
    const onCloseRequest = vi.fn();
    render(baseProps({grabber: false, dismissible: false, historyEntry: false, onCloseRequest}));

    expect(document.querySelector('[data-slot="sheetGrabber"]')).toBeNull();

    act(() => {
      document.querySelector<HTMLElement>('[data-slot="sheetScrim"]')?.click();
    });
    expect(onCloseRequest, 'backdrop 탭은 모달 시트를 닫지 않는다').not.toHaveBeenCalled();
  });

  it('제스처 닫기가 켜진 시트는 backdrop 탭으로 닫힘을 요청한다', () => {
    const onCloseRequest = vi.fn();
    render(baseProps({onCloseRequest}));

    act(() => {
      document.querySelector<HTMLElement>('[data-slot="sheetScrim"]')?.click();
    });

    expect(onCloseRequest).toHaveBeenCalledWith('backdrop');
  });

  it('숨긴 닫기 버튼이 마지막 탭 스톱이다 — 보조기술은 빈 곳을 탭할 수 없다', () => {
    render(baseProps());

    const focusable = Array.from(
      sheet()?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? []
    );
    expect(focusable.at(-1)?.dataset.slot).toBe('sheetHiddenClose');
    expect(focusable.at(-1)?.textContent).toBe('닫기');
  });
});

describe('스와이프 판정', () => {
  it('이동량이 시트 높이의 30% 이상이면 닫힌다', () => {
    expect(shouldCloseOnSwipeRelease({offsetPx: 120, sheetHeightPx: 400, velocityPxPerMs: 0})).toBe(true);
    expect(shouldCloseOnSwipeRelease({offsetPx: 119, sheetHeightPx: 400, velocityPxPerMs: 0})).toBe(false);
  });

  it('속도가 0.5px/ms 이상이면 이동량이 적어도 닫힌다', () => {
    expect(shouldCloseOnSwipeRelease({offsetPx: 20, sheetHeightPx: 400, velocityPxPerMs: 0.5})).toBe(true);
    expect(shouldCloseOnSwipeRelease({offsetPx: 20, sheetHeightPx: 400, velocityPxPerMs: 0.49})).toBe(false);
  });

  it('위로 끄는 것은 닫기가 아니다', () => {
    expect(shouldCloseOnSwipeRelease({offsetPx: -200, sheetHeightPx: 400, velocityPxPerMs: -2})).toBe(false);
  });
});
