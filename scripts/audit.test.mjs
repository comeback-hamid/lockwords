import assert from 'node:assert/strict';
import { test } from 'node:test';

import { blocking } from './audit.mjs';

// npm audit --json: a package with its own advisory has objects in `via`; packages that only depend on it have names.
const report = {
  vulnerabilities: {
    picomatch: { severity: 'high', via: [{ source: 1, severity: 'high', title: 'ReDoS', url: 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf' }] },
    micromatch: { severity: 'high', via: ['picomatch'] },
    glob: { severity: 'moderate', via: [{ source: 2, severity: 'moderate', title: 'glob', url: 'https://github.com/advisories/GHSA-3g3m-2fjr-6pw4' }] },
    hono: { severity: 'critical', via: [{ source: 3, severity: 'critical', title: 'bad', url: 'https://github.com/advisories/GHSA-aaaa-bbbb-cccc' }] },
  },
};

test('a high or critical advisory that is not skipped blocks', () => {
  assert.deepEqual(blocking(report, ['GHSA-fc5q-39xc-vjpf']).map((a) => a.id), ['GHSA-aaaa-bbbb-cccc']);
});

test('a skipped advisory does not block, and neither do packages that only depend on it', () => {
  assert.deepEqual(blocking({ vulnerabilities: { picomatch: report.vulnerabilities.picomatch, micromatch: report.vulnerabilities.micromatch } }, ['GHSA-fc5q-39xc-vjpf']), []);
});

test('moderate advisories never block', () => {
  assert.deepEqual(blocking({ vulnerabilities: { glob: report.vulnerabilities.glob } }, []), []);
});

test('nothing skipped: every high or critical advisory blocks once', () => {
  assert.deepEqual(blocking(report, []).map((a) => a.id).sort(), ['GHSA-aaaa-bbbb-cccc', 'GHSA-fc5q-39xc-vjpf']);
});
