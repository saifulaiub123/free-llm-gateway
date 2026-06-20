import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { AdapterRegistry } from '@gateway/provider-adapters';
import { EncryptionService } from '../../common/crypto/encryption.service.js';
import { UserProviderKeyRepository } from '../providers/user-provider-key.repository.js';

/** How often to re-validate stored keys, from config (default 5 minutes). */
const PROBE_INTERVAL_MS = Number(process.env.HEALTH_PROBE_INTERVAL_MS ?? 300_000);

/**
 * Periodically validates each stored key via its adapter and updates its status (TASK-027).
 *
 * WHY proactively probe: the router can then skip dead/invalid keys without first paying a failed
 * upstream call. Decryption happens only in memory immediately before the probe; key material is
 * never logged.
 */
@Injectable()
export class KeyHealthProbeService {
  private readonly logger = new Logger(KeyHealthProbeService.name);

  constructor(
    private readonly keys: UserProviderKeyRepository,
    private readonly registry: AdapterRegistry,
    private readonly encryption: EncryptionService,
  ) {}

  @Interval(PROBE_INTERVAL_MS)
  async probeAll(): Promise<void> {
    const keys = await this.keys.listAllWithProvider();
    for (const key of keys) {
      if (!this.registry.has(key.adapterType)) {
        continue; // provider has no adapter (shouldn't happen for seeded providers)
      }
      const adapter = this.registry.get(key.adapterType);
      const isHealthy = await adapter
        .validateKey(this.encryption.decrypt(key.encryptedKey))
        .catch(() => false);
      await this.keys.updateStatus(key.id, isHealthy ? 'healthy' : 'invalid');
    }
    if (keys.length > 0) {
      this.logger.log(`Probed ${keys.length} provider key(s).`);
    }
  }
}
