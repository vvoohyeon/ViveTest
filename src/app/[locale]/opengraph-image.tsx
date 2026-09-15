import {ImageResponse} from 'next/og';

import {BRAND_COLORS, brandMarkDataUri} from '@/app/brand-assets';

/**
 * 공유 카드. 종전에는 OG 태그가 0 이라 결과 링크의 미리보기가 **빈 채로** 나갔고, 이 제품의
 * 핵심 행동이 공유다.
 *
 * **그림에 문장을 넣지 않는다.** 래스터라이저(`next/og`)가 쓸 수 있는 글꼴은 내장 Latin 글꼴
 * 하나뿐이다 — 저장소의 유일한 글꼴 자산은 가변 `woff2`(`public/fonts/PretendardVariable.woff2`)
 * 이고 satori 는 가변 woff2 를 읽지 못한다. 그래서 한국어·중국어·일본어·힌디어 문장을 그림에
 * 넣으면 그 여섯 locale 에서 두부가 뜬다. 문장은 **`og:description` 이 locale 별로** 나르고
 * (`src/app/[locale]/layout.tsx`), 그림은 12 locale 어디에서 공유되어도 같게 읽히는 **브랜드
 * 마크와 워드마크**만 담는다.
 *
 * 결과별로 달라지는 동적 OG 카드는 여전히 범위 밖이다(분석 §15 결정 8) — 결과 화면의 내용
 * 스키마가 정해진 뒤의 일이다.
 */
export const alt = 'ViveTest';
export const size = {width: 1200, height: 630};
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: BRAND_COLORS.ground,
          // 바닥의 가는 sage 띠. 미리보기가 작게 잘려도 브랜드 색이 한 줄 남는다.
          borderBottom: `12px solid ${BRAND_COLORS.accentSolid}`
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 래스터라이저는 next/image 를 실행하지 않는다. */}
        <img src={brandMarkDataUri(160)} width={160} height={160} alt="" style={{borderRadius: 36}} />
        <div
          style={{
            marginTop: 44,
            fontSize: 92,
            // 제품의 워드마크는 `tracking-[0.02em]` 이다(`site-gnb.tsx` 의 `gnbBrandLinkClassName`).
            // 처음 적은 `-2` 는 그 부호를 뒤집은 값이었다 — 같은 이름이 두 자리에서 반대로
            // 조판되면 같은 것으로 읽히지 않는다. 92px × 0.02em = 1.84px.
            letterSpacing: 1.84,
            color: BRAND_COLORS.ink
          }}
        >
          ViveTest
        </div>
        <div
          style={{
            marginTop: 36,
            width: 96,
            height: 6,
            borderRadius: 3,
            backgroundColor: BRAND_COLORS.accentSolid
          }}
        />
      </div>
    ),
    size
  );
}
