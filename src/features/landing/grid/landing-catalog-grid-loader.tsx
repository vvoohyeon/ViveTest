'use client';

import {useMemo} from 'react';
import {useTranslations} from 'next-intl';

import type {AppLocale} from '@/config/site';
import {LandingCatalogGrid} from '@/features/landing/grid/landing-catalog-grid';
import {ConsentRecallLink} from '@/features/landing/shell/consent-recall-link';
import {useTelemetryConsentSource} from '@/features/telemetry/consent-source';
import {resolveLandingCatalog} from '@/features/variant-registry';

interface LandingCatalogGridLoaderProps {
  locale: AppLocale;
  assetBackedVariants: ReadonlyArray<string>;
}

/**
 * 카탈로그가 줄어든 이유와 되돌리는 길을 **같은 자리**에 둔다. 드로어 어딘가에 두면 사라진
 * 것과 되돌리는 것이 서로 다른 화면의 일이 된다(명세 §2-1).
 *
 * 카드도 패널도 아닌 조용한 행이다 — 이것은 콘텐츠가 아니라 콘텐츠에 대한 말이다.
 */
const LANDING_CONSENT_NOTICE_CLASS =
  'landing-consent-notice m-0 mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-4 py-1 [font:var(--body-sm)] text-[var(--ink-body)]';

export function LandingCatalogGridLoader({locale, assetBackedVariants}: LandingCatalogGridLoaderProps) {
  const t = useTranslations('landing');
  const consentSnapshot = useTelemetryConsentSource();
  const consentState = consentSnapshot.synced ? consentSnapshot.consentState : 'UNKNOWN';
  const cards = useMemo(() => resolveLandingCatalog(locale, {consentState}), [consentState, locale]);

  /**
   * 숨은 개수는 **실제 필터 결과의 차**다. 상수로 적거나 attribute 를 다시 세지 않는다 —
   * 필터 규칙이 바뀌면 그 수가 조용히 거짓이 된다. `isCatalogVisibleCard` 가 세는 것과
   * 같은 것을 세려면 같은 함수를 두 번 부르는 것이 유일하게 정확한 방법이다.
   */
  const hiddenCardCount = useMemo(() => {
    if (consentState !== 'OPTED_OUT') {
      return 0;
    }

    return Math.max(0, resolveLandingCatalog(locale, {consentState: 'UNKNOWN'}).length - cards.length);
  }, [cards.length, consentState, locale]);

  return (
    <>
      {hiddenCardCount > 0 ? (
        <p className={LANDING_CONSENT_NOTICE_CLASS} data-testid="landing-consent-notice">
          {t('optedOutNotice', {count: hiddenCardCount})}
          <ConsentRecallLink
            label={t('optedOutNoticeAction')}
            tone="onMuted"
            testId="landing-consent-notice-action"
          />
        </p>
      ) : null}
      <LandingCatalogGrid cards={cards} assetBackedVariants={assetBackedVariants} />
    </>
  );
}
