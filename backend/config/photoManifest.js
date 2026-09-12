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
    return parsed.products ? parsed : { products: parsed, categories: {}, stores: {} };
  } catch {
    return { products: {}, categories: {}, stores: {} };
  }
})();

export const productPhoto = (slug) => manifest.products?.[slug];

export const categoryPhoto = (slug) => manifest.categories?.[slug];

export const storePhoto = (key) => manifest.stores?.[key];

export const photoCounts = () => ({
  products: Object.keys(manifest.products || {}).length,
  categories: Object.keys(manifest.categories || {}).length,
  stores: Object.keys(manifest.stores || {}).length,
});

export default manifest;
