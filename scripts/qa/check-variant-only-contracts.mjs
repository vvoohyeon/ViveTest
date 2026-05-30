import {createChecker, fileExists, read} from './_utils.mjs';
import {e2e} from './_path-config.mjs';

const {fail, finish} = createChecker();

const requiredFiles = [
  'src/lib/routes/route-builder.ts',
  'src/features/blog/server-model.ts',
  'src/app/[locale]/blog/page.tsx',
  'src/app/[locale]/blog/[variant]/page.tsx',
  'src/features/landing/grid/landing-grid-card.tsx',
  'docs/req-landing.md',
  'docs/project-analysis.md'
];

for (const relativePath of requiredFiles) {
  if (!fileExists(relativePath)) {
    fail(`Missing required variant-only contract file: ${relativePath}`);
  }
}

const forbiddenTokenParts = {
  legacyBlogId: ['article', 'Id'],
  legacyThumbnailSlot: ['thumbnail', 'Or', 'Icon'],
  legacyBlogText: ['blog', 'Summary'],
  legacyText: ['sum', 'mary']
};

function token(parts) {
  return parts.join('');
}

const forbiddenPatterns = [
  {label: 'legacy blog identifier', pattern: new RegExp(`\\b${token(forbiddenTokenParts.legacyBlogId)}\\b`, 'u')},
  {
    label: 'legacy thumbnail slot name',
    pattern: new RegExp(`\\b${token(forbiddenTokenParts.legacyThumbnailSlot)}\\b`, 'u')
  },
  {label: 'legacy blog-only text key', pattern: new RegExp(`\\b${token(forbiddenTokenParts.legacyBlogText)}\\b`, 'u')},
  {label: 'legacy blog text key', pattern: new RegExp(`\\b${token(forbiddenTokenParts.legacyText)}\\b`, 'u')}
];

const scanFiles = [
  'src/features/variant-registry/resolvers.ts',
  'src/features/variant-registry/index.ts',
  'src/features/variant-registry/types.ts',
  'src/features/blog/server-model.ts',
  'src/features/blog/blog-destination-client.tsx',
  'src/features/landing/grid/landing-grid-card.tsx',
  'tests/unit/landing-data-contract.test.ts',
  'tests/unit/landing-card-contract.test.ts',
  'tests/unit/blog-server-model.test.ts',
  e2e.routingSmoke,
  e2e.gridSmoke,
  e2e.transitionTelemetrySmoke,
  'scripts/qa/check-phase5-card-contracts.mjs',
  'scripts/qa/check-phase10-transition-contracts.mjs',
  'docs/req-landing.md',
  'docs/project-analysis.md',
  'docs/requirements.md',
  'docs/req-test.md'
];

for (const relativePath of scanFiles) {
  if (!fileExists(relativePath)) {
    continue;
  }

  const file = read(relativePath);
  for (const {label, pattern} of forbiddenPatterns) {
    if (pattern.test(file)) {
      fail(`Forbidden identifier "${label}" must not appear in ${relativePath}.`);
    }
  }
}

if (fileExists('src/lib/routes/route-builder.ts')) {
  const routeBuilder = read('src/lib/routes/route-builder.ts');
  if (!/blogArticle\(variant: string\)/u.test(routeBuilder) || !/pathname: '\/blog\/\[variant\]'/u.test(routeBuilder)) {
    fail('RouteBuilder must expose a canonical blogArticle(variant) route.');
  }
}

if (fileExists('src/app/[locale]/blog/page.tsx')) {
  const blogIndexPage = read('src/app/[locale]/blog/page.tsx');
  if (/article=\{pageModel\.article\}/u.test(blogIndexPage) || /listLabel=/u.test(blogIndexPage)) {
    fail('Blog index page must remain list-only and must not render a selected article payload.');
  }
}

if (fileExists('src/app/[locale]/blog/[variant]/page.tsx')) {
  const blogDetailPage = read('src/app/[locale]/blog/[variant]/page.tsx');
  if (!/redirect\(buildLocalizedPath\(RouteBuilder\.blog\(\), locale\)\)/u.test(blogDetailPage)) {
    fail('Blog detail page must redirect invalid or non-enterable variants to the localized blog index.');
  }
}

if (fileExists('src/features/landing/grid/landing-grid-card.tsx')) {
  const cardFile = read('src/features/landing/grid/landing-grid-card.tsx');
  if (!/data-slot=\{exposePublicSlot \? 'cardThumbnail' : undefined\}/u.test(cardFile)) {
    fail('LandingGridCard must expose the canonical cardThumbnail slot name.');
  }

  if (!/resolveVariantMediaSource\(card\.variant, hasAssetMedia\)/u.test(cardFile)) {
    fail('LandingGridCard thumbnail media must resolve from variant only.');
  }
}

if (fileExists('docs/req-landing.md')) {
  const reqLanding = read('docs/req-landing.md');
  if (!/\/blog\/\[variant\]/u.test(reqLanding)) {
    fail('docs/req-landing.md must document the canonical blog detail route.');
  }

  if (!/cardThumbnail/u.test(reqLanding)) {
    fail('docs/req-landing.md must document the cardThumbnail slot name.');
  }

  if (!/`subtitle`/u.test(reqLanding) || !/4줄/u.test(reqLanding) || !/재사용/u.test(reqLanding)) {
    fail('docs/req-landing.md must document single-source blog subtitle ownership and clamp behavior.');
  }
}

if (fileExists('docs/project-analysis.md')) {
  const projectAnalysis = read('docs/project-analysis.md');
  if (!/\/\[locale\]\/blog\/\[variant\]/u.test(projectAnalysis)) {
    fail('docs/project-analysis.md must describe the canonical blog detail route surface.');
  }
}

finish('Variant-only');
