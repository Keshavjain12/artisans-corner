/**
 * Full quality-bar audit.
 *
 *   npm run audit          # against http://localhost:5055/api
 *   API=<url> npm run audit
 *
 * Three passes:
 *   project.mjs  documentation, secrets and UI signals   (no server needed)
 *   api.mjs      auth, catalogue, checkout, orders, reviews, dashboards, admin
 *   flows.mjs    uploads, multi-vendor baskets, failure paths, cancellation
 *
 * Everything is checked against the running application, so this fails when the
 * app regresses rather than when someone forgets to tick a box.
 */
import { BASE, report } from './harness.mjs';

const reachable = await fetch(`${BASE}/health`)
  .then((r) => r.ok)
  .catch(() => false);

if (!reachable) {
  console.error(`\nCannot reach the API at ${BASE}`);
  console.error('Start it first:  npm run dev:memory   (or npm run dev)\n');
  process.exit(2);
}

console.log(`Auditing ${BASE}`);

await import('./project.mjs');
await import('./api.mjs');
await import('./flows.mjs');

const { passed, failures } = report();
const total = passed + failures.length;

console.log(`\n${'='.repeat(56)}`);
console.log(`  ${passed}/${total} checks passed`);
console.log('='.repeat(56));

if (failures.length) {
  console.log('\nFAILURES');
  failures.forEach((f, i) => console.log(`  ${i + 1}. ${f.name}${f.detail ? ` :: ${f.detail}` : ''}`));
  console.log('');
  process.exit(1);
}
