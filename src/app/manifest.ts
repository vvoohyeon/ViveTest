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
    theme_color: THEME_GROUND_COLOR.light
  };
}
