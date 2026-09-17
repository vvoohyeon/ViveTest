import {notFound} from 'next/navigation';
import {getTranslations} from 'next-intl/server';

import {isLocale} from '@/config/site';
import {PageShell} from '@/features/landing/shell';
import {RunHistoryList} from '@/features/test/run-history-list';
import {resolveLandingCatalog} from '@/features/variant-registry';
import {buildLocalizedPath} from '@/i18n/localized-path';
import {RouteBuilder} from '@/lib/routes/route-builder';

/**
 * 이 기기의 회차 목록 — 명세 §2-7, **목록까지만**.
 *
 * 라우트는 껍데기와 **이름표**만 만든다. 목록 자체는 이 기기의 저장소에 있어 클라이언트가 읽고,
 * 테스트 이름은 여기서 푼다 — 카탈로그를 클라이언트로 통째로 내려보내지 않기 위해서다.
 *
 * (저장소 API 이름을 이 파일에 적지 않는다. `check-phase1` 의 SSR 결정성 가드는 서버 컴포넌트
 * 안의 그 **토큰**을 세며, 주석인지 코드인지 가리지 않는다 — 가려서 세면 문자열로 감싼 호출을
 * 놓치기 때문이다. 산문 한 줄 때문에 가드를 느슨하게 만들 이유는 없다.)
 *
 * 이름을 **`qa` 카탈로그**에서 푸는 이유는 동의 상태가 목록을 가리지 않게 하기 위해서다.
 * 공개 카탈로그는 `OPTED_OUT` 에서 카드를 숨기는데, 숨는 것은 **들어갈 수 있는 입구**이지 이미
 * 한 회차의 이름이 아니다. 이름이 없으면 그 줄은 variant id 를 그대로 보인다.
 *
 * 종전에 본문에 있던 `Locale: en` 은 프로덕션으로 나가던 디버그 문자열이고 여기서 사라진다.
 */

const historyPanelClassName =
  'landing-shell-card grid gap-4 rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-[var(--canvas-elevated)] p-5 shadow-[var(--shadow-rest)]';
const historyHeadClassName = 'grid gap-2';
const historyTitleClassName = 'm-0 [font:var(--h3)] text-[var(--ink)]';
const historyBodyClassName = 'm-0 [font:var(--body-sm)] text-[var(--muted-aa)]';

export default async function HistoryPage({
  params
}: {
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const t = await getTranslations({locale, namespace: 'history'});
  const testNames = Object.fromEntries(
    resolveLandingCatalog(locale, {audience: 'qa'})
      .filter((card) => card.type === 'test')
      .map((card) => [card.variant, card.title])
  );

  return (
    <PageShell locale={locale} context="history" currentRoute={RouteBuilder.history()}>
      <section className={historyPanelClassName}>
        <div className={historyHeadClassName}>
          <h1 className={historyTitleClassName}>{t('title')}</h1>
          <p className={historyBodyClassName}>{t('body')}</p>
        </div>
        <RunHistoryList
          locale={locale}
          landingPath={buildLocalizedPath(RouteBuilder.landing(), locale)}
          testNames={testNames}
        />
      </section>
    </PageShell>
  );
}
