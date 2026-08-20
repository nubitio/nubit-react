import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const rules = [
  {
    directory: join(root, 'packages/crud'),
    forbidden: '@nubitio/hydra',
    reason: 'crud must stay transport-neutral; Hydra implements the CRUD schema contracts',
  },
];

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .filter((entry) => entry.name !== 'dist')
      .map(async (entry) => {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) return sourceFiles(path);
        return ['.ts', '.tsx', '.js', '.mjs'].includes(extname(entry.name)) ? [path] : [];
      }),
  );
  return nested.flat();
}

const violations = [];
for (const rule of rules) {
  for (const file of await sourceFiles(rule.directory)) {
    const source = await readFile(file, 'utf8');
    const escapedPackage = rule.forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const forbiddenImport = new RegExp(
      `(?:from\\s*|import\\(\\s*)['\"]${escapedPackage}(?:/[^'\"]*)?['\"]`,
    );
    if (forbiddenImport.test(source)) {
      violations.push(`${relative(root, file)} imports ${rule.forbidden}: ${rule.reason}`);
    }
  }
}

if (violations.length > 0) {
  console.error(
    `Package boundary violations:\n${violations.map((item) => `- ${item}`).join('\n')}`,
  );
  process.exit(1);
}

console.log('package boundaries OK');
