import { defineConfig, devices } from '@playwright/test';

// The web app in real browsers. `npm run e2e:web` builds the web app against the local stack, serves the files and
// runs these flows (see e2e/README.md, "Web"). One learner per browser, one flow at a time.
const baseURL = process.env.LOCKWORDS_WEB_URL ?? 'http://localhost:8799';
const phone = { viewport: { width: 390, height: 844 } };

export default defineConfig({
  testDir: '.',
  outputDir: '../videos/web',
  timeout: 240_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL, video: process.env.LOCKWORDS_WEB_VIDEO ? 'on' : 'off', trace: 'retain-on-failure' },
  projects: [
    // The whole app in the three engines, phone-size window.
    { name: 'chromium', testMatch: 'first-run.spec.ts', use: { ...devices['Desktop Chrome'], ...phone, launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] }, permissions: ['microphone'] } },
    { name: 'firefox', testMatch: 'first-run.spec.ts', use: { ...devices['Desktop Firefox'], ...phone, launchOptions: { firefoxUserPrefs: { 'media.navigator.streams.fake': true, 'media.navigator.permission.disabled': true } } } },
    { name: 'webkit', testMatch: 'first-run.spec.ts', use: { ...devices['Desktop Safari'], ...phone } },
    // A wide window: the side bar, the columns, live Kai and the meadow, in the three engines.
    { name: 'wide-chromium', testMatch: 'wide.spec.ts', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'wide-firefox', testMatch: 'wide.spec.ts', use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } } },
    { name: 'wide-webkit', testMatch: 'wide.spec.ts', use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } } },
    // What only a browser can do: reloads, odd addresses, a lost connection. Phone-size and wide, two engines.
    { name: 'edges-chromium', testMatch: 'edges.spec.ts', use: { ...devices['Desktop Chrome'], ...phone } },
    { name: 'edges-webkit', testMatch: 'edges.spec.ts', use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } } },
    // A phone's browser with a touch screen (Chrome on a Pixel): finger swipes and the text box.
    { name: 'touch-chromium', testMatch: 'touch.spec.ts', use: { ...devices['Pixel 7'] } },
  ],
});
