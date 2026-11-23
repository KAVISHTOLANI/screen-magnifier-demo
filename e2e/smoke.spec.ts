import { expect, test } from '@playwright/test';
import { checkMobile, snap } from './helpers';

test('magnify, re-theme and measure focus', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('zoom in');
  await expect(page.locator('.hero-lens')).toBeVisible();
  await page.waitForTimeout(1200);
  await snap(page, 'landing');
  await checkMobile(page, 'landing-mobile');

  await page.getByRole('link', { name: 'Try the magnifier' }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Magnify');
  const stage = page.getByRole('group', { name: /Magnifier stage/ });
  const box = (await stage.boundingBox())!;
  await page.mouse.move(box.x + 120, box.y + 60);
  await expect(page.locator('.lens')).toBeVisible();
  // Follow focus: tabbing to the button moves the lens over it.
  await page.getByRole('button', { name: 'Reserve a place' }).first().focus();
  const lens = (await page.locator('.lens').boundingBox())!;
  const btn = (await page.getByRole('button', { name: 'Reserve a place' }).first().boundingBox())!;
  expect(Math.abs(lens.x + lens.width / 2 - (btn.x + btn.width / 2))).toBeLessThan(4);
  await page.getByRole('button', { name: 'Reserve a place' }).first().click();
  await expect(page.locator('.lens').getByText('Enter your name to reserve.')).toBeAttached();
  const h = (await page.getByRole('heading', { name: 'Autumn reading club' }).first().boundingBox())!;
  await page.mouse.move(h.x + 60, h.y + 30);
  await page.evaluate(() => window.scrollTo(0, 260));
  await snap(page, 'magnifier');

  await page.getByRole('radio', { name: 'Full-screen zoom' }).click();
  await page.getByLabel(/Zoom:/).fill('4');
  await page.getByLabel('Your name').first().focus();
  await expect(page.locator('.minimap')).toBeVisible();
  // The focused field is inside the clipped stage view.
  const field = (await page.getByLabel('Your name').first().boundingBox())!;
  const st = (await stage.boundingBox())!;
  expect(field.y).toBeGreaterThanOrEqual(st.y - 1);
  expect(field.y + Math.min(field.height, 40)).toBeLessThanOrEqual(st.y + st.height + 1);
  await checkMobile(page, 'magnifier-mobile');

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Contrast' }).click();
  await page.getByRole('radio', { name: /Yellow on black/ }).click();
  await page.getByLabel('Text size').selectOption('2');
  await page.getByLabel('WCAG text-spacing override').check();
  await expect(page.getByTestId('fails')).toContainText('Every check passes');
  await snap(page, 'contrast');
  await checkMobile(page);

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Focus' }).click();
  await page.getByRole('button', { name: 'Background #1b1c20' }).click();
  await page.getByRole('button', { name: 'Two-tone ring' }).click();
  await page.getByTestId('focus-demo').getByRole('button', { name: 'Button' }).focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('focus-demo').getByRole('button', { name: 'Button' })).toBeFocused();
  await snap(page, 'focus');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Two-tone ring' })).toHaveAttribute('aria-pressed', 'true');
  await checkMobile(page, 'focus-mobile');
});
