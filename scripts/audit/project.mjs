/* Checks the documentation, the shipped bundle and the UI signals against
   reality. Runs without a server. */
import fs from 'node:fs';
import path from 'node:path';
import { check } from './harness.mjs';

/* ---- every route the server declares is documented ---------------------- */
console.log('\n=== API DOCS MATCH THE ROUTER ===');

const routeFiles = fs.readdirSync('backend/routes').filter((f) => f.endsWith('.routes.js'));
const mounts = {
  'auth.routes.js': '/auth',
  'product.routes.js': '/products',
  'vendor.routes.js': '/vendors',
  'order.routes.js': '/orders',
  'review.routes.js': '/reviews',
  'payment.routes.js': '/payments',
  'upload.routes.js': '/uploads',
  'admin.routes.js': '/admin',
};

const declared = [];
for (const file of routeFiles) {
  const src = fs.readFileSync(path.join('backend/routes', file), 'utf8');
  const base = mounts[file];
  const re = /router\.(get|post|put|delete)\(\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(src))) {
    const [, method, route] = m;
    declared.push({ method: method.toUpperCase(), path: (base + route).replace(/\/$/, '') || base });
  }
}
const indexSrc = fs.readFileSync('backend/routes/index.js', 'utf8');
if (/router\.get\('\/health'/.test(indexSrc)) declared.push({ method: 'GET', path: '/health' });
if (/router\.get\('\/categories'/.test(indexSrc)) declared.push({ method: 'GET', path: '/categories' });
declared.push({ method: 'POST', path: '/payments/webhook' }); // mounted in app.js for raw body

const docs = fs.readFileSync('docs/api-documentation.md', 'utf8');
const readme = fs.readFileSync('README.md', 'utf8');

const normalise = (p) => p.replace(/:[A-Za-z]+/g, ':x');
const undocumented = declared.filter((r) => {
  const generic = normalise(r.path);
  return ![...docs.matchAll(/`(\/[^`]+)`/g)]
    .map((m) => normalise(m[1].split(' ')[0]))
    .some((d) => d === generic);
});

check(
  'every API route appears in docs/api-documentation.md',
  undocumented.length === 0,
  undocumented.map((r) => `${r.method} ${r.path}`).join(', ')
);
console.log(`        (${declared.length} routes declared)`);

/* ---- demo credentials in the README actually work ----------------------- */
console.log('\n=== DOCUMENTED FACTS ARE TRUE ===');
const seedData = fs.readFileSync('backend/seed/data.js', 'utf8');
for (const cred of ['admin@artisanscorner.demo', 'vendor@artisanscorner.demo', 'buyer@artisanscorner.demo']) {
  check(`README credential ${cred} exists in the seed`, seedData.includes(cred) && readme.includes(cred));
}
for (const pw of ['DemoAdmin123!', 'DemoVendor123!', 'DemoBuyer123!']) {
  check(`README password ${pw} matches the seed`, seedData.includes(pw) && readme.includes(pw));
}

const envExample = fs.readFileSync('.env.example', 'utf8');
const envKeys = [...envExample.matchAll(/^([A-Z_]+)=/gm)].map((m) => m[1]);
const envJs = fs.readFileSync('backend/config/env.js', 'utf8');
const missingFromExample = ['MONGO_URI', 'JWT_SECRET', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET', 'STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET',
  'CLIENT_URL', 'SERVER_URL'].filter((k) => !envKeys.includes(k));
check('.env.example lists every required variable', missingFromExample.length === 0, missingFromExample.join(', '));

const readEnv = [...envJs.matchAll(/process\.env\.([A-Z_]+)/g)].map((m) => m[1]);
const undocumentedEnv = [...new Set(readEnv)].filter((k) => k !== 'NODE_ENV' && !envKeys.includes(k));
check('every variable the server reads is documented', undocumentedEnv.length === 0, undocumentedEnv.join(', '));

/* ---- ports quoted in the docs match the code ---------------------------- */
const viteConfig = fs.readFileSync('frontend/vite.config.js', 'utf8');
check('README client port matches vite.config.js', viteConfig.includes('|| 5273') && readme.includes('5273'));
check('README API port matches env.js', envJs.includes('5055') && readme.includes('5055'));
check('no stale 5173/5000 references in the README', !/localhost:5173|localhost:5000/.test(readme));

/* ---- secrets ------------------------------------------------------------ */
/* ---- seed artwork ------------------------------------------------------- */
console.log('\n=== SEED ARTWORK ===');

const { PRODUCTS, STORES, productArt, storeArt } = await import('../../backend/seed/data.js');
const { CATEGORY_SEED } = await import('../../backend/config/categories.js');

const artRefs = [
  ...PRODUCTS.flatMap((product) => productArt(product.name).map((image) => image.url)),
  ...STORES.flatMap((store) => Object.values(storeArt(store.key))),
  ...CATEGORY_SEED.map((category) => category.image),
];
const missingArt = artRefs.filter((url) => !fs.existsSync(path.join('frontend/public', url)));
check(
  'every seeded image exists (re-run npm run seed:art or seed:photos after renaming)',
  missingArt.length === 0,
  missingArt.join(', ')
);
/* SVG is XML: one unescaped & anywhere makes the browser refuse the whole
   file and show a broken image instead of the artwork. */
const artDir = 'frontend/public/seed-art';
const malformed = fs
  .readdirSync(artDir)
  .filter((file) => {
    const svg = fs.readFileSync(path.join(artDir, file), 'utf8');
    return /&(?!amp;|lt;|gt;|quot;|apos;|#d+;|#x[0-9a-fA-F]+;)/.test(svg);
  });
check('every seed SVG is well-formed XML', malformed.length === 0, malformed.join(', '));

check(
  'seed imagery needs no external host',
  artRefs.every((url) => url.startsWith('/seed-art/') || url.startsWith('/product-photos/')),
  artRefs.find((url) => !url.startsWith('/seed-art/') && !url.startsWith('/product-photos/')) || ''
);

const photoCount = artRefs.filter((url) => url.startsWith('/product-photos/')).length;
console.log(
  `        (${photoCount} real photographs, ${artRefs.length - photoCount} generated illustrations)`
);

console.log('\n=== SECRETS ===');
const gitignore = fs.readFileSync('.gitignore', 'utf8');
check('.env is gitignored', /^\.env$/m.test(gitignore));
check('node_modules is gitignored', /node_modules/.test(gitignore));

const distDir = 'frontend/dist/assets';
if (fs.existsSync(distDir)) {
  const bundle = fs.readdirSync(distDir)
    .filter((f) => f.endsWith('.js') || f.endsWith('.css'))
    .map((f) => fs.readFileSync(path.join(distDir, f), 'utf8'))
    .join('\n');
  check('no Stripe secret key in the built bundle', !/sk_test_|sk_live_/.test(bundle));
  check('no Cloudinary secret in the built bundle', !/CLOUDINARY_API_SECRET|api_secret/.test(bundle));
  check('no Mongo URI in the built bundle', !/mongodb(\+srv)?:\/\//.test(bundle));
  check('no JWT secret in the built bundle', !/JWT_SECRET/.test(bundle));
} else {
  check('client bundle present to scan', false, 'run npm run build first');
}

const clientSrc = fs.readdirSync('frontend/src', { recursive: true })
  .filter((f) => typeof f === 'string' && /\.(js|jsx)$/.test(f))
  .map((f) => fs.readFileSync(path.join('frontend/src', f), 'utf8'))
  .join('\n');
check('client source never references a secret key', !/sk_test_|sk_live_|api_secret|JWT_SECRET/.test(clientSrc));
check('client source has no hardcoded localhost URL', !/http:\/\/localhost:\d+/.test(clientSrc));

/* ---- accessibility and responsiveness signals --------------------------- */
console.log('\n=== UI SIGNALS ===');
const navbar = fs.readFileSync('frontend/src/components/Navbar.jsx', 'utf8');
check('navbar has a mobile menu toggle', /aria-expanded={mobileOpen}/.test(navbar) && /lg:hidden/.test(navbar));
check('navbar cart button is labelled', /aria-label={`Cart/.test(navbar));

const layout = fs.readFileSync('frontend/src/layouts/MainLayout.jsx', 'utf8');
check('skip-to-content link present', /Skip to content/.test(layout));

const shop = fs.readFileSync('frontend/src/pages/Shop.jsx', 'utf8');
check('product grid is responsive', /grid-cols-2/.test(shop) && /lg:grid-cols-3/.test(shop) && /xl:grid-cols-4/.test(shop));

const dashboardTables = ['frontend/src/pages/seller/Products.jsx', 'frontend/src/pages/admin/Users.jsx',
  'frontend/src/pages/admin/Orders.jsx', 'frontend/src/pages/admin/Revenue.jsx']
  .every((f) => /overflow-x-auto/.test(fs.readFileSync(f, 'utf8')));
check('dashboard tables scroll horizontally on small screens', dashboardTables);

const css = fs.readFileSync('frontend/src/index.css', 'utf8');
check('visible focus ring defined', /:focus-visible/.test(css));
check('reduced-motion preference respected', /prefers-reduced-motion/.test(css));

const pages = fs.readdirSync('frontend/src/pages', { recursive: true })
  .filter((f) => typeof f === 'string' && f.endsWith('.jsx') && !f.includes('__tests__'));
const withoutTitle = pages.filter((f) => {
  const src = fs.readFileSync(path.join('frontend/src/pages', f), 'utf8');
  return !src.includes('useDocumentTitle');
});
check('every page sets a document title', withoutTitle.length === 0, withoutTitle.join(', '));

const emptyStateUsers = ['Shop.jsx', 'Cart.jsx', 'Orders.jsx', 'seller/Products.jsx', 'seller/Orders.jsx',
  'seller/Earnings.jsx', 'admin/Users.jsx', 'admin/Orders.jsx']
  .filter((f) => !/EmptyState/.test(fs.readFileSync(path.join('frontend/src/pages', f), 'utf8')));
check('key pages have empty states', emptyStateUsers.length === 0, emptyStateUsers.join(', '));

