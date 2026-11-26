import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The Android app has the same ID as the iPhone app (Hamid, 2026-11-26). An Android package can never be changed
// after the first upload to the Play Store, so this is checked.
const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const app = JSON.parse(read('apps/mobile/app.json')).expo;

test('the Android package is the iPhone app ID', () => {
  assert.equal(app.android.package, 'ai.dailydoses.lockwords');
  assert.equal(app.android.package, app.ios.bundleIdentifier);
});

test('the widget module lives under the same ID, and the old one is gone from it', () => {
  const module = 'apps/mobile/modules/lockwords-widget/';
  assert.match(read(module + 'expo-module.config.json'), /ai\.dailydoses\.lockwords\.widget\.LockwordsWidgetModule/);
  assert.match(read(module + 'android/build.gradle'), /namespace "ai\.dailydoses\.lockwords\.widget"/);
  for (const file of ['WidgetPlan.kt', 'LockwordsWidgetModule.kt', 'HardWordsWidget.kt']) {
    const source = read(`${module}android/src/main/java/ai/dailydoses/lockwords/widget/${file}`);
    assert.match(source, /^package ai\.dailydoses\.lockwords\.widget$/m);
    assert.doesNotMatch(source, /comebackhamid/);
  }
});
