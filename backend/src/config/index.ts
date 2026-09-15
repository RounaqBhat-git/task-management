/**
 * Centralised, validated config derived from environment variables.
 * Throws on startup if any required variable is missing.
 */

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`[config] Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

const config = {
  port: Number(optional('PORT', '4000')),
  nodeEnv: optional('NODE_ENV', 'development'),

  db: {
    url: required('DATABASE_URL'),
    testUrl: optional('TEST_DATABASE_URL', ''),
  },

  jwt: {
    secret: required('JWT_SECRET'),
    expiresIn: optional('JWT_EXPIRES_IN', '8h'),
  },
} as const;

export default config;
