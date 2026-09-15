import {readFileSync} from 'node:fs';
import {join} from 'node:path';

import {describe, expect, it} from 'vitest';

import {locales} from '../../src/config/site';

/**
 * 12 locale 의 키 집합이 같은지 본다.
 *
 * 이 저장소에는 이 검사가 없었고, 그래서 한 locale 에만 키를 빠뜨리거나 오타를 내면 **그
 * locale 로 들어온 사용자에게만** 런타임에서 터진다 — 기본 게이트 넷 어디에도 걸리지 않고,
 * 리뷰는 12 개 파일의 차집합을 눈으로 세지 못한다. 목록을 손으로 적지 않고 `site.ts` 의
 * locale 정본과 파일에서 직접 읽는다.
 */
type MessageTree = {[key: string]: string | MessageTree};

function collectKeys(node: MessageTree, prefix = ''): string[] {
  return Object.entries(node).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? [path] : collectKeys(value, path);
  });
}

function readMessages(locale: string): MessageTree {
  return JSON.parse(readFileSync(join(process.cwd(), 'src/messages', `${locale}.json`), 'utf8')) as MessageTree;
}

describe('message key parity', () => {
  it('모든 locale 이 같은 키 집합을 갖는다', () => {
    const reference = collectKeys(readMessages('en')).sort();

    for (const locale of locales) {
      const keys = collectKeys(readMessages(locale)).sort();
      const missing = reference.filter((key) => !keys.includes(key));
      const extra = keys.filter((key) => !reference.includes(key));

      expect({locale, missing, extra}).toEqual({locale, missing: [], extra: []});
    }
  });

  it('빈 문자열 값을 두지 않는다', () => {
    for (const locale of locales) {
      const messages = readMessages(locale);
      const blanks = collectKeys(messages).filter((path) => {
        const value = path.split('.').reduce<string | MessageTree>((node, key) => (node as MessageTree)[key], messages);
        return typeof value === 'string' && value.trim().length === 0;
      });

      expect({locale, blanks}).toEqual({locale, blanks: []});
    }
  });
});
