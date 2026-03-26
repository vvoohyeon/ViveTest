import {notFound} from 'next/navigation';
import {getTranslations} from 'next-intl/server';

import {isLocale} from '@/config/site';
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

  await getTranslations({locale, namespace: 'test'});

  return (
    <PageShell locale={locale} context="test" currentRoute={RouteBuilder.question(variant)}>
      <TestQuestionClient locale={locale} variant={variant} />
    </PageShell>
  );
}
