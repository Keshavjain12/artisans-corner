/**
 * Imports real product photographs, replacing the generated placeholder art.
 *
 *   1. Put image files in  photos/  at the repo root
 *   2. Name each one after the product slug, e.g.
 *        photos/hand-painted-ceramic-vase.jpg
 *        photos/hand-painted-ceramic-vase-2.jpg   (optional second view)
 *   3. npm run seed:photos
 *   4. npm run seed        (or restart npm run dev:memory)
 *
 * Anything without a photo keeps its generated illustration, so you can add
 * them a few at a time.
 *
 * Source images you are allowed to use: unsplash.com, pexels.com and
 * pixabay.com all license free commercial use. Do not scrape Pinterest or
 * Google Images - those are other people's copyrighted photographs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INBOX = path.join(repoRoot, 'photos');
const OUT = path.join(repoRoot, 'client', 'public', 'product-photos');
const MANIFEST = path.join(OUT, 'manifest.json');

const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
const MAX_BYTES = 2 * 1024 * 1024;

const { PRODUCTS, artSlug } = await import('../server/seed/data.js');
const slugs = new Set(PRODUCTS.map((p) => artSlug(p.name)));

if (!fs.existsSync(INBOX)) {
  fs.mkdirSync(INBOX, { recursive: true });
  console.log(`\nCreated ${path.relative(repoRoot, INBOX)}/ - drop your photos in there.\n`);
}

fs.mkdirSync(OUT, { recursive: true });

const files = fs.readdirSync(INBOX).filter((f) => ALLOWED.has(path.extname(f).toLowerCase()));
const manifest = {};
const warnings = [];

for (const file of files) {
  const ext = path.extname(file).toLowerCase();
  const base = path.basename(file, ext);
  const isSecondView = base.endsWith('-2');
  const slug = isSecondView ? base.slice(0, -2) : base;

  if (!slugs.has(slug)) {
    warnings.push(`  "${file}" does not match any product slug - skipped`);
    continue;
  }

  const size = fs.statSync(path.join(INBOX, file)).size;
  if (size > MAX_BYTES) {
    warnings.push(
      `  "${file}" is ${(size / 1024 / 1024).toFixed(1)}MB - resize it to under 2MB so pages stay fast`
    );
  }

  const target = `${slug}${isSecondView ? '-2' : ''}${ext}`;
  fs.copyFileSync(path.join(INBOX, file), path.join(OUT, target));

  manifest[slug] ||= {};
  manifest[slug][isSecondView ? 'second' : 'main'] = `/product-photos/${target}`;
}

fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

/* ------------------------------------------------------------------ report */
const withPhotos = Object.keys(manifest);
const missing = [...slugs].filter((s) => !manifest[s]);

console.log(`\nImported ${files.length - warnings.filter((w) => w.includes('skipped')).length} file(s).`);
console.log(`${withPhotos.length} of ${slugs.size} products now have a real photograph.\n`);

if (warnings.length) {
  console.log('Warnings:');
  warnings.forEach((w) => console.log(w));
  console.log('');
}

if (missing.length) {
  console.log('Still using generated artwork - name a file after any of these slugs:');
  missing.forEach((slug) => console.log(`  photos/${slug}.jpg`));
  console.log('');
}

console.log('Next: npm run seed   (or restart npm run dev:memory)\n');
