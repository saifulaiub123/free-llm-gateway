import { z } from 'zod';

/**
 * Validates process environment at boot; the server refuses to start if required vars are missing
 * or malformed (fail-fast). Consumed by `@nestjs/config` in TASK-002.
 *
 * WHY the `DB_*` vars are optional here (no re-declared defaults): the database module owns those
 * defaults at the point of use — each provider's `paths.ts` for `DB_URL` and `common/env.ts` for
 * `DB_PROVIDER`/`DB_SCHEMA`/`DB_TABLE_PREFIX`. This schema validates their shape only, so the default
 * values live in exactly one place and can never drift between the validated config and what the
 * database module reads from `process.env`.
 */
export const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5001),

  // 32 bytes expressed as hex == 64 characters. Required: provider-key encryption depends on it.
  ENCRYPTION_KEY: z
    .string()
    .length(64, 'ENCRYPTION_KEY must be 32 bytes hex (64 characters)')
    .regex(/^[0-9a-fA-F]+$/, 'ENCRYPTION_KEY must be hexadecimal'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  // DB_* defaults are owned by the database module (see WHY above); validate shape only.
  DB_PROVIDER: z.enum(['postgres', 'sqlite']).optional(),
  DB_URL: z.string().min(1).optional(),
  DB_SCHEMA: z.string().min(1).optional(),
  DB_TABLE_PREFIX: z.string().optional(),

  MAX_FALLBACK_ATTEMPTS: z.coerce.number().int().positive().default(20),
  HEALTH_PROBE_INTERVAL_MS: z.coerce.number().int().positive().default(300_000),
});

/** Fully-validated, typed environment configuration. */
export type Env = z.infer<typeof envSchema>;

/**
 * Parses and validates the given environment record, throwing on the first failure.
 *
 * WHY a named function (not inline): `@nestjs/config` calls this as its `validate` hook, and tests
 * exercise the same path, so validation behavior is identical between boot and tests.
 */
export function validateEnv(raw: Record<string, unknown>): Env {
  return envSchema.parse(raw);
}
