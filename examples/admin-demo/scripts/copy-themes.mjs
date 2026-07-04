/**
 * Copies runtime theme assets into public/:
 * - @nubitio/ui themes → public/themes/
 * - DevExtreme base themes → public/devextreme-themes/
 */
import { cpSync, mkdirSync } from 'fs';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

const uiPkg = dirname(require.resolve('@nubitio/ui/package.json'));
const uiDest = join(root, 'themes');
mkdirSync(uiDest, { recursive: true });
cpSync(join(uiPkg, 'dist', 'themes'), uiDest, { recursive: true });
console.log('copied @nubitio/ui themes → public/themes/');

const dxCss = dirname(require.resolve('devextreme/dist/css/dx.light.css'));
const dxDest = join(root, 'devextreme-themes');
mkdirSync(dxDest, { recursive: true });
for (const file of ['dx.light.css', 'dx.dark.css']) {
  cpSync(join(dxCss, file), join(dxDest, file));
}
for (const dir of ['fonts', 'icons']) {
  cpSync(join(dxCss, dir), join(dxDest, dir), { recursive: true });
}
console.log('copied DevExtreme themes → public/devextreme-themes/');
