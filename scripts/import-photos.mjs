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
 * them a few at a time. Every run rewrites photos/NEEDED.md with what is left.
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

/**
 * What to type into Unsplash or Pexels for each piece, so the checklist is
 * usable rather than just a list of slugs. Anything missing an entry is
 * flagged at the end of a run, so this cannot drift from the catalogue.
 */
const SEARCH_TERMS = {
  'hand-painted-ceramic-vase': 'hand painted ceramic vase',
  'jaipur-block-print-tote': 'block print cotton tote bag',
  'terracotta-planter-set-of-three': 'terracotta plant pots',
  'speckled-clay-dinner-plates': 'speckled stoneware dinner plates',
  'hand-thrown-tea-set': 'handmade ceramic tea set',
  'atlantic-glaze-serving-bowl': 'ceramic serving bowl handmade',
  'salt-white-espresso-cups': 'white espresso cups ceramic',
  'ribbed-stoneware-mug': 'stoneware mug handmade pottery',
  'coastal-ceramic-wall-tiles': 'handmade ceramic tiles',
  'olive-oil-pourer': 'ceramic olive oil bottle',
  'silver-artisan-necklace': 'silver pendant necklace handmade',
  'hammered-silver-hoops': 'silver hoop earrings',
  'sea-glass-signet-ring': 'silver signet ring',
  'brass-feather-cuff': 'brass cuff bracelet',
  'fine-silver-stacking-rings': 'silver stacking rings',
  'handcrafted-wooden-lamp': 'wooden table lamp',
  'walnut-serving-board': 'walnut serving board',
  'carved-oak-bookends': 'wooden bookends',
  'turned-cherry-bowl': 'turned wooden bowl',
  'ash-wood-coffee-scoop': 'wooden coffee scoop',
  'handwoven-cotton-cushion-cover': 'handwoven cushion cover',
  'natural-indigo-scarf': 'indigo dyed scarf',
  'ajrakh-print-kimono-jacket': 'block print kimono jacket',
  'handloom-cotton-table-runner': 'woven table runner',
  'kutch-embroidered-pouch': 'embroidered pouch bag',
  'harbour-light-linocut-print': 'linocut print artwork',
  'original-gouache-coastal-study': 'gouache landscape painting',
  'botanical-ink-drawing-set': 'botanical line drawing',
  'letterpress-greeting-card-set': 'letterpress greeting cards',
  'hand-bound-sketchbook': 'hand bound sketchbook',
};

const { PRODUCTS, artSlug } = await import('../server/seed/data.js');
const slugs = new Set(PRODUCTS.map((p) => artSlug(p.name)));

if (!fs.existsSync(INBOX)) {
  fs.mkdirSync(INBOX, { recursive: true });
  console.log(`\nCreated ${path.relative(repoRoot, INBOX)}/ - drop your photos in there.\n`);
}

fs.mkdirSync(OUT, { recursive: true });

const files = fs
  .readdirSync(INBOX)
  .filter((f) => ALLOWED.has(path.extname(f).toLowerCase()));

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
      `  "${file}" is ${(size / 1024 / 1024).toFixed(1)}MB - resize to under 2MB so pages stay fast`
    );
  }

  const target = `${slug}${isSecondView ? '-2' : ''}${ext}`;
  fs.copyFileSync(path.join(INBOX, file), path.join(OUT, target));

  manifest[slug] ||= {};
  manifest[slug][isSecondView ? 'second' : 'main'] = `/product-photos/${target}`;
}

fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

/* ------------------------------------------------------------------ report */

const termFor = (slug, name) => SEARCH_TERMS[slug] || `${name} handmade`;

const missing = PRODUCTS.map((product) => ({
  slug: artSlug(product.name),
  name: product.name,
  category: product.category,
})).filter((entry) => !manifest[entry.slug]);

const skipped = warnings.filter((w) => w.includes('skipped')).length;

console.log(`\nImported ${files.length - skipped} file(s).`);
console.log(`${Object.keys(manifest).length} of ${slugs.size} products now have a real photograph.\n`);

if (warnings.length) {
  console.log('Warnings:');
  warnings.forEach((w) => console.log(w));
  console.log('');
}

/* The checklist is written to disk as well as printed, so it can be worked
   through over several sittings. */
const checklist = [
  '# Photos still needed',
  '',
  `${missing.length} of ${slugs.size} products are still using generated artwork.`,
  'Regenerate this file any time with `npm run seed:photos`.',
  '',
  'Save each file under **exactly** the filename in the middle column, into the',
  '`photos/` folder. Add `-2` before the extension for an optional second view,',
  'for example `photos/ribbed-stoneware-mug-2.jpg`. `.jpg`, `.png`, `.webp` and',
  '`.avif` all work.',
  '',
  'Sources that license free commercial use: [Unsplash](https://unsplash.com),',
  '[Pexels](https://pexels.com), [Pixabay](https://pixabay.com). Not Pinterest or',
  'Google Images - those are copyrighted photographs.',
  '',
  '| # | Product | Save as | Search for |',
  '| --- | --- | --- | --- |',
  ...missing.map(
    (entry, i) =>
      `| ${i + 1} | ${entry.name} | \`photos/${entry.slug}.jpg\` | ${termFor(entry.slug, entry.name)} |`
  ),
  '',
].join('\n');

fs.writeFileSync(path.join(INBOX, 'NEEDED.md'), checklist);

if (missing.length) {
  console.log(`Still using generated artwork (${missing.length}):\n`);
  missing.forEach((entry) => {
    console.log(
      `  photos/${entry.slug}.jpg`.padEnd(50) + `search: ${termFor(entry.slug, entry.name)}`
    );
  });
  console.log('\nFull checklist written to photos/NEEDED.md');
}

const untermed = missing.filter((entry) => !SEARCH_TERMS[entry.slug]);
if (untermed.length) {
  console.log(`\nNo suggested search term yet for: ${untermed.map((e) => e.slug).join(', ')}`);
}

console.log('\nNext: npm run seed   (or restart npm run dev:memory)\n');
