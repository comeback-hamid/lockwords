import { expect, test } from '@playwright/test';

import { box, card, finishOnboarding, press, say, see, shown, tap, text } from './helpers';

// What a browser can do that a phone app cannot (found by probing the built web app, 2026-11-25): reload any page,
// open any address, lose the connection. None of it may end on a blank or a developer page.
test('reloads, odd addresses and a lost connection', async ({ page }) => {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(String(e)));

  await test.step('a reload in the middle of onboarding starts onboarding again', async () => {
    await page.goto('/');
    await see(page, 'welcome to Lockwords', 60_000);
    await tap(page, 'Start', true);
    await see(page, 'What do you want to learn?');
    await tap(page, 'Spanish', true);
    await press(page, 'Continue');
    await see(page, 'What language do you speak?');
    await page.reload();
    await see(page, 'welcome to Lockwords');
  });

  await test.step('an address that does not exist, and the router’s page list, open the app', async () => {
    for (const address of ['/this-page-does-not-exist', '/_sitemap']) {
      await page.goto(address);
      await see(page, 'welcome to Lockwords');
      await expect(page.getByText(/Unmatched Route|Sitemap/)).toHaveCount(0);
    }
  });

  await finishOnboarding(page);

  await test.step('fast keys answer one card each; a reload keeps the round', async () => {
    await see(page, '10 words left');
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
    await see(page, '6 words left');
    await page.keyboard.press('Backspace');
    await see(page, '7 words left');
    await page.reload();
    await see(page, '7 cards due today');
    await tap(page, 'Let’s start');
    await see(page, '7 words left');
  });

  await test.step('a reload on Use it opens Review, not an empty page', async () => {
    await card(page).click();
    await tap(page, 'Use it', true);
    await see(page, 'Write one sentence with');
    await page.reload();
    await see(page, '7 cards due today');
  });

  await test.step('the first round is finished with the keys; the one-time screens', async () => {
    await tap(page, 'Let’s start');
    await see(page, '7 words left');
    for (let left = 6; left >= 0; left--) {
      await page.keyboard.press('ArrowRight');
      if (left > 0) await see(page, `${left} ${left === 1 ? 'word' : 'words'} left`);
    }
    await see(page, 'Hard words go to your lock screen');
    await tap(page, 'Continue', true);
    await see(page, 'remind you before your trial ends');
    await tap(page, 'Continue', true);
    await see(page, 'Keep your words growing');
    await shown(page.getByRole('button', { name: 'Close' })).click();
  });

  await test.step('the chat box grows with its text up to six lines and gets short again', async () => {
    await expect(box(page)).toBeVisible({ timeout: 40_000 });
    const one = (await box(page).boundingBox())!.height;
    await box(page).click();
    for (let i = 0; i < 9; i++) {
      await page.keyboard.type(`line ${i}`);
      await page.keyboard.press('Shift+Enter');
    }
    const many = (await box(page).boundingBox())!.height;
    expect(many).toBeGreaterThanOrEqual(6 * 22);
    expect(many).toBeLessThanOrEqual(6 * 22 + 30);
    await box(page).fill('one line');
    await expect(async () => expect((await box(page).boundingBox())!.height).toBeLessThanOrEqual(one + 1)).toPass();
    await box(page).fill('');
  });

  await test.step('the card keys do nothing while another tab is open over the round', async () => {
    await say(page, 'How do I say umbrella?');
    await see(page, 'Add to Random Words 1', 40_000);
    await tap(page, 'Add to Random Words 1');
    await see(page, 'Added');
    await shown(page.getByRole('tab', { name: 'Review' })).click();
    await see(page, '1 card due today');
    await tap(page, 'Let’s start');
    await see(page, '1 word left');
    await shown(page.getByRole('tab', { name: 'Progress' })).click();
    await see(page, 'words in your word bank');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    await page.waitForTimeout(1500);
    await shown(page.getByRole('tab', { name: 'Review' })).click();
    await see(page, '1 word left');
    await see(page, 'TAP TO FLIP');
  });

  await test.step('no connection: each tab says so, and Try again works when it is back', async () => {
    await page.route('**/v1/**', (route) => route.abort());
    await shown(page.getByRole('tab', { name: 'Progress' })).click();
    await see(page, 'Could not load your progress');
    // Opened fresh on Review, so only this tab's screen is in the page.
    await page.goto('/review');
    await see(page, 'Could not load your cards');
    await page.unroute('**/v1/**');
    await text(page, 'Try again', true).click();
    await see(page, '1 card due today');
  });

  await test.step('a deck that does not exist says so', async () => {
    await page.goto('/deck/not-a-real-id');
    await see(page, 'Could not load the deck');
  });

  // The server's 404 for the made-up deck is expected; a script error is not.
  expect(problems, 'no script error on the page').toEqual([]);
});
