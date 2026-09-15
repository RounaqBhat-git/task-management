import { config } from 'dotenv';
config();

// Import models here so all associations are registered before the server starts
import './models';
import { syncDb } from './db/sequelize';
import app from './app';
import appConfig from './config';

const PORT = appConfig.port;

async function start(): Promise<void> {
  // In development, sync schema automatically (non-destructive).
  // In production, remove this and rely on migrations instead.
  if (appConfig.nodeEnv !== 'production') {
    await syncDb({ force: false });
  }

  app.listen(PORT, () => {
    console.log(
      `[server] listening on port ${PORT} in ${appConfig.nodeEnv} mode`
    );
  });
}

start().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
