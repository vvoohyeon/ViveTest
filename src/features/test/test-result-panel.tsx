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

const testPanelSurfaceClassName =
  'rounded-[18px] p-5 [background:color-mix(in_srgb,var(--panel-solid)_94%,transparent)] [box-shadow:var(--dialog-shadow)]';
const testButtonFocusRingClassName =
  'focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--focus-ring-inner),0_0_0_4px_var(--focus-ring-outer)]';
const testButtonBaseClassName =
  `inline-flex min-h-[46px] cursor-pointer items-center justify-center rounded-[14px] border px-[14px] py-3 text-center font-semibold leading-[1.35] text-[var(--text-strong)] [font:inherit] [transition-duration:140ms] [transition-property:border-color,background-color,box-shadow,color,transform] [transition-timing-function:ease] disabled:!cursor-not-allowed disabled:!border-[var(--interactive-disabled-border)] disabled:!bg-[var(--interactive-disabled-bg)] disabled:!text-[var(--interactive-disabled-ink)] disabled:!opacity-100 disabled:!shadow-none disabled:hover:!border-[var(--interactive-disabled-border)] disabled:hover:!bg-[var(--interactive-disabled-bg)] disabled:hover:!text-[var(--interactive-disabled-ink)] disabled:hover:!shadow-none disabled:hover:!translate-y-0 ${testButtonFocusRingClassName}`;
const testPrimaryButtonClassName =
  `${testButtonBaseClassName} border-[var(--interactive-accent-border)] bg-[var(--interactive-accent-bg)] shadow-[inset_0_0_0_1px_var(--interactive-accent-outline),var(--interactive-accent-shadow)] hover:border-[var(--interactive-accent-border-strong)] hover:bg-[var(--interactive-accent-bg-hover)] hover:-translate-y-px active:bg-[var(--interactive-accent-bg-pressed)] active:translate-y-0 focus-visible:shadow-[inset_0_0_0_1px_var(--interactive-accent-outline),0_0_0_2px_var(--focus-ring-inner),0_0_0_4px_var(--focus-ring-outer),var(--interactive-accent-shadow)]`;
const testSecondaryButtonClassName =
  `${testButtonBaseClassName} border-[var(--interactive-neutral-border)] bg-[var(--interactive-neutral-bg-strong)] hover:border-[var(--interactive-neutral-border-strong)] hover:bg-[var(--interactive-neutral-bg-hover)] active:bg-[var(--interactive-neutral-bg-pressed)]`;
const testShellStageClassName = 'test-shell-stage relative';
const testResultPanelClassName = `test-result-panel ${testPanelSurfaceClassName}`;
const testResultGridClassName = 'test-result-grid m-0 grid gap-2';
const testResultRowClassName = 'test-result-row flex justify-between gap-3';
const testResultActionsClassName = 'test-result-actions flex flex-wrap gap-[10px]';
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
    // TODO: Replace with IntersectionObserver on derived_type block in 2위 result pipeline session; add derived_type to payload at that time.
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
        <h2 className="m-0">{t('resultLabel')}</h2>
        <p className="m-0">{t('resultBody')}</p>
        <dl className={testResultGridClassName}>
          {questions
            // TODO(result-pipeline): remove filter when result panel is replaced in 2위
            .filter((question) => !isProfileQuestion(question))
            .map((question) => (
              <div key={question.id} className={testResultRowClassName}>
                <dt className="m-0">{question.id.toUpperCase()}</dt>
                <dd className="m-0">{answers[String(question.canonicalIndex)]}</dd>
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
