import { beforeAll, describe, expect, it } from 'vitest';
import { EncryptionService } from './encryption.service.js';

describe('EncryptionService', () => {
  let encryption: EncryptionService;

  beforeAll(() => {
    // ENCRYPTION_KEY is provided by test/setup-env.ts before any spec runs.
    encryption = new EncryptionService();
  });

  it('round-trips several plaintexts (decrypt(encrypt(x)) === x)', () => {
    for (const plaintext of ['sk-test-123', 'a', '🔐 unicode + spaces', JSON.stringify({ a: 1 })]) {
      expect(encryption.decrypt(encryption.encrypt(plaintext))).toBe(plaintext);
    }
  });

  it('produces ciphertext that differs from the plaintext and changes every call (random IV)', () => {
    const plaintext = 'sk-provider-secret';
    const first = encryption.encrypt(plaintext);
    const second = encryption.encrypt(plaintext);
    expect(first).not.toContain(plaintext);
    expect(first).not.toBe(second); // fresh IV per call
    expect(encryption.decrypt(first)).toBe(plaintext);
    expect(encryption.decrypt(second)).toBe(plaintext);
  });

  it('throws when the ciphertext has been tampered with (GCM auth tag)', () => {
    const payload = encryption.encrypt('sk-provider-secret');
    const [iv, tag, data] = payload.split(':');
    // Flip the last character of the ciphertext segment to simulate tampering.
    const tamperedChar = data!.at(-1) === 'A' ? 'B' : 'A';
    const tampered = `${iv}:${tag}:${data!.slice(0, -1)}${tamperedChar}`;
    expect(() => encryption.decrypt(tampered)).toThrow();
  });

  it('throws on a malformed payload', () => {
    expect(() => encryption.decrypt('not-a-valid-payload')).toThrow('Malformed ciphertext payload');
  });
});
