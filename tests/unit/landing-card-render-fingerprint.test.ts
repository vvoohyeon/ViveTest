import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';

import {JSDOM} from 'jsdom';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vitest';

import {locales, type AppLocale} from '../../src/config/site';
import type {
  LandingCardDesktopMotionRole,
  LandingCardDesktopShellPhase
} from '../../src/features/landing/grid/desktop-shell-phase';
import type {
  LandingCardInteractionMode,
  LandingCardMobilePhase,
  LandingCardViewportTier,
  LandingCardVisualState
} from '../../src/features/landing/grid/landing-grid-card';
import {getDefaultCardCopy, LandingGridCard} from '../../src/features/landing/grid/landing-grid-card';
import {resolveLandingCatalog, type LandingCard} from '../../src/features/variant-registry';

// F2 — 카드 SSR 마크업 지문 (step 1 §5-2).
//
// 리듀서 지문(F1)은 상태 전이만 보고 시각 baseline 은 합성된 픽셀만 본다. 그 사이에 있는 것이
// 「DOM 구조·속성·클래스 문자열」이고, 0단계의 파일 분리가 깨뜨릴 수 있는 것의 대부분이 거기 있다.
//
// 조합은 두 덩어리다. 비모바일 10,080 렌더(tier × state × mode × motionRole × shellPhase),
// 모바일 1,440 렌더(state × mode × mobilePhase × transientMode). 나머지 부수 prop 은 고정 문맥
// 3 종 위에서 일변량으로 훑는다.
//
// `useId` 가 유일한 함정이다. React 19 SSR 은 `_R_<n>_` 를 내보내고 그 값은 useId 호출 이전에
// 렌더된 컴포넌트 경계의 수에만 의존한다 — `LandingGridCard` 의 useId 는 함수 본문 첫 문장이므로
// 자식만 추출하는 한 값이 변하지 않는다. 그래도 지문은 정규화한 뒤 해싱하고, id 가 맺는 **관계**는
// 별도 단언으로 남긴다(아래 'keeps the aria id relationship').

const FIXTURE_URL = new URL('../fixtures/landing-card-render-fingerprint.json', import.meta.url);

const VIEWPORT_TIERS_DESKTOP: readonly LandingCardViewportTier[] = ['desktop', 'tablet'];
const VISUAL_STATES: readonly LandingCardVisualState[] = ['normal', 'expanded', 'focused'];
const INTERACTION_MODES: readonly LandingCardInteractionMode[] = ['hover', 'tap'];
const DESKTOP_MOTION_ROLES: readonly LandingCardDesktopMotionRole[] = [
  'idle',
  'opening',
  'steady',
  'closing',
  'handoff-target',
  'handoff-source'
];
const DESKTOP_SHELL_PHASES: readonly LandingCardDesktopShellPhase[] = [
  'idle',
  'opening',
  'steady',
  'closing',
  'cleanup-pending',
  'handoff-target',
  'handoff-source'
];
const MOBILE_PHASES: readonly LandingCardMobilePhase[] = ['NORMAL', 'OPENING', 'OPEN', 'CLOSING'];

// 카탈로그 10 장 중 렌더 분기를 대표하는 다섯 장: test available 둘, test unavailable 하나,
// blog 하나, 그리고 자산 없는 debug 하나.
const FIXTURE_VARIANTS = ['qmbti', 'rhythm-b', 'creativity-profile', 'ops-handbook', 'debug-sample'] as const;

const SPACING_CONTRACT = {
  baseGapPx: 12,
  compGapPx: 4,
  needsComp: true,
  naturalHeightPx: 277,
  rowMaxNaturalHeightPx: 286
} as const;

type CardProps = Parameters<typeof LandingGridCard>[0];

function selectFixtureCards(): LandingCard[] {
  const catalog = resolveLandingCatalog('en', {audience: 'qa'});

  return FIXTURE_VARIANTS.map((variant) => {
    const card = catalog.find((candidate) => candidate.variant === variant);
    if (!card) {
      throw new Error(`Expected landing catalog fixture card ${variant}.`);
    }
    return card;
  });
}

function normalizeMarkup(html: string): string {
  // React 19 SSR useId — 값이 아니라 관계만 계약이다(위 머리말).
  return html.replace(/_R_[0-9a-z]*_/gu, '_R_');
}

function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

type RenderFn = (key: string, props: CardProps) => string;

const renderCard: RenderFn = (_key, props) => normalizeMarkup(renderToStaticMarkup(createElement(LandingGridCard, props)));

function baseCombos(): Array<{key: string; card: LandingCard; hasAssetMedia: boolean; reducedMotion: boolean}> {
  const combos: Array<{key: string; card: LandingCard; hasAssetMedia: boolean; reducedMotion: boolean}> = [];

  for (const card of selectFixtureCards()) {
    for (const hasAssetMedia of [false, true]) {
      for (const reducedMotion of [false, true]) {
        combos.push({
          key: `${card.variant}/media=${hasAssetMedia}/rm=${reducedMotion}`,
          card,
          hasAssetMedia,
          reducedMotion
        });
      }
    }
  }

  return combos;
}

function fixedProps(): Pick<CardProps, 'locale' | 'copy' | 'sequence'> {
  return {locale: 'en', copy: getDefaultCardCopy(), sequence: 0};
}

function collectDesktopGroup(render: RenderFn): string[] {
  const lines: string[] = [];

  for (const base of baseCombos()) {
    for (const viewportTier of VIEWPORT_TIERS_DESKTOP) {
      for (const state of VISUAL_STATES) {
        for (const interactionMode of INTERACTION_MODES) {
          for (const desktopMotionRole of DESKTOP_MOTION_ROLES) {
            for (const desktopShellPhase of DESKTOP_SHELL_PHASES) {
              const key = `${base.key}/${viewportTier}/${state}/${interactionMode}/${desktopMotionRole}/${desktopShellPhase}`;
              lines.push(
                `${key}\t${sha256(
                  render(key, {
                    ...fixedProps(),
                    card: base.card,
                    hasAssetMedia: base.hasAssetMedia,
                    reducedMotion: base.reducedMotion,
                    viewportTier,
                    state,
                    interactionMode,
                    desktopMotionRole,
                    desktopShellPhase
                  })
                )}`
              );
            }
          }
        }
      }
    }
  }

  return lines;
}

function collectMobileGroup(render: RenderFn): string[] {
  const lines: string[] = [];

  for (const base of baseCombos()) {
    for (const state of VISUAL_STATES) {
      for (const interactionMode of INTERACTION_MODES) {
        for (const mobilePhase of MOBILE_PHASES) {
          const key = `${base.key}/mobile/${state}/${interactionMode}/${mobilePhase}`;
          lines.push(
            `${key}\t${sha256(
              render(key, {
                ...fixedProps(),
                card: base.card,
                hasAssetMedia: base.hasAssetMedia,
                reducedMotion: base.reducedMotion,
                viewportTier: 'mobile',
                state,
                interactionMode,
                mobilePhase
              })
            )}`
          );
        }
      }
    }
  }

  return lines;
}

const UNIVARIATE_CONTEXTS: ReadonlyArray<{name: string; props: Partial<CardProps>}> = [
  {name: 'desktop-normal', props: {viewportTier: 'desktop', state: 'normal', interactionMode: 'hover'}},
  {
    name: 'desktop-expanded',
    props: {
      viewportTier: 'desktop',
      state: 'expanded',
      interactionMode: 'hover',
      desktopMotionRole: 'steady',
      desktopShellPhase: 'steady'
    }
  },
  {
    name: 'mobile-open',
    props: {
      viewportTier: 'mobile',
      state: 'expanded',
      interactionMode: 'tap',
      mobilePhase: 'OPEN'
    }
  }
];

const UNIVARIATE_AXES: ReadonlyArray<{prop: string; values: ReadonlyArray<unknown>}> = [
  {prop: 'locale', values: locales as ReadonlyArray<AppLocale>},
  {prop: 'sequence', values: [undefined, 0, 7]},
  {prop: 'tabIndex', values: [-1, 0, 3]},
  {prop: 'ariaDisabled', values: [false, true]},
  {prop: 'interactionBlocked', values: [false, true]},
  {prop: 'keyboardModeBlocked', values: [false, true]},
  {prop: 'hoverLockEnabled', values: [false, true]},
  {prop: 'keyboardMode', values: [false, true]},
  {prop: 'mobileRestoreReady', values: [false, true]},
  {prop: 'desktopTransformOriginX', values: ['0%', '50%', '100%']},
  {prop: 'spacing', values: [undefined, SPACING_CONTRACT]},
  {prop: 'expandedRestingFloorPx', values: [undefined, 420]}
];

function collectUnivariateGroup(render: RenderFn): string[] {
  const lines: string[] = [];
  const [card] = selectFixtureCards();

  for (const axis of UNIVARIATE_AXES) {
    for (const context of UNIVARIATE_CONTEXTS) {
      for (const [index, value] of axis.values.entries()) {
        const key = `${axis.prop}[${index}]/${context.name}`;
        lines.push(
          `${key}\t${sha256(
            render(key, {
              ...fixedProps(),
              card,
              ...context.props,
              [axis.prop]: value
            } as CardProps)
          )}`
        );
      }
    }
  }

  return lines;
}

interface FingerprintReport {
  version: number;
  renderCount: number;
  groups: Record<string, {renderCount: number; digest: string}>;
  digest: string;
}

function buildFingerprint(render: RenderFn): {report: FingerprintReport; lines: Record<string, string[]>} {
  const lines: Record<string, string[]> = {
    'desktop-tablet': collectDesktopGroup(render),
    mobile: collectMobileGroup(render),
    univariate: collectUnivariateGroup(render)
  };

  const groups: Record<string, {renderCount: number; digest: string}> = {};
  let renderCount = 0;
  const allLines: string[] = [];

  for (const groupName of Object.keys(lines).sort()) {
    const groupLines = [...lines[groupName]].sort();
    groups[groupName] = {renderCount: groupLines.length, digest: sha256(groupLines.join('\n'))};
    renderCount += groupLines.length;
    allLines.push(...groupLines);
  }

  allLines.sort();

  return {report: {version: 1, renderCount, groups, digest: sha256(allLines.join('\n'))}, lines};
}

function describeDivergence(expected: FingerprintReport, actual: FingerprintReport, lines: Record<string, string[]>): string {
  const messages: string[] = [];

  for (const groupName of Object.keys(actual.groups)) {
    if (expected.groups[groupName]?.digest === actual.groups[groupName].digest) {
      continue;
    }
    messages.push(
      `그룹 '${groupName}' 의 마크업이 달라졌다 (렌더 ${actual.groups[groupName].renderCount} 장). 표본 키: ${lines[groupName]
        .slice(0, 3)
        .map((line) => line.split('\t')[0])
        .join(', ')}`
    );
  }

  return messages.join('\n');
}

describe('landing card SSR markup fingerprint (F2)', () => {
  const {report, lines} = buildFingerprint(renderCard);

  it('covers the declared combination space', () => {
    expect(report.groups['desktop-tablet'].renderCount).toBe(10_080);
    // 1_440 → 480: transient 모드 축(NONE/OPENING/CLOSING)이 사라졌다. 폰의 확장이 시트로
    // 옮겨 가면서 카드가 모션 전용 표면을 그리지 않으므로 그 축 자체가 없어진 것이지, 커버리지를
    // 줄인 것이 아니다 — 남은 축(위상 넷)은 그대로다.
    expect(report.groups.mobile.renderCount).toBe(480);
    expect(report.groups.univariate.renderCount).toBeGreaterThanOrEqual(30);
  });

  /**
   * **이 지문은 제품보다 CSS 모듈 이름을 더 많이 담는다.**
   *
   * Vite 의 CSS 모듈 처리는 **정의가 없는 키에도** 해시 이름을 돌려준다(실측 2026-09-16:
   * `styles.normalTitle` → `_normalTitle_29f466`). Next 는 그 자리에서 `undefined` 를 돌려주고
   * 클래스 목록에서 조용히 빠진다. 따라서 **정의 없는 참조를 지우면 이 지문은 움직이지만
   * 제품 마크업은 한 바이트도 움직이지 않는다.** 그 움직임을 회귀로 읽지 않는다 — 정의
   * 없는 참조는 `css-module-reference-integrity.test.ts` 가 따로 금지한다.
   */
  it('matches the committed fingerprint byte for byte', () => {
    if (process.env.UPDATE_LANDING_FINGERPRINTS === '1') {
      writeFileSync(FIXTURE_URL, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    }

    const expected = JSON.parse(readFileSync(FIXTURE_URL, 'utf8')) as FingerprintReport;

    expect(report.groups, describeDivergence(expected, report, lines)).toEqual(expected.groups);
    expect(report.digest).toBe(expected.digest);
    expect(report.renderCount).toBe(expected.renderCount);
  });

  it('normalizes useId values but keeps the aria id relationship', () => {
    const catalog = resolveLandingCatalog('en', {audience: 'qa'});
    const unavailable = catalog.find((candidate) => candidate.availability !== 'available');
    if (!unavailable) {
      throw new Error('Expected an unavailable catalog card fixture.');
    }

    const raw = renderToStaticMarkup(
      createElement(LandingGridCard, {...fixedProps(), card: unavailable, state: 'normal'})
    );

    expect(raw).toMatch(/_R_[0-9a-z]*_/u);
    expect(normalizeMarkup(raw)).not.toMatch(/_R_[0-9a-z]+_/u);

    const {document} = new JSDOM(raw, {url: 'https://example.test/en'}).window;
    const trigger = document.querySelector('[data-slot="primaryTrigger"]');
    const labelledBy = trigger?.getAttribute('aria-labelledby');
    const describedBy = trigger?.getAttribute('aria-describedby');

    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(labelledBy as string)?.textContent).toBe(unavailable.title);
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)?.textContent).toBe(getDefaultCardCopy().comingSoon);
  });

  // 고장 주입 — 마크업 한 장만 달라져도 그 그룹의 지문이 반드시 달라진다.
  // 지문 전체를 **두 번** 만드는 검사라 초 단위로 걸린다 — vitest 의 기본 제한 5,000ms 는 이
  // 일에 맞춰 정해진 값이 아니다. 실측(2026-09-16): F1 3,072ms · F2 **6,281ms** · F3 785ms 이고
  // F2 는 파일 셋만 나란히 돌려도 기본 제한을 넘는다. 즉 이 붉음은 조용한 기계에서만 초록이던
  // 잠복이었고, 단위 9 가 파일 하나를 더하면서 드러났다. 단언은 그대로 두고 **제한만** 실제
  // 소요에 맞춘다 — 매달린 검사는 여전히 여기서 걸린다.
  it('changes when a single rendered markup is perturbed', () => {
    const faultKey = 'qmbti/media=false/rm=false/mobile/expanded/tap/OPEN';
    let faultApplied = 0;
    const perturbed: RenderFn = (key, props) => {
      const html = renderCard(key, props);
      if (key !== faultKey) {
        return html;
      }
      faultApplied += 1;
      return `${html}<!-- injected fault -->`;
    };

    const {report: faulty} = buildFingerprint(perturbed);

    // **주입이 실제로 닿았는지 먼저 묻는다.** 키 형식이 바뀌면 주입은 조용히 무위가 되고,
    // 그때 이 검사는 「지문이 바뀐다」가 아니라 아무것도 재지 않는다(L20). 2026-09-16 에
    // transient 모드 축이 사라지며 실제로 그렇게 됐다.
    expect(faultApplied, `주입 키 ${faultKey} 가 조합 공간에 없다 — 이 검사는 무위다`).toBe(1);

    expect(faulty.digest).not.toBe(report.digest);
    expect(faulty.groups.mobile.digest).not.toBe(report.groups.mobile.digest);
    expect(faulty.groups['desktop-tablet'].digest).toBe(report.groups['desktop-tablet'].digest);
  }, 30_000);
});
