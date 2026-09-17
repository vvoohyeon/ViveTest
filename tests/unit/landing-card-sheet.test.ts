// @vitest-environment jsdom

import React, {act} from 'react';
import type {Root} from 'react-dom/client';
import {createRoot} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {LandingCardSheet} from '../../src/features/landing/grid/landing-card-sheet';
import {getDefaultCardCopy} from '../../src/features/landing/grid/landing-card-contract';
import {resolveLandingCatalog, type LandingCard} from '../../src/features/variant-registry';
import {SHEET_EXIT_DURATION_MS} from '../../src/features/ui/sheet-motion';
import {resetBodyScrollLockForTest} from '../../src/features/ui/body-scroll-lock';

// 폰의 확장 표면은 시트가 갖는다(명세 규칙 3). 카드 계약 검사가 들고 있던 둘 — 확장 제목의
// 전문 muted 타이포와 닫기 컨트롤의 44×44 — 이 그 이동을 따라 여기로 왔다. 표면이 옮겨 갔다고
// 계약이 없어지는 것은 아니다.

type SheetProps = React.ComponentProps<typeof LandingCardSheet>;
type LandingTestCard = Extract<LandingCard, {type: 'test'}>;

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function testCard(variant = 'rhythm-b'): LandingTestCard {
  const card = resolveLandingCatalog('en').find((candidate) => candidate.variant === variant);
  if (!card || card.type !== 'test') {
    throw new Error(`Expected ${variant} as a test card fixture`);
  }
  return card;
}

function render(overrides: Partial<SheetProps> = {}): void {
  const props: SheetProps = {
    card: testCard(),
    locale: 'en',
    copy: getDefaultCardCopy(),
    open: true,
    reducedMotion: false,
    onCloseRequest: vi.fn(),
    onStateChange: vi.fn(),
    ...overrides
  };

  act(() => {
    root?.render(React.createElement(LandingCardSheet, props));
  });
}

function sheet(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-testid="landing-card-sheet"]');
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

describe('LandingCardSheet', () => {
  it('확장 제목은 전문 muted 타이포다 — 자르지 않는다', () => {
    const card = testCard();
    render({card});

    const title = sheet()?.querySelector('[data-slot="cardTitle"]');
    const className = title?.getAttribute('class') ?? '';

    expect(title?.textContent).toBe(card.title);
    expect(className).toContain('[font:var(--label)]'); // = 500 14px/1.4, 미러가 값을 고정한다
    expect(className).toContain('text-[var(--expanded-context-ink)]');
    expect(className).not.toContain('line-clamp');
    expect(className).not.toContain('truncate');
  });

  it('보이는 닫기 컨트롤이 44×44 다 — design.md 4.10 의 타깃 목록', () => {
    render();

    const closeClassName = sheet()?.querySelector('[data-slot="mobileClose"]')?.getAttribute('class') ?? '';

    expect(closeClassName).toContain('min-h-[var(--tap-min)]');
    expect(closeClassName).toContain('min-w-[var(--tap-min)]');
  });

  it('시트 제목이 다이얼로그의 접근 가능한 이름이다', () => {
    render();

    const labelledBy = sheet()?.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    // jsdom 에 `CSS.escape` 가 없다. `useId` 가 내는 값은 콜론을 포함하므로 선택자 대신 속성을 본다.
    const title = sheet()?.querySelector('[data-slot="cardTitle"]');
    expect(title?.getAttribute('id')).toBe(labelledBy);
  });

  it('확장 본문과 답변 선택지를 그린다', () => {
    render();

    expect(sheet()?.querySelector('[data-slot="expandedBody"]')).not.toBeNull();
    expect(sheet()?.querySelector('[data-slot="answerChoiceA"]')).not.toBeNull();
    expect(sheet()?.querySelector('[data-slot="answerChoiceB"]')).not.toBeNull();
  });

  it('닫히는 동안 본문을 붙든다 — 카드가 null 이 되어도 이탈이 보인다', () => {
    const card = testCard();
    render({card});
    render({card: null, open: false});

    expect(sheet()?.querySelector('[data-slot="cardTitle"]')?.textContent).toBe(card.title);

    act(() => {
      vi.advanceTimersByTime(SHEET_EXIT_DURATION_MS);
    });

    expect(sheet()).toBeNull();
  });

  it('위상을 상위로 알린다 — data-mobile-phase 의 값이 여기서 온다', () => {
    const onStateChange = vi.fn();
    const card = testCard();
    render({card, onStateChange});

    expect(onStateChange).toHaveBeenCalledWith({phase: 'OPENING', cardVariant: card.variant});

    render({card: null, open: false, onStateChange});
    act(() => {
      vi.advanceTimersByTime(SHEET_EXIT_DURATION_MS);
    });

    expect(onStateChange).toHaveBeenCalledWith({phase: 'CLOSING', cardVariant: card.variant});
    expect(onStateChange).toHaveBeenLastCalledWith({phase: 'NORMAL', cardVariant: null});
  });

  it('열린 적 없으면 아무것도 그리지 않는다', () => {
    render({card: null, open: false});
    expect(sheet()).toBeNull();
  });
});
