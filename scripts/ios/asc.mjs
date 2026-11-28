// Tiny App Store Connect API client. Usage: node asc.mjs GET /v1/apps [jsonBody]
import { createSign, createPrivateKey } from 'node:crypto';
import { readFileSync } from 'node:fs';
const env = Object.fromEntries(readFileSync(process.env.HOME + "/.config/lockwords/secrets.env", 'utf8').split('\n').filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const head = b64({ alg: 'ES256', kid: env.ASC_KEY_ID, typ: 'JWT' });
const body = b64({ iss: env.ASC_ISSUER_ID, iat: now, exp: now + 1100, aud: 'appstoreconnect-v1' });
const sig = createSign('SHA256').update(`${head}.${body}`).sign({ key: createPrivateKey(readFileSync(env.ASC_KEY_PATH.replace('~', process.env.HOME))), dsaEncoding: 'ieee-p1363' }).toString('base64url');
const [method, path, data] = process.argv.slice(2);
const r = await fetch('https://api.appstoreconnect.apple.com' + path, { method, headers: { Authorization: `Bearer ${head}.${body}.${sig}`, 'Content-Type': 'application/json' }, body: data });
const t = await r.text();
console.log(r.status, t);
