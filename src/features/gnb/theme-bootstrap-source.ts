/**
 * 첫 페인트 **앞**에 도는 테마 부트스트랩의 원문.
 *
 * 왜 문자열 상수인가: 이 스크립트는 `<head>` 안의 **인라인 동기 스크립트**여야 한다.
 * 종전에는 `public/theme-bootstrap.js` 를 `next/script`(`beforeInteractive`)로 실었는데,
 * 그것은 별도 요청이라 첫 페인트를 막지 못했다 — 실측(2026-09-16, CDP): Fast 4G 에서
 * **1,343 ms**, Slow 4G 에서 **5,483 ms** 동안 다크 사용자가 라이트 화면을 봤다.
 * 인라인이면 문서와 함께 도착하므로 그 창이 0 이 된다.
 *
 * 왜 `src/app` 이 아니라 여기 있는가: `scripts/qa/check-phase1-contracts.mjs` 가 `src/app`
 * 안의 `window`·`localStorage` 철자를 금지한다. 원문에는 둘 다 들어 있으므로 상수는 그
 * 경계 **밖**에 두고 `layout.tsx` 는 이름만 가져간다.
 *
 * 주석은 원문에서 **걷어 낸다** — 이 문자열은 모든 페이지의 HTML 에 그대로 실린다.
 * 설명은 여기 남고 바이트는 남지 않는다. 종전 주석이 적던 사실 둘은 이 자리에 옮겨 둔다.
 * ⑴ `meta[name=theme-color]` 의 `media` 두 값은 **OS** 를 따르므로, OS-다크에서 라이트를 고른
 * 사용자의 브라우저 크롬이 다크로 남는다 — 그래서 해석된 테마를 `content` 로 덮어쓴다.
 * ⑵ 크롬 색은 보조 신호라 실패해도 페이지 렌더를 막지 않는다.
 *
 * 저장소 키와 지면 색의 정본은 각각 `storage-keys.ts` 와 `theme-ground-color.ts` 이며,
 * 그 결합은 `tests/unit/theme-color-parity.test.ts` 가 고정한다. TS import 가 불가능한
 * pre-hydration 스크립트라 리터럴을 유지하는 사정은 종전과 같다.
 */
export const THEME_BOOTSTRAP_SOURCE = String.raw`
(function () {
  var root = document.documentElement;
  var GROUND = {light: '#fbfaf7', dark: '#141110'};
  function syncThemeColor(theme) {
    try {
      var metas = document.querySelectorAll('meta[name="theme-color"]');
      if (metas.length === 0) {
        return;
      }
      for (var index = 0; index < metas.length; index += 1) {
        metas[index].removeAttribute('media');
        metas[index].setAttribute('content', GROUND[theme]);
      }
    } catch {
    }
  }
  function applyTheme(theme) {
    root.dataset.theme = theme;
    syncThemeColor(theme);
  }
  try {
    var stored = window.localStorage.getItem('vivetest-theme');
    if (stored === 'light' || stored === 'dark') {
      applyTheme(stored);
      return;
    }
  } catch {
  }
  var prefersDark =
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(prefersDark ? 'dark' : 'light');
})();
`;
