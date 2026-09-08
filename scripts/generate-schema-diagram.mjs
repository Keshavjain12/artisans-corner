/**
 * Draws the database schema diagram the brief asks for as a deliverable:
 * "an image showing how Users, Products, Orders, and Reviews are connected".
 *
 *   npm run docs:schema
 *
 * Writes docs/database-schema.svg, and rasterises docs/database-schema.png via
 * the Chrome that Playwright already drives, so the image can be dropped into a
 * slide or a report as well as rendered on GitHub.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = path.join(repoRoot, 'docs');

const C = {
  ink: '#1F1B18',
  muted: '#6F655D',
  soft: '#9A8F86',
  line: '#C8B9AC',
  cream: '#FCFAF7',
  sand: '#F3EDE6',
  clay50: '#FBF6F3',
  clay100: '#F4E8E1',
  clay500: '#A96F4C',
  clay600: '#8F5739',
  clay700: '#74452E',
  moss500: '#5F7A5B',
  moss100: '#E7EDE6',
  white: '#FFFFFF',
};

const ROW = 26;
const HEAD = 46;
const PAD = 12;

/**
 * One entity box. `core` marks the four tables the brief names, which are
 * drawn in the accent colour so the required relationships read at a glance.
 */
function entity({ x, y, w, title, subtitle, fields, core = false }) {
  const h = HEAD + fields.length * ROW + PAD;
  const accent = core ? C.clay600 : C.moss500;
  const headFill = core ? C.clay100 : C.moss100;

  const rows = fields
    .map((f, i) => {
      const ty = y + HEAD + i * ROW + 17;
      const isKey = f.key === 'PK' || f.key === 'FK' || f.key === 'UK';
      const keyColour = f.key === 'PK' ? C.clay600 : f.key === 'FK' ? C.moss500 : C.soft;
      return `
    <text x="${x + 14}" y="${ty}" font-size="13" fill="${C.ink}" font-family="'Inter',system-ui,sans-serif">${f.name}</text>
    <text x="${x + w - 14}" y="${ty}" font-size="11.5" text-anchor="end" fill="${
      isKey ? keyColour : C.soft
    }" font-family="'Inter',system-ui,sans-serif"${isKey ? ' font-weight="600"' : ''}>${f.type}</text>`;
    })
    .join('');

  const separators = fields
    .slice(0, -1)
    .map(
      (_, i) =>
        `<line x1="${x + 10}" y1="${y + HEAD + (i + 1) * ROW}" x2="${x + w - 10}" y2="${
          y + HEAD + (i + 1) * ROW
        }" stroke="${C.sand}" stroke-width="1"/>`
    )
    .join('');

  return {
    box: { x, y, w, h, cx: x + w / 2, cy: y + h / 2 },
    svg: `
  <g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${C.white}" stroke="${C.line}" stroke-width="1.5"/>
    <path d="M${x} ${y + 14} a14 14 0 0 1 14 -14 h${w - 28} a14 14 0 0 1 14 14 v${HEAD - 14} h-${w} z" fill="${headFill}"/>
    <rect x="${x}" y="${y}" width="5" height="${h}" rx="2.5" fill="${accent}"/>
    <text x="${x + 14}" y="${y + 22}" font-size="15" font-weight="700" fill="${
      core ? C.clay700 : C.ink
    }" font-family="'Inter',system-ui,sans-serif">${title}</text>
    <text x="${x + 14}" y="${y + 38}" font-size="11" fill="${C.muted}" font-family="'Inter',system-ui,sans-serif">${subtitle}</text>
    ${separators}
    ${rows}
  </g>`,
  };
}

/**
 * Orthogonal connector with a cardinality label.
 *  - 'hvh' (default) leaves sideways, turns down a vertical corridor, comes in sideways
 *  - 'vhv' leaves vertically, runs along a horizontal corridor, drops in
 * The corridor keeps lines out of the boxes they pass.
 */
function link({ from, to, label, note = '', dashed = false, route = 'hvh', corridor }) {
  let path;
  let mx;
  let my;

  if (route === 'vhv') {
    const cy = corridor ?? (from.y + to.y) / 2;
    path = `M${from.x} ${from.y} L${from.x} ${cy} L${to.x} ${cy} L${to.x} ${to.y}`;
    mx = from.x + (to.x - from.x) / 2;
    my = cy;
  } else {
    const cx = corridor ?? from.x + (to.x - from.x) / 2;
    path = `M${from.x} ${from.y} L${cx} ${from.y} L${cx} ${to.y} L${to.x} ${to.y}`;
    mx = cx;
    my = (from.y + to.y) / 2;
  }

  const width = Math.max(label.length * 6.6 + 16, 34);

  return `
  <g>
    <path d="${path}" fill="none" stroke="${C.line}" stroke-width="2" ${
      dashed ? 'stroke-dasharray="6 5"' : ''
    } marker-end="url(#arrow)"/>
    <rect x="${mx - width / 2}" y="${my - 11}" width="${width}" height="22" rx="11" fill="${C.cream}" stroke="${C.line}"/>
    <text x="${mx}" y="${my + 4}" font-size="11.5" text-anchor="middle" fill="${C.clay700}" font-weight="600" font-family="'Inter',system-ui,sans-serif">${label}</text>
    ${
      note
        ? `<text x="${mx}" y="${my + 26}" font-size="10.5" text-anchor="middle" fill="${C.soft}" font-family="'Inter',system-ui,sans-serif">${note}</text>`
        : ''
    }
  </g>`;
}

const W = 1720;
const H = 1300;

const user = entity({
  x: 60,
  y: 150,
  w: 300,
  core: true,
  title: 'USER',
  subtitle: 'one account, buyer and seller',
  fields: [
    { name: '_id', type: 'PK', key: 'PK' },
    { name: 'name', type: 'String' },
    { name: 'email', type: 'UK', key: 'UK' },
    { name: 'password', type: 'bcrypt' },
    { name: 'role', type: 'buyer|vendor|admin' },
    { name: 'store', type: 'FK', key: 'FK' },
    { name: 'isActive', type: 'Boolean' },
  ],
});

const store = entity({
  x: 470,
  y: 120,
  w: 300,
  title: 'STORE',
  subtitle: 'the vendor storefront',
  fields: [
    { name: '_id', type: 'PK', key: 'PK' },
    { name: 'owner', type: 'FK → User', key: 'FK' },
    { name: 'name / slug', type: 'UK', key: 'UK' },
    { name: 'description', type: 'String' },
    { name: 'logo / banner', type: 'URL' },
    { name: 'isActive', type: 'Boolean' },
  ],
});

const category = entity({
  x: 60,
  y: 560,
  w: 300,
  title: 'CATEGORY',
  subtitle: 'extensible taxonomy',
  fields: [
    { name: '_id', type: 'PK', key: 'PK' },
    { name: 'name', type: 'String' },
    { name: 'slug', type: 'UK', key: 'UK' },
    { name: 'image', type: 'URL' },
  ],
});

const product = entity({
  x: 470,
  y: 430,
  w: 300,
  core: true,
  title: 'PRODUCT',
  subtitle: 'owned by exactly one store',
  fields: [
    { name: '_id', type: 'PK', key: 'PK' },
    { name: 'name / slug', type: 'UK', key: 'UK' },
    { name: 'price', type: 'Number' },
    { name: 'category', type: 'FK → slug', key: 'FK' },
    { name: 'vendor', type: 'FK → Store', key: 'FK' },
    { name: 'images[]', type: 'URL[]' },
    { name: 'stock', type: 'Number' },
    { name: 'ratingAverage', type: 'Number' },
    { name: 'isArchived', type: 'soft delete' },
  ],
});

const order = entity({
  x: 950,
  y: 90,
  w: 320,
  core: true,
  title: 'ORDER',
  subtitle: 'one buyer, many vendors',
  fields: [
    { name: '_id', type: 'PK', key: 'PK' },
    { name: 'orderNumber', type: 'UK', key: 'UK' },
    { name: 'buyer', type: 'FK → User', key: 'FK' },
    { name: 'vendors[]', type: 'FK → Store[]', key: 'FK' },
    { name: 'shippingAddress', type: 'Object' },
    { name: 'subtotal / total', type: 'Number' },
    { name: 'platformFee', type: 'Number' },
    { name: 'vendorEarnings', type: 'Number' },
    { name: 'paymentStatus', type: 'pending|paid' },
    { name: 'stripePaymentIntentId', type: 'String' },
    { name: 'orderStatus', type: 'processing…' },
  ],
});

const orderItem = entity({
  x: 950,
  y: 560,
  w: 320,
  core: true,
  title: 'ORDER ITEM',
  subtitle: 'embedded array — price snapshot',
  fields: [
    { name: 'product', type: 'FK → Product', key: 'FK' },
    { name: 'vendor', type: 'FK → Store', key: 'FK' },
    { name: 'productNameSnapshot', type: 'String' },
    { name: 'imageSnapshot', type: 'URL' },
    { name: 'priceSnapshot', type: 'price when sold' },
    { name: 'quantity', type: 'Number' },
    { name: 'subtotal', type: 'Number' },
    { name: 'platformFee', type: '5%' },
    { name: 'vendorEarnings', type: '95%' },
    { name: 'fulfillmentStatus', type: 'shipped…' },
  ],
});

const review = entity({
  x: 470,
  y: 800,
  w: 300,
  core: true,
  title: 'REVIEW',
  subtitle: 'verified purchases only',
  fields: [
    { name: '_id', type: 'PK', key: 'PK' },
    { name: 'product', type: 'FK → Product', key: 'FK' },
    { name: 'user', type: 'FK → User', key: 'FK' },
    { name: 'order', type: 'FK → Order', key: 'FK' },
    { name: 'rating', type: '1–5' },
    { name: 'comment', type: 'String' },
  ],
});

const payout = entity({
  x: 1380,
  y: 620,
  w: 250,
  title: 'PAYOUT',
  subtitle: 'vendor earnings ledger',
  fields: [
    { name: '_id', type: 'PK', key: 'PK' },
    { name: 'order', type: 'FK', key: 'FK' },
    { name: 'vendor', type: 'FK → Store', key: 'FK' },
    { name: 'grossSales', type: 'Number' },
    { name: 'platformFee', type: 'Number' },
    { name: 'netEarnings', type: 'Number' },
    { name: 'status', type: 'pending|paid' },
  ],
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="'Inter',system-ui,sans-serif">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="${C.line}"/>
    </marker>
  </defs>

  <rect width="${W}" height="${H}" fill="${C.cream}"/>

  <text x="60" y="62" font-size="27" font-weight="700" fill="${C.ink}">Artisan&#8217;s Corner &#8212; database schema</text>
  <text x="60" y="90" font-size="14" fill="${C.muted}">MongoDB / Mongoose. Accent tables are the four the brief names: how Users, Products, Orders and Reviews connect.</text>

  ${link({ from: { x: 360, y: 250 }, to: { x: 470, y: 210 }, label: '1 : 0..1', note: 'becomes a seller' })}
  ${link({ from: { x: 620, y: 355 }, to: { x: 620, y: 430 }, label: '1 : N', note: 'lists', route: 'vhv' })}
  ${link({ from: { x: 210, y: 560 }, to: { x: 470, y: 505 }, label: '1 : N', note: 'classifies', route: 'vhv', corridor: 505 })}
  ${link({ from: { x: 300, y: 150 }, to: { x: 1110, y: 90 }, label: '1 : N', note: 'places an order', route: 'vhv', corridor: 108 })}
  ${link({ from: { x: 1110, y: 434 }, to: { x: 1110, y: 560 }, label: '1 : 1..N', note: 'embeds', route: 'vhv' })}
  ${link({ from: { x: 950, y: 700 }, to: { x: 770, y: 700 }, label: 'N : 1', note: 'snapshots', corridor: 880 })}
  ${link({ from: { x: 770, y: 900 }, to: { x: 950, y: 300 }, label: 'N : 1', note: 'proof of purchase', dashed: true, corridor: 830 })}
  ${link({ from: { x: 620, y: 722 }, to: { x: 620, y: 800 }, label: '1 : N', note: 'receives', route: 'vhv' })}
  ${link({ from: { x: 360, y: 420 }, to: { x: 470, y: 860 }, label: '1 : N', note: 'writes', corridor: 415 })}
  ${link({ from: { x: 1270, y: 300 }, to: { x: 1380, y: 700 }, label: '1 : N', note: 'one row per vendor', corridor: 1325 })}

  ${user.svg}
  ${store.svg}
  ${category.svg}
  ${product.svg}
  ${order.svg}
  ${orderItem.svg}
  ${review.svg}
  ${payout.svg}

  <g transform="translate(60, 1100)">
    <rect x="0" y="0" width="820" height="150" rx="14" fill="${C.clay50}" stroke="${C.line}"/>
    <text x="20" y="28" font-size="14" font-weight="700" fill="${C.clay700}">How the money splits</text>
    <text x="20" y="56" font-size="13" fill="${C.ink}">item.subtotal        = priceSnapshot &#215; quantity</text>
    <text x="20" y="80" font-size="13" fill="${C.ink}">item.platformFee     = subtotal &#215; 0.05          &#8594; $100 sale &#8594; $5 platform</text>
    <text x="20" y="104" font-size="13" fill="${C.ink}">item.vendorEarnings  = subtotal &#8722; platformFee   &#8594; $95 to the maker</text>
    <text x="20" y="132" font-size="11.5" fill="${C.muted}">Split per line item, so one order spanning several shops pays each maker correctly. Recorded in PAYOUT.</text>
  </g>

  <g transform="translate(950, 1100)">
    <rect x="0" y="0" width="680" height="150" rx="14" fill="${C.white}" stroke="${C.line}"/>
    <text x="20" y="28" font-size="14" font-weight="700" fill="${C.ink}">Reading the diagram</text>
    <circle cx="28" cy="52" r="6" fill="${C.clay600}"/>
    <text x="44" y="57" font-size="12.5" fill="${C.muted}">Tables the brief names: User, Product, Order (with items), Review</text>
    <circle cx="28" cy="80" r="6" fill="${C.moss500}"/>
    <text x="44" y="85" font-size="12.5" fill="${C.muted}">Supporting tables: Store, Category, Payout</text>
    <line x1="16" y1="108" x2="40" y2="108" stroke="${C.line}" stroke-width="2" stroke-dasharray="6 5"/>
    <text x="44" y="113" font-size="12.5" fill="${C.muted}">Dashed: the link that makes a review a verified purchase</text>
    <text x="20" y="136" font-size="11.5" fill="${C.soft}">PK primary key &#183; FK foreign key &#183; UK unique</text>
  </g>
</svg>
`;

fs.mkdirSync(DOCS, { recursive: true });
fs.writeFileSync(path.join(DOCS, 'database-schema.svg'), svg);
console.log('wrote docs/database-schema.svg');

/* Rasterise with the browser Playwright already uses, so the diagram can be
   pasted into a slide deck or a report as a PNG. */
try {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  await page.setContent(
    `<body style="margin:0">${svg}</body>`,
    { waitUntil: 'networkidle' }
  );
  await page.screenshot({ path: path.join(DOCS, 'database-schema.png') });
  await browser.close();
  console.log('wrote docs/database-schema.png (2x)');
} catch (error) {
  console.warn('PNG step skipped:', error.message);
}
