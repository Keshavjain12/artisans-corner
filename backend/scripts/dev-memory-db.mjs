import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

process.env.MONGOMS_DOWNLOAD_DIR =
  process.env.MONGOMS_DOWNLOAD_DIR ||
  path.resolve(scriptDir, '..', 'node_modules', '.cache', 'mongodb-memory-server');

const { MongoMemoryServer } = await import('mongodb-memory-server');
const memory = await MongoMemoryServer.create();

process.env.MONGO_URI = memory.getUri('artisans-corner');
process.env.EPHEMERAL_DB = 'true';
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
