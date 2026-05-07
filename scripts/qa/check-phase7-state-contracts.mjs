import {createChecker, fileExists, read, readExisting} from './_utils.mjs';
import {e2e, landing} from './_path-config.mjs';

const {fail, finish} = createChecker();

const requiredFiles = [
  landing.model.interactionState,
  landing.grid.interactionController,
  landing.grid.hoverIntentController,
  landing.grid.desktopMotionController,
  landing.grid.keyboardHandoff,
  landing.grid.keyboardModeTracker,
  landing.grid.landingKeyboardEntry,
  landing.grid.cardKeyboardHandler,
  landing.grid.interactionDom,
  landing.grid.catalogGrid,
  landing.grid.gridCard,
  'tests/unit/landing-interaction-state.test.ts',
  e2e.stateSmoke
];

for (const relativePath of requiredFiles) {
  if (!fileExists(relativePath)) {
    fail(`Missing required Phase 7 file: ${relativePath}`);
  }
}

if (fileExists(landing.model.interactionState)) {
  const stateMachineFile = read(landing.model.interactionState);

  if (!/ACTIVE_RAMP_UP_MS/u.test(stateMachineFile) || !/reduceLandingInteractionState/u.test(stateMachineFile)) {
    fail('Phase 7 requires ACTIVE ramp-up constant and reducer implementation.');
  }

  if (!/PAGE_STATE_PRIORITY/u.test(stateMachineFile) || !/ALLOWED_PAGE_TRANSITIONS/u.test(stateMachineFile)) {
    fail('Phase 7 requires explicit page-state priority and allowed-transition table.');
  }

  if (!/isAllowedPageTransition/u.test(stateMachineFile)) {
    fail('Phase 7 requires transition conformance helper (isAllowedPageTransition).');
  }

  if (!/INACTIVE/u.test(stateMachineFile) || !/TRANSITIONING/u.test(stateMachineFile)) {
    fail('Phase 7 reducer must include INACTIVE/TRANSITIONING interaction guards.');
  }

  if (!/KEYBOARD_MODE_ENTER/u.test(stateMachineFile) || !/KEYBOARD_MODE_EXIT/u.test(stateMachineFile)) {
    fail('Phase 7 reducer must support keyboard-mode enter/exit events.');
  }

  if (!/CARD_FOCUS/u.test(stateMachineFile) || !/CARD_ACTIVATE/u.test(stateMachineFile)) {
    fail('Phase 7 reducer must handle focus/activate card events.');
  }
}

if (fileExists(landing.grid.interactionController)) {
  const controllerFile = read(landing.grid.interactionController);
  const controllerAndDomFiles = readExisting([
    landing.grid.interactionController,
    landing.grid.hoverIntentController,
    landing.grid.desktopMotionController,
    landing.grid.keyboardHandoff,
    landing.grid.keyboardModeTracker,
    landing.grid.landingKeyboardEntry,
    landing.grid.cardKeyboardHandler,
    landing.grid.interactionDom
  ]);

  if (!/useReducer/u.test(controllerFile) || !/reduceLandingInteractionState/u.test(controllerFile)) {
    fail('Interaction controller must orchestrate state through reducer/store for Phase 7.');
  }

  if (!/viewportWidth < 768/u.test(controllerFile) || !/hoverCapability \? 'hover' : 'tap'/u.test(controllerFile)) {
    fail('Interaction controller must enforce capability gate with width<768 => tap mode in Phase 7.');
  }

  if (!/matchMedia\('\(hover: hover\) and \(pointer: fine\)'\)/u.test(controllerFile)) {
    fail('Interaction controller must sync hover capability from media features.');
  }

  if (!/MODE_SYNC/u.test(controllerFile) || !/PAGE_HIDDEN/u.test(controllerFile) || !/PAGE_VISIBLE/u.test(controllerFile)) {
    fail('Interaction controller must dispatch mode + visibility synchronization events.');
  }

  const keyboardHandoffFile = readExisting([
    landing.grid.keyboardHandoff,
    landing.grid.keyboardModeTracker,
    landing.grid.landingKeyboardEntry,
    landing.grid.cardKeyboardHandler
  ]);
  if (!/pointermove/u.test(controllerAndDomFiles) || !/mousedown/u.test(controllerAndDomFiles)) {
    fail('Interaction controller must track pointermove and exit keyboard mode on mousedown in Phase 7.');
  }

  if (/window\.addEventListener\(\s*['"]wheel['"]/u.test(keyboardHandoffFile)) {
    fail('Interaction controller must not register a wheel listener to exit keyboard mode in Phase 7.');
  }

  if (!/resolveCardStateForVariant/u.test(controllerFile) || !/resolveCardTabIndex/u.test(controllerFile)) {
    fail('Interaction controller must resolve per-card visual state and tab policy.');
  }

  if (!/getExpandedFocusableElements/u.test(controllerAndDomFiles) || !/resolveAdjacentCardVariant/u.test(controllerAndDomFiles)) {
    fail('Interaction controller must implement keyboard sequential override traversal helpers.');
  }
}

if (fileExists(landing.grid.catalogGrid)) {
  const gridFile = read(landing.grid.catalogGrid);

  if (!/useLandingInteractionController/u.test(gridFile)) {
    fail('LandingCatalogGrid must consume interaction controller in Phase 7.');
  }

  if (!/data-page-state/u.test(gridFile) || !/data-hover-lock-enabled/u.test(gridFile)) {
    fail('LandingCatalogGrid must expose page state + hover-lock markers in Phase 7.');
  }

  if (!/resolveCardInteractionBindings/u.test(gridFile) || !/interactionBindings/u.test(gridFile)) {
    fail('LandingCatalogGrid must wire controller-resolved bindings into each card in Phase 7.');
  }
}

if (fileExists(landing.grid.gridCard)) {
  const cardFile = read(landing.grid.gridCard);

  if (!/tabIndex=/u.test(cardFile) || !/aria-disabled/u.test(cardFile)) {
    fail('LandingGridCard must expose tabIndex and aria-disabled controls in Phase 7.');
  }

  if (!/data-hover-lock-blocked/u.test(cardFile) || !/data-keyboard-mode/u.test(cardFile)) {
    fail('LandingGridCard must expose hover-lock + keyboard-mode markers in Phase 7.');
  }
}

if (fileExists('tests/unit/landing-interaction-state.test.ts')) {
  const unitSpec = read('tests/unit/landing-interaction-state.test.ts');

  if (!/INACTIVE/u.test(unitSpec) || !/deterministic/u.test(unitSpec)) {
    fail('Phase 7 unit tests must cover guard + determinism contracts.');
  }

  if (!/keyboard mode/u.test(unitSpec) || !/ramp-up/u.test(unitSpec)) {
    fail('Phase 7 unit tests must cover keyboard mode and ACTIVE ramp-up behavior.');
  }

  if (!/forbidden page-state transition/u.test(unitSpec) || !/reduced-motion/u.test(unitSpec)) {
    fail('Phase 7 unit tests must cover transition conformance + reduced-motion contracts.');
  }
}

if (fileExists(e2e.stateSmoke)) {
  const e2eSpec = read(e2e.stateSmoke);

  if (!/@smoke/u.test(e2eSpec)) {
    fail('Phase 7 state smoke tests must include @smoke tag.');
  }

  if (!/capability gate/u.test(e2eSpec) || !/keyboard sequential override/u.test(e2eSpec)) {
    fail('Phase 7 state smoke must cover capability gate and keyboard sequential override.');
  }

  if (!/assertion:B5-mobile-keyboard-handoff/u.test(e2eSpec)) {
    fail('Phase 7 state smoke must cover the mobile keyboard handoff regression path.');
  }
}

finish('Phase 7');
