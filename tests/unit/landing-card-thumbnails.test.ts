import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';

import {describe, expect, it} from 'vitest';

import {createThumbnailFallbackDataUri} from '@/features/landing/grid/landing-grid-card';
import {resolveLandingCatalog} from '@/features/variant-registry';

const MEDIA_ROOT = path.join(process.cwd(), 'public', 'landing-card-media');
const REQUIRED_VIEW_BOX = '0 0 640 240';

// 개수를 적지 않는다 — 카탈로그가 목록의 정본이고, 하드코딩된 수는 조용히 낡는다(L18).
// `qa` 는 공개 카탈로그의 상위집합이므로 이것으로 훑으면 두 관객 모두를 덮는다.
const variants = resolveLandingCatalog('en', {audience: 'qa'}).map((card) => card.variant);
const thumbnailPath = (variant: string) => path.join(MEDIA_ROOT, variant, 'thumbnail.svg');
const digest = (value: string) => createHash('sha256').update(value).digest('hex');

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

  it('모든 자산이 16:6 네이티브다', () => {
    const wrong = variants.filter((variant) => {
      const matched = /viewBox="([^"]+)"/u.exec(readFileSync(thumbnailPath(variant), 'utf8'));
      return matched?.[1] !== REQUIRED_VIEW_BOX;
    });

    expect(wrong, `16:6 이 아닌 자산: ${wrong.join(', ')}`).toEqual([]);
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
