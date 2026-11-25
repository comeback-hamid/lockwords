import { expect, test, type Page } from '@playwright/test';

import { box, card, finishOnboarding, see, shown } from './helpers';

// A phone's browser (Chrome on a Pixel, touch screen): the card follows a finger, a text box does not make the
// browser zoom, and the page can be added to the home screen.
// A finger drag of the top card, sent as real touch events.
async function swipe(page: Page, dx: number, dy: number) {
  const client = await page.context().newCDPSession(page);
  const b = (await card(page).boundingBox())!;
  const x = b.x + b.width / 2, y = b.y + b.height * 0.3;
  const touch = (type: string, px: number, py: number) => client.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: Math.round(px), y: Math.round(py) }] });
  await touch('touchStart', x, y);
  for (let i = 1; i <= 12; i++) {
    await touch('touchMove', x + (dx * i) / 12, y + (dy * i) / 12);
    await page.waitForTimeout(25);
  }
  await touch('touchEnd', 0, 0);
}

test('a phone browser with a touch screen', async ({ page }) => {
  await test.step('the page can be added to the home screen', async () => {
    await page.goto('/');
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.json');
    const manifest = await (await page.request.get('/manifest.json')).json();
    expect(manifest.name).toBe('Lockwords');
    expect((await page.request.get('/icons/icon-192.png')).ok()).toBe(true);
  });

  await finishOnboarding(page);

  await test.step('a finger swipes the card: left is Hard, right is Easy, up is Know it', async () => {
    await see(page, '10 words left');
    await swipe(page, -150, 0);
    await see(page, '9 words left');
    await swipe(page, 150, 0);
    await see(page, '8 words left');
    await swipe(page, 0, -200);
    await see(page, '7 words left');
  });

  await test.step('a small move is not a swipe: the card comes back', async () => {
    await swipe(page, 30, 0);
    await page.waitForTimeout(600);
    await see(page, '7 words left');
  });

  await test.step('a tap flips; the Use it text box is 16 px, so the browser does not zoom', async () => {
    await card(page).tap();
    await shown(page.getByText('Use it', { exact: true })).tap();
    await see(page, 'Write one sentence with');
    expect(await box(page).evaluate((e) => getComputedStyle(e).fontSize)).toBe('16px');
  });
});
