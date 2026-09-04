/**
 * Runs the API against a throwaway in-memory MongoDB, seeded on boot.
 *
 * This exists so the marketplace can be demonstrated on a machine with no
 * MongoDB installed. Data lives only as long as the process: for real work,
 * point MONGO_URI at a local mongod or an Atlas cluster and use `npm run dev`.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

/* Reuse the binary the test suite already downloaded instead of fetching a
   second copy into the home cache. Env vars must be set before
   mongodb-memory-server is imported, hence the dynamic import below. */
process.env.MONGOMS_DOWNLOAD_DIR =
  process.env.MONGOMS_DOWNLOAD_DIR ||
  path.resolve(scriptDir, '..', 'node_modules', '.cache', 'mongodb-memory-server');

const { MongoMemoryServer } = await import('mongodb-memory-server');
const memory = await MongoMemoryServer.create();

// Must also be set before any module reads config/env.js.
process.env.MONGO_URI = memory.getUri('artisans-corner');
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.ALLOW_MOCK_PAYMENTS = process.env.ALLOW_MOCK_PAYMENTS || 'true';

console.log('[dev] in-memory MongoDB started - data is not persisted');

const { run } = await import('../seed/seed.js');
await run();

await import('../server.js');

const stop = async () => {
  await memory.stop().catch(() => {});
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
