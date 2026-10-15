import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} date and time controls`, () => {
    test.use({ colorScheme });

    test('calendar keyboard navigation commits an ISO date and restores focus', async ({
      page,
    }) => {
      await page.goto('/showcase', { waitUntil: 'networkidle' });
      const date = page.getByRole('combobox', { name: 'Appointment date', exact: true });
      await date.fill('2026-06-15');
      await date.press('Enter');
      await expect(date).toHaveValue('06/15/2026');
      await date.click();
      await expect(date).toBeFocused();
      await date.press('ArrowLeft');
      await expect(date).toBeFocused();
      await date.press('ControlOrMeta+A');
      await date.pressSequentially('06152026');
      await date.press('Enter');
      await expect(date).toHaveValue('06/15/2026');
      await date.press('ArrowDown');
      const panel = page.locator('.nb-date-picker__panel');
      await expect(panel).toBeVisible();
      await expect(panel.locator('[data-focused]')).toContainText('15');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Enter');
      await expect(panel).toBeHidden();
      await expect(date).toHaveValue('06/16/2026');
      await expect(date).toBeFocused();
      await date.press('ArrowDown');
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze()
        ).violations,
      ).toEqual([]);
      await panel.screenshot({
        animations: 'disabled',
        path: test.info().outputPath(`calendar-${colorScheme}.png`),
      });
      await page.keyboard.press('Escape');
      await expect(date).toBeFocused();
    });

    test('range selection, month/year navigation and time segments work on mobile', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto('/showcase', { waitUntil: 'networkidle' });
      const start = page.getByRole('textbox', { name: 'Start date Reporting period' });
      const end = page.getByRole('textbox', { name: 'End date Reporting period' });
      await start.fill('2026-06-10');
      await start.press('Enter');
      await end.fill('2026-06-15');
      await end.press('Enter');
      await start.press('ArrowDown');
      const panel = page.locator('.nb-date-range-picker__panel');
      await expect(panel).toBeVisible();
      const selects = panel.locator('select');
      await selects.nth(1).selectOption('2025');
      await selects.first().selectOption('3');
      const cells = panel.getByRole('button').filter({ hasText: /^1$/ });
      await cells.first().click();
      await panel.getByRole('button').filter({ hasText: /^5$/ }).first().click();
      await expect(panel).toBeHidden();
      await expect(start).toHaveValue('03/01/2025');
      await expect(end).toHaveValue('03/05/2025');
      const minute = page.getByRole('spinbutton', { name: /minute.*Appointment time/i });
      await minute.focus();
      await page.keyboard.press('ArrowUp');
      await expect(minute).toHaveAttribute('aria-valuenow', '31');
      await start.press('ArrowDown');
      const box = await panel.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(360);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.screenshot({
        animations: 'disabled',
        path: test.info().outputPath(`range-mobile-${colorScheme}.png`),
      });
    });
  });
}
