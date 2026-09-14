import type {Page} from '@playwright/test';

/**
 * e2e 가 흉내 내는 **입력 방식**. 폭과 독립이다.
 *
 * 저장소의 모바일 e2e 는 지금까지 폭만 바꿔 왔고 `hasTouch`·`isMobile`·`(pointer: coarse)`·
 * `navigator.maxTouchPoints` 를 쓰는 케이스가 0 건이었다. 그래서 390px 케이스가 tap 모드에
 * 도달하는 것은 **폭 게이트 덕분이지 입력 방식 덕분이 아니었다** — 생명주기를 입력 축으로
 * 옮기는 순간 hover 가능한 chromium 의 390px 뷰포트가 hover 경로로 떨어지고, 붉음의 원인이
 * 「계약 위반」인지 「테스트가 터치를 흉내 내지 않아서」인지 가려낼 수 없게 된다.
 */
export type E2eInputProfile = 'touch' | 'hover-capable';

export const E2E_INPUT_PROFILE_STORAGE_KEY = 'vivetest-e2e-input-profile';

/**
 * 입력 흉내를 페이지에 설치한다.
 *
 * 스텁은 **매 네비게이션마다 `sessionStorage` 를 다시 읽으므로** 한 페이지 안에서 프로파일을
 * 바꿀 수 있다 — `addInitScript` 는 등록을 취소할 수 없고, 모바일 생명주기와 데스크톱 hover
 * 생명주기를 한 케이스에서 잇달아 검사하는 스펙이 실제로 둘 있기 때문이다. 프로파일을 바꾼
 * 뒤에는 **반드시 네비게이션(`goto`/`reload`)이 따라야** 새 판정이 적용된다.
 *
 * **한계 — 이 스텁은 JS 층만 덮는다.** 브라우저가 CSS `@media (hover: hover)` 를 평가하는 것은
 * 바꾸지 못하므로 `landing-grid-card.module.css` 의 입력 게이트는 여전히 실제 chromium 능력으로
 * 판정된다. CSS 층까지 덮으려면 `test.use({hasTouch: true, isMobile: true})` 가 필요한데 그것은
 * 파일·describe 범위라서 데스크톱 케이스와 한 파일에 섞여 있는 현재 구조에 적용할 수 없다.
 * 그 비대칭은 알고 남기는 것이며, JS 판정 단일화가 보는 것은 이 스텁이 덮는 층이다.
 */
async function installInputProfileStub(page: Page): Promise<void> {
  const installed = (page as Page & {__inputProfileStubInstalled?: boolean}).__inputProfileStubInstalled;

  if (installed === true) {
    return;
  }

  (page as Page & {__inputProfileStubInstalled?: boolean}).__inputProfileStubInstalled = true;

  await page.addInitScript((storageKey) => {
    const originalMatchMedia = window.matchMedia.bind(window);

    const readProfile = (): string => {
      try {
        return window.sessionStorage.getItem(storageKey) ?? 'touch';
      } catch {
        return 'touch';
      }
    };

    const TOUCH_FEATURE_ANSWERS: Readonly<Record<string, string>> = {
      hover: 'none',
      'any-hover': 'none',
      pointer: 'coarse',
      'any-pointer': 'coarse'
    };

    const FEATURE_PATTERN = /\(\s*(any-hover|any-pointer|hover|pointer)\s*:\s*([a-z]+)\s*\)/g;

    function evaluateTouchQuery(query: string): boolean | null {
      FEATURE_PATTERN.lastIndex = 0;

      let matched = false;
      let result = true;
      let term: RegExpExecArray | null = FEATURE_PATTERN.exec(query);

      while (term !== null) {
        matched = true;
        result = result && TOUCH_FEATURE_ANSWERS[term[1]] === term[2];
        term = FEATURE_PATTERN.exec(query);
      }

      if (!matched) {
        return null;
      }

      // 입력 특성만으로 이루어진 논리곱(`and`)만 판정한다. `or`/`not` 이나 폭 특성이 섞이면
      // 이 스텁이 답을 지어내지 않고 실제 브라우저에 넘긴다.
      const remainder = query.replace(FEATURE_PATTERN, '').replace(/\band\b/g, '').trim();

      return remainder === '' ? result : null;
    }

    window.matchMedia = (query: string) => {
      if (readProfile() !== 'touch') {
        return originalMatchMedia(query);
      }

      const touchAnswer = evaluateTouchQuery(query);

      if (touchAnswer === null) {
        return originalMatchMedia(query);
      }

      return {
        media: query,
        matches: touchAnswer,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
        addListener: () => {},
        removeListener: () => {}
      } as MediaQueryList;
    };

    Object.defineProperty(window.navigator, 'maxTouchPoints', {
      configurable: true,
      get: () => (readProfile() === 'touch' ? 5 : 0)
    });
  }, E2E_INPUT_PROFILE_STORAGE_KEY);
}

async function writeInputProfile(page: Page, profile: E2eInputProfile): Promise<void> {
  await page.addInitScript(
    ([storageKey, nextProfile]) => {
      try {
        window.sessionStorage.setItem(storageKey, nextProfile);
      } catch {
        // sessionStorage 가 없는 환경에서는 스텁의 기본값('touch')이 그대로 쓰인다.
      }
    },
    [E2E_INPUT_PROFILE_STORAGE_KEY, profile] as const
  );

  // 이미 문서가 열려 있으면 다음 네비게이션 전에 현재 세션에도 반영해 둔다.
  try {
    await page.evaluate(
      ([storageKey, nextProfile]) => {
        window.sessionStorage.setItem(storageKey, nextProfile);
      },
      [E2E_INPUT_PROFILE_STORAGE_KEY, profile] as const
    );
  } catch {
    // about:blank 처럼 아직 origin 이 없는 상태 — init script 가 첫 네비게이션에서 처리한다.
  }
}

export interface E2eViewportSize {
  width: number;
  height: number;
}

/**
 * 폭을 설정하면서 같은 호출로 **터치** 입력 컨텍스트를 부여한다.
 *
 * 스텁은 다음 네비게이션부터 적용되므로 **`goto`/`reload` 앞에서** 부른다.
 */
export async function setTouchViewport(page: Page, size: E2eViewportSize): Promise<void> {
  await page.setViewportSize(size);
  await installInputProfileStub(page);
  await writeInputProfile(page, 'touch');
}

/**
 * 폭을 설정하면서 같은 호출로 **hover 가능** 입력 컨텍스트로 되돌린다.
 *
 * 한 케이스가 모바일 생명주기를 검사한 뒤 데스크톱 hover 생명주기로 넘어갈 때 쓴다 —
 * 그냥 `setViewportSize` 만 부르면 앞서 설치된 터치 스텁이 그대로 남아 데스크톱 폭에서도
 * tap 으로 판정된다.
 */
export async function setHoverCapableViewport(page: Page, size: E2eViewportSize): Promise<void> {
  await page.setViewportSize(size);
  await installInputProfileStub(page);
  await writeInputProfile(page, 'hover-capable');
}
