'use client';

import {useCallback} from 'react';
import {usePathname, useRouter} from 'next/navigation';

import type {AppLocale} from '@/config/site';
import {beginLandingTransition} from '@/features/transition/runtime';
import type {LandingBlogCard, LandingTestCard} from '@/features/variant-registry';
import {buildLocalizedPath} from '@/i18n/localized-path';
import {RouteBuilder} from '@/lib/routes/route-builder';

interface UseLandingTransitionInput {
  locale: AppLocale;
  onTransitionStart?: (cardVariant: string) => void;
}

export function useLandingTransition({locale, onTransitionStart}: UseLandingTransitionInput) {
  const router = useRouter();
  const pathname = usePathname();

  const beginTestTransition = useCallback(
    (card: LandingTestCard, choice: 'A' | 'B') => {
      const targetRoute = buildLocalizedPath(RouteBuilder.question(card.variant), locale);
      const pendingTransition = beginLandingTransition({
        locale,
        route: pathname,
        sourceVariant: card.variant,
        targetType: 'test',
        targetRoute,
        variant: card.variant,
        preAnswerChoice: choice
      });

      if (!pendingTransition) {
        return false;
      }

      onTransitionStart?.(card.variant);
      router.push(targetRoute);
      return true;
    },
    [locale, onTransitionStart, pathname, router]
  );

  const beginBlogTransition = useCallback(
    (card: LandingBlogCard) => {
      const targetRoute = buildLocalizedPath(RouteBuilder.blogArticle(card.variant), locale);
      const pendingTransition = beginLandingTransition({
        locale,
        route: pathname,
        sourceVariant: card.variant,
        targetType: 'blog',
        targetRoute,
        variant: card.variant
      });

      if (!pendingTransition) {
        return false;
      }

      onTransitionStart?.(card.variant);
      router.push(targetRoute);
      return true;
    },
    [locale, onTransitionStart, pathname, router]
  );

  return {
    beginTestTransition,
    beginBlogTransition
  };
}
