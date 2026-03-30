import {notFound} from 'next/navigation';
import {getTranslations} from 'next-intl/server';

import {isLocale} from '@/config/site';
import {findLandingTestCardByVariant} from '@/features/landing/data';
import {PageShell} from '@/features/landing/shell';
import {TestQuestionClient} from '@/features/test/test-question-client';
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

  await getTranslations({locale, namespace: 'test'});
  const card = findLandingTestCardByVariant(locale, variant);

  if (!card) {
    notFound();
  }

  return (
    <PageShell
      locale={locale}
      context="test"
      currentRoute={RouteBuilder.question(variant)}
      showDefaultConsentBanner={false}
    >
      <TestQuestionClient key={`${locale}:${variant}`} locale={locale} card={card} />
    </PageShell>
  );
}
