'use client';

import Link from 'next/link';
import {useTranslations} from 'next-intl';
import {useEffect} from 'react';

import type {AppLocale} from '@/config/site';
import {trackResultViewed} from '@/features/telemetry/runtime';
import type {ResolvedQuestion} from '@/features/test/question-bank';
import {isProfileQuestion} from '@/features/test/question-runtime-utils';
import {buildLocalizedPath, type LocalizedRoutePath} from '@/i18n/localized-path';
import {RouteBuilder} from '@/lib/routes/route-builder';
import {
  testBodyClassName,
  testDataRowClassName,
  testDataRowKeyClassName,
  testDataRowValueClassName,
  testPrimaryButtonClassName,
  testSecondaryButtonClassName,
  testTitleClassName,
  testWellClassName
} from '@/features/test/surface-class-names';

const testShellStageClassName = 'test-shell-stage relative';
// 결과는 셸 카드(.vt-panel) **안에서** 렌더된다. 여기에 두 번째 패널을 얹으면 면 위에 같은
// 면이 겹치므로 이 원소는 면을 갖지 않는다 — 표본과 같은 구성이다: 패널 하나 안에 제목·본문·
// well·행동. 안쪽에서 유일하게 면을 갖는 것은 답변 목록(well)이다.
const testResultPanelClassName = 'test-result-panel grid gap-4';
// 답변 목록은 패널 **안**에 잠긴 well 이다 — `design.md` §6.10 의 조용한 데이터 행이고,
// 제품에서 유일하게 진짜로 표 형태인 내용이다.
const testResultGridClassName = `test-result-grid m-0 px-4 py-2 ${testWellClassName}`;
const testResultRowClassName = `test-result-row ${testDataRowClassName}`;
const testResultActionsClassName = 'test-result-actions flex flex-wrap gap-2';
const testResultActionButtonClassName = `${testPrimaryButtonClassName} min-w-[132px]`;
const testResultSecondaryActionButtonClassName = `${testSecondaryButtonClassName} min-w-[132px]`;

interface TestResultPanelProps {
  questions: ReadonlyArray<ResolvedQuestion>;
  answers: Record<string, string>;
  locale: AppLocale;
  landingPath: LocalizedRoutePath;
  route: string;
  variant: string;
  landingIngressFlag: boolean;
}

export function TestResultPanel({
  questions,
  answers,
  locale,
  landingPath,
  route,
  variant,
  landingIngressFlag
}: TestResultPanelProps) {
  const t = useTranslations('test');

  useEffect(() => {
    // 마운트 발화는 임시가 아니라 **현재 계약**이다 — `req-test.md:75` 가 그것을 적고
    // `tests/unit/test-result-panel.test.ts` 가 고정한다. 지금 이 표면에는 결과 콘텐츠가
    // 없으므로(결과 fixture 는 `{variantId}` 뿐이고 Result content schema 는 Phase 9 소유,
    // `req-test.md:94`·`:1035`) 관측할 `derived_type` 블록 자체가 존재하지 않는다.
    // 교체 조건과 순서: `docs/plans/2026-05-17-result-pipeline-todos.md`.
    trackResultViewed({
      locale,
      route,
      variant,
      landingIngressFlag
    });
  }, [landingIngressFlag, locale, route, variant]);

  return (
    <div className={testShellStageClassName} data-testid="test-stage">
      <div className={testResultPanelClassName} data-testid="test-result-panel">
        <div className="grid gap-2">
          <h2 className={testTitleClassName}>{t('resultLabel')}</h2>
          <p className={testBodyClassName}>{t('resultBody')}</p>
        </div>
        <dl className={testResultGridClassName}>
          {questions
            // TODO(result-pipeline): remove filter when result panel is replaced in 2위
            .filter((question) => !isProfileQuestion(question))
            .map((question) => (
              <div key={question.id} className={testResultRowClassName}>
                <dt className={testDataRowKeyClassName}>{question.id.toUpperCase()}</dt>
                <dd className={testDataRowValueClassName}>{answers[String(question.canonicalIndex)]}</dd>
              </div>
            ))}
        </dl>
        <div className={testResultActionsClassName}>
          <Link className={testResultActionButtonClassName} href={landingPath}>
            {t('goHome')}
          </Link>
          <Link
            className={testResultSecondaryActionButtonClassName}
            href={buildLocalizedPath(RouteBuilder.history(), locale)}
          >
            {t('goHistory')}
          </Link>
        </div>
      </div>
    </div>
  );
}
