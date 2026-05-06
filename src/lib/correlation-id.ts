let fallbackCorrelationCounter = 0;

function resolveRandomUuid(): string | null {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  if (typeof globalThis.crypto?.getRandomValues !== 'function') {
    return null;
  }

  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createOpaqueId(): string | null {
  return resolveRandomUuid();
}

export function createCorrelationId(prefix: string): string {
  const randomId = resolveRandomUuid();
  if (randomId) {
    return `${prefix}-${randomId}`;
  }

  fallbackCorrelationCounter += 1;
  return `${prefix}-fallback-${fallbackCorrelationCounter}`;
}

export function resetCorrelationIdCounterForTests(): void {
  fallbackCorrelationCounter = 0;
}
