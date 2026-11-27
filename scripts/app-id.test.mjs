import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

// The app's ID lives in apps/mobile/app.json. Every Maestro flow names the app by its iPhone ID;
// scripts/e2e.sh swaps in the Android package for an Android run. The two IDs differ since 2026-11-26.
const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const app = JSON.parse(read('apps/mobile/app.json')).expo;

test('the iPhone app has the ID of the Daily Doses Apple team', () => {
  assert.equal(app.ios.bundleIdentifier, 'com.dailydoses.lockwords');
  assert.equal(app.ios.appleTeamId, '977V8PWS54');
});

test('every Maestro flow and subflow names the app by its iPhone ID', () => {
  for (const folder of ['e2e/flows/', 'e2e/subflows/']) {
    for (const name of readdirSync(new URL(folder, root)).filter((file) => file.endsWith('.yaml'))) {
      const id = read(folder + name).match(/^appId: (.+)$/m)?.[1];
      assert.equal(id, app.ios.bundleIdentifier, folder + name);
    }
  }
});

test('an Android run gets the Android package from app.json, not a typed copy', () => {
  const runner = read('scripts/e2e.sh');
  assert.match(runner, /android\.package/);
  assert.doesNotMatch(runner, /com\.comebackhamid/);
});
