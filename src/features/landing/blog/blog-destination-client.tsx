'use client';

import {useEffect, useMemo, useRef, useState} from 'react';

import type {AppLocale} from '@/config/site';
import {createLandingCatalog, isEnterableCard} from '@/features/landing/data';
import type {LandingBlogCard} from '@/features/landing/data/types';
import {useTelemetryConsentSource} from '@/features/landing/telemetry/consent-source';
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
  const consentSnapshot = useTelemetryConsentSource();
  const articles = useMemo(
    () =>
      createLandingCatalog(locale, {
        consentState: consentSnapshot.synced ? consentSnapshot.consentState : 'UNKNOWN'
      }).filter(
        (card): card is LandingBlogCard => card.type === 'blog' && isEnterableCard(card)
      ),
    [consentSnapshot.consentState, consentSnapshot.synced, locale]
  );
  const [selectedArticleVariant, setSelectedArticleVariant] = useState<string | null>(null);
  const bootstrapSelectedArticleVariantRef = useRef<string | null | undefined>(undefined);
  const pendingTransitionToCompleteRef = useRef<string | null>(null);

  useEffect(() => {
    if (bootstrapSelectedArticleVariantRef.current !== undefined) {
      queueMicrotask(() => {
        setSelectedArticleVariant(bootstrapSelectedArticleVariantRef.current ?? null);
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
      bootstrapSelectedArticleVariantRef.current = null;
      queueMicrotask(() => {
        setSelectedArticleVariant(null);
      });
      return;
    }

    const matchedArticle =
      nextPendingTransition && nextPendingTransition.targetType === 'blog'
        ? articles.find((candidate) => candidate.variant === nextPendingTransition.variant) ?? null
        : fallbackArticle;

    if (!matchedArticle) {
      terminatePendingLandingTransition({
        signal: 'transition_fail',
        resultReason: 'DESTINATION_LOAD_ERROR'
      });
      bootstrapSelectedArticleVariantRef.current = fallbackArticle.variant;
      queueMicrotask(() => {
        setSelectedArticleVariant(fallbackArticle.variant);
      });
      return;
    }

    if (nextPendingTransition && nextPendingTransition.targetType === 'blog') {
      pendingTransitionToCompleteRef.current = nextPendingTransition.transitionId;
    }

    bootstrapSelectedArticleVariantRef.current = matchedArticle.variant;
    queueMicrotask(() => {
      setSelectedArticleVariant(matchedArticle.variant);
    });
  }, [articles, locale]);

  useEffect(() => {
    if (selectedArticleVariant === null || pendingTransitionToCompleteRef.current === null) {
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
  }, [selectedArticleVariant]);

  const selectedArticle = articles.find((candidate) => candidate.variant === selectedArticleVariant) ?? articles[0] ?? null;

  return (
    <section className="landing-shell-card blog-shell-card" data-testid="blog-shell-card">
      <h1>{selectedLabel}</h1>
      {selectedArticle ? (
        <>
          <article className="blog-selected-article" data-testid="blog-selected-article">
            <h2>{selectedArticle.title}</h2>
            <p>{selectedArticle.subtitle}</p>
          </article>

          <section className="blog-article-list">
            <h2>{allArticlesLabel}</h2>
            <ul>
              {articles.map((article) => (
                <li
                  key={article.variant}
                  className="blog-article-list-item"
                  data-selected={article.variant === selectedArticle.variant ? 'true' : 'false'}
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
