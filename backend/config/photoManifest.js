/**
 * Reads the manifest that `npm run seed:photos` writes.
 *
 * One place resolves seed imagery, so the product catalogue and the category
 * tiles cannot disagree about whether a real photograph exists. When no
 * manifest is present - a fresh clone that has not imported any photos - every
 * lookup returns undefined and the callers fall back to generated artwork.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST = path.resolve(
  here,
  '..',
  '..',
  'frontend',
  'public',
  'product-photos',
  'manifest.json'
);

const manifest = (() => {
  try {
    const parsed = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    // Older manifests were a flat map of slug -> { main, second }.
    return parsed.products ? parsed : { products: parsed, categories: {} };
  } catch {
    return { products: {}, categories: {} };
  }
})();

/** `{ main, second? }` for a product slug, or undefined. */
export const productPhoto = (slug) => manifest.products?.[slug];

/** The 4:3 tile for a category slug, or undefined. */
export const categoryPhoto = (slug) => manifest.categories?.[slug];

export const photoCounts = () => ({
  products: Object.keys(manifest.products || {}).length,
  categories: Object.keys(manifest.categories || {}).length,
});

export default manifest;
