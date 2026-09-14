export const landing = {
  grid: {
    catalogGrid: 'src/features/landing/grid/landing-catalog-grid.tsx',
    catalogGridLoader: 'src/features/landing/grid/landing-catalog-grid-loader.tsx',
    // 카드는 2026-09-14 step 1 이음매 분리 이후 다섯 파일이다. `gridCard` 는 오케스트레이터
    // (root 속성 · 트리거 분기 · 자식 선택)이고, 계약 문자열은 이름을 따라 아래 파일들이 갖는다.
    gridCard: 'src/features/landing/grid/landing-grid-card.tsx',
    gridCardClassnames: 'src/features/landing/grid/landing-grid-card-classnames.ts',
    gridCardNormalFace: 'src/features/landing/grid/landing-grid-card-normal-face.tsx',
    gridCardExpandedBody: 'src/features/landing/grid/landing-grid-card-expanded-body.tsx',
    gridCardDesktopShell: 'src/features/landing/grid/landing-grid-card-desktop-shell.tsx',
    gridCardMobileSurfaces: 'src/features/landing/grid/landing-grid-card-mobile-surfaces.tsx',
    gridCardCss: 'src/features/landing/grid/landing-grid-card.module.css',
    geometryController: 'src/features/landing/grid/use-grid-geometry-controller.ts',
    interactionController: 'src/features/landing/grid/use-landing-interaction-controller.ts',
    // 입력 축(`InputProfile`)의 **유일한 JS 정의처**. 종전에는 이 판정이 컨트롤러와 GNB 훅
    // 두 곳에 독립적으로 적혀 있었고, 폭 축과 한 덩어리로 읽혔다.
    inputProfile: 'src/features/landing/grid/input-profile.ts',
    hoverIntentController: 'src/features/landing/grid/use-hover-intent-controller.ts',
    desktopMotionController: 'src/features/landing/grid/use-desktop-motion-controller.ts',
    keyboardHandoff: 'src/features/landing/grid/use-keyboard-handoff.ts',
    keyboardModeTracker: 'src/features/landing/grid/use-keyboard-mode-tracker.ts',
    cardKeyboardHandler: 'src/features/landing/grid/use-card-keyboard-handler.ts',
    interactionDom: 'src/features/landing/grid/interaction-dom.ts',
    mobileCardLifecycle: 'src/features/landing/grid/use-mobile-card-lifecycle.ts',
    spacingPlan: 'src/features/landing/grid/spacing-plan.ts'
  },
  model: {
    interactionState: 'src/features/landing/model/interaction-state.ts'
  }
};

export const landingShell = {
  // 랜딩 키보드 진입의 소유자. 종전에는 GNB 의 `tabIndex` 를 상태로 내리고 GNB DOM 을 CSS
  // 선택자로 뒤지는 훅 둘이 그 일을 했고, 그 구현이 스스로 계층 위반임을 인정하고 있었다.
  skipToContentLink: 'src/features/landing/shell/skip-to-content-link.tsx',
  pageShell: 'src/features/landing/shell/page-shell.tsx'
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
