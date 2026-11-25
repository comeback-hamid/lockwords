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
    { name: 'chromium', use: { ...devices['Desktop Chrome'], ...phone, launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] }, permissions: ['microphone'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], ...phone, launchOptions: { firefoxUserPrefs: { 'media.navigator.streams.fake': true, 'media.navigator.permission.disabled': true } } } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], ...phone } },
  ],
});
