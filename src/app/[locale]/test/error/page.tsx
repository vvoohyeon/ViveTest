import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getTranslations} from 'next-intl/server';

import {isLocale} from '@/config/site';
import {RecoverySurface, recoveryActionClassName} from '@/features/ui/recovery-surface';
import {buildLocalizedPath} from '@/i18n/localized-path';
import {RouteBuilder} from '@/lib/routes/route-builder';

/**
 * 테스트 진입 실패의 복구 화면 — `req-test.md` §6.1 · 명세 §2-8.
 *
 * **variant 식별자를 화면에 두지 않는다.** 종전에는 제목이 하드코딩된 한국어였고 그 안에 raw
 * variant id 가 끼워져 열두 로케일 전부에 그대로 나갔다 — 읽는 사람에게 `debug-sample` 은 아무
 * 뜻이 없고, 있는 그대로 보여 준다고 해서 돌아갈 길이 생기지도 않는다. 식별자는 **쿼리에 남아**
 * 운영자가 로그로 볼 수 있고, 화면은 무엇이 일어났는지와 어디로 갈 수 있는지만 말한다.
 *
 * 앞으로 가는 경로를 최소 하나 둔다(명세 §2-8) — 막다른 곳에 막다른 화면을 두지 않는다.
 */
export default async function TestErrorPage({
  params
}: {
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const t = await getTranslations({locale, namespace: 'error'});

  return (
    <RecoverySurface
      testId="test-error-recovery"
      title={t('entryBlockedTitle')}
      body={t('entryBlockedBody')}
      actions={
        <Link className={recoveryActionClassName} href={buildLocalizedPath(RouteBuilder.landing(), locale)}>
          {t('backToLanding')}
        </Link>
      }
    />
  );
}
