import {JSDOM} from 'jsdom';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vitest';

import {createLandingCatalog} from '../../src/features/landing/data/adapter';
import type {LandingCardInteractionMode, LandingCardVisualState} from '../../src/features/landing/grid/landing-grid-card';
import {getDefaultCardCopy, LandingGridCard} from '../../src/features/landing/grid/landing-grid-card';

function renderCardDocument({
  card,
  state,
  locale = 'en',
  interactionMode = 'tap'
}: {
  card: ReturnType<typeof createLandingCatalog>[number];
  state: LandingCardVisualState;
  locale?: 'en' | 'kr';
  interactionMode?: LandingCardInteractionMode;
}): Document {
  const html = renderToStaticMarkup(
    createElement(LandingGridCard, {
      card,
      locale,
      state,
      interactionMode,
      copy: getDefaultCardCopy(),
      sequence: 0
    })
  );

  return new JSDOM(html).window.document;
}

describe('landing card slot contract', () => {
  it('keeps Normal slot order as title -> subtitle -> thumbnail -> tags and preserves empty-tags container', () => {
    const catalog = createLandingCatalog('en');
    const card = catalog.find((candidate) => candidate.id === 'test-debug-sample');

    if (!card) {
      throw new Error('Expected fixture card test-debug-sample');
    }

    const doc = renderCardDocument({card, state: 'normal'});
    const orderedSlots = Array.from(doc.querySelectorAll('.landing-grid-card-content > [data-slot]')).map(
      (element) => element.getAttribute('data-slot')
    );

    expect(orderedSlots).toEqual(['cardTitle', 'cardSubtitle', 'thumbnailOrIcon', 'tags']);
    expect(doc.querySelector('.landing-grid-card-tags-gap')).not.toBeNull();

    const tags = doc.querySelector('[data-slot="tags"]');
    expect(tags).not.toBeNull();
    expect(tags?.querySelectorAll('.landing-grid-card-tag-item').length).toBe(0);

    const cardElement = doc.querySelector('.landing-grid-card');
    expect(Number(cardElement?.getAttribute('data-base-gap') ?? '0')).toBeGreaterThan(0);
    expect(cardElement?.getAttribute('data-needs-comp')).toBe('false');
    expect(Number(cardElement?.getAttribute('data-comp-gap') ?? '1')).toBe(0);
  });

  it('renders Test Expanded slots without subtitle/thumbnail/tags and keeps exactly three meta items', () => {
    const catalog = createLandingCatalog('en');
    const card = catalog.find((candidate) => candidate.type === 'test' && candidate.availability === 'available');

    if (!card || card.type !== 'test') {
      throw new Error('Expected an available test card fixture');
    }

    const normalDoc = renderCardDocument({card, state: 'normal'});
    const expandedDoc = renderCardDocument({card, state: 'expanded'});

    expect(expandedDoc.querySelector('[data-slot="cardSubtitle"]')).toBeNull();
    expect(expandedDoc.querySelector('[data-slot="thumbnailOrIcon"]')).toBeNull();
    expect(expandedDoc.querySelector('[data-slot="tags"]')).toBeNull();

    expect(expandedDoc.querySelector('[data-slot="previewQuestion"]')).not.toBeNull();
    expect(expandedDoc.querySelector('[data-slot="answerChoiceA"]')).not.toBeNull();
    expect(expandedDoc.querySelector('[data-slot="answerChoiceB"]')).not.toBeNull();
    expect(expandedDoc.querySelectorAll('.landing-grid-card-meta-item')).toHaveLength(3);

    expect(expandedDoc.querySelector('[data-slot="primaryCTA"]')).toBeNull();

    const normalTitle = normalDoc.querySelector('[data-slot="cardTitle"]')?.textContent;
    const expandedTitle = expandedDoc.querySelector('[data-slot="cardTitle"]')?.textContent;
    expect(expandedTitle).toBe(normalTitle);
  });

  it('forces unavailable cards to stay normal even when expanded state is requested', () => {
    const catalog = createLandingCatalog('en');
    const unavailableCard = catalog.find((candidate) => candidate.id === 'test-coming-soon-1');

    if (!unavailableCard) {
      throw new Error('Expected test-coming-soon-1 unavailable card fixture');
    }

    const doc = renderCardDocument({
      card: unavailableCard,
      state: 'expanded',
      interactionMode: 'hover'
    });

    const cardElement = doc.querySelector('.landing-grid-card');
    expect(cardElement?.getAttribute('data-card-state')).toBe('normal');
    expect(cardElement?.getAttribute('data-interaction-mode')).toBe('hover');

    expect(doc.querySelector('[data-slot="previewQuestion"]')).toBeNull();
    expect(doc.querySelector('[data-slot="summary"]')).toBeNull();
    expect(doc.querySelector('[data-slot="primaryCTA"]')).toBeNull();
    expect(doc.querySelector('[data-slot="unavailableOverlay"]')).not.toBeNull();
  });

  it('renders Blog Expanded summary/meta/primaryCTA contract and formats numbers with comma separators', () => {
    const catalog = createLandingCatalog('en');
    const card = catalog.find((candidate) => candidate.id === 'blog-ops-handbook');

    if (!card || card.type !== 'blog') {
      throw new Error('Expected blog-ops-handbook as a blog card fixture');
    }

    const doc = renderCardDocument({card, state: 'expanded'});

    expect(doc.querySelector('[data-slot="summary"]')).not.toBeNull();
    expect(doc.querySelector('[data-slot="cardSubtitle"]')).toBeNull();
    expect(doc.querySelector('[data-slot="thumbnailOrIcon"]')).toBeNull();
    expect(doc.querySelector('[data-slot="tags"]')).toBeNull();

    expect(doc.querySelectorAll('.landing-grid-card-meta-item')).toHaveLength(3);

    const cta = doc.querySelector('[data-slot="primaryCTA"]');
    expect(cta).not.toBeNull();
    expect(cta?.getAttribute('href')).toBe('/en/blog');

    const metaValues = Array.from(doc.querySelectorAll('.landing-grid-card-meta-value')).map((element) =>
      element.textContent?.trim() ?? ''
    );

    expect(metaValues.some((value) => value.includes(','))).toBe(true);
    for (const value of metaValues) {
      expect(value).not.toMatch(/[km]$/iu);
    }
  });
});
