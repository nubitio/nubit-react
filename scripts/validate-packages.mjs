/**
 * Publish-readiness validation: runs publint and arethetypeswrong against the
 * packed tarball of every package. Run after `pnpm build`.
 *
 * Usage: node scripts/validate-packages.mjs
 */
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { rmSync } from 'fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const packages = ['core', 'ui', 'admin', 'crud', 'hydra', 'react-admin'];

let failed = false;

for (const name of packages) {
  const dir = join(root, 'packages', name);
  console.log(`\n━━━ @nubitio/${name} ━━━`);

  try {
    execSync('pnpm exec publint --strict', { cwd: dir, stdio: 'inherit' });
  } catch {
    failed = true;
  }

  // attw needs a tarball; `--entrypoints .` checks only the JS entrypoint
  // (the style.css / themes/* exports are CSS and would false-positive).
  let tarball;
  try {
    tarball = execSync('npm pack --ignore-scripts 2>/dev/null', { cwd: dir })
      .toString()
      .trim()
      .split('\n')
      .pop();
    execSync(`pnpm exec attw ./${tarball} --entrypoints .`, { cwd: dir, stdio: 'inherit' });
  } catch {
    failed = true;
  } finally {
    if (tarball) rmSync(join(dir, tarball), { force: true });
  }
}

process.exit(failed ? 1 : 0);
