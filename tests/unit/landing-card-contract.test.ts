import {JSDOM} from 'jsdom';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vitest';

import type {AppLocale} from '../../src/config/site';
import {createLandingCatalog} from '../../src/features/landing/data/adapter';
import type {
  LandingCardDesktopMotionRole,
  LandingCardDesktopShellPhase
} from '../../src/features/landing/grid/desktop-shell-phase';
import type {LandingCardInteractionMode, LandingCardVisualState} from '../../src/features/landing/grid/landing-grid-card';
import {getDefaultCardCopy, LandingGridCard} from '../../src/features/landing/grid/landing-grid-card';

function renderCardDocument({
  card,
  state,
  locale = 'en',
  interactionMode = 'tap',
  hasAssetMedia = false,
  desktopMotionRole = 'idle',
  desktopShellPhase = 'idle'
}: {
  card: ReturnType<typeof createLandingCatalog>[number];
  state: LandingCardVisualState;
  locale?: AppLocale;
  interactionMode?: LandingCardInteractionMode;
  hasAssetMedia?: boolean;
  desktopMotionRole?: LandingCardDesktopMotionRole;
  desktopShellPhase?: LandingCardDesktopShellPhase;
}): Document {
  const html = renderToStaticMarkup(
    createElement(LandingGridCard, {
      card,
      hasAssetMedia,
      locale,
      state,
      interactionMode,
      viewportTier: 'desktop',
      desktopMotionRole,
      desktopShellPhase,
      copy: getDefaultCardCopy(),
      sequence: 0
    })
  );

  return new JSDOM(html, {url: `https://example.test/${locale}`}).window.document;
}

function renderDesktopExpandedCardDocument({
  card,
  locale = 'en',
  interactionMode = 'hover'
}: {
  card: ReturnType<typeof createLandingCatalog>[number];
  locale?: AppLocale;
  interactionMode?: LandingCardInteractionMode;
}): Document {
  return renderCardDocument({
    card,
    locale,
    state: 'expanded',
    interactionMode,
    desktopMotionRole: 'steady',
    desktopShellPhase: 'steady'
  });
}

describe('landing card slot contract', () => {
  it('keeps Normal slot order as title -> thumbnail -> subtitle -> tags and preserves empty-tags container', () => {
    const catalog = createLandingCatalog('en', {audience: 'qa'});
    const card = catalog.find((candidate) => candidate.variant === 'debug-sample');

    if (!card) {
      throw new Error('Expected fixture card debug-sample');
    }

    const doc = renderCardDocument({card, state: 'normal'});
    const orderedSlots = Array.from(doc.querySelectorAll('.landing-grid-card-content > [data-slot]')).map(
      (element) => element.getAttribute('data-slot')
    );

    expect(orderedSlots).toEqual(['cardTitle', 'thumbnailOrIcon', 'cardSubtitle', 'tags']);
    expect(doc.querySelector('.landing-grid-card-tags-gap')).not.toBeNull();

    const tags = doc.querySelector('[data-slot="tags"]');
    expect(tags).not.toBeNull();
    expect(tags?.querySelectorAll('.landing-grid-card-tag-item').length).toBe(0);

    const cardElement = doc.querySelector('.landing-grid-card');
    expect(Number(cardElement?.getAttribute('data-base-gap') ?? '0')).toBeGreaterThan(0);
    expect(cardElement?.getAttribute('data-needs-comp')).toBe('false');
    expect(Number(cardElement?.getAttribute('data-comp-gap') ?? '1')).toBe(0);
  });

  it('resolves thumbnail media from variant assets first and falls back to generated SVG when missing', () => {
    const catalog = createLandingCatalog('en', {audience: 'qa'});
    const assetCard = catalog.find((candidate) => candidate.variant === 'qmbti');
    const fallbackCard = catalog.find((candidate) => candidate.variant === 'build-metrics');

    if (!assetCard || !fallbackCard) {
      throw new Error('Expected qmbti and build-metrics fixture cards');
    }

    const assetDoc = renderCardDocument({card: assetCard, state: 'normal', hasAssetMedia: true});
    const fallbackDoc = renderCardDocument({card: fallbackCard, state: 'normal'});

    const assetSrc = assetDoc.querySelector('.landing-grid-card-thumbnail')?.getAttribute('src');
    const fallbackSrc = fallbackDoc.querySelector('.landing-grid-card-thumbnail')?.getAttribute('src');

    expect(assetSrc).toContain('/landing-card-media/qmbti/thumbnail.svg');
    expect(fallbackSrc).toMatch(/^data:image\/svg\+xml,/u);
  });

  it('renders Test Expanded slots without subtitle/thumbnail/tags and keeps exactly three meta items', () => {
    const catalog = createLandingCatalog('en');
    const card = catalog.find((candidate) => candidate.type === 'test' && candidate.availability === 'available');

    if (!card || card.type !== 'test') {
      throw new Error('Expected an available test card fixture');
    }

    const normalDoc = renderCardDocument({card, state: 'normal'});
    const expandedDoc = renderDesktopExpandedCardDocument({card});

    expect(expandedDoc.querySelector('[data-slot="cardSubtitle"]')).toBeNull();
    expect(expandedDoc.querySelector('[data-slot="thumbnailOrIcon"]')).toBeNull();
    expect(expandedDoc.querySelector('[data-slot="tags"]')).toBeNull();

    expect(expandedDoc.querySelector('[data-slot="expandedSurface"]')).not.toBeNull();
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
    const unavailableCard = catalog.find((candidate) => candidate.variant === 'creativity-profile');

    if (!unavailableCard) {
      throw new Error('Expected creativity-profile unavailable card fixture');
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
    expect(doc.querySelector('[data-slot="cardSubtitleExpanded"]')).toBeNull();
    expect(doc.querySelector('[data-slot="primaryCTA"]')).toBeNull();
    expect(doc.querySelector('[data-slot="unavailableOverlay"]')).not.toBeNull();
  });

  it('renders Blog Expanded subtitle/meta/primaryCTA contract and formats numbers with comma separators', () => {
    const catalog = createLandingCatalog('en');
    const card = catalog.find((candidate) => candidate.variant === 'ops-handbook');

    if (!card || card.type !== 'blog') {
      throw new Error('Expected ops-handbook as a blog card fixture');
    }

    const doc = renderDesktopExpandedCardDocument({card});

    expect(doc.querySelector('[data-slot="expandedSurface"]')).not.toBeNull();
    expect(doc.querySelector('[data-slot="cardSubtitleExpanded"]')).not.toBeNull();
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

  it('keeps desktop blog expanded subtitle continuity as lead + overflow === source subtitle', () => {
    const catalog = createLandingCatalog('en');
    const card = catalog.find((candidate) => candidate.variant === 'ops-handbook');

    if (!card || card.type !== 'blog') {
      throw new Error('Expected ops-handbook as a blog card fixture');
    }

    const doc = renderDesktopExpandedCardDocument({card});
    const expandedSubtitle = doc.querySelector('[data-slot="cardSubtitleExpanded"]');
    const lead = expandedSubtitle?.querySelector('[data-subtitle-layer="lead"]');
    const overflow = expandedSubtitle?.querySelector('[data-subtitle-layer="overflow"]');

    expect(expandedSubtitle).not.toBeNull();
    expect(expandedSubtitle?.className).toContain('landing-grid-card-subtitle-expanded');
    expect(lead).not.toBeNull();
    expect(overflow).not.toBeNull();
    expect(`${lead?.textContent ?? ''}${overflow?.textContent ?? ''}`).toBe(card.subtitle);
  });

  it('renders desktop expanded title continuity markers while preserving the full title text', () => {
    const catalog = createLandingCatalog('en');
    const card = catalog.find((candidate) => candidate.variant === 'rhythm-b');

    if (!card) {
      throw new Error('Expected rhythm-b as a long-title card fixture');
    }

    const doc = renderDesktopExpandedCardDocument({card});
    const expandedTitle = doc.querySelector('[data-slot="cardTitleExpanded"]');
    const line1 = expandedTitle?.querySelector('[data-title-layer="line1"]');
    const overflow = expandedTitle?.querySelector('[data-title-layer="overflow"]');

    expect(expandedTitle).not.toBeNull();
    expect(line1).not.toBeNull();
    expect(overflow).not.toBeNull();
    expect(expandedTitle?.textContent).toBe(card.title);
    expect(doc.querySelector('[data-slot="cardTitle"]')?.textContent).toBe(card.title);
  });
});
