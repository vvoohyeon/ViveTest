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

  // **404 로 떨어뜨리지 않는다.** `[locale]` 안에서 해결되는 404 는 이 앱에서 `<body>` 가 빈
  // Next 오류 문서(`html#__next_error__`)로 나간다 — 상태 코드는 404 인데 스크립트를 돌리기
  // 전에는 아무 글자도 없다(실측 2026-09-16). 그리고 `req-test.md` §6.1 은 애초에 invalid
  // variant 를 404 가 아니라 **에러 복구 페이지**로 보내라고 정해 두었다. 같은 파일 아래 두
  // 분기와 형제 라우트(blog 상세)가 이미 그렇게 한다.
  if (!/^[a-z0-9-]+$/u.test(variant)) {
    redirect(buildTestErrorRedirectPath(locale, variant));
  }

  await getTranslations({locale, namespace: 'test'});
  if (isRuntimeTestEntryBlocked(variant)) {
    redirect(buildTestErrorRedirectPath(locale, variant));
  }

  const card = resolveLandingTestEntryCardByVariant(locale, variant);

  if (!card) {
    redirect(buildTestErrorRedirectPath(locale, variant));
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
      screenTitle={card.title}
    >
      <TestQuestionClient key={`${locale}:${variant}`} locale={locale} card={card} />
    </PageShell>
  );
}
