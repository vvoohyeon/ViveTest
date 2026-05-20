import {createChecker, fileExists, read} from './_utils.mjs';
import {blog, e2e, landing, test, transition} from './_path-config.mjs';

const {fail, finish} = createChecker();

const requiredFiles = [
  transition.runtime,
  transition.signals,
  transition.hook,
  'src/features/landing/landing-runtime.tsx',
  test.questionClient,
  test.runReducer,
  test.testRunBootstrap,
  blog.destinationClient,
  landing.grid.mobileCardLifecycle,
  landing.grid.gridCardCss,
  e2e.transitionTelemetrySmoke
];

for (const relativePath of requiredFiles) {
  if (!fileExists(relativePath)) {
    fail(`Missing required Phase 10 file: ${relativePath}`);
  }
}

if (fileExists(transition.runtime)) {
  const runtimeFile = read(transition.runtime);

  if (!/writePendingLandingTransition/u.test(runtimeFile) || !/saveLandingReturnScrollY/u.test(runtimeFile)) {
    fail('Transition runtime must persist pending transition state and return scrollY.');
  }

  if (!/writeLandingIngress/u.test(runtimeFile) || !/trackCardAnswered/u.test(runtimeFile)) {
    fail('Transition runtime must persist landing ingress and emit card_answered for test ingress.');
  }

  if (!/emitLandingTransitionSignal/u.test(runtimeFile) || /trackTransitionStart/u.test(runtimeFile)) {
    fail('Transition runtime must use the internal transition signal channel instead of transition_* telemetry.');
  }

  if (!/completePendingLandingTransition/u.test(runtimeFile) || !/terminatePendingLandingTransition/u.test(runtimeFile)) {
    fail('Transition runtime must expose complete/fail-cancel helpers.');
  }
}

// Block 1 — entry-phase contracts: negative guard stays in client
if (fileExists(test.questionClient)) {
  const questionClient = read(test.questionClient);

  if (/fallbackTransitionId/u.test(questionClient) || /runtimeState\.transitionId/u.test(questionClient)) {
    fail('Test question client must not depend on fallback/runtime transitionId state.');
  }
}

if (fileExists(test.runReducer)) {
  const reducerFile = read(test.runReducer);
  const requiredActionTypes = [
    'BOOTSTRAP_COMPLETE',
    'COMMIT_ENTRY',
    'REDIRECT_HOME',
    'SELECT_ANSWER',
    'NAVIGATE_PREVIOUS',
    'SUBMIT'
  ];

  for (const actionType of requiredActionTypes) {
    if (!reducerFile.includes(actionType)) {
      fail(`Test run reducer must include ${actionType} action support.`);
    }
  }
}

// Block 2 — checks use-test-run-controller.ts (telemetry and ingress moved here)
if (fileExists(test.runController)) {
  const runController = read(test.runController);

  if (!/consumeLandingIngress/u.test(runController)) {
    fail('Test run controller must consume landing ingress on attempt start.');
  }

  if (!/trackAttemptStart/u.test(runController) || !/trackFinalSubmit/u.test(runController)) {
    fail('Test run controller must emit attempt_start and final_submit.');
  }
}

// Block 2a — bootstrap ownership: storage hydration stays outside the controller, dispatch remains reducer-mediated
if (fileExists(test.testRunBootstrap)) {
  const testRunBootstrap = read(test.testRunBootstrap);

  if (!/dispatchRunAction/u.test(testRunBootstrap)) {
    fail('Test run bootstrap hook must dispatch BOOTSTRAP_COMPLETE through the reducer boundary.');
  }
}

if (fileExists(blog.destinationClient)) {
  const blogClient = read(blog.destinationClient);
  if (
    !/completePendingLandingTransition/u.test(blogClient) ||
    !/terminatePendingLandingTransition/u.test(blogClient) ||
    !/usePathname/u.test(blogClient) ||
    !/pendingTransition\.targetRoute !== pathname/u.test(blogClient)
  ) {
    fail('Blog destination client must complete transitions from route truth and terminate stale pending transitions.');
  }

  if (/useTelemetryBootstrap/u.test(blogClient)) {
    fail('Blog destination client must not bootstrap telemetry directly.');
  }
}

if (fileExists(e2e.transitionTelemetrySmoke)) {
  const e2eSpec = read(e2e.transitionTelemetrySmoke);
  if (
    !/card_answered/u.test(e2eSpec) ||
    !/attempt_start/u.test(e2eSpec) ||
    !/final_submit/u.test(e2eSpec) ||
    !/landing return restores scroll once/u.test(e2eSpec)
  ) {
    fail('Transition smoke must cover card_answered, attempt_start, final_submit, and one-shot scroll restoration.');
  }

  if (!/assertion:B14-mobile-close-perception/u.test(e2eSpec)) {
    fail('Transition smoke must cover mobile close perception alongside the existing baseline lifecycle assertions.');
  }

  if (
    !/assertion:B14-mobile-open-continuity/u.test(e2eSpec) ||
    !/assertion:B14-mobile-close-choreography/u.test(e2eSpec) ||
    !/assertion:B14-mobile-reduced-motion/u.test(e2eSpec) ||
    !/assertion:B14-mobile-title-continuity/u.test(e2eSpec)
  ) {
    fail('Transition smoke must cover mobile open continuity, close choreography, title continuity, and reduced-motion proof.');
  }

  if (!/landing-transition-source-gnb/u.test(e2eSpec) || !/assertion:B15-transition-correlation/u.test(e2eSpec)) {
    fail('Transition smoke must cover source GNB overlay visibility and destination-ready swap timing.');
  }

  if (!/__landingTransitionSignals/u.test(e2eSpec) || !/LANDING_TRANSITION_SIGNAL_EVENT/u.test(e2eSpec)) {
    fail('Transition smoke must collect internal transition signals alongside public telemetry.');
  }

  if (
    !/userScrolledY/u.test(e2eSpec) ||
    !/document\.body\.style\.overflow\)\)\.toBe\('hidden'\)/u.test(e2eSpec) ||
    !/document\.body\.style\.overflow\)\)\.toBe\(''\)/u.test(e2eSpec)
  ) {
    fail('Transition smoke must cover OPEN-settled scroll unlock, closing relock, and current-scroll preservation for mobile lifecycle.');
  }
}

if (fileExists(landing.grid.gridCardCss)) {
  const css = read(landing.grid.gridCardCss);

  if (!/landing-card-mobile-open-shell/u.test(css) || !/landing-card-detail-quiet-exit/u.test(css)) {
    fail('Landing grid styles must keep explicit mobile open/close choreography keyframes.');
  }

  if (
    !/\.root\.mobileTransientOpening/u.test(css) ||
    !/\.root\.mobileTransientClosing/u.test(css) ||
    !/\.transientShell\.transientOpening/u.test(css) ||
    !/\.transientShell\.transientClosing/u.test(css)
  ) {
    fail('Landing grid styles must keep explicit semantic-class selectors for mobile transient choreography.');
  }
}

finish('Phase 10 transition');
