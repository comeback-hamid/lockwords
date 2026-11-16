import { Hono } from 'hono';

import { health } from './routes/health.js';

export function createApp() {
  const app = new Hono();
  app.route('/health', health);
  return app;
}
