import { Sequelize } from 'sequelize';
import config from '../config';

/**
 * Single shared Sequelize instance.
 * Uses TEST_DATABASE_URL during Jest runs, DATABASE_URL otherwise.
 */
const dbUrl =
  process.env.NODE_ENV === 'test' && config.db.testUrl
    ? config.db.testUrl
    : config.db.url;

const sequelize = new Sequelize(dbUrl, {
  dialect: 'postgres',
  logging: config.nodeEnv === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30_000,
    idle: 10_000,
  },
});

/**
 * Sync all models to the database.
 * - In test env we force-drop and recreate tables for a clean slate.
 * - In dev/prod we use `alter: false` — migrations handle schema changes.
 */
export async function syncDb(options?: { force?: boolean }): Promise<void> {
  const force = options?.force ?? process.env.NODE_ENV === 'test';
  await sequelize.sync({ force });
}

export default sequelize;
