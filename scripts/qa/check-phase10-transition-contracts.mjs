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

const requiredFiles = [
  'src/features/landing/transition/runtime.ts',
  'src/features/landing/transition/signals.ts',
  'src/features/landing/transition/use-landing-transition.ts',
  'src/features/landing/landing-runtime.tsx',
  'src/features/landing/test/test-question-client.tsx',
  'src/features/landing/blog/blog-destination-client.tsx',
  'src/app/globals.css',
  'tests/e2e/transition-telemetry-smoke.spec.ts'
];

for (const relativePath of requiredFiles) {
  if (!fileExists(relativePath)) {
    fail(`Missing required Phase 10 file: ${relativePath}`);
  }
}

if (fileExists('src/features/landing/transition/runtime.ts')) {
  const runtimeFile = read('src/features/landing/transition/runtime.ts');

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

if (fileExists('src/features/landing/test/test-question-client.tsx')) {
  const questionClient = read('src/features/landing/test/test-question-client.tsx');

  if (!/consumeLandingIngress/u.test(questionClient) || !/markInstructionSeen/u.test(questionClient)) {
    fail('Test question client must separate ingress read/consume and persist instructionSeen.');
  }

  if (!/trackAttemptStart/u.test(questionClient) || !/trackFinalSubmit/u.test(questionClient)) {
    fail('Test question client must emit attempt_start and final_submit.');
  }

  if (/fallbackTransitionId/u.test(questionClient) || /runtimeState\.transitionId/u.test(questionClient)) {
    fail('Test question client must not depend on fallback/runtime transitionId state.');
  }
}

if (fileExists('src/features/landing/blog/blog-destination-client.tsx')) {
  const blogClient = read('src/features/landing/blog/blog-destination-client.tsx');
  if (!/completePendingLandingTransition/u.test(blogClient) || !/BLOG_FALLBACK_EMPTY/u.test(blogClient)) {
    fail('Blog destination client must complete transitions and handle empty fallback closure.');
  }

  if (/useTelemetryBootstrap/u.test(blogClient)) {
    fail('Blog destination client must not bootstrap telemetry directly.');
  }
}

if (fileExists('tests/e2e/transition-telemetry-smoke.spec.ts')) {
  const e2eSpec = read('tests/e2e/transition-telemetry-smoke.spec.ts');
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

if (fileExists('src/app/globals.css')) {
  const css = read('src/app/globals.css');

  if (!/landing-card-mobile-open-shell/u.test(css) || !/landing-card-detail-quiet-exit/u.test(css)) {
    fail('Global styles must keep explicit mobile open/close choreography keyframes.');
  }

  if (!/data-mobile-transient-mode='OPENING'/u.test(css) || !/data-mobile-transient-mode='CLOSING'/u.test(css)) {
    fail('Global styles must keep explicit mobile transient-mode selectors.');
  }
}

if (errors.length > 0) {
  console.error('Phase 10 transition contract checks failed:');
  for (const issue of errors) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('Phase 10 transition contract checks passed.');
