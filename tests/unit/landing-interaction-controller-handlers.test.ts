// @vitest-environment jsdom

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
import {useLandingInteractionController} from '../../src/features/landing/grid/use-landing-interaction-controller';
import {resolveLandingCatalog, type LandingCard} from '../../src/features/variant-registry';

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
  };
}

function installBrowserStubs(hoverCapability = true) {
  vi.stubGlobal('matchMedia', (query: string) => createMatchMediaResult(query, hoverCapability));
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    return window.setTimeout(() => callback(window.performance.now()), 0);
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id));
}

function selectFixtureCards() {
  const catalog = resolveLandingCatalog('en', {audience: 'qa'});
  const testCard = catalog.find((card) => card.variant === 'qmbti');
  const secondTestCard = catalog.find((card) => card.variant === 'rhythm-b');
  const blogCard = catalog.find((card) => card.variant === 'ops-handbook');

  if (
    !testCard ||
    testCard.type !== 'test' ||
    !secondTestCard ||
    secondTestCard.type !== 'test' ||
    !blogCard ||
    blogCard.type !== 'blog'
  ) {
    throw new Error('Expected qmbti/rhythm-b test cards and ops-handbook blog card fixtures');
  }

  return {testCard, secondTestCard, blogCard};
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

function renderController(initialProps: ControllerHookProps) {
  return renderHook(
    (props: ControllerHookProps) =>
      useLandingInteractionController({
        cards: props.cards,
        viewportWidth: props.viewportWidth,
        viewportTier: props.viewportTier,
        shellRef: props.shellRef,
        onAnswerChoiceSelect: props.onAnswerChoiceSelect,
        onPrimaryCtaSelect: props.onPrimaryCtaSelect
      }),
    {initialProps}
  );
}

function createMouseEvent<T extends HTMLElement>(
  currentTarget: T,
  init: Partial<Pick<ReactMouseEvent<T>, 'altKey' | 'button' | 'clientX' | 'clientY' | 'ctrlKey' | 'metaKey' | 'shiftKey'>> = {}
) {
  return {
    currentTarget,
    // 좌표를 주지 않은 기존 검사는 「위치를 알 수 없음」이며 위조 판정 대상이 아니다.
    clientX: init.clientX ?? Number.NaN,
    clientY: init.clientY ?? Number.NaN,
    button: init.button ?? 0,
    altKey: init.altKey ?? false,
    ctrlKey: init.ctrlKey ?? false,
    metaKey: init.metaKey ?? false,
    shiftKey: init.shiftKey ?? false,
    timeStamp: 100,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn()
  } as unknown as ReactMouseEvent<T>;
}

function createFocusEvent<T extends HTMLElement>(currentTarget: T, timeStamp = 100) {
  return {
    currentTarget,
    target: currentTarget,
    timeStamp
  } as unknown as ReactFocusEvent<T>;
}

function createKeyboardEvent<T extends HTMLElement>(
  currentTarget: T,
  key: string,
  timeStamp = 100
) {
  return {
    currentTarget,
    target: currentTarget,
    key,
    shiftKey: false,
    timeStamp,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn()
  } as unknown as ReactKeyboardEvent<T>;
}

function findCardChild<T extends HTMLElement>(shell: HTMLElement, variant: string, selector: string): T {
  const element = shell.querySelector<T>(`[data-card-variant="${variant}"] ${selector}`);
  if (!element) {
    throw new Error(`Missing test element for ${variant}: ${selector}`);
  }
  return element;
}

describe('landing interaction controller handlers', () => {
  beforeEach(() => {
    installBrowserStubs();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('expands a Desktop hover-none Test immediately from keyboard focus', () => {
    installBrowserStubs(false);
    const {testCard} = selectFixtureCards();
    const shell = mountShell([testCard]);
    const {result} = renderController({
      cards: [testCard],
      viewportWidth: 1280,
      viewportTier: 'desktop',
      shellRef: {current: shell}
    });
    const trigger = findCardChild<HTMLElement>(
      shell,
      testCard.variant,
      '[data-testid="landing-grid-card-trigger"]'
    );

    act(() => {
      result.current.resolveCardInteractionBindings(testCard).onFocus(createFocusEvent(trigger));
    });

    expect(result.current.interactionMode).toBe('tap');
    expect(result.current.interactionState.focusedCardVariant).toBe(testCard.variant);
    expect(result.current.interactionState.expandedCardVariant).toBe(testCard.variant);
  });

  it('cancels queued pointer expansion before keyboard focus selects another Test', () => {
    vi.useFakeTimers();
    const {testCard, secondTestCard} = selectFixtureCards();
    const shell = mountShell([testCard, secondTestCard]);
    const {result} = renderController({
      cards: [testCard, secondTestCard],
      viewportWidth: 1280,
      viewportTier: 'desktop',
      shellRef: {current: shell}
    });
    const sourceRoot = shell.querySelector<HTMLElement>(
      `[data-testid="landing-grid-card"][data-card-variant="${testCard.variant}"]`
    );
    if (!sourceRoot) {
      throw new Error(`Missing test card root for ${testCard.variant}`);
    }
    const targetTrigger = findCardChild<HTMLElement>(
      shell,
      secondTestCard.variant,
      '[data-testid="landing-grid-card-trigger"]'
    );

    act(() => {
      result.current.resolveCardInteractionBindings(testCard).onMouseEnter(createMouseEvent(sourceRoot));
      result.current
        .resolveCardInteractionBindings(secondTestCard)
        .onFocus(createFocusEvent(targetTrigger, 110));
    });
    act(() => {
      vi.advanceTimersByTime(DESKTOP_EXPAND_DELAY_MS + 1);
    });

    expect(result.current.interactionState.focusedCardVariant).toBe(secondTestCard.variant);
    expect(result.current.interactionState.expandedCardVariant).toBe(secondTestCard.variant);
  });

  /**
   * 포인터 아래 노드가 unmount 되면 `mouseout` 이 갈 곳을 잃고 카드의 `onMouseLeave` 가
   * 한 번도 실행되지 않는다 — collapse 가 **예약조차 되지 않아** 카드가 hover 에 갇힌다.
   * 2026-09-10 실측(chromium): handoff 직후 중간 이동 없이 카드 밖으로 나가면 4/6 재현,
   * 포인터가 카드 안에서 한 번이라도 움직이면 0/6. 브라우저에서는 제거 시점과 hit-test
   * 시점의 경쟁이라 E2E 로 결정론이 되지 않으므로(원장 `L14`) 유실 조건을 여기서 직접 만든다:
   * `onMouseEnter` 로 확장시킨 뒤 **`onMouseLeave` 를 부르지 않고** 카드 밖을 target 으로 하는
   * window `pointermove` 만 보낸다. 실측한 이벤트 순서가
   * `mouseout → mouseover → pointermove` 이므로, 정상 경로였다면 이 시점에 직전 값은 이미
   * `null` 이다 — 여기서 카드 이름이 남아 있다는 것이 곧 leave 가 유실됐다는 뜻이다.
   */
  it('collapses a hover-expanded Test when the leave event is lost because the pointer node unmounted', () => {
    vi.useFakeTimers();
    const {testCard, secondTestCard} = selectFixtureCards();
    const shell = mountShell([testCard, secondTestCard]);
    const {result} = renderController({
      cards: [testCard, secondTestCard],
      viewportWidth: 1280,
      viewportTier: 'desktop',
      shellRef: {current: shell}
    });
    const cardRoot = shell.querySelector<HTMLElement>(
      `[data-testid="landing-grid-card"][data-card-variant="${testCard.variant}"]`
    );
    if (!cardRoot) {
      throw new Error(`Missing test card root for ${testCard.variant}`);
    }

    act(() => {
      result.current.resolveCardInteractionBindings(testCard).onMouseEnter(createMouseEvent(cardRoot));
    });
    act(() => {
      vi.advanceTimersByTime(DESKTOP_EXPAND_DELAY_MS + 1);
    });
    expect(result.current.interactionState.expandedCardVariant).toBe(testCard.variant);

    // 카드 밖으로 나가는 포인터. `onMouseLeave` 는 오지 않는다 — 그것이 이 결함이다.
    // jsdom 의 rect 는 전부 0×0 이므로 경계 밖임을 분명히 하려고 좌표를 멀리 둔다.
    act(() => {
      document.body.dispatchEvent(
        new MouseEvent('pointermove', {bubbles: true, clientX: 999, clientY: 999})
      );
    });
    act(() => {
      vi.advanceTimersByTime(DESKTOP_COLLAPSE_DELAY_MS + 1);
    });

    expect(result.current.interactionState.expandedCardVariant).toBeNull();
    expect(result.current.interactionState.hoverLock.enabled).toBe(false);
  });

  it('keeps the real focus event after queued Test handoff idempotent', () => {
    const {testCard, secondTestCard} = selectFixtureCards();
    const shell = mountShell([testCard, secondTestCard]);
    const {result} = renderController({
      cards: [testCard, secondTestCard],
      viewportWidth: 1280,
      viewportTier: 'desktop',
      shellRef: {current: shell}
    });
    const sourceTrigger = findCardChild<HTMLElement>(
      shell,
      testCard.variant,
      '[data-testid="landing-grid-card-trigger"]'
    );
    const targetTrigger = findCardChild<HTMLElement>(
      shell,
      secondTestCard.variant,
      '[data-testid="landing-grid-card-trigger"]'
    );

    act(() => {
      result.current.resolveCardInteractionBindings(testCard).onFocus(createFocusEvent(sourceTrigger, 100));
    });
    act(() => {
      result.current
        .resolveCardInteractionBindings(secondTestCard)
        .onFocus(createFocusEvent(targetTrigger, 110));
      result.current
        .resolveCardInteractionBindings(secondTestCard)
        .onFocus(createFocusEvent(targetTrigger, 120));
    });

    expect(result.current.interactionState.focusedCardVariant).toBe(secondTestCard.variant);
    expect(result.current.interactionState.expandedCardVariant).toBe(secondTestCard.variant);
  });

  it('collapses a focused Test before assigning Blog focus-only state', () => {
    const {testCard, blogCard} = selectFixtureCards();
    const shell = mountShell([testCard, blogCard]);
    const {result} = renderController({
      cards: [testCard, blogCard],
      viewportWidth: 1280,
      viewportTier: 'desktop',
      shellRef: {current: shell}
    });
    const testTrigger = findCardChild<HTMLElement>(
      shell,
      testCard.variant,
      '[data-testid="landing-grid-card-trigger"]'
    );
    const blogTrigger = findCardChild<HTMLElement>(
      shell,
      blogCard.variant,
      '[data-testid="landing-grid-card-trigger"]'
    );

    act(() => {
      result.current.resolveCardInteractionBindings(testCard).onFocus(createFocusEvent(testTrigger, 100));
    });
    act(() => {
      result.current.resolveCardInteractionBindings(blogCard).onFocus(createFocusEvent(blogTrigger, 110));
    });

    expect(result.current.interactionState.focusedCardVariant).toBe(blogCard.variant);
    expect(result.current.interactionState.expandedCardVariant).toBeNull();
  });

  it('keeps repeated Test Enter and Space as non-entry idempotent expansion commands', () => {
    const {testCard} = selectFixtureCards();
    const shell = mountShell([testCard]);
    const onAnswerChoiceSelect = vi.fn<NonNullable<ControllerHookProps['onAnswerChoiceSelect']>>();
    const {result} = renderController({
      cards: [testCard],
      viewportWidth: 1280,
      viewportTier: 'desktop',
      shellRef: {current: shell},
      onAnswerChoiceSelect
    });
    const trigger = findCardChild<HTMLElement>(
      shell,
      testCard.variant,
      '[data-testid="landing-grid-card-trigger"]'
    );

    act(() => {
      result.current.resolveCardInteractionBindings(testCard).onFocus(createFocusEvent(trigger, 100));
    });
    for (const [index, key] of ['Enter', ' ', 'Enter'].entries()) {
      act(() => {
        result.current
          .resolveCardInteractionBindings(testCard)
          .onKeyDown(createKeyboardEvent(trigger, key, 110 + index));
      });
    }

    expect(result.current.interactionState.focusedCardVariant).toBe(testCard.variant);
    expect(result.current.interactionState.expandedCardVariant).toBe(testCard.variant);
    expect(onAnswerChoiceSelect).not.toHaveBeenCalled();
  });

  it('routes Test Escape from trigger and choices through one root close and restores trigger focus before collapse', () => {
    vi.useFakeTimers();
    const {testCard} = selectFixtureCards();

    for (const targetSelector of [
      '[data-testid="landing-grid-card-trigger"]',
      '[data-slot="answerChoiceA"]',
      '[data-slot="answerChoiceB"]'
    ]) {
      const shell = mountShell([testCard]);
      const hook = renderController({
        cards: [testCard],
        viewportWidth: 1280,
        viewportTier: 'desktop',
        shellRef: {current: shell}
      });
      const cardRoot = shell.querySelector<HTMLElement>(
        `[data-testid="landing-grid-card"][data-card-variant="${testCard.variant}"]`
      )!;
      const trigger = findCardChild<HTMLElement>(
        shell,
        testCard.variant,
        '[data-testid="landing-grid-card-trigger"]'
      );
      const target = findCardChild<HTMLElement>(shell, testCard.variant, targetSelector);

      act(() => {
        hook.result.current
          .resolveCardInteractionBindings(testCard)
          .onFocus(createFocusEvent(trigger, 100));
      });
      target.focus();
      const event = {
        currentTarget: cardRoot,
        target,
        key: 'Escape',
        timeStamp: 110,
        defaultPrevented: false,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      } as unknown as ReactKeyboardEvent<HTMLElement>;

      act(() => {
        hook.result.current.resolveCardInteractionBindings(testCard).onCardKeyDown(event);
      });

      expect(event.preventDefault).toHaveBeenCalledTimes(1);
      expect(event.stopPropagation).toHaveBeenCalledTimes(1);
      expect(document.activeElement).toBe(trigger);
      expect(hook.result.current.interactionState.expandedCardVariant).toBeNull();
      act(() => {
        vi.runAllTimers();
      });
      expect(document.activeElement).toBe(trigger);
      cleanup();
      document.body.innerHTML = '';
    }
  });

  it('leaves Test expanded when a higher-priority rendered dialog owns Escape', () => {
    const {testCard} = selectFixtureCards();
    const shell = mountShell([testCard]);
    const {result} = renderController({
      cards: [testCard],
      viewportWidth: 1280,
      viewportTier: 'desktop',
      shellRef: {current: shell}
    });
    const cardRoot = shell.querySelector<HTMLElement>('[data-card-variant="qmbti"]')!;
    const trigger = findCardChild<HTMLElement>(
      shell,
      testCard.variant,
      '[data-testid="landing-grid-card-trigger"]'
    );
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    document.body.append(dialog);

    act(() => {
      result.current.resolveCardInteractionBindings(testCard).onFocus(createFocusEvent(trigger));
    });
    const event = {
      currentTarget: cardRoot,
      target: trigger,
      key: 'Escape',
      timeStamp: 110,
      defaultPrevented: false,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn()
    } as unknown as ReactKeyboardEvent<HTMLElement>;
    act(() => {
      result.current.resolveCardInteractionBindings(testCard).onCardKeyDown(event);
    });

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.stopPropagation).not.toHaveBeenCalled();
    expect(result.current.interactionState.expandedCardVariant).toBe(testCard.variant);
  });

  it('closes only on true in-page focus exit and preserves destination focus', () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    const {testCard} = selectFixtureCards();
    const shell = mountShell([testCard]);
    const {result} = renderController({
      cards: [testCard],
      viewportWidth: 1280,
      viewportTier: 'desktop',
      shellRef: {current: shell}
    });
    const cardRoot = shell.querySelector<HTMLElement>('[data-card-variant="qmbti"]')!;
    const trigger = findCardChild<HTMLElement>(
      shell,
      testCard.variant,
      '[data-testid="landing-grid-card-trigger"]'
    );
    const choiceA = findCardChild<HTMLElement>(shell, testCard.variant, '[data-slot="answerChoiceA"]');
    const outside = document.createElement('button');
    document.body.append(outside);

    act(() => {
      result.current.resolveCardInteractionBindings(testCard).onFocus(createFocusEvent(trigger));
    });
    act(() => {
      result.current.resolveCardInteractionBindings(testCard).onCardBlur({
        currentTarget: cardRoot,
        target: trigger,
        relatedTarget: choiceA,
        timeStamp: 110
      } as unknown as ReactFocusEvent<HTMLElement>);
    });
    expect(result.current.interactionState.expandedCardVariant).toBe(testCard.variant);

    outside.focus();
    act(() => {
      result.current.resolveCardInteractionBindings(testCard).onCardBlur({
        currentTarget: cardRoot,
        target: choiceA,
        relatedTarget: outside,
        timeStamp: 120
      } as unknown as ReactFocusEvent<HTMLElement>);
    });
    expect(result.current.interactionState.expandedCardVariant).toBeNull();
    expect(document.activeElement).toBe(outside);
  });

  it('preserves disclosure on pure window blur with a null related target', () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    const {testCard} = selectFixtureCards();
    const shell = mountShell([testCard]);
    const {result} = renderController({
      cards: [testCard],
      viewportWidth: 1280,
      viewportTier: 'desktop',
      shellRef: {current: shell}
    });
    const cardRoot = shell.querySelector<HTMLElement>('[data-card-variant="qmbti"]')!;
    const trigger = findCardChild<HTMLElement>(
      shell,
      testCard.variant,
      '[data-testid="landing-grid-card-trigger"]'
    );

    act(() => {
      result.current.resolveCardInteractionBindings(testCard).onFocus(createFocusEvent(trigger));
      result.current.resolveCardInteractionBindings(testCard).onCardBlur({
        currentTarget: cardRoot,
        target: trigger,
        relatedTarget: null,
        timeStamp: 110
      } as unknown as ReactFocusEvent<HTMLElement>);
    });

    expect(result.current.interactionState.expandedCardVariant).toBe(testCard.variant);
  });

  // 승격 전 이 케이스의 제목은 「ignores both card-root close handlers on Mobile」이었고
  // Escape 와 blur 가 **둘 다** 아무 일도 하지 않는 것을 고정했다. 키보드 축이 전 표면 규칙이
  // 되면서 그 계약이 갈라진다 — Escape 는 모바일 생명주기를 닫고, blur 는 여전히 아무 일도
  // 하지 않는다(터치에서 포커스 이탈은 닫기 의도가 아니다). 제목을 새 계약에 맞게 바꾼다.
  it('routes card-root Escape into the mobile lifecycle while blur stays inert on Mobile', () => {
    const {testCard} = selectFixtureCards();
    const shell = mountShell([testCard]);
    const {result} = renderController({
      cards: [testCard],
      viewportWidth: 390,
      viewportTier: 'mobile',
      shellRef: {current: shell}
    });
    const cardRoot = shell.querySelector<HTMLElement>('[data-card-variant="qmbti"]')!;
    const trigger = findCardChild<HTMLElement>(
      shell,
      testCard.variant,
      '[data-testid="landing-grid-card-trigger"]'
    );

    act(() => {
      result.current.resolveCardInteractionBindings(testCard).onClick(createMouseEvent(trigger));
    });
    const beforeInteraction = result.current.interactionState;
    const beforeLifecycle = result.current.mobileLifecycleState;
    const keyEvent = {
      currentTarget: cardRoot,
      target: trigger,
      key: 'Escape',
      timeStamp: 110,
      defaultPrevented: false,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn()
    } as unknown as ReactKeyboardEvent<HTMLElement>;

    act(() => {
      const bindings = result.current.resolveCardInteractionBindings(testCard);
      bindings.onCardKeyDown(keyEvent);
      bindings.onCardBlur({
        currentTarget: cardRoot,
        target: trigger,
        relatedTarget: document.body,
        timeStamp: 120
      } as unknown as ReactFocusEvent<HTMLElement>);
    });

    // Escape 는 이제 모바일에서도 소비된다 — WCAG 2.1.1/2.1.2.
    expect(keyEvent.preventDefault).toHaveBeenCalled();
    expect(keyEvent.stopPropagation).toHaveBeenCalled();

    // 그리고 데스크톱 close 경로가 아니라 **모바일 닫기**로 들어간다. 확장이 시트가 되면서
    // 「OPENING 중의 닫기를 예약한다」는 위상 규칙이 사라졌다 — 시트가 자기 전이를 소유하므로
    // 닫힘 요청은 언제 오든 곧바로 상태에 반영되고, 이탈 모션은 시트가 그린다.
    expect(beforeLifecycle.phase, '위상의 정본은 시트이고 컨트롤러는 아직 받아 적지 않았다').toBe('NORMAL');
    expect(result.current.interactionState.expandedCardVariant, 'Escape 가 확장을 접는다').toBeNull();

    // blur 는 그대로 무위다 — 데스크톱 close 경로는 모바일에서 여전히 실행되지 않는다.
    expect(beforeInteraction.expandedCardVariant).toBe('qmbti');
  });

  it('keeps the selected Test target after the source blur fires following handoff', () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    const {testCard, secondTestCard} = selectFixtureCards();
    const shell = mountShell([testCard, secondTestCard]);
    const {result} = renderController({
      cards: [testCard, secondTestCard],
      viewportWidth: 1280,
      viewportTier: 'desktop',
      shellRef: {current: shell}
    });
    const sourceRoot = shell.querySelector<HTMLElement>('[data-card-variant="qmbti"]')!;
    const sourceTrigger = findCardChild<HTMLElement>(
      shell,
      testCard.variant,
      '[data-testid="landing-grid-card-trigger"]'
    );
    const targetTrigger = findCardChild<HTMLElement>(
      shell,
      secondTestCard.variant,
      '[data-testid="landing-grid-card-trigger"]'
    );

    act(() => {
      result.current.resolveCardInteractionBindings(testCard).onFocus(createFocusEvent(sourceTrigger, 100));
    });
    act(() => {
      result.current
        .resolveCardInteractionBindings(secondTestCard)
        .onFocus(createFocusEvent(targetTrigger, 110));
    });
    act(() => {
      result.current.resolveCardInteractionBindings(testCard).onCardBlur({
        currentTarget: sourceRoot,
        target: sourceTrigger,
        relatedTarget: targetTrigger,
        timeStamp: 120
      } as unknown as ReactFocusEvent<HTMLElement>);
    });

    expect(result.current.interactionState.focusedCardVariant).toBe(secondTestCard.variant);
    expect(result.current.interactionState.expandedCardVariant).toBe(secondTestCard.variant);
  });

  it('keeps card handler identities stable while controller state is unchanged', () => {
    const {testCard, blogCard} = selectFixtureCards();
    const shell = mountShell([testCard, blogCard]);
    const {result} = renderController({
      cards: [testCard, blogCard],
      viewportWidth: 1280,
      viewportTier: 'desktop',
      shellRef: {current: shell}
    });

    const first = result.current.resolveCardInteractionBindings(testCard);
    const second = result.current.resolveCardInteractionBindings(testCard);

    expect(second.onClick).toBe(first.onClick);
    expect(second.onAnswerChoiceSelect).toBe(first.onAnswerChoiceSelect);
  });

  it('passes the latest test card object to answer-choice callbacks after cards rerender', () => {
    const {testCard, blogCard} = selectFixtureCards();
    const updatedTestCard: LandingCard = {
      ...testCard,
      title: `${testCard.title} updated`
    };
    const shell = mountShell([testCard, blogCard]);
    const onAnswerChoiceSelect = vi.fn<NonNullable<ControllerHookProps['onAnswerChoiceSelect']>>(() => false);
    const hook = renderController({
      cards: [testCard, blogCard],
      viewportWidth: 1280,
      viewportTier: 'desktop',
      shellRef: {current: shell},
      onAnswerChoiceSelect
    });

    hook.rerender({
      cards: [updatedTestCard, blogCard],
      viewportWidth: 1280,
      viewportTier: 'desktop',
      shellRef: {current: shell},
      onAnswerChoiceSelect
    });

    const answerButton = findCardChild<HTMLButtonElement>(shell, testCard.variant, '[data-slot="answerChoiceA"]');
    act(() => {
      hook.result.current.resolveCardInteractionBindings(updatedTestCard).onAnswerChoiceSelect(
        'A',
        createMouseEvent(answerButton)
      );
    });

    expect(onAnswerChoiceSelect.mock.calls[0]?.[0]).toBe(updatedTestCard);
    expect(onAnswerChoiceSelect.mock.calls[0]?.[1]).toBe('A');
  });

  it('passes the latest blog card object to whole-card activation callbacks after cards rerender', () => {
    const {testCard, blogCard} = selectFixtureCards();
    const updatedBlogCard: LandingCard = {
      ...blogCard,
      title: `${blogCard.title} updated`
    };
    const shell = mountShell([testCard, blogCard]);
    const onPrimaryCtaSelect = vi.fn<NonNullable<ControllerHookProps['onPrimaryCtaSelect']>>(() => false);
    const hook = renderController({
      cards: [testCard, blogCard],
      viewportWidth: 1280,
      viewportTier: 'desktop',
      shellRef: {current: shell},
      onPrimaryCtaSelect
    });

    hook.rerender({
      cards: [testCard, updatedBlogCard],
      viewportWidth: 1280,
      viewportTier: 'desktop',
      shellRef: {current: shell},
      onPrimaryCtaSelect
    });

    const trigger = findCardChild<HTMLElement>(shell, blogCard.variant, '[data-testid="landing-grid-card-trigger"]');
    const event = createMouseEvent(trigger);
    act(() => {
      hook.result.current.resolveCardInteractionBindings(updatedBlogCard).onClick(event);
    });

    expect(onPrimaryCtaSelect.mock.calls[0]?.[0]).toBe(updatedBlogCard);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
  });

  it('lets modified and middle-click blog activations pass through without mutating landing transition state', () => {
    const {testCard, blogCard} = selectFixtureCards();
    const shell = mountShell([testCard, blogCard]);
    const onPrimaryCtaSelect = vi.fn<NonNullable<ControllerHookProps['onPrimaryCtaSelect']>>();
    const {result} = renderController({
      cards: [testCard, blogCard],
      viewportWidth: 1280,
      viewportTier: 'desktop',
      shellRef: {current: shell},
      onPrimaryCtaSelect
    });
    const trigger = findCardChild<HTMLElement>(shell, blogCard.variant, '[data-testid="landing-grid-card-trigger"]');

    for (const event of [
      createMouseEvent(trigger, {metaKey: true}),
      createMouseEvent(trigger, {ctrlKey: true}),
      createMouseEvent(trigger, {shiftKey: true}),
      createMouseEvent(trigger, {altKey: true}),
      createMouseEvent(trigger, {button: 1})
    ]) {
      act(() => {
        result.current.resolveCardInteractionBindings(blogCard).onClick(event);
      });
      expect(event.preventDefault).not.toHaveBeenCalled();
    }

    expect(onPrimaryCtaSelect).not.toHaveBeenCalled();
    expect(result.current.interactionState.pageState).toBe('ACTIVE');
    expect(result.current.interactionState.expandedCardVariant).toBeNull();
  });

  it('routes mobile blog taps to navigation without opening the mobile expanded lifecycle', () => {
    const {testCard, blogCard} = selectFixtureCards();
    const shell = mountShell([testCard, blogCard]);
    const onPrimaryCtaSelect = vi.fn<NonNullable<ControllerHookProps['onPrimaryCtaSelect']>>(() => false);
    const {result} = renderController({
      cards: [testCard, blogCard],
      viewportWidth: 390,
      viewportTier: 'mobile',
      shellRef: {current: shell},
      onPrimaryCtaSelect
    });
    const trigger = findCardChild<HTMLElement>(shell, blogCard.variant, '[data-testid="landing-grid-card-trigger"]');
    const event = createMouseEvent(trigger);

    act(() => {
      result.current.resolveCardInteractionBindings(blogCard).onClick(event);
    });

    expect(onPrimaryCtaSelect.mock.calls[0]?.[0]).toBe(blogCard);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(result.current.mobileLifecycleState.phase).toBe('NORMAL');
    expect(result.current.mobileLifecycleState.cardVariant).toBeNull();
  });

  it('collapses the expanded card when the sheet asks to close', () => {
    vi.useFakeTimers();
    const {testCard} = selectFixtureCards();
    const shell = mountShell([testCard]);
    const {result} = renderController({
      cards: [testCard],
      viewportWidth: 390,
      viewportTier: 'mobile',
      shellRef: {current: shell}
    });
    const trigger = findCardChild<HTMLButtonElement>(shell, testCard.variant, '[data-testid="landing-grid-card-trigger"]');

    act(() => {
      result.current.resolveCardInteractionBindings(testCard).onClick(createMouseEvent(trigger));
    });
    // 시트가 열렸다고 알린다 — 위상의 정본은 시트다.
    act(() => {
      result.current.setMobileLifecycleState({phase: 'OPEN', cardVariant: testCard.variant});
    });

    expect(result.current.mobileLifecycleState.phase).toBe('OPEN');
    expect(result.current.interactionState.expandedCardVariant).toBe(testCard.variant);

    // 시트의 닫기 컨트롤·backdrop 탭·스와이프·Escape·뒤로가기가 전부 이 하나로 모인다.
    act(() => {
      result.current.collapseExpandedCard();
    });

    expect(result.current.interactionState.expandedCardVariant).toBeNull();
  });

  /**
   * BQ-39 (R1) — 스크롤은 확장을 닫지 않는다.
   *
   * 확장 카드가 뷰포트를 넘으면 그 아랫부분을 읽으려는 휠 조작이 카드를 포인터 밑에서
   * 빼내고, 그 `mouseout` 이 「경계 이탈」로 판정돼 카드가 닫힌다 — 포인터는 1px 도 움직이지
   * 않았는데. 판별자는 이벤트 순서다: 실측 순서가
   * `pointerout → pointerover → mouseout → mouseover → pointermove` 이므로 포인터가 실제로
   * 움직여 생긴 이탈에만 `pointermove` 가 따라온다. 그래서 `pointermove` 전용 seq 가 collapse
   * 예약 시점과 실행 시점 사이에 증가했는지로 두 경로를 가른다.
   *
   * 브라우저에서는 「rect 가 바뀌는 순간과 다음 hit-test」의 시점 경쟁이 섞이므로(원장 `L14`)
   * 조건을 jsdom 에서 직접 만든다 — rect 를 갈아 끼워 스크롤을 흉내 내고, 포인터 이동은
   * 보내지 않는다.
   */
  describe('scroll hold (BQ-39 R1)', () => {
    const CARD_RECT_BEFORE_SCROLL = {top: 380, bottom: 700, left: 200, right: 500};
    const CARD_RECT_AFTER_SCROLL = {top: 80, bottom: 400, left: 200, right: 500};
    const CARD_RECT_ABOVE_VIEWPORT = {top: -500, bottom: -200, left: 200, right: 500};
    const POINTER_INSIDE_BEFORE_SCROLL = {clientX: 298, clientY: 436};

    interface StubRect {
      top: number;
      bottom: number;
      left: number;
      right: number;
    }

    function stubCardBoundaryRect(shell: HTMLElement, cardVariant: string, rect: StubRect) {
      const boundary = findCardChild<HTMLElement>(shell, cardVariant, '[data-slot="expandedBody"]');
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
      return boundary;
    }

    function findCardRoot(shell: HTMLElement, cardVariant: string) {
      const cardRoot = shell.querySelector<HTMLElement>(
        `[data-testid="landing-grid-card"][data-card-variant="${cardVariant}"]`
      );
      if (!cardRoot) {
        throw new Error(`Missing test card root for ${cardVariant}`);
      }
      return cardRoot;
    }

    function dispatchPointerMove(target: HTMLElement, position: {clientX: number; clientY: number}) {
      act(() => {
        target.dispatchEvent(
          new MouseEvent('pointermove', {bubbles: true, clientX: position.clientX, clientY: position.clientY})
        );
      });
    }

    function dispatchWindowScroll() {
      act(() => {
        window.dispatchEvent(new Event('scroll'));
      });
    }

    it('keeps a hover-expanded Test open when the card leaves the pointer by scrolling rather than by pointer movement', () => {
      vi.useFakeTimers();
      const {testCard} = selectFixtureCards();
      const shell = mountShell([testCard]);
      const {result} = renderController({
        cards: [testCard],
        viewportWidth: 1280,
        viewportTier: 'desktop',
        shellRef: {current: shell}
      });
      const cardRoot = findCardRoot(shell, testCard.variant);
      stubCardBoundaryRect(shell, testCard.variant, CARD_RECT_BEFORE_SCROLL);

      dispatchPointerMove(cardRoot, POINTER_INSIDE_BEFORE_SCROLL);
      act(() => {
        result.current.resolveCardInteractionBindings(testCard).onMouseEnter(createMouseEvent(cardRoot));
      });
      act(() => {
        vi.advanceTimersByTime(DESKTOP_EXPAND_DELAY_MS + 1);
      });
      expect(result.current.interactionState.expandedCardVariant).toBe(testCard.variant);

      // 휠 스크롤: 카드가 포인터 밑에서 빠져나가 `mouseout` 이 나지만 `pointermove` 는 없다.
      stubCardBoundaryRect(shell, testCard.variant, CARD_RECT_AFTER_SCROLL);
      dispatchWindowScroll();
      act(() => {
        result.current.resolveCardInteractionBindings(testCard).onMouseLeave(createMouseEvent(cardRoot));
      });
      act(() => {
        vi.advanceTimersByTime(DESKTOP_COLLAPSE_DELAY_MS + 1);
      });

      expect(result.current.interactionState.expandedCardVariant).toBe(testCard.variant);
    });

    it('collapses on the next real pointer move outside the boundary without shifting the collapse grace timing', () => {
      vi.useFakeTimers();
      const {testCard} = selectFixtureCards();
      const shell = mountShell([testCard]);
      const {result} = renderController({
        cards: [testCard],
        viewportWidth: 1280,
        viewportTier: 'desktop',
        shellRef: {current: shell}
      });
      const cardRoot = findCardRoot(shell, testCard.variant);
      stubCardBoundaryRect(shell, testCard.variant, CARD_RECT_BEFORE_SCROLL);

      dispatchPointerMove(cardRoot, POINTER_INSIDE_BEFORE_SCROLL);
      act(() => {
        result.current.resolveCardInteractionBindings(testCard).onMouseEnter(createMouseEvent(cardRoot));
      });
      act(() => {
        vi.advanceTimersByTime(DESKTOP_EXPAND_DELAY_MS + 1);
      });
      expect(result.current.interactionState.expandedCardVariant).toBe(testCard.variant);

      act(() => {
        result.current.resolveCardInteractionBindings(testCard).onMouseLeave(createMouseEvent(cardRoot));
      });
      // 포인터가 실제로 움직여 카드 밖으로 나간다 — 정상 경로다.
      dispatchPointerMove(document.body, {clientX: 900, clientY: 900});

      // 유예 -1ms 에서 아직 열려 있다. 「정상 경로 타이밍 무변경」은 이 두 단언이 고정한다.
      act(() => {
        vi.advanceTimersByTime(DESKTOP_COLLAPSE_DELAY_MS - 1);
      });
      expect(result.current.interactionState.expandedCardVariant).toBe(testCard.variant);

      // 유예 +1ms 에서 접힌다.
      act(() => {
        vi.advanceTimersByTime(2);
      });
      expect(result.current.interactionState.expandedCardVariant).toBeNull();
    });

    it('re-adjudicates a scroll-held card as still hovered when the next pointer move lands inside the moved boundary', () => {
      vi.useFakeTimers();
      const {testCard} = selectFixtureCards();
      const shell = mountShell([testCard]);
      const {result} = renderController({
        cards: [testCard],
        viewportWidth: 1280,
        viewportTier: 'desktop',
        shellRef: {current: shell}
      });
      const cardRoot = findCardRoot(shell, testCard.variant);
      stubCardBoundaryRect(shell, testCard.variant, CARD_RECT_BEFORE_SCROLL);

      dispatchPointerMove(cardRoot, POINTER_INSIDE_BEFORE_SCROLL);
      act(() => {
        result.current.resolveCardInteractionBindings(testCard).onMouseEnter(createMouseEvent(cardRoot));
      });
      act(() => {
        vi.advanceTimersByTime(DESKTOP_EXPAND_DELAY_MS + 1);
      });

      stubCardBoundaryRect(shell, testCard.variant, CARD_RECT_AFTER_SCROLL);
      dispatchWindowScroll();
      act(() => {
        result.current.resolveCardInteractionBindings(testCard).onMouseLeave(createMouseEvent(cardRoot));
      });
      act(() => {
        vi.advanceTimersByTime(DESKTOP_COLLAPSE_DELAY_MS + 1);
      });
      expect(result.current.interactionState.expandedCardVariant).toBe(testCard.variant);

      // 옮겨 간 경계 **안**으로 포인터가 움직인다 — 계속 열려 있어야 한다.
      dispatchPointerMove(cardRoot, {clientX: 298, clientY: 300});
      act(() => {
        vi.advanceTimersByTime(DESKTOP_COLLAPSE_DELAY_MS + 1);
      });
      expect(result.current.interactionState.expandedCardVariant).toBe(testCard.variant);

      // hold 는 해제됐다: 이후 경계 밖 이동은 평소대로 닫는다.
      dispatchPointerMove(document.body, {clientX: 900, clientY: 900});
      act(() => {
        vi.advanceTimersByTime(DESKTOP_COLLAPSE_DELAY_MS + 1);
      });
      expect(result.current.interactionState.expandedCardVariant).toBeNull();
    });

    it('releases the scroll hold and collapses once the held card leaves the viewport entirely', () => {
      vi.useFakeTimers();
      const {testCard} = selectFixtureCards();
      const shell = mountShell([testCard]);
      const {result} = renderController({
        cards: [testCard],
        viewportWidth: 1280,
        viewportTier: 'desktop',
        shellRef: {current: shell}
      });
      const cardRoot = findCardRoot(shell, testCard.variant);
      stubCardBoundaryRect(shell, testCard.variant, CARD_RECT_BEFORE_SCROLL);

      dispatchPointerMove(cardRoot, POINTER_INSIDE_BEFORE_SCROLL);
      act(() => {
        result.current.resolveCardInteractionBindings(testCard).onMouseEnter(createMouseEvent(cardRoot));
      });
      act(() => {
        vi.advanceTimersByTime(DESKTOP_EXPAND_DELAY_MS + 1);
      });

      stubCardBoundaryRect(shell, testCard.variant, CARD_RECT_AFTER_SCROLL);
      dispatchWindowScroll();
      act(() => {
        result.current.resolveCardInteractionBindings(testCard).onMouseLeave(createMouseEvent(cardRoot));
      });
      act(() => {
        vi.advanceTimersByTime(DESKTOP_COLLAPSE_DELAY_MS + 1);
      });
      expect(result.current.interactionState.expandedCardVariant).toBe(testCard.variant);

      // 계속 스크롤해 카드가 뷰포트를 완전히 벗어난다 — 「지나쳐 버렸다」이므로 닫는다.
      // 이것이 없으면 확장 본문의 답변 버튼·CTA 가 화면 밖 탭 스톱으로 남는다.
      stubCardBoundaryRect(shell, testCard.variant, CARD_RECT_ABOVE_VIEWPORT);
      dispatchWindowScroll();

      expect(result.current.interactionState.expandedCardVariant).toBeNull();
      expect(result.current.interactionState.hoverLock.enabled).toBe(false);
    });

    it('drops the scroll hold when a handoff takes ownership so no second collapse path survives', () => {
      vi.useFakeTimers();
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      const countScrollListeners = () =>
        addEventListenerSpy.mock.calls.filter(([type]) => type === 'scroll').length -
        removeEventListenerSpy.mock.calls.filter(([type]) => type === 'scroll').length;

      const {testCard, secondTestCard} = selectFixtureCards();
      const shell = mountShell([testCard, secondTestCard]);
      const {result} = renderController({
        cards: [testCard, secondTestCard],
        viewportWidth: 1280,
        viewportTier: 'desktop',
        shellRef: {current: shell}
      });
      const cardRoot = findCardRoot(shell, testCard.variant);
      const secondCardRoot = findCardRoot(shell, secondTestCard.variant);
      stubCardBoundaryRect(shell, testCard.variant, CARD_RECT_BEFORE_SCROLL);
      stubCardBoundaryRect(shell, secondTestCard.variant, {top: 380, bottom: 700, left: 600, right: 900});

      dispatchPointerMove(cardRoot, POINTER_INSIDE_BEFORE_SCROLL);
      act(() => {
        result.current.resolveCardInteractionBindings(testCard).onMouseEnter(createMouseEvent(cardRoot));
      });
      act(() => {
        vi.advanceTimersByTime(DESKTOP_EXPAND_DELAY_MS + 1);
      });

      stubCardBoundaryRect(shell, testCard.variant, CARD_RECT_AFTER_SCROLL);
      dispatchWindowScroll();
      act(() => {
        result.current.resolveCardInteractionBindings(testCard).onMouseLeave(createMouseEvent(cardRoot));
      });
      act(() => {
        vi.advanceTimersByTime(DESKTOP_COLLAPSE_DELAY_MS + 1);
      });
      expect(result.current.interactionState.expandedCardVariant).toBe(testCard.variant);
      expect(countScrollListeners()).toBe(1);

      // handoff 가 hold 재판정보다 우선한다 — 두 번째 카드로 넘어가면 hold 는 남지 않는다.
      act(() => {
        result.current
          .resolveCardInteractionBindings(secondTestCard)
          .onMouseEnter(createMouseEvent(secondCardRoot));
      });
      expect(result.current.interactionState.expandedCardVariant).toBe(secondTestCard.variant);
      expect(countScrollListeners()).toBe(0);

      // 남은 hold 가 없으므로 두 번째 카드는 자기 유예대로 한 번만 닫힌다.
      act(() => {
        result.current
          .resolveCardInteractionBindings(secondTestCard)
          .onMouseLeave(createMouseEvent(secondCardRoot));
      });
      dispatchPointerMove(document.body, {clientX: 950, clientY: 950});
      act(() => {
        vi.advanceTimersByTime(DESKTOP_COLLAPSE_DELAY_MS + 1);
      });
      expect(result.current.interactionState.expandedCardVariant).toBeNull();
      expect(countScrollListeners()).toBe(0);
    });

    /**
     * 스크롤은 `mouseout` 만 위조하지 않는다 — 같은 프레임에 **다른 카드의 `mouseover`** 도
     * 위조한다. 실측(2026-09-10, chromium): 포인터가 `218,431` 에 고정된 채 `scrollY` 가
     * `0 → 372` 로 뛰자 `mouseout(qmbti → creativity-profile)` 과
     * `mouseover(creativity-profile ← qmbti)` 가 **좌표 변화 없이** 같은 시각에 났다.
     * `creativity-profile` 은 unavailable 이라 `onMouseEnter` 가 유예 없이 즉시 collapse 하며,
     * 그 경로의 `clearHoverTimer()` 가 스크롤 hold 까지 지운다 — 유예 기반 hold 로는 닿지 않는다.
     *
     * 판별자는 같다: **경계 이벤트가 실어 온 좌표가 마지막으로 기록된 포인터 위치와 같으면
     * 포인터는 움직이지 않은 것이다.** 정상 경로에서는 `mouseover` 가 `pointermove` 보다 먼저
     * 오므로 그 시점의 기록은 아직 이전 위치이고, 새 좌표와 크게 어긋난다.
     */
    it('ignores a card enter that scrolling forged under a stationary pointer', () => {
      vi.useFakeTimers();
      const {testCard, blogCard} = selectFixtureCards();
      const shell = mountShell([testCard, blogCard]);
      const {result} = renderController({
        cards: [testCard, blogCard],
        viewportWidth: 1280,
        viewportTier: 'desktop',
        shellRef: {current: shell}
      });
      const cardRoot = findCardRoot(shell, testCard.variant);
      const blogRoot = findCardRoot(shell, blogCard.variant);
      stubCardBoundaryRect(shell, testCard.variant, CARD_RECT_BEFORE_SCROLL);

      // 실측 순서대로: 진입(`mouseover`)이 먼저고 `pointermove` 가 뒤따른다. 그래서 진입
      // 시점의 기록은 아직 이전 위치이고, 이 진입은 위조가 아니다.
      act(() => {
        result.current.resolveCardInteractionBindings(testCard).onMouseEnter(
          createMouseEvent(cardRoot, POINTER_INSIDE_BEFORE_SCROLL)
        );
      });
      dispatchPointerMove(cardRoot, POINTER_INSIDE_BEFORE_SCROLL);
      act(() => {
        vi.advanceTimersByTime(DESKTOP_EXPAND_DELAY_MS + 1);
      });
      expect(result.current.interactionState.expandedCardVariant).toBe(testCard.variant);

      // 스크롤: 카드가 밀려나고 다른 카드가 **같은 좌표** 밑으로 들어온다.
      stubCardBoundaryRect(shell, testCard.variant, CARD_RECT_AFTER_SCROLL);
      dispatchWindowScroll();
      act(() => {
        result.current.resolveCardInteractionBindings(testCard).onMouseLeave(
          createMouseEvent(cardRoot, POINTER_INSIDE_BEFORE_SCROLL)
        );
        result.current.resolveCardInteractionBindings(blogCard).onMouseEnter(
          createMouseEvent(blogRoot, POINTER_INSIDE_BEFORE_SCROLL)
        );
      });

      // 즉시 닫히지 않는다.
      expect(result.current.interactionState.expandedCardVariant).toBe(testCard.variant);
      // 유예를 넘겨도 hold 가 살아 있어 열린 채다.
      act(() => {
        vi.advanceTimersByTime(DESKTOP_COLLAPSE_DELAY_MS + 1);
      });
      expect(result.current.interactionState.expandedCardVariant).toBe(testCard.variant);
    });

    it('still collapses immediately when a real pointer move enters a non-expanding card', () => {
      vi.useFakeTimers();
      const {testCard, blogCard} = selectFixtureCards();
      const shell = mountShell([testCard, blogCard]);
      const {result} = renderController({
        cards: [testCard, blogCard],
        viewportWidth: 1280,
        viewportTier: 'desktop',
        shellRef: {current: shell}
      });
      const cardRoot = findCardRoot(shell, testCard.variant);
      const blogRoot = findCardRoot(shell, blogCard.variant);
      stubCardBoundaryRect(shell, testCard.variant, CARD_RECT_BEFORE_SCROLL);

      // 실측 순서대로: 진입(`mouseover`)이 먼저고 `pointermove` 가 뒤따른다. 그래서 진입
      // 시점의 기록은 아직 이전 위치이고, 이 진입은 위조가 아니다.
      act(() => {
        result.current.resolveCardInteractionBindings(testCard).onMouseEnter(
          createMouseEvent(cardRoot, POINTER_INSIDE_BEFORE_SCROLL)
        );
      });
      dispatchPointerMove(cardRoot, POINTER_INSIDE_BEFORE_SCROLL);
      act(() => {
        vi.advanceTimersByTime(DESKTOP_EXPAND_DELAY_MS + 1);
      });
      expect(result.current.interactionState.expandedCardVariant).toBe(testCard.variant);

      // 진짜 포인터 이동: `mouseover` 가 `pointermove` 보다 먼저 오므로 기록된 위치는 아직
      // 이전 좌표이고, 이벤트가 실어 온 좌표는 그것과 크게 어긋난다. 이 경로는 그대로 즉시 닫는다
      // (`assertion:B13-hover-collapse` 가 지키는 계약).
      act(() => {
        result.current.resolveCardInteractionBindings(blogCard).onMouseEnter(
          createMouseEvent(blogRoot, {clientX: 900, clientY: 250})
        );
      });

      expect(result.current.interactionState.expandedCardVariant).toBeNull();
    });

    it('leaves Tap Mode untouched — no scroll hold, no viewport-exit listener', () => {
      installBrowserStubs(false);
      vi.useFakeTimers();
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const {testCard} = selectFixtureCards();
      const shell = mountShell([testCard]);
      const {result} = renderController({
        cards: [testCard],
        viewportWidth: 1280,
        viewportTier: 'desktop',
        shellRef: {current: shell}
      });
      const cardRoot = findCardRoot(shell, testCard.variant);
      const trigger = findCardChild<HTMLElement>(
        shell,
        testCard.variant,
        '[data-testid="landing-grid-card-trigger"]'
      );
      stubCardBoundaryRect(shell, testCard.variant, CARD_RECT_BEFORE_SCROLL);

      act(() => {
        result.current.resolveCardInteractionBindings(testCard).onFocus(createFocusEvent(trigger));
      });
      expect(result.current.interactionMode).toBe('tap');
      expect(result.current.interactionState.expandedCardVariant).toBe(testCard.variant);

      // hover 경로 전체가 tap 모드에서 no-op 이다: 스크롤도, 이탈도, 포인터 이동도 상태를 바꾸지 않는다.
      stubCardBoundaryRect(shell, testCard.variant, CARD_RECT_ABOVE_VIEWPORT);
      dispatchWindowScroll();
      act(() => {
        result.current.resolveCardInteractionBindings(testCard).onMouseLeave(createMouseEvent(cardRoot));
      });
      dispatchPointerMove(document.body, {clientX: 900, clientY: 900});
      act(() => {
        vi.advanceTimersByTime(DESKTOP_COLLAPSE_DELAY_MS + 1);
      });

      expect(result.current.interactionState.expandedCardVariant).toBe(testCard.variant);
      expect(addEventListenerSpy.mock.calls.filter(([type]) => type === 'scroll')).toHaveLength(0);
    });
  });
});
