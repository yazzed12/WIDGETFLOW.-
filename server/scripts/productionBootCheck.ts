import { createApp } from '../app.js';

process.env.NODE_ENV = 'production';
process.env.LEGACY_SQLITE_ENABLED = 'false';

const app = createApp({ initializeDatabase: false });
const server = app.listen(0, '127.0.0.1', async () => {
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Boot check could not determine address.');
  const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);
  if (!response.ok) throw new Error(`Health check failed: ${response.status}`);
  console.log('production boot check passed');
  server.close();
});
