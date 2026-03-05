import {notFound} from 'next/navigation';
import {getTranslations} from 'next-intl/server';

import {isLocale} from '@/config/site';
import {PageShell} from '@/features/landing/shell';
import {RouteBuilder} from '@/lib/routes/route-builder';

export default async function HistoryPage({
  params
}: {
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const t = await getTranslations({locale, namespace: 'history'});

  return (
    <PageShell locale={locale} context="history" currentRoute={RouteBuilder.history()}>
      <section className="landing-shell-card">
        <h1>{t('title')}</h1>
        <p>{`Locale: ${locale}`}</p>
        <p>{t('body')}</p>
      </section>
    </PageShell>
  );
}
