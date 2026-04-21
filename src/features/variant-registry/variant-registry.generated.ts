/**
 * @generated 이 파일은 Google Sheets Sync 스크립트가 자동 생성한다.
 * 직접 편집하지 않는다. 편집이 필요하면 Sheets 원본을 수정하고 sync를 재실행한다.
 *
 * @see scripts/sync/sync-variant-registry.mjs (예정)
 * @see docs/req-test-plan.md ADR-D
 */
import {buildVariantRegistry} from '@/features/variant-registry/builder';
import {getVariantRegistrySourceFixture} from '@/features/variant-registry/source-fixture';

export const variantRegistryGenerated = buildVariantRegistry(getVariantRegistrySourceFixture());
