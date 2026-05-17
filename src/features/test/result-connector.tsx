'use client';

import type {AppLocale} from '@/config/site';
import type {ResolvedQuestion} from '@/features/test/question-bank';
import {TestResultPanel} from '@/features/test/test-result-panel';
import type {LocalizedRoutePath} from '@/i18n/localized-path';

interface ResultConnectorProps {
  questions: ReadonlyArray<ResolvedQuestion>;
  answers: Record<string, string>;
  locale: AppLocale;
  landingPath: LocalizedRoutePath;
  route: string;
  variant: string;
  landingIngressFlag: boolean;
}

export function ResultConnector({
  questions,
  answers,
  locale,
  landingPath,
  route,
  variant,
  landingIngressFlag
}: ResultConnectorProps) {
  // TODO(2위 result pipeline): add derivedType when result pipeline is implemented
  return (
    <TestResultPanel
      questions={questions}
      answers={answers}
      locale={locale}
      landingPath={landingPath}
      route={route}
      variant={variant}
      landingIngressFlag={landingIngressFlag}
    />
  );
}
