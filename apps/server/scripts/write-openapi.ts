import { writeFileSync } from 'node:fs';

import { createApp } from '../src/app.js';

// Writes apps/server/openapi.json. The mobile app generates its API types from this file.
const doc = await (await createApp().request('/openapi.json')).json();
writeFileSync(new URL('../openapi.json', import.meta.url), JSON.stringify(doc, null, 2) + '\n');
console.log('wrote openapi.json');
