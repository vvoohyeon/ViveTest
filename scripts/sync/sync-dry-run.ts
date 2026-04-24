import { config } from 'dotenv';

import {questionSourceFixture} from '@/features/test/fixtures/questions';
import {
  buildVariantRegistry,
  getVariantRegistrySourceFixture
} from '@/features/variant-registry';
import {serializeRegistryToFile} from '@/features/variant-registry/registry-serializer';

config({ path: '.env.local', quiet: true });

function main(): void {
  const registry = buildVariantRegistry(getVariantRegistrySourceFixture(), questionSourceFixture);

  process.stdout.write(serializeRegistryToFile(registry));
}

main();
