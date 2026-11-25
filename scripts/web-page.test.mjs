import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

// The web app's page and its "add to home screen" files (apps/mobile/public). A phone browser reads these before any
// of the app's code runs, so they are plain files.
const pub = new URL('../apps/mobile/public/', import.meta.url);
const read = (name) => readFileSync(new URL(name, pub), 'utf8');

test('the page keeps what Expo fills in, and says what the app is', () => {
  const html = read('index.html');
  for (const mark of ['%LANG_ISO_CODE%', '%WEB_TITLE%', '<div id="root"></div>', 'id="expo-reset"']) assert.ok(html.includes(mark), mark);
  assert.match(html, /<meta name="description" content="[^"]{40,160}"/);
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1/);
  assert.match(html, /<meta name="theme-color" content="#f6f8fa"/);
  assert.match(html, /<link rel="manifest" href="\/manifest\.json"/);
  assert.match(html, /<link rel="apple-touch-icon" href="\/icons\/apple-touch-icon\.png"/);
});

test('the page does not let a phone browser zoom out of the layout, and never blocks zoom by the person', () => {
  const html = read('index.html');
  assert.doesNotMatch(html, /user-scalable=no|maximum-scale=1/);
});

test('the manifest names the app, opens it at the start, and its icons are real files', () => {
  const m = JSON.parse(read('manifest.json'));
  assert.equal(m.name, 'Lockwords');
  assert.equal(m.start_url, '/');
  assert.equal(m.display, 'standalone');
  assert.equal(m.background_color, '#f6f8fa');
  assert.deepEqual(m.icons.map((i) => i.sizes).sort(), ['192x192', '512x512']);
  for (const icon of m.icons) assert.ok(existsSync(new URL('.' + icon.src, pub)), icon.src);
  assert.ok(existsSync(new URL('icons/apple-touch-icon.png', pub)));
});
