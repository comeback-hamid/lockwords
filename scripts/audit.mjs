#!/usr/bin/env node
// `npm audit --omit=dev` that fails on high and critical advisories, except the few skipped below.
// npm audit has no way to skip one advisory, so CI runs this instead. Usage: node scripts/audit.mjs
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Each skip says why and when to remove it. Keep this list short. Hamid approves every entry.
export const SKIPPED = [
  // picomatch ReDoS (2026-11-17): every version is listed, no fixed release yet. Reached only through
  // build and test tools (Metro, Jest), which never match user text. Remove when picomatch ships a fix.
  'GHSA-fc5q-39xc-vjpf',
];

const BLOCKING = new Set(['high', 'critical']);

// The advisories in an `npm audit --json` report that should fail the build.
export function blocking(report, skipped = SKIPPED) {
  const found = new Map();
  for (const v of Object.values(report.vulnerabilities ?? {})) {
    for (const via of v.via ?? []) {
      if (typeof via !== 'object' || !BLOCKING.has(via.severity)) continue; // a name = depends on another package's advisory
      const id = String(via.url ?? '').split('/').pop() || String(via.source);
      if (!skipped.includes(id)) found.set(id, { id, title: via.title, severity: via.severity, url: via.url });
    }
  }
  return [...found.values()];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let out;
  try {
    out = execFileSync('npm', ['audit', '--omit=dev', '--json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    out = e.stdout; // npm audit exits 1 when it finds anything
  }
  const left = blocking(JSON.parse(out));
  for (const a of left) console.log(`${a.severity}: ${a.title} ${a.url}`);
  console.log(left.length ? `${left.length} high or critical advisories.` : `No high or critical advisories (skipped: ${SKIPPED.join(', ')}).`);
  process.exit(left.length ? 1 : 0);
}
