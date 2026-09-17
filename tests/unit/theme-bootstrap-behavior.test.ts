// @vitest-environment jsdom

import {afterEach, describe, expect, it, vi} from 'vitest';

import {THEME_GROUND_COLOR} from '@/app/theme-ground-color';
import {THEME_BOOTSTRAP_SOURCE} from '@/features/gnb/theme-bootstrap-source';

/**
 * 테마 부트스트랩의 **동작** 증인 — 원문은 `src/features/gnb/theme-bootstrap-source.ts` 다.
 *
 * 종전에 이 경로를 보는 것은 값 대조 하나뿐이었다(`theme-color-parity.test.ts` — 부트스트랩의
 * `GROUND` 리터럴이 `--canvas` 와 같은가). 값이 맞아도 **로직이 죽으면** 아무것도 붉어지지
 * 않는다: `assertion:MB-01` 은 하이드레이션 뒤를 보는데, 그 시점에는
 * `use-theme-preference` 가 같은 meta 를 다시 써서 부트스트랩의 부재를 가린다. 실측(2026-09-15,
 * preview): **부트스트랩 파일만 요청 차단해도 정착 상태가 정상이다**(`data-theme=dark` ·
 * `media` 제거 · `#141110`). 즉 두 경로 중 하나만 깨면 E2E 는 침묵한다.
 *
 * 그래서 경로를 **갈라서** 증인을 세운다 — 하이드레이션 뒤는 `assertion:MB-01` 이,
 * 부트스트랩 자신은 이 검사가 본다. 제품이 보내는 바이트를 그대로 실행하므로 로직을 여기
 * 옮겨 적지 않는다(사본은 원본과 갈라진다).
 *
 * **타이밍은 이제 여기서 답하지 않는다 — 고쳤기 때문이다.** 종전에는 App Router 의
 * `beforeInteractive` 가 스크립트를 `self.__next_s` 큐에 넣고 Next 런타임 청크가 그것을
 * 실행해서 첫 페인트 **뒤**에 돌았다(실측 2026-09-16: Fast 4G 1,343ms · Slow 4G 5,483ms
 * 동안 다크 사용자가 라이트 화면을 봤다). 지금은 `<body>` 첫머리의 인라인 동기 스크립트라
 * 문서와 함께 도착한다. 「별도 요청으로 되돌아가지 않는가」는
 * `check-phase9-performance-contracts.mjs` 가 막고, 「라이트 프레임이 0 인가」는
 * `assertion:TB-01` 이 잡는다.
 */
// 제품이 문서에 실제로 실어 보내는 **그 문자열**을 실행한다. 파일을 읽어 파싱하면 TS 모듈
// 문법에 걸리고, 로직을 여기 옮겨 적으면 사본이 원본과 갈라진다.
const BOOTSTRAP_SOURCE = THEME_BOOTSTRAP_SOURCE;
const THEME_STORAGE_KEY = 'vivetest-theme';

/** SSR 이 실제로 내는 head 를 재현한다 — `media` 두 값이 붙은 meta 두 장(2026-09-15 실측). */
function seedServerRenderedHead(): void {
  document.documentElement.removeAttribute('data-theme');
  document.head.innerHTML = [
    `<meta name="theme-color" content="${THEME_GROUND_COLOR.light}" media="(prefers-color-scheme: light)">`,
    `<meta name="theme-color" content="${THEME_GROUND_COLOR.dark}" media="(prefers-color-scheme: dark)">`
  ].join('');
}

function stubSystemTheme(prefersDark: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('dark') ? prefersDark : !prefersDark,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
    addListener: () => {},
    removeListener: () => {}
  }));
}

function runBootstrap(): void {
  new Function(BOOTSTRAP_SOURCE)();
}

function readThemeColorMetas(): Array<{content: string | null; media: string | null}> {
  return [...document.querySelectorAll('meta[name="theme-color"]')].map((meta) => ({
    content: meta.getAttribute('content'),
    media: meta.getAttribute('media')
  }));
}

afterEach(() => {
  window.localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('theme-bootstrap 동작', () => {
  it('저장된 선택을 지면에 적용하고 크롬 색을 해석된 테마로 덮는다', () => {
    seedServerRenderedHead();
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    stubSystemTheme(false);

    runBootstrap();

    expect(document.documentElement.dataset.theme).toBe('dark');
    // `media` 가 남으면 크롬은 OS 를 따라가 페이지와 어긋난다 — 그 제거가 이 스크립트의 요점이다.
    expect(readThemeColorMetas()).toEqual([
      {content: THEME_GROUND_COLOR.dark, media: null},
      {content: THEME_GROUND_COLOR.dark, media: null}
    ]);
  });

  it('OS 가 다크여도 저장된 라이트 선택이 이긴다', () => {
    seedServerRenderedHead();
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    stubSystemTheme(true);

    runBootstrap();

    expect(document.documentElement.dataset.theme).toBe('light');
    expect(readThemeColorMetas().every((meta) => meta.content === THEME_GROUND_COLOR.light)).toBe(true);
    expect(readThemeColorMetas().every((meta) => meta.media === null)).toBe(true);
  });

  it('저장된 선택이 없으면 OS 를 따른다', () => {
    seedServerRenderedHead();
    stubSystemTheme(true);

    runBootstrap();

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(readThemeColorMetas().every((meta) => meta.content === THEME_GROUND_COLOR.dark)).toBe(true);
  });

  it('저장소가 막혀 있어도 던지지 않고 OS 로 떨어진다', () => {
    // iOS 「모든 쿠키 차단」에서 `localStorage` 접근 자체가 던진다. 첫 페인트 스크립트가
    // 거기서 죽으면 그 뒤 인라인 스크립트도 함께 죽는다.
    seedServerRenderedHead();
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError: The operation is insecure.');
    });
    stubSystemTheme(true);

    expect(() => runBootstrap()).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('meta 가 하나도 없어도 지면 적용은 계속된다', () => {
    document.documentElement.removeAttribute('data-theme');
    document.head.innerHTML = '';
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    stubSystemTheme(false);

    expect(() => runBootstrap()).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
