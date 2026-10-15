import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function openPlayground(page: Page) {
  await page.goto('/showcase', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Open overlay playground', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Overlay playground', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
  return dialog;
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} accessible overlays`, () => {
    test.use({ colorScheme });

    test('modal traps and restores focus and retains mounted form state', async ({ page }) => {
      const dialog = await openPlayground(page);
      await dialog.getByRole('textbox', { name: 'Working title' }).fill('Saved draft');
      await dialog.getByRole('button', { name: 'Done', exact: true }).focus();
      await page.keyboard.press('Tab');
      await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(dialog.getByRole('button', { name: 'Done', exact: true })).toBeFocused();
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.screenshot({
        animations: 'disabled',
        path: test.info().outputPath(`dialog-${colorScheme}.png`),
      });
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      const trigger = page.getByRole('button', { name: 'Open overlay playground', exact: true });
      await expect(trigger).toBeFocused();
      await trigger.click();
      await expect(dialog.getByRole('textbox', { name: 'Working title' })).toHaveValue(
        'Saved draft',
      );
    });

    test('combobox, select, menu and popover dismiss independently', async ({ page }) => {
      const dialog = await openPlayground(page);
      const destination = dialog.getByRole('combobox', { name: 'Destination', exact: true });
      await destination.click();
      await destination.fill('Ch');
      await expect(dialog.getByRole('option', { name: 'Chile' })).toBeVisible();
      await destination.press('Escape');
      await expect(dialog).toBeVisible();
      const status = dialog.getByRole('combobox', { name: /Publication status/ });
      await status.click();
      await expect(dialog.getByRole('option', { name: 'Published', exact: true })).toBeVisible();
      await expect(dialog.getByRole('option', { name: 'Draft', exact: true })).toBeFocused();
      await page.keyboard.press('End');
      await expect(dialog.getByRole('option', { name: 'Published', exact: true })).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(status).toContainText('Published');
      await expect(status).toBeFocused();
      await expect(page.getByRole('listbox')).toBeHidden();
      await status.press('ArrowDown');
      await expect(dialog.getByRole('option', { name: 'Published', exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog).toBeVisible();
      await expect(status).toBeFocused();
      const actions = dialog.getByRole('button', { name: 'Report actions' });
      await actions.focus();
      await page.keyboard.press('ArrowDown');
      await expect(dialog.getByRole('menuitem', { name: 'Preview report' })).toBeFocused();
      await page.keyboard.press('ArrowDown');
      const unavailable = dialog.getByRole('menuitem', { name: 'Unavailable action' });
      await expect(unavailable).toBeFocused();
      await expect(unavailable).toHaveAttribute('aria-disabled', 'true');
      await page.keyboard.press('Enter');
      await expect(dialog.getByRole('menu')).toBeVisible();
      await page.keyboard.press('ArrowDown');
      await expect(dialog.getByRole('menuitem', { name: 'Archive report' })).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(dialog.getByRole('status')).toHaveText('Archive selected');
      await expect(actions).toBeFocused();
      await actions.press('ArrowDown');
      await expect(dialog.getByRole('menuitem', { name: 'Preview report' })).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(dialog.getByRole('menu')).toBeHidden();
      await expect(actions).toBeFocused();
      const details = dialog.getByRole('button', { name: 'Report details', exact: true });
      await details.click();
      const popover = dialog.getByRole('dialog', { name: 'Report details', exact: true });
      await expect(popover.getByRole('textbox', { name: 'Report note' })).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(popover).toBeHidden();
      await expect(details).toBeFocused();
      await expect(dialog).toBeVisible();
      await details.click();
      await expect(popover.getByRole('textbox', { name: 'Report note' })).toBeFocused();
      const title = dialog.getByRole('textbox', { name: 'Working title' });
      await title.click();
      await expect(popover).toBeHidden();
      await expect(title).toBeFocused();
    });

    test('calendars and tooltips stay usable inside a modal', async ({ page }) => {
      const dialog = await openPlayground(page);
      await dialog.getByRole('button', { name: 'Open calendar', exact: true }).first().click();
      await expect(dialog.locator('.nb-date-picker__panel')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog.locator('.nb-date-picker__panel')).toBeHidden();
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: 'Open calendar', exact: true }).last().click();
      await expect(dialog.locator('.nb-date-range-picker__panel')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog.locator('.nb-date-range-picker__panel')).toBeHidden();
      const help = dialog.getByRole('button', { name: 'Report scope' });
      await help.focus();
      await expect(dialog.getByRole('tooltip')).toBeVisible();
      await expect(help).toBeFocused();
      await help.press('Escape');
      await expect(dialog.getByRole('tooltip')).toBeHidden();
      await expect(dialog).toBeVisible();
    });

    test('nested drawer and confirmation restore focus one layer at a time', async ({ page }) => {
      const dialog = await openPlayground(page);
      const trigger = dialog.getByRole('button', { name: 'Open nested drawer' });
      await trigger.click();
      const drawer = page.getByRole('dialog', { name: 'Nested drawer', exact: true });
      await expect(drawer).toBeVisible();
      await drawer.getByRole('button', { name: 'Back to report' }).focus();
      await page.keyboard.press('Tab');
      await expect(drawer.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
      const destination = drawer.getByRole('combobox', { name: 'Drawer destination' });
      await destination.click();
      await destination.fill('Ch');
      await expect(drawer.getByRole('option', { name: 'Chile' })).toBeVisible();
      await destination.press('Escape');
      await expect(drawer).toBeVisible();
      const confirmTrigger = drawer.getByRole('button', { name: 'Confirm changes' });
      await confirmTrigger.click();
      const confirmation = page.getByRole('alertdialog', { name: 'Apply report changes' });
      await expect(confirmation.getByRole('button', { name: 'Cancel' })).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(confirmation).toBeHidden();
      await expect(drawer).toBeVisible();
      await expect(confirmTrigger).toBeFocused();
      await page.screenshot({
        animations: 'disabled',
        path: test.info().outputPath(`drawer-${colorScheme}.png`),
      });
      await page.keyboard.press('Escape');
      await expect(drawer).toBeHidden();
      await expect(dialog).toBeVisible();
      await expect(trigger).toBeFocused();
    });

    test('dismissal flags block Escape and backdrop but allow explicit close', async ({ page }) => {
      const dialog = await openPlayground(page);
      await dialog.getByRole('checkbox', { name: 'Close with Escape' }).uncheck();
      await dialog.getByRole('checkbox', { name: 'Close on backdrop' }).uncheck();
      await page.keyboard.press('Escape');
      await expect(dialog).toBeVisible();
      await page.locator('.nb-dialog__scrim').click({ position: { x: 5, y: 5 } });
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: 'Done', exact: true }).click();
      await expect(dialog).toBeHidden();
    });

    test('modal fits a narrow mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      const dialog = await openPlayground(page);
      const box = await dialog.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(360);
      await page.screenshot({
        animations: 'disabled',
        path: test.info().outputPath(`modal-mobile-${colorScheme}.png`),
      });
      await dialog.getByRole('button', { name: 'Done', exact: true }).click();
      await expect(dialog).toBeHidden();
    });
  });
}
