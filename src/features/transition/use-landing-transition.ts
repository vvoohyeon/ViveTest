'use client';

import {useCallback} from 'react';
import {usePathname, useRouter} from 'next/navigation';

import type {AppLocale} from '@/config/site';
import {beginLandingTransition} from '@/features/transition/runtime';
import {discardOverlayHistoryEntry} from '@/features/ui/use-overlay-history-entry';
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
      // 폰에서는 이 이동이 시트 **안의** 버튼에서 시작된다. 시트가 닫히며 제 history 항목을
      // `back()` 으로 거두면 그 되돌림이 방금의 이동을 취소하므로(L53), 표시를 먼저 걷는다.
      // 층이 없으면(데스크톱) 아무 일도 하지 않는다.
      discardOverlayHistoryEntry();
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
