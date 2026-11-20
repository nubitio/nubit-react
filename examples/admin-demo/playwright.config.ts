import { defineConfig } from '@playwright/test';

const PORT = 5199;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  // CI: one retry absorbs a cold-start flake; stop after a few failures and cap the whole
  // run, so a broken app fails in minutes instead of every test waiting out its timeout.
  retries: process.env.CI ? 1 : 0,
  maxFailures: process.env.CI ? 5 : 0,
  globalTimeout: process.env.CI ? 10 * 60_000 : 0,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `sh -c "cd ../.. && pnpm build && cd examples/admin-demo && node scripts/copy-themes.mjs && pnpm build && pnpm exec vite preview --host 127.0.0.1 --port ${PORT}"`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
