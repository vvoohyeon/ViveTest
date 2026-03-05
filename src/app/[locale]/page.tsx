import {notFound} from 'next/navigation';
import {getTranslations} from 'next-intl/server';

import {isLocale} from '@/config/site';
import {createLandingCatalog} from '@/features/landing/data';
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
  const catalog = createLandingCatalog(locale);
  const availableCount = catalog.filter((card) => card.availability === 'available').length;
  const unavailableCount = catalog.filter((card) => card.availability === 'unavailable').length;

  return (
    <PageShell locale={locale} context="landing" currentRoute={RouteBuilder.landing()}>
      <section className="landing-hero" aria-label="Landing Hero">
        <h1>{t('heroTitle')}</h1>
        <p>{t('heroBody')}</p>
      </section>

      <section className="landing-shell-card">
        <h2>Catalog Shell</h2>
        <p>{`Locale: ${locale}`}</p>
        <p>{`Cards: ${catalog.length} total / ${availableCount} available / ${unavailableCount} unavailable`}</p>
      </section>
    </PageShell>
  );
}
