import {notFound} from 'next/navigation';
import {getTranslations} from 'next-intl/server';

import {isLocale} from '@/config/site';
import {LandingCatalogGridLoader} from '@/features/landing/grid';
import {LandingRuntime} from '@/features/landing/landing-runtime';
import {loadLandingCardMediaAssetVariants} from '@/features/landing/media/manifest.server';
import {PageShell} from '@/features/landing/shell';
import {RouteBuilder} from '@/lib/routes/route-builder';

export default async function LandingPage({
  params
}: {
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const t = await getTranslations({locale, namespace: 'landing'});
  const assetBackedVariants = await loadLandingCardMediaAssetVariants();

  return (
    <PageShell locale={locale} context="landing" currentRoute={RouteBuilder.landing()}>
      <LandingRuntime locale={locale} />
      {/*
        히어로 밴드가 아니라 **페이지 제목**이다(명세 §2-12). `design.md` §7.1 의 「No hero」 와
        본문 최상단 `h1` 중 하나를 골라야 했고, 모바일 GNB 에 화면 이름 슬롯이 없어 이 `h1` 이
        현재 위치를 말하는 유일한 것이라 제목을 남기는 쪽을 골랐다 — 대신 마케팅 밴드의 나머지를
        전부 걷는다. 제목 한 줄 · 부제 한 줄이고, 두 줄을 넘기지 않도록 12 locale 문구를 함께 줄였다:
        자르는 것이 계약이면 잘리지 않을 길이로 쓰는 것이 그 계약을 지키는 방식이다.

        **제목의 상한만 두 줄이다.** 기준 폭 390px 에서는 12 locale 전부 한 줄로 실현되고(실측),
        상한을 둘로 두는 것은 그보다 좁은 폰을 위해서다 — 320px 에서 제목이 여섯 locale 에서 넘치는데,
        거기서는 잘린 페이지 제목보다 접힌 페이지 제목이 낫다. 넘치지 않을 만큼 줄이려면 여섯 언어에서
        「작업」에 해당하는 말을 빼야 하고 그러면 문장의 뜻이 달라진다. 부제는 320px 에서도 12 locale
        전부 한 줄이므로 상한이 하나다.

        큰 헤드라인 클램프(`clamp(1.5rem,2.4vw,2.2rem)`)를 버리고 단위 5 의 `--h1` 을 쓴다 —
        폰 24px · 데스크톱 30px 로, 뷰포트 축을 가진 토큰이 그 일을 이미 하고 있다.
      */}
      <section className="landing-page-head grid gap-3 pb-[15px] pt-[15px]" aria-label={t('pageHeadAria')}>
        <h1 className="m-0 overflow-hidden text-ellipsis line-clamp-2 [font:var(--h1)] tracking-[var(--track-tight)]">
          {t('pageTitle')}
        </h1>
        <p className="m-0 overflow-hidden text-ellipsis line-clamp-1 [font:var(--body)] text-[var(--ink-body)]">
          {t('pageSubtitle')}
        </p>
      </section>

      <LandingCatalogGridLoader locale={locale} assetBackedVariants={assetBackedVariants} />
    </PageShell>
  );
}
