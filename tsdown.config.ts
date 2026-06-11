import { defineConfig } from 'tsdown';

const NUBIT_PACKAGES = ['@nubit/core', '@nubit/crud', '@nubit/ui', '@nubit/admin', '@nubit/hydra'];

// Every runtime dependency/peer of any package must stay external — the root
// package.json only has devDependencies, so tsdown cannot infer these itself.
const RUNTIME_EXTERNAL = [
  'react',
  'react-dom',
  'react-router-dom',
  'react-i18next',
  'i18next',
  '@tanstack/react-query',
  'react-dropzone',
];

// CSS/SCSS is processed by @tsdown/css and extracted into dist/style.css.
const ALWAYS_EXTERNAL = (id: string) =>
  [...NUBIT_PACKAGES, ...RUNTIME_EXTERNAL].some((pkg) => id === pkg || id.startsWith(pkg + '/'));

const sharedConfig = {
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: false,
  // `loadPaths` lets every SCSS file resolve `@use 'variables'` from the repo root.
  css: {
    preprocessorOptions: {
      scss: {
        loadPaths: ['.'],
      },
    },
  },
  inputOptions: {
    external: ALWAYS_EXTERNAL,
  },
} satisfies Parameters<typeof defineConfig>[0];

export default [
  // ── @nubit/core ───────────────────────────────────────────────────────────
  // Runtime primitives only: HTTP, Mercure, config, events, base data types.
  defineConfig({
    ...sharedConfig,
    entry: { index: 'packages/core/public.ts' },
    outDir: 'packages/core/dist',
  }),

  // ── @nubit/crud ───────────────────────────────────────────────────────────
  // CRUD engine, field DSL, form/grid views. Depends on @nubit/core + @nubit/ui.
  defineConfig({
    ...sharedConfig,
    entry: { index: 'packages/crud/public.ts' },
    outDir: 'packages/crud/dist',
  }),

  // ── @nubit/admin ──────────────────────────────────────────────────────────
  // AdminShell, AdminHeader, AdminSidebarMenu, useScreenSize. Depends on @nubit/ui.
  defineConfig({
    ...sharedConfig,
    entry: { index: 'packages/admin/public.ts' },
    outDir: 'packages/admin/dist',
  }),

  // ── @nubit/ui ─────────────────────────────────────────────────────────────
  // Visual primitives, theme system, UiStrings localization.
  defineConfig({
    ...sharedConfig,
    entry: { index: 'packages/ui/public.ts' },
    outDir: 'packages/ui/dist',
  }),

  // ── @nubit/hydra ──────────────────────────────────────────────────────────
  // Hydra/OpenAPI parser and data sources. @nubit/core references are external.
  defineConfig({
    ...sharedConfig,
    entry: { index: 'packages/hydra/public.ts' },
    outDir: 'packages/hydra/dist',
  }),

  // ── @nubit/react-admin ────────────────────────────────────────────────────
  // Umbrella re-export: all sibling packages are external, near-zero bytes.
  defineConfig({
    ...sharedConfig,
    entry: { index: 'packages/react-admin/public.ts' },
    outDir: 'packages/react-admin/dist',
  }),
];
