import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blocking, SKIPPED_PACKAGES } from './audit.mjs';

const advisory = (name, severity, url = `https://github.com/advisories/${name}`) => ({ name, severity, url, title: `${name} problem` });

// The shape of `npm audit --json`: a package's `via` holds advisories (objects) or the names of packages it gets them from.
const report = (vulnerabilities) => ({ vulnerabilities });

test('picomatch is the only skipped package', () => {
  assert.deepEqual(SKIPPED_PACKAGES, ['picomatch']);
});

test('a high picomatch advisory does not block, nor do the packages that only depend on it', () => {
  const found = blocking(
    report({
      picomatch: { name: 'picomatch', severity: 'high', via: [advisory('picomatch', 'high')] },
      tinyglobby: { name: 'tinyglobby', severity: 'high', via: ['picomatch'] },
      'react-native': { name: 'react-native', severity: 'high', via: ['tinyglobby'] },
    }),
  );
  assert.deepEqual(found, []);
});

test('a high or critical advisory in any other package blocks', () => {
  const found = blocking(
    report({
      picomatch: { name: 'picomatch', severity: 'high', via: [advisory('picomatch', 'high')] },
      hono: { name: 'hono', severity: 'high', via: [advisory('hono', 'high')] },
      pg: { name: 'pg', severity: 'critical', via: [advisory('pg', 'critical')] },
    }),
  );
  assert.deepEqual(found.map((a) => a.name), ['hono', 'pg']);
});

test('moderate and low advisories do not block', () => {
  const found = blocking(
    report({
      glob: { name: 'glob', severity: 'moderate', via: [advisory('glob', 'moderate')] },
      minimatch: { name: 'minimatch', severity: 'low', via: [advisory('minimatch', 'low')] },
    }),
  );
  assert.deepEqual(found, []);
});

test('the same advisory reached through two packages is listed once', () => {
  const same = advisory('hono', 'high');
  const found = blocking(report({ hono: { name: 'hono', via: [same] }, other: { name: 'other', via: [same] } }));
  assert.equal(found.length, 1);
});

test('an empty or clean report does not block', () => {
  assert.deepEqual(blocking(report({})), []);
  assert.deepEqual(blocking({}), []);
});
