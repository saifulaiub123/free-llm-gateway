/**
 * Test environment bootstrap.
 *
 * WHY a setup file (not `beforeAll`): `@nestjs/config`'s `forRoot` runs env validation at module
 * import time, which happens before any `beforeAll`. Setting required vars here — before test files
 * import `AppModule` — lets validation pass. `??=` preserves any real env the runner already set.
 */
process.env.ENCRYPTION_KEY ??= 'a'.repeat(64);
process.env.JWT_ACCESS_SECRET ??= 's'.repeat(32);
process.env.JWT_REFRESH_SECRET ??= 'r'.repeat(32);
process.env.DB_DRIVER ??= 'sqlite';
process.env.DB_URL ??= ':memory:';
