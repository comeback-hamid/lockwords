import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileFor } from './serve-web.mjs';

// The static server of `npm run e2e:web`: a real file is served, anything else is the page (the app's router reads
// the address), and nothing outside the folder can be read.
const root = mkdtempSync(join(tmpdir(), 'lockwords-web-'));
mkdirSync(join(root, 'assets'));
writeFileSync(join(root, 'index.html'), '<title>Lockwords</title>');
writeFileSync(join(root, 'assets', 'a.js'), '1');

test('a file is served as that file', async () => {
  assert.equal(await fileFor(root, '/assets/a.js?v=1'), join(root, 'assets', 'a.js'));
});

test('a deep link, the root and a folder all answer the page', async () => {
  for (const p of ['/', '/review', '/deck/123', '/assets']) assert.equal(await fileFor(root, p), join(root, 'index.html'), p);
});

test('a path that climbs out of the folder answers the page, not the file', async () => {
  assert.equal(await fileFor(root, '/../../etc/hosts'), join(root, 'index.html'));
  assert.equal(await fileFor(root, '/%2e%2e/%2e%2e/etc/hosts'), join(root, 'index.html'));
});
