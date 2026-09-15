import { config } from 'dotenv';
config();
import '../models';
import { syncDb } from '../db/sequelize';

syncDb({ force: true })
  .then(() => {
    console.log('SYNC OK — all tables created');
    process.exit(0);
  })
  .catch((e: Error) => {
    console.error('SYNC FAIL:', e.message);
    process.exit(1);
  });
