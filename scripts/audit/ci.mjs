/**
 * Runs the audit against a disposable server on its own port.
 *
 *   npm run audit:ci
 *
 * The audit spends most of its request budget on the payments rate limiter, so
 * running it twice against one long-lived server trips that limiter. Rather
 * than relax a security control for the convenience of its own test, this boots
 * a fresh in-memory server with fresh counters, audits it, and shuts it down -
 * which also makes the audit safe to run in CI with no database installed.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = Number(process.env.AUDIT_PORT || 5099);
const API = `http://localhost:${PORT}/api`;

const server = spawn(process.execPath, ['scripts/dev-memory-db.mjs'], {
  cwd: path.join(repoRoot, 'server'),
  env: {
    ...process.env,
    PORT: String(PORT),
    SERVER_URL: `http://localhost:${PORT}`,
    CLIENT_URL: 'http://localhost:5273',
    ALLOW_MOCK_PAYMENTS: 'true',
    NODE_ENV: 'development',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let serverLog = '';
server.stdout.on('data', (d) => {
  serverLog += d;
});
server.stderr.on('data', (d) => {
  serverLog += d;
});

const stopServer = () => {
  if (server.exitCode === null) server.kill();
};
process.on('exit', stopServer);
process.on('SIGINT', () => {
  stopServer();
  process.exit(130);
});

const waitForApi = async (timeoutMs = 180000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) return false;
    // eslint-disable-next-line no-await-in-loop
    const ok = await fetch(`${API}/health`)
      .then((r) => r.ok)
      .catch(() => false);
    if (ok) return true;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
};

console.log(`Starting a disposable server on port ${PORT} (first run downloads MongoDB)...`);

if (!(await waitForApi())) {
  console.error('\nThe disposable server never became ready.\n');
  console.error(serverLog.split('\n').slice(-25).join('\n'));
  stopServer();
  process.exit(2);
}

console.log('Server ready.\n');

process.env.API = API;
const { report } = await import('./harness.mjs');

await import('./project.mjs');
await import('./api.mjs');
await import('./flows.mjs');

const { passed, failures } = report();
const total = passed + failures.length;

console.log(`\n${'='.repeat(56)}`);
console.log(`  ${passed}/${total} checks passed`);
console.log('='.repeat(56));

stopServer();

if (failures.length) {
  console.log('\nFAILURES');
  failures.forEach((f, i) => console.log(`  ${i + 1}. ${f.name}${f.detail ? ` :: ${f.detail}` : ''}`));
  console.log('');
  process.exit(1);
}
process.exit(0);
