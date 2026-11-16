import { readFileSync } from 'node:fs';

import { expect, test } from 'vitest';

import { createApp } from '../../src/app.js';

test('GET /openapi.json lists /v1/me with its answers', async () => {
  const res = await createApp().request('/openapi.json');
  expect(res.status).toBe(200);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- a loose walk through a JSON document
  const doc = (await res.json()) as any;
  expect(doc.openapi).toMatch(/^3\.1/);
  const get = doc.paths['/v1/me'].get;
  expect(Object.keys(get.responses)).toEqual(expect.arrayContaining(['200', '401']));
  const schema = get.responses['200'].content['application/json'].schema;
  const props = schema.properties ?? doc.components.schemas[schema.$ref.split('/').pop()].properties;
  expect(Object.keys(props)).toEqual(expect.arrayContaining(['id', 'isGuest', 'createdAt']));
  expect(JSON.stringify(doc.components.securitySchemes)).toContain('bearer');
});

test('the checked-in openapi.json matches the server (run: npm run openapi)', async () => {
  const live = await (await createApp().request('/openapi.json')).json();
  const saved = JSON.parse(readFileSync(new URL('../../openapi.json', import.meta.url), 'utf8'));
  expect(saved).toEqual(live);
});
