import { Hono } from 'hono';

import { health } from './routes/health.js';
import { spikeWord } from './routes/spike-word.js';

export function createApp() {
  const app = new Hono();
  app.route('/health', health);
  app.route('/spike/word', spikeWord);
  return app;
}
