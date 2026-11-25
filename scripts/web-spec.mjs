// Fills the web app's DigitalOcean spec (.do/web.yaml) for the "Deploy web app" workflow.
// Usage: DEPLOY_BRANCH=main [WEB_DOMAIN=app.example.com] node scripts/web-spec.mjs <in> <out>
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DOMAIN = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/i;
const BRANCH = /^[\w./-]+$/;

// `domain` is optional: with none the app answers on its DigitalOcean address only.
export function fillWebSpec(text, { branch, domain = '' }) {
  if (!branch || !BRANCH.test(branch)) throw new Error(`"${branch}" is not a plain branch name`);
  let out = text.replaceAll('${DEPLOY_BRANCH}', branch);
  if (domain) {
    if (!DOMAIN.test(domain)) throw new Error(`"${domain}" is not a domain name (write it like app.example.com, with no https:// and no path)`);
    out = `${out.trimEnd()}\n\ndomains:\n  - domain: ${domain.toLowerCase()}\n    type: PRIMARY\n`;
  }
  return out;
}

// True when this file is the script that was started (not imported by a test). Real paths are compared, so a start
// through a linked folder (macOS: /tmp is a link to /private/tmp) counts too.
export function isMain(started, moduleUrl) {
  if (!started) return false;
  const real = (p) => {
    try {
      return realpathSync(p);
    } catch {
      return p;
    }
  };
  return real(started) === real(fileURLToPath(moduleUrl));
}

if (isMain(process.argv[1], import.meta.url)) {
  const [input, output] = process.argv.slice(2);
  writeFileSync(output, fillWebSpec(readFileSync(input, 'utf8'), { branch: process.env.DEPLOY_BRANCH ?? '', domain: (process.env.WEB_DOMAIN ?? '').trim() }));
  console.log(`wrote ${output}`);
}
