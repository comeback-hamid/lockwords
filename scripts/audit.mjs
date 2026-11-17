#!/usr/bin/env node
// The security check: `npm audit` for the packages we ship, failing on high and critical advisories.
// `npm audit` cannot skip one package, so this script reads its JSON report and does it.
//
// Skipped: picomatch. Hamid decided on 2026-11-17 to skip every picomatch advisory, in every session.
// It reaches us only through React Native and Expo build tools, and GHSA-fc5q-39xc-vjpf covers every version (no fix to move to).
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const SKIPPED_PACKAGES = ['picomatch'];
const BLOCKING = new Set(['high', 'critical']);

/** The advisories that fail the check: high or critical, and not in a skipped package. */
export function blocking(report) {
  const found = new Map();
  for (const pkg of Object.values(report?.vulnerabilities ?? {})) {
    for (const via of pkg.via ?? []) {
      // A string is only a pointer to another package; the advisory itself is listed under that package.
      if (typeof via === 'string') continue;
      if (!BLOCKING.has(via.severity) || SKIPPED_PACKAGES.includes(via.name)) continue;
      found.set(via.url ?? `${via.name}: ${via.title}`, via);
    }
  }
  return [...found.values()];
}

function auditReport() {
  try {
    return execFileSync('npm', ['audit', '--json', '--omit=dev'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    // npm exits 1 when it finds anything; the report is still on stdout.
    if (err.stdout) return err.stdout;
    throw err;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = JSON.parse(auditReport());
  if (report.error) {
    console.error(`npm audit failed: ${report.error.summary ?? JSON.stringify(report.error)}`);
    process.exit(2);
  }
  const found = blocking(report);
  console.log(`Skipped packages: ${SKIPPED_PACKAGES.join(', ')}`);
  if (found.length === 0) {
    console.log('No high or critical advisories.');
    process.exit(0);
  }
  for (const a of found) console.error(`${a.severity.toUpperCase()}  ${a.name}  ${a.title}  ${a.url ?? ''}`);
  console.error(`\n${found.length} high or critical advisories.`);
  process.exit(1);
}
