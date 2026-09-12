import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const num = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const bool = (value, fallback = false) =>
  value === undefined ? fallback : ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  port: num(process.env.PORT, 5055),

  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/artisans-corner',

  jwtSecret: process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5273')
    .split(',')
    .map((url) => url.trim().replace(/\/$/, ''))
    .filter(Boolean),
  serverUrl: (process.env.SERVER_URL || 'http://localhost:5055').replace(/\/$/, ''),
  ephemeralDb: process.env.EPHEMERAL_DB === 'true',

  commissionRate: num(process.env.PLATFORM_COMMISSION_RATE, 0.05),
  taxRate: num(process.env.TAX_RATE, 0),
  shippingFlatRate: num(process.env.SHIPPING_FLAT_RATE, 5),
  freeShippingThreshold: num(process.env.FREE_SHIPPING_THRESHOLD, 75),
  currency: (process.env.CURRENCY || 'usd').toLowerCase(),

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },

  allowMockPayments: bool(process.env.ALLOW_MOCK_PAYMENTS, false),
  demoDeployment: bool(process.env.DEMO_DEPLOYMENT, false),

  upload: {
    maxFileSizeBytes: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'],
    maxFilesPerRequest: 6,
  },
};

env.cloudinaryEnabled = Boolean(
  env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret
);
env.stripeEnabled = Boolean(env.stripe.secretKey);

export function productionProblems(config = env, raw = process.env) {
  const problems = [];
  if (!raw.JWT_SECRET || raw.JWT_SECRET.length < 24) {
    problems.push('JWT_SECRET must be set to a long random string in production.');
  }
  if (!raw.MONGO_URI) problems.push('MONGO_URI must be set in production.');
  if (!config.cloudinaryEnabled) problems.push('Cloudinary credentials must be set in production.');

  const simulated = config.demoDeployment && config.allowMockPayments;
  if (!config.stripeEnabled && !simulated) {
    problems.push(
      'STRIPE_SECRET_KEY must be set in production (or DEMO_DEPLOYMENT=true with ALLOW_MOCK_PAYMENTS=true for a clearly labelled demo).'
    );
  }
  if (config.allowMockPayments && !config.demoDeployment) {
    problems.push('ALLOW_MOCK_PAYMENTS must be false in production unless DEMO_DEPLOYMENT=true.');
  }
  if (config.stripeEnabled && config.allowMockPayments) {
    problems.push('Stripe is configured, so turn ALLOW_MOCK_PAYMENTS off.');
  }
  return problems;
}

export function assertProductionConfig() {
  if (!env.isProd) return;
  const problems = productionProblems();
  if (problems.length) {
    throw new Error(`Invalid production configuration:\n - ${problems.join('\n - ')}`);
  }
}

export default env;
