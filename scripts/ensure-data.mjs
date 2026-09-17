// Runs before `astro build`. If the MCLA data files are missing (fresh clone
// before the first sync has run), seed them from the captured 2026 snapshot so
// the build never fails for lack of data.
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (!existsSync(path.join(ROOT, 'src/data/mcla/meta.json'))) {
  console.log('No MCLA data yet — seeding from scripts/_captured-2026.json');
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/test-sync.mjs')], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
