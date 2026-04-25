// @vitest-environment jsdom

import {afterEach, describe, expect, it, vi} from 'vitest';

import {
  focusCardByVariant,
  getCardRootElement,
  getExpandedFocusableElements,
  isDocumentLevelFocusTarget,
  isMobileCardElement,
  isVisibleFocusableElement,
  queueFocusCallback,
  queueFocusCardByVariant,
  resolveAdjacentCardVariant,
  resolveCardBoundaryElement
} from '../../src/features/landing/grid/interaction-dom';
import {useKeyboardHandoff} from '../../src/features/landing/grid/use-keyboard-handoff';

function mountShell() {
  document.body.innerHTML = `
    <main data-testid="landing-shell">
      <article data-testid="landing-grid-card" data-card-variant="qmbti" data-card-viewport-tier="desktop">
        <button data-testid="landing-grid-card-trigger">QMBTI</button>
        <section data-slot="expandedBody">
          <button>Answer A</button>
          <a href="/en/test/qmbti">Start</a>
          <button disabled>Disabled</button>
          <button aria-hidden="true">Hidden</button>
        </section>
      </article>
      <article data-testid="landing-grid-card" data-card-variant="energy-check" data-card-viewport-tier="mobile">
        <button data-testid="landing-grid-card-trigger">Energy</button>
      </article>
    </main>
  `;

  return document.querySelector<HTMLElement>('[data-testid="landing-shell"]')!;
}

describe('landing interaction DOM helpers', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('resolves card roots, focusable expanded children, and adjacent variants', () => {
    const shell = mountShell();
    const answerButton = shell.querySelector<HTMLElement>('[data-slot="expandedBody"] button')!;
    const card = getCardRootElement(answerButton)!;

    expect(card.dataset.cardVariant).toBe('qmbti');
    expect(getExpandedFocusableElements(card).map((element) => element.textContent)).toEqual(['Answer A', 'Start']);
    expect(resolveAdjacentCardVariant(['qmbti', 'energy-check'], 'qmbti', 1)).toBe('energy-check');
    expect(resolveAdjacentCardVariant(['qmbti', 'energy-check'], 'qmbti', -1)).toBeNull();
  });

  it('focuses card triggers by variant and reports document-level focus targets', () => {
    const shell = mountShell();

    expect(focusCardByVariant(shell, 'energy-check')).toBe(true);
    expect(document.activeElement?.textContent).toBe('Energy');
    expect(focusCardByVariant(shell, 'missing')).toBe(false);
    expect(isDocumentLevelFocusTarget(document.body)).toBe(true);
    expect(isDocumentLevelFocusTarget(shell)).toBe(false);
  });

  it('detects visible focusable elements and mobile card roots', () => {
    const shell = mountShell();
    const mobileTrigger = shell.querySelector<HTMLElement>('[data-card-variant="energy-check"] button')!;
    const hidden = document.createElement('button');
    hidden.hidden = true;

    expect(isVisibleFocusableElement(mobileTrigger)).toBe(true);
    expect(isVisibleFocusableElement(hidden)).toBe(false);
    expect(isMobileCardElement(mobileTrigger)).toBe(true);
  });

  it('resolves the expanded body as the preferred card boundary', () => {
    const shell = mountShell();

    expect(resolveCardBoundaryElement(shell, 'qmbti')?.getAttribute('data-slot')).toBe('expandedBody');
    expect(resolveCardBoundaryElement(shell, 'energy-check')?.getAttribute('data-testid')).toBe(
      'landing-grid-card-trigger'
    );
    expect(resolveCardBoundaryElement(shell, 'missing')).toBeNull();
  });

  it('queues focus callbacks behind a double requestAnimationFrame', () => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      return window.setTimeout(() => callback(performance.now()), 0);
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id));
    const spy = vi.fn();

    queueFocusCallback(spy);
    vi.runAllTimers();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('queues card trigger focus behind a double requestAnimationFrame', () => {
    const shell = mountShell();
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      return window.setTimeout(() => callback(performance.now()), 0);
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id));

    queueFocusCardByVariant(shell, 'qmbti');
    vi.runAllTimers();

    expect(document.activeElement?.textContent).toBe('QMBTI');
  });

  it('exposes the keyboard handoff hook entrypoint', () => {
    expect(typeof useKeyboardHandoff).toBe('function');
  });
});
