/**
 * 브랜드 자산의 **단일 정의처** — 앱 아이콘 · apple-touch 아이콘 · OG 카드가 같은 마크와 같은
 * 색을 쓴다.
 *
 * **색은 전부 Realized(R) 다** — `src/app/globals.css` 의 라이트 테마 팔레트에서 그대로 베꼈고
 * 아래에 출처 행을 적는다. 자산은 CSS 변수를 읽을 수 없으므로(래스터라이저와 `public/` 의
 * 정적 파일은 문서의 캐스케이드 밖에 있다) 리터럴이 한 벌 더 존재할 수밖에 없다. 그 사본이
 * 팔레트와 갈라지면 공유 카드와 홈 화면 아이콘만 옛 색으로 남고, 그 어긋남은 제품 화면 어디에도
 * 나타나지 않는다 — `tests/unit/brand-assets-parity.test.ts` 가 그 결합을 고정한다.
 *
 * | 이름 | 값 | 출처 |
 * |:---|:---|:---|
 * | `ground` | `#fbfaf7` | `--canvas` → `--warm-50`(`globals.css:100,125`) |
 * | `ink` | `#1e1a16` | `--ink` → `--warm-900`(`globals.css:109,158`) |
 * | `accentSolid` | `#4b7764` | `--accent-solid` → `--sage-600`(`globals.css:119,141`) |
 * | `accentFg` | `#fbfaf7` | 채운 accent 위의 잉크. `--warm-50` 과 같은 값이며 대비 7.0:1 |
 */
export const BRAND_COLORS = {
  ground: '#fbfaf7',
  ink: '#1e1a16',
  accentSolid: '#4b7764',
  accentFg: '#fbfaf7'
} as const;

/**
 * 브랜드 마크 — 채운 sage 바탕 위의 기하학적 `V`.
 *
 * 제품에는 로고 이미지가 없고 GNB 가 워드마크를 **텍스트로** 그린다. 48px 파비콘에서 워드마크는
 * 읽히지 않으므로 첫 글자만 남긴 자소를 쓴다. 글꼴에 의존하지 않는 것이 요점이다 — 패스로
 * 그리면 래스터라이저·OS·설치 표면이 달라도 같은 모양이 나온다.
 *
 * **maskable 안전 영역을 지킨다.** Android 적응형 아이콘은 바깥을 잘라내므로 내용이 중앙
 * 지름 80% 원(512 기준 반경 **205px**) 안에 있어야 한다. 이 자소의 중심에서 가장 먼 점은
 * 획 두께를 포함해 약 **185px** 이라 그 안이고, 여유는 10% 다. 그래서 manifest 에서
 * `purpose` 를 둘로 낸 같은 파일을 겸용할 수 있다.
 *
 * 처음 그린 자소는 반경 157px 이라 타일 대비 44% 폭이었고 아이콘으로는 소심하게 보였다 —
 * 안전 반경이 강제한 크기가 아니라 여유를 안 쓴 크기였다. 53% 로 키워 다시 쟀다.
 */
export function brandMarkSvg(size: number): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}" role="img" aria-label="ViveTest">`,
    `<rect width="512" height="512" fill="${BRAND_COLORS.accentSolid}"/>`,
    `<path d="M154 162 L256 350 L358 162" fill="none" stroke="${BRAND_COLORS.accentFg}" stroke-width="66" stroke-linecap="round" stroke-linejoin="round"/>`,
    `</svg>`
  ].join('');
}

/** 래스터라이저(`next/og`)에 `<img>` 로 넘기기 위한 데이터 URI. */
export function brandMarkDataUri(size: number): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(brandMarkSvg(size))}`;
}

/** `src/app/icon.svg` 가 담는 바이트. 파일과 이 함수가 갈라지는 것을 단위 검사가 막는다. */
export const BRAND_ICON_FILE_CONTENT = `${brandMarkSvg(512)}\n`;
