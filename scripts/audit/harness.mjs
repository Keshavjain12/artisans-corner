/* End-to-end audit of the quality-bar checklist against the running API. */
const BASE = process.env.API || 'http://localhost:5055/api';

let passed = 0;
const failures = [];
const rand = () => Math.random().toString(36).slice(2, 9);

const check = (name, ok, detail = '') => {
  if (ok) {
    passed += 1;
    console.log(`  ok    ${name}`);
  } else {
    failures.push({ name, detail });
    console.log(`  FAIL  ${name}  ${detail}`);
  }
};

async function call(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-json response */
  }

  /* A rate-limited run produces a cascade of meaningless failures, so stop and
     say what actually happened. The audit spends most of its budget on the
     payments limiter (60 requests / 10 min), which a back-to-back second run
     will exhaust. */
  if (res.status === 429) {
    console.error(
      `\nRate limited on ${method} ${path}.\n` +
        'The audit itself tripped the API rate limiter - the limiter is working.\n' +
        'Restart the server (npm run dev:memory) to reset the counters, then re-run.\n'
    );
    process.exit(3);
  }

  return { status: res.status, body: json, text };
}

const login = async (email, password) => {
  const r = await call('/auth/login', { method: 'POST', body: { email, password } });
  if (!r.body?.data?.token) throw new Error(`login failed ${email}: ${r.text.slice(0, 160)}`);
  return r.body.data.token;
};

const registerBuyer = async (over = {}) => {
  const email = `audit-${rand()}@example.com`;
  const payload = {
    name: 'Audit Buyer',
    email,
    password: 'Passw0rd123',
    confirmPassword: 'Passw0rd123',
    ...over,
  };
  const r = await call('/auth/register', { method: 'POST', body: payload });
  return { token: r.body?.data?.token, email: payload.email, password: payload.password, res: r };
};

const registerVendor = async (storeName) => {
  const acct = await registerBuyer();
  const onboard = await call('/vendors/onboard', {
    method: 'POST',
    token: acct.token,
    body: {
      name: storeName,
      description: 'An audit studio making carefully finished handmade things.',
    },
  });
  const token = await login(acct.email, acct.password);
  return { ...acct, token, store: onboard.body?.data?.store, onboard };
};

const makeProduct = async (token, over = {}) => {
  const r = await call('/products', {
    method: 'POST',
    token,
    body: {
      name: `Audit Piece ${rand()}`,
      description: 'A carefully thrown stoneware audit piece with a soft matte glaze finish.',
      price: 100,
      category: 'pottery',
      stock: 5,
      images: [{ url: 'https://picsum.photos/seed/audit/800/800', publicId: '', alt: 'audit' }],
      ...over,
    },
  });
  return { product: r.body?.data?.product, res: r };
};

const SHIP = {
  fullName: 'Audit Buyer',
  addressLine1: '14 Rosewood Lane',
  city: 'Brooklyn',
  state: 'New York',
  postalCode: '11215',
  country: 'United States',
  phone: '+1 917 555 0143',
};

const buy = async (token, productId, quantity = 1) => {
  const intent = await call('/payments/create-intent', {
    method: 'POST',
    token,
    body: { items: [{ productId, quantity }], shippingAddress: SHIP },
  });
  const pid = intent.body?.data?.paymentIntentId;
  if (!pid) return { intent, confirm: null, order: null };
  const confirm = await call('/payments/confirm', {
    method: 'POST',
    token,
    body: { paymentIntentId: pid },
  });
  return { intent, confirm, order: confirm.body?.data?.order };
};

const section = (n) => console.log(`\n=== ${n} ===`);

export {
  BASE,
  call,
  check,
  login,
  registerBuyer,
  registerVendor,
  makeProduct,
  buy,
  SHIP,
  section,
  rand,
};
export const report = () => ({ passed, failures });
