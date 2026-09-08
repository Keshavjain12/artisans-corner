/**
 * Generates the placeholder artwork the seed catalogue uses.
 *
 *   npm run seed:art
 *
 * The demo previously pulled random photographs from an external service. They
 * needed the network, throttled under the ~40 requests a page makes (leaving
 * blank cards), and had nothing to do with the products - a tote bag
 * illustrated by a photograph of a bridge. These are small deterministic SVGs
 * in the marketplace palette, with a motif per craft: they load instantly,
 * work offline, and read as considered placeholders rather than broken photos.
 *
 * Output lands in client/public/seed-art, so the files are served at
 * /seed-art/<name>.svg by both the Vite dev server and the production build.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(repoRoot, 'client', 'public', 'seed-art');

/* Warm grounds drawn from the Tailwind theme, paired with an ink for the motif. */
const PALETTES = [
  { from: '#F6EBE3', to: '#E7CFC1', ink: '#8F5739', accent: '#A96F4C' },
  { from: '#F1EDE6', to: '#DFD5C6', ink: '#74452E', accent: '#C28C6E' },
  { from: '#EDF0EC', to: '#D6DFD3', ink: '#4B6248', accent: '#5F7A5B' },
  { from: '#F7EFE8', to: '#E3D3C4', ink: '#5C3726', accent: '#D6AF99' },
  { from: '#EFE9E4', to: '#D9CDBF', ink: '#4A2D20', accent: '#A96F4C' },
  { from: '#F4EEE9', to: '#E0D2C8', ink: '#3A4C38', accent: '#8F5739' },
];

/**
 * SVG is XML, so a raw & in a name ("Kiln & Coast") makes the whole file fail
 * to parse and the browser shows a broken image rather than the artwork.
 */
const esc = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/** Stable hash so the same name always gets the same look. */
const hash = (value) => {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
};

/* Each motif draws inside a 1200x900 box, centred around (600, 450). */
const MOTIFS = {
  pottery: (c) => `
    <path d="M470 330 q-30 130 40 250 q90 90 180 0 q70 -120 40 -250 q-130 40 -260 0 z"
      fill="${c.ink}" opacity="0.82"/>
    <path d="M470 330 q130 -70 260 0" fill="none" stroke="${c.ink}" stroke-width="18" stroke-linecap="round"/>
    <path d="M520 430 q80 30 160 0" fill="none" stroke="${c.from}" stroke-width="10" opacity="0.55"/>
    <path d="M515 505 q85 32 170 0" fill="none" stroke="${c.from}" stroke-width="10" opacity="0.4"/>`,
  ceramics: (c) => `
    <path d="M430 470 q170 190 340 0 z" fill="${c.ink}" opacity="0.82"/>
    <ellipse cx="600" cy="470" rx="170" ry="40" fill="${c.accent}" opacity="0.9"/>
    <ellipse cx="600" cy="470" rx="120" ry="27" fill="${c.from}" opacity="0.75"/>
    <path d="M600 610 v55" stroke="${c.ink}" stroke-width="16" stroke-linecap="round"/>
    <path d="M520 665 h160" stroke="${c.ink}" stroke-width="16" stroke-linecap="round"/>`,
  jewelry: (c) => `
    <circle cx="600" cy="470" r="150" fill="none" stroke="${c.ink}" stroke-width="22" opacity="0.85"/>
    <circle cx="600" cy="470" r="96" fill="none" stroke="${c.accent}" stroke-width="12" opacity="0.8"/>
    <path d="M600 250 l38 62 l-38 62 l-38 -62 z" fill="${c.ink}" opacity="0.9"/>
    <circle cx="600" cy="470" r="30" fill="${c.accent}" opacity="0.55"/>`,
  clothing: (c) => `
    <g opacity="0.85">
      ${Array.from({ length: 7 }, (_, i) => {
        const y = 250 + i * 58;
        return `<path d="M400 ${y} q100 -34 200 0 q100 34 200 0" fill="none" stroke="${
          i % 2 ? c.accent : c.ink
        }" stroke-width="${i % 2 ? 10 : 16}" stroke-linecap="round"/>`;
      }).join('')}
    </g>`,
  bags: (c) => `
    <rect x="440" y="380" width="320" height="290" rx="26" fill="${c.ink}" opacity="0.82"/>
    <path d="M520 380 v-40 q80 -70 160 0 v40" fill="none" stroke="${c.ink}" stroke-width="20" stroke-linecap="round"/>
    <path d="M500 470 h200" stroke="${c.from}" stroke-width="14" opacity="0.5" stroke-linecap="round"/>
    <path d="M500 530 h140" stroke="${c.from}" stroke-width="14" opacity="0.35" stroke-linecap="round"/>`,
  accessories: (c) => `
    <path d="M360 400 q120 -90 240 0 q120 90 240 0" fill="none" stroke="${c.ink}" stroke-width="30" stroke-linecap="round" opacity="0.85"/>
    <path d="M360 500 q120 -90 240 0 q120 90 240 0" fill="none" stroke="${c.accent}" stroke-width="22" stroke-linecap="round" opacity="0.8"/>
    <path d="M360 600 q120 -90 240 0 q120 90 240 0" fill="none" stroke="${c.ink}" stroke-width="14" stroke-linecap="round" opacity="0.45"/>`,
  art: (c) => `
    <path d="M370 620 q90 -300 230 -300 q140 0 230 300" fill="none" stroke="${c.ink}" stroke-width="34" stroke-linecap="round" opacity="0.85"/>
    <circle cx="470" cy="330" r="42" fill="${c.accent}" opacity="0.85"/>
    <path d="M700 640 q60 -140 120 -200" fill="none" stroke="${c.accent}" stroke-width="18" stroke-linecap="round" opacity="0.7"/>`,
  woodwork: (c) => `
    <g fill="none" stroke-linecap="round">
      ${Array.from({ length: 5 }, (_, i) => {
        const r = 60 + i * 42;
        return `<circle cx="600" cy="460" r="${r}" stroke="${i % 2 ? c.accent : c.ink}" stroke-width="${
          i % 2 ? 10 : 16
        }" opacity="${0.85 - i * 0.1}"/>`;
      }).join('')}
    </g>
    <path d="M600 460 l170 -120" stroke="${c.ink}" stroke-width="12" opacity="0.5" stroke-linecap="round"/>`,
  'home-decor': (c) => `
    <path d="M470 400 h260 l-60 -120 h-140 z" fill="${c.ink}" opacity="0.85"/>
    <path d="M600 400 v190" stroke="${c.ink}" stroke-width="16"/>
    <path d="M500 640 q100 -70 200 0 z" fill="${c.accent}" opacity="0.85"/>
    <circle cx="600" cy="255" r="20" fill="${c.accent}" opacity="0.8"/>`,
  'handmade-gifts': (c) => `
    <rect x="440" y="400" width="320" height="250" rx="20" fill="${c.ink}" opacity="0.82"/>
    <path d="M600 400 v250" stroke="${c.from}" stroke-width="26" opacity="0.75"/>
    <path d="M440 490 h320" stroke="${c.from}" stroke-width="26" opacity="0.75"/>
    <path d="M600 400 q-90 -90 -30 -110 q60 -20 30 110 z" fill="${c.accent}" opacity="0.9"/>
    <path d="M600 400 q90 -90 30 -110 q-60 -20 -30 110 z" fill="${c.accent}" opacity="0.9"/>`,
};

/** Faint concentric rings, so a tile has some depth behind the motif. */
const texture = (c, seed) =>
  Array.from({ length: 3 }, (_, i) => {
    const cx = 200 + ((seed >> (i * 3)) % 800);
    const cy = 120 + ((seed >> (i * 4)) % 660);
    return `<circle cx="${cx}" cy="${cy}" r="${170 + i * 90}" fill="none" stroke="${c.ink}" stroke-width="2" opacity="0.07"/>`;
  }).join('');

function tile({ name, category, width = 1200, height = 900 }) {
  const seed = hash(name);
  const c = PALETTES[seed % PALETTES.length];
  const motif = MOTIFS[category] || MOTIFS.pottery;
  const rotation = (seed % 7) - 3;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" width="${width}" height="${height}" role="img" aria-label="${esc(name)}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c.from}"/>
      <stop offset="100%" stop-color="${c.to}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="900" fill="url(#g)"/>
  ${texture(c, seed)}
  <g transform="rotate(${rotation} 600 450)">${motif(c)}</g>
</svg>
`;
}

/** A wide, calmer version for shop banners. */
function banner({ name, category }) {
  const seed = hash(name);
  const c = PALETTES[seed % PALETTES.length];
  const motif = MOTIFS[category] || MOTIFS.pottery;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 600" width="1600" height="600" role="img" aria-label="${esc(name)}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${c.from}"/>
      <stop offset="100%" stop-color="${c.to}"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="600" fill="url(#g)"/>
  ${texture(c, seed)}
  <g transform="translate(500 -120) scale(0.85)" opacity="0.55">${motif(c)}</g>
  <g transform="translate(-260 -140) scale(0.55)" opacity="0.3">${motif(c)}</g>
</svg>
`;
}

/** A square monogram for shop logos. */
function logo({ name }) {
  const seed = hash(name);
  const c = PALETTES[seed % PALETTES.length];
  const initials = name
    .split(/[^A-Za-z]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400" role="img" aria-label="${esc(name)}">
  <rect width="400" height="400" rx="72" fill="${c.to}"/>
  <circle cx="200" cy="200" r="150" fill="none" stroke="${c.ink}" stroke-width="6" opacity="0.25"/>
  <text x="200" y="200" text-anchor="middle" dominant-baseline="central"
    font-family="Georgia, 'Times New Roman', serif" font-size="150" fill="${c.ink}">${esc(initials)}</text>
</svg>
`;
}

export { tile, banner, logo };

/* ------------------------------------------------------------------ write */

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const { PRODUCTS, STORES } = await import('../server/seed/data.js');
  const { CATEGORY_SEED } = await import('../server/config/categories.js');

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const slug = (value) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  let count = 0;
  const write = (name, svg) => {
    fs.writeFileSync(path.join(OUT_DIR, name), svg);
    count += 1;
  };

  for (const product of PRODUCTS) {
    const base = slug(product.name);
    write(`${base}.svg`, tile({ name: product.name, category: product.category }));
    // A second angle, so the gallery on a product page has something to switch to.
    write(`${base}-2.svg`, tile({ name: `${product.name} second`, category: product.category }));
  }

  for (const category of CATEGORY_SEED) {
    write(`category-${category.slug}.svg`, tile({ name: category.name, category: category.slug }));
  }

  const STORE_CRAFT = {
    terra: 'pottery',
    kiln: 'ceramics',
    fern: 'jewelry',
    oak: 'woodwork',
    indigo: 'clothing',
    pigment: 'art',
  };

  for (const store of STORES) {
    write(`store-${store.key}-banner.svg`, banner({ name: store.name, category: STORE_CRAFT[store.key] }));
    write(`store-${store.key}-logo.svg`, logo({ name: store.name }));
  }

  console.log(`wrote ${count} SVGs to client/public/seed-art`);
}
