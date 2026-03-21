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
