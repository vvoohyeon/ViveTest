export const landing = {
  grid: {
    catalogGrid: 'src/features/landing/grid/landing-catalog-grid.tsx',
    catalogGridLoader: 'src/features/landing/grid/landing-catalog-grid-loader.tsx',
    gridCard: 'src/features/landing/grid/landing-grid-card.tsx',
    gridCardCss: 'src/features/landing/grid/landing-grid-card.module.css',
    geometryController: 'src/features/landing/grid/use-grid-geometry-controller.ts',
    interactionController: 'src/features/landing/grid/use-landing-interaction-controller.ts',
    hoverIntentController: 'src/features/landing/grid/use-hover-intent-controller.ts',
    desktopMotionController: 'src/features/landing/grid/use-desktop-motion-controller.ts',
    keyboardHandoff: 'src/features/landing/grid/use-keyboard-handoff.ts',
    keyboardModeTracker: 'src/features/landing/grid/use-keyboard-mode-tracker.ts',
    landingKeyboardEntry: 'src/features/landing/grid/use-landing-keyboard-entry.ts',
    cardKeyboardHandler: 'src/features/landing/grid/use-card-keyboard-handler.ts',
    interactionDom: 'src/features/landing/grid/interaction-dom.ts',
    mobileCardLifecycle: 'src/features/landing/grid/use-mobile-card-lifecycle.ts',
    spacingPlan: 'src/features/landing/grid/spacing-plan.ts'
  },
  model: {
    interactionState: 'src/features/landing/model/interaction-state.ts'
  }
};

export const gnb = {
  siteGnb: 'src/features/gnb/site-gnb.tsx',
  capabilityHook: 'src/features/gnb/hooks/use-gnb-capability.ts'
};

export const telemetry = {
  runtime: 'src/features/telemetry/runtime.ts',
  validation: 'src/features/telemetry/validation.ts'
};

export const transition = {
  runtime: 'src/features/transition/runtime.ts',
  signals: 'src/features/transition/signals.ts',
  hook: 'src/features/transition/use-landing-transition.ts'
};

export const blog = {
  destinationClient: 'src/features/blog/blog-destination-client.tsx'
};

export const styles = {
  globals: 'src/app/globals.css'
};

export const e2e = {
  routingSmoke: 'tests/e2e/routing-smoke.spec.ts',
  gridSmoke: 'tests/e2e/grid-smoke.spec.ts',
  stateSmoke: 'tests/e2e/state-smoke.spec.ts',
  gnbSmoke: 'tests/e2e/gnb-smoke.spec.ts',
  a11ySmoke: 'tests/e2e/a11y-smoke.spec.ts',
  transitionTelemetrySmoke: 'tests/e2e/transition-telemetry-smoke.spec.ts',
  themeMatrixSmoke: 'tests/e2e/theme-matrix-smoke.spec.ts',
  safariHoverGhosting: 'tests/e2e/safari-hover-ghosting.spec.ts'
};

export const test = {
  questionClient: 'src/features/test/test-question-client.tsx',
  answerLock: 'src/features/test/use-answer-lock.ts',
  answerHandler: 'src/features/test/use-answer-handler.ts',
  runController: 'src/features/test/use-test-run-controller.ts',
  testRunBootstrap: 'src/features/test/use-test-run-bootstrap.ts',
  bootstrapStateResolver: 'src/features/test/bootstrap-state-resolver.ts',
  runReducer: 'src/features/test/test-run-reducer.ts',
  entryOrchestrator: 'src/features/test/use-test-entry-orchestrator.ts'
};
