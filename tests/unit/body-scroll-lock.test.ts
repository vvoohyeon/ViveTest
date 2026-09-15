// @vitest-environment jsdom
import {afterEach, describe, expect, it} from 'vitest';

import {
  acquireBodyScrollLock,
  bodyScrollLockHolders,
  resetBodyScrollLockForTest
} from '@/features/ui/body-scroll-lock';

import {readRepoFile, walkRepoFiles} from './helpers/repo';

/**
 * 잠금이 겹칠 때 무엇이 복원되는가를 본다. 종전에는 랜딩 카드와 GNB 드로어가 각자
 * `document.body.style` 의 이전 값을 저장했고, 겹치면 나중에 건 쪽이 이미 `hidden` 이 된
 * 값을 「이전 값」으로 저장해 **마지막 해제가 `hidden` 을 복원했다** — 페이지가 영구히
 * 얼어붙는다. 참조 카운트가 그 겹침을 구조적으로 없앤다.
 *
 * 아래 소스 검사는 **소유자 목록을 훑지 않는다**(L30). `src` 전수에서 `body.style` 쓰기를
 * 찾고 모듈 자신 말고 어디에도 없어야 한다고 묻는다 — 새 파일이 같은 결함을 들여와도 걸린다.
 */
const LOCK_MODULE = 'src/features/ui/body-scroll-lock.ts';
const BODY_STYLE_WRITE = /document\.body\.style\.[A-Za-z]+\s*=/gu;

afterEach(() => {
  resetBodyScrollLockForTest();
  document.body.style.overflow = '';
  document.body.style.touchAction = '';
});

describe('body 스크롤 잠금', () => {
  it('두 소비자가 겹쳐도 마지막 해제가 잠그기 전 값을 복원한다', () => {
    document.body.style.overflow = 'auto';
    document.body.style.touchAction = 'pan-y';

    const releaseCard = acquireBodyScrollLock('landing-mobile-card');
    expect(document.body.style.overflow).toBe('hidden');

    // 겹쳐 거는 쪽은 이미 잠긴 값을 보지만 저장하지 않는다.
    const releaseMenu = acquireBodyScrollLock('gnb-mobile-menu');
    expect(document.body.style.overflow).toBe('hidden');

    releaseCard();
    expect(document.body.style.overflow, '보유자가 남아 있으면 아직 풀리지 않는다').toBe('hidden');

    releaseMenu();
    expect(document.body.style.overflow).toBe('auto');
    expect(document.body.style.touchAction).toBe('pan-y');
    expect(bodyScrollLockHolders()).toEqual([]);
  });

  it('같은 이름의 두 인스턴스가 겹쳐도 첫 해제가 나머지의 잠금을 풀지 않는다', () => {
    document.body.style.overflow = 'auto';

    const releaseFirst = acquireBodyScrollLock('landing-mobile-card');
    const releaseSecond = acquireBodyScrollLock('landing-mobile-card');
    expect(bodyScrollLockHolders()).toEqual(['landing-mobile-card', 'landing-mobile-card']);

    releaseFirst();
    expect(document.body.style.overflow, '둘째 인스턴스가 아직 열려 있다').toBe('hidden');

    releaseSecond();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('같은 해제를 두 번 불러도 한 몫만 반납한다', () => {
    document.body.style.overflow = 'auto';

    const releaseFirst = acquireBodyScrollLock('landing-mobile-card');
    acquireBodyScrollLock('gnb-mobile-menu');

    releaseFirst();
    releaseFirst();

    expect(document.body.style.overflow, '중복 반납이 남은 보유자의 잠금을 풀면 안 된다').toBe('hidden');
    expect(bodyScrollLockHolders()).toEqual(['gnb-mobile-menu']);
  });

  it('src 전수에서 body.style 쓰기가 잠금 모듈 밖에 없다', () => {
    const sources = walkRepoFiles('src', ['.ts', '.tsx']);
    expect(sources.length, '전제: src 를 훑지 못하면 아래 단언이 공허하게 초록이 된다').toBeGreaterThan(0);
    expect(
      sources.includes(LOCK_MODULE),
      '전제: 잠금 모듈 자신이 훑기에 들어와야 예외가 의미를 갖는다'
    ).toBe(true);

    const offenders: string[] = [];
    let moduleWrites = 0;

    for (const file of sources) {
      const matches = [...readRepoFile(file).matchAll(BODY_STYLE_WRITE)];
      if (file === LOCK_MODULE) {
        moduleWrites = matches.length;
        continue;
      }
      for (const match of matches) {
        offenders.push(`${file} → ${match[0]}`);
      }
    }

    expect(
      moduleWrites,
      '전제: 잠금 모듈이 실제로 body.style 을 쓰지 않으면 이 패턴이 틀린 것을 재고 있다'
    ).toBeGreaterThan(0);
    expect(
      offenders,
      `body 스크롤 잠금은 ${LOCK_MODULE} 하나가 소유한다. 직접 쓰기:\n${offenders.join('\n')}`
    ).toEqual([]);
  });
});
