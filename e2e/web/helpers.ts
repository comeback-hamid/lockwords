import { expect, test, type Locator, type Page } from '@playwright/test';

// Shared steps of the web flows.

// A screen under another screen stays in the page, hidden. Everything is looked up among what is shown.
export const shown = (l: Locator) => l.locator('visible=true').last();
export const text = (page: Page, t: string | RegExp, exact = false) => shown(page.getByText(t, { exact }));
export const tap = (page: Page, t: string | RegExp, exact = false) => text(page, t, exact).click();
export const see = (page: Page, t: string | RegExp, timeout = 20_000) => expect(text(page, t)).toBeVisible({ timeout });
export const box = (page: Page) => shown(page.locator('textarea'));
// A button by its name, pressed once it can be (Continue is off until an answer is picked).
export async function press(page: Page, name: string) {
  const button = shown(page.getByRole('button', { name, exact: true }));
  await expect(button).toBeEnabled();
  await button.click();
}
// Types a message and sends it with Enter. While Kai is still answering the box keeps the text, so Enter is tried again.
export async function say(page: Page, message: string) {
  await box(page).fill(message);
  await expect(async () => {
    await page.keyboard.press('Enter');
    await expect(box(page)).toHaveValue('', { timeout: 1000 });
  }).toPass({ timeout: 40_000 });
}
export const card = (page: Page) => shown(page.getByTestId('review-card'));

// A mouse drag of the top card, in small steps like a hand. It stays inside the window.
export async function drag(page: Page, dx: number, dy: number) {
  const b = (await card(page).boundingBox())!;
  const x = b.x + b.width / 2, y = b.y + b.height * 0.3; // on the picture: Firefox must not start its own picture drag
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(x + (dx * i) / 12, y + (dy * i) / 12);
    await page.waitForTimeout(25);
  }
  await page.mouse.up();
}

// A new learner from the Hello screen into the first round: the first deck is made and its first card shows (10 words left).
export async function finishOnboarding(page: Page) {
  await test.step('onboarding: Hello to the estimate', async () => {
    await page.goto('/');
    await see(page, 'welcome to Lockwords', 60_000);
    await tap(page, 'Start', true);
    await see(page, 'What do you want to learn?');
    await tap(page, 'Spanish', true);
    await press(page, 'Continue');
    await see(page, 'What language do you speak?');
    await tap(page, 'English', true);
    await press(page, 'Continue');
    await see(page, 'Learn a word every time you unlock.');
    await tap(page, 'Get started', true);
    await see(page, 'Your Spanish level');
    await tap(page, 'Some basics', true);
    await press(page, 'Continue');
    await see(page, 'BASIC WORDS');
    for (const w of ['la casa', 'la noche', 'comer', 'la familia', 'la mano']) await tap(page, w, true);
    await see(page, '5 SELECTED');
    if (await text(page, 'See all words').isVisible()) await tap(page, 'See all words');
    await press(page, 'Continue');
    await see(page, 'INTERMEDIATE WORDS');
    await tap(page, 'el reloj', true);
    if (await text(page, 'See all words').isVisible()) await tap(page, 'See all words');
    await press(page, 'Continue');
    await see(page, 'About level A1');
  });

  await test.step('goal, interests, and Kai makes the first deck with pictures', async () => {
    await press(page, 'Continue');
    await see(page, 'Why are you learning?');
    await tap(page, 'Travel', true);
    await press(page, 'Continue');
    await see(page, 'What are you into?');
    await tap(page, 'Food', true);
    await tap(page, 'Music', true);
    await press(page, 'Continue');
    await see(page, 'your name');
    await say(page, 'Maya'); // Enter sends
    await see(page, 'Nice to meet you, Maya');
    await page.waitForTimeout(2500);
    await tap(page, 'English', true);
    await see(page, 'Ordering food');
    await tap(page, 'Ordering food', true);
    await see(page, 'Tap Generate', 30_000);
    await tap(page, 'Generate', true);
    await see(page, 'Shall we practice them now', 90_000);
    await tap(page, 'OK, let’s practice!');
    await see(page, '10 cards due today');
    await tap(page, 'Let’s start');
  });
}
