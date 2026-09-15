import {ImageResponse} from 'next/og';

import {brandMarkDataUri} from '@/app/brand-assets';

/**
 * iOS 홈 화면 아이콘.
 *
 * iOS 는 manifest 의 `icons` 를 읽지 않고 `apple-touch-icon` 만 본다 — 그리고 SVG 를 받지
 * 않는다. 그래서 manifest 가 쓰는 `src/app/icon.svg` 와 **같은 마크**를 PNG 로 한 벌 더 낸다.
 * 정의는 `brand-assets.ts` 하나이므로 둘이 갈라지지 않는다.
 *
 * 180×180 은 iOS 의 최대 요청 크기다. 그보다 작게 내면 홈 화면에서 흐려진다.
 */
export const size = {width: 180, height: 180};
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{width: '100%', height: '100%', display: 'flex'}}>
        {/* eslint-disable-next-line @next/next/no-img-element -- 래스터라이저는 next/image 를 실행하지 않는다. */}
        <img src={brandMarkDataUri(180)} width={180} height={180} alt="" />
      </div>
    ),
    size
  );
}
