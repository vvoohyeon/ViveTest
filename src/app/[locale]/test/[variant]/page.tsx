import {notFound, redirect} from 'next/navigation';
import {getTranslations} from 'next-intl/server';

import {isLocale, type AppLocale} from '@/config/site';
import {PageShell} from '@/features/landing/shell';
import {getLazyValidatedVariant} from '@/features/test/lazy-validation';
import {TestQuestionClient} from '@/features/test/test-question-client';
import {
  isRuntimeTestEntryBlocked,
  resolveLandingTestEntryCardByVariant
} from '@/features/variant-registry';
import {buildLocalizedPath} from '@/i18n/localized-path';
import {RouteBuilder} from '@/lib/routes/route-builder';

type TestErrorRedirectPath = `/${AppLocale}/test/error?variant=${string}`;

function buildTestErrorRedirectPath(locale: AppLocale, variant: string): TestErrorRedirectPath {
  const encodedVariant = encodeURIComponent(variant);
  return `${buildLocalizedPath(RouteBuilder.testError(), locale)}?variant=${encodedVariant}`;
}

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
  if (isRuntimeTestEntryBlocked(variant)) {
    redirect(buildTestErrorRedirectPath(locale, variant));
  }

  const card = resolveLandingTestEntryCardByVariant(locale, variant);

  if (!card) {
    notFound();
  }

  const validation = getLazyValidatedVariant(variant);
  if (!validation.ok) {
    redirect(buildTestErrorRedirectPath(locale, variant));
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
