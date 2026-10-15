import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} UI controls`, () => {
    test.use({ colorScheme });

    test('multiple selection and paged search retain their chosen labels', async ({ page }) => {
      await page.goto('/showcase', { waitUntil: 'networkidle' });
      const countries = page.getByRole('combobox', { name: 'Countries', exact: true });
      await countries.fill('Ch');
      await countries.press('ArrowDown');
      await countries.press('Enter');
      await countries.press('Escape');
      await expect(page.getByRole('button', { name: /^Remove Chile/ })).toBeVisible();
      await page.getByRole('button', { name: /^Remove Peru/ }).click();
      await expect(page.getByRole('button', { name: /^Remove Peru/ })).toHaveCount(0);

      const contact = page.getByRole('combobox', { name: 'Contact', exact: true });
      await page.getByRole('button', { name: 'Open options Contact', exact: true }).click();
      await expect(page.getByRole('option', { name: 'Ada Lovelace' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Load more', exact: true })).toBeVisible();
      await contact.press('PageDown');
      await expect(page.getByRole('option', { name: 'Linus Torvalds' })).toBeVisible();
      await page.getByRole('option', { name: 'Linus Torvalds' }).click();
      await expect(contact).toHaveValue('Linus Torvalds');
      await contact.fill('Grace');
      await expect(page.getByRole('option', { name: 'Grace Hopper' })).toBeVisible();
      await contact.press('Escape');
      await expect(contact).toHaveValue('Linus Torvalds');
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.screenshot({
        path: test.info().outputPath(`multiselect-${colorScheme}.png`),
        fullPage: true,
      });
    });

    test('CRUD entity and tag fields submit the original numeric IDs', async ({ page }) => {
      let submitted: Record<string, unknown> | undefined;
      await page.route('**/sales', async (route) => {
        if (route.request().method() === 'POST') {
          submitted = route.request().postDataJSON();
          await route.fulfill({ json: { id: 100, ...submitted } });
        } else await route.fulfill({ json: [] });
      });
      await page.goto('/fieldtypes', { waitUntil: 'networkidle' });
      await page
        .getByRole('button', { name: /add|nuevo|new/i })
        .first()
        .click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('textbox', { name: 'Name', exact: true }).fill('Relation test');
      const owner = dialog.getByRole('combobox', { name: 'Owner', exact: true });
      await owner.fill('Zero');
      await owner.press('ArrowDown');
      await owner.press('Enter');
      const labels = dialog.getByRole('combobox', { name: 'Labels', exact: true });
      await labels.fill('Office');
      await expect(page.getByRole('option', { name: 'Office' })).toBeVisible();
      await labels.press('Escape');
      await expect(dialog).toBeVisible();
      await labels.fill('Office');
      await labels.press('ArrowDown');
      await labels.press('Enter');
      if (await page.getByRole('listbox').isVisible()) await labels.press('Escape');
      await dialog.getByRole('button', { name: /^Remove Office/ }).scrollIntoViewIfNeeded();
      await page.screenshot({
        path: test.info().outputPath(`crud-relations-${colorScheme}.png`),
        fullPage: true,
      });
      await dialog
        .getByRole('button', { name: /save|guardar/i })
        .last()
        .click();
      await expect.poll(() => submitted?.owner).toBe(0);
      expect(submitted?.labels).toEqual([2]);
    });

    test('combobox and tooltip support keyboard interaction', async ({ page }) => {
      await page.goto('/showcase', { waitUntil: 'networkidle' });
      const country = page.getByRole('combobox', { name: 'Country' });
      await country.fill('Ch');
      await expect(page.getByRole('option', { name: 'Chile' })).toBeVisible();
      await country.press('ArrowDown');
      await country.press('Enter');
      await expect(country).toHaveValue('Chile');
      await expect(page.getByRole('listbox')).toBeHidden();
      await page
        .locator('.nb-form-field')
        .filter({ has: country })
        .getByRole('button', { name: 'Clear', exact: true })
        .click();
      await expect(country).toHaveValue('');
      await country.fill('Unavailable');
      await expect(page.getByText('No options found', { exact: true })).toBeVisible();
      await country.press('Escape');

      const help = page.getByRole('button', { name: 'Report help' });
      await help.focus();
      const tooltip = page.getByRole('tooltip');
      await expect(tooltip).toBeVisible();
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze()
        ).violations,
      ).toEqual([]);
      await expect(help).toHaveAttribute(
        'aria-describedby',
        (await tooltip.getAttribute('id')) ?? '',
      );
      await page.screenshot({
        path: test.info().outputPath(`tooltip-${colorScheme}.png`),
        fullPage: true,
      });
      await help.press('Escape');
      await expect(tooltip).toBeHidden();
      await country.fill('Co');
      await expect(page.getByRole('option', { name: 'Colombia' })).toBeVisible();
      // While the list is open, React Aria hides unrelated page content from
      // screen readers. Scan the active widget; the whole page is scanned
      // again after Tab dismisses it and restores the background.
      expect(
        (
          await new AxeBuilder({ page })
            .include('.nb-form-field[data-rac]:has([role="combobox"][aria-expanded="true"])')
            .include('.nb-combobox-popup')
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.screenshot({
        path: test.info().outputPath(`combobox-${colorScheme}.png`),
        fullPage: true,
      });
      await country.press('Tab');
      await expect(page.getByRole('listbox')).toBeHidden();
      await expect(help).toBeFocused();
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze()
        ).violations,
      ).toEqual([]);
    });

    test('native selection and tab keyboard navigation preserve form state', async ({ page }) => {
      await page.goto('/showcase', { waitUntil: 'networkidle' });
      const updates = page.getByRole('checkbox', { name: 'Receive updates' });
      await expect(updates).toBeChecked();
      await updates.focus();
      await page.keyboard.press('Space');
      await expect(updates).not.toBeChecked();
      await expect(page.getByRole('checkbox', { name: 'Partially selected' })).toBeChecked({
        indeterminate: true,
      });

      const email = page.getByRole('radio', { name: 'Email', exact: true });
      await email.focus();
      await page.keyboard.press('ArrowRight');
      await expect(page.getByRole('radio', { name: 'SMS', exact: true })).toBeChecked();

      const name = page.getByRole('textbox', { name: 'Account name' });
      await name.fill('Acme');
      await page.getByRole('tab', { name: 'General', exact: true }).focus();
      await page.keyboard.press('ArrowRight');
      const activity = page.getByRole('tab', { name: 'Activity', exact: true });
      await expect(activity).toBeFocused();
      await expect(activity).toHaveAttribute('aria-selected', 'true');
      await expect(name).toBeHidden();
      await page.keyboard.press('ArrowRight');
      await expect(page.getByRole('tab', { name: 'General', exact: true })).toBeFocused();
      await expect(name).toHaveValue('Acme');
      await expect(page.getByRole('progressbar', { name: 'Upload progress' })).toHaveAttribute(
        'value',
        '65',
      );

      await page.screenshot({
        path: test.info().outputPath(`ui-controls-${colorScheme}.png`),
        fullPage: true,
      });
    });
  });
}
