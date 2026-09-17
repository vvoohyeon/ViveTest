import type {Metadata, Viewport} from 'next';
import {headers} from 'next/headers';
import type {ReactNode} from 'react';

import {APP_BODY_CLASSNAME} from '@/app/app-body-class';
import {VercelAnalyticsGate} from '@/app/vercel-analytics-gate';
import {VercelSpeedInsightsGate} from '@/app/vercel-speed-insights-gate';
import {THEME_GROUND_COLOR} from '@/app/theme-ground-color';
import {resolveHtmlLang, resolveSiteOrigin} from '@/config/site';
import {THEME_BOOTSTRAP_SOURCE} from '@/features/gnb/theme-bootstrap-source';
import {resolveRequestLocaleFromHeaderBag} from '@/i18n/request-locale-header';

import './globals.css';

const SITE_NAME = 'ViveTest';
const SITE_DESCRIPTION = 'Short personality and aptitude tests you can finish in a few minutes.';

export const metadata: Metadata = {
  // 절대 URL 의 기준. OG 이미지와 canonical 은 상대 경로로 성립하지 않는다 — 크롤러에게는
  // 그것을 해석할 문서 문맥이 없다. origin 의 출처는 `resolveSiteOrigin` 이 적는다.
  metadataBase: new URL(resolveSiteOrigin()),
  title: SITE_NAME,
  // 종전 값은 `Reset baseline placeholder` 였고 그대로 프로덕션에 나갔다.
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  manifest: '/manifest.webmanifest',
  // **정적 OG 까지만이다.** 결과별로 달라지는 동적 OG 카드는 결과 화면의 내용 스키마가 정해진
  // 뒤에야 만들 수 있고 이번 범위 밖이다(분석 §15 결정 8). 그림은 `opengraph-image.tsx` 가
  // 파일 규약으로 붙이고, locale 별 문장은 `[locale]/layout.tsx` 가 덮어쓴다.
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION
  }
  // `twitter:*` 는 두지 않는다. X 를 비롯한 소비자들이 `twitter:*` 가 없으면 OG 로 폴백하므로
  // 얻는 것이 없는데, 카드 종류 이름이 `check-variant-registry-contracts` 가 금지하는 legacy
  // 토큰과 글자가 겹친다. 가드에 예외를 파는 대신 계획서가 요구하지 않은 이 추가를 걷는다.
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // `env(safe-area-inset-*)` 는 이것이 없으면 **항상 0 이다.** 저장소에 그 함수를 쓰는 자리가
  // 둘 있는데 지금까지 한 번도 0 이 아닌 적이 없었다. step 3 의 시트가 홈 인디케이터와 겹치는
  // 첫 표면이라 여기서 먼저 연다.
  viewportFit: 'cover',
  // 두 값을 다 내되, **OS 가 아니라 해석된 테마**를 따라가는 것은 부트스트랩과 preference
  // 변경 경로가 맡는다(`theme-bootstrap-source.ts`). `media` 만으로 끝내면 OS-다크에서
  // 라이트를 고른 사용자의 크롬이 다크로 남아 theme F5 와 같은 결함을 새로 만든다.
  themeColor: [
    {media: '(prefers-color-scheme: light)', color: THEME_GROUND_COLOR.light},
    {media: '(prefers-color-scheme: dark)', color: THEME_GROUND_COLOR.dark}
  ]
};

export default async function RootLayout({children}: {children: ReactNode}) {
  const requestHeaders = await headers();
  const locale = resolveRequestLocaleFromHeaderBag(requestHeaders);

  // `lang` 은 **표시용 BCP 47 태그**다. 제품 locale 코드(`kr`·`zs`·`zt`)는 BCP 47 이 아니므로
  // 그대로 내보내면 WCAG 3.1.1 을 어긴다 — URL·스토리지·telemetry 의 정본은 코드 그대로 두고
  // 이 한 자리만 태그로 바꾼다.
  return (
    <html data-theme="light" lang={resolveHtmlLang(locale)} suppressHydrationWarning>
      <body className={APP_BODY_CLASSNAME}>
        {/* 첫 페인트를 막는 동기 스크립트다. 별도 요청이면 문서보다 늦게 도착해 다크
            사용자가 라이트 화면을 본다(실측 Fast 4G 1,343ms · Slow 4G 5,483ms). */}
        <script dangerouslySetInnerHTML={{__html: THEME_BOOTSTRAP_SOURCE}} />
        {children}
        {/* 기존 opt-in 정책을 지킨 사용자에게만 Vercel Analytics를 연결한다. */}
        <VercelAnalyticsGate />
        {/* Speed Insights도 같은 consent source를 따라 opt-in 시에만 활성화한다. */}
        <VercelSpeedInsightsGate />
      </body>
    </html>
  );
}
