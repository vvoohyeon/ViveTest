import {notFound} from 'next/navigation';
import {getTranslations} from 'next-intl/server';

import {isLocale} from '@/config/site';
import {LandingCatalogGridLoader} from '@/features/landing/grid';
import {LandingRuntime} from '@/features/landing/landing-runtime';
import {PageShell} from '@/features/landing/shell';
import {RouteBuilder} from '@/lib/routes/route-builder';

export default async function LandingPage({
  params
}: {
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const t = await getTranslations({locale, namespace: 'landing'});

  return (
    <PageShell locale={locale} context="landing" currentRoute={RouteBuilder.landing()}>
      <LandingRuntime locale={locale} />
      <section className="landing-hero" aria-label="Landing Hero">
        <h1>{t('heroTitle')}</h1>
        <p>{t('heroBody')}</p>
      </section>

      <LandingCatalogGridLoader locale={locale} />
    </PageShell>
  );
}
