import {readdirSync, readFileSync, statSync} from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const errors = [];

function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

function fail(message) {
  errors.push(message);
}

function fileExists(relativePath) {
  try {
    return statSync(path.join(rootDir, relativePath)).isFile();
  } catch {
    return false;
  }
}

function walkFiles(startDir, filter) {
  const absolute = path.join(rootDir, startDir);
  const stack = [absolute];
  const results = [];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    for (const entry of readdirSync(current, {withFileTypes: true})) {
      const absoluteEntry = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absoluteEntry);
        continue;
      }
      if (entry.isFile() && filter(absoluteEntry)) {
        results.push(absoluteEntry);
      }
    }
  }

  return results;
}

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
  const relative = toPosix(path.relative(rootDir, pageFile));
  if (!relative.startsWith('src/app/[locale]/')) {
    fail(`All real pages must be under src/app/[locale]/**. Found: ${relative}`);
  }
}

const sourceFiles = walkFiles('src', (file) => /\.(ts|tsx)$/u.test(file));
const routeBypassPattern = /\bas\s+(Route|never)\b/u;
// Warning: keep this pattern in sync with localeMetadata keys in src/config/site.ts when adding locales.
const duplicateLocalePattern = /\/(en|kr|zs|zt|ja|es|fr|pt|de|hi|id|ru)\/(en|kr|zs|zt|ja|es|fr|pt|de|hi|id|ru)(\/|["'`])/u;

for (const sourceFile of sourceFiles) {
  const relative = toPosix(path.relative(rootDir, sourceFile));
  const content = readFileSync(sourceFile, 'utf8');

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

const rootLayoutContent = readFileSync(path.join(rootDir, 'src/app/layout.tsx'), 'utf8');
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
  const targetPath = path.join(rootDir, target);
  const stats = statSync(targetPath);
  const targetFiles = stats.isFile()
    ? [targetPath]
    : walkFiles(target, (file) => /\.(ts|tsx)$/u.test(file));

  for (const file of targetFiles) {
    const relative = toPosix(path.relative(rootDir, file));
    const content = readFileSync(file, 'utf8');

    for (const {pattern, label} of bannedDeterministicPatterns) {
      if (pattern.test(content)) {
        fail(`SSR/hydration deterministic guard violation (${label}) in ${relative}`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error('Phase 1 contract checks failed:');
  for (const issue of errors) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('Phase 1 contract checks passed.');
