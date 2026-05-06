import type {AppLocale} from '@/config/site';
import {
  isEnterableCard,
  resolveLandingBlogCardByVariant,
  resolveLandingCatalog,
  type LandingBlogCard
} from '@/features/variant-registry';

export interface BlogIndexPageModel {
  articles: LandingBlogCard[];
}

export interface BlogDetailPageModel {
  article: LandingBlogCard;
  articles: LandingBlogCard[];
}

export function getBlogIndexPageModel(locale: AppLocale): BlogIndexPageModel {
  return {
    articles: resolveLandingCatalog(locale, {audience: 'qa'}).filter(
      (card): card is LandingBlogCard => card.type === 'blog' && isEnterableCard(card.attribute)
    )
  };
}

export function getBlogDetailPageModel(locale: AppLocale, variant: string): BlogDetailPageModel | null {
  const article = resolveLandingBlogCardByVariant(locale, variant);
  if (!article || !isEnterableCard(article)) {
    return null;
  }

  return {
    article,
    articles: resolveLandingCatalog(locale, {audience: 'qa'}).filter(
      (card): card is LandingBlogCard => card.type === 'blog' && isEnterableCard(card.attribute)
    )
  };
}
