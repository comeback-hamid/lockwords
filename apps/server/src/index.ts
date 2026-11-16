import { serve } from '@hono/node-server';

import { createApp } from './app.js';
import { loadEnv } from './env.js';

const env = loadEnv();
serve({ fetch: createApp().fetch, port: env.PORT }, (info) => {
  console.log(`server on http://localhost:${info.port}`);
});
