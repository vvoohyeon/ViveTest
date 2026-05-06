import type {Metadata} from 'next';
import {notFound, redirect} from 'next/navigation';
import {getTranslations} from 'next-intl/server';

import {isLocale} from '@/config/site';
import {BlogDestinationClient} from '@/features/blog/blog-destination-client';
import {getBlogDetailPageModel} from '@/features/blog/server-model';
import {PageShell} from '@/features/landing/shell';
import {buildLocalizedPath} from '@/i18n/localized-path';
import {RouteBuilder} from '@/lib/routes/route-builder';

export async function generateMetadata({
  params
}: {
  params: Promise<{locale: string; variant: string}>;
}): Promise<Metadata> {
  const {locale, variant} = await params;

  if (!isLocale(locale)) {
    return {
      title: 'ViveTest'
    };
  }

  const pageModel = getBlogDetailPageModel(locale, variant);
  return {
    title: pageModel?.article.title ?? 'ViveTest'
  };
}

export default async function BlogArticlePage({
  params
}: {
  params: Promise<{locale: string; variant: string}>;
}) {
  const {locale, variant} = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const pageModel = getBlogDetailPageModel(locale, variant);
  if (!pageModel) {
    redirect(buildLocalizedPath(RouteBuilder.blog(), locale));
  }

  const t = await getTranslations({locale, namespace: 'blog'});

  return (
    <PageShell locale={locale} context="blog" currentRoute={RouteBuilder.blogArticle(variant)}>
      <BlogDestinationClient
        locale={locale}
        headingLabel={t('selected')}
        listLabel={t('allArticles')}
        article={pageModel.article}
        articles={pageModel.articles}
      />
    </PageShell>
  );
}
