import {readdirSync, readFileSync, statSync} from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const errors = [];

function fail(message) {
  errors.push(message);
}

function walk(relativeDir, results = []) {
  const absoluteDir = path.join(rootDir, relativeDir);

  for (const entry of readdirSync(absoluteDir, {withFileTypes: true})) {
    const relativePath = path.join(relativeDir, entry.name);

    if (
      relativePath.startsWith('docs/archive') ||
      relativePath.startsWith('src/features/variant-registry') ||
      relativePath === 'scripts/qa/check-variant-registry-contracts.mjs'
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      walk(relativePath, results);
      continue;
    }

    results.push(relativePath);
  }

  return results;
}

function read(relativePath) {
  return readFileSync(path.join(rootDir, relativePath), 'utf8');
}

function exists(relativePath) {
  try {
    return statSync(path.join(rootDir, relativePath)).isFile();
  } catch {
    return false;
  }
}

const scanRoots = ['src', 'tests', 'scripts', 'docs'];
const scanFiles = scanRoots.flatMap((relativeDir) => walk(relativeDir));
const activeDocs = new Set([
  'docs/req-landing.md',
  'docs/req-test.md',
  'docs/project-analysis.md',
  'docs/req-test-plan.md'
]);

const legacyAttributeAliasToken = `card${'Type'}`;
const legacyAttributeAliasPathToken = `card-${'type'}`;
const legacyAttributeAliasPattern = new RegExp(String.raw`\b${legacyAttributeAliasToken}\b`, 'u');
const legacyAttributeAliasPathPattern = new RegExp(legacyAttributeAliasPathToken, 'u');
const ambiguousAttributeLabelPattern = new RegExp(String.raw`\bcard ${'type'}\b`, 'u');

const bannedIdentifiers = [
  {label: 'legacy attribute alias identifier', pattern: legacyAttributeAliasPattern},
  {label: 'legacy blogSummary identifier', pattern: /\bblogSummary\b/u},
  {label: 'legacy articleId identifier', pattern: /\barticleId\b/u},
  {label: 'legacy thumbnailOrIcon identifier', pattern: /\bthumbnailOrIcon\b/u},
  {label: 'legacy isHero identifier', pattern: /\bisHero\b/u}
];

for (const relativePath of scanFiles) {
  if (legacyAttributeAliasPattern.test(relativePath) || legacyAttributeAliasPathPattern.test(relativePath)) {
    fail(`Forbidden legacy attribute alias path must not appear in ${relativePath}.`);
  }

  const file = read(relativePath);

  for (const {label, pattern} of bannedIdentifiers) {
    if (pattern.test(file)) {
      fail(`Forbidden identifier "${label}" must not appear in ${relativePath}.`);
    }
  }

  if (!relativePath.startsWith('docs/') && /\bsummary\b/u.test(file)) {
    fail(`Legacy summary field/selector token must not appear in ${relativePath}.`);
  }

  if (relativePath.startsWith('docs/') && activeDocs.has(relativePath) && ambiguousAttributeLabelPattern.test(file)) {
    fail(`${relativePath} must use attribute/card attribute or content type instead of the ambiguous legacy label.`);
  }
}

const importBanPattern =
  /from ['"][^'"]*(?:\/raw-fixtures|\/source-fixture|\/variant-registry\.generated)['"]/u;

for (const relativePath of scanFiles.filter((file) => !file.startsWith('docs/'))) {
  const file = read(relativePath);

  if (importBanPattern.test(file)) {
    fail(`Only the registry layer may import fixture/generated registry sources directly: ${relativePath}.`);
  }
}

const consumerPreviewLeakFiles = [
  'src/app/[locale]/test/[variant]/page.tsx',
  'src/features/test/question-bank.ts',
  'src/features/test/test-question-client.tsx',
  'src/features/landing/grid/landing-grid-card.tsx',
  'src/features/landing/blog/server-model.ts',
  'src/features/landing/blog/blog-destination-client.tsx'
];

for (const relativePath of consumerPreviewLeakFiles) {
  if (!exists(relativePath)) {
    continue;
  }

  const file = read(relativePath);

  if (/testPreviewPayloadByVariant/u.test(file)) {
    fail(`Consumer code must not read testPreviewPayloadByVariant directly: ${relativePath}.`);
  }

  if (/\.test\.(previewQuestion|answerChoiceA|answerChoiceB)\b/u.test(file)) {
    fail(`Consumer code must resolve preview payload only through resolveTestPreviewPayload(): ${relativePath}.`);
  }
}

if (exists('src/features/landing/grid/landing-grid-card.tsx')) {
  const cardFile = read('src/features/landing/grid/landing-grid-card.tsx');

  if (!/data-card-attribute=\{card\.attribute\}/u.test(cardFile)) {
    fail('LandingGridCard must expose data-card-attribute from the resolved card attribute.');
  }
}

const attributeOnlyRegistryChecks = [
  {
    path: 'src/features/variant-registry/types.ts',
    message: 'Variant registry types must not expose legacy debug/sample boolean fields.',
    pattern: /\b(debug|sample)\??:\s*boolean\b/u
  },
  {
    path: 'src/features/variant-registry/builder.ts',
    message: 'Variant registry builder must not normalize legacy debug/sample fields.',
    pattern: /\b(?:rawCard|sourceCard)\.(?:debug|sample)\b/u
  },
  {
    path: 'src/features/variant-registry/resolvers.ts',
    message: 'Variant registry resolvers must not expose legacy debug/sample fields.',
    pattern: /\bcard\.(?:debug|sample)\b/u
  },
  {
    path: 'src/features/variant-registry/source-fixture.ts',
    message: 'Variant registry source fixture must not declare sample/debug boolean keys.',
    pattern: /^\s+(?:debug|sample):/mu
  },
  {
    path: 'src/features/variant-registry/source-fixture.ts',
    message: 'Variant registry source fixture must use answerA/answerB instead of answerChoiceA/answerChoiceB.',
    pattern: /^\s+answerChoice[AB]:/mu
  },
  {
    path: 'src/features/variant-registry/source-fixture.ts',
    message: 'Variant registry source fixture must keep duration/shared/engaged metrics at the top level instead of meta.',
    pattern: /^\s+meta:\s*\{/mu
  },
  {
    path: 'src/features/variant-registry/builder.ts',
    message: 'Variant registry builder must read source answers from answerA/answerB instead of answerChoiceA/answerChoiceB.',
    pattern: /\brawCard\.answerChoice[AB]\b/u
  },
  {
    path: 'src/features/variant-registry/builder.ts',
    message: 'Variant registry builder must read source metrics from top-level fields instead of rawCard.meta.',
    pattern: /\brawCard\.meta\b/u
  }
];

for (const check of attributeOnlyRegistryChecks) {
  if (!exists(check.path)) {
    continue;
  }

  const file = read(check.path);
  if (check.pattern.test(file)) {
    fail(check.message);
  }
}

for (const relativePath of activeDocs) {
  if (!exists(relativePath)) {
    fail(`Missing active contract doc: ${relativePath}.`);
    continue;
  }

  const file = read(relativePath);
  if (/debug\/sample/u.test(file)) {
    fail(`${relativePath} must describe debug fixtures without legacy debug/sample terminology.`);
  }
}

if (errors.length > 0) {
  console.error('Variant registry contract checks failed:');
  for (const issue of errors) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('Variant registry contract checks passed.');
