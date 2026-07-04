#!/usr/bin/env node
/**
 * Publish all @nubitio/* packages in dependency order (lockstep version).
 * Requires: npm login, pnpm build, packages at the same version.
 *
 * Usage: node scripts/publish-lockstep.mjs
 */
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const ORDER = [
  'core',
  'ui',
  'hydra',
  'crud',
  'dashboard',
  'admin',
  'react-admin',
  'eject',
];

const version = JSON.parse(
  readFileSync(join(root, 'packages', 'ui', 'package.json'), 'utf8'),
).version;

console.log(`Publishing @nubitio/* @ ${version}\n`);

for (const name of ORDER) {
  const dir = join(root, 'packages', name);
  console.log(`→ @nubitio/${name}@${version}`);
  execSync('npm publish --access public', { cwd: dir, stdio: 'inherit' });
}

console.log('\nDone.');