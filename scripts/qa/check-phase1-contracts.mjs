import path from 'node:path';

import {createChecker, fileExists, read, toPosix, walkFiles} from './_utils.mjs';
import {QA_LOCALE_PATTERN_SOURCE} from './_locale-list.mjs';

const {fail, finish} = createChecker();

const requiredFiles = [
  'src/app/layout.tsx',
  'src/app/[locale]/layout.tsx',
  'src/app/not-found.tsx',
  'src/app/global-not-found.tsx',
  'src/proxy.ts'
];

for (const requiredFile of requiredFiles) {
  if (!fileExists(requiredFile)) {
    fail(`Missing required Phase 1 file: ${requiredFile}`);
  }
}

if (fileExists('src/middleware.ts')) {
  fail('Disallowed file detected: src/middleware.ts (proxy.ts must remain the single entry point)');
}

const appPageFiles = walkFiles('src/app', (file) => file.endsWith('page.tsx'));
for (const pageFile of appPageFiles) {
  const relative = toPosix(path.relative(process.cwd(), pageFile));
  if (!relative.startsWith('src/app/[locale]/')) {
    fail(`All real pages must be under src/app/[locale]/**. Found: ${relative}`);
  }
}

const sourceFiles = walkFiles('src', (file) => /\.(ts|tsx)$/u.test(file));
const routeBypassPattern = /\bas\s+(Route|never)\b/u;
const duplicateLocalePattern = new RegExp(
  `/(${QA_LOCALE_PATTERN_SOURCE})/(${QA_LOCALE_PATTERN_SOURCE})(/|["'\`])`,
  'u'
);

for (const sourceFile of sourceFiles) {
  const relative = toPosix(path.relative(process.cwd(), sourceFile));
  const content = read(relative);

  if (routeBypassPattern.test(content)) {
    fail(`Disallowed typed-route bypass cast found in ${relative}`);
  }

  if (duplicateLocalePattern.test(content)) {
    fail(`Potential duplicate locale path literal found in ${relative}`);
  }

  if (/useSearchParams\s*\(/u.test(content) && !/Suspense/u.test(content)) {
    fail(`useSearchParams() requires a nearby Suspense boundary: ${relative}`);
  }
}

const rootLayoutContent = read('src/app/layout.tsx');
if (/lang=\{defaultLocale\}/u.test(rootLayoutContent)) {
  fail('Root layout must not hard-code html lang to defaultLocale; request-scoped locale resolution is required.');
}

const deterministicTargets = [
  'src/app',
  'src/i18n',
  'src/lib/routes',
  'src/proxy.ts'
];

const bannedDeterministicPatterns = [
  {pattern: /\bDate\.now\s*\(/u, label: 'Date.now()'},
  {pattern: /\bMath\.random\s*\(/u, label: 'Math.random()'},
  {pattern: /\blocalStorage\b/u, label: 'localStorage'},
  {pattern: /\bsessionStorage\b/u, label: 'sessionStorage'},
  {pattern: /\bwindow\b/u, label: 'window'}
];

for (const target of deterministicTargets) {
  const targetFiles = fileExists(target)
    ? [path.join(process.cwd(), target)]
    : walkFiles(target, (file) => /\.(ts|tsx)$/u.test(file));

  for (const file of targetFiles) {
    const relative = toPosix(path.relative(process.cwd(), file));
    const content = read(relative);

    for (const {pattern, label} of bannedDeterministicPatterns) {
      if (pattern.test(content)) {
        fail(`SSR/hydration deterministic guard violation (${label}) in ${relative}`);
      }
    }
  }
}

finish('Phase 1');
