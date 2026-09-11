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
  // `derivedType` 을 여기서 내려보내려면 런타임 `'A' | 'B'` 를 도메인 토큰으로 바꾸는 층이
  // 필요한데, `response-projection.ts` 는 아직 export 가 없는 계약 예약 stub 이다. 도메인
  // 쪽(`computeScoreStats` · `deriveDerivedType` · `schema-registry`)은 이미 있으므로 없는
  // 것은 그 사이의 한 층뿐이다. 순서: `docs/plans/2026-05-17-result-pipeline-todos.md` §3.
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
