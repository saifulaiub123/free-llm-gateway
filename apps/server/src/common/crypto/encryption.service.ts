import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Envelope-encrypts provider keys at rest with AES-256-GCM (TASK-020 / SEC-001).
 *
 * WHY GCM: it gives confidentiality AND integrity — the authentication tag makes any tampering with
 * the ciphertext detectable on decrypt. The 32-byte master key comes from `ENCRYPTION_KEY` (validated
 * at boot to be 64 hex chars) and is never logged. Stored format: `iv:authTag:ciphertext`, each part
 * base64url (base64url never contains the `:` separator, so the split is unambiguous).
 */
@Injectable()
export class EncryptionService {
  /** 32-byte AES-256 key derived from the hex `ENCRYPTION_KEY`. */
  private readonly key: Buffer;

  constructor() {
    const hexKey = process.env.ENCRYPTION_KEY;
    if (!hexKey) {
      // Should never happen: env validation requires it. Fail loudly rather than encrypt with a bad key.
      throw new Error('ENCRYPTION_KEY is not configured');
    }
    this.key = Buffer.from(hexKey, 'hex');
  }

  /**
   * Encrypts plaintext, returning `iv:authTag:ciphertext` (base64url parts).
   *
   * A fresh random 12-byte IV per call means the same plaintext yields different ciphertext each time.
   */
  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [iv, authTag, ciphertext].map((part) => part.toString('base64url')).join(':');
  }

  /**
   * Decrypts a value produced by {@link encrypt}. Throws if the payload is malformed or has been
   * tampered with (the GCM auth-tag verification fails).
   */
  decrypt(payload: string): string {
    const [ivB64, tagB64, dataB64] = payload.split(':');
    if (!ivB64 || !tagB64 || !dataB64) {
      throw new Error('Malformed ciphertext payload');
    }
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivB64, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }
}
