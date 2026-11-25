import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fillWebSpec } from './web-spec.mjs';

// The web app's DigitalOcean spec (.do/web.yaml), filled by the "Deploy web app" workflow.
const spec = readFileSync(new URL('../.do/web.yaml', import.meta.url), 'utf8');

test('the branch is filled in and nothing is left to fill', () => {
  const out = fillWebSpec(spec, { branch: 'main' });
  assert.match(out, /branch: main\n/);
  assert.doesNotMatch(out, /\$\{/);
  assert.doesNotMatch(out, /^domains:/m);
});

test('the spec serves one page for every path, from the built files of the app', () => {
  const out = fillWebSpec(spec, { branch: 'main' });
  assert.match(out, /catchall_document: index\.html/);
  assert.match(out, /output_dir: apps\/mobile\/dist/);
  assert.match(out, /build_command: npm run build:web/);
  assert.match(out, /^name: lockwords-web$/m);
});

test('an own address is added as the main domain', () => {
  const out = fillWebSpec(spec, { branch: 'main', domain: 'app.lockwords.com' });
  assert.match(out, /\ndomains:\n {2}- domain: app\.lockwords\.com\n {4}type: PRIMARY\n/);
});

test('an address with a scheme, a path or a space is refused, so a typing mistake cannot reach the spec', () => {
  for (const bad of ['https://app.lockwords.com', 'app.lockwords.com/x', 'app lockwords.com', 'localhost', '-a.com', 'a..com']) {
    assert.throws(() => fillWebSpec(spec, { branch: 'main', domain: bad }), /not a domain name/, bad);
  }
});

test('a branch name that is not plain is refused', () => {
  assert.throws(() => fillWebSpec(spec, { branch: 'main\n  evil: true' }), /branch/);
  assert.throws(() => fillWebSpec(spec, { branch: '' }), /branch/);
});
