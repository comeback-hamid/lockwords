import assert from 'node:assert/strict';
import { test } from 'node:test';

import { blocking } from './audit-check.mjs';

// A cut-down `npm audit --json` answer: one root advisory per package in `via` objects; dependents only name packages.
const report = (advisories) => ({
  vulnerabilities: Object.fromEntries(
    advisories.map(([name, severity, ghsa]) => [name, { name, severity, via: [{ source: 1, name, title: `${name} issue`, url: `https://github.com/advisories/${ghsa}`, severity }] }]),
  ),
});
const NOW = new Date('2026-11-17');
const allow = [{ id: 'GHSA-fc5q-39xc-vjpf', until: '2026-12-15', why: 'no patched picomatch' }];

test('a high advisory blocks', () => {
  assert.deepEqual(blocking(report([['lodash', 'high', 'GHSA-aaaa-bbbb-cccc']]), [], NOW).map((a) => a.id), ['GHSA-aaaa-bbbb-cccc']);
});

test('moderate and low do not block (same bar as --audit-level=high)', () => {
  assert.deepEqual(blocking(report([['glob', 'moderate', 'GHSA-3g3m-2fjr-6pw4'], ['x', 'low', 'GHSA-xxxx-xxxx-xxxx']]), [], NOW), []);
});

test('an allowed advisory does not block until its end date', () => {
  const r = report([['picomatch', 'high', 'GHSA-fc5q-39xc-vjpf']]);
  assert.deepEqual(blocking(r, allow, NOW), []);
  assert.deepEqual(blocking(r, allow, new Date('2026-12-16')).map((a) => a.id), ['GHSA-fc5q-39xc-vjpf']);
});

test('the allow list covers only its own advisory', () => {
  const r = report([['picomatch', 'high', 'GHSA-fc5q-39xc-vjpf'], ['axios', 'critical', 'GHSA-dddd-eeee-ffff']]);
  assert.deepEqual(blocking(r, allow, NOW).map((a) => a.id), ['GHSA-dddd-eeee-ffff']);
});

test('dependents that only point at a package are not counted twice', () => {
  const r = report([['picomatch', 'high', 'GHSA-fc5q-39xc-vjpf']]);
  r.vulnerabilities['react-native'] = { name: 'react-native', severity: 'high', via: ['picomatch'] };
  assert.deepEqual(blocking(r, allow, NOW), []);
});
