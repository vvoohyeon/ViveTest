'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect, useRef, useState} from 'react';

import type {AppLocale} from '@/config/site';
import {buildLocalizedPath} from '@/i18n/localized-path';
import {RouteBuilder} from '@/lib/routes/route-builder';
import {
  completePendingLandingTransition,
  terminatePendingLandingTransition
} from '@/features/landing/transition/runtime';
import {readPendingLandingTransition} from '@/features/landing/transition/store';
import type {LandingBlogCard} from '@/features/variant-registry';

interface BlogDestinationClientProps {
  locale: AppLocale;
  headingLabel: string;
  listLabel?: string;
  articles: LandingBlogCard[];
  article?: LandingBlogCard | null;
}

const blogShellCardClassName =
  'landing-shell-card blog-shell-card grid gap-[18px] rounded-[16px] p-[18px] [background:color-mix(in_srgb,var(--panel-solid)_90%,transparent)] [box-shadow:var(--card-shadow)]';
const blogSelectedArticleClassName = 'blog-selected-article grid gap-[10px]';
const blogArticleListClassName = 'blog-article-list grid gap-[10px]';
const blogArticleItemsClassName = 'm-0 grid list-none gap-[10px] p-0';
const blogArticleListItemClassName =
  'blog-article-list-item rounded-[14px] border border-[var(--interactive-neutral-border)] [background:var(--interactive-neutral-bg-soft)] data-[selected=true]:border-[var(--interactive-accent-border)] data-[selected=true]:[background:var(--interactive-accent-bg)] data-[selected=true]:[box-shadow:inset_0_0_0_1px_var(--interactive-accent-outline)]';
const blogArticleLinkClassName =
  'blog-article-link grid gap-1 p-[14px] [color:inherit] no-underline hover:no-underline focus-visible:no-underline';

export function BlogDestinationClient({
  locale,
  headingLabel,
  listLabel,
  articles,
  article = null
}: BlogDestinationClientProps) {
  const pathname = usePathname();
  const pendingTransitionToCompleteRef = useRef<string | null>(null);
  const [destinationReadyPath, setDestinationReadyPath] = useState<string | null>(null);

  useEffect(() => {
    const pendingTransition = readPendingLandingTransition();
    if (!pendingTransition) {
      pendingTransitionToCompleteRef.current = null;
      queueMicrotask(() => {
        setDestinationReadyPath(pathname);
      });
      return;
    }

    if (pendingTransition.targetType !== 'blog' || pendingTransition.targetRoute !== pathname) {
      pendingTransitionToCompleteRef.current = null;
      terminatePendingLandingTransition({
        signal: 'transition_fail',
        resultReason: 'DESTINATION_LOAD_ERROR'
      });
      return;
    }

    pendingTransitionToCompleteRef.current = pendingTransition.transitionId;
    queueMicrotask(() => {
      setDestinationReadyPath(pathname);
    });
  }, [pathname]);

  useEffect(() => {
    if (destinationReadyPath !== pathname || pendingTransitionToCompleteRef.current === null) {
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
  }, [destinationReadyPath, pathname]);

  return (
    <section className={blogShellCardClassName} data-testid="blog-shell-card">
      <h1 className="m-0">{headingLabel}</h1>
      {article ? (
        <>
          <article className={blogSelectedArticleClassName} data-testid="blog-selected-article">
            <h2 className="m-0">{article.title}</h2>
            <p className="m-0 text-[var(--muted-ink)]">{article.subtitle}</p>
          </article>
        </>
      ) : null}
      {articles.length > 0 ? (
        <section className={blogArticleListClassName}>
          {listLabel ? <h2 className="m-0">{listLabel}</h2> : null}
          <ul className={blogArticleItemsClassName}>
            {articles.map((listedArticle) => (
              <li
                key={listedArticle.variant}
                className={blogArticleListItemClassName}
                data-selected={article?.variant === listedArticle.variant ? 'true' : 'false'}
              >
                <Link
                  className={blogArticleLinkClassName}
                  href={buildLocalizedPath(RouteBuilder.blogArticle(listedArticle.variant), locale)}
                >
                  <strong>{listedArticle.title}</strong>
                  <span className="text-[var(--muted-ink)]">{listedArticle.subtitle}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="m-0 text-[var(--muted-ink)]" data-testid="blog-empty-state">No article available.</p>
      )}
    </section>
  );
}
