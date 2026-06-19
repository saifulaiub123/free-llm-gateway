import { describe, expect, it } from 'vitest';
import { parseDuration } from './parse-duration.js';

describe('parseDuration', () => {
  it('parses seconds, minutes, hours, and days into milliseconds', () => {
    expect(parseDuration('45s')).toBe(45_000);
    expect(parseDuration('15m')).toBe(900_000);
    expect(parseDuration('12h')).toBe(43_200_000);
    expect(parseDuration('30d')).toBe(2_592_000_000);
  });

  it('throws on malformed input', () => {
    expect(() => parseDuration('nope')).toThrow();
    expect(() => parseDuration('10x')).toThrow();
    expect(() => parseDuration('')).toThrow();
  });
});
