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
      <section className="landing-shell-card grid gap-2 rounded-[16px] p-[18px] [background:color-mix(in_srgb,var(--panel-solid)_90%,transparent)] [box-shadow:var(--card-shadow)]">
        <h1 className="m-0">{t('title')}</h1>
        <p className="m-0 text-[var(--muted-ink)]">{`Locale: ${locale}`}</p>
        <p className="m-0 text-[var(--muted-ink)]">{t('body')}</p>
      </section>
    </PageShell>
  );
}
