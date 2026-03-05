import {notFound} from 'next/navigation';
import {getTranslations} from 'next-intl/server';

import {isLocale} from '@/config/site';
import {PageShell} from '@/features/landing/shell';
import {RouteBuilder} from '@/lib/routes/route-builder';

export default async function QuestionPage({
  params
}: {
  params: Promise<{locale: string; variant: string}>;
}) {
  const {locale, variant} = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  if (!/^[a-z0-9-]+$/u.test(variant)) {
    notFound();
  }

  const t = await getTranslations({locale, namespace: 'test'});

  return (
    <PageShell locale={locale} context="test" currentRoute={RouteBuilder.question(variant)}>
      <section className="landing-shell-card">
        <h1>Test Shell</h1>
        <p>{`Locale: ${locale}`}</p>
        <p>{`Variant: ${variant}`}</p>
        <p>{t('instructionTitle')}</p>
        <p>{t('progress', {current: 1, total: 12})}</p>
      </section>
    </PageShell>
  );
}
