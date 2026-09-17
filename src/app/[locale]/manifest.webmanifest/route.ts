import type {MetadataRoute} from 'next';
import {getTranslations} from 'next-intl/server';

import {THEME_GROUND_COLOR} from '@/app/theme-ground-color';
import {isLocale, locales} from '@/config/site';

/**
 * locale 별 web app manifest.
 *
 * 루트 `src/app/manifest.ts` 는 **한 벌**이라 「홈 화면에 추가」 대화상자가 어느 언어에서
 * 들어왔든 영어 설명을 보여 줬다. 설명 문장은 이미 12 locale 에 있다 —
 * `meta.description` 이 `<meta name="description">` 과 OG 를 그리는 데 쓰이고 있었고,
 * manifest 만 그것을 읽지 않은 채 영어 상수를 들고 있었다. 그래서 여기서 새로 만드는 문자열은
 * 하나도 없다.
 *
 * `name` 은 번역하지 않는다 — 브랜드명이다.
 *
 * `start_url` 은 루트와 달리 **`/{locale}`** 이다. 루트가 `/` 인 이유는 쿠키·`Accept-Language`
 * 해석을 앞지르지 않기 위해서인데, 이 사본은 이미 그 해석이 끝난 페이지에서 설치되므로 앞지를
 * 것이 없다 — 오히려 설치한 그 언어로 바로 열리는 쪽이 맞다.
 */
export function generateStaticParams() {
  return locales.map((locale) => ({locale}));
}

export async function GET(
  _request: Request,
  {params}: {params: Promise<{locale: string}>}
): Promise<Response> {
  const {locale} = await params;

  if (!isLocale(locale)) {
    return new Response('Not Found', {status: 404});
  }

  const t = await getTranslations({locale, namespace: 'meta'});

  const manifest: MetadataRoute.Manifest = {
    name: 'ViveTest',
    short_name: 'ViveTest',
    description: t('description'),
    start_url: `/${locale}`,
    display: 'standalone',
    background_color: THEME_GROUND_COLOR.light,
    theme_color: THEME_GROUND_COLOR.light,
    // 아이콘 근거는 루트 manifest 가 적는다 — 같은 목록을 두 곳에서 각자 고르면 갈라진다.
    icons: [
      {src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any'},
      {src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable'}
    ]
  };

  return Response.json(manifest, {
    headers: {'content-type': 'application/manifest+json'}
  });
}
