import type {VariantId} from '@/features/test/domain';
import {testVariantKey} from '@/features/test/storage/test-storage-keys';

export type ResponseSet = Record<string, string>;

const CANONICAL_INDEX_KEY_PATTERN = /^[1-9]\d*$/;

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

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
  localStorage.setItem(
    testVariantKey.responseSet(variantId as VariantId),
    JSON.stringify(responses)
  );
}

export function readResponseSet(variantId: string): ResponseSet | null {
  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }

  const key = testVariantKey.responseSet(variantId as VariantId);
  const raw = storage.getItem(key);
  if (!raw) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    storage.removeItem(key);
    return null;
  }

  if (!isResponseSetPayload(parsed)) {
    storage.removeItem(key);
    return null;
  }

  return filterResponseSet(parsed);
}
