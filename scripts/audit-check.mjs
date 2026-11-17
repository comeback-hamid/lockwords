// CI security gate: fail on any high or critical npm advisory (same bar as `npm audit --audit-level=high --omit=dev`),
// except the few in .github/audit-allow.json. Each allowed advisory has an end date; after it, the advisory blocks again.
// Usage: npm audit --omit=dev --json | node scripts/audit-check.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BLOCKING = new Set(['high', 'critical']);
const ghsa = (url = '') => url.match(/GHSA-[a-z0-9-]+/i)?.[0] ?? url;

// The root advisories (objects in `via`) that are high or critical and not allowed today.
export function blocking(report, allow, now = new Date()) {
  const allowed = new Set(allow.filter((a) => new Date(`${a.until}T23:59:59Z`) >= now).map((a) => a.id));
  const found = new Map();
  for (const v of Object.values(report.vulnerabilities ?? {})) {
    for (const via of v.via ?? []) {
      if (typeof via !== 'object' || !BLOCKING.has(via.severity)) continue;
      const id = ghsa(via.url);
      if (!allowed.has(id)) found.set(id, { id, pkg: via.name, severity: via.severity, title: via.title });
    }
  }
  return [...found.values()];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = JSON.parse(readFileSync(0, 'utf8') || '{}');
  // No audit answer (network error, npm error) must not look like "all clear".
  if (!report.auditReportVersion) {
    console.error('npm audit gave no report:', JSON.stringify(report).slice(0, 300));
    process.exit(2);
  }
  const allow = JSON.parse(readFileSync(new URL('../.github/audit-allow.json', import.meta.url), 'utf8'));
  for (const a of allow) console.log(`allowed until ${a.until}: ${a.id} (${a.why})`);
  const bad = blocking(report, allow);
  for (const a of bad) console.error(`${a.severity}: ${a.pkg}: ${a.title} (${a.id})`);
  console.log(bad.length ? `${bad.length} blocking advisories` : 'no blocking advisories');
  process.exit(bad.length ? 1 : 0);
}
