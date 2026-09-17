import {createChecker, fileExists, read} from './_utils.mjs';
import {blog, e2e, landing, test, transition, ui} from './_path-config.mjs';

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
  ui.bottomSheetCss,
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

  if (!/landing-card-detail-quiet-exit/u.test(css)) {
    fail('Landing grid styles must keep the expanded detail exit keyframe.');
  }
}

// 폰의 확장 안무는 시트가 갖는다(명세 규칙 3 · §3-4). 종전에 이 자리가 요구하던 것은 in-flow
// transient 셸의 키프레임과 의미 클래스였고, 그 표면 자체가 사라졌다. 요구의 **내용**은 같다:
// 진입과 이탈이 각각 명시적으로 적혀 있고, reduced-motion 이 그 둘을 따로 처분한다.
if (fileExists(ui.bottomSheetCss)) {
  const sheetCss = read(ui.bottomSheetCss);

  // **두 면을 따로 묻는다.** 스크림과 시트는 한 전이의 두 면이라 따로 끝나면 둘로 읽힌다 —
  // 파일 어딘가에 문자열이 있는지만 보면 한쪽이 사라져도 통과한다(L30·L36).
  for (const face of ['scrim', 'sheet']) {
    const faceSelector = new RegExp(`\\.${face}\\[data-state='(entering|open|closing)'\\]`, 'gu');
    const states = new Set([...sheetCss.matchAll(faceSelector)].map((match) => match[1]));

    if (!states.has('closing') || !(states.has('entering') || states.has('open'))) {
      fail(`Sheet styles must keep explicit enter and exit state selectors for the ${face}.`);
    }
  }

  if (!/@media \(prefers-reduced-motion: reduce\)/u.test(sheetCss)) {
    fail('Sheet styles must handle reduced-motion explicitly.');
  }

  // 사라지는 스크림은 입력을 통과시킨다 — 닫은 뒤 그 아래를 이미 쓸 수 있어야 한다.
  if (!/\.scrim\[data-state='closing'\][\s\S]{0,240}pointer-events: none/u.test(sheetCss)) {
    fail('Sheet scrim must pass input through while it is disappearing.');
  }
}

finish('Phase 10 transition');
