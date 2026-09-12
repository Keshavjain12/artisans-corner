const API = (process.env.API || process.argv[2] || '').replace(/\/$/, '');
const SITE = (process.env.SITE || process.argv[3] || '').replace(/\/$/, '');

if (!API) {
  console.error('\nUsage: API=https://<api>/api SITE=https://<site> npm run smoke\n');
  process.exit(2);
}

let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures += 1;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}${!ok && detail ? `  :: ${detail}` : ''}`);
};

const get = async (url, { timeout = 15000, ...options } = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const text = await res.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
    }
    return { status: res.status, headers: res.headers, text, body };
  } catch (error) {
    return { status: 0, headers: new Headers(), text: '', body: null, error: error.message };
  } finally {
    clearTimeout(timer);
  }
};

console.log(`\nSmoke testing ${API}${SITE ? ` and ${SITE}` : ''}\n`);

console.log('API');
const health = await get(`${API}/health`, { timeout: 90000 });
check('health answers', health.status === 200, health.error || `status ${health.status}`);
const info = health.body?.data || {};
check('database is persistent', info.database === 'persistent', info.database);
check('images go to Cloudinary', info.imageStorage === 'cloudinary', info.imageStorage);
check(
  'payments are configured',
  info.payments === 'stripe' || (info.payments === 'mock' && info.demo === true),
  `${info.payments}${info.demo ? ' (demo)' : ''}`
);

const products = await get(`${API}/products?limit=4`);
const list = products.body?.data || [];
check('the catalogue is seeded', list.length > 0, `status ${products.status}, ${list.length} products`);

const categories = await get(`${API}/categories`);
check('categories load', (categories.body?.data || []).length > 0);

const shops = await get(`${API}/vendors`);
check('shops load', (shops.body?.data || []).length > 0);

if (list[0]) {
  const detail = await get(`${API}/products/${list[0].slug}`);
  check('a product page loads', detail.body?.data?.product?.slug === list[0].slug);
}

const config = await get(`${API}/payments/config`);
check('payment config exposes no secret', !/sk_(test|live)_|whsec_/.test(config.text));

const login = await get(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'buyer@artisanscorner.demo', password: 'DemoBuyer123!' }),
});
const token = login.body?.data?.token;
check('the demo buyer can sign in', Boolean(token), login.body?.message || `status ${login.status}`);
if (token) {
  const me = await get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
  check('the session is accepted', me.body?.data?.user?.email === 'buyer@artisanscorner.demo');
}

if (SITE) {
  console.log('\nSite');

  const preflight = await get(`${API}/products`, {
    method: 'OPTIONS',
    headers: { Origin: SITE, 'Access-Control-Request-Method': 'GET' },
  });
  check(
    'the API accepts requests from the site (CORS)',
    preflight.headers.get('access-control-allow-origin') === SITE,
    `allow-origin is "${preflight.headers.get('access-control-allow-origin')}" - set CLIENT_URL=${SITE}`
  );

  const home = await get(SITE);
  check('the site serves its app', home.status === 200 && /<div id="root">/.test(home.text));

  const deep = await get(`${SITE}/shop`);
  check('deep links are rewritten to the app', deep.status === 200 && /<div id="root">/.test(deep.text));

  const photo = list[0]?.images?.[0]?.url;
  if (photo) {
    const photoUrl = photo.startsWith('http') ? photo : `${SITE}${photo}`;
    const image = await get(photoUrl);
    check(
      'product photographs are served',
      image.status === 200 && /image\//.test(image.headers.get('content-type') || ''),
      `${photoUrl} -> ${image.status} ${image.headers.get('content-type')}`
    );
  }
}

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`}\n`);
process.exitCode = failures === 0 ? 0 : 1;
