// A tiny static server for the built web app (apps/mobile/dist): every path that is not a file answers index.html,
// as the real host does. Used by `npm run e2e:web`. Usage: node scripts/serve-web.mjs <dir> <port>
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };

// The file a request path means, or the page itself. Never a file outside `root`.
export async function fileFor(root, urlPath) {
  const base = resolve(root);
  const wanted = resolve(join(base, normalize(decodeURIComponent(urlPath.split('?')[0]))));
  if (wanted.startsWith(base + '/')) {
    const info = await stat(wanted).catch(() => null);
    if (info?.isFile()) return wanted;
  }
  return join(base, 'index.html');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [root, port] = process.argv.slice(2);
  createServer(async (req, res) => {
    try {
      const file = await fileFor(root, req.url ?? '/');
      res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
      res.end(await readFile(file));
    } catch {
      res.writeHead(500).end('error');
    }
  }).listen(Number(port), 'localhost', () => console.log(`web app on http://localhost:${port}`));
}
