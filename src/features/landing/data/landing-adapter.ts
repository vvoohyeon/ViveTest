import {landingFixture} from './landing-fixture';
import type {BlogCatalogCard, CatalogCard, TestCatalogCard} from '@/features/landing/types';

export type CatalogLayoutConfig = {
  heroCount: number;
  heroColumns: number;
  mainColumns: number;
  gridGap: number;
};

const EMPTY_THUMBNAIL =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 200'%3E%3Crect width='1200' height='200' fill='%23e9e4dc'/%3E%3C/svg%3E";

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalizeThumbnail(value: unknown): string {
  const normalized = normalizeText(value).trim();
  return normalized.length > 0 ? normalized : EMPTY_THUMBNAIL;
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === 'string' ? item : ''))
    .filter((item) => item.length > 0)
    .slice(0, 3);
}

function normalizeCatalogCard(card: CatalogCard): CatalogCard {
  if (card.type === 'test') {
    const normalizedVariant = normalizeText(card.variant).trim();

    const normalized: TestCatalogCard = {
      ...card,
      cardTitle: normalizeText(card.cardTitle),
      cardSubtitle: normalizeText(card.cardSubtitle),
      thumbnailOrIcon: normalizeThumbnail(card.thumbnailOrIcon),
      tags: normalizeTags(card.tags),
      previewQuestion: normalizeText(card.previewQuestion),
      answerChoiceA: normalizeText(card.answerChoiceA),
      answerChoiceB: normalizeText(card.answerChoiceB),
      variant: normalizedVariant.length > 0 ? normalizedVariant : normalizeText(card.id),
      meta: {
        estimatedMinutes: Number.isFinite(card.meta.estimatedMinutes) ? card.meta.estimatedMinutes : 0,
        shares: Number.isFinite(card.meta.shares) ? card.meta.shares : 0,
        totalRuns: Number.isFinite(card.meta.totalRuns) ? card.meta.totalRuns : 0
      }
    };

    return normalized;
  }

  const normalized: BlogCatalogCard = {
    ...card,
    cardTitle: normalizeText(card.cardTitle),
    cardSubtitle: normalizeText(card.cardSubtitle),
    thumbnailOrIcon: normalizeThumbnail(card.thumbnailOrIcon),
    tags: normalizeTags(card.tags),
    summary: normalizeText(card.summary),
    meta: {
      readMinutes: Number.isFinite(card.meta.readMinutes) ? card.meta.readMinutes : 0,
      shares: Number.isFinite(card.meta.shares) ? card.meta.shares : 0,
      views: Number.isFinite(card.meta.views) ? card.meta.views : 0
    }
  };

  return normalized;
}

export function getCatalogCards(): CatalogCard[] {
  return landingFixture
    .filter((card) => !card.isDebug)
    .map((card) => normalizeCatalogCard(card))
    .filter((card) => !(card.type === 'blog' && card.availability === 'unavailable'));
}

export function getCatalogLayoutConfig(width: number): CatalogLayoutConfig {
  if (width < 768) {
    return {
      heroCount: 0,
      heroColumns: 1,
      mainColumns: 1,
      gridGap: 16
    };
  }

  if (width < 1024) {
    return {
      heroCount: 2,
      heroColumns: 2,
      mainColumns: width >= 900 ? 3 : 2,
      gridGap: 18
    };
  }

  const wideDesktop = width >= 1160;

  return {
    heroCount: wideDesktop ? 3 : 2,
    heroColumns: wideDesktop ? 3 : 2,
    mainColumns: wideDesktop ? 4 : 3,
    gridGap: 20
  };
}

export function splitHeroAndMainCards(cards: CatalogCard[], heroCount: number): {
  heroCards: CatalogCard[];
  mainCards: CatalogCard[];
} {
  if (heroCount <= 0) {
    return {heroCards: [], mainCards: cards};
  }

  return {
    heroCards: cards.slice(0, heroCount),
    mainCards: cards.slice(heroCount)
  };
}
