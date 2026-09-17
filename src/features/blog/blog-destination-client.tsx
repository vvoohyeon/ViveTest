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
} from '@/features/transition/runtime';
import {readPendingLandingTransition} from '@/features/transition/store';
import type {LandingBlogCard} from '@/features/variant-registry';

interface BlogDestinationClientProps {
  locale: AppLocale;
  headingLabel: string;
  listLabel?: string;
  articles: LandingBlogCard[];
  article?: LandingBlogCard | null;
}

// `.vt-panel` — 페이지 위에 놓이는 불투명한 면. 종전에는 90% 반투명 + 테두리 없음이었다.
const blogShellCardClassName =
  'landing-shell-card blog-shell-card grid gap-5 rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-[var(--canvas-elevated)] p-5 shadow-[var(--shadow-rest)]';
// 읽기 폭은 `--container-narrow`(760px). 토큰 파일에 있었지만 소비자가 없던 값이다.
const blogSelectedArticleClassName = 'blog-selected-article grid max-w-[760px] gap-2';
// 상세에서 제목의 무게는 기사 제목이 갖는다 — `headingLabel`("Selected article")은 그 위의
// 작은 kicker 다. 목록에서는 같은 라벨이 그 페이지의 제목이므로 `--h1` 을 받는다.
const blogKickerClassName = 'm-0 [font:var(--overline)] [letter-spacing:var(--track-over)] text-[var(--muted-aa)]';
const blogPageTitleClassName = 'm-0 [font:var(--h1)] [letter-spacing:var(--track-tight)] text-[var(--ink)]';
const blogArticleTitleClassName =
  'm-0 [font:var(--h1)] [letter-spacing:var(--track-tight)] text-[var(--ink)] [word-break:keep-all] [overflow-wrap:anywhere]';
// 본문은 16px/1.6 — 일반 `--body` 역할이 맞는 유일한 자리이고, 카탈로그의 15px 는 여기서 틀리다.
const blogArticleBodyClassName = 'm-0 [font:var(--body)] text-[var(--ink-body)]';
const blogSectionTitleClassName = 'm-0 [font:var(--h3)] text-[var(--ink)]';
const blogArticleListClassName = 'blog-article-list grid gap-3';
const blogArticleItemsClassName = 'm-0 grid list-none gap-2 p-0';
// 목록 행은 카탈로그의 선택 행과 같은 처리를 받는다 — 어딘가로 데려가는 행이라는 점이 같다.
const blogArticleListItemClassName =
  'blog-article-list-item rounded-[var(--radius-md)] border border-[var(--hairline-strong)] bg-[var(--canvas-elevated)] [transition-property:border-color,background-color] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-standard)] motion-reduce:transition-none hover:border-[var(--accent)] hover:bg-[var(--sage-muted)] active:border-[var(--accent)] active:bg-[var(--sage-muted)] data-[selected=true]:border-[var(--accent)] data-[selected=true]:bg-[var(--sage-muted)]';
const blogArticleLinkClassName =
  'blog-article-link grid gap-1 px-3.5 py-3 [color:inherit] no-underline hover:no-underline focus-visible:no-underline focus-visible:[outline:2px_solid_var(--focus-ring)] focus-visible:[outline-offset:2px]';
// ds-literal: partial-role --body-sm — 15px 고정이다. `--body-sm` 은 데스크톱 14px ·
// 모바일 15px 로 뷰포트 축을 갖고(BQ-48) 이 제목은 그 **모바일 단계와만** 크기가 겹친다.
// 데스크톱에서는 토큰보다 1px 크고, 무게 600 · 행간 1.45 도 토큰의 400/1.55 와 다르다.
// 축을 따르지 않는 것이 의도다 — 목록 행의 제목은 두 폭에서 같은 크기로 선다.
// (처음 이 자리를 `off-ladder` 로 적었다가 가드가 거짓임을 잡았다: 15px 단계는 존재한다.)
const blogArticleLinkTitleClassName =
  'text-[15px] font-semibold leading-[1.45] text-[var(--ink)] [word-break:keep-all] [overflow-wrap:anywhere]';
// 잉크가 `--muted-aa` 가 아니라 `--ink-body` 인 이유: 선택된 행의 바닥은 흰 면이 아니라
// `--sage-muted` 이고, 그 위에서 `--muted-aa` 는 실측 4.38:1 로 AA 아래다. 이름이 AA 를
// 말하는 토큰이라도 그것이 측정된 바닥에서만 AA 다.
const blogArticleLinkSubtitleClassName = '[font:var(--caption)] text-[var(--ink-body)]';

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
      <h1 className={article ? blogKickerClassName : blogPageTitleClassName}>{headingLabel}</h1>
      {article ? (
        <article className={blogSelectedArticleClassName} data-testid="blog-selected-article">
          <h2 className={blogArticleTitleClassName}>{article.title}</h2>
          <p className={blogArticleBodyClassName}>{article.subtitle}</p>
        </article>
      ) : null}
      {articles.length > 0 ? (
        <section className={blogArticleListClassName}>
          {listLabel ? <h2 className={blogSectionTitleClassName}>{listLabel}</h2> : null}
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
                  <strong className={blogArticleLinkTitleClassName}>{listedArticle.title}</strong>
                  <span className={blogArticleLinkSubtitleClassName}>{listedArticle.subtitle}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="[font:var(--body-sm)] text-[var(--muted-aa)]" data-testid="blog-empty-state">
          No article available.
        </p>
      )}
    </section>
  );
}
