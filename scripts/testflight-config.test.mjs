import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// TestFlight uploads (Hamid, 2026-11-27). The app uses only normal HTTPS, so Apple's encryption question is
// answered in the app itself, and every upload needs a build number higher than the last one.
const root = new URL('../', import.meta.url);
const app = JSON.parse(readFileSync(new URL('apps/mobile/app.json', root), 'utf8')).expo;

test('the app tells Apple it uses no special encryption', () => {
  assert.equal(app.ios.infoPlist?.ITSAppUsesNonExemptEncryption, false);
});

test('the iPhone app has a whole-number build number', () => {
  assert.match(String(app.ios.buildNumber ?? ''), /^\d+$/);
});
