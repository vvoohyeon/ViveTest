import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vitest';

import {NormalCardFace} from '../../src/features/landing/grid/landing-grid-card-normal-face';
import {resolveLandingCatalog} from '../../src/features/variant-registry';

/**
 * 첫 카드의 썸네일만 preload 스캐너에 잡힌다.
 *
 * 이 주장을 지문(F2) 에 맡기지 않는 이유: 지문은 `sequence: 0` 을 **고정**해서 렌더하므로
 * 「0 만 받고 나머지는 안 받는다」를 구분하지 못한다. 디지스트가 바뀌었다는 사실은 무언가
 * 달라졌다고만 말하고 무엇이 왜 달라졌는지는 말하지 않는다.
 */
function renderFace(isLcpCandidate: boolean | undefined) {
  const card = resolveLandingCatalog('en', {audience: 'qa'})[0];
  return renderToStaticMarkup(
    React.createElement(NormalCardFace, {
      card,
      hasAssetMedia: true,
      isMobileViewport: false,
      exposePublicSlots: true,
      presentation: 'collapsed',
      isLcpCandidate
    } as never)
  );
}

const IMAGE_PRELOAD = /<link[^>]*rel="preload"[^>]*as="image"[^>]*>/u;

describe('랜딩 첫 카드 썸네일의 preload', () => {
  it('LCP 후보일 때만 이미지 preload 를 낸다', () => {
    expect(IMAGE_PRELOAD.test(renderFace(true)), 'sequence 0').toBe(true);
    expect(IMAGE_PRELOAD.test(renderFace(false)), '뒤 카드').toBe(false);
    expect(IMAGE_PRELOAD.test(renderFace(undefined)), '유령 셸처럼 순번이 없는 자리').toBe(false);
  });

  it('preload 대상은 그 카드가 실제로 그리는 썸네일이다', () => {
    const card = resolveLandingCatalog('en', {audience: 'qa'})[0];
    const preload = renderFace(true).match(IMAGE_PRELOAD)?.[0] ?? '';
    expect(preload).toContain(`/landing-card-media/${card.variant}/`);
  });
});
