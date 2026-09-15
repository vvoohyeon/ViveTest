import type {MetadataRoute} from 'next';

import {THEME_GROUND_COLOR} from '@/app/theme-ground-color';

/**
 * Web app manifest. 종전에는 없었고, 그래서 모바일 브라우저의 「홈 화면에 추가」가 이름도
 * 색도 갖지 못했다.
 *
 * `start_url` 은 locale 을 붙이지 않는다 — `src/proxy.ts` 가 쿠키·`Accept-Language` 로 풀어
 * canonical 경로로 redirect 하므로, 여기서 한 locale 을 고정하면 그 해석을 앞질러 버린다.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ViveTest',
    short_name: 'ViveTest',
    description: 'Short personality and aptitude tests you can finish in a few minutes.',
    start_url: '/',
    display: 'standalone',
    background_color: THEME_GROUND_COLOR.light,
    theme_color: THEME_GROUND_COLOR.light,
    // 종전에 `icons` 가 없어 「홈 화면에 추가」가 **글자 아이콘**으로 떨어졌다. SVG 한 장이
    // 모든 크기를 덮으므로 래스터 사본을 여러 벌 두지 않는다 — 정의가 하나면 갈라질 자리가
    // 없다. `maskable` 을 겸하는 근거는 안전 영역이고 `brand-assets.ts` 가 그것을 적는다.
    //
    // 경로는 `src/app/icon.svg` 의 **질의 없는** 형태다. 파일 규약이 브라우저 탭 아이콘으로
    // 낼 때는 캐시 무효화 질의를 붙이지만, 그 해시는 빌드마다 달라 여기서 적을 수 없다 —
    // 두 형태가 같은 바이트를 주는 것을 `tests/unit/brand-assets-parity.test.ts` 가 고정한다.
    // iOS 는 이 목록을 읽지 않고 `apple-icon.tsx` 를 본다.
    icons: [
      {src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any'},
      {src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable'}
    ]
  };
}
