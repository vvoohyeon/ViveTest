import {writeFile} from 'node:fs/promises';
import path from 'node:path';

import {questionSourceFixture} from '@/features/test/fixtures/questions';
import {
  buildVariantRegistry,
  getVariantRegistrySourceFixture
} from '@/features/variant-registry';
import {serializeRegistryToFile} from '@/features/variant-registry/registry-serializer';

const GENERATED_REGISTRY_PATH = path.join(
  process.cwd(),
  'src/features/variant-registry/variant-registry.generated.ts'
);

async function main() {
  const registry = buildVariantRegistry(getVariantRegistrySourceFixture(), questionSourceFixture);
  await writeFile(GENERATED_REGISTRY_PATH, serializeRegistryToFile(registry), 'utf8');
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
