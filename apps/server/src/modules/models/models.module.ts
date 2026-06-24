import { Module, forwardRef } from '@nestjs/common';
import { ProvidersModule } from '../providers/providers.module.js';
import { ModelsController } from './models.controller.js';
import { ModelsService } from './models.service.js';
import { ModelRepository } from './model.repository.js';
import { UserModelRepository } from './user-model.repository.js';
import { ModelMetadataService } from './model-metadata.service.js';

/**
 * On-demand model catalog: discovery (`fetch-models`), per-user enable/disable, custom models, and the
 * curated baseline overlay. Imports {@link ProvidersModule} to reuse the adapter registry, encryption,
 * and the user-provider-key repository.
 */
@Module({
  imports: [forwardRef(() => ProvidersModule)],
  controllers: [ModelsController],
  providers: [ModelsService, ModelRepository, UserModelRepository, ModelMetadataService],
  exports: [ModelRepository, UserModelRepository, ModelsService],
})
export class ModelsModule {}
