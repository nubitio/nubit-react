/**
 * Copies the @nubit/ui theme stylesheets into public/themes/ so the
 * ThemeProvider can load them from the default basePath at runtime.
 */
import { cpSync, mkdirSync } from 'fs';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const uiPkg = dirname(require.resolve('@nubit/ui/package.json'));
const dest = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'themes');

mkdirSync(dest, { recursive: true });
cpSync(join(uiPkg, 'dist', 'themes'), dest, { recursive: true });
console.log('copied @nubit/ui themes → public/themes/');
