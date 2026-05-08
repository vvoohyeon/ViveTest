// @vitest-environment jsdom

import {act, cleanup, renderHook} from '@testing-library/react';
import type {MouseEvent as ReactMouseEvent, RefObject} from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

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

function createMatchMediaResult(query: string): MediaQueryList {
  return {
    matches: query.includes('(hover: hover)'),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn()
  };
}

function installBrowserStubs() {
  vi.stubGlobal('matchMedia', createMatchMediaResult);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    return window.setTimeout(() => callback(window.performance.now()), 0);
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id));
}

function selectFixtureCards() {
  const catalog = resolveLandingCatalog('en', {audience: 'qa'});
  const testCard = catalog.find((card) => card.variant === 'qmbti');
  const blogCard = catalog.find((card) => card.variant === 'ops-handbook');

  if (!testCard || testCard.type !== 'test' || !blogCard || blogCard.type !== 'blog') {
    throw new Error('Expected qmbti test card and ops-handbook blog card fixtures');
  }

  return {testCard, blogCard};
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

function createMouseEvent<T extends HTMLElement>(currentTarget: T) {
  return {
    currentTarget,
    timeStamp: 100,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn()
  } as unknown as ReactMouseEvent<T>;
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
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
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
    expect(second.onPrimaryCtaClick).toBe(first.onPrimaryCtaClick);
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

  it('passes the latest blog card object to primary CTA callbacks after cards rerender', () => {
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

    const cta = findCardChild<HTMLAnchorElement>(shell, blogCard.variant, '[data-slot="primaryCTA"]');
    act(() => {
      hook.result.current.resolveCardInteractionBindings(updatedBlogCard).onPrimaryCtaClick(createMouseEvent(cta));
    });

    expect(onPrimaryCtaSelect.mock.calls[0]?.[0]).toBe(updatedBlogCard);
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
