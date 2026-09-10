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
 * Files can be named after the product slug OR after the search term printed
 * by a previous run - whichever is easier - and matching ignores case,
 * punctuation and word order.
 *
 * Every image is normalised to an identical 1200x1200 WebP: centre-cropped to
 * a square, because every product image slot in the UI is square, so the
 * browser never has to crop anything away and no product looks stretched or
 * off-centre next to another.
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
import sharp from 'sharp';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INBOX = path.join(repoRoot, 'photos');
const OUT = path.join(repoRoot, 'frontend', 'public', 'product-photos');
const MANIFEST = path.join(OUT, 'manifest.json');

const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

/* Square, because every product image slot in the UI is square. 1200px is
   twice the largest slot, so it stays sharp on a retina screen. */
const EDGE = 1200;
const QUALITY = 82;

/* Category tiles are 4:3 in the UI, so they get their own crop rather than a
   squeezed square. */
const CATEGORY_W = 1200;
const CATEGORY_H = 900;

/**
 * The piece that best represents each craft on a category tile. Hand-picked
 * for how the photograph reads at tile size; any category without an entry
 * falls back to the first of its products that has a photo.
 */
const CATEGORY_FACE = {
  'home-decor': 'handwoven-cotton-cushion-cover',
  pottery: 'hand-painted-ceramic-vase',
  jewelry: 'silver-artisan-necklace',
  clothing: 'ajrakh-print-kimono-jacket',
  art: 'harbour-light-linocut-print',
  woodwork: 'walnut-serving-board',
  'handmade-gifts': 'hand-bound-sketchbook',
  ceramics: 'ribbed-stoneware-mug',
  bags: 'jaipur-block-print-tote',
  accessories: 'natural-indigo-scarf',
};

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

const { PRODUCTS, artSlug } = await import('../backend/seed/data.js');
const slugs = new Set(PRODUCTS.map((p) => artSlug(p.name)));

/** Words only, sorted - so "silver hoop earrings" matches "hoop-earrings-silver". */
const fingerprint = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .sort()
    .join(' ');

/* A filename may be the slug, the product name, or the search term we
   suggested. All three resolve to the same product. */
const lookup = new Map();
for (const product of PRODUCTS) {
  const slug = artSlug(product.name);
  lookup.set(fingerprint(slug), slug);
  lookup.set(fingerprint(product.name), slug);
  const term = SEARCH_TERMS[slug];
  if (term) lookup.set(fingerprint(term), slug);
}

/** Falls back to the best word-overlap match, so a near-miss still lands. */
function resolveSlug(base) {
  const exact = lookup.get(fingerprint(base));
  if (exact) return exact;

  const words = new Set(fingerprint(base).split(' '));
  let best = null;
  let bestScore = 0;
  for (const [key, slug] of lookup) {
    const keyWords = key.split(' ');
    const shared = keyWords.filter((w) => words.has(w)).length;
    const score = shared / Math.max(keyWords.length, words.size);
    if (score > bestScore) {
      bestScore = score;
      best = slug;
    }
  }
  // Two thirds of the words in common is a confident match; below that, refuse.
  return bestScore >= 0.6 ? best : null;
}

if (!fs.existsSync(INBOX)) {
  fs.mkdirSync(INBOX, { recursive: true });
  console.log(`\nCreated ${path.relative(repoRoot, INBOX)}/ - drop your photos in there.\n`);
}

fs.mkdirSync(OUT, { recursive: true });

const files = fs
  .readdirSync(INBOX)
  .filter((f) => ALLOWED.has(path.extname(f).toLowerCase()));

const products = {};
const categories = {};
const warnings = [];

/** slug -> the original file it came from, for deriving the category crop. */
const sourceFor = new Map();

const processed = [];

for (const file of files) {
  const ext = path.extname(file).toLowerCase();
  let base = path.basename(file, ext);

  const isSecondView = /-2$/.test(base);
  if (isSecondView) base = base.replace(/-2$/, '');

  /* photos/category-pottery.jpg overrides the representative piece. */
  const slug = /^category-[a-z-]+$/.test(base.toLowerCase().replace(/\s+/g, '-'))
    ? base.toLowerCase().replace(/\s+/g, '-')
    : resolveSlug(base);
  if (!slug) {
    warnings.push(`  "${file}" matches no product - skipped`);
    continue;
  }

  const source = path.join(INBOX, file);
  const target = `${slug}${isSecondView ? '-2' : ''}.webp`;
  const sourceBytes = fs.statSync(source).size;

  /* eslint-disable no-await-in-loop */
  const meta = await sharp(source).metadata();

  /* Centre-crop to a square and resize to one exact size, so every card in the
     grid presents the subject at the same scale. `fit: cover` with
     `position: centre` is what the browser would do anyway - doing it here
     means we ship 1200x1200 instead of a 7MB original. */
  const info = await sharp(source)
    .rotate() // honour the EXIF orientation before cropping
    .resize(EDGE, EDGE, { fit: 'cover', position: 'centre', withoutEnlargement: false })
    .webp({ quality: QUALITY, effort: 5 })
    .toFile(path.join(OUT, target));
  /* eslint-enable no-await-in-loop */

  /* Upscaling past the source resolution looks soft on a retina screen, so
     say which files would benefit from a bigger download. */
  const shortEdge = Math.min(meta.width || 0, meta.height || 0);
  if (shortEdge < EDGE) {
    warnings.push(
      `  "${file}" is only ${shortEdge}px on its short edge - upscaled to ${EDGE}px, so it will look soft. Re-download a larger version if you can.`
    );
  }

  processed.push({
    file,
    slug,
    from: `${meta.width}x${meta.height}`,
    fromBytes: sourceBytes,
    toBytes: info.size,
    soft: shortEdge < EDGE,
  });

  if (!isSecondView) sourceFor.set(slug, source);
  if (slug.startsWith('category-')) continue;

  products[slug] ||= {};
  products[slug][isSecondView ? 'second' : 'main'] = `/product-photos/${target}`;
}

/* ------------------------------------------------------- category tiles --- */

const { CATEGORY_SEED } = await import('../backend/config/categories.js');

for (const category of CATEGORY_SEED) {
  /* An explicit photos/category-<slug>.jpg wins; otherwise use the chosen
     representative piece, or the first product in the category that has one. */
  const explicit = sourceFor.get(`category-${category.slug}`);
  const face = CATEGORY_FACE[category.slug];
  const fallback = PRODUCTS.filter((product) => product.category === category.slug)
    .map((product) => artSlug(product.name))
    .find((slug) => sourceFor.has(slug));

  const source =
    explicit || (face && sourceFor.get(face)) || (fallback && sourceFor.get(fallback));
  if (!source) continue;

  const target = `category-${category.slug}.webp`;
  /* eslint-disable no-await-in-loop */
  await sharp(source)
    .rotate()
    .resize(CATEGORY_W, CATEGORY_H, { fit: 'cover', position: 'centre' })
    .webp({ quality: QUALITY, effort: 5 })
    .toFile(path.join(OUT, target));
  /* eslint-enable no-await-in-loop */

  categories[category.slug] = `/product-photos/${target}`;
}

/* Nothing else should linger in the served folder - a stale file from an
   earlier run would be dead weight in the repo. */
const keep = new Set([
  'manifest.json',
  ...Object.values(products).flatMap((entry) =>
    Object.values(entry).map((url) => path.basename(url))
  ),
  ...Object.values(categories).map((url) => path.basename(url)),
]);
for (const existing of fs.readdirSync(OUT)) {
  if (!keep.has(existing)) {
    fs.unlinkSync(path.join(OUT, existing));
    warnings.push(`  removed stale ${existing}`);
  }
}

fs.writeFileSync(MANIFEST, `${JSON.stringify({ products, categories }, null, 2)}\n`);

/* ------------------------------------------------------------------ report */

const termFor = (slug, name) => SEARCH_TERMS[slug] || `${name} handmade`;

const missing = PRODUCTS.map((product) => ({
  slug: artSlug(product.name),
  name: product.name,
  category: product.category,
})).filter((entry) => !products[entry.slug]);

const skipped = warnings.filter((w) => w.includes('skipped')).length;

if (processed.length) {
  const totalFrom = processed.reduce((sum, r) => sum + r.fromBytes, 0);
  const totalTo = processed.reduce((sum, r) => sum + r.toBytes, 0);

  console.log(`\nNormalised ${processed.length} image(s) to ${EDGE}x${EDGE} WebP:\n`);
  processed
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .forEach((r) => {
      const from = `${(r.fromBytes / 1024).toFixed(0)}KB`;
      const to = `${(r.toBytes / 1024).toFixed(0)}KB`;
      console.log(`  ${r.slug.padEnd(34)} ${r.from.padStart(11)} ${from.padStart(8)}  ->  ${EDGE}x${EDGE} ${to.padStart(7)}`);
    });
  console.log(
    `\n  total ${(totalFrom / 1024 / 1024).toFixed(1)}MB -> ${(totalTo / 1024 / 1024).toFixed(1)}MB` +
      ` (${Math.round((1 - totalTo / totalFrom) * 100)}% smaller)`
  );
}

console.log(`\nImported ${files.length - skipped} file(s).`);
console.log(`${Object.keys(products).length} of ${slugs.size} products now have a real photograph.`);
console.log(
  `${Object.keys(categories).length} of ${CATEGORY_SEED.length} category tiles cropped to ${CATEGORY_W}x${CATEGORY_H}.\n`
);

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
