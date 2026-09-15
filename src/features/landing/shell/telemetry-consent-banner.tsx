'use client';

import {useTranslations} from 'next-intl';

import {ConsentBanner, type ConsentPreviousChoice} from '@/features/landing/shell/consent-banner';
import {dismissConsentRecall, useConsentRecall} from '@/features/telemetry/consent-recall';
import {setTelemetryConsentState, useTelemetryConsentSource} from '@/features/telemetry/consent-source';

export function TelemetryConsentBanner() {
  const t = useTranslations('consent');
  const consentSnapshot = useTelemetryConsentSource();
  const recallSnapshot = useConsentRecall();

  const isUnknown = consentSnapshot.consentState === 'UNKNOWN';
  /**
   * **재호출 모드는 이미 답한 사람에게만 있다.** 미선택 상태에서는 배너가 이미 떠 있고, 그
   * 배너에는 닫기 X 가 없다 — 거기서는 선택이 곧 닫기이기 때문이다(명세 §2-5). 그래서 재호출
   * 링크를 미선택 상태에서 누르면 모양은 그대로이고 포커스만 배너로 간다.
   */
  const isRecall = recallSnapshot.requested && !isUnknown;
  const isVisible = consentSnapshot.synced && (isUnknown || isRecall);

  if (!isVisible) {
    return null;
  }

  const previousChoice: ConsentPreviousChoice = isRecall
    ? consentSnapshot.consentState === 'OPTED_IN'
      ? 'accept'
      : 'deny'
    : null;

  return (
    <ConsentBanner
      regionLabel={t('regionLabel')}
      message={t('message')}
      primaryLabel={t('accept')}
      secondaryLabel={t('deny')}
      dismissible={isRecall}
      closeLabel={t('close')}
      previousChoice={previousChoice}
      previousChoiceLabel={t('previousChoice')}
      focusToken={recallSnapshot.requestId}
      onCloseRequest={() => {
        dismissConsentRecall();
      }}
      onPrimaryAction={() => {
        setTelemetryConsentState('OPTED_IN');
        // 선택은 곧 닫기다. 재호출 요청을 함께 거두지 않으면 답한 직후의 배너가 **재호출
        // 모드로 다시 서고** 닫히지 않는다.
        dismissConsentRecall();
      }}
      onSecondaryAction={() => {
        setTelemetryConsentState('OPTED_OUT');
        dismissConsentRecall();
      }}
    />
  );
}
