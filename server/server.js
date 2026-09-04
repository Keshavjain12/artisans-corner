import env, { assertProductionConfig } from './config/env.js';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';

assertProductionConfig();

const app = createApp();

const server = await (async () => {
  await connectDB();
  return app.listen(env.port, () => {
    console.log(`[server] Artisan's Corner API on ${env.serverUrl} (${env.nodeEnv})`);
    if (!env.stripeEnabled) {
      console.warn(
        `[server] Stripe is not configured. Checkout runs in ${
          env.allowMockPayments ? 'SIMULATED payment mode' : 'DISABLED payment mode'
        }.`
      );
    }
    if (!env.cloudinaryEnabled) {
      console.warn('[server] Cloudinary is not configured - images are stored on local disk.');
    }
  });
})();

const shutdown = (signal) => {
  console.log(`[server] ${signal} received, shutting down`);
  server.close(() => process.exit(0));
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  console.error('[server] unhandled rejection:', reason);
});
