import type {VariantRegistry} from '@/features/variant-registry/types';

const GENERATED_REGISTRY_HEADER = `/**
 * @generated 이 파일은 Google Sheets Sync 스크립트가 자동 생성한다.
 * 직접 편집하지 않는다. 편집이 필요하면 Sheets 원본을 수정하고 sync를 재실행한다.
 *
 * @see scripts/sync/sync-variant-registry.mjs (예정)
 * @see docs/req-test-plan.md ADR-D
 */`;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function sortObjectKeys(_key: string, value: unknown): unknown {
  if (!isPlainRecord(value)) {
    return value;
  }

  return Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((accumulator, key) => {
      accumulator[key] = value[key];
      return accumulator;
    }, {});
}

export function serializeRegistryToFile(registry: VariantRegistry): string {
  const serializedRegistry = JSON.stringify(registry, sortObjectKeys, 2);

  return `${GENERATED_REGISTRY_HEADER}
import type {VariantRegistry} from './types';

export const variantRegistryGenerated: VariantRegistry = ${serializedRegistry} as const;
`;
}
