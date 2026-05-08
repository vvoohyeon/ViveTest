// @vitest-environment jsdom

import {afterEach, describe, expect, it, vi} from 'vitest';

import {focusFirstLandingCardTrigger, isVisibleFocusableGnbElement} from '../../src/features/gnb/gnb-keyboard-dom';

function mountLandingCards() {
  document.body.innerHTML = `
    <main>
      <article data-testid="landing-grid-card">
        <button data-testid="landing-grid-card-trigger">First</button>
      </article>
      <article data-testid="landing-grid-card">
        <button data-testid="landing-grid-card-trigger">Second</button>
      </article>
    </main>
  `;
}

describe('gnb keyboard DOM helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('focuses the first visible trigger that is neither inert nor aria-disabled', () => {
    mountLandingCards();

    expect(focusFirstLandingCardTrigger()).toBe(true);
    expect(document.activeElement?.textContent).toBe('First');
  });

  it('skips a trigger inside an inert card root and focuses the next eligible trigger', () => {
    document.body.innerHTML = `
      <main>
        <article data-testid="landing-grid-card" inert>
          <button data-testid="landing-grid-card-trigger">Inert</button>
        </article>
        <article data-testid="landing-grid-card">
          <button data-testid="landing-grid-card-trigger">Eligible</button>
        </article>
      </main>
    `;

    expect(focusFirstLandingCardTrigger()).toBe(true);
    expect(document.activeElement?.textContent).toBe('Eligible');
  });

  it('skips a trigger with aria-disabled="true"', () => {
    document.body.innerHTML = `
      <main>
        <article data-testid="landing-grid-card">
          <button data-testid="landing-grid-card-trigger" aria-disabled="true">Disabled</button>
        </article>
        <article data-testid="landing-grid-card">
          <button data-testid="landing-grid-card-trigger">Eligible</button>
        </article>
      </main>
    `;

    expect(focusFirstLandingCardTrigger()).toBe(true);
    expect(document.activeElement?.textContent).toBe('Eligible');
  });

  it('returns false when all triggers are hidden, inside inert subtrees, or aria-disabled', () => {
    document.body.innerHTML = `
      <main>
        <article data-testid="landing-grid-card">
          <button data-testid="landing-grid-card-trigger" hidden>Hidden</button>
        </article>
        <article data-testid="landing-grid-card" inert>
          <button data-testid="landing-grid-card-trigger">Inert</button>
        </article>
        <article data-testid="landing-grid-card">
          <button data-testid="landing-grid-card-trigger" aria-disabled="true">Disabled</button>
        </article>
      </main>
    `;

    expect(focusFirstLandingCardTrigger()).toBe(false);
    expect(document.activeElement).toBe(document.body);
  });

  it('returns false without throwing when document is unavailable', () => {
    vi.stubGlobal('document', undefined);

    expect(focusFirstLandingCardTrigger()).toBe(false);
  });

  it('excludes disabled GNB controls from visible focusable targets', () => {
    const disabled = document.createElement('button');
    const ariaDisabled = document.createElement('button');
    const enabled = document.createElement('button');
    disabled.disabled = true;
    ariaDisabled.setAttribute('aria-disabled', 'true');

    expect(isVisibleFocusableGnbElement(enabled)).toBe(true);
    expect(isVisibleFocusableGnbElement(disabled)).toBe(false);
    expect(isVisibleFocusableGnbElement(ariaDisabled)).toBe(false);
  });
});
