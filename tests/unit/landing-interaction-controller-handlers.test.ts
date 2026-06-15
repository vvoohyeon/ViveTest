// @vitest-environment jsdom

import {act, cleanup, renderHook} from '@testing-library/react';
import type {
  FocusEvent as ReactFocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  RefObject
} from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {DESKTOP_EXPAND_DELAY_MS} from '../../src/features/landing/grid/hover-intent';
import type {LandingCardViewportTier} from '../../src/features/landing/grid/landing-grid-card';
import {MOBILE_EXPANDED_DURATION_MS} from '../../src/features/landing/grid/mobile-lifecycle';
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
  init: Partial<Pick<ReactMouseEvent<T>, 'altKey' | 'button' | 'ctrlKey' | 'metaKey' | 'shiftKey'>> = {}
) {
  return {
    currentTarget,
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

  it('ignores both card-root close handlers on Mobile', () => {
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

    expect(keyEvent.preventDefault).not.toHaveBeenCalled();
    expect(keyEvent.stopPropagation).not.toHaveBeenCalled();
    expect(result.current.interactionState).toEqual(beforeInteraction);
    expect(result.current.mobileLifecycleState).toEqual(beforeLifecycle);
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
    expect(second.onMobileClose).toBe(first.onMobileClose);
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

  it('prevents default and starts mobile close from the X-button handler', () => {
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
    act(() => {
      vi.advanceTimersByTime(MOBILE_EXPANDED_DURATION_MS);
    });

    expect(result.current.mobileLifecycleState.phase).toBe('OPEN');

    const closeButton = findCardChild<HTMLButtonElement>(shell, testCard.variant, '[data-slot="mobileClose"]');
    const closeEvent = createMouseEvent(closeButton);
    act(() => {
      result.current.resolveCardInteractionBindings(testCard).onMobileClose(closeEvent);
    });

    expect(closeEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(result.current.mobileLifecycleState.phase).toBe('CLOSING');
  });
});
