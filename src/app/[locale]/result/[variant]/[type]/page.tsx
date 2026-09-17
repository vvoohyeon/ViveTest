import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getTranslations} from 'next-intl/server';

import {isLocale} from '@/config/site';
import {PageShell} from '@/features/landing/shell';
import {readKeylessQuery, resolveResultView} from '@/features/test/result-view-model';
import {
  testBodyClassName,
  testDataRowClassName,
  testDataRowKeyClassName,
  testDataRowValueClassName,
  testPanelClassName,
  testPrimaryButtonClassName,
  testSecondaryButtonClassName,
  testTitleClassName,
  testWellClassName
} from '@/features/test/surface-class-names';
import {buildLocalizedPath} from '@/i18n/localized-path';
import {RouteBuilder} from '@/lib/routes/route-builder';

/**
 * 결과 화면의 주소 — `req-test.md` §5.1 의 `/result/{variant}/{type}?{base64}`.
 *
 * 그 절의 경로 표기는 **locale-free 표기**이고 실제 URL 은 `/{locale}/result/...` 다. 절의
 * 예시(`/result/mbti/infj`)에서 첫 조각은 scoring logic 이름이 아니라 **registry 의 variant
 * id** 이므로 제품에서는 `qmbti` · `egtt` 처럼 읽힌다.
 *
 * **이 라우트가 하는 일은 셋뿐이다** — locale 을 확인하고, 주소를 하나의 결과로 풀고, 두 갈래
 * 중 하나를 그린다. 푸는 일은 전부 `resolveResultView` 안에 있다: §6.3 의 실패 열 갈래가 거기서
 * 한 자리로 모이고, 라우트는 `ok` 하나만 본다. 그래서 **부분 렌더링이 구조적으로 불가능하다** —
 * 실패 갈래의 JSX 는 결과 내용을 한 조각도 손에 쥐지 못한다(§6.3 「부분 렌더링을 금지한다」).
 *
 * **내용 구성과 동적 OG 는 여기 없다.** `derived_type` 한 칸만 그리고 `axis_chart` · `type_desc`
 * 는 Phase 9 의 result content schema 를 기다린다 — 경계와 인계 순서는
 * `docs/plans/2026-05-17-result-pipeline-todos.md` 가 갖는다.
 */

const resultErrorLayoutClassName = 'mx-auto grid max-w-[460px] justify-items-center gap-4 px-4 py-8 text-center';
const resultActionsClassName = 'flex flex-wrap gap-2';
const resultActionButtonClassName = `${testPrimaryButtonClassName} min-w-[132px]`;
const resultSecondaryActionButtonClassName = `${testSecondaryButtonClassName} min-w-[132px]`;
const resultTypeWellClassName = `m-0 px-4 py-2 ${testWellClassName}`;

/**
 * 경로 세그먼트를 **디코딩해서** 모델에 넘긴다.
 *
 * App Router 는 동적 세그먼트를 날것 그대로 준다 — `/result/%20/INFJ` 의 `variant` 는 `' '` 가
 * 아니라 `'%20'` 이다(실측). 디코딩하지 않으면 「세그먼트 누락」(§6.3)에 닿는 입력이 전부
 * 「schema 를 찾을 수 없음」으로 보고되고, 두 갈래를 구분할 수 없게 된다. 정상 입력에는 아무
 * 영향이 없다 — variant id 는 `[a-z0-9-]` 뿐이다.
 *
 * 깨진 퍼센트 시퀀스(`%zz`)는 `decodeURIComponent` 가 던진다. 그때는 날것을 그대로 쓴다:
 * 어차피 registry 에 없는 이름이라 schema 조회에서 걸린다.
 */
function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function ResultPage({
  params,
  searchParams
}: {
  params: Promise<{locale: string; variant: string; type: string}>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const {locale, variant, type} = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const t = await getTranslations({locale, namespace: 'test'});
  const landingPath = buildLocalizedPath(RouteBuilder.landing(), locale);
  const currentRoute = RouteBuilder.result(variant, type);
  const resolved = resolveResultView({
    variant: decodeSegment(variant).trim(),
    typeSegment: decodeSegment(type).trim(),
    payload: readKeylessQuery(searchParams ? await searchParams : {})
  });

  if (!resolved.ok) {
    // 이름을 DOM 으로 내보내는 이유는 검사가 **어느 갈래를 밟았는지** 알아야 하기 때문이다.
    // 열 갈래가 모두 같은 패널을 그리므로, 이름이 없으면 잘못 만든 URL 이 엉뚱한 갈래로 떨어져도
    // 검사는 초록이 된다 — 같은 값이 두 후보에서 나오는 앵커는 검사가 아니다(L20).
    return (
      <PageShell locale={locale} context="result" currentRoute={currentRoute}>
        <section className={testPanelClassName} data-testid="result-error" data-result-failure={resolved.reason}>
          <div className={resultErrorLayoutClassName}>
            <h1 className={testTitleClassName}>{t('resultErrorTitle')}</h1>
            <p className={testBodyClassName}>{t('resultErrorBody')}</p>
            <Link className={resultActionButtonClassName} href={landingPath}>
              {t('goHome')}
            </Link>
          </div>
        </section>
      </PageShell>
    );
  }

  const {view} = resolved;
  const retakePath = buildLocalizedPath(RouteBuilder.question(view.variant), locale);

  return (
    <PageShell locale={locale} context="result" currentRoute={currentRoute}>
      <section className={testPanelClassName} data-testid="result-screen" data-result-audience={view.audience}>
        <div className="grid gap-4">
          <h1 className={testTitleClassName}>{t('resultPageTitle')}</h1>
          <dl className={resultTypeWellClassName} data-result-section="derived_type">
            <div className={testDataRowClassName}>
              <dt className={testDataRowKeyClassName}>{t('resultTypeLabel')}</dt>
              <dd className={testDataRowValueClassName} data-result-derived-type={view.derivedType}>
                {view.derivedType}
              </dd>
            </div>
          </dl>
          <div className={resultActionsClassName}>
            {/* §5.2 — 케이스 1 은 「다시하기」, 케이스 2 는 「나도 테스트하기」. 목적지는 같고
                문장이 다르다: 같은 링크를 받은 사람과 자기 결과를 보는 사람이 읽는 말이 다르다. */}
            <Link className={resultActionButtonClassName} href={retakePath}>
              {view.audience === 'own' ? t('resultRetake') : t('resultTakeTest')}
            </Link>
            <Link className={resultSecondaryActionButtonClassName} href={landingPath}>
              {t('goHome')}
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
