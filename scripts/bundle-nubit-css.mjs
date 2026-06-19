/**
 * Aggregates the CSS from each @nubitio/* package into a single
 * @nubitio/react-admin/dist/style.css file.  Run after `tsdown` so that all
 * individual dist/style.css files are already built.
 *
 * Usage: node scripts/bundle-nubit-css.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packagesDir = join(__dirname, '..', 'packages');

const sources = [
  join(packagesDir, 'ui', 'dist', 'style.css'),
  join(packagesDir, 'crud', 'dist', 'style.css'),
  join(packagesDir, 'admin', 'dist', 'style.css'),
  join(packagesDir, 'dashboard', 'dist', 'style.css'),
];

const outDir = join(packagesDir, 'react-admin', 'dist');
const outFile = join(outDir, 'style.css');

const parts = sources.map((src) => {
  const content = readFileSync(src, 'utf8');
  return `/* ${src.replace(packagesDir + '/', '')} */\n${content}`;
});

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, parts.join('\n'), 'utf8');

const bytes = Buffer.byteLength(parts.join('\n'));
console.log(`bundled react-admin/dist/style.css (${(bytes / 1024).toFixed(1)} KB)`);
