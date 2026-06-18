import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.schema.js';

/** A minimal valid environment: only the required secrets, everything else defaulted. */
const validBase = {
  ENCRYPTION_KEY: 'a'.repeat(64),
  JWT_ACCESS_SECRET: 's'.repeat(32),
  JWT_REFRESH_SECRET: 'r'.repeat(32),
} satisfies NodeJS.ProcessEnv;

/**
 * Verifies the env schema fails fast on missing/invalid required vars and applies the documented
 * defaults, since the whole server boot depends on this validation gate.
 */
describe('validateEnv', () => {
  it('parses a minimal valid env and applies defaults', () => {
    const env = validateEnv({ ...validBase });
    expect(env.PORT).toBe(3001);
    expect(env.JWT_ACCESS_TTL).toBe('15m');
    expect(env.JWT_REFRESH_TTL).toBe('30d');
    expect(env.MAX_FALLBACK_ATTEMPTS).toBe(20);
    expect(env.HEALTH_PROBE_INTERVAL_MS).toBe(300_000);
  });

  it('throws when ENCRYPTION_KEY is missing', () => {
    const withoutKey: NodeJS.ProcessEnv = {
      JWT_ACCESS_SECRET: validBase.JWT_ACCESS_SECRET,
      JWT_REFRESH_SECRET: validBase.JWT_REFRESH_SECRET,
    };
    expect(() => validateEnv(withoutKey)).toThrow();
  });

  it('throws when ENCRYPTION_KEY is the wrong length', () => {
    expect(() => validateEnv({ ...validBase, ENCRYPTION_KEY: 'abc' })).toThrow(/32 bytes hex/);
  });

  it('throws when ENCRYPTION_KEY is not hexadecimal', () => {
    expect(() => validateEnv({ ...validBase, ENCRYPTION_KEY: 'z'.repeat(64) })).toThrow(
      /hexadecimal/,
    );
  });

  it('throws when a JWT secret is too short', () => {
    expect(() => validateEnv({ ...validBase, JWT_ACCESS_SECRET: 'short' })).toThrow();
  });

  it('coerces numeric strings for PORT', () => {
    const env = validateEnv({ ...validBase, PORT: '8080' });
    expect(env.PORT).toBe(8080);
  });

  it('rejects an unsupported DB_DRIVER but accepts a supported one', () => {
    expect(() => validateEnv({ ...validBase, DB_DRIVER: 'mysql' })).toThrow();
    expect(validateEnv({ ...validBase, DB_DRIVER: 'postgres' }).DB_DRIVER).toBe('postgres');
  });

  it('leaves optional DB_* vars undefined so @gateway/db owns their defaults', () => {
    const env = validateEnv({ ...validBase });
    expect(env.DB_URL).toBeUndefined();
    expect(env.DB_SCHEMA).toBeUndefined();
    expect(env.DB_TABLE_PREFIX).toBeUndefined();
  });
});
