import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getTranslations} from 'next-intl/server';

import {isLocale} from '@/config/site';
import type {RecoveryCandidate} from '@/features/test/recovery-cards';
import {TestErrorRecoveryCards} from '@/features/test/test-error-recovery-cards';
import {isEnterableCard, isRuntimeTestEntryBlocked, resolveLandingCatalog} from '@/features/variant-registry';
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
 * 앞으로 가는 경로를 최소 하나 둔다(명세 §2-8) — 막다른 곳에 막다른 화면을 두지 않는다. 랜딩
 * CTA 가 그 하나이고, §6.1 「Phase 4 확장 계약」의 복구 카드가 그 위에 둘을 더한다.
 */

/**
 * 계약 1 항의 「카탈로그 카드 목록」을 **진입 가능한 테스트**로 좁힌다.
 *
 * 계약의 네 규칙은 이 좁힘을 적지 않는다. 그래도 좁히는 이유는 같은 절이 적은 「막다른 곳에
 * 막다른 화면을 두지 않는다」 때문이다 — 진입이 막힌 variant 를 집어 주면 그 카드는 사용자를
 * **지금 보고 있는 이 화면으로** 되돌려 보내고, 출시 예정(`unavailable`) 카드는 아무 데도
 * 보내지 않는다. 카드가 둘 다 아닌 것이 되면 이 단위가 없애려던 상태가 그대로 남는다.
 *
 * **진입 가능 여부는 `isEnterableCard` 가 이미 갖고 있다**(`available` 또는 `opt_out`). 여기서
 * `attribute === 'available'` 로 다시 적지 않는다 — 그러면 동의 고지를 달고 들어가는 `opt_out`
 * 카드가 조용히 빠지고, 같은 판정의 정본이 둘이 된다. 카탈로그 가시성(`hide` · `debug` · 동의
 * 상태)은 `resolveLandingCatalog` 가 이미 걸렀다.
 */
function resolveRecoveryCandidates(locale: Parameters<typeof resolveLandingCatalog>[0]): RecoveryCandidate[] {
  return resolveLandingCatalog(locale)
    .filter((card) => card.type === 'test' && isEnterableCard(card.attribute))
    .filter((card) => !isRuntimeTestEntryBlocked(card.variant))
    .map((card) => ({
      variantId: card.variant,
      name: card.title,
      href: buildLocalizedPath(RouteBuilder.question(card.variant), locale)
    }));
}

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
    >
      <TestErrorRecoveryCards candidates={resolveRecoveryCandidates(locale)} label={t('pickUpLabel')} />
    </RecoverySurface>
  );
}
