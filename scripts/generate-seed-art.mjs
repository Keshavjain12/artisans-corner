import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MOTIFS, motifFor } from './seed-art-motifs.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(repoRoot, 'frontend', 'public', 'seed-art');

const PALETTES = [
  { from: '#F6EBE3', to: '#E7CFC1', ink: '#8F5739', accent: '#A96F4C' },
  { from: '#F1EDE6', to: '#DFD5C6', ink: '#74452E', accent: '#C28C6E' },
  { from: '#EDF0EC', to: '#D6DFD3', ink: '#4B6248', accent: '#5F7A5B' },
  { from: '#F7EFE8', to: '#E3D3C4', ink: '#5C3726', accent: '#D6AF99' },
  { from: '#EFE9E4', to: '#D9CDBF', ink: '#4A2D20', accent: '#A96F4C' },
  { from: '#F4EEE9', to: '#E0D2C8', ink: '#3A4C38', accent: '#8F5739' },
];

const esc = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const hash = (value) => {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
};

const texture = (c, seed) =>
  Array.from({ length: 3 }, (_, i) => {
    const cx = 200 + ((seed >> (i * 3)) % 800);
    const cy = 120 + ((seed >> (i * 4)) % 660);
    return `<circle cx="${cx}" cy="${cy}" r="${170 + i * 90}" fill="none" stroke="${c.ink}" stroke-width="2" opacity="0.07"/>`;
  }).join('');

function tile({ name, category, size = 1200, paletteShift = 0, view = 1 }) {
  const seed = hash(name);
  const c = PALETTES[(seed + paletteShift) % PALETTES.length];
  const motif = MOTIFS[motifFor(name, category)];
  const rotation = ((seed % 7) - 3) * (view === 2 ? -1.6 : 1);
  const scale = view === 2 ? 0.86 : 1;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200" width="${size}" height="${size}" role="img" aria-label="${esc(name)}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c.from}"/>
      <stop offset="100%" stop-color="${c.to}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="1200" fill="url(#g)"/>
  <g transform="translate(0 150)">${texture(c, seed)}</g>
  <g transform="translate(600 600) scale(${scale}) rotate(${rotation}) translate(-600 -450)">${motif(c)}</g>
</svg>
`;
}

function banner({ name, category }) {
  const seed = hash(name);
  const c = PALETTES[seed % PALETTES.length];
  const motif = MOTIFS[motifFor(name, category)];

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

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const { PRODUCTS, STORES } = await import('../backend/seed/data.js');
  const { CATEGORY_SEED } = await import('../backend/config/categories.js');

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
    write(
      `${base}-2.svg`,
      tile({ name: product.name, category: product.category, paletteShift: 3, view: 2 })
    );
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

  console.log(`wrote ${count} SVGs to frontend/public/seed-art`);
}
