import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INBOX = path.join(repoRoot, 'photos');
const OUT = path.join(repoRoot, 'frontend', 'public', 'product-photos');
const MANIFEST = path.join(OUT, 'manifest.json');

const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

const EDGE = 1200;
const QUALITY = 82;

const CATEGORY_W = 1200;
const CATEGORY_H = 900;

const STORE_W = 1600;
const STORE_H = 500;

const STORE_FACE = {
  terra: 'hand-thrown-tea-set',
  kiln: 'salt-white-espresso-cups',
  fern: 'fine-silver-stacking-rings',
  oak: 'walnut-serving-board',
  indigo: 'handloom-cotton-table-runner',
  pigment: 'letterpress-greeting-card-set',
};

const STORE_CROP = {
  fern: sharp.strategy.attention,
};

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
  'block-print-cotton-dress': 'printed cotton dress',
  'hand-block-printed-kaftan': 'printed kaftan',
  'embroidered-cotton-blouse': 'embroidered blouse',
  'waffle-cotton-bathrobe': 'waffle cotton robe',
  'indigo-dyed-linen-shirt': 'blue linen shirt',
  'handloom-cotton-kurta': 'white cotton kurta',
  'embroidered-cotton-waistcoat': 'embroidered waistcoat',
  'natural-linen-smock-dress': 'linen smock dress',
  'khadi-cotton-trousers': 'wide leg linen trousers',
  'stoneware-taper-candle-holder': 'ceramic candle holder',
  'oak-box-wall-shelf': 'wooden wall shelf',
  'whitewashed-oak-picture-frame': 'wooden picture frame',
  'terracotta-diya-lamp-set': 'terracotta diya lamps',
  'macrame-cotton-wall-hanging': 'macrame wall hanging',
  'stoneware-pour-over-coffee-dripper': 'ceramic coffee dripper',
  'matte-white-butter-dish': 'ceramic butter dish',
  'stoneware-pasta-bowls': 'stoneware bowls',
  'hand-pinched-salt-cellar': 'ceramic salt dish',
  'handmade-ceramic-soap-dish': 'ceramic soap dish',
  'sterling-silver-chain-bracelet': 'silver chain bracelet',
  'freshwater-pearl-drop-earrings': 'pearl drop earrings',
  'turquoise-silver-ring': 'turquoise ring',
  'square-crystal-stud-earrings': 'crystal stud earrings',
  'smoky-quartz-beaded-bracelet': 'beaded bracelet',
  'sterling-silver-curb-chain': 'silver curb chain',
  'coastal-village-painting': 'coastal painting on easel',
  'red-magnolia-watercolour-print': 'watercolor flowers painting',
  'abstract-acrylic-canvas': 'abstract painting canvas',
  'charcoal-portrait-study': 'charcoal portrait',
  'hand-pulled-screen-print': 'screen printing',
  'pressed-flower-wall-frame': 'pressed flowers frame',
  'hand-lettered-calligraphy-print': 'calligraphy on paper',
  'hand-carved-wooden-spoon-set': 'wooden spoons',
  'acacia-paddle-chopping-board': 'wooden cutting board',
  'wooden-serving-tray': 'wooden tray',
  'handmade-oak-bar-stool': 'wooden bar stool',
  'wooden-keepsake-box': 'wooden box',
  'olive-wood-salad-servers': 'wooden salad servers',
  'wooden-wall-clock': 'wooden wall clock',
  'leather-bound-travel-journal': 'leather journal',
  'wax-seal-stamp-kit': 'wax seal stamp',
  'watercolour-acorn-bookmark-set': 'handmade bookmark',
  'wooden-toy-train': 'wooden toy train',
  'hand-painted-wood-slice-coasters': 'painted wooden coasters',
  'soy-candle-in-clay-pot': 'candle in clay pot',
  'reusable-fabric-gift-wrap-set': 'fabric gift wrapping',
  'terracotta-water-jug': 'terracotta jug',
  'earthenware-cooking-pot': 'clay cooking pot',
  'coil-built-earthenware-vase': 'clay vase',
  'matte-black-bud-vase': 'black bud vase',
  'embossed-white-stoneware-pitcher': 'white ceramic pitcher',
  'raku-fired-vessel': 'raku pottery',
  'stoneware-utensil-crock': 'utensil holder ceramic',
  'blue-and-white-glazed-planter': 'blue and white planter',
  'black-canvas-crossbody-bag': 'black crossbody bag',
  'jute-market-bag': 'jute bag',
  'quilted-evening-clutch': 'quilted clutch bag',
  'cotton-canvas-drawstring-bag': 'cotton drawstring bag',
  'woven-straw-basket-bag': 'straw basket bag',
  'cotton-canvas-shoulder-bag': 'canvas shoulder bag',
  'indigo-canvas-backpack': 'canvas backpack',
  'hand-embroidered-floral-handbag': 'embroidered handbag',
  'amber-claw-hair-clip': 'claw hair clip',
  'sterling-silver-cufflinks': 'silver cufflinks',
  'brass-eagle-key-clip': 'brass keychain',
  'silver-bangle-trio': 'silver bangles',
  'geometric-print-silk-scarf': 'patterned silk scarf',
  'shibori-cotton-bandana': 'shibori fabric',
  'woven-stripe-leather-belt': 'woven belt',
  'satin-scrunchie-set': 'satin scrunchies',
};

const { PRODUCTS, artSlug } = await import('../backend/seed/data.js');
const slugs = new Set(PRODUCTS.map((p) => artSlug(p.name)));

const fingerprint = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .sort()
    .join(' ');

const lookup = new Map();
for (const product of PRODUCTS) {
  const slug = artSlug(product.name);
  lookup.set(fingerprint(slug), slug);
  lookup.set(fingerprint(product.name), slug);
  const term = SEARCH_TERMS[slug];
  if (term) lookup.set(fingerprint(term), slug);
}

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
const stores = {};
const warnings = [];

const sourceFor = new Map();

const processed = [];

for (const file of files) {
  const ext = path.extname(file).toLowerCase();
  let base = path.basename(file, ext);

  const isSecondView = /-2$/.test(base);
  if (isSecondView) base = base.replace(/-2$/, '');

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

  const shortEdge = Math.min(meta.width || 0, meta.height || 0);

  let pipeline = sharp(source)
    .rotate()
    .resize(EDGE, EDGE, { fit: 'cover', position: 'centre', withoutEnlargement: false });

  if (shortEdge < EDGE) pipeline = pipeline.sharpen({ sigma: 0.7 });

  const info = await pipeline.webp({ quality: QUALITY, effort: 6 }).toFile(path.join(OUT, target));
  /* eslint-enable no-await-in-loop */

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

const { CATEGORY_SEED } = await import('../backend/config/categories.js');

for (const category of CATEGORY_SEED) {
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

const { STORES } = await import('../backend/seed/data.js');

for (const store of STORES) {
  const explicit = sourceFor.get(`store-${store.key}`);
  const face = STORE_FACE[store.key];
  const fallback = PRODUCTS.filter((product) => product.store === store.key)
    .map((product) => artSlug(product.name))
    .find((slug) => sourceFor.has(slug));

  const source = explicit || (face && sourceFor.get(face)) || (fallback && sourceFor.get(fallback));
  if (!source) continue;

  const target = `store-${store.key}.webp`;
  /* eslint-disable no-await-in-loop */
  await sharp(source)
    .rotate()
    .resize(STORE_W, STORE_H, { fit: 'cover', position: STORE_CROP[store.key] ?? 'centre' })
    .webp({ quality: QUALITY, effort: 5 })
    .toFile(path.join(OUT, target));
  /* eslint-enable no-await-in-loop */

  stores[store.key] = `/product-photos/${target}`;
}

const keep = new Set([
  'manifest.json',
  ...Object.values(products).flatMap((entry) =>
    Object.values(entry).map((url) => path.basename(url))
  ),
  ...Object.values(categories).map((url) => path.basename(url)),
  ...Object.values(stores).map((url) => path.basename(url)),
]);
for (const existing of fs.readdirSync(OUT)) {
  if (!keep.has(existing)) {
    fs.unlinkSync(path.join(OUT, existing));
    warnings.push(`  removed stale ${existing}`);
  }
}

fs.writeFileSync(MANIFEST, `${JSON.stringify({ products, categories, stores }, null, 2)}\n`);

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
  `${Object.keys(categories).length} of ${CATEGORY_SEED.length} category tiles cropped to ${CATEGORY_W}x${CATEGORY_H}.`
);
console.log(
  `${Object.keys(stores).length} of ${STORES.length} shop banners cropped to ${STORE_W}x${STORE_H}.\n`
);

if (warnings.length) {
  console.log('Warnings:');
  warnings.forEach((w) => console.log(w));
  console.log('');
}

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
