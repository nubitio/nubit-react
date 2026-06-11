/**
 * Lockstep version bump for all publishable packages.
 * No changelog files are written — release notes live in GitHub Releases.
 *
 * Usage: node scripts/set-version.mjs 0.2.0
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const version = process.argv[2];
if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version ?? '')) {
  console.error('Usage: node scripts/set-version.mjs <semver>  (e.g. 0.2.0)');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const packages = ['core', 'ui', 'admin', 'crud', 'hydra', 'react-admin'];

for (const name of packages) {
  const file = join(root, 'packages', name, 'package.json');
  const pkg = JSON.parse(readFileSync(file, 'utf8'));
  pkg.version = version;
  writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`@nubitio/${name} → ${version}`);
}
