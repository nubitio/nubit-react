import { expect, test } from '@playwright/test';

test.describe('Users DevExtreme page', () => {
  test('grid loads user rows and hides the DevExtreme load panel', async ({ page }) => {
    await page.goto('/users-dx', { waitUntil: 'networkidle' });

    const firstUserRow = page.locator('.dx-datagrid-rowsview .dx-data-row').filter({ hasText: 'Leanne Graham' });
    await expect(firstUserRow).toBeVisible();

    await expect(page.locator('.dx-datagrid-filter-row')).toBeVisible();
    await expect(page.locator('.dx-datagrid-pager')).toBeVisible();

    await expect(page.locator('.dx-loadpanel.dx-state-visible')).toHaveCount(0);
    await expect(page.locator('[role="alert"]').filter({ hasText: 'Loading' })).toHaveCount(0);
  });

  test('delete asks for confirmation before removing a row', async ({ page }) => {
    await page.goto('/users-dx', { waitUntil: 'networkidle' });

    await expect(
      page.locator('.dx-datagrid-rowsview .dx-data-row').filter({ hasText: 'Leanne Graham' }),
    ).toBeVisible();

    const row = page.locator('.dx-datagrid-rowsview .dx-data-row').filter({ hasText: 'Leanne Graham' });
    await row.getByRole('button', { name: /delete/i }).click();

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/delete|eliminar/i);

    await dialog.getByRole('button', { name: /cancel|cancelar/i }).click();
    await expect(dialog).toHaveCount(0);
    await expect(
      page.locator('.dx-datagrid-rowsview .dx-data-row').filter({ hasText: 'Leanne Graham' }),
    ).toBeVisible();
  });

  test('master-detail loads posts without a stuck load panel', async ({ page }) => {
    await page.goto('/users-dx', { waitUntil: 'networkidle' });

    await expect(
      page.locator('.dx-datagrid-rowsview .dx-data-row').filter({ hasText: 'Leanne Graham' }),
    ).toBeVisible();

    await page.getByRole('gridcell', { name: 'Expand' }).first().click();

    const detailRow = page.locator('.nb-dx-detail-grid .dx-data-row').first();
    await expect(detailRow).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.dx-loadpanel.dx-state-visible')).toHaveCount(0);
    await expect(page.locator('[role="alert"]').filter({ hasText: 'Loading' })).toHaveCount(0);
  });
});