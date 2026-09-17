// @vitest-environment jsdom

import React, {act} from 'react';
import type {Root} from 'react-dom/client';
import {createRoot} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {InstructionOverlay} from '../../src/features/test/instruction-overlay';
import type {QualifierOverlayItem} from '../../src/features/test/qualifier-overlay-model';
import {resetBodyScrollLockForTest} from '../../src/features/ui/body-scroll-lock';
import {SHEET_EXIT_DURATION_MS} from '../../src/features/ui/sheet-motion';

// **형태만 바뀌고 행동은 한 비트도 바뀌지 않는다**(step 3 §1-2). 행동을 보는 검사 넷은 수정 없이
// 초록이어야 하므로 여기서는 형태만 본다 — 시트인가, 모달의 셋(grabber 없음 · 제스처 닫기 없음 ·
// history 항목 없음)을 지키는가, 액션 행이 세로 스택이고 primary 가 맨 아래인가.

type OverlayProps = React.ComponentProps<typeof InstructionOverlay>;

let root: Root | null = null;
let host: HTMLDivElement | null = null;

const qualifierItem: QualifierOverlayItem = {
  canonicalIndex: 1,
  questionText: 'My sexual identity is',
  choices: [
    {token: 'M', label: 'Male'},
    {token: 'F', label: 'Female'}
  ]
};

function mockViewport(isMobile: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      media: query,
      matches: isMobile && query.includes('max-width'),
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
      addListener: () => {},
      removeListener: () => {}
    })
  });
}

function render(overrides: Partial<OverlayProps> = {}): void {
  const props: OverlayProps = {
    visible: true,
    title: 'Instruction title',
    instructionText: 'Read this carefully.',
    consentNote: 'Consent note copy.',
    showDivider: true,
    primaryLabel: 'Accept all and start',
    secondaryLabel: 'Deny and abandon',
    onPrimaryAction: vi.fn(),
    onSecondaryAction: vi.fn(),
    ...overrides
  };

  act(() => {
    root?.render(React.createElement(InstructionOverlay, props));
  });
}

function sheet(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-slot="sheet"]');
}

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {configurable: true, value: true});
  mockViewport(true);
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

describe('instruction — 폰에서는 모달 바텀시트다', () => {
  it('시트 프리미티브 위에 서고 모달 의미론을 유지한다', () => {
    render();

    const node = sheet();
    expect(node).not.toBeNull();
    expect(node?.getAttribute('data-testid')).toBe('test-instruction-overlay');
    expect(node?.getAttribute('role')).toBe('dialog');
    expect(node?.getAttribute('aria-modal')).toBe('true');
    expect(node?.getAttribute('aria-labelledby')).toBeTruthy();
  });

  it('모달이므로 grabber 도 숨은 닫기도 두지 않는다 — 둘 다 닫을 수 있다는 약속이다', () => {
    render();

    expect(document.querySelector('[data-slot="sheetGrabber"]')).toBeNull();
    expect(document.querySelector('[data-slot="sheetHiddenClose"]')).toBeNull();
  });

  it('backdrop 탭이 닫지 않는다 — 선택을 강제한다', () => {
    render();

    act(() => {
      document.querySelector<HTMLElement>('[data-slot="sheetScrim"]')?.click();
    });

    expect(sheet(), '모달 시트는 빈 곳 탭으로 닫히지 않는다').not.toBeNull();
  });

  it('Escape 는 instruction step 에서 아무것도 하지 않는다 (BQ-41)', () => {
    const onPrimaryAction = vi.fn();
    const onSecondaryAction = vi.fn();
    render({onPrimaryAction, onSecondaryAction});

    act(() => {
      sheet()?.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    });

    expect(onPrimaryAction).not.toHaveBeenCalled();
    expect(onSecondaryAction, 'Esc 가 secondary CTA 의 별칭이면 안 된다').not.toHaveBeenCalled();
    expect(sheet()).not.toBeNull();
  });

  it('Escape 는 qualifier step 에서만 Back/Cancel 과 같다', () => {
    const onBack = vi.fn();
    render({
      qualifierStep: {
        item: qualifierItem,
        selectedToken: null,
        onSelect: vi.fn(),
        onBack,
        continueLabel: 'Next',
        continueDisabled: true,
        showBack: true,
        backLabel: 'Back'
      }
    });

    act(() => {
      sheet()?.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    });

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('액션 행은 시트 하단에 고정되고 primary 가 맨 아래다 — 엄지가 닿는 자리', () => {
    render();

    const actionRow = document.querySelector('[data-slot="instructionActions"]');
    expect(actionRow?.parentElement?.getAttribute('data-slot')).toBe('sheetActionRow');

    const buttons = Array.from(actionRow?.querySelectorAll('button') ?? []);
    expect(buttons).toHaveLength(2);
    expect(buttons[0]?.textContent).toBe('Deny and abandon');
    expect(buttons[1]?.textContent, 'primary 는 맨 아래다').toBe('Accept all and start');
    // 가로로 나열하지 않는다 — 12 locale 중 8 개에서 접혔다(명세 §2-3).
    expect(actionRow?.getAttribute('class')).toContain('grid');
  });

  it('본문만 스크롤하고 제목·본문·구분선·동의 노트가 그 안에 있다', () => {
    render();

    const body = document.querySelector('[data-slot="sheetBody"]');
    expect(body?.querySelector('[data-testid="test-instruction-body"]')).not.toBeNull();
    expect(body?.querySelector('[data-testid="test-instruction-divider"]')).not.toBeNull();
    expect(body?.querySelector('[data-testid="test-instruction-note"]')).not.toBeNull();
  });

  it('닫으면 이탈 뒤에 사라진다 — 곧바로 언마운트하지 않는다', () => {
    render();
    render({visible: false});

    expect(sheet(), '이탈 중에는 트리에 남는다').not.toBeNull();
    expect(sheet()?.getAttribute('data-state')).toBe('closing');

    act(() => {
      vi.advanceTimersByTime(SHEET_EXIT_DURATION_MS);
    });

    expect(sheet()).toBeNull();
  });
});

describe('instruction — 다 열 레이아웃에서는 중앙 다이얼로그 그대로다', () => {
  beforeEach(() => {
    mockViewport(false);
  });

  it('시트가 아니라 다이얼로그를 그리고, 보이지 않으면 아무것도 그리지 않는다', () => {
    render();

    expect(document.querySelector('[data-slot="sheet"]')).toBeNull();
    expect(document.querySelector('[data-testid="test-instruction-overlay"]')).not.toBeNull();
    expect(document.querySelector('.test-instruction-card')).not.toBeNull();

    render({visible: false});
    expect(document.querySelector('[data-testid="test-instruction-overlay"]')).toBeNull();
  });
});
