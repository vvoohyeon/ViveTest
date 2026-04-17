import {readFileSync, statSync} from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const errors = [];

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

function read(relativePath) {
  return readFileSync(path.join(rootDir, relativePath), 'utf8');
}

function readExisting(relativePaths) {
  return relativePaths.filter(fileExists).map(read).join('\n');
}

const requiredFiles = [
  'src/app/layout.tsx',
  'public/theme-bootstrap.js',
  'src/features/landing/grid/landing-catalog-grid-loader.tsx',
  'src/features/landing/grid/landing-catalog-grid.tsx',
  'src/features/landing/grid/landing-grid-card.module.css',
  'src/features/landing/grid/use-landing-interaction-controller.ts',
  'src/features/landing/gnb/hooks/use-gnb-capability.ts',
  'src/app/globals.css',
  'tests/e2e/routing-smoke.spec.ts',
  'tests/e2e/state-smoke.spec.ts',
  'tests/e2e/gnb-smoke.spec.ts'
];

for (const relativePath of requiredFiles) {
  if (!fileExists(relativePath)) {
    fail(`Missing required Phase 9 file: ${relativePath}`);
  }
}

if (fileExists('src/features/landing/grid/landing-catalog-grid-loader.tsx')) {
  const loaderFile = read('src/features/landing/grid/landing-catalog-grid-loader.tsx');

  if (/next\/dynamic/u.test(loaderFile) || /ssr:\s*false/u.test(loaderFile)) {
    fail('LandingCatalogGridLoader must not regress to dynamic ssr:false loading.');
  }

  if (!/LandingCatalogGrid/u.test(loaderFile)) {
    fail('LandingCatalogGridLoader must render LandingCatalogGrid directly for SSR-safe markup.');
  }
}

if (fileExists('src/features/landing/grid/landing-catalog-grid.tsx')) {
  const gridFile = read('src/features/landing/grid/landing-catalog-grid.tsx');

  if (!/INITIAL_VIEWPORT_WIDTH/u.test(gridFile) || !/useState<number>\(INITIAL_VIEWPORT_WIDTH\)/u.test(gridFile)) {
    fail('LandingCatalogGrid must keep an SSR-neutral viewport initializer.');
  }

  if (/readViewportWidth/u.test(gridFile)) {
    fail('LandingCatalogGrid must not rely on render-path viewport reads for SSR.');
  }
}

if (fileExists('src/features/landing/grid/landing-grid-card.tsx')) {
  const cardFile = read('src/features/landing/grid/landing-grid-card.tsx');

  if (
    !/LANDING_GRID_CARD_ANSWER_CHOICE_CLASSNAME[\s\S]*cursor-pointer/u.test(cardFile) ||
    !/LANDING_GRID_CARD_PRIMARY_CTA_CLASSNAME[\s\S]*cursor-pointer/u.test(cardFile) ||
    !/LANDING_GRID_CARD_PRIMARY_CTA_STATIC_CLASSNAME[\s\S]*cursor-default/u.test(cardFile)
  ) {
    fail('LandingGridCard must keep CTA cursor policy explicit in component-owned class sources.');
  }

  if (!/styles\.reducedMotion/u.test(cardFile) || !/desktopShellInlineScale/u.test(cardFile)) {
    fail('LandingGridCard must consume runtime reduced-motion and plan-derived shell geometry in component-owned style state.');
  }
}

if (fileExists('src/features/landing/grid/use-landing-interaction-controller.ts')) {
  const controllerFile = read('src/features/landing/grid/use-landing-interaction-controller.ts');

  if (!/prefers-reduced-motion/u.test(controllerFile)) {
    fail('Interaction controller must continue syncing prefers-reduced-motion.');
  }

  if (!/useLayoutEffect/u.test(controllerFile)) {
    fail('Interaction controller must use pre-paint synchronization for capability/motion state.');
  }
}

if (fileExists('src/features/landing/gnb/hooks/use-gnb-capability.ts')) {
  const gnbCapabilityFile = read('src/features/landing/gnb/hooks/use-gnb-capability.ts');

  if (!/useLayoutEffect/u.test(gnbCapabilityFile)) {
    fail('GNB capability hook must initialize viewport/hover capability before first paint.');
  }

  if (
    /useState\(\(\)\s*=>\s*\(typeof window/u.test(gnbCapabilityFile) ||
    /useState\(\(\)\s*=>\s*\{[\s\S]*window\.matchMedia/u.test(gnbCapabilityFile) ||
    /useState\(\(\)\s*=>\s*\(typeof window === 'undefined' \? false : window\.scrollY/u.test(gnbCapabilityFile)
  ) {
    fail('GNB capability hook must not read window, matchMedia, or scrollY in render-path state initializers.');
  }
}

if (fileExists('src/app/layout.tsx')) {
  const rootLayoutFile = read('src/app/layout.tsx');

  if (!/data-theme="light"/u.test(rootLayoutFile) || !/theme-bootstrap\.js/u.test(rootLayoutFile)) {
    fail('Root layout must provide a deterministic theme bootstrap before hydration.');
  }
}

if (fileExists('public/theme-bootstrap.js')) {
  const themeBootstrapFile = read('public/theme-bootstrap.js');

  if (!/localStorage/u.test(themeBootstrapFile) || !/prefers-color-scheme/u.test(themeBootstrapFile)) {
    fail('Theme bootstrap must resolve stored and system theme before hydration.');
  }
}

if (fileExists('src/features/landing/grid/landing-grid-card.module.css')) {
  const css = readExisting([
    'src/features/landing/grid/landing-grid-card.module.css',
    'src/app/globals.css'
  ]);

  if (!/reducedMotion/u.test(css) || !/prefers-reduced-motion:\s*reduce/u.test(css)) {
    fail('Landing grid styles must expose a runtime reduced-motion path plus fallback media query.');
  }

  if (!/landing-card-shell-reduced-open/u.test(css) || !/landing-card-shell-reduced-close/u.test(css)) {
    fail('Landing grid styles must define reduced-motion open/close motion tokens.');
  }

  if (
    !/reducedMotion[\s\S]*data-state='OPENING'[\s\S]*animation-name:\s*landing-card-shell-reduced-open/ums.test(css) ||
    !/reducedMotion[\s\S]*data-state='CLOSING'[\s\S]*animation-name:\s*landing-card-shell-reduced-close/ums.test(css)
  ) {
    fail('Landing grid styles must simplify mobile transient-shell motion under reduced-motion.');
  }
}

if (fileExists('tests/e2e/routing-smoke.spec.ts')) {
  const routingSpec = read('tests/e2e/routing-smoke.spec.ts');
  if (!/assertion:B1-hydration/u.test(routingSpec)) {
    fail('Routing smoke must keep hydration warning coverage.');
  }

  if (!/PREVIEW_LOG_PATH/u.test(routingSpec) || !/collectUnexpectedPreviewErrors/u.test(routingSpec)) {
    fail('Routing smoke must read preview logs for hydration and expected-noise policy verification.');
  }
}

if (fileExists('package.json')) {
  const packageJson = read('package.json');
  if (!/"test:e2e:smoke":\s*"PLAYWRIGHT_SERVER_MODE=preview playwright test --grep @smoke"/u.test(packageJson)) {
    fail('Smoke e2e script must run through preview mode so hydration proof is collected inside qa:gate.');
  }
}

if (fileExists('playwright.config.ts')) {
  const playwrightConfig = read('playwright.config.ts');
  if (
    !/PLAYWRIGHT_SERVER_MODE/u.test(playwrightConfig) ||
    !/npm run start -- --port 4173/u.test(playwrightConfig) ||
    !/preview-smoke\.log/u.test(playwrightConfig) ||
    !/reuseExistingServer:\s*serverMode === 'preview' \? false/u.test(playwrightConfig)
  ) {
    fail('Playwright config must support preview-mode server startup for hydration proof hardening.');
  }
}

if (fileExists('tests/e2e/state-smoke.spec.ts')) {
  const stateSpec = read('tests/e2e/state-smoke.spec.ts');
  if (!/reduced-motion \/ low-spec fallback shrinks desktop motion/u.test(stateSpec)) {
    fail('State smoke must cover reduced-motion / V1 low-spec fallback runtime safety.');
  }

  if (!/landing card and CTA cursor policy/u.test(stateSpec)) {
    fail('State smoke must cover landing card and CTA cursor policy.');
  }
}

if (fileExists('tests/e2e/gnb-smoke.spec.ts')) {
  const gnbSpec = read('tests/e2e/gnb-smoke.spec.ts');
  if (!/assertion:B3-desktop-settings/u.test(gnbSpec)) {
    fail('GNB smoke must keep desktop settings hover-open coverage.');
  }
}

if (errors.length > 0) {
  console.error('Phase 9 performance contract checks failed:');
  for (const issue of errors) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('Phase 9 performance contract checks passed.');
