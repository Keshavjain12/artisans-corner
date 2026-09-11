import env, { assertProductionConfig } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
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

  /* A keep-alive connection can hold the server open indefinitely, and a
     platform that sends SIGTERM will send SIGKILL soon after - so close the
     database, then leave regardless. */
  const bail = setTimeout(() => process.exit(0), 8000);
  bail.unref();

  server.close(async () => {
    await disconnectDB().catch(() => {});
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  console.error('[server] unhandled rejection:', reason);
});
