import mongoose from 'mongoose';
import env from '../config/env.js';
import cloudinary from '../config/cloudinary.js';
import stripe from '../config/stripe.js';

const results = [];
const record = (service, ok, detail) => {
  results.push({ service, ok, detail });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${service.padEnd(12)} ${detail}`);
};

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

console.log(`\nChecking external services (${env.nodeEnv})\n`);

try {
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10000 });
  const { host, name } = mongoose.connection;
  const collections = await mongoose.connection.db.listCollections().toArray();
  record('MongoDB', true, `connected to ${host}/${name} (${collections.length} collections)`);
  await mongoose.disconnect();
} catch (error) {
  record('MongoDB', false, error.message);
}

if (!env.cloudinaryEnabled) {
  record(
    'Cloudinary',
    false,
    'not configured - set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET'
  );
} else {
  try {
    const uploaded = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'artisans-corner/_healthcheck', resource_type: 'image', format: 'webp' },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      stream.end(PNG);
    });

    const fetched = await fetch(uploaded.secure_url);
    const served = fetched.ok && (fetched.headers.get('content-type') || '').startsWith('image/');

    await cloudinary.uploader.destroy(uploaded.public_id);

    record(
      'Cloudinary',
      served,
      served
        ? `uploaded, served and cleaned up (cloud: ${env.cloudinary.cloudName})`
        : `uploaded but the URL returned ${fetched.status}`
    );
  } catch (error) {
    record('Cloudinary', false, error.message);
  }
}

if (!env.stripeEnabled) {
  record('Stripe', false, 'not configured - set STRIPE_SECRET_KEY');
} else {
  try {
    const intent = await stripe.paymentIntents.create({
      amount: 100,
      currency: env.currency,
      automatic_payment_methods: { enabled: true },
      description: "Artisan's Corner credential check",
      metadata: { healthcheck: 'true' },
    });
    await stripe.paymentIntents.cancel(intent.id);

    const live = env.stripe.secretKey.startsWith('sk_live_');
    record(
      'Stripe',
      true,
      `created and cancelled ${intent.id}${live ? '  [WARNING: this is a LIVE key]' : ' (test mode)'}`
    );

    if (!env.stripe.webhookSecret) {
      record('Stripe hook', false, 'STRIPE_WEBHOOK_SECRET is empty - payments will not be confirmed by webhook');
    } else {
      record('Stripe hook', true, 'webhook signing secret is set');
    }
  } catch (error) {
    record('Stripe', false, error.message);
  }
}

if (env.allowMockPayments) {
  record(
    'Mock payments',
    env.isProd ? false : true,
    env.isProd
      ? 'ALLOW_MOCK_PAYMENTS must be false in production'
      : 'enabled (fine for local development)'
  );
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed\n`);

if (failed.length) {
  console.log('Fix these before deploying:');
  failed.forEach((f) => console.log(`  - ${f.service}: ${f.detail}`));
  console.log('');
  process.exit(1);
}
process.exit(0);
