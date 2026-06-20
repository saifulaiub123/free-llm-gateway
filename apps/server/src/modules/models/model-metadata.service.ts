import { Injectable } from '@nestjs/common';
import type { DiscoveredModel, ModelCapabilities } from '@gateway/provider-adapters';
import {
  DEFAULT_BASELINE,
  MODEL_BASELINE,
  type ModelBaseline,
} from './baseline-catalog.js';

/** A model row ready to upsert into the catalog: discovery fields + baseline overlay. */
export interface ModelUpsertRow {
  providerId: number;
  modelId: string;
  displayName: string;
  isFree: boolean;
  intelligenceScore: number;
  speedTier: 'slow' | 'medium' | 'fast';
  inputCostPer1m: number;
  outputCostPer1m: number;
  contextWindow: number | null;
  capabilities: ModelCapabilities;
  stabilityBaseline: number;
}

/**
 * Merges curated baseline metadata with adapter-reported fields (TASK-032).
 *
 * WHY: auto-strategies need an intelligence score + speed tier for freshly discovered models; the
 * baseline provides a sensible starting point that runtime stats refine over time.
 */
@Injectable()
export class ModelMetadataService {
  /** Overlays the curated baseline onto each discovered model, producing upsert-ready rows. */
  applyBaseline(providerId: number, models: DiscoveredModel[]): ModelUpsertRow[] {
    return models.map((model) => {
      const baseline = this.lookupBaseline(model.modelId);
      return {
        providerId,
        modelId: model.modelId,
        displayName: model.displayName,
        isFree: model.isFree,
        intelligenceScore: baseline.intelligenceScore,
        speedTier: baseline.speedTier,
        inputCostPer1m: model.inputCostPer1m,
        outputCostPer1m: model.outputCostPer1m,
        contextWindow: model.contextWindow,
        capabilities: model.capabilities,
        stabilityBaseline: 0.9,
      };
    });
  }

  /** Resolves a baseline, tolerating provider prefixes (`vendor/model` → `model`), else the default. */
  private lookupBaseline(modelId: string): ModelBaseline {
    const bare = modelId.includes('/') ? (modelId.split('/').pop() ?? modelId) : modelId;
    const key = bare.toLowerCase();
    return MODEL_BASELINE[modelId] ?? MODEL_BASELINE[key] ?? DEFAULT_BASELINE;
  }
}
