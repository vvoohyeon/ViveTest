// Storage key: 'vivetest-theme'
// SSOT: src/features/landing/storage/storage-keys.ts > LOCAL_STORAGE_KEYS.THEME
// TS import가 불가능한 pre-hydration 스크립트이므로 string literal을 유지한다.
// Theme ground colors: src/app/theme-ground-color.ts > THEME_GROUND_COLOR
// TS import가 불가능한 pre-hydration 스크립트이므로 string literal을 유지한다.
// 그 결합은 tests/unit/theme-color-parity.test.ts 가 고정한다.
(function () {
  var root = document.documentElement;
  var GROUND = {light: '#fbfaf7', dark: '#141110'};

  // `meta[name=theme-color]` 의 `media` 두 값은 **OS** 를 따른다. 그래서 OS-다크에서 라이트를
  // 고른 사용자의 브라우저 크롬은 다크로 남는다 — 페이지는 라이트인데 크롬만 어긋난다.
  // 해석된 테마를 `content` 로 덮어써 그 어긋남을 없앤다.
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
      // 크롬 색은 보조 신호다 — 실패해도 페이지 렌더를 막지 않는다.
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
    // Ignore storage failures and fall back to the system preference.
  }

  var prefersDark =
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(prefersDark ? 'dark' : 'light');
})();
