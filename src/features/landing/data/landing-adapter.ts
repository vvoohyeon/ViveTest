import {landingFixture} from './landing-fixture';
import type {CatalogCard} from '@/features/landing/types';

export type CatalogLayoutConfig = {
  heroCount: number;
  heroColumns: number;
  mainColumns: number;
  gridGap: number;
};

function ensureRequiredSlots(card: CatalogCard): void {
  const requiredFields = [
    card.id,
    card.cardTitle,
    card.cardSubtitle,
    card.thumbnailOrIcon,
    card.type,
    card.availability
  ];

  if (requiredFields.some((field) => field === undefined || field === null)) {
    throw new Error(`Invalid landing fixture for card: ${card.id}`);
  }

  if (card.type === 'test') {
    const testRequired = [card.previewQuestion, card.answerChoiceA, card.answerChoiceB];
    if (testRequired.some((field) => field === undefined || field === null)) {
      throw new Error(`Invalid test card fixture for card: ${card.id}`);
    }
  }

  if (card.type === 'blog') {
    if (card.summary === undefined || card.summary === null) {
      throw new Error(`Invalid blog card fixture for card: ${card.id}`);
    }
  }
}

export function getCatalogCards(): CatalogCard[] {
  return landingFixture
    .filter((card) => !card.isDebug)
    .map((card) => {
      ensureRequiredSlots(card);
      return card;
    })
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
