import { expect, test, type Page } from '@playwright/test';

import { card, finishOnboarding, see, shown } from './helpers';

// The web app in a wide window (web-desktop-layout, Figma page "Web"), then made narrower: the side bar and the
// columns, the keys named under the card, and Kai and the meadow moving (web-live-kai).
const width = async (page: Page, l: ReturnType<typeof shown>) => (await l.boundingBox())!.width;
// Two pictures of one part of the page, a moment apart: the same or not.
async function moves(page: Page, l: ReturnType<typeof shown>) {
  const a = await l.screenshot();
  await page.waitForTimeout(900);
  const b = await l.screenshot();
  return !a.equals(b);
}

test('a wide window: one column for onboarding, a side bar and columns for the tabs', async ({ page }) => {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(String(e)));

  await test.step('Hello: Kai moves, and the screen is one centered 480 column with no side bar', async () => {
    await page.goto('/');
    await see(page, 'welcome to Lockwords', 60_000);
    expect(await moves(page, shown(page.getByTestId('kai-live')))).toBe(true);
    const start = shown(page.getByRole('button', { name: 'Start', exact: true }));
    const b = (await start.boundingBox())!;
    expect(b.width).toBeLessThanOrEqual(480);
    expect(Math.abs(b.x + b.width / 2 - 720)).toBeLessThan(2); // in the middle of 1440
    await expect(page.getByRole('tab')).toHaveCount(0);
  });

  await finishOnboarding(page);

  await test.step('the round: a card-shaped card, the keys named under it, the side bar on the left', async () => {
    await see(page, '10 words left');
    expect(await width(page, card(page))).toBeLessThanOrEqual(480);
    await expect(shown(page.getByLabel(/^Keys: Space flips the card/))).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await see(page, '9 words left');
  });

  await test.step('the side bar: three rows on the left, the open one marked, no bar at the bottom', async () => {
    await page.goto('/');
    const tabs = page.getByRole('tab').locator('visible=true');
    await expect(tabs).toHaveCount(3, { timeout: 40_000 });
    for (const name of ['New words', 'Review', 'Progress']) {
      const b = (await shown(page.getByRole('tab', { name })).boundingBox())!;
      expect(b.x + b.width).toBeLessThanOrEqual(248);
      expect(b.y).toBeLessThan(300);
    }
    await expect(shown(page.getByRole('tab', { name: 'New words' }))).toHaveAttribute('aria-selected', 'true');
    // The chat is a 600 column in the middle of the room beside the side bar.
    const box = (await shown(page.locator('textarea')).boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(600);
    expect(Math.abs(box.x + box.width / 2 - (248 + (1440 - 248) / 2))).toBeLessThan(24);
  });

  await test.step('Progress from the side bar: the meadow grows and moves', async () => {
    await shown(page.getByRole('tab', { name: 'Progress' })).click();
    await see(page, 'words in your word bank');
    await expect(shown(page.getByRole('tab', { name: 'Progress' }))).toHaveAttribute('aria-selected', 'true');
    await page.waitForTimeout(2500);
    expect(await moves(page, shown(page.getByTestId('meadow-live')))).toBe(true);
  });

  await test.step('a deck page: a word is pulled left with the mouse and deleted', async () => {
    await shown(page.getByRole('button', { name: /^Ordering food/ })).click();
    await see(page, 'Review this deck');
    const row = shown(page.getByText('el postre', { exact: true }));
    const b = (await row.boundingBox())!;
    await page.mouse.move(b.x + 150, b.y + b.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 8; i++) {
      await page.mouse.move(b.x + 150 - i * 15, b.y + b.height / 2);
      await page.waitForTimeout(20);
    }
    await page.mouse.up();
    await shown(page.getByRole('button', { name: 'Delete el postre' })).click({ timeout: 10_000 });
    await expect(page.getByText('el postre', { exact: true }).locator('visible=true')).toHaveCount(0);
    await page.goBack();
    await see(page, 'words in your word bank');
  });

  await test.step('a narrower window: the side bar goes, the tab bar is at the bottom; phone size fills the window', async () => {
    await page.setViewportSize({ width: 800, height: 900 });
    const tab = shown(page.getByRole('tab', { name: 'Review' }));
    await expect(async () => expect((await tab.boundingBox())!.y).toBeGreaterThan(800)).toPass();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(async () => expect((await tab.boundingBox())!.y).toBeGreaterThan(760)).toPass();
    await see(page, 'words in your word bank');
  });

  await test.step('reduced motion: Kai and the meadow stand still', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await shown(page.getByRole('tab', { name: 'Progress' })).click();
    await see(page, 'words in your word bank');
    await expect(page.getByTestId('meadow-live')).toHaveCount(0);
    await expect(page.getByTestId('kai-live')).toHaveCount(0);
  });

  expect(problems, 'no script error on the page').toEqual([]);
});
