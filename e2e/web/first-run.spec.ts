import { expect, test } from '@playwright/test';

import { box, card, drag, finishOnboarding, press, say, see, shown, tap } from './helpers';

// The whole web app, as a new learner, in one go (the phone's `first-run`, `word-card` and `new-words-single-words`
// flows in a browser): onboarding, Kai's chat, the first deck, a round with the keyboard and the mouse, Use it,
// the one-time screens, New words, voice, Progress and a deck page.
// It talks to the local stack with the stand-in AI, so every answer is known.

test('a new learner goes through the whole web app', async ({ page, browserName }) => {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(String(e)));
  page.on('dialog', (d) => void d.accept());

  await finishOnboarding(page);

  await test.step('the round: keys, the mouse, Undo', async () => {
    await see(page, '10 words left');
    await see(page, 'la cuenta');
    await see(page, 'TAP TO FLIP');
    await page.keyboard.press('Space');
    await see(page, 'the bill');
    await page.keyboard.press('Enter');
    await see(page, 'TAP TO FLIP');
    await page.keyboard.press('ArrowRight'); // Easy
    await see(page, '9 words left');
    await page.keyboard.press('Backspace'); // Undo
    await see(page, '10 words left');
    await see(page, 'la cuenta');
  });

  await test.step('Use it: Shift+Enter is a new line, Enter sends', async () => {
    await card(page).click();
    await tap(page, 'Use it', true);
    await see(page, 'Write one sentence with');
    await box(page).click();
    await page.keyboard.type('Quiero la cuenta,');
    await page.keyboard.press('Shift+Enter');
    await expect(box(page)).toHaveValue('Quiero la cuenta,\n');
    // The arrows move in the text here; they must not answer the card under this screen.
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.type('por favor.');
    await page.keyboard.press('Enter');
    await see(page, 'Great sentence');
    await tap(page, 'Next card', true);
    await see(page, '9 words left');
    await see(page, 'la propina');
  });

  await test.step('mouse swipes: left is Hard, right is Easy, up is Know it', async () => {
    await drag(page, -150, 0);
    await see(page, '8 words left');
    await drag(page, 150, 0);
    await see(page, '7 words left');
    await drag(page, 0, -200);
    await see(page, '6 words left');
    await expect(shown(page.getByRole('button', { name: 'Undo' }))).toBeVisible();
  });

  await test.step('the buttons finish the round; the one-time screens', async () => {
    for (let left = 5; left >= 0; left--) {
      await shown(page.getByRole('button', { name: 'Easy', exact: true })).click();
      if (left > 0) await see(page, `${left} ${left === 1 ? 'word' : 'words'} left`);
    }
    await see(page, 'Hard words go to your lock screen');
    await see(page, 'the tip');
    await press(page, 'Continue');
    await see(page, 'remind you before your trial ends');
    await press(page, 'Continue');
    await see(page, 'Keep your words growing');
    await shown(page.getByRole('button', { name: 'Close' })).click();
  });

  await test.step('New words: a single word from Kai, kept in Random Words', async () => {
    await expect(shown(page.getByRole('tab', { name: 'New words' }))).toBeVisible({ timeout: 40_000 });
    await expect(box(page)).toBeVisible({ timeout: 40_000 });
    await say(page, 'How do I say umbrella?');
    await see(page, 'Add to Random Words 1', 40_000);
    await tap(page, 'Add to Random Words 1');
    await see(page, 'Added');
    await expect(shown(page.getByLabel('New words to review'))).toBeVisible();
  });

  // Chromium and Firefox have a stand-in microphone (playwright.config.ts). WebKit under Playwright has none that can
  // be relied on, so Safari's voice is checked by hand in a real Safari window.
  if (browserName !== 'webkit') {
    await test.step('voice: record, stop, the words land in the box', async () => {
      await shown(page.getByRole('button', { name: 'Voice message' })).click();
      await expect(shown(page.getByRole('button', { name: 'Stop recording' }))).toBeVisible();
      await page.waitForTimeout(1500);
      await shown(page.getByRole('button', { name: 'Stop recording' })).click();
      await expect(box(page)).not.toHaveValue('', { timeout: 20_000 });
      await box(page).fill('');
    });
  }

  await test.step('Progress, the future, and a deck page', async () => {
    await shown(page.getByRole('tab', { name: 'Progress' })).click();
    await see(page, 'words in your word bank');
    await see(page, /You have/);
    await tap(page, 'In 3 months');
    await see(page, /about/i);
    await tap(page, 'Today', true);
    await shown(page.getByRole('button', { name: /^Ordering food/ })).click();
    await see(page, 'Review this deck');
    await see(page, 'la cuenta');
  });

  await test.step('a reload keeps the learner', async () => {
    await page.goto('/');
    await expect(shown(page.getByRole('tab', { name: 'Review' }))).toBeVisible({ timeout: 40_000 });
    await shown(page.getByRole('tab', { name: 'Review' })).click();
    await see(page, /card due today|cards due today|All cards done/);
  });

  expect(problems, 'no script error on the page').toEqual([]);
});
