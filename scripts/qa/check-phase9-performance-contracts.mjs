import {createChecker, fileExists, read, readExisting} from './_utils.mjs';
import {e2e, gnb, landing, styles} from './_path-config.mjs';

const {fail, finish} = createChecker();

const requiredFiles = [
  'src/app/layout.tsx',
  'public/theme-bootstrap.js',
  landing.grid.catalogGridLoader,
  landing.grid.catalogGrid,
  landing.grid.gridCardCss,
  landing.grid.interactionController,
  gnb.capabilityHook,
  styles.globals,
  e2e.routingSmoke,
  e2e.stateSmoke,
  e2e.gnbSmoke
];

for (const relativePath of requiredFiles) {
  if (!fileExists(relativePath)) {
    fail(`Missing required Phase 9 file: ${relativePath}`);
  }
}

if (fileExists(landing.grid.catalogGridLoader)) {
  const loaderFile = read(landing.grid.catalogGridLoader);

  if (/next\/dynamic/u.test(loaderFile) || /ssr:\s*false/u.test(loaderFile)) {
    fail('LandingCatalogGridLoader must not regress to dynamic ssr:false loading.');
  }

  if (!/LandingCatalogGrid/u.test(loaderFile)) {
    fail('LandingCatalogGridLoader must render LandingCatalogGrid directly for SSR-safe markup.');
  }
}

if (fileExists(landing.grid.catalogGrid)) {
  const gridFile = read(landing.grid.catalogGrid);

  if (!/INITIAL_VIEWPORT_WIDTH/u.test(gridFile) || !/useState<number>\(INITIAL_VIEWPORT_WIDTH\)/u.test(gridFile)) {
    fail('LandingCatalogGrid must keep an SSR-neutral viewport initializer.');
  }

  if (/readViewportWidth/u.test(gridFile)) {
    fail('LandingCatalogGrid must not rely on render-path viewport reads for SSR.');
  }
}

if (fileExists(landing.grid.gridCard)) {
  const cardFile = read(landing.grid.gridCard);

  if (
    !/LANDING_GRID_CARD_TRIGGER_BASE_CLASSNAME\s*=\s*[^;]*cursor-pointer[^;]*aria-\[disabled=true\]:cursor-default[^;]*;/u.test(
      cardFile
    ) ||
    !/LANDING_GRID_CARD_ANSWER_CHOICE_CLASSNAME\s*=\s*[^;]*cursor-pointer[^;]*disabled:cursor-default[^;]*;/u.test(
      cardFile
    ) ||
    !/LANDING_GRID_CARD_MOBILE_CLOSE_CLASSNAME\s*=\s*[^;]*cursor-pointer[^;]*disabled:cursor-default[^;]*;/u.test(
      cardFile
    )
  ) {
    fail('LandingGridCard must keep interactive cursor policy explicit in component-owned class sources.');
  }

  const layoutPlanFile = read('src/features/landing/grid/layout-plan.ts');
  const inlineGeometryFile = read('src/features/landing/grid/use-card-inline-geometry.ts');
  const geometryControllerFile = read(landing.grid.geometryController);

  if (
    !/styles\.reducedMotion/u.test(cardFile) ||
    !/expandedScale\.frameInlineScale/u.test(cardFile) ||
    !/resolveLandingExpandedScale/u.test(layoutPlanFile) ||
    !/DESKTOP_EXPANDED_DESIRED_FINAL_SCALE/u.test(layoutPlanFile) ||
    !/Math\.min\(desiredFinalScale,\s*maxSurfaceScale\)/u.test(layoutPlanFile) ||
    !/setDecision\(\(current\) => \(scaleDecisionsEqual\(current,\s*nextDecision\) \? current : nextDecision\)\)/u.test(
      inlineGeometryFile
    ) ||
    !/frameRef\.current = requestAnimationFrame/u.test(inlineGeometryFile) ||
    !/new ResizeObserver\(scheduleSettledMeasure\)/u.test(inlineGeometryFile) ||
    !/isSameSpacingModel\(previous,\s*nextSpacingModel\) \? previous : nextSpacingModel/u.test(
      geometryControllerFile
    ) ||
    !/frame = window\.requestAnimationFrame/u.test(geometryControllerFile) ||
    !/new ResizeObserver\(scheduleMeasure\)/u.test(geometryControllerFile)
  ) {
    fail('LandingGridCard must consume runtime reduced-motion and constrained measured shell geometry.');
  }
}

if (fileExists(landing.grid.interactionController)) {
  const controllerFile = read(landing.grid.interactionController);

  if (!/prefers-reduced-motion/u.test(controllerFile)) {
    fail('Interaction controller must continue syncing prefers-reduced-motion.');
  }

  if (!/useLayoutEffect/u.test(controllerFile)) {
    fail('Interaction controller must use pre-paint synchronization for capability/motion state.');
  }
}

if (fileExists(gnb.capabilityHook)) {
  const gnbCapabilityFile = read(gnb.capabilityHook);

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

if (fileExists(landing.grid.gridCardCss)) {
  const css = readExisting([
    landing.grid.gridCardCss,
    styles.globals
  ]);

  if (!/reducedMotion/u.test(css) || !/prefers-reduced-motion:\s*reduce/u.test(css)) {
    fail('Landing grid styles must expose a runtime reduced-motion path plus fallback media query.');
  }

  if (!/landing-card-shell-reduced-open/u.test(css) || !/landing-card-shell-reduced-close/u.test(css)) {
    fail('Landing grid styles must define reduced-motion open/close motion tokens.');
  }

  if (
    !/\.root\.reducedMotion \.transientShell\.transientOpening[\s\S]*animation-name:\s*landing-card-shell-reduced-open/ums.test(css) ||
    !/\.root\.reducedMotion \.transientShell\.transientClosing[\s\S]*animation-name:\s*landing-card-shell-reduced-close/ums.test(css)
  ) {
    fail('Landing grid styles must simplify mobile transient-shell motion under reduced-motion through semantic transient-shell classes.');
  }
}

if (fileExists(e2e.routingSmoke)) {
  const routingSpec = read(e2e.routingSmoke);
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

if (fileExists(e2e.stateSmoke)) {
  const stateSpec = read(e2e.stateSmoke);
  if (!/reduced-motion \/ low-spec fallback shrinks desktop motion/u.test(stateSpec)) {
    fail('State smoke must cover reduced-motion / V1 low-spec fallback runtime safety.');
  }

  if (!/landing card and CTA cursor policy/u.test(stateSpec)) {
    fail('State smoke must cover landing card and CTA cursor policy.');
  }
}

if (fileExists(e2e.gnbSmoke)) {
  const gnbSpec = read(e2e.gnbSmoke);
  if (!/assertion:B3-desktop-settings/u.test(gnbSpec)) {
    fail('GNB smoke must keep desktop settings hover-open coverage.');
  }
}

finish('Phase 9 performance');
