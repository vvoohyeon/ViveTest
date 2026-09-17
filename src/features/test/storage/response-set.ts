import type {VariantId} from '@/features/test/domain';
import {testVariantKey} from '@/features/test/storage/test-storage-keys';
import {CANONICAL_INDEX_KEY_PATTERN} from '@/features/test/canonical-key';
import {readLocal, removeLocal, writeLocal} from '@/lib/safe-storage';

export type ResponseSet = Record<string, string>;

function isResponseSetPayload(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function filterResponseSet(value: Record<string, unknown>): ResponseSet | null {
  const responses: ResponseSet = {};

  for (const [key, answer] of Object.entries(value)) {
    if (!CANONICAL_INDEX_KEY_PATTERN.test(key)) {
      continue;
    }

    if (typeof answer !== 'string' || answer.length === 0) {
      continue;
    }

    responses[key] = answer;
  }

  return Object.keys(responses).length > 0 ? responses : null;
}

export function writeResponseSet(
  variantId: string,
  responses: ResponseSet
): void {
  // 종전에는 전역 `localStorage` 를 직접 불렀다 — 접근 자체가 던지는 브라우저에서 이 한 줄이
  // 회차 시작을 통째로 막았다.
  writeLocal(testVariantKey.responseSet(variantId as VariantId), JSON.stringify(responses));
}

export function readResponseSet(variantId: string): ResponseSet | null {
  const key = testVariantKey.responseSet(variantId as VariantId);
  const raw = readLocal(key);
  if (!raw) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    removeLocal(key);
    return null;
  }

  if (!isResponseSetPayload(parsed)) {
    removeLocal(key);
    return null;
  }

  return filterResponseSet(parsed);
}
