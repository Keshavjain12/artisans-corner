import { BASE, report } from './harness.mjs';

const say = (line = '') => console.error(line);

const health = await fetch(`${BASE}/health`)
  .then((r) => (r.ok ? r.json() : null))
  .catch(() => null);

const disposable = health?.data?.database === 'ephemeral';
const forced = process.argv.includes('--force');

if (!health) {
  say();
  say(`Cannot reach the API at ${BASE}`);
  say('Start it first:  npm run audit:ci   (or npm run dev:memory)');
  say();
  process.exitCode = 2;
} else if (!disposable && !forced) {
  say();
  say(`The API at ${BASE} is using a persistent database.`);
  say('This audit creates accounts, shops and paid orders, so it will not run');
  say('against real data. Use the disposable server instead:');
  say();
  say('  npm run audit:ci');
  say();
  say('Pass --force only if you meant to audit this database.');
  say();
  process.exitCode = 2;
} else {
  console.log(`Auditing ${BASE} (${health.data.database} database)`);

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
    failures.forEach((f, i) =>
      console.log(`  ${i + 1}. ${f.name}${f.detail ? ` :: ${f.detail}` : ''}`)
    );
    console.log('');
    process.exitCode = 1;
  }
}
