import {createChecker, fileExists, read, readExisting} from './_utils.mjs';
import {e2e, gnb, landing, landingShell} from './_path-config.mjs';

const {fail, finish} = createChecker();

const requiredFiles = [
  landing.model.interactionState,
  landing.grid.interactionController,
  landing.grid.hoverIntentController,
  landing.grid.desktopMotionController,
  landing.grid.keyboardHandoff,
  landing.grid.keyboardModeTracker,
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
      landing.grid.cardKeyboardHandler,
    landing.grid.interactionDom
  ]);

  if (!/useReducer/u.test(controllerFile) || !/reduceLandingInteractionState/u.test(controllerFile)) {
    fail('Interaction controller must orchestrate state through reducer/store for Phase 7.');
  }

  if (!/viewportWidth < 768/u.test(controllerFile) || !/hoverCapability \? 'hover' : 'tap'/u.test(controllerFile)) {
    fail('Interaction controller must enforce capability gate with width<768 => tap mode in Phase 7.');
  }

  // 입력 축의 정의처가 `input-profile.ts` 한 곳으로 접혔다. 컨트롤러 본문에서 질의 문자열을
  // 찾던 종전 검사는 정의가 옮겨간 순간 **거짓 붉음**이 되고, 파일을 이어 붙여 훑도록 고치면
  // 그 다음에는 **거짓 초록**이 된다(L31) — 그래서 소유자 파일 하나를 직접 지목한다.
  if (fileExists(landing.grid.inputProfile)) {
    const inputProfileFile = read(landing.grid.inputProfile);

    // 질의 문자열과 그 상수 이름이 **한 선언 안에** 있어야 한다. import 문에 이름만 남아도
    // 통과하던 형태를 쓰지 않는다.
    if (
      !/INPUT_PROFILE_MEDIA_QUERY\s*=\s*'\(hover: hover\) and \(pointer: fine\)'/u.test(inputProfileFile)
    ) {
      fail('Input profile module must own the hover/pointer media query literal.');
    }

    if (!/matchMedia\(INPUT_PROFILE_MEDIA_QUERY\)/u.test(inputProfileFile)) {
      fail('Input profile module must subscribe to the media query it declares.');
    }

    // 그리고 그 정의처가 **유일**해야 한다 — 소비자 쪽에 사본이 다시 생기면 붉어진다.
    for (const consumer of [landing.grid.interactionController, gnb.capabilityHook]) {
      if (fileExists(consumer) && /'\(hover: hover\) and \(pointer: fine\)'/u.test(read(consumer))) {
        fail(`Input axis media query must live only in the input profile module, found a copy in ${consumer}.`);
      }
    }
  } else {
    fail('Input profile module must exist as the single JS owner of the input axis.');
  }

  if (!/MODE_SYNC/u.test(controllerFile) || !/PAGE_HIDDEN/u.test(controllerFile) || !/PAGE_VISIBLE/u.test(controllerFile)) {
    fail('Interaction controller must dispatch mode + visibility synchronization events.');
  }

  const keyboardHandoffFile = readExisting([
    landing.grid.keyboardHandoff,
    landing.grid.keyboardModeTracker,
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

// 랜딩 키보드 진입은 skip link 가 소유한다. 종전 계약(「첫 Tab 이 GNB 를 건너뛰고 첫 카드로
// 간다」)은 탭 순서를 상태로 바꿔 예측 가능성을 해쳤고, 그 비용은 키보드 사용자에게만 부과됐다.
if (fileExists(landingShell.skipToContentLink) && fileExists(landingShell.pageShell)) {
  const skipLinkFile = read(landingShell.skipToContentLink);
  const pageShellFile = read(landingShell.pageShell);

  // 목적지 id 가 한 선언 안에서 링크와 `<main>` 을 잇는다 — import 문에 이름만 남아도
  // 통과하던 형태를 쓰지 않는다(L31).
  if (!/PAGE_SHELL_MAIN_ID\s*=\s*'[a-z-]+'/u.test(skipLinkFile)) {
    fail('Skip link module must own the main-content anchor id.');
  }

  if (!/href=\{`#\$\{PAGE_SHELL_MAIN_ID\}`\}/u.test(skipLinkFile)) {
    fail('Skip link must point at the main-content anchor it declares.');
  }

  if (!/id=\{PAGE_SHELL_MAIN_ID\}/u.test(pageShellFile) || !/tabIndex=\{-1\}/u.test(pageShellFile)) {
    fail('Page shell main must carry the skip link anchor id and be focusable.');
  }

  // 그리고 탭 순서를 상태로 바꾸던 기구가 돌아오지 않아야 한다.
  if (/tabIndex=\{(?:desktop|mobile)LandingTabIndex\}/u.test(read(gnb.siteGnb))) {
    fail('GNB must not reintroduce state-dependent landing tab order — the skip link replaced it.');
  }
}

finish('Phase 7');
