// @vitest-environment jsdom

import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

import {act, cleanup, renderHook} from '@testing-library/react';
import type {
  FocusEvent as ReactFocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  RefObject
} from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {
  DESKTOP_COLLAPSE_DELAY_MS,
  DESKTOP_EXPAND_DELAY_MS
} from '../../src/features/landing/grid/hover-intent';
import type {LandingCardViewportTier} from '../../src/features/landing/grid/landing-grid-card';
import {MOBILE_EXPANDED_DURATION_MS} from '../../src/features/landing/grid/mobile-lifecycle';
import {useLandingInteractionController} from '../../src/features/landing/grid/use-landing-interaction-controller';
import {resolveLandingCatalog, type LandingCard} from '../../src/features/variant-registry';

// F3 — 컨트롤러 시퀀스 지문 (step 1 §5-2).
//
// F1 은 리듀서만, F2 는 한 장의 마크업만 본다. 그 둘이 못 보는 것이 「여러 훅이 한 시퀀스 안에서
// 주고받는 상태」이고, C1(데스크톱 닫기 컨트롤러)·H1(스크롤 hold) 분리가 깨뜨릴 수 있는 것이
// 정확히 거기 있다. 그래서 시나리오를 스텝 단위로 재생하며 매 스텝의 컨트롤러 표면을 직렬화한다.
//
// 핸들러 prop 은 **값이 아니라 안정성**으로 기록한다 — `resolveCardInteractionBindings` 가
// 리렌더 사이에 같은 참조를 유지하는 것이 계약이기 때문이다(`landing-interaction-controller-handlers.test.ts`
// 의 'keeps card handler identities stable while controller state is unchanged'). 매 스텝마다
// 직전 스텝의 같은 카드·같은 키와 `Object.is` 로 비교해 initial/same/new 를 남긴다.
//
// `performance.now` 는 직접 통제한다. 페이크 타이머가 그것을 대신 잡아 주는지에 지문을
// 의존시키면, 지문이 저장소가 아니라 테스트 러너의 판본을 재는 장치가 된다.

// jsdom 환경의 전역 `URL` 은 문서 base(http://localhost:3000)에 대해 상대 경로를 푼다 —
// `new URL(..., import.meta.url)` 이 파일 경로를 내주지 않으므로 디렉터리에서 직접 만든다.
const FIXTURE_PATH = join(import.meta.dirname, '../fixtures/landing-controller-sequence-fingerprint.json');

interface ControllerHookProps {
  cards: LandingCard[];
  viewportWidth: number;
  viewportTier: LandingCardViewportTier;
  shellRef: RefObject<HTMLElement | null>;
  onAnswerChoiceSelect?: (card: LandingCard, choice: 'A' | 'B') => boolean | void;
  onPrimaryCtaSelect?: (card: LandingCard) => boolean | void;
}

function createMatchMediaResult(query: string, hoverCapability: boolean): MediaQueryList {
  return {
    matches: query.includes('(hover: hover)') ? hoverCapability : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn()
  } as unknown as MediaQueryList;
}

const clock = {now: 1_000};

function installBrowserStubs(hoverCapability: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => createMatchMediaResult(query, hoverCapability));
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    return window.setTimeout(() => callback(clock.now), 0);
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id));
  vi.spyOn(window.performance, 'now').mockImplementation(() => clock.now);
}

function selectCards() {
  const catalog = resolveLandingCatalog('en', {audience: 'qa'});
  const testCard = catalog.find((card) => card.variant === 'qmbti');
  const secondTestCard = catalog.find((card) => card.variant === 'rhythm-b');
  const blogCard = catalog.find((card) => card.variant === 'ops-handbook');
  const unavailableCard = catalog.find((card) => card.availability !== 'available');

  if (!testCard || !secondTestCard || !blogCard || !unavailableCard) {
    throw new Error('Expected qmbti / rhythm-b / ops-handbook / unavailable catalog fixtures.');
  }

  return {testCard, secondTestCard, blogCard, unavailableCard};
}

function mountShell(cards: readonly LandingCard[]) {
  const shell = document.createElement('section');
  shell.dataset.testid = 'landing-grid-shell';
  shell.innerHTML = cards
    .map(
      (card) => `
        <article data-testid="landing-grid-card" data-card-variant="${card.variant}">
          <button type="button" data-testid="landing-grid-card-trigger">
            <span data-slot="cardTitle">${card.title}</span>
          </button>
          <section data-slot="expandedBody">
            <button type="button" data-slot="answerChoiceA">A</button>
            <button type="button" data-slot="answerChoiceB">B</button>
            <a href="/en/blog/${card.variant}" data-slot="primaryCTA">Read more</a>
            <button type="button" data-slot="mobileClose">Close</button>
          </section>
        </article>
      `
    )
    .join('');
  document.body.append(shell);
  return shell;
}

function findCardChild<T extends HTMLElement>(shell: HTMLElement, variant: string, selector: string): T {
  const element = shell.querySelector<T>(`[data-card-variant="${variant}"] ${selector}`);
  if (!element) {
    throw new Error(`Missing test element for ${variant}: ${selector}`);
  }
  return element;
}

function findCardRoot(shell: HTMLElement, variant: string): HTMLElement {
  const element = shell.querySelector<HTMLElement>(
    `[data-testid="landing-grid-card"][data-card-variant="${variant}"]`
  );
  if (!element) {
    throw new Error(`Missing test card root for ${variant}`);
  }
  return element;
}

function createMouseEvent<T extends HTMLElement>(
  currentTarget: T,
  init: {clientX?: number; clientY?: number; button?: number; metaKey?: boolean} = {}
) {
  return {
    currentTarget,
    target: currentTarget,
    clientX: init.clientX ?? Number.NaN,
    clientY: init.clientY ?? Number.NaN,
    button: init.button ?? 0,
    altKey: false,
    ctrlKey: false,
    metaKey: init.metaKey ?? false,
    shiftKey: false,
    timeStamp: clock.now,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn()
  } as unknown as ReactMouseEvent<T>;
}

function createKeyboardEvent<T extends HTMLElement>(currentTarget: T, key: string, target: HTMLElement = currentTarget) {
  return {
    currentTarget,
    target,
    key,
    shiftKey: false,
    timeStamp: clock.now,
    defaultPrevented: false,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn()
  } as unknown as ReactKeyboardEvent<T>;
}

function createFocusEvent<T extends HTMLElement>(
  currentTarget: T,
  options: {target?: HTMLElement; relatedTarget?: EventTarget | null} = {}
) {
  return {
    currentTarget,
    target: options.target ?? currentTarget,
    relatedTarget: options.relatedTarget ?? null,
    timeStamp: clock.now
  } as unknown as ReactFocusEvent<T>;
}

interface StubRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

function stubBoundaryRect(shell: HTMLElement, variant: string, rect: StubRect) {
  const boundary = findCardChild<HTMLElement>(shell, variant, '[data-slot="expandedBody"]');
  boundary.getBoundingClientRect = () =>
    ({
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
      x: rect.left,
      y: rect.top,
      width: rect.right - rect.left,
      height: rect.bottom - rect.top,
      toJSON: () => ({})
    }) as DOMRect;
}

type ControllerResult = ReturnType<typeof useLandingInteractionController>;

interface SequenceContext {
  cards: LandingCard[];
  shell: HTMLElement;
  result: {current: ControllerResult};
  bind: (card: LandingCard) => ReturnType<ControllerResult['resolveCardInteractionBindings']>;
  trigger: (card: LandingCard) => HTMLElement;
  root: (card: LandingCard) => HTMLElement;
  child: (card: LandingCard, selector: string) => HTMLElement;
  advance: (ms: number) => void;
  pointerMove: (target: HTMLElement, position: {clientX: number; clientY: number}) => void;
  scroll: () => void;
  stubRect: (card: LandingCard, rect: StubRect) => void;
  snap: (name: string) => void;
}

interface SequenceDefinition {
  name: string;
  hoverCapability: boolean;
  viewportWidth: number;
  viewportTier: LandingCardViewportTier;
  cards: (fixtures: ReturnType<typeof selectCards>) => LandingCard[];
  onAnswerChoiceSelect?: (card: LandingCard, choice: 'A' | 'B') => boolean | void;
  onPrimaryCtaSelect?: (card: LandingCard) => boolean | void;
  steps: (ctx: SequenceContext) => void;
}

const HANDLER_KEYS = [
  'onCardKeyDown',
  'onCardBlur',
  'onFocus',
  'onKeyDown',
  'onClick',
  'onMouseEnter',
  'onMouseLeave',
  'onExpandedBodyKeyDown',
  'onAnswerChoiceSelect',
  'onMobileClose'
] as const;

function canonicalize(value: unknown): string {
  if (typeof value === 'function') {
    return '"[fn]"';
  }
  if (value === undefined) {
    return '"[undefined]"';
  }
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${canonicalize(entryValue)}`);

  return `{${entries.join(',')}}`;
}

function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

function runSequence(definition: SequenceDefinition): string[] {
  const fixtures = selectCards();
  const cards = definition.cards(fixtures);
  const shell = mountShell(cards);
  const lines: string[] = [];
  const previousHandlers = new Map<string, Record<string, unknown>>();
  let stepIndex = 0;

  const {result} = renderHook(
    (props: ControllerHookProps) =>
      useLandingInteractionController({
        cards: props.cards,
        viewportWidth: props.viewportWidth,
        viewportTier: props.viewportTier,
        shellRef: props.shellRef,
        onAnswerChoiceSelect: props.onAnswerChoiceSelect,
        onPrimaryCtaSelect: props.onPrimaryCtaSelect
      }),
    {
      initialProps: {
        cards,
        viewportWidth: definition.viewportWidth,
        viewportTier: definition.viewportTier,
        shellRef: {current: shell},
        onAnswerChoiceSelect: definition.onAnswerChoiceSelect,
        onPrimaryCtaSelect: definition.onPrimaryCtaSelect
      }
    }
  );

  const snap = (name: string) => {
    const controller = result.current;
    const cardRecords = cards.map((card) => {
      const bindings = controller.resolveCardInteractionBindings(card) as unknown as Record<string, unknown>;
      const previous = previousHandlers.get(card.variant);
      const stability: Record<string, string> = {};
      const handlers: Record<string, unknown> = {};

      for (const key of HANDLER_KEYS) {
        const current = bindings[key];
        handlers[key] = current;
        if (typeof current !== 'function') {
          stability[key] = 'absent';
        } else if (!previous) {
          stability[key] = 'initial';
        } else {
          stability[key] = Object.is(previous[key], current) ? 'same' : 'new';
        }
      }

      previousHandlers.set(card.variant, handlers);

      const values: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(bindings)) {
        if (typeof value === 'function') {
          continue;
        }
        values[key] = value;
      }

      return {variant: card.variant, values, stability};
    });

    const snapshot = {
      interactionMode: controller.interactionMode,
      interactionState: controller.interactionState,
      prefersReducedMotion: controller.prefersReducedMotion,
      mobileLifecycleState: controller.mobileLifecycleState,
      mobileBackdropBindings: controller.mobileBackdropBindings,
      activeVisualCardVariant: controller.activeVisualCardVariant,
      mobileRestoreReadyVariant: controller.mobileRestoreReadyVariant,
      cards: cardRecords
    };

    stepIndex += 1;
    lines.push(`${definition.name}\t${String(stepIndex).padStart(3, '0')}\t${name}\t${sha256(canonicalize(snapshot))}`);
  };

  const ctx: SequenceContext = {
    cards,
    shell,
    result,
    bind: (card) => result.current.resolveCardInteractionBindings(card),
    trigger: (card) => findCardChild(shell, card.variant, '[data-testid="landing-grid-card-trigger"]'),
    root: (card) => findCardRoot(shell, card.variant),
    child: (card, selector) => findCardChild(shell, card.variant, selector),
    advance: (ms) => {
      act(() => {
        clock.now += ms;
        vi.advanceTimersByTime(ms);
      });
    },
    pointerMove: (target, position) => {
      act(() => {
        target.dispatchEvent(new MouseEvent('pointermove', {bubbles: true, ...position}));
      });
    },
    scroll: () => {
      act(() => {
        window.dispatchEvent(new Event('scroll'));
      });
    },
    stubRect: (card, rect) => stubBoundaryRect(shell, card.variant, rect),
    snap
  };

  snap('mount');
  definition.steps(ctx);

  return lines;
}

const CARD_RECT_BEFORE_SCROLL: StubRect = {top: 380, bottom: 700, left: 200, right: 500};
const CARD_RECT_AFTER_SCROLL: StubRect = {top: 80, bottom: 400, left: 200, right: 500};
const CARD_RECT_ABOVE_VIEWPORT: StubRect = {top: -500, bottom: -200, left: 200, right: 500};
const POINTER_INSIDE_BEFORE_SCROLL = {clientX: 298, clientY: 436};
const POINTER_OUTSIDE = {clientX: 40, clientY: 40};

const DESKTOP = {viewportWidth: 1280, viewportTier: 'desktop' as const, hoverCapability: true};
const MOBILE = {viewportWidth: 390, viewportTier: 'mobile' as const, hoverCapability: false};
const DESKTOP_TAP = {viewportWidth: 1280, viewportTier: 'desktop' as const, hoverCapability: false};

const SEQUENCES: SequenceDefinition[] = [
  {
    name: 'desktop/hover-expand-then-leave-collapse',
    ...DESKTOP,
    cards: ({testCard}) => [testCard],
    steps: ({bind, cards, root, advance, snap}) => {
      const [card] = cards;
      act(() => bind(card).onMouseEnter(createMouseEvent(root(card))));
      snap('hover-enter');
      advance(DESKTOP_EXPAND_DELAY_MS + 1);
      snap('expand-settled');
      act(() => bind(card).onMouseLeave(createMouseEvent(root(card))));
      snap('hover-leave');
      advance(DESKTOP_COLLAPSE_DELAY_MS + 1);
      snap('collapse-settled');
    }
  },
  {
    name: 'desktop/hover-cancelled-before-delay',
    ...DESKTOP,
    cards: ({testCard}) => [testCard],
    steps: ({bind, cards, root, advance, snap}) => {
      const [card] = cards;
      act(() => bind(card).onMouseEnter(createMouseEvent(root(card))));
      advance(Math.max(1, DESKTOP_EXPAND_DELAY_MS - 10));
      snap('before-delay');
      act(() => bind(card).onMouseLeave(createMouseEvent(root(card))));
      advance(DESKTOP_EXPAND_DELAY_MS + DESKTOP_COLLAPSE_DELAY_MS + 2);
      snap('cancelled');
    }
  },
  {
    name: 'desktop/hover-handoff-between-cards',
    ...DESKTOP,
    cards: ({testCard, secondTestCard}) => [testCard, secondTestCard],
    steps: ({bind, cards, root, advance, snap}) => {
      const [first, second] = cards;
      act(() => bind(first).onMouseEnter(createMouseEvent(root(first))));
      advance(DESKTOP_EXPAND_DELAY_MS + 1);
      snap('first-expanded');
      act(() => bind(first).onMouseLeave(createMouseEvent(root(first))));
      act(() => bind(second).onMouseEnter(createMouseEvent(root(second))));
      snap('handoff-queued');
      advance(DESKTOP_EXPAND_DELAY_MS + DESKTOP_COLLAPSE_DELAY_MS + 2);
      snap('handoff-settled');
    }
  },
  {
    name: 'desktop/keyboard-focus-expands-test',
    ...DESKTOP,
    cards: ({testCard}) => [testCard],
    steps: ({bind, cards, trigger, snap}) => {
      const [card] = cards;
      act(() => bind(card).onFocus(createFocusEvent(trigger(card))));
      snap('focus');
    }
  },
  {
    name: 'desktop/keyboard-enter-and-space-idempotent',
    ...DESKTOP,
    cards: ({testCard}) => [testCard],
    steps: ({bind, cards, trigger, snap}) => {
      const [card] = cards;
      act(() => bind(card).onFocus(createFocusEvent(trigger(card))));
      snap('focus');
      act(() => bind(card).onKeyDown(createKeyboardEvent(trigger(card), 'Enter')));
      snap('enter');
      act(() => bind(card).onKeyDown(createKeyboardEvent(trigger(card), ' ')));
      snap('space');
      act(() => bind(card).onKeyDown(createKeyboardEvent(trigger(card), 'Enter')));
      snap('enter-again');
    }
  },
  {
    name: 'desktop/keyboard-escape-from-trigger',
    ...DESKTOP,
    cards: ({testCard}) => [testCard],
    steps: ({bind, cards, trigger, root, snap}) => {
      const [card] = cards;
      act(() => bind(card).onFocus(createFocusEvent(trigger(card))));
      act(() => bind(card).onKeyDown(createKeyboardEvent(trigger(card), 'Enter')));
      snap('expanded');
      act(() => bind(card).onCardKeyDown(createKeyboardEvent(root(card), 'Escape', trigger(card))));
      snap('escape');
    }
  },
  {
    name: 'desktop/keyboard-escape-from-expanded-body',
    ...DESKTOP,
    cards: ({testCard}) => [testCard],
    steps: ({bind, cards, trigger, child, snap}) => {
      const [card] = cards;
      act(() => bind(card).onFocus(createFocusEvent(trigger(card))));
      act(() => bind(card).onKeyDown(createKeyboardEvent(trigger(card), 'Enter')));
      snap('expanded');
      const choice = child(card, '[data-slot="answerChoiceA"]');
      act(() => bind(card).onExpandedBodyKeyDown(createKeyboardEvent(choice, 'Escape')));
      snap('escape-from-choice');
    }
  },
  {
    name: 'desktop/blur-true-focus-exit',
    ...DESKTOP,
    cards: ({testCard}) => [testCard],
    steps: ({bind, cards, trigger, root, snap}) => {
      const [card] = cards;
      act(() => bind(card).onFocus(createFocusEvent(trigger(card))));
      snap('focused');
      act(() =>
        bind(card).onCardBlur(
          createFocusEvent(root(card), {target: trigger(card), relatedTarget: document.body})
        )
      );
      snap('blur-exit');
    }
  },
  {
    name: 'desktop/blur-window-null-related-target',
    ...DESKTOP,
    cards: ({testCard}) => [testCard],
    steps: ({bind, cards, trigger, root, snap}) => {
      const [card] = cards;
      act(() => bind(card).onFocus(createFocusEvent(trigger(card))));
      snap('focused');
      act(() =>
        bind(card).onCardBlur(createFocusEvent(root(card), {target: trigger(card), relatedTarget: null}))
      );
      snap('window-blur');
    }
  },
  {
    name: 'desktop/focus-blog-is-focus-only',
    ...DESKTOP,
    cards: ({testCard, blogCard}) => [testCard, blogCard],
    steps: ({bind, cards, trigger, snap}) => {
      const [test, blog] = cards;
      act(() => bind(test).onFocus(createFocusEvent(trigger(test))));
      snap('test-focused');
      act(() => bind(blog).onFocus(createFocusEvent(trigger(blog))));
      snap('blog-focused');
    }
  },
  {
    name: 'desktop/focus-unavailable-card',
    ...DESKTOP,
    cards: ({testCard, unavailableCard}) => [testCard, unavailableCard],
    steps: ({bind, cards, trigger, snap}) => {
      const [test, unavailable] = cards;
      act(() => bind(unavailable).onFocus(createFocusEvent(trigger(unavailable))));
      snap('unavailable-focused');
      act(() => bind(test).onFocus(createFocusEvent(trigger(test))));
      snap('test-focused');
    }
  },
  {
    name: 'desktop/answer-choice-callback-vetoes-transition',
    ...DESKTOP,
    cards: ({testCard}) => [testCard],
    onAnswerChoiceSelect: () => false,
    steps: ({bind, cards, trigger, child, snap}) => {
      const [card] = cards;
      act(() => bind(card).onFocus(createFocusEvent(trigger(card))));
      act(() => bind(card).onKeyDown(createKeyboardEvent(trigger(card), 'Enter')));
      snap('expanded');
      act(() => bind(card).onAnswerChoiceSelect('A', createMouseEvent(child(card, '[data-slot="answerChoiceA"]')) as never));
      snap('choice-vetoed');
    }
  },
  {
    name: 'desktop/answer-choice-begins-transition',
    ...DESKTOP,
    cards: ({testCard}) => [testCard],
    onAnswerChoiceSelect: () => true,
    steps: ({bind, cards, trigger, child, snap}) => {
      const [card] = cards;
      act(() => bind(card).onFocus(createFocusEvent(trigger(card))));
      act(() => bind(card).onKeyDown(createKeyboardEvent(trigger(card), 'Enter')));
      snap('expanded');
      act(() => bind(card).onAnswerChoiceSelect('B', createMouseEvent(child(card, '[data-slot="answerChoiceB"]')) as never));
      snap('transition-started');
    }
  },
  {
    name: 'desktop/blog-click-primary-cta',
    ...DESKTOP,
    cards: ({blogCard}) => [blogCard],
    onPrimaryCtaSelect: () => false,
    steps: ({bind, cards, trigger, snap}) => {
      const [card] = cards;
      act(() => bind(card).onClick(createMouseEvent(trigger(card))));
      snap('blog-click');
    }
  },
  {
    name: 'desktop/blog-click-modified-passthrough',
    ...DESKTOP,
    cards: ({blogCard}) => [blogCard],
    onPrimaryCtaSelect: () => false,
    steps: ({bind, cards, trigger, snap}) => {
      const [card] = cards;
      act(() => bind(card).onClick(createMouseEvent(trigger(card), {metaKey: true})));
      snap('meta-click');
      act(() => bind(card).onClick(createMouseEvent(trigger(card), {button: 1})));
      snap('middle-click');
    }
  },
  {
    name: 'desktop/test-click-expands',
    ...DESKTOP,
    cards: ({testCard}) => [testCard],
    steps: ({bind, cards, trigger, snap}) => {
      const [card] = cards;
      act(() => bind(card).onClick(createMouseEvent(trigger(card))));
      snap('click');
    }
  },
  {
    name: 'mobile/tap-open-then-close-button',
    ...MOBILE,
    cards: ({testCard}) => [testCard],
    steps: ({bind, cards, trigger, child, advance, snap}) => {
      const [card] = cards;
      act(() => bind(card).onClick(createMouseEvent(trigger(card))));
      snap('opening');
      advance(MOBILE_EXPANDED_DURATION_MS);
      snap('open');
      act(() => bind(card).onMobileClose(createMouseEvent(child(card, '[data-slot="mobileClose"]')) as never));
      snap('closing');
      advance(MOBILE_EXPANDED_DURATION_MS * 2);
      snap('closed');
    }
  },
  {
    name: 'mobile/tap-open-then-backdrop',
    ...MOBILE,
    cards: ({testCard}) => [testCard],
    steps: ({bind, cards, trigger, advance, result, snap}) => {
      const [card] = cards;
      act(() => bind(card).onClick(createMouseEvent(trigger(card))));
      advance(MOBILE_EXPANDED_DURATION_MS);
      snap('open');
      act(() => {
        result.current.mobileBackdropBindings.onPointerDown({clientX: 20, clientY: 700} as never);
      });
      snap('backdrop-pointer-down');
      act(() => {
        result.current.mobileBackdropBindings.onPointerUp();
      });
      snap('backdrop-pointer-up');
      advance(MOBILE_EXPANDED_DURATION_MS * 2);
      snap('settled');
    }
  },
  {
    name: 'mobile/card-root-escape-closes-blur-inert',
    ...MOBILE,
    cards: ({testCard}) => [testCard],
    steps: ({bind, cards, trigger, root, advance, snap}) => {
      const [card] = cards;
      act(() => bind(card).onClick(createMouseEvent(trigger(card))));
      advance(MOBILE_EXPANDED_DURATION_MS);
      snap('open');
      act(() => {
        const bindings = bind(card);
        bindings.onCardKeyDown(createKeyboardEvent(root(card), 'Escape', trigger(card)));
        bindings.onCardBlur(createFocusEvent(root(card), {target: trigger(card), relatedTarget: document.body}));
      });
      snap('escape-closes-blur-inert');
    }
  },
  {
    name: 'mobile/blog-tap-routes-without-lifecycle',
    ...MOBILE,
    cards: ({testCard, blogCard}) => [testCard, blogCard],
    onPrimaryCtaSelect: () => false,
    steps: ({bind, cards, trigger, snap}) => {
      const [, blog] = cards;
      act(() => bind(blog).onClick(createMouseEvent(trigger(blog))));
      snap('blog-tap');
    }
  },
  {
    name: 'mobile/second-card-tap-while-open',
    ...MOBILE,
    cards: ({testCard, secondTestCard}) => [testCard, secondTestCard],
    steps: ({bind, cards, trigger, advance, snap}) => {
      const [first, second] = cards;
      act(() => bind(first).onClick(createMouseEvent(trigger(first))));
      advance(MOBILE_EXPANDED_DURATION_MS);
      snap('first-open');
      act(() => bind(second).onClick(createMouseEvent(trigger(second))));
      snap('second-tapped');
      advance(MOBILE_EXPANDED_DURATION_MS * 2);
      snap('settled');
    }
  },
  {
    name: 'mobile/unavailable-tap',
    ...MOBILE,
    cards: ({unavailableCard}) => [unavailableCard],
    steps: ({bind, cards, trigger, advance, snap}) => {
      const [card] = cards;
      act(() => bind(card).onClick(createMouseEvent(trigger(card))));
      snap('tap');
      advance(MOBILE_EXPANDED_DURATION_MS);
      snap('settled');
    }
  },
  {
    name: 'scroll-hold/keeps-open-without-pointer-move',
    ...DESKTOP,
    cards: ({testCard}) => [testCard],
    steps: ({bind, cards, root, advance, pointerMove, scroll, stubRect, snap}) => {
      const [card] = cards;
      stubRect(card, CARD_RECT_BEFORE_SCROLL);
      pointerMove(root(card), POINTER_INSIDE_BEFORE_SCROLL);
      act(() => bind(card).onMouseEnter(createMouseEvent(root(card))));
      advance(DESKTOP_EXPAND_DELAY_MS + 1);
      snap('expanded');
      stubRect(card, CARD_RECT_AFTER_SCROLL);
      scroll();
      act(() => bind(card).onMouseLeave(createMouseEvent(root(card))));
      snap('scroll-leave');
      advance(DESKTOP_COLLAPSE_DELAY_MS + 1);
      snap('still-open');
    }
  },
  {
    name: 'scroll-hold/collapses-on-real-pointer-move',
    ...DESKTOP,
    cards: ({testCard}) => [testCard],
    steps: ({bind, cards, root, advance, pointerMove, scroll, stubRect, snap}) => {
      const [card] = cards;
      stubRect(card, CARD_RECT_BEFORE_SCROLL);
      pointerMove(root(card), POINTER_INSIDE_BEFORE_SCROLL);
      act(() => bind(card).onMouseEnter(createMouseEvent(root(card))));
      advance(DESKTOP_EXPAND_DELAY_MS + 1);
      stubRect(card, CARD_RECT_AFTER_SCROLL);
      scroll();
      act(() => bind(card).onMouseLeave(createMouseEvent(root(card))));
      snap('held');
      pointerMove(document.body, POINTER_OUTSIDE);
      snap('real-move');
      advance(DESKTOP_COLLAPSE_DELAY_MS + 1);
      snap('collapsed');
    }
  },
  {
    name: 'scroll-hold/re-adjudicates-inside-moved-boundary',
    ...DESKTOP,
    cards: ({testCard}) => [testCard],
    steps: ({bind, cards, root, advance, pointerMove, scroll, stubRect, snap}) => {
      const [card] = cards;
      stubRect(card, CARD_RECT_BEFORE_SCROLL);
      pointerMove(root(card), POINTER_INSIDE_BEFORE_SCROLL);
      act(() => bind(card).onMouseEnter(createMouseEvent(root(card))));
      advance(DESKTOP_EXPAND_DELAY_MS + 1);
      stubRect(card, CARD_RECT_AFTER_SCROLL);
      scroll();
      act(() => bind(card).onMouseLeave(createMouseEvent(root(card))));
      snap('held');
      pointerMove(root(card), {clientX: 300, clientY: 200});
      snap('inside-moved-boundary');
      advance(DESKTOP_COLLAPSE_DELAY_MS + 1);
      snap('settled');
    }
  },
  {
    name: 'scroll-hold/releases-on-viewport-exit',
    ...DESKTOP,
    cards: ({testCard}) => [testCard],
    steps: ({bind, cards, root, advance, pointerMove, scroll, stubRect, snap}) => {
      const [card] = cards;
      stubRect(card, CARD_RECT_BEFORE_SCROLL);
      pointerMove(root(card), POINTER_INSIDE_BEFORE_SCROLL);
      act(() => bind(card).onMouseEnter(createMouseEvent(root(card))));
      advance(DESKTOP_EXPAND_DELAY_MS + 1);
      stubRect(card, CARD_RECT_AFTER_SCROLL);
      scroll();
      act(() => bind(card).onMouseLeave(createMouseEvent(root(card))));
      snap('held');
      stubRect(card, CARD_RECT_ABOVE_VIEWPORT);
      scroll();
      snap('viewport-exit');
      advance(DESKTOP_COLLAPSE_DELAY_MS + 1);
      snap('collapsed');
    }
  },
  {
    name: 'scroll-hold/handoff-drops-the-hold',
    ...DESKTOP,
    cards: ({testCard, secondTestCard}) => [testCard, secondTestCard],
    steps: ({bind, cards, root, advance, pointerMove, scroll, stubRect, snap}) => {
      const [first, second] = cards;
      stubRect(first, CARD_RECT_BEFORE_SCROLL);
      pointerMove(root(first), POINTER_INSIDE_BEFORE_SCROLL);
      act(() => bind(first).onMouseEnter(createMouseEvent(root(first))));
      advance(DESKTOP_EXPAND_DELAY_MS + 1);
      stubRect(first, CARD_RECT_AFTER_SCROLL);
      scroll();
      act(() => bind(first).onMouseLeave(createMouseEvent(root(first))));
      snap('held');
      pointerMove(root(second), {clientX: 600, clientY: 300});
      act(() => bind(second).onMouseEnter(createMouseEvent(root(second))));
      snap('handoff');
      advance(DESKTOP_EXPAND_DELAY_MS + DESKTOP_COLLAPSE_DELAY_MS + 2);
      snap('settled');
    }
  },
  {
    name: 'tap-mode/no-scroll-hold-on-desktop-width',
    ...DESKTOP_TAP,
    cards: ({testCard}) => [testCard],
    steps: ({bind, cards, root, trigger, advance, scroll, stubRect, snap}) => {
      const [card] = cards;
      stubRect(card, CARD_RECT_BEFORE_SCROLL);
      act(() => bind(card).onClick(createMouseEvent(trigger(card))));
      snap('tap-expanded');
      stubRect(card, CARD_RECT_AFTER_SCROLL);
      scroll();
      act(() => bind(card).onMouseLeave(createMouseEvent(root(card))));
      snap('scroll-leave');
      advance(DESKTOP_COLLAPSE_DELAY_MS + 1);
      snap('settled');
    }
  }
];

interface FingerprintReport {
  version: number;
  sequenceCount: number;
  stepCount: number;
  bySequence: Record<string, string>;
  digest: string;
}

function buildFingerprint(mutate?: (line: string) => string): FingerprintReport {
  const bySequence: Record<string, string> = {};
  const allLines: string[] = [];

  for (const definition of SEQUENCES) {
    clock.now = 1_000;
    vi.useFakeTimers();
    installBrowserStubs(definition.hoverCapability);

    let lines: string[];
    try {
      lines = runSequence(definition);
    } finally {
      cleanup();
      document.body.innerHTML = '';
      vi.useRealTimers();
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    }

    const finalLines = mutate ? lines.map(mutate) : lines;
    bySequence[definition.name] = sha256(finalLines.join('\n'));
    allLines.push(...finalLines);
  }

  return {
    version: 1,
    sequenceCount: SEQUENCES.length,
    stepCount: allLines.length,
    bySequence,
    digest: sha256(allLines.join('\n'))
  };
}

describe('landing controller sequence fingerprint (F3)', () => {
  let report: FingerprintReport;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('replays every declared sequence', () => {
    report = buildFingerprint();
    expect(report.sequenceCount).toBe(SEQUENCES.length);
    expect(report.stepCount).toBeGreaterThanOrEqual(SEQUENCES.length * 2);
  });

  it('matches the committed fingerprint byte for byte', () => {
    report = buildFingerprint();

    if (process.env.UPDATE_LANDING_FINGERPRINTS === '1') {
      writeFileSync(FIXTURE_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    }

    const expected = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as FingerprintReport;
    const changed = Object.keys(report.bySequence).filter(
      (name) => expected.bySequence[name] !== report.bySequence[name]
    );

    expect(report.bySequence, `달라진 시퀀스: ${changed.join(', ') || '(없음)'}`).toEqual(expected.bySequence);
    expect(report.digest).toBe(expected.digest);
    expect(report.stepCount).toBe(expected.stepCount);
  });

  it('is reproducible across runs', () => {
    const first = buildFingerprint();
    const second = buildFingerprint();

    expect(second.digest).toBe(first.digest);
  });

  // 비어 있지 않음 — 재생이 실제로 상태를 움직였는지 본다. 이것이 없으면 하네스가 조용히
  // 아무 것도 하지 않아도 지문은 안정적으로 초록이 된다.
  it('actually drives the controller through the states it claims to replay', () => {
    clock.now = 1_000;
    vi.useFakeTimers();
    installBrowserStubs(true);

    try {
      const {testCard} = selectCards();
      const shell = mountShell([testCard]);
      const {result} = renderHook(() =>
        useLandingInteractionController({
          cards: [testCard],
          viewportWidth: 1280,
          viewportTier: 'desktop',
          shellRef: {current: shell}
        })
      );
      const cardRoot = findCardRoot(shell, testCard.variant);

      act(() => result.current.resolveCardInteractionBindings(testCard).onMouseEnter(createMouseEvent(cardRoot)));
      act(() => {
        clock.now += DESKTOP_EXPAND_DELAY_MS + 1;
        vi.advanceTimersByTime(DESKTOP_EXPAND_DELAY_MS + 1);
      });

      expect(result.current.interactionState.expandedCardVariant).toBe(testCard.variant);

      // BQ-39 R1: 포인터가 실제로 움직인 이탈에만 collapse 가 실행된다. 그래서 leave 뒤에
      // 경계 밖 pointermove 를 한 번 보낸다 — 그것 없이는 스크롤 hold 로 남는 것이 계약이다.
      act(() => result.current.resolveCardInteractionBindings(testCard).onMouseLeave(createMouseEvent(cardRoot)));
      act(() => {
        document.body.dispatchEvent(new MouseEvent('pointermove', {bubbles: true, clientX: 40, clientY: 40}));
      });
      act(() => {
        clock.now += DESKTOP_COLLAPSE_DELAY_MS + 1;
        vi.advanceTimersByTime(DESKTOP_COLLAPSE_DELAY_MS + 1);
      });

      expect(result.current.interactionState.expandedCardVariant).toBeNull();
    } finally {
      cleanup();
      document.body.innerHTML = '';
      vi.useRealTimers();
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    }
  });

  it('records different step hashes inside a sequence that changes state', () => {
    clock.now = 1_000;
    vi.useFakeTimers();
    installBrowserStubs(SEQUENCES[0].hoverCapability);

    let lines: string[];
    try {
      lines = runSequence(SEQUENCES[0]);
    } finally {
      cleanup();
      document.body.innerHTML = '';
      vi.useRealTimers();
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    }

    const hashes = lines.map((line) => line.split('\t')[3]);
    expect(new Set(hashes).size).toBeGreaterThan(1);
  });

  // 고장 주입 — 한 스텝의 스냅샷만 달라져도 그 시퀀스와 전체 지문이 달라진다.
  it('changes when a single replayed step is perturbed', () => {
    const baseline = buildFingerprint();
    const faultSequence = SEQUENCES[0].name;
    const faulty = buildFingerprint((line) =>
      line.startsWith(`${faultSequence}\t002\t`) ? `${line}-injected-fault` : line
    );

    expect(faulty.digest).not.toBe(baseline.digest);
    expect(faulty.bySequence[faultSequence]).not.toBe(baseline.bySequence[faultSequence]);
    expect(faulty.bySequence[SEQUENCES[1].name]).toBe(baseline.bySequence[SEQUENCES[1].name]);
  });
});
