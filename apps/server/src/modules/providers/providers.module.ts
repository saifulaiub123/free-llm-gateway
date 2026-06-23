import { Module } from '@nestjs/common';
import { AdapterRegistry } from '@gateway/provider-adapters';
import { EncryptionService } from '../../common/crypto/encryption.service.js';
import { ProvidersController } from './providers.controller.js';
import { ProvidersService } from './providers.service.js';
import { ProviderRepository } from './provider.repository.js';
import { UserProviderKeyRepository } from './user-provider-key.repository.js';
import { ProviderCatalogSeeder } from './provider-catalog.seeder.js';

/**
 * Provider catalog + per-user key management.
 *
 * Provides the framework-agnostic {@link AdapterRegistry} via a factory (the package has no NestJS
 * dependency) and exports the pieces the health probe reuses.
 */
@Module({
  controllers: [ProvidersController],
  providers: [
    ProvidersService,
    ProviderRepository,
    UserProviderKeyRepository,
    EncryptionService,
    ProviderCatalogSeeder,
    { provide: AdapterRegistry, useFactory: (): AdapterRegistry => new AdapterRegistry() },
  ],
  exports: [AdapterRegistry, EncryptionService, UserProviderKeyRepository, ProviderRepository],
})
export class ProvidersModule {}
