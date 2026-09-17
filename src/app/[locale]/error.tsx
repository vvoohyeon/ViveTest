'use client';

import Link from 'next/link';
import {useLocale, useTranslations} from 'next-intl';
import {useEffect} from 'react';

import {isLocale, defaultLocale} from '@/config/site';
import {
  buttonFormBaseClassName,
  buttonPrimaryClassName,
  buttonPrimaryLiftClassName,
  buttonSecondaryClassName
} from '@/features/ui/button-class-names';
import {RecoverySurface} from '@/features/ui/recovery-surface';
import {buildLocalizedPath} from '@/i18n/localized-path';
import {RouteBuilder} from '@/lib/routes/route-builder';

/**
 * locale 경계 안의 오류 경계 — 명세 §2-8.
 *
 * 이것이 없으면 예외 하나가 화면을 **Next 의 기본 오류 화면**으로 바꾼다: 영어 한 벌, 테마
 * 없음, 브라우저 기본 32px 제목, 그리고 앞으로 가는 경로 0 개. 제품이 12 locale 로 번역돼 있고
 * 테마가 둘인데, 가장 나쁜 순간에만 그 둘이 사라진다.
 *
 * **경계는 안쪽에 있어야 번역된다.** `[locale]/layout.tsx` 의 `NextIntlClientProvider` 아래라
 * 읽는 사람의 언어로 말할 수 있고, GNB 와 테마도 그대로 남는다. 바깥의 `global-error.tsx` 는
 * 루트 레이아웃까지 무너졌을 때만 도는 마지막 그물이고 거기서는 번역이 불가능하다.
 *
 * 행동이 둘인 이유: 다시 그리기가 되는 오류가 많고(일시적 네트워크·경합), 안 되면 랜딩으로
 * 나갈 수 있어야 한다. 하나만 두면 그 하나가 안 통하는 순간 막다른 곳이 된다.
 */
export default function LocaleError({error, reset}: {error: Error & {digest?: string}; reset: () => void}) {
  const t = useTranslations('error');
  const locale = useLocale();

  useEffect(() => {
    // 화면에는 오류 코드를 두지 않는다(voice 규칙). 운영자가 볼 자리는 콘솔이다.
    console.error('Locale route render failed', {digest: error.digest, message: error.message});
  }, [error]);

  return (
    <RecoverySurface
      testId="locale-error-boundary"
      title={t('crashTitle')}
      body={t('crashBody')}
      actions={
        <>
          <button
            type="button"
            className={`${buttonFormBaseClassName} ${buttonPrimaryClassName} ${buttonPrimaryLiftClassName}`}
            onClick={reset}
            data-testid="locale-error-retry"
          >
            {t('retry')}
          </button>
          <Link
            className={`${buttonFormBaseClassName} ${buttonSecondaryClassName}`}
            href={buildLocalizedPath(RouteBuilder.landing(), isLocale(locale) ? locale : defaultLocale)}
          >
            {t('backToLanding')}
          </Link>
        </>
      }
    />
  );
}
