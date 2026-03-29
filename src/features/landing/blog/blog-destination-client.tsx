'use client';

import {useEffect, useMemo, useRef, useState} from 'react';

import type {AppLocale} from '@/config/site';
import {createLandingCatalog, isEnterableCard} from '@/features/landing/data';
import type {LandingBlogCard} from '@/features/landing/data/types';
import {
  completePendingLandingTransition,
  terminatePendingLandingTransition
} from '@/features/landing/transition/runtime';
import {readPendingLandingTransition} from '@/features/landing/transition/store';

interface BlogDestinationClientProps {
  locale: AppLocale;
  selectedLabel: string;
  allArticlesLabel: string;
}

export function BlogDestinationClient({
  locale,
  selectedLabel,
  allArticlesLabel
}: BlogDestinationClientProps) {
  const articles = useMemo(
    () =>
      createLandingCatalog(locale, {audience: 'qa', includeHiddenCards: true}).filter(
        (card): card is LandingBlogCard => card.type === 'blog' && isEnterableCard(card)
      ),
    [locale]
  );
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const bootstrapSelectedArticleIdRef = useRef<string | null | undefined>(undefined);
  const pendingTransitionToCompleteRef = useRef<string | null>(null);

  useEffect(() => {
    if (bootstrapSelectedArticleIdRef.current !== undefined) {
      queueMicrotask(() => {
        setSelectedArticleId(bootstrapSelectedArticleIdRef.current ?? null);
      });
      return;
    }

    const pendingTransition = readPendingLandingTransition();
    if (pendingTransition && pendingTransition.targetType !== 'blog') {
      terminatePendingLandingTransition({
        signal: 'transition_fail',
        resultReason: 'DESTINATION_LOAD_ERROR'
      });
    }

    const nextPendingTransition = readPendingLandingTransition();
    const fallbackArticle = articles[0] ?? null;

    if (!fallbackArticle) {
      if (nextPendingTransition) {
        terminatePendingLandingTransition({
          signal: 'transition_fail',
          resultReason: 'BLOG_FALLBACK_EMPTY'
        });
      }
      bootstrapSelectedArticleIdRef.current = null;
      queueMicrotask(() => {
        setSelectedArticleId(null);
      });
      return;
    }

    const matchedArticle =
      nextPendingTransition && nextPendingTransition.targetType === 'blog'
        ? articles.find((candidate) => candidate.sourceParam === nextPendingTransition.blogArticleId) ?? fallbackArticle
        : fallbackArticle;

    if (nextPendingTransition && nextPendingTransition.targetType === 'blog') {
      pendingTransitionToCompleteRef.current = nextPendingTransition.transitionId;
    }

    bootstrapSelectedArticleIdRef.current = matchedArticle.id;
    queueMicrotask(() => {
      setSelectedArticleId(matchedArticle.id);
    });
  }, [articles, locale]);

  useEffect(() => {
    if (selectedArticleId === null || pendingTransitionToCompleteRef.current === null) {
      return;
    }

    const expectedTransitionId = pendingTransitionToCompleteRef.current;
    const frame = window.requestAnimationFrame(() => {
      const completed = completePendingLandingTransition({
        targetType: 'blog'
      });

      if (completed?.transitionId === expectedTransitionId) {
        pendingTransitionToCompleteRef.current = null;
      }
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [selectedArticleId]);

  const selectedArticle = articles.find((candidate) => candidate.id === selectedArticleId) ?? articles[0] ?? null;

  return (
    <section className="landing-shell-card blog-shell-card" data-testid="blog-shell-card">
      <h1>{selectedLabel}</h1>
      {selectedArticle ? (
        <>
          <article className="blog-selected-article" data-testid="blog-selected-article">
            <h2>{selectedArticle.title}</h2>
            <p>{selectedArticle.blog.summary}</p>
          </article>

          <section className="blog-article-list">
            <h2>{allArticlesLabel}</h2>
            <ul>
              {articles.map((article) => (
                <li
                  key={article.id}
                  className="blog-article-list-item"
                  data-selected={article.id === selectedArticle.id ? 'true' : 'false'}
                >
                  <strong>{article.title}</strong>
                  <span>{article.subtitle}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <p data-testid="blog-empty-state">No article available.</p>
      )}
    </section>
  );
}
