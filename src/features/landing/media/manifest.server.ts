import 'server-only';

import {access, readdir} from 'node:fs/promises';
import path from 'node:path';

const LANDING_CARD_MEDIA_ROOT = path.join(process.cwd(), 'public', 'landing-card-media');
const THUMBNAIL_FILE_NAME = 'thumbnail.svg';

export async function loadLandingCardMediaAssetVariants(): Promise<string[]> {
  try {
    const entries = await readdir(LANDING_CARD_MEDIA_ROOT, {withFileTypes: true});
    const assetBackedVariants = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          const thumbnailPath = path.join(LANDING_CARD_MEDIA_ROOT, entry.name, THUMBNAIL_FILE_NAME);

          try {
            await access(thumbnailPath);
            return entry.name;
          } catch {
            return null;
          }
        })
    );

    return assetBackedVariants.filter((variant): variant is string => variant !== null).sort();
  } catch {
    return [];
  }
}
