import {readFileSync} from 'node:fs';

import {JSDOM} from 'jsdom';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vitest';

import type {AppLocale} from '../../src/config/site';
import type {
  LandingCardDesktopMotionRole,
  LandingCardDesktopShellPhase
} from '../../src/features/landing/grid/desktop-shell-phase';
import type {
  LandingCardInteractionMode,
  LandingCardMobilePhase,
  LandingCardViewportTier,
  LandingCardVisualState
} from '../../src/features/landing/grid/landing-grid-card';
import {getDefaultCardCopy, LandingGridCard} from '../../src/features/landing/grid/landing-grid-card';
import {LANDING_OVERLAY_VIEWPORT_INSET_PX} from '../../src/features/landing/grid/layout-plan';
import {resolveLandingCatalog} from '../../src/features/variant-registry';

function readLandingGridCardCss(): string {
  return readFileSync(
    new URL('../../src/features/landing/grid/landing-grid-card.module.css', import.meta.url),
    'utf8'
  );
}

// 카드는 다섯 파일이다(step 1 이음매 분리). 클래스 문자열 상수는 `-classnames.ts` 가, 접힌
// 얼굴의 인라인 클래스는 `-normal-face.tsx` 가 갖는다 — 아래 두 계약은 이름을 따라 옮겨 간다.
function readLandingGridCardClassnamesSource(): string {
  return readFileSync(
    new URL('../../src/features/landing/grid/landing-grid-card-classnames.ts', import.meta.url),
    'utf8'
  );
}

function readLandingGridCardNormalFaceSource(): string {
  return readFileSync(
    new URL('../../src/features/landing/grid/landing-grid-card-normal-face.tsx', import.meta.url),
    'utf8'
  );
}

function readGlobalTokens(): string {
  return readFileSync(new URL('../../src/app/globals.css', import.meta.url), 'utf8');
}

function extractSourceAssignment(source: string, constantName: string): string {
  const assignment = source.match(new RegExp(`const ${constantName}\\s*=\\s*([\\s\\S]*?);`, 'u'))?.[1];

  if (!assignment) {
    throw new Error(`Expected ${constantName} source assignment.`);
  }

  return assignment;
}

function extractReadMoreClassSource(source: string): string {
  const classLiteral = source.match(/'landing-grid-card-blog-read-more[^']*'/u)?.[0];

  if (!classLiteral) {
    throw new Error('Expected landing-grid-card-blog-read-more class literal.');
  }

  return classLiteral;
}

function renderCardDocument({
  card,
  state,
  locale = 'en',
  interactionMode = 'tap',
  hasAssetMedia = false,
  desktopMotionRole = 'idle',
  desktopShellPhase = 'idle',
  viewportTier = 'desktop',
  mobilePhase = 'NORMAL',
  tabIndex,
  ariaDisabled
}: {
  card: ReturnType<typeof resolveLandingCatalog>[number];
  state: LandingCardVisualState;
  locale?: AppLocale;
  interactionMode?: LandingCardInteractionMode;
  hasAssetMedia?: boolean;
  desktopMotionRole?: LandingCardDesktopMotionRole;
  desktopShellPhase?: LandingCardDesktopShellPhase;
  viewportTier?: LandingCardViewportTier;
  mobilePhase?: LandingCardMobilePhase;
  tabIndex?: number;
  ariaDisabled?: boolean;
}): Document {
  const html = renderToStaticMarkup(
    createElement(LandingGridCard, {
      card,
      hasAssetMedia,
      locale,
      state,
      interactionMode,
      viewportTier,
      mobilePhase,
      desktopMotionRole,
      desktopShellPhase,
      copy: getDefaultCardCopy(),
      sequence: 0,
      tabIndex,
      ariaDisabled
    })
  );

  return new JSDOM(html, {url: `https://example.test/${locale}`}).window.document;
}

function renderDesktopExpandedCardDocument({
  card,
  locale = 'en',
  interactionMode = 'hover'
}: {
  card: ReturnType<typeof resolveLandingCatalog>[number];
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
  it('keeps Normal slot order as thumbnail -> title -> subtitle -> tags and preserves empty-tags container', () => {
    const catalog = resolveLandingCatalog('en', {audience: 'qa'});
    const card = catalog.find((candidate) => candidate.variant === 'debug-sample');

    if (!card) {
      throw new Error('Expected fixture card debug-sample');
    }

    const doc = renderCardDocument({card, state: 'normal'});
    const orderedSlots = Array.from(doc.querySelectorAll('.landing-grid-card-content > [data-slot]')).map(
      (element) => element.getAttribute('data-slot')
    );

    expect(orderedSlots).toEqual(['cardThumbnail', 'cardTitle', 'cardSubtitle', 'tags']);
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
    const catalog = resolveLandingCatalog('en', {audience: 'qa'});
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
    const catalog = resolveLandingCatalog('en');
    const card = catalog.find((candidate) => candidate.type === 'test' && candidate.availability === 'available');

    if (!card || card.type !== 'test') {
      throw new Error('Expected an available test card fixture');
    }

    const normalDoc = renderCardDocument({card, state: 'normal'});
    const expandedDoc = renderDesktopExpandedCardDocument({card});

    expect(expandedDoc.querySelector('[data-slot="cardSubtitle"]')).toBeNull();
    expect(expandedDoc.querySelector('[data-slot="cardThumbnail"]')).toBeNull();
    expect(expandedDoc.querySelector('[data-slot="tags"]')).toBeNull();

    const expandedTitles = expandedDoc.querySelectorAll('[data-slot="cardTitle"]');
    expect(expandedTitles).toHaveLength(1);
    expect(expandedTitles[0]?.className).toContain('landing-grid-card-title-normal');

    expect(expandedDoc.querySelector('[data-slot="expandedSurface"]')).not.toBeNull();
    expect(expandedDoc.querySelector('[data-slot="previewQuestion"]')).not.toBeNull();
    expect(expandedDoc.querySelector('[data-slot="answerChoiceA"]')).not.toBeNull();
    expect(expandedDoc.querySelector('[data-slot="answerChoiceB"]')).not.toBeNull();

    // Wave 4: each choice renders answer text + a decorative arrow that stays out of the accessible name.
    const expandedChoiceA = expandedDoc.querySelector('[data-slot="answerChoiceA"]');
    const expandedChoiceArrow = expandedChoiceA?.querySelector('.landing-grid-card-answer-choice-arrow');
    expect(expandedChoiceArrow?.getAttribute('aria-hidden')).toBe('true');
    expect(expandedChoiceArrow?.textContent?.trim()).toBe('→');
    expect(
      (expandedChoiceA?.querySelector('.landing-grid-card-answer-choice-text')?.textContent ?? '').length
    ).toBeGreaterThan(0);

    // Inline quiet data row (design §6.10): three "value label" items in a single dot-separated
    // row, with the complete duration item emphasized and decorative dot separators.
    const expandedMetaItems = Array.from(expandedDoc.querySelectorAll('.landing-grid-card-meta-item'));
    expect(expandedMetaItems).toHaveLength(3);
    for (const item of expandedMetaItems) {
      expect((item.querySelector('.landing-grid-card-meta-value')?.textContent ?? '').trim().length).toBeGreaterThan(0);
      expect((item.querySelector('.landing-grid-card-meta-label')?.textContent ?? '').trim().length).toBeGreaterThan(0);
    }
    expect(expandedMetaItems[0]?.tagName.toLowerCase()).toBe('strong');
    expect(expandedMetaItems[0]?.className).toContain('landing-grid-card-meta-item-lead');
    expect(expandedMetaItems[1]?.tagName.toLowerCase()).toBe('span');
    expect(expandedMetaItems[2]?.tagName.toLowerCase()).toBe('span');
    expect(expandedMetaItems[1]?.className).not.toContain('landing-grid-card-meta-item-lead');
    expect(expandedMetaItems[2]?.className).not.toContain('landing-grid-card-meta-item-lead');
    expect(expandedDoc.querySelectorAll('.landing-grid-card-meta-separator')).toHaveLength(2);

    expect(expandedDoc.querySelector('[data-slot="primaryCTA"]')).toBeNull();

    const normalTitle = normalDoc.querySelector('[data-slot="cardTitle"]')?.textContent;
    const expandedTitle = expandedDoc.querySelector('[data-slot="cardTitle"]')?.textContent;
    expect(expandedTitle).toBe(normalTitle);
  });

  it('keeps closing and cleanup shells mounted while removing choices from public interaction', () => {
    const card = resolveLandingCatalog('en').find(
      (candidate) => candidate.type === 'test' && candidate.availability === 'available'
    );

    if (!card || card.type !== 'test') {
      throw new Error('Expected an available Test card');
    }

    for (const desktopShellPhase of ['closing', 'cleanup-pending'] as const) {
      const doc = renderCardDocument({
        card,
        state: 'expanded',
        desktopMotionRole: desktopShellPhase === 'closing' ? 'closing' : 'idle',
        desktopShellPhase
      });
      const visualChoices = doc.querySelectorAll('.landing-grid-card-answer-choice');

      expect(doc.querySelector('[data-slot="expandedShell"]')).not.toBeNull();
      expect(doc.querySelector('[data-slot="answerChoiceA"]')).toBeNull();
      expect(doc.querySelector('[data-slot="answerChoiceB"]')).toBeNull();
      expect(visualChoices).toHaveLength(2);
      for (const choice of visualChoices) {
        expect(choice.getAttribute('tabindex')).toBe('-1');
        expect(choice.getAttribute('aria-hidden')).toBe('true');
      }
    }
  });

  it('assigns stable trigger-owned disclosure and card semantics without concatenated labels', () => {
    const catalog = resolveLandingCatalog('en');
    const testCard = catalog.find((candidate) => candidate.variant === 'qmbti');
    const blogCard = catalog.find((candidate) => candidate.variant === 'ops-handbook');
    const unavailableCard = catalog.find((candidate) => candidate.variant === 'creativity-profile');

    if (!testCard || testCard.type !== 'test' || !blogCard || !unavailableCard) {
      throw new Error('Expected Test, Blog, and unavailable fixtures');
    }

    for (const [phase, expanded, stageHidden] of [
      ['idle', 'false', 'true'],
      ['opening', 'true', null],
      ['steady', 'true', null],
      ['handoff-target', 'true', null],
      ['closing', 'false', 'true'],
      ['cleanup-pending', 'false', 'true'],
      ['handoff-source', 'false', 'true']
    ] as const) {
      const doc = renderCardDocument({
        card: testCard,
        state: expanded === 'true' ? 'expanded' : 'normal',
        desktopMotionRole: phase === 'cleanup-pending' ? 'idle' : phase,
        desktopShellPhase: phase
      });
      const trigger = doc.querySelector('[data-slot="primaryTrigger"]');
      const stage = doc.querySelector('[data-slot="desktopStage"]');

      expect(trigger?.getAttribute('aria-label')).toBe(testCard.title);
      expect(trigger?.getAttribute('aria-labelledby')).toBeNull();
      expect(trigger?.getAttribute('aria-expanded')).toBe(expanded);
      expect(trigger?.getAttribute('aria-controls')).toBeNull();
      expect(stage?.getAttribute('aria-hidden')).toBe(stageHidden);
    }

    const expandedDoc = renderDesktopExpandedCardDocument({card: testCard});
    for (const selector of [
      '[data-slot="previewQuestion"]',
      '[data-slot="answerChoiceA"]',
      '[data-slot="answerChoiceB"]'
    ]) {
      expect(expandedDoc.querySelector(selector)?.closest('[aria-hidden="true"], [inert]')).toBeNull();
    }

    const blogDoc = renderCardDocument({card: blogCard, state: 'normal'});
    const blogTrigger = blogDoc.querySelector('[data-slot="primaryTrigger"]');
    expect(blogTrigger?.getAttribute('aria-label')).toBe(blogCard.title);
    expect(blogTrigger?.getAttribute('aria-expanded')).toBeNull();
    expect(blogTrigger?.getAttribute('aria-controls')).toBeNull();

    const unavailableDoc = renderCardDocument({
      card: unavailableCard,
      state: 'normal',
      ariaDisabled: true,
      tabIndex: -1
    });
    const unavailableRoot = unavailableDoc.querySelector('[data-testid="landing-grid-card"]');
    const unavailableTrigger = unavailableDoc.querySelector('[data-slot="primaryTrigger"]');
    const labelledBy = unavailableTrigger?.getAttribute('aria-labelledby');
    const describedBy = unavailableTrigger?.getAttribute('aria-describedby');
    expect(unavailableRoot?.getAttribute('aria-disabled')).toBeNull();
    expect(unavailableTrigger?.getAttribute('aria-disabled')).toBe('true');
    expect(labelledBy).not.toBeNull();
    expect(describedBy).not.toBeNull();
    expect(unavailableDoc.getElementById(labelledBy ?? '')?.textContent).toBe(unavailableCard.title);
    expect(unavailableDoc.getElementById(describedBy ?? '')?.getAttribute('data-slot')).toBe('comingSoonTag');
    expect(unavailableDoc.getElementById(describedBy ?? '')?.closest('[aria-hidden="true"]')).toBeNull();
    expect(unavailableDoc.querySelector('[data-slot="tags"]')?.getAttribute('aria-label')).toBeNull();
    expect(unavailableDoc.querySelector('[aria-live]')).toBeNull();
  });

  it('keeps the expanded focus-visible ring card-scoped and aligned with the surface boundary', () => {
    const cardCss = readLandingGridCardCss();
    const expandedFocusRule = cardCss.match(
      /\.root\.desktopOverlayLayer:has\(:focus-visible\) \.expandedSurface \{(?<body>[^}]*)\}/u
    )?.groups?.body;

    expect(expandedFocusRule).toBeDefined();
    expect(expandedFocusRule).toContain('outline: 2px solid var(--normal-focus-ring);');
    expect(expandedFocusRule).toContain('outline-offset: 2px;');
    expect(expandedFocusRule).not.toContain('--focus-ring-outer');
    expect(expandedFocusRule).not.toContain('--focus-ring-inner');
  });

  it('anchors Wave 12 mobile Normal typography, shared tag, and Blog CTA source contracts', () => {
    const cardCss = readLandingGridCardCss();
    const cardClassnamesSource = readLandingGridCardClassnamesSource();
    const cardNormalFaceSource = readLandingGridCardNormalFaceSource();
    // D-06: `design.md` §4.3 states ONE global wrapping rule, so this is no longer
    // scoped to the mobile tier. The tier attribute must NOT reappear on it.
    const normalTextRule = cardCss.match(
      /\.root\s+:global\(\.landing-grid-card-title-normal\),\s*\.root\s+:global\(\.landing-grid-card-subtitle-normal\)\s*\{(?<body>[^}]*)\}/u
    )?.groups?.body;
    const sharedTagRule = cardCss.match(/\.root\s+:global\(\.landing-grid-card-tag-chip\)\s*\{(?<body>[^}]*)\}/u)
      ?.groups?.body;
    const blogReadMoreRule = cardCss.match(/\.blogReadMore\s*\{(?<body>[^}]*)\}/u)?.groups?.body;

    expect(normalTextRule).toBeDefined();
    expect(normalTextRule).toContain('word-break: keep-all;');
    expect(normalTextRule).toContain('overflow-wrap: anywhere;');
    expect(cardCss).not.toMatch(
      /\.root\[data-card-viewport-tier=['"]mobile['"]\]\s+:global\(\.landing-grid-card-title-normal\)/u
    );
    expect(sharedTagRule).toBeDefined();
    expect(sharedTagRule).toContain('line-height: 1.35;');
    // 2026-09-07 theme cut: 이 토큰은 카드 모듈의 스코프 리터럴에서 전역 계층으로 올라갔다
    // (BQ-21 namespace 정착). 모듈이 값을 갖지 않는 것이 이제 계약이며, 값 자체는 전역이 갖는다.
    // 지킬 불변식은 CTA 가 자기 잉크 토큰을 갖는다는 것 — 아래 두 줄과 본문 잉크 금지 —
    // 이지 특정 hex 가 어느 파일에 있느냐가 아니다. 5c 묶음 C 에서 `--muted-ink` 별칭이
    // 은퇴하며 그것이 가리키던 `--ink-body` 로 옮겼다: 금지 대상은 이름이 아니라 역할이다.
    expect(cardCss).not.toContain('--blog-read-more-ink:');
    expect(readGlobalTokens()).toMatch(/^\s*--blog-read-more-ink:\s*#[0-9a-f]{6};/mu);
    expect(blogReadMoreRule).toContain('color: var(--blog-read-more-ink);');
    expect(blogReadMoreRule).toContain('text-decoration: none;');
    expect(extractSourceAssignment(cardClassnamesSource, 'LANDING_GRID_CARD_TAG_CHIP_CLASSNAME')).not.toContain(
      'leading-[1.2]'
    );
    expect(extractReadMoreClassSource(cardNormalFaceSource)).not.toContain('text-[var(--ink-body)]');
  });

  it('forces unavailable cards to stay normal even when expanded state is requested', () => {
    const catalog = resolveLandingCatalog('en');
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
    // D2/BQ-26: the legacy top-right overlay pill is removed.
    expect(doc.querySelector('[data-slot="unavailableOverlay"]')).toBeNull();
  });

  it('renders the unavailable card as a semantic disabled button with a standard coming-soon tag and full-opacity title/subtitle', () => {
    const catalog = resolveLandingCatalog('en');
    const unavailableCard = catalog.find((candidate) => candidate.variant === 'creativity-profile');

    if (!unavailableCard) {
      throw new Error('Expected creativity-profile unavailable card fixture');
    }

    const doc = renderCardDocument({
      card: unavailableCard,
      state: 'normal',
      interactionMode: 'hover',
      ariaDisabled: true,
      tabIndex: -1
    });

    // req-landing §9.2 / §14.4: semantic <button aria-disabled>, removed from the tab order, not a
    // native `disabled` element and not a role override.
    const trigger = doc.querySelector('[data-slot="primaryTrigger"]');
    expect(trigger?.tagName.toLowerCase()).toBe('button');
    expect(trigger?.getAttribute('aria-disabled')).toBe('true');
    expect(trigger?.getAttribute('tabindex')).toBe('-1');
    expect(trigger?.hasAttribute('disabled')).toBe(false);
    expect(trigger?.getAttribute('role')).toBeNull();

    // D2: a single standard coming-soon tag in the tags row — text-only chip, not a dashed pill,
    // not pill-rounded, no dot, and perceivable to AT (not inside an aria-hidden subtree).
    const comingSoonTag = doc.querySelector('[data-slot="comingSoonTag"]');
    expect(comingSoonTag).not.toBeNull();
    expect(comingSoonTag?.textContent?.trim()).toBe('coming soon');
    const tagClass = comingSoonTag?.getAttribute('class') ?? '';
    expect(tagClass).toContain('landing-grid-card-tag-chip');
    expect(tagClass).not.toMatch(/\bborder(?:-\[|$)/u);
    expect(tagClass).toContain('whitespace-nowrap');
    expect(tagClass).toContain('rounded-[var(--normal-tag-radius)]');
    expect(tagClass).toContain('px-[9px]');
    expect(tagClass).not.toContain('rounded-full');
    expect(tagClass).not.toContain('dashed');
    expect(tagClass).not.toContain('text-transform');
    expect(comingSoonTag?.children.length ?? 0).toBe(0); // no dot/glyph child
    expect(comingSoonTag?.closest('[aria-hidden="true"]')).toBeNull();
    expect(doc.querySelector('[data-slot="tags"]')?.contains(comingSoonTag ?? null)).toBe(true);

    // design.md §10: no opacity reduction on the unavailable card's title / subtitle.
    const title = doc.querySelector('[data-slot="cardTitle"]');
    const subtitle = doc.querySelector('[data-slot="cardSubtitle"]');
    for (const element of [title, subtitle]) {
      const className = element?.getAttribute('class') ?? '';
      expect(className).not.toMatch(/\bopacity-(0|[1-9]0?)\b/u);
      expect(element?.getAttribute('style') ?? '').not.toContain('opacity');
    }

    // D3: the unavailable signal is the tag + dim only — the production title never carries a
    // "(Soon)" suffix.
    expect(title?.textContent ?? '').not.toContain('(Soon)');
  });

  it('renders Blog cards as whole-card navigation links without an Expanded surface', () => {
    const catalog = resolveLandingCatalog('en');
    const card = catalog.find((candidate) => candidate.variant === 'ops-handbook');

    if (!card || card.type !== 'blog') {
      throw new Error('Expected ops-handbook as a blog card fixture');
    }

    const doc = renderDesktopExpandedCardDocument({card});
    const primaryTrigger = doc.querySelector('[data-slot="primaryTrigger"]');

    expect(primaryTrigger?.tagName.toLowerCase()).toBe('a');
    expect(primaryTrigger?.getAttribute('href')).toBe('/en/blog/ops-handbook');
    expect(doc.querySelector('.landing-grid-card')?.getAttribute('data-card-state')).toBe('normal');
    expect(doc.querySelector('[data-slot="expandedShell"]')).toBeNull();
    expect(doc.querySelector('[data-slot="expandedBody"]')).toBeNull();
    expect(doc.querySelector('[data-slot="cardSubtitleExpanded"]')).toBeNull();
    expect(doc.querySelector('[data-slot="primaryCTA"]')).toBeNull();

    const readMore = doc.querySelector('[data-slot="blogReadMore"]');
    expect(readMore).not.toBeNull();
    expect(readMore?.getAttribute('aria-hidden')).toBe('true');
    expect(readMore?.getAttribute('tabindex')).toBeNull();
    expect(readMore?.textContent?.replace(/\s+/gu, '')).toBe('Readmore→');
    expect(readMore?.className).toContain('inline-flex');
    expect(readMore?.className).toContain('gap-[6px]');
    expect(readMore?.className).toContain('opacity-0');
    expect(readMore?.className).toContain('group-hover:opacity-100');
    expect(readMore?.className).toContain('group-focus-within:opacity-100');

    // D-07: the CTA is hidden by `visibility`, never by `display`. `display: none`
    // gives the element no rendered previous frame, so the fade cannot run, and it
    // also drops the CTA out of layout, which reflows the tag row on reveal.
    const cardModuleCss = readLandingGridCardCss();
    const hiddenCtaRule = cardModuleCss.match(/\.blogReadMoreHover\s*\{(?<body>[^}]*)\}/u)?.groups?.body;
    const revealedCtaRule = cardModuleCss.match(
      /\.root\.blogCard:hover\s+\.blogReadMoreHover,\s*\.root\.blogCard:focus-within\s+\.blogReadMoreHover\s*\{(?<body>[^}]*)\}/u
    )?.groups?.body;
    expect(hiddenCtaRule).toBeDefined();
    expect(hiddenCtaRule).toContain('visibility: hidden;');
    expect(hiddenCtaRule).toContain('transition-property: opacity, visibility;');
    expect(hiddenCtaRule).not.toContain('display:');
    expect(revealedCtaRule).toBeDefined();
    expect(revealedCtaRule).toContain('visibility: visible;');
    expect(revealedCtaRule).not.toContain('display:');
    expect(readMore?.querySelector('[data-slot="blogReadMoreLabel"]')?.textContent).toBe('Read more');
    expect(readMore?.querySelector('[data-slot="blogReadMoreArrow"]')?.textContent).toBe('→');
    expect(readMore?.querySelector('a, button, [tabindex]')).toBeNull();
  });

  it('keeps Read more affordance blog-only and out of primary CTA slots', () => {
    const catalog = resolveLandingCatalog('en');
    const testCard = catalog.find((candidate) => candidate.type === 'test' && candidate.availability === 'available');
    const unavailableCard = catalog.find((candidate) => candidate.variant === 'creativity-profile');

    if (!testCard || !unavailableCard) {
      throw new Error('Expected available test and unavailable fixture cards');
    }

    const testDoc = renderCardDocument({card: testCard, state: 'normal'});
    const unavailableDoc = renderCardDocument({card: unavailableCard, state: 'normal'});

    expect(testDoc.querySelector('[data-slot="blogReadMore"]')).toBeNull();
    expect(unavailableDoc.querySelector('[data-slot="blogReadMore"]')).toBeNull();
    expect(testDoc.querySelector('[data-slot="primaryCTA"]')).toBeNull();
    expect(unavailableDoc.querySelector('[data-slot="primaryCTA"]')).toBeNull();
  });

  it('unmounts hidden tag suffix while preserving CTA and status semantics', () => {
    const catalog = resolveLandingCatalog('en', {audience: 'qa'});
    const testCard = catalog.find((candidate) => candidate.variant === 'rhythm-b');
    const blogCard = catalog.find((candidate) => candidate.variant === 'ops-handbook');
    const unavailableCard = catalog.find((candidate) => candidate.variant === 'creativity-profile');

    if (!testCard || !blogCard || !unavailableCard) {
      throw new Error('Expected rhythm-b, ops-handbook, and creativity-profile fixtures');
    }

    const testDoc = renderCardDocument({card: testCard, state: 'normal'});
    const testTags = testDoc.querySelector('[data-slot="tags"]');
    const testProbe = testDoc.querySelector('[data-slot="tagMeasurementProbe"]');

    expect(testTags?.getAttribute('data-tag-count')).toBe('3');
    expect(testTags?.getAttribute('data-visible-tag-count')).toBe('0');
    expect(testTags?.getAttribute('data-tag-tail-ellipsis')).toBe('false');
    expect(testTags?.querySelectorAll('.landing-grid-card-tag-item')).toHaveLength(0);
    expect(testProbe?.getAttribute('aria-hidden')).toBe('true');
    expect(testProbe?.hasAttribute('inert')).toBe(true);
    expect(testProbe?.querySelectorAll('[data-inline-probe-tag]')).toHaveLength(3);

    const blogDoc = renderCardDocument({
      card: blogCard,
      state: 'normal',
      interactionMode: 'hover',
      viewportTier: 'tablet'
    });
    const readMore = blogDoc.querySelector('[data-slot="blogReadMore"]');
    expect(readMore?.getAttribute('aria-hidden')).toBe('true');
    expect(readMore?.querySelector('a, button, [tabindex]')).toBeNull();
    expect(blogDoc.querySelector('[data-slot="blogReadMoreProbe"]')?.closest('[aria-hidden="true"]')).not.toBeNull();

    const unavailableDoc = renderCardDocument({
      card: unavailableCard,
      state: 'normal',
      ariaDisabled: true,
      tabIndex: -1
    });
    const unavailableTags = unavailableDoc.querySelector('[data-slot="tags"]');
    expect(unavailableTags?.getAttribute('data-tag-count')).toBe('1');
    expect(unavailableTags?.getAttribute('data-visible-tag-count')).toBe('1');
    expect(unavailableDoc.querySelector('[data-slot="comingSoonTag"]')?.closest('[aria-hidden="true"]')).toBeNull();
  });

  it('renders desktop expanded title continuity markers while preserving the full title text', () => {
    const catalog = resolveLandingCatalog('en');
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
    // 크기·굵기·행간 셋은 이제 `--label`(= 500 14px/1.4) 한 이름이 갖는다. 그 값을 설계
    // 정의에 붙들어 두는 것은 `design-tokens-dark-parity.test.ts` 의 미러 대조다.
    expect(expandedTitle?.className).toContain('[font:var(--label)]');
    expect(expandedTitle?.className).toContain('text-[var(--expanded-context-ink)]');
    expect(expandedTitle?.textContent).toBe(card.title);
    expect(doc.querySelector('[data-slot="cardTitle"]')?.textContent).toBe(card.title);
  });

  // 모바일 확장 제목의 타이포와 닫기 컨트롤의 44×44 는 **시트로 옮겨 갔다** — 카드는 폰에서
  // 확장 표면을 그리지 않는다(명세 규칙 3). 두 계약은 `landing-card-sheet.test.ts` 가 같은
  // 단언으로 이어받는다; 여기서 지우기만 하면 계약이 사라진다.

  it('제자리 오버레이는 보이는 X 없이 숨긴 닫기를 마지막 탭 스톱으로 둔다', () => {
    const catalog = resolveLandingCatalog('en');
    const card = catalog.find((candidate) => candidate.variant === 'rhythm-b');

    if (!card || card.type !== 'test') {
      throw new Error('Expected rhythm-b as a test card fixture');
    }

    const doc = renderDesktopExpandedCardDocument({card});
    const overlay = doc.querySelector('[data-slot="expandedBody"]');

    // 보이는 X 는 없다 — 카드 밖이 곧 닫기 영역이므로 중복이다.
    expect(doc.querySelector('[data-slot="mobileClose"]')).toBeNull();

    const focusable = Array.from(
      overlay?.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []
    );
    expect(focusable.length).toBeGreaterThan(0);
    expect(focusable.at(-1)?.getAttribute('data-slot')).toBe('overlayHiddenClose');
    expect(focusable.at(-1)?.textContent).toBe(getDefaultCardCopy().closeExpandedAria);
  });

  it('제자리 오버레이는 뷰포트 높이 상한 안에서 본문을 스크롤한다', () => {
    const catalog = resolveLandingCatalog('en');
    const card = catalog.find((candidate) => candidate.variant === 'rhythm-b');

    if (!card || card.type !== 'test') {
      throw new Error('Expected rhythm-b as a test card fixture');
    }

    const doc = renderDesktopExpandedCardDocument({card});
    const stageStyle = doc.querySelector('[data-slot="desktopStage"]')?.getAttribute('style') ?? '';
    const bodyClassName = doc.querySelector('[data-slot="expandedBody"]')?.getAttribute('class') ?? '';

    // 값의 정본은 `LANDING_OVERLAY_VIEWPORT_INSET_PX` 이고 변수로 내려온다 — 가로로 눕힌 폰이
    // 이 조건으로 들어오고, 넘치면 배경이 잠겨 있어 스크롤로도 볼 수 없다(명세 규칙 3).
    expect(stageStyle).toContain(`calc(100dvh - ${LANDING_OVERLAY_VIEWPORT_INSET_PX}px)`);
    expect(bodyClassName).toContain('[max-height:var(--landing-overlay-max-height)]');
    expect(bodyClassName).toContain('overflow-y-auto');
    expect(bodyClassName).toContain('overscroll-contain');
  });

  it('applies the responsive title/subtitle clamp matrix and BQ-30 tag treatment', () => {
    const catalog = resolveLandingCatalog('en');
    const card = catalog.find((candidate) => candidate.variant === 'rhythm-b');
    const blogCard = catalog.find((candidate) => candidate.variant === 'ops-handbook');
    const unavailableCard = catalog.find((candidate) => candidate.variant === 'creativity-profile');

    if (!card || !blogCard || !unavailableCard) {
      throw new Error('Expected rhythm-b, ops-handbook, and creativity-profile fixtures');
    }

    for (const viewportTier of ['desktop', 'tablet', 'mobile'] as const) {
      const doc = renderCardDocument({
        card,
        state: 'normal',
        interactionMode: viewportTier === 'mobile' ? 'tap' : 'hover',
        viewportTier
      });
      const titleClassName = doc.querySelector('[data-slot="cardTitle"]')?.getAttribute('class') ?? '';
      const subtitleClassName = doc.querySelector('[data-slot="cardSubtitle"]')?.getAttribute('class') ?? '';

      if (viewportTier === 'mobile') {
        expect(titleClassName).not.toContain('line-clamp-1');
        expect(titleClassName).toContain('overflow-visible');
        expect(titleClassName).toContain('text-clip');
        expect(subtitleClassName).not.toContain('line-clamp-2');
        expect(subtitleClassName).toContain('overflow-visible');
        expect(subtitleClassName).toContain('text-clip');
      } else {
        expect(titleClassName).toContain('line-clamp-1');
        expect(titleClassName).toContain('overflow-hidden');
        expect(titleClassName).toContain('text-ellipsis');
        expect(subtitleClassName).toContain('line-clamp-2');
        expect(subtitleClassName).toContain('overflow-hidden');
        expect(subtitleClassName).toContain('text-ellipsis');
      }
    }

    for (const candidate of [card, blogCard, unavailableCard]) {
      const doc = renderCardDocument({
        card: candidate,
        state: 'normal',
        ariaDisabled: candidate.availability === 'unavailable'
      });
      const tag = doc.querySelector('.landing-grid-card-tag-chip');
      const tagClassName = tag?.getAttribute('class') ?? '';

      expect(tag).not.toBeNull();
      expect(tagClassName).toContain('rounded-[var(--normal-tag-radius)]');
      expect(tagClassName).toContain('bg-[var(--normal-tag-bg)]');
      expect(tagClassName).toContain('px-[9px]');
      expect(tagClassName).toContain('whitespace-nowrap');
      expect(tagClassName).not.toMatch(/\bborder(?:-\[|$)/u);
      expect(tagClassName).not.toContain('text-transform');
      expect(tag?.children).toHaveLength(0);
    }
  });

  it('keeps primary trigger coverage and Expanded controls independent of the root minimum', () => {
    const catalog = resolveLandingCatalog('en');
    const testCard = catalog.find((candidate) => candidate.variant === 'qmbti');
    const blogCard = catalog.find((candidate) => candidate.variant === 'ops-handbook');
    const unavailableCard = catalog.find((candidate) => candidate.variant === 'creativity-profile');

    if (!testCard || testCard.type !== 'test' || !blogCard || !unavailableCard) {
      throw new Error('Expected Test, Blog, and unavailable card fixtures');
    }

    for (const card of [testCard, blogCard, unavailableCard]) {
      const doc = renderCardDocument({
        card,
        state: 'normal',
        ariaDisabled: card.availability === 'unavailable'
      });
      const triggerClassName = doc.querySelector('[data-slot="primaryTrigger"]')?.getAttribute('class') ?? '';

      expect(triggerClassName).toContain('[min-height:100%]');
      expect(triggerClassName).toContain('[padding:16px]');
    }

    const desktopExpandedDoc = renderDesktopExpandedCardDocument({card: testCard});
    const choiceClassName =
      desktopExpandedDoc.querySelector('[data-slot="answerChoiceA"]')?.getAttribute('class') ?? '';

    expect(choiceClassName).toContain('py-3');
  });
});
