import type {NextConfig} from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  typedRoutes: true,
  outputFileTracingRoot: process.cwd(),
  allowedDevOrigins: ['127.0.0.1'],
  turbopack: {
    root: process.cwd()
  },
  experimental: {
    globalNotFound: true
  },
  /**
   * 정적 자산에 장기 캐시를 붙인다. 종전에는 폰트와 썸네일이 `public, max-age=0` 으로 나가
   * **매 내비게이션마다 재검증**했다 — 조각 넷을 받아 두고도 다음 페이지에서 조건부 요청
   * 넷을 다시 보낸다는 뜻이다.
   *
   * `immutable` 을 붙일 수 있는 것은 두 경로의 파일명이 내용에 고정돼 있기 때문이다.
   * 폰트 조각은 업스트림 릴리스(v1.3.9)가 이름을 정하므로 같은 이름이면 같은 바이트이고,
   * 버전을 올리면 `fonts.generated.css` 와 자산이 함께 바뀐다. 썸네일은 variant 별 고정
   * 자산이다. **이름이 내용을 따라가지 않는 경로에는 이 헤더를 붙이지 않는다.**
   */
  async headers() {
    return [
      {
        source: '/fonts/:path*',
        headers: [{key: 'Cache-Control', value: 'public, max-age=31536000, immutable'}]
      },
      {
        source: '/landing-card-media/:path*',
        headers: [{key: 'Cache-Control', value: 'public, max-age=31536000, immutable'}]
      }
    ];
  }
};

export default withNextIntl(nextConfig);
