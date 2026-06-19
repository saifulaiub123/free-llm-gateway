/**
 * Parses a short duration string (`'15m'`, `'30d'`, `'12h'`, `'45s'`) into milliseconds.
 *
 * WHY a tiny parser (not the `ms` package): we only need the handful of units used for token TTLs,
 * so a dependency-free helper keeps the surface small, explicit, and easy to test.
 */
const UNIT_MS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;

/** @throws Error when `value` is not `<positive integer><s|m|h|d>`. */
export function parseDuration(value: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid duration "${value}" (expected e.g. "15m", "30d")`);
  }
  const unit = match[2]! as keyof typeof UNIT_MS;
  return Number(match[1]) * UNIT_MS[unit];
}
