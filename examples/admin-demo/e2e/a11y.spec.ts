import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { stubJsonPlaceholder } from './fixtures/jsonplaceholder';

/**
 * WCAG 2.1 AA gate for the engine's own surfaces.
 *
 * The demo app is thin on purpose — every route here is a few lines that hand
 * a resource to the engine — so what axe scans is the shell, the grid, the
 * form controls and the UI primitives, not application code. A regression in
 * a shipped component shows up here.
 *
 * Both themes run: the light and dark palettes are separate token sets, so a
 * contrast regression in one is invisible from the other.
 *
 * DevExtreme is excluded: that route renders a third-party grid we do not own
 * and cannot fix, and a gate that fails on someone else's markup gets muted.
 */

const WCAG_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function scan(page: Page) {
  return new AxeBuilder({ page }).withTags(WCAG_AA).analyze();
}

/** Fails with the rule, the impact and the offending markup, not just a count. */
function report(violations: Awaited<ReturnType<typeof scan>>['violations']): string {
  if (violations.length === 0) return 'no violations';
  return violations
    .map((violation) => {
      const nodes = violation.nodes
        .map((node) => {
          const why = (node.any[0]?.message ?? node.all[0]?.message ?? '').split('\n')[0];
          return `      ${node.html}\n        ${why}`;
        })
        .join('\n');
      return `  [${violation.impact ?? 'unknown'}] ${violation.id}: ${violation.help}\n${nodes}`;
    })
    .join('\n');
}

const ROUTES = [
  { path: '/dashboard', name: 'dashboard', ready: 'main' },
  { path: '/showcase', name: 'UI showcase', ready: 'main' },
  { path: '/fieldtypes', name: 'field types grid', ready: 'table, [role="grid"]' },
  { path: '/users', name: 'native CRUD grid', ready: 'table, [role="grid"]' },
];

// ThemeProvider defaults to `auto`, so the emulated color scheme is what
// selects the palette — no app-side hook needed.
for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme });

    for (const route of ROUTES) {
      test(`${route.name} has no WCAG 2.1 AA violations`, async ({ page }) => {
        await stubJsonPlaceholder(page);
        await page.goto(route.path, { waitUntil: 'networkidle' });
        await page.locator(route.ready).first().waitFor();

        const { violations } = await scan(page);
        expect(violations, `\n${report(violations)}`).toEqual([]);
      });
    }

    test('the CRUD edit dialog has no WCAG 2.1 AA violations', async ({ page }) => {
      await stubJsonPlaceholder(page);
      await page.goto('/users', { waitUntil: 'networkidle' });

      // The form is where the field-type modules render their controls, and it
      // is the surface a keyboard-only user spends the most time in.
      await page
        .getByRole('button', { name: /add|nuevo|new/i })
        .first()
        .click();
      await page.getByRole('dialog').waitFor();

      const { violations } = await scan(page);
      expect(violations, `\n${report(violations)}`).toEqual([]);
    });
  });
}
