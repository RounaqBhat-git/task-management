import { config } from 'dotenv';
config({ path: '.env' });

// Force test environment so sequelize.ts picks TEST_DATABASE_URL
process.env.NODE_ENV = 'test';

import '../models';                      // register all associations
import sequelize, { syncDb } from '../db/sequelize';

beforeAll(async () => {
  // Wipe and recreate all tables in the test DB before the suite runs
  await syncDb({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

// No per-test truncation here — each test file seeds its own minimal data
// and the force-sync at beforeAll gives a clean slate per jest run.

export {};
