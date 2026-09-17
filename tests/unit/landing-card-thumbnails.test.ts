import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';

import {describe, expect, it} from 'vitest';

import {createThumbnailFallbackDataUri} from '@/features/landing/grid/landing-grid-card';
import {resolveLandingCatalog} from '@/features/variant-registry';

const MEDIA_ROOT = path.join(process.cwd(), 'public', 'landing-card-media');
const REQUIRED_VIEW_BOX = '0 40 640 160';

// 개수를 적지 않는다 — 카탈로그가 목록의 정본이고, 하드코딩된 수는 조용히 낡는다(L18).
// `qa` 는 공개 카탈로그의 상위집합이므로 이것으로 훑으면 두 관객 모두를 덮는다.
const variants = resolveLandingCatalog('en', {audience: 'qa'}).map((card) => card.variant);
const thumbnailPath = (variant: string) => path.join(MEDIA_ROOT, variant, 'thumbnail.svg');
const digest = (value: string) => createHash('sha256').update(value).digest('hex');

const [, VIEW_BOX_TOP, , VIEW_BOX_HEIGHT] = REQUIRED_VIEW_BOX.split(' ').map(Number);
const VIEW_BOX_BOTTOM = VIEW_BOX_TOP + VIEW_BOX_HEIGHT;

/**
 * 자산의 잉크가 차지하는 세로 범위.
 *
 * 자산은 `rect`·`circle`·`polyline`, 그리고 `M`·`H`·`C` **절대** 명령만 쓰는 `path` 로만 그려져
 * 있다(이 파일이 그것을 먼저 확인한다). `C` 는 제어점의 볼록 껍질 안에 있으므로 제어점의 y 를 그대로
 * 쓰면 **바깥쪽으로 안전한** 경계가 나온다 — 통과한 것은 확실히 안에 있다.
 *
 * 브라우저 `getBBox()` 로 열 장을 재서 같은 값이 나오는 것을 확인하고 옮겼다(L08 — 도구를 먼저
 * 답 아는 사례로 반증한다).
 */
function measureInkBand(svg: string): {top: number; bottom: number} {
  const body = svg.replace(/^[\s\S]*?<svg[^>]*>/u, '');
  if (/\sd="[^"]*[a-z][^"]*"/u.test(body.replace(/d="/gu, 'd="'))) {
    // 소문자 = 상대 명령. 이 측정기는 절대 명령만 읽으므로 그때는 조용히 틀리는 대신 멈춘다.
    const relative = /\sd="([^"]*[chlmqstvz][^"]*)"/u.exec(body);
    if (relative) {
      throw new Error(`상대 경로 명령이 들어왔다 — 이 측정기는 절대 명령만 읽는다: ${relative[1]}`);
    }
  }

  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  const note = (value: number) => {
    top = Math.min(top, value);
    bottom = Math.max(bottom, value);
  };

  for (const [element] of body.matchAll(/<(?:rect|circle|path|polyline)\b[^>]*>/gu)) {
    const attribute = (name: string) => {
      const matched = new RegExp(`\\s${name}="([^"]*)"`, 'u').exec(element);
      return matched ? matched[1] : null;
    };
    const numeric = (name: string) => Number.parseFloat(attribute(name) ?? 'NaN');
    const stroke = attribute('stroke');
    const pad = stroke && stroke !== 'none' ? (Number.parseFloat(attribute('stroke-width') ?? '0') || 0) / 2 : 0;
    const ys: number[] = [];

    if (element.startsWith('<rect')) {
      ys.push(numeric('y'), numeric('y') + numeric('height'));
    } else if (element.startsWith('<circle')) {
      ys.push(numeric('cy') - numeric('r'), numeric('cy') + numeric('r'));
    } else if (element.startsWith('<polyline')) {
      const points = (attribute('points') ?? '').trim().split(/[\s,]+/u).map(Number);
      for (let index = 1; index < points.length; index += 2) {
        ys.push(points[index]);
      }
    } else {
      // `M x y`, `C x y, x y, x y` 는 좌표쌍이고 `H x` 는 x 하나다 — 그래서 쌍 세기를 명령마다 되돌린다.
      for (const [, command, argumentText] of (attribute('d') ?? '').matchAll(/([MCHVLmchvl])([^MCHVLmchvl]*)/gu)) {
        const numbers = argumentText.trim().split(/[\s,]+/u).filter(Boolean).map(Number);
        if (command === 'H') {
          continue;
        }
        if (command === 'V') {
          ys.push(...numbers);
          continue;
        }
        for (let index = 1; index < numbers.length; index += 2) {
          ys.push(numbers[index]);
        }
      }
    }

    for (const y of ys) {
      if (Number.isFinite(y)) {
        note(y - pad);
        note(y + pad);
      }
    }
  }

  return {top, bottom};
}

describe('랜딩 카드 썸네일 자산 (D-08)', () => {
  it('카탈로그를 훑을 목록이 비어 있지 않다', () => {
    // 전제: 목록이 비면 아래 검사들이 0 회 돌고 조용히 초록이 된다.
    expect(variants.length).toBeGreaterThan(1);
  });

  it('모든 variant 가 자기 그림을 갖는다 — 폴백으로 떨어지는 카드가 없다', () => {
    const missing = variants.filter((variant) => !existsSync(thumbnailPath(variant)));

    expect(missing, `자산 없는 variant: ${missing.join(', ')}`).toEqual([]);
  });

  it('열 장이 서로 다른 그림이다 — 한 장을 여러 카드가 나눠 쓰지 않는다', () => {
    // D-08 의 본체. 경로가 아니라 **내용**으로 센다 — 경로는 언제나 서로 다르므로
    // 경로 비교는 같은 그림을 복사해 넣어도 통과한다.
    const byDigest = new Map<string, string[]>();
    for (const variant of variants) {
      const key = digest(readFileSync(thumbnailPath(variant), 'utf8'));
      byDigest.set(key, [...(byDigest.get(key) ?? []), variant]);
    }
    const shared = [...byDigest.values()].filter((group) => group.length > 1);

    expect(shared, `같은 그림을 쓰는 카드: ${shared.map((g) => g.join('=')).join(' · ')}`).toEqual([]);
  });

  it('모든 자산이 16:4 네이티브다', () => {
    const wrong = variants.filter((variant) => {
      const matched = /viewBox="([^"]+)"/u.exec(readFileSync(thumbnailPath(variant), 'utf8'));
      return matched?.[1] !== REQUIRED_VIEW_BOX;
    });

    expect(wrong, `16:4 이 아닌 자산: ${wrong.join(', ')}`).toEqual([]);
  });

  // viewBox 문자열만 물으면 「네이티브」가 **선언**이 된다 — 그림이 밖에 나가 있어도 통과한다.
  // 실제로 16:6 → 16:4 로 좁힐 때 열 장 중 `release-gate` 한 장의 게이트 기둥이 위아래로 6px 씩
  // 빠져나가 있었고, 문자열 검사는 그것을 보지 못했다. 그래서 잉크의 세로 범위를 직접 잰다.
  it('모든 자산의 잉크가 자기 viewBox 안에 있다 — 잘려 나가는 그림이 없다', () => {
    const outside = variants
      .map((variant) => ({variant, band: measureInkBand(readFileSync(thumbnailPath(variant), 'utf8'))}))
      .filter(({band}) => band.top < VIEW_BOX_TOP - 0.01 || band.bottom > VIEW_BOX_BOTTOM + 0.01)
      .map(({variant, band}) => `${variant}(${band.top}..${band.bottom})`);

    expect(outside, `viewBox ${VIEW_BOX_TOP}..${VIEW_BOX_BOTTOM} 밖으로 나간 자산: ${outside.join(', ')}`).toEqual(
      []
    );
  });

  it('폴백은 어느 자산과도 같은 그림이 아니다', () => {
    // 종전 결함이 정확히 이것이었다 — 폴백이 `qmbti` 와 같은 그림이라 카탈로그가
    // 한 장을 여덟 번 보여 주고 있었다.
    const fallbackSvg = decodeURIComponent(createThumbnailFallbackDataUri().replace(/^data:image\/svg\+xml,/u, ''));
    const assetDigests = new Set(variants.map((variant) => digest(readFileSync(thumbnailPath(variant), 'utf8').trim())));

    expect(assetDigests.has(digest(fallbackSvg.trim()))).toBe(false);
    expect(fallbackSvg).toContain(`viewBox="${REQUIRED_VIEW_BOX}"`);
  });

  it('sage 계열 한 가족만 쓴다 — 두 번째 색상이 없다', () => {
    // thumb-proposal 규칙 ⑶. 카드를 가르는 것은 색이 아니라 구성이다.
    const allowed = new Set(['#fbfaf7', '#f4f1ea', '#e8f0ec', '#c9dbd1', '#a6c5b5', '#5c8e78', '#ada59d']);
    const offenders: string[] = [];

    for (const variant of variants) {
      for (const hex of readFileSync(thumbnailPath(variant), 'utf8').match(/#[0-9a-fA-F]{6}/gu) ?? []) {
        if (!allowed.has(hex.toLowerCase())) {
          offenders.push(`${variant}:${hex}`);
        }
      }
    }

    expect(offenders, `sage 가족 밖의 색: ${offenders.join(', ')}`).toEqual([]);
  });
});
