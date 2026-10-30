import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('first-use content creates an item, while unmatched filters offer a reset', async ({
  page,
}, testInfo) => {
  await page.goto('/catalog?visualStyle=nubit&catalogState=empty');
  await expect(page.getByText('Start your catalog', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('catalog-first-use.png') });
  await page.getByRole('button', { name: 'Create item', exact: true }).click();
  await page.getByLabel('Product name', { exact: true }).fill('First item');
  await page.getByLabel('Price', { exact: true }).fill('10');
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await expect(page.getByRole('button', { name: 'First item', exact: true })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Filter Product name' }).fill('No matching item');
  await expect(page.getByText('No results for these filters', { exact: true })).toBeVisible();
  await expect(page.getByText('Start your catalog', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await expect(page.getByRole('button', { name: 'First item', exact: true })).toBeVisible();
});

test('failed loads recover through retry and forbidden loads never show onboarding', async ({
  page,
}) => {
  await page.goto('/catalog?visualStyle=nubit&catalogState=error');
  await expect(page.getByText("Couldn't load data", { exact: true })).toBeVisible();
  await expect(page.getByText('Start your catalog', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Wireless mouse 1', exact: true })).toBeVisible();
  await page.goto('/catalog?visualStyle=nubit&catalogState=forbidden');
  await expect(page.getByText('Access denied', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create item', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toHaveCount(0);
});

test('read-only records stay consultable and unauthorized create links are blocked', async ({
  page,
}) => {
  await page.goto('/catalog?visualStyle=nubit&catalogState=readonly');
  await page.getByRole('button', { name: 'Wireless mouse 1', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'View product', exact: true })).toBeVisible();
  await expect(page.getByLabel('Product name', { exact: true })).toHaveAttribute('readonly', '');
  await expect(page.getByRole('button', { name: 'Save product', exact: true })).toHaveCount(0);
  await page.goto('/catalog/new?visualStyle=nubit&catalogState=readonly');
  await expect(page.getByText('Access denied', { exact: true })).toBeVisible();
  await expect(page.locator('.nb-crud-page-shell')).toHaveCount(0);
  await page.goto('/catalog/9999?visualStyle=nubit');
  await expect(page.getByText('Record not found', { exact: true })).toBeVisible();
});

test('catalog shares pagination and filters between table and cards, then saves a full-page form', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/catalog?visualStyle=nubit');
  const cards = page.locator('.nb-datagrid__cards > li');
  await expect(cards).toHaveCount(20);
  const card = cards.first();
  const cardBox = (await card.boundingBox())!;
  const cardTextBox = (await card.getByText('Out of stock', { exact: true }).boundingBox())!;
  const mediaBox = (await card.locator('.nb-datagrid__card-media').boundingBox())!;
  expect(mediaBox.width).toBeGreaterThan(cardBox.width - 3);
  expect(cardTextBox.y + cardTextBox.height).toBeLessThanOrEqual(cardBox.y + cardBox.height);
  await page.screenshot({ path: testInfo.outputPath('catalog-cards.png'), animations: 'disabled' });
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(cards).toHaveCount(6);
  await page.getByRole('button', { name: 'Table', exact: true }).click();
  await expect(page.locator('.nb-datagrid__table tbody > tr')).toHaveCount(6);
  await page.getByRole('button', { name: 'Cards', exact: true }).click();
  await expect(cards).toHaveCount(6);
  await page.getByRole('searchbox', { name: 'Filter Product name' }).fill('Wireless mouse');
  await expect(cards).toHaveCount(5);
  await page.getByRole('button', { name: 'Table', exact: true }).click();
  await expect(page.locator('.nb-datagrid__table tbody > tr')).toHaveCount(5);
  await page.getByRole('button', { name: 'Cards', exact: true }).click();
  await page.getByRole('button', { name: 'Wireless mouse 1', exact: true }).click();

  const form = page.locator('.nb-crud-page-shell');
  await expect(form).toBeVisible();
  await expect(form.getByRole('heading', { name: 'Edit product', exact: true })).toBeVisible();
  await expect(page.getByLabel('Product name', { exact: true })).toHaveValue('Wireless mouse 1');
  await page.getByLabel('Price', { exact: true }).fill('30');
  await expect(page.getByRole('status')).toContainText('Difference per unit: $22.00');
  const main = (await page.locator('.nb-form__column').first().boundingBox())!;
  const aside = (await page.locator('.nb-form__column--aside').boundingBox())!;
  expect(aside.x).toBeGreaterThan(main.x + main.width);
  await page.screenshot({ path: testInfo.outputPath('catalog-form.png'), animations: 'disabled' });

  // A narrow form container must stack even when the viewport stays desktop-sized.
  await page.locator('.nb-crud-page-shell__body').evaluate((element) => {
    element.style.width = '650px';
  });
  const narrowMain = (await page.locator('.nb-form__column').first().boundingBox())!;
  const narrowAside = (await page.locator('.nb-form__column--aside').boundingBox())!;
  expect(narrowAside.y).toBeGreaterThan(narrowMain.y + narrowMain.height);
  await page.locator('.nb-crud-page-shell__body').evaluate((element) => {
    element.style.width = '';
  });

  await page.getByLabel('Product name', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await expect(form).toBeVisible();
  await page.getByLabel('Product name', { exact: true }).fill('Wireless mouse edited');
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await expect(form).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Wireless mouse edited', exact: true }),
  ).toBeVisible();
  await page.getByRole('searchbox', { name: 'Filter Product name' }).fill('');
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await page.getByLabel('Product name', { exact: true }).fill('Created catalog item');
  await page.getByLabel('Price', { exact: true }).fill('49');
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await expect(form).toHaveCount(0);
  await page.getByRole('searchbox', { name: 'Filter Product name' }).fill('Created catalog item');
  await expect(cards).toHaveCount(1);
  await expect(
    page.getByRole('button', { name: 'Created catalog item', exact: true }),
  ).toBeVisible();
});

test('category shortcuts reset pagination and share table filters', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/catalog?visualStyle=nubit');
  const cards = page.locator('.nb-datagrid__card:not(.nb-datagrid__card--skeleton)');
  await expect(cards).toHaveCount(20);
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(cards).toHaveCount(6);
  const categories = page.getByRole('group', { name: 'Category', exact: true });
  await categories.getByRole('checkbox', { name: 'Accessories', exact: true }).click();
  await expect(
    categories.getByRole('checkbox', { name: 'Accessories', exact: true }),
  ).toBeChecked();
  await expect(cards).toHaveCount(13);
  await page.getByRole('button', { name: 'Table', exact: true }).click();
  await expect(page.locator('.nb-datagrid__table tbody > tr')).toHaveCount(13);
  await categories.getByRole('checkbox', { name: 'All', exact: true }).click();
  await expect(page.locator('.nb-datagrid__table tbody > tr')).toHaveCount(20);
  await page.getByRole('button', { name: 'Cards', exact: true }).click();
  await expect(cards).toHaveCount(20);
});

test('column form stacks in a narrow container and the footer never covers fields', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/catalog?visualStyle=nubit');
  const newBox = (await page.locator('.nb-datagrid__fab').boundingBox())!;
  const pagerBox = (await page.locator('.nb-datagrid__pager').boundingBox())!;
  expect(newBox.y + newBox.height).toBeLessThanOrEqual(pagerBox.y);
  await page.getByRole('button', { name: 'Wireless mouse 1', exact: true }).click();
  await expect(page.locator('.nb-crud-page-shell')).toBeVisible();
  const main = (await page.locator('.nb-form__column').first().boundingBox())!;
  const aside = (await page.locator('.nb-form__column--aside').boundingBox())!;
  expect(aside.y).toBeGreaterThan(main.y + main.height);
  expect(aside.x).toBe(main.x);
  await page.getByLabel('Active', { exact: true }).scrollIntoViewIfNeeded();
  expect(
    await page
      .getByLabel('Active', { exact: true })
      .evaluate((element) => getComputedStyle(element, '::after').backgroundColor),
  ).toBe('rgb(255, 255, 255)');
  const active = (await page.getByLabel('Active', { exact: true }).boundingBox())!;
  const footer = (await page.locator('.nb-crud-page-shell__footer').boundingBox())!;
  expect(active.y + active.height).toBeLessThanOrEqual(footer.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: testInfo.outputPath('catalog-form-mobile-dark.png'),
    animations: 'disabled',
  });
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .include('.nb-crud-page-shell')
    .analyze();
  expect(violations).toEqual([]);
});
