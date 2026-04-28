// Storage key: 'vivetest-theme'
// SSOT: src/features/landing/storage/storage-keys.ts > LOCAL_STORAGE_KEYS.THEME
// TS import가 불가능한 pre-hydration 스크립트이므로 string literal을 유지한다.
(function () {
  var root = document.documentElement;

  try {
    var stored = window.localStorage.getItem('vivetest-theme');
    if (stored === 'light' || stored === 'dark') {
      root.dataset.theme = stored;
      return;
    }
  } catch {
    // Ignore storage failures and fall back to the system preference.
  }

  var prefersDark =
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = prefersDark ? 'dark' : 'light';
})();
