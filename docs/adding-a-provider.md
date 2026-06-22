# Adding a provider adapter

Adding a provider is **open/closed**: you add an adapter subclass, register it, and seed one catalog
row. The router, gateway, and other adapters never change. This is the same procedure encoded in the
`llm-gateway` agent skill.

## Steps

1. **Create the adapter** at
   `packages/provider-adapters/src/providers/<provider>.adapter.ts`.
   - Extend `OpenAiCompatibleAdapter` if the provider speaks the OpenAI wire format.
   - Otherwise extend `BaseLlmProviderAdapter` directly (e.g. Gemini, HuggingFace).
2. **Override only what differs** — usually `fetchModels(key)` and `classifyFreeModels(models)`.
   Free-detection is provider-specific (OpenRouter = price `0`; HuggingFace = a curated list; etc.).
   `chatCompletion` / `streamChatCompletion` are inherited from the compatible base when possible.
3. **Register it** in `AdapterRegistry`
   (`packages/provider-adapters/src/registry/adapter-registry.ts`), keyed by the provider `key`.
4. **Seed the catalog** — add one provider row to `PROVIDER_SEED` in
   `apps/server/src/modules/providers/provider-catalog.seeder.ts` (provider metadata only — never
   seed models; those are fetched on demand per key).
5. **Test it** (Vitest, mocked HTTP): `validateKey`, the `fetchModels` shape, and
   `classifyFreeModels` correctness. Do **not** modify the router, gateway, or other adapters.

## Contract

```ts
abstract class BaseLlmProviderAdapter {
  abstract validateKey(apiKey: string): Promise<boolean>;
  abstract fetchModels(apiKey: string): Promise<DiscoveredModel[]>;
  abstract classifyFreeModels(models: DiscoveredModel[]): DiscoveredModel[];
  abstract chatCompletion(request: ChatRequest, apiKey: string): Promise<ChatResponse>;
  abstract streamChatCompletion(request: ChatRequest, apiKey: string): AsyncIterable<ChatChunk>;
}
```

The package is framework-agnostic (no NestJS imports), so adapters stay portable and unit-testable.

## Why this shape

Because providers differ only in discovery and free-detection, isolating those two methods behind a
shared OpenAI-compatible base keeps each new provider to a few dozen lines and guarantees the routing
core remains untouched. See [`architecture.md`](./architecture.md) and the `llm-gateway` skill for
the broader procedures.
