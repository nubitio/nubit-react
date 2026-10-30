import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Nubit foundation and workspace layout work in light and dark', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/showcase?visualStyle=nubit');
  const root = page.locator('html');
  await expect(root).toHaveAttribute('data-visual-style', 'nubit');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(248, 249, 251)');
  await expect(page.locator('body')).toHaveCSS('color', 'rgb(11, 31, 79)');
  await expect(page.locator('body')).toHaveCSS('font-family', /Lexend/);
  await page.evaluate(() => document.fonts.ready);

  const panel = page.locator('.nb-admin-shell__panel');
  const header = page.locator('.nb-admin-layout-header');
  await expect(panel).toHaveCSS('width', '248px');
  const panelBox = (await panel.boundingBox())!;
  const headerBox = (await header.boundingBox())!;
  expect(panelBox.y).toBe(0);
  expect(headerBox.x).toBe(248);
  expect(headerBox.height).toBe(64);
  await expect(page.locator('.nb-admin-shell__bottom-navigation')).toHaveCount(0);

  // The header slot uses the existing accessible Combobox, not another search implementation.
  const search = page.getByRole('combobox', { name: 'Search demo pages' });
  await search.fill('Dashboard');
  await page.getByRole('option', { name: 'Dashboard', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\?visualStyle=nubit/);
  await expect(page.getByRole('button', { name: 'Dashboard', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page.screenshot({
    path: testInfo.outputPath('workspace-light.png'),
    animations: 'disabled',
  });

  await page.getByRole('button', { name: 'Theme: System' }).click();
  await page.getByRole('button', { name: 'Theme: Light' }).click();
  await expect(root).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(10, 11, 13)');
  await expect(page.locator('body')).toHaveCSS('color', 'rgb(248, 249, 251)');
  await expect(panel).toHaveCSS('background-color', 'rgb(19, 21, 25)');
  await expect(header).toHaveCSS('background-color', 'rgb(19, 21, 25)');
  await expect(search).toHaveCSS('background-color', 'rgb(19, 21, 25)');
  await expect(page.getByRole('button', { name: 'UI Showcase', exact: true })).toHaveCSS(
    'color',
    'rgb(206, 211, 220)',
  );
  await page.screenshot({
    path: testInfo.outputPath('workspace-dark.png'),
    animations: 'disabled',
  });

  await page.getByRole('button', { name: 'Toggle menu' }).click();
  await expect(page.locator('.nb-admin-shell')).toHaveClass(/is-workspace-compact/);
  await expect(panel).toHaveCSS('width', '48px');
  await expect(page.getByText('Demo workspace · Main branch')).toHaveCount(0);
});

test('mobile navigation reserves space and supports routing without horizontal overflow', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/showcase?visualStyle=nubit');
  const bottom = page.locator('.nb-admin-shell__bottom-navigation');
  await expect(bottom).toBeVisible();
  const mainBox = (await page.getByRole('main').boundingBox())!;
  const bottomBox = (await bottom.boundingBox())!;
  expect(mainBox.y + mainBox.height).toBeLessThanOrEqual(bottomBox.y + 1);
  expect(bottomBox.y + bottomBox.height).toBeLessThanOrEqual(844);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

  await bottom.getByRole('link', { name: 'Dashboard' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(bottom.getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page.screenshot({ path: testInfo.outputPath('workspace-mobile.png') });
  await page.getByRole('button', { name: 'Toggle menu' }).click();
  await expect(page.locator('.nb-admin-shell__scrim')).toBeVisible();
  await page.locator('.nb-admin-shell__scrim').click({ position: { x: 300, y: 20 } });
  await expect(page.locator('.nb-admin-shell__scrim')).toHaveCount(0);
});

test('existing consumers retain the default visual foundation', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/showcase');
  await expect(page.locator('html')).toHaveAttribute('data-visual-style', 'default');
  await expect(page.locator('.nb-admin-shell')).not.toHaveClass(/workspace/);
  await expect(page.locator('.nb-admin-shell__panel')).toHaveCSS('width', '240px');
  await expect(page.locator('body')).toHaveCSS('font-family', /Inter/);
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`workspace shell is accessible in ${colorScheme} on desktop and mobile`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto('/dashboard?visualStyle=nubit', { waitUntil: 'networkidle' });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 960 });
      await expect(page.locator('.nb-admin-shell__bottom-navigation')).toHaveCount(
        width === 390 ? 1 : 0,
      );
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .include('.nb-admin-header-component')
        .include(width === 390 ? '.nb-admin-shell__bottom-navigation' : '.nb-admin-shell__panel')
        .analyze();
      expect(violations).toEqual([]);
    }
  });
}
